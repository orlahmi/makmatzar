/* modal.js — modal dialog component */
'use strict';

window.Modal = (function() {
  let modalEl = null;
  let onCloseCallback = null;
  let focusTrap = null;

  function open(opts) {
    close(); // Close any existing modal

    const { title, body, footer, size, onClose } = opts || {};
    onCloseCallback = onClose || null;

    const sizeClass = size === 'sm' ? 'modal-sm' : size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : '';

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');

    backdrop.innerHTML = `
      <div class="modal ${sizeClass}" id="modal-dialog" role="document">
        <div class="modal-header">
          <div class="modal-title">${title || ''}</div>
          <button class="modal-close" id="modal-close-btn" aria-label="סגור">${Utils.icon('x', 16)}</button>
        </div>
        <div class="modal-body" id="modal-body">
          ${body || ''}
        </div>
        ${footer ? `<div class="modal-footer" id="modal-footer">${footer}</div>` : ''}
      </div>
    `;

    document.body.appendChild(backdrop);
    modalEl = backdrop;

    // Focus first focusable
    setTimeout(() => {
      const focusable = backdrop.querySelector('input, select, textarea, button, [tabindex]');
      if (focusable) focusable.focus();
    }, 50);

    // Close handlers
    backdrop.querySelector('#modal-close-btn').onclick = close;
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    document.addEventListener('keydown', handleKeyDown);

    return backdrop;
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') close();
  }

  function close() {
    if (modalEl) {
      modalEl.remove();
      modalEl = null;
    }
    document.removeEventListener('keydown', handleKeyDown);
    if (onCloseCallback) { onCloseCallback(); onCloseCallback = null; }
  }

  function setBody(html) {
    const body = Utils.el('modal-body');
    if (body) body.innerHTML = html;
  }

  function setFooter(html) {
    const footer = Utils.el('modal-footer');
    if (footer) footer.innerHTML = html;
  }

  function confirm(opts) {
    return new Promise((resolve) => {
      const { title, message, confirmLabel, cancelLabel, type } = opts || {};
      const iconType = type === 'danger' ? 'confirm-icon-danger' : 'confirm-icon-warning';
      const iconSvg = type === 'danger' ? Utils.icon('trash', 24) : Utils.icon('alert', 24);
      const confirmClass = type === 'danger' ? 'btn-danger' : 'btn-warning';

      open({
        title: title || 'אישור פעולה',
        size: 'sm',
        body: `
          <div style="text-align:center;padding:var(--space-4) 0">
            <div class="confirm-icon ${iconType}">${iconSvg}</div>
            <div class="confirm-title">${Utils.escHtml(title || 'האם אתה בטוח?')}</div>
            <div class="confirm-message">${Utils.escHtml(message || '')}</div>
          </div>
        `,
        footer: `
          <button class="btn btn-secondary" id="confirm-cancel">${Utils.escHtml(cancelLabel || 'ביטול')}</button>
          <button class="btn ${confirmClass}" id="confirm-ok">${Utils.escHtml(confirmLabel || 'אישור')}</button>
        `,
        onClose: () => resolve(false),
      });

      setTimeout(() => {
        const okBtn = Utils.el('confirm-ok');
        const cancelBtn = Utils.el('confirm-cancel');
        if (okBtn) okBtn.onclick = () => { resolve(true); close(); };
        if (cancelBtn) cancelBtn.onclick = () => { resolve(false); close(); };
        if (okBtn) okBtn.focus();
      }, 10);
    });
  }

  function prompt(opts) {
    return new Promise((resolve) => {
      const { title, label, placeholder, required } = opts || {};

      open({
        title: title || 'הזן ערך',
        size: 'sm',
        body: `
          <div class="form-group">
            <label class="form-label">${Utils.escHtml(label || 'ערך')}${required ? ' <span class="required">*</span>' : ''}</label>
            <textarea class="form-control" id="prompt-input" rows="3" placeholder="${Utils.escHtml(placeholder || '')}"></textarea>
          </div>
        `,
        footer: `
          <button class="btn btn-secondary" id="prompt-cancel">ביטול</button>
          <button class="btn btn-primary" id="prompt-ok">אישור</button>
        `,
        onClose: () => resolve(null),
      });

      setTimeout(() => {
        const input = Utils.el('prompt-input');
        const ok = Utils.el('prompt-ok');
        const cancel = Utils.el('prompt-cancel');
        if (input) input.focus();
        if (ok) ok.onclick = () => {
          const val = input ? input.value.trim() : '';
          if (required && !val) { input.classList.add('is-invalid'); return; }
          resolve(val); close();
        };
        if (cancel) cancel.onclick = () => { resolve(null); close(); };
      }, 10);
    });
  }

  return { open, close, setBody, setFooter, confirm, prompt };
})();
