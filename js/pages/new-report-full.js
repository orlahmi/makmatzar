/* new-report-full.js — new police report form */
'use strict';

window.Pages = window.Pages || {};

Pages['new-report-full'] = function(query) {
  const content = Utils.el('page-content');
  const canCreate = Permissions.can('createReport');
  if (!canCreate) { content.innerHTML = EmptyState.accessDenied(); return; }

  const reportId = 'r_' + Utils.generateId();
  const reportNumber = 'DR-' + String(Math.floor(Math.random() * 90000) + 10000);
  const user = Auth.getCurrentUser();
  const base = AppState.get('currentBase');
  let isDirty = false;
  let witnesses = [];

  const offenseOptions = OFFENSE_CATEGORIES.map(cat => {
    const offenses = OFFENSES.filter(o => o.categoryId === cat.id);
    return `<optgroup label="${Utils.escHtml(cat.label)}">
      ${offenses.map(o => `<option value="${o.id}">${Utils.escHtml(o.code + ' — ' + o.title)}</option>`).join('')}
    </optgroup>`;
  }).join('');

  content.innerHTML = `
    <div class="page-wrapper">
      ${Utils.pageHeader('הוספת דוח חדש', Utils.pageMeta())}

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
        <span style="font-size:13px;color:var(--color-text-muted)">מספר דו"ח: <strong>${Utils.escHtml(reportNumber)}</strong></span>
        <span class="unsaved-indicator" id="unsaved-ind" style="display:none;margin-right:auto">${Utils.icon('alert', 12)} שינויים לא שמורים</span>
        <button class="btn btn-secondary" id="btn-clear" style="margin-right:auto">נקה טופס</button>
        <button class="btn btn-secondary" id="btn-draft">שמור טיוטה</button>
        <button class="btn btn-primary" id="btn-create">צור דו"ח</button>
      </div>

      <form id="new-report-form">
        <!-- Section 1: Report Identification -->
        <div class="page-section">
          <div class="section-header">
            <div class="section-title">${Utils.icon('report', 18)} פרטי הדו"ח</div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">סוג דו"ח <span class="required">*</span></label>
              <select name="reportType" class="form-control" required>
                ${REPORT_TYPES.map(t => `<option value="${t.id}">${t.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">מספר דו"ח</label>
              <input class="form-control" value="${Utils.escHtml(reportNumber)}" readonly>
            </div>
            <div class="form-group">
              <label class="form-label">בסיס</label>
              <select name="baseId" class="form-control">
                ${DEMO_BASES.map(b => `<option value="${b.id}" ${base && base.id === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">יחידת אכיפה</label>
              <select name="unitId" class="form-control">
                ${DEMO_UNITS.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">שוטר מוסר</label>
              <input class="form-control" value="${user ? Utils.escHtml(user.firstName + ' ' + user.lastName) : ''}" readonly>
            </div>
            <div class="form-group">
              <label class="form-label">סטטוס</label>
              <select name="status" class="form-control">
                <option value="draft">טיוטה</option>
                <option value="pending">ממתין</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Section 2: Accused Person -->
        <div class="page-section">
          <div class="section-header">
            <div class="section-title">${Utils.icon('user', 18)} פרטי המפר</div>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-lookup">חיפוש לפי מספר אישי</button>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">מספר אישי <span class="required">*</span></label>
              <input name="militaryNumber" id="accused-mil-num" class="form-control" placeholder="1234567" required>
            </div>
            <div class="form-group">
              <label class="form-label">ת.ז. <span class="required">*</span></label>
              <input name="nationalId" class="form-control" placeholder="012345678" required>
            </div>
            <div class="form-group">
              <label class="form-label">דרגה <span class="required">*</span></label>
              <select name="rank" class="form-control" required>
                <option value="">בחר דרגה</option>
                ${RANKS.map(r => `<option value="${r.id}">${r.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">סוג שירות <span class="required">*</span></label>
              <select name="serviceType" class="form-control" required>
                ${SERVICE_TYPES.map(s => `<option value="${s.id}">${s.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">שם פרטי <span class="required">*</span></label>
              <input name="firstName" class="form-control" required>
            </div>
            <div class="form-group">
              <label class="form-label">שם משפחה <span class="required">*</span></label>
              <input name="lastName" class="form-control" required>
            </div>
            <div class="form-group">
              <label class="form-label">חיל <span class="required">*</span></label>
              <select name="corps" class="form-control" required>
                <option value="">בחר חיל</option>
                ${CORPS_LIST.map(c => `<option value="${Utils.escHtml(c)}">${Utils.escHtml(c)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">יחידה <span class="required">*</span></label>
              <select name="unitPerson" class="form-control" required>
                <option value="">בחר יחידה</option>
                ${DEMO_UNITS.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">טלפון <span class="required">*</span></label>
              <input name="phone" class="form-control" placeholder="052-1234567" required>
            </div>
            <div class="form-group">
              <label class="form-label">עיר <span class="required">*</span></label>
              <input name="city" class="form-control" required>
            </div>
            <div class="form-group">
              <label class="form-label">רחוב <span class="required">*</span></label>
              <input name="street" class="form-control" required>
            </div>
            <div class="form-group">
              <label class="form-label">מספר בית <span class="required">*</span></label>
              <input name="houseNumber" class="form-control" required>
            </div>
          </div>
        </div>

        <!-- Section 3: Time & Location -->
        <div class="page-section">
          <div class="section-header">
            <div class="section-title">${Utils.icon('calendar', 18)} זמן ומיקום העבירה</div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">תאריך <span class="required">*</span></label>
              <input type="date" name="date" class="form-control" value="${Utils.today()}" required>
            </div>
            <div class="form-group">
              <label class="form-label">שעה <span class="required">*</span></label>
              <input type="time" name="time" class="form-control" required>
            </div>
            <div class="form-group">
              <label class="form-label">עיר <span class="required">*</span></label>
              <input name="locationCity" class="form-control" required>
            </div>
            <div class="form-group">
              <label class="form-label">כביש / רחוב <span class="required">*</span></label>
              <input name="locationRoad" class="form-control" required>
            </div>
            <div class="form-group">
              <label class="form-label">צומת / נקודת ציון <span class="required">*</span></label>
              <input name="locationJunction" class="form-control" required>
            </div>
            <div class="form-group">
              <label class="form-label">מיקום מדויק <span class="required">*</span></label>
              <input name="locationExact" class="form-control" required>
            </div>
          </div>
        </div>

        <!-- Section 4: Offense Details -->
        <div class="page-section">
          <div class="section-header">
            <div class="section-title">${Utils.icon('alert', 18)} פרטי העבירה</div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">קטגוריית עבירה <span class="required">*</span></label>
              <select name="offenseCategory" class="form-control" id="offense-category">
                <option value="">בחר קטגוריה</option>
                ${OFFENSE_CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">עבירה <span class="required">*</span></label>
              <select name="offenseId" class="form-control" id="offense-select" required>
                <option value="">בחר עבירה</option>
                ${offenseOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">חומרה</label>
              <select name="severity" class="form-control">
                <option value="low">קלה</option>
                <option value="medium" selected>בינונית</option>
                <option value="high">חמורה</option>
                <option value="critical">קריטית</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">נקודות</label>
              <input type="number" name="points" class="form-control" id="offense-points" min="0" value="0">
            </div>
            <div class="form-group">
              <label class="form-label">קנס (₪)</label>
              <input type="number" name="fine" class="form-control" id="offense-fine" min="0" value="0">
            </div>
            <div class="form-group">
              <label class="form-label">מסגרת אכיפה</label>
              <input name="enforcementFramework" class="form-control">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">תיאור מפורט <span class="required">*</span></label>
            <textarea name="description" class="form-control" rows="4" required placeholder="תאר בפירוט את העבירה..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">הערות שוטר</label>
            <textarea name="officerNotes" class="form-control" rows="2"></textarea>
          </div>
        </div>

        <!-- Section 5: Delivery -->
        <div class="page-section">
          <div class="section-header">
            <div class="section-title">${Utils.icon('report', 18)} מסירת הדו"ח</div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">שיטת מסירה</label>
              <select name="deliveryMethod" class="form-control">
                ${DELIVERY_METHODS.map(d => `<option value="${d.id}">${d.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">תאריך מסירה</label>
              <input type="date" name="deliveryDate" class="form-control" value="${Utils.today()}">
            </div>
            <div class="form-group">
              <label class="form-label">מקבל</label>
              <input name="deliveryRecipient" class="form-control">
            </div>
            <div class="form-group">
              <label class="form-label">
                <input type="checkbox" name="refuseToSign" class="form-check-input" style="margin-left:6px">
                סירב לחתום
              </label>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">הערות</label>
              <input name="deliveryRemarks" class="form-control">
            </div>
          </div>
        </div>

        <!-- Section 6: Witnesses -->
        <div class="page-section">
          <div class="section-header">
            <div class="section-title">${Utils.icon('users', 18)} עדים</div>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-witness">${Utils.icon('plus', 14)} הוסף עד</button>
          </div>
          <div id="witnesses-list">
            <div style="padding:var(--space-4);text-align:center;color:var(--color-text-muted)">לא נוספו עדים</div>
          </div>
        </div>

        <!-- Form errors -->
        <div id="form-errors" style="display:none" class="form-error-summary">
          <div class="form-error-summary-title">יש לתקן את השגיאות הבאות:</div>
          <ul id="error-list"></ul>
        </div>
      </form>

      ${Utils.classificationFooter()}
    </div>
  `;

  // Mark dirty on changes
  Utils.el('new-report-form').addEventListener('change', () => {
    isDirty = true;
    Utils.show('unsaved-ind');
    AppState.set('unsavedChanges', true);
  });

  // Offense auto-fill
  Utils.el('offense-select').addEventListener('change', () => {
    const offenseId = Utils.el('offense-select').value;
    const offense = OFFENSE_MAP[offenseId];
    if (offense) {
      Utils.el('offense-points').value = offense.points;
      Utils.el('offense-fine').value = offense.fine;
    }
  });

  // Lookup person
  Utils.el('btn-lookup').onclick = () => {
    const milNum = Utils.el('accused-mil-num').value.trim();
    if (!milNum) { Toast.warning('הכנס מספר אישי לחיפוש'); return; }
    const people = Storage.getCollection(Storage.KEYS.PEOPLE);
    const person = people.find(p => p.militaryNumber === milNum);
    if (!person) { Toast.info('לא נמצא אדם עם מספר אישי זה'); return; }

    const form = Utils.el('new-report-form');
    if (form.nationalId) form.nationalId.value = person.nationalId;
    if (form.firstName) form.firstName.value = person.firstName;
    if (form.lastName) form.lastName.value = person.lastName;
    if (form.phone) form.phone.value = person.phone || '';
    Toast.success('פרטי האדם נטענו');
  };

  // Add witness
  Utils.el('btn-add-witness').onclick = () => {
    const idx = witnesses.length;
    witnesses.push({ id: idx, militaryNumber: '', name: '', phone: '', role: 'עד' });
    renderWitnesses();
  };

  function renderWitnesses() {
    const container = Utils.el('witnesses-list');
    if (!witnesses.length) {
      container.innerHTML = '<div style="padding:var(--space-4);text-align:center;color:var(--color-text-muted)">לא נוספו עדים</div>';
      return;
    }
    container.innerHTML = witnesses.map((w, i) => `
      <div class="dynamic-list-item">
        <div class="dynamic-list-item-num">${i + 1}</div>
        <div class="dynamic-list-item-body">
          <div class="form-row form-row-3">
            <div class="form-group"><label class="form-label">מ"א</label><input class="form-control witness-milnum" data-idx="${i}" value="${Utils.escHtml(w.militaryNumber)}" placeholder="1234567"></div>
            <div class="form-group"><label class="form-label">שם</label><input class="form-control witness-name" data-idx="${i}" value="${Utils.escHtml(w.name)}"></div>
            <div class="form-group"><label class="form-label">טלפון</label><input class="form-control witness-phone" data-idx="${i}" value="${Utils.escHtml(w.phone)}"></div>
            <div class="form-group"><label class="form-label">תפקיד</label><input class="form-control witness-role" data-idx="${i}" value="${Utils.escHtml(w.role)}"></div>
          </div>
        </div>
        <button type="button" class="dynamic-list-item-remove" data-idx="${i}">${Utils.icon('x', 16)}</button>
      </div>
    `).join('');

    // Update witness data on change
    container.querySelectorAll('.witness-milnum').forEach(el => el.oninput = () => { witnesses[el.dataset.idx].militaryNumber = el.value; });
    container.querySelectorAll('.witness-name').forEach(el => el.oninput = () => { witnesses[el.dataset.idx].name = el.value; });
    container.querySelectorAll('.witness-phone').forEach(el => el.oninput = () => { witnesses[el.dataset.idx].phone = el.value; });
    container.querySelectorAll('.witness-role').forEach(el => el.oninput = () => { witnesses[el.dataset.idx].role = el.value; });
    container.querySelectorAll('.dynamic-list-item-remove').forEach(el => {
      el.onclick = () => { witnesses.splice(Number(el.dataset.idx), 1); renderWitnesses(); };
    });
  }

  // Clear form
  Utils.el('btn-clear').onclick = async () => {
    if (isDirty) {
      const ok = await Modal.confirm({ title: 'נקה טופס', message: 'כל הנתונים שהוזנו יימחקו. האם להמשיך?', type: 'danger' });
      if (!ok) return;
    }
    Utils.el('new-report-form').reset();
    witnesses = [];
    renderWitnesses();
    isDirty = false;
    Utils.hide('unsaved-ind');
    AppState.set('unsavedChanges', false);
    Toast.info('הטופס נוקה');
  };

  // Save draft
  Utils.el('btn-draft').onclick = () => saveReport('draft');

  // Create report
  Utils.el('btn-create').onclick = () => saveReport('pending');

  function getFormData() {
    const form = Utils.el('new-report-form');
    const fd = new FormData(form);
    const data = {};
    fd.forEach((v, k) => { data[k] = v; });
    return data;
  }

  const REQUIRED_FIELDS = [
    // פרטי המפר
    { name: 'militaryNumber', label: 'מספר אישי' },
    { name: 'nationalId', label: 'ת.ז.' },
    { name: 'rank', label: 'דרגה' },
    { name: 'serviceType', label: 'סוג שירות' },
    { name: 'firstName', label: 'שם פרטי' },
    { name: 'lastName', label: 'שם משפחה' },
    { name: 'corps', label: 'חיל' },
    { name: 'unitPerson', label: 'יחידה' },
    { name: 'phone', label: 'טלפון' },
    { name: 'city', label: 'עיר (פרטי המפר)' },
    { name: 'street', label: 'רחוב' },
    { name: 'houseNumber', label: 'מספר בית' },
    // זמן ומיקום העבירה
    { name: 'date', label: 'תאריך' },
    { name: 'time', label: 'שעה' },
    { name: 'locationCity', label: 'עיר (מיקום העבירה)' },
    { name: 'locationRoad', label: 'כביש / רחוב' },
    { name: 'locationJunction', label: 'צומת / נקודת ציון' },
    { name: 'locationExact', label: 'מיקום מדויק' },
    // פרטי העבירה
    { name: 'offenseId', label: 'עבירה' },
    { name: 'description', label: 'תיאור מפורט' },
  ];

  function validate(data) {
    const errors = [];
    const form = Utils.el('new-report-form');
    let firstInvalidField = null;

    REQUIRED_FIELDS.forEach(({ name, label }) => {
      const field = form.querySelector('[name="' + name + '"]');
      if (!data[name]) {
        errors.push(`${label} הוא שדה חובה`);
        if (field) {
          Validation.showFieldError(field, 'שדה חובה');
          if (!firstInvalidField) firstInvalidField = field;
        }
      } else if (field) {
        Validation.clearFieldError(field);
      }
    });

    if (data.militaryNumber && !Utils.isValidMilNum(data.militaryNumber)) {
      errors.push('מספר אישי לא תקין (7-8 ספרות)');
      const field = form.querySelector('[name="militaryNumber"]');
      if (field) {
        Validation.showFieldError(field, Validation.MESSAGES.milNum);
        if (!firstInvalidField) firstInvalidField = field;
      }
    }

    return { errors, firstInvalidField };
  }

  function saveReport(status) {
    const data = getFormData();
    data.status = status;

    if (status !== 'draft') {
      const { errors, firstInvalidField } = validate(data);
      if (errors.length) {
        const errDiv = Utils.el('form-errors');
        const errList = Utils.el('error-list');
        errDiv.style.display = 'block';
        errList.innerHTML = errors.map(e => `<li>${Utils.escHtml(e)}</li>`).join('');
        if (firstInvalidField) {
          firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstInvalidField.focus();
        } else {
          errDiv.scrollIntoView({ behavior: 'smooth' });
        }
        Toast.error('יש למלא את כל שדות החובה לפני השמירה');
        return;
      }
    }

    const offense = OFFENSE_MAP[data.offenseId];
    const report = {
      id: reportId,
      reportNumber,
      reportType: data.reportType || 'dmash',
      date: data.date || Utils.today(),
      time: data.time || '',
      baseId: data.baseId || (base ? base.id : 'b100'),
      unitId: data.unitId || 'u01',
      officerId: user ? user.id : '',
      officerName: user ? user.firstName + ' ' + user.lastName : '',
      personId: null,
      militaryNumber: data.militaryNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      offenseId: data.offenseId,
      offenseTitle: offense ? offense.title : '',
      status: data.status,
      description: data.description || '',
      officerNotes: data.officerNotes || '',
      severity: data.severity || 'medium',
      points: parseInt(data.points) || 0,
      fine: parseFloat(data.fine) || 0,
      deliveryMethod: data.deliveryMethod || 'hand',
      deliveryDate: data.deliveryDate || null,
      location: data.locationExact || data.locationCity || '',
      witnesses,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    Storage.upsert(Storage.KEYS.POLICE_REPORTS, report);
    Audit.log({
      module: 'policing',
      entityType: 'policeReport',
      entityId: reportId,
      action: 'create',
      description: `יצירת דו"ח שוטר ${reportNumber} (${data.status === 'draft' ? 'טיוטה' : 'ממתין'})`,
    });

    AppState.set('unsavedChanges', false);
    isDirty = false;

    if (status === 'draft') {
      Toast.success('הטיוטה נשמרה בהצלחה');
    } else {
      Toast.success('הדו"ח נוצר בהצלחה');
      Router.navigate('/officer-report-form', { id: reportId });
    }
  }
};
