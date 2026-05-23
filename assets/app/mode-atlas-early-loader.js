/* Mode Atlas early loader. Owns loading-screen hide timing. */
(function(){
  var hidden = false;
  function hide(){
    if (hidden) return;
    hidden = true;
    var el=document.getElementById('maLoadingScreen');
    if(el){
      el.classList.add('done');
      setTimeout(function(){try{el.remove();}catch(e){}},220);
    }
  }
  window.ModeAtlasHideLoader=hide;
  window.ModeAtlasLoaderState={ hide: hide, isHidden: function(){ return hidden; } };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(hide, 120); }, {once:true});
  } else {
    setTimeout(hide, 80);
  }
  window.addEventListener('load',function(){setTimeout(hide,80);},{once:true});
  setTimeout(hide,900);
})();
