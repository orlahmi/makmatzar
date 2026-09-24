/* seed.js — initial demo data */
'use strict';

window.DataSeed = (function() {

  /* ===== PEOPLE ===== */
  const PEOPLE = [
    { id: 'p001', militaryNumber: '1234567', nationalId: '012345678', firstName: 'יוסף', lastName: 'כהן', gender: 'male', birthDate: '1995-03-15', rank: 'sammal', serviceType: 'conscript', unitId: 'u01', baseId: 'b100', status: 'active', phone: '052-1111111', address: 'רחוב הרצל 12, תל אביב', privacyRestricted: false },
    { id: 'p002', militaryNumber: '2345678', nationalId: '023456789', firstName: 'אבי', lastName: 'לוי', gender: 'male', birthDate: '1997-07-22', rank: 'turai', serviceType: 'conscript', unitId: 'u01', baseId: 'b100', status: 'active', phone: '052-2222222', address: 'רחוב בן יהודה 5, חיפה', privacyRestricted: false },
    { id: 'p003', militaryNumber: '3456789', nationalId: '034567890', firstName: 'דנה', lastName: 'מזרחי', gender: 'female', birthDate: '1999-11-08', rank: 'turai', serviceType: 'conscript', unitId: 'u02', baseId: 'b100', status: 'active', phone: '052-3333333', address: 'רחוב אלנבי 22, ירושלים', privacyRestricted: false },
    { id: 'p004', militaryNumber: '4567890', nationalId: '045678901', firstName: 'משה', lastName: 'אברהם', gender: 'male', birthDate: '1994-05-30', rank: 'sammal_rishon', serviceType: 'regular', unitId: 'u03', baseId: 'b100', status: 'active', phone: '052-4444444', address: 'רחוב דיזנגוף 88, תל אביב', privacyRestricted: false },
    { id: 'p005', militaryNumber: '5678901', nationalId: '056789012', firstName: 'רחל', lastName: 'פרץ', gender: 'female', birthDate: '1998-09-14', rank: 'turai', serviceType: 'conscript', unitId: 'u02', baseId: 'b100', status: 'active', phone: '052-5555555', address: 'שדרות רוטשילד 3, בני ברק', privacyRestricted: false },
    { id: 'p006', militaryNumber: '6789012', nationalId: '067890123', firstName: 'נחום', lastName: 'ביטון', gender: 'male', birthDate: '1993-01-25', rank: 'rav_sammal', serviceType: 'regular', unitId: 'u04', baseId: 'b708', status: 'active', phone: '052-6666666', address: 'רחוב ויצמן 17, רמת גן', privacyRestricted: false },
    { id: 'p007', militaryNumber: '7890123', nationalId: '078901234', firstName: 'טלי', lastName: 'שפירא', gender: 'female', birthDate: '1996-04-03', rank: 'sammal', serviceType: 'conscript', unitId: 'u05', baseId: 'b708', status: 'active', phone: '052-7777777', address: 'רחוב ז׳בוטינסקי 44, פתח תקווה', privacyRestricted: false },
    { id: 'p008', militaryNumber: '8901234', nationalId: '089012345', firstName: 'אריאל', lastName: 'גורן', gender: 'male', birthDate: '1992-08-19', rank: 'segen', serviceType: 'regular', unitId: 'u06', baseId: 'b100', status: 'active', phone: '052-8888888', address: 'רחוב אחד העם 9, תל אביב', privacyRestricted: false },
    { id: 'p009', militaryNumber: '9012345', nationalId: '090123456', firstName: 'יפה', lastName: 'רוזנברג', gender: 'female', birthDate: '2000-12-07', rank: 'turai', serviceType: 'conscript', unitId: 'u01', baseId: 'b100', status: 'active', phone: '052-9999999', address: 'רחוב בלפור 6, ראשון לציון', privacyRestricted: false },
    { id: 'p010', militaryNumber: '0123456', nationalId: '001234567', firstName: 'עמוס', lastName: 'נחמן', gender: 'male', birthDate: '1991-06-11', rank: 'seren', serviceType: 'regular', unitId: 'u10', baseId: 'b100', status: 'active', phone: '053-1111111', address: 'רחוב הנביאים 33, ירושלים', privacyRestricted: false },
    // Prisoners
    { id: 'p011', militaryNumber: '1111111', nationalId: '111111118', firstName: 'בנימין', lastName: 'גולד', gender: 'male', birthDate: '1996-02-28', rank: 'turai', serviceType: 'conscript', unitId: 'u01', baseId: 'b100', status: 'detained', phone: '053-2222222', address: 'רחוב מנחם בגין 45, חיפה', privacyRestricted: false },
    { id: 'p012', militaryNumber: '2222222', nationalId: '222222226', firstName: 'חיים', lastName: 'שלום', gender: 'male', birthDate: '1994-10-16', rank: 'sammal', serviceType: 'conscript', unitId: 'u02', baseId: 'b100', status: 'detained', phone: '053-3333333', address: 'רחוב שינקין 7, תל אביב', privacyRestricted: false },
    { id: 'p013', militaryNumber: '3333333', nationalId: '333333334', firstName: 'ורד', lastName: 'אלון', gender: 'female', birthDate: '1998-03-05', rank: 'turai', serviceType: 'conscript', unitId: 'u03', baseId: 'b100', status: 'detained', phone: '053-4444444', address: 'רחוב הירדן 12, נהריה', privacyRestricted: true },
    { id: 'p014', militaryNumber: '4444444', nationalId: '444444449', firstName: 'יואב', lastName: 'בן דוד', gender: 'male', birthDate: '1993-07-20', rank: 'sammal_rishon', serviceType: 'regular', unitId: 'u06', baseId: 'b100', status: 'detained', phone: '053-5555555', address: 'רחוב הגלבוע 3, עפולה', privacyRestricted: false },
    { id: 'p015', militaryNumber: '5555555', nationalId: '555555557', firstName: 'מרים', lastName: 'חסון', gender: 'female', birthDate: '2000-11-29', rank: 'turai', serviceType: 'conscript', unitId: 'u01', baseId: 'b100', status: 'detained', phone: '053-6666666', address: 'רחוב הלכיש 8, קרית גת', privacyRestricted: false },
    // Deserters
    { id: 'p016', militaryNumber: '6666666', nationalId: '666666665', firstName: 'צחי', lastName: 'אוחיון', gender: 'male', birthDate: '1999-04-12', rank: 'turai', serviceType: 'conscript', unitId: 'u01', baseId: 'b100', status: 'deserter', phone: '053-7777777', address: 'רחוב השושנים 14, אשדוד', privacyRestricted: false },
    { id: 'p017', militaryNumber: '7777777', nationalId: '777777773', firstName: 'גל', lastName: 'בסן', gender: 'male', birthDate: '1998-08-31', rank: 'turai', serviceType: 'conscript', unitId: 'u02', baseId: 'b100', status: 'deserter', phone: '053-8888888', address: 'שכונת נוה שאנן 5, חיפה', privacyRestricted: false },
    { id: 'p018', militaryNumber: '8888888', nationalId: '888888881', firstName: 'אפרת', lastName: 'כץ', gender: 'female', birthDate: '1997-01-09', rank: 'turai', serviceType: 'conscript', unitId: 'u03', baseId: 'b100', status: 'deserter', phone: '053-9999999', address: 'רחוב הזית 22, נתניה', privacyRestricted: false },
    { id: 'p019', militaryNumber: '9999999', nationalId: '999999989', firstName: 'עידן', lastName: 'בוחניק', gender: 'male', birthDate: '1995-05-25', rank: 'sammal', serviceType: 'conscript', unitId: 'u04', baseId: 'b708', status: 'active', phone: '054-1111111', address: 'רחוב הסביון 3, מגדל העמק', privacyRestricted: false },
    { id: 'p020', militaryNumber: '0000001', nationalId: '000000019', firstName: 'לאה', lastName: 'קדוש', gender: 'female', birthDate: '2001-09-18', rank: 'turai', serviceType: 'conscript', unitId: 'u02', baseId: 'b100', status: 'active', phone: '054-2222222', address: 'שדרות בן גוריון 45, באר שבע', privacyRestricted: false },
  ];

  /* ===== POLICE REPORTS ===== */
  const POLICE_REPORTS = [
    { id: 'r001', reportNumber: 'DR-001234', reportType: 'dmash', date: '2026-07-15', time: '09:30', baseId: 'b100', unitId: 'u01', officerId: 'u_officer1', officerName: 'יונתן שמחון', personId: 'p002', offenseId: 'o001', offenseTitle: 'עדר מהיחידה ללא רשות', status: 'approved', description: 'הנ"ל נעדר מהיחידה ללא אישור מיוחד במשך 4 שעות. נמצא בביתו ללא היתר.', location: 'בסיס 100', severity: 'medium', fine: 0, points: 6, deliveryMethod: 'hand', deliveryDate: '2026-07-15', createdAt: '2026-07-15T09:30:00Z', updatedAt: '2026-07-15T14:22:00Z' },
    { id: 'r002', reportNumber: 'DR-001235', reportType: 'bidtz', date: '2026-07-16', time: '14:15', baseId: 'b100', unitId: 'u01', officerId: 'u_officer1', officerName: 'יונתן שמחון', personId: 'p003', offenseId: 'o002', offenseTitle: 'התנהגות בלתי הולמת', status: 'pending', description: 'הנ"ל התנהגה באופן לא הולם בחדר האוכל בפני מספר חיילים. סרבה להתנצל.', location: 'חדר אוכל', severity: 'low', fine: 200, points: 3, deliveryMethod: 'hand', deliveryDate: '2026-07-16', createdAt: '2026-07-16T14:15:00Z', updatedAt: '2026-07-16T14:15:00Z' },
    { id: 'r003', reportNumber: 'DR-001236', reportType: 'dmash', date: '2026-07-17', time: '11:00', baseId: 'b100', unitId: 'u03', officerId: 'u_commander1', officerName: 'נועה כרמלי', personId: 'p004', offenseId: 'o003', offenseTitle: 'אי ציות לפקודה', status: 'approved', description: 'הנ"ל סרב לציית לפקודה ישירה של מפקדו. דחה הוראה בצורה פרובוקטיבית.', location: 'מגרש האימונים', severity: 'high', fine: 0, points: 8, deliveryMethod: 'hand', deliveryDate: '2026-07-17', createdAt: '2026-07-17T11:00:00Z', updatedAt: '2026-07-17T16:30:00Z' },
    { id: 'r004', reportNumber: 'DR-001237', reportType: 'dmash', date: '2026-07-18', time: '08:45', baseId: 'b302', unitId: 'u01', officerId: 'u_officer1', officerName: 'יונתן שמחון', personId: 'p005', offenseId: 'o007', offenseTitle: 'אי חגירת חגורת בטיחות', status: 'draft', description: 'נתפסה נוסעת ברכב ממשלתי ללא חגורת בטיחות בדרך לבסיס.', location: 'כביש 4', severity: 'low', fine: 250, points: 2, deliveryMethod: 'mail', deliveryDate: null, createdAt: '2026-07-18T08:45:00Z', updatedAt: '2026-07-18T08:45:00Z' },
    { id: 'r005', reportNumber: 'DR-001238', reportType: 'bidtz', date: '2026-07-19', time: '16:20', baseId: 'b100', unitId: 'u02', officerId: 'u_commander1', officerName: 'נועה כרמלי', personId: 'p001', offenseId: 'o009', offenseTitle: 'תקיפה בדרגה קלה', status: 'approved', description: 'הנ"ל תקף חייל אחר בעת ויכוח בצריף. גרם לשריטות.', location: 'צריף 4', severity: 'high', fine: 0, points: 10, deliveryMethod: 'hand', deliveryDate: '2026-07-19', createdAt: '2026-07-19T16:20:00Z', updatedAt: '2026-07-19T18:00:00Z' },
    { id: 'r006', reportNumber: 'DR-001239', reportType: 'dmash', date: '2026-07-20', time: '12:30', baseId: 'b100', unitId: 'u01', officerId: 'u_hamal1', officerName: 'גדעון אברהם', personId: 'p006', offenseId: 'o014', offenseTitle: 'שכרות בשירות', status: 'cancelled', description: 'בדיקה הראתה ריח אלכוהול. נדחה בשל תקלה טכנית בבדיקה.', location: 'שער הכניסה', severity: 'high', fine: 0, points: 12, deliveryMethod: 'hand', deliveryDate: '2026-07-20', createdAt: '2026-07-20T12:30:00Z', updatedAt: '2026-07-21T09:00:00Z' },
    { id: 'r007', reportNumber: 'DR-001240', reportType: 'dmash', date: '2026-07-21', time: '10:15', baseId: 'b100', unitId: 'u03', officerId: 'u_officer1', officerName: 'יונתן שמחון', personId: 'p007', offenseId: 'o004', offenseTitle: 'אי הופעה לתורנות', status: 'pending', description: 'לא הופיעה לתורנות לילה שנקבעה. לא נמצאה בבסיס.', location: 'בסיס 708', severity: 'medium', fine: 0, points: 5, deliveryMethod: 'hand', deliveryDate: '2026-07-21', createdAt: '2026-07-21T10:15:00Z', updatedAt: '2026-07-21T10:15:00Z' },
    { id: 'r008', reportNumber: 'DR-001241', reportType: 'dmash', date: '2026-07-22', time: '15:45', baseId: 'b416', unitId: 'u01', officerId: 'u_commander1', officerName: 'נועה כרמלי', personId: 'p008', offenseId: 'o012', offenseTitle: 'נזק לרכוש ממשלתי', status: 'approved', description: 'גרם נזק לרכב ממשלתי בעת חניה. נזק מוערך 3,200 ש"ח.', location: 'חניון הבסיס', severity: 'high', fine: 3200, points: 7, deliveryMethod: 'hand', deliveryDate: '2026-07-22', createdAt: '2026-07-22T15:45:00Z', updatedAt: '2026-07-22T17:30:00Z' },
    { id: 'r009', reportNumber: 'DR-001242', reportType: 'bidtz', date: '2026-07-23', time: '09:00', baseId: 'b100', unitId: 'u01', officerId: 'u_officer1', officerName: 'יונתן שמחון', personId: 'p009', offenseId: 'o002', offenseTitle: 'התנהגות בלתי הולמת', status: 'pending', description: 'דיברה בחוצפה למפקדה הישיר בפני מספר חיילים.', location: 'משרד הפלוגה', severity: 'low', fine: 200, points: 3, deliveryMethod: 'hand', deliveryDate: '2026-07-23', createdAt: '2026-07-23T09:00:00Z', updatedAt: '2026-07-23T09:00:00Z' },
    { id: 'r010', reportNumber: 'DR-001243', reportType: 'dmash', date: '2026-07-24', time: '11:30', baseId: 'b100', unitId: 'u02', officerId: 'u_hamal1', officerName: 'גדעון אברהם', personId: 'p010', offenseId: 'o006', offenseTitle: 'מהירות מופרזת', status: 'approved', description: 'נסע במהירות 95 קמ"ש באזור המוגבל ל-60 קמ"ש.', location: 'כביש פנים-בסיסי', severity: 'high', fine: 750, points: 6, deliveryMethod: 'hand', deliveryDate: '2026-07-24', createdAt: '2026-07-24T11:30:00Z', updatedAt: '2026-07-24T13:45:00Z' },
    { id: 'r011', reportNumber: 'DR-001244', reportType: 'dmash', date: '2026-07-25', time: '08:00', baseId: 'b302', unitId: 'u01', officerId: 'u_officer1', officerName: 'יונתן שמחון', personId: 'p011', offenseId: 'o016', offenseTitle: 'עריקות', status: 'approved', description: 'נעדר מהיחידה ללא רשות לתקופה של 45 יום.', location: 'בסיס 302', severity: 'critical', fine: 0, points: 30, deliveryMethod: 'hand', deliveryDate: '2026-07-25', createdAt: '2026-07-25T08:00:00Z', updatedAt: '2026-07-25T12:00:00Z' },
    { id: 'r012', reportNumber: 'DR-001245', reportType: 'dmash', date: '2026-07-26', time: '14:00', baseId: 'b100', unitId: 'u01', officerId: 'u_commander1', officerName: 'נועה כרמלי', personId: 'p012', offenseId: 'o009', offenseTitle: 'תקיפה בדרגה קלה', status: 'draft', description: 'ויכוח שהסתיים בדחיפה. עדים נוכחים.', location: 'חדר הלינה', severity: 'high', fine: 0, points: 10, deliveryMethod: 'hand', deliveryDate: null, createdAt: '2026-07-26T14:00:00Z', updatedAt: '2026-07-26T14:00:00Z' },
    { id: 'r013', reportNumber: 'DR-001246', reportType: 'bidtz', date: '2026-07-27', time: '10:30', baseId: 'b100', unitId: 'u03', officerId: 'u_officer1', officerName: 'יונתן שמחון', personId: 'p013', offenseId: 'o015', offenseTitle: 'שימוש בסמים', status: 'approved', description: 'נמצאה עם חומרים אסורים בחיפוש שגרתי.', location: 'חדר הלינה', severity: 'critical', fine: 0, points: 20, deliveryMethod: 'hand', deliveryDate: '2026-07-27', createdAt: '2026-07-27T10:30:00Z', updatedAt: '2026-07-27T16:00:00Z' },
    { id: 'r014', reportNumber: 'DR-001247', reportType: 'dmash', date: '2026-07-28', time: '16:45', baseId: 'b100', unitId: 'u01', officerId: 'u_hamal1', officerName: 'גדעון אברהם', personId: 'p014', offenseId: 'o018', offenseTitle: 'הפרת ביטחון שדה', status: 'pending', description: 'גילה מידע על פעולה מתוכננת לאדם לא מורשה.', location: 'שדה', severity: 'high', fine: 0, points: 10, deliveryMethod: 'hand', deliveryDate: '2026-07-28', createdAt: '2026-07-28T16:45:00Z', updatedAt: '2026-07-28T16:45:00Z' },
    { id: 'r015', reportNumber: 'DR-001248', reportType: 'dmash', date: '2026-07-29', time: '09:15', baseId: 'b708', unitId: 'u04', officerId: 'u_investigator1', officerName: 'שרה לוינסון', personId: 'p015', offenseId: 'o017', offenseTitle: 'השתמטות', status: 'approved', description: 'הציגה מסמכים רפואיים מזויפים להשתמטות משירות.', location: 'בסיס 708', severity: 'high', fine: 0, points: 15, deliveryMethod: 'hand', deliveryDate: '2026-07-29', createdAt: '2026-07-29T09:15:00Z', updatedAt: '2026-07-29T14:00:00Z' },
    { id: 'r016', reportNumber: 'DR-001249', reportType: 'dmash', date: '2026-07-30', time: '13:00', baseId: 'b100', unitId: 'u02', officerId: 'u_officer1', officerName: 'יונתן שמחון', personId: 'p016', offenseId: 'o001', offenseTitle: 'עדר מהיחידה ללא רשות', status: 'approved', description: 'נעדר לפני שהוכרז כעריק. נמצא אצל משפחה.', location: 'ביתו', severity: 'medium', fine: 0, points: 6, deliveryMethod: 'hand', deliveryDate: '2026-07-30', createdAt: '2026-07-30T13:00:00Z', updatedAt: '2026-07-30T13:00:00Z' },
    { id: 'r017', reportNumber: 'DR-001250', reportType: 'bidtz', date: '2026-07-31', time: '07:30', baseId: 'b302', unitId: 'u01', officerId: 'u_commander1', officerName: 'נועה כרמלי', personId: 'p019', offenseId: 'o013', offenseTitle: 'גניבה', status: 'pending', description: 'נחשד בגניבת ציוד מחסן הציוד.', location: 'מחסן ציוד', severity: 'critical', fine: 0, points: 15, deliveryMethod: 'hand', deliveryDate: null, createdAt: '2026-07-31T07:30:00Z', updatedAt: '2026-07-31T07:30:00Z' },
    { id: 'r018', reportNumber: 'DR-001251', reportType: 'dmash', date: '2026-08-01', time: '11:00', baseId: 'b100', unitId: 'u01', officerId: 'u_officer1', officerName: 'יונתן שמחון', personId: 'p020', offenseId: 'o002', offenseTitle: 'התנהגות בלתי הולמת', status: 'draft', description: 'התנהגות לא ראויה בחדר האוכל.', location: 'חדר אוכל', severity: 'low', fine: 200, points: 3, deliveryMethod: 'hand', deliveryDate: null, createdAt: '2026-08-01T11:00:00Z', updatedAt: '2026-08-01T11:00:00Z' },
    { id: 'r019', reportNumber: 'DR-001252', reportType: 'dmash', date: '2026-08-02', time: '15:00', baseId: 'b100', unitId: 'u10', officerId: 'u_hamal1', officerName: 'גדעון אברהם', personId: 'p001', offenseId: 'o004', offenseTitle: 'אי הופעה לתורנות', status: 'approved', description: 'לא הגיע לתורנות חמ"ל שנקבעה.', location: 'חמ"ל', severity: 'medium', fine: 0, points: 5, deliveryMethod: 'hand', deliveryDate: '2026-08-02', createdAt: '2026-08-02T15:00:00Z', updatedAt: '2026-08-02T16:30:00Z' },
    { id: 'r020', reportNumber: 'DR-001253', reportType: 'bidtz', date: '2026-08-03', time: '10:00', baseId: 'b416', unitId: 'u01', officerId: 'u_commander1', officerName: 'נועה כרמלי', personId: 'p017', offenseId: 'o016', offenseTitle: 'עריקות', status: 'approved', description: 'נעדר מהיחידה כ-62 יום ללא הרשאה.', location: 'בסיס 416', severity: 'critical', fine: 0, points: 30, deliveryMethod: 'hand', deliveryDate: '2026-08-03', createdAt: '2026-08-03T10:00:00Z', updatedAt: '2026-08-03T10:00:00Z' },
  ];

  /* ===== DESERTER FILES ===== */
  const DESERTER_FILES = [
    { id: 'df001', personId: 'p016', type: 'deserter', status: 'active', openDate: '2026-06-01', startDate: '2026-06-01', daysAbsent: 65, baseId: 'b100', investigatorId: 'u_investigator1', investigatorName: 'שרה לוינסון', riskLevel: 'high', requiresArrest: true, escapedArrest: false, haredi: false, selfRisk: false, requiresCommanderApproval: true, createdAt: '2026-06-01T08:00:00Z' },
    { id: 'df002', personId: 'p017', type: 'deserter', status: 'active', openDate: '2026-05-15', startDate: '2026-05-15', daysAbsent: 82, baseId: 'b100', investigatorId: 'u_investigator1', investigatorName: 'שרה לוינסון', riskLevel: 'critical', requiresArrest: true, escapedArrest: true, haredi: false, selfRisk: true, requiresCommanderApproval: true, createdAt: '2026-05-15T08:00:00Z' },
    { id: 'df003', personId: 'p018', type: 'deserter', status: 'located', openDate: '2026-07-01', startDate: '2026-07-01', daysAbsent: 35, baseId: 'b302', investigatorId: 'u_investigator1', investigatorName: 'שרה לוינסון', riskLevel: 'medium', requiresArrest: false, escapedArrest: false, haredi: false, selfRisk: false, requiresCommanderApproval: false, createdAt: '2026-07-01T08:00:00Z' },
    { id: 'df004', personId: 'p001', type: 'shirker', status: 'closed', openDate: '2026-01-10', startDate: '2026-01-10', endDate: '2026-02-15', daysAbsent: 36, baseId: 'b100', investigatorId: 'u_investigator1', investigatorName: 'שרה לוינסון', riskLevel: 'low', requiresArrest: false, escapedArrest: false, haredi: false, selfRisk: false, requiresCommanderApproval: false, closureReason: 'חזר לשירות', createdAt: '2026-01-10T08:00:00Z' },
    { id: 'df005', personId: 'p002', type: 'deserter', status: 'arrested', openDate: '2026-04-01', startDate: '2026-04-01', endDate: '2026-05-20', daysAbsent: 49, baseId: 'b100', investigatorId: 'u_investigator1', investigatorName: 'שרה לוינסון', riskLevel: 'high', requiresArrest: true, escapedArrest: false, haredi: false, selfRisk: false, requiresCommanderApproval: true, createdAt: '2026-04-01T08:00:00Z' },
    { id: 'df006', personId: 'p019', type: 'shirker', status: 'active', openDate: '2026-07-20', startDate: '2026-07-20', daysAbsent: 16, baseId: 'b708', investigatorId: 'u_investigator1', investigatorName: 'שרה לוינסון', riskLevel: 'low', requiresArrest: false, escapedArrest: false, haredi: true, selfRisk: false, requiresCommanderApproval: false, createdAt: '2026-07-20T08:00:00Z' },
    { id: 'df007', personId: 'p020', type: 'deserter', status: 'returned', openDate: '2026-03-01', startDate: '2026-03-01', endDate: '2026-04-10', daysAbsent: 40, baseId: 'b100', investigatorId: 'u_investigator1', investigatorName: 'שרה לוינסון', riskLevel: 'medium', requiresArrest: false, escapedArrest: false, haredi: false, selfRisk: false, requiresCommanderApproval: false, closureReason: 'חזר מרצון', createdAt: '2026-03-01T08:00:00Z' },
    { id: 'df008', personId: 'p003', type: 'shirker', status: 'active', openDate: '2026-07-25', startDate: '2026-07-25', daysAbsent: 11, baseId: 'b100', investigatorId: 'u_investigator1', investigatorName: 'שרה לוינסון', riskLevel: 'low', requiresArrest: false, escapedArrest: false, haredi: false, selfRisk: false, requiresCommanderApproval: false, createdAt: '2026-07-25T08:00:00Z' },
  ];

  DESERTER_FILES.forEach((f, i) => { if (!f.fileNumber) f.fileNumber = 'ED-' + String(60001 + i).padStart(6, '0'); });

  /* ===== PRISONER FILES ===== */
  const PRISONER_FILES = [
    { id: 'pf001', personId: 'p011', prisonerType: 'חבוש', intakeDate: '2026-06-01', intakeTime: '10:00', baseId: 'b100', status: 'active', location: 'אגף א׳', expectedRelease: '2026-08-30', riskLevel: 'low', sentence: 45, servedDays: 28, company: 'פלוגה א׳', offense: 'עריקות', supervisorId: 'u_guard1', supervisorName: 'איתי דיין', haredi: false, vegetarian: false, kosher: false, allergies: false, medical: false, supervision: false, privacyDeclaration: false, notes: 'שיתופי פעולה טוב', createdAt: '2026-06-01T10:00:00Z' },
    { id: 'pf002', personId: 'p012', prisonerType: 'עצור', intakeDate: '2026-07-01', intakeTime: '14:30', baseId: 'b100', status: 'active', location: 'אגף ב׳', expectedRelease: '2026-09-01', riskLevel: 'medium', sentence: 62, servedDays: 35, company: 'פלוגה א׳', offense: 'תקיפה', supervisorId: 'u_guard1', supervisorName: 'איתי דיין', haredi: false, vegetarian: true, kosher: false, allergies: true, medical: false, supervision: true, privacyDeclaration: false, notes: 'דורש השגחה', createdAt: '2026-07-01T14:30:00Z' },
    { id: 'pf003', personId: 'p013', prisonerType: 'חבוש', intakeDate: '2026-07-10', intakeTime: '09:00', baseId: 'b100', status: 'active', location: 'אגף ג׳', expectedRelease: '2026-08-10', riskLevel: 'high', sentence: 31, servedDays: 26, company: 'פלוגה ב׳', offense: 'שימוש בסמים', supervisorId: 'u_incarceration_admin1', supervisorName: 'רונן פרידמן', haredi: false, vegetarian: false, kosher: true, allergies: false, medical: true, supervision: true, privacyDeclaration: true, notes: 'מגבלת פרטיות', createdAt: '2026-07-10T09:00:00Z' },
    { id: 'pf004', personId: 'p014', prisonerType: 'אסיר', intakeDate: '2026-05-15', intakeTime: '11:00', baseId: 'b100', status: 'active', location: 'אגף א׳', expectedRelease: '2026-11-15', riskLevel: 'high', sentence: 184, servedDays: 82, company: 'פלוגה ב׳', offense: 'הפרת ביטחון שדה', supervisorId: 'u_guard1', supervisorName: 'איתי דיין', haredi: false, vegetarian: false, kosher: false, allergies: false, medical: false, supervision: false, privacyDeclaration: false, notes: '', createdAt: '2026-05-15T11:00:00Z' },
    { id: 'pf005', personId: 'p015', prisonerType: 'עצור', intakeDate: '2026-07-20', intakeTime: '08:00', baseId: 'b100', status: 'active', location: 'קבלה', expectedRelease: '2026-08-20', riskLevel: 'medium', sentence: 31, servedDays: 16, company: 'פלוגה א׳', offense: 'השתמטות', supervisorId: 'u_guard1', supervisorName: 'איתי דיין', haredi: false, vegetarian: false, kosher: false, allergies: false, medical: false, supervision: false, privacyDeclaration: false, notes: 'אשפוז קצר בינתיים', createdAt: '2026-07-20T08:00:00Z' },
    { id: 'pf006', personId: 'p001', prisonerType: 'על״מ', intakeDate: '2026-04-01', intakeTime: '12:00', baseId: 'b302', status: 'released', location: 'שוחרר', expectedRelease: '2026-05-01', riskLevel: 'low', sentence: 30, servedDays: 30, company: 'פלוגה ג׳', offense: 'אי ציות', supervisorId: 'u_guard1', supervisorName: 'איתי דיין', haredi: false, vegetarian: false, kosher: false, allergies: false, medical: false, supervision: false, privacyDeclaration: false, notes: 'שוחרר בתאריך', createdAt: '2026-04-01T12:00:00Z' },
    { id: 'pf007', personId: 'p019', prisonerType: 'חבוש', intakeDate: '2026-08-01', intakeTime: '10:00', baseId: 'b100', status: 'active', location: 'אגף ג׳', expectedRelease: '2026-08-21', riskLevel: 'low', sentence: 20, servedDays: 4, company: 'פלוגה ג׳', offense: 'גניבה', supervisorId: 'u_guard1', supervisorName: 'איתי דיין', haredi: true, vegetarian: false, kosher: true, allergies: false, medical: false, supervision: false, privacyDeclaration: false, notes: 'מוסלם דתי', createdAt: '2026-08-01T10:00:00Z' },
    { id: 'pf008', personId: 'p020', prisonerType: 'עצור', intakeDate: '2026-07-28', intakeTime: '16:00', baseId: 'b100', status: 'active', location: 'אגף א׳', expectedRelease: '2026-08-27', riskLevel: 'low', sentence: 30, servedDays: 8, company: 'פלוגה ד׳', offense: 'עריקות', supervisorId: 'u_incarceration_admin1', supervisorName: 'רונן פרידמן', haredi: false, vegetarian: false, kosher: false, allergies: false, medical: false, supervision: false, privacyDeclaration: false, notes: '', createdAt: '2026-07-28T16:00:00Z' },
    { id: 'pf009', personId: 'p006', prisonerType: 'אסיר', intakeDate: '2026-03-01', intakeTime: '09:00', baseId: 'b100', status: 'transferred', location: 'הועבר', expectedRelease: '2026-09-01', riskLevel: 'medium', sentence: 184, servedDays: 157, company: 'פלוגה ב׳', offense: 'שכרות', supervisorId: 'u_guard1', supervisorName: 'איתי דיין', haredi: false, vegetarian: false, kosher: false, allergies: true, medical: false, supervision: false, privacyDeclaration: false, notes: 'הועבר לבסיס 416', createdAt: '2026-03-01T09:00:00Z' },
    { id: 'pf010', personId: 'p004', prisonerType: 'שב״ס', intakeDate: '2026-06-15', intakeTime: '11:00', baseId: 'b100', status: 'active', location: 'אגף א׳', expectedRelease: '2026-12-15', riskLevel: 'high', sentence: 183, servedDays: 51, company: 'פלוגה א׳', offense: 'אי ציות', supervisorId: 'u_incarceration_admin1', supervisorName: 'רונן פרידמן', haredi: false, vegetarian: false, kosher: false, allergies: false, medical: true, supervision: true, privacyDeclaration: false, notes: 'עבר ריב עם כלואים אחרים', createdAt: '2026-06-15T11:00:00Z' },
  ];

  /* ===== SERVICE WORK FILES ===== */
  const SERVICE_WORK_FILES = [
    { id: 'sw001', personId: 'p002', militaryNumber: '2345678', rank: 'turai', serviceType: 'conscript', employingUnit: 'u01', supervisorId: 'u_commander1', supervisorName: 'נועה כרמלי', sentenceStart: '2026-07-01', sentenceEnd: '2026-07-31', sentence: 30, status: 'active', attendance: 87, previousUnit: 'u02', baseId: 'b100', offense: 'אי ציות', createdAt: '2026-07-01T08:00:00Z' },
    { id: 'sw002', personId: 'p003', militaryNumber: '3456789', rank: 'turai', serviceType: 'conscript', employingUnit: 'u02', supervisorId: 'u_officer1', supervisorName: 'יונתן שמחון', sentenceStart: '2026-06-15', sentenceEnd: '2026-07-15', sentence: 30, status: 'completed', attendance: 95, previousUnit: 'u03', baseId: 'b100', offense: 'התנהגות בלתי הולמת', createdAt: '2026-06-15T08:00:00Z' },
    { id: 'sw003', personId: 'p005', militaryNumber: '5678901', rank: 'turai', serviceType: 'conscript', employingUnit: 'u01', supervisorId: 'u_hamal1', supervisorName: 'גדעון אברהם', sentenceStart: '2026-08-01', sentenceEnd: '2026-08-21', sentence: 21, status: 'active', attendance: 100, previousUnit: 'u02', baseId: 'b100', offense: 'עדר ללא רשות', createdAt: '2026-08-01T08:00:00Z' },
    { id: 'sw004', personId: 'p007', militaryNumber: '7890123', rank: 'sammal', serviceType: 'conscript', employingUnit: 'u05', supervisorId: 'u_investigator1', supervisorName: 'שרה לוינסון', sentenceStart: '2026-07-10', sentenceEnd: '2026-08-10', sentence: 31, status: 'active', attendance: 78, previousUnit: 'u01', baseId: 'b708', offense: 'אי הופעה לתורנות', createdAt: '2026-07-10T08:00:00Z' },
    { id: 'sw005', personId: 'p009', militaryNumber: '9012345', rank: 'turai', serviceType: 'conscript', employingUnit: 'u01', supervisorId: 'u_officer1', supervisorName: 'יונתן שמחון', sentenceStart: '2026-07-20', sentenceEnd: '2026-08-04', sentence: 15, status: 'active', attendance: 93, previousUnit: 'u03', baseId: 'b100', offense: 'התנהגות בלתי הולמת', createdAt: '2026-07-20T08:00:00Z' },
  ];

  /* ===== TASKS ===== */
  const TASKS = [];
  const taskNames = ['סיור לילי — קו הגבול', 'מחסום בדיקה — כניסה צפונית', 'אבטחת אירוע פיקודי', 'ליווי שיירה לוגיסטית', 'מעצר חשוד', 'פעולת בילוש', 'תגבור נקודת סיור', 'ספירת כלואים — שחרור', 'בדיקת ציוד שגרתית', 'אימון כוחות', 'בניית יחס כוחות', 'מחסום נייד', 'ביקור פיקוד', 'פגישת תיאום', 'סיור יממה'];
  for (let i = 0; i < 15; i++) {
    const taskDate = new Date('2026-08-01');
    taskDate.setDate(taskDate.getDate() + i - 5);
    const statuses = ['draft', 'planned', 'approved', 'in_progress', 'completed', 'cancelled'];
    const priorities = ['low', 'medium', 'high', 'critical'];
    TASKS.push({
      id: 't' + String(i + 1).padStart(3, '0'),
      taskNumber: 'T-' + String(10000 + i + 1),
      name: taskNames[i],
      date: taskDate.toISOString().split('T')[0],
      startTime: '08:' + Utils.pad(i * 4 % 60),
      endTime: '14:' + Utils.pad(i * 4 % 60),
      activityType: TASK_ACTIVITY_TYPES[i % TASK_ACTIVITY_TYPES.length].id,
      activityTypeLabel: TASK_ACTIVITY_TYPES[i % TASK_ACTIVITY_TYPES.length].label,
      location: ['בסיס 100', 'כביש 4', 'שכונת מגורים', 'מחסום צפוני', 'נקודת תצפית'][i % 5],
      commanderId: 'u_commander1',
      commanderName: 'נועה כרמלי',
      baseId: 'b100',
      status: statuses[i % statuses.length],
      priority: priorities[i % priorities.length],
      description: 'משימה מס\' ' + (i + 1) + ' — ' + taskNames[i],
      approvalRequired: i % 3 === 0,
      participantCount: Math.floor(Math.random() * 8) + 2,
      createdAt: new Date('2026-07-20T08:00:00Z').toISOString(),
    });
  }

  /* ===== HAMAL ENTRIES ===== */
  const HAMAL_ENTRIES = [];
  const hamalDescs = [
    'דיווח על כניסת רכב לאזור מוגבל', 'אזעקה בנקודת תצפית', 'ליווי שיירה יצאה לשדה', 'בדיקת ציוד אלחוטי', 'כניסת אורחים לבסיס', 'תקלה במצלמות אבטחה', 'דיווח מסיור', 'החלפת משמרת', 'ניטור חריג בתדרים', 'תיאום עם כוח חיצוני'
  ];
  for (let i = 0; i < 20; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setMinutes(Math.floor(i * 72));
    HAMAL_ENTRIES.push({
      id: 'hml' + String(i + 1).padStart(3, '0'),
      sequenceNumber: 1000 + i + 1,
      date: d.toISOString().split('T')[0],
      time: Utils.pad(d.getHours()) + ':' + Utils.pad(d.getMinutes()),
      actionType: ['entry', 'exit', 'alert', 'routine'][i % 4],
      category: ['intervention', 'escort', 'policing', 'coordination', 'report', 'malfunction'][i % 6],
      title: hamalDescs[i % hamalDescs.length],
      description: 'פירוט: ' + hamalDescs[i % hamalDescs.length] + '. טופל על ידי המשמרת.',
      userId: 'u_hamal1',
      userName: 'גדעון אברהם',
      baseId: 'b100',
      status: i % 5 === 0 ? 'resolved' : 'open',
      createdAt: d.toISOString(),
    });
  }

  /* ===== INMATE ACTIVITIES ===== */
  const INMATE_ACTIVITIES = [];
  const actTypes = INMATE_ACTIVITY_TYPES;
  const prisonerIds = ['pf001', 'pf002', 'pf003', 'pf004', 'pf005', 'pf007', 'pf008', 'pf010'];
  const personIds = ['p011', 'p012', 'p013', 'p014', 'p015', 'p019', 'p020', 'p004'];
  for (let i = 0; i < 30; i++) {
    const d = new Date('2026-08-04');
    d.setDate(d.getDate() + (i % 7) - 3);
    const pIdx = i % prisonerIds.length;
    INMATE_ACTIVITIES.push({
      id: 'ia' + String(i + 1).padStart(3, '0'),
      prisonerFileId: prisonerIds[pIdx],
      personId: personIds[pIdx],
      date: d.toISOString().split('T')[0],
      activityType: actTypes[i % actTypes.length].id,
      activityTypeLabel: actTypes[i % actTypes.length].label,
      location: INMATE_ACTIVITY_LOCATIONS[i % INMATE_ACTIVITY_LOCATIONS.length],
      plannedDeparture: Utils.pad(8 + (i % 4)) + ':00',
      actualDeparture: i % 4 === 0 ? null : Utils.pad(8 + (i % 4)) + ':' + Utils.pad((i * 3) % 60),
      plannedReturn: Utils.pad(10 + (i % 4)) + ':00',
      actualReturn: i % 6 === 0 ? null : Utils.pad(10 + (i % 4)) + ':' + Utils.pad((i * 5) % 60),
      escortId: 'u_guard1',
      escortName: 'איתי דיין',
      status: ['planned', 'in_progress', 'completed', 'cancelled'][i % 4],
      notes: i % 5 === 0 ? 'פעילות בוטלה עקב בעיה' : '',
      company: DETENTION_COMPANIES[pIdx % 4],
      baseId: 'b100',
      createdAt: d.toISOString(),
    });
  }

  /* ===== EVENT REPORTS ===== */
  const EVENT_REPORTS = [];
  const eventTitles = [
    'ויכוח בין כלואים', 'ניסיון בריחה', 'שבירת רכוש', 'שב"ח מסרב לאוכל', 'פגיעה עצמית', 'כניסת חפץ אסור', 'ויכוח עם סוהר', 'אירוע בחדר אוכל', 'בעיה רפואית', 'איום', 'שיעורי ביטחון', 'הפרעה כללית', 'ביקור לא מורשה', 'גניבה מחדר', 'קטטה'
  ];
  for (let i = 0; i < 15; i++) {
    const d = new Date('2026-07-20');
    d.setDate(d.getDate() + i);
    const pIdx = i % prisonerIds.length;
    EVENT_REPORTS.push({
      id: 'er' + String(i + 1).padStart(3, '0'),
      sequenceNumber: 2000 + i + 1,
      reportType: i % 3 === 0 ? 'external' : 'internal',
      senderId: i % 2 === 0 ? 'u_guard1' : 'u_incarceration_admin1',
      senderName: i % 2 === 0 ? 'איתי דיין' : 'רונן פרידמן',
      receiverId: 'u_commander1',
      receiverName: 'נועה כרמלי',
      personId: personIds[pIdx],
      prisonerFileId: prisonerIds[pIdx],
      eventDate: d.toISOString().split('T')[0],
      eventTime: Utils.pad(8 + (i % 12)) + ':' + Utils.pad((i * 7) % 60),
      reportTime: Utils.pad(9 + (i % 11)) + ':' + Utils.pad((i * 11) % 60),
      title: eventTitles[i % eventTitles.length],
      description: 'פירוט אירוע: ' + eventTitles[i % eventTitles.length] + '. אירע ב' + PRISONER_LOCATIONS[i % PRISONER_LOCATIONS.length] + '.',
      location: PRISONER_LOCATIONS[i % PRISONER_LOCATIONS.length],
      detentionReason: DETENTION_REASONS[i % DETENTION_REASONS.length],
      personsPresent: ['איתי דיין', 'רונן פרידמן'].slice(0, (i % 2) + 1).join(', '),
      commanderInstructions: i % 4 === 0 ? 'לטפל בדחיפות ולדווח בתוך 24 שעות' : 'לפקוח עין',
      delivered: i % 3 !== 2,
      signer: i % 3 !== 2 ? 'נועה כרמלי' : '',
      handlingStatus: i % 5 === 0 ? 'unresolved' : 'resolved',
      priority: ['low', 'medium', 'high', 'critical'][i % 4],
      baseId: 'b100',
      createdAt: d.toISOString(),
    });
  }

  /* ===== COUNTING SESSION ===== */
  const COUNTING_SESSION = {
    id: 'cs001',
    date: '2026-08-05',
    shift: 'morning',
    company: 'כל הפלוגות',
    baseId: 'b100',
    status: 'in_progress',
    totalExpected: 8,
    totalCounted: 7,
    completedBy: null,
    createdAt: '2026-08-05T06:00:00Z',
  };

  const COUNTING_ENTRIES = prisonerIds.map((pfId, idx) => ({
    id: 'ce' + String(idx + 1).padStart(3, '0'),
    sessionId: 'cs001',
    prisonerFileId: pfId,
    personId: personIds[idx],
    present: idx < 7,
    morningCount: idx < 7,
    afternoonCount: idx < 5,
    eveningCount: idx < 3,
    nightCount: false,
    location: PRISONER_LOCATIONS[idx % PRISONER_LOCATIONS.length],
    company: DETENTION_COMPANIES[idx % 4],
    notes: idx === 7 ? 'לא נמצא בספירת הבוקר' : '',
    rowStatus: idx === 7 ? 'missing' : 'ok',
  }));

  /* ===== CANTEEN PURCHASES ===== */
  const PRODUCTS = [
    { code: 'P001', name: 'מים מינרלים 1.5L', price: 4.50, category: 'drinks', returnable: false },
    { code: 'P002', name: 'קולה 0.5L', price: 7.00, category: 'drinks', returnable: false },
    { code: 'P003', name: 'לחם אחיד', price: 9.00, category: 'food', returnable: false },
    { code: 'P004', name: 'שמפו', price: 18.00, category: 'hygiene', returnable: true },
    { code: 'P005', name: 'גרביים (זוג)', price: 12.00, category: 'clothing', returnable: true },
    { code: 'P006', name: 'עט כחול', price: 3.50, category: 'stationery', returnable: false },
    { code: 'P007', name: 'ביסקוויטים', price: 5.00, category: 'food', returnable: false },
    { code: 'P008', name: 'אוזניות', price: 45.00, category: 'electronics', returnable: true },
    { code: 'P009', name: 'סבון', price: 8.00, category: 'hygiene', returnable: false },
    { code: 'P010', name: 'גזית מטעמים', price: 6.00, category: 'food', returnable: false },
  ];

  const CANTEEN_PURCHASES = [];
  const CANTEEN_PURCHASE_ITEMS = [];
  const buyerIds = personIds.slice(0, 6);
  const buyerPeople = buyerIds.map((_, i) => ({
    militaryNumber: PEOPLE[i + 10]?.militaryNumber || '1111111',
    name: (PEOPLE[i + 10]?.firstName || 'א') + ' ' + (PEOPLE[i + 10]?.lastName || 'ב')
  }));

  for (let i = 0; i < 20; i++) {
    const d = new Date('2026-07-20');
    d.setDate(d.getDate() + i);
    const buyIdx = i % buyerIds.length;
    const purchaseId = 'cp' + String(i + 1).padStart(3, '0');
    const itemCount = (i % 3) + 1;
    let total = 0;
    const items = [];

    for (let j = 0; j < itemCount; j++) {
      const product = PRODUCTS[(i + j) % PRODUCTS.length];
      const qty = (j % 3) + 1;
      const discount = j === 0 && i % 5 === 0 ? 10 : 0;
      const lineTotal = (product.price * qty) * (1 - discount / 100);
      total += lineTotal;
      const itemId = purchaseId + '_item' + j;
      CANTEEN_PURCHASE_ITEMS.push({
        id: itemId,
        purchaseId,
        productCode: product.code,
        productName: product.name,
        unitPrice: product.price,
        quantity: qty,
        discount,
        total: lineTotal,
        returnable: product.returnable,
        returnedQuantity: 0,
      });
      items.push(itemId);
    }

    CANTEEN_PURCHASES.push({
      id: purchaseId,
      purchaseNumber: 'CAN-' + String(5000 + i + 1),
      baseId: 'b100',
      canteenId: 'u08',
      canteenName: 'קנטינה ראשית',
      date: d.toISOString().split('T')[0],
      time: Utils.pad(9 + (i % 6)) + ':' + Utils.pad((i * 7) % 60),
      customerId: buyerIds[buyIdx],
      customerMilitaryNumber: buyerPeople[buyIdx].militaryNumber,
      customerName: buyerPeople[buyIdx].name,
      sellerId: 'u_canteen1',
      sellerName: 'מיכל ברק',
      itemCount: itemCount,
      total: Math.round(total * 100) / 100,
      status: i % 6 === 5 ? 'returned' : 'completed',
      items,
      createdAt: d.toISOString(),
    });
  }

  /* ===== STOCK MOVEMENTS ===== */
  const STOCK_MOVEMENTS = [];
  const STOCK_MOVEMENT_ITEMS = [];

  for (let i = 0; i < 8; i++) {
    const d = new Date('2026-07-25');
    d.setDate(d.getDate() + i);
    const movId = 'sm' + String(i + 1).padStart(3, '0');
    const statuses = ['draft', 'pending', 'approved', 'rejected', 'completed'];
    const status = statuses[i % statuses.length];
    const itemCount = (i % 3) + 1;
    const items = [];

    for (let j = 0; j < itemCount; j++) {
      const product = PRODUCTS[(i + j + 3) % PRODUCTS.length];
      const smItemId = movId + '_item' + j;
      STOCK_MOVEMENT_ITEMS.push({
        id: smItemId,
        movementId: movId,
        productCode: product.code,
        productName: product.name,
        requestedQty: (j + 1) * 10,
        approvedQty: status === 'approved' || status === 'completed' ? (j + 1) * 10 : null,
        receivedQty: status === 'completed' ? (j + 1) * 10 : null,
        notes: '',
      });
      items.push(smItemId);
    }

    STOCK_MOVEMENTS.push({
      id: movId,
      movementNumber: 'MOV-' + String(3000 + i + 1),
      sourceCanteenId: 'u08',
      sourceCanteenName: 'קנטינה ראשית',
      destCanteenId: 'u09',
      destCanteenName: 'קנטינה משנית',
      movementDate: d.toISOString().split('T')[0],
      creatorId: 'u_canteen1',
      creatorName: 'מיכל ברק',
      status,
      approverId: status === 'approved' || status === 'completed' ? 'u_commander1' : null,
      approverName: status === 'approved' || status === 'completed' ? 'נועה כרמלי' : null,
      approvalDate: status === 'approved' || status === 'completed' ? d.toISOString().split('T')[0] : null,
      rejectionReason: status === 'rejected' ? 'לא אושר על ידי הפיקוד' : null,
      itemCount,
      items,
      createdAt: d.toISOString(),
    });
  }

  /* ===== SURVEILLANCE ACTIVITIES ===== */
  const SURVEILLANCE_ACTIVITIES = [
    { id: 'sa001', number: 'SAV-001', date: '2026-07-25', status: 'completed', baseId: 'b708', commanderId: 'u_investigator1', commanderName: 'שרה לוינסון', riskLevel: 'high', purpose: 'איתור עריק מוצהר', briefingNotes: 'לפעול בזהירות רבה', teamCount: 2, createdAt: '2026-07-25T06:00:00Z' },
    { id: 'sa002', number: 'SAV-002', date: '2026-08-01', status: 'in_progress', baseId: 'b708', commanderId: 'u_investigator1', commanderName: 'שרה לוינסון', riskLevel: 'medium', purpose: 'מעקב אחר חשוד', briefingNotes: 'תיאום עם יחידה ב', teamCount: 1, createdAt: '2026-08-01T07:00:00Z' },
    { id: 'sa003', number: 'SAV-003', date: '2026-08-05', status: 'planned', baseId: 'b708', commanderId: 'u_investigator1', commanderName: 'שרה לוינסון', riskLevel: 'critical', purpose: 'לכידת נחקר ברחובות', briefingNotes: 'לכלול כוח גיבוי', teamCount: 3, createdAt: '2026-08-04T14:00:00Z' },
    { id: 'sa004', number: 'SAV-004', date: '2026-07-10', status: 'approved', baseId: 'b708', commanderId: 'u_investigator1', commanderName: 'שרה לוינסון', riskLevel: 'low', purpose: 'תצפית על כתובת', briefingNotes: 'פעולה שקטה', teamCount: 1, createdAt: '2026-07-10T08:00:00Z' },
    { id: 'sa005', number: 'SAV-005', date: '2026-06-20', status: 'completed', baseId: 'b100', commanderId: 'u_investigator1', commanderName: 'שרה לוינסון', riskLevel: 'medium', purpose: 'מעקב ואיסוף מודיעין', briefingNotes: 'לא לחשוף עצמם', teamCount: 2, createdAt: '2026-06-20T06:00:00Z' },
  ];

  /* ===== NOTIFICATIONS ===== */
  const NOTIFICATIONS = [
    { id: 'n001', type: 'critical', title: 'עריק בסיכון גבוה', description: 'גל בסן נמצא ברמת סיכון קריטית — 82 יום של עריקה', module: 'investigation', linkRoute: '/deserter-file', linkParams: { id: 'df002' }, read: false, timestamp: '2026-08-05T06:00:00Z' },
    { id: 'n002', type: 'warning', title: 'שחרור קרב', description: 'ורד אלון (תיק כליאה) צפויה להשתחרר בעוד 5 ימים', module: 'incarceration', linkRoute: '/prisoner-file', linkParams: { id: 'pf003' }, read: false, timestamp: '2026-08-05T06:10:00Z' },
    { id: 'n003', type: 'warning', title: 'ספירה לא הושלמה', description: 'ספירת הבוקר לא הושלמה — 1 חסר', module: 'incarceration', linkRoute: '/counting-report', read: false, timestamp: '2026-08-05T06:30:00Z' },
    { id: 'n004', type: 'info', title: 'תנועת מלאי ממתינה', description: 'MOV-3003 ממתין לאישור', module: 'canteen', linkRoute: '/canteen-stock-movements', read: false, timestamp: '2026-08-04T14:00:00Z' },
    { id: 'n005', type: 'success', title: 'משימה הושלמה', description: 'משימה T-10005 הושלמה בהצלחה', module: 'policing', linkRoute: '/tasks', read: true, timestamp: '2026-08-03T17:00:00Z' },
    { id: 'n006', type: 'critical', title: 'אירוע חריג לא מטופל', description: 'ויכוח בין כלואים באגף ג׳ — דורש טיפול', module: 'incarceration', linkRoute: '/event-reports', read: false, timestamp: '2026-08-05T07:00:00Z' },
    { id: 'n007', type: 'assignment', title: 'שיבוץ משימה חדשה', description: 'שובצת למשימת סיור ביום 07/08/2026', module: 'policing', linkRoute: '/tasks', read: false, timestamp: '2026-08-04T16:00:00Z' },
    { id: 'n008', type: 'overdue', title: 'משימה באיחור', description: 'משימת T-10002 לא טופלה בזמן', module: 'policing', linkRoute: '/tasks', read: true, timestamp: '2026-08-03T09:00:00Z' },
    { id: 'n009', type: 'info', title: 'עדכון מערכת', description: 'גרסה חדשה של המערכת עלתה לאוויר', module: 'system', read: true, timestamp: '2026-08-01T00:00:00Z' },
    { id: 'n010', type: 'warning', title: 'מלאי נמוך', description: 'גרביים — נותרו 3 יחידות בלבד', module: 'canteen', linkRoute: '/canteen-stock-movements', read: false, timestamp: '2026-08-04T11:00:00Z' },
    { id: 'n011', type: 'approval_required', title: 'דו״ח ממתין לאישור', description: 'דו״ח DR-001235 ממתין לאישורך', module: 'policing', linkRoute: '/officer-report-form', linkParams: { id: 'r002' }, read: false, timestamp: '2026-08-05T08:00:00Z' },
    { id: 'n012', type: 'info', title: 'תיק חדש נפתח', description: 'תיק עריקות חדש נפתח עבור צחי אוחיון', module: 'investigation', linkRoute: '/deserter-file', linkParams: { id: 'df001' }, read: true, timestamp: '2026-08-01T10:00:00Z' },
    { id: 'n013', type: 'critical', title: 'ברח ממעצר', description: 'גל בסן ברח ממעצר — סיכון גבוה מאוד', module: 'investigation', linkRoute: '/deserter-file', linkParams: { id: 'df002' }, read: false, timestamp: '2026-08-05T05:00:00Z' },
    { id: 'n014', type: 'warning', title: 'שחרור קרוב — מחר', description: 'בנימין גולד צפוי להשתחרר מחר — יש לסיים נהלים', module: 'incarceration', linkRoute: '/prisoner-file', linkParams: { id: 'pf001' }, read: false, timestamp: '2026-08-05T06:00:00Z' },
    { id: 'n015', type: 'pending_stock', title: 'אישור תנועת מלאי', description: 'MOV-3001 הוגש לאישור', module: 'canteen', linkRoute: '/canteen-stock-movements', read: true, timestamp: '2026-07-28T14:00:00Z' },
  ];

  /* ===== AUDIT ENTRIES ===== */
  const AUDIT_ENTRIES = [];
  const auditActions = ['create', 'update', 'approve', 'login', 'logout', 'switch_base'];
  const auditModules = ['policing', 'investigation', 'incarceration', 'canteen', 'auth', 'system'];
  for (let i = 0; i < 30; i++) {
    const d = new Date('2026-08-05T08:00:00Z');
    d.setHours(d.getHours() - i * 2);
    AUDIT_ENTRIES.push({
      id: 'ae' + String(i + 1).padStart(3, '0'),
      timestamp: d.toISOString(),
      userId: ['u_admin1', 'u_commander1', 'u_officer1', 'u_investigator1', 'u_guard1'][i % 5],
      userName: ['דוד מנגר', 'נועה כרמלי', 'יונתן שמחון', 'שרה לוינסון', 'איתי דיין'][i % 5],
      userUsername: ['a1000001', 'c2045121', 's9187287', 'i4501128', 'p3182205'][i % 5],
      role: ['מנהל מערכת', 'קצין', 'שוטר', 'חוקר בילוש', 'סוהר'][i % 5],
      baseId: 'b100',
      baseName: 'בסיס 100 — מקמצ״ר',
      module: auditModules[i % auditModules.length],
      entityType: ['policeReport', 'deserterFile', 'prisonerFile', 'canteenPurchase', 'session', 'task'][i % 6],
      entityId: ['r001', 'df001', 'pf001', 'cp001', 'session', 't001'][i % 6],
      action: auditActions[i % auditActions.length],
      description: ['יצירת דו"ח שוטר DR-001234', 'עדכון תיק עריק', 'אישור דו"ח', 'כניסה למערכת', 'יציאה מהמערכת', 'החלפת בסיס'][i % 6],
      previousValue: null,
      newValue: null,
    });
  }

  /* ===== MASHLAT COORDINATIONS ===== */
  /* Today = 2026-08-09 */
  const MASHLAT_COORDINATIONS = [
    /* 3 today — active */
    { id: 'mslt001', coordinationNumber: 'MSLT-000001', personId: 'p002', manualFirstName: 'אבי', manualLastName: 'לוי', manualMilNum: '2345678', rank: 'turai', serviceType: 'conscript', requestedAt: '2026-08-07', coordinationDate: '2026-08-09', coordinationTime: '08:00', destinationPrisonId: 'בסיס 100', coordinatorName: 'סמ"ר יוסי דהן', coordinatorPhone: '050-3001001', sourceUnitName: 'פלוגה א — בסיס 100', offense: 'אי ציות לפקודה', incarcerationDays: 14, medicalNotes: '', generalNotes: '', status: 'today', arrivalConfirmed: false, arrivalConfirmedAt: null, prisonerFileId: null, completedAt: null, archivedAt: null, archiveReason: null, createdAt: '2026-08-07T09:00:00Z' },
    { id: 'mslt002', coordinationNumber: 'MSLT-000002', personId: 'p005', manualFirstName: 'רחל', manualLastName: 'פרץ', manualMilNum: '5678901', rank: 'turai', serviceType: 'conscript', requestedAt: '2026-08-08', coordinationDate: '2026-08-09', coordinationTime: '09:30', destinationPrisonId: 'כלא 6', coordinatorName: 'סגן מיכל גרין', coordinatorPhone: '050-3002002', sourceUnitName: 'פלוגה ב — בסיס 100', offense: 'עדר מהיחידה ללא רשות', incarcerationDays: 7, medicalNotes: 'בעיות גב — לא לשים בתא תחתון', generalNotes: 'לאשר עם מפקד הפלוגה', status: 'today', arrivalConfirmed: false, arrivalConfirmedAt: null, prisonerFileId: null, completedAt: null, archivedAt: null, archiveReason: null, createdAt: '2026-08-08T10:00:00Z' },
    { id: 'mslt003', coordinationNumber: 'MSLT-000003', personId: 'p010', manualFirstName: 'עמוס', manualLastName: 'נחמן', manualMilNum: '0123456', rank: 'seren', serviceType: 'regular', requestedAt: '2026-08-08', coordinationDate: '2026-08-09', coordinationTime: '11:00', destinationPrisonId: 'בסיס 416', coordinatorName: 'רס"ן אלי שטרן', coordinatorPhone: '050-3003003', sourceUnitName: 'מטה — בסיס 100', offense: 'ניצול מעמד לרעה', incarcerationDays: 21, medicalNotes: '', generalNotes: '', status: 'arrived', arrivalConfirmed: true, arrivalConfirmedAt: '2026-08-09T11:15:00Z', prisonerFileId: null, completedAt: null, archivedAt: null, archiveReason: null, createdAt: '2026-08-08T11:30:00Z' },
    /* 2 future */
    { id: 'mslt004', coordinationNumber: 'MSLT-000004', personId: 'p007', manualFirstName: 'טלי', manualLastName: 'שפירא', manualMilNum: '7890123', rank: 'sammal', serviceType: 'conscript', requestedAt: '2026-08-09', coordinationDate: '2026-08-12', coordinationTime: '08:30', destinationPrisonId: 'בסיס 708', coordinatorName: 'סמ"ר יוסי דהן', coordinatorPhone: '050-3001001', sourceUnitName: 'פלוגה ג — בסיס 708', offense: 'אי הופעה לתורנות', incarcerationDays: 5, medicalNotes: '', generalNotes: '', status: 'coordinated', arrivalConfirmed: false, arrivalConfirmedAt: null, prisonerFileId: null, completedAt: null, archivedAt: null, archiveReason: null, createdAt: '2026-08-09T08:00:00Z' },
    { id: 'mslt005', coordinationNumber: 'MSLT-000005', personId: 'p019', manualFirstName: 'עידן', manualLastName: 'בוחניק', manualMilNum: '9999999', rank: 'sammal', serviceType: 'conscript', requestedAt: '2026-08-09', coordinationDate: '2026-08-15', coordinationTime: '10:00', destinationPrisonId: 'כלא 4', coordinatorName: 'סגן מיכל גרין', coordinatorPhone: '050-3002002', sourceUnitName: 'פלוגה ד — בסיס 708', offense: 'שימוש בחומר אסור', incarcerationDays: 28, medicalNotes: '', generalNotes: 'לוודא צו שופט', status: 'coordinated', arrivalConfirmed: false, arrivalConfirmedAt: null, prisonerFileId: null, completedAt: null, archivedAt: null, archiveReason: null, createdAt: '2026-08-09T09:00:00Z' },
    /* 2 completed */
    { id: 'mslt006', coordinationNumber: 'MSLT-000006', personId: 'p011', manualFirstName: 'בנימין', manualLastName: 'גולד', manualMilNum: '1111111', rank: 'turai', serviceType: 'conscript', requestedAt: '2026-07-30', coordinationDate: '2026-08-01', coordinationTime: '09:00', destinationPrisonId: 'בסיס 100', coordinatorName: 'רס"ן אלי שטרן', coordinatorPhone: '050-3003003', sourceUnitName: 'פלוגה א — בסיס 100', offense: 'עריקות קצרה', incarcerationDays: 30, medicalNotes: '', generalNotes: '', status: 'completed', arrivalConfirmed: true, arrivalConfirmedAt: '2026-08-01T09:10:00Z', prisonerFileId: 'pf001', completedAt: '2026-08-01T10:00:00Z', archivedAt: null, archiveReason: null, createdAt: '2026-07-30T08:00:00Z' },
    { id: 'mslt007', coordinationNumber: 'MSLT-000007', personId: 'p003', manualFirstName: 'דנה', manualLastName: 'מזרחי', manualMilNum: '3456789', rank: 'turai', serviceType: 'conscript', requestedAt: '2026-07-25', coordinationDate: '2026-07-28', coordinationTime: '08:00', destinationPrisonId: 'כלא 6', coordinatorName: 'סמ"ר יוסי דהן', coordinatorPhone: '050-3001001', sourceUnitName: 'פלוגה ב — בסיס 100', offense: 'התנהגות בלתי הולמת', incarcerationDays: 10, medicalNotes: '', generalNotes: '', status: 'completed', arrivalConfirmed: true, arrivalConfirmedAt: '2026-07-28T08:20:00Z', prisonerFileId: 'pf003', completedAt: '2026-07-28T09:00:00Z', archivedAt: null, archiveReason: null, createdAt: '2026-07-25T10:00:00Z' },
    /* 2 no-show */
    { id: 'mslt008', coordinationNumber: 'MSLT-000008', personId: 'p016', manualFirstName: 'צחי', manualLastName: 'אוחיון', manualMilNum: '6666666', rank: 'turai', serviceType: 'conscript', requestedAt: '2026-08-04', coordinationDate: '2026-08-06', coordinationTime: '09:00', destinationPrisonId: 'בסיס 302', coordinatorName: 'סמ"ר יוסי דהן', coordinatorPhone: '050-3001001', sourceUnitName: 'פלוגה א — בסיס 100', offense: 'אי ציות חוזר', incarcerationDays: 14, medicalNotes: '', generalNotes: '', status: 'no_show', arrivalConfirmed: false, arrivalConfirmedAt: null, prisonerFileId: null, completedAt: null, archivedAt: '2026-08-07T06:00:00Z', archiveReason: 'לא התייצב במועד', createdAt: '2026-08-04T09:00:00Z' },
    { id: 'mslt009', coordinationNumber: 'MSLT-000009', personId: 'p001', manualFirstName: 'יוסף', manualLastName: 'כהן', manualMilNum: '1234567', rank: 'sammal', serviceType: 'conscript', requestedAt: '2026-08-03', coordinationDate: '2026-08-05', coordinationTime: '10:00', destinationPrisonId: 'כלא 1', coordinatorName: 'סגן מיכל גרין', coordinatorPhone: '050-3002002', sourceUnitName: 'פלוגה א — בסיס 100', offense: 'תקיפת חייל', incarcerationDays: 21, medicalNotes: '', generalNotes: '', status: 'no_show', arrivalConfirmed: false, arrivalConfirmedAt: null, prisonerFileId: null, completedAt: null, archivedAt: '2026-08-06T06:00:00Z', archiveReason: 'לא התייצב במועד', createdAt: '2026-08-03T11:00:00Z' },
    /* 1 rescheduled — old no_show record, new future record */
    { id: 'mslt010', coordinationNumber: 'MSLT-000010', personId: 'p004', manualFirstName: 'משה', manualLastName: 'אברהם', manualMilNum: '4567890', rank: 'sammal_rishon', serviceType: 'regular', requestedAt: '2026-07-29', coordinationDate: '2026-08-02', coordinationTime: '08:00', destinationPrisonId: 'בסיס 416', coordinatorName: 'רס"ן אלי שטרן', coordinatorPhone: '050-3003003', sourceUnitName: 'מטה — בסיס 100', offense: 'שימוש לרעה בציוד', incarcerationDays: 7, medicalNotes: '', generalNotes: '', status: 'no_show', arrivalConfirmed: false, arrivalConfirmedAt: null, prisonerFileId: null, completedAt: null, archivedAt: '2026-08-03T06:00:00Z', archiveReason: 'לא התייצב במועד', createdAt: '2026-07-29T10:00:00Z' },
    { id: 'mslt011', coordinationNumber: 'MSLT-000011', personId: 'p004', manualFirstName: 'משה', manualLastName: 'אברהם', manualMilNum: '4567890', rank: 'sammal_rishon', serviceType: 'regular', requestedAt: '2026-08-09', coordinationDate: '2026-08-16', coordinationTime: '08:00', destinationPrisonId: 'בסיס 416', coordinatorName: 'רס"ן אלי שטרן', coordinatorPhone: '050-3003003', sourceUnitName: 'מטה — בסיס 100', offense: 'שימוש לרעה בציוד', incarcerationDays: 7, medicalNotes: '', generalNotes: 'תיאום מחדש לאחר אי-הגעה — MSLT-000010', status: 'coordinated', arrivalConfirmed: false, arrivalConfirmedAt: null, prisonerFileId: null, completedAt: null, archivedAt: null, archiveReason: null, createdAt: '2026-08-09T10:00:00Z' },
    /* 5 new alert-demo coordinations */
    { id: 'mslt012', coordinationNumber: 'MSLT-000012', personId: 'p002', manualFirstName: 'אבי', manualLastName: 'לוי', manualMilNum: '2345678', rank: 'turai', serviceType: 'conscript', requestedAt: '2026-08-10', coordinationDate: '2026-08-11', coordinationTime: '08:30', destinationPrisonId: 'כלא 6', coordinatorName: 'סמ"ר יוסי דהן', coordinatorPhone: '050-3001001', sourceUnitName: 'פלוגה א — בסיס 100', offense: 'אי ציות לפקודה', incarcerationDays: 14, medicalNotes: '', generalNotes: 'אלרגיה לאגוזים — ראה כ"א', status: 'today', arrivalConfirmed: false, arrivalConfirmedAt: null, prisonerFileId: null, completedAt: null, archivedAt: null, archiveReason: null, createdAt: '2026-08-10T09:00:00Z' },
    { id: 'mslt013', coordinationNumber: 'MSLT-000013', personId: 'p006', manualFirstName: 'נחום', manualLastName: 'ביטון', manualMilNum: '6789012', rank: 'rav_sammal', serviceType: 'regular', requestedAt: '2026-08-10', coordinationDate: '2026-08-11', coordinationTime: '10:00', destinationPrisonId: 'בסיס 100', coordinatorName: 'סגן מיכל גרין', coordinatorPhone: '050-3002002', sourceUnitName: 'פלוגה ד — בסיס 708', offense: 'תקיפת מפקד', incarcerationDays: 21, medicalNotes: 'כאבי גב כרוניים — לא לשים בתא עליון', generalNotes: '', status: 'arrived', arrivalConfirmed: true, arrivalConfirmedAt: '2026-08-11T10:15:00Z', prisonerFileId: null, completedAt: null, archivedAt: null, archiveReason: null, createdAt: '2026-08-10T10:00:00Z' },
    { id: 'mslt014', coordinationNumber: 'MSLT-000014', personId: 'p007', manualFirstName: 'טלי', manualLastName: 'שפירא', manualMilNum: '7890123', rank: 'sammal', serviceType: 'conscript', requestedAt: '2026-08-10', coordinationDate: '2026-08-11', coordinationTime: '13:00', destinationPrisonId: 'כלא 4', coordinatorName: 'רס"ן אלי שטרן', coordinatorPhone: '050-3003003', sourceUnitName: 'פלוגה ג — בסיס 708', offense: 'שימוש בסמים', incarcerationDays: 28, medicalNotes: 'בעיות נפשיות — מעקב רפואי', generalNotes: 'לוודא פגישה עם קצינת רפואה', status: 'today', arrivalConfirmed: false, arrivalConfirmedAt: null, prisonerFileId: null, completedAt: null, archivedAt: null, archiveReason: null, createdAt: '2026-08-10T11:00:00Z' },
    { id: 'mslt015', coordinationNumber: 'MSLT-000015', personId: 'p008', manualFirstName: 'אריאל', manualLastName: 'גורן', manualMilNum: '8901234', rank: 'segen', serviceType: 'regular', requestedAt: '2026-08-11', coordinationDate: '2026-08-14', coordinationTime: '08:00', destinationPrisonId: 'כלא 1', coordinatorName: 'סמ"ר יוסי דהן', coordinatorPhone: '050-3001001', sourceUnitName: 'פלוגה ו — בסיס 100', offense: 'ניסיון בריחה ממשמורת', incarcerationDays: 45, medicalNotes: '', generalNotes: 'רמת מעקב מוגברת — עצור בסיכון בריחה', status: 'coordinated', arrivalConfirmed: false, arrivalConfirmedAt: null, prisonerFileId: null, completedAt: null, archivedAt: null, archiveReason: null, createdAt: '2026-08-11T08:00:00Z' },
    { id: 'mslt016', coordinationNumber: 'MSLT-000016', personId: 'p010', manualFirstName: 'עמוס', manualLastName: 'נחמן', manualMilNum: '0123456', rank: 'seren', serviceType: 'regular', requestedAt: '2026-08-11', coordinationDate: '2026-08-14', coordinationTime: '11:00', destinationPrisonId: 'בסיס 416', coordinatorName: 'רס"ן אלי שטרן', coordinatorPhone: '050-3003003', sourceUnitName: 'מטה — בסיס 100', offense: 'ניצול מעמד לרעה', incarcerationDays: 30, medicalNotes: '', generalNotes: 'כליאה מס׳ 5 — לוחם ותיק', status: 'coordinated', arrivalConfirmed: false, arrivalConfirmedAt: null, prisonerFileId: null, completedAt: null, archivedAt: null, archiveReason: null, createdAt: '2026-08-11T09:00:00Z' },
  ];

  /* ===== SEED FUNCTION ===== */
  function seed() {
    Storage.setCollection(Storage.KEYS.BASES, DEMO_BASES);
    Storage.setCollection(Storage.KEYS.UNITS, DEMO_UNITS);
    Storage.setCollection(Storage.KEYS.PEOPLE, PEOPLE);

    // Seed users from DEMO_USER_DATA
    Storage.setCollection(Storage.KEYS.USERS, DEMO_USER_DATA);

    Storage.setCollection(Storage.KEYS.POLICE_REPORTS, POLICE_REPORTS);
    Storage.setCollection(Storage.KEYS.DESERTER_FILES, DESERTER_FILES);
    Storage.setCollection(Storage.KEYS.PRISONER_FILES, PRISONER_FILES);
    Storage.setCollection(Storage.KEYS.SERVICE_WORK_FILES, SERVICE_WORK_FILES);
    Storage.setCollection(Storage.KEYS.TASKS, TASKS);
    Storage.setCollection(Storage.KEYS.HAMAL_ENTRIES, HAMAL_ENTRIES);
    Storage.setCollection(Storage.KEYS.INMATE_ACTIVITIES, INMATE_ACTIVITIES);
    Storage.setCollection(Storage.KEYS.EVENT_REPORTS, EVENT_REPORTS);
    Storage.setCollection(Storage.KEYS.COUNTING_SESSIONS, [COUNTING_SESSION]);
    Storage.setCollection(Storage.KEYS.COUNTING_ENTRIES, COUNTING_ENTRIES);
    Storage.setCollection(Storage.KEYS.CANTEEN_PURCHASES, CANTEEN_PURCHASES);
    Storage.setCollection(Storage.KEYS.CANTEEN_PURCHASE_ITEMS, CANTEEN_PURCHASE_ITEMS);
    Storage.setCollection(Storage.KEYS.STOCK_MOVEMENTS, STOCK_MOVEMENTS);
    Storage.setCollection(Storage.KEYS.STOCK_MOVEMENT_ITEMS, STOCK_MOVEMENT_ITEMS);
    Storage.setCollection(Storage.KEYS.SURVEILLANCE_ACTIVITIES, SURVEILLANCE_ACTIVITIES);
    Storage.setCollection(Storage.KEYS.NOTIFICATIONS, NOTIFICATIONS);
    Storage.setCollection(Storage.KEYS.AUDIT_ENTRIES, AUDIT_ENTRIES);
    Storage.setCollection(Storage.KEYS.MASHLAT_COORDINATIONS, MASHLAT_COORDINATIONS);

    Storage.markSeeded();
    console.info('[מקמצ״ר] נתוני הדגמה נטענו בהצלחה.');
  }

  function reset() {
    Storage.resetAll();
    seed();
  }

  return { seed, reset, PRODUCTS, PEOPLE, DEMO_BASES, DEMO_UNITS };
})();
