import {Vector3,MathUtils,MOUSE,TOUCH} from './vendor/three.module.js';

export const DETAIL_ZOOM_LIMITS={min:1,max:800};

/** Bounds of the structures actually drawn; overlays never define the frame. */
export function visibleModelFrame(items){
  const visible=[...items].filter(({mesh,meta})=>mesh.visible&&mesh.material.opacity>.001&&!['planning','annotation'].includes(meta.group));
  if(!visible.length)return null;
  const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
  for(const {meta} of visible)for(let axis=0;axis<3;axis++){
    low[axis]=Math.min(low[axis],meta.bounds[0][axis]);high[axis]=Math.max(high[axis],meta.bounds[1][axis]);
  }
  return {center:low.map((n,i)=>(n+high[i])/2),bounds:[low,high]};
}

/** Perspective fit includes depth: front corners need more space than back. */
export function fitBoundsDistance(bounds,center,direction,up,fov,aspect,padding=1.2){
  const back=direction.clone().normalize(),right=new Vector3().crossVectors(up,back);
  if(right.lengthSq()<1e-8)right.crossVectors(new Vector3(0,1,0),back);
  right.normalize();const screenUp=new Vector3().crossVectors(back,right).normalize();
  const tanV=Math.tan(MathUtils.degToRad(fov/2)),tanH=tanV*Math.max(.01,aspect);
  let distance=.1;
  for(const x of bounds.map(b=>b[0]))for(const y of bounds.map(b=>b[1]))for(const z of bounds.map(b=>b[2])){
    const relative=new Vector3(x,y,z).sub(center),depth=relative.dot(back);
    distance=Math.max(distance,depth+padding*Math.abs(relative.dot(right))/tanH,depth+padding*Math.abs(relative.dot(screenUp))/tanV);
  }
  return distance;
}

/** Fit a real bounding sphere at every viewport aspect, including deep geometry. */
export function fitDistance(radius,fov,aspect,padding=1.16){
  const vertical=MathUtils.degToRad(fov/2),horizontal=Math.atan(Math.tan(vertical)*Math.max(aspect,.01));
  return Math.max(radius,.1)*padding/Math.sin(Math.min(vertical,horizontal));
}

