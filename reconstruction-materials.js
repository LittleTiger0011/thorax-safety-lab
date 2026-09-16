import {parentSegment} from './segment-atlas-core.js';
import {LOBE_GROUPS,SEGMENTS,fullSegmentName} from './segment-course-data.js';

export const UNSTAINED_COLOR='#c9ced3';
export const TRANSLUCENT_OPACITY=.35;
export const isLungSurface=meta=>['lobe','segment'].includes(meta.group);

// Targets contain only this case's original meshes. A parent segment is the
// union of supplied source parts, never an inferred complete anatomical region.
export function reconstructionTargets(structures){
  const lobes=structures.filter(s=>s.group==='lobe'),segments=structures.filter(s=>s.group==='segment');
  return [
    {key:'all:lobes',section:'批量调整',label:'全部肺叶',ids:lobes.map(s=>s.id)},
    {key:'all:segments',section:'批量调整',label:'全部源肺段 / 亚段',ids:segments.map(s=>s.id)},
    ...LOBE_GROUPS.map(l=>({key:`lobe:${l.id}`,section:'肺叶',label:l.name,ids:lobes.filter(s=>s.name===l.name).map(s=>s.id)})),
    ...SEGMENTS.map(s=>({key:`segment:${s.code}`,section:'肺段 · 按已提供的源模型汇总',label:fullSegmentName(s.code),ids:segments.filter(m=>parentSegment(m.name)===s.code).map(m=>m.id)})),
    ...segments.map(s=>({key:`source:${s.id}`,section:'单独调整源肺段 / 亚段',label:s.name,ids:[s.id]}))
  ];
}

export function setSurfaceMaterial(mesh,{color,opacity,visible}){
  const material=mesh.material,transparent=opacity<1;
  if(material.transparent!==transparent)material.needsUpdate=true;
  material.color.set(color);material.opacity=opacity;
  material.transparent=transparent;material.depthWrite=!transparent;
  material.vertexColors=false;material.emissive.set(0x000000);material.emissiveIntensity=0;
  mesh.renderOrder=transparent?2:0;mesh.visible=visible;
}

export class ReconstructionMaterials{
  constructor(){this.cases=new Map();this.meshes=new Map();this.caseId=null;}
  bind(caseId,meshes){this.caseId=caseId;this.meshes=meshes;if(!this.cases.has(caseId))this.cases.set(caseId,new Map());}
  unbind(){this.caseId=null;this.meshes=new Map();}
  get overrides(){return this.cases.get(this.caseId);}
  current(id){
    const item=this.meshes.get(id);if(!item||!isLungSurface(item.meta))return null;
    return this.overrides?.get(id)||{color:`#${item.mesh.material.color.getHexString()}`,opacity:item.mesh.material.opacity,visible:item.mesh.visible,stained:true};
  }
  edit(ids,action,value){
    for(const id of ids){
      const state=this.current(id),item=this.meshes.get(id);if(!state)continue;
      const next={...state};
      if(action==='solid'){next.opacity=1;next.visible=true;}
      else if(action==='translucent'){next.opacity=TRANSLUCENT_OPACITY;next.visible=true;}
      else if(action==='clear-color'){next.color=UNSTAINED_COLOR;next.stained=false;}
      else if(action==='color'){
        if(!/^#[0-9a-f]{6}$/i.test(value))continue;
        next.color=value.toLowerCase();next.stained=true;next.visible=true;if(!next.opacity)next.opacity=TRANSLUCENT_OPACITY;
      }
      else if(action==='source-color'){next.color=item.meta.sourceColor||item.meta.color;next.stained=true;}
      else if(action==='opacity'){
        const n=Number(value);if(!Number.isFinite(n))continue;
        next.opacity=Math.min(1,Math.max(0,n));next.visible=next.opacity>0;
      }
      else if(action==='visibility'){next.visible=Boolean(value);if(next.visible&&!next.opacity)next.opacity=TRANSLUCENT_OPACITY;}
      else continue;
      this.overrides.set(id,next);
    }
    this.apply();
  }
  reveal(id){this.edit([id],'visibility',true);}
  apply(){for(const [id,state] of this.overrides||[]){const item=this.meshes.get(id);if(item)setSurfaceMaterial(item.mesh,state);}}
  reset(){this.overrides?.clear();}
}
