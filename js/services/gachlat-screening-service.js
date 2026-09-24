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

  /* ── PUBLIC: syncFromPrisoners ───────────────────────────────────────────── */
  function syncFromPrisoners() {
    var prisoners = Storage.getCollection(Storage.KEYS.PRISONER_FILES);
    var candidates = Storage.getCollection(Storage.KEYS.GACHLAT_CANDIDATES);
    var byPersonId = {};
    candidates.forEach(function(c) { byPersonId[c.personId] = true; });

    var added = 0;
    prisoners.forEach(function(pf) {
      if (byPersonId[pf.personId]) return;
      var people = Storage.getCollection(Storage.KEYS.PEOPLE);
      var person = people.find(function(p) { return p.id === pf.personId; });
      var screenData = {
        prisonerType: pf.prisonerType || '',
        serviceType: (person && person.serviceType) || 'חובה',
        offense: pf.detentionReason || '',
        sentenceDays: pf.sentenceDays || 0,
        age: (person && person.age) || 0,
      };
      var screenResult = evaluate(screenData);
      var defaultStatus = screenResult.candidateType === 'not_candidate' ? 'irrelevant' : (screenResult.candidateType === 'mandatory' ? 'pending' : 'new');
      var candidate = {
        id: 'gc_' + Utils.generateId(),
        personId: pf.personId,
        prisonerFileId: pf.id,
        candidateType: screenResult.candidateType,
        candidateReasons: screenResult.reasons,
        assessmentStatus: defaultStatus,
        screenedAt: new Date().toISOString(),
        history: [{ action: 'created', label: 'מועמד נוצר', at: new Date().toISOString() }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      Storage.upsert(Storage.KEYS.GACHLAT_CANDIDATES, candidate);
      added++;
    });
    return added;
  }

  return {
    evaluate,
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
