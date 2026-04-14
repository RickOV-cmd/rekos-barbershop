'use strict';

/* ─── CONFIG ─── */
const STORAGE_KEY = 'rekos-hours'; // localStorage für Öffnungszeiten (Fallback)

const DAYS = ['montag','dienstag','mittwoch','donnerstag','freitag','samstag','sonntag'];

const DEFAULT_SERVICES = [
  { name: 'Haarschnitt',     desc: 'Klassisch oder modern — präzise auf deine Gesichtsform abgestimmt. Beratung inklusive.', price: '20' },
  { name: 'Kombi',           desc: 'Haarschnitt + Bartpflege — das komplette Paket. Raus von Kopf bis Kinn auf Punkt.', price: '30' },
  { name: 'Bart komplett',   desc: 'Bart formen, trimmen und pflegen — für das perfekte, gepflegte Gesamtbild.', price: '10' },
  { name: 'Maschinenschnitt',desc: 'Sauber und schnell — nur mit der Maschine, ohne Schere. Zeitlos und präzise.', price: '15' },
  { name: 'Klass. Rasur',    desc: 'Klassische Rasur mit dem Rasiermesser — das ultimative Barber-Erlebnis.', price: '5' },
  { name: 'Gesichtspflege',  desc: 'Massage und Gesichtsmaske — Entspannung und Pflege auf höchstem Niveau.', price: '5' },
  { name: 'Augenbrauen',     desc: 'Augenbrauen formen und definieren für einen klaren, ausdrucksstarken Blick.', price: '5' },
  { name: 'Kinder bis 14',   desc: 'Haarschnitt für Kinder bis 14 Jahre — geduldig, professionell und kindgerecht.', price: '15' }
];

const GALLERY_TITLES = ['High Fade','Taper Fade','Skin Fade','Bart Kontur','Classic Cut','Styling','Kombi-Service'];

const DEFAULT_REVIEWS = [
  { text: 'Bester Barbershop in Nordhorn, ohne Frage. Reko weiß genau, was er tut. Mein Fade sitzt immer perfekt — und die Atmosphäre ist entspannt und professionell zugleich.', name: 'Kevin M.', initials: 'KM' },
  { text: 'Endlich ein Barber in Nordhorn mit echtem Know-how. Skin Fade, Bart, alles top. Bin jetzt Stammkunde und komme immer wieder.', name: 'Tim K.', initials: 'TK' },
  { text: 'Drittes Mal und immer wieder begeistert. Ehrliche Beratung, der Schnitt sitzt, der Preis ist fair. Was will man mehr?', name: 'Jonas S.', initials: 'JS' }
];

/* ─── LOGIN (Supabase Auth) ─── */
const loginScreen = document.getElementById('login-screen');
const adminScreen = document.getElementById('admin-screen');
const loginError  = document.getElementById('login-error');

async function showAdmin() {
  loginScreen.style.display = 'none';
  adminScreen.style.display = 'block';
  loadSavedHours();
  renderServicesList();
  renderGalleryList();
  renderReviewsList();
  await loadSettings();
}

// Auto-login if Supabase session already active
(async () => {
  const session = await getSession();
  if (session) showAdmin();
})();

document.getElementById('login-btn').addEventListener('click', attemptLogin);
document.getElementById('pw-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') attemptLogin();
});

async function attemptLogin() {
  const emailEl = document.getElementById('email-input');
  const pwEl    = document.getElementById('pw-input');
  const email   = emailEl ? emailEl.value.trim() : '';
  const pw      = pwEl.value;
  loginError.textContent = '';
  try {
    await adminSignIn(email || null, pw);
    showAdmin();
  } catch(e) {
    loginError.textContent = 'Falsches Passwort oder E-Mail. Bitte erneut versuchen.';
    if (pwEl) { pwEl.value = ''; pwEl.focus(); }
  }
}

document.getElementById('logout-btn').addEventListener('click', async () => {
  await adminSignOut();
  location.reload();
});

