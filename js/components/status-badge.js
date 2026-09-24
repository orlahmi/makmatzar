/* status-badge.js — status badge component */
'use strict';

window.StatusBadge = (function() {

  const STATUS_CONFIG = {
    // Report statuses
    draft: { label: 'טיוטה', class: 'badge-draft' },
    pending: { label: 'ממתין', class: 'badge-pending' },
    approved: { label: 'מאושר', class: 'badge-approved' },
    cancelled: { label: 'בוטל', class: 'badge-inactive' },
    updated_sap: { label: 'עודכן SAP', class: 'badge-active' },
    rejected: { label: 'נדחה', class: 'badge-critical' },
    // Task statuses
    planned: { label: 'מתוכננת', class: 'badge-info' },
    in_progress: { label: 'בביצוע', class: 'badge-inprogress' },
    completed: { label: 'הושלמה', class: 'badge-active' },
    // Deserter/prisoner
    active: { label: 'פעיל', class: 'badge-active' },
    located: { label: 'אותר', class: 'badge-info' },
    arrested: { label: 'נעצר', class: 'badge-approved' },
    returned: { label: 'חזר', class: 'badge-teal' },
    closed: { label: 'סגור', class: 'badge-closed' },
    released: { label: 'שוחרר', class: 'badge-closed' },
    transferred: { label: 'הועבר', class: 'badge-pending' },
    hospitalized: { label: 'מאושפז', class: 'badge-warning' },
    escaped: { label: 'ברח', class: 'badge-critical' },
    detained: { label: 'כלוא', class: 'badge-critical' },
    deserter: { label: 'עריק', class: 'badge-critical' },
    // Stock
    resolved: { label: 'טופל', class: 'badge-active' },
    open: { label: 'פתוח', class: 'badge-pending' },
    unresolved: { label: 'לא טופל', class: 'badge-critical' },
    // Generic
    low: { label: 'נמוכה', class: 'badge-success' },
    medium: { label: 'בינונית', class: 'badge-warning' },
    high: { label: 'גבוהה', class: 'badge-danger' },
    critical: { label: 'קריטית', class: 'badge-critical' },
    shirker: { label: 'משתמט', class: 'badge-pending' },
    deserter_type: { label: 'עריק', class: 'badge-critical' },
  };

  function render(status, customLabel) {
    const config = STATUS_CONFIG[status] || { label: status || '—', class: 'badge-inactive' };
    const label = customLabel || config.label;
    return `<span class="badge ${config.class}"><span class="badge-dot"></span>${Utils.escHtml(label)}</span>`;
  }

  function renderRisk(level) {
    const map = {
      low: 'badge-success', medium: 'badge-warning', high: 'badge-danger', critical: 'badge-critical'
    };
    const labels = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה', critical: 'קריטית' };
    return `<span class="badge ${map[level] || 'badge-inactive'}">${labels[level] || level || '—'}</span>`;
  }

  function renderPriority(priority) {
    const map = {
      low: 'priority-low', medium: 'priority-medium', high: 'priority-high', critical: 'priority-critical'
    };
    const labels = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה', critical: 'קריטית' };
    return `<span class="${map[priority] || ''}">${labels[priority] || priority || '—'}</span>`;
  }

  function renderStockLock(status) {
    const config = {
      draft:     { icon: 'edit',    label: 'טיוטה',        cls: 'lock-icon-draft' },
      pending:   { icon: 'lock',    label: 'ממתין לאישור', cls: 'lock-icon-pending' },
      approved:  { icon: 'check',   label: 'מאושר',        cls: 'lock-icon-approved' },
      rejected:  { icon: 'x',      label: 'נדחה',          cls: 'lock-icon-rejected' },
      completed: { icon: 'success', label: 'הושלם',         cls: 'lock-icon-approved' },
    };
    const c = config[status];
    if (!c) return `<span style="color:var(--color-text-muted);font-size:var(--font-size-sm)">${Utils.escHtml(status || '—')}</span>`;
    return `<span class="${c.cls}" style="display:inline-flex;align-items:center;gap:4px">${Utils.icon(c.icon, 14)} ${Utils.escHtml(c.label)}</span>`;
  }

  return { render, renderRisk, renderPriority, renderStockLock };
})();
