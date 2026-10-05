/* canteen-purchases.js — קניות בקנטינה (master/detail per legacy screen) */
'use strict';

window.Pages = window.Pages || {};

Pages['canteen-purchases'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('canteen')) { content.innerHTML = EmptyState.accessDenied(); return; }

  const canEdit = Permissions.can('createPurchase');
  const canteens = CanteenData.canteens();
  const canteenName = id => CanteenData.canteenName(id);
  const money = CanteenData.money;
  const PAGE = 6;

  const EMPTY = { baseId: '', canteenId: '', dateFrom: '', dateTo: '', customerMilNum: '', seller: '', purchaseNumber: '', product: '' };
  let filters = Object.assign({}, EMPTY);
  let selectedId = query && query.id || null;
  let page = 0, itemPage = 0;

  function getData() {
    let list = Storage.getCollection(Storage.KEYS.CANTEEN_PURCHASES);
    if (filters.baseId) list = list.filter(p => p.baseId === filters.baseId);
    if (filters.canteenId) list = list.filter(p => CanteenData.canon(p.canteenId) === filters.canteenId);
    if (filters.dateFrom) list = list.filter(p => p.date >= filters.dateFrom);
    if (filters.dateTo) list = list.filter(p => p.date <= filters.dateTo);
    if (filters.customerMilNum) list = list.filter(p => (p.customerMilitaryNumber || '').includes(filters.customerMilNum.trim()));
    if (filters.seller) list = list.filter(p => (p.sellerName || p.cashierName || '').includes(filters.seller.trim()));
    if (filters.purchaseNumber) list = list.filter(p => (p.purchaseNumber || '').toLowerCase().includes(filters.purchaseNumber.trim().toLowerCase()));
    if (filters.product) {
      const q = filters.product.trim().toLowerCase();
      list = list.filter(p => CanteenData.purchaseItems(p).some(it => (it.productName || '').toLowerCase().includes(q) || String(it.productCode || '').toLowerCase().includes(q)));
    }
    return list.sort((a, b) => ((b.date || '') + (b.time || '')).localeCompare((a.date || '') + (a.time || '')));
  }

  const pager = (total, cur, fn) => {
    const pages = Math.max(1, Math.ceil(total / PAGE));
    const from = total ? cur * PAGE + 1 : 0, to = Math.min(total, (cur + 1) * PAGE);
    return `<div style="display:flex;gap:8px;align-items:center;justify-content:center;padding:8px;font-size:12px">
      <button class="btn btn-secondary btn-sm" ${cur <= 0 ? 'disabled' : ''} onclick="${fn}(${cur - 1})">›</button>
      <span>${from}–${to} מתוך ${total}</span>
      <button class="btn btn-secondary btn-sm" ${cur >= pages - 1 ? 'disabled' : ''} onclick="${fn}(${cur + 1})">‹</button></div>`;
  };

  function itemTotal(it) {
    const t = it.total != null ? Number(it.total) : (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
    return isNaN(t) ? 0 : t;
  }

  function renderPage() {
    const data = getData();
    if (page * PAGE >= data.length) page = 0;
    const rows = data.slice(page * PAGE, page * PAGE + PAGE);
    const selected = data.find(p => p.id === selectedId) || null;
    if (!selected) selectedId = null;
    const items = selected ? CanteenData.purchaseItems(selected) : [];
    if (itemPage * PAGE >= items.length) itemPage = 0;

    content.innerHTML = `
      <div class="page-wrapper">
        ${Utils.pageHeader('קניות בקנטינה', Utils.pageMeta())}

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <button class="btn btn-secondary btn-sm" id="btn-export">${Utils.icon('download', 14)} ייצוא</button>
          ${canEdit ? `<button class="btn btn-primary" id="btn-new">${Utils.icon('plus', 14)} קנייה חדשה</button>` : ''}
        </div>

        <div class="retrieval-panel">
          <div class="retrieval-panel-header">איתור קנייה</div>
          <div class="retrieval-grid">
            <div class="form-group"><label class="form-label">בסיס</label>
              <select class="form-control" id="cp-f-base"><option value="">הכל</option>
                ${DEMO_BASES.map(b => `<option value="${b.id}" ${filters.baseId === b.id ? 'selected' : ''}>${Utils.escHtml(b.shortName)}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">קנטינה</label>
              <select class="form-control" id="cp-f-canteen"><option value="">הכל</option>
                ${canteens.map(c => `<option value="${c.id}" ${filters.canteenId === c.id ? 'selected' : ''}>${Utils.escHtml(c.name)}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">מתאריך</label><input type="date" class="form-control" id="cp-f-from" value="${filters.dateFrom}"></div>
            <div class="form-group"><label class="form-label">עד תאריך</label><input type="date" class="form-control" id="cp-f-to" value="${filters.dateTo}"></div>
            <div class="form-group"><label class="form-label">מ"א לקוח</label><input class="form-control" id="cp-f-milnum" value="${Utils.escHtml(filters.customerMilNum)}"></div>
            <div class="form-group"><label class="form-label">מוכר</label><input class="form-control" id="cp-f-seller" value="${Utils.escHtml(filters.seller)}"></div>
            <div class="form-group"><label class="form-label">מס' קנייה</label><input class="form-control" id="cp-f-purnum" value="${Utils.escHtml(filters.purchaseNumber)}"></div>
            <div class="form-group"><label class="form-label">מוצר</label><input class="form-control" id="cp-f-product" value="${Utils.escHtml(filters.product)}"></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end">
            <button class="btn btn-secondary btn-sm" id="cp-reset-filters">נקה</button>
            <button class="btn btn-primary btn-sm" id="cp-apply-filters">איתור קנייה</button>
          </div>
        </div>

        <div class="table-panel">
          <div class="table-panel-header"><span>טבלה ראשית — קניות</span><span style="font-size:12px;color:var(--color-text-muted)">${data.length} קניות</span></div>
          <table class="data-table">
            <thead><tr><th>בסיס</th><th>קנטינה</th><th>תאריך</th><th>מ"א לקוח</th><th>מוכר</th><th>מס' קנייה</th><th>מוצר</th><th>סה"כ</th><th>סטטוס</th></tr></thead>
            <tbody>
              ${rows.length === 0 ? `<tr><td colspan="9" style="padding:32px;text-align:center;color:var(--color-text-muted)">לא נמצאו קניות התואמות לחיפוש</td></tr>` :
                rows.map(p => {
                  const its = CanteenData.purchaseItems(p);
                  const b = BASE_MAP[p.baseId];
                  return `<tr class="${selectedId === p.id ? 'row-selected' : ''}" style="cursor:pointer" onclick="window._cpSelect('${p.id}')">
                    <td>${b ? Utils.escHtml(b.code) : '—'}</td>
                    <td>${Utils.escHtml(canteenName(p.canteenId))}</td>
                    <td>${Utils.formatDate(p.date)}</td>
                    <td class="td-id">${Utils.escHtml(p.customerMilitaryNumber || '—')}</td>
                    <td>${Utils.escHtml(p.sellerName || p.cashierName || '—')}</td>
                    <td class="td-number">${Utils.escHtml(p.purchaseNumber)}</td>
                    <td>${its.length ? Utils.escHtml(its[0].productName) + (its.length > 1 ? ` (+${its.length - 1})` : '') : '—'}</td>
                    <td><strong>${money(p.total != null ? p.total : p.totalAmount)}</strong></td>
                    <td>${StatusBadge.render(p.status)}</td>
                  </tr>`;
                }).join('')}
            </tbody>
          </table>
          ${pager(data.length, page, 'window._cpPage')}
        </div>

        <div class="table-panel" style="margin-top:16px">
          <div class="table-panel-header">
            <span>פירוט פריטים${selected ? ' — קנייה ' + Utils.escHtml(selected.purchaseNumber) : ''}</span>
            ${selected && canEdit ? `<button class="btn btn-secondary btn-sm" id="btn-return">${Utils.icon('refresh', 13)} החזר פריט</button>` : ''}
          </div>
          ${!selected ? `<div style="padding:24px;text-align:center;color:var(--color-text-muted)">בחר קנייה מהטבלה הראשית להצגת הפריטים</div>` : `
          <table class="data-table">
            <thead><tr><th>קוד פריט</th><th>תיאור מוצר</th><th>כמות</th><th>מחיר</th><th>סה״כ</th><th>סטטוס</th></tr></thead>
            <tbody>
              ${items.slice(itemPage * PAGE, itemPage * PAGE + PAGE).map(it => {
                const ret = Number(it.returnedQuantity) || 0;
                return `<tr>
                  <td class="td-id">${Utils.escHtml(it.productCode || '—')}</td>
                  <td>${Utils.escHtml(it.productName || '—')}</td>
                  <td>${Number(it.quantity) || 0}</td>
                  <td>${money(it.unitPrice)}</td>
                  <td>${money(itemTotal(it))}</td>
                  <td>${ret >= (Number(it.quantity) || 0) && ret > 0 ? '<span class="badge badge-warning">הוחזר</span>' : ret > 0 ? `<span class="badge badge-warning">הוחזרו ${ret}</span>` : '—'}</td>
                </tr>`;
              }).join('')}
              ${items.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--color-text-muted)">אין פריטים בקנייה</td></tr>' : ''}
              <tr style="font-weight:700;border-top:2px solid var(--color-divider)"><td colspan="4">סה"כ לתשלום</td><td colspan="2">${money(selected.total != null ? selected.total : selected.totalAmount)}</td></tr>
            </tbody>
          </table>
          ${pager(items.length, itemPage, 'window._cpItemPage')}`}
        </div>

        ${Utils.classificationFooter()}
      </div>
    `;

    window._cpPage = (n) => { page = n; renderPage(); };
    window._cpItemPage = (n) => { itemPage = n; renderPage(); };
    window._cpSelect = (id) => { selectedId = id; itemPage = 0; renderPage(); };

    const read = () => {
      filters = {
        baseId: Utils.el('cp-f-base').value, canteenId: Utils.el('cp-f-canteen').value,
        dateFrom: Utils.el('cp-f-from').value, dateTo: Utils.el('cp-f-to').value,
        customerMilNum: Utils.el('cp-f-milnum').value, seller: Utils.el('cp-f-seller').value,
        purchaseNumber: Utils.el('cp-f-purnum').value, product: Utils.el('cp-f-product').value,
      };
      page = 0;
    };
    Utils.el('cp-apply-filters').onclick = () => { read(); renderPage(); };
    Utils.el('cp-reset-filters').onclick = () => { filters = Object.assign({}, EMPTY); page = 0; renderPage(); };
    content.querySelectorAll('.retrieval-panel input').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') { read(); renderPage(); } }));

    Utils.el('btn-export').onclick = () => {
      const csv = getData().map(p => [p.purchaseNumber, p.date, p.customerMilitaryNumber || '', p.sellerName || '', CanteenData.purchaseItems(p).length, p.total != null ? p.total : p.totalAmount, p.status]);
      Utils.exportCsv('canteen_purchases.csv', ['מספר', 'תאריך', 'מ"א לקוח', 'מוכר', 'פריטים', 'סה"כ', 'סטטוס'], csv);
    };
    if (Utils.el('btn-new')) Utils.el('btn-new').onclick = () => showNewPurchase();
    if (Utils.el('btn-return')) Utils.el('btn-return').onclick = () => showReturnModal(selected, items);
  }

  // ----- return item -----
  function showReturnModal(purchase, items) {
    const returnable = items.filter(it => it.returnable !== false && (Number(it.returnedQuantity) || 0) < (Number(it.quantity) || 0));
    if (!returnable.length) { Toast.info('אין פריטים הניתנים להחזרה בקנייה זו'); return; }
    Modal.open({
      title: 'החזר פריט',
      body: `<div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">פריט <span class="required">*</span></label>
          <select id="rt-item" class="form-control">${returnable.map(it => `<option value="${it.id}">${Utils.escHtml(it.productName)} (נותרו ${(Number(it.quantity) || 0) - (Number(it.returnedQuantity) || 0)})</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">כמות להחזרה <span class="required">*</span></label>
          <input type="number" id="rt-qty" class="form-control" min="1" value="1"></div></div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" onclick="window._doReturn()">החזר</button>`,
    });
    window._doReturn = () => {
      const it = items.find(x => x.id === Utils.el('rt-item').value);
      const qty = parseInt(Utils.el('rt-qty').value, 10);
      const left = (Number(it.quantity) || 0) - (Number(it.returnedQuantity) || 0);
      if (!it || !qty || qty < 1 || qty > left) { Toast.error('כמות להחזרה לא תקינה (1–' + left + ')'); return; }
      it.returnedQuantity = (Number(it.returnedQuantity) || 0) + qty;
      const all = Storage.getCollection(Storage.KEYS.CANTEEN_PURCHASE_ITEMS);
      const stored = all.find(x => x.id === it.id);
      if (stored) { stored.returnedQuantity = it.returnedQuantity; Storage.setCollection(Storage.KEYS.CANTEEN_PURCHASE_ITEMS, all); }
      else Storage.upsert(Storage.KEYS.CANTEEN_PURCHASES, purchase); // inline items
      const allReturned = items.every(x => (Number(x.returnedQuantity) || 0) >= (Number(x.quantity) || 0));
      if (allReturned) purchase.status = 'returned';
      purchase.updatedAt = new Date().toISOString();
      Storage.upsert(Storage.KEYS.CANTEEN_PURCHASES, purchase);
      Audit.log({ module: 'canteen', action: 'update', entityType: 'purchase', entityId: purchase.id, description: `החזרת ${qty} × ${it.productName} בקנייה ${purchase.purchaseNumber}` });
      Modal.close(); Toast.success('הפריט הוחזר'); renderPage();
    };
  }

  // ----- new purchase (fields per legacy purchase-details screen) -----
  function showNewPurchase() {
    const products = CanteenData.products();
    const prisoners = Storage.getCollection(Storage.KEYS.PRISONER_FILES).filter(f => f.status === 'active');
    const people = Storage.getCollection(Storage.KEYS.PEOPLE);
    const user = Auth.getCurrentUser();
    const now = new Date();
    const nowTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const nextNum = 'CAN-' + (Math.max(5000, ...Storage.getCollection(Storage.KEYS.CANTEEN_PURCHASES).map(p => parseInt(String(p.purchaseNumber).replace(/\D/g, ''), 10) || 0)) + 1);
    let cart = [];
    let customer = null;

    Modal.open({
      title: 'קנייה חדשה',
      size: 'xl',
      body: `
        <div class="table-panel-header" style="margin-bottom:8px">לקוח</div>
        <div class="form-row form-row-3">
          <div class="form-group"><label class="form-label">מ"א <span class="required">*</span></label>
            <div style="display:flex;gap:6px"><input id="np-mil" class="form-control" placeholder="מספר אישי"><button type="button" class="btn btn-secondary btn-sm" id="np-lookup">${Utils.icon('search', 13)}</button></div></div>
          <div class="form-group"><label class="form-label">שם פרטי</label><input id="np-first" class="form-control" readonly></div>
          <div class="form-group"><label class="form-label">שם משפחה</label><input id="np-last" class="form-control" readonly></div>
          <div class="form-group"><label class="form-label">מיקום בכלא</label><input id="np-loc" class="form-control" readonly></div>
        </div>
        <div class="table-panel-header" style="margin:12px 0 8px">פרטי קנייה</div>
        <div class="form-row form-row-3">
          <div class="form-group"><label class="form-label">מס' קנייה</label><input id="np-num" class="form-control" value="${nextNum}" readonly></div>
          <div class="form-group"><label class="form-label">תאריך <span class="required">*</span></label><input type="date" id="np-date" class="form-control" value="${Utils.today()}"></div>
          <div class="form-group"><label class="form-label">שעה <span class="required">*</span></label><input type="time" id="np-time" class="form-control" value="${nowTime}"></div>
          <div class="form-group"><label class="form-label">שם מוכר</label><input id="np-seller" class="form-control" value="${Utils.escHtml(user ? user.firstName + ' ' + user.lastName : '')}" readonly></div>
          <div class="form-group"><label class="form-label">קנטינה <span class="required">*</span></label>
            <select id="np-canteen" class="form-control"><option value="">בחר קנטינה</option>${canteens.map(c => `<option value="${c.id}">${Utils.escHtml(c.name)}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">סכום קנייה</label><input id="np-total" class="form-control" readonly value="${money(0)}"></div>
        </div>
        <div class="table-panel-header" style="margin:12px 0 8px">פריטים בקנייה</div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <select id="np-product" class="form-control"><option value="">בחר פריט</option>
            ${products.map(p => `<option value="${p.code}">${Utils.escHtml(p.code + ' — ' + p.name + ' — ' + money(p.price))}</option>`).join('')}</select>
          <input type="number" id="np-qty" class="form-control" value="1" min="1" style="width:90px">
          <button type="button" class="btn btn-secondary" id="np-add">הוסף</button>
        </div>
        <div id="np-cart"></div>
        <div id="np-stock" style="font-size:12px;color:var(--color-text-muted);margin-top:6px"></div>`,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">בטל קנייה</button>
        <button class="btn btn-primary" id="np-finish">סיים קנייה</button>`,
    });

    const $ = id => Utils.el(id);
    const total = () => cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    function renderCart() {
      $('np-total').value = money(total());
      $('np-cart').innerHTML = !cart.length ? '<div style="color:var(--color-text-muted);font-size:13px">לא נוספו פריטים</div>' :
        `<table class="data-table"><thead><tr><th>קוד פריט</th><th>תיאור מוצר</th><th>כמות</th><th>מחיר</th><th>סה"כ לשורה</th><th></th></tr></thead><tbody>
        ${cart.map((i, k) => `<tr><td>${Utils.escHtml(i.productCode)}</td><td>${Utils.escHtml(i.productName)}</td><td>${i.quantity}</td><td>${money(i.unitPrice)}</td><td>${money(i.quantity * i.unitPrice)}</td>
          <td><button type="button" class="row-action-btn danger" data-rm="${k}">${Utils.icon('x', 12)}</button></td></tr>`).join('')}</tbody></table>`;
      $('np-cart').querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { cart.splice(Number(b.dataset.rm), 1); renderCart(); });
    }
    renderCart();

    function stockNote() {
      const code = $('np-product').value, cid = $('np-canteen').value;
      $('np-stock').textContent = code && cid ? 'יתרת מוצר במלאי הקנטינה: ' + CanteenData.stockOf(code, cid) : '';
    }
    $('np-product').onchange = stockNote; $('np-canteen').onchange = stockNote;

    $('np-lookup').onclick = () => {
      const mil = $('np-mil').value.trim();
      const person = people.find(p => p.militaryNumber === mil);
      const pf = person && prisoners.find(f => f.personId === person.id);
      if (!person) { Toast.error('לא נמצא אדם עם מספר אישי זה'); customer = null; return; }
      if (!pf) { Toast.error('האדם אינו כלוא פעיל — לא ניתן לבצע קנייה'); customer = null; return; }
      customer = { person, pf };
      $('np-first').value = person.firstName; $('np-last').value = person.lastName; $('np-loc').value = pf.location || '';
    };

    $('np-add').onclick = () => {
      const code = $('np-product').value; const qty = parseInt($('np-qty').value, 10);
      if (!code) { Toast.error('יש לבחור פריט'); return; }
      if (!qty || qty < 1) { Toast.error('כמות לא תקינה'); return; }
      const cid = $('np-canteen').value;
      const p = CanteenData.findProduct(code);
      const already = (cart.find(i => i.productCode === code) || {}).quantity || 0;
      if (cid && qty + already > CanteenData.stockOf(code, cid)) { Toast.error('הכמות המבוקשת גדולה מהמלאי בקנטינה'); return; }
      const ex = cart.find(i => i.productCode === code);
      if (ex) ex.quantity += qty; else cart.push({ productCode: p.code, productName: p.name, unitPrice: p.price, quantity: qty, returnable: p.returnable });
      renderCart();
    };

    $('np-finish').onclick = () => {
      if (!customer) { Toast.error('יש לאתר לקוח לפי מספר אישי (כלוא פעיל)'); return; }
      if (!$('np-canteen').value) { Toast.error('יש לבחור קנטינה'); return; }
      if (!$('np-date').value || !$('np-time').value) { Toast.error('יש להזין תאריך ושעה'); return; }
      if (!cart.length) { Toast.error('יש להוסיף פריטים לקנייה'); return; }
      const cid = $('np-canteen').value;
      const purchaseId = 'cp_' + Utils.generateId();
      const itemIds = [];
      const stored = Storage.getCollection(Storage.KEYS.CANTEEN_PURCHASE_ITEMS);
      cart.forEach((i, k) => {
        const id = purchaseId + '_i' + k;
        stored.push({ id, purchaseId, productCode: i.productCode, productName: i.productName, unitPrice: i.unitPrice, quantity: i.quantity, discount: 0, total: Math.round(i.quantity * i.unitPrice * 100) / 100, returnable: i.returnable, returnedQuantity: 0 });
        itemIds.push(id);
      });
      Storage.setCollection(Storage.KEYS.CANTEEN_PURCHASE_ITEMS, stored);
      const c = canteens.find(x => x.id === cid);
      const purchase = {
        id: purchaseId, purchaseNumber: $('np-num').value, baseId: c.baseId, canteenId: cid, canteenName: c.name,
        date: $('np-date').value, time: $('np-time').value,
        customerId: customer.person.id, customerMilitaryNumber: customer.person.militaryNumber,
        customerName: customer.person.firstName + ' ' + customer.person.lastName,
        sellerId: user ? user.id : '', sellerName: $('np-seller').value,
        itemCount: cart.length, total: Math.round(total() * 100) / 100, status: 'completed', items: itemIds,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      Storage.upsert(Storage.KEYS.CANTEEN_PURCHASES, purchase);
      Audit.log({ module: 'canteen', action: 'create', entityType: 'purchase', entityId: purchase.id, description: `קנייה ${purchase.purchaseNumber} — ${money(purchase.total)}` });
      Modal.close(); Toast.success('הקנייה נשמרה');
      selectedId = purchase.id; page = 0; renderPage();
    };
  }

  renderPage();
};
