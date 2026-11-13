/* Stackly home - products, cart, wishlist, animations */
const $ = (s, e = document) => e.querySelector(s), $$ = (s, e = document) => [...e.querySelectorAll(s)];
const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const money = n => '$' + n.toFixed(2);
const label = c => c.replace(/-/g, ' ');
const stars = r => Array.from({ length: 5 }, (_, i) => `<i class="fa-${r >= i + .5 ? 'solid' : 'regular'} fa-star"></i>`).join('');
const PH = 'images/product-placeholder.webp';
const CATIMG = { 'womens-dresses': 'cat-dresses', 'mens-shirts': 'cat-shirts', 'womens-shoes': 'cat-shoes', 'womens-bags': 'cat-bags', 'womens-jewellery': 'cat-jewellery', 'sunglasses': 'cat-eyewear' };
const COUPONS = { SAVE10: { t: 'pct', v: 10 }, STYLE20: { t: 'pct', v: 20, min: 100 }, FREESHIP: { t: 'ship' } };

let all = [], pool = [], cart = ls('sl_cart', {}), wish = ls('sl_wish', []), coupon = ls('sl_coupon', null);
let st = { cat: 'all', sort: '', n: 8 }, timer;

/* ---------- helpers ---------- */
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2400); }
const cardHTML = p => {
  const w = wish.includes(p.id);
  return `<article class="card" data-id="${p.id}"><div class="ph" data-view="${p.id}"><img src="${p.thumbnail}" alt="${p.title}" loading="lazy" onerror="this.onerror=null;this.src='${PH}'"><button class="wl ${w ? 'on' : ''}" data-wl="${p.id}" aria-label="Wishlist"><i class="fa-${w ? 'solid' : 'regular'} fa-heart"></i></button><button class="qv" data-view="${p.id}">Quick view</button></div><div class="info"><small>${label(p.category)}</small><h3 data-view="${p.id}">${p.title}</h3><div class="row"><span class="price">${money(p.price)}</span><span class="rt">${stars(p.rating)}<b>${p.rating.toFixed(1)}</b></span></div><button class="add" data-add="${p.id}"><i class="fa-solid fa-bag-shopping"></i> Add to bag</button></div></article>`;
};
const find = id => all.find(p => p.id == id);

/* ---------- render ---------- */
function renderMosaic() {
  $('#mosaic').innerHTML = CATS.map((c, i) => `<button class="tile" data-cat="${c}" data-aos="fade-up" data-aos-delay="${(i % 3) * 100}"><img src="images/${CATIMG[c]}.webp" alt="${label(c)}" loading="lazy"><div class="cap"><div><small>0${i + 1}</small><h3 class="serif" style="text-transform:capitalize">${label(c)}</h3></div><span class="go"><i class="fa-solid fa-arrow-right"></i></span></div></button>`).join('');
}
function renderChips() {
  $('#chips').innerHTML = ['all', ...CATS].map(c => `<button class="chip ${st.cat === c ? 'on' : ''}" data-chip="${c}">${label(c)}</button>`).join('');
}
function renderRail() {
  const list = [...all].sort((a, b) => new Date(b.meta?.createdAt || 0) - new Date(a.meta?.createdAt || 0)).slice(0, 10);
  $('#rail').innerHTML = list.map(cardHTML).join('');
}
function renderGrid(anim = true) {
  let l = pool.filter(p => st.cat === 'all' || p.category === st.cat);
  if (st.sort === 'pa') l.sort((a, b) => a.price - b.price);
  else if (st.sort === 'pd') l.sort((a, b) => b.price - a.price);
  else l.sort((a, b) => b.rating - a.rating);
  const g = $('#grid'), shown = l.slice(0, st.n);
  g.innerHTML = shown.length ? shown.map(cardHTML).join('') : `<div class="state"><i class="fa-regular fa-face-frown"></i><p>No products found. Try another search or category.</p></div>`;
  $('#more').parentElement.style.display = l.length > st.n ? '' : 'none';
  if (anim && window.gsap) gsap.from('#grid .card', { y: 50, opacity: 0, duration: .6, stagger: .06, ease: 'power3.out', clearProps: 'all' });
  window.ScrollTrigger && ScrollTrigger.refresh();
}
function skeleton() { $('#grid').innerHTML = Array(8).fill('<div class="sk"></div>').join(''); $('#rail').innerHTML = Array(4).fill('<div class="sk" style="flex:0 0 250px"></div>').join(''); }
function errorState(e) {
  $('#grid').innerHTML = `<div class="state"><i class="fa-solid fa-triangle-exclamation"></i><p>Could not load products. ${e.message}</p><button class="btn" id="retry">Try again</button></div>`;
  $('#rail').innerHTML = '';
}
async function load() {
  skeleton();
  try { all = await fetchProducts(); pool = all; renderRail(); renderGrid(); }
  catch (e) { errorState(e); }
}

