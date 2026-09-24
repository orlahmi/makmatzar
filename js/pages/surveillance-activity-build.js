/* surveillance-activity-build.js — surveillance activity builder */
'use strict';

window.Pages = window.Pages || {};

Pages['surveillance-activity-build'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('investigation')) { content.innerHTML = EmptyState.accessDenied(); return; }

  const deserterFileId = query && query.deserterFileId;
  const user = Auth.getCurrentUser();
  const people = Storage.getCollection(Storage.KEYS.PEOPLE);
  let teams = [{ id: 1, name: 'צוות א', members: [] }];
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
              <label class="form-label">עדיפות</label>
              <select name="priority" class="form-control">
                ${PRIORITIES.map(p => `<option value="${p.id}" ${p.id === 'high' ? 'selected' : ''}>${Utils.escHtml(p.label)}</option>`).join('')}
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
  }

  Utils.el('btn-add-team').onclick = () => {
    teamCounter++;
    teams.push({ id: Date.now(), name: `צוות ${String.fromCharCode(1488 + teamCounter)}`, members: [] });
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
      priority: data.priority || 'high',
      commander: data.commander || '',
      authorizedBy: data.authorizedBy || '',
      notes: data.notes || '',
      deserterFileId: data.deserterFileId || null,
      teams: teams.map(t => ({ name: t.name, members: t.members })),
      coverageSpots: spots,
      equipment,
      status: 'planned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    Storage.upsert(Storage.KEYS.SURVEILLANCE, activity);
    Audit.log({ module: 'investigation', action: 'create', entityType: 'surveillance', entityId: activity.id, description: `יצירת פעילות מעקב — ${data.location}` });
    Toast.success('פעילות המעקב נשמרה');

    if (deserterFileId) {
      Router.navigate('/deserter-file', { id: deserterFileId });
    } else {
      Router.navigate('/deserter-retrieval');
    }
  };
};
