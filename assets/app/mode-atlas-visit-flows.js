/* Mode Atlas visit flows: onboarding, daily return, and last-study tracking. */
(function(){
  if(window.__modeAtlasVisitFlowsLoaded)return; window.__modeAtlasVisitFlowsLoaded=true;
  const K={first:'modeAtlasStarterSeen',return:'modeAtlasDailyReturnSeenDate',lastVisit:'modeAtlasLastVisitStudyDate',streak:'modeAtlasVisitStreak',lastStudied:'modeAtlasLastStudiedAt',lastMode:'modeAtlasLastMode',forceFirst:'modeAtlasForceFirstVisit',forceReturn:'modeAtlasForceDailyReturn'};
  function storeGet(key, fallback='') {
    const store = window.ModeAtlasStorage;
    return store?.get?.(key, fallback) ?? localStorage.getItem(key) ?? fallback;
  }
  function storeSet(key, value) {
    const store = window.ModeAtlasStorage;
    return store?.set?.(key, value) ?? localStorage.setItem(key, String(value));
  }
  function storeRemove(key) {
    const store = window.ModeAtlasStorage;
    return store?.remove?.(key) ?? localStorage.removeItem(key);
  }
  function storeJSON(key, fallback) {
    const store = window.ModeAtlasStorage;
    if (store?.json) return store.json(key, fallback);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }
  function storeSetJSON(key, value) {
    const store = window.ModeAtlasStorage;
    return store?.setJSON?.(key, value) ?? localStorage.setItem(key, JSON.stringify(value));
  }
  const page=()=>((window.ModeAtlasPageName ? window.ModeAtlasPageName() : (location.pathname.split('/').pop() || 'index.html')).toLowerCase()||'index.html');
  const j=(k,f)=>{try{return storeJSON(k,f)}catch{return f}};
  const hasObj=k=>{const v=j(k,null);return v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length>0};
  const hasArr=k=>Array.isArray(j(k,null))&&j(k,[]).length>0;
  const studyDate=(d=new Date())=>{const x=new Date(d);if(x.getHours()<4)x.setDate(x.getDate()-1);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function vEl(tag, className='', text=''){const el=document.createElement(tag);if(className)el.className=className;if(text!=='')el.textContent=String(text);return el}
  function vBtn(className='', text=''){const btn=vEl('button',className,text);btn.type='button';return btn}
  function vLink(className='', text='', href=''){const a=vEl('a',className,text);a.href=href;return a}
  function hasData(){return hasObj('charStats')||hasObj('reverseCharStats')||hasObj('scoreHistory')||hasObj('reverseScoreHistory')||hasArr('kanaWordBank')||hasArr('testModeResults')||hasArr('writingTestModeResults')||Number(storeGet('highScore','0')||0)>0||Number(storeGet('reverseHighScore','0')||0)>0}
  function diff(a,b){return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/86400000)}
  function streak(){const t=studyDate(),l=storeGet(K.lastVisit);let s=Number(storeGet(K.streak,'0')||0);if(l!==t){s=(l&&diff(l,t)===1)?s+1:1;storeSet(K.lastVisit,t);storeSet(K.streak,String(s))}return s||1}
  function ago(ts){ts=Number(ts||0);if(!ts)return'No study recorded yet';const m=Math.floor(Math.max(0,Date.now()-ts)/60000);if(m<1)return'Just now';if(m<60)return`${m}m ago`;const h=Math.floor(m/60);if(h<24)return`${h}h ago`;return`${Math.floor(h/24)}d ago`}
  function mode(kind){const s=j(kind==='writing'?'reverseSettings':'settings',{});if(s.testMode)return'Test Mode';if(s.dailyChallenge)return'Daily Challenge';if(s.comboKana)return'Combo Kana Mode';if(s.timeTrial)return'Time Trial Mode';if(s.endless)return'Endless Mode';if(s.focusWeak)return'Focus Weak';return'Standard Mode'}
  function record(kind){const obj=kind==='writing'?{branch:'Kana Trainer',page:'Writing Practice',href:'reverse.html',mode:mode('writing')}:{branch:'Kana Trainer',page:'Reading Practice',href:'default.html',mode:mode('reading')};storeSet(K.lastStudied,String(Date.now()));storeSetJSON(K.lastMode,obj)}
  function track(){const p=page();if(p==='default.html'||p==='reverse.html'){const kind=p==='reverse.html'?'writing':'reading';document.addEventListener('click',e=>{if(e.target.closest('#startBtn,#endSessionBtn,#retryBtn,.choice-btn,#choiceGrid,.btn'))record(kind)},{passive:true});document.addEventListener('keydown',e=>{if(e.key==='Enter')record(kind)},{passive:true})}else if(p==='wordbank.html'){document.addEventListener('click',e=>{if(e.target.closest('#addWordBtn,[data-action="save"],[data-action="favorite"]')){storeSet(K.lastStudied,String(Date.now()));storeSetJSON(K.lastMode,{branch:'Word Bank',page:'Word Bank',href:'wordbank.html',mode:'Vocabulary Review'})}},{passive:true})}}
  const ROWS=[['あ row','あいうえお'],['か row','かきくけこ'],['さ row','さしすせそ'],['た row','たちつてと'],['な row','なにぬねの'],['は row','はひふへほ'],['ま row','まみむめも'],['や row','やゆよ'],['ら row','らりるれろ'],['わ row','わをん'],['ア row','アイウエオ'],['カ row','カキクケコ'],['サ row','サシスセソ'],['タ row','タチツテト'],['ナ row','ナニヌネノ']];
  function suggestions(){const st=j('charStats',{}),tm=j('charTimes',{});const a=ROWS.map(([name,chars])=>{let c=0,w=0,ms=0,n=0;[...chars].forEach(ch=>{c+=Number(st[ch]?.correct||0);w+=Number(st[ch]?.wrong||0);if(tm[ch]?.avg&&tm[ch]?.count){ms+=tm[ch].avg*tm[ch].count;n+=tm[ch].count}});const total=c+w,acc=total?c/total:1;return{name,total,score:w*4+(1-acc)*50+Math.min((n?ms/n:0)/500,12)+(total?0:-100)}}).filter(r=>r.total>0).sort((a,b)=>b.score-a.score).slice(0,3);return a.length?a:[{name:'あ row'},{name:'か row'},{name:'さ row'}]}
  function name(){const u=window.KanaCloudSync?.getUser?.();const n=(u?.displayName||u?.email||'').trim();if(n)return n.split(/\s+/)[0].split('@')[0];for(const id of ['profileName','drawerName','studyProfileName','identityName']){const e=document.getElementById(id),t=(e?.textContent||'').trim();if(t&&!/guest/i.test(t))return t.split(/\s+/)[0]}return'there'}
  function appBasePath(){
    try {
      const marker = '/assets/';
      const scripts = Array.from(document.scripts || []);
      const anchor = document.currentScript || scripts.find(script => String(script.src || '').includes('/assets/app/mode-atlas-visit-flows.js')) || scripts.find(script => String(script.src || '').includes(marker));
      if (anchor && anchor.src && anchor.src.includes(marker)) return new URL(anchor.src.slice(0, anchor.src.indexOf(marker) + 1)).pathname;
    } catch {}
    return '/';
  }
  function appUrl(path){
    const clean = String(path || '').replace(/^\/+/, '');
    try { return new URL(clean, location.origin + appBasePath()).pathname; } catch { return '/' + clean; }
  }
  function legalUrl(kind){ return appUrl(kind === 'terms' ? 'terms/' : 'privacy/'); }
  function readingPresetUrl(preset){ return appUrl('reading/?starter=' + encodeURIComponent(preset || 'starter')); }
  function ensure(){
    if(document.getElementById('maVisitModal'))return;
    const css=document.createElement('style');
    css.textContent='.ma-visit-backdrop{position:fixed;inset:0;z-index:240;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.5);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}.ma-visit-backdrop.open{display:flex}.ma-visit-card{width:min(640px,100%);max-height:min(92vh,820px);overflow:auto;border-radius:28px;padding:22px;background:radial-gradient(circle at top right,rgba(125,181,255,.16),transparent 34%),linear-gradient(180deg,rgba(22,25,34,.98),rgba(8,10,16,.98));border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 90px rgba(0,0,0,.55);color:var(--text,#f7f8ff)}.ma-visit-kicker{font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--muted,#9aa3b8);margin-bottom:10px}.ma-visit-title{font-size:30px;line-height:1.04;font-weight:950;letter-spacing:-.04em;margin:0 0 10px}.ma-visit-copy{color:var(--soft,#cbd5e1);line-height:1.55;margin:0 0 18px;font-size:15px}.ma-visit-panel{border-radius:20px;padding:14px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);margin:12px 0}.ma-visit-label{font-size:12px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:var(--muted,#9aa3b8);margin-bottom:8px}.ma-visit-list{display:flex;flex-wrap:wrap;gap:8px}.ma-visit-chip{padding:8px 10px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);font-size:13px;font-weight:800}.ma-visit-presets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.ma-visit-preset{appearance:none;width:100%;text-align:left;border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.055);color:inherit;padding:13px 14px;cursor:pointer;display:grid;gap:4px;min-height:86px}.ma-visit-preset:hover,.ma-visit-preset:focus-visible{background:rgba(125,181,255,.13);border-color:rgba(125,181,255,.48);outline:none}.ma-visit-preset.selected,.ma-visit-preset[aria-pressed="true"]{background:linear-gradient(135deg,rgba(125,181,255,.24),rgba(167,139,250,.18));border-color:rgba(125,181,255,.82);box-shadow:0 0 0 3px rgba(125,181,255,.16),0 12px 30px rgba(0,0,0,.22)}.ma-visit-preset.selected span,.ma-visit-preset[aria-pressed="true"] span{color:#ffffff}.ma-visit-preset.selected small,.ma-visit-preset[aria-pressed="true"] small{color:#dbeafe}.ma-visit-preset span{font-size:15px;font-weight:950}.ma-visit-preset small{font-size:12px;color:var(--soft,#cbd5e1);font-weight:750;line-height:1.35}.ma-visit-legal{display:grid;gap:12px;margin-top:14px}.ma-visit-legal-links{display:flex;flex-wrap:wrap;gap:10px;color:var(--soft,#cbd5e1);font-size:13px}.ma-visit-legal-links a{color:#9ec5ff;font-weight:900;text-decoration:none}.ma-visit-legal-links a:hover{text-decoration:underline}.ma-visit-link-note{color:var(--muted,#9aa3b8);font-size:12px;font-weight:800}.ma-visit-check{display:flex;align-items:flex-start;gap:10px;border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.045);padding:12px 13px;color:var(--soft,#cbd5e1);font-size:13px;line-height:1.4}.ma-visit-check input{width:19px;height:19px;flex:0 0 auto;margin:0;accent-color:#7db5ff}.ma-visit-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.ma-visit-btn{appearance:none;border:1px solid rgba(255,255,255,.10);border-radius:15px;padding:12px 14px;background:rgba(255,255,255,.06);color:inherit;text-decoration:none;font-weight:900;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-height:44px}.ma-visit-btn.primary{background:rgba(255,255,255,.08);color:rgba(247,248,255,.62);border-color:rgba(255,255,255,.10)}.ma-visit-btn.primary.ready,.ma-visit-btn.primary:not(:disabled){background:linear-gradient(135deg,rgba(125,181,255,.96),rgba(167,139,250,.92));color:#07111f;border-color:transparent;box-shadow:0 14px 34px rgba(0,0,0,.28),0 0 0 3px rgba(125,181,255,.14)}.ma-visit-btn:disabled{cursor:not-allowed;opacity:.72;filter:saturate(.65)}.ma-visit-error{display:none;margin-top:10px;color:#ffd2d2;font-size:13px;font-weight:800}.ma-visit-error.show{display:block}@media(max-width:640px){.ma-visit-card{padding:18px;border-radius:22px}.ma-visit-title{font-size:25px}.ma-visit-presets{grid-template-columns:1fr}.ma-visit-actions{display:grid}.ma-visit-btn{width:100%}}';
    document.head.appendChild(css);
    const m=document.createElement('div');
    m.id='maVisitModal';
    m.className='ma-visit-backdrop';
    const card=vEl('div','ma-visit-card');
    card.setAttribute('role','dialog');
    card.setAttribute('aria-modal','true');
    const content=document.createElement('div');
    content.id='maVisitContent';
    card.append(content);
    m.append(card);
    document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)closeModal()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()})
  }
  function closeModal(force){const modal=document.getElementById('maVisitModal'); if(!modal)return; if(modal.dataset.locked==='true' && force!==true)return; modal.classList.remove('open'); modal.dataset.locked='false'; try{document.dispatchEvent(new CustomEvent('ma:visit-flow-closed'))}catch{}}
  function first(){
    ensure();
    const c=document.getElementById('maVisitContent');
    const presets=[
      ['starter','Starter','あ row + hint mode. Best if kana is brand new.'],
      ['intermediate','Intermediate','All hiragana rows with hints off.'],
      ['advanced','Advanced','Hiragana, katakana, and dakuten.'],
      ['pro','Pro','Everything enabled, including yōon and extended katakana.']
    ];

    c.replaceChildren();
    c.append(
      vEl('div','ma-visit-kicker','Mode Atlas setup'),
      vEl('h2','ma-visit-title','Welcome to Mode Atlas'),
      vEl('p','ma-visit-copy','Choose a starting preset for Mode Atlas. This sets your first study session layout for all our branches and can be changed or customised later. We will also send you to Kana Trainer - Reading mode to get you started.')
    );

    const panel=vEl('div','ma-visit-panel');
    panel.append(vEl('div','ma-visit-label','Study presets'));
    const presetGrid=vEl('div','ma-visit-presets');
    presets.forEach(preset=>{
      const btn=vBtn('ma-visit-preset');
      btn.dataset.maOnboardingPreset=preset[0];
      btn.setAttribute('aria-pressed','false');
      btn.append(vEl('span','',preset[1]), vEl('small','',preset[2]));
      presetGrid.append(btn);
    });
    panel.append(presetGrid);

    const legal=vEl('div','ma-visit-legal');
    const links=vEl('div','ma-visit-legal-links');
    const privacy=vLink('', 'Privacy Policy', legalUrl('privacy'));
    privacy.target='_blank'; privacy.rel='noopener';
    const terms=vLink('', 'Terms of Use', legalUrl('terms'));
    terms.target='_blank'; terms.rel='noopener';
    links.append(privacy, terms, vEl('span','ma-visit-link-note','These open in a new tab so setup stays open.'));

    const label=vEl('label','ma-visit-check');
    const agreeInput=document.createElement('input');
    agreeInput.type='checkbox';
    agreeInput.dataset.legalAgree='';
    label.append(agreeInput, vEl('span','','I agree to the Privacy Policy and Terms of Use.'));
    legal.append(links,label);

    const err=vEl('div','ma-visit-error','Please choose a preset and agree before beginning.');
    err.dataset.setupError='';

    const actions=vEl('div','ma-visit-actions');
    const begin=vBtn('ma-visit-btn primary','Begin!');
    begin.dataset.begin='';
    begin.disabled=true;
    begin.setAttribute('aria-disabled','true');
    actions.append(begin);

    c.append(panel, legal, err, actions);

    let selected='';
    const agree=c.querySelector('[data-legal-agree]');
    function setSelected(btn){
      selected=btn?.getAttribute('data-ma-onboarding-preset')||'';
      c.querySelectorAll('[data-ma-onboarding-preset]').forEach(b=>{
        const on=b===btn;
        b.classList.toggle('selected',on);
        b.setAttribute('aria-pressed',on?'true':'false');
      });
      refresh();
    }
    function refresh(){
      const ready=Boolean(selected && agree && agree.checked);
      begin.disabled=!ready;
      begin.setAttribute('aria-disabled',ready?'false':'true');
      begin.classList.toggle('ready',ready);
      c.classList.toggle('ma-visit-ready',ready);
      if(ready) err.classList.remove('show');
    }
    c.addEventListener('click', event=>{
      const preset=event.target.closest('[data-ma-onboarding-preset]');
      if(preset && c.contains(preset)){ event.preventDefault(); setSelected(preset); }
    });
    agree.addEventListener('change', refresh);
    agree.addEventListener('input', refresh);
    begin.addEventListener('click', ()=>{
      if(begin.disabled){err.classList.add('show');return;}
      const applied = window.ModeAtlasPresets?.apply?.(selected, { target: 'both', source: 'onboarding' });
      if(!applied){err.classList.add('show');return;}
      storeSet(K.first,'true');
      storeSet('modeAtlasOnboardingComplete','true');
      storeSet('modeAtlasLegalAccepted','true');
      storeSet('modeAtlasLegalAcceptedAt',String(Date.now()));
      storeSet('modeAtlasLegalVersion','2026-05');
      storeSet(K.return, studyDate());
      storeSet(K.lastVisit, studyDate());
      sessionStorage.setItem('modeAtlasShowWhatsNewAfterOnboarding','1');
      closeModal(true);
      location.href=appUrl('reading/');
    });
    const modal=document.getElementById('maVisitModal');
    modal.dataset.locked='true';
    modal.classList.add('open');
    refresh();
  }
  function ret(){
    ensure();
    storeSet(K.return,studyDate());
    const lm=j(K.lastMode,{page:'Reading Practice',mode:'Endless Mode',href:'default.html'}),s=suggestions(),st=streak();
    const c=document.getElementById('maVisitContent');
    c.replaceChildren(
      vEl('div','ma-visit-kicker','Daily return'),
      vEl('h2','ma-visit-title',`Welcome back, ${name()}`)
    );

    const copy=vEl('p','ma-visit-copy');
    copy.append(
      document.createTextNode('Last studied: '),
      vEl('strong','',ago(storeGet(K.lastStudied))),
      document.createElement('br'),
      document.createTextNode('Current streak: '),
      vEl('strong','',`${st} day${st===1?'':'s'}`)
    );

    const reviewPanel=vEl('div','ma-visit-panel');
    reviewPanel.append(vEl('div','ma-visit-label','Suggested review'));
    const reviewList=vEl('div','ma-visit-list');
    s.forEach(r=>reviewList.append(vEl('span','ma-visit-chip',r.name)));
    reviewPanel.append(reviewList);

    const resumePanel=vEl('div','ma-visit-panel');
    resumePanel.append(vEl('div','ma-visit-label','Resume'));
    const resumeList=vEl('div','ma-visit-list');
    resumeList.append(vEl('span','ma-visit-chip',`${lm.page||'Reading Practice'} · ${lm.mode||'Endless Mode'}`));
    resumePanel.append(resumeList);

    const actions=vEl('div','ma-visit-actions');
    actions.append(vLink('ma-visit-btn primary','Resume',lm.href||'default.html'));
    const close=vBtn('ma-visit-btn','Not now');
    close.dataset.close='';
    actions.append(close);

    c.append(copy,reviewPanel,resumePanel,actions);
    close.addEventListener('click',()=>closeModal());
    document.getElementById('maVisitModal').classList.add('open');
  }
  let visitDecisionMade=false;
  async function maybe(){
    if(page()!=='index.html'||visitDecisionMade)return;
    const q=new URLSearchParams(location.search),ff=sessionStorage.getItem(K.forceFirst)==='1'||q.has('devFirstVisit')||q.has('setup'),fr=sessionStorage.getItem(K.forceReturn)==='1'||q.has('devReturn');
    sessionStorage.removeItem(K.forceFirst);sessionStorage.removeItem(K.forceReturn);storeRemove(K.forceFirst);storeRemove(K.forceReturn);
    try{if(window.KanaCloudSync?.beforePageLoad)await window.KanaCloudSync.beforePageLoad();else if(window.KanaCloudSync?.ready)await window.KanaCloudSync.ready}catch{}
    if(visitDecisionMade)return;
    if(ff){visitDecisionMade=true;return first();}
    if(fr){visitDecisionMade=true;return ret();}
    const nd=!hasData();
    if(nd&&storeGet(K.first)!=='true'){visitDecisionMade=true;return first();}
    if(!nd){
      const t=studyDate();
      if(storeGet(K.return)!==t){visitDecisionMade=true;return ret();}
      streak();
    }
  }
  function triggerFirst(){storeRemove(K.forceFirst);sessionStorage.removeItem(K.forceFirst);if(page()==='index.html')first();else{sessionStorage.setItem(K.forceFirst,'1');location.href='/?devFirstVisit=1'}}
  function triggerReturn(){storeRemove(K.forceReturn);sessionStorage.removeItem(K.forceReturn);if(page()==='index.html')ret();else{sessionStorage.setItem(K.forceReturn,'1');location.href='/?devReturn=1'}}
  function reset(){[K.first,K.return,K.forceFirst,K.forceReturn,K.lastVisit,K.streak].forEach(k=>storeRemove(k));console.info('Mode Atlas visit flags reset')}
  window.modeAtlasTriggerFirstVisit=triggerFirst;window.modeAtlasTriggerDailyReturn=triggerReturn;window.modeAtlasResetVisitFlags=reset;
  function addDev(){
    const p=document.getElementById('maDevPanel');
    if(!p||p.querySelector('[data-visit-tools]'))return;
    const card=p.querySelector('.ma-dev-card')||p,row=document.createElement('div');
    row.className='ma-dev-row';
    row.dataset.visitTools='true';

    row.append(vEl('div','ma-dev-label','Visit flows'));
    const actions=vEl('div','ma-dev-actions');
    const firstBtn=vBtn('ma-dev-btn','Trigger first visit');
    firstBtn.dataset.first='';
    const returnBtn=vBtn('ma-dev-btn','Trigger daily return');
    returnBtn.dataset.return='';
    const resetBtn=vBtn('ma-dev-btn','Reset visit flags');
    resetBtn.dataset.reset='';
    actions.append(firstBtn,returnBtn,resetBtn);
    row.append(actions);

    row.onclick=e=>{
      if(e.target.closest('[data-first]'))triggerFirst();
      if(e.target.closest('[data-return]'))triggerReturn();
      if(e.target.closest('[data-reset]'))reset()
    };
    card.appendChild(row)
  }
  function bindDevVisitTools(){if(!window.ModeAtlasEnv?.allowDevTools)return;const o=window.dev;if(typeof o==='function'&&!o.__visitToolsBound){const p=function(){const r=o.apply(this,arguments);addDev();return r};p.__visitToolsBound=true;window.dev=p;window.atlasDev=p}new MutationObserver(addDev).observe(document.documentElement,{childList:true,subtree:true});addDev()}
  function init(){track();maybe();bindDevVisitTools();window.addEventListener('kanaCloudSyncStatusChanged',maybe);document.addEventListener('ma:ui-refresh',maybe)} if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
