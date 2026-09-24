/* canteen-stock-movements.js — stock movements with approval workflow */
'use strict';

window.Pages = window.Pages || {};

Pages['canteen-stock-movements'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('canteen')) { content.innerHTML = EmptyState.accessDenied(); return; }

  const canApprove = Permissions.can('approveStock');
  const canCreate = Permissions.can('createPurchase');
  const canteens = DEMO_UNITS.filter(u => u.type === 'canteen');
  let filterStatus = '';
  let filterSearch = '';
  let filterDate = '';

  function getData() {
    let movements = Storage.getCollection(Storage.KEYS.STOCK_MOVEMENTS);
    if (filterStatus) movements = movements.filter(m => m.status === filterStatus);
    if (filterDate) movements = movements.filter(m => (m.movementDate || m.date) === filterDate);
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      movements = movements.filter(m => m.movementNumber.toLowerCase().includes(q) || m.movementType.toLowerCase().includes(q));
    }
    return movements.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  function getProducts() {
    return Storage.getCollection(Storage.KEYS.CANTEEN_PRODUCTS) || [];
  }

  function renderPage() {
    const data = getData();
    const products = getProducts();

    // Current stock summary
    const stockMap = {};
    products.forEach(p => { stockMap[p.id] = { ...p, currentStock: p.currentStock || 0 }; });
    // Apply completed movements
    Storage.getCollection(Storage.KEYS.STOCK_MOVEMENTS).filter(m => m.status === 'approved').forEach(m => {
      (m.items || []).forEach(item => {
        if (stockMap[item.productId]) {
          if (m.movementType === 'in') stockMap[item.productId].currentStock += item.quantity;
          else if (m.movementType === 'out') stockMap[item.productId].currentStock -= item.quantity;
        }
      });
    });

    content.innerHTML = `
      <div class="page-wrapper">
        ${Utils.pageHeader('תנועות מלאי בין קנטינות', Utils.pageMeta())}

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <button class="btn btn-secondary btn-sm" id="btn-export">${Utils.icon('download', 14)} ייצוא</button>
          ${canCreate ? `<button class="btn btn-primary" id="btn-new">${Utils.icon('plus', 14)} תנועה חדשה</button>` : ''}
        </div>

        <!-- Stock summary -->
        <div class="table-panel" style="margin-bottom:20px">
          <div class="table-panel-header">מלאי נוכחי</div>
          <div style="padding:0">
            <table class="data-table">
              <thead><tr><th>מוצר</th><th>קטגוריה</th><th>מחיר</th><th>מלאי</th><th>סטטוס</th></tr></thead>
              <tbody>
                ${products.map(p => {
                  const stock = stockMap[p.id] ? stockMap[p.id].currentStock : (p.currentStock || 0);
                  const minStock = p.minStock || 5;
                  const stockStatus = stock <= 0 ? 'danger' : stock <= minStock ? 'warning' : 'success';
                  return `<tr>
                    <td>${Utils.escHtml(p.name)}</td>
                    <td>${Utils.escHtml(p.category || '—')}</td>
                    <td>₪${Utils.formatCurrency(p.price)}</td>
                    <td><strong>${stock}</strong> יח'</td>
                    <td>${stock <= 0 ? '<span class="badge badge-danger">אזל</span>' : stock <= minStock ? '<span class="badge badge-warning">נמוך</span>' : '<span class="badge badge-success">תקין</span>'}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Filter panel -->
        <div class="retrieval-panel">
          <div class="retrieval-panel-header">סינון</div>
          <div class="retrieval-grid">
            <div class="form-group">
              <label class="form-label">סטטוס</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:4px">
                ${[{id:'',label:'הכל'},{id:'pending',label:'ממתין לאישור'},{id:'approved',label:'אושר'},{id:'rejected',label:'נדחה'},{id:'completed',label:'הושלם'},{id:'draft',label:'טיוטה'}].map(s => `
                  <button class="btn btn-sm ${filterStatus === s.id ? 'btn-primary' : 'btn-secondary'}" onclick="window._smFilterStatus('${s.id}')">${Utils.escHtml(s.label)}</button>
                `).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">תאריך תנועה</label>
              <input type="date" class="form-control" id="sm-f-date" value="${filterDate}">
            </div>
            <div class="form-group">
              <label class="form-label">חיפוש</label>
              <input class="form-control" id="sm-search" placeholder="מספר תנועה..." value="${Utils.escHtml(filterSearch)}">
            </div>
          </div>
        </div>

        <!-- Movements table panel -->
        <div class="table-panel">
          <div class="table-panel-header">תנועות מלאי</div>
          <div id="sm-table"></div>
        </div>

        ${Utils.classificationFooter()}
      </div>
    `;

    DataTable.create({
      containerId: 'sm-table',
      data,
      rowKey: 'id',
      columns: [
        { key: 'movementNumber', label: 'מספר תנועה', tdClass: 'td-number' },
        { key: 'movementDate', label: 'תאריך', render: v => Utils.formatDate(v) },
        { key: 'sourceCanteenName', label: 'מקור', render: v => Utils.escHtml(v || '—') },
        { key: 'destCanteenName', label: 'יעד', render: v => Utils.escHtml(v || '—') },
        { key: 'items', label: 'פריטים', render: v => (v || []).length + ' פריטים' },
        { key: 'status', label: 'סטטוס', render: v => StatusBadge.renderStockLock(v) },
        { key: 'creatorName', label: 'נוצר ע"י', render: v => Utils.escHtml(v || '—') },
      ],
      actions: (row) => `
        <button class="row-action-btn" onclick="window.viewMovement('${row.id}')">${Utils.icon('view', 14)}</button>
        ${canApprove && row.status === 'pending' ? `
          <button class="row-action-btn" onclick="window.approveMovement('${row.id}')" title="אשר">${Utils.icon('check', 14)}</button>
          <button class="row-action-btn danger" onclick="window.rejectMovement('${row.id}')" title="דחה">${Utils.icon('x', 14)}</button>
        ` : ''}
      `,
      emptyMessage: 'אין תנועות מלאי',
    });

    Utils.el('sm-search').addEventListener('input', Utils.debounce(() => { filterSearch = Utils.el('sm-search').value; renderPage(); }, 300));
    Utils.el('sm-f-date').addEventListener('change', () => { filterDate = Utils.el('sm-f-date').value; renderPage(); });
    window._smFilterStatus = (s) => { filterStatus = s; renderPage(); };
    Utils.el('btn-export').onclick = () => {
      const rows = getData().map(m => [m.movementNumber, m.date, m.movementType, m.supplier, (m.items || []).length, m.status]);
      Utils.exportCsv('stock_movements.csv', ['מספר', 'תאריך', 'סוג', 'ספק', 'פריטים', 'סטטוס'], rows);
    };
    if (Utils.el('btn-new')) Utils.el('btn-new').onclick = () => showNewMovementModal(products);

    window.viewMovement = (id) => {
      const m = Storage.getById(Storage.KEYS.STOCK_MOVEMENTS, id);
      if (!m) return;
      const items = m.items || [];
      Modal.open({
        title: `תנועת מלאי — ${m.movementNumber}`,
        size: 'lg',
        body: `
          <div class="info-list" style="margin-bottom:12px">
            <div class="info-list-row"><div class="info-list-label">תאריך</div><div>${Utils.formatDate(m.movementDate || m.date)}</div></div>
            <div class="info-list-row"><div class="info-list-label">מקור</div><div>${Utils.escHtml(m.sourceCanteenName || '—')}</div></div>
            <div class="info-list-row"><div class="info-list-label">יעד</div><div>${Utils.escHtml(m.destCanteenName || '—')}</div></div>
            <div class="info-list-row"><div class="info-list-label">סטטוס</div><div>${StatusBadge.renderStockLock(m.status)}</div></div>
            <div class="info-list-row"><div class="info-list-label">הערות</div><div>${Utils.escHtml(m.rejectionReason || m.notes || '—')}</div></div>
          </div>
          <table class="data-table">
            <thead><tr><th>מוצר</th><th>כמות</th><th>מחיר יח'</th><th>סה"כ</th></tr></thead>
            <tbody>
              ${items.map(item => `<tr>
                <td>${Utils.escHtml(item.productName || item.productId)}</td>
                <td>${item.quantity}</td>
                <td>₪${Utils.formatCurrency(item.unitPrice || 0)}</td>
                <td>₪${Utils.formatCurrency(item.quantity * (item.unitPrice || 0))}</td>
              </tr>`).join('')}
              <tr style="font-weight:700"><td colspan="3">סה"כ</td><td>₪${Utils.formatCurrency(m.totalValue || 0)}</td></tr>
            </tbody>
          </table>
        `,
      });
    };

    window.approveMovement = async (id) => {
      const ok = await Modal.confirm({ title: 'אישור תנועת מלאי', message: 'האם לאשר תנועת מלאי זו?', type: 'success' });
      if (!ok) return;
      const m = Storage.getById(Storage.KEYS.STOCK_MOVEMENTS, id);
      if (!m) return;
      m.status = 'approved';
      m.approvedAt = new Date().toISOString();
      m.approvedBy = Auth.getCurrentUser() ? Auth.getCurrentUser().firstName + ' ' + Auth.getCurrentUser().lastName : '';
      m.updatedAt = new Date().toISOString();
      Storage.upsert(Storage.KEYS.STOCK_MOVEMENTS, m);
      Audit.log({ module: 'canteen', action: 'approve', entityType: 'stockMovement', entityId: id, description: `אישור תנועת מלאי ${m.movementNumber}` });
      Toast.success('התנועה אושרה');
      renderPage();
    };

    window.rejectMovement = async (id) => {
      const reason = await Modal.prompt({ title: 'דחיית תנועת מלאי', message: 'סיבת דחייה:' });
      if (!reason) return;
      const m = Storage.getById(Storage.KEYS.STOCK_MOVEMENTS, id);
      if (!m) return;
      m.status = 'rejected';
      m.rejectionReason = reason;
      m.updatedAt = new Date().toISOString();
      Storage.upsert(Storage.KEYS.STOCK_MOVEMENTS, m);
      Audit.log({ module: 'canteen', action: 'reject', entityType: 'stockMovement', entityId: id, description: `דחיית תנועת מלאי ${m.movementNumber}: ${reason}` });
      Toast.info('התנועה נדחתה');
      renderPage();
    };
  }

  function showNewMovementModal(products) {
    let cartItems = [];
    Modal.open({
      title: 'תנועת מלאי חדשה',
      size: 'lg',
      body: `
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">סוג תנועה</label>
            <select id="sm-type" class="form-control">
              <option value="in">קבלת סחורה</option>
              <option value="out">הוצאת מלאי</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">תאריך תנועה</label>
            <input type="date" id="sm-date" class="form-control" value="${Utils.today()}">
          </div>
          <div class="form-group">
            <label class="form-label">קנטינה מקור</label>
            <select id="sm-source" class="form-control">
              <option value="">בחר קנטינה</option>
              ${canteens.map(c => `<option value="${c.id}">${Utils.escHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">קנטינה יעד</label>
            <select id="sm-dest" class="form-control">
              <option value="">בחר קנטינה</option>
              ${canteens.map(c => `<option value="${c.id}">${Utils.escHtml(c.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin:12px 0">
          <select id="sm-product" class="form-control">
            <option value="">בחר מוצר</option>
            ${products.map(p => `<option value="${p.id}" data-price="${p.price}">${Utils.escHtml(p.name)}</option>`).join('')}
          </select>
          <input type="number" id="sm-qty" class="form-control" value="1" min="1" style="width:80px">
          <button type="button" class="btn btn-secondary" onclick="window._smAddItem()">הוסף</button>
        </div>
        <div id="sm-cart"><div style="color:var(--color-text-muted);font-size:var(--font-size-sm)">פריטים ריקים</div></div>
        <div class="form-group" style="margin-top:12px">
          <label class="form-label">הערות</label>
          <textarea id="sm-notes" class="form-control" rows="2"></textarea>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">ביטול</button>
        <button class="btn btn-primary" onclick="window._saveMovement()">שלח לאישור</button>
      `,
    });

    function renderSmCart() {
      const el = Utils.el('sm-cart');
      if (!cartItems.length) { el.innerHTML = '<div style="color:var(--color-text-muted);font-size:var(--font-size-sm)">פריטים ריקים</div>'; return; }
      const total = cartItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      el.innerHTML = `<table class="data-table" style="font-size:var(--font-size-sm)">
        <thead><tr><th>מוצר</th><th>כמות</th><th>מחיר</th><th>סה"כ</th><th></th></tr></thead>
        <tbody>
          ${cartItems.map((item, i) => `<tr>
            <td>${Utils.escHtml(item.productName)}</td>
            <td>${item.quantity}</td>
            <td>₪${Utils.formatCurrency(item.unitPrice)}</td>
            <td>₪${Utils.formatCurrency(item.quantity * item.unitPrice)}</td>
            <td><button class="row-action-btn danger" onclick="window._smRemoveItem(${i})">${Utils.icon('x', 12)}</button></td>
          </tr>`).join('')}
          <tr style="font-weight:700"><td colspan="3">סה"כ</td><td>₪${Utils.formatCurrency(total)}</td><td></td></tr>
        </tbody>
      </table>`;
    }

    window._smAddItem = () => {
      const sel = Utils.el('sm-product');
      if (!sel.value) return;
      const opt = sel.selectedOptions[0];
      const price = parseFloat(opt.dataset.price) || 0;
      const qty = parseInt(Utils.el('sm-qty').value) || 1;
      const existing = cartItems.find(i => i.productId === sel.value);
      if (existing) existing.quantity += qty;
      else cartItems.push({ productId: sel.value, productName: opt.text, unitPrice: price, quantity: qty });
      renderSmCart();
    };

    window._smRemoveItem = (i) => { cartItems.splice(i, 1); renderSmCart(); };

    window._saveMovement = () => {
      if (!cartItems.length) { Toast.error('יש להוסיף פריטים'); return; }
      const u = Auth.getCurrentUser();
      const total = cartItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const sourceCanteen = UNIT_MAP[Utils.el('sm-source').value];
      const destCanteen = UNIT_MAP[Utils.el('sm-dest').value];
      const m = {
        id: 'sm_' + Utils.generateId(),
        movementNumber: 'SM-' + String(Math.floor(Math.random() * 9000) + 1000),
        movementType: Utils.el('sm-type').value,
        date: Utils.el('sm-date').value,
        movementDate: Utils.el('sm-date').value,
        sourceCanteenId: sourceCanteen ? sourceCanteen.id : '',
        sourceCanteenName: sourceCanteen ? sourceCanteen.name : '',
        destCanteenId: destCanteen ? destCanteen.id : '',
        destCanteenName: destCanteen ? destCanteen.name : '',
        notes: Utils.el('sm-notes').value,
        items: cartItems,
        totalValue: total,
        status: 'pending',
        createdBy: u ? u.firstName + ' ' + u.lastName : '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      Storage.upsert(Storage.KEYS.STOCK_MOVEMENTS, m);
      Audit.log({ module: 'canteen', action: 'create', entityType: 'stockMovement', entityId: m.id, description: `תנועת מלאי ${m.movementNumber} — ₪${Utils.formatCurrency(total)}` });
      Modal.close();
      Toast.success('התנועה נשלחה לאישור');
      renderPage();
    };
  }

  renderPage();
};
