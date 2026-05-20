const SUPABASE_URL = 'HIDDEN';
const SUPABASE_KEY = 'HIDDEN';

// ── SUPABASE SYNC ──────────────────────────────────────────
async function dbSave(dateKey, entryData) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal,resolution=merge-duplicates',
        'on-conflict': 'date_key'
      },
      body: JSON.stringify({ date_key: dateKey, data: entryData })
    });
    console.log('dbSave status:', res.status);
  } catch(e) { console.error('Save failed', e); }
}

async function dbLoad() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/entries?select=date_key,data`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const rows = await res.json();
    if (!Array.isArray(rows)) return;
    const data = getData();
    rows.forEach(row => {
      data[row.date_key] = row.data;
    });
    saveData(data);
  } catch(e) { console.error('Load failed', e); }
}

async function dbDelete(dateKey) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/entries?date_key=eq.${dateKey}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
  } catch(e) { console.error('Delete failed', e); }
}

const HOROSCOPE_API_KEY = 'yJucwzQlMk7wZ4OM1YrVN64VQ8gFaI7Tg31Pn55eI';

// data helpers
function getData() {
  try { return JSON.parse(localStorage.getItem('life-tracker') || '{}'); } catch(e) { return {}; }
}
function saveData(data) {
  localStorage.setItem('life-tracker', JSON.stringify(data));
}
function getDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function today() {
  return getDateKey(new Date());
}

// state
let currentView = 'calendar';
let calendarDate = new Date();
let selectedDate = null;

// nav
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentView = btn.dataset.view;
    render();
  });
});

function render() {
  if (currentView === 'calendar') renderCalendar();
  else if (currentView === 'horoscope') renderHoroscope();
  else if (currentView === 'tarot') renderTarot();
  else renderSummary();
}

// ── HOROSCOPE ──────────────────────────────────────────────
let horoscopeCache = {};

async function renderHoroscope() {
  const main = document.getElementById('app-main');
  main.innerHTML = `
    <div class="horoscope-header">
      <img src="images/pink-star.png" style="width:32px;height:32px;object-fit:contain;" alt="">
      <h2 style="font-family:'Life Savers',cursive;font-size:2rem;color:#bd6982;margin:0.5rem 0 0.25rem;">Sagittarius</h2>
      <div style="font-size:11px;color:#665257;font-family:'Montserrat',sans-serif;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Nov 22 — Dec 21</div>
    </div>
    <div class="horoscope-tabs">
      <button class="horoscope-tab active" onclick="switchHoroscopeTab('daily',this)">Daily</button>
      <button class="horoscope-tab" onclick="switchHoroscopeTab('weekly',this)">Weekly</button>
      <button class="horoscope-tab" onclick="switchHoroscopeTab('monthly',this)">Monthly</button>
      <button class="horoscope-tab" onclick="switchHoroscopeTab('yearly',this)">Yearly</button>
    </div>
    <div id="horoscope-content"></div>`;
  fetchHoroscope('daily');
}

async function switchHoroscopeTab(period, btn) {
  document.querySelectorAll('.horoscope-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  fetchHoroscope(period);
}

async function fetchHoroscope(period) {
  const content = document.getElementById('horoscope-content');
  if (!content) return;

  if (horoscopeCache[period]) {
    showHoroscope(horoscopeCache[period], period);
    return;
  }

  content.innerHTML = `<div class="horoscope-loading">
    <img src="images/pink-star.png" style="width:24px;height:24px;object-fit:contain;animation:spin 2s linear infinite;">
    <div style="font-size:13px;color:#bd6982;font-family:'Montserrat',sans-serif;margin-top:8px;">Reading the stars...</div>
  </div>`;

  try {
    const res = await fetch(`https://api.api-ninjas.com/v1/horoscope?zodiac=sagittarius&period=${period}`, {
      headers: { 'X-Api-Key': HOROSCOPE_API_KEY }
    });
    const data = await res.json();
    horoscopeCache[period] = data;
    showHoroscope(data, period);
  } catch(e) {
    content.innerHTML = `<div class="summary-card" style="text-align:center;color:#bd6982;font-size:14px;">Could not load horoscope — check your connection.</div>`;
  }
}

function showHoroscope(data, period) {
  const content = document.getElementById('horoscope-content');
  if (!content) return;
  const date = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  content.innerHTML = `
    <div class="summary-card horoscope-card">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#bd6982;font-family:'Montserrat',sans-serif;margin-bottom:12px;">${period} horoscope · ${date}</div>
      <p style="font-size:15px;line-height:1.8;color:#392f31;font-family:'Montserrat',sans-serif;">${data.horoscope || data.description || 'No horoscope available.'}</p>
    </div>`;
}

// ── CALENDAR ──────────────────────────────────────────────
function renderCalendar() {
  if (window.innerWidth <= 430) {
    renderMobileCalendar();
    return;
  }
  const main = document.getElementById('app-main');
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const data = getData();
  const todayKey = today();

  let cells = '';
  const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  cells += dayLabels.map(d => `<div class="day-label">${d}</div>`).join('');

  for (let i = 0; i < firstDay; i++) {
    cells += `<div class="day-cell empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasData = !!data[dateKey];
    const isToday = dateKey === todayKey;
    const isTuesday = new Date(year, month, d).getDay() === 2;
    cells += `
      <div class="day-cell ${isToday ? 'today' : ''} ${hasData ? 'has-data' : ''}"
           onclick="openDay('${dateKey}')">
        <span class="day-number">${d}</span>
        ${isTuesday ? '<img src="images/poke.png" class="desktop-poke" alt="">' : ''}
        ${hasData ? '<div class="day-dots"><div class="day-dot"></div></div>' : ''}
      </div>`;
  }

  main.innerHTML = `
    <div class="calendar-header">
      <img src="images/bow.png" class="cal-bow cal-bow-left" alt="">
      <img src="images/bow.png" class="cal-bow cal-bow-right" alt="">
      <button class="cal-nav-btn" onclick="changeMonth(-1)">&#8592;</button>
      <h2>${monthName}</h2>
      <button class="cal-nav-btn" onclick="changeMonth(1)">&#8594;</button>
    </div>
    <div class="calendar-grid">${cells}</div>`;
}

let mobileWeekOffset = 0;

function renderMobileCalendar() {
  const main = document.getElementById('app-main');
  const data = getData();
  const todayKey = today();
  const now = new Date();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + (mobileWeekOffset * 7));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d);
  }

  const weekLabel = days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' — ' + days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const dayNames = ['S','M','T','W','T','F','S'];

  const dayCells = days.map((d, i) => {
    const dateKey = getDateKey(d);
    const hasData = !!data[dateKey];
    const isToday = dateKey === todayKey;
    const isTuesday = d.getDay() === 2;
    return `
      <div class="mobile-day ${isToday ? 'mobile-today' : ''} ${hasData ? 'mobile-has-data' : ''}"
           onclick="openDay('${dateKey}')">
        <div class="mobile-day-name">${dayNames[i]}</div>
        <div class="mobile-day-num">${d.getDate()}</div>
        ${isTuesday ? '<img src="images/poke.png" class="mobile-day-badge" alt="">' : ''}
        ${hasData ? '<div class="mobile-day-dot"></div>' : '<div class="mobile-day-dot" style="opacity:0"></div>'}
      </div>`;
  }).join('');

  main.innerHTML = `
    <div class="mobile-cal-header">
      <button class="cal-nav-btn" onclick="mobileWeekOffset--;renderMobileCalendar()">&#8592;</button>
      <div class="mobile-week-label">${weekLabel}</div>
      <button class="cal-nav-btn" onclick="mobileWeekOffset++;renderMobileCalendar()">&#8594;</button>
    </div>
    <div class="mobile-week-strip">${dayCells}</div>
    <div class="mobile-hint">tap any day to log</div>`;
}

// ── DAY MODAL ─────────────────────────────────────────────
function openDay(dateKey) {
  selectedDate = dateKey;
  const data = getData();
  const entry = data[dateKey] || {};
  const [year, month, day] = dateKey.split('-');
  const label = new Date(year, month-1, day).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });

  const isTuesday = new Date(year, month-1, day).getDay() === 2;

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="day-modal" onclick="closeModalOutside(event)">
      <div class="modal">
        <div class="modal-header">
          <h2>${label}</h2>
          <button class="modal-close" onclick="closeModal()">&#x2715;</button>
        </div>

        <div class="modal-body">
        ${isTuesday ? glp1Form(entry.glp1 || {}) : ''}

        ${periodDaySection(dateKey, entry.period || {})}
        
        <div class="form-section" data-icon="🌙">
          <h3>Daily tracking</h3>

          <div class="form-row">
            <label>Lightheadedness</label>
            <div class="scale-row" id="lightheaded-scale">
              ${[1,2,3,4,5].map(n => `<button class="scale-btn ${(entry.lightheaded||0)===n?'active':''}" onclick="pickScale('lightheaded',${n},this)">${n}</button>`).join('')}
            </div>
          </div>

          <div class="form-row">
            <label>Appetite</label>
            <div class="scale-row" id="appetite-scale">
              ${[1,2,3,4,5].map(n => `<button class="scale-btn ${(entry.appetite||0)===n?'active':''}" onclick="pickScale('appetite',${n},this)">${n}</button>`).join('')}
            </div>
          </div>

          <div class="form-row">
            <label>Approximate calories</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="number" id="calories-input" placeholder="0" value="${entry.calories||''}" style="width:120px;">
              <button class="checkbox-pill" onclick="toggleCalcModal()">+ calculator</button>
            </div>
          </div>

          <div class="form-row">
            <label>Protein (grams)</label>
            <input type="number" id="protein-input" placeholder="0" value="${entry.protein||''}">
          </div>

          <div class="form-row">
            <label>Poop log</label>
            <div class="checkbox-row">
              ${['Constipated','Diarrhea','Normal','Often'].map(opt =>
                `<span class="checkbox-pill ${(entry.poop||[]).includes(opt)?'active':''}"
                  onclick="togglePill(this,'poop')" data-val="${opt}">${opt}</span>`
              ).join('')}
            </div>
          </div>

          <div class="form-row">
            <label>Time woke up</label>
            <input type="time" id="wakeup-input" value="${entry.wakeup||''}">
          </div>

          <div class="form-row">
            <label>Books read today</label>
            <div id="books-list">
              ${mergeCurrentlyReading(entry.books||[], dateKey).map((b,i) => bookRow(b,i)).join('')}
            </div>
            <button class="checkbox-pill" style="margin-top:6px;" onclick="addBookRow()">+ add book</button>
          </div>
        </div>

        </div>
        <div style="padding: 1rem 1.75rem 1.5rem; border-top: 1.5px solid #d4b8c0; background: #f4eeef; border-radius: 0 0 28px 28px; position: sticky; bottom: 0; z-index: 3;">
          <button class="save-btn" onclick="saveDay()">✦ Save my day ✦</button>
        </div>
      </div>
    </div>
  </div>
  `);
}

