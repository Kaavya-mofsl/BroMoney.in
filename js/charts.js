// ════════════════════════════════════════════════════════════════════════════
//  CHARTS — buildRadarChart + Compare Analysis Engine
// ════════════════════════════════════════════════════════════════════════════

// ── Radar chart (updated visual config) ────────────────
function buildRadarChart(scores) {
  if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }
  const ctx = document.getElementById('radarChart').getContext('2d');
  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Size','Usefulness','Strength','Versatility','Composition','Capacity'],
      datasets: [{
        label: companyInputData.companyName,
        data: scores,
        backgroundColor: 'rgba(123,158,191,0.12)',
        borderColor: '#7B9EBF',
        borderWidth: 2.5,
        pointBackgroundColor: '#7B9EBF',
        pointBorderColor: '#7B9EBF',
        pointBorderWidth: 1.5,
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 800 },
      scales: {
        r: {
          min: 0, max: 10,
          ticks: {
            stepSize: 2,
            color: 'rgba(255,255,255,0.5)',
            backdropColor: 'transparent',
            font: { size: 10 }
          },
          grid: { color: 'rgba(123,158,191,0.12)' },
          angleLines: { color: 'rgba(123,158,191,0.18)' },
          pointLabels: {
            color: '#9BB8CF',
            font: { size: 12, weight: '600', family: 'Plus Jakarta Sans' }
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1C1C1C',
          titleColor: '#F0EDE6',
          bodyColor: '#7B9EBF',
          callbacks: { label: c => ` ${c.label}: ${c.raw}/10` }
        }
      }
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  COMPARE ANALYSIS — pure JS, no API calls
// ════════════════════════════════════════════════════════════════════════════
let cmpRadarChart = null;
let cmpBarChart   = null;

// ── Trigger ──────────────────────────────────────────────
function runCompareAnalysis() {
  window.resultA = runScoringEngine(window.compareDataA);
  window.resultB = runScoringEngine(window.compareDataB);
  renderCompareResults();
  showView('compareResults');
}

function cmpAnalyzeAgain() {
  if (cmpRadarChart) { cmpRadarChart.destroy(); cmpRadarChart = null; }
  if (cmpBarChart)   { cmpBarChart.destroy();   cmpBarChart   = null; }
  showView('input');
}

// ── Grade badge ───────────────────────────────────────────
function cmpGradeBadge(grade) {
  const styles = {
    'Elite Box':   'background:linear-gradient(135deg,#F5A623,#FFD07A);color:#0D1142;border:none;box-shadow:0 0 16px rgba(245,166,35,0.35)',
    'Strong Box':  'background:#161616;color:#F0EDE6;border:2px solid #7B9EBF',
    'Average Box': 'background:rgba(245,166,35,0.15);color:#FFD07A;border:1px solid rgba(245,166,35,0.4)',
    'Weak Box':    'background:rgba(239,68,68,0.15);color:#FCA5A5;border:1px solid rgba(239,68,68,0.4)',
    'Poor Box':    'background:rgba(239,68,68,0.2);color:#FCA5A5;border:1px solid rgba(239,68,68,0.5)',
  };
  const s = styles[grade] || styles['Average Box'];
  return `<span style="display:inline-block;padding:6px 18px;border-radius:99px;font-family:'Playfair Display',serif;font-size:13px;font-weight:700;${s}">${grade}</span>`;
}

// ── Dimension "Why" text ──────────────────────────────────
function cmpDimWhy(dim, a, b, rA, rB, sA, sB) {
  const nameA = a.companyName || 'Company A';
  const nameB = b.companyName || 'Company B';
  const diff  = sA - sB;
  if (diff === 0) return 'Both companies are evenly matched on this dimension, scoring identically across all evaluated criteria.';
  const winner = diff > 0 ? nameA : nameB;
  const loser  = diff > 0 ? nameB : nameA;
  const wD     = diff > 0 ? a : b;
  const lD     = diff > 0 ? b : a;
  const gap    = Math.abs(diff);
  const gapNote = gap >= 3
    ? `The ${gap}-point gap reflects a material structural difference.`
    : `The margin is narrow; continued improvement by ${loser} could close this gap.`;

  switch (dim) {
    case 'size': {
      const mcW = Number(wD.marketCap)||0, mcL = Number(lD.marketCap)||0;
      const rvW = Number(wD.revenue)||0,   rvL = Number(lD.revenue)||0;
      const npW = Number(wD.netProfit)||0,  npL = Number(lD.netProfit)||0;
      return `${winner} commands a larger footprint — market cap ₹${_fmt(mcW)} cr vs ₹${_fmt(mcL)} cr, revenues ₹${_fmt(rvW)} cr vs ₹${_fmt(rvL)} cr. Net profit of ₹${_fmt(npW)} cr against ₹${_fmt(npL)} cr further cements the size edge. ${gapNote}`;
    }
    case 'usefulness': {
      const wI = wD.industry || 'its sector';
      const lI = lD.industry || 'its sector';
      return `${winner} operates in ${wI}, which ranks higher on the BOX Theory usefulness spectrum than ${loser}'s ${lI}. Essential and economically critical industries earn higher scores due to non-cyclical, recurring demand patterns. ${gapNote}`;
    }
    case 'strength': {
      const roW = Number(wD.roce)||0,        roL = Number(lD.roce)||0;
      const deW = Number(wD.debtToEquity)||0, deL = Number(lD.debtToEquity)||0;
      const ebW = Number(wD.ebitdaMargin)||0, ebL = Number(lD.ebitdaMargin)||0;
      return `${winner} shows stronger financial quality — ROCE ${roW}% vs ${roL}%, EBITDA margin ${ebW}% vs ${ebL}%, D/E ${deW} vs ${deL}. ${roW > roL ? 'Higher capital efficiency' : 'Better leverage control'} is the primary differentiator. ${gapNote}`;
    }
    case 'versatility': {
      const gW = Number(wD.geographies)||1, gL = Number(lD.geographies)||1;
      return `${winner} spans ${gW} ${gW===1?'country':'countries'} vs ${loser}'s ${gL}, and its business description signals stronger product and segment diversification. Broader geographic reach and multi-segment revenue reduce concentration risk significantly. ${gapNote}`;
    }
    case 'composition': {
      const hW = Number(wD.promoterHolding)||0, hL = Number(lD.promoterHolding)||0;
      const pW = Number(wD.promoterPledge)||0,  pL = Number(lD.promoterPledge)||0;
      return `${winner} exhibits cleaner governance — promoter holding ${hW}% vs ${hL}%, pledge ${pW}% vs ${pL}%. ${pW < pL ? 'Lower pledging eliminates forced-selling risk and builds institutional confidence.' : 'The higher holding differential indicates stronger founder conviction and alignment.'} ${gapNote}`;
    }
    case 'capacity': {
      const cgW = Number(wD.revenueGrowth)||0,       cgL = Number(lD.revenueGrowth)||0;
      const utW = Number(wD.capacityUtilisation)||50, utL = Number(lD.capacityUtilisation)||50;
      return `${winner} shows more growth bandwidth — revenue CAGR ${cgW}% vs ${cgL}%, capacity utilisation ${utW}% vs ${utL}%. ${cgW > cgL ? 'Superior top-line momentum' : 'Better operational headroom'} gives ${winner} a tangible advantage for the next growth cycle. ${gapNote}`;
    }
    default: return '';
  }
}

// ── Metric formatter ──────────────────────────────────────
function cmpFmt(val, type) {
  const n = Number(val) || 0;
  if (type === 'crore') return '₹' + _fmt(n);
  if (type === 'pct')   return n.toFixed(1) + '%';
  if (type === 'ratio') return n.toFixed(2) + 'x';
  return String(n);
}

// ── Metrics table HTML ────────────────────────────────────
function buildMetricsTableHTML(a, b) {
  const nameA = a.companyName || 'Company A';
  const nameB = b.companyName || 'Company B';
  const rows = [
    { label:'Market Cap',       vA:a.marketCap,       vB:b.marketCap,       type:'crore', lower:false },
    { label:'Revenue',          vA:a.revenue,          vB:b.revenue,          type:'crore', lower:false },
    { label:'Net Profit',       vA:a.netProfit,        vB:b.netProfit,        type:'crore', lower:false },
    { label:'ROCE',             vA:a.roce,             vB:b.roce,             type:'pct',   lower:false },
    { label:'ROE',              vA:a.roe,              vB:b.roe,              type:'pct',   lower:false },
    { label:'D/E Ratio',        vA:a.debtToEquity,     vB:b.debtToEquity,     type:'ratio', lower:true  },
    { label:'EBITDA Margin',    vA:a.ebitdaMargin,     vB:b.ebitdaMargin,     type:'pct',   lower:false },
    { label:'Promoter Holding', vA:a.promoterHolding,  vB:b.promoterHolding,  type:'pct',   lower:false },
    { label:'Promoter Pledge',  vA:a.promoterPledge,   vB:b.promoterPledge,   type:'pct',   lower:true  },
    { label:'Revenue Growth',   vA:a.revenueGrowth,    vB:b.revenueGrowth,    type:'pct',   lower:false },
  ];

  let html = `<thead><tr>
    <th style="padding:14px 16px;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;border-bottom:1px solid rgba(123,158,191,0.18);background:rgba(15,15,15,0.80);text-align:left;color:rgba(255,255,255,0.45);">Metric</th>
    <th style="padding:14px 16px;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;border-bottom:1px solid rgba(123,158,191,0.18);background:rgba(15,15,15,0.80);text-align:center;color:#7B9EBF;">${nameA}</th>
    <th style="padding:14px 16px;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;border-bottom:1px solid rgba(123,158,191,0.18);background:rgba(15,15,15,0.80);text-align:center;color:#8694DB;">${nameB}</th>
  </tr></thead><tbody>`;

  rows.forEach((r, i) => {
    const nA = Number(r.vA) || 0, nB = Number(r.vB) || 0;
    const aWins = r.lower ? nA < nB : nA > nB;
    const bWins = r.lower ? nB < nA : nB > nA;
    const rowBg = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';
    const border = 'border-bottom:1px solid rgba(123,158,191,0.08)';
    const hlA = aWins ? '#7B9EBF' : 'var(--text-primary)';
    const hlB = bWins ? '#7B9EBF' : 'var(--text-primary)';
    const bgA = aWins ? 'rgba(123,158,191,0.10)' : 'transparent';
    const bgB = bWins ? 'rgba(123,158,191,0.10)' : 'transparent';
    const winTag = `<span style="font-size:9px;margin-left:4px;color:var(--gold);">▲</span>`;
    html += `<tr style="background:${rowBg};">
      <td style="padding:12px 16px;font-family:'DM Sans',sans-serif;font-size:13px;color:rgba(255,255,255,0.55);${border}">${r.label}</td>
      <td style="padding:12px 16px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:${hlA};background:${bgA};${border};text-align:center;">${cmpFmt(nA, r.type)}${aWins ? winTag : ''}</td>
      <td style="padding:12px 16px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:${hlB};background:${bgB};${border};text-align:center;">${cmpFmt(nB, r.type)}${bWins ? winTag : ''}</td>
    </tr>`;
  });

  html += '</tbody>';
  return html;
}

// ── Overall Recommendation ────────────────────────────────
function buildRecommendationText(a, b, rA, rB) {
  const nameA = a.companyName || 'Company A';
  const nameB = b.companyName || 'Company B';
  const sA = rA.totalScore, sB = rB.totalScore;
  const gap = Math.abs(sA - sB);
  const winner = sA > sB ? nameA : sB > sA ? nameB : null;
  const loser  = sA > sB ? nameB : sB > sA ? nameA : null;
  const wScore = sA > sB ? sA : sB;
  const lScore = sA > sB ? sB : sA;

  const dims = ['size','usefulness','strength','versatility','composition','capacity'];
  const dimLabels = {size:'Size',usefulness:'Usefulness',strength:'Strength',versatility:'Versatility',composition:'Composition',capacity:'Capacity'};
  const topTwo = dims
    .map(d => ({ name: dimLabels[d], diff: Math.abs(rA.dimensions[d].score - rB.dimensions[d].score) }))
    .sort((x, y) => y.diff - x.diff)
    .slice(0, 2)
    .map(d => d.name);

  if (!winner) {
    return `Both ${nameA} and ${nameB} score ${sA}/60, making this a genuinely close contest. The decision hinges on investor preference — specifically in ${topTwo.join(' and ')}, where marginal differences reflect individual portfolio fit. Consider sector allocation, conviction, and time horizon before committing to either name.`;
  }
  if (gap > 10) {
    return `${winner} significantly outperforms ${loser} across the BOX Theory framework, with a ${gap}-point margin (${wScore}/60 vs ${lScore}/60). The most pronounced advantages lie in ${topTwo.join(' and ')}. For investors choosing between the two, ${winner} presents a materially superior risk-adjusted profile. ${loser} warrants reconsideration only after demonstrating consistent improvement in its weaker dimensions over 2–3 consecutive quarters.`;
  }
  return `${winner} holds a moderate advantage over ${loser} — ${wScore}/60 versus ${lScore}/60, a gap of ${gap} points. The edge is clearest in ${topTwo.join(' and ')}. Both companies are investable under the right conditions, but ${winner} is the higher-conviction pick under BOX Theory today. Monitor quarterly results closely for any narrowing of the gap, particularly in dimensions where ${loser} currently trails.`;
}

// ── Main render ───────────────────────────────────────────
function renderCompareResults() {
  const a = window.compareDataA, b = window.compareDataB;
  const rA = window.resultA,     rB = window.resultB;
  const dims = ['size','usefulness','strength','versatility','composition','capacity'];
  const dimLabels = {size:'Size',usefulness:'Usefulness',strength:'Strength',versatility:'Versatility',composition:'Composition',capacity:'Capacity'};
  const dimIcons  = {size:'straighten',usefulness:'lightbulb',strength:'fitness_center',versatility:'diversity_3',composition:'shield',capacity:'rocket_launch'};
  const nameA = a.companyName || 'Company A';
  const nameB = b.companyName || 'Company B';

  // ── Section 1: Champion Banner ──
  const gap = rA.totalScore - rB.totalScore;
  const bannerEl = document.getElementById('cmp-s1-banner');

  const scoreBlock = (label, name, score, grade, accentColor) => `
    <div style="text-align:center;">
      <div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${accentColor};margin-bottom:8px;">${label}</div>
      <div style="font-family:'Playfair Display',serif;font-size:20px;color:var(--text-primary);margin-bottom:10px;">${name}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:36px;font-weight:700;color:${accentColor};line-height:1;">${score}<span style="font-size:15px;color:rgba(255,255,255,0.4)">/60</span></div>
      <div style="margin-top:10px;">${cmpGradeBadge(grade)}</div>
    </div>`;

  const vsDiv = `<div style="display:flex;align-items:center;padding:0 16px;"><span style="font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:rgba(255,255,255,0.2);">vs</span></div>`;

  if (gap === 0) {
    bannerEl.innerHTML = `<div class="cmp-banner">
      <div style="font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:var(--gold);margin-bottom:20px;">⚖️ Evenly Matched</div>
      <div style="display:flex;justify-content:center;gap:0;flex-wrap:wrap;align-items:center;">
        ${scoreBlock('Company A', nameA, rA.totalScore, rA.grade, 'var(--gold)')}
        ${vsDiv}
        ${scoreBlock('Company B', nameB, rB.totalScore, rB.grade, '#8694DB')}
      </div>
    </div>`;
  } else {
    const champLabel = gap > 0 ? 'Company A' : 'Company B';
    const challLabel = gap > 0 ? 'Company B' : 'Company A';
    const champData  = gap > 0 ? {name:nameA,score:rA.totalScore,grade:rA.grade,color:'var(--gold)'} : {name:nameB,score:rB.totalScore,grade:rB.grade,color:'#8694DB'};
    const challData  = gap > 0 ? {name:nameB,score:rB.totalScore,grade:rB.grade,color:'#8694DB'}     : {name:nameA,score:rA.totalScore,grade:rA.grade,color:'var(--gold)'};
    bannerEl.innerHTML = `<div class="cmp-banner">
      <div style="margin-bottom:18px;"><span class="cmp-champion-badge">👑 BOX Champion</span></div>
      <div style="display:flex;justify-content:center;gap:0;flex-wrap:wrap;align-items:center;">
        ${scoreBlock(champLabel, champData.name, champData.score, champData.grade, champData.color)}
        ${vsDiv}
        <div style="opacity:0.7;">${scoreBlock(challLabel, challData.name, challData.score, challData.grade, challData.color)}</div>
      </div>
    </div>`;
  }

  // ── Section 2: Radar Chart ──
  if (cmpRadarChart) { cmpRadarChart.destroy(); cmpRadarChart = null; }
  document.getElementById('cmp-radar-legend').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="width:20px;height:3px;background:#7B9EBF;border-radius:2px;"></div>
      <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;color:rgba(255,255,255,0.6);">${nameA}</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="width:20px;height:3px;background:#8694DB;border-radius:2px;"></div>
      <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;color:rgba(255,255,255,0.6);">${nameB}</span>
    </div>`;

  const radarCtx = document.getElementById('cmp-radar-canvas').getContext('2d');
  cmpRadarChart = new Chart(radarCtx, {
    type: 'radar',
    data: {
      labels: ['Size','Usefulness','Strength','Versatility','Composition','Capacity'],
      datasets: [
        {
          label: nameA,
          data: dims.map(d => rA.dimensions[d].score),
          backgroundColor: 'rgba(123,158,191,0.20)',
          borderColor: '#7B9EBF',
          borderWidth: 2.5,
          pointBackgroundColor: '#7B9EBF',
          pointBorderColor: '#7B9EBF',
          pointRadius: 5,
          pointHoverRadius: 7,
        },
        {
          label: nameB,
          data: dims.map(d => rB.dimensions[d].score),
          backgroundColor: 'rgba(134,148,219,0.30)',
          borderColor: '#8694DB',
          borderWidth: 2.5,
          pointBackgroundColor: '#8694DB',
          pointBorderColor: '#8694DB',
          pointRadius: 5,
          pointHoverRadius: 7,
        }
      ]
    },
    options: {
      responsive: true,
      animation: { duration: 900 },
      scales: {
        r: {
          min: 0, max: 10,
          ticks: { stepSize: 2, color: 'rgba(255,255,255,0.45)', backdropColor: 'transparent', font: { size: 10 } },
          grid: { color: 'rgba(123,158,191,0.12)' },
          angleLines: { color: 'rgba(123,158,191,0.18)' },
          pointLabels: { color: '#9BB8CF', font: { size: 12, weight: '600', family: 'Plus Jakarta Sans' } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1C1C1C',
          titleColor: '#F0EDE6',
          bodyColor: '#7B9EBF',
          callbacks: { label: c => ` ${c.dataset.label}: ${c.raw}/10` }
        }
      }
    }
  });

  // ── Section 3: Dimension Cards ──
  const dimContainer = document.getElementById('cmp-dim-cards');
  dimContainer.innerHTML = '';
  dims.forEach(d => {
    const sA = rA.dimensions[d].score;
    const sB = rB.dimensions[d].score;
    const pA = (sA / 10) * 100;
    const pB = (sB / 10) * 100;
    const winner = sA > sB ? 'A' : sB > sA ? 'B' : 'tie';
    const why = cmpDimWhy(d, a, b, rA, rB, sA, sB);

    const winTagA = winner === 'A'
      ? `<span style="font-size:11px;font-weight:700;color:var(--gold);background:rgba(123,158,191,0.12);border:1px solid rgba(123,158,191,0.28);border-radius:99px;padding:2px 10px;white-space:nowrap;">▲ Winner</span>`
      : '';
    const winTagB = winner === 'B'
      ? `<span style="font-size:11px;font-weight:700;color:#8694DB;background:rgba(134,148,219,0.12);border:1px solid rgba(134,148,219,0.3);border-radius:99px;padding:2px 10px;white-space:nowrap;">▲ Winner</span>`
      : '';

    const card = document.createElement('div');
    card.className = 'cmp-dim-card';
    card.dataset.dimKey = d;
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
        <span class="material-symbols-outlined" style="font-size:22px;color:var(--gold);">${dimIcons[d]}</span>
        <h4 style="font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:var(--text-primary);margin:0;">${dimLabels[d]}</h4>
      </div>
      <div style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;">
          <span style="font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);">${nameA}</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:var(--gold);">${sA}/10</span>
            ${winTagA}
          </div>
        </div>
        <div class="cmp-bar-track"><div class="cmp-bar-fill cmp-bar-gold" style="width:0%;" data-target="${pA}"></div></div>
      </div>
      <div style="margin-bottom:18px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;">
          <span style="font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);">${nameB}</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:#8694DB;">${sB}/10</span>
            ${winTagB}
          </div>
        </div>
        <div class="cmp-bar-track"><div class="cmp-bar-fill cmp-bar-blue" style="width:0%;" data-target="${pB}"></div></div>
      </div>
      <p style="font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin:0;padding-top:14px;border-top:1px solid rgba(123,158,191,0.10);">${why}</p>`;
    dimContainer.appendChild(card);
  });

  // ── Section 4: Key Metrics Table ──
  document.getElementById('cmp-metrics-table').innerHTML = buildMetricsTableHTML(a, b);

  // ── Section 5: Bar Chart ──
  if (cmpBarChart) { cmpBarChart.destroy(); cmpBarChart = null; }
  const barCtx = document.getElementById('cmp-bar-canvas').getContext('2d');
  cmpBarChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: dims.map(d => dimLabels[d]),
      datasets: [
        {
          label: nameA,
          data: dims.map(d => rA.dimensions[d].score),
          backgroundColor: '#7B9EBF',
          borderRadius: 5,
          barPercentage: 0.38,
        },
        {
          label: nameB,
          data: dims.map(d => rB.dimensions[d].score),
          backgroundColor: '#8694DB',
          borderRadius: 5,
          barPercentage: 0.38,
        }
      ]
    },
    options: {
      responsive: true,
      animation: { duration: 900 },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: 'rgba(255,255,255,0.6)', font: { family: 'DM Sans', size: 12 } }
        },
        y: {
          min: 0, max: 10,
          grid: { display: false },
          ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 11 }, stepSize: 2 }
        }
      },
      plugins: {
        legend: {
          display: true,
          labels: { color: '#F0EDE6', font: { family: 'Plus Jakarta Sans', size: 12 }, boxWidth: 14, padding: 20 }
        },
        tooltip: {
          backgroundColor: '#1C1C1C',
          titleColor: '#F0EDE6',
          bodyColor: '#7B9EBF',
          callbacks: { label: c => ` ${c.dataset.label}: ${c.raw}/10` }
        }
      }
    }
  });

  // ── Section 6: Investment Verdict ──
  const recText = buildRecommendationText(a, b, rA, rB);
  document.getElementById('cmp-s6-verdict').innerHTML = `
    <div class="cmp-section-header">
      <div class="cmp-section-accent"></div>
      <h3 class="cmp-section-title">Investment Verdict</h3>
    </div>
    <div class="cmp-verdict-grid">
      <div class="cmp-card" style="padding:24px;text-align:center;">
        <div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--gold);margin-bottom:8px;">Company A</div>
        <div style="font-family:'Playfair Display',serif;font-size:17px;color:var(--text-primary);margin-bottom:10px;">${nameA}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:30px;font-weight:700;color:var(--gold);margin-bottom:12px;">${rA.totalScore}<span style="font-size:14px;color:rgba(255,255,255,0.4)">/60</span></div>
        ${cmpGradeBadge(rA.grade)}
        <p style="font-family:'DM Sans',sans-serif;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.65;margin-top:16px;text-align:left;">${rA.investmentSummary}</p>
      </div>
      <div class="cmp-card" style="padding:24px;text-align:center;">
        <div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8694DB;margin-bottom:8px;">Company B</div>
        <div style="font-family:'Playfair Display',serif;font-size:17px;color:var(--text-primary);margin-bottom:10px;">${nameB}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:30px;font-weight:700;color:#8694DB;margin-bottom:12px;">${rB.totalScore}<span style="font-size:14px;color:rgba(255,255,255,0.4)">/60</span></div>
        ${cmpGradeBadge(rB.grade)}
        <p style="font-family:'DM Sans',sans-serif;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.65;margin-top:16px;text-align:left;">${rB.investmentSummary}</p>
      </div>
    </div>
    <div class="cmp-card" style="padding:28px;">
      <div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--gold);margin-bottom:14px;">Overall Recommendation</div>
      <p style="font-family:'DM Sans',sans-serif;font-size:15px;color:var(--text-primary);line-height:1.8;margin:0;">${recText}</p>
    </div>`;

  // ── GSAP Animations ──
  setTimeout(() => {
    // Staggered section fade-in
    const sections = document.querySelectorAll('#compareResultsView .cmp-section');
    gsap.fromTo(sections,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out', stagger: 0.1 }
    );

    // Score bar animations
    document.querySelectorAll('.cmp-bar-fill').forEach(bar => {
      const target = parseFloat(bar.dataset.target) || 0;
      gsap.to(bar, { width: target + '%', duration: 0.9, ease: 'power2.out', delay: 0.4 });
    });

    ScrollTrigger.refresh();
  }, 80);
}
