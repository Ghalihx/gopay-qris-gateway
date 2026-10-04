/**
 * EMVCo QRIS Dynamic Generator (Bank Indonesia / ASPI Standard)
 * Mengubah QRIS Statis menjadi QRIS Dinamis dengan nominal otomatis.
 */

function crc16(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generate QRIS Dinamis dari QRIS Statis
 * @param {string} staticQris - String QRIS statis (misal dari GoPay/GoBiz)
 * @param {number|string} amount - Nominal pembayaran (misal: 10000 atau 10150)
 * @returns {string} - String QRIS dinamis siap dijadikan QR code
 */
function generateDynamicQris(staticQris, amount) {
  if (!staticQris || typeof staticQris !== 'string') {
    throw new Error('Static QRIS string wajib diisi');
  }

  let qris = staticQris.trim();

  // 1. Buang tag CRC16 lama di akhir string (6304xxxx)
  const crcIndex = qris.lastIndexOf('6304');
  if (crcIndex !== -1 && crcIndex >= qris.length - 8) {
    qris = qris.substring(0, crcIndex);
  }

  // 2. Ubah Tag 01 (Point of Initiation Method) dari 11 (Statis) ke 12 (Dinamis)
  // Format tag 01: 01 02 11 -> ubah jadi 01 02 12
  if (qris.includes('010211')) {
    qris = qris.replace('010211', '010212');
  }

  // 3. Format tag 54 (Transaction Amount)
  const amountStr = Math.floor(Number(amount)).toString();
  const amountLen = amountStr.length.toString().padStart(2, '0');
  const tag54 = `54${amountLen}${amountStr}`;

  // 4. Sisipkan Tag 54 sebelum Tag 58 (Country Code: 5802ID)
  // Jika tag 58 ada:
  const tag58Index = qris.indexOf('5802ID');
  if (tag58Index !== -1) {
    qris = qris.substring(0, tag58Index) + tag54 + qris.substring(tag58Index);
  } else {
    // Jika tidak ada tag 58, sisipkan sebelum tag CRC
    qris = qris + tag54;
  }

  // 5. Tambahkan prefix Tag 63 (CRC)
  const qrisWithCrcTag = qris + '6304';

  // 6. Hitung CRC16 baru
  const newCrc = crc16(qrisWithCrcTag);

  return qrisWithCrcTag + newCrc;
}

module.exports = {
  crc16,
  generateDynamicQris
};
