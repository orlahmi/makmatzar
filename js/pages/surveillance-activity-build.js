/* surveillance-activity-build.js — surveillance activity builder */
'use strict';

window.Pages = window.Pages || {};

Pages['surveillance-activity-build'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('investigation')) { content.innerHTML = EmptyState.accessDenied(); return; }

  const deserterFileId = query && query.deserterFileId;
  const user = Auth.getCurrentUser();
  const people = Storage.getCollection(Storage.KEYS.PEOPLE);
  let teams = [{ id: 1, name: 'צוות א', members: [], outDate: '', outTime: '', returnDate: '', returnTime: '' }];
  let deserters = [];
  const activityNumber = 'SAV-' + String(Math.max(0, ...Storage.getCollection(Storage.KEYS.SURVEILLANCE_ACTIVITIES).map(a => parseInt(String(a.number || '').replace(/\D/g, ''), 10) || 0)) + 1).padStart(3, '0');
  const deserterFiles = Storage.getCollection(Storage.KEYS.DESERTER_FILES).filter(f => f.status === 'active');
  let teamCounter = 0;
  let isDirty = false;

  content.innerHTML = `
    <div class="page-wrapper">
      ${Utils.pageHeader('בניית פעילות בילוש', Utils.pageMeta())}

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
        <button class="btn btn-secondary" style="margin-right:auto" onclick="${deserterFileId ? `Router.navigate('/deserter-file', {id:'${deserterFileId}'})` : "Router.navigate('/deserter-retrieval')"}">ביטול</button>
        <button class="btn btn-primary" id="btn-save">שמור פעילות</button>
      </div>

      <form id="surv-form">
        <!-- Basic details -->
        <div class="page-section">
          <div class="section-header"><div class="section-title">פרטי הפעילות</div></div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">תאריך <span class="required">*</span></label>
              <input type="date" name="date" class="form-control" value="${Utils.today()}" required>
            </div>
            <div class="form-group">
              <label class="form-label">שעת התחלה <span class="required">*</span></label>
              <input type="time" name="startTime" class="form-control" required>
            </div>
            <div class="form-group">
              <label class="form-label">שעת סיום</label>
              <input type="time" name="endTime" class="form-control">
            </div>
            <div class="form-group" style="grid-column:1/3">
              <label class="form-label">מיקום <span class="required">*</span></label>
              <input name="location" class="form-control" required placeholder="כתובת / מקום הפעילות">
            </div>
            <div class="form-group">
              <label class="form-label">מספר פעילות</label>
              <input class="form-control" value="${activityNumber}" readonly>
            </div>
            <div class="form-group">
              <label class="form-label">סטטוס</label>
              <select name="status" class="form-control">
                <option value="planned">מתוכננת</option><option value="in_progress">בביצוע</option><option value="completed">הושלמה</option><option value="cancelled">בוטלה</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">רמת מסוכנות</label>
              <select name="priority" class="form-control">
                <option value="">בחר רמה</option>
                ${RISK_LEVELS.filter(r => r.id !== 'critical').map(r => `<option value="${r.id}">${Utils.escHtml(r.label)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">מפקד פעילות</label>
              <input name="commander" class="form-control" value="${user ? Utils.escHtml(user.firstName + ' ' + user.lastName) : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">מאשר</label>
              <input name="authorizedBy" class="form-control">
            </div>
            ${deserterFileId ? `<input type="hidden" name="deserterFileId" value="${Utils.escHtml(deserterFileId)}">` : ''}
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">מטרת הפעילות <span class="required">*</span></label>
              <textarea name="objective" class="form-control" rows="3" required placeholder="תאר את מטרת פעילות המעקב..."></textarea>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">הערות</label>
              <textarea name="notes" class="form-control" rows="2"></textarea>
            </div>
          </div>
        </div>

        <!-- סימון עריקים -->
        <div class="page-section">
          <div class="section-header">
            <div class="section-title">סימון עריקים</div>
            <span style="display:flex;gap:6px"><select id="dm-select" class="form-control" style="min-width:240px"><option value="">בחר עריק / משתמט פעיל</option>${deserterFiles.map(f => { const p = people.find(x => x.id === f.personId); return `<option value="${f.id}">${Utils.escHtml((p ? p.militaryNumber + ' — ' + p.firstName + ' ' + p.lastName : f.fileNumber))}</option>`; }).join('')}</select>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-deserter">${Utils.icon('plus', 14)} הוסף</button></span>
          </div>
          <div id="deserters-container"></div>
        </div>

        <!-- Teams -->
        <div class="page-section">
          <div class="section-header">
            <div class="section-title">צוותים</div>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-team">${Utils.icon('plus', 14)} הוסף צוות</button>
          </div>
          <div id="teams-container"></div>
        </div>

        <!-- Coverage spots -->
        <div class="page-section">
          <div class="section-header">
            <div class="section-title">נקודות כיסוי</div>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-spot">${Utils.icon('plus', 14)} הוסף נקודה</button>
          </div>
          <div id="spots-container">
            <div style="color:var(--color-text-muted);font-size:var(--font-size-sm)">לא הוגדרו נקודות כיסוי</div>
          </div>
        </div>

        <!-- Equipment -->
        <div class="page-section">
          <div class="section-header"><div class="section-title">ציוד מבצעי</div></div>
          <div class="form-row form-row-3">
            ${EQUIPMENT_TYPES.map(eq => `
              <div class="form-group">
                <label class="form-label">
                  <input type="checkbox" name="equip_${eq.id}" style="margin-left:6px">
                  ${Utils.escHtml(eq.label)}
                </label>
              </div>
            `).join('')}
          </div>
        </div>
      </form>

      ${Utils.classificationFooter()}
    </div>
  `;

  // Deserter marking (legacy: מ.א., דרגה, שם עריק, כתובת, ביקור אחרון, סטטוס)
  function deserterRow(f) {
    const p = people.find(x => x.id === f.personId) || {};
    const addr = (f.addresses || [])[0];
    const lastVisit = (f.activities || []).map(a => a.date).filter(Boolean).sort().pop() || '';
    return { deserterFileId: f.id, militaryNumber: p.militaryNumber || '', rank: (RANK_MAP[p.rank] || {}).label || '', name: ((p.firstName || '') + ' ' + (p.lastName || '')).trim(),
      address: addr ? [addr.address, addr.city].filter(Boolean).join(', ') : (p.address || ''), lastVisit, status: (DESERTER_STATUSES.find(x => x.id === f.status) || {}).label || '' };
  }
  function renderDeserters() {
    const box = Utils.el('deserters-container');
    if (!deserters.length) { box.innerHTML = '<div style="color:var(--color-text-muted);font-size:var(--font-size-sm)">לא סומנו עריקים לפעילות</div>'; return; }
    box.innerHTML = `<table class="data-table"><thead><tr><th>מ.א.</th><th>דרגה</th><th>שם עריק</th><th>כתובת</th><th>ביקור אחרון</th><th>סטטוס</th><th></th></tr></thead><tbody>${deserters.map((d, i) => `<tr><td>${Utils.escHtml(d.militaryNumber)}</td><td>${Utils.escHtml(d.rank || '—')}</td><td>${Utils.escHtml(d.name)}</td><td>${Utils.escHtml(d.address || '—')}</td><td>${d.lastVisit ? Utils.formatDate(d.lastVisit) : '—'}</td><td>${Utils.escHtml(d.status)}</td><td><button type="button" class="row-action-btn danger" data-rmd="${i}">${Utils.icon('trash', 12)}</button></td></tr>`).join('')}</tbody></table>`;
    box.querySelectorAll('[data-rmd]').forEach(b => b.onclick = () => { deserters.splice(Number(b.dataset.rmd), 1); renderDeserters(); });
  }
  Utils.el('btn-add-deserter').onclick = () => {
    const id = Utils.el('dm-select').value; if (!id) { Toast.error('יש לבחור עריק'); return; }
    if (deserters.some(d => d.deserterFileId === id)) { Toast.error('העריק כבר סומן בפעילות'); return; }
    deserters.push(deserterRow(deserterFiles.find(f => f.id === id))); renderDeserters();
  };
  if (deserterFileId) { const f = Storage.getById(Storage.KEYS.DESERTER_FILES, deserterFileId); if (f) deserters.push(deserterRow(f)); }
  renderDeserters();

  // Teams
  let spots = [];

  function renderTeams() {
    const container = Utils.el('teams-container');
    container.innerHTML = teams.map((team, ti) => `
      <div class="team-card card" style="margin-bottom:var(--space-4)">
        <div class="card-header">
          <div class="card-title">
            <input class="form-control team-name-input" data-ti="${ti}" value="${Utils.escHtml(team.name)}" style="width:180px;font-weight:600">
          </div>
          <div style="display:flex;gap:var(--space-2)">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window._addTeamMember(${ti})">${Utils.icon('plus', 12)} הוסף</button>
            ${teams.length > 1 ? `<button type="button" class="btn btn-ghost btn-sm" onclick="window._removeTeam(${ti})">${Utils.icon('trash', 12)}</button>` : ''}
          </div>
        </div>
        <div class="card-body">
          <div class="form-row form-row-3" style="margin-bottom:8px">
            ${[['outDate', 'תאריך יציאה', 'date'], ['outTime', 'שעת יציאה', 'time'], ['returnDate', 'תאריך חזרה', 'date'], ['returnTime', 'שעת חזרה', 'time']].map(([k, l, t]) => `<div class="form-group"><label class="form-label">${l}</label><input type="${t}" class="form-control team-field" data-ti="${ti}" data-k="${k}" value="${Utils.escHtml(team[k] || '')}"></div>`).join('')}
          </div>
          ${team.members.length === 0 ? '<div style="color:var(--color-text-muted);font-size:var(--font-size-sm)">לא נוספו חברי צוות</div>' : `
            <table class="data-table">
              <thead><tr><th>אדם</th><th>תפקיד</th><th></th></tr></thead>
              <tbody>
                ${team.members.map((m, mi) => `<tr>
                  <td>${m.personName || '—'}</td>
                  <td>${Utils.escHtml(m.role)}</td>
                  <td><button type="button" class="row-action-btn danger" onclick="window._removeTeamMember(${ti}, ${mi})">${Utils.icon('x', 12)}</button></td>
                </tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.team-name-input').forEach(el => el.oninput = () => { teams[el.dataset.ti].name = el.value; });
    container.querySelectorAll('.team-field').forEach(el => el.oninput = () => { teams[el.dataset.ti][el.dataset.k] = el.value; });
  }

  Utils.el('btn-add-team').onclick = () => {
    teamCounter++;
    teams.push({ id: Date.now(), name: `צוות ${String.fromCharCode(1488 + teamCounter)}`, members: [], outDate: '', outTime: '', returnDate: '', returnTime: '' });
    renderTeams();
  };

  window._removeTeam = (ti) => { teams.splice(ti, 1); renderTeams(); };

  window._addTeamMember = (ti) => {
    Modal.open({
      title: 'הוסף חבר צוות',
      body: `
        <div class="form-group">
          <label class="form-label">אדם</label>
          <select id="tm-person" class="form-control">
            <option value="">בחר אדם</option>
            ${people.map(p => `<option value="${p.id}">${Utils.escHtml(p.firstName + ' ' + p.lastName + ' — ' + p.militaryNumber)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">תפקיד</label>
          <input id="tm-role" class="form-control" placeholder="תצפיתן, נהג, מפקד...">
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>
        <button class="btn btn-primary" onclick="window._confirmAddMember(${ti})">הוסף</button>
      `,
    });
  };

  window._confirmAddMember = (ti) => {
    const personId = Utils.el('tm-person').value;
    const role = Utils.el('tm-role').value || 'חבר צוות';
    if (!personId) { Toast.error('יש לבחור אדם'); return; }
    const person = people.find(p => p.id === personId);
    teams[ti].members.push({ personId, personName: person ? person.firstName + ' ' + person.lastName : '', role });
    Modal.close();
    renderTeams();
  };

  window._removeTeamMember = (ti, mi) => { teams[ti].members.splice(mi, 1); renderTeams(); };

  // Spots
  Utils.el('btn-add-spot').onclick = () => {
    spots.push({ address: '', type: '' });
    renderSpots();
  };

  function renderSpots() {
    const container = Utils.el('spots-container');
    if (!spots.length) { container.innerHTML = '<div style="color:var(--color-text-muted);font-size:var(--font-size-sm)">לא הוגדרו נקודות כיסוי</div>'; return; }
    container.innerHTML = spots.map((s, i) => `
      <div class="dynamic-list-item">
        <div class="dynamic-list-item-num">${i + 1}</div>
        <div class="dynamic-list-item-body" style="display:flex;gap:8px">
          <input class="form-control spot-address" data-idx="${i}" value="${Utils.escHtml(s.address)}" placeholder="כתובת / מיקום" style="flex:2">
          <input class="form-control spot-type" data-idx="${i}" value="${Utils.escHtml(s.type)}" placeholder="סוג כיסוי" style="flex:1">
        </div>
        <button type="button" class="dynamic-list-item-remove" data-idx="${i}">${Utils.icon('x', 14)}</button>
      </div>
    `).join('');
    container.querySelectorAll('.spot-address').forEach(el => el.oninput = () => { spots[el.dataset.idx].address = el.value; });
    container.querySelectorAll('.spot-type').forEach(el => el.oninput = () => { spots[el.dataset.idx].type = el.value; });
    container.querySelectorAll('.dynamic-list-item-remove').forEach(b => b.onclick = () => { spots.splice(Number(b.dataset.idx), 1); renderSpots(); });
  }

  renderTeams();

  // Save
  Utils.el('btn-save').onclick = () => {
    const form = Utils.el('surv-form');
    const fd = new FormData(form);
    const data = {};
    fd.forEach((v, k) => { data[k] = v; });

    if (data.endTime && data.endTime < data.startTime) { Toast.error('שעת הסיום לא יכולה להיות לפני שעת ההתחלה'); return; }
    const badTeam = teams.find(t => (t.returnDate && t.outDate && t.returnDate < t.outDate)); if (badTeam) { Toast.error('תאריך חזרה לפני תאריך יציאה בצוות ' + badTeam.name); return; }
    if (!data.date || !data.startTime || !data.location || !data.objective) {
      Toast.error('יש למלא שדות חובה');
      return;
    }

    const equipment = EQUIPMENT_TYPES.filter(eq => data['equip_' + eq.id]).map(eq => eq.label);

    const activity = {
      id: 'sv_' + Utils.generateId(),
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime || '',
      location: data.location,
      objective: data.objective,
      number: activityNumber,
      riskLevel: data.priority || '',
      priority: data.priority || '',
      deserters,
      commander: data.commander || '',
      authorizedBy: data.authorizedBy || '',
      notes: data.notes || '',
      deserterFileId: data.deserterFileId || null,
      teams: teams.map(t => ({ name: t.name, members: t.members, outDate: t.outDate, outTime: t.outTime, returnDate: t.returnDate, returnTime: t.returnTime })),
      coverageSpots: spots,
      equipment,
      status: data.status || 'planned',
      baseId: (AppState.get('currentBase') || {}).id || 'b708',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    Storage.upsert(Storage.KEYS.SURVEILLANCE_ACTIVITIES, activity);
    Audit.log({ module: 'investigation', action: 'create', entityType: 'surveillance', entityId: activity.id, description: `יצירת פעילות מעקב — ${data.location}` });
    Toast.success('פעילות המעקב נשמרה');

    if (deserterFileId) {
      Router.navigate('/deserter-file', { id: deserterFileId });
    } else {
      Router.navigate('/deserter-retrieval');
    }
  };
};
