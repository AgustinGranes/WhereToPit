// ─── GROUPS / ROWS ORDER ──────────────────────────────────────────────────────
const GROUP_ORDER = ['Todos','Fórmula','Resistencia','Motos','GTs','Rally','Stock Cars','Touring Cars','Drift'];

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Scroll -> nav solid
  window.addEventListener('scroll', () => {
    document.getElementById('topNav').classList.toggle('solid', window.scrollY > 10);
  }, { passive: true });

  // Tab navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchView(link.dataset.target);
    });
  });

  buildCategoryRows();
  buildCalculator();
  // Warm up rates
  fetchRealRates().then(rates => {
    const usd = rates['USD'];
    document.getElementById('rateNote').textContent =
      `USD Tarjeta: $${usd?.toFixed(0)} · EUR: $${rates['EUR']?.toFixed(0)} · GBP: $${rates['GBP']?.toFixed(0)}`;
  });
});

function switchView(id) {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.target === id));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── BUILD CATEGORY ROWS ──────────────────────────────────────────────────────
function buildCategoryRows() {
  const container = document.getElementById('rows-container');

  GROUP_ORDER.forEach(group => {
    const cats = group === 'Todos'
      ? [...CATEGORIES].sort((a,b) => a.name.localeCompare(b.name))
      : CATEGORIES.filter(c => c.group === group);

    if (cats.length === 0) return;

    const row = document.createElement('div');
    row.className = 'row';

    // Header: title + arrows
    const header = document.createElement('div');
    header.className = 'row-header';
    header.innerHTML = `
      <h3 class="row-title">${group} <span>${cats.length} categorías</span></h3>
      <div class="row-arrows">
        <button class="row-arrow" data-dir="-1" aria-label="Anterior">&#8249;</button>
        <button class="row-arrow" data-dir="1" aria-label="Siguiente">&#8250;</button>
      </div>
    `;
    row.appendChild(header);

    const wrap = document.createElement('div');
    wrap.className = 'row-scroll-wrap';

    const scroll = document.createElement('div');
    scroll.className = 'row-scroll';

    cats.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'cat-card';
      card.innerHTML = `
        <span class="cat-card-name">${cat.name}</span>
        <span class="cat-card-group">${cat.group}</span>
      `;
      card.addEventListener('click', () => openModal(cat));
      scroll.appendChild(card);
    });

    wrap.appendChild(scroll);
    row.appendChild(wrap);
    container.appendChild(row);

    // Arrow scroll logic
    const SCROLL_STEP = 182 * 3; // ~3 cards
    header.querySelectorAll('.row-arrow').forEach(btn => {
      btn.addEventListener('click', () => {
        scroll.scrollBy({ left: parseInt(btn.dataset.dir) * SCROLL_STEP, behavior: 'smooth' });
      });
    });
  });
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
let _modalOpen = false;

async function openModal(cat) {
  if (_modalOpen) return;
  _modalOpen = true;

  document.getElementById('modalTitle').textContent = cat.name;
  const body = document.getElementById('modalBody');
  body.innerHTML = '<p style="color:var(--text2);text-align:center;padding:24px 0">Cargando precios...</p>';

  document.getElementById('modalBackdrop').classList.add('open');
  document.getElementById('modal').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Sort: gratis first, then pago, then pirata last
  const sorted = [...cat.platforms].sort((a, b) => {
    const ta = (PLATFORMS[a]?.type || '').toLowerCase();
    const tb = (PLATFORMS[b]?.type || '').toLowerCase();
    if (ta === 'pirata' && tb !== 'pirata') return 1;
    if (tb === 'pirata' && ta !== 'pirata') return -1;
    if (ta.includes('gratis') && !tb.includes('gratis')) return -1;
    if (!ta.includes('gratis') && tb.includes('gratis')) return 1;
    return 0;
  });

  const fragments = await Promise.all(sorted.map(k => buildPlatItem(k)));
  body.innerHTML = '';
  fragments.forEach(el => body.appendChild(el));
}

