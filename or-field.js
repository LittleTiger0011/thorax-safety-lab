import {
  hitShape, inMask, displayedMediaRect, clientToNorm, scoreSession, emptySession, summarizeAttempt, mergePlayback,
} from './or-field-core.mjs';
import {sourceDisplayRect} from './field-media.js';

import {loadOrStore,upsertOrAttempt,attemptsForOwner,generation} from './or-field-records.mjs';
import {loadSessions,newSession,persistSessions} from './state.js';
const CALIBRATE=new URLSearchParams(location.search).has('calibrate');
const $ = id=>document.getElementById(id);

const ui={
  intro:$('intro'), app:$('app'), rail:$('rail'),
  vid:$('vid'), still:$('still'), overlay:$('overlay'), stage:$('stage'),
  pauseFlag:$('pause-flag'), cal:$('cal'),
  hudSrc:$('hud-src'), hudClock:$('hud-clock'),
  barFill:$('bar-fill'), barMark:$('bar-mark'),
  btnPlay:$('btn-play'), btnReplay:$('btn-replay'), btnFwd:$('btn-fwd'), btnRate:$('btn-rate'),
  rateLabel:$('rate-label'), bar:$('bar'),
  crumb:$('crumb-step'),
  kicker:$('panel-kicker'), title:$('panel-title'), lead:$('panel-lead'),
  task:$('task-box'), actions:$('panel-actions'), hint:$('panel-hint'),
  cards:$('intro-cards'), disclaimer:$('disclaimer'),
  modal:$('modal'), modalBody:$('modal-body'),
};

let CUR=null;
let epoch=0,answerLocked=false,landmarkLocked=false,restoring=false,lastSavedAt=0;
let owner=null,viewingHistory=false,restoreVideoTime=null,ownerGeneration=null;
let session=emptySession('real-or-field-pa-isolation');
let stepIndex=0;
let phase='intro';
let decisionOpenedAt=0;
let landmarkAttempt=0;
let lastMiss=null;
let calClicks=[];
let revealHotspot=false;
let chosen=null;
let remainderAfterDecision=false;
let allowPassPause=false;
let scrubbing=false;
let stepFilter=null; // null = all, or array of ids
const PLAYBACK_RATES=[0.5,1,1.5,2];

function maskOf(step){
  const m=step.mask;
  if(!m) return null;
  if(typeof m==='string') return CUR.masks[m];
  return m;
}

function findOutline(step, id){
  if(step.outlines&&step.outlines[id]) return step.outlines[id];
  for(const lm of step.landmarks||[]){
    if(lm.id===id && lm.hotspots?.[0]) return lm.hotspots[0];
  }
  for(const s of CUR.steps){
    if(s.outlines&&s.outlines[id]) return s.outlines[id];
    for(const lm of s.landmarks||[]){
      if(lm.id===id && lm.hotspots?.[0]) return lm.hotspots[0];
    }
  }
  return null;
}

