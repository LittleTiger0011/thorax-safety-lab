import {BANK_VERSION,SKILLS} from './assessment-data.js';
import {MODEL,validAnswer,correctAnswer,learnerProfile} from './assessment-core.js';
import {EVIDENCE_VERSION,evidenceLab,questionEvidence} from './assessment-evidence.js';
import {KNOWLEDGE_VERSION,KNOWLEDGE_NODES,KNOWLEDGE_EDGES,nodeForQuestion} from './knowledge-data.js';

const sum=(items,key)=>items.reduce((n,x)=>n+(Number(x[key])||0),0);
const average=values=>values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null;
const safeElapsed=value=>Number.isFinite(value)&&value>0?Math.round(value):0;

function mastery(observations){
 if(!observations.length)return null;
 let p=MODEL.prior;
 for(const o of observations){const guess=o.q.type==='single'?MODEL.guess:.08;p=o.correct?p*(1-MODEL.slip)/(p*(1-MODEL.slip)+(1-p)*guess):p*MODEL.slip/(p*MODEL.slip+(1-p)*(1-guess));}
 return Math.round(p*100);
}

export function learningSnapshot(session,bank){
 // Reading a chart must not migrate or overwrite the learner's stored records.
 const context=JSON.parse(JSON.stringify(session)),lab=evidenceLab(context,bank),byId=new Map(bank.map(q=>[q.id,q]));
 const observations=[],completed=[],attempts=new Map();
 for(const attempt of lab.attempts){
  if(attempt.bankVersion!==BANK_VERSION||attempt.abandoned)continue;
  const prior=attempts.get(attempt.id);
  if(!prior||!prior.submitted&&attempt.submitted)attempts.set(attempt.id,attempt);
 }
 for(const attempt of [...attempts.values()].sort((a,b)=>String(a.submitted||a.started||'').localeCompare(String(b.submitted||b.started||'')))){
  const submitted=!!attempt.submitted;
  if(submitted)completed.push(attempt);
  const ids=submitted?attempt.questionIds:['adaptive','case'].includes(attempt.kind)?attempt.reviewed:[];
  for(const id of new Set(ids||[])){
   const q=byId.get(id),r=attempt.responses?.[id];
   if(!q||!r||!nodeForQuestion(q)||!validAnswer(q,r.value))continue;
   // Prefer the immutable submission snapshot; later revision does not erase first evidence.
   const evidence=r.evidence||questionEvidence(attempt,q,context);
   const eligible=submitted&&attempt.evidenceVersion===EVIDENCE_VERSION&&attempt.evidenceByQuestion?.[id]?.version===EVIDENCE_VERSION&&['pre','post','retry','diagnostic'].includes(attempt.kind)&&evidence.known&&evidence.unseen&&evidence.independent&&!r.hints;
   observations.push({q,r,attemptId:attempt.id,node:nodeForQuestion(q),correct:correctAnswer(q,r.value),independent:!!eligible,submitted,kind:attempt.kind,known:!!evidence.known,elapsedMs:safeElapsed(r.elapsedMs),time:attempt.submitted||r.at||attempt.started||''});
  }
 }
 observations.sort((a,b)=>a.time.localeCompare(b.time));
 const first=new Map();
 observations.forEach((o,i)=>{o.ordinal=i;if(o.independent){if(first.has(o.q.id))o.independent=false;else first.set(o.q.id,o);}});
 const independent=[...first.values()],submitted=observations.filter(o=>o.submitted);
 const nodes=KNOWLEDGE_NODES.map(node=>{
  const all=observations.filter(o=>o.node===node.id),evidence=independent.filter(o=>o.node===node.id),wrong=evidence.filter(o=>!o.correct);
  const unresolved=wrong.filter(o=>!evidence.some(n=>n.q.id!==o.q.id&&n.q.family===o.q.family&&n.correct&&n.ordinal>o.ordinal));
  const pending=unresolved.filter(o=>all.some(n=>n.q.id===o.q.id&&n.correct&&n.ordinal>o.ordinal));
  const high=unresolved.filter(o=>o.r.confidence==='high').length,estimate=mastery(evidence);
  const state=!evidence.length?'unseen':pending.length?'recheck':unresolved.length?'weak':evidence.length<3?'building':estimate>=80?'steady':'building';
  const status={unseen:'待测',recheck:'订正待验证',weak:'需要巩固',building:'证据积累中',steady:'本组表现较稳'}[state];
  return {...node,estimate,state,status,independent:evidence.length,correct:evidence.filter(o=>o.correct).length,highConfidenceErrors:high,unresolved:unresolved.length,correctedPending:pending.length,assisted:all.filter(o=>o.r.hints).length,reviewed:all.filter(o=>!o.independent).length,elapsedMs:sum(all.filter(o=>o.submitted),'elapsedMs'),available:bank.filter(q=>nodeForQuestion(q)===node.id).length,priority:high*4+unresolved.length*2+pending.length,prerequisites:KNOWLEDGE_EDGES.filter(e=>e.to===node.id).map(e=>e.from)};
 });
 const original=learnerProfile(context,bank);
 const skills=SKILLS.map(skill=>{
  const evidence=independent.filter(o=>o.q.skill===skill.id),all=submitted.filter(o=>o.q.skill===skill.id),profile=original.find(p=>p.id===skill.id);
  const members=nodes.filter(n=>n.skill===skill.id),estimate=mastery(evidence);
  const status=!evidence.length?'待测':members.some(n=>n.correctedPending)?'订正待验证':members.some(n=>n.unresolved)?'需要巩固':evidence.length<3?'证据积累中':estimate>=80?'本组表现较稳':'继续巩固';
  return {...skill,estimate,independent:evidence.length,correct:evidence.filter(o=>o.correct).length,assisted:all.filter(o=>o.r.hints).length,highConfidenceErrors:evidence.filter(o=>!o.correct&&o.r.confidence==='high').length,lowConfidenceCorrect:evidence.filter(o=>o.correct&&o.r.confidence==='low').length,elapsedMs:sum(all,'elapsedMs'),timed:all.filter(o=>o.elapsedMs).length,nodes:members,trainingSignals:profile.trainingSignals,status};
 });
 const confidence=['high','medium','low'].map(id=>{const rows=independent.filter(o=>o.r.confidence===id);return {id,label:{high:'高信心',medium:'中等信心',low:'低信心'}[id],count:rows.length,correct:rows.filter(o=>o.correct).length,rate:rows.length?Math.round(rows.filter(o=>o.correct).length/rows.length*100):null};});
 const types=['single','multi','order','hotspot'].map(id=>{const rows=independent.filter(o=>o.q.type===id);return {id,label:{single:'单项判断',multi:'多项选择',order:'步骤排序',hotspot:'图像定位'}[id],count:rows.length,correct:rows.filter(o=>o.correct).length,rate:rows.length?Math.round(rows.filter(o=>o.correct).length/rows.length*100):null};});
 return {version:KNOWLEDGE_VERSION,bankVersion:BANK_VERSION,sessionId:session.id,isDemo:session.kind==='demo',skills,nodes,confidence,types,weak:nodes.filter(n=>['weak','recheck'].includes(n.state)).sort((a,b)=>b.priority-a.priority),summary:{averageEstimate:average(skills.map(s=>s.estimate).filter(v=>v!==null)),coveredDimensions:skills.filter(s=>s.independent).length,coveredNodes:nodes.filter(n=>n.independent).length,independent:independent.length,correct:independent.filter(o=>o.correct).length,completedAttempts:completed.length,submittedAnswers:submitted.length,assisted:submitted.filter(o=>o.r.hints).length,reviewAnswers:submitted.filter(o=>!o.independent).length,highConfidenceErrors:independent.filter(o=>!o.correct&&o.r.confidence==='high').length,lowConfidenceCorrect:independent.filter(o=>o.correct&&o.r.confidence==='low').length,elapsedMs:sum(submitted,'elapsedMs'),timedAnswers:submitted.filter(o=>o.elapsedMs).length},model:{...MODEL,display:'仅依首次未见题更新；未测节点不显示先验值'}};
}

export function durationLabel(ms){if(!ms)return '未计时';const seconds=Math.round(ms/1000);return seconds<60?`${Math.max(1,seconds)} 秒`:`${Math.floor(seconds/60)} 分${seconds%60?` ${seconds%60} 秒`:''}`;}
