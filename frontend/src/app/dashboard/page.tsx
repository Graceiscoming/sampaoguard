"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Shield, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCcw, 
  User, 
  LogOut, 
  Clock, 
  CheckCircle,
  AlertTriangle
} from "lucide-react";

interface Transaction {
  id: string;
  sender: string;
  receiver: string;
  receiverName: string;
  amount: number;
  status: 'COMPLETED' | 'PENDING_ESCROW' | 'RECALLED';
  createdAt: string;
  unlockAt?: string;
}

export default function DashboardPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [isDecoy, setIsDecoy] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchDashboardData = async () => {
    const token = localStorage.getItem("sampaoguard_token");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      // Fetch balance
      const balRes = await fetch("http://localhost:5001/api/accounts/balance", {
        headers: { "Authorization": token }
      });
      const balData = await balRes.json();
      setBalance(balData.balance);
      setIsDecoy(balData.isDecoy);

      // Fetch transactions
      const txRes = await fetch("http://localhost:5001/api/accounts/transactions", {
        headers: { "Authorization": token }
      });
      const txData = await txRes.json();
      setTransactions(txData);
    } catch (err) {
      setError("ไม่สามารถดึงข้อมูลจากเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Poll data every 5 seconds to keep countdown and balance updated
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRecall = async (txId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการดึงเงินรายการนี้กลับคืนทันที?")) {
      return;
    }

    try {
      const response = await fetch("http://localhost:5001/api/transfer/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: txId }),
      });

      const data = await response.json();
      if (response.ok) {
        alert("ดึงเงินคืนสำเร็จ! ยอดเงินโอนกลับเข้าบัญชีคุณเรียบร้อยแล้ว");
        fetchDashboardData();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการดึงเงินคืน");
      }
    } catch (err) {
      alert("ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อทำการดึงเงินคืนได้");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("sampaoguard_token");
    localStorage.removeItem("sampaoguard_is_decoy");
    localStorage.removeItem("sampaoguard_pin");
    router.push("/");
  };

  // Helper to calculate seconds remaining
  const getSecondsRemaining = (unlockAtStr: string) => {
    const remaining = Math.max(0, Math.round((new Date(unlockAtStr).getTime() - Date.now()) / 1000));
    return remaining;
  };

  // Group pending escrow items
  const pendingEscrows = transactions.filter(tx => tx.status === "PENDING_ESCROW" && getSecondsRemaining(tx.unlockAt || "") > 0);
  const regularTransactions = transactions.filter(tx => tx.status !== "PENDING_ESCROW" || getSecondsRemaining(tx.unlockAt || "") <= 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-white min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 text-white min-h-screen pb-12">
      
      {/* Premium Bank Header */}
      <header className="border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-400" />
            <span className="font-bold tracking-wider text-sm bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              SAMPAOGUARD
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isDecoy && (
              <span className="bg-red-950/80 border border-red-500/30 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                DECOY ACTIVE
              </span>
            )}
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-white/5 active:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-6 space-y-6">
        
        {/* User Card */}
        <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="flex items-center gap-3 text-slate-400 text-xs mb-2">
            <User className="w-4 h-4 text-indigo-400" />
            <span>สวัสดี, ผู้ใช้งานระบบธนาคาร</span>
          </div>
          
          <div className="text-3xl font-extrabold tracking-tight mt-1">
            ฿{balance?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-slate-400 text-[11px] mt-1">
            ยอดเงินคงเหลือใช้ได้จริง
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={() => router.push("/transfer")}
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-medium text-xs py-3 rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" /> โอนเงิน / สแกน QR
            </button>
            <a
              href="/merchant"
              className="bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 text-slate-200 font-medium text-xs py-3 rounded-2xl transition-all flex items-center justify-center gap-1.5 text-center"
            >
              <ArrowDownLeft className="w-4 h-4" /> เมนูร้านค้ารับเงิน
            </a>
          </div>
        </div>

        {/* Escrow Holds Section */}
        {pendingEscrows.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-orange-400 font-semibold text-xs px-1">
              <Clock className="w-4 h-4" />
              <span>รายการหน่วงเวลาคุ้มครองภัย (Time-Locked Escrow)</span>
            </div>

            <div className="space-y-2.5">
              {pendingEscrows.map((tx) => {
                const sec = getSecondsRemaining(tx.unlockAt || "");
                return (
                  <div 
                    key={tx.id} 
                    className="bg-orange-950/20 border border-orange-500/30 rounded-2xl p-4 flex flex-col gap-3 shadow-md"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-semibold text-orange-300">โอนไป: {tx.receiverName}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">บช: {tx.receiver} | เลขอ้างอิง: {tx.id}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-orange-400">
                          -฿{tx.amount.toLocaleString()}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-end gap-1">
                          <span className="inline-block w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
                          <span>เหลือ {sec} วินาที</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRecall(tx.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 active:scale-98 text-white font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> ดึงเงินคืนทันที (Recall)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 px-1">รายการทำธุรกรรมล่าสุด</h3>
          
          {regularTransactions.length === 0 && pendingEscrows.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs bg-slate-900/30 rounded-2xl border border-white/5">
              ไม่มีประวัติการทำรายการ
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
              {regularTransactions.map((tx) => (
                <div key={tx.id} className="p-3.5 flex justify-between items-center hover:bg-white/[0.01] transition-colors">
                  <div className="flex gap-3 items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.status === "RECALLED" 
                        ? "bg-red-950/50 text-red-400 border border-red-500/20" 
                        : "bg-slate-800 text-slate-300"
                    }`}>
                      {tx.status === "RECALLED" ? (
                        <RotateCcw className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-slate-200">
                        {tx.receiverName}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {tx.status === "RECALLED" ? "ดึงเงินโอนกลับแล้ว" : "โอนเงินสำเร็จ"} • {new Date(tx.createdAt).toLocaleTimeString("th-TH")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold ${
                      tx.status === "RECALLED" ? "text-slate-400 line-through" : "text-slate-200"
                    }`}>
                      -฿{tx.amount.toLocaleString()}
                    </span>
                    <p className="text-[9px] text-slate-500 mt-0.5 font-mono">{tx.id}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Informative Security Banner */}
        <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-indigo-300">เกราะป้องกันธุรกรรมทำงานอยู่</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              ส้มป่อยการ์ดจะวิเคราะห์บัญชีปลายทางอัตโนมัติ หากโอนเข้าบัญชีส่วนบุคคลที่ไม่เคยติดต่อ ระบบจะหน่วงเงินไว้ชั่วคราวเพื่อความปลอดภัย คุณสามารถยกเลิกดึงเงินคืนได้ตลอดเวลาก่อนครบกำหนด
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
