(function () {
  'use strict';

  var ORDER_ENDPOINTS = [
    'https://formsubmit.co/ajax/mazemc1@yandex.ru',
    'https://formsubmit.co/ajax/apple-spasatel@yandex.ru'
  ];

  var data = null;
  var selectedBrand = null;
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
      if (hit) otherHits++;
      else return -1;
    }
    var phraseBonus = normText(item.title).indexOf(normText(els.search.value).trim()) !== -1 ? 2 : 0;
    return 1 + phraseBonus + titleHits * 2 + otherHits;
  }

  function brandOf(item) {
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
    if (raw) {
      return '<div class="card-media" style="--ph:' + color + '">' +
        '<img loading="lazy" alt="" src="' + esc(raw) + '">' +
        '<span class="ph-letter">' + letter + '</span></div>';
    }
    return '<div class="card-media" style="--ph:' + color + '">' +
      '<span class="ph-letter only">' + letter + '</span></div>';
  }

  function isNew(item) {
    if (!item.first_seen) return false;
    var dt = new Date(item.first_seen);
    if (isNaN(dt.getTime())) return false;
    return (Date.now() - dt.getTime()) / 1000 < 86400;
  }

  function cardHtml(item, tokens) {
    var classes = ['card'];
    if (!item.is_active) classes.push('inactive');
    var badges = '<span class="badge ' + (item.is_active ? 'badge-active' : 'badge-inactive') + '">' +
      esc(item.status_label) + '</span>';
    if (isNew(item) && item.is_active) badges += '<span class="badge badge-new">Новинка</span>';
    var meta = [item.category_name, item.address].filter(Boolean).map(esc).join(' · ');
    var detail = '#/item/' + encodeURIComponent(item.id);
    return '<article class="' + classes.join(' ') + '">' +
      '<a class="card-media-link" href="' + esc(detail) + '">' + mediaHtml(item) + '</a>' +
      '<div class="card-body">' +
        '<div class="card-top">' + badges + '</div>' +
        '<h3 class="card-title"><a href="' + esc(detail) + '">' + highlightTitle(item.title, tokens) + '</a></h3>' +
        '<div class="card-price">' + formatPrice(item.price) + '</div>' +
        '<div class="card-meta">' + meta + '</div>' +
        '<button class="btn btn-primary card-btn cart-add" data-id="' + esc(item.id) + '">В корзину</button>' +
      '</div></article>';
  }

  function visibleItems() {
    var tokens = queryTokens();
    var result = [];
    data.items.forEach(function (it) {
      if (!els.showInactive.checked && !it.is_active) return;
      if (selectedBrand && brandKey(brandOf(it)) !== selectedBrand) return;
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

  function renderGrid() {
    var tokens = queryTokens();
    var items = visibleItems();
    els.empty.hidden = items.length > 0;
    els.grid.innerHTML = items.map(function (it) { return cardHtml(it, tokens); }).join('');
    els.countLabel.textContent = 'Товаров: ' + items.length;
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
      esc(item.status_label) + '</span>';
    var meta = [item.category_name, item.address].filter(Boolean).map(esc).join(' · ');
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
    if (match) {
      els.gridSection.hidden = true;
      els.cartSection.hidden = true;
      els.detailSection.hidden = false;
      renderDetail(decodeURIComponent(match[1]));
    } else if (location.hash.indexOf('#/cart') === 0) {
      els.gridSection.hidden = true;
      els.detailSection.hidden = true;
      els.cartSection.hidden = false;
      renderCart();
    } else {
      els.detailSection.hidden = true;
      els.cartSection.hidden = true;
      els.gridSection.hidden = false;
      renderGrid();
    }
  }

  function renderChrome() {
    document.title = data.shop_name || 'Магазин';
    els.shopName.textContent = data.shop_name || 'Магазин';
    els.logo.textContent = (data.shop_name || 'М').trim().charAt(0).toUpperCase();
    var active = 0;
    data.items.forEach(function (it) { if (it.is_active) active++; });
    els.statusText.textContent = 'товаров: ' + active;
    var built = data.built_at ? new Date(data.built_at) : null;
    els.footNote.textContent = 'Цены и наличие обновляются автоматически' +
      (built && !isNaN(built.getTime()) ? ' · ' + built.toLocaleDateString('ru-RU') : '');
    computeBrands();
    renderBrandChips();
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
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
      renderChrome();
      updateCartBadge();
      route();
    })
    .catch(function () {
      els.statusText.textContent = 'не удалось загрузить каталог';
    });
})();
