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
          ${Permissions.can('createDeserterFile') ? `<button class="btn btn-primary" id="btn-new">${Utils.icon('plus', 14)} תיק חדש</button>` : ''}
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

    if (Utils.el('btn-new')) Utils.el('btn-new').onclick = () => showNewDeserterModal();
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
            <label class="form-label">סוג</label>
            <select id="nd-type" class="form-control">
              <option value="deserter">עריק</option>
              <option value="shirker">משתמט</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">עריק מתאריך <span class="required">*</span></label>
            <input type="date" id="nd-start" class="form-control" value="${Utils.today()}">
          </div>
          <div class="form-group">
            <label class="form-label">בסיס שיטור מטפל <span class="required">*</span></label>
            <select id="nd-base" class="form-control">${DEMO_BASES.map(b => `<option value="${b.id}" ${(AppState.get('currentBase') || {}).id === b.id ? 'selected' : ''}>${Utils.escHtml(b.shortName)}</option>`).join('')}</select>
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
      const dup = Storage.getCollection(Storage.KEYS.DESERTER_FILES).find(x => x.personId === personId && x.status === 'active');
      if (dup) { Toast.error('כבר קיים תיק פעיל לאדם זה (' + dup.fileNumber + ')'); return; }
      const user = Auth.getCurrentUser();
      const file = {
        id: 'df_' + Utils.generateId(),
        fileNumber: 'ED-' + String(Math.floor(Math.random() * 900000) + 100000),
        personId,
        baseId: Utils.el('nd-base').value,
        type: Utils.el('nd-type').value,
        openDate: Utils.today(),
        startDate,
        endDate: null,
        status: 'active',
        lastLocationKnown: Utils.el('nd-location').value,
        notes: Utils.el('nd-notes').value,
        assignedTo: user ? user.firstName + ' ' + user.lastName : '',
        activities: [],
        addresses: [],
        pastDesertions: [],
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
