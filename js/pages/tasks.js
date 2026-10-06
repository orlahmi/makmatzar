/* tasks.js — tasks list */
'use strict';

window.Pages = window.Pages || {};

Pages['tasks'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('policing')) { content.innerHTML = EmptyState.accessDenied(); return; }

  let filterStatus = '';
  let filterPriority = '';
  let filterType = '';
  let filterCategory = '';
  let filterSearch = '';
  let tableInstance = null;

  function getData() {
    let tasks = Storage.getCollection(Storage.KEYS.TASKS);
    if (filterStatus) tasks = tasks.filter(t => t.status === filterStatus);
    if (filterPriority) tasks = tasks.filter(t => t.priority === filterPriority);
    if (filterCategory) tasks = tasks.filter(t => t.taskCategory === filterCategory);
    if (filterType) tasks = tasks.filter(t => t.taskSubcategory === filterType);
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      tasks = tasks.filter(t => t.name.toLowerCase().includes(q) || (t.taskNumber && t.taskNumber.toLowerCase().includes(q)));
    }
    return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function renderPage() {
    const data = getData();

    content.innerHTML = `
      <div class="page-wrapper">
        ${Utils.pageHeader('משימות', Utils.pageMeta())}

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <button class="btn btn-secondary btn-sm" id="btn-export">${Utils.icon('download', 14)} ייצוא</button>
          ${Permissions.can('createTask') ? `<button class="btn btn-primary" onclick="Router.navigate('/add-task')">${Utils.icon('plus', 14)} משימה חדשה</button>` : ''}
        </div>

        <!-- Filter panel -->
        <div class="retrieval-panel">
          <div class="retrieval-panel-header">סינון</div>
          <div class="retrieval-grid">
            <div class="form-group">
              <label class="form-label">סטטוס</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:4px">
                ${[{id:'',label:'הכל'}, ...TASK_STATUSES].map(s => `
                  <button class="btn btn-sm ${filterStatus === s.id ? 'btn-primary' : 'btn-secondary'}" onclick="window._filterTaskStatus('${s.id}')">${Utils.escHtml(s.label)}</button>
                `).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">עדיפות</label>
              <select class="form-control" id="f-priority">
                <option value="">כל העדיפויות</option>
                ${PRIORITIES.map(p => `<option value="${p.id}" ${filterPriority === p.id ? 'selected' : ''}>${Utils.escHtml(p.label)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">סוג</label>
              <select class="form-control" id="f-category">
                <option value="">הכל</option>
                <option value="operational" ${filterCategory === 'operational' ? 'selected' : ''}>מבצעי</option>
                <option value="administrative" ${filterCategory === 'administrative' ? 'selected' : ''}>מנהלתי</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">תת קטגוריה</label>
              <select class="form-control" id="f-type">
                <option value="">כל תתי הקטגוריות</option>
                ${(filterCategory ? TASK_SUBCATEGORIES[filterCategory] || [] : TASK_SUBCATEGORIES.operational.concat(TASK_SUBCATEGORIES.administrative)).map(t => `<option value="${t.id}" ${filterType === t.id ? 'selected' : ''}>${Utils.escHtml(t.label)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">חיפוש</label>
              <input class="form-control" id="tbl-search" placeholder="שם משימה / מספר..." value="${Utils.escHtml(filterSearch)}">
            </div>
          </div>
        </div>

        <!-- Table panel -->
        <div class="table-panel">
          <div class="table-panel-header">
            <span>רשימת משימות</span>
            <span style="font-size:12px;color:var(--color-text-muted)">${data.length} רשומות</span>
          </div>
          <div id="tasks-table"></div>
        </div>

        ${Utils.classificationFooter()}
      </div>
    `;

    tableInstance = DataTable.create({
      containerId: 'tasks-table',
      data,
      rowKey: 'id',
      columns: [
        { key: 'taskNumber', label: 'מספר משימה', tdClass: 'td-number' },
        { key: 'name', label: 'שם המשימה' },
        { key: 'priority', label: 'עדיפות', render: v => StatusBadge.renderPriority(v) },
        { key: 'taskCategory', label: 'סוג', render: v => v === 'operational' ? '<span class="badge badge-danger">מבצעי</span>' : v === 'administrative' ? '<span class="badge badge-info">מנהלתי</span>' : '<span class="badge badge-draft">לא סווג</span>' },
        { key: 'taskSubcategory', label: 'תת קטגוריה', render: (v, row) => { const l = taskSubcategoryLabel(row.taskCategory, v); return l ? Utils.escHtml(l) : '<span class="badge badge-draft">לא סווג</span>'; } },
        { key: 'date', label: 'תאריך', render: v => Utils.formatDate(v) },
        { key: 'time', label: 'שעה', render: v => v || '—' },
        { key: 'status', label: 'סטטוס', render: v => StatusBadge.render(v) },
        { key: 'assignedUnit', label: 'יחידה' },
        { key: 'commanderName', label: 'מפקד', render: v => Utils.escHtml(v || '—') },
      ],
      actions: (row) => `
        <button class="row-action-btn" onclick="Router.navigate('/task-dashboard',{id:'${row.id}'})">${Utils.icon('view', 14)}</button>
        ${Permissions.can('createTask') ? `<button class="row-action-btn danger" onclick="window.deleteTask('${row.id}')">${Utils.icon('trash', 14)}</button>` : ''}
      `,
      onRowClick: (row) => Router.navigate('/task-dashboard', {id: row.id}),
      rowClass: (row) => {
        if (row.status === 'completed' || row.status === 'cancelled') return 'row-dim';
        if (row.date < Utils.today() && row.status !== 'completed') return 'row-highlight-danger';
        return '';
      },
      emptyMessage: 'אין משימות התואמות את הסינון',
    });

    Utils.el('tbl-search').addEventListener('input', Utils.debounce(() => {
      filterSearch = Utils.el('tbl-search').value;
      { const d = getData(); tableInstance.update(d); const hc = document.querySelector('.table-panel-header span:last-child'); if (hc) hc.textContent = d.length + ' רשומות'; }
    }, 300));

    Utils.el('f-priority').addEventListener('change', () => {
      filterPriority = Utils.el('f-priority').value;
      { const d = getData(); tableInstance.update(d); const hc = document.querySelector('.table-panel-header span:last-child'); if (hc) hc.textContent = d.length + ' רשומות'; }
    });

    Utils.el('f-category').addEventListener('change', () => {
      filterCategory = Utils.el('f-category').value;
      filterType = '';   // subcategory options depend on the type — drop a now-incompatible selection
      renderPage();
    });

    Utils.el('f-type').addEventListener('change', () => {
      filterType = Utils.el('f-type').value;
      { const d = getData(); tableInstance.update(d); const hc = document.querySelector('.table-panel-header span:last-child'); if (hc) hc.textContent = d.length + ' רשומות'; }
    });

    Utils.el('btn-export').onclick = () => {
      const rows = getData().map(t => [t.taskNumber, t.name, t.priority, t.date, t.status, t.commanderName || t.commander]);
      Utils.exportCsv('tasks.csv', ['מספר', 'שם', 'עדיפות', 'תאריך', 'סטטוס', 'מפקד'], rows);
    };

    window._filterTaskStatus = (status) => {
      filterStatus = status;
      renderPage();
    };

    window.deleteTask = async (id) => {
      const ok = await Modal.confirm({ title: 'מחיקת משימה', message: 'האם למחוק משימה זו?', type: 'danger' });
      if (!ok) return;
      Storage.softDelete(Storage.KEYS.TASKS, id);
      Toast.success('המשימה נמחקה');
      renderPage();
    };
  }

  renderPage();
};
