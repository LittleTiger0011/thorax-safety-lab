import {trianglePlaneSegments,voxelToPlane} from './case-library-core.js';

export const LESION_STYLE=Object.freeze({color:'#ff344b',gapMm:1.5,minGapPx:3,linePx:1.6});

// Weld triangle intersection endpoints, keeping separate closed contours.
// Open chains are never closed speculatively.
export function closedContours(lines,tolerance=1e-4){
  const nodes=[],bins=new Map(),edges=[],edgeKeys=new Set();
  function node(point){
    const cell=point.map(x=>Math.floor(x/tolerance));
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const id of bins.get(`${cell[0]+dx},${cell[1]+dy}`)||[]){
      if(Math.hypot(nodes[id].point[0]-point[0],nodes[id].point[1]-point[1])<=tolerance)return id;
    }
    const id=nodes.length,key=cell.join(',');nodes.push({point,edges:[]});if(!bins.has(key))bins.set(key,[]);bins.get(key).push(id);return id;
  }
  for(const [a,b] of lines){
    const x=node(a),y=node(b),key=x<y?`${x}/${y}`:`${y}/${x}`;
    if(x===y||edgeKeys.has(key))continue;edgeKeys.add(key);
    const id=edges.length;edges.push([x,y]);nodes[x].edges.push(id);nodes[y].edges.push(id);
  }
  const used=new Set(),loops=[];let openChains=0;
  for(let edge=0;edge<edges.length;edge++){
    if(used.has(edge))continue;
    const [start,next]=edges[edge],path=[start,next];used.add(edge);let current=next;
    while(current!==start&&path.length<=edges.length+1){
      const candidates=nodes[current].edges.filter(e=>!used.has(e));if(!candidates.length)break;
      const e=candidates[0],pair=edges[e];used.add(e);current=pair[0]===current?pair[1]:pair[0];path.push(current);
    }
    if(current!==start){openChains++;continue;}
    const polygon=path.slice(0,-1).map(i=>nodes[i].point);
    const area=polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2;
    if(polygon.length>=3&&Math.abs(area)>1e-7)loops.push(polygon);
  }
  return {loops,openChains};
}

export function lesionSliceContours(meshes,plane,index,ct){
  const axis=plane==='axial'?2:plane==='coronal'?1:0,loops=[];let openChains=0;
  for(const {meta,voxelPositions,indices} of meshes){
    if(meta.group!=='nodule')continue;
    const lines=trianglePlaneSegments(voxelPositions,indices,axis,index).map(line=>line.map(v=>voxelToPlane(v,plane,ct)));
    const result=closedContours(lines);loops.push(...result.loops);openChains+=result.openChains;
  }
  return {loops,openChains};
}

export function contourDisplayGeometry(loops,rect,style=LESION_STYLE){
  const {spec,x,y,width,height}=rect,pxPerMm=width/(spec.width*spec.sx);
  return {
    polygons:loops.map(loop=>loop.map(p=>[x+(p[0]+.5)/spec.width*width,y+(p[1]+.5)/spec.height*height])),
    gap:Math.max(style.minGapPx,style.gapMm*pxPerMm),lineWidth:style.linePx
  };
}

function paintExpanded(context,polygons,radius,color){
  context.fillStyle=color;context.strokeStyle=color;context.lineWidth=2*radius;context.lineJoin='round';context.lineCap='round';
  for(const polygon of polygons){
    context.beginPath();context.moveTo(...polygon[0]);for(const p of polygon.slice(1))context.lineTo(...p);context.closePath();context.fill();context.stroke();
  }
}

export class LesionOverlay{
  constructor(){this.key=null;this.contours={loops:[],openChains:0};this.mask=document.createElement('canvas');this.patch=document.createElement('canvas');}
  getContours({key,meshes,plane,index,ct}){
    if(this.key!==key){this.contours=lesionSliceContours(meshes,plane,index,ct);this.key=key;}
    return this.contours;
  }
  draw(context,{key,meshes,plane,index,ct,rect,base}){
    const result=this.getContours({key,meshes,plane,index,ct});if(!result.loops.length)return result;
    const ratio=context.getTransform().a,w=context.canvas.width,h=context.canvas.height;
    for(const canvas of [this.mask,this.patch]){if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;}
    const mask=this.mask.getContext('2d'),patch=this.patch.getContext('2d');
    const {polygons,gap,lineWidth}=contourDisplayGeometry(result.loops,rect);
    mask.setTransform(1,0,0,1,0,0);mask.clearRect(0,0,w,h);mask.globalCompositeOperation='source-over';mask.setTransform(ratio,0,0,ratio,0,0);
    paintExpanded(mask,polygons,gap+lineWidth/2,'#fff');
    // Restore the current windowed CT, without segment tint or automatic labels,
    // throughout the lesion and its small surrounding clearance.
    patch.setTransform(1,0,0,1,0,0);patch.globalCompositeOperation='source-over';patch.clearRect(0,0,w,h);patch.setTransform(ratio,0,0,ratio,0,0);
    patch.imageSmoothingEnabled=true;patch.drawImage(base,rect.x,rect.y,rect.width,rect.height);
    patch.setTransform(1,0,0,1,0,0);patch.globalCompositeOperation='destination-in';patch.drawImage(this.mask,0,0);patch.globalCompositeOperation='source-over';
    context.drawImage(this.patch,0,0,w/ratio,h/ratio);
    // Outer-minus-inner expanded shapes: a thin reference ring, no lesion fill.
    mask.globalCompositeOperation='source-in';mask.fillStyle=LESION_STYLE.color;mask.fillRect(0,0,w/ratio,h/ratio);
    mask.globalCompositeOperation='destination-out';paintExpanded(mask,polygons,gap-lineWidth/2,'#fff');mask.globalCompositeOperation='source-over';
    context.drawImage(this.mask,0,0,w/ratio,h/ratio);
    return result;
  }
}
