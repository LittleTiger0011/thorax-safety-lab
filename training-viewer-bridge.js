import {TrainingRealCase,TRAINING_CASE_ID} from './training-real-case.js';
import {STRUCTURES} from './anatomy-data.js';

/** Soft aliases: teaching IDs → CT-004 source mesh IDs. Whole-tree IDs are observational only, not branch scoring. */
const TEACH_TO_REAL={
 rul:'s12',rml:'s13',rll:'s14',lul:'s15',lll:'s16',
 rub:'s03',bi:'s03',rmb:'s03',bll:'s03',
 rulv:'s05',rmlv:'s05',rspv:'s05',ripv:'s05',
 a13:'s04',interlobar:'s04',a2:'s04',rpa:'s04',
 s1:'s06',s2:'s08',s3:'s10'
};
const GROUP_LABEL={nodule:'结节',artery:'肺动脉',vein:'肺静脉',airway:'支气管',lobe:'肺叶',segment:'肺段',planning:'源规划',annotation:'待核标注'};

export class RealTrainingViewer{
 constructor(canvases,onPick){
  this.onPick=onPick;
  this.selected=null;
  this.hidden=new Set();
  this.opacity=.09;
  this.segments=true;
  this.lesion=true;
  this.showSlice=true;
  this.natural=false;
  this.linked=true;
  this.labels=true;
  this.exam=null;
  this.effect=null;
  this.effectProgress=0;
  this.mode='real';
  this.slice=0;
  this.view='anterior';
  this._stripHook=null;
  const el={
   ct:canvases.ct,anatomy:canvases.anatomy,scope:canvases.scope,
   status:document.getElementById('ct-status'),
   caption:document.getElementById('ct-caption'),
   slice:document.getElementById('slice'),
   sliceValue:document.getElementById('slice-value'),
   planeLabel:document.getElementById('ct-plane-label'),
   hu:document.getElementById('ct-hu'),
   preset:document.getElementById('window-preset'),
   width:document.getElementById('window-width'),
   center:document.getElementById('window-center'),
   opacity:document.getElementById('opacity'),
   selectionName:document.getElementById('selection-name'),
   selectionDetail:document.getElementById('selection-detail'),
   detailLabel:document.getElementById('detail-focus-label'),
   detailHint:document.getElementById('detail-hint')||document.getElementById('scope-status')
  };
  this.real=new TrainingRealCase(el,{
   onSelect:meta=>this._fromRealSelect(meta,'scene'),
   onReady:()=>{this._syncFlags();this.updateLabels();this._stripHook?.();this._fillCaseSelect();},
   onStatus:msg=>{const t=document.getElementById('toast');if(!t)return;if(msg){t.hidden=false;t.textContent=msg;}else{t.hidden=true;t.textContent='';}}
  });
  document.body.classList.add('real-training');
  const veil=document.getElementById('bleeding-veil');if(veil)veil.style.opacity='0';
  const vignette=document.querySelector('.scope-vignette');if(vignette)vignette.style.display='none';
  const reticle=document.querySelector('.scope-reticle');if(reticle)reticle.style.display='none';
  const mode=document.getElementById('detail-focus-label')||document.getElementById('scope-mode-label');if(mode)mode.textContent='CT-004';
  this._loadPromise=this.real.load(TRAINING_CASE_ID).catch(err=>{console.error(err);throw err;});
 }

 resolveRealId(id){
  if(!id)return null;
  if(this.real.meshes.has(id))return id;
  return TEACH_TO_REAL[id]||null;
 }

 structureGroups(){
  if(!this.real.ready)return [];
  const buckets=new Map();
  for(const {meta} of this.real.meshes.values()){
   const label=GROUP_LABEL[meta.group]||meta.group;
   if(!buckets.has(label))buckets.set(label,[]);
   buckets.get(label).push(meta);
  }
  return [...buckets.entries()];
 }

 _fromRealSelect(meta,source='scene'){
  if(!meta){this.selected=null;this.updateLabels();this._stripHook?.();return;}
  this.selected=meta.id;
  const teach=Object.entries(TEACH_TO_REAL).find(([,rid])=>rid===meta.id)?.[0]||null;
  const reportId=teach&&['lobe'].includes(meta.group)?teach:meta.id;
  if(this.exam){
   if(this.exam.pick&&source!=='list'){
    // exam pick screens: accept lobe aliases or exact mesh id
    this.onPick?.(reportId,source==='scene'?(this.exam.pick||'anatomy'):source,true);
   }
   this.updateLabels();this._stripHook?.();return;
  }
  this.onPick?.(reportId,source,false);
  this.updateLabels();this._stripHook?.();
 }

 select(id,source='list'){
  if(id==null){
   this.selected=null;this.real.selectedId=null;this.real.cursor.visible=false;
   for(const {mesh} of this.real.meshes.values()){mesh.material.emissive.set(0x000000);mesh.material.emissiveIntensity=0;}
   this.real.drawCT();this.updateLabels();this._stripHook?.();return;
  }
  const realId=this.resolveRealId(id);
  this.selected=realId||id;
  if(realId){
   if(source==='internal'){
    const prev=this.real.hooks.onSelect;this.real.hooks.onSelect=null;this.real.select(realId);this.real.hooks.onSelect=prev;
   }else this.real.select(realId); // fires onSelect → _fromRealSelect → onPick
  }else{
   this.real.selectedId=null;
   for(const {mesh} of this.real.meshes.values()){mesh.material.emissive.set(0x000000);mesh.material.emissiveIntensity=0;}
   if(source!=='internal')this.onPick?.(id,source,!!this.exam);
   this.updateLabels();this._stripHook?.();
  }
 }

