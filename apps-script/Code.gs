/**
 * GEPREKIN - Penerima pesanan -> Google Sheets
 *
 * Cara pakai: lihat README.md bagian "Sambungkan ke Google Sheets".
 * Script ini dipasang lewat Extensions > Apps Script di dalam Google Sheet.
 *
 * Hasilnya 2 sheet otomatis:
 *   - "Pesanan"     : 1 baris per pesanan
 *   - "Detail Item" : 1 baris per item yang dipesan
 */

const SHEET_PESANAN = 'Pesanan';
const SHEET_DETAIL  = 'Detail Item';

const HEADER_PESANAN = ['Waktu', 'ID Pesanan', 'Nama', 'WhatsApp', 'Alamat', 'Catatan',
                        'Pembayaran', 'Ringkasan Item', 'Subtotal', 'Kode Promo', 'Diskon', 'Total'];
const HEADER_DETAIL  = ['Waktu', 'ID Pesanan', 'Nama Pemesan', 'Menu', 'Harga', 'Qty', 'Subtotal'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const o = JSON.parse(e.postData.contents);

    if (!o.orderId || typeof o.orderId !== 'string') throw new Error('orderId tidak valid');
    if (!Array.isArray(o.items) || o.items.length < 1 || o.items.length > 50) throw new Error('items tidak valid');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const shPesanan = getSheet_(ss, SHEET_PESANAN, HEADER_PESANAN);
    const shDetail  = getSheet_(ss, SHEET_DETAIL, HEADER_DETAIL);

    // Cegah dobel: kalau ID pesanan sudah ada, anggap sukses tanpa menulis ulang
    const last = shPesanan.getLastRow();
    if (last > 1) {
      const ids = shPesanan.getRange(2, 2, last - 1, 1).getValues().flat();
      if (ids.indexOf(o.orderId) !== -1) return json_({ ok: true, orderId: o.orderId, duplicate: true });
    }

    const waktu = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
    const items = o.items.map(function (i) {
      return { nama: safe_(i.nama), harga: num_(i.harga), qty: num_(i.qty), subtotal: num_(i.subtotal) };
    });
    const ringkasan = items.map(function (i) { return i.qty + 'x ' + i.nama; }).join('; ');

    shPesanan.appendRow([
      waktu,
      safe_(o.orderId),
      safe_(o.nama),
      "'" + String(o.whatsapp || '').replace(/[^0-9+]/g, ''),   // tanda ' supaya angka 0 di depan tidak hilang
      safe_(o.alamat),
      safe_(o.catatan),
      safe_(o.pembayaran),
      ringkasan,
      num_(o.subtotal),
      safe_(o.kodePromo),
      num_(o.diskon),
      num_(o.total)
    ]);

    items.forEach(function (i) {
      shDetail.appendRow([waktu, safe_(o.orderId), safe_(o.nama), i.nama, i.harga, i.qty, i.subtotal]);
    });

    return json_({ ok: true, orderId: o.orderId });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

// Buka URL Web App di browser -> harus muncul {"ok":true,...} kalau deploy berhasil
function doGet() {
  return json_({ ok: true, message: 'Geprekin API aktif' });
}

/* ---------- helper ---------- */

function getSheet_(ss, name, header) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(header);
    sh.getRange(1, 1, 1, header.length).setFontWeight('bold').setBackground('#ffe3d3');
    sh.setFrozenRows(1);
  }
  return sh;
}

// Batasi panjang + cegah formula injection (teks yang diawali = + - @ dibuat jadi teks biasa)
function safe_(v) {
  v = String(v == null ? '' : v).slice(0, 500);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function num_(v) {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
