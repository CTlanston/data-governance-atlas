'use strict';
const $ = (s, root = document) => root.querySelector(s);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const explainText = value => AtlasTerms.annotate(value);
const topicEnglish = id => AtlasTerms.data.topicEnglish[id] || '';
const moduleEnglish = id => AtlasTerms.data.moduleEnglish[id] || '';
const pad = n => String(n).padStart(2, '0');
const PARTS = [{id:'plain',label:'白话理解'},{id:'example',label:'教学例子'},{id:'compare',label:'比较辨析'},{id:'check',label:'自测一下'}];
const S = {base:null, lessons:new Map(), nodes:new Map(), topics:new Map(), mode:'overview', module:'governance', topic:'gov-models', part:'plain', selected:'root', expanded:new Set(['root']), visible:[], scale:1, x:0, y:0, bounds:{width:1,height:1}, query:'', ready:false};
const moduleFor = id => S.base.modules.find(m => m.id === id);
const topicFor = id => S.topics.get(id);
const nodeFor = id => S.nodes.get(id);
const isPhone = () => window.matchMedia('(max-width:700px)').matches;
const isDrawer = () => window.matchMedia('(max-width:1000px)').matches;

function node(id, title, depth, props = {}) {
  const n = {id,title,depth,children:[],...props}; S.nodes.set(id,n); return n;
}
function group(parent, id, title, text, options = {}) {
  const meta = {topicId:parent.topicId,moduleId:parent.moduleId,part:parent.part};
  const heading = node(`${parent.id}/${id}`,title,5,{...meta,anchor:id});
  const detail = node(`${heading.id}/detail`,title,6,{...meta,anchor:id,body:text,...options});
  heading.children.push(detail); parent.children.push(heading); return heading;
}
function buildKnowledgeTree() {
  const root = node('root','企业数据管理',1);
  for (const m of S.base.modules) {
    const mn = node(`m:${m.id}`,m.shortTitle || m.title,2,{moduleId:m.id});root.children.push(mn);
    for (const t of m.topics) {
      const l = S.lessons.get(t.id);
      if (!l) throw new Error(`缺少主题讲解：${t.id}`);
      S.topics.set(t.id,{...t,moduleId:m.id});
      const tn = node(`t:${t.id}`,t.shortTitle,3,{moduleId:m.id,topicId:t.id});mn.children.push(tn);
      for (const part of PARTS) {
        const pn = node(`${tn.id}/${part.id}`,part.label,4,{moduleId:m.id,topicId:t.id,part:part.id});tn.children.push(pn);
        if (part.id === 'plain') {
          group(pn,'meaning','这是什么意思？',l.plain);
          group(pn,'why','为什么需要它？',l.why);
          l.mechanism.forEach((p,i) => group(pn,`mechanism-${i}`,p.title,p.text));
        } else if (part.id === 'example') {
          group(pn,'context',l.example.title,l.example.context);
          l.example.steps.forEach((p,i) => group(pn,`step-${i}`,p.title,p.text));
          group(pn,'takeaway','这个例子说明什么？',l.example.takeaway);
        } else if (part.id === 'compare') {
          group(pn,'table','把概念放在一起比较','',{table:l.compare});
          group(pn,'pitfall','最容易误会的地方',`${l.pitfall.mistake}\n${l.pitfall.correction}`);
        } else {
          group(pn,'question',l.check.question,l.check.answer);
        }
      }
    }
  }
}

