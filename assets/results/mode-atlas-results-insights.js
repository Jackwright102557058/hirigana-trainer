/* Results page compact insights. */
(function(){
  if(window.__modeAtlasResultsInsightsLoaded) return;
  window.__modeAtlasResultsInsightsLoaded = true;
  const $ = (s,r=document)=>r.querySelector(s);
  function isResultsPage(){ try{return (window.ModeAtlasPageName?window.ModeAtlasPageName():(location.pathname.split('/').filter(Boolean).pop()||'index.html')).toLowerCase()==='test.html';}catch{return false;} }
  function render(){
    const M=window.ModeAtlasKanaMetrics;
    if(!isResultsPage() || !M || $('#maCompactResultInsights')) return;
    document.querySelectorAll('#maResultInsights').forEach(x=>x.remove());
    const r=M.statTotals(M.obj('charStats'));
    const w=M.statTotals(M.obj('reverseCharStats'));
    const weak=M.bestWeak();
    const timed=M.ALL.map(ch=>({ch,avg:M.charAvg(ch)})).filter(x=>x.avg).sort((a,b)=>b.avg-a.avg);
    const avg=timed.length?timed.reduce((a,b)=>a+b.avg,0)/timed.length:0;
    const formal=M.formalTestCount();
    const panel=document.createElement('section');
    panel.id='maCompactResultInsights';
    panel.className='ma-compact-results';
    panel.replaceChildren(
      miniResultCard('Reading accuracy', r.t?r.acc+'%':'—', `${r.t} answers`),
      miniResultCard('Writing accuracy', w.t?w.acc+'%':'—', `${w.t} answers`),
      miniResultCard('Average speed', avg?M.formatMs(avg):'—', avg&&avg<2000?'Next goal under 1.0s':'Goal under 2.0s'),
      miniResultCard('Slowest tracked', timed[0]?.ch||weak[0]?.ch||'—', timed[0]?M.formatMs(timed[0].avg):(weak.length?weak.map(x=>x.ch).join(' · '):'More data needed')),
      miniResultCard('Formal tests', formal, 'saved result cards')
    );
    const filter=$('#maResultFilterBar');
    if(filter) filter.insertAdjacentElement('afterend',panel);
    else ($('main,.shell,.app-shell')||document.body).prepend(panel);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',render); else render();
  window.addEventListener('pageshow',render);
  document.addEventListener('ma:ui-refresh', render);
})();
