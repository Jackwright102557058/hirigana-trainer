(function(){
  'use strict';
  function isPracticePage(){
    var page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    return page==='default.html'||page==='reverse.html';
  }
  function begin(){
    try {
      window.ModeAtlasPracticeSessionActive = true;
      sessionStorage.setItem('modeAtlasPracticeSessionActive','1');
      if (window.KanaCloudSync && typeof window.KanaCloudSync.beginPracticeSessionSyncPause === 'function') window.KanaCloudSync.beginPracticeSessionSyncPause();
    } catch(e) {}
  }
  function end(){
    try {
      window.ModeAtlasPracticeSessionActive = false;
      sessionStorage.removeItem('modeAtlasPracticeSessionActive');
      if (window.KanaCloudSync && typeof window.KanaCloudSync.endPracticeSessionSyncPause === 'function') window.KanaCloudSync.endPracticeSessionSyncPause(true);
    } catch(e) {}
  }
  function boot(){
    if (!isPracticePage()) return;
    document.addEventListener('click', function(e){
      if (e.target && e.target.closest && e.target.closest('#startBtn')) begin();
      if (e.target && e.target.closest && e.target.closest('#endSessionBtn,#closeSessionModalBtn')) setTimeout(end, 50);
    }, true);
    window.addEventListener('beforeunload', function(){ try { sessionStorage.removeItem('modeAtlasPracticeSessionActive'); } catch(e) {} });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true }); else boot();
})();
