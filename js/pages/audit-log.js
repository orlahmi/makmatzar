/* audit-log.js — audit trail */
'use strict';

window.Pages = window.Pages || {};

Pages['audit-log'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.can('viewAudit')) { content.innerHTML = EmptyState.accessDenied(); return; }

  let filterModule = '';
  let filterAction = '';
  let filterUser = '';
  let filterDateFrom = '';
  let filterDateTo = '';
  let filterSearch = '';
  let expandedId = null;
  let tableInstance = null;

  const MODULES = Object.entries(Audit.MODULE_LABELS || {
    policing: 'כוח אדם ושוטרות', investigation: 'חקירה ובילוש', incarceration: 'כליאה',
    canteen: 'קנטינה', hamal: 'חמ"ל', system: 'מערכת'
  });
  const ACTIONS = Object.entries(Audit.ACTION_LABELS || {
    create: 'יצירה', update: 'עדכון', delete: 'מחיקה', login: 'כניסה',
    logout: 'יציאה', export: 'ייצוא', print: 'הדפסה', approve: 'אישור',
    reject: 'דחייה', release: 'שחרור', close: 'סגירה', cancel: 'ביטול'
  });

  function getData() {
    return Audit.getAll({
      module: filterModule || undefined,
      action: filterAction || undefined,
      userId: filterUser || undefined,
      dateFrom: filterDateFrom || undefined,
      dateTo: filterDateTo || undefined,
      search: filterSearch || undefined,
    });
  }

  function renderPage() {
    const data = getData();

    content.innerHTML = `
      <div class="page-wrapper">
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">${Utils.icon('audit', 24)} יומן ביקורת</h1>
            <p class="page-subtitle">רישום פעולות מלא — ${data.length} רשומות</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-secondary btn-sm" id="btn-export">${Utils.icon('download', 14)} ייצוא CSV</button>
          </div>
        </div>

        <!-- Filters -->
        <div class="filter-panel">
          <div class="filter-panel-header open">
            <div class="filter-panel-title">${Utils.icon('filter', 14)} סינון</div>
          </div>
          <div class="filter-panel-body">
            <div class="form-group">
              <label class="form-label">מודול</label>
              <select class="form-control" id="f-module">
                <option value="">הכל</option>
                ${MODULES.map(([id, label]) => `<option value="${id}" ${filterModule === id ? 'selected' : ''}>${Utils.escHtml(label)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">פעולה</label>
              <select class="form-control" id="f-action">
                <option value="">הכל</option>
                ${ACTIONS.map(([id, label]) => `<option value="${id}" ${filterAction === id ? 'selected' : ''}>${Utils.escHtml(label)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">מתאריך</label>
              <input type="date" class="form-control" id="f-date-from" value="${filterDateFrom}">
            </div>
            <div class="form-group">
              <label class="form-label">עד תאריך</label>
              <input type="date" class="form-control" id="f-date-to" value="${filterDateTo}">
            </div>
            <div class="form-group">
              <label class="form-label">חיפוש</label>
              <input class="form-control" id="f-search" value="${Utils.escHtml(filterSearch)}" placeholder="תיאור...">
            </div>
            <div class="filter-panel-actions">
              <button class="btn btn-primary btn-sm" id="apply-filters">החל</button>
              <button class="btn btn-secondary btn-sm" id="reset-filters">נקה</button>
            </div>
          </div>
        </div>

        <div class="table-toolbar">
          <span class="table-count">מציג <strong>${data.length}</strong> רשומות</span>
        </div>

        <div class="data-table-wrap">
          <div id="audit-table"></div>
        </div>
      </div>
    `;

    tableInstance = DataTable.create({
      containerId: 'audit-table',
      data,
      rowKey: 'id',
      columns: [
        { key: 'timestamp', label: 'תאריך ושעה', render: v => Utils.formatDateTime(v) },
        { key: 'module', label: 'מודול', render: v => {
          const labels = { policing: 'שוטרות', investigation: 'חקירה', incarceration: 'כליאה', canteen: 'קנטינה', hamal: 'חמ"ל', system: 'מערכת' };
          return `<span class="badge badge-info">${Utils.escHtml(labels[v] || v)}</span>`;
        }},
        { key: 'action', label: 'פעולה', render: v => {
          const map = { create: 'badge-success', update: 'badge-info', delete: 'badge-danger', login: 'badge-teal', logout: 'badge-draft', approve: 'badge-success', reject: 'badge-danger' };
          const labels = { create: 'יצירה', update: 'עדכון', delete: 'מחיקה', login: 'כניסה', logout: 'יציאה', approve: 'אישור', reject: 'דחייה', print: 'הדפסה', export: 'ייצוא' };
          return `<span class="badge ${map[v] || 'badge-draft'}">${Utils.escHtml(labels[v] || v)}</span>`;
        }},
        { key: 'entityType', label: 'סוג ישות', render: v => Utils.escHtml(v || '—') },
        { key: 'description', label: 'תיאור', render: v => Utils.truncate(v, 60) },
        { key: 'userName', label: 'משתמש', render: v => Utils.escHtml(v || '—') },
        { key: 'baseName', label: 'בסיס', render: v => Utils.escHtml(v || '—') },
      ],
      actions: (row) => `<button class="row-action-btn" onclick="window.expandAuditRow('${row.id}')" title="פרטים">${Utils.icon('chevronDown', 12)}</button>`,
      onRowClick: (row) => {
        if (expandedId === row.id) { expandedId = null; }
        else { expandedId = row.id; showAuditDetail(row); }
      },
      emptyMessage: 'אין רשומות ביקורת',
    });

    // Filters
    Utils.el('apply-filters').onclick = () => {
      filterModule = Utils.el('f-module').value;
      filterAction = Utils.el('f-action').value;
      filterDateFrom = Utils.el('f-date-from').value;
      filterDateTo = Utils.el('f-date-to').value;
      filterSearch = Utils.el('f-search').value;
      renderPage();
    };
    Utils.el('reset-filters').onclick = () => {
      filterModule = ''; filterAction = ''; filterDateFrom = ''; filterDateTo = ''; filterSearch = ''; filterUser = '';
      renderPage();
    };
    Utils.el('btn-export').onclick = () => {
      const rows = getData().map(e => [Utils.formatDateTime(e.timestamp), e.module, e.action, e.entityType, e.description, e.userName, e.baseName]);
      Utils.exportCsv('audit_log.csv', ['תאריך/שעה', 'מודול', 'פעולה', 'סוג ישות', 'תיאור', 'משתמש', 'בסיס'], rows);
      Audit.log({ module: 'system', action: 'export', entityType: 'auditLog', description: 'ייצוא יומן ביקורת ל-CSV' });
    };

    window.expandAuditRow = (id) => {
      const entry = getData().find(e => e.id === id);
      if (entry) showAuditDetail(entry);
    };
  }

  function showAuditDetail(entry) {
    Modal.open({
      title: 'פרטי רשומת ביקורת',
      size: 'lg',
      body: `
        <div class="info-list">
          <div class="info-list-row"><div class="info-list-label">מזהה</div><div style="font-family:monospace;font-size:11px">${Utils.escHtml(entry.id)}</div></div>
          <div class="info-list-row"><div class="info-list-label">תאריך ושעה</div><div>${Utils.formatDateTime(entry.timestamp)}</div></div>
          <div class="info-list-row"><div class="info-list-label">מודול</div><div>${Utils.escHtml(entry.module)}</div></div>
          <div class="info-list-row"><div class="info-list-label">פעולה</div><div>${Utils.escHtml(entry.action)}</div></div>
          <div class="info-list-row"><div class="info-list-label">סוג ישות</div><div>${Utils.escHtml(entry.entityType || '—')}</div></div>
          <div class="info-list-row"><div class="info-list-label">מזהה ישות</div><div style="font-family:monospace;font-size:11px">${Utils.escHtml(entry.entityId || '—')}</div></div>
          <div class="info-list-row"><div class="info-list-label">תיאור</div><div>${Utils.escHtml(entry.description)}</div></div>
          <div class="info-list-row"><div class="info-list-label">משתמש</div><div>${Utils.escHtml(entry.userName || '—')}</div></div>
          <div class="info-list-row"><div class="info-list-label">מזהה משתמש</div><div style="font-family:monospace;font-size:11px">${Utils.escHtml(entry.userId || '—')}</div></div>
          <div class="info-list-row"><div class="info-list-label">בסיס</div><div>${Utils.escHtml(entry.baseName || '—')}</div></div>
          <div class="info-list-row"><div class="info-list-label">IP</div><div>${Utils.escHtml(entry.ip || 'N/A (הדגמה)')}</div></div>
        </div>
      `,
    });
  }

  renderPage();
};