 setSlice(y){
  // real case uses integer slice index; old schematic used Y float
  const n=Number(y);
  if(!this.real.ready){this.slice=n;return;}
  if(Number.isFinite(n)&&n>=0&&n<=200&&Number.isInteger(n)||String(y).indexOf('.')===-1&&n>=0){
   this.real.setSlice(Math.round(n));
  }else if(this.selected){
   const item=this.real.meshes.get(this.resolveRealId(this.selected)||this.selected);
   if(item?.meta?.bounds){
    const c=item.meta.bounds; // may be LPS box - locate via select recenter
    this.real.select(item.meta.id);
   }
  }
  this.slice=this.real.currentSlice();
 }

 setScopeView(key){this.view=key;this.real.fitOverview(key||'anterior');}
 reset(){this.real.reset();this.view='anterior';if(this.real.ready)this.real.setWindow('lung');}
 fitDetailOverview(){this.real.fitDetailOverview();}
 focus(id){const rid=this.resolveRealId(id);if(rid)this.real.select(rid);}
 setExam(q){this.exam=q;this.selected=null;this.effect=null;this.real.select(null);if(q?.structure){const rid=this.resolveRealId(q.structure);if(rid)this.real.select(rid);}this.updateLabels();}
 setEffect(key,progress=0){
  this.effect=key;this.effectProgress=progress;
  const veil=document.getElementById('bleeding-veil');if(veil)veil.style.opacity='0';
  const hint=document.getElementById('scope-status');
  if(hint&&key)hint.textContent=`后果演示改为原则提示（不伪造喷血）：${key} · ${Math.round(progress*100)}% · 请结合真实术野页对照`;
 }
 updateMaterials(){this._syncFlags();this.real.dirty=true;}
 updateLabels(){
  const nameEl=document.getElementById('selection-name');
  const detailEl=document.getElementById('selection-detail');
  if(!nameEl)return;
  if(!this.labels){nameEl.textContent='结构名称已隐藏';return;}
  const item=this.real.meshes.get(this.real.selectedId);
  if(item){nameEl.textContent=item.meta.name;return;}
  if(this.selected&&STRUCTURES[this.selected]){nameEl.textContent=STRUCTURES[this.selected].name+'（教学选项，本例无同名细分支网格）';return;}
  if(!this.real.ready)nameEl.textContent='正在载入真实 CT…';
 }
 updateVisibility(){this.updateMaterials();}
 resize(){this.real.resize();}
 snapshot(){return {mode:'real',...this.real.snapshot(),selected:this.selected,view:this.view};}
 restore(s){if(!s)return;this.view=s.view||'anterior';this.real.restore(s);if(s.selected)this.select(s.selected,'internal');}
 destroy(){this.real.destroy();}

 setLobeOpacity(v){const percent=+v<=1?Math.round(+v*100):Math.round(+v);this.opacity=percent/100;this.real.setLobeOpacity(percent);}
 _syncFlags(){
  if(!this.real.ready)return;
  this.real.showLesion=!!this.lesion;
  this.real.imagePlane.visible=!!this.showSlice;
  for(const {mesh,meta} of this.real.meshes.values()){
   const teach=Object.entries(TEACH_TO_REAL).find(([,rid])=>rid===meta.id)?.[0];
   const hideTeach=teach&&this.hidden.has(teach);
   const hideSeg=meta.group==='segment'&&!this.segments;
   mesh.visible=!(hideTeach||hideSeg||this.hidden.has(meta.id));
   if(meta.group==='lobe'||meta.group==='segment'){mesh.material.opacity=this.opacity;mesh.material.transparent=true;}
  }
  const detail=this.real.detail;
  if(this.real.detailFraming==='overview'&&detail?.ready&&Math.abs(detail.percent-100)<.1&&detail.view.controls.target.distanceTo(detail.anchor)<.01)this.real.fitDetailOverview();
  this.real.dirty=true;this.real.drawCT();
 }

 setPlane(plane){this.real.setPlane(plane);}
 setWindowPreset(preset){this.real.setWindow(preset);const ww=document.getElementById('window-width'),wc=document.getElementById('window-center');if(ww)ww.value=this.real.windowWidth;if(wc)wc.value=this.real.windowCenter;}
 setCustomWindow(ww,wl){this.real.windowWidth=+ww;this.real.windowCenter=+wl;this.real.preset='custom';this.real.drawCT();}
 _fillCaseSelect(){
  const select=document.getElementById('training-case-select');if(!select||!this.real.catalog)return;
  select.replaceChildren();
  for(const c of this.real.catalog.cases){const o=document.createElement('option');o.value=c.id;o.textContent=`${c.id} · ${c.title}`;select.append(o);}
  select.value=this.real.caseId;
  if(!select.dataset.bound){select.dataset.bound='1';select.addEventListener('change',()=>this.loadCase(select.value));}
 }
 async loadCase(id){
  const title=document.getElementById('case-banner-title'),chip=document.getElementById('ct-case-chip');
  if(title)title.textContent=`${id} · 真实 HU CT`;if(chip)chip.textContent=id;
  await this.real.load(id);this._syncFlags();this.updateLabels();this._stripHook?.();this.resize();
 }
 toggleMeasure(){const on=this.real.toggleMeasure();const b=document.getElementById('measure-btn');if(b)b.setAttribute('aria-pressed',String(on));return on;}
 locateSelected(){
  const rid=this.resolveRealId(this.selected)||this.real.selectedId;
  if(rid)this.real.select(rid);
  else this.real.locateNodule();
 }
}
