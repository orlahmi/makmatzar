/* mashlat.js — משל״ט coordination desk v11
   גורם מתאם  = Mashlat staff coordinator — שם בלבד
   גורם דורש  = unit representative (requesting party) — 5 fields
   מדרג       = automatic (never manual)
   המלצת מתקן = automatic + manual override */
'use strict';

window.Pages = window.Pages || {};

/* ── Status config ─────────────────────────────────────────────────── */
var MASHLAT_STATUSES = {
  coordinated: { label: 'מתואם',           cls: 'badge-approved'  },
  today:       { label: 'להיום',           cls: 'badge-info'      },
  arrived:     { label: 'הגיע',            cls: 'badge-teal'      },
  intake:      { label: 'בתהליך קליטה',   cls: 'badge-inprogress'},
  completed:   { label: 'בוצע',            cls: 'badge-active'    },
  no_show:     { label: 'לא הגיע',         cls: 'badge-critical'  },
  deferred:    { label: 'נדחה',            cls: 'badge-pending'   },
  cancelled:   { label: 'בוטל',            cls: 'badge-inactive'  },
};

var MASHLAT_ACTIVE  = ['coordinated', 'today', 'arrived', 'intake'];
var MASHLAT_ARCHIVE = ['no_show', 'cancelled', 'deferred', 'completed'];

function mashlatStatusBadge(status) {
  var cfg = MASHLAT_STATUSES[status] || { label: status || '—', cls: 'badge-inactive' };
  return '<span class="badge ' + cfg.cls + '"><span class="badge-dot"></span>' + Utils.escHtml(cfg.label) + '</span>';
}

function rankLabel(id) {
  return (RANK_MAP && RANK_MAP[id]) ? RANK_MAP[id].label : (id || '—');
}

function nextCoordNumber() {
  var all  = Storage.getCollection(Storage.KEYS.MASHLAT_COORDINATIONS);
  var nums = all.map(function(c) { return parseInt((c.coordinationNumber || '').replace('MSLT-', ''), 10); }).filter(function(n) { return !isNaN(n); });
  var next = nums.length ? Math.max.apply(null, nums) + 1 : 1;
  return 'MSLT-' + String(next).padStart(6, '0');
}

/* ── No-show processor ─────────────────────────────────────────────── */
function processNoShows() {
  var today   = Utils.today();
  var all     = Storage.getCollection(Storage.KEYS.MASHLAT_COORDINATIONS);
  var changed = 0;
  var updated = all.map(function(c) {
    if (MASHLAT_ACTIVE.includes(c.status) && c.coordinationDate < today && !c.arrivalConfirmed && !c.prisonerFileId) {
      changed++;
      return Object.assign({}, c, { status: 'no_show', archivedAt: c.archivedAt || Utils.now(), archiveReason: 'לא התייצב במועד', updatedAt: new Date().toISOString() });
    }
    return c;
  });
  if (changed) {
    Storage.setCollection(Storage.KEYS.MASHLAT_COORDINATIONS, updated);
    Audit.log({ module: 'mashlat', action: 'update_status', entityType: 'coordination', entityId: 'batch', description: changed + ' תיאומים סומנו כ"לא הגיעו" אוטומטית' });
  }
}

/* ── Three separate rule engines ───────────────────────────────────
   Engine 1: MASHLAT_RANKING_RULES      → מדרג 1/2/3  (in mashlat-ranking-service.js)
   Engine 2: INCARCERATION_FACILITY_RULES  → כלא / מעצר חילי / מעצר חוץ חילי
   Engine 3: INCARCERATION_BLOCKING_RULES → facility-specific חסימות
   These three engines are INDEPENDENT.  A ranking criterion does NOT
   automatically become a blocking criterion, and vice versa.
   Facility rules and blocking rules may only be populated from
   confirmed professional business criteria supplied for this project.
   ─────────────────────────────────────────────────────────────────── */

var FACILITY_TYPES = {
  kele:         { label: 'כלא צבאי',      destinations: ['כלא 1', 'כלא 4', 'כלא 6'] },
  maatzar_hili: { label: 'מעצר חילי',     destinations: ['בסיס 100', 'בסיס 302', 'בסיס 416', 'בסיס 708'] },
  maatzar_huz:  { label: 'מעצר חוץ חילי', destinations: ['מעצר חוץ חילי'] },
};

var DESTINATION_TYPES = {};
Object.keys(FACILITY_TYPES).forEach(function(k) {
  FACILITY_TYPES[k].destinations.forEach(function(d) { DESTINATION_TYPES[d] = k; });
});

/* Engine 2 — INCARCERATION_FACILITY_RULES
   No confirmed professional facility rules have been supplied yet.
   Populate this array only from explicit project business criteria.
   Format: { code, test(indicators), facility: 'kele'|'maatzar_hili'|'maatzar_huz', reason } */
var INCARCERATION_FACILITY_RULES = [
  /* Example (disabled until rules are confirmed):
  { code: 'EXAMPLE', test: function(ind) { return false; }, facility: 'kele', reason: '...' }, */
];

/* Engine 3 — INCARCERATION_BLOCKING_RULES
   No confirmed professional blocking rules have been supplied yet.
   Populate this array only from explicit project business criteria.
   Format: { code, test(indicators), blocks: 'kele'|'maatzar_hili'|'maatzar_huz', reason } */
var INCARCERATION_BLOCKING_RULES = [
  /* Example (disabled until rules are confirmed):
  { code: 'EXAMPLE', test: function(ind) { return false; }, blocks: 'maatzar_huz', reason: '...' }, */
];

/* Returns { recommended, recommendedLabel, blocked, reasons, recommendationStatus }
   When no confirmed facility rules exist:  recommended = null, recommendationStatus = 'requires_rules' */
function computeFacilityRecommendation(indicators) {
  var blocked = {};

  /* Apply confirmed blocking rules */
  INCARCERATION_BLOCKING_RULES.forEach(function(rule) {
    try {
      if (rule.test(indicators)) {
        if (!blocked[rule.blocks]) blocked[rule.blocks] = [];
        blocked[rule.blocks].push(rule.reason);
      }
    } catch (e) { /* skip safely */ }
  });

  /* Apply confirmed facility rules — pick highest-priority match */
  var recommended = null;
  var reasons     = [];
  INCARCERATION_FACILITY_RULES.forEach(function(rule) {
    if (recommended) return; /* first match wins */
    try {
      if (rule.test(indicators) && !blocked[rule.facility]) {
        recommended = rule.facility;
        reasons     = [rule.reason];
      }
    } catch (e) { /* skip safely */ }
  });

  var recommendationStatus = recommended ? 'confirmed' : 'requires_rules';

  return {
    recommended:          recommended,
    recommendedLabel:     recommended ? FACILITY_TYPES[recommended].label : null,
    blocked:              blocked,
    reasons:              reasons,
    recommendationStatus: recommendationStatus,
  };
}

function renderFacilityPanel(facRec, currentDest, opts) {
  opts = opts || {};
  if (!facRec) {
    return '<div style="font-size:12px;color:var(--color-text-muted)">אנא בצע חיפוש חייל לחישוב המלצת מתקן.</div>';
  }

  var rec   = facRec.recommended;
  var isPending = !rec || facRec.recommendationStatus === 'requires_rules';

  /* ── No confirmed rules yet — show pending state ── */
  if (isPending) {
    var html = '<div style="background:#f8fafc;border:1px dashed var(--color-border-strong,#94a3b8);border-radius:var(--radius-md);padding:var(--space-3)">' +
      '<div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1)">' +
        Utils.icon('prison', 14) +
        '<span style="font-weight:600;font-size:13px;color:var(--color-text-secondary)">התאמת מתקן</span>' +
        '<span style="font-size:10px;color:var(--color-text-muted);margin-right:auto">ממתין לכללים</span>' +
      '</div>' +
      '<div style="font-size:12px;color:var(--color-text-muted)">טרם נקבעה התאמת מתקן — נדרשת השלמת כללי ההתאמה</div>' +
      /* Still list facility types so user knows the valid options */
      '<div style="margin-top:var(--space-2);font-size:11px;color:var(--color-text-muted)">' +
        'יעדים אפשריים: ' +
        Object.keys(FACILITY_TYPES).map(function(k) { return Utils.escHtml(FACILITY_TYPES[k].label); }).join(' • ') +
      '</div>' +
    '</div>';

    /* Still offer the override-reason field in form mode (no recommendation to override, so wasOverridden stays false) */
    if (!opts.readonly) {
      html += '<div class="form-group" style="margin-top:var(--space-2);margin-bottom:0">' +
        '<label class="form-label" style="font-size:11px">הערה לבחירת יעד</label>' +
        '<textarea id="mc-override-reason" class="form-control" rows="2" style="font-size:12px" placeholder="הוסף הערה לבחירת היעד (אופציונלי)"></textarea>' +
      '</div>';
    }
    return html;
  }

  /* ── Confirmed recommendation ── */
  var label    = facRec.recommendedLabel;
  var recColor = rec === 'kele' ? 'var(--color-danger,#dc2626)' : rec === 'maatzar_huz' ? 'var(--color-success,#16a34a)' : 'var(--color-info,#0284c7)';
  var recBg    = rec === 'kele' ? '#fef2f2'  : rec === 'maatzar_huz' ? '#f0fdf4' : '#f0f9ff';
  var recBadge = rec === 'kele' ? 'badge-critical' : rec === 'maatzar_huz' ? 'badge-approved' : 'badge-info';

  var selectedType = currentDest ? DESTINATION_TYPES[currentDest] : null;
  var isOverridden = !!(selectedType && selectedType !== rec);

  var matrixHtml = Object.keys(FACILITY_TYPES).map(function(tk) {
    var ft     = FACILITY_TYPES[tk];
    var blocks = facRec.blocked[tk];
    var isRec  = tk === rec;
    return '<tr style="font-size:11px">' +
      '<td style="padding:3px 8px;font-weight:' + (isRec ? 600 : 400) + ';color:' + (isRec ? recColor : 'inherit') + '">' + (isRec ? '★ ' : '') + Utils.escHtml(ft.label) + '</td>' +
      '<td style="padding:3px 8px;text-align:center">' + (blocks ? '<span style="color:#dc2626">✗</span>' : '<span style="color:#16a34a">✓</span>') + '</td>' +
      '<td style="padding:3px 8px;color:var(--color-text-muted);font-size:10px">' + (blocks ? Utils.escHtml(blocks.join(' • ')) : (isRec ? '<span style="color:#16a34a">מומלץ</span>' : 'זמין')) + '</td>' +
    '</tr>';
  }).join('');

  var html = '<div style="background:' + recBg + ';border:1px solid ' + recColor + ';border-radius:var(--radius-md);padding:var(--space-3)">' +
    '<div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2)">' +
      Utils.icon('prison', 14) +
      '<span style="font-weight:600;font-size:13px">המלצת מערכת:</span>' +
      '<span class="badge ' + recBadge + '">' + Utils.escHtml(label) + '</span>' +
      '<span style="font-size:10px;color:var(--color-text-muted);margin-right:auto">אוטומטי — קריאה בלבד</span>' +
    '</div>';
  if (facRec.reasons && facRec.reasons.length) {
    html += '<div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:var(--space-2)">סיבות: ' + Utils.escHtml(facRec.reasons.join(' • ')) + '</div>';
  }
  html += '<table style="width:100%;border-collapse:collapse"><thead><tr style="font-size:10px;color:var(--color-text-muted);border-bottom:1px solid var(--color-divider)">' +
    '<th style="padding:3px 8px;text-align:right;font-weight:500">מתקן</th>' +
    '<th style="padding:3px 8px;text-align:center;font-weight:500">כשיר</th>' +
    '<th style="padding:3px 8px;text-align:right;font-weight:500">הערה</th>' +
    '</tr></thead><tbody>' + matrixHtml + '</tbody></table>';
  if (isOverridden) {
    html += '<div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:var(--radius-sm);padding:6px 10px;font-size:11px;margin-top:var(--space-2);color:#92400e">' +
      Utils.icon('alert', 12) + ' שינוי מהמלצת המערכת: נבחר <strong>' + Utils.escHtml(FACILITY_TYPES[selectedType] ? FACILITY_TYPES[selectedType].label : currentDest) + '</strong> במקום <strong>' + Utils.escHtml(label) + '</strong>' +
    '</div>';
  }
  html += '</div>';

  if (!opts.readonly) {
    html += '<div class="form-group" style="margin-top:var(--space-2);margin-bottom:0">' +
      '<label class="form-label" style="font-size:11px">סיבת שינוי מהמלצה <span style="color:var(--color-text-muted);font-weight:400">(מלא רק אם נבחר יעד שונה מהמלצה)</span></label>' +
      '<textarea id="mc-override-reason" class="form-control" rows="2" style="font-size:12px" placeholder="פרט את הסיבה לשינוי מהמלצת המערכת..."></textarea>' +
    '</div>';
  }
  return html;
}

