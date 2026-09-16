import {BANK_VERSION,SKILLS} from './assessment-data.js';
import {DIAGNOSTIC_IDS} from './knowledge-data.js';

export const EVIDENCE_VERSION='EXPOSURE-2026.09.14-1';
export const FORM_VERSION='FORM-2026.09.14-2';
export const TRANSFER_IDS=['orientation-6','ct-CT-015','vessels-6','airway-6','decision-6','fitness-6','staging-6','safety-6'];
export function blueprint(bank,kind){
 if(kind==='diagnostic')return DIAGNOSTIC_IDS.filter(id=>bank.some(q=>q.id===id));
 if(kind==='retry')return TRANSFER_IDS.filter(id=>bank.some(q=>q.id===id));
 return SKILLS.flatMap(s=>s.id==='segment'?(kind==='pre'?['segment-2','ct-CT-001']:['segment-4','ct-CT-004']):bank.filter(q=>q.skill===s.id&&q.id.startsWith(s.id+'-')).slice(kind==='pre'?0:2,kind==='pre'?2:4).map(q=>q.id));
}
export function evidenceLab(session,bank=null){
 const lab=session.assessmentV2||(session.assessmentV2={version:BANK_VERSION,attempts:[],lessonViews:[]});
 lab.attempts ||= [];lab.lessonViews ||= [];
 if(!lab.exposureVersion){
  lab.exposures ||= [];
  // Legacy logs cannot certify that an issued question was never seen. Keep scores intact.
  for(const a of lab.attempts){
   a.exposureStatus ||= 'legacy-unknown';
   for(const id of a.questionIds||[])lab.exposures.push({seq:lab.exposures.length+1,questionId:id,type:'legacy-issued',attemptId:a.id,at:a.started||null});
  }
  const oldLessons={orientation:'orientation-2',segment:'ct-CT-001',vessels:'vessels-3',airway:'airway-2',decision:'decision-1',fitness:'fitness-1',staging:'staging-1',safety:'safety-3'};
  for(const v of lab.lessonViews)if(oldLessons[v.skill])lab.exposures.push({seq:lab.exposures.length+1,questionId:oldLessons[v.skill],type:'legacy-lesson',at:v.at||null});
  lab.exposureVersion=EVIDENCE_VERSION;
 }
 lab.exposures ||= [];
 if(bank){const byId=new Map(bank.map(q=>[q.id,q]));for(const e of lab.exposures)if(!e.targetKey&&byId.has(e.questionId))e.targetKey=targetKey(byId.get(e.questionId));}
 return lab;
}
export function targetKey(q){
 const v=q?.visual;
 return v?.kind==='ct'&&v.answerCode&&v.point?`ct:${v.caseId}:${JSON.stringify(v.point)}`:q?.type==='hotspot'?`hotspot:${v?.src}:${JSON.stringify(q.answer)}`:null;
}
export function wasExposed(session,q,{excludeAttempt=null}={}){
 const key=targetKey(q);
 return evidenceLab(session).exposures.some(e=>(!excludeAttempt||e.attemptId!==excludeAttempt)&&e.type!=='asset'&&(e.questionId===q.id||key&&e.targetKey===key));
}
export function recordExposure(session,q,type,attempt=null){
 const lab=evidenceLab(session),attemptId=attempt?.id||null,key=targetKey(q);
 if(lab.exposures.some(e=>e.questionId===q.id&&e.type===type&&e.attemptId===attemptId))return;
 lab.exposures.push({seq:lab.exposures.length+1,questionId:q.id,targetKey:key,type,attemptId,at:new Date().toISOString(),version:EVIDENCE_VERSION});
}
export function presentQuestion(session,attempt,q){
 const lab=evidenceLab(session);attempt.evidenceByQuestion ||= {};
 if(!attempt.evidenceByQuestion[q.id])attempt.evidenceByQuestion[q.id]={version:attempt.evidenceVersion||'legacy-unknown',unseen:attempt.evidenceVersion===EVIDENCE_VERSION&&!wasExposed(session,q),sequence:lab.exposures.length,at:new Date().toISOString()};
 recordExposure(session,q,'stem',attempt);
 return attempt.evidenceByQuestion[q.id];
}
export function questionEvidence(attempt,q,session=null){
 const entry=attempt.evidenceByQuestion?.[q.id],r=attempt.responses?.[q.id];
 const interrupted=session&&entry&&evidenceLab(session).exposures.some(e=>(e.at&&entry.at?e.at>=entry.at:e.seq>entry.sequence)&&e.attemptId!==attempt.id&&e.type!=='asset'&&(e.questionId===q.id||targetKey(q)&&e.targetKey===targetKey(q)));
 const unseen=entry?.version===EVIDENCE_VERSION&&entry.unseen&&!interrupted;
 const independent=!!session&&!!unseen&&!r?.hints&&['pre','post','retry','diagnostic'].includes(attempt.kind);
 return {known:entry?.version===EVIDENCE_VERSION,unseen:!!unseen,independent,interrupted:!!interrupted};
}
export function reservedKind(bank,q){return ['pre','post','retry'].find(k=>blueprint(bank,k).includes(q.id))||null;}
export function practiceAvailable(session,bank,q){
 const lab=evidenceLab(session),reserved=bank.filter(other=>reservedKind(bank,other)&&(other.id===q.id||targetKey(q)&&targetKey(q)===targetKey(other)));
 return reserved.every(other=>lab.attempts.some(a=>a.submitted&&!a.abandoned&&a.questionIds?.includes(other.id)));
}
export function attemptName(a){
 if(a.kind==='diagnostic')return a.exposureStatus==='mixed-review'?'16 点知识诊断 · 含复习题':'16 点知识诊断';
 if(a.kind==='review')return `${a.sourceKind==='pre'?'起点检测':a.sourceKind==='post'?'综合检测':'检测'} · 同卷复习`;
 return ({pre:'起点检测',post:'独立综合检测',retry:'未见题迁移检查',adaptive:'AI 定向复练',case:'真实病例阅片'})[a.kind]||'历史检测';
}

// Merge append-only exposure/history evidence from another tab without replacing active drafts.
export function mergeAssessmentEvidence(session,remote){
 if(!remote?.assessmentV2||remote.id!==session.id)return;
 const local=evidenceLab(session),other=evidenceLab(remote);
 const key=e=>JSON.stringify([e.questionId,e.type,e.attemptId||null,e.at||null]);
 const known=new Set(local.exposures.map(key));
 for(const e of other.exposures)if(!known.has(key(e))){local.exposures.push({...e,seq:local.exposures.length+1});known.add(key(e));}
 for(const a of other.attempts){const existing=local.attempts.find(x=>x.id===a.id);if(!existing)local.attempts.push(structuredClone(a));else if(a.submitted&&!existing.submitted)Object.assign(existing,structuredClone(a));}
}