/* ─── UTIL: Flash save status ─── */
function flash(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

/* ─── ÖFFNUNGSZEITEN ─── */
document.querySelectorAll('.closed-cb').forEach(cb => {
  cb.addEventListener('change', () => {
    const day    = cb.dataset.day;
    const row    = document.getElementById('row-' + day);
    const openI  = document.getElementById('open-' + day);
    const closeI = document.getElementById('close-' + day);
    openI.disabled  = cb.checked;
    closeI.disabled = cb.checked;
    row.classList.toggle('is-closed', cb.checked);
  });
});

function loadSavedHours() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const h = JSON.parse(saved);
    DAYS.forEach(d => {
      if (!h[d]) return;
      const cb     = document.getElementById('closed-' + d);
      const openI  = document.getElementById('open-' + d);
      const closeI = document.getElementById('close-' + d);
      const row    = document.getElementById('row-' + d);
      if (h[d].closed) {
        cb.checked = true; openI.disabled = true; closeI.disabled = true;
        row.classList.add('is-closed');
      } else {
        cb.checked = false;
        openI.value  = h[d].open  || openI.value;
        closeI.value = h[d].close || closeI.value;
        openI.disabled = false; closeI.disabled = false;
        row.classList.remove('is-closed');
      }
    });
  } catch(e) {}
}