/* ---------- cart / wishlist ---------- */
function totals() {
  const sub = Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0);
  const c = coupon && COUPONS[coupon];
  let disc = 0, ship = sub > 0 && sub < 150 ? 9.99 : 0;
  if (c) { if (c.t === 'pct' && (!c.min || sub >= c.min)) disc = sub * c.v / 100; if (c.t === 'ship') ship = 0; }
  return { sub, disc, ship, total: Math.max(0, sub - disc + ship) };
}
function sync() {
  save('sl_cart', cart); save('sl_wish', wish); save('sl_coupon', coupon);
  $('#cc').textContent = Object.values(cart).reduce((s, i) => s + i.qty, 0);
  $('#wc').textContent = wish.length;
  $$('.wl').forEach(b => { const on = wish.includes(+b.dataset.wl); b.classList.toggle('on', on); b.innerHTML = `<i class="fa-${on ? 'solid' : 'regular'} fa-heart"></i>`; });
  if ($('#drawer').dataset.mode === 'cart') drawCart();
  if ($('#drawer').dataset.mode === 'wish') drawWish();
}
function addCart(id) {
  const p = find(id) || pool.find(x => x.id == id); if (!p) return;
  cart[id] = cart[id] ? { ...cart[id], qty: cart[id].qty + 1 } : { id: p.id, title: p.title, price: p.price, img: p.thumbnail, qty: 1 };
  sync(); toast('Added to your bag');
  gsap.fromTo('#cb', { scale: 1.3 }, { scale: 1, duration: .5, ease: 'elastic.out(1,.5)' });
}
function drawCart() {
  const items = Object.values(cart), t = totals();
  $('#dt').textContent = 'Your bag';
  $('#db').innerHTML = items.length ? items.map(i => `<div class="ci"><img src="${i.img}" alt="${i.title}" onerror="this.src='${PH}'"><div><h4>${i.title}</h4><small>${money(i.price)}</small><div class="qt"><button data-q="${i.id}" data-d="-1" aria-label="Decrease"><i class="fa-solid fa-minus"></i></button><b>${i.qty}</b><button data-q="${i.id}" data-d="1" aria-label="Increase"><i class="fa-solid fa-plus"></i></button></div></div><button class="rm" data-rm="${i.id}" aria-label="Remove"><i class="fa-regular fa-trash-can"></i></button></div>`).join('') : `<div class="empty"><i class="fa-solid fa-bag-shopping"></i><p>Your bag is empty.</p></div>`;
  $('#df').innerHTML = items.length ? `<div class="cp"><input id="cin" placeholder="Coupon code" maxlength="15" autocomplete="off" aria-describedby="cerr" value="${coupon || ''}"><button class="btn" id="capply">Apply</button>${coupon ? '<button class="btn cp-rm" id="crm" aria-label="Remove coupon">Remove</button>' : ''}</div><p class="cerr" id="cerr" role="alert" aria-live="polite"></p><div class="tr"><span>Subtotal</span><b>${money(t.sub)}</b></div>${t.disc ? `<div class="tr"><span>Discount (${coupon})</span><b>-${money(t.disc)}</b></div>` : ''}<div class="tr"><span>Shipping</span><b>${t.ship ? money(t.ship) : 'Free'}</b></div><div class="tr t"><span>Total</span><span>${money(t.total)}</span></div><button class="btn" id="checkout">Checkout <i class="fa-solid fa-arrow-right"></i></button>` : '';
}
function drawWish() {
  const items = wish.map(find).filter(Boolean);
  $('#dt').textContent = 'Wishlist';
  $('#db').innerHTML = items.length ? items.map(p => `<div class="ci"><img src="${p.thumbnail}" alt="${p.title}" onerror="this.src='${PH}'"><div><h4>${p.title}</h4><small>${money(p.price)}</small><button class="wadd" data-add="${p.id}">Add to bag</button></div><button class="rm" data-wl="${p.id}" aria-label="Remove"><i class="fa-regular fa-trash-can"></i></button></div>`).join('') : `<div class="empty"><i class="fa-regular fa-heart"></i><p>Your wishlist is empty.</p></div>`;
  $('#df').innerHTML = '';
}
function openDrawer(mode) { $('#drawer').dataset.mode = mode; mode === 'cart' ? drawCart() : drawWish(); $('#drawer').classList.add('on'); $('#ov').classList.add('on'); lenis.stop(); }
function closeAll() { $('#drawer').classList.remove('on'); $('#modal').classList.remove('on'); $('#ov').classList.remove('on'); $('#drawer').dataset.mode = ''; lenis.start(); }

