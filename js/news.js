// ════════════════════════════════════════════════════════════════════════════
//  NEWS — all news fetch/render functions + esc helper
// ════════════════════════════════════════════════════════════════════════════

var newsLoaded = false;

function initNewsView() {
  if (newsLoaded) return;
  newsLoaded = true;

  fetchMarketRecap();
  fetchHeadlines();
  fetchIPOData();
  fetchMacroData();
  fetchFIIDIIData();
  fetchBulkDealsData();
  fetchPolicyData();
}

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function stripCDATA(str) {
  return String(str || '').replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1').trim();
}

function fetchHeadlines() {
  var container = document.getElementById('news-headlines');
  if (!container) return;

  fetch(WORKER_URL + '/?action=news')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var placeholder = container.querySelector('.news-placeholder');
      if (placeholder) placeholder.remove();

      var items = (data.items || []).filter(function(x) { return x.title && x.link; }).slice(0, 7);

      if (!items.length) {
        container.insertAdjacentHTML('beforeend',
          '<div class="news-error-state"><span class="material-symbols-outlined">info</span>No headlines available right now.</div>');
        return;
      }

      var list = document.createElement('div');
      list.className = 'news-feed-list';

      items.forEach(function(item) {
        var timeStr = '';
        if (item.pubDate) {
          try {
            var d = new Date(item.pubDate);
            if (!isNaN(d.getTime())) {
              var diffMs   = Date.now() - d.getTime();
              var diffMins = Math.floor(diffMs / 60000);
              if      (diffMins < 1)  timeStr = 'just now';
              else if (diffMins < 60) timeStr = diffMins + 'm ago';
              else {
                var diffHrs = Math.floor(diffMins / 60);
                if (diffHrs < 24) timeStr = diffHrs + 'h ago';
                else timeStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
              }
            }
          } catch(e) {}
        }

        var el = document.createElement('div');
        el.className = 'news-headline-item';
        el.innerHTML =
          '<div class="news-headline-meta">' +
            '<span class="news-source-badge">' + esc(item.source) + '</span>' +
            (timeStr ? '<span class="news-time">' + esc(timeStr) + '</span>' : '') +
          '</div>' +
          '<a class="news-headline-link" href="' + esc(item.link) + '" target="_blank" rel="noopener noreferrer">' +
            esc(stripCDATA(item.title)) +
          '</a>';
        list.appendChild(el);
      });

      container.appendChild(list);
    })
    .catch(function() {
      var placeholder = container.querySelector('.news-placeholder');
      if (placeholder) {
        placeholder.className = 'news-error-state';
        placeholder.innerHTML = '<span class="material-symbols-outlined">wifi_off</span>Could not load headlines — check connection or try again later.';
      }
    });
}

