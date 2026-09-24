/* auth.js — demo mode: no authentication required */
'use strict';

/* Central configuration — respected across all modules */
window.APP_CONFIG = {
  demoMode: true,
  authenticationEnabled: false,
  permissionsEnforced: false
};

/* Fixed internal demo user — provides identity for UI, audit log, and record ownership */
window.DEMO_USER = {
  id: 'demo-admin',
  username: 'demo',
  firstName: 'משתמש',
  lastName: 'מערכת',
  role: 'מנהל מערכת',
  primaryBaseId: 'b100',
  rank: 'aluf_mishne',
  unitId: 'u01',
  militaryNumber: '0000000',
};

window.Auth = (function() {

  function getCurrentUser() {
    return window.DEMO_USER;
  }

  function showMainLayout() {
    Utils.show('main-layout');

    AppState.set('currentUser', DEMO_USER);

    const bases = Storage.getCollection(Storage.KEYS.BASES);
    const savedBaseId = Storage.get('maqamtzar_demo_baseId');
    const base = bases.find(b => b.id === savedBaseId) ||
                 bases.find(b => b.id === DEMO_USER.primaryBaseId) ||
                 bases[0];
    AppState.set('currentBase', base || null);
  }

  function switchBase(baseId) {
    const bases = Storage.getCollection(Storage.KEYS.BASES);
    const base = bases.find(b => b.id === baseId);
    if (!base) return false;

    Storage.set('maqamtzar_demo_baseId', baseId);
    AppState.set('currentBase', base);

    if (window.Audit) {
      Audit.log({
        module: 'system',
        entityType: 'base',
        entityId: baseId,
        action: 'switch_base',
        description: `החלפת בסיס ל: ${base.name}`
      });
    }

    if (window.Topbar) Topbar.render();
    Toast.show(`עברת לבסיס ${base.name}`, 'success');
    Router.navigate('/dashboard');
    return true;
  }

  return { getCurrentUser, showMainLayout, switchBase };
})();
