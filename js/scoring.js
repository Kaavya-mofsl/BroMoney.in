// ════════════════════════════════════════════════════════════════════════════
//  BOX THEORY - RULE-BASED SCORING ENGINE (client-side, no external API)
// ════════════════════════════════════════════════════════════════════════════

function _fmt(n) {
  const num = Number(n) || 0, abs = Math.abs(num);
  if (abs >= 100000) return (num/100000).toFixed(1)+' lakh cr';
  if (abs >= 1000)   return (num/1000).toFixed(1)+'K';
  return num.toLocaleString('en-IN');
}

function scoreSize(d) {
  const rev=Number(d.revenue)||0, mc=Number(d.marketCap)||0,
        np=Number(d.netProfit)||0, geo=Number(d.geographies)||1;
  let pts=0;
  pts += rev>=50000?4:rev>=10000?3.5:rev>=2000?2.5:rev>=500?1.5:0.5;
  pts += mc>=100000?3:mc>=25000?2.5:mc>=5000?2:mc>=1000?1:0.5;
  if(np>=1000)pts+=2; else if(np>=200)pts+=1.5; else if(np>=50)pts+=1; else if(np>0)pts+=0.5;
  pts += geo>15?1:geo>=6?0.8:geo>=2?0.5:0.2;
  const score=Math.min(10,Math.round(pts));
  const sl=mc>=100000?'large-cap':mc>=20000?'mid-cap':mc>=5000?'small-cap':'micro-cap';
  const nm=rev>0?((np/rev)*100).toFixed(1):'0.0';
  let t=`${d.companyName} is a ${sl} company with a market capitalisation of Rs.${_fmt(mc)} crores. `;
  if(rev>=10000) t+=`Revenues of Rs.${_fmt(rev)} crores indicate a large-scale enterprise with strong market penetration and significant operational reach. `;
  else if(rev>=2000) t+=`Revenues of Rs.${_fmt(rev)} crores reflect a mid-sized business with meaningful market presence but room to scale further. `;
  else t+=`With revenues of Rs.${_fmt(rev)} crores the company is still building scale - BOX Theory favours businesses that have crossed the Rs.2,000 crore revenue threshold. `;
  if(np>0) t+=`Net profit of Rs.${_fmt(np)} crores yields a net margin of ${nm}%, which ${Number(nm)>=15?'is healthy and signals strong cost management':Number(nm)>=8?'is reasonable with room for margin expansion':'is thin, suggesting competitive pressure or high operating costs'}. `;
  else t+=`The company reports a net loss of Rs.${_fmt(Math.abs(np))} crores - BOX Theory requires consistent profitability for a quality-size classification. `;
  if(geo>=6) t+=`Presence across ${geo} countries signals a mature, internationally diversified business, adding meaningful strength to its Size profile. `;
  else if(geo>=2) t+=`Operations in ${geo} countries show geographic ambition, though further expansion would materially improve this score. `;
  else t+=`Operating in a single geography concentrates both risk and growth ceiling - international expansion is the primary lever here. `;
  if(score>=8) t+=`Overall, ${d.companyName} is a large, profitable, and geographically spread business that comfortably meets BOX Theory's Size standards.`;
  else if(score>=6) t+=`Overall, the company demonstrates reasonable size with clear pathways to scale in coming years.`;
  else t+=`Size metrics fall below the BOX Theory ideal - investors should watch for concrete scaling milestones before committing capital.`;
  const imp=score<6?`To improve the Size score, ${d.companyName} should target revenues above Rs.2,000 crores and sustain net profits above Rs.200 crores. Expanding to at least 3-5 countries would add geographic diversification points. Market capitalisation growth will naturally follow as fundamentals improve and attract institutional investors.`:null;
  return {score,reasoning:t,improvementNote:imp};
}

