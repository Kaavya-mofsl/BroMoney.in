// ════════════════════════════════════════════════════════════════════════════
//  API — WORKER_URL + fetchScreenerData
// ════════════════════════════════════════════════════════════════════════════

// ── Data fetch via Cloudflare Worker proxy ────────────────
// Local dev: python3 local_server.py  →  uses /proxy on the same origin
// Production (GitHub Pages): uses the deployed Cloudflare Worker
const WORKER_URL = (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
)
  ? `${window.location.protocol}//${window.location.host}/proxy`
  : 'https://box-theory-proxy.plain-frost-a262.workers.dev';

async function fetchScreenerData(symbol) {
  let res, data;
  try {
    res  = await fetch(`${WORKER_URL}/?symbol=${encodeURIComponent(symbol)}`);
    data = await res.json();
  } catch (e) {
    throw new Error('Network error fetching "' + symbol + '". Check your connection.');
  }

  if (!res.ok || data.error) {
    const msg = data?.error || ('HTTP ' + res.status);
    throw new Error(msg.includes('not found') ? msg : 'Could not fetch "' + symbol + '": ' + msg);
  }

  if (!data.profile?.companyName && !data.profile?.symbol)
    throw new Error('"' + symbol + '" not found. Check the NSE ticker (e.g. RELIANCE, TCS, HDFCBANK).');

  console.log('Worker [' + symbol + ']:', JSON.stringify(data.profile).substring(0, 200));
  return data;
}
