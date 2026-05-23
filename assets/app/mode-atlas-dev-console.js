(function ModeAtlasDevConsole(){
  'use strict';
  if (window.__modeAtlasDevConsoleLoaded) return;
  window.__modeAtlasDevConsoleLoaded = true;

  const DEV_PIN = '3522';
  const $ = (sel, root = document) => root.querySelector(sel);
  const toast = (message, type = 'info', ms = 2800) => {
    try { return window.ModeAtlas?.toast?.(message, type, ms); } catch { return null; }
  };

  function storeGet(key, fallback = '') {
    const store = window.ModeAtlasStorage;
    return store?.get?.(key, fallback) ?? localStorage.getItem(key) ?? fallback;
  }

  function storeJSON(key, fallback) {
    const store = window.ModeAtlasStorage;
    if (store?.json) return store.json(key, fallback);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }

  function canUseDevTools(){
    try {
      return !!(
        (window.ModeAtlasEnv && window.ModeAtlasEnv.allowDevTools) ||
        sessionStorage.getItem('modeAtlasDevTools') === '1' ||
        storeGet('modeAtlasDevTools') === '1'
      );
    } catch { return false; }
  }

  function pageName(){
    try { if (window.ModeAtlasPageName) return String(window.ModeAtlasPageName()).toLowerCase(); } catch {}
    return (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  }

  function fmtDate(ts){
    const n = Number(ts || 0);
    if (!Number.isFinite(n) || !n) return 'never';
    try { return new Date(n).toLocaleString([], { hour:'numeric', minute:'2-digit', day:'numeric', month:'numeric', year:'2-digit' }); }
    catch { return 'never'; }
  }

  function safeJSON(key, fallback){
    try { return storeJSON(key, fallback); } catch { return fallback; }
  }

  function statTotals(key){
    const stats = safeJSON(key, {});
    let correct = 0, wrong = 0;
    Object.values(stats || {}).forEach(value => {
      if (!value || typeof value !== 'object') return;
      correct += Number(value.correct || value.right || 0);
      wrong += Number(value.wrong || value.incorrect || 0);
    });
    const total = correct + wrong;
    return { correct, wrong, total, accuracy: total ? Math.round((correct / total) * 100) : 0 };
  }

  function countArray(key){
    const value = safeJSON(key, []);
    return Array.isArray(value) ? value.length : 0;
  }

  function devData(){
    const status = window.KanaCloudSync?.getSyncStatus?.() || {};
    let bytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        bytes += (key?.length || 0) + (localStorage.getItem(key)?.length || 0);
      }
    } catch {}
    const reading = statTotals('charStats');
    const writing = statTotals('reverseCharStats');
    const themePref = window.ModeAtlasTheme?.getPreference?.() || storeGet('modeAtlasThemePreference', 'system') || 'system';
    const themeEffective = window.ModeAtlasTheme?.getEffective?.() || themePref;
    return {
      version: (window.ModeAtlasEnv && window.ModeAtlasEnv.appVersion) || window.ModeAtlasVersion || 'dev-local',
      page: pageName(),
      url: location.href,
      theme: `${themePref} / ${themeEffective}`,
      online: navigator.onLine !== false,
      cloudState: status.text || 'n/a',
      cloudLastSync: fmtDate(status.lastSync || storeGet('modeAtlasLastCloudSyncAt', '0')),
      signedIn: !!status.user,
      localStorageKeys: localStorage.length,
      approximateLocalBytes: bytes,
      safeMode: sessionStorage.getItem('modeAtlasSafeMode') === '1',
      readingAccuracy: reading.accuracy,
      writingAccuracy: writing.accuracy,
      readingAnswers: reading.total,
      writingAnswers: writing.total,
      readingTests: countArray('testModeResults') + countArray('readingTestModeResults') + countArray('kanaTrainerReadingTestModeResults'),
      writingTests: countArray('writingTestModeResults') + countArray('kanaTrainerWritingTestModeResults')
    };
  }


  function devEl(tag, className = '', text = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== '') el.textContent = String(text);
    return el;
  }

  function devButton(label, action) {
    const button = devEl('button', 'ma-ui-btn', label);
    button.type = 'button';
    button.dataset[action] = '';
    return button;
  }

  function openDevMenu(){
    const pin = prompt('Developer PIN');
    if (pin !== DEV_PIN) {
      if (pin !== null) toast('Incorrect PIN.', 'err');
      return;
    }
    const data = devData();
    let backdrop = $('#maDevMenu');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'maDevMenu';
      backdrop.className = 'ma-dev-backdrop';
      document.body.appendChild(backdrop);
    }
    const modal = devEl('div', 'ma-dev-modal');
    const head = devEl('div', 'ma-dev-head');
    head.append(devEl('h2', '', 'Mode Atlas Dev Diagnostics'), devButton('Close', 'maDevClose'));

    const actions = devEl('div', 'ma-dev-actions');
    actions.append(
      devButton('Copy diagnostics', 'maDevCopy'),
      devButton('Repair save data', 'maDevRepair'),
      devButton('Force sync', 'maDevSync'),
      devButton('Safe mode reload', 'maDevSafe'),
      devButton('Test sound', 'maDevTestSound'),
      devButton('Refresh app assets', 'maDevRefreshAssets')
    );

    const table = devEl('div', 'ma-dev-table');
    Object.entries(data).forEach(([key, value]) => {
      const row = devEl('div', 'ma-dev-row');
      row.append(devEl('div', 'ma-dev-key', key), devEl('div', 'ma-dev-val', String(value)));
      table.append(row);
    });

    modal.append(head, actions, table);
    backdrop.replaceChildren(modal);
    backdrop.classList.add('open');
    backdrop.onclick = event => {
      if (event.target === backdrop || event.target.closest('[data-ma-dev-close]')) backdrop.classList.remove('open');
      if (event.target.closest('[data-ma-dev-copy]')) navigator.clipboard?.writeText(JSON.stringify(devData(), null, 2)).then(() => toast('Diagnostics copied.'));
      if (event.target.closest('[data-ma-dev-repair]')) {
        const result = window.ModeAtlas?.repairSaveData?.() || { summary: 'repair unavailable' };
        toast('Repair complete · ' + result.summary);
      }
      if (event.target.closest('[data-ma-dev-sync]')) {
        window.KanaCloudSync?.syncNow?.();
        toast('Sync requested.');
      }
      if (event.target.closest('[data-ma-dev-safe]')) {
        sessionStorage.setItem('modeAtlasSafeMode', '1');
        location.reload();
      }
      if (event.target.closest('[data-ma-dev-test-sound]')) {
        window.ModeAtlasSounds?.testSound?.();
      }
      if (event.target.closest('[data-ma-dev-refresh-assets]')) {
        toast('Refreshing app assets…');
        window.ModeAtlasInstall?.refreshAppAssets?.({ reload: true }) || location.reload();
      }
    };
  }

  function installHiddenDevButton(){
    if (!canUseDevTools() || $('#maHiddenDevTrigger')) return;
    const button = document.createElement('button');
    button.id = 'maHiddenDevTrigger';
    button.className = 'ma-hidden-dev-trigger';
    button.type = 'button';
    button.setAttribute('aria-label', 'Developer diagnostics');
    button.addEventListener('click', openDevMenu);
    document.body.appendChild(button);
  }

  window.ModeAtlasDevConsole = { canUseDevTools, open: openDevMenu, data: devData };
  window.dev = function(){
    if (!canUseDevTools()) {
      toast('Developer tools are hidden in this build.');
      return null;
    }
    return openDevMenu();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installHiddenDevButton, { once: true });
  else installHiddenDevButton();
})();
