const tg = window.Telegram?.WebApp;
try {
  tg?.ready();
  tg?.expand();
  if (tg?.setHeaderColor) tg.setHeaderColor('#0d0d0e');
  if (tg?.setBackgroundColor) tg.setBackgroundColor('#0d0d0e');
} catch {}

const SERVICES = [
  { id:'haircut', name:'Мужская стрижка', desc:'Подбор формы, стрижка и укладка', price:1800, duration:60 },
  { id:'beard', name:'Моделирование бороды', desc:'Форма, контуры и уход', price:1200, duration:40 },
  { id:'combo', name:'Стрижка + борода', desc:'Полный комплекс', price:2700, duration:90 },
  { id:'kids', name:'Детская стрижка', desc:'До 12 лет', price:1400, duration:45 },
  { id:'father', name:'Отец + сын', desc:'Две стрижки за один визит', price:2900, duration:90 },
  { id:'premium', name:'Premium уход', desc:'Стрижка, борода, маска и укладка', price:3500, duration:110 },
];

const BARBERS = [
  { id:'artem', name:'Артём', role:'Старший барбер', rating:'4.9', initials:'АБ' },
  { id:'timur', name:'Тимур', role:'Барбер', rating:'4.8', initials:'ТМ' },
  { id:'daniil', name:'Даниил', role:'Барбер', rating:'4.9', initials:'ДН' },
  { id:'roman', name:'Роман', role:'Топ-барбер', rating:'5.0', initials:'РМ' },
];

const TIME_SLOTS = ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

let view = 'home';
let ownerMode = false;
let adminTab = 'today';

let booking = {
  serviceId:null,
  barberId:null,
  date:null,
  time:null,
};

function money(n){
  return new Intl.NumberFormat('ru-RU').format(Number(n||0)) + ' ₽';
}

function escapeHtml(value){
  return String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;');
}

function getBookings(){
  try {
    return JSON.parse(localStorage.getItem('boroda_demo_bookings') || '[]');
  } catch {
    return [];
  }
}

function saveBookings(items){
  localStorage.setItem('boroda_demo_bookings', JSON.stringify(items));
}

