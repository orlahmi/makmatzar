/* deserter-retrieval.js — אחזור עריק/משתמט (fields per legacy Alon retrieval screen) */
'use strict';

window.Pages = window.Pages || {};

Pages['deserter-retrieval'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('investigation')) { content.innerHTML = EmptyState.accessDenied(); return; }

  const EMPTY = { type: 'all', militaryNumber: '', nationalId: '', lastName: '', firstName: '', dateFrom: '', dateTo: '', activeOnly: false };
  let f = Object.assign({}, EMPTY);
  let tableInstance = null;

  const people = Storage.getCollection(Storage.KEYS.PEOPLE);
  const pMap = Object.fromEntries(people.map(p => [p.id, p]));
  // legacy records carry `type`, some carry `deserterType` — normalise on read only
  const typeOf = file => file.type || file.deserterType || 'deserter';
  const typeLabel = file => typeOf(file) === 'shirker' ? 'משתמט' : 'עריק';

  function getData() {
    const files = Storage.getCollection(Storage.KEYS.DESERTER_FILES).filter(file => {
      const p = pMap[file.personId] || {};
      if (f.type !== 'all' && typeOf(file) !== f.type) return false;
      if (f.militaryNumber && !(p.militaryNumber || '').includes(f.militaryNumber.trim())) return false;
      if (f.nationalId && !(p.nationalId || '').includes(f.nationalId.trim())) return false;
      if (f.lastName && !(p.lastName || '').includes(f.lastName.trim())) return false;
      if (f.firstName && !(p.firstName || '').includes(f.firstName.trim())) return false;
      if (f.dateFrom && (file.startDate || '') < f.dateFrom) return false;
      if (f.dateTo && (file.startDate || '') > f.dateTo) return false;
      if (f.activeOnly && file.status !== 'active') return false;
      return true;
    });
    return files.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  }

  function readFilters() {
    f = {
      type: Utils.el('d-type').value,
      militaryNumber: Utils.el('d-mil').value,
      nationalId: Utils.el('d-nid').value,
      lastName: Utils.el('d-last').value,
      firstName: Utils.el('d-first').value,
      dateFrom: Utils.el('d-from').value,
      dateTo: Utils.el('d-to').value,
      activeOnly: Utils.el('d-active').checked,
    };
  }

  function renderPage() {
    const data = getData();

    content.innerHTML = `
      <div class="page-wrapper">
        ${Utils.pageHeader('אחזור עריק/משתמט', Utils.pageMeta())}

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <button class="btn btn-secondary btn-sm" id="btn-export">${Utils.icon('download', 14)} ייצוא</button>
        </div>

        <div class="retrieval-panel">
          <div class="retrieval-panel-header">איתור עריק/משתמט</div>
          <div class="retrieval-grid">
            <div class="form-group"><label class="form-label">סוג</label>
              <select class="form-control" id="d-type">
                <option value="all" ${f.type === 'all' ? 'selected' : ''}>הכל</option>
                <option value="deserter" ${f.type === 'deserter' ? 'selected' : ''}>עריק</option>
                <option value="shirker" ${f.type === 'shirker' ? 'selected' : ''}>משתמט</option>
              </select></div>
            <div class="form-group"><label class="form-label">מספר אישי</label><input class="form-control" id="d-mil" value="${Utils.escHtml(f.militaryNumber)}"></div>
            <div class="form-group"><label class="form-label">ת.ז.</label><input class="form-control" id="d-nid" value="${Utils.escHtml(f.nationalId)}"></div>
            <div class="form-group"><label class="form-label">שם משפחה</label><input class="form-control" id="d-last" value="${Utils.escHtml(f.lastName)}"></div>
            <div class="form-group"><label class="form-label">שם פרטי</label><input class="form-control" id="d-first" value="${Utils.escHtml(f.firstName)}"></div>
            <div class="form-group"><label class="form-label">מתאריך</label><input type="date" class="form-control" id="d-from" value="${f.dateFrom}"></div>
            <div class="form-group"><label class="form-label">עד תאריך</label><input type="date" class="form-control" id="d-to" value="${f.dateTo}"></div>
            <div class="form-group"><label class="form-label">&nbsp;</label>
              <label style="display:flex;gap:8px;align-items:center;height:36px"><input type="checkbox" id="d-active" ${f.activeOnly ? 'checked' : ''}> הצג רק פעילים</label></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn-primary" id="btn-search">${Utils.icon('search', 14)} אתר</button>
            <button class="btn btn-secondary" id="btn-reset">נקה</button>
          </div>
        </div>

        <div class="table-panel">
          <div class="table-panel-header">
            <span>תוצאות</span>
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
        { key: 'type', label: 'סוג', render: (v, row) => `<span class="badge ${typeOf(row) === 'shirker' ? 'badge-warning' : 'badge-danger'}">${typeLabel(row)}</span>` },
        { key: 'personId', label: 'מ"א', tdClass: 'td-id', render: (v) => { const p = pMap[v]; return p ? Utils.escHtml(p.militaryNumber) : '—'; } },
        { key: 'personId', label: 'ת"ז', tdClass: 'td-id', render: (v) => { const p = pMap[v]; return p ? Utils.escHtml(p.nationalId) : '—'; } },
        { key: 'personId', label: 'שם פרטי', render: (v) => { const p = pMap[v]; return p ? Utils.escHtml(p.firstName) : '—'; } },
        { key: 'personId', label: 'שם משפחה', render: (v) => { const p = pMap[v]; return p ? Utils.escHtml(p.lastName) : '—'; } },
        { key: 'baseId', label: 'בסיס שיטור', render: (v) => { const b = BASE_MAP[v]; return b ? Utils.escHtml(b.shortName) : '—'; } },
        { key: 'startDate', label: 'תחילת עריקות', render: v => Utils.formatDate(v) },
        { key: 'daysAbsent', label: 'ימי היעדרות', render: (v, row) => `<strong>${Utils.daysBetween(row.startDate, row.endDate || Utils.today())}</strong>` },
        { key: 'status', label: 'סטטוס', render: v => StatusBadge.render(v) },
      ],
      actions: (row) => `
        <button class="row-action-btn" title="צפייה" onclick="Router.navigate('/deserter-file', {id:'${row.id}'})">${Utils.icon('view', 14)}</button>
      `,
      onRowClick: (row) => Router.navigate('/deserter-file', { id: row.id }),
      rowClass: (row) => row.status === 'active' ? 'row-critical' : '',
      emptyMessage: 'לא נמצאו עריקים/משתמטים התואמים לחיפוש',
    });

    const doSearch = () => { readFilters(); renderPage(); };
    Utils.el('btn-search').onclick = doSearch;
    Utils.el('btn-reset').onclick = () => { f = Object.assign({}, EMPTY); renderPage(); };
    content.querySelectorAll('.retrieval-panel input').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); }));

    Utils.el('btn-export').onclick = () => {
      const rows = getData().map(fl => {
        const p = pMap[fl.personId] || {};
        return [typeLabel(fl), p.militaryNumber || '', p.nationalId || '', p.firstName || '', p.lastName || '', fl.startDate || '', fl.status];
      });
      Utils.exportCsv('deserters.csv', ['סוג', 'מ"א', 'ת"ז', 'שם פרטי', 'שם משפחה', 'תחילת עריקות', 'סטטוס'], rows);
    };

  }

  renderPage();
};
