'use strict';
window.AtlasDiagrams = (() => {
  const diagrams=new Map();
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let sequence=0,dialog,zoom=1,returnFocus;
  function register(key,block){diagrams.set(key,block);}
  function markup(key,full=false){
    const block=diagrams.get(key);if(!block)return '';
    const d=block.diagram,uid=`architecture-${++sequence}`;
    return `<figure class="architecture-figure ${full?'full-figure':''}" data-diagram-key="${esc(key)}"><div class="architecture-heading"><span>${esc(block.title||'系统关系图')}</span>${full?'':`<button data-diagram-open="${esc(key)}">放大阅读 ↗</button>`}</div><div class="diagram-host ${full?'full-diagram':'preview-diagram'}"><div class="diagram-scaled"><div class="diagram-surface" data-arrow="${uid}"><svg class="diagram-edges" aria-hidden="true"></svg>${d.columns.map((c,i)=>`<div class="diagram-column-title" data-column="${i}">${esc(c.title)}</div>${c.nodes.map(n=>`<div class="diagram-node" data-column="${i}" data-diagram-node="${esc(n.id)}"><strong>${esc(n.title)}</strong>${n.en?`<span lang="en">${esc(n.en)}</span>`:''}<p>${esc(n.text)}</p></div>`).join('')}`).join('')}</div></div></div><figcaption>${esc(d.note||'教学架构示意；具体组件与实现按实际系统调整。')}</figcaption>${full?`<details class="diagram-relations"><summary>逐条阅读连接关系 · ${d.edges.length} 条</summary><ol>${d.edges.map(e=>{const nodes=d.columns.flatMap(c=>c.nodes);return `<li><strong>${esc(nodes.find(n=>n.id===e.from)?.title)}</strong> → <strong>${esc(nodes.find(n=>n.id===e.to)?.title)}</strong><span>${esc(e.label||'传递')}${e.kind==='feedback'?' · 反馈':e.kind==='control'?' · 控制':''}</span></li>`;}).join('')}</ol></details>`:''}</figure>`;
  }
  function layout(figure){
    const block=diagrams.get(figure.dataset.diagramKey);if(!block)return;
    const d=block.diagram,surface=figure.querySelector('.diagram-surface'),host=figure.querySelector('.diagram-host');
    const columnWidth=230,gap=88,padding=25,nodeGap=24,top=60;
    const elements=[...surface.querySelectorAll('.diagram-node')],positions=new Map();
    const heights=d.columns.map((_,col)=>elements.filter(el=>Number(el.dataset.column)===col).reduce((sum,el)=>sum+el.offsetHeight+nodeGap,0)-nodeGap);
    const tallest=Math.max(...heights),width=d.columns.length*(columnWidth+gap)-gap+padding*2;
    for(let col=0;col<d.columns.length;col++){
      const x=padding+col*(columnWidth+gap);let y=top+(tallest-heights[col])/2;
      const title=surface.querySelector(`.diagram-column-title[data-column="${col}"]`);title.style.left=`${x}px`;
      for(const el of elements.filter(el=>Number(el.dataset.column)===col)){
        const h=el.offsetHeight;el.style.left=`${x}px`;el.style.top=`${y}px`;
        positions.set(el.dataset.diagramNode,{x,y,w:columnWidth,h,col});y+=h+nodeGap;
      }
    }
    let routed=0;
    const paths=d.edges.map((e,index)=>{
      const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b)return '';
      let path,lx,ly;
      if(b.col===a.col+1){
        const x=a.x+a.w,y=a.y+a.h/2,tx=b.x,ty=b.y+b.h/2;
        path=`M ${x} ${y} C ${x+gap/2} ${y}, ${tx-gap/2} ${ty}, ${tx} ${ty}`;
        lx=(x+tx)/2;ly=(y+ty)/2-11;
      }else{
        const y=top+tallest+45+(routed++)*37,ax=a.x+a.w/2,bx=b.x+b.w/2;
        path=`M ${ax} ${a.y+a.h} V ${y-10} Q ${ax} ${y} ${ax+(bx>ax?10:-10)} ${y} H ${bx+(bx>ax?-10:10)} Q ${bx} ${y} ${bx} ${y-10} V ${b.y+b.h}`;
        lx=(ax+bx)/2;ly=y-8;
      }
      return `<g class="edge-${esc(e.kind||'flow')}"><path d="${path}" marker-end="url(#${surface.dataset.arrow})"/><text x="${lx}" y="${ly}" text-anchor="middle">${esc(e.label||'')}</text></g>`;
    }).join('');
    const height=top+tallest+35+routed*37;
    surface.style.width=`${width}px`;surface.style.height=`${height}px`;surface.dataset.width=width;surface.dataset.height=height;
    const svg=surface.querySelector('svg');svg.setAttribute('width',width);svg.setAttribute('height',height);
    svg.innerHTML=`<defs><marker id="${surface.dataset.arrow}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#69856a" stroke="none"/></marker></defs>${paths}`;
    applyScale(figure,host.classList.contains('full-diagram')?zoom:Math.min(1,Math.max(.1,host.clientWidth/width)));
  }
  function applyScale(figure,scale){const surface=figure.querySelector('.diagram-surface'),sized=figure.querySelector('.diagram-scaled');surface.style.transform=`scale(${scale})`;sized.style.width=`${Number(surface.dataset.width)*scale}px`;sized.style.height=`${Number(surface.dataset.height)*scale}px`;}
  function layoutAll(root=document){root.querySelectorAll('.architecture-figure').forEach(layout);}
  function fit(){
    const fig=dialog.querySelector('.architecture-figure'),host=dialog.querySelector('.full-diagram'),surface=fig.querySelector('.diagram-surface');
    zoom=Math.min(1,Math.max(.2,(host.clientWidth-12)/Number(surface.dataset.width)));applyScale(fig,zoom);updateZoom();host.scrollLeft=0;
  }
  function updateZoom(){dialog.querySelector('output').textContent=`${Math.round(zoom*100)}%`;}
  function open(key){
    const block=diagrams.get(key);if(!block)return;
    returnFocus=document.activeElement;zoom=1;
    dialog.innerHTML=`<div class="diagram-dialog-header"><div><span>ARCHITECTURE & DATA FLOW</span><h2 id="diagram-dialog-title">${esc(block.title||'系统关系图')}</h2></div><button data-diagram-close aria-label="关闭架构图">×</button></div><div class="diagram-dialog-tools"><p>实线：流程关系 · 虚线：反馈或控制</p><div><button data-diagram-zoom="out" aria-label="缩小架构图">−</button><output>100%</output><button data-diagram-zoom="in" aria-label="放大架构图">＋</button><button data-diagram-zoom="fit">适配</button><button data-diagram-zoom="actual">原大小</button></div></div><div class="diagram-dialog-body">${markup(key,true)}</div>`;
    dialog.showModal();layoutAll(dialog);fit();
  }
  function init(){
    dialog=document.createElement('dialog');dialog.className='diagram-dialog';dialog.setAttribute('aria-labelledby','diagram-dialog-title');document.body.append(dialog);
    document.addEventListener('click',e=>{const trigger=e.target.closest('[data-diagram-open]');if(trigger){e.preventDefault();open(trigger.dataset.diagramOpen);}});
    dialog.addEventListener('click',e=>{
      if(e.target===dialog||e.target.closest('[data-diagram-close]'))return dialog.close();
      const button=e.target.closest('[data-diagram-zoom]');if(!button)return;
      const action=button.dataset.diagramZoom;if(action==='fit')return fit();
      zoom=action==='actual'?1:Math.min(1.8,Math.max(.2,zoom*(action==='in'?1.2:1/1.2)));
      applyScale(dialog.querySelector('.architecture-figure'),zoom);updateZoom();
    });
    dialog.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
    window.addEventListener('resize',()=>{if(dialog.open){layoutAll(dialog);fit();}layoutAll(document.querySelector('#reader'));});
  }
  return {register,markup,layoutAll,init,open,get count(){return diagrams.size;},get isOpen(){return Boolean(dialog?.open);}};
})();
