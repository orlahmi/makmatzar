/* deserter-file.js — תיק עריק/משתמט (structure per legacy Alon file) */
'use strict';

window.Pages = window.Pages || {};

Pages['deserter-file'] = function(query) {
  const content = Utils.el('page-content');
  const fileId = query && query.id;
  if (!fileId) { content.innerHTML = EmptyState.notFound(''); return; }

  const file = Storage.getById(Storage.KEYS.DESERTER_FILES, fileId);
  if (!file) { content.innerHTML = EmptyState.notFound(fileId); return; }

  // backward-compatible defaults (idempotent, in-memory until the user saves something)
  // legacy files carry no file number: never invent one — show them as an old file
  const fileNoLabel = file.fileNumber ? ' — ' + file.fileNumber : ' (תיק ישן)';
  const fileNoAudit = file.fileNumber || file.id;
  file.addresses = file.addresses || [];
  file.pastDesertions = file.pastDesertions || [];
  file.activities = file.activities || [];
  file.treatmentBases = file.treatmentBases || [];
  file.arrest = file.arrest || {};
  file.flags = file.flags || {
    hametz: false,
    requiresArrest: !!file.requiresArrest,
    escapedArrest: !!file.escapedArrest,
    haredi: !!file.haredi,
  };

  const people = Storage.getCollection(Storage.KEYS.PEOPLE);
  const person = people.find(p => p.id === file.personId);
  const canEdit = Permissions.can('createDeserterFile');
  const kind = (file.type || file.deserterType) === 'shirker' ? 'משתמט' : 'עריק';
  const base = BASE_MAP[file.baseId];
  const unit = person && (DEMO_UNITS.find(u => u.id === person.unitId) || {}).name;

  function esc(v) { return Utils.escHtml(v || '—'); }
  function fd(v) { return v ? Utils.formatDate(v) : '—'; }
  const rankLabel = (id) => { const r = RANK_MAP && RANK_MAP[id]; return r ? r.label : (id || '—'); };
  const days = Utils.daysBetween(file.startDate, file.endDate || Utils.today());

  function save(auditText) {
    file.updatedAt = new Date().toISOString();
    Storage.upsert(Storage.KEYS.DESERTER_FILES, file);
    if (auditText) Audit.log({ module: 'investigation', action: 'update', entityType: 'deserterFile', entityId: fileId, description: `${auditText} — תיק ${fileNoAudit}` });
  }
  function refresh(tab) { Router.navigate('/deserter-file', { id: fileId }); if (tab) window._deserterTab = tab; }

  content.innerHTML = `
    <div class="page-wrapper">
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">${Utils.icon('deserter', 22)} תיק ${kind}${Utils.escHtml(fileNoLabel)}</h1>
          <p class="page-subtitle">${StatusBadge.render(file.status)} &nbsp; ${base ? esc(base.shortName) + ' • ' : ''}עריק מתאריך: ${fd(file.startDate)}</p>
        </div>
        <div class="page-header-actions">
          ${canEdit && file.status === 'active' ? `
            <button class="btn btn-success btn-sm" onclick="window.markDeserterReturned()">${Utils.icon('check', 14)} חזר ליחידה</button>
            <button class="btn btn-warning btn-sm" onclick="window.markDeserterLocated()">${Utils.icon('search', 14)} אותר</button>
          ` : ''}
          ${canEdit && file.status === 'active' && person ? `<button class="btn btn-secondary btn-sm" onclick="Router.navigate('/new-prisoner-file', {personId:'${person.id}'})">פתח תיק כלוא</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="window.print()">${Utils.icon('print', 14)} הדפסה</button>
          <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/deserter-retrieval')">${Utils.icon('x', 14)} חזרה לאחזור</button>
        </div>
      </div>

      ${person ? `
      <div class="person-summary-card">
        <div class="person-avatar" style="background:${Utils.avatarColor(person.firstName)}">${Utils.initials(person.firstName, person.lastName)}</div>
        <div class="person-summary-details">
          <div class="person-summary-name">${esc(person.firstName)} ${esc(person.lastName)}</div>
          <div class="person-summary-meta">
            <span>${esc(rankLabel(person.rank))}</span>
            <span>מ"א: ${esc(person.militaryNumber)}</span>
            <span>ת"ז: ${esc(person.nationalId)}</span>
            <span>${esc(person.phone)}</span>
          </div>
        </div>
        <div class="person-summary-kpi">
          <div class="kpi-small"><div class="kpi-small-value">${days}</div><div class="kpi-small-label">ימי היעדרות</div></div>
          <div class="kpi-small"><div class="kpi-small-value">${DocumentService.forPerson(person.id).length}</div><div class="kpi-small-label">מסמכים${DocumentService.vsrFor(person.id).length ? ' · וס״ר קיים' : ''}</div></div>
        </div>
      </div>` : ''}

      <div id="deserter-tabs">
        <div class="tabs-nav" role="tablist"></div>
        <div class="tab-panel" data-tab="personal">${renderPersonal()}</div>
        <div class="tab-panel" data-tab="activities">${renderActivities()}</div>
        <div class="tab-panel" data-tab="treatment">${renderTreatment()}</div>
        <div class="tab-panel" data-tab="documents">${renderDocuments()}</div>
        <div class="tab-panel" data-tab="surveillance">${renderSurveillance()}</div>
        <div class="tab-panel" data-tab="history">${renderHistory()}</div>
      </div>
      ${Utils.classificationFooter()}
    </div>
  `;

  const startTab = window._deserterTab || 'personal';
  window._deserterTab = null;
  Tabs.create({
    containerId: 'deserter-tabs',
    defaultTab: startTab,
    tabs: [
      { id: 'personal', label: 'פרטים אישיים', icon: 'user' },
      { id: 'activities', label: 'פעילויות' },
      { id: 'treatment', label: 'טיפול' },
      { id: 'documents', label: 'מסמכים' },
      { id: 'surveillance', label: 'מעקב בילוש' },
      { id: 'history', label: 'היסטוריה' },
    ],
  });

  function infoRow(label, value) {
    return `<div class="info-list-row"><div class="info-list-label">${Utils.escHtml(label)}</div><div class="info-list-value">${value}</div></div>`;
  }
  function flagChip(on, label) { return `<span class="badge ${on ? 'badge-danger' : 'badge-draft'}">${label}${on ? '' : ' — לא'}</span>`; }

  function tbl(head, rows, emptyMsg, delFn) {
    if (!rows.length) return `<div class="empty-state-desc">${emptyMsg}</div>`;
    return `<table class="data-table"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}${delFn && canEdit ? '<th>פעולות</th>' : ''}</tr></thead><tbody>
      ${rows.map((r, i) => `<tr>${r.map(c => `<td>${c}</td>`).join('')}${delFn && canEdit ? `<td><button class="row-action-btn" title="מחיקה" onclick="${delFn}(${i})">${Utils.icon('trash', 14)}</button></td>` : ''}</tr>`).join('')}
    </tbody></table>`;
  }

  function renderPersonal() {
    const f = file.flags;
    return `
      <div class="tab-section-grid">
        <div class="card" style="grid-column:1/-1">
          <div class="card-header"><div class="card-title">סימונים</div></div>
          <div class="card-body" style="display:flex;gap:8px;flex-wrap:wrap">
            ${flagChip(f.hametz, 'עריק חמץ')}${flagChip(f.requiresArrest, 'נדרש מעצר')}${flagChip(f.escapedArrest, 'ברח ממעצר')}${flagChip(f.haredi, 'חרדי')}
            ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="window.editDeserterFlags()" style="margin-right:auto">עריכת סימונים</button>` : ''}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">פרטים אישיים</div></div>
          <div class="card-body"><div class="info-list">
            ${infoRow('שם פרטי', esc(person && person.firstName))}
            ${infoRow('שם משפחה', esc(person && person.lastName))}
            ${infoRow('ת.ז.', esc(person && person.nationalId))}
            ${infoRow('מ.א.', esc(person && person.militaryNumber))}
            ${infoRow('תאריך לידה', person && person.birthDate ? fd(person.birthDate) : '—')}
            ${infoRow('מין', esc(person && GENDER[person.gender]))}
            ${infoRow('יחידה', esc(unit))}
            ${infoRow('סוג תיק', kind)}
          </div></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">הערות</div></div>
          <div class="card-body">
            ${canEdit ? `<textarea id="file-notes" class="form-control" rows="6">${Utils.escHtml(file.notes || '')}</textarea>
              <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="window.saveDeserterNotes()">שמור הערות</button>`
              : `<div style="white-space:pre-line">${esc(file.notes)}</div>`}
          </div>
        </div>
        <div class="card" style="grid-column:1/-1">
          <div class="card-header"><div class="card-title">כתובות</div>
            ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="window.addDeserterAddress()">${Utils.icon('plus', 14)}</button>` : ''}</div>
          <div class="card-body">${tbl(['כתובת', 'תאריך רישום בכתובת', 'סוג', 'יישוב', 'מקור הכתובת', 'מיקוד'],
            file.addresses.map(a => [esc(a.address), fd(a.registeredAt), esc(a.type), esc(a.city), esc(a.source), esc(a.zip)]),
            'אין כתובות. לחץ על + להוספה.', 'window.delDeserterAddress')}</div>
        </div>
        <div class="card" style="grid-column:1/-1">
          <div class="card-header"><div class="card-title">עריקויות בעבר</div>
            ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="window.addPastDesertion()">${Utils.icon('plus', 14)}</button>` : ''}</div>
          <div class="card-body">${tbl(['מס״ד', 'תאריך יציאה לעריקות', 'סטטוס'],
            file.pastDesertions.map((d, i) => [String(i + 1), fd(d.startDate), esc(d.status)]),
            'אין עריקויות בעבר. לחץ על + להוספה.', 'window.delPastDesertion')}</div>
        </div>
      </div>`;
  }

  function renderActivities() {
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">פעילויות</div>
          ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="window.addDeserterActivity()">${Utils.icon('plus', 14)}</button>` : ''}</div>
        <div class="card-body">${tbl(['מס״ד', 'תאריך', 'בסיס מטפל', 'תוצאות טיפול'],
          file.activities.map((a, i) => [String(i + 1), fd(a.date), esc(a.baseName || a.officer), esc(a.results || a.description)]),
          'אין פעילויות. לחץ על + להוספה.', 'window.delDeserterActivity')}</div>
      </div>`;
  }

  function renderTreatment() {
    const a = file.arrest;
    const st = file.treatmentStatus || {};
    return `
      <div class="tab-section-grid">
        <div class="card">
          <div class="card-header"><div class="card-title">נתוני המעצר</div>
            ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="window.editDeserterArrest()">${Utils.icon('edit', 14)} עריכה</button>` : ''}</div>
          <div class="card-body"><div class="info-list">
            ${infoRow('מאשר פק׳ המעצר', esc(a.approver))}
            ${infoRow('בתאריך', fd(a.date))}
            ${infoRow('בשעה', esc(a.time))}
            ${infoRow('במקום', esc(a.place))}
            ${infoRow('תחנת מ״י', esc(a.policeStation))}
            ${infoRow('סיבת מעצר מ״י', esc(a.reason))}
            ${infoRow('הועבר לכלא', esc(a.transferredToPrison))}
            ${infoRow('עודכן ע״י', esc(a.updatedBy))}
            ${infoRow('הזנה אוטומטית בימ״ס', esc(a.autoEntry))}
          </div></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">נתוני העריקה/השתמטות/נט״ש</div></div>
          <div class="card-body"><div class="info-list">
            ${infoRow('עריק מתאריך', fd(file.startDate))}
            ${infoRow('תאריך פתיחת תיק', fd(file.openDate))}
            ${infoRow('מספר ימי עריקות', String(days))}
            ${infoRow('תאריך אישור מיטב', fd(file.mitavApprovalDate))}
          </div></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">סטטוס טיפול</div>
            ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="window.editDeserterStatus()">${Utils.icon('edit', 14)} עדכון</button>` : ''}</div>
          <div class="card-body"><div class="info-list">
            ${infoRow('סטטוס טיפול', StatusBadge.render(file.status))}
            ${infoRow('בסיס', esc(st.baseName || (base && base.shortName)))}
            ${infoRow('תאריך עדכון סטטוס', fd(st.updatedAt || (file.updatedAt || '').slice(0, 10)))}
          </div></div>
        </div>
        <div class="card" style="grid-column:1/-1">
          <div class="card-header"><div class="card-title">בסיסי טיפול</div>
            ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="window.addTreatmentBase()">${Utils.icon('plus', 14)}</button>` : ''}</div>
          <div class="card-body">${tbl(['בסיס מטפל', 'הועבר לטיפול ע״י', 'תאריך העברה', 'תאריך סיום טיפול', 'סוג בסיס'],
            file.treatmentBases.map(b => [esc(b.baseName), esc(b.transferredBy), fd(b.transferDate), fd(b.endDate), esc(b.baseType)]),
            'אין בסיסי טיפול. לחץ על + להוספה.', 'window.delTreatmentBase')}</div>
        </div>
      </div>`;
  }

  // documents are canonical records linked to the PERSON — the prisoner file of the same person shows them without re-upload
  function renderDocuments() {
    window._docRefresh = () => refresh('documents');
    const docs = file.personId ? DocumentService.forPerson(file.personId) : [];
    const hasVsr = docs.some(d => d.docType === 'vsr');
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">מסמכים</div>
          ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="window.deserterUploadDoc()">${Utils.icon('plus', 14)} העלאת מסמך</button>` : ''}</div>
        <div class="card-body">
          <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:8px">${hasVsr ? 'וס״ר קיים. הוא יוצג אוטומטית גם בתיק הכלוא של אותו אדם — אין צורך להעלות אותו שוב.' : 'טרם הועלה וס״ר. וס״ר שיועלה כאן יהיה זמין אוטומטית בתיק הכלוא של אותו אדם.'}</div>
          ${DocumentService.table(docs, { empty: 'לא הועלו מסמכים לאדם זה.', removableModule: 'deserter', canEdit })}
        </div>
      </div>`;
  }
  window.deserterUploadDoc = () => DocumentService.uploadModal({
    personId: file.personId, sourceModule: 'deserter', sourceRecordId: fileId, types: ['vsr', 'other'], title: 'העלאת מסמך לתיק עריק',
    onDone: () => refresh('documents'),
  });

  function renderSurveillance() {
    const survFiles = Storage.getCollection(Storage.KEYS.SURVEILLANCE_ACTIVITIES).filter(s => s.deserterFileId === fileId || (s.deserters || []).some(d => d.deserterFileId === fileId));
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">פעילויות בילוש מקושרות</div></div>
        <div class="card-body">
          ${survFiles.length === 0 ? '<div class="empty-state-desc">אין פעילויות בילוש מקושרות לתיק זה.</div>' : `
            <table class="data-table">
              <thead><tr><th>תאריך</th><th>מיקום</th><th>תיאור</th><th>סטטוס</th></tr></thead>
              <tbody>${survFiles.map(s => `<tr><td>${fd(s.date)}</td><td>${esc(s.location)}</td><td>${esc(Utils.truncate(s.objective || s.description || "", 60))}</td><td>${StatusBadge.render(s.status)}</td></tr>`).join('')}</tbody>
            </table>`}
          ${canEdit ? `<button class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="Router.navigate('/surveillance-activity-build', {deserterFileId:'${fileId}'})">פתח פעילות בילוש</button>` : ''}
        </div>
      </div>`;
  }

  function renderHistory() {
    const auditEntries = Storage.getCollection(Storage.KEYS.AUDIT_ENTRIES).filter(a => a.entityId === fileId);
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">היסטוריית שינויים</div></div>
        <div class="card-body">
          ${auditEntries.length === 0 ? '<div class="empty-state-desc">אין היסטוריה.</div>' : `
            <div class="timeline">${auditEntries.map(e => `
              <div class="timeline-item"><div class="timeline-dot"></div>
                <div class="timeline-content"><div class="timeline-title">${esc(e.description)}</div>
                <div class="timeline-meta">${Utils.formatDateTime(e.timestamp)} — ${esc(e.userName)}</div></div></div>`).join('')}
            </div>`}
        </div>
      </div>`;
  }

  // ---------- actions ----------
  const stay = (tab) => { window._deserterTab = tab; Router.navigate('/deserter-file', { id: fileId }); };
  const field = (id, label, type, val, extra) => `<div class="form-group"><label class="form-label">${label}</label><input id="${id}" type="${type || 'text'}" class="form-control" value="${Utils.escHtml(val || '')}" ${extra || ''}></div>`;
  const modal = (title, body, fnName) => Modal.open({ title, body: `<div class="form-row form-row-2">${body}</div>`, footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" onclick="${fnName}()">שמור</button>` });
  const v = (id) => Utils.el(id).value.trim();

  window.markDeserterReturned = async () => {
    const ok = await Modal.confirm({ title: 'חזר ליחידה', message: 'האם לסמן כ"חזר ליחידה"?', type: 'success' });
    if (!ok) return;
    file.status = 'returned'; file.endDate = Utils.today();
    save(); Audit.log({ module: 'investigation', action: 'close', entityType: 'deserterFile', entityId: fileId, description: `תיק ${fileNoAudit}: חזר ליחידה` });
    Toast.success('התיק עודכן — חזר ליחידה'); setTimeout(() => stay('treatment'), 300);
  };
  window.markDeserterLocated = async () => {
    const ok = await Modal.confirm({ title: 'אותר', message: 'האם לסמן כ"אותר"?', type: 'success' });
    if (!ok) return;
    file.status = 'located'; save(`אותר`);
    Toast.success('התיק עודכן — אותר'); setTimeout(() => stay('treatment'), 300);
  };
  window.saveDeserterNotes = () => { file.notes = Utils.el('file-notes').value; save('עדכון הערות'); Toast.success('ההערות נשמרו'); };

  window.editDeserterFlags = () => {
    const f = file.flags;
    Modal.open({
      title: 'סימוני תיק',
      body: [['hametz', 'עריק חמץ'], ['requiresArrest', 'נדרש מעצר'], ['escapedArrest', 'ברח ממעצר'], ['haredi', 'חרדי']]
        .map(([k, l]) => `<label style="display:flex;gap:8px;margin-bottom:8px"><input type="checkbox" id="fl-${k}" ${f[k] ? 'checked' : ''}> ${l}</label>`).join(''),
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" onclick="window._saveFlags()">שמור</button>`,
    });
    window._saveFlags = () => {
      ['hametz', 'requiresArrest', 'escapedArrest', 'haredi'].forEach(k => { file.flags[k] = Utils.el('fl-' + k).checked; });
      file.requiresArrest = file.flags.requiresArrest; file.escapedArrest = file.flags.escapedArrest; file.haredi = file.flags.haredi;
      save('עדכון סימונים'); Modal.close(); stay('personal');
    };
  };

  window.addDeserterAddress = () => {
    modal('הוספת כתובת', field('ad-address', 'כתובת') + field('ad-date', 'תאריך רישום בכתובת', 'date') + field('ad-type', 'סוג') + field('ad-city', 'יישוב') + field('ad-source', 'מקור הכתובת') + field('ad-zip', 'מיקוד'), 'window._saveAddr');
    window._saveAddr = () => {
      if (!v('ad-address')) { Toast.error('יש להזין כתובת'); return; }
      file.addresses.push({ address: v('ad-address'), registeredAt: v('ad-date'), type: v('ad-type'), city: v('ad-city'), source: v('ad-source'), zip: v('ad-zip') });
      save('הוספת כתובת'); Modal.close(); stay('personal');
    };
  };
  window.delDeserterAddress = (i) => { file.addresses.splice(i, 1); save('מחיקת כתובת'); stay('personal'); };

  window.addPastDesertion = () => {
    modal('הוספת עריקות בעבר', field('pd-date', 'תאריך יציאה לעריקות', 'date') + field('pd-status', 'סטטוס'), 'window._savePd');
    window._savePd = () => {
      if (!v('pd-date')) { Toast.error('יש להזין תאריך'); return; }
      file.pastDesertions.push({ startDate: v('pd-date'), status: v('pd-status') });
      save('הוספת עריקות בעבר'); Modal.close(); stay('personal');
    };
  };
  window.delPastDesertion = (i) => { file.pastDesertions.splice(i, 1); save('מחיקת עריקות בעבר'); stay('personal'); };

  window.addDeserterActivity = () => {
    modal('הוספת פעילות', field('da-date', 'תאריך', 'date', Utils.today()) + field('da-base', 'בסיס מטפל') + `<div class="form-group" style="grid-column:1/-1"><label class="form-label">תוצאות טיפול</label><textarea id="da-res" class="form-control" rows="3"></textarea></div>`, 'window._saveAct');
    window._saveAct = () => {
      if (!v('da-date')) { Toast.error('יש להזין תאריך'); return; }
      const user = Auth.getCurrentUser();
      file.activities.push({ date: v('da-date'), baseName: v('da-base'), results: v('da-res'), officer: user ? user.firstName + ' ' + user.lastName : '' });
      save('הוספת פעילות'); Modal.close(); stay('activities');
    };
  };
  window.delDeserterActivity = (i) => { file.activities.splice(i, 1); save('מחיקת פעילות'); stay('activities'); };

  window.editDeserterArrest = () => {
    const a = file.arrest;
    modal('נתוני המעצר', field('ar-approver', 'מאשר פק׳ המעצר', 'text', a.approver) + field('ar-date', 'בתאריך', 'date', a.date) + field('ar-time', 'בשעה', 'time', a.time)
      + field('ar-place', 'במקום', 'text', a.place) + field('ar-station', 'תחנת מ״י', 'text', a.policeStation) + field('ar-reason', 'סיבת מעצר מ״י', 'text', a.reason)
      + field('ar-prison', 'הועבר לכלא', 'text', a.transferredToPrison) + field('ar-by', 'עודכן ע״י', 'text', a.updatedBy) + field('ar-auto', 'הזנה אוטומטית בימ״ס', 'text', a.autoEntry), 'window._saveArrest');
    window._saveArrest = () => {
      file.arrest = { approver: v('ar-approver'), date: v('ar-date'), time: v('ar-time'), place: v('ar-place'), policeStation: v('ar-station'), reason: v('ar-reason'), transferredToPrison: v('ar-prison'), updatedBy: v('ar-by'), autoEntry: v('ar-auto') };
      save('עדכון נתוני מעצר'); Modal.close(); stay('treatment');
    };
  };

  window.editDeserterStatus = () => {
    Modal.open({
      title: 'עדכון סטטוס טיפול',
      body: `<div class="form-group"><label class="form-label">סטטוס</label><select id="st-status" class="form-control">${DESERTER_STATUSES.map(s => `<option value="${s.id}" ${file.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}</select></div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" onclick="window._saveSt()">שמור</button>`,
    });
    window._saveSt = () => {
      file.status = Utils.el('st-status').value;
      file.treatmentStatus = { baseName: base ? base.shortName : '', updatedAt: Utils.today() };
      if (['returned', 'closed'].includes(file.status) && !file.endDate) file.endDate = Utils.today();
      save('עדכון סטטוס טיפול'); Modal.close(); stay('treatment');
    };
  };

  window.addTreatmentBase = () => {
    modal('הוספת בסיס טיפול', field('tb-base', 'בסיס מטפל') + field('tb-by', 'הועבר לטיפול ע״י') + field('tb-from', 'תאריך העברה', 'date', Utils.today()) + field('tb-to', 'תאריך סיום טיפול', 'date') + field('tb-type', 'סוג בסיס'), 'window._saveTb');
    window._saveTb = () => {
      if (!v('tb-base')) { Toast.error('יש להזין בסיס מטפל'); return; }
      file.treatmentBases.push({ baseName: v('tb-base'), transferredBy: v('tb-by'), transferDate: v('tb-from'), endDate: v('tb-to'), baseType: v('tb-type') });
      save('הוספת בסיס טיפול'); Modal.close(); stay('treatment');
    };
  };
  window.delTreatmentBase = (i) => { file.treatmentBases.splice(i, 1); save('מחיקת בסיס טיפול'); stay('treatment'); };
};
