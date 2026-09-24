/* notifications-center.js — notification center */
'use strict';

window.Pages = window.Pages || {};

Pages['notifications-center'] = function(query) {
  const content = Utils.el('page-content');

  let filterType = '';
  let filterRead = '';
  let filterSearch = '';

  function getData() {
    let notifs = Notifications.getAll();
    if (filterType) notifs = notifs.filter(n => n.type === filterType);
    if (filterRead === 'unread') notifs = notifs.filter(n => !n.read);
    if (filterRead === 'read') notifs = notifs.filter(n => n.read);
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      notifs = notifs.filter(n => n.title.toLowerCase().includes(q) || (n.description && n.description.toLowerCase().includes(q)));
    }
    return notifs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  const TYPE_LABELS = {
    info: 'מידע', warning: 'אזהרה', critical: 'קריטי', success: 'הצלחה',
    assignment: 'שיבוץ', approval_required: 'מחכה לאישור', overdue: 'באיחור',
    release_approaching: 'שחרור קרוב', unresolved_event: 'אירוע פתוח',
    counting_incomplete: 'ספירה לא שלמה', low_stock: 'מלאי נמוך', pending_stock: 'מלאי ממתין'
  };

  const TYPE_ICONS = {
    critical: 'alert', warning: 'alert', info: 'info', success: 'check',
    assignment: 'user', approval_required: 'task', overdue: 'alert',
    release_approaching: 'calendar', unresolved_event: 'event', counting_incomplete: 'counting',
    low_stock: 'stock', pending_stock: 'stock'
  };

  const TYPE_CLASSES = {
    critical: 'notif-critical', warning: 'notif-warning', success: 'notif-success',
    info: 'notif-info', approval_required: 'notif-warning'
  };

  function renderPage() {
    const data = getData();
    const unreadCount = Notifications.getUnreadCount();

    content.innerHTML = `
      <div class="page-wrapper">
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">${Utils.icon('bell', 24)} מרכז התראות</h1>
            <p class="page-subtitle">${data.length} התראות ${unreadCount > 0 ? `<span class="badge badge-danger">${unreadCount} לא נקראו</span>` : ''}</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-secondary btn-sm" id="btn-mark-all">סמן הכל כנקרא</button>
          </div>
        </div>

        <!-- Filters -->
        <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-3);flex-wrap:wrap;align-items:center">
          <button class="btn btn-sm ${filterRead === '' ? 'btn-primary' : 'btn-secondary'}" onclick="window._nFilter('read', '')">הכל</button>
          <button class="btn btn-sm ${filterRead === 'unread' ? 'btn-primary' : 'btn-secondary'}" onclick="window._nFilter('read', 'unread')">לא נקראו</button>
          <button class="btn btn-sm ${filterRead === 'read' ? 'btn-primary' : 'btn-secondary'}" onclick="window._nFilter('read', 'read')">נקראו</button>
          <span style="height:24px;border-left:1px solid var(--color-divider);margin:0 4px"></span>
          ${Object.entries(TYPE_LABELS).slice(0, 6).map(([id, label]) => `
            <button class="btn btn-sm ${filterType === id ? 'btn-primary' : 'btn-secondary'}" onclick="window._nFilter('type', '${id}')">${Utils.escHtml(label)}</button>
          `).join('')}
          <button class="btn btn-sm btn-ghost" onclick="window._nFilter('type', '')">נקה</button>
        </div>

        <div class="table-toolbar" style="margin-bottom:var(--space-3)">
          <div class="search-input-wrap" style="flex:1;max-width:280px">
            ${Utils.icon('search', 16)}
            <input class="form-control search-input" id="n-search" placeholder="חיפוש..." value="${Utils.escHtml(filterSearch)}">
          </div>
        </div>

        <!-- Notifications list -->
        <div id="notifs-list">
          ${data.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-icon">${Utils.icon('bell', 32)}</div>
              <div class="empty-state-title">אין התראות</div>
              <div class="empty-state-desc">לא נמצאו התראות התואמות את הסינון.</div>
            </div>
          ` : data.map(n => renderNotifCard(n)).join('')}
        </div>
      </div>
    `;

    Utils.el('n-search').addEventListener('input', Utils.debounce(() => { filterSearch = Utils.el('n-search').value; renderPage(); }, 300));

    Utils.el('btn-mark-all').onclick = () => {
      Notifications.markAllRead();
      Toast.success('כל ההתראות סומנו כנקראו');
      renderPage();
    };

    window._nFilter = (type, val) => {
      if (type === 'read') filterRead = val;
      else if (type === 'type') filterType = val;
      renderPage();
    };

    // Click handlers on notif cards
    document.querySelectorAll('[data-notif-id]').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = el.dataset.notifId;
        const notif = getData().find(n => n.id === id);
        if (!notif) return;
        if (!notif.read) {
          Notifications.markRead(id);
          el.classList.remove('unread');
        }
        if (notif.linkRoute && !e.target.closest('.notif-dismiss-btn')) {
          Router.navigate(notif.linkRoute, notif.linkParams || {});
        }
      });
    });

    document.querySelectorAll('.notif-dismiss-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        Notifications.markRead(id);
        renderPage();
      });
    });
  }

  function renderNotifCard(n) {
    const typeLabel = TYPE_LABELS[n.type] || n.type;
    const icon = TYPE_ICONS[n.type] || 'bell';
    const typeClass = TYPE_CLASSES[n.type] || 'notif-info';
    const timeAgo = getTimeAgo(n.timestamp);

    return `
      <div class="notif-card ${n.read ? '' : 'unread'} ${typeClass}" data-notif-id="${n.id}"
           style="display:flex;gap:var(--space-3);padding:var(--space-4);border-bottom:1px solid var(--color-divider);cursor:pointer;transition:background 0.15s;position:relative">
        <div class="notif-icon-wrap" style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:var(--color-${n.type === 'critical' || n.type === 'overdue' ? 'danger' : n.type === 'warning' || n.type === 'approval_required' ? 'warning' : n.type === 'success' ? 'success' : 'primary'}-bg);display:flex;align-items:center;justify-content:center;color:var(--color-${n.type === 'critical' || n.type === 'overdue' ? 'danger' : n.type === 'warning' || n.type === 'approval_required' ? 'warning' : n.type === 'success' ? 'success' : 'primary'})">
          ${Utils.icon(icon, 18)}
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <strong style="font-size:var(--font-size-sm)">${Utils.escHtml(n.title)}</strong>
            <span class="badge badge-info" style="font-size:10px">${Utils.escHtml(typeLabel)}</span>
            ${!n.read ? '<span class="dot dot-danger" style="flex-shrink:0"></span>' : ''}
          </div>
          <div style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:4px">${Utils.escHtml(n.description || '')}</div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-muted)">${Utils.escHtml(timeAgo)} — ${Utils.formatDateTime(n.timestamp)}</div>
          ${n.linkRoute ? `<div style="font-size:var(--font-size-xs);color:var(--color-primary);margin-top:2px">לחץ לניווט ←</div>` : ''}
        </div>
        <button class="notif-dismiss-btn" data-id="${n.id}" style="flex-shrink:0;background:none;border:none;cursor:pointer;color:var(--color-text-muted);padding:4px" title="סמן כנקרא">
          ${Utils.icon('x', 14)}
        </button>
      </div>
    `;
  }

  function getTimeAgo(timestamp) {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'עכשיו';
    if (minutes < 60) return `לפני ${minutes} דקות`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `לפני ${hours} שעות`;
    const days = Math.floor(hours / 24);
    return `לפני ${days} ימים`;
  }

  renderPage();
};
