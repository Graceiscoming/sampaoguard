"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Shield, 
  ArrowLeft, 
  Upload, 
  Camera, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Scan,
  RefreshCw,
  Eye
} from "lucide-react";

export default function MerchantPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  const startCamera = async () => {
    setCameraActive(true);
    setError("");
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("ไม่สามารถเปิดกล้องได้ กรุณาใช้การอัปโหลดไฟล์สลิป");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedFile = new File([blob], "captured_slip.png", { type: "image/png" });
            setFile(capturedFile);
            setPreviewUrl(URL.createObjectURL(blob));
            analyzeSlip(capturedFile);
          }
        }, "image/png");
      }
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setPreviewUrl(URL.createObjectURL(uploadedFile));
      setResult(null);
      analyzeSlip(uploadedFile);
    }
  };

  const analyzeSlip = async (slipFile: File) => {
    setLoading(true);
    setError("");
    
    const formData = new FormData();
    formData.append("file", slipFile);

    try {
      const response = await fetch("http://localhost:8000/scan-slip", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        setError("ไม่สามารถส่งวิเคราะห์ภาพสลิปได้ (ตรวจสอบสถานะ AI Service)");
      }
    } catch (err) {
      setError("ไม่พบการตอบสนองจาก AI Service บนพอร์ต 8000 (กรุณารัน ai-service/main.py)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 text-white min-h-screen pb-12">
      
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push("/dashboard")}
              className="p-1 hover:bg-white/5 active:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm">ระบบความปลอดภัยร้านค้า (Merchant Console)</span>
          </div>
          <span className="bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
            SLIP SCANNER
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6">
        
        {/* Intro */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-200">เครื่องสแกนและตรวจสอบสลิปโอนเงินอัจฉริยะ</h2>
          <p className="text-xs text-slate-400 mt-1">อัปโหลดสลิปที่ลูกค้าโอนเงินเพื่อตรวจจับการบีบอัดพิกเซล (ELA) และเช็คลายน้ำดิจิทัล (LSB) เพื่อป้องกันสลิปปลอมแบบเรียลไทม์ 100%</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left panel: Upload / Stream */}
          <div className="space-y-4">
            <div className="relative aspect-[3/4] w-full bg-slate-900 border border-white/10 rounded-3xl overflow-hidden flex items-center justify-center">
              {cameraActive ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-6 flex justify-center">
                    <button
                      onClick={handleCapture}
                      className="bg-indigo-600 hover:bg-indigo-700 font-bold text-xs px-5 py-2.5 rounded-full shadow-lg cursor-pointer"
                    >
                      กดถ่ายภาพสลิป
                    </button>
                  </div>
                </>
              ) : previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Slip preview" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-500 space-y-3 px-6">
                  <FileText className="w-12 h-12 mx-auto text-slate-600" />
                  <p className="text-xs">ยังไม่มีรูปสลิปที่เลือกสำหรับการตรวจสอบ</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <Upload className="w-4 h-4 text-slate-400" /> เลือกไฟล์สลิป
              </button>
              <button
                onClick={cameraActive ? stopCamera : startCamera}
                className="bg-indigo-600 hover:bg-indigo-700 py-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <Camera className="w-4 h-4" /> {cameraActive ? "ปิดกล้อง" : "เปิดกล้องสแกน"}
              </button>
            </div>
            
            {error && (
              <div className="text-red-400 text-xs py-2 px-3 bg-red-950/20 border border-red-500/20 rounded-xl text-center">
                {error}
              </div>
            )}
          </div>

          {/* Right panel: Analysis Results */}
          <div className="space-y-4">
            
            {loading && (
              <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center h-full min-h-[300px] space-y-4">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                <div className="text-center">
                  <h4 className="text-xs font-bold">กำลังประมวลผลระบบความปลอดภัย...</h4>
                  <p className="text-[10px] text-slate-500 mt-1">วิเคราะห์พิกเซลภาพ (ELA) + ดึงข้อมูลอักษรด้วย EasyOCR</p>
                </div>
              </div>
            )}

            {!loading && !result && (
              <div className="bg-slate-900/30 border border-white/5 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center h-full min-h-[300px] text-slate-500 text-xs">
                <Scan className="w-12 h-12 text-slate-700 mb-2" />
                <span>กรุณาอัปโหลดสลิปเพื่อเข้าสู่ระบบประเมินผลความปลอดภัย</span>
              </div>
            )}

            {!loading && result && (
              <div className="space-y-4">
                
                {/* Visual Status Banner */}
                <div className={`border-2 rounded-2xl p-4 flex gap-3 items-start ${
                  result.is_suspicious 
                    ? "bg-red-950/30 border-red-500/50 text-red-300 animate-pulse" 
                    : "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                }`}>
                  {result.is_suspicious ? (
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
                  ) : (
                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                  )}
                  <div>
                    <h3 className="text-xs font-extrabold tracking-wider">
                      {result.is_suspicious ? "สลิปต้องสงสัย / มีความเสี่ยงดัดแปลงสูง!" : "สลิปสมบูรณ์ / มีความน่าเชื่อถือสูง"}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium leading-relaxed">
                      {result.semantic_analysis.risk_reason || result.risk_reason}
                    </p>
                  </div>
                </div>

                {/* 1. Cryptographic Watermark Check */}
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-400" /> ลายน้ำดิจิทัล (Micro-Watermark Check)
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      result.watermark.valid 
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20" 
                        : "bg-red-950 text-red-400 border border-red-500/20"
                    }`}>
                      {result.watermark.valid ? "VALID" : "INVALID / NOT FOUND"}
                    </span>
                  </div>
                  {result.watermark.valid ? (
                    <p className="text-[10px] text-slate-300 font-mono bg-slate-950 p-2 rounded-lg break-all">
                      {result.watermark.payload}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400">
                      ไม่พบลายน้ำเข้ารหัสของระบบธนาคาร หรือพิกเซลของภาพผิดเพี้ยนไปจากการตัดต่อเซฟรูปใหม่
                    </p>
                  )}
                </div>

                {/* 2. Pixel ELA Heatmap */}
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-indigo-400" /> แผนผังความคลาดเคลื่อนพิกเซล (ELA Heatmap)
                  </h4>
                  <div className="relative aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center">
                    {result.ela_heatmap ? (
                      <img 
                        src={`data:image/jpeg;base64,${result.ela_heatmap}`} 
                        alt="ELA Heatmap" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-600">ไม่มีการแสดงผลแผนผัง ELA</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">ค่าเบี่ยงเบนการแก้ไขตัวเลข (Tamper Score):</span>
                    <span className={`font-mono font-bold ${
                      result.tamper_score > 20 ? "text-red-400" : "text-emerald-400"
                    }`}>{result.tamper_score}</span>
                  </div>
                </div>

                {/* 3. OCR Text Extracted & Semantic Checker */}
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-400" /> ข้อมูลที่อ่านได้จากสลิป (OCR Extract)
                  </h4>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">ยอดเงินโอน:</span>
                      <span className="font-bold text-slate-200">{result.semantic_analysis.extracted_amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ผู้โอน:</span>
                      <span className="font-bold text-slate-200">{result.semantic_analysis.extracted_sender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ผู้รับ:</span>
                      <span className="font-bold text-slate-200">{result.semantic_analysis.extracted_receiver}</span>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-2">
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">ข้อความดิบที่ดึงมา (Raw Texts):</span>
                    <div className="max-h-24 overflow-y-auto bg-slate-950 p-2 rounded-lg text-[9px] text-slate-400 font-mono space-y-0.5">
                      {result.ocr_raw_text && result.ocr_raw_text.length > 0 ? (
                        result.ocr_raw_text.map((t: string, idx: number) => (
                          <div key={idx}>{t}</div>
                        ))
                      ) : (
                        <div>ไม่พบตัวอักษร</div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </main>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
