# GoPay QRIS Dynamic Payment Server

Server gateway performa tinggi berbasis **Node.js (Express)** untuk mengubah QRIS statis merchant menjadi **Dynamic QRIS (nominal terkunci otomatis)** sesuai standar resmi **EMVCo Bank Indonesia / ASPI**, dilengkapi pengecekan mutasi GoMerch secara real-time.

---

## Fitur Utama

- 🚀 **100% Standar EMVCo Bank Indonesia**: Kalkulasi tagihan dan checksum CRC16-CCITT akurat on-the-fly.
- 🔢 **Kode Unik Acak**: Otomatis menambahkan kode acak unik (100 - 300) untuk mencocokkan pembayaran.
- 👥 **Multi-Merchant Support**: Klien dapat mengirimkan static QR masing-masing atau menggunakan QR default server.
- 🔑 **GoMerch Session Tool**: Dapatkan session `access_token`, `refresh_token`, dan `merchant_id` via SMS OTP GoBiz langsung dari web portal.
- 📊 **Cek Mutasi Real-time**: Mengambil riwayat transaksi uang masuk GoPay langsung ke dashboard.
- 🌐 **Web Portal & Playground**: Antarmuka web interaktif dengan dark/light mode dan dokumentasi API lengkap.

---

## Cara Install di VPS (1-Line Auto Installer)

Jalankan perintah ini di terminal VPS (Ubuntu/Debian):

```bash
git clone https://github.com/Ghalihx/gopay-qris-gateway.git
cd gopay-qris-gateway
chmod +x install.sh
./install.sh
```

Atau langsung 1 baris:
```bash
curl -fsSL https://raw.githubusercontent.com/Ghalihx/gopay-qris-gateway/main/install.sh | bash
```

---

## Instalasi Manual (Local Development)

```bash
git clone https://github.com/Ghalihx/gopay-qris-gateway.git
cd gopay-qris-gateway
npm install
cp .env.example .env
# Edit file .env dan isi STATIC_QR toko Anda
npm start
```

Server akan aktif di `http://localhost:3000`

---

## Konfigurasi (`.env`)

| Variable | Wajib | Keterangan |
| :--- | :---: | :--- |
| `PORT` | Tidak | Port server (default: `3000`) |
| `DEFAULT_STATIC_QR` | Ya | String QRIS statis merchant GoPay / BCA / Dana |
| `TIMEOUT_MINUTES` | Tidak | Batas waktu bayar dalam menit (default: `15`) |

---

## Endpoint API

### 1. Buat Tagihan QRIS Dinamis
**Endpoint:** `GET` / `POST` `/api/create`

| Parameter | Type | Keterangan |
| :--- | :--- | :--- |
| `amount` | integer | Nominal tagihan (contoh: `10000`) |
| `note` | string | *(Opsional)* Catatan transaksi |
| `static_qr` | string | *(Opsional)* Static QR jika ingin uang masuk ke rekening klien sendiri |

**Contoh Response:**
```json
{
  "success": true,
  "message": "QRIS dinamis berhasil dibuat",
  "data": {
    "check_id": "pay_170929364739_abc123",
    "base_amount": 10000,
    "unique_code": 142,
    "total_amount": 10142,
    "qr_string": "00020101021226610014COM.GO-JEK...",
    "qr_image": "data:image/png;base64,...",
    "qr_image_url": "https://domain.com/api/qr/pay_170929364739_abc123.png",
    "check_url": "https://domain.com/api/check/pay_170929364739_abc123",
    "timeout_minutes": 15
  }
}
```

---

### 2. Cek Status Pembayaran
**Endpoint:** `GET` `/api/check/:check_id`

**Contoh Response:**
```json
{
  "success": true,
  "check_id": "pay_170929364739_abc123",
  "status": "PAID",
  "total_amount": 10142,
  "note": "Pembayaran QRIS"
}
```

---

## Contoh Integrasi (Node.js)

```javascript
// 1. Buat QRIS Dinamis
const res = await fetch("https://domain.com/api/create?amount=15000");
const data = await res.json();
console.log("Total Bayar:", data.data.total_amount);
console.log("QR Image:", data.data.qr_image);

// 2. Polling Cek Status Setiap 2 Detik
const timer = setInterval(async () => {
  const check = await fetch("https://domain.com/api/check/" + data.data.check_id);
  const result = await check.json();
  if (result.status === "PAID") {
    clearInterval(timer);
    console.log("Pembayaran Berhasil Dilunasi!");
  }
}, 2000);
```

---

## Manajemen PM2 (Production)

```bash
pm2 status                       # Cek status server
pm2 logs qris-payment-server     # Lihat log real-time
pm2 restart qris-payment-server  # Restart server
pm2 stop qris-payment-server     # Stop server
```

---

## Lisensi
MIT License &copy; 2026.