function fetchMarketRecap() {
  var container = document.getElementById('news-today');
  if (!container) return;

  fetch(WORKER_URL + '/?action=recap')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.error) throw new Error(data.error);

      var placeholder = container.querySelector('.news-placeholder');
      if (placeholder) placeholder.remove();

      var idx = data.indices || {};

      function fmtIdx(v, decimals) {
        if (!v) return '—';
        return v.toLocaleString('en-IN', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });
      }

      function idxTile(label, q) {
        if (!q || !q.price) return '';
        var chg     = q.change   || 0;
        var pct     = q.changePct || 0;
        var dir     = chg > 0 ? 'up' : chg < 0 ? 'down' : 'flat';
        var sign    = chg >= 0 ? '+' : '';
        var chgStr  = sign + fmtIdx(chg, 2) + ' (' + sign + fmtIdx(pct, 2) + '%)';
        var timeStr = '';
        if (q.updatedAt) {
          try {
            var ist = new Date(new Date(q.updatedAt).getTime() + 330 * 60000);
            timeStr = ist.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }) + ' IST';
          } catch(e) {}
        }
        return '<div class="macro-tile">' +
          '<div class="macro-tile-label">' + esc(label) + '</div>' +
          '<div class="macro-tile-value">' + fmtIdx(q.price, 2) + '</div>' +
          '<div class="macro-tile-change ' + dir + '">' + esc(chgStr) + '</div>' +
          '<div class="recap-idx-hl">H&nbsp;' + fmtIdx(q.high, 2) + '&nbsp;&nbsp;L&nbsp;' + fmtIdx(q.low, 2) + '</div>' +
          (timeStr ? '<div class="recap-idx-time">' + esc(timeStr) + '</div>' : '') +
          '</div>';
      }

      var html = '';
      html += '<div class="macro-grid recap-idx-grid">';
      html += idxTile('Nifty 50',   idx.nifty50);
      html += idxTile('Bank Nifty', idx.bankNifty);
      html += idxTile('Sensex',     idx.sensex);
      html += '</div>';

      function moverTable(rows, isGain) {
        if (!rows || !rows.length) return '<p style="font-size:12px;color:var(--text-3)">No data</p>';
        var t = '<table class="recap-table"><thead><tr>' +
          '<th>Symbol</th><th>Price</th><th>Chg %</th>' +
          '</tr></thead><tbody>';
        rows.forEach(function(r) {
          var cls = isGain ? 'recap-gain' : 'recap-lose';
          var sign = r.changePct >= 0 ? '+' : '';
          t += '<tr>' +
            '<td>' + esc(r.symbol) + (r.name ? '<span class="recap-tname">' + esc(r.name.substring(0, 22)) + '</span>' : '') + '</td>' +
            '<td>' + fmtIdx(r.price, 2) + '</td>' +
            '<td class="' + cls + '">' + sign + fmtIdx(r.changePct, 2) + '%</td>' +
            '</tr>';
        });
        t += '</tbody></table>';
        return t;
      }

      html += '<div class="recap-movers-grid">';
      html += '<div class="recap-movers-col">' +
        '<div class="recap-col-head gain">Top Gainers</div>' +
        moverTable(data.gainers, true) +
        '</div>';
      html += '<div class="recap-movers-col">' +
        '<div class="recap-col-head lose">Top Losers</div>' +
        moverTable(data.losers, false) +
        '</div>';
      html += '</div>';
      html += '<p class="recap-source">Source: Yahoo Finance · 15-min delayed · NSE-listed equities</p>';

      container.insertAdjacentHTML('beforeend', html);
    })
    .catch(function() {
      var placeholder = container.querySelector('.news-placeholder');
      if (placeholder) {
        placeholder.className = 'news-error-state';
        placeholder.innerHTML = '<span class="material-symbols-outlined">wifi_off</span>Market recap unavailable — check connection or try again later.';
      }
    });
}

