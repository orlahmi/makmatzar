/* offenses.js — offense categories and codes */
'use strict';

window.OFFENSE_CATEGORIES = [
  { id: 'discipline', label: 'משמעת' },
  { id: 'traffic', label: 'תנועה' },
  { id: 'violence', label: 'אלימות' },
  { id: 'property', label: 'רכוש' },
  { id: 'substance', label: 'סמים ואלכוהול' },
  { id: 'absence', label: 'היעדרות' },
  { id: 'security', label: 'ביטחון' },
  { id: 'financial', label: 'כספי' },
  { id: 'other', label: 'אחר' },
];

window.OFFENSES = [
  { id: 'o001', code: '101', categoryId: 'discipline', title: 'עדר מהיחידה ללא רשות', description: 'מחדל בהגעה בזמן', points: 6, fine: 0, severity: 'medium' },
  { id: 'o002', code: '102', categoryId: 'discipline', title: 'התנהגות בלתי הולמת', description: 'התנהגות שאינה הולמת', points: 3, fine: 200, severity: 'low' },
  { id: 'o003', code: '103', categoryId: 'discipline', title: 'אי ציות לפקודה', description: 'סרוב לציית לפקודת מפקד', points: 8, fine: 0, severity: 'high' },
  { id: 'o004', code: '104', categoryId: 'discipline', title: 'אי הופעה לתורנות', description: 'לא הגיע לתורנות שנקבעה', points: 5, fine: 0, severity: 'medium' },
  { id: 'o005', code: '201', categoryId: 'traffic', title: 'עקיפה אסורה', description: 'עקיפה במקום אסור', points: 4, fine: 500, severity: 'medium' },
  { id: 'o006', code: '202', categoryId: 'traffic', title: 'מהירות מופרזת', description: 'נסיעה מעל המהירות המותרת', points: 6, fine: 750, severity: 'high' },
  { id: 'o007', code: '203', categoryId: 'traffic', title: 'אי חגירת חגורת בטיחות', description: 'נסיעה ללא חגורת בטיחות', points: 2, fine: 250, severity: 'low' },
  { id: 'o008', code: '204', categoryId: 'traffic', title: 'כניסה לאזור אסור', description: 'כניסת רכב לאזור מוגבל', points: 5, fine: 400, severity: 'medium' },
  { id: 'o009', code: '301', categoryId: 'violence', title: 'תקיפה בדרגה קלה', description: 'תקיפה פיזית קלה', points: 10, fine: 0, severity: 'high' },
  { id: 'o010', code: '302', categoryId: 'violence', title: 'תקיפה בדרגה חמורה', description: 'תקיפה פיזית חמורה', points: 20, fine: 0, severity: 'critical' },
  { id: 'o011', code: '303', categoryId: 'violence', title: 'איומים', description: 'איומים על אדם', points: 8, fine: 0, severity: 'high' },
  { id: 'o012', code: '401', categoryId: 'property', title: 'נזק לרכוש ממשלתי', description: 'פגיעה ברכוש מדינה', points: 7, fine: 1000, severity: 'high' },
  { id: 'o013', code: '402', categoryId: 'property', title: 'גניבה', description: 'גניבת רכוש', points: 15, fine: 0, severity: 'critical' },
  { id: 'o014', code: '501', categoryId: 'substance', title: 'שכרות בשירות', description: 'שכרות בזמן שירות', points: 12, fine: 0, severity: 'high' },
  { id: 'o015', code: '502', categoryId: 'substance', title: 'שימוש בסמים', description: 'שימוש בחומרים אסורים', points: 20, fine: 0, severity: 'critical' },
  { id: 'o016', code: '601', categoryId: 'absence', title: 'עריקות', description: 'עריקה מהשירות', points: 30, fine: 0, severity: 'critical' },
  { id: 'o017', code: '602', categoryId: 'absence', title: 'השתמטות', description: 'השתמטות מהשירות', points: 15, fine: 0, severity: 'high' },
  { id: 'o018', code: '701', categoryId: 'security', title: 'הפרת ביטחון שדה', description: 'הפרת כללי ביטחון שדה', points: 10, fine: 0, severity: 'high' },
  { id: 'o019', code: '702', categoryId: 'security', title: 'חשיפת מידע מסווג', description: 'חשיפת מידע סודי', points: 25, fine: 0, severity: 'critical' },
  { id: 'o020', code: '801', categoryId: 'financial', title: 'מרמה', description: 'מרמה ב- עניין כלכלי', points: 15, fine: 0, severity: 'high' },
];

window.OFFENSE_MAP = Object.fromEntries(OFFENSES.map(o => [o.id, o]));
window.OFFENSE_CODE_MAP = Object.fromEntries(OFFENSES.map(o => [o.code, o]));

window.REPORT_TYPES = [
  { id: 'dmash', label: 'דמ״ש', description: 'דו״ח מיוחד שוטר' },
];

window.REPORT_STATUSES = [
  { id: 'draft', label: 'טיוטה', badge: 'draft' },
  { id: 'pending', label: 'ממתין', badge: 'pending' },
  { id: 'approved', label: 'מאושר', badge: 'approved' },
  { id: 'cancelled', label: 'בוטל', badge: 'inactive' },
  { id: 'updated_sap', label: 'עודכן ב-SAP', badge: 'active' },
  { id: 'rejected', label: 'נדחה', badge: 'critical' },
];

window.TASK_STATUSES = [
  { id: 'draft', label: 'טיוטה', badge: 'draft' },
  { id: 'planned', label: 'מתוכננת', badge: 'pending' },
  { id: 'approved', label: 'מאושרת', badge: 'approved' },
  { id: 'in_progress', label: 'בביצוע', badge: 'inprogress' },
  { id: 'completed', label: 'הושלמה', badge: 'active' },
  { id: 'cancelled', label: 'בוטלה', badge: 'inactive' },
];

window.DESERTER_STATUSES = [
  { id: 'active', label: 'פעיל', badge: 'critical' },
  { id: 'located', label: 'אותר', badge: 'pending' },
  { id: 'arrested', label: 'נעצר', badge: 'approved' },
  { id: 'returned', label: 'חזר', badge: 'active' },
  { id: 'closed', label: 'סגור', badge: 'closed' },
];

window.PRISONER_STATUSES = [
  { id: 'active', label: 'כלוא', badge: 'active' },
  { id: 'transferred', label: 'הועבר', badge: 'pending' },
  { id: 'released', label: 'שוחרר', badge: 'closed' },
  { id: 'hospitalized', label: 'מאושפז', badge: 'warning' },
  { id: 'escaped', label: 'ברח', badge: 'critical' },
];

window.STOCK_MOVEMENT_STATUSES = [
  { id: 'draft', label: 'טיוטה', badge: 'draft' },
  { id: 'pending', label: 'ממתין לאישור', badge: 'pending' },
  { id: 'approved', label: 'מאושר', badge: 'approved' },
  { id: 'rejected', label: 'נדחה', badge: 'critical' },
  { id: 'completed', label: 'הושלם', badge: 'active' },
];

window.PRIORITIES = [
  { id: 'low', label: 'נמוכה', class: 'priority-low' },
  { id: 'medium', label: 'בינונית', class: 'priority-medium' },
  { id: 'high', label: 'גבוהה', class: 'priority-high' },
  { id: 'critical', label: 'קריטית', class: 'priority-critical' },
];

window.TASK_TYPES = [
  { id: 'administrative', label: 'מנהלתי' },
  { id: 'operational', label: 'מבצעי' },
];
window.TASK_TYPE_MAP = Object.fromEntries(TASK_TYPES.map(t => [t.id, t]));
