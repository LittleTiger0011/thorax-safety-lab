import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {DetailCamera,DETAIL_ZOOM_LIMITS,visibleModelFrame} from './case-library-camera.js';
import {SegmentCourse} from './segment-course.js';
import {ReconstructionControls} from './reconstruction-controls.js';
import {isLungSurface,setSurfaceMaterial} from './reconstruction-materials.js';
import {fullSegmentName} from './segment-course-data.js';
import {LesionOverlay,contourDisplayGeometry} from './lesion-contours.js';
import {clamp,voxelToLPS,lpsToVoxel,planeSpec,planeToVoxel,voxelToPlane,huAt,sliceRGBA,
  decodeVolume,trianglePlaneSegments,fetchJSON,fetchGzip} from './case-library-core.js';

const $=id=>document.getElementById(id),fmt=n=>new Intl.NumberFormat('zh-CN').format(n);
const preferCtFirst=()=>{
  try{
    const ua=navigator.userAgent||'';
    if(/MicroMessenger|QQ\//i.test(ua))return true;
    const touch=(navigator.maxTouchPoints||0)>0;
    const narrow=typeof matchMedia==='function'&&matchMedia('(max-width:700px)').matches;
    return touch&&narrow;
  }catch{}
  return false;
};
function setModelEmpty(text,opts={}){
  const box=$('model-empty'),label=$('model-empty-text'),btn=$('load-model-btn');
  if(!box)return;
  box.hidden=false;
  if(label)label.textContent=text;
  else box.textContent=text;
  box.classList.toggle('interactive',Boolean(opts.action||opts.busy));
  if(btn){
    btn.hidden=!opts.action&&!opts.busy;
    btn.disabled=Boolean(opts.busy);
    btn.textContent=opts.busy?text:opts.action||'加载三维重建';
  }
}
function hideModelEmpty(){
  const box=$('model-empty'),btn=$('load-model-btn');
  if(box){box.hidden=true;box.classList.remove('interactive');}
  if(btn){btn.hidden=true;btn.disabled=false;}
}
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const GROUPS={nodule:'结节标注',artery:'肺动脉',vein:'肺静脉',airway:'支气管',lobe:'肺叶',segment:'肺段 / 亚段',planning:'源规划标注',annotation:'其他源标注 · 待核对'};
const GROUP_COLORS={nodule:'#ffc857',artery:'#e55361',vein:'#4d98ec',airway:'#edddba',lobe:'#91b8ba',segment:'#7fc8b4',planning:'#b697f5',annotation:'#cc9be5'};
const PRESETS={lung:[-600,1500],mediastinum:[40,400],bone:[400,1800]};
let catalog,activeId,abortController,loadEpoch=0,caseData=null,volume=null,selectedId=null,voxel=[0,0,0];
let plane='axial',windowCenter=-600,windowWidth=1500,zoom=1,measureMode=false,measurePoints=[],ctRect=null;
let dirty=true,ctCache=null,contourCache=null,webglError=null;
let study=null,ctPan=[0,0],ctPanMode=false,ctGesture=null,suppressCTClick=false;
let reconstruction=null;
let loadingDetail=false,detailFraming='overview';
const meshes=new Map(),ctCanvas=$('real-ct'),ctContext=ctCanvas.getContext('2d');
const sliceCanvas=document.createElement('canvas'),sliceContext=sliceCanvas.getContext('2d');
const lesionOverlay=new LesionOverlay();
const scene=new THREE.Scene(),anatomy=new THREE.Group();scene.add(anatomy);
const hemisphere=new THREE.HemisphereLight(0xc6e6f6,0x243647,2.1);scene.add(hemisphere);
const keyLight=new THREE.DirectionalLight(0xfff0d8,3.1),fillLight=new THREE.DirectionalLight(0x94c7ed,1.8),rimLight=new THREE.DirectionalLight(0xc6ffe9,1.4);
for(const light of [keyLight,fillLight,rimLight]){scene.add(light);scene.add(light.target);}
const cursor=new THREE.Mesh(new THREE.SphereGeometry(1.15,16,12),new THREE.MeshBasicMaterial({color:0x9ff7df,depthTest:false}));
cursor.renderOrder=10;cursor.visible=false;scene.add(cursor);
const ctTexture=new THREE.CanvasTexture(sliceCanvas);ctTexture.colorSpace=THREE.SRGBColorSpace;
const planeGeometry=new THREE.BufferGeometry();planeGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(12),3));
planeGeometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array([0,1,1,1,1,0,0,0]),2));planeGeometry.setIndex([0,1,2,0,2,3]);
const imagePlane=new THREE.Mesh(planeGeometry,new THREE.MeshBasicMaterial({map:ctTexture,transparent:true,opacity:.46,side:THREE.DoubleSide,depthWrite:false}));
// The CT slab belongs to panel 02; it must not cover the local anatomy in 03.
imagePlane.layers.set(1);imagePlane.visible=false;imagePlane.renderOrder=3;scene.add(imagePlane);
let view3D,viewDetail,detailCamera,viewsReady=false;
function createView(canvas,fov){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;
  const camera=new THREE.PerspectiveCamera(fov,1,.1,5000);camera.up.set(0,0,1);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=5;controls.maxDistance=1600;
  controls.addEventListener('change',()=>{dirty=true;});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();showStatus('三维显示暂时中断，请重新载入病例。CT 仍可浏览。',true);});
  canvas.addEventListener('webglcontextrestored',()=>loadCase(activeId));
  return {renderer,camera,controls,canvas};
}
function ensureViews(){
  if(viewsReady)return Boolean(view3D||viewDetail);
  viewsReady=true;
  try {
    view3D=createView($('real-model'),34);
    view3D?.camera.layers.enable(1);
    if(!preferCtFirst()){
      viewDetail=createView($('real-detail'),40);
      if(viewDetail)detailCamera=new DetailCamera(viewDetail,updateDetailUI);
      else updateDetailUI();
    } else updateDetailUI();
  } catch(error) {
    webglError=error;setModelEmpty('此设备无法启用三维显示；真实 CT 可继续浏览。');
    updateDetailUI();
  }
  return Boolean(view3D||viewDetail);
}

function updateDetailUI(controller=detailCamera){
  const ready=Boolean(controller?.ready),rawPercent=controller?.percent||100,percent=rawPercent<10?Number(rawPercent.toFixed(1)):Math.round(rawPercent),mode=controller?.mode||'rotate';
  for(const control of document.querySelectorAll('.detail-tools button,.detail-tools select,.detail-tools input,.detail-nudge button'))control.disabled=!ready;
  $('detail-zoom').min=String(DETAIL_ZOOM_LIMITS.min);$('detail-zoom').max=String(DETAIL_ZOOM_LIMITS.max);
  $('detail-zoom').value=String(clamp(rawPercent,DETAIL_ZOOM_LIMITS.min,DETAIL_ZOOM_LIMITS.max));$('detail-zoom').setAttribute('aria-valuetext',`${percent}%`);
  $('detail-zoom-value').textContent=`${percent}%`;$('detail-zoom-badge').textContent=`${percent}%`;
  $('detail-zoom-reference').textContent=`1%—800% · 100% 为${detailFraming==='overview'?'完整模型':'所选结构'}适配`;
  $('detail-zoom-out').disabled=!ready||rawPercent<=DETAIL_ZOOM_LIMITS.min+1e-6;$('detail-zoom-in').disabled=!ready||rawPercent>=DETAIL_ZOOM_LIMITS.max-1e-6;
  $('focus-selection').disabled=!ready||!selectedId;$('focus-target').disabled=!ready||!caseData?.targets.length;
  $('target-select').disabled=!ready||!caseData?.targets.length;
  for(const b of document.querySelectorAll('[data-detail-mode]'))b.setAttribute('aria-pressed',String(b.dataset.detailMode===mode));
  document.querySelector('.detail-stage').dataset.dragMode=mode;
  $('detail-drag-hint').textContent=mode==='pan'?'拖动移动 · 滚轮缩放':'拖动旋转 · 滚轮缩放';
  renderDetailLayers();
  dirty=true;
}
updateDetailUI();