function glp1Form(glp1) {
  const sel = glp1.site || '';
  return `
    <div class="form-section">
      <h3>GLP-1 — Tuesday log</h3>
      <div class="form-row">
        <label>Current weight (lbs)</label>
        <input type="number" id="glp1-weight" placeholder="0.0" step="0.1" value="${glp1.weight||''}">
      </div>
      <div class="form-row">
        <label>Dose (mg)</label>
        <div class="scale-row" id="dose-btns">
          ${['2.5','5','7.5','10'].map(d => `
            <button class="scale-btn ${(glp1.dose||getLastDose())==d?'active':''}" 
              onclick="document.querySelectorAll('#dose-btns .scale-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active');document.getElementById('glp1-dose').value='${d}'">
              ${d}mg
            </button>`).join('')}
        </div>
        <input type="hidden" id="glp1-dose" value="${glp1.dose||getLastDose()}">
      </div>
      <div class="form-row">
        <label>Injection site</label>
        <div style="display:flex;gap:1.5rem;align-items:flex-start;flex-wrap:wrap;">
          <div style="position:relative;width:160px;flex-shrink:0;">
            <img src="images/glp.png" style="width:160px;display:block;" alt="body diagram">
            <div class="glp-box ${sel==='Upper stomach'?'glp-checked':''}" style="top:38%;left:50%;transform:translateX(-50%);" onclick="selectSite('Upper stomach')" title="Upper stomach"></div>
            <div class="glp-box ${sel==='Left stomach'?'glp-checked':''}" style="top:47%;left:28%;" onclick="selectSite('Left stomach')" title="Left stomach"></div>
            <div class="glp-box ${sel==='Right stomach'?'glp-checked':''}" style="top:47%;right:26%;" onclick="selectSite('Right stomach')" title="Right stomach"></div>
            <div class="glp-box ${sel==='Left leg'?'glp-checked':''}" style="top:62%;left:24%;" onclick="selectSite('Left leg')" title="Left leg"></div>
            <div class="glp-box ${sel==='Right leg'?'glp-checked':''}" style="top:62%;right:22%;" onclick="selectSite('Right leg')" title="Right leg"></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;padding-top:8px;">
            ${['Upper stomach','Right stomach','Left stomach','Right leg','Left leg'].map(s=>`
              <div class="glp-pill ${sel===s?'glp-pill-active':''}" onclick="selectSite('${s}')">${s}</div>
            `).join('')}
            <div id="glp-selected" style="font-size:11px;color:#bd6982;font-weight:700;margin-top:4px;">${sel?'✦ '+sel+' selected':'tap a site'}</div>
          </div>
        </div>
      </div>
    </div>`;
}

function getLastDose() {
  const data = getData();
  const keys = Object.keys(data).sort().reverse();
  for (const k of keys) {
    if (data[k].glp1 && data[k].glp1.dose) return data[k].glp1.dose;
  }
  return '';
}

function bookRow(book, i) {
  const stars = [1,2,3,4,5].map(n =>
    `<span class="book-star ${(book.rating||0)>=n?'book-star-filled':''}" onclick="setBookRating(this,${n})" data-val="${n}">★</span>`
  ).join('');
  const status = book.status || 'reading';
  return `<div class="book-row" data-index="${i}">
    <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;">
      ${book.cover ? `<img src="${book.cover}" class="book-cover-thumb" alt="cover">` : `<div class="book-cover-placeholder">📖</div>`}
      <div style="flex:1;">
        <div style="display:flex;gap:6px;margin-bottom:4px;">
          <input type="text" placeholder="Search book title..." value="${book.title||''}" style="flex:1;" class="book-title" oninput="bookSearchDebounce(this)">
          <button onclick="this.closest('.book-row').remove()" style="background:none;border:none;cursor:pointer;color:#b0a0a4;font-size:16px;">✕</button>
        </div>
        <input type="text" placeholder="Author" value="${book.author||''}" style="width:100%;margin-bottom:6px;" class="book-author">
        <div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap;">
          <button class="book-status-btn ${status==='reading'?'book-status-active':''}" onclick="setBookStatus(this,'reading')">📖 Reading</button>
          <button class="book-status-btn ${status==='finished'?'book-status-active':''}" onclick="setBookStatus(this,'finished')">✓ Finished</button>
          <button class="book-status-btn ${status==='dnf'?'book-status-active':''}" onclick="setBookStatus(this,'dnf')">✕ DNF</button>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:4px;">
          <div class="book-stars">${stars}</div>
          <button onclick="saveBookToCurrentlyReading(this)" style="padding:4px 12px;border-radius:999px;border:1.5px solid #665257;background:#f4eeef;font-size:11px;font-weight:700;cursor:pointer;color:#392f31;font-family:'Montserrat',sans-serif;">Save book</button>
        </div>
        <div class="book-search-results"></div>
      </div>
    </div>
    <input type="hidden" class="book-cover-url" value="${book.cover||''}">
    <input type="hidden" class="book-rating" value="${book.rating||0}">
    <input type="hidden" class="book-status-val" value="${status}">
  </div>`;
}

function setBookStatus(btn, status) {
  const row = btn.closest('.book-row');
  row.querySelector('.book-status-val').value = status;
  row.querySelectorAll('.book-status-btn').forEach(b => b.classList.remove('book-status-active'));
  btn.classList.add('book-status-active');
  
  if (status === 'reading') {
    const title = row.querySelector('.book-title').value.trim();
    const author = row.querySelector('.book-author').value.trim();
    const cover = row.querySelector('.book-cover-url').value;
    if (title) {
      const books = getCurrentlyReading();
      if (!books.find(b => b.title === title)) {
        books.push({ title, author, cover });
        saveCurrentlyReading(books);
      }
    }
  }

  if (status === 'finished' || status === 'dnf') {
    const title = row.querySelector('.book-title').value.trim();
    finishCurrentBook(title);
  }
}

function saveBookToCurrentlyReading(btn) {
  const row = btn.closest('.book-row');
  const title = row.querySelector('.book-title').value.trim();
  const author = row.querySelector('.book-author').value.trim();
  const cover = row.querySelector('.book-cover-url').value;
  const status = row.querySelector('.book-status-val').value;
  const rating = parseInt(row.querySelector('.book-rating').value) || 0;
  if (!title) return;

  if (status === 'reading') {
    const books = getCurrentlyReading();
    if (!books.find(b => b.title === title)) {
      books.push({ title, author, cover });
      saveCurrentlyReading(books);
    }
  }

  if (status === 'finished' || status === 'dnf') {
    finishCurrentBook(title);
    const data = getData();
    const entry = data[selectedDate] || {};
    entry.books = entry.books || [];
    const existing = entry.books.find(b => b.title === title);
    if (existing) {
      existing.status = status;
      existing.rating = rating;
    } else {
      entry.books.push({ title, author, cover, status, rating });
    }
    data[selectedDate] = entry;
    saveData(data);
  }

  btn.textContent = '✓ Saved!';
  btn.style.background = '#bd6982';
  btn.style.color = '#f4eeef';
  setTimeout(() => { 
    btn.textContent = 'Save book'; 
    btn.style.background = ''; 
    btn.style.color = ''; 
  }, 1500);
}

function addBookRow() {
  document.getElementById('books-list').insertAdjacentHTML('beforeend', bookRow({}, Date.now()));
}

function getCurrentlyReading() {
  try { return JSON.parse(localStorage.getItem('currently-reading') || '[]'); } catch(e) { return []; }
}

function saveCurrentlyReading(books) {
  localStorage.setItem('currently-reading', JSON.stringify(books));
}

function finishCurrentBook(title) {
  const books = getCurrentlyReading();
  const updated = books.filter(b => b.title !== title);
  saveCurrentlyReading(updated);
}

let bookSearchTimer = null;
function bookSearchDebounce(input) {
  clearTimeout(bookSearchTimer);
  bookSearchTimer = setTimeout(() => searchBook(input), 600);
}

