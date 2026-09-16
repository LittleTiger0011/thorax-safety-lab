import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {DetailCamera,visibleModelFrame} from './case-library-camera.js';
import {clamp,voxelToLPS,lpsToVoxel,planeSpec,planeToVoxel,voxelToPlane,huAt,sliceRGBA,
  decodeVolume,trianglePlaneSegments,fetchJSON,fetchGzip} from './case-library-core.js';
import {LesionOverlay} from './lesion-contours.js';

export const TRAINING_CASE_ID='CT-004';
export const PRESETS={lung:[-600,1500],mediastinum:[40,400],bone:[400,1800]};
const GROUP_LABEL={nodule:'结节标注',artery:'肺动脉',vein:'肺静脉',airway:'支气管',lobe:'肺叶',segment:'肺段',planning:'源规划',annotation:'待核标注'};

export class TrainingRealCase{
 constructor(elements,hooks={}){
  this.el=elements;this.hooks=hooks;this.ready=false;this.caseId=TRAINING_CASE_ID;
  this.plane='axial';this.windowCenter=-600;this.windowWidth=1500;this.zoom=1;this.pan=[0,0];
  this.voxel=[0,0,0];this.selectedId=null;this.measure=false;this.measurePoints=[];this.showLesion=true;
  this.meshes=new Map();this.abort=null;this.dirty=true;this.webglError=null;
  this.hidden=new Set();this.view='anterior';this.natural=false;this.labels=true;this.linked=true;this.opacity=.09;this.segments=false;this.lesion=true;this.showSlice=true;
  this.ctCanvas=elements.ct;this.ctContext=this.ctCanvas.getContext('2d');
  this.sliceCanvas=document.createElement('canvas');this.sliceContext=this.sliceCanvas.getContext('2d');
  this.lesion=new LesionOverlay();this.cacheKey='';
  this.scene=new THREE.Scene();this.anatomy=new THREE.Group();this.scene.add(this.anatomy);
  this.scene.add(new THREE.HemisphereLight(0xc6e6f6,0x243647,2.1));
  this.keyLight=new THREE.DirectionalLight(0xfff0d8,3.1);this.fillLight=new THREE.DirectionalLight(0x94c7ed,1.8);
  this.rimLight=new THREE.DirectionalLight(0xc6ffe9,1.4);
  for(const light of [this.keyLight,this.fillLight,this.rimLight]){this.scene.add(light);this.scene.add(light.target);}
  this.cursor=new THREE.Mesh(new THREE.SphereGeometry(1.2,12,10),new THREE.MeshBasicMaterial({color:0xffd23f,depthTest:false}));
  this.cursor.renderOrder=12;this.cursor.visible=false;this.scene.add(this.cursor);
  try{
   this.view3D=this.createView(elements.anatomy,34);this.viewDetail=this.createView(elements.scope,40);
   this.view3D.camera.layers.enable(1);this.detail=new DetailCamera(this.viewDetail,()=>this.updateDetailHint());
  }catch(error){this.webglError=error;}
  this.ctTexture=new THREE.CanvasTexture(this.sliceCanvas);this.ctTexture.colorSpace=THREE.SRGBColorSpace;
  this.planeGeo=new THREE.BufferGeometry();
  this.planeGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(12),3));
  this.planeGeo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array([0,1,1,1,1,0,0,0]),2));
  this.planeGeo.setIndex([0,1,2,0,2,3]);
  this.imagePlane=new THREE.Mesh(this.planeGeo,new THREE.MeshBasicMaterial({map:this.ctTexture,transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false}));
  this.imagePlane.layers.set(1);this.imagePlane.visible=false;this.scene.add(this.imagePlane);
  this.bind();
  this.observer=new ResizeObserver(()=>this.resize());
  for(const node of [elements.ct,elements.anatomy,elements.scope])this.observer.observe(node.parentElement);
  this.running=true;this.animate();
 }
 createView(canvas,fov){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor(0x000000,1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const camera=new THREE.PerspectiveCamera(fov,1,.1,5000);camera.up.set(0,0,1);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.08;
  controls.minDistance=8;controls.maxDistance=1800;controls.addEventListener('change',()=>{this.dirty=true;});
  return {renderer,camera,controls,canvas};
 }
 bind(){
  const ct=this.ctCanvas;
  ct.addEventListener('wheel',e=>{if(!this.volume)return;e.preventDefault();if(e.ctrlKey||e.metaKey){this.zoom=clamp(this.zoom*(e.deltaY>0?.9:1.1),.05,6);}else this.changeSlice(e.deltaY>0?-1:1);this.drawCT();},{passive:false});
  ct.addEventListener('click',e=>{
   if(!this.rect||!this.volume)return;
   const box=ct.getBoundingClientRect(),u=(e.clientX-box.left-this.rect.x)/this.rect.width*this.rect.spec.width-.5,v=(e.clientY-box.top-this.rect.y)/this.rect.height*this.rect.spec.height-.5;
   if(u<-.5||v<-.5||u>this.rect.spec.width-.5||v>this.rect.spec.height-.5)return;
   const point=planeToVoxel(clamp(u,0,this.rect.spec.width-1),clamp(v,0,this.rect.spec.height-1),this.rect.index,this.plane,this.meta.ct);
   if(this.measure){if(this.measurePoints.length===2)this.measurePoints=[];this.measurePoints.push(point);}
   else this.setPoint(voxelToLPS(point,this.meta.ct));
   this.drawCT();
  });
  ct.addEventListener('keydown',e=>{if(['ArrowUp','ArrowRight'].includes(e.key)){e.preventDefault();this.changeSlice(1);}if(['ArrowDown','ArrowLeft'].includes(e.key)){e.preventDefault();this.changeSlice(-1);}});
  const raycaster=new THREE.Raycaster();
  for(const view of [this.view3D,this.viewDetail])if(view){
   let down=null;
   view.canvas.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
   view.canvas.addEventListener('pointerup',e=>{
    if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6||!this.meta)return;
    const r=view.canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),view.camera);
    const hits=raycaster.intersectObjects(this.anatomy.children,false).filter(h=>h.object.visible);
    const hit=hits.find(h=>!['lobe','segment','planning','annotation'].includes(h.object.userData.group))||hits[0];
    if(hit){this.select(hit.object.name,hit.point.toArray());this.hooks.onSelect?.(hit.object.userData);}
   });
  }
 }
 async load(caseId=TRAINING_CASE_ID){
  this.abort?.abort();this.abort=new AbortController();const signal=this.abort.signal;
  this.ready=false;this.caseId=caseId;this.volume=null;this.clearMeshes();this.hooks.onStatus?.('正在载入真实 CT…');
  const catalog=await fetchJSON('./real-cases/catalog.json',signal);
  const entry=catalog.cases.find(c=>c.id===caseId);if(!entry)throw new Error('未找到训练病例 '+caseId);
  const meta=await fetchJSON(`./real-cases/${entry.manifest}`,signal);
  if(meta.schemaVersion!==1||meta.coordinateSystem!=='DICOM LPS millimeters')throw new Error('病例空间定义不受支持');
  this.catalog=catalog;this.entry=entry;this.meta=meta;
  this.voxel=meta.ct.dimensions.map(n=>(n-1)/2);this.voxel[2]=meta.ct.initialSlice;this.plane='axial';this.zoom=1;this.pan=[0,0];
  this.setWindow('lung',false);
  const base=`./real-cases/${caseId}/`;
  const [geom,raw]=await Promise.all([
   fetchGzip(base+meta.geometry.asset,meta.geometry,signal),
   fetchGzip(base+meta.ct.asset,meta.ct,signal)
  ]);
  if(signal.aborted)return;
  this.volume=decodeVolume(raw,meta.ct);this.buildGeometry(geom,meta);this.setDefaultLayers();
  if(meta.targets.length)this.setPoint(meta.targets[0].center);else this.setPoint(voxelToLPS(this.voxel,meta.ct));
  this.fitOverview('anterior');this.ready=true;this.resize();this.drawCT();
  this.hooks.onStatus?.(null);
  this.hooks.onReady?.(this);
  this.fitDetailOverview(true);
 }
 buildGeometry(buffer,m){
  for(const s of m.structures){
   const position=new Float32Array(buffer,s.positionsByteOffset,s.vertexCount*3);
   const indices=s.indexType==='uint16'?new Uint16Array(buffer,s.indicesByteOffset,s.triangleCount*3):new Uint32Array(buffer,s.indicesByteOffset,s.triangleCount*3);
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(position,3));
   geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.computeBoundingBox();
   const translucent=['lobe','segment','planning','annotation'].includes(s.group);
   const material=new THREE.MeshStandardMaterial({color:s.color,roughness:.45,metalness:.02,transparent:translucent,opacity:translucent?.09:1,depthWrite:!translucent,side:THREE.DoubleSide});
   const mesh=new THREE.Mesh(geometry,material);mesh.name=s.id;mesh.userData=s;this.anatomy.add(mesh);
   const voxelPositions=new Float32Array(position.length);
   for(let i=0;i<position.length;i+=3)voxelPositions.set(lpsToVoxel([position[i],position[i+1],position[i+2]],m.ct),i);
   this.meshes.set(s.id,{mesh,meta:s,indices,voxelPositions});
  }
  const box=new THREE.Box3().setFromObject(this.anatomy),center=box.getCenter(new THREE.Vector3());
  [this.keyLight,this.fillLight,this.rimLight].forEach((l,i)=>{const o=[[150,-330,450],[-230,-80,100],[70,320,180]];l.position.copy(center).add(new THREE.Vector3(...o[i]));l.target.position.copy(center);});
 }
 clearMeshes(){
  for(const {mesh} of this.meshes.values()){this.anatomy.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
  this.meshes.clear();this.selectedId=null;this.detailFraming='overview';this.imagePlane.visible=false;this.cursor.visible=false;this.detail?.clear();
 }
 setDefaultLayers(){
  for(const {mesh,meta} of this.meshes.values()){
   mesh.visible=!['segment','planning','annotation'].includes(meta.group);
   mesh.material.opacity=meta.group==='lobe'?clamp(Number(this.el.opacity?.value||9)/100,.04,.5):1;
  }
 }
 setWindow(preset,redraw=true){
  const pair=PRESETS[preset];if(pair){[this.windowCenter,this.windowWidth]=pair;this.preset=preset;}
  if(this.el.preset)this.el.preset.value=pair?preset:'custom';
  if(this.el.width)this.el.width.value=String(this.windowWidth);
  if(this.el.center)this.el.center.value=String(this.windowCenter);
  if(redraw)this.drawCT();
 }
 setCustomWindow(){
  this.windowCenter=clamp(Number(this.el.center.value)||0,-1500,4000);
  this.windowWidth=clamp(Number(this.el.width.value)||2,2,12000);
  this.preset='custom';if(this.el.preset)this.el.preset.value='custom';this.drawCT();
 }
 currentSlice(){return Math.round(this.voxel[planeSpec(this.plane,this.meta.ct).axis]);}
 changeSlice(delta,absolute=false){
  if(!this.meta)return;const axis=planeSpec(this.plane,this.meta.ct).axis;
  this.voxel[axis]=clamp(absolute?delta:this.currentSlice()+delta,0,this.meta.ct.dimensions[axis]-1);
  this.cursor.position.fromArray(voxelToLPS(this.voxel,this.meta.ct));this.measurePoints=[];this.drawCT();
 }
 setSlice(index){this.changeSlice(Number(index),true);}
 setPlane(plane){this.plane=plane;this.zoom=1;this.pan=[0,0];this.measurePoints=[];this.drawCT();}
 setPoint(p){
  this.voxel=lpsToVoxel(p,this.meta.ct).map((v,i)=>clamp(v,0,this.meta.ct.dimensions[i]-1));
  this.cursor.position.fromArray(voxelToLPS(this.voxel,this.meta.ct));this.cursor.visible=true;this.dirty=true;this.drawCT();
 }
 locateNodule(){const t=this.meta?.targets[0];if(t){this.select(t.structureId,t.center);}else this.hooks.onStatus?.('本例未提供结节标注');}
 updateLabels(){if(!this.meta||!this.volume)return;this.updateReadout(huAt(this.volume,this.voxel,this.meta.ct));}
 setExam(){}
 setEffect(){}
 setScopeView(key){this.view=key||'anterior';this.fitOverview(key==='posterior'?'posterior':'anterior');}
 reset(){this.fitOverview('anterior');this.locateNodule();this.fitDetailOverview(true);}
 get selected(){return this.selectedId;}
 focusTeaching(id){
  const names={rul:'右上叶',rml:'右中叶',rll:'右下叶',lul:'左上叶',lll:'左下叶',s1:'RS1a',s2:'RS2a',s3:'RS3a',rulv:'肺静脉',rmlv:'肺静脉',rspv:'肺静脉',ripv:'肺静脉',a13:'肺动脉',interlobar:'肺动脉',a2:'肺动脉',rub:'支气管',bi:'支气管'};
  const name=names[id];
  const hit=[...this.meshes.values()].find(v=>v.meta.name===name||v.meta.name.startsWith(name||'\0'));
  if(hit)this.select(hit.meta.id);
 }
 focus(id){this.focusTeaching(id);}
 select(id,point=null){
  if(id==null){
   this.selectedId=null;this.cursor.visible=false;
   for(const {mesh} of this.meshes.values()){mesh.material.emissive.set(0x000000);mesh.material.emissiveIntensity=0;}
   this.drawCT();return;
  }
  if(!this.meshes.has(id))return;this.selectedId=id;const item=this.meshes.get(id);item.mesh.visible=true;
  for(const {mesh,meta} of this.meshes.values()){mesh.material.emissive.set(meta.id===id?mesh.material.color:0x000000);mesh.material.emissiveIntensity=meta.id===id?.22:0;}
  const target=point||item.meta.components?.[0]?.center||item.meta.center;
  this.setPoint(target);this.focusLocal(target,item.meta.bounds,item.meta.name);this.hooks.onSelect?.(item.meta);
 }
 focusLocal(center,bounds,label){
  if(!this.detail||this.webglError)return;
  this.detailFraming='local';
  const middle=voxelToLPS(this.meta.ct.dimensions.map(n=>(n-1)/2),this.meta.ct),side=center[0]<middle[0]?-1:1;
  this.detail.focus(center,bounds,[side*.8,-1,.35]);
  if(this.el.detailLabel)this.el.detailLabel.textContent=`${this.caseId} · ${label||'局部观察'}`;
 }
 fitDetailOverview(resetDirection=false){
  if(!this.detail||this.webglError)return;
  this.detailFraming='overview';
  const frame=visibleModelFrame(this.meshes.values());
  if(!frame){this.detail.clear();if(this.el.detailLabel)this.el.detailLabel.textContent=`${this.caseId} · 当前没有可见结构`;this.dirty=true;return;}
  this.detail.focus(frame.center,frame.bounds,[0,-1,.06],{preserveDirection:!resetDirection&&this.detail.ready});
  if(this.el.detailLabel)this.el.detailLabel.textContent=`${this.caseId} · 可见模型全景`;
  this.dirty=true;
 }
 fitOverview(direction='anterior'){
  if(!this.view3D||!this.meshes.size)return;
  const box=new THREE.Box3();for(const {mesh,meta} of this.meshes.values())if(!['planning','annotation'].includes(meta.group)&&mesh.geometry.boundingBox)box.union(mesh.geometry.boundingBox);
  const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  const aspect=Math.max(.3,this.view3D.camera.aspect),distance=Math.max(size.z,size.x/aspect,size.y/aspect)*.62/Math.tan(THREE.MathUtils.degToRad(this.view3D.camera.fov/2));
  const offsets={anterior:[0,-1,.04],posterior:[0,1,.04],right:[-1,0,.04],left:[1,0,.04]};
  this.view3D.camera.position.copy(center).add(new THREE.Vector3(...(offsets[direction]||offsets.anterior)).multiplyScalar(distance));
  this.view3D.controls.target.copy(center);this.view3D.controls.update();this.dirty=true;
 }
 setLobeOpacity(percent){
  const n=clamp(percent,4,50)/100;
  for(const {mesh,meta} of this.meshes.values())if(meta.group==='lobe')mesh.material.opacity=n;
  this.dirty=true;
 }
 toggleMeasure(){this.measure=!this.measure;this.measurePoints=[];this.drawCT();return this.measure;}
 groups(){
  const order=['nodule','airway','artery','vein','lobe','segment'];
  return order.map(group=>{
   const members=[...this.meshes.values()].filter(v=>v.meta.group===group);
   return members.length?{group,label:GROUP_LABEL[group],members:members.map(v=>v.meta)}:null;
  }).filter(Boolean);
 }
 drawCT(){
  const canvas=this.ctCanvas,ctx=this.ctContext,box=canvas.getBoundingClientRect(),w=box.width,h=box.height;
  if(!w||!h)return;
  const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#000000';ctx.fillRect(0,0,w,h);this.rect=null;
  if(!this.meta||!this.volume){if(this.el.status)this.el.status.textContent='正在载入真实 CT';return;}
  const ct=this.meta.ct,spec=planeSpec(this.plane,ct),index=this.currentSlice();
  const key=`${this.caseId}/${this.plane}/${index}/${this.windowCenter}/${this.windowWidth}`;
  if(this.cacheKey!==key){
   this.sliceCanvas.width=spec.width;this.sliceCanvas.height=spec.height;
   this.sliceContext.putImageData(new ImageData(sliceRGBA(this.volume,this.plane,index,ct,this.windowCenter,this.windowWidth),spec.width,spec.height),0,0);
   this.cacheKey=key;this.ctTexture.needsUpdate=true;
  }
  const scale=Math.min((w-28)/(spec.width*spec.sx),(h-40)/(spec.height*spec.sy))*this.zoom;
  const iw=spec.width*spec.sx*scale,ih=spec.height*spec.sy*scale,x=(w-iw)/2+this.pan[0],y=(h-ih)/2+this.pan[1];
  this.rect={x,y,width:iw,height:ih,spec,index};ctx.imageSmoothingEnabled=true;ctx.drawImage(this.sliceCanvas,x,y,iw,ih);
  if(this.showLesion&&this.meshes.size){
   this.lesion.draw(ctx,{key:`${key}/${this.meshes.size}`,meshes:this.meshes.values(),plane:this.plane,index,ct,rect:this.rect,base:this.sliceCanvas});
  }
  const toCanvas=v=>{const p=voxelToPlane(v,this.plane,ct);return [x+(p[0]+.5)/spec.width*iw,y+(p[1]+.5)/spec.height*ih];};
  if(this.selectedId&&this.meshes.get(this.selectedId)&&!['nodule','segment'].includes(this.meshes.get(this.selectedId).meta.group)){
   const selected=this.meshes.get(this.selectedId);
   const lines=trianglePlaneSegments(selected.voxelPositions,selected.indices,spec.axis,index);
   ctx.save();ctx.strokeStyle=selected.meta.color;ctx.lineWidth=1.2;ctx.beginPath();
   for(const line of lines){const a=toCanvas(line[0]),b=toCanvas(line[1]);ctx.moveTo(...a);ctx.lineTo(...b);}ctx.stroke();ctx.restore();
  }
  const hu=huAt(this.volume,this.voxel,ct),[cx,cy]=toCanvas(this.voxel);
  ctx.save();ctx.strokeStyle='#ffd23f';ctx.globalAlpha=.7;ctx.lineWidth=.8;ctx.setLineDash([3,4]);
  ctx.beginPath();ctx.moveTo(x,cy);ctx.lineTo(cx-5,cy);ctx.moveTo(cx+5,cy);ctx.lineTo(x+iw,cy);ctx.moveTo(cx,y);ctx.lineTo(cx,cy-5);ctx.moveTo(cx,cy+5);ctx.lineTo(cx,y+ih);ctx.stroke();ctx.restore();
  if(this.measurePoints.length){
   const pts=this.measurePoints.map(toCanvas);ctx.fillStyle='#ffd23f';ctx.strokeStyle='#ffd23f';ctx.lineWidth=1.3;
   for(const p of pts){ctx.beginPath();ctx.arc(...p,3,0,Math.PI*2);ctx.fill();}
   if(pts.length===2){ctx.beginPath();ctx.moveTo(...pts[0]);ctx.lineTo(...pts[1]);ctx.stroke();
    const a=voxelToLPS(this.measurePoints[0],ct),b=voxelToLPS(this.measurePoints[1],ct),len=Math.hypot(...a.map((v,i)=>v-b[i]));
    ctx.font='12px ui-monospace,monospace';ctx.fillStyle='#05111be8';const label=`${len.toFixed(1)} mm`,tx=(pts[0][0]+pts[1][0])/2,ty=(pts[0][1]+pts[1][1])/2-10;
    ctx.fillRect(tx-4,ty-14,ctx.measureText(label).width+8,20);ctx.fillStyle='#ffd23f';ctx.fillText(label,tx,ty);}
  }
  ctx.font='11px ui-monospace,monospace';ctx.fillStyle='#e6eaf0';ctx.textAlign='center';
  ctx.fillText(spec.labels[0],w/2,14);ctx.fillText(spec.labels[1],w/2,h-8);ctx.fillText(spec.labels[2],12,h/2);ctx.fillText(spec.labels[3],w-12,h/2);ctx.textAlign='start';
  this.syncPlane();this.updateReadout(hu);this.dirty=true;
 }
 syncPlane(){
  const spec=planeSpec(this.plane,this.meta.ct),index=this.currentSlice(),max=this.meta.ct.dimensions[spec.axis];
  if(this.el.slice){this.el.slice.min='0';this.el.slice.max=String(max-1);this.el.slice.value=String(index);this.el.slice.step='1';}
  if(this.el.sliceValue)this.el.sliceValue.textContent=`${index+1} / ${max}`;
  if(this.el.planeLabel)this.el.planeLabel.textContent={axial:'AXIAL',coronal:'CORONAL · MPR',sagittal:'SAGITTAL · MPR'}[this.plane];
  document.querySelectorAll('[data-real-plane]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.realPlane===this.plane)));
  const corners=[[-.5,-.5],[spec.width-.5,-.5],[spec.width-.5,spec.height-.5],[-.5,spec.height-.5]];
  const attr=this.planeGeo.getAttribute('position');corners.forEach((c,i)=>attr.setXYZ(i,...voxelToLPS(planeToVoxel(...c,index,this.plane,this.meta.ct),this.meta.ct)));
  attr.needsUpdate=true;this.planeGeo.computeBoundingSphere();this.imagePlane.visible=true;this.ctTexture.needsUpdate=true;
 }
 updateReadout(hu){
  const ww=this.windowWidth,wl=this.windowCenter,preset=this.preset==='lung'?'肺窗':this.preset==='mediastinum'?'纵隔窗':this.preset==='bone'?'骨窗':'自定义';
  if(this.el.hu)this.el.hu.textContent=hu===null?'':`${hu} HU`;
  if(this.el.caption)this.el.caption.textContent=`${this.caseId} · ${this.entry.title} · ${preset}  WW ${ww}  WL ${wl}`;
  if(this.el.status){
   const sp=this.meta.ct.spacing;
   this.el.status.textContent=`匿名病例 ${this.caseId} · 像素 ${sp[0].toFixed(2)} mm · 层间距 ${sp[2].toFixed(2)} mm · 源网格投影，非天然分界 · 本库为重采样 CT，不是原始薄层`;
  }
  if(this.el.selectionName)this.el.selectionName.textContent=this.meshes.get(this.selectedId)?.meta.name||'点击真实 CT 或三维结构';
  if(this.el.selectionDetail){
   const huText=hu===null?'':'当前采样 '+hu+' HU。';
   this.el.selectionDetail.textContent=`阅片为 ${this.caseId} 真实 CT 与源重建。检查点选项是安全原则，不是对该例每根分支的自动标定。${huText}`;
  }
 }
 updateDetailHint(){
  if(!this.el.detailHint||!this.detail)return;
  const p=this.detail.percent||100;this.el.detailHint.textContent=`局部真实三维 · ${p<10?p.toFixed(1):Math.round(p)}% · 不是术中腔镜`;
 }
 resize(){
  const dpr=Math.min(devicePixelRatio||1,2),box=this.ctCanvas.getBoundingClientRect();
  if(box.width&&box.height){this.ctCanvas.width=Math.round(box.width*dpr);this.ctCanvas.height=Math.round(box.height*dpr);}
  for(const view of [this.view3D,this.viewDetail])if(view){const b=view.canvas.getBoundingClientRect();if(b.width&&b.height){view.renderer.setSize(b.width,b.height,false);view.camera.aspect=b.width/b.height;view.camera.updateProjectionMatrix();}}
  this.detail?.resize();if(this.ready)this.drawCT();this.dirty=true;
 }
 snapshot(){return {caseId:this.caseId,plane:this.plane,slice:this.currentSlice(),windowCenter:this.windowCenter,windowWidth:this.windowWidth,selected:this.selectedId,voxel:[...this.voxel]};}
 restore(s){if(!s)return;if(s.plane)this.plane=s.plane;if(Array.isArray(s.voxel))this.voxel=s.voxel;if(Number.isFinite(s.slice))this.setSlice(s.slice);if(s.selected)this.select(s.selected);this.drawCT();}
 animate(){if(!this.running)return;requestAnimationFrame(()=>this.animate());if(document.hidden)return;for(const v of [this.view3D,this.viewDetail])v?.controls.update();if(this.dirty){for(const v of [this.view3D,this.viewDetail])v?.renderer.render(this.scene,v.camera);this.dirty=false;}}
 destroy(){this.running=false;this.abort?.abort();this.observer.disconnect();this.clearMeshes();for(const v of [this.view3D,this.viewDetail]){v?.controls.dispose();v?.renderer.dispose();}}
}