function renderDetailLayers(){
  for(const control of document.querySelectorAll('[data-detail-group]')){
    const group=control.dataset.detailGroup,members=[...meshes.values()].filter(({meta})=>meta.group===group);
    const count=members.filter(({mesh})=>mesh.visible).length,ready=Boolean(caseData&&meshes.size);
    control.disabled=!ready||!members.length;
    control.checked=members.length>0&&count===members.length;
    control.indeterminate=count>0&&count<members.length;
    const state=!ready?'等待模型':!members.length?'本例无此结构':control.indeterminate?'部分显示':control.checked?'已显示':'已隐藏';
    control.closest('label').dataset.state=control.disabled?'unavailable':control.indeterminate?'partial':control.checked?'shown':'hidden';
    document.querySelector(`[data-detail-group-state="${group}"]`).textContent=state;
  }
}

function showStatus(message,error=false){$('load-status').textContent=message;$('case-message').classList.toggle('error',error);$('retry-load').hidden=!error;}
function invalidateCT(){renderCT();dirty=true;}
function resize(){
  const ratio=Math.min(devicePixelRatio||1,2),box=ctCanvas.getBoundingClientRect();
  if(box.width&&box.height){ctCanvas.width=Math.round(box.width*ratio);ctCanvas.height=Math.round(box.height*ratio);ctContext.setTransform(ratio,0,0,ratio,0,0);}
  for(const view of [view3D,viewDetail])if(view){const b=view.canvas.getBoundingClientRect();if(b.width&&b.height){view.renderer.setSize(b.width,b.height,false);view.camera.aspect=b.width/b.height;view.camera.updateProjectionMatrix();}}
  detailCamera?.resize();renderCT();dirty=true;
}
const observer=new ResizeObserver(resize);for(const el of document.querySelectorAll('.ct-stage,.model-stage,.detail-stage'))observer.observe(el);
function animate(){requestAnimationFrame(animate);if(document.hidden)return;for(const v of [view3D,viewDetail])v?.controls.update();if(dirty){for(const v of [view3D,viewDetail])if(v)v.renderer.render(scene,v.camera);dirty=false;}}
animate();

