/* notifications.js — notification system */
'use strict';

window.Notifications = (function() {

  const TYPES = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical',
    SUCCESS: 'success',
    ASSIGNMENT: 'assignment',
    APPROVAL_REQUIRED: 'approval_required',
    OVERDUE: 'overdue',
    RELEASE_APPROACHING: 'release_approaching',
    UNRESOLVED_EVENT: 'unresolved_event',
    COUNTING_INCOMPLETE: 'counting_incomplete',
    LOW_STOCK: 'low_stock',
    PENDING_STOCK: 'pending_stock',
  };

  const TYPE_CONFIG = {
    [TYPES.INFO]: { label: 'מידע', icon: 'info', color: 'info' },
    [TYPES.WARNING]: { label: 'אזהרה', icon: 'alert', color: 'warning' },
    [TYPES.CRITICAL]: { label: 'קריטי', icon: 'alert', color: 'danger' },
    [TYPES.SUCCESS]: { label: 'הצלחה', icon: 'success', color: 'success' },
    [TYPES.ASSIGNMENT]: { label: 'שיבוץ', icon: 'task', color: 'info' },
    [TYPES.APPROVAL_REQUIRED]: { label: 'ממתין לאישור', icon: 'alert', color: 'warning' },
    [TYPES.OVERDUE]: { label: 'באיחור', icon: 'calendar', color: 'danger' },
    [TYPES.RELEASE_APPROACHING]: { label: 'שחרור קרוב', icon: 'calendar', color: 'warning' },
    [TYPES.UNRESOLVED_EVENT]: { label: 'אירוע לא מטופל', icon: 'event', color: 'danger' },
    [TYPES.COUNTING_INCOMPLETE]: { label: 'ספירה לא הושלמה', icon: 'counting', color: 'warning' },
    [TYPES.LOW_STOCK]: { label: 'מלאי נמוך', icon: 'stock', color: 'warning' },
    [TYPES.PENDING_STOCK]: { label: 'תנועת מלאי ממתינה', icon: 'stock', color: 'info' },
  };

  function create(notif) {
    const record = {
      id: Utils.generateId(),
      timestamp: new Date().toISOString(),
      type: notif.type || TYPES.INFO,
      title: notif.title || '—',
      description: notif.description || '',
      module: notif.module || 'system',
      linkRoute: notif.linkRoute || null,
      linkParams: notif.linkParams || null,
      read: false,
      targetUserId: notif.targetUserId || null,
    };

    Storage.upsert(Storage.KEYS.NOTIFICATIONS, record);
    load(); // refresh count
    return record;
  }

  function load() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const all = Storage.getCollection(Storage.KEYS.NOTIFICATIONS);
    const mine = all.filter(n =>
      !n.deleted && (!n.targetUserId || n.targetUserId === user.id)
    );

    const unread = mine.filter(n => !n.read);
    AppState.set('notifications', mine);

    // Update badge
    updateBadge(unread.length);
  }

  function updateBadge(count) {
    const badge = Utils.qs('.topbar-notif-badge');
    if (!badge) return;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  function markRead(id) {
    const n = Storage.getById(Storage.KEYS.NOTIFICATIONS, id);
    if (!n || n.read) return;
    Storage.upsert(Storage.KEYS.NOTIFICATIONS, { ...n, read: true });
    load();
  }

  function markAllRead() {
    const user = Auth.getCurrentUser();
    const all = Storage.getCollection(Storage.KEYS.NOTIFICATIONS);
    const updated = all.map(n => {
      if (!n.read && (!n.targetUserId || n.targetUserId === user.id)) {
        return { ...n, read: true };
      }
      return n;
    });
    Storage.setCollection(Storage.KEYS.NOTIFICATIONS, updated);
    load();
  }

  function getUnreadCount() {
    const user = Auth.getCurrentUser();
    const all = Storage.getCollection(Storage.KEYS.NOTIFICATIONS);
    return all.filter(n =>
      !n.deleted && !n.read && (!n.targetUserId || n.targetUserId === user.id)
    ).length;
  }

  function getAll(filters) {
    const user = Auth.getCurrentUser();
    let all = Storage.getCollection(Storage.KEYS.NOTIFICATIONS).filter(n =>
      !n.deleted && (!n.targetUserId || n.targetUserId === user.id)
    );

    if (filters) {
      if (filters.type) all = all.filter(n => n.type === filters.type);
      if (filters.module) all = all.filter(n => n.module === filters.module);
      if (filters.read === 'unread') all = all.filter(n => !n.read);
      if (filters.read === 'read') all = all.filter(n => n.read);
    }

    return all.reverse();
  }

  return {
    TYPES, TYPE_CONFIG,
    create, load, markRead, markAllRead,
    getUnreadCount, getAll, updateBadge
  };
})();
