/* canteen-data.js — shared canteen products / stock helpers (idempotent, backward compatible) */
'use strict';

window.CanteenData = (function() {
  const BASE_STOCK = 200; // opening stock per canteen for demo products

  function canteens() {
    return CANTEENS;
  }
  // resolves ids of the earlier two-canteen demo to the canonical ones
  function canon(id) { return (window.LEGACY_CANTEEN_MAP && LEGACY_CANTEEN_MAP[id]) || id; }
  function canteenName(id) { const c = CANTEENS.find(x => x.id === canon(id)); return c ? c.name : '—'; }

  // Products live in their own collection; seeded once from the demo catalogue.
  function products() {
    let list = Storage.getCollection(Storage.KEYS.CANTEEN_PRODUCTS);
    if (!list || !list.length) {
      const src = (window.DataSeed && DataSeed.PRODUCTS) || [];
      list = src.map(p => ({ id: 'prd_' + p.code, code: p.code, name: p.name, price: p.price, category: p.category, returnable: !!p.returnable, minStock: 20 }));
      if (list.length) Storage.setCollection(Storage.KEYS.CANTEEN_PRODUCTS, list);
    }
    return list;
  }

  function findProduct(codeOrId) {
    return products().find(p => p.id === codeOrId || p.code === codeOrId);
  }

  function purchaseItems(purchase) {
    const raw = purchase.items || [];
    if (!raw.length) return [];
    if (typeof raw[0] === 'object') return raw;
    const all = Storage.getCollection(Storage.KEYS.CANTEEN_PURCHASE_ITEMS);
    return raw.map(id => all.find(i => i.id === id)).filter(Boolean);
  }

  function movementItems(mov) {
    const raw = mov.items || [];
    if (!raw.length) return [];
    if (typeof raw[0] === 'object') return raw;
    const all = Storage.getCollection(Storage.KEYS.STOCK_MOVEMENT_ITEMS);
    return raw.map(id => all.find(i => i.id === id)).filter(Boolean);
  }

  const isApproved = m => m.status === 'approved' || m.status === 'completed';

  // current stock of a product in one canteen
  function stockOf(productCode, canteenId) {
    let stock = BASE_STOCK;
    Storage.getCollection(Storage.KEYS.STOCK_MOVEMENTS).filter(isApproved).forEach(m => {
      movementItems(m).forEach(it => {
        if (it.productCode !== productCode) return;
        const q = Number(it.approvedQty != null ? it.approvedQty : it.requestedQty) || 0;
        if (canon(m.destCanteenId) === canteenId) stock += q;
        if (canon(m.sourceCanteenId) === canteenId) stock -= q;
      });
    });
    Storage.getCollection(Storage.KEYS.CANTEEN_PURCHASES).filter(p => canon(p.canteenId) === canteenId && p.status !== 'cancelled').forEach(p => {
      purchaseItems(p).forEach(it => {
        if (it.productCode === productCode) stock -= (Number(it.quantity) || 0) - (Number(it.returnedQuantity) || 0);
      });
    });
    return stock;
  }

  // safe money text: formatCurrency already includes the ₪ sign
  function money(v) {
    return (v == null || isNaN(Number(v))) ? '—' : Utils.formatCurrency(Number(v));
  }

  return { canteens, canon, canteenName, products, findProduct, purchaseItems, movementItems, isApproved, stockOf, money };
})();