function populateCaseFilter(){
  const select=$('case-filter'),current=select.value,options=[['all',`全部病例（${catalog.caseCount}）`]];
  if(catalog.latestCaseIds?.length)options.push(['new',`本次新增（${catalog.latestCaseIds.length}）`]);
  const regions=new Set(catalog.cases.map(c=>c.title.replace(/结节$/,'')));
  for(const region of ['双肺','右肺','左肺','右上叶','右中叶','右下叶','左上叶','左下叶'])if(regions.has(region))options.push([region,region]);
  select.replaceChildren();for(const [value,label] of options){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
  select.value=options.some(o=>o[0]===current)?current:'all';
}
function renderCatalog(){
  if(!catalog)return;
  const filter=$('case-filter').value,list=$('case-list'),latest=new Set(catalog.latestCaseIds||[]);list.replaceChildren();
  for(const c of catalog.cases.filter(c=>filter==='all'||(filter==='new'?latest.has(c.id):c.title.includes(filter)))){
    const card=document.createElement('button');card.className='case-card';card.dataset.id=c.id;card.setAttribute('aria-current',String(c.id===activeId));card.setAttribute('role','listitem');
    const marked=`./real-cases/${escapeHTML(c.preview)}`,unmarked=marked.replace(/\.webp$/,'-unmarked.webp');
    card.innerHTML=`<img src="${$('show-lesion-outline').checked?marked:unmarked}" data-lesion-marked="${marked}" data-lesion-unmarked="${unmarked}" alt="" loading="lazy"><span><small>${escapeHTML(c.id)}${latest.has(c.id)?' <span class="case-new-badge">新增</span>':''}</small><strong>${escapeHTML(c.title)}</strong><span class="card-slices">${c.slices} 层 · ${c.structures} 个结构</span></span>`;
    card.addEventListener('click',()=>loadCase(c.id));list.append(card);
  }
  if(!list.childElementCount){const p=document.createElement('p');p.textContent='暂无该部位病例';list.append(p);}
}

function clearGeometry(){
  reconstruction?.unbind();
  for(const {mesh} of meshes.values()){anatomy.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}meshes.clear();
  renderDetailLayers();
  imagePlane.visible=false;cursor.visible=false;detailCamera?.clear();$('detail-focus-label').textContent='正在准备观察目标';dirty=true;
}
async function loadCase(id){
  if(!catalog?.cases.some(c=>c.id===id))return;
  const epoch=++loadEpoch;abortController?.abort();abortController=new AbortController();const signal=abortController.signal;
  loadingDetail=true;detailFraming='overview';
  study?.beforeLoad();
  activeId=id;caseData=null;volume=null;selectedId=null;clearGeometry();ctCache=null;contourCache=null;measurePoints=[];ctPan=[0,0];
  renderCatalog();$('structure-groups').replaceChildren();$('target-select').replaceChildren();$('structure-count').textContent='';
  if(!$('case-list').querySelector(`[data-id="${id}"]`)){$('case-filter').value='all';renderCatalog();}
  $('selection-title').textContent='正在载入';$('selection-position').textContent='';$('selection-dot').style.background='#617a87';
  $('ct-empty').hidden=false;$('ct-empty').textContent='正在载入真实 CT…';
  setModelEmpty(webglError?'此设备无法启用三维显示；真实 CT 可继续浏览。':'先载入真实 CT，三维稍后准备');
  const entry=catalog.cases.find(c=>c.id===id);$('case-title').textContent=`${id} · ${entry.title}`;
  $('case-kicker').textContent='REAL CT / PATIENT-SPECIFIC RECONSTRUCTION';
  $('case-metadata').textContent=`${entry.slices} 层真实 CT · ${entry.structures} 个源重建结构 · 按需载入 ${(entry.downloadBytes/1e6).toFixed(1)} MB`;
  $('ct-preview').dataset.lesionMarked=`./real-cases/${entry.preview}`;$('ct-preview').dataset.lesionUnmarked=`./real-cases/${entry.preview.replace(/\.webp$/,'-unmarked.webp')}`;
  syncLesionVisibility();$('ct-preview').hidden=false;
  showStatus(`正在读取 ${id} 病例资料…`);renderCT();
  try {
    const m=await fetchJSON(`./real-cases/${entry.manifest}`,signal);if(epoch!==loadEpoch)return;
    if(m.schemaVersion!==1||m.id!==id||m.coordinateSystem!=='DICOM LPS millimeters')throw new Error('病例格式或空间定义不受支持');
    caseData=m;voxel=m.ct.dimensions.map(n=>(n-1)/2);voxel[2]=m.ct.initialSlice;plane='axial';zoom=1;
    setPlaneButtons();setWindow('lung');$('ct-resolution').textContent=`${m.ct.dimensions[0]} × ${m.ct.dimensions[1]} · 像素 ${m.ct.spacing[0].toFixed(2)} mm · 层间距 ${m.ct.spacing[2].toFixed(2)} mm`;
    $('case-metadata').textContent=`${entry.slices} 层真实 CT · ${entry.structures} 个源重建结构 · ${fmt(m.geometry.triangles)} 个三角面`;
    const phone=preferCtFirst();
    let ctProgress=0,modelProgress=0,geomBuffer=null,geometryApplied=false;
    const ctMeta=phone?{...m.ct,skipIntegrity:true}:m.ct;
    const geomMeta=phone?{...m.geometry,skipIntegrity:true}:m.geometry;
    const progress=()=>{
      if(epoch!==loadEpoch)return;
      showStatus(`载入真实资料：CT ${Math.round(ctProgress*100)}%`+(phone?'':` · 三维重建 ${Math.round(modelProgress*100)}%`));
      if(!volume)$('ct-empty').textContent=`正在载入真实 CT ${Math.round(ctProgress*100)}%`;
      if(phone&&!geometryApplied)setModelEmpty(`真实 CT ${Math.round(ctProgress*100)}%。三维需单独加载。`);
    };
    const base=`./real-cases/${id}/`;
    const applyGeometry=buffer=>{
      if(epoch!==loadEpoch||geometryApplied)return;
      geometryApplied=true;
      setModelEmpty('正在生成三维网格…');
      buildGeometry(buffer,m);reconstruction?.bind(id,meshes);setupTargets();setDefaultLayers(false);
      ensureViews();
      if(!webglError){
        fitOverview('anterior');
        if(m.targets.length)focusTarget(0,false);else selectStructure(m.structures.find(s=>s.group==='airway')?.id,false);
        fitDetailOverview(true);
      } else if(m.targets.length)focusTarget(0,false);
      else selectStructure(m.structures.find(s=>s.group==='airway')?.id,false);
      if(webglError)setModelEmpty('此设备无法启用三维显示；真实 CT 可继续浏览。');
      else hideModelEmpty();
      renderLayers();dirty=true;
    };
    const ctTask=fetchGzip(base+m.ct.asset,ctMeta,signal,(n,total)=>{ctProgress=n/total;progress();}).then(buffer=>{
      if(epoch!==loadEpoch)return;volume=decodeVolume(buffer,m.ct);$('ct-empty').hidden=true;$('ct-preview').hidden=true;invalidateCT();
      document.querySelector('.ct-panel')?.scrollIntoView({block:'nearest',inline:'nearest'});
      if(geomBuffer)applyGeometry(geomBuffer);
    });
    const startModel=()=>fetchGzip(base+m.geometry.asset,geomMeta,signal,(n,total)=>{modelProgress=n/total;progress();if(phone)setModelEmpty(`正在载入三维 ${Math.round(modelProgress*100)}%`,{busy:true});}).then(buffer=>{
      if(epoch!==loadEpoch)return;geomBuffer=buffer;if(volume)applyGeometry(buffer);
    }).catch(error=>{
      if(epoch!==loadEpoch||error.name==='AbortError')return;
      setModelEmpty('三维重建暂不可用，CT 仍可阅片。');
    });
    await ctTask;
    if(epoch!==loadEpoch)return;
    if(!volume)throw new Error('CT 载入未完成，请重试');
    showStatus('真实 CT 已载入');
    if(phone){
      setModelEmpty('真实 CT 已可阅片。三维网格较大，手机上请点按钮加载。',{action:'加载三维重建'});
      const btn=$('load-model-btn');
      if(btn)btn.onclick=()=>{if(epoch!==loadEpoch)return;setModelEmpty('正在载入三维…',{busy:true});startModel();};
    } else {
      setModelEmpty('正在载入重建模型');
      await startModel();
    }
    if(epoch!==loadEpoch)return;
    const ratio=m.validation.verticesWithinCTExtentFraction;
    $('alignment-note').textContent=`已核对 CT 序列引用与源模型坐标；${(ratio*100).toFixed(2)}% 网格顶点落在 CT 范围内。肺段标注的作者审核已记录。`;
    if(!phone||geometryApplied)showStatus(webglError||!geometryApplied?'真实 CT 已载入；此设备三维显示不可用。':'真实 CT 与三维重建已载入 · 点击模型可定位 CT · 细小分支几何已保留',Boolean(webglError||(!phone&&!geometryApplied)));
    $('selection-title').textContent=meshes.get(selectedId)?.meta.name||'尚未选择';
    updatePointDisplay();resize();
    await study?.loadCase(m,signal);
    if(epoch!==loadEpoch)return;
    loadingDetail=false;
    if(detailFraming==='overview'&&m.targets.length&&geometryApplied)focusTarget(0,false);
    if(detailFraming==='overview'&&detailCamera?.ready&&Math.abs(detailCamera.percent-100)<.1&&detailCamera.view.controls.target.distanceTo(detailCamera.anchor)<.01)fitDetailOverview();
    try{history.replaceState(null,'',`#${id}`);}catch{}
  }catch(error){if(epoch!==loadEpoch||error.name==='AbortError')return;loadingDetail=false;showStatus(error.message||'病例载入失败',true);$('ct-empty').textContent=volume?'':'CT 载入未完成，请点「重新载入」或换 Safari / Chrome 打开';$('ct-empty').hidden=Boolean(volume);}
}

function buildGeometry(buffer,m){
  for(const s of m.structures){
    const position=new Float32Array(buffer,s.positionsByteOffset,s.vertexCount*3);
    const indices=s.indexType==='uint16'?new Uint16Array(buffer,s.indicesByteOffset,s.triangleCount*3):new Uint32Array(buffer,s.indicesByteOffset,s.triangleCount*3);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(position,3));geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.computeBoundingBox();
    const translucent=['lobe','segment','planning','annotation'].includes(s.group);
    const material=new THREE.MeshStandardMaterial({color:s.color,roughness:s.group==='airway'?.55:.42,metalness:.025,transparent:translucent,opacity:translucent?.09:1,depthWrite:!translucent,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geometry,material);mesh.name=s.id;mesh.userData=s;mesh.renderOrder=translucent?2:0;anatomy.add(mesh);
    const voxelPositions=new Float32Array(position.length);
    for(let i=0;i<position.length;i+=3)voxelPositions.set(lpsToVoxel([position[i],position[i+1],position[i+2]],m.ct),i);
    meshes.set(s.id,{mesh,meta:s,indices,voxelPositions});
  }
  const box=new THREE.Box3().setFromObject(anatomy),center=box.getCenter(new THREE.Vector3());
  [keyLight,fillLight,rimLight].forEach((l,i)=>{const offsets=[[150,-330,450],[-230,-80,100],[70,320,180]];l.position.copy(center).add(new THREE.Vector3(...offsets[i]));l.target.position.copy(center);});
}
function fitOverview(direction='anterior'){
  if(!view3D||!meshes.size)return;
  const box=new THREE.Box3();for(const {mesh,meta} of meshes.values())if(!['planning','annotation'].includes(meta.group))box.union(mesh.geometry.boundingBox);
  const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  const aspect=Math.max(.3,view3D.camera.aspect),distance=Math.max(size.z,size.x/aspect,size.y/aspect)*.62/Math.tan(THREE.MathUtils.degToRad(view3D.camera.fov/2));
  const offsets={anterior:[0,-1,.04],posterior:[0,1,.04],right:[-1,0,.04],left:[1,0,.04]};
  view3D.camera.position.copy(center).add(new THREE.Vector3(...offsets[direction]).multiplyScalar(distance));
  view3D.camera.near=Math.max(.1,distance/1000);view3D.camera.far=5000;view3D.camera.updateProjectionMatrix();
  view3D.controls.target.copy(center);view3D.controls.update();
  for(const b of document.querySelectorAll('[data-camera]'))b.setAttribute('aria-pressed',String(b.dataset.camera===direction));dirty=true;
}
function focusLocal(center,bounds,label){
  detailFraming='local';
  if(!detailCamera||!caseData)return;
  const middle=voxelToLPS(caseData.ct.dimensions.map(n=>(n-1)/2),caseData.ct),side=center[0]<middle[0]?-1:1;
  detailCamera.focus(center,bounds,[side*.8,-1,.35]);
  $('detail-focus-label').textContent=`${activeId} · ${label||meshes.get(selectedId)?.meta.name||'当前选中点'}`;dirty=true;
}
function fitDetailOverview(resetDirection=false){
  detailFraming='overview';
  if(!detailCamera||!caseData)return;
  const frame=visibleModelFrame(meshes.values());
  if(!frame){$('detail-focus-label').textContent=`${activeId} · 当前没有可见结构`;return;}
  detailCamera.focus(frame.center,frame.bounds,[0,-1,.06],{preserveDirection:!resetDirection&&detailCamera.ready});
  $('detail-focus-label').textContent=`${activeId} · 可见模型全景`;dirty=true;
}
function setDefaultLayers(resetAppearance=true){
  if(resetAppearance)reconstruction?.reset();
  $('lobe-opacity').value='9';$('opacity-label').textContent='9%';
  for(const {mesh,meta} of meshes.values())setSurfaceMaterial(mesh,{color:isLungSurface(meta)?meta.sourceColor||meta.color:meta.color,visible:!['segment','planning','annotation'].includes(meta.group),opacity:meta.group==='lobe'?.09:meta.group==='segment'?.19:meta.group==='planning'?.12:meta.group==='annotation'?.18:1});
  reconstruction?.apply();
  $('show-ct-plane').checked=true;imagePlane.visible=Boolean(volume);dirty=true;
}
function selectStructure(id,locate=false,point=null){
  if(!meshes.has(id))return;
  selectedId=id;const selected=meshes.get(id);selected.mesh.visible=true;
  if(locate)reconstruction?.reveal(id);
  if(selected.meta.group==='segment')study?.selectSource(selected.meta.name);
  for(const {mesh,meta} of meshes.values()){mesh.material.emissive.set(meta.id===id?mesh.material.color:0x000000);mesh.material.emissiveIntensity=meta.id===id?.2:0;}
  $('selection-title').textContent=selected.meta.name;$('selection-dot').style.background=selected.meta.color;
  if(locate){
    const target=selected.meta.components?.[0];setPoint(point||target?.center||selected.meta.center);focusLocal(point||target?.center||selected.meta.center,target?.bounds||selected.meta.bounds);
  }
  renderLayerSelection();updateDetailUI();contourCache=null;renderCT();updatePointDisplay();dirty=true;
}
function focusStructure(id){if(id)selectStructure(id,true);}
function setupTargets(){
  const select=$('target-select');select.replaceChildren();
  caseData.targets.forEach((target,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=`结节图层 · 标注区域 ${String(i+1).padStart(2,'0')}`;select.append(option);});
  if(!caseData.targets.length){const o=document.createElement('option');o.textContent='此病例未提供结节标注';select.append(o);}
}
function focusTarget(index=Number($('target-select').value),showDetail=true){
  if(!caseData)return;const target=caseData.targets[index];if(!target)return;
  $('target-select').value=String(index);selectStructure(target.structureId,false);setPoint(target.center);if(showDetail)focusLocal(target.center,target.bounds,`结节标注 · 区域 ${String(index+1).padStart(2,'0')}`);dirty=true;
}
function setPoint(p){
  if(!caseData)return;
  voxel=lpsToVoxel(p,caseData.ct).map((v,i)=>clamp(v,0,caseData.ct.dimensions[i]-1));
  cursor.position.fromArray(voxelToLPS(voxel,caseData.ct));cursor.visible=true;measurePoints=[];invalidateCT();updatePointDisplay();dirty=true;
}
function updatePointDisplay(){
  if(!caseData)return;
  const point=voxelToLPS(voxel,caseData.ct),value=volume?huAt(volume,voxel,caseData.ct):null;
  const selected=meshes.get(selectedId)?.meta;
  $('selection-position').textContent=`LPS (${point.map(n=>n.toFixed(1)).join(', ')}) mm${value===null?'':` · 当前采样 ${value} HU`}${selected?.note?` · ${selected.note}`:selected?.name==='切缘球'?' · 仅为源规划标注':''}`;
  $('ct-value').textContent=value===null?'':`${value} HU · 最近体素采样`;
}
function renderLayers(){
  const host=$('structure-groups');host.replaceChildren();$('structure-count').textContent=`/ ${meshes.size}`;
  for(const [group,title] of Object.entries(GROUPS)){
    const members=[...meshes.values()].filter(v=>v.meta.group===group);if(!members.length)continue;
    const details=document.createElement('details');details.className='structure-group';details.open=members.length<=2&&!['planning','annotation'].includes(group);
    const summary=document.createElement('summary');summary.innerHTML=`<i style="background:${GROUP_COLORS[group]}"></i>${title}<small>${members.length}</small>`;details.append(summary);
    const rows=document.createElement('div');rows.className='structure-rows';
    for(const {mesh,meta} of members){
      const row=document.createElement('div');row.className='structure-row';const check=document.createElement('input');check.type='checkbox';check.checked=mesh.visible;check.dataset.visibility=meta.id;check.setAttribute('aria-label',`显示${meta.name}`);
      check.addEventListener('change',()=>{mesh.visible=check.checked;if(isLungSurface(meta))reconstruction?.setVisibility(meta.id,check.checked);renderLayerSelection();dirty=true;contourCache=null;renderCT();});
      const button=document.createElement('button');button.dataset.structure=meta.id;button.setAttribute('aria-pressed',String(selectedId===meta.id));button.innerHTML=`<i style="background:${meta.color}"></i>${escapeHTML(meta.name)}`;
      button.addEventListener('click',()=>focusStructure(meta.id));row.append(check,button);rows.append(row);
    }
    details.append(rows);host.append(details);
  }
  renderLayerSelection();
}
function renderLayerSelection(){
  reconstruction?.apply();
  for(const b of document.querySelectorAll('[data-structure]'))b.setAttribute('aria-pressed',String(b.dataset.structure===selectedId));
  for(const check of document.querySelectorAll('[data-visibility]'))check.checked=Boolean(meshes.get(check.dataset.visibility)?.mesh.visible);
  for(const b of document.querySelectorAll('[data-structure]')){const item=meshes.get(b.dataset.structure);if(item)b.querySelector('i').style.background=`#${item.mesh.material.color.getHexString()}`;}
  const selected=meshes.get(selectedId);if(selected)$('selection-dot').style.background=`#${selected.mesh.material.color.getHexString()}`;
  const lobes=[...meshes.values()].filter(v=>v.meta.group==='lobe'),opacity=lobes[0]?.mesh.material.opacity;
  if(lobes.length){const same=lobes.every(v=>Math.abs(v.mesh.material.opacity-opacity)<.001);$('opacity-label').textContent=same?`${Math.round(opacity*100)}%`:'混合';if(same)$('lobe-opacity').value=String(Math.round(opacity*100));}
  renderDetailLayers();
}
function currentSlice(){return caseData?Math.round(voxel[planeSpec(plane,caseData.ct).axis]):0;}
function setPlaneButtons(){for(const b of document.querySelectorAll('[data-plane]'))b.setAttribute('aria-pressed',String(b.dataset.plane===plane));$('ct-plane-label').textContent={axial:'AXIAL',coronal:'CORONAL · MPR',sagittal:'SAGITTAL · MPR'}[plane];}
function changeSlice(delta,absolute=false){
  if(!caseData)return;const axis=planeSpec(plane,caseData.ct).axis;voxel[axis]=clamp(absolute?delta:Math.round(voxel[axis])+delta,0,caseData.ct.dimensions[axis]-1);
  cursor.position.fromArray(voxelToLPS(voxel,caseData.ct));cursor.visible=true;measurePoints=[];invalidateCT();updatePointDisplay();
}
function setWindow(preset){const pair=PRESETS[preset];if(pair){[windowCenter,windowWidth]=pair;$('window-center').value=String(windowCenter);$('window-width').value=String(windowWidth);$('window-preset').value=preset;}invalidateCT();}
function renderCT(){
  const box=ctCanvas.getBoundingClientRect(),w=box.width,h=box.height;if(!w||!h)return;
  ctContext.fillStyle='#03090e';ctContext.fillRect(0,0,w,h);ctRect=null;
  if(!caseData||!volume)return;
  const ct=caseData.ct,spec=planeSpec(plane,ct),index=currentSlice(),cacheKey=`${activeId}/${plane}/${index}/${windowCenter}/${windowWidth}`;
  $('real-slice').max=String(ct.dimensions[spec.axis]-1);$('real-slice').value=String(index);$('real-slice-label').textContent=`${index+1} / ${ct.dimensions[spec.axis]}`;
  if(ctCache!==cacheKey){
    sliceCanvas.width=spec.width;sliceCanvas.height=spec.height;
    sliceContext.putImageData(new ImageData(sliceRGBA(volume,plane,index,ct,windowCenter,windowWidth),spec.width,spec.height),0,0);ctCache=cacheKey;ctTexture.needsUpdate=true;
  }
  const scale=Math.min((w-30)/(spec.width*spec.sx),(h-44)/(spec.height*spec.sy))*zoom,iw=spec.width*spec.sx*scale,ih=spec.height*spec.sy*scale,x=(w-iw)/2+ctPan[0],y=(h-ih)/2+ctPan[1];
  ctRect={x,y,width:iw,height:ih,spec,index};ctContext.imageSmoothingEnabled=true;ctContext.drawImage(sliceCanvas,x,y,iw,ih);
  $('ct-zoom-value').textContent=`${Math.round(zoom*100)}%`;
  const lesionInput={key:`${activeId}/${loadEpoch}/${meshes.size}/${plane}/${index}`,meshes:meshes.values(),plane,index,ct};
  const lesionContours=lesionOverlay.getContours(lesionInput),display=contourDisplayGeometry(lesionContours.loops,ctRect);
  const avoidLesions=display.polygons.map(p=>{const xs=p.map(v=>v[0]),ys=p.map(v=>v[1]),gap=display.gap+display.lineWidth+3;return {x:Math.min(...xs)-gap,y:Math.min(...ys)-gap,width:Math.max(...xs)-Math.min(...xs)+2*gap,height:Math.max(...ys)-Math.min(...ys)+2*gap};});
  study?.draw(ctContext,ctRect,avoidLesions);
  const toCanvas=v=>{const p=voxelToPlane(v,plane,ct);return [x+(p[0]+.5)/spec.width*iw,y+(p[1]+.5)/spec.height*ih];};
  if($('show-contour').checked&&selectedId&&meshes.get(selectedId)?.mesh.visible&&!['nodule','segment'].includes(meshes.get(selectedId).meta.group)){
    const selected=meshes.get(selectedId),key=`${activeId}/${selectedId}/${plane}/${index}`;
    if(contourCache?.key!==key)contourCache={key,lines:trianglePlaneSegments(selected.voxelPositions,selected.indices,spec.axis,index)};
    ctContext.save();ctContext.strokeStyle=selected.meta.color;ctContext.globalAlpha=.92;ctContext.lineWidth=1.15;ctContext.beginPath();
    for(const line of contourCache.lines){const a=toCanvas(line[0]),b=toCanvas(line[1]);ctContext.moveTo(...a);ctContext.lineTo(...b);}ctContext.stroke();ctContext.restore();
  }
  const [cx,cy]=toCanvas(voxel);ctContext.save();ctContext.strokeStyle='#87e5ca';ctContext.globalAlpha=.68;ctContext.lineWidth=.8;ctContext.setLineDash([3,4]);ctContext.beginPath();
  ctContext.moveTo(x,cy);ctContext.lineTo(cx-6,cy);ctContext.moveTo(cx+6,cy);ctContext.lineTo(x+iw,cy);ctContext.moveTo(cx,y);ctContext.lineTo(cx,cy-6);ctContext.moveTo(cx,cy+6);ctContext.lineTo(cx,y+ih);ctContext.stroke();ctContext.restore();
  $('locate-lesion').disabled=!caseData.targets.length;
  if($('show-lesion-outline').checked){
    const result=lesionOverlay.draw(ctContext,{...lesionInput,rect:ctRect,base:sliceCanvas});
    $('lesion-readout').textContent=result.loops.length?'红线与病灶间留白 · 圈内保留原始灰阶 · 定位参考':result.openChains?'本层源病灶轮廓不完整，请换层复核':'本层没有源病灶轮廓 · 可点“定位病灶”查看';
  }else $('lesion-readout').textContent='病灶外轮廓已隐藏';
  if(measurePoints.length){
    const points=measurePoints.map(toCanvas);ctContext.save();ctContext.fillStyle='#ffe2a2';ctContext.strokeStyle='#ffe2a2';ctContext.lineWidth=1.3;
    for(const p of points){ctContext.beginPath();ctContext.arc(...p,3,0,Math.PI*2);ctContext.fill();}
    if(points.length===2){ctContext.beginPath();ctContext.moveTo(...points[0]);ctContext.lineTo(...points[1]);ctContext.stroke();
      const a=voxelToLPS(measurePoints[0],ct),b=voxelToLPS(measurePoints[1],ct),length=Math.hypot(...a.map((v,i)=>v-b[i]));
      const label=`${length.toFixed(1)} mm`;ctContext.font='12px ui-monospace, monospace';const tx=clamp((points[0][0]+points[1][0])/2,8,w-90),ty=clamp((points[0][1]+points[1][1])/2-8,35,h-22);
      ctContext.fillStyle='#05111be8';ctContext.fillRect(tx-4,ty-14,ctContext.measureText(label).width+8,20);ctContext.fillStyle='#ffe2a2';ctContext.fillText(label,tx,ty);
    }ctContext.restore();
  }
  ctContext.font='11px ui-monospace, monospace';ctContext.fillStyle='#bbd4dd';ctContext.textAlign='center';ctContext.fillText(spec.labels[0],w/2,14);ctContext.fillText(spec.labels[1],w/2,h-7);ctContext.fillText(spec.labels[2],10,h/2);ctContext.fillText(spec.labels[3],w-10,h/2);ctContext.textAlign='start';
  updateImagePlane(spec,index);dirty=true;
}
function updateImagePlane(spec,index){
  if(!caseData)return;
  const corners=[[-.5,-.5],[spec.width-.5,-.5],[spec.width-.5,spec.height-.5],[-.5,spec.height-.5]];
  const attr=planeGeometry.getAttribute('position');corners.forEach((c,i)=>attr.setXYZ(i,...voxelToLPS(planeToVoxel(...c,index,plane,caseData.ct),caseData.ct)));
  attr.needsUpdate=true;planeGeometry.computeBoundingSphere();imagePlane.visible=$('show-ct-plane').checked;
}

ctCanvas.addEventListener('click',e=>{
  if(suppressCTClick){suppressCTClick=false;return;}
  if(!ctRect||!volume)return;const box=ctCanvas.getBoundingClientRect(),u=(e.clientX-box.left-ctRect.x)/ctRect.width*ctRect.spec.width-.5,v=(e.clientY-box.top-ctRect.y)/ctRect.height*ctRect.spec.height-.5;
  if(u<-.5||v<-.5||u>ctRect.spec.width-.5||v>ctRect.spec.height-.5)return;
  const point=planeToVoxel(clamp(u,0,ctRect.spec.width-1),clamp(v,0,ctRect.spec.height-1),ctRect.index,plane,caseData.ct);
  if(measureMode){if(measurePoints.length===2)measurePoints=[];measurePoints.push(point);renderCT();}
  else {const segment=study?.pick(point);if(segment)selectSegmentPoint(segment,point);else setPoint(voxelToLPS(point,caseData.ct));}
});
ctCanvas.addEventListener('wheel',e=>{if(!volume)return;e.preventDefault();study?.stop();if(e.ctrlKey||e.metaKey){zoom=clamp(zoom*(e.deltaY>0?.9:1.1),.05,6);renderCT();}else changeSlice(e.deltaY>0?-1:1);},{passive:false});
ctCanvas.addEventListener('pointerdown',e=>{suppressCTClick=false;if(!ctPanMode||e.button!==0)return;ctGesture={id:e.pointerId,x:e.clientX,y:e.clientY,start:[...ctPan]};ctCanvas.setPointerCapture(e.pointerId);});
ctCanvas.addEventListener('pointermove',e=>{if(ctGesture?.id!==e.pointerId)return;const dx=e.clientX-ctGesture.x,dy=e.clientY-ctGesture.y;if(Math.hypot(dx,dy)>4)suppressCTClick=true;ctPan=[ctGesture.start[0]+dx,ctGesture.start[1]+dy];renderCT();});
for(const event of ['pointerup','pointercancel'])ctCanvas.addEventListener(event,e=>{if(ctGesture?.id===e.pointerId){ctGesture=null;if(ctCanvas.hasPointerCapture(e.pointerId))ctCanvas.releasePointerCapture(e.pointerId);}});
$('ct-pan-mode').addEventListener('click',()=>{ctPanMode=!ctPanMode;$('ct-pan-mode').setAttribute('aria-pressed',String(ctPanMode));document.querySelector('.ct-panel').dataset.pan=String(ctPanMode);});
$('ct-zoom-out').addEventListener('click',()=>{zoom=clamp(zoom*.8,.05,6);renderCT();});
$('ct-zoom-in').addEventListener('click',()=>{zoom=clamp(zoom*1.25,.05,6);renderCT();});
function syncLesionVisibility(){
  const enabled=$('show-lesion-outline').checked;$('ct-lesion-outline').checked=enabled;
  for(const img of document.querySelectorAll('img[data-lesion-marked]'))img.src=enabled?img.dataset.lesionMarked:img.dataset.lesionUnmarked;
  for(const text of document.querySelectorAll('[data-figure-lesion-count]'))text.textContent=Number(text.dataset.figureLesionCount)?(enabled?'本层病灶以红色外轮廓提示':'病灶红圈已隐藏，可在上方独立开启'):'此肺段代表层未切到源病灶标注';
}
$('show-lesion-outline').addEventListener('change',()=>{syncLesionVisibility();renderCT();});
$('ct-lesion-outline').addEventListener('change',()=>{$('show-lesion-outline').checked=$('ct-lesion-outline').checked;syncLesionVisibility();renderCT();});
$('locate-lesion').addEventListener('click',()=>{study?.stop();focusTarget();});
ctCanvas.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();changeSlice(['ArrowUp','ArrowRight'].includes(e.key)?1:-1);}});
const raycaster=new THREE.Raycaster();
function hitInView(view,e){
  const rect=view.canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),view.camera);
  const hits=raycaster.intersectObjects(anatomy.children,false).filter(h=>h.object.visible&&h.object.material.opacity>.001);
  // A solid lung surface occludes structures behind it, including for picking.
  const opaque=hits.find(h=>h.object.material.opacity>=.999);
  const visibleHits=hits.filter(h=>!opaque||h.distance<=opaque.distance+.001);
  return visibleHits.find(h=>!['lobe','segment','planning','annotation'].includes(h.object.userData.group))||opaque||hits[0];
}
for(const view of [view3D,viewDetail])if(view){
  let gesture=null;const pointers=new Set();
  view.canvas.addEventListener('pointerdown',e=>{pointers.add(e.pointerId);gesture=pointers.size===1&&e.button===0?{id:e.pointerId,x:e.clientX,y:e.clientY,moved:false}:null;});
  view.canvas.addEventListener('pointermove',e=>{if(gesture?.id===e.pointerId&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>5)gesture.moved=true;});
  view.canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;});
  view.canvas.addEventListener('pointerup',e=>{
    pointers.delete(e.pointerId);const click=gesture;gesture=null;
    if(!caseData||!click||click.id!==e.pointerId||click.moved||Math.hypot(e.clientX-click.x,e.clientY-click.y)>5)return;
    const hit=hitInView(view,e);
    if(hit){selectStructure(hit.object.name,false);setPoint(hit.point.toArray());if(view===view3D)focusLocal(hit.point.toArray(),undefined,`${hit.object.userData.name} · 选中点`);}
  });
}
function centerDetail(onSelection=false){
  if(!caseData||!detailCamera?.ready)return;
  if(onSelection){detailCamera.centerOn(voxelToLPS(voxel,caseData.ct));$('detail-focus-label').textContent=`${activeId} · 选中点已居中`;}
  else{detailCamera.centerOn();$('detail-focus-label').textContent=`${activeId} · ${detailFraming==='overview'?'模型':'观察目标'}已居中`;}
}
viewDetail?.canvas.addEventListener('dblclick',e=>{
  if(!caseData||!detailCamera?.ready)return;const hit=hitInView(viewDetail,e);if(!hit)return;
  e.preventDefault();selectStructure(hit.object.name,false);setPoint(hit.point.toArray());centerDetail(true);
});
for(const b of document.querySelectorAll('[data-detail-mode]'))b.addEventListener('click',()=>detailCamera?.setMode(b.dataset.detailMode));
for(const b of document.querySelectorAll('[data-detail-pan]'))b.addEventListener('click',()=>{
  if(!viewDetail)return;const [dx,dy]=b.dataset.detailPan.split(',').map(Number),box=viewDetail.canvas.getBoundingClientRect(),step=Math.min(box.width,box.height)*.09;
  detailCamera?.panPixels(dx*step,dy*step,box.height);
});
$('detail-zoom-in').addEventListener('click',()=>detailCamera?.zoomBy(1.25));$('detail-zoom-out').addEventListener('click',()=>detailCamera?.zoomBy(.8));
$('detail-zoom').addEventListener('input',e=>detailCamera?.setPercent(Number(e.target.value)));
$('detail-center').addEventListener('click',()=>centerDetail());$('detail-fit').addEventListener('click',()=>fitDetailOverview());$('detail-reset').addEventListener('click',()=>fitDetailOverview(true));
viewDetail?.canvas.addEventListener('keydown',e=>{
  if(!detailCamera?.ready)return;const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(arrows[e.key]){e.preventDefault();const step=e.shiftKey?60:25;detailCamera.panPixels(arrows[e.key][0]*step,arrows[e.key][1]*step,viewDetail.canvas.getBoundingClientRect().height);}
  else if(['+','=','-','_','Home','0'].includes(e.key)){e.preventDefault();if(e.key==='Home')centerDetail();else if(e.key==='0')fitDetailOverview(true);else detailCamera.zoomBy(['+','='].includes(e.key)?1.25:.8);}
});
$('case-filter').addEventListener('change',renderCatalog);$('retry-load').addEventListener('click',()=>catalog?loadCase(activeId):location.reload());
$('real-slice').addEventListener('input',e=>{study?.stop();changeSlice(Number(e.target.value),true);});$('slice-prev').addEventListener('click',()=>{study?.stop();changeSlice(-1);});$('slice-next').addEventListener('click',()=>{study?.stop();changeSlice(1);});
function changePlane(next){study?.stop();plane=next;zoom=1;ctPan=[0,0];measurePoints=[];setPlaneButtons();invalidateCT();}
for(const b of document.querySelectorAll('[data-plane]'))b.addEventListener('click',()=>changePlane(b.dataset.plane));
for(const b of document.querySelectorAll('[data-camera]'))b.addEventListener('click',()=>fitOverview(b.dataset.camera));
$('window-preset').addEventListener('change',e=>setWindow(e.target.value));
for(const id of ['window-center','window-width'])$(id).addEventListener('change',()=>{
  windowCenter=clamp(Number($('window-center').value)||0,-1500,4000);windowWidth=clamp(Number($('window-width').value)||2,2,12000);
  $('window-center').value=String(windowCenter);$('window-width').value=String(windowWidth);$('window-preset').value='custom';invalidateCT();
});
$('show-contour').addEventListener('change',renderCT);$('show-ct-plane').addEventListener('change',()=>{imagePlane.visible=Boolean(volume)&&$('show-ct-plane').checked;dirty=true;});
for(const control of document.querySelectorAll('[data-detail-group]'))control.addEventListener('change',()=>{
  if(control.disabled||!caseData)return;
  for(const {mesh,meta} of meshes.values())if(meta.group===control.dataset.detailGroup)mesh.visible=control.checked;
  renderLayerSelection();contourCache=null;renderCT();dirty=true;
});
$('lobe-opacity').addEventListener('input',e=>{reconstruction?.setLobeOpacity(Number(e.target.value)/100);renderLayerSelection();renderCT();dirty=true;});
$('target-select').addEventListener('change',()=>focusTarget());$('focus-target').addEventListener('click',()=>focusTarget());
$('focus-selection').addEventListener('click',()=>{
  const s=meshes.get(selectedId)?.meta;if(!s||!caseData)return;
  if(s.group==='nodule'&&caseData.targets.length){const p=new THREE.Vector3(...voxelToLPS(voxel,caseData.ct));let nearest=0,best=Infinity;caseData.targets.forEach((t,i)=>{const d=p.distanceToSquared(new THREE.Vector3(...t.center));if(d<best){nearest=i;best=d;}});focusTarget(nearest);}
  else focusLocal(s.center,s.bounds,`${s.name} · 整体`);
});
$('measure-btn').addEventListener('click',()=>{measureMode=!measureMode;measurePoints=[];$('measure-btn').setAttribute('aria-pressed',String(measureMode));$('measure-btn').textContent=measureMode?'↔ 点两处测距':'↔ 测距';renderCT();});
$('ct-zoom-reset').addEventListener('click',()=>{zoom=1;ctPan=[0,0];measurePoints=[];renderCT();});
$('clear-selection').addEventListener('click',()=>{selectedId=null;for(const {mesh} of meshes.values())mesh.material.emissive.set(0x000000);$('selection-title').textContent='尚未选择';$('selection-dot').style.background='#617a87';renderLayerSelection();updateDetailUI();contourCache=null;renderCT();dirty=true;});
$('layers-reset').addEventListener('click',()=>{setDefaultLayers();study?.updateVisuals();renderLayerSelection();renderCT();});
$('layers-core').addEventListener('click',()=>{for(const {mesh,meta} of meshes.values()){mesh.visible=['artery','vein','airway','nodule'].includes(meta.group);if(isLungSurface(meta))reconstruction?.setVisibility(meta.id,false);}renderLayerSelection();renderCT();dirty=true;});
$('layers-segments').addEventListener('click',()=>{$('segment-overlay').value='fill';$('segment-only').checked=false;study?.updateVisuals();for(const {meta} of meshes.values())if(meta.group==='segment')reconstruction?.setVisibility(meta.id,true);renderLayerSelection();invalidateCT();});
$('reset-all').addEventListener('click',()=>{if(!caseData)return;study?.stop();setDefaultLayers();plane='axial';zoom=1;ctPan=[0,0];measurePoints=[];setPlaneButtons();setWindow('lung');fitOverview('anterior');study?.updateVisuals();if(study?.meta?.segments.some(s=>s.code===study.code))study.focus();else if(caseData.targets.length)focusTarget(0,false);fitDetailOverview(true);renderLayerSelection();invalidateCT();});
let expandedFrom=null,previousBodyOverflow='';
function expandPanel(panel){
  const currently=document.querySelector('.image-panel.expanded'),next=currently===panel?null:panel;
  if(!currently&&next)previousBodyOverflow=document.body.style.overflow;
  for(const p of document.querySelectorAll('.image-panel')){
    const expanded=p===next,b=p.querySelector('[data-expand]');p.classList.toggle('expanded',expanded);if(!b)continue;
    const label=expanded?b.dataset.expandedLabel:b.dataset.collapsedLabel;
    b.textContent=label?`${label} ${expanded?'⤡':'⤢'}`:expanded?'⤡':'⤢';b.setAttribute('aria-expanded',String(expanded));
    b.setAttribute('aria-label',`${expanded?'退出':'打开'}${p.querySelector('h3').textContent}大屏`);
  }
  document.body.style.overflow=next?'hidden':previousBodyOverflow;
  if(next)expandedFrom=next.querySelector('[data-expand]');else expandedFrom?.focus();
  requestAnimationFrame(resize);
}
for(const b of document.querySelectorAll('[data-expand]'))b.addEventListener('click',()=>expandPanel(document.querySelector(`.${b.dataset.expand}`)));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('case-dialog').open&&document.querySelector('.image-panel.expanded'))expandPanel(null);});
const dialog=$('case-dialog');$('close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
function showInfo(about=false){
  if(!catalog){$('dialog-content').innerHTML='<h2>病例目录尚未载入</h2><p>请完成载入或重新载入后查看资料说明。</p>';dialog.showModal();return;}
  const m=caseData;
  const summary=m?`<h3>${escapeHTML(m.id)} · ${escapeHTML(m.title)}</h3><table><tbody><tr><td>CT 矩阵</td><td>${m.ct.dimensions.join(' × ')}</td></tr><tr><td>体素间距</td><td>${m.ct.spacing.map(n=>n.toFixed(3)).join(' × ')} mm</td></tr><tr><td>源重建结构</td><td>${m.structures.length} 个</td></tr><tr><td>保留的三角面</td><td>${fmt(m.geometry.triangles)}</td></tr><tr><td>按需载入体积</td><td>${((m.ct.compressedBytes+m.geometry.compressedBytes)/1e6).toFixed(1)} MB</td></tr></tbody></table>`:'';
  $('dialog-content').innerHTML=`<p class="eyebrow">SOURCE & INTERPRETATION</p><h2>${about?'真实影像，保留来源边界':'病例资料'}</h2>${summary}
    <h3>这些资料包含什么</h3><p>来自作者提供的 ${catalog.caseCount} 份真实病例包，共 ${fmt(catalog.sliceCount)} 层 CT 与 ${catalog.structureCount} 个重建结构/源标注。病例包内 CT 已裁剪、重采样，层间距约 2 mm；并非完整的扫描仪原始薄层序列。界面显示的 HU 按源 DICOM 标定转换，窗宽窗位仅改变显示。</p>
    <h3>空间对照与三维优化</h3><p>使用 DICOM 位置、方向和像素间距，以及重建项目保存的模型变换进行对应。结构轮廓由网格与当前 CT 平面求交生成；病灶红线在此基础上向外留白，仅供定位，不表示真实病灶边界或手术切缘。圈内及紧邻病灶的留白区域恢复当前窗型的原始灰阶。所有源三角面均保留；优化采用无损压缩、按病例载入、共享几何、平滑法线和照明，未用生成图像补造解剖。</p>
    <h3>观察时如何理解</h3><ul><li>软件序列与坐标核对已完成，当前显示的肺段标注已由作者审核。</li><li>彩色是结构编码，局部观察来自三维模型，不是术中实录。</li><li>“标注区域”按网格连通性编号，不代表临床结节数量。切缘球是源规划标注。</li><li>含义未明确的“异常”等源标签单独归入“其他源标注”，默认隐藏，不据此判断诊断或病理。</li><li>未提供完整病史、病理或分期，病例库不据此推断诊断或确定切除范围。</li><li>测距为当前重采样影像上的两点直线距离。</li></ul>
    <h3>匿名处理</h3><p>网页资源只包含匿名编号、数值影像、空间参数、网格和结构标签。姓名、出生日期、病历号、检查日期、DICOM UID 及私有元数据未导出。源病例文件保留在作者本地目录。</p>
    <p><a href="https://dicom.nema.org/medical/DICOM/2021b/output/chtml/part03/sect_C.7.6.2.html" target="_blank" rel="noreferrer">DICOM 空间定义</a> · <a href="https://pydicom.github.io/pydicom/stable/guides/user/working_with_pixel_data.html" target="_blank" rel="noreferrer">像素标定处理依据</a></p>`;
  dialog.showModal();
}
$('about-btn').addEventListener('click',()=>showInfo(true));$('case-info').addEventListener('click',()=>showInfo());

function selectSegmentPoint(segment,point){
  if(!caseData)return;
  if(segment.sourceIds?.length)selectStructure(segment.sourceIds[0],false);
  else{selectedId=null;for(const {mesh} of meshes.values())mesh.material.emissive.set(0x000000);renderLayerSelection();updateDetailUI();}
  setPoint(voxelToLPS(point,caseData.ct));
  $('selection-title').textContent=segment.sourceNames.length?`${segment.code} · ${segment.sourceNames.join(' / ')}`:fullSegmentName(segment.code);
  const selected=meshes.get(selectedId);$('selection-dot').style.background=selected?`#${selected.mesh.material.color.getHexString()}`:segment.color;
}
reconstruction=new ReconstructionControls({
  changed:()=>{renderLayerSelection();contourCache=null;renderCT();dirty=true;},
  focus:focusStructure,focusSegment:code=>study?.choose(code),
  reset:()=>{setDefaultLayers();study?.updateVisuals();renderLayerSelection();invalidateCT();}
});
study=new SegmentCourse({
  state:()=>({caseData,volume,voxel,plane,activeId,meshes}),loadCase,
  reportError:message=>showStatus(message,true),
  focusLesion:()=>{study?.stop();changePlane('axial');focusTarget();},
  redraw:()=>{contourCache=null;renderCT();dirty=true;},resize,
  syncLayers:()=>{renderLayerSelection();dirty=true;},changeSlice,setPlane:changePlane,
  pointTo:(point,segment)=>{if(segment)selectSegmentPoint(segment,point);else if(caseData)setPoint(voxelToLPS(point,caseData.ct));},
  focusSegment:segment=>{
    if(!caseData)return;
    if(loadingDetail&&detailFraming==='local')return;
    const point=voxelToLPS(segment.focus,caseData.ct);
    selectSegmentPoint(segment,segment.focus);
    if(!loadingDetail)focusLocal(point,segment.bounds,`${segment.code} · 肺段定位`);
  }
});

try {
  catalog=await fetchJSON('./real-cases/catalog.json');
  $('catalog-summary').textContent=`${catalog.caseCount} 例 · ${fmt(catalog.sliceCount)} 层真实 CT`;
  populateCaseFilter();if(new URLSearchParams(location.search).get('cases')==='new'&&catalog.latestCaseIds?.length)$('case-filter').value='new';
  renderCatalog();const hash=location.hash.slice(1),preferred=$('case-filter').value==='new'?catalog.latestCaseIds[0]:'CT-001';
  await loadCase(catalog.cases.some(c=>c.id===hash)?hash:catalog.cases.some(c=>c.id===preferred)?preferred:catalog.cases[0]?.id);
  const requestedSegment=new URLSearchParams(location.search).get('segment');if(requestedSegment)await study.choose(requestedSegment);
  if(new URLSearchParams(location.search).get('view')==='detail'&&detailCamera?.ready)expandPanel(document.querySelector('.detail-panel'));
}catch(error){showStatus(error.message||'病例目录读取失败',true);$('ct-empty').textContent='病例库暂时无法读取';}
