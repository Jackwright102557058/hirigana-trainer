/* Mode Atlas shared local storage helpers.
   Keeps the existing localStorage key names intact while giving modules one safe API. */
(function () {
  'use strict';

  const KEYS = Object.freeze({
    readingSettings: 'settings', writingSettings: 'reverseSettings',
    readingStats: 'stats', writingStats: 'reverseStats',
    readingCharStats: 'charStats', writingCharStats: 'reverseCharStats',
    readingCharTimes: 'charTimes', writingCharTimes: 'reverseCharTimes',
    readingSrs: 'charSrs', writingSrs: 'reverseCharSrs',
    readingScoreHistory: 'scoreHistory', writingScoreHistory: 'reverseScoreHistory',
    readingDailyHistory: 'dailyChallengeHistory', writingDailyHistory: 'reverseDailyChallengeHistory',
    readingHighScore: 'highScore', writingHighScore: 'reverseHighScore',
    readingTestResults: 'testModeResults', writingTestResults: 'writingTestModeResults',
    readingTestResultsBackup: 'readingTestModeResults', writingTestResultsBackup: 'reverseTestModeResults',
    testResultsUpdatedAt: 'testModeResultsUpdatedAt', writingTestResultsUpdatedAt: 'writingTestModeResultsUpdatedAt',
    displayMode: 'modeAtlasDisplayMode', soundMode: 'modeAtlasSoundMode',
    activePreset: 'modeAtlasActivePreset', startReadingPreset: 'modeAtlasStartReadingPreset',
    wordBank: 'kanaWordBank'
  });

  const GROUPS = Object.freeze({
    reading: Object.freeze({
      settings: KEYS.readingSettings,
      charStats: KEYS.readingCharStats,
      charTimes: KEYS.readingCharTimes,
      srs: KEYS.readingSrs,
      scoreHistory: KEYS.readingScoreHistory,
      dailyHistory: KEYS.readingDailyHistory,
      highScore: KEYS.readingHighScore,
      testResults: KEYS.readingTestResults
    }),
    writing: Object.freeze({
      settings: KEYS.writingSettings,
      charStats: KEYS.writingCharStats,
      charTimes: KEYS.writingCharTimes,
      srs: KEYS.writingSrs,
      scoreHistory: KEYS.writingScoreHistory,
      dailyHistory: KEYS.writingDailyHistory,
      highScore: KEYS.writingHighScore,
      testResults: KEYS.writingTestResults
    })
  });

  const SCHEMA_VERSION = 1;

  const COMPAT_KEYS = Object.freeze({
    readingTests: Object.freeze([
      KEYS.readingTestResults,
      KEYS.readingTestResultsBackup,
      'kanaTrainerTestModeResults',
      'kanaTrainerReadingTestModeResults'
    ]),
    writingTests: Object.freeze([
      KEYS.writingTestResults,
      KEYS.writingTestResultsBackup,
      'kanaTrainerWritingTestModeResults'
    ])
  });


  function modeKeys(mode) {
    return GROUPS[mode === 'writing' || mode === 'reverse' ? 'writing' : 'reading'];
  }
  function readModeJSON(mode, name, fallback) {
    const key = modeKeys(mode)?.[name];
    return key ? json(key, fallback) : fallback;
  }
  function writeModeJSON(mode, name, value) {
    const key = modeKeys(mode)?.[name];
    return key ? setJSON(key, value) : false;
  }
  function readModeNumber(mode, name, fallback = 0) {
    const key = modeKeys(mode)?.[name];
    return key ? number(key, fallback) : fallback;
  }
  function writeModeNumber(mode, name, value) {
    const key = modeKeys(mode)?.[name];
    return key ? set(key, value) : false;
  }


  function safeParse(value, fallback) {
    if (value == null || value === '') return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  }
  function get(key, fallback = '') {
    try { const value = localStorage.getItem(key); return value == null ? fallback : value; } catch { return fallback; }
  }
  function set(key, value) { try { localStorage.setItem(key, String(value)); markUpdatedForKey(key); return true; } catch { return false; } }
  function remove(key) { try { localStorage.removeItem(key); return true; } catch { return false; } }
  function has(key) { try { return localStorage.getItem(key) !== null; } catch { return false; } }
  function json(key, fallback) { return safeParse(get(key, null), fallback); }
  function setJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); markUpdatedForKey(key); return true; } catch { return false; } }
  function number(key, fallback = 0) { const n = Number(get(key, '')); return Number.isFinite(n) ? n : fallback; }
  function now(key) { const ts = String(Date.now()); set(key, ts); return ts; }
  function removeMany(keys) { (keys || []).forEach(remove); }
  function collect(keys) { const out = {}; (keys || []).forEach(key => { out[key] = get(key, null); }); return out; }
  function apply(map) { Object.entries(map || {}).forEach(([key, value]) => { if (value !== undefined) set(key, typeof value === 'string' ? value : JSON.stringify(value)); }); }
  function snapshot(prefix) {
    const out = {};
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || (prefix && !key.startsWith(prefix))) continue;
        out[key] = localStorage.getItem(key);
      }
    } catch {}
    return out;
  }
  function markUpdatedForKey(key) {
    const name = String(key || '');
    if (/^(settings|reverseSettings|modeAtlasThemePreference|modeAtlasDisplayMode|modeAtlasSoundMode)$/.test(name)) return now('settingsUpdatedAt');
    if (/(testModeResults|charStats|reverseCharStats|charTimes|reverseCharTimes|scoreHistory)/.test(name)) return now('resultsUpdatedAt');
    if (/(charSrs|reverseCharSrs)/.test(name)) return now('srsUpdatedAt');
    if (/dailyChallengeHistory/.test(name)) return now('dailyUpdatedAt');
    return '';
  }

  window.ModeAtlasStorage = Object.freeze({ KEYS, GROUPS, COMPAT_KEYS, SCHEMA_VERSION, modeKeys, readModeJSON, writeModeJSON, readModeNumber, writeModeNumber, safeParse, get, set, remove, has, json, setJSON, number, now, removeMany, collect, apply, snapshot, markUpdatedForKey });
})();
