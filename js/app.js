// ─── GROUPS / ROWS ORDER ──────────────────────────────────────────────────────
const GROUP_ORDER = ['Tus Favoritos', 'Todos','Fórmula','Resistencia','Motos','GTs','Rally','Stock Cars','Touring Cars','Drift'];
let _favorites = JSON.parse(localStorage.getItem('wtp_favs') || '[]');

function toggleFavorite(e, catId) {
  if (e) e.stopPropagation();
  
  if (window.WTP_IS_LOGGED_IN && !window.WTP_IS_LOGGED_IN()) {
    return window.WTP_SHOW_AUTH_PROMPT();
  }

  if (_favorites.includes(catId)) {
    _favorites = _favorites.filter(id => id !== catId);
  } else {
    _favorites.push(catId);
  }
  localStorage.setItem('wtp_favs', JSON.stringify(_favorites));
  // Save scroll positions
  const scrollPositions = {};
  document.querySelectorAll('.row').forEach(row => {
    const scrollEl = row.querySelector('.row-scroll');
    if (row.id && scrollEl) {
      scrollPositions[row.id] = scrollEl.scrollLeft;
    }
  });

  // Re-render
  document.getElementById('rows-container').innerHTML = '';
  buildCategoryRows();

  // Restore scroll positions
  requestAnimationFrame(() => {
    Object.keys(scrollPositions).forEach(rowId => {
      const row = document.getElementById(rowId);
      if (row) {
        const scrollEl = row.querySelector('.row-scroll');
        if (scrollEl) {
          const originalSnap = scrollEl.style.scrollSnapType;
          scrollEl.style.scrollSnapType = 'none';
          scrollEl.style.scrollBehavior = 'auto';
          scrollEl.scrollLeft = scrollPositions[rowId];
          // Restore after a tiny delay to let the browser process the jump
          setTimeout(() => {
            scrollEl.style.scrollBehavior = '';
            scrollEl.style.scrollSnapType = originalSnap;
          }, 10);
        }
      }
    });
  });
  // Update modal button if open
  const modalFav = document.getElementById('modalFavBtn');
  if (modalFav && modalFav.dataset.id === catId) {
    updateModalFavBtn(catId);
  }
  
  // Sync to Firebase
  if (window.saveDataToFirebase) window.saveDataToFirebase(_favorites, _calcExpenses);
}

function updateModalFavBtn(catId) {
  const btn = document.getElementById('modalFavBtn');
  if (!btn) return;
  if (_favorites.includes(catId)) {
    btn.classList.add('active');
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Guardado';
  } else {
    btn.classList.remove('active');
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Guardar';
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Scroll -> nav solid
  window.addEventListener('scroll', () => {
    document.getElementById('topNav').classList.toggle('solid', window.scrollY > 10);
  }, { passive: true });

  // Sidebar logic
  const sidebar = document.getElementById('mobileSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarBackdrop.classList.add('open');
  });
  const closeSidebar = () => {
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('open');
  };
  document.getElementById('sidebarCloseBtn').addEventListener('click', closeSidebar);
  sidebarBackdrop.addEventListener('click', closeSidebar);

  // Logo click -> home
  document.querySelectorAll('.nav-brand').forEach(brand => {
    brand.addEventListener('click', () => {
      const searchInput = document.getElementById('catSearch');
      if (searchInput) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input')); // Trigger search clear
      }
      switchView('categories');
      closeSidebar();
    });
  });

  // Tab navigation
  document.querySelectorAll('.nav-link, .sidebar-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchView(link.dataset.target);
      if (link.classList.contains('sidebar-link')) closeSidebar();
    });
  });

  // Search logic
  const catSearch = document.getElementById('catSearch');
  if (catSearch) {
    catSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const rowsContainer = document.getElementById('rows-container');
      const searchContainer = document.getElementById('search-results-container');
      const billboard = document.querySelector('.billboard');

      if (q.length > 0) {
        rowsContainer.style.display = 'none';
        if (billboard) billboard.style.display = 'none';
        searchContainer.style.display = 'grid';
        searchContainer.innerHTML = '';

        const results = CATEGORIES.filter(c => c.name.toLowerCase().includes(q));
        if (results.length === 0) {
          searchContainer.innerHTML = '<p style="color:var(--text3); grid-column: 1 / -1; text-align:center;">No se encontraron categorías.</p>';
        } else {
          results.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'cat-card';
            
            const logoFile = LOGO_MAP[cat.id];
            const logoHtml = logoFile 
              ? `<img src="images/categories/${logoFile}" class="cat-card-logo" alt="${cat.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">`
              : '';

            const isFav = _favorites.includes(cat.id);
            card.innerHTML = `
              <div class="cat-card-glow"></div>
              <button class="cat-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(event, '${cat.id}')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </button>
              ${logoHtml}
              <span class="cat-card-name">${cat.name}</span>
              <span class="cat-card-group">${cat.group}</span>
            `;
            card.addEventListener('click', () => openModal(cat));
            searchContainer.appendChild(card);
          });
        }
      } else {
        rowsContainer.style.display = 'block';
        if (billboard) billboard.style.display = 'flex';
        searchContainer.style.display = 'none';
        searchContainer.innerHTML = '';
      }
    });
  }

  // Hook up Firebase integration globals
  window.WTP_GET_FAVS = () => _favorites;
  window.WTP_GET_EXPENSES = () => _calcExpenses;
  window.WTP_UPDATE_FAVS = (favs) => {
    _favorites = favs;
    localStorage.setItem('wtp_favs', JSON.stringify(_favorites));
    document.getElementById('rows-container').innerHTML = '';
    buildCategoryRows();
  };
  window.WTP_UPDATE_EXPENSES = (exps) => {
    _calcExpenses = exps;
    localStorage.setItem('wtp_calc', JSON.stringify(_calcExpenses));
    renderCalcList();
  };
  
  // Load expenses from local storage if available
  _calcExpenses = JSON.parse(localStorage.getItem('wtp_calc') || '[]');

  buildCategoryRows();
  buildCalculator();
  // Warm up rates
  getRateSummary().then(summary => {
    document.getElementById('rateNote').textContent = summary;
  });
});

