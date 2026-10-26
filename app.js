/* ==========================================================
   Geprekin - logika website (katalog, keranjang, checkout)
   Keranjang disimpan di localStorage yang isinya cuma
   { id, qty }. Harga selalu diambil dari katalog PRODUCTS.
   ========================================================== */

/* ---------- Katalog produk ---------- */
const PRODUCTS = [
    { id: 'original', name: 'Ayam Geprek Original', price: 25000, tag: 'Best Seller',
      desc: 'Ayam goreng tepung crispy dengan sambal bawang original.',
      emoji: '🍗', emoji2: '', bg: 'linear-gradient(135deg,#ffb703,#fb8500)' },
    { id: 'pedas', name: 'Ayam Geprek Pedas', price: 28000, tag: 'Pedas',
      desc: 'Ayam goreng tepung crispy dengan sambal pedas special.',
      emoji: '🍗', emoji2: '🌶️', bg: 'linear-gradient(135deg,#ff7a1a,#e4391b)' },
    { id: 'keju', name: 'Ayam Geprek Keju', price: 30000, tag: 'Favorit',
      desc: 'Ayam geprek dengan topping keju mozzarella yang meleleh.',
      emoji: '🍗', emoji2: '🧀', bg: 'linear-gradient(135deg,#ffd166,#f4a300)' },
    { id: 'mozarella', name: 'Ayam Geprek Mozarella', price: 32000, tag: '',
      desc: 'Ayam geprek dengan ekstra keju mozarella sebagai topping.',
      emoji: '🍗', emoji2: '🧀', bg: 'linear-gradient(135deg,#ffc27a,#e8590c)' },
    { id: 'cheese-stick', name: 'Ayam Geprek Cheese Stick', price: 35000, tag: 'Paket',
      desc: 'Ayam geprek disajikan dengan cheese stick sebagai pendamping.',
      emoji: '🍗', emoji2: '🧀', bg: 'linear-gradient(135deg,#f9a03f,#c92a2a)' },
    { id: 'sambal-matah', name: 'Ayam Geprek Sambal Matah', price: 27000, tag: 'Segar',
      desc: 'Ayam geprek dengan sambal matah khas Bali yang segar dan aromatik.',
      emoji: '🍗', emoji2: '🌿', bg: 'linear-gradient(135deg,#a9d86e,#f08c00)' },
    { id: 'extra-pedas', name: 'Ayam Geprek Extra Pedas', price: 33000, tag: 'Level Ekstrem',
      desc: 'Untuk yang berani mencoba pedas level ekstrem dengan sambal super pedas.',
      emoji: '🍗', emoji2: '🔥', bg: 'linear-gradient(135deg,#e4391b,#7d0a0a)' }
];

const PROMOS = { GEPREKIN10: { percent: 10, label: 'Diskon 10%' } };
const MAX_QTY = 20;
const CART_KEY = 'geprekinCart';
const PROMO_KEY = 'geprekinPromo';
const ORDERS_KEY = 'geprekinOrders';

/* ---------- Helper ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const rupiah = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const findProduct = id => PRODUCTS.find(p => p.id === id);

function store(key, value) {
    try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage diblokir: abaikan */ }
}
function load(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
}

/* ---------- Google Analytics 4 ----------
   Aktif hanya kalau GA_ID di config.js diisi (format G-XXXXXXXXXX).
   Tidak mengirim data pribadi (nama, WhatsApp, alamat) ke Google. */
const GA_ID = ((typeof GEPREKIN_CONFIG !== 'undefined' && GEPREKIN_CONFIG.GA_ID) || '').trim();
const GA_LOCAL = ['localhost', '127.0.0.1', ''].includes(location.hostname);
const GA_ON = /^G-[A-Z0-9]{6,}$/.test(GA_ID) &&
              (!GA_LOCAL || (typeof GEPREKIN_CONFIG !== 'undefined' && GEPREKIN_CONFIG.GA_TRACK_LOCAL === true));