function toast(message){
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

function serviceById(id){ return SERVICES.find(x => x.id === id); }
function barberById(id){ return BARBERS.find(x => x.id === id); }

function nextDates(){
  const list = [];
  const fmtWeek = new Intl.DateTimeFormat('ru-RU',{weekday:'short'});
  const fmtDay = new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit'});
  for(let i=0;i<7;i++){
    const d = new Date();
    d.setHours(12,0,0,0);
    d.setDate(d.getDate()+i);
    list.push({
      iso:d.toISOString().slice(0,10),
      week:i===0?'Сегодня':fmtWeek.format(d).replace('.',''),
      day:fmtDay.format(d),
    });
  }
  return list;
}

function reservedTimes(date, barberId){
  return new Set(
    getBookings()
      .filter(b => b.date === date && b.barberId === barberId && b.status !== 'cancelled')
      .map(b => b.time)
  );
}

function setView(next){
  ownerMode = false;
  view = next;
  document.getElementById('bottomNav').classList.remove('hidden');
  document.querySelectorAll('[data-nav]').forEach(btn => btn.classList.toggle('active', btn.dataset.nav === next));
  render();
  window.scrollTo({top:0,behavior:'smooth'});
}

function render(){
  const main = document.getElementById('main');
  if(ownerMode){
    main.innerHTML = renderAdmin();
    bindAdmin();
    return;
  }
  if(view === 'home') main.innerHTML = renderHome();
  else if(view === 'booking') main.innerHTML = renderBooking();
  else main.innerHTML = renderMyBookings();
  bindCurrent();
}

function renderHome(){
  const recent = getBookings().filter(x => x.status !== 'cancelled').slice(-1)[0];
  return `
    <section class="hero">
      <span class="hero-badge">КАЗАНЬ · ЕЖЕДНЕВНО 10:00–21:00</span>
      <h2>Свежий образ. Без лишних звонков.</h2>
      <p>Выберите услугу, мастера и свободное время — запись займёт меньше минуты.</p>
      <div class="hero-actions">
        <button class="primary-btn" data-go-booking type="button">Записаться</button>
        <button class="secondary-btn" data-go-my type="button">Мои записи</button>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h3>Услуги</h3>
        <span>актуальный прайс</span>
      </div>
      <div class="grid two">
        ${SERVICES.slice(0,4).map(s => `
          <button class="service-card" data-service-fast="${s.id}" type="button">
            <div class="service-top">
              <strong>${escapeHtml(s.name)}</strong>
              <strong>${money(s.price)}</strong>
            </div>
            <p>${escapeHtml(s.desc)}</p>
            <div class="service-meta">
              <span>${s.duration} мин</span>
              <span>Записаться →</span>
            </div>
          </button>
        `).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h3>Мастера</h3>
        <span>наша команда</span>
      </div>
      <div class="barbers-row">
        ${BARBERS.map(b => `
          <button class="barber-card" data-barber-fast="${b.id}" type="button">
            <div class="avatar">${b.initials}</div>
            <strong>${b.name}</strong>
            <span>${b.role}</span>
            <div class="rating">★ ${b.rating}</div>
          </button>
        `).join('')}
      </div>
    </section>

    ${recent ? `
      <section class="section">
        <div class="section-head">
          <h3>Ближайшая запись</h3>
          <span>сохранена в приложении</span>
        </div>
        ${bookingCard(recent)}
      </section>
    ` : ''}
  `;
}

function currentStep(){
  if(!booking.serviceId) return 1;
  if(!booking.barberId) return 2;
  if(!booking.date || !booking.time) return 3;
  return 4;
}

function renderProgress(step){
  return `<div class="booking-progress">
    ${[1,2,3,4].map(x => `<span class="progress-dot ${x<=step?'active':''}"></span>`).join('')}
  </div>`;
}

function renderBooking(){
  const step = currentStep();
  if(step === 1){
    return `
      ${renderProgress(step)}
      <h2 class="step-title">Выберите услугу</h2>
      <p class="step-subtitle">Стоимость и длительность видны заранее.</p>
      <div class="grid two">
        ${SERVICES.map(s => `
          <button class="service-card" data-select-service="${s.id}" type="button">
            <div class="service-top"><strong>${s.name}</strong><strong>${money(s.price)}</strong></div>
            <p>${s.desc}</p>
            <div class="service-meta"><span>${s.duration} мин</span></div>
          </button>
        `).join('')}
      </div>
    `;
  }

  if(step === 2){
    const service = serviceById(booking.serviceId);
    return `
      ${renderProgress(step)}
      <div class="chips"><button class="chip active" data-reset-service type="button">${service.name} · ${money(service.price)}</button></div>
      <div style="height:14px"></div>
      <h2 class="step-title">Выберите мастера</h2>
      <p class="step-subtitle">Можно выбрать любого свободного мастера.</p>
      <div class="barbers-row">
        ${BARBERS.map(b => `
          <button class="barber-card" data-select-barber="${b.id}" type="button">
            <div class="avatar">${b.initials}</div>
            <strong>${b.name}</strong>
            <span>${b.role}</span>
            <div class="rating">★ ${b.rating}</div>
          </button>
        `).join('')}
      </div>
      <div style="margin-top:14px">
        <button class="secondary-btn" data-reset-service type="button">Назад к услугам</button>
      </div>
    `;
  }

  if(step === 3){
    const service = serviceById(booking.serviceId);
    const barber = barberById(booking.barberId);
    const dates = nextDates();
    const selectedDate = booking.date || dates[0].iso;
    booking.date = selectedDate;
    const reserved = reservedTimes(selectedDate, booking.barberId);
    return `
      ${renderProgress(step)}
      <div class="chips">
        <button class="chip" data-reset-service type="button">${service.name}</button>
        <button class="chip" data-reset-barber type="button">${barber.name}</button>
      </div>
      <div style="height:14px"></div>
      <h2 class="step-title">Дата и время</h2>
      <p class="step-subtitle">Свободные слоты обновляются автоматически.</p>

      <div class="date-scroll">
        ${dates.map(d => `
          <button class="date-btn ${d.iso===selectedDate?'active':''}" data-date="${d.iso}" type="button">
            <strong>${d.week}</strong>
            <span>${d.day}</span>
          </button>
        `).join('')}
      </div>

      <div class="section">
        <div class="section-head"><h3>Свободное время</h3><span>${barber.name}</span></div>
        <div class="slots">
          ${TIME_SLOTS.map(t => `
            <button class="slot-btn ${booking.time===t?'active':''}" data-time="${t}" ${reserved.has(t)?'disabled':''} type="button">
              ${t}
            </button>
          `).join('')}
        </div>
      </div>

      <div style="margin-top:14px">
        <button class="secondary-btn" data-reset-barber type="button">Назад к мастерам</button>
      </div>
    `;
  }

  const service = serviceById(booking.serviceId);
  const barber = barberById(booking.barberId);
  return `
    ${renderProgress(step)}
    <h2 class="step-title">Почти готово</h2>
    <p class="step-subtitle">Проверьте детали и подтвердите запись.</p>

    <div class="summary-card">
      <div class="summary-line"><span>Услуга</span><strong>${service.name}</strong></div>
      <div class="summary-line"><span>Мастер</span><strong>${barber.name}</strong></div>
      <div class="summary-line"><span>Дата</span><strong>${booking.date}</strong></div>
      <div class="summary-line"><span>Время</span><strong>${booking.time}</strong></div>
      <div class="summary-line"><span>Стоимость</span><strong>${money(service.price)}</strong></div>
    </div>

    <div class="form-grid">
      <div class="field">
        <label>Имя</label>
        <input id="clientName" value="${escapeHtml(tg?.initDataUnsafe?.user?.first_name || 'Камиль')}" placeholder="Ваше имя">
      </div>
      <div class="field">
        <label>Телефон</label>
        <input id="clientPhone" value="+7 999 123-45-67" placeholder="+7">
      </div>
      <div class="field">
        <label>Комментарий</label>
        <textarea id="clientComment" placeholder="Например: хочу оставить длину сверху"></textarea>
      </div>
      <button class="primary-btn" data-confirm-booking type="button">Подтвердить запись</button>
      <button class="secondary-btn" data-back-time type="button">Изменить время</button>
    </div>
  `;
}

function bookingCard(b){
  const s = serviceById(b.serviceId);
  const barber = barberById(b.barberId);
  return `
    <article class="booking-card">
      <div class="booking-head">
        <div><strong>${s?.name || 'Услуга'}</strong></div>
        <span class="booking-status">${b.status==='cancelled'?'Отменена':'Подтверждена'}</span>
      </div>
      <div class="booking-info">
        <div><span>Мастер</span><strong>${barber?.name || '—'}</strong></div>
        <div><span>Дата и время</span><strong>${b.date} · ${b.time}</strong></div>
        <div><span>Стоимость</span><strong>${money(s?.price || 0)}</strong></div>
      </div>
      ${b.status!=='cancelled'?`
        <div class="booking-actions">
          <button class="danger-btn" data-cancel-booking="${b.id}" type="button">Отменить запись</button>
        </div>
      `:''}
    </article>
  `;
}

function renderMyBookings(){
  const list = getBookings().slice().reverse();
  return `
    <div class="section-head">
      <div>
        <h3 style="font-size:22px">Мои записи</h3>
        <span>история посещений</span>
      </div>
    </div>
    ${list.length ? list.map(bookingCard).join('') : `
      <div class="empty">
        <strong>Записей пока нет</strong>
        <span>Выберите услугу и удобное время.</span>
        <div style="margin-top:14px"><button class="primary-btn" data-go-booking type="button">Записаться</button></div>
      </div>
    `}
  `;
}

function confirmBooking(){
  const name = document.getElementById('clientName')?.value.trim();
  const phone = document.getElementById('clientPhone')?.value.trim();
  if(!name || !phone){
    toast('Заполните имя и телефон');
    return;
  }
  const booked = reservedTimes(booking.date, booking.barberId);
  if(booked.has(booking.time)){
    toast('Это время уже заняли. Выберите другое.');
    booking.time = null;
    render();
    return;
  }
  const items = getBookings();
  items.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    ...booking,
    name, phone,
    comment:document.getElementById('clientComment')?.value.trim() || '',
    status:'confirmed',
    createdAt:new Date().toISOString(),
  });
  saveBookings(items);

  try {
    tg?.HapticFeedback?.notificationOccurred('success');
  } catch {}

  toast('Запись подтверждена');
  booking = {serviceId:null,barberId:null,date:null,time:null};
  setView('my');
}

