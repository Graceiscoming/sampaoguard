# คู่มือการติดตั้งและเปิดใช้งาน Sampaoguard หลังดึงโค้ด (Post-Pull/Clone Setup Guide)

เมื่อทำการ Pull หรือ Clone โปรเจกต์นี้มาใหม่ในเครื่องเป็นครั้งแรก กรุณาทำตามขั้นตอนต่อไปนี้เพื่อติดตั้ง dependencies และเปิดใช้งานระบบให้พร้อมใช้งานครับ:

---

## 🛠️ ขั้นตอนการติดตั้ง (First-time Setup)

เพื่อความง่ายและไม่สับสน ให้แบ่งการตั้งค่าออกเป็น 3 ส่วนหลักดังนี้:

### 1. ตั้งค่าระบบ Frontend (Next.js)
เปิด Command Prompt แล้วรันคำสั่ง:
```bash
cd frontend
npm install
cd ..
```

### 2. ตั้งค่าระบบ Backend (Express.js)
รันคำสั่ง:
```bash
cd backend
npm install
cd ..
```

### 3. ตั้งค่าระบบ AI-Service (Python)
สร้างสภาพแวดล้อมจำลอง (Virtual Environment) และติดตั้งไลบรารีวิเคราะห์รูปภาพและข้อความด้วยคำสั่ง:
```bash
cd ai-service
python -m venv venv
venv\Scripts\pip install -r requirements.txt
cd ..
```

---

## ⚡ วิธีการเปิดใช้งานระบบ (How to Run)

เมื่อติดตั้ง dependencies ครบถ้วนแล้ว คุณสามารถเลือกวิธีเปิดใช้งานได้ 2 วิธีดังนี้:

### วิธีที่ 1: ดับเบิ้ลคลิกเพื่อรันทั้งหมด (แนะนำ 🚀)
- ไปที่โฟลเดอร์หลักของโปรเจกต์
- ดับเบิ้ลคลิกไฟล์ **`run.bat`**
- ระบบจะเปิดหน้าต่าง Command Prompt ขึ้นมา 3 ตัวเพื่อรัน Frontend, Backend, และ AI-Service ให้โดยอัตโนมัติ

### วิธีที่ 2: รันทีละบริการด้วยตัวเอง (Manual Start)
หากต้องการรันแยกเพื่อตรวจสอบ Logs ในแต่ละบริการ ให้เปิด Terminal แยก 3 ตัวและรันคำสั่งเหล่านี้:

- **Terminal 1 (Backend):**
  ```bash
  cd backend
  npm run dev
  ```
- **Terminal 2 (AI-Service):**
  ```bash
  cd ai-service
  venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8000
  ```
- **Terminal 3 (Frontend):**
  ```bash
  cd frontend
  npm run dev
  ```

---

## 🌐 ลิงก์เข้าใช้งานบนเบราว์เซอร์
เมื่อบริการทำงานครบถ้วนแล้ว สามารถเข้าเล่นหน้าจำลองได้ทันที:
- **หน้าหลักของลูกค้า (โอนเงิน/ความปลอดภัย):** [http://localhost:3000](http://localhost:3000)
- **หน้าร้านแม่ค้ารับสแกนสลิป (Merchant):** [http://localhost:3000/merchant](http://localhost:3000/merchant)
- **หน้าจอมอนิเตอร์ของตำรวจ (Police):** [http://localhost:3000/police](http://localhost:3000/police)

---

## 💡 ระบบวิเคราะห์สลิปขั้นสูงด้วย Local LLM (ทางเลือกเสริม)
ระบบมีฟีเจอร์ตรวจเช็คคำต้องสงสัยเชิงบริบทบนสลิปปลอม หากคุณต้องการเปิดใช้งานร่วมด้วย:
1. ดาวน์โหลดโปรแกรม [Ollama](https://ollama.com) มาติดตั้งในเครื่อง
2. รันดาวน์โหลดโมเดลภาษาโดยเปิด Command Prompt แล้วพิมพ์คำสั่ง:
   ```bash
   ollama run qwen2:1.5b
   ```
3. เมื่อเปิดใช้งาน Ollama ทิ้งไว้ AI-Service จะเรียกใช้งานโมเดลภาษาในการเปรียบเทียบข้อมูลบนสลิปให้เองโดยอัตโนมัติ