function initAnalytics() {
    if (!GA_ON) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
}
function track(name, params) { if (GA_ON && window.gtag) window.gtag('event', name, params || {}); }
const gaItems = lines => lines.map(l => ({ item_id: l.id, item_name: l.name, price: l.price, quantity: l.qty }));

/* ---------- Keranjang ---------- */
function getCart() {
    const raw = load(CART_KEY);
    if (!Array.isArray(raw)) return [];
    return raw.filter(i => i && findProduct(i.id) && Number.isInteger(i.qty) && i.qty > 0)
              .map(i => ({ id: i.id, qty: Math.min(i.qty, MAX_QTY) }));
}
function saveCart(cart) { store(CART_KEY, cart); updateBadge(); }

function addToCart(id) {
    const cart = getCart();
    const row = cart.find(i => i.id === id);
    if (row) {
        if (row.qty >= MAX_QTY) { toast('Maksimal ' + MAX_QTY + ' porsi per menu'); return; }
        row.qty++;
    } else {
        cart.push({ id, qty: 1 });
    }
    saveCart(cart);
    const p = findProduct(id);
    track('add_to_cart', { currency: 'IDR', value: p.price, items: gaItems([{ id: p.id, name: p.name, price: p.price, qty: 1 }]) });
    toast(p.name + ' masuk keranjang 🛒');
}
function changeQty(id, delta) {
    const cart = getCart();
    const row = cart.find(i => i.id === id);
    if (!row) return;
    row.qty = Math.min(MAX_QTY, row.qty + delta);
    saveCart(cart.filter(i => i.qty > 0));
}
function removeItem(id) {
    const row = getCart().find(i => i.id === id);
    if (row) {
        const p = findProduct(id);
        track('remove_from_cart', { currency: 'IDR', value: p.price * row.qty, items: gaItems([{ id: p.id, name: p.name, price: p.price, qty: row.qty }]) });
    }
    saveCart(getCart().filter(i => i.id !== id));
}
function clearCart() { store(CART_KEY, null); store(PROMO_KEY, null); updateBadge(); }

function cartLines() {
    return getCart().map(i => {
        const p = findProduct(i.id);
        return { id: p.id, name: p.name, price: p.price, qty: i.qty, subtotal: p.price * i.qty, product: p };
    });
}
function calcTotals() {
    const lines = cartLines();
    const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
    const code = load(PROMO_KEY);
    const promo = code && PROMOS[code] ? PROMOS[code] : null;
    const discount = promo ? Math.round(subtotal * promo.percent / 100) : 0;
    return { lines, subtotal, discount, total: subtotal - discount, code: promo ? code : '', promo };
}

/* ---------- UI umum ---------- */
function updateBadge() {
    const count = getCart().reduce((s, i) => s + i.qty, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = count;
        el.hidden = count === 0;
    });
}

let toastTimer;
function toast(msg) {
    let el = $('.toast');
    if (!el) {
        el = document.createElement('div');
        el.className = 'toast';
        el.setAttribute('role', 'status');
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function initNav() {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.main-nav a').forEach(a => {
        if (a.getAttribute('href') === page) a.setAttribute('aria-current', 'page');
    });
    const toggle = $('.nav-toggle');
    const nav = $('.main-nav');
    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            const open = nav.classList.toggle('open');
            toggle.setAttribute('aria-expanded', open);
        });
    }
}

/* ---------- Katalog (index & produk) ---------- */
function productCard(p) {
    return `
    <article class="product-card">
        <div class="product-visual" style="background:${p.bg}">
            <span class="product-emoji" aria-hidden="true">${p.emoji}</span>
            ${p.emoji2 ? `<span class="product-emoji-2" aria-hidden="true">${p.emoji2}</span>` : ''}
            ${p.tag ? `<span class="badge">${p.tag}</span>` : ''}
        </div>
        <div class="product-body">
            <h3>${p.name}</h3>
            <p class="product-desc">${p.desc}</p>
            <div class="product-foot">
                <span class="price">${rupiah(p.price)}</span>
                <button type="button" class="btn btn-primary btn-sm" data-add="${p.id}">+ Keranjang</button>
            </div>
        </div>
    </article>`;
}

