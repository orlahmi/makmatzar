/* router.js — client-side hash router */
'use strict';

window.Router = (function() {
  const routes = {};
  let currentPath = null;
  let currentQuery = {};
  let defaultRoute = '/dashboard';
  let notFoundHandler = null;

  function register(path, handler) {
    routes[path] = handler;
  }

  function registerAll(routeMap) {
    Object.entries(routeMap).forEach(([path, handler]) => register(path, handler));
  }

  function parseHash() {
    const hash = window.location.hash || '#/dashboard';
    const withoutHash = hash.startsWith('#') ? hash.slice(1) : hash;
    const qIdx = withoutHash.indexOf('?');
    const path = qIdx === -1 ? withoutHash : withoutHash.slice(0, qIdx);
    const queryStr = qIdx === -1 ? '' : withoutHash.slice(qIdx + 1);
    const query = {};
    if (queryStr) {
      queryStr.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { path: path || '/dashboard', query };
  }

  function navigate(path, query) {
    let hash = '#' + path;
    if (query && Object.keys(query).length) {
      hash += '?' + Object.entries(query)
        .filter(([, v]) => v !== '' && v != null)
        .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
        .join('&');
    }
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      handleRoute();
    }
  }

  function replace(path, query) {
    let hash = '#' + path;
    if (query && Object.keys(query).length) {
      hash += '?' + Object.entries(query)
        .filter(([, v]) => v !== '' && v != null)
        .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
        .join('&');
    }
    window.location.replace(window.location.pathname + window.location.search + hash);
  }

  function getCurrentPath() { return currentPath; }
  function getCurrentQuery() { return { ...currentQuery }; }
  function getQueryParam(key) { return currentQuery[key] || null; }

  function handleRoute() {
    const { path, query } = parseHash();
    currentPath = path;
    currentQuery = query;

    /* Show topbar only for officer-report-form */
    document.body.classList.toggle('with-topbar', path === '/officer-report-form');

    if (window.Sidebar) Sidebar.setActive(path);
    if (window.Topbar && path === '/officer-report-form') Topbar.setBreadcrumb(path);

    const routeTitle = ROUTE_TITLES[path] || 'מקמצ״ר';
    document.title = routeTitle + ' — מקמצ״ר';

    if (AppState.get('unsavedChanges')) {
      if (!confirm('יש שינויים שלא נשמרו. להמשיך ולאבד את השינויים?')) {
        return;
      }
      AppState.set('unsavedChanges', false);
    }

    const handler = routes[path];
    const content = Utils.el('page-content');
    if (!content) return;

    if (handler) {
      content.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
      setTimeout(() => {
        try {
          handler(query);
        } catch (e) {
          console.error('Route handler error:', path, e);
          content.innerHTML = '<div class="page-wrapper"><div class="empty-state"><div class="empty-state-title">שגיאה בטעינת הדף</div><div class="empty-state-desc">' + Utils.escHtml(e.message) + '</div></div></div>';
        }
      }, 80);
    } else if (notFoundHandler) {
      notFoundHandler(path, query);
    } else {
      content.innerHTML = '<div class="page-wrapper"><div class="empty-state"><div class="empty-state-title">404 — דף לא נמצא</div></div></div>';
    }

    AppState.set('currentRoute', path);
  }

  function onNotFound(handler) {
    notFoundHandler = handler;
  }

  let _initialized = false;
  function init() {
    if (!_initialized) {
      window.addEventListener('hashchange', handleRoute);
      _initialized = true;
    }
    handleRoute();
  }

  const ROUTE_TITLES = {
    '/dashboard': 'תמונת מצב',
    '/reports-table': 'דוחות שוטר',
    '/new-report-full': 'הוספת דו״ח חדש',
    '/officer-report-form': 'עדכון דו״ח שוטר',
    '/hamal-management': 'ניהול חמ״ל',
    '/tasks': 'משימות',
    '/add-task': 'הוספת משימה',
    '/deserter-retrieval': 'אחזור עריק/משתמט',
    '/new-deserter-file': 'פתיחת תיק עריק',
    '/new-prisoner-file': 'פתיחת תיק כלוא',
    '/deserter-file': 'תיק עריק',
    '/surveillance-activity-build': 'בניית פעילות בילוש',
    '/prisoner-file': 'אחזור תיק כלוא',
    '/service-work-prisoner-file': 'גחל״ת עובדי שירות',
    '/inmate-activities': 'פעילויות כלואים',
    '/event-reports': 'דוחות אירוע',
    '/counting-report': 'דו״ח ספירות',
    '/canteen-purchases': 'קניות בקנטינה',
    '/canteen-stock-movements': 'תנועות מלאי',
    '/audit-log': 'יומן ביקורת',
    '/users-management': 'ניהול משתמשים',
    '/notifications-center': 'מרכז התראות',
    '/mashlat':         'משל"ט',
    '/task-dashboard':  'דף משימה',
    '/gachlat':         'גחל"ת',
  };

  return {
    register, registerAll, navigate, replace,
    getCurrentPath, getCurrentQuery, getQueryParam,
    handleRoute, onNotFound, init,
    ROUTE_TITLES
  };
})();
