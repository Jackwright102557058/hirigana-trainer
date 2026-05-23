/* Confusable Kana route/state handling for trainer pages. */
(function(){
  if(window.__modeAtlasConfusableModeLoaded) return;
  window.__modeAtlasConfusableModeLoaded = true;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function page(){ try{return (window.ModeAtlasPageName?window.ModeAtlasPageName():(location.pathname.split('/').filter(Boolean).pop()||'index.html')).toLowerCase();}catch{return '';} }
  function branch(){ const p=page(); return (p==='reverse.html'||p==='writing')?'writing':'reading'; }
  function isTrainer(){ const p=page(); return p==='default.html'||p==='reverse.html'; }
  function key(){ return branch()==='writing'?'reverseSettings':'settings'; }
  function readSettings(){ try{return window.ModeAtlasStorage?.json?.(key(),{})||{};}catch{return {};} }
  function writeSettings(next){
    try{ if(typeof window.settings==='object'&&window.settings) Object.assign(window.settings,next); }catch{}
    try{ window.ModeAtlasStorage?.setJSON?.(key(), next); }catch{}
    try{ window.ModeAtlasStorage?.now?.('settingsUpdatedAt'); }catch{}
    try{ window.KanaCloudSync?.markSectionUpdated?.(branch()); }catch{}
  }
  function refreshTrainer(){
    try{ if(typeof window.rebuildCharMap==='function') window.rebuildCharMap(); }catch{}
    try{ if(typeof window.buildModifierButtons==='function') window.buildModifierButtons(); }catch{}
    try{ if(typeof window.renderHeatmap==='function') window.renderHeatmap(); }catch{}
    try{ if(typeof window.updateTopStats==='function') window.updateTopStats(); }catch{}
    try{ if(typeof window.updateTrialConfigVisibility==='function') window.updateTrialConfigVisibility(); }catch{}
    try{ if(typeof window.saveAll==='function') window.saveAll(); }catch{}
  }
  function enable(force){
    const current=readSettings();
    const nextValue=typeof force==='boolean'?force:!current.confusableKana;
    const next=Object.assign({}, current, {
      confusableKana: nextValue,
      hint:false, focusWeak:false, srs:true,
      endless:false, timeTrial:false, dailyChallenge:false, testMode:false, comboKana:false,
      dakuten:false, yoon:false, extendedKatakana:false,
      hiraganaRows:['h_a','h_ka','h_sa','h_ta','h_na','h_ha','h_ma','h_ya','h_ra','h_wa'],
      katakanaRows:['k_a','k_ka','k_sa','k_ta','k_na','k_ha','k_ma','k_ya','k_ra','k_wa']
    });
    writeSettings(next);
    try{ window.ModeAtlasStorage?.remove?.('modeAtlasActivePreset'); }catch{}
    refreshTrainer();
    return true;
  }
  function applyRouteState(){
    if(!isTrainer()) return;
    const params=new URLSearchParams(location.search);
    if(params.get('confusable')!=='1' && storeGet('modeAtlasConfusableMode')!=='1') return;
    enable(true);
    storeRemove('modeAtlasConfusableMode');
    if(params.get('confusable')==='1' && history.replaceState) history.replaceState(null,'',location.pathname);
  }
  function syncButton(){
    if(!isTrainer()) return;
    const container=$('#modifierOptions') || document;
    const btn=$$('.toggle-btn',container).find(el=>(el.textContent||'').trim().toLowerCase()==='confusable kana');
    if(btn){ const active=!!readSettings().confusableKana; btn.classList.toggle('active',active); btn.setAttribute('aria-pressed',active?'true':'false'); }
  }
  function boot(){ applyRouteState(); syncButton(); }
  window.ModeAtlas=window.ModeAtlas||{};
  window.ModeAtlas.enableConfusableKana=enable;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
  window.addEventListener('pageshow',boot);
  document.addEventListener('ma:ui-refresh', boot);
})();