function fetchIPOData() {
  var container = document.getElementById('news-ipo');
  if (!container) return;

  fetch(WORKER_URL + '/?action=ipo')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var placeholder = container.querySelector('.news-placeholder');
      if (placeholder) placeholder.remove();

      var calendar = data.calendar || [];
      var gmpList  = data.gmp     || [];

      if (!calendar.length && !gmpList.length) throw new Error('empty');

      // ── Status badge ────────────────────────────────────────────────
      function statusBadge(s) {
        var raw = (s || '').toLowerCase();
        var cls = 'ipo-badge ';
        if      (raw.indexOf('open')     === 0) cls += 'ipo-badge-open';
        else if (raw.indexOf('upcoming') === 0) cls += 'ipo-badge-upcoming';
        else if (raw.indexOf('allot')    === 0) cls += 'ipo-badge-allotted';
        else if (raw.indexOf('listed')   === 0) cls += 'ipo-badge-listed';
        else cls += 'ipo-badge-closed';
        return s ? '<span class="' + cls + '">' + esc(s) + '</span>' : '';
      }

      // ── Sort: Open first, Upcoming next, rest last ──────────────────
      function statusRank(s) {
        var r = (s || '').toLowerCase();
        if (r.indexOf('open')     === 0) return 0;
        if (r.indexOf('upcoming') === 0) return 1;
        if (r.indexOf('allot')    === 0) return 2;
        return 3;
      }

      var calSorted = calendar.slice().sort(function(a, b) {
        return statusRank(a.status) - statusRank(b.status);
      }).slice(0, 10);
      var gmpSorted = gmpList.slice().sort(function(a, b) {
        return statusRank(a.status) - statusRank(b.status);
      }).slice(0, 10);

      var html = '';

      // ── Calendar table ───────────────────────────────────────────────
      if (calSorted.length) {
        html += '<p class="ipo-sub-label">IPO Calendar</p>';
        html += '<p class="ipo-count">' + calSorted.length + ' IPOs this month</p>';
        html += '<div class="ipo-scroll"><table class="ipo-cal-table">';
        html += '<thead><tr>' +
          '<th>Company</th><th>Opens</th><th>Closes</th>' +
          '<th>Allotment</th><th>Listing</th><th>Status</th>' +
          '</tr></thead><tbody>';
        calSorted.forEach(function(r) {
          html += '<tr>' +
            '<td><span class="ipo-company">' + esc(r.company) + '</span>' +
              (r.type ? '<br><span class="ipo-type-tag">' + esc(r.type) + '</span>' : '') +
            '</td>' +
            '<td>' + esc(r.opens)     + '</td>' +
            '<td>' + esc(r.closes)    + '</td>' +
            '<td>' + esc(r.allotment) + '</td>' +
            '<td>' + esc(r.listing)   + '</td>' +
            '<td>' + statusBadge(r.status) + '</td>' +
            '</tr>';
        });
        html += '</tbody></table></div>';
      }

      // ── GMP table ────────────────────────────────────────────────────
      if (gmpSorted.length) {
        html += '<div class="ipo-disclaimer">' +
          '<span class="material-symbols-outlined">warning</span>' +
          '<p><strong>Grey market data is unofficial.</strong> GMP figures are sourced from grey market operators — they are not regulated, not guaranteed, and do not predict actual listing prices. Use for reference only.</p>' +
          '</div>';

        html += '<p class="ipo-sub-label">Grey Market Premium (GMP)</p>';
        html += '<div class="ipo-scroll"><table class="ipo-gmp-table">';
        html += '<thead><tr>' +
          '<th>Company</th><th>Issue Price</th><th>GMP</th>' +
          '<th>Est. Listing</th><th>Opens</th><th>Closes</th>' +
          '<th>Subscribed</th><th>Status</th>' +
          '</tr></thead><tbody>';

        gmpSorted.forEach(function(r) {
          // GMP display
          var gmpStr = '—', gmpCls = 'ipo-gmp-zero';
          if (r.gmp !== null) {
            var sign = r.gmp > 0 ? '+' : '';
            var pct  = r.gmpPct !== null
              ? ' (' + (r.gmpPct >= 0 ? '+' : '') + r.gmpPct.toFixed(1) + '%)'
              : '';
            gmpStr = sign + '₹' + r.gmp.toFixed(2) + pct;
            gmpCls = r.gmp > 0 ? 'ipo-gmp-pos' : r.gmp < 0 ? 'ipo-gmp-neg' : 'ipo-gmp-zero';
          }

          var issueStr = r.issuePrice ? '₹' + r.issuePrice.toLocaleString('en-IN') : (r.priceBand !== '—' ? r.priceBand : '—');
          var estStr   = (r.estListing && r.estListing > 0)
            ? '₹' + r.estListing.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '—';

          html += '<tr>' +
            '<td><span class="ipo-company">' + esc(r.company) + '</span></td>' +
            '<td>' + esc(issueStr) + '</td>' +
            '<td class="' + gmpCls + '">' + esc(gmpStr) + '</td>' +
            '<td>' + esc(estStr) + '</td>' +
            '<td>' + esc(r.opens)  + '</td>' +
            '<td>' + esc(r.closes) + '</td>' +
            '<td>' + esc(r.subscription) + '</td>' +
            '<td>' + statusBadge(r.status) + '</td>' +
            '</tr>';
        });

        html += '</tbody></table></div>';
      }

      html += '<p class="ipo-source">Calendar &amp; GMP: ipocracker.com · GMP is unofficial grey market data · Updated multiple times daily</p>';

      container.insertAdjacentHTML('beforeend', html);
    })
    .catch(function() {
      var placeholder = container.querySelector('.news-placeholder');
      if (placeholder) {
        placeholder.className = 'news-error-state';
        placeholder.innerHTML = '<span class="material-symbols-outlined">wifi_off</span>IPO data unavailable — try again later.';
      }
    });
}

