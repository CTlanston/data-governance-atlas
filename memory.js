'use strict';
window.AtlasMemory = (() => {
  const Core=window.AtlasMemoryCore,KEY='data-atlas-memory-v1';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={known:'非常了解',unsure:'模糊',unknown:'不了解',new:'未测试'};
  let state,terms=[],termMap,base,host,onTopic,active=false,storageOK=true,queryTimer,composing=false;
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;}catch{storageOK=false;}storageNotice();}
  function storageNotice(){const el=host?.querySelector('.memory-storage');if(el)el.textContent=storageOK?'进度保存在当前浏览器，刷新后继续。不同设备不会自动同步。':'浏览器未允许保存；当前仍可练习，但关闭或刷新后进度可能丢失。';}
  function init(config){
    ({terms,base,onTopic}=config);host=document.getElementById('memory-section');termMap=new Map(terms.map(t=>[t.id,t]));
    let raw;try{raw=JSON.parse(localStorage.getItem(KEY)||'null');}catch{storageOK=false;}
    state=Core.normalize(raw,terms);if(!state.session)Core.start(state,terms);save();
    host.addEventListener('click',handleClick);host.addEventListener('change',handleChange);
    const queueSearch=input=>{clearTimeout(queryTimer);const value=input.value;queryTimer=setTimeout(()=>{state.settings.query=value;Core.start(state,terms);save();render({preserveQuery:true});},250);};
    host.addEventListener('compositionstart',e=>{if(e.target.id==='memory-query'){composing=true;clearTimeout(queryTimer);}});
    host.addEventListener('compositionend',e=>{if(e.target.id==='memory-query'){composing=false;queueSearch(e.target);}});
    host.addEventListener('input',e=>{if(e.target.id==='memory-query'&&!composing&&!e.isComposing)queueSearch(e.target);});
    document.addEventListener('keydown',e=>{
      if(!active||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,select,textarea,button,a,summary'))return;
      if(e.code==='Space'){e.preventDefault();flip();}else if(['1','2','3'].includes(e.key)){e.preventDefault();grade(['unknown','unsure','known'][Number(e.key)-1]);}
    });
  }
  function show(onlyId){active=true;if(onlyId&&termMap.has(onlyId)){state.settings.query='';state.settings.status='all';state.settings.module='all';Core.start(state,terms,Math.random,onlyId);save();}render();}
  function hide(){active=false;clearTimeout(queryTimer);}
  function top(){host.querySelector('.review-area')?.scrollIntoView({block:'start',behavior:'instant'});}
  function newRound(weak=false){clearTimeout(queryTimer);if(weak)state.settings.status='weak';Core.start(state,terms);save();render();top();}
  function flip(){if(Core.reveal(state)){save();render();host.querySelector('.memory-answer')?.focus({preventScroll:true});}}
  function grade(status){if(!Core.rate(state,status))return;save();render();top();host.querySelector('.recall-card,.round-done')?.focus({preventScroll:true});}
  function handleChange(e){const key=e.target.dataset.filter;if(!key)return;clearTimeout(queryTimer);state.settings[key]=key==='weakFirst'?e.target.checked:e.target.value;Core.start(state,terms);save();render();}
  function handleClick(e){
    const b=e.target.closest('[data-memory]');if(!b)return;
    switch(b.dataset.memory){
      case 'reveal':flip();break;
      case 'rate':grade(b.dataset.status);break;
      case 'shuffle':newRound();break;
      case 'weak':newRound(true);break;
      case 'all':state.settings.status='all';state.settings.module='all';state.settings.query='';newRound();break;
      case 'clear':state.settings={...Core.defaults().settings,direction:state.settings.direction};newRound();break;
      case 'undo':if(Core.undo(state)){save();render();top();}break;
      case 'topic':onTopic(b.dataset.id);break;
    }
  }
  function option(value,label,current){return `<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`;}
  function filters(){const f=state.settings;return `<div class="memory-filters"><label>知识模块<select data-filter="module" aria-label="筛选知识模块">${option('all','全部模块',f.module)}${base.modules.map(m=>option(m.id,m.shortTitle,f.module)).join('')}</select></label><label>自评状态<select data-filter="status" aria-label="筛选自评状态">${[['all','全部状态'],['new','未测试'],['unknown','不了解'],['unsure','模糊'],['known','非常了解'],['weak','模糊＋不了解']].map(([v,l])=>option(v,l,f.status)).join('')}</select></label><label>测试方向<select data-filter="direction" aria-label="选择测试方向">${[['en-zh','英文 → 中文'],['zh-en','中文 → 英文'],['mixed','中英随机']].map(([v,l])=>option(v,l,f.direction)).join('')}</select></label><label class="memory-query-label">查找词汇<input id="memory-query" type="search" value="${esc(f.query)}" placeholder="例如 Catalog / 资产 / SLO" aria-label="查找记忆卡词汇"></label></div><div class="memory-options"><label><input type="checkbox" data-filter="weakFirst" ${f.weakFirst?'checked':''}>优先复习不了解、模糊的词</label><button data-memory="shuffle">↻ 重新洗牌测试</button></div>`;}
  function statistics(){const c=Core.counts(state,terms);return `<div class="memory-statistics" aria-label="全词库自评统计">${['new','unknown','unsure','known'].map(s=>`<div class="memory-stat ${s}"><span>${labels[s]}</span><strong>${c[s]}</strong></div>`).join('')}</div>`;}
  function refs(t){const refs=[...(t.sourceIds||[]).map(id=>base.sourceIndex.find(s=>s.number===id)).filter(Boolean),...(t.extraSources||[])];return refs.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a>`).join('');}
  function card(){
    const s=state.session,t=termMap.get(s.ids[s.position]);
    if(!s.ids.length)return `<div class="memory-empty"><span>↗</span><h2>这一组暂时没有词汇</h2><p>可以换一个模块或状态，或者清除筛选后继续测试。已有自评记录会保留。</p><button class="memory-primary" data-memory="clear">查看全部词汇</button></div>`;
    if(!t)return done();
    const dir=s.directions[s.position],enFirst=dir==='en-zh',status=state.records[t.id]?.status||'new',module=base.modules.find(m=>m.id===t.moduleIds[0]);
    return `<div class="round-progress"><span>本轮 <strong>${s.position+1}</strong> / ${s.ids.length}</span><span>已自评 ${s.position} 张</span></div><div class="round-track" role="progressbar" aria-label="本轮测试进度" aria-valuenow="${s.position}" aria-valuemin="0" aria-valuemax="${s.ids.length}"><i style="width:${s.position/s.ids.length*100}%"></i></div><article class="recall-card ${s.revealed?'revealed':''}" tabindex="-1" aria-label="${s.revealed?'已翻开的答案':'待回答的词汇卡'}"><div class="card-meta"><span>${esc(module.shortTitle)} · ${t.origin==='source'?'来源术语':t.origin==='framework'?'新增框架':'学习延伸'}</span><span class="recall-status ${status}">${labels[status]}</span></div><div class="recall-question"><div class="recall-direction">${enFirst?'ENGLISH → 中文':'中文 → ENGLISH'}</div><h2>${esc(enFirst?t.en:t.zh)}</h2>${enFirst&&t.abbr?`<div class="recall-abbr">${esc(t.abbr)}</div>`:''}<p>${enFirst?'先想想它的中文意思，能否用自己的话解释？':'先说出对应英文，再用自己的话解释它。'}</p></div>${s.revealed?`<div class="memory-answer" tabindex="-1"><div class="answer-heading"><span>参考答案</span><h3>${esc(enFirst?t.zh:t.en)}${!enFirst&&t.abbr?` <small>${esc(t.abbr)}</small>`:''}</h3></div><section><h4>怎么理解</h4><p>${esc(t.definition)}</p></section><section class="answer-distinction"><h4>别和它混淆</h4><p>${esc(t.distinction)}</p></section><section><h4>举个例子 · 教学示例</h4><p>${esc(t.example)}</p></section><div class="card-topic-links">${t.topicIds.slice(0,3).map(id=>{const topic=base.modules.flatMap(m=>m.topics).find(x=>x.id===id);return topic?`<button data-memory="topic" data-id="${esc(id)}">${esc(topic.shortTitle)} ↗</button>`:'';}).join('')}</div><details class="card-sources"><summary>术语来源</summary>${refs(t)}</details></div>`:`<div class="reveal-control"><button class="memory-primary" data-memory="reveal">翻开答案 <kbd>Space</kbd></button><small>先回想，再翻卡；不需要先选“了解”。</small></div>`}</article><div class="memory-rating"><p>${s.revealed?'按自己的理解标记，选择后进入下一张。':'翻开答案后，可以标记自己的理解程度。'}</p><div>${[['unknown','不了解','1'],['unsure','模糊','2'],['known','非常了解','3']].map(([id,label,key])=>`<button class="rate-${id}" data-memory="rate" data-status="${id}" ${s.revealed?'':'disabled'}>${label}<kbd>${key}</kbd></button>`).join('')}</div></div><div class="round-tools"><button data-memory="undo" ${s.history.length?'':'disabled'}>← 撤回上次标记</button><span>自评帮助安排复习，不代表客观测评结果。</span></div>`;
  }
  function done(){const tally={unknown:0,unsure:0,known:0};for(const h of state.session.history)tally[h.status]++;return `<div class="round-done" tabindex="-1"><div class="done-mark">✓</div><span class="memory-kicker">ROUND COMPLETE</span><h2>这一轮，完成了。</h2><p>已测试 ${state.session.ids.length} 个词。再回顾一遍模糊或不了解的词，让意思和英文一起留下来。</p><div class="round-tally">${['unknown','unsure','known'].map(s=>`<span>${labels[s]} <strong>${tally[s]}</strong></span>`).join('')}</div><div class="done-actions"><button class="memory-primary" data-memory="weak">再测薄弱词</button><button class="memory-secondary" data-memory="all">全部重新测试</button></div><button class="memory-undo" data-memory="undo" ${state.session.history.length?'':'disabled'}>撤回最后一次标记</button></div>`;}
  function render({preserveQuery=false}={}){
    const focus=preserveQuery&&document.activeElement?.id==='memory-query';const caret=focus?document.activeElement.selectionStart:null;
    host.innerHTML=`<div class="memory-inner"><div class="memory-heading"><div><div class="memory-kicker">TERMINOLOGY FLASHCARDS</div><h1>把专业词汇，变成熟悉的语言。</h1><p>${terms.length} 张中英记忆卡 · 先回想，再翻卡，按自己的理解反复练习。</p></div><span class="memory-self">SELF CHECK</span></div>${statistics()}${filters()}<div class="review-area">${card()}</div><p class="memory-storage" role="status"></p></div>`;
    storageNotice();if(focus){const input=host.querySelector('#memory-query');input.focus({preventScroll:true});try{input.setSelectionRange(caret,caret);}catch{}}
  }
  return {init,show,hide,get active(){return active;},get state(){return state;}};
})();
