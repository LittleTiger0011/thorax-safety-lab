/** Hit-testing and scoring for the real-or-field trainer. No DOM. */

export function pointInPolygon(x, y, pts){
  let inside=false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const xi=pts[i][0], yi=pts[i][1], xj=pts[j][0], yj=pts[j][1];
    const hit=((yi>y)!==(yj>y)) && (x<(xj-xi)*(y-yi)/((yj-yi)||1e-12)+xi);
    if(hit) inside=!inside;
  }
  return inside;
}

export function distToSegment(px, py, ax, ay, bx, by){
  const dx=bx-ax, dy=by-ay;
  const l2=dx*dx+dy*dy;
  if(l2<1e-12) return Math.hypot(px-ax, py-ay);
  let t=((px-ax)*dx+(py-ay)*dy)/l2;
  t=Math.max(0, Math.min(1, t));
  return Math.hypot(px-(ax+t*dx), py-(ay+t*dy));
}

export function pointInCircle(x, y, cx, cy, rx, ry){
  const nx=(x-cx)/(rx||1e-12), ny=(y-cy)/(ry||1e-12);
  return nx*nx+ny*ny<=1;
}

export function hitShape(x, y, shape, tol=0){
  if(!shape) return false;
  if(shape.shape==='circle'||shape.type==='circle'){
    const rx=(shape.r??shape.rx??0)+tol, ry=(shape.r??shape.ry??rx)+tol;
    return pointInCircle(x, y, shape.cx, shape.cy, rx, ry);
  }
  const pts=shape.points||shape.points_norm;
  if(!pts||pts.length<3) return false;
  if(pointInPolygon(x, y, pts)) return true;
  if(tol<=0) return false;
  for(let i=0;i<pts.length;i++){
    const a=pts[i], b=pts[(i+1)%pts.length];
    if(distToSegment(x, y, a[0], a[1], b[0], b[1])<=tol) return true;
  }
  return false;
}

export function inMask(x, y, mask){
  if(!mask||mask.type==='none') return true;
  if(mask.type==='letterbox'||mask.type==='box'){
    const b=mask.box||mask;
    return x>=b.x && y>=b.y && x<=b.x+b.w && y<=b.y+b.h;
  }
  if(mask.type==='circle'){
    return pointInCircle(x, y, mask.cx, mask.cy, mask.rx, mask.ry);
  }
  return true;
}

export function displayedMediaRect(containerW, containerH, mediaW, mediaH){
  if(!mediaW||!mediaH) return {x:0,y:0,w:containerW,h:containerH,scale:1};
  const scale=Math.min(containerW/mediaW, containerH/mediaH);
  const w=mediaW*scale, h=mediaH*scale;
  return {x:(containerW-w)/2, y:(containerH-h)/2, w, h, scale};
}

export function clientToNorm(clientX, clientY, stageRect, mediaRect){
  const x=clientX-stageRect.left-mediaRect.x;
  const y=clientY-stageRect.top-mediaRect.y;
  if(x<0||y<0||x>mediaRect.w||y>mediaRect.h) return null;
  return {x:x/mediaRect.w, y:y/mediaRect.h};
}

export function scoreSession(log, weights={decision:1, landmark:1}){
  weights=normalizeWeights(weights);
  const decisions=log.filter(e=>e.event==='choose_result');
  const landmarks=log.filter(e=>e.event==='landmark_result');
  const firstDecision=new Map();
  for(const e of decisions){
    if(!firstDecision.has(e.item_id)) firstDecision.set(e.item_id, e);
  }
  const firstLandmark=new Map();
  for(const e of landmarks){
    if(!firstLandmark.has(e.item_id)) firstLandmark.set(e.item_id, e);
  }
  let dCorrect=0;
  for(const e of firstDecision.values()) if(e.correct) dCorrect++;
  let lCorrect=0;
  for(const e of firstLandmark.values()) if(e.correct) lCorrect++;
  const nD=firstDecision.size, nL=firstLandmark.size;
  const retries=log.filter(e=>e.event==='retry').length;
  const latencies=decisions.filter(e=>e.attempt===1).map(e=>e.latency_ms||0);
  const meanLatency=latencies.length?Math.round(latencies.reduce((a,b)=>a+b,0)/latencies.length):0;
  const denom=nD*weights.decision+nL*weights.landmark;
  const numer=dCorrect*weights.decision+lCorrect*weights.landmark;
  const accuracy=denom?numer/denom:null;
  return {
    n_decision:nD,
    n_decision_correct:dCorrect,
    n_landmark:nL,
    n_landmark_correct:lCorrect,
    n_retry:retries,
    mean_decision_ms:meanLatency,
    accuracy,
    accuracy_pct:accuracy==null?null:Math.round(accuracy*100),
    hasResponses:denom>0,
  };
}

