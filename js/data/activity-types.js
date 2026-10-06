/* activity-types.js — activity type definitions */
'use strict';

window.TASK_ACTIVITY_TYPES = [
  { id: 'patrol', label: 'סיור' },
  { id: 'checkpoint', label: 'מחסום' },
  { id: 'security', label: 'אבטחה' },
  { id: 'escort', label: 'ליווי' },
  { id: 'arrest', label: 'מעצר' },
  { id: 'investigation', label: 'בילוש' },
  { id: 'reinforcement', label: 'תגבור' },
  { id: 'admin', label: 'משימה מנהלתית' },
];

/* strict task classification: top-level type -> allowed subcategories (administrative has exactly four) */
window.TASK_SUBCATEGORIES = {
  administrative: [
    { id: 'report', label: 'דיווח' },
    { id: 'coordination', label: 'תיאום' },
    { id: 'admin_travel', label: 'נסיעה מנהלתית' },
    { id: 'malfunction', label: 'תקלה' },
  ],
  operational: [
    { id: 'patrol', label: 'סיור' },
    { id: 'checkpoint', label: 'מחסום' },
    { id: 'security', label: 'אבטחה' },
    { id: 'escort', label: 'ליווי' },
    { id: 'arrest', label: 'מעצר' },
    { id: 'investigation', label: 'בילוש' },
    { id: 'reinforcement', label: 'תגבור' },
  ],
};
window.TASK_SUBCATEGORY_LABELS = {};
Object.keys(TASK_SUBCATEGORIES).forEach(function(k) { TASK_SUBCATEGORIES[k].forEach(function(s) { TASK_SUBCATEGORY_LABELS[k + ':' + s.id] = s.label; }); });
window.taskSubcategoryLabel = function(category, sub) { return (category && sub && TASK_SUBCATEGORY_LABELS[category + ':' + sub]) || ''; };

window.HAMAL_ACTION_TYPES = [
  { id: 'entry', label: 'כניסה' },
  { id: 'exit', label: 'יציאה' },
  { id: 'alert', label: 'התראה' },
  { id: 'routine', label: 'שגרה' },
];

window.HAMAL_CATEGORIES = [
  { id: 'intervention', label: 'התערבות' },
  { id: 'escort', label: 'ליווי' },
  { id: 'surveillance', label: 'בילוש' },
  { id: 'policing', label: 'שיטור' },
  { id: 'arrest', label: 'מעצר' },
  { id: 'report', label: 'דיווח' },
  { id: 'coordination', label: 'תיאום' },
  { id: 'malfunction', label: 'תקלה' },
  { id: 'admin_travel', label: 'נסיעה מנהלתית' },
];

window.INMATE_ACTIVITY_TYPES_LEGACY_LABELS = [
  'יציאה למרפאה', 'פעילויות חינוך', 'פעילויות עליה', 'יציאה לביד״צ לערעורים', 'ועדה להעברת כלואים', 'דיון בבית דין אזרחי', 'ועדת סמים',
  'העברה לכלא אזרחי', 'ועדה לעיון בעונש', 'מיוחדים - רפואה', 'ביה״ח 10', 'ועדה רפואית', 'פגישה עם עו״ד בבס״כ', 'ביקורי משפחות',
  'משיכות חפצים מהקבלה', 'קב״ן', 'רופא', 'רופא שיניים', 'העברות ציוד', 'ביקורי מפקדים', 'אחר', 'יציאה לביד״צ קריה משפטית', 'ווהלים',
  'פסיכיאטר', 'ביקור עו״ד בקריה המשפטית', 'קרמינולוגית', 'חקירה', 'מיוני מיטב', 'מיוחדים - ניהול', 'פעילות דמ״שים', 'סדנת העצמה',
  'פרויקטים', 'חר״פ צריפין', 'השכלה - 12 שנו״ל', 'קצינת מבחן', 'יציאה ללשכ״ג', 'פסיכיאטר פרטי', 'פעילות ZOOM', 'הערכת מסוכנות', 'תוכנית יה״ל',
];

