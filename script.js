const API_URL = "http://localhost:8080/api/expenses";
const THEME_KEY = 'theme';

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
const ctxMonth = document.getElementById('monthlyChart').getContext('2d');
const incomeInput = document.getElementById('income');
const budgetInput = document.getElementById('budget');
const saveBudgetBtn = document.getElementById('saveBudgetBtn');

const BUDGET_KEY = 'budgetData'; // for localStorage

let categoryChart = null;
let monthlyChart = null;

const CATEGORY_META = {
  'Food': { icon: '🍔', css: 'category-Food' },
  'Transport': { icon: '🚌', css: 'category-Transport' },
  'Bills': { icon: '💡', css: 'category-Bills' },
  'Entertainment': { icon: '🎮', css: 'category-Entertainment' },
  'Shopping': { icon: '🛍️', css: 'category-Shopping' },
  'Health': { icon: '💊', css: 'category-Health' },
  'Other': { icon: '🔖', css: 'category-Other' },
};

const CHART_COLORS = ['#FF8A65','#FF6384','#FFCE56','#4BC0C0','#36A2EB','#9CCC65','#7E57C2','#FF7043','#26A69A'];

function showLoader(show) {
  document.getElementById('loader').classList.toggle('hidden', !show);
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.background = type === 'error' ? '#ef4444' : type === 'success' ? '#16a34a' : 'var(--accent)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

async function readStorage() {
  showLoader(true);
  try {
    const res = await fetch(API_URL);
    return await res.json();
  } catch {
    showToast("Failed to fetch data", "error");
    return [];
  } finally {
    showLoader(false);
  }
}

async function writeStorage(expense) {
  showLoader(true);
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expense)
    });
    showToast("Expense added!", "success");
  } catch {
    showToast("Error adding expense!", "error");
  } finally {
    showLoader(false);
  }
}

async function deleteExpense(id) {
  showLoader(true);
  try {
    const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error();
    showToast("Expense deleted!", "success");
  } catch {
    showToast("Failed to delete!", "error");
  } finally {
    showLoader(false);
  }
}

async function clearAllExpenses() {
  showLoader(true);
  try {
    await fetch(API_URL, { method: "DELETE" });
    showToast("All expenses cleared!", "success");
  } catch {
    showToast("Failed to clear!", "error");
  } finally {
    showLoader(false);
  }
}

function getTodayDate() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}
function saveBudgetData() {
  const income = parseFloat(incomeInput.value) || 0;
  const budget = parseFloat(budgetInput.value) || 0;
  if (!income || !budget || income <= 0 || budget <= 0) {
    showToast("Enter valid income and budget!", "error");
    return;
  }
  localStorage.setItem(BUDGET_KEY, JSON.stringify({ income, budget }));
  showToast("Budget saved successfully!", "success");
}

function loadBudgetData() {
  const data = JSON.parse(localStorage.getItem(BUDGET_KEY));
  if (data) {
    incomeInput.value = data.income;
    budgetInput.value = data.budget;
  }
  return data;
}


function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));
}

function formatCurrency(num) {
  return '₹' + Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

async function renderExpenses() {
  const items = (await readStorage()).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const search = (searchInput.value || '').toLowerCase();
  const filter = filterCategory.value || 'All';
  expensesList.innerHTML = '';

  const filtered = items.filter(it => {
    if (filter !== 'All' && it.category !== filter) return false;
    if (!search) return true;
    return it.description?.toLowerCase().includes(search) || it.category?.toLowerCase().includes(search);
  });

  if (!filtered.length) {
    expensesList.innerHTML = `<li class="muted small">No expenses yet</li>`;
  } else {
    filtered.forEach(item => {
      const li = document.createElement('li');
      li.className = 'expense-item enter';
      li.innerHTML = `
        <div class="expense-left">
          <div class="category-badge ${CATEGORY_META[item.category]?.css || 'category-Other'}">
            ${CATEGORY_META[item.category]?.icon || '🔖'}
          </div>
          <div class="expense-meta">
            <div class="expense-amt">${formatCurrency(item.amount)}</div>
            <div class="expense-desc">${escapeHtml(item.description || '')} • 
            <span class="muted">${new Date(item.date).toLocaleDateString()}</span></div>
          </div>
        </div>
        <div class="right-actions"><button class="delete-btn" data-id="${item.id}">Delete</button></div>`;
      expensesList.appendChild(li);
      requestAnimationFrame(()=>setTimeout(()=>li.classList.add('show'),20));
    });
  }
  attachDeleteHandlers();
  updateTotal();
  updateChart();
  updateMonthlyChart();
}

function attachDeleteHandlers() {
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = async function() {
      const id = this.dataset.id;
      if (!id || !confirm('Delete this expense?')) return;
      await deleteExpense(id);
      await renderExpenses();
    };
  });
}

