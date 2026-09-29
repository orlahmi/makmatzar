/* app.js — application bootstrap (demo mode, no authentication) */
'use strict';

(function() {
  /* Remove any stale authentication data from previous versions */
  function cleanAuthStorage() {
    const authKeys = [
      'maqamtzar_v1_session',
      'maqamtzar_session',
      'maqamtzar_auth',
      'maqamtzar_token',
      'maqamtzar_login',
      'maqamtzar_currentUser',
      'maqamtzar_password',
    ];
    authKeys.forEach(k => {
      try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
    });
  }

  function init() {
    cleanAuthStorage();

    if (!Storage.isSeeded()) {
      DataSeed.seed();
    }

    if (window.Migrations) Migrations.runAll();
    Notifications.load();

    Router.registerAll({
      '/dashboard': Pages.dashboard,
      '/reports-table': Pages['reports-table'],
      '/new-report-full': Pages['new-report-full'],
      '/officer-report-form': Pages['officer-report-form'],
      '/hamal-management': Pages['hamal-management'],
      '/tasks': Pages['tasks'],
      '/add-task': Pages['add-task'],
      '/deserter-retrieval': Pages['deserter-retrieval'],
      '/deserter-file': Pages['deserter-file'],
      '/surveillance-activity-build': Pages['surveillance-activity-build'],
      '/prisoner-file': Pages['prisoner-file'],
      '/service-work-prisoner-file': Pages['service-work-prisoner-file'],
      '/inmate-activities': Pages['inmate-activities'],
      '/event-reports': Pages['event-reports'],
      '/counting-report': Pages['counting-report'],
      '/canteen-purchases': Pages['canteen-purchases'],
      '/canteen-stock-movements': Pages['canteen-stock-movements'],
      '/audit-log': Pages['audit-log'],
      '/users-management': Pages['users-management'],
      '/notifications-center': Pages['notifications-center'],
      '/mashlat':         Pages['mashlat'],
      '/task-dashboard':  Pages['task-dashboard'],
      '/gachlat':         Pages['gachlat'],
    });

    Router.onNotFound(() => Pages['not-found']());

    /* Always open directly into the main layout — no login required */
    Auth.showMainLayout();
    Sidebar.render();
    /* Topbar only renders for /officer-report-form — managed per-route */
    Router.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
