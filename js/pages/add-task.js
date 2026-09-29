/* add-task.js — add task form */
'use strict';

window.Pages = window.Pages || {};

Pages['add-task'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.can('createTask')) { content.innerHTML = EmptyState.accessDenied(); return; }

  const user = Auth.getCurrentUser();
  let participants = [];
  let equipment = [];

  const taskNum = 'TSK-' + String(Math.floor(Math.random() * 9000) + 1000);
  const people = Storage.getCollection(Storage.KEYS.PEOPLE);
  // commander is chosen from people assigned to the current base (not system users)
  const curBase = AppState.get('currentBase');
  const basePeople = curBase ? people.filter(p => p.baseId === curBase.id) : people;

  content.innerHTML = `
    <div class="page-wrapper">
      ${Utils.pageHeader('הוספת משימה חדשה', Utils.pageMeta())}

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
        <span style="font-size:13px;color:var(--color-text-muted)">מספר משימה: <strong>${Utils.escHtml(taskNum)}</strong></span>
        <button class="btn btn-secondary" style="margin-right:auto" onclick="Router.navigate('/tasks')">ביטול</button>
        <button class="btn btn-primary" id="btn-save">שמור משימה</button>
      </div>

      <form id="task-form">
        <div class="page-section">
          <div class="section-header"><div class="section-title">סוג משימה</div></div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">סוג משימה <span class="required">*</span></label>
              <select name="taskCategory" id="task-category" class="form-control" required>
                <option value="">בחר סוג משימה</option>
                <option value="operational">מבצעי</option>
                <option value="administrative">מנהלתי</option>
              </select>
            </div>
          </div>
        </div>

        <div class="page-section" id="task-details-section">
          <div class="section-header"><div class="section-title">פרטי המשימה</div></div>
          <div class="form-row form-row-3">
            <div class="form-group" style="grid-column:1/3">
              <label class="form-label">שם המשימה <span class="required">*</span></label>
              <input name="name" class="form-control" required placeholder="שם תיאורי של המשימה">
            </div>
            <div class="form-group">
              <label class="form-label">עדיפות</label>
              <select name="priority" class="form-control">
                ${PRIORITIES.map(p => `<option value="${p.id}" ${p.id === 'medium' ? 'selected' : ''}>${Utils.escHtml(p.label)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">תת-סוג <span class="required">*</span></label>
              <select name="taskType" class="form-control" required>
                <option value="">בחר סוג</option>
                ${TASK_TYPES.map(t => `<option value="${t.id}">${Utils.escHtml(t.label)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">תאריך <span class="required">*</span></label>
              <input type="date" name="date" class="form-control" value="${Utils.today()}" required>
            </div>
            <div class="form-group">
              <label class="form-label">שעה</label>
              <input type="time" name="time" class="form-control">
            </div>
            <div class="form-group">
              <label class="form-label">סטטוס</label>
              <select name="status" class="form-control">
                ${TASK_STATUSES.map(s => `<option value="${s.id}" ${s.id === 'planned' ? 'selected' : ''}>${Utils.escHtml(s.label)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">יחידה</label>
              <select name="assignedUnit" class="form-control">
                ${DEMO_UNITS.map(u => `<option value="${u.name}">${Utils.escHtml(u.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">מפקד <span class="required">*</span></label>
              <select name="commander" class="form-control">
                <option value="">בחר מפקד</option>
                ${basePeople.map(p => `<option value="${p.id}">${Utils.escHtml(p.firstName + ' ' + p.lastName + ' — ' + p.militaryNumber)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">תיאור <span class="required">*</span></label>
              <textarea name="description" class="form-control" rows="3" required placeholder="תיאור מפורט של המשימה..."></textarea>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">הערות</label>
              <textarea name="notes" class="form-control" rows="2"></textarea>
            </div>
          </div>
        </div>

        <!-- Participants -->
        <div class="page-section">
          <div class="section-header">
            <div class="section-title">משתתפים</div>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-participant">${Utils.icon('plus', 14)} הוסף</button>
          </div>
          <div id="participants-list">
            <div style="color:var(--color-text-muted);font-size:var(--font-size-sm)">לא נוספו משתתפים</div>
          </div>
        </div>

        <!-- Equipment -->
        <div class="page-section">
          <div class="section-header">
            <div class="section-title">ציוד</div>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-equip">${Utils.icon('plus', 14)} הוסף</button>
          </div>
          <div id="equip-list">
            <div style="color:var(--color-text-muted);font-size:var(--font-size-sm)">לא נוסף ציוד</div>
          </div>
        </div>
      </form>

      ${Utils.classificationFooter()}
    </div>
  `;

  // Participants
  Utils.el('btn-add-participant').onclick = () => {
    const idx = participants.length;
    participants.push({ personId: '' });
    renderParticipants();
  };

  function renderParticipants() {
    const el = Utils.el('participants-list');
    if (!participants.length) { el.innerHTML = '<div style="color:var(--color-text-muted);font-size:var(--font-size-sm)">לא נוספו משתתפים</div>'; return; }
    el.innerHTML = participants.map((p, i) => `
      <div class="dynamic-list-item">
        <div class="dynamic-list-item-num">${i + 1}</div>
        <div class="dynamic-list-item-body">
          <select class="form-control participant-select" data-idx="${i}" style="max-width:320px">
            <option value="">בחר אדם</option>
            ${people.map(pp => `<option value="${pp.id}" ${p.personId === pp.id ? 'selected' : ''}>${Utils.escHtml(pp.firstName + ' ' + pp.lastName + ' — ' + pp.militaryNumber)}</option>`).join('')}
          </select>
        </div>
        <button type="button" class="dynamic-list-item-remove" data-idx="${i}">${Utils.icon('x', 14)}</button>
      </div>
    `).join('');
    el.querySelectorAll('.participant-select').forEach(s => s.onchange = () => { participants[s.dataset.idx].personId = s.value; });
    el.querySelectorAll('.dynamic-list-item-remove').forEach(b => b.onclick = () => { participants.splice(Number(b.dataset.idx), 1); renderParticipants(); });
  }

  // Equipment
  Utils.el('btn-add-equip').onclick = () => {
    equipment.push({ type: '', quantity: 1, equipmentId: '' });
    renderEquipment();
  };

  function renderEquipment() {
    const el = Utils.el('equip-list');
    if (!equipment.length) { el.innerHTML = '<div style="color:var(--color-text-muted);font-size:var(--font-size-sm)">לא נוסף ציוד</div>'; return; }
    el.innerHTML = equipment.map((eq, i) => `
      <div class="dynamic-list-item">
        <div class="dynamic-list-item-num">${i + 1}</div>
        <div class="dynamic-list-item-body" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <select class="form-control equip-type" data-idx="${i}" style="width:200px">
            <option value="">בחר ציוד</option>
            ${EQUIPMENT_TYPES.map(t => `<option value="${t.id}" ${eq.type === t.id ? 'selected' : ''}>${Utils.escHtml(t.label)}</option>`).join('')}
          </select>
          <input type="number" class="form-control equip-qty" data-idx="${i}" value="${eq.quantity}" min="1" style="width:80px" placeholder="כמות">
          <input type="text" class="form-control equip-id" data-idx="${i}" value="${Utils.escHtml(eq.equipmentId || '')}" style="width:160px" placeholder="מזהה ציוד *" required>
        </div>
        <button type="button" class="dynamic-list-item-remove" data-idx="${i}">${Utils.icon('x', 14)}</button>
      </div>
    `).join('');
    el.querySelectorAll('.equip-type').forEach(s => s.onchange = () => { equipment[s.dataset.idx].type = s.value; });
    el.querySelectorAll('.equip-qty').forEach(s => s.onchange = () => { equipment[s.dataset.idx].quantity = parseInt(s.value) || 1; });
    el.querySelectorAll('.equip-id').forEach(s => s.oninput = () => { equipment[s.dataset.idx].equipmentId = s.value; });
    el.querySelectorAll('.dynamic-list-item-remove').forEach(b => b.onclick = () => { equipment.splice(Number(b.dataset.idx), 1); renderEquipment(); });
  }

  function showFieldError(name, message) {
    const el = document.querySelector(`[name="${name}"]`);
    if (!el) return;
    el.style.borderColor = 'var(--color-danger)';
    let err = el.parentNode.querySelector('.field-error');
    if (!err) { err = document.createElement('div'); err.className = 'field-error'; err.style.cssText = 'color:var(--color-danger);font-size:var(--font-size-xs);margin-top:4px'; el.parentNode.appendChild(err); }
    err.textContent = message;
  }

  function clearFieldErrors() {
    document.querySelectorAll('[name]').forEach(el => { el.style.borderColor = ''; });
    document.querySelectorAll('.field-error').forEach(el => el.remove());
  }

  // Save
  Utils.el('btn-save').onclick = () => {
    const form = Utils.el('task-form');
    const fd = new FormData(form);
    const data = {};
    fd.forEach((v, k) => { data[k] = v; });

    clearFieldErrors();
    let firstInvalid = null;
    if (!data.name || !data.name.trim()) {
      showFieldError('name', 'שדה חובה — יש להזין שם משימה');
      firstInvalid = firstInvalid || document.querySelector('[name="name"]');
    }
    if (!data.taskCategory) {
      showFieldError('taskCategory', 'שדה חובה — יש לבחור מבצעי או מנהלתי');
      firstInvalid = firstInvalid || document.querySelector('[name="taskCategory"]');
    }
    if (!data.commander) {
      showFieldError('commander', 'שדה חובה — יש לבחור מפקד מתוך אנשי הבסיס');
      firstInvalid = firstInvalid || document.querySelector('[name="commander"]');
    }
    if (!data.taskType) {
      showFieldError('taskType', 'שדה חובה — יש לבחור סוג משימה');
      firstInvalid = firstInvalid || document.querySelector('[name="taskType"]');
    }
    if (!data.date) {
      showFieldError('date', 'שדה חובה — יש לבחור תאריך');
      firstInvalid = firstInvalid || document.querySelector('[name="date"]');
    }
    if (!data.description || !data.description.trim()) {
      showFieldError('description', 'שדה חובה — יש להזין תיאור');
      firstInvalid = firstInvalid || document.querySelector('[name="description"]');
    }
    const missingEquipId = equipment.some(e => !e.type || !String(e.equipmentId || '').trim());
    if (missingEquipId) {
      Toast.error('יש לבחור ציוד ולהזין מזהה ציוד לכל שורה');
      firstInvalid = firstInvalid || document.querySelector('.equip-id');
    }
    if (firstInvalid) { firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' }); firstInvalid.focus(); return; }

    const commanderPerson = people.find(p => p.id === data.commander);

    const task = {
      id: 'tsk_' + Utils.generateId(),
      taskNumber: taskNum,
      name: data.name,
      description: data.description || '',
      notes: data.notes || '',
      priority: data.priority || 'medium',
      taskCategory: data.taskCategory,
      taskType: data.taskType,
      date: data.date,
      time: data.time || '',
      status: data.status || 'planned',
      assignedUnit: data.assignedUnit || '',
      commander: data.commander || '',
      commanderName: commanderPerson ? (commanderPerson.firstName + ' ' + commanderPerson.lastName) : '',
      participants: participants.filter(p => p.personId).map(p => p.personId),
      equipment: equipment.map(e => ({ type: e.type, label: (EQUIPMENT_TYPES.find(t => t.id === e.type) || {}).label || e.type, quantity: e.quantity, id: String(e.equipmentId).trim(), equipmentId: String(e.equipmentId).trim() })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    Storage.upsert(Storage.KEYS.TASKS, task);
    Audit.log({ module: 'policing', action: 'create', entityType: 'task', entityId: task.id, description: `יצירת משימה ${taskNum}` });
    Toast.success('המשימה נוצרה בהצלחה');
    Router.navigate('/tasks');
  };
};
