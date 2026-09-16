import {BANK_VERSION,SKILLS} from './assessment-data.js';
import {EVIDENCE_VERSION,FORM_VERSION,evidenceLab,blueprint,wasExposed,practiceAvailable,questionEvidence} from './assessment-evidence.js';
export const MODES={review:{name:'同卷复习',count:16},pre:{name:'起点检测',count:16},post:{name:'独立综合检测',count:16},diagnostic:{name:'16 点知识诊断',count:16},adaptive:{name:'AI 定向复练',count:8},retry:{name:'迁移复测',count:8},case:{name:'真实病例阅片',count:1}};
export const MODEL={name:'本地贝叶斯知识追踪',prior:.35,guess:.25,slip:.12,learning:.08,version:'KT-2',validated:false};
const clone=x=>JSON.parse(JSON.stringify(x));
export const ensureLab=evidenceLab;
export function assessmentReportSummary(session){
 const done=(session.assessmentV2?.attempts||[]).filter(a=>a.submitted&&!a.abandoned&&a.result&&a.bankVersion===BANK_VERSION).sort((a,b)=>a.submitted.localeCompare(b.submitted));
 const result=a=>a?{...a.result,total:a.result.score,dimensions:Object.fromEntries(SKILLS.map(skill=>{
  const details=a.result.details.filter(d=>d.skill===skill.id);
  return [skill.id,{name:skill.name,correct:details.filter(d=>d.correct).length,total:details.length}];
 }))}:null;
 return {bankVersion:BANK_VERSION,doneCount:done.length,last:done.at(-1)||null,preCompleted:done.some(a=>(a.sourceKind||a.kind)==='pre'),postCompleted:done.some(a=>(a.sourceKind||a.kind)==='post'),pre:result(done.find(a=>(a.sourceKind||a.kind)==='pre')),post:result(done.find(a=>(a.sourceKind||a.kind)==='post')),retry:result(done.filter(a=>a.kind==='retry'&&a.result.independenceEligible).at(-1))};
}
export const isPractice=a=>['adaptive','case'].includes(a.kind);
export function shuffled(items,seed){let t=Number(seed)||1;const a=[...items];for(let i=a.length-1;i>0;i--){t=(Math.imul(t,1664525)+1013904223)>>>0;const j=t%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function insidePolygon(point,polygon){
 if(!Array.isArray(point)||point.length!==2||point.some(v=>!Number.isFinite(v)||v<0||v>1))return false;
 let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const [x,y]=point,[xi,yi]=polygon[i],[xj,yj]=polygon[j];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
 }return inside;
}
export function validAnswer(q,value){
 if(value==='uncertain')return true;
 if(q.type==='hotspot')return Array.isArray(value)&&value.length===2&&value.every(v=>Number.isFinite(v)&&v>=0&&v<=1);
 if(q.type==='multi'||q.type==='order')return Array.isArray(value)&&value.length>0&&new Set(value).size===value.length&&value.every(v=>q.options.some(o=>o.id===v))&&(q.type!=='order'||value.length===q.options.length);
 return typeof value==='string'&&q.options.some(o=>o.id===value);
}
export function correctAnswer(q,value){
 if(!validAnswer(q,value)||value==='uncertain')return false;
 if(q.type==='hotspot')return insidePolygon(value,q.answer);
 if(q.type==='multi')return [...value].sort().join('|')===[...q.answer].sort().join('|');
 if(q.type==='order')return value.join('|')===q.answer.join('|');
 return value===q.answer;
}
export function misconception(q,response){
 if(!response||response.value==='uncertain')return '暂未建立判断依据';
 if(correctAnswer(q,response.value))return response.hints?'提示后完成':response.confidence==='low'?'答对但信心不足':'无提示判断正确';
 if(q.type==='hotspot')return '术野目标与邻近组织定位混淆';
 if(q.type==='order')return '观察或核查顺序混淆';
 const values=Array.isArray(response.value)?response.value:[response.value];
 const errors=q.options.filter(o=>values.includes(o.id)&&o.error).map(o=>o.error);
 return [...new Set(errors)].join('、')||(q.type==='multi'?'关键条件遗漏':'关键概念需要巩固');
}
export function learnerProfile(session,bank){
 const map=new Map(bank.map(q=>[q.id,q])),observations=[];
 for(const a of ensureLab(session,bank).attempts){
  if(a.bankVersion!==BANK_VERSION||a.abandoned)continue;
  for(const id of (a.submitted?a.questionIds:isPractice(a)?a.reviewed:[])||[]){
   const q=map.get(id),r=a.responses[id];if(!q||!r)continue;
   const evidence=r.evidence||questionEvidence(a,q,session);
   observations.push({q,r,correct:correctAnswer(q,r.value),kind:a.kind,evidence,independent:!!a.submitted&&evidence.independent,time:a.submitted||r.at||a.started});
  }
 }
 observations.sort((a,b)=>String(a.time||'').localeCompare(String(b.time||''))).forEach((o,i)=>o.ordinal=i);
 return SKILLS.map(skill=>{
  const all=observations.filter(o=>o.q.skill===skill.id),first=new Map();
  for(const o of all)if(o.independent&&!first.has(o.q.id))first.set(o.q.id,o);
  const independent=[...first.values()],wrong=independent.filter(o=>!o.correct);
  let p=MODEL.prior;
  for(const o of independent){const g=o.q.type==='single'?MODEL.guess:.08;p=o.correct?p*(1-MODEL.slip)/(p*(1-MODEL.slip)+(1-p)*g):p*MODEL.slip/(p*MODEL.slip+(1-p)*(1-g));}
  const unresolved=wrong.filter(o=>!independent.some(n=>n.q.id!==o.q.id&&n.q.family===o.q.family&&n.correct&&n.ordinal>o.ordinal));
  const corrected=o=>all.some(n=>n.q.id===o.q.id&&n.correct&&n.ordinal>o.ordinal);
  const high=unresolved.filter(o=>o.r.confidence==='high'),low=independent.filter(o=>o.correct&&o.r.confidence==='low'),pending=unresolved.filter(corrected);
  const families=new Set(independent.map(o=>o.q.family)).size;
  const status=!independent.length?'待未见题验证':pending.length?'已订正待验证':high.length?'优先纠正':independent.length<3?'证据较少':p>=.8&&families>=2?'本组表现较稳':'继续巩固';
  const cpSkills={orientation:'orientation',landmark:'orientation',vein:'vessels',artery:'vessels',bronchus:'airway',finish:'safety'};
  const trainingSignals=Object.entries(session.checkpointResults||{}).filter(([id,r])=>cpSkills[id]===skill.id&&r.first&&!r.first.correct).length+(skill.id==='decision'&&(session.caseA?.choices||[]).some(c=>!c.reasonable)?1:0);
  const priority=high.length*4+unresolved.length*2+low.length+(1-p)*2+(independent.length?0:1+trainingSignals*2);
  return {...skill,estimate:Math.round(p*100),status,priority,trainingSignals,independent:independent.length,correct:independent.filter(o=>o.correct).length,highConfidenceErrors:high.length,firstHighConfidenceErrors:wrong.filter(o=>o.r.confidence==='high').length,correctedPending:pending.length,lowConfidenceCorrect:low.length,assisted:all.filter(o=>o.r.hints).length,corrections:all.filter(o=>!o.independent&&o.evidence.known&&!o.evidence.unseen&&!o.r.hints&&o.correct).length,legacy:all.filter(o=>!o.evidence.known).length,families,errors:unresolved.slice(-3).map(o=>({questionId:o.q.id,stem:o.q.stem,tag:corrected(o)?'原错误已订正，待未见题验证':misconception(o.q,o.r),high:o.r.confidence==='high'}))};
 });
}
export function selectNext(session,bank,attempt,focus=null){
 const profile=learnerProfile(session,bank),transfer=blueprint(bank,'retry');
 const available=bank.filter(q=>!attempt.questionIds.includes(q.id)&&(!focus||q.skill===focus)&&(attempt.kind==='retry'?transfer.includes(q.id)&&!wasExposed(session,q):practiceAvailable(session,bank,q)));
 const ranked=available.map(q=>{const s=profile.find(x=>x.id===q.skill),repeated=wasExposed(session,q),same=attempt.questionIds.filter(id=>bank.find(x=>x.id===id)?.skill===q.skill).length;return {q,s,repeated,priority:s.priority+(repeated?-5:3)-same};}).sort((a,b)=>b.priority-a.priority||a.q.id.localeCompare(b.q.id));
 const chosen=ranked[0];if(!chosen)return null;const {q,s,repeated}=chosen;
 return {id:q.id,reason:s.errors.length?`依据${s.errors.at(-1).high?"高信心错误 ":""}「${s.errors.at(-1).tag}」，安排${s.name}练习。`:`围绕${s.name}补充判断依据。`,repeated};
}
export function createAttempt(session,kind,bank,{focus=null,caseId=null,seed=Date.now()}={}){
 if(!MODES[kind]||kind==='review')throw new Error('未知测评方式');
 const lab=ensureLab(session,bank),a={id:`A2-${seed.toString(36)}-${lab.attempts.length+1}`,kind,sourceKind:kind,caseId,bankVersion:BANK_VERSION,formVersion:FORM_VERSION,evidenceVersion:EVIDENCE_VERSION,exposureStatus:'tracked',evidenceByQuestion:{},modelVersion:MODEL.version,seed,focus,questionIds:[],responses:{},reviewed:[],reasons:{},maxQuestions:MODES[kind].count,started:new Date().toISOString(),submitted:null,abandoned:false};
 if(kind==='diagnostic'){
  a.questionIds=blueprint(bank,kind);if(a.questionIds.length!==16)throw new Error('知识诊断题库映射不完整');
  a.exposureStatus=a.questionIds.some(id=>wasExposed(session,bank.find(q=>q.id===id)))?'mixed-review':'tracked';
  a.questionIds=shuffled(a.questionIds,seed);
 }else if(kind==='case'){
  const q=bank.find(q=>q.id===`ct-${caseId}`);if(!q)throw new Error('未找到病例题');
  if(!practiceAvailable(session,bank,q))throw new Error('该定位题保留给独立检测；请先完成对应检测，或在病例库自由阅片。');
  a.questionIds=[q.id];
 }else if(kind==='pre'||kind==='post'){
  a.questionIds=blueprint(bank,kind);if(a.questionIds.length!==16)throw new Error('题库蓝图不完整');
  if(a.questionIds.some(id=>wasExposed(session,bank.find(q=>q.id===id)))||lab.attempts.some(x=>x.submitted&&x.kind===kind)){a.kind='review';a.exposureStatus='review';}
  a.questionIds=shuffled(a.questionIds,seed);
 }else if(kind==='retry'){
  const ranked=[...learnerProfile(session,bank)].sort((x,y)=>y.priority-x.priority);
  for(const skill of focus?[focus]:ranked.map(x=>x.id)){
   const next=selectNext(session,bank,a,skill);if(next){a.questionIds.push(next.id);a.reasons[next.id]=next;}
  }
  if(!a.questionIds.length)throw new Error('暂无未见过的保留题。请使用定向复练进行订正；已见题不会再次计为迁移证据。');
  a.maxQuestions=a.questionIds.length;
 }else{
  const candidates=bank.filter(q=>(!focus||q.skill===focus)&&practiceAvailable(session,bank,q));
  a.maxQuestions=Math.min(8,candidates.length);
  const next=selectNext(session,bank,a,focus);if(!next)throw new Error('该领域暂时没有可开放的练习题，请先完成对应保留检测。');a.questionIds.push(next.id);a.reasons[next.id]=next;
 }
 lab.attempts.push(a);return a;
}
export function saveResponse(attempt,q,value,{confidence=null,hints=0,elapsedMs=0,mediaReady=true}={}){
 if(attempt.submitted||attempt.abandoned||attempt.reviewed.includes(q.id))throw new Error('已提交的作答不能修改');
 if(!attempt.questionIds.includes(q.id)||!validAnswer(q,value))throw new Error('请先完成本题选择');
 if(!mediaReady)throw new Error('图像尚未就绪，请先完成加载');
 attempt.responses[q.id]={value:clone(value),confidence,hints,elapsedMs:Math.max(0,Math.round(elapsedMs)),at:new Date().toISOString()};
 return attempt.responses[q.id];
}
export function reviewPractice(attempt,q){if(!isPractice(attempt)||!attempt.responses[q.id])throw new Error('不能提前显示检测解析');if(!attempt.reviewed.includes(q.id))attempt.reviewed.push(q.id);}
export function continuePractice(session,attempt,bank){
 if(attempt.kind!=='adaptive'||!attempt.reviewed.includes(attempt.questionIds.at(-1)))return false;
 if(attempt.questionIds.length>=attempt.maxQuestions)return false;
 const next=selectNext(session,bank,attempt,attempt.focus);
 if(!next){attempt.maxQuestions=attempt.questionIds.length;return false;}attempt.questionIds.push(next.id);attempt.reasons[next.id]=next;return true;
}
export function gradeAttempt(a,bank,session=null){
 const qs=a.questionIds.map(id=>bank.find(q=>q.id===id));if(qs.some(q=>!q))throw new Error('题库版本不可用');
 const details=qs.map(q=>({id:q.id,skill:q.skill,correct:correctAnswer(q,a.responses[q.id]?.value),critical:!!q.critical,assisted:!!a.responses[q.id]?.hints,evidence:questionEvidence(a,q,session),error:misconception(q,a.responses[q.id])}));
 const correct=details.filter(x=>x.correct).length,critical=details.filter(x=>x.critical),criticalCorrect=critical.filter(x=>x.correct).length;
 return {bankVersion:a.bankVersion,evidenceVersion:a.evidenceVersion||null,independenceEligible:details.length>0&&details.every(x=>x.evidence.independent),unseenCount:details.filter(x=>x.evidence.unseen).length,firstUnseenCorrect:details.filter(x=>x.correct&&x.evidence.independent).length,count:qs.length,correct,score:Math.round(correct/Math.max(qs.length,1)*100),criticalCount:critical.length,criticalCorrect,independentCorrect:details.filter(x=>x.correct&&!x.assisted).length,assistedCount:details.filter(x=>x.assisted).length,details};
}
export function finishAttempt(a,bank,session=null){
 if(a.submitted||a.abandoned)throw new Error('本次作答已结束');
 if(a.questionIds.some(id=>!a.responses[id])||a.kind==='adaptive'&&a.questionIds.length<a.maxQuestions)throw new Error('请先完成本组全部题目');
 a.result=gradeAttempt(a,bank,session);for(const d of a.result.details)a.responses[d.id].evidence={...d.evidence};a.submitted=new Date().toISOString();return a.result;
}
export function answerText(q,value){if(value==='uncertain'||value===undefined)return '不确定 / 未作答';if(q.type==='hotspot')return '图中定位点';return (Array.isArray(value)?value:[value]).map(id=>q.options.find(o=>o.id===id)?.text||'—').join(q.type==='order'?' → ':'；');}
