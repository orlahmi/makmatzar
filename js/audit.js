/* audit.js — audit trail management */
'use strict';

window.Audit = (function() {

  function log(entry) {
    const user = Auth.getCurrentUser();
    const base = AppState.get('currentBase');

    const record = {
      id: Utils.generateId(),
      timestamp: new Date().toISOString(),
      userId: user ? user.id : 'system',
      userName: user ? user.firstName + ' ' + user.lastName : 'מערכת',
      userUsername: user ? user.username : 'system',
      role: user ? user.role : '—',
      baseId: base ? base.id : '—',
      baseName: base ? base.name : '—',
      module: entry.module || 'general',
      entityType: entry.entityType || '—',
      entityId: entry.entityId || '—',
      action: entry.action || '—',
      description: entry.description || '—',
      previousValue: entry.previousValue || null,
      newValue: entry.newValue || null,
    };

    const entries = Storage.getCollection(Storage.KEYS.AUDIT_ENTRIES);
    entries.push(record);
    if (entries.length > 500) entries.splice(0, entries.length - 500);
    Storage.setCollection(Storage.KEYS.AUDIT_ENTRIES, entries);

    return record;
  }

  function getAll(filters) {
    let entries = Storage.getCollection(Storage.KEYS.AUDIT_ENTRIES);

    if (!filters) return entries.reverse();

    if (filters.module) entries = entries.filter(e => e.module === filters.module);
    if (filters.userId) entries = entries.filter(e => e.userId === filters.userId);
    if (filters.action) entries = entries.filter(e => e.action === filters.action);
    if (filters.dateFrom) entries = entries.filter(e => e.timestamp >= filters.dateFrom);
    if (filters.dateTo) entries = entries.filter(e => e.timestamp <= filters.dateTo + 'T23:59:59');
    if (filters.search) {
      const q = filters.search.toLowerCase();
      entries = entries.filter(e =>
        e.description.toLowerCase().includes(q) ||
        e.userName.toLowerCase().includes(q) ||
        e.entityId.toLowerCase().includes(q)
      );
    }

    return entries.reverse();
  }

  const ACTION_LABELS = {
    create: 'יצירה',
    update: 'עדכון',
    delete: 'מחיקה',
    approve: 'אישור',
    reject: 'דחייה',
    cancel: 'ביטול',
    switch_base: 'החלפת בסיס',
    reset_data: 'איפוס נתונים',
    return_item: 'החזרת פריט',
    approve_stock: 'אישור תנועת מלאי',
    update_status: 'עדכון סטטוס',
    lock: 'נעילה',
    unlock: 'פתיחת נעילה',
    export: 'ייצוא',
    print: 'הדפסה',
    view: 'צפייה',
  };

  const MODULE_LABELS = {
    policing: 'שיטור',
    investigation: 'בילוש',
    incarceration: 'כליאה',
    canteen: 'קנטינה',
    system: 'מערכת',
    hamal: 'חמ״ל',
    tasks: 'משימות',
    users: 'משתמשים',
    general: 'כללי',
  };

  return { log, getAll, ACTION_LABELS, MODULE_LABELS };
})();
