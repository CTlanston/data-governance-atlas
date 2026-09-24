'use strict';
// Pure review-state operations. Progress stays in the learner's browser.
(function(root){
  const STATUSES=['unknown','unsure','known'];
  const defaults=()=>({version:1,records:{},settings:{module:'all',status:'all',direction:'en-zh',query:'',weakFirst:true},session:null});
  function normalize(raw,terms){
    const state=defaults(),ids=new Set(terms.map(t=>t.id));if(!raw||raw.version!==1)return state;
    for(const [id,r]of Object.entries(raw.records||{}))if(ids.has(id)&&r&&STATUSES.includes(r.status))state.records[id]={status:r.status,attempts:Math.max(1,Number(r.attempts)||1),updatedAt:typeof r.updatedAt==='string'?r.updatedAt:''};
    const x=raw.settings||{};
    state.settings={module:typeof x.module==='string'&&(['all',...terms.flatMap(t=>t.moduleIds)]).includes(x.module)?x.module:'all',status:['all','new','unknown','unsure','known','weak'].includes(x.status)?x.status:'all',direction:['en-zh','zh-en','mixed'].includes(x.direction)?x.direction:'en-zh',query:typeof x.query==='string'?x.query.slice(0,200):'',weakFirst:x.weakFirst!==false};
    const s=raw.session;
    if(s&&Array.isArray(s.ids)&&s.ids.every(id=>ids.has(id))&&new Set(s.ids).size===s.ids.length&&Number.isInteger(s.position)&&s.position>=0&&s.position<=s.ids.length){
      state.session={ids:s.ids,position:s.position,revealed:Boolean(s.revealed),directions:s.ids.map((_,i)=>s.directions?.[i]==='zh-en'?'zh-en':'en-zh'),history:Array.isArray(s.history)?s.history.filter(h=>h&&ids.has(h.id)&&Number.isInteger(h.position)&&STATUSES.includes(h.status)).slice(-300):[]};
    }
    return state;
  }
  function candidates(terms,state){const f=state.settings,q=f.query.trim().toLowerCase();return terms.filter(t=>{
    const status=state.records[t.id]?.status||'new';
    return(f.module==='all'||t.moduleIds.includes(f.module))&&(f.status==='all'||f.status===status||(f.status==='weak'&&['unknown','unsure'].includes(status)))&&(!q||[t.zh,t.en,t.abbr,...(t.aliases||[])].join(' ').toLowerCase().includes(q));
  });}
  function shuffled(items,rng){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
  function start(state,terms,rng=Math.random,onlyId){
    const prior=state.session?.ids[state.session.position];
    let list=shuffled(onlyId?terms.filter(t=>t.id===onlyId):candidates(terms,state),rng);
    const priority=t=>({unknown:0,unsure:1,new:2,known:3})[state.records[t.id]?.status||'new'];
    if(state.settings.weakFirst&&!onlyId)list.sort((a,b)=>priority(a)-priority(b));
    if(list.length>1&&list[0].id===prior&&(!state.settings.weakFirst||priority(list[0])===priority(list[1])))[list[0],list[1]]=[list[1],list[0]];
    state.session={ids:list.map(t=>t.id),position:0,revealed:false,directions:list.map(()=>state.settings.direction==='mixed'?(rng()<.5?'en-zh':'zh-en'):state.settings.direction),history:[]};return state.session;
  }
  function reveal(state){if(!state.session||state.session.position>=state.session.ids.length)return false;state.session.revealed=true;return true;}
  function rate(state,status,now=new Date().toISOString()){
    const s=state.session;if(!s||!s.revealed||s.position>=s.ids.length||!STATUSES.includes(status))return false;
    const id=s.ids[s.position],previous=state.records[id]?{...state.records[id]}:null;
    s.history.push({id,position:s.position,previous,status});state.records[id]={status,attempts:(previous?.attempts||0)+1,updatedAt:now};s.position++;s.revealed=false;return true;
  }
  function undo(state){const s=state.session,h=s?.history.pop();if(!h)return false;if(h.previous&&STATUSES.includes(h.previous.status))state.records[h.id]=h.previous;else delete state.records[h.id];s.position=h.position;s.revealed=true;return true;}
  function counts(state,terms){const out={new:0,unknown:0,unsure:0,known:0};for(const t of terms)out[state.records[t.id]?.status||'new']++;return out;}
  const API={defaults,normalize,candidates,start,reveal,rate,undo,counts,STATUSES};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.AtlasMemoryCore=API;
})(typeof window!=='undefined'?window:globalThis);
