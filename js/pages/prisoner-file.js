/* prisoner-file.js — prisoner management workspace */
'use strict';

window.Pages = window.Pages || {};

Pages['prisoner-file'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('incarceration')) { content.innerHTML = EmptyState.accessDenied(); return; }

  const fileId = query && query.id;
  const canEdit = Permissions.can('editPrisoner');

  // List view when no ID
  if (!fileId) {
    renderList();
    return;
  }

  // Single file view
  const file = Storage.getById(Storage.KEYS.PRISONER_FILES, fileId);
  if (!file) { content.innerHTML = EmptyState.notFound(fileId); return; }
  renderFile(file);

  function renderList() {
    let filterStatus = '';
    let filterType = '';
    let filterSearch = '';
    let tableInstance = null;

    const people = Storage.getCollection(Storage.KEYS.PEOPLE);
    const pMap = Object.fromEntries(people.map(p => [p.id, p]));

    function getData() {
      let files = Storage.getCollection(Storage.KEYS.PRISONER_FILES);
      if (filterStatus) files = files.filter(f => f.status === filterStatus);
      if (filterType) files = files.filter(f => f.prisonerType === filterType);
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        files = files.filter(f => {
          const p = pMap[f.personId];
          return f.fileNumber.toLowerCase().includes(q) ||
            (p && (p.firstName + ' ' + p.lastName).toLowerCase().includes(q)) ||
            (p && p.militaryNumber.includes(q));
        });
      }
      return files.sort((a, b) => (b.admissionDate || '').localeCompare(a.admissionDate || ''));
    }

    content.innerHTML = `
      <div class="page-wrapper">
        ${Utils.pageHeader('תיק כלוא', Utils.pageMeta())}

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <button class="btn btn-secondary btn-sm" id="btn-export">${Utils.icon('download', 14)} ייצוא</button>
          ${Permissions.can('createPrisoner') ? `<button class="btn btn-primary" id="btn-new">${Utils.icon('plus', 14)} כלוא חדש</button>` : ''}
        </div>

        <!-- Filter panel -->
        <div class="retrieval-panel">
          <div class="retrieval-panel-header">סינון</div>
          <div class="retrieval-grid">
            <div class="form-group">
              <label class="form-label">סטטוס</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:4px">
                ${[{id:'',label:'הכל'}, ...PRISONER_STATUSES].map(s => `
                  <button class="btn btn-sm ${filterStatus === s.id ? 'btn-primary' : 'btn-secondary'}" onclick="window._pFilterStatus('${s.id}')">${Utils.escHtml(s.label)}</button>
                `).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">סוג</label>
              <select class="form-control" id="f-type">
                <option value="">כל הסוגים</option>
                ${PRISONER_TYPES.map(t => `<option value="${t.id}">${Utils.escHtml(t.label)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">חיפוש</label>
              <input class="form-control" id="p-search" placeholder="שם / מ.א / מספר תיק...">
            </div>
          </div>
        </div>

        <!-- Table panel -->
        <div class="table-panel">
          <div class="table-panel-header">תיקי כלואים</div>
          <div id="prisoner-table"></div>
        </div>

        ${Utils.classificationFooter()}
      </div>
    `;

    tableInstance = DataTable.create({
      containerId: 'prisoner-table',
      data: getData(),
      rowKey: 'id',
      columns: [
        { key: 'fileNumber', label: 'מספר תיק', tdClass: 'td-number' },
        { key: 'personId', label: 'שם', render: (v) => { const p = pMap[v]; return p ? Utils.escHtml(p.firstName + ' ' + p.lastName) : '—'; } },
        { key: 'personId', label: 'מ"א', tdClass: 'td-id', render: (v) => { const p = pMap[v]; return p ? Utils.escHtml(p.militaryNumber) : '—'; } },
        { key: 'prisonerType', label: 'סוג', render: v => Utils.escHtml(v || '—') },
        { key: 'admissionDate', label: 'תאריך קבלה', render: v => Utils.formatDate(v) },
        { key: 'expectedRelease', label: 'שחרור צפוי', render: v => {
          if (!v) return '—';
          const days = Utils.daysBetween(Utils.today(), v);
          const cls = days <= 1 ? 'color:var(--color-danger)' : days <= 7 ? 'color:var(--color-warning)' : '';
          return `<span style="${cls}">${Utils.formatDate(v)}</span>`;
        }},
        { key: 'riskLevel', label: 'רמת סיכון', render: v => StatusBadge.renderRisk(v) },
        { key: 'status', label: 'סטטוס', render: v => StatusBadge.render(v) },
        { key: 'detentionCompany', label: 'כלא', render: v => Utils.escHtml(v || '—') },
      ],
      actions: (row) => `
        <button class="row-action-btn" onclick="Router.navigate('/prisoner-file', {id:'${row.id}'})">${Utils.icon('view', 14)}</button>
      `,
      onRowClick: (row) => Router.navigate('/prisoner-file', { id: row.id }),
      rowClass: (row) => {
        if (row.status !== 'active') return '';
        if (row.riskLevel === 'critical') return 'row-critical';
        if (row.expectedRelease && Utils.daysBetween(Utils.today(), row.expectedRelease) <= 3) return 'row-attention';
        return '';
      },
      emptyMessage: 'אין תיקי כלואים',
    });

    Utils.el('p-search').addEventListener('input', Utils.debounce(() => {
      filterSearch = Utils.el('p-search').value;
      tableInstance.update(getData());
    }, 300));

    Utils.el('f-type').onchange = () => { filterType = Utils.el('f-type').value; tableInstance.update(getData()); };
    Utils.el('btn-export').onclick = () => {
      const rows = getData().map(f => {
        const p = pMap[f.personId];
        return [f.fileNumber, p ? p.firstName + ' ' + p.lastName : '', p ? p.militaryNumber : '', f.prisonerType, f.admissionDate, f.status];
      });
      Utils.exportCsv('prisoners.csv', ['מספר תיק', 'שם', 'מ"א', 'סוג', 'קבלה', 'סטטוס'], rows);
    };

    window._pFilterStatus = (status) => { filterStatus = status; renderList(); };

    if (Utils.el('btn-new')) {
      Utils.el('btn-new').onclick = () => showNewPrisonerModal(pMap, people, content, renderList);
    }
  }

  function renderFile(file) {
    const people = Storage.getCollection(Storage.KEYS.PEOPLE);
    const person = people.find(p => p.id === file.personId);
    const rankLabel = (id) => { const r = RANK_MAP && RANK_MAP[id]; return r ? r.label : (id || '—'); };
    const esc = (v) => Utils.escHtml(v || '—');
    const fd = (v) => v ? Utils.formatDate(v) : '—';
    const daysLeft = file.expectedRelease ? Utils.daysBetween(Utils.today(), file.expectedRelease) : null;

    const daysLeftColor = daysLeft !== null ? (daysLeft <= 3 ? 'color:#f87171' : daysLeft <= 7 ? 'color:#fbbf24' : 'color:#34d399') : '';
    const daysLeftLabel = daysLeft !== null ? (daysLeft <= 0 ? 'עבר מועד שחרור' : daysLeft === 1 ? 'יום אחד לשחרור' : `${daysLeft} ימים לשחרור`) : '';
    const riskColors = { critical: '#f87171', high: '#fbbf24', medium: '#60a5fa', low: '#34d399' };
    const riskColor = riskColors[file.riskLevel] || 'rgba(255,255,255,0.6)';

    const riskPanelClass = file.riskLevel === 'critical' ? 'risk-critical' : file.riskLevel === 'high' ? 'risk-high' : file.riskLevel === 'medium' ? 'risk-medium' : 'risk-low';

    content.innerHTML = `
      <div class="page-wrapper">

        <!-- White identity panel — breadcrumb + actions -->
        <div class="page-header compact">
          <div class="page-header-left">
            <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/prisoner-file')" style="margin-bottom:4px;padding-right:0">${Utils.icon('chevronRight', 12)} תיקי כלואים</button>
          </div>
          <div class="page-header-actions">
            ${canEdit && file.status === 'active' ? `<button class="btn btn-warning btn-sm" onclick="window.releasePrisoner('${file.id}')">שחרר</button>` : ''}
            <button class="btn btn-secondary btn-sm" onclick="window.print()">${Utils.icon('print', 13)} הדפסה</button>
          </div>
        </div>

        <div class="identity-panel ${riskPanelClass}" style="margin-bottom:var(--space-4)">
          ${person ? `<div class="identity-panel-avatar" style="background:${Utils.avatarColor(person.firstName)}">${Utils.initials(person.firstName, person.lastName)}</div>` : ''}
          <div class="identity-panel-body">
            <div class="identity-panel-name">${person ? esc(person.firstName + ' ' + person.lastName) : esc(file.fileNumber)}</div>
            <div class="identity-panel-sub">${person ? esc(rankLabel(person.rank)) + ' · מ"א ' + esc(person.militaryNumber) : ''} · תיק ${esc(file.fileNumber)}</div>
            <div class="identity-panel-meta">
              <div class="identity-panel-item"><div class="identity-panel-label">סוג כלוא</div><div class="identity-panel-value">${esc(file.prisonerType)}</div></div>
              <div class="identity-panel-item"><div class="identity-panel-label">סטטוס</div><div class="identity-panel-value">${StatusBadge.render(file.status)}</div></div>
              <div class="identity-panel-item"><div class="identity-panel-label">רמת סיכון</div><div class="identity-panel-value">${StatusBadge.renderRisk(file.riskLevel)}</div></div>
              <div class="identity-panel-item"><div class="identity-panel-label">כלא / תא</div><div class="identity-panel-value">${esc(file.detentionCompany)} · ${esc(file.cell)}</div></div>
              <div class="identity-panel-item"><div class="identity-panel-label">קבלה</div><div class="identity-panel-value">${fd(file.admissionDate)}</div></div>
              ${daysLeft !== null ? `<div class="identity-panel-item"><div class="identity-panel-label">שחרור</div><div class="identity-panel-value" style="${daysLeftColor};font-weight:700">${daysLeftLabel}</div></div>` : ''}
            </div>
          </div>
        </div>

        <div id="prisoner-tabs">
          <div class="tabs-nav" role="tablist"></div>
          <div class="tab-panel" data-tab="general">${renderPrisonerGeneral(file, person, esc, fd)}</div>
          <div class="tab-panel" data-tab="detention">${renderPrisonerDetention(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="activities">${renderPrisonerActivities(file, fd, esc)}</div>
          <div class="tab-panel" data-tab="restrictions">${renderPrisonerRestrictions(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="health">${renderPrisonerHealth(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="visits">${renderPrisonerVisits(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="disciplines">${renderPrisonerDisciplines(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="behavior">${renderPrisonerBehavior(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="work">${renderPrisonerWork(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="education">${renderPrisonerEducation(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="appeals">${renderPrisonerAppeals(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="deposits">${renderPrisonerDeposits(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="requests">${renderPrisonerRequests(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="interviews">${renderPrisonerInterviews(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="phoneCalls">${renderPrisonerPhoneCalls(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="releases">${renderPrisonerReleases(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="history">${renderPrisonerHistory(file.id)}</div>
        </div>
      </div>
    `;

    Tabs.create({
      containerId: 'prisoner-tabs',
      defaultTab: 'general',
      tabs: [
        { id: 'general', label: 'כללי' },
        { id: 'detention', label: 'כליאה' },
        { id: 'activities', label: 'פעילויות' },
        { id: 'restrictions', label: 'הגבלות' },
        { id: 'health', label: 'בריאות' },
        { id: 'visits', label: 'ביקורים' },
        { id: 'disciplines', label: 'ענישה' },
        { id: 'behavior', label: 'התנהגות' },
        { id: 'work', label: 'עבודה' },
        { id: 'education', label: 'לימודים' },
        { id: 'appeals', label: 'ערעורים' },
        { id: 'deposits', label: 'פקדונות' },
        { id: 'requests', label: 'בקשות' },
        { id: 'interviews', label: 'ראיונות' },
        { id: 'phoneCalls', label: 'שיחות טלפון' },
        { id: 'releases', label: 'שחרורים' },
        { id: 'history', label: 'היסטוריה' },
      ],
    });

    window.releasePrisoner = async (id) => {
      const ok = await Modal.confirm({ title: 'שחרור כלוא', message: 'האם לסמן כלוא זה כמשוחרר?', type: 'warning', confirmLabel: 'שחרר' });
      if (!ok) return;
      file.status = 'released';
      file.actualRelease = Utils.today();
      file.updatedAt = new Date().toISOString();
      Storage.upsert(Storage.KEYS.PRISONER_FILES, file);
      Audit.log({ module: 'incarceration', action: 'release', entityType: 'prisonerFile', entityId: id, description: `שחרור כלוא ${file.fileNumber}` });
      Toast.success('הכלוא שוחרר');
      setTimeout(() => Router.navigate('/prisoner-file', { id }), 400);
    };
  }

  function infoRow(label, value) {
    return `<div class="info-list-row"><div class="info-list-label">${Utils.escHtml(label)}</div><div class="info-list-value">${value}</div></div>`;
  }

  function renderPrisonerGeneral(file, person, esc, fd) {
    const rankLabel = (id) => { const r = RANK_MAP && RANK_MAP[id]; return r ? r.label : (id || '—'); };
    return `
      <div class="tab-section-grid">
        <div class="card">
          <div class="card-header"><div class="card-title">פרטי תיק</div></div>
          <div class="card-body">
            <div class="info-list">
              ${infoRow('מספר תיק', esc(file.fileNumber))}
              ${infoRow('סוג כלוא', esc(file.prisonerType))}
              ${infoRow('רמת סיכון', StatusBadge.renderRisk(file.riskLevel))}
              ${infoRow('סטטוס', StatusBadge.render(file.status))}
              ${infoRow('תאריך קבלה', fd(file.admissionDate))}
              ${infoRow('שחרור צפוי', fd(file.expectedRelease))}
              ${infoRow('שחרור בפועל', fd(file.actualRelease))}
              ${infoRow('כלא', esc(file.detentionCompany))}
              ${infoRow('חדר / תא', esc(file.cell))}
              ${infoRow('מפקד אחראי', esc(file.responsibleOfficer))}
            </div>
          </div>
        </div>
        ${person ? `
        <div class="card">
          <div class="card-header"><div class="card-title">פרטי האדם</div></div>
          <div class="card-body">
            <div class="info-list">
              ${infoRow('שם מלא', esc(person.firstName + ' ' + person.lastName))}
              ${infoRow('מספר אישי', esc(person.militaryNumber))}
              ${infoRow('ת.ז.', esc(person.nationalId))}
              ${infoRow('דרגה', esc(rankLabel(person.rank)))}
              ${infoRow('חיל', esc(person.corps))}
              ${infoRow('טלפון', esc(person.phone))}
              ${infoRow('עיר', esc(person.city))}
            </div>
          </div>
        </div>
        ` : ''}
        <div class="card" style="grid-column:1/-1">
          <div class="card-header"><div class="card-title">עבירות ועילת מעצר</div></div>
          <div class="card-body">
            <div class="info-list">
              ${infoRow('עילת מעצר', esc(file.detentionReason))}
              ${infoRow('תיאור', esc(file.notes))}
            </div>
          </div>
        </div>
        ${(function() {
          const coord = (Storage.getCollection(Storage.KEYS.MASHLAT_COORDINATIONS) || []).find(c => c.prisonerFileId === file.id || c.id === file.coordinationId);
          if (!coord) return '';
          return `<div class="card" style="grid-column:1/-1">
            <div class="card-header"><div class="card-title">${Utils.icon('coordination', 14)} מקור — משל"ט</div></div>
            <div class="card-body">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <div>
                  <div style="font-size:13px">תיאום <strong>${Utils.escHtml(coord.coordinationNumber)}</strong> — ${Utils.formatDate(coord.coordinationDate)} ${Utils.escHtml(coord.coordinationTime || '')}</div>
                  <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px">מתאם: ${Utils.escHtml(coord.coordinatorName || '—')} | יחידה שולחת: ${Utils.escHtml(coord.sourceUnitName || '—')}</div>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/mashlat')">${Utils.icon('arrowLeft', 12)} פתח משל"ט</button>
              </div>
            </div>
          </div>`;
        })()}
      </div>
    `;
  }

  function renderPrisonerDetention(file, esc, fd) {
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">פרטי כליאה</div></div>
        <div class="card-body">
          <div class="info-list">
            ${infoRow('מתקן כליאה', esc(file.detentionCompany))}
            ${infoRow('חדר / תא', esc(file.cell))}
            ${infoRow('תנאי כליאה', esc(file.detentionConditions))}
            ${infoRow('פסיקת בית משפט', esc(file.courtOrder))}
            ${infoRow('תאריך צו', fd(file.courtOrderDate))}
            ${infoRow('שופט', esc(file.judge))}
            ${infoRow('עורך דין', esc(file.lawyer))}
            ${infoRow('מסגרת ביטחון', esc(file.securityLevel))}
          </div>
        </div>
      </div>
    `;
  }

  function renderPrisonerActivities(file, fd, esc) {
    const acts = Storage.getCollection(Storage.KEYS.INMATE_ACTIVITIES).filter(a => a.prisonerFileId === file.id).slice(0, 10);
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">פעילויות אחרונות</div>
          <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/inmate-activities')">כל הפעילויות</button>
        </div>
        <div class="card-body">
          ${acts.length === 0 ? '<div class="empty-state-desc">אין פעילויות מתועדות.</div>' : `
            <table class="data-table">
              <thead><tr><th>תאריך</th><th>שעה</th><th>סוג פעילות</th><th>מיקום</th><th>הערות</th></tr></thead>
              <tbody>
                ${acts.map(a => `<tr>
                  <td>${fd(a.date)}</td>
                  <td>${esc(a.time)}</td>
                  <td>${esc(a.activityTypeLabel || (INMATE_ACTIVITY_TYPES||[]).find(t=>t.id===a.activityType)?.label || a.activityType)}</td>
                  <td>${esc(a.location)}</td>
                  <td>${Utils.truncate(a.notes || '', 40)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function renderPrisonerRestrictions(file, esc, fd) {
    const restrictions = file.restrictions || [];
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">הגבלות</div>
          ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="Toast.info('הוספת הגבלה בפיתוח')">הוסף הגבלה</button>` : ''}
        </div>
        <div class="card-body">
          ${restrictions.length === 0 ? '<div class="empty-state-desc">אין הגבלות מיוחדות.</div>' : `
            <table class="data-table">
              <thead><tr><th>סוג</th><th>מתאריך</th><th>עד תאריך</th><th>סיבה</th></tr></thead>
              <tbody>
                ${restrictions.map(r => `<tr><td>${esc(r.type)}</td><td>${fd(r.from)}</td><td>${fd(r.to)}</td><td>${esc(r.reason)}</td></tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function renderPrisonerHealth(file, esc, fd) {
    const h = file.health || {};
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">מצב בריאותי</div></div>
        <div class="card-body">
          <div class="info-list">
            ${infoRow('מצב כללי', esc(h.generalStatus))}
            ${infoRow('מגבלות רפואיות', esc(h.medicalRestrictions))}
            ${infoRow('תרופות', esc(h.medications))}
            ${infoRow('בדיקה רפואית אחרונה', fd(h.lastCheckup))}
            ${infoRow('רופא אחראי', esc(h.doctor))}
          </div>
          ${!h.generalStatus ? '<div class="empty-state-desc" style="margin-top:12px">לא הוזנו נתונים רפואיים.</div>' : ''}
        </div>
      </div>
    `;
  }

  function renderPrisonerVisits(file, esc, fd) {
    const visits = file.visits || [];
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">ביקורים</div>
          ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="Toast.info('רישום ביקור בפיתוח')">רשום ביקור</button>` : ''}
        </div>
        <div class="card-body">
          ${visits.length === 0 ? '<div class="empty-state-desc">אין ביקורים מתועדים.</div>' : `
            <table class="data-table">
              <thead><tr><th>תאריך</th><th>שעה</th><th>מבקר</th><th>קשר</th><th>אורך</th></tr></thead>
              <tbody>
                ${visits.map(v => `<tr><td>${fd(v.date)}</td><td>${esc(v.time)}</td><td>${esc(v.visitorName)}</td><td>${esc(v.relation)}</td><td>${esc(v.duration)}</td></tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function renderPrisonerDisciplines(file, esc, fd) {
    const disc = file.disciplines || [];
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">ענישה משמעתית</div></div>
        <div class="card-body">
          ${disc.length === 0 ? '<div class="empty-state-desc">אין רשומות ענישה.</div>' : `
            <table class="data-table">
              <thead><tr><th>תאריך</th><th>עבירה</th><th>ענישה</th><th>מאשר</th></tr></thead>
              <tbody>
                ${disc.map(d => `<tr><td>${fd(d.date)}</td><td>${esc(d.offense)}</td><td>${esc(d.punishment)}</td><td>${esc(d.approver)}</td></tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function renderPrisonerBehavior(file, esc, fd) {
    const beh = file.behaviorLog || [];
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">יומן התנהגות</div>
          ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="window.addBehaviorEntry('${file.id}')">הוסף רשומה</button>` : ''}
        </div>
        <div class="card-body">
          ${beh.length === 0 ? '<div class="empty-state-desc">אין רשומות התנהגות.</div>' : `
            <table class="data-table">
              <thead><tr><th>תאריך</th><th>סוג</th><th>תיאור</th><th>מדווח</th></tr></thead>
              <tbody>
                ${beh.map(b => `<tr><td>${fd(b.date)}</td><td>${StatusBadge.render(b.type)}</td><td>${Utils.truncate(b.description, 50)}</td><td>${esc(b.reporter)}</td></tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function renderPrisonerWork(file, esc, fd) {
    const w = file.workAssignment || {};
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">שיבוץ עבודה</div></div>
        <div class="card-body">
          <div class="info-list">
            ${infoRow('תפקיד', esc(w.role))}
            ${infoRow('יחידת עבודה', esc(w.unit))}
            ${infoRow('שעות יום', esc(w.hours))}
            ${infoRow('מפקד ישיר', esc(w.supervisor))}
            ${infoRow('תחילת שיבוץ', fd(w.startDate))}
          </div>
          ${!w.role ? '<div class="empty-state-desc" style="margin-top:12px">לא הוגדר שיבוץ עבודה.</div>' : ''}
        </div>
      </div>
    `;
  }

  function renderPrisonerEducation(file, esc, fd) {
    const edu = file.education || {};
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">לימודים ושיקום</div></div>
        <div class="card-body">
          <div class="info-list">
            ${infoRow('תכנית לימודים', esc(edu.program))}
            ${infoRow('מוסד', esc(edu.institution))}
            ${infoRow('סטטוס', esc(edu.status))}
            ${infoRow('הערות', esc(edu.notes))}
          </div>
          ${!edu.program ? '<div class="empty-state-desc" style="margin-top:12px">לא הוגדרו לימודים.</div>' : ''}
        </div>
      </div>
    `;
  }

  function renderPrisonerAppeals(file, esc, fd) {
    const appeals = file.appeals || [];
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">ערעורים ועתירות</div></div>
        <div class="card-body">
          ${appeals.length === 0 ? '<div class="empty-state-desc">אין ערעורים מתועדים.</div>' : `
            <table class="data-table">
              <thead><tr><th>תאריך</th><th>נושא</th><th>תוצאה</th></tr></thead>
              <tbody>
                ${appeals.map(a => `<tr><td>${fd(a.date)}</td><td>${esc(a.subject)}</td><td>${StatusBadge.render(a.result)}</td></tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function renderPrisonerDeposits(file, esc, fd) {
    const deposits = file.deposits || [];
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">פקדונות</div></div>
        <div class="card-body">
          ${deposits.length === 0 ? '<div class="empty-state-desc">אין פקדונות רשומים.</div>' : `
            <table class="data-table">
              <thead><tr><th>תאריך</th><th>פריט</th><th>ערך / כמות</th><th>מיקום אחסון</th><th>הוחזר</th></tr></thead>
              <tbody>
                ${deposits.map(d => `<tr><td>${fd(d.date)}</td><td>${esc(d.item)}</td><td>${esc(d.value)}</td><td>${esc(d.storageLocation)}</td><td>${d.returned ? 'כן' : 'לא'}</td></tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function renderPrisonerRequests(file, esc, fd) {
    const requests = file.requests || [];
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">בקשות</div></div>
        <div class="card-body">
          ${requests.length === 0 ? '<div class="empty-state-desc">אין בקשות מתועדות.</div>' : `
            <table class="data-table">
              <thead><tr><th>תאריך</th><th>נושא</th><th>סטטוס</th><th>תגובה</th></tr></thead>
              <tbody>
                ${requests.map(r => `<tr><td>${fd(r.date)}</td><td>${esc(r.subject)}</td><td>${StatusBadge.render(r.status)}</td><td>${esc(r.response)}</td></tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function renderPrisonerInterviews(file, esc, fd) {
    const interviews = file.interviews || [];
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">ראיונות</div></div>
        <div class="card-body">
          ${interviews.length === 0 ? '<div class="empty-state-desc">אין ראיונות מתועדים.</div>' : `
            <table class="data-table">
              <thead><tr><th>תאריך</th><th>מראיין</th><th>נושא</th><th>סיכום</th></tr></thead>
              <tbody>
                ${interviews.map(i => `<tr><td>${fd(i.date)}</td><td>${esc(i.interviewer)}</td><td>${esc(i.subject)}</td><td>${Utils.truncate(i.summary || '', 50)}</td></tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function renderPrisonerPhoneCalls(file, esc, fd) {
    const calls = file.phoneCalls || [];
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">שיחות טלפון</div></div>
        <div class="card-body">
          ${calls.length === 0 ? '<div class="empty-state-desc">אין שיחות טלפון מתועדות.</div>' : `
            <table class="data-table">
              <thead><tr><th>תאריך</th><th>שעה</th><th>איש קשר</th><th>משך</th></tr></thead>
              <tbody>
                ${calls.map(c => `<tr><td>${fd(c.date)}</td><td>${esc(c.time)}</td><td>${esc(c.contact)}</td><td>${esc(c.duration)}</td></tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function renderPrisonerReleases(file, esc, fd) {
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">פרטי שחרור</div></div>
        <div class="card-body">
          <div class="info-list">
            ${infoRow('שחרור צפוי', fd(file.expectedRelease))}
            ${infoRow('שחרור בפועל', fd(file.actualRelease))}
            ${infoRow('סוג שחרור', esc(file.releaseType))}
            ${infoRow('תנאים לשחרור', esc(file.releaseConditions))}
            ${infoRow('קצין משחרר', esc(file.releasingOfficer))}
          </div>
        </div>
      </div>
    `;
  }

  function renderPrisonerHistory(fileId) {
    const auditEntries = Storage.getCollection(Storage.KEYS.AUDIT_ENTRIES).filter(a => a.entityId === fileId);
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">היסטוריית שינויים</div></div>
        <div class="card-body">
          ${auditEntries.length === 0 ? '<div class="empty-state-desc">אין היסטוריה.</div>' : `
            <div class="timeline">
              ${auditEntries.map(e => `
                <div class="timeline-item">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <div class="timeline-title">${Utils.escHtml(e.description)}</div>
                    <div class="timeline-meta">${Utils.formatDateTime(e.timestamp)} — ${Utils.escHtml(e.userName)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  window.addBehaviorEntry = (fid) => {
    const f = Storage.getById(Storage.KEYS.PRISONER_FILES, fid);
    if (!f) return;
    Modal.open({
      title: 'רשומת התנהגות',
      body: `
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">תאריך</label>
            <input type="date" id="beh-date" class="form-control" value="${Utils.today()}">
          </div>
          <div class="form-group">
            <label class="form-label">סוג</label>
            <select id="beh-type" class="form-control">
              ${BEHAVIOR_TYPES.map(t => `<option value="${t.id}">${Utils.escHtml(t.label)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">תיאור</label>
          <textarea id="beh-desc" class="form-control" rows="3"></textarea>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>
        <button class="btn btn-primary" onclick="window._saveBehavior('${fid}')">שמור</button>
      `,
    });
    window._saveBehavior = (fid) => {
      const ff = Storage.getById(Storage.KEYS.PRISONER_FILES, fid);
      if (!ff) return;
      if (!ff.behaviorLog) ff.behaviorLog = [];
      const u = Auth.getCurrentUser();
      ff.behaviorLog.push({ date: Utils.el('beh-date').value, type: Utils.el('beh-type').value, description: Utils.el('beh-desc').value, reporter: u ? u.firstName + ' ' + u.lastName : '' });
      ff.updatedAt = new Date().toISOString();
      Storage.upsert(Storage.KEYS.PRISONER_FILES, ff);
      Audit.log({ module: 'incarceration', action: 'update', entityType: 'prisonerFile', entityId: fid, description: `רשומת התנהגות לתיק ${ff.fileNumber}` });
      Modal.close();
      Toast.success('הרשומה נשמרה');
      Router.navigate('/prisoner-file', { id: fid });
    };
  };

  function showNewPrisonerModal(pMap, people, container, refreshFn) {
    Modal.open({
      title: 'כלוא חדש',
      size: 'lg',
      body: `
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">אדם <span class="required">*</span></label>
            <select id="np-person" class="form-control">
              <option value="">בחר אדם</option>
              ${people.map(p => `<option value="${p.id}">${Utils.escHtml(p.firstName + ' ' + p.lastName + ' — ' + p.militaryNumber)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">סוג כלוא</label>
            <select id="np-type" class="form-control">
              ${PRISONER_TYPES.map(t => `<option value="${t.id}">${Utils.escHtml(t.label)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">תאריך קבלה</label>
            <input type="date" id="np-admission" class="form-control" value="${Utils.today()}">
          </div>
          <div class="form-group">
            <label class="form-label">שחרור צפוי</label>
            <input type="date" id="np-release" class="form-control">
          </div>
          <div class="form-group">
            <label class="form-label">כלא</label>
            <select id="np-company" class="form-control">
              ${DETENTION_COMPANIES.map(c => `<option value="${c.id}">${Utils.escHtml(c.label)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">רמת סיכון</label>
            <select id="np-risk" class="form-control">
              ${RISK_LEVELS.map(r => `<option value="${r.id}">${Utils.escHtml(r.label)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">עילת מעצר</label>
          <select id="np-reason" class="form-control">
            ${DETENTION_REASONS.map(r => `<option value="${r.id}">${Utils.escHtml(r.label)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">הערות</label>
          <textarea id="np-notes" class="form-control" rows="2"></textarea>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>
        <button class="btn btn-primary" onclick="window._saveNewPrisoner()">צור תיק</button>
      `,
    });

    window._saveNewPrisoner = () => {
      const personId = Utils.el('np-person').value;
      if (!personId) { Toast.error('יש לבחור אדם'); return; }
      const file = {
        id: 'pf_' + Utils.generateId(),
        fileNumber: 'PF-' + String(Math.floor(Math.random() * 90000) + 10000),
        personId,
        prisonerType: Utils.el('np-type').value,
        admissionDate: Utils.el('np-admission').value,
        expectedRelease: Utils.el('np-release').value || null,
        detentionCompany: Utils.el('np-company').value,
        riskLevel: Utils.el('np-risk').value,
        detentionReason: Utils.el('np-reason').value,
        notes: Utils.el('np-notes').value,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      Storage.upsert(Storage.KEYS.PRISONER_FILES, file);
      Audit.log({ module: 'incarceration', action: 'create', entityType: 'prisonerFile', entityId: file.id, description: `פתיחת תיק כלוא ${file.fileNumber}` });
      Modal.close();
      Toast.success('תיק כלוא נפתח');
      Router.navigate('/prisoner-file', { id: file.id });
    };
  }
};