async function buildPlatItem(key) {
  const p = PLATFORMS[key];
  if (!p) return document.createElement('div');

  const isGratis = p.price == null || p.price === 0;
  const isPirata = p.type === 'Pirata';

  let priceStr = 'Gratis';
  let typeClass = 'type-gratis';

  if (p.type.toLowerCase().includes('vpn')) typeClass = 'type-vpn';
  if (!isGratis) {
    typeClass = 'type-pago';
    const ars = await convertToARS(p.price, p.cur || 'ARS');
    priceStr = formatPrice(ars) + ' (+8% inc.)';
  }
  if (isPirata) { typeClass = 'type-pirata'; priceStr = 'Pirata'; }

  const el = document.createElement('div');
  el.className = 'plat-item';

  const hasLink = p.url && p.url !== null;
  el.innerHTML = `
    <div class="plat-info">
      <div class="plat-name">${p.name}</div>
      <div class="plat-type ${typeClass}">${p.type}</div>
      <div class="plat-price">${priceStr}</div>
    </div>
    ${hasLink
      ? `<a href="${p.url}" target="_blank" rel="noopener" class="plat-btn">VER AHORA</a>`
      : `<span class="plat-btn disabled">Sin link</span>`
    }
  `;
  return el;
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { _modalOpen = false; }, 400);
}

// ─── CALCULATOR ───────────────────────────────────────────────────────────────
function buildCalculator() {
  const list = document.getElementById('calcList');

  // Group paid platforms by category group
  const paidKeys = Object.keys(PLATFORMS).filter(k => {
    const p = PLATFORMS[k];
    return p.price != null && p.price > 0 && p.type !== 'Pirata';
  });

  // Group labels
  const groups = {
    'Oficiales Motorsport': ['rallytv_m','rallytv_a','f1tv_m','f1tv_a','fiawec_r','fiawec_s','fiawec_le','vp_moto_s','vp_moto_t','vp_sbk','msptv_m','msptv_a','floracing','indycar_m','indycar_s','sfgo_m','sfgo_a','superview','supercars_yt','ttplus','tcrtv_vip','rx_plus'],
    'Streaming General': ['dp_std','dp_prem','max_basic','max_std','max_prem','peacock_s','peacock_p','peacock_pp','espnplus','viaplay','dazn_motor','dazn_full','tntsports','kayo_std','kayo_prem','stan_basic','stan_std','stan_prem','skysports','skynz','globoplay','canalplus','jsports'],
    'TV Cable / EEUU': ['sling','youtubetv'],
  };

  Object.entries(groups).forEach(([groupName, keys]) => {
    const title = document.createElement('div');
    title.className = 'calc-group-title';
    title.textContent = groupName;
    list.appendChild(title);

    keys.forEach(k => {
      const p = PLATFORMS[k];
      if (!p) return;
      const row = document.createElement('div');
      row.className = 'calc-row';
      row.id = `calc-row-${k}`;

      row.innerHTML = `
        <div class="calc-row-info">
          <div class="calc-row-name">${p.name}</div>
          <div class="calc-row-price">${p.price} ${p.cur || 'ARS'} · <span class="ars-price" id="ars-${k}">calculando...</span></div>
        </div>
        <label class="toggle">
          <input type="checkbox" data-key="${k}" class="calc-cb">
          <div class="toggle-track"></div>
          <div class="toggle-thumb"></div>
        </label>
      `;
      list.appendChild(row);

      // Fill ARS price async
      convertToARS(p.price, p.cur || 'ARS').then(ars => {
        const el = document.getElementById(`ars-${k}`);
        if (el) el.textContent = formatPrice(ars) + ' c/8%';
      });
    });
  });

  // Listeners
  list.addEventListener('change', e => {
    if (e.target.classList.contains('calc-cb')) {
      e.target.closest('.calc-row').classList.toggle('checked', e.target.checked);
      updateTotal();
    }
  });
}

async function updateTotal() {
  const checked = document.querySelectorAll('.calc-cb:checked');
  let total = 0;
  for (const cb of checked) {
    const p = PLATFORMS[cb.dataset.key];
    if (p) total += await convertToARS(p.price, p.cur || 'ARS');
  }
  document.getElementById('calcTotal').textContent = formatPrice(total);
}
