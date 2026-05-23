/* Mode Atlas achievements and mastery UI. */
(function(){
  'use strict';
  const VERSION = (window.ModeAtlasEnv && window.ModeAtlasEnv.appVersion) || window.ModeAtlasVersion || 'dev-local';
  const HIRA = ['あ','い','う','え','お','か','き','く','け','こ','さ','し','す','せ','そ','た','ち','つ','て','と','な','に','ぬ','ね','の','は','ひ','ふ','へ','ほ','ま','み','む','め','も','や','ゆ','よ','ら','り','る','れ','ろ','わ','を','ん'];
  const KATA = ['ア','イ','ウ','エ','オ','カ','キ','ク','ケ','コ','サ','シ','ス','セ','ソ','タ','チ','ツ','テ','ト','ナ','ニ','ヌ','ネ','ノ','ハ','ヒ','フ','ヘ','ホ','マ','ミ','ム','メ','モ','ヤ','ユ','ヨ','ラ','リ','ル','レ','ロ','ワ','ヲ','ン'];
  const DAK = ['が','ぎ','ぐ','げ','ご','ざ','じ','ず','ぜ','ぞ','だ','ぢ','づ','で','ど','ば','び','ぶ','べ','ぼ','ぱ','ぴ','ぷ','ぺ','ぽ','ガ','ギ','グ','ゲ','ゴ','ザ','ジ','ズ','ゼ','ゾ','ダ','ヂ','ヅ','デ','ド','バ','ビ','ブ','ベ','ボ','パ','ピ','プ','ペ','ポ'];
  const YOON = ['きゃ','きゅ','きょ','しゃ','しゅ','しょ','ちゃ','ちゅ','ちょ','にゃ','にゅ','にょ','ひゃ','ひゅ','ひょ','みゃ','みゅ','みょ','りゃ','りゅ','りょ','ぎゃ','ぎゅ','ぎょ','じゃ','じゅ','じょ','びゃ','びゅ','びょ','ぴゃ','ぴゅ','ぴょ','キャ','キュ','キョ','シャ','シュ','ショ','チャ','チュ','チョ','ニャ','ニュ','ニョ','ヒャ','ヒュ','ヒョ','ミャ','ミュ','ミョ','リャ','リュ','リョ'];
  const EXT = ['ファ','フィ','フェ','フォ','ヴァ','ヴィ','ヴ','ヴェ','ヴォ','ティ','ディ','チェ','ジェ','シェ','ウィ','ウェ','ウォ'];
  const ALL = [...new Set([...HIRA,...KATA,...DAK,...YOON,...EXT])];
  const PRESET_TRACKERS = [
    {id:'presetStarter', name:'Starter', desc:'A-row with hints', chars:['あ','い','う','え','お']},
    {id:'presetIntermediate', name:'Intermediate', desc:'All Hiragana, no hints', chars:HIRA},
    {id:'presetAdvanced', name:'Advanced', desc:'Hiragana + Katakana + Dakuten', chars:[...HIRA,...KATA,...DAK]},
    {id:'presetPro', name:'Pro', desc:'Everything enabled', chars:ALL}
  ];
  let ACH_INDEX = {};
  function readJSON(k, fallback){ try{ return achStoreJSON(k, fallback); }catch(e){ return fallback; } }
  
function applyAchievementVisuals(root = document) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll("[data-ma-ach-accent]").forEach(el => {
        el.style.setProperty("--ma-ach-accent", el.dataset.maAchAccent || "96,165,250");
    });
    window.ModeAtlasUi?.applyProgressWidths?.(scope);
}


  function achEl(tag, className='', text=''){
    const el=document.createElement(tag);
    if(className) el.className=className;
    if(text!=='') el.textContent=String(text);
    return el;
  }
  function achButton(className='', text=''){
    const btn=achEl('button', className, text);
    btn.type='button';
    return btn;
  }
  function achStoreGet(key, fallback=''){
    const store = window.ModeAtlasStorage;
    return store?.get?.(key, fallback) ?? localStorage.getItem(key) ?? fallback;
  }

  function achStoreSet(key, value){
    const store = window.ModeAtlasStorage;
    return store?.set?.(key, value) ?? localStorage.setItem(key, String(value));
  }

  function achStoreJSON(key, fallback){
    const store = window.ModeAtlasStorage;
    if (store?.json) return store.json(key, fallback);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }

  function achStoreSetJSON(key, value){
    const store = window.ModeAtlasStorage;
    return store?.setJSON?.(key, value) ?? localStorage.setItem(key, JSON.stringify(value));
  }

  function setProgress(el,pct){
    el.dataset.maProgress=String(clamp(pct));
    return el;
  }
  function clamp(n){return Math.round(Math.max(0, Math.min(100, Number(n)||0)));}
  function latestTimestamp(keys){ let best=0; keys.forEach(k=>{ const v=achStoreGet(k, ''); const t=v?Date.parse(v):0; if(t>best) best=t; }); return best; }
  function countStats(){
    const Store=window.ModeAtlasStorage; const r=Store?.readModeJSON?.('reading','charStats',{})||readJSON('charStats',{}), w=Store?.readModeJSON?.('writing','charStats',{})||readJSON('reverseCharStats',{}), times=Store?.readModeJSON?.('reading','charTimes',{})||readJSON('charTimes',{}), words=readJSON('kanaWordBank',[]), tests=readJSON('testModeResults',[]);
    const correctFor = ch => {
      const rs=(r&&r[ch])||{}, ws=(w&&w[ch])||{};
      return (+rs.correct||0)+(+rs.right||0)+(+ws.correct||0)+(+ws.right||0);
    };
    const wrongFor = ch => {
      const rs=(r&&r[ch])||{}, ws=(w&&w[ch])||{};
      return (+rs.wrong||0)+(+rs.incorrect||0)+(+ws.wrong||0)+(+ws.incorrect||0);
    };
    const avgFor = ch => {
      const raw=(times&&times[ch]&&times[ch].avg)||0;
      return raw ? (raw>30 ? raw : raw*1000) : 0;
    };

    let correct=0, wrong=0, mastered=0, reviewing=0, learning=0, newly=0, seen=new Set(), under2=0, under1=0, perfect=0, avgSum=0, avgCount=0;
    [r,w].forEach(obj=>Object.keys(obj||{}).forEach(ch=>{ const s=obj[ch]||{}; const c=(+s.correct||0)+(+s.right||0), x=(+s.wrong||0)+(+s.incorrect||0); if(c+x>0) seen.add(ch); correct+=c; wrong+=x; }));
    ALL.forEach(ch=>{
      const c=correctFor(ch), x=wrongFor(ch), total=c+x, avg=avgFor(ch), acc=total?c/total:0;
      if(total===0){ newly++; return; }
      if(avg){ avgSum+=avg; avgCount++; }
      if(c>=50 && acc>=0.95 && avg>0 && avg<=1000) mastered++;
      else if(c>=10 && acc>=0.85 && (!avg || avg<=2500)) reviewing++;
      else learning++;
      if(avg && avg<=2000) under2++;
      if(avg && avg<=1000) under1++;
    });
    const presetValues = {};
    PRESET_TRACKERS.forEach(preset=>{
      presetValues[preset.id] = Math.min(100, preset.chars.reduce((sum,ch)=>sum+correctFor(ch),0));
    });
    const wordCount = Array.isArray(words) ? words.length : (words&&typeof words==='object'?Object.keys(words).length:0);
    const resultCount = Array.isArray(tests) ? tests.length : 0;
    try { perfect = (Array.isArray(tests)?tests:[]).filter(t=>Number(t.accuracy||0)>=100 || (Number(t.wrong||t.incorrect||0)===0 && Number(t.correct||0)>0)).length; } catch {}
    const cloud = achStoreGet('modeAtlasLastCloudSyncAt', '') ? 1 : 0;
    const backup = achStoreGet('modeAtlasLastExportAt', '') || achStoreGet('modeAtlasLastBackupAt', '') ? 1 : 0;
    const recentSave = latestTimestamp(['settingsUpdatedAt','resultsUpdatedAt','srsUpdatedAt','dailyUpdatedAt','profileUpdatedAt','kanaWordBankUpdatedAt']);
    return {correct,wrong,total:correct+wrong,seen:seen.size,new:newly,mastered,reviewing,learning,under2,under1,wordCount,resultCount,perfect,cloud,backup,recentSave,avg:avgCount?avgSum/avgCount:0,...presetValues};
  }
  const DEFINITIONS = {
    general: [
      {name:'First Steps', tier:'I', short:'25 answers', detail:'Answer 25 questions anywhere in Mode Atlas. Reading, Writing, Tests, and future branches all count.', target:25, key:'total'},
      {name:'Study Rhythm', tier:'I', short:'250 answers', detail:'Answer 250 total questions. This rewards steady practice across the app.', target:250, key:'total'},
      {name:'Study Rhythm', tier:'II', short:'1,000 answers', detail:'Answer 1,000 total questions across Mode Atlas.', target:1000, key:'total'},
      {name:'Study Rhythm', tier:'III', short:'2,500 answers', detail:'Answer 2,500 total questions across Mode Atlas.', target:2500, key:'total'},
      {name:'Study Rhythm', tier:'IV', short:'5,000 answers', detail:'Answer 5,000 total questions. This is for long-term consistency.', target:5000, key:'total'},
      {name:'Cloud Ready', tier:'Sync', short:'Cloud synced', detail:'Sign in and complete at least one successful cloud save so progress can follow you across devices.', target:1, key:'cloud'},
      {name:'Safety Net', tier:'Backup', short:'Export backup', detail:'Export or copy a save backup at least once. Backups help protect progress before big app updates.', target:1, key:'backup'}
    ],
    kana: [
      {name:'Kana Started', tier:'I', short:'25 kana seen', detail:'Practise at least 25 unique kana in Reading or Writing.', target:25, key:'seen'},
      {name:'Kana Collector', tier:'I', short:'75 kana seen', detail:'Practise at least 75 unique kana in the Kana Trainer.', target:75, key:'seen'},
      {name:'Kana Collector', tier:'II', short:'125 kana seen', detail:'Practise at least 125 unique kana across the trainer.', target:125, key:'seen'},
      {name:'Kana Collector', tier:'III', short:'175 kana seen', detail:'Practise 175 unique kana, covering most of the app’s kana set.', target:175, key:'seen'},
      {name:'Preset Complete', tier:'Starter', short:'Starter 100/100', detail:'Reach 100 correct answers in the Starter preset.', target:100, key:'presetStarter'},
      {name:'Preset Complete', tier:'Intermediate', short:'Intermediate 100/100', detail:'Reach 100 correct answers in the Intermediate preset.', target:100, key:'presetIntermediate'},
      {name:'Preset Complete', tier:'Advanced', short:'Advanced 100/100', detail:'Reach 100 correct answers in the Advanced preset.', target:100, key:'presetAdvanced'},
      {name:'Preset Complete', tier:'Pro', short:'Pro 100/100', detail:'Reach 100 correct answers in the Pro preset.', target:100, key:'presetPro'},
      {name:'Speed Goal', tier:'I', short:'25 under 2.0s', detail:'Build timing history until 25 kana average under 2.0 seconds.', target:25, key:'under2'},
      {name:'Speed Goal', tier:'II', short:'50 under 2.0s', detail:'Reach the 2.0 second recognition goal on 50 kana.', target:50, key:'under2'},
      {name:'Speed Goal', tier:'III', short:'100 under 2.0s', detail:'Reach the 2.0 second recognition goal on 100 kana.', target:100, key:'under2'},
      {name:'Fluent Target', tier:'I', short:'10 under 1.0s', detail:'Build timing history until 10 kana average under 1.0 second.', target:10, key:'under1'},
      {name:'Fluent Target', tier:'II', short:'25 under 1.0s', detail:'Reach fluent-speed timing on 25 kana. This is the second tier after the first fluent target.', target:25, key:'under1'},
      {name:'Fluent Target', tier:'III', short:'50 under 1.0s', detail:'Reach fluent-speed timing on 50 kana. This is a strong recognition milestone.', target:50, key:'under1'},
      {name:'Mastery Path', tier:'I', short:'20 mastered', detail:'Reach Mastered on 20 kana. Mastered combines attempts, accuracy, and speed.', target:20, key:'mastered'},
      {name:'Mastery Path', tier:'II', short:'50 mastered', detail:'Reach Mastered on 50 kana.', target:50, key:'mastered'},
      {name:'Mastery Path', tier:'III', short:'100 mastered', detail:'Reach Mastered on 100 kana.', target:100, key:'mastered'},
      {name:'Test Taker', tier:'I', short:'1 formal test', detail:'Complete your first formal Kana Trainer test.', target:1, key:'resultCount'},
      {name:'Test Taker', tier:'II', short:'10 formal tests', detail:'Complete 10 formal Kana Trainer tests.', target:10, key:'resultCount'},
      {name:'Perfect Form', tier:'I', short:'1 perfect test', detail:'Complete a formal test with no mistakes.', target:1, key:'perfect'},
      {name:'Perfect Form', tier:'II', short:'5 perfect tests', detail:'Complete five formal tests with no mistakes.', target:5, key:'perfect'}
    ],
    wordbank: [
      {name:'First Saved Word', tier:'I', short:'1 word', detail:'Save your first word in Word Bank.', target:1, key:'wordCount'},
      {name:'Word Stash', tier:'I', short:'25 words', detail:'Save 25 words in Word Bank.', target:25, key:'wordCount'},
      {name:'Word Stash', tier:'II', short:'100 words', detail:'Save 100 words in Word Bank.', target:100, key:'wordCount'},
      {name:'Word Archive', tier:'I', short:'250 words', detail:'Save 250 words in Word Bank.', target:250, key:'wordCount'},
      {name:'Word Archive', tier:'II', short:'500 words', detail:'Save 500 words in Word Bank.', target:500, key:'wordCount'}
    ]
  };
  function valueFor(s,key){ return Number(s[key]||0); }
  function achievementVisual(item,branch){
    const name=String(item&&item.name||'').toLowerCase();
    const out={
      branchLabel: branch==='kana' ? 'Kana Trainer' : branch==='wordbank' ? 'Word Bank' : 'General',
      accent: branch==='kana' ? '80,220,155' : branch==='wordbank' ? '96,165,250' : '245,195,93',
      icon: branch==='kana' ? 'あ' : branch==='wordbank' ? '語' : '✦'
    };
    if(branch==='general'){
      if(name.includes('rhythm')) out.icon='◎';
      else if(name.includes('cloud')) out.icon='☁';
      else if(name.includes('safety')) out.icon='⟲';
      else if(name.includes('first')) out.icon='✦';
    }
    if(branch==='kana'){
      if(name.includes('preset')) out.icon='賞';
      else if(name.includes('collector')) out.icon='カ';
      else if(name.includes('speed')) out.icon='速';
      else if(name.includes('fluent')) out.icon='流';
      else if(name.includes('mastery')) out.icon='達';
      else if(name.includes('test')) out.icon='試';
      else if(name.includes('perfect')) out.icon='✓';
    }
    if(branch==='wordbank'){
      if(name.includes('first')) out.icon='初';
      else if(name.includes('stash')) out.icon='帳';
      else if(name.includes('archive')) out.icon='保';
    }
    return out;
  }
  function achievement(item,s,branch,index){
    const value=valueFor(s,item.key), done=value>=item.target, pct=clamp(item.target ? value/item.target*100 : 0);
    const id=branch+'-'+index;
    const visual=achievementVisual(item,branch);
    ACH_INDEX[id]={...item, ...visual, value, pct, done, branch};

    const tile=achButton(`ma-achievement-tile branch-${branch} ${done?'done':''}`);
    tile.dataset.maAchAccent=visual.accent;
    tile.dataset.maAchId=id;
    tile.setAttribute('aria-label', `${item.name} ${item.tier} achievement details`);

    const top=achEl('div','ma-ach-topline');
    top.append(achEl('span','ma-ach-status-text', done?'Unlocked':pct+'%'));

    const graphic=achEl('span','ma-ach-graphic', visual.icon);
    graphic.setAttribute('aria-hidden','true');

    const meter=achEl('div','ma-ach-meter');
    meter.setAttribute('aria-hidden','true');
    meter.append(setProgress(achEl('span','ma-ach-meter-fill'), pct), achEl('span','ma-ach-meter-label', pct+'%'));

    tile.append(
      top,
      graphic,
      achEl('strong','',item.name),
      achEl('em','',item.tier),
      achEl('small','',item.short),
      meter
    );
    return tile;
  }

  function branchSection(title,key,s){
    const list=DEFINITIONS[key]||[];
    const unlocked=list.filter(item=>valueFor(s,item.key)>=item.target).length;
    const section=achEl('section','ma-achievement-section');
    const head=achEl('div','ma-ach-section-head');
    head.append(achEl('h3','',title), achEl('span','',`${unlocked}/${list.length} unlocked`));

    const grid=achEl('div','ma-achievement-grid');
    list.forEach((x,i)=>grid.append(achievement(x,s,key,i)));
    section.append(head,grid);
    return section;
  }

  function currentUnlockedAchievements(){
    const s=countStats();
    const out=[];
    Object.keys(DEFINITIONS).forEach(branch=>{
      (DEFINITIONS[branch]||[]).forEach((item,index)=>{
        if(valueFor(s,item.key)>=item.target){
          out.push({id:branch+'-'+index, branch, index, name:item.name, tier:item.tier});
        }
      });
    });
    return out;
  }
  function getSeenAchievementSet(){
    try { return new Set(achStoreJSON('modeAtlasSeenAchievementUnlocks', [])); }
    catch(e){ return new Set(); }
  }
  function saveSeenAchievementSet(set){
    try { achStoreSetJSON('modeAtlasSeenAchievementUnlocks', [...set]); } catch(e){}
  }
  function achievementToast(message){
    try { if(window.ModeAtlas && typeof window.ModeAtlas.toast==='function') return window.ModeAtlas.toast(message,'ok',4200); } catch(e){}
    let wrap=document.querySelector('.ma-toast-wrap');
    if(!wrap){ wrap=document.createElement('div'); wrap.className='ma-toast-wrap'; document.body.appendChild(wrap); }
    const node=document.createElement('div'); node.className='ma-toast ok'; node.textContent=message; wrap.appendChild(node);
    setTimeout(()=>{ node.style.opacity='0'; node.style.transform='translateY(-6px)'; setTimeout(()=>node.remove(),350); },4200);
  }
  function checkAchievementUnlocks({silent=false}={}){
    const unlocked=currentUnlockedAchievements();
    let seen=getSeenAchievementSet();
    if(!achStoreGet('modeAtlasAchievementBaselineSet', '')){
      unlocked.forEach(a=>seen.add(a.id));
      saveSeenAchievementSet(seen);
      try { achStoreSet('modeAtlasAchievementBaselineSet','1'); } catch(e){}
      return [];
    }
    const fresh=unlocked.filter(a=>!seen.has(a.id));
    if(fresh.length){
      fresh.forEach(a=>seen.add(a.id));
      saveSeenAchievementSet(seen);
      if(!silent){
        const first=fresh[0];
        const suffix=fresh.length>1 ? ` +${fresh.length-1} more` : '';
        achievementToast(`Achievement unlocked: ${first.name} ${first.tier}${suffix}`);
      }
    }
    return fresh;
  }
  function startAchievementWatcher(){
    if(window.__maAchievementWatcherStarted) return;
    window.__maAchievementWatcherStarted=true;
    checkAchievementUnlocks({silent:true});

    const checkFromEvent = () => checkAchievementUnlocks();
    window.addEventListener('storage',e=>{
      if(e && e.key && /charStats|reverseCharStats|charTimes|testModeResults|kanaWordBank|modeAtlasLastCloudSyncAt|modeAtlasLastExportAt|modeAtlasLastBackupAt|modeAtlasPresetAchievementProgress/.test(e.key)) checkAchievementUnlocks();
    });
    document.addEventListener('ma:progress-updated',checkFromEvent);
    document.addEventListener('ma:preset-progress-updated',checkFromEvent);
    document.addEventListener('ma:trainer-ready',checkFromEvent);
    document.addEventListener('ma:ui-refresh',checkFromEvent);
    window.addEventListener('kanaCloudSyncStatusChanged',checkFromEvent);
    window.addEventListener('focus',checkFromEvent);
    window.addEventListener('pageshow',checkFromEvent);
  }
  function renderAchievements(){
    const s=countStats(); ACH_INDEX={};
    const totalDefs=[...DEFINITIONS.general,...DEFINITIONS.kana,...DEFINITIONS.wordbank];
    const unlocked=totalDefs.filter(item=>valueFor(s,item.key)>=item.target).length;

    const wrap=document.createDocumentFragment();
    const head=achEl('div','ma-modal-head');
    const intro=document.createElement('div');
    intro.append(achEl('h2','','Achievements'), achEl('p','','Milestones across Mode Atlas. Select a tile to see the full unlock requirement.'));
    const close=achButton('', 'Close');
    close.dataset.maModalClose='';
    head.append(intro,close);

    const overview=achEl('div','ma-ach-overview');
    [[unlocked,'Unlocked'],[totalDefs.length,'Total'],[clamp(unlocked/Math.max(1,totalDefs.length)*100)+'%','Complete']].forEach(([value,label])=>{
      const item=document.createElement('div');
      item.append(achEl('b','',value), achEl('span','',label));
      overview.append(item);
    });

    const layout=achEl('div','ma-achievement-layout');
    layout.append(branchSection('General','general',s), branchSection('Kana Trainer','kana',s), branchSection('Word Bank','wordbank',s));

    wrap.append(head,overview,layout);
    return wrap;
  }

  function ensureAchievementInfoShell(){
    let pop=document.getElementById('maAchievementInfo');
    if(!pop){
      pop=document.createElement('div');
      pop.id='maAchievementInfo';
      pop.className='ma-ach-info';

      const backdrop=achEl('div','ma-ach-info-backdrop');
      backdrop.dataset.maAchInfoClose='';
      const panel=achEl('div','ma-ach-info-panel');
      panel.setAttribute('role','dialog');
      panel.setAttribute('aria-modal','true');
      const close=achButton('ma-ach-info-close','Close');
      close.dataset.maAchInfoClose='';
      const body=achEl('div','ma-ach-info-body');
      panel.append(close,body);
      pop.append(backdrop,panel);

      document.body.appendChild(pop);
      pop.addEventListener('click',e=>{ if(e.target.closest('[data-ma-ach-info-close]')) pop.classList.remove('open'); });
    }
    return pop;
  }

  function createInfoTopbar({branch, cls='', done=false, accent='96,165,250', symbol='✦', kicker='', title='', tier='', kana=false}){
    const topbar=achEl('div','ma-ach-info-topbar');
    const hero=achEl('div',`ma-ach-info-hero branch-${branch} ${cls || (done?'done':'')}`);
    hero.dataset.maAchAccent=accent;
    const sym=achEl('span','ma-ach-info-symbol',symbol);
    sym.setAttribute('aria-hidden','true');
    const titleWrap=document.createElement('div');
    titleWrap.append(achEl('span', kana ? 'ma-ach-info-kicker' : 'ma-ach-info-kicker', kicker));
    const h3=achEl('h3','',title);
    if(tier) h3.append(document.createTextNode(' '), achEl('em','',tier));
    titleWrap.append(h3);
    hero.append(sym,titleWrap);
    const close=achButton('ma-ach-info-close-inline','Close');
    close.dataset.maAchInfoClose='';
    topbar.append(hero,close);
    return topbar;
  }

  function openAchievementInfo(id){
    const item=ACH_INDEX[id]; if(!item) return;
    const pop=ensureAchievementInfoShell();
    const achInfoBody = pop.querySelector('.ma-ach-info-body');

    const progress=achEl('div','ma-ach-info-progress');
    const row=achEl('div','ma-ach-info-progress-row');
    row.append(achEl('strong','',item.done?'Unlocked':'In progress'), achEl('span','',`${Math.min(item.value,item.target)} / ${item.target}`));
    const meter=document.createElement('i');
    meter.append(setProgress(document.createElement('b'), item.pct));
    progress.append(row,meter);

    achInfoBody.replaceChildren(
      createInfoTopbar({
        branch:item.branch,
        done:item.done,
        accent:item.accent||'96,165,250',
        symbol:item.icon||'✦',
        kicker:item.branchLabel||item.branch.replace(/^./,c=>c.toUpperCase()),
        title:item.name,
        tier:item.tier
      }),
      achEl('p','ma-ach-info-copy',item.detail),
      progress
    );
    applyAchievementVisuals(achInfoBody);
    pop.classList.add('open');
  }

  function masteryLabel(ch){
    const r=readJSON('charStats',{}), w=readJSON('reverseCharStats',{}), times=readJSON('charTimes',{});
    const rs=(r&&r[ch])||{}, ws=(w&&w[ch])||{};
    const c=(+rs.correct||0)+(+ws.correct||0), x=(+rs.wrong||0)+(+ws.wrong||0), total=c+x;
    const raw=(times&&times[ch]&&times[ch].avg)||0;
    const avg=raw>30?raw:raw*1000;
    const acc=total?c/total:0;
    const avgText=avg?` · ${avg<1000?Math.round(avg)+'ms':(avg/1000).toFixed(1)+'s'}`:'';
    if(total===0) return {label:'New', cls:'new', detail:'Not practised yet'};
    if(c>=50 && acc>=0.95 && avg>0 && avg<=1000) return {label:'Mastered', cls:'mastered', detail:`${c}/${total} correct${avgText}`};
    if(c>=10 && acc>=0.85 && (!avg || avg<=2500)) return {label:'Reviewing', cls:'reviewing', detail:`${c}/${total} correct${avgText}`};
    return {label:'Learning', cls:'learning', detail:`${c}/${total} correct${avgText}`};
  }

  function masteryStats(ch){
    const r=readJSON('charStats',{}), w=readJSON('reverseCharStats',{}), times=readJSON('charTimes',{});
    const rs=(r&&r[ch])||{}, ws=(w&&w[ch])||{};
    const rc=Number(rs.correct||0), rw=Number(rs.wrong||0), wc=Number(ws.correct||0), ww=Number(ws.wrong||0);
    const correct=rc+wc, wrong=rw+ww, total=correct+wrong;
    const raw=(times&&times[ch]&&times[ch].avg)||0;
    const avg=raw>30?raw/1000:raw;
    const accuracy=total?Math.round(correct/total*100):0;
    const label=masteryLabel(ch);
    return {ch, rc, rw, wc, ww, correct, wrong, total, accuracy, avg, label};
  }
  function openMasteryKanaInfo(ch){
    const item=masteryStats(ch);
    const pop=ensureAchievementInfoShell();
    const avgText=item.avg?item.avg.toFixed(2)+'s':'No timing yet';
    const targetAttempts=Math.min(100, Math.round(item.correct/20*100));
    const targetAccuracy=item.total?Math.min(100,item.accuracy):0;
    const speedPct=item.avg?Math.max(0,Math.min(100,Math.round((2/Math.max(0.1,item.avg))*100))):0;
    const body=pop.querySelector('.ma-ach-info-body');

    const progress=achEl('div','ma-ach-info-progress');
    const row=achEl('div','ma-ach-info-progress-row');
    row.append(achEl('strong','','Total progress'), achEl('span','',`${item.correct} correct / ${item.total} attempts`));
    const meter=document.createElement('i');
    meter.append(setProgress(document.createElement('b'), Math.min(100,Math.round((targetAttempts+targetAccuracy+speedPct)/3))));
    progress.append(row,meter);

    const stats=achEl('div','ma-ach-info-stats');
    [
      ['Reading',`${item.rc}✓ / ${item.rw}×`],
      ['Writing',`${item.wc}✓ / ${item.ww}×`],
      ['Accuracy',item.total?item.accuracy+'%':'No attempts yet'],
      ['Avg time',avgText]
    ].forEach(([label,value])=>{
      const stat=document.createElement('div');
      stat.append(achEl('b','',label), achEl('span','',value));
      stats.append(stat);
    });

    body.replaceChildren(
      createInfoTopbar({
        branch:'kana',
        cls:item.label.cls,
        accent:'80,220,155',
        symbol:ch,
        kicker:'Mastery Map',
        title:ch,
        tier:item.label.label,
        kana:true
      }),
      achEl('p','ma-ach-info-copy',item.label.detail),
      progress,
      stats,
      achEl('p','ma-ach-info-copy','Mastered needs 50+ correct, 95%+ accuracy, and an average recognition time of 1.0s or faster.')
    );
    applyAchievementVisuals(body);
    pop.classList.add('open');
  }


  function grid(title, chars){
    const section=achEl('section','ma-mastery-group');
    section.append(achEl('h3','',title));
    const gridEl=achEl('div','ma-mastery-grid');
    chars.forEach(ch=>{
      const m=masteryLabel(ch);
      const btn=achButton(`ma-mastery-cell ${m.cls}`);
      btn.dataset.maMasteryKana=ch;
      btn.title=`${ch} · ${m.label} · ${m.detail}`;
      btn.setAttribute('aria-label', `${ch} mastery details: ${m.label}`);
      btn.append(achEl('strong','',ch), achEl('span','',m.label));
      gridEl.append(btn);
    });
    section.append(gridEl);
    return section;
  }

  function renderMasteryMap(){
    const s=countStats();
    const wrap=document.createDocumentFragment();
    const head=achEl('div','ma-modal-head');
    const intro=document.createElement('div');
    intro.append(achEl('h2','','Mastery Map'), achEl('p','','A full kana grid showing accuracy, repetition, and speed progress.'));
    const close=achButton('', 'Close');
    close.dataset.maModalClose='';
    head.append(intro, close);

    const legend=achEl('div','ma-mastery-legend');
    [
      ['new','New','Not practised yet.'],
      ['learning','Learning','Started, but confidence, accuracy, or reps are still building.'],
      ['reviewing','Reviewing','Mostly correct and ready to build faster recognition.'],
      ['mastered','Mastered','50+ correct, 95%+ accuracy, and 1.0s or faster recognition.']
    ].forEach(([cls,label,copy])=>{
      const item=achEl('div',cls);
      item.append(achEl('b','',label), achEl('span','',copy));
      legend.append(item);
    });

    const summary=achEl('div','ma-mastery-summary ma-mastery-stage-summary');
    [['new',s.new,'new'],['learning',s.learning,'learning'],['reviewing',s.reviewing,'reviewing'],['mastered',s.mastered,'mastered']].forEach(([cls,value,label])=>{
      const item=achEl('span',cls);
      item.append(achEl('b','',value), document.createTextNode(' '+label));
      summary.append(item);
    });

    const speed=achEl('div','ma-speed-summary');
    [[s.under2,'under 2.0s'],[s.under1,'under 1.0s']].forEach(([value,label])=>{
      const item=document.createElement('span');
      item.append(achEl('b','',value), document.createTextNode(' '+label));
      speed.append(item);
    });

    wrap.append(head,legend,summary,speed,grid('Hiragana',HIRA),grid('Katakana',KATA),grid('Dakuten',DAK),grid('Yōon',YOON),grid('Extended Katakana',EXT));
    return wrap;
  }

  function ensureFeatureModal(){
    let shell=document.getElementById('maFeatureModal');
    if(!shell){
      shell=document.createElement('div');
      shell.id='maFeatureModal';
      shell.className='ma-feature-modal';

      const backdrop=achEl('div','ma-feature-backdrop');
      backdrop.dataset.maModalClose='';
      const panel=achEl('div','ma-feature-panel');
      panel.setAttribute('role','dialog');
      panel.setAttribute('aria-modal','true');
      panel.append(achEl('div','ma-feature-content'));
      shell.append(backdrop,panel);

      document.body.appendChild(shell);
      shell.addEventListener('click',e=>{
        if(e.target.closest('[data-ma-modal-close]')) closeModal();
        const ach=e.target.closest('[data-ma-ach-id]');
        if(ach){ e.preventDefault(); openAchievementInfo(ach.getAttribute('data-ma-ach-id')); }
        const kana=e.target.closest('[data-ma-mastery-kana]');
        if(kana){ e.preventDefault(); openMasteryKanaInfo(kana.getAttribute('data-ma-mastery-kana')); }
      });
      document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ closeModal(); const p=document.getElementById('maAchievementInfo'); if(p) p.classList.remove('open'); }});
    }
    return shell;
  }

  function openModal(kind){
    const shell=ensureFeatureModal();
    const featureContent = shell.querySelector('.ma-feature-content');
    featureContent.replaceChildren(kind==='mastery' ? renderMasteryMap() : renderAchievements());
    applyAchievementVisuals(featureContent);
    shell.classList.add('open');
  }

  function closeModal(){ const shell=document.getElementById('maFeatureModal'); if(shell) shell.classList.remove('open'); const p=document.getElementById('maAchievementInfo'); if(p) p.classList.remove('open'); }
  function init(){
    startAchievementWatcher();
    if(!window.__maFeatureClickBound){
      window.__maFeatureClickBound=true;
      document.addEventListener('click',e=>{
        if(e.target.closest('[data-ma-achievements-open]')) {
          e.preventDefault();
          openModal('achievements');
          return;
        }
        if(e.target.closest('[data-ma-mastery-open]')) {
          e.preventDefault();
          openModal('mastery');
        }
      });
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  window.ModeAtlasFeatures={openAchievements:()=>openModal('achievements'), openMasteryMap:()=>openModal('mastery'), checkAchievements:()=>checkAchievementUnlocks(), version:VERSION};
})();
