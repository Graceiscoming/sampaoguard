"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Shield, 
  ArrowLeft, 
  MapPin, 
  Bell, 
  ShieldAlert, 
  Trash2, 
  RefreshCw,
  Clock,
  Compass
} from "lucide-react";

interface Alarm {
  id: string;
  timestamp: string;
  location: { lat: number; lng: number };
  status: 'ACTIVE' | 'RESOLVED';
}

export default function PolicePage() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchAlarms = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/police/alarms");
      const data = await response.json();
      setAlarms(data);
      setError("");
    } catch (err) {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ตำรวจได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlarms();
    // Poll alarms every 3 seconds
    const interval = setInterval(fetchAlarms, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleClearAlarms = async () => {
    if (!confirm("คุณแน่ใจใช่หรือไม่ว่าต้องการล้างประวัติเหตุฉุกเฉินทั้งหมด?")) {
      return;
    }

    try {
      const response = await fetch("http://localhost:5001/api/police/clear", {
        method: "POST"
      });
      if (response.ok) {
        setAlarms([]);
        alert("ล้างข้อมูลเหตุฉุกเฉินเรียบร้อยแล้ว");
      }
    } catch (err) {
      alert("ไม่สามารถติดต่อเซิร์ฟเวอร์หลักได้");
    }
  };

  return (
    <div className="flex-1 bg-slate-950 text-white min-h-screen pb-12 font-sans">
      
      {/* Tactical Header */}
      <header className="border-b-2 border-red-500/50 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push("/")}
              className="p-1 hover:bg-white/5 active:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="font-extrabold text-sm tracking-wider flex items-center gap-2 text-red-500">
              <ShieldAlert className="w-5 h-5 animate-pulse" /> ศูนย์รับแจ้งเหตุและพิกัดภัยพิบัติ (Police Terminal)
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchAlarms}
              className="p-2 hover:bg-white/5 active:bg-white/10 rounded-xl text-slate-400 hover:text-white cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {alarms.length > 0 && (
              <button
                onClick={handleClearAlarms}
                className="bg-red-950/80 border border-red-500/40 hover:bg-red-900 text-red-400 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> ล้างหน้าจอภัย
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-6">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-red-950/20 via-slate-900 to-slate-950 border border-red-500/20 rounded-3xl p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-red-400 flex items-center gap-2">
              <Bell className="w-5 h-5 text-red-500 animate-bounce" /> สถานะระบบตอบรับสัญญาณเงียบ (Silent Alarm Monitor)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              ระบบรับส่งพิกัดเหยื่อเมื่อถูกบังคับป้อนรหัส PIN ฉุกเฉิน (`999999`) ในแอปธนาคาร ข้อมูลพิกัดและเวลาจะยิงเข้าสถานีตำรวจโดยตรงเพื่อส่งสายตรวจไปช่วยเหลือได้ทันท่วงที
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-slate-900 border border-white/5 p-3 rounded-2xl text-center min-w-[100px]">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">เหตุทั้งหมด</span>
              <p className="text-2xl font-black text-red-500 mt-1">{alarms.length}</p>
            </div>
            <div className="bg-slate-900 border border-white/5 p-3 rounded-2xl text-center min-w-[100px]">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">สถานะระบบ</span>
              <p className="text-sm font-black text-emerald-400 mt-2">ACTIVE</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-xs py-3 px-4 bg-red-950/20 border border-red-500/20 rounded-2xl text-center mb-6">
            {error}
          </div>
        )}

        {/* Content layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Alarms List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">ประวัติแจ้งเหตุฉุกเฉิน</h3>
            
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500 bg-slate-900/30 rounded-2xl border border-white/5">
                กำลังดึงข้อมูล...
              </div>
            ) : alarms.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 bg-slate-900/20 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-2">
                <Compass className="w-8 h-8 text-slate-700 animate-spin" style={{ animationDuration: '6s' }} />
                <span>ยังไม่มีการแจ้งเหตุในขณะนี้ (สภาวะปกติ)</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {alarms.map((alarm) => (
                  <div 
                    key={alarm.id} 
                    className="bg-red-950/10 border border-red-500/30 rounded-2xl p-4 space-y-3 hover:bg-red-950/20 transition-all shadow-md"
                  >
                    <div className="flex justify-between items-start">
                      <div className="bg-red-600 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                        EMERGENCY
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{alarm.id}</span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>เวลา: {new Date(alarm.timestamp).toLocaleString("th-TH")}</span>
                      </p>
                      <p className="flex items-center gap-1.5 font-semibold text-red-300">
                        <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>พิกัด: {alarm.location.lat.toFixed(6)}, {alarm.location.lng.toFixed(6)}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tactical Simulation Map (Wow component) */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">แผนที่จำลองสายตรวจพิกัด GPS (Tactical Radar Map)</h3>
            
            <div className="aspect-[16/10] w-full bg-slate-950 border border-white/10 rounded-3xl relative overflow-hidden flex items-center justify-center shadow-inner">
              
              {/* Grid Lines */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
              
              {/* Radar circles */}
              <div className="absolute w-80 h-80 border border-indigo-500/10 rounded-full animate-pulse" />
              <div className="absolute w-[500px] h-[500px] border border-indigo-500/5 rounded-full" />
              
              {/* Bangkok mockup map overlay lines (vector art style) */}
              <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 0,200 Q 150,150 300,280 T 600,100" fill="none" stroke="#818cf8" strokeWidth="6" />
                <path d="M 100,0 L 150,400" fill="none" stroke="#818cf8" strokeWidth="2" />
                <path d="M 400,0 L 350,400" fill="none" stroke="#818cf8" strokeWidth="2" />
                <path d="M 0,300 L 600,250" fill="none" stroke="#818cf8" strokeWidth="2" />
              </svg>

              {/* Pulsing alarm dots for victims */}
              {alarms.map((alarm) => {
                // Map coordinates roughly to relative box percentage for demonstration
                // Bangkok coordinates lat ~13.73, lng ~100.5.
                // We calculate a relative offset
                const latDiff = (alarm.location.lat - 13.73) * 1000;
                const lngDiff = (alarm.location.lng - 100.5) * 1000;
                
                const topPct = Math.min(90, Math.max(10, 50 - latDiff * 2));
                const leftPct = Math.min(90, Math.max(10, 50 + lngDiff * 2));

                return (
                  <div 
                    key={alarm.id} 
                    className="absolute transition-all duration-500 flex flex-col items-center gap-1 group"
                    style={{ top: `${topPct}%`, left: `${leftPct}%` }}
                  >
                    {/* Ring animation */}
                    <div className="absolute w-8 h-8 bg-red-500/30 rounded-full animate-ping -mt-2" />
                    <div className="w-4 h-4 bg-red-600 border-2 border-white rounded-full relative shadow-md shadow-red-500/50 cursor-pointer" />
                    
                    {/* Tooltip detail */}
                    <div className="bg-slate-900 border border-red-500/30 text-[9px] text-red-400 py-1 px-2 rounded-xl font-bold whitespace-nowrap shadow-lg flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                      <span>{alarm.id} (เหยื่อ)</span>
                    </div>
                  </div>
                );
              })}

              {alarms.length === 0 && (
                <div className="z-10 text-center space-y-2">
                  <div className="w-12 h-12 bg-slate-900 border border-white/5 rounded-full flex items-center justify-center mx-auto shadow-md">
                    <Compass className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400">สแกนหาจุดเกิดเหตุแบบเรียลไทม์...</h4>
                    <p className="text-[10px] text-slate-500">พร้อมจับคู่เป้าหมายจากส้มป่อยการ์ดเว็บบอร์ดตำรวจ</p>
                  </div>
                </div>
              )}

              {/* Map Scale indicator */}
              <div className="absolute bottom-4 left-4 bg-slate-900/80 border border-white/5 px-2.5 py-1 rounded-xl text-[9px] text-slate-400 font-mono">
                SCALE: 1 : 5,000 | 50m RADAR
              </div>
            </div>
          </div>

        </div>

      </main>

    </div>
  );
}