async function openProduct(id) {
  const m = $('#mb'); m.innerHTML = '<div class="state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading details...</p></div>';
  $('#modal').classList.add('on'); $('#ov').classList.add('on'); lenis.stop();
  try {
    const p = await fetchProduct(id), imgs = p.images?.length ? p.images : [p.thumbnail];
    if (!find(p.id)) all.push(p);
    m.innerHTML = `<div class="pm"><div><div class="main"><img id="mi" src="${imgs[0]}" alt="${p.title}" onerror="this.src='${PH}'"></div><div class="th">${imgs.map(u => `<img src="${u}" alt="" data-th="${u}">`).join('')}</div></div><div><span class="eyebrow">${label(p.category)}</span><h2>${p.title}</h2><div class="row"><span class="price">${money(p.price)}</span><span class="rt">${stars(p.rating)}<b>${p.rating.toFixed(1)}</b></span></div><p>${p.description}</p><div class="meta"><span><i class="fa-solid fa-tag"></i> ${p.brand || 'Stackly'}</span><span><i class="fa-solid fa-box"></i> ${p.availabilityStatus || 'In Stock'}</span><span><i class="fa-solid fa-truck"></i> ${p.shippingInformation || 'Ships soon'}</span></div><div class="cta"><button class="btn" data-add="${p.id}"><i class="fa-solid fa-bag-shopping"></i> Add to bag</button><button class="btn out" data-wl="${p.id}"><i class="fa-regular fa-heart"></i> Wishlist</button></div></div></div>`;
  } catch (e) { m.innerHTML = `<div class="state"><i class="fa-solid fa-triangle-exclamation"></i><p>${e.message}</p></div>`; }
}
function checkout() {
  const t = totals(), items = Object.values(cart), id = 'SL' + Date.now().toString().slice(-7);
  const orders = ls('sl_orders', []); orders.push({ id, items, ...t, coupon, date: new Date().toISOString() }); save('sl_orders', orders);
  cart = {}; coupon = null; sync(); $('#drawer').classList.remove('on');
  $('#mb').innerHTML = `<div class="ok"><i class="fa-solid fa-circle-check"></i><h2 class="serif">Order confirmed</h2><p>Thank you! Your order <b>${id}</b> is on its way.</p><ul>${items.map(i => `<li><span>${i.title} x ${i.qty}</span><b>${money(i.price * i.qty)}</b></li>`).join('')}<li><span>Total paid</span><b>${money(t.total)}</b></li></ul><button class="btn" data-close>Continue shopping</button></div>`;
  $('#modal').classList.add('on'); $('#ov').classList.add('on');
}

