'use strict';
window.AtlasTerms = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let data={terms:[],moduleEnglish:{},topicEnglish:{}},matchers=[],byId=new Map();
  // Search aliases include related ideas; only exact equivalents belong in prose.
  const annotationAliases={
    'data-inventory':['资产清单','数据清单'],'data-catalog':['数据资产目录'],
    'centralized-governance':['集中治理'],'distributed-governance':['分布式数据治理'],
    'federated-governance':['联邦式治理','联邦治理'],'column-level-lineage':['字段血缘','字段级血缘','列级数据血缘'],
    'table-level-lineage':['表级数据血缘'],'record-level-lineage':['行级血缘'],
    'physical-plan':['物理计划'],'logical-plan':['逻辑查询计划'],
    'data-warehouse':['数仓'],'data-lakehouse':['数据湖仓'],'storage-tiering':['冷热分层','冷热数据分层'],
    'data-compaction':['小文件合并'],'cryptographic-erasure':['加密擦除'],
    'privacy-by-design':['隐私内建'],'preventive-control':['预防控制'],'detective-control':['检测控制'],'corrective-control':['纠正控制'],
    'dynamic-data-masking':['动态脱敏'],'static-data-masking':['静态脱敏'],
    'purpose-limitation':['目的限制'],'asset-classification':['资产分类'],
    'confidence-calibration':['概率校准'],'shadow-mode':['影子测试'],
    'model-checkpoint':['模型快照'],'cross-stack-lineage':['跨栈血缘'],
    'entity-masking':['实体占位替换'],'cohens-kappa':['卡帕系数'],
    'service-level-indicator':['服务水平指标'],'service-level-objective':['服务水平目标'],'service-level-agreement':['服务水平协议'],
    'query-execution-plan':['查询计划'],'risk-score':['风险得分'],
    'multi-factor-authentication':['多因子认证'],'online-sample-library':['在线黑库','文本黑库'],
    'historical-rescan':['离线回扫','存量回扫'],'idempotency':['幂等'],
    'bipartite-graph':['二分图'],'precision':['精确率','精准率'],'recall':['查全率'],
    'true-positive':['真正阳性'],'true-negative':['真正阴性'],'false-positive':['假阳性'],'false-negative':['假阴性'],
    'false-positive-rate':['假阳性率'],'return-on-investment':['投入回报率']
  };
  async function load(base){
    const files=['glossary-governance.json','glossary-privacy.json','glossary-delivery.json'];
    const parts=await Promise.all(files.map(async f=>{const r=await fetch(`./${f}?v=concept-2`);if(!r.ok)throw new Error(`术语读取失败：${f}`);return r.json();}));
    const topicModules=new Map(base.modules.flatMap(m=>m.topics.map(t=>[t.id,m.id])));
    for(const part of parts){
      Object.assign(data.moduleEnglish,part.moduleEnglish);Object.assign(data.topicEnglish,part.topicEnglish);
      for(const term of part.terms){
        if(byId.has(term.id)){
          const prior=byId.get(term.id);
          if(prior.en.toLowerCase()!==term.en.toLowerCase())throw new Error(`术语冲突：${term.id}`);
          for(const key of ['topicIds','sourceIds','aliases'])prior[key]=[...new Set([...(prior[key]||[]),...(term[key]||[])])];
          prior.extraSources=[...(prior.extraSources||[]),...(term.extraSources||[])].filter((s,i,a)=>a.findIndex(x=>x.url===s.url)===i);
        }else byId.set(term.id,{...term});
      }
    }
    data.terms=[...byId.values()];
    for(const term of data.terms){
      term.moduleIds=[...new Set(term.topicIds.map(id=>topicModules.get(id)).filter(Boolean))];
      if(!term.moduleIds.length)throw new Error(`术语没有对应主题：${term.id}`);
      for(const alias of [term.zh,...(annotationAliases[term.id]||[])])if(/[\u3400-\u9fff]/.test(alias)&&alias.length>1)matchers.push({alias,term});
    }
    matchers.sort((a,b)=>b.alias.length-a.alias.length);
    const unique=new Map();for(const m of matchers)if(!unique.has(m.alias))unique.set(m.alias,m.term);
    matchers=[...unique].map(([alias,term])=>({alias,term}));
    return data;
  }
  function annotate(text){
    text=String(text??'');if(!matchers.length)return esc(text);
    const seen=new Set();let result='',i=0;
    while(i<text.length){
      const found=matchers.find(({alias})=>text.startsWith(alias,i));
      if(!found){let j=i+1;while(j<text.length&&!matchers.some(({alias})=>text.startsWith(alias,j)))j++;result+=esc(text.slice(i,j));i=j;continue;}
      const {alias,term}=found;const tail=text.slice(i+alias.length).replace(/^[\s（(]+/,'').toLowerCase();
      const head=text.slice(0,i).replace(/[\s（(:：]+$/,'').toLowerCase();
      const names=[...term.en.split(/\s*\/\s*/),term.abbr].filter(Boolean).map(en=>en.toLowerCase());
      const already=names.some(en=>tail.startsWith(en)||head.endsWith(en));
      result+=esc(alias);
      if(!seen.has(term.id)&&!already)result+=`<span class="inline-english">（${esc(term.en)}${term.abbr&&!term.en.includes(term.abbr)?` · ${esc(term.abbr)}`:''}）</span>`;
      seen.add(term.id);i+=alias.length;
    }
    return result;
  }
  function forTopic(id){return data.terms.filter(t=>t.topicIds.includes(id));}
  function topicPanel(id){const terms=forTopic(id);return `<details class="topic-terminology"><summary>本主题专业词汇 <span>${terms.length} TERMS</span></summary><div>${terms.map(t=>`<button data-term-card="${esc(t.id)}"><strong>${esc(t.zh)}</strong><span>${esc(t.en)}${t.abbr?` · ${esc(t.abbr)}`:''}</span><small>用记忆卡测试 ↗</small></button>`).join('')}</div></details>`;}
  return {load,annotate,forTopic,topicPanel,get:id=>byId.get(id),get data(){return data;}};
})();
