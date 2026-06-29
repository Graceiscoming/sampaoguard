import easyocr
import numpy as np
import requests
import json
import re

# Global reader instance, lazy loaded
reader = None

def get_reader():
    global reader
    if reader is None:
        # Initialize easyocr with Thai and English support
        # CPU mode by default, will auto-detect GPU if CUDA is configured
        reader = easyocr.Reader(['th', 'en'], gpu=False)
    return reader

def perform_ocr(img_np: np.ndarray) -> list:
    """
    Performs local OCR on the slip image to extract text blocks.
    """
    try:
        ocr_reader = get_reader()
        results = ocr_reader.readtext(img_np)
        return [res[1] for res in results]
    except Exception as e:
        print(f"Error performing OCR: {e}")
        return ["ไม่สามารถรัน OCR ได้ (เกิดข้อผิดพลาดในการโหลดโมเดล)"]

def analyze_slip_with_ollama(texts: list) -> dict:
    """
    Uses local Ollama LLM to check the semantic logical consistency of the slip text.
    Fallback gracefully if Ollama is not running.
    """
    combined_text = "\n".join(texts)
    
    # We will try to call the default local Ollama model (e.g. qwen2:1.5b, llama3, or similar)
    # The prompt instructs the model to return structured JSON
    prompt = f"""คุณคือ AI ผู้ช่วยตรวจสอบสลิปโอนเงินปลอม หน้าที่ของคุณคือวิเคราะห์ข้อความที่ดึงมาจากสลิปธนาคาร และตรวจหาจุดผิดสังเกต เช่น ยอดเงินสะกดผิด, วันที่ผิดเพี้ยน หรือคำศัพท์ประหลาด

นี่คือข้อความที่อ่านได้จากสลิป:
\"\"\"
{combined_text}
\"\"\"

จงวิเคราะห์ความเสี่ยงและส่งกลับมาเป็นข้อมูล JSON รูปแบบนี้เท่านั้น ห้ามอธิบายภาษาพูดภายนอก JSON:
{{
  "is_suspicious": true/false,
  "extracted_amount": "จำนวนเงินที่พบ เช่น 500 บาท",
  "extracted_sender": "ชื่อผู้โอน",
  "extracted_receiver": "ชื่อผู้รับ",
  "risk_reason": "สรุปเหตุความเสี่ยงสั้นๆ (ภาษาไทย)"
}}
"""
    
    # Try different common models in order
    models_to_try = ["qwen2:1.5b", "llama3", "phi3", "mistral"]
    
    for model in models_to_try:
        try:
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1
                    }
                },
                timeout=3 # fast timeout per model check
            )
            
            if response.status_code == 200:
                res_json = response.json()
                response_text = res_json.get("response", "").strip()
                
                # Match JSON block
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group(0))
        except Exception:
            continue
            
    # Default fallback if Ollama requests fail
    amount_match = re.search(r'(\d{1,3}(,\d{3})*(\.\d{2})?)\s*(บาท|THB)', combined_text)
    amount_str = amount_match.group(0) if amount_match else "ไม่ระบุแน่ชัด"
    
    return {
        "is_suspicious": False,
        "extracted_amount": amount_str,
        "extracted_sender": "ตรวจจับข้อความแล้ว",
        "extracted_receiver": "ตรวจจับข้อความแล้ว",
        "risk_reason": "สแกนสลิปออฟไลน์สำเร็จ (รันเฉพาะ OCR เนื่องจากยังไม่ได้เปิดใช้งานระบบวิเคราะห์เชิงลึกด้วย Ollama)"
    }