function bindCurrent(){
  document.querySelectorAll('[data-go-booking]').forEach(x => x.onclick = () => setView('booking'));
  document.querySelectorAll('[data-go-my]').forEach(x => x.onclick = () => setView('my'));

  document.querySelectorAll('[data-service-fast]').forEach(x => x.onclick = () => {
    booking = {serviceId:x.dataset.serviceFast,barberId:null,date:null,time:null};
    setView('booking');
  });

  document.querySelectorAll('[data-barber-fast]').forEach(x => x.onclick = () => {
    booking = {serviceId:'haircut',barberId:x.dataset.barberFast,date:null,time:null};
    setView('booking');
  });

  document.querySelectorAll('[data-select-service]').forEach(x => x.onclick = () => {
    booking.serviceId=x.dataset.selectService; render();
  });

  document.querySelectorAll('[data-select-barber]').forEach(x => x.onclick = () => {
    booking.barberId=x.dataset.selectBarber; render();
  });

  document.querySelectorAll('[data-reset-service]').forEach(x => x.onclick = () => {
    booking={serviceId:null,barberId:null,date:null,time:null}; render();
  });

  document.querySelectorAll('[data-reset-barber]').forEach(x => x.onclick = () => {
    booking.barberId=null; booking.date=null; booking.time=null; render();
  });

  document.querySelectorAll('[data-date]').forEach(x => x.onclick = () => {
    booking.date=x.dataset.date; booking.time=null; render();
  });

  document.querySelectorAll('[data-time]').forEach(x => x.onclick = () => {
    booking.time=x.dataset.time; render();
  });

  document.querySelectorAll('[data-back-time]').forEach(x => x.onclick = () => {
    booking.time=null; render();
  });

  document.querySelectorAll('[data-confirm-booking]').forEach(x => x.onclick = confirmBooking);

  document.querySelectorAll('[data-cancel-booking]').forEach(x => x.onclick = () => {
    const id=x.dataset.cancelBooking;
    const items=getBookings();
    const item=items.find(b=>b.id===id);
    if(item){ item.status='cancelled'; saveBookings(items); toast('Запись отменена'); render(); }
  });
}