function initCatalog() {
    const grids = [['#featured-grid', PRODUCTS.slice(0, 3)], ['#product-grid', PRODUCTS]];
    grids.forEach(([sel, list]) => {
        const grid = $(sel);
        if (grid) grid.innerHTML = list.map(productCard).join('');
    });
    if ($('#product-grid')) {
        track('view_item_list', { item_list_name: 'Menu', items: PRODUCTS.map(p => ({ item_id: p.id, item_name: p.name, price: p.price })) });
    }
    document.addEventListener('click', e => {
        const btn = e.target.closest('[data-add]');
        if (btn) addToCart(btn.dataset.add);
    });
}

/* ---------- Halaman keranjang ---------- */
function summaryHTML(t) {
    return `
        <div class="summary-row"><span>Subtotal</span><span>${rupiah(t.subtotal)}</span></div>
        ${t.discount ? `<div class="summary-row discount"><span>${t.promo.label} (${t.code})</span><span>− ${rupiah(t.discount)}</span></div>` : ''}
        <div class="summary-row total"><span>Total</span><span>${rupiah(t.total)}</span></div>`;
}

function renderCart() {
    const root = $('#cart-root');
    if (!root) return;
    const t = calcTotals();

    if (t.lines.length === 0) {
        root.innerHTML = `
            <div class="panel empty-state">
                <span class="big" aria-hidden="true">🛒</span>
                <h3>Keranjang kamu masih kosong</h3>
                <p>Yuk pilih ayam geprek favoritmu dulu.</p>
                <a href="produk.html" class="btn btn-primary">Lihat Menu</a>
            </div>`;
        return;
    }

    const items = t.lines.map(l => `
        <div class="cart-item">
            <div class="cart-thumb" style="background:${l.product.bg}" aria-hidden="true">${l.product.emoji}</div>
            <div class="cart-info">
                <h4>${l.name}</h4>
                <div class="unit">${rupiah(l.price)} / porsi</div>
            </div>
            <div class="cart-side">
                <div class="qty">
                    <button type="button" data-qty="-1" data-id="${l.id}" aria-label="Kurangi ${l.name}">−</button>
                    <span>${l.qty}</span>
                    <button type="button" data-qty="1" data-id="${l.id}" aria-label="Tambah ${l.name}">+</button>
                </div>
                <span class="line-total">${rupiah(l.subtotal)}</span>
                <button type="button" class="btn-remove" data-remove="${l.id}">Hapus</button>
            </div>
        </div>`).join('');

    root.innerHTML = `
        <div class="shop-layout">
            <div class="panel">
                <h3>Pesanan kamu</h3>
                ${items}
            </div>
            <aside class="panel">
                <h3>Ringkasan</h3>
                ${summaryHTML(t)}
                <div class="promo-box">
                    <label for="promo-input">Kode promo</label>
                    <div class="promo-row">
                        <input type="text" id="promo-input" placeholder="Masukkan kode" value="${t.code}" autocomplete="off">
                        <button type="button" class="btn btn-outline btn-sm" id="promo-apply">Pakai</button>
                    </div>
                    <div class="promo-msg ${t.code ? 'ok' : ''}" id="promo-msg">${t.code ? 'Kode promo terpasang ✔' : ''}</div>
                </div>
                <div class="summary-actions">
                    <a href="checkout.html" class="btn btn-primary btn-block">Lanjut ke Checkout</a>
                    <a href="produk.html" class="btn btn-outline btn-block">Tambah Menu Lain</a>
                </div>
            </aside>
        </div>`;
}

function initCartPage() {
    const root = $('#cart-root');
    if (!root) return;
    renderCart();
    const vt = calcTotals();
    if (vt.lines.length) track('view_cart', { currency: 'IDR', value: vt.subtotal, items: gaItems(vt.lines) });
    root.addEventListener('click', e => {
        const q = e.target.closest('[data-qty]');
        const r = e.target.closest('[data-remove]');
        if (q) { changeQty(q.dataset.id, parseInt(q.dataset.qty, 10)); renderCart(); }
        else if (r) { removeItem(r.dataset.remove); renderCart(); }
        else if (e.target.id === 'promo-apply') applyPromo();
    });
    root.addEventListener('keydown', e => {
        if (e.target.id === 'promo-input' && e.key === 'Enter') { e.preventDefault(); applyPromo(); }
    });
}

