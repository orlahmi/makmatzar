/* tabs.js — tab component */
'use strict';

window.Tabs = (function() {

  function create(opts) {
    const { containerId, tabs, defaultTab, onChange } = opts;
    const container = Utils.el(containerId);
    if (!container) return;

    let activeTab = defaultTab || tabs[0].id;

    function renderNav() {
      const nav = container.querySelector('.tabs-nav');
      if (!nav) return;
      nav.innerHTML = tabs.map(tab => `
        <button class="tab-btn ${tab.id === activeTab ? 'active' : ''}"
                data-tab="${tab.id}"
                role="tab"
                aria-selected="${tab.id === activeTab}"
                aria-controls="tabpanel-${tab.id}">
          ${tab.icon ? Utils.icon(tab.icon, 14) : ''}
          ${Utils.escHtml(tab.label)}
          ${tab.count != null ? `<span class="tab-count">${tab.count}</span>` : ''}
        </button>
      `).join('');

      nav.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => activate(btn.dataset.tab));
        btn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') activate(btn.dataset.tab);
        });
      });
    }

    function activate(tabId) {
      activeTab = tabId;
      renderNav();

      container.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.dataset.tab === tabId);
      });

      if (onChange) onChange(tabId);
    }

    function init() {
      const existing = container.querySelector('.tabs-nav');
      if (!existing) {
        const nav = document.createElement('div');
        nav.className = 'tabs-nav';
        nav.setAttribute('role', 'tablist');
        container.insertBefore(nav, container.firstChild);
      }
      renderNav();
      activate(activeTab);
    }

    function setCount(tabId, count) {
      const tab = tabs.find(t => t.id === tabId);
      if (tab) { tab.count = count; renderNav(); }
    }

    init();

    return { activate, setCount };
  }

  function initStatic(containerId) {
    const container = Utils.el(containerId);
    if (!container) return;

    const buttons = container.querySelectorAll('.tab-btn');
    const panels = container.querySelectorAll('.tab-panel');

    function activate(id) {
      buttons.forEach(b => {
        const active = b.dataset.tab === id;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', active);
      });
      panels.forEach(p => p.classList.toggle('active', p.dataset.tab === id));
    }

    buttons.forEach(btn => {
      btn.addEventListener('click', () => activate(btn.dataset.tab));
    });

    // Activate first
    if (buttons[0]) activate(buttons[0].dataset.tab);
  }

  return { create, initStatic };
})();