async function searchBook(input) {
  const query = input.value.trim();
  if (query.length < 3) return;
  const row = input.closest('.book-row');
  const resultsEl = row.querySelector('.book-search-results');
  resultsEl.innerHTML = '<div style="font-size:11px;color:#bd6982;font-family:Montserrat,sans-serif;padding:4px 0;">Searching...</div>';
  
  try {
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=4&fields=title,author_name,cover_i,key`);
    const data = await res.json();
    
    if (!data.docs || !data.docs.length) {
      resultsEl.innerHTML = '<div style="font-size:11px;color:#665257;padding:4px 0;">No results found</div>';
      return;
    }

    window._bookResults = window._bookResults || {};
    const rowId = 'br_' + Date.now();
    row.dataset.searchId = rowId;
    window._bookResults[rowId] = data.docs;

    resultsEl.innerHTML = data.docs.map((book, i) => {
      const title = book.title || 'Unknown';
      const author = book.author_name?.[0] || 'Unknown author';
      const coverId = book.cover_i;
      const coverThumb = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-S.jpg` : null;
      return `<button onclick="pickBook('${rowId}',${i})" style="width:100%;display:flex;gap:8px;align-items:center;padding:5px 6px;border-radius:8px;border:1.5px solid #d4b8c0;margin-bottom:3px;background:#fff;cursor:pointer;text-align:left;">
        ${coverThumb ? `<img src="${coverThumb}" style="width:24px;height:32px;object-fit:cover;border-radius:3px;flex-shrink:0;">` : '<div style="width:24px;height:32px;background:#efd8e2;border-radius:3px;flex-shrink:0;"></div>'}
        <div>
          <div style="font-size:11px;font-weight:700;color:#392f31;font-family:Montserrat,sans-serif;">${title.length>35?title.substring(0,35)+'...':title}</div>
          <div style="font-size:10px;color:#665257;font-family:Montserrat,sans-serif;">${author}</div>
        </div>
      </button>`;
    }).join('');
  } catch(e) {
    resultsEl.innerHTML = '<div style="font-size:11px;color:#bd6982;padding:4px 0;">Search failed</div>';
  }
}

function pickBook(rowId, i) {
  const books = window._bookResults?.[rowId];
  if (!books || !books[i]) return;
  const book = books[i];
  const title = book.title || '';
  const author = book.author_name?.[0] || '';
  const coverId = book.cover_i;
  const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : '';

  const rows = document.querySelectorAll('.book-row');
  let targetRow = null;
  rows.forEach(r => { if (r.dataset.searchId === rowId) targetRow = r; });
  if (!targetRow) return;

  targetRow.querySelector('.book-title').value = title;
  targetRow.querySelector('.book-author').value = author;
  targetRow.querySelector('.book-cover-url').value = coverUrl;
  targetRow.querySelector('.book-search-results').innerHTML = '';

  if (coverUrl) {
    const placeholder = targetRow.querySelector('.book-cover-placeholder');
    const existingCover = targetRow.querySelector('.book-cover-thumb');
    const imgHtml = `<img src="${coverUrl}" class="book-cover-thumb" alt="cover">`;
    if (placeholder) placeholder.outerHTML = imgHtml;
    else if (existingCover) existingCover.src = coverUrl;
  }
}

function setBookRating(star, val) {
  const row = star.closest('.book-row');
  row.querySelector('.book-rating').value = val;
  row.querySelectorAll('.book-star').forEach(s => {
    s.classList.toggle('book-star-filled', parseInt(s.dataset.val) <= val);
  });
}

function pickScale(field, val, btn) {
  btn.closest('.scale-row').querySelectorAll('.scale-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function togglePill(el) {
  el.classList.toggle('active');
}

function pickSite(el) {
  document.querySelectorAll('[onclick="pickSite(this)"]').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
}

function selectSite(site) {
  document.querySelectorAll('.glp-box').forEach(b => b.classList.remove('glp-checked'));
  document.querySelectorAll('.glp-pill').forEach(p => p.classList.remove('glp-pill-active'));
  document.querySelectorAll('.glp-box').forEach(b => {
    if (b.title === site) b.classList.add('glp-checked');
  });
  document.querySelectorAll('.glp-pill').forEach(p => {
    if (p.textContent.trim() === site) p.classList.add('glp-pill-active');
  });
  const lbl = document.getElementById('glp-selected');
  if (lbl) lbl.textContent = '✦ ' + site + ' selected';
}

function toggleCalcModal() {
  const existing = document.getElementById('calc-modal');
  if (existing) { existing.remove(); return; }
  
  const savedMeals = getSavedMeals();
  const mealsHtml = savedMeals.length ? `
    <div style="margin-bottom:10px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#bd6982;margin-bottom:6px;">Saved meals</div>
      ${savedMeals.map((m,i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #ead8c0;">
          <span style="font-size:12px;color:#392f31;font-weight:600;">${m.name}</span>
          <div style="display:flex;gap:6px;">
            <button onclick="loadSavedMeal(${i})" style="font-size:11px;padding:3px 10px;border-radius:999px;border:1.5px solid #665257;background:#f4eeef;cursor:pointer;color:#392f31;">Load</button>
            <button onclick="deleteSavedMeal(${i})" style="font-size:11px;padding:3px 10px;border-radius:999px;border:1.5px solid #665257;background:#f4eeef;cursor:pointer;color:#bd6982;">✕</button>
          </div>
        </div>`).join('')}
    </div>` : '';

  document.body.insertAdjacentHTML('beforeend', `
    <div id="calc-modal" style="position:fixed;bottom:2rem;right:2rem;background:#f4eeef;border:2px solid #665257;border-radius:20px;padding:1.5rem;width:320px;z-index:200;box-shadow:0 4px 24px rgba(57,47,49,0.15);max-height:80vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <span style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#bd6982;font-family:'Montserrat',sans-serif;">Calorie calculator</span>
        <button onclick="document.getElementById('calc-modal').remove()" style="background:#efd8e2;border:none;cursor:pointer;color:#392f31;width:26px;height:26px;border-radius:50%;font-size:14px;">✕</button>
      </div>
      ${mealsHtml}
      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <input type="text" id="calc-food" placeholder="Search food..." style="flex:1;padding:7px 10px;border:1.5px solid #665257;border-radius:10px;font-size:13px;font-family:'Montserrat',sans-serif;background:#f2eaea;color:#392f31;outline:none;">
        <button onclick="searchFood()" style="padding:7px 14px;background:#bd6982;border:none;border-radius:10px;color:#f4eeef;cursor:pointer;font-size:13px;font-weight:700;">Go</button>
      </div>
      <div id="calc-search-results" style="margin-bottom:8px;max-height:120px;overflow-y:auto;position:relative;z-index:999;"></div>
      <div style="border-top:1px solid #e8d8c0;padding-top:8px;margin-bottom:8px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#b0a0a4;font-family:'Montserrat',sans-serif;margin-bottom:6px;">Add manually</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <input type="text" id="manual-food" placeholder="Food name" style="flex:2;min-width:80px;padding:6px 10px;border:1.5px solid #665257;border-radius:8px;font-size:12px;font-family:'Montserrat',sans-serif;background:#f2eaea;color:#392f31;outline:none;">
          <input type="number" id="manual-cals" placeholder="cal" style="width:60px;padding:6px 8px;border:1.5px solid #665257;border-radius:8px;font-size:12px;background:#f2eaea;color:#392f31;outline:none;">
          <input type="number" id="manual-protein" placeholder="g pro" style="width:60px;padding:6px 8px;border:1.5px solid #665257;border-radius:8px;font-size:12px;background:#f2eaea;color:#392f31;outline:none;">
          <button onclick="addManualItem()" style="padding:6px 12px;background:#bd6982;border:none;border-radius:8px;color:#f4eeef;cursor:pointer;font-size:12px;font-weight:700;">+</button>
        </div>
      </div>
      <div id="calc-items" style="margin-bottom:8px;"></div>
      <div style="border-top:1.5px solid #665257;padding-top:10px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:13px;color:#665257;font-family:'Montserrat',sans-serif;font-weight:600;">Calories</span>
          <span style="font-size:20px;font-weight:700;color:#392f31;font-family:'Playfair Display',serif;" id="calc-total">0</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:13px;color:#665257;font-family:'Montserrat',sans-serif;font-weight:600;">Protein</span>
          <span style="font-size:16px;font-weight:700;color:#8890b8;font-family:'Playfair Display',serif;" id="calc-protein-total">0g protein</span>
        </div>
      </div>
      <div style="display:flex;gap:6px;">
        <button onclick="applyCalcTotal()" style="flex:1;padding:9px;background:#bd6982;border:none;border-radius:10px;color:#f4eeef;cursor:pointer;font-size:13px;font-weight:700;font-family:'Montserrat',sans-serif;">Use total</button>
        <button onclick="saveMealPrompt()" style="flex:1;padding:9px;background:#f4eeef;border:1.5px solid #665257;border-radius:10px;color:#392f31;cursor:pointer;font-size:13px;font-weight:700;font-family:'Montserrat',sans-serif;">Save meal</button>
      </div>
    </div>`);

  document.getElementById('calc-food').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchFood();
  });
}

async function searchFood() {
  const query = document.getElementById('calc-food').value.trim();
  if (!query) return;
  const resultsEl = document.getElementById('calc-search-results');
  resultsEl.innerHTML = '<div style="font-size:12px;color:#bd6982;font-family:Montserrat,sans-serif;">Searching...</div>';
  
  try {
    const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=5&api_key=Lub2j4c6NgVYX5wsGPWp1YjDabYJd6scB0lBd5nx`);
    const data = await res.json();
    
    if (!data.foods || !data.foods.length) {
      resultsEl.innerHTML = '<div style="font-size:12px;color:#665257;">No results found</div>';
      return;
    }

    window._foodResults = [];
    data.foods.forEach(food => {
      const energyNutrient = food.foodNutrients?.find(n => n.nutrientName === 'Energy' && n.unitName === 'KCAL');
      const proteinNutrient = food.foodNutrients?.find(n => n.nutrientName === 'Protein');
      const cals = energyNutrient ? Math.round(energyNutrient.value) : null;
      const protein = proteinNutrient ? Math.round(proteinNutrient.value) : 0;
      if (!cals) return;
      const name = food.description.length > 40 ? food.description.substring(0,40)+'...' : food.description;
      window._foodResults.push({ name, cals, protein });
    });

    resultsEl.innerHTML = window._foodResults.map((f, i) =>
      `<button onclick="pickFoodResult(${i})" style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:8px;font-size:12px;font-family:Montserrat,sans-serif;border:1.5px solid #d4b8c0;margin-bottom:4px;background:#fff;cursor:pointer;text-align:left;">
        <span style="color:#392f31;">${f.name}</span>
        <div style="display:flex;gap:8px;white-space:nowrap;">
          <span style="font-weight:700;color:#bd6982;">${f.cals} cal</span>
          ${f.protein ? `<span style="font-weight:700;color:#8890b8;">${f.protein}g protein</span>` : ''}
        </div>
      </button>`
    ).join('');

  } catch(e) {
    resultsEl.innerHTML = '<div style="font-size:12px;color:#bd6982;">Search failed — check connection</div>';
  }
}