/* ---------- coupon validation ---------- */
function couponMsg(text, type) {
  const m = $('#cerr'), i = $('#cin');
  if (m) { m.textContent = text; m.className = 'cerr ' + (type || ''); }
  if (i) {
    i.classList.toggle('bad', type === 'err');
    if (type === 'err') { i.classList.remove('shake'); void i.offsetWidth; i.classList.add('shake'); i.focus(); }
  }
}
function validateCoupon(raw) {
  const v = String(raw || '').trim().toUpperCase();
  if (!v) return { ok: false, msg: 'Please enter a coupon code' };
  if (v.length < 3) return { ok: false, msg: 'Coupon code is too short' };
  if (!/^[A-Z0-9]+$/.test(v)) return { ok: false, msg: 'Use letters and numbers only, no spaces or symbols' };
  if (!Object.keys(cart).length) return { ok: false, msg: 'Your bag is empty. Add items before applying a coupon' };
  const c = COUPONS[v];
  if (!c) return { ok: false, msg: '"' + v + '" is not a valid coupon code' };
  if (coupon === v) return { ok: false, msg: v + ' is already applied' };
  const sub = totals().sub;
  if (c.min && sub < c.min) return { ok: false, msg: 'Spend ' + money(c.min) + ' or more to use ' + v + ' (add ' + money(c.min - sub) + ' more)' };
  return { ok: true, code: v };
}
function applyCoupon(raw) {
  const r = validateCoupon(raw);
  if (!r.ok) { couponMsg(r.msg, 'err'); toast(r.msg); return false; }
  coupon = r.code; sync(); couponMsg(r.code + ' applied successfully', 'ok'); toast(r.code + ' applied');
  return true;
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const t = e.target, $c = s => t.closest(s);
  let el;
  if (el = $c('[data-wl]')) { const id = +el.dataset.wl; wish = wish.includes(id) ? wish.filter(x => x !== id) : [...wish, id]; sync(); toast(wish.includes(id) ? 'Saved to wishlist' : 'Removed from wishlist'); return; }
  if (el = $c('[data-add]')) return addCart(+el.dataset.add);
  if (el = $c('[data-view]')) return openProduct(el.dataset.view);
  if (el = $c('[data-q]')) { const i = cart[el.dataset.q]; i.qty += +el.dataset.d; if (i.qty < 1) delete cart[el.dataset.q]; return sync(); }
  if (el = $c('[data-rm]')) { delete cart[el.dataset.rm]; return sync(); }
  if (el = $c('[data-th]')) { $('#mi').src = el.dataset.th; return; }
  if (el = $c('[data-code]')) { const c = el.dataset.code; navigator.clipboard?.writeText(c).catch(() => {}); const r = validateCoupon(c); if (r.ok) { coupon = c; sync(); return toast('Code ' + c + ' copied and applied'); } return toast(r.msg.includes('already') ? 'Code ' + c + ' copied, already applied' : 'Code ' + c + ' copied. ' + r.msg); }
  if (el = $c('[data-cat]')) { e.preventDefault(); st = { ...st, cat: el.dataset.cat, n: 8 }; renderChips(); renderGrid(); return lenis.scrollTo('#trending', { offset: -70 }); }
  if (el = $c('[data-chip]')) { st = { ...st, cat: el.dataset.chip, n: 8 }; renderChips(); return renderGrid(); }
  if (el = $c('[data-go]')) { e.preventDefault(); closeMenu(); return goTo(el.getAttribute('href')); }
  if ($c('[data-close]') || t.id === 'ov' || t.id === 'modal') return closeAll();
  if ($c('#cb')) { closeMenu(); return openDrawer('cart'); }
  if ($c('#wb')) { closeMenu(); return openDrawer('wish'); }
  if ($c('#more')) { st.n += 8; return renderGrid(false); }
  if ($c('#retry')) return load();
  if ($c('#checkout')) return checkout();
  if ($c('#login')) { closeMenu(); return toast('Login is coming soon'); }
  if ($c('#capply')) return applyCoupon($('#cin').value);
  if ($c('#crm')) { coupon = null; sync(); return toast('Coupon removed'); }
  if ($c('#prev')) return $('#rail').scrollBy({ left: -300, behavior: 'smooth' });
  if ($c('#next')) return $('#rail').scrollBy({ left: 300, behavior: 'smooth' });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') return closeAll(); if (e.key === 'Enter' && e.target.id === 'cin') { e.preventDefault(); applyCoupon(e.target.value); } });
$('#sort').onchange = e => { st.sort = e.target.value; renderGrid(); };
$('#q').oninput = e => {
  clearTimeout(timer); const q = e.target.value.trim();
  timer = setTimeout(async () => {
    st.n = 8;
    if (!q) { pool = all; return renderGrid(); }
    $('#grid').innerHTML = '<div class="state"><i class="fa-solid fa-spinner fa-spin"></i><p>Searching...</p></div>';
    try { pool = await searchProducts(q); pool.forEach(p => { if (!find(p.id)) all.push(p); }); renderGrid(); }
    catch (err) { errorState(err); }
  }, 350);
};
$('#nlf').onsubmit = e => {
  e.preventDefault(); const i = $('#nle'), v = i.value.trim(), m = $('#nlm');
  const fail = msg => { m.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ' + msg; m.classList.add('on'); i.classList.add('err'); i.focus(); };
  if (!v) return fail('Please enter your email address.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return fail('Please enter a valid email address, e.g. name@example.com.');
  const l = ls('sl_news', []); l.push(v); save('sl_news', l);
  markBack(i); location.href = 'html/404.html';
};
$('#nle').oninput = () => { $('#nle').classList.remove('err'); $('#nlm').classList.remove('on'); };
/* mobile menu */
function closeMenu() { $('#nav').classList.remove('open'); $('#hd').classList.remove('mo'); $('#burger').innerHTML = '<i class="fa-solid fa-bars"></i>'; lenis.start(); }
$('#burger').onclick = () => {
  const o = $('#nav').classList.toggle('open'); $('#hd').classList.toggle('mo', o);
  $('#burger').innerHTML = `<i class="fa-solid fa-${o ? 'xmark' : 'bars'}"></i>`; o ? lenis.stop() : lenis.start();
  if (o) gsap.from('#nav .l, #nav .btn', { y: 50, opacity: 0, stagger: .08, delay: .25, duration: .6, clearProps: 'all' });
};
addEventListener('scroll', () => $('#hd').classList.toggle('sc', scrollY > 40), { passive: true });
addEventListener('resize', () => innerWidth > 900 && closeMenu());

/* ---------- animation ---------- */
gsap.registerPlugin(ScrollTrigger);
const lenis = new Lenis({ lerp: .09 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
AOS.init({ duration: 800, once: true, offset: 60 });
$('#mq').innerHTML += $('#mq').innerHTML;
lenis.stop();

function intro() {
  gsap.timeline()
    .to('#pre', { yPercent: -100, duration: .9, ease: 'power4.inOut' })
    .from('.logo,.ib,.burger,#nav .l,#nav .btn', { y: -24, opacity: 0, stagger: .07, duration: .6, clearProps: 'all' }, '-=.3')
    .from('.hero .eyebrow', { opacity: 0, y: 20, duration: .6 }, '-=.4')
    
    .from('.hl .c', { yPercent: 130, rotate: 10, opacity: 0, duration: .9, stagger: .035, ease: 'power4.out', clearProps: 'all' }, '-=.4')
    .from('.hero p,.cta', { y: 30, opacity: 0, stagger: .12, duration: .8, clearProps: 'all' }, '-=.6')
    
    .from('.stage', { opacity: 0, scale: .9, y: 60, duration: 1.3, ease: 'power3.out', clearProps: 'all' }, '-=1.1')
    .from('.hf li', { y: 20, opacity: 0, stagger: .1, duration: .6, clearProps: 'all' }, '-=.6')
    .add(run)
    .add(() => { $('#pre').style.display = 'none'; lenis.start(); introDone = true; restore(); });
}
function scrollFX() {
  $$('.rv').forEach(h => gsap.from(h, { y: 70, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));
  gsap.to('.hero-t', { yPercent: -10, opacity: .35, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.stage', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.mq .t', { skewX: -6, scrollTrigger: { trigger: '.mq', scrub: .5 } });
  gsap.from('.tile', { clipPath: 'inset(100% 0 0 0)', stagger: .12, duration: 1.1, ease: 'power4.out', scrollTrigger: { trigger: '#mosaic', start: 'top 80%' } });
  gsap.from('#rail .card', { x: 120, opacity: 0, stagger: .08, duration: .8, scrollTrigger: { trigger: '#rail', start: 'top 85%' } });
  gsap.to('.ab-img img', { yPercent: 8, scale: 1.1, scrollTrigger: { trigger: '.about', scrub: true } });
  gsap.from('.fgrid > div', { y: 40, opacity: 0, stagger: .12, scrollTrigger: { trigger: '.fgrid', start: 'top 90%' } });
  $$('.mag').forEach(b => { b.onmousemove = e => { const r = b.getBoundingClientRect(); gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * .25, y: (e.clientY - r.top - r.height / 2) * .35, duration: .3 }); }; b.onmouseleave = () => gsap.to(b, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,.4)' }); });
}

renderMosaic(); renderChips(); sync(); scrollFX();
load().finally(() => { ScrollTrigger.refresh(); AOS.refresh(); loaded = true; restore(); });
/* preloader counter */
const c = { v: 0 };
gsap.to(c, { v: 100, duration: 1.6, ease: 'power1.inOut', onUpdate: () => { $('#cnt').textContent = Math.round(c.v) + '%'; $('#barf').style.width = c.v + '%'; }, onComplete: intro });

addEventListener('scroll', () => $('#hd').classList.toggle('sc', scrollY > 40), { passive: true }); $('#hd').classList.toggle('sc', scrollY > 40);

/* ---------- hero: stacked lookbook ---------- */
function split(el) {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  nodes.forEach(n => {
    const f = document.createDocumentFragment();
    n.textContent.split(/(\s+)/).forEach(tok => {
      if (!tok) return; if (/^\s+$/.test(tok)) return f.append(' ');
      const wd = document.createElement('span'); wd.className = 'wd';
      [...tok].forEach(ch => { const s = document.createElement('span'); s.className = 'c'; s.textContent = ch; wd.append(s); }); f.append(wd);
    }); n.replaceWith(f);
  });
}
$$('.hl').forEach(split);
const looks = [{ c: 'Outerwear', t: 'Coats & layers' }, { c: 'Street', t: 'Leather edit' }, { c: 'Colour', t: 'Active tones' }, { c: 'Evening', t: 'Red dress edit' }];
const cds = $$('.cd'); let ord = cds.map((_, i) => i), busy = false, auto;
const pos = p => ({ xPercent: p * 14, rotation: p * 5, scale: 1 - p * .07, opacity: p < 3 ? 1 : 0, '--d': p * .28, zIndex: 10 - p });
gsap.set(cds, { transformOrigin: '0% 100%' }); ord.forEach((ci, p) => gsap.set(cds[ci], pos(p)));
function caption(ci) {
  const l = looks[ci];
  gsap.timeline().to('#lt,#lc', { yPercent: -110, duration: .25, ease: 'power2.in' })
    .add(() => { $('#li').textContent = String(ci + 1).padStart(2, '0'); $('#lt').textContent = l.t; $('#lc').textContent = l.c; })
    .fromTo('#lt,#lc', { yPercent: 110 }, { yPercent: 0, duration: .55, ease: 'power3.out' });
}
function run() { auto && auto.kill(); auto = gsap.fromTo('#lbar', { scaleX: 0 }, { scaleX: 1, duration: 4.8, ease: 'none', onComplete: () => go(1) }); }
function go(d) {
  if (busy) return; busy = true; auto && auto.kill();
  const fin = () => { busy = false; run(); };
  if (d > 0) {
    const f = ord[0], nxt = [...ord.slice(1), f];
    nxt.forEach((ci, p) => ci !== f && gsap.to(cds[ci], { ...pos(p), duration: .9, delay: .15, ease: 'power3.out' }));
    ord = nxt; caption(ord[0]);
    gsap.to(cds[f], { xPercent: -130, rotation: -16, opacity: 0, duration: .7, ease: 'power3.in', onComplete: () => { gsap.set(cds[f], pos(3)); fin(); } });
  } else {
    const b = ord[3], nxt = [b, ...ord.slice(0, 3)];
    gsap.set(cds[b], { xPercent: -130, rotation: -16, opacity: 0, scale: 1, '--d': 0, zIndex: 20 });
    nxt.forEach((ci, p) => gsap.to(cds[ci], { ...pos(p), duration: .9, ease: 'power3.out', onComplete: p === 0 ? fin : null }));
    ord = nxt; caption(ord[0]);
  }
}
$('#lnx').onclick = () => go(1); $('#lp').onclick = () => go(-1);
const stage = $('#stage');
stage.addEventListener('mouseenter', () => auto && auto.pause()); stage.addEventListener('mouseleave', () => { auto && auto.resume(); gsap.to('#cards', { rotationX: 0, rotationY: 0, duration: .8 }); });
stage.addEventListener('mousemove', e => { const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; gsap.to('#cards', { rotationY: x * 12, rotationX: -y * 9, transformPerspective: 1000, duration: .6 }); });
let sx = null; stage.addEventListener('pointerdown', e => (sx = e.clientX));
addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); else if (e.target.closest && e.target.closest('.cd') === cds[ord[0]]) go(1); });

/* smooth, self-correcting section navigation */
function goTo(sel) {
  const t = $(sel); if (!t) return; const off = sel === '#home' ? 0 : -60;
  lenis.scrollTo(t, { offset: off, duration: 1.2, onComplete: () => { if (Math.abs(t.getBoundingClientRect().top + off) > 4) lenis.scrollTo(t, { offset: off, immediate: true }); } });
}
/* remember the section the visitor left from, so the 404 page can send them back to it */
function markBack(el) { const s = el.closest('section,footer'); try { sessionStorage.setItem('sl_back', (s && s.id) || 'home'); } catch {} }
document.addEventListener('click', e => { const a = e.target.closest('a[href$="404.html"]'); if (a) markBack(a); }, true);
let back = null, introDone = false, loaded = false;
try { back = sessionStorage.getItem('sl_back'); sessionStorage.removeItem('sl_back'); } catch {}
function restore() {
  if (!back || !introDone) return;
  if (back !== 'home') lenis.scrollTo('#' + back, { immediate: true, offset: -60 });
  if (loaded) back = null;
}

document.addEventListener('input', e => { if (e.target.id === 'cin') couponMsg('', ''); });