import {fetchJSON,fetchGzip,decodeVolume,planeSpec,sliceRGBA} from './case-library-core.js';
import {decodeAtlas,atlasSlice,summarizeSlice,overlayRGBA} from './segment-atlas-core.js';
import {fullSegmentName} from './segment-course-data.js';
const $=id=>document.getElementById(id);
const COLORS=['#f4c76a','#76c9bd','#eb9398','#b6a0ef','#f0ab68','#73bdeb','#dcba74','#a5ca7a','#d89cce','#8faaf1','#f4c76a','#76c9bd','#b6a0ef','#f0ab68','#73bdeb','#a5ca7a','#d89cce','#8faaf1'];
const LOBES={RUL:'右上叶',RML:'右中叶',RLL:'右下叶',LUL:'左上叶',LLL:'左下叶'};
let catalog,caseData,ctVolume,sourceVolume,candidateVolume,sourceMeta,active,abort,epoch=0;
let indices=[0,0,0];
const panels=['raw','source','candidate'];
const views=[...document.querySelectorAll('.view')];
function palette(){return catalog.labelCodes.map((code,i)=>({code,bit:1<<i,color:COLORS[i]}));}
function status(message){$('status').textContent=message;}
function option(value,label){const o=document.createElement('option');o.value=value;o.textContent=label;return o;}
function rowCell(tr,text,className){const td=document.createElement('td');td.textContent=text;if(className)td.className=className;tr.append(td);return td;}

async function loadCase(id){
  abort?.abort();abort=new AbortController();const {signal}=abort;const token=++epoch;
  caseData=null;document.body.classList.add('loading');status(`正在载入 ${id} 的CT与两种覆盖…`);
  $('case').value=id;active=catalog.cases.find(c=>c.id===id);
  try{
    const [meta,atlas]=await Promise.all([fetchJSON(`./real-cases/${id}/case.json`,signal),fetchJSON(`./segment-atlas/${id}/atlas.json`,signal)]);
    if(active.ctSha256!==meta.ct.sha256||atlas.ctSha256!==meta.ct.sha256||active.sourceAtlasSha256!==atlas.labels.sha256||String(active.dimensions)!==String(meta.ct.dimensions))throw new Error('病例坐标、源标注或CT版本与实验记录不一致');
    const [ct,source,candidate]=await Promise.all([
      fetchGzip(`./real-cases/${id}/${meta.ct.asset}`,meta.ct,signal),
      fetchGzip(`./segment-atlas/${id}/${atlas.labels.asset}`,atlas.labels,signal),
      fetchGzip(`./segment-experiment-data/${active.asset}`,active,signal)
    ]);
    if(token!==epoch)return;
    const nextCandidate=new Uint8Array(candidate);
    if(nextCandidate.some(v=>v>catalog.labelCodes.length))throw new Error('肺段标签编号超出目录范围');
    ctVolume=decodeVolume(ct,meta.ct);sourceVolume=decodeAtlas(source,atlas);candidateVolume=nextCandidate;
    caseData=meta;sourceMeta=atlas;indices=meta.ct.dimensions.map(n=>Math.floor(n/2));indices[2]=meta.ct.initialSlice;
    $('case-link').href=`./#${id}`;
    $('facts').textContent=`${id} · 本例可对照 ${active.segments.length} 个源段，平均Dice ${active.meanDice.toFixed(3)}。${active.blockedLobes.length?'未计算：'+active.blockedLobes.map(l=>LOBES[l.lobe]).join('、')+'。':''} 此处保存合并前模型输出。`;
    location.hash=id;document.body.classList.remove('loading');center();render();
  }catch(error){
    if(token!==epoch||error.name==='AbortError')return;
    caseData=null;document.body.classList.remove('loading');status(`载入失败：${error.message}`);
    for(const id of panels){const c=$(id);c.getContext('2d').clearRect(0,0,c.width,c.height);}
  }
}