function pickFoodResult(i) {
  const f = window._foodResults[i];
  if (!f) return;
  addCalcItem(f.name, f.cals, f.protein);
  document.getElementById('calc-search-results').innerHTML = '';
  document.getElementById('calc-food').value = '';
}

function addManualItem() {
  const name = document.getElementById('manual-food').value.trim();
  const cals = parseInt(document.getElementById('manual-cals').value) || 0;
  const protein = parseInt(document.getElementById('manual-protein').value) || 0;
  if (!name || !cals) return;
  addCalcItem(name, cals, protein);
  document.getElementById('manual-food').value = '';
  document.getElementById('manual-cals').value = '';
  document.getElementById('manual-protein').value = '';
}

function getSavedMeals() {
  try { return JSON.parse(localStorage.getItem('saved-meals') || '[]'); } catch(e) { return []; }
}

function saveMealsList(meals) {
  localStorage.setItem('saved-meals', JSON.stringify(meals));
}

function saveMealPrompt() {
  if (!calcItems.length) return;
  const name = prompt('Name this meal combo:');
  if (!name) return;
  const meals = getSavedMeals();
  meals.push({ name, items: [...calcItems] });
  saveMealsList(meals);
  document.getElementById('calc-modal').remove();
  toggleCalcModal();
}

function loadSavedMeal(i) {
  const meals = getSavedMeals();
  const meal = meals[i];
  if (!meal) return;
  calcItems = [...calcItems, ...meal.items];
  renderCalcItems();
  document.getElementById('calc-search-results').innerHTML = '';
}

function deleteSavedMeal(i) {
  const meals = getSavedMeals();
  meals.splice(i, 1);
  saveMealsList(meals);
  document.getElementById('calc-modal').remove();
  toggleCalcModal();
}

let calcItems = [];
function addCalcItem(name, cals, protein) {
  calcItems.push({food: name, cals: cals, protein: protein || 0});
  renderCalcItems();
}

function renderCalcItems() {
  const totalCals = calcItems.reduce((s,i) => s+i.cals, 0);
  const totalProtein = calcItems.reduce((s,i) => s+(i.protein||0), 0);
  document.getElementById('calc-items').innerHTML = calcItems.map((item,i) =>
    `<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;gap:8px;">
      <span style="flex:1;color:#392f31;">${item.food}</span>
      <span style="color:#bd6982;white-space:nowrap;">${item.cals} cal</span>
      ${item.protein ? `<span style="color:#8890b8;white-space:nowrap;">${item.protein}g</span>` : ''}
      <button onclick="calcItems.splice(${i},1);renderCalcItems();" style="background:none;border:none;cursor:pointer;color:#888780;">✕</button>
    </div>`
  ).join('');
  document.getElementById('calc-total').textContent = totalCals;
  const proteinEl = document.getElementById('calc-protein-total');
  if (proteinEl) proteinEl.textContent = totalProtein + 'g protein';
}

function applyCalcTotal() {
  const totalCals = calcItems.reduce((s,i) => s+i.cals, 0);
  const totalProtein = calcItems.reduce((s,i) => s+(i.protein||0), 0);
  document.getElementById('calories-input').value = totalCals;
  if (totalProtein > 0) {
    const proteinInput = document.getElementById('protein-input');
    if (proteinInput) proteinInput.value = totalProtein;
  }
  document.getElementById('calc-modal').remove();
  calcItems = [];
}

function mergeCurrentlyReading(entryBooks, dateKey) {
  const current = getCurrentlyReading();
  const todayKey = today();
  const merged = [...entryBooks];
  current.forEach(cb => {
    if (!merged.find(b => b.title === cb.title)) {
      merged.push({ ...cb, status: 'reading', rating: 0 });
    }
  });
  return merged;
}

function saveDay() {
  const data = getData();
  const entry = data[selectedDate] || {};

  entry.lightheaded = parseInt(document.querySelector('#lightheaded-scale .scale-btn.active')?.textContent) || 0;
  entry.appetite = parseInt(document.querySelector('#appetite-scale .scale-btn.active')?.textContent) || 0;
  entry.calories = parseInt(document.getElementById('calories-input').value) || 0;
  entry.protein = parseInt(document.getElementById('protein-input').value) || 0;
  entry.poop = [...document.querySelectorAll('[data-val].active')].filter(el => ['Constipated','Diarrhea','Normal','Often'].includes(el.dataset.val)).map(el => el.dataset.val);
  entry.wakeup = document.getElementById('wakeup-input').value;
  entry.books = [...document.querySelectorAll('.book-row')].map(row => ({
    title: row.querySelector('.book-title').value.trim(),
    author: row.querySelector('.book-author').value.trim(),
    status: row.querySelector('.book-status-val').value,
    cover: row.querySelector('.book-cover-url').value,
    rating: parseInt(row.querySelector('.book-rating').value) || 0
  })).filter(b => b.title);

  const glp1Weight = document.getElementById('glp1-weight');
  if (glp1Weight) {
    entry.glp1 = {
      weight: parseFloat(glp1Weight.value) || 0,
      dose: parseFloat(document.getElementById('glp1-dose').value) || 0,
      site: document.querySelector('.glp-box.glp-checked')?.title || ''
    };
  }

  data[selectedDate] = entry;
  saveData(data);
  dbSave(selectedDate, entry);
  closeModal();
  renderCalendar();
}

function closeModal() {
  document.getElementById('day-modal')?.remove();
  document.getElementById('calc-modal')?.remove();
}

function closeModalOutside(e) {
  if (e.target.id === 'day-modal') closeModal();
}