function scoreUsefulness(d) {
  const ind=(d.industry||'').toLowerCase(), desc=(d.businessDescription||'').toLowerCase(), com=ind+' '+desc;
  const ess=['bank','pharma','health','hospital','medicine','drug','utility','power','water','fmcg','food','consumer stapl','telecom','insurance','agricultur','agri','defense','oil','gas','energy','refin','fuel','petro'];
  const impSectors=['software','technology','tech','auto','automobile','cement','steel','metal','chemical','logistic','infra','infrastructure','construction','textile','engineering','material','it service','semiconductor','railway','aviation'];
  const dis=['retail','media','entertainment','hotel','hospitality','real estate','realty','jewel','luxury','fashion','apparel','tourism','restaurant'];
  const isE=ess.some(k=>com.includes(k)), isI=impSectors.some(k=>com.includes(k)), isD=dis.some(k=>com.includes(k)), isSp=['crypto','nft','gambling','casino'].some(k=>com.includes(k));
  let base=3.5;
  if(isSp)base=1; else if(isE)base=7; else if(isI)base=5; else if(isD)base=3;
  let bonus=0;
  if(/essential|critical|life.?saving|utility|recurring|staple/.test(desc))bonus+=1;
  if(/export|global|international|multinational|worldwide|overseas/.test(desc))bonus+=0.5;
  if(/diversif|multiple product|multiple segment|multiple revenue|various segment/.test(desc))bonus+=0.5;
  if(/innovat|research|r&d|patent|proprietary/.test(desc))bonus+=0.5;
  if(/market leader|dominant|monopol|largest|top player|market share/.test(desc))bonus+=0.5;
  const score=Math.min(10,Math.round(base+bonus));
  const ut=isE?'highly essential':isI?'economically important':isD?'discretionary':'moderately useful';
  let t=`${d.companyName} operates in the ${d.industry} sector, classified as ${ut} under the BOX Theory usefulness framework. `;
  if(isE) t+=`Essential industries like ${d.industry} enjoy non-cyclical recurring demand regardless of economic conditions, providing strong revenue stability and recession resistance. `;
  else if(isI) t+=`The ${d.industry} sector plays an important economic role with moderate demand stability, though it carries sensitivity to capital expenditure cycles. `;
  else if(isD) t+=`The ${d.industry} sector is discretionary - consumers may cut back during downturns, introducing revenue volatility that BOX Theory penalises. `;
  else t+=`The industry suggests moderate usefulness - demand exists but is neither as persistent as essential services nor as volatile as pure discretionary products. `;
  if(/essential|critical|life.?saving|utility|recurring/.test(desc)) t+=`The business description highlights critical or recurring-need services, reinforcing the usefulness thesis. `;
  else t+=`The core offering serves ${isE?'essential needs':'moderately necessary requirements'}, forming a reasonable demand foundation. `;
  if(bonus>=1) t+=`Additional signals - ${/export|global|international/.test(desc)?'international exposure, ':''}${/diversif|multiple/.test(desc)?'diversified revenue, ':''}${/innovat|r&d|patent/.test(desc)?'innovation focus, ':''}${/market leader|dominant/.test(desc)?'market leadership':'strategic moat'} - further strengthen the usefulness case. `;
  if(score>=8) t+=`This is a standout dimension - a high Usefulness score insulates investors from prolonged revenue droughts.`;
  else if(score>=6) t+=`The Usefulness score is satisfactory, supporting a moderately stable thesis under normal market conditions.`;
  else t+=`The low Usefulness score signals that demand can be volatile or easily substituted - a risk factor investors must carefully weigh.`;
  const imp=score<6?`To improve Usefulness, ${d.companyName} should expand into more essential product or service lines. Diversifying into recurring-need categories - subscriptions, maintenance contracts, essential commodities - would raise the score significantly. Companies that pair discretionary offerings with essential services consistently score higher in this dimension.`:null;
  return {score,reasoning:t,improvementNote:imp};
}

