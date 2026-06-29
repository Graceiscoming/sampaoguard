from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import io
from core.watermark import embed_watermark, extract_watermark
from core.qr_overlay import detect_qr_overlay
from core.liveness_glare import detect_screen_glare
from core.slip_ela import compute_ela
from core.slip_local_ocr import perform_ocr, analyze_slip_with_ollama

app = FastAPI(title="Sampaoguard AI Local Service")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def read_image_from_file(file: UploadFile) -> np.ndarray:
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="ไฟล์รูปภาพไม่ถูกต้องหรือไม่สามารถเปิดได้")
    return img

@app.get("/")
def read_root():
    return {"status": "online", "mode": "Local AI (Offline)"}

@app.post("/detect-qr-overlay")
async def detect_qr_overlay_endpoint(file: UploadFile = File(...)):
    img = await read_image_from_file(file)
    result = detect_qr_overlay(img)
    return result

@app.post("/detect-liveness-glare")
async def detect_liveness_glare_endpoint(file: UploadFile = File(...)):
    img = await read_image_from_file(file)
    result = detect_screen_glare(img)
    return result

@app.post("/scan-slip")
async def scan_slip_endpoint(file: UploadFile = File(...)):
    img = await read_image_from_file(file)
    
    # 1. Run ELA check
    ela_b64, avg_diff, tamper_score = compute_ela(img)
    
    # 2. Run Local OCR
    ocr_texts = perform_ocr(img)
    
    # 3. Analyze logic using local LLM via Ollama
    semantic_analysis = analyze_slip_with_ollama(ocr_texts)
    
    # 4. Check watermark
    watermark_payload = extract_watermark(img)
    watermark_valid = len(watermark_payload) > 0
    
    # Simple rule-based logic to decide if suspicious
    # If tamper score is high (above 15) or LLM flags it or watermark is corrupt
    is_suspicious = semantic_analysis.get("is_suspicious", False) or tamper_score > 20.0
    
    return {
        "success": True,
        "ocr_raw_text": ocr_texts,
        "ela_heatmap": ela_b64,
        "tamper_score": round(tamper_score, 2),
        "semantic_analysis": semantic_analysis,
        "watermark": {
            "valid": watermark_valid,
            "payload": watermark_payload
        },
        "is_suspicious": is_suspicious
    }

@app.post("/embed-watermark")
async def embed_watermark_endpoint(file: UploadFile = File(...), text: str = Form(...)):
    img = await read_image_from_file(file)
    try:
        watermarked_img = embed_watermark(img, text)
        
        # Convert back to PNG/JPEG to send back
        _, encoded_img = cv2.imencode(".png", watermarked_img)
        img_bytes = io.BytesIO(encoded_img.tobytes())
        
        return StreamingResponse(img_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการฝังลายน้ำ: {str(e)}")

@app.post("/verify-watermark")
async def verify_watermark_endpoint(file: UploadFile = File(...)):
    img = await read_image_from_file(file)
    watermark_payload = extract_watermark(img)
    return {
        "valid": len(watermark_payload) > 0,
        "payload": watermark_payload
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