// ── TAROT ──────────────────────────────────────────────
const TAROT_CARDS = [
  {id:1, name:'The Fool', meaning:'New beginnings, innocence, spontaneity, a free spirit', reverse:'Recklessness, risk-taking, holding back'},
  {id:2, name:'The Magician', meaning:'Manifestation, resourcefulness, power, inspired action', reverse:'Manipulation, poor planning, untapped talents'},
  {id:3, name:'The High Priestess', meaning:'Intuition, sacred knowledge, divine feminine, the subconscious', reverse:'Secrets, disconnected from intuition, withdrawal'},
  {id:4, name:'The Empress', meaning:'Femininity, beauty, nature, nurturing, abundance', reverse:'Creative block, dependence on others, emptiness'},
  {id:5, name:'The Emperor', meaning:'Authority, structure, a father figure, solid foundation', reverse:'Domination, excessive control, rigidity'},
  {id:6, name:'The Hierophant', meaning:'Spiritual wisdom, tradition, conformity, institutions', reverse:'Personal beliefs, freedom, challenging the status quo'},
  {id:7, name:'The Lovers', meaning:'Love, harmony, relationships, values alignment', reverse:'Self-love, disharmony, imbalance, misalignment'},
  {id:8, name:'The Chariot', meaning:'Control, willpower, success, determination', reverse:'Self-discipline, opposition, lack of direction'},
  {id:9, name:'Strength', meaning:'Strength, courage, persuasion, influence, compassion', reverse:'Inner strength, self-doubt, low energy, insecurity'},
  {id:10, name:'The Hermit', meaning:'Soul searching, introspection, inner guidance', reverse:'Isolation, loneliness, withdrawal, lost your way'},
  {id:11, name:'Wheel of Fortune', meaning:'Good luck, karma, life cycles, destiny, turning point', reverse:'Bad luck, resistance to change, breaking cycles'},
  {id:12, name:'Justice', meaning:'Justice, fairness, truth, cause and effect, law', reverse:'Unfairness, lack of accountability, dishonesty'},
  {id:13, name:'The Hanged Man', meaning:'Pause, surrender, letting go, new perspectives', reverse:'Delays, resistance, stalling, indecision'},
  {id:14, name:'Death', meaning:'Endings, change, transformation, transition', reverse:'Resistance to change, inability to move on'},
  {id:15, name:'Temperance', meaning:'Balance, moderation, patience, purpose, meaning', reverse:'Imbalance, excess, lack of long-term vision'},
  {id:16, name:'The Devil', meaning:'Shadow self, attachment, addiction, restriction', reverse:'Releasing limiting beliefs, exploring dark thoughts'},
  {id:17, name:'The Tower', meaning:'Sudden change, upheaval, chaos, revelation, awakening', reverse:'Personal transformation, fear of change, averting disaster'},
  {id:18, name:'The Star', meaning:'Hope, faith, purpose, renewal, spirituality', reverse:'Lack of faith, despair, discouragement, insecurity'},
  {id:19, name:'The Moon', meaning:'Illusion, fear, the unconscious, intuition', reverse:'Release of fear, repressed emotion, inner confusion'},
  {id:20, name:'The Sun', meaning:'Positivity, fun, warmth, success, vitality', reverse:'Inner child, feeling down, overly optimistic'},
  {id:21, name:'Judgement', meaning:'Reflection, reckoning, awakening, absolution', reverse:'Inability to forgive yourself, self-doubt, ignoring the call'},
  {id:22, name:'The World', meaning:'Completion, integration, accomplishment, travel', reverse:'Seeking closure, short-cuts, delays'},
  {id:23, name:'Ace of Wands', meaning:'Inspiration, new opportunities, growth, potential', reverse:'Delays, lack of motivation, weighed down'},
  {id:24, name:'Two of Wands', meaning:'Future planning, progress, decisions, discovery', reverse:'Personal goals, inner alignment, fear of unknown'},
  {id:25, name:'Three of Wands', meaning:'Progress, expansion, foresight, overseas opportunities', reverse:'Playing small, lack of foresight, unexpected delays'},
  {id:26, name:'Four of Wands', meaning:'Celebration, joy, harmony, relaxation, homecoming', reverse:'Personal celebration, inner harmony, conflict at home'},
  {id:27, name:'Five of Wands', meaning:'Conflict, disagreements, competition, tension', reverse:'Inner conflict, conflict avoidance, tension release'},
  {id:28, name:'Six of Wands', meaning:'Success, public recognition, progress, self-confidence', reverse:'Private achievement, fall from grace, egotism'},
  {id:29, name:'Seven of Wands', meaning:'Challenge, competition, protection, perseverance', reverse:'Giving up, overwhelmed, overly protective'},
  {id:30, name:'Eight of Wands', meaning:'Movement, fast paced change, action, alignment', reverse:'Delays, frustration, resisting change, internal alignment'},
  {id:31, name:'Nine of Wands', meaning:'Resilience, courage, persistence, test of faith', reverse:'Inner resources, struggle, overwhelm, defensive'},
  {id:32, name:'Ten of Wands', meaning:'Burden, extra responsibility, hard work, completion', reverse:'Doing it all yourself, carrying the burden, delegation'},
  {id:33, name:'Page of Wands', meaning:'Exploration, excitement, freedom, adventure', reverse:'Newly-formed ideas, redirecting energy, setbacks'},
  {id:34, name:'Knight of Wands', meaning:'Energy, passion, inspired action, adventure', reverse:'Passion project, haste, scattered energy'},
  {id:35, name:'Queen of Wands', meaning:'Courage, confidence, independence, social butterfly', reverse:'Self-respect, self-confidence, introverted'},
  {id:36, name:'King of Wands', meaning:'Natural-born leader, vision, entrepreneur, honour', reverse:'Impulsiveness, haste, ruthless, high expectations'},
  {id:37, name:'Ace of Cups', meaning:'Love, new relationships, compassion, creativity', reverse:'Self-love, intuition, repressed emotions'},
  {id:38, name:'Two of Cups', meaning:'Unified love, partnership, mutual attraction', reverse:'Self-love, break-ups, disharmony, distrust'},
  {id:39, name:'Three of Cups', meaning:'Celebration, friendship, creativity, collaborations', reverse:'Independence, alone time, hardcore partying'},
  {id:40, name:'Four of Cups', meaning:'Meditation, contemplation, apathy, reevaluation', reverse:'Retreat, withdrawal, checking in for yourself'},
  {id:41, name:'Five of Cups', meaning:'Regret, failure, disappointment, pessimism', reverse:'Personal setbacks, self-forgiveness, moving on'},
  {id:42, name:'Six of Cups', meaning:'Revisiting the past, childhood memories, innocence', reverse:'Living in the past, forgiveness, lacking playfulness'},
  {id:43, name:'Seven of Cups', meaning:'Opportunities, choices, wishful thinking, illusion', reverse:'Alignment, personal values, overwhelmed by choices'},
  {id:44, name:'Eight of Cups', meaning:'Disappointment, abandonment, withdrawal, escapism', reverse:'Trying one more time, indecision, aimless drifting'},
  {id:45, name:'Nine of Cups', meaning:'Contentment, satisfaction, gratitude, wish come true', reverse:'Inner happiness, materialism, dissatisfaction'},
  {id:46, name:'Ten of Cups', meaning:'Divine love, blissful relationships, harmony, alignment', reverse:'Disconnection, misaligned values, struggling relationships'},
  {id:47, name:'Page of Cups', meaning:'Creative opportunities, intuitive messages, curiosity', reverse:'New ideas, doubting intuition, creative blocks'},
  {id:48, name:'Knight of Cups', meaning:'Creativity, romance, charm, imagination, beauty', reverse:'Overactive imagination, unrealistic, jealousy'},
  {id:49, name:'Queen of Cups', meaning:'Compassionate, caring, emotionally stable, intuitive', reverse:'Inner feelings, self-care, self-love, co-dependency'},
  {id:50, name:'King of Cups', meaning:'Emotionally balanced, compassionate, diplomatic', reverse:'Self-compassion, inner feelings, moodiness'},
  {id:51, name:'Ace of Swords', meaning:'Breakthroughs, new ideas, mental clarity, success', reverse:'Inner clarity, re-thinking an idea, clouded judgement'},
  {id:52, name:'Two of Swords', meaning:'Difficult decisions, weighing up options, stalemate', reverse:'Indecision, confusion, information overload'},
  {id:53, name:'Three of Swords', meaning:'Heartbreak, emotional pain, sorrow, grief, hurt', reverse:'Negative self-talk, releasing pain, optimism, forgiveness'},
  {id:54, name:'Four of Swords', meaning:'Rest, relaxation, meditation, contemplation, recuperation', reverse:'Exhaustion, burn-out, deep contemplation, stagnation'},
  {id:55, name:'Five of Swords', meaning:'Conflict, disagreements, competition, defeat, winning', reverse:'Reconciliation, making amends, past resentment'},
  {id:56, name:'Six of Swords', meaning:'Transition, change, rite of passage, releasing baggage', reverse:'Personal transition, resistance to change, unfinished business'},
  {id:57, name:'Seven of Swords', meaning:'Betrayal, deception, getting away with something', reverse:'Imposter syndrome, self-deceit, keeping secrets'},
  {id:58, name:'Eight of Swords', meaning:'Negative thoughts, self-imposed restriction, imprisonment', reverse:'Self-limiting beliefs, inner critic, releasing negative thoughts'},
  {id:59, name:'Nine of Swords', meaning:'Anxiety, worry, fear, depression, nightmares', reverse:'Inner turmoil, deep-seated fears, secrets, releasing worry'},
  {id:60, name:'Ten of Swords', meaning:'Painful endings, deep wounds, betrayal, loss, crisis', reverse:'Recovery, regeneration, resisting an inevitable end'},
  {id:61, name:'Page of Swords', meaning:'New ideas, curiosity, thirst for knowledge, new ways', reverse:'Self-expression, all talk and no action, haphazard action'},
  {id:62, name:'Knight of Swords', meaning:'Ambitious, action-oriented, driven to succeed, fast-thinking', reverse:'Restless, unfocused, impulsive, burn-out'},
  {id:63, name:'Queen of Swords', meaning:'Independent, unbiased judgement, clear boundaries', reverse:'Overly-emotional, easily influenced, cold-hearted'},
  {id:64, name:'King of Swords', meaning:'Mental clarity, intellectual power, authority, truth', reverse:'Quiet power, inner truth, misuse of power, manipulation'},
  {id:65, name:'Ace of Pentacles', meaning:'A new financial or career opportunity, manifestation', reverse:'Lost opportunity, lack of planning and foresight'},
  {id:66, name:'Two of Pentacles', meaning:'Multiple priorities, time management, prioritisation', reverse:'Over-committed, disorganisation, reprioritisation'},
  {id:67, name:'Three of Pentacles', meaning:'Teamwork, collaboration, learning, implementation', reverse:'Disharmony, misalignment, working alone'},
  {id:68, name:'Four of Pentacles', meaning:'Saving money, security, conservatism, scarcity', reverse:'Over-spending, greed, self-protection'},
  {id:69, name:'Five of Pentacles', meaning:'Financial loss, poverty, lack mindset, isolation', reverse:'Recovery from financial loss, spiritual poverty'},
  {id:70, name:'Six of Pentacles', meaning:'Giving, receiving, sharing wealth, generosity', reverse:'Self-care, unpaid debts, one-sided charity'},
  {id:71, name:'Seven of Pentacles', meaning:'Long-term vision, sustainable results, perseverance', reverse:'Lack of long-term vision, limited success or reward'},
  {id:72, name:'Eight of Pentacles', meaning:'Apprenticeship, repetitive tasks, mastery, skill development', reverse:'Self-development, perfectionism, misdirected activity'},
  {id:73, name:'Nine of Pentacles', meaning:'Abundance, luxury, self-sufficiency, financial independence', reverse:'Self-worth, over-investment in work, hustling'},
  {id:74, name:'Ten of Pentacles', meaning:'Wealth, financial security, family, long-term success', reverse:'The dark side of wealth, financial failure or loss'},
  {id:75, name:'Page of Pentacles', meaning:'Manifestation, financial opportunity, skill development', reverse:'Lack of progress, procrastination, learn from failure'},
  {id:76, name:'Knight of Pentacles', meaning:'Hard work, productivity, routine, conservatism', reverse:'Self-discipline, boredom, feeling stuck, perfectionism'},
  {id:77, name:'Queen of Pentacles', meaning:'Nurturing, practical, providing financially, a working parent', reverse:'Financial independence, self-care, work-home conflict'},
  {id:78, name:'King of Pentacles', meaning:'Wealth, business, leadership, security, discipline', reverse:'Financially inept, obsessed with wealth, stubborn'}
];