/* ── Read-only panel helpers ───────────────────────────────────────── */
function renderRankingPanel(indicators, rankResult, opts) {
  opts = opts || {};
  if (!rankResult || rankResult.level === 0) {
    return '<div style="font-size:12px;color:var(--color-text-muted);padding:var(--space-2) 0;display:flex;align-items:center;gap:6px">' +
      Utils.icon('check', 12) + ' לא נמצאו קריטריונים — אין מדרג לתיאום זה.</div>';
  }
  var level  = rankResult.level;
  var bgColor     = level >= 3 ? '#fef2f2' : level === 2 ? '#fffbeb' : '#f0f9ff';
  var borderColor = level >= 3 ? 'var(--color-danger,#dc2626)' : level === 2 ? 'var(--color-warning,#f59e0b)' : 'var(--color-info,#0284c7)';
  var hColor      = level >= 3 ? 'var(--color-danger,#dc2626)' : level === 2 ? 'var(--color-warning,#d97706)' : 'var(--color-info,#0369a1)';
  var criteriaHtml = (rankResult.matchedRules || []).map(function(r) {
    var lvl = typeof r.level === 'number' ? r.level : level;
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">' +
      '<span class="badge ' + MashlatRankingService.levelClass(lvl) + '" style="font-size:10px;padding:1px 6px;flex-shrink:0">' + Utils.escHtml(MashlatRankingService.levelLabel(lvl)) + '</span>' +
      '<span style="font-size:12px">' + Utils.escHtml(r.label) + '</span></div>';
  }).join('');
  return '<div style="background:' + bgColor + ';border:1px solid ' + borderColor + ';border-radius:var(--radius-md);padding:var(--space-3)">' +
    '<div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2)">' +
      Utils.icon('alert', 14) +
      '<span style="font-weight:600;font-size:13px;color:' + hColor + '">מדרג מחושב</span>' +
      '<span class="badge ' + MashlatRankingService.levelClass(level) + '" style="font-size:11px">' + Utils.escHtml(MashlatRankingService.levelLabel(level)) + '</span>' +
      '<span style="font-size:10px;color:var(--color-text-muted);margin-right:auto">אוטומטי — קריאה בלבד</span>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:var(--space-1)">קריטריונים שנמצאו:</div>' +
    criteriaHtml +
  '</div>';
}

/* Renders previous incarceration history table — READ ONLY */
function renderBlueRedHistory(indicators) {
  var records = (indicators && indicators.previousIncarcerations && indicators.previousIncarcerations.records) || [];
  if (!records.length) {
    return '<div style="font-size:12px;color:var(--color-text-muted);padding:var(--space-2) 0">אין כליאות קודמות במאגר.</div>';
  }
  var pi = indicators.previousIncarcerations;
  return '<div>' +
    '<div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2)">' +
      '<span style="font-size:11px">סה"כ: <strong>' + pi.count + '</strong></span>' +
      '<span style="font-size:11px">ימים: <strong>' + pi.totalDays + '</strong></span>' +
      (pi.lastEntry ? '<span style="font-size:11px">אחרונה: <strong>' + Utils.formatDate(pi.lastEntry) + '</strong></span>' : '') +
    '</div>' +
    '<div style="overflow-x:auto"><table class="data-table" style="font-size:11px;min-width:520px"><thead><tr>' +
      '<th>מספר תיק</th><th>כניסה</th><th>יציאה</th><th>מתקן</th><th>סוג</th><th>ימים</th><th>עבירה</th><th>סטטוס</th>' +
    '</tr></thead><tbody>' +
    records.map(function(h) {
      return '<tr>' +
        '<td class="td-id">' + Utils.escHtml(h.fileNumber) + '</td>' +
        '<td>' + Utils.formatDate(h.entryDate) + '</td>' +
        '<td>' + Utils.formatDate(h.releaseDate) + '</td>' +
        '<td>' + Utils.escHtml(Utils.truncate(h.facility || '—', 20)) + '</td>' +
        '<td>' + Utils.escHtml(h.type || '—') + '</td>' +
        '<td style="text-align:center">' + (h.days || '—') + '</td>' +
        '<td>' + Utils.escHtml(Utils.truncate(h.offense || '—', 22)) + '</td>' +
        '<td>' + Utils.escHtml(h.status || '—') + '</td>' +
      '</tr>';
    }).join('') +
    '</tbody></table></div>' +
  '</div>';
}

/* Renders system activity log for a specific coordination */
function renderSystemActivity(coordinationId) {
  var entries = Storage.getCollection(Storage.KEYS.AUDIT_ENTRIES)
    .filter(function(e) { return e.entityId === coordinationId; })
    .sort(function(a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });
  if (!entries.length) return '<div style="font-size:12px;color:var(--color-text-muted);padding:var(--space-2) 0">אין פעילות מערכת מתועדת.</div>';
  return '<div style="font-size:11px">' +
    entries.slice(0, 8).map(function(e) {
      return '<div style="display:flex;align-items:flex-start;gap:8px;padding:4px 0;border-bottom:1px solid var(--color-divider)">' +
        '<span style="color:var(--color-text-muted);white-space:nowrap;font-size:10px">' + Utils.escHtml((e.timestamp || '').slice(0, 16).replace('T', ' ')) + '</span>' +
        '<span style="flex:1">' + Utils.escHtml(e.description) + '</span>' +
        '<span style="color:var(--color-text-muted);font-size:10px;flex-shrink:0">' + Utils.escHtml(e.userName || '') + '</span>' +
      '</div>';
    }).join('') +
  '</div>';
}

