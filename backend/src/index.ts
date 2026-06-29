import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Path to JSON-based DB
const DB_PATH = path.join(__dirname, '../data/db.json');

// Interface declarations
interface Transaction {
  id: string;
  sender: string;
  receiver: string;
  receiverName: string;
  amount: number;
  status: 'COMPLETED' | 'PENDING_ESCROW' | 'RECALLED';
  createdAt: string;
  unlockAt?: string;
  watermarkSignature?: string;
}

interface Alarm {
  id: string;
  timestamp: string;
  location: { lat: number; lng: number };
  status: 'ACTIVE' | 'RESOLVED';
}

interface DB {
  userBalance: number;
  decoyBalance: number;
  transactions: Transaction[];
  decoyTransactions: Transaction[];
  alarms: Alarm[];
}

// Initial DB state
const INITIAL_DB: DB = {
  userBalance: 450000,
  decoyBalance: 1200,
  transactions: [
    {
      id: 'TXN839485901',
      sender: 'Normal User',
      receiver: 'TRUST_CORP_01',
      receiverName: 'S&P Bakery Group',
      amount: 450,
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    },
    {
      id: 'TXN839485902',
      sender: 'Normal User',
      receiver: 'TRUST_MCH_02',
      receiverName: 'ตลาดสดสามย่าน - เจ๊มะลิ',
      amount: 120,
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    }
  ],
  decoyTransactions: [
    {
      id: 'TXNDEC001',
      sender: 'Normal User',
      receiver: 'TRUST_MCH_02',
      receiverName: 'ตลาดสดสามย่าน - เจ๊มะลิ',
      amount: 45,
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    }
  ],
  alarms: []
};

// Read / Write DB functions
const readDB = (): DB => {
  try {
    if (!fs.existsSync(path.dirname(DB_PATH))) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DB, null, 2));
      return INITIAL_DB;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB:', err);
    return INITIAL_DB;
  }
};

const writeDB = (db: DB) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error writing DB:', err);
  }
};

// Trust Score Directory
const MERCHANT_REGISTRY: Record<string, { name: string; type: string; trustScore: number; lat: number; lng: number }> = {
  'TRUST_CORP_01': {
    name: 'S&P Bakery Group',
    type: 'Corporate',
    trustScore: 100,
    lat: 13.736717, // Bangkok area
    lng: 100.523186
  },
  'TRUST_MCH_02': {
    name: 'ตลาดสดสามย่าน - เจ๊มะลิ',
    type: 'Merchant',
    trustScore: 95,
    lat: 13.733792,
    lng: 100.528435
  },
  'UNTRUSTED_P2P_03': {
    name: 'นาย สมศักดิ์ ม้าเร็ว (บัญชีใหม่)',
    type: 'Personal',
    trustScore: 10,
    lat: 13.756331,
    lng: 100.501765
  }
};

// Mock authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { pin } = req.body;
  if (pin === '123456') {
    return res.json({ token: 'normal-user-token', isDecoy: false, balance: readDB().userBalance });
  } else if (pin === '999999') {
    // Duress PIN entered
    return res.json({ token: 'decoy-user-token', isDecoy: true, balance: readDB().decoyBalance });
  }
  return res.status(401).json({ error: 'รหัส PIN ไม่ถูกต้อง' });
});

// Get user accounts
app.get('/api/accounts/balance', (req, res) => {
  const token = req.headers.authorization;
  const db = readDB();
  if (token === 'decoy-user-token') {
    return res.json({ balance: db.decoyBalance, isDecoy: true });
  }
  return res.json({ balance: db.userBalance, isDecoy: false });
});

// Get transaction history
app.get('/api/accounts/transactions', (req, res) => {
  const token = req.headers.authorization;
  const db = readDB();
  
  // Update expired escrow status on fly
  let modified = false;
  const now = new Date();
  
  db.transactions = db.transactions.map(tx => {
    if (tx.status === 'PENDING_ESCROW' && tx.unlockAt && new Date(tx.unlockAt) <= now) {
      tx.status = 'COMPLETED';
      modified = true;
    }
    return tx;
  });

  if (modified) {
    writeDB(db);
  }

  if (token === 'decoy-user-token') {
    return res.json(db.decoyTransactions);
  }
  return res.json(db.transactions);
});

// Prepare transfer: Get trust score and check if escrow is needed
app.post('/api/transfer/prepare', (req, res) => {
  const { receiverId } = req.body;
  const merchant = MERCHANT_REGISTRY[receiverId];

  if (!merchant) {
    // If not in registry, treat as new/untrusted P2P account
    return res.json({
      receiverId,
      receiverName: 'บัญชีบุคคลทั่วไป (ไม่คุ้นเคย)',
      trustScore: 20,
      requiresEscrow: true,
      escrowDurationSec: 60, // 60 seconds for demo convenience, normally 15-30 mins
      lat: 0,
      lng: 0
    });
  }

  return res.json({
    receiverId,
    receiverName: merchant.name,
    trustScore: merchant.trustScore,
    requiresEscrow: merchant.trustScore < 80,
    escrowDurationSec: 60,
    lat: merchant.lat,
    lng: merchant.lng
  });
});