function fetchMacroData() {
  var container = document.getElementById('news-macro');
  if (!container) return;

  fetch(WORKER_URL + '/?action=macro')
    .then(function(res) { return res.json(); })
    .then(function(d) {
      if (d.error) throw new Error(d.error);

      var tiles = [
        { key: 'usdinr', label: 'USD / INR',    prefix: '₹',  suffix: '',     decimals: 2 },
        { key: 'brent',  label: 'Brent Crude',  prefix: '$',  suffix: ' /bbl', decimals: 2 },
        { key: 'sp500',  label: 'S&amp;P 500',  prefix: '',   suffix: '',     decimals: 2 },
        { key: 'nasdaq', label: 'Nasdaq',        prefix: '',   suffix: '',     decimals: 2 },
      ];

      var gridHTML = '<div class="macro-grid">';
      tiles.forEach(function(t) {
        var q = d[t.key] || {};
        if (!q.price) return;

        var val     = q.price.toLocaleString('en-IN', { minimumFractionDigits: t.decimals, maximumFractionDigits: t.decimals });
        var chg     = q.change   || 0;
        var chgPct  = q.changePct || 0;
        var dir     = chg > 0 ? 'up' : chg < 0 ? 'down' : 'flat';
        var sign    = chg >= 0 ? '+' : '';
        var chgStr  = sign + chg.toFixed(2) + ' (' + sign + chgPct.toFixed(2) + '%)';

        var timeStr = '';
        if (q.updatedAt) {
          try {
            var utc = new Date(q.updatedAt);
            // IST = UTC + 5:30
            var ist = new Date(utc.getTime() + 330 * 60000);
            timeStr = ist.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST';
          } catch(e) {}
        }

        gridHTML +=
          '<div class="macro-tile">' +
            '<div class="macro-tile-label">' + t.label + '</div>' +
            '<div class="macro-tile-value">' + t.prefix + val + t.suffix + '</div>' +
            '<div class="macro-tile-change ' + dir + '">' + chgStr + '</div>' +
            (timeStr ? '<div class="macro-tile-time">' + esc(timeStr) + '</div>' : '') +
          '</div>';
      });
      gridHTML += '</div>';
      gridHTML += '<p class="macro-note">Prices from Yahoo Finance · delayed · USD unless noted</p>';

      var placeholder = container.querySelector('.news-placeholder');
      if (placeholder) placeholder.remove();
      container.insertAdjacentHTML('beforeend', gridHTML);
    })
    .catch(function() {
      var placeholder = container.querySelector('.news-placeholder');
      if (placeholder) {
        placeholder.className = 'news-error-state';
        placeholder.innerHTML = '<span class="material-symbols-outlined">wifi_off</span>Could not load macro data — try again later.';
      }
    });
}

