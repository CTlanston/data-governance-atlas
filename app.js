'use strict';
const $ = (selector, parent = document) => parent.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = i => String(i + 1).padStart(2, '0');
const state = {data:null, topics:[], active:'overview'};
const byId = id => state.topics.find(t => t.id === id);
const moduleById = id => state.data.modules.find(m => m.id === id);
const iconArrow = '<span aria-hidden="true">↗</span>';
const moduleNames = {governance:'治理策略与责任',assets:'资产发现与血缘',lifecycle:'生命周期与存储',reliability:'质量与工程效率',privacy:'隐私工程与控制',risk:'业务风控与反馈',ai:'AI 与跨系统隐私',tpm:'项目交付与度量'};
const keywords = {governance:['组织与责任','决策与规则','价值与证据'],assets:['资产目录','元数据','血缘'],lifecycle:['存储','留存','删除'],reliability:['质量','稳定性','成本'],privacy:['威胁建模','控制','用户选择'],risk:['判断','处置','反馈'],ai:['分类','模型','Agent'],tpm:['依赖与风险','跨团队交付','指标与收益']};

function originTag(t){return `<span class="tag ${t.status==='new'?'new':t.status==='source'?'source':''}">${esc(t.status==='new'?'新增框架':t.status==='source'?'来源提炼':'学习延伸')}</span>`;}
function buildTree(){
  $('#tree').innerHTML=state.data.modules.map((m,i)=>`<details data-module="${m.id}"><summary><span class="mod-num">${number(i)}</span>${esc(moduleNames[m.id])}</summary><div class="tree-children"><a href="#module/${m.id}" data-id="module/${m.id}">模块概览</a>${m.topics.map(t=>`<a href="#topic/${t.id}" data-id="topic/${t.id}">${esc(t.shortTitle)}</a>`).join('')}</div></details>`).join('');
}
function mapNode(id, type=''){
  const m=moduleById(id),i=state.data.modules.indexOf(m);
  return `<a class="map-node ${type}" href="#module/${m.id}"><span class="node-num">${number(i)}</span><div><h3>${esc(moduleNames[id])}</h3><p>${esc(m.question)}</p></div><span class="node-arrow" aria-hidden="true">↗</span><div class="node-meta">${keywords[id].map(k=>`<span>${esc(k)}</span>`).join('')}</div></a>`;
}
function overview(){
  return `<div class="page-heading"><div><div class="eyebrow">ENTERPRISE DATA KNOWLEDGE</div><h1>从零散知识，到完整体系。</h1><p>以企业数据治理为主线，连接技术机制、隐私控制与项目交付。<br>先看全景，再沿着一个问题深入。</p><div class="stats"><span><strong>08</strong>知识模块</span><i></i><span><strong>47</strong>关键主题</span><i></i><span><strong>19</strong>参考来源</span></div></div><div class="edition"><strong>一张可以持续展开的知识地图</strong>LEARN · CONNECT · APPLY</div></div>
  <div class="section-head"><h2>企业数据治理全景</h2><p>点击模块展开 · 层次表示职责关系</p></div>
  <section class="architecture" aria-label="企业数据治理分层地图"><div class="architecture-top"><strong>策略定义方向，工程落实控制，交付形成闭环。</strong><span>KNOWLEDGE ARCHITECTURE</span></div>
    <div class="map-row"><div class="layer-label">治理方向<small>STRATEGY</small></div><div class="map-cells">${mapNode('governance','wide strategy')}</div></div>
    <div class="map-row"><div class="layer-label">数据基础<small>FOUNDATION</small></div><div class="map-cells">${mapNode('assets')}${mapNode('lifecycle')}${mapNode('reliability')}</div></div>
    <div class="map-row"><div class="layer-label">控制与应用<small>CONTROL</small></div><div class="map-cells">${mapNode('privacy','application')}${mapNode('risk','application')}${mapNode('ai','application')}</div></div>
    <div class="map-row"><div class="layer-label">交付闭环<small>DELIVERY</small></div><div class="map-cells">${mapNode('tpm','wide delivery')}</div></div>
  </section>
  <section class="path-section"><div class="path-header"><div class="eyebrow">FOLLOW A QUESTION</div><h2>沿一个问题串起体系：用户请求删除数据</h2><p>查阅顺序示意，工程可并行</p></div><div class="path-steps">${[['tpm-delete-case','明确请求范围'],['asset-coverage','找到所有副本'],['life-retention','判断留存例外'],['life-deletion','完成各阶段删除'],['ai-unlearning','区分模型影响'],['gov-evidence','证明执行结果']].map(([id,title],i)=>`<a class="path-step" href="#topic/${id}"><small>STEP ${number(i)}</small><strong>${title}</strong></a>`).join('')}</div></section>
  <div class="legend"><span><b></b>学习延伸：经核对的概念整理</span><span><b class="source"></b>来源提炼：参考文章摘要</span><span><b class="new"></b>新增框架：补齐体系的知识</span></div>`;
}
function modulePage(m){
  const i=state.data.modules.indexOf(m),comparisons=m.topics.filter(t=>t.compare).length,flows=m.topics.filter(t=>t.flow).length;
  return `<a class="top-return" href="#overview">← 返回体系全景</a><div class="module-heading"><span class="module-big-num">${number(i)}</span><div><div class="eyebrow">KNOWLEDGE MODULE</div><h1>${esc(m.title)}</h1><p>${esc(m.question)}</p></div></div><div class="module-intro"><span>${esc(m.subtitle)}</span><div>${m.topics.length} 个主题 <b>·</b> ${comparisons} 张对比表 <b>·</b> ${flows} 个流程</div></div><section class="topic-list" aria-label="本模块主题">${m.topics.map((t,j)=>`<a class="topic-row" href="#topic/${t.id}"><span class="topic-row-num">${number(j)}</span><div><div class="topic-row-title"><h2>${esc(t.shortTitle)}</h2>${originTag(t)}</div><p>${esc(t.summary)}</p><div class="row-keywords">${t.keywords.slice(0,4).map(k=>`<span>${esc(k)}</span>`).join('')}</div></div><span class="row-arrow" aria-hidden="true">↗</span></a>`).join('')}</section><div class="module-bottom"><span>阅读建议：先把握概念边界，再看机制、对比与适用条件。</span><a class="text-link" href="#comparisons">浏览全部概念对比 ↗</a></div>`;
}
function comparison(t){
  if(!t.compare)return '';
  return `<section class="reading-section" id="compare"><div class="reading-section-heading"><span class="section-number">02</span><h2>放在一起，才看得清</h2><span class="section-kind">概念对比</span></div><div class="table-wrap" tabindex="0" role="region" aria-label="${esc(t.shortTitle)}概念对比表"><table><thead><tr>${t.compare.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.compare.rows.map(row=>`<tr>${row.map((v,i)=>i===0?`<th scope="row">${esc(v)}</th>`:`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}
function flow(t){
  if(!t.flow)return '';const f=t.flow;
  const steps=(items)=>`<ol class="flow-steps">${items.map((step,i)=>`<li><span class="flow-number">${number(i)}</span><strong>${esc(typeof step==='string'?step:step.title)}</strong>${typeof step==='string'?'':`<p>${esc(step.text)}</p>`}</li>`).join('')}</ol>`;
  return `<section class="reading-section" id="flow"><div class="reading-section-heading"><span class="section-number">${t.compare?'03':'02'}</span><h2>${esc(f.title||'让机制沿流程展开')}</h2><span class="section-kind">${f.lanes?'并行路径':'机制流程'}</span></div><div class="flow-diagram">${f.lanes?f.lanes.map(l=>`<div class="flow-lane"><h3>${esc(l.title)}</h3>${steps(l.steps)}</div>`).join(''):steps(f.steps)}${f.note?`<p class="flow-note">${esc(f.note)}</p>`:''}</div></section>`;
}
function topicPage(t){
  const m=moduleById(t.moduleId),i=m.topics.findIndex(x=>x.id===t.id),prev=m.topics[i-1],next=m.topics[i+1];
  return `<a class="top-return" href="#module/${m.id}">← ${esc(moduleNames[m.id])}</a><div class="topic-heading"><div class="topic-meta"><span class="eyebrow">${number(state.data.modules.indexOf(m))} / ${number(i)}</span>${originTag(t)}<span class="origin-label">${esc(t.origin)}</span></div><h1>${esc(t.title)}</h1><p class="topic-summary">${esc(t.summary)}</p><div class="keyword-tags">${t.keywords.map(k=>`<span>${esc(k)}</span>`).join('')}</div></div>
  <div class="reading-layout"><article class="reading-main"><section class="reading-section" id="ideas"><div class="reading-section-heading"><span class="section-number">01</span><h2>抓住这几个关键点</h2></div><div class="idea-list">${t.points.map(p=>`<div class="idea"><span>${esc(p.label)}</span><p>${esc(p.text)}</p></div>`).join('')}</div></section>${comparison(t)}${flow(t)}
  ${t.confusion?`<section class="reading-section" id="confusion"><div class="reading-section-heading"><span class="section-number">◎</span><h2>一个容易混淆的地方</h2></div><div class="confusion-panel"><div><small>常见理解</small><p>${esc(t.confusion.before)}</p></div><div><small>更准确的理解</small><p>${esc(t.confusion.after)}</p></div></div></section>`:''}
  <section class="reading-section" id="references"><div class="reading-section-heading"><span class="section-number">↗</span><h2>回到知识来源</h2></div><div class="references">${t.sources.map(s=>`<a href="${esc(s.url)}" ${s.url.startsWith('http')?'target="_blank" rel="noopener noreferrer"':''}><span>${esc(s.label)}</span>${iconArrow}</a>`).join('')}</div><p class="reference-note">${esc(t.origin)}。比较、流程及应用示例可能包含跨来源整理；具体产品能力以原文和版本为准。</p></section>
  <nav class="topic-pagination" aria-label="前后主题">${prev?`<a href="#topic/${prev.id}"><small>← 上一个主题</small><strong>${esc(prev.shortTitle)}</strong></a>`:'<span></span>'}${next?`<a href="#topic/${next.id}"><small>下一个主题 →</small><strong>${esc(next.shortTitle)}</strong></a>`:`<a href="#overview"><small>继续探索 →</small><strong>回到知识全景</strong></a>`}</nav></article>
  <aside class="reading-aside"><div class="aside-block"><div class="eyebrow">ON THIS PAGE</div><nav aria-label="本页内容"><button data-scroll="ideas">关键理念</button>${t.compare?'<button data-scroll="compare">概念对比</button>':''}${t.flow?'<button data-scroll="flow">机制流程</button>':''}${t.confusion?'<button data-scroll="confusion">易混淆点</button>':''}<button data-scroll="references">知识来源</button></nav></div><div class="aside-block related-block"><h2>连接其他知识</h2><div class="related-links">${t.related.map(id=>{const r=byId(id);return `<a href="#topic/${id}"><small>${esc(moduleNames[r.moduleId])}</small><span>${esc(r.shortTitle)} ↗</span></a>`;}).join('')}</div></div><div class="jd-block"><span class="eyebrow">TPM APPLICATION</span><h2>把知识用于岗位</h2><div>${t.jd.map(j=>`<p>${esc(j)}</p>`).join('')}</div><a href="#role-context">查看应用边界 ↗</a></div></aside></div>`;
}
function comparisonPage(){
  return `<div class="page-heading"><div><div class="eyebrow">COMPARE & CLARIFY</div><h1>把容易混淆的概念放在一起。</h1><p>38 组对比，沿概念边界、机制和取舍建立判断。点击后直接打开对比表。</p></div><span class="pill">8 个模块 · 38 张表</span></div><div class="comparison-index">${state.data.modules.map((m,i)=>`<section class="compare-group"><div class="compare-group-title"><span>${number(i)}</span><h2>${esc(moduleNames[m.id])}</h2></div><div>${m.topics.filter(t=>t.compare).map(t=>`<a class="compare-item" href="#topic/${t.id}/compare"><h3>${esc(t.shortTitle)}</h3><p>${esc(t.compare.rows.map(r=>r[0]).join(' / '))}</p><span aria-hidden="true">↗</span></a>`).join('')}</div></section>`).join('')}</div>`;
}
function sourcesPage(){
  return `<div class="page-heading"><div><div class="eyebrow">SOURCE LIBRARY</div><h1>每一条知识，都有来处。</h1><p>19 篇主要材料与它们连接的主题。历史案例、产品文档与通用框架分别标明边界。</p></div><span class="pill">公开原文 · 按原清单编号</span></div><div class="source-list">${state.data.sourceIndex.map(s=>`<section class="source-entry"><span class="source-number">${String(s.number).padStart(2,'0')}</span><div><div class="source-domain">${esc(new URL(s.url).hostname.replace('www.',''))}</div><h2><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a></h2><p>${esc(s.note)}</p><div class="source-topics">${s.topicIds.map(id=>`<a href="#topic/${id}">${esc(byId(id).shortTitle)}</a>`).join('')}</div></div></section>`).join('')}</div><div class="source-footnote">部分主题另引官方术语文档，已在该主题的“知识来源”中列出。岗位应用框架见 <a href="#role-context">TPM 应用说明 ↗</a>。</div>`;
}
function rolePage(){
  return `<a class="top-return" href="#overview">← 返回体系全景</a><div class="page-heading"><div><div class="eyebrow">KNOWLEDGE TO PRACTICE</div><h1>从知识体系，到 TPM 应用。</h1><p>以企业治理为主线，结合 Technical Program Manager 职责组织练习。</p></div></div><div class="role-content"><section><h2>三类业务领域</h2><p>数据生命周期治理、隐私产品、业务风险控制。各知识页的岗位标签提示它可以用于哪类讨论。</p></section><section><h2>共同的交付能力</h2><p>把业务需求变成明确范围与优先级；识别依赖、关键路径和风险；协调产品、工程、运营及专业团队；用里程碑、执行指标与结果指标证明价值。</p></section><section><h2>如何使用这套材料</h2><p>先说明问题和适用边界，再解释技术机制、方案取舍、负责人和验收证据。原文提炼、学习延伸与新增框架保留各自标识。</p></section><section><h2>适用边界</h2><p>这是公开资料的学习整理及岗位练习框架。厂商案例和通用设计示意不代表 TikTok 当前内部架构、业务指标、法律承诺或执行制度。</p></section></div>`;
}
function render(){
  let route;try{route=decodeURIComponent(location.hash.slice(1))||'overview';}catch{route='overview';}
  state.active=route;
  const [view,id]=route.split('/');
  let content,crumb='体系全景';
  if(view==='module'&&moduleById(id)){content=modulePage(moduleById(id));crumb=moduleNames[id];}
  else if(view==='topic'&&byId(id)){const t=byId(id);content=topicPage(t);crumb=`${moduleNames[t.moduleId]} / ${t.shortTitle}`;}
  else if(view==='comparisons'){content=comparisonPage();crumb='概念对比';}
  else if(view==='sources'){content=sourcesPage();crumb='来源索引';}
  else if(view==='role-context'){content=rolePage();crumb='TPM 应用说明';}
  else{content=overview();}
  $('#main').innerHTML=content;
  $('#breadcrumb').innerHTML=`知识工作台 <span>/</span> ${esc(crumb)}`;
  document.title=`${crumb} · 数据治理知识图谱`;
  $('.primary-nav').querySelectorAll('a').forEach(a=>{a.classList.toggle('active',a.dataset.view===view);if(a.dataset.view===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  const activeId=[view,id].filter(Boolean).join('/');
  $('#tree').querySelectorAll('a').forEach(a=>{a.classList.toggle('active',a.dataset.id===activeId);if(a.dataset.id===activeId){a.setAttribute('aria-current','page');a.closest('details').open=true;}else a.removeAttribute('aria-current');});
  closeMenu();
  window.scrollTo({top:0,behavior:'instant'});
  const section=route.split('/')[2];
  if(section)requestAnimationFrame(()=>document.getElementById(section)?.scrollIntoView({block:'start'}));
}
function closeMenu(){$('#sidebar').classList.remove('open');$('#sidebar').inert=window.matchMedia('(max-width:700px)').matches;$('.workspace').inert=false;$('#scrim').classList.remove('visible');$('#open-menu').setAttribute('aria-expanded','false');}
function openSearch(){const d=$('#search-dialog');if(!d.open)d.showModal();$('#search-input').value='';search('');$('#search-input').focus();}
function search(query){
  const q=query.trim().toLocaleLowerCase();
  const results=q?state.topics.filter(t=>JSON.stringify(t).toLocaleLowerCase().includes(q)):['gov-boundary','asset-metadata','life-deletion','ai-classification','risk-metrics'].map(byId);
  $('#search-results').innerHTML=results.length?results.map(t=>`<a class="search-result" href="#topic/${t.id}"><small>${esc(moduleNames[t.moduleId])}</small><strong>${esc(t.title)}</strong><p>${esc(t.summary)}</p></a>`).join(''):'<div class="empty">没有找到匹配内容。试试概念的中文或英文名称。</div>';
}
async function init(){
  try{
    const response=await fetch('./knowledge.json');if(!response.ok)throw new Error('内容读取失败');
    state.data=await response.json();state.topics=state.data.modules.flatMap(m=>m.topics.map(t=>({...t,moduleId:m.id})));
    buildTree();render();
    $('#main').addEventListener('click',e=>{const button=e.target.closest('[data-scroll]');if(button)document.getElementById(button.dataset.scroll)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});});
    window.addEventListener('hashchange',()=>{render();$('#main').focus({preventScroll:true});});
    $('#open-search').addEventListener('click',openSearch);
    $('#search-input').addEventListener('input',e=>search(e.target.value));
    $('#search-results').addEventListener('click',e=>{if(e.target.closest('a'))$('#search-dialog').close();});
    $('#search-input').addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();$('.search-result')?.focus();}if(e.key==='Enter'){e.preventDefault();const a=$('.search-result');if(a){$('#search-dialog').close();location.hash=a.hash;}}});
    $('#search-dialog').addEventListener('click',e=>{if(e.target===$('#search-dialog'))$('#search-dialog').close();});
    document.addEventListener('keydown',e=>{
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();closeMenu();openSearch();}
      if(e.key==='Escape'&&$('#sidebar').classList.contains('open')){closeMenu();$('#open-menu').focus();}
      if(e.key==='Tab'&&$('#sidebar').classList.contains('open')){const items=[...$('#sidebar').querySelectorAll('a,button,summary')].filter(x=>x.checkVisibility());const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
    });
    window.matchMedia('(max-width:700px)').addEventListener('change',closeMenu);
    $('#open-menu').addEventListener('click',()=>{$('#sidebar').inert=false;$('#sidebar').classList.add('open');$('.workspace').inert=true;$('#scrim').classList.add('visible');$('#open-menu').setAttribute('aria-expanded','true');$('#close-menu').focus();});
    $('#close-menu').addEventListener('click',()=>{closeMenu();$('#open-menu').focus();});$('#scrim').addEventListener('click',closeMenu);
  }catch(error){$('#main').innerHTML='<div class="empty"><h1>内容暂时未能加载</h1><p>请刷新页面后重试，或检查网络连接。</p></div>';console.error(error);}
}
init();
