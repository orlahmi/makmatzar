/* deserter-retrieval.js — deserter search and retrieval */
'use strict';

window.Pages = window.Pages || {};

Pages['deserter-retrieval'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('investigation')) { content.innerHTML = EmptyState.accessDenied(); return; }

  let filterStatus = '';
  let filterSearch = '';
  let tableInstance = null;

  const people = Storage.getCollection(Storage.KEYS.PEOPLE);
  const pMap = Object.fromEntries(people.map(p => [p.id, p]));

  function getData() {
    let files = Storage.getCollection(Storage.KEYS.DESERTER_FILES);
    if (filterStatus) files = files.filter(f => f.status === filterStatus);
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      files = files.filter(f => {
        const p = pMap[f.personId];
        return f.fileNumber.toLowerCase().includes(q) ||
          (p && (p.firstName + ' ' + p.lastName).toLowerCase().includes(q)) ||
          (p && p.militaryNumber.includes(q));
      });
    }
    return files.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  function renderPage() {
    const data = getData();

    content.innerHTML = `
      <div class="page-wrapper">
        ${Utils.pageHeader('אחזור עריק/משתמט', Utils.pageMeta())}

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <button class="btn btn-secondary btn-sm" id="btn-export">${Utils.icon('download', 14)} ייצוא</button>
          ${Permissions.can('createDeserterFile') ? `<button class="btn btn-primary" id="btn-new">${Utils.icon('plus', 14)} תיק עריקות חדש</button>` : ''}
        </div>

        <!-- Filter panel -->
        <div class="retrieval-panel">
          <div class="retrieval-panel-header">סינון</div>
          <div class="retrieval-grid">
            <div class="form-group">
              <label class="form-label">סטטוס</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:4px">
                ${[{id:'',label:'הכל'}, ...DESERTER_STATUSES].map(s => `
                  <button class="btn btn-sm ${filterStatus === s.id ? 'btn-primary' : 'btn-secondary'}" onclick="window._dFilterStatus('${s.id}')">${Utils.escHtml(s.label)}</button>
                `).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">חיפוש</label>
              <input class="form-control" id="d-search" placeholder="שם / מ.א / מספר תיק..." value="${Utils.escHtml(filterSearch)}">
            </div>
          </div>
        </div>

        <!-- Table panel -->
        <div class="table-panel">
          <div class="table-panel-header">
            <span>תיקי עריקות</span>
            <span style="font-size:12px;color:var(--color-text-muted)">${data.length} תיקים</span>
          </div>
          <div id="deserter-table"></div>
        </div>

        ${Utils.classificationFooter()}
      </div>
    `;

    tableInstance = DataTable.create({
      containerId: 'deserter-table',
      data,
      rowKey: 'id',
      columns: [
        { key: 'fileNumber', label: 'מספר תיק', tdClass: 'td-number' },
        { key: 'personId', label: 'שם', render: (v) => { const p = pMap[v]; return p ? Utils.escHtml(p.firstName + ' ' + p.lastName) : '—'; } },
        { key: 'personId', label: 'מ"א', tdClass: 'td-id', render: (v) => { const p = pMap[v]; return p ? Utils.escHtml(p.militaryNumber) : '—'; } },
        { key: 'deserterType', label: 'סוג', render: v => Utils.escHtml(v || '—') },
        { key: 'startDate', label: 'תחילת עריקה', render: v => Utils.formatDate(v) },
        { key: 'daysAbsent', label: 'ימי היעדרות', render: (v, row) => {
          const days = Utils.daysBetween(row.startDate, row.endDate || Utils.today());
          return `<strong>${days}</strong>`;
        }},
        { key: 'status', label: 'סטטוס', render: v => StatusBadge.render(v) },
        { key: 'investigatorName', label: 'חוקר', render: v => Utils.escHtml(v || '—') },
      ],
      actions: (row) => `
        <button class="row-action-btn" onclick="Router.navigate('/deserter-file', {id:'${row.id}'})">${Utils.icon('view', 14)}</button>
        ${Permissions.can('createDeserterFile') ? `<button class="row-action-btn" onclick="window.updateDeserterStatus('${row.id}')">${Utils.icon('edit', 14)}</button>` : ''}
      `,
      onRowClick: (row) => Router.navigate('/deserter-file', { id: row.id }),
      rowClass: (row) => row.status === 'active' ? 'row-highlight-danger' : '',
      emptyMessage: 'אין תיקי עריקות',
    });

    Utils.el('d-search').addEventListener('input', Utils.debounce(() => {
      filterSearch = Utils.el('d-search').value;
      tableInstance.update(getData());
    }, 300));

    Utils.el('btn-export').onclick = () => {
      const rows = getData().map(f => {
        const p = pMap[f.personId];
        return [f.fileNumber, p ? p.firstName + ' ' + p.lastName : '', p ? p.militaryNumber : '', f.startDate, f.status];
      });
      Utils.exportCsv('deserters.csv', ['מספר תיק', 'שם', 'מ"א', 'תחילת עריקה', 'סטטוס'], rows);
    };

    if (Utils.el('btn-new')) {
      Utils.el('btn-new').onclick = () => showNewDeserterModal();
    }

    window._dFilterStatus = (status) => { filterStatus = status; renderPage(); };

    window.updateDeserterStatus = async (id) => {
      const file = Storage.getCollection(Storage.KEYS.DESERTER_FILES).find(f => f.id === id);
      if (!file) return;
      const statuses = DESERTER_STATUSES.map(s => `<option value="${s.id}" ${file.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('');
      Modal.open({
        title: 'עדכון סטטוס עריק',
        body: `
          <div class="form-group">
            <label class="form-label">סטטוס חדש</label>
            <select id="ds-status" class="form-control">${statuses}</select>
          </div>
          <div class="form-group">
            <label class="form-label">תאריך סיום</label>
            <input type="date" id="ds-end-date" class="form-control" value="${file.endDate || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">הערות</label>
            <textarea id="ds-notes" class="form-control" rows="2">${Utils.escHtml(file.notes || '')}</textarea>
          </div>
        `,
        footer: `
          <button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>
          <button class="btn btn-primary" onclick="window._saveDeserterStatus('${id}')">שמור</button>
        `,
      });
    };

    window._saveDeserterStatus = (id) => {
      const file = Storage.getCollection(Storage.KEYS.DESERTER_FILES).find(f => f.id === id);
      if (!file) return;
      file.status = Utils.el('ds-status').value;
      file.endDate = Utils.el('ds-end-date').value || file.endDate;
      file.notes = Utils.el('ds-notes').value;
      file.updatedAt = new Date().toISOString();
      Storage.upsert(Storage.KEYS.DESERTER_FILES, file);
      Audit.log({ module: 'investigation', action: 'update', entityType: 'deserterFile', entityId: id, description: `עדכון תיק עריקות ${file.fileNumber}` });
      Modal.close();
      Toast.success('סטטוס עודכן');
      renderPage();
    };
  }

  function showNewDeserterModal() {
    Modal.open({
      title: 'תיק עריקות חדש',
      size: 'lg',
      body: `
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">אדם <span class="required">*</span></label>
            <select id="nd-person" class="form-control">
              <option value="">בחר אדם</option>
              ${people.map(p => `<option value="${p.id}">${Utils.escHtml(p.firstName + ' ' + p.lastName + ' — ' + p.militaryNumber)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">סוג עריקה</label>
            <select id="nd-type" class="form-control">
              ${DESERTER_TYPE.map(t => `<option value="${t.id}">${Utils.escHtml(t.label)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">תאריך תחילה <span class="required">*</span></label>
            <input type="date" id="nd-start" class="form-control" value="${Utils.today()}">
          </div>
          <div class="form-group">
            <label class="form-label">מיקום אחרון ידוע</label>
            <input id="nd-location" class="form-control">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">הערות</label>
          <textarea id="nd-notes" class="form-control" rows="3"></textarea>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>
        <button class="btn btn-primary" onclick="window._saveNewDeserter()">צור תיק</button>
      `,
    });

    window._saveNewDeserter = () => {
      const personId = Utils.el('nd-person').value;
      const startDate = Utils.el('nd-start').value;
      if (!personId || !startDate) { Toast.error('יש לבחור אדם ותאריך'); return; }

      const file = {
        id: 'df_' + Utils.generateId(),
        fileNumber: 'DF-' + String(Math.floor(Math.random() * 9000) + 1000),
        personId,
        deserterType: Utils.el('nd-type').value,
        startDate,
        endDate: null,
        status: 'active',
        lastLocationKnown: Utils.el('nd-location').value,
        notes: Utils.el('nd-notes').value,
        assignedTo: Auth.getCurrentUser() ? Auth.getCurrentUser().firstName + ' ' + Auth.getCurrentUser().lastName : '',
        activities: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      Storage.upsert(Storage.KEYS.DESERTER_FILES, file);
      Audit.log({ module: 'investigation', action: 'create', entityType: 'deserterFile', entityId: file.id, description: `פתיחת תיק עריקות ${file.fileNumber}` });
      Modal.close();
      Toast.success('תיק עריקות נפתח');
      Router.navigate('/deserter-file', { id: file.id });
    };
  }

  renderPage();
};
