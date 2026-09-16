import {STATIONS,COMPARE_CASES,SCREEN_LEGEND,EXPLORE_VERSION,pickMatches} from './explore-data.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function ensureProgress(session){
 session.exploreLab ||= {version:EXPLORE_VERSION,index:0,results:{},pauses:0};
 if(!session.exploreLab.results)session.exploreLab.results={};
 return session.exploreLab;
}

export class ExploreLab{
 constructor(api){
  this.api=api;
  this.root=null;
  this.choice=null;
  this.feedback=null;
  this.hintLevel=0;
  this.showUnmarked=false;
  this.driven=null;
  this.caseOverride=null;
  this.onClick=null;
 }

 station(){return STATIONS[this.index]||STATIONS[0];}
 get index(){return ensureProgress(this.api.getSession()).index||0;}
 set index(value){ensureProgress(this.api.getSession()).index=Math.max(0,Math.min(STATIONS.length-1,value));}
 result(id){return ensureProgress(this.api.getSession()).results[id||this.station().id];}
 passedCount(){return STATIONS.filter(s=>this.result(s.id)?.passed).length;}

 mount(root){
  this.root=root;
  this.root.classList.add('ex-lab-host');
  this.choice=this.result()?.choice??this.choice;
  this.bind();
  this.render();
  this.applyDrive(this.station());
 }

 unmount(){
  if(this.root&&this.onClick)this.root.removeEventListener('click',this.onClick);
  this.root?.classList.remove('ex-lab-host');
  this.onClick=null;
  this.root=null;
 }

 bind(){
  if(!this.root)return;
  if(this.onClick)this.root.removeEventListener('click',this.onClick);
  this.onClick=e=>{
   const b=e.target.closest('[data-ex]');
   if(!b||b.disabled)return;
   this.act(b.dataset.ex,b.dataset).catch(err=>this.api.toast?.(err.message||String(err)));
  };
  this.root.addEventListener('click',this.onClick);
 }