function applyPromo() {
    const code = $('#promo-input').value.trim().toUpperCase();
    if (!code) { store(PROMO_KEY, null); renderCart(); return; }
    if (!PROMOS[code]) {
        const msg = $('#promo-msg');
        msg.textContent = 'Kode promo tidak valid';
        msg.className = 'promo-msg err';
        return;
    }
    store(PROMO_KEY, code);
    renderCart();
}

/* ---------- Checkout ---------- */
function newOrderId() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `GP-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${rand}`;
}

async function sendOrder(order) {
    const url = (typeof GEPREKIN_CONFIG !== 'undefined' && GEPREKIN_CONFIG.SHEET_URL || '').trim();
    if (!url) {
        // MODE DEMO: simpan lokal saja
        const list = load(ORDERS_KEY) || [];
        list.push(order);
        store(ORDERS_KEY, list);
        return { demo: true };
    }
    // Body string => Content-Type text/plain, jadi tidak ada preflight CORS ke Apps Script
    const res = await fetch(url, { method: 'POST', body: JSON.stringify(order) });
    if (!res.ok) throw new Error('Server membalas status ' + res.status);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Gagal menyimpan pesanan');
    return { demo: false };
}

function initCheckoutPage() {
    const root = $('#checkout-root');
    if (!root) return;
    const t = calcTotals();

    if (t.lines.length === 0) {
        root.innerHTML = `
            <div class="panel empty-state">
                <span class="big" aria-hidden="true">🛒</span>
                <h3>Belum ada yang di-checkout</h3>
                <p>Keranjang kamu kosong. Pilih menu dulu ya.</p>
                <a href="produk.html" class="btn btn-primary">Lihat Menu</a>
            </div>`;
        return;
    }

    const mini = t.lines.map(l =>
        `<div class="mini-item"><span>${l.qty}× ${l.name}</span><span>${rupiah(l.subtotal)}</span></div>`).join('');

    root.innerHTML = `
        <div class="shop-layout">
            <form class="panel" id="checkout-form" novalidate>
                <h3>Data pemesan</h3>
                <div class="form-error" id="form-error" role="alert"></div>
                <div class="form-grid">
                    <div class="field">
                        <label for="nama">Nama lengkap <span class="req">*</span></label>
                        <input type="text" id="nama" name="nama" maxlength="80" autocomplete="name" required>
                    </div>
                    <div class="field">
                        <label for="wa">Nomor WhatsApp <span class="req">*</span></label>
                        <input type="tel" id="wa" name="wa" maxlength="16" inputmode="tel" autocomplete="tel" placeholder="08xxxxxxxxxx" required>
                        <div class="hint">Dipakai untuk konfirmasi pesanan.</div>
                    </div>
                    <div class="field">
                        <label for="alamat">Alamat pengiriman <span class="req">*</span></label>
                        <textarea id="alamat" name="alamat" maxlength="300" autocomplete="street-address" required></textarea>
                    </div>
                    <div class="field">
                        <label for="pembayaran">Metode pembayaran <span class="req">*</span></label>
                        <select id="pembayaran" name="pembayaran" required>
                            <option value="">Pilih metode…</option>
                            <option>Tunai (COD)</option>
                            <option>Transfer Bank</option>
                            <option>GoPay</option>
                            <option>OVO</option>
                            <option>Dana</option>
                        </select>
                    </div>
                    <div class="field">
                        <label for="catatan">Catatan (opsional)</label>
                        <textarea id="catatan" name="catatan" maxlength="200" placeholder="Contoh: sambal dipisah"></textarea>
                    </div>
                </div>
                <div class="summary-actions">
                    <button type="submit" class="btn btn-primary btn-block" id="submit-btn">Pesan Sekarang</button>
                    <a href="keranjang.html" class="btn btn-outline btn-block">Kembali ke Keranjang</a>
                </div>
            </form>
            <aside class="panel">
                <h3>Ringkasan pesanan</h3>
                <div class="mini-items">${mini}</div>
                ${summaryHTML(t)}
            </aside>
        </div>`;

    track('begin_checkout', { currency: 'IDR', value: t.total, coupon: t.code || undefined, items: gaItems(t.lines) });

    const form = $('#checkout-form');
    const errBox = $('#form-error');
    const btn = $('#submit-btn');

    const showError = msg => { errBox.textContent = msg; errBox.classList.add('show'); errBox.scrollIntoView({ block: 'center', behavior: 'smooth' }); };

    form.addEventListener('submit', async e => {
        e.preventDefault();
        errBox.classList.remove('show');

        const nama = form.nama.value.trim();
        const wa = form.wa.value.replace(/[\s-]/g, '');
        const alamat = form.alamat.value.trim();
        const pembayaran = form.pembayaran.value;
        const catatan = form.catatan.value.trim();

        if (nama.length < 2) return showError('Nama lengkap wajib diisi.');
        if (!/^(\+62|62|0)8[0-9]{8,12}$/.test(wa)) return showError('Nomor WhatsApp tidak valid. Contoh: 081234567890');
        if (alamat.length < 10) return showError('Alamat pengiriman terlalu singkat, tulis yang lengkap ya.');
        if (!pembayaran) return showError('Pilih metode pembayaran dulu.');

        const cur = calcTotals(); // hitung ulang saat submit
        if (cur.lines.length === 0) return showError('Keranjang kosong.');

        const order = {
            orderId: newOrderId(),
            nama, whatsapp: wa, alamat, catatan, pembayaran,
            items: cur.lines.map(l => ({ id: l.id, nama: l.name, harga: l.price, qty: l.qty, subtotal: l.subtotal })),
            subtotal: cur.subtotal, kodePromo: cur.code, diskon: cur.discount, total: cur.total
        };

        btn.disabled = true;
        btn.textContent = 'Mengirim pesanan…';
        try {
            const result = await sendOrder(order);
            clearCart();
            track('purchase', {
                transaction_id: order.orderId, currency: 'IDR', value: order.total,
                coupon: order.kodePromo || undefined, shipping: 0,
                items: order.items.map(i => ({ item_id: i.id, item_name: i.nama, price: i.harga, quantity: i.qty }))
            });
            showSuccess(root, order, result.demo);
        } catch (err) {
            btn.disabled = false;
            btn.textContent = 'Pesan Sekarang';
            showError('Pesanan belum terkirim (' + err.message + '). Cek koneksi internet lalu coba lagi. Keranjang kamu masih aman.');
        }
    });
}

function showSuccess(root, order, demo) {
    root.innerHTML = `
        <div class="panel success-card">
            <span class="big" aria-hidden="true">🎉</span>
            <h3>Pesanan diterima!</h3>
            <div class="order-id"></div>
            <p>Terima kasih, <strong class="who"></strong>. Total pesanan kamu <strong>${rupiah(order.total)}</strong>.</p>
            <p>Kami akan menghubungi nomor WhatsApp kamu untuk konfirmasi.</p>
            ${demo ? '<div class="demo-note">Mode demo: Google Sheets belum disambungkan, pesanan hanya tersimpan di browser ini.</div>' : ''}
            <div class="summary-actions">
                <a href="produk.html" class="btn btn-primary">Pesan Lagi</a>
                <a href="index.html" class="btn btn-outline">Ke Beranda</a>
            </div>
        </div>`;
    $('.order-id', root).textContent = order.orderId;
    $('.who', root).textContent = order.nama;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Start ---------- */
document.addEventListener('DOMContentLoaded', () => {
    initAnalytics();
    initNav();
    updateBadge();
    initCatalog();
    initCartPage();
    initCheckoutPage();
});
