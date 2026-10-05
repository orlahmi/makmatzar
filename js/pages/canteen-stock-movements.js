/* canteen-stock-movements.js — תנועות מלאי בין קנטינות (tab per canteen; master/detail per legacy screen) */
'use strict';

window.Pages = window.Pages || {};

Pages['canteen-stock-movements'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('canteen')) { content.innerHTML = EmptyState.accessDenied(); return; }

  const canApprove = Permissions.can('approveStock');
  const canCreate = Permissions.can('createPurchase');
  const canteens = CanteenData.canteens();
  const cName = id => CanteenData.canteenName(id);
  const PAGE = 6;

  let tab = 'all';           // 'all' or a canteen id
  let filterApproved = '';   // '', 'yes', 'no'
  let filterDate = '';
  let selectedId = null;
  let page = 0, itemPage = 0;

  const isApproved = CanteenData.isApproved;

  function getData() {
    let list = Storage.getCollection(Storage.KEYS.STOCK_MOVEMENTS);
    if (tab !== 'all') list = list.filter(m => CanteenData.canon(m.sourceCanteenId) === tab || CanteenData.canon(m.destCanteenId) === tab);
    if (filterApproved === 'yes') list = list.filter(isApproved);
    if (filterApproved === 'no') list = list.filter(m => !isApproved(m));
    if (filterDate) list = list.filter(m => (m.movementDate || m.date) === filterDate);
    return list.sort((a, b) => (b.movementDate || '').localeCompare(a.movementDate || ''));
  }

  const pager = (total, cur, fn) => {
    const pages = Math.max(1, Math.ceil(total / PAGE));
    const from = total ? cur * PAGE + 1 : 0, to = Math.min(total, (cur + 1) * PAGE);
    return `<div style="display:flex;gap:8px;align-items:center;justify-content:center;padding:8px;font-size:12px">
      <button class="btn btn-secondary btn-sm" ${cur <= 0 ? 'disabled' : ''} onclick="${fn}(${cur - 1})">›</button>
      <span>${from}–${to} מתוך ${total}</span>
      <button class="btn btn-secondary btn-sm" ${cur >= pages - 1 ? 'disabled' : ''} onclick="${fn}(${cur + 1})">‹</button></div>`;
  };

  function renderPage() {
    const data = getData();
    if (page * PAGE >= data.length) page = 0;
    const rows = data.slice(page * PAGE, page * PAGE + PAGE);
    const selected = data.find(m => m.id === selectedId) || null;
    if (!selected) selectedId = null;
    const items = selected ? CanteenData.movementItems(selected) : [];
    if (itemPage * PAGE >= items.length) itemPage = 0;
    const products = CanteenData.products();

    content.innerHTML = `
      <div class="page-wrapper">
        ${Utils.pageHeader('תנועות מלאי בין קנטינות', Utils.pageMeta())}

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <button class="btn btn-secondary btn-sm" id="btn-export">${Utils.icon('download', 14)} ייצוא</button>
          ${canCreate ? `<button class="btn btn-primary" id="btn-new">${Utils.icon('plus', 14)} תנועה חדשה</button>` : ''}
        </div>

        <div class="tabs-nav" role="tablist" id="sm-tabs" style="margin-bottom:12px">
          ${[{ id: 'all', name: 'כל הקנטינות' }, ...canteens].map(c => `<button type="button" role="tab" class="tab-btn ${tab === c.id ? 'active' : ''}" data-canteen-tab="${c.id}">${Utils.escHtml(c.name)}</button>`).join('')}
        </div>

        <div class="retrieval-panel">
          <div class="retrieval-grid">
            <div class="form-group"><label class="form-label">אושר</label>
              <select class="form-control" id="f-approved">
                <option value="">הכל</option>
                <option value="yes" ${filterApproved === 'yes' ? 'selected' : ''}>כן</option>
                <option value="no" ${filterApproved === 'no' ? 'selected' : ''}>לא</option></select></div>
            <div class="form-group"><label class="form-label">תאריך תנועה</label><input type="date" class="form-control" id="f-date" value="${filterDate}"></div>
            <div class="form-group" style="display:flex;align-items:flex-end;gap:8px">
              <button class="btn btn-primary" id="f-apply">החל</button><button class="btn btn-secondary" id="f-reset">נקה</button></div>
          </div>
        </div>

        <div class="table-panel">
          <div class="table-panel-header"><span>ראשי תנועות מלאי${tab !== 'all' ? ' — ' + Utils.escHtml(cName(tab)) : ''}</span><span style="font-size:12px;color:var(--color-text-muted)">${data.length} תנועות</span></div>
          <table class="data-table">
            <thead><tr><th>מס' תנועה</th><th>קנטינה מקבלת</th><th>קנטינה מופקת</th><th>תאריך תנועה</th><th>מאשר</th><th>אושר</th><th>סטטוס</th></tr></thead>
            <tbody>
              ${rows.length === 0 ? `<tr><td colspan="7" style="padding:32px;text-align:center;color:var(--color-text-muted)">אין תנועות מלאי${tab !== 'all' ? ' עבור קנטינה זו' : ''}</td></tr>` :
                rows.map(m => `<tr class="${selectedId === m.id ? 'row-selected' : ''}" style="cursor:pointer" onclick="window._smSelect('${m.id}')">
                  <td class="td-number">${Utils.escHtml(m.movementNumber)}</td>
                  <td>${Utils.escHtml(cName(m.destCanteenId))}</td>
                  <td>${Utils.escHtml(cName(m.sourceCanteenId))}</td>
                  <td>${Utils.formatDate(m.movementDate)}</td>
                  <td>${Utils.escHtml(m.approverName || '—')}</td>
                  <td>${isApproved(m) ? '<span class="badge badge-success">כן</span>' : '<span class="badge badge-draft">לא</span>'}</td>
                  <td>${StatusBadge.render(m.status)}</td></tr>`).join('')}
            </tbody>
          </table>
          ${pager(data.length, page, 'window._smPage')}
        </div>

        <div class="table-panel" style="margin-top:16px">
          <div class="table-panel-header">
            <span>פירוט תנועות מלאי בין קנטינות${selected ? ' — ' + Utils.escHtml(selected.movementNumber) : ''}</span>
            <span style="display:flex;gap:8px">
              ${selected && canCreate && !isApproved(selected) ? `<button class="btn btn-secondary btn-sm" id="btn-add-item">${Utils.icon('plus', 13)} הוסף פריט</button>` : ''}
              ${selected && canApprove && !isApproved(selected) && selected.status !== 'rejected' ? `<button class="btn btn-primary btn-sm" id="btn-approve">${Utils.icon('check', 13)} אשר תנועה</button><button class="btn btn-secondary btn-sm" id="btn-reject">דחה</button>` : ''}
            </span>
          </div>
          ${!selected ? `<div style="padding:24px;text-align:center;color:var(--color-text-muted)">בחר תנועה מהטבלה הראשית להצגת הפירוט</div>` : `
          <div style="padding:8px 16px;font-size:12px;color:var(--color-text-muted)">מ-${Utils.escHtml(cName(selected.sourceCanteenId))} אל ${Utils.escHtml(cName(selected.destCanteenId))}${selected.rejectionReason ? ' • סיבת דחייה: ' + Utils.escHtml(selected.rejectionReason) : ''}</div>
          <table class="data-table">
            <thead><tr><th>קוד מוצר</th><th>תיאור מוצר</th><th>כמות מבוקשת</th><th>כמות מאושרת</th><th>הערות</th></tr></thead>
            <tbody>
              ${items.slice(itemPage * PAGE, itemPage * PAGE + PAGE).map(it => `<tr>
                <td class="td-id">${Utils.escHtml(it.productCode || '—')}</td><td>${Utils.escHtml(it.productName || '—')}</td>
                <td>${Number(it.requestedQty) || 0}</td><td>${it.approvedQty != null ? Number(it.approvedQty) : '—'}</td><td>${Utils.escHtml(it.notes || '—')}</td></tr>`).join('')}
              ${items.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--color-text-muted)">אין פריטים בתנועה</td></tr>' : ''}
            </tbody>
          </table>
          ${pager(items.length, itemPage, 'window._smItemPage')}`}
        </div>

        ${tab !== 'all' ? `
        <div class="table-panel" style="margin-top:16px">
          <div class="table-panel-header">מלאי נוכחי — ${Utils.escHtml(cName(tab))}</div>
          <table class="data-table">
            <thead><tr><th>קוד</th><th>מוצר</th><th>מחיר</th><th>מלאי</th><th>מצב</th></tr></thead>
            <tbody>${products.map(p => {
              const s = CanteenData.stockOf(p.code, tab);
              return `<tr><td class="td-id">${Utils.escHtml(p.code)}</td><td>${Utils.escHtml(p.name)}</td><td>${CanteenData.money(p.price)}</td><td><strong>${s}</strong></td>
                <td>${s <= 0 ? '<span class="badge badge-danger">אזל</span>' : s <= (p.minStock || 20) ? '<span class="badge badge-warning">נמוך</span>' : '<span class="badge badge-success">תקין</span>'}</td></tr>`;
            }).join('')}</tbody>
          </table>
        </div>` : ''}

        ${Utils.classificationFooter()}
      </div>
    `;

    window._smPage = n => { page = n; renderPage(); };
    window._smItemPage = n => { itemPage = n; renderPage(); };
    window._smSelect = id => { selectedId = id; itemPage = 0; renderPage(); };
    content.querySelectorAll('[data-canteen-tab]').forEach(b => b.onclick = () => { tab = b.dataset.canteenTab; page = 0; selectedId = null; renderPage(); });
    Utils.el('f-apply').onclick = () => { filterApproved = Utils.el('f-approved').value; filterDate = Utils.el('f-date').value; page = 0; renderPage(); };
    Utils.el('f-reset').onclick = () => { filterApproved = ''; filterDate = ''; page = 0; renderPage(); };
    Utils.el('btn-export').onclick = () => {
      const csv = getData().map(m => [m.movementNumber, cName(m.sourceCanteenId), cName(m.destCanteenId), m.movementDate, isApproved(m) ? 'כן' : 'לא']);
      Utils.exportCsv('stock_movements.csv', ['מספר', 'מופקת', 'מקבלת', 'תאריך', 'אושר'], csv);
    };
    if (Utils.el('btn-new')) Utils.el('btn-new').onclick = showNewMovement;
    if (Utils.el('btn-add-item')) Utils.el('btn-add-item').onclick = () => showAddItem(selected);
    if (Utils.el('btn-approve')) Utils.el('btn-approve').onclick = () => approve(selected, items);
    if (Utils.el('btn-reject')) Utils.el('btn-reject').onclick = () => reject(selected);
  }

  function persistItem(mov, item) {
    const all = Storage.getCollection(Storage.KEYS.STOCK_MOVEMENT_ITEMS);
    all.push(item);
    Storage.setCollection(Storage.KEYS.STOCK_MOVEMENT_ITEMS, all);
    mov.items = (mov.items || []).concat([item.id]);
    mov.itemCount = mov.items.length;
    mov.updatedAt = new Date().toISOString();
    Storage.upsert(Storage.KEYS.STOCK_MOVEMENTS, mov);
  }

  function showAddItem(mov) {
    const products = CanteenData.products();
    Modal.open({
      title: 'הוסף פריט לתנועה ' + mov.movementNumber,
      body: `<div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">מוצר <span class="required">*</span></label>
          <select id="ai-product" class="form-control"><option value="">בחר מוצר</option>${products.map(p => `<option value="${p.code}">${Utils.escHtml(p.code + ' — ' + p.name)}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">כמות <span class="required">*</span></label><input type="number" id="ai-qty" class="form-control" min="1" value="1"></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">הערות</label><input id="ai-notes" class="form-control"></div></div>
        <div id="ai-stock" style="font-size:12px;color:var(--color-text-muted)"></div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" id="ai-save">הוסף</button>`,
    });
    Utils.el('ai-product').onchange = () => {
      const code = Utils.el('ai-product').value;
      Utils.el('ai-stock').textContent = code ? 'מלאי בקנטינה המפיקה: ' + CanteenData.stockOf(code, CanteenData.canon(mov.sourceCanteenId)) : '';
    };
    Utils.el('ai-save').onclick = () => {
      const code = Utils.el('ai-product').value; const qty = parseInt(Utils.el('ai-qty').value, 10);
      if (!code) { Toast.error('יש לבחור מוצר'); return; }
      if (!qty || qty < 1) { Toast.error('כמות לא תקינה'); return; }
      if (qty > CanteenData.stockOf(code, CanteenData.canon(mov.sourceCanteenId))) { Toast.error('הכמות גדולה מהמלאי בקנטינה המפיקה'); return; }
      const dup = CanteenData.movementItems(mov).find(i => i.productCode === code);
      if (dup) { Toast.error('המוצר כבר קיים בתנועה'); return; }
      const p = CanteenData.findProduct(code);
      persistItem(mov, { id: mov.id + '_i' + Date.now(), movementId: mov.id, productCode: p.code, productName: p.name, requestedQty: qty, approvedQty: null, receivedQty: null, notes: Utils.el('ai-notes').value.trim() });
      Audit.log({ module: 'canteen', action: 'update', entityType: 'stockMovement', entityId: mov.id, description: `נוסף פריט ${p.name} לתנועה ${mov.movementNumber}` });
      Modal.close(); Toast.success('הפריט נוסף'); renderPage();
    };
  }

  function showNewMovement() {
    Modal.open({
      title: 'תנועת מלאי חדשה',
      body: `<div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">קנטינה מופקת (מקור) <span class="required">*</span></label>
          <select id="nm-src" class="form-control"><option value="">בחר</option>${canteens.map(c => `<option value="${c.id}" ${tab === c.id ? 'selected' : ''}>${Utils.escHtml(c.name)}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">קנטינה מקבלת (יעד) <span class="required">*</span></label>
          <select id="nm-dst" class="form-control"><option value="">בחר</option>${canteens.map(c => `<option value="${c.id}">${Utils.escHtml(c.name)}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">תאריך תנועה <span class="required">*</span></label><input type="date" id="nm-date" class="form-control" value="${Utils.today()}"></div>
      </div><p style="font-size:12px;color:var(--color-text-muted)">לאחר יצירת התנועה ניתן להוסיף פריטים ולהגיש לאישור.</p>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" id="nm-save">צור תנועה</button>`,
    });
    Utils.el('nm-save').onclick = () => {
      const src = Utils.el('nm-src').value, dst = Utils.el('nm-dst').value, date = Utils.el('nm-date').value;
      if (!src || !dst || !date) { Toast.error('יש למלא קנטינה מופקת, מקבלת ותאריך'); return; }
      if (src === dst) { Toast.error('הקנטינה המופקת והמקבלת חייבות להיות שונות'); return; }
      const u = Auth.getCurrentUser();
      const num = 'MOV-' + (Math.max(3000, ...Storage.getCollection(Storage.KEYS.STOCK_MOVEMENTS).map(m => parseInt(String(m.movementNumber).replace(/\D/g, ''), 10) || 0)) + 1);
      const mov = {
        id: 'sm_' + Utils.generateId(), movementNumber: num, sourceCanteenId: src, sourceCanteenName: cName(src), destCanteenId: dst, destCanteenName: cName(dst),
        movementDate: date, creatorId: u ? u.id : '', creatorName: u ? u.firstName + ' ' + u.lastName : '', status: 'pending',
        approverName: null, approvalDate: null, itemCount: 0, items: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      Storage.upsert(Storage.KEYS.STOCK_MOVEMENTS, mov);
      Audit.log({ module: 'canteen', action: 'create', entityType: 'stockMovement', entityId: mov.id, description: `תנועת מלאי ${num}` });
      Modal.close(); Toast.success('התנועה נוצרה'); selectedId = mov.id; page = 0; renderPage();
    };
  }

  async function approve(mov0, items) {
    const mov = Storage.getById(Storage.KEYS.STOCK_MOVEMENTS, mov0.id);
    if (!mov || isApproved(mov)) { Toast.error('התנועה כבר אושרה — לא ניתן לאשר פעמיים'); renderPage(); return; }
    if (mov.status === 'rejected') { Toast.error('תנועה שנדחתה לא ניתנת לאישור'); return; }
    if (!items.length) { Toast.error('לא ניתן לאשר תנועה ללא פריטים'); return; }
    const short = items.find(i => (Number(i.requestedQty) || 0) > CanteenData.stockOf(i.productCode, CanteenData.canon(mov.sourceCanteenId)));
    if (short) { Toast.error('אין מלאי מספיק ב"' + short.productName + '" בקנטינה המפיקה'); return; }
    const again = Storage.getById(Storage.KEYS.STOCK_MOVEMENTS, mov.id);
    if (again && isApproved(again)) { Toast.error('התנועה כבר אושרה'); renderPage(); return; }
    const ok = await Modal.confirm({ title: 'אישור תנועת מלאי', message: 'לאשר את התנועה ' + mov.movementNumber + '? המלאי יועבר בין הקנטינות.', type: 'success' });
    if (!ok) return;
    const u = Auth.getCurrentUser();
    const all = Storage.getCollection(Storage.KEYS.STOCK_MOVEMENT_ITEMS);
    items.forEach(it => { const s = all.find(x => x.id === it.id); if (s) s.approvedQty = s.requestedQty; });
    Storage.setCollection(Storage.KEYS.STOCK_MOVEMENT_ITEMS, all);
    mov.status = 'approved'; mov.approverName = u ? u.firstName + ' ' + u.lastName : ''; mov.approverId = u ? u.id : '';
    mov.approvalDate = Utils.today(); mov.updatedAt = new Date().toISOString();
    Storage.upsert(Storage.KEYS.STOCK_MOVEMENTS, mov);
    Audit.log({ module: 'canteen', action: 'approve', entityType: 'stockMovement', entityId: mov.id, description: `אישור תנועת מלאי ${mov.movementNumber}` });
    Toast.success('התנועה אושרה'); renderPage();
  }

  function reject(mov) {
    Modal.open({
      title: 'דחיית תנועה', body: `<div class="form-group"><label class="form-label">סיבת דחייה <span class="required">*</span></label><input id="rj-reason" class="form-control"></div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" id="rj-save">דחה</button>`,
    });
    Utils.el('rj-save').onclick = () => {
      const r = Utils.el('rj-reason').value.trim();
      if (!r) { Toast.error('יש להזין סיבת דחייה'); return; }
      mov.status = 'rejected'; mov.rejectionReason = r; mov.updatedAt = new Date().toISOString();
      Storage.upsert(Storage.KEYS.STOCK_MOVEMENTS, mov);
      Audit.log({ module: 'canteen', action: 'reject', entityType: 'stockMovement', entityId: mov.id, description: `דחיית תנועה ${mov.movementNumber}` });
      Modal.close(); Toast.success('התנועה נדחתה'); renderPage();
    };
  }

  renderPage();
};
