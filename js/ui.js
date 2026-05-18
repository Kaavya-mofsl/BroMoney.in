// ════════════════════════════════════════════════════════════════════════════
//  UI — State, view switching, form handlers, grade helpers, renderResults,
//       GSAP animations, nav tab switching, initLearnView, showTool
// ════════════════════════════════════════════════════════════════════════════

// ── APP STATE ──────────────────────────────────────────────
let analysisResult = null;
let companyInputData = null;
let radarChartInstance = null;

// ── Hero helpers ───────────────────────────────────────
function heroScrollTop() {
  var hero = document.getElementById('heroSection');
  return (hero && hero.style.display !== 'none') ? hero.offsetTop + hero.offsetHeight : 0;
}

function hideHero() {
  var hero = document.getElementById('heroSection');
  var brand = document.getElementById('heroBranding');
  if (hero) hero.style.display = 'none';
  if (brand) brand.style.display = 'none';
  // Kill the hero-scroll nav trigger so it can't re-hide the nav
  if (typeof navHeroTrigger !== 'undefined' && navHeroTrigger) {
    navHeroTrigger.kill();
    navHeroTrigger = null;
  }
  gsap.killTweensOf('#mainNav');
  gsap.set('#mainNav', { y: 0, opacity: 1 });
}

function showHero() {
  var hero = document.getElementById('heroSection');
  var brand = document.getElementById('heroBranding');
  if (hero) hero.style.display = '';
  if (brand) brand.style.display = '';
  ['analyzerSection','toolsSection','learnSection','newsSection'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('.nav-tab').forEach(function(t) { t.classList.remove('active'); });
  gsap.killTweensOf('#mainNav');
  gsap.set('#mainNav', { y: -60, opacity: 0 });
  // Re-create the nav scroll trigger now that hero is visible again
  navHeroTrigger = ScrollTrigger.create({
    trigger: '#heroSection',
    start: 'bottom top',
    onEnter: function() {
      gsap.to('#mainNav', { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
    },
    onLeaveBack: function() {
      gsap.to('#mainNav', { y: -60, opacity: 0, duration: 0.35, ease: 'power2.in' });
    }
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function heroNavTo(sectionId, viewId) {
  var tab = document.querySelector('[data-section="' + sectionId + '"]');
  if (tab) tab.click();
  if (viewId) showView(viewId);
}

// ── View switcher ──────────────────────────────────────
function showView(v) {
  document.getElementById('inputView').classList.toggle('hidden', v !== 'input');
  document.getElementById('loadingView').classList.toggle('hidden', v !== 'loading');
  document.getElementById('resultsView').classList.toggle('hidden', v !== 'results');
  document.getElementById('compareResultsView').classList.toggle('hidden', v !== 'compareResults');
  const ph = document.getElementById('comparePlaceholder');
  if (ph) ph.classList.add('hidden');
  window.scrollTo({ top: heroScrollTop(), behavior: 'smooth' });
  if (v === 'results') initResultsAnimations();
}

// ── Collapsible optional sections ─────────────────────
function toggleOptional(side) {
  const panel   = document.getElementById('optional' + side);
  const chevron = document.getElementById('chevron'  + side);
  const open    = panel.style.display === 'none' || panel.style.display === '';
  panel.style.display   = open ? 'block' : 'none';
  chevron.style.transform = open ? 'rotate(90deg)' : 'rotate(0deg)';
}

// ── Compare handler ────────────────────────────────────
async function handleCompare() {
  hideFormError();

  const symbolA = (document.getElementById('symbolA').value || '').trim().toUpperCase();
  const symbolB = (document.getElementById('symbolB').value || '').trim().toUpperCase();

  if (!symbolA || !symbolB) {
    showFormError('Please enter both company symbols.');
    return;
  }

  showView('loading');

  try {
    const [rawA, rawB] = await Promise.all([
      fetchScreenerData(symbolA),
      fetchScreenerData(symbolB)
    ]);

    const manualA = {
      businessDescription:  document.getElementById('descA').value || '',
      geographies:          document.getElementById('geoA').value  || '',
      capacityUtilisation:  document.getElementById('capA').value  || ''
    };
    const manualB = {
      businessDescription:  document.getElementById('descB').value || '',
      geographies:          document.getElementById('geoB').value  || '',
      capacityUtilisation:  document.getElementById('capB').value  || ''
    };

    window.compareDataA = mapScreenerData(rawA, manualA);
    window.compareDataB = mapScreenerData(rawB, manualB);

    console.log('Company A mapped data:', window.compareDataA);
    console.log('Company B mapped data:', window.compareDataB);

    runCompareAnalysis();

  } catch (err) {
    showView('input');
    showFormError(err.message || 'Failed to fetch data. Please try again.');
  }
}

function showFormError(msg) {
  const wrap = document.getElementById('formError');
  wrap.querySelector('p').textContent = msg;
  wrap.classList.remove('hidden');
  wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function hideFormError() {
  document.getElementById('formError').classList.add('hidden');
}

// ── Render results ─────────────────────────────────────
function renderResults() {
  const a = analysisResult;
  const dims = ['size','usefulness','strength','versatility','composition','capacity'];

  // Company header
  document.getElementById('resultCompanyName').textContent = companyInputData.companyName;
  document.getElementById('resultIndustry').textContent =
    companyInputData.industry + ' · Rs.' + Number(companyInputData.stockPrice).toLocaleString('en-IN') + ' per share';

  // Mini scores
  const idMap = { size:'scoreSize', usefulness:'scoreUsefulness', strength:'scoreStrength',
                  versatility:'scoreVersatility', composition:'scoreComposition', capacity:'scoreCapacity' };
  dims.forEach(d => {
    document.getElementById(idMap[d]).textContent = a.dimensions[d].score + '/10';
  });

  // Score ring
  const circumference = 2 * Math.PI * 58; // 364.42
  document.getElementById('totalScoreDisplay').textContent = a.totalScore;
  setTimeout(() => {
    const arc = document.getElementById('scoreArc');
    arc.style.strokeDashoffset = circumference * (1 - a.totalScore / 60);
    arc.style.stroke = gradeColor(a.grade);
  }, 80);

  // Grade badge
  const badge = document.getElementById('gradeBadge');
  badge.textContent = gradeEmoji(a.grade) + ' ' + a.grade;
  badge.style.background = gradeColor(a.grade);
  badge.style.color = gradeTextColor(a.grade);

  // Radar chart
  buildRadarChart(dims.map(d => a.dimensions[d].score));

  // Dimension cards - using Stitch card style
  const dimLabels = {
    size:'Size', usefulness:'Usefulness', strength:'Strength',
    versatility:'Versatility', composition:'Composition', capacity:'Capacity'
  };
  const container = document.getElementById('dimCards');
  container.innerHTML = '';
  dims.forEach(d => {
    const dim = a.dimensions[d];
    const card = document.createElement('div');
    card.className = 'bg-surface-container-low border border-outline-variant rounded-lg p-md space-y-sm';
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <h4 class="font-label-lg text-primary">${dimLabels[d]}</h4>
        <span class="score-pill">${dim.score}/10</span>
      </div>
      <p class="font-body-md text-on-surface-variant" style="line-height:1.7;">${dim.reasoning}</p>
      ${dim.score < 6 && dim.improvementNote ? `
        <div class="improvement-note">
          <p class="font-label-lg text-on-error-container mb-xs">⚠ Improvement Note</p>
          <p class="font-body-md text-on-error-container" style="font-size:14px;line-height:1.6;">${dim.improvementNote}</p>
        </div>` : ''}
    `;
    container.appendChild(card);
  });

  // Summary & guidance
  document.getElementById('investmentSummary').textContent = a.investmentSummary;
  document.getElementById('investorGuidance').textContent = a.investorGuidance;
}

// ── Grade helpers ───────────────────────────────────────────
function gradeColor(g) {
  return { 'Elite Box':'#F5A623', 'Strong Box':'#F5A623',
           'Average Box':'#F5A623', 'Weak Box':'#EF4444', 'Poor Box':'#EF4444' }[g] || '#F5A623';
}
function gradeTextColor(g) {
  return { 'Weak Box':'#ffffff', 'Poor Box':'#ffffff' }[g] || '#0D1142';
}
function gradeEmoji(g) {
  return { 'Elite Box':'🟢', 'Strong Box':'🔵', 'Average Box':'🟡', 'Weak Box':'🟠', 'Poor Box':'🔴' }[g] || '';
}

// ── Analyze Another Company ────────────────────────────
document.getElementById('analyzeAnotherBtn').addEventListener('click', () => {
  analysisResult = null;
  companyInputData = null;
  hideFormError();
  if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }
  showView('input');
});

// ── PDF Generation ─────────────────────────────────────
document.getElementById('downloadPdfBtn').addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const a = analysisResult;
  const dims = ['size','usefulness','strength','versatility','composition','capacity'];
  const dimLabels = { size:'Size', usefulness:'Usefulness', strength:'Strength',
                      versatility:'Versatility', composition:'Composition', capacity:'Capacity' };
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18;
  const usable = W - M * 2;
  let y = M;

  const NAVY  = [0, 18, 86];
  const AMBER = [131, 85, 0];
  const GOLD  = [254, 174, 44];
  const MUTED = [100, 108, 125];
  const BODY  = [45, 49, 52];

  function newPage() { doc.addPage(); y = M; }
  function guard(need) { if (y + need > H - 18) newPage(); }

  function hline(yy, col) {
    doc.setDrawColor(...(col || [198, 197, 210]));
    doc.setLineWidth(0.3);
    doc.line(M, yy, W - M, yy);
  }

  function block(text, x, maxW, size, style, color, lh) {
    doc.setFontSize(size);
    doc.setFont('helvetica', style || 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text || ''), maxW);
    lines.forEach(ln => { guard(lh + 2); doc.text(ln, x, y); y += lh; });
  }

  function addFooters() {
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.text(
        'Generated by BOX Theory Analyzer  |  For educational purposes only. Not financial advice.',
        M, H - 8
      );
      doc.text('Page ' + i + ' of ' + total, W - M, H - 8, { align: 'right' });
    }
  }

  // ── Page 1: Title ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, H, 'F');

  doc.setFillColor(...GOLD);
  doc.rect(0, 60, W, 2, 'F');
  doc.rect(0, H - 62, W, 2, 'F');

  doc.setFontSize(30); doc.setFont('helvetica','bold'); doc.setTextColor(...GOLD);
  doc.text('BOX Theory', W/2, 80, { align:'center' });
  doc.setFontSize(22); doc.setTextColor(255,255,255);
  doc.text('Analysis Report', W/2, 93, { align:'center' });

  doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(185,195,255);
  doc.text(companyInputData.companyName, W/2, 118, { align:'center' });
  doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.setTextColor(150,160,200);
  doc.text(companyInputData.industry, W/2, 128, { align:'center' });
  doc.text(new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'}), W/2, 138, { align:'center' });

  doc.setFontSize(18); doc.setFont('helvetica','bold'); doc.setTextColor(...GOLD);
  doc.text(a.grade + '  |  ' + a.totalScore + '/60', W/2, 165, { align:'center' });

  // ── Page 2: Score table ──
  newPage();
  doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY);
  doc.text('Dimension Scores', M, y); y += 4;
  hline(y, GOLD); y += 10;

  // Table header
  doc.setFillColor(230, 232, 236);
  doc.rect(M, y - 5, usable, 9, 'F');
  doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(...MUTED);
  doc.text('Dimension', M + 3, y); doc.text('Score', M + 95, y); doc.text('Bar', M + 118, y);
  y += 10;

  dims.forEach((d, i) => {
    const sc = a.dimensions[d].score;
    if (i % 2 === 0) { doc.setFillColor(245, 247, 251); doc.rect(M, y-5, usable, 9, 'F'); }
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY);
    doc.text(dimLabels[d], M + 3, y);
    doc.setTextColor(...AMBER);
    doc.text(sc + '/10', M + 95, y);
    const barW = (sc / 10) * 60;
    doc.setFillColor(...GOLD); doc.rect(M + 118, y - 4, barW, 5, 'F');
    doc.setDrawColor(...AMBER); doc.setLineWidth(0.3); doc.rect(M + 118, y - 4, 60, 5);
    y += 11;
  });

  y += 6; hline(y); y += 10;
  doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY);
  doc.text('Total Score:', M, y); doc.setTextColor(...AMBER); doc.text(String(a.totalScore) + ' / 60', M + 35, y);
  y += 9;
  doc.setTextColor(...NAVY); doc.text('Grade:', M, y);
  doc.setTextColor(...AMBER); doc.text(a.grade, M + 20, y);
  y += 16; hline(y); y += 12;

  // ── Dimension analysis ──
  dims.forEach(d => {
    guard(40);
    doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY);
    doc.text(dimLabels[d] + '  -  ' + a.dimensions[d].score + '/10', M, y); y += 8;
    block(a.dimensions[d].reasoning, M, usable, 10, 'normal', BODY, 6);

    if (a.dimensions[d].score < 6 && a.dimensions[d].improvementNote) {
      guard(28);
      const noteLines = doc.splitTextToSize('Improvement Note: ' + a.dimensions[d].improvementNote, usable - 8);
      doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(147, 0, 10);
      noteLines.forEach((ln, ni) => {
        guard(10);
        doc.setFillColor(255, 218, 214);
        doc.rect(M, y - 4, usable, 7.5, 'F');
        doc.setTextColor(147, 0, 10);
        doc.text((ni === 0 ? '>> ' : '   ') + ln, M + 4, y);
        y += 5.5;
      });
      y += 4;
    }
    y += 4; guard(6); hline(y); y += 10;
  });

  // ── Investment Summary ──
  guard(40);
  doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY);
  doc.text('Overall Investment Summary', M, y); y += 8;
  block(a.investmentSummary, M, usable, 10, 'normal', BODY, 6);
  y += 8; guard(6); hline(y); y += 12;

  // ── Investor Guidance ──
  guard(40);
  doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY);
  doc.text('What Should the Investor Do?', M, y); y += 8;
  const guidLines = doc.splitTextToSize(a.investorGuidance, usable - 8);
  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(107, 69, 0);
  guidLines.forEach(ln => {
    guard(10);
    doc.setFillColor(255, 221, 180);
    doc.rect(M, y - 4, usable, 8, 'F');
    doc.setTextColor(107, 69, 0);
    doc.text(ln, M + 4, y);
    y += 6;
  });

  addFooters();
  doc.save('BOX_Theory_' + companyInputData.companyName.replace(/\s+/g,'_') + '.pdf');
});

// ── Page-load entrance animations ────────────────────
gsap.registerPlugin(ScrollTrigger);

// Nav: hidden until user scrolls past the hero
gsap.set('#mainNav', { y: -60, opacity: 0 });
var navHeroTrigger = ScrollTrigger.create({
  trigger: '#heroSection',
  start: 'bottom top',
  onEnter: function() {
    gsap.to('#mainNav', { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
  },
  onLeaveBack: function() {
    gsap.to('#mainNav', { y: -60, opacity: 0, duration: 0.35, ease: 'power2.in' });
  }
});

// Hero content: staggered entrance on page load
gsap.set(['#heroHeadline', '#heroSubheading', '#heroCtaAnalyze', '#heroCtaLearn', '.hero-scroll-hint'], {
  y: 32, opacity: 0
});
gsap.to('#heroHeadline',    { y: 0, opacity: 1, duration: 0.85, ease: 'power2.out', delay: 0.25 });
gsap.to('#heroSubheading',  { y: 0, opacity: 1, duration: 0.85, ease: 'power2.out', delay: 0.45 });
gsap.to('#heroCtaAnalyze',  { y: 0, opacity: 1, duration: 0.75, ease: 'power2.out', delay: 0.62 });
gsap.to('#heroCtaLearn',    { y: 0, opacity: 1, duration: 0.75, ease: 'power2.out', delay: 0.74 });
gsap.to('.hero-scroll-hint',{ y: 0, opacity: 0.38, duration: 0.7, ease: 'power2.out', delay: 1.1 });

gsap.from('#inputView main > *', {
  y: 40, opacity: 0, duration: 0.8, ease: 'power2.out',
  stagger: 0.12, delay: 0.3
});

// ── Results animations ────────────────────────────────
function initResultsAnimations() {
  // Small delay to let DOM paint
  setTimeout(() => {
    const circumference = 2 * Math.PI * 58;

    // ── Grade badge: premium restyle ──
    const badge = document.getElementById('gradeBadge');
    if (badge) {
      const gradeText = badge.textContent.replace(/[🟢🔵🟡🟠🔴]\s*/u, '').trim();
      if (gradeText === 'Elite Box') {
        badge.style.background = 'linear-gradient(135deg, #F5A623, #FFD07A)';
        badge.style.color = '#0D1142';
        badge.style.border = 'none';
        badge.style.boxShadow = '0 0 20px rgba(245,166,35,0.4)';
      } else if (gradeText === 'Strong Box') {
        badge.style.background = '#0D1142';
        badge.style.color = '#FFFFFF';
        badge.style.border = '2px solid #F5A623';
        badge.style.boxShadow = '0 0 12px rgba(245,166,35,0.2)';
      } else if (gradeText === 'Average Box') {
        badge.style.background = 'rgba(245,166,35,0.15)';
        badge.style.color = '#FFD07A';
        badge.style.border = '1px solid rgba(245,166,35,0.4)';
      } else if (gradeText === 'Weak Box') {
        badge.style.background = 'rgba(239,68,68,0.15)';
        badge.style.color = '#FCA5A5';
        badge.style.border = '1px solid rgba(239,68,68,0.4)';
      } else {
        badge.style.background = 'rgba(239,68,68,0.2)';
        badge.style.color = '#FCA5A5';
        badge.style.border = '1px solid rgba(239,68,68,0.5)';
      }
    }

    // ── Score ring: animate via GSAP on ScrollTrigger ──
    const arc = document.getElementById('scoreArc');
    const scoreEl = document.getElementById('totalScoreDisplay');
    const targetScore = parseInt(scoreEl.textContent) || 0;
    const targetOffset = circumference * (1 - targetScore / 60);

    // Reset arc to hidden
    if (arc) {
      arc.style.strokeDashoffset = circumference;

      ScrollTrigger.create({
        trigger: arc,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(arc, {
            attr: { strokeDashoffset: targetOffset },
            duration: 1.6,
            ease: 'power2.out'
          });
        }
      });
    }

    // ── Score number count-up ──
    if (scoreEl) {
      const counter = { val: 0 };
      ScrollTrigger.create({
        trigger: scoreEl,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(counter, {
            val: targetScore,
            duration: 1.6,
            ease: 'power2.out',
            onUpdate: function() {
              scoreEl.textContent = Math.round(counter.val);
            }
          });
        }
      });
    }

    // ── Dimension cards: staggered alternating slide ──
    const cards = document.querySelectorAll('#dimCards > div');
    cards.forEach((card, i) => {
      gsap.from(card, {
        x: i % 2 === 0 ? -40 : 40,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 88%',
          once: true
        },
        delay: i * 0.05
      });
    });

    // ── Radar: scale + fade ──
    const radarWrap = document.querySelector('#radarChart');
    if (radarWrap) {
      gsap.from(radarWrap, {
        scale: 0.95,
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: radarWrap,
          start: 'top 88%',
          once: true
        }
      });
    }

    // ── Summary card ──
    const summaryCard = document.getElementById('investmentSummary');
    if (summaryCard) {
      gsap.from(summaryCard.parentElement, {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.15,
        scrollTrigger: {
          trigger: summaryCard,
          start: 'top 88%',
          once: true
        }
      });
    }

    // ── Guidance card ──
    const guidanceCard = document.getElementById('investorGuidance');
    if (guidanceCard) {
      gsap.from(guidanceCard.parentElement, {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.25,
        scrollTrigger: {
          trigger: guidanceCard,
          start: 'top 88%',
          once: true
        }
      });
    }

    // Refresh ScrollTrigger after layout settles
    ScrollTrigger.refresh();
  }, 120);
}

// ── Nav tab switching ──
(function() {
  var tabs    = document.querySelectorAll('.nav-tab');
  var sections = {
    analyzerSection: document.getElementById('analyzerSection'),
    toolsSection:    document.getElementById('toolsSection'),
    learnSection:    document.getElementById('learnSection'),
    newsSection:     document.getElementById('newsSection')
  };

  var learnAnimated = false;

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      hideHero();
      var target = tab.dataset.section;
      tabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      Object.keys(sections).forEach(function(id) {
        sections[id].style.display = (id === target) ? '' : 'none';
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (target === 'learnSection') initLearnView();
      if (target === 'newsSection')  initNewsView();
    });
  });

  function initLearnView() {
    if (!learnAnimated) {
      learnAnimated = true;

      // ── Set every learn element to its initial hidden/below state ──
      gsap.set('.learn-hero-eyebrow, .learn-hero h1, .learn-hero-lead', { opacity: 0, y: 24 });
      gsap.set('#learnScoreRing', { opacity: 0, scale: 0.65, y: 0 });
      gsap.set('#learnSection .learn-section-header, #learnSection .learn-section-sub', { opacity: 0, y: 20 });
      gsap.set('.dim-card', { opacity: 0, y: 28 });
      gsap.set('.flow-step, .flow-arrow', { opacity: 0, y: 18 });
      gsap.set('#learnGradeScale', { opacity: 0, y: 20 });
      gsap.set('.tier-card', { opacity: 0, y: 24 });
      gsap.set('.example-header, .example-dim-row', { opacity: 0, y: 18 });
      gsap.set('#learnResultBox', { opacity: 0, y: 18 });
      gsap.set('.mistake-card', { opacity: 0, y: 22 });
      gsap.set('.learn-cta-wrap, .learn-disclaimer', { opacity: 0, y: 18 });

      // ── Hero text (eyebrow → h1 → lead) ──
      ['.learn-hero-eyebrow', '.learn-hero h1', '.learn-hero-lead'].forEach(function(sel, i) {
        var el = document.querySelector(sel);
        if (!el) return;
        ScrollTrigger.create({
          trigger: el, start: 'top 88%', once: true,
          onEnter: function() {
            gsap.to(el, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: i * 0.1 });
          }
        });
      });

      // ── Score ring + count-up ──
      ScrollTrigger.create({
        trigger: '#learnScoreRing', start: 'top 88%', once: true,
        onEnter: function() {
          gsap.to('#learnScoreRing', { opacity: 1, scale: 1, duration: 0.9, ease: 'back.out(1.7)' });
          var numEl = document.getElementById('learnScoreNum');
          if (numEl) {
            var obj = { val: 0 };
            gsap.to(obj, { val: 60, duration: 1.4, ease: 'power2.out', delay: 0.2,
              onUpdate: function() { numEl.textContent = Math.round(obj.val); }
            });
          }
        }
      });

      // ── Section headers and subs ──
      document.querySelectorAll('#learnSection .learn-section-header, #learnSection .learn-section-sub').forEach(function(el) {
        ScrollTrigger.create({
          trigger: el, start: 'top 88%', once: true,
          onEnter: function() { gsap.to(el, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }); }
        });
      });

      // ── Dim cards ──
      document.querySelectorAll('.dim-card').forEach(function(card, i) {
        ScrollTrigger.create({
          trigger: card, start: 'top 88%', once: true,
          onEnter: function() {
            gsap.to(card, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', delay: (i % 2) * 0.09 });
          }
        });
      });

      // ── Flow steps and arrows ──
      document.querySelectorAll('.flow-step, .flow-arrow').forEach(function(el) {
        ScrollTrigger.create({
          trigger: el, start: 'top 90%', once: true,
          onEnter: function() { gsap.to(el, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }); }
        });
      });

      // ── Grade scale ──
      var gradeScale = document.getElementById('learnGradeScale');
      if (gradeScale) {
        ScrollTrigger.create({
          trigger: gradeScale, start: 'top 88%', once: true,
          onEnter: function() { gsap.to(gradeScale, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }); }
        });
      }

      // ── Tier cards ──
      document.querySelectorAll('.tier-card').forEach(function(card, i) {
        ScrollTrigger.create({
          trigger: card, start: 'top 88%', once: true,
          onEnter: function() {
            gsap.to(card, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', delay: i * 0.1 });
          }
        });
      });

      // ── Example header ──
      var exHeader = document.querySelector('.example-header');
      if (exHeader) {
        ScrollTrigger.create({
          trigger: exHeader, start: 'top 88%', once: true,
          onEnter: function() { gsap.to(exHeader, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }); }
        });
      }

      // ── Example dim rows + score bars + counter ──
      var exRows = document.querySelectorAll('#exDimRows .example-dim-row');
      var exTotal = document.getElementById('exTotalNum');
      if (exRows.length && exTotal) {
        var totalScore = 0;
        exRows.forEach(function(row) { totalScore += parseInt(row.dataset.score || 0); });
        ScrollTrigger.create({
          trigger: '#exDimRows', start: 'top 80%', once: true,
          onEnter: function() {
            exRows.forEach(function(row, i) {
              var score = parseInt(row.dataset.score || 0);
              var max   = parseInt(row.dataset.max || 10);
              var bar   = row.querySelector('.example-score-bar');
              gsap.to(row, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: i * 0.07 });
              if (bar) {
                gsap.to(bar, { width: (score / max * 100) + '%', duration: 0.9, ease: 'power2.out', delay: i * 0.08 });
              }
            });
            var obj2 = { val: 0 };
            gsap.to(obj2, { val: totalScore, duration: 1.2, ease: 'power2.out', delay: 0.3,
              onUpdate: function() { exTotal.textContent = Math.round(obj2.val); }
            });
          }
        });
      }

      // ── Result summary box ──
      var resultBox = document.getElementById('learnResultBox');
      if (resultBox) {
        ScrollTrigger.create({
          trigger: resultBox, start: 'top 88%', once: true,
          onEnter: function() { gsap.to(resultBox, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }); }
        });
      }

      // ── Mistake cards ──
      document.querySelectorAll('.mistake-card').forEach(function(card, i) {
        ScrollTrigger.create({
          trigger: card, start: 'top 90%', once: true,
          onEnter: function() {
            gsap.to(card, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: i * 0.07 });
          }
        });
      });

      // ── CTA + disclaimer ──
      document.querySelectorAll('.learn-cta-wrap, .learn-disclaimer').forEach(function(el) {
        ScrollTrigger.create({
          trigger: el, start: 'top 90%', once: true,
          onEnter: function() { gsap.to(el, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }); }
        });
      });
    }

    ScrollTrigger.refresh();
  }

  // CTA button → switch to Analyzer tab
  var ctaBtn = document.getElementById('learnCtaBtn');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', function() {
      var analyzerTab = document.querySelector('.nav-tab[data-section="analyzerSection"]');
      if (analyzerTab) analyzerTab.click();
    });
  }

  // Learn is the default section — initialise it on page load
  initLearnView();

  // ── Tool selector buttons ──
  var toolsLayout       = document.getElementById('toolsLayout');
  var toolsActiveContent = document.getElementById('toolsActiveContent');

  function showTool(value) {
    // Show/hide individual tool sections
    document.querySelectorAll('.tool-section').forEach(function(s) {
      s.classList.toggle('active', !!(value && s.id === 'tool-' + value));
    });
    // Toggle active button highlight
    document.querySelectorAll('.tool-select-btn').forEach(function(btn) {
      btn.classList.toggle('active', !!(value && btn.dataset.tool === value));
    });
    // Show content area + reorder layout
    if (toolsLayout)        toolsLayout.classList.toggle('has-active', !!value);
    if (toolsActiveContent) toolsActiveContent.style.display = value ? 'block' : 'none';
    if (value) window.scrollTo({ top: 0, behavior: 'smooth' });
    // Wire glow on any buttons just rendered into the active tool section
    if (value) setTimeout(function() { wireGlow(); }, 0);
  }

  // Wire glow effect for any button with .tool-btn-glow (runs once on load,
  // also exposed as window._wireGlow for tool sections rendered after load)
  function wireGlow(root) {
    (root || document).querySelectorAll('.tool-btn-glow').forEach(function(glow) {
      var btn = glow.parentElement;
      if (!btn || btn._glowWired) return;
      btn._glowWired = true;
      btn.addEventListener('mousemove', function(e) {
        var r = btn.getBoundingClientRect();
        glow.style.left = (e.clientX - r.left) + 'px';
        glow.style.top  = (e.clientY - r.top)  + 'px';
      });
      btn.addEventListener('mouseenter', function() { glow.classList.add('visible'); });
      btn.addEventListener('mouseleave', function() { glow.classList.remove('visible'); });
    });
  }
  wireGlow();
  window._wireGlow = wireGlow;

  var btnGrid = document.getElementById('toolsBtnGrid');
  if (btnGrid) {
    btnGrid.querySelectorAll('.tool-select-btn').forEach(function(btn) {
      var glow = btn.querySelector('.tool-btn-glow');

      // Glow follows the cursor
      btn.addEventListener('mousemove', function(e) {
        if (!glow) return;
        var r = btn.getBoundingClientRect();
        glow.style.left = (e.clientX - r.left) + 'px';
        glow.style.top  = (e.clientY - r.top)  + 'px';
      });
      btn.addEventListener('mouseenter', function() { if (glow) glow.classList.add('visible'); });
      btn.addEventListener('mouseleave', function() { if (glow) glow.classList.remove('visible'); });

      // Click: select or deselect
      btn.addEventListener('click', function() {
        var tool = btn.dataset.tool;
        showTool(btn.classList.contains('active') ? '' : tool);
      });
    });

    // Honour URL hash on load
    var hash = location.hash.replace('#', '');
    if (hash) showTool(hash);
  }
})();

// ════════════════════════════════════════════════════════════════════════════
//  ANALYZER BACKGROUND CANVAS
//  Stripe-inspired sinusoidal helix of vertical line segments with
//  spring-physics mouse repulsion and a periodic travelling pulse wave.
//  Sits at z-index:-1 behind all analyzer content — purely decorative.
// ════════════════════════════════════════════════════════════════════════════
(function initAnalyzerCanvas() {
  var canvas  = document.getElementById('analyzerBgCanvas');
  if (!canvas) return;
  var ctx     = canvas.getContext('2d');
  var section = document.getElementById('analyzerSection');

  // ── Configuration ────────────────────────────────────────────────────────
  var CFG = {
    cols:          14,    // line columns across canvas width
    rows:           8,    // line rows across canvas height
    halfH:         20,    // half-height of each vertical segment (px)
    waveFreq:       3,    // full sine waves along the horizontal
    waveAmpPct:  0.055,   // wave amplitude as fraction of canvas width
    mouseR:       145,    // mouse influence radius (px)
    repulsion:    4.2,    // max repulsion force magnitude
    spring:      0.052,   // spring constant pulling line back to rest
    damp:        0.81,    // velocity damping per frame (lower = slower return)
    baseAlpha:   0.07,    // base line opacity — keep this subtle
    pulseAlpha:  0.21,    // peak opacity at the leading edge of a pulse
    pulseWidth:  0.13,    // pulse band width in normalised t-space (0–1)
    pulseInterval: 3600,  // ms between pulse launches
    lineWidth:      1,    // canvas stroke width (px)
    // Site accent colour #C5954A
    R: 197, G: 149, B: 74,
  };

  var W = 0, H = 0;
  var lines   = [];
  var mouse   = { x: -9999, y: -9999 };
  var pulseT  = -1;   // -1 = idle; 0–1 = active pulse position
  var raf;

  // ── Build line grid ──────────────────────────────────────────────────────
  function buildLines() {
    lines = [];
    if (!W || !H) return;
    var amp   = W * CFG.waveAmpPct;
    var cStep = W / (CFG.cols + 1);
    var rStep = H / (CFG.rows + 1);

    for (var c = 0; c < CFG.cols; c++) {
      var t     = c / (CFG.cols - 1);          // 0..1 across width
      var phase = t * Math.PI * 2 * CFG.waveFreq;
      var wOff  = Math.sin(phase) * amp;        // sinusoidal x-offset

      for (var r = 0; r < CFG.rows; r++) {
        var rx = cStep * (c + 1) + wOff;
        var ry = rStep * (r + 1);
        // Lines near wave peaks are slightly brighter (depth cue)
        var depthMod = 0.55 + 0.45 * (0.5 + 0.5 * Math.cos(phase));

        lines.push({
          rx: rx, ry: ry,             // rest / equilibrium position
          x:  rx, y:  ry,             // current drawn position
          vx: 0,  vy: 0,              // velocity
          a0: CFG.baseAlpha * depthMod,  // per-line base alpha
          sp: Math.random() * Math.PI * 2, // shimmer phase offset
          t:  t,                      // 0..1 column position for pulse
        });
      }
    }
  }

  // ── Resize ───────────────────────────────────────────────────────────────
  function resize() {
    W = section.offsetWidth  || window.innerWidth;
    H = section.offsetHeight || window.innerHeight;
    canvas.width  = W;
    canvas.height = H;
    buildLines();
  }

  // ── Animation loop ───────────────────────────────────────────────────────
  function tick(now) {
    // Auto-resize if section dimensions changed (e.g. became visible or
    // results content made it taller)
    var sw = section.offsetWidth;
    var sh = section.offsetHeight;
    if (sw > 0 && (canvas.width !== sw || canvas.height !== sh)) {
      W = sw; H = sh;
      canvas.width  = W;
      canvas.height = H;
      buildLines();
    }

    ctx.clearRect(0, 0, W, H);
    if (!W || !H) { raf = requestAnimationFrame(tick); return; }

    // Advance pulse (covers 0→1 in ~2.4 s at 60 fps)
    if (pulseT >= 0) {
      pulseT += 0.007;
      if (pulseT > 1.15) pulseT = -1;
    }

    ctx.lineWidth = CFG.lineWidth;

    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];

      // Mouse repulsion
      var dx = ln.x - mouse.x;
      var dy = ln.y - mouse.y;
      var d2 = dx * dx + dy * dy;
      if (d2 < CFG.mouseR * CFG.mouseR && d2 > 0.01) {
        var d = Math.sqrt(d2);
        var f = (1 - d / CFG.mouseR) * CFG.repulsion;
        ln.vx += (dx / d) * f;
        ln.vy += (dy / d) * f;
      }

      // Spring toward rest position
      ln.vx += (ln.rx - ln.x) * CFG.spring;
      ln.vy += (ln.ry - ln.y) * CFG.spring;

      // Damp and integrate
      ln.vx *= CFG.damp;
      ln.vy *= CFG.damp;
      ln.x  += ln.vx;
      ln.y  += ln.vy;

      // Pulse contribution: soft sine envelope around the travelling front
      var pulseBoost = 0;
      if (pulseT >= 0) {
        var delta = Math.abs(ln.t - pulseT);
        if (delta < CFG.pulseWidth) {
          pulseBoost = Math.sin((1 - delta / CFG.pulseWidth) * Math.PI)
                       * (CFG.pulseAlpha - ln.a0);
        }
      }

      // Slow shimmer
      var shimmer = 0.011 * Math.sin(now * 0.00055 + ln.sp);

      var alpha = ln.a0 + pulseBoost + shimmer;
      if (alpha < 0) alpha = 0;
      if (alpha > 1) alpha = 1;

      ctx.beginPath();
      ctx.moveTo(ln.x, ln.y - CFG.halfH);
      ctx.lineTo(ln.x, ln.y + CFG.halfH);
      ctx.strokeStyle = 'rgba(' + CFG.R + ',' + CFG.G + ',' + CFG.B + ',' + alpha.toFixed(3) + ')';
      ctx.stroke();
    }

    raf = requestAnimationFrame(tick);
  }

  // ── Event listeners ──────────────────────────────────────────────────────
  section.addEventListener('mousemove', function(e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x  = e.clientX - rect.left;
    mouse.y  = e.clientY - rect.top;
  });
  section.addEventListener('mouseleave', function() {
    mouse.x = -9999;
    mouse.y = -9999;
  });
  window.addEventListener('resize', function() {
    cancelAnimationFrame(raf);
    resize();
    raf = requestAnimationFrame(tick);
  });

  // Launch a pulse every N ms (only if no pulse is already running)
  setInterval(function() {
    if (pulseT < 0) pulseT = 0;
  }, CFG.pulseInterval);

  // ── Kick off ─────────────────────────────────────────────────────────────
  resize();
  raf = requestAnimationFrame(tick);
}());
