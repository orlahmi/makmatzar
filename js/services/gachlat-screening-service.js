/* gachlat-screening-service.js — centralized Gachlat eligibility screening */
'use strict';

window.GachlatScreeningService = (function() {

  /* ── SCREENING RULES ────────────────────────────────────────────────────────
   * NOTE: All rules are PLACEHOLDER / DRAFT and require confirmation from
   * Gachlat professional staff before production use.
   * Centralized here so corrections need only be made in ONE place.
   * ─────────────────────────────────────────────────────────────────────────── */
  var SCREENING_RULES = [
    // MANDATORY rules — any match → candidateType = "mandatory"
    {
      id: 'mandatory_havoush',
      label: 'חבוש (שירות חובה)',
      candidateType: 'mandatory',
      /* PLACEHOLDER: חבושים שירות חובה — נדרש אישור */
      test: function(d) { return d.prisonerType === 'חבוש' && d.serviceType === 'חובה'; },
    },
    {
      id: 'mandatory_desertion',
      label: 'עבירת עריקות',
      candidateType: 'mandatory',
      /* PLACEHOLDER: עריקות — נדרש אישור */
      test: function(d) {
        var o = (d.offense || '').toLowerCase();
        return o.indexOf('עריק') !== -1 || o.indexOf('עריקות') !== -1;
      },
    },
    // OPTIONAL rules — any match (and no mandatory match) → candidateType = "optional"
    {
      id: 'optional_career_prisoner',
      label: 'אסיר שירות קבע',
      candidateType: 'optional',
      /* PLACEHOLDER: שירות קבע — נדרש אישור */
      test: function(d) { return d.serviceType === 'קבע'; },
    },
    {
      id: 'optional_long_sentence',
      label: 'עונש 20 ימים ומעלה',
      candidateType: 'optional',
      /* PLACEHOLDER: סף 20 יום — נדרש אישור */
      test: function(d) { return (d.sentenceDays || 0) >= 20; },
    },
    {
      id: 'optional_young',
      label: 'גיל 25 ומטה',
      candidateType: 'optional',
      /* PLACEHOLDER: גיל — נדרש אישור */
      test: function(d) { return d.age > 0 && d.age <= 25; },
    },
  ];

  /* Prisoner types that are NOT in Gachlat scope */
  var NOT_CANDIDATE_TYPES = ['שב"ס'];

  /* ── PUBLIC: evaluate ───────────────────────────────────────────────────────
   * data = { prisonerType, serviceType, offense, sentenceDays, age }
   * returns { candidateType: 'mandatory'|'optional'|'not_candidate', reasons: [] }
   * ─────────────────────────────────────────────────────────────────────────── */
  function evaluate(data) {
    if (!data) return { candidateType: 'not_candidate', reasons: ['אין מידע'] };

    // Hard excludes
    if (NOT_CANDIDATE_TYPES.indexOf(data.prisonerType) !== -1) {
      return { candidateType: 'not_candidate', reasons: ['סוג כלוא ' + data.prisonerType + ' — אינו בתחום גחל"ת'] };
    }

    var mandatory = [];
    var optional = [];

    SCREENING_RULES.forEach(function(rule) {
      try {
        if (rule.test(data)) {
          if (rule.candidateType === 'mandatory') mandatory.push(rule.label);
          else if (rule.candidateType === 'optional') optional.push(rule.label);
        }
      } catch(e) {}
    });

    if (mandatory.length) return { candidateType: 'mandatory', reasons: mandatory };
    if (optional.length) return { candidateType: 'optional', reasons: optional };
    return { candidateType: 'not_candidate', reasons: ['לא עומד בקריטריונים לגחל"ת (טיוטה — נדרש אישור)'] };
  }

  /* ── HARD vs FLEXIBLE criteria (separate concepts) ─────────────────────────
   * hard      = a match makes the soldier a mandatory (חובה) candidate
   * flexible  = a match makes him an optional (רשות) candidate
   * Both lists are derived from the SAME draft rules above — they are NOT
   * confirmed professional criteria (draft: true) until Gachlat staff sign off.
   * ─────────────────────────────────────────────────────────────────────────── */
  var HARD_CRITERIA = SCREENING_RULES.filter(function(r) { return r.candidateType === 'mandatory'; })
    .map(function(r) { return { id: r.id, label: r.label, test: r.test, draft: true }; });
  var FLEXIBLE_CRITERIA = SCREENING_RULES.filter(function(r) { return r.candidateType === 'optional'; })
    .map(function(r) { return { id: r.id, label: r.label, test: r.test, draft: true }; });

  function screenDataFor(c) {
    var pf = c && c.prisonerFileId ? Storage.getById(Storage.KEYS.PRISONER_FILES, c.prisonerFileId) : null;
    return {
      prisonerType: (pf && pf.prisonerType) || c.prisonerType || '',
      serviceType: c.serviceType || '',
      offense: c.offense || (pf && (pf.detentionReason || pf.offense)) || '',
      sentenceDays: (pf && (pf.sentence || pf.sentenceDays)) || c.sentenceDays || 0,
      age: c.age || 0,
    };
  }

  function criteriaStatus(c) {
    var d = screenDataFor(c);
    var run = function(list) { return list.map(function(k) { var met = false; try { met = !!k.test(d); } catch (e) {} return { id: k.id, label: k.label, met: met, draft: k.draft }; }); };
    return { hard: run(HARD_CRITERIA), flexible: run(FLEXIBLE_CRITERIA), data: d };
  }

  /* ── PUBLIC: labels/colors ───────────────────────────────────────────────── */
  var CANDIDATE_TYPE_LABELS = { mandatory: 'חובה', optional: 'רשות', not_candidate: 'לא מועמד' };
  var CANDIDATE_TYPE_CLASSES = { mandatory: 'badge-critical', optional: 'badge-info', not_candidate: 'badge-inactive' };

  var ASSESSMENT_STATUS_LABELS = {
    new: 'חדש', pending: 'ממתין לבדיקה', offered: 'הוצע אבחון',
    interested: 'מעוניין', refused: 'סירב', scheduled: 'נקבע אבחון',
    completed: 'אבחון בוצע', done: 'הושלם', irrelevant: 'לא רלוונטי',
  };
  var ASSESSMENT_STATUS_CLASSES = {
    new: 'badge-pending', pending: 'badge-pending', offered: 'badge-info',
    interested: 'badge-approved', refused: 'badge-critical', scheduled: 'badge-teal',
    completed: 'badge-active', done: 'badge-active', irrelevant: 'badge-inactive',
  };

  function candidateBadge(type) {
    var lbl = CANDIDATE_TYPE_LABELS[type] || type;
    var cls = CANDIDATE_TYPE_CLASSES[type] || 'badge-inactive';
    return '<span class="badge ' + cls + '">' + lbl + '</span>';
  }
  function statusBadge(status) {
    var lbl = ASSESSMENT_STATUS_LABELS[status] || status;
    var cls = ASSESSMENT_STATUS_CLASSES[status] || 'badge-pending';
    return '<span class="badge ' + cls + '">' + lbl + '</span>';
  }

  /* ── IDENTITY: one source of truth ─────────────────────────────────────────
   * A candidate is identified by prisonerFileId (primary) / personId.
   * name, personalNumber, rank, unit, age, serviceType are CACHED snapshots that
   * repairAll() re-derives from the canonical person / prisoner file. */
  var SERVICE_LABEL = { conscript: 'חובה', regular: 'קבע', reserve: 'מילואים', civilian: 'אזרח', student: 'סטודנט' };

  function resolveLinks(c) {
    var pf = c.prisonerFileId ? Storage.getById(Storage.KEYS.PRISONER_FILES, c.prisonerFileId) : null;
    var person = null;
    if (pf) person = Storage.getById(Storage.KEYS.PEOPLE, pf.personId);
    if (!person && c.personId) person = Storage.getById(Storage.KEYS.PEOPLE, c.personId);
    if (person && !pf) {
      var files = Storage.getCollection(Storage.KEYS.PRISONER_FILES).filter(function(f) { return f.personId === person.id; });
      pf = files.filter(function(f) { return f.status === 'active'; })[0] || files[files.length - 1] || null;
    }
    return { person: person, pf: pf };
  }

  function daysSince(d) {
    if (!d) return 0;
    var ms = new Date().getTime() - new Date(String(d).slice(0, 10) + 'T00:00:00').getTime();
    return Math.max(0, Math.floor(ms / 86400000));
  }

  function applyIdentity(c, person, pf) {
    var unit = person && (DEMO_UNITS.filter(function(u) { return u.id === person.unitId; })[0] || {}).name;
    var out = {
      personId: person.id,
      prisonerFileId: pf ? pf.id : null,
      personalNumber: person.militaryNumber,
      name: person.firstName + ' ' + person.lastName,
      rank: (RANK_MAP[person.rank] || {}).label || '',
      unit: unit || '',
      serviceType: SERVICE_LABEL[person.serviceType] || c.serviceType || '',
      age: person.birthDate ? new Date().getFullYear() - new Date(person.birthDate).getFullYear() : (c.age || 0),
      orphaned: !pf,
      orphanReason: pf ? '' : 'אין תיק כלוא מקושר',
    };
    if (pf) {
      out.prisonerType = pf.prisonerType || '';
      out.prisonerStatus = pf.status === 'active' ? 'כלוא' : (pf.status === 'released' ? 'שוחרר' : 'הועבר');
      out.offense = pf.detentionReason || pf.offense || c.offense || '';
      out.entryDate = pf.admissionDate || pf.intakeDate || c.entryDate || '';
      out.daysInCustody = pf.status === 'active' ? daysSince(pf.admissionDate || pf.intakeDate) : (c.daysInCustody || 0);
    }
    return out;
  }

  /* Re-derive identity of every candidate from person/prisoner. Idempotent.
   * Unresolvable candidates are FLAGGED (orphaned) — never remapped to another person. */
  function repairAll() {
    var list = Storage.getCollection(Storage.KEYS.GACHLAT_CANDIDATES);
    var fixed = 0;
    list.forEach(function(c) {
      var l = resolveLinks(c);
      var next;
      if (!l.person) {
        next = { orphaned: true, orphanReason: 'אין אדם מקושר במערכת' };
      } else {
        next = applyIdentity(c, l.person, l.pf);
        // classification is generated by the screening service while the soldier is not yet in the process
        if (['new', 'pending', 'offered', 'irrelevant'].indexOf(c.assessmentStatus) !== -1 || !c.candidateType) {
          var probe = Object.assign({}, c, next);
          var ev = evaluate(screenDataFor(probe));
          next.candidateType = ev.candidateType;
          next.candidateReasons = ev.reasons;
          if (ev.candidateType === 'not_candidate') next.assessmentStatus = 'irrelevant';
          else if (c.assessmentStatus === 'irrelevant') next.assessmentStatus = ev.candidateType === 'mandatory' ? 'pending' : 'new';
        }
      }
      var changed = Object.keys(next).some(function(k) { return JSON.stringify(c[k]) !== JSON.stringify(next[k]); });
      if (changed) { Object.assign(c, next); Storage.upsert(Storage.KEYS.GACHLAT_CANDIDATES, c); fixed++; }
    });
    // one candidate per prisoner file: keep the record with the most process history, soft-delete the rest
    var byPf = {};
    Storage.getCollection(Storage.KEYS.GACHLAT_CANDIDATES).forEach(function(c) { if (c.prisonerFileId) (byPf[c.prisonerFileId] = byPf[c.prisonerFileId] || []).push(c); });
    Object.keys(byPf).forEach(function(k) {
      var g = byPf[k]; if (g.length < 2) return;
      g.sort(function(a, b) { return (b.history || []).length - (a.history || []).length || String(a.createdAt).localeCompare(String(b.createdAt)); });
      g.slice(1).forEach(function(d) { Storage.softDelete(Storage.KEYS.GACHLAT_CANDIDATES, d.id); fixed++; });
    });
    return fixed;
  }

  /* ── PUBLIC: syncFromPrisoners — exactly one candidate per active prisoner file (idempotent) ── */
  function syncFromPrisoners() {
    var prisoners = Storage.getCollection(Storage.KEYS.PRISONER_FILES).filter(function(pf) { return pf.status === 'active'; });
    var added = 0;
    prisoners.forEach(function(pf) {
      var cands = Storage.getCollection(Storage.KEYS.GACHLAT_CANDIDATES);
      var exists = cands.some(function(c) { return c.prisonerFileId === pf.id; }) ||
        cands.some(function(c) { return !c.prisonerFileId && c.personId === pf.personId; });
      if (exists) return;
      var person = Storage.getById(Storage.KEYS.PEOPLE, pf.personId);
      if (!person) return;
      var base = { id: 'gc_' + Utils.generateId(), followupLog: [] };
      var ident = applyIdentity(base, person, pf);
      var ev = evaluate(screenDataFor(Object.assign({}, base, ident)));
      var now = new Date().toISOString();
      Storage.upsert(Storage.KEYS.GACHLAT_CANDIDATES, Object.assign(base, ident, {
        candidateType: ev.candidateType, candidateReasons: ev.reasons,
        assessmentStatus: ev.candidateType === 'not_candidate' ? 'irrelevant' : (ev.candidateType === 'mandatory' ? 'pending' : 'new'),
        assessorName: '', scheduledDate: '', refusalReason: '', assessmentNotes: '', recommendation: '',
        background: { investigatedBefore: false, notes: '' },
        history: [{ action: 'created', label: 'מועמד נוצר מתיק כלוא', at: now }],
        screenedAt: now, createdAt: now, updatedAt: now,
      }));
      added++;
    });
    return added;
  }

  /* run at module load and on every Gachlat open */
  function refresh() { var f = repairAll(); var a = syncFromPrisoners(); if (a) repairAll(); return { repaired: f, added: a }; }

  return {
    evaluate, repairAll, refresh,
    HARD_CRITERIA, FLEXIBLE_CRITERIA, criteriaStatus,
    syncFromPrisoners,
    candidateBadge,
    statusBadge,
    CANDIDATE_TYPE_LABELS,
    CANDIDATE_TYPE_CLASSES,
    ASSESSMENT_STATUS_LABELS,
    ASSESSMENT_STATUS_CLASSES,
    SCREENING_RULES,
  };
})();