function renderTarot() {
  const main = document.getElementById('app-main');
  main.innerHTML = `
    <div class="tarot-header">
      <img src="images/pink-star.png" style="width:28px;height:28px;object-fit:contain;" alt="">
      <h2 style="font-family:'Life Savers',cursive;font-size:2rem;color:#bd6982;margin:0.5rem 0 0.25rem;">✦ Tarot Reading ✦</h2>
      <p style="font-size:11px;color:#665257;font-family:'Montserrat',sans-serif;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Choose your spread</p>
    </div>
    <div class="tarot-spread-btns">
      <button class="tarot-spread-btn" onclick="startReading(1)">
        <div class="tarot-spread-icon">✦</div>
        <div class="tarot-spread-name">Single card</div>
        <div class="tarot-spread-desc">One card, one message</div>
      </button>
      <button class="tarot-spread-btn" onclick="startReading(3)">
        <div class="tarot-spread-icon">✦ ✦ ✦</div>
        <div class="tarot-spread-name">Three card spread</div>
        <div class="tarot-spread-desc">Past · Present · Future</div>
      </button>
    </div>
    <div id="tarot-reading"></div>`;
}

function startReading(count) {
  const shuffled = [...TAROT_CARDS].sort(() => Math.random() - 0.5);
  const drawn = shuffled.slice(0, count).map(card => ({
    ...card,
    reversed: Math.random() > 0.5,
    flipped: false
  }));
  const labels = count === 1 ? ['Your message'] : ['Past', 'Present', 'Future'];
  const reading = document.getElementById('tarot-reading');
  reading.innerHTML = `
    <div class="tarot-cards-row">
      ${drawn.map((card, i) => `
        <div class="tarot-card-wrap">
          <div class="tarot-label">${labels[i]}</div>
          <div class="tarot-card" id="tarot-card-${i}" onclick="flipCard(${i})" data-flipped="false">
            <div class="tarot-card-inner">
              <div class="tarot-card-back">
                <img src="images/tarot-back.png" alt="card back" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">
              </div>
              <div class="tarot-card-front ${card.reversed?'tarot-reversed':''}">
                <div style="position:relative;width:100%;height:100%;">
                  <img src="images/tarot-blank.png" style="width:100%;height:100%;object-fit:cover;border-radius:14px;" alt="">
                  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;border-radius:14px;">
                    <div style="font-size:28px;margin-bottom:6px;">${getTarotSymbol(card.id)}</div>
                    <div style="font-family:'Life Savers',cursive;font-size:0.85rem;color:#bd6982;text-align:center;line-height:1.2;">${card.name}</div>
                    ${card.reversed ? '<div style="font-size:9px;color:#b0a0a4;font-family:Montserrat,sans-serif;letter-spacing:0.1em;margin-top:3px;">REVERSED</div>' : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="tarot-card-info" id="tarot-info-${i}" style="display:none;">
            <div class="tarot-card-name">${card.name}${card.reversed?' (Reversed)':''}</div>
            <div class="tarot-card-meaning">${card.reversed?card.reverse:card.meaning}</div>
          </div>
        </div>`).join('')}
    </div>
    <div style="text-align:center;font-size:11px;color:#b0a0a4;font-family:'Montserrat',sans-serif;margin-top:0.5rem;">tap each card to reveal</div>
    <button class="tarot-new-btn" onclick="renderTarot()">✦ New reading</button>`;

  window._tarotDrawn = drawn;
}

function getTarotSymbol(id) {
  const symbols = {
    1:'🌟', 2:'⚡', 3:'🌙', 4:'🌿', 5:'👑',
    6:'🏛️', 7:'❤️', 8:'🏆', 9:'🦁', 10:'🕯️',
    11:'☸️', 12:'⚖️', 13:'🪢', 14:'💀', 15:'🌡️',
    16:'😈', 17:'🗼', 18:'⭐', 19:'🌕', 20:'☀️',
    21:'📯', 22:'🌍', 23:'🪄', 24:'🗺️', 25:'⛵',
    26:'🎊', 27:'⚔️', 28:'🏅', 29:'🛡️', 30:'💨',
    31:'🧱', 32:'🎯', 33:'📜', 34:'🐴', 35:'🌻',
    36:'🦅', 37:'💧', 38:'🤝', 39:'🥂', 40:'🪷',
    41:'😢', 42:'🎠', 43:'🌈', 44:'🚶', 45:'🍀',
    46:'🏠', 47:'🐟', 48:'🦢', 49:'🫧', 50:'🐋',
    51:'💡', 52:'🙈', 53:'💔', 54:'🛌', 55:'🗡️',
    56:'⛵', 57:'🦊', 58:'🕸️', 59:'😰', 60:'🪦',
    61:'🦋', 62:'🌪️', 63:'🗻', 64:'📐', 65:'🌱',
    66:'🤹', 67:'🔨', 68:'💰', 69:'❄️', 70:'🤲',
    71:'🌾', 72:'⚙️', 73:'🍇', 74:'🏰', 75:'📚',
    76:'🐂', 77:'🌺', 78:'👑'
  };
  return symbols[id] || '✦';
}

function flipCard(i) {
  const card = document.getElementById(`tarot-card-${i}`);
  const info = document.getElementById(`tarot-info-${i}`);
  if (card.dataset.flipped === 'true') return;
  card.dataset.flipped = 'true';
  card.classList.add('tarot-flipped');
  setTimeout(() => { info.style.display = 'block'; }, 400);
}

// ── SUMMARY ───────────────────────────────────────────────
function renderSummary() {
  const main = document.getElementById('app-main');
  main.innerHTML = `
    <div class="summary-controls">
      <button class="nav-btn active" onclick="setSummaryRange('week',this)">This week</button>
      <button class="nav-btn" onclick="setSummaryRange('month',this)">This month</button>
      <button class="nav-btn" onclick="setSummaryRange('year',this)">This year</button>
      <button class="nav-btn" onclick="setSummaryRange('custom',this)">Custom</button>
    </div>
    <div id="custom-range" class="hidden" style="display:none;gap:10px;align-items:center;margin-bottom:1rem;flex-wrap:wrap;">
      <input type="date" id="range-start" style="padding:6px 10px;border:1px solid #e8ddd5;border-radius:8px;">
      <span>to</span>
      <input type="date" id="range-end" style="padding:6px 10px;border:1px solid #e8ddd5;border-radius:8px;">
      <button class="nav-btn" onclick="runCustomRange()">Go</button>
    </div>
    <div id="summary-output"></div>
    <div style="margin-top:2rem;text-align:center;">
      <button onclick="clearDataPrompt()" style="padding:8px 20px;border-radius:999px;border:1.5px solid #665257;background:transparent;font-size:11px;font-weight:700;cursor:pointer;color:#b0a0a4;font-family:'Montserrat',sans-serif;letter-spacing:0.08em;text-transform:uppercase;transition:all 0.15s;" onmouseover="this.style.color='#bd6982';this.style.borderColor='#bd6982'" onmouseout="this.style.color='#b0a0a4';this.style.borderColor='#665257'">✕ Clear data for this range</button>
    </div>`;
  setSummaryRange('week', document.querySelector('.summary-controls .nav-btn'));
}

function setSummaryRange(range, btn) {
  document.querySelectorAll('.summary-controls .nav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const customEl = document.getElementById('custom-range');
  if (range === 'custom') { customEl.style.display = 'flex'; return; }
  customEl.style.display = 'none';

  const now = new Date();
  let start, end = new Date(now.getFullYear(), now.getMonth()+1, 0);
  if (range === 'week') { start = new Date(now); start.setDate(now.getDate() - now.getDay()); end = new Date(now); end.setDate(now.getDate() - now.getDay() + 6); }
  else if (range === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); }
  else if (range === 'year') { start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear(), 11, 31); }
  buildSummary(getDateKey(start), getDateKey(end));
}

function runCustomRange() {
  const s = document.getElementById('range-start').value;
  const e = document.getElementById('range-end').value;
  if (s && e) buildSummary(s, e);
}

