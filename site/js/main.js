(function () {
  'use strict';
  var C = window.OLIVIA || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Ссылки мессенджеров */
  $$('.js-max').forEach(function (a) { a.href = C.maxUrl || '#'; });
  $$('.js-tg').forEach(function (a) { a.href = C.telegramUrl || '#'; });
  $$('.js-vk').forEach(function (a) { a.href = C.vkUrl || '#'; });
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* Шапка при скролле + мобильная панель */
  var top = $('#top'), mbar = $('.mbar'), hero = $('.hero');
  function onScroll() {
    var s = window.scrollY;
    top.classList.toggle('scrolled', s > 20);
    if (mbar && hero) mbar.classList.toggle('show', s > hero.offsetHeight * 0.6);
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* Бургер */
  var burger = $('#burger'), menu = $('#menu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.classList.toggle('open', open);
    top.classList.toggle('menu-open', open);
  }
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* Появление блоков */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else { $$('.reveal').forEach(function (el) { el.classList.add('in'); }); }

  /* Клик по карточке — выбираем услугу в форме */
  $$('[data-service]').forEach(function (el) {
    el.addEventListener('click', function () {
      var r = $('#leadForm input[name="service"][value="' + el.dataset.service + '"]');
      if (r) r.checked = true;
    });
  });

  /* Маска телефона +7 (XXX) XXX-XX-XX */
  var form = $('#leadForm'), phone = form.elements.phone;
  function digits(v) { var d = v.replace(/\D/g, ''); if (d[0] === '8') d = '7' + d.slice(1); if (d && d[0] !== '7') d = '7' + d; return d.slice(0, 11); }
  function fmt(d) {
    if (!d) return '';
    var r = '+7';
    if (d.length > 1) r += ' (' + d.slice(1, 4);
    if (d.length >= 4) r += ')';
    if (d.length > 4) r += ' ' + d.slice(4, 7);
    if (d.length > 7) r += '-' + d.slice(7, 9);
    if (d.length > 9) r += '-' + d.slice(9, 11);
    return r;
  }
  phone.addEventListener('input', function () { phone.value = fmt(digits(phone.value)); });
  phone.addEventListener('focus', function () { if (!phone.value) phone.value = '+7 ('; });
  phone.addEventListener('blur', function () { if (digits(phone.value).length <= 1) phone.value = ''; });

  /* Отправка заявки */
  var msg = $('#formMsg');
  function show(text, type) { msg.textContent = text; msg.className = 'msg ' + (type || ''); }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements, ok = true;
    [f.name, f.phone].forEach(function (i) { i.classList.remove('invalid'); });
    if (f.name.value.trim().length < 2) { f.name.classList.add('invalid'); ok = false; }
    if (digits(f.phone.value).length !== 11) { f.phone.classList.add('invalid'); ok = false; }
    if (!f.consent.checked) { ok = false; }
    if (!ok) { show('Проверьте имя, телефон и согласие на обработку данных.', 'err'); return; }
    if (f.website.value) return; // бот

    var data = {
      source: 'site',
      name: f.name.value.trim(),
      phone: '+' + digits(f.phone.value),
      service: (form.querySelector('input[name="service"]:checked') || {}).value || '',
      comment: f.comment.value.trim(),
      page: location.href
    };
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; show('Отправляем…');

    var done = function () {
      btn.disabled = false; form.reset(); show('Спасибо! Заявка принята — мы перезвоним вам в ближайшее время.', 'ok');
      if (window.ym && C.metrikaId) window.ym(C.metrikaId, 'reachGoal', 'lead');
    };
    if (!C.apiUrl) { console.log('[Оливия] заявка (API не настроен):', data); setTimeout(done, 600); return; }
    fetch(C.apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); done(); })
      .catch(function () { btn.disabled = false; show('Не удалось отправить. Позвоните нам: 8-914-142-62-82', 'err'); });
  });

  /* Лайтбокс */
  var lb = $('#lightbox'), items = $$('#gallery .g'), cur = 0;
  function openLb(i) {
    cur = (i + items.length) % items.length;
    var it = items[cur], img = it.querySelector('img');
    $('#lbImg').src = it.dataset.full; $('#lbImg').alt = img.alt;
    $('#lbCap').textContent = (it.querySelector('.cap b') || {}).textContent || '';
    if (!lb.open) { if (lb.showModal) lb.showModal(); else lb.setAttribute('open', ''); }
  }
  items.forEach(function (it, i) { it.addEventListener('click', function () { openLb(i); }); });
  $('#lbClose').onclick = function () { lb.close(); };
  $('#lbPrev').onclick = function () { openLb(cur - 1); };
  $('#lbNext').onclick = function () { openLb(cur + 1); };
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') openLb(cur - 1); if (e.key === 'ArrowRight') openLb(cur + 1); });
  var sx = 0;
  lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) openLb(cur + (dx < 0 ? 1 : -1)); });

  /* Яндекс.Метрика */
  if (C.metrikaId) {
    (function (m, e, t, r, i, k, a) { m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); }; m[i].l = 1 * new Date(); k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a); })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    window.ym(C.metrikaId, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
  }
})();
