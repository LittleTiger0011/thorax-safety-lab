import {RELEASE,CHECKPOINTS,DIMENSIONS,PRETEST,POSTTEST,RETEST,KNOWLEDGE} from './content.js';
import {courseProgress} from './course-progress.js';
export const STORAGE_KEY='thorax.safety.sessions.v1';
const clone=x=>JSON.parse(JSON.stringify(x));
export function newSession(kind='learner',now=new Date().toISOString()){
 return {schema:1,id:`${kind==='demo'?'DEMO':'L'}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,release:RELEASE,kind,created:now,updated:now,events:[],exams:[],checkpointResults:{},caseA:{opened:[],choices:[]},reflection:'',phase:'explore',step:0};
}
export function record(s,type,data={},at=new Date().toISOString()){
 const e={seq:s.events.length+1,time:at,type,context:s.kind==='demo'?'teacher_demo':'learning',...clone(data)};s.events.push(e);s.updated=at;return e;
}
export function checkpointAnswer(s,index,target,preserve,view){
 const cp=CHECKPOINTS[index];if(!cp)throw new Error('未知检查点');
 const correct=target===cp.target&&(!cp.preserve||preserve===cp.preserve);
 const category=target===cp.target&&cp.preserve&&preserve!==cp.preserve?'保护对象遗漏':cp.category;
 const event=record(s,'training_answer',{checkpoint:cp.id,target,preserve,correct,hintsBefore:s.checkpointResults[cp.id]?.hints||0,category:correct?null:category,view});
 const prior=s.checkpointResults[cp.id]||{first:null,attempts:0,passed:false,hints:0};if(!prior.first)prior.first=clone(event);prior.attempts++;prior.passed=prior.passed||correct;prior.last=clone(event);s.checkpointResults[cp.id]=prior;return {correct,category,event,first:prior.first};
}
export function hintUsed(s,index){const cp=CHECKPOINTS[index],result=s.checkpointResults[cp.id]||{first:null,attempts:0,passed:false,hints:0};result.hints++;s.checkpointResults[cp.id]=result;return record(s,'hint',{checkpoint:cp.id,level:Math.min(result.hints,2)});}
export function startExam(s,kind,seed=Date.now()){
 const bank=kind==='pre'?PRETEST:kind==='post'?POSTTEST:RETEST;
 const exam={id:`${kind}-${s.exams.length+1}`,kind,seed,bankVersion:'Q-2026.09.12-1',questionIds:bank.map(q=>q.id),responses:{},confidence:{},started:new Date().toISOString(),submitted:null,abandoned:false};s.exams.push(exam);record(s,'exam_start',{exam:exam.id,kind,seed});return exam;
}
export function answerExam(s,exam,index,answer,confidence){
 if(exam.submitted||exam.abandoned)throw new Error('本测验已结束');const id=exam.questionIds[index];if(!id)throw new Error('题目不存在');exam.responses[id]=answer;if(confidence)exam.confidence[id]=confidence;
 record(s,'assessment_response',{exam:exam.id,question:id,answer,confidence:confidence||null});
}
export function examBank(kind){return kind==='pre'?PRETEST:kind==='post'?POSTTEST:RETEST;}
export function scoreExam(exam){
 const bank=examBank(exam.kind),dims={};for(const [key,d] of Object.entries(DIMENSIONS)){const qs=bank.filter(q=>q.dimension===key);const correct=qs.filter(q=>exam.responses[q.id]===q.answer).length;dims[key]={...d,correct,total:qs.length,points:qs.length?d.weight*correct/qs.length:0};}
 const total=exam.kind==='retry'?Math.round(bank.filter(q=>exam.responses[q.id]===q.answer).length/bank.length*100):Math.round(Object.values(dims).reduce((n,d)=>n+d.points,0));
 const critical=bank.filter(q=>q.critical),criticalCorrect=critical.filter(q=>exam.responses[q.id]===q.answer).length;
 return {total,dimensions:dims,correct:bank.filter(q=>exam.responses[q.id]===q.answer).length,count:bank.length,criticalCorrect,criticalCount:critical.length,criticalPassed:criticalCorrect===critical.length,meetsProvisionalCriterion:total>=80&&criticalCorrect===critical.length};
}
export function submitExam(s,exam){if(exam.submitted||exam.abandoned)throw new Error('本测验已结束');if(exam.questionIds.some(id=>!(id in exam.responses)))throw new Error('请先完成全部题目');exam.submitted=new Date().toISOString();exam.result=scoreExam(exam);record(s,'exam_submit',{exam:exam.id,kind:exam.kind,result:exam.result});return exam.result;}
export function learningSummary(s){
 const answers=s.events.filter(e=>e.type==='training_answer'),first=CHECKPOINTS.map(c=>s.checkpointResults[c.id]).filter(r=>r?.first),wrong=answers.filter(e=>!e.correct),categories={};for(const e of wrong)categories[e.category]=(categories[e.category]||0)+1;
 for(const e of s.events.filter(e=>e.type==='case_answer'&&!e.correct))categories['条件不足']=(categories['条件不足']||0)+1;
 for(const e of s.exams.filter(e=>e.submitted&&!e.abandoned)){for(const q of examBank(e.kind)){if(e.responses[q.id]===q.answer)continue;const category=q.dimension==='anatomy'?'方向混淆':q.dimension==='mapping'?'结构混淆':q.dimension==='decision'?'条件不足':'危险应对';categories[category]=(categories[category]||0)+1;}}
 const recommendations=Object.entries(categories).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([category,count])=>({category,count,...KNOWLEDGE[category]}));
 const exams=s.exams.filter(e=>e.submitted&&!e.abandoned),pre=exams.find(e=>e.kind==='pre'),post=exams.find(e=>e.kind==='post'),retry=exams.filter(e=>e.kind==='retry').at(-1);
 return {kind:s.kind,firstCount:first.length,firstCorrect:first.filter(r=>r.first.correct).length,firstIndependent:first.filter(r=>r.first.correct&&!r.first.hintsBefore).length,trainingErrors:wrong.length,hints:s.events.filter(e=>e.type==='hint').length,consequenceViews:s.events.filter(e=>e.type==='consequence_start').length,pauses:s.events.filter(e=>e.type==='safety_pause').length,rollbacks:s.events.filter(e=>e.type==='rollback').length,passed:CHECKPOINTS.filter(c=>s.checkpointResults[c.id]?.passed).length,pre:pre?scoreExam(pre):null,post:post?scoreExam(post):null,retry:retry?scoreExam(retry):null,recommendations,completed:courseProgress(s).completed};
}
export function sessionCSV(s,{orAttempts=[]}={}){
 const cols=['session','data_kind','module','attempt_id','seq','time','type','step_id','item_id','checkpoint','exam','question','target','preserve','answer','correct','completed','category','effect','details'];
 const events=[...s.events.map(e=>({...e,module:e.type.startsWith('intelligent_')?'assessment':e.type.startsWith('case_')?'case':'safety',attempt_id:e.attempt||e.exam,details:JSON.stringify(e)})),...orAttempts.flatMap(a=>(a.log||[]).map(e=>({...e,module:'or-field',attempt_id:a.id,time:new Date(e.t_abs).toISOString(),type:e.event,details:JSON.stringify(e)})))];
 const cell=x=>'"'+String(x??'').replaceAll('"','""')+'"';
 return '\ufeff'+[cols.join(','),...events.map(e=>cols.map(k=>cell(k==='session'?s.id:k==='data_kind'?s.kind:e[k])).join(','))].join('\r\n');
}
export function validateSession(s){return s&&s.schema===1&&typeof s.id==='string'&&['learner','demo'].includes(s.kind)&&Array.isArray(s.events)&&Array.isArray(s.exams)&&s.checkpointResults&&s.caseA;}
export function loadSessions(storage){try{const d=JSON.parse(storage.getItem(STORAGE_KEY)||'{}');if(d.schema!==1)return {schema:1,sessions:[],active:null};d.sessions=d.sessions.filter(validateSession);return d;}catch{return {schema:1,sessions:[],active:null};}}
export function persistSessions(storage,store){try{storage.setItem(STORAGE_KEY,JSON.stringify(store));return true;}catch{return false;}}
