// script.js — Upgraded Expense Tracker (LocalStorage + Chart.js + UI)

// ---- Config ----
const STORAGE_KEY = 'expenses';
const THEME_KEY = 'theme'; // 'dark' or 'light'

// ---- DOM ----
const expenseForm = document.getElementById('expenseForm');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const descInput = document.getElementById('description');

const expensesList = document.getElementById('expensesList');
const totalAmountEl = document.getElementById('totalAmount');
const totalCard = document.getElementById('totalCard');

const clearAllBtn = document.getElementById('clearAllBtn');
const demoBtn = document.getElementById('demoBtn');
const exportBtn = document.getElementById('exportBtn');

const searchInput = document.getElementById('searchInput');
const filterCategory = document.getElementById('filterCategory');

const themeToggle = document.getElementById('themeToggle');

const ctx = document.getElementById('categoryChart').getContext('2d');
let categoryChart = null;

// ---- Category icon map (for legend or display) ----
const CATEGORY_META = {
  'Food': { icon: '🍔', css: 'category-Food' },
  'Transport': { icon: '🚌', css: 'category-Transport' },
  'Bills': { icon: '💡', css: 'category-Bills' },
  'Entertainment': { icon: '🎮', css: 'category-Entertainment' },
  'Shopping': { icon: '🛍️', css: 'category-Shopping' },
  'Health': { icon: '💊', css: 'category-Health' },
  'Other': { icon: '🔖', css: 'category-Other' },
};

// ---- Utilities ----
function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse storage', e);
    return [];
  }
}
function writeStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function formatCurrency(v) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v);
  } catch {
    return '₹' + Number(v).toFixed(2);
  }
}
function getTodayDate(){
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth()+1).padStart(2,'0');
  const d = String(t.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function escapeHtml(str){
  return String(str || '').replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[m]; });
}

// small color palette for chart
const CHART_COLORS = [
  '#FF8A65','#FF6384','#FFCE56','#4BC0C0','#36A2EB','#9CCC65','#7E57C2','#FF7043','#26A69A'
];

// ---- App logic ----
function init(){
  // set date default
  dateInput.value = getTodayDate();

  // set filter categories (unique)
  populateFilterCategories();

  // load theme
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);

  // ensure storage exists
  if (!localStorage.getItem(STORAGE_KEY)) writeStorage([]);

  // render UI
  renderExpenses();
}

// populate category filter dropdown
function populateFilterCategories(){
  const categories = Object.keys(CATEGORY_META);
  filterCategory.innerHTML = '<option value="All">All Categories</option>';
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    filterCategory.appendChild(opt);
  });
}

// render expense list (respect search & filter)
function renderExpenses(){
  const items = readStorage().sort((a,b) => new Date(b.date) - new Date(a.date));
  const search = (searchInput.value || '').toLowerCase();
  const filter = filterCategory.value || 'All';

  expensesList.innerHTML = '';

  const filtered = items.filter(it => {
    if (filter !== 'All' && it.category !== filter) return false;
    if (!search) return true;
    return String(it.description || '').toLowerCase().includes(search) || String(it.category || '').toLowerCase().includes(search);
  });

  if (filtered.length === 0){
    expensesList.innerHTML = `<li class="muted small">No expenses — add one using the form.</li>`;
  } else {
    filtered.forEach(item => {
      const li = document.createElement('li');
      li.className = 'expense-item enter';
      li.innerHTML = `
        <div class="expense-left">
          <div class="category-badge ${CATEGORY_META[item.category]?.css || 'category-Other'}">${CATEGORY_META[item.category]?.icon || '🔖'}</div>
          <div class="expense-meta">
            <div class="expense-amt">${formatCurrency(item.amount)}</div>
            <div class="expense-desc">${escapeHtml(item.description || '')} • <span class="muted">${formatDate(item.date)}</span></div>
          </div>
        </div>
        <div class="right-actions">
          <button class="delete-btn" data-id="${item.id}">Delete</button>
        </div>
      `;
      expensesList.appendChild(li);

      // trigger enter animation shortly after insertion
      requestAnimationFrame(() => {
        setTimeout(()=> li.classList.add('show'), 20);
      });
    });
  }

  attachDeleteHandlers();
  updateTotal();
  updateChart();
}

// delete handlers
function attachDeleteHandlers(){
  const delBtns = document.querySelectorAll('.delete-btn');
  delBtns.forEach(btn => {
    btn.onclick = function(){
      const id = this.dataset.id;
      if (!id) return;
      if (!confirm('Delete this expense?')) return;
      let items = readStorage();
      items = items.filter(i=> String(i.id) !== String(id));
      writeStorage(items);
      renderExpenses();
    }
  });
}