function todayIso(){ return new Date().toISOString().slice(0,10); }

function renderAdmin(){
  const all = getBookings();
  const today = all.filter(x => x.date === todayIso() && x.status !== 'cancelled');
  const active = all.filter(x => x.status !== 'cancelled');
  const revenue = active.reduce((sum,b) => sum + (serviceById(b.serviceId)?.price || 0), 0);

  let body = '';
  if(adminTab === 'today'){
    body = today.length ? today.map(b => {
      const s=serviceById(b.serviceId), bar=barberById(b.barberId);
      return `<div class="admin-row">
        <div><strong>${b.time} · ${escapeHtml(b.name)}</strong><span>${s?.name || ''} · ${bar?.name || ''}</span></div>
        <div class="right"><strong>${money(s?.price || 0)}</strong><span>${escapeHtml(b.phone)}</span></div>
      </div>`;
    }).join('') : `<div class="empty"><strong>На сегодня записей нет</strong><span>Для демо создай запись через клиентский режим.</span></div>`;
  } else if(adminTab === 'services'){
    body = SERVICES.map(s => `<div class="admin-row"><div><strong>${s.name}</strong><span>${s.duration} мин</span></div><div class="right"><strong>${money(s.price)}</strong><span>Активна</span></div></div>`).join('');
  } else if(adminTab === 'barbers'){
    body = BARBERS.map(b => `<div class="admin-row"><div><strong>${b.name}</strong><span>${b.role}</span></div><div class="right"><strong>★ ${b.rating}</strong><span>10:00–21:00</span></div></div>`).join('');
  } else {
    body = active.slice().reverse().map(b => {
      const s=serviceById(b.serviceId), bar=barberById(b.barberId);
      return `<div class="admin-row"><div><strong>${escapeHtml(b.name)}</strong><span>${b.date} · ${b.time} · ${bar?.name || ''}</span></div><div class="right"><strong>${s?.name || ''}</strong><span>${money(s?.price || 0)}</span></div></div>`;
    }).join('') || `<div class="empty"><strong>Клиентов пока нет</strong></div>`;
  }

  return `
    <div class="admin-shell">
      <section class="admin-hero">
        <h2>Управление барбершопом</h2>
        <p>Записи, команда, услуги и ключевые показатели — в одном месте.</p>
      </section>

      <div class="stats-grid">
        <div class="stat-card"><strong>${today.length}</strong><span>записей сегодня</span></div>
        <div class="stat-card"><strong>${active.length}</strong><span>всего записей</span></div>
        <div class="stat-card"><strong>${money(revenue)}</strong><span>выручка</span></div>
      </div>

      <div class="admin-tabs">
        ${[
          ['today','Сегодня'],
          ['services','Услуги'],
          ['barbers','Мастера'],
          ['clients','Клиенты'],
        ].map(([id,label]) => `<button class="admin-tab ${adminTab===id?'active':''}" data-admin-tab="${id}" type="button">${label}</button>`).join('')}
      </div>

      <div class="admin-list">${body}</div>

      <button class="secondary-btn" data-exit-owner type="button">Вернуться в клиентский режим</button>
    </div>
  `;
}

function bindAdmin(){
  document.querySelectorAll('[data-admin-tab]').forEach(x => x.onclick = () => {
    adminTab=x.dataset.adminTab; render();
  });
  document.querySelectorAll('[data-exit-owner]').forEach(x => x.onclick = exitOwnerMode);
}

function enterOwnerMode(){
  ownerMode = true;
  document.getElementById('bottomNav').classList.add('hidden');
  document.getElementById('ownerModeBtn').textContent='Клиентский режим';
  render();
  window.scrollTo({top:0,behavior:'smooth'});
}
function exitOwnerMode(){
  ownerMode = false;
  document.getElementById('bottomNav').classList.remove('hidden');
  document.getElementById('ownerModeBtn').textContent='Для владельца';
  render();
}

document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click',() => setView(btn.dataset.nav)));
document.getElementById('ownerModeBtn').addEventListener('click',() => ownerMode ? exitOwnerMode() : enterOwnerMode());

render();
