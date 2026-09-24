/* reports-table.js — police reports list */
'use strict';

window.Pages = window.Pages || {};

Pages['reports-table'] = function(query) {
  const content = Utils.el('page-content');
  const people = Storage.getCollection(Storage.KEYS.PEOPLE);
  const pMap = Object.fromEntries(people.map(p => [p.id, p]));

  let filters = {
    reportNumber: '', dateFrom: '', dateTo: '', militaryNumber: '', nationalId: '',
    firstName: '', lastName: '', offenseType: '', status: '', baseId: '', reportType: '',
    search: ''
  };
  let selectedRows = new Set();
  let tableInstance = null;

  function getData() {
    let reports = Storage.getCollection(Storage.KEYS.POLICE_REPORTS);
    if (filters.reportNumber) reports = reports.filter(r => r.reportNumber.toLowerCase().includes(filters.reportNumber.toLowerCase()));
    if (filters.dateFrom) reports = reports.filter(r => r.date >= filters.dateFrom);
    if (filters.dateTo) reports = reports.filter(r => r.date <= filters.dateTo);
    if (filters.status) reports = reports.filter(r => r.status === filters.status);
    if (filters.reportType) reports = reports.filter(r => r.reportType === filters.reportType);
    if (filters.baseId) reports = reports.filter(r => r.baseId === filters.baseId);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      reports = reports.filter(r => {
        const p = pMap[r.personId];
        return r.reportNumber.toLowerCase().includes(q) ||
          (r.offenseTitle || '').toLowerCase().includes(q) ||
          (p && (p.firstName + ' ' + p.lastName).toLowerCase().includes(q)) ||
          (p && p.militaryNumber.includes(q));
      });
    }
    if (filters.militaryNumber || filters.firstName || filters.lastName || filters.nationalId) {
      reports = reports.filter(r => {
        const p = pMap[r.personId];
        if (!p) return false;
        if (filters.militaryNumber && !p.militaryNumber.includes(filters.militaryNumber)) return false;
        if (filters.nationalId && !p.nationalId.includes(filters.nationalId)) return false;
        if (filters.firstName && !p.firstName.includes(filters.firstName)) return false;
        if (filters.lastName && !p.lastName.includes(filters.lastName)) return false;
        return true;
      });
    }
    return reports.reverse();
  }

  function renderPage() {
    const data = getData();
    const canCreate = Permissions.can('createReport');
    const canDelete = Permissions.can('deleteReport');

    content.innerHTML = `
      <div class="page-wrapper">
        ${Utils.pageHeader('טבלת דוחות שוטר', Utils.pageMeta())}

        <!-- Add button row -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          ${canCreate ? `<button class="btn-float-add" id="btn-add-report" title="הוסף דוח חדש">+</button>` : ''}
          <button class="btn btn-secondary btn-sm" id="btn-export" style="margin-right:auto">${Utils.icon('download', 14)} ייצוא CSV</button>
        </div>

        <!-- Filter panel -->
        <div class="retrieval-panel">
          <div class="retrieval-panel-header">שדות אחזור</div>
          <div class="retrieval-grid">
            <div class="form-group">
              <label class="form-label">מספר דו"ח</label>
              <input class="form-control" id="f-reportNumber" value="${Utils.escHtml(filters.reportNumber)}" placeholder="DR-001234">
            </div>
            <div class="form-group">
              <label class="form-label">מתאריך</label>
              <input type="date" class="form-control" id="f-dateFrom" value="${filters.dateFrom}">
            </div>
            <div class="form-group">
              <label class="form-label">עד תאריך</label>
              <input type="date" class="form-control" id="f-dateTo" value="${filters.dateTo}">
            </div>
            <div class="form-group">
              <label class="form-label">מ.א מבצע עבירה</label>
              <input class="form-control" id="f-militaryNumber" value="${Utils.escHtml(filters.militaryNumber)}" placeholder="1234567">
            </div>
            <div class="form-group">
              <label class="form-label">שם פרטי</label>
              <input class="form-control" id="f-firstName" value="${Utils.escHtml(filters.firstName)}">
            </div>
            <div class="form-group">
              <label class="form-label">שם משפחה</label>
              <input class="form-control" id="f-lastName" value="${Utils.escHtml(filters.lastName)}">
            </div>
            <div class="form-group">
              <label class="form-label">סוג דו"ח</label>
              <select class="form-control" id="f-reportType">
                <option value="">הכל</option>
                ${REPORT_TYPES.map(t => `<option value="${t.id}" ${filters.reportType === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">סטטוס</label>
              <select class="form-control" id="f-status">
                <option value="">הכל</option>
                ${REPORT_STATUSES.map(s => `<option value="${s.id}" ${filters.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">בסיס</label>
              <select class="form-control" id="f-baseId">
                <option value="">הכל</option>
                ${DEMO_BASES.map(b => `<option value="${b.id}" ${filters.baseId === b.id ? 'selected' : ''}>${b.shortName}</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end">
            <button class="btn btn-secondary btn-sm" id="reset-filters">נקה</button>
            <button class="btn btn-primary btn-sm" id="apply-filters">חיפוש</button>
          </div>
        </div>

        <!-- Bulk actions -->
        <div class="bulk-actions-bar" id="bulk-bar">
          <span class="bulk-actions-count" id="bulk-count"></span>
          <span>נבחרו</span>
          <button class="btn btn-secondary btn-sm" id="bulk-export">${Utils.icon('download', 12)} ייצוא נבחרים</button>
          ${canDelete ? `<button class="btn btn-outline-danger btn-sm" id="bulk-delete">${Utils.icon('trash', 12)} מחק נבחרים</button>` : ''}
          <button class="btn btn-ghost btn-sm" id="bulk-clear">בטל בחירה</button>
        </div>

        <!-- Table panel -->
        <div class="table-panel">
          <div class="table-panel-header">
            <span>רשימת דוחות</span>
            <span id="total-count-label" style="font-size:12px;color:var(--color-text-muted)">${data.length} רשומות</span>
          </div>
          <div id="reports-table-container"></div>
        </div>

        ${Utils.classificationFooter()}
      </div>
    `;

    // Build table
    tableInstance = DataTable.create({
      containerId: 'reports-table-container',
      selectable: true,
      data,
      rowKey: 'id',
      columns: [
        { key: 'reportNumber', label: 'מספר דו"ח', tdClass: 'td-number', render: (v) => `<span class="td-number">${Utils.escHtml(v)}</span>` },
        { key: 'reportType', label: 'סוג', render: () => '<span class="badge badge-info">דמ"ש</span>' },
        { key: 'date', label: 'תאריך', render: (v) => Utils.formatDate(v) },
        { key: 'time', label: 'שעה', render: (v) => v || '—' },
        { key: 'personId', label: 'שם מפר', render: (v) => { const p = pMap[v]; return p ? Utils.escHtml(p.firstName + ' ' + p.lastName) : '—'; } },
        { key: 'personId', label: 'מ"א מפר', tdClass: 'td-id', render: (v) => { const p = pMap[v]; return p ? Utils.escHtml(p.militaryNumber) : '—'; } },
        { key: 'offenseTitle', label: 'עבירה', render: (v) => Utils.truncate(v, 30) },
        { key: 'baseId', label: 'בסיס', render: (v) => { const b = BASE_MAP[v]; return b ? Utils.escHtml(b.shortName) : '—'; } },
        { key: 'status', label: 'סטטוס', render: (v) => StatusBadge.render(v) },
        { key: 'officerName', label: 'שוטר מוסר', render: (v) => Utils.escHtml(v || '—') },
      ],
      actions: (row) => `
        <button class="row-action-btn" onclick="viewReport('${row.id}')" title="צפייה">${Utils.icon('view', 14)}</button>
        ${Permissions.can('editReport') ? `<button class="row-action-btn" onclick="editReport('${row.id}')" title="עריכה">${Utils.icon('edit', 14)}</button>` : ''}
        ${Permissions.can('deleteReport') ? `<button class="row-action-btn danger" onclick="deleteReport('${row.id}')" title="מחיקה">${Utils.icon('trash', 14)}</button>` : ''}
      `,
      onRowClick: (row) => Router.navigate('/officer-report-form', { id: row.id }),
      rowClass: (row) => row.status === 'draft' ? 'row-highlight-warning' : '',
      emptyMessage: 'לא נמצאו דוחות התואמים את הסינון',
    });

    // Filter actions
    Utils.el('apply-filters').onclick = applyFilters;
    Utils.el('reset-filters').onclick = resetFilters;

    // Add button
    if (Utils.el('btn-add-report')) {
      Utils.el('btn-add-report').onclick = () => Router.navigate('/new-report-full');
    }

    // Export
    Utils.el('btn-export').onclick = exportAll;

    // Selection events
    const tableContainer = Utils.el('reports-table-container');
    tableContainer.addEventListener('tableselection', (e) => {
      selectedRows = new Set(e.detail.selected);
      updateBulkBar();
    });

    Utils.el('bulk-export').onclick = exportSelected;
    Utils.el('bulk-clear').onclick = () => { tableInstance.clearSelection(); selectedRows.clear(); updateBulkBar(); };
    if (Utils.el('bulk-delete')) Utils.el('bulk-delete').onclick = deleteSelected;

    attachPageActions();
  }

  function applyFilters() {
    filters.reportNumber = Utils.el('f-reportNumber').value;
    filters.dateFrom = Utils.el('f-dateFrom').value;
    filters.dateTo = Utils.el('f-dateTo').value;
    filters.militaryNumber = Utils.el('f-militaryNumber').value;
    filters.firstName = Utils.el('f-firstName').value;
    filters.lastName = Utils.el('f-lastName').value;
    filters.reportType = Utils.el('f-reportType').value;
    filters.status = Utils.el('f-status').value;
    filters.baseId = Utils.el('f-baseId').value;
    const newData = getData();
    tableInstance.update(newData);
    const lbl = Utils.el('total-count-label');
    if (lbl) lbl.textContent = newData.length + ' רשומות';
  }

  function resetFilters() {
    filters = { reportNumber: '', dateFrom: '', dateTo: '', militaryNumber: '', nationalId: '', firstName: '', lastName: '', offenseType: '', status: '', baseId: '', reportType: '', search: '' };
    renderPage();
  }

  function updateBulkBar() {
    const bar = Utils.el('bulk-bar');
    const countEl = Utils.el('bulk-count');
    if (selectedRows.size > 0) {
      bar.classList.add('visible');
      if (countEl) countEl.textContent = selectedRows.size;
    } else {
      bar.classList.remove('visible');
    }
  }

  function exportAll() {
    const data = getData();
    const rows = data.map(r => {
      const p = pMap[r.personId];
      return [r.reportNumber, 'דמ"ש', r.date, r.time, p ? p.militaryNumber : '', p ? p.firstName + ' ' + p.lastName : '', r.offenseTitle, r.status];
    });
    Utils.exportCsv('police_reports.csv', ['מספר דו"ח', 'סוג', 'תאריך', 'שעה', 'מספר אישי', 'שם', 'עבירה', 'סטטוס'], rows);
    Audit.log({ module: 'policing', action: 'export', entityType: 'policeReport', description: `ייצוא ${data.length} דוחות לקובץ CSV` });
  }

  function exportSelected() {
    const data = getData().filter(r => selectedRows.has(r.id));
    if (!data.length) { Toast.warning('לא נבחרו רשומות לייצוא'); return; }
    const rows = data.map(r => {
      const p = pMap[r.personId];
      return [r.reportNumber, r.date, p ? p.militaryNumber : '', p ? p.firstName + ' ' + p.lastName : '', r.offenseTitle, r.status];
    });
    Utils.exportCsv('selected_reports.csv', ['מספר דו"ח', 'תאריך', 'מספר אישי', 'שם', 'עבירה', 'סטטוס'], rows);
  }

  async function deleteSelected() {
    if (!selectedRows.size) return;
    const ok = await Modal.confirm({ title: 'מחיקת דוחות', message: `האם למחוק ${selectedRows.size} דוחות?`, type: 'danger', confirmLabel: 'מחק' });
    if (!ok) return;
    selectedRows.forEach(id => Storage.softDelete(Storage.KEYS.POLICE_REPORTS, id));
    Audit.log({ module: 'policing', action: 'delete', entityType: 'policeReport', description: `מחיקת ${selectedRows.size} דוחות` });
    Toast.success(`${selectedRows.size} דוחות נמחקו`);
    selectedRows.clear();
    renderPage();
  }

  function attachPageActions() {
    window.viewReport = (id) => Router.navigate('/officer-report-form', { id });
    window.editReport = (id) => Router.navigate('/officer-report-form', { id, mode: 'edit' });
    window.deleteReport = async (id) => {
      const ok = await Modal.confirm({ title: 'מחיקת דו"ח', message: 'האם למחוק את הדו"ח?', type: 'danger', confirmLabel: 'מחק' });
      if (!ok) return;
      Storage.softDelete(Storage.KEYS.POLICE_REPORTS, id);
      Audit.log({ module: 'policing', action: 'delete', entityType: 'policeReport', entityId: id, description: 'מחיקת דו"ח שוטר' });
      Toast.success('הדו"ח נמחק');
      renderPage();
    };
  }

  renderPage();
};
