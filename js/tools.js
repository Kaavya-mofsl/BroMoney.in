// tools.js — logic for all financial tools on tools.html

// ══════════════════════════════════════════════════════════
// SIP CALCULATOR
// ══════════════════════════════════════════════════════════

let sipChartInstance = null;

function calculateSIP() {
  const M         = parseFloat(document.getElementById('sipAmount').value);
  const annualRate = parseFloat(document.getElementById('sipRate').value);
  const years     = parseFloat(document.getElementById('sipYears').value);

  if (!M || !annualRate || !years || M <= 0 || annualRate <= 0 || years <= 0) {
    alert('Please enter valid positive values for all fields.');
    return;
  }

  const r = annualRate / 12 / 100;  // monthly rate
  const n = Math.round(years * 12); // total months

  // M × ({[1 + r]^n - 1} / r) × (1 + r)
  const corpus   = M * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  const invested = M * n;
  const returns  = corpus - invested;

  document.getElementById('sip-invested').textContent = fmtINR(invested);
  document.getElementById('sip-returns').textContent  = fmtINR(returns);
  document.getElementById('sip-corpus').textContent   = fmtINR(corpus);
  document.getElementById('sip-results').style.display = 'block';

  renderSIPChart(invested, returns);
}

function fmtINR(val) {
  return Math.round(val).toLocaleString('en-IN');
}

function renderSIPChart(invested, returns) {
  const ctx = document.getElementById('sipChart').getContext('2d');
  if (sipChartInstance) sipChartInstance.destroy();
  sipChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Invested Amount', 'Estimated Returns'],
      datasets: [{
        label: 'Amount (₹)',
        data: [invested, returns],
        backgroundColor: ['#4A90D9', '#F5A623'],
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => '₹' + Math.round(ctx.raw).toLocaleString('en-IN')
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: val => '₹' + val.toLocaleString('en-IN') }
        }
      }
    }
  });
}

// ══════════════════════════════════════════════════════════
// BOX SCORER — redirect to main analyzer
// ══════════════════════════════════════════════════════════

function initBOXScorer() {
  const sec = document.getElementById('tool-box-scorer');
  if (!sec || sec.innerHTML.trim()) return;
  sec.innerHTML = `
    <div class="news-section-header">
      <div class="news-section-accent"></div>
      <h2 class="news-section-title">BOX Theory Scorer</h2>
    </div>
    <p class="news-section-sub">The full BOX Theory Stock Analyzer lives on the main page.</p>
    <a href="index.html" class="tool-btn" style="text-decoration:none;margin-top:0;"><div class="tool-btn-glow"></div>
      Open BOX Analyzer →
    </a>
  `;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBOXScorer);
} else {
  initBOXScorer();
}

// ══════════════════════════════════════════════════════════
// ASSET ALLOCATION
// ══════════════════════════════════════════════════════════

function initAssetAllocation() {
  const allocSection = document.getElementById('tool-asset-allocation');
  if (allocSection && !allocSection.innerHTML.trim()) {
    allocSection.innerHTML = `
      <div class="news-section-header">
        <div class="news-section-accent"></div>
        <h2 class="news-section-title">Asset Allocation Visualizer</h2>
      </div>
      <p class="news-section-sub">Enter your asset values to see your portfolio breakdown.</p>

      <div style="display:grid;gap:12px;max-width:400px;margin-bottom:24px;">
        <label>Equity (₹)
          <input type="number" id="allocEquity" placeholder="e.g. 500000" min="0" style="display:block;width:100%;margin-top:4px;padding:8px;font-size:15px;">
        </label>
        <label>Debt / Fixed Income (₹)
          <input type="number" id="allocDebt" placeholder="e.g. 300000" min="0" style="display:block;width:100%;margin-top:4px;padding:8px;font-size:15px;">
        </label>
        <label>Gold (₹)
          <input type="number" id="allocGold" placeholder="e.g. 50000" min="0" style="display:block;width:100%;margin-top:4px;padding:8px;font-size:15px;">
        </label>
        <label>Cash / Savings (₹)
          <input type="number" id="allocCash" placeholder="e.g. 100000" min="0" style="display:block;width:100%;margin-top:4px;padding:8px;font-size:15px;">
        </label>
        <label>Real Estate (₹) — Optional
          <input type="number" id="allocRealEstate" placeholder="e.g. 2000000" min="0" style="display:block;width:100%;margin-top:4px;padding:8px;font-size:15px;">
        </label>
        <button class="tool-btn" onclick="calculateAllocation()"><div class="tool-btn-glow"></div>Visualize Allocation</button>
      </div>

      <div id="alloc-results" style="display:none;">
        <div style="max-width:400px; margin-bottom:24px;">
          <canvas id="allocChart"></canvas>
        </div>
        
        <table style="border-collapse:collapse;width:100%;max-width:500px;font-size:14px;margin-bottom:16px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.2);">Asset Class</th>
              <th style="text-align:right;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.2);">Amount (₹)</th>
              <th style="text-align:right;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.2);">% of Total</th>
            </tr>
          </thead>
          <tbody id="alloc-table-body"></tbody>
          <tfoot>
            <tr>
              <th style="text-align:left;padding:6px 10px;border-top:1px solid rgba(255,255,255,0.2);">Total</th>
              <th id="alloc-total-amount" style="text-align:right;padding:6px 10px;border-top:1px solid rgba(255,255,255,0.2);"></th>
              <th style="text-align:right;padding:6px 10px;border-top:1px solid rgba(255,255,255,0.2);">100%</th>
            </tr>
          </tfoot>
        </table>
        
        <div id="alloc-note" style="padding:12px; border-radius:6px; background:rgba(255,255,255,0.1); max-width:500px; font-size:15px;">
        </div>
      </div>
    `;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAssetAllocation);
} else {
  initAssetAllocation();
}

let allocChartInstance = null;

