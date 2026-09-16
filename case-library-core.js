// All coordinates are DICOM patient LPS in millimeters, including mesh vertices.
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
export const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function voxelToLPS(v, ct) {
  const r=ct.direction.slice(0,3),c=ct.direction.slice(3),n=cross(r,c);
  return ct.origin.map((o,k)=>o+r[k]*v[0]*ct.spacing[0]+c[k]*v[1]*ct.spacing[1]+n[k]*v[2]*ct.spacing[2]);
}
export function lpsToVoxel(p,ct) {
  const d=p.map((v,i)=>v-ct.origin[i]);
  return [ct.direction.slice(0,3),ct.direction.slice(3),cross(ct.direction.slice(0,3),ct.direction.slice(3))]
    .map((a,i)=>dot(d,a)/ct.spacing[i]);
}
export function planeSpec(plane,ct) {
  const [x,y,z]=ct.dimensions,[sx,sy,sz]=ct.spacing;
  if(plane==='coronal')return {width:x,height:z,sx,sy:sz,axis:1,labels:['S','I','R','L']};
  if(plane==='sagittal')return {width:y,height:z,sx:sy,sy:sz,axis:0,labels:['S','I','A','P']};
  return {width:x,height:y,sx,sy,axis:2,labels:['A','P','R','L']};
}
export function planeToVoxel(u,v,index,plane,ct) {
  if(plane==='coronal')return [u,index,ct.dimensions[2]-1-v];
  if(plane==='sagittal')return [index,u,ct.dimensions[2]-1-v];
  return [u,v,index];
}
export function voxelToPlane(v,plane,ct) {
  if(plane==='coronal')return [v[0],ct.dimensions[2]-1-v[2]];
  if(plane==='sagittal')return [v[1],ct.dimensions[2]-1-v[2]];
  return [v[0],v[1]];
}
export function huAt(volume,v,ct) {
  const [x,y,z]=v.map(Math.round),[nx,ny,nz]=ct.dimensions;
  return x<0||y<0||z<0||x>=nx||y>=ny||z>=nz ? null : volume[x+nx*(y+ny*z)];
}
export function windowGray(value,center,width) {
  return Math.round(clamp((value-(center-.5))/(width-1)+.5,0,1)*255);
}
export function sliceRGBA(volume,plane,index,ct,center,width) {
  const spec=planeSpec(plane,ct),rgba=new Uint8ClampedArray(spec.width*spec.height*4);
  const [nx,ny,nz]=ct.dimensions,sliceStride=nx*ny,scale=255/(width-1),offset=.5-(center-.5)/(width-1);
  for(let v=0;v<spec.height;v++) {
    const base=plane==='axial'?index*sliceStride+v*nx:(nz-1-v)*sliceStride+(plane==='coronal'?index*nx:index);
    const stride=plane==='sagittal'?nx:1;
    for(let u=0;u<spec.width;u++) {
      const gray=Math.round(clamp(volume[base+u*stride]*scale+offset*255,0,255)),k=(v*spec.width+u)*4;
      rgba[k]=rgba[k+1]=rgba[k+2]=gray;rgba[k+3]=255;
    }
  }
  return rgba;
}
export function decodeVolume(buffer,ct) {
  const count=ct.dimensions.reduce((a,b)=>a*b,1);
  if(buffer.byteLength!==count*2)throw new Error('CT 数据长度不完整');
  if(ct.encoding==='byte-shuffle-2-gzip') {
    const b=new Uint8Array(buffer),v=new Int16Array(count);
    for(let i=0;i<count;i++)v[i]=b[i]|(b[i+count]<<8);
    return v;
  }
  if(ct.encoding)throw new Error('不支持的 CT 编码');
  return new Int16Array(buffer);
}
export function trianglePlaneSegments(positions,indices,axis,index) {
  const segments=[];
  for(let f=0;f<indices.length;f+=3) {
    const ids=[indices[f],indices[f+1],indices[f+2]],d=ids.map(i=>positions[i*3+axis]-index);
    if(d.every(x=>x>0)||d.every(x=>x<0)||d.every(x=>Math.abs(x)<1e-7))continue;
    const hits=[];
    for(let edge=0;edge<3;edge++) {
      const next=(edge+1)%3,a=ids[edge]*3,b=ids[next]*3,da=d[edge],db=d[next];
      if(da*db>0||Math.abs(da-db)<1e-10)continue;
      const t=da/(da-db),p=[0,1,2].map(k=>positions[a+k]+t*(positions[b+k]-positions[a+k]));
      if(!hits.some(q=>q.every((v,k)=>Math.abs(v-p[k])<1e-6)))hits.push(p);
    }
    if(hits.length===2)segments.push(hits);
  }
  return segments;
}
export async function fetchJSON(url,signal) {
  const r=await fetch(url,{signal});if(!r.ok)throw new Error(`资料读取失败 (${r.status})`);return r.json();
}
export function isGzipMagic(bytes) {
  return Boolean(bytes&&bytes.byteLength>=2&&bytes[0]===0x1f&&bytes[1]===0x8b);
}
async function sha256Hex(bytes) {
  if(!globalThis.crypto?.subtle)return '';
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  return hash;
}
function asArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
}
async function inflateGzip(bytes) {
  if(globalThis.DecompressionStream) {
    return await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  const {gunzipSync}=await import('./vendor/fflate.js');
  return asArrayBuffer(gunzipSync(bytes));
}
/** Accept packed gzip, or a payload already inflated by Safari/GitHub Pages. */
export async function materializeGzip(raw,meta={}) {
  const bytes=raw instanceof Uint8Array?raw:new Uint8Array(raw);
  if(isGzipMagic(bytes)) {
    if(meta.compressedBytes&&bytes.byteLength!==meta.compressedBytes)throw new Error('下载长度校验失败，请重新加载');
    if(meta.sha256) {
      const hash=await sha256Hex(bytes);
      if(hash&&hash!==meta.sha256)throw new Error('影像完整性校验失败，请重新加载');
    }
    const result=await inflateGzip(bytes);
    if(meta.rawBytes&&result.byteLength!==meta.rawBytes)throw new Error('解压长度校验失败');
    return result;
  }
  if(meta.rawBytes&&bytes.byteLength===meta.rawBytes)return asArrayBuffer(bytes);
  throw new Error('下载长度校验失败，请重新加载');
}
export async function fetchGzip(url,meta,signal,onProgress=()=>{}) {
  const r=await fetch(url,{signal});if(!r.ok)throw new Error(`影像资源读取失败 (${r.status})`);
  let raw;
  if(r.body) {
    const reader=r.body.getReader(),chunks=[];let size=0;
    for(;;){const {done,value}=await reader.read();if(done)break;chunks.push(value);size+=value.length;onProgress(size,meta.compressedBytes||size);}
    raw=new Uint8Array(size);let offset=0;for(const chunk of chunks){raw.set(chunk,offset);offset+=chunk.length;}
  } else raw=new Uint8Array(await r.arrayBuffer());
  return materializeGzip(raw,meta);
}