function center(){requestAnimationFrame(()=>views.forEach(v=>{v.scrollLeft=Math.max(0,(v.scrollWidth-v.clientWidth)/2);v.scrollTop=Math.max(0,(v.scrollHeight-v.clientHeight)/2);}));}
function render(){
  if(!caseData)return;
  const ct=caseData.ct,plane=$('plane').value,spec=planeSpec(plane,ct),index=indices[spec.axis];
  $('slice').max=ct.dimensions[spec.axis]-1;$('slice').value=index;$('slice-value').textContent=`${index+1} / ${ct.dimensions[spec.axis]} 层`;
  const sourceBits=atlasSlice(sourceVolume,ct,plane,index),candidateIds=atlasSlice(candidateVolume,ct,plane,index);
  const candidateBits=Uint32Array.from(candidateIds,value=>value?1<<(value-1):0);
  const segments=palette(),selected=$('segment').value,bit=selected==='all'?0:1<<catalog.labelCodes.indexOf(selected);
  const filtered=bit?segments.filter(s=>s.bit===bit):segments;
  const gray=sliceRGBA(ctVolume,plane,index,ct,-600,1500);
  for(const [i,id] of panels.entries()){
    const canvas=$(id),context=canvas.getContext('2d');canvas.width=spec.width;canvas.height=spec.height;
    const bits=i===1?sourceBits:i===2?candidateBits:null;
    const pixels=new Uint8ClampedArray(gray);
    if(bits){
      const overlay=overlayRGBA(bits,spec.width,segments,{mode:$('overlay').value,opacity:Number($('opacity').value)/100,selectedBit:bit,onlySelected:bit!==0});
      for(let k=0;k<pixels.length;k+=4){const alpha=overlay[k+3]/255;for(let c=0;c<3;c++)pixels[k+c]=Math.round(pixels[k+c]*(1-alpha)+overlay[k+c]*alpha);}
    }
    context.putImageData(new ImageData(pixels,spec.width,spec.height),0,0);
    context.font='10px sans-serif';context.lineWidth=3;context.strokeStyle='#001018';context.fillStyle='#eaf4f6';
    function text(t,x,y){context.strokeText(t,x,y);context.fillText(t,x,y);}
    text(spec.labels[2],5,14);text(spec.labels[3],spec.width-13,14);text(spec.labels[0],spec.width/2,13);text(spec.labels[1],spec.width/2,spec.height-5);
    const items=bits?summarizeSlice(bits,spec.width,filtered):[];
    if(bits&&$('names').checked){
      for(const item of items){const [x,y]=item.anchor;context.fillStyle='#fff';text(item.code,Math.max(4,Math.min(spec.width-42,x)),Math.max(13,Math.min(spec.height-26,y)));}
    }
    if(bits){
      const names=$(`${id}-names`);names.replaceChildren();
      if(!$('names').checked)names.textContent='段名已关闭';
      else if(!items.length)names.textContent=i===1?'本层没有符合选择的源标签':'本层没有符合选择的预测标签';
      else for(const item of items){const label=document.createElement('span');label.className='chip';label.style.setProperty('--color',item.color);label.textContent=fullSegmentName(item.code);names.append(label);}
    }
    const holder=canvas.parentElement,aspect=spec.width*spec.sx/(spec.height*spec.sy),fit=Math.min(holder.clientWidth-22,(holder.clientHeight-22)*aspect),width=Math.max(1,fit*Number($('zoom').value)/100);
    canvas.style.width=`${width}px`;canvas.style.height=`${width/aspect}px`;
  }
  $('zoom-value').textContent=`${$('zoom').value}%`;
  const metric=active.segments.find(s=>s.code===selected);
  status(`${caseData.id} · ${$('plane').selectedOptions[0].textContent} · ${selected==='all'?'显示本层全部标签':fullSegmentName(selected)}${metric?' · 与源标注Dice '+metric.savedFileDiceWithinSourceLobe.toFixed(3):selected!=='all'?' · 缺少独立源对照，不能确认正确性':''}`);
}

$('case').addEventListener('change',()=>loadCase($('case').value));
$('plane').addEventListener('change',()=>{render();center();});
for(const id of ['segment','overlay','names','opacity'])$(id).addEventListener('input',render);
$('zoom').addEventListener('input',()=>{render();center();});
$('fit').addEventListener('click',()=>{$('zoom').value=100;render();center();});
$('slice').addEventListener('input',()=>{if(caseData){indices[planeSpec($('plane').value,caseData.ct).axis]=Number($('slice').value);render();}});
for(const [id,direction] of [['previous',-1],['next',1]])$(id).addEventListener('click',()=>{if(!caseData)return;const axis=planeSpec($('plane').value,caseData.ct).axis;indices[axis]=Math.max(0,Math.min(caseData.ct.dimensions[axis]-1,indices[axis]+direction));render();});
$('focus').addEventListener('click',()=>{if(!caseData)return;const segment=sourceMeta.segments.find(s=>s.code===$('segment').value);if(!segment){status('当前选择没有可定位的源标注，请选择一个已有源段。');return;}indices=[...segment.peaks];render();center();});
for(const view of views){let drag=null;view.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')return;drag={x:event.clientX,y:event.clientY,left:view.scrollLeft,top:view.scrollTop};view.setPointerCapture(event.pointerId);view.classList.add('dragging');});view.addEventListener('pointermove',event=>{if(!drag)return;view.scrollLeft=drag.left+drag.x-event.clientX;view.scrollTop=drag.top+drag.y-event.clientY;});for(const name of ['pointerup','pointercancel','lostpointercapture'])view.addEventListener(name,()=>{drag=null;view.classList.remove('dragging');});}
new ResizeObserver(()=>{render();center();}).observe(document.querySelector('.slab'));

try{
  catalog=await fetchJSON('./segment-experiment-data/catalog.json');
  if(catalog.purpose!=='development-error-review-only'||catalog.teacherAnswersAllowed!==false)throw new Error('实验目录用途声明缺失');
  $('case').replaceChildren(...catalog.cases.map(c=>option(c.id,c.id)));
  for(const code of catalog.labelCodes)$('segment').append(option(code,fullSegmentName(code)));
  for(const c of catalog.cases){const tr=document.createElement('tr'),cell=rowCell(tr,'');const button=document.createElement('button');button.textContent=c.id;button.addEventListener('click',()=>{loadCase(c.id);$('case').focus();window.scrollTo({top:0,behavior:'smooth'});});cell.append(button);rowCell(tr,c.segments.length);rowCell(tr,c.meanDice.toFixed(3));rowCell(tr,c.segments.filter(s=>s.savedFileDiceWithinSourceLobe<.5).map(s=>s.code).join('、')||'无','low');rowCell(tr,c.blockedLobes.map(l=>LOBES[l.lobe]).join('、')||'无');$('results').append(tr);}
  const requested=location.hash.slice(1),initial=catalog.cases.some(c=>c.id===requested)?requested:'CT-015';
  $('segment').value='RS9';await loadCase(initial);
}catch(error){status(`实验目录载入失败：${error.message}`);}