function fetchBulkDealsData() {
  var container = document.getElementById('news-bulkdeals');
  if (!container) return;

  fetch(WORKER_URL + '/?action=bulkdeals')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var deals = data.deals || [];
      if (!deals.length) throw new Error('empty');

      var placeholder = container.querySelector('.news-placeholder');
      if (placeholder) placeholder.remove();

      // Wrap for stable re-render on sort
      var wrap = document.createElement('div');
      wrap.className = 'bd-wrap';
      container.appendChild(wrap);

      var sortCol = 'date';
      var sortAsc = false;

      // Parse "16-May-2026" → ms for date comparison
      function parseDate(s) {
        var mo = {JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
        var p = String(s||'').toUpperCase().split('-');
        return p.length < 3 ? 0 : new Date(+p[2], mo[p[1]]||0, +p[0]).getTime();
      }

      function fmtQty(n) {
        if (!n) return '—';
        return n.toLocaleString('en-IN');
      }
      function fmtPrice(n) {
        if (!n) return '—';
        return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }

      var cols = [
        { key:'date',    label:'Date',    num:false },
        { key:'symbol',  label:'Symbol',  num:false },
        { key:'client',  label:'Client',  num:false },
        { key:'side',    label:'B / S',   num:false },
        { key:'qty',     label:'Qty',     num:true  },
        { key:'price',   label:'Price',   num:true  },
        { key:'type',    label:'Type',    num:false },
      ];

      function render() {
        var sorted = deals.slice().sort(function(a, b) {
          var va = a[sortCol], vb = b[sortCol];
          if (sortCol === 'date') { va = parseDate(va); vb = parseDate(vb); }
          var cmp = (typeof va === 'number' && typeof vb === 'number')
            ? (va - vb)
            : String(va).localeCompare(String(vb));
          return sortAsc ? cmp : -cmp;
        });

        var h = '<p class="bd-count">' + sorted.length + ' deals &nbsp;·&nbsp; last 7 days</p>';
        h += '<div class="bd-scroll"><table class="bd-table"><thead><tr>';

        cols.forEach(function(c) {
          var cls = c.key === sortCol ? (sortAsc ? ' sort-asc' : ' sort-desc') : '';
          h += '<th class="' + cls + '" data-col="' + c.key + '">' + c.label + '</th>';
        });
        h += '</tr></thead><tbody>';

        sorted.forEach(function(d) {
          var sideCls = d.side === 'BUY' || d.side === 'B' ? 'bd-buy' : 'bd-sell';
          var sideLabel = d.side === 'BUY' || d.side === 'B' ? 'BUY' : 'SELL';
          var typeBadge = d.type === 'Bulk'
            ? '<span class="bd-badge bd-badge-bulk">Bulk</span>'
            : '<span class="bd-badge bd-badge-block">Block</span>';
          h += '<tr>' +
            '<td>' + esc(d.date) + '</td>' +
            '<td>' + esc(d.symbol) + '</td>' +
            '<td class="bd-client">' + esc(d.client) + '</td>' +
            '<td class="' + sideCls + '">' + sideLabel + '</td>' +
            '<td>' + fmtQty(d.qty) + '</td>' +
            '<td>' + fmtPrice(d.price) + '</td>' +
            '<td>' + typeBadge + '</td>' +
            '</tr>';
        });

        h += '</tbody></table></div>';
        h += '<p class="bd-source">Source: NSE India · Cash Market · Last 7 calendar days</p>';

        wrap.innerHTML = h;

        // Attach sort listeners after render
        wrap.querySelectorAll('th[data-col]').forEach(function(th) {
          th.addEventListener('click', function() {
            var col = th.dataset.col;
            if (sortCol === col) { sortAsc = !sortAsc; }
            else { sortCol = col; sortAsc = col === 'symbol' || col === 'client'; }
            render();
          });
        });
      }

      render();
    })
    .catch(function() {
      var placeholder = container.querySelector('.news-placeholder');
      if (placeholder) {
        placeholder.className = 'news-error-state';
        placeholder.innerHTML = '<span class="material-symbols-outlined">wifi_off</span>' +
          'Bulk/block deal data unavailable — NSE may be updating. Try after market hours.';
      }
    });
}