function switchView(id) {
  document.querySelectorAll('.nav-link, .sidebar-link').forEach(l => l.classList.toggle('active', l.dataset.target === id));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  const searchContainer = document.querySelector('.nav-search-container');
  if (searchContainer) {
    searchContainer.style.display = id === 'categories' ? 'block' : 'none';
  }
}
window.switchView = switchView;

// ─── BUILD CATEGORY ROWS ──────────────────────────────────────────────────────
const LOGO_MAP = {
  'wrc': 'wrc.png',
  'erx': 'erx.svg',
  'f1': 'f1.png',
  'f2': 'f2.png',
  'f3': 'f3.png',
  'f4ita': 'f4italian.png',
  'indynxt': 'indynxt.png',
  'superf': 'superformula.png',
  'indycar': 'indycar.png',
  'wec': 'wec.png',
  'imsa': 'imsa.png',
  'elms': 'elms.png',
  'alms': 'alms.png',
  'nls': 'nls.png',
  'ewc': 'ewc.png',
  'gulf12': 'gulf12hours.png',
  'motogp': 'motogp.png',
  'moto2': 'moto2.png',
  'moto3': 'moto3.png',
  'wsbk': 'worldsbk.png',
  'iomtt': 'ttisleoftheman.png',
  'gtworld': 'gtwc.png',
  'gtwce': 'gtwceurope.png',
  'gtwca': 'gtwcamerica.svg',
  'adac': 'adacgtmasters.png',
  'dtm': 'dtm.png',
  'nascar_cup': 'nascarcup.png',
  'nascar_truck': 'nascartruck.png',
  'nascar_or': 'nascaroreilly.png',
  'arca': 'arca.png',
  'f2arg': 'formula2arg.png',
  'f3arg': 'formula3arg.jpg',
  'fnac': 'formulanacional.png',
  'fiat': 'fiatcompetizione.svg',
  'procar': 'procar.png',
  'toprace': 'toprace.png',
  'stock': 'stockcar.png',
  'supercars': 'supercars.png',
  'btcc': 'btcc.png',
  'tcr_world': 'tcrworldtour.png',
  'tcr_eu': 'tcreurope.png',
  'tcr_am': 'tcrsouthamerica.png',
  'btrc': 'btrc.png',
  'fdrift': 'formuladrift.png',
  'driftm': 'driftmasters.png',
  'tc': 'TC.png',
  'tc2000': 'TC2000.png',
  'tcm': 'TCM.png',
  'tcp': 'TCP.png',
  'tn': 'turismonacional.png',
  'tp': 'turismopista.png',
  'tcpk': 'TCPK.png',
  'tcpm': 'TCPM.png',
  'tcppk': 'TCPPK.png'
};