function scoreStrength(d) {
  const roce=Number(d.roce)||0, roe=Number(d.roe)||0, de=Number(d.debtToEquity)||0,
        icr=Number(d.interestCoverage)||0, ebitda=Number(d.ebitdaMargin)||0, ocf=Number(d.operatingCashFlow)||0;
  let pts=0;
  pts+=roce>=25?2:roce>=15?1.5:roce>=10?1:roce>=5?0.5:0;
  pts+=roe>=20?2:roe>=15?1.5:roe>=10?1:roe>=5?0.5:0;
  pts+=de===0?2:de<0.5?1.8:de<1?1.5:de<1.5?1:de<2?0.5:0;
  pts+=icr>=10?1.5:icr>=5?1.2:icr>=3?1:icr>=1.5?0.5:0;
  pts+=ebitda>=30?1.5:ebitda>=20?1.2:ebitda>=15?1:ebitda>=10?0.5:0;
  pts+=ocf>500?1:ocf>0?0.7:0;
  const score=Math.min(10,Math.round(pts));
  let t=`${d.companyName}'s financial strength is evaluated across ROCE, ROE, Debt/Equity, Interest Coverage, EBITDA Margin, and Operating Cash Flow - the most objective indicators of business quality in BOX Theory. `;
  if(roce>=20) t+=`ROCE of ${roce}% is excellent - every Rs.100 of capital employed generates Rs.${roce} in operating profit, well above the 15% BOX Theory benchmark. `;
  else if(roce>=15) t+=`ROCE of ${roce}% meets the 15% BOX Theory benchmark, confirming productive capital deployment. `;
  else if(roce>=10) t+=`ROCE of ${roce}% is moderate - above basic cost of capital but short of the 15% BOX Theory ideal. `;
  else t+=`ROCE of ${roce}% is below acceptable levels, raising questions about capital efficiency and shareholder value creation. `;
  if(de===0) t+=`A debt-free balance sheet is a significant strength - zero interest burden and complete financial flexibility. `;
  else if(de<1) t+=`D/E ratio of ${de} is healthy - within the conservative 1x threshold BOX Theory recommends. `;
  else if(de<2) t+=`D/E ratio of ${de} is elevated - investors should monitor whether debt is being deployed productively. `;
  else t+=`D/E ratio of ${de} signals a heavily leveraged balance sheet, amplifying financial risk during downturns. `;
  if(ebitda>=20) t+=`EBITDA margin of ${ebitda}% is strong, confirming substantial operating profit generation. `;
  else if(ebitda>=10) t+=`EBITDA margin of ${ebitda}% is moderate - room for improvement through scale or cost control. `;
  else t+=`EBITDA margin of ${ebitda}% is thin - significant overhead or competitive pressure needs addressing. `;
  if(ocf>0) t+=`Positive operating cash flow of Rs.${_fmt(ocf)} crores confirms the company converts profits into real cash - a fundamental BOX Theory requirement.`;
  else t+=`Negative operating cash flow of Rs.${_fmt(Math.abs(ocf))} crores is a serious concern - profit without cash generation signals accounting or working capital risks.`;
  const imp=score<6?`To strengthen the financial profile, ${d.companyName} should lift ROCE above 15% and ROE above 15% - by growing profits or reducing capital employed. Reducing D/E below 1x through planned debt repayment would meaningfully improve the score. Consistently positive operating cash flow is non-negotiable in BOX Theory.`:null;
  return {score,reasoning:t,improvementNote:imp};
}