 async act(action,d){
  const station=this.station();
  if(action==='station')return this.goto(+d.index);
  if(action==='choose'){this.choice=+d.index;this.feedback=null;return this.render(false);}
  if(action==='submit')return this.submit();
  if(action==='hint')return this.hint();
  if(action==='pause')return this.pause();
  if(action==='next')return this.goto(this.index+1);
  if(action==='prev')return this.goto(this.index-1);
  if(action==='labels')return this.toggleLabels();
  if(action==='locate')return this.locate();
  if(action==='plane'){this.api.screen?.('ct');this.viewer()?.setPlane?.(d.id);return;}
  if(action==='window'){this.api.screen?.('ct');this.viewer()?.setWindowPreset?.(d.id);return;}
  if(action==='camera'){
   this.api.screen?.('anatomy');
   document.querySelectorAll('[data-camera]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.camera===d.id)));
   this.viewer()?.real?.fitOverview?.(d.id);
   this.viewer()?.setScopeView?.(d.id);
   return;
  }
  if(action==='screen'){this.api.screen?.(d.id);return;}
  if(action==='case')return this.loadCase(d.id);
  if(action==='unmarked'){this.showUnmarked=!this.showUnmarked;return this.render(false);}
  if(action==='pretest')return this.api.goPretest?.();
  if(action==='checkpoints')return this.api.goCheckpoints?.();
  if(action==='focus-pick'&&station.pick){
   const id=station.pick.ids[0];
   this.viewer()?.select?.(id);
   this.api.screen?.(station.screen||'anatomy');
   this.api.updateStrip?.();
  }
 }

 viewer(){return this.api.getViewer?.();}

 applyDrive(station,force=false){
  if(!station)return;
  if(!force&&this.driven===station.id)return;
  this.driven=station.id;
  const v=this.viewer(),d=station.drive||{};
  const caseId=this.caseOverride||d.caseId;
  this.api.screen?.(station.screen||d.screen||'ct');
  if(!v)return;
  const run=()=>{
   if(d.plane)v.setPlane?.(d.plane);
   if(d.window)v.setWindowPreset?.(d.window);
   if(d.camera){
    document.querySelectorAll('[data-camera]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.camera===d.camera)));
    v.real?.fitOverview?.(d.camera);
    v.view=d.camera;
   }
   if(d.segments!=null){v.segments=d.segments;v.updateMaterials?.();}
   v.labels=d.labels!==false;
   if(d.select)v.select?.(d.select);
   else if(d.labels===false)v.select?.(null);
   if(d.locate==='nodule'){v.locateSelected?.();v.real?.locateNodule?.();}
   v.updateLabels?.();
   this.api.updateStrip?.();
   v.resize?.();
  };
  if(caseId&&v.real?.caseId&&v.real.caseId!==caseId&&v.loadCase){
   v.loadCase(caseId).then(run).catch(err=>this.api.toast?.(err.message));
  }else{
   const ready=v._loadPromise;
   if(ready?.then)ready.then(run).catch(()=>run());
   else run();
  }
 }

 async loadCase(id){
  const v=this.viewer();
  if(!v?.loadCase){this.api.toast?.('当前三维尚未就绪，可先在上方病例菜单切换。');return;}
  this.caseOverride=id;
  this.api.toast?.('正在载入 '+id+' · 源网格与 CT 仍属该例，不是检查点病历');
  await v.loadCase(id);
  this.api.updateStrip?.();
  v.resize?.();
  this.api.log?.('explore_case',{caseId:id,station:this.station().id,learningOnly:true});
  this.api.save?.();
 }

 toggleLabels(){
  const v=this.viewer();if(!v)return;
  v.labels=!v.labels;
  if(!v.labels){
   const name=document.getElementById('selection-name');
   if(name)name.textContent='结构名称已隐藏';
  }else v.updateLabels?.();
  this.api.toast?.(v.labels?'已显示结构名称':'已隐藏结构名称 · 用肺门和肺裂定向');
  this.render(false);
 }

 locate(){
  const station=this.station(),v=this.viewer();
  this.api.screen?.(station.screen||'ct');
  if(station.pick)v?.select?.(station.pick.ids[0]);
  else v?.locateSelected?.()||v?.real?.locateNodule?.();
  v?.updateLabels?.();
  this.api.updateStrip?.();
 }

 goto(i){
  const next=Math.max(0,Math.min(STATIONS.length-1,i));
  this.index=next;
  this.choice=this.result()?.choice??null;
  this.feedback=null;
  this.hintLevel=this.result()?.hints||0;
  this.showUnmarked=false;
  this.driven=null;
  this.caseOverride=null;
  this.api.log?.('explore_station',{station:this.station().id,index:next,learningOnly:true});
  this.api.save?.();
  this.render();
  this.applyDrive(this.station(),true);
 }

 hint(){
  const station=this.station();
  this.hintLevel=Math.min(2,(this.hintLevel||0)+1);
  const progress=ensureProgress(this.api.getSession());
  const row=progress.results[station.id]||{passed:false,attempts:0,hints:0};
  row.hints=this.hintLevel;progress.results[station.id]=row;
  this.feedback={kind:'hint',text:station.hint[this.hintLevel-1]};
  this.api.log?.('explore_hint',{station:station.id,level:this.hintLevel,learningOnly:true});
  this.api.save?.();
  this.render(false);
 }

 pause(){
  const progress=ensureProgress(this.api.getSession());
  progress.pauses=(progress.pauses||0)+1;
  this.api.log?.('explore_pause',{station:this.station().id,view:this.viewer()?.snapshot?.(),learningOnly:true});
  this.api.save?.();
  this.api.toast?.('已记录主动暂停。探索阶段不计错。');
 }

 submit(){
  const station=this.station();
  if(this.choice==null){this.api.toast?.('请先选择一项观察判断。');return;}
  const correct=this.choice===station.answer;
  const clicked=!!this.result()?.clicked;
  const progress=ensureProgress(this.api.getSession());
  const prior=progress.results[station.id]||{passed:false,attempts:0,hints:0,clicked:false};
  if(!prior.first)prior.first={choice:this.choice,correct,clicked};
  prior.attempts+=1;
  prior.choice=this.choice;
  prior.passed=prior.passed||correct;
  prior.last={choice:this.choice,correct,clicked};
  progress.results[station.id]=prior;
  this.feedback={kind:correct?'ok':'retry',text:correct?station.why:`请对照三屏再看。${station.hint[0]}`};
  this.api.log?.('explore_answer',{station:station.id,choice:this.choice,correct,clicked,learningOnly:true,notCheckpoint:true});
  this.api.save?.();
  this.render(false);
 }

 onPick(id,source){
  const station=this.station();
  const v=this.viewer();
  const meta=v?.real?.meshes?.get?.(v.real.selectedId)?.meta||v?.real?.meshes?.get?.(id)?.meta||{id,name:'',group:''};
  const payload={id:meta.id||id,name:meta.name,group:meta.group,source};
  if(!station.pick)return;
  const ok=pickMatches(station,payload);
  const progress=ensureProgress(this.api.getSession());
  const row=progress.results[station.id]||{passed:false,attempts:0,hints:0,clicked:false};
  if(ok)row.clicked=true;
  progress.results[station.id]=row;
  this.feedback=ok
   ?{kind:'pick',text:`已在三屏选中「${meta.name||station.pick.label}」。请再完成右侧的观察判断。`}
   :{kind:'pick-miss',text:`当前选中「${meta.name||id}」。请对照 CT 轮廓与三维走行，再找${station.pick.label}。探索点击不计错。`};
  this.api.save?.();
  this.render(false);
 }

 render(apply=true){
  if(!this.root)return;
  const station=this.station(),progress=ensureProgress(this.api.getSession()),row=this.result()||{};
  const done=this.passedCount();
  const v=this.viewer();
  const labelsOn=v?v.labels!==false:station.drive.labels!==false;
  const caseId=v?.real?.caseId||station.drive.caseId||'CT-004';
  this.root.innerHTML=`<section class="ex-lab" aria-label="三屏探索">
   <header class="ex-hero">
    <div>
     <p class="ex-kicker">THREE-SCREEN EXPLORE · ${esc(EXPLORE_VERSION)}</p>
     <h2>在真实 CT 上走通三屏对应</h2>
     <p>默认病例 <strong>${esc(caseId)}</strong> 右上叶结节。点击任一屏或结构目录；探索不计错。支气管和血管在本例是整树，不自动当成 B1 / A1 得分。</p>
    </div>
    <figure class="ex-hero-photo" aria-hidden="true"><img src="./assets/scene/console.webp" alt="" width="1600" height="901" decoding="async"></figure>
    <div class="ex-progress-meter" aria-label="探索进度">
     <strong>${done}<small> / ${STATIONS.length}</small></strong>
     <span>观察站已完成</span>
     <span>暂停 ${progress.pauses||0} 次 · 不计错</span>
    </div>
   </header>
   <div class="ex-screens" role="list" aria-label="三屏分工">
    ${SCREEN_LEGEND.map(s=>`<button type="button" role="listitem" data-ex="screen" data-id="${s.id}" class="${station.screen===s.id?'is-current':''}"><span>${s.num}</span><div><strong>${s.name}</strong><small>${esc(s.hint)}</small></div></button>`).join('')}
   </div>
   <nav class="ex-stations" aria-label="探索站">
    ${STATIONS.map((s,i)=>`<button type="button" data-ex="station" data-index="${i}" class="${i===this.index?'is-current':''} ${progress.results[s.id]?.passed?'is-done':''}" aria-current="${i===this.index?'step':'false'}"><span>${s.num}</span>${esc(s.kicker)}</button>`).join('')}
   </nav>
   <div class="ex-body">
    <article class="ex-task">
     <header>
      <p class="ex-kicker">STATION ${station.num} · ${esc(station.kicker)}</p>
      <h3>${esc(station.title)}</h3>
      <p>${esc(station.goal)}</p>
     </header>
     <p class="ex-do"><strong>在三屏上做</strong>${esc(station.do)}</p>
     <div class="ex-coach">
      ${['ct','anatomy','scope'].map(id=>{const s=SCREEN_LEGEND.find(x=>x.id===id);return `<div class="${station.screen===id?'is-focus':''}"><span>${s.num} ${s.name}</span><p>${esc(station.coach[id])}</p></div>`;}).join('')}
     </div>
     <div class="ex-tools" role="group" aria-label="带动三屏">
      <button type="button" data-ex="plane" data-id="axial">轴位</button>
      <button type="button" data-ex="plane" data-id="coronal">冠状位</button>
      <button type="button" data-ex="plane" data-id="sagittal">矢状位</button>
      <button type="button" data-ex="window" data-id="lung">肺窗</button>
      <button type="button" data-ex="window" data-id="mediastinum">纵隔窗</button>
      <button type="button" data-ex="camera" data-id="anterior">前方</button>
      <button type="button" data-ex="camera" data-id="posterior">后方</button>
      <button type="button" data-ex="labels" aria-pressed="${labelsOn? 'true':'false'}">${labelsOn?'隐藏名称':'显示名称'}</button>
      <button type="button" data-ex="locate">${station.pick?'定位目标结构':'定位病灶'}</button>
     </div>
     ${station.figures.length?`<div class="ex-figures">
      <div class="ex-figures-head"><strong>本站真实资料</strong><button type="button" data-ex="unmarked">${this.showUnmarked?'看填色对照':'看未着色 CT'}</button></div>
      <div class="ex-figure-grid">${station.figures.map(f=>{
       const src=this.showUnmarked&&f.plain?f.plain:f.src;
       return `<figure><img src="${esc(src)}" alt="${esc(f.caption)}" loading="lazy" width="280" height="200"><figcaption>${esc(f.caption)}</figcaption></figure>`;
      }).join('')}</div>
     </div>`:''}
     ${station.mnemonic?`<p class="ex-mnemonic">${esc(station.mnemonic)}</p>`:''}
     ${station.compare.length?`<div class="ex-compare"><span>换病例对照</span>${COMPARE_CASES.filter(c=>station.compare.includes(c.id)).map(c=>`<button type="button" data-ex="case" data-id="${c.id}">${c.id} · ${esc(c.use)}</button>`).join('')}</div>`:''}
     ${station.fieldLink?`<p class="ex-field-link"><a class="ex-button" href="${station.fieldLink}">打开真实术野页 →</a><small>左上叶公开片，不是 CT-004 患者。</small></p>`:''}
     <p class="ex-note">${esc(station.note)}</p>
    </article>
    <aside class="ex-answer">
     <p class="ex-kicker">观察判断 · 不计检查点分</p>
     <h3>${esc(station.question)}</h3>
     <div class="ex-options">${station.options.map((text,i)=>`<button type="button" data-ex="choose" data-index="${i}" class="${this.choice===i?'is-selected':''} ${row.passed&&i===station.answer?'is-key':''}"><span>${String.fromCharCode(65+i)}</span>${esc(text)}</button>`).join('')}</div>
     ${this.feedback?`<div class="ex-feedback is-${esc(this.feedback.kind)}">${esc(this.feedback.text)}</div>`:''}
     <div class="ex-actions">
      <button type="button" class="ex-primary" data-ex="submit" ${this.choice==null?'disabled':''}>提交观察</button>
      <button type="button" data-ex="pause">不确定，先暂停</button>
      <button type="button" data-ex="hint">分级提示${this.hintLevel?` · ${this.hintLevel}`:''}</button>
     </div>
     <div class="ex-pager">
      <button type="button" data-ex="prev" ${this.index===0?'disabled':''}>上一站</button>
      <button type="button" data-ex="next" ${this.index===STATIONS.length-1?'disabled':''}>${row.passed?'下一站':'先记下，下一站'}</button>
     </div>
     <p class="ex-status">${row.passed?'本站观察已记录。':'完成判断后可进入下一站；未提交也可先看。'} 首次答案保留，不写入六个检查点成绩。</p>
    </aside>
   </div>
   <footer class="ex-foot">
    <p>课程 05–15 分钟对应本板块。建议先探索，再做六个安全检查点。</p>
    <div>
     <button type="button" data-ex="pretest">进入前测</button>
     <button type="button" class="ex-primary" data-ex="checkpoints">进入六个安全检查点</button>
    </div>
   </footer>
  </section>`;
  if(apply)this.applyDrive(station);
 }
}

export {ensureProgress};
