/* Mode Atlas Kana metrics.
   Shared data helpers for Kana dashboard, result insights, achievements, and mastery UI. */
(function(){
  if(window.ModeAtlasKanaMetrics) return;
  const HIRA='あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split('');
  const KATA='アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.split('');
  const DAK='がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ'.split('');
  const YOON='きゃきゅきょしゃしゅしょちゃちゅちょにゃにゅにょひゃひゅひょみゃみゅみょりゃりゅりょぎゃぎゅぎょじゃじゅじょびゃびゅびょぴゃぴゅぴょキャキュキョシャシュショチャチュチョニャニュニョヒャヒュヒョミャミュミョリャリュリョギャギュギョジャジュジョビャビュビョピャピュピョ'.match(/.{1,2}/gu)||[];
  const EXT='ヴファフィフェフォウィウェウォティディトゥドゥチェシェジェ'.match(/.{1,2}/gu)||[];
  const CONFUSABLE=['シ','ツ','ソ','ン','ぬ','め','れ','わ','ね','ク','ケ','タ','ナ','メ'];
  const ALL=[...new Set([...HIRA,...KATA,...DAK,...YOON,...EXT,...CONFUSABLE])];
  const PRESET_TRACKERS=[
    {id:'starter',name:'Starter',desc:'A-row with hints',chars:'あいうえお'.split(''),href:'/reading/?starter=starter'},
    {id:'intermediate',name:'Intermediate',desc:'All Hiragana, no hints',chars:HIRA,href:'/reading/?starter=intermediate'},
    {id:'advanced',name:'Advanced',desc:'Hiragana + Katakana + Dakuten',chars:[...HIRA,...KATA,...DAK],href:'/reading/?starter=advanced'},
    {id:'pro',name:'Pro',desc:'Everything enabled',chars:[...HIRA,...KATA,...DAK,...YOON,...EXT],href:'/reading/?starter=pro'}
  ];
  function pageName(){ try{return (window.ModeAtlasPageName?window.ModeAtlasPageName():(location.pathname.split('/').filter(Boolean).pop()||'index.html')).toLowerCase();}catch{return '';} }
  function json(key,fallback){ try{return window.ModeAtlasStorage?.json?.(key,fallback) ?? fallback;}catch{return fallback;} }
  function number(key,fallback=0){ try{return window.ModeAtlasStorage?.number?.(key,fallback) ?? fallback;}catch{return fallback;} }
  function obj(key){ const v=json(key,{}); return v&&typeof v==='object'&&!Array.isArray(v)?v:{}; }
  function modeObj(mode, name){ try{ const v=window.ModeAtlasStorage?.readModeJSON?.(mode,name,{}); return v&&typeof v==='object'&&!Array.isArray(v)?v:{}; }catch{return {}; } }
  function modeNumber(mode, name, fallback=0){ try{return window.ModeAtlasStorage?.readModeNumber?.(mode,name,fallback) ?? fallback;}catch{return fallback;} }
  function arr(key){ const v=json(key,[]); return Array.isArray(v)?v:[]; }
  function countKeys(o){ return o&&typeof o==='object'?Object.keys(o).length:0; }
  function statTotals(stats){ let c=0,w=0; Object.values(stats||{}).forEach(s=>{ if(s&&typeof s==='object'){ c+=Number(s.correct||s.right||0); w+=Number(s.wrong||s.incorrect||0); } }); return {c,w,t:c+w,acc:c+w?Math.round((c/(c+w))*100):0}; }
  function accuracy(stats){ return statTotals(stats).acc; }
  function difficult(stats, strongest=false){ let pick=null; Object.entries(stats||{}).forEach(([kana,s])=>{ if(!s||typeof s!=='object') return; const c=Number(s.correct||s.right||0), w=Number(s.wrong||s.incorrect||0), t=c+w; if(!t) return; const score=(c/t)-(w*0.04); const row={kana,score,t,c,w}; if(!pick || (strongest?score>pick.score:score<pick.score)) pick=row; }); return pick; }
  function dailyDone(hist){ const today=new Date().toISOString().slice(0,10); if(Array.isArray(hist)) return hist.some(x=>String(x?.date||x?.day||'').slice(0,10)===today); return !!(hist&&hist[today]); }
  function streak(hist){ const set=new Set(); if(Array.isArray(hist)) hist.forEach(x=>{const d=String(x?.date||x?.day||'').slice(0,10); if(d)set.add(d);}); else Object.keys(hist||{}).forEach(k=>set.add(String(k).slice(0,10))); let n=0; const d=new Date(); for(;;){const key=d.toISOString().slice(0,10); if(!set.has(key)) break; n++; d.setDate(d.getDate()-1);} return n; }
  function normalizeResultForCount(item, expectedMode){
    if(!item||typeof item!=='object') return null;
    const mode=item.mode==='writing'?'writing':'reading';
    if(expectedMode&&mode!==expectedMode) return null;
    if(item.type==='average') return null;
    const id=String(item.id||item.createdAt||item.completedAt||item.date||item.startedAt||'');
    const sig=id||(mode+'|'+String(item.date||'')+'|'+String(item.startedAt||'')+'|'+String(item.correct||'')+'|'+String(item.wrong||''));
    return {mode,sig};
  }
  function formalTestCount(){
    const readingKeys=['testModeResults','kanaTrainerTestModeResults','readingTestModeResults','kanaTrainerReadingTestModeResults'];
    const writingKeys=['writingTestModeResults','kanaTrainerWritingTestModeResults','reverseTestModeResults'];
    const seen=new Set();
    readingKeys.forEach(key=>arr(key).forEach(item=>{const n=normalizeResultForCount(item,'reading'); if(n) seen.add('reading|'+n.sig);}));
    writingKeys.forEach(key=>arr(key).forEach(item=>{const n=normalizeResultForCount(item,'writing'); if(n) seen.add('writing|'+n.sig);}));
    return seen.size;
  }
  function charCorrect(ch){ const r=modeObj('reading','charStats')[ch]||{}, w=modeObj('writing','charStats')[ch]||{}; return Number(r.correct||r.right||0)+Number(w.correct||w.right||0); }
  function charWrong(ch){ const r=modeObj('reading','charStats')[ch]||{}, w=modeObj('writing','charStats')[ch]||{}; return Number(r.wrong||r.incorrect||0)+Number(w.wrong||w.incorrect||0); }
  function charAvg(ch){ const rt=obj('charTimes')[ch], wt=obj('reverseCharTimes')[ch]; const vals=[]; [rt,wt].forEach(v=>{ let n=0; if(typeof v==='number') n=Number(v); else if(v&&typeof v==='object') n=Number(v.avg||v.average||v.time||0); if(n) vals.push(n<30?n*1000:n); }); return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0; }
  function masteryLabel(ch){ const c=charCorrect(ch), w=charWrong(ch), t=c+w, avg=charAvg(ch), acc=t?c/t:0; if(!t) return 'New'; if(c>=50 && acc>=.95 && avg>0 && avg<=1000) return 'Mastered'; if(c>=10 && acc>=.85 && (!avg || avg<=2500)) return 'Reviewing'; return 'Learning'; }
  function masteryClass(label){ return String(label||'').toLowerCase(); }
  function masteryCounts(chars=ALL){ const out={New:0,Learning:0,Reviewing:0,Mastered:0}; chars.forEach(ch=>{ out[masteryLabel(ch)]++; }); return out; }
  function bestWeak(chars=ALL){ const rows=[]; [...new Set(chars)].forEach(ch=>{ const c=charCorrect(ch), w=charWrong(ch), avg=charAvg(ch), t=c+w; if(t) rows.push({ch,c,w,t,avg,score:(c/(t||1))-(w*.05)-(avg?Math.min(avg/7000,.5):0)}); }); return rows.sort((a,b)=>a.score-b.score).slice(0,4); }
  function formatMs(ms){ return !ms?'—':ms<1000?Math.round(ms)+'ms':(ms/1000).toFixed(1)+'s'; }
  function kanaStats(){
    const readingStats=modeObj('reading','charStats'), writingStats=modeObj('writing','charStats');
    const readingDaily=obj('dailyChallengeHistory'), writingDaily=obj('reverseDailyChallengeHistory');
    const rw=difficult(readingStats,false), rb=difficult(readingStats,true), ww=difficult(writingStats,false), wb=difficult(writingStats,true);
    const rt=statTotals(readingStats), wt=statTotals(writingStats);
    return {
      readingAccuracy:rt.acc, writingAccuracy:wt.acc, readingAnswers:rt.t, writingAnswers:wt.t,
      readingHigh:modeNumber('reading','highScore',0), writingHigh:modeNumber('writing','highScore',0),
      readingKnown:countKeys(readingStats), writingKnown:countKeys(writingStats),
      readingWorst:rw?.kana||'—', readingBest:rb?.kana||'—', writingWorst:ww?.kana||'—', writingBest:wb?.kana||'—',
      readingTests:arr('testModeResults').length+arr('readingTestModeResults').length+arr('kanaTrainerReadingTestModeResults').length,
      writingTests:arr('writingTestModeResults').length+arr('kanaTrainerWritingTestModeResults').length,
      dailyDone:dailyDone(readingDaily)||dailyDone(writingDaily), streak:Math.max(streak(readingDaily),streak(writingDaily)),
      readingTotals:rt, writingTotals:wt, known:Math.max(countKeys(readingStats),countKeys(writingStats)), tests:formalTestCount()
    };
  }
  window.ModeAtlas=window.ModeAtlas||{};
  window.ModeAtlas.formalTestCount=formalTestCount;
  window.ModeAtlas.getKanaMasteryLabel=masteryLabel;
  window.ModeAtlasKanaMetrics=Object.freeze({HIRA,KATA,DAK,YOON,EXT,CONFUSABLE,ALL,PRESET_TRACKERS,pageName,json,obj,arr,number,statTotals,accuracy,difficult,formalTestCount,charCorrect,charWrong,charAvg,masteryLabel,masteryClass,masteryCounts,bestWeak,formatMs,kanaStats});
})();
