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
  return { 'Weak Box':'#ffffff', 'Poor Box':'#ffffff' }[g] || '#0F0F0F';
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
        badge.style.background = '#161616';
        badge.style.color = '#F0EDE6';
        badge.style.border = '2px solid #7B9EBF';
        badge.style.boxShadow = '0 0 12px rgba(123,158,191,0.20)';
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

      // ── Intro section: headline + body fade up staggered ─────────────
      var introInner = document.querySelector('#learn-intro .lv-intro-inner');
      if (introInner) {
        var introEls = Array.from(introInner.children);
        introEls.forEach(function(el, i) {
          gsap.set(el, { opacity: 0, y: 20 });
        });
        ScrollTrigger.create({
          trigger: '#learn-intro',
          start: 'top 80%',
          once: true,
          onEnter: function() {
            introEls.forEach(function(el, i) {
              gsap.to(el, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', delay: i * 0.12 });
            });
          }
        });
      }

      // ── Dimension cards: per-element timed animations ─────────────────
      document.querySelectorAll('.lv-dim-card').forEach(function(card) {
        var illus     = card.querySelector('.lv-dim-illus');
        var label     = card.querySelector('.lv-dim-label');
        var headline  = card.querySelector('.lv-dim-headline');
        var body      = card.querySelector('.lv-dim-body');
        var highScore = card.querySelector('.lv-high-score');
        var metric    = card.querySelector('.lv-dim-metric');

        if (illus)     gsap.set(illus,     { opacity: 0, scale: 0.92 });
        if (label)     gsap.set(label,     { opacity: 0, y: 15 });
        if (headline)  gsap.set(headline,  { opacity: 0, y: 20 });
        if (body)      gsap.set(body,      { opacity: 0, y: 15 });
        if (highScore) gsap.set(highScore, { opacity: 0, y: 15 });
        if (metric)    gsap.set(metric,    { opacity: 0 });

        ScrollTrigger.create({
          trigger: card,
          start: 'top 78%',
          once: true,
          onEnter: function() {
            if (illus)     gsap.to(illus,     { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' });
            if (label)     gsap.to(label,     { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
            if (headline)  gsap.to(headline,  { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', delay: 0.1 });
            if (body)      gsap.to(body,      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.2 });
            if (highScore) gsap.to(highScore, { opacity: 0.72, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.25 });
            if (metric)    gsap.to(metric,    { opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.3 });
          }
        });
      });

      // ── CTA section ───────────────────────────────────────────────────
      var ctaHeadline = document.querySelector('#learn-cta .lv-cta-headline');
      var ctaBtn      = document.querySelector('#learn-cta .lv-cta-btn');
      if (ctaHeadline) gsap.set(ctaHeadline, { opacity: 0, y: 20 });
      if (ctaBtn)      gsap.set(ctaBtn,      { opacity: 0, y: 20 });
      if (ctaHeadline || ctaBtn) {
        ScrollTrigger.create({
          trigger: '#learn-cta',
          start: 'top 80%',
          once: true,
          onEnter: function() {
            if (ctaHeadline) gsap.to(ctaHeadline, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' });
            if (ctaBtn)      gsap.to(ctaBtn,      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.15 });
          }
        });
      }

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
//  ANALYZER STARBURST CANVAS
//  Radiating lines from a bottom-centre origin fanning upward.
//  Colour cycles automatically through all palettes over ~2 minutes.
//  A soft radial glow bleeds the current hue onto the dark background.
// ════════════════════════════════════════════════════════════════════════════
(function initAnalyzerCanvas() {
  var canvas  = document.getElementById('analyzerBgCanvas');
  var wrapper = document.getElementById('analyzerBgWrap');
  if (!canvas || !wrapper) return;
  var ctx = canvas.getContext('2d');

  // ── Palette sequence (cycled in order, looping) ──────────────────────────
  // Each palette: 3 colour stops [L, C, R] spread across the fan L→C→R
  //               + base alpha for line strokes.
  var SEQ = [
    { s: [[120, 82, 28],  [197, 149, 74],  [138, 98, 42]],   a: 0.17 }, // night / gold
    { s: [[180, 0, 255],  [110, 55, 255],  [0, 35, 215]],    a: 0.16 }, // pre-dawn
    { s: [[255, 90, 50],  [255, 48, 168],  [158, 22, 255]],  a: 0.15 }, // sunrise
    { s: [[28, 172, 255], [52, 112, 255],  [16, 52, 210]],   a: 0.15 }, // daytime
    { s: [[122, 72, 255], [182, 128, 255], [72, 52, 210]],   a: 0.14 }, // dusk
    { s: [[255, 132, 32], [255, 62, 132],  [198, 35, 202]],  a: 0.15 }, // sunset
  ];
  var SEQ_LEN = SEQ.length;

  // Full colour-cycle period in ms (~2 minutes feels imperceptible day-to-day
  // but unmistakably shifts over a minute of viewing)
  var CYCLE_MS = 128000;

  // Get interpolated colour for a specific line position (t 0–1) and global
  // cycle position (g 0–1 across the full sequence).
  function cycleCol(lineT, g) {
    // Which two palette entries are we between?
    var raw   = g * SEQ_LEN;
    var idxA  = Math.floor(raw) % SEQ_LEN;
    var idxB  = (idxA + 1) % SEQ_LEN;
    var frac  = raw - Math.floor(raw);

    // Each palette has 3 stops; interpolate across them for this line's angle
    function stopCol(pal, t) {
      var s = pal.s;
      var f, a, b;
      if (t <= 0.5) { f = t * 2;         a = s[0]; b = s[1]; }
      else          { f = (t - 0.5) * 2; a = s[1]; b = s[2]; }
      return [
        a[0] + (b[0] - a[0]) * f,
        a[1] + (b[1] - a[1]) * f,
        a[2] + (b[2] - a[2]) * f,
      ];
    }

    var cA = stopCol(SEQ[idxA], lineT);
    var cB = stopCol(SEQ[idxB], lineT);
    return [
      Math.round(cA[0] + (cB[0] - cA[0]) * frac),
      Math.round(cA[1] + (cB[1] - cA[1]) * frac),
      Math.round(cA[2] + (cB[2] - cA[2]) * frac),
    ];
  }

  // Centre colour used for the background glow (lineT = 0.5 = straight up)
  function glowCol(g) { return cycleCol(0.5, g); }

  // Alpha interpolated between the two adjacent palette entries
  function cycleAlpha(g) {
    var raw  = g * SEQ_LEN;
    var idxA = Math.floor(raw) % SEQ_LEN;
    var idxB = (idxA + 1) % SEQ_LEN;
    var f    = raw - Math.floor(raw);
    return SEQ[idxA].a + (SEQ[idxB].a - SEQ[idxA].a) * f;
  }

  // ── Physics constants ────────────────────────────────────────────────────
  var NUM    = 155;
  var SPREAD = Math.PI * 0.97;
  var DOT_R  = 1.9;
  var LINE_W = 0.75;
  var DRIFT  = 0.030;
  var DS     = 0.00025;
  var ATTR   = 0.22;
  var MRAD   = 0.46;
  var SPR    = 0.038;
  var DMP    = 0.86;

  var W = 0, H = 0, OX = 0, OY = 0;
  var lines = [];
  var mouse = { x: -9999, y: -9999, on: false };
  var raf;

  // ── Build lines ───────────────────────────────────────────────────────────
  function buildLines() {
    lines = [];
    if (!W || !H) return;
    OX = W * 0.5;
    OY = H;
    for (var i = 0; i < NUM; i++) {
      var t   = i / (NUM - 1);
      var ang = -SPREAD * 0.5 + t * SPREAD;
      var dx  = Math.sin(ang);
      var dy  = -Math.cos(ang);
      var len = H * (0.28 + 0.64 * (0.4 + 0.6 * Math.abs(Math.sin(t * Math.PI * 3.7 + i))));
      lines.push({
        dx: dx, dy: dy, len: len, t: t,
        tx: OX + dx * len, ty: OY + dy * len,
        vx: 0, vy: 0,
        dp: Math.random() * Math.PI * 2,
        ds: DS * (0.7 + 0.6 * Math.random()),
        ar: 0.72 + 0.28 * Math.random(), // per-line alpha randomisation (stable)
      });
    }
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  function resize() {
    W = wrapper.offsetWidth  || window.innerWidth;
    H = wrapper.offsetHeight || 560;
    canvas.width  = W;
    canvas.height = H;
    buildLines();
  }

  // ── Tick ──────────────────────────────────────────────────────────────────
  function tick(now) {
    // Auto-resize when wrapper first becomes visible
    var sw = wrapper.offsetWidth;
    var sh = wrapper.offsetHeight;
    if (sw > 0 && (canvas.width !== sw || canvas.height !== sh)) {
      W = sw; H = sh;
      canvas.width = W; canvas.height = H;
      buildLines();
    }

    ctx.clearRect(0, 0, W, H);
    if (!W || !H) { raf = requestAnimationFrame(tick); return; }

    OX = W * 0.5;
    OY = H;

    // Global cycle position (0–1, loops every CYCLE_MS ms)
    var g  = (now % CYCLE_MS) / CYCLE_MS;
    var gc = glowCol(g);
    var baseA = cycleAlpha(g);

    // ── Background glow: soft radial bloom at origin ──────────────────────
    var glowR = Math.max(W, H) * 0.72;
    var grd   = ctx.createRadialGradient(OX, OY, 0, OX, OY, glowR);
    grd.addColorStop(0,   'rgba(' + gc[0] + ',' + gc[1] + ',' + gc[2] + ',0.09)');
    grd.addColorStop(0.45,'rgba(' + gc[0] + ',' + gc[1] + ',' + gc[2] + ',0.04)');
    grd.addColorStop(1,   'rgba(' + gc[0] + ',' + gc[1] + ',' + gc[2] + ',0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // ── Lines + dots ──────────────────────────────────────────────────────
    var mR = Math.min(W, H) * MRAD;

    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];

      // Slow perpendicular sway
      var sway = Math.sin(now * ln.ds + ln.dp) * (ln.len * DRIFT);
      var ntx  = OX + ln.dx * ln.len + (-ln.dy) * sway;
      var nty  = OY + ln.dy * ln.len + ( ln.dx) * sway;

      // Cursor attraction
      var tx = ntx, ty = nty;
      if (mouse.on) {
        var ddx  = mouse.x - ln.tx;
        var ddy  = mouse.y - ln.ty;
        var dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist < mR) {
          var str = (1 - dist / mR) * ATTR;
          tx = ntx + (mouse.x - ntx) * str;
          ty = nty + (mouse.y - nty) * str;
        }
      }

      // Spring + damp + integrate
      ln.vx += (tx - ln.tx) * SPR;
      ln.vy += (ty - ln.ty) * SPR;
      ln.vx *= DMP; ln.vy *= DMP;
      ln.tx += ln.vx; ln.ty += ln.vy;

      var c = cycleCol(ln.t, g);
      var a = baseA * ln.ar;

      // Line
      ctx.beginPath();
      ctx.moveTo(OX, OY);
      ctx.lineTo(ln.tx, ln.ty);
      ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
      ctx.lineWidth   = LINE_W;
      ctx.stroke();

      // Tip dot
      ctx.beginPath();
      ctx.arc(ln.tx, ln.ty, DOT_R, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + Math.min(1, a * 2.8).toFixed(3) + ')';
      ctx.fill();
    }

    raf = requestAnimationFrame(tick);
  }

  // ── Events ────────────────────────────────────────────────────────────────
  wrapper.addEventListener('mousemove', function(e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.on = true;
  });
  wrapper.addEventListener('mouseleave', function() { mouse.on = false; });
  window.addEventListener('resize', function() {
    cancelAnimationFrame(raf);
    resize();
    raf = requestAnimationFrame(tick);
  });

  // ── Kick off ──────────────────────────────────────────────────────────────
  resize();
  raf = requestAnimationFrame(tick);
}());

// ════════════════════════════════════════════════════════════════════════════
//  PREMIUM UI UPGRADES — v2
// ════════════════════════════════════════════════════════════════════════════

// ── 1. Custom cursor with smooth lag (desktop only) ──────────────────────
(function initCursor() {
  if (!window.matchMedia('(pointer: fine) and (hover: hover)').matches) return;
  var dot = document.getElementById('cursor-dot');
  if (!dot) return;
  var mx = window.innerWidth / 2, my = window.innerHeight / 2;
  var cx = mx, cy = my;
  document.addEventListener('mousemove', function(e) { mx = e.clientX; my = e.clientY; });
  (function loop() {
    cx += (mx - cx) * 0.18;
    cy += (my - cy) * 0.18;
    dot.style.left = cx + 'px';
    dot.style.top  = cy + 'px';
    requestAnimationFrame(loop);
  }());
}());

// ── 2. Number count-up via IntersectionObserver ──────────────────────────
(function initCountupObserver() {
  if (!window.IntersectionObserver || !window.gsap) return;
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting || entry.target._counted) return;
      entry.target._counted = true;
      var el  = entry.target;
      var raw = (el.dataset.countup !== undefined) ? el.dataset.countup : el.textContent;
      var end = parseFloat(String(raw).replace(/[^0-9.]/g, '')) || 0;
      if (!end) return;
      var isInt = (end % 1 === 0);
      var obj = { val: 0 };
      gsap.to(obj, {
        val: end, duration: 2, ease: 'power2.out',
        onUpdate: function() {
          el.textContent = isInt ? Math.round(obj.val) : obj.val.toFixed(1);
        }
      });
      observer.unobserve(el);
    });
  }, { threshold: 0.3 });

  function observeCountups() {
    document.querySelectorAll('[data-countup]').forEach(function(el) {
      if (!el._counted) observer.observe(el);
    });
  }
  observeCountups();
  window.refreshCountup = observeCountups;
}());

// ── 3. Scroll animations for Tools section ───────────────────────────────
var _toolsAnimated = false;
function initToolsAnimations() {
  if (_toolsAnimated) return;
  _toolsAnimated = true;

  // Page header children fade up
  var hdr = document.querySelector('#toolsSection .tools-page-header');
  if (hdr) {
    gsap.from(hdr.children, {
      y: 30, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1
    });
  }

  // Tool selector buttons stagger
  var btns = document.querySelectorAll('#toolsBtnGrid .tool-select-btn');
  btns.forEach(function(btn, i) {
    gsap.from(btn, {
      y: 30, opacity: 0, duration: 0.6, ease: 'power2.out',
      delay: i * 0.07,
      scrollTrigger: { trigger: btn, start: 'top 90%', once: true }
    });
  });
}

// ── 4. Scroll animations for News section header ─────────────────────────
var _newsHdrAnimated = false;
function initNewsScrollAnimations() {
  if (_newsHdrAnimated) return;
  _newsHdrAnimated = true;

  var hdr = document.querySelector('#newsSection .news-page-header');
  if (hdr) {
    gsap.from(hdr.children, {
      y: 30, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1
    });
  }

  document.querySelectorAll('#newsSection .news-section').forEach(function(sec) {
    ScrollTrigger.create({
      trigger: sec, start: 'top 88%', once: true,
      onEnter: function() {
        gsap.from(sec, { y: 30, opacity: 0, duration: 0.6, ease: 'power2.out' });
      }
    });
  });
}

// ── Hook new animations into existing nav tab clicks ─────────────────────
document.querySelectorAll('.nav-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    if (tab.dataset.section === 'toolsSection') setTimeout(initToolsAnimations, 60);
    if (tab.dataset.section === 'newsSection')  setTimeout(initNewsScrollAnimations, 100);
  });
});