function scoreVersatility(d) {
  const geo=Number(d.geographies)||1, desc=(d.businessDescription||'').toLowerCase();
  let gP=geo>15?5:geo>=8?4:geo>=4?3:geo>=2?2:1;
  let dP=0;
  if(/multiple product|multiple segment|multiple business|various segment|diverse product/.test(desc))dP+=1;
  if(/b2b.*b2c|b2c.*b2b|retail.*wholesale|consumer.*enterprise|enterprise.*consumer/.test(desc))dP+=1;
  if(/product.*service|service.*product|manufactur.*service|solution.*product|platform/.test(desc))dP+=1;
  const st=['manufactur','service','retail','export','digital','physical','online','subscription','solution','component','system'].filter(t=>desc.includes(t)).length;
  if(st>=3&&dP<2)dP=Math.min(2,dP+1);
  let eP=0;
  if(/international|global|worldwide|overseas|multinational|export/.test(desc))eP+=1;
  if(/platform|ecosystem|network effect|marketplace|saas|recurring model/.test(desc))eP+=0.5;
  if(/expand|expansion|new market|new geography|launch|growth plan|strategic acquisit/.test(desc))eP+=0.5;
  const score=Math.min(10,Math.round(gP+dP+eP));
  let t=`Versatility measures how broadly ${d.companyName} can deploy its capabilities across markets, geographies, and customer segments - a key indicator of long-term resilience. `;
  if(geo>=8) t+=`Operating across ${geo} countries demonstrates a truly global business with significantly reduced geographic concentration risk. `;
  else if(geo>=3) t+=`With operations in ${geo} geographies the company has begun diversifying, though significant room remains to expand the international footprint. `;
  else t+=`Operating in only ${geo} ${geo===1?'geography':'geographies'} is the primary limiting factor - geographic concentration amplifies country-specific risk. `;
  if(dP>=2) t+=`Strong product-service diversification is evident - multiple segments and revenue channels reduce dependence on any single market. `;
  else if(dP>=1) t+=`Some diversification is visible but broader product mix or customer base development would build more robust Versatility credentials. `;
  else t+=`The company appears concentrated in a single line - this single-point-of-failure risk is specifically penalised in the Versatility dimension. `;
  if(eP>=1) t+=`Positive signals in the description - international exposure, platform thinking, or expansion plans - indicate management's ambition to build a multi-market business. `;
  else t+=`The description does not prominently feature expansion plans, suggesting this growth lever remains largely untapped. `;
  if(score>=7) t+=`Overall, ${d.companyName} shows solid versatility that should provide resilience across different market cycles.`;
  else t+=`Geographic expansion and segment diversification are the highest-impact actions to improve this dimension.`;
  const imp=score<6?`To improve Versatility, ${d.companyName} should pursue operations in at least 5-10 countries and develop complementary product categories. Entering both B2B and B2C segments would add meaningful diversification points. Building platform or ecosystem characteristics represents the highest Versatility ceiling in BOX Theory.`:null;
  return {score,reasoning:t,improvementNote:imp};
}

