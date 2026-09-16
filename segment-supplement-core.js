import {overlayRGBA} from './segment-atlas-core.js';

export function mergeSourceAndCandidate(source,candidate,codeCount){
  if(source.length!==candidate.length||codeCount<1||codeCount>31)throw new Error('补标体数据尺寸或编码不一致');
  const merged=new Uint32Array(source);
  for(let i=0;i<candidate.length;i++){
    const id=candidate[i];
    if(id>codeCount)throw new Error('肺段标注编号超出目录');
    if(!source[i]&&id)merged[i]=1<<(id-1);
  }
  return merged;
}

export function annotateProvenance(items,sourceBits){
  return items.map(item=>{
    let sourcePixels=0;
    for(const bit of sourceBits)if(bit&item.bit)sourcePixels++;
    return {...item,sourcePixels,candidatePixels:item.pixels-sourcePixels};
  });
}

export function reviewOverlayRGBA(bits,sourceBits,width,segments,options){
  // Author-approved additions use exactly the original segment renderer.
  return overlayRGBA(bits,width,segments,options);
}
