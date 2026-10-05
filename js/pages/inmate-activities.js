/* inmate-activities.js — monthly calendar + daily agenda */
'use strict';

window.Pages = window.Pages || {};

Pages['inmate-activities'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('incarceration')) { content.innerHTML = EmptyState.accessDenied(); return; }

  const today = Utils.today();
  let viewDate = new Date();
  let selectedDate = today;
  const canEdit = Permissions.can('editPrisoner');

  let filterCompany = '';
  let filterType = '';

  const people = Storage.getCollection(Storage.KEYS.PEOPLE);
  const pMap = Object.fromEntries(people.map(p => [p.id, p]));
  const prisonerFiles = Storage.getCollection(Storage.KEYS.PRISONER_FILES);
  const pfMap = Object.fromEntries(prisonerFiles.map(pf => [pf.id, pf]));

  const plannedOf = a => a.time || a.plannedDeparture || '';
  const typeLabel = a => a.activityTypeLabel || (INMATE_ACTIVITY_TYPES.find(t => t.id === a.activityType) || {}).label || a.activityType || '—';

  function getParticipants(a) {
    return a.participants && a.participants.length ? a.participants : (a.prisonerFileId ? [a.prisonerFileId] : []);
  }

  function matchesFilters(a) {
    if (filterType && a.activityType !== filterType) return false;
    if (filterCompany) {
      const parts = getParticipants(a);
      const inCompany = parts.some(pfid => {
        const pf = pfMap[pfid];
        return pf && pf.company === filterCompany;
      });
      if (!inCompany) return false;
    }
    return true;
  }

  function getActivities(date) {
    const oneOff = Storage.getCollection(Storage.KEYS.INMATE_ACTIVITIES)
      .filter(a => a.date === date && !a.deleted)
      .filter(matchesFilters);
    const recurring = getRecurringOccurrences(date).filter(matchesFilters);
    return oneOff.concat(recurring).sort((a, b) => plannedOf(a).localeCompare(plannedOf(b)));
  }

  function getMonthActivities(year, month) {
    const prefix = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const oneOff = Storage.getCollection(Storage.KEYS.INMATE_ACTIVITIES).filter(a => a.date && a.date.startsWith(prefix) && !a.deleted).filter(matchesFilters);
    const recurring = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${prefix}-${String(d).padStart(2, '0')}`;
      recurring.push(...getRecurringOccurrences(dateStr).filter(matchesFilters));
    }
    return oneOff.concat(recurring);
  }

  function getRecurringDefs() {
    return Storage.getCollection(Storage.KEYS.INMATE_RECURRING_ACTIVITIES).filter(r => r.active !== false);
  }

  function getRecurringOccurrences(dateStr) {
    const dow = new Date(dateStr + 'T00:00:00').getDay();
    return getRecurringDefs()
      .filter(r => (r.daysOfWeek || []).includes(dow))
      .filter(r => (!r.startDate || dateStr >= r.startDate) && (!r.endDate || dateStr <= r.endDate))
      .map(r => ({
        id: 'recur_' + r.id + '_' + dateStr,
        recurringId: r.id,
        isRecurring: true,
        activityType: r.activityType,
        participants: r.participants || [],
        date: dateStr,
        time: r.time || '',
        duration: r.duration || '',
        location: r.location || '',
        supervisor: '',
        notes: r.notes || '',
      }));
  }

  function renderPage() {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthName = viewDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    const monthActs = getMonthActivities(year, month);
    const dayActs = getActivities(selectedDate);

    // Build calendar grid
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay(); // 0=Sun
    const daysInMonth = lastDay.getDate();

    const actsByDay = {};
    monthActs.forEach(a => {
      const d = a.date;
      if (!actsByDay[d]) actsByDay[d] = 0;
      actsByDay[d]++;
    });

    let calCells = '';
    let col = 0;
    // Pad start
    for (let i = 0; i < startDow; i++) { calCells += '<div class="cal-day cal-day-empty"></div>'; col++; }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === today;
      const isSelected = dateStr === selectedDate;
      const count = actsByDay[dateStr] || 0;
      calCells += `
        <div class="cal-day ${isToday ? 'cal-day-today' : ''} ${isSelected ? 'cal-day-selected' : ''}"
             onclick="window._selectCalDate('${dateStr}')">
          <div class="cal-day-num">${d}</div>
          ${count > 0 ? `<div class="cal-day-dot-row"><span class="cal-dot">${count}</span></div>` : ''}
        </div>
      `;
      col++;
    }

    const selectedLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    function participantNames(a) {
      const parts = getParticipants(a);
      if (!parts.length) return '—';
      const names = parts.map(pfid => {
        const pf = pfMap[pfid];
        const p = pf ? pMap[pf.personId] : null;
        return p ? (p.firstName + ' ' + p.lastName) : '—';
      });
      return names.join(', ');
    }

    content.innerHTML = `
      <div class="page-wrapper">
        ${Utils.pageHeader('פעילויות', Utils.pageMeta())}

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <button class="btn btn-secondary btn-sm" id="btn-today">עבור להיום</button>
          <button class="btn btn-secondary btn-sm" id="btn-permit">${Utils.icon('report', 14)} הפקת אישורי מעבר</button>
          <button class="btn btn-secondary btn-sm" id="btn-export">${Utils.icon('download', 14)} ייצוא</button>
          <button class="btn btn-secondary btn-sm" id="btn-recurring">${Utils.icon('refresh', 14)} פעילות קבועה</button>
          ${canEdit ? `<button class="btn btn-primary" id="btn-add-act">${Utils.icon('plus', 14)} פעילות חדשה</button>` : ''}
        </div>

        <!-- Filter panel -->
        <div class="retrieval-panel" style="margin-bottom:16px">
          <div class="retrieval-panel-header">סינון</div>
          <div class="retrieval-grid">
            <div class="form-group">
              <label class="form-label">פלוגה</label>
              <select class="form-control" id="f-company">
                <option value="">הכל</option>
                ${DETENTION_COMPANIES.map(c => `<option value="${c}" ${filterCompany === c ? 'selected' : ''}>${Utils.escHtml(c)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">פעילות</label>
              <select class="form-control" id="f-type">
                <option value="">הכל</option>
                ${INMATE_ACTIVITY_TYPES.map(t => `<option value="${t.id}" ${filterType === t.id ? 'selected' : ''}>${Utils.escHtml(t.label)}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="calendar-layout" style="display:grid;grid-template-columns:2fr 1fr;gap:var(--space-6)">
          <!-- Calendar -->
          <div class="card">
            <div class="card-header" style="justify-content:space-between">
              <button class="btn btn-ghost btn-sm" id="cal-prev">${Utils.icon('chevronRight', 16)}</button>
              <div class="card-title">${Utils.escHtml(monthName)}</div>
              <button class="btn btn-ghost btn-sm" id="cal-next">${Utils.icon('chevronLeft', 16)}</button>
            </div>
            <div class="card-body">
              <div class="cal-header-row" style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px">
                ${['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => `<div style="text-align:center;font-size:var(--font-size-xs);font-weight:600;padding:4px;color:var(--color-text-muted)">${d}</div>`).join('')}
              </div>
              <div class="cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">
                ${calCells}
              </div>
            </div>
          </div>

          <!-- Daily Agenda -->
          <div class="card">
            <div class="card-header">
              <div class="card-title" style="font-size:var(--font-size-sm)">${Utils.escHtml(selectedLabel)}</div>
              <span class="badge badge-info">${dayActs.length} פעילויות</span>
            </div>
            <div class="card-body" style="padding:0;max-height:520px;overflow-y:auto">
              ${dayActs.length === 0 ? '<div class="empty-state-desc" style="padding:24px;text-align:center">אין פעילויות ביום זה</div>' :
                dayActs.map(a => {
                  return `
                    <div class="agenda-item" style="padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-divider)">
                      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                        <strong>${Utils.escHtml(plannedOf(a) || '—')}</strong>
                        <span>
                          ${a.isRecurring ? `<span class="badge badge-purple" title="פעילות קבועה">${Utils.icon('refresh', 10)} קבועה</span>` : ''}
                          <span class="badge badge-info">${Utils.escHtml(typeLabel(a))}</span>
                        </span>
                      </div>
                      <div style="font-size:var(--font-size-sm)">${Utils.escHtml(participantNames(a))}</div>
                      <div style="font-size:var(--font-size-xs);color:var(--color-text-muted)">${Utils.escHtml(a.location || '')} ${a.notes ? '• ' + Utils.truncate(a.notes, 40) : ''}</div>
                    </div>
                  `;
                }).join('')
              }
            </div>
          </div>
        </div>

        <!-- Daily table — one row per participant (legacy columns) -->
        <div class="table-panel" style="margin-top:var(--space-6)">
          <div class="table-panel-header"><span>פעילויות כלואים — ${Utils.escHtml(selectedLabel)}</span><span style="font-size:12px;color:var(--color-text-muted)">${dayActs.length} פעילויות</span></div>
          <div style="overflow-x:auto">
            <table class="data-table">
              <thead><tr><th>מספר אישי</th><th>שם פרטי</th><th>שם משפחה</th><th>מיקום בכלא</th><th>סוג פעילות</th><th>ז. מתוכננת</th><th>ז. בפועל</th><th>ת. חזרה</th><th>ח. בפועל</th><th>פעולות</th></tr></thead>
              <tbody>
                ${dayActs.length === 0 ? '<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--color-text-muted)">אין פעילויות ביום זה</td></tr>' :
                  dayActs.map(a => {
                    const parts = getParticipants(a);
                    const list = parts.length ? parts : [null];
                    return list.map((pfid, i) => {
                      const pf = pfid ? pfMap[pfid] : null;
                      const p = pf ? pMap[pf.personId] : null;
                      return `<tr>
                        <td class="td-id">${Utils.escHtml(p ? p.militaryNumber : '—')}</td>
                        <td>${Utils.escHtml(p ? p.firstName : '—')}</td>
                        <td>${Utils.escHtml(p ? p.lastName : '—')}</td>
                        <td>${Utils.escHtml(pf ? (pf.cell || pf.location || '—') : '—')}</td>
                        <td>${Utils.escHtml(typeLabel(a))}${a.isRecurring ? ' <span class="badge badge-purple" style="font-size:10px">קבועה</span>' : ''}${parts.length > 1 ? ` <span class="badge badge-info" style="font-size:10px">${parts.length} משתתפים</span>` : ''}</td>
                        <td>${Utils.escHtml(plannedOf(a) || '—')}</td>
                        <td>${Utils.escHtml(a.actualDeparture || '—')}</td>
                        <td>${Utils.escHtml(a.plannedReturn || a.returnTime || '—')}</td>
                        <td>${Utils.escHtml(a.actualReturn || '—')}</td>
                        <td>${i === 0 && canEdit && !a.isRecurring ? `<button class="row-action-btn" title="עריכה" onclick="window.editActivity('${a.id}')">${Utils.icon('edit', 12)}</button><button class="row-action-btn danger" title="מחיקה" onclick="window.deleteActivity('${a.id}')">${Utils.icon('trash', 12)}</button>` : ''}</td>
                      </tr>`;
                    }).join('');
                  }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        ${renderPermitHistory()}

        ${Utils.classificationFooter()}
      </div>
    `;

    // Calendar navigation
    Utils.el('cal-prev').onclick = () => { viewDate.setMonth(viewDate.getMonth() - 1); renderPage(); };
    Utils.el('cal-next').onclick = () => { viewDate.setMonth(viewDate.getMonth() + 1); renderPage(); };
    Utils.el('f-company').onchange = () => { filterCompany = Utils.el('f-company').value; renderPage(); };
    Utils.el('f-type').onchange = () => { filterType = Utils.el('f-type').value; renderPage(); };
    Utils.el('btn-export').onclick = () => {
      const acts = getMonthActivities(year, month);
      const rows = acts.map(a => [a.date, a.time, (INMATE_ACTIVITY_TYPES.find(t => t.id === a.activityType) || {}).label || a.activityType, participantNames(a), a.location, a.supervisor, a.notes]);
      Utils.exportCsv(`activities_${year}_${month + 1}.csv`, ['תאריך', 'שעה', 'סוג', 'משתתפים', 'מיקום', 'משגיח', 'הערות'], rows);
    };

    if (Utils.el('btn-add-act')) {
      Utils.el('btn-add-act').onclick = () => showAddActivityModal();
    }
    Utils.el('btn-recurring').onclick = () => showRecurringManagerModal();
    Utils.el('btn-permit').onclick = () => openPermitModal();
    Utils.el('btn-today').onclick = () => { viewDate = new Date(); selectedDate = today; renderPage(); };
    window.editActivity = (id) => { const act = Storage.getById(Storage.KEYS.INMATE_ACTIVITIES, id); if (act) showAddActivityModal(act); };

    window.deleteActivity = async (id) => {
      const ok = await Modal.confirm({ title: 'מחיקת פעילות', message: 'האם למחוק פעילות זו?', type: 'danger' });
      if (!ok) return;
      Storage.softDelete(Storage.KEYS.INMATE_ACTIVITIES, id);
      Toast.success('הפעילות נמחקה');
      renderPage();
    };
  }

  function showAddActivityModal(existing) {
    const ex = existing || {};
    const exParts = ex.id ? getParticipants(ex) : [];
    const activePrisoners = prisonerFiles.filter(pf => pf.status === 'active' || exParts.includes(pf.id));
    Modal.open({
      title: ex.id ? 'עריכת פעילות' : 'פעילות חדשה',
      size: 'lg',
      body: `
        <div class="form-row form-row-2">
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">משתתפים (אפשר לבחור כמה) <span class="required">*</span></label>
            <input id="act-part-search" class="form-control" placeholder="חיפוש כלוא לפי שם / מ.א..." style="margin-bottom:6px">
            <div id="act-participants-list" style="max-height:160px;overflow-y:auto;border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:8px">
              ${activePrisoners.map(pf => {
                const p = pMap[pf.personId];
                return `<label style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:13px">
                  <input type="checkbox" class="act-participant-cb" value="${pf.id}" ${exParts.includes(pf.id) ? 'checked' : ''}>
                  <span class="act-part-label">${p ? Utils.escHtml(p.firstName + ' ' + p.lastName + ' — ' + p.militaryNumber) : (pf.fileNumber || pf.id)}</span>
                </label>`;
              }).join('') || '<div style="color:var(--color-text-muted);font-size:13px">אין כלואים פעילים</div>'}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">סוג פעילות <span class="required">*</span></label>
            <select id="act-type" class="form-control">
              ${INMATE_ACTIVITY_TYPES.map(t => `<option value="${t.id}" ${ex.activityType === t.id ? 'selected' : ''}>${Utils.escHtml(t.label)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">תאריך <span class="required">*</span></label>
            <input type="date" id="act-date" class="form-control" value="${ex.date || selectedDate}">
          </div>
          <div class="form-group">
            <label class="form-label">ז. מתוכננת</label>
            <input type="time" id="act-time" class="form-control" value="${plannedOf(ex)}">
          </div>
          <div class="form-group"><label class="form-label">ז. בפועל</label><input type="time" id="act-actual-dep" class="form-control" value="${ex.actualDeparture || ''}"></div>
          <div class="form-group"><label class="form-label">ת. חזרה</label><input type="time" id="act-planned-ret" class="form-control" value="${ex.plannedReturn || ''}"></div>
          <div class="form-group"><label class="form-label">ח. בפועל</label><input type="time" id="act-actual-ret" class="form-control" value="${ex.actualReturn || ''}"></div>
          <div class="form-group">
            <label class="form-label">מיקום</label>
            <select id="act-location" class="form-control">
              <option value="">בחר מיקום</option>
              ${INMATE_ACTIVITY_LOCATIONS.map(l => `<option value="${l.id || l}" ${ex.location === (l.id || l) ? 'selected' : ''}>${Utils.escHtml(l.label || l)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">משגיח</label>
            <input id="act-supervisor" class="form-control" value="${Utils.escHtml(ex.supervisor || ex.escortName || '')}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">הערות</label>
          <textarea id="act-notes" class="form-control" rows="2">${Utils.escHtml(ex.notes || '')}</textarea>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>
        <button class="btn btn-primary" onclick="window._saveActivity()">שמור</button>
      `,
    });

    Utils.el('act-part-search').oninput = () => {
      const q = Utils.el('act-part-search').value.trim();
      document.querySelectorAll('#act-participants-list label').forEach(l => { l.style.display = !q || l.textContent.includes(q) ? '' : 'none'; });
    };

    window._saveActivity = () => {
      const participants = Array.from(document.querySelectorAll('.act-participant-cb:checked')).map(cb => cb.value);
      const date = Utils.el('act-date').value;
      const activityType = Utils.el('act-type').value;
      if (!participants.length) { Toast.error('יש לבחור לפחות משתתף אחד'); return; }
      if (!date) { Toast.error('יש לבחור תאריך'); return; }
      if (!Utils.el('act-time').value) { Toast.error('יש להזין זמן מתוכנן'); return; }

      // ONE activity record with a participants list (never one record per participant)
      const act = Object.assign({}, ex, {
        id: ex.id || 'ia_' + Utils.generateId(),
        participants,
        prisonerFileId: participants[0],
        activityType,
        activityTypeLabel: (INMATE_ACTIVITY_TYPES.find(t => t.id === activityType) || {}).label,
        date,
        time: Utils.el('act-time').value,
        plannedDeparture: Utils.el('act-time').value,
        actualDeparture: Utils.el('act-actual-dep').value || null,
        plannedReturn: Utils.el('act-planned-ret').value || null,
        actualReturn: Utils.el('act-actual-ret').value || null,
        location: Utils.el('act-location').value || '',
        supervisor: Utils.el('act-supervisor').value || '',
        notes: Utils.el('act-notes').value || '',
        createdAt: ex.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      Storage.upsert(Storage.KEYS.INMATE_ACTIVITIES, act);
      Audit.log({ module: 'incarceration', action: ex.id ? 'update' : 'create', entityType: 'inmateActivity', entityId: act.id, description: `פעילות כלוא: ${activityType} (${date}) — ${participants.length} משתתפים` });
      Modal.close();
      Toast.success(ex.id ? 'הפעילות עודכנה' : 'הפעילות נוספה');
      selectedDate = date;
      renderPage();
    };
  }

  function showRecurringManagerModal() {
    function renderList() {
      const defs = Storage.getCollection(Storage.KEYS.INMATE_RECURRING_ACTIVITIES);
      const dowLabels = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
      const listHtml = defs.length === 0
        ? '<div style="color:var(--color-text-muted);font-size:13px;padding:12px 0">אין פעילויות קבועות מוגדרות</div>'
        : `<table class="data-table" style="font-size:13px">
            <thead><tr><th>פעילות</th><th>ימים</th><th>שעה</th><th>משתתפים</th><th>תאריכים</th><th>פעיל</th><th></th></tr></thead>
            <tbody>
              ${defs.map(r => `<tr>
                <td>${Utils.escHtml((INMATE_ACTIVITY_TYPES.find(t => t.id === r.activityType) || {}).label || r.activityType)}</td>
                <td>${(r.daysOfWeek || []).map(d => dowLabels[d]).join(',')}</td>
                <td>${Utils.escHtml(r.time || '—')}</td>
                <td>${(r.participants || []).length}</td>
                <td>${Utils.formatDate(r.startDate)}${r.endDate ? ' – ' + Utils.formatDate(r.endDate) : ''}</td>
                <td>${r.active !== false ? '<span class="badge badge-success">פעיל</span>' : '<span class="badge badge-inactive">לא פעיל</span>'}</td>
                <td>
                  <button type="button" class="row-action-btn" onclick="window._toggleRecurring('${r.id}')" title="הפעל/כבה">${Utils.icon('check', 12)}</button>
                  <button type="button" class="row-action-btn danger" onclick="window._deleteRecurring('${r.id}')">${Utils.icon('trash', 12)}</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>`;

      const activePrisoners = prisonerFiles.filter(pf => pf.status === 'active');

      Modal.open({
        title: 'פעילויות קבועות',
        size: 'lg',
        body: `
          <div id="recurring-list">${listHtml}</div>
          <hr style="margin:16px 0;border-color:var(--color-divider)">
          <div style="font-weight:600;margin-bottom:8px">הוספת פעילות קבועה</div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">פעילות</label>
              <select id="rec-type" class="form-control">
                ${INMATE_ACTIVITY_TYPES.map(t => `<option value="${t.id}">${Utils.escHtml(t.label)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">שעה <span class="required">*</span></label>
              <input type="time" id="rec-time" class="form-control">
            </div>
            <div class="form-group">
              <label class="form-label">משך (דק')</label>
              <input type="number" id="rec-duration" class="form-control" min="5" value="30">
            </div>
            <div class="form-group">
              <label class="form-label">תאריך התחלה</label>
              <input type="date" id="rec-start" class="form-control" value="${Utils.today()}">
            </div>
            <div class="form-group">
              <label class="form-label">תאריך סיום (אופציונלי)</label>
              <input type="date" id="rec-end" class="form-control">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">ימים בשבוע</label>
            <div style="display:flex;gap:10px">
              ${dowLabels.map((l, i) => `<label style="display:flex;flex-direction:column;align-items:center;font-size:12px;gap:2px"><input type="checkbox" class="rec-dow-cb" value="${i}">${l}</label>`).join('')}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">משתתפים</label>
            <div style="max-height:120px;overflow-y:auto;border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:8px">
              ${activePrisoners.map(pf => {
                const p = pMap[pf.personId];
                return `<label style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:13px">
                  <input type="checkbox" class="rec-participant-cb" value="${pf.id}">
                  ${p ? Utils.escHtml(p.firstName + ' ' + p.lastName + ' — ' + (pf.fileNumber || pf.id)) : (pf.fileNumber || pf.id)}
                </label>`;
              }).join('') || '<div style="color:var(--color-text-muted);font-size:13px">אין כלואים פעילים</div>'}
            </div>
          </div>
        `,
        footer: `
          <button type="button" class="btn btn-secondary" onclick="Modal.close()">סגור</button>
          <button type="button" class="btn btn-primary" id="rec-save-btn">הוסף פעילות קבועה</button>
        `,
      });

      setTimeout(() => {
        const saveBtn = Utils.el('rec-save-btn');
        if (saveBtn) saveBtn.onclick = saveRecurring;
      }, 30);
    }

    function saveRecurring() {
      const daysOfWeek = Array.from(document.querySelectorAll('.rec-dow-cb:checked')).map(cb => parseInt(cb.value, 10));
      const participants = Array.from(document.querySelectorAll('.rec-participant-cb:checked')).map(cb => cb.value);
      if (!Utils.el('rec-type').value) { Toast.error('יש לבחור סוג פעילות'); return; }
      if (!daysOfWeek.length) { Toast.error('יש לבחור לפחות יום אחד בשבוע'); return; }
      if (!participants.length) { Toast.error('יש לבחור לפחות משתתף אחד'); return; }
      if (!Utils.el('rec-time').value) { Toast.error('יש להזין שעה'); return; }
      if (!Utils.el('rec-start').value) { Toast.error('יש להזין תאריך התחלה'); return; }
      const endV = Utils.el('rec-end').value;
      if (endV && endV < Utils.el('rec-start').value) { Toast.error('תאריך הסיום לא יכול להיות לפני תאריך ההתחלה'); return; }
      const dur = Utils.el('rec-duration').value;
      if (dur && Number(dur) <= 0) { Toast.error('משך לא תקין'); return; }
      const sig = (t, days, parts, st, en, tm) => [t, days.slice().sort().join(), parts.slice().sort().join(), st, en || '', tm].join('|');
      const newSig = sig(Utils.el('rec-type').value, daysOfWeek, participants, Utils.el('rec-start').value, endV, Utils.el('rec-time').value);
      if (Storage.getCollection(Storage.KEYS.INMATE_RECURRING_ACTIVITIES).some(r => sig(r.activityType, r.daysOfWeek || [], r.participants || [], r.startDate, r.endDate, r.time) === newSig)) { Toast.error('פעילות קבועה זהה כבר קיימת'); return; }
      const def = {
        id: 'rec_' + Utils.generateId(),
        activityType: Utils.el('rec-type').value,
        time: Utils.el('rec-time').value || '',
        duration: Utils.el('rec-duration').value || '',
        startDate: Utils.el('rec-start').value || Utils.today(),
        endDate: Utils.el('rec-end').value || null,
        daysOfWeek,
        participants,
        active: true,
        createdAt: new Date().toISOString(),
      };
      Storage.upsert(Storage.KEYS.INMATE_RECURRING_ACTIVITIES, def);
      Audit.log({ module: 'incarceration', action: 'create', entityType: 'recurringActivity', entityId: def.id, description: `פעילות קבועה חדשה: ${def.activityType}` });
      Toast.success('הפעילות הקבועה נוספה');
      renderList();
    }

    window._toggleRecurring = (id) => {
      const def = Storage.getById(Storage.KEYS.INMATE_RECURRING_ACTIVITIES, id);
      if (!def) return;
      def.active = def.active === false ? true : false;
      Storage.upsert(Storage.KEYS.INMATE_RECURRING_ACTIVITIES, def);
      renderList();
    };

    window._deleteRecurring = async (id) => {
      const ok = await Modal.confirm({ title: 'מחיקת פעילות קבועה', message: 'האם למחוק פעילות קבועה זו?', type: 'danger' });
      if (!ok) return;
      const all = Storage.getCollection(Storage.KEYS.INMATE_RECURRING_ACTIVITIES).filter(r => r.id !== id);
      Storage.setCollection(Storage.KEYS.INMATE_RECURRING_ACTIVITIES, all);
      Toast.success('הפעילות הקבועה נמחקה');
      renderList();
    };

    renderList();
  }


  // ================= הפקת אישורי מעבר (per legacy Alon flow) =================
  // Permit types (legacy): "אישור לחייל ספציפי" = personal permit for one selected prisoner;
  // "אישור לפעילות" = one shared permit for all prisoners leaving for the same activity on the selected day.
  // Extra options (legacy): פעילות חריגה (קמ"ן instead of רמ"ן + prison commander signature), copies 1–20.
  function permitRows(date) {
    const acts = getActivities(date);
    const rows = [];
    acts.forEach(a => {
      getParticipants(a).forEach(pfid => {
        const pf = pfMap[pfid]; const p = pf ? pMap[pf.personId] : null;
        if (!p) return;
        const planned = plannedOf(a);
        rows.push({
          key: a.id + '|' + pfid, activityId: a.id, id: p.militaryNumber, first: p.firstName, last: p.lastName, rank: (RANK_MAP[p.rank] || {}).label || '',
          type: typeLabel(a), planned: planned === 'כל היום' ? '' : planned, returnPlanned: a.plannedReturn || a.returnTime || '',
          status: pf.prisonerType || 'אסיר', rams: pf.rams || '', notes: a.notes || '', location: pf.cell || pf.location || '',
          company: pf.detentionCompany || pf.company || '', baseId: pf.baseId,
        });
      });
    });
    return rows;
  }
  const groupByType = rows => rows.reduce((g, r) => { (g[r.type] = g[r.type] || []).push(r); return g; }, {});

  function nextPermitNumber() {
    const nums = Storage.getCollection(Storage.KEYS.PASS_PERMITS).map(x => parseInt(x.permitNumber, 10) || 0);
    return String(Math.max(100000, ...nums) + 1);
  }

  function openPermitModal() {
    const date = selectedDate; const rows = permitRows(date);
    if (!rows.length) { Toast.error('אין רשומות ביום שנבחר להפקת אישורי מעבר'); return; }
    const groups = groupByType(rows); const types = Object.keys(groups).sort();
    Modal.open({
      title: 'הפקת אישורי מעבר',
      size: 'lg',
      body: `
        <div class="form-group"><label class="form-label">סוג אישור <span class="required">*</span></label>
          <label style="display:flex;gap:8px;align-items:flex-start;margin:6px 0"><input type="radio" name="permitType" value="soldier" checked>
            <span><strong>אישור לחייל ספציפי</strong><br><small style="color:var(--color-text-muted)">אישור מעבר אישי לכלוא שנבחר מהטבלה</small></span></label>
          <label style="display:flex;gap:8px;align-items:flex-start;margin:6px 0"><input type="radio" name="permitType" value="activity">
            <span><strong>אישור לפעילות</strong><br><small style="color:var(--color-text-muted)">אישור מעבר משותף לכל הכלואים היוצאים לאותה פעילות</small></span></label></div>
        <div class="form-group" id="pm-soldier-field"><label class="form-label">בחירת כלוא <span class="required">*</span></label>
          <select id="pm-soldier" class="form-control">${rows.map((r, i) => `<option value="${i}">${Utils.escHtml(r.id + ' — ' + r.first + ' ' + r.last + ' (' + r.type + ')')}</option>`).join('')}</select></div>
        <div class="form-group" id="pm-activity-field" style="display:none"><label class="form-label">בחירת פעילות <span class="required">*</span></label>
          <div style="display:flex;gap:8px"><select id="pm-activity" class="form-control">${types.map(t => `<option value="${Utils.escHtml(t)}">${Utils.escHtml(t)} (${groups[t].length} כלואים)</option>`).join('')}</select>
          <button type="button" class="btn btn-secondary btn-sm" id="pm-detail-btn">פירוט כלואים</button></div>
          <div id="pm-detail" style="display:none;margin-top:8px"></div></div>
        <label style="display:flex;gap:8px;margin:10px 0"><input type="checkbox" id="pm-exceptional"> פעילות חריגה — אישור קמ״ן (במקום רמ״ן) עם חתימת מפקד הכלא</label>
        <div class="form-group" style="max-width:200px"><label class="form-label">כמות עותקים להדפסה</label><input type="number" id="pm-copies" class="form-control" min="1" max="20" value="1"></div>
        <div id="pm-preview" style="margin-top:10px;padding:10px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-page-bg);font-size:13px"></div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" id="pm-generate">הפקה וצפייה בתצוגה מקדימה</button>`,
    });
    const $ = Utils.el; const typeVal = () => document.querySelector('input[name=permitType]:checked').value;
    const chosen = () => typeVal() === 'soldier' ? [rows[Number($('pm-soldier').value)]].filter(Boolean) : (groups[$('pm-activity').value] || []);
    function refresh() {
      const sol = typeVal() === 'soldier'; $('pm-soldier-field').style.display = sol ? '' : 'none'; $('pm-activity-field').style.display = sol ? 'none' : '';
      const ch = chosen(); const purpose = ch[0] ? ch[0].type : '—';
      $('pm-preview').innerHTML = `<strong>פורמט: אישור מעבר ודוח מעקב</strong><br>תאריך: ${Utils.formatDate(date)} · לצורך: ${Utils.escHtml(purpose)} · ${ch.length} כלואים<br>${$('pm-exceptional').checked ? 'חתימת קמ״ן + חתימת מפקד הכלא' : 'חתימת רמ״ן'} · ${Utils.escHtml($('pm-copies').value || '1')} עותקים להדפסה`;
    }
    function detail() {
      const ch = groups[$('pm-activity').value] || [];
      $('pm-detail').innerHTML = `<table class="data-table"><thead><tr><th>מס״ד</th><th>מספר אישי</th><th>שם פרטי</th><th>שם משפחה</th><th>מיקום בכלא</th></tr></thead><tbody>${ch.map((r, i) => `<tr><td>${i + 1}</td><td>${Utils.escHtml(r.id)}</td><td>${Utils.escHtml(r.first)}</td><td>${Utils.escHtml(r.last)}</td><td>${Utils.escHtml(r.location || '—')}</td></tr>`).join('')}</tbody></table>`;
    }
    document.querySelectorAll('input[name=permitType]').forEach(r => r.onchange = () => { $('pm-detail').style.display = 'none'; $('pm-detail-btn').textContent = 'פירוט כלואים'; refresh(); });
    ['pm-soldier', 'pm-exceptional', 'pm-copies'].forEach(id => { $(id).onchange = refresh; $(id).oninput = refresh; });
    $('pm-activity').onchange = () => { $('pm-detail').style.display = 'none'; $('pm-detail-btn').textContent = 'פירוט כלואים'; refresh(); };
    $('pm-detail-btn').onclick = () => { const d = $('pm-detail'); const show = d.style.display === 'none'; if (show) detail(); d.style.display = show ? '' : 'none'; $('pm-detail-btn').textContent = show ? 'הסתר פירוט' : 'פירוט כלואים'; };
    refresh();

    $('pm-generate').onclick = () => {
      const ch = chosen();
      if (!ch.length) { Toast.error(typeVal() === 'soldier' ? 'יש לבחור כלוא' : 'יש לבחור פעילות'); return; }
      const copiesRaw = Number($('pm-copies').value);
      if (!Number.isInteger(copiesRaw) || copiesRaw < 1 || copiesRaw > 20) { Toast.error('כמות עותקים חייבת להיות מספר שלם בין 1 ל-20'); return; }
      const u = Auth.getCurrentUser();
      const permit = {
        id: 'pm_' + Utils.generateId(), permitNumber: nextPermitNumber(), permitType: typeVal(), exceptional: $('pm-exceptional').checked,
        purpose: ch[0].type, date, copies: copiesRaw,
        departureTime: ch.length === 1 ? ch[0].planned : '', returnTime: ch.length === 1 ? ch[0].returnPlanned : '',
        soldiers: ch.map(r => ({ id: r.id, first: r.first, last: r.last, rank: r.rank, status: r.status, rams: r.rams, notes: r.notes || r.location, company: r.company, baseId: r.baseId })),
        createdBy: u ? u.firstName + ' ' + u.lastName : '', createdAt: new Date().toISOString(),
      };
      Storage.upsert(Storage.KEYS.PASS_PERMITS, permit);
      Audit.log({ module: 'incarceration', action: 'create', entityType: 'passPermit', entityId: permit.id, description: `הפקת אישור מעבר ${permit.permitNumber} — ${permit.purpose} (${permit.soldiers.length} כלואים)` });
      Modal.close(); renderPage(); showPermitPreview(permit.id);
    };
  }

  function esc(v) { return Utils.escHtml(v == null ? '' : String(v)); }
  function staffSigTable(title) {
    return `<p class="sig-title">${esc(title)}</p><table class="form-table sig-table"><thead><tr><th>מספר אישי</th><th>דרגה</th><th>שם משפחה</th><th>שם פרטי</th><th>חתימה</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>`;
  }
  function permitPageHtml(p, copyNum) {
    const companies = [...new Set(p.soldiers.map(s => s.company).filter(Boolean))].join(', ');
    const base = (BASE_MAP[(p.soldiers[0] || {}).baseId] || {}).name || '';
    const rowsHtml = p.soldiers.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.id)}</td><td>${esc(s.first + ' ' + s.last)}</td><td>${esc(s.status || 'אסיר')}</td><td>${esc(s.rams)}</td><td>${esc(s.notes)}</td></tr>`).join('');
    const authLabel = p.exceptional ? 'חתימת קמ״ן:' : 'חתימת רמ״ן:';
    return `<section class="permit-page">${p.copies > 1 ? `<p class="copy-mark">עותק ${copyNum} מתוך ${p.copies}</p>` : ''}
      <div class="notice-box">אישור מעבר זה תקף כאשר הוא חתום, תואם את התאריך הרשום בו ומוצג על ידי איש צוות.</div>
      <h1 class="form-title">אישור מעבר ודוח מעקב מס׳ <span class="underline">${esc(p.permitNumber)}</span></h1>
      <p class="facility-line">${companies ? 'לפלוגה: ' + esc(companies) : ''}${companies && base ? ' · ' : ''}${base ? 'מתקן כליאה: ' + esc(base) : ''}</p>
      <p class="auth-line">ניתן בזה אישור להוצאת הכלואים הרשומים להלן מהמכלאה בתאריך <strong>${esc(Utils.formatDate(p.date))}</strong> לצורך: <strong>${esc(p.purpose)}</strong></p>
      <table class="form-table"><thead><tr><th>מספר אישי</th><th>דרגה</th><th>שם משפחה</th><th>שם פרטי</th><th>חתימה</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>
      <p class="line-field"><strong>שעת יציאה:</strong> <span class="line">${esc(p.departureTime)}</span></p>
      <table class="form-table prisoners-table"><thead><tr><th>מס״ד</th><th>מספר אישי</th><th>שם מלא + משפחה</th><th>סטטוס</th><th>רמ״ס</th><th>הערות</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      <p class="line-field"><strong>${authLabel}</strong> <span class="line"></span></p>
      ${p.exceptional ? '<p class="line-field"><strong>חתימת מפקד הכלא:</strong> <span class="line"></span></p>' : ''}
      <p class="line-field"><strong>שעת חזרה:</strong> <span class="line">${esc(p.returnTime)}</span></p>
      <p class="confirm-text">הנני מאשר קבלת הכלואים הרשומים לעיל:</p>
      ${staffSigTable('חתימת מד״כ')}${staffSigTable('חתימת סמל')}${staffSigTable('חתימת מ״פ')}</section>`;
  }

  // in-app permit document view; print shows ONLY the permit (see print.css: body.printing-permit)
  function showPermitPreview(id) {
    const p = Storage.getById(Storage.KEYS.PASS_PERMITS, id); if (!p) return;
    closePermitPreview();
    let pages = ''; for (let c = 1; c <= p.copies; c++) pages += permitPageHtml(p, c);
    const root = document.createElement('div'); root.id = 'permit-print-root';
    root.innerHTML = `<div class="permit-toolbar no-print"><strong>אישור מעבר ${esc(p.permitNumber)}</strong><span style="margin-right:auto"></span>
      <button class="btn btn-primary btn-sm" id="permit-print-btn">${Utils.icon('print', 14)} הדפס</button><button class="btn btn-secondary btn-sm" id="permit-close-btn">סגור</button></div><div class="permit-pages">${pages}</div>`;
    document.body.appendChild(root); document.body.classList.add('permit-open');
    Utils.el('permit-close-btn').onclick = closePermitPreview;
    Utils.el('permit-print-btn').onclick = () => { document.body.classList.add('printing-permit'); window.print(); setTimeout(() => document.body.classList.remove('printing-permit'), 300); };
    window.addEventListener('afterprint', () => document.body.classList.remove('printing-permit'), { once: true });
  }
  function closePermitPreview() { const r = document.getElementById('permit-print-root'); if (r) r.remove(); document.body.classList.remove('permit-open', 'printing-permit'); }
  window.showPermitPreview = showPermitPreview;

  function renderPermitHistory() {
    const list = Storage.getCollection(Storage.KEYS.PASS_PERMITS).filter(x => x.date === selectedDate).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return `<div class="table-panel" style="margin-top:var(--space-4)"><div class="table-panel-header"><span>אישורי מעבר שהופקו — ${Utils.escHtml(Utils.formatDate(selectedDate))}</span><span style="font-size:12px;color:var(--color-text-muted)">${list.length}</span></div>
      <table class="data-table"><thead><tr><th>מס׳ אישור</th><th>סוג אישור</th><th>לצורך</th><th>כלואים</th><th>עותקים</th><th>חתימה</th><th>הופק ע״י</th><th></th></tr></thead><tbody>
      ${list.length ? list.map(x => `<tr><td class="td-number">${esc(x.permitNumber)}</td><td>${x.permitType === 'soldier' ? 'לחייל ספציפי' : 'לפעילות'}</td><td>${esc(x.purpose)}</td><td>${x.soldiers.length}</td><td>${x.copies}</td><td>${x.exceptional ? 'קמ״ן + מפקד הכלא' : 'רמ״ן'}</td><td>${esc(x.createdBy)}</td><td><button class="btn btn-secondary btn-sm" onclick="window.showPermitPreview('${x.id}')">צפייה / הדפסה</button></td></tr>`).join('') : '<tr><td colspan="8" style="text-align:center;padding:16px;color:var(--color-text-muted)">לא הופקו אישורי מעבר ליום זה</td></tr>'}
      </tbody></table></div>`;
  }

  window._selectCalDate = (dateStr) => {
    selectedDate = dateStr;
    renderPage();
  };

  renderPage();
};
