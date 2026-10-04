const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, '..', 'apikeys.json');

class ApiKeyManager {
  constructor() {
    this.keys = new Map();
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        for (const [key, val] of Object.entries(parsed)) {
          this.keys.set(key, val);
        }
        console.log(`[ApiKeyManager] Loaded ${this.keys.size} API keys.`);
      } else {
        // Buat demo key default jika belum ada
        this.create('Demo Web Tester', 365, null, 'ghx_demo_tester_key_2026');
      }
    } catch (err) {
      console.error('[ApiKeyManager] Load error:', err.message);
    }
  }

  save() {
    try {
      const obj = Object.fromEntries(this.keys);
      fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2));
    } catch (err) {
      console.error('[ApiKeyManager] Save error:', err.message);
    }
  }

  create(clientName, durationDays = 30, customQr = null, customKey = null) {
    const key = customKey || `ghx_live_${crypto.randomBytes(12).toString('hex')}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const record = {
      apiKey: key,
      clientName: clientName || 'Unnamed Client',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'ACTIVE',
      customStaticQr: customQr || null,
      totalTransactions: 0
    };

    this.keys.set(key, record);
    this.save();
    return record;
  }

  validate(key) {
    if (!key) return { valid: false, reason: 'API Key wajib disertakan di header x-api-key atau query ?api_key=' };
    const record = this.keys.get(key);
    if (!record) return { valid: false, reason: 'API Key tidak valid / tidak terdaftar.' };
    if (record.status !== 'ACTIVE') return { valid: false, reason: 'API Key Anda sedang dinonaktifkan oleh admin.' };

    const exp = new Date(record.expiresAt).getTime();
    if (Date.now() > exp) {
      return { valid: false, reason: 'Masa aktif langganan API Key Anda telah berakhir. Hubungi @GallVpnStore untuk perpanjang.' };
    }

    return { valid: true, client: record };
  }

  recordUsage(key) {
    const record = this.keys.get(key);
    if (record) {
      record.totalTransactions = (record.totalTransactions || 0) + 1;
      this.save();
    }
  }

  extend(key, additionalDays = 30) {
    const record = this.keys.get(key);
    if (!record) return null;

    const currentExp = new Date(record.expiresAt).getTime();
    const base = currentExp > Date.now() ? currentExp : Date.now();
    record.expiresAt = new Date(base + additionalDays * 24 * 60 * 60 * 1000).toISOString();
    record.status = 'ACTIVE';
    this.save();
    return record;
  }

  toggle(key, status) {
    const record = this.keys.get(key);
    if (!record) return null;
    record.status = status;
    this.save();
    return record;
  }

  list() {
    return Array.from(this.keys.values());
  }

  delete(key) {
    const ok = this.keys.delete(key);
    if (ok) this.save();
    return ok;
  }
}

module.exports = new ApiKeyManager();