function buildSummary(startKey, endKey) {
  const data = getData();
  const keys = Object.keys(data).filter(k => k >= startKey && k <= endKey).sort();
  const entries = keys.map(k => ({ date: k, ...data[k] }));

  if (!entries.length) {
    document.getElementById('summary-output').innerHTML = `
      <div class="summary-card" style="text-align:center;padding:2rem;">
        <div style="font-family:'Life Savers',cursive;font-size:1.5rem;color:#bd6982;margin-bottom:8px;">No entries yet</div>
        <div style="font-size:13px;color:#665257;font-family:'Montserrat',sans-serif;">Start logging days to see your summary here!</div>
      </div>`;
    return;
  }

  const avg = (arr) => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : 'n/a';
  const lightheadeds = entries.map(e=>e.lightheaded).filter(v=>v>0);
  const appetites = entries.map(e=>e.appetite).filter(v=>v>0);
  const calories = entries.map(e=>e.calories).filter(v=>v>0);
  const proteins = entries.map(e=>e.protein).filter(v=>v>0);
  const glp1s = entries.filter(e => e.glp1 && e.glp1.weight > 0).map(e => ({ date: e.date, glp1: e.glp1 }));
  const firstWeight = glp1s.length ? glp1s[0].glp1.weight : 0;
  const lastWeight = glp1s.length ? glp1s[glp1s.length-1].glp1.weight : 0;
  const diff = glp1s.length >= 2 ? (lastWeight - firstWeight).toFixed(1) : '0';
  const isLoss = parseFloat(diff) < 0;
  const allBooks = entries.flatMap(e=>e.books||[]);
  const seenTitles = new Set();
  const uniqueBooks = allBooks.filter(b => {
    if (seenTitles.has(b.title)) return false;
    seenTitles.add(b.title);
    return true;
  });
  const finishedBooks = uniqueBooks.filter(b=>b.status==='finished');
  const dnfBooks = uniqueBooks.filter(b=>b.status==='dnf');
  const wakeups = entries.map(e=>e.wakeup).filter(Boolean);
  const poops = entries.flatMap(e=>e.poop||[]);

  const avgWakeup = () => {
    if (!wakeups.length) return 'n/a';
    const mins = wakeups.map(t => {
      const [h,m] = t.split(':').map(Number);
      return h*60+m;
    });
    const avg = Math.round(mins.reduce((a,b)=>a+b,0)/mins.length);
    const h = Math.floor(avg/60);
    const m = avg%60;
    const ampm = h>=12 ? 'pm' : 'am';
    return `${h>12?h-12:h||12}:${String(m).padStart(2,'0')} ${ampm}`;
  };

  const poopCounts = {Constipated:0, Diarrhea:0, Normal:0, Often:0};
  poops.forEach(p => { if (poopCounts[p]!==undefined) poopCounts[p]++; });
  const topPoop = Object.entries(poopCounts).sort((a,b)=>b[1]-a[1]).filter(e=>e[1]>0)[0];

  let weightChartHtml = '';
  if (glp1s.length >= 2) {
    const max = Math.max(...glp1s.map(e=>e.glp1.weight));
    const min = Math.min(...glp1s.map(e=>e.glp1.weight));
    const range = max - min || 1;
    const points = glp1s.map((e,i) => {
      const x = 60 + (i / (glp1s.length-1)) * 560;
      const y = 55 - ((e.glp1.weight - min) / range) * 40;
      return `${x},${y}`;
    }).join(' ');
    weightChartHtml = `
      <div class="summary-planner-card" style="margin-bottom:1rem;">
        <div class="summary-planner-title">Weight journey</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="font-family:'Life Savers',cursive;font-size:1.1rem;color:#b0a0a4;">${glp1s[0].date}</div>
          <div style="font-family:'Life Savers',cursive;font-size:1.1rem;color:#b0a0a4;">${glp1s[glp1s.length-1].date}</div>
        </div>
        <svg viewBox="0 0 680 80" style="width:100%;margin:4px 0;">
          <polyline points="${points}" fill="none" stroke="#bd6982" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
          ${glp1s.map((e,i) => {
            const x = 60 + (i / (glp1s.length-1)) * 560;
            const y = 55 - ((e.glp1.weight - min) / range) * 40;
            return `<circle cx="${x}" cy="${y}" r="2" fill="#bd6982"/>`;
          }).join('')}
          <text x="60" y="${55 - ((glp1s[0].glp1.weight - min) / range) * 40 - 6}" font-size="9" fill="#bd6982" font-family="Montserrat" font-weight="600" text-anchor="middle">${firstWeight} lbs</text>
          <text x="620" y="${55 - ((lastWeight - min) / range) * 40 - 6}" font-size="9" fill="#bd6982" font-family="Montserrat" font-weight="600" text-anchor="middle">${lastWeight} lbs</text>
        </svg>
        <div style="text-align:center;font-size:12px;font-weight:700;color:${isLoss?'#3B6D11':'#A32D2D'};font-family:'Montserrat',sans-serif;margin-top:6px;">
          ${isLoss?'▼':'▲'} ${Math.abs(diff)} lbs ${isLoss?'lost':'gained'}
        </div>
      </div>`;
  }

  document.getElementById('summary-output').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:1rem;">

      <div class="summary-stat-block">
        <div class="summary-stat-label">Days logged</div>
        <div class="summary-stat-value">${entries.length}<span class="summary-stat-unit">days</span></div>
      </div>

      <div class="summary-stat-block">
        <div class="summary-stat-label">Avg lightheadedness</div>
        <div style="color:#bd6982;font-size:18px;letter-spacing:2px;margin:4px 0;">
          ${'★'.repeat(Math.round(parseFloat(avg(lightheadeds))||0))}${'☆'.repeat(5-Math.round(parseFloat(avg(lightheadeds))||0))}
        </div>
        <div style="font-size:11px;color:#b0a0a4;font-family:'Montserrat',sans-serif;">${avg(lightheadeds)} / 5</div>
      </div>

      <div class="summary-stat-block">
        <div class="summary-stat-label">Avg appetite</div>
        <div style="color:#bd6982;font-size:18px;letter-spacing:2px;margin:4px 0;">
          ${'★'.repeat(Math.round(parseFloat(avg(appetites))||0))}${'☆'.repeat(5-Math.round(parseFloat(avg(appetites))||0))}
        </div>
        <div style="font-size:11px;color:#b0a0a4;font-family:'Montserrat',sans-serif;">${avg(appetites)} / 5</div>
      </div>

      <div class="summary-stat-block">
        <div class="summary-stat-label">Avg calories</div>
        <div class="summary-stat-value">${avg(calories)}<span class="summary-stat-unit">cal</span></div>
      </div>

      <div class="summary-stat-block">
        <div class="summary-stat-label">Avg protein</div>
        <div class="summary-stat-value">${avg(proteins)}<span class="summary-stat-unit">g</span></div>
      </div>

      <div class="summary-stat-block">
        <div class="summary-stat-label">Avg wake time</div>
        <div class="summary-stat-value" style="font-size:1.3rem;">${avgWakeup()}</div>
      </div>

      <div class="summary-stat-block">
        <div class="summary-stat-label">Most common poop</div>
        <div class="summary-stat-value" style="font-size:1.1rem;">${topPoop ? topPoop[0] : 'n/a'}</div>
        ${topPoop ? `<div style="font-size:11px;color:#b0a0a4;font-family:'Montserrat',sans-serif;margin-top:4px;">${topPoop[1]} times</div>` : ''}
      </div>

      ${glp1s.length ? glp1s.slice(0,1).map(e=>`
      <div class="summary-stat-block">
        <div class="summary-stat-label">Latest weight</div>
        <div class="summary-stat-value" style="font-size:1.3rem;">${glp1s[glp1s.length-1].glp1.weight}<span class="summary-stat-unit">lbs</span></div>
        ${glp1s.length >= 2 ? `<div style="font-size:11px;font-weight:700;color:${parseFloat(diff)<0?'#3B6D11':'#A32D2D'};font-family:'Montserrat',sans-serif;margin-top:4px;">${parseFloat(diff)<0?'▼':'▲'} ${Math.abs(diff)} lbs</div>` : ''}
      </div>`).join('') : `
      <div class="summary-stat-block">
        <div class="summary-stat-label">Latest weight</div>
        <div class="summary-stat-value" style="font-size:1.1rem;">n/a</div>
      </div>`}

    </div>

    ${weightChartHtml}

    ${glp1s.length ? `
    <div class="summary-planner-card" style="margin-bottom:1rem;">
      <div class="summary-planner-title">GLP-1 weigh-ins</div>
      <div style="margin-top:8px;">
        ${glp1s.map(e=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f0e8ec;">
            <span style="font-size:12px;color:#665257;font-family:'Montserrat',sans-serif;">${e.date}</span>
            <span style="font-size:13px;font-weight:700;color:#bd6982;font-family:'Playfair Display',serif;">${e.glp1.weight} lbs</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${finishedBooks.length || dnfBooks.length ? `
    <div class="summary-planner-card" style="margin-bottom:1rem;">
      <div class="summary-planner-title">Reading log</div>

      ${finishedBooks.length ? `
        <div style="display:flex;align-items:center;justify-content:space-between;margin:12px 0 8px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#bd6982;font-family:'Montserrat',sans-serif;">Finished ✓</div>
          <div style="font-family:'Life Savers',cursive;font-size:1.3rem;color:#bd6982;">${finishedBooks.length} book${finishedBooks.length!==1?'s':''}</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
          ${finishedBooks.map(b=>b.cover ? `
            <div style="position:relative;" title="${b.title}">
              <img src="${b.cover}" style="width:52px;height:70px;object-fit:cover;border-radius:6px;box-shadow:0 2px 8px rgba(102,82,87,0.2);">
            </div>` : '').join('')}
        </div>
        ${finishedBooks.map(b=>`
          <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f0e8ec;">
            ${b.cover ? `<img src="${b.cover}" style="width:30px;height:40px;object-fit:cover;border-radius:4px;flex-shrink:0;">` : ''}
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:700;color:#392f31;font-family:'Montserrat',sans-serif;">${b.title}</div>
              ${b.author ? `<div style="font-size:11px;color:#b0a0a4;font-family:'Montserrat',sans-serif;">${b.author}</div>` : ''}
            </div>
            <div style="color:#bd6982;font-size:14px;">${'★'.repeat(b.rating||0)}${'☆'.repeat(5-(b.rating||0))}</div>
          </div>`).join('')}` : ''}

      ${dnfBooks.length ? `
        <div style="display:flex;align-items:center;justify-content:space-between;margin:16px 0 8px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#b0a0a4;font-family:'Montserrat',sans-serif;">Did not finish</div>
          <div style="font-family:'Life Savers',cursive;font-size:1.3rem;color:#b0a0a4;">${dnfBooks.length} book${dnfBooks.length!==1?'s':''}</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
          ${dnfBooks.map(b=>b.cover ? `
            <div style="position:relative;opacity:0.6;" title="${b.title}">
              <img src="${b.cover}" style="width:52px;height:70px;object-fit:cover;border-radius:6px;box-shadow:0 2px 8px rgba(102,82,87,0.2);">
            </div>` : '').join('')}
        </div>
        ${dnfBooks.map(b=>`
          <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f0e8ec;">
            ${b.cover ? `<img src="${b.cover}" style="width:30px;height:40px;object-fit:cover;border-radius:4px;flex-shrink:0;opacity:0.6;">` : ''}
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:700;color:#392f31;font-family:'Montserrat',sans-serif;">${b.title}</div>
              ${b.author ? `<div style="font-size:11px;color:#b0a0a4;font-family:'Montserrat',sans-serif;">${b.author}</div>` : ''}
            </div>
          </div>`).join('')}` : ''}

    </div>` : ''}`;
}

function clearDataPrompt() {
  const rangeLabel = document.querySelector('.summary-controls .nav-btn.active')?.textContent?.trim() || 'this range';
  if (!confirm(`Are you sure you want to delete all logged data for ${rangeLabel}? This cannot be undone.`)) return;
  
  const startEl = document.getElementById('range-start');
  const endEl = document.getElementById('range-end');
  
  const now = new Date();
  let startKey, endKey;
  
  const active = document.querySelector('.summary-controls .nav-btn.active')?.textContent?.trim();
  
  if (active === '✦ This week' || active === 'This week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    startKey = getDateKey(start);
    endKey = getDateKey(end);
  } else if (active === '✦ This month' || active === 'This month') {
    startKey = getDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
    endKey = getDateKey(new Date(now.getFullYear(), now.getMonth()+1, 0));
  } else if (active === '✦ This year' || active === 'This year') {
    startKey = getDateKey(new Date(now.getFullYear(), 0, 1));
    endKey = getDateKey(new Date(now.getFullYear(), 11, 31));
  } else if (startEl && endEl && startEl.value && endEl.value) {
    startKey = startEl.value;
    endKey = endEl.value;
  } else {
    alert('Please select a date range first.');
    return;
  }

  const data = getData();
  let count = 0;
  Object.keys(data).forEach(k => {
    if (k >= startKey && k <= endKey) {
      delete data[k];
      count++;
    }
  });
  saveData(data);
  renderSummary();
  alert(`✓ Cleared ${count} day${count!==1?'s':''} of data.`);
}

// ── PERIOD TRACKING ──────────────────────────────────────
function getPeriodState() {
  try { return JSON.parse(localStorage.getItem('period-state') || 'null'); } catch(e) { return null; }
}

function savePeriodState(state) {
  localStorage.setItem('period-state', JSON.stringify(state));
}

function checkPeriodPrompt() {
  const now = new Date();
  const todayKey = today();
  const day = now.getDate();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  let state = getPeriodState();

  if (!state) {
    state = { phase: 'idle', lastCheckedMonth: null };
    savePeriodState(state);
  }

  if (day === 5 && state.lastCheckedMonth !== monthKey) {
    state.phase = 'check';
    state.lastCheckedMonth = monthKey;
    savePeriodState(state);
  }

  if (state.phase === 'idle' || state.phase === 'done') return;

  if (state.phase === 'check') {
    showPeriodPopup(
      '<img src="images/pink-star.png" style="width:24px;height:24px;object-fit:contain;vertical-align:middle;"> Monthly check-in',
      'Did you skip your period this month?',
      [
        { label: 'Yes, skipped', action: () => { state.phase = 'done'; savePeriodState(state); closePeriodPopup(); } },
        { label: 'No', action: () => { state.phase = 'ring_out'; savePeriodState(state); closePeriodPopup(); setTimeout(checkPeriodPrompt, 300); } }
      ]
    );
    return;
  }

  if (state.phase === 'ring_out') {
    showPeriodPopup(
      '<img src="images/pink-star.png" style="width:24px;height:24px;object-fit:contain;vertical-align:middle;"> Nuvaring',
      'Did you take out your Nuvaring?',
      [
        { label: 'Yes', action: () => { state.phase = 'waiting_for_start'; savePeriodState(state); closePeriodPopup(); } },
        { label: 'Not yet', action: () => { closePeriodPopup(); } }
      ]
    );
    return;
  }

  if (state.phase === 'waiting_for_start' && state.lastAskedStart !== todayKey) {
    state.lastAskedStart = todayKey;
    savePeriodState(state);
    showPeriodPopup(
      '<img src="images/pink-star.png" style="width:24px;height:24px;object-fit:contain;vertical-align:middle;"> Period check',
      'Did your period start today?',
      [
        { label: 'Yes!', action: () => { state.phase = 'waiting_for_end'; state.startDate = todayKey; savePeriodState(state); closePeriodPopup(); } },
        { label: 'Not yet', action: () => { closePeriodPopup(); } }
      ]
    );
    return;
  }

  if (state.phase === 'waiting_for_end' && state.lastAskedEnd !== todayKey) {
    state.lastAskedEnd = todayKey;
    savePeriodState(state);
    showPeriodPopup(
      '<img src="images/pink-star.png" style="width:24px;height:24px;object-fit:contain;vertical-align:middle;"> Period check',
      'Did your period end today?',
      [
        { label: 'Yes, all done!', action: () => { state.phase = 'done'; state.endDate = todayKey; savePeriodState(state); closePeriodPopup(); } },
        { label: 'Still going', action: () => { closePeriodPopup(); } }
      ]
    );
    return;
  }
}

function showPeriodPopup(title, message, buttons) {
  if (document.getElementById('period-popup')) return;
  const btnHtml = buttons.map((b, i) =>
    `<button class="period-popup-btn" onclick="periodAction(${i})">${b.label}</button>`
  ).join('');
  window._periodActions = buttons.map(b => b.action);
  document.body.insertAdjacentHTML('beforeend', `
    <div class="period-popup-overlay" id="period-popup">
      <div class="period-popup">
        <div class="period-popup-title">${title}</div>
        <div class="period-popup-msg">${message}</div>
        <div class="period-popup-btns">${btnHtml}</div>
      </div>
    </div>
  `);
}

function periodAction(i) {
  if (window._periodActions && window._periodActions[i]) {
    window._periodActions[i]();
  }
}

function closePeriodPopup() {
  document.getElementById('period-popup')?.remove();
}

function periodDaySection(dateKey, period) {
  const state = getPeriodState();
  if (!state || state.phase === 'idle') return '';
  
  const isOnPeriod = state.phase === 'waiting_for_end';
  const isDone = state.phase === 'done';
  const startDate = state.startDate || null;
  const endDate = state.endDate || null;

  return `
    <div class="form-section">
      <h3>Period</h3>
      ${state.phase === 'waiting_for_start' ? `
        <div class="form-row">
          <label>Did your period start today?</label>
          <div class="checkbox-row">
            <span class="checkbox-pill ${period.started?'active':''}" onclick="togglePeriodStart(this,'${dateKey}')">Yes, started today</span>
          </div>
        </div>` : ''}
      ${isOnPeriod ? `
        <div class="form-row">
          <label>Period started ${startDate||''}</label>
          <div class="checkbox-row">
            <span class="checkbox-pill ${period.ended?'active':''}" onclick="togglePeriodEnd(this,'${dateKey}')">Yes, ended today</span>
          </div>
        </div>` : ''}
      ${isDone && startDate ? `
        <div style="font-size:13px;color:#bd6982;font-weight:600;">
          Period: ${startDate} ${endDate ? '→ '+endDate : '→ ongoing'}
        </div>` : ''}
    </div>`;
}

function togglePeriodStart(el, dateKey) {
  el.classList.toggle('active');
  const state = getPeriodState();
  if (el.classList.contains('active')) {
    state.phase = 'waiting_for_end';
    state.startDate = dateKey;
    savePeriodState(state);
  }
}

function togglePeriodEnd(el, dateKey) {
  el.classList.toggle('active');
  const state = getPeriodState();
  if (el.classList.contains('active')) {
    state.phase = 'done';
    state.endDate = dateKey;
    savePeriodState(state);
  }
}

// init
dbLoad().then(() => {
  render();
  checkPeriodPrompt();
});
window.addEventListener('resize', render);