/* ── Main page ─────────────────────────────────────────────────────── */
Pages['mashlat'] = function(query) {
  var content = Utils.el('page-content');

  processNoShows();

  var people = Storage.getCollection(Storage.KEYS.PEOPLE);
  var pMap   = Object.fromEntries(people.map(function(p) { return [p.id, p]; }));

  var DESTINATIONS = ['בסיס 100', 'בסיס 416', 'בסיס 302', 'בסיס 708', 'כלא 6', 'כלא 4', 'כלא 1', 'מעצר חוץ חילי'];

  var TRANSFER_REASON_LABELS = {
    security_situation: 'מצב ביטחוני',
    living_conditions:  'תנאי מחיה',
    other:              'אחר',
  };

  /* State */
  var activeTab       = (query && query.tab) || 'today';
  var filterSearch    = '';
  var filterMilNum    = '';
  var filterDateFrom  = '';
  var filterDateTo    = '';
  var filterUnit      = '';
  var filterDest      = '';
  var filterStatus    = '';
  var filterCoord     = '';
  var filterAlert     = '';
  var searchPanelOpen = false;
  var selectedId      = null;

  /* ── Data ─────────────────────────────────────────────────────────── */
  function getAll() {
    return Storage.getCollection(Storage.KEYS.MASHLAT_COORDINATIONS);
  }

  function getRanking(r) {
    if (r.rankingSnapshot && typeof r.rankingSnapshot.level === 'number') return r.rankingSnapshot;
    var indicators = ExternalPersonDataService.getPersonIndicators(r.personId);
    return MashlatRankingService.calculate(indicators);
  }

  /* Helper: unit from coordination record (prefers requester.unit, falls back to sourceUnitName) */
  function unitOf(r) {
    return (r.requester && r.requester.unit) || r.sourceUnitName || '';
  }

  function getFiltered() {
    var rows  = getAll();
    var today = Utils.today();

    switch (activeTab) {
      case 'today':     rows = rows.filter(function(r) { return r.coordinationDate === today && MASHLAT_ACTIVE.includes(r.status); }); break;
      case 'active':    rows = rows.filter(function(r) { return MASHLAT_ACTIVE.includes(r.status) && r.coordinationDate >= today; }); break;
      case 'future':    rows = rows.filter(function(r) { return r.coordinationDate > today && r.status === 'coordinated'; }); break;
      case 'no_show':   rows = rows.filter(function(r) { return r.status === 'no_show'; }); break;
      case 'completed': rows = rows.filter(function(r) { return r.status === 'completed'; }); break;
      case 'archive':   rows = rows.filter(function(r) { return MASHLAT_ARCHIVE.includes(r.status); }); break;
    }

    if (filterSearch) {
      var q = filterSearch.toLowerCase();
      rows = rows.filter(function(r) {
        var p = pMap[r.personId];
        return (r.coordinationNumber || '').toLowerCase().includes(q) ||
          (p && (p.firstName + ' ' + p.lastName).toLowerCase().includes(q)) ||
          (p && p.militaryNumber.includes(q)) ||
          (r.manualFirstName || '').toLowerCase().includes(q) ||
          (r.manualLastName  || '').toLowerCase().includes(q) ||
          unitOf(r).toLowerCase().includes(q) ||
          (r.coordinatorName || '').toLowerCase().includes(q) ||
          ((r.requester && r.requester.firstName + ' ' + r.requester.lastName) || '').toLowerCase().includes(q);
      });
    }
    if (filterMilNum) {
      rows = rows.filter(function(r) {
        var p = pMap[r.personId];
        return (p && p.militaryNumber.includes(filterMilNum)) || (r.manualMilNum || '').includes(filterMilNum);
      });
    }
    if (filterDateFrom) rows = rows.filter(function(r) { return r.coordinationDate >= filterDateFrom; });
    if (filterDateTo)   rows = rows.filter(function(r) { return r.coordinationDate <= filterDateTo; });
    if (filterUnit)     rows = rows.filter(function(r) { return unitOf(r).includes(filterUnit); });
    if (filterDest)     rows = rows.filter(function(r) { return r.destinationPrisonId === filterDest; });
    if (filterStatus)   rows = rows.filter(function(r) { return r.status === filterStatus; });
    if (filterCoord)    rows = rows.filter(function(r) { return (r.coordinatorName || '').includes(filterCoord); });
    if (filterAlert !== '') {
      var tl = parseInt(filterAlert, 10);
      rows = rows.filter(function(r) {
        var rank = getRanking(r);
        if (isNaN(tl) || tl === 0) return rank.level === 0;
        return rank.level >= tl;
      });
    }

    var PRIO = { no_show: 0, arrived: 1, intake: 1, today: 2, coordinated: 3, deferred: 4, completed: 5, cancelled: 6 };
    return rows.sort(function(a, b) {
      var pA = PRIO[a.status] !== undefined ? PRIO[a.status] : 9;
      var pB = PRIO[b.status] !== undefined ? PRIO[b.status] : 9;
      if (pA !== pB) return pA - pB;
      var d = (a.coordinationDate || '').localeCompare(b.coordinationDate || '');
      return d !== 0 ? d : (a.coordinationTime || '').localeCompare(b.coordinationTime || '');
    });
  }

  function getTabCounts() {
    var all = getAll(), today = Utils.today();
    return {
      today:     all.filter(function(r) { return r.coordinationDate === today && MASHLAT_ACTIVE.includes(r.status); }).length,
      active:    all.filter(function(r) { return MASHLAT_ACTIVE.includes(r.status) && r.coordinationDate >= today; }).length,
      future:    all.filter(function(r) { return r.coordinationDate > today && r.status === 'coordinated'; }).length,
      no_show:   all.filter(function(r) { return r.status === 'no_show'; }).length,
      completed: all.filter(function(r) { return r.status === 'completed'; }).length,
      archive:   all.filter(function(r) { return MASHLAT_ARCHIVE.includes(r.status); }).length,
      all:       all.length,
    };
  }

  /* ── Render ──────────────────────────────────────────────────────── */
  function render() {
    var counts = getTabCounts();
    var rows   = getFiltered();
    var activeFilterCount = [filterSearch, filterMilNum, filterDateFrom, filterDateTo,
      filterUnit, filterDest, filterStatus, filterCoord, filterAlert].filter(Boolean).length;

    var TABS = [
      { id: 'today', label: 'להיום' }, { id: 'active', label: 'פעילים' },
      { id: 'future', label: 'עתידיים' }, { id: 'no_show', label: 'לא הגיעו' },
      { id: 'completed', label: 'בוצעו' }, { id: 'archive', label: 'ארכיון' }, { id: 'all', label: 'הכל' },
    ];

    content.innerHTML =
      '<div class="page-wrapper">' +
        Utils.pageHeader('משל"ט', Utils.pageMeta()) +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">' +
          '<button class="btn btn-primary" id="btn-new-coord">' + Utils.icon('plus', 14) + ' תיאום חדש</button>' +
          '<button class="btn btn-secondary btn-sm" id="btn-export-mashlat">' + Utils.icon('download', 14) + ' ייצוא</button>' +
          '<button class="btn btn-ghost btn-sm" id="btn-toggle-search">' +
            Utils.icon('search', 13) + ' חיפוש מתקדם' +
            (activeFilterCount > 0 ? '<span class="badge badge-info" style="font-size:10px;margin-right:4px">' + activeFilterCount + '</span>' : '') +
          '</button>' +
        '</div>' +
        renderSearchPanel() +
        '<div class="tabs-filter-row">' +
          '<div class="tabs-filter-row-tabs">' +
            TABS.map(function(t) {
              return '<button class="tab-btn ' + (activeTab === t.id ? 'active' : '') + '" data-tab="' + t.id + '">' +
                Utils.escHtml(t.label) + (counts[t.id] > 0 ? '<span class="tab-count">' + counts[t.id] + '</span>' : '') + '</button>';
            }).join('') +
          '</div>' +
          '<div class="tabs-filter-row-filters">' +
            '<div class="search-input-wrap" style="width:190px">' +
              Utils.icon('search', 13) +
              '<input class="form-control search-input" id="mslt-search" placeholder=\'שם / מ"א / יחידה / מספר\' value="' + Utils.escHtml(filterSearch) + '">' +
            '</div>' +
            (activeFilterCount > 0 ? '<button class="btn btn-ghost btn-sm" id="btn-clear-f" style="height:30px;padding:0 8px;font-size:12px">נקה הכל</button>' : '') +
          '</div>' +
        '</div>' +
        '<div id="mslt-main" style="display:grid;grid-template-columns:' + (selectedId ? '67% 1fr' : '1fr') + ';gap:var(--space-3);align-items:start">' +
          renderTable(rows) +
          (selectedId ? renderDetailDrawer(selectedId) : '') +
        '</div>' +
        Utils.classificationFooter() +
      '</div>';

    attachEvents();
  }

  function renderSearchPanel() {
    if (!searchPanelOpen) return '';
    return '<div id="mslt-adv-search" style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-3)">' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-3)">' +
        '<div class="form-group" style="margin-bottom:0"><label class="form-label" style="font-size:11px;margin-bottom:4px">מספר אישי</label><input class="form-control" id="mslt-f-milnum" placeholder=\'מ"א\' value="' + Utils.escHtml(filterMilNum) + '" style="font-size:12px"></div>' +
        '<div class="form-group" style="margin-bottom:0"><label class="form-label" style="font-size:11px;margin-bottom:4px">שם</label><input class="form-control" id="mslt-f-name" placeholder="שם פרטי / משפחה" value="' + Utils.escHtml(filterSearch) + '" style="font-size:12px"></div>' +
        '<div class="form-group" style="margin-bottom:0"><label class="form-label" style="font-size:11px;margin-bottom:4px">מתאריך</label><input type="date" class="form-control" id="mslt-f-from" value="' + filterDateFrom + '" style="font-size:12px"></div>' +
        '<div class="form-group" style="margin-bottom:0"><label class="form-label" style="font-size:11px;margin-bottom:4px">עד תאריך</label><input type="date" class="form-control" id="mslt-f-to" value="' + filterDateTo + '" style="font-size:12px"></div>' +
        '<div class="form-group" style="margin-bottom:0"><label class="form-label" style="font-size:11px;margin-bottom:4px">סטטוס</label><select class="form-control" id="mslt-f-status" style="font-size:12px"><option value="">כל הסטטוסים</option>' +
          Object.entries(MASHLAT_STATUSES).map(function(e) { return '<option value="' + e[0] + '" ' + (filterStatus === e[0] ? 'selected' : '') + '>' + Utils.escHtml(e[1].label) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="form-group" style="margin-bottom:0"><label class="form-label" style="font-size:11px;margin-bottom:4px">יעד כליאה</label><select class="form-control" id="mslt-f-dest" style="font-size:12px"><option value="">כל היעדים</option>' +
          DESTINATIONS.map(function(d) { return '<option value="' + Utils.escHtml(d) + '" ' + (filterDest === d ? 'selected' : '') + '>' + Utils.escHtml(d) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="form-group" style="margin-bottom:0"><label class="form-label" style="font-size:11px;margin-bottom:4px">גורם מתאם</label><input class="form-control" id="mslt-f-coord" placeholder="שם מתאם" value="' + Utils.escHtml(filterCoord) + '" style="font-size:12px"></div>' +
        '<div class="form-group" style="margin-bottom:0"><label class="form-label" style="font-size:11px;margin-bottom:4px">מדרג</label><select class="form-control" id="mslt-f-alert" style="font-size:12px"><option value="">כל הרמות</option><option value="3" ' + (filterAlert === '3' ? 'selected' : '') + '>מדרג 3 ומעלה</option><option value="2" ' + (filterAlert === '2' ? 'selected' : '') + '>מדרג 2 ומעלה</option><option value="1" ' + (filterAlert === '1' ? 'selected' : '') + '>מדרג 1 ומעלה</option><option value="0" ' + (filterAlert === '0' ? 'selected' : '') + '>ללא מדרג</option></select></div>' +
      '</div>' +
      '<div style="margin-top:var(--space-3);display:flex;gap:var(--space-2)">' +
        '<button class="btn btn-secondary btn-sm" id="btn-clear-f">נקה פילטרים</button>' +
        '<button class="btn btn-ghost btn-sm" id="btn-close-search">סגור</button>' +
      '</div>' +
    '</div>';
  }

  /* ── Table ───────────────────────────────────────────────────────── */
  function renderTable(rows) {
    if (!rows.length) {
      return '<div class="data-table-wrap"><div class="empty-state" style="padding:var(--space-16)">' +
        '<div class="empty-state-icon">' + Utils.icon('mashlat', 32) + '</div>' +
        '<div class="empty-state-title">אין תיאומים</div>' +
        '<div class="empty-state-desc">לא נמצאו תיאומים תואמים לסינון הנוכחי.</div>' +
      '</div></div>';
    }
    return '<div class="data-table-wrap"><div style="overflow-x:auto">' +
      '<table class="data-table dense" style="min-width:1000px"><thead><tr>' +
        '<th style="width:100px">מס׳ תיאום</th>' +
        '<th style="width:72px">מ"א</th>' +
        '<th style="width:110px">שם</th>' +
        '<th style="width:100px">יחידה</th>' +
        '<th style="width:90px">מועד</th>' +
        '<th style="width:150px">סיבת כליאה / עבירה</th>' +
        '<th style="width:50px">ימים</th>' +
        '<th style="width:90px">יעד</th>' +
        '<th style="width:68px">מדרג</th>' +
        '<th style="width:90px">סטטוס</th>' +
        '<th style="width:100px">גורם מתאם</th>' +
        '<th style="width:52px"></th>' +
      '</tr></thead><tbody>' +
        rows.map(function(r) { return renderRow(r); }).join('') +
      '</tbody></table></div>' +
      '<div class="pagination-wrap"><span class="table-count"><strong>' + rows.length + '</strong> תיאומים</span></div>' +
    '</div>';
  }

  function renderRow(r) {
    var p      = pMap[r.personId];
    var milNum = p ? Utils.escHtml(p.militaryNumber) : Utils.escHtml(r.manualMilNum || '—');
    var name   = p ? Utils.escHtml(p.firstName + ' ' + p.lastName) : Utils.escHtml(((r.manualFirstName || '') + ' ' + (r.manualLastName || '')).trim() || '—');
    var unit   = Utils.escHtml(Utils.truncate(unitOf(r) || '—', 14));
    var isActive = MASHLAT_ACTIVE.includes(r.status);

    var indicators  = ExternalPersonDataService.getPersonIndicators(r.personId);
    var rankResult  = MashlatRankingService.calculate(indicators);
    var priorCount  = indicators.previousIncarcerations.count;
    var rowCls = r.status === 'no_show' ? 'row-critical' : (r.status === 'arrived' || r.status === 'intake') ? 'row-attention' : '';

    var rankBadge = rankResult.level > 0
      ? '<span class="badge ' + MashlatRankingService.levelClass(rankResult.level) + '" style="font-size:11px;cursor:default" title="' +
          Utils.escHtml(rankResult.matchedRules.map(function(rr) { return rr.label; }).join(', ')) + '">' +
          Utils.escHtml(MashlatRankingService.levelLabel(rankResult.level)) +
          (priorCount > 0 ? ' <span style="opacity:.7">(' + priorCount + ')</span>' : '') +
        '</span>'
      : '<span style="color:var(--color-text-muted);font-size:12px">—</span>';

    /* Override indicator on yad */
    var destDisplay = Utils.escHtml(r.destinationPrisonId || '—');
    /* Override indicator only shown when a confirmed recommendation existed */
    var overrideIndicator = (r.facilityDecision && r.facilityDecision.wasOverridden && r.facilityDecision.recommendedFacility)
      ? ' <span title="שינוי מהמלצה" style="color:#f59e0b;font-size:10px">⚠</span>' : '';

    var primaryAction = '';
    if (r.status === 'coordinated' || r.status === 'today') {
      primaryAction = '<button class="btn btn-success btn-sm" style="font-size:11px;padding:3px 8px;white-space:nowrap" onclick="event.stopPropagation();window._msltArrival(\'' + r.id + '\')">אשר הגעה</button>';
    } else if (r.status === 'arrived') {
      primaryAction = '<button class="btn btn-primary btn-sm" style="font-size:11px;padding:3px 8px;white-space:nowrap" onclick="event.stopPropagation();window._msltIntake(\'' + r.id + '\')">פתח תיק</button>';
    } else if (r.status === 'no_show') {
      primaryAction = '<button class="btn btn-secondary btn-sm" style="font-size:11px;padding:3px 8px;white-space:nowrap" onclick="event.stopPropagation();window._msltReschedule(\'' + r.id + '\')">תיאום מחדש</button>';
    } else if (r.status === 'completed' && r.prisonerFileId) {
      primaryAction = '<button class="btn btn-ghost btn-sm" style="font-size:11px;padding:3px 8px;white-space:nowrap" onclick="event.stopPropagation();Router.navigate(\'/prisoner-file\',{id:\'' + r.prisonerFileId + '\'})">פתח תיק</button>';
    } else if (isActive) {
      primaryAction = '<button class="row-action-btn" onclick="event.stopPropagation();window._msltEdit(\'' + r.id + '\')">' + Utils.icon('edit', 13) + '</button>';
    }

    return '<tr class="' + rowCls + ' ' + (selectedId === r.id ? 'row-selected' : '') + '" style="cursor:pointer" onclick="window._msltSelect(\'' + r.id + '\')">' +
      '<td><span class="td-id" style="font-size:11px;font-family:monospace">' + Utils.escHtml(r.coordinationNumber) + '</span></td>' +
      '<td><span style="font-family:monospace;font-size:12px">' + milNum + '</span></td>' +
      '<td><span class="cell-primary">' + name + '</span></td>' +
      '<td><span style="font-size:12px">' + unit + '</span></td>' +
      '<td><div class="cell-two-line"><span class="cell-primary">' + Utils.formatDate(r.coordinationDate) + '</span><span class="cell-secondary">' + Utils.escHtml(r.coordinationTime || '—') + '</span></div></td>' +
      '<td><span class="cell-primary">' + Utils.escHtml(Utils.truncate(r.offense || '—', 24)) + '</span></td>' +
      '<td style="text-align:center"><span style="font-size:12px">' + (r.incarcerationDays || '—') + '</span></td>' +
      '<td><span style="font-size:12px">' + destDisplay + overrideIndicator + '</span></td>' +
      '<td style="text-align:center">' + rankBadge + '</td>' +
      '<td>' + mashlatStatusBadge(r.status) + '</td>' +
      '<td><span style="font-size:12px">' + Utils.escHtml(Utils.truncate(r.coordinatorName || '—', 14)) + '</span></td>' +
      '<td>' + primaryAction + '</td>' +
    '</tr>';
  }

  /* ── Detail drawer ───────────────────────────────────────────────── */
  function renderDetailDrawer(id) {
    var r = Storage.getById(Storage.KEYS.MASHLAT_COORDINATIONS, id);
    if (!r) return '';
    var p        = pMap[r.personId];
    var esc      = function(v) { return Utils.escHtml(v || '—'); };
    var fd       = function(v) { return v ? Utils.formatDate(v) : '—'; };
    var isActive = MASHLAT_ACTIVE.includes(r.status);

    var indicators = ExternalPersonDataService.getPersonIndicators(r.personId);
    var rankResult, rankIsSnapshot = false;
    if (r.rankingSnapshot && typeof r.rankingSnapshot.level === 'number') {
      rankResult = r.rankingSnapshot; rankIsSnapshot = true;
    } else {
      rankResult = MashlatRankingService.calculate(indicators);
    }

    /* Facility decision — stored snapshot or compute fresh */
    var facRec = r.facilityDecision
      ? { recommended: r.facilityDecision.recommendedFacility, recommendedLabel: r.facilityDecision.recommendedFacilityLabel || '', blocked: r.facilityDecision.blockedFacilities || {}, reasons: [] }
      : computeFacilityRecommendation(indicators);

    var history = getAll().filter(function(c) { return c.personId === r.personId && c.id !== r.id; })
      .sort(function(a, b) { return (b.coordinationDate || '').localeCompare(a.coordinationDate || ''); });

    var OPR_TAG  = '<span style="font-size:10px;color:var(--color-text-muted);background:var(--color-page-bg);border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:1px 5px;margin-right:4px">הוזן בתיאום</span>';

    var SEC = function(icon, title, tag) {
      return '<div class="form-section-header"><div class="form-section-title">' + Utils.icon(icon, 14) + ' ' + title + (tag || '') + '</div></div>';
    };

    /* Requester (גורם דורש) — new field or legacy */
    var req = r.requester || {};
    var reqName = ((req.firstName || '') + ' ' + (req.lastName || '')).trim();
    var reqPersonalNum = req.personalNumber || '';
    var reqPhone = req.phone || '';
    var reqUnit  = req.unit || r.sourceUnitName || '';

    return '<div class="card" style="position:sticky;top:calc(var(--topbar-height,0px) + var(--space-3));max-height:calc(100vh - var(--topbar-height,0px) - var(--space-6));display:flex;flex-direction:column;overflow:hidden">' +
      '<div class="card-header">' +
        '<div class="card-title" style="font-size:13px">' + esc(r.coordinationNumber) + ' ' + mashlatStatusBadge(r.status) + '</div>' +
        '<button class="btn btn-ghost btn-sm" onclick="window._msltSelect(null)">' + Utils.icon('x', 14) + '</button>' +
      '</div>' +
      '<div class="card-body" style="overflow-y:auto;flex:1;padding:var(--space-3)">' +

        /* 1. פרטי החייל */
        SEC('person', 'פרטי החייל') +
        (p ? '<div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3)">' +
          '<div class="sidebar-avatar" style="background:' + Utils.avatarColor(p.id) + ';width:36px;height:36px;font-size:13px;flex-shrink:0">' + Utils.initials(p.firstName, p.lastName) + '</div>' +
          '<div><div style="font-weight:600;font-size:14px">' + esc(p.firstName) + ' ' + esc(p.lastName) + '</div>' +
          '<div style="font-size:12px;color:var(--color-text-muted)">' + esc(rankLabel(r.rank || p.rank || '')) + ' • מ"א ' + esc(p.militaryNumber) + '</div></div>' +
        '</div>' : (r.manualFirstName ? '<div style="font-weight:600;font-size:13px;margin-bottom:var(--space-3)">' + esc(r.manualFirstName) + ' ' + esc(r.manualLastName) + ' — מ"א ' + esc(r.manualMilNum) + '</div>' : '')) +

        /* 2. כליאות קודמות */
        SEC('history', 'כליאות קודמות') +
        '<div style="margin-bottom:var(--space-3)">' + renderBlueRedHistory(indicators) + '</div>' +

        /* 3. מדרג וחיוויים */
        SEC('alert', 'מדרג וחיוויים') +
        '<div style="margin-bottom:var(--space-2)">' + renderRankingPanel(indicators, rankResult) + '</div>' +
        '<div style="font-size:10px;color:var(--color-text-muted);margin-bottom:var(--space-3)">' +
          (rankIsSnapshot
            ? 'מחושב בעת יצירת התיאום (' + fd(r.rankingSnapshot && r.rankingSnapshot.calculatedAt) + ')'
            : 'מחושב נכון לעכשיו') +
        '</div>' +

        /* 4. חסימות והתאמת מתקן */
        SEC('prison', 'חסימות והתאמת מתקן') +
        '<div style="margin-bottom:var(--space-3)">' +
          renderFacilityPanel(facRec, r.destinationPrisonId, { readonly: true }) +
          (r.facilityDecision && r.facilityDecision.wasOverridden ? '<div style="font-size:12px;margin-top:var(--space-2);padding:6px 10px;background:#fffbeb;border-radius:var(--radius-sm)">' +
            '<span style="color:#92400e;font-weight:600">סיבת שינוי: </span>' + esc(r.facilityDecision.overrideReason) +
          '</div>' : '') +
        '</div>' +

        /* 5. פרטי גורם דורש */
        SEC('person', 'פרטי גורם דורש', OPR_TAG) +
        '<div class="info-list" style="margin-bottom:var(--space-3)">' +
          (reqPersonalNum ? '<div class="info-item"><div class="info-label">מספר אישי</div><div class="info-value" style="font-family:monospace">' + esc(reqPersonalNum) + '</div></div>' : '') +
          (reqName ? '<div class="info-item"><div class="info-label">שם</div><div class="info-value">' + esc(reqName) + '</div></div>' : '') +
          (reqPhone ? '<div class="info-item"><div class="info-label">טלפון</div><div class="info-value" dir="ltr">' + esc(reqPhone) + '</div></div>' : '') +
          (reqUnit ? '<div class="info-item"><div class="info-label">יחידה</div><div class="info-value">' + esc(reqUnit) + '</div></div>' : '') +
          (!reqPersonalNum && !reqName && !reqPhone && !reqUnit ? '<div style="font-size:12px;color:var(--color-text-muted)">לא הוזן גורם דורש</div>' : '') +
        '</div>' +

        /* 6. פרטי התיאום */
        SEC('calendar', 'פרטי התיאום', OPR_TAG) +
        '<div class="info-list" style="margin-bottom:var(--space-3)">' +
          '<div class="info-item"><div class="info-label">תאריך בקשה</div><div class="info-value">' + fd(r.requestedAt) + '</div></div>' +
          '<div class="info-item"><div class="info-label">תאריך התייצבות</div><div class="info-value" style="font-weight:600">' + fd(r.coordinationDate) + '</div></div>' +
          '<div class="info-item"><div class="info-label">שעה</div><div class="info-value">' + esc(r.coordinationTime) + '</div></div>' +
          '<div class="info-item"><div class="info-label">יעד כליאה</div><div class="info-value">' + esc(r.destinationPrisonId) + '</div></div>' +
        '</div>' +

        /* 7. פרטי הכליאה */
        SEC('prison', 'פרטי הכליאה', OPR_TAG) +
        '<div class="info-list" style="margin-bottom:var(--space-3)">' +
          '<div class="info-item"><div class="info-label">עבירה</div><div class="info-value">' + esc(r.offense) + '</div></div>' +
          '<div class="info-item"><div class="info-label">ימי כליאה</div><div class="info-value" style="font-weight:600">' + esc(String(r.incarcerationDays || '—')) + '</div></div>' +
          (r.transferReason ? '<div class="info-item"><div class="info-label">סיבת העברה</div><div class="info-value">' + esc(TRANSFER_REASON_LABELS[r.transferReason] || r.transferReason) + (r.transferReasonDetail ? ' — ' + esc(r.transferReasonDetail) : '') + '</div></div>' : '') +
        '</div>' +

        /* 8. גורם מתאם */
        SEC('person', 'גורם מתאם', OPR_TAG) +
        '<div class="info-list" style="margin-bottom:var(--space-3)">' +
          '<div class="info-item"><div class="info-label">שם מתאם</div><div class="info-value">' + esc(r.coordinatorName) + '</div></div>' +
          /* legacy phone for old records */
          (r.coordinatorPhone ? '<div class="info-item"><div class="info-label">טלפון</div><div class="info-value" dir="ltr" style="color:var(--color-text-muted)">' + esc(r.coordinatorPhone) + '</div></div>' : '') +
        '</div>' +

        /* 9. הערות */
        (r.medicalNotes || r.generalNotes ? SEC('report', 'הערות / הנחיות') : '') +
        (r.medicalNotes ? '<div style="margin-bottom:var(--space-2)"><div class="info-label" style="font-size:11px">הערות רפואיות</div><div style="font-size:12px;margin-top:4px;padding:8px;background:#fffbeb;border-radius:var(--radius-sm)">' + esc(r.medicalNotes) + '</div></div>' : '') +
        (r.generalNotes ? '<div style="margin-bottom:var(--space-3)"><div class="info-label" style="font-size:11px">הערות כלליות</div><div style="font-size:12px;margin-top:4px">' + esc(r.generalNotes) + '</div></div>' : '') +

        /* Arrival / intake status */
        (r.arrivalConfirmed ? '<div style="padding:8px 12px;background:var(--color-success-bg);border-radius:var(--radius-md);margin-bottom:var(--space-3);font-size:13px;color:var(--color-success)">' + Utils.icon('check', 14) + ' הגיע בתאריך ' + Utils.formatDateTime(r.arrivalConfirmedAt) + '</div>' : '') +
        (r.status === 'completed' && r.prisonerFileId ? '<div style="padding:8px 12px;background:var(--color-primary-subtle);border-radius:var(--radius-md);margin-bottom:var(--space-3);font-size:13px;display:flex;align-items:center;justify-content:space-between">' +
          '<span>' + Utils.icon('prison', 14) + ' תיק כלוא נפתח</span>' +
          '<button class="btn btn-ghost btn-sm" onclick="Router.navigate(\'/prisoner-file\',{id:\'' + r.prisonerFileId + '\'})">פתח תיק</button>' +
        '</div>' : '') +

        /* היסטוריית תיאומים */
        (history.length > 0 ?
          SEC('report', 'היסטוריית תיאומים') +
          '<div style="font-size:12px;margin-bottom:var(--space-3)">' +
            history.slice(0, 5).map(function(c) {
              return '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--color-divider)">' +
                '<span class="text-muted">' + Utils.formatDate(c.coordinationDate) + ' ' + esc(c.coordinationTime || '') + '</span>' +
                '<span>' + esc(c.coordinationNumber) + '</span>' +
                '<span>' + mashlatStatusBadge(c.status) + '</span>' +
              '</div>';
            }).join('') +
          '</div>' : '') +

        /* פעילות מערכת */
        SEC('report', 'פעילות מערכת') +
        renderSystemActivity(r.id) +

        /* Actions */
        '<div style="margin-top:var(--space-4);display:flex;flex-wrap:wrap;gap:var(--space-2)">' +
          (isActive ? '<button class="btn btn-secondary btn-sm" onclick="window._msltEdit(\'' + r.id + '\')">' + Utils.icon('edit', 13) + ' ערוך</button>' : '') +
          ((r.status === 'coordinated' || r.status === 'today') ? '<button class="btn btn-success btn-sm" onclick="window._msltArrival(\'' + r.id + '\')">' + Utils.icon('check', 13) + ' אשר הגעה</button>' : '') +
          (r.status === 'arrived' ? '<button class="btn btn-primary btn-sm" onclick="window._msltIntake(\'' + r.id + '\')">' + Utils.icon('prison', 13) + ' פתח תיק כלוא</button>' : '') +
          (r.status === 'no_show' ? '<button class="btn btn-outline-primary btn-sm" onclick="window._msltReschedule(\'' + r.id + '\')">' + Utils.icon('refresh', 13) + ' תיאום מחדש</button>' : '') +
        '</div>' +

      '</div>' +
    '</div>';
  }

  /* ── Events ──────────────────────────────────────────────────────── */
  function attachEvents() {
    Utils.delegate(content, '.tab-btn', 'click', function() { activeTab = this.dataset.tab; selectedId = null; render(); });

    var searchEl = Utils.el('mslt-search');
    if (searchEl) searchEl.addEventListener('input', Utils.debounce(function() { filterSearch = searchEl.value; render(); }, 280));

    var clearBtn = Utils.el('btn-clear-f');
    if (clearBtn) clearBtn.onclick = function() {
      filterSearch = ''; filterMilNum = ''; filterDateFrom = ''; filterDateTo = '';
      filterUnit = ''; filterDest = ''; filterStatus = ''; filterCoord = ''; filterAlert = '';
      render();
    };

    var toggleBtn = Utils.el('btn-toggle-search');
    if (toggleBtn) toggleBtn.onclick = function() { searchPanelOpen = !searchPanelOpen; render(); };
    var closeSearch = Utils.el('btn-close-search');
    if (closeSearch) closeSearch.onclick = function() { searchPanelOpen = false; render(); };

    var fMilNum = Utils.el('mslt-f-milnum');
    if (fMilNum) fMilNum.addEventListener('input', Utils.debounce(function() { filterMilNum = fMilNum.value; render(); }, 280));
    var fName = Utils.el('mslt-f-name');
    if (fName) fName.addEventListener('input', Utils.debounce(function() { filterSearch = fName.value; render(); }, 280));
    var fFrom = Utils.el('mslt-f-from');
    if (fFrom) fFrom.onchange = function() { filterDateFrom = fFrom.value; render(); };
    var fTo = Utils.el('mslt-f-to');
    if (fTo) fTo.onchange = function() { filterDateTo = fTo.value; render(); };
    var fStatus = Utils.el('mslt-f-status');
    if (fStatus) fStatus.onchange = function() { filterStatus = fStatus.value; render(); };
    var fDest = Utils.el('mslt-f-dest');
    if (fDest) fDest.onchange = function() { filterDest = fDest.value; render(); };
    var fCoord = Utils.el('mslt-f-coord');
    if (fCoord) fCoord.addEventListener('input', Utils.debounce(function() { filterCoord = fCoord.value; render(); }, 280));
    var fAlert = Utils.el('mslt-f-alert');
    if (fAlert) fAlert.onchange = function() { filterAlert = fAlert.value; render(); };

    var newBtn = Utils.el('btn-new-coord');
    if (newBtn) newBtn.onclick = function() { openCoordinationModal(null); };
    var exportBtn = Utils.el('btn-export-mashlat');
    if (exportBtn) exportBtn.onclick = exportCsv;

    window._msltSelect     = function(id) { selectedId = id; render(); };
    window._msltEdit       = function(id) { var c = Storage.getById(Storage.KEYS.MASHLAT_COORDINATIONS, id); if (c) openCoordinationModal(c); };
    window._msltArrival    = function(id) { confirmArrival(id); };
    window._msltIntake     = function(id) { openIntakeModal(id); };
    window._msltReschedule = function(id) { reschedule(id); };
  }

  /* ── Coordination modal — 10 sections ───────────────────────────── */
  function openCoordinationModal(prefill) {
    var isEdit = !!prefill;
    var p      = prefill && prefill.personId ? pMap[prefill.personId] : null;
    var req    = (prefill && prefill.requester) || {};

    Modal.open({
      title: (isEdit && prefill.id) ? ('עריכת תיאום ' + (prefill.coordinationNumber || '')) : (isEdit ? 'תיאום מחדש' : 'תיאום חדש'),
      size: 'lg',
      body:

        /* §1 — פרטי החייל */
        '<div class="form-section-header" style="margin-top:0"><div class="form-section-title">' + Utils.icon('search', 14) + ' 1. פרטי החייל</div></div>' +
        '<div class="form-row form-row-3" style="margin-bottom:var(--space-2)">' +
          '<div class="form-group"><label class="form-label">מספר אישי <span class="required">*</span></label>' +
            '<div style="display:flex;gap:var(--space-2)">' +
              '<input id="mc-mil-num" class="form-control" placeholder="מספר אישי" value="' + Utils.escHtml(p ? p.militaryNumber : (prefill && prefill.manualMilNum || '')) + '" style="flex:1">' +
              '<button class="btn btn-secondary btn-sm" onclick="window._msltLookup()" style="flex-shrink:0">חיפוש</button>' +
            '</div></div>' +
          '<div class="form-group"><label class="form-label">שם פרטי <span class="required">*</span></label><input id="mc-first" class="form-control" value="' + Utils.escHtml(p ? p.firstName : (prefill && prefill.manualFirstName || '')) + '" placeholder="שם פרטי" readonly></div>' +
          '<div class="form-group"><label class="form-label">שם משפחה <span class="required">*</span></label><input id="mc-last" class="form-control" value="' + Utils.escHtml(p ? p.lastName : (prefill && prefill.manualLastName || '')) + '" placeholder="שם משפחה" readonly></div>' +
        '</div>' +
        '<input type="hidden" id="mc-person-id" value="' + Utils.escHtml(prefill && prefill.personId || '') + '">' +
        '<input type="hidden" id="mc-rank-val" value="' + Utils.escHtml(prefill && prefill.rank || (p && p.rank) || '') + '">' +
        '<input type="hidden" id="mc-service-val" value="' + Utils.escHtml(prefill && prefill.serviceType || (p && p.serviceType) || '') + '">' +

        /* §2–4 external sections (populated after lookup) */
        '<div id="mc-post-lookup" style="background:var(--color-page-bg);border:1px dashed var(--color-border);border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:var(--space-3);font-size:13px;color:var(--color-text-muted)">' +
          Utils.icon('search', 14) + ' אנא הזן מספר אישי ולחץ \'חיפוש\' לטעינת כליאות קודמות, מדרג והמלצת מתקן אוטומטית.' +
        '</div>' +

        /* §5 — גורם דורש */
        '<div class="form-section-header"><div class="form-section-title">' + Utils.icon('person', 14) + ' 5. פרטי גורם דורש <span style="font-size:11px;font-weight:400;color:var(--color-text-muted)">(נציג היחידה השולחת)</span></div></div>' +
        '<div class="form-row form-row-3">' +
          '<div class="form-group"><label class="form-label">מספר אישי <span class="required">*</span></label><input id="mc-req-personal" class="form-control" value="' + Utils.escHtml(req.personalNumber || '') + '" placeholder="מ"א גורם דורש"></div>' +
          '<div class="form-group"><label class="form-label">שם פרטי <span class="required">*</span></label><input id="mc-req-first" class="form-control" value="' + Utils.escHtml(req.firstName || '') + '" placeholder="שם פרטי"></div>' +
          '<div class="form-group"><label class="form-label">שם משפחה <span class="required">*</span></label><input id="mc-req-last" class="form-control" value="' + Utils.escHtml(req.lastName || '') + '" placeholder="שם משפחה"></div>' +
          '<div class="form-group"><label class="form-label">טלפון <span class="required">*</span></label><input id="mc-req-phone" class="form-control" value="' + Utils.escHtml(req.phone || '') + '" placeholder="טלפון ליצירת קשר"></div>' +
          '<div class="form-group" style="grid-column:span 2"><label class="form-label">יחידה <span class="required">*</span></label><input id="mc-req-unit" class="form-control" value="' + Utils.escHtml(req.unit || (prefill && prefill.sourceUnitName) || '') + '" placeholder="שם היחידה השולחת"></div>' +
        '</div>' +

        /* §6 — פרטי התיאום */
        '<div class="form-section-header"><div class="form-section-title">' + Utils.icon('calendar', 14) + ' 6. פרטי התיאום</div></div>' +
        '<div class="form-row form-row-3">' +
          '<div class="form-group"><label class="form-label">תאריך בקשה <span class="required">*</span></label><input type="date" id="mc-req-date" class="form-control" value="' + Utils.escHtml(prefill && prefill.requestedAt ? prefill.requestedAt.split('T')[0] : Utils.today()) + '"></div>' +
          '<div class="form-group"><label class="form-label">תאריך התייצבות <span class="required">*</span></label><input type="date" id="mc-coord-date" class="form-control" value="' + Utils.escHtml(prefill && prefill.coordinationDate || Utils.today()) + '"></div>' +
          '<div class="form-group"><label class="form-label">שעת התייצבות <span class="required">*</span></label><input type="time" id="mc-coord-time" class="form-control" value="' + Utils.escHtml(prefill && prefill.coordinationTime || '08:00') + '"></div>' +
          '<div class="form-group"><label class="form-label">יעד כליאה <span class="required">*</span></label>' +
            '<select id="mc-dest" class="form-control">' +
              '<option value="">בחר יעד</option>' +
              DESTINATIONS.map(function(d) { return '<option value="' + Utils.escHtml(d) + '" ' + ((prefill && prefill.destinationPrisonId) === d ? 'selected' : '') + '>' + Utils.escHtml(d) + '</option>'; }).join('') +
            '</select>' +
          '</div>' +
        '</div>' +

        /* §7 — פרטי הכליאה */
        '<div class="form-section-header"><div class="form-section-title">' + Utils.icon('prison', 14) + ' 7. פרטי הכליאה</div></div>' +
        '<div class="form-row form-row-2">' +
          '<div class="form-group"><label class="form-label">עבירה / סיבת כליאה <span class="required">*</span></label><input id="mc-offense" class="form-control" value="' + Utils.escHtml(prefill && prefill.offense || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">ימי כליאה <span class="required">*</span></label><input type="number" id="mc-days" class="form-control" min="1" max="3650" value="' + Utils.escHtml(String(prefill && prefill.incarcerationDays || '')) + '" placeholder="ימים"></div>' +
        '</div>' +
        '<div class="form-row form-row-2">' +
          '<div class="form-group"><label class="form-label">סיבת העברה <span class="required">*</span></label><select id="mc-transfer-reason" class="form-control"><option value="">בחר סיבה</option><option value="none" ' + ((prefill && prefill.transferReason) === 'none' ? 'selected' : '') + '>אין / לא רלוונטי</option>' +
            '<option value="security_situation" ' + ((prefill && prefill.transferReason) === 'security_situation' ? 'selected' : '') + '>מצב ביטחוני</option>' +
            '<option value="living_conditions" '  + ((prefill && prefill.transferReason) === 'living_conditions'  ? 'selected' : '') + '>תנאי מחיה</option>' +
            '<option value="other" '              + ((prefill && prefill.transferReason) === 'other'              ? 'selected' : '') + '>אחר</option>' +
          '</select></div>' +
          '<div class="form-group" id="mc-transfer-detail-group">' +
            '<label class="form-label">פירוט סיבת ההעברה <span class="required">*</span></label>' +
            '<input id="mc-transfer-detail" class="form-control" value="' + Utils.escHtml(prefill && prefill.transferReasonDetail || '') + '" placeholder="פרט...">' +
          '</div>' +
        '</div>' +

        /* §8 — גורם מתאם */
        '<div class="form-section-header"><div class="form-section-title">' + Utils.icon('person', 14) + ' 8. גורם מתאם <span style="font-size:11px;font-weight:400;color:var(--color-text-muted)">(מטפל ממשל"ט — שם בלבד)</span></div></div>' +
        '<div class="form-group" style="max-width:320px">' +
          '<label class="form-label">שם גורם מתאם <span class="required">*</span></label>' +
          '<input id="mc-coord-name" class="form-control" value="' + Utils.escHtml(prefill && prefill.coordinatorName || '') + '" placeholder="שם איש הקשר ממשל"ט">' +
        '</div>' +

        /* §9 — הערות */
        '<div class="form-section-header"><div class="form-section-title">' + Utils.icon('report', 14) + ' 9. הערות / הנחיות</div></div>' +
        '<div class="form-row form-row-2">' +
          '<div class="form-group"><label class="form-label">הערות רפואיות לתיאום</label><textarea id="mc-med" class="form-control" rows="2">' + Utils.escHtml(prefill && prefill.medicalNotes || '') + '</textarea></div>' +
          '<div class="form-group"><label class="form-label">הערות כלליות</label><textarea id="mc-notes" class="form-control" rows="2">' + Utils.escHtml(prefill && prefill.generalNotes || '') + '</textarea></div>' +
        '</div>',

      footer:
        '<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>' +
        (!isEdit ? '<button class="btn btn-ghost" onclick="window._msltSaveAndAnother()">שמור והזן נוסף</button>' : '') +
        '<button class="btn btn-primary" onclick="window._msltSave(false)">' + (isEdit ? 'שמור שינויים' : 'שמור תיאום') + '</button>',
    });

    /* Pre-fill sections 2–4 if editing with known person */
    if (p) { setTimeout(function() { updatePostLookupSections(p.id, prefill && prefill.destinationPrisonId); }, 60); }

    /* Transfer reason toggle */
    setTimeout(function() {
      var trEl = Utils.el('mc-transfer-reason'); var trdGrp = Utils.el('mc-transfer-detail-group');
      

      /* Dest change — update facility override indicator in post-lookup panel */
      var destEl = Utils.el('mc-dest');
      if (destEl) destEl.onchange = function() {
        if (window._currentFacilityRec) {
          var fp = Utils.el('mc-facility-panel');
          if (fp) fp.innerHTML = renderFacilityPanel(window._currentFacilityRec, destEl.value);
        }
      };
    }, 60);

    /* Person lookup */
    window._msltLookup = function() {
      var q = ((Utils.el('mc-mil-num') || {}).value || '').trim();
      if (!q) { Toast.error('הזן מספר אישי לחיפוש'); return; }
      var found = people.find(function(pp) { return pp.militaryNumber === q || pp.nationalId === q; });
      if (!found) {
        /* Manual entry — still update external sections with null person */
        updatePostLookupSections(null, null);
        Toast.warning('לא נמצא חייל עם מספר זה — ניתן להזין ידנית');
        return;
      }
      var existingActive = getAll().find(function(c) {
        return c.personId === found.id && MASHLAT_ACTIVE.includes(c.status) &&
          (!isEdit || c.id !== (prefill && prefill.id));
      });
      if (existingActive) {
        Modal.confirm({
          title: 'קיים תיאום פעיל לחייל זה',
          message: found.firstName + ' ' + found.lastName + ' — תיאום ' + existingActive.coordinationNumber + ' (' + Utils.formatDate(existingActive.coordinationDate) + ') — ' + ((MASHLAT_STATUSES[existingActive.status] || {}).label || existingActive.status) + '\n\nהאם להמשיך וליצור תיאום נוסף?',
          confirmLabel: 'צור בכל זאת', type: 'warning',
        }).then(function(ok) { if (!ok) { Modal.close(); return; } fillPersonFields(found); });
        return;
      }
      fillPersonFields(found);
    };

    function fillPersonFields(person) {
      Utils.el('mc-person-id').value  = person.id;
      var firstEl = Utils.el('mc-first'); if (firstEl) { firstEl.value = person.firstName; firstEl.removeAttribute('readonly'); firstEl.setAttribute('readonly', ''); }
      var lastEl  = Utils.el('mc-last');  if (lastEl)  { lastEl.value  = person.lastName;  lastEl.removeAttribute('readonly');  lastEl.setAttribute('readonly', ''); }
      Utils.el('mc-rank-val').value    = person.rank || '';
      Utils.el('mc-service-val').value = person.serviceType || '';
      Toast.show('נטען: ' + person.firstName + ' ' + person.lastName, 'success');
      var destEl = Utils.el('mc-dest');
      updatePostLookupSections(person.id, destEl ? destEl.value : null);
    }

    /* Update sections 2, 3, 4 after person lookup */
    function updatePostLookupSections(personId, currentDest) {
      var panel = Utils.el('mc-post-lookup');
      if (!panel) return;

      var indicators = ExternalPersonDataService.getPersonIndicators(personId);
      var rankResult = MashlatRankingService.calculate(indicators);
      var facRec     = computeFacilityRecommendation(indicators);

      /* Store for collectData() */
      window._currentFacilityRec  = facRec;
      window._currentIndicators   = indicators;

      panel.innerHTML =
        /* §2 — כליאות קודמות */
        '<div class="form-section-header" style="margin-top:0"><div class="form-section-title">' +
          Utils.icon('history', 14) + ' 2. כליאות קודמות' +
          '<span style="font-size:10px;color:var(--color-text-muted);margin-right:6px">קריאה בלבד</span>' +
        '</div></div>' +
        '<div style="margin-bottom:var(--space-3)">' + renderBlueRedHistory(indicators) + '</div>' +

        /* §3 — מדרג וחיוויים */
        '<div class="form-section-header"><div class="form-section-title">' +
          Utils.icon('alert', 14) + ' 3. מדרג וחיוויים ' +
          '<span style="font-size:10px;color:var(--color-text-muted)">אוטומטי — קריאה בלבד</span>' +
        '</div></div>' +
        '<div style="margin-bottom:var(--space-3)">' + renderRankingPanel(indicators, rankResult, { compact: true }) + '</div>' +

        /* §4 — חסימות והתאמת מתקן */
        '<div class="form-section-header"><div class="form-section-title">' +
          Utils.icon('prison', 14) + ' 4. חסימות והתאמת מתקן כליאה' +
        '</div></div>' +
        '<div id="mc-facility-panel" style="margin-bottom:0">' + renderFacilityPanel(facRec, currentDest) + '</div>';

      panel.style.background = '';
      panel.style.border = 'none';
      panel.style.padding = '0';
    }

    /* Collect form data and validate — every field is required except the two notes fields */
    function collectData() {
      var personId  = (Utils.el('mc-person-id') || {}).value || null;
      var coordDate = (Utils.el('mc-coord-date') || {}).value || '';
      var dest      = (Utils.el('mc-dest') || {}).value || '';
      var offense   = ((Utils.el('mc-offense') || {}).value || '').trim();
      var coordName = ((Utils.el('mc-coord-name') || {}).value || '').trim();

      var REQUIRED_IDS = [
        ['mc-mil-num', 'מספר אישי'],
        ['mc-first', 'שם פרטי'],
        ['mc-last', 'שם משפחה'],
        ['mc-req-personal', 'מספר אישי גורם דורש'],
        ['mc-req-first', 'שם פרטי גורם דורש'],
        ['mc-req-last', 'שם משפחה גורם דורש'],
        ['mc-req-phone', 'טלפון גורם דורש'],
        ['mc-req-unit', 'יחידת גורם דורש'],
        ['mc-req-date', 'תאריך בקשה'],
        ['mc-coord-date', 'תאריך התייצבות'],
        ['mc-coord-time', 'שעת התייצבות'],
        ['mc-dest', 'יעד כליאה'],
        ['mc-offense', 'עבירה / סיבת כליאה'],
        ['mc-days', 'ימי כליאה'],
        ['mc-transfer-reason', 'סיבת העברה'],
        ['mc-transfer-detail', 'פירוט סיבת ההעברה'],
        ['mc-coord-name', 'שם גורם מתאם'],
      ];

      var missing = [];
      var firstInvalidEl = null;
      REQUIRED_IDS.forEach(function(pair) {
        var el = Utils.el(pair[0]);
        if (!el) return;
        el.classList.remove('is-invalid');
        var val = (el.value || '').trim();
        if (!val) {
          missing.push(pair[1]);
          el.classList.add('is-invalid');
          if (!firstInvalidEl) firstInvalidEl = el;
        }
      });

      if (missing.length) {
        Toast.error('יש למלא את כל שדות החובה: ' + missing.join(', '));
        if (firstInvalidEl) { firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); firstInvalidEl.focus(); }
        return null;
      }

      var today  = Utils.today();
      var status = isEdit ? prefill.status : (coordDate === today ? 'today' : 'coordinated');

      /* Ranking snapshot */
      var indicators   = ExternalPersonDataService.getPersonIndicators(personId || null);
      var rankResult   = MashlatRankingService.calculate(indicators);
      var rankSnapshot = MashlatRankingService.buildSnapshot(rankResult, indicators.source);

      /* Facility decision */
      var facRec         = window._currentFacilityRec || computeFacilityRecommendation(indicators);
      var selectedType   = DESTINATION_TYPES[dest] || null;
      var overrideReason = ((Utils.el('mc-override-reason') || {}).value || '').trim();
      /* wasOverridden is only meaningful when a confirmed recommendation exists */
      var wasOverridden  = !!(facRec.recommended && selectedType && selectedType !== facRec.recommended && overrideReason);

      /* blueRed snapshot */
      var blueRedSnap = {
        records:   indicators.previousIncarcerations.records,
        count:     indicators.previousIncarcerations.count,
        totalDays: indicators.previousIncarcerations.totalDays,
        source:    indicators.source,
        savedAt:   new Date().toISOString(),
      };

      var transferReason = (Utils.el('mc-transfer-reason') || {}).value || null;

      return {
        id:                  isEdit ? prefill.id : 'mslt_' + Utils.generateId(),
        coordinationNumber:  isEdit ? prefill.coordinationNumber : nextCoordNumber(),
        personId:            personId || null,
        manualFirstName:     (Utils.el('mc-first') || {}).value || '',
        manualLastName:      (Utils.el('mc-last')  || {}).value || '',
        manualMilNum:        (Utils.el('mc-mil-num') || {}).value || '',
        rank:                (Utils.el('mc-rank-val') || {}).value || '',
        serviceType:         (Utils.el('mc-service-val') || {}).value || '',
        requester: {
          personalNumber: (Utils.el('mc-req-personal') || {}).value || '',
          firstName:      (Utils.el('mc-req-first')    || {}).value || '',
          lastName:       (Utils.el('mc-req-last')     || {}).value || '',
          phone:          (Utils.el('mc-req-phone')    || {}).value || '',
          unit:           (Utils.el('mc-req-unit')     || {}).value || '',
        },
        coordinatorName:     coordName,
        requestedAt:         (Utils.el('mc-req-date') || {}).value || '',
        coordinationDate:    coordDate,
        coordinationTime:    (Utils.el('mc-coord-time') || {}).value || '',
        destinationPrisonId: dest,
        offense:             offense,
        incarcerationDays:   parseInt((Utils.el('mc-days') || {}).value, 10) || null,
        medicalNotes:        (Utils.el('mc-med')   || {}).value || '',
        generalNotes:        (Utils.el('mc-notes') || {}).value || '',
        transferReason:      transferReason || null,
        transferReasonDetail: ((Utils.el('mc-transfer-detail') || {}).value || '').trim() || null,
        rankingSnapshot:     rankSnapshot,
        facilityDecision: {
          recommendedFacility:      facRec.recommended,
          recommendedFacilityLabel: facRec.recommendedLabel,
          blockedFacilities:        facRec.blocked,
          selectedFacility:         dest,
          wasOverridden:            wasOverridden,
          overrideReason:           wasOverridden ? overrideReason : null,
          overrideTimestamp:        wasOverridden ? new Date().toISOString() : null,
        },
        blueRedSnapshot:     blueRedSnap,
        status:              status,
        arrivalConfirmed:    isEdit ? prefill.arrivalConfirmed    : false,
        arrivalConfirmedAt:  isEdit ? prefill.arrivalConfirmedAt  : null,
        prisonerFileId:      isEdit ? prefill.prisonerFileId      : null,
        completedAt:         isEdit ? prefill.completedAt         : null,
        archivedAt:          isEdit ? prefill.archivedAt          : null,
        archiveReason:       isEdit ? prefill.archiveReason       : null,
        createdAt:           isEdit ? prefill.createdAt           : new Date().toISOString(),
        updatedAt:           new Date().toISOString(),
        /* Legacy compat */
        sourceUnitName:      (Utils.el('mc-req-unit') || {}).value || '',
      };
    }

    window._msltSave = function(andAnother) {
      var data = collectData();
      if (!data) return;

      if (isEdit) {
        var old = prefill, changes = [];
        if (data.coordinationDate    !== old.coordinationDate)    changes.push('תאריך');
        if (data.coordinationTime    !== old.coordinationTime)    changes.push('שעה');
        if (data.destinationPrisonId !== old.destinationPrisonId) changes.push('יעד');
        Storage.upsert(Storage.KEYS.MASHLAT_COORDINATIONS, data);
        Audit.log({ module: 'mashlat', action: 'update', entityType: 'coordination', entityId: data.id,
          description: 'עדכון תיאום ' + data.coordinationNumber + (changes.length ? ': ' + changes.join(', ') : '') });
        Toast.success('התיאום עודכן');
      } else {
        Storage.upsert(Storage.KEYS.MASHLAT_COORDINATIONS, data);
        Audit.log({ module: 'mashlat', action: 'create', entityType: 'coordination', entityId: data.id,
          description: 'תיאום חדש ' + data.coordinationNumber + ' — ' + data.manualFirstName + ' ' + data.manualLastName + ' — ' + Utils.formatDate(data.coordinationDate) });
        Toast.success('תיאום ' + data.coordinationNumber + ' נשמר');
      }

      Modal.close();
      if (andAnother) { openCoordinationModal(null); } else { selectedId = data.id; render(); }
    };

    window._msltSaveAndAnother = function() { window._msltSave(true); };
  }

  /* ── Confirm arrival ─────────────────────────────────────────────── */
  function confirmArrival(id) {
    var c = Storage.getById(Storage.KEYS.MASHLAT_COORDINATIONS, id);
    if (!c) return;
    var p = pMap[c.personId];
    var name = p ? p.firstName + ' ' + p.lastName : (c.manualFirstName + ' ' + c.manualLastName);
    Modal.confirm({ title: 'אישור הגעה', message: 'לאשר הגעת ' + name + '?', confirmLabel: 'אשר הגעה', type: 'success' }).then(function(ok) {
      if (!ok) return;
      var updated = Object.assign({}, c, { arrivalConfirmed: true, arrivalConfirmedAt: new Date().toISOString(), status: 'arrived', updatedAt: new Date().toISOString() });
      Storage.upsert(Storage.KEYS.MASHLAT_COORDINATIONS, updated);
      Audit.log({ module: 'mashlat', action: 'update_status', entityType: 'coordination', entityId: id,
        description: 'הגעת חייל אושרה — ' + c.coordinationNumber, previousValue: c.status, newValue: 'arrived' });
      Toast.success('הגעת החייל אושרה');
      render();
    });
  }

  /* ── Prisoner intake ─────────────────────────────────────────────── */
  function openIntakeModal(coordinationId) {
    var c = Storage.getById(Storage.KEYS.MASHLAT_COORDINATIONS, coordinationId);
    if (!c) return;
    var p               = pMap[c.personId];
    var expectedRelease = c.incarcerationDays ? Utils.addDays(Utils.today(), c.incarcerationDays) : '';

    Modal.open({
      title: 'פתיחת תיק כלוא — מ' + c.coordinationNumber,
      size:  'lg',
      body:
        '<div style="padding:8px 12px;background:var(--color-primary-subtle);border-radius:var(--radius-md);margin-bottom:var(--space-4);font-size:13px">' +
          Utils.icon('prison', 14) + ' מקור: משל"ט — תיאום ' + c.coordinationNumber + ' • ' + Utils.formatDate(c.coordinationDate) +
        '</div>' +
        '<div class="form-row form-row-2">' +
          '<div class="form-group"><label class="form-label">אדם</label>' +
            '<input class="form-control" value="' + Utils.escHtml(p ? p.firstName + ' ' + p.lastName + ' — ' + p.militaryNumber : (c.manualFirstName + ' ' + c.manualLastName)) + '" readonly>' +
            '<input type="hidden" id="intake-person-id" value="' + Utils.escHtml(c.personId || '') + '">' +
          '</div>' +
          '<div class="form-group"><label class="form-label">סוג כלוא</label><select id="intake-type" class="form-control">' +
            (PRISONER_TYPES || []).map(function(t) { return '<option value="' + Utils.escHtml(t) + '">' + Utils.escHtml(t) + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="form-group"><label class="form-label">תאריך קבלה</label><input type="date" id="intake-admission" class="form-control" value="' + Utils.today() + '"></div>' +
          '<div class="form-group"><label class="form-label">שחרור צפוי</label><input type="date" id="intake-release" class="form-control" value="' + expectedRelease + '"></div>' +
          '<div class="form-group"><label class="form-label">כלא / פלוגה</label><select id="intake-company" class="form-control">' +
            (DETENTION_COMPANIES || []).map(function(dc) { return '<option value="' + Utils.escHtml(dc) + '">' + Utils.escHtml(dc) + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="form-group"><label class="form-label">רמת סיכון</label><select id="intake-risk" class="form-control">' +
            (RISK_LEVELS || []).map(function(r) { return '<option value="' + r.id + '">' + Utils.escHtml(r.label) + '</option>'; }).join('') +
          '</select></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">עילת מעצר</label><input id="intake-reason" class="form-control" value="' + Utils.escHtml(c.offense || '') + '"></div>' +
        '<div class="form-group"><label class="form-label">הערות</label><textarea id="intake-notes" class="form-control" rows="2">' + Utils.escHtml(c.generalNotes || '') + '</textarea></div>',
      footer:
        '<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>' +
        '<button class="btn btn-primary" onclick="window._msltCreateFile(\'' + coordinationId + '\')">פתח תיק כלוא</button>',
    });

    window._msltCreateFile = function(coordId) {
      var coord = Storage.getById(Storage.KEYS.MASHLAT_COORDINATIONS, coordId);
      if (!coord) return;
      var pidCheck = (Utils.el('intake-person-id') || {}).value || null;
      var existingFile = pidCheck ? Storage.getCollection(Storage.KEYS.PRISONER_FILES).filter(function(f) { return f.personId === pidCheck && f.status === 'active'; })[0] : null;
      if (existingFile) {
        var linked = Object.assign({}, coord, { status: 'completed', prisonerFileId: existingFile.id, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        Storage.upsert(Storage.KEYS.MASHLAT_COORDINATIONS, linked);
        Audit.log({ module: 'mashlat', action: 'update_status', entityType: 'coordination', entityId: coordId,
          description: 'תיאום ' + coord.coordinationNumber + ' קושר לתיק כלוא פעיל קיים ' + (existingFile.fileNumber || existingFile.id) });
        Modal.close();
        Toast.info('לחייל כבר קיים תיק כלוא פעיל (' + (existingFile.fileNumber || existingFile.id) + ') — התיאום קושר אליו ולא נפתח תיק נוסף');
        Router.navigate('/prisoner-file', { id: existingFile.id });
        return;
      }
      var file = {
        id:               'pf_' + Utils.generateId(),
        fileNumber:       'PF-' + String(Math.floor(Math.random() * 90000) + 10000),
        personId:         (Utils.el('intake-person-id') || {}).value || null,
        prisonerType:     (Utils.el('intake-type')      || {}).value || '',
        admissionDate:    (Utils.el('intake-admission') || {}).value || '',
        expectedRelease:  (Utils.el('intake-release')   || {}).value || null,
        detentionCompany: (Utils.el('intake-company')   || {}).value || '',
        riskLevel:        (Utils.el('intake-risk')      || {}).value || '',
        detentionReason:  (Utils.el('intake-reason')    || {}).value || '',
        notes:            (Utils.el('intake-notes')     || {}).value || '',
        status:           'active',
        coordinationId:   coordId,
        createdAt:        new Date().toISOString(),
        updatedAt:        new Date().toISOString(),
      };
      Storage.upsert(Storage.KEYS.PRISONER_FILES, file);
      if (window.GachlatScreeningService) GachlatScreeningService.refresh();
      Audit.log({ module: 'incarceration', action: 'create', entityType: 'prisonerFile', entityId: file.id,
        description: 'פתיחת תיק כלוא ' + file.fileNumber + ' ממשל"ט ' + coord.coordinationNumber });
      var updatedCoord = Object.assign({}, coord, { status: 'completed', prisonerFileId: file.id, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      Storage.upsert(Storage.KEYS.MASHLAT_COORDINATIONS, updatedCoord);
      Audit.log({ module: 'mashlat', action: 'update_status', entityType: 'coordination', entityId: coordId,
        description: 'תיאום ' + coord.coordinationNumber + ' הושלם — תיק כלוא ' + file.fileNumber + ' נפתח', previousValue: 'arrived', newValue: 'completed' });
      Modal.close();
      Toast.success('תיק כלוא ' + file.fileNumber + ' נפתח — תיאום הושלם');
      Router.navigate('/prisoner-file', { id: file.id });
    };
  }

  /* ── Reschedule ──────────────────────────────────────────────────── */
  function reschedule(id) {
    var old = Storage.getById(Storage.KEYS.MASHLAT_COORDINATIONS, id);
    if (!old) return;
    openCoordinationModal(Object.assign({}, old, {
      id: null, coordinationNumber: null, status: null,
      arrivalConfirmed: false, arrivalConfirmedAt: null,
      prisonerFileId: null, completedAt: null,
      archivedAt: null, archiveReason: null, createdAt: null,
      rankingSnapshot: null, facilityDecision: null,
      coordinationDate: Utils.addDays(Utils.today(), 7),
    }));
  }

  /* ── CSV export ──────────────────────────────────────────────────── */
  function exportCsv() {
    var rows = getFiltered().map(function(r) {
      var p          = pMap[r.personId];
      var rankResult = getRanking(r);
      var matched    = (rankResult.matchedRules || []).map(function(rr) { return rr.label; }).join('; ');
      var req        = r.requester || {};
      var reqName    = ((req.firstName || '') + ' ' + (req.lastName || '')).trim();
      return [
        r.coordinationNumber, r.coordinationDate, r.coordinationTime,
        p ? p.militaryNumber : (r.manualMilNum || ''),
        p ? (p.firstName + ' ' + p.lastName) : ((r.manualFirstName || '') + ' ' + (r.manualLastName || '')),
        unitOf(r),
        r.offense, r.incarcerationDays, r.destinationPrisonId,
        rankResult.level > 0 ? MashlatRankingService.levelLabel(rankResult.level) : '—', matched,
        (MASHLAT_STATUSES[r.status] || {}).label || r.status,
        r.coordinatorName || '',
        reqName, req.phone || '', req.unit || '',
        r.facilityDecision ? (r.facilityDecision.wasOverridden ? 'כן — ' + (r.facilityDecision.overrideReason || '') : 'לא') : '',
      ];
    });
    Utils.exportCsv('mashlat.csv', [
      'מס׳ תיאום', 'תאריך', 'שעה', 'מ"א', 'שם',
      'יחידה', 'עבירה', 'ימים', 'יעד',
      'מדרג', 'קריטריונים', 'סטטוס',
      'גורם מתאם', 'גורם דורש', 'טלפון דורש', 'יחידה דורש',
      'עקיפת המלצה',
    ], rows);
  }

  render();
};

Pages['mashlat'].processNoShows = processNoShows;
