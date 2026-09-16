import {RealTrainingViewer} from './training-viewer-bridge.js';
import {AssessmentLab} from './assessment-lab.js';
import {KnowledgeAtlas} from './knowledge-atlas.js';
import {mountCourseQA} from './course-qa.js';
import {learningSnapshot} from './learning-profile.js';
import {ExploreLab} from './explore-lab.js';
import {CaseDecisionLab} from './case-decision.js';
import {assessmentReportSummary} from './assessment-core.js';
import {mergeAssessmentEvidence,recordExposure} from './assessment-evidence.js';
import {KNOWLEDGE_NODES} from './knowledge-data.js';
import {courseProgress} from './course-progress.js';
import {loadOrStore,attemptsForOwner,clearLearningRecords,generation} from './or-field-records.mjs';
import {SKILLS} from './assessment-data.js';
import {TrainingFootage} from './training-footage.js';
import {STRUCTURES,FOCUS_IDS,LOBES,PHYSIOLOGY,CAMERAS,MODEL_VERSION} from './anatomy-data.js';
import {RELEASE,UNIT,OBJECTIVES,LESSON,WORKFLOW,CASE_A,CASE_B,CHECKPOINTS,KNOWLEDGE,DIMENSIONS} from './content.js';
import {newSession,record,checkpointAnswer,hintUsed,startExam,answerExam,submitExam,examBank,scoreExam,learningSummary,sessionCSV,loadSessions,persistSessions} from './state.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
let store=loadSessions(localStorage),session=store.sessions.find(s=>s.id===store.active)||newSession();if(!store.sessions.includes(session))store.sessions.push(session);store.active=session.id;
let route='explore',step=session.step||0,trainingChoice=null,protectChoice=null,trainingFeedback=null,exam=null,examIndex=0,examChoice=null,confidence=null,effectState=null,viewer,toastTimer,demoTimer=null,demoIndex=0,demoPlaying=false,previousLearner=store.sessions.filter(s=>s.kind==='learner').at(-1)?.id;
let recordGeneration=generation(localStorage);
let assessmentGuard=false,trainingTab='checkpoints',assessmentMount=Promise.resolve();
let checkpointFootage=null,checkpointFootageStep=-1;
let courseQA=null;
const assessmentLab=new AssessmentLab(document.querySelector('#training-assessment'),{getSession:assessmentSession,save,log:(type,data)=>record(session,type,data),toast,download,lock:lockAssessment,openKnowledge:node=>navigate('knowledge',{node})});
const knowledgeAtlas=new KnowledgeAtlas(document.querySelector('#knowledge-center'),{getSession:assessmentSession,getBank:async()=>{await assessmentLab.load();return assessmentLab.bank;},openAssessment:openAtlasAssessment,onLearnNode:recordKnowledgeReading});
const exploreLab=new ExploreLab({getSession:()=>session,getViewer:()=>viewer,save,toast,log:(type,data)=>record(session,type,data),screen,updateStrip,goPretest:()=>beginExam('pre'),goCheckpoints:()=>{step=0;navigate('training',{tab:'checkpoints'});}});
const caseLab=new CaseDecisionLab({getSession:()=>session,save,toast,log:(type,data)=>record(session,type,data),modal,navigate,getViewer:()=>viewer,chooseStep:i=>chooseStep(i)});
function lockAssessment(locked){
 assessmentGuard=locked;$('#tutor').hidden=true;$('#tutor-button').hidden=locked;
 for(const id of ['lesson-btn','demo-btn','sessions-btn','tutor-button'])$('#'+id).disabled=locked;
 $$('#main-nav button').forEach(b=>b.disabled=locked);
 $$('[data-training-tab]').forEach(b=>b.disabled=locked);
 $$('#main-nav a').forEach(a=>{a.setAttribute('aria-disabled',String(locked));if(locked)a.setAttribute('tabindex','-1');else a.removeAttribute('tabindex');});
 document.body.classList.toggle('assessment-active',locked);
 const demoConsole=$('.demo-console');if(demoConsole)demoConsole.hidden=locked;
}
const names={explore:'三屏探索',cases:'病例决策',training:'安全训练',assessment:'独立测评',knowledge:'知识图谱',report:'学习报告'};
function assessmentSession(){if(recordGeneration===generation(localStorage)){const remote=loadSessions(localStorage).sessions.find(s=>s.id===session.id);mergeAssessmentEvidence(session,remote);}return session;}
function recordKnowledgeReading(nodeId,version){
 if(exam||assessmentGuard||route!=='knowledge')return;
 const node=KNOWLEDGE_NODES.find(n=>n.id===nodeId);if(!node)return;
 const current=assessmentSession();
 // Full chapters cover related concepts in the same domain. Reading is learning
 // exposure, never evidence of mastery or a new independent correct response.
 for(const q of assessmentLab.bank||[])if(q.skill===node.skill)recordExposure(current,q,'knowledge-topic');
 if(!current.events.some(e=>e.type==='knowledge_topic_open'&&e.node===nodeId&&e.version===version))record(current,'knowledge_topic_open',{node:nodeId,skill:node.skill,version});
 save();
}
function save(){if(recordGeneration!==generation(localStorage)){$('#save-status').textContent='本机记录已清除，请重新打开页面';return;}const latest=loadSessions(localStorage);mergeAssessmentEvidence(session,latest.sessions.find(s=>s.id===session.id));store.sessions=[...latest.sessions.filter(s=>s.id!==session.id),session,...store.sessions.filter(s=>s.id!==session.id&&!latest.sessions.some(x=>x.id===s.id))];store.active=session.id;const ok=persistSessions(localStorage,store);$('#save-status').textContent=ok?'本机自动保存':'保存失败，请立即导出记录';$('#save-status').style.color=ok?'':'#ffb1b8';$('#session-id').textContent=session.id;$('#session-kind').textContent=session.kind==='demo'?'教师演示 · 不作为教学成效':'匿名学习';document.body.classList.toggle('demo-session',session.kind==='demo');}
function toast(s){const el=$('#toast');el.textContent=s;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,4200);}
function modal(title,body){$('#modal-content').innerHTML=`<header class="modal-header"><h2>${title}</h2><button data-close-modal aria-label="关闭对话框">×</button></header><div class="modal-body">${body}</div>`;$('#modal').showModal();$('#modal [data-close-modal]').onclick=()=>$('#modal').close();}
function download(text,name,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function updateStrip(){
 if(viewer?.structureGroups){
  const groups=viewer.structureGroups();
  $('#structure-strip').innerHTML=groups.length?groups.map(([label,items])=>`<span class="group-label">${esc(label)}</span>`+items.map(m=>`<button data-structure="${esc(m.id)}" class="${viewer?.selected===m.id||viewer?.real?.selectedId===m.id?'active':''}">${esc(m.name)}</button>`).join('')).join(''):'<span class="group-label">载入结构目录…</span>';
 }else{
  const groups=[['肺叶',['rul','rml','rll','lul','lll']],['关键分支',['rulv','rmlv','rub','bi','a13','interlobar']]];
  $('#structure-strip').innerHTML=groups.map(([label,ids])=>`<span class="group-label">${label}</span>`+ids.map(id=>`<button data-structure="${id}" class="${viewer?.selected===id?'active':''}">${STRUCTURES[id].name}</button>`).join('')).join('');
 }
 $$('[data-structure]').forEach(b=>b.onclick=()=>{if(exam)return;viewer.select(b.dataset.structure);record(session,'explore_selection',{structure:b.dataset.structure,source:'catalog'});viewer.updateLabels();updateStrip();save();});
}
function screen(key){$('.viewport-grid').dataset.mobileScreen=key;$$('[data-screen]').forEach(b=>{b.classList.toggle('active',b.dataset.screen===key);b.setAttribute('aria-selected',String(b.dataset.screen===key));});requestAnimationFrame(()=>viewer.resize());}
function navigate(next,opts={}){
 if((exam||assessmentGuard)&&!opts.force){toast('请先提交检测，或保存后再切换。');return;}
 if(next==='assessment'){next='training';opts={...opts,tab:'assessment'};}
 if(next==='training')trainingTab=opts.tab||trainingTab||'checkpoints';
 const isAssessment=next==='training'&&trainingTab==='assessment';
 const isExplore=next==='explore'||(next==='training'&&trainingTab==='explore');
 const needsViewer=['explore','exam','consequence'].includes(next)||(next==='training'&&!isAssessment);
 if(needsViewer&&!ensureViewer())return;
 if(!(next==='training'&&trainingTab==='checkpoints')){checkpointFootage?.destroy();checkpointFootage=null;checkpointFootageStep=-1;$('#checkpoint-footage').hidden=true;}
 if(!isAssessment)assessmentLab.unmount();
 if(next!=='cases')caseLab.unmount();
 if(next!=='knowledge')knowledgeAtlas.unmount();
 if(next!=='report'){courseQA?.destroy();courseQA=null;}
 route=next;session.phase=next;
 document.title=route==='knowledge'?'胸外科临床知识图谱｜图解与循证学习':route==='report'?'学习报告与多维画像｜胸外科安全实训':'安全训练与学习测评｜胸外科安全实训';
 $('#training-center').hidden=!['training','consequence','explore'].includes(route);
 $('#training-assessment').hidden=!isAssessment;
 $('#workspace').hidden=!needsViewer;
 $('#content-page').hidden=!['cases','report'].includes(route);
 $('#knowledge-center').hidden=route!=='knowledge';
 const selectedTab=isAssessment?'assessment':isExplore?'explore':'checkpoints';
 $$('[data-training-tab]').forEach(b=>{const selected=b.dataset.trainingTab===selectedTab;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
 $('.skip-link').href=isAssessment?'#training-assessment':needsViewer?'#task-panel':route==='knowledge'?'#knowledge-center':'#content-page';
 $$('#main-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===next||(['consequence','exam'].includes(route)&&b.dataset.nav==='training')));
 $('#phase-label').textContent=isExplore?'同源三屏 / 引导探索':route==='training'?'病例 B / 六个本科安全检查点':route==='exam'?'独立测验 / 提示关闭':route==='consequence'?'错误后果 / 主动学习':'同源三屏 / 自由探索';
 $('#workspace-title').textContent=isExplore?'真实影像 · 三维解剖 · 局部对照':route==='training'?CHECKPOINTS[step].name:route==='exam'?'换一个视角，独立辨认':route==='consequence'?'看清后果，再回到判断之前':'从切面，到结构，再到术野';
 $('#structure-strip').hidden=!!exam;$('#tutor-button').hidden=!!exam||route==='knowledge';$('#exam-guard').hidden=!exam;
 const lock=!!exam;
 // Query existing controls: the real CT workspace replaced the schematic toggles.
 $$('#layers-btn, #scope-view, #scope-fit, #slice, #slice-prev, #slice-next, #locate-slice, #clear-selection, #lesson-btn, #demo-btn, #tutor-button, #reset-view, #sessions-btn, #opacity, #training-case-select, #window-preset, #window-width, #window-center, #measure-btn, [data-real-plane], [data-camera]').forEach(control=>control.disabled=lock);
 $('#main-nav').setAttribute('aria-disabled',String(lock));
 if(isExplore)renderExplore();else{exploreLab.unmount();if(next==='training'){if(isAssessment)renderAssessment();else renderTraining();}}if(next==='knowledge')knowledgeAtlas.mount(opts.node);if(next==='cases')renderCases();if(next==='report')renderReport();if(next==='exam')renderExam();if(next==='consequence')renderConsequence();
 renderDemoConsole();save();requestAnimationFrame(()=>viewer?.resize());
}
function renderExplore(){
 exploreLab.mount($('#task-panel'));
}
function chooseStep(i){if(exam||assessmentGuard||!ensureViewer())return;step=Math.max(0,Math.min(5,i));session.step=step;trainingChoice=null;protectChoice=null;trainingFeedback=null;viewer.setExam(null);viewer.select(CHECKPOINTS[step].focus);viewer.updateLabels();$('#scope-view').value=viewer.view;navigate('training',{tab:'checkpoints'});}
function renderTraining(){
 const cp=CHECKPOINTS[step],r=session.checkpointResults[cp.id];
 $('#checkpoint-footage').hidden=false;
 if(!checkpointFootage)checkpointFootage=new TrainingFootage($('#checkpoint-footage'),{clip:['04','01','02','02','03','03'][step],onLearn:data=>{record(session,'training_media_view',{checkpoint:CHECKPOINTS[step].id,...data});save();}});
 else if(checkpointFootageStep!==step)checkpointFootage.show(['04','01','02','02','03','03'][step]);
 checkpointFootageStep=step;
 $('#task-panel').innerHTML=`<div class="task-card"><div class="steps">${CHECKPOINTS.map((c,i)=>`<button data-step="${i}" class="${i===step?'active':''} ${session.checkpointResults[c.id]?.passed?'done':''}"><span>检查点 ${i+1}</span>${c.name}</button>`).join('')}</div><header><div><p class="eyebrow">${CASE_B.subtitle}</p><h2>${cp.question}</h2><p>先认目标，再确认保留对象。可以随时暂停重新辨认。</p></div><span class="tag ${r?.passed?'good':''}">${r?.passed?'本点已完成':'等待确认'}</span></header><div class="dual-answer"><div><h3>目标／安全判断</h3><div class="answer-grid">${cp.options.map(([v,t],i)=>`<button data-choice="${v}" class="${trainingChoice===v?'selected':''}"><span class="option-letter">${String.fromCharCode(65+i)}</span>${t}</button>`).join('')}</div></div>${cp.preserve?`<div><h3>${cp.preservePrompt}</h3><div class="answer-grid">${cp.preserveOptions.map(([v,t])=>`<button data-protect="${v}" class="${protectChoice===v?'selected':''}"><span class="option-letter">□</span>${t}</button>`).join('')}</div></div>`:'<div class="reading-card"><h3>入胸安全概念</h3><p>本单元展示一种教学观察路径。孔位、结构处理顺序与操作方式取决于具体入路、肺裂和变异。</p></div>'}</div>${trainingFeedback?`<div class="feedback ${trainingFeedback.correct?'':'error'}"><strong>${trainingFeedback.correct?'辨认通过，安全门禁已解锁':'安全门禁拦截：请重新辨认'}</strong>${esc(trainingFeedback.text)}</div>`:''}<div class="actions"><button class="primary" id="submit-training" ${!trainingChoice||cp.preserve&&!protectChoice?'disabled':''}>提交双重确认</button><button class="outline" id="safe-pause">不确定，先暂停</button><button class="outline" id="get-hint">分级提示${r?.hints?` · 已用 ${r.hints} 次`:''}</button>${cp.effect?'<button class="outline" id="view-effect">主动查看错误后果</button>':''}${r?.passed?`<button class="gold" id="next-step">${step<5?'下一检查点':'进入独立后测'}</button>`:''}</div><p class="small muted" style="margin-top:12px">只记录实际提交的答案。探索点击和主动查看后果不计错；首次表现不会被复练覆盖。</p></div>`;
 $$('[data-step]').forEach(b=>b.onclick=()=>chooseStep(+b.dataset.step));$$('[data-choice]').forEach(b=>b.onclick=()=>{trainingChoice=b.dataset.choice;renderTraining();});$$('[data-protect]').forEach(b=>b.onclick=()=>{protectChoice=b.dataset.protect;renderTraining();});
 $('#submit-training').onclick=submitTraining;
 $('#safe-pause').onclick=()=>{record(session,'safety_pause',{checkpoint:cp.id,view:viewer.snapshot()});save();toast('已记录主动暂停；这是安全学习行为，不计错。');};
 $('#get-hint').onclick=()=>{const e=hintUsed(session,step);save();trainingFeedback={correct:true,text:cp.hint[e.level-1]};renderTraining();record(session,'knowledge_open',{category:cp.category,checkpoint:cp.id});save();};
 $('#view-effect')?.addEventListener('click',()=>confirmConsequence(cp.effect));$('#next-step')?.addEventListener('click',()=>step<5?chooseStep(step+1):beginExam('post'));
}
function submitTraining(){
 const cp=CHECKPOINTS[step],r=checkpointAnswer(session,step,trainingChoice,protectChoice,viewer.snapshot());trainingFeedback={correct:r.correct,text:r.correct?cp.why:`${r.category}。${cp.hint[0]} 首次答案已保留；尚未执行任何损伤动作。`};save();renderTraining();
}
function confirmConsequence(key){
 const e=PHYSIOLOGY[key];modal('进入错误后果演示',`<p>您将主动查看“${e.name}”的模拟后果。只有确认模拟动作后，场景才会改变。</p><div class="feedback notice">这次查看只记为学习行为，不计入首次正确率或危险答案。返回操作前仍保留真实作答记录。</div><div class="modal-footer"><button class="primary" id="confirm-effect">确认模拟动作</button><button class="outline" id="cancel-effect">返回训练</button></div>`);
 $('#confirm-effect').onclick=()=>{$('#modal').close();startConsequence(key);};$('#cancel-effect').onclick=()=>$('#modal').close();
}
function startConsequence(key,sourceEvent=null){
 const snapshot=sourceEvent?.view||viewer.snapshot();effectState={key,progress:0,snapshot,step,sourceEvent,returnRoute:'training',playing:false};viewer.setExam(null);viewer.select(PHYSIOLOGY[key].target);viewer.setEffect(key,0);record(session,'consequence_start',{effect:key,checkpoint:CHECKPOINTS[step].id,view:snapshot,sourceEvent:sourceEvent?.seq||null,learningOnly:true});navigate('consequence');
}
function renderConsequence(){const e=PHYSIOLOGY[effectState.key],origin=effectState.sourceEvent;
 $('#task-panel').innerHTML=`<div class="task-card"><header><div><p class="eyebrow">主动学习 · 不计为犯错</p><h2 class="effect-title">${e.name}</h2></div><span class="tag warn">时间压缩示意</span></header><p>${e.principle}</p><div class="effect-flow"><span>辨认结构</span><b>→</b><span>确认模拟动作</span><b>→</b><span>${e.trend}</span></div><div class="effect-progress"><button id="effect-play" class="primary">${effectState.playing?'暂停回放':'播放后果'}</button><input id="effect-progress" type="range" min="0" max="100" value="${effectState.progress*100}" aria-label="后果回放进度"><span id="effect-percent">${Math.round(effectState.progress*100)}%</span></div><p class="small muted" style="margin-top:12px">动画表达关系与趋势，没有个体失血量、血氧或损伤时间预测。${origin?'此回放关联第 '+origin.seq+' 条真实作答事件。':'本次由学习者主动进入，没有把模拟错误记作真实作答。'}</p><div class="actions"><button class="gold" id="rollback">返回操作前并继续纠正</button><button class="outline" id="independent-retest">换视角独立复测</button><button class="outline" id="replay-origin">回看当时的视角</button></div></div>`;
 $('#effect-play').onclick=()=>{effectState.playing=!effectState.playing;$('#effect-play').textContent=effectState.playing?'暂停回放':'播放后果';if(effectState.playing){if(effectState.progress>=1)effectState.progress=0;playEffect();}};
 $('#effect-progress').oninput=e2=>{effectState.playing=false;effectState.progress=+e2.target.value/100;viewer.setEffect(effectState.key,effectState.progress);$('#effect-percent').textContent=e2.target.value+'%';$('#effect-play').textContent='播放后果';};
 $('#rollback').onclick=rollback;$('#independent-retest').onclick=()=>{rollback();beginExam('retry');};$('#replay-origin').onclick=()=>{viewer.restore(effectState.snapshot);toast('已恢复进入演示前记录的观察位；作答日志仍然保留。');};
}
function playEffect(){if(!effectState?.playing||route!=='consequence')return;effectState.progress=Math.min(1,effectState.progress+.006);viewer.setEffect(effectState.key,effectState.progress);$('#effect-progress').value=effectState.progress*100;$('#effect-percent').textContent=Math.round(effectState.progress*100)+'%';if(effectState.progress>=1){effectState.playing=false;$('#effect-play').textContent='重新播放';return;}setTimeout(playEffect,40);}
function rollback(){if(!effectState)return;const e=effectState;effectState.playing=false;viewer.restore(e.snapshot);record(session,'rollback',{effect:e.key,restoredView:e.snapshot,retainedEventCount:session.events.length});step=e.step;effectState=null;trainingChoice=null;protectChoice=null;trainingFeedback=null;navigate('training',{tab:'checkpoints'});toast('场景已恢复；首次作答与提示记录均保留。');}
function renderCases(){caseLab.mount($('#content-page'));}
function renderAssessment(){assessmentMount=assessmentLab.mount();return assessmentMount;}
async function openAtlasAssessment(action=null,skill=null){
 navigate('assessment');
 await assessmentMount;
 if(route!=='training'||trainingTab!=='assessment'||assessmentGuard)return;
 try{if(action==='practice')await assessmentLab.start('adaptive',{focus:skill});else if(action==='lesson')assessmentLab.renderLesson(skill);else document.querySelector('#al-multidimensional')?.scrollIntoView({behavior:'smooth',block:'start'});}catch(error){toast(error.message);}
}
function beginExam(kind){
 if(exam||assessmentGuard)return;if(effectState)rollback();$('#tutor').hidden=true;demoPlaying=false;clearTimeout(demoTimer);
 navigate('assessment');assessmentLab.start(kind).catch(error=>toast(error.message));
}
function setExamQuestion(){const q=examBank(exam.kind)[examIndex];examChoice=exam.responses[q.id]??null;confidence=exam.confidence[q.id]??null;viewer.setExam(q);if(examChoice&&q.pick)viewer.selected=examChoice;viewer.updateMaterials();viewer.updateLabels();screen(q.source||q.pick||'anatomy');navigate('exam',{force:true});}
function renderExam(){const bank=examBank(exam.kind),q=bank[examIndex],answered=Object.keys(exam.responses).length;
 $('#task-panel').innerHTML=`<div class="task-card"><div class="exam-heading"><span class="tag">${exam.kind==='pre'?'前测':exam.kind==='post'?'平行后测':'迁移复测'} · ${examIndex+1} / ${bank.length}</span><div class="progress-track"><span style="width:${answered/bank.length*100}%"></span></div><span class="mini-label">已答 ${answered} 题</span></div><h2 style="margin-top:17px">${q.prompt}</h2>${q.pick?`<div class="exam-pick"><strong>${examChoice?'已选择一个结构，名称暂不显示':'等待在'+(q.pick==='scope'?'虚拟腔镜':'三维解剖')+'屏点击'}</strong><p style="margin-top:7px">${q.source?'先看 CT 起点，再切换目标视图独立选择。':''}如不确定，可选择“不确定”并继续；不会显示正确目标。</p><div class="actions"><button class="outline" id="jump-target">切到${q.pick==='scope'?'腔镜':'三维'}屏</button><button class="outline" id="uncertain-answer">不确定</button></div></div>`:`<div class="answer-grid">${orderedOptions(q,exam.seed).map(({text,index},i)=>`<button data-exam-answer="${index}" class="${examChoice===index?'selected':''}"><span class="option-letter">${String.fromCharCode(65+i)}</span>${text}</button>`).join('')}</div>`}<div class="confidence"><span>信心自评（不计分）</span>${['低','中','高'].map(c=>`<button data-confidence="${c}" class="${confidence===c?'active':''}">${c}</button>`).join('')}</div><div class="actions"><button id="exam-confirm" class="primary" ${examChoice===null?'disabled':''}>${examIndex===bank.length-1?'确认本题':'确认并到下一题'}</button><button id="exam-prev" class="outline" ${examIndex===0?'disabled':''}>上一题</button><button id="exam-submit" class="gold" ${answered===bank.length?'':'disabled'}>整套提交</button><button id="exam-cancel" class="quiet">结束本次测验</button></div><div class="exam-pagination">${bank.map((x,i)=>`<button data-exam-page="${i}" class="${i===examIndex?'active':''} ${x.id in exam.responses?'answered':''}" aria-label="第${i+1}题">${i+1}</button>`).join('')}</div><p class="small muted" style="margin-top:12px">提交前允许检查和修改；提交后锁定本次记录。进入新的测验不会覆盖首次提交成绩。</p></div>`;
 $$('[data-exam-answer]').forEach(b=>b.onclick=()=>{examChoice=+b.dataset.examAnswer;renderExam();});$$('[data-confidence]').forEach(b=>b.onclick=()=>{confidence=b.dataset.confidence;renderExam();});
 $('#jump-target')?.addEventListener('click',()=>screen(q.pick));$('#uncertain-answer')?.addEventListener('click',()=>{examChoice='uncertain';renderExam();});
 $('#exam-confirm').onclick=()=>{answerExam(session,exam,examIndex,examChoice,confidence);save();if(examIndex<bank.length-1){examIndex++;setExamQuestion();}else renderExam();};
 $('#exam-prev').onclick=()=>{examIndex--;setExamQuestion();};$$('[data-exam-page]').forEach(b=>b.onclick=()=>{examIndex=+b.dataset.examPage;setExamQuestion();});
 $('#exam-submit').onclick=()=>{const result=submitExam(session,exam),finished=exam;exam=null;viewer.setExam(null);viewer.updateLabels();save();navigate('assessment',{force:true});modal('本次测验已提交',`<p><strong style="font-size:2rem;color:#a4e2d4">${result.total}</strong> / 100 · 正确 ${result.correct}/${result.count}</p><p>关键危险项 ${result.criticalCorrect}/${result.criticalCount}。${result.meetsProvisionalCriterion?'达到本课暂行量规。':'建议完成针对性复练，再独立验证。'}</p><div class="feedback notice">${session.kind==='demo'?'演示数据，不作为教学成效。':'仅反映本次课堂题目表现，不代表独立手术资质。'}</div><div class="modal-footer"><button class="primary" id="review-exam">查看逐题解析</button><button class="outline" id="exam-to-report">学习报告</button></div>`);$('#review-exam').onclick=()=>reviewExam(finished);$('#exam-to-report').onclick=()=>{$('#modal').close();navigate('report');};};
 $('#exam-cancel').onclick=()=>modal('结束本次测验',`<p>当前答案会作为未完成测验保留，不生成分数。之后可新建测验，已提交的首次成绩不会受影响。</p><div class="modal-footer"><button id="confirm-abandon" class="danger">结束并保留记录</button><button id="keep-exam" class="primary">继续作答</button></div>`);
 $('#exam-cancel').addEventListener('click',()=>{$('#keep-exam').onclick=()=>$('#modal').close();$('#confirm-abandon').onclick=()=>{exam.abandoned=true;record(session,'exam_abandon',{exam:exam.id,answered:Object.keys(exam.responses).length});exam=null;viewer.setExam(null);$('#modal').close();navigate('assessment',{force:true});};});
}
function orderedOptions(q,seed){return q.options.map((text,index)=>({text,index,rank:Math.sin((seed%997)+index*37+q.id.length*17)})).sort((a,b)=>a.rank-b.rank);}
function reviewExam(e){const result=scoreExam(e);$('#modal').close();modal(`${e.kind==='pre'?'前测':e.kind==='post'?'后测':'迁移复测'}解析 · ${result.total} 分`,examBank(e.kind).map((q,i)=>{const ans=e.responses[q.id],correct=ans===q.answer;return `<div class="source-item"><h3>${i+1}. ${esc(q.prompt)}</h3><p>你的答案：${esc(q.pick?(STRUCTURES[ans]?.name||'不确定'):q.options[ans]||'未答')} · <span style="color:${correct?'#a4e2c8':'#f5b0be'}">${correct?'正确':'待纠正'}</span></p><p>正确答案：${esc(q.pick?STRUCTURES[q.answer]?.name:q.options[q.answer])}</p><p>${q.explanation}</p></div>`;}).join(''));}
function renderReport(){const legacy=learningSummary(session),assessment=assessmentReportSummary(session),progress=courseProgress(session),s={...legacy,...assessment,completed:progress.completed},firstResults=CHECKPOINTS.map(c=>({cp:c,r:session.checkpointResults[c.id]})),orStore=loadOrStore(localStorage),orAttempts=attemptsForOwner(orStore,session.id,session.kind),latestOr=orAttempts.at(-1);
 $('#content-page').innerHTML=`<div class="page-heading"><p class="eyebrow">过程证据 / ${session.kind==='demo'?'演示数据，不作为教学成效':'匿名本地练习'}</p><h1>记录每次判断，回顾学习进程</h1><p>${esc(session.id)} · ${RELEASE} · ${new Date(session.created).toLocaleString('zh-CN',{hour12:false})}</p></div>${session.kind==='demo'?'<div class="feedback notice" style="margin-bottom:18px">教师演示数据，不作为教学成效，不与学习会话合并。</div>':''}<div class="metrics"><div class="metric"><span class="label">首次前测</span><div class="value">${s.pre?.total??'—'}<small> / 100</small></div><small>${s.pre?'首次提交保留':'尚未完成前测'}</small></div><div class="metric"><span class="label">首次综合检测</span><div class="value">${s.post?.total??'—'}<small> / 100</small></div><small>${s.post?(s.post.independenceEligible?'未见题独立作答':'复习或历史曝光未知')+' · 关键项 '+s.post.criticalCorrect+'/'+s.post.criticalCount:'尚未完成后测'}</small></div><div class="metric"><span class="label">检查点首次正确</span><div class="value">${s.firstCorrect}<small> / ${s.firstCount}</small></div><small>已完成 ${s.passed}/6 个检查点</small></div><div class="metric"><span class="label">提示 / 后果查看</span><div class="value">${s.hints}<small> / ${s.consequenceViews}</small></div><small>后果查看不计为错误</small></div></div><div class="actions no-print"><button id="print-report" class="primary">打印／保存 PDF</button><button id="export-json" class="outline">导出完整 JSON</button><button id="export-csv" class="outline">导出事件 CSV</button><button id="new-learner" class="outline">新建独立学习记录</button></div><div class="report-grid"><article class="panel"><h2>首次作答与复练记录</h2><div class="report-table-wrap"><table class="report-table"><thead><tr><th>检查点</th><th>首次答案</th><th>提示</th><th>当前结果</th></tr></thead><tbody>${firstResults.map(({cp,r})=>`<tr><td>${cp.name}</td><td>${!r?.first?'未作答':r.first.correct?'正确':'待纠正'}</td><td>${r?.hints||0}</td><td>${r?.passed?(r.first?.correct&&!r.first.hintsBefore?'首次独立完成':'提示或纠正后完成'):'尚未完成'}</td></tr>`).join('')}</tbody></table></div><div class="pill-list"><span>训练提交错误 ${s.trainingErrors}</span><span>主动暂停 ${s.pauses}</span><span>回滚 ${s.rollbacks}</span><span>迁移复测 ${s.retry?.total??'未完成'}</span></div><p class="small muted">课堂必修任务 ${progress.done}/${progress.total}，${s.completed?'已完成':'尚未完整完成'}。${progress.missing.length?'尚缺：'+esc(progress.missing.join('；'))+'。':''}训练过程的纠正不覆盖首次表现。少量题目分数不扩大解释为临床能力。</p></article><article class="panel"><h2>首次后测 · 八维表现</h2>${SKILLS.map(d=>{const score=s.post?.dimensions[d.id];return `<div class="report-dimension"><span>${d.name}</span><div class="bar"><span style="width:${score?.total?score.correct/score.total*100:0}%"></span></div><span>${score?score.correct+'/'+score.total:'未测'}</span></div>`;}).join('')}<p class="small muted">任务完成按提交记录核对；独立证据另按曝光与提示记录判断。当前图文检测按题等权；首次成绩保留，未提交的作答不计分。前后题目未验证等难度，不把分数变化解释为教学因果效果。</p><div class="actions">${session.exams.filter(e=>e.submitted&&!e.abandoned).map(e=>`<button class="outline" data-review-exam="${e.id}">旧版${e.kind==='pre'?'前测':e.kind==='post'?'后测':'复测'} · ${scoreExam(e).total} 分 · 解析</button>`).join('')}</div></article></div><div class="report-grid"><article class="panel"><h2>下一步复练</h2>${s.recommendations.length?s.recommendations.map(r=>`<div class="reading-card"><h3>${r.title}</h3><p>${r.text}</p><small class="muted">依据：${r.category}，实际训练提交 ${r.count} 次。</small></div>`).join(''):'<p style="margin-top:13px" class="muted">尚无需要按错因推荐的训练记录。可先完成检查点与独立测验。</p>'}<h3 style="margin-top:20px">我的反思</h3><textarea id="reflection" class="reflection" maxlength="1500" placeholder="用自己的话解释：当时混淆了什么，如何重新辨认？">${esc(session.reflection)}</textarea><p class="small muted">反思不自动判为医学正确。</p></article><article class="panel"><h2>关键过程时间线</h2><div class="timeline">${session.events.filter(e=>['training_answer','consequence_start','rollback','exam_submit','intelligent_submit','safety_pause','case_answer','case_screen','case_item','case_exam_submit'].includes(e.type)).slice(-14).map(e=>`<div class="timeline-item"><time>${new Date(e.time).toLocaleTimeString('zh-CN',{hour12:false})}</time><div><p>${eventLabel(e)}</p>${e.type==='training_answer'&&!e.correct?`<button class="outline no-print" data-replay="${e.seq}" style="font-size:.75rem;padding:3px 7px">回看当时</button>`:''}</div></div>`).join('')||'<p class="muted">完成任务后，这里会显示真实事件。</p>'}</div></article></div><div class="task-card"><h2>学习记录</h2><p style="margin-top:9px">本报告汇总本机学习过程，教师演示会话单独标识。学习记录保存在当前设备。</p><p class="small" style="margin-top:8px">${UNIT} · 当前检测题库 ${assessment.bankVersion} · 历史旧版成绩单独保留</p></div>`;
 $('#content-page').insertAdjacentHTML('afterbegin',assessmentLab.reportSummary());[...$('#content-page').querySelectorAll('.task-card')].at(-1)?.insertAdjacentHTML('beforebegin',caseLab.reportSummary());$('#open-intelligent-assessment').onclick=()=>navigate('assessment');$('#open-report-knowledge').onclick=()=>navigate('knowledge');
 courseQA?.destroy();$('#content-page').insertAdjacentHTML('afterbegin','<div id="report-course-qa"></div>');
 courseQA=mountCourseQA($('#report-course-qa'),{onRead:async(nodeIds,version)=>{
  const owner=session,ownerGeneration=recordGeneration;await assessmentLab.load();
  if(session!==owner||generation(localStorage)!==ownerGeneration)return;
  const skills=new Set(KNOWLEDGE_NODES.filter(node=>nodeIds.includes(node.id)).map(node=>node.skill));
  for(const q of assessmentLab.bank||[])if(skills.has(q.skill))recordExposure(owner,q,'knowledge-topic');
  record(owner,'course_qa_read',{nodes:nodeIds,version});save();
 }});
 const orText=latestOr?.summary?`最近一次：已作答 ${latestOr.summary.answered}/${latestOr.summary.required}，训练通过 ${latestOr.summary.passed}/${latestOr.summary.required}；本次范围通过 ${latestOr.summary.scopePassed}/${latestOr.summary.scopeRequired}。${latestOr.ended_at?'已结束':'未结束，可继续'}。`:'尚无新版术野记录。';
 $('#content-page').insertAdjacentHTML('beforeend',`<article class="panel"><h2>真实术野 · 拓展练习记录</h2><p>${orText}</p><p class="small muted">本学习者共 ${orAttempts.length} 次，单练一站不计整套完成。${orStore.attempts.some(a=>a.legacy)?'旧版无归属术野记录已保留，可在术野历史中查看，不计入当前学习者成绩。':''}真实术野为拓展任务，单独报告，不替代课堂必修完成。</p><a href="./or-field.html">继续练习与查看历史</a></article>`);
 $('#print-report').onclick=()=>window.print();$('#export-json').onclick=async()=>{const owner=session;try{await assessmentLab.load();if(session!==owner)return;download(JSON.stringify({learningInsights:learningSnapshot(assessmentSession(),assessmentLab.bank),dataNotice:session.kind==='demo'?'演示数据，不作为教学成效':'匿名本地练习记录',summary:s,courseProgress:progress,session,orField:{schema:2,attempts:orAttempts,legacyUnassigned:orStore.attempts.filter(a=>a.legacy)}},null,2),`${session.id}_学习记录.json`,'application/json;charset=utf-8');}catch(error){toast('报告暂未导出：'+error.message);}};$('#export-csv').onclick=()=>download(sessionCSV(session,{orAttempts}),`${session.id}_学习事件.csv`,'text/csv;charset=utf-8');$('#new-learner').onclick=createLearner;
 $('#reflection').oninput=e=>{session.reflection=e.target.value;save();};$$('[data-review-exam]').forEach(b=>b.onclick=()=>reviewExam(session.exams.find(e=>e.id===b.dataset.reviewExam)));$$('[data-replay]').forEach(b=>b.onclick=()=>replayEvent(+b.dataset.replay));
}
function eventLabel(e){if(e.type==='intelligent_submit')return `图文检测提交 · ${e.result?.score??'—'} 分（独立证据与订正见报告）`;if(e.type==='case_screen'||e.type==='case_item')return `病例 ${esc(e.case)} · ${e.type==='case_screen'?'分层判读':'题组作答'} · ${e.correct?'正确':'待订正'}`;const cp=CHECKPOINTS.find(c=>c.id===e.checkpoint);return e.type==='training_answer'?`${cp?.name||''} · ${e.correct?'辨认通过':esc(e.category)+'，门禁拦截'}`:e.type==='consequence_start'?`主动查看${PHYSIOLOGY[e.effect]?.name||''} · 不计错`:e.type==='rollback'?'回到操作前 · 首次记录保留':e.type==='safety_pause'?'主动暂停 · 安全行为':e.type==='exam_submit'?`${e.kind==='pre'?'前测':e.kind==='post'?'后测':'复测'}提交 · ${e.result.total} 分`:e.type==='case_exam_submit'?`病例决策综合考核提交 · ${e.score}/${e.total} 分 · ${e.passed?'通过':'未通过'}`:`病例 ${esc(e.case||'A')} 条件判断已提交${e.level?'（第 '+e.level+' 关）':''}`;}
function replayEvent(seq){const e=session.events.find(x=>x.seq===seq);if(!e?.view||!ensureViewer())return;step=CHECKPOINTS.findIndex(c=>c.id===e.checkpoint);viewer.restore(e.view);trainingChoice=e.target;protectChoice=e.preserve;trainingFeedback={correct:false,text:`回看第 ${e.seq} 条作答：${e.category}。原答案没有被后续纠正覆盖。`};navigate('training',{tab:'checkpoints'});record(session,'event_replay',{sourceEvent:seq});save();}
function createLearner(){if(exam||assessmentGuard||!ensureViewer())return;stopDemo();session=newSession();store.sessions.push(session);previousLearner=session.id;step=0;effectState=null;viewer.setExam(null);viewer.effect=null;viewer.reset();viewer.select(null);navigate('explore');toast('已新建学习会话；原记录仍可在管理记录中查看。');}
function showTutor(){if(exam)return;const s=learningSummary(session),cp=CHECKPOINTS[step],items=s.recommendations.length?s.recommendations:[{category:route==='cases'?'条件不足':cp.category,count:0,...KNOWLEDGE[route==='cases'?'条件不足':cp.category]}];$('#tutor-content').innerHTML=items.map(r=>`<article><h3>${r.title}</h3><p>${r.text}</p><small class="muted">${r.count?'依据：'+r.category+'，实际训练提交 '+r.count+' 次。':'当前任务知识卡；尚无此类错误记录。'}</small><button data-tutor-focus="${r.focus}">回到相关结构</button></article>`).join('');$('#tutor').hidden=false;$$('[data-tutor-focus]').forEach(b=>b.onclick=()=>{record(session,'knowledge_open',{structure:b.dataset.tutorFocus});navigate('explore');if(!viewer)return;viewer.focus(b.dataset.tutorFocus);viewer.updateLabels();save();});}
function showLesson(){modal('一节 40 分钟的安全认知课',`<p>面向已学习基础解剖和相关理论的临床医学本科生。40 分钟为课程设计时长，不把加速演示算作学生学时。</p><table class="comparison"><thead><tr><th>时间</th><th>任务</th><th>学习证据</th></tr></thead><tbody>${LESSON.map(([t,n,d])=>`<tr><td>${t}</td><td>${n}</td><td>${d}</td></tr>`).join('')}</tbody></table><h3>四个目标</h3>${OBJECTIVES.map(([n,d])=>`<p><strong>${n}</strong>：${d}</p>`).join('')}<h3>完整手术流程概览</h3><ol>${WORKFLOW.map(x=>`<li>${x}</li>`).join('')}</ol><div class="feedback notice">六个检查点只展开本科安全认知节点。具体处理顺序可因入路、肺裂和变异而不同。</div>`);}
function manageSessions(){modal('本机学习记录',`<p>学习记录与教师演示记录独立保存。切换不会删除历史；清除仅影响此设备的本应用记录。</p>${store.sessions.map(s=>`<div class="source-item"><strong>${esc(s.id)}</strong><p>${s.kind==='demo'?'演示数据，不作为教学成效':'匿名学习'} · ${new Date(s.created).toLocaleString('zh-CN')} · ${s.events.length} 条事件</p><button data-open-session="${s.id}" class="outline">打开记录</button></div>`).join('')}<div class="modal-footer"><button class="primary" id="session-new">新建学习会话</button><button class="danger" id="clear-all">清除本应用全部记录</button></div>`);
 $$('[data-open-session]').forEach(b=>b.onclick=()=>{stopDemo();session=store.sessions.find(s=>s.id===b.dataset.openSession);step=session.step||0;$('#modal').close();viewer?.setExam(null);navigate('report');});$('#session-new').onclick=()=>{$('#modal').close();createLearner();};$('#clear-all').onclick=()=>{$('#modal').close();modal('确认清除本机记录','<p>这将删除当前设备内本应用的学习和演示记录，无法在本应用内恢复。请先保留需要的导出文件。</p><button class="danger" id="really-clear">确认清除</button>');$('#really-clear').onclick=()=>{const result=clearLearningRecords(localStorage);if(!result.ok){toast(result.error);return;}recordGeneration=generation(localStorage);store={schema:1,sessions:[],active:null};$('#modal').close();createLearner();};};
}
const DEMO_NODES=[['同源三屏','查看体模、定位右上叶支气管。'],['病例条件','查看四类资料，接受有条件的术式讨论。'],['目标与保留','静脉双确认：辨认上叶目标并保护中叶。'],['真实拦截','演示遗漏保留对象被门禁拦截。'],['静脉后果','主动查看回流受阻，查看行为不计错。'],['回滚纠正','回到操作前，首次错误仍然保留。'],['支气管保护','比较上叶支气管与中间支气管。'],['气道后果','查看通气受限与余肺风险。'],['独立复测','关闭答案联动与结构名称，换视角测验。'],['过程报告','首次、提示、纠正与独立复测分别列示。']];
function startDemo(){if(exam||assessmentGuard||!ensureViewer())return;previousLearner=session.kind==='learner'?session.id:previousLearner;session=newSession('demo');store.sessions.push(session);demoIndex=0;step=0;record(session,'teacher_demo_start',{automated:false});runDemoNode(0);save();}
function stopDemo(){demoPlaying=false;clearTimeout(demoTimer);}
function runDemoNode(i){
 if(assessmentGuard){toast('请先提交或保存当前检测，再切换演示节点。');return;}
 if(!ensureViewer())return;
 stopDemo();demoIndex=Math.max(0,Math.min(DEMO_NODES.length-1,i));if(exam){exam.abandoned=true;record(session,'exam_abandon',{exam:exam.id,reason:'teacher_demo_navigation'});exam=null;viewer.setExam(null);}if(effectState){effectState.playing=false;viewer.restore(effectState.snapshot);effectState=null;}
 record(session,'teacher_demo_node',{node:demoIndex});
 if(i===0){navigate('explore');viewer.reset();viewer.select('rub');viewer.updateLabels();}
 if(i===1){session.caseA.opened=CASE_A.cards.map(c=>c.id);record(session,'case_information',{case:'A',card:'all-demo'});navigate('cases');}
 if(i===2){chooseStep(2);viewer.select('rulv');viewer.updateLabels();}
 if(i===3){chooseStep(2);trainingChoice='rulv';protectChoice='none';submitTraining();}
 if(i===4){step=2;startConsequence('venous');effectState.playing=true;playEffect();}
 if(i===5){step=2;chooseStep(2);trainingChoice='rulv';protectChoice='rmlv';record(session,'rollback',{effect:'venous',retainedEventCount:session.events.length});submitTraining();}
 if(i===6){chooseStep(4);viewer.select('bi');viewer.updateLabels();}
 if(i===7){step=4;startConsequence('airway');effectState.playing=true;playEffect();}
 if(i===8){beginExam('retry');}
 if(i===9){navigate('report');}
 renderDemoConsole();save();
}
function renderDemoConsole(){document.querySelector('.demo-console')?.remove();if(session.kind!=='demo')return;const node=DEMO_NODES[demoIndex];const el=document.createElement('div');el.className='demo-console no-print';el.innerHTML=`<div class="row"><strong>教师演示</strong><span class="tag warn">演示数据，不作为教学成效</span><button id="demo-previous">上一节点</button><button id="demo-play" class="primary">${demoPlaying?'暂停':'自动推进'}</button><button id="demo-next">下一节点</button><select id="demo-jump" aria-label="跳转演示节点">${DEMO_NODES.map(([n],i)=>`<option value="${i}" ${i===demoIndex?'selected':''}>${i+1}. ${n}</option>`).join('')}</select><button id="demo-exit">回到学习记录</button></div><p>${node[1]} 可暂停并接管真实操作。独立测验需手动作答，不自动填入高分。</p>`;document.querySelector('main').prepend(el);
 $('#demo-previous').onclick=()=>runDemoNode(Math.max(0,demoIndex-1));$('#demo-next').onclick=()=>runDemoNode(Math.min(9,demoIndex+1));$('#demo-jump').onchange=e=>runDemoNode(+e.target.value);$('#demo-play').onclick=()=>{demoPlaying=!demoPlaying;clearTimeout(demoTimer);if(demoPlaying)scheduleDemo();renderDemoConsole();};$('#demo-exit').onclick=()=>{stopDemo();if(exam){exam.abandoned=true;exam=null;}viewer.setExam(null);session=store.sessions.find(s=>s.id===previousLearner)||newSession();if(!store.sessions.includes(session))store.sessions.push(session);navigate('explore',{force:true});};
}
function scheduleDemo(){if(!demoPlaying||demoIndex>=8){stopDemo();renderDemoConsole();return;}demoTimer=setTimeout(()=>{const next=demoIndex+1;runDemoNode(next);if(next<8){demoPlaying=true;scheduleDemo();renderDemoConsole();}},24000);}
function showLayers(){
 if(!ensureViewer())return;
 if(viewer.structureGroups){
  const groups=viewer.structureGroups();
  modal('图层（源网格）',`<p>仅改变显示，不改变空间定义。源网格颜色是结构编码，不是术中颜色。</p>
   ${groups.map(([label,items])=>`<div class="layer-group"><strong>${esc(label)}</strong>${items.map(m=>`<label class="checkbox-row"><input type="checkbox" data-real-mesh="${esc(m.id)}" ${viewer.hidden.has(m.id)?'':'checked'}>${esc(m.name)}</label>`).join('')}</div>`).join('')}
   <label class="checkbox-row"><input type="checkbox" id="segment-toggle" ${viewer.segments?'checked':''}>显示肺段网格</label>
   <label class="checkbox-row"><input type="checkbox" id="lesion-toggle" ${viewer.lesion?'checked':''}>病灶外轮廓（非切缘）</label>
   <label class="checkbox-row"><input type="checkbox" id="plane-toggle" ${viewer.showSlice?'checked':''}>三维中显示当前 CT 切面</label>`);
  $$('[data-real-mesh]').forEach(i=>i.onchange=()=>{i.checked?viewer.hidden.delete(i.dataset.realMesh):viewer.hidden.add(i.dataset.realMesh);viewer.updateMaterials();});
  $('#segment-toggle').onchange=e=>{viewer.segments=e.target.checked;viewer.updateMaterials();};
  $('#lesion-toggle').onchange=e=>{viewer.lesion=e.target.checked;viewer.updateMaterials();};
  $('#plane-toggle').onchange=e=>{viewer.showSlice=e.target.checked;viewer.updateMaterials();};
  return;
 }
 modal('图层与教学辅助',`<p>改变图层仅帮助观察，不改变结构空间定义。测验期间统一关闭辅助入口。</p>${LOBES.map(l=>`<label class="checkbox-row"><input type="checkbox" data-lobe="${l.id}" ${viewer.hidden.has(l.id)?'':'checked'}>${l.name}</label>`).join('')}<label class="checkbox-row"><input type="checkbox" id="segment-toggle" ${viewer.segments?'checked':''}>右上叶 S1/S2/S3 分区辨认（教学示意）</label><label class="checkbox-row"><input type="checkbox" id="lesion-toggle" ${viewer.lesion?'checked':''}>病灶教学透视标记（术野中非肉眼可见）</label><label class="checkbox-row"><input type="checkbox" id="plane-toggle" ${viewer.showSlice?'checked':''}>三维中显示当前 CT 切面</label><div class="actions">${['s1','s2','s3','a2','rspv'].map(id=>`<button class="outline" data-layer-focus="${id}">${STRUCTURES[id].name}</button>`).join('')}</div>`);
 $$('[data-lobe]').forEach(i=>i.onchange=()=>{i.checked?viewer.hidden.delete(i.dataset.lobe):viewer.hidden.add(i.dataset.lobe);viewer.updateMaterials();});$('#segment-toggle').onchange=e=>{viewer.segments=e.target.checked;viewer.updateMaterials();};$('#lesion-toggle').onchange=e=>{viewer.lesion=e.target.checked;viewer.updateMaterials();};$('#plane-toggle').onchange=e=>{viewer.showSlice=e.target.checked;viewer.updateMaterials();};$$('[data-layer-focus]').forEach(b=>b.onclick=()=>{viewer.focus(b.dataset.layerFocus);$('#modal').close();});
}
function ensureViewer(){
 if(viewer)return true;
 try{
  viewer=new RealTrainingViewer({ct:$('#ct-canvas'),anatomy:$('#anatomy-canvas'),scope:$('#scope-canvas')},(id,source,inExam)=>{
   if(inExam){examChoice=id;viewer.updateLabels();renderExam();return;}
   record(session,'explore_selection',{structure:id,source});
   if(exploreLab.root)exploreLab.onPick(id,source);
   if(route==='training'&&trainingTab==='checkpoints'&&CHECKPOINTS[step].options.some(([v])=>v===id)){trainingChoice=id;renderTraining();}
   viewer.updateLabels();updateStrip();save();
  });
  viewer._stripHook=updateStrip;
  viewer._loadPromise?.then(()=>{updateStrip();viewer.resize();const chip=$('#ct-case-chip');if(chip)chip.textContent=viewer.real?.caseId||'CT-004';}).catch(err=>{console.error(err);toast('真实 CT 载入失败，请刷新重试');});
  return true;
 }catch(error){viewer=null;toast('需要 WebGL2 才能显示真实三维。可先使用首页真实影像病例库。');console.error(error);return false;}
}
async function init(){
 await new Promise(r=>setTimeout(r,40));
 const params=new URLSearchParams(location.search);const requestedRoute=params.get('route');const requestedTab=params.get('tab');
 if(requestedTab==='assessment'||requestedTab==='checkpoints'||requestedTab==='explore')trainingTab=requestedTab;
 $$('#main-nav button').forEach(b=>b.onclick=()=>navigate(b.dataset.nav));$$('[data-screen]').forEach(b=>b.onclick=()=>screen(b.dataset.screen));
 $('#slice').oninput=e=>{if(!ensureViewer())return;viewer.setSlice(e.target.value);};
 $('#slice-prev')?.addEventListener('click',()=>{if(!ensureViewer())return;viewer.real?.changeSlice(-1);});
 $('#slice-next')?.addEventListener('click',()=>{if(!ensureViewer())return;viewer.real?.changeSlice(1);});
 $('#locate-slice').onclick=()=>{if(!ensureViewer())return;viewer.locateSelected?.();};
 $('#opacity').oninput=e=>{if(!ensureViewer())return;const v=+e.target.value;viewer.setLobeOpacity?.(v>1?v/100:v);};
 $('#scope-view').onchange=e=>{if(!ensureViewer())return;viewer.setScopeView(e.target.value);};
 $('#reset-view')?.addEventListener('click',()=>{if(!ensureViewer())return;viewer.reset();});
 $('#scope-fit')?.addEventListener('click',()=>{if(exam||assessmentGuard||!ensureViewer())return;viewer.fitDetailOverview?.();});
 $$('[data-real-plane]').forEach(b=>b.onclick=()=>{if(!ensureViewer())return;viewer.setPlane?.(b.dataset.realPlane);});
 $('#window-preset')?.addEventListener('change',e=>{if(!ensureViewer())return;viewer.setWindowPreset?.(e.target.value);});
 const syncCustomWindow=()=>{if(!ensureViewer())return;viewer.setCustomWindow?.($('#window-width').value,$('#window-center').value);};
 $('#window-width')?.addEventListener('change',syncCustomWindow);
 $('#window-center')?.addEventListener('change',syncCustomWindow);
 $('#measure-btn')?.addEventListener('click',()=>{if(!ensureViewer())return;viewer.toggleMeasure?.();});
 $$('[data-camera]').forEach(b=>b.onclick=()=>{if(!ensureViewer())return;$$('[data-camera]').forEach(x=>x.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true');viewer.real?.fitOverview?.(b.dataset.camera);});
 $('#link-toggle')?.addEventListener('change',e=>{if(!viewer)return;viewer.linked=e.target.checked;toast(viewer.linked?'探索联动已开启':'探索联动已关闭');});
 $('#labels-toggle')?.addEventListener('change',e=>{if(!viewer)return;viewer.labels=e.target.checked;if(!viewer.labels){$('#selection-name').textContent='结构名称已隐藏';$('#selection-detail').textContent='独立辨认时可隐藏名称；正式测验会同时关闭答案联动与助教。';}else viewer.updateLabels();});
 $('#clear-selection').onclick=()=>{if(!ensureViewer())return;viewer.select(null);viewer.updateLabels();updateStrip();};$('#layers-btn').onclick=showLayers;
 $$('[data-expand]').forEach(b=>b.onclick=()=>{const g=$('.viewport-grid'),p=b.closest('.view-panel'),active=p.classList.contains('is-expanded');$$('.view-panel').forEach(v=>v.classList.remove('is-expanded'));g.classList.toggle('expanded',!active);if(!active)p.classList.add('is-expanded');viewer.resize();});
 $$('[data-training-tab]').forEach(b=>{
  b.onclick=()=>navigate('training',{tab:b.dataset.trainingTab});
  b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)||assessmentGuard)return;e.preventDefault();const tabs=$$('[data-training-tab]'),index=e.key==='Home'?0:e.key==='End'?tabs.length-1:(tabs.indexOf(b)+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[index].focus();tabs[index].click();};
 });
 $('#main-nav').addEventListener('click',e=>{if(assessmentGuard&&e.target.closest('a')){e.preventDefault();toast('请先提交检测，或保存后再切换。');}},true);
 $('#lesson-btn').onclick=showLesson;$('#sessions-btn').onclick=manageSessions;$('#tutor-button').onclick=()=>$('#tutor').hidden?showTutor():$('#tutor').hidden=true;$('#close-tutor').onclick=()=>$('#tutor').hidden=true;$('#demo-btn').onclick=startDemo;
 $('#modal').addEventListener('click',e=>{if(e.target===$('#modal'))$('#modal').close();});
 // Resume only submitted/recorded session data; interrupted exams retain their answers and remain unscored.
 const interrupted=session.exams.find(e=>!e.submitted&&!e.abandoned);if(interrupted){interrupted.abandoned=true;record(session,'exam_abandon',{exam:interrupted.id,reason:'application_reopened',answersPreserved:true});save();toast('上次未完成测验已保留为未评分记录；可重新开始。');}
 window.addEventListener('beforeunload',()=>{save();});
 window.thorax={get session(){return session;},get store(){return store;},get viewer(){return viewer;},get exam(){return exam;},navigate,chooseStep,beginExam,startConsequence,rollback,startDemo,runDemoNode,renderReport,save,get release(){return RELEASE;},assessment:assessmentLab,explore:exploreLab};
 // Bind navigation before opening a route so a workspace failure cannot strand other pages.
 $('#loading').hidden=true;updateStrip();save();navigate(['explore','training','cases','assessment','knowledge','report'].includes(requestedRoute)?requestedRoute:'training',requestedRoute==='training'||!requestedRoute?{tab:trainingTab}:requestedRoute==='knowledge'?{node:params.get('node')}:{});
}
init();