// update total + pulse animation
function updateTotal(){
  const items = readStorage();
  const total = items.reduce((s,i) => s + Number(i.amount || 0), 0);
  const old = totalAmountEl.textContent;
  const newVal = formatCurrency(total || 0);
  if (old !== newVal){
    totalAmountEl.textContent = newVal;
    // pulse
    totalCard.classList.add('pulse');
    setTimeout(()=> totalCard.classList.remove('pulse'), 900);
  }
}

// Chart update
function formatDate(d){
  if(!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString();
}
function updateChart(){
  const items = readStorage();
  const map = {};
  items.forEach(i => {
    const c = i.category || 'Other';
    map[c] = (map[c] || 0) + Number(i.amount || 0);
  });

  const labels = Object.keys(map);
  const data = labels.map(l => map[l]);

  // generate colors (re-use palette)
  const bg = labels.map((_,i) => CHART_COLORS[i % CHART_COLORS.length]);

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: bg,
        borderColor: 'rgba(255,255,255,0.06)',
        borderWidth: 2,
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context){
              const val = context.raw ?? 0;
              return `${context.label}: ${formatCurrency(val)}`;
            }
          }
        }
      },
      responsive: true,
      maintainAspectRatio: false,
    }
  });

  renderChartLegend(labels, bg, map);
}

function renderChartLegend(labels, bg, map){
  const legendEl = document.getElementById('chartLegend');
  legendEl.innerHTML = '';
  labels.forEach((label,i) => {
    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '8px';
    el.style.paddingRight = '8px';
    el.innerHTML = `
      <div style="width:12px;height:12px;background:${bg[i]};border-radius:3px"></div>
      <div style="font-size:13px">${escapeHtml(label)} <span class="muted" style="margin-left:6px;font-weight:700">${formatCurrency(map[label])}</span></div>
    `;
    legendEl.appendChild(el);
  });
}

// ---- Events ----
expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value || 'Other';
  const date = dateInput.value;
  const description = descInput.value.trim();

  if (!amount || amount <= 0) {
    alert('Enter a valid amount.');
    return;
  }
  if (!category) {
    alert('Choose a category.');
    return;
  }
  if (!date) {
    alert('Choose a date.');
    return;
  }

  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,7),
    amount: Number(amount),
    category,
    date,
    description
  };

  const items = readStorage();
  items.push(item);
  writeStorage(items);

  // reset partial fields
  amountInput.value = '';
  descInput.value = '';
  categoryInput.selectedIndex = 0;
  dateInput.value = getTodayDate();

  renderExpenses();
});

// clear all
clearAllBtn.addEventListener('click', () => {
  if (!confirm('Clear all expenses? This cannot be undone.')) return;
  writeStorage([]);
  renderExpenses();
});

// demo data
demoBtn.addEventListener('click', () => {
  const demo = [
    { id: 'd1', amount: 110, category: 'Food', date: getTodayDate(), description: 'Chicken +eggs' },
    { id: 'd2', amount: 2600, category: 'Shopping', date: getTodayDate(), description: 'Trousers' },
    { id: 'd3', amount: 7800, category: 'Other', date: getTodayDate(), description: 'House rent' }
  ];
  writeStorage(demo);
  renderExpenses();
});

// export CSV
exportBtn.addEventListener('click', () => {
  const items = readStorage();
  if (!items || items.length === 0) { alert('No expenses to export.'); return; }
  const rows = [['id','amount','category','date','description']];
  items.forEach(it => rows.push([it.id, it.amount, it.category, it.date, `"${(it.description || '').replace(/"/g,'""')}"`]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expenses-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// search & filter re-render
searchInput.addEventListener('input', debounce(()=> renderExpenses(), 220));
filterCategory.addEventListener('change', () => renderExpenses());

// theme toggle
themeToggle.addEventListener('change', (e) => {
  applyTheme(e.target.checked ? 'dark' : 'light');
});

function applyTheme(theme){
  const isDark = theme === 'dark';
  if (isDark) document.body.classList.add('dark'); else document.body.classList.remove('dark');
  themeToggle.checked = isDark;
  localStorage.setItem(THEME_KEY, theme);
}

// small helper debounce
function debounce(fn, wait){
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(()=> fn(...args), wait);
  };
}

// init
document.addEventListener('DOMContentLoaded', () => {
  // ensure storage exists
  if (!localStorage.getItem(STORAGE_KEY)) writeStorage([]);

  // set date and initial
  dateInput.value = getTodayDate();

  // wire category select options: keep same categories as meta
  const catNames = Object.keys(CATEGORY_META);
  // (categoryInput already has options; but ensure order consistent)
  categoryInput.innerHTML = '<option value="" disabled selected>Select category</option>';
  catNames.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    categoryInput.appendChild(opt);
  });

  // populate filter and theme and render
  populateFilterCategories();
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);

  renderExpenses();
});
