(function ModeAtlasPwa(){
  'use strict';
  if (window.__modeAtlasPwaLoaded) return;
  window.__modeAtlasPwaLoaded = true;

  const PROMPT_SEEN_KEY = 'modeAtlasInstallPromptSeen';
  const PROMPT_DISMISSED_AT_KEY = 'modeAtlasInstallPromptDismissedAt';
  let deferredPrompt = null;

  function $(sel, root = document){ return root.querySelector(sel); }
  function isStandalone(){
    try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
    catch { return false; }
  }
  function hasSeenPrompt(){
    try { return window.ModeAtlasStorage?.get?.(PROMPT_SEEN_KEY) === '1'; } catch { return true; }
  }
  function markPromptSeen(){
    try {
      window.ModeAtlasStorage?.set?.(PROMPT_SEEN_KEY, '1');
      window.ModeAtlasStorage?.set?.(PROMPT_DISMISSED_AT_KEY, String(Date.now()));
    } catch {}
  }
  async function showInstall(){
    if (deferredPrompt) {
      try { deferredPrompt.prompt(); await deferredPrompt.userChoice; } catch {}
      deferredPrompt = null;
      window.ModeAtlasInstall.deferredPrompt = null;
      markPromptSeen();
      $('#maInstallPrompt')?.remove();
      return true;
    }
    const message = 'To install Mode Atlas, use your browser menu or, on iPad, Share → Add to Home Screen.';
    if (!window.ModeAtlas?.toast?.(message, 'info', 3600)) alert(message);
    return false;
  }
  async function refreshAppAssets({ reload = true } = {}) {
    if (!('serviceWorker' in navigator)) {
      if (reload) location.reload();
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const controller = navigator.serviceWorker.controller;

      if (controller) {
        controller.postMessage({ type: 'MODE_ATLAS_CLEAR_CACHES' });
      } else if (window.caches?.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith('mode-atlas-')).map(key => caches.delete(key)));
      }

      await registration?.update?.();
      if (reload) {
        setTimeout(() => location.reload(), 250);
      }
      return true;
    } catch (err) {
      if (reload) location.reload();
      return false;
    }
  }

  function getServiceWorkerVersion() {
    return new Promise((resolve) => {
      if (!navigator.serviceWorker?.controller) {
        resolve(null);
        return;
      }

      const channel = new MessageChannel();
      const timer = setTimeout(() => resolve(null), 1200);
      channel.port1.onmessage = event => {
        clearTimeout(timer);
        resolve(event.data || null);
      };
      navigator.serviceWorker.controller.postMessage({ type: 'MODE_ATLAS_GET_VERSION' }, [channel.port2]);
    });
  }

  function showInstallPrompt(){
    if ($('#maInstallPrompt') || !deferredPrompt || hasSeenPrompt() || isStandalone()) return;
    const prompt = document.createElement('div');
    prompt.id = 'maInstallPrompt';
    prompt.className = 'ma-install-prompt';
    const copy = document.createElement('div');
    const title = document.createElement('b');
    title.textContent = 'Install Mode Atlas';
    const text = document.createElement('span');
    text.textContent = 'Add it to your device for faster access and a full-screen study experience. You can also install later from Settings.';
    copy.append(title, text);

    const installBtn = document.createElement('button');
    installBtn.type = 'button';
    installBtn.dataset.maInstall = '';
    installBtn.textContent = 'Install';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.dataset.maInstallClose = '';
    closeBtn.textContent = 'Not now';

    prompt.replaceChildren(copy, installBtn, closeBtn);
    document.body.appendChild(prompt);
    prompt.addEventListener('click', async event => {
      if (event.target.closest('[data-ma-install-close]')) { markPromptSeen(); prompt.remove(); }
      if (event.target.closest('[data-ma-install]')) await showInstall();
    });
  }

  window.ModeAtlasInstall = Object.assign(window.ModeAtlasInstall || {}, {
    show: showInstall,
    isStandalone,
    hasSeenPrompt,
    markPromptSeen,
    refreshAppAssets,
    getServiceWorkerVersion,
    get deferredPrompt(){ return deferredPrompt; },
    set deferredPrompt(value){ deferredPrompt = value; }
  });

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    window.ModeAtlasInstall.deferredPrompt = event;
    if (!hasSeenPrompt() && !isStandalone()) showInstallPrompt();
  });
  window.addEventListener('appinstalled', () => {
    markPromptSeen();
    deferredPrompt = null;
    window.ModeAtlasInstall.deferredPrompt = null;
    $('#maInstallPrompt')?.remove();
  });
})();
