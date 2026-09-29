/* event-reports.js — דוחות אירוע (fields per legacy popup; participants; status פתוח/סגור) */
'use strict';

window.Pages = window.Pages || {};

Pages['event-reports'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('incarceration')) { content.innerHTML = EmptyState.accessDenied(); return; }

  let filterStatus = '';   // '', 'open', 'closed'
  let filterSearch = '';
  let selectedId = null;
  const canEdit = Permissions.can('editPrisoner');

  const people = Storage.getCollection(Storage.KEYS.PEOPLE);
  const pMap = Object.fromEntries(people.map(p => [p.id, p]));
  const pfByPerson = {};
  Storage.getCollection(Storage.KEYS.PRISONER_FILES).forEach(pf => { pfByPerson[pf.personId] = pf; });

  // read-time normalisation of legacy records (idempotent; persisted only when a record is saved)
  function norm(ev) {
    const n = Object.assign({}, ev);
    n.status = (ev.status === 'closed' || ev.handlingStatus === 'resolved') ? 'closed' : 'open';
    n.participants = (ev.participants && ev.participants.length) ? ev.participants : (ev.personId ? [ev.personId] : []);
    n.eventDate = ev.eventDate || ev.date;
    n.eventTime = ev.eventTime || ev.time;
    n.senderName = ev.senderName || ev.reportedBy;
    n.receiverName = ev.receiverName || ev.recipientName;
    n.delivered = ev.delivered != null ? ev.delivered : !!ev.deliveredToCommander;
    n.signer = ev.signer || ev.signerDetails;
    n.summary = ev.title;
    return n;
  }
  const getAll = () => Storage.getCollection(Storage.KEYS.EVENT_REPORTS).map(norm);

  function personLabel(pid) {
    const p = pMap[pid];
    return p ? p.firstName + ' ' + p.lastName + ' (מ.א. ' + p.militaryNumber + ')' : null;
  }

  function getData() {
    let events = getAll();
    if (filterStatus) events = events.filter(e => e.status === filterStatus);
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      events = events.filter(e => (e.title || '').toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q) ||
        String(e.sequenceNumber || '').includes(q) || e.participants.some(pid => (personLabel(pid) || '').toLowerCase().includes(q)));
    }
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return events.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
      const pA = priorityOrder[a.priority] ?? 9, pB = priorityOrder[b.priority] ?? 9;
      if (pA !== pB) return pA - pB;
      return ((b.eventDate || '') + (b.eventTime || '')).localeCompare((a.eventDate || '') + (a.eventTime || ''));
    });
  }

  const statusBadge = s => s === 'closed' ? '<span class="badge badge-closed">סגור</span>' : '<span class="badge badge-active">פתוח</span>';

  function renderPage() {
    const all = getAll();
    const data = getData();
    const openCount = all.filter(e => e.status === 'open').length;
    const selected = data.find(e => e.id === selectedId) || null;
    if (!selected) selectedId = null;

    content.innerHTML = `
      <div class="page-wrapper">
        ${Utils.pageHeader('דוחות אירוע', Utils.pageMeta())}

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <button class="btn btn-secondary btn-sm" id="btn-export">${Utils.icon('download', 14)} ייצוא</button>
          ${canEdit ? `<button class="btn btn-primary" id="btn-add">${Utils.icon('plus', 14)} דוח אירוע חדש</button>` : ''}
        </div>

        <div class="retrieval-panel">
          <div class="retrieval-panel-header">סינון</div>
          <div class="retrieval-grid">
            <div class="form-group">
              <label class="form-label">סטטוס</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:4px">
                ${[{ id: '', label: 'הכל' }, { id: 'open', label: `פתוח (${openCount})` }, { id: 'closed', label: 'סגור' }].map(s => `
                  <button class="btn btn-sm ${filterStatus === s.id ? 'btn-primary' : 'btn-secondary'}" onclick="window._evFilterStatus('${s.id}')">${Utils.escHtml(s.label)}</button>`).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">חיפוש</label>
              <input class="form-control" id="ev-search" placeholder="מס׳ סידורי / תמצית / משתתף..." value="${Utils.escHtml(filterSearch)}">
            </div>
          </div>
        </div>

        <div class="master-detail-layout" style="display:grid;grid-template-columns:${selected ? '1fr 1fr' : '1fr'};gap:var(--space-4)">
          <div class="table-panel">
            <table class="data-table dense">
              <thead><tr><th>מס׳ סידורי</th><th>תאריך אירוע</th><th>שעה</th><th>תמצית האירוע</th><th>משתתפים</th><th>עדיפות</th><th>סטטוס</th><th></th></tr></thead>
              <tbody>
                ${data.length === 0 ? `<tr><td colspan="8" style="padding:32px;text-align:center;color:var(--color-text-muted)">לא נמצאו דוחות אירוע</td></tr>` :
                  data.map(ev => `
                    <tr class="${selected && selected.id === ev.id ? 'row-selected' : ''} ${ev.status === 'open' && (ev.priority === 'critical' || ev.priority === 'high') ? 'row-critical' : ''}" style="cursor:pointer" onclick="window.selectEvent('${ev.id}')">
                      <td class="td-number">${Utils.escHtml(String(ev.sequenceNumber || '—'))}</td>
                      <td class="td-date">${Utils.formatDate(ev.eventDate)}</td>
                      <td>${Utils.escHtml(ev.eventTime || '—')}</td>
                      <td>${Utils.escHtml(Utils.truncate(ev.title || '—', 34))}</td>
                      <td>${ev.participants.length}</td>
                      <td>${StatusBadge.renderPriority(ev.priority || ev.severity)}</td>
                      <td>${statusBadge(ev.status)}</td>
                      <td>${canEdit && ev.status === 'open' ? `<button class="row-action-btn success" onclick="event.stopPropagation(); window.closeEvent('${ev.id}')" title="סגור אירוע">${Utils.icon('check', 12)}</button>` : ''}</td>
                    </tr>`).join('')}
              </tbody>
            </table>
          </div>
          ${selected ? renderEventDetail(selected) : ''}
        </div>

        ${Utils.classificationFooter()}
      </div>
    `;

    Utils.el('ev-search').addEventListener('input', Utils.debounce(() => { filterSearch = Utils.el('ev-search').value; renderPage(); }, 300));
    Utils.el('btn-export').onclick = () => {
      const rows = getData().map(ev => [ev.sequenceNumber || '', ev.eventDate, ev.eventTime, ev.title, ev.participants.map(personLabel).filter(Boolean).join('; '), ev.status === 'closed' ? 'סגור' : 'פתוח']);
      Utils.exportCsv('event_reports.csv', ['מס׳ סידורי', 'תאריך', 'שעה', 'תמצית', 'משתתפים', 'סטטוס'], rows);
    };
    if (Utils.el('btn-add')) Utils.el('btn-add').onclick = () => showEventModal();
    window._evFilterStatus = (s) => { filterStatus = s; renderPage(); };
    window.selectEvent = (id) => { selectedId = id || null; renderPage(); };
  }

  function renderEventDetail(ev) {
    const esc = v => Utils.escHtml(v || '—');
    const fd = v => v ? Utils.formatDate(v) : '—';
    const parts = ev.participants.map(pid => {
      const label = personLabel(pid);
      const pf = pfByPerson[(pMap[pid] || {}).id];
      return label ? `<div>${Utils.escHtml(label)}${pf ? ` <a href="#/prisoner-file?id=${pf.id}" style="font-size:11px">תיק כלוא</a>` : ''}</div>` : '';
    }).join('');
    return `
      <div class="card" style="position:sticky;top:calc(var(--topbar-height) + var(--space-4))">
        <div class="card-header"><div class="card-title">דוח אירוע ${esc(String(ev.sequenceNumber || ''))}</div>
          <button class="btn btn-ghost btn-sm" onclick="window.selectEvent('')">${Utils.icon('x', 14)}</button></div>
        <div class="card-body" style="max-height:70vh;overflow-y:auto">
          <div style="margin-bottom:var(--space-4)">
            <h3 style="margin:0 0 6px;font-size:var(--font-size-md)">${esc(ev.title)}</h3>
            <div style="display:flex;gap:var(--space-2)">${statusBadge(ev.status)} ${StatusBadge.renderPriority(ev.priority || ev.severity)}</div>
          </div>
          <div class="info-list">
            <div class="info-list-row"><div class="info-list-label">תאריך ושעת דיווח</div><div>${ev.createdAt ? fd(ev.createdAt) : '—'} ${esc(ev.reportTime)}</div></div>
            <div class="info-list-row"><div class="info-list-label">מוסר הדו״ח</div><div>${esc(ev.senderName)}</div></div>
            <div class="info-list-row"><div class="info-list-label">מקבל הדו״ח</div><div>${esc(ev.receiverName)}</div></div>
            <div class="info-list-row"><div class="info-list-label">תאריך ושעת האירוע</div><div>${fd(ev.eventDate)} ${esc(ev.eventTime)}</div></div>
            <div class="info-list-row"><div class="info-list-label">מיקום האירוע</div><div>${esc(ev.location)}</div></div>
            <div class="info-list-row"><div class="info-list-label">משתתפים</div><div>${parts || '—'}</div></div>
            <div class="info-list-row"><div class="info-list-label">עצור בגין</div><div>${esc(ev.detentionReason)}</div></div>
            <div class="info-list-row"><div class="info-list-label">נוכחים באירוע</div><div>${esc(ev.personsPresent)}</div></div>
            <div class="info-list-row"><div class="info-list-label">הנחיות מפקד היחידה</div><div>${esc(ev.commanderInstructions)}</div></div>
            <div class="info-list-row"><div class="info-list-label">נמסר למפקד היחידה</div><div>${ev.delivered ? 'כן' : 'לא'}</div></div>
            <div class="info-list-row"><div class="info-list-label">פרטי החותם</div><div>${esc(ev.signer)}</div></div>
            ${ev.status === 'closed' && ev.closedAt ? `<div class="info-list-row"><div class="info-list-label">נסגר</div><div>${fd(ev.closedAt)}</div></div>` : ''}
          </div>
          <div style="margin-top:var(--space-4)"><div class="info-list-label">נוסח מלא</div>
            <div style="white-space:pre-line;margin-top:4px;font-size:var(--font-size-sm);line-height:1.7">${esc(ev.description)}</div></div>
          ${ev.handlingNotes ? `<div style="margin-top:var(--space-4)"><div class="info-list-label">הערות טיפול</div><div style="white-space:pre-line;margin-top:4px;font-size:var(--font-size-sm)">${esc(ev.handlingNotes)}</div></div>` : ''}
          ${canEdit ? `<div style="margin-top:var(--space-4);padding-top:var(--space-4);border-top:1px solid var(--color-divider);display:flex;gap:var(--space-2);flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" onclick="window.editEvent('${ev.id}')">${Utils.icon('edit', 13)} עריכה</button>
            ${ev.status === 'open' ? `<button class="btn btn-primary btn-sm" onclick="window.closeEvent('${ev.id}')">סגור אירוע</button>` : `<button class="btn btn-secondary btn-sm" onclick="window.reopenEvent('${ev.id}')">פתח מחדש</button>`}
          </div>` : ''}
        </div>
      </div>`;
  }

  // ----- create / edit popup (legacy fields + participants; no internal/external) -----
  function showEventModal(existing) {
    const ex = existing ? norm(existing) : {};
    const nowT = new Date(); const hhmm = String(nowT.getHours()).padStart(2, '0') + ':' + String(nowT.getMinutes()).padStart(2, '0');
    const u = Auth.getCurrentUser();
    const nextSeq = ex.sequenceNumber || (Math.max(2000, ...Storage.getCollection(Storage.KEYS.EVENT_REPORTS).map(e => parseInt(e.sequenceNumber, 10) || 0)) + 1);
    const fld = (id, label, type, val, req, extra) => `<div class="form-group"><label class="form-label">${label}${req ? ' <span class="required">*</span>' : ''}</label><input id="${id}" type="${type || 'text'}" class="form-control" value="${Utils.escHtml(val == null ? '' : String(val))}" ${extra || ''}></div>`;
    Modal.open({
      title: ex.id ? 'עריכת דוח אירוע' : 'דוח אירוע חדש',
      size: 'xl',
      body: `
        <div class="form-row form-row-3">
          ${fld('ev-seq', 'מס׳ סידורי', 'text', nextSeq, false, 'readonly')}
          ${fld('ev-rdate', 'תאריך דיווח', 'date', ex.reportDate || Utils.today(), true)}
          ${fld('ev-rtime', 'שעת דיווח', 'time', ex.reportTime || hhmm, true)}
          ${fld('ev-sender', 'מוסר הדו״ח', 'text', ex.senderName || (u ? u.firstName + ' ' + u.lastName : ''), true)}
          ${fld('ev-receiver', 'מקבל הדו״ח', 'text', ex.receiverName, true)}
          <div class="form-group"><label class="form-label">עדיפות</label>
            <select id="ev-priority" class="form-control">${PRIORITIES.map(p => `<option value="${p.id}" ${(ex.priority || 'high') === p.id ? 'selected' : ''}>${Utils.escHtml(p.label)}</option>`).join('')}</select></div>
          ${fld('ev-date', 'תאריך האירוע', 'date', ex.eventDate || Utils.today(), true)}
          ${fld('ev-time', 'שעת האירוע', 'time', ex.eventTime, true)}
          ${fld('ev-location', 'מיקום האירוע', 'text', ex.location, true)}
          ${fld('ev-detained-for', 'עצור בגין', 'text', ex.detentionReason)}
          ${fld('ev-arrival', 'תאריך קבלה לבס״כ', 'date', ex.baseArrivalDate)}
        </div>
        <div class="form-group">
          <label class="form-label">משתתפים <span class="required">*</span> <span style="font-weight:400;color:var(--color-text-muted)">(אפשר לבחור כמה)</span></label>
          <input id="ev-part-search" class="form-control" placeholder="חיפוש לפי שם / מספר אישי..." style="margin-bottom:6px">
          <div id="ev-participants-list" style="max-height:150px;overflow-y:auto;border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:8px">
            ${people.map(p => `<label style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:13px">
              <input type="checkbox" class="ev-participant-cb" value="${p.id}" ${ex.participants && ex.participants.includes(p.id) ? 'checked' : ''}>
              <span>${Utils.escHtml(p.firstName + ' ' + p.lastName + ' — ' + p.militaryNumber)}${pfByPerson[p.id] ? ' <span class="badge badge-info" style="font-size:10px">כלוא</span>' : ''}</span></label>`).join('')}
          </div>
        </div>
        <div class="form-row form-row-2">
          ${fld('ev-title', 'תמצית האירוע', 'text', ex.title, true)}
          ${fld('ev-present', 'נוכחים באירוע', 'text', ex.personsPresent)}
        </div>
        <div class="form-group"><label class="form-label">נוסח מלא <span class="required">*</span></label><textarea id="ev-desc" class="form-control" rows="4">${Utils.escHtml(ex.description || '')}</textarea></div>
        <div class="form-group"><label class="form-label">הנחיות מפקד היחידה</label><textarea id="ev-commander-instr" class="form-control" rows="2">${Utils.escHtml(ex.commanderInstructions || '')}</textarea></div>
        <div class="form-row form-row-2">
          <div class="form-group"><label class="form-label" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="ev-delivered" ${ex.delivered ? 'checked' : ''}> נמסר למפקד היחידה</label></div>
          ${fld('ev-signer', 'פרטי החותם', 'text', ex.signer)}
        </div>
        <div style="font-size:12px;color:var(--color-text-muted)">סטטוס: ${ex.id ? (ex.status === 'closed' ? 'סגור' : 'פתוח') : 'האירוע ייפתח בסטטוס פתוח'}</div>
      `,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" id="ev-save">${ex.id ? 'שמור' : 'צור דוח אירוע'}</button>`,
    });

    Utils.el('ev-part-search').oninput = () => {
      const q = Utils.el('ev-part-search').value.trim();
      document.querySelectorAll('#ev-participants-list label').forEach(l => { l.style.display = !q || l.textContent.includes(q) ? '' : 'none'; });
    };

    Utils.el('ev-save').onclick = () => {
      const v = id => Utils.el(id).value.trim();
      const required = { 'ev-rdate': 'תאריך דיווח', 'ev-rtime': 'שעת דיווח', 'ev-sender': 'מוסר הדו״ח', 'ev-receiver': 'מקבל הדו״ח', 'ev-date': 'תאריך האירוע', 'ev-time': 'שעת האירוע', 'ev-location': 'מיקום האירוע', 'ev-title': 'תמצית האירוע', 'ev-desc': 'נוסח מלא' };
      for (const id in required) { if (!v(id)) { Toast.error('שדה חובה: ' + required[id]); Utils.el(id).focus(); return; } }
      const participants = Array.from(document.querySelectorAll('.ev-participant-cb:checked')).map(cb => cb.value);
      if (!participants.length) { Toast.error('יש לבחור לפחות משתתף אחד'); return; }
      const stored = ex.id ? (Storage.getById(Storage.KEYS.EVENT_REPORTS, ex.id) || {}) : {};
      const rec = Object.assign({}, stored, {
        id: ex.id || 'er_' + Utils.generateId(),
        sequenceNumber: ex.sequenceNumber || Number(Utils.el('ev-seq').value) || undefined,
        title: v('ev-title'), description: v('ev-desc'), priority: v('ev-priority'),
        reportDate: v('ev-rdate'), reportTime: v('ev-rtime'), senderName: v('ev-sender'), receiverName: v('ev-receiver'),
        eventDate: v('ev-date'), eventTime: v('ev-time'), location: v('ev-location'),
        detentionReason: v('ev-detained-for'), baseArrivalDate: v('ev-arrival'), personsPresent: v('ev-present'),
        participants, personId: participants[0],
        prisonerFileId: (pfByPerson[participants[0]] || {}).id || null,
        commanderInstructions: v('ev-commander-instr'), delivered: Utils.el('ev-delivered').checked, signer: v('ev-signer'),
        status: ex.id ? ex.status : 'open',
        updatedAt: new Date().toISOString(),
      });
      // legacy fields replaced by the single פתוח/סגור status; the internal/external type no longer exists
      delete rec.reportType; delete rec.handlingStatus; delete rec.delivered_legacy;
      if (!ex.id) rec.createdAt = new Date().toISOString();
      Storage.upsert(Storage.KEYS.EVENT_REPORTS, rec);
      Audit.log({ module: 'incarceration', action: ex.id ? 'update' : 'create', entityType: 'eventReport', entityId: rec.id, description: `${ex.id ? 'עדכון' : 'דיווח'} אירוע: ${rec.title}` });
      Modal.close();
      Toast.success(ex.id ? 'הדוח עודכן' : 'דוח האירוע נוצר בסטטוס פתוח');
      selectedId = rec.id;
      renderPage();
    };
  }

  function setStatus(id, status, msg, auditText) {
    const raw = Storage.getById(Storage.KEYS.EVENT_REPORTS, id);
    if (!raw) return;
    raw.status = status;
    delete raw.handlingStatus; delete raw.reportType;
    raw.closedAt = status === 'closed' ? new Date().toISOString() : null;
    raw.updatedAt = new Date().toISOString();
    Storage.upsert(Storage.KEYS.EVENT_REPORTS, raw);
    Audit.log({ module: 'incarceration', action: 'update', entityType: 'eventReport', entityId: id, description: `${auditText}: ${raw.title}` });
    Toast.success(msg);
    selectedId = id;
    renderPage();
  }

  window.editEvent = (id) => { const raw = Storage.getById(Storage.KEYS.EVENT_REPORTS, id); if (raw) showEventModal(raw); };
  window.closeEvent = async (id) => {
    const ok = await Modal.confirm({ title: 'סגירת אירוע', message: 'לסגור את דוח האירוע?', type: 'warning', confirmLabel: 'סגור אירוע' });
    if (ok) setStatus(id, 'closed', 'האירוע נסגר', 'אירוע נסגר');
  };
  window.reopenEvent = (id) => setStatus(id, 'open', 'האירוע נפתח מחדש', 'אירוע נפתח מחדש');

  renderPage();
};
