(function ModeAtlasSingleAuthButton(){
  if (window.__modeAtlasSingleAuthButtonLoaded) return;
  window.__modeAtlasSingleAuthButtonLoaded = true;

  const SIGN_IN_SELECTORS = '#profileSignInBtn,#studyProfileSignIn,#identitySignInBtn,[data-profile-sign-in],[data-ma-sign-in]';
  const SIGN_OUT_SELECTORS = '#profileSignOutBtn,#studyProfileSignOut,#identitySignOutBtn,[data-profile-sign-out],[data-ma-sign-out]';
  const DRAWER_SELECTORS = '.profile-drawer,#profileDrawer,.profile-overlay,.drawer-panel,.profile-modal,.profile-menu,.ma-profile-drawer';

  function all(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }
  function getUser(){ try { return window.KanaCloudSync && typeof window.KanaCloudSync.getUser === 'function' ? window.KanaCloudSync.getUser() : null; } catch { return null; } }
  function signedIn(){ return !!getUser(); }
  function text(el){ return (el && el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function isAuthText(el){ return /^(sign in(?: with google)?|log in|login|sign out|logout|log out)$/i.test(text(el)); }
  function findAuthButtons(root){
    const set = new Set();
    all(`${SIGN_IN_SELECTORS},${SIGN_OUT_SELECTORS},[data-ma-auth-main]`, root).forEach(el => set.add(el));
    all('button,a', root).filter(isAuthText).forEach(el => set.add(el));
    return Array.from(set);
  }
  function hide(el){
    if (!el) return;
    el.hidden = true;
    el.disabled = true;
    el.setAttribute('aria-hidden','true');
    el.setAttribute('tabindex','-1');
    el.style.setProperty('display','none','important');
    el.classList.add('ma-auth-removed');
    el.removeAttribute('data-ma-auth-main');
  }
  function showMain(btn){
    if (!btn) return;
    const isIn = signedIn();
    btn.hidden = false;
    btn.disabled = false;
    btn.removeAttribute('aria-hidden');
    btn.removeAttribute('tabindex');
    btn.style.setProperty('display','inline-flex','important');
    btn.classList.remove('ma-auth-removed');
    btn.setAttribute('data-ma-auth-main','');
    btn.removeAttribute('data-profile-sign-in');
    btn.removeAttribute('data-profile-sign-out');
    btn.removeAttribute('data-ma-sign-in');
    btn.removeAttribute('data-ma-sign-out');
    btn.textContent = isIn ? 'Sign out' : 'Sign in';
    btn.classList.toggle('primary', !isIn);
  }
  function chooseMain(root, buttons){
    const existing = buttons.find(el => el.hasAttribute('data-ma-auth-main') && !el.classList.contains('ma-auth-removed'));
    if (existing) return existing;
    const signIn = buttons.find(el => /^(sign in(?: with google)?|log in|login)$/i.test(text(el)) && !el.classList.contains('ma-auth-removed'));
    if (signIn) return signIn;
    return buttons.find(el => !el.classList.contains('ma-auth-removed')) || null;
  }
  function syncOne(root){
    const buttons = findAuthButtons(root);
    if (!buttons.length) return;
    const main = chooseMain(root, buttons);
    buttons.forEach(el => { if (el !== main) hide(el); });
    showMain(main);
  }
  function sync(){
    const roots = all(DRAWER_SELECTORS).filter(Boolean);
    if (roots.length) roots.forEach(root => syncOne(root)); else syncOne(document);
    try {
      const user = getUser();
      const display = user && (user.displayName || (user.email || '').split('@')[0]);
      if (display) all('#profileName,#drawerName,#studyProfileName,#identityName').forEach(el => { el.textContent = display; });
      if (user && user.email) all('#profileEmail,#drawerEmail,#studyProfileEmail,#identityEmail').forEach(el => { el.textContent = user.email; });
    } catch {}
  }
  async function runAuthAction(){
    const cloud = window.KanaCloudSync;
    if (!cloud) return;
    try {
      if (signedIn()) await cloud.signOut?.();
      else await cloud.signInWithGoogle?.();
    } finally {
      setTimeout(sync, 80);
      setTimeout(sync, 600);
    }
  }
  document.addEventListener('click', function(e){
    const btn = e.target && e.target.closest && e.target.closest('[data-ma-auth-main]');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation(); if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    runAuthAction();
  }, true);
  window.ModeAtlas = window.ModeAtlas || {};
  window.ModeAtlas.syncSingleAuthButton = sync;
  function boot(){
    sync();
    [100, 400, 1000, 2200].forEach(t => setTimeout(sync, t));
    setInterval(sync, 2500);
    window.addEventListener('kanaCloudSyncStatusChanged', sync);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    try {
      const mo = new MutationObserver(function(){
        if (window.__maAuthSyncQueued) return;
        window.__maAuthSyncQueued = true;
        setTimeout(function(){ window.__maAuthSyncQueued = false; sync(); }, 120);
      });
      mo.observe(document.body || document.documentElement, { childList:true, subtree:true });
    } catch {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true }); else boot();
})();