function persist(){
 if(!session.id||session.legacy||restoring||viewingHistory)return;
 const step=currentSteps()[stepIndex];
 session.updated_at=Date.now();session.step_index=stepIndex;session.phase=phase;
 session.cursor={stepId:step?.id,phase,videoTime:restoreVideoTime??ui.vid.currentTime??0,rate:ui.vid.playbackRate||1,chosen:chosen?.id,remainderAfterDecision,allowPassPause,lastMiss,revealHotspot,answerLocked,landmarkLocked};
 session.playbackByStep||={};
 if(step&&ui.vid.currentSrc?.includes(step.video)){
  const ranges=[];for(let i=0;i<(ui.vid.played?.length||0);i++)ranges.push([ui.vid.played.start(i),ui.vid.played.end(i)]);
  session.playbackByStep[step.id]=mergePlayback([...(session.playbackByStep[step.id]||[]),...ranges]);
 }
 session.summary=summarizeAttempt(session,CUR);
 const result=upsertOrAttempt(localStorage,session);const status=document.getElementById('or-save-status');if(status)status.textContent=result.ok?(session.kind==='demo'?'教师演示 · 本机记录已保存':'本机记录已保存'):result.error;
 lastSavedAt=Date.now();
}
function log(event,extra={}){
 if(restoring||session.ended_at)return;
 session.log.push({seq:session.log.length+1,t_abs:Date.now(),step_id:currentSteps()[stepIndex]?.id,event,...extra});persist();
}
function later(action,ms){const token=epoch,id=session.id;setTimeout(()=>{if(epoch===token&&session.id===id&&!session.ended_at)action();},ms);}
function exportRecord(){
 const blob=new Blob([JSON.stringify({attempt:session,summary:summarizeAttempt(session,CUR)},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${session.id||'术野'}_术野记录.json`;a.click();URL.revokeObjectURL(url);
}
function history(){
 const store=loadOrStore(localStorage),attempts=[...attemptsForOwner(store,owner.id,owner.kind),...store.attempts.filter(a=>a.legacy)];
 ui.modalBody.innerHTML='<h2>术野练习历史</h2><p>每次记录独立保留；旧版无归属记录不计入当前学习者。</p>'+attempts.map((a,i)=>{const r=summarizeAttempt(a,CUR);return `<p>${a.legacy?'旧版 · 归属未核验':a.kind==='demo'?'教师演示':new Date(a.started_at).toLocaleString()} · 已答 ${r.answered}/${r.required} · 通过 ${r.passed}/${r.required} <button data-history="${i}">查看${a.ended_at||a.legacy?'记录':' / 继续'}</button></p>`;}).join('');
 ui.modalBody.querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>{persist();epoch++;ui.vid.pause();ui.modal.close();const a=attempts[Number(b.dataset.history)];if(a.ended_at||a.legacy){session=a;stepFilter=a.selectedStepIds||null;ui.intro.hidden=true;ui.app.hidden=false;finish('view',true);}else restoreAttempt(a);});ui.modal.showModal();
}

function fmt(sec){
  sec=Math.max(0, sec||0);
  const m=Math.floor(sec/60), s=Math.floor(sec%60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function currentSteps(){
  if(!stepFilter) return CUR.steps;
  return CUR.steps.filter(s=>stepFilter.includes(s.id));
}

async function loadCurriculum(){
  try{
    const r=await fetch('./or-field/script.json', {cache:'no-store'});
    if(!r.ok) throw new Error(r.status);
    return await r.json();
  }catch(e){
    throw new Error('无法读取 or-field/script.json');
  }
}

function renderIntro(){
  ui.disclaimer.textContent=CUR.disclaimer;
  ui.modalBody.textContent=CUR.disclaimer;
  ui.cards.innerHTML=CUR.steps.map(s=>`
    <button type="button" class="card" data-start="${s.id}">
      <img src="./${s.poster}" alt="">
      <div><strong>0${s.index}　${s.name_cn}</strong><span>${s.source_cn}</span></div>
    </button>`).join('');
}

function renderRail(){
  const steps=currentSteps();
  ui.rail.innerHTML=`<p class="eyebrow">STATIONS</p>`+steps.map((s,i)=>{
    const st=summarizeAttempt(session,CUR).steps.find(x=>x.id===s.id);
    const cls=i===stepIndex?'now':(st.completed?'done':'');
    return `<button class="station ${cls}" data-i="${i}">
      <img src="./${s.poster}" alt="">
      <span><strong>0${s.index} ${s.name_cn}</strong><span>${st.completed?'训练通过':st.answered?`已答 ${st.answered}/${st.required}，通过 ${st.passed}`:st.visited?'已浏览·未作答':'未访问'}</span></span>
    </button>`;
  }).join('');
}

function mediaRect(){
  const stage=ui.stage.getBoundingClientRect();
  const media=phase==='landmark'||phase==='consequence'?ui.still:ui.vid;
  const mw=media.videoWidth||media.naturalWidth||1280;
  const mh=media.videoHeight||media.naturalHeight||720;
  const inner={width:ui.stage.clientWidth, height:ui.stage.clientHeight};
  const visible=displayedMediaRect(inner.width, inner.height, mw, mh);
  const r=sourceDisplayRect(visible,media.currentSrc||media.src);
  return {stage, r, visible, mw, mh};
}

function resizeCanvas(){
  const c=ui.overlay, dpr=Math.min(devicePixelRatio||1, 2);
  const w=ui.stage.clientWidth, h=ui.stage.clientHeight;
  c.width=Math.round(w*dpr); c.height=Math.round(h*dpr);
  c.style.width=w+'px'; c.style.height=h+'px';
  const ctx=c.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  draw();
}

function strokeShape(ctx, shape, origin, color){
  if(!shape) return;
  ctx.save();
  ctx.strokeStyle=color;
  ctx.globalAlpha=0.88;
  ctx.lineWidth=1.5;
  ctx.setLineDash([]);
  if(shape.shape==='circle'||shape.type==='circle'){
    ctx.beginPath();
    ctx.ellipse(origin.x+shape.cx*origin.w, origin.y+shape.cy*origin.h,
      (shape.r||shape.rx)*origin.w, (shape.r||shape.ry||shape.r)*origin.h, 0, 0, Math.PI*2);
    ctx.stroke();
  }else{
    const pts=shape.points||shape.points_norm;
    if(!pts?.length) {ctx.restore();return;}
    ctx.beginPath();
    pts.forEach((p,i)=>{
      const x=origin.x+p[0]*origin.w, y=origin.y+p[1]*origin.h;
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    });
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function draw(){
  const ctx=ui.overlay.getContext('2d');
  const w=ui.stage.clientWidth, h=ui.stage.clientHeight;
  ctx.clearRect(0,0,w,h);
  const {r,visible}=mediaRect();
  const origin={x:r.x,y:r.y,w:r.w,h:r.h};
  const step=currentSteps()[stepIndex];
  if(!step) return;
  ctx.save();ctx.beginPath();ctx.rect(visible.x,visible.y,visible.w,visible.h);ctx.clip();

  const mask=maskOf(step);
  if(mask?.type==='circle'){
    ctx.save();
    ctx.strokeStyle='#e4c27a33';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.ellipse(origin.x+mask.cx*origin.w, origin.y+mask.cy*origin.h,
      mask.rx*origin.w, mask.ry*origin.h, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  if(phase==='play' && step.trails){
    const t=ui.vid.currentTime;
    for(const tr of step.trails){
      if(t<tr.from_sec||t>tr.to_sec) continue;
      const pts=tr.points_norm;
      ctx.save();
      ctx.strokeStyle=tr.color||'#E4C27A';
      ctx.globalAlpha=0.7;
      ctx.lineWidth=1.5;
      ctx.beginPath();
      pts.forEach((p,i)=>{
        const x=origin.x+p[0]*origin.w, y=origin.y+p[1]*origin.h;
        i?ctx.lineTo(x,y):ctx.moveTo(x,y);
      });
      ctx.stroke();
      ctx.restore();
    }
  }

  if((phase==='landmark'||phase==='consequence') && revealHotspot){
    const lm=step.landmarks?.[0];
    const shape=phase==='consequence'
      ? findOutline(step, chosen?.consequence?.outline_id||lm?.id)
      : lm?.hotspots?.[0];
    strokeShape(ctx, shape, origin, '#7FDBFF');
  }

  if(lastMiss){
    ctx.save();
    ctx.strokeStyle='#e08b96';
    ctx.globalAlpha=0.9;
    ctx.lineWidth=1.25;
    ctx.beginPath();
    ctx.arc(origin.x+lastMiss.x*origin.w, origin.y+lastMiss.y*origin.h, 9, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  if(CALIBRATE && calClicks.length){
    ctx.save();
    ctx.fillStyle='#e4c27a';
    ctx.strokeStyle='#e4c27a';
    ctx.lineWidth=1;
    ctx.beginPath();
    calClicks.forEach((p,i)=>{
      const x=origin.x+p.x*origin.w, y=origin.y+p.y*origin.h;
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
      ctx.moveTo(x,y);
    });
    // redraw as points
    ctx.beginPath();
    calClicks.forEach(p=>{
      ctx.moveTo(origin.x+p.x*origin.w+4, origin.y+p.y*origin.h);
      ctx.arc(origin.x+p.x*origin.w, origin.y+p.y*origin.h, 3, 0, Math.PI*2);
    });
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function setStill(src, alt){
  ui.vid.pause();
  ui.vid.hidden=true;
  ui.still.hidden=false;
  ui.still.src='./'+src;
  ui.still.alt=alt||'真实术野定帧';
  ui.still.onload=()=>resizeCanvas();
}

function setVideo(){
  ui.still.hidden=true;
  ui.vid.hidden=false;
}

function clipDuration(step){
  const d=ui.vid.duration;
  if(Number.isFinite(d)&&d>0) return d;
  return step.duration_sec||0;
}

function updateClock(){
  const step=currentSteps()[stepIndex];
  if(!step) return;
  const t=ui.vid.hidden?0:(ui.vid.currentTime||0);
  const d=clipDuration(step);
  ui.hudClock.textContent=`${fmt(t)} / ${fmt(d)}`;
  const pct=d? (t/d*100):0;
  ui.barFill.style.width=pct+'%';
  ui.bar.setAttribute('aria-valuenow', String(Math.round(pct)));
  ui.bar.setAttribute('aria-valuemax','100');
  if(step.pause_at_sec!=null && d){
    ui.barMark.style.left=(step.pause_at_sec/d*100)+'%';
    ui.barMark.hidden=false;
  }else ui.barMark.hidden=true;
}

function timeFromBarEvent(ev){
  const step=currentSteps()[stepIndex];
  const d=clipDuration(step||{});
  const r=ui.bar.getBoundingClientRect();
  const x=r.width? Math.min(Math.max(0,(ev.clientX-r.left)/r.width),1):0;
  return x*d;
}

function seekTo(t, fromUser=false){
  const step=currentSteps()[stepIndex];
  if(!step) return;
  const d=clipDuration(step);
  if(Number.isFinite(d)&&d>0) t=Math.min(Math.max(0,t), Math.max(0,d-0.04));
  else t=Math.max(0,t);
  if(fromUser){
    if(phase!=='play'){
      remainderAfterDecision=false;
      setVideo();
      showPlayPanel(step);
    }
    allowPassPause=step.pause_at_sec!=null && t>=step.pause_at_sec-0.05;
    scrubbing=true;
  }
  try{ ui.vid.currentTime=t; }catch{}
  updateClock();
  draw();
}

function setPhase(p){
  phase=p;
  ui.stage.classList.toggle('quiz', p==='landmark'||CALIBRATE);
  ui.pauseFlag.hidden=!(p==='decision'||p==='consequence');
  ui.btnPlay.disabled=!(p==='play'||p==='decision');
  ui.btnReplay.disabled=!(p==='play'||p==='decision');
  if(ui.btnFwd) ui.btnFwd.disabled=!(p==='play'||p==='decision');
  persist();
}

function panelButtons(list){
  ui.actions.innerHTML=list.map(b=>
    `<button class="${b.cls||'outline'}" data-act="${b.act}">${b.label}</button>`
  ).join('');
}

function showPlayPanel(step){
  setPhase('play');
  ui.kicker.textContent=step.kicker;
  ui.title.textContent=step.name_cn;
  ui.lead.textContent=step.brief_cn;
  ui.task.innerHTML=`<h3>观看</h3><p>可拖动进度条、点选训练站任意点播。顺序播放时会在决策点暂停；快进越过决策点后可继续看完本段。</p>`;
  panelButtons([{act:'pause',label:'暂停',cls:'outline'}]);
  ui.hint.textContent=step.source_cn;
  ui.hudSrc.textContent=step.source_cn;
  ui.crumb.textContent=step.name_cn;
  updateClock();
}

function showDecision(step){
  const dp=step.decision_point;
  answerLocked=false;
  setPhase('decision');
  ui.vid.pause();
  ui.btnPlay.textContent='播放';
  decisionOpenedAt=Date.now();
  chosen=null;
  log('pause_decision', {decision_id:dp.id, t_sec:ui.vid.currentTime});
  ui.kicker.textContent='DECISION';
  ui.title.textContent='先判断，再继续';
  ui.lead.textContent=dp.why_pause_cn||'';
  ui.task.innerHTML=`<h3>决策点</h3><p>${dp.prompt_cn}</p>
    <div class="options">${dp.options.map(o=>`
      <button class="opt" data-opt="${o.id}"><span class="ltr">${o.id}</span><span>${o.text_cn}</span></button>
    `).join('')}</div>`;
  panelButtons([{act:'replay',label:'回看 5 秒'}]);
  ui.hint.textContent='键盘 1 / 2 / 3 对应 A B C';
  updateClock();
}

function showConsequence(step, opt){
  setPhase('consequence');
  chosen=opt;
  revealHotspot=true;
  lastMiss=null;
  if(opt.consequence?.frame) setStill(opt.consequence.frame, '错误选择对应的真实定帧');
  ui.kicker.textContent='FEEDBACK';
  ui.title.textContent='这一选择不安全';
  ui.lead.textContent='';
  ui.task.innerHTML=`<h3>根据当前画面</h3>
    <div class="feedback bad">${opt.consequence?.feedback_cn||'请重试。'}</div>`;
  panelButtons([
    {act:'retry', label:'回到决策点重试', cls:'gold'},
  ]);
  ui.hint.textContent='细线标出的是刚才判断所涉及的结构，不是标准图谱。';
  resizeCanvas();
}

function showLandmark(step){
  const lm=step.landmarks[0];
  setPhase('landmark');
  landmarkLocked=false;
  const prior=session.log.filter(e=>e.event==='landmark_result'&&e.item_id===lm.id);
  landmarkAttempt=prior.length;
  lastMiss=prior.at(-1)?.correct?null:prior.at(-1)||null;
  revealHotspot=prior.length>=3||session.log.some(e=>e.event==='hint_open'&&e.item_id===lm.id);
  setStill(lm.frame, lm.quiz_prompt_cn);
  ui.kicker.textContent='IDENTIFY';
  ui.title.textContent='在真实帧上点击';
  ui.lead.textContent=lm.quiz_prompt_cn;
  ui.task.innerHTML=`<h3>解剖标志</h3><p>目标：<strong>${lm.name_cn}</strong></p><p class="misses" id="miss-readout">${landmarkAttempt?`已尝试 ${landmarkAttempt} 次；首次记录保留`:"尚未点击"}</p>`;
  panelButtons([]);
  ui.hint.textContent=revealHotspot?'此前已显示热区；之后命中记为提示后完成。':'点中之前不会画出热区。点在圆形光阑或黑边之外不计数。';
  if(revealHotspot)panelButtons([{act:'skip-lm',label:'看过热区，进入下一步'}]);
  persist();
  resizeCanvas();
}

function showCorrectThenNext(kind){
  ui.task.insertAdjacentHTML('beforeend', `<div class="feedback ok" style="margin-top:10px">${kind}</div>`);
}

function enterStep(i, {seek=0, autoplay=true}={}){
  const steps=currentSteps();if(!steps[i])return;persist();epoch++;const token=epoch;answerLocked=false;landmarkLocked=false;
  stepIndex=i;
  const step=steps[i];
  remainderAfterDecision=false;
  allowPassPause=false;
  scrubbing=false;
  revealHotspot=false;
  lastMiss=null;
  chosen=null;
  renderRail();
  setVideo();
  ui.still.removeAttribute('src');
  showPlayPanel(step);
  log('station_open');renderRail();
  let armed=false;
  const onReady=()=>{
    if(armed||token!==epoch) return;
    armed=true;
    try{if(seek||restoreVideoTime!=null)ui.vid.currentTime=restoreVideoTime??seek;restoreVideoTime=null;}catch{}
    if(phase!=='play'){resizeCanvas();persist();return;}
    if(autoplay){
      const rate=Number(ui.btnRate.dataset.rate||1);
      ui.vid.playbackRate=PLAYBACK_RATES.includes(rate)?rate:1;
      ui.vid.play().then(()=>{ ui.btnPlay.textContent='暂停'; }).catch(()=>{
        ui.btnPlay.textContent='播放';
      });
    }
    resizeCanvas();
    log('play', {seek});
  };
  ui.vid.onloadedmetadata=onReady;
  const next='./'+step.video;
  if(!ui.vid.src || ui.vid.src.indexOf(step.video)<0){
    ui.vid.poster='./'+step.poster;
    ui.vid.src=next;
  }
  if(ui.vid.readyState>=1) onReady();
}

function afterDecisionCorrect(step){
  revealHotspot=false;
  lastMiss=null;
  if(step.play_remainder && ui.vid.currentTime < (ui.vid.duration||step.duration_sec)-1){
    remainderAfterDecision=true;
    setVideo();
    showPlayPanel(step);
    ui.task.innerHTML=`<h3>判断正确</h3><p>继续看完本段真实切片。</p><div class="feedback ok">选择成立。看完后进入标志识别。</div>`;
    panelButtons([{act:'skip-rest', label:'跳到标志识别', cls:'outline'}]);
    ui.vid.play().catch(()=>{});
    ui.btnPlay.textContent='暂停';
    setPhase('play');
  }else{
    goLandmarkOrNext(step);
  }
}

function goLandmarkOrNext(step){
  if(step.landmarks?.length) showLandmark(step);
  else advance();
}

function advance(){
  const steps=currentSteps();
  if(stepIndex+1<steps.length) enterStep(stepIndex+1);
  else finish('reached_end');
}

function finish(reason='user_end',readOnly=false){
  epoch++;viewingHistory=readOnly;
  const summary=summarizeAttempt(session,CUR),sc=summary.score;
  if(!readOnly&&!session.ended_at){log(summary.courseComplete?'course_complete':'attempt_end',{reason,answered:summary.answered,passed:summary.passed,required:summary.required});session.ended_at=Date.now();session.endReason=reason;session.status=summary.courseComplete?'complete':'partial';persist();}
  restoring=readOnly;
  setPhase('report');
  ui.vid.pause();
  ui.kicker.textContent='REPORT';
  ui.title.textContent='本机成绩单';
  ui.lead.textContent=`${summary.courseComplete?'四站训练通过':summary.scopeComplete?'本次范围通过，四站尚未全部完成':'本次练习已结束，仍有未通过任务'}。本次通过 ${summary.scopePassed}/${summary.scopeRequired}；整套已答 ${summary.answered}/${summary.required}，通过 ${summary.passed}/${summary.required}。首次作答保留，订正不覆盖。`;
  const rows=session.log.filter(e=>['choose_result','landmark_result','retry'].includes(e.event));
  ui.task.innerHTML=`
    <div class="report">
      <div class="metrics">
        <div class="metric"><div class="v">${sc.hasResponses?sc.accuracy_pct+'%':'未作答'}</div><div class="l">首次正确率</div></div>
        <div class="metric"><div class="v">${sc.n_decision_correct}/${sc.n_decision}</div><div class="l">决策首次正确</div></div>
        <div class="metric"><div class="v">${sc.n_landmark_correct}/${sc.n_landmark}</div><div class="l">标志首次命中</div></div>
        <div class="metric"><div class="v">${sc.n_retry}</div><div class="l">重试次数</div></div>
        <div class="metric"><div class="v">${(sc.mean_decision_ms/1000).toFixed(1)}s</div><div class="l">平均决策用时</div></div>
      </div>
      <h3 style="margin-top:8px">操作日志</h3>
      <ol class="log-list">${rows.map(e=>{
        const t=new Date(e.t_abs).toLocaleTimeString();
        const label=e.event==='choose_result'?(e.correct?'决策正确':'决策错误')
          :e.event==='landmark_result'?(e.correct?'标志命中':'标志未中'):'重试';
        return `<li><time>${t}</time><span>${e.step_id||''} · ${label}${e.option_id?' · '+e.option_id:''}</span></li>`;
      }).join('')||'<li><time>—</time><span>没有记录</span></li>'}</ol>
    </div>`;
  panelButtons([
    {act:'restart', label:'再练一遍', cls:'gold'},
    {act:'home', label:'返回说明'},
    {act:'print', label:'打印成绩单'},
    {act:'export',label:'导出本次 JSON'},
    {act:'history',label:'练习历史'},
  ]);
  ui.hint.textContent='可以回看操作日志，或选择“再练一遍”巩固本次内容。';
  ui.crumb.textContent='成绩单';
  restoring=false;
}

function onChoose(id){
  if(phase!=='decision'||answerLocked||session.ended_at) return;
  const step=currentSteps()[stepIndex];
  const opt=step.decision_point.options.find(o=>o.id===id);
  if(!opt) return;
  answerLocked=true;chosen=opt;
  const latency=Date.now()-decisionOpenedAt;
  const attempt=1+session.log.filter(e=>e.event==='choose_result'&&e.item_id===step.decision_point.id).length;
  log('choose_result', {item_id:step.decision_point.id, option_id:id, correct:!!opt.correct, latency_ms:latency, attempt});
  ui.task.querySelectorAll('.opt').forEach(btn=>{
    btn.disabled=true;
    if(btn.dataset.opt===id) btn.classList.add(opt.correct?'correct':'wrong');
  });
  if(opt.correct){
    showCorrectThenNext('判断与当前画面相符。');
    later(()=>afterDecisionCorrect(step),650);
  }else{
    showConsequence(step, opt);
  }
  persist();
}

function onStageClick(ev){
  const {stage, r,visible}=mediaRect();
  if(!clientToNorm(ev.clientX,ev.clientY,stage,visible))return;
  const n=clientToNorm(ev.clientX, ev.clientY, stage, r);
  if(!n) return;
  const step=currentSteps()[stepIndex];
  const mask=maskOf(step);
  if(mask && !inMask(n.x, n.y, mask)) return;

  if(CALIBRATE){
    calClicks.push(n);
    ui.cal.hidden=false;
    ui.cal.textContent=calClicks.map(p=>`[${p.x.toFixed(3)}, ${p.y.toFixed(3)}]`).join('\n');
    draw();
    return;
  }
  if(phase!=='landmark'||landmarkLocked||session.ended_at) return;
  const lm=step.landmarks[0];
  const tol=14/(r.w||1);
  const hit=lm.hotspots.some(sh=>hitShape(n.x, n.y, sh, tol));
  if(hit)landmarkLocked=true;
  landmarkAttempt++;
  const attempt=1+session.log.filter(e=>e.event==='landmark_result'&&e.item_id===lm.id).length;
  log('landmark_result', {item_id:lm.id, correct:hit, attempt, hintViewed:revealHotspot, x:n.x, y:n.y});
  const readout=$('miss-readout');
  if(hit){
    lastMiss=null;
    revealHotspot=true;
    if(readout) readout.textContent='命中 '+lm.name_cn;
    draw();
    later(()=>advance(),900);
  }else{
    lastMiss=n;
    if(landmarkAttempt>=3){revealHotspot=true;log('hint_open',{item_id:lm.id});}
    if(readout) readout.textContent=revealHotspot
      ?'第三次未中，已用细线标出目标。点击细线内可进入下一步。'
      :`未点中（${landmarkAttempt}/3）。请再看管道的灰白反光。`;
    draw();
    if(revealHotspot){
      panelButtons([{act:'skip-lm', label:'看过热区，进入下一步', cls:'outline'}]);
    }
  }
}

function onTime(){
  if(Date.now()-lastSavedAt>2000)persist();
  if(phase!=='play') return;
  const step=currentSteps()[stepIndex];
  updateClock();
  draw();
  if(!remainderAfterDecision && !allowPassPause && !scrubbing && step.pause_at_sec!=null && ui.vid.currentTime>=step.pause_at_sec){
    ui.vid.pause();
    ui.vid.currentTime=step.pause_at_sec;
    showDecision(step);
  }
}

function onEnded(){
  if(phase!=='play') return;
  const step=currentSteps()[stepIndex];
  if(remainderAfterDecision) goLandmarkOrNext(step);
  else if(step.decision_point && session.log.every(e=>e.item_id!==step.decision_point.id)){
    showDecision(step);
  }else goLandmarkOrNext(step);
}

function bindOwner(){
 const store=loadSessions(localStorage);let active=store.sessions.find(a=>a.id===store.active);
 const isDemo=CALIBRATE||new URLSearchParams(location.search).has('demo');
 if(isDemo)active={id:'OR-FIELD-DEMO',kind:'demo'};
 else if(!active){active=newSession();store.sessions.push(active);store.active=active.id;persistSessions(localStorage,store);}
 owner={id:active.id,kind:active.kind};ownerGeneration=generation(localStorage);
}
function restoreAttempt(a){
 restoring=true;viewingHistory=false;epoch++;session=a;stepFilter=a.selectedStepIds||null;const cursor=a.cursor||{},index=Math.max(0,currentSteps().findIndex(s=>s.id===cursor.stepId));
 restoreVideoTime=cursor.videoTime||0;ui.intro.hidden=true;ui.app.hidden=false;enterStep(index,{seek:cursor.videoTime||0,autoplay:false});
 const step=currentSteps()[index];applyRate(cursor.rate||1);
 remainderAfterDecision=!!cursor.remainderAfterDecision;allowPassPause=!!cursor.allowPassPause;
 if(cursor.phase==='consequence'){const opt=step.decision_point.options.find(o=>o.id===cursor.chosen);if(opt)showConsequence(step,opt);}
 else if(cursor.phase==='decision'){
  showDecision(step);
  if(cursor.answerLocked){answerLocked=true;ui.task.querySelectorAll('.opt').forEach(b=>b.disabled=true);showCorrectThenNext('此前已提交，首次记录保留。');panelButtons([{act:'continue-decision',label:'继续'}]);}
 }else if(cursor.phase==='landmark'){
  showLandmark(step);
  if(cursor.landmarkLocked){landmarkLocked=true;panelButtons([{act:'continue-landmark',label:'此前已命中，继续'}]);}
 }
 restoring=false;persist();
}
function start(filter=null,index=0,{fresh=false}={}){
 persist();if(!owner||ownerGeneration!==generation(localStorage))bindOwner();epoch++;restoring=false;viewingHistory=false;restoreVideoTime=null;
 const prior=attemptsForOwner(loadOrStore(localStorage),owner.id,owner.kind).filter(a=>!a.ended_at&&JSON.stringify(a.selectedStepIds||null)===JSON.stringify(filter)).at(-1);
 if(prior&&!fresh){restoreAttempt(prior);return;}
 stepFilter=filter;session={...emptySession(CUR.module_id),id:`OR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,ownerId:owner.id,kind:owner.kind,generation:generation(localStorage),schema:2,curriculumVersion:CUR.version||'OR-2026.09.14-2',selectedStepIds:filter,started_at:Date.now()};
 ui.intro.hidden=true;ui.app.hidden=false;enterStep(index);
}

function bindBarSeek(){
  const onMove=ev=>{
    if(!scrubbing) return;
    ev.preventDefault();
    seekTo(timeFromBarEvent(ev), true);
  };
  const onUp=()=>{
    if(!scrubbing) return;
    scrubbing=false;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  ui.bar.addEventListener('pointerdown', ev=>{
    if(phase==='report'||phase==='intro') return;
    ev.preventDefault();
    ui.bar.setPointerCapture?.(ev.pointerId);
    seekTo(timeFromBarEvent(ev), true);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });
}

function applyRate(rate){
  ui.vid.playbackRate=rate;
  ui.btnRate.dataset.rate=String(rate);
  ui.rateLabel.textContent=rate.toFixed(1)+'×';
  const next=PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(rate)+1)%PLAYBACK_RATES.length];
  ui.btnRate.textContent=next===1?'原速':(next+'×');
}

function bind(){
  const status=document.createElement('p');status.id='or-save-status';status.className='small muted';status.setAttribute('role','status');$('btn-abort').parentElement.appendChild(status);
  $('btn-start').onclick=()=>start(null);
  $('btn-optics-only').onclick=()=>start(['circular_optics']);
  $('btn-help').onclick=()=>{ui.modalBody.textContent=CUR.disclaimer;ui.modal.showModal();};
  const historyButton=document.createElement('button');historyButton.textContent='练习历史';historyButton.className='outline';historyButton.onclick=history;$('btn-start').parentElement.appendChild(historyButton);
  $('modal-close').onclick=()=>ui.modal.close();
  $('btn-abort').onclick=()=>{ if(phase!=='intro') finish(); };
  ui.cards.addEventListener('click', ev=>{
    const b=ev.target.closest('[data-start]');
    if(!b) return;
    const i=CUR.steps.findIndex(s=>s.id===b.dataset.start);
    start(null, i>=0?i:0);
  });
  ui.rail.addEventListener('click', ev=>{
    const b=ev.target.closest('[data-i]');
    if(!b || phase==='report') return;
    enterStep(Number(b.dataset.i));
  });
  ui.btnPlay.onclick=()=>{
    if(phase==='decision'){
      allowPassPause=true;
      remainderAfterDecision=true;
      setVideo();
      showPlayPanel(currentSteps()[stepIndex]);
      ui.vid.play().catch(()=>{});
      ui.btnPlay.textContent='暂停';
      return;
    }
    if(phase!=='play') return;
    if(ui.vid.paused){ui.vid.play(); ui.btnPlay.textContent='暂停';}
    else {ui.vid.pause(); ui.btnPlay.textContent='播放';}
  };
  ui.btnReplay.onclick=()=>{
    seekTo(ui.vid.currentTime-5, true);
    if(phase==='play' && ui.vid.paused) ui.vid.play().catch(()=>{});
  };
  ui.btnFwd.onclick=()=>{
    seekTo(ui.vid.currentTime+5, true);
  };
  ui.btnRate.onclick=()=>{
    const cur=Number(ui.btnRate.dataset.rate||ui.vid.playbackRate||1);
    const i=Math.max(0, PLAYBACK_RATES.indexOf(cur));
    applyRate(PLAYBACK_RATES[(i+1)%PLAYBACK_RATES.length]);
  };
  bindBarSeek();
  ui.vid.addEventListener('timeupdate', onTime);
  ui.vid.addEventListener('ended', onEnded);
  ui.vid.addEventListener('seeked', ()=>{scrubbing=false;persist();});
  window.addEventListener('pagehide',persist);
  ui.vid.addEventListener('play', ()=>{ui.btnPlay.textContent='暂停';});
  ui.vid.addEventListener('pause', ()=>{if(phase==='play') ui.btnPlay.textContent='播放';persist();});
  ui.overlay.addEventListener('click', onStageClick);
  ui.still.addEventListener('click', onStageClick);
  ui.task.addEventListener('click', ev=>{
    const opt=ev.target.closest('[data-opt]');
    if(opt) onChoose(opt.dataset.opt);
  });
  ui.actions.addEventListener('click', ev=>{
    const b=ev.target.closest('[data-act]');
    if(!b) return;
    const act=b.dataset.act;
    const step=currentSteps()[stepIndex];
    if(act==='pause' && phase==='play'){ui.vid.pause();}
    if(act==='replay') ui.btnReplay.click();
    if(act==='retry'){
      log('retry', {item_id:step.decision_point.id});
      revealHotspot=false; lastMiss=null; chosen=null;
      setVideo();
      const t=Math.max(0, (step.pause_at_sec||ui.vid.currentTime)-2);
      ui.vid.currentTime=t;
      remainderAfterDecision=false;
      showPlayPanel(step);
      ui.vid.play().catch(()=>{});
    }
    if(act==='skip-rest') goLandmarkOrNext(step);
    if(act==='skip-lm'){log('hint_skip',{item_id:step.landmarks[0]?.id});advance();}
    if(act==='continue-decision')afterDecisionCorrect(step);
    if(act==='continue-landmark')advance();
    if(act==='export')exportRecord();
    if(act==='history')history();
    if(act==='restart') start(stepFilter,0,{fresh:true});
    if(act==='home'){ location.reload(); }
    if(act==='print') window.print();
  });
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('keydown', ev=>{
    if(ev.target.matches('input,textarea,select')) return;
    if(ev.code==='Space'){
      ev.preventDefault();
      if(phase==='play'||phase==='decision') ui.btnPlay.click();
    }
    if(ev.key==='ArrowLeft'){
      ev.preventDefault();
      if(phase!=='intro'&&phase!=='report') seekTo(ui.vid.currentTime-5, true);
    }
    if(ev.key==='ArrowRight'){
      ev.preventDefault();
      if(phase!=='intro'&&phase!=='report') seekTo(ui.vid.currentTime+5, true);
    }
    if(phase==='decision' && ['1','2','3','Digit1','Digit2','Digit3','a','b','c','A','B','C'].includes(ev.key)){
      const map={1:'A',2:'B',3:'C',Digit1:'A',Digit2:'B',Digit3:'C',a:'A',b:'B',c:'C',A:'A',B:'B',C:'C'};
      onChoose(map[ev.key]);
    }
  });
  if(CALIBRATE){
    ui.cal.hidden=false;
    ui.cal.textContent='校准模式：点击记录坐标';
    ui.stage.classList.add('quiz');
  }
}

function boot(){
  loadCurriculum().then(data=>{
    CUR=data;
    bindOwner();
    renderIntro();
    bind();
    resizeCanvas();
    const q=new URLSearchParams(location.search);
    const unfinished=attemptsForOwner(loadOrStore(localStorage),owner.id,owner.kind).filter(a=>!a.ended_at).at(-1);
    if(unfinished&&!q.has('autostart')&&!q.has('demo'))restoreAttempt(unfinished);
    const bootMode=q.get('autostart');
    if(bootMode==='1') start(null);
    if(bootMode==='optics') start(['circular_optics']);
    if(q.get('demo')==='decision'){
      start(null);
      const go=()=>{
        const s=currentSteps()[0];
        if(!s) return;
        const seek=Math.max(0,(s.pause_at_sec||1)-0.2);
        const kick=()=>{
          try{ ui.vid.currentTime=seek; }catch{}
          ui.vid.pause();
          showDecision(s);
        };
        if(ui.vid.readyState>=1) kick();
        else ui.vid.addEventListener('loadedmetadata', kick, {once:true});
      };
      later(go,700);
    }
  }).catch(err=>{
    ui.disclaimer.textContent='课程数据未能载入：'+err.message;
  });
}

boot();
