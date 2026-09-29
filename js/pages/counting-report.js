/* counting-report.js — v8 — redesigned to match screenshot */
'use strict';

window.Pages = window.Pages || {};

Pages['counting-report'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('incarceration')) { content.innerHTML = EmptyState.accessDenied(); return; }

  const canEdit = Permissions.can('editPrisoner');
  const user    = Auth.getCurrentUser();
  const base    = AppState.get('currentBase');

  let sessions = Storage.getCollection(Storage.KEYS.COUNTING_SESSIONS);
  let entries  = Storage.getCollection(Storage.KEYS.COUNTING_ENTRIES);
  let activeSession = sessions.find(s => s.status === 'in_progress') || null;

  const allPrisoners = Storage.getCollection(Storage.KEYS.PRISONER_FILES).filter(pf => pf.status === 'active');
  const people       = Storage.getCollection(Storage.KEYS.PEOPLE);
  const pMap         = Object.fromEntries(people.map(p => [p.id, p]));

  const SHIFTS = [
    { id: 'aleph',   label: 'ג' },
    { id: 'noon',    label: 'צ' },
    { id: 'evening', label: 'ש' },
    { id: 'night',   label: 'ל' },
  ];

  // Company options: canonical list only (no raw values from data, no duplicates, no dead options).
  // Raw prisoner values are normalised (trim / geresh variants) before matching.
  const EXTRA_COMPANIES = ['פלוגת נשים', 'אגף'];
  const canon = v => String(v || '').trim().replace(/[׳'`´]/g, '׳').replace(/\s+/g, ' ');
  const COMPANY_OPTIONS = [...new Set([...DETENTION_COMPANIES.map(canon), ...EXTRA_COMPANIES])];
  const companyOf = pf => { const c = canon(pf.company); return COMPANY_OPTIONS.includes(c) ? c : ''; };
  const isWoman = pf => (pMap[pf.personId] || {}).gender === 'female';
  const matchesCompany = (pf, opt) => {
    if (opt === 'פלוגת נשים') return companyOf(pf) === opt || isWoman(pf);
    if (opt === 'אגף') return /^אגף/.test(String(pf.location || pf.cell || '').trim());
    return companyOf(pf) === opt;
  };
  const companies = COMPANY_OPTIONS;

  // Filter state
  let filterDate     = (query && query.date)     || Utils.today();
  let filterCompany  = (query && COMPANY_OPTIONS.includes(canon(query.company)) && canon(query.company)) || '';

  /* ─── helpers ─────────────────────────────────────────────────── */

  function filtered() {
    let rows = allPrisoners;
    if (filterCompany)  rows = rows.filter(pf => matchesCompany(pf, filterCompany));
    return rows;
  }

  // Session matching the currently viewed date (independent of which session is "in_progress")
  function viewSessionForDate(date) {
    const matches = sessions.filter(s => s.date === date);
    return matches.find(s => s.status === 'in_progress') || matches[matches.length - 1] || null;
  }

  function groupByCompanyLocation(rows) {
    const map = {};
    rows.forEach(pf => {
      const co = companyOf(pf) || 'לא משויך';
      const key = co + '||' + (pf.location || '');
      if (!map[key]) map[key] = { company: co, location: pf.location || '', rows: [] };
      map[key].rows.push(pf);
    });
    return Object.values(map).sort((a, b) => (a.company + a.location).localeCompare(b.company + b.location));
  }

  function statusChip(pf) {
    const typeMap = {
      'חבוש':  { label: 'חב"ש',  bg: '#f59e0b', color: '#fff' },
      'עצור':  { label: 'עצור',  bg: '#3b82f6', color: '#fff' },
      'אסיר':  { label: 'אסיר',  bg: '#6366f1', color: '#fff' },
      'על"מ':  { label: 'על"מ',  bg: '#10b981', color: '#fff' },
      'שב"ס':  { label: 'שב"ס',  bg: '#ef4444', color: '#fff' },
      'שב״ס':  { label: 'שב"ס',  bg: '#ef4444', color: '#fff' },
    };
    const cfg = typeMap[pf.prisonerType] || { label: Utils.escHtml(pf.prisonerType || '—'), bg: '#6b7280', color: '#fff' };
    return `<span style="display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;background:${cfg.bg};color:${cfg.color};white-space:nowrap">${cfg.label}</span>`;
  }

  function sentenceRatio(pf) {
    const total  = pf.sentence   || 0;
    const served = pf.servedDays || 0;
    if (!total) return served > 0 ? `${served} / —` : '—';
    return `${total} / ${served}`;
  }

  function sessionEntry(pfId, viewSession) {
    if (!viewSession) return null;
    return entries.find(e => e.sessionId === viewSession.id && e.prisonerFileId === pfId) || null;
  }

  /* ─── render ──────────────────────────────────────────────────── */

  function renderPage() {
    const rows   = filtered();
    const groups = groupByCompanyLocation(rows);
    const viewSession = viewSessionForDate(filterDate);
    const canEditEntries = canEdit && viewSession && viewSession.status === 'in_progress';

    const kpiDate     = filterDate ? Utils.formatDate(filterDate) : Utils.formatDate(Utils.today());
    const kpiCompany  = filterCompany || (companies[0] || '—');
    const kpiLocs     = groups.length;
    const kpiTotal    = rows.length;

    const userName = user ? Utils.escHtml(user.firstName + ' ' + user.lastName) : '';
    const baseName = base ? Utils.escHtml(base.name || '') : 'בסיס 100';

    content.innerHTML = `
      <div class="page-wrapper">

        <!-- ── Header ───────────────────────────────────────────── -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-4)">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button type="button" class="btn btn-primary btn-sm" id="cr-print">הדפסה</button>
            <button type="button" class="btn btn-secondary btn-sm" id="cr-refresh">רענון</button>
            ${canEdit && !(viewSession && viewSession.status === 'in_progress') ? `<button type="button" class="btn btn-ghost btn-sm" id="cr-start">+ פתח ספירה</button>` : ''}
            ${canEdit && viewSession && viewSession.status === 'in_progress'  ? `<button type="button" class="btn btn-ghost btn-sm" id="cr-close">סגור ספירה</button>
              <button type="button" class="btn btn-ghost btn-sm" id="cr-history">היסטוריה</button>` : ''}
            ${!canEdit ? `<button type="button" class="btn btn-ghost btn-sm" id="cr-history">היסטוריה</button>` : ''}
          </div>
          <div style="text-align:right">
            <h1 style="font-size:22px;font-weight:700;margin:0 0 4px 0">דו"ח ספירות</h1>
            <div style="font-size:12px;color:var(--color-text-muted);display:flex;align-items:center;gap:6px;justify-content:flex-end;flex-wrap:wrap">
              <span>${kpiDate}</span>
              ${userName ? `<span>·</span><span>${userName}</span>` : ''}
              ${filterCompany ? `<span>·</span><span>פלוגה ${Utils.escHtml(filterCompany)}</span>` : ''}
              <span>·</span><span>${baseName}</span>
              ${viewSession ? `<span class="badge ${viewSession.status === 'in_progress' ? 'badge-inprogress' : 'badge-closed'}" style="font-size:10px"><span class="badge-dot"></span>${Utils.escHtml(viewSession.sessionNumber)}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- ── KPI cards (RTL: right=date, left=total) ──────────── -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-3);margin-bottom:var(--space-4)">
          ${kpiCard('תאריך ספירה', kpiDate,              '', false)}
          ${kpiCard('פלוגה',        Utils.escHtml(kpiCompany), '', false)}
          ${kpiCard('מיקומים פעילים', String(kpiLocs),   '', false)}
          ${kpiCard('סה"כ נספרים',  String(kpiTotal),    'var(--color-primary,#2563eb)', true)}
        </div>

        <!-- ── Filters ───────────────────────────────────────────── -->
        <div class="card" style="margin-bottom:var(--space-4)">
          <div style="display:flex;gap:var(--space-3);align-items:flex-end;padding:var(--space-3);flex-wrap:wrap">
            <div class="form-group" style="margin:0;min-width:160px">
              <label class="form-label" style="font-size:11px">תאריך ספירה</label>
              <input type="date" id="cr-f-date" class="form-control" style="font-size:13px" value="${filterDate}">
            </div>
            <div class="form-group" style="margin:0;min-width:140px">
              <label class="form-label" style="font-size:11px">פלוגה</label>
              <select id="cr-f-company" class="form-control" style="font-size:13px">
                <option value="">כל הפלוגות</option>
                ${companies.map(c => `<option value="${Utils.escHtml(c)}" ${filterCompany === c ? 'selected' : ''}>${Utils.escHtml(c)}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- ── Main table ─────────────────────────────────────────── -->
        <div class="card">
          <div style="padding:var(--space-3) var(--space-4) var(--space-2)">
            <div style="font-size:15px;font-weight:600">רשימת נספרים לפי מיקום</div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px">
              ספירות: א׳ · צ׳ · ש׳ · ל׳ — ארבע משמרות ספירה יומיות
              ${viewSession ? ` · ${viewSession.status === 'in_progress' ? 'ספירה פעילה' : 'ספירה סגורה'} ${Utils.escHtml(viewSession.sessionNumber)}` : ' · אין ספירה רשומה לתאריך זה'}
            </div>
          </div>
          <div style="overflow-x:auto">
            ${renderTable(groups, viewSession, canEditEntries)}
          </div>
        </div>

        ${Utils.classificationFooter()}
      </div>
    `;

    attachEvents();
  }

  function kpiCard(label, value, accentColor, highlight) {
    return `<div class="card" style="padding:var(--space-4);position:relative;overflow:hidden">
      <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;text-align:right">${label}</div>
      <div style="font-size:${value.length > 8 ? '15px' : '26px'};font-weight:700;text-align:right;line-height:1.1;color:${highlight ? 'var(--color-primary,#2563eb)' : 'var(--color-text-primary)'}">${value}</div>
      ${accentColor ? `<div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:${accentColor};border-radius:0 0 0 0"></div>` : ''}
    </div>`;
  }

  function renderTable(groups, viewSession, canEditEntries) {
    if (!groups.length) {
      return '<div style="text-align:center;padding:48px 24px;color:var(--color-text-muted)">אין נספרים להצגה לפי הסינון הנוכחי</div>';
    }

    const NAVY = '#1e2a4a';
    const TH   = `style="background:${NAVY};color:#fff;padding:7px 8px;font-weight:600;font-size:11px;white-space:nowrap;border:1px solid #2d3f68;text-align:right"`;
    const TH_C = `style="background:${NAVY};color:#fff;padding:7px 6px;font-weight:600;font-size:11px;white-space:nowrap;border:1px solid #2d3f68;text-align:center"`;

    const thead = `<thead>
      <tr>
        <th ${TH}>מס"ד</th>
        <th ${TH}>מ"א</th>
        <th ${TH}>שם</th>
        <th colspan="4" ${TH_C}>משמרת ספירה</th>
        <th ${TH}>סטטוס</th>
        <th ${TH_C}>ימים</th>
        <th ${TH}>ת.קליטה</th>
        <th ${TH_C}>ת.ק/פ</th>
        <th ${TH}>עבירה</th>
        <th ${TH}>משוחרר</th>
        <th ${TH}>ת.סיום</th>
        <th ${TH}>ת.כליאה</th>
        <th ${TH}>הערות</th>
      </tr>
      <tr>
        <th colspan="3" style="background:${NAVY};border:1px solid #2d3f68;padding:0"></th>
        ${SHIFTS.map(s => `<th style="background:${NAVY};color:#aac4f0;padding:4px 6px;font-size:11px;border:1px solid #2d3f68;text-align:center;font-weight:600">${s.label}</th>`).join('')}
        <th colspan="9" style="background:${NAVY};border:1px solid #2d3f68;padding:0"></th>
      </tr>
    </thead>`;

    const tbody = groups.map(group => {
      const locLabel = group.company + (group.location ? ' — ' + group.location : '');
      const groupRow = `<tr style="background:#dbeafe">
        <td colspan="16" style="padding:7px 12px;font-weight:600;font-size:12px;border-bottom:1px solid #bfdbfe">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="color:#1e40af">מיקום: ${Utils.escHtml(locLabel)}</span>
            <span style="background:#2563eb;color:#fff;font-size:11px;padding:1px 8px;border-radius:10px;font-weight:500">${group.rows.length} נספרים</span>
          </div>
        </td>
      </tr>`;

      const dataRows = group.rows.map((pf, ri) => {
        const p     = pMap[pf.personId];
        const entry = sessionEntry(pf.id, viewSession);
        const shiftCells = SHIFTS.map(s => {
          const checked = entry && entry.shiftChecks && entry.shiftChecks[s.id];
          return `<td style="text-align:center;padding:5px 4px;border-bottom:1px solid var(--color-border)">
            <input type="checkbox" ${checked ? 'checked' : ''} ${!canEditEntries ? 'disabled' : ''}
              onchange="window._crShift('${pf.id}','${s.id}',this.checked)"
              style="width:13px;height:13px;cursor:${canEditEntries ? 'pointer' : 'default'}">
          </td>`;
        }).join('');

        const TD = 'style="padding:6px 8px;font-size:12px;border-bottom:1px solid var(--color-border);white-space:nowrap"';
        const TD_C = 'style="padding:6px 6px;font-size:12px;border-bottom:1px solid var(--color-border);text-align:center;white-space:nowrap"';

        return `<tr>
          <td ${TD_C}>${ri + 1}</td>
          <td style="padding:6px 8px;font-size:11px;font-family:monospace;border-bottom:1px solid var(--color-border);white-space:nowrap">${p ? Utils.escHtml(p.militaryNumber) : '—'}</td>
          <td style="padding:6px 8px;font-size:12px;font-weight:500;border-bottom:1px solid var(--color-border);white-space:nowrap">${p ? Utils.escHtml(p.firstName + ' ' + p.lastName) : '—'}</td>
          ${shiftCells}
          <td ${TD}>${statusChip(pf)}</td>
          <td style="padding:6px 6px;font-size:13px;font-weight:700;border-bottom:1px solid var(--color-border);text-align:center;color:var(--color-primary,#2563eb)">${pf.servedDays || '—'}</td>
          <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid var(--color-border);white-space:nowrap">${pf.intakeDate ? Utils.formatDate(pf.intakeDate) : '—'}</td>
          <td style="padding:6px 6px;font-size:11px;font-family:monospace;border-bottom:1px solid var(--color-border);text-align:center">${sentenceRatio(pf)}</td>
          <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid var(--color-border);max-width:110px;overflow:hidden;text-overflow:ellipsis">${Utils.escHtml(pf.offense || '—')}</td>
          <td ${TD}>—</td>
          <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid var(--color-border);white-space:nowrap">${pf.expectedRelease ? Utils.formatDate(pf.expectedRelease) : '—'}</td>
          <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid var(--color-border);white-space:nowrap">${pf.intakeDate ? Utils.formatDate(pf.intakeDate) : '—'}</td>
          <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid var(--color-border);color:var(--color-text-muted)">
            ${canEditEntries
              ? `<input type="text" class="form-control" style="height:24px;font-size:10px;min-width:80px" value="${Utils.escHtml(entry ? entry.notes || '' : '')}" placeholder="הערה..." onchange="window._crNote('${pf.id}',this.value)">`
              : Utils.escHtml(entry ? entry.notes || '' : '—')
            }
          </td>
        </tr>`;
      }).join('');

      return groupRow + dataRows;
    }).join('');

    return `<table class="data-table" style="min-width:1100px;border-collapse:collapse">${thead}<tbody>${tbody}</tbody></table>`;
  }

  /* ─── events ──────────────────────────────────────────────────── */

  function attachEvents() {
    const $ = id => Utils.el(id);

    if ($('cr-print'))   $('cr-print').onclick   = () => window.print();
    if ($('cr-refresh')) $('cr-refresh').onclick  = () => { reload(); renderPage(); };
    if ($('cr-start'))   $('cr-start').onclick    = () => showStartSessionModal();
    if ($('cr-close'))   $('cr-close').onclick    = () => closeSession(viewSessionForDate(filterDate));
    if ($('cr-history')) $('cr-history').onclick  = () => showHistory();

    if ($('cr-f-date'))     $('cr-f-date').onchange     = () => { filterDate     = $('cr-f-date').value;     renderPage(); };
    if ($('cr-f-company'))  $('cr-f-company').onchange  = () => { filterCompany  = $('cr-f-company').value;  renderPage(); };

    const viewSession = viewSessionForDate(filterDate);
    if (canEdit && viewSession && viewSession.status === 'in_progress') {
      window._crShift = (pfId, shift, checked) => {
        let entry = entries.find(e => e.sessionId === viewSession.id && e.prisonerFileId === pfId);
        if (!entry) {
          entry = { id: 'ce_' + Utils.generateId(), sessionId: viewSession.id, prisonerFileId: pfId, present: null, shiftChecks: {}, notes: '' };
          entries.push(entry);
        }
        if (!entry.shiftChecks) entry.shiftChecks = {};
        entry.shiftChecks[shift] = checked;
        Storage.setCollection(Storage.KEYS.COUNTING_ENTRIES, entries);
      };

      window._crNote = (pfId, note) => {
        let entry = entries.find(e => e.sessionId === viewSession.id && e.prisonerFileId === pfId);
        if (!entry) {
          entry = { id: 'ce_' + Utils.generateId(), sessionId: viewSession.id, prisonerFileId: pfId, present: null, shiftChecks: {}, notes: note };
          entries.push(entry);
        } else {
          entry.notes = note;
        }
        Storage.setCollection(Storage.KEYS.COUNTING_ENTRIES, entries);
      };
    }
  }

  function reload() {
    sessions      = Storage.getCollection(Storage.KEYS.COUNTING_SESSIONS);
    entries       = Storage.getCollection(Storage.KEYS.COUNTING_ENTRIES);
    activeSession = sessions.find(s => s.status === 'in_progress') || null;
  }

  /* ─── session management ──────────────────────────────────────── */

  function showStartSessionModal() {
    const shiftOpts = [
      { id: 'morning',   label: 'בוקר',    time: '06:00–14:00' },
      { id: 'afternoon', label: 'צהריים',  time: '14:00–22:00' },
      { id: 'night',     label: 'לילה',    time: '22:00–06:00' },
    ];
    Modal.open({
      title: 'פתיחת ספירה חדשה',
      body: `
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">משמרת</label>
            <select id="cs-shift" class="form-control">
              ${shiftOpts.map(s => `<option value="${s.id}">${Utils.escHtml(s.label)} (${s.time})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">מפקד ספירה</label>
            <input id="cs-commander" class="form-control" value="${user ? Utils.escHtml(user.firstName + ' ' + user.lastName) : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">תאריך</label>
            <input type="date" id="cs-date" class="form-control" value="${filterDate}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">הערות</label>
          <textarea id="cs-notes" class="form-control" rows="2"></textarea>
        </div>
      `,
      footer: `
        <button type="button" class="btn btn-secondary" onclick="Modal.close()">ביטול</button>
        <button type="button" class="btn btn-primary" onclick="window._crStartSession()">התחל ספירה</button>
      `,
    });

    window._crStartSession = () => {
      const session = {
        id: 'cs_' + Utils.generateId(),
        sessionNumber: 'SP-' + String(Math.floor(Math.random() * 9000) + 1000),
        date: Utils.el('cs-date').value,
        shift: Utils.el('cs-shift').value,
        commander: Utils.el('cs-commander').value,
        notes: Utils.el('cs-notes').value,
        status: 'in_progress',
        baseId: base ? base.id : 'b100',
        startedAt: new Date().toISOString(),
        closedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sessions.push(session);
      Storage.setCollection(Storage.KEYS.COUNTING_SESSIONS, sessions);
      entries = Storage.getCollection(Storage.KEYS.COUNTING_ENTRIES);
      Audit.log({ module: 'incarceration', action: 'create', entityType: 'countingSession', entityId: session.id, description: `פתיחת ספירה ${session.sessionNumber}` });
      Modal.close();
      Toast.success('הספירה נפתחה');
      activeSession = session;
      filterDate = session.date;
      renderPage();
    };
  }

  async function closeSession(session) {
    if (!session) return;
    const ok = await Modal.confirm({ title: 'סגור ספירה', message: 'האם לסגור את הספירה הנוכחית?', type: 'success' });
    if (!ok) return;
    session.status    = 'completed';
    session.closedAt  = new Date().toISOString();
    session.updatedAt = new Date().toISOString();
    Storage.setCollection(Storage.KEYS.COUNTING_SESSIONS, sessions);
    Audit.log({ module: 'incarceration', action: 'close', entityType: 'countingSession', entityId: session.id, description: `סגירת ספירה ${session.sessionNumber}` });
    Toast.success('הספירה נסגרה');
    if (activeSession && activeSession.id === session.id) activeSession = null;
    renderPage();
  }

  function showHistory() {
    const completed = sessions.filter(s => s.status === 'completed').reverse().slice(0, 10);
    Modal.open({
      title: 'היסטוריית ספירות',
      size: 'lg',
      body: completed.length === 0 ? '<div class="empty-state-desc">אין ספירות שהושלמו.</div>' : `
        <table class="data-table">
          <thead><tr><th>מספר</th><th>תאריך</th><th>משמרת</th><th>מפקד</th><th>התחלה</th><th>סגירה</th></tr></thead>
          <tbody>
            ${completed.map(s => `<tr>
              <td class="td-number">${Utils.escHtml(s.sessionNumber)}</td>
              <td>${Utils.formatDate(s.date)}</td>
              <td>${Utils.escHtml(s.shift)}</td>
              <td>${Utils.escHtml(s.commander)}</td>
              <td>${Utils.formatDateTime(s.startedAt)}</td>
              <td>${s.closedAt ? Utils.formatDateTime(s.closedAt) : '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      `,
    });
  }

  renderPage();
};