/** Camera-only interaction; never translates or scales the patient geometry. */
export class DetailCamera {
  constructor(view,onChange=()=>{}){
    this.view=view;this.onChange=onChange;this.anchor=new Vector3();this.direction=new Vector3(.8,-1,.35).normalize();
    this.radius=20;this.bounds=null;this.baseDistance=0;this.ready=false;this.mode='rotate';
    const c=view.controls;c.enableDamping=false;c.enablePan=true;c.enableZoom=true;c.screenSpacePanning=true;c.zoomToCursor=false;
    c.zoomSpeed=.9;c.panSpeed=1;c.rotateSpeed=.75;c.enabled=false;
    c.mouseButtons.MIDDLE=MOUSE.DOLLY;c.mouseButtons.RIGHT=MOUSE.PAN;c.touches.TWO=TOUCH.DOLLY_PAN;
    c.addEventListener('change',()=>{this.updateClipping();this.onChange(this);});this.setMode('rotate');
  }
  clear(){this.ready=false;this.view.controls.enabled=false;this.onChange(this);}
  setMode(mode){
    this.mode=mode==='pan'?'pan':'rotate';const c=this.view.controls;
    c.mouseButtons.LEFT=this.mode==='pan'?MOUSE.PAN:MOUSE.ROTATE;
    c.touches.ONE=this.mode==='pan'?TOUCH.PAN:TOUCH.ROTATE;
    this.onChange(this);
  }
  focus(center,bounds,direction,{preserveDirection=false}={}){
    // CT focus can lie near one edge of a segment. Frame its bounds centrally;
    // the separately rendered CT cursor keeps the exact selected patient point.
    this.anchor.fromArray(bounds?bounds[0].map((n,i)=>(n+bounds[1][i])/2):center);this.radius=20;
    this.bounds=bounds?[bounds[0].map((n,i)=>Math.min(n,this.anchor.getComponent(i)-20)),bounds[1].map((n,i)=>Math.max(n,this.anchor.getComponent(i)+20))]:null;
    if(this.bounds)for(const x of this.bounds.map(b=>b[0]))for(const y of this.bounds.map(b=>b[1]))for(const z of this.bounds.map(b=>b[2]))
      this.radius=Math.max(this.radius,this.anchor.distanceTo(new Vector3(x,y,z)));
    if(direction)this.direction.fromArray(direction).normalize();
    this.ready=true;this.view.controls.enabled=true;this.fit(!preserveDirection);
  }
  calculateBase(direction=this.view.camera.position.clone().sub(this.view.controls.target).normalize()){
    const camera=this.view.camera;
    return this.bounds?fitBoundsDistance(this.bounds,this.anchor,direction,camera.up,camera.fov,camera.aspect):fitDistance(this.radius,camera.fov,camera.aspect);
  }
  setLimits(){const c=this.view.controls;c.minDistance=this.baseDistance*100/DETAIL_ZOOM_LIMITS.max;c.maxDistance=this.baseDistance*100/DETAIL_ZOOM_LIMITS.min;}
  updateClipping(){
    if(!this.ready)return;
    const {camera,controls}=this.view,distance=camera.position.distanceTo(controls.target);
    const near=Math.max(.1,distance/1000),far=Math.max(5000,distance*2+this.radius*2);
    if(camera.near!==near||camera.far!==far){camera.near=near;camera.far=far;camera.updateProjectionMatrix();}
  }
  get percent(){return this.ready?100*this.baseDistance/Math.max(this.view.camera.position.distanceTo(this.view.controls.target),.001):100;}
  setPercent(percent){
    if(!this.ready)return;
    const {camera,controls}=this.view,offset=camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(offset,this.baseDistance*100/MathUtils.clamp(percent,DETAIL_ZOOM_LIMITS.min,DETAIL_ZOOM_LIMITS.max));
    controls.update();this.onChange(this);
  }
  zoomBy(factor){this.setPercent(this.percent*factor);}
  panPixels(dx,dy,height){
    if(!this.ready||height<=0)return;
    const {camera,controls}=this.view;camera.updateMatrixWorld(true);
    const units=2*camera.position.distanceTo(controls.target)*Math.tan(MathUtils.degToRad(camera.fov/2))/height;
    const shift=new Vector3().setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(-dx*units)
      .addScaledVector(new Vector3().setFromMatrixColumn(camera.matrixWorld,1),dy*units);
    camera.position.add(shift);controls.target.add(shift);controls.update();this.onChange(this);
  }
  centerOn(point=this.anchor.toArray()){
    if(!this.ready)return;
    const {camera,controls}=this.view,newCenter=new Vector3(...point),shift=newCenter.clone().sub(controls.target);
    camera.position.add(shift);controls.target.copy(newCenter);controls.update();this.onChange(this);
  }
  fit(resetDirection=false){
    if(!this.ready)return;
    const {camera,controls}=this.view,offset=resetDirection?this.direction.clone():camera.position.clone().sub(controls.target).normalize();
    this.baseDistance=this.calculateBase(offset);this.setLimits();controls.target.copy(this.anchor);
    camera.position.copy(this.anchor).addScaledVector(offset,this.baseDistance);this.updateClipping();
    controls.update();this.onChange(this);
  }
  resize(){
    if(!this.ready)return;
    const {camera,controls}=this.view,next=this.calculateBase(),ratio=next/this.baseDistance;
    const offset=camera.position.clone().sub(controls.target).multiplyScalar(ratio);
    controls.target.sub(this.anchor).multiplyScalar(ratio).add(this.anchor);
    camera.position.copy(controls.target).add(offset);this.baseDistance=next;this.setLimits();
    controls.update();this.onChange(this);
  }
}