function fetchFIIDIIData() {
  var container = document.getElementById('news-fiidii');
  if (!container) return;

  fetch(WORKER_URL + '/?action=fiidii')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var rows = data.rows || [];
      if (!rows.length) throw new Error('empty');

      function fmtCr(n) {
        if (n == null) return '—';
        return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }

      var date = rows[0].date || '';
      var html = '';
      if (date) html += '<p class="fiidii-date">As of ' + esc(date) + ' &nbsp;·&nbsp; Cash Market &nbsp;·&nbsp; ₹ Crore</p>';

      html += '<table class="fiidii-table"><thead><tr>' +
        '<th>Category</th><th>Buy</th><th>Sell</th><th>Net</th>' +
        '</tr></thead><tbody>';

      rows.forEach(function(row) {
        var netCls  = row.net > 0 ? 'fiidii-net-pos' : row.net < 0 ? 'fiidii-net-neg' : '';
        var netSign = row.net > 0 ? '+' : '';
        html += '<tr>' +
          '<td>' + esc(row.category) + '</td>' +
          '<td>' + fmtCr(row.buy)  + '</td>' +
          '<td>' + fmtCr(row.sell) + '</td>' +
          '<td class="' + netCls + '">' + (row.net !== null ? netSign + fmtCr(row.net) : '—') + '</td>' +
          '</tr>';
      });

      html += '</tbody></table>';
      html += '<p class="fiidii-source">Source: NSE India · Provisional · Updated after market close</p>';

      var placeholder = container.querySelector('.news-placeholder');
      if (placeholder) placeholder.remove();
      container.insertAdjacentHTML('beforeend', html);
    })
    .catch(function() {
      var placeholder = container.querySelector('.news-placeholder');
      if (placeholder) {
        placeholder.className = 'news-error-state';
        placeholder.innerHTML = '<span class="material-symbols-outlined">wifi_off</span>' +
          'FII/DII data unavailable — NSE may be updating. Check back after 7 PM IST.';
      }
    });
}

function fetchPolicyData() {
  var container = document.getElementById('news-policy');
  if (!container) return;

  fetch(WORKER_URL + '/?action=policy')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var placeholder = container.querySelector('.news-placeholder');
      if (placeholder) placeholder.remove();

      var items = (data.items || []).filter(function(x) { return x.original_link; });

      if (!items.length) {
        container.insertAdjacentHTML('beforeend',
          '<div class="news-error-state"><span class="material-symbols-outlined">info</span>No policy updates available right now.</div>');
        return;
      }

      var list = document.createElement('div');
      list.className = 'policy-list';

      items.forEach(function(item) {
        var dateStr = '';
        if (item.date) {
          try {
            var d = new Date(item.date);
            if (!isNaN(d.getTime())) {
              dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            }
          } catch(e) {}
        }

        var src    = (item.source || '').toUpperCase();
        var bdgCls = src === 'RBI' ? 'policy-badge policy-badge-rbi' : 'policy-badge policy-badge-sebi';

        var card = document.createElement('div');
        card.className = 'policy-card';
        card.innerHTML =
          '<div class="policy-card-meta">' +
            '<span class="' + bdgCls + '">' + esc(src) + '</span>' +
            (dateStr ? '<span class="policy-card-date">' + esc(dateStr) + '</span>' : '') +
          '</div>' +
          '<p class="policy-card-original">' + esc(item.title) + '</p>' +
          '<p class="policy-card-summary">' + esc(item.simplified_summary) + '</p>' +
          '<div class="policy-card-footer">' +
            '<a class="policy-card-link" href="' + esc(item.original_link) + '" target="_blank" rel="noopener noreferrer">' +
              'Read official circular →' +
            '</a>' +
            '<span class="policy-ai-label">Simplified by AI for retail investors. Read the official circular for full details.</span>' +
          '</div>';

        list.appendChild(card);
      });

      container.appendChild(list);
    })
    .catch(function() {
      var placeholder = container.querySelector('.news-placeholder');
      if (placeholder) {
        placeholder.className = 'news-error-state';
        placeholder.innerHTML = '<span class="material-symbols-outlined">wifi_off</span>Policy updates unavailable — check connection or try again later.';
      }
    });
}
