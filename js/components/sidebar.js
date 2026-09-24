/* sidebar.js — sidebar navigation component (original style) */
'use strict';

window.Sidebar = (function() {

  function render() {
    const sidebar = Utils.el('sidebar');
    if (!sidebar) return;

    const groups = Permissions.getNavGroups();

    /* Live operational counts for key routes */
    const today = Utils.today();
    const opCounts = {};
    try {
      const noShowsToday = Storage.getCollection(Storage.KEYS.MASHLAT_COORDINATIONS).filter(c => c.status === 'no_show' && c.coordinationDate === today).length;
      if (noShowsToday > 0) opCounts['/mashlat'] = noShowsToday;
    } catch(e) {}

    const groupsHtml = groups.map(group => `
      <div class="nav-group" data-group="${group.id}">
        ${group.hideHeader ? '' : `<div class="nav-group-header">
          ${Utils.icon(group.icon, 14)}
          <span>${Utils.escHtml(group.label)}</span>
        </div>`}
        <div class="nav-group-items">
          ${group.items.map(item => {
            const cnt = opCounts[item.path];
            const badge = cnt ? `<span class="nav-live-count">${cnt}</span>` : '';
            return `<div class="nav-item" data-route="${item.path}" title="${Utils.escHtml(item.label)}">
              ${Utils.icon(item.icon || 'report', 14)}
              <span>${Utils.escHtml(item.label)}</span>
              ${badge}
            </div>`;
          }).join('')}
        </div>
      </div>
    `).join('');

    sidebar.innerHTML = `
      <div class="sidebar-logo-area">
        <div class="sidebar-title">מקמצ״ר</div>
        <div class="sidebar-subtitle-small">מערכת ניהול תפעולית</div>
      </div>
      <div class="sidebar-nav-label">ניווט</div>
      <nav class="sidebar-nav" role="navigation" aria-label="ניווט ראשי">
        ${groupsHtml}
      </nav>
      <div class="sidebar-bottom-actions">
        <button class="sidebar-reset-btn" id="sidebar-reset-btn">איפוס נתונים</button>
      </div>
    `;

    attachEvents();
    setActive(Router.getCurrentPath());
  }

  function attachEvents() {
    const sidebar = Utils.el('sidebar');
    if (!sidebar) return;

    Utils.delegate(sidebar, '.nav-item', 'click', function() {
      const route = this.dataset.route;
      if (route) Router.navigate(route);
    });

    const resetBtn = Utils.el('sidebar-reset-btn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (confirm('איפוס כל נתוני ההדגמה? פעולה זו תמחק את כל הרשומות ותטען נתוני ברירת מחדל.')) {
          Storage.resetAll();
          DataSeed.seed();
          Notifications.load();
          render();
          Router.navigate('/dashboard');
          Toast.show('נתוני ההדגמה אופסו בהצלחה', 'success');
        }
      };
    }
  }

  function setActive(path) {
    const sidebar = Utils.el('sidebar');
    if (!sidebar) return;
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === path);
    });
  }

  function openMobileSidebar() {
    const s = Utils.el('sidebar');
    const o = Utils.el('mobile-overlay');
    if (s) s.classList.add('mobile-open');
    if (o) o.classList.add('open');
  }

  function closeMobileSidebar() {
    const s = Utils.el('sidebar');
    if (s) s.classList.remove('mobile-open');
    const o = Utils.el('mobile-overlay');
    if (o) o.classList.remove('open');
  }

  function showBaseSwitcher() {
    const bases = Storage.getCollection(Storage.KEYS.BASES);
    const current = AppState.get('currentBase');

    const body = bases.map(b => `
      <div class="base-option ${current && current.id === b.id ? 'active' : ''}" data-base="${b.id}"
        style="display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer;border-radius:6px;margin-bottom:4px;border:1px solid ${current && current.id === b.id ? 'var(--color-primary)' : 'var(--color-border)'};background:${current && current.id === b.id ? 'var(--color-primary-subtle)' : 'var(--color-surface)'}">
        <div style="width:36px;height:36px;background:var(--color-primary);border-radius:6px;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:12px;">${Utils.escHtml(b.code)}</div>
        <div>
          <div style="font-weight:600;font-size:14px;">${Utils.escHtml(b.name)}</div>
          <div style="font-size:12px;color:var(--color-text-muted)">${Utils.escHtml(b.region)}</div>
        </div>
        ${current && current.id === b.id ? Utils.icon('check', 16) : ''}
      </div>
    `).join('');

    Modal.open({
      title: 'בחר בסיס',
      body: '<div style="padding:4px 0">' + body + '</div>',
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>`,
    });

    setTimeout(() => {
      Utils.qsa('.base-option').forEach(opt => {
        opt.addEventListener('click', () => {
          Auth.switchBase(opt.dataset.base);
          Modal.close();
        });
      });
    }, 10);
  }

  return { render, setActive, openMobileSidebar, closeMobileSidebar, showBaseSwitcher };
})();
