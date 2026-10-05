/* new-deserter-file.js — פתיחת תיק עריק (full-page creation; fields mirror the deserter file) */
'use strict';

window.Pages = window.Pages || {};

Pages['new-deserter-file'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.can('createDeserterFile')) { content.innerHTML = EmptyState.accessDenied(); return; }

  const people = Storage.getCollection(Storage.KEYS.PEOPLE);
  const user = Auth.getCurrentUser();
  const curBase = AppState.get('currentBase');
  const state = { addresses: [], pastDesertions: [], treatmentBases: [], activities: [] };
  let person = null;

  const fld = (id, label, type, val, req, extra) => `<div class="form-group"><label class="form-label">${label}${req ? ' <span class="required">*</span>' : ''}</label><input id="${id}" type="${type || 'text'}" class="form-control" value="${Utils.escHtml(val == null ? '' : String(val))}" ${extra || ''}></div>`;
  const ro = (id, label) => fld(id, label, 'text', '', false, 'readonly');
  const section = (title, icon, body, extra) => `<div class="page-section"><div class="section-header"><div class="section-title">${Utils.icon(icon, 18)} ${title}</div>${extra || ''}</div>${body}</div>`;

  // dynamic table sections: key, columns [field,label,type]
  const TABLES = {
    addresses: { title: 'כתובות', cols: [['address', 'כתובת', 'text'], ['registeredAt', 'תאריך רישום בכתובת', 'date'], ['type', 'סוג', 'text'], ['city', 'יישוב', 'text'], ['source', 'מקור הכתובת', 'text'], ['zip', 'מיקוד', 'text']], req: ['address'] },
    pastDesertions: { title: 'עריקויות בעבר', cols: [['startDate', 'תאריך יציאה לעריקות', 'date'], ['status', 'סטטוס', 'text']], req: ['startDate'] },
    treatmentBases: { title: 'בסיסי טיפול', cols: [['baseName', 'בסיס מטפל', 'text'], ['transferredBy', 'הועבר לטיפול ע״י', 'text'], ['transferDate', 'תאריך העברה', 'date'], ['endDate', 'תאריך סיום טיפול', 'date'], ['baseType', 'סוג בסיס', 'text']], req: ['baseName'] },
    activities: { title: 'פעילויות (מידע ראשוני)', cols: [['date', 'תאריך', 'date'], ['baseName', 'בסיס מטפל', 'text'], ['results', 'תוצאות טיפול', 'text']], req: ['date'] },
  };

  function tableSection(key) {
    const t = TABLES[key];
    return section(t.title, 'report', `<div id="tbl-${key}"></div>`,
      `<button type="button" class="btn btn-secondary btn-sm" data-add="${key}">${Utils.icon('plus', 14)} הוסף</button>`);
  }
  function renderTable(key) {
    const t = TABLES[key]; const rows = state[key]; const box = Utils.el('tbl-' + key);
    if (!rows.length) { box.innerHTML = '<div class="empty-state-desc">לא הוזנו רשומות (אופציונלי). לחץ על "הוסף".</div>'; return; }
    box.innerHTML = rows.map((r, i) => `<div class="dynamic-list-item"><div class="dynamic-list-item-num">${i + 1}</div><div class="dynamic-list-item-body"><div class="form-row form-row-3">
      ${t.cols.map(([f, l, ty]) => `<div class="form-group"><label class="form-label">${l}${t.req.includes(f) ? ' <span class="required">*</span>' : ''}</label><input type="${ty}" class="form-control" data-t="${key}" data-i="${i}" data-f="${f}" value="${Utils.escHtml(r[f] || '')}"></div>`).join('')}
      </div></div><button type="button" class="dynamic-list-item-remove" data-rm="${key}" data-i="${i}">${Utils.icon('x', 16)}</button></div>`).join('');
    box.querySelectorAll('[data-t]').forEach(el => el.oninput = () => { state[el.dataset.t][el.dataset.i][el.dataset.f] = el.value; });
    box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { state[b.dataset.rm].splice(Number(b.dataset.i), 1); renderTable(b.dataset.rm); });
  }

  content.innerHTML = `
    <div class="page-wrapper">
      ${Utils.pageHeader('פתיחת תיק עריק', Utils.pageMeta())}
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
        <span style="font-size:12px;color:var(--color-text-muted)"><span class="required">*</span> שדות חובה</span>
        <button class="btn btn-secondary" style="margin-right:auto" id="nd-cancel">ביטול</button>
        <button class="btn btn-primary" id="nd-save">פתח תיק עריק</button>
      </div>
      <div id="nd-dup" class="form-error-summary" style="display:none"></div>
      <form id="nd-form" novalidate>
        ${section('פרטים אישיים', 'user', `
          <div class="form-row form-row-3">
            <div class="form-group"><label class="form-label">מספר אישי <span class="required">*</span></label>
              <div style="display:flex;gap:6px"><input id="nd-mil" class="form-control" placeholder="מספר אישי"><button type="button" class="btn btn-secondary btn-sm" id="nd-lookup">${Utils.icon('search', 13)} חיפוש</button></div></div>
            ${ro('nd-first', 'שם פרטי')}${ro('nd-last', 'שם משפחה')}
            ${ro('nd-nid', 'ת.ז.')}${ro('nd-birth', 'תאריך לידה')}${ro('nd-gender', 'מין')}
            ${ro('nd-rank', 'דרגה')}${ro('nd-unit', 'יחידה')}${ro('nd-phone', 'טלפון')}
          </div>
          <p style="font-size:12px;color:var(--color-text-muted)">פרטי הזיהוי נשלפים ממאגר האנשים ואינם מועתקים לתיק.</p>`)}
        ${section('סוג וסימונים', 'alert', `
          <div class="form-row form-row-3">
            <div class="form-group"><label class="form-label">סוג <span class="required">*</span></label>
              <select id="nd-type" class="form-control"><option value="">בחר</option><option value="deserter">עריק</option><option value="shirker">משתמט</option></select></div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px 22px;margin-top:6px">
            ${[['hametz', 'עריק חמץ'], ['requiresArrest', 'נדרש מעצר'], ['escapedArrest', 'ברח ממעצר'], ['haredi', 'חרדי']].map(([k, l]) => `<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" class="nd-flag" data-k="${k}"> ${l}</label>`).join('')}
          </div>`)}
        ${section('נתוני העריקה / השתמטות', 'calendar', `
          <div class="form-row form-row-3">
            ${fld('nd-start', 'עריק מתאריך', 'date', Utils.today(), true)}
            ${fld('nd-open', 'תאריך פתיחת תיק', 'date', Utils.today(), true)}
            ${fld('nd-mitav', 'תאריך אישור מיטב', 'date', '', false)}
            <div class="form-group"><label class="form-label">מספר ימי עריקות</label><input id="nd-days" class="form-control" readonly value="0"></div>
            ${fld('nd-lastloc', 'מיקום אחרון ידוע', 'text', '', false)}
          </div>`)}
        ${section('טיפול', 'report', `
          <div class="form-row form-row-3">
            <div class="form-group"><label class="form-label">בסיס שיטור מטפל <span class="required">*</span></label>
              <select id="nd-base" class="form-control"><option value="">בחר</option>${DEMO_BASES.map(b => `<option value="${b.id}" ${(curBase || {}).id === b.id ? 'selected' : ''}>${Utils.escHtml(b.shortName)}</option>`).join('')}</select></div>
            ${fld('nd-assignee', 'גורם מטפל', 'text', user ? user.firstName + ' ' + user.lastName : '', false)}
          </div>`)}
        ${tableSection('addresses')}
        ${tableSection('pastDesertions')}
        ${tableSection('treatmentBases')}
        ${section('נתוני המעצר (אם רלוונטי בפתיחה)', 'alert', `
          <div class="form-row form-row-3">
            ${fld('ar-approver', 'מאשר פק׳ המעצר')}${fld('ar-date', 'בתאריך', 'date')}${fld('ar-time', 'בשעה', 'time')}
            ${fld('ar-place', 'במקום')}${fld('ar-station', 'תחנת מ״י')}${fld('ar-reason', 'סיבת מעצר מ״י')}
            ${fld('ar-prison', 'הועבר לכלא')}${fld('ar-by', 'עודכן ע״י')}${fld('ar-auto', 'הזנה אוטומטית בימ״ס')}
          </div>`)}
        ${tableSection('activities')}
        ${section('הערות', 'report', `<div class="form-group"><textarea id="nd-notes" class="form-control" rows="3"></textarea></div>`)}
        <div id="nd-errors" class="form-error-summary" style="display:none"></div>
      </form>
      ${Utils.classificationFooter()}
    </div>`;

  Object.keys(TABLES).forEach(renderTable);
  content.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { state[b.dataset.add].push({}); renderTable(b.dataset.add); });
  Utils.el('nd-cancel').onclick = () => Router.navigate('/deserter-retrieval');

  const $ = Utils.el;
  const updateDays = () => { const s = $('nd-start').value; $('nd-days').value = s ? Math.max(0, Utils.daysBetween(s, Utils.today())) : 0; };
  $('nd-start').addEventListener('change', updateDays); updateDays();

  function showDup(existing) {
    const box = $('nd-dup');
    box.innerHTML = `לאדם זה כבר קיים תיק עריק פעיל (${Utils.escHtml(existing.fileNumber || existing.id)}). לא ניתן לפתוח תיק נוסף. <button type="button" class="btn btn-secondary btn-sm" id="nd-open-existing">פתח את התיק הקיים</button>`;
    box.style.display = 'block';
    $('nd-open-existing').onclick = () => Router.navigate('/deserter-file', { id: existing.id });
  }
  const activeFor = pid => Storage.getCollection(Storage.KEYS.DESERTER_FILES).find(f => f.personId === pid && f.status === 'active');

  $('nd-lookup').onclick = () => {
    const mil = $('nd-mil').value.trim();
    person = people.find(p => p.militaryNumber === mil) || null;
    $('nd-dup').style.display = 'none';
    ['nd-first', 'nd-last', 'nd-nid', 'nd-birth', 'nd-gender', 'nd-rank', 'nd-unit', 'nd-phone'].forEach(i => { $(i).value = ''; });
    if (!person) { Toast.error('לא נמצא אדם עם מספר אישי זה במאגר'); return; }
    $('nd-first').value = person.firstName; $('nd-last').value = person.lastName; $('nd-nid').value = person.nationalId || '';
    $('nd-birth').value = person.birthDate ? Utils.formatDate(person.birthDate) : ''; $('nd-gender').value = GENDER[person.gender] || '';
    $('nd-rank').value = (RANK_MAP[person.rank] || {}).label || ''; $('nd-unit').value = (DEMO_UNITS.find(u => u.id === person.unitId) || {}).name || ''; $('nd-phone').value = person.phone || '';
    const ex = activeFor(person.id); if (ex) showDup(ex); else Toast.success('פרטי האדם נטענו');
  };

  $('nd-save').onclick = () => {
    const errs = []; const mark = (id, msg) => { errs.push(msg); const e = $(id); if (e) e.style.borderColor = 'var(--color-danger)'; };
    ['nd-mil', 'nd-type', 'nd-start', 'nd-open', 'nd-base'].forEach(id => { $(id).style.borderColor = ''; });
    if (!person) mark('nd-mil', 'יש לאתר אדם לפי מספר אישי');
    if (!$('nd-type').value) mark('nd-type', 'יש לבחור סוג (עריק / משתמט)');
    if (!$('nd-start').value) mark('nd-start', 'יש להזין תאריך עריקות'); else if ($('nd-start').value > Utils.today()) mark('nd-start', 'תאריך עריקות לא יכול להיות עתידי');
    if (!$('nd-open').value) mark('nd-open', 'יש להזין תאריך פתיחת תיק'); else if ($('nd-start').value && $('nd-open').value < $('nd-start').value) mark('nd-open', 'תאריך פתיחת התיק לא יכול להיות לפני תחילת העריקות');
    if (!$('nd-base').value) mark('nd-base', 'יש לבחור בסיס שיטור מטפל');
    Object.keys(TABLES).forEach(k => state[k].forEach((r, i) => TABLES[k].req.forEach(f => { if (!String(r[f] || '').trim()) errs.push(TABLES[k].title + ' — שורה ' + (i + 1) + ': שדה חובה חסר'); })));
    if ($('ar-date').value && $('ar-date').value < $('nd-start').value) errs.push('תאריך המעצר לא יכול להיות לפני תחילת העריקות');
    const box = $('nd-errors');
    if (errs.length) { box.innerHTML = '<div class="form-error-summary-title">יש להשלים:</div><ul>' + errs.map(e => `<li>${Utils.escHtml(e)}</li>`).join('') + '</ul>'; box.style.display = 'block'; box.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    box.style.display = 'none';
    const ex = activeFor(person.id); if (ex) { showDup(ex); $('nd-dup').scrollIntoView({ behavior: 'smooth', block: 'center' }); Toast.error('כבר קיים תיק עריק פעיל לאדם זה'); return; }
    const flags = {}; content.querySelectorAll('.nd-flag').forEach(c => { flags[c.dataset.k] = c.checked; });
    const clean = arr => arr.filter(r => Object.values(r).some(v => String(v || '').trim()));
    const now = new Date().toISOString();
    const file = {
      id: 'df_' + Utils.generateId(),
      fileNumber: 'ED-' + String(Math.floor(Math.random() * 900000) + 100000),
      personId: person.id, type: $('nd-type').value, baseId: $('nd-base').value,
      openDate: $('nd-open').value, startDate: $('nd-start').value, endDate: null, status: 'active',
      mitavApprovalDate: $('nd-mitav').value || '', lastLocationKnown: $('nd-lastloc').value.trim(),
      assignedTo: $('nd-assignee').value.trim(), notes: $('nd-notes').value.trim(),
      flags, requiresArrest: !!flags.requiresArrest, escapedArrest: !!flags.escapedArrest, haredi: !!flags.haredi,
      addresses: clean(state.addresses), pastDesertions: clean(state.pastDesertions), treatmentBases: clean(state.treatmentBases), activities: clean(state.activities),
      arrest: { approver: $('ar-approver').value.trim(), date: $('ar-date').value, time: $('ar-time').value, place: $('ar-place').value.trim(), policeStation: $('ar-station').value.trim(), reason: $('ar-reason').value.trim(), transferredToPrison: $('ar-prison').value.trim(), updatedBy: $('ar-by').value.trim(), autoEntry: $('ar-auto').value.trim() },
      createdAt: now, updatedAt: now,
    };
    Storage.upsert(Storage.KEYS.DESERTER_FILES, file);
    Audit.log({ module: 'investigation', action: 'create', entityType: 'deserterFile', entityId: file.id, description: `פתיחת תיק עריק ${file.fileNumber}` });
    Toast.success('תיק העריק נפתח');
    Router.navigate('/deserter-file', { id: file.id });
  };
};