function renderIndex() {
  const q = S.query.trim().toLocaleLowerCase();
  $('#clear-search').hidden = !q;
  if (q) {
    const results = [...S.topics.values()].filter(t => `${JSON.stringify(t)} ${JSON.stringify(S.lessons.get(t.id))} ${topicEnglish(t.id)} ${JSON.stringify(AtlasTerms.forTopic(t.id))}`.toLocaleLowerCase().includes(q));
    $('#index-title').textContent = `${results.length} 个相关主题`;
    $('#index').innerHTML = results.length ? results.map(t => `<button class="search-result" data-topic="${t.id}"><small>${escapeHTML(moduleFor(t.moduleId).shortTitle)}</small><strong>${escapeHTML(t.shortTitle)}</strong><p>${escapeHTML(S.lessons.get(t.id).plain.slice(0,65))}…</p></button>`).join('') : '<p class="empty-search">没有找到对应主题。试试中文概念、英文缩写或更短的关键词。</p>';
    return;
  }
  $('#index-title').textContent = '8 个模块 · 47 个主题';
  const open = new Set([...$('#index').querySelectorAll('details[open]')].map(d => d.dataset.module));
  if (S.mode !== 'overview') open.add(S.module);
  $('#index').innerHTML = S.base.modules.map((m,i) => `<details data-module="${m.id}" ${open.has(m.id)?'open':''}><summary><span class="index-number">${pad(i+1)}</span><span>${escapeHTML(m.shortTitle)}<span class="index-english" lang="en">${escapeHTML(moduleEnglish(m.id))}</span></span></summary><div class="topic-links">${m.topics.map(t => `<button data-topic="${t.id}" class="${S.mode==='topic'&&t.id===S.topic?'active':''}" ${S.mode==='topic'&&t.id===S.topic?'aria-current="page"':''}>${escapeHTML(t.shortTitle)}<span class="index-english" lang="en">${escapeHTML(topicEnglish(t.id))}</span></button>`).join('')}</div></details>`).join('');
}
function writeHash() {
  const hash = S.mode==='topic'?`${S.topic}/${S.part}`:S.mode==='module'?`module/${S.module}`:'overview';
  history.replaceState(null,'',`#${hash}`);
}
function overview() {
  S.mode='overview';S.selected='root';S.expanded=new Set(['root']);writeHash();renderAll({fit:true});
}
function showCards(id){
  S.mode='cards';$('.workspace').classList.add('memory-active');$('.workspace').classList.remove('mobile-reader');
  AtlasMemory.show(id);renderIndex();closeIndex();setSectionNav(true);
  history.replaceState(null,'','#cards');document.title='专业词汇记忆卡 · Data Atlas';
  $('#announcer').textContent='已打开中英专业词汇记忆卡';
}
function setSectionNav(cards){
  for(const [selector,active]of [['#map-nav',!cards],['#memory-nav',cards]]){const b=$(selector);b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
}
function showModule(id = S.module) {
  S.module=id;S.mode='module';S.selected=`m:${id}`;S.expanded.add(S.selected);writeHash();renderAll({fit:true});
}
function showTopic(id = S.topic, part = 'plain') {
  const t=topicFor(id);if(!t)return;
  S.mode='topic';S.topic=id;S.module=t.moduleId;S.part=PARTS.some(p=>p.id===part)?part:'plain';
  const tn=`t:${id}`,pn=`${tn}/${S.part}`;
  S.selected=pn;S.expanded=new Set([tn,pn]);
  const first=nodeFor(pn).children[0];if(first)S.expanded.add(first.id);
  writeHash();renderAll({focus:pn});closeIndex();if(isPhone())setReader(true);
}
function selectPart(part) {
  S.part=part;const id=`t:${S.topic}/${part}`;S.selected=id;S.expanded.add(id);
  const first=nodeFor(id).children[0];if(first)S.expanded.add(first.id);
  writeHash();renderAll({anchor:id});if(isPhone())setReader(true);
}
function selectNode(id, toggleOnly = false) {
  const n=nodeFor(id);if(!n)return;
  if(toggleOnly){
    if(n.depth===2&&S.mode==='overview')return showModule(n.moduleId);
    if(n.depth===3&&S.mode==='module')return showTopic(n.topicId);
    S.expanded.has(id)?S.expanded.delete(id):S.expanded.add(id);renderGraph({anchor:id});return;
  }
  if(n.depth===1)return overview();
  if(n.depth===2)return showModule(n.moduleId);
  if(n.depth===3)return showTopic(n.topicId);
  S.selected=id;S.part=n.part;
  if(n.children.length)S.expanded.add(id);
  if(n.depth===4&&!S.expanded.has(n.children[0]?.id))S.expanded.add(n.children[0]?.id);
  writeHash();renderReader(n.anchor);renderGraph({anchor:id});if(isPhone())setReader(true);
}
function tableHTML(table, className) {
  return `<table class="${className}"><thead><tr>${table.headers.map(h=>`<th scope="col">${explainText(h)}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row=>`<tr>${row.map((v,i)=>i===0?`<th scope="row">${explainText(v)}</th>`:`<td>${explainText(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function nodeMarkup(n) {
  const level=`L${n.depth} · ${n.depth<=3?'关键词':n.depth===4?'学习角度':n.depth===5?'具体问题':'展开讲解'}`;
  const width=n.depth===6?(n.table?465:365):n.depth===5?235:n.depth===4?190:210;
  const selected=n.id===S.selected;
  const en=n.depth===1?'Enterprise Data Management':n.depth===2?moduleEnglish(n.moduleId):n.depth===3?topicEnglish(n.topicId):'';
  const content=n.depth===6?(n.table?`<div class="table-node"><button class="mind-content" data-select="${n.id}"><span class="node-level">${level}</span><span class="node-title">${escapeHTML(n.title)}</span></button>${tableHTML(n.table,'mini-table')}</div>`:`<button class="mind-content" data-select="${n.id}"><span class="node-level">${level}</span><span class="node-body">${explainText(n.body).replace(/\n/g,'<br><br>')}</span></button>`):`<button class="mind-content" data-select="${n.id}"><span class="node-level">${level}</span><span class="node-title">${n.depth<=3?escapeHTML(n.title):explainText(n.title)}</span>${en?`<span class="node-english" lang="en">${escapeHTML(en)}</span>`:''}</button>`;
  return `<div class="mind-node ${selected?'selected':''}" data-node="${n.id}" data-depth="${n.depth}" style="width:${width}px">${content}${n.children.length?`<button class="node-toggle" data-toggle="${n.id}" aria-label="${S.expanded.has(n.id)?'收起':'展开'}${escapeHTML(n.title)}" aria-expanded="${S.expanded.has(n.id)}">${S.expanded.has(n.id)?'−':'+'}</button>`:''}</div>`;
}
function graphRoot(){return nodeFor(S.mode==='overview'?'root':S.mode==='module'?`m:${S.module}`:`t:${S.topic}`);}
function graphChildren(n){return S.expanded.has(n.id)?n.children:[];}
function renderGraph(options={}) {
  const old=options.anchor?S.visible.find(n=>n.id===options.anchor):null;
  const oldPoint=old?{x:old.x*S.scale+S.x,y:(old.y+old.h/2)*S.scale+S.y}:null;
  const root=graphRoot(),visible=[];
  function collect(n){visible.push(n);graphChildren(n).forEach(collect);}collect(root);
  $('#nodes').innerHTML=visible.map(nodeMarkup).join('');
  const elements=new Map([...$('#nodes').children].map(el=>[el.dataset.node,el]));
  for(const n of visible){n.w=elements.get(n.id).offsetWidth;n.h=elements.get(n.id).offsetHeight;}
  const columns=[];for(const n of visible){const d=n.depth-root.depth;columns[d]=Math.max(columns[d]||0,n.w);}
  const offsets=[20];for(let i=0;i<columns.length-1;i++)offsets.push(offsets[i]+columns[i]+58);
  function measure(n){const cs=graphChildren(n);n.subtree=Math.max(n.h,cs.reduce((s,c)=>s+measure(c),0)+Math.max(0,cs.length-1)*19);return n.subtree;}measure(root);
  function place(n,top){n.x=offsets[n.depth-root.depth];n.y=top+(n.subtree-n.h)/2;let childTop=top;for(const c of graphChildren(n)){place(c,childTop);childTop+=c.subtree+19;}}place(root,20);
  const edges=[];
  for(const n of visible){const el=elements.get(n.id);el.style.left=`${n.x}px`;el.style.top=`${n.y}px`;for(const c of graphChildren(n)){const x=n.x+n.w,y=n.y+n.h/2,cx=c.x,cy=c.y+c.h/2;edges.push(`<path d="M ${x} ${y} C ${x+30} ${y}, ${cx-30} ${cy}, ${cx} ${cy}"/>`);}}
  S.visible=visible;S.bounds={width:Math.max(...visible.map(n=>n.x+n.w))+25,height:root.subtree+40};
  $('#connections').setAttribute('width',S.bounds.width);$('#connections').setAttribute('height',S.bounds.height);$('#connections').innerHTML=edges.join('');
  $('#world').style.width=`${S.bounds.width}px`;$('#world').style.height=`${S.bounds.height}px`;
  if(options.fit)fitGraph();
  else if(options.focus){S.scale=.86;focusNode(options.focus);}
  else if(oldPoint){const current=visible.find(n=>n.id===options.anchor);if(current){S.x=oldPoint.x-current.x*S.scale;S.y=oldPoint.y-(current.y+current.h/2)*S.scale;}applyCamera();}
  else applyCamera();
  $('#map-caption').textContent=S.mode==='overview'?'点击模块，进入第三层关键词。':S.mode==='module'?'点击一个概念，进入白话解释、例子和对比。':'点击分支和 ＋ 继续展开，第六层可直接看完整解释或表格。';
}
function applyCamera(){$('#world').style.transform=`translate(${S.x}px,${S.y}px) scale(${S.scale})`;$('#zoom-value').textContent=`${Math.round(S.scale*100)}%`;}
function fitGraph(){const v=$('#viewport');S.scale=Math.min(1,Math.max(.2,Math.min((v.clientWidth-60)/S.bounds.width,(v.clientHeight-100)/S.bounds.height)));S.x=(v.clientWidth-S.bounds.width*S.scale)/2;S.y=65+(v.clientHeight-80-S.bounds.height*S.scale)/2;applyCamera();}
function focusNode(id=S.selected){const n=S.visible.find(n=>n.id===id)||S.visible[0],v=$('#viewport');S.scale=Math.max(S.scale,.8);S.x=Math.max(25,(v.clientWidth-n.w*S.scale)/2)-n.x*S.scale;S.y=Math.max(72,(v.clientHeight-n.h*S.scale)/2)-n.y*S.scale;applyCamera();}
function zoom(factor,px,py){const v=$('#viewport');px??=v.clientWidth/2;py??=v.clientHeight/2;const next=Math.min(1.6,Math.max(.2,S.scale*factor));const wx=(px-S.x)/S.scale,wy=(py-S.y)/S.scale;S.x=px-wx*next;S.y=py-wy*next;S.scale=next;applyCamera();}
function readerBar(){return '<div class="reader-bar"><span>LEARN THE IDEA</span><button data-reader-close>返回导图 ↗</button></div>';}
function introReader(){return `${readerBar()}<div class="reader-main"><div class="reader-eyebrow">从结构到理解</div><h1>先看到全局，<br>再弄懂每一个概念。</h1><p class="reader-intro">导图的前面是简洁关键词。沿着分支展开，就会遇到<strong>白话解释、完整例子和对比表</strong>。不需要一开始就记住所有术语。</p><div class="level-guide"><div><span class="level-badge">1–2</span><section><h2>体系 → 八个模块</h2><p>先知道一块知识放在什么位置，以及它与其他模块的关系。</p></section></div><div><span class="level-badge">3</span><section><h2>关键词 → 具体概念</h2><p>例如治理模式、数据血缘、留存策略、风险处置。选择一个你现在想弄懂的主题。</p></section></div><div><span class="level-badge">4–5</span><section><h2>学习角度 → 具体问题</h2><p>它是什么意思？为什么需要它？放到真实工作场景里，会发生什么？</p></section></div><div><span class="level-badge">6</span><section><h2>展开解释 → 例子与对比</h2><p>用完整句子讲清机制和边界，比较容易混淆的概念，再用一个情境问题检查理解。</p></section></div></div><button class="start-learning" data-topic="gov-models">先弄懂「分布式治理」<span>↗</span></button><p class="level-note">鼠标拖动平移、滚轮缩放；点击节点阅读讲解。手机也可通过左侧目录直接进入主题。</p></div>`;}
function moduleReader(){const m=moduleFor(S.module);return `${readerBar()}<div class="reader-main"><div class="reader-eyebrow">第二层 / 框架</div><h1>${escapeHTML(m.title)}</h1><p class="reader-english" lang="en">${escapeHTML(moduleEnglish(m.id))}</p><p class="reader-intro">${explainText(m.question)}</p><div class="reader-module-topics">${m.topics.map(t=>`<button data-topic="${t.id}"><h2>${escapeHTML(t.shortTitle)} ↗</h2><span class="index-english" lang="en">${escapeHTML(topicEnglish(t.id))}</span><p>${explainText(S.lessons.get(t.id).why)}</p></button>`).join('')}</div></div>`;}
function sourceBlock(t){return `<details class="reader-source"><summary>知识来源与适用边界</summary>${t.sources.map(s=>`<a href="${escapeHTML(s.url.startsWith('#')?'./index.html'+s.url:s.url)}" ${s.url.startsWith('http')?'target="_blank" rel="noopener noreferrer"':''}>${escapeHTML(s.label)} ↗</a>`).join('')}<p>${escapeHTML(t.origin)}。白话解释根据来源整理；教学例子是帮助理解的假设场景，不代表厂商内部的实际做法。</p>${t.id==='gov-models'?'<p>此处比较通用组织模式。DataLeap 历史案例强调业务自治，并非采用统一中央治理委员会的例子；联合治理是补充的框架视角。</p>':''}</details>`;}
function existingFlow(t){if(!t.flow)return '';const f=t.flow;const renderSteps=steps=>`<ol>${steps.map(s=>`<li>${explainText(typeof s==='string'?s:`${s.title}：${s.text}`)}</li>`).join('')}</ol>`;return `<details class="original-flow"><summary>再看一遍流程：${explainText(f.title||t.shortTitle)}</summary>${f.lanes?f.lanes.map(l=>`<h3>${explainText(l.title)}</h3>${renderSteps(l.steps)}`).join(''):renderSteps(f.steps)}<p>${explainText(f.note||'')}</p></details>`;}
function partContent(t,l){
  if(S.part==='plain')return `<section class="learn-section detail-anchor" id="read-meaning"><span class="section-kicker">先用一句人话说明白</span><div class="explainer"><p>${explainText(l.plain)}</p></div></section><section class="learn-section why-box detail-anchor" id="read-why"><h2>它解决的是什么问题？</h2><p>${explainText(l.why)}</p></section>${l.mechanism.map((p,i)=>`<section class="learn-section mechanism detail-anchor" id="read-mechanism-${i}"><h2><small>${pad(i+1)}</small>${explainText(p.title)}</h2><p>${explainText(p.text)}</p></section>`).join('')}${existingFlow(t)}<button class="start-learning" data-part="example">用一个例子理解它<span>→</span></button>`;
  if(S.part==='example')return `<span class="example-label">教学示例 · 假设场景</span><section class="example-context detail-anchor" id="read-context"><h2>${explainText(l.example.title)}</h2><p>${explainText(l.example.context)}</p></section><ol class="story-steps">${l.example.steps.map((p,i)=>`<li class="detail-anchor" id="read-step-${i}"><h2><small>${pad(i+1)}</small>${explainText(p.title)}</h2><p>${explainText(p.text)}</p></li>`).join('')}</ol><section class="takeaway detail-anchor" id="read-takeaway"><strong>从这个例子里带走什么</strong><p>${explainText(l.example.takeaway)}</p></section><button class="start-learning" data-part="compare">再比较容易混淆的概念<span>→</span></button>`;
  if(S.part==='compare')return `<section class="learn-section detail-anchor" id="read-table"><h2>放在一起，看看差别在哪里</h2><div class="comparison-scroll" tabindex="0" role="region" aria-label="${escapeHTML(t.shortTitle)}对比表">${tableHTML(l.compare,'comparison-table')}</div></section><section class="pitfall detail-anchor" id="read-pitfall"><h2>常见的误解</h2><p>${explainText(l.pitfall.mistake)}</p><p class="correct"><strong>更准确的理解</strong>${explainText(l.pitfall.correction)}</p></section><button class="start-learning" data-part="check">换一个场景，检查理解<span>→</span></button>`;
  return `<section class="question-box detail-anchor" id="read-question"><h2>先试着用自己的话判断</h2><p>${explainText(l.check.question)}</p></section><details class="answer"><summary>展开参考思路</summary><p>${explainText(l.check.answer)}</p></details><p class="level-note">重点是能说明理由和边界，不需要背诵固定答案。</p>`;
}
function renderReader(anchor){
  if(S.mode==='overview'){$('#reader').innerHTML=introReader();return;}
  if(S.mode==='module'){$('#reader').innerHTML=moduleReader();return;}
  const t=topicFor(S.topic),l=S.lessons.get(t.id),m=moduleFor(t.moduleId),i=m.topics.findIndex(x=>x.id===t.id),next=m.topics[i+1];
  $('#reader').innerHTML=`${readerBar()}<div class="reader-main"><div class="reader-eyebrow">${escapeHTML(m.shortTitle)}<span> / </span>${t.status==='new'?'<span class="new-label">新增框架</span>':'<span>学习讲解</span>'}</div><h1>${escapeHTML(t.shortTitle)}</h1><p class="reader-english" lang="en">${escapeHTML(topicEnglish(t.id))}</p><div class="read-tags">${t.keywords.slice(0,4).map(k=>`<span>${explainText(k)}</span>`).join('')}</div><div class="learning-tabs" role="tablist" aria-label="学习角度">${PARTS.map(p=>`<button id="tab-${p.id}" role="tab" data-part="${p.id}" aria-selected="${S.part===p.id}" aria-controls="lesson-content" tabindex="${S.part===p.id?'0':'-1'}">${p.label}</button>`).join('')}</div><div id="lesson-content" role="tabpanel" aria-labelledby="tab-${S.part}">${partContent(t,l)}</div>${AtlasTerms.topicPanel(t.id)}${sourceBlock(t)}<div class="related">${t.related.slice(0,3).map(id=>`<button data-topic="${id}">${escapeHTML(topicFor(id).shortTitle)} ↗</button>`).join('')}</div><nav class="reader-next" aria-label="继续学习"><button data-original="${t.id}">原速查页 ↗</button>${next?`<button data-topic="${next.id}">下一主题 →<br>${escapeHTML(next.shortTitle)}</button>`:`<button data-module="${m.id}">返回模块目录 →</button>`}</nav></div>`;
  $('#reader').scrollTop=0;
  if(anchor)requestAnimationFrame(()=>{const el=document.getElementById(`read-${anchor}`);if(el){el.scrollIntoView({block:'start',behavior:'instant'});el.classList.add('flash');}});
}
function renderAll(options={}) {
  $('.workspace').classList.remove('memory-active');AtlasMemory.hide();setSectionNav(false);
  renderIndex();renderReader();renderGraph(options);
  $('#trail').innerHTML=`<button data-overview>企业数据管理</button>${S.mode!=='overview'?`<span>›</span><button data-module="${S.module}">${escapeHTML(moduleFor(S.module).shortTitle)}</button>`:''}${S.mode==='topic'?`<span>›</span><button data-topic="${S.topic}">${escapeHTML(topicFor(S.topic).shortTitle)}</button>`:''}`;
  $('#show-overview').classList.toggle('active',S.mode==='overview');$('#show-module').classList.toggle('active',S.mode==='module');$('#show-topic').classList.toggle('active',S.mode==='topic');
  document.title=`${S.mode==='topic'?topicFor(S.topic).shortTitle:S.mode==='module'?moduleFor(S.module).shortTitle:'六层学习思维导图'} · Data Atlas`;
  $('#announcer').textContent=S.mode==='topic'?`已展开${topicFor(S.topic).shortTitle}，${PARTS.find(p=>p.id===S.part).label}`:S.mode==='module'?`已展开${moduleFor(S.module).shortTitle}`:'已显示八个知识模块';
}
function setReader(open){$('.workspace').classList.toggle('reader-hidden',!open);$('.workspace').classList.toggle('mobile-reader',open&&isPhone());$('.map-panel').inert=open&&isPhone();$('#reader-toggle').setAttribute('aria-expanded',String(open));$('#reader-toggle').textContent=open&&!isPhone()?'收起讲解 →':'打开讲解';if(open&&isPhone()){$('#reader').tabIndex=-1;$('#reader').focus({preventScroll:true});}if(S.ready&&!isPhone())requestAnimationFrame(()=>open?focusNode():fitGraph());}
function closeIndex(){const panel=$('#index-panel');panel.classList.remove('open');panel.inert=isDrawer();$('#reader').inert=false;$('#memory-section').inert=false;$('.map-panel').inert=isPhone()&&$('.workspace').classList.contains('mobile-reader');$('#drawer-backdrop').hidden=true;$('#mobile-index-open').setAttribute('aria-expanded','false');}
function openIndex(){$('#index-panel').inert=false;$('#index-panel').classList.add('open');$('#reader').inert=true;$('#memory-section').inert=true;$('.map-panel').inert=true;$('#drawer-backdrop').hidden=false;$('#mobile-index-open').setAttribute('aria-expanded','true');$('#search').focus();}
function loadRoute(){let value;try{value=decodeURIComponent(location.hash.slice(1));}catch{value='overview';}const [id,part]=value.split('/');if(id==='cards')showCards(part);else if(id==='module'&&moduleFor(part))showModule(part);else if(topicFor(id))showTopic(id,part);else overview();}
function bindUI(){
  document.addEventListener('click',e=>{
    const target=e.target.closest('[data-topic],button[data-module],[data-part],[data-overview],[data-reader-close],[data-original],[data-term-card]');if(!target)return;
    if(target.dataset.termCard)showCards(target.dataset.termCard);
    else if(target.dataset.topic)showTopic(target.dataset.topic);
    else if(target.dataset.module)showModule(target.dataset.module);
    else if(target.dataset.part)selectPart(target.dataset.part);
    else if(target.hasAttribute('data-overview'))overview();
    else if(target.hasAttribute('data-reader-close')){setReader(false);$('#reader-toggle').focus();}
    else if(target.dataset.original)window.open(`./index.html#topic/${target.dataset.original}`,'_blank','noopener');
  });
  $('#nodes').addEventListener('click',e=>{if(dragged)return;const target=e.target.closest('[data-select],[data-toggle]');if(target)selectNode(target.dataset.select||target.dataset.toggle,Boolean(target.dataset.toggle));});
  $('#search').addEventListener('input',e=>{S.query=e.target.value;renderIndex();});
  $('#clear-search').addEventListener('click',()=>{S.query='';$('#search').value='';renderIndex();$('#search').focus();});
  $('#show-overview').addEventListener('click',overview);$('#show-module').addEventListener('click',()=>showModule());$('#show-topic').addEventListener('click',()=>showTopic());
  $('#map-nav').addEventListener('click',overview);$('#memory-nav').addEventListener('click',()=>showCards());
  $('#reader-toggle').addEventListener('click',()=>setReader($('.workspace').classList.contains('reader-hidden')||isPhone()&&!$('.workspace').classList.contains('mobile-reader')));
  $('#mobile-index-open').addEventListener('click',openIndex);$('#mobile-index-close').addEventListener('click',closeIndex);$('#drawer-backdrop').addEventListener('click',closeIndex);
  $('#zoom-in').addEventListener('click',()=>zoom(1.2));$('#zoom-out').addEventListener('click',()=>zoom(1/1.2));$('#fit').addEventListener('click',fitGraph);$('#focus-node').addEventListener('click',()=>focusNode());
  window.addEventListener('hashchange',loadRoute);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#index-panel').classList.contains('open')){closeIndex();$('#mobile-index-open').focus();}else if(isPhone()&&$('.workspace').classList.contains('mobile-reader')){setReader(false);$('#reader-toggle').focus();}}if(e.target.matches('[role="tab"]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();let i=PARTS.findIndex(p=>p.id===S.part);i=e.key==='Home'?0:e.key==='End'?3:(i+(e.key==='ArrowRight'?1:3))%4;selectPart(PARTS[i].id);$(`#tab-${PARTS[i].id}`).focus();}});
  window.matchMedia('(max-width:1000px)').addEventListener('change',closeIndex);
  window.matchMedia('(max-width:700px)').addEventListener('change',()=>{if(S.mode==='cards')return;setReader(!$('.workspace').classList.contains('reader-hidden'));S.mode==='topic'?focusNode():fitGraph();});
  bindCanvas();closeIndex();setReader(!isPhone());
}
let dragged=false;
function bindCanvas(){
  const v=$('#viewport'),pointers=new Map();let start=null,pinch=null;
  v.addEventListener('wheel',e=>{e.preventDefault();const r=v.getBoundingClientRect();zoom(Math.exp(-e.deltaY*.002),e.clientX-r.left,e.clientY-r.top);},{passive:false});
  v.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y)};return;}dragged=false;start={x:e.clientX,y:e.clientY,cx:S.x,cy:S.y};if(!e.target.closest('button,.table-node'))v.setPointerCapture(e.pointerId);});
  v.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&pinch){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y),r=v.getBoundingClientRect();zoom(distance/pinch.distance,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);pinch.distance=distance;dragged=true;return;}if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>4){dragged=true;v.classList.add('dragging');S.x=start.cx+dx;S.y=start.cy+dy;applyCamera();}});
  const end=e=>{pointers.delete(e.pointerId);start=null;pinch=null;v.classList.remove('dragging');setTimeout(()=>{dragged=false;},0);};window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
  v.addEventListener('keydown',e=>{if(e.target!==v)return;const move={ArrowLeft:[50,0],ArrowRight:[-50,0],ArrowUp:[0,50],ArrowDown:[0,-50]}[e.key];if(move){e.preventDefault();S.x+=move[0];S.y+=move[1];applyCamera();}else if(['+','=','-'].includes(e.key)){e.preventDefault();zoom(e.key==='-'?1/1.2:1.2);}});
}
async function init(){
  try{
    const files=['knowledge.json','learning-governance.json','learning-privacy.json','learning-delivery.json'];
    const data=await Promise.all(files.map(async file=>{const r=await fetch(`./${file}?v=terms-1`);if(!r.ok)throw new Error(`无法读取 ${file}`);return r.json();}));
    S.base=data[0];data.slice(1).flatMap(d=>d.topics).forEach(t=>S.lessons.set(t.id,t));
    await AtlasTerms.load(S.base);buildKnowledgeTree();
    AtlasMemory.init({terms:AtlasTerms.data.terms,base:S.base,onTopic:id=>showTopic(id)});
    bindUI();S.ready=true;$('#loading').hidden=true;loadRoute();
  }catch(error){$('#loading').textContent='学习内容暂时未能加载，请刷新页面后重试。';$('#reader').innerHTML='<div class="reader-placeholder">也可以先打开右上角的速查知识库。</div>';console.error(error);}
}
init();
