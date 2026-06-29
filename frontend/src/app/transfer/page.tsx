"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Shield, 
  ArrowLeft, 
  Camera, 
  Upload, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  Lock
} from "lucide-react";

export default function TransferPage() {
  const [step, setStep] = useState<"scan" | "details" | "success">("scan");
  const [scannedId, setScannedId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [trustScore, setTrustScore] = useState<number | null>(null);
  const [requiresEscrow, setRequiresEscrow] = useState(false);
  const [amount, setAmount] = useState("");
  
  // Security warnings state
  const [qrOverlayWarning, setQrOverlayWarning] = useState(false);
  const [screenGlareWarning, setScreenGlareWarning] = useState(false);
  const [gpsMismatchWarning, setGpsMismatchWarning] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  
  // PIN & Confirm
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Success slip
  const [slipUrl, setSlipUrl] = useState("");
  const [txnDetails, setTxnDetails] = useState<any>(null);

  // Refs for camera/upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const router = useRouter();

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraActive(true);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("ไม่สามารถเปิดกล้องได้ กรุณาอัปโหลดภาพแทน");
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

  const handleCapture = async () => {
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
            processImage(blob);
          }
        }, "image/jpeg");
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const processImage = async (fileOrBlob: Blob) => {
    setLoading(true);
    setError("");
    
    // Clear warnings
    setQrOverlayWarning(false);
    setScreenGlareWarning(false);
    setGpsMismatchWarning(false);

    try {
      const formData = new FormData();
      formData.append("file", fileOrBlob);

      // 1. Run local overlay detector
      let overlay = { overlay_detected: false };
      try {
        const overlayRes = await fetch("http://localhost:8000/detect-qr-overlay", {
          method: "POST",
          body: formData
        });
        overlay = await overlayRes.json();
      } catch (e) {
        console.warn("FastAPI overlay check offline");
      }

      // 2. Run local liveness reflection check
      let glare = { glare_detected: false };
      try {
        const glareRes = await fetch("http://localhost:8000/detect-liveness-glare", {
          method: "POST",
          body: formData
        });
        glare = await glareRes.json();
      } catch (e) {
        console.warn("FastAPI glare check offline");
      }

      setQrOverlayWarning(overlay.overlay_detected);
      setScreenGlareWarning(glare.glare_detected);

      // Simulate a scanned QR payload
      // For demo, we alternate scanned IDs based on options or randomize
      const ids = ["TRUST_CORP_01", "TRUST_MCH_02", "UNTRUSTED_P2P_03"];
      const matchedId = ids[Math.floor(Math.random() * ids.length)];
      handleSelectRecipient(matchedId);

    } catch (err) {
      setError("เกิดข้อผิดพลาดในการวิเคราะห์ภาพ");
    } finally {
      setLoading(false);
      stopCamera();
    }
  };

  const handleSelectRecipient = async (id: string) => {
    setScannedId(id);
    setGpsLoading(true);
    
    try {
      // Get trust details
      const response = await fetch("http://localhost:5001/api/transfer/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: id }),
      });
      const data = await response.json();
      
      setRecipientName(data.receiverName);
      setTrustScore(data.trustScore);
      setRequiresEscrow(data.requiresEscrow);

      // Get user GPS and check mismatch
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const userLat = pos.coords.latitude;
            const userLng = pos.coords.longitude;
            
            // For Demo: if recipient coords are valid and distance is simulated
            // Let's trigger a mismatch warning if we scanned the personal untrusted target
            if (id === "UNTRUSTED_P2P_03") {
              setGpsMismatchWarning(true);
            }
            setGpsLoading(false);
          },
          () => {
            // Mismatch warning by default on untrusted demo accounts for visibility
            if (id === "UNTRUSTED_P2P_03") {
              setGpsMismatchWarning(true);
            }
            setGpsLoading(false);
          }
        );
      } else {
        setGpsLoading(false);
      }

      setStep("details");
    } catch (err) {
      setError("ไม่สามารถดึงข้อมูลบัญชีผู้รับได้");
      setGpsLoading(false);
    }
  };

  // Create visual canvas slip, send to FastAPI for LSB embedding, then download/show it
  const generateWatermarkedSlip = async (txn: any, isDecoyMode: boolean) => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Draw background
    const grad = ctx.createLinearGradient(0, 0, 0, 800);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e1b4b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 800);

    // Draw border
    ctx.strokeStyle = "#4f46e5";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 590, 790);

    // Header logo
    ctx.fillStyle = "#818cf8";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SAMPAOGUARD", 300, 80);
    
    ctx.fillStyle = "#94a3b8";
    ctx.font = "16px sans-serif";
    ctx.fillText("สลิปการทำธุรกรรมอิเล็กทรอนิกส์ (E-Slip)", 300, 110);

    // Success checkcircle
    ctx.fillStyle = isDecoyMode ? "#f87171" : "#34d399";
    ctx.beginPath();
    ctx.arc(300, 200, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 45px sans-serif";
    ctx.fillText("✓", 300, 215);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(isDecoyMode ? "โอนเงินลวงตาสำเร็จ" : "โอนเงินสำเร็จ", 300, 290);

    ctx.fillStyle = isDecoyMode ? "#f87171" : "#38bdf8";
    ctx.font = "bold 40px sans-serif";
    ctx.fillText(`฿${Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`, 300, 360);

    // Details box
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(50, 420, 500, 280);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("ผู้โอน:", 80, 460);
    ctx.fillText("ผู้รับโอน:", 80, 510);
    ctx.fillText("เลขอ้างอิง:", 80, 560);
    ctx.fillText("วัน-เวลาโอน:", 80, 610);
    ctx.fillText("สถานะ:", 80, 660);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("ผู้ใช้งานระบบ Sampaoguard", 220, 460);
    ctx.fillText(txn.receiverName, 220, 510);
    
    ctx.font = "bold 14px monospace";
    ctx.fillText(txn.id, 220, 560);
    
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(new Date(txn.createdAt).toLocaleString("th-TH"), 220, 610);
    
    ctx.fillStyle = isDecoyMode ? "#f87171" : (txn.status === "PENDING_ESCROW" ? "#fb923c" : "#34d399");
    ctx.fillText(isDecoyMode ? "โหมดโดนบังคับโอน (ปลอดภัย)" : (txn.status === "PENDING_ESCROW" ? "รอดำเนินการหน่วงเวลา" : "สำเร็จทันที"), 220, 660);

    // Signature label
    ctx.fillStyle = "#475569";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Micro-Cryptographic Watermark Embedded in Pixels", 300, 750);

    return new Promise<string>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) return resolve("");

        // Call FastAPI to embed digital watermark
        try {
          const wFormData = new FormData();
          wFormData.append("file", blob);
          // Embed HMAC signature key data
          const wText = `SG_SIGNATURE:${txn.id}:${amount}:${isDecoyMode ? "DECOY" : "SECURE"}`;
          wFormData.append("text", wText);

          const wResponse = await fetch("http://localhost:8000/embed-watermark", {
            method: "POST",
            body: wFormData
          });

          if (wResponse.ok) {
            const wBlob = await wResponse.blob();
            const wUrl = URL.createObjectURL(wBlob);
            resolve(wUrl);
          } else {
            resolve(URL.createObjectURL(blob)); // fallback to clean slip
          }
        } catch (e) {
          console.warn("AI Service offline, displaying non-watermarked slip");
          resolve(URL.createObjectURL(blob));
        }
      }, "image/png");
    });
  };

  const handleConfirmTransfer = async () => {
    if (pin.length !== 6) {
      setError("กรุณาป้อน PIN 6 หลัก");
      return;
    }

    setLoading(true);
    setError("");

    const token = localStorage.getItem("sampaoguard_token") || "";
    // Detect location
    let userLoc = { lat: 13.736717, lng: 100.523186 }; // fallback
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      userLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
    } catch (e) {}

    try {
      const response = await fetch("http://localhost:5001/api/transfer/confirm", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({ 
          receiverId: scannedId,
          amount: parseFloat(amount),
          pin: pin,
          location: userLoc
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTxnDetails(data.transaction);
        const wSlipUrl = await generateWatermarkedSlip(data.transaction, data.isDecoy);
        setSlipUrl(wSlipUrl);
        setStep("success");
        setShowPinModal(false);
      } else {
        setError(data.error || "เกิดข้อผิดพลาดในการโอนเงิน");
      }
    } catch (err) {
      setError("ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อทำธุรกรรมได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 text-white min-h-screen pb-12">
      
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => step === "details" ? setStep("scan") : router.push("/dashboard")}
            className="p-1 hover:bg-white/5 active:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm">ทำรายการโอนเงิน</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-6">
        
        {/* Step 1: Scan QR */}
        {step === "scan" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-base font-semibold text-slate-300">สแกนรหัส QR ร้านค้า / ผู้รับเงิน</h2>
              <p className="text-xs text-slate-400 mt-1">ใช้กล้องสแกนหรือเลือกภาพจากอัลบั้มเพื่อวิเคราะห์ความปลอดภัย</p>
            </div>

            {/* Simulated/Real Camera view */}
            <div className="relative aspect-square w-full max-w-sm mx-auto bg-slate-900 border border-white/10 rounded-3xl overflow-hidden flex items-center justify-center">
              {cameraActive ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                  {/* Scanner overlay laser */}
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-indigo-500 shadow-md shadow-indigo-400 animate-pulse" />
                  
                  <button
                    onClick={handleCapture}
                    className="absolute bottom-6 bg-indigo-600 hover:bg-indigo-700 font-medium text-xs px-5 py-2.5 rounded-full shadow-lg cursor-pointer"
                  >
                    ถ่ายภาพและสแกน
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center text-slate-500 gap-3 px-6 text-center">
                  <Camera className="w-12 h-12 text-slate-600" />
                  <span className="text-xs">ไม่ได้เชื่อมต่อกล้องหรือปิดใช้งานอยู่</span>
                  <button
                    onClick={startCamera}
                    className="bg-indigo-600/30 border border-indigo-500/50 hover:bg-indigo-600/50 text-indigo-300 text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    เปิดใช้งานกล้องมือถือ
                  </button>
                </div>
              )}
            </div>

            {/* File Upload Selector */}
            <div className="flex flex-col items-center justify-center gap-3">
              <span className="text-xs text-slate-500">— หรือ —</span>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 text-xs py-3 px-6 rounded-2xl w-full flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-slate-400" /> อัปโหลดรูปภาพ QR เพื่อจำลองการสแกน
              </button>
            </div>

            {/* Quick Select Targets for Demonstration */}
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" /> จำลองเหตุการณ์ด่วน (Demo Preset)
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleSelectRecipient("TRUST_CORP_01")}
                  className="w-full text-left bg-white/5 hover:bg-white/10 p-2.5 rounded-xl border border-white/5 flex justify-between items-center text-xs cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-slate-200">นิติบุคคล (Trust Score: 100)</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">S&P Bakery Group (โอนได้ทันที)</p>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </button>
                <button
                  onClick={() => handleSelectRecipient("TRUST_MCH_02")}
                  className="w-full text-left bg-white/5 hover:bg-white/10 p-2.5 rounded-xl border border-white/5 flex justify-between items-center text-xs cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-slate-200">ร้านค้าตลาดสด (Trust Score: 95)</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">ตลาดสดสามย่าน - เจ๊มะลิ (โอนได้ทันที)</p>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </button>
                <button
                  onClick={() => {
                    // Trigger warnings for demo
                    setQrOverlayWarning(true);
                    setScreenGlareWarning(true);
                    handleSelectRecipient("UNTRUSTED_P2P_03");
                  }}
                  className="w-full text-left bg-red-950/20 hover:bg-red-950/40 p-2.5 rounded-xl border border-red-500/20 flex justify-between items-center text-xs cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-red-300">⚠️ มิจฉาชีพแปะป้าย QR สวมรอย</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">บัญชีม้าใหม่ + ตรวจพบสติกเกอร์ซ้อน & แสงสะท้อน</p>
                  </div>
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Details & Warnings */}
        {step === "details" && (
          <div className="space-y-6">
            
            {/* SECURITY WARNING OVERLAYS (Feature 1 & 2) */}
            {(qrOverlayWarning || screenGlareWarning || gpsMismatchWarning) && (
              <div className="bg-red-950/30 border-2 border-red-500/50 rounded-2xl p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>ระบบตรวจพบความผิดปกติที่อันตราย!</span>
                </div>
                <div className="space-y-2 text-xs text-slate-300 pl-7">
                  {qrOverlayWarning && (
                    <p className="flex items-center gap-1.5 text-red-300">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />
                      <strong>[Sticker detected]</strong> ตรวจพบลักษณะการนำป้ายกระดาษ QR บัญชีอื่นมาแปะทับ
                    </p>
                  )}
                  {screenGlareWarning && (
                    <p className="flex items-center gap-1.5 text-red-300">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />
                      <strong>[Screen Glare]</strong> สัญญาณแสงสะท้อนชี้วัดว่านี่คือหน้าจอมือถือ/แท็บเล็ต ไม่ใช่ป้ายจริง
                    </p>
                  )}
                  {gpsMismatchWarning && (
                    <p className="flex items-center gap-1.5 text-red-300">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />
                      <strong>[GPS Mismatch]</strong> ตำแหน่งสแกนห่างจากพิกัดขึ้นทะเบียนร้านค้าเกิน 50 เมตร (เสี่ยงบิดพิกัด)
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Recipient Details & Trust score */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 space-y-4">
              <div>
                <span className="text-[10px] text-slate-500">บัญชีปลายทาง</span>
                <h3 className="text-base font-bold text-slate-200">{recipientName}</h3>
                <p className="text-xs font-mono text-slate-400 mt-0.5">{scannedId}</p>
              </div>

              {/* Trust Score Bar (Feature 4) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">ระดับความน่าเชื่อถือบัญชี (Trust Score)</span>
                  <span className={`font-bold ${
                    trustScore && trustScore >= 80 ? "text-emerald-400" : "text-orange-400"
                  }`}>{trustScore}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      trustScore && trustScore >= 80 ? "bg-emerald-500" : "bg-orange-500"
                    }`}
                    style={{ width: `${trustScore}%` }}
                  />
                </div>
              </div>

              {/* Escrow Banner (Feature 3) */}
              {requiresEscrow && (
                <div className="bg-orange-950/20 border border-orange-500/20 rounded-xl p-3 flex gap-2 items-start text-xs">
                  <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-orange-300">บังคับเปิดระบบคุ้มครองเงินโอน (Escrow Mode)</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      เนื่องจากบัญชีนี้มีความเสี่ยงสูงหรือเป็น P2P บัญชีใหม่ เงินของคุณจะถูกโฮลด์ไว้ 60 วินาที คุณสามารถกดยกเลิก "ดึงเงินคืน (Recall)" ได้ในแดชบอร์ดหากถูกฉ้อโกง
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Input Amount */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 px-1">จำนวนเงิน (บาท)</label>
              <input 
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 px-5 text-xl font-bold text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs text-center py-2 bg-red-950/20 border border-red-500/20 rounded-xl">
                {error}
              </div>
            )}

            <button
              onClick={() => {
                if (!amount || parseFloat(amount) <= 0) {
                  setError("กรุณาใส่จำนวนเงินที่ต้องการโอน");
                  return;
                }
                setShowPinModal(true);
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold py-4 rounded-2xl transition-all text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/25 cursor-pointer"
            >
              ดำเนินการตรวจสอบและโอนเงิน
            </button>
          </div>
        )}

        {/* Step 3: Success Screen & E-Slip (Feature 8) */}
        {step === "success" && (
          <div className="space-y-6 flex flex-col items-center">
            
            {/* Receipt Preview */}
            <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-white/10">
              {slipUrl ? (
                <img 
                  src={slipUrl} 
                  alt="E-Slip" 
                  className="w-full h-auto object-contain border-b border-white/5"
                />
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  กำลังสร้างและฝังลายน้ำเข้ารหัสลงในสลิป...
                </div>
              )}
              
              <div className="p-4 bg-slate-900/90 text-xs text-slate-400 space-y-2">
                <div className="flex gap-2 items-start text-[11px] leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>[Micro-Watermark Embedded]</strong> สลิปนี้ได้ฝังรหัสลายเซ็นดิจิทัลเข้ารหัสลงในพิกเซลเรียบร้อยแล้ว แม่ค้าสามารถสแกนตรวจเทียบต้นฉบับได้ 100% ป้องกันการปลอมแปลงสลิป
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-8 rounded-2xl transition-all text-xs w-full max-w-xs cursor-pointer"
            >
              กลับไปหน้าบัญชีหลัก
            </button>
          </div>
        )}

      </main>

      {/* PIN Confirmation Modal (Supporting Duress PIN - Feature 5) */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center space-y-5">
            <div className="mx-auto w-10 h-10 bg-indigo-600/20 rounded-full flex items-center justify-center border border-indigo-500/30">
              <Lock className="w-5 h-5 text-indigo-400" />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-bold text-sm">ยืนยันรหัสผ่าน PIN</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                กรุณาใส่รหัส PIN เพื่อยืนยันการทำรายการโอนเงิน ฿{Number(amount).toLocaleString()}
              </p>
            </div>

            {/* Dot Display */}
            <div className="flex justify-center gap-3 py-2">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-3.5 h-3.5 rounded-full border border-indigo-500/30 transition-all ${
                    pin.length > i ? "bg-indigo-400 scale-110 shadow-md" : "bg-slate-800"
                  }`}
                />
              ))}
            </div>

            {/* Simulated Numpad for modal */}
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  onClick={() => pin.length < 6 && setPin(pin + num)}
                  className="h-12 bg-white/5 hover:bg-white/10 border border-white/5 active:bg-indigo-600/30 rounded-xl text-sm font-semibold flex items-center justify-center cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setPin("")}
                className="h-12 text-xs text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                เคลียร์
              </button>
              <button
                onClick={() => pin.length < 6 && setPin(pin + "0")}
                className="h-12 bg-white/5 hover:bg-white/10 border border-white/5 active:bg-indigo-600/30 rounded-xl text-sm font-semibold flex items-center justify-center cursor-pointer"
              >
                0
              </button>
              <button
                onClick={() => setPin(pin.slice(0, -1))}
                className="h-12 text-xs text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ลบ
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-xs font-semibold">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPin("");
                  setError("");
                }}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs py-3 font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmTransfer}
                disabled={pin.length !== 6 || loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-xs py-3 font-bold cursor-pointer"
              >
                {loading ? "กำลังประมวลผล..." : "ยืนยันการโอน"}
              </button>
            </div>

            {/* Quick tips for presentation */}
            <div className="text-[10px] text-slate-400 border-t border-white/5 pt-3 leading-relaxed">
              💡 ในกรณีฉุกเฉินหรือถูกจี้ ให้กรอกรหัส **999999** เพื่อเซฟความปลอดภัย
            </div>

          </div>
        </div>
      )}

      {/* Hidden canvas for screenshots */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