export function emptySession(moduleId){
  return {
    module_id:moduleId,
    started_at:null,
    ended_at:null,
    step_index:0,
    phase:'intro',
    log:[],
  };
}

export function normalizeWeights(w={}){
 const weight=(a,b)=>Number.isFinite(a??b)&&(a??b)>=0?(a??b):1;
 const out={decision:weight(w.decision,w.decision_weight),landmark:weight(w.landmark,w.landmark_weight)};
 return out.decision+out.landmark?out:{decision:1,landmark:1};
}
export function curriculumTasks(course){
 return course.steps.flatMap(s=>[...(s.decision_point?[{key:'decision:'+s.decision_point.id,kind:'decision',itemId:s.decision_point.id,stepId:s.id}]:[]),...(s.landmarks||[]).map(l=>({key:'landmark:'+l.id,kind:'landmark',itemId:l.id,stepId:s.id}))]);
}
export function summarizeAttempt(attempt,course){
 const log=attempt.log||[],tasks=curriculumTasks(course).map(t=>{
  const events=log.filter(e=>e.item_id===t.itemId&&e.event===(t.kind==='decision'?'choose_result':'landmark_result'));
  const first=events[0]||null,passed=events.some(e=>e.correct),independent=first?.correct&&!first.hintViewed;
  return {...t,first,last:events.at(-1)||null,answered:!!first,passed,firstCorrect:!!independent,status:!first?'unanswered':!passed?'answered_wrong':independent?'passed_first':'passed_after_retry_or_hint'};
 });
 const valid=new Set(tasks.map(t=>t.key)),results=log.filter(e=>valid.has((e.event==='choose_result'?'decision':e.event==='landmark_result'?'landmark':e.event==='retry'?'decision':'unknown')+':'+e.item_id));
 const scope=tasks.filter(t=>!attempt.selectedStepIds||attempt.selectedStepIds.includes(t.stepId));
 const steps=course.steps.map(s=>{const ts=tasks.filter(t=>t.stepId===s.id);return {id:s.id,visited:log.some(e=>e.step_id===s.id),answered:ts.filter(t=>t.answered).length,passed:ts.filter(t=>t.passed).length,required:ts.length,completed:ts.length>0&&ts.every(t=>t.passed)};});
 return {tasks,steps,answered:tasks.filter(t=>t.answered).length,passed:tasks.filter(t=>t.passed).length,required:tasks.length,firstCorrect:tasks.filter(t=>t.firstCorrect).length,scopeRequired:scope.length,scopePassed:scope.filter(t=>t.passed).length,scopeComplete:scope.length>0&&scope.every(t=>t.passed),courseComplete:tasks.length>0&&tasks.every(t=>t.passed),missingTasks:tasks.filter(t=>!t.answered).map(t=>t.key),needsCorrection:tasks.filter(t=>t.answered&&!t.passed).map(t=>t.key),score:scoreSession(results,course.scoring)};
}
export function mergePlayback(ranges=[]){
 const sorted=ranges.filter(r=>r.length===2&&Number.isFinite(r[0])&&Number.isFinite(r[1])&&r[1]>r[0]).map(r=>[...r]).sort((a,b)=>a[0]-b[0]),out=[];
 for(const r of sorted){const last=out.at(-1);if(last&&r[0]<=last[1])last[1]=Math.max(last[1],r[1]);else out.push(r);}return out;
}
