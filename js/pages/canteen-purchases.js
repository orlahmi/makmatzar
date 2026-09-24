/* canteen-purchases.js — canteen purchases with master-detail items */
'use strict';

window.Pages = window.Pages || {};

Pages['canteen-purchases'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('canteen')) { content.innerHTML = EmptyState.accessDenied(); return; }

  const canEdit = Permissions.can('createPurchase');
  const canteens = DEMO_UNITS.filter(u => u.type === 'canteen');
  let filterSearch = '';
  let filterStatus = '';
  let filters = { baseId: '', canteenId: '', dateFrom: '', dateTo: '', customerMilNum: '', seller: '', purchaseNumber: '', product: '' };
  let selectedPurchase = null;

  function getData() {
    let purchases = Storage.getCollection(Storage.KEYS.CANTEEN_PURCHASES);
    if (filterStatus) purchases = purchases.filter(p => p.status === filterStatus);
    if (filters.baseId) purchases = purchases.filter(p => p.baseId === filters.baseId);
    if (filters.canteenId) purchases = purchases.filter(p => p.canteenId === filters.canteenId);
    if (filters.dateFrom) purchases = purchases.filter(p => p.date >= filters.dateFrom);
    if (filters.dateTo) purchases = purchases.filter(p => p.date <= filters.dateTo);
    if (filters.customerMilNum) purchases = purchases.filter(p => (p.customerMilitaryNumber || '').includes(filters.customerMilNum));
    if (filters.seller) purchases = purchases.filter(p => (p.sellerName || '').includes(filters.seller));
    if (filters.purchaseNumber) purchases = purchases.filter(p => p.purchaseNumber.toLowerCase().includes(filters.purchaseNumber.toLowerCase()));
    if (filters.product) {
      const q = filters.product.toLowerCase();
      purchases = purchases.filter(p => resolveItems(p).some(it => (it.productName || '').toLowerCase().includes(q)));
    }
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      purchases = purchases.filter(p => p.purchaseNumber.toLowerCase().includes(q) || (p.customerName && p.customerName.toLowerCase().includes(q)));
    }
    return purchases.sort((a, b) => b.date.localeCompare(a.date));
  }

  function renderPage() {
    const data = getData();

    content.innerHTML = `
      <div class="page-wrapper">
        ${Utils.pageHeader('קניות בקנטינה', Utils.pageMeta())}

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <button class="btn btn-secondary btn-sm" id="btn-export">${Utils.icon('download', 14)} ייצוא</button>
          ${canEdit ? `<button class="btn btn-primary" id="btn-new">${Utils.icon('plus', 14)} רכישה חדשה</button>` : ''}
        </div>

        <!-- Filter panel -->
        <div class="retrieval-panel">
          <div class="retrieval-panel-header">סינון</div>
          <div class="retrieval-grid">
            <div class="form-group">
              <label class="form-label">סטטוס</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:4px">
                ${[{id:'',label:'הכל'},{id:'completed',label:'הושלם'},{id:'returned',label:'הוחזר'},{id:'pending',label:'ממתין'},{id:'cancelled',label:'בוטל'}].map(s => `
                  <button class="btn btn-sm ${filterStatus === s.id ? 'btn-primary' : 'btn-secondary'}" onclick="window._cpFilterStatus('${s.id}')">${Utils.escHtml(s.label)}</button>
                `).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">חיפוש</label>
              <input class="form-control" id="cp-search" placeholder="מספר / לקוח..." value="${Utils.escHtml(filterSearch)}">
            </div>
          </div>
          <div class="retrieval-grid" style="margin-top:8px">
            <div class="form-group">
              <label class="form-label">בסיס</label>
              <select class="form-control" id="cp-f-base">
                <option value="">הכל</option>
                ${DEMO_BASES.map(b => `<option value="${b.id}" ${filters.baseId === b.id ? 'selected' : ''}>${Utils.escHtml(b.shortName)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">קנטינה</label>
              <select class="form-control" id="cp-f-canteen">
                <option value="">הכל</option>
                ${canteens.map(c => `<option value="${c.id}" ${filters.canteenId === c.id ? 'selected' : ''}>${Utils.escHtml(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">מתאריך</label>
              <input type="date" class="form-control" id="cp-f-from" value="${filters.dateFrom}">
            </div>
            <div class="form-group">
              <label class="form-label">עד תאריך</label>
              <input type="date" class="form-control" id="cp-f-to" value="${filters.dateTo}">
            </div>
            <div class="form-group">
              <label class="form-label">מ"א לקוח</label>
              <input class="form-control" id="cp-f-milnum" value="${Utils.escHtml(filters.customerMilNum)}" placeholder="1234567">
            </div>
            <div class="form-group">
              <label class="form-label">מוכר</label>
              <input class="form-control" id="cp-f-seller" value="${Utils.escHtml(filters.seller)}">
            </div>
            <div class="form-group">
              <label class="form-label">מס' קנייה</label>
              <input class="form-control" id="cp-f-purnum" value="${Utils.escHtml(filters.purchaseNumber)}">
            </div>
            <div class="form-group">
              <label class="form-label">מוצר</label>
              <input class="form-control" id="cp-f-product" value="${Utils.escHtml(filters.product)}">
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end">
            <button class="btn btn-secondary btn-sm" id="cp-reset-filters">נקה</button>
            <button class="btn btn-primary btn-sm" id="cp-apply-filters">איתור קנייה</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:${selectedPurchase ? '1fr 380px' : '1fr'};gap:var(--space-4)">
          <!-- Purchases table -->
          <div class="table-panel">
            <table class="data-table">
              <thead>
                <tr>
                  <th>מספר</th>
                  <th>תאריך</th>
                  <th>לקוח</th>
                  <th>פריטים</th>
                  <th>סה"כ</th>
                  <th>סטטוס</th>
                  <th>קופאי</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${data.length === 0 ? `<tr><td colspan="8" style="padding:32px;text-align:center;color:var(--color-text-muted)">אין רכישות</td></tr>` :
                  data.map(p => `
                    <tr class="${selectedPurchase && selectedPurchase.id === p.id ? 'row-selected' : ''}" style="cursor:pointer" onclick="window.selectPurchase('${p.id}')">
                      <td class="td-number">${Utils.escHtml(p.purchaseNumber)}</td>
                      <td>${Utils.formatDate(p.date)}</td>
                      <td>${Utils.escHtml(p.customerName || '—')}</td>
                      <td style="text-align:center">${(p.items || []).length}</td>
                      <td><strong>${Utils.formatCurrency(p.total ?? p.totalAmount)}</strong></td>
                      <td>${StatusBadge.render(p.status)}</td>
                      <td>${Utils.escHtml(p.sellerName || p.cashierName || '—')}</td>
                      <td>
                        ${canEdit && p.status === 'pending' ? `<button class="row-action-btn" onclick="event.stopPropagation(); window.markPurchasePaid('${p.id}')" title="סמן שולם">${Utils.icon('check', 12)}</button>` : ''}
                      </td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Detail panel -->
          ${selectedPurchase ? renderPurchaseDetail(selectedPurchase) : ''}
        </div>

        ${Utils.classificationFooter()}
      </div>
    `;

    Utils.el('cp-search').addEventListener('input', Utils.debounce(() => { filterSearch = Utils.el('cp-search').value; renderPage(); }, 300));
    window._cpFilterStatus = (s) => { filterStatus = s; renderPage(); };
    Utils.el('cp-apply-filters').onclick = () => {
      filters.baseId = Utils.el('cp-f-base').value;
      filters.canteenId = Utils.el('cp-f-canteen').value;
      filters.dateFrom = Utils.el('cp-f-from').value;
      filters.dateTo = Utils.el('cp-f-to').value;
      filters.customerMilNum = Utils.el('cp-f-milnum').value;
      filters.seller = Utils.el('cp-f-seller').value;
      filters.purchaseNumber = Utils.el('cp-f-purnum').value;
      filters.product = Utils.el('cp-f-product').value;
      renderPage();
    };
    Utils.el('cp-reset-filters').onclick = () => {
      filters = { baseId: '', canteenId: '', dateFrom: '', dateTo: '', customerMilNum: '', seller: '', purchaseNumber: '', product: '' };
      filterSearch = '';
      renderPage();
    };
    Utils.el('btn-export').onclick = () => {
      const rows = getData().map(p => [p.purchaseNumber, p.date, p.customerName, (p.items || []).length, Utils.formatCurrency(p.total ?? p.totalAmount), p.status]);
      Utils.exportCsv('canteen_purchases.csv', ['מספר', 'תאריך', 'לקוח', 'פריטים', 'סה"כ', 'סטטוס'], rows);
    };
    if (Utils.el('btn-new')) Utils.el('btn-new').onclick = () => showNewPurchaseModal();

    window.selectPurchase = (id) => {
      const all = Storage.getCollection(Storage.KEYS.CANTEEN_PURCHASES);
      selectedPurchase = all.find(p => p.id === id) || null;
      renderPage();
    };

    window.returnPurchaseItem = async (purchaseId, itemId) => {
      const ok = await Modal.confirm({ title: 'החזרת פריט', message: 'האם לסמן פריט זה כמוחזר?', type: 'warning', confirmLabel: 'החזר' });
      if (!ok) return;
      const purchase = Storage.getById(Storage.KEYS.CANTEEN_PURCHASES, purchaseId);
      if (!purchase) return;
      const allItems = Storage.getCollection(Storage.KEYS.CANTEEN_PURCHASE_ITEMS);
      const item = allItems.find(i => i.id === itemId);
      if (item) {
        item.returnedQuantity = item.quantity;
        Storage.setCollection(Storage.KEYS.CANTEEN_PURCHASE_ITEMS, allItems);
      } else if (Array.isArray(purchase.items) && typeof purchase.items[0] === 'object') {
        const inline = purchase.items.find(i => i.id === itemId);
        if (inline) inline.returnedQuantity = inline.quantity;
      }
      const items = resolveItems(purchase);
      const allReturned = items.length && items.every(i => (i.returnedQuantity || 0) >= i.quantity);
      purchase.status = allReturned ? 'returned' : purchase.status;
      purchase.updatedAt = new Date().toISOString();
      Storage.upsert(Storage.KEYS.CANTEEN_PURCHASES, purchase);
      Audit.log({ module: 'canteen', action: 'update', entityType: 'purchase', entityId: purchaseId, description: `החזרת פריט ברכישה ${purchase.purchaseNumber}` });
      Toast.success('הפריט הוחזר');
      selectedPurchase = purchase;
      renderPage();
    };

    window.markPurchasePaid = (id) => {
      const all = Storage.getCollection(Storage.KEYS.CANTEEN_PURCHASES);
      const purchase = all.find(p => p.id === id);
      if (!purchase) return;
      purchase.status = 'paid';
      purchase.paidAt = new Date().toISOString();
      purchase.updatedAt = new Date().toISOString();
      Storage.upsert(Storage.KEYS.CANTEEN_PURCHASES, purchase);
      Audit.log({ module: 'canteen', action: 'update', entityType: 'purchase', entityId: id, description: `רכישה ${purchase.purchaseNumber} סומנה כשולמה` });
      Toast.success('הרכישה סומנה כשולמה');
      if (selectedPurchase && selectedPurchase.id === id) selectedPurchase = purchase;
      renderPage();
    };
  }

  function resolveItems(purchase) {
    const raw = purchase.items || [];
    if (!raw.length) return [];
    if (typeof raw[0] === 'object') return raw;
    const allItems = Storage.getCollection(Storage.KEYS.CANTEEN_PURCHASE_ITEMS);
    return raw.map(id => allItems.find(i => i.id === id)).filter(Boolean);
  }

  function renderPurchaseDetail(purchase) {
    const esc = v => Utils.escHtml(v || '—');
    const items = resolveItems(purchase);
    return `
      <div class="card" style="position:sticky;top:calc(var(--topbar-height) + var(--space-4))">
        <div class="card-header">
          <div class="card-title">פרטי רכישה</div>
          <button class="btn btn-ghost btn-sm" onclick="window.selectPurchase('')">${Utils.icon('x', 14)}</button>
        </div>
        <div class="card-body" style="max-height:70vh;overflow-y:auto">
          <div class="info-list" style="margin-bottom:var(--space-4)">
            <div class="info-list-row"><div class="info-list-label">מספר</div><div>${esc(purchase.purchaseNumber)}</div></div>
            <div class="info-list-row"><div class="info-list-label">תאריך</div><div>${Utils.formatDate(purchase.date)}</div></div>
            <div class="info-list-row"><div class="info-list-label">לקוח</div><div>${esc(purchase.customerName)}</div></div>
            <div class="info-list-row"><div class="info-list-label">קופאי</div><div>${esc(purchase.sellerName || purchase.cashierName)}</div></div>
            <div class="info-list-row"><div class="info-list-label">סטטוס</div><div>${StatusBadge.render(purchase.status)}</div></div>
          </div>

          <div style="font-weight:600;margin-bottom:var(--space-2)">פריטים:</div>
          <table class="data-table" style="font-size:var(--font-size-sm)">
            <thead><tr><th>מוצר</th><th>כמות</th><th>מחיר</th><th>סה"כ</th><th></th></tr></thead>
            <tbody>
              ${items.map((item, idx) => {
                const alreadyReturned = (item.returnedQuantity || 0) >= item.quantity;
                const canReturn = canEdit && item.returnable !== false && !alreadyReturned;
                return `<tr>
                <td>${esc(item.productName)}${alreadyReturned ? ' <span class="badge badge-warning">הוחזר</span>' : ''}</td>
                <td>${item.quantity}</td>
                <td>₪${Utils.formatCurrency(item.unitPrice)}</td>
                <td>₪${Utils.formatCurrency(item.quantity * item.unitPrice)}</td>
                <td>${canReturn ? `<button class="row-action-btn" onclick="window.returnPurchaseItem('${purchase.id}','${item.id}')" title="החזר פריט">${Utils.icon('refresh', 13)} החזר</button>` : ''}</td>
              </tr>`;
              }).join('')}
              <tr style="font-weight:700;border-top:2px solid var(--color-divider)">
                <td colspan="3">סה"כ לתשלום</td>
                <td>₪${Utils.formatCurrency(purchase.total ?? purchase.totalAmount)}</td>
              </tr>
            </tbody>
          </table>
          ${purchase.notes ? `<div style="margin-top:12px;font-size:var(--font-size-sm);color:var(--color-text-muted)">${esc(purchase.notes)}</div>` : ''}
        </div>
      </div>
    `;
  }

  function showNewPurchaseModal() {
    const products = Storage.getCollection(Storage.KEYS.CANTEEN_PRODUCTS);
    let cartItems = [];

    const body = `
      <div class="form-row form-row-2">
        <div class="form-group">
          <label class="form-label">לקוח</label>
          <input id="cp-customer" class="form-control" placeholder="שם לקוח">
        </div>
        <div class="form-group">
          <label class="form-label">תאריך</label>
          <input type="date" id="cp-date" class="form-control" value="${Utils.today()}">
        </div>
      </div>
      <div style="font-weight:600;margin-bottom:8px">הוספת מוצרים:</div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <select id="cp-product" class="form-control">
          <option value="">בחר מוצר</option>
          ${products.map(p => `<option value="${p.id}" data-price="${p.price}">${Utils.escHtml(p.name)} — ₪${Utils.formatCurrency(p.price)}</option>`).join('')}
        </select>
        <input type="number" id="cp-qty" class="form-control" value="1" min="1" style="width:80px">
        <button type="button" class="btn btn-secondary" onclick="window._addToCart()">הוסף</button>
      </div>
      <div id="cart-list"><div style="color:var(--color-text-muted);font-size:var(--font-size-sm)">סל ריק</div></div>
      <div id="cart-total" style="font-weight:700;margin-top:12px;font-size:var(--font-size-md)"></div>
    `;

    Modal.open({
      title: 'רכישה חדשה',
      size: 'lg',
      body,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>
        <button class="btn btn-primary" onclick="window._savePurchase()">סיים רכישה</button>
      `,
    });

    function renderCart() {
      const el = Utils.el('cart-list');
      if (!cartItems.length) { el.innerHTML = '<div style="color:var(--color-text-muted);font-size:var(--font-size-sm)">סל ריק</div>'; Utils.el('cart-total').textContent = ''; return; }
      el.innerHTML = `<table class="data-table" style="font-size:var(--font-size-sm)">
        <thead><tr><th>מוצר</th><th>כמות</th><th>מחיר</th><th>סה"כ</th><th></th></tr></thead>
        <tbody>
          ${cartItems.map((item, i) => `<tr>
            <td>${Utils.escHtml(item.productName)}</td>
            <td>${item.quantity}</td>
            <td>₪${Utils.formatCurrency(item.unitPrice)}</td>
            <td>₪${Utils.formatCurrency(item.quantity * item.unitPrice)}</td>
            <td><button class="row-action-btn danger" onclick="window._removeCartItem(${i})">${Utils.icon('x', 12)}</button></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
      const total = cartItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      Utils.el('cart-total').textContent = `סה"כ: ₪${Utils.formatCurrency(total)}`;
    }

    window._addToCart = () => {
      const sel = Utils.el('cp-product');
      const productId = sel.value;
      if (!productId) return;
      const opt = sel.selectedOptions[0];
      const price = parseFloat(opt.dataset.price) || 0;
      const qty = parseInt(Utils.el('cp-qty').value) || 1;
      const existing = cartItems.find(i => i.productId === productId);
      if (existing) { existing.quantity += qty; }
      else { cartItems.push({ productId, productName: opt.text.split(' — ')[0], unitPrice: price, quantity: qty }); }
      renderCart();
    };

    window._removeCartItem = (i) => { cartItems.splice(i, 1); renderCart(); };

    window._savePurchase = () => {
      if (!cartItems.length) { Toast.error('יש להוסיף פריטים לרכישה'); return; }
      const total = cartItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const u = Auth.getCurrentUser();
      const purchase = {
        id: 'cp_' + Utils.generateId(),
        purchaseNumber: 'PUR-' + String(Math.floor(Math.random() * 9000) + 1000),
        date: Utils.el('cp-date').value,
        customerName: Utils.el('cp-customer').value,
        cashierName: u ? u.firstName + ' ' + u.lastName : '',
        items: cartItems,
        totalAmount: total,
        status: 'paid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      Storage.upsert(Storage.KEYS.CANTEEN_PURCHASES, purchase);
      Audit.log({ module: 'canteen', action: 'create', entityType: 'purchase', entityId: purchase.id, description: `רכישת קנטינה ${purchase.purchaseNumber} — ₪${Utils.formatCurrency(total)}` });
      Modal.close();
      Toast.success('הרכישה נשמרה');
      selectedPurchase = purchase;
      renderPage();
    };
  }

  renderPage();
};
