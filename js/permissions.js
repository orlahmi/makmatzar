/* permissions.js — role and permission definitions (demo mode: all permissions granted) */
'use strict';

window.Permissions = (function() {

  const ROLES = {
    OFFICER: 'שוטר',
    COMMANDER: 'קצין',
    INVESTIGATOR: 'חוקר בילוש',
    HAMAL_COMMANDER: 'מפקד חמ״ל',
    GUARD: 'סוהר',
    INCARCERATION_ADMIN: 'מנהל כליאה',
    CANTEEN_WORKER: 'עובד קנטינה',
    SYSTEM_ADMIN: 'מנהל מערכת',
    VIEWER: 'משתמש צפייה בלבד',
  };

  /* Full permission set — kept for documentation of what a production system would enforce */
  const ROLE_PERMISSIONS = {
    [ROLES.SYSTEM_ADMIN]: {
      manageUsers: true, viewAuditLog: true, viewAllModules: true,
      viewPolicing: true, viewInvestigation: true, viewIncarceration: true, viewCanteen: true,
      createReport: true, editReport: true, deleteReport: true, approveReport: true, printReport: true,
      createTask: true, editTask: true, deleteTask: true, approveTask: true,
      createDeserterFile: true, editDeserterFile: true,
      createSurveillance: true, editSurveillance: true, approveSurveillance: true,
      viewPrisonerFile: true, editPrisonerFile: true,
      createEventReport: true, manageCountingReport: true,
      createCanteenPurchase: true, returnCanteenItem: true,
      createStockMovement: true, approveStockMovement: true,
      switchBase: true, resetDemoData: true,
    },
  };

  /* In demo mode all permissions are granted */
  function can(permission) {
    if (!APP_CONFIG.permissionsEnforced) return true;
    const user = Auth.getCurrentUser();
    if (!user) return false;
    const perms = ROLE_PERMISSIONS[user.role] || {};
    return perms[permission] === true || perms.viewAllModules === true;
  }

  function hasModuleAccess(module) {
    if (!APP_CONFIG.permissionsEnforced) return true;
    return true;
  }

  function canViewRoute(path) {
    if (!APP_CONFIG.permissionsEnforced) return true;
    return true;
  }

  /* Nav groups matching original system screenshot exactly */
  function getNavGroups() {
    return [
      {
        id: 'overview',
        label: '',
        icon: 'dashboard',
        hideHeader: true,
        items: [
          { label: 'תמונת מצב', path: '/dashboard', icon: 'dashboard' },
        ]
      },
      {
        id: 'policing',
        label: 'שיטור',
        icon: 'police',
        items: [
          { label: 'דוחות', path: '/reports-table', icon: 'report' },
          { label: 'הוספת דוח חדש', path: '/new-report-full', icon: 'plus' },
          { label: 'ניהול חמ"ל', path: '/hamal-management', icon: 'hamal' },
          { label: 'משימות', path: '/tasks', icon: 'task' },
          { label: 'הוספת משימה חדשה', path: '/add-task', icon: 'plus' },
        ]
      },
      {
        id: 'investigation',
        label: 'בילוש',
        icon: 'detective',
        items: [
          { label: 'אחזור עריק/משתמט', path: '/deserter-retrieval', icon: 'deserter' },
          { label: 'בניית פעילות בילוש', path: '/surveillance-activity-build', icon: 'surveillance' },
        ]
      },
      {
        id: 'incarceration',
        label: 'כליאה',
        icon: 'prison',
        sublabel: 'קנטינה',
        items: [
          { label: 'קניות בקנטינה', path: '/canteen-purchases', icon: 'canteen', sublabel: 'קנטינה' },
          { label: 'תנועות מלאי בין קנטינות', path: '/canteen-stock-movements', icon: 'stock' },
          { label: 'אחזור תיק כלוא', path: '/prisoner-file', icon: 'report' },
          { label: 'גחל"ת עובדי שירות', path: '/service-work-prisoner-file', icon: 'report' },
          { label: 'גחל"ת אבחון', path: '/gachlat', icon: 'report' },
          { label: 'פעילויות', path: '/inmate-activities', icon: 'activity' },
          { label: 'דוחות אירוע', path: '/event-reports', icon: 'event' },
          { label: 'דו"ח ספירות', path: '/counting-report', icon: 'counting' },
          { label: 'משל"ט', path: '/mashlat', icon: 'coordination' },
        ]
      },
    ];
  }

  return {
    ROLES, ROLE_PERMISSIONS,
    can, hasModuleAccess, canViewRoute, getNavGroups
  };
})();
