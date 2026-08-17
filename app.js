const tg = window.Telegram?.WebApp;
try {
  tg?.ready();
  tg?.expand();
  tg?.setHeaderColor?.('#f2efe8');
  tg?.setBackgroundColor?.('#f2efe8');
} catch {}

const SERVICES = [
  {id:'haircut',name:'Мужская стрижка',desc:'Консультация, стрижка и укладка',price:1800,duration:60},
  {id:'beard',name:'Борода',desc:'Форма, контур и уход',price:1200,duration:40},
  {id:'combo',name:'Стрижка + борода',desc:'Полный образ за один визит',price:2700,duration:90},
  {id:'kids',name:'Детская стрижка',desc:'Для гостей до 12 лет',price:1400,duration:45},
  {id:'father',name:'Отец + сын',desc:'Две стрижки в одном визите',price:2900,duration:90},
  {id:'premium',name:'Premium уход',desc:'Стрижка, борода, маска и укладка',price:3500,duration:110},
];

const BARBERS = [
  {id:'artem',name:'Артём',role:'Старший барбер',rating:'4.9',initials:'А'},
  {id:'timur',name:'Тимур',role:'Барбер',rating:'4.8',initials:'Т'},
  {id:'daniil',name:'Даниил',role:'Барбер',rating:'4.9',initials:'Д'},
  {id:'roman',name:'Роман',role:'Топ-барбер',rating:'5.0',initials:'Р'},
];

const TIME_SLOTS = ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

let page = 'home';
let ownerMode = false;
let adminTab = 'today';
let booking = {serviceId:null,barberId:null,date:null,time:null};

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('ru-RU').format(Number(n||0))+' ₽';
const escapeHtml = v => String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const serviceById = id => SERVICES.find(x=>x.id===id);
const barberById = id => BARBERS.find(x=>x.id===id);

function getBookings(){
  try{return JSON.parse(localStorage.getItem('brut_demo_bookings')||localStorage.getItem('boroda_demo_bookings')||'[]')}catch{return[]}
}
function saveBookings(items){
  localStorage.setItem('brut_demo_bookings',JSON.stringify(items));
}
function toast(msg){
  const t=$('toast');t.textContent=msg;t.classList.remove('hidden');
  clearTimeout(window.__tt);window.__tt=setTimeout(()=>t.classList.add('hidden'),2200);
}
function nextDates(){
  const list=[],w=new Intl.DateTimeFormat('ru-RU',{weekday:'short'}),d=new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit'});
  for(let i=0;i<7;i++){
    const x=new Date();x.setHours(12,0,0,0);x.setDate(x.getDate()+i);
    list.push({iso:x.toISOString().slice(0,10),week:i===0?'Сегодня':w.format(x).replace('.',''),day:d.format(x)})
  }
  return list
}
function reservedTimes(date,barberId){
  return new Set(getBookings().filter(b=>b.date===date&&b.barberId===barberId&&b.status!=='cancelled').map(b=>b.time))
}

function renderHome(){
  return `
    <section class="hero">
      <div class="hero-top">
        <span class="hero-kicker">СОВРЕМЕННАЯ КЛАССИКА</span>
        <span class="hero-place">Казань<br>ежедневно 10:00–21:00</span>
      </div>

      <div class="hero-copy">
        <h1>Стрижка, которая работает на тебя.</h1>
        <p>Чистая форма, точные детали и запись без звонков. Выбери услугу, мастера и свободное время прямо в Telegram.</p>
        <div class="hero-cta-row">
          <button class="hero-cta" data-open-booking type="button">Записаться онлайн</button>
          <button class="hero-secondary" data-open-my type="button">Мои записи</button>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">
        <div>
          <span>УСЛУГИ</span>
          <h2>Без лишнего</h2>
        </div>
        <p>Понятный прайс и фиксированное время на каждую услугу.</p>
      </div>

      <div class="price-list">
        ${SERVICES.map(s=>`
          <button class="price-row" data-fast-service="${s.id}" type="button">
            <div class="price-main">
              <strong>${escapeHtml(s.name)}</strong>
              <span>${escapeHtml(s.desc)}</span>
            </div>
            <div class="price-side">
              <strong>${money(s.price)}</strong>
              <span>${s.duration} мин</span>
            </div>
          </button>
        `).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-title">
        <div>
          <span>КОМАНДА</span>
          <h2>Выбери своего мастера</h2>
        </div>
        <p>У каждого свой стиль, но один стандарт качества.</p>
      </div>

      <div class="team-scroll">
        ${BARBERS.map(b=>`
          <button class="team-card" data-fast-barber="${b.id}" type="button">
            <div class="team-photo"><span>${b.initials}</span></div>
            <div class="team-meta">
              <div>
                <strong>${b.name}</strong>
                <small>${b.role}</small>
              </div>
              <span class="team-rating">★ ${b.rating}</span>
            </div>
          </button>
        `).join('')}
      </div>
    </section>

    <section class="section">
      <div class="about-grid">
        <article class="about-card">
          <span>01 / ПОДХОД</span>
          <strong>Не просто подстричь.</strong>
          <p>Сначала понимаем форму, потом работаем с деталями и укладкой.</p>
        </article>
        <article class="about-card light">
          <span>02 / СЕРВИС</span>
          <strong>Запись за минуту.</strong>
          <p>Без звонков, переписки и ожидания подтверждения.</p>
        </article>
      </div>
    </section>
  `;
}