// Confirm transfer
app.post('/api/transfer/confirm', (req, res) => {
  const token = req.headers.authorization;
  const { receiverId, amount, isDuress, location } = req.body;
  const numericAmount = Number(amount);

  const db = readDB();

  // Find recipient details
  const merchant = MERCHANT_REGISTRY[receiverId] || {
    name: 'บัญชีบุคคลทั่วไป (ไม่คุ้นเคย)',
    trustScore: 20,
    lat: 0,
    lng: 0
  };

  // If request contains isDuress=true OR token is decoy, simulate successful transfer
  if (token === 'decoy-user-token' || isDuress || req.body.pin === '999999') {
    console.log('[ALERT] Duress PIN triggered!');
    
    // Add silent alarm
    const newAlarm: Alarm = {
      id: 'ALARM_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      timestamp: new Date().toISOString(),
      location: location || { lat: 13.733792, lng: 100.528435 },
      status: 'ACTIVE'
    };
    db.alarms.push(newAlarm);

    // Deduct from decoy balance
    db.decoyBalance = Math.max(0, db.decoyBalance - numericAmount);

    // Create a fake transaction in decoy history
    const fakeTx: Transaction = {
      id: 'TXN_DEC_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      sender: 'Normal User',
      receiver: receiverId,
      receiverName: merchant.name,
      amount: numericAmount,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      watermarkSignature: 'MOCK_WATERMARK_DUPLICATE_FAILED' // Decoy watermark
    };
    db.decoyTransactions.unshift(fakeTx);
    writeDB(db);

    return res.json({
      success: true,
      message: 'โอนเงินสำเร็จ (โหมดลวงตา)',
      transaction: fakeTx,
      isDecoy: true
    });
  }

  // Normal mode transfer validation
  if (db.userBalance < numericAmount) {
    return res.status(400).json({ error: 'ยอดเงินคงเหลือไม่เพียงพอ' });
  }

  // Deduct user balance
  db.userBalance -= numericAmount;

  // Determine escrow requirements
  const requiresEscrow = merchant.trustScore < 80;
  const txId = 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase();

  // Simple LSB Watermark simulation string (to embed in frontend display/slip generation)
  const watermarkPayload = `SAMPAOGUARD_SECURE_TOKEN:${txId}:${numericAmount}:${Date.now()}`;

  const newTx: Transaction = {
    id: txId,
    sender: 'Normal User',
    receiver: receiverId,
    receiverName: merchant.name,
    amount: numericAmount,
    status: requiresEscrow ? 'PENDING_ESCROW' : 'COMPLETED',
    createdAt: new Date().toISOString(),
    unlockAt: requiresEscrow ? new Date(Date.now() + 60 * 1000).toISOString() : undefined, // 60 seconds delay for demo
    watermarkSignature: Buffer.from(watermarkPayload).toString('base64') // Encoded signature
  };

  db.transactions.unshift(newTx);
  writeDB(db);

  return res.json({
    success: true,
    message: requiresEscrow ? 'เริ่มระบบโอนเงินแบบหน่วงเวลา (Escrow Hold 60s)' : 'โอนเงินสำเร็จ',
    transaction: newTx,
    isDecoy: false
  });
});

// Recall money held in Escrow
app.post('/api/transfer/recall', (req, res) => {
  const { transactionId } = req.body;
  const db = readDB();

  const txIndex = db.transactions.findIndex(tx => tx.id === transactionId);
  if (txIndex === -1) {
    return res.status(404).json({ error: 'ไม่พบรายการธุรกรรมนี้' });
  }

  const tx = db.transactions[txIndex];
  if (tx.status !== 'PENDING_ESCROW') {
    return res.status(400).json({ error: 'ธุรกรรมนี้ไม่ได้อยู่ในการหน่วงเวลา หรือเสร็จสิ้นไปแล้ว' });
  }

  // Mark as recalled
  tx.status = 'RECALLED';
  
  // Refund balance
  db.userBalance += tx.amount;
  writeDB(db);

  return res.json({
    success: true,
    message: 'ดึงเงินกลับเข้าบัญชีสำเร็จแล้ว',
    balance: db.userBalance,
    transaction: tx
  });
});

// Police silent alarms endpoint
app.get('/api/police/alarms', (req, res) => {
  return res.json(readDB().alarms);
});

app.post('/api/police/clear', (req, res) => {
  const db = readDB();
  db.alarms = [];
  writeDB(db);
  return res.json({ success: true, message: 'เคลียร์รายการแจ้งเตือนทั้งหมดแล้ว' });
});

// Serve merchant details helper
app.get('/api/merchants', (req, res) => {
  return res.json(MERCHANT_REGISTRY);
});

app.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);
});
