// tools.js — logic for all financial tools on tools.html

// ══════════════════════════════════════════════════════════
// IRIDESCENT CARD EFFECTS
// ══════════════════════════════════════════════════════════

(function initIridescentCards() {
  const ACCENT = '#7B9EBF';
  const TILT = 10, STIFFNESS = 0.14, DAMPING = 0.78;

  function hexA(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${+a.toFixed(3)})`;
  }

  function initCard(card) {
    const specular   = card.querySelector('.irid-specular-layer');
    const sheen      = card.querySelector('.irid-sheen-layer');
    const borderEl   = card.querySelector('.irid-border-layer');
    const arrow      = card.querySelector('.irid-arrow');
    const iconBox    = card.querySelector('.irid-icon-box');

    let px = 0.5, py = 0.5, active = false;
    let curRX = 0, curRY = 0, velRX = 0, velRY = 0;
    let rafId = null;

    function paint() {
      const pxPct = px * 100, pyPct = py * 100;
      const a = active ? 1 : 0;

      card.style.transform = `rotateX(${curRX}deg) rotateY(${curRY}deg)`;

      card.style.boxShadow = active
        ? `0 0 0 1px ${hexA(ACCENT, 0.35)}, 0 16px 40px ${hexA(ACCENT, 0.18)}, 0 24px 64px ${hexA(ACCENT, 0.10)}, 0 2px 0 rgba(255,255,255,0.04) inset`
        : `0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.4), 0 2px 0 rgba(255,255,255,0.03) inset`;

      if (specular) {
        specular.style.background = `radial-gradient(50% 50% at ${pxPct}% ${pyPct}%, rgba(255,240,220,0.22) 0%, rgba(255,220,180,0.10) 25%, transparent 60%)`;
        specular.style.opacity = a;
      }

      if (sheen) {
        sheen.style.background = `radial-gradient(20% 20% at ${pxPct}% ${pyPct}%, hsla(28,70%,70%,0.18) 0%, hsla(48,80%,75%,0.14) 18%, hsla(180,50%,70%,0.10) 40%, hsla(280,50%,70%,0.08) 60%, transparent 80%)`;
        sheen.style.opacity = a * 0.85;
      }

      if (borderEl) {
        const angle = 135 + (px - 0.5) * 60;
        const p1 = 30 + (px - 0.5) * 20, p2 = 50 + (px - 0.5) * 20, p3 = 70 + (px - 0.5) * 20;
        borderEl.style.background = `linear-gradient(${angle}deg, ${hexA(ACCENT, 0)} 0%, ${hexA(ACCENT, 0.4 * a)} ${p1}%, ${hexA(ACCENT, 0.6 * a)} ${p2}%, ${hexA(ACCENT, 0.2 * a)} ${p3}%, ${hexA(ACCENT, 0)} 100%)`;
        borderEl.style.opacity = a;
      }

      if (arrow) arrow.style.transform = `translateX(${a * 4}px)`;
      if (iconBox) iconBox.style.boxShadow = active ? `0 0 ${20}px ${hexA(ACCENT, 0.3)}` : 'none';
    }

    function tick() {
      const tRX = active ? (py - 0.5) * -2 * TILT : 0;
      const tRY = active ? (px - 0.5) *  2 * TILT : 0;

      velRX = velRX * DAMPING + (tRX - curRX) * STIFFNESS;
      velRY = velRY * DAMPING + (tRY - curRY) * STIFFNESS;
      curRX += velRX; curRY += velRY;

      paint();

      const settling = Math.abs(tRX - curRX) > 0.005 || Math.abs(tRY - curRY) > 0.005
                    || Math.abs(velRX) > 0.005 || Math.abs(velRY) > 0.005;
      if (settling) {
        rafId = requestAnimationFrame(tick);
      } else {
        curRX = tRX; curRY = tRY; velRX = 0; velRY = 0;
        paint();
        rafId = null;
      }
    }

    card.addEventListener('mousemove', function(e) {
      const r = card.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width;
      py = (e.clientY - r.top)  / r.height;
      active = true;
      if (!rafId) rafId = requestAnimationFrame(tick);
    });

    card.addEventListener('mouseleave', function() {
      px = 0.5; py = 0.5; active = false;
      if (!rafId) rafId = requestAnimationFrame(tick);
    });
  }

  function init() {
    document.querySelectorAll('.iridescent-card').forEach(initCard);

    // BOX Theory card navigates directly to the analyzer — skip the tool panel
    var boxCard = document.querySelector('.iridescent-card[data-tool="box-scorer"]');
    if (boxCard) {
      boxCard.addEventListener('click', function(e) {
        e.stopImmediatePropagation();
        if (typeof heroNavTo === 'function') heroNavTo('analyzerSection', 'input');
      }, true); // capture phase — fires before the ui.js bubble handler
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

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
        backgroundColor: ['#7B9EBF', '#9BB8CF'],
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
// SIP CALCULATOR — PREMIUM UI LAYER
// Wraps existing calculateSIP() with loading state + animation.
// Does NOT touch the calculation formula or Chart.js code.
// ══════════════════════════════════════════════════════════

(function initSIPPremiumUI() {
  function init() {
    document.querySelectorAll('[data-sip-field]').forEach(function(field) {
      var input = field.querySelector('input');
      if (!input) return;
      function sync() {
        field.classList.toggle('sip-filled', input.value.trim().length > 0);
      }
      input.addEventListener('focus', function() { field.classList.add('sip-focused'); });
      input.addEventListener('blur',  function() { field.classList.remove('sip-focused'); });
      input.addEventListener('input', sync);
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') window.sipCalcRun();
      });
      sync();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

window.sipCalcRun = function sipCalcRun() {
  var btn = document.getElementById('sip-btn-calc');
  if (btn && btn.classList.contains('sip-loading')) return;

  if (btn) { btn.classList.add('sip-loading'); btn.disabled = true; }

  setTimeout(function() {
    calculateSIP();

    var rate  = parseFloat(document.getElementById('sipRate').value)  || 0;
    var years = parseFloat(document.getElementById('sipYears').value) || 0;
    var cagr  = document.getElementById('sip-badge-cagr');
    if (cagr && rate > 0) cagr.textContent = 'CAGR · ' + rate.toFixed(2) + '%';
    var yrDisp = document.getElementById('sip-years-disp');
    if (yrDisp && years > 0) yrDisp.textContent = years + ' yr' + (years !== 1 ? 's' : '');

    var resultBox = document.getElementById('sip-results');
    if (resultBox) {
      resultBox.classList.remove('sip-show');
      void resultBox.offsetWidth;
      resultBox.classList.add('sip-show');
    }

    if (btn) { btn.classList.remove('sip-loading'); btn.disabled = false; }
  }, 650);
};

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
      <div class="aa-wrapper">

        <div class="aa-panel">
          <div class="aa-panel-header">
            <div>
              <div class="aa-step-label"><span class="aa-dot"></span>STEP 01 · INPUTS</div>
              <h2 class="aa-heading">Asset Allocation</h2>
              <p class="aa-subtext">Enter your current investments to visualize your portfolio distribution.</p>
            </div>
            <div class="aa-badges">
              <span class="aa-badge">V2.4</span>
              <span class="aa-badge">INR</span>
            </div>
          </div>
          <div class="aa-inputs">
            <div class="aa-field">
              <label class="aa-field-label">EQUITY</label>
              <div class="aa-field-inner"><span class="aa-field-prefix">₹</span><input class="aa-input" type="number" id="allocEquity" placeholder="00000" min="0"></div>
            </div>
            <div class="aa-field">
              <label class="aa-field-label">DEBT / FIXED INCOME</label>
              <div class="aa-field-inner"><span class="aa-field-prefix">₹</span><input class="aa-input" type="number" id="allocDebt" placeholder="00000" min="0"></div>
            </div>
            <div class="aa-field">
              <label class="aa-field-label">GOLD</label>
              <div class="aa-field-inner"><span class="aa-field-prefix">₹</span><input class="aa-input" type="number" id="allocGold" placeholder="00000" min="0"></div>
            </div>
            <div class="aa-field">
              <label class="aa-field-label">CASH / SAVINGS</label>
              <div class="aa-field-inner"><span class="aa-field-prefix">₹</span><input class="aa-input" type="number" id="allocCash" placeholder="00000" min="0"></div>
            </div>
            <div class="aa-field">
              <label class="aa-field-label">REAL ESTATE</label>
              <div class="aa-field-inner"><span class="aa-field-prefix">₹</span><input class="aa-input" type="number" id="allocRealEstate" placeholder="00000" min="0"></div>
            </div>
          </div>
          <button class="aa-calc-btn" onclick="calculateAllocation(); aaOnCalculate()">CALCULATE</button>
          <div class="aa-calc-hint">RESULTS UPDATE IN REAL-TIME</div>
        </div>

        <div class="aa-panel">
          <div class="aa-panel-header">
            <div>
              <div class="aa-step-label"><span class="aa-dot"></span>STEP 02 · PROJECTION</div>
              <h2 class="aa-heading">Your Portfolio Mix</h2>
              <p class="aa-subtext">Distribution based on current market valuations.</p>
            </div>
            <span class="aa-profile-badge" id="aa-profile-badge">—</span>
          </div>
          <div class="aa-waiting" id="aa-waiting">
            <div class="aa-waiting-icon">◎</div>
            <div class="aa-waiting-title">AWAITING INPUT</div>
            <div class="aa-waiting-sub">Enter asset values and press Calculate</div>
          </div>
          <div id="alloc-results" style="display:none;">
            <div class="aa-chart-area">
              <div class="aa-chart-wrap">
                <canvas id="allocChart"></canvas>
                <div class="aa-chart-center">
                  <span class="aa-center-label">TOTAL CORPUS</span>
                  <span class="aa-center-value" id="aa-total-display">—</span>
                </div>
              </div>
            </div>
            <div class="aa-legend-grid" id="aa-legend-grid"></div>
            <div class="aa-info-note" id="alloc-note"></div>
          </div>
          <table style="display:none">
            <tbody id="alloc-table-body"></tbody>
            <tfoot><tr><th></th><th id="alloc-total-amount"></th><th></th></tr></tfoot>
          </table>
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
    { name: 'Gold', amount: gold, color: '#7B9EBF' },
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


function aaOnCalculate() {
  const equity     = parseFloat(document.getElementById('allocEquity').value)     || 0;
  const debt       = parseFloat(document.getElementById('allocDebt').value)       || 0;
  const gold       = parseFloat(document.getElementById('allocGold').value)       || 0;
  const cash       = parseFloat(document.getElementById('allocCash').value)       || 0;
  const realEstate = parseFloat(document.getElementById('allocRealEstate').value) || 0;
  const total = equity + debt + gold + cash + realEstate;
  if (total <= 0) return;

  const waiting = document.getElementById('aa-waiting');
  if (waiting) waiting.style.display = 'none';

  const totalEl = document.getElementById('aa-total-display');
  if (totalEl) totalEl.textContent = '₹' + aaFmtLakh(total);

  const equityPct = (equity / total) * 100;
  const safePct   = ((debt + cash) / total) * 100;
  let profile = 'BALANCED';
  if (equityPct >= 60) profile = 'EQUITY HEAVY';
  else if (safePct >= 60) profile = 'DEBT HEAVY';
  const badge = document.getElementById('aa-profile-badge');
  if (badge) badge.textContent = profile;

  // colors must match those in calculateAllocation()
  const assetDefs = [
    { val: equity,     name: 'EQUITY',      color: '#4A90D9' },
    { val: debt,       name: 'DEBT',        color: '#9B59B6' },
    { val: gold,       name: 'GOLD',        color: '#7B9EBF' },
    { val: cash,       name: 'CASH',        color: '#2ECC71' },
    { val: realEstate, name: 'REAL ESTATE', color: '#E74C3C' },
  ].filter(a => a.val > 0);

  const grid = document.getElementById('aa-legend-grid');
  if (grid) {
    grid.innerHTML = assetDefs.map(a => {
      const pct = ((a.val / total) * 100).toFixed(1);
      return `<div class="aa-legend-tile">
        <div class="aa-legend-name"><span class="aa-legend-dot" style="background:${a.color}"></span>${a.name}</div>
        <div class="aa-legend-pct">${pct}%</div>
        <div class="aa-legend-amount">&#8377;${aaFmtLakh(a.val)}</div>
      </div>`;
    }).join('');
  }

  if (allocChartInstance) {
    allocChartInstance.options.plugins.legend.display = false;
    allocChartInstance.update('none');
  }
}

function aaFmtLakh(n) {
  if (n >= 10000000) return (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000)   return (n / 100000).toFixed(1) + 'L';
  if (n >= 1000)     return (n / 1000).toFixed(1) + 'K';
  return Math.round(n).toLocaleString('en-IN');
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
    row.style.background = isFinal ? 'rgba(123,158,191,0.12)' : 'transparent';

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

// ── Goal Calculator UI helpers ─────────────────────────────

function gcSetYears(y) {
  const input = document.getElementById('goalYears');
  if (input) input.value = y;
  document.querySelectorAll('.gc-yr-btn').forEach(function(btn) {
    btn.classList.toggle('gc-yr-active', parseInt(btn.textContent) === y);
  });
}

function gcOnCalculate() {
  // Guard: only proceed if calculateGoal() succeeded (results are visible)
  var results = document.getElementById('goal-results');
  if (!results || results.style.display === 'none') return;

  // Hide waiting state
  var waiting = document.getElementById('gc-waiting');
  if (waiting) waiting.style.display = 'none';

  // Update CAGR badge
  var rate = parseFloat(document.getElementById('goalRate').value);
  var badge = document.getElementById('goal-cagr-badge');
  if (badge && !isNaN(rate)) badge.textContent = 'CAGR · ' + rate.toFixed(2) + '%';

  // Format corpus in right-panel subtext
  var corpus = parseFloat(document.getElementById('goalCorpus').value);
  var targetText = document.getElementById('goal-target-display-text');
  if (targetText && !isNaN(corpus)) {
    var display;
    if      (corpus >= 1e7) display = '₹' + (corpus / 1e7).toFixed(2) + ' Crore';
    else if (corpus >= 1e5) display = '₹' + (corpus / 1e5).toFixed(2) + ' Lakh';
    else                    display = '₹' + corpus.toLocaleString('en-IN');
    targetText.textContent = 'Based on your target of ' + display + '.';
  }

  // Compute Target Year
  var years = parseFloat(document.getElementById('goalYears').value);
  var targetYearEl = document.getElementById('goal-target-year');
  if (targetYearEl && !isNaN(years)) {
    targetYearEl.textContent = (new Date().getFullYear() + Math.round(years)).toString();
  }

  // Sync active state on quick-year buttons
  document.querySelectorAll('.gc-yr-btn').forEach(function(btn) {
    btn.classList.toggle('gc-yr-active', parseFloat(btn.textContent) === years);
  });
}

// Enter key triggers calculate when focused on a Goal Calculator input
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  var id = document.activeElement && document.activeElement.id;
  if (id === 'goalCorpus' || id === 'goalRate' || id === 'goalYears') {
    calculateGoal();
    gcOnCalculate();
  }
});

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

  // ── Market status (NSE hours: Mon–Fri 09:15–15:30 IST) ──
  function getPEMarketStatus() {
    const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const day  = ist.getDay();
    const mins = ist.getHours() * 60 + ist.getMinutes();
    if (day === 0 || day === 6) return 'MARKET: CLOSED';
    if (mins >= 555 && mins <= 930) return 'MARKET: OPEN';
    return 'MARKET: CLOSED';
  }

  // ── Inject HTML ──────────────────────────────────────────
  function mountPEHTML() {
    const sec = document.getElementById('tool-pe-comparison');
    if (!sec || sec.innerHTML.trim()) return;

    sec.innerHTML = `
      <div class="pe-wrapper">

        <!-- LEFT: Inputs -->
        <div class="pe-panel">
          <div class="pe-step-label"><span class="pe-dot"></span>STEP 01 · INPUTS</div>
          <h2 class="pe-heading">Comparative<br>Analysis</h2>
          <p class="pe-subtext">Enter NSE symbols to contrast valuation metrics between industry leaders.</p>

          <div class="pe-inputs">
            <div class="pe-input-group">
              <label class="pe-input-label" for="pe-ticker-1">TICKER 1 (NSE SYMBOL)</label>
              <div class="pe-input-field">
                <span class="material-symbols-outlined pe-search-icon">search</span>
                <input type="text" id="pe-ticker-1" class="pe-input" placeholder="e.g. RELIANCE"
                       autocomplete="off" spellcheck="false" />
              </div>
            </div>
            <div class="pe-input-group">
              <label class="pe-input-label" for="pe-ticker-2">TICKER 2 (NSE SYMBOL)</label>
              <div class="pe-input-field">
                <span class="material-symbols-outlined pe-search-icon">search</span>
                <input type="text" id="pe-ticker-2" class="pe-input" placeholder="e.g. HDFCBANK"
                       autocomplete="off" spellcheck="false" />
              </div>
            </div>
          </div>

          <button id="pe-compare-btn" class="pe-calc-btn" onclick="runPEComparison()">
            COMPARE ASSETS
          </button>
        </div>

        <!-- RIGHT: Results -->
        <div class="pe-right">
          <div class="pe-right-header">
            <div>
              <div class="pe-step-label"><span class="pe-dot"></span>STEP 02 · PROJECTION</div>
              <h2 class="pe-heading">Relative Valuation<br>Matrix</h2>
            </div>
            <div class="pe-market-badge" id="pe-market-badge">MARKET: —</div>
          </div>

          <div id="pe-waiting" class="pe-waiting">
            <div class="pe-waiting-icon">◎</div>
            <div class="pe-waiting-title">AWAITING INPUT</div>
            <div class="pe-waiting-sub">Enter two NSE tickers and click Compare Assets</div>
          </div>

          <div id="pe-error" class="pe-error" style="display:none;"></div>
          <div id="pe-loading" class="pe-loading" style="display:none;">
            <span class="material-symbols-outlined pe-spin">progress_activity</span>
            Analyzing data…
          </div>

          <div id="pe-results" style="display:none;">

            <!-- Company P/E cards -->
            <div class="pe-cards-grid">
              <div class="pe-card">
                <span class="pe-card-name" id="pe-card-name-1">—</span>
                <div class="pe-card-pe-row">
                  <span class="pe-card-pe-number" id="pe-card-pe-1">—</span>
                  <span class="pe-card-pe-label">P/E</span>
                </div>
                <div class="pe-card-movement" id="pe-card-mv-1">
                  <span class="material-symbols-outlined pe-trend-icon pe-trend-neutral" id="pe-mv-icon-1">trending_flat</span>
                  <span id="pe-card-mv-text-1">—</span>
                </div>
              </div>
              <div class="pe-card">
                <span class="pe-card-name" id="pe-card-name-2">—</span>
                <div class="pe-card-pe-row">
                  <span class="pe-card-pe-number pe-card-pe-alt" id="pe-card-pe-2">—</span>
                  <span class="pe-card-pe-label">P/E</span>
                </div>
                <div class="pe-card-movement" id="pe-card-mv-2">
                  <span class="material-symbols-outlined pe-trend-icon pe-trend-neutral" id="pe-mv-icon-2">trending_flat</span>
                  <span id="pe-card-mv-text-2">—</span>
                </div>
              </div>
            </div>

            <!-- Bar chart -->
            <div class="pe-chart-panel">
              <div class="pe-chart-header">
                <div class="pe-chart-title-row">
                  <span class="material-symbols-outlined pe-chart-icon">analytics</span>
                  <span class="pe-chart-title">VALUATION COMPARISON</span>
                </div>
                <div class="pe-chart-legend">
                  <div class="pe-legend-item">
                    <span class="pe-legend-dot pe-legend-primary"></span>
                    <span id="pe-legend-1">ASSET A</span>
                  </div>
                  <div class="pe-legend-item">
                    <span class="pe-legend-dot pe-legend-secondary"></span>
                    <span id="pe-legend-2">ASSET B</span>
                  </div>
                </div>
              </div>
              <canvas id="peChart"></canvas>
            </div>

            <!-- Metrics table -->
            <div class="pe-metrics-wrap">
              <table class="pe-table">
                <thead>
                  <tr>
                    <th>METRIC</th>
                    <th id="pe-th-1">—</th>
                    <th id="pe-th-2">—</th>
                  </tr>
                </thead>
                <tbody id="pe-tbody"></tbody>
              </table>
            </div>

            <!-- Disclaimer -->
            <div class="pe-disclaimer">
              <span class="material-symbols-outlined pe-info-icon">info</span>
              <p>P/E ratios are based on the latest available trailing twelve months (TTM) earnings data. Lower P/E may indicate undervaluation — but always check other metrics.</p>
            </div>

          </div><!-- /pe-results -->
        </div><!-- /pe-right -->

      </div><!-- /pe-wrapper -->
    `;

    // Set market status immediately
    const badge = document.getElementById('pe-market-badge');
    if (badge) badge.textContent = getPEMarketStatus();

    // Enter key support
    ['pe-ticker-1', 'pe-ticker-2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') window.runPEComparison(); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountPEHTML);
  } else {
    mountPEHTML();
  }

  // ── Chart instance ───────────────────────────────────────
  let peChartInstance = null;

  // ── Exposed globally so onclick= works ──────────────────────
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
    const waiting = document.getElementById('pe-waiting');
    if (waiting) waiting.style.display = 'none';

    try {
      const [d1, d2] = await Promise.all([fetchPE(t1), fetchPE(t2)]);
      renderPEResults(t1, d1, t2, d2);
    } catch (err) {
      showPEError(err.message || 'Failed to fetch data. Please try again.');
    } finally {
      setPELoading(false);
    }
  };

  // ── Fetch + extract P/E data ─────────────────────────
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

    const pe = peNum(r.trailingPE) || peNum(r.forwardPE) || null;

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

  // ── Movement indicator ────────────────────────────────────
  function getPEMovement(thisPE, otherPE, sector) {
    if (thisPE === null) return { icon: 'trending_flat', cls: 'pe-trend-neutral', text: 'N/A' };
    const avg = getIndustryAvgPE(sector);
    const ref = avg !== null ? avg : otherPE;
    const label = avg !== null ? 'VS SECTOR' : 'VS PEER';
    if (ref === null) return { icon: 'trending_flat', cls: 'pe-trend-neutral', text: '—' };
    const pct  = ((thisPE - ref) / ref) * 100;
    const sign = pct >= 0 ? '+' : '';
    return {
      icon : pct > 0 ? 'trending_up' : pct < 0 ? 'trending_down' : 'trending_flat',
      cls  : pct > 0 ? 'pe-trend-up' : pct < 0 ? 'pe-trend-down' : 'pe-trend-neutral',
      text : `${sign}${pct.toFixed(1)}% ${label}`,
    };
  }

  // ── Render results ───────────────────────────────────────
  function renderPEResults(t1, d1, t2, d2) {
    const fmt   = v => (v !== null && v !== undefined) ? Number(v).toLocaleString('en-IN') : '—';
    const fmtPE = v => (v !== null) ? Number(v).toFixed(2) : '—';

    // Company cards
    document.getElementById('pe-card-name-1').textContent = d1.companyName || t1;
    document.getElementById('pe-card-name-2').textContent = d2.companyName || t2;
    document.getElementById('pe-card-pe-1').textContent   = fmtPE(d1.pe);
    document.getElementById('pe-card-pe-2').textContent   = fmtPE(d2.pe);

    // Legend labels
    const ticker1 = (d1.companyName || t1).toUpperCase().slice(0, 12);
    const ticker2 = (d2.companyName || t2).toUpperCase().slice(0, 12);
    document.getElementById('pe-legend-1').textContent = ticker1;
    document.getElementById('pe-legend-2').textContent = ticker2;

    // Movement indicators
    [
      { mv: getPEMovement(d1.pe, d2.pe, d1.sector), iconId: 'pe-mv-icon-1', textId: 'pe-card-mv-text-1' },
      { mv: getPEMovement(d2.pe, d1.pe, d2.sector), iconId: 'pe-mv-icon-2', textId: 'pe-card-mv-text-2' },
    ].forEach(({ mv, iconId, textId }) => {
      const icon = document.getElementById(iconId);
      const txt  = document.getElementById(textId);
      if (icon) {
        icon.textContent = mv.icon;
        icon.className = `material-symbols-outlined pe-trend-icon ${mv.cls}`;
      }
      if (txt) txt.textContent = mv.text;
    });

    // Table header + body
    document.getElementById('pe-th-1').textContent = d1.companyName || t1;
    document.getElementById('pe-th-2').textContent = d2.companyName || t2;

    const avgPE1 = getIndustryAvgPE(d1.sector);
    const avgPE2 = getIndustryAvgPE(d2.sector);

    const rows = [
      { label: 'CURRENT PRICE (₹)', v1: fmt(d1.price), v2: fmt(d2.price), cls: '' },
      { label: 'EPS (₹)',           v1: fmt(d1.eps),   v2: fmt(d2.eps),   cls: '' },
      { label: 'P/E RATIO',             v1: fmtPE(d1.pe) + (d1.pe !== null ? 'x' : ''), v2: fmtPE(d2.pe) + (d2.pe !== null ? 'x' : ''), cls: 'pe-row-pe' },
    ];
    if (avgPE1 !== null || avgPE2 !== null) {
      rows.push({
        label: 'SECTOR AVG P/E',
        v1: avgPE1 !== null ? avgPE1.toFixed(1) + 'x' : '—',
        v2: avgPE2 !== null ? avgPE2.toFixed(1) + 'x' : '—',
        cls: '',
      });
    }

    const tbody = document.getElementById('pe-tbody');
    tbody.innerHTML = rows.map(r =>
      `<tr class="${r.cls}"><td>${r.label}</td><td>${r.v1}</td><td>${r.v2}</td></tr>`
    ).join('');

    renderPEChart([t1, t2], [d1.pe, d2.pe]);

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
          backgroundColor: ['#C17F3A', '#474746'],
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.55,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1A1A1A',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            titleColor: '#717171',
            bodyColor: '#F0EDE6',
            titleFont: { family: 'JetBrains Mono', size: 10 },
            bodyFont:  { family: 'JetBrains Mono', size: 13 },
            callbacks: {
              label: c => c.raw ? ` P/E: ${c.raw.toFixed(2)}x` : ' P/E: N/A'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#717171',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: v => v + 'x'
            },
            grid: { color: 'rgba(255,255,255,0.05)' },
            border: { color: 'rgba(255,255,255,0.05)' }
          },
          x: {
            ticks: {
              color: '#F0EDE6',
              font: { family: 'JetBrains Mono', size: 11 },
            },
            grid: { display: false },
            border: { color: 'rgba(255,255,255,0.05)' }
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
    if (el)  el.style.display = on ? 'flex' : 'none';
    if (btn) {
      btn.disabled = on;
      btn.textContent = on ? 'ANALYZING…' : 'COMPARE ASSETS';
    }
  }
})();


// ══════════════════════════════════════════════════════════
// OPTIONS SIMULATOR
// ══════════════════════════════════════════════════════════

let optionsChartInstance = null;

function selectOptionType(type) {
  document.querySelector(`input[name="optionType"][value="${type}"]`).checked = true;
  const callBtn = document.getElementById('opt-call-btn');
  const putBtn  = document.getElementById('opt-put-btn');
  if (callBtn) callBtn.classList.toggle('opt-active', type === 'call');
  if (putBtn)  putBtn.classList.toggle('opt-active', type === 'put');
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
  const sign = pnl >= 0 ? '+' : '-';
  pnlEl.textContent = sign + '₹' + Math.abs(pnl).toFixed(2);
  pnlEl.style.color = pnl >= 0 ? '#4ade80' : '#ef4444';

  document.getElementById('option-breakeven').textContent = breakeven.toFixed(2);
  const waitEl = document.getElementById('opt-waiting');
  if (waitEl) waitEl.style.display = 'none';
  const resultsEl = document.getElementById('option-results');
  resultsEl.style.display = 'flex';

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
        label: 'Expiry Payoff',
        data: pnls,
        borderColor: '#C17F3A',
        backgroundColor: function(context) {
          const chart = context.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return 'rgba(193,127,58,0.08)';
          const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(193,127,58,0.22)');
          gradient.addColorStop(1, 'rgba(193,127,58,0.00)');
          return gradient;
        },
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1A1A1A',
          borderColor: 'rgba(193,127,58,0.35)',
          borderWidth: 1,
          titleColor: '#C17F3A',
          bodyColor: '#e5e2e1',
          titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
          bodyFont:  { family: "'JetBrains Mono', monospace", size: 12 },
          padding: 10,
          callbacks: {
            title: items => 'SPOT: ₹' + items[0].label,
            label: c => 'P/L: ₹' + c.raw.toFixed(2)
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'SPOT PRICE AT EXPIRY (₹)', color: '#717171',
            font: { family: "'JetBrains Mono', monospace", size: 10 } },
          ticks: { color: '#717171', font: { family: "'JetBrains Mono', monospace", size: 10 }, maxTicksLimit: 7 },
          grid: { color: 'rgba(255,255,255,0.05)' },
          border: { color: 'rgba(255,255,255,0.09)' }
        },
        y: {
          title: { display: true, text: 'PROFIT / LOSS (₹)', color: '#717171',
            font: { family: "'JetBrains Mono', monospace", size: 10 } },
          ticks: { color: '#717171', font: { family: "'JetBrains Mono', monospace", size: 10 }, maxTicksLimit: 6 },
          grid: {
            color: c => c.tick.value === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.05)'
          },
          border: { color: 'rgba(255,255,255,0.09)' }
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

    const color = overlapCount === 0 ? '#4CAF50' : overlapCount <= 2 ? '#7B9EBF' : '#EF4444';
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
    if (!sec) return;

    // HTML is now baked into index.html — only inject as a fallback if missing
    if (!sec.innerHTML.trim()) {
      sec.innerHTML = `
        <div class="news-section-header">
          <div class="news-section-accent"></div>
          <h2 class="news-section-title">Earnings Calendar</h2>
        </div>
        <p class="news-section-sub">Upcoming NSE quarterly result dates. Click <em>Add to Calendar</em> to download an .ics file for Google Calendar, Apple Calendar, or Outlook.</p>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:20px;">
          <span style="font-size:13px;color:rgba(255,255,255,0.5);">Show next:</span>
          <button class="ec-range-btn" data-days="14"  style="padding:6px 14px;font-size:13px;cursor:pointer;">14 days</button>
          <button class="ec-range-btn" data-days="30"  style="padding:6px 14px;font-size:13px;cursor:pointer;background:var(--gold);color:#0F0F0F;font-weight:600;">30 days</button>
          <button class="ec-range-btn" data-days="60"  style="padding:6px 14px;font-size:13px;cursor:pointer;">60 days</button>
          <button class="ec-range-btn" data-days="90"  style="padding:6px 14px;font-size:13px;cursor:pointer;">90 days</button>
          <button id="ec-load-btn" class="tool-btn" onclick="loadEarnings()" style="margin-left:auto;">
            <div class="tool-btn-glow"></div>Load Calendar
          </button>
        </div>
        <div id="ec-loading" style="display:none;font-size:14px;color:rgba(255,255,255,0.5);margin-bottom:16px;">Fetching upcoming results…</div>
        <div id="ec-error" style="display:none;color:#EF4444;font-size:14px;margin-bottom:16px;padding:10px;background:rgba(239,68,68,0.08);border-radius:4px;"></div>
        <div id="ec-reminder-confirm" style="display:none;padding:10px 14px;background:rgba(123,158,191,0.10);border-left:3px solid var(--gold);font-size:13px;margin-bottom:16px;border-radius:0 4px 4px 0;"></div>
        <div id="ec-results"></div>
        <p style="margin-top:24px;font-size:12px;color:rgba(255,255,255,0.3);">ℹ️ Data via Yahoo Finance. Dates are estimates — always verify with the exchange.</p>
      `;
    }

    // Always wire range-button handlers (guard prevents double-binding)
    if (!sec._ecSetup) {
      sec._ecSetup = true;
      sec.querySelectorAll('.ec-range-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          sec.querySelectorAll('.ec-range-btn').forEach(function(b) {
            b.style.background = '';
            b.style.color      = '';
            b.style.fontWeight = '';
          });
          btn.style.background  = 'var(--gold)';
          btn.style.color       = '#0F0F0F';
          btn.style.fontWeight  = '600';
          window._ecDays = parseInt(btn.dataset.days, 10);
        });
      });
      window._ecDays = 30;
      checkPendingReminders();
    }
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

  // ── Quarter / timing helpers ────────────────────────────

  // Derive Indian fiscal quarter from the result announcement date.
  // Indian FY: April-March. "FY26" ends March 2026.
  // Results typically: Jan-Mar -> Q3, Apr-Jun -> Q4, Jul-Sep -> Q1, Oct-Dec -> Q2
  function getQuarterLabel(isoDate) {
    var d  = new Date(isoDate + "T00:00:00");
    var m  = d.getMonth() + 1;
    var yr = d.getFullYear();
    var q, fy;
    if      (m >= 1 && m <= 3) { q = 3; fy = yr % 100; }
    else if (m >= 4 && m <= 6) { q = 4; fy = yr % 100; }
    else if (m >= 7 && m <= 9) { q = 1; fy = (yr + 1) % 100; }
    else                        { q = 2; fy = (yr + 1) % 100; }
    return "Q" + q + " FY" + (fy < 10 ? "0" + fy : fy);
  }

  // Return the quarter label one step before the given one.
  function getPrevQtrLabel(qtrLabel) {
    var parts = qtrLabel.match(/^Q(\d) FY(\d+)$/);
    if (!parts) return qtrLabel;
    var q  = parseInt(parts[1], 10);
    var fy = parseInt(parts[2], 10);
    if (q === 1) { q = 4; fy = fy - 1 < 0 ? 99 : fy - 1; }
    else q -= 1;
    return "Q" + q + " FY" + (fy < 10 ? "0" + fy : fy);
  }

  // Map Yahoo Finance startdatetimetype to a human-readable timing badge.
  function getTimingBadge(code) {
    if (code === "BMO") return { label: "Pre-Market",    color: "#7B9EBF" };
    if (code === "AMC") return { label: "Post-Market",   color: "#C9A96E" };
    if (code === "DMT") return { label: "During Market", color: "#6EC97B" };
    return                     { label: "Time TBA",      color: "rgba(255,255,255,0.3)" };
  }

  // ── Render calendar list ────────────────────────────────
  function renderCalendar(earnings, days) {
    var resEl = document.getElementById("ec-results");

    if (!earnings.length) {
      resEl.innerHTML = "<p style=\"color:rgba(255,255,255,0.45);font-size:14px;padding:16px 0;\">No upcoming earnings found for the next " + days + " days in this dataset.</p>";
      return;
    }

    // Group by date
    var byDate = {};
    earnings.forEach(function(e) {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });

    var added = getCalendarAdded();
    var html = "";

    Object.keys(byDate).sort().forEach(function(date) {
      var items  = byDate[date];
      var today  = isToday(date);
      var du     = daysUntil(date);
      var badge  = today
        ? "<span style=\"margin-left:8px;padding:2px 8px;font-size:11px;font-weight:700;background:#EF4444;color:#fff;border-radius:10px;\">TODAY</span>"
        : du === 1
          ? "<span style=\"margin-left:8px;padding:2px 8px;font-size:11px;font-weight:600;background:rgba(123,158,191,0.18);color:var(--gold);border-radius:10px;\">TOMORROW</span>"
          : "";

      html += "<div style=\"margin-bottom:28px;\">" +
        "<div style=\"display:flex;align-items:center;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.12);\">" +
          "<span style=\"font-size:14px;font-weight:700;color:var(--gold);\">" + fmtDateLabel(date) + "</span>" +
          badge +
          "<span style=\"margin-left:auto;font-size:12px;color:rgba(255,255,255,0.3);\">" +
            (today ? "results expected today" : "in " + du + " day" + (du !== 1 ? "s" : "")) +
          "</span>" +
        "</div>";

      items.forEach(function(e) {
        var k        = e.ticker + "|" + e.date;
        var isAdded  = added.indexOf(k) !== -1;
        var safeName = (e.company || e.ticker).replace(/['"]/g, "");
        var qtrLabel = getQuarterLabel(e.date);
        var prevQtr  = getPrevQtrLabel(qtrLabel);
        var timing   = getTimingBadge(e.timing);
        var epsId    = "ec-eps-" + e.ticker.replace(/[^A-Za-z0-9]/g, "_") + "_" + e.date.replace(/-/g, "");
        var tickerChip = (e.ticker && e.ticker !== (e.company || ""))
          ? "<span style=\"font-size:12px;color:rgba(255,255,255,0.38);padding:1px 6px;background:rgba(255,255,255,0.06);border-radius:3px;\">" + esc(e.ticker) + "</span>"
          : "";
        var btnStyle = isAdded
          ? "background:rgba(110,201,123,0.14);color:#6EC97B;border:1px solid rgba(110,201,123,0.35);"
          : "background:transparent;color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.2);";

        html +=
          "<div style=\"padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);\">" +
            "<div style=\"display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px;\">" +
              "<span style=\"font-weight:600;font-size:14px;\">" + esc(e.company || e.ticker) + "</span>" +
              tickerChip +
              "<span style=\"font-size:11px;color:rgba(255,255,255,0.5);padding:1px 7px;background:rgba(255,255,255,0.07);border-radius:3px;letter-spacing:0.02em;\">" + qtrLabel + "</span>" +
              "<span style=\"font-size:11px;font-weight:500;color:" + timing.color + ";padding:1px 7px;background:rgba(255,255,255,0.05);border-radius:3px;\">" + timing.label + "</span>" +
            "</div>" +
            "<div style=\"display:flex;align-items:center;gap:10px;\">" +
              "<span id=\"" + epsId + "\" style=\"font-size:12px;color:rgba(255,255,255,0.3);font-style:italic;\">" + prevQtr + " — loading…</span>" +
              "<button data-ec-ticker=\"" + esc(e.ticker) + "\" data-ec-name=\"" + esc(safeName) + "\" data-ec-date=\"" + esc(e.date) + "\"" +
              " onclick=\"ecAddToCalendar(this.dataset.ecTicker,this.dataset.ecName,this.dataset.ecDate)\"" +
                " style=\"margin-left:auto;flex-shrink:0;padding:5px 12px;font-size:12px;cursor:pointer;border-radius:4px;white-space:nowrap;" + btnStyle + "\">" +
                (isAdded ? "✓ Added" : "📅 Add to Calendar") +
              "</button>" +
            "</div>" +
          "</div>";
      });

      html += "</div>";
    });

    resEl.innerHTML = html;

    // Lazy-load last-quarter EPS after DOM is painted
    enrichEarningsEPS(earnings);
  }

  // ── Per-symbol EPS enrichment (lazy, batched) ───────────
  async function enrichEarningsEPS(entries) {
    // Deduplicate tickers so we only fetch each once
    var seen = {};
    var unique = entries.filter(function(e) {
      if (seen[e.ticker]) return false;
      seen[e.ticker] = true;
      return true;
    });

    var BATCH = 3;
    for (var i = 0; i < unique.length; i += BATCH) {
      var batch = unique.slice(i, i + BATCH);
      await Promise.all(batch.map(async function(e) {
        var allForTicker = entries.filter(function(x) { return x.ticker === e.ticker; });
        var prevQtr = getPrevQtrLabel(getQuarterLabel(e.date));
        var epsText = prevQtr + " data unavailable";

        try {
          var res  = await fetch(WORKER_URL + "/?symbol=" + encodeURIComponent(e.ticker));
          var data = await res.json();
          if (!data.error && data.lastQtrEPS != null) {
            var eps    = data.lastQtrEPS;
            var sign   = eps < 0 ? "-" : "";
            var fmtEPS = sign + "₹" + Math.abs(eps).toLocaleString("en-IN", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 2
            });
            epsText = prevQtr + " — " + fmtEPS + " EPS";
          }
        } catch (_) { /* leave as unavailable */ }

        allForTicker.forEach(function(entry) {
          var epsId = "ec-eps-" + entry.ticker.replace(/[^A-Za-z0-9]/g, "_") + "_" + entry.date.replace(/-/g, "");
          var el = document.getElementById(epsId);
          if (el) {
            el.textContent     = epsText;
            el.style.fontStyle = "normal";
          }
        });
      }));
    }
  }

  // ── Calendar (.ics) helpers ──────────────────────────────
  var CALENDAR_KEY = 'calendarAdded_v1';

  function getCalendarAdded() {
    try { return JSON.parse(localStorage.getItem(CALENDAR_KEY) || '[]'); }
    catch (_) { return []; }
  }

  function saveCalendarAdded(list) {
    localStorage.setItem(CALENDAR_KEY, JSON.stringify(list));
  }

  function escICS(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function generateICS(ticker, company, date, qtrLabel) {
    var d      = date.replace(/-/g, '');
    var qMatch = qtrLabel.match(/^(Q\d)/);
    var qShort = qMatch ? qMatch[1] : qtrLabel.split(' ')[0];
    var title  = escICS(company + ' ' + qShort + ' Results — NSE');
    var desc   = escICS(company) + ' (' + escICS(ticker) + ') is announcing ' + escICS(qtrLabel) + ' results today.\\nCheck BroMoney.in for BOX Theory analysis.';
    var uid    = ticker.replace(/[^A-Za-z0-9]/g, '') + '-' + d + '@bromoney.in';
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//BroMoney//BOX Theory Analyzer//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTART;TZID=Asia/Kolkata:' + d + 'T090000',
      'DTEND;TZID=Asia/Kolkata:' + d + 'T100000',
      'SUMMARY:' + title,
      'DESCRIPTION:' + desc,
      'ORGANIZER;CN=BroMoney — BOX Theory:mailto:tech@nishailfintech.com',
      'ATTENDEE;RSVP=FALSE;PARTSTAT=ACCEPTED;CUTYPE=INDIVIDUAL:mailto:tech@nishailfintech.com',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  }

  window.ecAddToCalendar = function(ticker, company, date) {
    var qtrLabel = getQuarterLabel(date);
    var ics  = generateICS(ticker, company, date, qtrLabel);
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = ticker.replace(/[^A-Za-z0-9]/g, '') + '_' + date + '_earnings.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 100);

    var k    = ticker + '|' + date;
    var list = getCalendarAdded();
    if (list.indexOf(k) === -1) { list.push(k); saveCalendarAdded(list); }

    var resEl = document.getElementById('ec-results');
    if (resEl) {
      var updated = getCalendarAdded();
      resEl.querySelectorAll('button[data-ec-ticker]').forEach(function(btn) {
        var bk    = btn.dataset.ecTicker + '|' + btn.dataset.ecDate;
        var done  = updated.indexOf(bk) !== -1;
        btn.textContent      = done ? '✓ Added' : '📅 Add to Calendar';
        btn.style.background = done ? 'rgba(110,201,123,0.14)' : 'transparent';
        btn.style.color      = done ? '#6EC97B' : 'rgba(255,255,255,0.6)';
        btn.style.border     = done ? '1px solid rgba(110,201,123,0.35)' : '1px solid rgba(255,255,255,0.2)';
      });
    }

    showReminderMsg('✅ Calendar event downloaded! Open the .ics file to add it to your calendar app.', true);
  };

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
            `✅ Reminder set! You'll see a notification when you open this page on ${fmtDateLabel(date)} (in ${du} day${du !== 1 ? 's' : ''}).`,
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
          btn.style.background   = on ? 'rgba(123,158,191,0.14)' : 'transparent';
          btn.style.color        = on ? 'var(--gold)' : 'rgba(255,255,255,0.6)';
          btn.style.border       = on ? '1px solid rgba(123,158,191,0.35)' : '1px solid rgba(255,255,255,0.12)';
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
    el.style.background  = isSuccess ? 'rgba(123,158,191,0.10)' : 'rgba(239,68,68,0.08)';
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
      <div class="week52-wrapper">

        <!-- ── Left Panel: Inputs ── -->
        <div class="week52-panel">
          <div>
            <div class="gc-step-label"><span class="gc-dot"></span>STEP 01 · SCREENER INPUTS</div>
            <h2 class="week52-heading">Screener<br>Inputs</h2>
            <p class="week52-sub">Enter a ticker to analyze range performance across the 52-week corridor.</p>
          </div>

          <div class="week52-input-group">
            <div class="week52-input-wrap">
              <span class="week52-float-label">NSE TICKER</span>
              <div class="week52-input-row">
                <input type="text" id="w52-ticker" class="week52-ticker-input"
                       placeholder="RELIANCE"
                       onkeydown="if(event.key==='Enter') run52WeekCheck()">
                <span class="week52-equity-label">/ equity</span>
              </div>
            </div>
            <div class="week52-meta-row">
              <span class="week52-meta-label">v2.4 · INR</span>
              <span class="week52-meta-label">AUTODETECT REGION</span>
            </div>
          </div>

          <div id="w52-loading" class="week52-loading" style="display:none;">Fetching data…</div>
          <div id="w52-error"   class="week52-error"   style="display:none;"></div>

          <button id="w52-btn" class="week52-search-btn" onclick="run52WeekCheck()">
            SEARCH <span class="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>

        <!-- ── Right Panel: Analysis ── -->
        <div class="week52-panel week52-panel-right">
          <div class="week52-glow"></div>
          <div class="week52-panel-content">

            <div class="week52-result-header">
              <div class="gc-step-label"><span class="gc-dot"></span>STEP 02 · ANALYSIS</div>
              <div class="week52-cagr-badge" id="w52-range-badge">
                <span class="week52-cagr-label">RANGE</span>
                <span class="week52-cagr-value" id="w52-range-pct">—</span>
              </div>
            </div>

            <h2 class="week52-analysis-heading">52-Week Analysis</h2>
            <p class="week52-analysis-sub">Performance metrics relative to the historical annual corridor.</p>

            <div id="w52-waiting" class="week52-waiting">
              <p>Enter an NSE ticker and click SEARCH to view the analysis.</p>
            </div>

            <div id="w52-results" style="display:none;">
              <p class="week52-valuation-label">CURRENT VALUATION</p>
              <div class="week52-hero-price">
                <span class="week52-rupee">₹</span>
                <span class="week52-price" id="w52-price-val">—</span>
              </div>

              <div class="week52-range-section">
                <div class="week52-range-ends">
                  <div>
                    <p class="week52-range-label">52W LOW</p>
                    <p class="week52-range-val" id="w52-low-val">—</p>
                  </div>
                  <div class="week52-range-right">
                    <p class="week52-range-label">52W HIGH</p>
                    <p class="week52-range-val" id="w52-high-val">—</p>
                  </div>
                </div>

                <div class="week52-bar-track">
                  <div class="week52-bar-fill"   id="w52-bar-fill"></div>
                  <div class="week52-bar-marker" id="w52-bar-marker"></div>
                </div>

                <div class="week52-bar-footer">
                  <div class="week52-position-label">
                    <span class="material-symbols-outlined" id="w52-pos-icon">trending_flat</span>
                    <span class="week52-position-text" id="w52-label-text">—</span>
                  </div>
                  <span class="week52-pct-text" id="w52-pct-text">—</span>
                </div>
              </div>

              <div class="week52-disclaimer">
                <span class="material-symbols-outlined">info</span>
                <p>Data retrieved from Yahoo Finance via Cloudflare Worker. Historical performance does not guarantee future results. Not investment advice.</p>
              </div>
            </div>

          </div>
          <p class="week52-footer-strip">BroMoney.in — BOX Theory framework</p>
        </div>

      </div>
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
    const waitEl = document.getElementById('w52-waiting');
    const btn    = document.getElementById('w52-btn');

    errEl.style.display = 'none';
    errEl.textContent   = '';

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

      const price = data.profile?.price             || 0;
      const high  = data.profile?.fiftyTwoWeekHigh  || 0;
      const low   = data.profile?.fiftyTwoWeekLow   || 0;

      if (!high || !low || !price) {
        throw new Error('52-week range data not available for this symbol.');
      }

      // ── Fill calculation (unchanged logic) ──────────────────────────
      const range  = high - low;
      const pct    = range > 0 ? ((price - low) / range) * 100 : 50;
      const pctStr = pct.toFixed(1);

      let label, posIcon;
      if      (pct >= 80) { label = 'Near High'; posIcon = 'trending_up';   }
      else if (pct <= 20) { label = 'Near Low';  posIcon = 'trending_down'; }
      else                { label = 'Mid Range'; posIcon = 'trending_flat'; }

      const fmtNum = v => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // ── Populate hero price ──────────────────────────────────────────
      document.getElementById('w52-price-val').textContent  = fmtNum(price);

      // ── Populate low / high ──────────────────────────────────────────
      document.getElementById('w52-low-val').textContent    = '₹' + fmtNum(low);
      document.getElementById('w52-high-val').textContent   = '₹' + fmtNum(high);

      // ── Progress bar ─────────────────────────────────────────────────
      document.getElementById('w52-bar-fill').style.width   = pctStr + '%';
      document.getElementById('w52-bar-marker').style.left  = pctStr + '%';

      // ── Position label ───────────────────────────────────────────────
      document.getElementById('w52-pos-icon').textContent   = posIcon;
      document.getElementById('w52-label-text').textContent = label;
      document.getElementById('w52-pct-text').textContent   = pctStr + '% of range';

      // ── Range badge ──────────────────────────────────────────────────
      const badgeEl = document.getElementById('w52-range-badge');
      document.getElementById('w52-range-pct').textContent  = pctStr + '%';
      if (badgeEl) badgeEl.style.display = 'flex';

      // ── Show results, hide waiting ────────────────────────────────────
      if (waitEl) waitEl.style.display = 'none';
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
