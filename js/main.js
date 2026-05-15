/**
 * main.js - MarmaAR Home Page Controller
 *
 * Imports the authoritative MARMA_DB (all 107 points) from marma-data.js
 * and adapts it for the Home Page card grid.
 *
 * Region mapping: inferred from key patterns in MARMA_DB (see REGION_MAP below).
 * No external dependencies - pure ES module.
 */

import { MARMA_DB, CAT_LABELS, CAT_META, getRegion } from './data.js';





/* ─────────────────────────────────────────────────────────────
   BUILD FLAT POINT ARRAY from MARMA_DB
   Converts the raw [fullName, size, tissue, cat, desc] tuples
   into structured objects for the UI.
   ──────────────────────────────────────────────────────────── */
const ALL_POINTS = Object.entries(MARMA_DB).map(([key, data]) => {
  const [fullName, sizeAngula, tissueType, category, desc] = data;

  return {
    id: key,
    name: fullName,
    region: getRegion(key),
    tissueType,
    category,
    sizeAngula,
    desc,                              // full clinical description
    interventionSafe: CAT_META[category]?.safe ?? false,
  };
});

/* ─────────────────────────────────────────────────────────────
   DOM REFERENCES
   ──────────────────────────────────────────────────────────── */
const searchInput = document.getElementById('marma-search');
const searchClearBtn = document.getElementById('search-clear-btn');
const cardGrid = document.getElementById('card-grid');
const resultsCount = document.getElementById('results-count');
const emptyState = document.getElementById('empty-state');
const filterPills = document.querySelectorAll('.filter-pill');
const safeToggle = document.getElementById('safe-only-toggle');
const resetBtn = document.getElementById('reset-btn');
const hamburgerBtn = document.getElementById('hamburger-btn');
const mobileNav = document.getElementById('mobile-nav');
const footerYear = document.getElementById('footer-year');

/* ─────────────────────────────────────────────────────────────
   STATE
   ──────────────────────────────────────────────────────────── */
let state = {
  query: '',
  region: 'all',
  safeOnly: false,
};

/* ─────────────────────────────────────────────────────────────
   CARD TEMPLATE
   ──────────────────────────────────────────────────────────── */
function renderCard(pt) {
  const meta = CAT_META[pt.category] ?? CAT_META.rujak;
  const catLabel = CAT_LABELS[pt.category] ?? pt.category;

  return `
    <article class="marma-card cat-${pt.category}" role="listitem"
             id="card-${pt.id.replace(/\s/g, '-')}" tabindex="0"
             aria-label="${pt.name} - ${catLabel}">
      <div class="card-header">
        <h3 class="card-name">${pt.name}</h3>
      </div>
      <div class="card-meta">
        <span class="meta-tag">${pt.region}</span>
        <span class="meta-tag">${pt.tissueType}</span>
        <span class="meta-tag cat-${pt.category}">${meta.shortLabel}</span>
      </div>
      <p class="card-desc">${pt.desc}</p>
    </article>`;
}

/* ─────────────────────────────────────────────────────────────
   FILTER
   ──────────────────────────────────────────────────────────── */
function getFiltered() {
  const q = state.query.toLowerCase().trim();
  return ALL_POINTS.filter(pt => {
    if (state.region !== 'all' && pt.region !== state.region) return false;
    if (state.safeOnly && !pt.interventionSafe) return false;
    if (q) {
      const hay = [pt.name, pt.region, pt.tissueType, pt.category,
      CAT_LABELS[pt.category] ?? '', pt.desc]
        .join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/* ─────────────────────────────────────────────────────────────
   RENDER
   ──────────────────────────────────────────────────────────── */
function render() {
  const pts = getFiltered();
  const total = ALL_POINTS.length;
  resultsCount.textContent = pts.length === total
    ? `Showing all ${total} Marma points`
    : `Showing ${pts.length} of ${total} Marma points`;

  if (pts.length === 0) {
    cardGrid.innerHTML = '';
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;
    cardGrid.innerHTML = pts.map(renderCard).join('');
  }
}

/* ─────────────────────────────────────────────────────────────
   EVENT HANDLERS
   ──────────────────────────────────────────────────────────── */
function onSearch() {
  state.query = searchInput.value;
  searchClearBtn.hidden = state.query.length === 0;
  render();
}

function onClear() {
  searchInput.value = '';
  state.query = '';
  searchClearBtn.hidden = true;
  searchInput.focus();
  render();
}

function onFilter(e) {
  const pill = e.target.closest('.filter-pill');
  if (!pill) return;
  filterPills.forEach(p => {
    const active = p === pill;
    p.classList.toggle('active', active);
    p.setAttribute('aria-pressed', String(active));
  });
  state.region = pill.dataset.region;
  render();
}

function onSafeToggle() {
  state.safeOnly = safeToggle.checked;
  render();
}

function onReset() {
  searchInput.value = '';
  state.query = '';
  searchClearBtn.hidden = true;
  filterPills.forEach(p => {
    const isAll = p.dataset.region === 'all';
    p.classList.toggle('active', isAll);
    p.setAttribute('aria-pressed', String(isAll));
  });
  state.region = 'all';
  safeToggle.checked = false;
  state.safeOnly = false;
  render();
}

function onHamburger() {
  const open = mobileNav.classList.toggle('open');
  hamburgerBtn.setAttribute('aria-expanded', String(open));
  mobileNav.setAttribute('aria-hidden', String(!open));
}

/* ─────────────────────────────────────────────────────────────
   INIT
   ──────────────────────────────────────────────────────────── */
function init() {
  if (footerYear) footerYear.textContent = new Date().getFullYear();

  searchInput.addEventListener('input', onSearch);
  searchClearBtn.addEventListener('click', onClear);
  document.querySelector('.filter-bar').addEventListener('click', onFilter);
  safeToggle.addEventListener('change', onSafeToggle);
  resetBtn.addEventListener('click', onReset);
  hamburgerBtn.addEventListener('click', onHamburger);
  mobileNav.addEventListener('click', e => {
    if (e.target.tagName === 'A' || e.target.classList.contains('btn')) {
      mobileNav.classList.remove('open');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
    }
  });

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
