/* =========================================================
   Imperial Compounds — site.js (vanilla, no build step)
   Cart (localStorage, single SKU), header count, mobile
   drawer, accordions, steppers, mailto order composer.
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

    function paint() {
      var n = getQty();
      if (n === 0) {
        filled.style.display = 'none';
        empty.style.display = '';
        return;
      }
      filled.style.display = '';
      empty.style.display = 'none';
      var sub = PRODUCT.price * n;
      var total = sub + SHIPPING_FLAT;
      var q = function (sel) { return page.querySelector(sel); };
      q('[data-co-qty]').textContent = n;
      q('[data-co-line-price]').textContent = '$' + sub;
      q('[data-co-subtotal]').textContent = '$' + sub + ' CAD';
      q('[data-co-shipping]').textContent = '$' + SHIPPING_FLAT;
      q('[data-co-total]').textContent = '$' + total;
    }

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
      var sub = PRODUCT.price * n;
      var total = sub + SHIPPING_FLAT;
      var method = rail === 'crypto' ? 'Crypto (BTC / ETH / USDC)' : 'Interac e-Transfer';
      var subject = 'Order — ' + PRODUCT.name + ' ' + PRODUCT.dose + ' × ' + n;
      var body =
        'New order — Imperial Compounds\n\n' +
        'Product: ' + PRODUCT.name + ' ' + PRODUCT.dose + ' (lyophilized powder, single vial)\n' +
        'Quantity: ' + n + ' vial' + (n > 1 ? 's' : '') + '\n' +
        'Subtotal: $' + sub + ' CAD\n' +
        'Shipping: $' + SHIPPING_FLAT + ' CAD\n' +
        'Total: $' + total + ' CAD\n' +
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

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    renderIcons();
    updateCartCount();
    initDrawer();
    initAccordions();
    initProduct();
    initCheckout();
    initContact();
  });
})();
