import {fetchJSON,fetchGzip,decodeVolume,planeSpec,sliceRGBA,voxelToPlane,clamp} from './case-library-core.js';
import {decodeAtlas,atlasSlice,overlayRGBA} from './segment-atlas-core.js';
import {sourceDisplayRect,sourceBounds} from './field-media.js';
const cache=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function factsMarkup(rows){return `<div class="al-facts"><span class="al-mini">教学情境 · 已知资料</span><div class="al-record-icon" aria-hidden="true">＋</div><dl>${rows.map(([label,value],i)=>`<div><dt><span>0${i+1}</span>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><p>根据已有信息作出判断</p></div>`;}
function caseBrief(rows){return rows?.length?`<section class="al-case-brief" aria-label="本题病例资料"><header><strong>病例资料</strong><span>本题已知条件</span></header><dl>${rows.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></section>`:'';}
function imageCredit(v){if(!v.credit)return '';const license=v.license==='public-domain'?'公共领域':v.license?.includes('/by-sa/')?'CC BY-SA 3.0':'CC BY 4.0';return `<div class="al-image-credit"><span>图源</span><a href="${esc(v.source)}" target="_blank" rel="noopener noreferrer">${esc(v.credit)}</a>${v.license==='public-domain'?`<span>${license}</span>`:`<a href="${esc(v.license)}" target="_blank" rel="noopener noreferrer">${license}</a>`}</div>`;}
export class AssessmentMedia{
 constructor(){this.destroyed=false;this.abort=new AbortController();this.scale=1;this.pan=[0,0];this.overlay=true;this.ready=false;}
 async mount(root,q,{review=false,pick=null,onPick=()=>{},onReady=()=>{},onInteract=()=>{}}={}){
  this.root=root;this.q=q;this.visual=q.visual;this.review=review;this.pick=Array.isArray(pick)?pick:null;this.onPick=onPick;this.onReady=onReady;this.onInteract=onInteract;this.pointers=new Map();
  if(!root||this.destroyed)return;
  if(q.visual.kind==='facts'){root.innerHTML=factsMarkup(q.visual.rows);this.ready=true;onReady(true);return;}
  root.dataset.imageKind=q.visual.kind;
  root.innerHTML=`<div class="al-media-toolbar"><strong>${q.visual.kind==='ct'?esc(q.visual.caseId)+' · 真实 CT':esc(q.visual.title||'真实术野')}</strong><div><button data-media="minus" aria-label="缩小影像">−</button><output data-zoom>100%</output><button data-media="plus" aria-label="放大影像">＋</button><button data-media="reset">居中</button><button data-media="expand" aria-label="展开影像" aria-pressed="false">⤢</button></div></div>
   ${q.visual.kind==='ct'?`<div class="al-plane-tabs" aria-label="CT 平面">${[['axial','轴位'],['coronal','冠状位'],['sagittal','矢状位']].map(([v,t])=>`<button data-plane="${v}" aria-pressed="false">${t}</button>`).join('')}<label>窗位<select data-window aria-label="CT 窗设置"><option value="lung">肺窗</option><option value="mediastinum">纵隔窗</option></select></label></div>`:''}
   <div class="al-media-stage"><canvas tabindex="0" aria-label="${q.visual.kind==='ct'?'真实 CT，可滑层、缩放和移动':q.visual.kind==='clinical'?esc(q.visual.title)+'，可缩放、移动和展开': '真实术野图像，可缩放移动，定位题可点击或使用方向键与回车'}"></canvas><span class="al-media-loading" role="status">正在加载影像…</span></div>
   ${q.visual.kind==='ct'?'<div class="al-slice-control"><button data-media="previous" aria-label="上一层">‹</button><input data-slice type="range" min="0" max="1" value="0" aria-label="CT 连续层面"><button data-media="next" aria-label="下一层">›</button><output data-layer></output><button data-media="target">题目层面</button></div>':''}
   <div class="al-media-footer"><div><span>${q.visual.kind==='ct'?'拖动平移 · 滚轮滑层 · 双击居中':'拖动平移 · 滚轮缩放 · 双击居中'}</span>${q.visual.caption?`<p class="al-image-caption">${esc(q.visual.caption)}</p>`:''}</div>${review&&q.visual.kind==='ct'&&q.visual.answerCode?'<label><input data-overlay type="checkbox" checked>显示定位段</label>':''}</div>${imageCredit(q.visual)}${caseBrief(q.caseFacts)}`;
  this.canvas=root.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.stage=root.querySelector('.al-media-stage');this.resize=new ResizeObserver(()=>this.draw());this.resize.observe(this.stage);
  const events={signal:this.abort.signal};
  root.querySelectorAll('[data-media]').forEach(button=>button.addEventListener('click',()=>{
   const action=button.dataset.media;
   if(action==='minus'||action==='plus')this.scale=clamp(this.scale*(action==='plus'?1.25:.8),.05,4);
   if(action==='reset'){this.scale=1;this.pan=[0,0];}
   if(action==='expand'){root.classList.toggle('al-expanded');button.setAttribute('aria-label',root.classList.contains('al-expanded')?'收起影像':'展开影像');button.setAttribute('aria-pressed',String(root.classList.contains('al-expanded')));}
   if(['previous','next'].includes(action)&&this.meta)this.setIndex(this.index+(action==='next'?1:-1));
   if(action==='target'&&this.meta)this.setIndex(this.targetIndex());
   this.draw();this.onInteract(action);
  },events));
  root.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.classList.contains('al-expanded')){root.classList.remove('al-expanded');const b=root.querySelector('[data-media="expand"]');b.setAttribute('aria-label','展开影像');b.setAttribute('aria-pressed','false');b.focus();this.draw();}},events);
  root.querySelectorAll('[data-plane]').forEach(b=>b.addEventListener('click',()=>{this.plane=b.dataset.plane;this.pan=[0,0];this.index=this.targetIndex();this.updateSlice();this.draw();onInteract('plane');},events));
  root.querySelector('[data-slice]')?.addEventListener('input',e=>{this.setIndex(+e.target.value);onInteract('slice');},events);
  root.querySelector('[data-window]')?.addEventListener('change',e=>{this.window=e.target.value;this.draw();onInteract('window');},events);
  root.querySelector('[data-overlay]')?.addEventListener('change',e=>{this.overlay=e.target.checked;this.draw();},events);
  this.canvas.addEventListener('wheel',e=>{e.preventDefault();if(e.ctrlKey||e.metaKey||q.visual.kind!=='ct'){this.scale=clamp(this.scale*(e.deltaY<0?1.1:1/1.1),.05,4);this.draw();}else this.setIndex(this.index+(e.deltaY>0?1:-1));onInteract('wheel');},{...events,passive:false});
  this.canvas.addEventListener('dblclick',()=>{this.scale=1;this.pan=[0,0];this.draw();},events);
  this.canvas.addEventListener('pointerdown',e=>{
   this.pointers.set(e.pointerId,[e.clientX,e.clientY]);this.drag={x:e.clientX,y:e.clientY,pan:[...this.pan],moved:false};this.canvas.setPointerCapture?.(e.pointerId);
   if(this.pointers.size===2){const [a,b]=[...this.pointers.values()];this.pinch={distance:Math.max(1,Math.hypot(a[0]-b[0],a[1]-b[1])),scale:this.scale,center:[(a[0]+b[0])/2,(a[1]+b[1])/2],pan:[...this.pan]};this.drag.moved=true;}
  },events);
  this.canvas.addEventListener('pointermove',e=>{
   if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,[e.clientX,e.clientY]);
   if(this.pinch&&this.pointers.size>=2){const [a,b]=[...this.pointers.values()];this.scale=clamp(this.pinch.scale*Math.hypot(a[0]-b[0],a[1]-b[1])/this.pinch.distance,.05,4);this.pan=[this.pinch.pan[0]+(a[0]+b[0])/2-this.pinch.center[0],this.pinch.pan[1]+(a[1]+b[1])/2-this.pinch.center[1]];this.draw();return;}
   if(!this.drag)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.hypot(dx,dy)>4)this.drag.moved=true;if(this.drag.moved){this.pan=[this.drag.pan[0]+dx,this.drag.pan[1]+dy];this.draw();}
  },events);
  this.canvas.addEventListener('pointerup',e=>{if(!this.pinch&&this.drag&&!this.drag.moved&&q.type==='hotspot'&&!this.review&&this.ready){const box=this.canvas.getBoundingClientRect(),t=this.transform,b=sourceBounds(this.visual.src);if(t){const x=(e.clientX-box.left-t.x)/t.w,y=(e.clientY-box.top-t.y)/t.h;if(x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom){this.setPick([x,y]);this.onPick(this.pick);}}}this.pointers.delete(e.pointerId);this.pinch=null;this.drag=null;},events);
  this.canvas.addEventListener('pointercancel',e=>{this.pointers.delete(e.pointerId);this.pinch=null;this.drag=null;},events);
  this.canvas.addEventListener('keydown',e=>{
   if(q.type==='hotspot'&&!this.review&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(e.key)){
    e.preventDefault();const p=this.cursor||this.pick||[.5,.5],b=sourceBounds(this.visual.src);this.cursor=[clamp(p[0]+(e.key==='ArrowRight'?.01:e.key==='ArrowLeft'?-.01:0),b.left,b.right),clamp(p[1]+(e.key==='ArrowDown'?.01:e.key==='ArrowUp'?-.01:0),b.top,b.bottom)];
    if(e.key==='Enter'||e.key===' '){this.setPick(this.cursor);this.onPick(this.pick);}this.draw();
   }else if(q.visual.kind==='ct'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();this.setIndex(this.index+(e.key==='ArrowRight'?1:-1));}
  },events);
  try{
   if(!this.ctx)throw new Error('当前环境无法绘制影像');
   if(q.visual.kind==='ct')await this.loadCT();else await this.loadImage();
   if(this.destroyed)return;
   this.ready=true;root.querySelector('.al-media-loading').hidden=true;this.draw();onReady(true);
  }catch(error){if(this.destroyed||error.name==='AbortError')return;this.ready=false;const status=root.querySelector('.al-media-loading');if(status){status.textContent='影像加载失败。请重试后作答。';const b=document.createElement('button');b.textContent='重试';b.className='outline';b.onclick=()=>{this.destroy();const next=new AssessmentMedia();this.replacement=next;next.mount(root,q,{review,pick,onPick,onReady,onInteract});};status.append(b);}onReady(false,error.message);}
 }
 async loadCT(){
  const v=this.visual,signal=this.abort.signal;
  let data=cache.get(v.caseId);
  if(!data){const meta=await fetchJSON(`./real-cases/${v.caseId}/case.json`,signal);const raw=await fetchGzip(`./real-cases/${v.caseId}/${meta.ct.asset}`,meta.ct,signal);data={meta,volume:decodeVolume(raw,meta.ct)};cache.set(v.caseId,data);while(cache.size>2)cache.delete(cache.keys().next().value);}
  if(v.ctSha256&&data.meta.ct.sha256!==v.ctSha256)throw new Error('CT 版本与题目不一致');
  this.meta=data.meta;this.volume=data.volume;this.plane=v.plane||'axial';this.window=v.window||'lung';this.root.querySelector('[data-window]').value=this.window;this.index=this.targetIndex();this.updateSlice();
  if(this.review&&v.answerCode){
   const meta=await fetchJSON(`./segment-atlas/${v.caseId}/atlas.json`,signal);
   if(meta.ctSha256!==data.meta.ct.sha256||meta.labels.sha256!==v.sourceAtlasSha256)throw new Error('标注版本与题目不一致');
   this.atlas=meta;this.labels=decodeAtlas(await fetchGzip(`./segment-atlas/${v.caseId}/${meta.labels.asset}`,meta.labels,signal),meta);
  }
 }
 loadImage(){return new Promise((resolve,reject)=>{this.img=new Image();this.img.onload=resolve;this.img.onerror=()=>reject(new Error('临床图像不可用'));this.img.src=this.visual.src;});}
 targetIndex(){if(!this.meta)return 0;const spec=planeSpec(this.plane,this.meta.ct);return this.visual.point?this.visual.point[spec.axis]:spec.axis===2?this.meta.ct.initialSlice:Math.floor(this.meta.ct.dimensions[spec.axis]/2);}
 setIndex(value){if(!this.meta||!Number.isFinite(value))return;const spec=planeSpec(this.plane,this.meta.ct);this.index=clamp(value,0,this.meta.ct.dimensions[spec.axis]-1);this.updateSlice();this.draw();}
 updateSlice(){if(!this.meta)return;const spec=planeSpec(this.plane,this.meta.ct),range=this.root.querySelector('[data-slice]');range.max=this.meta.ct.dimensions[spec.axis]-1;range.value=this.index;this.root.querySelector('[data-layer]').textContent=`${this.index+1} / ${+range.max+1}`;this.root.querySelectorAll('[data-plane]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plane===this.plane)));}
 setPick(point){if(this.replacement)return this.replacement.setPick(point);this.pick=Array.isArray(point)?point:null;this.draw();}
 draw(){
  if(this.destroyed||!this.ready||!this.ctx)return;
  const box=this.stage.getBoundingClientRect(),w=Math.max(1,box.width),h=Math.max(1,box.height),dpr=Math.min(globalThis.devicePixelRatio||1,2),ctx=this.ctx;
  this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#050a10';ctx.fillRect(0,0,w,h);
  let iw,ih,spec;
  if(this.visual.kind==='ct'){spec=planeSpec(this.plane,this.meta.ct);iw=spec.width*spec.sx;ih=spec.height*spec.sy;}else{iw=this.img.naturalWidth;ih=this.img.naturalHeight;}
  const fit=Math.min(w/iw,h/ih)*.94*this.scale,dw=iw*fit,dh=ih*fit,x=(w-dw)/2+this.pan[0],y=(h-dh)/2+this.pan[1];this.transform={x,y,w:dw,h:dh};
  if(spec){
   const raw=document.createElement('canvas');raw.width=spec.width;raw.height=spec.height;
   raw.getContext('2d').putImageData(new ImageData(sliceRGBA(this.volume,this.plane,this.index,this.meta.ct,this.window==='mediastinum'?40:-600,this.window==='mediastinum'?400:1500),spec.width,spec.height),0,0);
   ctx.drawImage(raw,x,y,dw,dh);
   if(this.review&&this.overlay&&this.labels){
    const bits=atlasSlice(this.labels,this.meta.ct,this.plane,this.index),seg=this.atlas.segments.find(s=>s.code===this.visual.answerCode);
    const selected=bits.map(b=>b&seg.bit);
    raw.getContext('2d').putImageData(new ImageData(overlayRGBA(selected,spec.width,[seg],{mode:'fill',opacity:.2,selectedBit:seg.bit,onlySelected:true}),spec.width,spec.height),0,0);ctx.drawImage(raw,x,y,dw,dh);
   }
   if(this.visual.point&&this.index===this.targetIndex()){const [u,v]=voxelToPlane(this.visual.point,this.plane,this.meta.ct);this.cross(ctx,x+(u+.5)/spec.width*dw,y+(v+.5)/spec.height*dh,'#f1d48d');}
   const labels=spec.labels;ctx.fillStyle='#d1dfec';ctx.font='13px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText(labels[0],w/2,23);ctx.fillText(labels[1],w/2,h-14);ctx.fillText(labels[2],18,h/2);ctx.fillText(labels[3],w-18,h/2);
  }else{
   ctx.drawImage(this.img,x,y,dw,dh);
   const t=sourceDisplayRect(this.transform,this.visual.src);this.transform=t;
   if(this.review&&this.q.type==='hotspot'){ctx.beginPath();this.q.answer.forEach(([u,v],i)=>i?ctx.lineTo(t.x+u*t.w,t.y+v*t.h):ctx.moveTo(t.x+u*t.w,t.y+v*t.h));ctx.closePath();ctx.strokeStyle='#9ce3c7';ctx.lineWidth=2;ctx.stroke();}
   if(this.pick)this.cross(ctx,t.x+this.pick[0]*t.w,t.y+this.pick[1]*t.h,'#f1d48d');
   if(this.cursor&&!this.review)this.cross(ctx,t.x+this.cursor[0]*t.w,t.y+this.cursor[1]*t.h,'#f6f8fb');
  }
  this.root.querySelector('[data-zoom]').textContent=Math.round(this.scale*100)+'%';
 }
 cross(ctx,x,y,color){ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){ctx.moveTo(x+dx*5,y+dy*5);ctx.lineTo(x+dx*14,y+dy*14);}ctx.stroke();}
 destroy(){this.destroyed=true;this.abort.abort();this.resize?.disconnect();if(this.img){this.img.onload=null;this.img.onerror=null;}this.replacement?.destroy();}
}