function renderMyBookings(){
  const list=getBookings().slice().reverse();
  return `
    <section class="page-head">
      <span>ЛИЧНЫЙ КАБИНЕТ</span>
      <h1>Мои записи</h1>
    </section>

    <div class="booking-list">
      ${list.length?list.map(b=>{
        const s=serviceById(b.serviceId),barber=barberById(b.barberId);
        return `
          <article class="booking-card">
            <div class="booking-card-head">
              <strong>${escapeHtml(s?.name||'Услуга')}</strong>
              <span class="status">${b.status==='cancelled'?'Отменена':'Подтверждена'}</span>
            </div>
            <div class="booking-details">
              <div><span>Мастер</span><strong>${escapeHtml(barber?.name||'—')}</strong></div>
              <div><span>Дата</span><strong>${escapeHtml(b.date||'')}</strong></div>
              <div><span>Время</span><strong>${escapeHtml(b.time||'')}</strong></div>
              <div><span>Стоимость</span><strong>${money(s?.price||0)}</strong></div>
            </div>
            ${b.status!=='cancelled'?`<button class="cancel-button" data-cancel="${b.id}" type="button">Отменить запись</button>`:''}
          </article>
        `
      }).join(''):`
        <div class="empty">
          <strong>Записей пока нет</strong>
          <span>Нажмите «Записаться» и выберите удобное время.</span>
        </div>
      `}
    </div>
  `;
}

function renderOwner(){
  const all=getBookings(),active=all.filter(x=>x.status!=='cancelled'),todayIso=new Date().toISOString().slice(0,10);
  const today=active.filter(x=>x.date===todayIso);
  const revenue=active.reduce((s,b)=>s+(serviceById(b.serviceId)?.price||0),0);

  let rows='';
  if(adminTab==='today'){
    rows=today.length?today.map(b=>{
      const s=serviceById(b.serviceId),bar=barberById(b.barberId);
      return `<div class="dashboard-row"><div><strong>${b.time} · ${escapeHtml(b.name)}</strong><span>${s?.name||''} · ${bar?.name||''}</span></div><div class="right"><strong>${money(s?.price||0)}</strong><span>${escapeHtml(b.phone||'')}</span></div></div>`
    }).join(''):`<div class="empty"><strong>Сегодня пока свободно</strong><span>Создай тестовую запись в клиентском режиме.</span></div>`;
  }else if(adminTab==='services'){
    rows=SERVICES.map(s=>`<div class="dashboard-row"><div><strong>${s.name}</strong><span>${s.duration} мин</span></div><div class="right"><strong>${money(s.price)}</strong><span>Активна</span></div></div>`).join('');
  }else if(adminTab==='barbers'){
    rows=BARBERS.map(b=>`<div class="dashboard-row"><div><strong>${b.name}</strong><span>${b.role}</span></div><div class="right"><strong>★ ${b.rating}</strong><span>10:00–21:00</span></div></div>`).join('');
  }else{
    rows=active.length?active.slice().reverse().map(b=>{
      const s=serviceById(b.serviceId),bar=barberById(b.barberId);
      return `<div class="dashboard-row"><div><strong>${escapeHtml(b.name||'Клиент')}</strong><span>${b.date} · ${b.time}</span></div><div class="right"><strong>${bar?.name||''}</strong><span>${s?.name||''}</span></div></div>`
    }).join(''):`<div class="empty"><strong>Клиентов пока нет</strong></div>`;
  }

  return `
    <section class="dashboard">
      <div class="dashboard-hero">
        <span>BRUT / ADMIN</span>
        <h1>Управление барбершопом</h1>
        <p>Расписание, услуги, команда и клиенты в одном интерфейсе.</p>
      </div>

      <div class="metrics">
        <div class="metric"><strong>${today.length}</strong><span>записей сегодня</span></div>
        <div class="metric"><strong>${active.length}</strong><span>активных записей</span></div>
        <div class="metric"><strong>${money(revenue)}</strong><span>выручка</span></div>
      </div>

      <div class="dashboard-tabs">
        ${[['today','Сегодня'],['services','Услуги'],['barbers','Мастера'],['clients','Клиенты']].map(([id,label])=>`<button class="dashboard-tab ${adminTab===id?'active':''}" data-admin-tab="${id}" type="button">${label}</button>`).join('')}
      </div>

      <div class="dashboard-list">${rows}</div>
    </section>
  `;
}

