/* deserter-file.js — detailed deserter file */
'use strict';

window.Pages = window.Pages || {};

Pages['deserter-file'] = function(query) {
  const content = Utils.el('page-content');
  const fileId = query && query.id;
  if (!fileId) { content.innerHTML = EmptyState.notFound(''); return; }

  const file = Storage.getById(Storage.KEYS.DESERTER_FILES, fileId);
  if (!file) { content.innerHTML = EmptyState.notFound(fileId); return; }

  const people = Storage.getCollection(Storage.KEYS.PEOPLE);
  const person = people.find(p => p.id === file.personId);
  const canEdit = Permissions.can('createDeserterFile');

  function esc(v) { return Utils.escHtml(v || '—'); }
  function fd(v) { return v ? Utils.formatDate(v) : '—'; }
  const rankLabel = (id) => { const r = RANK_MAP && RANK_MAP[id]; return r ? r.label : (id || '—'); };

  content.innerHTML = `
    <div class="page-wrapper">
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">${Utils.icon('deserter', 22)} תיק עריקות — ${esc(file.fileNumber)}</h1>
          <p class="page-subtitle">${StatusBadge.render(file.status)} &nbsp; תחילה: ${fd(file.startDate)}</p>
        </div>
        <div class="page-header-actions">
          ${canEdit && file.status === 'active' ? `
            <button class="btn btn-success btn-sm" onclick="window.markDeserterReturned()">${Utils.icon('check', 14)} חזר ליחידה</button>
            <button class="btn btn-warning btn-sm" onclick="window.markDeserterLocated()">${Utils.icon('search', 14)} אותר</button>
          ` : ''}
          <button class="btn btn-secondary btn-sm" onclick="window.print()">${Utils.icon('print', 14)} הדפסה</button>
          <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/deserter-retrieval')">${Utils.icon('x', 14)} סגור</button>
        </div>
      </div>

      ${person ? `
      <div class="person-summary-card">
        <div class="person-avatar" style="background:${Utils.avatarColor(person.firstName)}">
          ${Utils.initials(person.firstName, person.lastName)}
        </div>
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
          <div class="kpi-small">
            <div class="kpi-small-value">${Utils.daysBetween(file.startDate, file.endDate || Utils.today())}</div>
            <div class="kpi-small-label">ימי היעדרות</div>
          </div>
        </div>
      </div>
      ` : ''}

      <div id="deserter-tabs">
        <div class="tabs-nav" role="tablist"></div>

        <div class="tab-panel" data-tab="info">
          ${renderTabInfo()}
        </div>
        <div class="tab-panel" data-tab="activities">
          ${renderTabActivities()}
        </div>
        <div class="tab-panel" data-tab="surveillance">
          ${renderTabSurveillance()}
        </div>
        <div class="tab-panel" data-tab="contacts">
          ${renderTabContacts()}
        </div>
        <div class="tab-panel" data-tab="history">
          ${renderTabHistory()}
        </div>
      </div>
    </div>
  `;

  Tabs.create({
    containerId: 'deserter-tabs',
    defaultTab: 'info',
    tabs: [
      { id: 'info', label: 'פרטי התיק', icon: 'report' },
      { id: 'activities', label: 'פעולות' },
      { id: 'surveillance', label: 'מעקב' },
      { id: 'contacts', label: 'איש קשר' },
      { id: 'history', label: 'היסטוריה' },
    ],
  });

  function infoRow(label, value) {
    return `<div class="info-list-row"><div class="info-list-label">${Utils.escHtml(label)}</div><div class="info-list-value">${value}</div></div>`;
  }

  function renderTabInfo() {
    return `
      <div class="tab-section-grid">
        <div class="card">
          <div class="card-header"><div class="card-title">פרטי תיק</div></div>
          <div class="card-body">
            <div class="info-list">
              ${infoRow('מספר תיק', esc(file.fileNumber))}
              ${infoRow('סטטוס', StatusBadge.render(file.status))}
              ${infoRow('סוג עריקה', esc(file.deserterType))}
              ${infoRow('תחילת עריקה', fd(file.startDate))}
              ${infoRow('סיום עריקה', fd(file.endDate))}
              ${infoRow('ימי היעדרות', String(Utils.daysBetween(file.startDate, file.endDate || Utils.today())))}
              ${infoRow('מטפל', esc(file.assignedTo))}
              ${infoRow('מיקום אחרון ידוע', esc(file.lastLocationKnown))}
            </div>
          </div>
        </div>
        ${person ? `
        <div class="card">
          <div class="card-header"><div class="card-title">פרטי האדם</div></div>
          <div class="card-body">
            <div class="info-list">
              ${infoRow('שם', esc(person.firstName + ' ' + person.lastName))}
              ${infoRow('מספר אישי', esc(person.militaryNumber))}
              ${infoRow('ת.ז.', esc(person.nationalId))}
              ${infoRow('דרגה', esc(rankLabel(person.rank)))}
              ${infoRow('חיל', esc(person.corps))}
              ${infoRow('טלפון', esc(person.phone))}
              ${infoRow('כתובת', esc(person.address))}
            </div>
          </div>
        </div>
        ` : ''}
        <div class="card" style="grid-column:1/-1">
          <div class="card-header"><div class="card-title">הערות</div></div>
          <div class="card-body">
            ${canEdit ? `
              <textarea id="file-notes" class="form-control" rows="4">${esc(file.notes)}</textarea>
              <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="window.saveDeserterNotes()">שמור הערות</button>
            ` : `<div style="white-space:pre-line">${esc(file.notes)}</div>`}
          </div>
        </div>
      </div>
    `;
  }

  function renderTabActivities() {
    const acts = file.activities || [];
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">פעולות מעקב ואיתור</div>
          ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="window.addDeserterActivity()">הוסף פעולה</button>` : ''}
        </div>
        <div class="card-body">
          ${acts.length === 0 ? '<div class="empty-state-desc">לא תועדו פעולות עדיין.</div>' : `
            <div class="timeline">
              ${acts.map(a => `
                <div class="timeline-item">
                  <div class="timeline-dot ${a.type === 'located' ? 'timeline-dot-success' : ''}"></div>
                  <div class="timeline-content">
                    <div class="timeline-title">${esc(a.type)} — ${esc(a.description)}</div>
                    <div class="timeline-meta">${fd(a.date)} ${esc(a.time)} — ${esc(a.officer)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  function renderTabSurveillance() {
    const survFiles = Storage.getCollection(Storage.KEYS.SURVEILLANCE_ACTIVITIES).filter(s => s.deserterFileId === fileId);
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">פעילויות מעקב</div></div>
        <div class="card-body">
          ${survFiles.length === 0 ? '<div class="empty-state-desc">אין פעילויות מעקב מקושרות לתיק זה.</div>' : `
            <table class="data-table">
              <thead><tr><th>תאריך</th><th>מיקום</th><th>תיאור</th><th>סטטוס</th></tr></thead>
              <tbody>
                ${survFiles.map(s => `<tr>
                  <td>${fd(s.date)}</td>
                  <td>${esc(s.location)}</td>
                  <td>${Utils.truncate(s.description, 60)}</td>
                  <td>${StatusBadge.render(s.status)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          `}
          ${canEdit ? `<button class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="Router.navigate('/surveillance-activity-build', {deserterFileId:'${fileId}'})">פתח פעילות מעקב</button>` : ''}
        </div>
      </div>
    `;
  }

  function renderTabContacts() {
    const contacts = file.contacts || (person ? [{ name: person.firstName + ' ' + person.lastName, phone: person.phone, relation: 'עצמו' }] : []);
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">אנשי קשר</div></div>
        <div class="card-body">
          ${contacts.length === 0 ? '<div class="empty-state-desc">לא הוזנו אנשי קשר.</div>' : `
            <table class="data-table">
              <thead><tr><th>שם</th><th>טלפון</th><th>קשר</th></tr></thead>
              <tbody>
                ${contacts.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td>${esc(c.relation)}</td></tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function renderTabHistory() {
    const auditEntries = Storage.getCollection(Storage.KEYS.AUDIT).filter(a => a.entityId === fileId);
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
                    <div class="timeline-title">${esc(e.description)}</div>
                    <div class="timeline-meta">${Utils.formatDateTime(e.timestamp)} — ${esc(e.userName)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  // Global actions
  window.markDeserterReturned = async () => {
    const ok = await Modal.confirm({ title: 'חזר ליחידה', message: 'האם לסמן כ"חזר ליחידה"?', type: 'success' });
    if (!ok) return;
    file.status = 'returned';
    file.endDate = Utils.today();
    file.updatedAt = new Date().toISOString();
    Storage.upsert(Storage.KEYS.DESERTER_FILES, file);
    Audit.log({ module: 'investigation', action: 'close', entityType: 'deserterFile', entityId: fileId, description: `תיק ${file.fileNumber}: חזר ליחידה` });
    Toast.success('התיק עודכן — חזר ליחידה');
    setTimeout(() => Router.navigate('/deserter-file', { id: fileId }), 400);
  };

  window.markDeserterLocated = async () => {
    const ok = await Modal.confirm({ title: 'אותר', message: 'האם לסמן כ"אותר"?', type: 'success' });
    if (!ok) return;
    file.status = 'located';
    file.updatedAt = new Date().toISOString();
    Storage.upsert(Storage.KEYS.DESERTER_FILES, file);
    Audit.log({ module: 'investigation', action: 'update', entityType: 'deserterFile', entityId: fileId, description: `תיק ${file.fileNumber}: אותר` });
    Toast.success('התיק עודכן — אותר');
    setTimeout(() => Router.navigate('/deserter-file', { id: fileId }), 400);
  };

  window.saveDeserterNotes = () => {
    const notes = Utils.el('file-notes').value;
    file.notes = notes;
    file.updatedAt = new Date().toISOString();
    Storage.upsert(Storage.KEYS.DESERTER_FILES, file);
    Audit.log({ module: 'investigation', action: 'update', entityType: 'deserterFile', entityId: fileId, description: `עדכון הערות תיק ${file.fileNumber}` });
    Toast.success('ההערות נשמרו');
  };

  window.addDeserterActivity = () => {
    Modal.open({
      title: 'הוספת פעולת מעקב',
      body: `
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">תאריך</label>
            <input type="date" id="da-date" class="form-control" value="${Utils.today()}">
          </div>
          <div class="form-group">
            <label class="form-label">שעה</label>
            <input type="time" id="da-time" class="form-control">
          </div>
          <div class="form-group">
            <label class="form-label">סוג פעולה</label>
            <select id="da-type" class="form-control">
              <option value="search">חיפוש</option>
              <option value="contact">יצירת קשר</option>
              <option value="located">איתור</option>
              <option value="other">אחר</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">תיאור</label>
          <textarea id="da-desc" class="form-control" rows="3"></textarea>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>
        <button class="btn btn-primary" onclick="window._saveDeserterActivity()">הוסף</button>
      `,
    });

    window._saveDeserterActivity = () => {
      if (!file.activities) file.activities = [];
      const user = Auth.getCurrentUser();
      file.activities.push({
        date: Utils.el('da-date').value,
        time: Utils.el('da-time').value,
        type: Utils.el('da-type').value,
        description: Utils.el('da-desc').value,
        officer: user ? user.firstName + ' ' + user.lastName : '',
      });
      file.updatedAt = new Date().toISOString();
      Storage.upsert(Storage.KEYS.DESERTER_FILES, file);
      Audit.log({ module: 'investigation', action: 'update', entityType: 'deserterFile', entityId: fileId, description: `פעולת מעקב לתיק ${file.fileNumber}` });
      Modal.close();
      Toast.success('הפעולה נוספה');
      setTimeout(() => Router.navigate('/deserter-file', { id: fileId }), 400);
    };
  };
};
