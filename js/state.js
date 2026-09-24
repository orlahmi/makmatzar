/* state.js — global application state */
'use strict';

window.AppState = (function() {
  const state = {
    currentUser: null,
    currentBase: null,
    sidebarCollapsed: false,
    currentRoute: null,
    unsavedChanges: false,
    notifications: [],
    uiPrefs: {}
  };

  const listeners = {};

  function get(key) {
    if (key) return state[key];
    return { ...state };
  }

  function set(key, value) {
    const old = state[key];
    state[key] = value;
    emit(key, value, old);
  }

  function subscribe(key, fn) {
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(fn);
    return () => {
      listeners[key] = listeners[key].filter(f => f !== fn);
    };
  }

  function emit(key, newVal, oldVal) {
    (listeners[key] || []).forEach(fn => fn(newVal, oldVal));
    (listeners['*'] || []).forEach(fn => fn(key, newVal, oldVal));
  }

  function loadUiPrefs() {
    const prefs = Storage.get(Storage.KEYS.UI_PREFS) || {};
    state.uiPrefs = prefs;
    state.sidebarCollapsed = prefs.sidebarCollapsed || false;
  }

  function saveUiPref(key, value) {
    state.uiPrefs[key] = value;
    Storage.set(Storage.KEYS.UI_PREFS, state.uiPrefs);
  }

  return {
    get, set, subscribe, loadUiPrefs, saveUiPref
  };
})();
