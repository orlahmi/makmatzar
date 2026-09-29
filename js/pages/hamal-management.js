/* hamal-management.js — operations room log */
'use strict';

window.Pages = window.Pages || {};

Pages['hamal-management'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('hamal')) { content.innerHTML = EmptyState.accessDenied(); return; }

  const user = Auth.getCurrentUser();
  let filterDate = Utils.today();
  let filterCategory = '';
  let filterKind = '';
  let filterSearch = '';

  function kindBadge(k) {
    return k === 'operational' ? '<span class="badge badge-danger">מבצעי</span>' : k === 'administrative' ? '<span class="badge badge-info">מנהלתי</span>' : '<span class="badge badge-draft">לא סווג</span>';
  }

  function getData() {
    let entries = Storage.getCollection(Storage.KEYS.HAMAL_ENTRIES);
    if (filterDate) entries = entries.filter(e => e.date === filterDate);
    if (filterKind) entries = entries.filter(e => e.entryKind === filterKind);
    if (filterCategory) entries = entries.filter(e => e.category === filterCategory);
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      entries = entries.filter(e => e.description.toLowerCase().includes(q) || e.actionType.toLowerCase().includes(q));
    }
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return entries.sort((a, b) => {
      const openA = a.status !== 'closed' ? 0 : 1;
      const openB = b.status !== 'closed' ? 0 : 1;
      if (openA !== openB) return openA - openB;
      const pA = priorityOrder[a.priority] ?? 9;
      const pB = priorityOrder[b.priority] ?? 9;
      if (pA !== pB) return pA - pB;
      return (b.date + b.time).localeCompare(a.date + a.time);
    });
  }

  function renderPage() {
    const entries = getData();

    content.innerHTML = `
      <div class="page-wrapper">
        ${Utils.pageHeader('ניהול חמ"ל', Utils.pageMeta())}

        <!-- Filter panel -->
        <div class="retrieval-panel">
          <div class="retrieval-panel-header">סינון</div>
          <div class="retrieval-grid">
            <div class="form-group">
              <label class="form-label">תאריך</label>
              <input type="date" class="form-control" id="f-date" value="${filterDate}">
            </div>
            <div class="form-group">
              <label class="form-label">סוג</label>
              <select class="form-control" id="f-kind">
                <option value="">הכל</option>
                <option value="operational" ${filterKind === 'operational' ? 'selected' : ''}>מבצעי</option>
                <option value="administrative" ${filterKind === 'administrative' ? 'selected' : ''}>מנהלתי</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">קטגוריה</label>
              <select class="form-control" id="f-category">
                <option value="">הכל</option>
                ${HAMAL_CATEGORIES.map(c => `<option value="${c.id}" ${filterCategory === c.id ? 'selected' : ''}>${Utils.escHtml(c.label)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">חיפוש</label>
              <input class="form-control" id="f-search" value="${Utils.escHtml(filterSearch)}" placeholder="תיאור...">
            </div>
            <div class="form-group" style="display:flex;align-items:flex-end;gap:8px">
              <button class="btn btn-primary" id="apply-filters">החל</button>
              <button class="btn btn-secondary" id="reset-filters">נקה</button>
            </div>
          </div>
        </div>

        <!-- Two-column workspace -->
        <div style="display:grid;grid-template-columns:1fr 280px;gap:20px;align-items:start">

          <!-- Events table panel -->
          <div class="table-panel">
            <div class="table-panel-header">
              <span>יומן אירועים — ${entries.length} רשומות</span>
              ${Permissions.can('createHamalEntry') ? `<button class="btn-float-add" style="width:34px;height:34px;font-size:18px" id="btn-add">+</button>` : ''}
            </div>
            <!-- Category pills -->
            <div style="padding:10px 16px;border-bottom:1px solid var(--color-border);display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-sm ${filterCategory==='' ? 'btn-primary' : 'btn-secondary'}" onclick="window._hamalFilterCat('')">הכל</button>
              ${HAMAL_CATEGORIES.map(c => `<button class="btn btn-sm ${filterCategory===c.id ? 'btn-primary' : 'btn-secondary'}" onclick="window._hamalFilterCat('${c.id}')">${Utils.escHtml(c.label)}</button>`).join('')}
            </div>
            <div style="overflow-x:auto">
              <table class="data-table dense">
                <thead>
                  <tr>
                    <th style="width:70px">שעה</th>
                    <th style="width:80px">סוג</th>
                    <th style="width:130px">סוג פעולה</th>
                    <th style="width:90px">קטגוריה</th>
                    <th>תיאור</th>
                    <th style="width:80px">עדיפות</th>
                    <th style="width:100px">דווח ע"י</th>
                    <th style="width:90px">סטטוס</th>
                    <th style="width:60px"></th>
                  </tr>
                </thead>
                <tbody>
                  ${entries.length === 0 ? `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--color-text-muted)">לא נמצאו רשומות</td></tr>` :
                    entries.map(e => {
                      const isCritical = (e.priority === 'critical' || e.priority === 'high') && e.status !== 'closed';
                      return `<tr class="${isCritical ? 'row-critical' : ''}">
                        <td><strong style="font-variant-numeric:tabular-nums">${Utils.escHtml(e.time)}</strong></td>
                        <td>${kindBadge(e.entryKind)}</td>
                        <td>${Utils.escHtml(e.actionType)}</td>
                        <td><span class="badge badge-info">${Utils.escHtml(e.category)}</span></td>
                        <td style="max-width:220px;white-space:normal;word-break:break-word">${Utils.truncate(e.description, 80)}</td>
                        <td>${StatusBadge.renderPriority(e.priority)}</td>
                        <td>${Utils.escHtml(e.reportedBy)}</td>
                        <td>${StatusBadge.render(e.status || 'open')}</td>
                        <td>
                          <div class="row-actions">
                            <button class="row-action-btn" onclick="window.viewHamalEntry('${e.id}')">${Utils.icon('view', 14)}</button>
                            ${Permissions.can('createHamalEntry') ? `<button class="row-action-btn danger" onclick="window.deleteHamalEntry('${e.id}')">${Utils.icon('trash', 14)}</button>` : ''}
                          </div>
                        </td>
                      </tr>`;
                    }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Notes panel -->
          <div class="table-panel" style="position:sticky;top:16px">
            <div class="table-panel-header">הערות כלליות / יומן מבצעים</div>
            <div style="padding:16px">
              <textarea id="hamal-notes-area" class="form-control" style="min-height:200px;resize:vertical;font-size:13px" placeholder="הערות תפעוליות..."></textarea>
              <div style="margin-top:10px;display:flex;justify-content:flex-end">
                <button class="btn btn-primary btn-sm" id="btn-save-notes">שמור</button>
              </div>
              <div style="margin-top:12px;font-size:11px;color:var(--color-text-muted);text-align:center">
                ${filterDate ? Utils.formatDate(filterDate) : 'כל התאריכים'}
                &nbsp;|&nbsp; ${entries.filter(e => e.status !== 'closed').length} פתוחים
              </div>
            </div>
          </div>

        </div>

        ${Utils.classificationFooter()}
      </div>
    `;

    // Wire filters
    Utils.el('apply-filters').onclick = () => {
      filterDate = Utils.el('f-date').value;
      filterKind = Utils.el('f-kind').value;
      filterCategory = Utils.el('f-category').value;
      filterSearch = Utils.el('f-search').value;
      renderPage();
    };
    Utils.el('reset-filters').onclick = () => { filterDate = Utils.today(); filterKind = ''; filterCategory = ''; filterSearch = ''; renderPage(); };

    // Category pill filter
    window._hamalFilterCat = (cat) => { filterCategory = cat; renderPage(); };

    // Notes
    const notesKey = 'hamal_notes_' + (filterDate || 'all');
    const notesArea = Utils.el('hamal-notes-area');
    if (notesArea) {
      notesArea.value = localStorage.getItem(notesKey) || '';
      Utils.el('btn-save-notes').onclick = () => {
        localStorage.setItem(notesKey, notesArea.value);
        Toast.success('הערות נשמרו');
      };
    }

    if (Utils.el('btn-add')) {
      Utils.el('btn-add').onclick = () => showAddEntryModal();
    }

    window.viewHamalEntry = (id) => {
      const entry = Storage.getCollection(Storage.KEYS.HAMAL_ENTRIES).find(e => e.id === id);
      if (!entry) return;
      Modal.open({
        title: `פעולה — ${entry.date} ${entry.time}`,
        body: `
          <div class="info-list">
            <div class="info-list-row"><div class="info-list-label">סוג</div><div>${kindBadge(entry.entryKind)}</div></div>
            <div class="info-list-row"><div class="info-list-label">סוג פעולה</div><div>${Utils.escHtml(entry.actionType)}</div></div>
            <div class="info-list-row"><div class="info-list-label">קטגוריה</div><div>${Utils.escHtml(entry.category)}</div></div>
            <div class="info-list-row"><div class="info-list-label">עדיפות</div><div>${StatusBadge.renderPriority(entry.priority)}</div></div>
            <div class="info-list-row"><div class="info-list-label">מדווח</div><div>${Utils.escHtml(entry.reportedBy)}</div></div>
            <div class="info-list-row"><div class="info-list-label">תיאור</div><div style="white-space:pre-line">${Utils.escHtml(entry.description)}</div></div>
          </div>
        `,
        size: 'lg',
      });
    };

    window.deleteHamalEntry = async (id) => {
      const ok = await Modal.confirm({ title: 'מחיקת רשומה', message: 'האם למחוק רשומה זו?', type: 'danger' });
      if (!ok) return;
      Storage.softDelete(Storage.KEYS.HAMAL_ENTRIES, id);
      Toast.success('הרשומה נמחקה');
      renderPage();
    };
  }

  function showAddEntryModal() {
    Modal.open({
      title: 'הוספת רשומת חמ"ל',
      size: 'lg',
      body: `
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">תאריך <span class="required">*</span></label>
            <input type="date" class="form-control" id="hamal-date" value="${Utils.today()}">
          </div>
          <div class="form-group">
            <label class="form-label">שעה <span class="required">*</span></label>
            <input type="time" class="form-control" id="hamal-time" value="${Utils.currentTimeString().slice(0,5)}">
          </div>
          <div class="form-group">
            <label class="form-label">סוג <span class="required">*</span></label>
            <select class="form-control" id="hamal-kind">
              <option value="">בחר סוג</option>
              <option value="operational">מבצעי</option>
              <option value="administrative">מנהלתי</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">סוג פעולה <span class="required">*</span></label>
            <select class="form-control" id="hamal-action">
              ${HAMAL_ACTION_TYPES.map(a => `<option value="${a.id}">${Utils.escHtml(a.label)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">קטגוריה</label>
            <select class="form-control" id="hamal-category">
              ${HAMAL_CATEGORIES.map(c => `<option value="${c.id}">${Utils.escHtml(c.label)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">עדיפות</label>
            <select class="form-control" id="hamal-priority">
              ${PRIORITIES.map(p => `<option value="${p.id}">${Utils.escHtml(p.label)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">תיאור <span class="required">*</span></label>
          <textarea class="form-control" id="hamal-desc" rows="4" placeholder="תאר את הפעולה..."></textarea>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>
        <button class="btn btn-primary" onclick="window._saveHamalEntry()">שמור</button>
      `,
    });

    window._saveHamalEntry = () => {
      const date = Utils.el('hamal-date').value;
      const time = Utils.el('hamal-time').value;
      const entryKind = Utils.el('hamal-kind').value;
      const actionType = Utils.el('hamal-action').value;
      const category = Utils.el('hamal-category').value;
      const priority = Utils.el('hamal-priority').value;
      const description = Utils.el('hamal-desc').value;
      if (!date || !time || !description.trim() || !entryKind) { Toast.error('יש למלא שדות חובה'); return; }

      const entry = {
        id: 'h_' + Utils.generateId(),
        date, time, entryKind, actionType, category, priority, description,
        reportedBy: user ? user.firstName + ' ' + user.lastName : '',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      Storage.upsert(Storage.KEYS.HAMAL_ENTRIES, entry);
      Audit.log({ module: 'hamal', action: 'create', entityType: 'hamalEntry', entityId: entry.id, description: `רשומת חמ"ל חדשה: ${actionType}` });
      Modal.close();
      Toast.success('הרשומה נשמרה');
      renderPage();
    };
  }

  renderPage();
};
