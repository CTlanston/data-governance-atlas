'use strict';
(() => {
  const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const domains={governance:'数据治理',privacy:'隐私工程',risk:'业务风控'},types={technical:'技术简答',scenario:'场景设计'};
  $('.skip-link').addEventListener('click',e=>{e.preventDefault();$('#question-panel').focus({preventScroll:true});$('#question-panel').scrollIntoView({block:'start',behavior:'instant'});});
  let questions=[],terms=new Map(),base,selected='',filtered=[],termFilter='',composing=false;
  const list=items=>`<ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
  const route=l=>`./learn.html#${[l.topicId,l.sectionId,l.itemId].map(encodeURIComponent).join('/')}`;
  function readUrl(){
    const q=new URLSearchParams(location.search);
    $('#practice-search').value=q.get('q')||'';
    $('#practice-domain').value=Object.hasOwn(domains,q.get('domain'))?q.get('domain'):'all';
    $('#practice-type').value=Object.hasOwn(types,q.get('type'))?q.get('type'):'all';
    termFilter=q.get('term')||'';
    try{selected=decodeURIComponent(location.hash.slice(1));}catch{selected='';}
  }
  function writeUrl(){
    const u=new URL(location.href);
    for(const [key,value]of [['q',$('#practice-search').value],['domain',$('#practice-domain').value],['type',$('#practice-type').value],['term',termFilter]]){
      if(value&&value!=='all')u.searchParams.set(key,value);else u.searchParams.delete(key);
    }
    u.hash=selected;history.replaceState(null,'',u);
  }
  function applyFilters(){
    const q=$('#practice-search').value.trim().toLocaleLowerCase(),domain=$('#practice-domain').value,type=$('#practice-type').value;
    filtered=questions.filter(x=>(domain==='all'||x.domain===domain)&&(type==='all'||x.type===type)&&(!termFilter||x.termIds.includes(termFilter))&&(!q||[x.title,x.prompt,...x.checkpoints,...x.termIds.map(id=>{const t=terms.get(id);return t?[t.zh,t.en,t.abbr,...t.aliases].join(' '):id;})].join(' ').toLocaleLowerCase().includes(q)));
    if(!filtered.some(x=>x.id===selected))selected=filtered[0]?.id||'';
    writeUrl();render();
  }
  function render(){
    $('#result-count').textContent=`${filtered.length} / ${questions.length} 题`;
    $('[data-random]').disabled=!filtered.length;
    const chip=$('#term-filter');chip.hidden=!termFilter;
    chip.innerHTML=termFilter?`关联词汇：${esc(terms.get(termFilter)?.en||termFilter)} <button data-clear-term>取消词汇筛选 ×</button>`:'';
    $('#question-list').innerHTML=filtered.length?filtered.map((x,i)=>`<button type="button" data-question="${esc(x.id)}" ${x.id===selected?'aria-current="true"':''}><span class="question-number">${String(i+1).padStart(2,'0')}</span><span><small>${domains[x.domain]} · ${types[x.type]}</small><strong>${esc(x.title)}</strong><em>${esc(x.priority)} · 建议 ${x.minutes} 分钟</em></span></button>`).join(''):'<p class="index-empty">没有匹配的题目。</p>';
    const x=filtered.find(x=>x.id===selected);
    if(!x){$('#question-panel').innerHTML='<div class="practice-empty"><h2>换一个词，或扩大范围。</h2><p>试试更短的关键词，也可以清除筛选，查看全部练习。</p><button data-reset>查看全部题目</button></div>';return;}
    const sources=[...x.sourceIds.map(id=>base.sourceIndex.find(s=>s.number===id)).filter(Boolean),...x.extraSources].filter((s,i,a)=>a.findIndex(o=>o.url===s.url)===i);
    const at=filtered.indexOf(x);
    $('#question-panel').innerHTML=`<div class="question-meta"><span>${domains[x.domain]} / ${types[x.type]}</span><span>${esc(x.priority)} · ${x.minutes} MIN</span></div><h2 class="question-title">${esc(x.title)}</h2><p class="question-prompt">${esc(x.prompt)}</p>${x.assumptions.length?`<section class="scenario-brief"><h3>${x.type==='scenario'?'情景设定 · 教学假设':'先明确讨论边界'}</h3>${list(x.assumptions)}</section>`:''}<p class="thinking-cue">先试着说出你的判断、依据与取舍。参考思路提供核对要点，允许有依据的其他方案。</p><details id="answer-guide"><summary><span>展开参考思路</span><small>关键判断 · 常见误区 · 追问</small></summary><div class="answer-body"><div class="answer-steps">${x.answer.map((a,i)=>`<section class="answer-step"><span>${String(i+1).padStart(2,'0')}</span><div><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p></div></section>`).join('')}</div><section class="answer-checks"><h3>回答中应体现的考点</h3>${list(x.checkpoints)}</section><section class="answer-pitfalls"><h3>容易失分的地方</h3>${list(x.pitfalls)}</section><section class="answer-followups"><h3>继续追问</h3><ol>${x.followups.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></section></div></details><section class="practice-related"><h3>回到具体知识点</h3><div>${x.links.map(l=>`<a href="${esc(route(l))}">${esc(l.label)} ↗</a>`).join('')}</div>${x.termIds.length?`<div class="practice-terms">${x.termIds.map(id=>{const t=terms.get(id);return t?`<a href="./learn.html#cards/${esc(id)}">${esc(t.zh)} <span>${esc(t.en)}</span> ↗</a>`:'';}).join('')}</div>`:''}</section><details class="practice-sources"><summary>参考资料与适用边界</summary><p>题目为学习整理；文档支持相关概念与机制，不表示原文发布过这道面试题。</p>${sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a>`).join('')}</details><nav class="question-pagination" aria-label="切换练习"><button data-step="-1" ${at===0?'disabled':''}>← 上一题</button><span>${at+1} / ${filtered.length}</span><button data-step="1" ${at===filtered.length-1?'disabled':''}>下一题 →</button></nav>`;
    document.title=`${x.title} · 面试练习 · Data Atlas`;
  }
  function select(id,focus=true){selected=id;writeUrl();render();if(focus){$('#question-panel').focus({preventScroll:true});$('#question-panel').scrollIntoView({block:'start',behavior:'instant'});}}
  function reset(){termFilter='';$('#practice-search').value='';$('#practice-domain').value='all';$('#practice-type').value='all';applyFilters();}
  async function init(){
    const controls=[...document.querySelectorAll('.practice-filters input,.practice-filters select,.practice-filters button')];
    controls.forEach(c=>c.disabled=true);$('#question-panel').setAttribute('aria-busy','true');
    try{
      const shards=['governance','privacy','delivery'];
      const files=['knowledge.json',...shards.map(s=>`interview-${s}.json`),...shards.map(s=>`glossary-${s}.json`)];
      const data=await Promise.all(files.map(async f=>{const r=await fetch(`./${f}?v=study-2`);if(!r.ok)throw Error('content unavailable');return r.json();}));
      base=data[0];questions=data.slice(1,4).flatMap(d=>d.questions);terms=new Map(data.slice(4).flatMap(d=>d.terms).map(t=>[t.id,t]));
      controls.forEach(c=>c.disabled=false);readUrl();applyFilters();
      for(const id of ['#practice-domain','#practice-type'])$(id).addEventListener('change',applyFilters);
      const search=$('#practice-search');search.addEventListener('compositionstart',()=>composing=true);search.addEventListener('compositionend',()=>{composing=false;applyFilters();});search.addEventListener('input',e=>{if(!composing&&!e.isComposing)applyFilters();});
      document.addEventListener('click',e=>{const b=e.target.closest('[data-question],[data-step],[data-random],[data-reset],[data-clear-term]');if(!b)return;
        if(b.hasAttribute('data-question'))select(b.dataset.question);
        else if(b.hasAttribute('data-step')){const i=filtered.findIndex(x=>x.id===selected)+Number(b.dataset.step);if(filtered[i])select(filtered[i].id);}
        else if(b.hasAttribute('data-random')){const pool=filtered.filter(x=>x.id!==selected);if(pool.length)select(pool[Math.floor(Math.random()*pool.length)].id);}
        else if(b.hasAttribute('data-clear-term')){termFilter='';applyFilters();}
        else reset();
      });
      window.addEventListener('popstate',()=>{readUrl();applyFilters();});
      window.addEventListener('hashchange',()=>{readUrl();applyFilters();});
    }catch{$('#result-count').textContent='暂未加载';$('#question-panel').innerHTML='<div class="practice-empty"><h2>题目暂时无法加载</h2><p>请检查网络后重新打开，也可先回到学习导图。</p><a href="./interview.html">重新加载</a> · <a href="./learn.html">打开学习导图</a></div>';}
    finally{$('#question-panel').setAttribute('aria-busy','false');}
  }
  init();
})();
