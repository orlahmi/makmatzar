/* ranks.js — military rank data */
'use strict';

window.RANKS = [
  { id: 'turai', label: 'טוראי', short: 'טוראי', order: 1 },
  { id: 'rav_turai', label: 'רב טוראי', short: 'רט', order: 2 },
  { id: 'sammal', label: 'סמל', short: 'סמ', order: 3 },
  { id: 'sammal_rishon', label: 'סמל ראשון', short: 'סמר', order: 4 },
  { id: 'rav_sammal', label: 'רב סמל', short: 'רסמ', order: 5 },
  { id: 'rav_sammal_mitkadem', label: 'רב סמל מתקדם', short: 'רסמ״מ', order: 6 },
  { id: 'rav_sammal_bakhir', label: 'רב סמל בכיר', short: 'רסמ״ב', order: 7 },
  { id: 'sgan_mefaked', label: 'סגן מפקד', short: 'סג', order: 8 },
  { id: 'mefaked', label: 'מפקד', short: 'מפ', order: 9 },
  { id: 'segen', label: 'סגן', short: 'סגן', order: 10 },
  { id: 'segen_mishne', label: 'סגן משנה', short: 'סגמ', order: 11 },
  { id: 'seren', label: 'סרן', short: 'סרן', order: 12 },
  { id: 'rav_seren', label: 'רב סרן', short: 'רסר', order: 13 },
  { id: 'sagan_aluf', label: 'סגן אלוף', short: 'סא', order: 14 },
  { id: 'aluf_mishne', label: 'אלוף משנה', short: 'אמ', order: 15 },
  { id: 'tat_aluf', label: 'תת אלוף', short: 'תא', order: 16 },
  { id: 'aluf', label: 'אלוף', short: 'אל', order: 17 },
  { id: 'rav_aluf', label: 'רב אלוף', short: 'רא', order: 18 },
  { id: 'civilian', label: 'אזרחי', short: 'אז', order: 0 },
  { id: 'other', label: 'אחר', short: 'אח', order: 0 },
];

window.RANK_MAP = Object.fromEntries(RANKS.map(r => [r.id, r]));

window.SERVICE_TYPES = [
  { id: 'regular', label: 'קבע' },
  { id: 'conscript', label: 'חובה' },
  { id: 'reserve', label: 'מילואים' },
  { id: 'civilian', label: 'אזרח' },
  { id: 'student', label: 'סטודנט' },
];

window.GENDER = {
  male: 'זכר',
  female: 'נקבה',
  other: 'אחר',
};
