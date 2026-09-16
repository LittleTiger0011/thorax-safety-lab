import {fetchJSON,fetchGzip,planeSpec,voxelToLPS,planeToVoxel} from './case-library-core.js';
import {decodeAtlas,atlasSlice,summarizeSlice,overlayRGBA,labelsAt,codesAt,segmentSliceRange,parentSegment} from './segment-atlas-core.js';
import {SEGMENTS,LOBE_GROUPS,FUNDAMENTALS,REFERENCES,WECHAT_URLS,segmentByCode,fullSegmentName} from './segment-course-data.js';
import {layoutSegmentLabels,drawSegmentLabels} from './segment-label-layout.js';
import {mergeSourceAndCandidate,annotateProvenance,reviewOverlayRGBA} from './segment-supplement-core.js';
const $=id=>document.getElementById(id);
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const links=keys=>keys.map(k=>`<a href="${REFERENCES[k].url}" target="_blank" rel="noreferrer">${safe(REFERENCES[k].title)}</a>`).join('');

export class SegmentCourse{
  constructor(api){
    const initialCode=new URLSearchParams(location.search).get('segment');
    this.api=api;this.meta=null;this.labels=null;this.catalog=null;this.code=segmentByCode(initialCode)?initialCode:'RS1';this.timer=null;this.sliceKey=null;this.sliceInfo=[];this.bits=null;
    this.canvas=document.createElement('canvas');this.context=this.canvas.getContext('2d');this.choiceEpoch=0;
    this.sourceMeta=null;this.sourceLabels=null;this.reviewMeta=null;this.reviewLabels=null;this.sourceBits=null;
    $('segment-annotation-source').value=new URLSearchParams(location.search).get('annotations')==='source'?'source':'review';
    this.supplementPromise=fetchJSON('./segment-supplement/catalog.json').then(c=>{if(c.purpose!=='source-preserving-experimental-review'||c.teacherAnswersAllowed!==false)throw new Error('肺段目录用途不正确');this.supplementCatalog=c;return c;}).catch(()=>null);
    $('segment-annotation-source').addEventListener('change',()=>{this.stop();this.applyAnnotationMode();this.syncLocation();});
    this.catalogPromise=fetchJSON('./segment-atlas/catalog.json').then(c=>{this.catalog=c;this.renderNavigation();return c;}).catch(()=>null);
    $('segment-select').innerHTML=LOBE_GROUPS.map(l=>`<optgroup label="${l.name}">${SEGMENTS.filter(s=>s.lobe===l.id).map(s=>`<option value="${s.code}">${s.code} · ${s.name}</option>`).join('')}</optgroup>`).join('');
    $('segment-select').addEventListener('change',e=>this.choose(e.target.value));
    $('segment-focus').addEventListener('click',()=>this.focus());
    $('segment-source-btn').addEventListener('click',()=>this.showSources());
    $('segment-source-close').addEventListener('click',()=>$('segment-source-dialog').close());
    $('segment-cine').addEventListener('click',()=>this.timer?this.stop():this.play());
    $('cine-speed').addEventListener('change',()=>{if(this.timer){this.stop();this.play();}});
    $('cine-direction').addEventListener('change',()=>{if(this.timer){this.stop();this.play();}});
    for(const id of ['segment-overlay','segment-opacity','segment-labels','segment-only'])$(id).addEventListener('input',()=>{this.updateVisuals();this.api.redraw();});
    $('ct-segment-labels').addEventListener('change',()=>{$('segment-labels').checked=$('ct-segment-labels').checked;this.updateVisuals();this.api.redraw();});
    $('ct-segment-overlay').addEventListener('change',()=>{$('segment-overlay').value=$('ct-segment-overlay').checked?this.overlayMode||'fill':'off';this.updateVisuals();this.api.redraw();});
    $('segment-range-only').addEventListener('change',()=>{if(this.timer){this.stop();this.play();}});
    for(const b of document.querySelectorAll('[data-segment-position]'))b.addEventListener('click',()=>this.jump(b.dataset.segmentPosition));
    $('segment-previous').addEventListener('click',()=>this.next(-1));$('segment-next').addEventListener('click',()=>this.next(1));
    $('case-sidebar-toggle').addEventListener('click',()=>{const hidden=document.body.classList.toggle('catalog-collapsed');$('case-sidebar-toggle').setAttribute('aria-expanded',String(!hidden));this.api.resize();});
    $('fundamentals').innerHTML=FUNDAMENTALS.map((f,i)=>`<details ${i===0?'open':''}><summary>${f.title}</summary><p>${f.text}</p><div class="practice-line"><strong>在阅片区练习</strong>${f.action}</div><div class="reference-links">${links(f.refs)}</div></details>`).join('');
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();});
    window.addEventListener('pagehide',()=>this.stop());
    this.renderNavigation();this.renderLesson();
  }
  beforeLoad(){
    this.stop();this.meta=null;this.labels=null;this.sliceKey=null;this.sliceInfo=[];this.bits=null;
    this.sourceMeta=null;this.sourceLabels=null;this.reviewMeta=null;this.reviewLabels=null;this.sourceBits=null;
    $('segment-select').disabled=true;
    $('segment-annotation-source').disabled=true;
    $('current-segments').replaceChildren();$('segment-focus').disabled=true;
    $('case-coverage-grid').replaceChildren();$('slice-label-status').textContent='';
    $('segment-slice-strip').replaceChildren();
  }
  async loadCase(caseData,signal){
    try{
      await this.catalogPromise;
      const meta=await fetchJSON(`./segment-atlas/${caseData.id}/atlas.json`,signal);
      if(meta.schemaVersion!==1||meta.caseId!==caseData.id||meta.ctSha256!==caseData.ct.sha256||meta.geometrySha256!==caseData.geometry.sha256||meta.dimensions.join()!==caseData.ct.dimensions.join())throw new Error('肺段图与病例版本不匹配');
      const buffer=await fetchGzip(`./segment-atlas/${caseData.id}/${meta.labels.asset}`,meta.labels,signal);
      if(signal.aborted||this.api.state().activeId!==caseData.id)return;
      this.sourceMeta=meta;this.sourceLabels=decodeAtlas(buffer,meta);this.meta=meta;this.labels=this.sourceLabels;this.sliceKey=null;
      $('segment-count-total').textContent=`${this.catalog?.cases.length||15} 个真实病例 · 三方向逐层对照`;
      await this.loadSupplement(caseData,signal);
      if(signal.aborted||this.api.state().activeId!==caseData.id)return;
      this.applyAnnotationMode();
      if(this.meta.segments.some(s=>s.code===this.code))this.focus();else this.api.redraw();
    }catch(error){
      if(signal.aborted||this.api.state().activeId!==caseData.id)return;
      this.meta=null;this.labels=null;this.api.reportError(`肺段图载入失败：${error.message}`);
      $('segment-select').disabled=true;
      this.renderLesson();
    }
  }
  get reviewing(){return Boolean(this.reviewMeta&&$('segment-annotation-source').value==='review');}
  async loadSupplement(caseData,signal){
    try{
      const catalog=await this.supplementPromise,entry=catalog?.cases.find(c=>c.id===caseData.id);
      if(!entry)throw new Error('没有本例新增肺段记录');
      const meta=await fetchJSON(`./segment-supplement/${entry.asset}`,signal);
      if(meta.purpose!=='source-preserving-experimental-review'||meta.teacherAnswersAllowed!==false||meta.caseId!==caseData.id||meta.ctSha256!==caseData.ct.sha256||meta.geometrySha256!==caseData.geometry.sha256||meta.sourceAtlasSha256!==this.sourceMeta?.labels.sha256||meta.dimensions.join()!==caseData.ct.dimensions.join())throw new Error('补标与本例CT或源标签版本不匹配');
      const approval=meta.authorReview;
      if(approval?.status!=='approved-by-author'||approval.ctSha256!==meta.ctSha256||approval.sourceAtlasSha256!==meta.sourceAtlasSha256||approval.candidateSha256!==meta.candidate.sha256)throw new Error('此标注版本与作者审核记录不匹配');
      const buffer=await fetchGzip(`./segment-experiment-data/${meta.candidate.asset}`,meta.candidate,signal);
      if(signal.aborted||this.api.state().activeId!==caseData.id)return;
      const labels=mergeSourceAndCandidate(this.sourceLabels,new Uint8Array(buffer),catalog.labelCodes.length);
      this.reviewMeta=meta;this.reviewLabels=labels;
    }catch(error){if(!signal.aborted&&this.api.state().activeId===caseData.id)this.api.reportError(`肺段图载入失败：${error.message}`);}
  }
  applyAnnotationMode(){
    if(!this.sourceMeta)return;
    if(!this.reviewMeta)$('segment-annotation-source').value='source';
    const review=this.reviewing;
    this.meta=review?this.reviewMeta:this.sourceMeta;this.labels=review?this.reviewLabels:this.sourceLabels;this.sliceKey=null;
    $('segment-annotation-source').disabled=false;$('segment-select').disabled=false;
    $('segment-timeline-caption').textContent='点击跳转到相应层面';
    this.renderCoverage();this.renderNavigation();this.renderLesson();this.updateVisuals();this.api.redraw();
  }
  async choose(code,{scroll=false,caseId=null}={}){
    if(!segmentByCode(code))return;
    const epoch=++this.choiceEpoch;this.stop();this.code=code;$('segment-select').value=code;
    this.renderNavigation();this.renderLesson();await this.catalogPromise;if(epoch!==this.choiceEpoch)return;
    const available=this.catalog?.cases.filter(c=>c.codes.includes(code))||[];
    if(!available.length){this.updateVisuals();this.api.redraw();this.syncLocation();if(scroll)$('segment-course').scrollIntoView({behavior:'smooth'});return;}
    const active=this.api.state().activeId,target=caseId||active;
    // Keep the current patient's CT until the user explicitly chooses another case.
    if(target!==active)await this.api.loadCase(target);
    if(epoch!==this.choiceEpoch)return;
    this.updateVisuals();this.focus();this.api.redraw();this.renderNavigation();this.renderLesson();
    this.syncLocation();
    if(scroll)$('segment-course').scrollIntoView({behavior:'smooth'});
  }
  next(delta){const i=SEGMENTS.findIndex(s=>s.code===this.code);this.choose(SEGMENTS[(i+delta+SEGMENTS.length)%SEGMENTS.length].code);}
  renderCoverage(){
    if(!this.meta)return;
    $('case-coverage-grid').innerHTML=LOBE_GROUPS.map(l=>`<section><h4>${l.name}</h4>${SEGMENTS.filter(s=>s.lobe===l.id).map(s=>{
      const source=this.sourceMeta.segments.find(m=>m.code===s.code),candidate=this.reviewMeta?.segments.find(m=>m.code===s.code);
      return `<button data-coverage-code="${s.code}" data-candidate-only="${!source&&Boolean(candidate)}" class="${source?'supplied':candidate?'candidate':'not-supplied'}" title="${safe(source||candidate?fullSegmentName(s.code):s.code==='LS7'?'肺段命名专题':'本例暂无该段标注')}"><span>${s.code} · ${safe(s.name)}</span></button>`;
    }).join('')}</section>`).join('');
    for(const b of $('case-coverage-grid').querySelectorAll('[data-coverage-code]'))b.addEventListener('click',()=>{if(b.dataset.candidateOnly==='true'){$('segment-annotation-source').value='review';this.applyAnnotationMode();}this.choose(b.dataset.coverageCode);});
  }
  renderNavigation(){
    const available=this.meta?.segments.map(s=>s.code)||[];
    $('segment-navigation').innerHTML=LOBE_GROUPS.map(l=>`<div class="segment-nav-group"><span>${l.name}</span><div>${SEGMENTS.filter(s=>s.lobe===l.id).map(s=>`<button data-segment-code="${s.code}" class="${available.includes(s.code)?'available':''}" aria-pressed="${s.code===this.code}" title="${fullSegmentName(s.code)}">${s.code.replace(/^[RL]/,'')}<small>${s.name.split('（')[0].split('／')[0]}</small></button>`).join('')}</div></div>`).join('');
    for(const b of $('segment-navigation').querySelectorAll('[data-segment-code]'))b.addEventListener('click',()=>this.choose(b.dataset.segmentCode));
    $('segment-select').value=this.code;
  }
  renderLesson(){
    const s=segmentByCode(this.code),m=this.meta?.segments.find(x=>x.code===this.code),lobe=LOBE_GROUPS.find(l=>l.id===s.lobe);
    const source=this.sourceMeta?.segments.find(x=>x.code===this.code),review=this.reviewMeta?.segments.find(x=>x.code===this.code);
    $('segment-focus').disabled=!m;
    const candidates=this.catalog?.cases.filter(c=>c.codes.includes(this.code))||[],figure=this.catalog?.figures[this.code];
    const showLesion=$('show-lesion-outline').checked,figureAsset=figure&&(showLesion?figure.asset:figure.unmarkedAsset||figure.asset);
    const figureHTML=figure?`<button class="atlas-figure" id="lesson-figure"><img src="./segment-atlas/${figureAsset}" data-lesion-marked="./segment-atlas/${figure.asset}" data-lesion-unmarked="./segment-atlas/${figure.unmarkedAsset||figure.asset}" width="720" height="520" alt="${figure.caseId} 真实 CT 第 ${figure.slice+1} 层叠加 ${this.code} 源肺段覆盖区" loading="lazy"><span>${figure.caseId} · 轴位第 ${figure.slice+1} 层 · 点击打开此病例与层面 ↗</span></button><div class="figure-lesion-link"><span data-figure-lesion-count="${figure.sourceLesionContours||0}">${figure.sourceLesionContours?(showLesion?'本层病灶以红色外轮廓提示':'病灶红圈已隐藏，可在上方独立开启'):'此肺段代表层未切到源病灶标注'}</span><button id="lesson-lesion" class="outline">查看 ${figure.caseId} 病灶</button></div>`:`<div class="no-segment-figure"><strong>未提供独立 ${s.code} 网格</strong><p>本专题讲解命名差异，不生成推测的病例覆盖区。可切换 LS8、LS9、LS10 观察已有资料。</p></div>`;
    $('segment-lesson').innerHTML=`<div class="lesson-lead"><div><p class="eyebrow">${lobe.name} / ${s.en.toUpperCase()}</p><h3><span>${s.code}</span>${s.name}</h3><p>${s.position}</p></div></div>
      ${review&&!source?`<div class="lesson-candidate"><button id="lesson-candidate" class="outline">定位此段</button></div>`:''}
      <div class="lesson-columns"><div class="lesson-copy"><h4>从 CT 追踪到三维</h4><p>${s.trace}</p><h4>一起比较哪些结构</h4><p>${s.compare}</p><div class="pitfall"><strong>易混点</strong><p>${s.pitfall}</p></div><details class="source-subsegments"><summary>本病例的源亚段与范围</summary><p>${source?`${this.api.state().activeId} 提供：${source.sourceNames.join('、')}。源轴位覆盖第 ${source.ranges[2][0]+1}—${source.ranges[2][1]+1} 层，层号是本病例序列索引。原有范围由这些网格汇总，新增范围可切换显示查看。`:review?`新增标注轴位覆盖第 ${review.ranges[2][0]+1}—${review.ranges[2][1]+1} 层。`:'当前病例没有该段的源覆盖资料；换用下方已有标注的病例，或保留为文字专题。'}</p></details><div class="reference-links">${links(s.refs)}</div></div><div>${figureHTML}<p class="figure-caption">配图来自匿名病例的真实 CT 与源重建。彩色表示该重建的标注范围，来源病例与层号见图下注记。</p></div></div>
      <div class="compare-cases"><strong>换病例对照</strong>${candidates.length?candidates.map(c=>`<button data-compare-case="${c.id}" aria-pressed="${c.id===this.api.state().activeId}">${c.id}</button>`).join(''):'<span>病例库暂无独立源标注</span>'}</div>`;
    for(const b of $('segment-lesson').querySelectorAll('[data-compare-case]'))b.addEventListener('click',()=>this.choose(s.code,{caseId:b.dataset.compareCase}));
    $('lesson-candidate')?.addEventListener('click',()=>{$('segment-annotation-source').value='review';this.applyAnnotationMode();this.focus();this.syncLocation();$('imaging-anchor').scrollIntoView({behavior:'smooth'});});
    $('lesson-figure')?.addEventListener('click',async()=>{await this.choose(s.code,{caseId:figure.caseId});if(this.api.state().activeId!==figure.caseId||this.code!==s.code)return;this.api.setPlane('axial');this.api.changeSlice(figure.slice,true);$('imaging-anchor').scrollIntoView({behavior:'smooth'});});
    $('lesson-lesion')?.addEventListener('click',async()=>{if(this.api.state().activeId!==figure.caseId)await this.api.loadCase(figure.caseId);if(this.api.state().activeId!==figure.caseId)return;this.api.focusLesion();$('imaging-anchor').scrollIntoView({behavior:'smooth'});});
    this.renderTimeline();
  }
  renderTimeline(){
    const m=this.meta?.segments.find(s=>s.code===this.code),ct=this.api.state().caseData?.ct;
    $('segment-slice-strip').replaceChildren();if(!m||!ct)return;
    const max=Math.max(...m.sliceCounts),host=$('segment-slice-strip');
    for(let i=0;i<m.sliceCounts.length;i++){
      const b=document.createElement('button');b.style.setProperty('--bar-height',`${Math.max(4,m.sliceCounts[i]/max*100)}%`);b.style.setProperty('--segment-color',m.color);
      b.title=`轴位第 ${i+1} 层`;b.setAttribute('aria-label',b.title);b.dataset.atlasSlice=String(i);b.classList.toggle('empty',!m.sliceCounts[i]);
      b.addEventListener('click',()=>{this.stop();this.api.setPlane('axial');this.api.changeSlice(i,true);});host.append(b);
    }
  }
  focus(){
    const s=this.meta?.segments.find(s=>s.code===this.code);if(!s)return;
    this.stop();this.api.focusSegment(s);this.updateVisuals();this.api.redraw();
  }
  updateVisuals(){
    const state=this.api.state(),selected=this.meta?.segments.find(s=>s.code===this.code),byCode=new Map(this.sourceMeta?.segments.map(s=>[s.code,s])||[]);
    const enabled=$('segment-overlay').value!=='off',only=$('segment-only').checked;
    if(enabled)this.overlayMode=$('segment-overlay').value;
    $('ct-segment-overlay').checked=enabled;
    for(const {mesh,meta} of state.meshes.values()){
      if(meta.group!=='segment')continue;
      const s=byCode.get(parentSegment(meta.name)),active=s?.code===this.code;
      mesh.visible=enabled&&Boolean(s)&&(!only||active);mesh.material.color.set(s?.color||meta.color);
      mesh.material.opacity=active?.48:.1;mesh.material.emissive.set(active?(s?.color||meta.color):0x000000);mesh.material.emissiveIntensity=active?.06:0;
    }
    $('segment-opacity-value').textContent=`${$('segment-opacity').value}%`;
    $('ct-segment-labels').checked=$('segment-labels').checked;
    $('segment-focus').disabled=!selected;
    this.api.syncLayers();this.sliceKey=null;
  }
  draw(ctx,rect,obstacles=[]){
    if(!this.meta||!this.labels||!rect)return;
    const state=this.api.state(),{caseData,plane}=state,{width,height}=rect.spec;
    const key=`${this.meta.caseId}/${plane}/${rect.index}`;
    if(this.sliceKey!==key){
      this.bits=atlasSlice(this.labels,caseData.ct,plane,rect.index);this.sourceBits=this.reviewing?atlasSlice(this.sourceLabels,caseData.ct,plane,rect.index):this.bits;
      this.sliceInfo=annotateProvenance(summarizeSlice(this.bits,width,this.meta.segments),this.sourceBits);this.sliceKey=key;
      const shown=this.sliceInfo.filter(s=>!$('segment-only').checked||s.code===this.code);
      $('current-segments').hidden=!$('segment-labels').checked;
      $('current-segments').innerHTML=shown.length?shown.map(s=>`<button data-in-slice="${s.code}" data-candidate-pixels="${s.candidatePixels}" aria-pressed="${s.code===this.code}" title="${safe(fullSegmentName(s.code))} · 当前层 ${s.pixels} 个采样像素"><i style="background:${s.color}"></i>${s.code}<span>${safe(segmentByCode(s.code).name)}</span></button>`).join(''):`<p>${this.sliceInfo.length?'所选段在本层没有显示区域；取消“只看所选段”可查看本层其他段名。':this.reviewing?'本层没有肺段标注；请继续滑层，或在“五叶与缺项”中查看覆盖范围。':'本层没有原有肺段标注；可点击“显示新增肺段”查看。'}</p>`;
      for(const b of $('current-segments').querySelectorAll('[data-in-slice]'))b.addEventListener('click',()=>{
        const s=this.sliceInfo.find(s=>s.code===b.dataset.inSlice);this.code=s.code;$('segment-select').value=s.code;this.updateVisuals();this.renderNavigation();this.renderLesson();
        const point=planeToVoxel(...s.anchor,rect.index,plane,caseData.ct);this.api.pointTo(point,{...s,pointProvenance:this.reviewing&&!labelsAt(this.sourceLabels,point,caseData.ct)?'candidate':'source'});this.api.redraw();this.syncLocation();
      });
      $('current-segment-count').textContent=$('segment-labels').checked?`显示 ${shown.length} / 本层 ${this.sliceInfo.length} 组`:`本层 ${this.sliceInfo.length} 组 · 段名已隐藏`;
      for(const b of $('segment-slice-strip').children)b.classList.toggle('current',plane==='axial'&&Number(b.dataset.atlasSlice)===rect.index);
    }
    const selected=this.meta.segments.find(s=>s.code===this.code),mode=$('segment-overlay').value,only=$('segment-only').checked;
    this.canvas.width=width;this.canvas.height=height;
    const options={opacity:Number($('segment-opacity').value)/100,mode,selectedBit:selected?.bit||0,onlySelected:only};
    const rgba=this.reviewing?reviewOverlayRGBA(this.bits,this.sourceBits,width,this.meta.segments,options):overlayRGBA(this.bits,width,this.meta.segments,options);
    this.context.putImageData(new ImageData(rgba,width,height),0,0);
    ctx.save();ctx.beginPath();const ratio=ctx.getTransform().a;ctx.rect(0,0,ctx.canvas.width/ratio,ctx.canvas.height/ratio);ctx.clip();
    ctx.imageSmoothingEnabled=false;ctx.drawImage(this.canvas,rect.x,rect.y,rect.width,rect.height);
    if($('segment-labels').checked){
      ctx.font='600 12px system-ui, "PingFang SC", sans-serif';
      const items=this.sliceInfo.filter(s=>!only||s.code===this.code).map(s=>({...s,text:`${s.code} · ${segmentByCode(s.code).name.split('（')[0]}`}));
      const layout=layoutSegmentLabels(items,rect,{width:ctx.canvas.width/ratio,height:ctx.canvas.height/ratio},text=>ctx.measureText(text).width,obstacles);
      drawSegmentLabels(ctx,layout);
      $('slice-label-status').textContent=layout.unplaced.length?`本层全部 ${items.length} 个段名见下列清单；${layout.unplaced.length} 个图内标签因空间不足移至清单，可放大 CT 查看。`:this.reviewing?'段名与对应肺段区域相连 · 淡色覆盖保留CT细节':'中文段名与真实覆盖点相连 · 小截面同样保留';
    }else $('slice-label-status').textContent='图中段名和本层名词清单已隐藏，勾选“段名”即可恢复。';
    ctx.restore();
    this.pointInfo(state.voxel);
  }
  pointInfo(point){
    if(!this.labels)return;
    if(!$('segment-labels').checked){$('segment-point').textContent='定位点段名已隐藏';return;}
    const codes=codesAt(labelsAt(this.labels,point,this.api.state().caseData.ct),this.meta.segments);
    $('segment-point').textContent=codes.length===1?`定位点：${fullSegmentName(codes[0])}`:codes.length>1?`定位点：源边界重叠 ${codes.join(' / ')}`:'定位点：此处没有肺段标注';
  }
  pick(point){
    if(!this.labels)return;
    const codes=codesAt(labelsAt(this.labels,point,this.api.state().caseData.ct),this.meta.segments);
    if(codes.length===1){this.code=codes[0];this.updateVisuals();this.renderNavigation();this.renderLesson();this.syncLocation();}
    this.pointInfo(point);
    return codes.length===1?{...this.meta.segments.find(s=>s.code===codes[0]),pointProvenance:this.reviewing&&!labelsAt(this.sourceLabels,point,this.api.state().caseData.ct)?'candidate':'source'}:null;
  }
  selectSource(name){const code=parentSegment(name);if(!code||!segmentByCode(code))return;const changed=this.code!==code;this.code=code;this.renderNavigation();this.renderLesson();this.updateVisuals();if(changed)this.syncLocation();}
  syncLocation(){
    if(!this.api.state().activeId)return;
    try{const url=new URL(location.href);url.searchParams.set('segment',this.code);url.searchParams.set('annotations',this.reviewing?'review':'source');url.hash=this.api.state().activeId;history.replaceState(null,'',url);}catch{}
  }
  jump(where){
    const s=this.meta?.segments.find(s=>s.code===this.code);if(!s)return;
    this.stop();const axis=planeSpec(this.api.state().plane,this.api.state().caseData.ct).axis;
    this.api.changeSlice(where==='first'?s.ranges[axis][0]:where==='last'?s.ranges[axis][1]:s.peaks[axis],true);
  }
  play(){
    const state=this.api.state();if(!this.labels||!state.volume)return;
    this.stop();const axis=planeSpec(state.plane,state.caseData.ct).axis,total=state.caseData.ct.dimensions[axis],range=$('segment-range-only').checked?segmentSliceRange(this.meta,this.code,axis,total):[0,total-1];
    const interval=1000/Number($('cine-speed').value),forward=$('cine-direction').value==='forward';
    this.timer=setInterval(()=>{
      const current=Math.round(this.api.state().voxel[axis]);
      const next=forward?(current<range[0]||current>=range[1]?range[0]:current+1):(current>range[1]||current<=range[0]?range[1]:current-1);
      this.api.changeSlice(next,true);
    },interval);
    $('segment-cine').textContent='Ⅱ 暂停';$('segment-cine').setAttribute('aria-pressed','true');
  }
  stop(){clearInterval(this.timer);this.timer=null;$('segment-cine').textContent='▶ 连续播放';$('segment-cine').setAttribute('aria-pressed','false');}
  showSources(){
    $('segment-source-content').innerHTML=`<p class="eyebrow">ANATOMY & SOURCE MATERIAL</p><h2>教程依据与资料清单</h2><p>教程为原创建构；病例图、逐层覆盖与三维来自您提供的匿名病例。通用解剖命名和变异提醒参考下列可读取资料，未复制这些文献的外部配图。</p><ol class="source-list">${Object.values(REFERENCES).map(r=>`<li><a href="${r.url}" target="_blank" rel="noreferrer">${safe(r.title)}</a><p>${r.note}</p></li>`).join('')}</ol><h3>您提供的 12 篇微信资料</h3><p>截至 2026-09-12，读取请求未取得正文，直接访问出现微信环境验证。本版仅保留链接，没有把未读内容写成已核实依据。收到正文或导出文件后可逐篇补充对应章节。</p><ol class="source-list">${WECHAT_URLS.map((url,i)=>`<li><a href="${url}" target="_blank" rel="noreferrer">用户提供文章 ${String(i+1).padStart(2,'0')}</a><small>正文未取得 · 题名待核实</small></li>`).join('')}</ol><h3>本版的病例映射</h3><p>覆盖 15 个真实病例的 210 个肺段／亚段源网格，汇总为 18 组左右侧肺段标签。这是现有资料的覆盖数，不是规定正常人只有 18 个肺段。另设 LS7／S7+8 命名专题，不生成未提供的病例标签。</p><p>源CT和三维几何保持不变；源覆盖按闭合网格与CT体素中心计算，原有边界重叠保留。新增区域由本例支气管与肺叶重建计算生成，并于2026年9月13日由作者确认。原有与新增区域统一采用淡色显示；作者审核记录与合并前模型数值分别保存。</p>`;
    $('segment-source-dialog').showModal();
  }
}