function scoreComposition(d) {
  const holdingKnown = d.promoterHolding !== null && d.promoterHolding !== undefined;
  const h = holdingKnown ? Number(d.promoterHolding) : null;
  const p = Number(d.promoterPledge) || 0;
  // If holding data is unavailable, use a neutral mid-point (3) so missing data
  // doesn't unfairly collapse the score — pledge behaviour still counts.
  let hP = holdingKnown
    ? (h>=50&&h<=70?6:h>70?5.5:h>=40?4.5:h>=25?3:h>=10?1.5:0.5)
    : 3;
  let pP = p===0?4:p<5?3.5:p<10?3:p<20?2:p<40?1:0;
  const score = Math.min(10, Math.round(hP + pP));
  let t = `Composition in BOX Theory focuses on promoter ownership and pledge behaviour as proxies for management alignment and governance quality. `;
  if (!holdingKnown) {
    t += `Promoter holding data is not available from this data source — the holding component has been scored neutrally. For a more accurate Composition score, verify the promoter stake on NSE/BSE and note that lower pledge is always a positive signal. `;
  } else if(h>=50&&h<=70) t+=`Promoter holding of ${h}% is in the ideal 50-70% range - strong founder conviction with enough public float for institutional participation. `;
  else if(h>70) t+=`Promoter holding of ${h}% reflects very strong conviction, though compressed float can reduce liquidity and occasionally deter large institutions. `;
  else if(h>=40) t+=`Promoter holding of ${h}% is decent but marginally below the 50% comfort zone that BOX Theory considers ideal. `;
  else if(h>=25) t+=`Promoter holding of ${h}% is below the desirable threshold - limited stake increases risk of decisions misaligned with minority investors. `;
  else t+=`Very low promoter holding of ${h}% suggests founders have largely exited - often a negative signal about long-term confidence in the business. `;
  if(p===0) t+=`Zero promoter pledge is an excellent governance signal - no borrowing against shareholding eliminates forced-selling risk during downturns. `;
  else if(p<10) t+=`Promoter pledge of ${p}% is low and manageable - limited quantum does not meaningfully threaten governance stability. `;
  else if(p<25) t+=`Promoter pledge of ${p}% is a yellow flag - a meaningful portion is hypothecated, creating forced-selling risk if the stock price falls sharply. `;
  else t+=`High promoter pledge of ${p}% is a serious governance red flag - creates potential death-spiral risk where falling prices trigger margin calls and more selling. `;
  if(score>=8) t+=`${d.companyName} demonstrates a strong governance composition profile giving long-term investors meaningful comfort about promoter-shareholder alignment. `;
  else if(score>=6) t+=`The Composition profile is acceptable but has clear room for improvement in promoter commitment or pledge reduction. `;
  else t+=`The Composition score is below BOX Theory standards and is a genuine risk factor that must be actively monitored. `;
  t+=`Governance quality is non-negotiable in BOX Theory - clean ownership structures consistently outperform over long holding periods.`;
  const imp=score<6?`To improve Composition, promoters should increase their holding towards 50-70% and reduce pledged shares to below 5% or zero. Releasing pledged shares signals financial confidence and removes the systemic forced-selling risk. Transparent, consistent communication about governance and capital allocation also builds the institutional trust long-term investors require.`:null;
  return {score,reasoning:t,improvementNote:imp};
}

function scoreCapacity(d) {
  const cagr=Number(d.revenueGrowth)||0, util=Number(d.capacityUtilisation)||0,
        mc=Number(d.marketCap)||0, rev=Number(d.revenue)||1;
  let cP=cagr>=25?4:cagr>=20?3.5:cagr>=15?3:cagr>=10?2:cagr>=5?1:cagr>0?0.5:0;
  let uP=util>=70&&util<=85?4:util>85&&util<=90?3.5:util>90&&util<=95?3:util>95?2.5:util>=60?3:util>=50?2:util>=40?1.5:0.5;
  const ps=mc/rev;
  let pP=ps>=0.5&&ps<=1.5?2:ps<0.5?1.5:ps<=3?1.5:ps<=7?1:ps<=15?0.5:0;
  const score=Math.min(10,Math.round(cP+uP+pP));
  let t=`Capacity measures how much growth bandwidth ${d.companyName} possesses - through revenue trajectory, operational headroom, and valuation versus fundamentals. `;
  if(cagr>=20) t+=`A 3-year revenue CAGR of ${cagr}% is outstanding - among elite growth compounders in the Indian market, sustaining expansion few businesses maintain over time. `;
  else if(cagr>=15) t+=`Revenue CAGR of ${cagr}% over three years is strong, comfortably above the 15% BOX Theory benchmark signalling consistent market share gains. `;
  else if(cagr>=10) t+=`Revenue CAGR of ${cagr}% is moderate - growing but at a pace that may not fully compensate for valuation risks without parallel margin improvement. `;
  else if(cagr>=5) t+=`Revenue CAGR of ${cagr}% falls below the 15% BOX Theory ideal, reflecting relatively slow top-line growth. `;
  else t+=`Revenue CAGR of ${cagr}% or below signals that top-line growth has largely stagnated - a critical Capacity concern that demands management accountability. `;
  if(util>=70&&util<=85) t+=`Capacity utilisation of ${util}% is in the ideal 70-85% range - efficient operations with headroom to absorb volume growth without immediate capex pressure. `;
  else if(util>85) t+=`Capacity utilisation of ${util}% is high - near-full operation means future growth will require significant capital investment. `;
  else if(util>=60) t+=`Capacity utilisation of ${util}% is moderate - headroom exists but idle capacity weighs on fixed-cost absorption and margins. `;
  else t+=`Low capacity utilisation of ${util}% suggests either a demand shortfall or over-investment relative to current market conditions. `;
  const psF=ps.toFixed(1);
  if(ps<=3) t+=`Market Cap-to-Revenue of ${psF}x is attractive, suggesting meaningful re-rating potential as growth materialises.`;
  else if(ps<=7) t+=`Market Cap-to-Revenue of ${psF}x reflects a market already pricing in fair growth - returns depend on sustaining or exceeding the trajectory.`;
  else t+=`Market Cap-to-Revenue of ${psF}x is elevated - investors are paying a premium with limited margin of safety if execution stumbles.`;
  const imp=score<6?`To improve Capacity, ${d.companyName} needs to accelerate revenue CAGR towards 15%+ through market expansion or new product launches. Bringing capacity utilisation into the 70-85% sweet spot through demand generation or operational right-sizing would also contribute. Track quarterly revenue growth as the primary leading indicator for this dimension.`:null;
  return {score,reasoning:t,improvementNote:imp};
}