function calculateAllocation() {
  const equity = parseFloat(document.getElementById('allocEquity').value) || 0;
  const debt = parseFloat(document.getElementById('allocDebt').value) || 0;
  const gold = parseFloat(document.getElementById('allocGold').value) || 0;
  const cash = parseFloat(document.getElementById('allocCash').value) || 0;
  const realEstate = parseFloat(document.getElementById('allocRealEstate').value) || 0;

  const total = equity + debt + gold + cash + realEstate;

  if (total <= 0) {
    alert('Please enter at least one asset value greater than 0.');
    return;
  }

  const assets = [
    { name: 'Equity', amount: equity, color: '#4A90D9' },
    { name: 'Debt / Fixed Income', amount: debt, color: '#9B59B6' },
    { name: 'Gold', amount: gold, color: '#F5A623' },
    { name: 'Cash / Savings', amount: cash, color: '#2ECC71' },
    { name: 'Real Estate', amount: realEstate, color: '#E74C3C' }
  ].filter(a => a.amount > 0);

  // Update Table
  const tbody = document.getElementById('alloc-table-body');
  tbody.innerHTML = '';
  assets.forEach(a => {
    const pct = ((a.amount / total) * 100).toFixed(1);
    tbody.innerHTML += `
      <tr>
        <td style="text-align:left;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.1);">${a.name}</td>
        <td style="text-align:right;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.1);">₹${Math.round(a.amount).toLocaleString('en-IN')}</td>
        <td style="text-align:right;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.1);">${pct}%</td>
      </tr>
    `;
  });

  document.getElementById('alloc-total-amount').textContent = '₹' + Math.round(total).toLocaleString('en-IN');

  // Classification logic
  const equityPct = (equity / total) * 100;
  const safePct = ((debt + cash) / total) * 100;
  
  let profile = 'Balanced';
  if (equityPct >= 60) {
    profile = 'Equity-Heavy';
  } else if (safePct >= 60) {
    profile = 'Debt-Heavy';
  }

  document.getElementById('alloc-note').innerHTML = `Based on standard thumb rules, your portfolio is classified as <strong>${profile}</strong>.`;

  document.getElementById('alloc-results').style.display = 'block';

  // Render Chart
  const ctx = document.getElementById('allocChart').getContext('2d');
  if (allocChartInstance) allocChartInstance.destroy();
  
  allocChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: assets.map(a => a.name),
      datasets: [{
        data: assets.map(a => a.amount),
        backgroundColor: assets.map(a => a.color),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { 
          position: 'bottom',
          labels: { color: '#fff' }
        },
        tooltip: {
          callbacks: {
            label: context => {
              const val = context.raw;
              const pct = ((val / total) * 100).toFixed(1);
              return ` ${context.label}: ₹${Math.round(val).toLocaleString('en-IN')} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}


// ══════════════════════════════════════════════════════════
// GOAL CALCULATOR
// ══════════════════════════════════════════════════════════

/**
 * Reverse-SIP formula: given a target corpus C, monthly rate r, and n months,
 * solve for the required monthly SIP amount M.
 *
 *   C = M × ((1+r)^n - 1) / r × (1+r)
 *   ⟹  M = C × r / (((1+r)^n - 1) × (1+r))
 */
function calculateGoal() {
  const C          = parseFloat(document.getElementById('goalCorpus').value);
  const annualRate = parseFloat(document.getElementById('goalRate').value);
  const years      = parseFloat(document.getElementById('goalYears').value);

  if (!C || !annualRate || !years || C <= 0 || annualRate <= 0 || years <= 0) {
    alert('Please enter valid positive values for all fields.');
    return;
  }

  const r = annualRate / 12 / 100;   // monthly rate
  const n = Math.round(years * 12);  // total months

  // Required monthly SIP
  const M        = C * r / ((Math.pow(1 + r, n) - 1) * (1 + r));
  const invested = M * n;
  const returns  = C - invested;

  document.getElementById('goal-sip').textContent       = fmtINR(M);
  document.getElementById('goal-invested').textContent  = fmtINR(invested);
  document.getElementById('goal-returns').textContent   = fmtINR(returns);
  document.getElementById('goal-results').style.display = 'block';

  renderGoalMilestones(M, r, years);
}

/**
 * Build a milestone table: for each checkpoint year (1,2,3,5,7,10,15,20)
 * that falls within the user's time horizon, show the corpus accumulated.
 * Always include the final year as the last row.
 */
function renderGoalMilestones(M, r, totalYears) {
  const checkpoints = [1, 2, 3, 5, 7, 10, 15, 20];

  // Milestone years ≤ totalYears; always append the final year itself
  const milestoneYears = [
    ...checkpoints.filter(y => y < totalYears),
    totalYears
  ];

  const tbody = document.getElementById('goal-milestone-rows');
  tbody.innerHTML = '';

  milestoneYears.forEach(y => {
    const months  = Math.round(y * 12);
    const corpus  = M * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
    const isFinal = y === totalYears;

    const row = document.createElement('tr');
    row.style.background = isFinal ? 'rgba(245,166,35,0.12)' : 'transparent';

    row.innerHTML =
      `<td style="padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.08);">` +
        `Year ${y}${isFinal ? ' ✓' : ''}` +
      `</td>` +
      `<td style="padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:right;">` +
        `₹${fmtINR(corpus)}` +
      `</td>`;

    tbody.appendChild(row);
  });
}

// ══════════════════════════════════════════════════════════
// PE COMPARISON
// ══════════════════════════════════════════════════════════

(function initPEComparison() {
  const PE_WORKER_URL = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
    ? `${window.location.protocol}//${window.location.host}/proxy`
    : 'https://box-theory-proxy.plain-frost-a262.workers.dev';

  // ── Inject HTML into the empty section ──────────────────
  function mountPEHTML() {
    const sec = document.getElementById('tool-pe-comparison');
    if (!sec || sec.innerHTML.trim()) return;

    sec.innerHTML = `
      <div class="news-section-header">
        <div class="news-section-accent"></div>
        <h2 class="news-section-title">P/E Comparison Tool</h2>
      </div>
      <p class="news-section-sub">Enter two NSE ticker symbols to compare their P/E valuations.</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:500px;margin-bottom:16px;">
        <label>Ticker 1
          <input type="text" id="pe-ticker-1" placeholder="e.g. RELIANCE"
                 style="display:block;width:100%;margin-top:4px;padding:8px;font-size:15px;text-transform:uppercase;" />
        </label>
        <label>Ticker 2
          <input type="text" id="pe-ticker-2" placeholder="e.g. TCS"
                 style="display:block;width:100%;margin-top:4px;padding:8px;font-size:15px;text-transform:uppercase;" />
        </label>
      </div>

      <button id="pe-compare-btn" class="tool-btn" onclick="runPEComparison()" style="margin-bottom:24px;">
        <div class="tool-btn-glow"></div>Compare
      </button>

      <div id="pe-error" style="display:none;color:#EF4444;margin-bottom:16px;font-size:14px;"></div>
      <div id="pe-loading" style="display:none;font-size:14px;color:rgba(255,255,255,0.55);margin-bottom:16px;">
        Fetching data\u2026
      </div>

      <div id="pe-results" style="display:none;">
        <table id="pe-table"
               style="border-collapse:collapse;width:100%;max-width:560px;font-size:14px;margin-bottom:28px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.2);">Metric</th>
              <th id="pe-th-1" style="text-align:right;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.2);">\u2014</th>
              <th id="pe-th-2" style="text-align:right;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.2);">\u2014</th>
            </tr>
          </thead>
          <tbody id="pe-tbody"></tbody>
        </table>

        <div style="max-width:520px;margin-bottom:12px;">
          <canvas id="peChart"></canvas>
        </div>

        <p style="font-size:12px;color:rgba(255,255,255,0.40);margin-top:8px;max-width:520px;">
          \u2139\ufe0f Lower P/E may indicate undervaluation \u2014 but always check other metrics.
        </p>
      </div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountPEHTML);
  } else {
    mountPEHTML();
  }

  // ── Chart instance ───────────────────────────────────────
  let peChartInstance = null;

  // ── Exposed globally so onclick= works ──────────────────
  window.runPEComparison = async function () {
    const t1 = (document.getElementById('pe-ticker-1').value || '').trim().toUpperCase();
    const t2 = (document.getElementById('pe-ticker-2').value || '').trim().toUpperCase();

    if (!t1 || !t2) {
      showPEError('Please enter both ticker symbols.');
      return;
    }

    clearPEError();
    setPELoading(true);
    document.getElementById('pe-results').style.display = 'none';

    try {
      const [d1, d2] = await Promise.all([fetchPE(t1), fetchPE(t2)]);
      renderPEResults(t1, d1, t2, d2);
    } catch (err) {
      showPEError(err.message || 'Failed to fetch data. Please try again.');
    } finally {
      setPELoading(false);
    }
  };

  // ── Fetch + extract P/E data ─────────────────────────────
  async function fetchPE(symbol) {
    let res, data;
    try {
      res  = await fetch(`${PE_WORKER_URL}/?symbol=${encodeURIComponent(symbol)}`);
      data = await res.json();
    } catch (e) {
      throw new Error(`Network error fetching "${symbol}". Check your connection.`);
    }

    if (!res.ok || data.error) {
      const msg = data?.error || `HTTP ${res.status}`;
      throw new Error(`Could not fetch "${symbol}": ${msg}`);
    }

    const p = data.profile || {};
    const r = data.ratios  || {};

    const peNum = v => { const n = parseFloat(v); return (isNaN(n) || v == null) ? null : n; };

    // P/E: trailing preferred, fallback to forward
    const pe = peNum(r.trailingPE) || peNum(r.forwardPE) || null;

    // EPS: trailing from ratios, fallback to deriving from price / pe
    let eps = peNum(r.trailingEps) || null;
    if (eps === null && pe !== null && peNum(p.price)) {
      eps = parseFloat((peNum(p.price) / pe).toFixed(2));
    }

    return {
      companyName: p.companyName || symbol,
      price:       peNum(p.price),
      eps,
      pe,
      sector:      p.sector || p.industry || null,
    };
  }

  // ── Industry average P/E reference (NSE context) ─────────
  const INDUSTRY_PE = {
    'banking':           18, 'bank':              18,
    'financial services':22, 'nbfc':              22,
    'insurance':         25,
    'software':          32, 'it services':       32, 'technology': 30,
    'pharmaceutical':    28, 'pharma':            28, 'healthcare': 30,
    'fmcg':              48, 'consumer staples':  48, 'consumer goods': 45,
    'automobile':        22, 'auto':              22,
    'metals':            12, 'steel':             10, 'mining':     10,
    'oil & gas':         14, 'energy':            15, 'power':      15,
    'utilities':         16, 'cement':            18, 'telecom':    25,
    'real estate':       20, 'realty':            20,
    'media':             20, 'retail':            35,
    'chemicals':         25, 'infrastructure':    20,
  };

  function getIndustryAvgPE(sector) {
    if (!sector) return null;
    const key = sector.toLowerCase();
    for (const [k, v] of Object.entries(INDUSTRY_PE)) {
      if (key.includes(k)) return v;
    }
    return null;
  }

  // ── Render results ───────────────────────────────────────
  function renderPEResults(t1, d1, t2, d2) {
    document.getElementById('pe-th-1').textContent = d1.companyName || t1;
    document.getElementById('pe-th-2').textContent = d2.companyName || t2;

    const fmt   = v => (v !== null && v !== undefined) ? Number(v).toLocaleString('en-IN') : '\u2014';
    const fmtPE = v => (v !== null)                   ? Number(v).toFixed(2) + 'x'         : '\u2014';

    const rows = [
      ['Current Price (\u20b9)', fmt(d1.price),  fmt(d2.price)],
      ['EPS (\u20b9)',           fmt(d1.eps),    fmt(d2.eps)],
      ['P/E Ratio',              fmtPE(d1.pe),  fmtPE(d2.pe)],
    ];

    const avgPE1 = getIndustryAvgPE(d1.sector);
    const avgPE2 = getIndustryAvgPE(d2.sector);
    if (avgPE1 !== null || avgPE2 !== null) {
      rows.push(['Industry Avg P/E',
        avgPE1 !== null ? avgPE1.toFixed(1) + 'x' : '\u2014',
        avgPE2 !== null ? avgPE2.toFixed(1) + 'x' : '\u2014',
      ]);
    }

    const tbody = document.getElementById('pe-tbody');
    tbody.innerHTML = rows.map((row, i) =>
      `<tr>
        <td style="padding:7px 12px;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.65);">${row[0]}</td>
        <td style="padding:7px 12px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:right;font-weight:${i >= 2 ? 600 : 400};">${row[1]}</td>
        <td style="padding:7px 12px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:right;font-weight:${i >= 2 ? 600 : 400};">${row[2]}</td>
      </tr>`
    ).join('');

    renderPEChart(
      [d1.companyName || t1, d2.companyName || t2],
      [d1.pe, d2.pe]
    );

    document.getElementById('pe-results').style.display = 'block';
  }

  function renderPEChart(labels, peValues) {
    const ctx = document.getElementById('peChart').getContext('2d');
    if (peChartInstance) peChartInstance.destroy();

    peChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'P/E Ratio',
          data: peValues.map(v => v !== null ? v : 0),
          backgroundColor: ['#4A90D9', '#F5A623'],
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ctx.raw ? ` P/E: ${ctx.raw.toFixed(2)}x` : ' P/E: N/A'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: 'rgba(255,255,255,0.5)',
              callback: v => v + 'x'
            },
            grid: { color: 'rgba(255,255,255,0.07)' }
          },
          x: {
            ticks: { color: 'rgba(255,255,255,0.7)' },
            grid: { display: false }
          }
        }
      }
    });
  }

  // ── UI helpers ───────────────────────────────────────────
  function showPEError(msg) {
    const el = document.getElementById('pe-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  function clearPEError() {
    const el = document.getElementById('pe-error');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  }
  function setPELoading(on) {
    const el  = document.getElementById('pe-loading');
    const btn = document.getElementById('pe-compare-btn');
    if (el)  el.style.display = on ? 'block' : 'none';
    if (btn) btn.disabled = on;
  }
})();


// ══════════════════════════════════════════════════════════
// OPTIONS SIMULATOR
// ══════════════════════════════════════════════════════════

let optionsChartInstance = null;

function selectOptionType(type) {
  document.querySelector(`input[name="optionType"][value="${type}"]`).checked = true;
  const callLbl = document.getElementById('opt-call-lbl');
  const putLbl  = document.getElementById('opt-put-lbl');
  const ON  = { background: 'var(--accent)', color: '#0B0A09' };
  const OFF = { background: 'transparent',   color: 'rgba(255,255,255,0.45)' };
  Object.assign(callLbl.style, type === 'call' ? ON : OFF);
  Object.assign(putLbl.style,  type === 'put'  ? ON : OFF);
}

function calculateOption() {
  const type = document.querySelector('input[name="optionType"]:checked').value;
  const strike = parseFloat(document.getElementById('strikePrice').value);
  const premium = parseFloat(document.getElementById('premiumPaid').value);
  const spot = parseFloat(document.getElementById('expiryPrice').value);

  if (isNaN(strike) || isNaN(premium) || isNaN(spot) || strike < 0 || premium < 0 || spot < 0) {
    alert('Please enter valid positive numbers for all fields.');
    return;
  }

  let pnl = 0;
  let breakeven = 0;

  if (type === 'call') {
    pnl = Math.max(0, spot - strike) - premium;
    breakeven = strike + premium;
  } else {
    pnl = Math.max(0, strike - spot) - premium;
    breakeven = strike - premium;
  }

  const pnlEl = document.getElementById('option-pnl');
  pnlEl.textContent = '₹' + pnl.toFixed(2);
  pnlEl.style.color = pnl >= 0 ? '#4CAF50' : '#F44336';

  document.getElementById('option-breakeven').textContent = breakeven.toFixed(2);
  document.getElementById('option-results').style.display = 'block';

  renderOptionsChart(type, strike, premium);
}

function renderOptionsChart(type, strike, premium) {
  const prices = [];
  const pnls = [];

  const maxPrice = strike * 2 || 100;
  const step = maxPrice / 50 || 1;

  for (let p = 0; p <= maxPrice; p += step) {
    prices.push(p);
    if (type === 'call') {
      pnls.push(Math.max(0, p - strike) - premium);
    } else {
      pnls.push(Math.max(0, strike - p) - premium);
    }
  }

  if (optionsChartInstance) {
    optionsChartInstance.destroy();
    optionsChartInstance = null;
  }

  const ctx = document.getElementById('optionsChart').getContext('2d');

  optionsChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: prices.map(p => Math.round(p)),
      datasets: [{
        label: 'P&L (₹)',
        data: pnls,
        borderColor: '#F5A623',
        backgroundColor: 'rgba(245, 166, 35, 0.1)',
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => 'Spot Price: ₹' + items[0].label,
            label: ctx => 'P&L: ₹' + ctx.raw.toFixed(2)
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Spot Price at Expiry (₹)', color: 'rgba(255,255,255,0.6)' },
          ticks: { color: 'rgba(255,255,255,0.6)' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        y: {
          title: { display: true, text: 'Profit / Loss (₹)', color: 'rgba(255,255,255,0.6)' },
          ticks: { color: 'rgba(255,255,255,0.6)' },
          grid: {
            color: ctx => ctx.tick.value === 0 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'
          }
        }
      }
    }
  });
}


// ══════════════════════════════════════════════════════════
// PORTFOLIO OVERLAP CHECKER
// ══════════════════════════════════════════════════════════

(function initOverlapChecker() {
  const OVERLAP_WORKER_URL = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
    ? `${window.location.protocol}//${window.location.host}/proxy`
    : 'https://box-theory-proxy.plain-frost-a262.workers.dev';

  function mountHTML() {
    const sec = document.getElementById('tool-overlap');
    if (!sec || sec.innerHTML.trim()) return;

    sec.innerHTML = `
      <div class="news-section-header">
        <div class="news-section-accent"></div>
        <h2 class="news-section-title">Portfolio Overlap Checker</h2>
      </div>
      <p class="news-section-sub">Enter up to 5 NSE ticker symbols to see sector and characteristic overlaps in your portfolio.</p>

      <div style="display:grid;gap:10px;max-width:400px;margin-bottom:16px;">
        <label>Stock 1 <input type="text" id="ov-t1" placeholder="e.g. RELIANCE" style="display:block;margin-top:4px;text-transform:uppercase;"></label>
        <label>Stock 2 <input type="text" id="ov-t2" placeholder="e.g. HDFCBANK" style="display:block;margin-top:4px;text-transform:uppercase;"></label>
        <label>Stock 3 (optional) <input type="text" id="ov-t3" placeholder="e.g. TCS" style="display:block;margin-top:4px;text-transform:uppercase;"></label>
        <label>Stock 4 (optional) <input type="text" id="ov-t4" placeholder="e.g. INFY" style="display:block;margin-top:4px;text-transform:uppercase;"></label>
        <label>Stock 5 (optional) <input type="text" id="ov-t5" placeholder="e.g. WIPRO" style="display:block;margin-top:4px;text-transform:uppercase;"></label>
        <button id="ov-btn" class="tool-btn" onclick="runOverlapCheck()"><div class="tool-btn-glow"></div>Check Overlap</button>
      </div>

      <div id="ov-loading" style="display:none;font-size:14px;color:rgba(255,255,255,0.55);margin-bottom:16px;">Fetching data…</div>
      <div id="ov-error"   style="display:none;color:#EF4444;font-size:14px;margin-bottom:16px;"></div>
      <div id="ov-results" style="display:none;max-width:700px;"></div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountHTML);
  } else {
    mountHTML();
  }

  async function fetchStock(symbol) {
    const res  = await fetch(`${OVERLAP_WORKER_URL}/?symbol=${encodeURIComponent(symbol)}`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(`"${symbol}": ${data.error || 'Not found'}`);
    return { symbol, ...data };
  }

  function mktCapBucket(cap) {
    if (!cap || cap <= 0) return 'Unknown';
    const cr = cap / 1e7;
    if (cr >= 20000) return 'Large Cap (≥ ₹20,000 Cr)';
    if (cr >= 5000)  return 'Mid Cap (₹5,000–20,000 Cr)';
    return 'Small Cap (< ₹5,000 Cr)';
  }

  function deBucket(de) {
    if (de == null || de < 0) return 'Unknown';
    if (de < 0.5)  return 'Low Debt (D/E < 0.5)';
    if (de <= 2.0) return 'Moderate Debt (D/E 0.5–2)';
    return 'High Debt (D/E > 2)';
  }

  function marginBucket(m) {
    if (m == null) return 'Unknown';
    const pct = m * 100;
    if (pct >= 20) return 'High Margin (≥ 20%)';
    if (pct >= 10) return 'Medium Margin (10–20%)';
    return 'Low Margin (< 10%)';
  }

  function groupBy(stocks, keyFn) {
    const map = {};
    stocks.forEach(s => {
      const k = keyFn(s) || 'Unknown';
      if (!map[k]) map[k] = [];
      map[k].push(s.symbol);
    });
    return map;
  }

  function renderGroupTable(title, groups) {
    const all = Object.entries(groups);

    let html = `<h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">${title}</h3>`;
    html += `<table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:8px;">
      <thead><tr>
        <th style="text-align:left;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.15);">Group</th>
        <th style="text-align:left;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.15);">Stocks</th>
        <th style="text-align:center;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.15);">Overlap?</th>
      </tr></thead><tbody>`;

    all.forEach(([group, syms]) => {
      const isOverlap = syms.length > 1;
      html += `<tr style="background:${isOverlap ? 'rgba(239,68,68,0.08)' : 'transparent'}">
        <td style="padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.07);">${group}</td>
        <td style="padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.07);">${syms.join(', ')}</td>
        <td style="padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.07);text-align:center;">${isOverlap ? '⚠ Yes' : '—'}</td>
      </tr>`;
    });

    html += `</tbody></table>`;

    const overlapping = all.filter(([, arr]) => arr.length > 1);
    if (overlapping.length === 0) {
      html += `<p style="font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:4px;">No overlap found.</p>`;
    } else {
      overlapping.forEach(([group, syms]) => {
        const dim = title.toLowerCase().replace(' breakdown','');
        html += `<p style="font-size:13px;color:#EF4444;margin-bottom:4px;">
          ⚠ ${syms.join(' & ')} share the same ${dim}: <strong>${group}</strong>
        </p>`;
      });
    }

    return html;
  }

  function renderSummaryCard(stocks) {
    const allGroups = [
      groupBy(stocks, s => s.profile?.sector   || 'Unknown'),
      groupBy(stocks, s => s.profile?.industry  || 'Unknown'),
      groupBy(stocks, s => mktCapBucket(s.profile?.mktCap)),
      groupBy(stocks, s => deBucket(s.ratios?.debtEquityRatioTTM)),
      groupBy(stocks, s => marginBucket(s.ratios?.ebitdaMarginTTM)),
    ];
    const overlapCount = allGroups.reduce((total, groups) =>
      total + Object.values(groups).filter(arr => arr.length > 1).length, 0);

    const color = overlapCount === 0 ? '#4CAF50' : overlapCount <= 2 ? '#F5A623' : '#EF4444';
    const label = overlapCount === 0 ? 'Low overlap — well diversified' :
                  overlapCount <= 2  ? 'Moderate overlap — some concentration risk' :
                                       'High overlap — significant concentration risk';

    return `<div style="padding:14px 18px;border-left:3px solid ${color};background:rgba(255,255,255,0.04);margin-bottom:8px;">
      <strong style="color:${color};font-size:15px;">${label}</strong>
      <p style="font-size:13px;color:rgba(255,255,255,0.5);margin:4px 0 0;">${overlapCount} overlap(s) detected across sector, industry, cap size, debt profile, and margin profile.</p>
    </div>`;
  }

  function renderStockTable(stocks) {
    let html = `<h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">Stock Summary</h3>
    <table style="border-collapse:collapse;width:100%;font-size:13px;margin-bottom:8px;">
      <thead><tr>
        <th style="text-align:left;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.15);">Symbol</th>
        <th style="text-align:left;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.15);">Company</th>
        <th style="text-align:left;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.15);">Sector</th>
        <th style="text-align:left;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.15);">Industry</th>
        <th style="text-align:right;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.15);">Mkt Cap</th>
      </tr></thead><tbody>`;

    stocks.forEach(s => {
      const cap    = s.profile?.mktCap;
      const capStr = cap ? '₹' + Math.round(cap / 1e7).toLocaleString('en-IN') + ' Cr' : '—';
      html += `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.07);font-weight:600;">${s.symbol}</td>
        <td style="padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.07);">${s.profile?.companyName || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.07);">${s.profile?.sector    || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.07);">${s.profile?.industry  || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.07);text-align:right;">${capStr}</td>
      </tr>`;
    });

    html += `</tbody></table>`;
    return html;
  }

  window.runOverlapCheck = async function () {
    const ids     = ['ov-t1','ov-t2','ov-t3','ov-t4','ov-t5'];
    const symbols = ids
      .map(id => (document.getElementById(id)?.value || '').trim().toUpperCase())
      .filter(Boolean);

    const errEl  = document.getElementById('ov-error');
    const loadEl = document.getElementById('ov-loading');
    const resEl  = document.getElementById('ov-results');
    const btn    = document.getElementById('ov-btn');

    errEl.style.display  = 'none';
    resEl.style.display  = 'none';
    errEl.textContent    = '';

    if (symbols.length < 2) {
      errEl.textContent   = 'Please enter at least 2 ticker symbols.';
      errEl.style.display = 'block';
      return;
    }

    loadEl.style.display = 'block';
    btn.disabled = true;

    try {
      const results = await Promise.all(symbols.map(fetchStock));

      let html = renderSummaryCard(results);
      html += renderStockTable(results);
      html += renderGroupTable('Sector Breakdown',         groupBy(results, s => s.profile?.sector  || 'Unknown'));
      html += renderGroupTable('Industry Breakdown',       groupBy(results, s => s.profile?.industry || 'Unknown'));
      html += renderGroupTable('Market Cap Breakdown',     groupBy(results, s => mktCapBucket(s.profile?.mktCap)));
      html += renderGroupTable('Debt Profile Breakdown',   groupBy(results, s => deBucket(s.ratios?.debtEquityRatioTTM)));
      html += renderGroupTable('Margin Profile Breakdown', groupBy(results, s => marginBucket(s.ratios?.ebitdaMarginTTM)));

      html += `<p style="font-size:12px;color:rgba(255,255,255,0.3);margin-top:24px;">
        ℹ️ Data sourced from Yahoo Finance via Cloudflare Worker. Not investment advice.
      </p>`;

      resEl.innerHTML     = html;
      resEl.style.display = 'block';
    } catch (err) {
      errEl.textContent   = err.message || 'Failed to fetch data. Please try again.';
      errEl.style.display = 'block';
    } finally {
      loadEl.style.display = 'none';
      btn.disabled = false;
    }
  };
})();


// ══════════════════════════════════════════════════════════
// EARNINGS CALENDAR
// ══════════════════════════════════════════════════════════

(function initEarningsCalendar() {
  const WORKER_URL = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
    ? `${window.location.protocol}//${window.location.host}/proxy`
    : 'https://box-theory-proxy.plain-frost-a262.workers.dev';

  // Top NSE stocks used as fallback when the bulk calendar returns no results
  const CURATED = [
    'RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK',
    'BHARTIARTL','KOTAKBANK','ITC','AXISBANK','SBIN',
    'LT','WIPRO','HCLTECH','BAJFINANCE','TITAN',
    'NESTLEIND','MARUTI','SUNPHARMA','TATAMOTORS','ASIANPAINT',
    'DRREDDY','CIPLA','POWERGRID','NTPC','ONGC',
    'HINDALCO','JSWSTEEL','TECHM','M&M','EICHERMOT',
  ];

  // ── Mount HTML ─────────────────────────────────────────
  function mountHTML() {
    const sec = document.getElementById('tool-earnings');
    if (!sec || sec.innerHTML.trim()) return;

    sec.innerHTML = `
      <div class="news-section-header">
        <div class="news-section-accent"></div>
        <h2 class="news-section-title">Earnings Calendar</h2>
      </div>
      <p class="news-section-sub">Upcoming NSE quarterly result dates. Click <em>Remind Me</em> to get a browser notification on the result day.</p>

      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:20px;">
        <span style="font-size:13px;color:rgba(255,255,255,0.5);">Show next:</span>
        <button class="ec-range-btn" data-days="14"  style="padding:6px 14px;font-size:13px;cursor:pointer;">14 days</button>
        <button class="ec-range-btn" data-days="30"  style="padding:6px 14px;font-size:13px;cursor:pointer;background:var(--gold);color:#0D1142;font-weight:600;">30 days</button>
        <button class="ec-range-btn" data-days="60"  style="padding:6px 14px;font-size:13px;cursor:pointer;">60 days</button>
        <button class="ec-range-btn" data-days="90"  style="padding:6px 14px;font-size:13px;cursor:pointer;">90 days</button>
        <button id="ec-load-btn" class="tool-btn" onclick="loadEarnings()" style="margin-left:auto;">
          <div class="tool-btn-glow"></div>Load Calendar
        </button>
      </div>

      <div id="ec-loading" style="display:none;font-size:14px;color:rgba(255,255,255,0.5);margin-bottom:16px;">
        Fetching upcoming results…
      </div>
      <div id="ec-error" style="display:none;color:#EF4444;font-size:14px;margin-bottom:16px;padding:10px;background:rgba(239,68,68,0.08);border-radius:4px;"></div>
      <div id="ec-reminder-confirm" style="display:none;padding:10px 14px;background:rgba(245,166,35,0.12);border-left:3px solid var(--gold);font-size:13px;margin-bottom:16px;border-radius:0 4px 4px 0;"></div>
      <div id="ec-results"></div>

      <p style="margin-top:24px;font-size:12px;color:rgba(255,255,255,0.3);">
        ℹ️ Data via Yahoo Finance. Dates are estimates — always verify with the exchange. Reminders fire when you open this page on the result date.
      </p>
    `;

    // Range button highlight
    sec.querySelectorAll('.ec-range-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sec.querySelectorAll('.ec-range-btn').forEach(b => {
          b.style.background = '';
          b.style.color = '';
          b.style.fontWeight = '';
        });
        btn.style.background  = 'var(--gold)';
        btn.style.color       = '#0D1142';
        btn.style.fontWeight  = '600';
        window._ecDays = parseInt(btn.dataset.days, 10);
      });
    });

    window._ecDays = 30;

    checkPendingReminders();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountHTML);
  } else {
    mountHTML();
  }

  // ── Date helpers ────────────────────────────────────────
  function toEpoch(date) { return Math.floor(date.getTime() / 1000); }

  function fmtDateLabel(isoDate) {
    const d = new Date(isoDate + 'T00:00:00');
    const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function isToday(isoDate) {
    return isoDate === new Date().toISOString().split('T')[0];
  }

  function daysUntil(isoDate) {
    const today = new Date(); today.setHours(0,0,0,0);
    const tgt   = new Date(isoDate + 'T00:00:00');
    return Math.round((tgt - today) / 86400000);
  }

  // ── Fetch bulk calendar from the Worker ─────────────────
  async function fetchBulkCalendar(from, to) {
    const res  = await fetch(`${WORKER_URL}/?action=earnings&from=${from}&to=${to}`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
    return data.earnings || [];
  }

  // ── Per-symbol fallback (calendarEvents module) ─────────
  async function fetchSymbolEarnings(symbol) {
    try {
      const res  = await fetch(`${WORKER_URL}/?symbol=${encodeURIComponent(symbol)}`);
      const data = await res.json();
      if (!res.ok || data.error) return null;
      const dates = data.earnings?.earningsDate || [];
      if (!dates.length) return null;
      return {
        ticker:  symbol,
        company: data.profile?.companyName || symbol,
        date:    dates[0],
        timing:  '',
      };
    } catch (_) { return null; }
  }

  async function fetchCuratedEarnings(from, to) {
    const fromDate = new Date(from * 1000).toISOString().split('T')[0];
    const toDate   = new Date(to   * 1000).toISOString().split('T')[0];
    const BATCH    = 5;
    const results  = [];

    for (let i = 0; i < CURATED.length; i += BATCH) {
      const batch = CURATED.slice(i, i + BATCH);
      const items = await Promise.all(batch.map(fetchSymbolEarnings));
      items.forEach(item => {
        if (item && item.date && item.date >= fromDate && item.date <= toDate) {
          results.push(item);
        }
      });
    }
    return results.sort((a, b) => a.date.localeCompare(b.date));
  }

  // ── Main load ───────────────────────────────────────────
  window.loadEarnings = async function () {
    const days = window._ecDays || 30;
    const now  = new Date(); now.setHours(0,0,0,0);
    const end  = new Date(now); end.setDate(end.getDate() + days);
    const from = toEpoch(now);
    const to   = toEpoch(end);

    const loadEl = document.getElementById('ec-loading');
    const errEl  = document.getElementById('ec-error');
    const resEl  = document.getElementById('ec-results');
    const btn    = document.getElementById('ec-load-btn');

    errEl.style.display = 'none';
    resEl.innerHTML     = '';
    loadEl.style.display = 'block';
    if (btn) btn.disabled = true;

    try {
      let earnings = [];

      // Primary: bulk Worker endpoint (requires re-deployed worker.js)
      try {
        earnings = await fetchBulkCalendar(from, to);
      } catch (_) { /* fall through to per-symbol */ }

      // Fallback: per-symbol calendarEvents for curated Nifty stocks
      if (!earnings.length) {
        loadEl.textContent = 'Fetching per-symbol data (this may take a moment)…';
        earnings = await fetchCuratedEarnings(from, to);
      }

      renderCalendar(earnings, days);
    } catch (err) {
      errEl.textContent   = err.message || 'Failed to fetch earnings data. Please try again.';
      errEl.style.display = 'block';
    } finally {
      loadEl.style.display = 'none';
      loadEl.textContent   = 'Fetching upcoming results…';
      if (btn) btn.disabled = false;
    }
  };

  // ── Render calendar list ────────────────────────────────
  function renderCalendar(earnings, days) {
    const resEl = document.getElementById('ec-results');

    if (!earnings.length) {
      resEl.innerHTML = `<p style="color:rgba(255,255,255,0.45);font-size:14px;padding:16px 0;">
        No upcoming earnings found for the next ${days} days in this dataset.
      </p>`;
      return;
    }

    // Group by date
    const byDate = {};
    earnings.forEach(e => {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });

    const saved = getSavedReminders();
    let html = '';

    Object.keys(byDate).sort().forEach(date => {
      const items  = byDate[date];
      const today  = isToday(date);
      const du     = daysUntil(date);
      const badge  = today
        ? `<span style="margin-left:8px;padding:2px 8px;font-size:11px;font-weight:700;background:#EF4444;color:#fff;border-radius:10px;">TODAY</span>`
        : du === 1
          ? `<span style="margin-left:8px;padding:2px 8px;font-size:11px;font-weight:600;background:rgba(245,166,35,0.25);color:var(--gold);border-radius:10px;">TOMORROW</span>`
          : '';

      html += `<div style="margin-bottom:28px;">
        <div style="display:flex;align-items:center;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.12);">
          <span style="font-size:14px;font-weight:700;color:var(--gold);">${fmtDateLabel(date)}</span>
          ${badge}
          <span style="margin-left:auto;font-size:12px;color:rgba(255,255,255,0.3);">
            ${today ? 'results expected today' : `in ${du} day${du !== 1 ? 's' : ''}`}
          </span>
        </div>`;

      items.forEach(e => {
        const k         = `${e.ticker}|${e.date}`;
        const isSaved   = saved.some(r => r.key === k);
        const timingStr = e.timing === 'BMO' ? 'Before open'
                        : e.timing === 'AMC' ? 'After close'
                        : e.timing === 'TNS' ? '' : (e.timing || '');
        const safeName  = (e.company || e.ticker).replace(/'/g, '’');

        html += `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <div style="flex:1;min-width:0;">
              <span style="font-weight:600;font-size:14px;">${e.company || e.ticker}</span>
              ${e.ticker && e.ticker !== (e.company || '')
                ? `<span style="margin-left:8px;font-size:12px;color:rgba(255,255,255,0.38);">${e.ticker}</span>`
                : ''}
              ${timingStr
                ? `<span style="margin-left:8px;font-size:11px;color:rgba(255,255,255,0.3);">${timingStr}</span>`
                : ''}
            </div>
            <button
              onclick="ecSetReminder('${e.ticker}','${safeName}','${e.date}')"
              style="flex-shrink:0;padding:5px 12px;font-size:12px;cursor:pointer;border-radius:4px;white-space:nowrap;
                     ${isSaved
                       ? 'background:rgba(245,166,35,0.15);color:var(--gold);border:1px solid rgba(245,166,35,0.4);'
                       : 'background:transparent;color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.2);'}">
              ${isSaved ? '🔔 Saved' : '🔔 Remind Me'}
            </button>
          </div>`;
      });

      html += `</div>`;
    });

    resEl.innerHTML = html;
  }

  // ── Reminder helpers ────────────────────────────────────
  const REMINDER_KEY = 'earningsReminders_v1';

  function getSavedReminders() {
    try { return JSON.parse(localStorage.getItem(REMINDER_KEY) || '[]'); }
    catch (_) { return []; }
  }

  function saveReminders(list) {
    localStorage.setItem(REMINDER_KEY, JSON.stringify(list));
  }

  window.ecSetReminder = function (ticker, company, date) {
    if (!('Notification' in window)) {
      alert('Your browser does not support desktop notifications.');
      return;
    }

    Notification.requestPermission().then(permission => {
      if (permission !== 'granted') {
        alert('Notification permission denied. Allow notifications in browser settings and try again.');
        return;
      }

      const k           = `${ticker}|${date}`;
      const reminders   = getSavedReminders();
      const alreadySaved = reminders.some(r => r.key === k);

      if (alreadySaved) {
        saveReminders(reminders.filter(r => r.key !== k));
        showReminderMsg(`Reminder removed for ${company}.`, false);
      } else {
        reminders.push({ key: k, ticker, company, date, notified: false });
        saveReminders(reminders);

        if (isToday(date)) {
          fireNotification(company, ticker);
        } else {
          const du = daysUntil(date);
          showReminderMsg(
            `✅ Reminder set! You’ll see a notification when you open this page on ${fmtDateLabel(date)} (in ${du} day${du !== 1 ? 's' : ''}).`,
            true
          );
        }
      }

      // Refresh button states without re-fetching
      const resEl = document.getElementById('ec-results');
      if (resEl) {
        const updatedSaved = getSavedReminders();
        resEl.querySelectorAll('button[onclick^="ecSetReminder"]').forEach(btn => {
          const m = btn.getAttribute('onclick').match(/'([^']+)'\s*,\s*'[^']*'\s*,\s*'([^']+)'/);
          if (!m) return;
          const bk    = `${m[1]}|${m[2]}`;
          const on    = updatedSaved.some(r => r.key === bk);
          btn.textContent        = on ? '🔔 Saved' : '🔔 Remind Me';
          btn.style.background   = on ? 'rgba(245,166,35,0.15)' : 'transparent';
          btn.style.color        = on ? 'var(--gold)' : 'rgba(255,255,255,0.6)';
          btn.style.border       = on ? '1px solid rgba(245,166,35,0.4)' : '1px solid rgba(255,255,255,0.2)';
        });
      }
    });
  };

  function fireNotification(company, ticker) {
    new Notification(`📊 Earnings Today: ${company}`, {
      body: `${ticker} reports its quarterly results today!`,
      tag:  `earnings-${ticker}`,
    });
  }

  function showReminderMsg(msg, isSuccess) {
    const el = document.getElementById('ec-reminder-confirm');
    if (!el) return;
    el.textContent       = msg;
    el.style.display     = 'block';
    el.style.borderColor = isSuccess ? 'var(--gold)' : '#EF4444';
    el.style.background  = isSuccess ? 'rgba(245,166,35,0.10)' : 'rgba(239,68,68,0.08)';
    clearTimeout(el._ecTimer);
    el._ecTimer = setTimeout(() => { el.style.display = 'none'; }, 5000);
  }

  // Check for due reminders whenever the page is opened
  function checkPendingReminders() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const today     = new Date().toISOString().split('T')[0];
    const reminders = getSavedReminders();
    const updated   = reminders.map(r => {
      if (r.date === today && !r.notified) {
        fireNotification(r.company, r.ticker);
        return { ...r, notified: true };
      }
      return r;
    });
    saveReminders(updated);
  }
})();


