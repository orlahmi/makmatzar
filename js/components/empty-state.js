/* empty-state.js — empty/loading/error states */
'use strict';

window.EmptyState = (function() {

  function render(opts) {
    const { icon, title, description, action } = opts || {};
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          ${Utils.icon(icon || 'report', 32)}
        </div>
        <div class="empty-state-title">${Utils.escHtml(title || 'אין נתונים')}</div>
        ${description ? `<div class="empty-state-desc">${Utils.escHtml(description)}</div>` : ''}
        ${action ? `<div class="empty-state-action">${action}</div>` : ''}
      </div>
    `;
  }

  function loading() {
    return `
      <div class="empty-state">
        <div class="spinner"></div>
        <div class="empty-state-title" style="margin-top:16px">טוען נתונים...</div>
      </div>
    `;
  }

  function error(message) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon" style="background:var(--color-danger-bg);color:var(--color-danger)">
          ${Utils.icon('alert', 32)}
        </div>
        <div class="empty-state-title">שגיאה בטעינת הנתונים</div>
        <div class="empty-state-desc">${Utils.escHtml(message || '')}</div>
      </div>
    `;
  }

  function noResults(query) {
    return render({
      icon: 'search',
      title: 'לא נמצאו תוצאות',
      description: query ? `לא נמצאו תוצאות עבור "${query}". נסה לשנות את מונחי החיפוש.` : 'לא נמצאו רשומות התואמות את הסינון.',
      action: `<button class="btn btn-secondary" onclick="location.reload()">נקה סינון</button>`
    });
  }

  function accessDenied() {
    return `
      <div class="access-denied">
        <div class="access-denied-icon">${Utils.icon('lock', 32)}</div>
        <div class="access-denied-title">אין הרשאת גישה</div>
        <div class="access-denied-desc">אין לך הרשאה לצפות בדף זה.</div>
      </div>
    `;
  }

  function notFound(id) {
    return render({
      icon: 'alert',
      title: 'רשומה לא נמצאה',
      description: id ? `לא נמצאה רשומה עם מזהה: ${id}` : 'הרשומה המבוקשת אינה קיימת.',
      action: `<button class="btn btn-secondary" onclick="history.back()">חזרה</button>`
    });
  }

  return { render, loading, error, noResults, accessDenied, notFound };
})();
