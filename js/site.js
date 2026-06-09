/* =========================================================
   Imperial Compounds — site.js (vanilla, no build step)
   Cart (localStorage, single SKU), header count, mobile
   drawer, accordions, steppers, mailto order composer,
   email-capture popup + signup band, checkout coupon.
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Catalog: exactly one SKU ---------- */
  var PRODUCT = {
    id: 'retatrutide-15',
    name: 'Retatrutide',
    dose: '15 mg',
    desc: '15 mg · lyophilized powder · single vial',
    price: 100, // CAD per vial
    img: 'assets/products/retatrutide_15mg.png',
    url: 'product.html'
  };
  var ORDER_EMAIL = 'orders@imperialcompounds.com'; /* TODO-CONFIRM-EMAIL */
  var SHIPPING_FLAT = 18; /* TODO-CONFIRM flat shipping rate */
  var CART_KEY = 'ic_cart_qty';
  var COUPON_KEY = 'ic_coupon';
  var COUPON_CODE = 'IMPERIAL10';
  var COUPON_RATE = 0.10; /* 10% off product subtotal, not shipping */
  var POPUP_KEY = 'ic_popup_seen';
  var SUBSCRIBE_URL = '/api/subscribe';

  function money(n) {
    n = Math.round(n * 100) / 100;
    return '$' + (n % 1 === 0 ? String(n) : n.toFixed(2));
  }

  /* ---------- Icons (lucide CDN) ---------- */
  function renderIcons() {
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons({ attrs: { 'stroke-width': 1.75 } });
    }
  }

  /* ---------- Cart ---------- */
  function getQty() {
    var n = parseInt(localStorage.getItem(CART_KEY), 10);
    return isNaN(n) || n < 0 ? 0 : n;
  }
  function setQty(n) {
    n = Math.max(0, Math.floor(n || 0));
    if (n === 0) localStorage.removeItem(CART_KEY);
    else localStorage.setItem(CART_KEY, String(n));
    updateCartCount();
    return n;
  }
  function updateCartCount() {
    var n = getQty();
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = '(' + n + ')';
    });
  }

  /* ---------- Coupon (persisted with cart) ---------- */
  function getCoupon() {
    return localStorage.getItem(COUPON_KEY) === COUPON_CODE ? COUPON_CODE : null;
  }
  function setCoupon(code) {
    if (code) localStorage.setItem(COUPON_KEY, code);
    else localStorage.removeItem(COUPON_KEY);
  }

  /* ---------- Subscribe (popup + signup band) ---------- */
  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }
  function isPhone(v) {
    return (v.match(/\d/g) || []).length >= 10;
  }
  function subscribe(email, phone) {
    return fetch(SUBSCRIBE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email || '', phone: phone || '' })
    }).then(function (res) {
      if (!res.ok) throw new Error('subscribe failed');
    });
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function showToast(msg) {
    var t = document.querySelector('.ic-toast');
    if (!t) return;
    t.querySelector('[data-toast-msg]').textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2800);
  }

  /* ---------- Mobile drawer (display toggle + opacity/right — no transform) ---------- */
  function initDrawer() {
    var burger = document.querySelector('.ic-burger');
    var drawer = document.querySelector('.ic-drawer');
    var scrim = document.querySelector('.ic-scrim');
    if (!burger || !drawer || !scrim) return;
    function open() {
      drawer.classList.add('open');
      scrim.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      drawer.classList.remove('open');
      scrim.classList.remove('open');
      document.body.style.overflow = '';
    }
    burger.addEventListener('click', open);
    scrim.addEventListener('click', close);
    var x = drawer.querySelector('.ic-drawer-x');
    if (x) x.addEventListener('click', close);
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  /* ---------- Accordions ---------- */
  function initAccordions() {
    document.querySelectorAll('.ic-acc-q').forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.closest('.ic-acc').classList.toggle('open');
      });
    });
  }

  /* ---------- Product page ---------- */
  function initProduct() {
    var buy = document.querySelector('[data-add-to-box]');
    if (!buy) return;
    var qty = 1;
    var qtyEl = document.querySelector('[data-pdp-qty]');
    var priceEl = document.querySelector('[data-pdp-price]');
    function paint() {
      if (qtyEl) qtyEl.textContent = qty;
      if (priceEl) priceEl.textContent = '$' + (PRODUCT.price * qty);
    }
    var minus = document.querySelector('[data-pdp-minus]');
    var plus = document.querySelector('[data-pdp-plus]');
    if (minus) minus.addEventListener('click', function () { qty = Math.max(1, qty - 1); paint(); });
    if (plus) plus.addEventListener('click', function () { qty = Math.min(99, qty + 1); paint(); });
    buy.addEventListener('click', function () {
      setQty(getQty() + qty);
      showToast(PRODUCT.name + ' ' + PRODUCT.dose + ' added to your box');
    });
    paint();
  }

  /* ---------- Checkout page ---------- */
  function initCheckout() {
    var page = document.querySelector('[data-checkout]');
    if (!page) return;

    var filled = document.querySelector('[data-co-filled]');
    var empty = document.querySelector('[data-co-empty]');
    var rail = 'interac';

    function totals() {
      var n = getQty();
      var sub = PRODUCT.price * n;
      var coupon = getCoupon();
      var disc = coupon ? Math.round(sub * COUPON_RATE * 100) / 100 : 0;
      return { n: n, sub: sub, coupon: coupon, disc: disc, total: sub - disc + SHIPPING_FLAT };
    }

    function paint() {
      var t = totals();
      if (t.n === 0) {
        filled.style.display = 'none';
        empty.style.display = '';
        return;
      }
      filled.style.display = '';
      empty.style.display = 'none';
      var q = function (sel) { return page.querySelector(sel); };
      q('[data-co-qty]').textContent = t.n;
      q('[data-co-line-price]').textContent = money(t.sub);
      q('[data-co-subtotal]').textContent = money(t.sub) + ' CAD';
      q('[data-co-shipping]').textContent = money(SHIPPING_FLAT);
      q('[data-co-total]').textContent = money(t.total);
      var discRow = q('[data-co-disc-row]');
      var entry = q('[data-coupon-entry]');
      if (discRow) {
        discRow.style.display = t.coupon ? '' : 'none';
        if (t.coupon) q('[data-co-disc]').textContent = '−$' + t.disc.toFixed(2);
      }
      if (entry) entry.style.display = t.coupon ? 'none' : '';
    }

    /* coupon */
    var couponInput = page.querySelector('[data-coupon-input]');
    var couponErr = page.querySelector('[data-coupon-err]');
    function applyCoupon() {
      var code = (couponInput.value || '').trim().toUpperCase();
      if (code === COUPON_CODE) {
        setCoupon(COUPON_CODE);
        couponErr.style.display = 'none';
        couponInput.value = '';
        paint();
      } else {
        couponErr.style.display = '';
      }
    }
    var couponApply = page.querySelector('[data-coupon-apply]');
    if (couponApply) couponApply.addEventListener('click', applyCoupon);
    if (couponInput) couponInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); }
    });
    var couponRemove = page.querySelector('[data-coupon-remove]');
    if (couponRemove) couponRemove.addEventListener('click', function () {
      setCoupon(null);
      paint();
    });

    page.querySelectorAll('[data-co-minus]').forEach(function (b) {
      b.addEventListener('click', function () { setQty(Math.max(1, getQty() - 1)); paint(); });
    });
    page.querySelectorAll('[data-co-plus]').forEach(function (b) {
      b.addEventListener('click', function () { setQty(getQty() + 1); paint(); });
    });
    page.querySelectorAll('[data-co-remove]').forEach(function (b) {
      b.addEventListener('click', function () { setQty(0); paint(); });
    });

    /* payment rails */
    var rails = page.querySelectorAll('.ic-rail');
    var noteInterac = page.querySelector('[data-note-interac]');
    var noteCrypto = page.querySelector('[data-note-crypto]');
    rails.forEach(function (r) {
      r.addEventListener('click', function () {
        rail = r.getAttribute('data-rail');
        rails.forEach(function (x) { x.classList.toggle('sel', x === r); });
        if (noteInterac) noteInterac.style.display = rail === 'interac' ? '' : 'none';
        if (noteCrypto) noteCrypto.style.display = rail === 'crypto' ? '' : 'none';
      });
    });

    /* place order → prefilled mailto (no backend) */
    var place = page.querySelector('[data-place-order]');
    if (place) place.addEventListener('click', function () {
      var n = getQty();
      if (n === 0) return;
      var name = (page.querySelector('#co-name') || {}).value || '';
      var email = (page.querySelector('#co-email') || {}).value || '';
      var city = (page.querySelector('#co-city') || {}).value || '';
      var hint = page.querySelector('[data-co-hint]');
      if (!name.trim() || !email.trim()) {
        if (hint) {
          hint.textContent = 'Please add your name and email above so we can confirm your order.';
          hint.style.display = '';
        }
        return;
      }
      var t = totals();
      var method = rail === 'crypto' ? 'Crypto (BTC / ETH / USDC)' : 'Interac e-Transfer';
      var subject = 'Order — ' + PRODUCT.name + ' ' + PRODUCT.dose + ' × ' + n;
      var body =
        'New order — Imperial Compounds\n\n' +
        'Product: ' + PRODUCT.name + ' ' + PRODUCT.dose + ' (lyophilized powder, single vial)\n' +
        'Quantity: ' + n + ' vial' + (n > 1 ? 's' : '') + '\n' +
        'Subtotal: ' + money(t.sub) + ' CAD\n' +
        (t.coupon ? 'Coupon ' + t.coupon + ': −$' + t.disc.toFixed(2) + ' CAD\n' : '') +
        'Shipping: ' + money(SHIPPING_FLAT) + ' CAD\n' +
        'Total: ' + money(t.total) + ' CAD\n' +
        'Payment method: ' + method + '\n\n' +
        'Name: ' + name + '\n' +
        'Email: ' + email + '\n' +
        'City: ' + city + '\n\n' +
        'For research use only — not for human consumption.';
      window.location.href = 'mailto:' + ORDER_EMAIL +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
      if (hint) {
        hint.textContent = 'Your email app should have opened with the order pre-filled — just press send. ' +
          'If nothing opened, email ' + ORDER_EMAIL + ' with your order details.';
        hint.style.display = '';
      }
    });

    paint();
  }

  /* ---------- Contact page (mailto composer) ---------- */
  function initContact() {
    var form = document.querySelector('[data-contact-form]');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (id) { var el = form.querySelector(id); return el ? el.value : ''; };
      var topic = v('#cf-topic') || 'General';
      var subject = 'Website enquiry — ' + topic;
      var body =
        'Name: ' + v('#cf-name') + '\n' +
        'Email: ' + v('#cf-email') + '\n' +
        'Topic: ' + topic + '\n\n' +
        v('#cf-message');
      var to = form.getAttribute('data-mailto') || 'hello@imperialcompounds.com'; /* TODO-CONFIRM-EMAIL */
      window.location.href = 'mailto:' + to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
      var sent = form.querySelector('.ic-cf-sent');
      if (sent) sent.style.display = '';
    });
  }

  /* ---------- Email capture popup (all pages except checkout) ---------- */
  function initPopup() {
    if (document.querySelector('[data-checkout]')) return;
    if (localStorage.getItem(POPUP_KEY)) return;
    setTimeout(openPopup, 2500);
  }

  function openPopup() {
    var scrim = document.createElement('div');
    scrim.className = 'ic-pop-scrim';
    scrim.innerHTML =
      '<div class="ic-pop" role="dialog" aria-modal="true" aria-label="Unlock 10% off your first order">' +
        '<button class="ic-pop-x" type="button" aria-label="Close">&times;</button>' +
        '<img class="crest" src="assets/brand/crest.png" alt="" />' +
        '<div class="eye">Imperial Compounds</div>' +
        '<h3>Unlock 10% off your first order</h3>' +
        '<p class="sub">Join the list and we send your code.</p>' +
        '<form novalidate>' +
          '<input type="tel" name="phone" placeholder="Phone number" autocomplete="tel" required />' +
          '<input type="email" name="email" placeholder="Email (optional)" autocomplete="email" />' +
          '<button class="ic-btn ic-btn-gold ic-btn-md" type="submit">Get my 10% code</button>' +
          '<p class="err" data-pop-err style="display:none"></p>' +
          '<p class="consent">By signing up you agree to receive occasional texts and emails from Imperial Compounds. Reply STOP or unsubscribe anytime.</p>' +
        '</form>' +
        '<div class="done" data-pop-done style="display:none">You’re in — your code is <b>IMPERIAL10</b></div>' +
      '</div>';
    document.body.appendChild(scrim);
    document.body.style.overflow = 'hidden';

    var form = scrim.querySelector('form');
    var err = scrim.querySelector('[data-pop-err]');

    function close() {
      document.removeEventListener('keydown', onKey);
      scrim.remove();
      document.body.style.overflow = '';
    }
    function dismiss() {
      localStorage.setItem(POPUP_KEY, '1');
      close();
    }
    function onKey(e) {
      if (e.key === 'Escape') dismiss();
    }
    scrim.addEventListener('click', function (e) {
      if (e.target === scrim) dismiss();
    });
    scrim.querySelector('.ic-pop-x').addEventListener('click', dismiss);
    document.addEventListener('keydown', onKey);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.email.value.trim();
      var phone = form.phone.value.trim();
      if (!isPhone(phone)) {
        err.textContent = 'Please enter a valid phone number.';
        err.style.display = '';
        form.phone.focus();
        return;
      }
      if (email && !isEmail(email)) {
        err.textContent = 'Please enter a valid email address.';
        err.style.display = '';
        form.email.focus();
        return;
      }
      err.style.display = 'none';
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      subscribe(email, phone).then(function () {
        localStorage.setItem(POPUP_KEY, '1');
        form.style.display = 'none';
        scrim.querySelector('[data-pop-done]').style.display = '';
      }).catch(function () {
        btn.disabled = false;
        err.textContent = 'Something went wrong — try again.';
        err.style.display = '';
      });
    });
  }

  /* ---------- Inline signup band (index footer) ---------- */
  function initSignup() {
    var form = document.querySelector('[data-signup-form]');
    if (!form) return;
    var msg = document.querySelector('[data-signup-msg]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.email.value.trim();
      function say(text, ok) {
        msg.textContent = text;
        msg.classList.toggle('ok', !!ok);
        msg.style.display = '';
      }
      if (!isEmail(email)) {
        say('Please enter a valid email address.', false);
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      subscribe(email, '').then(function () {
        form.style.display = 'none';
        say('Check your inbox — your code is IMPERIAL10', true);
      }).catch(function () {
        btn.disabled = false;
        say('Something went wrong — try again.', false);
      });
    });
  }

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    renderIcons();
    updateCartCount();
    initDrawer();
    initAccordions();
    initProduct();
    initCheckout();
    initContact();
    initPopup();
    initSignup();
  });
})();
