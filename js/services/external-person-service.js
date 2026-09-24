/* external-person-service.js
   Simulates an external system that provides READ-ONLY person indicators.
   In production this would call an authorized external API.
   Mashlat operators CANNOT edit these values — they are retrieved automatically.
   "המדרג מחושב אוטומטית לפי קריטריונים, על בסיס מידע שנשלף ממערכת חיצונית." */
'use strict';

window.ExternalPersonDataService = (function() {

  var PERSON_TYPE_LABELS = {
    havoush:    'חבוש',
    atzur:      'עצור',
    asir:       'אסיר',
    al_mishpat: 'על-משפט',
  };

  var OFFENSE_GRAVITY_LABELS = {
    minor:    'קל',
    medium:   'בינוני',
    severe:   'חמור',
    critical: 'קריטי',
  };

  /* ── Demo person profiles ─────────────────────────────────────────────
     Fictional data only. Represents what the external system would return.
     personType    — classification from external system
     offenseGravity — offense gravity classification from external system
     flags          — operational indicators from external system history
     ─────────────────────────────────────────────────────────────────── */
  var DEMO_PROFILES = {
    /* ── מדרג 1 personas ─────────── */
    /* p001 יוסף כהן — HAVOUSH + MINOR_OFFENSE → מדרג 1 */
    'p001': { personType: 'havoush',    offenseGravity: 'minor',    flags: { violenceHistory: false, verbalViolence: false, drugHistory: false, escapedCustody: false, flightRisk: false, suicideRisk: false, allergies: false, medicalConditions: false } },
    /* p003 דנה מזרחי — HAVOUSH + MINOR_OFFENSE + FEW_SHORT_INCARC (2 × 20d) → מדרג 1 */
    'p003': { personType: 'havoush',    offenseGravity: 'minor',    flags: { violenceHistory: false, verbalViolence: false, drugHistory: false, escapedCustody: false, flightRisk: false, suicideRisk: false, allergies: false, medicalConditions: false } },
    /* p004 משה אברהם — MINOR_OFFENSE only (atzur type, no incarceration history) → מדרג 1 */
    'p004': { personType: 'atzur',      offenseGravity: 'minor',    flags: { violenceHistory: false, verbalViolence: false, drugHistory: false, escapedCustody: false, flightRisk: false, suicideRisk: false, allergies: false, medicalConditions: false } },
    /* p011 בנימין גולד — HAVOUSH + MINOR_OFFENSE → מדרג 1 */
    'p011': { personType: 'havoush',    offenseGravity: 'minor',    flags: { violenceHistory: false, verbalViolence: false, drugHistory: false, escapedCustody: false, flightRisk: false, suicideRisk: false, allergies: false, medicalConditions: false } },
    /* p016 צחי אוחיון — HAVOUSH → מדרג 1 */
    'p016': { personType: 'havoush',    offenseGravity: 'medium',   flags: { violenceHistory: false, verbalViolence: false, drugHistory: false, escapedCustody: false, flightRisk: false, suicideRisk: false, allergies: false, medicalConditions: false } },
    /* p019 עידן בוחניק — HAVOUSH + MINOR_OFFENSE + FEW_SHORT_INCARC (1 × 21d) → מדרג 1 */
    'p019': { personType: 'havoush',    offenseGravity: 'minor',    flags: { violenceHistory: false, verbalViolence: false, drugHistory: false, escapedCustody: false, flightRisk: false, suicideRisk: false, allergies: false, medicalConditions: false } },

    /* ── מדרג 2 personas ─────────── */
    /* p002 אבי לוי — ALLERGY + HAVOUSH + FEW_SHORT_INCARC → מדרג 2 (allergy elevates above level 1) */
    'p002': { personType: 'havoush',    offenseGravity: 'minor',    flags: { violenceHistory: false, verbalViolence: false, drugHistory: false, escapedCustody: false, flightRisk: false, suicideRisk: false, allergies: true,  medicalConditions: false } },

    /* ── no ranking ─────────────── */
    /* p005 רחל פרץ — no indicators → no ranking */
    'p005': { personType: null,         offenseGravity: null,       flags: { violenceHistory: false, verbalViolence: false, drugHistory: false, escapedCustody: false, flightRisk: false, suicideRisk: false, allergies: false, medicalConditions: false } },
    /* p009 יפה רוזנברג — no indicators → no ranking */
    'p009': { personType: null,         offenseGravity: null,       flags: { violenceHistory: false, verbalViolence: false, drugHistory: false, escapedCustody: false, flightRisk: false, suicideRisk: false, allergies: false, medicalConditions: false } },

    /* ── מדרג 3 personas ─────────── */
    /* p006 נחום ביטון — VIOLENCE_HISTORY + VERBAL_AGGRESSION + MEDICAL_CONDITION → מדרג 3 */
    'p006': { personType: 'asir',       offenseGravity: 'severe',   flags: { violenceHistory: true,  verbalViolence: true,  drugHistory: false, escapedCustody: false, flightRisk: false, suicideRisk: false, allergies: false, medicalConditions: true  } },
    /* p007 טלי שפירא — DRUG_OFFENSE + SUICIDE_RISK + MEDICAL_CONDITION + HAVOUSH → מדרג 3 (multiple levels) */
    'p007': { personType: 'havoush',    offenseGravity: 'severe',   flags: { violenceHistory: false, verbalViolence: false, drugHistory: true,  escapedCustody: false, flightRisk: false, suicideRisk: true,  allergies: false, medicalConditions: true  } },
    /* p008 אריאל גורן — ESCAPED_CUSTODY + FLIGHT_RISK → מדרג 3 */
    'p008': { personType: 'atzur',      offenseGravity: 'critical', flags: { violenceHistory: false, verbalViolence: false, drugHistory: false, escapedCustody: true,  flightRisk: true,  suicideRisk: false, allergies: false, medicalConditions: false } },
    /* p010 עמוס נחמן — REPEAT_4PLUS (4 prior incarcerations) → מדרג 3 */
    'p010': { personType: 'asir',       offenseGravity: 'medium',   flags: { violenceHistory: false, verbalViolence: false, drugHistory: false, escapedCustody: false, flightRisk: false, suicideRisk: false, allergies: false, medicalConditions: false } },
    /* p013 ורד אלון — DRUG_OFFENSE → מדרג 3 */
    'p013': { personType: 'havoush',    offenseGravity: 'medium',   flags: { violenceHistory: false, verbalViolence: false, drugHistory: true,  escapedCustody: false, flightRisk: false, suicideRisk: false, allergies: false, medicalConditions: false } },
    /* p014 יואב בן דוד — FLIGHT_RISK → מדרג 3 */
    'p014': { personType: 'asir',       offenseGravity: 'severe',   flags: { violenceHistory: false, verbalViolence: false, drugHistory: false, escapedCustody: false, flightRisk: true,  suicideRisk: false, allergies: false, medicalConditions: false } },
    /* p015 מרים חסון — SUICIDE_RISK + MEDICAL_CONDITION → מדרג 3 */
    'p015': { personType: 'havoush',    offenseGravity: 'minor',    flags: { violenceHistory: false, verbalViolence: false, drugHistory: false, escapedCustody: false, flightRisk: false, suicideRisk: true,  allergies: false, medicalConditions: true  } },
  };

  /* ── Previous incarceration history ───────────────────────────────────
     READ-ONLY external data. NOT entered by Mashlat operators.
     These records may influence ranking rules (e.g. REPEAT_4PLUS, FEW_SHORT_INCARC).
     ─────────────────────────────────────────────────────────────────── */
  var DEMO_INCARCERATION_HISTORY = {
    'p001': [
      { fileNumber: 'BR-2024-0142', entryDate: '2024-03-10', releaseDate: '2024-04-09', facility: 'בית הכלא הצבאי 1', type: 'חבוש', offense: 'אי ציות לפקודה', days: 30, status: 'שוחרר' },
    ],
    'p002': [
      { fileNumber: 'BR-2023-0112', entryDate: '2023-06-01', releaseDate: '2023-06-21', facility: 'בית הכלא הצבאי 4', type: 'חבוש', offense: 'עדר ללא רשות', days: 20, status: 'שוחרר' },
      { fileNumber: 'BR-2024-0311', entryDate: '2024-04-10', releaseDate: '2024-04-24', facility: 'בית הכלא הצבאי 1', type: 'חבוש', offense: 'אי הופעה לתורנות', days: 14, status: 'שוחרר' },
    ],
    'p003': [
      { fileNumber: 'BR-2023-0891', entryDate: '2023-09-01', releaseDate: '2023-09-21', facility: 'בית הכלא הצבאי 4', type: 'חבוש', offense: 'אי הופעה לתורנות', days: 20, status: 'שוחרר' },
      { fileNumber: 'BR-2024-0055', entryDate: '2024-01-15', releaseDate: '2024-02-04', facility: 'בית הכלא הצבאי 1', type: 'עצור', offense: 'התנהגות בלתי הולמת', days: 20, status: 'שוחרר' },
    ],
    'p006': [
      { fileNumber: 'BR-2022-0431', entryDate: '2022-08-15', releaseDate: '2022-09-14', facility: 'בית הכלא הצבאי 1', type: 'עצור', offense: 'תקיפת חייל — גרם חבלה', days: 30, status: 'שוחרר' },
      { fileNumber: 'BR-2024-0627', entryDate: '2024-06-01', releaseDate: '2024-06-21', facility: 'בית הכלא הצבאי 4', type: 'חבוש', offense: 'שכרות בשירות', days: 20, status: 'שוחרר' },
    ],
    'p007': [
      { fileNumber: 'BR-2023-0544', entryDate: '2023-07-10', releaseDate: '2023-07-30', facility: 'בית הכלא הצבאי 1', type: 'חבוש', offense: 'שימוש בסמים', days: 20, status: 'שוחרר' },
    ],
    'p008': [
      { fileNumber: 'BR-2023-0218', entryDate: '2023-03-20', releaseDate: '2023-04-04', facility: 'בית הכלא הצבאי 4', type: 'עצור', offense: 'אי ציות לפקודה', days: 15, status: 'שוחרר' },
      { fileNumber: 'BR-2024-0099', entryDate: '2024-02-01', releaseDate: '2024-02-15', facility: 'בית הכלא הצבאי 1', type: 'חבוש', offense: 'ניסיון בריחה ממשמורת', days: 14, status: 'שוחרר' },
    ],
    'p010': [
      { fileNumber: 'BR-2023-0334', entryDate: '2023-04-01', releaseDate: '2023-04-22', facility: 'בית הכלא הצבאי 1', type: 'חבוש', offense: 'עזיבת שמירה', days: 21, status: 'שוחרר' },
      { fileNumber: 'BR-2023-1102', entryDate: '2023-11-10', releaseDate: '2023-12-10', facility: 'בית הכלא הצבאי 4', type: 'חבוש', offense: 'אי ציות חוזר', days: 30, status: 'שוחרר' },
      { fileNumber: 'BR-2024-0502', entryDate: '2024-05-15', releaseDate: '2024-06-14', facility: 'בית הכלא הצבאי 1', type: 'אסיר', offense: 'ניצול מעמד', days: 30, status: 'שוחרר' },
      { fileNumber: 'BR-2025-0219', entryDate: '2025-03-05', releaseDate: '2025-04-04', facility: 'בית הכלא הצבאי 1', type: 'חבוש', offense: 'עריקות קצרה', days: 30, status: 'שוחרר' },
    ],
    'p011': [
      { fileNumber: 'BR-2025-0880', entryDate: '2025-08-20', releaseDate: '2025-09-19', facility: 'בית הכלא הצבאי 4', type: 'חבוש', offense: 'עריקות', days: 30, status: 'שוחרר' },
    ],
    'p016': [
      { fileNumber: 'BR-2024-0741', entryDate: '2024-07-01', releaseDate: '2024-07-31', facility: 'בית הכלא הצבאי 1', type: 'חבוש', offense: 'עדר ללא רשות', days: 30, status: 'שוחרר' },
    ],
    'p019': [
      { fileNumber: 'BR-2025-0112', entryDate: '2025-02-01', releaseDate: '2025-02-22', facility: 'בית הכלא הצבאי 4', type: 'חבוש', offense: 'גניבה', days: 21, status: 'שוחרר' },
    ],
  };

  var DEFAULT_FLAGS = {
    violenceHistory: false, verbalViolence: false, drugHistory: false,
    escapedCustody: false, flightRisk: false, suicideRisk: false,
    allergies: false, medicalConditions: false,
  };

  /* Main API — returns all external indicators for a person */
  function getPersonIndicators(personId) {
    var profile  = (personId && DEMO_PROFILES[personId]) || {};
    var records  = (personId && DEMO_INCARCERATION_HISTORY[personId]) || [];
    var totalDays = records.reduce(function(s, r) { return s + (r.days || 0); }, 0);
    var allShort  = records.length > 0 && records.every(function(r) { return (r.days || 0) <= 28; });
    var last      = records.length ? records[records.length - 1] : null;
    var flags     = Object.assign({}, DEFAULT_FLAGS, profile.flags || {});

    return {
      personId:           personId || null,
      personType:         profile.personType     || null,
      personTypeLabel:    PERSON_TYPE_LABELS[profile.personType]     || null,
      offenseGravity:     profile.offenseGravity || null,
      offenseGravityLabel: OFFENSE_GRAVITY_LABELS[profile.offenseGravity] || null,
      flags: flags,
      previousIncarcerations: {
        records:      records,
        count:        records.length,
        totalDays:    totalDays,
        allShort:     allShort,
        lastEntry:    last ? last.entryDate  : null,
        lastFacility: last ? last.facility   : null,
      },
      source:      'מערכת חיצונית — נתוני הדגמה',
      retrievedAt: new Date().toISOString(),
    };
  }

  /* Backward-compat shim for any code calling BlueRedService.getPreviousIncarcerations() */
  function getPreviousIncarcerations(personId) {
    var ind = getPersonIndicators(personId);
    return {
      records: ind.previousIncarcerations.records,
      flags:   ind.flags,
      summary: {
        total:        ind.previousIncarcerations.count,
        totalDays:    ind.previousIncarcerations.totalDays,
        lastEntry:    ind.previousIncarcerations.lastEntry,
        lastFacility: ind.previousIncarcerations.lastFacility,
      },
      source: ind.source,
    };
  }

  return {
    getPersonIndicators:       getPersonIndicators,
    getPreviousIncarcerations: getPreviousIncarcerations,
    PERSON_TYPE_LABELS:        PERSON_TYPE_LABELS,
    OFFENSE_GRAVITY_LABELS:    OFFENSE_GRAVITY_LABELS,
  };
})();