async function updateTotal() {
  const items = await readStorage();
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  totalAmountEl.textContent = formatCurrency(total);
  totalCard.classList.add('pulse');
  setTimeout(() => totalCard.classList.remove('pulse'), 900);

  const budgetData = loadBudgetData();
  const warningBox = document.getElementById('budgetWarning');
  const warningText = document.getElementById('budgetWarningText');

  // Reset
  warningBox.className = 'budget-warning hidden';
  warningText.textContent = '';

  if (budgetData) {
    const { budget } = budgetData;
    const warningLimit = budget * 0.8;

    if (total >= warningLimit && total < budget) {
      showToast(`⚠️ You’ve spent over 80% of your ₹${budget} budget!`, "info");
      warningBox.className = 'budget-warning warning';
      warningText.textContent = `⚠️ Warning: You’ve spent ₹${formatCurrency(total)} of your ₹${budget} budget.`;
    } else if (total >= budget) {
      showToast(`🚨 Budget exceeded! You’ve spent ₹${formatCurrency(total)} of ₹${budget}.`, "error");
      warningBox.className = 'budget-warning danger';
      warningText.textContent = `🚨 Budget exceeded! You’re ${formatCurrency(total - budget)} over your ₹${budget} budget.`;
    }
  }
  if (total >= warningLimit && total < budget) {
  totalCard.style.boxShadow = '0 0 18px rgba(250, 204, 21, 0.4)';
} else if (total >= budget) {
  totalCard.style.boxShadow = '0 0 18px rgba(239, 68, 68, 0.4)';
} else {
  totalCard.style.boxShadow = '';
}

}



async function updateChart() {
  const items = await readStorage();
  const map = {};
  items.forEach(i => {
    const c = i.category || 'Other';
    map[c] = (map[c] || 0) + Number(i.amount || 0);
  });
  const labels = Object.keys(map);
  const data = labels.map(l => map[l]);
  const bg = labels.map((_,i)=>CHART_COLORS[i%CHART_COLORS.length]);
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx,{
    type:'pie',
    data:{labels,datasets:[{data,backgroundColor:bg,borderWidth:2}]},
    options:{plugins:{legend:{display:false}},responsive:true,maintainAspectRatio:false,animation:{duration:800,easing:'easeOutQuart'}}
  });
  renderChartLegend(labels,bg,map);
}




function renderChartLegend(labels,bg,map){
  const legend=document.getElementById('chartLegend');
  legend.innerHTML='';
  labels.forEach((l,i)=>{
    const el=document.createElement('div');
    el.style.display='flex';
    el.style.alignItems='center';
    el.style.gap='8px';
    el.innerHTML=`<div style="width:12px;height:12px;background:${bg[i]};border-radius:3px"></div>
    <div style="font-size:13px">${escapeHtml(l)} 
    <span class="muted" style="margin-left:6px;font-weight:700">${formatCurrency(map[l])}</span></div>`;
    legend.appendChild(el);
  });
}