document.getElementById('hours-form').addEventListener('submit', async e => {
  e.preventDefault();
  const data = {};
  DAYS.forEach(d => {
    const cb     = document.getElementById('closed-' + d);
    const openI  = document.getElementById('open-' + d);
    const closeI = document.getElementById('close-' + d);
    data[d] = cb.checked ? { closed: true } : { open: openI.value, close: closeI.value };
  });
  // Save to Supabase (inside site_settings.hours) + localStorage fallback
  try {
    const s = await fetchSiteSettings();
    s.hours = data;
    await saveSiteSettings(s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    flash('save-status');
  } catch(err) {
    // Fallback: localStorage only
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    flash('save-status');
    console.warn('Supabase hours save failed, localStorage used:', err.message);
  }
});

/* ─── SETTINGS: Load & Save (Supabase) ─── */
async function loadSettings() {
  let s = {};
  try { s = await fetchSiteSettings(); } catch(e) {}
  // Fallback localStorage
  if (!Object.keys(s).length) {
    try { s = JSON.parse(localStorage.getItem('rekos-settings') || '{}'); } catch(e) {}
  }

  // Phone
  if (s.phone)     document.getElementById('ct-phone-display').value = s.phone;
  if (s.phoneHref) document.getElementById('ct-phone-href').value    = s.phoneHref;

  // Stats
  if (s.rating !== undefined) document.getElementById('ct-rating').value = s.rating;
  if (s.years  !== undefined) document.getElementById('ct-exp').value    = s.years;

  // Statement
  if (s.stmtText) document.getElementById('ct-stmt').value     = s.stmtText;
  if (s.stmtSub)  document.getElementById('ct-stmt-sub').value = s.stmtSub;

  // Services — fill rendered inputs
  const svcs = s.services || DEFAULT_SERVICES;
  svcs.forEach((svc, i) => {
    const n = i + 1;
    const nameEl  = document.getElementById('ai-svc-' + n + '-name');
    const descEl  = document.getElementById('ai-svc-' + n + '-desc');
    const priceEl = document.getElementById('ai-svc-' + n + '-price');
    if (nameEl)  nameEl.value  = svc.name;
    if (descEl)  descEl.value  = svc.desc;
    if (priceEl) priceEl.value = svc.price;
  });

  // Gallery — populate state and re-render with saved images
  renderGalleryList(s.gallery || []);

  // Reviews
  const revs = s.reviews || DEFAULT_REVIEWS;
  revs.forEach((rev, i) => {
    const n = i + 1;
    const textEl = document.getElementById('ai-rev-' + n + '-text');
    const nameEl = document.getElementById('ai-rev-' + n + '-name');
    const avEl   = document.getElementById('ai-rev-' + n + '-av');
    if (textEl && rev.text)     textEl.value = rev.text;
    if (nameEl && rev.name)     nameEl.value = rev.name;
    if (avEl   && rev.initials) avEl.value   = rev.initials;
  });
}

async function saveSettings() {
  let s = {};
  try { s = await fetchSiteSettings(); } catch(e) {}

  // Phone
  const phoneDisplay = document.getElementById('ct-phone-display').value.trim();
  const phoneHref    = document.getElementById('ct-phone-href').value.trim();
  if (phoneDisplay) s.phone     = phoneDisplay;
  if (phoneHref)    s.phoneHref = phoneHref;

  // Stats
  const rating = parseFloat(document.getElementById('ct-rating').value);
  const years  = parseInt(document.getElementById('ct-exp').value, 10);
  if (!isNaN(rating)) s.rating = rating;
  if (!isNaN(years))  s.years  = years;

  // Statement — auto-update stmtSub with years
  const stmtText = document.getElementById('ct-stmt').value.trim();
  const stmtSub  = document.getElementById('ct-stmt-sub').value.trim();
  if (stmtText) s.stmtText = stmtText;
  if (stmtSub)  s.stmtSub  = stmtSub;

  // Services
  s.services = DEFAULT_SERVICES.map((def, i) => {
    const n = i + 1;
    return {
      name:  (document.getElementById('ai-svc-' + n + '-name')  || {}).value  || def.name,
      desc:  (document.getElementById('ai-svc-' + n + '-desc')  || {}).value  || def.desc,
      price: (document.getElementById('ai-svc-' + n + '-price') || {}).value  || def.price
    };
  });

  // Gallery — use live state (includes reordering)
  s.gallery = galleryState.map(img => ({ href: img.href, title: img.title }));

  // Reviews
  s.reviews = DEFAULT_REVIEWS.map((def, i) => {
    const n = i + 1;
    return {
      text:     (document.getElementById('ai-rev-' + n + '-text') || {}).value || def.text,
      name:     (document.getElementById('ai-rev-' + n + '-name') || {}).value || def.name,
      initials: (document.getElementById('ai-rev-' + n + '-av')   || {}).value || def.initials
    };
  });

  try {
    await saveSiteSettings(s);
    localStorage.setItem('rekos-settings', JSON.stringify(s)); // Fallback-Kopie
    ['ss-content','ss-svc','ss-gallery','ss-rev'].forEach(flash);
  } catch(e) {
    alert('Fehler beim Speichern: ' + e.message);
  }
}

/* ─── RENDER: Services ─── */
function renderServicesList() {
  const container = document.getElementById('svc-list');
  if (!container) return;
  container.innerHTML = DEFAULT_SERVICES.map((svc, i) => {
    const n = i + 1;
    return `<div class="svc-admin-item">
      <div class="svc-admin-num">0${n} — ${['Service','Paket','Service','Service','Service','Service','Service','Service'][i]}</div>
      <div class="svc-inline">
        <input type="text" id="ai-svc-${n}-name" class="admin-input" placeholder="${svc.name}" value="${svc.name}" style="flex:0 0 180px;width:180px;">
        <input type="text" id="ai-svc-${n}-desc" class="admin-input" placeholder="${svc.desc}" value="${svc.desc}">
        <input type="text" id="ai-svc-${n}-price" class="admin-input svc-price-input" placeholder="${svc.price}" value="${svc.price}" style="width:80px;flex:0 0 80px;" title="Preis in €">
      </div>
    </div>`;
  }).join('');
}

/* ─── RENDER: Gallery ─── */
/* ─── GALLERY STATE ─── */
let galleryState = [];

function initGalleryState(saved) {
  galleryState = Array.from({ length: 7 }, (_, i) => ({
    href:  (saved && saved[i] && saved[i].href)  || ('assets/images/gallery-' + (i + 1) + '.jpg'),
    title: (saved && saved[i] && saved[i].title) || GALLERY_TITLES[i]
  }));
}

function renderGalleryList(items) {
  if (items) initGalleryState(items);
  const container = document.getElementById('gallery-admin-list');
  if (!container) return;
  container.innerHTML = '';
  galleryState.forEach((img, i) => {
    const isReal = img.href && !img.href.startsWith('assets/');
    const div = document.createElement('div');
    div.className = 'gi-admin-card';
    div.draggable = true;
    div.dataset.index = i;
    div.innerHTML = `
      <div class="gi-admin-drag" title="Ziehen zum Sortieren">⠿</div>
      <div class="gi-admin-thumb ${isReal ? '' : 'gi-admin-placeholder'}">
        ${isReal
          ? `<img src="${img.href}" alt="${img.title}">`
          : `<span>${String(i + 1).padStart(2, '0')}</span>`}
      </div>
      <div class="gi-admin-info">
        <input type="text" class="admin-input" value="${img.title}" placeholder="Bildtitel"
               onchange="galleryState[${i}].title = this.value">
        <div class="gi-admin-actions">
          <label class="btn-save" style="cursor:pointer;font-size:.7rem;padding:6px 12px;">
            ${isReal ? 'Ersetzen' : 'Hochladen'}
            <input type="file" accept="image/*" style="display:none" onchange="handleGalleryUpload(this,${i})">
          </label>
          ${isReal ? `<button class="gi-delete-btn" onclick="deleteGalleryItem(${i})">✕ Löschen</button>` : ''}
        </div>
      </div>`;
    div.addEventListener('dragstart', e => { dragSrc = i; div.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
    div.addEventListener('dragover',  e => { e.preventDefault(); container.querySelectorAll('.gi-admin-card').forEach(c => c.classList.remove('drag-over')); div.classList.add('drag-over'); });
    div.addEventListener('drop',      e => { e.preventDefault(); if (dragSrc !== i) { const tmp = galleryState[dragSrc]; galleryState[dragSrc] = galleryState[i]; galleryState[i] = tmp; renderGalleryList(); } });
    div.addEventListener('dragend',   () => container.querySelectorAll('.gi-admin-card').forEach(c => c.classList.remove('dragging','drag-over')));
    container.appendChild(div);
  });
}

let dragSrc = null;

async function handleGalleryUpload(input, index) {
  const file = input.files[0];
  if (!file) return;
  try {
    const url = await uploadGalleryImage(file, index + 1);
    galleryState[index] = { href: url, title: galleryState[index].title };
    renderGalleryList();
  } catch(e) { alert('Upload fehlgeschlagen: ' + e.message); }
}

function deleteGalleryItem(index) {
  if (!confirm('Bild entfernen?')) return;
  galleryState[index] = { href: 'assets/images/gallery-' + (index + 1) + '.jpg', title: GALLERY_TITLES[index] };
  renderGalleryList();
}

/* ─── RENDER: Reviews ─── */
function renderReviewsList() {
  const container = document.getElementById('rev-list');
  if (!container) return;
  container.innerHTML = DEFAULT_REVIEWS.map((rev, i) => {
    const n = i + 1;
    return `<div class="rev-admin-item">
      <div class="rev-admin-num">Bewertung ${n}</div>
      <div class="field-row">
        <label>Bewertungstext</label>
        <textarea id="ai-rev-${n}-text" class="admin-textarea" rows="3">${rev.text}</textarea>
      </div>
      <div class="rev-inline">
        <input type="text" id="ai-rev-${n}-name" class="admin-input" placeholder="Name" value="${rev.name}">
        <input type="text" id="ai-rev-${n}-av" class="admin-input rev-initials-input" placeholder="Kürzel" value="${rev.initials}" title="Kürzel (2 Buchstaben)">
      </div>
    </div>`;
  }).join('');
}

/* ─── RESET ─── */
document.getElementById('reset-btn').addEventListener('click', async () => {
  if (!confirm('Alle gespeicherten Daten (Öffnungszeiten + Inhalte) zurücksetzen?\nDie Website zeigt dann wieder die Standard-Werte.')) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('rekos-settings');
  try { await saveSiteSettings({}); } catch(e) {}
  location.reload();
});
