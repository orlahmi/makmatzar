/* data-table.js — reusable data table component */
'use strict';

window.DataTable = (function() {

  function create(opts) {
    const {
      containerId,
      columns,
      data,
      rowKey,
      onRowClick,
      selectable,
      actions,
      emptyMessage,
      sortable,
      pagination: paginationOpts,
      rowClass,
    } = opts;

    let sortCol = null;
    let sortDir = 'asc';
    let selected = new Set();
    let currentPage = 1;
    let pageSize = (paginationOpts && paginationOpts.pageSize) || 25;
    let filteredData = [...data];
    let totalCount = data.length;

    function getPageData() {
      const start = (currentPage - 1) * pageSize;
      return filteredData.slice(start, start + pageSize);
    }

    function renderTable() {
      const container = Utils.el(containerId);
      if (!container) return;

      const pageData = getPageData();
      const allSelected = pageData.length > 0 && pageData.every(row => selected.has(row[rowKey || 'id']));

      const thead = `
        <thead>
          <tr>
            ${selectable ? `<th class="th-check"><input type="checkbox" id="${containerId}-check-all" ${allSelected ? 'checked' : ''} aria-label="בחר הכל"></th>` : ''}
            ${columns.map(col => `
              <th class="${col.sortable !== false && sortable !== false ? 'sortable' : ''} ${sortCol === col.key ? (sortDir === 'asc' ? 'sort-asc' : 'sort-desc') : ''} ${col.class || ''}"
                  data-key="${col.key || ''}" style="${col.width ? 'width:' + col.width : ''}">
                ${Utils.escHtml(col.label)}
                ${(col.sortable !== false && sortable !== false) ? `<span class="sort-icon">${Utils.icon('chevronDown', 10)}</span>` : ''}
              </th>
            `).join('')}
            ${actions ? '<th class="col-actions td-action">פעולות</th>' : ''}
          </tr>
        </thead>
      `;

      const tbody = pageData.length === 0
        ? `<tbody><tr><td colspan="${columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}" style="padding:40px;text-align:center;color:var(--color-text-muted)">${Utils.escHtml(emptyMessage || 'אין נתונים להצגה')}</td></tr></tbody>`
        : `<tbody>
          ${pageData.map(row => {
            const key = row[rowKey || 'id'];
            const isSelected = selected.has(key);
            const extraClass = rowClass ? rowClass(row) : '';
            return `
              <tr data-key="${key}" class="${isSelected ? 'selected' : ''} ${extraClass}" style="cursor:${onRowClick ? 'pointer' : 'default'}">
                ${selectable ? `<td class="td-check"><input type="checkbox" class="row-check" data-key="${key}" ${isSelected ? 'checked' : ''} aria-label="בחר שורה"></td>` : ''}
                ${columns.map(col => `
                  <td class="${col.tdClass || ''}" style="${col.tdStyle || ''}">
                    ${col.render ? col.render(row[col.key], row) : Utils.escHtml(row[col.key] != null ? row[col.key] : '—')}
                  </td>
                `).join('')}
                ${actions ? `<td class="td-action"><div class="row-actions">${actions(row)}</div></td>` : ''}
              </tr>
            `;
          }).join('')}
        </tbody>`;

      const tableHtml = `
        <div class="table-scroll-wrap">
          <table class="data-table" role="grid">
            ${thead}
            ${tbody}
          </table>
        </div>
        ${paginationOpts !== false ? renderPagination() : ''}
      `;

      container.innerHTML = tableHtml;
      attachTableEvents(container);
    }

    function renderPagination() {
      const total = filteredData.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
      const end = Math.min(currentPage * pageSize, total);

      const pageSizes = [10, 25, 50, 100];
      const pageSizeOptions = pageSizes.map(s =>
        `<option value="${s}" ${pageSize === s ? 'selected' : ''}>${s}</option>`
      ).join('');

      let pageButtons = '';
      // Always show first, last, and neighbors
      const pages = [];
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        if (currentPage > 3) pages.push('...');
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
        if (currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
      }

      pageButtons = pages.map(p => {
        if (p === '...') return '<span style="padding:0 4px;color:var(--color-text-muted)">…</span>';
        return `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
      }).join('');

      return `
        <div class="pagination-wrap">
          <div class="pagination-info">מציג ${start}–${end} מתוך ${Utils.formatNumber(total)}</div>
          <div class="pagination">${pageButtons}</div>
          <div class="page-size-select">
            שורות בעמוד:
            <select class="page-size-sel">${pageSizeOptions}</select>
          </div>
        </div>
      `;
    }

    function attachTableEvents(container) {
      // Sort
      container.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
          const key = th.dataset.key;
          if (!key) return;
          if (sortCol === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
          else { sortCol = key; sortDir = 'asc'; }
          filteredData = Utils.sortBy(filteredData, key, sortDir);
          currentPage = 1;
          renderTable();
        });
      });

      // Select all
      const checkAll = container.querySelector(`#${containerId}-check-all`);
      if (checkAll) {
        checkAll.addEventListener('change', () => {
          const pageData = getPageData();
          pageData.forEach(row => {
            const key = row[rowKey || 'id'];
            if (checkAll.checked) selected.add(key);
            else selected.delete(key);
          });
          renderTable();
          notifySelectionChange();
        });
      }

      // Row checkboxes
      container.querySelectorAll('.row-check').forEach(cb => {
        cb.addEventListener('change', (e) => {
          e.stopPropagation();
          const key = cb.dataset.key;
          if (cb.checked) selected.add(key);
          else selected.delete(key);
          renderTable();
          notifySelectionChange();
        });
      });

      // Row click
      if (onRowClick) {
        container.querySelectorAll('tbody tr').forEach(tr => {
          tr.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('.row-actions')) return;
            const key = tr.dataset.key;
            const row = filteredData.find(r => String(r[rowKey || 'id']) === String(key));
            if (row) onRowClick(row);
          });
        });
      }

      // Pagination
      container.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentPage = parseInt(btn.dataset.page);
          renderTable();
        });
      });

      const sizeSel = container.querySelector('.page-size-sel');
      if (sizeSel) {
        sizeSel.addEventListener('change', () => {
          pageSize = parseInt(sizeSel.value);
          currentPage = 1;
          renderTable();
        });
      }
    }

    function notifySelectionChange() {
      const event = new CustomEvent('tableselection', {
        detail: { selected: [...selected] },
        bubbles: true
      });
      const container = Utils.el(containerId);
      if (container) container.dispatchEvent(event);
    }

    function update(newData) {
      filteredData = [...newData];
      selected.clear();
      currentPage = 1;
      renderTable();
    }

    function getSelected() { return [...selected]; }
    function clearSelection() { selected.clear(); renderTable(); }

    // Initial render
    renderTable();

    return { update, getSelected, clearSelection, render: renderTable };
  }

  return { create };
})();
