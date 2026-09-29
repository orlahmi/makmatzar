/* gachlat.js — v3 — גחל"ת: diagnostic candidate management */
'use strict';

window.Pages = window.Pages || {};
window.Pages['gachlat'] = function(query) {
  var KEY = Storage.KEYS.GACHLAT_CANDIDATES;
  var SS  = GachlatScreeningService;

  /* ── SEED demo data once ──────────────────────────────────────────────────── */
  (function seedDemo() {
    var existing = Storage.getCollection(KEY);
    if (existing.length) return;
    var now = new Date();
    function daysAgo(n) { var d = new Date(now); d.setDate(d.getDate() - n); return d.toISOString(); }
    var DEMO = [
      {
        id: 'gc001', personId: 'p001', prisonerFileId: 'pf001',
        personalNumber: '8012345', name: 'דוד לוי', rank: 'טוראי', unit: 'גולני',
        age: 21, serviceType: 'חובה', prisonerStatus: 'כלוא', offense: 'הפרת משמעות',
        profile: '82', entryDate: daysAgo(30), daysInCustody: 30,
        candidateType: 'mandatory', candidateReasons: ['חבוש (שירות חובה)'],
        assessmentStatus: 'new', assessorName: '', scheduledDate: '',
        refusalReason: '', assessmentNotes: '', recommendation: '',
        background: { investigatedBefore: false, notes: 'ירידה בביצועים לאחרונה' },
        history: [{ action: 'created', label: 'מועמד נוסף', at: daysAgo(30) }],
        createdAt: daysAgo(30), updatedAt: daysAgo(30),
      },
      {
        id: 'gc002', personId: 'p002', prisonerFileId: 'pf002',
        personalNumber: '9023456', name: 'יוסי כהן', rank: 'רב"ט', unit: 'נח"ל',
        age: 20, serviceType: 'חובה', prisonerStatus: 'כלוא', offense: 'היעדרות',
        profile: '77', entryDate: daysAgo(12), daysInCustody: 12,
        candidateType: 'mandatory', candidateReasons: ['חבוש (שירות חובה)'],
        assessmentStatus: 'pending', assessorName: '', scheduledDate: '',
        refusalReason: '', assessmentNotes: '', recommendation: '',
        background: { investigatedBefore: false, notes: '' },
        history: [
          { action: 'created', label: 'מועמד נוסף', at: daysAgo(12) },
          { action: 'status_change', label: 'עבר לממתין לבדיקה', at: daysAgo(11) },
        ],
        createdAt: daysAgo(12), updatedAt: daysAgo(11),
      },
      {
        id: 'gc003', personId: 'p003', prisonerFileId: 'pf003',
        personalNumber: '7034567', name: 'רון אברהם', rank: 'סמל', unit: 'שריון',
        age: 23, serviceType: 'קבע', prisonerStatus: 'כלוא', offense: 'עריקות',
        profile: '97', entryDate: daysAgo(45), daysInCustody: 45,
        candidateType: 'mandatory', candidateReasons: ['עבירת עריקות'],
        assessmentStatus: 'scheduled', assessorName: 'ד"ר חנה גולן', scheduledDate: daysAgo(-3),
        assessmentTime: '09:00', assessmentLocation: 'חדר 12',
        refusalReason: '', assessmentNotes: '', recommendation: '',
        background: { investigatedBefore: true, notes: 'נחקר במצ"ח לפני שנה' },
        history: [
          { action: 'created', label: 'מועמד נוסף', at: daysAgo(45) },
          { action: 'status_change', label: 'עבר לממתין לבדיקה', at: daysAgo(44) },
          { action: 'scheduled', label: 'נקבע אבחון עם ד"ר חנה גולן', at: daysAgo(40) },
        ],
        createdAt: daysAgo(45), updatedAt: daysAgo(40),
      },
      {
        id: 'gc004', personId: 'p004', prisonerFileId: 'pf004',
        personalNumber: '8045678', name: 'אבי שפירא', rank: 'טוראי', unit: 'חי"ר',
        age: 19, serviceType: 'חובה', prisonerStatus: 'כלוא', offense: 'גנבה',
        profile: '64', entryDate: daysAgo(20), daysInCustody: 20,
        candidateType: 'optional', candidateReasons: ['גיל 25 ומטה', 'עונש 20 ימים ומעלה'],
        assessmentStatus: 'offered', assessorName: '', scheduledDate: '',
        refusalReason: '', assessmentNotes: '', recommendation: '',
        background: { investigatedBefore: false, notes: '' },
        history: [
          { action: 'created', label: 'מועמד נוסף', at: daysAgo(20) },
          { action: 'offered', label: 'הוצע אבחון', at: daysAgo(18) },
        ],
        createdAt: daysAgo(20), updatedAt: daysAgo(18),
      },
      {
        id: 'gc005', personId: 'p005', prisonerFileId: 'pf005',
        personalNumber: '9056789', name: 'מיכאל גרינברג', rank: 'רב"ט', unit: 'תותחנים',
        age: 22, serviceType: 'חובה', prisonerStatus: 'כלוא', offense: 'תקיפה',
        profile: '82', entryDate: daysAgo(35), daysInCustody: 35,
        candidateType: 'optional', candidateReasons: ['עונש 20 ימים ומעלה'],
        assessmentStatus: 'refused', assessorName: '', scheduledDate: '',
        refusalReason: 'המועמד סירב לשתף פעולה עם ההליך', assessmentNotes: '', recommendation: '',
        background: { investigatedBefore: false, notes: '' },
        history: [
          { action: 'created', label: 'מועמד נוסף', at: daysAgo(35) },
          { action: 'offered', label: 'הוצע אבחון', at: daysAgo(33) },
          { action: 'refused', label: 'סירב לאבחון', at: daysAgo(30) },
        ],
        createdAt: daysAgo(35), updatedAt: daysAgo(30),
      },
      {
        id: 'gc006', personId: 'p006', prisonerFileId: 'pf006',
        personalNumber: '7067890', name: 'נתן בר-לב', rank: 'סמ"ר', unit: 'הנדסה קרבית',
        age: 24, serviceType: 'חובה', prisonerStatus: 'כלוא', offense: 'אלימות',
        profile: '97', entryDate: daysAgo(60), daysInCustody: 60,
        candidateType: 'mandatory', candidateReasons: ['חבוש (שירות חובה)'],
        assessmentStatus: 'completed', assessorName: 'מאיה רוזן', scheduledDate: daysAgo(5),
        refusalReason: '', assessmentNotes: 'אבחון הושלם. נמצא מותאם לתוכנית שיקומית.',
        recommendation: 'מומלץ לשיקום',
        background: { investigatedBefore: false, notes: 'ידוע כבעל קשיים בין-אישיים ביחידה' },
        history: [
          { action: 'created', label: 'מועמד נוסף', at: daysAgo(60) },
          { action: 'scheduled', label: 'נקבע אבחון', at: daysAgo(20) },
          { action: 'completed', label: 'אבחון בוצע', at: daysAgo(5) },
        ],
        createdAt: daysAgo(60), updatedAt: daysAgo(5),
      },
      {
        id: 'gc007', personId: 'p007', prisonerFileId: 'pf007',
        personalNumber: '8078901', name: 'שמואל הר-צבי', rank: 'טוראי', unit: 'חי"ר',
        age: 18, serviceType: 'חובה', prisonerStatus: 'כלוא', offense: 'AWOL',
        profile: '77', entryDate: daysAgo(8), daysInCustody: 8,
        candidateType: 'mandatory', candidateReasons: ['חבוש (שירות חובה)'],
        assessmentStatus: 'done', assessorName: 'מאיה רוזן', scheduledDate: daysAgo(2),
        refusalReason: '', assessmentNotes: 'תהליך הושלם במלואו.',
        recommendation: 'לא נדרש המשך מעקב',
        background: { investigatedBefore: false, notes: '' },
        history: [
          { action: 'created', label: 'מועמד נוסף', at: daysAgo(8) },
          { action: 'scheduled', label: 'נקבע אבחון', at: daysAgo(6) },
          { action: 'completed', label: 'אבחון בוצע', at: daysAgo(3) },
          { action: 'done', label: 'הושלם', at: daysAgo(2) },
        ],
        createdAt: daysAgo(8), updatedAt: daysAgo(2),
      },
      {
        id: 'gc008', personId: 'p008', prisonerFileId: 'pf008',
        personalNumber: '9089012', name: 'אלי מזרחי', rank: 'טוראי', unit: 'חיל אוויר',
        age: 26, serviceType: 'קבע', prisonerStatus: 'כלוא', offense: 'הפרת פקודות',
        profile: '97', entryDate: daysAgo(15), daysInCustody: 15,
        candidateType: 'not_candidate', candidateReasons: ['לא עומד בקריטריונים לגחל"ת (טיוטה — נדרש אישור)'],
        assessmentStatus: 'irrelevant', assessorName: '', scheduledDate: '',
        refusalReason: '', assessmentNotes: '', recommendation: '',
        background: { investigatedBefore: false, notes: '' },
        history: [{ action: 'created', label: 'מועמד נוסף', at: daysAgo(15) }],
        createdAt: daysAgo(15), updatedAt: daysAgo(15),
      },
      {
        id: 'gc009', personId: 'p009', prisonerFileId: null,
        personalNumber: '6090123', name: 'ברק עמית', rank: 'טוראי', unit: 'צנחנים',
        age: 22, serviceType: 'חובה', prisonerStatus: 'כלוא', offense: 'שימוש בסמים',
        profile: '77', entryDate: daysAgo(5), daysInCustody: 5,
        candidateType: 'optional', candidateReasons: ['גיל 25 ומטה'],
        assessmentStatus: 'interested', assessorName: '', scheduledDate: '',
        refusalReason: '', assessmentNotes: '', recommendation: '',
        background: { investigatedBefore: false, notes: 'ציין כי היה בלחץ' },
        history: [
          { action: 'created', label: 'מועמד נוסף', at: daysAgo(5) },
          { action: 'offered', label: 'הוצע אבחון', at: daysAgo(4) },
          { action: 'interested', label: 'מעוניין באבחון', at: daysAgo(3) },
        ],
        createdAt: daysAgo(5), updatedAt: daysAgo(3),
      },
    ];
    DEMO.forEach(function(c) { if (!Storage.getById(KEY, c.id)) Storage.upsert(KEY, c); });
  })();

  // one source of truth: repair identities from person/prisoner and sync missing candidates
  SS.refresh();

  /* ── CONSTANTS ────────────────────────────────────────────────────────────── */
  var TABS = [
    { key: 'all',       label: 'הכל' },
    { key: 'new',       label: 'חדשים' },
    { key: 'mandatory', label: 'חובה' },
    { key: 'optional',  label: 'רשות' },
    { key: 'refused',   label: 'סירבו' },
    { key: 'scheduled', label: 'נקבע אבחון' },
    { key: 'done',      label: 'הושלמו' },
  ];

  var DRAWER_SECTIONS = [
    { key: 'details',    label: 'פרטי החייל' },
    { key: 'candidacy',  label: 'התאמה לגחל"ת' },
    { key: 'hard',       label: 'קריטריונים קשיחים' },
    { key: 'flexible',   label: 'קריטריונים גמישים' },
    { key: 'status',     label: 'סטטוס התהליך' },
    { key: 'background', label: 'מידע מקדים' },
    { key: 'followup',   label: 'יומן מעקב' },
    { key: 'assessment', label: 'אבחון' },
    { key: 'summary',    label: 'סיכום אבחון' },
    { key: 'prior',      label: 'אבחונים קודמים' },
    { key: 'history',    label: 'היסטוריית פעילות' },
  ];

  var GACHLAT_QUESTIONNAIRES = {
    'עריקות': [
      { key: 'q_why_left', label: 'ספר לי במילים שלך מה קרה ולמה עזבת את היחידה' },
      { key: 'q_duration', label: 'כמה זמן היית בחוץ ואיפה שהית?' },
      { key: 'q_plan_return', label: 'האם תכננת לחזור? מה היה המניע?' },
      { key: 'q_first_time', label: 'האם זו הפעם הראשונה שעזבת ללא רשות?' },
      { key: 'q_others', label: 'האם היו איתך אחרים? מה קרה איתם?' },
      { key: 'q_continue', label: 'האם אתה מתכוון להמשיך בהתנהגות זו?' },
    ],
    'שימוש בסמים': [
      { key: 'q_substance', label: 'ספר לי על השימוש בחומרים' },
      { key: 'q_coping', label: 'איך אתה מתמודד ללא שימוש כרגע?' },
      { key: 'q_motivation', label: 'מה גרם לשימוש בתקופת השירות?' },
      { key: 'q_help', label: 'האם ביקשת עזרה בעבר?' },
    ],
    'כללי': [
      { key: 'q_tell_me', label: 'ספר לי במילים שלך למה אתה פה' },
      { key: 'q_what_happened', label: 'מה קרה?' },
      { key: 'q_why_offense', label: 'למה ביצעת את העבירה?' },
      { key: 'q_first_time', label: 'האם זו פעם ראשונה?' },
      { key: 'q_others', label: 'האם היו איתך אחרים? מה קרה איתם?' },
      { key: 'q_continue', label: 'האם אתה מתכוון להמשיך בהתנהגות?' },
    ],
  };

  /* ── STATE ────────────────────────────────────────────────────────────────── */
  var state = {
    filters: { personalNumber: '', name: '', unit: '', serviceType: '', assessmentStatus: '', offense: '', assessor: '', flex: {} },
    activeTab: 'all',
    openId: (query && query.id) || null,
    drawerSection: 'details',
  };

  /* ── HELPERS ─────────────────────────────────────────────────────────────── */
  function getAll() { return Storage.getCollection(KEY); }

  function getFiltered(tab, filters) {
    var data = getAll();
    if (tab === 'new')       data = data.filter(function(c) { return c.assessmentStatus === 'new'; });
    else if (tab === 'mandatory') data = data.filter(function(c) { return c.candidateType === 'mandatory'; });
    else if (tab === 'optional')  data = data.filter(function(c) { return c.candidateType === 'optional'; });
    else if (tab === 'refused')   data = data.filter(function(c) { return c.assessmentStatus === 'refused'; });
    else if (tab === 'scheduled') data = data.filter(function(c) { return c.assessmentStatus === 'scheduled'; });
    else if (tab === 'done')      data = data.filter(function(c) { return c.assessmentStatus === 'completed' || c.assessmentStatus === 'done'; });
    if (filters.personalNumber) data = data.filter(function(c) { return (c.personalNumber || '').includes(filters.personalNumber); });
    if (filters.name)           data = data.filter(function(c) { return (c.name || '').includes(filters.name); });
    if (filters.unit)           data = data.filter(function(c) { return (c.unit || '').includes(filters.unit); });
    if (filters.serviceType)    data = data.filter(function(c) { return c.serviceType === filters.serviceType; });
    if (filters.assessmentStatus) data = data.filter(function(c) { return c.assessmentStatus === filters.assessmentStatus; });
    if (filters.assessor)       data = data.filter(function(c) { return (c.assessorName || '').includes(filters.assessor); });
    var flexIds = Object.keys(filters.flex || {}).filter(function(k) { return filters.flex[k]; });
    if (flexIds.length) data = data.filter(function(c) {
      var st = SS.criteriaStatus(c).flexible;
      return flexIds.every(function(id) { return st.some(function(k) { return k.id === id && k.met; }); });
    });
    if (filters.offense)        data = data.filter(function(c) { return (c.offense || '').includes(filters.offense); });
    return data;
  }

  function save(candidate) {
    candidate.updatedAt = new Date().toISOString();
    Storage.upsert(KEY, candidate);
    Audit.log({ module: 'gachlat', action: 'update', entityType: 'candidate', entityId: candidate.id, description: 'עדכון מועמד ' + candidate.name });
  }

  function addHistory(candidate, action, label) {
    if (!candidate.history) candidate.history = [];
    candidate.history.push({ action: action, label: label, at: new Date().toISOString() });
  }

  function kpiCounts() {
    var all = getAll();
    return {
      total:     all.length,
      mandatory: all.filter(function(c) { return c.candidateType === 'mandatory'; }).length,
      optional:  all.filter(function(c) { return c.candidateType === 'optional'; }).length,
      pending:   all.filter(function(c) { return c.assessmentStatus === 'new' || c.assessmentStatus === 'pending' || c.assessmentStatus === 'offered' || c.assessmentStatus === 'interested'; }).length,
      refused:   all.filter(function(c) { return c.assessmentStatus === 'refused'; }).length,
      done:      all.filter(function(c) { return c.assessmentStatus === 'completed' || c.assessmentStatus === 'done'; }).length,
    };
  }

  function tabCounts() {
    var all = getAll();
    return {
      all:       all.length,
      new:       all.filter(function(c) { return c.assessmentStatus === 'new'; }).length,
      mandatory: all.filter(function(c) { return c.candidateType === 'mandatory'; }).length,
      optional:  all.filter(function(c) { return c.candidateType === 'optional'; }).length,
      refused:   all.filter(function(c) { return c.assessmentStatus === 'refused'; }).length,
      scheduled: all.filter(function(c) { return c.assessmentStatus === 'scheduled'; }).length,
      done:      all.filter(function(c) { return c.assessmentStatus === 'completed' || c.assessmentStatus === 'done'; }).length,
    };
  }

  function categoryForOffense(offense) {
    var o = (offense || '').toLowerCase();
    if (o.indexOf('עריק') !== -1) return 'עריקות';
    if (o.indexOf('סמים') !== -1 || o.indexOf('סם') !== -1) return 'שימוש בסמים';
    return 'כללי';
  }

  function questionsForOffense(offense) {
    var o = (offense || '').toLowerCase();
    if (o.indexOf('עריק') !== -1) return GACHLAT_QUESTIONNAIRES['עריקות'];
    if (o.indexOf('סמים') !== -1 || o.indexOf('סם') !== -1) return GACHLAT_QUESTIONNAIRES['שימוש בסמים'];
    return GACHLAT_QUESTIONNAIRES['כללי'];
  }

  /* ── RENDER ──────────────────────────────────────────────────────────────── */
  var content = Utils.el('page-content');
  content.innerHTML = buildPage();
  wireAll();

  /* ── PAGE BUILDER ────────────────────────────────────────────────────────── */
  function buildPage() {
    var data   = getFiltered(state.activeTab, state.filters);
    var counts = tabCounts();
    var kpi    = kpiCounts();
    return (
      '<div class="page-wrapper">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)">' +
          '<h1 style="font-size:22px;font-weight:700;margin:0">גחל"ת — ניהול מועמדים לאבחון</h1>' +
        '</div>' +
        buildKpiCards(kpi) +
        buildFilters() +
        buildTabs(counts) +
        buildTable(data) +
        buildDrawer() +
        Utils.classificationFooter() +
      '</div>'
    );
  }

  /* ── KPI CARDS ───────────────────────────────────────────────────────────── */
  function buildKpiCards(kpi) {
    function card(label, val, accent) {
      return '<div class="card" style="padding:var(--space-4);position:relative;overflow:hidden">' +
        '<div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;text-align:right">' + label + '</div>' +
        '<div style="font-size:26px;font-weight:700;text-align:right;line-height:1;color:' + (accent || 'var(--color-text-primary)') + '">' + val + '</div>' +
      '</div>';
    }
    return (
      '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:var(--space-3);margin-bottom:var(--space-4)">' +
        card('סה"כ מועמדים',    String(kpi.total),     'var(--color-primary,#2563eb)') +
        card('חובה',            String(kpi.mandatory), 'var(--color-danger,#ef4444)') +
        card('רשות',            String(kpi.optional),  'var(--color-info,#3b82f6)') +
        card('ממתינים לאבחון', String(kpi.pending),   '') +
        card('סירבו',           String(kpi.refused),   'var(--color-danger,#ef4444)') +
        card('הושלמו',          String(kpi.done),      'var(--color-success,#10b981)') +
      '</div>'
    );
  }

  /* ── FILTERS ─────────────────────────────────────────────────────────────── */
  function buildFilters() {
    var f = state.filters;
    var statusOpts = Object.keys(SS.ASSESSMENT_STATUS_LABELS).map(function(v) {
      return '<option value="' + v + '"' + (f.assessmentStatus === v ? ' selected' : '') + '>' + SS.ASSESSMENT_STATUS_LABELS[v] + '</option>';
    }).join('');

    return (
      '<div class="card" style="margin-bottom:var(--space-3);padding:var(--space-3)">' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end">' +
          gcInp('gc-f-pn', 'מספר אישי',  f.personalNumber) +
          gcInp('gc-f-nm', 'שם',          f.name) +
          gcInp('gc-f-un', 'יחידה',       f.unit) +
          gcInp('gc-f-of', 'עבירה',       f.offense) +
          gcInp('gc-f-ev', 'מאבחנת',      f.assessor) +
          '<select id="gc-f-st" class="gc-filter form-control" style="height:32px;font-size:13px;min-width:110px;flex:1">' +
            '<option value="">— סוג שירות</option>' +
            ['חובה','קבע','מילואים'].map(function(v) { return '<option value="' + v + '"' + (f.serviceType === v ? ' selected' : '') + '>' + v + '</option>'; }).join('') +
          '</select>' +
          '<select id="gc-f-as" class="gc-filter form-control" style="height:32px;font-size:13px;min-width:130px;flex:1">' +
            '<option value="">— סטטוס אבחון</option>' + statusOpts +
          '</select>' +
          '<button type="button" class="btn btn-secondary" id="gc-filter-clear" style="height:32px">נקה סינון</button>' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center;margin-top:10px;padding-top:8px;border-top:1px solid var(--color-border)">' +
          '<span style="font-size:12px;font-weight:600;color:var(--color-text-muted)">קריטריונים גמישים (טיוטה):</span>' +
          SS.FLEXIBLE_CRITERIA.map(function(k) {
            return '<label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" class="gc-filter gc-flex" data-flex="' + k.id + '"' + ((f.flex || {})[k.id] ? ' checked' : '') + '> ' + Utils.escHtml(k.label) + '</label>';
          }).join('') +
        '</div>' +
      '</div>'
    );
  }

  function gcInp(id, ph, val) {
    return '<input id="' + id + '" class="gc-filter form-control" placeholder="' + ph + '" value="' + Utils.escHtml(val || '') + '" style="height:32px;font-size:13px;min-width:90px;flex:1">';
  }

  /* ── TABS — uses data-gc-tab, NOT class="tab-btn" (avoids Mashlat conflict) */
  function buildTabs(counts) {
    var html = '<div class="gc-tabs" style="display:flex;gap:0;border-bottom:2px solid var(--color-border,#e0e0e0);margin-bottom:var(--space-3)">';
    TABS.forEach(function(t) {
      var active = t.key === state.activeTab;
      var cnt    = counts[t.key] || 0;
      html += '<button type="button" data-gc-tab="' + t.key + '" style="padding:8px 14px;border:none;background:none;cursor:pointer;font-family:inherit;font-size:13px;' +
        (active ? 'color:#1a3a5c;border-bottom:2px solid #1a3a5c;font-weight:700;margin-bottom:-2px;' : 'color:#777;') + '">' +
        t.label +
        ' <span style="background:#e0e6ef;border-radius:10px;padding:1px 6px;font-size:11px;">' + cnt + '</span>' +
      '</button>';
    });
    return html + '</div>';
  }

  /* ── TABLE ───────────────────────────────────────────────────────────────── */
  function buildTable(data) {
    var cols = ['מ"א','שם','דרגה','יחידה','גיל','סוג שירות','סטטוס כלוא','עבירה','פרופיל','תאריך כניסה','ימי כליאה','סוג מועמדות','סטטוס אבחון','מאבחנת','מועד אבחון','פעולות'];
    var hdr  = cols.map(function(c) { return '<th style="white-space:nowrap;padding:8px 10px;font-weight:600;font-size:12px">' + c + '</th>'; }).join('');

    var rows = '';
    if (!data.length) {
      rows = '<tr><td colspan="' + cols.length + '" style="text-align:center;padding:40px;color:var(--color-text-muted)">אין רשומות מתאימות</td></tr>';
    } else {
      data.forEach(function(c) {
        rows += (
          '<tr class="gc-row" data-id="' + c.id + '" style="cursor:pointer;border-bottom:1px solid var(--color-border)">' +
          td(Utils.escHtml(c.personalNumber || ''), 'font-family:monospace;font-size:12px') +
          td(Utils.escHtml(c.name || '') + (c.orphaned ? ' <span class="badge badge-critical" title="' + Utils.escHtml(c.orphanReason || '') + '">יתומה</span>' : ''), 'font-weight:600') +
          td(Utils.escHtml(c.rank || '')) +
          td(Utils.escHtml(c.unit || '')) +
          td(c.age ? String(c.age) : '') +
          td(Utils.escHtml(c.serviceType || '')) +
          td(Utils.escHtml(c.prisonerStatus || '')) +
          td(Utils.escHtml(c.offense || '')) +
          td(Utils.escHtml(c.profile || '')) +
          td(c.entryDate ? Utils.formatDate(c.entryDate) : '', 'white-space:nowrap') +
          td(c.daysInCustody || 0, 'text-align:center') +
          td(SS.candidateBadge(c.candidateType)) +
          td(SS.statusBadge(c.assessmentStatus)) +
          td(Utils.escHtml(c.assessorName || '')) +
          td(c.scheduledDate ? Utils.formatDate(c.scheduledDate) : '', 'white-space:nowrap') +
          '<td style="padding:7px 10px;white-space:nowrap" onclick="event.stopPropagation()">' + buildRowActions(c) + '</td>' +
          '</tr>'
        );
      });
    }

    return (
      '<div style="overflow-x:auto;background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:var(--space-4)">' +
        '<table style="width:100%;border-collapse:collapse;font-size:13px;direction:rtl">' +
          '<thead style="background:#1a3a5c;color:#fff"><tr>' + hdr + '</tr></thead>' +
          '<tbody id="gc-tbody">' + rows + '</tbody>' +
        '</table>' +
      '</div>'
    );
  }

  function td(val, extra) {
    return '<td style="padding:7px 10px;' + (extra || '') + '">' + val + '</td>';
  }

  function buildRowActions(c) {
    var s    = c.assessmentStatus;
    var type = c.candidateType;
    var btns = '';

    if (type === 'mandatory') {
      if (s === 'new' || s === 'pending') {
        btns += rowBtn('gc-act-schedule', c.id, 'קבע אבחון', 'btn-primary');
      }
    } else if (type === 'optional') {
      if (s === 'new') {
        btns += rowBtn('gc-act-offer', c.id, 'הצע אבחון', 'btn-secondary');
      }
      if (s === 'offered') {
        btns += rowBtn('gc-act-interested', c.id, 'מעוניין', 'btn-primary');
        btns += rowBtn('gc-act-refuse', c.id, 'סירב', 'btn-danger');
      }
      if (s === 'interested') {
        btns += rowBtn('gc-act-schedule', c.id, 'קבע אבחון', 'btn-primary');
      }
    }
    if (s === 'scheduled') {
      btns += rowBtn('gc-act-complete', c.id, 'בצע אבחון', 'btn-success');
    }
    if (s === 'completed') {
      btns += rowBtn('gc-act-finalize', c.id, 'סיים', 'btn-secondary');
    }
    btns += rowBtn('gc-act-open', c.id, 'פרטים', 'btn-secondary');
    return btns;
  }

  function rowBtn(cls, id, label, variant) {
    return '<button type="button" class="btn ' + variant + ' btn-sm ' + cls + '" data-id="' + id + '" style="font-size:11px;padding:3px 7px;margin-left:4px">' + label + '</button>';
  }

  /* ── DRAWER ──────────────────────────────────────────────────────────────── */
  function buildDrawer() {
    return (
      '<div id="gc-drawer-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:998" onclick="window.gcCloseDrawer()"></div>' +
      '<div id="gc-drawer" style="display:none;position:fixed;top:0;left:0;width:560px;max-width:100vw;height:100vh;background:var(--color-bg,#f4f6fa);box-shadow:-4px 0 24px rgba(0,0,0,.18);z-index:999;overflow-y:auto;direction:rtl">' +
        '<div id="gc-drawer-inner"></div>' +
      '</div>'
    );
  }

  function openDrawer(id) {
    state.openId = id;
    renderDrawer();
    Utils.el('gc-drawer-overlay').style.display = 'block';
    Utils.el('gc-drawer').style.display = 'block';
  }

  window.gcCloseDrawer = function() {
    Utils.el('gc-drawer-overlay').style.display = 'none';
    Utils.el('gc-drawer').style.display = 'none';
    state.openId = null;
  };

  function renderDrawer() {
    var c = Storage.getById(KEY, state.openId);
    if (!c) { window.gcCloseDrawer(); return; }
    Utils.el('gc-drawer-inner').innerHTML = buildDrawerContent(c);
    wireDrawer(c);
  }

  function buildDrawerContent(c) {
    var secNav = DRAWER_SECTIONS.map(function(s) {
      var active = s.key === state.drawerSection;
      return '<button type="button" class="gc-dsec-btn" data-sec="' + s.key + '" style="padding:5px 10px;border:none;background:' + (active ? '#1a3a5c' : 'transparent') + ';color:' + (active ? '#fff' : '#333') + ';cursor:pointer;font-family:inherit;font-size:12px;border-radius:4px;white-space:nowrap">' + s.label + '</button>';
    }).join('');

    var body = '';
    if (state.drawerSection === 'details')    body = buildSecDetails(c);
    else if (state.drawerSection === 'candidacy')  body = buildSecCandidacy(c);
    else if (state.drawerSection === 'hard')       body = buildSecCriteria(c, 'hard');
    else if (state.drawerSection === 'flexible')   body = buildSecCriteria(c, 'flexible');
    else if (state.drawerSection === 'prior')      body = buildSecPrior(c);
    else if (state.drawerSection === 'status')     body = buildSecStatus(c);
    else if (state.drawerSection === 'background') body = buildSecBackground(c);
    else if (state.drawerSection === 'assessment') body = buildSecAssessment(c);
    else if (state.drawerSection === 'summary')    body = buildSecSummary(c);
    else if (state.drawerSection === 'followup')   body = buildSecFollowup(c);
    else if (state.drawerSection === 'history')    body = buildSecHistory(c);

    return (
      '<div>' +
        '<div style="background:#1a3a5c;color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<div style="font-size:16px;font-weight:700">' + Utils.escHtml(c.name || '') + '</div>' +
            '<div style="font-size:12px;opacity:.8;margin-top:2px">' + Utils.escHtml(c.personalNumber || '') + ' | ' + Utils.escHtml(c.rank || '') + ' | ' + Utils.escHtml(c.unit || '') + '</div>' +
          '</div>' +
          '<button type="button" onclick="window.gcCloseDrawer()" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1;padding:0">×</button>' +
        '</div>' +
        '<div style="padding:8px 16px;background:#e8edf5;display:flex;gap:4px;flex-wrap:wrap">' + secNav + '</div>' +
        '<div style="padding:16px 20px">' + body + '</div>' +
        '<div style="padding:12px 20px;border-top:1px solid var(--color-border,#ddd);background:#fff">' + buildDrawerActions(c) + '</div>' +
      '</div>'
    );
  }

  function dRow(label, val) {
    return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px"><span style="color:#666">' + label + '</span><span style="font-weight:600">' + Utils.escHtml(String(val || '—')) + '</span></div>';
  }

  /* Section 1 — פרטי החייל */
  function buildSecDetails(c) {
    return (
      '<div>' +
        '<div style="font-size:13px;font-weight:600;color:#1a3a5c;margin-bottom:10px">פרטי החייל</div>' +
        dRow('מספר אישי', c.personalNumber) +
        dRow('שם מלא', c.name) +
        dRow('דרגה', c.rank) +
        dRow('יחידה', c.unit) +
        dRow('גיל', c.age ? String(c.age) : '') +
        dRow('סוג שירות', c.serviceType) +
        dRow('פרופיל', c.profile) +
        dRow('סטטוס כלוא', c.prisonerStatus) +
        dRow('עבירה', c.offense) +
        dRow('תאריך כניסה', c.entryDate ? Utils.formatDate(c.entryDate) : '') +
        dRow('ימי כליאה', String(c.daysInCustody || 0)) +
      '</div>'
    );
  }

  /* Section 2 — בדיקת התאמה לגחל"ת */
  function buildSecCandidacy(c) {
    var reasons = (c.candidateReasons || []).map(function(r) { return '<li style="margin-bottom:4px">' + Utils.escHtml(r) + '</li>'; }).join('');
    return (
      '<div>' +
        '<div style="font-size:13px;font-weight:600;color:#1a3a5c;margin-bottom:10px">בדיקת התאמה לגחל"ת</div>' +
        '<div style="margin-bottom:14px">' +
          '<div style="font-size:11px;color:#888;margin-bottom:6px">סוג מועמדות — מחושב אוטומטית, לקריאה בלבד</div>' +
          SS.candidateBadge(c.candidateType) +
        '</div>' +
        '<div style="margin-bottom:14px">' +
          '<div style="font-size:11px;color:#888;margin-bottom:6px">קריטריונים שהתקיימו</div>' +
          '<ul style="margin:0;padding-right:18px;font-size:13px;color:#333">' + (reasons || '<li>—</li>') + '</ul>' +
        '</div>' +
        '<div><div style="font-size:11px;color:#888;margin-bottom:6px">סטטוס אבחון נוכחי</div>' + SS.statusBadge(c.assessmentStatus) + '</div>' +
      '</div>'
    );
  }

  /* Sections — קריטריונים קשיחים / גמישים (draft rules, explained per candidate) */
  function buildSecCriteria(c, kind) {
    var st = SS.criteriaStatus(c);
    var list = st[kind];
    var title = kind === 'hard' ? 'קריטריונים קשיחים — עמידה בהם מסמנת מועמד "חובה"' : 'קריטריונים גמישים — עמידה בהם מסמנת מועמד "רשות"';
    var anyMet = list.some(function(k) { return k.met; });
    return (
      '<div>' +
        '<div style="font-size:13px;font-weight:600;color:#1a3a5c;margin-bottom:6px">' + title + '</div>' +
        '<div style="font-size:11px;color:#b45309;margin-bottom:10px">הקריטריונים בגרסת טיוטה — נדרש אישור צוות גחל"ת</div>' +
        (list.length ? list.map(function(k) {
          return '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:13px"><span>' + Utils.escHtml(k.label) + '</span>' +
            (k.met ? '<span class="badge badge-active">מתקיים</span>' : '<span class="badge badge-inactive">לא מתקיים</span>') + '</div>';
        }).join('') : '<div style="color:#888">לא הוגדרו קריטריונים</div>') +
        '<div style="margin-top:12px;font-size:12px;color:#555">' + (anyMet ? 'לפחות קריטריון אחד מתקיים.' : 'אף קריטריון מסוג זה אינו מתקיים.') + ' סיווג המועמדות: ' + SS.candidateBadge(c.candidateType) + '</div>' +
      '</div>'
    );
  }

  /* Section — אבחונים קודמים */
  function buildSecPrior(c) {
    var prior = c.priorAssessments || [];
    if (!prior.length) return '<div style="color:#888;text-align:center;padding:40px 0;font-size:14px">אין אבחונים קודמים למועמד זה</div>';
    return '<div>' + prior.map(function(p) {
      return '<div style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px"><div style="color:#888;font-size:11px">' + (p.date ? Utils.formatDate(p.date) : '') + ' — ' + Utils.escHtml(p.assessor || '') + '</div><div>' + Utils.escHtml(p.summary || '') + '</div></div>';
    }).join('') + '</div>';
  }

  /* Section 3 — סטטוס התהליך */
  function buildSecStatus(c) {
    var s    = c.assessmentStatus;
    var type = c.candidateType;

    var flowSteps = [];
    if (type === 'mandatory') {
      flowSteps = [
        { id: 'new',       label: 'חדש' },
        { id: 'pending',   label: 'ממתין לבדיקה' },
        { id: 'scheduled', label: 'נקבע אבחון' },
        { id: 'completed', label: 'אבחון בוצע' },
        { id: 'done',      label: 'הושלם' },
      ];
    } else if (type === 'optional') {
      flowSteps = [
        { id: 'new',       label: 'חדש' },
        { id: 'offered',   label: 'הוצע אבחון' },
        { id: 'interested',label: 'מעוניין' },
        { id: 'scheduled', label: 'נקבע אבחון' },
        { id: 'completed', label: 'אבחון בוצע' },
        { id: 'done',      label: 'הושלם' },
      ];
    }

    var stepIdx = flowSteps.findIndex(function(st) { return st.id === s; });
    var flowHtml = flowSteps.length ? '<div style="display:flex;align-items:center;gap:6px;margin-bottom:16px;flex-wrap:wrap">' +
      flowSteps.map(function(st, i) {
        var isPast    = stepIdx >= 0 && i < stepIdx;
        var isCurrent = st.id === s;
        var bg  = isCurrent ? '#1a3a5c' : isPast ? '#10b981' : '#e0e6ef';
        var clr = (isCurrent || isPast) ? '#fff' : '#555';
        return '<span style="padding:3px 10px;border-radius:10px;font-size:11px;background:' + bg + ';color:' + clr + '">' + st.label + '</span>' +
          (i < flowSteps.length - 1 ? '<span style="color:#ccc;font-size:10px">›</span>' : '');
      }).join('') + '</div>' : '';

    var scheduledInfo = '';
    if (c.scheduledDate) {
      scheduledInfo = '<div style="background:#f0f7ff;border-radius:6px;padding:10px 12px;margin-bottom:12px;font-size:13px">' +
        '<div style="font-weight:600;color:#1a3a5c;margin-bottom:4px">פרטי מועד אבחון</div>' +
        '<div>תאריך: <strong>' + Utils.formatDate(c.scheduledDate) + '</strong></div>' +
        (c.assessmentTime ? '<div>שעה: <strong>' + Utils.escHtml(c.assessmentTime) + '</strong></div>' : '') +
        (c.assessorName ? '<div>מאבחנת: <strong>' + Utils.escHtml(c.assessorName) + '</strong></div>' : '') +
        (c.assessmentLocation ? '<div>מיקום: <strong>' + Utils.escHtml(c.assessmentLocation) + '</strong></div>' : '') +
      '</div>';
    }
    if (s === 'refused' && c.refusalReason) {
      scheduledInfo = '<div style="background:#fff5f5;border:1px solid #fecaca;border-radius:6px;padding:10px 12px;margin-bottom:12px;font-size:13px">' +
        '<div style="font-weight:600;color:#b91c1c;margin-bottom:4px">סיבת סירוב</div>' +
        '<div>' + Utils.escHtml(c.refusalReason) + '</div>' +
      '</div>';
    }

    return (
      '<div>' +
        '<div style="font-size:13px;font-weight:600;color:#1a3a5c;margin-bottom:10px">סטטוס התהליך</div>' +
        '<div style="margin-bottom:10px">' + SS.statusBadge(s) + '</div>' +
        flowHtml +
        scheduledInfo +
      '</div>'
    );
  }

  /* Section 4 — מידע מקדים */
  function buildSecBackground(c) {
    var bg = c.background || {};
    return (
      '<div>' +
        '<div style="font-size:13px;font-weight:600;color:#1a3a5c;margin-bottom:10px">מידע מקדים (להכנת המאבחנת)</div>' +
        '<div style="background:#fff;border:1px solid var(--color-border,#e0e0e0);border-radius:6px;padding:12px;margin-bottom:12px">' +
          dRow('סיבת הכליאה הנוכחית', c.offense) +
          dRow('מספר ימי כליאה', String(c.daysInCustody || 0)) +
          dRow('תאריך כניסה לכליאה', c.entryDate ? Utils.formatDate(c.entryDate) : '') +
          dRow('סוג מועמדות', SS.CANDIDATE_TYPE_LABELS[c.candidateType] || c.candidateType) +
        '</div>' +
        '<div style="margin-bottom:12px">' +
          '<div style="font-size:11px;color:#888;margin-bottom:4px">האם נחקר בעבר במצ"ח</div>' +
          '<input type="checkbox" id="gc-bg-investigated" ' + (bg.investigatedBefore ? 'checked' : '') + ' style="margin-left:6px"> ' +
          '<label for="gc-bg-investigated" style="font-size:13px">כן, נחקר בעבר</label>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:11px;color:#888;margin-bottom:4px">מידע רלוונטי קודם / הערות מקדימות</div>' +
          '<textarea id="gc-bg-notes" style="width:100%;height:80px;font-family:inherit;font-size:13px;direction:rtl;border:1px solid #ccc;border-radius:4px;padding:6px;box-sizing:border-box">' + Utils.escHtml(bg.notes || '') + '</textarea>' +
        '</div>' +
        '<button type="button" class="btn btn-primary btn-sm" id="gc-save-background" style="margin-top:8px">שמור מידע מקדים</button>' +
      '</div>'
    );
  }

  /* Section 5 — אבחון */
  function buildSecAssessment(c) {
    var s = c.assessmentStatus;
    if (s === 'new' || s === 'pending' || s === 'offered' || s === 'refused' || s === 'irrelevant') {
      return '<div style="color:#888;text-align:center;padding:40px 0;font-size:14px">אבחון טרם בוצע עבור מועמד זה</div>';
    }
    var questions = questionsForOffense(c.offense);
    var questHtml = questions.map(function(q) {
      var val = (c.questionnaire && c.questionnaire[q.key]) || '';
      return '<div style="margin-bottom:12px">' +
        '<label style="font-size:12px;color:#555;display:block;margin-bottom:3px">' + q.label + '</label>' +
        '<textarea id="gc-qa-' + q.key + '" data-qa-key="' + q.key + '" style="width:100%;height:56px;font-family:inherit;font-size:12px;direction:rtl;border:1px solid #ccc;border-radius:4px;padding:4px;box-sizing:border-box">' + Utils.escHtml(val) + '</textarea>' +
      '</div>';
    }).join('');
    return (
      '<div>' +
        '<div style="font-size:13px;font-weight:600;color:#1a3a5c;margin-bottom:10px">אבחון — שאלון</div>' +
        '<div style="margin-bottom:12px">' +
          '<label style="font-size:12px;color:#555">מאבחנת *</label>' +
          '<input id="gc-assessor" value="' + Utils.escHtml(c.assessorName || '') + '" style="width:100%;margin-top:2px;font-family:inherit;font-size:13px;direction:rtl;border:1px solid #ccc;border-radius:4px;padding:4px 8px;height:32px;box-sizing:border-box">' +
        '</div>' +
        questHtml +
        '<button type="button" class="btn btn-primary" id="gc-save-assessment" style="margin-top:4px">שמור אבחון</button>' +
      '</div>'
    );
  }

  /* Section 6 — סיכום אבחון */
  function buildSecSummary(c) {
    return (
      '<div>' +
        '<div style="font-size:13px;font-weight:600;color:#1a3a5c;margin-bottom:10px">סיכום אבחון</div>' +
        '<div style="margin-bottom:10px">' +
          '<label style="font-size:12px;color:#555;display:block;margin-bottom:3px">סיכום</label>' +
          '<textarea id="gc-sum-notes" style="width:100%;height:80px;font-family:inherit;font-size:13px;direction:rtl;border:1px solid #ccc;border-radius:4px;padding:6px;box-sizing:border-box">' + Utils.escHtml(c.assessmentNotes || '') + '</textarea>' +
        '</div>' +
        '<div style="margin-bottom:10px">' +
          '<label style="font-size:12px;color:#555;display:block;margin-bottom:3px">המלצה</label>' +
          '<input id="gc-sum-rec" value="' + Utils.escHtml(c.recommendation || '') + '" style="width:100%;font-family:inherit;font-size:13px;direction:rtl;border:1px solid #ccc;border-radius:4px;padding:4px 8px;height:32px;box-sizing:border-box">' +
        '</div>' +
        dRow('מאבחנת', c.assessorName) +
        dRow('תאריך אבחון', c.scheduledDate ? Utils.formatDate(c.scheduledDate) : '') +
        '<button type="button" class="btn btn-primary" id="gc-save-summary" style="margin-top:12px">שמור סיכום</button>' +
      '</div>'
    );
  }

  /* Section — יומן מעקב (professional follow-up notes, separate from system history) */
  function buildSecFollowup(c) {
    var log = (c.followupLog || []).slice().reverse();
    var rows = !log.length
      ? '<div style="color:#888;text-align:center;padding:24px 0">אין רשומות מעקב</div>'
      : log.map(function(e) {
          return '<div style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px">' +
            '<div style="display:flex;justify-content:space-between;color:#888;font-size:11px;margin-bottom:3px">' +
              '<span>' + (e.date ? Utils.formatDate(e.date) : '') + (e.time ? ' ' + Utils.escHtml(e.time) : '') + '</span>' +
              '<span>' + Utils.escHtml(e.author || '') + '</span>' +
            '</div>' +
            '<div>' + Utils.escHtml(e.note || '') + '</div>' +
          '</div>';
        }).join('');
    return (
      '<div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
          '<div style="font-size:13px;font-weight:600;color:#1a3a5c">יומן מעקב</div>' +
          '<button type="button" class="btn btn-primary btn-sm" id="gc-add-followup" data-id="' + c.id + '">+ הוסף מעקב</button>' +
        '</div>' +
        rows +
      '</div>'
    );
  }

  function openFollowupModal(cid) {
    var c = Storage.getById(KEY, cid);
    if (!c) return;
    var now = new Date();
    var hhmm = Utils.pad(now.getHours()) + ':' + Utils.pad(now.getMinutes());
    Modal.open({
      title: 'הוספת מעקב — ' + Utils.escHtml(c.name),
      size: 'md',
      body: (
        '<div style="direction:rtl">' +
          mField('gc-fu-date', 'תאריך', 'date') +
          mField('gc-fu-time', 'שעה', 'time') +
          mField('gc-fu-note', 'הערה / תוכן', 'textarea') +
        '</div>'
      ),
      footer: (
        '<button type="button" class="btn btn-primary" onclick="window.gcConfirmFollowup(\'' + cid + '\')">שמור</button>' +
        '<button type="button" class="btn btn-secondary" onclick="Modal.close()">ביטול</button>'
      ),
    });
    var dateEl = Utils.el('gc-fu-date');
    var timeEl = Utils.el('gc-fu-time');
    if (dateEl) dateEl.value = Utils.today();
    if (timeEl) timeEl.value = hhmm;
  }

  window.gcConfirmFollowup = function(cid) {
    var c = Storage.getById(KEY, cid);
    if (!c) return;
    var dateEl = Utils.el('gc-fu-date');
    var timeEl = Utils.el('gc-fu-time');
    var noteEl = Utils.el('gc-fu-note');
    var note = noteEl ? noteEl.value.trim() : '';
    if (!note) { Toast.error('יש להזין הערה / תוכן'); return; }
    var user = Auth.getCurrentUser();
    if (!c.followupLog) c.followupLog = [];
    c.followupLog.push({
      date: (dateEl && dateEl.value) || Utils.today(),
      time: (timeEl && timeEl.value) || '',
      note: note,
      author: user ? (user.firstName + ' ' + user.lastName) : 'מערכת',
    });
    save(c);
    Modal.close();
    Toast.success('רשומת המעקב נשמרה');
    if (state.openId === cid) renderDrawer();
  };

  /* Section 7 — היסטוריית פעילות */
  function buildSecHistory(c) {
    var hist = (c.history || []).slice().reverse();
    if (!hist.length) return '<div style="color:#888;text-align:center;padding:40px 0">אין היסטוריה</div>';
    return '<div>' + hist.map(function(h) {
      return '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px">' +
        '<span>' + Utils.escHtml(h.label || h.action || '') + '</span>' +
        '<span style="color:#888;font-size:11px;white-space:nowrap;margin-right:8px">' + (h.at ? Utils.formatDate(h.at) : '') + '</span>' +
      '</div>';
    }).join('') + '</div>';
  }

  function buildDrawerActions(c) {
    var s    = c.assessmentStatus;
    var type = c.candidateType;
    var btns = '';

    if (type === 'mandatory') {
      if (s === 'new' || s === 'pending') {
        btns += drawerBtn('gc-da-schedule', c.id, 'קבע אבחון', 'btn-primary');
      }
    } else if (type === 'optional') {
      if (s === 'new') {
        btns += drawerBtn('gc-da-offer', c.id, 'הצע אבחון', 'btn-secondary');
      }
      if (s === 'offered') {
        btns += drawerBtn('gc-da-interested', c.id, 'מעוניין', 'btn-primary');
        btns += drawerBtn('gc-da-refuse',     c.id, 'סירב',    'btn-danger');
      }
      if (s === 'interested') {
        btns += drawerBtn('gc-da-schedule', c.id, 'קבע אבחון', 'btn-primary');
      }
    }
    if (s === 'scheduled') {
      btns += drawerBtn('gc-da-complete', c.id, 'סמן אבחון בוצע', 'btn-success');
    }
    if (s === 'completed') {
      btns += drawerBtn('gc-da-finalize', c.id, 'סיים תהליך', 'btn-primary');
    }
    return btns || '<span style="color:#888;font-size:12px">אין פעולות זמינות בשלב זה</span>';
  }

  function drawerBtn(cls, id, label, variant) {
    return '<button type="button" class="btn ' + variant + ' ' + cls + '" data-id="' + id + '" style="margin-left:8px">' + label + '</button>';
  }

  /* ── MODALS ──────────────────────────────────────────────────────────────── */
  function openScheduleModal(cid) {
    var c = Storage.getById(KEY, cid);
    if (!c) return;
    Modal.open({
      title: 'קביעת אבחון גחל"ת — ' + Utils.escHtml(c.name),
      size: 'md',
      body: (
        '<div style="direction:rtl">' +
          mField('gc-sch-date', 'תאריך אבחון *', 'date') +
          mField('gc-sch-time', 'שעת אבחון *', 'time') +
          mField('gc-sch-assessor', 'מאבחנת *', 'text') +
          mField('gc-sch-location', 'מיקום', 'text') +
          mField('gc-sch-notes', 'הערות', 'textarea') +
        '</div>'
      ),
      footer: (
        '<button type="button" class="btn btn-primary" onclick="window.gcConfirmSchedule(\'' + cid + '\')">שמור מועד</button>' +
        '<button type="button" class="btn btn-secondary" onclick="Modal.close()">ביטול</button>'
      ),
    });
  }

  function mField(id, label, type) {
    var el = type === 'textarea'
      ? '<textarea id="' + id + '" style="width:100%;height:60px;font-family:inherit;font-size:13px;direction:rtl;border:1px solid #ccc;border-radius:4px;padding:4px;box-sizing:border-box"></textarea>'
      : '<input id="' + id + '" type="' + type + '" style="width:100%;font-family:inherit;font-size:13px;direction:rtl;border:1px solid #ccc;border-radius:4px;padding:4px 8px;height:32px;box-sizing:border-box">';
    return '<div style="margin-bottom:10px"><label style="font-size:12px;color:#555;display:block;margin-bottom:3px">' + label + '</label>' + el + '</div>';
  }

  window.gcConfirmSchedule = function(cid) {
    var c = Storage.getById(KEY, cid);
    if (!c) return;
    var dateEl  = Utils.el('gc-sch-date');
    var timeEl  = Utils.el('gc-sch-time');
    var assrEl  = Utils.el('gc-sch-assessor');
    var locEl   = Utils.el('gc-sch-location');
    if (!dateEl || !dateEl.value) { Toast.error('יש לבחור תאריך אבחון'); return; }
    if (!timeEl || !timeEl.value) { Toast.error('יש להזין שעת אבחון'); return; }
    if (!assrEl || !assrEl.value.trim()) { Toast.error('יש להזין שם מאבחנת'); return; }
    c.assessmentStatus = 'scheduled';
    c.scheduledDate    = dateEl.value;
    c.assessmentTime   = timeEl ? timeEl.value : '';
    c.assessorName     = (assrEl && assrEl.value) || c.assessorName || '';
    c.assessmentLocation = (locEl && locEl.value) || '';
    addHistory(c, 'scheduled', 'נקבע אבחון ל-' + Utils.formatDate(dateEl.value) + ((assrEl && assrEl.value) ? ' עם ' + assrEl.value : ''));
    save(c);
    Modal.close();
    Toast.success('אבחון נקבע בהצלחה');
    refresh();
    if (state.openId === cid) renderDrawer();
  };

  function openRefusalModal(cid) {
    var c = Storage.getById(KEY, cid);
    if (!c) return;
    Modal.open({
      title: 'סירוב לאבחון — ' + Utils.escHtml(c.name),
      size: 'sm',
      body: '<div style="direction:rtl">' + mField('gc-ref-reason', 'סיבת סירוב *', 'textarea') + '</div>',
      footer: (
        '<button type="button" class="btn btn-danger" onclick="window.gcConfirmRefusal(\'' + cid + '\')">אשר סירוב</button>' +
        '<button type="button" class="btn btn-secondary" onclick="Modal.close()">ביטול</button>'
      ),
    });
  }

  window.gcConfirmRefusal = function(cid) {
    var c = Storage.getById(KEY, cid);
    if (!c) return;
    var reason = ((Utils.el('gc-ref-reason') || {}).value || '').trim();
    if (!reason) { Toast.error('יש להזין סיבת סירוב'); return; }
    c.assessmentStatus = 'refused';
    c.refusalReason    = reason;
    addHistory(c, 'refused', 'סירב לאבחון' + (reason ? ': ' + reason : ''));
    save(c);
    Modal.close();
    Toast.success('סירוב נרשם');
    refresh();
    if (state.openId === cid) renderDrawer();
  };

  /* ── STATUS TRANSITIONS ──────────────────────────────────────────────────── */
  function setStatus(cid, newStatus, histLabel) {
    var c = Storage.getById(KEY, cid);
    if (!c) return;
    // completion validation (generic operational minimum — no professional policy)
    var problems = [];
    if (newStatus === 'completed') {
      if (!c.assessorName) problems.push('מאבחנת');
      if (!c.scheduledDate) problems.push('תאריך אבחון');
      if (!c.assessmentTime) problems.push('שעת אבחון');
      var qs = questionsForOffense(c.offense);
      var ans = c.questionnaire || {};
      if (!c.questionnaireCategory) problems.push('סוג שאלון (שמור את האבחון)');
      var unanswered = qs.filter(function(q) { return !String(ans[q.key] || '').trim(); });
      if (unanswered.length) problems.push('תשובות לשאלון (' + unanswered.length + ' חסרות)');
    }
    if (newStatus === 'done') {
      if (c.assessmentStatus !== 'completed' && c.assessmentStatus !== 'done') problems.push('אבחון שבוצע');
      if (!String(c.assessmentNotes || '').trim()) problems.push('סיכום אבחון');
    }
    if (problems.length) { Toast.error('לא ניתן להמשיך — חסר: ' + problems.join(', ')); return; }
    c.assessmentStatus = newStatus;
    addHistory(c, newStatus, histLabel);
    save(c);
    Toast.success(histLabel);
    refresh();
    if (state.openId === cid) renderDrawer();
  }

  /* ── WIRE ────────────────────────────────────────────────────────────────── */
  function wireAll() {
    // Tabs — use gc-tabs container, stopPropagation to avoid any stale Mashlat delegate
    var tabBar = content.querySelector('.gc-tabs');
    if (tabBar) {
      tabBar.addEventListener('click', function(e) {
        e.stopPropagation();
        var btn = e.target.closest('[data-gc-tab]');
        if (!btn) return;
        state.activeTab = btn.getAttribute('data-gc-tab');
        refresh();
      });
    }

    // Filters
    content.querySelectorAll('.gc-filter').forEach(function(el) {
      el.addEventListener('input',  function() { applyFilters(); });
      el.addEventListener('change', function() { applyFilters(); });
    });
    var clearBtn = Utils.el('gc-filter-clear');
    if (clearBtn) clearBtn.addEventListener('click', function() {
      state.filters = { personalNumber: '', name: '', unit: '', serviceType: '', assessmentStatus: '', offense: '', assessor: '', flex: {} };
      refresh();
    });

    // Table rows
    var tbody = Utils.el('gc-tbody');
    if (tbody) wireTbody(tbody);

    // Open drawer from query param
    if (state.openId) openDrawer(state.openId);
  }

  function wireTbody(tbody) {
    tbody.querySelectorAll('.gc-row').forEach(function(row) {
      row.addEventListener('click', function() { openDrawer(this.dataset.id); });
    });
    tbody.querySelectorAll('.gc-act-offer').forEach(function(btn) {
      btn.addEventListener('click', function(e) { e.stopPropagation(); setStatus(this.dataset.id, 'offered', 'הוצע אבחון'); });
    });
    tbody.querySelectorAll('.gc-act-interested').forEach(function(btn) {
      btn.addEventListener('click', function(e) { e.stopPropagation(); setStatus(this.dataset.id, 'interested', 'מעוניין באבחון'); });
    });
    tbody.querySelectorAll('.gc-act-refuse').forEach(function(btn) {
      btn.addEventListener('click', function(e) { e.stopPropagation(); openRefusalModal(this.dataset.id); });
    });
    tbody.querySelectorAll('.gc-act-schedule').forEach(function(btn) {
      btn.addEventListener('click', function(e) { e.stopPropagation(); openScheduleModal(this.dataset.id); });
    });
    tbody.querySelectorAll('.gc-act-complete').forEach(function(btn) {
      btn.addEventListener('click', function(e) { e.stopPropagation(); setStatus(this.dataset.id, 'completed', 'אבחון בוצע'); });
    });
    tbody.querySelectorAll('.gc-act-finalize').forEach(function(btn) {
      btn.addEventListener('click', function(e) { e.stopPropagation(); setStatus(this.dataset.id, 'done', 'תהליך הושלם'); });
    });
    tbody.querySelectorAll('.gc-act-open').forEach(function(btn) {
      btn.addEventListener('click', function(e) { e.stopPropagation(); openDrawer(this.dataset.id); });
    });
  }

  function wireDrawer(c) {
    var di = Utils.el('gc-drawer-inner');
    if (!di) return;

    // Section nav — NOT using tab-btn class
    di.querySelectorAll('.gc-dsec-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        state.drawerSection = this.dataset.sec;
        renderDrawer();
      });
    });

    // Drawer action buttons
    di.querySelectorAll('.gc-da-offer').forEach(function(btn) {
      btn.addEventListener('click', function() { setStatus(this.dataset.id, 'offered', 'הוצע אבחון'); });
    });
    di.querySelectorAll('.gc-da-interested').forEach(function(btn) {
      btn.addEventListener('click', function() { setStatus(this.dataset.id, 'interested', 'מעוניין באבחון'); });
    });
    di.querySelectorAll('.gc-da-refuse').forEach(function(btn) {
      btn.addEventListener('click', function() { openRefusalModal(this.dataset.id); });
    });
    di.querySelectorAll('.gc-da-schedule').forEach(function(btn) {
      btn.addEventListener('click', function() { openScheduleModal(this.dataset.id); });
    });
    di.querySelectorAll('.gc-da-complete').forEach(function(btn) {
      btn.addEventListener('click', function() { setStatus(this.dataset.id, 'completed', 'אבחון בוצע'); });
    });
    di.querySelectorAll('.gc-da-finalize').forEach(function(btn) {
      btn.addEventListener('click', function() { setStatus(this.dataset.id, 'done', 'תהליך הושלם'); });
    });

    // Add follow-up entry
    var addFollowup = Utils.el('gc-add-followup');
    if (addFollowup) addFollowup.addEventListener('click', function() { openFollowupModal(this.dataset.id); });

    // Save background
    var saveBg = Utils.el('gc-save-background');
    if (saveBg) saveBg.addEventListener('click', function() {
      var fresh = Storage.getById(KEY, c.id);
      if (!fresh) return;
      if (!fresh.background) fresh.background = {};
      var investigatedEl = Utils.el('gc-bg-investigated');
      var notesEl        = Utils.el('gc-bg-notes');
      if (investigatedEl) fresh.background.investigatedBefore = investigatedEl.checked;
      if (notesEl)        fresh.background.notes = notesEl.value;
      addHistory(fresh, 'background_saved', 'מידע מקדים עודכן');
      save(fresh);
      Toast.success('מידע מקדים נשמר');
      renderDrawer();
    });

    // Save assessment
    var saveAssess = Utils.el('gc-save-assessment');
    if (saveAssess) saveAssess.addEventListener('click', function() {
      var fresh = Storage.getById(KEY, c.id);
      if (!fresh) return;
      var assessorEl = Utils.el('gc-assessor');
      var assessorVal = assessorEl ? assessorEl.value.trim() : (fresh.assessorName || '');
      var qa = {};
      di.querySelectorAll('[data-qa-key]').forEach(function(el) { qa[el.dataset.qaKey] = el.value; });
      var missingQ = Object.keys(qa).filter(function(k) { return !String(qa[k] || '').trim(); });
      if (!assessorVal) { Toast.error('יש להזין שם מאבחנת'); return; }
      if (missingQ.length) { Toast.error('יש למלא את כל תשובות השאלון (' + missingQ.length + ' חסרות)'); return; }
      fresh.assessorName = assessorVal;
      fresh.questionnaire = qa;
      fresh.questionnaireCategory = categoryForOffense(fresh.offense);
      addHistory(fresh, 'assessment_saved', 'שאלון אבחון נשמר');
      save(fresh);
      Toast.success('אבחון נשמר');
      renderDrawer();
    });

    // Save summary
    var saveSumm = Utils.el('gc-save-summary');
    if (saveSumm) saveSumm.addEventListener('click', function() {
      var fresh = Storage.getById(KEY, c.id);
      if (!fresh) return;
      var notesEl = Utils.el('gc-sum-notes');
      var recEl   = Utils.el('gc-sum-rec');
      if (notesEl) fresh.assessmentNotes = notesEl.value;
      if (recEl)   fresh.recommendation  = recEl.value;
      addHistory(fresh, 'summary_saved', 'סיכום נשמר');
      save(fresh);
      Toast.success('סיכום נשמר');
      renderDrawer();
    });
  }

  function applyFilters() {
    var f = state.filters;
    var maps = {
      personalNumber: 'gc-f-pn', name: 'gc-f-nm', unit: 'gc-f-un',
      serviceType: 'gc-f-st', assessmentStatus: 'gc-f-as', offense: 'gc-f-of', assessor: 'gc-f-ev',
    };
    Object.keys(maps).forEach(function(k) {
      var el = Utils.el(maps[k]);
      if (el) f[k] = el.value;
    });
    f.flex = {};
    content.querySelectorAll('.gc-flex').forEach(function(el) { f.flex[el.getAttribute('data-flex')] = el.checked; });
    var data = getFiltered(state.activeTab, state.filters);
    var tbody = Utils.el('gc-tbody');
    if (!tbody) { refresh(); return; }
    // Rebuild rows inline (keeps filters, tabs alive)
    var rows = '';
    if (!data.length) {
      rows = '<tr><td colspan="16" style="text-align:center;padding:40px;color:var(--color-text-muted)">אין רשומות מתאימות</td></tr>';
    } else {
      data.forEach(function(c) {
        rows += (
          '<tr class="gc-row" data-id="' + c.id + '" style="cursor:pointer;border-bottom:1px solid var(--color-border)">' +
          td(Utils.escHtml(c.personalNumber || ''), 'font-family:monospace;font-size:12px') +
          td(Utils.escHtml(c.name || '') + (c.orphaned ? ' <span class="badge badge-critical" title="' + Utils.escHtml(c.orphanReason || '') + '">יתומה</span>' : ''), 'font-weight:600') +
          td(Utils.escHtml(c.rank || '')) +
          td(Utils.escHtml(c.unit || '')) +
          td(c.age ? String(c.age) : '') +
          td(Utils.escHtml(c.serviceType || '')) +
          td(Utils.escHtml(c.prisonerStatus || '')) +
          td(Utils.escHtml(c.offense || '')) +
          td(Utils.escHtml(c.profile || '')) +
          td(c.entryDate ? Utils.formatDate(c.entryDate) : '', 'white-space:nowrap') +
          td(c.daysInCustody || 0, 'text-align:center') +
          td(SS.candidateBadge(c.candidateType)) +
          td(SS.statusBadge(c.assessmentStatus)) +
          td(Utils.escHtml(c.assessorName || '')) +
          td(c.scheduledDate ? Utils.formatDate(c.scheduledDate) : '', 'white-space:nowrap') +
          '<td style="padding:7px 10px;white-space:nowrap" onclick="event.stopPropagation()">' + buildRowActions(c) + '</td>' +
          '</tr>'
        );
      });
    }
    tbody.innerHTML = rows;
    wireTbody(tbody);
  }

  function refresh() {
    content.innerHTML = buildPage();
    wireAll();
    if (state.openId) openDrawer(state.openId);
  }
};
