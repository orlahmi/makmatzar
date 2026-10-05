/* new-prisoner-file.js — פתיחת תיק כלוא (full page).
   Mandatory groups: (1) personal data retrieved from the person dataset (SAP-like lookup), (2) sentence calculation.
   Everything else is optional on opening. */
'use strict';

window.Pages = window.Pages || {};

Pages['new-prisoner-file'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.can('createPrisoner')) { content.innerHTML = EmptyState.accessDenied(); return; }

  const people = Storage.getCollection(Storage.KEYS.PEOPLE);
  const curBase = AppState.get('currentBase');
  let person = null;
  const $ = Utils.el;

  const fld = (id, label, type, val, req, extra) => `<div class="form-group"><label class="form-label">${label}${req ? ' <span class="required">*</span>' : ''}</label><input id="${id}" type="${type || 'text'}" class="form-control" value="${Utils.escHtml(val == null ? '' : String(val))}" ${extra || ''}></div>`;
  const sel = (id, label, opts, selVal) => `<div class="form-group"><label class="form-label">${label}</label><select id="${id}" class="form-control"><option value="">— לא נבחר —</option>${opts.map(o => `<option value="${Utils.escHtml(o.v)}" ${o.v === selVal ? 'selected' : ''}>${Utils.escHtml(o.l)}</option>`).join('')}</select></div>`;
  const section = (title, icon, badge, body) => `<div class="page-section"><div class="section-header"><div class="section-title">${Utils.icon(icon, 18)} ${title}</div>${badge}</div>${body}</div>`;
  const MAND = '<span class="badge badge-critical">חובה</span>';
  const OPT = '<span class="badge badge-draft">אופציונלי</span>';

  content.innerHTML = `
    <div class="page-wrapper">
      ${Utils.pageHeader('פתיחת תיק כלוא', Utils.pageMeta())}
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
        <span style="font-size:12px;color:var(--color-text-muted)">חובה בפתיחה: פרטים אישיים (מהמאגר) + חישוב עונש. שאר הנתונים אופציונליים וניתן להשלימם בתיק.</span>
        <button class="btn btn-secondary" style="margin-right:auto" id="np-cancel">ביטול</button>
        <button class="btn btn-primary" id="np-save">פתח תיק כלוא</button>
      </div>
      <div id="np-dup" class="form-error-summary" style="display:none"></div>
      <form id="np-form" novalidate>
        ${section('פרטים אישיים — נשלפים ממאגר האנשים', 'user', MAND, `
          <div class="form-row form-row-3">
            <div class="form-group"><label class="form-label">מספר אישי <span class="required">*</span></label>
              <div style="display:flex;gap:6px"><input id="np-mil" class="form-control" placeholder="מספר אישי"><button type="button" class="btn btn-secondary btn-sm" id="np-lookup">${Utils.icon('search', 13)} שליפה</button></div></div>
            ${fld('np-nid', 'ת.ז.', 'text', '', true, 'data-pf="nationalId"')}
            ${fld('np-first', 'שם פרטי', 'text', '', true, 'data-pf="firstName"')}
            ${fld('np-last', 'שם משפחה', 'text', '', true, 'data-pf="lastName"')}
            ${fld('np-rank', 'דרגה', 'text', '', true, 'readonly')}
            ${fld('np-unit', 'יחידה', 'text', '', true, 'readonly')}
            ${fld('np-gender', 'מין', 'text', '', false, 'readonly')}
            ${fld('np-birth', 'תאריך לידה', 'text', '', false, 'readonly')}
            ${fld('np-phone', 'טלפון', 'text', '', false, 'data-pf="phone"')}
          </div>
          <p style="font-size:12px;color:var(--color-text-muted)">הנתונים נשלפים אוטומטית. שדה שחסר במאגר ניתן להשלמה כאן (יישמר ברשומת האדם). אין חיבור חיצוני אמיתי ל-SAP — המקור הוא מאגר ההדגמה.</p>`)}
        ${section('חישוב עונש', 'calendar', MAND, `
          <div class="form-row form-row-3">
            ${fld('np-admission', 'תאריך כניסה / קבלה', 'date', Utils.today(), true)}
            ${fld('np-sentence', 'משך העונש (ימים)', 'number', '', true, 'min="1" step="1"')}
            <div class="form-group"><label class="form-label">ת. ללא הפחתות (מחושב)</label><input id="np-noreduction" class="form-control" readonly></div>
          </div>
          <p style="font-size:12px;color:var(--color-text-muted)">הפחתות, הארכות ואירועי חישוב נוספים מתווספים בתיק הכלוא לאחר הפתיחה.</p>`)}
        ${section('פרטי כליאה וקבלה', 'prison', OPT, `
          <div class="form-row form-row-3">
            ${sel('np-type', 'סוג העצור', PRISONER_TYPES.map(t => ({ v: t, l: t })))}
            ${fld('np-time', 'שעת קבלה', 'time', '')}
            ${sel('np-base', 'בסיס מטפל', DEMO_BASES.map(b => ({ v: b.id, l: b.shortName })), (curBase || {}).id)}
            ${sel('np-company', 'פלוגה', DETENTION_COMPANIES.map(c => ({ v: c, l: c })))}
            ${sel('np-location', 'מיקום נוכחי', PRISONER_LOCATIONS.map(c => ({ v: c, l: c })))}
            ${sel('np-risk', 'רמת סיכון', RISK_LEVELS.map(r => ({ v: r.id, l: r.label })))}
            <div class="form-group" style="grid-column:1/-1"><label class="form-label">עילת מעצר / עבירה</label><input id="np-reason" class="form-control" list="np-reasons"><datalist id="np-reasons">${DETENTION_REASONS.map(r => `<option value="${Utils.escHtml(r)}">`).join('')}</datalist></div>
          </div>`)}
        ${section('פרטים אישיים נוספים', 'user', OPT, `
          <div class="form-row form-row-3">
            ${fld('np-father', 'שם האב')}${fld('np-unitphone', 'טלפון ביחידה')}${fld('np-country', 'ארץ לידה')}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px 20px;margin-top:6px">
            ${PERSONAL_FLAGS.map(([k, l]) => `<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" class="np-flag" data-k="${k}"> ${l}</label>`).join('')}
          </div>`)}
        ${section('מיון ושיבוץ ורפואה', 'alert', OPT, `
          <div class="form-row form-row-3">
            ${fld('np-placement', 'המלצה לשיבוץ')}${fld('np-profile', 'פרופיל')}${fld('np-medical', 'הערות רפואיות')}
          </div>`)}
        ${section('הערות', 'report', OPT, `<div class="form-group"><textarea id="np-notes" class="form-control" rows="3"></textarea></div>`)}
        <div id="np-errors" class="form-error-summary" style="display:none"></div>
      </form>
      ${Utils.classificationFooter()}
    </div>`;

  $('np-cancel').onclick = () => Router.navigate('/prisoner-file');

  const activeFor = pid => Storage.getCollection(Storage.KEYS.PRISONER_FILES).find(f => f.personId === pid && f.status === 'active');
  function showDup(ex) {
    const box = $('np-dup');
    box.innerHTML = `לאדם זה כבר קיים תיק כלוא פעיל (${Utils.escHtml(ex.fileNumber || ex.id)}). לא ניתן לפתוח תיק פעיל נוסף. <button type="button" class="btn btn-secondary btn-sm" id="np-open-existing">פתח את התיק הקיים</button>`;
    box.style.display = 'block'; $('np-open-existing').onclick = () => Router.navigate('/prisoner-file', { id: ex.id });
  }

  // sentence calculation preview (admission + days, no reductions) — same arithmetic as the file's calc tab
  function calcNoReduction() {
    const d = Number($('np-sentence').value), a = $('np-admission').value;
    if (!a || !Number.isInteger(d) || d < 1) { $('np-noreduction').value = ''; return null; }
    const end = Utils.addDays(a, d); $('np-noreduction').value = Utils.formatDate(end); return end;
  }
  ['np-sentence', 'np-admission'].forEach(id => $(id).addEventListener('input', calcNoReduction));

  $('np-lookup').onclick = () => {
    const mil = $('np-mil').value.trim();
    person = people.find(p => p.militaryNumber === mil) || null;
    $('np-dup').style.display = 'none';
    ['np-nid', 'np-first', 'np-last', 'np-rank', 'np-unit', 'np-gender', 'np-birth', 'np-phone'].forEach(i => { $(i).value = ''; $(i).readOnly = false; });
    $('np-rank').readOnly = $('np-unit').readOnly = $('np-gender').readOnly = $('np-birth').readOnly = true;
    if (!person) { Toast.error('לא נמצא אדם עם מספר אישי זה במאגר'); return; }
    const set = (id, v) => { $(id).value = v || ''; };
    set('np-nid', person.nationalId); set('np-first', person.firstName); set('np-last', person.lastName); set('np-phone', person.phone);
    set('np-rank', (RANK_MAP[person.rank] || {}).label); set('np-unit', (DEMO_UNITS.find(u => u.id === person.unitId) || {}).name);
    set('np-gender', GENDER[person.gender]); set('np-birth', person.birthDate ? Utils.formatDate(person.birthDate) : '');
    // values that came from the source stay locked; only missing ones are completable here
    ['np-nid', 'np-first', 'np-last', 'np-phone'].forEach(i => { $(i).readOnly = !!$(i).value && i !== 'np-phone'; });
    const ex = activeFor(person.id); if (ex) showDup(ex); else Toast.success('פרטי האדם נשלפו');
  };

  $('np-save').onclick = () => {
    const errs = []; const mark = (id, msg) => { errs.push(msg); $(id).style.borderColor = 'var(--color-danger)'; };
    ['np-mil', 'np-nid', 'np-first', 'np-last', 'np-rank', 'np-unit', 'np-admission', 'np-sentence'].forEach(id => { $(id).style.borderColor = ''; });
    if (!person) mark('np-mil', 'יש לשלוף אדם לפי מספר אישי');
    else {
      if (!$('np-nid').value.trim()) mark('np-nid', 'חסרה ת.ז. — יש להשלים');
      else if (!Utils.isValidNationalId($('np-nid').value.trim())) mark('np-nid', 'ת.ז. לא תקינה (9 ספרות)');
      if (!$('np-first').value.trim()) mark('np-first', 'חסר שם פרטי — יש להשלים');
      if (!$('np-last').value.trim()) mark('np-last', 'חסר שם משפחה — יש להשלים');
      if (!$('np-rank').value.trim()) mark('np-rank', 'חסרה דרגה בנתוני האדם');
      if (!$('np-unit').value.trim()) mark('np-unit', 'חסרה יחידה בנתוני האדם');
    }
    const adm = $('np-admission').value; const raw = $('np-sentence').value.trim(); const days = Number(raw);
    if (!adm || isNaN(new Date(adm + 'T00:00:00').getTime())) mark('np-admission', 'תאריך כניסה לא תקין');
    else if (adm > Utils.today()) mark('np-admission', 'תאריך כניסה לא יכול להיות עתידי');
    if (raw === '' || isNaN(days)) mark('np-sentence', 'יש להזין משך עונש בימים');
    else if (!Number.isInteger(days)) mark('np-sentence', 'משך העונש חייב להיות מספר שלם של ימים');
    else if (days < 1) mark('np-sentence', 'משך העונש חייב להיות גדול מאפס');
    else if (days > 36500) mark('np-sentence', 'משך העונש חורג מהטווח התקין');
    const end = (!errs.length || (adm && Number.isInteger(days) && days >= 1)) ? calcNoReduction() : null;
    if (adm && Number.isInteger(days) && days >= 1 && end && end <= adm) errs.push('תאריך סיום העונש המחושב אינו תקין');
    const box = $('np-errors');
    if (errs.length) { box.innerHTML = '<div class="form-error-summary-title">יש להשלים:</div><ul>' + errs.map(e => `<li>${Utils.escHtml(e)}</li>`).join('') + '</ul>'; box.style.display = 'block'; box.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    box.style.display = 'none';
    const ex = activeFor(person.id); if (ex) { showDup(ex); Toast.error('כבר קיים תיק כלוא פעיל לאדם זה'); return; }

    // complete missing personal data on the canonical person record (never create a second person)
    const patch = {};
    if (!person.nationalId) patch.nationalId = $('np-nid').value.trim();
    if (!person.phone && $('np-phone').value.trim()) patch.phone = $('np-phone').value.trim();
    if (Object.keys(patch).length) Storage.upsert(Storage.KEYS.PEOPLE, Object.assign({}, person, patch));

    const v = id => $(id).value.trim(); const flags = {}; content.querySelectorAll('.np-flag').forEach(c => { flags[c.dataset.k] = c.checked; });
    const now = new Date().toISOString();
    const file = Object.assign({
      id: 'pf_' + Utils.generateId(), fileNumber: 'PF-' + String(Math.floor(Math.random() * 90000) + 10000), personId: person.id,
      prisonerType: v('np-type'), intakeDate: adm, admissionDate: adm, intakeTime: v('np-time'),
      baseId: v('np-base') || (curBase ? curBase.id : 'b100'), company: v('np-company'), detentionCompany: v('np-company'), location: v('np-location'), cell: v('np-location'),
      riskLevel: v('np-risk'), detentionReason: v('np-reason'), offense: v('np-reason'),
      sentence: days, expectedRelease: end, sentenceEvents: [],
      fatherName: v('np-father'), unitPhone: v('np-unitphone'), birthCountry: v('np-country'),
      classification: { placementRec: v('np-placement'), profile: v('np-profile') }, medicalNotes: v('np-medical'), notes: v('np-notes'),
      status: 'active', createdAt: now, updatedAt: now,
    }, flags);
    Storage.upsert(Storage.KEYS.PRISONER_FILES, file);
    if (window.GachlatScreeningService) GachlatScreeningService.refresh();
    Audit.log({ module: 'incarceration', action: 'create', entityType: 'prisonerFile', entityId: file.id, description: `פתיחת תיק כלוא ${file.fileNumber}` });
    Toast.success('תיק כלוא נפתח');
    Router.navigate('/prisoner-file', { id: file.id });
  };
};
