/* service-work-prisoner-file.js — Gachlat workspace v3 */
'use strict';

window.Pages = window.Pages || {};

Pages['service-work-prisoner-file'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('incarceration')) { content.innerHTML = EmptyState.accessDenied(); return; }

  const fileId = query && query.id;
  const people = Storage.getCollection(Storage.KEYS.PEOPLE);
  const pMap = Object.fromEntries(people.map(p => [p.id, p]));
  const canEdit = Permissions.can('editPrisoner');

  if (!fileId) {
    if (query && query.new) { renderNewFilePage(); return; }
    renderList();
    return;
  }

  const file = Storage.getById(Storage.KEYS.SERVICE_WORK_FILES, fileId);
  if (!file) { content.innerHTML = EmptyState.notFound(fileId); return; }

  renderWorkspace(file);

  // ─── ensure gachlat sub-data ─────────────────────────────────────────────────
  function ensureGd(file) {
    if (!file.gachlat) {
      file.gachlat = {
        personalInfo: { idNumber:'', age:'', maritalStatus:'', educationYears:'', civilAddress:'', mast:'', militaryRole:'', profile:'', negativeTavan:'', dfar:'', indications:'' },
        offenses: [],
        legalInfo: { defenseAttorney:'', socialWorkerDate:'', bda:'', caseNumber:'', verdictDate:'' },
        sentenceActual: { actualDays:0, workDays:0 },
        sentenceCalcs: [],
        complaints: [],
        extensions: [],
        releaseInfo: { releaseCode:'', releaseReason:'', approverName:'', unitCode:'', releaseUnit:'', leaveDate:'', leaveTime:'', reportDate:'', reportTime:'', notes:'' },
      };
      saveFile(file);
    }
    return file.gachlat;
  }

  function saveFile(file) {
    file.updatedAt = new Date().toISOString();
    Storage.upsert(Storage.KEYS.SERVICE_WORK_FILES, file);
  }

  // ─── main workspace ──────────────────────────────────────────────────────────
  function renderWorkspace(file) {
    const person = pMap[file.personId];
    const gd = ensureGd(file);
    const rankLabel = id => { const r = RANK_MAP && RANK_MAP[id]; return r ? r.label : (id || '—'); };
    const esc = v => Utils.escHtml(v || '—');

    content.innerHTML = `
      <div class="page-wrapper" style="max-width:none;padding-bottom:40px">
        <div class="page-header compact" style="margin-bottom:12px">
          <div class="page-header-left">
            <h1 class="page-title" style="font-size:17px">${Utils.icon('work', 17)} תיק אסיר בעבודות שירות</h1>
            <p class="page-subtitle" style="font-size:11px;margin-top:2px">גחל״ת – ניהול תיק לפי מבנה תיק כלוא</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/service-work-prisoner-file')">${Utils.icon('chevronRight', 12)} חזרה לרשימה</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:256px 1fr;gap:14px;align-items:start">

          <!-- RIGHT summary card -->
          <div class="card" style="position:sticky;top:70px;z-index:10">
            <div class="card-header" style="padding:10px 14px;border-bottom:1px solid var(--color-border)">
              <div class="card-title" style="font-size:12px;font-weight:700">פרטי אסיר</div>
            </div>
            <div class="card-body" style="padding:12px 14px">
              <div style="margin-bottom:12px">
                <label class="form-label" style="font-size:11px;margin-bottom:4px">חיפוש לפי מספר אישי</label>
                <div style="display:flex;gap:6px">
                  <input id="g-ma-search" class="form-control" placeholder="מ.א" value="${person ? esc(person.militaryNumber) : ''}" style="font-size:12px;height:30px">
                  <button class="btn btn-ghost btn-sm" style="padding:0 8px;height:30px">${Utils.icon('search', 13)}</button>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:0">
                ${sRow('מ.א', person ? esc(person.militaryNumber) : '—')}
                ${sRow('דרגה', person ? esc(rankLabel(person.rank)) : '—')}
                ${sRow('סוג שירות', esc(file.workType || 'עבודת שירות'))}
                ${sRow('שם ושם משפחה', person ? esc(person.firstName + ' ' + person.lastName) : '—')}
                ${sRow('יחידת הצבה קודמת', esc(file.previousUnit || (person && person.unit) || '—'))}
                ${sRow('סוג רישום', esc(file.registrationType || 'גחל״ת'))}
                ${sRow('יחידה מעסיקה', esc(((window.DEMO_UNITS || []).find(function(u) { return u.id === file.employingUnit; }) || {}).name || file.employingUnit || '—'))}
                ${sRow('סטטוס תיק', StatusBadge.render(file.status))}
              </div>
              <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--color-border)">
                <div style="font-size:10px;color:var(--color-text-muted);margin-bottom:2px">מספר תיק</div>
                <div style="font-weight:700;font-size:13px;color:var(--color-primary)">${esc(file.fileNumber)}</div>
              </div>
            </div>
          </div>

          <!-- LEFT tabs -->
          <div id="gachlat-tabs">
            <div class="tabs-nav" role="tablist"></div>
            <div class="tab-panel" data-tab="personal">${tabPersonal(gd)}</div>
            <div class="tab-panel" data-tab="detention">${tabDetention(gd)}</div>
            <div class="tab-panel" data-tab="sentence">${tabSentence(gd)}</div>
            <div class="tab-panel" data-tab="behavior">${tabBehavior(gd)}</div>
            <div class="tab-panel" data-tab="extensions">${tabExtensions(gd)}</div>
            <div class="tab-panel" data-tab="release">${tabRelease(gd)}</div>
          </div>
        </div>
        ${Utils.classificationFooter()}
      </div>
    `;

    Tabs.create({
      containerId: 'gachlat-tabs',
      defaultTab: 'personal',
      tabs: [
        { id: 'personal',   label: 'מסך פרטים אישיים' },
        { id: 'detention',  label: 'מסך פרטי כליאה' },
        { id: 'sentence',   label: 'מסך חישוב עונש' },
        { id: 'behavior',   label: 'התנהגות' },
        { id: 'extensions', label: 'הארכות וגזר דין' },
        { id: 'release',    label: 'סיום מעצר' },
      ],
    });

    wireAll(file, gd);
  }

  function sRow(label, value) {
    return `<div style="display:flex;align-items:flex-start;padding:5px 0;border-bottom:1px solid var(--color-border)">
      <div style="font-size:10px;color:var(--color-text-muted);min-width:80px;padding-top:1px;flex-shrink:0">${label}</div>
      <div style="font-size:12px;font-weight:500">${value}</div>
    </div>`;
  }

  // ─── TAB 1: פרטים אישיים ─────────────────────────────────────────────────────
  function tabPersonal(gd) {
    const pi = gd.personalInfo;
    const v = k => Utils.escHtml(pi[k] || '');
    const sel = (field, opts) => opts.map(o => `<option${pi[field]===o?' selected':''}>${o}</option>`).join('');
    return `
      <h2 style="font-size:15px;font-weight:700;margin:0 0 14px;color:var(--color-text)">מסך פרטים אישיים</h2>

      <div class="card" style="margin-bottom:12px" id="gc-personal">
        <div class="card-header" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="window.gcToggle('gc-personal')">
          <div class="card-title">פרטים אישיים</div>
          <span class="gc-arrow" style="font-size:16px;color:var(--color-text-muted)">◀</span>
        </div>
        <div class="card-body gc-body">
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">תעודת זהות (ת.ז)</label><input type="text" class="form-control" id="g-pi-id" value="${v('idNumber')}" placeholder="000000000"></div>
            <div class="form-group"><label class="form-label">גיל</label><input type="number" class="form-control" id="g-pi-age" value="${v('age')}" min="18" max="60"></div>
            <div class="form-group"><label class="form-label">מצב משפחתי</label><select class="form-control" id="g-pi-marital"><option value=""></option>${sel('maritalStatus',['רווק','נשוי','גרוש','אלמן'])}</select></div>
            <div class="form-group"><label class="form-label">שנות לימוד</label><input type="number" class="form-control" id="g-pi-edu" value="${v('educationYears')}" min="0" max="25"></div>
          </div>
          <div style="margin-top:8px;text-align:left"><button class="btn btn-primary btn-sm" onclick="window.gcSavePersonal()">שמור</button></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:12px" id="gc-address">
        <div class="card-header" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="window.gcToggle('gc-address')">
          <div class="card-title">שיבוץ, כתובת ותפקיד</div>
          <span class="gc-arrow" style="font-size:16px;color:var(--color-text-muted)">◀</span>
        </div>
        <div class="card-body gc-body">
          <div class="form-row form-row-2">
            <div class="form-group" style="grid-column:1/-1"><label class="form-label">כתובת אזרחית</label><input type="text" class="form-control" id="g-pi-addr" value="${v('civilAddress')}" placeholder="רחוב, עיר"></div>
            <div class="form-group"><label class="form-label">מס״ט</label><input type="text" class="form-control" id="g-pi-mast" value="${v('mast')}"></div>
            <div class="form-group"><label class="form-label">תפקיד צבאי / מקצוע</label><input type="text" class="form-control" id="g-pi-role" value="${v('militaryRole')}"></div>
          </div>
          <div style="margin-top:8px;text-align:left"><button class="btn btn-primary btn-sm" onclick="window.gcSaveAddress()">שמור</button></div>
        </div>
      </div>

      <div class="card" id="gc-medical">
        <div class="card-header" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="window.gcToggle('gc-medical')">
          <div class="card-title">רפואה, פרופיל ואבחון</div>
          <span class="gc-arrow" style="font-size:16px;color:var(--color-text-muted)">◀</span>
        </div>
        <div class="card-body gc-body">
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">פרופיל</label><input type="text" class="form-control" id="g-pi-profile" value="${v('profile')}" placeholder="97"></div>
            <div class="form-group"><label class="form-label">טב״ן שלילי</label><select class="form-control" id="g-pi-tavan"><option value="">בחר</option>${sel('negativeTavan',['כן','לא'])}</select></div>
            <div class="form-group"><label class="form-label">דפ״ר</label><input type="text" class="form-control" id="g-pi-dfar" value="${v('dfar')}"></div>
            <div class="form-group" style="grid-column:1/-1"><label class="form-label">אינדיקציות</label><textarea class="form-control" id="g-pi-ind" rows="4">${v('indications')}</textarea></div>
          </div>
          <div style="margin-top:8px;text-align:left"><button class="btn btn-primary btn-sm" onclick="window.gcSaveMedical()">שמור</button></div>
        </div>
      </div>
    `;
  }

  // ─── TAB 2: פרטי כליאה ───────────────────────────────────────────────────────
  function tabDetention(gd) {
    const li = gd.legalInfo;
    const sa = gd.sentenceActual;
    const offenses = gd.offenses || [];
    const ev = (k) => Utils.escHtml(li[k] || '');
    const oRows = offenses.length
      ? offenses.map((o, i) => `<tr>
          <td>${i+1}</td>
          <td>${Utils.escHtml(o.details || '')}</td>
          <td>${Utils.escHtml(o.offenseType || '')}</td>
          <td>${Utils.escHtml(o.punishmentType || '')}</td>
          <td>${o.actualDays || 0}</td>
          <td>${o.workDays || 0}</td>
          <td><button class="row-action-btn" onclick="window.gcDelOffense(${i})">${Utils.icon('delete', 12)}</button></td>
        </tr>`).join('')
      : `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--color-text-muted)">אין עבירות מוזנות</td></tr>`;

    return `
      <h2 style="font-size:15px;font-weight:700;margin:0 0 14px;color:var(--color-text)">מסך פרטי כליאה</h2>

      <div class="card" style="margin-bottom:12px">
        <div class="card-header">
          <div class="card-title">העבירה והעונש</div>
          <button class="btn btn-primary btn-sm" id="btn-add-offense">${Utils.icon('plus', 13)} הוסף עבירה</button>
        </div>
        <div class="card-body" style="padding:0">
          <div style="overflow-x:auto">
            <table class="data-table">
              <thead><tr>
                <th style="width:44px">מס"ד</th><th>פרטי עבירה</th><th>סוג עבירה</th><th>סוג עונש</th><th>כליאה ממשית</th><th>עבודות צבאיות</th><th style="width:48px">פעולות</th>
              </tr></thead>
              <tbody id="gc-offense-tbody">${oRows}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:12px">
        <div class="card-header"><div class="card-title">הליך משפטי וליווי</div></div>
        <div class="card-body">
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">פרטי סנגור</label><input type="text" class="form-control" id="g-li-atty" value="${ev('defenseAttorney')}"></div>
            <div class="form-group"><label class="form-label">חו״ד מטפל – תאריך</label><input type="date" class="form-control" id="g-li-swdate" value="${li.socialWorkerDate || ''}"></div>
            <div class="form-group"><label class="form-label">בד״א</label><input type="text" class="form-control" id="g-li-bda" value="${ev('bda')}"></div>
            <div class="form-group"><label class="form-label">מספר תיק</label><input type="text" class="form-control" id="g-li-case" value="${ev('caseNumber')}"></div>
            <div class="form-group"><label class="form-label">תאריך פס״ד</label><input type="date" class="form-control" id="g-li-verdict" value="${li.verdictDate || ''}"></div>
          </div>
          <div style="margin-top:8px;text-align:left"><button class="btn btn-primary btn-sm" onclick="window.gcSaveLegal()">שמור</button></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">גזר דין בפועל (ימים)</div></div>
        <div class="card-body">
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">כליאה ממשית (ימים)</label><input type="number" class="form-control" id="g-sa-actual" value="${sa.actualDays || 0}" min="0"></div>
            <div class="form-group"><label class="form-label">עבודות צבאיות (ימים)</label><input type="number" class="form-control" id="g-sa-work" value="${sa.workDays || 0}" min="0"></div>
          </div>
          <div style="margin-top:8px;text-align:left"><button class="btn btn-primary btn-sm" onclick="window.gcSaveSentence()">שמור</button></div>
        </div>
      </div>
    `;
  }

  // ─── TAB 3: חישוב עונש ──────────────────────────────────────────────────────
  function tabSentence(gd) {
    const calcs = gd.sentenceCalcs || [];
    const DAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
    const dn = s => { if (!s) return '—'; const d = new Date(s+'T00:00:00'); return isNaN(d)?'—':DAYS[d.getDay()]; };
    const fd = s => s ? Utils.formatDate(s) : '—';

    const data = calcs;

    const rows = data.map((c, i) => `<tr>
      <td>${fd(c.startDate)}</td>
      <td>${c.months||0}</td>
      <td>${c.days||0}</td>
      <td>${fd(c.rawEndDate)}</td>
      <td>${dn(c.rawEndDate)}</td>
      <td>${fd(c.updatedEndDate)}</td>
      <td>${dn(c.updatedEndDate)}</td>
      <td>${c.vacations||0}</td>
      <td>${c.illness||0}</td>
      <td>${fd(c.finalEndDate)}</td>
      <td>${dn(c.finalEndDate)}</td>
      <td>${fd(c.shortenedEndDate)}</td>
      <td>${dn(c.shortenedEndDate)}</td>
      <td><button class="row-action-btn" onclick="window.gcDelCalc(${i})">${Utils.icon('delete',12)}</button></td>
    </tr>`).join('');

    return `
      <h2 style="font-size:15px;font-weight:700;margin:0 0 14px;color:var(--color-text)">מסך חישוב עונש</h2>
      <div class="card">
        <div class="card-header">
          <div class="card-title">חישוב תאריכי ריצוי עונש</div>
          <button class="btn btn-primary btn-sm" id="btn-add-calc">${Utils.icon('plus', 13)} הוסף חישוב</button>
        </div>
        <div class="card-body" style="padding:0">
          <div style="overflow-x:auto">
            <table class="data-table" style="min-width:1080px;font-size:11.5px">
              <thead><tr>
                <th>תאריך תחילת ריצוי</th>
                <th>חודשים</th>
                <th>ימים</th>
                <th>סיום גולמי</th>
                <th>ביום בשבוע</th>
                <th>סיום עדכני</th>
                <th>ביום בשבוע</th>
                <th>חופשות</th>
                <th>מחלה</th>
                <th>תאריך סופי</th>
                <th>ביום בשבוע</th>
                <th>סיום לאחר קיצור</th>
                <th>פיזור ביום</th>
                <th style="width:36px"></th>
              </tr></thead>
              <tbody>${rows || '<tr><td colspan="14" style="text-align:center;padding:24px;color:var(--color-text-muted)">אין חישובי עונש בתיק. לחץ "הוסף חישוב" להזנת נתוני ריצוי.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ─── TAB 4: התנהגות ──────────────────────────────────────────────────────────
  function tabBehavior(gd) {
    const complaints = gd.complaints || [];
    const cRows = complaints.length
      ? complaints.map((c, i) => `<tr>
          <td>${c.serial || i+1}</td>
          <td>${c.date ? Utils.formatDate(c.date) : ''}</td>
          <td>${Utils.escHtml(c.facility || '')}</td>
          <td>${Utils.escHtml(c.offenseCode || '')}</td>
          <td>${c.quantity || 1}</td>
          <td>${c.conditional ? 'כן' : 'לא'}</td>
          <td>${Utils.escHtml(c.punishment || '')}</td>
          <td>
            <button class="row-action-btn" onclick="window.gcEditComplaint(${i})">${Utils.icon('edit', 12)}</button>
            <button class="row-action-btn" onclick="window.gcDelComplaint(${i})">${Utils.icon('delete', 12)}</button>
          </td>
        </tr>`).join('')
      : `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--color-text-muted)">אין תלונות מוזנות</td></tr>`;

    return `
      <h2 style="font-size:15px;font-weight:700;margin:0 0 14px;color:var(--color-text)">התנהגות</h2>

      <div style="display:flex;gap:8px;margin-bottom:12px">
        <button class="btn btn-primary btn-sm" id="gbeh-btn-c" onclick="window.gcBehTab('c')">תלונות</button>
        <button class="btn btn-secondary btn-sm" id="gbeh-btn-w" onclick="window.gcBehTab('w')">שהייה באגף</button>
        <button class="btn btn-secondary btn-sm" id="gbeh-btn-d" onclick="window.gcBehTab('d')">גרירת תלונות הסא״פ</button>
      </div>

      <div id="gbeh-pane-c">
        <div class="card">
          <div class="card-header">
            <div class="card-title">תלונות</div>
            <button class="btn btn-primary btn-sm" id="btn-add-complaint">${Utils.icon('plus', 13)} הוסף תלונה</button>
          </div>
          <div class="card-body" style="padding:0">
            <div style="overflow-x:auto">
              <table class="data-table">
                <thead><tr>
                  <th>סידורי</th><th>תאריך</th><th>מתקן מעצר</th><th>סימול העבירה</th><th>כמות</th><th>על תנאי</th><th>תיאור העונש</th><th>פעולות</th>
                </tr></thead>
                <tbody id="gc-complaint-tbody">${cRows}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div id="gbeh-pane-w" style="display:none">
        <div class="card"><div class="card-header"><div class="card-title">שהייה באגף</div></div>
          <div class="card-body"><p style="color:var(--color-text-muted);font-size:13px">אין רשומות שהייה באגף.</p></div>
        </div>
      </div>

      <div id="gbeh-pane-d" style="display:none">
        <div class="card"><div class="card-header"><div class="card-title">גרירת תלונות הסא״פ</div></div>
          <div class="card-body"><p style="color:var(--color-text-muted);font-size:13px">אין גרירות תלונות.</p></div>
        </div>
      </div>
    `;
  }

  // ─── TAB 5: הארכות וגזר דין ─────────────────────────────────────────────────
  function tabExtensions(gd) {
    const exts = gd.extensions || [];
    const eRows = exts.length
      ? exts.map((e, i) => `<tr>
          <td>${i+1}</td>
          <td>${e.date ? Utils.formatDate(e.date) : ''}</td>
          <td>${Utils.escHtml(e.referenceType || '')}</td>
          <td>${Utils.escHtml(e.offense || '')}</td>
          <td>${e.quantity || ''}</td>
          <td><button class="row-action-btn" onclick="window.gcDelExt(${i})">${Utils.icon('delete', 12)}</button></td>
        </tr>`).join('')
      : `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--color-text-muted)">אין רשומות</td></tr>`;

    return `
      <h2 style="font-size:15px;font-weight:700;margin:0 0 14px;color:var(--color-text)">הארכות וגזר דין</h2>
      <div class="card">
        <div class="card-header">
          <div class="card-title">סיום מעצר</div>
          <button class="btn btn-primary btn-sm" id="btn-add-ext">${Utils.icon('plus', 13)} הוסף</button>
        </div>
        <div class="card-body" style="padding:0">
          <div style="overflow-x:auto">
            <table class="data-table">
              <thead><tr>
                <th>מס"ד</th><th>תאריך</th><th>סוג אסמכתא</th><th>עבירה</th><th>כמות</th><th>פעולות</th>
              </tr></thead>
              <tbody id="gc-ext-tbody">${eRows}</tbody>
            </table>
          </div>
          <div style="padding:10px 14px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--color-border)">
            <span style="font-size:12px;color:var(--color-text-muted)">סה"כ ${exts.length} רשומות</span>
            <div style="display:flex;gap:6px">
              <button class="btn btn-ghost btn-sm" disabled style="opacity:.4">◀</button>
              <button class="btn btn-ghost btn-sm" disabled style="opacity:.4">▶</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ─── TAB 6: סיום מעצר ───────────────────────────────────────────────────────
  function tabRelease(gd) {
    const ri = gd.releaseInfo || {};
    const ev = k => Utils.escHtml(ri[k] || '');
    return `
      <h2 style="font-size:15px;font-weight:700;margin:0 0 14px;color:var(--color-text)">סיום מעצר</h2>
      <div class="card">
        <div class="card-body">
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">קוד סיבת שחרור</label>
              <div style="display:flex;gap:6px">
                <input type="text" class="form-control" id="g-ri-code" value="${ev('releaseCode')}" style="flex:1">
                <button class="btn btn-ghost btn-sm">${Utils.icon('search', 13)}</button>
              </div>
            </div>
            <div class="form-group"><label class="form-label">סיבת שחרור</label><input type="text" class="form-control" id="g-ri-reason" value="${ev('releaseReason')}"></div>
            <div class="form-group"><label class="form-label">שם מאשר עזיבה</label><input type="text" class="form-control" id="g-ri-approver" value="${ev('approverName')}"></div>
            <div class="form-group">
              <label class="form-label">קוד יחידה</label>
              <div style="display:flex;gap:6px">
                <input type="text" class="form-control" id="g-ri-unitcode" value="${ev('unitCode')}" style="flex:1">
                <button class="btn btn-ghost btn-sm">${Utils.icon('search', 13)}</button>
              </div>
            </div>
            <div class="form-group" style="grid-column:1/-1"><label class="form-label">יחידת שחרור</label><input type="text" class="form-control" id="g-ri-unit" value="${ev('releaseUnit')}"></div>
            <div class="form-group"><label class="form-label">תאריך עזיבה</label><input type="date" class="form-control" id="g-ri-ldate" value="${ri.leaveDate||''}"></div>
            <div class="form-group"><label class="form-label">שעת עזיבה</label><input type="time" class="form-control" id="g-ri-ltime" value="${ri.leaveTime||''}"></div>
            <div class="form-group"><label class="form-label">תאריך התייצבות</label><input type="date" class="form-control" id="g-ri-rdate" value="${ri.reportDate||''}"></div>
            <div class="form-group"><label class="form-label">שעת התייצבות</label><input type="time" class="form-control" id="g-ri-rtime" value="${ri.reportTime||''}"></div>
            <div class="form-group" style="grid-column:1/-1"><label class="form-label">הערות</label><textarea class="form-control" id="g-ri-notes" rows="4">${ev('notes')}</textarea></div>
          </div>
          <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--color-border);display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-sm" style="background:#1e3a5f;color:#fff;border:none;border-radius:20px;padding:6px 16px" onclick="Toast.info('העברה לבסיס אחר')">העברה לבסיס אחר</button>
            <button class="btn btn-sm" style="background:#1e3a5f;color:#fff;border:none;border-radius:20px;padding:6px 16px" onclick="Toast.info('צו הצבה סופי')">צו הצבה סופי</button>
            <button class="btn btn-primary btn-sm" style="border-radius:20px;padding:6px 16px" onclick="window.gcSaveRelease()">סיום מעצר</button>
            <button class="btn btn-sm" style="background:#1e3a5f;color:#fff;border:none;border-radius:20px;padding:6px 16px" onclick="Toast.info('עדכון פרטי שלש')">עדכון פרטי שלש</button>
          </div>
        </div>
      </div>
    `;
  }

  // ─── wire all interactions ───────────────────────────────────────────────────
  function wireAll(file, gd) {

    // collapse toggle
    window.gcToggle = (cardId) => {
      const card = Utils.el(cardId);
      if (!card) return;
      const body = card.querySelector('.gc-body');
      const arrow = card.querySelector('.gc-arrow');
      if (!body) return;
      const hidden = body.style.display === 'none';
      body.style.display = hidden ? '' : 'none';
      if (arrow) arrow.textContent = hidden ? '◀' : '▼';
    };

    // Tab 1 saves
    window.gcSavePersonal = () => {
      const pi = gd.personalInfo;
      pi.idNumber = (Utils.el('g-pi-id')||{}).value||'';
      pi.age = (Utils.el('g-pi-age')||{}).value||'';
      pi.maritalStatus = (Utils.el('g-pi-marital')||{}).value||'';
      pi.educationYears = (Utils.el('g-pi-edu')||{}).value||'';
      saveFile(file); Toast.success('פרטים אישיים נשמרו');
    };
    window.gcSaveAddress = () => {
      const pi = gd.personalInfo;
      pi.civilAddress = (Utils.el('g-pi-addr')||{}).value||'';
      pi.mast = (Utils.el('g-pi-mast')||{}).value||'';
      pi.militaryRole = (Utils.el('g-pi-role')||{}).value||'';
      saveFile(file); Toast.success('שיבוץ וכתובת נשמרו');
    };
    window.gcSaveMedical = () => {
      const pi = gd.personalInfo;
      pi.profile = (Utils.el('g-pi-profile')||{}).value||'';
      pi.negativeTavan = (Utils.el('g-pi-tavan')||{}).value||'';
      pi.dfar = (Utils.el('g-pi-dfar')||{}).value||'';
      pi.indications = (Utils.el('g-pi-ind')||{}).value||'';
      saveFile(file); Toast.success('נתוני רפואה נשמרו');
    };

    // Tab 2 saves
    window.gcSaveLegal = () => {
      const li = gd.legalInfo;
      li.defenseAttorney = (Utils.el('g-li-atty')||{}).value||'';
      li.socialWorkerDate = (Utils.el('g-li-swdate')||{}).value||'';
      li.bda = (Utils.el('g-li-bda')||{}).value||'';
      li.caseNumber = (Utils.el('g-li-case')||{}).value||'';
      li.verdictDate = (Utils.el('g-li-verdict')||{}).value||'';
      saveFile(file); Toast.success('הליך משפטי נשמר');
    };
    window.gcSaveSentence = () => {
      gd.sentenceActual.actualDays = parseInt((Utils.el('g-sa-actual')||{}).value)||0;
      gd.sentenceActual.workDays = parseInt((Utils.el('g-sa-work')||{}).value)||0;
      saveFile(file); Toast.success('גזר דין נשמר');
    };

    // Tab 6 save
    window.gcSaveRelease = () => {
      const ri = gd.releaseInfo;
      ri.releaseCode = (Utils.el('g-ri-code')||{}).value||'';
      ri.releaseReason = (Utils.el('g-ri-reason')||{}).value||'';
      ri.approverName = (Utils.el('g-ri-approver')||{}).value||'';
      ri.unitCode = (Utils.el('g-ri-unitcode')||{}).value||'';
      ri.releaseUnit = (Utils.el('g-ri-unit')||{}).value||'';
      ri.leaveDate = (Utils.el('g-ri-ldate')||{}).value||'';
      ri.leaveTime = (Utils.el('g-ri-ltime')||{}).value||'';
      ri.reportDate = (Utils.el('g-ri-rdate')||{}).value||'';
      ri.reportTime = (Utils.el('g-ri-rtime')||{}).value||'';
      ri.notes = (Utils.el('g-ri-notes')||{}).value||'';
      saveFile(file); Toast.success('פרטי סיום מעצר נשמרו');
    };

    // Tab 2 offense
    const btnO = Utils.el('btn-add-offense');
    if (btnO) btnO.onclick = () => modalOffense(file, gd, -1);
    window.gcDelOffense = (i) => { gd.offenses.splice(i,1); saveFile(file); reloadDetention(file,gd); };

    // Tab 3 calc
    const btnC = Utils.el('btn-add-calc');
    if (btnC) btnC.onclick = () => modalCalc(file, gd);
    window.gcDelCalc = (i) => { gd.sentenceCalcs.splice(i,1); saveFile(file); reloadSentence(file,gd); };

    // Tab 4 behavior
    window.gcBehTab = (t) => {
      ['c','w','d'].forEach(k => {
        const pane = Utils.el('gbeh-pane-'+k);
        const btn = Utils.el('gbeh-btn-'+k);
        if (pane) pane.style.display = k===t ? '' : 'none';
        if (btn) btn.className = k===t ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
      });
    };
    const btnComp = Utils.el('btn-add-complaint');
    if (btnComp) btnComp.onclick = () => modalComplaint(file, gd, -1);
    window.gcEditComplaint = (i) => modalComplaint(file, gd, i);
    window.gcDelComplaint = (i) => { gd.complaints.splice(i,1); saveFile(file); reloadBehavior(file,gd); };

    // Tab 5 extensions
    const btnE = Utils.el('btn-add-ext');
    if (btnE) btnE.onclick = () => modalExtension(file, gd, -1);
    window.gcDelExt = (i) => { gd.extensions.splice(i,1); saveFile(file); reloadExtensions(file,gd); };
  }

  // ─── tab reload helpers ──────────────────────────────────────────────────────
  function reloadDetention(file, gd) {
    const p = document.querySelector('#gachlat-tabs [data-tab="detention"]');
    if (p) { p.innerHTML = tabDetention(gd); }
    const b = Utils.el('btn-add-offense');
    if (b) b.onclick = () => modalOffense(file, gd, -1);
    window.gcDelOffense = (i) => { gd.offenses.splice(i,1); saveFile(file); reloadDetention(file,gd); };
    window.gcSaveLegal = () => {
      const li = gd.legalInfo;
      li.defenseAttorney=(Utils.el('g-li-atty')||{}).value||''; li.socialWorkerDate=(Utils.el('g-li-swdate')||{}).value||'';
      li.bda=(Utils.el('g-li-bda')||{}).value||''; li.caseNumber=(Utils.el('g-li-case')||{}).value||''; li.verdictDate=(Utils.el('g-li-verdict')||{}).value||'';
      saveFile(file); Toast.success('הליך משפטי נשמר');
    };
    window.gcSaveSentence = () => {
      gd.sentenceActual.actualDays=parseInt((Utils.el('g-sa-actual')||{}).value)||0;
      gd.sentenceActual.workDays=parseInt((Utils.el('g-sa-work')||{}).value)||0;
      saveFile(file); Toast.success('גזר דין נשמר');
    };
  }

  function reloadSentence(file, gd) {
    const p = document.querySelector('#gachlat-tabs [data-tab="sentence"]');
    if (p) p.innerHTML = tabSentence(gd);
    const b = Utils.el('btn-add-calc');
    if (b) b.onclick = () => modalCalc(file, gd);
    window.gcDelCalc = (i) => { gd.sentenceCalcs.splice(i,1); saveFile(file); reloadSentence(file,gd); };
  }

  function reloadBehavior(file, gd) {
    const p = document.querySelector('#gachlat-tabs [data-tab="behavior"]');
    if (p) p.innerHTML = tabBehavior(gd);
    const b = Utils.el('btn-add-complaint');
    if (b) b.onclick = () => modalComplaint(file, gd, -1);
    window.gcEditComplaint = (i) => modalComplaint(file, gd, i);
    window.gcDelComplaint = (i) => { gd.complaints.splice(i,1); saveFile(file); reloadBehavior(file,gd); };
    window.gcBehTab = (t) => {
      ['c','w','d'].forEach(k => {
        const pane = Utils.el('gbeh-pane-'+k);
        const btn = Utils.el('gbeh-btn-'+k);
        if (pane) pane.style.display = k===t?'':'none';
        if (btn) btn.className = k===t?'btn btn-primary btn-sm':'btn btn-secondary btn-sm';
      });
    };
  }

  function reloadExtensions(file, gd) {
    const p = document.querySelector('#gachlat-tabs [data-tab="extensions"]');
    if (p) p.innerHTML = tabExtensions(gd);
    const b = Utils.el('btn-add-ext');
    if (b) b.onclick = () => modalExtension(file, gd, -1);
    window.gcDelExt = (i) => { gd.extensions.splice(i,1); saveFile(file); reloadExtensions(file,gd); };
  }

  // ─── modals ──────────────────────────────────────────────────────────────────
  function modalOffense(file, gd, idx) {
    const o = idx >= 0 ? gd.offenses[idx] : {};
    const sel = (cur, opts) => opts.map(v=>`<option${cur===v?' selected':''}>${v}</option>`).join('');
    Modal.open({
      title: 'עבירה ועונש', size: 'lg',
      body: `<div class="form-row form-row-2">
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">פרטי עבירה</label><input type="text" class="form-control" id="gom-det" value="${Utils.escHtml(o.details||'')}"></div>
        <div class="form-group"><label class="form-label">סוג עבירה</label><select class="form-control" id="gom-otype"><option></option>${sel(o.offenseType,['אי ציות','עריקות','תקיפה','הפרת משמעת','אחר'])}</select></div>
        <div class="form-group"><label class="form-label">סוג עונש</label><select class="form-control" id="gom-ptype"><option></option>${sel(o.punishmentType,['כליאה ממשית','עבודות שירות','על תנאי','קנס','אחר'])}</select></div>
        <div class="form-group"><label class="form-label">ימי כליאה ממשית</label><input type="number" class="form-control" id="gom-act" value="${o.actualDays||0}" min="0"></div>
        <div class="form-group"><label class="form-label">ימי עבודות צבאיות</label><input type="number" class="form-control" id="gom-wrk" value="${o.workDays||0}" min="0"></div>
      </div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>
               <button class="btn btn-primary" onclick="window._gcSO(${idx})">שמור</button>`,
    });
    window._gcSO = (i) => {
      const e = { details:Utils.el('gom-det').value, offenseType:Utils.el('gom-otype').value, punishmentType:Utils.el('gom-ptype').value, actualDays:parseInt(Utils.el('gom-act').value)||0, workDays:parseInt(Utils.el('gom-wrk').value)||0 };
      if (i>=0) gd.offenses[i]=e; else gd.offenses.push(e);
      saveFile(file); Modal.close(); reloadDetention(file,gd);
    };
  }

  function modalCalc(file, gd) {
    Modal.open({
      title: 'חישוב עונש חדש', size: 'lg',
      body: `<div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">תאריך תחילת ריצוי</label><input type="date" class="form-control" id="gsc-s" value="${Utils.today()}"></div>
        <div class="form-group"><label class="form-label">מספר חודשים</label><input type="number" class="form-control" id="gsc-m" value="0" min="0"></div>
        <div class="form-group"><label class="form-label">מספר ימים</label><input type="number" class="form-control" id="gsc-d" value="0" min="0"></div>
        <div class="form-group"><label class="form-label">חופשות (ימים)</label><input type="number" class="form-control" id="gsc-v" value="0" min="0"></div>
        <div class="form-group"><label class="form-label">מחלה (ימים)</label><input type="number" class="form-control" id="gsc-i" value="0" min="0"></div>
      </div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>
               <button class="btn btn-primary" onclick="window._gcSC()">חשב ושמור</button>`,
    });
    window._gcSC = () => {
      const s = Utils.el('gsc-s').value;
      if (!s) { Toast.error('חובה להזין תאריך תחילה'); return; }
      const m = parseInt(Utils.el('gsc-m').value)||0;
      const d = parseInt(Utils.el('gsc-d').value)||0;
      const v = parseInt(Utils.el('gsc-v').value)||0;
      const il = parseInt(Utils.el('gsc-i').value)||0;
      if (m < 0 || d < 0 || v < 0 || il < 0) { Toast.error('ערכים שליליים אינם חוקיים'); return; }
      if (m + d <= 0) { Toast.error('משך העונש חייב להיות גדול מאפס'); return; }
      const DAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
      const dn = dt => DAYS[dt.getDay()];
      const ts = dt => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
      const raw = new Date(s+'T00:00:00');
      raw.setMonth(raw.getMonth()+m); raw.setDate(raw.getDate()+d);
      const fin = new Date(raw); fin.setDate(fin.getDate()+v+il);
      const shr = new Date(fin); shr.setDate(shr.getDate()-Math.floor((m*30+d)/3));
      gd.sentenceCalcs.push({ startDate:s, months:m, days:d, vacations:v, illness:il,
        rawEndDate:ts(raw), updatedEndDate:ts(raw), finalEndDate:ts(fin), shortenedEndDate:ts(shr) });
      saveFile(file); Modal.close(); reloadSentence(file,gd);
    };
  }

  function modalComplaint(file, gd, idx) {
    const c = idx>=0 ? gd.complaints[idx] : {};
    Modal.open({
      title: idx>=0 ? 'עריכת תלונה' : 'תלונה חדשה',
      body: `<div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">תאריך</label><input type="date" class="form-control" id="gcm-d" value="${c.date||Utils.today()}"></div>
        <div class="form-group"><label class="form-label">מתקן מעצר</label><input type="text" class="form-control" id="gcm-f" value="${Utils.escHtml(c.facility||'')}"></div>
        <div class="form-group"><label class="form-label">סימול העבירה</label><input type="text" class="form-control" id="gcm-c" value="${Utils.escHtml(c.offenseCode||'')}"></div>
        <div class="form-group"><label class="form-label">כמות</label><input type="number" class="form-control" id="gcm-q" value="${c.quantity||1}" min="1"></div>
        <div class="form-group"><label class="form-label">על תנאי</label><select class="form-control" id="gcm-cn"><option value="false"${!c.conditional?' selected':''}>לא</option><option value="true"${c.conditional?' selected':''}>כן</option></select></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">תיאור העונש</label><textarea class="form-control" id="gcm-p" rows="2">${Utils.escHtml(c.punishment||'')}</textarea></div>
      </div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>
               <button class="btn btn-primary" onclick="window._gcSCom(${idx})">שמור</button>`,
    });
    window._gcSCom = (i) => {
      const e = { serial: i>=0 ? (gd.complaints[i].serial||i+1) : gd.complaints.length+1,
        date:Utils.el('gcm-d').value, facility:Utils.el('gcm-f').value, offenseCode:Utils.el('gcm-c').value,
        quantity:parseInt(Utils.el('gcm-q').value)||1, conditional:Utils.el('gcm-cn').value==='true', punishment:Utils.el('gcm-p').value };
      if (i>=0) gd.complaints[i]=e; else gd.complaints.push(e);
      saveFile(file); Modal.close(); reloadBehavior(file,gd);
    };
  }

  function modalExtension(file, gd, idx) {
    const e = idx>=0 ? gd.extensions[idx] : {};
    const sel = (cur, opts) => opts.map(v=>`<option${cur===v?' selected':''}>${v}</option>`).join('');
    Modal.open({
      title: 'הארכה חדשה',
      body: `<div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">תאריך</label><input type="date" class="form-control" id="gem-d" value="${e.date||Utils.today()}"></div>
        <div class="form-group"><label class="form-label">סוג אסמכתא</label><select class="form-control" id="gem-rt"><option></option>${sel(e.referenceType,['גזר דין','הארכה שיפוטית','צו מעצר','אחר'])}</select></div>
        <div class="form-group"><label class="form-label">עבירה</label><input type="text" class="form-control" id="gem-o" value="${Utils.escHtml(e.offense||'')}"></div>
        <div class="form-group"><label class="form-label">כמות (ימים)</label><input type="number" class="form-control" id="gem-q" value="${e.quantity||0}" min="0"></div>
      </div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>
               <button class="btn btn-primary" onclick="window._gcSE(${idx})">שמור</button>`,
    });
    window._gcSE = (i) => {
      const entry = { date:Utils.el('gem-d').value, referenceType:Utils.el('gem-rt').value, offense:Utils.el('gem-o').value, quantity:parseInt(Utils.el('gem-q').value)||0 };
      if (i>=0) gd.extensions[i]=entry; else gd.extensions.push(entry);
      saveFile(file); Modal.close(); reloadExtensions(file,gd);
    };
  }

  // ─── list view ───────────────────────────────────────────────────────────────
  function renderList() {
    const getData = () => Storage.getCollection(Storage.KEYS.SERVICE_WORK_FILES).map(f => Object.assign({}, f, { startDate: f.startDate || f.sentenceStart, fileNumber: f.fileNumber || ('SW-' + String(f.id).replace(/\D/g, '').padStart(5, '0')), workType: f.workType || '—' })).sort((a,b)=>(b.startDate||'').localeCompare(a.startDate||''));
    content.innerHTML = `
      <div class="page-wrapper">
        ${Utils.pageHeader('גחל"ת עובדי שירות', Utils.pageMeta())}
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          ${canEdit ? `<button class="btn btn-primary" id="btn-new">${Utils.icon('plus', 14)} תיק חדש</button>` : ''}
        </div>
        <div class="table-panel">
          <div class="table-panel-header">תיקי עבודת שירות</div>
          <div id="sw-table"></div>
        </div>
        ${Utils.classificationFooter()}
      </div>`;
    DataTable.create({
      containerId:'sw-table', data:getData(), rowKey:'id',
      columns:[
        { key:'fileNumber', label:'מספר תיק', tdClass:'td-number' },
        { key:'personId', label:'שם', render:v=>{ const p=pMap[v]; return p?Utils.escHtml(p.firstName+' '+p.lastName):'—'; } },
        { key:'personId', label:'מ"א', tdClass:'td-id', render:v=>{ const p=pMap[v]; return p?Utils.escHtml(p.militaryNumber):'—'; } },
        { key:'workType', label:'סוג עבודה' },
        { key:'startDate', label:'תחילה', render:v=>Utils.formatDate(v) },
        { key:'status', label:'סטטוס', render:v=>StatusBadge.render(v) },
      ],
      actions: row=>`<button class="row-action-btn" onclick="Router.navigate('/service-work-prisoner-file',{id:'${row.id}'})">${Utils.icon('view',14)}</button>`,
      onRowClick: row=>Router.navigate('/service-work-prisoner-file',{id:row.id}),
      emptyMessage:'אין תיקי עבודת שירות',
    });
    if (Utils.el('btn-new')) Utils.el('btn-new').onclick = () => Router.navigate('/service-work-prisoner-file', { new: 1 });
  }

  // ─── full-page new-file entry screen (all initial file data in one place) ────
  function renderNewFilePage() {
    const inp = (id, label, extra, req) => `<div class="form-group"><label class="form-label">${label}${req ? ' <span class="required">*</span>' : ''}</label><input id="${id}" class="form-control" ${extra || ''}></div>`;
    const sel = (id, label, opts, req) => `<div class="form-group"><label class="form-label">${label}${req ? ' <span class="required">*</span>' : ''}</label><select id="${id}" class="form-control"><option value="">בחר</option>${opts.map(o => `<option>${o}</option>`).join('')}</select></div>`;
    const section = (title, icon, body) => `<div class="page-section"><div class="section-header"><div class="section-title">${Utils.icon(icon, 18)} ${title}</div></div>${body}</div>`;
    const units = DEMO_UNITS.filter(u => u.type !== 'canteen');

    content.innerHTML = `
      <div class="page-wrapper">
        ${Utils.pageHeader('פתיחת תיק גחל"ת עובדי שירות', Utils.pageMeta())}
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
          <span style="font-size:12px;color:var(--color-text-muted)"><span class="required">*</span> שדות חובה — שאר הפרטים ניתנים להשלמה בתיק לאחר היצירה</span>
          <button class="btn btn-secondary" style="margin-right:auto" onclick="Router.navigate('/service-work-prisoner-file')">ביטול</button>
          <button class="btn btn-primary" id="sw-save-btn">צור תיק ופתח</button>
        </div>
        <form id="sw-new-form" novalidate>
          ${section('פרטים אישיים', 'user', `
            <div class="form-row form-row-3">
              <div class="form-group"><label class="form-label">מספר אישי <span class="required">*</span></label>
                <div style="display:flex;gap:6px"><input id="sw-mil" class="form-control"><button type="button" class="btn btn-secondary btn-sm" id="sw-lookup">${Utils.icon('search', 13)}</button></div></div>
              ${inp('sw-first', 'שם פרטי', 'readonly')}${inp('sw-last', 'שם משפחה', 'readonly')}
              ${inp('sw-rank', 'דרגה', 'readonly')}${inp('sw-id', 'תעודת זהות (ת.ז)')}${inp('sw-age', 'גיל', 'type="number" min="18" max="60"')}
              ${sel('sw-marital', 'מצב משפחתי', ['רווק', 'נשוי', 'גרוש', 'אלמן'])}${inp('sw-edu', 'שנות לימוד', 'type="number" min="0" max="25"')}
            </div>`)}
          ${section('שיבוץ, כתובת ותפקיד', 'report', `
            <div class="form-row form-row-3">
              <div class="form-group"><label class="form-label">יחידה מעסיקה <span class="required">*</span></label>
                <select id="sw-unit" class="form-control"><option value="">בחר יחידה</option>${units.map(u => `<option value="${u.id}">${Utils.escHtml(u.name)}</option>`).join('')}</select></div>
              ${inp('sw-supervisor', 'מפקד / אחראי')}${inp('sw-addr', 'כתובת אזרחית', 'placeholder="רחוב, עיר"')}
              ${inp('sw-mast', 'מס״ט')}${inp('sw-role', 'תפקיד צבאי / מקצוע')}
              ${sel('sw-worktype', 'סוג עבודה', ['עבודת שירות', 'ניקיון', 'גינון', 'לוגיסטיקה', 'שמירה'])}
            </div>`)}
          ${section('רפואה, פרופיל ואבחון', 'alert', `
            <div class="form-row form-row-3">
              ${inp('sw-profile', 'פרופיל', 'placeholder="97"')}${sel('sw-tavan', 'טב״ן שלילי', ['כן', 'לא'])}${inp('sw-dfar', 'דפ״ר')}
              <div class="form-group" style="grid-column:1/-1"><label class="form-label">אינדיקציות</label><textarea id="sw-ind" class="form-control" rows="2"></textarea></div>
            </div>`)}
          ${section('העבירה והעונש', 'alert', `
            <div class="form-row form-row-3">
              ${inp('sw-off-details', 'פרטי עבירה', '', true)}
              <div class="form-group"><label class="form-label">סוג עבירה <span class="required">*</span></label>
                <select id="sw-off-type" class="form-control"><option value="">בחר</option>${['אי ציות', 'עריקות', 'תקיפה', 'הפרת משמעת', 'אחר'].map(o => `<option>${o}</option>`).join('')}</select></div>
              ${sel('sw-off-punish', 'סוג עונש', ['כליאה ממשית', 'עבודות שירות', 'על תנאי', 'קנס', 'אחר'])}
              ${inp('sw-off-actual', 'כליאה ממשית (ימים)', 'type="number" min="0" value="0"')}${inp('sw-off-work', 'עבודות צבאיות (ימים)', 'type="number" min="0" value="0"')}
            </div>`)}
          ${section('הליך משפטי וליווי', 'report', `
            <div class="form-row form-row-3">
              ${inp('sw-atty', 'פרטי סנגור')}${inp('sw-swdate', 'חו״ד מטפל – תאריך', 'type="date"')}${inp('sw-bda', 'בד״א')}
              ${inp('sw-case', 'מספר תיק')}${inp('sw-verdict', 'תאריך פס״ד', 'type="date"')}
            </div>`)}
          ${section('חישוב עונש (נתוני פתיחה)', 'calendar', `
            <div class="form-row form-row-3">
              ${inp('sw-start', 'תאריך תחילת ריצוי', `type="date" value="${Utils.today()}"`, true)}${inp('sw-months', 'חודשים', 'type="number" min="0" value="0"')}${inp('sw-days', 'ימים', 'type="number" min="0" value="30"')}
              ${inp('sw-vac', 'חופשות (ימים)', 'type="number" min="0" value="0"')}${inp('sw-ill', 'מחלה (ימים)', 'type="number" min="0" value="0"')}
            </div>`)}
          <div id="sw-errors" class="form-error-summary" style="display:none"></div>
        </form>
        ${Utils.classificationFooter()}
      </div>
    `;

    let person = null;
    const $ = id => Utils.el(id);
    $('sw-lookup').onclick = () => {
      const mil = $('sw-mil').value.trim();
      person = people.find(p => p.militaryNumber === mil) || null;
      if (!person) { Toast.error('לא נמצא אדם עם מספר אישי זה'); return; }
      const open = Storage.getCollection(Storage.KEYS.SERVICE_WORK_FILES).find(f => f.personId === person.id && f.status === 'active');
      if (open) { Toast.error('לאדם זה כבר קיים תיק גחל"ת פעיל'); person = null; return; }
      $('sw-first').value = person.firstName; $('sw-last').value = person.lastName;
      $('sw-rank').value = (RANK_MAP[person.rank] || {}).label || '';
      $('sw-id').value = person.nationalId || '';
      if (person.birthDate) $('sw-age').value = Math.max(18, new Date().getFullYear() - new Date(person.birthDate).getFullYear());
      if (person.address) $('sw-addr').value = person.address;
      if (person.unitId) $('sw-unit').value = person.unitId;
    };

    $('sw-save-btn').onclick = () => {
      const errs = [];
      const need = (id, label) => { if (!$(id).value.trim()) { errs.push(label); $(id).style.borderColor = 'var(--color-danger)'; } else $(id).style.borderColor = ''; };
      if (!person) errs.push('יש לאתר אדם לפי מספר אישי');
      need('sw-unit', 'יחידה מעסיקה'); need('sw-off-details', 'פרטי עבירה'); need('sw-off-type', 'סוג עבירה'); need('sw-start', 'תאריך תחילת ריצוי');
      const box = $('sw-errors');
      if (errs.length) {
        box.innerHTML = '<div class="form-error-summary-title">יש להשלים:</div><ul>' + errs.map(e => `<li>${Utils.escHtml(e)}</li>`).join('') + '</ul>';
        box.style.display = 'block'; box.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      box.style.display = 'none';
      const rawN = id => $(id).value.trim() === '' ? 0 : Number($(id).value);
      const numErrs = [];
      [['sw-months', 'חודשים'], ['sw-days', 'ימים'], ['sw-vac', 'חופשות'], ['sw-ill', 'מחלה'], ['sw-off-actual', 'כליאה ממשית'], ['sw-off-work', 'עבודות צבאיות']].forEach(([id, l]) => {
        const x = rawN(id);
        if (!Number.isInteger(x) || x < 0) { numErrs.push(l + ' — מספר שלם לא שלילי'); $(id).style.borderColor = 'var(--color-danger)'; } else $(id).style.borderColor = '';
      });
      const startStr = $('sw-start').value;
      if (!startStr || isNaN(new Date(startStr + 'T00:00:00').getTime())) numErrs.push('תאריך תחילת ריצוי לא תקין');
      if (!numErrs.length && rawN('sw-months') + rawN('sw-days') <= 0) { numErrs.push('משך העונש חייב להיות גדול מאפס (חודשים או ימים)'); $('sw-months').style.borderColor = $('sw-days').style.borderColor = 'var(--color-danger)'; }
      if (numErrs.length) {
        const box0 = $('sw-errors'); box0.innerHTML = '<div class="form-error-summary-title">יש לתקן:</div><ul>' + numErrs.map(e => `<li>${Utils.escHtml(e)}</li>`).join('') + '</ul>';
        box0.style.display = 'block'; box0.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
      }
      const n = id => Math.trunc(rawN(id));
      const v = id => $(id).value.trim();
      const start = $('sw-start').value, m = n('sw-months'), d = n('sw-days'), vac = n('sw-vac'), ill = n('sw-ill');
      const ts = dt => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
      const raw = new Date(start + 'T00:00:00'); raw.setMonth(raw.getMonth() + m); raw.setDate(raw.getDate() + d);
      const fin = new Date(raw); fin.setDate(fin.getDate() + vac + ill);
      const totalDays = Utils.daysBetween(start, ts(fin));
      if (!(totalDays > 0) || ts(fin) < start) { const b = $('sw-errors'); b.innerHTML = 'חישוב העונש אינו תקין — תאריך הסיום חייב להיות אחרי תאריך התחלה'; b.style.display = 'block'; return; }
      const unit = DEMO_UNITS.find(u => u.id === v('sw-unit'));
      const gd = {
        personalInfo: { idNumber: v('sw-id'), age: v('sw-age'), maritalStatus: v('sw-marital'), educationYears: v('sw-edu'), civilAddress: v('sw-addr'), mast: v('sw-mast'), militaryRole: v('sw-role'), profile: v('sw-profile'), negativeTavan: v('sw-tavan'), dfar: v('sw-dfar'), indications: v('sw-ind') },
        offenses: [{ details: v('sw-off-details'), offenseType: v('sw-off-type'), punishmentType: v('sw-off-punish'), actualDays: n('sw-off-actual'), workDays: n('sw-off-work') }],
        legalInfo: { defenseAttorney: v('sw-atty'), socialWorkerDate: v('sw-swdate'), bda: v('sw-bda'), caseNumber: v('sw-case'), verdictDate: v('sw-verdict') },
        sentenceActual: { actualDays: n('sw-off-actual'), workDays: n('sw-off-work') },
        sentenceCalcs: (m || d) ? [{ startDate: start, months: m, days: d, vacations: vac, illness: ill, rawEndDate: ts(raw), updatedEndDate: ts(raw), finalEndDate: ts(fin), shortenedEndDate: ts(fin) }] : [],
        complaints: [], extensions: [],
        releaseInfo: { releaseCode: '', releaseReason: '', approverName: '', unitCode: '', releaseUnit: '', leaveDate: '', leaveTime: '', reportDate: '', reportTime: '', notes: '' },
      };
      const nf = {
        id: 'sw_' + Utils.generateId(), fileNumber: 'SW-' + String(Math.floor(Math.random() * 90000) + 10000),
        personId: person.id, militaryNumber: person.militaryNumber, rank: person.rank, serviceType: person.serviceType,
        employingUnit: v('sw-unit'), supervisorName: v('sw-supervisor'), workType: v('sw-worktype'),
        offense: v('sw-off-details'), baseId: (unit && unit.baseId) || person.baseId || 'b100',
        startDate: start, sentenceStart: start, endDate: ts(fin), sentenceEnd: ts(fin), sentence: totalDays,
        hoursRequired: totalDays * 8, hoursCompleted: 0, status: 'active', notes: '', workLog: [],
        gachlat: gd, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      Storage.upsert(Storage.KEYS.SERVICE_WORK_FILES, nf);
      Audit.log({ module: 'incarceration', action: 'create', entityType: 'gachlatFile', entityId: nf.id, description: `פתיחת תיק גחל"ת עובדי שירות ${nf.fileNumber}` });
      Toast.success('התיק נפתח');
      Router.navigate('/service-work-prisoner-file', { id: nf.id });
    };
  }
};
