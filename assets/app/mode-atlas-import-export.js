/* Mode Atlas import/export UI. Owns save, backup import preview, and reset-data controls. */
(function ModeAtlasUnifiedSaveSyncUi(){
  if (window.__modeAtlasUnifiedSaveSyncUiLoaded) return;
  window.__modeAtlasUnifiedSaveSyncUiLoaded = true;

  // Save/import controls are rendered by assets/ui/mode-atlas-settings-menu.js.


  const RESET_WARNING = 'Reset all Mode Atlas data?\n\nThis clears local save data on this device. If you are signed in and cloud is available, it also clears the cloud save data for this account. This cannot be undone.';

  function fallbackBackup(){
    const data = {};
    const block = /^(firebase:|firestore|google|__|debug|devtools)/i;
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k || block.test(k)) continue;
      data[k] = localStorage.getItem(k);
    }
    return { app: 'Mode Atlas', version: 2, exportedAt: new Date().toISOString(), data };
  }

  function getBackup(){
    try { return window.KanaCloudSync?.createBackup?.() || fallbackBackup(); }
    catch { return fallbackBackup(); }
  }

  function setStatus(message){
    document.querySelectorAll('#profileStatus,#studyProfileStatus,#identityStatus,#wordBankCloudStatus').forEach((el) => {
      if (el) el.textContent = message;
    });
  }

  function markBackupExported(){
    try {
      const now = String(Date.now());
      window.ModeAtlasStorage?.set?.('modeAtlasLastExportAt', now) ?? localStorage.setItem('modeAtlasLastExportAt', now);
      window.ModeAtlasStorage?.set?.('modeAtlasLastBackupAt', now) ?? localStorage.setItem('modeAtlasLastBackupAt', now);
      document.dispatchEvent(new CustomEvent('ma:progress-updated', { detail: { source: 'backup-export' } }));
      window.ModeAtlasFeatures?.checkAchievements?.();
    } catch {}
  }

  function downloadBackup(){
    const backup = getBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mode-atlas-save-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    markBackupExported();
    setStatus('Save exported.');
    refreshSyncPills();
  }

  async function copyBackup(){
    const txt = JSON.stringify(getBackup(), null, 2);
    try {
      await navigator.clipboard.writeText(txt);
      markBackupExported();
      setStatus('Save copied.');
    } catch {
      downloadBackup();
    }
    refreshSyncPills();
  }




  function createImportEl(tag, className = '', text = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== '') el.textContent = text;
    return el;
  }

  function appendStrongLine(parent, label, value) {
    const span = document.createElement('span');
    span.append(document.createTextNode(label + ': '));
    const strong = document.createElement('strong');
    strong.textContent = String(value);
    span.append(strong);
    parent.append(span);
  }

  function fallbackImportPreview(parsed){
    const Store = window.ModeAtlasStorage;
    const K = Store?.KEYS || {};
    const readingKeys = Store?.modeKeys?.('reading') || {};
    const writingKeys = Store?.modeKeys?.('writing') || {};
    const legacy = {
      readingTests: ['testModeResults', K.readingTestResultsBackup, 'kanaTrainerTestModeResults', 'kanaTrainerReadingTestModeResults'].filter(Boolean),
      writingTests: [K.writingTestResults, K.writingTestResultsBackup, 'kanaTrainerWritingTestModeResults'].filter(Boolean)
    };

    const data = parsed?.data || parsed?.localStorage || parsed;
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid save file');

    const has = (key) => !!key && Object.prototype.hasOwnProperty.call(data, key);
    const readArray = (key) => {
      if (!has(key)) return [];
      const value = data[key];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try { const parsedValue = JSON.parse(value); return Array.isArray(parsedValue) ? parsedValue : []; }
        catch { return []; }
      }
      return [];
    };
    const countObj = (key) => {
      if (!has(key)) return 0;
      const value = data[key];
      let parsedValue = value;
      if (typeof value === 'string') {
        try { parsedValue = JSON.parse(value); } catch { parsedValue = null; }
      }
      return parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue) ? Object.keys(parsedValue).length : 0;
    };
    const modeWillImport = (keys) => Object.values(keys || {}).some(has);
    const maxArrayCount = (keys) => Math.max(0, ...(keys || []).map((key) => readArray(key).length));

    const sections = [
      {
        name:'reading',
        label:'Reading Practice',
        current: Object.keys(Store?.readModeJSON?.('reading','charStats',{}) || {}).length + ' kana stats',
        incoming: countObj(readingKeys.charStats) + ' kana stats',
        willImport: modeWillImport(readingKeys)
      },
      {
        name:'writing',
        label:'Writing Practice',
        current: Object.keys(Store?.readModeJSON?.('writing','charStats',{}) || {}).length + ' kana stats',
        incoming: countObj(writingKeys.charStats) + ' kana stats',
        willImport: modeWillImport(writingKeys)
      },
      {
        name:'readingTests',
        label:'Reading Test Results',
        current: readArrayFromLocal(K.readingTestResults || 'testModeResults').length + ' reading tests',
        incoming: maxArrayCount(legacy.readingTests).toString() + ' reading tests',
        willImport: legacy.readingTests.some(has)
      },
      {
        name:'writingTests',
        label:'Writing Test Results',
        current: readArrayFromLocal(K.writingTestResults || 'writingTestModeResults').length + ' writing tests',
        incoming: maxArrayCount(legacy.writingTests).toString() + ' writing tests',
        willImport: legacy.writingTests.some(has)
      },
      {
        name:'wordBank',
        label:'Word Bank',
        current: readArrayFromLocal(K.wordBank || 'kanaWordBank').length + ' word bank items',
        incoming: readArray(K.wordBank || 'kanaWordBank').length + ' word bank items',
        willImport: has(K.wordBank || 'kanaWordBank')
      }
    ].map((section) => ({ ...section, action: section.willImport ? 'Will replace from backup' : 'Will keep current data' }));
    return { exportedAt: Date.parse(parsed?.exportedAt || '') || 0, sections };
  }

  function readArrayFromLocal(key){
    try { const value = window.ModeAtlasStorage?.json?.(key, []) ?? []; return Array.isArray(value) ? value : []; }
    catch { return []; }
  }

  function buildImportPreview(parsed){
    if (window.KanaCloudSync?.previewLocalBackup) return window.KanaCloudSync.previewLocalBackup(parsed);
    return fallbackImportPreview(parsed);
  }

  function closeImportConfirm(){
    document.getElementById('maImportConfirmModal')?.classList.remove('open');
  }

  function ensureImportConfirmModal(){
    let modal = document.getElementById('maImportConfirmModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'maImportConfirmModal';
    modal.className = 'ma-import-confirm-backdrop';
    const card = createImportEl('div', 'ma-import-confirm-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'maImportConfirmTitle');

    const head = createImportEl('div', 'ma-import-confirm-head');
    const titleWrap = document.createElement('div');
    titleWrap.append(createImportEl('div', 'ma-import-confirm-kicker', 'Save import'));
    const title = createImportEl('h2', '', 'Review imported save');
    title.id = 'maImportConfirmTitle';
    titleWrap.append(title);

    const closeBtn = createImportEl('button', 'ma-import-confirm-x', '×');
    closeBtn.type = 'button';
    closeBtn.dataset.maImportCancel = '';
    closeBtn.setAttribute('aria-label', 'Cancel import');
    head.append(titleWrap, closeBtn);

    const copy = createImportEl('p', 'ma-import-confirm-copy', 'Manual imports use the selected backup for any section that contains real data. Empty backup sections will not erase useful current data.');

    const meta = createImportEl('div', 'ma-import-confirm-meta');
    meta.dataset.maImportMeta = '';
    const table = createImportEl('div', 'ma-import-confirm-table');
    table.dataset.maImportTable = '';

    const actions = createImportEl('div', 'ma-import-confirm-actions');
    const cancel = createImportEl('button', 'ma-import-confirm-button', 'Cancel');
    cancel.type = 'button';
    cancel.dataset.maImportCancel = '';
    const cont = createImportEl('button', 'ma-import-confirm-button ma-primary', 'Continue import');
    cont.type = 'button';
    cont.dataset.maImportContinue = '';
    actions.append(cancel, cont);

    card.append(head, copy, meta, table, actions);
    modal.replaceChildren(card);
    document.body.appendChild(modal);
    return modal;
  }

  function formatImportDate(ts){
    const n = Number(ts || 0);
    if (!Number.isFinite(n) || !n) return 'unknown export date';
    const date = new Date(n);
    if (Number.isNaN(date.getTime())) return 'unknown export date';
    return date.toLocaleString([], { day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' });
  }

  function showImportConfirm(parsed){
    const preview = buildImportPreview(parsed);
    const modal = ensureImportConfirmModal();
    const meta = modal.querySelector('[data-ma-import-meta]');
    const table = modal.querySelector('[data-ma-import-table]');
    const importing = (preview.sections || []).filter((section) => section.willImport).length;
    meta.replaceChildren();
    appendStrongLine(meta, 'Backup exported', formatImportDate(preview.exportedAt));
    appendStrongLine(meta, 'Sections to import', importing);

    const head = createImportEl('div', 'ma-import-confirm-row head');
    ['Section', 'Current loaded', 'Imported save', 'Action'].forEach(label => head.append(createImportEl('span', '', label)));

    const rows = (preview.sections || []).map((section) => {
      const row = createImportEl('div', 'ma-import-confirm-row');

      const label = document.createElement('span');
      const strong = document.createElement('strong');
      strong.textContent = String(section.label || '');
      label.append(strong);

      row.append(
        label,
        createImportEl('span', '', section.current || ''),
        createImportEl('span', '', section.incoming || '')
      );

      const action = createImportEl('span', section.willImport ? 'will-import' : 'will-keep', section.action || '');
      row.append(action);
      return row;
    });

    table.replaceChildren(head, ...rows);
    modal.classList.add('open');
    return new Promise((resolve) => {
      const continueBtn = modal.querySelector('[data-ma-import-continue]');
      const cancelButtons = modal.querySelectorAll('[data-ma-import-cancel]');
      const cleanup = () => {
        continueBtn.onclick = null;
        cancelButtons.forEach((button) => { button.onclick = null; });
        modal.onclick = null;
        document.removeEventListener('keydown', onKeydown, true);
      };
      const finish = (accepted) => { cleanup(); closeImportConfirm(); resolve(accepted); };
      const onKeydown = (event) => { if (event.key === 'Escape') finish(false); };
      continueBtn.onclick = () => finish(true);
      cancelButtons.forEach((button) => { button.onclick = () => finish(false); });
      modal.onclick = (event) => { if (event.target === modal) finish(false); };
      document.addEventListener('keydown', onKeydown, true);
    });
  }

  async function applyImportPayload(parsed){
    if (window.KanaCloudSync?.importLocalBackup) {
      return window.KanaCloudSync.importLocalBackup(parsed);
    }
    const data = parsed.data || parsed.localStorage || parsed;
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid save file');
    Object.entries(data).forEach(([k,v]) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)));
    return { updated: ['local'], keptLocal: [], cloudSynced: false };
  }

  async function previewAndImport(parsed, options = {}){
    const confirmed = await showImportConfirm(parsed);
    if (!confirmed) {
      setStatus('Import cancelled.');
      return false;
    }
    setStatus('Importing backup...');
    const result = await applyImportPayload(parsed);
    setStatus('Save imported. Reloading...');
    if (typeof options.afterImport === 'function') options.afterImport(result);
    else setTimeout(() => location.reload(), 350);
    return true;
  }

  async function importBackupFile(file){
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text || '{}');
      setStatus('Review import before continuing...');
      await previewAndImport(parsed);
    } catch (error) {
      console.warn('Save import failed.', error);
      setStatus('Import failed. Please choose a valid Mode Atlas save file.');
    }
  }

  window.ModeAtlasImportUi = { previewAndImport, buildImportPreview };

  async function resetData(){
    if (!confirm(RESET_WARNING)) return;
    try {
      setStatus('Resetting save data...');
      if (window.KanaCloudSync?.ready) await window.KanaCloudSync.ready;
      if (window.KanaCloudSync?.resetAllData) await window.KanaCloudSync.resetAllData();
      else { localStorage.clear(); sessionStorage.clear(); }
      location.href = 'index.html';
    } catch (error) {
      console.warn('Reset failed.', error);
      alert('Reset failed. Please check your connection and try again.');
      setStatus('Reset failed.');
    }
  }

  function statusFallback(){
    const user = window.KanaCloudSync?.getUser?.();
    const lastSync = window.ModeAtlasStorage?.number?.('modeAtlasLastCloudSyncAt', 0) ?? Number(localStorage.getItem('modeAtlasLastCloudSyncAt') || 0);
    if (!user) return { tone: 'local', text: 'Local saving · log in for cloud save' };
    if (navigator.onLine === false) return { tone: 'warning', text: 'No cloud access · last sync ' + (lastSync ? new Date(lastSync).toLocaleString([], { hour:'numeric', minute:'2-digit', day:'numeric', month:'numeric', year:'2-digit' }) : 'never') };
    return { tone: 'ok', text: 'Cloud save synced' };
  }

  function getSyncStatus(){
    try { return window.KanaCloudSync?.getSyncStatus?.() || statusFallback(); }
    catch { return statusFallback(); }
  }

  function refreshSyncPills(){
    window.ModeAtlasProfile?.refresh?.();
  }

  function rebuildSaveSections(){
    refreshSyncPills();
  }


  document.addEventListener('click', (event) => {
    const exportBtn = event.target.closest('[data-ma-unified-export]');
    const copyBtn = event.target.closest('[data-ma-unified-copy]');
    const importBtn = event.target.closest('[data-ma-unified-import]');
    const resetBtn = event.target.closest('[data-ma-unified-reset]');
    if (!exportBtn && !copyBtn && !importBtn && !resetBtn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (exportBtn) downloadBackup();
    if (copyBtn) copyBackup();
    if (importBtn) importBtn.closest('.ma-save-section')?.querySelector('[data-ma-unified-file]')?.click();
    if (resetBtn) resetData();
  }, true);

  document.addEventListener('change', (event) => {
    const input = event.target.closest('[data-ma-unified-file]');
    if (!input) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    importBackupFile(input.files && input.files[0]);
    input.value = '';
  }, true);

  function boot(){
    rebuildSaveSections();
    window.ModeAtlasLifecycle?.requestUiRefresh?.('import-export-boot');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('ma:ui-refresh', rebuildSaveSections);
  window.addEventListener('kanaCloudSyncStatusChanged', () => window.ModeAtlasLifecycle?.requestUiRefresh?.('cloud-sync-status'));
  window.addEventListener('online', () => window.ModeAtlasLifecycle?.requestUiRefresh?.('online'));
  window.addEventListener('offline', () => window.ModeAtlasLifecycle?.requestUiRefresh?.('offline'));
  window.addEventListener('focus', () => window.ModeAtlasLifecycle?.requestUiRefresh?.('focus'));
  window.addEventListener('pageshow', () => window.ModeAtlasLifecycle?.requestUiRefresh?.('pageshow'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) window.ModeAtlasLifecycle?.requestUiRefresh?.('visible'); });
  // Profile drawers are built during initial page load; avoid a document-wide observer here, because status text updates can retrigger it continuously.
})();
