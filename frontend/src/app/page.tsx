"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      setPin(pin + num);
      setError("");
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length !== 6) {
      setError("กรุณาใส่รหัส PIN ให้ครบ 6 หลัก");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("sampaoguard_token", data.token);
        localStorage.setItem("sampaoguard_is_decoy", data.isDecoy ? "true" : "false");
        localStorage.setItem("sampaoguard_pin", pin); // Store pin for duress detection in transfer confirmation
        router.push("/dashboard");
      } else {
        setError(data.error || "รหัส PIN ไม่ถูกต้อง");
        setPin("");
      }
    } catch (err) {
      setError("ไม่สามารถติดต่อเซิร์ฟเวอร์หลักได้ (กรุณารัน backend)");
    } finally {
      setLoading(false);
    }
  };

  // Auto submit when 6 digits are reached
  if (pin.length === 6 && !loading && !error) {
    handleSubmit();
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-4 py-8 text-white min-h-screen">
      
      {/* Brand Header */}
      <div className="text-center mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-indigo-600/30 rounded-full flex items-center justify-center border border-indigo-400/50 mb-3 shadow-lg shadow-indigo-500/20 backdrop-blur-md">
          <Shield className="w-9 h-9 text-indigo-400" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
          SAMPAOGUARD
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-xs">
          ระบบธนาคารความมั่นคงสูง ป้องกันภัยไซเบอร์และการขู่กรรโชกทรัพย์
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
        <h2 className="text-center text-lg font-medium text-slate-300 mb-6 flex items-center justify-center gap-2">
          <Lock className="w-4 h-4 text-indigo-400" /> เข้าสู่ระบบด้วย PIN 6 หลัก
        </h2>

        {/* Display screen */}
        <div className="relative mb-6">
          <div className="flex justify-center gap-3 py-3 px-4 bg-slate-950/50 border border-white/5 rounded-2xl">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border border-indigo-500/30 flex items-center justify-center transition-all duration-150 ${
                  pin.length > i
                    ? "bg-indigo-400 shadow-md shadow-indigo-500/50 scale-110"
                    : "bg-slate-800"
                }`}
              />
            ))}
          </div>
          {pin.length > 0 && (
            <button
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          {showPin && (
            <div className="text-center text-xs text-indigo-300 font-mono tracking-widest mt-1">
              {pin}
            </div>
          )}
        </div>

        {error && (
          <div className="text-red-400 text-xs text-center font-medium bg-red-950/30 border border-red-500/20 py-2 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Custom Numpad */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-16 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:bg-indigo-600/30 text-xl font-semibold transition-all duration-100 flex items-center justify-center cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-16 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-sm font-medium text-slate-400 flex items-center justify-center cursor-pointer"
          >
            ล้าง
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            className="h-16 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:bg-indigo-600/30 text-xl font-semibold flex items-center justify-center cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-16 rounded-2xl bg-white/5 border border-white/5 hover:bg-red-900/20 active:bg-red-900/40 text-sm font-medium text-slate-400 flex items-center justify-center cursor-pointer"
          >
            ลบ
          </button>
        </div>

        {/* Helper Instructions for demonstration */}
        <div className="border-t border-white/10 pt-4 mt-2">
          <div className="text-xs font-semibold text-indigo-300 mb-2">คู่มือทดสอบเดโม่:</div>
          <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc pl-4">
            <li>
              <span className="text-indigo-400 font-bold">123456</span> : บัญชีจริง แสดงยอดเงินฝากจริง ฿450,000
            </li>
            <li>
              <span className="text-red-400 font-bold">999999</span> : **Duress PIN (รหัสภัยพิบัติ)** บังคับสลับแอปไปโหมดลวงตา ยอดเงินเหลือ ฿1,200 และแอบยิงพิกัดส่งตำรวจเงียบ (Silent Alarm)
            </li>
          </ul>
        </div>
      </div>
      
      {/* Footer navigation for quick switching (Merchant/Police) */}
      <div className="mt-8 flex gap-4 text-xs text-slate-400">
        <a href="/merchant" className="hover:text-indigo-400 transition-colors">
          หน้าร้านค้า (สแกนสลิป) →
        </a>
        <span className="text-slate-600">|</span>
        <a href="/police" className="hover:text-red-400 transition-colors">
          สถานีตำรวจ (จอมอนิเตอร์) →
        </a>
      </div>
    </div>
  );
}