// ══════════════════════════════════════════════════════════
// 52-WEEK HIGH/LOW SCREENER
// ══════════════════════════════════════════════════════════

(function init52Week() {
  const WEEK52_WORKER_URL = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
    ? `${window.location.protocol}//${window.location.host}/proxy`
    : 'https://box-theory-proxy.plain-frost-a262.workers.dev';

  function mountHTML() {
    const sec = document.getElementById('tool-52week');
    if (!sec || sec.innerHTML.trim()) return;

    sec.innerHTML = `
      <div class="news-section-header">
        <div class="news-section-accent"></div>
        <h2 class="news-section-title">52-Week High/Low Screener</h2>
      </div>
      <p class="news-section-sub">Enter an NSE ticker symbol to see where the current price sits within its 52-week range.</p>

      <div style="display:grid;gap:10px;max-width:400px;margin-bottom:16px;">
        <label>NSE Symbol
          <input type="text" id="w52-ticker" placeholder="e.g. RELIANCE"
                 style="display:block;margin-top:4px;text-transform:uppercase;"
                 onkeydown="if(event.key==='Enter') run52WeekCheck()">
        </label>
        <button id="w52-btn" class="tool-btn" onclick="run52WeekCheck()"><div class="tool-btn-glow"></div>Check</button>
      </div>

      <div id="w52-loading" style="display:none;font-size:14px;color:rgba(255,255,255,0.55);margin-bottom:16px;">Fetching data…</div>
      <div id="w52-error"   style="display:none;color:#EF4444;font-size:14px;margin-bottom:16px;"></div>
      <div id="w52-results" style="display:none;max-width:520px;"></div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountHTML);
  } else {
    mountHTML();
  }

  window.run52WeekCheck = async function () {
    const symbol = (document.getElementById('w52-ticker')?.value || '').trim().toUpperCase();
    const errEl  = document.getElementById('w52-error');
    const loadEl = document.getElementById('w52-loading');
    const resEl  = document.getElementById('w52-results');
    const btn    = document.getElementById('w52-btn');

    errEl.style.display  = 'none';
    resEl.style.display  = 'none';
    errEl.textContent    = '';

    if (!symbol) {
      errEl.textContent   = 'Please enter a ticker symbol.';
      errEl.style.display = 'block';
      return;
    }

    loadEl.style.display = 'block';
    btn.disabled = true;

    try {
      const res  = await fetch(`${WEEK52_WORKER_URL}/?symbol=${encodeURIComponent(symbol)}`);
      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.error || 'Could not fetch data.');

      const price = data.profile?.price          || 0;
      const high  = data.profile?.fiftyTwoWeekHigh || 0;
      const low   = data.profile?.fiftyTwoWeekLow  || 0;
      const name  = data.profile?.companyName      || symbol;

      if (!high || !low || !price) {
        throw new Error('52-week range data not available for this symbol.');
      }

      const range  = high - low;
      const pct    = range > 0 ? ((price - low) / range) * 100 : 50;
      const pctStr = pct.toFixed(1);

      let label, labelColor;
      if (pct >= 80)      { label = 'Near High';  labelColor = '#EF4444'; }
      else if (pct <= 20) { label = 'Near Low';   labelColor = '#4A90D9'; }
      else                { label = 'Mid Range';  labelColor = '#F5A623'; }

      const fmt = v => '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      resEl.innerHTML = `
        <p style="font-size:15px;font-weight:600;margin-bottom:16px;">${name} (${symbol})</p>

        <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:20px;">
          <tbody>
            <tr>
              <td style="padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);">Current Price</td>
              <td style="padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:right;font-weight:600;">${fmt(price)}</td>
            </tr>
            <tr>
              <td style="padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);">52-Week High</td>
              <td style="padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:right;">${fmt(high)}</td>
            </tr>
            <tr>
              <td style="padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);">52-Week Low</td>
              <td style="padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:right;">${fmt(low)}</td>
            </tr>
            <tr>
              <td style="padding:7px 10px;color:rgba(255,255,255,0.6);">Position in Range</td>
              <td style="padding:7px 10px;text-align:right;">${pctStr}% from low</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-bottom:8px;font-size:13px;color:rgba(255,255,255,0.5);display:flex;justify-content:space-between;">
          <span>${fmt(low)}</span>
          <span>${fmt(high)}</span>
        </div>
        <div style="position:relative;height:12px;background:rgba(255,255,255,0.1);border-radius:6px;overflow:hidden;margin-bottom:8px;">
          <div style="position:absolute;left:0;top:0;height:100%;width:${pctStr}%;background:${labelColor};border-radius:6px;transition:width 0.4s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:20px;">
          <span>52W Low</span>
          <span>52W High</span>
        </div>

        <div style="display:inline-block;padding:6px 16px;border-radius:4px;font-size:14px;font-weight:600;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);">
          <span style="color:${labelColor};">${label}</span>
        </div>

        <p style="font-size:12px;color:rgba(255,255,255,0.3);margin-top:20px;">
          ℹ️ Data from Yahoo Finance via Cloudflare Worker. Not investment advice.
        </p>
      `;

      resEl.style.display = 'block';
    } catch (err) {
      errEl.textContent   = err.message || 'Failed to fetch data. Please try again.';
      errEl.style.display = 'block';
    } finally {
      loadEl.style.display = 'none';
      btn.disabled = false;
    }
  };
})();
