import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {LOBES,BRANCHES,STRUCTURES,SEGMENTS,LESION,CAMERAS,lobeField,tissueAt,segmentAt,pointOnBranch,PHYSIOLOGY} from './anatomy-data.js';

function isoMesh(id){
 const pos=[],normal=[],side=id[0]==='r'?-1:1;
 const min=[side<0?-7.1:.75,-6.1,-3.0],max=[side<0?-.75:7.1,5.65,3];
 const n=[32,48,30],step=max.map((v,i)=>(v-min[i])/n[i]);
 const f=p=>lobeField(id,...p),at=(x,y,z)=>[min[0]+x*step[0],min[1]+y*step[1],min[2]+z*step[2]];
 const corner=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
 const tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],edges=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
 const gradient=p=>{const e=.003;return new THREE.Vector3(...p.map((_,i)=>{const a=p.slice(),b=p.slice();a[i]+=e;b[i]-=e;return f(a)-f(b);})).normalize();};
 function tri(a,b,c){const na=gradient(a),nb=gradient(b),nc=gradient(c),cross=new THREE.Vector3().subVectors(new THREE.Vector3(...b),new THREE.Vector3(...a)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c),new THREE.Vector3(...a)));if(cross.dot(na)<0){[b,c]=[c,b];[nb.x,nc.x]=[nc.x,nb.x];[nb.y,nc.y]=[nc.y,nb.y];[nb.z,nc.z]=[nc.z,nb.z];}pos.push(...a,...b,...c);normal.push(...na.toArray(),...nb.toArray(),...nc.toArray());}
 for(let x=0;x<n[0];x++)for(let y=0;y<n[1];y++)for(let z=0;z<n[2];z++){
  const points=corner.map(c=>at(x+c[0],y+c[1],z+c[2])),values=points.map(f);if(values.every(v=>v>0)||values.every(v=>v<0))continue;
  for(const t of tetra){const p=t.map(i=>points[i]),v=t.map(i=>values[i]),cuts=[];
   for(const [a,b] of edges)if((v[a]<0)!==(v[b]<0)){const u=v[a]/(v[a]-v[b]);cuts.push(p[a].map((w,j)=>w+(p[b][j]-w)*u));}
   if(cuts.length===3)tri(...cuts);else if(cuts.length===4){
    const center=cuts[0].map((_,j)=>cuts.reduce((s,c)=>s+c[j],0)/4),gn=gradient(center),basis=new THREE.Vector3(...cuts[0]).sub(new THREE.Vector3(...center)).normalize(),up=new THREE.Vector3().crossVectors(gn,basis);
    cuts.sort((a,b)=>{const av=new THREE.Vector3(...a).sub(new THREE.Vector3(...center)),bv=new THREE.Vector3(...b).sub(new THREE.Vector3(...center));return Math.atan2(av.dot(up),av.dot(basis))-Math.atan2(bv.dot(up),bv.dot(basis));});tri(cuts[0],cuts[1],cuts[2]);tri(cuts[0],cuts[2],cuts[3]);
   }
  }
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));return geo;
}
function tube(branch){const curve=new THREE.CurvePath();for(let i=1;i<branch.points.length;i++)curve.add(new THREE.LineCurve3(new THREE.Vector3(...branch.points[i-1]),new THREE.Vector3(...branch.points[i])));return new THREE.TubeGeometry(curve,Math.max(32,branch.points.length*16),branch.radius,12,false);}
function material(color,opacity=1){return new THREE.MeshPhysicalMaterial({color,roughness:.52,metalness:.03,transparent:opacity<1,opacity,side:THREE.DoubleSide,depthWrite:opacity>=.8,clearcoat:.18});}
const geomCache=new Map();
export class ThoraxViewer{
 constructor(elements,onPick){
  this.elements=elements;this.onPick=onPick;this.selected=null;this.slice=1.8;this.labels=true;this.linked=true;this.exam=null;this.effect=null;this.effectProgress=0;this.natural=false;this.opacity=.23;this.hidden=new Set();this.view='anterior';this.currentTab='all';this.running=true;this.dirtyCT=true;this.segments=false;this.lesion=false;this.showSlice=true;this.fps=0;this.frames=0;this.last=performance.now();
  this.ct=elements.ct;this.ctctx=this.ct.getContext('2d');this.ctSmall=document.createElement('canvas');this.ctSmall.width=272;this.ctSmall.height=176;this.ctSmallCtx=this.ctSmall.getContext('2d');this.ctPixels=null;
  this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.world=new THREE.Vector3();
  for(const l of LOBES)geomCache.set(l.id,isoMesh(l.id));for(const b of BRANCHES)geomCache.set(b.id,tube(b));
  this.anatomy=this.createViewport(elements.anatomy,'anatomy');this.scope=this.createViewport(elements.scope,'scope');
  this.ct.addEventListener('click',e=>{if(this.exam&&this.exam.pick!=='ct')return;const p=this.ctPoint(e);const t=tissueAt(p.x,this.slice,p.z);if(STRUCTURES[t.id])this.pick(t.id,'ct');});
  this.ct.addEventListener('wheel',e=>{if(this.exam)return;e.preventDefault();this.setSlice(this.slice-Math.sign(e.deltaY)*.18);},{passive:false});
  this.observer=new ResizeObserver(()=>this.resize());Object.values(elements).filter(e=>e instanceof HTMLCanvasElement).forEach(e=>this.observer.observe(e.parentElement));this.resize();this.setScopeView('anterior');this.animate();
 }
 createViewport(canvas,kind){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(kind==='scope'?0x1a1218:0x081521);renderer.localClippingEnabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(kind==='scope'?38:36,1,.1,120);camera.position.set(0,2.5,28);const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.09;controls.target.set(0,.3,0);controls.minDistance=kind==='scope'?8:14;controls.maxDistance=kind==='scope'?13:40;controls.enablePan=kind!=='scope';
  scene.add(new THREE.HemisphereLight(kind==='scope'?0xffe1d4:0xcceeff,0x15212d,2.0));const light=new THREE.DirectionalLight(kind==='scope'?0xffe1dc:0xffffff,3.4);light.position.set(-5,7,12);scene.add(light);const rim=new THREE.DirectionalLight(0x6cb8dd,1.5);rim.position.set(8,3,-8);scene.add(rim);
  const meshes=[],lungMeshes=[];for(const l of LOBES){const mat=material(l.color,this.opacity);if(kind==='scope'){mat.color.setHex(0xbb8589);mat.opacity=1;mat.transparent=false;mat.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,0,-1),.25)];mat.depthWrite=true;}const mesh=new THREE.Mesh(geomCache.get(l.id),mat);mesh.userData={id:l.id,type:'lung'};if(kind==='scope'&&l.id.startsWith('l'))mesh.visible=false;scene.add(mesh);meshes.push(mesh);lungMeshes.push(mesh);}
  for(const b of BRANCHES){const mesh=new THREE.Mesh(geomCache.get(b.id),material(b.color));mesh.userData={id:b.id,type:b.type};if(kind==='scope'&&['lmb','blul','blll','lpa','lpv'].includes(b.id))mesh.visible=false;scene.add(mesh);meshes.push(mesh);if(b.type==='bronchus'&&!(kind==='scope'&&['lmb','blul','blll'].includes(b.id))){
   const line=new THREE.CurvePath();for(let i=1;i<b.points.length;i++)line.add(new THREE.LineCurve3(new THREE.Vector3(...b.points[i-1]),new THREE.Vector3(...b.points[i])));
   const steps=Math.floor(line.getLength()/.42);for(let i=1;i<steps;i++){const t=i/steps,pos=line.getPoint(t),tangent=line.getTangent(t);const ring=new THREE.Mesh(new THREE.TorusGeometry(b.radius*1.018,.018,4,12),material(0xb8aa91));ring.position.copy(pos);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),tangent.normalize());scene.add(ring);}
  }}
  const lesion=new THREE.Mesh(new THREE.SphereGeometry(LESION.radius,24,16),material(LESION.color,.92));lesion.position.set(...LESION.center);lesion.visible=false;lesion.userData={id:'lesion'};scene.add(lesion);meshes.push(lesion);
  const grid=new THREE.GridHelper(20,20,0x254959,0x122936);grid.position.y=-6.2;grid.material.transparent=true;grid.material.opacity=.5;if(kind==='anatomy')scene.add(grid);
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(15,7),new THREE.MeshBasicMaterial({color:0x5cd9cc,transparent:true,opacity:.075,side:THREE.DoubleSide,depthWrite:false}));plane.rotation.x=-Math.PI/2;plane.position.y=this.slice;if(kind==='anatomy')scene.add(plane);
  const planeEdge=new THREE.LineSegments(new THREE.EdgesGeometry(plane.geometry),new THREE.LineBasicMaterial({color:0x5acabc,transparent:true,opacity:.45}));plane.add(planeEdge);
  // Chest wall context stays outside the open teaching window; it is not a second copy of the anatomy view.
  if(kind==='scope'){
   const wall=new THREE.Mesh(new THREE.PlaneGeometry(19,18),material(0x39282e));wall.position.set(0,-.2,-4.7);wall.userData={context:true};scene.add(wall);
   for(let i=0;i<6;i++){const pts=[];for(let j=0;j<=22;j++){const a=.3+j/22*1.15;pts.push(new THREE.Vector3(-7.5*Math.sin(a),4.4-i*1.35,-3.9+.3*Math.cos(a)));}const rib=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),22,.10,6,false),material(0x8c6f6d));scene.add(rib);}
   const tool=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,6,10),material(0x9daab0));tool.position.set(-5,-3.7,4);tool.rotation.z=-.6;tool.rotation.x=.8;tool.userData={context:true};scene.add(tool);
  }
  let down=null;canvas.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>7)return;const r=canvas.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,camera);const candidates=meshes.filter(m=>m.visible&&(kind==='scope'||m.userData.type!=='lung'));const hit=this.raycaster.intersectObjects(candidates,false).find(h=>!(kind==='scope'&&h.object.userData.type==='lung'&&h.point.z>.25))??(kind==='anatomy'?this.raycaster.intersectObjects(lungMeshes.filter(m=>m.visible),false)[0]:null);if(hit){let id=hit.object.userData.id;if(this.segments&&id==='rul')id=segmentAt(hit.point.x,hit.point.y,hit.point.z)||id;this.pick(id,kind);}});
  controls.addEventListener('end',()=>this.updateVisibility());
  return {kind,canvas,renderer,scene,camera,controls,meshes,lungMeshes,lesion,plane};
 }
 pick(id,source){
  if(this.exam){if(source!==this.exam.pick)return;this.selected=id;this.onPick(id,source,true);this.updateMaterials();return;}
  this.select(id,source);this.onPick(id,source,false);
 }
 select(id,source='list'){
  this.selected=id;if(this.linked&&id&&STRUCTURES[id]&&source!=='ct')this.setSlice(STRUCTURES[id].center[1]);this.dirtyCT=true;this.updateMaterials();this.updateLabels();
 }
 setSlice(y){this.slice=Math.min(5.4,Math.max(-5.7,Number(y)));this.dirtyCT=true;if(this.anatomy)this.anatomy.plane.position.y=this.slice;document.getElementById('slice-value')?.replaceChildren(document.createTextNode(this.slice.toFixed(1)));const slider=document.getElementById('slice');if(slider)slider.value=this.slice;}
 setScopeView(key){this.view=key;const c=CAMERAS[key]||CAMERAS.anterior,v=this.scope;v.controls.minAzimuthAngle=-Infinity;v.controls.maxAzimuthAngle=Infinity;v.controls.minPolarAngle=0;v.controls.maxPolarAngle=Math.PI;v.camera.position.set(...c.position);v.controls.target.set(...c.target);v.controls.update();const az=v.controls.getAzimuthalAngle(),po=v.controls.getPolarAngle();v.controls.minAzimuthAngle=az-.34;v.controls.maxAzimuthAngle=az+.34;v.controls.minPolarAngle=Math.max(.25,po-.24);v.controls.maxPolarAngle=Math.min(Math.PI-.25,po+.24);v.controls.update();this.updateVisibility();}
 reset(){this.anatomy.camera.position.set(0,2.5,28);this.anatomy.controls.target.set(0,.3,0);this.setScopeView('anterior');}
 focus(id){this.select(id);const p=STRUCTURES[id]?.center;if(p){this.anatomy.controls.target.set(...p);this.anatomy.camera.position.set(p[0]-1,p[1]+2,p[2]+17);}}
 setExam(q){this.exam=q;this.selected=null;this.effect=null;this.lesion=false;if(q){this.hidden.clear();this.opacity=.20;this.natural=false;this.segments=false;}this.setScopeView(q?.view||'anterior');this.labels=!q;this.dirtyCT=true;if(q?.structure)this.setSlice(STRUCTURES[q.structure].center[1]);this.anatomy.camera.position.set(q?.view==='superior'?-4:0,q?.view==='superior'?9:2.5,26);this.anatomy.controls.target.set(0,.3,0);this.updateMaterials();this.updateLabels();}
 setEffect(key,progress=0){this.effect=key;this.effectProgress=progress;this.updateMaterials();}
 updateMaterials(){
  for(const v of [this.anatomy,this.scope])for(const mesh of v.meshes){const id=mesh.userData.id,st=STRUCTURES[id];if(!st)continue;
   mesh.visible=!this.hidden.has(id)&&(id!=='lesion'||(this.lesion&&!this.exam))&&!(v.kind==='scope'&&['lul','lll','lmb','blul','blll','lpa','lpv'].includes(id));
   const canSelect=!this.exam||this.exam.pick===v.kind;const highlighted=canSelect&&this.selected===id;
   mesh.material.color.setHex(v.kind==='scope'&&this.natural?(st.type==='bronchus'?0xd0b1a2:st.type==='artery'?0xb98288:st.type==='vein'?0xab717c:0xbb8589):st.color);
   mesh.material.emissive.setHex(highlighted?0x776033:0);mesh.material.emissiveIntensity=highlighted?.75:0;
   if(mesh.userData.type==='lung'){
    mesh.material.opacity=v.kind==='scope'?1:this.opacity;mesh.material.transparent=v.kind!=='scope';mesh.material.depthWrite=v.kind==='scope';
    if(this.selected===id&&!this.exam){mesh.material.opacity=v.kind==='scope'?.9:Math.max(.5,this.opacity);mesh.material.emissive.setHex(0x265149);}
   }
   const e=PHYSIOLOGY[this.effect];if(e&&this.effectProgress>0){if(e.target===id){mesh.material.color.setHex(0xffd779);mesh.material.emissive.setHex(0x6a3612);}if(e.affected.includes(id)){mesh.material.color.lerp(new THREE.Color(e.color),Math.min(1,this.effectProgress));mesh.material.opacity=Math.max(mesh.material.opacity,this.effectProgress*.72);}}
  }
  this.anatomy.plane.visible=this.showSlice&&!this.exam;this.dirtyCT=true;this.updateVisibility();
 }
 ctPoint(e){const r=this.ct.getBoundingClientRect(),s=this.ctDrawRect;return {x:((e.clientX-r.left)*this.ct.width/r.width-s.x)/s.w*17-8.5,z:4.7-((e.clientY-r.top)*this.ct.height/r.height-s.y)/s.h*9.4};}
 drawCT(){
  const c=this.ctctx,W=this.ct.width,H=this.ct.height,w=272,h=176,im=this.ctSmallCtx.createImageData(w,h);const picked=this.exam?.source==='ct'?this.exam.structure:(this.exam?null:this.selected);let count=0;
  for(let py=0;py<h;py++)for(let px=0;px<w;px++){
   const x=(px+.5)/w*17-8.5,z=4.7-(py+.5)/h*9.4,t=tissueAt(x,this.slice,z),i=(py*w+px)*4;let val=t.gray;
   const noise=(Math.sin(px*91.17+py*17.13+this.slice*47.2)*437.12)%1;val+=noise*(t.id&&t.gray===44?8:2.4);
   const selected=picked&&(t.id===picked||(picked?.startsWith('s')&&segmentAt(x,this.slice,z)===picked));
   if(selected){im.data[i]=244;im.data[i+1]=193;im.data[i+2]=90;count++;}else{im.data[i]=val;im.data[i+1]=val+1;im.data[i+2]=val+3;}im.data[i+3]=255;
  }
  this.ctSmallCtx.putImageData(im,0,0);c.fillStyle='#060f17';c.fillRect(0,0,W,H);const dw=W*.94,dh=dw*h/w,dx=(W-dw)/2,dy=(H-dh)/2;this.ctDrawRect={x:dx,y:dy,w:dw,h:dh};c.imageSmoothingEnabled=true;c.drawImage(this.ctSmall,dx,dy,dw,dh);
  c.font=`${Math.max(15,W/26)}px sans-serif`;c.textAlign='center';c.fillStyle='#9cd0d5';c.fillText('A',W/2,Math.max(24,dy-18));c.fillText('P',W/2,Math.min(H-12,dy+dh+26));c.fillText('R',18,H/2);c.fillText('L',W-18,H/2);
  c.strokeStyle='#233743';c.lineWidth=1;c.beginPath();c.moveTo(W/2-7,H/2);c.lineTo(W/2+7,H/2);c.moveTo(W/2,H/2-7);c.lineTo(W/2,H/2+7);c.stroke();
  this.ctVisible=count>0;const el=document.getElementById('ct-status');if(el)el.textContent=this.exam?'仅显示题目给定起点':picked?(count?'结构在当前层面可见':'当前层面未见该结构，可定位相关层面'):'滚动或拖动切面，点击辨认结构';this.dirtyCT=false;
 }
 updateLabels(){
  const name=this.exam?(this.selected?'已选择结构，待确认':'请选择目标视图中的结构'):!this.labels?'结构名称已隐藏':(STRUCTURES[this.selected]?.name||'点击结构开始定位');document.getElementById('selection-name')?.replaceChildren(document.createTextNode(name));
  const note=document.getElementById('selection-detail');if(note)note.textContent=this.exam?'独立测验：名称、助教和答案联动已关闭。':!this.labels?'结构名称已隐藏，可用当前视角独立辨认。':STRUCTURES[this.selected]?.description||'拖动旋转三维；在腔镜中调整观察方向。所有视图来自同一教学体模。';
  this.updateVisibility();
 }
 updateVisibility(){const el=document.getElementById('scope-status');if(!el||!this.scope)return;if(this.exam){el.textContent='独立选择；不显示正确结构或可见性提示';return;}const id=this.selected,st=STRUCTURES[id];if(!st){el.textContent='有限视野；遮挡结构须调整观察位后辨认';return;}const v=this.scope,m=v.meshes.find(x=>x.userData.id===id);if(!m?.visible){el.textContent='当前视野未展开该结构，请调整观察范围';return;}v.camera.updateMatrixWorld();const points=st.points?[.25,.5,.75].map(t=>pointOnBranch(st,t)):[st.center];let visible=false;for(const p of points){const wp=new THREE.Vector3(...p),proj=wp.clone().project(v.camera);if(Math.abs(proj.x)>.98||Math.abs(proj.y)>.98||proj.z>1)continue;this.raycaster.set(v.camera.position,wp.clone().sub(v.camera.position).normalize());const hits=this.raycaster.intersectObjects(v.meshes.filter(x=>x.visible),false).filter(h=>!(h.object.userData.type==='lung'&&h.point.z>.25));if(hits[0]?.object.userData.id===id){visible=true;break;}}el.textContent=visible?'所选结构在当前教学视野可见，可追踪相邻分支':'所选结构受遮挡或在视野外，请调整观察位';}
 resize(){for(const v of [this.anatomy,this.scope]){const r=v.canvas.parentElement.getBoundingClientRect();if(!r.width||!r.height)continue;v.renderer.setSize(r.width,r.height,false);v.camera.aspect=r.width/r.height;v.camera.updateProjectionMatrix();}const r=this.ct.parentElement.getBoundingClientRect();this.ct.width=Math.round(r.width*Math.min(devicePixelRatio,1.5));this.ct.height=Math.round(r.height*Math.min(devicePixelRatio,1.5));this.dirtyCT=true;}
 snapshot(){return {selected:this.selected,slice:this.slice,view:this.view,anatomy:{position:this.anatomy.camera.position.toArray(),target:this.anatomy.controls.target.toArray()},scope:{position:this.scope.camera.position.toArray(),target:this.scope.controls.target.toArray()}};}
 restore(s){this.selected=s.selected;this.setSlice(s.slice);this.setScopeView(s.view);for(const key of ['anatomy','scope'])if(s[key]){this[key].camera.position.fromArray(s[key].position);this[key].controls.target.fromArray(s[key].target);}this.effect=null;this.updateMaterials();this.updateLabels();}
 animate(){if(!this.running)return;this.animationId=requestAnimationFrame(()=>this.animate());for(const v of [this.anatomy,this.scope]){v.controls.update();if(v.canvas.parentElement.offsetWidth)v.renderer.render(v.scene,v.camera);}if(this.dirtyCT&&this.ct.width)this.drawCT();this.frames++;const now=performance.now();if(now-this.last>1200){this.fps=Math.round(this.frames*1000/(now-this.last));this.frames=0;this.last=now;}const veil=document.getElementById('bleeding-veil');if(veil)veil.style.opacity=this.effect==='bleeding'?String(this.effectProgress*.8):'0';}
 destroy(){this.running=false;cancelAnimationFrame(this.animationId);this.observer.disconnect();for(const v of [this.anatomy,this.scope]){v.controls.dispose();v.renderer.dispose();}}
}
