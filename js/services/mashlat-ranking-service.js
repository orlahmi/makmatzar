/* mashlat-ranking-service.js
   Centralized Mashlat ranking engine.
   Ranking (מדרג) is calculated AUTOMATICALLY from external person indicators.
   Operators do NOT select or modify the ranking level.
   "המדרג מחושב אוטומטית לפי קריטריונים, על בסיס מידע שנשלף ממערכת חיצונית."

   Priority: מדרג 3 > מדרג 2 > מדרג 1 > 0 (no ranking)
   All matched criteria (across all levels) are shown to the operator. */
'use strict';

window.MashlatRankingService = (function() {

  /* MASHLAT_RANKING_RULES — single source of truth for all ranking criteria.
     To add/adjust a criterion: modify only this array.
     Fields: code, label, level (1/2/3), test(indicators), sourceField */
  var MASHLAT_RANKING_RULES = [

    /* ══ מדרג 3 — Critical ══════════════════════════════════════════════ */
    {
      code: 'VIOLENCE_HISTORY',
      label: 'היסטוריית אלימות פיזית',
      level: 3,
      test: function(ind) { return !!(ind.flags && ind.flags.violenceHistory); },
      sourceField: 'flags.violenceHistory',
    },
    {
      code: 'DRUG_OFFENSE',
      label: 'עבירת סמים קודמת',
      level: 3,
      test: function(ind) { return !!(ind.flags && ind.flags.drugHistory); },
      sourceField: 'flags.drugHistory',
    },
    {
      code: 'ESCAPED_CUSTODY',
      label: 'בריחה ממשמורת בעבר',
      level: 3,
      test: function(ind) { return !!(ind.flags && ind.flags.escapedCustody); },
      sourceField: 'flags.escapedCustody',
    },
    {
      code: 'FLIGHT_RISK',
      label: 'כוונת בריחה ידועה',
      level: 3,
      test: function(ind) { return !!(ind.flags && ind.flags.flightRisk); },
      sourceField: 'flags.flightRisk',
    },
    {
      code: 'SUICIDE_RISK',
      label: 'סיכון אובדני / הצהרת אובדנות',
      level: 3,
      test: function(ind) { return !!(ind.flags && ind.flags.suicideRisk); },
      sourceField: 'flags.suicideRisk',
    },
    {
      code: 'REPEAT_4PLUS',
      label: '4 כליאות קודמות ומעלה',
      level: 3,
      test: function(ind) { return !!(ind.previousIncarcerations && ind.previousIncarcerations.count >= 4); },
      sourceField: 'previousIncarcerations.count',
    },

    /* ══ מדרג 2 — Warning ════════════════════════════════════════════════ */
    {
      code: 'VERBAL_AGGRESSION',
      label: 'אגרסיביות מילולית קודמת',
      level: 2,
      test: function(ind) { return !!(ind.flags && ind.flags.verbalViolence); },
      sourceField: 'flags.verbalViolence',
    },
    {
      code: 'ALLERGY',
      label: 'אלרגיה ידועה',
      level: 2,
      test: function(ind) { return !!(ind.flags && ind.flags.allergies); },
      sourceField: 'flags.allergies',
    },
    {
      code: 'MEDICAL_CONDITION',
      label: 'מצב רפואי משמעותי',
      level: 2,
      test: function(ind) { return !!(ind.flags && ind.flags.medicalConditions); },
      sourceField: 'flags.medicalConditions',
    },

    /* ══ מדרג 1 — Base ═══════════════════════════════════════════════════ */
    {
      code: 'HAVOUSH',
      label: 'חבוש',
      level: 1,
      test: function(ind) { return ind.personType === 'havoush'; },
      sourceField: 'personType',
    },
    {
      code: 'MINOR_OFFENSE',
      label: 'עבירה קלה',
      level: 1,
      test: function(ind) { return ind.offenseGravity === 'minor'; },
      sourceField: 'offenseGravity',
    },
    {
      code: 'FEW_SHORT_INCARC',
      label: '1–3 כליאות קודמות עד 28 יום',
      level: 1,
      test: function(ind) {
        var c = ind.previousIncarcerations ? ind.previousIncarcerations.count : 0;
        return c >= 1 && c <= 3 && !!(ind.previousIncarcerations && ind.previousIncarcerations.allShort);
      },
      sourceField: 'previousIncarcerations',
    },
  ];

  /* Calculate ranking from ExternalPersonDataService indicators.
     Returns: { level, matchedRules, calculatedAt }
     level 0 = no criteria matched (no ranking). */
  function calculate(indicators) {
    if (!indicators) {
      return { level: 0, matchedRules: [], calculatedAt: new Date().toISOString() };
    }
    var matched = [];
    MASHLAT_RANKING_RULES.forEach(function(rule) {
      try {
        if (rule.test(indicators)) matched.push(rule);
      } catch (e) { /* rule evaluation error — skip safely */ }
    });

    var maxLevel = 0;
    matched.forEach(function(r) { if (r.level > maxLevel) maxLevel = r.level; });

    return {
      level:        maxLevel,
      matchedRules: matched,
      calculatedAt: new Date().toISOString(),
    };
  }

  /* Build a storable snapshot of a ranking result (for coordination record) */
  function buildSnapshot(rankResult, indicatorSource) {
    return {
      level:             rankResult.level,
      levelLabel:        levelLabel(rankResult.level) || 'ללא מדרג',
      matchedRules:      rankResult.matchedRules.map(function(r) {
        return { code: r.code, label: r.label, level: r.level };
      }),
      calculatedAt:      rankResult.calculatedAt,
      source:            indicatorSource || 'מערכת חיצונית — נתוני הדגמה',
    };
  }

  function levelLabel(level) {
    if (level >= 3) return 'מדרג 3';
    if (level === 2) return 'מדרג 2';
    if (level === 1) return 'מדרג 1';
    return null;
  }

  function levelClass(level) {
    if (level >= 3) return 'badge-critical';
    if (level === 2) return 'badge-pending';
    if (level === 1) return 'badge-info';
    return 'badge-inactive';
  }

  return {
    calculate:             calculate,
    buildSnapshot:         buildSnapshot,
    levelLabel:            levelLabel,
    levelClass:            levelClass,
    MASHLAT_RANKING_RULES: MASHLAT_RANKING_RULES,
  };
})();
