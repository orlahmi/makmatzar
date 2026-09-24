/* event-reports.js — event reports with drawer detail view */
'use strict';

window.Pages = window.Pages || {};

Pages['event-reports'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('incarceration')) { content.innerHTML = EmptyState.accessDenied(); return; }

  let filterStatus = '';
  let filterSearch = '';
  let selectedEvent = null;
  const canEdit = Permissions.can('editPrisoner');

  const people = Storage.getCollection(Storage.KEYS.PEOPLE);
  const pMap = Object.fromEntries(people.map(p => [p.id, p]));

  function getData() {
    let events = Storage.getCollection(Storage.KEYS.EVENT_REPORTS);
    if (filterStatus) events = events.filter(e => e.handlingStatus === filterStatus);
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      events = events.filter(e => e.title.toLowerCase().includes(q) || (e.description && e.description.toLowerCase().includes(q)));
    }
    /* Severity-first sort: unresolved → in_progress → resolved; within each by date desc */
    const statusOrder = { unresolved: 0, in_progress: 1, resolved: 2 };
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return events.sort((a, b) => {
      const sA = statusOrder[a.handlingStatus] ?? 9;
      const sB = statusOrder[b.handlingStatus] ?? 9;
      if (sA !== sB) return sA - sB;
      const pA = priorityOrder[a.priority] ?? 9;
      const pB = priorityOrder[b.priority] ?? 9;
      if (pA !== pB) return pA - pB;
      return ((b.eventDate || '') + (b.eventTime || '')).localeCompare((a.eventDate || '') + (a.eventTime || ''));
    });
  }

  function nextActionLabel(ev) {
    if (ev.handlingStatus === 'unresolved') return '<span class="next-action-pill urgent">דרוש טיפול</span>';
    if (ev.handlingStatus === 'in_progress') return '<span class="next-action-pill pending">בטיפול</span>';
    return '<span class="next-action-pill ok">מטופל</span>';
  }

  function renderPage() {
    const allEvents = Storage.getCollection(Storage.KEYS.EVENT_REPORTS);
    const data = getData();
    const unresolvedCount = allEvents.filter(e => e.handlingStatus === 'unresolved').length;
    const inProgressCount = allEvents.filter(e => e.handlingStatus === 'in_progress').length;
    const resolvedCount = allEvents.filter(e => e.handlingStatus === 'resolved').length;

    content.innerHTML = `
      <div class="page-wrapper">
        ${Utils.pageHeader('דוחות אירוע', Utils.pageMeta())}

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <button class="btn btn-secondary btn-sm" id="btn-export">${Utils.icon('download', 14)} ייצוא</button>
          ${canEdit ? `<button class="btn btn-primary" id="btn-add">${Utils.icon('plus', 14)} אירוע חדש</button>` : ''}
        </div>

        <!-- Filter panel -->
        <div class="retrieval-panel">
          <div class="retrieval-panel-header">סינון</div>
          <div class="retrieval-grid">
            <div class="form-group">
              <label class="form-label">סטטוס טיפול</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:4px">
                ${[{id:'',label:'הכל'},{id:'unresolved',label:`לא מטופל (${unresolvedCount})`},{id:'in_progress',label:'בטיפול'},{id:'resolved',label:'מטופל'}].map(s => `
                  <button class="btn btn-sm ${filterStatus === s.id ? 'btn-primary' : 'btn-secondary'}" onclick="window._evFilterStatus('${s.id}')">${Utils.escHtml(s.label)}</button>
                `).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">חיפוש</label>
              <input class="form-control" id="ev-search" placeholder="כותרת / תיאור..." value="${Utils.escHtml(filterSearch)}">
            </div>
          </div>
        </div>

        <div class="master-detail-layout" style="display:grid;grid-template-columns:${selectedEvent ? '1fr 1fr' : '1fr'};gap:var(--space-4)">
          <!-- Events list -->
          <div class="table-panel">
            <table class="data-table dense">
              <thead>
                <tr>
                  <th>פעולה נדרשת</th>
                  <th>תאריך</th>
                  <th>כותרת</th>
                  <th>עדיפות</th>
                  <th>סטטוס טיפול</th>
                  <th>סטטוס אירוע</th>
                  <th>מדווח</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${data.length === 0 ? `<tr><td colspan="8" style="padding:32px;text-align:center;color:var(--color-text-muted)">לא נמצאו אירועים</td></tr>` :
                  data.map(ev => `
                    <tr class="${selectedEvent && selectedEvent.id === ev.id ? 'row-selected' : ''} ${ev.handlingStatus === 'unresolved' ? 'row-critical' : ev.handlingStatus === 'in_progress' ? 'row-attention' : ''}" style="cursor:pointer" onclick="window.selectEvent('${ev.id}')">
                      <td>${nextActionLabel(ev)}</td>
                      <td class="td-date">${Utils.formatDate(ev.eventDate || ev.date)}</td>
                      <td>${Utils.truncate(ev.title, 32)}</td>
                      <td>${StatusBadge.renderPriority(ev.priority || ev.severity)}</td>
                      <td>${StatusBadge.render(ev.handlingStatus)}</td>
                      <td>${ev.status === 'closed' ? '<span class="badge badge-closed">סגור</span>' : '<span class="badge badge-active">פתוח</span>'}</td>
                      <td>${Utils.escHtml(ev.senderName || ev.reportedBy || '—')}</td>
                      <td>
                        ${canEdit && ev.handlingStatus !== 'resolved' ? `<button class="row-action-btn success" onclick="event.stopPropagation(); window.resolveEvent('${ev.id}')" title="סמן כמטופל">${Utils.icon('check', 12)}</button>` : ''}
                      </td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Event drawer -->
          ${selectedEvent ? renderEventDetail(selectedEvent) : ''}
        </div>

        ${Utils.classificationFooter()}
      </div>
    `;

    Utils.el('ev-search').addEventListener('input', Utils.debounce(() => { filterSearch = Utils.el('ev-search').value; renderPage(); }, 300));
    Utils.el('btn-export').onclick = () => {
      const rows = getData().map(ev => [ev.eventDate || ev.date, ev.eventTime || ev.time, ev.title, ev.priority || ev.severity, ev.handlingStatus, ev.status === 'closed' ? 'סגור' : 'פתוח', ev.senderName || ev.reportedBy]);
      Utils.exportCsv('event_reports.csv', ['תאריך', 'שעה', 'כותרת', 'עדיפות', 'סטטוס טיפול', 'סטטוס אירוע', 'מדווח'], rows);
    };

    if (Utils.el('btn-add')) Utils.el('btn-add').onclick = () => showAddEventModal();

    window._evFilterStatus = (s) => { filterStatus = s; renderPage(); };

    window.selectEvent = (id) => {
      const all = Storage.getCollection(Storage.KEYS.EVENT_REPORTS);
      selectedEvent = all.find(e => e.id === id) || null;
      renderPage();
    };

    window.resolveEvent = async (id) => {
      const ev = Storage.getCollection(Storage.KEYS.EVENT_REPORTS).find(e => e.id === id);
      if (!ev) return;
      const ok = await Modal.confirm({ title: 'סגירת אירוע', message: 'האם לסמן אירוע זה כמטופל?', type: 'success' });
      if (!ok) return;
      ev.handlingStatus = 'resolved';
      ev.resolvedAt = new Date().toISOString();
      ev.updatedAt = new Date().toISOString();
      Storage.upsert(Storage.KEYS.EVENT_REPORTS, ev);
      Audit.log({ module: 'incarceration', action: 'resolve', entityType: 'eventReport', entityId: id, description: `אירוע סומן כמטופל: ${ev.title}` });
      Toast.success('האירוע סומן כמטופל');
      if (selectedEvent && selectedEvent.id === id) selectedEvent = null;
      renderPage();
    };
  }

  function renderEventDetail(ev) {
    const esc = v => Utils.escHtml(v || '—');
    const fd = v => v ? Utils.formatDate(v) : '—';
    const resp = (ev.responders || []).map(r => {
      const p = pMap[r];
      return p ? p.firstName + ' ' + p.lastName : r;
    }).join(', ');
    const participants = (ev.participants || []).map(pid => {
      const p = pMap[pid];
      return p ? (p.firstName + ' ' + p.lastName + ' — ' + p.militaryNumber) : pid;
    }).join(', ');
    return `
      <div class="card" style="position:sticky;top:calc(var(--topbar-height) + var(--space-4))">
        <div class="card-header">
          <div class="card-title">פרטי אירוע</div>
          <button class="btn btn-ghost btn-sm" onclick="window.selectEvent('')">${Utils.icon('x', 14)}</button>
        </div>
        <div class="card-body" style="max-height:70vh;overflow-y:auto">
          <div style="margin-bottom:var(--space-4)">
            <h3 style="margin:0 0 4px;font-size:var(--font-size-md)">${esc(ev.title)}</h3>
            <div style="display:flex;gap:var(--space-2)">
              ${StatusBadge.render(ev.handlingStatus)}
              ${StatusBadge.renderPriority(ev.priority || ev.severity)}
              ${ev.status === 'closed' ? '<span class="badge badge-closed">סגור</span>' : '<span class="badge badge-active">פתוח</span>'}
            </div>
          </div>
          <div class="info-list">
            <div class="info-list-row"><div class="info-list-label">תאריך</div><div>${fd(ev.eventDate || ev.date)} ${esc(ev.eventTime || ev.time)}</div></div>
            <div class="info-list-row"><div class="info-list-label">מיקום</div><div>${esc(ev.location)}</div></div>
            <div class="info-list-row"><div class="info-list-label">מדווח</div><div>${esc(ev.senderName || ev.reportedBy)}</div></div>
            <div class="info-list-row"><div class="info-list-label">מקבל הדו"ח</div><div>${esc(ev.recipientName)}</div></div>
            <div class="info-list-row"><div class="info-list-label">משתתפים</div><div>${participants || '—'}</div></div>
            <div class="info-list-row"><div class="info-list-label">מגיבים</div><div>${resp || '—'}</div></div>
            <div class="info-list-row"><div class="info-list-label">נפגעים</div><div>${esc(String(ev.casualties || 0))}</div></div>
            <div class="info-list-row"><div class="info-list-label">הנחיות מפקד היחידה</div><div>${esc(ev.commanderInstructions)}</div></div>
            <div class="info-list-row"><div class="info-list-label">נמסר למפקד היחידה</div><div>${ev.deliveredToCommander ? 'כן' : 'לא'}</div></div>
            <div class="info-list-row"><div class="info-list-label">פרטי החותם</div><div>${esc(ev.signerDetails)}</div></div>
          </div>
          ${ev.description ? `
            <div style="margin-top:var(--space-4)">
              <div class="info-list-label">תיאור</div>
              <div style="white-space:pre-line;margin-top:4px;font-size:var(--font-size-sm);line-height:1.7">${esc(ev.description)}</div>
            </div>
          ` : ''}
          ${ev.handlingNotes ? `
            <div style="margin-top:var(--space-4)">
              <div class="info-list-label">הערות טיפול</div>
              <div style="white-space:pre-line;margin-top:4px;font-size:var(--font-size-sm)">${esc(ev.handlingNotes)}</div>
            </div>
          ` : ''}
          ${canEdit ? `
            <div style="margin-top:var(--space-4);padding-top:var(--space-4);border-top:1px solid var(--color-divider)">
              ${ev.handlingStatus !== 'resolved' ? `
              <div class="form-group">
                <label class="form-label">הערות טיפול</label>
                <textarea id="ev-handling-notes" class="form-control" rows="2">${esc(ev.handlingNotes)}</textarea>
              </div>
              ` : ''}
              <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
                ${ev.handlingStatus !== 'resolved' ? `<button class="btn btn-primary btn-sm" onclick="window.saveEventNotes('${ev.id}')">שמור הערות</button>` : ''}
                ${ev.handlingStatus !== 'resolved' ? `<button class="btn btn-success btn-sm" onclick="window.resolveEvent('${ev.id}')">סמן כמטופל</button>` : ''}
                ${ev.status !== 'closed' ? `<button class="btn btn-secondary btn-sm" onclick="window.closeEvent('${ev.id}')">סגור אירוע</button>` : `<button class="btn btn-secondary btn-sm" onclick="window.reopenEvent('${ev.id}')">פתח מחדש</button>`}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function showAddEventModal() {
    Modal.open({
      title: 'אירוע חדש',
      size: 'lg',
      body: `
        <div class="form-row form-row-2">
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">כותרת <span class="required">*</span></label>
            <input id="ev-title" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label">עדיפות</label>
            <select id="ev-priority" class="form-control">
              ${PRIORITIES.map(p => `<option value="${p.id}" ${p.id === 'high' ? 'selected' : ''}>${Utils.escHtml(p.label)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">תאריך</label>
            <input type="date" id="ev-date" class="form-control" value="${Utils.today()}">
          </div>
          <div class="form-group">
            <label class="form-label">שעה</label>
            <input type="time" id="ev-time" class="form-control">
          </div>
          <div class="form-group">
            <label class="form-label">מיקום</label>
            <input id="ev-location" class="form-control">
          </div>
          <div class="form-group">
            <label class="form-label">נפגעים</label>
            <input type="number" id="ev-casualties" class="form-control" value="0" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">מקבל הדו"ח</label>
            <input id="ev-recipient" class="form-control">
          </div>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">משתתפים / נוכחים באירוע</label>
          <div id="ev-participants-list" style="max-height:140px;overflow-y:auto;border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:8px">
            ${people.map(p => `<label style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:13px">
              <input type="checkbox" class="ev-participant-cb" value="${p.id}">
              ${Utils.escHtml(p.firstName + ' ' + p.lastName + ' — ' + p.militaryNumber)}
            </label>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">תיאור <span class="required">*</span></label>
          <textarea id="ev-desc" class="form-control" rows="4" required></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">הנחיות מפקד היחידה</label>
          <textarea id="ev-commander-instr" class="form-control" rows="2"></textarea>
        </div>
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">
              <input type="checkbox" id="ev-delivered" class="form-check-input" style="margin-left:6px">
              נמסר למפקד היחידה
            </label>
          </div>
          <div class="form-group">
            <label class="form-label">פרטי החותם</label>
            <input id="ev-signer" class="form-control">
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>
        <button class="btn btn-primary" onclick="window._saveEvent()">צור אירוע</button>
      `,
    });

    window._saveEvent = () => {
      const title = Utils.el('ev-title').value;
      const description = Utils.el('ev-desc').value;
      if (!title || !description) { Toast.error('יש למלא כותרת ותיאור'); return; }
      const u = Auth.getCurrentUser();
      const participants = Array.from(document.querySelectorAll('.ev-participant-cb:checked')).map(cb => cb.value);
      const ev = {
        id: 'er_' + Utils.generateId(),
        title,
        description,
        priority: Utils.el('ev-priority').value,
        date: Utils.el('ev-date').value,
        time: Utils.el('ev-time').value,
        location: Utils.el('ev-location').value,
        casualties: parseInt(Utils.el('ev-casualties').value) || 0,
        participants,
        recipientName: Utils.el('ev-recipient').value,
        commanderInstructions: Utils.el('ev-commander-instr').value,
        deliveredToCommander: Utils.el('ev-delivered').checked,
        signerDetails: Utils.el('ev-signer').value,
        handlingStatus: 'unresolved',
        status: 'open',
        reportedBy: u ? u.firstName + ' ' + u.lastName : '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      Storage.upsert(Storage.KEYS.EVENT_REPORTS, ev);
      Audit.log({ module: 'incarceration', action: 'create', entityType: 'eventReport', entityId: ev.id, description: `דיווח אירוע: ${title}` });
      Modal.close();
      Toast.success('האירוע דווח');
      selectedEvent = ev;
      renderPage();
    };
  }

  window.closeEvent = (id) => {
    const ev = Storage.getCollection(Storage.KEYS.EVENT_REPORTS).find(e => e.id === id);
    if (!ev) return;
    ev.status = 'closed';
    ev.updatedAt = new Date().toISOString();
    Storage.upsert(Storage.KEYS.EVENT_REPORTS, ev);
    Audit.log({ module: 'incarceration', action: 'update', entityType: 'eventReport', entityId: id, description: `אירוע נסגר: ${ev.title}` });
    Toast.success('האירוע נסגר');
    selectedEvent = ev;
    renderPage();
  };

  window.reopenEvent = (id) => {
    const ev = Storage.getCollection(Storage.KEYS.EVENT_REPORTS).find(e => e.id === id);
    if (!ev) return;
    ev.status = 'open';
    ev.updatedAt = new Date().toISOString();
    Storage.upsert(Storage.KEYS.EVENT_REPORTS, ev);
    Audit.log({ module: 'incarceration', action: 'update', entityType: 'eventReport', entityId: id, description: `אירוע נפתח מחדש: ${ev.title}` });
    Toast.info('האירוע נפתח מחדש');
    selectedEvent = ev;
    renderPage();
  };

  window.saveEventNotes = (id) => {
    const ev = Storage.getCollection(Storage.KEYS.EVENT_REPORTS).find(e => e.id === id);
    if (!ev) return;
    const notesEl = Utils.el('ev-handling-notes');
    if (!notesEl) return;
    ev.handlingNotes = notesEl.value;
    ev.handlingStatus = 'in_progress';
    ev.updatedAt = new Date().toISOString();
    Storage.upsert(Storage.KEYS.EVENT_REPORTS, ev);
    Audit.log({ module: 'incarceration', action: 'update', entityType: 'eventReport', entityId: id, description: `עדכון הערות אירוע: ${ev.title}` });
    Toast.success('ההערות נשמרו');
    selectedEvent = ev;
    renderPage();
  };

  renderPage();
};
