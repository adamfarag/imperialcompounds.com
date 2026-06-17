/* =========================================================
   Imperial Compounds — site.js (vanilla, no build step)
   Multi-SKU catalog, multi-line cart (localStorage), header
   count, mobile drawer, accordions, steppers, templated PDP,
   multi-line checkout, mailto fallback, email-capture popup,
   checkout coupon.
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Catalog (must mirror the backend PRODUCTS map) ---------- */
  var PRODUCTS = {
    'reta-10mg': {
      id: 'retatrutide-10',
      sku: 'reta-10mg',
      name: 'Retatrutide',
      dose: '10 mg',
      eye: 'GLP-1 / GIP / Glucagon research',
      desc: 'Lyophilized powder · single vial',
      blurb: 'GLP-1 / GIP / glucagon triple agonist for metabolic research. Lyophilized powder in a sealed glass vial.',
      price: 89.99,
      img: 'assets/products/retatrutide_10mg.png'
    },
    'ghk-cu-100mg': {
      id: 'ghk-cu-100',
      sku: 'ghk-cu-100mg',
      name: 'GHK-Cu',
      dose: '100 mg',
      eye: 'Copper peptide · cosmetic research',
      desc: 'Lyophilized powder · single vial',
      blurb: 'Copper tripeptide-1 (GHK-Cu) for skin, repair and regeneration research. Lyophilized powder in a sealed glass vial.',
      price: 79.99,
      img: 'assets/products/ghk-cu_100mg.png'
    }
  };
  /* Order products appear in the catalog + as the PDP default. */
  var CATALOG = ['reta-10mg', 'ghk-cu-100mg'];

  var ORDER_EMAIL = 'orders@imperialcompounds.com'; /* TODO-CONFIRM-EMAIL */
  var SHIPPING_FLAT = 18; /* TODO-CONFIRM flat shipping rate */
  var CART_KEY = 'ic_cart_v2'; /* JSON map { sku: qty } */
  var OLD_CART_KEY = 'ic_cart_qty'; /* legacy single-SKU qty — discarded */
  var COUPON_KEY = 'ic_coupon';
  var COUPON_CODE = 'IMPERIAL10';
  var COUPON_RATE = 0.10; /* 10% off product subtotal, not shipping */
  var POPUP_KEY = 'ic_popup_seen';
  var SUBSCRIBE_URL = '/api/subscribe';
  var ORDER_URL = '/api/order';
  var STOCK_URL = '/api/stock/';

  function money(n) {
    n = Math.round(n * 100) / 100;
    return '$' + (n % 1 === 0 ? String(n) : n.toFixed(2));
  }
  function product(sku) { return PRODUCTS[sku] || null; }

  /* ---------- Icons (lucide CDN) ---------- */
  function renderIcons() {
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons({ attrs: { 'stroke-width': 1.75 } });
    }
  }

  /* ---------- Cart (multi-line: { sku: qty }) ---------- */
  function getCart() {
    var raw = localStorage.getItem(CART_KEY);
    var c = {};
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        Object.keys(parsed).forEach(function (sku) {
          var q = parseInt(parsed[sku], 10);
          if (PRODUCTS[sku] && q > 0) c[sku] = Math.min(99, q);
        });
      } catch (e) { c = {}; }
    }
    return c;
  }
  function saveCart(c) {
    var clean = {};
    Object.keys(c).forEach(function (sku) {
      if (PRODUCTS[sku] && c[sku] > 0) clean[sku] = Math.min(99, Math.floor(c[sku]));
    });
    if (Object.keys(clean).length) localStorage.setItem(CART_KEY, JSON.stringify(clean));
    else localStorage.removeItem(CART_KEY);
    updateCartCount();
    return clean;
  }
  function addToCart(sku, qty) {
    if (!PRODUCTS[sku]) return;
    var c = getCart();
    c[sku] = Math.min(99, (c[sku] || 0) + Math.max(1, qty || 1));
    saveCart(c);
  }
  function setLine(sku, qty) {
    var c = getCart();
    if (qty <= 0) delete c[sku];
    else c[sku] = Math.min(99, qty);
    saveCart(c);
  }
  function cartCount() {
    var c = getCart(), n = 0;
    Object.keys(c).forEach(function (sku) { n += c[sku]; });
    return n;
  }
  function updateCartCount() {
    var n = cartCount();
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

  /* ---------- Mobile drawer ---------- */
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

  /* ---------- Catalog "Add to box" buttons (index cards) ---------- */
  function initCatalogAdd() {
    document.querySelectorAll('[data-add-sku]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sku = btn.getAttribute('data-add-sku');
        var p = product(sku);
        if (!p) return;
        addToCart(sku, 1);
        showToast(p.name + ' ' + p.dose + ' added to your box');
      });
    });
  }

  /* ---------- Product page (templated by ?sku=) ---------- */
  function currentPdpSku() {
    var params = new URLSearchParams(window.location.search);
    var sku = params.get('sku');
    return PRODUCTS[sku] ? sku : CATALOG[0];
  }

  function initProduct() {
    var root = document.querySelector('[data-pdp]');
    if (!root) return;
    var sku = currentPdpSku();
    var p = product(sku);
    if (!p) return;

    /* Fill templated fields */
    document.title = p.name + ' ' + p.dose + ' — Imperial Compounds';
    function setText(sel, val) { var el = root.querySelector(sel); if (el) el.textContent = val; }
    function setAttr(sel, attr, val) { var el = root.querySelector(sel); if (el) el.setAttribute(attr, val); }
    setText('[data-pdp-crumb]', p.name + ' ' + p.dose);
    setText('[data-pdp-eye]', p.eye);
    setText('[data-pdp-name]', p.name);
    setText('[data-pdp-dose]', p.dose + ' · lyophilized powder · single vial');
    setText('[data-pdp-blurb]', p.blurb);
    setText('[data-pdp-strength]', p.dose + ' per vial');
    setText('[data-pdp-coa-name]', p.name + ' ' + p.dose);
    setAttr('[data-pdp-img]', 'src', p.img);
    setAttr('[data-pdp-img]', 'alt', p.name + ' ' + p.dose + ' vial');
    var coaLink = root.querySelector('[data-pdp-coa-link]');
    if (coaLink) {
      var subj = 'COA request — ' + p.name + ' ' + p.dose;
      coaLink.setAttribute('href', 'mailto:' + ORDER_EMAIL +
        '?subject=' + encodeURIComponent(subj) +
        '&body=' + encodeURIComponent('Lot number: \n\nPlease send the certificate of analysis for my lot.'));
    }

    /* Quantity + price + add */
    var qty = 1;
    var qtyEl = root.querySelector('[data-pdp-qty]');
    var priceEl = root.querySelector('[data-pdp-price]');
    function paint() {
      if (qtyEl) qtyEl.textContent = qty;
      if (priceEl) priceEl.textContent = money(p.price * qty);
    }
    var minus = root.querySelector('[data-pdp-minus]');
    var plus = root.querySelector('[data-pdp-plus]');
    if (minus) minus.addEventListener('click', function () { qty = Math.max(1, qty - 1); paint(); });
    if (plus) plus.addEventListener('click', function () { qty = Math.min(99, qty + 1); paint(); });
    var buy = root.querySelector('[data-add-to-box]');
    if (buy) buy.addEventListener('click', function () {
      addToCart(sku, qty);
      showToast(p.name + ' ' + p.dose + ' added to your box');
    });
    paint();

    /* Stock cue for this SKU */
    var badge = root.querySelector('[data-stock-badge]');
    fetch(STOCK_URL + sku, { headers: { 'Accept': 'application/json' } })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.ok) return;
        if (!data.available) {
          if (badge) { badge.textContent = 'Sold out'; badge.className = 'ic-stock-pill out'; badge.hidden = false; }
          if (buy) { buy.disabled = true; buy.setAttribute('aria-disabled', 'true'); }
          renderIcons();
        } else if (data.low) {
          if (badge) { badge.textContent = 'Almost gone'; badge.className = 'ic-stock-pill low'; badge.hidden = false; }
        }
      })
      .catch(function () { /* leave default UI on error */ });
  }

  /* ---------- Checkout page (multi-line) ---------- */
  function initCheckout() {
    var page = document.querySelector('[data-checkout]');
    if (!page) return;

    var filled = page.querySelector('[data-co-filled]');
    var empty = page.querySelector('[data-co-empty]');
    var itemsWrap = page.querySelector('[data-co-items]');
    var sumRows = page.querySelector('[data-co-sumrows]');
    var rail = 'interac';

    function lines() {
      var c = getCart();
      return Object.keys(c).map(function (sku) {
        var p = product(sku);
        return { sku: sku, p: p, qty: c[sku], lineTotal: round2(p.price * c[sku]) };
      });
    }
    function round2(n) { return Math.round(n * 100) / 100; }

    function totals() {
      var ls = lines();
      var sub = 0, n = 0;
      ls.forEach(function (l) { sub += l.lineTotal; n += l.qty; });
      sub = round2(sub);
      var coupon = getCoupon();
      var disc = coupon ? round2(sub * COUPON_RATE) : 0;
      return { lines: ls, n: n, sub: sub, coupon: coupon, disc: disc, total: round2(sub - disc + SHIPPING_FLAT) };
    }

    function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

    function renderItems(ls) {
      itemsWrap.innerHTML = '';
      ls.forEach(function (l) {
        var row = el('div', 'ic-co-item');

        var thumb = el('div', 'thumb');
        var img = document.createElement('img');
        img.src = l.p.img; img.alt = l.p.name + ' ' + l.p.dose;
        thumb.appendChild(img);

        var meta = el('div', 'meta');
        var nm = el('div', 'nm', l.p.name + ' ');
        nm.appendChild(el('span', null, l.p.dose));
        meta.appendChild(nm);
        meta.appendChild(el('div', 'ds', l.p.desc));
        meta.appendChild(el('div', 'ruoline', 'Research use only'));

        var qtyBox = el('div', 'ic-qty sm');
        var minus = el('button', null); minus.setAttribute('aria-label', 'Decrease quantity');
        minus.innerHTML = '<span class="ic" style="font-size:13px"><i data-lucide="minus"></i></span>';
        var qspan = el('span', null, String(l.qty));
        var plus = el('button', null); plus.setAttribute('aria-label', 'Increase quantity');
        plus.innerHTML = '<span class="ic" style="font-size:13px"><i data-lucide="plus"></i></span>';
        minus.addEventListener('click', function () { setLine(l.sku, l.qty - 1); paint(); });
        plus.addEventListener('click', function () { setLine(l.sku, l.qty + 1); paint(); });
        qtyBox.appendChild(minus); qtyBox.appendChild(qspan); qtyBox.appendChild(plus);

        var price = el('div', 'price', money(l.lineTotal));
        var rm = el('button', 'rm'); rm.setAttribute('aria-label', 'Remove item');
        rm.innerHTML = '<span class="ic" style="font-size:15px"><i data-lucide="x"></i></span>';
        rm.addEventListener('click', function () { setLine(l.sku, 0); paint(); });

        row.appendChild(thumb); row.appendChild(meta); row.appendChild(qtyBox); row.appendChild(price); row.appendChild(rm);
        itemsWrap.appendChild(row);
      });
    }

    function renderSumRows(ls) {
      sumRows.innerHTML = '';
      ls.forEach(function (l) {
        var r = el('div');
        r.appendChild(el('span', null, l.p.name + ' ' + l.p.dose + ' × ' + l.qty));
        r.appendChild(el('span', null, money(l.lineTotal) + ' CAD'));
        sumRows.appendChild(r);
      });
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
      renderItems(t.lines);
      renderSumRows(t.lines);
      var q = function (sel) { return page.querySelector(sel); };
      q('[data-co-shipping]').textContent = money(SHIPPING_FLAT);
      q('[data-co-total]').textContent = money(t.total);
      var discRow = q('[data-co-disc-row]');
      var entry = q('[data-coupon-entry]');
      if (discRow) {
        discRow.style.display = t.coupon ? '' : 'none';
        if (t.coupon) q('[data-co-disc]').textContent = '−$' + t.disc.toFixed(2);
      }
      if (entry) entry.style.display = t.coupon ? 'none' : '';
      renderIcons();
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

    /* place order → backend POST (mailto fallback so an order is never lost) */
    var confirmPanel = page.querySelector('[data-co-confirm]');
    var place = page.querySelector('[data-place-order]');

    function orderMailto(t, name, email, phone, city, method) {
      var label = method === 'crypto' ? 'Crypto (BTC / ETH / USDC)' : 'Interac e-Transfer';
      var itemLines = t.lines.map(function (l) {
        return '  • ' + l.p.name + ' ' + l.p.dose + ' × ' + l.qty + ' — ' + money(l.lineTotal) + ' CAD';
      }).join('\n');
      var subject = 'Order — Imperial Compounds (' + t.n + ' vial' + (t.n > 1 ? 's' : '') + ')';
      var body =
        'New order — Imperial Compounds\n\n' +
        'Items:\n' + itemLines + '\n\n' +
        'Subtotal: ' + money(t.sub) + ' CAD\n' +
        (t.coupon ? 'Coupon ' + t.coupon + ': −$' + t.disc.toFixed(2) + ' CAD\n' : '') +
        'Shipping: ' + money(SHIPPING_FLAT) + ' CAD\n' +
        'Total: ' + money(t.total) + ' CAD\n' +
        'Payment method: ' + label + '\n\n' +
        'Name: ' + name + '\n' +
        'Email: ' + email + '\n' +
        'Phone: ' + (phone || '—') + '\n' +
        'City: ' + city + '\n\n' +
        'For research use only — not for human consumption.';
      window.location.href = 'mailto:' + ORDER_EMAIL +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
    }

    function showConfirm(orderNumber, total, method) {
      var title = page.querySelector('[data-confirm-title]');
      var instr = page.querySelector('[data-confirm-instr]');
      if (title) title.textContent = 'Order ' + orderNumber + ' received';
      var totalStr = money(total) + ' CAD';
      if (instr) {
        if (method === 'crypto') {
          instr.innerHTML = 'Your total is <b>' + totalStr + '</b>. Reply to the confirmation email and we’ll send the ' +
            'wallet address for BTC / ETH / USDC. Include your order number <span class="mono">' + orderNumber + '</span>.';
        } else {
          /* TODO-CONFIRM the Interac recipient address */
          instr.innerHTML = 'Send your Interac e-Transfer of <b>' + totalStr + '</b> to ' +
            '<span class="mono">orders@imperialcompounds.com</span> (TODO-CONFIRM). ' +
            'Include your order number <span class="mono">' + orderNumber + '</span>.';
        }
      }
      filled.style.display = 'none';
      empty.style.display = 'none';
      if (confirmPanel) confirmPanel.style.display = '';
      saveCart({});
      setCoupon(null);
      renderIcons();
      window.scrollTo(0, 0);
    }

    if (place) place.addEventListener('click', function () {
      var t = totals();
      if (t.n === 0) return;
      var name = ((page.querySelector('#co-name') || {}).value || '').trim();
      var email = ((page.querySelector('#co-email') || {}).value || '').trim();
      var phone = ((page.querySelector('#co-phone') || {}).value || '').trim();
      var city = ((page.querySelector('#co-city') || {}).value || '').trim();
      var hint = page.querySelector('[data-co-hint]');
      if (!name || !email) {
        if (hint) {
          hint.textContent = 'Please add your name and email above so we can confirm your order.';
          hint.style.display = '';
        }
        return;
      }
      if (hint) hint.style.display = 'none';
      var prevLabel = place.textContent;
      place.disabled = true;
      place.textContent = 'Placing order…';

      fetch(ORDER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: t.lines.map(function (l) { return { sku: l.sku, qty: l.qty }; }),
          coupon: t.coupon || '',
          name: name,
          email: email,
          phone: phone,
          city: city,
          payment_method: rail
        })
      }).then(function (res) {
        if (res.status === 409) {
          place.disabled = false;
          place.textContent = prevLabel;
          if (hint) {
            hint.textContent = 'Sorry — one of these just sold out. Adjust your box and try again.';
            hint.style.display = '';
          }
          return null;
        }
        if (!res.ok) throw new Error('order failed');
        return res.json();
      }).then(function (data) {
        if (!data) return; /* already handled (e.g. sold out) */
        if (data.ok) {
          showConfirm(data.order_number, data.total, data.payment_method || rail);
        } else {
          throw new Error('order failed');
        }
      }).catch(function () {
        /* network/server error — never lose the order: fall back to mailto */
        place.disabled = false;
        place.textContent = prevLabel;
        orderMailto(t, name, email, phone, city, rail);
        if (hint) {
          hint.textContent = 'We couldn’t reach our server, so your email app should have opened with the order ' +
            'pre-filled — just press send. If nothing opened, email ' + ORDER_EMAIL + ' with your order details.';
          hint.style.display = '';
        }
      });
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
    try { localStorage.removeItem(OLD_CART_KEY); } catch (e) {}
    renderIcons();
    updateCartCount();
    initDrawer();
    initAccordions();
    initCatalogAdd();
    initProduct();
    initCheckout();
    initContact();
    initPopup();
    initSignup();
  });
})();
