import {planeSpec,planeToVoxel} from './case-library-core.js';

export function parentSegment(name){return /^([RL]S(?:1\+2|10|[1-9]))[a-c]?$/.exec(name)?.[1]||null;}
export function decodeAtlas(buffer,meta){
  const count=meta.dimensions.reduce((a,b)=>a*b,1);
  if(buffer.byteLength!==count*4||meta.labels.encoding!=='byte-shuffle-4-gzip')throw new Error('肺段覆盖图格式或长度不正确');
  const bytes=new Uint8Array(buffer),labels=new Uint32Array(count);
  for(let i=0;i<count;i++)labels[i]=(bytes[i]|bytes[i+count]<<8|bytes[i+count*2]<<16|bytes[i+count*3]<<24)>>>0;
  return labels;
}
export function labelsAt(labels,point,ct){
  const [x,y,z]=point.map(Math.round),[nx,ny,nz]=ct.dimensions;
  return x<0||y<0||z<0||x>=nx||y>=ny||z>=nz?0:labels[x+nx*(y+ny*z)];
}
export function codesAt(bits,segments){return segments.filter(s=>(bits&s.bit)!==0).map(s=>s.code);}
export function atlasSlice(labels,ct,plane,index){
  const {width,height}=planeSpec(plane,ct),out=new Uint32Array(width*height),[nx,ny,nz]=ct.dimensions;
  for(let v=0;v<height;v++){
    const base=plane==='axial'?index*nx*ny+v*nx:(nz-1-v)*nx*ny+(plane==='coronal'?index*nx:index),stride=plane==='sagittal'?nx:1;
    for(let u=0;u<width;u++)out[u+v*width]=labels[base+u*stride];
  }
  return out;
}
export function summarizeSlice(bits,width,segments){
  const result=[];
  for(const s of segments){
    let count=0,x=0,y=0;
    for(let i=0;i<bits.length;i++)if(bits[i]&s.bit){count++;x+=i%width;y+=Math.floor(i/width);}
    if(!count)continue;
    x/=count;y/=count;let anchor=null,distance=Infinity;
    // Anchor inside the actual sampled territory, not in an exterior centroid.
    for(let i=0;i<bits.length;i++)if(bits[i]&s.bit){const u=i%width,v=Math.floor(i/width),d=(u-x)**2+(v-y)**2;if(d<distance){distance=d;anchor=[u,v];}}
    result.push({...s,pixels:count,anchor});
  }
  return result;
}
export function overlayRGBA(bits,width,segments,{opacity=.28,mode='fill',selectedBit=0,onlySelected=false}={}){
  const rgba=new Uint8ClampedArray(bits.length*4),palette=new Map(segments.map(s=>[s.bit,[1,3,5].map(i=>parseInt(s.color.slice(i,i+2),16))]));
  for(let i=0;i<bits.length;i++){
    const original=bits[i];if(!original||(onlySelected&&!(original&selectedBit)))continue;
    const multiple=(original&(original-1))!==0,color=multiple?[207,209,219]:palette.get(original);if(!color)continue;
    const x=i%width,boundary=x===0||x===width-1||i<width||i>=bits.length-width||bits[i-1]!==original||bits[i+1]!==original||bits[i-width]!==original||bits[i+width]!==original;
    if(mode==='off'||mode==='outline'&&!boundary)continue;
    const k=i*4;rgba.set(color,k);
    rgba[k+3]=Math.round(255*(boundary?Math.min(.9,opacity+0.35):multiple?(Math.floor(i/width)+x)%7<2?.6:opacity:opacity));
  }
  return rgba;
}
export function segmentSliceRange(meta,code,axis,total){
  const s=meta?.segments.find(s=>s.code===code);
  return s?s.ranges[axis]:[0,total-1];
}
export function pointForSliceItem(item,index,plane,ct){return planeToVoxel(...item.anchor,index,plane,ct);}
