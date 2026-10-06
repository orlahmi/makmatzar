/* new-report-full.js — new police report form (דמ״ש / ביד״צ, config-driven sections) */
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

  // ---- field helpers ----
  const yn = (name, label) => `<div class="form-group"><label class="form-label">${label} <span class="required">*</span></label>
    <select name="${name}" class="form-control" required><option value="">בחר</option><option value="no">לא</option><option value="yes">כן</option></select></div>`;
  const inp = (name, label, extra) => `<div class="form-group"><label class="form-label">${label} <span class="required">*</span></label>
    <input name="${name}" class="form-control" ${extra || ''} required></div>`;
  const opt = (name, label, extra) => `<div class="form-group"><label class="form-label">${label}</label>
    <input name="${name}" class="form-control" ${extra || ''}></div>`;
  const chk = (name, label) => `<label style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px"><input type="checkbox" name="${name}" value="yes" style="margin-top:4px"> <span>${label}</span></label>`;
  const sel = (name, label, options, required) => `<div class="form-group"><label class="form-label">${label} ${required === false ? '' : '<span class="required">*</span>'}</label>
    <select name="${name}" class="form-control" ${required === false ? '' : 'required'}><option value="">בחר</option>${options.map(o => `<option value="${o}">${o}</option>`).join('')}</select></div>`;
  const sec = (id, title, body, types) => `<div class="page-section" data-section="${id}" data-types="${types.join(',')}">
    <div class="section-header"><div class="section-title">${title}</div></div>${body}</div>`;
  const BOTH = ['dmash', 'bidatz'], BIDATZ = ['bidatz'];
  const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const FRAMEWORKS = ['פעילות יזומה', 'סיור', 'מחסום'];
  const LICENSE_TYPES = ['A', 'A1', 'A2', 'B', 'C', 'C1', 'D', 'D1', '1', 'היתר'];

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

      <form id="new-report-form" novalidate>
        <div class="page-section">
          <div class="section-header">
            <div class="section-title">${Utils.icon('report', 18)} פרטי הדו"ח</div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">סוג הדוח <span class="required">*</span></label>
              <select name="reportType" id="report-type" class="form-control" required>
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
          </div>
        </div>

        <div class="page-section" data-section="accused" data-types="dmash,bidatz">
          <div class="section-header">
            <div class="section-title">${Utils.icon('user', 18)} פרטי המפר / הנאשם</div>
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
                <option value="">בחר סוג שירות</option>
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
              <label class="form-label">טלפון נייד <span class="required">*</span></label>
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

        <div class="page-section" data-section="time-location" data-types="dmash,bidatz">
          <div class="section-header">
            <div class="section-title">${Utils.icon('calendar', 18)} מועד ומיקום ביצוע העבירה</div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">תאריך ביצוע העבירה <span class="required">*</span></label>
              <input type="date" name="date" id="offense-date" class="form-control" value="${Utils.today()}" required>
            </div>
            <div class="form-group">
              <label class="form-label">יום בשבוע <span class="required">*</span></label>
              <select name="weekday" id="weekday" class="form-control" required>
                <option value="">בחר יום</option>${WEEKDAYS.map(d => `<option value="${d}">${d}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">שעת ביצוע עבירה <span class="required">*</span></label>
              <input type="time" name="time" class="form-control" required>
            </div>
            <div class="form-group">
              <label class="form-label">סוג מיקום <span class="required">*</span></label>
              <select name="locType" id="loc-type" class="form-control" required>
                <option value="">בחר</option><option value="junction">צומת</option><option value="road">בכביש</option><option value="street">ברחוב</option><option value="other">אחר</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">במסגרת <span class="required">*</span></label>
              <select name="enforcementFramework" class="form-control" required>
                <option value="">בחר מסגרת</option>${FRAMEWORKS.map(d => `<option value="${d}">${d}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row form-row-3 loc-group" data-group="junction" style="display:none">
            ${inp('jn_junction', 'צומת', 'data-loc="junction" disabled')}
            ${inp('jn_from', 'מכיוון', 'data-loc="junction" disabled')}
            ${inp('jn_to', 'לכיוון', 'data-loc="junction" disabled')}
            ${inp('jn_meters', 'מיקום לפני / אחרי הצומת (במטרים)', 'type="number" data-loc="junction" disabled')}
          </div>
          <div class="form-row form-row-3 loc-group" data-group="road" style="display:none">
            ${inp('rd_road', 'בכביש', 'data-loc="road" disabled')}
            ${inp('rd_km', 'בק״מ', 'type="number" step="any" data-loc="road" disabled')}
            ${inp('rd_from', 'מכיוון', 'data-loc="road" disabled')}
            ${inp('rd_to', 'לכיוון', 'data-loc="road" disabled')}
          </div>
          <div class="form-row form-row-3 loc-group" data-group="street" style="display:none">
            ${inp('st_street', 'ברחוב', 'data-loc="street" disabled')}
            ${inp('st_house', 'ליד בית מס׳', 'data-loc="street" disabled')}
            ${inp('st_city', 'בעיר', 'data-loc="street" disabled')}
          </div>
          <div class="form-row form-row-3 loc-group" data-group="other" style="display:none">
            ${inp('ot_text', 'מלל', 'data-loc="other" disabled')}
          </div>
        </div>

        <div class="page-section" data-section="offense" data-types="dmash,bidatz">
          <div class="section-header">
            <div class="section-title">${Utils.icon('alert', 18)} פרטי העבירה</div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">קטגוריית עבירה <span class="required">*</span></label>
              <select name="offenseCategory" class="form-control" id="offense-category" required>
                <option value="">בחר קטגוריה</option>
                ${OFFENSE_CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">סעיף העבירה <span class="required">*</span></label>
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
          </div>
          <div class="form-group">
            <label class="form-label">תיאור העבירה <span class="required">*</span></label>
            <textarea name="description" class="form-control" rows="4" required placeholder="תאר בפירוט את העבירה..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">בנסיבות</label>
            <textarea name="circumstances" class="form-control" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">הערות שוטר</label>
            <textarea name="officerNotes" class="form-control" rows="2"></textarea>
          </div>
        </div>

        <div class="page-section" data-section="delivery" data-types="dmash,bidatz">
          <div class="section-header">
            <div class="section-title">${Utils.icon('report', 18)} מסירת הדו"ח</div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">מסירת הדו"ח <span class="required">*</span></label>
              <select name="deliveryMethod" id="delivery-method" class="form-control" required>
                <option value="hand">נמסר ביד</option>
                <option value="locate">דו"ח איתור</option>
                <option value="digital">נמסר דיגיטלית</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">תאריך מסירה <span class="required">*</span></label>
              <input type="date" name="deliveryDate" class="form-control" value="${Utils.today()}" required>
            </div>
          </div>
          <div id="locate-block" class="form-row form-row-3" style="display:none">
            ${inp('locatorMilNum', 'מ"א מזהה עבירה', 'data-cond="locate" disabled')}
            ${inp('locatorFirstName', 'שם פרטי מזהה עבירה', 'data-cond="locate" disabled')}
            ${inp('locatorLastName', 'שם משפחה מזהה עבירה', 'data-cond="locate" disabled')}
            ${inp('locateReason', 'סיבת דו"ח איתור', 'data-cond="locate" disabled')}
          </div>
          <div class="form-row form-row-3">
            ${opt('recipientResponse', 'תגובת מקבל הדו"ח')}
            ${opt('recipientSignature', 'חתימת מקבל הדו"ח (שם החותם)')}
            <div class="form-group">
              <label class="form-label">&nbsp;</label>
              <label style="display:flex;gap:8px"><input type="checkbox" name="refuseToSign" id="refuse-sign" value="yes"> סירוב חתימה</label>
            </div>
          </div>
          <div id="refuse-block" class="form-row form-row-3" style="display:none">
            ${inp('refuseReason', 'סיבת סירוב לחתימה', 'data-cond="refuse" disabled')}
          </div>
          <div class="form-group">
            <label class="form-label">הערות</label>
            <input name="deliveryRemarks" class="form-control">
          </div>
        </div>

        ${sec('bidatz-officer', `${Utils.icon('user', 18)} דו"ח מפורט לשוטר מזהה עבירה`, `
          <div class="form-row form-row-3">
            ${yn('bd_otherPassengers', 'האם היו עוד נוסעים')}
            ${yn('bd_otherSoldiers', 'האם היו עוד חיילים ברכב')}
            ${yn('bd_photographed', 'האם העבירה צולמה')}
            ${yn('bd_insideBase', 'האם בתוך בסיס')}
            ${yn('bd_vehicleMoving', 'האם הרכב היה בתנועה')}
            ${yn('bd_eyeContact', 'נשמר קשר עין בין מזהה העבירה למבצע העבירה')}
            ${inp('bd_officerSignature', 'חתימת שוטר (שם החותם)')}
          </div>
          <div class="form-group"><label class="form-label">מלל חופשי</label><textarea name="bd_officerFreeText" class="form-control" rows="2"></textarea></div>`, BIDATZ)}

        ${sec('bidatz-speed', `${Utils.icon('alert', 18)} עבירות מהירות ואמצעים טכנולוגיים`, `
          <div class="form-row form-row-3">
            ${inp('sp_measured', 'מהירות שנמדדה במכשיר', 'type="number" min="0"')}
            ${inp('sp_afterReduction', 'מהירות אחרי הפחתה', 'type="number" min="0"')}
            ${inp('sp_distance', 'מרחק שנמדד במכשיר', 'type="number" min="0"')}
            ${inp('sp_allowedRoad', 'מהירות מותרת בכביש', 'type="number" min="0"')}
            ${inp('sp_allowedLicense', 'מהירות מותרת ע"פ רישיון רכב', 'type="number" min="0"')}
            ${sel('sp_roadType', 'סוג הדרך', ['עירונית', 'בין-עירונית', 'מהירה'])}
            ${inp('sp_deviceNumber', 'מספר מכשיר')}
            ${inp('sp_cameraNumber', 'מספר מצלמה')}
            ${sel('sp_deviceType', 'סוג מכשיר', ['דבורה', 'ממל"ז', 'מצלמה ניידת', 'בדיקת מצלמה'])}
          </div>`, BIDATZ)}

        ${sec('bidatz-reliability', `${Utils.icon('check', 18)} אמינות הפעלה`, `
          <p style="margin-bottom:8px;color:var(--color-text-muted)">לצורך אמינות ההפעלה וידאתי כי:</p>
          ${chk('rl_urban424', 'אכיפה בדרך עירונית: וידאתי קיומו של תמרור "אזור דרכים עירוניות" (תמרור 424)')}
          ${chk('rl_lineOfSight', 'היה קו ראיה נקי מהפרעות פיזיות בין המכשיר לבין קטע הדרך הנמצא בפיקוח.')}
          ${chk('rl_notHidden', 'רכב המטרה לא היה מוסתר ע"י עצם או רכב אחר.')}
          ${chk('rl_redPoint', 'נקודת ההצבעה האדומה היתה מכוונת כל זמן המדידה על מרכז רכב המטרה, עד לקבלת צליל אישור המדידה.')}
          <div class="form-row form-row-3">
            ${opt('rl_lane', 'הרכב הנמדד היה בנתיב מס׳', 'type="number" min="1"')}
            ${opt('rl_lanesTotal', 'מתוך נתיבים', 'type="number" min="1"')}
            ${sel('rl_approach', 'תנועה מתקרבת / מתרחקת', ['מתקרבת', 'מתרחקת'], false)}
          </div>
          ${chk('rl_sign426Start', 'קיומו של התמרור 426 משני צידי הדרך נבדק בתחילת המשמרת.')}
          ${chk('rl_sign426End', 'קיומו של התמרור 426 משני צידי הדרך נבדק בסיום המשמרת.')}
          <div class="form-row form-row-3">
            ${opt('rl_detectionRange', 'טווח גילוי רכב המטרה (מטר, עד 300)', 'type="number" min="0" max="300"')}
            ${opt('rl_operatorDistance', 'מרחק המפעיל מהתמרור / צומת המגביל (מטר)', 'type="number" min="0"')}
          </div>
          ${chk('rl_weather', 'בשעת הפעלת הממל"ז לא ירד גשם, שלג או ברד ולא היה חושך.')}
          ${chk('rl_shownToDriver', 'נתוני המדידה הוצגו בפני הנהג.')}
          ${chk('rl_driverRefused', 'הנהג סירב לראות את נתוני המדידה.')}
          <h4 style="margin:16px 0 8px">אישור פרטי מפעיל</h4>
          <div class="form-row form-row-3">
            ${inp('rl_operatorName', 'שם ומשפחה')}
            ${inp('rl_operatorMilNum', 'מ"א')}
            ${inp('rl_operatorSignature', 'חתימת מפעיל (שם החותם)')}
          </div>`, BIDATZ)}

        ${sec('license-vehicle', `${Utils.icon('report', 18)} רישיון ורכב — מעורבים באירוע`, `
          <div class="form-row form-row-3">
            ${yn('vehicleInvolved', 'רישיון ורכב מעורבים באירוע')}
          </div>
          <div class="form-row form-row-3" id="vehicle-fields" style="display:none">
            ${inp('lv_licenseExpiry', 'תוקף רישיון', 'type="date" data-veh="1" disabled')}
            ${inp('lv_licenseNumber', 'מספר רישיון', 'data-veh="1" disabled')}
            ${sel('lv_licenseType', 'סוג רישיון', LICENSE_TYPES).replace('<select ', '<select data-veh="1" disabled ')}
            ${inp('lv_civilPlate', 'מספר רישוי אזרחי', 'data-veh="1" disabled')}
            ${inp('lv_militaryPlate', 'מספר רישוי צבאי', 'data-veh="1" disabled')}
            ${inp('lv_vehicleType', 'סוג רכב', 'data-veh="1" disabled')}
            ${inp('lv_vehicleColor', 'צבע', 'data-veh="1" disabled')}
          </div>`, BOTH)}

        <div class="page-section" data-section="witnesses" data-types="dmash,bidatz">
          <div class="section-header">
            <div class="section-title">${Utils.icon('users', 18)} עדים</div>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-witness">${Utils.icon('plus', 14)} הוספת עד</button>
          </div>
          <div id="witnesses-list"></div>
        </div>

        ${sec('bidatz-atat', `${Utils.icon('report', 18)} דו"ח מפורט לאתת`, `
          <div class="form-row form-row-3">
            ${inp('at_fullTime', 'ל"ז מלאה')}
            ${inp('at_middleDigits', 'ספרות אמצעיות')}
            ${inp('at_stationDistance', 'מרחק בין תחנה א׳ לתחנה ב׳', 'type="number" min="0"')}
            ${inp('at_vehicleType', 'סוג רכב (ע"פ תחנה א׳)')}
            ${inp('at_vehicleColor', 'צבע רכב (ע"פ תחנה א׳)')}
            ${opt('at_other', 'אחר (ע"פ תחנה א׳)')}
            ${yn('at_selfIdentified', 'האם זיהיתי את העבירה בעצמך')}
            ${inp('at_stopDetails', 'פירוט עצירת הרכב')}
            ${inp('at_milNum', 'מ"א אתת')}
            ${inp('at_rank', 'דרגה')}
            ${inp('at_firstName', 'שם פרטי')}
            ${inp('at_lastName', 'שם משפחה')}
            ${inp('at_signature', 'חתימת אתת (שם החותם)')}
          </div>`, BIDATZ)}

        ${sec('bidatz-checks', `${Utils.icon('check', 18)} בדיקות תקינות`, `
          <div class="form-row form-row-3">
            ${chk('ck_self', 'בדיקה עצמית')}
            ${chk('ck_display', 'בדיקת תצוגה')}
            ${chk('ck_coordination', 'בדיקת תיאום על')}
            ${chk('ck_calibration', 'בדיקת כיול מהירות+מרחק')}
          </div>
          <div class="form-row form-row-3">
            ${inp('ck_startTime', 'הבדיקות בתחילת משמרת (שעה)', 'type="time"')}
            ${inp('ck_startPlace', 'במקום (תחילת משמרת)')}
            ${inp('ck_endTime', 'הבדיקות בסוף משמרת (שעה)', 'type="time"')}
            ${inp('ck_endPlace', 'במקום (סוף משמרת)')}
            ${inp('ck_operatorFirst', 'שם פרטי מפעיל')}
            ${inp('ck_operatorLast', 'שם משפחה מפעיל')}
            ${inp('ck_operatorMilNum', 'מ"א מפעיל')}
            ${inp('ck_operatorSignature', 'חתימת מפעיל (שם החותם)')}
          </div>`, BIDATZ)}

        <div id="form-errors" style="display:none" class="form-error-summary">
          <div class="form-error-summary-title">יש לתקן את השגיאות הבאות:</div>
          <ul id="error-list"></ul>
        </div>
      </form>

      ${Utils.classificationFooter()}
    </div>
  `;

  const form = Utils.el('new-report-form');

  // ---- report type switching: hide + disable irrelevant sections ----
  function currentType() { return form.reportType.value || 'dmash'; }
  function applyType() {
    const type = currentType();
    form.querySelectorAll('[data-section]').forEach(section => {
      const visible = section.dataset.types.split(',').includes(type);
      section.style.display = visible ? '' : 'none';
      section.querySelectorAll('input,select,textarea').forEach(el => {
        if (el.dataset.cond || el.dataset.veh || el.dataset.loc) return; // conditional fields handled in applyConditionals
        el.disabled = !visible;
      });
      if (!visible) {
        section.querySelectorAll('input,select,textarea').forEach(el => {
          Validation.clearFieldError(el);
          // no stale values leaking to another type
          if (el.type === 'checkbox') el.checked = false;
          else if (el.tagName === 'SELECT') el.selectedIndex = 0;
          else el.value = '';
        });
      }
    });
    applyConditionals();
    const wit = Utils.el('witnesses-list');
    wit.querySelectorAll('input').forEach(el => { el.disabled = false; });
  }
  function applyConditionals() {
    // location group per old form (only the chosen group is visible/enabled/required)
    const lt = form.locType && !form.locType.disabled ? form.locType.value : '';
    form.querySelectorAll('.loc-group').forEach(g => {
      const on = g.dataset.group === lt;
      g.style.display = on ? '' : 'none';
      g.querySelectorAll('[data-loc]').forEach(el => { el.disabled = !on; if (!on) { el.value = ''; Validation.clearFieldError(el); } });
    });
    // vehicle / license fields only when a vehicle is involved
    const veh = form.vehicleInvolved && !form.vehicleInvolved.disabled && form.vehicleInvolved.value === 'yes';
    const vf = Utils.el('vehicle-fields'); if (vf) vf.style.display = veh ? '' : 'none';
    form.querySelectorAll('[data-veh]').forEach(el => { el.disabled = !veh; if (!veh) { el.value = ''; Validation.clearFieldError(el); } });
    const locate = form.deliveryMethod.value === 'locate' && !form.deliveryMethod.disabled;
    Utils.el('locate-block').style.display = locate ? '' : 'none';
    form.querySelectorAll('[data-cond="locate"]').forEach(el => { el.disabled = !locate; if (!locate) { el.value = ''; Validation.clearFieldError(el); } });
    const refuse = Utils.el('refuse-sign').checked;
    Utils.el('refuse-block').style.display = refuse ? '' : 'none';
    form.querySelectorAll('[data-cond="refuse"]').forEach(el => { el.disabled = !refuse; if (!refuse) { el.value = ''; Validation.clearFieldError(el); } });
  }
  form.reportType.addEventListener('change', applyType);
  form.deliveryMethod.addEventListener('change', applyConditionals);
  form.locType.addEventListener('change', applyConditionals);
  form.vehicleInvolved.addEventListener('change', applyConditionals);
  Utils.el('refuse-sign').addEventListener('change', applyConditionals);

  // weekday follows date
  function syncWeekday() {
    const d = form.date.value;
    if (!d) return;
    const idx = new Date(d + 'T12:00:00').getDay();
    form.weekday.value = WEEKDAYS[idx];
  }
  form.date.addEventListener('change', syncWeekday);
  syncWeekday();
  applyType();

  // Mark dirty on changes
  form.addEventListener('change', () => {
    isDirty = true;
    Utils.show('unsaved-ind');
    AppState.set('unsavedChanges', true);
  });

  // Offense auto-fill
  Utils.el('offense-select').addEventListener('change', () => {
    const offense = OFFENSE_MAP[Utils.el('offense-select').value];
    if (offense) {
      Utils.el('offense-points').value = offense.points;
      Utils.el('offense-fine').value = offense.fine;
    }
  });

  // Lookup person by military number: fills every available identity field
  Utils.el('btn-lookup').onclick = () => {
    const milNum = Utils.el('accused-mil-num').value.trim();
    if (!milNum) { Toast.warning('הכנס מספר אישי לחיפוש'); return; }
    const person = Storage.getCollection(Storage.KEYS.PEOPLE).find(p => p.militaryNumber === milNum);
    if (!person) { Toast.info('לא נמצא אדם עם מספר אישי זה — יש להזין את הפרטים ידנית'); return; }
    const set = (name, v) => { if (form[name] && v) { form[name].value = v; Validation.clearFieldError(form[name]); Utils.markAuto(form[name], true); } };
    ['nationalId', 'firstName', 'lastName', 'phone', 'rank', 'serviceType', 'unitPerson', 'corps', 'street', 'houseNumber', 'city'].forEach(n => { if (form[n]) Utils.markAuto(form[n], false); });
    set('nationalId', person.nationalId);
    set('firstName', person.firstName);
    set('lastName', person.lastName);
    set('phone', person.phone);
    set('rank', person.rank);
    set('serviceType', person.serviceType);
    set('unitPerson', person.unitId);
    if (person.corps) set('corps', person.corps);
    if (person.address) {
      // "רחוב בן יהודה 5, חיפה"
      const m = /^(.*?)\s*(\d+\S*)?\s*,\s*(.+)$/.exec(person.address);
      if (m) { set('street', (m[1] || '').trim()); set('houseNumber', m[2]); set('city', (m[3] || '').trim()); }
    }
    Toast.success('פרטי האדם נטענו — יש להשלים שדות חסרים');
  };

  // Witnesses (old spec fields)
  Utils.el('btn-add-witness').onclick = () => {
    witnesses.push({ militaryNumber: '', nationalId: '', firstName: '', lastName: '', involvement: '', unit: '', policeBase: '', signature: '' });
    renderWitnesses();
  };
  const WIT_FIELDS = [
    ['militaryNumber', 'מספר אישי'], ['nationalId', 'תעודת זהות'], ['firstName', 'שם פרטי'], ['lastName', 'שם משפחה'],
    ['involvement', 'סוג מעורבות'], ['unit', 'יחידה'], ['policeBase', 'בסיס שיטור'], ['signature', 'חתימה (שם החותם)'],
  ];
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
            ${WIT_FIELDS.map(([k, l]) => `<div class="form-group"><label class="form-label">${l}</label><input class="form-control" data-w="${k}" data-idx="${i}" value="${Utils.escHtml(w[k])}"></div>`).join('')}
          </div>
        </div>
        <button type="button" class="dynamic-list-item-remove" data-idx="${i}">${Utils.icon('x', 16)}</button>
      </div>`).join('');
    container.querySelectorAll('[data-w]').forEach(el => el.oninput = () => { witnesses[el.dataset.idx][el.dataset.w] = el.value; });
    container.querySelectorAll('.dynamic-list-item-remove').forEach(el => {
      el.onclick = () => { witnesses.splice(Number(el.dataset.idx), 1); renderWitnesses(); };
    });
  }
  renderWitnesses();

  // Clear form
  Utils.el('btn-clear').onclick = async () => {
    if (isDirty) {
      const ok = await Modal.confirm({ title: 'נקה טופס', message: 'כל הנתונים שהוזנו יימחקו. האם להמשיך?', type: 'danger' });
      if (!ok) return;
    }
    form.reset();
    witnesses = [];
    renderWitnesses();
    syncWeekday();
    applyType();
    isDirty = false;
    Utils.hide('unsaved-ind');
    AppState.set('unsavedChanges', false);
    Toast.info('הטופס נוקה');
  };

  Utils.el('btn-draft').onclick = () => saveReport('draft');
  Utils.el('btn-create').onclick = () => saveReport('pending');

  // Only enabled (= visible for the chosen type) fields are submitted
  function getFormData() {
    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = v; });
    return data;
  }

  function validate(data) {
    const errors = [];
    let firstInvalidField = null;
    const fail = (field, label, msg) => {
      errors.push(`${label}: ${msg}`);
      Validation.showFieldError(field, msg);
      if (!firstInvalidField) firstInvalidField = field;
    };
    // every enabled required field (hidden sections are disabled, so they never block)
    form.querySelectorAll('[required]').forEach(el => {
      if (el.disabled || !el.name) return;
      const label = (el.closest('.form-group')?.querySelector('.form-label')?.textContent || el.name).replace('*', '').trim();
      if (!String(el.value || '').trim()) fail(el, label, 'שדה חובה');
      else Validation.clearFieldError(el);
    });
    if (data.militaryNumber && !Utils.isValidMilNum(data.militaryNumber)) {
      fail(form.militaryNumber, 'מספר אישי', Validation.MESSAGES.milNum);
    }
    if (data.nationalId && Utils.isValidNationalId && !Utils.isValidNationalId(data.nationalId)) {
      fail(form.nationalId, 'ת.ז.', Validation.MESSAGES.nationalId);
    }
    if (data.phone && Utils.isValidPhone && !Utils.isValidPhone(data.phone)) {
      fail(form.phone, 'טלפון נייד', Validation.MESSAGES.phone);
    }
    return { errors, firstInvalidField };
  }

  function locDetails(d) {
    const t = d.locType;
    if (t === 'junction') return { type: t, junction: d.jn_junction, from: d.jn_from, to: d.jn_to, meters: d.jn_meters };
    if (t === 'road') return { type: t, road: d.rd_road, km: d.rd_km, from: d.rd_from, to: d.rd_to };
    if (t === 'street') return { type: t, street: d.st_street, house: d.st_house, city: d.st_city };
    if (t === 'other') return { type: t, text: d.ot_text };
    return {};
  }
  function locText(d) {
    const x = locDetails(d);
    if (x.type === 'junction') return 'צומת ' + x.junction;
    if (x.type === 'road') return 'כביש ' + x.road + (x.km ? ' ק״מ ' + x.km : '');
    if (x.type === 'street') return x.street + (x.house ? ' ' + x.house : '') + ', ' + x.city;
    return x.text || '';
  }

  function saveReport(status) {
    const data = getFormData();
    data.status = status;

    if (status === 'draft') {
      // a draft must be identifiable: report type + a valid military number
      if (!data.militaryNumber || !Utils.isValidMilNum(data.militaryNumber)) {
        Validation.showFieldError(form.militaryNumber, 'לשמירת טיוטה יש להזין מספר אישי תקין');
        form.militaryNumber.focus(); Toast.error('לשמירת טיוטה יש להזין לפחות סוג דו"ח ומספר אישי תקין');
        return;
      }
    }
    if (status !== 'draft') {
      const { errors, firstInvalidField } = validate(data);
      const errDiv = Utils.el('form-errors');
      if (errors.length) {
        Utils.el('error-list').innerHTML = errors.map(e => `<li>${Utils.escHtml(e)}</li>`).join('');
        errDiv.style.display = 'block';
        if (firstInvalidField) {
          firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstInvalidField.focus();
        }
        Toast.error('יש למלא את כל שדות החובה לפני השמירה');
        return;
      }
      errDiv.style.display = 'none';
    }

    const offense = OFFENSE_MAP[data.offenseId];
    const person = data.militaryNumber
      ? Storage.getCollection(Storage.KEYS.PEOPLE).find(p => p.militaryNumber === data.militaryNumber)
      : null;
    const reportType = data.reportType || 'dmash';
    // type-specific answers live under typeData so the two report kinds never mix
    const typeData = {};
    Object.keys(data).forEach(k => { if (/^(bd|sp|rl|at|ck)_/.test(k)) typeData[k] = data[k]; });
    const shared = {};
    Object.keys(data).forEach(k => { if (/^lv_/.test(k)) shared[k] = data[k]; });
    if (data.vehicleInvolved !== 'yes') Object.keys(shared).forEach(k => delete shared[k]);

    const report = {
      id: reportId,
      reportNumber,
      reportType,
      date: data.date || Utils.today(),
      weekday: data.weekday || '',
      time: data.time || '',
      baseId: data.baseId || (base ? base.id : 'b100'),
      unitId: data.unitId || 'u01',
      officerId: user ? user.id : '',
      officerName: user ? user.firstName + ' ' + user.lastName : '',
      personId: person ? person.id : null,
      militaryNumber: data.militaryNumber || '',
      nationalId: data.nationalId || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      accused: {
        rank: data.rank, serviceType: data.serviceType, corps: data.corps, unit: data.unitPerson, phone: data.phone,
        city: data.city, street: data.street, houseNumber: data.houseNumber,
      },
      offenseId: data.offenseId,
      offenseTitle: offense ? offense.title : '',
      status: data.status,
      description: data.description || '',
      circumstances: data.circumstances || '',
      officerNotes: data.officerNotes || '',
      severity: data.severity || 'medium',
      points: parseInt(data.points) || 0,
      fine: parseFloat(data.fine) || 0,
      enforcementFramework: data.enforcementFramework || '',
      deliveryMethod: data.deliveryMethod || 'hand',
      deliveryDate: data.deliveryDate || null,
      delivery: {
        recipientResponse: data.recipientResponse || '', recipientSignature: data.recipientSignature || '',
        refusedToSign: data.refuseToSign === 'yes', refuseReason: data.refuseReason || '',
        locatorMilNum: data.locatorMilNum || '', locatorFirstName: data.locatorFirstName || '',
        locatorLastName: data.locatorLastName || '', locateReason: data.locateReason || '', remarks: data.deliveryRemarks || '',
      },
      location: locText(data),
      locationDetails: locDetails(data),
      vehicleInvolved: data.vehicleInvolved === 'yes',
      vehicle: shared,
      typeData,
      witnesses: witnesses.filter(w => Object.values(w).some(Boolean)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    Storage.upsert(Storage.KEYS.POLICE_REPORTS, report);
    Audit.log({
      module: 'policing',
      entityType: 'policeReport',
      entityId: reportId,
      action: 'create',
      description: `יצירת דו"ח ${REPORT_TYPE_LABEL[reportType]} ${reportNumber} (${data.status === 'draft' ? 'טיוטה' : 'ממתין'})`,
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
