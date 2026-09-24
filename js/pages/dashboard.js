/* dashboard.js — operational overview dashboard */
'use strict';

window.Pages = window.Pages || {};

Pages.dashboard = function(query) {
  const content = Utils.el('page-content');
  const today = Utils.today();

  /* ── Data gathering ───────────────────────────────────── */
  const people = Storage.getCollection(Storage.KEYS.PEOPLE);
  const pMap = Object.fromEntries(people.map(p => [p.id, p]));

  const allPrisoners = Storage.getCollection(Storage.KEYS.PRISONER_FILES);
  const activePrisoners = allPrisoners.filter(p => p.status === 'active');

  const mashlatAll = Storage.getCollection(Storage.KEYS.MASHLAT_COORDINATIONS);
  const mashlatToday = mashlatAll.filter(c => c.coordinationDate === today);
  const mashlatTodayActive = mashlatToday.filter(c => ['today','coordinated','arrived','intake'].includes(c.status));
  const mashlatWaiting   = mashlatToday.filter(c => c.status === 'today' || c.status === 'coordinated');
  const mashlatArrived   = mashlatToday.filter(c => c.status === 'arrived');
  const mashlatIntake    = mashlatToday.filter(c => c.status === 'intake');
  const mashlatNoShow    = mashlatToday.filter(c => c.status === 'no_show');
  const mashlatCompleted = mashlatToday.filter(c => c.status === 'completed');

  const eventReports = Storage.getCollection(Storage.KEYS.EVENT_REPORTS);
  const unresolvedEvents = eventReports.filter(e => e.handlingStatus === 'unresolved');
  const recentEvents = eventReports
    .slice().sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''))
    .slice(0, 5);

  const allTasks = Storage.getCollection(Storage.KEYS.TASKS);
  const todayTasks = allTasks
    .filter(t => t.date === today && ['planned','approved','in_progress'].includes(t.status))
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  const openTasks = allTasks.filter(t => ['planned','approved','in_progress'].includes(t.status));
  const overdueTasks = openTasks.filter(t => t.date < today);

  const countingSessions = Storage.getCollection(Storage.KEYS.COUNTING_SESSIONS);
  const activeSession = countingSessions.find(s => s.status === 'in_progress') || null;
  const countingEntries = activeSession
    ? Storage.getCollection(Storage.KEYS.COUNTING_ENTRIES).filter(e => e.sessionId === activeSession.id)
    : [];

  const notifications = Storage.getCollection(Storage.KEYS.NOTIFICATIONS);
  const criticalNotif = notifications.filter(n => n.type === 'critical' && !n.read);
  const unreadCount = Notifications.getUnreadCount();

  const next7 = Utils.addDays(today, 7);
  const upcomingReleases = activePrisoners
    .filter(p => p.expectedRelease && p.expectedRelease > today && p.expectedRelease <= next7)
    .sort((a, b) => a.expectedRelease.localeCompare(b.expectedRelease));

  const inmateActivities = Storage.getCollection(Storage.KEYS.INMATE_ACTIVITIES);
  const todayActivities = inmateActivities
    .filter(a => a.date === today && a.status !== 'cancelled')
    .sort((a, b) => (a.plannedDeparture || '').localeCompare(b.plannedDeparture || ''));

  const stockMovements = Storage.getCollection(Storage.KEYS.STOCK_MOVEMENTS);
  const pendingStock = stockMovements.filter(m => m.status === 'pending');

  /* ── Derived data ─────────────────────────────────────── */

  /* Prisoner location distribution */
  const locationCounts = {};
  activePrisoners.forEach(p => {
    const loc = p.location || 'לא ידוע';
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  });
  const locationEntries = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);
  const maxLocVal = Math.max(...Object.values(locationCounts), 1);
  const LOC_COLORS = {
    'אגף א׳': '#1a4f8a', 'אגף ב׳': '#1a6b4a', 'אגף ג׳': '#6f42c1',
    'בידוד': '#b7600a', 'קבלה': '#0d9488', 'בית חולים': '#c0392b', 'חוץ כלא': '#6b7280',
  };

  /* Counting breakdown by location */
  const expectedByLoc = {};
  const countedByLoc = {};
  countingEntries.forEach(e => {
    const loc = e.location || '—';
    expectedByLoc[loc] = (expectedByLoc[loc] || 0) + 1;
    if (e.morningCount || e.afternoonCount || e.eveningCount) {
      countedByLoc[loc] = (countedByLoc[loc] || 0) + 1;
    }
  });

  /* Event trend — last 7 days */
  const HEB = ['א','ב','ג','ד','ה','ו','ש'];
  const trendLabels = [], trendVals = [];
  for (let i = 6; i >= 0; i--) {
    const d = Utils.addDays(today, -i);
    const dow = new Date(d + 'T12:00:00').getDay();
    trendLabels.push(i === 0 ? 'היום' : HEB[dow]);
    trendVals.push(eventReports.filter(e => (e.eventDate || (e.createdAt || '').slice(0,10)) === d).length);
  }
  const maxTrendVal = Math.max(...trendVals, 1);

  /* Activities today — group by type */
  const actGroupMap = {};
  todayActivities.forEach(a => {
    const key = a.activityType;
    if (!actGroupMap[key]) {
      actGroupMap[key] = { label: a.activityTypeLabel || a.activityType, count: 0, time: a.plannedDeparture };
    }
    actGroupMap[key].count++;
    if ((a.plannedDeparture || '') < (actGroupMap[key].time || '')) {
      actGroupMap[key].time = a.plannedDeparture;
    }
  });
  const actGroups = Object.values(actGroupMap).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  /* Attention items — priority-sorted */
  const attentionItems = [];
  if (unresolvedEvents.length > 0)
    attentionItems.push({ lvl:'critical', icon:'event',       text:`${unresolvedEvents.length} אירועים לא מטופלים`,          route:'/event-reports',   btn:'לטיפול' });
  if (mashlatNoShow.length > 0)
    attentionItems.push({ lvl:'critical', icon:'alert',       text:`${mashlatNoShow.length} לא התייצבו היום`,               route:'/mashlat',         btn:'פתח משל"ט' });
  if (mashlatWaiting.length > 0)
    attentionItems.push({ lvl:'attention', icon:'coordination',text:`${mashlatWaiting.length} ממתינים להגיע היום`,           route:'/mashlat',         btn:'מעקב' });
  if (overdueTasks.length > 0)
    attentionItems.push({ lvl:'attention', icon:'task',       text:`${overdueTasks.length} משימות באיחור`,                  route:'/tasks',           btn:'פתח' });
  if (activeSession && (activeSession.totalExpected - activeSession.totalCounted) > 0)
    attentionItems.push({ lvl:'attention', icon:'counting',   text:`ספירה פעילה — ${activeSession.totalExpected - activeSession.totalCounted} חסרים`, route:'/counting-report', btn:'המשך ספירה' });
  if (criticalNotif.length > 0)
    attentionItems.push({ lvl:'critical', icon:'bell',        text:`${criticalNotif.length} התראות קריטיות`,                route:'/notifications-center', btn:'צפה' });
  if (pendingStock.length > 0)
    attentionItems.push({ lvl:'attention', icon:'stock',      text:`${pendingStock.length} תנועות מלאי ממתינות לאישור`,     route:'/canteen-stock-movements', btn:'לאישור' });

  /* Alert counts from mashlat — computed from ExternalPersonDataService + MashlatRankingService */
  let severity3Count = 0, severity2Count = 0;
  if (window.ExternalPersonDataService && window.MashlatRankingService) {
    const activeMashlatCoords = mashlatAll.filter(c => ['coordinated','today','arrived','intake'].includes(c.status));
    activeMashlatCoords.forEach(function(c) {
      const indicators = ExternalPersonDataService.getPersonIndicators(c.personId);
      const rankResult = MashlatRankingService.calculate(indicators);
      if (rankResult.level >= 3) severity3Count++;
      else if (rankResult.level === 2) severity2Count++;
    });
  }
  if (severity3Count > 0)
    attentionItems.push({ lvl:'critical',   icon:'alert', text:`${severity3Count} תיאומים עם חיווי מדרג 3`, route:'/mashlat', btn:'פתח משל"ט' });
  if (severity2Count > 0)
    attentionItems.push({ lvl:'attention',  icon:'alert', text:`${severity2Count} תיאומים עם חיווי מדרג 2`, route:'/mashlat', btn:'פתח משל"ט' });

  /* ── Chart helpers ────────────────────────────────────── */

  function donut(segments, centerNum, centerSub) {
    const total = segments.reduce((s, x) => s + x.val, 0);
    if (total === 0) return `<div class="dash-donut-wrap"><div style="text-align:center;color:var(--color-text-muted);font-size:13px;padding:20px">אין תיאומים להיום</div></div>`;

    const R = 50, sw = 18, cx = 70, cy = 70;
    const C = 2 * Math.PI * R;
    let arcs = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--color-divider)" stroke-width="${sw}"/>`;
    let accum = 0;
    segments.filter(s => s.val > 0).forEach(seg => {
      const pct = seg.val / total;
      const arc = pct * C;
      const gap = C - arc;
      const offset = -(accum * C);
      arcs += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${seg.color}" stroke-width="${sw}" stroke-dasharray="${arc.toFixed(2)} ${gap.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90,${cx},${cy})"/>`;
      accum += pct;
    });

    const legendHtml = segments.filter(s => s.val > 0).map(s => `
      <div class="dash-legend-item">
        <span class="dash-legend-dot" style="background:${s.color}"></span>
        <span class="dash-legend-lbl">${Utils.escHtml(s.label)}</span>
        <span class="dash-legend-val">${s.val}</span>
      </div>`).join('');

    return `
      <div class="dash-donut-wrap">
        <svg width="140" height="140" viewBox="0 0 140 140" style="flex-shrink:0">
          ${arcs}
          <text x="${cx}" y="${cy - 8}" text-anchor="middle" dominant-baseline="middle" font-size="26" font-weight="800" fill="var(--color-text-primary)">${centerNum}</text>
          <text x="${cx}" y="${cy + 12}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="var(--color-text-muted)">${Utils.escHtml(centerSub)}</text>
        </svg>
        <div class="dash-donut-legend">${legendHtml}</div>
      </div>`;
  }

  function hbar(label, val, maxVal, color, onclick) {
    const pct = maxVal > 0 ? (val / maxVal * 100).toFixed(1) : 0;
    return `
      <div class="dash-hbar" ${onclick ? `onclick="${onclick}" style="cursor:pointer"` : ''}>
        <div class="dash-hbar-lbl">${Utils.escHtml(label)}</div>
        <div class="dash-hbar-track"><div class="dash-hbar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="dash-hbar-num">${val}</div>
      </div>`;
  }

  function trendChart(labels, vals, maxV, barColor) {
    const n = labels.length;
    const W = 400, H = 80, bottom = 16, pad = 3;
    const bw = Math.floor((W - pad * (n - 1)) / n);
    const bars = labels.map((lbl, i) => {
      const v = vals[i];
      const bh = v > 0 ? Math.max(Math.round((v / maxV) * (H - bottom - 12)), 3) : 0;
      const x = i * (bw + pad);
      const y = H - bottom - bh;
      return [
        v > 0 ? `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="2" fill="${barColor}"/>` : `<rect x="${x}" y="${H - bottom - 1}" width="${bw}" height="1" rx="1" fill="var(--color-divider)"/>`,
        v > 0 ? `<text x="${x + bw/2}" y="${y - 3}" text-anchor="middle" font-size="9" fill="var(--color-text-muted)">${v}</text>` : '',
        `<text x="${x + bw/2}" y="${H - 2}" text-anchor="middle" font-size="9" fill="var(--color-text-muted)">${Utils.escHtml(lbl)}</text>`,
      ].join('');
    }).join('');
    return `<svg class="dash-trend-svg" viewBox="0 0 ${W} ${H}" style="height:${H}px">${bars}</svg>`;
  }

  function kpi(num, label, sub, accentColor, route, iconName) {
    return `
      <div class="dash-kpi" onclick="Router.navigate('${route}')" style="border-right-color:${accentColor}" title="${Utils.escHtml(label)}">
        <div class="dash-kpi-icon" style="color:${accentColor}">${Utils.icon(iconName, 18)}</div>
        <div class="dash-kpi-num" style="color:${accentColor}">${Utils.escHtml(String(num))}</div>
        <div class="dash-kpi-lbl">${Utils.escHtml(label)}</div>
        ${sub ? `<div class="dash-kpi-sub">${Utils.escHtml(sub)}</div>` : ''}
      </div>`;
  }

  /* ── Derived values ───────────────────────────────────── */
  const sessionMissing = activeSession ? activeSession.totalExpected - activeSession.totalCounted : 0;
  const sessionPct = activeSession && activeSession.totalExpected > 0
    ? Math.round(activeSession.totalCounted / activeSession.totalExpected * 100) : 0;
  const sessionColor = sessionPct >= 100 ? 'var(--color-success)'
    : sessionPct >= 80 ? 'var(--color-warning)' : 'var(--color-danger)';

  const msltSegs = [
    { label: 'הגיעו',    val: mashlatArrived.length,   color: '#16a34a' },
    { label: 'בקליטה',   val: mashlatIntake.length,    color: '#0284c7' },
    { label: 'ממתינים',  val: mashlatWaiting.length,   color: '#f59e0b' },
    { label: 'לא הגיעו', val: mashlatNoShow.length,    color: '#dc2626' },
    { label: 'בוצעו',    val: mashlatCompleted.length,  color: '#64748b' },
  ];

  const EVENT_PRIORITY_LABEL = { low: 'נמוך', medium: 'בינוני', high: 'גבוה', critical: 'קריטי' };
  const EVENT_PRIORITY_COLOR = { low: 'var(--color-text-muted)', medium: 'var(--color-warning)', high: 'var(--color-danger)', critical: '#7f1d1d' };

  /* ── Render ───────────────────────────────────────────── */
  content.innerHTML = `
    <div class="page-wrapper">

      ${Utils.pageHeader('תמונת מצב', Utils.pageMeta())}

      <!-- ROW 1: KPI cards -->
      <div class="dash-kpi-grid">
        ${kpi(activePrisoners.length,
               'כלואים פעילים',
               mashlatArrived.length > 0 ? mashlatArrived.length + ' נקלטו היום' : null,
               'var(--color-primary)', '/prisoner-file', 'prison')}
        ${kpi(mashlatTodayActive.length,
               'מתואמים להיום',
               mashlatWaiting.length > 0 ? mashlatWaiting.length + ' ממתינים' : (mashlatTodayActive.length > 0 ? 'הכל הגיע ✓' : null),
               mashlatWaiting.length > 0 ? 'var(--color-warning)' : 'var(--color-success)',
               '/mashlat', 'coordination')}
        ${kpi(mashlatWaiting.length,
               'טרם הגיעו',
               mashlatWaiting.length > 0 ? 'ממתינים להתייצבות' : 'הכל הגיע ✓',
               mashlatWaiting.length > 0 ? 'var(--color-warning)' : 'var(--color-success)',
               '/mashlat', 'alert')}
        ${kpi(unresolvedEvents.length,
               'אירועים פתוחים',
               unresolvedEvents.length > 0 ? 'דורשים טיפול' : 'הכל טופל ✓',
               unresolvedEvents.length > 0 ? 'var(--color-danger)' : 'var(--color-success)',
               '/event-reports', 'event')}
        ${kpi(todayTasks.length,
               'משימות להיום',
               overdueTasks.length > 0 ? overdueTasks.length + ' באיחור' : 'ללא איחור',
               overdueTasks.length > 0 ? 'var(--color-warning)' : 'var(--color-info)',
               '/tasks', 'task')}
        ${activeSession
          ? kpi(activeSession.totalCounted + '/' + activeSession.totalExpected,
                 'ספירה נוכחית',
                 sessionMissing > 0 ? sessionMissing + ' חסרים' : 'הושלמה ✓',
                 sessionMissing > 0 ? 'var(--color-warning)' : 'var(--color-success)',
                 '/counting-report', 'counting')
          : kpi('—', 'ספירה נוכחית', 'אין ספירה פעילה', 'var(--color-text-muted)', '/counting-report', 'counting')}
        ${kpi(upcomingReleases.length,
               'שחרורים ב-7 ימים',
               upcomingReleases.length > 0 ? 'דורשים טיפול' : 'אין שחרורים קרובים',
               upcomingReleases.length > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)',
               '/prisoner-file', 'calendar')}
        ${kpi(pendingStock.length,
               'מלאי ממתין לאישור',
               pendingStock.length > 0 ? pendingStock.map(m => m.movementNumber).slice(0,1).join('') : 'הכל מאושר',
               pendingStock.length > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)',
               '/canteen-stock-movements', 'stock')}
        ${kpi(severity3Count,
               'חיוויים מדרג 3',
               severity3Count > 0 ? 'תיאומים פעילים' : 'אין חיוויים קריטיים',
               severity3Count > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)',
               '/mashlat', 'alert')}
        ${kpi(severity2Count,
               'חיוויים מדרג 2',
               severity2Count > 0 ? 'תיאומים פעילים' : 'אין חיוויי אזהרה',
               severity2Count > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)',
               '/mashlat', 'alert')}
      </div>

      <!-- ROW 2: Attention items + Mashlat donut -->
      <div class="dash-grid-12">
        <div class="card">
          <div class="card-header">
            <div class="card-title dash-card-title-warn">
              ${Utils.icon('alert', 15)} דורש טיפול
            </div>
            ${attentionItems.length > 0 ? `<span class="badge badge-inactive" style="font-size:10px">${attentionItems.length} פריטים</span>` : ''}
          </div>
          <div class="card-body">
            ${attentionItems.length === 0 ? `
              <div class="dash-all-clear">
                <div class="dash-all-clear-icon">${Utils.icon('check', 20)}</div>
                <div>
                  <div style="font-weight:600;color:var(--color-success);font-size:14px">הכל תקין</div>
                  <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px">אין פריטים הדורשים טיפול מיידי</div>
                </div>
              </div>
            ` : attentionItems.map(it => `
              <div class="dash-attn-item ${it.lvl}">
                <div class="dash-attn-icon">${Utils.icon(it.icon, 14)}</div>
                <div class="dash-attn-body">${Utils.escHtml(it.text)}</div>
                <button class="btn btn-ghost btn-sm dash-attn-btn" onclick="Router.navigate('${it.route}')">${Utils.escHtml(it.btn)} →</button>
              </div>`).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">מצב תיאומי משל״ט היום</div>
            <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/mashlat')">משל"ט →</button>
          </div>
          <div class="card-body">
            ${donut(msltSegs, mashlatTodayActive.length, 'מתואמים היום')}
          </div>
        </div>
      </div>

      <!-- ROW 3: Prisoner distribution + Counting -->
      <div class="dash-grid-2">
        <div class="card">
          <div class="card-header">
            <div class="card-title">${Utils.icon('prison', 15)} התפלגות כלואים לפי מיקום</div>
            <span style="font-size:12px;color:var(--color-text-muted)">סה"כ: ${activePrisoners.length}</span>
          </div>
          <div class="card-body">
            ${locationEntries.length > 0
              ? locationEntries.map(([loc, cnt]) => hbar(loc, cnt, maxLocVal, LOC_COLORS[loc] || 'var(--color-primary)', `Router.navigate('/prisoner-file')`)).join('')
              : `<div class="dash-empty">אין כלואים פעילים</div>`}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">מצב ספירה</div>
            <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/counting-report')">פתח ספירה →</button>
          </div>
          <div class="card-body">
            ${activeSession ? `
              <div class="dash-count-progress">
                <span class="dash-count-fraction">${activeSession.totalCounted}<span class="dash-count-frac-denom">/${activeSession.totalExpected}</span></span>
                <span class="dash-count-pct" style="color:${sessionColor}">${sessionPct}%</span>
              </div>
              <div class="dash-count-bar-wrap">
                <div class="dash-count-bar">
                  <div class="dash-count-bar-fill" style="width:${sessionPct}%;background:${sessionColor}"></div>
                </div>
              </div>
              <div class="dash-count-summary" style="color:${sessionMissing > 0 ? 'var(--color-warning)' : 'var(--color-success)'}">
                ${sessionMissing > 0 ? sessionMissing + ' טרם נספרו' : 'הספירה הושלמה ✓'}
              </div>
              <div class="dash-count-section-title">פירוט לפי מיקום</div>
              ${Object.entries(expectedByLoc).map(([loc, exp]) => {
                const cnt = countedByLoc[loc] || 0;
                const ok = cnt >= exp;
                return `<div class="dash-count-loc${ok ? '' : ' missing'}">
                  <span class="dash-count-loc-name">${Utils.escHtml(loc)}</span>
                  <span class="dash-count-loc-val" style="color:${ok ? 'var(--color-success)' : 'var(--color-danger)'}">
                    ${ok ? Utils.icon('check', 12) : Utils.icon('alert', 12)} ${cnt}/${exp}
                  </span>
                </div>`;
              }).join('')}
            ` : `<div class="dash-empty">אין ספירה פעילה כרגע</div>`}
          </div>
        </div>
      </div>

      <!-- ROW 4: Recent events + Upcoming releases -->
      <div class="dash-grid-2">
        <div class="card">
          <div class="card-header">
            <div class="card-title">אירועים ב-7 הימים האחרונים</div>
            <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/event-reports')">כל האירועים →</button>
          </div>
          <div class="card-body">
            ${trendVals.every(v => v === 0)
              ? `<div class="dash-empty" style="padding:12px 0">אין אירועים ב-7 הימים האחרונים</div>`
              : trendChart(trendLabels, trendVals, maxTrendVal, 'var(--color-primary)')}
            <div class="dash-trend-footer" style="margin-bottom:12px">
              <span>סה"כ: <strong>${trendVals.reduce((a,b)=>a+b,0)}</strong></span>
              <span style="color:var(--color-danger)">פתוחים: <strong>${unresolvedEvents.length}</strong></span>
              <span style="color:var(--color-success)">נסגרו: <strong>${eventReports.filter(e=>e.handlingStatus==='resolved').length}</strong></span>
            </div>
            ${recentEvents.length > 0 ? `
              <div class="dash-count-section-title">אירועים אחרונים</div>
              ${recentEvents.map(e => {
                const p = pMap[e.personId];
                const name = p ? p.firstName + ' ' + p.lastName : '—';
                const pColor = EVENT_PRIORITY_COLOR[e.priority] || 'var(--color-text-muted)';
                return `<div class="dash-list-item">
                  <div style="min-width:44px;text-align:center">
                    <div class="dash-list-time" style="font-size:11px">${Utils.escHtml(e.eventDate ? Utils.formatDate(e.eventDate) : '—')}</div>
                    <div class="dash-list-date">${Utils.escHtml(e.eventTime || '—')}</div>
                  </div>
                  <div class="dash-list-body">
                    <div class="dash-list-name">${Utils.escHtml(e.title || '—')}</div>
                    <div class="dash-list-sub">${Utils.escHtml(name)} · ${Utils.escHtml(e.location || '—')}</div>
                  </div>
                  <span style="font-size:10px;font-weight:600;color:${pColor};white-space:nowrap">${Utils.escHtml(EVENT_PRIORITY_LABEL[e.priority] || '—')}</span>
                </div>`;
              }).join('')}
            ` : ''}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">שחרורים קרובים</div>
            <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/prisoner-file')">כל הכלואים →</button>
          </div>
          <div class="card-body">
            ${upcomingReleases.length === 0 ? `<div class="dash-empty">אין שחרורים מתוכננים בשבוע הקרוב</div>`
              : upcomingReleases.map(p => {
                const person = pMap[p.personId];
                const name = person ? person.firstName + ' ' + person.lastName : '—';
                const milNum = person ? person.militaryNumber : '—';
                const days = Utils.daysBetween(today, p.expectedRelease);
                const dayColor = days <= 1 ? 'var(--color-danger)' : days <= 3 ? 'var(--color-warning)' : 'var(--color-text-muted)';
                const daysLabel = days === 0 ? 'היום' : days === 1 ? 'מחר' : `בעוד ${days} ימים`;
                return `<div class="dash-release-item" onclick="Router.navigate('/prisoner-file',{id:'${p.id}'})">
                  <div>
                    <div class="dash-release-name">${Utils.escHtml(name)}</div>
                    <div class="dash-release-meta">מ"א ${Utils.escHtml(milNum)} · ${Utils.formatDate(p.expectedRelease)}</div>
                  </div>
                  <div class="dash-release-days" style="color:${dayColor}">${daysLabel}</div>
                </div>`;
              }).join('')}
          </div>
        </div>
      </div>

      <!-- ROW 5: Tasks today + Activities today -->
      <div class="dash-grid-2">
        <div class="card">
          <div class="card-header">
            <div class="card-title">משימות היום</div>
            <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/tasks')">כל המשימות →</button>
          </div>
          <div class="card-body">
            ${todayTasks.length === 0 ? `<div class="dash-empty">אין משימות מתוכננות להיום</div>`
              : todayTasks.slice(0, 6).map(t => {
                const statusMap = { planned: 'מתוכנן', approved: 'מאושר', in_progress: 'פעיל' };
                const statusClass = t.status === 'in_progress' ? 'badge-inprogress' : t.status === 'approved' ? 'badge-approved' : 'badge-pending';
                return `<div class="dash-list-item">
                  <div style="min-width:44px;text-align:center">
                    <div class="dash-list-time">${Utils.escHtml(t.startTime || '—')}</div>
                  </div>
                  <div class="dash-list-body">
                    <div class="dash-list-name">${Utils.escHtml(t.name || '—')}</div>
                    <div class="dash-list-sub">${Utils.escHtml(t.location || '—')}${t.activityTypeLabel ? ' · ' + t.activityTypeLabel : ''}</div>
                  </div>
                  <span class="badge ${statusClass}" style="font-size:10px;flex-shrink:0">${statusMap[t.status] || t.status}</span>
                </div>`;
              }).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">פעילויות כלואים היום</div>
            <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/inmate-activities')">כל הפעילויות →</button>
          </div>
          <div class="card-body">
            ${actGroups.length === 0 ? `<div class="dash-empty">אין פעילויות מתוכננות להיום</div>`
              : actGroups.map(g => `
                <div class="dash-list-item">
                  <div class="dash-list-time">${Utils.escHtml(g.time || '—')}</div>
                  <div class="dash-list-body">
                    <div class="dash-list-name">${Utils.escHtml(g.label)}</div>
                    <div class="dash-list-sub">${g.count} כלואים</div>
                  </div>
                </div>`).join('')}
          </div>
        </div>
      </div>

      ${Utils.classificationFooter()}
    </div>
  `;
};
