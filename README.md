# Geprekin - Website Pemesanan Ayam Geprek

Website statis (HTML + CSS + JavaScript murni) untuk memesan ayam geprek. Ada katalog 7 menu, keranjang, checkout, dan pesanan yang otomatis masuk ke **Google Sheets** (bisa diunduh sebagai Excel `.xlsx`), plus pelacakan **Google Analytics 4**. Bisa langsung di-deploy ke **GitHub Pages**.

## Struktur File

| File | Fungsi |
|---|---|
| `index.html` | Beranda |
| `tentang.html` | Tentang kami |
| `produk.html` | Daftar 7 menu + tombol tambah ke keranjang |
| `keranjang.html` | Keranjang (ubah jumlah, hapus, kode promo) |
| `checkout.html` | Form data pemesan, kirim pesanan |
| `faq.html` | Pertanyaan umum |
| `style.css` | Seluruh tampilan (font Baloo 2 + Plus Jakarta Sans) |
| `app.js` | Katalog, keranjang, checkout |
| `config.js` | **Tempat menempel URL Google Apps Script (`SHEET_URL`) dan ID Google Analytics (`GA_ID`)** |
| `apps-script/Code.gs` | Kode yang ditempel ke Google Sheets |

## Alur Pemesanan

Produk → **Tambah ke Keranjang** → Keranjang (atur jumlah, kode promo `GEPREKIN10` = diskon 10%) → **Checkout** (nama, WhatsApp, alamat, pembayaran) → data masuk ke Google Sheets.

Mengubah menu atau harga: edit array `PRODUCTS` di bagian atas `app.js`. Semua halaman ikut berubah.

## Sambungkan ke Google Sheets

GitHub Pages hanya bisa menyajikan file statis, jadi data pesanan dikirim ke Google Apps Script yang menuliskannya ke Sheets. Gratis, tanpa server.

1. Buka [sheets.new](https://sheets.new) lalu beri nama, misalnya `Pesanan Geprekin`.
2. Menu **Extensions → Apps Script**.
3. Hapus kode bawaan, lalu tempel seluruh isi `apps-script/Code.gs`. Klik **Save**.
4. Klik **Deploy → New deployment**, ikon roda gigi → pilih **Web app**, lalu isi:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
5. Klik **Deploy** dan izinkan akses (Google akan minta otorisasi, pilih akun → *Advanced* → *Go to … (unsafe)* → *Allow*; ini normal untuk script buatan sendiri).
6. Salin **Web app URL** (berakhiran `/exec`).
7. Buka `config.js`, tempel ke `SHEET_URL`:
   ```js
   const GEPREKIN_CONFIG = {
       SHEET_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec'
   };
   ```
8. Tes: buka URL tadi di browser, harus muncul `{"ok":true,"message":"Geprekin API aktif"}`. Lalu lakukan satu checkout di website. Sheet **Pesanan** dan **Detail Item** akan terbuat otomatis dan terisi.

> Kalau kamu mengubah `Code.gs` setelah deploy, buat versi baru: **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. URL-nya tetap sama.

**Jadi Excel:** di Google Sheets pilih **File → Download → Microsoft Excel (.xlsx)**.

## Sambungkan ke Google Analytics (GA4)

1. Buka [analytics.google.com](https://analytics.google.com) → ikon roda gigi **Admin** → **Create → Property**.
2. Isi nama `Geprekin`, time zone **Indonesia**, currency **Indonesian Rupiah (IDR)** → Next sampai selesai.
3. Saat diminta platform, pilih **Web**. Isi URL situs (contoh `https://<username>.github.io/<nama-repo>/`) dan nama stream `Geprekin` → **Create stream**.
4. Salin **Measurement ID** di pojok kanan atas (bentuknya `G-XXXXXXXXXX`).
5. Tempel ke `config.js`:
   ```js
   GA_ID: 'G-XXXXXXXXXX',
   ```
6. `git add . && git commit -m "pasang GA4" && git push`, tunggu GitHub Pages ter-update.
7. Tes: buka situs yang sudah online (bukan localhost), lalu di Analytics buka **Reports → Realtime**. Kunjunganmu harus muncul dalam beberapa detik.

Event yang dikirim otomatis:

| Aksi di website | Event GA4 |
|---|---|
| Buka tiap halaman | `page_view` (otomatis dari GA) |
| Buka halaman Produk | `view_item_list` |
| Klik "+ Keranjang" | `add_to_cart` |
| Hapus item dari keranjang | `remove_from_cart` |
| Buka halaman Keranjang | `view_cart` |
| Buka halaman Checkout | `begin_checkout` |
| Pesanan berhasil terkirim | `purchase` (ID pesanan, total, kode promo, daftar menu) |

Laporan penjualan ada di **Reports → Monetization → Ecommerce purchases**. Data biasanya baru muncul di laporan biasa setelah beberapa jam; **Realtime** yang paling cepat.

- Analytics **tidak aktif** kalau `GA_ID` kosong, dan juga tidak aktif saat situs dibuka lewat `localhost` atau file langsung, supaya data tes tidak mengotori laporan. Untuk ngetes lewat localhost, set `GA_TRACK_LOCAL: true` sementara.
- Nama, nomor WhatsApp, dan alamat pelanggan **tidak pernah dikirim ke Google Analytics**. Data itu hanya masuk ke Google Sheets kamu.
- GA memakai cookie. Kalau situs dipakai untuk usaha sungguhan, pertimbangkan memberi pemberitahuan penggunaan cookie / kebijakan privasi.

## Deploy ke GitHub Pages

```bash
git add .
git commit -m "Redesign, keranjang, checkout, dan integrasi Google Sheets"
git push origin main
```

Lalu di GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**. Tunggu 1-2 menit, situs aktif di `https://<username>.github.io/<nama-repo>/`.

## Mode Demo

Selama `SHEET_URL` di `config.js` masih kosong, checkout tetap jalan tapi pesanan hanya disimpan di browser (localStorage) dan halaman sukses menampilkan catatan "Mode demo".

## Catatan Keamanan

- URL Web App bersifat publik: siapa pun yang tahu URL-nya bisa mengirim data ke Sheet. Cukup untuk tugas/usaha kecil. Script sudah membatasi panjang teks, mencegah formula injection, dan menolak ID pesanan ganda.
- Harga dihitung di sisi browser, jadi pesanan di Sheet sebaiknya tetap dicek manual sebelum diproses.
- Jangan menaruh data rahasia (password, API key) di `config.js` karena file ini terbaca publik.

## Lisensi

Lihat file `LICENSE`.