window.INMATE_ACTIVITY_TYPES = [
  { id: 'medical', label: 'רפואה' },
  { id: 'medical_committee', label: 'ועדה רפואית' },
  { id: 'visit', label: 'ביקור' },
  { id: 'education', label: 'השכלה' },
  { id: 'psychological', label: 'טיפול נפשי' },
  { id: 'commander_interview', label: 'ראיון מפקד' },
  { id: 'sports', label: 'פעילות ספורט' },
  { id: 'prayer', label: 'תפילה' },
  { id: 'lawyer', label: 'עורך דין' },
  { id: 'court', label: 'בית דין' },
  { id: 'rehab', label: 'שיקום' },
  { id: 'workshop', label: 'סדנה' },
  { id: 'work', label: 'עבודה' },
  { id: 'family_call', label: 'שיחה משפחתית' },
  { id: 'exam', label: 'בדיקה' },
  { id: 'individual_treatment', label: 'טיפול פרט' },
  { id: 'intake', label: 'קליטה' },
  { id: 'release', label: 'שחרור' },
  { id: 'education_activity', label: 'פעילות חינוך' },
  { id: 'group_activity', label: 'פעילות קבוצתית' },
];
// merge in the legacy (Alon) activity types that do not exist yet — keeps every existing id intact
INMATE_ACTIVITY_TYPES_LEGACY_LABELS.forEach(function(label, i) {
  if (!INMATE_ACTIVITY_TYPES.some(function(t) { return t.label === label; })) INMATE_ACTIVITY_TYPES.push({ id: 'legacy_' + (i + 1), label: label });
});


window.INMATE_ACTIVITY_LOCATIONS = [
  'קלינאים', 'חדר בדיקה', 'בית חולים', 'בית משפט', 'בית משפט צבאי',
  'חדר ראיון', 'חדר כיתה', 'מגרש ספורט', 'חדר תפילה', 'משרד',
  'קנטינה', 'חדר אוכל', 'מחנה אחר', 'חוץ לבסיס',
];

window.EQUIPMENT_TYPES = [
  { id: 'weapon', label: 'נשק' },
  { id: 'radio', label: 'קשר' },
  { id: 'vest', label: 'אפוד' },
  { id: 'helmet', label: 'קסדה' },
  { id: 'vehicle', label: 'רכב' },
  { id: 'body_cam', label: 'מצלמת גוף' },
  { id: 'tablet', label: 'טאבלט' },
  { id: 'first_aid', label: 'ערכת עזרה ראשונה' },
  { id: 'flashlight', label: 'פנס' },
  { id: 'other', label: 'ציוד נוסף' },
];

window.CANTEEN_PRODUCT_CATEGORIES = [
  { id: 'food', label: 'מזון' },
  { id: 'drinks', label: 'משקאות' },
  { id: 'hygiene', label: 'היגיינה' },
  { id: 'clothing', label: 'ביגוד' },
  { id: 'electronics', label: 'אלקטרוניקה' },
  { id: 'stationery', label: 'כתיבה' },
  { id: 'other', label: 'אחר' },
];

window.DELIVERY_METHODS = [
  { id: 'hand', label: 'מסירה ידנית' },
  { id: 'locate', label: 'דו״ח איתור' },
  { id: 'mail', label: 'דואר' },
  { id: 'fax', label: 'פקס' },
  { id: 'email', label: 'דואר אלקטרוני' },
  { id: 'digital', label: 'מערכת דיגיטלית' },
];


window.DETENTION_REASONS = [
  'הפרת ביטחון', 'תקיפה', 'גניבה', 'שכרות', 'עריקות', 'השתמטות',
  'אי ציות', 'פגיעה ברכוש', 'שימוש בסמים', 'אחר'
];

window.BEHAVIOR_TYPES = [
  { id: 'positive', label: 'חיובי' },
  { id: 'negative', label: 'שלילי' },
  { id: 'neutral', label: 'ניטרלי' },
  { id: 'exceptional', label: 'חריג' },
];

window.DESERTER_TYPE = [
  { id: 'all', label: 'הכל' },
  { id: 'deserter', label: 'עריק' },
  { id: 'shirker', label: 'משתמט' },
];
