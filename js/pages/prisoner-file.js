/* prisoner-file.js — prisoner management workspace */
'use strict';

window.Pages = window.Pages || {};

const CLASS_FLAGS = ['התנהגות כלייאתית', 'תלונות ודוחו"ת', 'טיפול נפשי', 'בעיות רפואיות', 'בעל עבר פלילי', 'תיקי מצ"ח', 'חשש בריחה', 'כלוא חריג', 'רמת סיכון גבוהה', 'רישום מודיעיני', 'בדוקאי סמים', 'טעון הגנה/הפרדה'];
const CLASS_FIELDS = [['religion', 'דת'], ['population', 'סוג אוכלוסיה'], ['offenseDesc', 'תאור עבירה'], ['placementRec', 'המלצה לשיבוץ'], ['company', 'תחום פלוגה'], ['profile', 'פרופיל'], ['defects', 'סעיפי ליקוי'], ['escortInstructions', 'הוראות לליווי'], ['notes', 'הערות']];

const PERSONAL_FLAGS = [['haredi', 'חרדי'], ['vegetarian', 'צמחוני'], ['kosher', 'מנת בד"צ'], ['allergies', 'אלרגני'], ['exceptional', 'חריג'], ['victimFile', 'תיק נפגע עבירה'], ['additionalFile', 'תיק נוסף']];

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
  renderFile(normalize(file));

  // seeded demo records use different field names than this page — normalise in memory only
  function normalize(f) {
    f.admissionDate = f.admissionDate || f.intakeDate;
    f.detentionCompany = f.detentionCompany || f.company;
    f.cell = f.cell || f.location;
    f.responsibleOfficer = f.responsibleOfficer || f.supervisorName;
    f.detentionReason = f.detentionReason || f.offense;
    f.fileNumber = f.fileNumber || ('PF-' + String(f.id).replace(/\D/g, '').padStart(5, '0'));
    return f;
  }

  function renderList() {
    const EMPTY = { status: '', type: '', militaryNumber: '', nationalId: '', lastName: '', firstName: '', activeOnly: false };
    let f = Object.assign({}, EMPTY);
    let tableInstance = null;

    const people = Storage.getCollection(Storage.KEYS.PEOPLE);
    const pMap = Object.fromEntries(people.map(p => [p.id, p]));

    function getData() {
      let files = Storage.getCollection(Storage.KEYS.PRISONER_FILES).map(normalize);
      files = files.filter(file => {
        const p = pMap[file.personId] || {};
        if (f.status && file.status !== f.status) return false;
        if (f.activeOnly && file.status !== 'active') return false;
        if (f.type && file.prisonerType !== f.type) return false;
        if (f.militaryNumber && !(p.militaryNumber || '').includes(f.militaryNumber.trim())) return false;
        if (f.nationalId && !(p.nationalId || '').includes(f.nationalId.trim())) return false;
        if (f.lastName && !(p.lastName || '').includes(f.lastName.trim())) return false;
        if (f.firstName && !(p.firstName || '').includes(f.firstName.trim())) return false;
        return true;
      });
      return files.sort((a, b) => (b.admissionDate || '').localeCompare(a.admissionDate || ''));
    }
    const read = () => {
      f = { status: Utils.el('f-status').value, type: Utils.el('f-type').value, militaryNumber: Utils.el('p-mil').value, nationalId: Utils.el('p-nid').value,
        lastName: Utils.el('p-last').value, firstName: Utils.el('p-first').value, activeOnly: Utils.el('p-active').checked };
    };

    function draw() {
    content.innerHTML = `
      <div class="page-wrapper">
        ${Utils.pageHeader('אחזור תיק כלוא', Utils.pageMeta())}

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <button class="btn btn-secondary btn-sm" id="btn-export">${Utils.icon('download', 14)} ייצוא</button>
          ${Permissions.can('createPrisoner') ? `<button class="btn btn-primary" id="btn-new">${Utils.icon('plus', 14)} פתיחת תיק כלוא</button>` : ''}
        </div>

        <div class="retrieval-panel">
          <div class="retrieval-panel-header">איתור כלוא</div>
          <div class="retrieval-grid">
            <div class="form-group"><label class="form-label">סטטוס</label>
              <select class="form-control" id="f-status"><option value="">הכל</option>
                ${PRISONER_STATUSES.map(st => `<option value="${st.id}" ${f.status === st.id ? 'selected' : ''}>${Utils.escHtml(st.label)}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">סוג כלוא</label>
              <select class="form-control" id="f-type"><option value="">הכל</option>
                ${PRISONER_TYPES.map(t => `<option value="${Utils.escHtml(t)}" ${f.type === t ? 'selected' : ''}>${Utils.escHtml(t)}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">מספר אישי</label><input class="form-control" id="p-mil" value="${Utils.escHtml(f.militaryNumber)}"></div>
            <div class="form-group"><label class="form-label">ת.ז.</label><input class="form-control" id="p-nid" value="${Utils.escHtml(f.nationalId)}"></div>
            <div class="form-group"><label class="form-label">שם משפחה</label><input class="form-control" id="p-last" value="${Utils.escHtml(f.lastName)}"></div>
            <div class="form-group"><label class="form-label">שם פרטי</label><input class="form-control" id="p-first" value="${Utils.escHtml(f.firstName)}"></div>
            <div class="form-group"><label class="form-label">&nbsp;</label>
              <label style="display:flex;gap:8px;align-items:center;height:36px"><input type="checkbox" id="p-active" ${f.activeOnly ? 'checked' : ''}> רק כלואים פעילים</label></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn-primary" id="p-search">${Utils.icon('search', 14)} אתר</button>
            <button class="btn btn-secondary" id="p-reset">נקה</button>
          </div>
        </div>

        <div class="table-panel">
          <div class="table-panel-header"><span>תיקי כלואים</span><span style="font-size:12px;color:var(--color-text-muted)" id="p-count"></span></div>
          <div id="prisoner-table"></div>
        </div>

        ${Utils.classificationFooter()}
      </div>
    `;
    const data = getData();
    Utils.el('p-count').textContent = data.length + ' תיקים';

    tableInstance = DataTable.create({
      containerId: 'prisoner-table',
      data,
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
        { key: 'detentionCompany', label: 'פלוגה', render: v => Utils.escHtml(v || '—') },
      ],
      actions: (row) => `<button class="row-action-btn" title="פתח תיק כלוא" onclick="Router.navigate('/prisoner-file', {id:'${row.id}'})">${Utils.icon('view', 14)}</button>`,
      onRowClick: (row) => Router.navigate('/prisoner-file', { id: row.id }),
      rowClass: (row) => {
        if (row.status !== 'active') return '';
        if (row.riskLevel === 'critical') return 'row-critical';
        if (row.expectedRelease && Utils.daysBetween(Utils.today(), row.expectedRelease) <= 3) return 'row-attention';
        return '';
      },
      emptyMessage: 'לא נמצאו תיקי כלואים התואמים לחיפוש',
    });

    const go = () => { read(); draw(); };
    Utils.el('p-search').onclick = go;
    Utils.el('p-reset').onclick = () => { f = Object.assign({}, EMPTY); draw(); };
    content.querySelectorAll('.retrieval-panel input').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }));
    Utils.el('btn-export').onclick = () => {
      const rows = getData().map(x => { const p = pMap[x.personId] || {}; return [x.fileNumber, (p.firstName || '') + ' ' + (p.lastName || ''), p.militaryNumber || '', x.prisonerType, x.admissionDate, x.status]; });
      Utils.exportCsv('prisoners.csv', ['מספר תיק', 'שם', 'מ"א', 'סוג', 'קבלה', 'סטטוס'], rows);
    };
    if (Utils.el('btn-new')) Utils.el('btn-new').onclick = () => showNewPrisonerModal(people);
    }
    draw();
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
            <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/prisoner-file')" style="margin-bottom:4px;padding-right:0">${Utils.icon('chevronRight', 12)} אחזור תיק כלוא</button>
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
          <div class="tab-panel" data-tab="calc">${renderPrisonerCalc(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="classification">${renderPrisonerClassification(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="verdicts">${renderPrisonerVerdicts(file, esc, fd)}</div>
          <div class="tab-panel" data-tab="incidents">${renderPrisonerIncidents(file, esc, fd)}</div>
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
      defaultTab: (function() { const t = window._pfTab || 'general'; window._pfTab = null; return t; })(),
      tabs: [
        { id: 'general', label: 'פרטים אישיים' },
        { id: 'calc', label: 'חישוב עונש' },
        { id: 'classification', label: 'מיון ושיבוץ' },
        { id: 'verdicts', label: 'הארכות וגזר דין' },
        { id: 'incidents', label: 'אירוע חריג' },
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
        { id: 'releases', label: 'סיום מעצר' },
        { id: 'history', label: 'היסטוריה' },
      ],
    });

    window.releasePrisoner = (id) => window.editRelease(id, true);   // never bypasses release validation
  }

  function infoRow(label, value) {
    return `<div class="info-list-row"><div class="info-list-label">${Utils.escHtml(label)}</div><div class="info-list-value">${value}</div></div>`;
  }

  // ---------- פרטים אישיים (old prisoner-file personal block; fields stored on the file) ----------
  function renderPersonalDetails(file, person, esc) {
    const cand = Storage.getCollection(Storage.KEYS.GACHLAT_CANDIDATES).some(c => c.prisonerFileId === file.id);
    const year = person && person.birthDate ? String(person.birthDate).slice(0, 4) : '';
    const dis = canEdit ? '' : 'disabled';
    return `
      <div class="card" style="grid-column:1/-1">
        <div class="card-header"><div class="card-title">פרטים אישיים</div>
          ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="window.savePrisonerPersonal('${file.id}')">שמור</button>` : ''}</div>
        <div class="card-body" style="display:flex;gap:20px;flex-wrap:wrap">
          <div style="width:130px;text-align:center">
            <div id="pp-photo-box" style="width:120px;height:150px;border:1px dashed var(--color-border);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;overflow:hidden;color:var(--color-text-muted);font-size:12px">
              ${file.photo ? `<img src="${file.photo}" alt="תמונה" style="max-width:100%;max-height:100%">` : 'אין תמונה'}</div>
            ${canEdit ? `<label class="btn btn-secondary btn-sm" style="margin-top:6px;cursor:pointer">העלאת תמונה<input type="file" id="pp-photo" accept="image/*" style="display:none"></label>` : ''}
          </div>
          <div style="flex:1;min-width:280px">
            <div class="form-row form-row-3">
              <div class="form-group"><label class="form-label">מספר זהות</label><input class="form-control" value="${Utils.escHtml(person ? person.nationalId : '')}" readonly></div>
              <div class="form-group"><label class="form-label">שם האב</label><input id="pp-father" class="form-control" value="${Utils.escHtml(file.fatherName || '')}" ${dis}></div>
              <div class="form-group"><label class="form-label">טלפון ביחידה</label><input id="pp-unitphone" class="form-control" value="${Utils.escHtml(file.unitPhone || '')}" ${dis}></div>
              <div class="form-group"><label class="form-label">שנת לידה</label><input class="form-control" value="${Utils.escHtml(year)}" readonly></div>
              <div class="form-group"><label class="form-label">ארץ לידה</label><input id="pp-country" class="form-control" value="${Utils.escHtml(file.birthCountry || '')}" ${dis}></div>
              <div class="form-group"><label class="form-label">רמת סיכון</label><div>${StatusBadge.renderRisk(file.riskLevel)}</div></div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:6px">
              ${PERSONAL_FLAGS.map(([k, l]) => `<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" class="pp-flag" data-k="${k}" ${file[k] ? 'checked' : ''} ${dis}> ${l}</label>`).join('')}
              <span class="badge ${cand ? 'badge-info' : 'badge-draft'}">מאותר גחל"ת: ${cand ? 'כן' : 'לא'}</span>
            </div>
          </div>
        </div>
      </div>`;
  }
  window.savePrisonerPersonal = (fid) => {
    const f = Storage.getById(Storage.KEYS.PRISONER_FILES, fid);
    f.fatherName = Utils.el('pp-father').value.trim(); f.unitPhone = Utils.el('pp-unitphone').value.trim(); f.birthCountry = Utils.el('pp-country').value.trim();
    document.querySelectorAll('.pp-flag').forEach(c => { f[c.dataset.k] = c.checked; });
    if (window._pfPhoto) f.photo = window._pfPhoto;
    f.updatedAt = new Date().toISOString(); Storage.upsert(Storage.KEYS.PRISONER_FILES, f);
    Audit.log({ module: 'incarceration', action: 'update', entityType: 'prisonerFile', entityId: fid, description: 'עדכון פרטים אישיים בתיק ' + (f.fileNumber || '') });
    window._pfPhoto = null; Toast.success('הפרטים האישיים נשמרו'); Router.navigate('/prisoner-file', { id: fid });
  };
  if (!window._pfPhotoBound) document.addEventListener('change', window._pfPhotoBound = function(e) {
    if (!e.target || e.target.id !== 'pp-photo') return;
    const file = e.target.files && e.target.files[0]; if (!file) return;
    if (file.size > 300 * 1024) { Toast.error('התמונה גדולה מדי (עד 300KB)'); e.target.value = ''; return; }
    const rd = new FileReader();
    rd.onload = () => { window._pfPhoto = rd.result; const box = document.getElementById('pp-photo-box'); if (box) box.innerHTML = '<img src="' + rd.result + '" alt="תמונה" style="max-width:100%;max-height:100%">'; Toast.info('לחץ "שמור" לשמירת התמונה'); };
    rd.readAsDataURL(file);
  });

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
        ${renderPersonalDetails(file, person, esc)}
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


  // ---------- generic add-record forms (visits, restrictions, requests, interviews, calls) ----------
  const REQUEST_STATUSES = ['בטיפול', 'ממתין', 'אושרה', 'נדחתה'];
  const DEPOSIT_TYPES = ['חפץ אישי', 'מסמכים', 'כסף', 'אחר'];
  const RECORD_FORMS = {
    visits: { title: 'רישום ביקור', list: 'visits', tab: 'visits', audit: 'רישום ביקור', fields: [
      ['date', 'תאריך', 'date', true, 'today'], ['time', 'שעה', 'time', true], ['visitorName', 'שם המבקר', 'text', true],
      ['relation', 'קרבה / קשר', 'text', true], ['duration', 'משך (דקות)', 'number', false], ['notes', 'הערות', 'text', false]] },
    restrictions: { title: 'הוספת הגבלה', list: 'restrictions', tab: 'restrictions', audit: 'הוספת הגבלה', fields: [
      ['type', 'סוג הגבלה', 'text', true], ['from', 'מתאריך', 'date', true, 'today'], ['to', 'עד תאריך', 'date', false], ['reason', 'סיבה', 'text', true]] },
    requests: { title: 'בקשה חדשה', list: 'requests', tab: 'requests', audit: 'הוספת בקשה', fields: [
      ['subject', 'סוג הבקשה', 'text', true], ['date', 'תאריך בקשה', 'date', true, 'today'], ['status', 'סטטוס טיפול', 'select', true, REQUEST_STATUSES],
      ['days', 'כמות ימים', 'number', false], ['response', 'תגובה', 'text', false]] },
    interviews: { title: 'ראיון חדש', list: 'interviews', tab: 'interviews', audit: 'הוספת ראיון', fields: [
      ['date', 'תאריך', 'date', true, 'today'], ['interviewer', 'מראיין', 'text', true], ['subject', 'נושא', 'text', true], ['summary', 'סיכום', 'text', true]] },
    phoneCalls: { title: 'שיחת טלפון', list: 'phoneCalls', tab: 'phoneCalls', audit: 'הוספת שיחת טלפון', fields: [
      ['date', 'תאריך', 'date', true, 'today'], ['time', 'שעה', 'time', true], ['contact', 'איש קשר / מספר', 'text', true], ['duration', 'משך (דקות)', 'number', false]] },
    depositBags: { title: 'שקית פקדון חדשה', list: 'depositBags', tab: 'deposits', audit: 'הוספת שקית פקדון', fields: [
      ['number', 'מספר שקית', 'text', true], ['status', 'סטטוס שקית', 'select', true, ['פעיל', 'נמסר']], ['receiver', 'מקבל', 'text', true],
      ['date', 'תאריך', 'date', true, 'today'], ['time', 'שעה', 'time', true], ['notes', 'הערות לשקית', 'text', false]] },
  };

  function fieldHtml(id, f, val) {
    const [k, label, type, req, extra] = f;
    const v = val != null ? val : (extra === 'today' ? Utils.today() : '');
    const star = req ? ' <span class="required">*</span>' : '';
    if (type === 'select') {
      return `<div class="form-group"><label class="form-label">${label}${star}</label><select id="${id}" class="form-control"><option value="">בחר</option>${extra.map(o => `<option value="${Utils.escHtml(o)}" ${o === v ? 'selected' : ''}>${Utils.escHtml(o)}</option>`).join('')}</select></div>`;
    }
    return `<div class="form-group"><label class="form-label">${label}${star}</label><input id="${id}" type="${type}" ${type === 'number' ? 'min="0"' : ''} class="form-control" value="${Utils.escHtml(String(v))}"></div>`;
  }

  // shared validation: required marked fields + optional date-order check
  function validateFields(fields, prefix, extraCheck) {
    let first = null; const missing = [];
    fields.forEach(f => {
      const el = Utils.el(prefix + f[0]); if (!el) return;
      el.classList.remove('is-invalid');
      if (f[3] && !String(el.value).trim()) { missing.push(f[1]); el.classList.add('is-invalid'); if (!first) first = el; }
    });
    if (missing.length) { Toast.error('שדות חובה חסרים: ' + missing.join(', ')); if (first) first.focus(); return false; }
    return extraCheck ? extraCheck() : true;
  }

  window.pfRecordForm = (fid, key) => {
    const cfg = RECORD_FORMS[key];
    Modal.open({
      title: cfg.title,
      body: `<div class="form-row form-row-2">${cfg.fields.map(f => fieldHtml('rf-' + f[0], f)).join('')}</div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" id="rf-save">שמור</button>`,
    });
    Utils.el('rf-save').onclick = () => {
      const ok = validateFields(cfg.fields, 'rf-', () => {
        if (key === 'restrictions' && Utils.el('rf-to').value && Utils.el('rf-to').value < Utils.el('rf-from').value) { Toast.error('תאריך הסיום לא יכול להיות לפני תאריך ההתחלה'); return false; }
        if (key === 'depositBags') {
          const f0 = Storage.getById(Storage.KEYS.PRISONER_FILES, fid);
          if ((f0.depositBags || []).some(b => String(b.number) === Utils.el('rf-number').value.trim())) { Toast.error('מספר שקית זה כבר קיים בתיק'); return false; }
        }
        return true;
      });
      if (!ok) return;
      const f = Storage.getById(Storage.KEYS.PRISONER_FILES, fid);
      const rec = { id: 'rec_' + Utils.generateId() };
      cfg.fields.forEach(fl => { rec[fl[0]] = Utils.el('rf-' + fl[0]).value.trim(); });
      f[cfg.list] = (f[cfg.list] || []).concat([rec]);
      f.updatedAt = new Date().toISOString(); Storage.upsert(Storage.KEYS.PRISONER_FILES, f);
      Audit.log({ module: 'incarceration', action: 'update', entityType: 'prisonerFile', entityId: fid, description: cfg.audit + ' — תיק ' + (f.fileNumber || f.id) });
      Modal.close(); Toast.success('נשמר'); window._pfTab = cfg.tab; Router.navigate('/prisoner-file', { id: fid });
    };
  };
  window.pfDelRecord = async (fid, list, id) => {
    const ok = await Modal.confirm({ title: 'מחיקת רשומה', message: 'למחוק את הרשומה מהתיק?', type: 'danger' });
    if (!ok) return;
    const f = Storage.getById(Storage.KEYS.PRISONER_FILES, fid);
    f[list] = (f[list] || []).filter(r => r.id !== id);
    if (list === 'depositBags') f.depositItems = (f.depositItems || []).filter(i => i.bagId !== id);
    Storage.upsert(Storage.KEYS.PRISONER_FILES, f);
    window._pfTab = list === 'depositBags' ? 'deposits' : (RECORD_FORMS[list] || {}).tab || 'general'; Router.navigate('/prisoner-file', { id: fid });
  };

  function addBtn(fid, key, label) { return canEdit ? `<button class="btn btn-secondary btn-sm" onclick="window.pfRecordForm('${fid}','${key}')">${Utils.icon('plus', 14)} ${label}</button>` : ''; }
  function delBtn(fid, list, id) { return canEdit ? `<button class="row-action-btn danger" title="מחיקה" onclick="window.pfDelRecord('${fid}','${list}','${id}')">${Utils.icon('trash', 13)}</button>` : ''; }
  function simpleTable(file, list, head, rowFn, empty, esc) {
    const arr = file[list] || [];
    return arr.length === 0 ? `<div class="empty-state-desc">${empty}</div>` : `<table class="data-table"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}<th></th></tr></thead><tbody>${arr.map(r => `<tr>${rowFn(r).map(c => `<td>${c}</td>`).join('')}<td>${r.id ? delBtn(file.id, list, r.id) : ''}</td></tr>`).join('')}</tbody></table>`;
  }
  function card(title, actions, body) { return `<div class="card"><div class="card-header"><div class="card-title">${title}</div>${actions}</div><div class="card-body">${body}</div></div>`; }

  function renderPrisonerRestrictions(file, esc, fd) {
    return card('הגבלות', addBtn(file.id, 'restrictions', 'הוסף הגבלה'),
      simpleTable(file, 'restrictions', ['סוג', 'מתאריך', 'עד תאריך', 'סיבה'], r => [esc(r.type), fd(r.from), fd(r.to), esc(r.reason)], 'אין הגבלות מיוחדות.', esc));
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
    return card('ביקורים', addBtn(file.id, 'visits', 'רשום ביקור'),
      simpleTable(file, 'visits', ['תאריך', 'שעה', 'מבקר', 'קשר', 'משך (דק׳)', 'הערות'], r => [fd(r.date), esc(r.time), esc(r.visitorName), esc(r.relation), esc(r.duration), esc(r.notes)], 'אין ביקורים מתועדים.', esc));
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
    const bags = file.depositBags || [];
    const items = file.depositItems || [];
    const sel = window._pfDepBag && bags.some(b => b.id === window._pfDepBag) ? window._pfDepBag : '';
    const shown = sel ? items.filter(i => i.bagId === sel) : items;
    const bagNo = id => (bags.find(b => b.id === id) || {}).number || '—';
    const legacy = file.deposits || [];
    return `
      ${card('שקיות', addBtn(file.id, 'depositBags', 'הוסף שקית'), bags.length === 0 ? '<div class="empty-state-desc">אין שקיות פקדון. לחץ על "הוסף שקית".</div>' : `
        <table class="data-table"><thead><tr><th>מספר שקית</th><th>סטטוס שקית</th><th>מקבל</th><th>תאריך ושעה</th><th>הערות</th><th>פריטים</th><th></th></tr></thead><tbody>
        ${bags.map(b => `<tr style="cursor:pointer" class="${sel === b.id ? 'row-selected' : ''}" onclick="window.pfDepositBag('${file.id}','${b.id}')"><td>${esc(b.number)}</td><td>${esc(b.status)}</td><td>${esc(b.receiver)}</td><td>${fd(b.date)} ${esc(b.time)}</td><td>${esc(b.notes)}</td><td>${items.filter(i => i.bagId === b.id).length}</td><td>${delBtn(file.id, 'depositBags', b.id)}</td></tr>`).join('')}
        </tbody></table>`)}
      <div style="height:12px"></div>
      ${card('פריטי פקדון' + (sel ? ' — שקית ' + esc(bagNo(sel)) : ' — כל הפקדונות'),
        canEdit ? `<span style="display:flex;gap:6px">${sel ? `<button class="btn btn-ghost btn-sm" onclick="window.pfDepositBag('${file.id}','')">הצג הכל</button>` : ''}<button class="btn btn-secondary btn-sm" onclick="window.pfAddDepositItem('${file.id}')">${Utils.icon('plus', 14)} הוסף פריט</button></span>` : '',
        shown.length === 0 ? '<div class="empty-state-desc">אין פריטי פקדון.</div>' : `
        <table class="data-table"><thead><tr><th>שקית</th><th>סוג פקדון</th><th>פריט</th><th>הערות / תיאור</th><th>מקבל</th><th>תאריך ושעה</th><th></th></tr></thead><tbody>
        ${shown.map(i => `<tr><td>${esc(bagNo(i.bagId))}</td><td>${esc(i.type)}</td><td>${esc(i.item)}</td><td>${esc(i.description)}</td><td>${esc(i.receiver)}</td><td>${fd(i.date)} ${esc(i.time)}</td><td>${delBtn(file.id, 'depositItems', i.id)}</td></tr>`).join('')}
        </tbody></table>`)}
      ${legacy.length ? `<div style="height:12px"></div>${card('פקדונות קודמים (רשומות ישנות)', '', `<table class="data-table"><thead><tr><th>תאריך</th><th>פריט</th><th>ערך / כמות</th><th>מיקום אחסון</th><th>הוחזר</th></tr></thead><tbody>${legacy.map(d => `<tr><td>${fd(d.date)}</td><td>${esc(d.item)}</td><td>${esc(d.value)}</td><td>${esc(d.storageLocation)}</td><td>${d.returned ? 'כן' : 'לא'}</td></tr>`).join('')}</tbody></table>`)}` : ''}`;
  }
  window.pfDepositBag = (fid, bagId) => { window._pfDepBag = bagId; window._pfTab = 'deposits'; Router.navigate('/prisoner-file', { id: fid }); };
  window.pfAddDepositItem = (fid) => {
    const f = Storage.getById(Storage.KEYS.PRISONER_FILES, fid);
    const bags = f.depositBags || [];
    if (!bags.length) { Toast.error('יש להוסיף שקית לפני הוספת פריט'); return; }
    const fields = [['bagId', 'שקית', 'select', true, bags.map(b => String(b.number))], ['type', 'סוג פקדון', 'select', true, DEPOSIT_TYPES], ['item', 'פריט', 'text', true], ['description', 'הערות / תיאור', 'text', false], ['receiver', 'מקבל', 'text', true], ['date', 'תאריך', 'date', true, 'today'], ['time', 'שעה', 'time', true]];
    Modal.open({ title: 'פריט פקדון חדש', body: `<div class="form-row form-row-2">${fields.map(fl => fieldHtml('di-' + fl[0], fl, fl[0] === 'bagId' && window._pfDepBag ? String((bags.find(b => b.id === window._pfDepBag) || {}).number || '') : null)).join('')}</div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" id="di-save">שמור</button>` });
    Utils.el('di-save').onclick = () => {
      if (!validateFields(fields, 'di-')) return;
      const bag = bags.find(b => String(b.number) === Utils.el('di-bagId').value);
      const rec = { id: 'rec_' + Utils.generateId(), bagId: bag.id };
      fields.slice(1).forEach(fl => { rec[fl[0]] = Utils.el('di-' + fl[0]).value.trim(); });
      f.depositItems = (f.depositItems || []).concat([rec]); Storage.upsert(Storage.KEYS.PRISONER_FILES, f);
      Audit.log({ module: 'incarceration', action: 'update', entityType: 'prisonerFile', entityId: fid, description: 'הוספת פריט פקדון' });
      Modal.close(); Toast.success('נשמר'); window._pfTab = 'deposits'; Router.navigate('/prisoner-file', { id: fid });
    };
  };
  function renderPrisonerRequests(file, esc, fd) {
    return card('בקשות', addBtn(file.id, 'requests', 'בקשה חדשה'),
      simpleTable(file, 'requests', ['תאריך', 'סוג הבקשה', 'סטטוס טיפול', 'כמות ימים', 'תגובה'], r => [fd(r.date), esc(r.subject), esc(r.status), esc(r.days), esc(r.response)], 'אין בקשות מתועדות.', esc));
  }
  function renderPrisonerInterviews(file, esc, fd) {
    return card('ראיונות', addBtn(file.id, 'interviews', 'ראיון חדש'),
      simpleTable(file, 'interviews', ['תאריך', 'מראיין', 'נושא', 'סיכום'], r => [fd(r.date), esc(r.interviewer), esc(r.subject), Utils.escHtml(Utils.truncate(r.summary || '', 60))], 'אין ראיונות מתועדים.', esc));
  }
  function renderPrisonerPhoneCalls(file, esc, fd) {
    return card('שיחות טלפון', addBtn(file.id, 'phoneCalls', 'שיחה חדשה'),
      simpleTable(file, 'phoneCalls', ['תאריך', 'שעה', 'איש קשר / מספר', 'משך (דק׳)'], r => [fd(r.date), esc(r.time), esc(r.contact), esc(r.duration)], 'אין שיחות טלפון מתועדות.', esc));
  }
  function renderPrisonerReleases(file, esc, fd) {
    const r = file.release || {};
    const active = file.status === 'active';
    const t = file.transfer, po = file.placementOrder;
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">סיום מעצר</div>
          ${canEdit ? `<span style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" onclick="window.editRelease('${file.id}')">${Utils.icon('edit', 14)} עדכון פרטי שחרור</button>
            ${active ? `<button class="btn btn-primary btn-sm" onclick="window.editRelease('${file.id}', true)">סיום מעצר</button>
            <button class="btn btn-secondary btn-sm" onclick="window.pfTransferBase('${file.id}')">העברה לבס"כ אחר</button>` : ''}
            <button class="btn btn-secondary btn-sm" onclick="window.pfPlacementOrder('${file.id}')">צו הצבה / סיפוח</button>
            <button class="btn btn-secondary btn-sm" onclick="window.pfThirdUpdate('${file.id}')">עדכון פרטי שליש</button></span>` : ''}</div>
        <div class="card-body">
          <div class="info-list">
            ${infoRow('סטטוס תיק', StatusBadge.render(file.status))}
            ${infoRow('שחרור צפוי', fd(file.expectedRelease))}
            ${infoRow('שחרור בפועל', fd(file.actualRelease))}
            ${infoRow('קוד סיבת שחרור', esc(r.reasonCode))}
            ${infoRow('סיבת שחרור', esc(r.reason || file.releaseType))}
            ${infoRow('שם מאשר עזיבה', esc(r.approver || file.releasingOfficer))}
            ${infoRow('קוד יחידה', esc(r.unitCode))}
            ${infoRow('יחידת שחרור', esc(r.unit))}
            ${infoRow('תאריך / שעת עזיבה', r.leaveDate ? fd(r.leaveDate) + ' ' + esc(r.leaveTime) : '—')}
            ${infoRow('תאריך / שעת התייצבות', r.appearDate ? fd(r.appearDate) + ' ' + esc(r.appearTime) : '—')}
            ${infoRow('הערות', esc(r.notes || file.releaseConditions))}
            ${t ? infoRow('הועבר לבס"כ', esc(t.baseName) + ' · ' + fd(t.date) + ' · ' + esc(t.reason)) : ''}
            ${po ? infoRow('צו הצבה / סיפוח', esc(po.number) + ' · ' + fd(po.date) + ' · ' + esc(po.unitName)) : ''}
          </div>
        </div>
      </div>
    `;
  }
  const RELEASE_FIELDS = [
    ['reasonCode', 'קוד סיבת שחרור', 'text', false], ['reason', 'סיבת שחרור', 'text', true], ['approver', 'שם מאשר עזיבה', 'text', false],
    ['unitCode', 'קוד יחידה', 'text', false], ['unit', 'יחידת שחרור', 'text', false],
    ['leaveDate', 'תאריך עזיבה', 'date', true], ['leaveTime', 'שעת עזיבה', 'time', true],
    ['appearDate', 'תאריך התייצבות', 'date', false], ['appearTime', 'שעת התייצבות', 'time', false], ['notes', 'הערות', 'text', false]];
  // finalize=true also closes the detention (status → released) — only after the release data validates
  window.editRelease = (fid, finalize) => {
    const f = Storage.getById(Storage.KEYS.PRISONER_FILES, fid); const r = f.release || {};
    Modal.open({
      title: finalize ? 'סיום מעצר — שחרור' : 'עדכון פרטי שחרור',
      body: `<div class="form-row form-row-2">${RELEASE_FIELDS.map(fl => fieldHtml('rl-' + fl[0], fl, r[fl[0]] || '')).join('')}</div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" id="rl-save">${finalize ? 'סיים מעצר ושחרר' : 'שמור'}</button>`,
    });
    Utils.el('rl-save').onclick = async () => {
      if (!validateFields(RELEASE_FIELDS, 'rl-', () => {
        const ap = Utils.el('rl-appearDate').value, at = Utils.el('rl-appearTime').value;
        if ((ap && !at) || (!ap && at)) { Toast.error('יש להזין תאריך ושעת התייצבות יחד'); return false; }
        return true;
      })) return;
      const rel = {}; RELEASE_FIELDS.forEach(fl => { rel[fl[0]] = Utils.el('rl-' + fl[0]).value.trim(); });
      f.release = rel;
      if (finalize) {
        Modal.close();
        const ok = await Modal.confirm({ title: 'שחרור כלוא', message: 'לסיים את המעצר ולסמן את הכלוא כמשוחרר?', type: 'warning', confirmLabel: 'שחרר' });
        if (!ok) return;
        f.status = 'released'; f.actualRelease = rel.leaveDate; f.releaseType = rel.reason;
      }
      f.updatedAt = new Date().toISOString(); Storage.upsert(Storage.KEYS.PRISONER_FILES, f);
      Audit.log({ module: 'incarceration', action: finalize ? 'release' : 'update', entityType: 'prisonerFile', entityId: fid, description: (finalize ? 'שחרור כלוא ' : 'עדכון סיום מעצר ') + (f.fileNumber || '') });
      if (!finalize) Modal.close();
      Toast.success(finalize ? 'הכלוא שוחרר' : 'נשמר'); window._pfTab = 'releases'; Router.navigate('/prisoner-file', { id: fid });
    };
  };
  window.pfTransferBase = (fid) => {
    const f = Storage.getById(Storage.KEYS.PRISONER_FILES, fid);
    const fields = [['baseId', 'בסיס יעד', 'select', true, DEMO_BASES.filter(b => b.id !== f.baseId).map(b => b.shortName)], ['date', 'תאריך העברה', 'date', true, 'today'], ['reason', 'סיבת העברה', 'text', true]];
    Modal.open({ title: 'העברה לבס"כ אחר', body: `<div class="form-row form-row-2">${fields.map(fl => fieldHtml('tb-' + fl[0], fl)).join('')}</div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" id="tb-save">העבר</button>` });
    Utils.el('tb-save').onclick = async () => {
      if (!validateFields(fields, 'tb-')) return;
      const base = DEMO_BASES.find(b => b.shortName === Utils.el('tb-baseId').value);
      const tDate = Utils.el('tb-date').value, tReason = Utils.el('tb-reason').value.trim();
      Modal.close();
      const ok = await Modal.confirm({ title: 'העברת כלוא', message: 'להעביר את הכלוא לבסיס ' + base.shortName + '? התיק יסומן כ"הועבר".', type: 'warning', confirmLabel: 'העבר' });
      if (!ok) return;
      f.transfer = { baseId: base.id, baseName: base.shortName, date: tDate, reason: tReason };
      f.status = 'transferred';
      Storage.upsert(Storage.KEYS.PRISONER_FILES, f);
      Audit.log({ module: 'incarceration', action: 'update', entityType: 'prisonerFile', entityId: fid, description: 'העברה לבס"כ ' + base.shortName });
      Toast.success('הכלוא הועבר'); window._pfTab = 'releases'; Router.navigate('/prisoner-file', { id: fid });
    };
  };
  window.pfPlacementOrder = (fid) => {
    const f = Storage.getById(Storage.KEYS.PRISONER_FILES, fid);
    const po = f.placementOrder || {};
    const units = DEMO_UNITS.filter(u => u.type !== 'canteen');
    const fields = [['number', 'מספר צו', 'text', true], ['date', 'תאריך צו', 'date', true, 'today'], ['unitName', 'יחידה מקבלת', 'select', true, units.map(u => u.name)], ['notes', 'הערות', 'text', false]];
    Modal.open({ title: 'צו הצבה / סיפוח', body: `<div class="form-row form-row-2">${fields.map(fl => fieldHtml('po-' + fl[0], fl, po[fl[0]] || null)).join('')}</div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" id="po-save">שמור</button>` });
    Utils.el('po-save').onclick = () => {
      if (!validateFields(fields, 'po-')) return;
      const o = {}; fields.forEach(fl => { o[fl[0]] = Utils.el('po-' + fl[0]).value.trim(); });
      f.placementOrder = o; Storage.upsert(Storage.KEYS.PRISONER_FILES, f);
      Audit.log({ module: 'incarceration', action: 'update', entityType: 'prisonerFile', entityId: fid, description: 'צו הצבה / סיפוח ' + o.number });
      Modal.close(); Toast.success('נשמר'); window._pfTab = 'releases'; Router.navigate('/prisoner-file', { id: fid });
    };
  };
  // "עדכון פרטי שליש" = record a reduction event on the sentence calculation
  window.pfThirdUpdate = (fid) => { window.addSentenceEvent(fid); if (Utils.el('se-kind')) Utils.el('se-kind').value = 'reduction'; };

  // ---------- חישוב עונש ----------
  function calcSummary(file) {
    const ev = file.sentenceEvents || [];
    const sum = kind => ev.filter(e => e.kind === kind).reduce((t, e) => t + (Number(e.days) || 0), 0);
    const reductions = sum('reduction') + sum('auto');
    const extensions = sum('extension');
    const base = Number(file.sentence) || 0;
    const start = file.admissionDate;
    return {
      base, reductions, extensions, auto: sum('auto'),
      noReduction: start && base ? Utils.addDays(start, base) : null,
      release: start && base ? Utils.addDays(start, base - reductions + extensions) : null,
    };
  }

  function renderPrisonerCalc(file, esc, fd) {
    const c = calcSummary(file);
    const ev = file.sentenceEvents || [];
    const kindLabel = { extension: 'הארכה', reduction: 'הפחתה', auto: 'הפחתה אוטומטית' };
    return `
      <div class="tab-section-grid">
        <div class="card">
          <div class="card-header"><div class="card-title">חישוב עונש</div></div>
          <div class="card-body"><div class="info-list">
            ${infoRow('תאריך קבלה', fd(file.admissionDate))}
            ${infoRow('עונש (ימים)', c.base ? String(c.base) : '—')}
            ${infoRow('ת. ללא הפחתות', fd(c.noReduction))}
            ${infoRow('הפחתות אוטומטיות', String(c.auto))}
            ${infoRow('סה"כ הפחתות', String(c.reductions))}
            ${infoRow('סה"כ הארכות', String(c.extensions))}
            ${infoRow('תאריך שחרור מחושב', `<strong>${fd(c.release)}</strong>`)}
            ${infoRow('תאריך שחרור משוער בתיק', fd(file.expectedRelease))}
          </div>
          ${canEdit && c.release && c.release !== file.expectedRelease ? `<button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="window.applyCalcRelease('${file.id}')">עדכן תאריך שחרור משוער לפי החישוב</button>` : ''}</div>
        </div>
        <div class="card" style="grid-column:1/-1">
          <div class="card-header"><div class="card-title">אירועים</div>
            ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="window.addSentenceEvent('${file.id}')">${Utils.icon('plus', 14)}</button>` : ''}</div>
          <div class="card-body">
            ${ev.length === 0 ? '<div class="empty-state-desc">אין אירועי חישוב עונש.</div>' : `
            <table class="data-table"><thead><tr><th>מס״ד</th><th>תאריך</th><th>סוג אירוע</th><th>תיאור האירוע</th><th>כמות ימים</th><th>המבצע</th></tr></thead><tbody>
              ${ev.map((e, i) => `<tr><td>${i + 1}</td><td>${fd(e.date)}</td><td>${esc(kindLabel[e.kind])}</td><td>${esc(e.description)}</td><td>${Number(e.days) || 0}</td><td>${esc(e.operator)}</td></tr>`).join('')}
            </tbody></table>`}
          </div>
        </div>
      </div>`;
  }

  window.addSentenceEvent = (fid) => {
    Modal.open({
      title: 'הוספת אירוע חישוב עונש',
      body: `<div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">תאריך <span class="required">*</span></label><input type="date" id="se-date" class="form-control" value="${Utils.today()}"></div>
        <div class="form-group"><label class="form-label">סוג אירוע <span class="required">*</span></label>
          <select id="se-kind" class="form-control"><option value="extension">הארכה</option><option value="reduction">הפחתה</option><option value="auto">הפחתה אוטומטית</option></select></div>
        <div class="form-group"><label class="form-label">כמות ימים <span class="required">*</span></label><input type="number" min="1" id="se-days" class="form-control"></div>
        <div class="form-group"><label class="form-label">תיאור האירוע <span class="required">*</span></label><input id="se-desc" class="form-control"></div></div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" id="se-save">שמור</button>`,
    });
    Utils.el('se-save').onclick = () => {
      const days = parseInt(Utils.el('se-days').value, 10);
      if (!Utils.el('se-date').value || !days || days < 1 || !Utils.el('se-desc').value.trim()) { Toast.error('יש למלא תאריך, כמות ימים ותיאור'); return; }
      const f = Storage.getById(Storage.KEYS.PRISONER_FILES, fid); const u = Auth.getCurrentUser();
      f.sentenceEvents = (f.sentenceEvents || []).concat([{ date: Utils.el('se-date').value, kind: Utils.el('se-kind').value, days, description: Utils.el('se-desc').value.trim(), operator: u ? u.firstName + ' ' + u.lastName : '' }]);
      f.updatedAt = new Date().toISOString(); Storage.upsert(Storage.KEYS.PRISONER_FILES, f);
      Audit.log({ module: 'incarceration', action: 'update', entityType: 'prisonerFile', entityId: fid, description: 'הוספת אירוע חישוב עונש' });
      Modal.close(); Router.navigate('/prisoner-file', { id: fid });
    };
  };
  window.applyCalcRelease = (fid) => {
    const f = normalize(Storage.getById(Storage.KEYS.PRISONER_FILES, fid)); const c = calcSummary(f);
    f.expectedRelease = c.release; f.updatedAt = new Date().toISOString(); Storage.upsert(Storage.KEYS.PRISONER_FILES, f);
    Audit.log({ module: 'incarceration', action: 'update', entityType: 'prisonerFile', entityId: fid, description: 'עדכון תאריך שחרור לפי חישוב עונש' });
    Router.navigate('/prisoner-file', { id: fid });
  };

  // ---------- מיון ושיבוץ ----------

  function renderPrisonerClassification(file, esc, fd) {
    const c = file.classification || {};
    const flags = c.flags || [];
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">מיון ושיבוץ</div>
          ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="window.saveClassification('${file.id}')">שמור</button>` : ''}</div>
        <div class="card-body">
          <div style="display:flex;flex-wrap:wrap;gap:4px 16px;margin-bottom:12px">
            ${CLASS_FLAGS.map((l, i) => `<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" class="cls-flag" value="${Utils.escHtml(l)}" ${flags.includes(l) ? 'checked' : ''} ${canEdit ? '' : 'disabled'}> ${Utils.escHtml(l)}</label>`).join('')}
          </div>
          <div class="form-row form-row-3">
            <div class="form-group"><label class="form-label">רמת סיכון</label><div>${StatusBadge.renderRisk(file.riskLevel)}</div></div>
            <div class="form-group"><label class="form-label">מיקום נוכחי</label><div>${esc(file.cell)}</div></div>
            ${CLASS_FIELDS.map(([k, l]) => `<div class="form-group"><label class="form-label">${l}</label><input class="form-control cls-field" data-k="${k}" value="${Utils.escHtml(c[k] || '')}" ${canEdit ? '' : 'disabled'}></div>`).join('')}
          </div>
        </div>
      </div>`;
  }
  window.saveClassification = (fid) => {
    const f = Storage.getById(Storage.KEYS.PRISONER_FILES, fid);
    const c = { flags: [...document.querySelectorAll('.cls-flag:checked')].map(x => x.value) };
    document.querySelectorAll('.cls-field').forEach(x => { c[x.dataset.k] = x.value.trim(); });
    f.classification = c; f.updatedAt = new Date().toISOString();
    Storage.upsert(Storage.KEYS.PRISONER_FILES, f);
    Audit.log({ module: 'incarceration', action: 'update', entityType: 'prisonerFile', entityId: fid, description: 'עדכון מיון ושיבוץ' });
    Toast.success('מיון ושיבוץ נשמר');
  };

  // ---------- הארכות וגזר דין ----------
  function renderPrisonerVerdicts(file, esc, fd) {
    const list = file.verdicts || [];
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">הארכות וגזר דין</div>
          ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="window.addVerdict('${file.id}')">${Utils.icon('plus', 14)}</button>` : ''}</div>
        <div class="card-body">
          ${list.length === 0 ? '<div class="empty-state-desc">אין רשומות הארכה או גזר דין.</div>' : `
          <table class="data-table"><thead><tr><th>מס״ד</th><th>תאריך</th><th>סוג אסמכתא</th><th>עבירה</th><th>כמות</th></tr></thead><tbody>
            ${list.map((v, i) => `<tr><td>${i + 1}</td><td>${fd(v.date)}</td><td>${esc(v.refType)}</td><td>${esc(v.offense)}</td><td>${esc(String(v.quantity == null ? '' : v.quantity))}</td></tr>`).join('')}
          </tbody></table>`}
        </div>
      </div>`;
  }
  window.addVerdict = (fid) => {
    Modal.open({
      title: 'הוספת הארכה / גזר דין',
      body: `<div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">תאריך <span class="required">*</span></label><input type="date" id="vd-date" class="form-control" value="${Utils.today()}"></div>
        <div class="form-group"><label class="form-label">סוג אסמכתא <span class="required">*</span></label>
          <select id="vd-type" class="form-control"><option value="גזר דין">גזר דין</option><option value="הארכה">הארכה</option></select></div>
        <div class="form-group"><label class="form-label">עבירה <span class="required">*</span></label><input id="vd-offense" class="form-control"></div>
        <div class="form-group"><label class="form-label">כמות (ימים) <span class="required">*</span></label><input type="number" min="0" id="vd-qty" class="form-control"></div></div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" id="vd-save">שמור</button>`,
    });
    Utils.el('vd-save').onclick = () => {
      if (!Utils.el('vd-date').value || !Utils.el('vd-offense').value.trim() || Utils.el('vd-qty').value === '') { Toast.error('יש למלא את כל השדות'); return; }
      const f = Storage.getById(Storage.KEYS.PRISONER_FILES, fid);
      f.verdicts = (f.verdicts || []).concat([{ date: Utils.el('vd-date').value, refType: Utils.el('vd-type').value, offense: Utils.el('vd-offense').value.trim(), quantity: parseInt(Utils.el('vd-qty').value, 10) }]);
      f.updatedAt = new Date().toISOString(); Storage.upsert(Storage.KEYS.PRISONER_FILES, f);
      Audit.log({ module: 'incarceration', action: 'update', entityType: 'prisonerFile', entityId: fid, description: 'הוספת רשומת הארכה/גזר דין' });
      Modal.close(); Router.navigate('/prisoner-file', { id: fid });
    };
  };

  // ---------- אירוע חריג — reads the central event-reports dataset (no second copy) ----------
  function renderPrisonerIncidents(file, esc, fd) {
    const evs = Storage.getCollection(Storage.KEYS.EVENT_REPORTS).filter(e => e.prisonerFileId === file.id || (e.personId && e.personId === file.personId) || (e.participants || []).some(p => p.prisonerFileId === file.id || p.personId === file.personId));
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">אירועים חריגים — מתוך דוחות אירוע</div>
          <button class="btn btn-secondary btn-sm" onclick="Router.navigate('/event-reports')">פתח דוחות אירוע</button></div>
        <div class="card-body">
          ${evs.length === 0 ? '<div class="empty-state-desc">אין דוחות אירוע מקושרים לכלוא זה.</div>' : `
          <table class="data-table"><thead><tr><th>מס׳ סידורי</th><th>תאריך</th><th>שעה</th><th>כותרת</th><th>מיקום</th><th>סטטוס</th></tr></thead><tbody>
            ${evs.map(e => `<tr style="cursor:pointer" onclick="Router.navigate('/event-reports')"><td>${esc(String(e.sequenceNumber))}</td><td>${fd(e.eventDate)}</td><td>${esc(e.eventTime)}</td><td>${esc(e.title)}</td><td>${esc(e.location)}</td><td>${(Utils.isEventOpen(e) ? '<span class="badge badge-active">פתוח</span>' : '<span class="badge badge-closed">סגור</span>')}</td></tr>`).join('')}
          </tbody></table>`}
        </div>
      </div>`;
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
            <label class="form-label">תאריך <span class="required">*</span></label>
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
          <label class="form-label">תיאור <span class="required">*</span></label>
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
      if (!Utils.el('beh-date').value || !Utils.el('beh-desc').value.trim()) { Toast.error('יש למלא תאריך ותיאור'); return; }
      if (!ff.behaviorLog) ff.behaviorLog = [];
      const u = Auth.getCurrentUser();
      ff.behaviorLog.push({ date: Utils.el('beh-date').value, type: Utils.el('beh-type').value, description: Utils.el('beh-desc').value, reporter: u ? u.firstName + ' ' + u.lastName : '' });
      ff.updatedAt = new Date().toISOString();
      Storage.upsert(Storage.KEYS.PRISONER_FILES, ff);
      Audit.log({ module: 'incarceration', action: 'update', entityType: 'prisonerFile', entityId: fid, description: `רשומת התנהגות לתיק ${ff.fileNumber}` });
      Modal.close();
      Toast.success('הרשומה נשמרה');
      window._pfTab = 'behavior';
      Router.navigate('/prisoner-file', { id: fid });
    };
  };

  // פתיחת תיק כלוא — intake + personal fields taken from the legacy prisoner file header
  function showNewPrisonerModal(people) {
    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const inp = (id, label, extra, req) => `<div class="form-group"><label class="form-label">${label}${req ? ' <span class="required">*</span>' : ''}</label><input id="${id}" class="form-control" ${extra || ''}></div>`;
    const flag = (id, label) => `<label style="display:flex;gap:6px;align-items:center;margin:4px 12px 4px 0"><input type="checkbox" id="${id}"> ${label}</label>`;
    Modal.open({
      title: 'פתיחת תיק כלוא',
      size: 'xl',
      body: `
        <div class="table-panel-header" style="margin-bottom:8px">זיהוי</div>
        <div class="form-row form-row-3">
          <div class="form-group"><label class="form-label">מספר אישי <span class="required">*</span></label>
            <div style="display:flex;gap:6px"><input id="np-mil" class="form-control"><button type="button" class="btn btn-secondary btn-sm" id="np-lookup">${Utils.icon('search', 13)}</button></div></div>
          ${inp('np-first', 'שם פרטי', 'readonly')}${inp('np-last', 'שם משפחה', 'readonly')}
          ${inp('np-nid', 'מספר זהות', 'readonly')}${inp('np-rank', 'דרגה', 'readonly')}${inp('np-unit', 'יחידה', 'readonly')}
          ${inp('np-gender', 'מין', 'readonly')}${inp('np-birthyear', 'שנת לידה', 'readonly')}
          ${inp('np-father', 'שם האב')}${inp('np-unitphone', 'טלפון ביחידה')}${inp('np-country', 'ארץ לידה')}
        </div>
        <div class="table-panel-header" style="margin:12px 0 8px">קבלה וכליאה</div>
        <div class="form-row form-row-3">
          <div class="form-group"><label class="form-label">סוג העצור <span class="required">*</span></label>
            <select id="np-type" class="form-control"><option value="">בחר</option>${PRISONER_TYPES.map(t => `<option value="${Utils.escHtml(t)}">${Utils.escHtml(t)}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">תאריך קבלה <span class="required">*</span></label><input type="date" id="np-admission" class="form-control" value="${Utils.today()}"></div>
          <div class="form-group"><label class="form-label">שעת קבלה <span class="required">*</span></label><input type="time" id="np-time" class="form-control" value="${hhmm}"></div>
          <div class="form-group"><label class="form-label">בסיס מטפל <span class="required">*</span></label>
            <select id="np-base" class="form-control">${DEMO_BASES.map(b => `<option value="${b.id}">${Utils.escHtml(b.shortName)}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">פלוגה</label>
            <select id="np-company" class="form-control"><option value="">בחר</option>${DETENTION_COMPANIES.map(c => `<option value="${Utils.escHtml(c)}">${Utils.escHtml(c)}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">מיקום נוכחי</label>
            <select id="np-location" class="form-control"><option value="">בחר</option>${PRISONER_LOCATIONS.map(c => `<option value="${Utils.escHtml(c)}">${Utils.escHtml(c)}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">רמת סיכון</label>
            <select id="np-risk" class="form-control">${RISK_LEVELS.map(r => `<option value="${r.id}">${Utils.escHtml(r.label)}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">תאריך שחרור משוער</label><input type="date" id="np-release" class="form-control"></div>
          <div class="form-group"><label class="form-label">עונש (ימים)</label><input type="number" min="0" id="np-sentence" class="form-control"></div>
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">עילת מעצר / עבירה <span class="required">*</span></label>
            <select id="np-reason" class="form-control"><option value="">בחר</option>${DETENTION_REASONS.map(r => `<option value="${Utils.escHtml(r)}">${Utils.escHtml(r)}</option>`).join('')}</select></div>
        </div>
        <div style="margin:8px 0">${flag('nf-haredi', 'חרדי')}${flag('nf-veg', 'צמחוני')}${flag('nf-kosher', 'מנת בד"צ')}${flag('nf-allergy', 'אלרגני')}${flag('nf-exceptional', 'חריג')}${flag('nf-victim', 'תיק נפגע עבירה')}</div>
        <div class="form-group"><label class="form-label">הערות</label><textarea id="np-notes" class="form-control" rows="2"></textarea></div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" id="np-save">פתח תיק</button>`,
    });

    let person = null;
    Utils.el('np-lookup').onclick = () => {
      const mil = Utils.el('np-mil').value.trim();
      person = people.find(p => p.militaryNumber === mil) || null;
      if (!person) { Toast.error('לא נמצא אדם עם מספר אישי זה'); return; }
      const open = Storage.getCollection(Storage.KEYS.PRISONER_FILES).find(x => x.personId === person.id && x.status === 'active');
      if (open) { Toast.error('לאדם זה כבר קיים תיק כלוא פעיל'); person = null; return; }
      const set = (id, v) => { Utils.el(id).value = v || ''; };
      set('np-first', person.firstName); set('np-last', person.lastName); set('np-nid', person.nationalId);
      set('np-rank', (RANK_MAP[person.rank] || {}).label); set('np-unit', (DEMO_UNITS.find(u => u.id === person.unitId) || {}).name);
      set('np-gender', GENDER[person.gender]); set('np-birthyear', person.birthDate ? String(person.birthDate).slice(0, 4) : '');
    };
    Utils.el('np-save').onclick = () => {
      if (!person) { Toast.error('יש לאתר אדם לפי מספר אישי'); return; }
      const req = { 'np-type': 'סוג העצור', 'np-admission': 'תאריך קבלה', 'np-time': 'שעת קבלה', 'np-reason': 'עילת מעצר' };
      for (const id in req) { if (!Utils.el(id).value) { Toast.error('שדה חובה: ' + req[id]); Utils.el(id).focus(); return; } }
      const v = id => Utils.el(id).value.trim();
      const c = id => Utils.el(id).checked;
      const file = {
        id: 'pf_' + Utils.generateId(),
        fileNumber: 'PF-' + String(Math.floor(Math.random() * 90000) + 10000),
        personId: person.id,
        prisonerType: v('np-type'), intakeDate: v('np-admission'), admissionDate: v('np-admission'), intakeTime: v('np-time'),
        baseId: v('np-base'), company: v('np-company'), detentionCompany: v('np-company'), location: v('np-location'), cell: v('np-location'),
        riskLevel: v('np-risk'), expectedRelease: v('np-release') || null, sentence: parseInt(v('np-sentence'), 10) || 0,
        detentionReason: v('np-reason'), offense: v('np-reason'), notes: v('np-notes'),
        fatherName: v('np-father'), unitPhone: v('np-unitphone'), birthCountry: v('np-country'),
        haredi: c('nf-haredi'), vegetarian: c('nf-veg'), kosher: c('nf-kosher'), allergies: c('nf-allergy'), exceptional: c('nf-exceptional'), victimFile: c('nf-victim'),
        status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      Storage.upsert(Storage.KEYS.PRISONER_FILES, file);
      if (window.GachlatScreeningService) GachlatScreeningService.refresh();
      Audit.log({ module: 'incarceration', action: 'create', entityType: 'prisonerFile', entityId: file.id, description: `פתיחת תיק כלוא ${file.fileNumber}` });
      Modal.close();
      Toast.success('תיק כלוא נפתח');
      Router.navigate('/prisoner-file', { id: file.id });
    };
  }
};
