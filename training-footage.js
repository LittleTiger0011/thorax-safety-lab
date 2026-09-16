import {AssessmentMedia} from './assessment-media.js';

const base='./or-field/clean/';
export const TRAINING_FOOTAGE=Object.freeze([
 {id:'01',title:'显露肺门',video:'step01_hilar_expose',duration:'1:12',source:'左上肺叶切除 · 肺门显露',note:'观察组织打开后显露的管状轮廓，以及器械与邻近组织的关系。',frames:[['s01_white_tube','灰白管状结构'],['s01_energy_on_sheath','表面分离视角']]},
 {id:'02',title:'管道游离',video:'step02_pa_isolation',duration:'1:27',source:'左上肺叶切除 · 肺门游离',note:'沿连续画面观察分叉、近端与后方通道；分支编号需另结合患者影像核对。',frames:[['s02_enter_hilum','进入肺门'],['s02_y_clear','分叉全貌'],['s02_y_vessel','分叉近观'],['s02_energy_pair','器械配合'],['s02_behind_vessel','后方通道'],['s02_pass_behind','穿行视角'],['s02_isolated','游离后观察']]},
 {id:'03',title:'闭合就位',video:'step03_stapler',duration:'0:42',source:'左上肺叶切除 · 闭合器械',note:'观察钉仓、目标组织与周围保留结构；器械进入术野与击发前确认是不同步骤。',frames:[['s03_stapler_ready','器械进入'],['s03_stapler_jaws','钉仓与目标']]},
 {id:'04',title:'圆形视野对照',video:'step04_circular_optics',duration:'1:02',source:'单操作孔 RS8 · 另一患者、另一术式',note:'观察镜头光阑、边缘变暗和视角变化。本段与前三段分开学习。',frames:[['s04_port_tunnel','入路视角'],['s04_a8_energy','分离视角'],['s04_white_vessel','管状轮廓'],['s04_energy_distal','远端视角']]},
]);

export function footageForQuestion(q){
 const match=q?.visual?.src?.match(/\/s(\d{2})_/);
 if(match)return match[1];
 return {vessels:'02',airway:'03',safety:'03'}[q?.skill]||null;
}