function renderPage(){
  $('main').innerHTML=ownerMode?renderOwner():(page==='my'?renderMyBookings():renderHome());
  $('floatingBookButton').classList.toggle('hidden',ownerMode||page==='my');
  bindPage();
}

function bindPage(){
  document.querySelectorAll('[data-open-booking]').forEach(x=>x.onclick=()=>openBooking());
  document.querySelectorAll('[data-open-my]').forEach(x=>x.onclick=()=>{page='my';renderPage();scrollTo(0,0)});
  document.querySelectorAll('[data-fast-service]').forEach(x=>x.onclick=()=>{booking={serviceId:x.dataset.fastService,barberId:null,date:null,time:null};openBooking()});
  document.querySelectorAll('[data-fast-barber]').forEach(x=>x.onclick=()=>{booking={serviceId:'haircut',barberId:x.dataset.fastBarber,date:null,time:null};openBooking()});
  document.querySelectorAll('[data-cancel]').forEach(x=>x.onclick=()=>{
    const list=getBookings(),item=list.find(b=>b.id===x.dataset.cancel);
    if(item){item.status='cancelled';saveBookings(list);toast('Запись отменена');renderPage()}
  });
  document.querySelectorAll('[data-admin-tab]').forEach(x=>x.onclick=()=>{adminTab=x.dataset.adminTab;renderPage()});
}

function bookingStep(){
  if(!booking.serviceId)return 1;
  if(!booking.barberId)return 2;
  if(!booking.date||!booking.time)return 3;
  return 4;
}
function openBooking(){
  $('bookingOverlay').classList.remove('hidden');
  renderBooking();
}
function closeBooking(){
  $('bookingOverlay').classList.add('hidden')
}
function renderProgress(step){
  $('bookingProgress').innerHTML=[1,2,3,4].map(i=>`<span class="${i<=step?'active':''}"></span>`).join('');
}
function renderBooking(){
  const step=bookingStep();
  $('overlayBack').classList.toggle('hidden',step===1);
  renderProgress(step);

  if(step===1){
    $('overlayEyebrow').textContent='ШАГ 1 ИЗ 4';
    $('overlayTitle').textContent='Выберите услугу';
    $('bookingContent').innerHTML=`<div class="choice-list">${SERVICES.map(s=>`
      <button class="choice-item" data-service="${s.id}" type="button">
        <div class="choice-copy"><strong>${s.name}</strong><span>${s.desc}</span></div>
        <div class="choice-price"><strong>${money(s.price)}</strong><span>${s.duration} мин</span></div>
      </button>`).join('')}</div>`;
  }else if(step===2){
    $('overlayEyebrow').textContent='ШАГ 2 ИЗ 4';
    $('overlayTitle').textContent='Выберите мастера';
    $('bookingContent').innerHTML=`<div class="choice-list">${BARBERS.map(b=>`
      <button class="choice-item barber-choice" data-barber="${b.id}" type="button">
        <div class="barber-thumb">${b.initials}</div>
        <div class="choice-copy"><strong>${b.name}</strong><span>${b.role}</span></div>
        <div class="choice-price"><strong>★ ${b.rating}</strong><span>выбрать</span></div>
      </button>`).join('')}</div>`;
  }else if(step===3){
    const dates=nextDates(),selected=booking.date||dates[0].iso;booking.date=selected;
    const reserved=reservedTimes(selected,booking.barberId);
    $('overlayEyebrow').textContent='ШАГ 3 ИЗ 4';
    $('overlayTitle').textContent='Дата и время';
    $('bookingContent').innerHTML=`
      <div class="date-row">${dates.map(d=>`<button class="date-pill ${d.iso===selected?'active':''}" data-date="${d.iso}" type="button"><strong>${d.week}</strong><span>${d.day}</span></button>`).join('')}</div>
      <div class="times">${TIME_SLOTS.map(t=>`<button class="time-pill ${booking.time===t?'active':''}" data-time="${t}" ${reserved.has(t)?'disabled':''} type="button">${t}</button>`).join('')}</div>
    `;
  }else{
    const s=serviceById(booking.serviceId),b=barberById(booking.barberId);
    $('overlayEyebrow').textContent='ШАГ 4 ИЗ 4';
    $('overlayTitle').textContent='Подтвердите запись';
    $('bookingContent').innerHTML=`
      <div class="booking-summary">
        <div class="summary-row"><span>Услуга</span><strong>${s.name}</strong></div>
        <div class="summary-row"><span>Мастер</span><strong>${b.name}</strong></div>
        <div class="summary-row"><span>Дата</span><strong>${booking.date}</strong></div>
        <div class="summary-row"><span>Время</span><strong>${booking.time}</strong></div>
        <div class="summary-row"><span>Стоимость</span><strong>${money(s.price)}</strong></div>
      </div>
      <div class="form">
        <div class="field"><label>Имя</label><input id="clientName" value="${escapeHtml(tg?.initDataUnsafe?.user?.first_name||'Камиль')}" placeholder="Ваше имя"></div>
        <div class="field"><label>Телефон</label><input id="clientPhone" value="+7 999 123-45-67" placeholder="+7"></div>
        <div class="field"><label>Комментарий</label><textarea id="clientComment" placeholder="Пожелания к стрижке"></textarea></div>
        <button class="confirm-button" data-confirm type="button">Подтвердить запись</button>
      </div>
    `;
  }
  bindBooking();
}

