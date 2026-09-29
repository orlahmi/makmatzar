/* officer-report-form.js — tabbed report workspace */
'use strict';

window.Pages = window.Pages || {};

Pages['officer-report-form'] = function(query) {
  const content = Utils.el('page-content');
  const reportId = query && query.id;
  const editMode = query && query.mode === 'edit';

  if (!reportId) { content.innerHTML = EmptyState.notFound(''); return; }
  const report = Storage.getById(Storage.KEYS.POLICE_REPORTS, reportId);
  if (!report) { content.innerHTML = EmptyState.notFound(reportId); return; }

  const canEdit = Permissions.can('editReport') && (editMode || report.status === 'draft');
  const people = Storage.getCollection(Storage.KEYS.PEOPLE);
  const pMap = Object.fromEntries(people.map(p => [p.id, p]));
  const person = pMap[report.personId];
  const offense = OFFENSE_MAP ? OFFENSE_MAP[report.offenseId] : null;
  const base = BASE_MAP ? BASE_MAP[report.baseId] : null;

  const td = report.typeData || {};
  const yesNo = v => v === 'yes' ? 'כן' : v === 'no' ? 'לא' : '—';
  function esc(v) { return Utils.escHtml(v || '—'); }
  function fdate(v) { return v ? Utils.formatDate(v) : '—'; }

  const rankLabel = (id) => {
    const r = RANK_MAP ? RANK_MAP[id] : null;
    return r ? r.label : (id || '—');
  };

  content.innerHTML = `
    <div class="page-wrapper">
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">${Utils.icon('report', 22)} דו"ח ${esc(REPORT_TYPE_LABEL[report.reportType] || 'דמ״ש')} — ${esc(report.reportNumber)}</h1>
          <p class="page-subtitle">
            ${StatusBadge.render(report.status)}
            &nbsp;
            ${base ? esc(base.name) : ''}
            &nbsp;•&nbsp;
            ${fdate(report.date)} ${esc(report.time)}
          </p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary btn-sm" onclick="window.printReport()">${Utils.icon('print', 14)} הדפסה</button>
          ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="window.saveReportStatus('pending')">${Utils.icon('check', 14)} אשר דו"ח</button>` : ''}
          ${Permissions.can('editReport') ? `<button class="btn btn-secondary btn-sm" onclick="window.toggleEditMode()">${Utils.icon('edit', 14)} ${editMode ? 'בטל עריכה' : 'עריכה'}</button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/reports-table')">${Utils.icon('x', 14)} סגור</button>
        </div>
      </div>

      <!-- Person Summary Card -->
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
      </div>
      ` : ''}

      <!-- Tabs -->
      <div id="report-tabs">
        <div class="tabs-nav" role="tablist"></div>

        <div class="tab-panel" data-tab="general">
          ${renderTabGeneral()}
        </div>
        <div class="tab-panel" data-tab="suspension">
          ${renderTabSuspension()}
        </div>
        <div class="tab-panel" data-tab="conversions">
          ${renderTabConversions()}
        </div>
        <div class="tab-panel" data-tab="cancellations">
          ${renderTabCancellations()}
        </div>
        <div class="tab-panel" data-tab="details">
          ${renderTabDetails()}
        </div>
        <div class="tab-panel" data-tab="vehicle">
          ${renderTabVehicle()}
        </div>
        <div class="tab-panel" data-tab="witnesses">
          ${renderTabWitnesses()}
        </div>
        <div class="tab-panel" data-tab="offense-desc">
          ${renderTabOffenseDesc()}
        </div>
        <div class="tab-panel" data-tab="offense-id">
          ${renderTabOffenseId()}
        </div>
        <div class="tab-panel" data-tab="location-report">
          ${renderTabLocationReport()}
        </div>
        <div class="tab-panel" data-tab="signal-report">
          ${renderTabSignalReport()}
        </div>
        <div class="tab-panel" data-tab="speed">
          ${renderTabSpeed()}
        </div>
        <div class="tab-panel" data-tab="checks">
          ${renderTabChecks()}
        </div>
        <div class="tab-panel" data-tab="reliability">
          ${renderTabReliability()}
        </div>
        <div class="tab-panel" data-tab="prosecutor">
          ${renderTabProsecutor()}
        </div>
        <div class="tab-panel" data-tab="approval">
          ${renderTabApproval()}
        </div>
        <div class="tab-panel" data-tab="statuses">
          ${renderTabStatuses()}
        </div>
        <div class="tab-panel" data-tab="summons">
          ${renderTabSummons()}
        </div>
        <div class="tab-panel" data-tab="files">
          ${renderTabFiles()}
        </div>
        <div class="tab-panel" data-tab="verdict">
          ${renderTabVerdict()}
        </div>
      </div>
    </div>
  `;

  // Init tabs (ביד״צ-only professional tabs are hidden for דמ״ש)
  const BIDATZ_ONLY_TABS = ['signal-report', 'speed', 'checks', 'reliability'];
  Tabs.create({
    containerId: 'report-tabs',
    defaultTab: 'general',
    tabs: [
      { id: 'general', label: 'כללי', icon: 'report' },
      { id: 'suspension', label: 'התלייה' },
      { id: 'conversions', label: 'המרות' },
      { id: 'cancellations', label: 'ביטולים' },
      { id: 'details', label: 'פרטים כלליים' },
      { id: 'vehicle', label: 'רכב ורישיון' },
      { id: 'witnesses', label: 'עדים' },
      { id: 'offense-desc', label: 'תיאור עבירה' },
      { id: 'offense-id', label: 'מזהה עבירה' },
      { id: 'location-report', label: 'דו"ח איתור' },
      { id: 'signal-report', label: 'דו"ח אתת' },
      { id: 'speed', label: 'מהירות וטכנולוגיה' },
      { id: 'checks', label: 'בדיקות תקינות' },
      { id: 'reliability', label: 'אמינות הפעלה' },
      { id: 'prosecutor', label: 'פרטי התובע' },
      { id: 'approval', label: 'אישור הדו"ח' },
      { id: 'statuses', label: 'סטטוסים' },
      { id: 'summons', label: 'זימונים' },
      { id: 'files', label: 'קבצים' },
      { id: 'verdict', label: 'תוצאות שיפוט' },
    ].filter(t => report.reportType === 'bidatz' || !BIDATZ_ONLY_TABS.includes(t.id))
  });

  // Global actions
  window.printReport = function() {
    Audit.log({ module: 'policing', action: 'print', entityType: 'policeReport', entityId: reportId, description: `הדפסת דו"ח ${report.reportNumber}` });
    window.print();
  };

  window.saveReportStatus = function(newStatus) {
    report.status = newStatus;
    report.updatedAt = new Date().toISOString();
    Storage.upsert(Storage.KEYS.POLICE_REPORTS, report);
    Audit.log({ module: 'policing', action: 'update', entityType: 'policeReport', entityId: reportId, description: `עדכון סטטוס דו"ח ${report.reportNumber} ל-${newStatus}` });
    Toast.success('סטטוס הדו"ח עודכן');
    setTimeout(() => Router.navigate('/officer-report-form', { id: reportId }), 400);
  };

  window.toggleEditMode = function() {
    Router.navigate('/officer-report-form', { id: reportId, mode: editMode ? undefined : 'edit' });
  };

  // --- Tab render functions ---

  function infoRow(label, value) {
    return `<div class="info-list-row"><div class="info-list-label">${Utils.escHtml(label)}</div><div class="info-list-value">${value}</div></div>`;
  }

  function renderTabGeneral() {
    return `
      <div class="tab-section-grid">
        <div class="card">
          <div class="card-header"><div class="card-title">פרטי הדו"ח</div></div>
          <div class="card-body">
            <div class="info-list">
              ${infoRow('מספר דו"ח', esc(report.reportNumber))}
              ${infoRow('סוג דו"ח', esc(REPORT_TYPE_LABEL[report.reportType] || 'דמ״ש'))}
              ${infoRow('תאריך', fdate(report.date))}
              ${infoRow('שעה', esc(report.time))}
              ${infoRow('בסיס', base ? esc(base.name) : '—')}
              ${infoRow('סטטוס', StatusBadge.render(report.status))}
              ${infoRow('שוטר מוסר', esc(report.officerName))}
              ${infoRow('תאריך יצירה', Utils.formatDateTime(report.createdAt))}
              ${infoRow('עדכון אחרון', Utils.formatDateTime(report.updatedAt))}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">פרטי המפר</div></div>
          <div class="card-body">
            <div class="info-list">
              ${infoRow('מספר אישי', esc(report.militaryNumber || (person && person.militaryNumber)))}
              ${infoRow('שם פרטי', esc(report.firstName || (person && person.firstName)))}
              ${infoRow('שם משפחה', esc(report.lastName || (person && person.lastName)))}
              ${person ? infoRow('ת.ז.', esc(person.nationalId)) : ''}
              ${person ? infoRow('דרגה', esc(rankLabel(person.rank))) : ''}
              ${person ? infoRow('חיל', esc(person.corps)) : ''}
              ${person ? infoRow('טלפון', esc(person.phone)) : ''}
              ${person ? infoRow('עיר', esc(person.city)) : ''}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">פרטי העבירה</div></div>
          <div class="card-body">
            <div class="info-list">
              ${infoRow('עבירה', esc(report.offenseTitle))}
              ${offense ? infoRow('קוד', esc(offense.code)) : ''}
              ${offense ? infoRow('קטגוריה', esc(offense.category)) : ''}
              ${infoRow('חומרה', StatusBadge.renderPriority(report.severity))}
              ${infoRow('נקודות', esc(String(report.points)))}
              ${infoRow('קנס', report.fine ? `₪ ${Utils.formatCurrency(report.fine)}` : '—')}
              ${infoRow('מיקום', esc(report.location))}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderTabSuspension() {
    const suspended = report.suspensions || [];
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">התלייה</div>
          ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="window.addSuspension()">הוסף התלייה</button>` : ''}
        </div>
        <div class="card-body">
          ${suspended.length === 0 ? `<div class="empty-state-desc">אין רישומי התלייה לדו"ח זה.</div>` : `
            <table class="data-table">
              <thead><tr><th>תאריך</th><th>סיבה</th><th>תקופה</th><th>מאשר</th></tr></thead>
              <tbody>
                ${suspended.map(s => `<tr>
                  <td>${fdate(s.date)}</td>
                  <td>${esc(s.reason)}</td>
                  <td>${esc(s.period)} ימים</td>
                  <td>${esc(s.approver)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function renderTabConversions() {
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">המרות</div></div>
        <div class="card-body empty-state-desc">
          <p>לא בוצעו המרות לדו"ח זה.</p>
          ${canEdit ? `<button class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="Toast.info('פונקציית המרה בפיתוח')">הוסף המרה</button>` : ''}
        </div>
      </div>
    `;
  }

  function renderTabCancellations() {
    const cancelled = report.cancellations || [];
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">ביטולים</div>
          ${canEdit && report.status !== 'cancelled' ? `<button class="btn btn-outline-danger btn-sm" onclick="window.cancelReport()">ביטול דו"ח</button>` : ''}
        </div>
        <div class="card-body">
          ${cancelled.length === 0 ? `<div class="empty-state-desc">אין ביטולים לדו"ח זה.</div>` : `
            <table class="data-table">
              <thead><tr><th>תאריך</th><th>סיבה</th><th>מבטל</th></tr></thead>
              <tbody>
                ${cancelled.map(c => `<tr><td>${fdate(c.date)}</td><td>${esc(c.reason)}</td><td>${esc(c.cancelledBy)}</td></tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function renderTabDetails() {
    return `
      <div class="tab-section-grid">
        <div class="card">
          <div class="card-header"><div class="card-title">מסירת הדו"ח</div></div>
          <div class="card-body">
            <div class="info-list">
              ${infoRow('שיטת מסירה', esc(report.deliveryMethod))}
              ${infoRow('תאריך מסירה', fdate(report.deliveryDate))}
              ${infoRow('מקבל', esc(report.deliveryRecipient))}
              ${infoRow('סירב לחתום', report.refuseToSign ? 'כן' : 'לא')}
              ${infoRow('הערות מסירה', esc(report.deliveryRemarks))}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">מיקום</div></div>
          <div class="card-body">
            <div class="info-list">
              ${infoRow('עיר', esc(report.locationCity))}
              ${infoRow('כביש', esc(report.locationRoad))}
              ${infoRow('צומת', esc(report.locationJunction))}
              ${infoRow('מיקום מדויק', esc(report.locationExact))}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderTabVehicle() {
    const v = report.vehicle || {};
    return `
      <div class="tab-section-grid">
        <div class="card">
          <div class="card-header"><div class="card-title">רכב</div></div>
          <div class="card-body">
            <div class="info-list">
              ${infoRow('מספר רישוי אזרחי', v.lv_civilPlate || v.plate || '—')}
              ${infoRow('מספר רישוי צבאי', v.lv_militaryPlate || '—')}
              ${infoRow('סוג רישיון / מספר', ((v.lv_licenseType || '—') + ' / ' + (v.lv_licenseNumber || '—')))}
              ${infoRow('תוקף רישיון', v.lv_licenseExpiry ? fdate(v.lv_licenseExpiry) : '—')}
              ${infoRow('יצרן', v.make || '—')}
              ${infoRow('דגם', v.model || '—')}
              ${infoRow('שנת ייצור', v.year || '—')}
              ${infoRow('צבע', v.lv_vehicleColor || v.color || '—')}
              ${infoRow('סוג רכב', v.lv_vehicleType || v.type || '—')}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">רישיון נהיגה</div></div>
          <div class="card-body">
            <div class="info-list">
              ${infoRow('מספר רישיון', v.licenseNumber || '—')}
              ${infoRow('תוקף', fdate(v.licenseExpiry))}
              ${infoRow('קטגוריה', v.licenseCategory || '—')}
              ${infoRow('הגבלות', v.licenseRestrictions || '—')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderTabWitnesses() {
    const witnesses = report.witnesses || [];
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">עדים</div></div>
        <div class="card-body">
          ${witnesses.length === 0 ? `<div class="empty-state-desc">לא נוספו עדים לדו"ח זה.</div>` : `
            <table class="data-table">
              <thead><tr><th>#</th><th>מ"א</th><th>ת"ז</th><th>שם</th><th>סוג מעורבות</th><th>יחידה</th><th>בסיס שיטור</th></tr></thead>
              <tbody>
                ${witnesses.map((w, i) => `<tr>
                  <td>${i + 1}</td>
                  <td>${esc(w.militaryNumber)}</td>
                  <td>${esc(w.nationalId)}</td>
                  <td>${esc(w.name || ((w.firstName || '') + ' ' + (w.lastName || '')).trim())}</td>
                  <td>${esc(w.involvement || w.role)}</td>
                  <td>${esc(w.unit)}</td>
                  <td>${esc(w.policeBase)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function renderTabOffenseDesc() {
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">תיאור מפורט של העבירה</div></div>
        <div class="card-body">
          ${canEdit ? `
            <textarea id="edit-description" class="form-control" rows="8">${esc(report.description)}</textarea>
            <div class="form-actions" style="margin-top:12px">
              <button class="btn btn-primary btn-sm" onclick="window.saveDescription()">שמור תיאור</button>
            </div>
          ` : `
            <div class="text-block" style="white-space:pre-line;line-height:1.8">${esc(report.description)}</div>
          `}
          ${report.officerNotes ? `
            <div style="margin-top:var(--space-4)">
              <div class="info-list-label">הערות שוטר</div>
              <div class="text-block" style="white-space:pre-line">${esc(report.officerNotes)}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function renderTabOffenseId() {
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">מזהה עבירה</div></div>
        <div class="card-body">
          <div class="info-list">
            ${infoRow('מזהה דו"ח', esc(report.id))}
            ${infoRow('מספר דו"ח', esc(report.reportNumber))}
            ${offense ? infoRow('קוד עבירה', esc(offense.code)) : ''}
            ${offense ? infoRow('שם עבירה', esc(offense.title)) : ''}
            ${offense ? infoRow('קטגוריה', esc(offense.category)) : ''}
            ${infoRow('חומרה', esc(report.severity))}
            ${infoRow('נקודות', String(report.points || 0))}
            ${infoRow('קנס (₪)', report.fine ? Utils.formatCurrency(report.fine) : '0')}
            ${infoRow('מסגרת אכיפה', esc(report.enforcementFramework))}
          </div>
        </div>
      </div>
    `;
  }

  function renderTabLocationReport() {
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">דו"ח איתור</div></div>
        <div class="card-body">
          <div class="info-list">
            ${infoRow('מ"א מזהה עבירה', esc((report.delivery || {}).locatorMilNum))}
            ${infoRow('שם מזהה עבירה', esc(((report.delivery || {}).locatorFirstName || '') + ' ' + ((report.delivery || {}).locatorLastName || '')))}
            ${infoRow('סיבת דו"ח איתור', esc((report.delivery || {}).locateReason))}
          </div>
          ${report.deliveryMethod !== 'locate' ? '<div class="empty-state-desc" style="margin-top:12px">הדו"ח לא נמסר כדו"ח איתור.</div>' : ''}
        </div>
      </div>
    `;
  }

  function renderTabSignalReport() {
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">דו"ח אתת</div></div>
        <div class="card-body">
          <div class="info-list">
            ${infoRow('ל"ז מלאה', esc(td.at_fullTime))}
            ${infoRow('ספרות אמצעיות', esc(td.at_middleDigits))}
            ${infoRow('מרחק בין תחנה א׳ לתחנה ב׳', esc(td.at_stationDistance))}
            ${infoRow('סוג / צבע רכב (תחנה א׳)', esc((td.at_vehicleType || '') + ' ' + (td.at_vehicleColor || '')))}
            ${infoRow('אחר', esc(td.at_other))}
            ${infoRow('זיהה את העבירה בעצמו', yesNo(td.at_selfIdentified))}
            ${infoRow('פירוט עצירת הרכב', esc(td.at_stopDetails))}
            ${infoRow('אתת', esc((td.at_rank || '') + ' ' + (td.at_firstName || '') + ' ' + (td.at_lastName || '') + ' (' + (td.at_milNum || '—') + ')'))}
          </div>
        </div>
      </div>
    `;
  }

  function renderTabSpeed() {
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">עבירות מהירות ואמצעים טכנולוגיים</div></div>
        <div class="card-body">
          <div class="info-list">
            ${infoRow('מהירות שנמדדה במכשיר', esc(td.sp_measured))}
            ${infoRow('מהירות אחרי הפחתה', esc(td.sp_afterReduction))}
            ${infoRow('מרחק שנמדד במכשיר', esc(td.sp_distance))}
            ${infoRow('מהירות מותרת בכביש', esc(td.sp_allowedRoad))}
            ${infoRow('מהירות מותרת ע"פ רישיון רכב', esc(td.sp_allowedLicense))}
            ${infoRow('סוג הדרך', esc(td.sp_roadType))}
            ${infoRow('מספר מכשיר', esc(td.sp_deviceNumber))}
            ${infoRow('מספר מצלמה', esc(td.sp_cameraNumber))}
            ${infoRow('סוג מכשיר', esc(td.sp_deviceType))}
          </div>
        </div>
      </div>
    `;
  }

  function renderTabChecks() {
    const items = [['בדיקה עצמית', 'ck_self'], ['בדיקת תצוגה', 'ck_display'], ['בדיקת תיאום על', 'ck_coordination'], ['בדיקת כיול מהירות+מרחק', 'ck_calibration']];
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">בדיקות תקינות</div></div>
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>בדיקה</th><th>בוצעה</th></tr></thead>
            <tbody>
              ${items.map(([label, key]) => `<tr><td>${Utils.escHtml(label)}</td><td>${td[key] === 'yes' ? '<span class="badge badge-success">בוצעה</span>' : '<span class="badge badge-draft">לא בוצעה</span>'}</td></tr>`).join('')}
            </tbody>
          </table>
          <div class="info-list" style="margin-top:12px">
            ${infoRow('בדיקות בתחילת משמרת', esc((td.ck_startTime || '') + ' ' + (td.ck_startPlace || '')))}
            ${infoRow('בדיקות בסוף משמרת', esc((td.ck_endTime || '') + ' ' + (td.ck_endPlace || '')))}
            ${infoRow('מפעיל', esc((td.ck_operatorFirst || '') + ' ' + (td.ck_operatorLast || '') + ' (' + (td.ck_operatorMilNum || '—') + ')'))}
          </div>
        </div>
      </div>
    `;
  }

  function renderTabReliability() {
    const items = [
      ['rl_urban424', 'אכיפה בדרך עירונית: תמרור 424'], ['rl_lineOfSight', 'קו ראיה נקי מהפרעות'], ['rl_notHidden', 'רכב המטרה לא היה מוסתר'],
      ['rl_redPoint', 'נקודת הצבעה אדומה על מרכז רכב המטרה'], ['rl_sign426Start', 'תמרור 426 נבדק בתחילת משמרת'], ['rl_sign426End', 'תמרור 426 נבדק בסיום משמרת'],
      ['rl_weather', 'ללא גשם, שלג, ברד או חושך'], ['rl_shownToDriver', 'נתוני המדידה הוצגו בפני הנהג'], ['rl_driverRefused', 'הנהג סירב לראות את נתוני המדידה'],
    ];
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">אמינות הפעלה</div></div>
        <div class="card-body">
          <div class="info-list">
            ${items.map(([k, l]) => infoRow(l, td[k] === 'yes' ? 'כן' : 'לא')).join('')}
            ${infoRow('נתיב / מתוך נתיבים', esc((td.rl_lane || '—') + ' / ' + (td.rl_lanesTotal || '—')))}
            ${infoRow('תנועה', esc(td.rl_approach))}
            ${infoRow('טווח גילוי (מטר)', esc(td.rl_detectionRange))}
            ${infoRow('מרחק מפעיל מהתמרור (מטר)', esc(td.rl_operatorDistance))}
            ${infoRow('מפעיל', esc((td.rl_operatorName || '') + ' ' + (td.rl_operatorMilNum || '')))}
          </div>
        </div>
      </div>
    `;
  }

  function renderTabProsecutor() {
    const pr = report.prosecutor || {};
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">פרטי התובע</div></div>
        <div class="card-body">
          <div class="info-list">
            ${infoRow('שם התובע', pr.name || '—')}
            ${infoRow('מספר אישי', pr.militaryNumber || '—')}
            ${infoRow('יחידה', pr.unit || '—')}
            ${infoRow('טלפון', pr.phone || '—')}
            ${infoRow('תאריך הגשה', fdate(pr.filingDate))}
          </div>
          ${!pr.name ? '<div class="empty-state-desc" style="margin-top:12px">פרטי תובע לא מולאו עדיין.</div>' : ''}
        </div>
      </div>
    `;
  }

  function renderTabApproval() {
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">אישור הדו"ח</div></div>
        <div class="card-body">
          <div class="info-list">
            ${infoRow('סטטוס', StatusBadge.render(report.status))}
            ${infoRow('מאשר', esc(report.approvedBy))}
            ${infoRow('תאריך אישור', fdate(report.approvedAt))}
            ${infoRow('הערות', esc(report.approvalNotes))}
          </div>
          ${canEdit && report.status !== 'approved' ? `
            <div class="form-actions" style="margin-top:16px">
              <button class="btn btn-success" onclick="window.saveReportStatus('approved')">אשר דו"ח</button>
              <button class="btn btn-outline-danger" onclick="window.saveReportStatus('cancelled')">בטל דו"ח</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function renderTabStatuses() {
    const auditEntries = Storage.getCollection(Storage.KEYS.AUDIT_ENTRIES).filter(a => a.entityId === reportId);
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">היסטוריית סטטוסים</div></div>
        <div class="card-body">
          ${auditEntries.length === 0 ? '<div class="empty-state-desc">אין היסטוריית שינויים.</div>' : `
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

  function renderTabSummons() {
    const summons = report.summons || [];
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">זימונים</div>
          ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="Toast.info('הוספת זימון בפיתוח')">הוסף זימון</button>` : ''}
        </div>
        <div class="card-body">
          ${summons.length === 0 ? '<div class="empty-state-desc">אין זימונים לדו"ח זה.</div>' : `
            <table class="data-table">
              <thead><tr><th>תאריך</th><th>שעה</th><th>מיקום</th><th>נשלח</th></tr></thead>
              <tbody>
                ${summons.map(s => `<tr><td>${fdate(s.date)}</td><td>${esc(s.time)}</td><td>${esc(s.location)}</td><td>${s.sent ? 'כן' : 'לא'}</td></tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function renderTabFiles() {
    const attachments = report.attachments || [];
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">קבצים מצורפים</div>
          ${canEdit ? `<label class="btn btn-secondary btn-sm">הוסף קובץ <input type="file" hidden onchange="Toast.info('העלאת קבצים אינה נתמכת בסביבת הדגמה')"></label>` : ''}
        </div>
        <div class="card-body">
          ${attachments.length === 0 ? '<div class="empty-state-desc">אין קבצים מצורפים לדו"ח זה.</div>' : `
            <table class="data-table">
              <thead><tr><th>שם קובץ</th><th>גודל</th><th>הועלה</th></tr></thead>
              <tbody>
                ${attachments.map(a => `<tr><td>${esc(a.name)}</td><td>${esc(a.size)}</td><td>${fdate(a.uploadedAt)}</td></tr>`).join('')}
              </tbody>
            </table>
          `}
          <div class="demo-notice" style="margin-top:12px;font-size:var(--font-size-xs);color:var(--color-text-muted)">
            * העלאת קבצים אמיתיים אינה נתמכת בגרסת ההדגמה.
          </div>
        </div>
      </div>
    `;
  }

  function renderTabVerdict() {
    const v = report.verdict || {};
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">תוצאות שיפוט</div></div>
        <div class="card-body">
          <div class="info-list">
            ${infoRow('תאריך דיון', fdate(v.hearingDate))}
            ${infoRow('בית משפט', esc(v.court))}
            ${infoRow('פסיקה', esc(v.decision))}
            ${infoRow('קנס שנפסק (₪)', v.fine ? Utils.formatCurrency(v.fine) : '—')}
            ${infoRow('עונש', esc(v.punishment))}
            ${infoRow('הערות שופט', esc(v.judgeNotes))}
          </div>
          ${!v.hearingDate ? '<div class="empty-state-desc" style="margin-top:12px">הליך שיפוטי טרם התקיים.</div>' : ''}
        </div>
      </div>
    `;
  }

  // Save description
  window.saveDescription = function() {
    const textarea = Utils.el('edit-description');
    if (!textarea) return;
    report.description = textarea.value;
    report.updatedAt = new Date().toISOString();
    Storage.upsert(Storage.KEYS.POLICE_REPORTS, report);
    Audit.log({ module: 'policing', action: 'update', entityType: 'policeReport', entityId: reportId, description: `עדכון תיאור דו"ח ${report.reportNumber}` });
    Toast.success('התיאור נשמר');
  };

  // Cancel report
  window.cancelReport = async function() {
    const reason = await Modal.prompt({ title: 'ביטול דו"ח', message: 'הזן סיבת ביטול:' });
    if (!reason) return;
    if (!report.cancellations) report.cancellations = [];
    report.cancellations.push({ date: Utils.today(), reason, cancelledBy: Auth.getCurrentUser() ? Auth.getCurrentUser().firstName + ' ' + Auth.getCurrentUser().lastName : '' });
    report.status = 'cancelled';
    report.updatedAt = new Date().toISOString();
    Storage.upsert(Storage.KEYS.POLICE_REPORTS, report);
    Audit.log({ module: 'policing', action: 'cancel', entityType: 'policeReport', entityId: reportId, description: `ביטול דו"ח ${report.reportNumber}: ${reason}` });
    Toast.success('הדו"ח בוטל');
    setTimeout(() => Router.navigate('/officer-report-form', { id: reportId }), 400);
  };

  // Add suspension
  window.addSuspension = async function() {
    const reason = await Modal.prompt({ title: 'הוסף התלייה', message: 'הזן סיבת התלייה:' });
    if (!reason) return;
    if (!report.suspensions) report.suspensions = [];
    report.suspensions.push({ date: Utils.today(), reason, period: 30, approver: report.officerName });
    report.updatedAt = new Date().toISOString();
    Storage.upsert(Storage.KEYS.POLICE_REPORTS, report);
    Audit.log({ module: 'policing', action: 'suspend', entityType: 'policeReport', entityId: reportId, description: `התלייה לדו"ח ${report.reportNumber}: ${reason}` });
    Toast.success('ההתלייה נוספה');
    setTimeout(() => Router.navigate('/officer-report-form', { id: reportId }), 400);
  };
};