function buildCategoryRows() {
  const container = document.getElementById('rows-container');

  GROUP_ORDER.forEach(group => {
    let cats = [];
    if (group === 'Tus Favoritos') {
      cats = _favorites.map(id => CATEGORIES.find(c => c.id === id)).filter(Boolean);
    } else if (group === 'Todos') {
      cats = [...CATEGORIES].sort((a,b) => a.name.localeCompare(b.name));
    } else {
      cats = CATEGORIES.filter(c => c.group === group);
    }

    if (cats.length === 0) return;

    const row = document.createElement('div');
    row.className = 'row';
    row.id = `row-${group.replace(/\s+/g, '-').toLowerCase()}`;

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
      
      const logoFile = LOGO_MAP[cat.id];
      const logoHtml = logoFile 
        ? `<img src="images/categories/${logoFile}" class="cat-card-logo" alt="${cat.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">`
        : '';

      const isFav = _favorites.includes(cat.id);
      card.innerHTML = `
        <div class="cat-card-glow"></div>
        <button class="cat-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(event, '${cat.id}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </button>
        ${logoHtml}
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
    const btnPrev = header.querySelector('.row-arrow[data-dir="-1"]');
    const btnNext = header.querySelector('.row-arrow[data-dir="1"]');

    const updateArrows = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scroll;
      if (btnPrev) btnPrev.classList.toggle('disabled', scrollLeft <= 0);
      // Use a small threshold for floating point precision issues
      if (btnNext) btnNext.classList.toggle('disabled', scrollLeft + clientWidth >= scrollWidth - 5);
    };

    if (btnPrev) btnPrev.addEventListener('click', () => {
      scroll.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
    });
    if (btnNext) btnNext.addEventListener('click', () => {
      scroll.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
    });

    scroll.addEventListener('scroll', updateArrows, { passive: true });
    // Initial state after a small delay to ensure cards are rendered
    setTimeout(updateArrows, 100);
  });
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
let _modalOpen = false;

async function openModal(cat) {
  if (_modalOpen) return;
  _modalOpen = true;

  document.getElementById('modalTitle').textContent = cat.name;
  
  // Add Fav Button to modal header actions
  const modalActions = document.getElementById('modalHeaderActions');
  let oldBtn = document.getElementById('modalFavBtn');
  if (oldBtn) oldBtn.remove();
  
  const favBtn = document.createElement('button');
  favBtn.id = 'modalFavBtn';
  favBtn.dataset.id = cat.id;
  favBtn.className = 'modal-fav-btn';
  favBtn.onclick = () => toggleFavorite(null, cat.id);
  modalActions.prepend(favBtn);
  updateModalFavBtn(cat.id);

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
    const ars = await convertToARSWithCommission(p.price, p.cur || 'ARS', 0);
    priceStr = formatPrice(ars);
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
let _calcExpenses = []; // { name, price, cur, id }

function buildCalculator() {
  // Now it's dynamic, we just render the list (which starts empty)
  renderCalcList();
}

function openAddExpenseModal() {
  if (window.WTP_IS_LOGGED_IN && !window.WTP_IS_LOGGED_IN()) {
    return window.WTP_SHOW_AUTH_PROMPT();
  }
  const modal = document.getElementById('modal');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');

  title.textContent = 'Agregar Gasto';
  
  const subOptions = Object.entries(PLATFORMS)
    .filter(([_, p]) => p.price != null && p.price > 0 && p.type !== 'Pirata')
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([k, p]) => `<option value="${k}">${p.name} — ${p.price} ${p.cur || 'ARS'}</option>`)
    .join('');

  body.innerHTML = `
    <div class="add-form">
      <div class="add-type-tabs">
        <button class="add-type-tab active" id="tabSub" onclick="switchTab('sub')">📺 Suscripción</button>
        <button class="add-type-tab" id="tabCustom" onclick="switchTab('custom')">✏️ Personalizado</button>
      </div>

      <div id="subFields">
        <div class="form-group">
          <label>Plataforma</label>
          <select class="form-select" id="addSub">
            ${subOptions}
          </select>
        </div>
        <div class="form-group" style="margin-top:16px">
          <label>Impuesto / Recargo (%)</label>
          <div class="commission-presets">
            <button type="button" class="preset-btn" onclick="setSubCommission(0)">Sin recargo</button>
            <button type="button" class="preset-btn" onclick="setSubCommission(8)">8%</button>
            <button type="button" class="preset-btn" onclick="setSubCommission(21)">21%</button>
            <button type="button" class="preset-btn" onclick="setSubCommission(30)">30%</button>
          </div>
          <div class="commission-input-wrap">
            <input type="number" class="form-input" id="subCommissionVal" placeholder="0" min="0" max="200" step="0.5" value="0">
            <span class="commission-unit">%</span>
          </div>
        </div>
      </div>

      <div id="customFields" style="display:none">
        <div class="form-group">
          <label>Nombre del gasto</label>
          <input type="text" class="form-input" id="customName" placeholder="Ej: IPTV, Cable, Netflix...">
        </div>
        <div class="form-row" style="margin-top:16px">
          <div class="form-group">
            <label>Precio base</label>
            <input type="number" class="form-input" id="customPrice" placeholder="0.00" step="0.01">
          </div>
          <div class="form-group">
            <label>Moneda</label>
            <select class="form-select" id="customCur">
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-top:16px">
          <label>Impuesto / Recargo (%)</label>
          <div class="commission-presets">
            <button type="button" class="preset-btn" onclick="setCommission(0)">Sin recargo</button>
            <button type="button" class="preset-btn" onclick="setCommission(8)">8%</button>
            <button type="button" class="preset-btn" onclick="setCommission(21)">21%</button>
            <button type="button" class="preset-btn" onclick="setCommission(30)">30%</button>
          </div>
          <div class="commission-input-wrap">
            <input type="number" class="form-input" id="customCommission" placeholder="0" min="0" max="200" step="0.5" value="0">
            <span class="commission-unit">%</span>
          </div>
        </div>
      </div>


      <button id="modalSubmitBtn" class="add-submit-btn" onclick="submitAddExpense()">AGREGAR A LA LISTA</button>
    </div>
  `;

  document.getElementById('modalBackdrop').classList.add('open');
  modal.classList.add('open');
  _modalOpen = true;
}

// Global for the modal scope
window.switchTab = (val) => {
  document.getElementById('tabSub').classList.toggle('active', val === 'sub');
  document.getElementById('tabCustom').classList.toggle('active', val === 'custom');
  document.getElementById('subFields').style.display = val === 'sub' ? 'block' : 'none';
  document.getElementById('customFields').style.display = val === 'custom' ? 'block' : 'none';
};
window.toggleAddFields = window.switchTab;

window.setCommission = (val) => {
  const el = document.getElementById('customCommission');
  if (el) el.value = val;
};
window.setSubCommission = (val) => {
  const el = document.getElementById('subCommissionVal');
  if (el) el.value = val;
};

async function submitAddExpense() {
  const isSub = document.getElementById('tabSub')?.classList.contains('active') ?? true;
  let newItem = null;

  if (isSub) {
    const key = document.getElementById('addSub').value;
    const p = PLATFORMS[key];
    const commissionPct = parseFloat(document.getElementById('subCommissionVal')?.value ?? 0) || 0;
    newItem = { ...p, commission: commissionPct / 100, id: Date.now() + Math.random() };
  } else {
    const name = document.getElementById('customName').value.trim();
    const price = parseFloat(document.getElementById('customPrice').value);
    const cur = document.getElementById('customCur').value;
    const commissionPct = parseFloat(document.getElementById('customCommission')?.value ?? 0) || 0;
    if (!name || isNaN(price) || price <= 0) {
      alert('Por favor ingresá un nombre y precio válido');
      return;
    }
    newItem = { name, price, cur, type: 'Custom', commission: commissionPct / 100, id: Date.now() + Math.random() };
  }

  _calcExpenses.push(newItem);
  closeModal();
  renderCalcList();
  // Sync to Firebase
  if (window.saveDataToFirebase) window.saveDataToFirebase(_favorites, _calcExpenses);
}

async function renderCalcList() {
  const list = document.getElementById('calcList');
  list.innerHTML = '';
  
  // 1. Add the "Add Expense" Card
  const addBtn = document.createElement('button');
  addBtn.className = 'add-expense-btn';
  addBtn.onclick = openAddExpenseModal;
  addBtn.innerHTML = `
    <div class="add-icon-circle">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
    </div>
    <span>Agregar Gasto</span>
  `;
  list.appendChild(addBtn);

  if (_calcExpenses.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'calc-empty-state';
    empty.textContent = 'No hay otros gastos agregados.';
    list.appendChild(empty);
    document.getElementById('calcTotal').textContent = '$ 0';
    return;
  }

  let total = 0;
  for (let i = 0; i < _calcExpenses.length; i++) {
    const item = _calcExpenses[i];
    // Use the item's own commission; default 0 (no tax)
    const commission = item.commission ?? 0;
    const ars = await convertToARSWithCommission(item.price, item.cur || 'ARS', commission);
    total += ars;

    const row = document.createElement('div');
    row.className = 'calc-row';
    const commLabel = commission > 0 ? `+${Math.round(commission * 100)}%` : 'sin recargo';
    row.innerHTML = `
      <div class="calc-row-top">
        <span class="calc-row-badge">${item.cur || 'ARS'}</span>
        <button class="calc-row-remove" onclick="event.stopPropagation(); removeExpense(${i})" aria-label="Eliminar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="calc-row-info">
        <div class="calc-row-name">${item.name}</div>
        <div class="calc-row-original">${item.price} ${item.cur || 'ARS'} · ${commLabel}</div>
        <div class="calc-row-price">${formatPrice(ars)}</div>
      </div>
    `;
    row.onclick = () => openEditExpenseModal(i);
    list.appendChild(row);
  }

  document.getElementById('calcTotal').textContent = formatPrice(total);
  
  // Save to local storage only
  localStorage.setItem('wtp_calc', JSON.stringify(_calcExpenses));
}

window.removeExpense = (index) => {
  _calcExpenses.splice(index, 1);
  renderCalcList();
  if (window.saveDataToFirebase) window.saveDataToFirebase(_favorites, _calcExpenses);
};

function openEditExpenseModal(index) {
  const item = _calcExpenses[index];
  openAddExpenseModal(); // Open basic modal first
  
  const title = document.getElementById('modalTitle');
  const submitBtn = document.getElementById('modalSubmitBtn');
  
  if (title) title.textContent = 'Editar Gasto';
  if (submitBtn) {
    submitBtn.textContent = 'GUARDAR CAMBIOS';
    submitBtn.onclick = () => submitEditExpense(index);
  }

  const isCustom = item.type === 'Custom';
  if (isCustom) {
    window.switchTab('custom');
    document.getElementById('customName').value = item.name;
    document.getElementById('customPrice').value = item.price;
    document.getElementById('customCur').value = item.cur || 'ARS';
    document.getElementById('customCommission').value = (item.commission || 0) * 100;
  } else {
    window.switchTab('sub');
    // Find key in PLATFORMS
    const key = Object.keys(PLATFORMS).find(k => PLATFORMS[k].name === item.name);
    if (key) document.getElementById('addSub').value = key;
    document.getElementById('subCommissionVal').value = (item.commission || 0) * 100;
  }
}

async function submitEditExpense(index) {
  const isSub = document.getElementById('tabSub')?.classList.contains('active') ?? true;
  let updatedItem = null;

  if (isSub) {
    const key = document.getElementById('addSub').value;
    const p = PLATFORMS[key];
    const commissionPct = parseFloat(document.getElementById('subCommissionVal')?.value ?? 0) || 0;
    updatedItem = { ...p, commission: commissionPct / 100, id: _calcExpenses[index].id };
  } else {
    const name = document.getElementById('customName').value.trim();
    const price = parseFloat(document.getElementById('customPrice').value);
    const cur = document.getElementById('customCur').value;
    const commissionPct = parseFloat(document.getElementById('customCommission')?.value ?? 0) || 0;
    if (!name || isNaN(price) || price <= 0) return alert('Datos inválidos');
    updatedItem = { name, price, cur, type: 'Custom', commission: commissionPct / 100, id: _calcExpenses[index].id };
  }

  _calcExpenses[index] = updatedItem;
  closeModal();
  renderCalcList();
  if (window.saveDataToFirebase) window.saveDataToFirebase(_favorites, _calcExpenses);
}

window.openEditExpenseModal = openEditExpenseModal;
window.submitEditExpense = submitEditExpense;

window.openAddExpenseModal = openAddExpenseModal;
window.submitAddExpense = submitAddExpense;