function bindBooking(){
  document.querySelectorAll('[data-service]').forEach(x=>x.onclick=()=>{booking.serviceId=x.dataset.service;renderBooking()});
  document.querySelectorAll('[data-barber]').forEach(x=>x.onclick=()=>{booking.barberId=x.dataset.barber;renderBooking()});
  document.querySelectorAll('[data-date]').forEach(x=>x.onclick=()=>{booking.date=x.dataset.date;booking.time=null;renderBooking()});
  document.querySelectorAll('[data-time]').forEach(x=>x.onclick=()=>{booking.time=x.dataset.time;renderBooking()});
  document.querySelectorAll('[data-confirm]').forEach(x=>x.onclick=confirmBooking);
}

function backBooking(){
  const step=bookingStep();
  if(step===4){booking.time=null}
  else if(step===3){booking.barberId=null;booking.date=null;booking.time=null}
  else if(step===2){booking.serviceId=null;booking.barberId=null}
  renderBooking()
}

function confirmBooking(){
  const name=$('clientName')?.value.trim(),phone=$('clientPhone')?.value.trim();
  if(!name||!phone){toast('Заполните имя и телефон');return}
  if(reservedTimes(booking.date,booking.barberId).has(booking.time)){
    toast('Это время уже заняли');booking.time=null;renderBooking();return
  }
  const list=getBookings();
  list.push({
    id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),
    ...booking,name,phone,
    comment:$('clientComment')?.value.trim()||'',
    status:'confirmed',createdAt:new Date().toISOString()
  });
  saveBookings(list);
  try{tg?.HapticFeedback?.notificationOccurred('success')}catch{}
  toast('Запись подтверждена');
  booking={serviceId:null,barberId:null,date:null,time:null};
  closeBooking();page='my';renderPage();scrollTo(0,0)
}

$('floatingBookButton').onclick=()=>openBooking();
$('closeOverlay').onclick=()=>closeBooking();
$('overlayBack').onclick=()=>backBooking();
$('logoButton').onclick=()=>{ownerMode=false;page='home';$('ownerModeBtn').textContent='Владелец';renderPage();scrollTo(0,0)};
$('myBookingsButton').onclick=()=>{ownerMode=false;page='my';renderPage();scrollTo(0,0)};
$('ownerModeBtn').onclick=()=>{
  ownerMode=!ownerMode;
  $('ownerModeBtn').textContent=ownerMode?'Клиент':'Владелец';
  renderPage();scrollTo(0,0)
};

renderPage();
