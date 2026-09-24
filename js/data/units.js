/* units.js — organizational units */
'use strict';

window.DEMO_BASES = [
  { id: 'b100', code: '100', name: 'בסיס 100 — מקמצ״ר', shortName: 'מקמצ״ר', region: 'מרכז' },
  { id: 'b416', code: '416', name: 'בסיס 416 — נווה צדק', shortName: 'נווה צדק', region: 'דרום' },
  { id: 'b302', code: '302', name: 'בסיס 302 — מרכז שיטור', shortName: 'מרכז שיטור', region: 'מרכז' },
  { id: 'b708', code: '708', name: 'בסיס 708 — יחידת בילוש', shortName: 'יחידת בילוש', region: 'צפון' },
];

window.DEMO_UNITS = [
  { id: 'u01', name: 'יחידת שיטור מרכז', type: 'policing', baseId: 'b100' },
  { id: 'u02', name: 'יחידת ביטחון שדה', type: 'security', baseId: 'b100' },
  { id: 'u03', name: 'מפלגת סיור', type: 'patrol', baseId: 'b100' },
  { id: 'u04', name: 'מחלקת חקירות', type: 'investigation', baseId: 'b708' },
  { id: 'u05', name: 'יחידת בילוש מיוחדת', type: 'surveillance', baseId: 'b708' },
  { id: 'u06', name: 'מחלקת כליאה — בסיס 100', type: 'incarceration', baseId: 'b100' },
  { id: 'u07', name: 'מחלקת כליאה — בסיס 302', type: 'incarceration', baseId: 'b302' },
  { id: 'u08', name: 'קנטינה ראשית', type: 'canteen', baseId: 'b100' },
  { id: 'u09', name: 'קנטינה משנית', type: 'canteen', baseId: 'b416' },
  { id: 'u10', name: 'יחידת חמ״ל', type: 'hamal', baseId: 'b100' },
];

window.UNIT_MAP = Object.fromEntries(DEMO_UNITS.map(u => [u.id, u]));
window.BASE_MAP = Object.fromEntries(DEMO_BASES.map(b => [b.id, b]));

window.PRISONER_TYPES = [
  'על״מ', 'חבוש', 'אסיר', 'עצור', 'שב״ס'
];

window.PRISONER_LOCATIONS = [
  'אגף א׳', 'אגף ב׳', 'אגף ג׳', 'בידוד', 'קבלה', 'בית חולים', 'חוץ כלא'
];

window.DETENTION_COMPANIES = [
  'פלוגה א׳', 'פלוגה ב׳', 'פלוגה ג׳', 'פלוגה ד׳'
];

window.RISK_LEVELS = [
  { id: 'low', label: 'נמוכה', badge: 'success' },
  { id: 'medium', label: 'בינונית', badge: 'warning' },
  { id: 'high', label: 'גבוהה', badge: 'danger' },
  { id: 'critical', label: 'קריטית', badge: 'critical' },
];

window.CORPS_LIST = [
  'חיל רגלים', 'חיל שריון', 'חיל תותחנים', 'חיל הנדסה', 'חיל קשר',
  'חיל הרפואה', 'חיל התחזוקה', 'חיל האוויר', 'חיל הים', 'מג״ב',
  'מטה כללי', 'אגף המודיעין', 'פיקוד עורף', 'אחר'
];
