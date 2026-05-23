/* Mode Atlas save repair: data cleanup lives with save/storage logic, not UI polish. */
(function ModeAtlasSaveRepairModule(){
  if (window.__modeAtlasSaveRepairLoaded) return;
  window.__modeAtlasSaveRepairLoaded = true;

  const Store = window.ModeAtlasStorage;
  const K = Store?.KEYS || {};

  function storeGet(key, fallback){
    return Store?.get?.(key, fallback) ?? localStorage.getItem(key) ?? fallback;
  }

  function storeSet(key, value){
    return Store?.set?.(key, value) ?? localStorage.setItem(key, String(value));
  }

  function readJSON(key, fallback){
    try {
      if (Store?.json) return Store.json(key, fallback);
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }
    catch(e) { return fallback; }
  }

  function writeJSON(key, value){
    try {
      Store?.setJSON?.(key, value) ?? localStorage.setItem(key, JSON.stringify(value));
      return true;
    }
    catch(e) { return false; }
  }

  function arrayValue(key){
    var value = readJSON(key, []);
    return Array.isArray(value) ? value : [];
  }

  function signature(item){
    if (item && typeof item === 'object') {
      return String(item.id || item.createdAt || item.completedAt || item.date || item.startedAt || '') + '|' + JSON.stringify(item).slice(0, 220);
    }
    return String(item);
  }

  function dedupeArrayKey(key){
    var input = arrayValue(key);
    if (!input.length) return 0;
    var seen = new Set();
    var output = [];
    input.forEach(function(item){
      var sig = signature(item);
      if (seen.has(sig)) return;
      seen.add(sig);
      output.push(item);
    });
    if (output.length === input.length) return 0;
    writeJSON(key, output);
    return input.length - output.length;
  }


  function ensureSectionTimestamps(){
    var now = Date.now();
    var changed = 0;
    var map = {
      settingsUpdatedAt: ['settings','reverseSettings','modeAtlasThemePreference','modeAtlasDisplayMode'],
      resultsUpdatedAt: [K.readingTestResults||'testModeResults',K.readingTestResultsBackup||'readingTestModeResults',K.writingTestResults||'writingTestModeResults','kanaTrainerReadingTestModeResults','kanaTrainerWritingTestModeResults',K.readingCharStats||'charStats',K.writingCharStats||'reverseCharStats',K.readingCharTimes||'charTimes',K.writingCharTimes||'reverseCharTimes'],
      srsUpdatedAt: ['charSrs','reverseCharSrs'],
      dailyUpdatedAt: [K.readingDailyHistory||'dailyChallengeHistory',K.writingDailyHistory||'reverseDailyChallengeHistory'],
      profileUpdatedAt: ['modeAtlasLastCloudSyncAt','modeAtlasLastUserId']
    };
    Object.keys(map).forEach(function(tsKey){
      if (storeGet(tsKey, '')) return;
      var hasData = map[tsKey].some(function(key){ return storeGet(key, null) !== null; });
      if (hasData) { storeSet(tsKey, String(now)); changed += 1; }
    });
    return changed;
  }

  function repairDataModel(){
    var result = repairSaveData();
    var timestampChanges = ensureSectionTimestamps();
    var meta = {
      settingsUpdatedAt: Number(storeGet('settingsUpdatedAt', '0') || 0),
      resultsUpdatedAt: Number(storeGet('resultsUpdatedAt', '0') || 0),
      srsUpdatedAt: Number(storeGet('srsUpdatedAt', '0') || 0),
      dailyUpdatedAt: Number(storeGet('dailyUpdatedAt', '0') || 0),
      profileUpdatedAt: Number(storeGet('profileUpdatedAt', '0') || 0)
    };
    try { window.dispatchEvent(new CustomEvent('modeAtlasDataModelRepaired', { detail: meta })); } catch(e) {}
    return {
      changed: (result.changed || 0) + timestampChanges,
      summary: timestampChanges ? result.summary + ' · timestamps checked' : result.summary,
      meta: meta
    };
  }

  function repairSaveData(){
    var changed = 0;
    [
      'testModeResults',
      'readingTestModeResults',
      'kanaTrainerReadingTestModeResults',
      'writingTestModeResults',
      'kanaTrainerWritingTestModeResults'
    ].forEach(function(key){ changed += dedupeArrayKey(key); });

    if (!storeGet('modeAtlasDataVersion', '')) {
      storeSet('modeAtlasDataVersion', String((window.ModeAtlasEnv && window.ModeAtlasEnv.appVersion) || window.ModeAtlasVersion || 'dev-local'));
      changed += 1;
    }

    try { window.KanaCloudSync && window.KanaCloudSync.scheduleSync && window.KanaCloudSync.scheduleSync(500); } catch(e) {}
    return { changed: changed, summary: changed ? changed + ' cleanup change(s)' : 'no problems found' };
  }

  function bindRepairButtons(){
    document.querySelectorAll('[data-ma-repair-data]').forEach(function(btn){
      if (btn.dataset.maRepairBound === '1') return;
      btn.dataset.maRepairBound = '1';
      btn.addEventListener('click', function(e){
        e.preventDefault();
        var result = repairSaveData();
        try { window.ModeAtlas && window.ModeAtlas.toast && window.ModeAtlas.toast('Repair complete · ' + result.summary, 'ok', 4200); } catch(err) {}
      });
    });
  }

  window.ModeAtlas = window.ModeAtlas || {};
  window.ModeAtlas.repairSaveData = repairSaveData;
  window.ModeAtlas.repairDataModel = repairDataModel;

  function boot(){ repairDataModel(); bindRepairButtons(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('pageshow', bindRepairButtons);
  document.addEventListener('ma:ui-refresh', bindRepairButtons);
})();
