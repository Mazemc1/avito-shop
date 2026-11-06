(function () {
  'use strict';

  var ORDER_ENDPOINTS = [
    'https://formsubmit.co/ajax/mazemc1@yandex.ru',
    'https://formsubmit.co/ajax/apple-spasatel@yandex.ru'
  ];

  var data = null;
  var selectedBrand = null;
  var selectedModel = null;
  var brands = [];

  var els = {
    shopName: document.getElementById('shopName'),
    logo: document.getElementById('logo'),
    statusText: document.getElementById('statusText'),
    cartCount: document.getElementById('cartCount'),
    search: document.getElementById('search'),
    sort: document.getElementById('sort'),
    showInactive: document.getElementById('showInactive'),
    countLabel: document.getElementById('countLabel'),
    brandChips: document.getElementById('brandChips'),
    modelHeader: document.getElementById('modelHeader'),
    grid: document.getElementById('grid'),
    empty: document.getElementById('empty'),
    gridSection: document.getElementById('gridSection'),
    detailSection: document.getElementById('detailSection'),
    detail: document.getElementById('detail'),
    notfound: document.getElementById('notfound'),
    cartSection: document.getElementById('cartSection'),
    cartList: document.getElementById('cartList'),
    cartEmpty: document.getElementById('cartEmpty'),
    cartSummary: document.getElementById('cartSummary'),
    cartTotal: document.getElementById('cartTotal'),
    orderForm: document.getElementById('orderForm'),
    custName: document.getElementById('custName'),
    custPhone: document.getElementById('custPhone'),
    custComment: document.getElementById('custComment'),
    formError: document.getElementById('formError'),
    submitBtn: document.getElementById('submitBtn'),
    orderSuccess: document.getElementById('orderSuccess'),
    footNote: document.getElementById('footNote'),
    reviewsSection: document.getElementById('reviewsSection'),
    ratingBadge: document.getElementById('ratingBadge'),
    ratingBadgeStars: document.getElementById('ratingBadgeStars'),
    ratingBadgeScore: document.getElementById('ratingBadgeScore'),
    ratingBadgeCount: document.getElementById('ratingBadgeCount'),
    allReviewsLink: document.getElementById('allReviewsLink'),
    reviewsList: document.getElementById('reviewsList'),
    lightbox: document.getElementById('lightbox'),
    lightboxImg: document.getElementById('lightboxImg'),
    toast: document.getElementById('toast')
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function formatPrice(price) {
    if (price == null) return 'Цена по запросу';
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
  }

  function normText(text) {
    return String(text || '').toLowerCase().replace(/ё/g, 'е');
  }

  function tokenize(text) {
    return normText(text).split(/[^a-zа-я0-9]+/).filter(function (w) { return w.length >= 2; });
  }

  function stemLite(w) {
    if (w.length <= 4) return w;
    return w.replace(/(иями|ями|ами|иях|ях|ах|ов|ев|ей|ой|ая|ое|ые|ый|ий|ом|ем|ую|ию|ия|ие|ии|у|ю|а|я|о|е|ы|и)$/, '');
  }

  function wordMatch(a, b) {
    if (a === b) return true;
    var sa = stemLite(a);
    var sb = stemLite(b);
    if (sa.length >= 3 && sa === sb) return true;
    if (a.length >= 3 && b.length >= 3 && (a.indexOf(b) === 0 || b.indexOf(a) === 0)) return true;
    return false;
  }

  function queryTokens() {
    return tokenize(els.search.value);
  }

  function searchScore(item, tokens) {
    if (!tokens.length) return 1;
    var titleTokens = tokenize(item.title);
    var catTokens = tokenize(item.category_name);
    var compatTokens = tokenize((item.compat || []).map(function (c) {
      return c.brand + ' ' + c.model;
    }).join(' '));
    var titleHits = 0;
    var otherHits = 0;
    for (var i = 0; i < tokens.length; i++) {
      var q = tokens[i];
      var hit = false;
      for (var j = 0; j < titleTokens.length; j++) {
        if (wordMatch(titleTokens[j], q)) { hit = true; break; }
      }
      if (hit) { titleHits++; continue; }
      for (var k = 0; k < catTokens.length; k++) {
        if (wordMatch(catTokens[k], q)) { hit = true; break; }
      }
      if (hit) { otherHits++; continue; }
      for (var m = 0; m < compatTokens.length; m++) {
        if (wordMatch(compatTokens[m], q)) { hit = true; break; }
      }
      if (hit) otherHits++;
      else return -1;
    }
    var phraseBonus = normText(item.title).indexOf(normText(els.search.value).trim()) !== -1 ? 2 : 0;
    return 1 + phraseBonus + titleHits * 2 + otherHits;
  }

  var BRAND_NAMES = [
    'Dreame', 'Xiaomi', 'Roborock', 'Ecovacs', 'Tefal', 'Tuvio', 'Redmond', 'Midea',
    'Hutt', 'Deerma', 'Viomi', 'iLife', 'Bork', 'Kitfort', 'Samsung', 'Apple',
    'Bosch', 'Neff', 'Siemens', 'Lydsto', 'Puppyoo', 'Polaris', 'Rowenta', 'Dyson',
    'Karcher', 'Deebot', 'Okami', 'Neatsvor', 'RemeZ', 'Roidmi', 'Genio', 'Weissgauff',
    'Bissell', 'Thomas', 'Philips', 'Haier', 'Honor', 'Huawei', 'LG', 'Sony', 'Lenovo',
    'Acer', 'Asus', 'HP', 'Dell', 'JBL', 'Beats', 'Garmin', 'GoPro', 'Redroad',
    'Redkey', 'Atvel', 'Gutrend', 'KaringBee', 'Futula', 'Accesstyle', 'Dexter'
  ];
  var BRAND_ALIASES = {
    'bosh': 'Bosch', 'mi': 'Xiaomi', 'mijia': 'Xiaomi', 'poco': 'Xiaomi', 'redmi': 'Xiaomi',
    'iphone': 'Apple', 'ipad': 'Apple', 'macbook': 'Apple', 'deebot': 'Ecovacs',
    'дрим': 'Dreame', 'дреам': 'Dreame', 'сяоми': 'Xiaomi', 'роборок': 'Roborock',
    'эковокс': 'Ecovacs', 'тефаль': 'Tefal', 'редмонд': 'Redmond', 'мидеа': 'Midea',
    'хутт': 'Hutt', 'дирма': 'Deerma', 'виоми': 'Viomi', 'айлайф': 'iLife', 'борк': 'Bork',
    'китфорт': 'Kitfort', 'самсунг': 'Samsung', 'айфон': 'Apple'
  };

  function detectBrand(title) {
    var t = String(title || '').toLowerCase().replace(/ё/g, 'е');
    var best = '';
    var bestPos = -1;
    for (var i = 0; i < BRAND_NAMES.length; i++) {
      var name = BRAND_NAMES[i];
      var re = new RegExp('(^|[^a-zа-я0-9])' + name.toLowerCase() + '($|[^a-zа-я0-9])');
      var m = re.exec(t);
      if (m && (bestPos === -1 || m.index < bestPos || (m.index === bestPos && name.length > best.length))) {
        best = name;
        bestPos = m.index;
      }
    }
    var keys = Object.keys(BRAND_ALIASES);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      var aliasRe = new RegExp('(^|[^a-zа-я0-9])' + key + '($|[^a-zа-я0-9])');
      var am = aliasRe.exec(t);
      if (am && (bestPos === -1 || am.index < bestPos)) {
        best = BRAND_ALIASES[keys[k]];
        bestPos = am.index;
      }
    }
    return best;
  }

  function brandOf(item) {
    if (item.compat && item.compat.length) return item.compat[0].brand;
    var detected = detectBrand(item.title);
    if (detected) return detected;
    var m = String(item.title || '').match(/^([A-Za-zА-ЯЁа-яё][A-Za-zА-ЯЁа-яё\-]{1,20})/);
    return m ? m[1] : '';
  }

  function brandKey(brand) {
    return normText(brand);
  }

  function computeBrands() {
    var counts = {};
    var labels = {};
    data.items.forEach(function (it) {
      var b = brandOf(it);
      if (!b) return;
      var key = brandKey(b);
      counts[key] = (counts[key] || 0) + 1;
      labels[key] = b;
    });
    brands = Object.keys(counts)
      .sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b, 'ru'); })
      .map(function (key) { return { key: key, label: labels[key], count: counts[key] }; });
  }

  function renderBrandChips() {
    var html = '<button class="chip' + (selectedBrand ? '' : ' active') + '" data-brand="" type="button">Все</button>';
    brands.slice(0, 14).forEach(function (b) {
      var active = selectedBrand === b.key ? ' active' : '';
      html += '<button class="chip' + active + '" data-brand="' + esc(b.key) + '" type="button">' +
        esc(b.label) + '<span class="chip-count">' + b.count + '</span></button>';
    });
    if (selectedBrand) {
      var known = brands.some(function (b) { return b.key === selectedBrand; });
      if (!known) {
        var label = selectedBrand;
        data.items.some(function (it) {
          var b = brandOf(it);
          if (brandKey(b) === selectedBrand) { label = b; return true; }
          return false;
        });
        html += '<button class="chip active" data-brand="' + esc(selectedBrand) + '" type="button">' +
          esc(label) + '</button>';
      }
    }
    els.brandChips.innerHTML = html;
  }

  function paletteFor(key) {
    var palette = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];
    var hash = 0;
    for (var i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  }

  function openLightbox(src) {
    if (!src) return;
    els.lightboxImg.src = src;
    els.lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    els.lightbox.hidden = true;
    els.lightboxImg.src = '';
    document.body.style.overflow = '';
  }

  function showToast(text) {
    els.toast.textContent = text;
    els.toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { els.toast.hidden = true; }, 3500);
  }

  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem('shop_cart') || '{}');
      if (raw && typeof raw === 'object') return raw;
    } catch (e) { /* ignore */ }
    return {};
  }

  function saveCart(cart) {
    localStorage.setItem('shop_cart', JSON.stringify(cart));
    updateCartBadge();
  }

  function updateCartBadge() {
    var cart = loadCart();
    var count = 0;
    Object.keys(cart).forEach(function (k) { count += cart[k] || 0; });
    els.cartCount.textContent = String(count);
  }

  function addToCart(id) {
    var cart = loadCart();
    cart[id] = (cart[id] || 0) + 1;
    saveCart(cart);
    var item = findItem(id);
    showToast('Добавлено в корзину: ' + (item ? item.title : 'товар'));
  }

  function findItem(id) {
    for (var i = 0; i < data.items.length; i++) {
      if (String(data.items[i].id) === String(id)) return data.items[i];
    }
    return null;
  }

  function highlightTitle(title, tokens) {
    if (!tokens.length) return esc(title);
    var parts = String(title).split(/([A-Za-zА-ЯЁа-яё0-9]+)/);
    return parts.map(function (part, idx) {
      if (idx % 2 === 0) return esc(part);
      var norm = normText(part);
      for (var i = 0; i < tokens.length; i++) {
        if (wordMatch(norm, tokens[i])) return '<mark>' + esc(part) + '</mark>';
      }
      return esc(part);
    }).join('');
  }

  function mediaHtml(item) {
    var color = paletteFor(item.id || item.title || '?');
    var letter = esc((item.title || '?').trim().charAt(0).toUpperCase());
    var raw = item.images && item.images.length ? item.images[0] : '';
    var badges = '<div class="card-badges">';
    if (!item.is_active) badges += '<span class="badge badge-inactive">' + esc(item.status_label) + '</span>';
    badges += '<span class="badge badge-original">Оригинал</span>';
    if (isNew(item) && item.is_active) badges += '<span class="badge badge-new">Новинка</span>';
    badges += '</div>';
    if (raw) {
      return '<div class="card-media" style="--ph:' + color + '">' + badges +
        '<img loading="lazy" alt="" src="' + esc(raw) + '">' +
        '<span class="ph-letter">' + letter + '</span></div>';
    }
    return '<div class="card-media" style="--ph:' + color + '">' + badges +
      '<span class="ph-letter only">' + letter + '</span></div>';
  }

  function isNew(item) {
    if (!item.first_seen) return false;
    var dt = new Date(item.first_seen);
    if (isNaN(dt.getTime())) return false;
    return (Date.now() - dt.getTime()) / 1000 < 86400;
  }

  function compatChipsHtml(item, limit) {
    var list = item.compat || [];
    if (!list.length) return '';
    var shown = list.slice(0, limit || 3);
    var html = shown.map(function (c) {
      return '<a class="compat-chip" href="#/model/' + encodeURIComponent(c.slug) + '">' +
        esc(c.brand + ' ' + c.model) + '</a>';
    }).join('');
    if (list.length > shown.length) {
      html += '<span class="compat-more">+' + (list.length - shown.length) + '</span>';
    }
    return html;
  }

  function compatCardsHtml(item) {
    var list = item.compat || [];
    if (!list.length) return '';
    return list.map(function (c) {
      var info = modelInfoFor(c.slug) || {};
      var big = info.photo_big || info.photo || '';
      var photo = info.photo
        ? '<img class="model-card-photo" src="' + esc(info.photo) + '" data-big="' + esc(big) + '" alt="" loading="lazy">'
        : '<div class="model-card-photo model-card-ph"><span>' +
            esc(c.brand.charAt(0).toUpperCase()) + '</span></div>';
      return '<a class="model-card" href="#/model/' + encodeURIComponent(c.slug) + '">' +
        photo +
        '<div class="model-card-info">' +
          '<div class="model-card-brand">' + esc(c.brand) + '</div>' +
          '<div class="model-card-name">' + esc(c.model) + '</div>' +
          (info.code ? '<div class="model-card-code">' + esc(info.code) + '</div>' : '') +
        '</div>' +
      '</a>';
    }).join('');
  }

  function cardHtml(item, tokens) {
    var classes = ['card'];
    if (!item.is_active) classes.push('inactive');
    var brandName = brandOf(item);
    var meta = item.category_name ? esc(item.category_name) : '';
    var compat = compatChipsHtml(item, 2);
    var compatLine = compat
      ? '<div class="compat-line"><span class="compat-label">Совместимость</span>' + compat + '</div>'
      : (item.universal
        ? '<div class="compat-line"><span class="compat-label">Совместимость</span><span class="compat-univ">Универсальный</span></div>'
        : '');
    var detail = '#/item/' + encodeURIComponent(item.id);
    return '<article class="' + classes.join(' ') + '">' +
      '<a class="card-media-link" href="' + esc(detail) + '">' + mediaHtml(item) + '</a>' +
      '<div class="card-body">' +
        '<div class="card-brand-row"><span class="card-brand">' + esc(brandName || '') + '</span></div>' +
        '<h3 class="card-title"><a href="' + esc(detail) + '">' + highlightTitle(item.title, tokens) + '</a></h3>' +
        '<div class="card-price">' + formatPrice(item.price) + '</div>' +
        (meta ? '<div class="card-meta">' + meta + '</div>' : '') +
        compatLine +
        '<button class="btn btn-primary card-btn cart-add" data-id="' + esc(item.id) + '">В корзину</button>' +
      '</div></article>';
  }

  function visibleItems() {
    var tokens = queryTokens();
    var result = [];
    data.items.forEach(function (it) {
      if (!els.showInactive.checked && !it.is_active) return;
      if (selectedBrand && brandKey(brandOf(it)) !== selectedBrand) return;
      if (selectedModel) {
        var hasModel = (it.compat || []).some(function (c) { return c.slug === selectedModel; });
        if (!hasModel) return;
      }
      var score = searchScore(it, tokens);
      if (score < 0) return;
      result.push({ item: it, score: score });
    });

    var sort = els.sort.value;
    if (tokens.length) {
      result.sort(function (a, b) {
        return b.score - a.score || String(a.item.title).localeCompare(String(b.item.title), 'ru');
      });
    } else if (sort === 'price_asc') {
      result.sort(function (a, b) {
        return (a.item.price == null) - (b.item.price == null) || (a.item.price || 0) - (b.item.price || 0);
      });
    } else if (sort === 'price_desc') {
      result.sort(function (a, b) {
        return (a.item.price == null) - (b.item.price == null) || (b.item.price || 0) - (a.item.price || 0);
      });
    } else if (sort === 'name_asc') {
      result.sort(function (a, b) { return String(a.item.title).localeCompare(String(b.item.title), 'ru'); });
    } else if (sort === 'name_desc') {
      result.sort(function (a, b) { return String(b.item.title).localeCompare(String(a.item.title), 'ru'); });
    } else if (sort === 'brand_asc') {
      result.sort(function (a, b) {
        return brandOf(a.item).localeCompare(brandOf(b.item), 'ru') ||
          String(a.item.title).localeCompare(String(b.item.title), 'ru');
      });
    } else if (sort === 'brand_desc') {
      result.sort(function (a, b) {
        return brandOf(b.item).localeCompare(brandOf(a.item), 'ru') ||
          String(a.item.title).localeCompare(String(b.item.title), 'ru');
      });
    } else {
      result.sort(function (a, b) {
        return String(b.item.first_seen || '').localeCompare(String(a.item.first_seen || ''));
      });
    }
    return result.map(function (r) { return r.item; });
  }

  function modelInfoFor(slug) {
    var found = null;
    (data.models || []).forEach(function (m) { if (m.slug === slug) found = m; });
    return found;
  }

  function renderModelHeader() {
    if (!selectedModel) { els.modelHeader.hidden = true; return; }
    var info = modelInfoFor(selectedModel) || {};
    var label = info.model || selectedModel;
    var count = info.count || 0;
    var code = info.code ? '<span class="model-code">' + esc(info.code) + '</span>' : '';
    els.modelHeader.innerHTML =
      '<div class="model-head-inner">' +
        (info.photo
          ? '<img class="model-head-photo" src="' + esc(info.photo) + '" data-big="' +
              esc(info.photo_big || info.photo) + '" title="Нажмите, чтобы увеличить" alt="">'
          : '<div class="model-head-photo model-head-ph"><span>' +
              esc((info.brand || '?').charAt(0).toUpperCase()) + '</span></div>') +
        '<div class="model-head-text">' +
          '<div class="model-brand">' + esc(info.brand || '') + '</div>' +
          '<div class="model-title">' + esc(label) + code + '</div>' +
          '<div class="model-count">' + count + ' ' +
            plural(count, ['товар', 'товара', 'товаров']) + ' для этой модели</div>' +
        '</div>' +
        '<a class="back-link model-reset" href="#/" title="Показать все товары">&times; Отключить фильтр по модели</a>' +
      '</div>';
    els.modelHeader.hidden = false;
    document.title = 'Запчасти для ' + (info.brand ? info.brand + ' ' : '') + label +
      ' — ' + (data.shop_name || 'магазин');
  }

  function renderGrid() {
    var tokens = queryTokens();
    var items = visibleItems();
    els.empty.hidden = items.length > 0;
    els.grid.innerHTML = items.map(function (it) { return cardHtml(it, tokens); }).join('');
    els.countLabel.textContent = 'Товаров: ' + items.length;
    renderModelHeader();
  }

  function renderDetail(id) {
    var item = findItem(id);
    els.notfound.hidden = !!item;
    if (!item) { els.detail.innerHTML = ''; return; }
    document.title = (item.title || 'Товар') + ' — магазин';
    var images = item.images || [];
    var main = images.length ? images[0] : null;
    var media = main
      ? '<img id="detailMain" src="' + esc(main) + '" alt="">'
      : '<div class="card-media" style="height:320px"><span class="ph-letter only">' +
        esc((item.title || '?').trim().charAt(0).toUpperCase()) + '</span></div>';
    var thumbs = images.length > 1
      ? '<div class="detail-thumbs">' + images.map(function (u, i) {
          return '<img src="' + esc(u) + '" data-full="' + esc(u) + '"' + (i === 0 ? ' class="active"' : '') + '>';
        }).join('') + '</div>'
      : '';
    var badges = '<span class="badge ' + (item.is_active ? 'badge-active' : 'badge-inactive') + '">' +
      esc(item.status_label) + '</span>' +
      '<span class="badge badge-original">Оригинал</span>';
    var meta = item.category_name ? esc(item.category_name) : '';
    var compat = compatChipsHtml(item, 10);
    var compatBlock = '';
    if (compat) {
      compatBlock = '<div class="compat-block">' +
        '<h3>Совместимые модели</h3>' +
        '<div class="compat-cards">' + compatCardsHtml(item) + '</div>' +
        '<div class="compat-note">Не нашли свою модель? Уточните совместимость при оформлении заказа.</div>' +
      '</div>';
    } else if (item.universal) {
      compatBlock = '<div class="compat-block">' +
        '<h3>Совместимость</h3>' +
        '<div class="compat-note">Универсальный товар — подходит для большинства моделей.</div>' +
      '</div>';
    }
    els.detail.innerHTML =
      '<div class="detail-media">' + media + thumbs + '</div>' +
      '<div class="detail-info">' +
        '<div class="card-top">' + badges + '</div>' +
        '<h1>' + esc(item.title) + '</h1>' +
        '<div class="detail-price">' + formatPrice(item.price) + '</div>' +
        (meta ? '<div class="detail-meta">' + meta + '</div>' : '') +
        '<div class="detail-actions">' +
          '<button class="btn btn-primary cart-add" data-id="' + esc(item.id) + '">Добавить в корзину</button>' +
        '</div>' +
        compatBlock +
      '</div>';
    els.detail.querySelectorAll('.detail-thumbs img').forEach(function (img) {
      img.addEventListener('click', function () {
        var mainImg = document.getElementById('detailMain');
        if (mainImg && img.dataset.full) {
          mainImg.src = img.dataset.full;
          mainImg.style.display = 'block';
        }
        els.detail.querySelectorAll('.detail-thumbs img').forEach(function (t) { t.classList.remove('active'); });
        img.classList.add('active');
      });
    });
  }

  function cartEntries() {
    var cart = loadCart();
    var entries = [];
    Object.keys(cart).forEach(function (id) {
      var item = findItem(id);
      if (item && cart[id] > 0) {
        entries.push({ item: item, qty: cart[id] });
      }
    });
    return entries;
  }

  function renderCart() {
    els.orderSuccess.hidden = true;
    els.formError.hidden = true;
    var entries = cartEntries();
    if (!entries.length) {
      els.cartEmpty.hidden = false;
      els.cartSummary.hidden = true;
      els.cartList.innerHTML = '';
      return;
    }
    els.cartEmpty.hidden = true;
    els.cartSummary.hidden = false;
    var total = 0;
    var rows = entries.map(function (entry) {
      var price = entry.item.price || 0;
      var sum = price * entry.qty;
      total += sum;
      var thumb = entry.item.images && entry.item.images.length
        ? '<img src="' + esc(entry.item.images[0]) + '" alt="">'
        : '<div class="cart-thumb-ph" style="--ph:' + paletteFor(entry.item.id) + '">' +
          esc((entry.item.title || '?').charAt(0).toUpperCase()) + '</div>';
      return '<div class="cart-row" data-id="' + esc(entry.item.id) + '">' +
        thumb +
        '<a class="row-title" href="#/item/' + encodeURIComponent(entry.item.id) + '">' +
          esc(entry.item.title) +
          '<div class="row-price">' + formatPrice(price) + '</div>' +
        '</a>' +
        '<div class="cart-qty">' +
          '<button class="qty-btn" data-action="minus" type="button">&minus;</button>' +
          '<span class="qty-value">' + entry.qty + '</span>' +
          '<button class="qty-btn" data-action="plus" type="button">+</button>' +
        '</div>' +
        '<div class="row-sum">' + formatPrice(sum) + '</div>' +
        '<button class="remove-btn" data-action="remove" type="button" title="Удалить">&times;</button>' +
      '</div>';
    });
    els.cartList.innerHTML = rows.join('');
    els.cartTotal.textContent = 'Итого: ' + formatPrice(total);
  }

  function showFormError(text) {
    els.formError.textContent = text;
    els.formError.hidden = false;
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = 'Оформить заказ';
  }

  function submitOrder() {
    var name = els.custName.value.trim();
    var phone = els.custPhone.value.trim();
    var digits = phone.replace(/\D/g, '');
    if (name.length < 2) {
      showFormError('Укажите ваше имя.');
      return;
    }
    if (digits.length < 10 || digits.length > 15) {
      showFormError('Укажите корректный номер телефона, например +7 999 123-45-67.');
      return;
    }
    var entries = cartEntries();
    if (!entries.length) {
      showFormError('Корзина пуста.');
      return;
    }
    var lines = [];
    var total = 0;
    entries.forEach(function (entry) {
      var price = entry.item.price || 0;
      var sum = price * entry.qty;
      total += sum;
      lines.push('• ' + entry.item.title + ' — ' + entry.qty + ' шт. × ' +
        formatPrice(price) + ' = ' + formatPrice(sum));
    });
    var payload = {
      _subject: 'Новый заказ с сайта — ' + formatPrice(total),
      _template: 'table',
      _captcha: 'false',
      'Имя': name,
      'Телефон': phone,
      'Комментарий': els.custComment.value.trim() || '—',
      'Состав заказа': lines.join('\n'),
      'Итого': formatPrice(total),
      'Дата заказа': new Date().toLocaleString('ru-RU')
    };
    els.submitBtn.disabled = true;
    els.submitBtn.textContent = 'Отправляем…';
    var pending = ORDER_ENDPOINTS.length;
    var succeeded = 0;
    var finished = false;
    function finishOne(ok) {
      pending--;
      if (ok) succeeded++;
      if (pending > 0 || finished) return;
      finished = true;
      if (succeeded > 0) {
        localStorage.removeItem('shop_cart');
        updateCartBadge();
        els.cartSummary.hidden = true;
        els.cartList.innerHTML = '';
        els.cartEmpty.hidden = true;
        els.orderSuccess.hidden = false;
        els.orderForm.reset();
        els.submitBtn.disabled = false;
        els.submitBtn.textContent = 'Оформить заказ';
      } else {
        showFormError('Не удалось отправить заказ. Проверьте интернет и попробуйте ещё раз.');
      }
    }
    ORDER_ENDPOINTS.forEach(function (endpoint) {
      var controller = new AbortController();
      var timeoutId = setTimeout(function () { controller.abort(); }, 20000);
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
        .then(function (resp) { clearTimeout(timeoutId); return resp.json(); })
        .then(function (result) {
          finishOne(String(result.success) === 'true' || result.success === true);
        })
        .catch(function () {
          clearTimeout(timeoutId);
          finishOne(false);
        });
    });
  }

  function route() {
    var match = location.hash.match(/^#\/item\/(.+)$/);
    var modelMatch = location.hash.match(/^#\/model\/(.+)$/);
    if (match) {
      els.gridSection.hidden = true;
      els.cartSection.hidden = true;
      els.detailSection.hidden = false;
      renderDetail(decodeURIComponent(match[1]));
    } else if (modelMatch) {
      selectedModel = decodeURIComponent(modelMatch[1]);
      els.detailSection.hidden = true;
      els.cartSection.hidden = true;
      els.gridSection.hidden = false;
      renderGrid();
      window.scrollTo(0, 0);
    } else if (location.hash.indexOf('#/cart') === 0) {
      els.gridSection.hidden = true;
      els.detailSection.hidden = true;
      els.cartSection.hidden = false;
      renderCart();
    } else {
      selectedModel = null;
      els.detailSection.hidden = true;
      els.cartSection.hidden = true;
      els.gridSection.hidden = false;
      document.title = data.shop_name || 'Магазин';
      renderGrid();
    }
  }

  function stars(score) {
    var n = Math.max(0, Math.min(5, Math.round(score || 0)));
    return '★'.repeat(n) + '<span class="stars-off">' + '★'.repeat(5 - n) + '</span>';
  }

  function reviewDate(created) {
    if (!created) return '';
    var d = new Date(created * 1000);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function renderReviews() {
    var r = data.reviews;
    if (!r || !r.list || !r.list.length) return;
    els.reviewsSection.hidden = false;
    els.allReviewsLink.href = r.profile_url || 'https://www.avito.ru/';
    els.ratingBadge.href = r.profile_url || 'https://www.avito.ru/';
    var avg = r.avg_score ? String(r.avg_score).replace('.', ',') : '5,0';
    els.ratingBadgeStars.innerHTML = stars(r.avg_score || 5);
    els.ratingBadgeScore.textContent = avg;
    els.ratingBadgeCount.textContent = r.total + ' ' + plural(r.total, ['отзыв', 'отзыва', 'отзывов']) + ' на Авито';
    els.reviewsList.innerHTML = r.list.map(function (rev) {
      return '<article class="review-card">' +
        '<div class="review-top">' +
          '<span class="review-stars">' + stars(rev.score) + '</span>' +
          '<span class="review-name">' + esc(rev.name) + '</span>' +
          '<span class="review-date">' + esc(reviewDate(rev.created)) + '</span>' +
        '</div>' +
        (rev.text ? '<p class="review-text">' + esc(String(rev.text).slice(0, 320)) + '</p>' : '') +
        (rev.item_title ? '<div class="review-item">Покупка: ' + esc(rev.item_title) + '</div>' : '') +
      '</article>';
    }).join('');
  }

  function plural(n, forms) {
    var abs = Math.abs(n) % 100;
    var d = abs % 10;
    if (abs > 10 && abs < 20) return forms[2];
    if (d > 1 && d < 5) return forms[1];
    if (d === 1) return forms[0];
    return forms[2];
  }

  function renderChrome() {
    document.title = data.shop_name || 'Магазин';
    els.shopName.textContent = data.shop_name || 'Магазин';
    els.logo.textContent = (data.shop_name || 'М').trim().charAt(0).toUpperCase();
    var active = 0;
    data.items.forEach(function (it) { if (it.is_active) active++; });
    if (data.reviews && data.reviews.total) {
      els.statusText.textContent = '★ ' + String(data.reviews.avg_score || 5).replace('.', ',') +
        ' · ' + data.reviews.total + ' ' + plural(data.reviews.total, ['отзыв', 'отзыва', 'отзывов']);
      var profileUrl = data.reviews.profile_url;
      if (profileUrl) {
        els.statusText.style.cursor = 'pointer';
        els.statusText.title = 'Смотреть отзывы на Авито';
        els.statusText.onclick = function () { window.open(profileUrl, '_blank', 'noopener'); };
      }
    } else {
      els.statusText.textContent = 'товаров: ' + active;
    }
    var built = data.built_at ? new Date(data.built_at) : null;
    els.footNote.textContent = 'Цены и наличие обновляются автоматически' +
      (built && !isNaN(built.getTime()) ? ' · ' + built.toLocaleDateString('ru-RU') : '');
    computeBrands();
    renderBrandChips();
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var zoomable = target.closest('.model-head-photo, .model-card-photo, #detailMain');
    if (zoomable && zoomable.tagName === 'IMG') {
      event.preventDefault();
      openLightbox(zoomable.dataset.big || zoomable.src);
      return;
    }
    if (target.closest('.lightbox')) {
      closeLightbox();
      return;
    }
    var chip = target.closest('.chip');
    if (chip && chip.dataset && typeof chip.dataset.brand === 'string') {
      selectedBrand = chip.dataset.brand || null;
      renderBrandChips();
      renderGrid();
      window.scrollTo(0, 0);
      return;
    }
    var add = target.closest('.cart-add');
    if (add && add.dataset && add.dataset.id) {
      addToCart(add.dataset.id);
      return;
    }
    var qty = target.closest('.qty-btn, .remove-btn');
    if (qty && qty.dataset && qty.dataset.action) {
      var row = target.closest('.cart-row');
      if (!row || !row.dataset.id) return;
      var cart = loadCart();
      var id = row.dataset.id;
      if (qty.dataset.action === 'plus') {
        cart[id] = (cart[id] || 0) + 1;
      } else if (qty.dataset.action === 'minus') {
        cart[id] = Math.max(0, (cart[id] || 0) - 1);
        if (!cart[id]) delete cart[id];
      } else if (qty.dataset.action === 'remove') {
        delete cart[id];
      }
      saveCart(cart);
      renderCart();
    }
  });

  els.orderForm.addEventListener('submit', function (event) {
    event.preventDefault();
    submitOrder();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !els.lightbox.hidden) closeLightbox();
  });

  var searchTimer = null;
  els.search.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderGrid, 250);
  });
  els.sort.addEventListener('change', renderGrid);
  els.showInactive.addEventListener('change', renderGrid);
  window.addEventListener('hashchange', route);

  fetch('data.json')
    .then(function (resp) { return resp.json(); })
    .then(function (d) {
      data = d;
      if (window.__MODEL__ && window.__MODEL__.slug && !location.hash) {
        history.replaceState(null, '', '#/model/' + encodeURIComponent(window.__MODEL__.slug));
      }
      renderChrome();
      renderReviews();
      updateCartBadge();
      route();
    })
    .catch(function () {
      els.statusText.textContent = 'не удалось загрузить каталог';
    });
})();