function runScoringEngine(d) {
  const size=scoreSize(d), usefulness=scoreUsefulness(d), strength=scoreStrength(d),
        versatility=scoreVersatility(d), composition=scoreComposition(d), capacity=scoreCapacity(d);
  const dims={size,usefulness,strength,versatility,composition,capacity};
  const total=size.score+usefulness.score+strength.score+versatility.score+composition.score+capacity.score;
  const grade=total>=50?'Elite Box':total>=40?'Strong Box':total>=30?'Average Box':total>=20?'Weak Box':'Poor Box';
  const lbl={size:'Size',usefulness:'Usefulness',strength:'Strength',versatility:'Versatility',composition:'Composition',capacity:'Capacity'};
  const sorted=Object.entries(dims).map(([k,v])=>[k,v.score]).sort((a,b)=>b[1]-a[1]);
  const strongest=sorted[0], weakest=sorted[sorted.length-1];
  const weakDims=Object.entries(dims).filter(([,v])=>v.score<6).map(([k])=>lbl[k]);

  // Investment Summary
  let summary=`${d.companyName} scores ${total}/60 under the BOX Theory framework, earning a "${grade}" classification. `;
  summary+=`The company's strongest dimension is ${lbl[strongest[0]]} (${strongest[1]}/10), while ${lbl[weakest[0]]} (${weakest[1]}/10) is the most significant area for improvement. `;
  if(grade==='Elite Box'){summary+=`An Elite Box classification means this company meets the gold standard across virtually all six dimensions - a rare achievement that characterises dominant, profitable, well-governed businesses with strong growth. Companies at this level are typically suitable as core, long-term portfolio holdings for investors with a 3-5 year horizon. The risk of permanent capital loss is low, though short-term volatility remains normal even for Elite Box businesses. `;}
  else if(grade==='Strong Box'){summary+=`A Strong Box classification indicates a high-quality business performing well across most dimensions, with one or two areas that need strengthening before reaching elite status. Such companies suit investors comfortable with moderate holding periods who can track the improvement journey. The upside lies in a potential upgrade to Elite Box as weaker dimensions improve. `;}
  else if(grade==='Average Box'){summary+=`An Average Box score reflects a mix of good and weak dimensions - not a standout performer but not fundamentally broken either. Investors should treat this as a watchlist company, monitoring for concrete improvements before deploying meaningful capital. Patience and the right entry point can still produce rewarding returns. `;}
  else if(grade==='Weak Box'){summary+=`A Weak Box classification highlights multiple structural weaknesses - a higher-risk investment requiring significant caution. Disciplined investors should wait for meaningful improvement in at least 2-3 dimensions before considering entry. If already invested, review the thesis and set clear quantitative exit criteria. `;}
  else{summary+=`A Poor Box score is a strong caution signal - the company falls short on most BOX Theory criteria with substantial risk of capital impairment. Only investors with very high risk tolerance and a documented turnaround thesis should consider any exposure. Improvement in at least three dimensions is the minimum bar before upgrading the view. `;}
  summary+=`Key metrics to monitor: revenue CAGR, ROCE trajectory, promoter pledge changes, and capacity utilisation - the leading indicators most likely to shift the BOX Theory score in future re-analyses.`;

  // Investor Guidance - no nested template literals to avoid HTML script-parser issues
  let guidance='';
  const weakDimStr = weakDims.join(', ');
  if(grade==='Elite Box'){
    guidance = d.companyName+' is a BOX Theory Elite candidate - long-term investors (3-5 year horizon) can consider accumulating on dips using a systematic investment methodology. '
      +'This stock deserves to form a core part of a quality equity portfolio, with a suggested allocation of 5-10% for high-conviction investors. '
      +'Watch for deterioration in promoter pledge, a sustained ROCE drop below 15%, or revenue growth decelerating below 10% - early warning signals to re-evaluate the thesis. '
      +'Re-analyse the BOX Theory score annually - even elite companies can fall in classification if fundamentals weaken.';
  } else if(grade==='Strong Box'){
    const wk = weakDims.length
      ? 'Improving the weaker dimension(s) - particularly '+weakDimStr+' - would be the specific catalyst to elevate this to Elite Box status.'
      : 'Sustaining current strong performance across all dimensions will be the key to earning Elite Box status at the next re-analysis.';
    guidance = d.companyName+' qualifies as a strong investment candidate - consider staged entry over 3-6 months to manage timing risk. '
      +wk+' Monitor quarterly results closely and consider adding on any 15-20% corrections without fundamental deterioration. '
      +'A portfolio weight of 4-7% is appropriate for long-term quality-focused investors.';
  } else if(grade==='Average Box'){
    const wk = weakDims.length
      ? 'Track improvements in '+weakDimStr+' - these are the swing factors that could upgrade this to a Strong Box investment.'
      : 'Focus on whether the business can show incremental improvement across multiple dimensions over the next 2-4 quarters.';
    guidance = d.companyName+' sits in the "monitor and wait" zone - enough positives to track, but insufficient conviction to deploy significant capital now. '
      +wk+' If you do invest, keep position size small (1-3% of portfolio) and use pre-defined exit levels. '
      +'Re-run the BOX Theory analysis after each quarterly result - a single strong quarter can quickly change the investment case.';
  } else if(grade==='Weak Box'){
    const wk = weakDims.length
      ? 'Minimum conditions for reconsidering entry: improvements in '+weakDims.slice(0,3).join(', ')+' to above 6/10 for two consecutive analyses.'
      : 'Set clear quantitative triggers - ROCE above 12% and revenue CAGR above 10% for two consecutive years - before re-entering.';
    guidance = d.companyName+' is a Weak Box company - BOX Theory discipline suggests avoiding significant capital deployment until fundamentals improve materially. '
      +'If already holding, reassess whether the original thesis holds - Weak Box scores often reflect structural challenges, not temporary setbacks. '
      +wk+' A token speculative position (1-2% max) with a clear exit trigger is the most disciplined approach if you must hold.';
  } else {
    guidance = d.companyName+' earns a Poor Box classification and should generally be avoided under BOX Theory investment discipline. '
      +'The multiple weak dimensions suggest fundamental problems - business model, governance, scale, or growth - any of which can permanently impair investor capital. '
      +'Only investors with very high risk tolerance, deep industry expertise, and a specific turnaround thesis should consider a small speculative position. '
      +'A minimum of three dimensions crossing 6/10 in consecutive quarterly analyses is required before upgrading the view even to watchlist status.';
  }

  return {
    dimensions:{
      size:{score:size.score,reasoning:size.reasoning,improvementNote:size.improvementNote},
      usefulness:{score:usefulness.score,reasoning:usefulness.reasoning,improvementNote:usefulness.improvementNote},
      strength:{score:strength.score,reasoning:strength.reasoning,improvementNote:strength.improvementNote},
      versatility:{score:versatility.score,reasoning:versatility.reasoning,improvementNote:versatility.improvementNote},
      composition:{score:composition.score,reasoning:composition.reasoning,improvementNote:composition.improvementNote},
      capacity:{score:capacity.score,reasoning:capacity.reasoning,improvementNote:capacity.improvementNote},
    },
    totalScore:total, grade, investmentSummary:summary, investorGuidance:guidance
  };
}

