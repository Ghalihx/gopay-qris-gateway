require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const QRCode = require('qrcode');
const { generateDynamicQris } = require('./lib/qris');

const app = express();
const PORT = process.env.PORT || 3000;
const TIMEOUT_MINUTES = parseInt(process.env.TIMEOUT_MINUTES || '15', 10);
const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;
const CHECKS_FILE = path.join(__dirname, 'checks.json');
const UPSTREAM_API = 'https://qris.adijayavpnpedia.cloud';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory store
const activeChecks = new Map();

function loadChecks() {
  try {
    if (fs.existsSync(CHECKS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHECKS_FILE, 'utf8'));
      const now = Date.now();
      for (const [id, item] of Object.entries(data)) {
        if (now - item.createdAt < TIMEOUT_MS) activeChecks.set(id, item);
      }
    }
  } catch (err) {
    console.error('[Store] Load error:', err.message);
  }
}

function saveChecks() {
  try {
    fs.writeFileSync(CHECKS_FILE, JSON.stringify(Object.fromEntries(activeChecks), null, 2));
  } catch (err) {
    console.error('[Store] Save error:', err.message);
  }
}

loadChecks();

setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [id, item] of activeChecks.entries()) {
    if (now - item.createdAt > TIMEOUT_MS) {
      activeChecks.delete(id);
      changed = true;
    }
  }
  if (changed) saveChecks();
}, 60000);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    server_time: new Date().toISOString(),
    active_transactions: activeChecks.size
  });
});

// ==========================================
// SEAMLESS PROXY UNTUK SEMUA API GOMERCH
// ==========================================
app.use('/gomerch/api', async (req, res) => {
  try {
    const upstreamUrl = `${UPSTREAM_API}/gomerch/api${req.url}`;
    const response = await axios({
      method: req.method,
      url: upstreamUrl,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      timeout: 15000
    });
    res.status(response.status).json(response.data);
  } catch (e) {
    if (e.response) {
      res.status(e.response.status).json(e.response.data);
    } else {
      res.status(500).json({ success: false, message: e.message });
    }
  }
});

// ==========================================
// LOCAL STANDALONE GENERATOR & CHECKER
// ==========================================

async function handleCreate(req, res) {
  try {
    const raw = req.body.amount || req.query.amount;
    const base = parseInt(raw, 10);
    if (isNaN(base) || base < 500) {
      return res.status(400).json({ success: false, message: 'Nominal minimal Rp 500' });
    }

    const staticQr = req.body.static_qr || req.query.static_qr || process.env.DEFAULT_STATIC_QR;
    if (!staticQr) {
      return res.status(400).json({ success: false, message: 'Static QR belum diisi di request atau .env' });
    }

    const uniqueCode = Math.floor(Math.random() * 201) + 100;
    const totalAmount = base + uniqueCode;
    const dynamicQris = generateDynamicQris(staticQr, totalAmount);
    const qrImage = await QRCode.toDataURL(dynamicQris, { margin: 2, width: 400 });
    const checkId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const record = {
      checkId,
      baseAmount: base,
      uniqueCode,
      totalAmount,
      note: req.body.note || req.query.note || 'Pembayaran QRIS',
      status: 'UNPAID',
      createdAt: Date.now(),
      qrisString: dynamicQris
    };
    activeChecks.set(checkId, record);
    saveChecks();

    const host = req.get('host');
    const proto = req.protocol;
    res.json({
      success: true,
      message: 'QRIS dinamis berhasil dibuat',
      data: {
        check_id: checkId,
        base_amount: base,
        unique_code: uniqueCode,
        total_amount: totalAmount,
        qr_string: dynamicQris,
        qr_image: qrImage,
        qr_image_url: `${proto}://${host}/api/qr/${checkId}.png`,
        check_url: `${proto}://${host}/api/check/${checkId}`,
        timeout_minutes: TIMEOUT_MINUTES
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

app.post('/api/create', handleCreate);
app.get('/api/create', handleCreate);

app.get('/api/check/:checkId', (req, res) => {
  const trx = activeChecks.get(req.params.checkId);
  if (!trx) return res.status(404).json({ success: false, status: 'NOT_FOUND', message: 'Transaksi tidak ditemukan/expired' });
  res.json({
    success: true,
    check_id: trx.checkId,
    status: trx.status,
    total_amount: trx.totalAmount,
    note: trx.note,
    created_at: new Date(trx.createdAt).toISOString()
  });
});

app.get('/api/qr/:checkId.png', async (req, res) => {
  const trx = activeChecks.get(req.params.checkId);
  if (!trx) return res.status(404).send('Not Found');
  res.setHeader('Content-Type', 'image/png');
  await QRCode.toFileStream(res, trx.qrisString, { margin: 2, width: 400 });
});

app.listen(PORT, () => console.log(`🚀 QRIS Gateway Server running on port ${PORT}`));
