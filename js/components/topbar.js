/* topbar.js — top information bar */
'use strict';

window.Topbar = (function() {
  let clockInterval = null;

  function render() {
    const topbar = Utils.el('topbar');
    if (!topbar) return;

    const user = Auth.getCurrentUser();
    const base = AppState.get('currentBase');
    const unread = Notifications.getUnreadCount();

    const avatarText = Utils.initials(user.firstName + ' ' + user.lastName);
    const avatarColor = Utils.avatarColor(user.id);

    topbar.innerHTML = `
      <button class="hamburger-btn" id="hamburger-btn" aria-label="פתח תפריט">${Utils.icon('settings', 18)}</button>

      <nav class="topbar-breadcrumb" aria-label="ניווט עמוד" id="topbar-breadcrumb">
        <span class="topbar-breadcrumb-current" id="topbar-page-title">לוח בקרה</span>
      </nav>

      <div class="topbar-search" id="topbar-search-wrap">
        <svg class="topbar-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="topbar-search-input" id="topbar-search-input" placeholder="חיפוש גלובלי — שם, מספר אישי, תיק..." autocomplete="off">
        <span class="topbar-search-kbd">/</span>
        <div class="topbar-search-results" id="topbar-search-results"></div>
      </div>

      <div class="topbar-spacer"></div>

      <div class="topbar-base-selector" id="base-selector-btn" title="לחץ להחלפת בסיס">
        <span class="topbar-base-code">${base ? Utils.escHtml(base.code) : '—'}</span>
        <span id="topbar-base-name">${base ? Utils.escHtml(base.shortName || base.name) : '—'}</span>
        ${Utils.icon('chevronDown', 12)}
      </div>

      <div class="topbar-datetime">
        <span id="topbar-date">${Utils.currentDateString()}</span>
        <span class="topbar-time" id="topbar-time">${Utils.currentTimeString()}</span>
      </div>

      <div class="topbar-icon-btn" id="notif-btn" title="התראות" role="button" aria-label="התראות">
        ${Utils.icon('bell', 18)}
        <span class="topbar-notif-badge" id="notif-badge" style="display:${unread > 0 ? 'flex' : 'none'}">${unread > 99 ? '99+' : unread}</span>
      </div>

      <div class="topbar-profile" id="topbar-profile-btn">
        <div class="topbar-avatar" style="background:${avatarColor}">${avatarText}</div>
        <div class="topbar-user-info">
          <div class="topbar-user-name">${Utils.escHtml(user.firstName + ' ' + user.lastName)}</div>
          <div class="topbar-user-role">${Utils.escHtml(user.role)}</div>
        </div>
        ${Utils.icon('chevronDown', 12)}
      </div>
    `;

    attachEvents();
    attachSearchEvents();
    startClock();
    renderOpNoticeBar();
  }

  /* ===== Operational notice bar ===== */
  function renderOpNoticeBar() {
    let bar = Utils.el('op-notice-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'op-notice-bar';
      document.body.insertBefore(bar, document.body.firstChild);
    }

    const unresolvedEvents = Storage.getCollection(Storage.KEYS.EVENT_REPORTS).filter(e => e.handlingStatus === 'unresolved');
    const noShows = Storage.getCollection(Storage.KEYS.MASHLAT_COORDINATIONS).filter(c => c.status === 'no_show' && c.coordinationDate === Utils.today());

    const items = [];
    if (unresolvedEvents.length > 0) items.push({ count: unresolvedEvents.length, label: 'אירועים לא מטופלים', route: '/event-reports' });
    if (noShows.length > 0) items.push({ count: noShows.length, label: 'אי-הופעות היום', route: '/mashlat' });

    if (items.length === 0) {
      bar.classList.remove('visible');
      document.body.classList.remove('op-notice-visible');
      return;
    }

    bar.classList.add('visible');
    document.body.classList.add('op-notice-visible');
    bar.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      ${items.map((it, i) => `
        ${i > 0 ? '<span class="op-notice-sep">|</span>' : ''}
        <span class="op-notice-item">
          <span class="op-notice-count">${it.count}</span>
          <span class="op-notice-link" onclick="Router.navigate('${it.route}')">${Utils.escHtml(it.label)}</span>
        </span>
      `).join('')}
    `;
  }

  /* ===== Global search ===== */
  function attachSearchEvents() {
    const input = Utils.el('topbar-search-input');
    const results = Utils.el('topbar-search-results');
    if (!input || !results) return;

    let debounceTimer = null;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => runSearch(input.value.trim()), 180);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 1) results.classList.add('open');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#topbar-search-wrap')) {
        results.classList.remove('open');
      }
    });

    /* Keyboard shortcut: press "/" to focus search */
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== input && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        input.focus();
        input.select();
      }
      if (e.key === 'Escape' && document.activeElement === input) {
        input.blur();
        results.classList.remove('open');
      }
    });
  }

  function runSearch(q) {
    const results = Utils.el('topbar-search-results');
    if (!results) return;

    if (q.length < 1) {
      results.classList.remove('open');
      return;
    }

    const ql = q.toLowerCase();
    const people = Storage.getCollection(Storage.KEYS.PEOPLE);
    const prisoners = Storage.getCollection(Storage.KEYS.PRISONER_FILES).filter(p => p.status === 'active');
    const coordinations = Storage.getCollection(Storage.KEYS.MASHLAT_COORDINATIONS);
    const events = Storage.getCollection(Storage.KEYS.EVENT_REPORTS);
    const pMap = Object.fromEntries(people.map(p => [p.id, p]));

    const matchPeople = people.filter(p =>
      (p.firstName + ' ' + p.lastName).toLowerCase().includes(ql) ||
      (p.militaryNumber || '').toLowerCase().includes(ql) ||
      (p.idNumber || '').toLowerCase().includes(ql)
    ).slice(0, 4);

    const matchPrisoners = prisoners.filter(p => {
      const person = pMap[p.personId];
      if (!person) return false;
      return (person.firstName + ' ' + person.lastName).toLowerCase().includes(ql) ||
        (person.militaryNumber || '').toLowerCase().includes(ql) ||
        (p.fileNumber || '').toLowerCase().includes(ql);
    }).slice(0, 3);

    const matchCoords = coordinations.filter(c =>
      (c.personName || '').toLowerCase().includes(ql) ||
      (c.militaryNumber || '').toLowerCase().includes(ql) ||
      (c.coordinationNumber || '').toLowerCase().includes(ql)
    ).slice(0, 3);

    const matchEvents = events.filter(e =>
      (e.title || '').toLowerCase().includes(ql) ||
      (e.reportNumber || '').toLowerCase().includes(ql)
    ).slice(0, 2);

    let html = '';

    if (matchPrisoners.length) {
      html += `<div class="search-result-group-label">תיקי כלואים פעילים</div>`;
      html += matchPrisoners.map(p => {
        const person = pMap[p.personId] || {};
        return `<div class="search-result-item" onclick="Router.navigate('/prisoner-file',{id:'${p.id}'});document.getElementById('topbar-search-results').classList.remove('open');document.getElementById('topbar-search-input').value=''">
          <div class="search-result-icon" style="background:var(--color-primary-subtle);color:var(--color-primary)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          </div>
          <div class="search-result-body">
            <div class="search-result-title">${Utils.escHtml((person.firstName || '') + ' ' + (person.lastName || ''))}</div>
            <div class="search-result-meta">מ.א. ${Utils.escHtml(person.militaryNumber || '—')} · תיק ${Utils.escHtml(p.fileNumber || '—')}</div>
          </div>
          ${StatusBadge.render(p.status)}
        </div>`;
      }).join('');
    }

    if (matchCoords.length) {
      html += `<div class="search-result-group-label">תיאומי משל"ט</div>`;
      html += matchCoords.map(c => `<div class="search-result-item" onclick="Router.navigate('/mashlat');document.getElementById('topbar-search-results').classList.remove('open');document.getElementById('topbar-search-input').value=''">
          <div class="search-result-icon" style="background:var(--color-teal-bg);color:var(--color-teal)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <div class="search-result-body">
            <div class="search-result-title">${Utils.escHtml(c.personName || '—')}</div>
            <div class="search-result-meta">${Utils.escHtml(c.coordinationNumber || '')} · ${Utils.formatDate(c.coordinationDate)}</div>
          </div>
        </div>`).join('');
    }

    if (matchPeople.length && !matchPrisoners.length) {
      html += `<div class="search-result-group-label">אנשים</div>`;
      const deserterFiles = Storage.getCollection(Storage.KEYS.DESERTER_FILES);
      html += matchPeople.map(p => {
        const df = deserterFiles.find(d => d.personId === p.id);
        const coord = coordinations.find(c => c.personId === p.id);
        let route = '/deserter-retrieval', routeParams = '{}';
        if (df) { route = '/deserter-file'; routeParams = `{id:'${df.id}'}`; }
        else if (coord) route = '/mashlat';
        return `<div class="search-result-item" onclick="Router.navigate('${route}',${routeParams});document.getElementById('topbar-search-results').classList.remove('open');document.getElementById('topbar-search-input').value=''">
          <div class="search-result-icon" style="background:var(--color-surface-alt);color:var(--color-text-muted)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div class="search-result-body">
            <div class="search-result-title">${Utils.escHtml(p.firstName + ' ' + p.lastName)}</div>
            <div class="search-result-meta">מ.א. ${Utils.escHtml(p.militaryNumber || '—')}</div>
          </div>
        </div>`;
      }).join('');
    }

    if (matchEvents.length) {
      html += `<div class="search-result-group-label">דיווחי אירועים</div>`;
      html += matchEvents.map(e => `<div class="search-result-item" onclick="Router.navigate('/event-reports');document.getElementById('topbar-search-results').classList.remove('open');document.getElementById('topbar-search-input').value=''">
          <div class="search-result-icon" style="background:var(--color-danger-bg);color:var(--color-danger)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div class="search-result-body">
            <div class="search-result-title">${Utils.escHtml(e.title || e.reportNumber || '—')}</div>
            <div class="search-result-meta">${Utils.formatDate(e.date || e.reportDate)}</div>
          </div>
        </div>`).join('');
    }

    if (!html) {
      html = `<div class="search-no-results">לא נמצאו תוצאות עבור "${Utils.escHtml(q)}"</div>`;
    }

    results.innerHTML = html;
    results.classList.add('open');
  }

  function attachEvents() {
    const hamburger = Utils.el('hamburger-btn');
    if (hamburger) hamburger.onclick = () => Sidebar.openMobileSidebar();

    const baseBtn = Utils.el('base-selector-btn');
    if (baseBtn) baseBtn.onclick = () => Sidebar.showBaseSwitcher();

    const notifBtn = Utils.el('notif-btn');
    if (notifBtn) notifBtn.onclick = () => Router.navigate('/notifications-center');

    const profileBtn = Utils.el('topbar-profile-btn');
    if (profileBtn) profileBtn.onclick = showProfileMenu;
  }

  function showProfileMenu() {
    const existing = Utils.qs('.topbar-profile-dropdown');
    if (existing) { existing.remove(); return; }

    const user = Auth.getCurrentUser();
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu open topbar-profile-dropdown';
    menu.style.cssText = 'position:fixed;top:52px;left:16px;';

    menu.innerHTML = `
      <div class="dropdown-item" style="cursor:default;font-weight:600;opacity:0.7">${Utils.escHtml(user.firstName + ' ' + user.lastName)}</div>
      <div class="dropdown-item" style="cursor:default;font-size:12px;opacity:0.6">סביבת הדגמה</div>
      <div class="dropdown-item-sep"></div>
      <div class="dropdown-item" id="pm-switch">${Utils.icon('map', 14)} החלפת בסיס</div>
      <div class="dropdown-item" id="pm-notif">${Utils.icon('bell', 14)} מרכז התראות</div>
      <div class="dropdown-item" id="pm-audit">${Utils.icon('log', 14)} יומן ביקורת</div>
      <div class="dropdown-item-sep"></div>
      <div class="dropdown-item" id="pm-reset">${Utils.icon('refresh', 14)} איפוס נתוני הדגמה</div>
    `;

    document.body.appendChild(menu);

    menu.querySelector('#pm-switch').onclick = () => { menu.remove(); Sidebar.showBaseSwitcher(); };
    menu.querySelector('#pm-notif').onclick = () => { menu.remove(); Router.navigate('/notifications-center'); };
    menu.querySelector('#pm-audit').onclick = () => { menu.remove(); Router.navigate('/audit-log'); };
    menu.querySelector('#pm-reset').onclick = () => {
      menu.remove();
      if (confirm('איפוס כל נתוני ההדגמה? פעולה זו תמחק את כל הרשומות ותטען נתוני ברירת מחדל.')) {
        Storage.resetAll();
        DataSeed.seed();
        Notifications.load();
        Topbar.render();
        Sidebar.render();
        Router.navigate('/dashboard');
        Toast.show('נתוני ההדגמה אופסו בהצלחה', 'success');
      }
    };

    setTimeout(() => {
      document.addEventListener('click', function close(e) {
        if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', close); }
      });
    }, 10);
  }

  function setBreadcrumb(path) {
    const titleEl = Utils.el('topbar-page-title');
    if (titleEl) titleEl.textContent = Router.ROUTE_TITLES[path] || 'מקמצ״ר';
  }

  function startClock() {
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(() => {
      const timeEl = Utils.el('topbar-time');
      const dateEl = Utils.el('topbar-date');
      if (timeEl) timeEl.textContent = Utils.currentTimeString();
      if (dateEl) dateEl.textContent = Utils.currentDateString();
    }, 1000);
  }

  function stopClock() {
    if (clockInterval) clearInterval(clockInterval);
  }

  return { render, setBreadcrumb, startClock, stopClock };
})();