function _n(v) { const n = parseFloat(v); return (isNaN(n) || v === null || v === undefined) ? 0 : n; }
function _s(v) { return (v === null || v === undefined) ? '' : String(v); }

function mapScreenerData(item, manual) {
  const p  = item.profile  || {};
  const r  = item.ratios   || {};
  const is = item.income   || [];
  const cf = item.cashflow || {};

  const CRORE = 1e7;

  // Revenue CAGR from annual income statements (most-recent first)
  let revenueGrowth = 0;
  if (is.length >= 2) {
    const r0 = _n(is[0]?.revenue);
    const rN = _n(is[is.length - 1]?.revenue);
    if (r0 > 0 && rN > 0) {
      const yrs = is.length - 1;
      revenueGrowth = parseFloat(((Math.pow(r0 / rN, 1 / yrs) - 1) * 100).toFixed(2));
    }
  }

  // EBITDA margin from TTM ratios; fall back to latest income statement
  let ebitdaMargin = _n(r.ebitdaMarginTTM) * 100;
  if (!ebitdaMargin && is[0]) {
    const eb = _n(is[0].ebitda), rv = _n(is[0].revenue);
    if (eb && rv) ebitdaMargin = parseFloat((eb / rv * 100).toFixed(2));
  }

  const mapped = {
    companyName:         _s(p.companyName || ''),
    industry:            _s(p.sector      || p.industry || ''),
    stockPrice:          _n(p.price),
    marketCap:           _n(p.mktCap)                          / CRORE,
    revenue:             _n(is[0]?.revenue)                    / CRORE,
    netProfit:           _n(is[0]?.netIncome)                  / CRORE,
    roce:                _n(r.returnOnCapitalEmployedTTM)       * 100,
    roe:                 _n(r.returnOnEquityTTM)                * 100,
    debtToEquity:        _n(r.debtEquityRatioTTM),
    interestCoverage:    _n(r.interestCoverageTTM),
    ebitdaMargin,
    operatingCashFlow:   _n(cf.operatingCashFlow)              / CRORE,
    revenueGrowth,
    promoterHolding:     null,   // not available from Yahoo Finance
    promoterPledge:      0,
    geographies:         1,
    capacityUtilisation: 50,
    businessDescription: _s(p.description || '')
  };

  const geo  = (manual.geographies || '').toString().trim();
  const cap  = (manual.capacityUtilisation || '').toString().trim();
  const desc = (manual.businessDescription || '').trim();
  if (geo  !== '') mapped.geographies        = _n(geo)  || 1;
  if (cap  !== '') mapped.capacityUtilisation = _n(cap)  || 50;
  if (desc !== '') mapped.businessDescription = desc;

  return mapped;
}