async function updateMonthlyChart() {
  const items = await readStorage();
  const monthly = {};

  // Aggregate spending per month
  items.forEach(i => {
    const d = new Date(i.date);
    const m = d.toLocaleString('default', { month: 'short', year: 'numeric' });
    monthly[m] = (monthly[m] || 0) + Number(i.amount || 0);
  });

  const labels = Object.keys(monthly);
  const data = labels.map(l => monthly[l]);

  // Destroy previous chart instance
  if (monthlyChart) monthlyChart.destroy();

  // Create a smooth green gradient line
  const gradient = ctxMonth.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(34,197,94,0.35)');
  gradient.addColorStop(1, 'rgba(34,197,94,0.05)');

  monthlyChart = new Chart(ctxMonth, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Monthly Spending (₹)',
        data,
        fill: true,
        backgroundColor: gradient,
        borderColor: '#22c55e',
        borderWidth: 3,
        pointBackgroundColor: '#16a34a',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4, // smooth curves
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#fff',
          bodyColor: '#e2e8f0',
          borderColor: '#22c55e',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: ctx => ` ₹${ctx.formattedValue}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 13, weight: '600' } }
        },
        y: {
          grid: { color: 'rgba(100,116,139,0.1)' },
          ticks: { color: '#64748b', font: { size: 13 }, callback: val => '₹' + val.toLocaleString() },
          beginAtZero: true
        }
      },
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1200,
        easing: 'easeOutQuart'
      }
    }
  });
}


expenseForm.addEventListener('submit', async e => {
  e.preventDefault();
  const amount=parseFloat(amountInput.value);
  const category=categoryInput.value||'Other';
  const date=dateInput.value;
  const description=descInput.value.trim();
  if(!amount||amount<=0)return alert('Enter valid amount.');
  if(!category)return alert('Choose category.');
  if(!date)return alert('Choose date.');
  await writeStorage({amount,category,date,description});
  amountInput.value='';descInput.value='';categoryInput.selectedIndex=0;dateInput.value=getTodayDate();
  await renderExpenses();
});

clearAllBtn.addEventListener('click',async()=>{
  if(!confirm('Clear all expenses?'))return;
  await clearAllExpenses();
  await renderExpenses();
});

demoBtn.addEventListener('click',async()=>{
  const demo=[
    {amount:110,category:'Food',date:getTodayDate(),description:'Chicken + eggs'},
    {amount:2600,category:'Shopping',date:getTodayDate(),description:'Trousers'},
    {amount:7800,category:'Other',date:getTodayDate(),description:'House rent'}
  ];
  for(const d of demo)await writeStorage(d);
  await renderExpenses();
});

exportBtn.addEventListener('click',async()=>{
  const items=await readStorage();
  if(!items.length)return alert('No data to export.');
  const rows=[['amount','category','date','description']];
  items.forEach(it=>rows.push([it.amount,it.category,it.date,`"${(it.description||'').replace(/"/g,'""')}"`]));
  const csv=rows.map(r=>r.join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`expenses-${new Date().toISOString().slice(0,10)}.csv`;a.click();
  URL.revokeObjectURL(url);
});

searchInput.addEventListener('input',debounce(()=>renderExpenses(),250));
filterCategory.addEventListener('change',()=>renderExpenses());
themeToggle.addEventListener('change',e=>applyTheme(e.target.checked?'dark':'light'));

function applyTheme(theme){
  const isDark=theme==='dark';
  document.body.classList.toggle('dark',isDark);
  themeToggle.checked=isDark;
  localStorage.setItem(THEME_KEY,theme);
}

function debounce(fn,wait){
  let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),wait);}
}

document.addEventListener('DOMContentLoaded',async()=>{
  dateInput.value=getTodayDate();
  const cats=Object.keys(CATEGORY_META);
  categoryInput.innerHTML='<option value="" disabled selected>Select category</option>';
  cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;categoryInput.appendChild(o);});
  filterCategory.innerHTML='<option value="All">All Categories</option>';
  cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;filterCategory.appendChild(o);});
  applyTheme(localStorage.getItem(THEME_KEY)||'light');
  await renderExpenses();
  loadBudgetData();

});
saveBudgetBtn.addEventListener('click', saveBudgetData);