export class TrainingFootage{
 constructor(root,{clip='02',compact=false,switchable=true,onLearn=()=>{}}={}){
  this.root=root;this.compact=compact;this.switchable=switchable;this.onLearn=onLearn;this.positions={};this.destroyed=false;
  this.show(clip);
 }
 stop(){
  this.still?.destroy();this.still=null;
  const video=this.root.querySelector('video');
  if(video){if(Number.isFinite(video.currentTime))this.positions[this.clip?.id]=video.currentTime;video.pause?.();video.removeAttribute('src');video.load?.();}
  this.events?.abort();
 }
 show(id){
  this.stop();this.clip=TRAINING_FOOTAGE.find(c=>c.id===id)||TRAINING_FOOTAGE[1];const c=this.clip;
  this.events=new AbortController();const events={signal:this.events.signal};
  this.root.innerHTML=`<section class="tf-player ${this.compact?'tf-compact':''}" aria-label="真实手术视频与关键帧">
   <header class="tf-heading"><div><span>真实术野 · 视频与关键帧</span><h3>${c.title}</h3></div><span class="tf-duration">${c.duration}</span></header>
   ${this.switchable?`<div class="tf-clips" aria-label="选择手术视频">${TRAINING_FOOTAGE.map(clip=>`<button type="button" data-footage-clip="${clip.id}" aria-pressed="${clip.id===c.id}"><img src="${base}posters/step${clip.id}.jpg" alt="" loading="lazy"><span>${clip.title}<small>${clip.duration}</small></span></button>`).join('')}</div>`:''}
   <div class="tf-layout"><div class="tf-view">
    <video controls playsinline preload="metadata" poster="${base}posters/step${c.id}.jpg" src="${base}video/${c.video}.mp4" aria-label="${c.source}教学录像"></video>
    <div class="tf-still assessment-lab" hidden></div>
    <div class="tf-error" role="status" hidden>录像暂未加载，可重试或先查看下方关键帧。<button type="button" data-footage-retry>重新加载录像</button></div>
    <div class="tf-playback"><button type="button" data-footage-video>播放录像</button><button type="button" data-footage-rate aria-label="切换播放速度">1× 播放</button><span>可暂停、拖动进度、全屏观察</span></div>
    <p class="tf-source">${c.source} · 公开教学录像</p>
   </div><aside class="tf-frames"><div><h4>关键帧对照</h4><p>点击图片放大，可缩放、平移和居中。</p></div><div class="tf-filmstrip">${c.frames.map(([name,label])=>`<button type="button" data-footage-frame="${name}"><img src="${base}frames/${name}.jpg" alt="${label}" loading="lazy"><span>${label}</span></button>`).join('')}</div><p class="tf-observe">${c.note}</p></aside></div>
  </section>`;
  this.root.querySelectorAll('[data-footage-clip]').forEach(b=>b.addEventListener('click',()=>{this.show(b.dataset.footageClip);this.learn('clip');},events));
  this.root.querySelectorAll('[data-footage-frame]').forEach(b=>b.addEventListener('click',()=>this.showFrame(b.dataset.footageFrame),events));
  const video=this.root.querySelector('video');
  video.addEventListener('loadedmetadata',()=>{if(this.positions[c.id])video.currentTime=Math.min(this.positions[c.id],video.duration||this.positions[c.id]);},events);
  video.addEventListener('play',()=>{if(!this.loggedPlay){this.learn('play');this.loggedPlay=true;}this.root.querySelector('[data-footage-video]').textContent='暂停录像';},events);
  video.addEventListener('pause',()=>{this.root.querySelector('[data-footage-video]').textContent=video.hidden?'返回录像':'播放录像';},events);
  video.addEventListener('error',()=>{this.root.querySelector('.tf-error').hidden=false;},events);
  this.root.querySelector('[data-footage-video]').addEventListener('click',()=>{
   if(!video.hidden&&!video.paused){video.pause();return;}
   this.still?.destroy();this.still=null;this.root.querySelector('.tf-still').hidden=true;video.hidden=false;
   const playing=video.play();playing?.catch(()=>{this.root.querySelector('[data-footage-video]').textContent='播放录像';});
  },events);
  this.root.querySelector('[data-footage-rate]').addEventListener('click',e=>{const rates=[1,.5,1.5,2],rate=rates[(rates.indexOf(video.playbackRate)+1)%rates.length];video.playbackRate=rate;e.currentTarget.textContent=rate+'× 播放';},events);
  this.root.querySelector('[data-footage-retry]').addEventListener('click',()=>{this.root.querySelector('.tf-error').hidden=true;video.load();},events);
  this.loggedPlay=false;
 }
 showFrame(name){
  const entry=this.clip.frames.find(frame=>frame[0]===name);if(!entry)return;
  const video=this.root.querySelector('video');video.pause?.();video.hidden=true;
  this.root.querySelector('[data-footage-video]').textContent='返回录像';
  this.still?.destroy();const root=this.root.querySelector('.tf-still');root.classList.remove('al-expanded');root.hidden=false;
  this.still=new AssessmentMedia();this.still.mount(root,{type:'observation',visual:{kind:'frame',src:`${base}frames/${name}.jpg`,caption:entry[1]+' · '+this.clip.source}});
  this.root.querySelectorAll('[data-footage-frame]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.footageFrame===name)));
  this.learn('frame',{frame:name});
 }
 learn(action,extra={}){this.onLearn({action,clip:this.clip.id,learningOnly:true,...extra});}
 destroy(){this.destroyed=true;this.stop();this.root.innerHTML='';}
}
