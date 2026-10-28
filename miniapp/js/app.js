(function () {
  'use strict';
  var C = window.OLIVIA || {};
  var WA = window.WebApp;                       // MAX Bridge
  var inMax = !!(WA && WA.initData);            // открыто внутри MAX
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function haptic(kind) { try { if (inMax && WA.HapticFeedback) { if (kind === 'ok') WA.HapticFeedback.notificationOccurred('success'); else WA.HapticFeedback.impactOccurred('light'); } } catch (e) {} }

  /* ---------- Пользователь MAX ---------- */
  var user = inMax && WA.initDataUnsafe ? WA.initDataUnsafe.user : null;
  var form = $('#bookForm');
  if (user && user.first_name) {
    $('#hello').textContent = 'Здравствуйте, ' + user.first_name + '!';
    form.elements.name.value = [user.first_name, user.last_name].filter(Boolean).join(' ');
  }

  /* ---------- Навигация ---------- */
  var TABS = ['home', 'catalog', 'works', 'book'];
  var stack = ['home'];
  var backBtn = $('#back');

  function render(page, dir) {
    $$('.page').forEach(function (p) {
      var on = p.dataset.page === page;
      p.hidden = !on;
      p.classList.remove('enter', 'enter-back');
      if (on) { void p.offsetWidth; p.classList.add(dir === 'back' ? 'enter-back' : 'enter'); p.scrollTop = 0; }
    });
    var tab = TABS.indexOf(page) > -1 ? page : (page === 'done' || page === 'promo' ? null : null);
    $$('.tabbar button').forEach(function (b) {
      if (b.dataset.go === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    var canBack = stack.length > 1 && page !== 'done';
    if (inMax && WA.BackButton) { canBack ? WA.BackButton.show() : WA.BackButton.hide(); backBtn.hidden = true; }
    else backBtn.hidden = !canBack;
  }
  function go(page, fromTab) {
    if (page === stack[stack.length - 1]) return;
    if (fromTab || page === 'home') stack = page === 'home' ? ['home'] : ['home', page];
    else if (page === 'done') stack = ['home', 'done'];
    else stack.push(page);
    haptic(); render(page, 'fwd');
  }
  function back() {
    if (stack.length < 2) return;
    stack.pop(); haptic(); render(stack[stack.length - 1], 'back');
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-go]');
    if (!t) return;
    if (t.dataset.service) {
      var r = form.querySelector('input[name="service"][value="' + t.dataset.service + '"]');
      if (r) r.checked = true;
    }
    go(t.dataset.go, !!t.closest('.tabbar'));
  });
  backBtn.addEventListener('click', back);
  if (inMax && WA.BackButton) WA.BackButton.onClick(back);
  render('home');

  /* ---------- Дни замера: ближайшие 7 дней ---------- */
  var DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  var DAYS_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  var MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  var daysBox = $('#days');
  for (var i = 1; i <= 7; i++) {
    var d = new Date(); d.setDate(d.getDate() + i);
    var iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var lab = document.createElement('label');
    lab.innerHTML = '<input type="radio" name="day" value="' + iso + '"' + (i === 1 ? ' checked' : '') + '>' +
      '<span>' + (i === 1 ? 'Завтра' : DAYS[d.getDay()]) + '<small>' + d.getDate() + ' ' + MONTHS[d.getMonth()] + '</small></span>';
    lab.querySelector('input').dataset.human = (i === 1 ? 'завтра, ' : DAYS_FULL[d.getDay()] + ', ') + d.getDate() + ' ' + MONTHS[d.getMonth()];
    daysBox.appendChild(lab);
  }
  form.addEventListener('change', function (e) { if (e.target.type === 'radio') haptic(); });

  /* ---------- Телефон ---------- */
  var phone = form.elements.phone, contact = null;
  function digits(v) { var x = v.replace(/\D/g, ''); if (x[0] === '8') x = '7' + x.slice(1); if (x && x[0] !== '7') x = '7' + x; return x.slice(0, 11); }
  function fmt(x) {
    if (!x) return '';
    var r = '+7';
    if (x.length > 1) r += ' (' + x.slice(1, 4);
    if (x.length >= 4) r += ')';
    if (x.length > 4) r += ' ' + x.slice(4, 7);
    if (x.length > 7) r += '-' + x.slice(7, 9);
    if (x.length > 9) r += '-' + x.slice(9, 11);
    return r;
  }
  phone.addEventListener('input', function () { contact = null; phone.value = fmt(digits(phone.value)); });
  phone.addEventListener('focus', function () { if (!phone.value) phone.value = '+7 ('; });
  phone.addEventListener('blur', function () { if (digits(phone.value).length <= 1) phone.value = ''; });

  // Номер из MAX одним нажатием
  var shareBtn = $('#sharePhone');
  if (inMax && typeof WA.requestContact === 'function') {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', function () {
      WA.requestContact().then(function (res) {
        contact = res; phone.value = fmt(digits(String(res.phone))); phone.classList.remove('invalid'); haptic('ok');
      }).catch(function () {});
    });
  }

  /* ---------- Отправка ---------- */
  var err = $('#bookErr'), btn = $('#bookBtn');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements, ok = true;
    f.name.classList.remove('invalid'); phone.classList.remove('invalid'); err.textContent = '';
    if (f.name.value.trim().length < 2) { f.name.classList.add('invalid'); ok = false; }
    if (digits(phone.value).length !== 11) { phone.classList.add('invalid'); ok = false; }
    if (!f.consent.checked) ok = false;
    if (!ok) { err.textContent = 'Проверьте имя, телефон и согласие на обработку данных.'; return; }

    var day = form.querySelector('input[name="day"]:checked');
    var time = form.querySelector('input[name="time"]:checked');
    var data = {
      source: inMax ? 'max' : 'miniapp-web',
      name: f.name.value.trim(),
      phone: '+' + digits(phone.value),
      service: form.querySelector('input[name="service"]:checked').value,
      date: day ? day.value : '',
      time: time ? time.value : '',
      comment: f.comment.value.trim(),
      max_init_data: inMax ? WA.initData : '',     // проверяется на сервере
      max_contact: contact                         // {phone, authDate, hash} — если номер взят из MAX
    };
    var human = (day ? day.dataset.human : '') + (time ? ', ' + time.value : '');

    btn.disabled = true; btn.textContent = 'Отправляем…';
    var finish = function () {
      btn.disabled = false; btn.textContent = 'Записаться на замер';
      $('#doneText').textContent = 'Замер: ' + human + '. Оля свяжется с вами для подтверждения.';
      haptic('ok'); go('done');
    };
    if (!C.apiUrl) { console.log('[Оливия] заявка (API не настроен):', data); setTimeout(finish, 500); return; }
    fetch(C.apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); finish(); })
      .catch(function () {
        btn.disabled = false; btn.textContent = 'Записаться на замер';
        err.textContent = 'Не удалось отправить. Позвоните: ' + (C.phoneText || '8-914-142-62-82');
      });
  });

  /* ---------- Просмотр фото ---------- */
  var viewer = $('#viewer'), vImg = $('#viewerImg');
  $$('#works .w').forEach(function (w) {
    w.addEventListener('click', function () { vImg.src = w.dataset.full; vImg.alt = w.querySelector('img').alt; viewer.hidden = false; haptic(); });
  });
  $('#viewerX').addEventListener('click', function () { viewer.hidden = true; });
  viewer.addEventListener('click', function (e) { if (e.target === viewer) viewer.hidden = true; });
})();
