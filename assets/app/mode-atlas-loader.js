/* Mode Atlas loader lifecycle bridge. Timing is owned by mode-atlas-early-loader.js. */
(function ModeAtlasLoaderBridge(){
  if (window.__modeAtlasLoaderBridgeInstalled) return;
  window.__modeAtlasLoaderBridgeInstalled = true;

  function markSyncCheck(){
    try { window.ModeAtlasStorage?.set?.('modeAtlasLastSyncCheck', String(Date.now())); } catch {}
  }

  function hideLoader(){
    markSyncCheck();
    if (typeof window.ModeAtlasHideLoader === 'function') {
      window.ModeAtlasHideLoader();
      return;
    }

    const el = document.getElementById('maLoadingScreen');
    if (!el) return;
    el.classList.add('done');
    el.remove();
  }

  window.ModeAtlasSyncPolish = { hideLoader };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideLoader, { once: true });
  } else {
    hideLoader();
  }
  window.addEventListener('load', hideLoader, { once: true });
})();
