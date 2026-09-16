import {CHECKPOINTS} from './content.js';
import {assessmentReportSummary} from './assessment-core.js';
import {LEVELS,levelStatus,caseComplete} from './case-decision-levels.js';
import {caseById} from './case-decision-data.js';
export function courseProgress(session){
 const assessment=assessmentReportSummary(session);
 const tasks=[
  {id:'pre',name:'起点检测 16 题提交',done:assessment.preCompleted},
  {id:'screen',name:'第 1 关 15 例分层判读通过',done:levelStatus(session,LEVELS[0]).passed},
  {id:'case',name:'第 2 关 CT-004 完整方案提交',done:caseComplete(session,caseById('CT-004'),LEVELS[1])},
  {id:'checkpoints',name:'六个安全检查点通过',done:CHECKPOINTS.every(c=>session.checkpointResults?.[c.id]?.passed)},
  {id:'consequence',name:'至少一次后果分支查看',done:session.events.some(e=>e.type==='consequence_start')},
  {id:'post',name:'综合检测 16 题提交',done:assessment.postCompleted},
 ];
 return {tasks,completed:tasks.every(t=>t.done),missing:tasks.filter(t=>!t.done).map(t=>t.name),done:tasks.filter(t=>t.done).length,total:tasks.length};
}
