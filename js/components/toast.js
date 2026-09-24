/* toast.js — toast notification component */
'use strict';

window.Toast = (function() {
  const ICONS = {
    success: 'success',
    error: 'x',
    warning: 'alert',
    info: 'info',
  };

  function show(message, type, duration) {
    type = type || 'info';
    duration = duration || 4000;

    let container = Utils.el('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');

    const iconName = ICONS[type] || 'info';
    const title = { success: 'הצלחה', error: 'שגיאה', warning: 'אזהרה', info: 'מידע' }[type] || '';

    toast.innerHTML = `
      <div class="toast-icon">${Utils.icon(iconName, 16)}</div>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${Utils.escHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="סגור">${Utils.icon('x', 12)}</button>
    `;

    container.appendChild(toast);

    toast.querySelector('.toast-close').onclick = () => removeToast(toast);

    const timer = setTimeout(() => removeToast(toast), duration);
    toast._timer = timer;

    return toast;
  }

  function removeToast(toast) {
    if (toast._timer) clearTimeout(toast._timer);
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-10px)';
    toast.style.transition = 'opacity 200ms, transform 200ms';
    setTimeout(() => toast.remove(), 210);
  }

  function success(msg) { return show(msg, 'success'); }
  function error(msg) { return show(msg, 'error', 6000); }
  function warning(msg) { return show(msg, 'warning'); }
  function info(msg) { return show(msg, 'info'); }

  return { show, success, error, warning, info };
})();
