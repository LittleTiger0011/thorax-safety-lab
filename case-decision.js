// 病例决策训练 · 界面（分层课程版）。四关递进 + 综合考核；第 2–4 关沿用「病历审阅 → 资料核对与检查选择 → 本关题组 → 决策与理由 → 复盘与依据」。
import {DECISION_CASES,EVIDENCE,PRINCIPLES,TRIAL_MATRIX,TIERS,DECISION_VERSION,DEFAULT_CASE_ID,caseById,caseState,caseReadiness,testReview,testDisposition,verdictLabel,applyClinicalNotes} from './case-decision-data.js';
import {LEVELS,LEVELS_VERSION,submitCaseDecision,EXAM,EXAM_ITEMS,EXAM_DIMS,LEVEL_STEP,SCREEN_RULES,DENSITY_RULE,DENSITY_OPTIONS,TIER_OPTIONS,levelById,levelOfCase,screenItem,screenState,answerScreen,levelItems,levelStatus,itemState,answerItem,itemsDone,caseComplete,examUnlocked,examState,startExam,submitExam,examSummary,gradeItem,answerText,correctText} from './case-decision-levels.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let notesPromise=null;
/** 测试或重新导入病史文件时清空缓存。 */
export function resetNotesCache(){notesPromise=null;}
const TYPE_HINT={single:'单选',multi:'多选，选全才算对',order:'按顺序点选，可清除重排',number:'填写数字'};

export class CaseDecisionLab{
 constructor(api){this.api=api;this.root=null;this.activeId=DEFAULT_CASE_ID;this.onClick=null;this.onChange=null;this.onInput=null;this.drafts={};this.screenDraft={};this.lastScreen=null;this.itemFeedback={};}
 get session(){return this.api.getSession();}
 get store(){const s=this.session;s.caseDecisions||={version:DECISION_VERSION,active:DEFAULT_CASE_ID};return s.caseDecisions;}
 get level(){const v=this.store.level;return v==='exam'?'exam':levelById(v)?Number(v):1;}
 get case(){return caseById(this.activeId)||DECISION_CASES[0];}
 get state(){return caseState(this.session,this.case.id);}
 get levelDef(){return levelById(this.level);}

 mount(root){
  if(this.root)this.unmount();
  this.root=root;root.classList.add('cd-host');
  const st=this.store;
  if(st.level==null)st.level=this.session.caseA?.opened?.length?2:1;
  this.activeId=caseById(st.active)?st.active:DEFAULT_CASE_ID;
  if(this.level!=='exam'&&this.level!==1){const lv=this.levelDef;if(!lv.cases.includes(this.activeId))this.activeId=lv.cases[0];}
  this.bind();this.render();this.loadNotes();
 }
 unmount(){
  if(!this.root)return;
  this.root.removeEventListener('click',this.onClick);this.root.removeEventListener('change',this.onChange);this.root.removeEventListener('input',this.onInput);
  this.root.classList.remove('cd-host');this.root=null;
 }
 /** 作者提供的脱敏真实病史（可选文件）。缺失或为空时使用标准化教学病历。 */
 loadNotes(){
  if(typeof fetch!=='function')return;
  notesPromise ||= fetch('./real-cases/clinical-notes.json').then(r=>r.ok?r.json():null).catch(()=>null).then(notes=>applyClinicalNotes(notes));
  notesPromise.then(filled=>{if(filled&&this.root)this.render();});
 }
 bind(){
  this.onClick=e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled||!this.root?.contains(b))return;this.action(b.dataset.action,b.dataset,b);};
  this.onChange=e=>{if(e.target.matches?.('input[name=reason]'))this.saveDraft();if(e.target.matches?.('[data-exam-number]')){this.examResponse(e.target.dataset.examNumber,e.target.value===''?null:Number(e.target.value));}};
  this.onInput=e=>{if(e.target.matches?.('[data-reflection]')){this.state.reflection=e.target.value;this.api.save();}};
  this.root.addEventListener('click',this.onClick);this.root.addEventListener('change',this.onChange);this.root.addEventListener('input',this.onInput);
 }
 log(type,data){this.api.log(type,data);this.api.save();}
 openLevel(id){
  const next=id==='exam'?'exam':levelById(id)?Number(id):1;
  this.store.level=next;this.lastScreen=null;this.itemFeedback={};
  if(next!=='exam'&&next!==1){const lv=levelById(next);if(!lv.cases.includes(this.activeId)){this.activeId=lv.cases[0];this.store.active=this.activeId;}}
  if(next===1&&!this.screenActive)this.screenActive=this.nextScreenCase();
  this.log('case_level_open',{level:next,version:DECISION_VERSION});this.render();this.root?.querySelector('.cd-level-body')?.scrollIntoView?.({block:'start'});
 }
 nextScreenCase(from=null){const st=screenState(this.session),ids=LEVELS[0].cases,start=from?ids.indexOf(from)+1:0;for(let i=0;i<ids.length;i++){const id=ids[(start+i)%ids.length];if(!st[id]?.passed)return id;}return from||ids[0];}

 action(action,d,button){
  const c=this.case,state=this.state;
  if(action==='level'){this.openLevel(d.level);return;}
  if(action==='case'){const next=caseById(d.case);if(!next)return;const lv=levelOfCase(next.id);if(lv&&this.level!==lv.id)this.store.level=lv.id;this.activeId=next.id;this.store.active=next.id;this.itemFeedback={};this.log('case_open',{case:next.id,tier:next.tier,level:this.level,version:DECISION_VERSION});this.render();this.root.querySelector('.cd-case-title')?.scrollIntoView?.({block:'start'});return;}
  if(action==='card'){if(!state.opened.includes(d.caseCard))state.opened.push(d.caseCard);this.log('case_information',{case:c.id,card:d.caseCard});this.render();return;}
  if(action==='test'){const id=d.test;state.revealed=false;state.tests=state.tests.includes(id)?state.tests.filter(t=>t!==id):[...state.tests,id];this.api.save();this.render();return;}
  if(action==='reveal'){const review=testReview(c,state.tests,state.draft?.choice);state.revealed=true;state.testReview={tests:[...state.tests],ruleVersion:DECISION_VERSION,time:new Date().toISOString()};this.log('case_tests',{case:c.id,tests:[...state.tests],necessaryHit:review.hit,necessaryCount:review.necessaryCount,missed:review.missed.map(t=>t.id),unnecessary:review.unnecessary.map(t=>t.id),learningOnly:true});this.render();return;}
  if(action==='choice'){state.draft={...(state.draft||{}),choice:d.caseChoice,reasons:this.checkedReasons()};this.api.save();this.render();return;}
  if(action==='submit'){this.submit();return;}
  if(action==='enter-b'){this.api.chooseStep?.(0);return;}
  if(action==='s2'){this.api.modal('S2 后段条件对照','<p>若讨论右上叶 S2 解剖性段切，须先明确病灶与段界、可获得切缘、分期与淋巴结评估、功能储备和结构变异。</p><p>本课不以切割段间平面替代临床规划，也不把「后段病灶」自动等同于段切指征。</p><button class="primary" id="see-s2">在三屏中定位 S2</button>');const see=document.getElementById('see-s2');if(see)see.onclick=()=>{document.getElementById('modal')?.close();this.api.navigate('explore');const v=this.api.getViewer?.();if(v){v.segments=true;v.select('s2');v.updateLabels();}};return;}
  if(action==='variation'){this.api.modal('两类须逐例辨认的变异','<div class="reading-card"><h3>中叶静脉汇合变异</h3><p>中叶静脉的汇入路径存在变异，部分分支可跨水平裂或汇入上叶静脉。任何一种模式都不能推广到所有患者，须在本例影像与术野中逐支辨认。</p></div><div class="reading-card"><h3>右上叶动脉分支变异</h3><p>前干、后升支及其他分支组合须结合患者影像和术野逐一辨认。主线考察起源、走行、供血区域与保留对象，不要求记忆分型。</p></div>');return;}
  // 第 1 关
  if(action==='screen-case'){this.screenActive=d.case;this.screenDraft={};this.lastScreen=null;this.render();return;}
  if(action==='screen-pick'){this.screenDraft={...this.screenDraft,[d.field]:d.value};this.render();return;}
  if(action==='screen-submit'){const id=this.screenActive,pick=this.screenDraft;if(!pick.density||!pick.tier)return;const r=answerScreen(this.session,id,pick);this.lastScreen={case:id,...r};this.log('case_screen',{case:id,level:1,density:pick.density,tier:pick.tier,correct:r.correct,first:r.first});this.render();this.root.querySelector('#screen-feedback')?.scrollIntoView?.({block:'nearest'});return;}
  if(action==='screen-retry'){this.screenDraft={};this.lastScreen=null;this.render();return;}
  if(action==='screen-next'){this.screenActive=this.nextScreenCase(this.screenActive);this.screenDraft={};this.lastScreen=null;this.render();this.root.querySelector('.cd-screen')?.scrollIntoView?.({block:'start'});return;}
  // 第 2–4 关题组
  if(action==='item-pick'){this.pickItem(d.item,d.option,d.type);return;}
  if(action==='item-clear'){delete this.drafts[d.item];this.render();return;}
  if(action==='item-submit'){this.submitItem(d.item);return;}
  if(action==='item-retry'){delete this.itemFeedback[d.item];delete this.drafts[d.item];this.render();return;}
  // 考核
  if(action==='exam-start'){if(!examUnlocked(this.session))return;startExam(this.session);this.log('case_exam_start',{attempt:examState(this.session).attempts.length+1});this.render();return;}
  if(action==='exam-pick'){this.examPick(d.item,d.option,d.type);return;}
  if(action==='exam-clear'){this.examResponse(d.item,null);return;}
  if(action==='exam-submit'){this.submitExam();return;}
  if(action==='exam-review'){this.examReview=d.attempt==null?null:Number(d.attempt);this.render();return;}
 }
 checkedReasons(){return [...(this.root?.querySelectorAll('input[name=reason]:checked')||[])].map(i=>i.value);}
 saveDraft(){const state=this.state;state.draft={choice:state.draft?.choice||null,reasons:this.checkedReasons()};this.api.save();}

 /* ---- 题目作答（训练模式：逐题确认，即时点评） ---- */
 currentItems(){return this.level==='exam'||this.level===1?[]:levelItems(this.case,this.levelDef);}
 pickItem(itemId,option,type){
  const cur=this.drafts[itemId];
  if(type==='single')this.drafts[itemId]=option;
  else if(type==='multi'){const arr=Array.isArray(cur)?[...cur]:[];const i=arr.indexOf(option);i>=0?arr.splice(i,1):arr.push(option);this.drafts[itemId]=arr;}
  else if(type==='order'){const arr=Array.isArray(cur)?[...cur]:[];if(!arr.includes(option))arr.push(option);this.drafts[itemId]=arr;}
  this.render();
 }
 submitItem(itemId){
  const item=this.currentItems().find(i=>i.id===itemId);if(!item)return;
  let response=this.drafts[itemId];
  if(item.type==='number'){const input=this.root.querySelector(`[data-item-input="${itemId}"]`);const v=input?.value;if(v==null||v==='')return;response=Number(v);this.drafts[itemId]=response;}
  if(response==null||(Array.isArray(response)&&!response.length))return;
  const r=answerItem(this.session,this.case.id,item,response);
  this.itemFeedback[itemId]={correct:r.correct,response};
  this.log('case_item',{case:this.case.id,level:this.level,item:itemId,itemType:item.type,correct:r.correct,first:r.first,critical:!!item.critical});
  if(r.correct)delete this.drafts[itemId];
  this.render();this.root.querySelector(`[data-item-box="${itemId}"]`)?.scrollIntoView?.({block:'nearest'});
 }
 submit(){
  const c=this.case,state=this.state,choice=state.draft?.choice;if(!choice)return;
  const reasons=this.checkedReasons(),{entry,verdict}=submitCaseDecision(this.session,c,this.levelDef,choice,reasons);
  this.log('case_answer',{case:c.id,tier:c.tier,level:this.level,choice,reasons,correct:verdict.reasonable,completed:entry.completed,phase:entry.phase,ruleVersion:entry.ruleVersion,category:verdict.reasonable?null:'条件不足'});
  this.lastVerdict=verdict;this.lastVerdictCase=c.id;this.render();
  this.root.querySelector('#case-feedback')?.scrollIntoView?.({block:'nearest'});
 }

 /* ---- 考核作答（静默：不判分，提交后统一评分） ---- */
 examResponse(itemId,value){const ex=examState(this.session);if(!ex.current)return;if(value==null)delete ex.current.responses[itemId];else ex.current.responses[itemId]=value;this.api.save();this.render();}
 examPick(itemId,option,type){
  const ex=examState(this.session);if(!ex.current)return;const cur=ex.current.responses[itemId];
  if(type==='single')ex.current.responses[itemId]=option;
  else if(type==='multi'){const arr=Array.isArray(cur)?[...cur]:[];const i=arr.indexOf(option);i>=0?arr.splice(i,1):arr.push(option);ex.current.responses[itemId]=arr;}
  else if(type==='order'){const arr=Array.isArray(cur)?[...cur]:[];if(!arr.includes(option))arr.push(option);ex.current.responses[itemId]=arr;}
  this.api.save();this.render();
 }
 submitExam(){
  const ex=examState(this.session);if(!ex.current)return;
  let attempt;try{attempt=submitExam(this.session);}catch(e){this.api.toast?.(e.message);return;}
  const r=attempt.result;this.log('case_exam_submit',{attempt:ex.attempts.length,score:r.score,total:r.total,passed:r.passed,criticalCorrect:r.criticalCorrect,criticalCount:r.criticalCount,dims:Object.fromEntries(Object.entries(r.dims).map(([k,v])=>[k,`${v.correct}/${v.total}`]))});
  this.examReview=ex.attempts.length-1;this.render();this.root.querySelector('.cd-exam-result')?.scrollIntoView?.({block:'start'});
 }

 /* ---- 渲染 ---- */
 render(){
  if(!this.root)return;
  const level=this.level;
  this.root.innerHTML=`
  <figure class="lab-scene-banner" aria-hidden="true"><img src="./assets/scene/corridor.webp" alt="" width="1600" height="901" decoding="async"></figure>
  <div class="page-heading"><p class="eyebrow">病例决策 · ${DECISION_CASES.length} 例匿名真实 CT · 四关递进</p><h1>术前决策训练</h1><p>识别 → 应用 → 分析 → 综合，四关通关后开放综合考核。每关病例、任务与通关条件不同。</p></div>
  ${this.renderLevelMap()}
  <div class="cd-level-body">${level==='exam'?this.renderExam():level===1?this.renderScreen():this.renderCaseFlow()}</div>`;
 }
 renderLevelMap(){
  const s=this.session,cur=this.level,unlocked=examUnlocked(s),ex=examSummary(s);
  const tiles=LEVELS.map(l=>{const st=levelStatus(s,l);const status=st.passed?'已通关':st.started?'进行中':'未开始';const detail=l.id===1?`已判对 ${st.done}/${st.total}${st.judged?` · 首次正确 ${st.firstCorrect}/${st.judged}`:''}`:`已完成 ${st.done}/${st.total} · 需 ${st.required}${l.mustInclude?'（含 '+l.mustInclude.join('、')+'）':''}`;
   return `<button class="cd-level ${cur===l.id?'active':''} ${st.passed?'passed':''}" role="tab" aria-selected="${cur===l.id}" data-action="level" data-level="${l.id}"><span class="cd-level-num">${l.id}</span><strong>${esc(l.name)}</strong><small>${esc(l.stage)} · ${esc(l.minutes)}</small><em>${status} · ${esc(detail)}</em></button>`;}).join('');
  const exStatus=ex.first?`${ex.first.result.passed?'首次通过':'首次未通过'} · 首次 ${ex.first.result.score}/${ex.first.result.total}${ex.attempts>1?` · 最近 ${ex.latest.result.score}/${ex.latest.result.total}`:''}`:unlocked?'已开放':'四关通关后开放';
  const examTile=`<button class="cd-level cd-level-exam ${cur==='exam'?'active':''} ${ex.first?.result.passed?'passed':''} ${unlocked?'':'locked'}" role="tab" aria-selected="${cur==='exam'}" data-action="level" data-level="exam"><span class="cd-level-num">${unlocked?'考':'锁'}</span><strong>${esc(EXAM.name)}</strong><small>${esc(EXAM.stage)} · ${esc(EXAM.minutes)}</small><em>${esc(exStatus)}</em></button>`;
  const def=cur==='exam'?EXAM:levelById(cur);
  return `<div class="cd-levels" role="tablist" aria-label="训练关卡">${tiles}${examTile}</div>
  <div class="cd-level-intro"><div><p class="eyebrow">${cur==='exam'?'综合考核':'第 '+cur+' 关 · '+esc(def.stage)}</p><h2>${esc(def.name)}</h2><p>${esc(def.goal)}</p></div><dl><div><dt>任务形式</dt><dd>${esc(def.format)}</dd></div><div><dt>通关条件</dt><dd>${esc(def.pass)}</dd></div></dl></div>`;
 }

 /* ---- 第 1 关 · 分层判读 ---- */
 renderScreen(){
  const s=this.session,st=screenState(s),ids=LEVELS[0].cases;
  if(!this.screenActive||!ids.includes(this.screenActive))this.screenActive=this.nextScreenCase();
  const id=this.screenActive,item=screenItem(id),rec=st[id],draft=this.screenDraft,fb=this.lastScreen?.case===id?this.lastScreen:null,status=levelStatus(s,LEVELS[0]);
  const list=ids.map(x=>{const r=st[x];const c=caseById(x);return `<button class="cd-case cd-case-mini ${x===id?'active':''} ${r?.passed?'done':r?.first?'wrong':''}" data-action="screen-case" data-case="${x}"><img src="./real-cases/${x}/preview-unmarked.webp" alt="" loading="lazy"><strong>${x}</strong><small>${esc(c.title)}</small><em>${r?.passed?(r.first.correct?'首次判对':'重判后判对'):r?.first?'待重判':'未判读'}</em></button>`;}).join('');
  const pickBtn=(field,v,t)=>`<button class="cd-pick ${draft[field]===v?'selected':''} ${fb?(v===item.answer[field]?'right':draft[field]===v?'wrong':''):''}" data-action="screen-pick" data-field="${field}" data-value="${v}" ${fb?'disabled':''}>${esc(t)}</button>`;
  return `<div class="cd-cases cd-cases-screen" role="tablist" aria-label="判读病例">${list}</div>
  <div class="case-layout">
   <div class="case-card cd-screen">
    <span class="tag">匿名真实病例</span><span class="tag">第 ${ids.indexOf(id)+1} / ${ids.length} 例</span>
    <h2 class="cd-case-title" style="margin-top:14px">${esc(item.title)}</h2>
    <div class="cd-screen-grid">
     <div class="cd-imaging cd-imaging-tall"><img src="./real-cases/${esc(id)}/preview-unmarked.webp" alt="${esc(item.title)} 真实 CT 预览"><div><strong>主病灶影像测量值</strong><p>由本例 CT 体数据与源三维计算。</p><a href="./index.html#${esc(id)}">在首页三屏中打开本例</a></div></div>
     <dl class="cd-record cd-record-one">${item.facts.map(([k,v,src])=>`<div><dt>${esc(k)}</dt><dd>${src==='supplement'?'<small class="muted">教学情境 · </small>':src==='notes'?'<small class="muted">脱敏病史 · </small>':''}${esc(v)}</dd></div>`).join('')}</dl>
    </div>
    <section class="cd-stage"><div class="cd-stage-head"><span class="cd-stage-num">1</span><h3>密度类型</h3></div><div class="cd-picks">${DENSITY_OPTIONS.map(([v,t])=>pickBtn('density',v,t)).join('')}</div></section>
    <section class="cd-stage"><div class="cd-stage-head"><span class="cd-stage-num">2</span><h3>管理层级</h3></div><div class="cd-picks">${TIER_OPTIONS.map(([v,t])=>pickBtn('tier',v,t)).join('')}</div></section>
    <div class="actions">${fb?`${fb.correct?'':'<button class="outline" data-action="screen-retry">再判一次</button>'}<button class="gold" data-action="screen-next">下一例</button>`:`<button class="primary" data-action="screen-submit" ${draft.density&&draft.tier?'':'disabled'}>提交判读</button>`}${rec?`<span class="small muted">已判 ${rec.attempts} 次 · 首次${rec.first.correct?'判对':'判错'}</span>`:''}</div>
    <div id="screen-feedback">${fb?`<div class="feedback ${fb.correct?'':'notice'}"><strong>${fb.correct?'判读成立':fb.densityOk?'密度判对，层级有误':fb.tierOk?'层级判对，密度有误':'密度与层级均有误'}</strong>${esc(item.densityLabel)}；${esc(item.reason)}${fb.correct?'':' 对照右侧分层规则再判一次。'}</div>`:''}</div>
   </div>
   <div>
    <div class="panel"><p class="eyebrow">本关进度</p><h2>${status.done} / ${status.total} 例判对</h2><p class="small muted" style="margin-top:8px">${status.judged?`已判读 ${status.judged} 例，首次判对 ${status.firstCorrect} 例。`:'每例先定密度，再定层级。'}${status.passed?' 本关已通关，可进入第 2 关。':''}</p>${status.passed?'<div class="actions"><button class="primary" data-action="level" data-level="2">进入第 2 关</button></div>':''}</div>
    <div class="panel"><p class="eyebrow">分层规则 · 密度</p><p class="small">${esc(DENSITY_RULE)}</p></div>
    <div class="panel"><p class="eyebrow">分层规则 · 层级（按最长径）</p><table class="comparison cd-matrix"><thead><tr><th>密度</th><th>随访</th><th>进一步评估</th><th>分期优先</th></tr></thead><tbody>${SCREEN_RULES.map(r=>`<tr><td>${esc(r.density)}</td><td>${esc(r.followup)}</td><td>${esc(r.evaluate)}</td><td>${esc(r.stage)}</td></tr>`).join('')}</tbody></table><p class="small muted" style="margin-top:10px">本表为本课教学分层规则，不直接决定检查与治疗。须结合完整病史、薄层结果、逐灶变化及适用指南条件再作决策。</p></div>
   </div>
  </div>`;
 }

 /* ---- 第 2–4 关 · 病例流程 ---- */
 renderItem(item,index){
  const c=this.case,st=itemState(this.session,c.id,item.id),fb=this.itemFeedback[item.id],done=st.correct&&st.ruleVersion===LEVELS_VERSION,draft=this.drafts[item.id];
  const chosen=done?st.response:draft;
  const optionBtn=o=>{const sel=item.type==='single'?chosen===o.id:Array.isArray(chosen)&&chosen.includes(o.id);const idx=item.type==='order'&&Array.isArray(chosen)?chosen.indexOf(o.id):-1;return `<button class="cd-pick ${sel?'selected':''} ${done&&sel?'right':''}" data-action="item-pick" data-item="${item.id}" data-option="${o.id}" data-type="${item.type}" ${done||(fb&&!fb.correct)?'disabled':''}>${idx>=0?`<span class="cd-order-num">${idx+1}</span>`:''}${esc(o.text)}</button>`;};
  const body=item.type==='number'?`<div class="cd-number"><input type="number" step="1" data-item-input="${item.id}" value="${done?esc(st.response):draft??''}" ${done?'disabled':''} aria-label="填写数值"><span>${esc(item.unit||'')}</span></div>`:`<div class="cd-picks cd-picks-col">${item.options.map(optionBtn).join('')}</div>`;
  const status=done?`<span class="tag good">${st.attempts===1?'首次答对':'纠正后答对'}</span>`:st.attempts?`<span class="tag">已答 ${st.attempts} 次</span>`:'';
  const actions=done?'':fb&&!fb.correct?`<button class="outline" data-action="item-retry" data-item="${item.id}">再答一次</button>`:`${item.type==='order'&&Array.isArray(draft)&&draft.length?`<button class="outline" data-action="item-clear" data-item="${item.id}">清除重排</button>`:''}<button class="primary" data-action="item-submit" data-item="${item.id}">确认</button>`;
  const feedback=done?`<div class="feedback"><strong>成立</strong>${esc(item.explanation)}</div>`:fb&&!fb.correct?`<div class="feedback notice"><strong>不成立</strong>你的作答：${esc(answerText(item,fb.response))}。${item.type==='number'?'按公式重新计算。':'重新审阅病历与检查结果后再答。'}</div>`:'';
  return `<div class="cd-item" data-item-box="${item.id}"><p class="cd-item-stem"><span class="cd-item-index">${index+1}</span>${esc(item.stem)}${item.critical?'<span class="tag warn" style="margin-left:6px">关键题</span>':''}</p><p class="small muted">${TYPE_HINT[item.type]}</p>${body}<div class="actions">${actions}${status}</div>${feedback}</div>`;
 }
 renderCaseFlow(){
  const lv=this.levelDef,c=this.case,state=this.state,draft=state.draft||{choice:null,reasons:[]},last=state.choices.at(-1),verdict=this.lastVerdict&&this.lastVerdictCase===c.id?this.lastVerdict:null;
  const review=testReview(c,state.tests,state.draft?.choice),a=c.analysis,m=a.main,items=levelItems(c,lv),stepDef=LEVEL_STEP[lv.id],itemsOk=itemsDone(this.session,c,lv),status=levelStatus(this.session,lv);
  const readiness=caseReadiness(c,state),stepOpen=readiness.ready,complete=caseComplete(this.session,c,lv);
  const answered=items.filter(it=>caseState(this.session,c.id).items?.[it.id]?.correct&&caseState(this.session,c.id).items[it.id].ruleVersion===LEVELS_VERSION).length;
  const stageStatus=[readiness.reviewedCards?'done':state.opened.length?'partial':'',readiness.ready?'done':state.tests.length?'partial':'',itemsOk?'done':answered?'partial':'',complete?'done':last||draft.choice?'partial':'',last?'done':''];
  const STAGES=[['1','病历审阅','阅读病历与影像资料'],['2','资料核对与检查选择','核对已有结果与检查指征'],['3',stepDef.title,stepDef.hint],['4','决策与理由','提出方案并说明依据'],['5','复盘与依据','对照研究人群与常见误区']];
  const cases=lv.cases.map(caseById),index=cases.findIndex(x=>x.id===c.id),nextCase=cases[(index+1)%cases.length];
  const caseTabs=cases.map(x=>{const s=caseState(this.session,x.id),done=caseComplete(this.session,x,lv),mm=x.analysis.main,l=s.choices.at(-1);return `<button class="cd-case ${x.id===c.id?'active':''} ${done?'done':''}" role="tab" aria-selected="${x.id===c.id}" data-action="case" data-case="${x.id}"><img src="./real-cases/${x.id}/preview-unmarked.webp" alt="" loading="lazy"><strong>${x.id}</strong><small>${esc(x.title)}${mm?` · ${mm.longestDiameterMm} mm · ${esc(mm.densityLabel.replace('（不作密度分层）',''))}`:''}</small><em>${esc(TIERS[x.tier].short)} · ${done?'已完成':l?(l.ruleVersion!==DECISION_VERSION?'历史记录·待复核':l.reasonable?'过程合理·待完成':'待修正'):s.opened.length?'进行中':'未开始'}</em></button>`;}).join('');
  return `<div class="cd-cases-head"><p class="eyebrow">第 ${lv.id} 关病例 · 已完成 ${status.done} / ${status.total}（需 ${status.required}${lv.mustInclude?'，含 '+lv.mustInclude.join('、'):''}）</p>${status.passed?`<span class="tag good">本关已通关</span>`:''}</div>
  <div class="cd-cases" role="tablist" aria-label="选择病例">${caseTabs}</div>
  <div class="case-layout">
   <div class="case-card">
    <span class="tag">真实 CT · 标准化教学情境</span><span class="tag">${esc(c.difficulty)}</span><span class="tag">第 ${lv.id} 关 · ${esc(lv.stage)}</span>
    <h2 class="cd-case-title" style="margin-top:14px">${esc(c.name)}</h2><p>${esc(c.subtitle)}</p><p style="margin-top:12px">${esc(c.intro)}</p>

    <section class="cd-stage" aria-labelledby="cd-stage-1"><div class="cd-stage-head"><span class="cd-stage-num">1</span><h3 id="cd-stage-1">病历审阅</h3><span class="tag ${stageStatus[0]==='done'?'good':''}">${stageStatus[0]==='done'?'四类资料已审阅':`已审阅 ${state.opened.length} / ${c.cards.length}`}</span></div>
     <dl class="cd-record">${c.patient.map(([k,v,src])=>`<div><dt>${esc(k)}</dt><dd class="${src==='missing'?'cd-np':''}">${src==='supplement'?'<small class="muted">教学情境 · </small>':src==='notes'?'<small class="muted">脱敏病史 · </small>':''}${esc(v)}</dd></div>`).join('')}</dl>
     <div class="cd-imaging"><img src="./real-cases/${esc(c.imaging.caseId)}/preview-unmarked.webp" alt="${esc(c.imaging.title)} 真实 CT 预览"><div><strong>${esc(c.imaging.title)}</strong><p>${esc(c.imaging.note)}</p><a href="./index.html#${esc(c.imaging.caseId)}">在首页三屏中打开本例</a></div></div>
     <div class="case-tiles">${c.cards.map(x=>`<button class="case-tile ${state.opened.includes(x.id)?'open':''}" data-action="card" data-case-card="${x.id}"><strong>${esc(x.title)}</strong><span>${state.opened.includes(x.id)?'已审阅':'查看'}</span></button>`).join('')}</div>
     <div id="case-information">${c.cards.filter(x=>state.opened.includes(x.id)).map(x=>`<div class="reading-card"><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></div>`).join('')}</div>
    </section>

    <section class="cd-stage" aria-labelledby="cd-stage-2"><div class="cd-stage-head"><span class="cd-stage-num">2</span><h3 id="cd-stage-2">资料核对与检查选择</h3><span class="tag ${state.revealed?'good':''}">${state.revealed?`当前路径资料 ${review.hit} / ${review.necessaryCount}`:`已选 ${state.tests.length} 项`}</span></div>
     <p class="small muted">勾选要核对的已有资料，点「查看点评」。选择项目表示审阅本题结果，不表示新增检查医嘱；随访路径无需为通关而加做 PET 或肺功能。</p>
     <div class="cd-tests">${c.tests.map(t=>`<button class="cd-test" data-action="test" data-test="${t.id}" aria-pressed="${state.tests.includes(t.id)}"><span class="box" aria-hidden="true"></span><span>${esc(t.name)}</span></button>`).join('')}</div>
     <div class="actions"><button class="outline" data-action="reveal" ${state.tests.length?'':'disabled'}>${state.revealed?'重新查看点评':'查看点评'}</button></div>
     ${state.revealed?`<div class="feedback ${review.missed.length||review.unnecessary.length?'notice':''} cd-review"><strong>${review.missed.length?`漏选 ${review.missed.length} 项当前路径资料`:'当前路径资料已核对'}${review.unnecessary.length?`；${review.unnecessary.length} 项未给出新增检查指征`:''}</strong>${review.missed.length?'尚未核对的当前路径资料：'+review.missed.map(t=>esc(t.name)).join('、')+'。':''}${review.unnecessary.length?' 本题未给出新增检查指征：'+review.unnecessary.map(t=>esc(t.name)).join('、')+'。':''}</div>
     <div class="cd-results">${c.tests.map(t=>`<div class="cd-result ${state.tests.includes(t.id)?'':'skipped'}"><span class="cd-verdict ${testDisposition(c,t,draft.choice)==='conditional'?'optional':testDisposition(c,t,draft.choice)}">${esc(verdictLabel(testDisposition(c,t,draft.choice)))}</span><div><strong>${esc(t.name)}</strong><p>${esc(t.why)}</p><p class="cd-value">${state.tests.includes(t.id)?'教学情境结果：'+esc(t.result)+(t.inLibrary?` <a href="./index.html#${esc(c.id)}">打开本例 CT</a>`:''):'未核对'+(testDisposition(c,t,draft.choice)==='necessary'?' · 本题需核对':'')}</p></div></div>`).join('')}</div>`:''}
    </section>

    <section class="cd-stage cd-items" aria-labelledby="cd-stage-3"><div class="cd-stage-head"><span class="cd-stage-num">3</span><h3 id="cd-stage-3">${esc(stepDef.title)}</h3><span class="tag ${itemsOk?'good':''}">${itemsOk?'题组已完成':`已答对 ${answered} / ${items.length}`}</span></div>
     <p class="small muted">${esc(stepDef.hint)}</p>
     ${stepOpen?items.map((it,i)=>this.renderItem(it,i)).join(''):`<div class="feedback notice"><strong>先完成前两步</strong>${'请审阅四类资料，并勾选病史、既往影像、薄层 CT 与纵隔窗后查看当前结果；本步才开放。'}</div>`}
    </section>

    <section class="cd-stage" aria-labelledby="cd-stage-4"><div class="cd-stage-head"><span class="cd-stage-num">4</span><h3 id="cd-stage-4">决策与理由</h3><span class="tag ${last?.reasonable?'good':''}">${complete?'本例已完成':last?(last.ruleVersion!==DECISION_VERSION?'历史提交待复核':last.reasonable?'过程合理·未完成':'待修正'):'待提交'}</span></div>
     <div class="decision-options">${c.options.map(([v,t])=>`<button data-action="choice" data-case-choice="${v}" class="${draft.choice===v?'selected':''}">${esc(t)}</button>`).join('')}</div>
     <div class="checklist">${c.reasons.map(([v,t])=>`<label><input type="checkbox" value="${v}" name="reason" ${draft.reasons?.includes(v)?'checked':''}>${esc(t)}</label>`).join('')}</div>
     <div class="actions"><button id="submit-case" class="primary" data-action="submit" ${draft.choice?'':'disabled'}>提交判断</button>${last?`<span class="small muted">已提交 ${state.choices.length} 次 · 首次判断${state.choices[0].reasonable?'成立':'待修正'}</span>`:''}</div>
     <div id="case-feedback">${verdict?`<div class="feedback ${verdict.reasonable?'':'notice'}"><strong>${esc(verdict.title)}</strong>${esc(verdict.text)}</div>`:''}</div>
    </section>

    ${last?`<section class="cd-stage cd-debrief" aria-labelledby="cd-stage-5"><div class="cd-stage-head"><span class="cd-stage-num">5</span><h3 id="cd-stage-5">复盘与依据</h3><span class="tag">提交后开放</span></div>
     <p><strong>${esc(c.debrief.summary)}</strong></p>
     <h4>要点</h4><ol>${c.debrief.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ol>
     <h4>常见误区</h4><ul>${c.debrief.pitfalls.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>
     <h4>依据</h4><div class="cd-evidence">${c.debrief.evidence.map(id=>EVIDENCE[id]).filter(Boolean).map(e=>`<article><a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.title)}</a><dl><dt>人群</dt><dd>${esc(e.population)}</dd><dt>结论</dt><dd>${esc(e.finding)}</dd><dt>边界</dt><dd>${esc(e.note)}</dd></dl></article>`).join('')}</div>
     ${c.debrief.mdt||c.debrief.outcome?`<h4>教学情境后续</h4>${c.debrief.mdt?`<p><strong>多学科意见：</strong>${esc(c.debrief.mdt)}</p>`:''}${c.debrief.outcome?`<p><strong>后续经过：</strong>${esc(c.debrief.outcome)}</p>`:''}`:''}
     <h4>我的反思</h4><textarea class="cd-reflection" data-reflection maxlength="1000" placeholder="本例最关键的决策条件是什么？最初漏看了什么？">${esc(state.reflection||'')}</textarea>
     <div class="actions"><button class="gold" data-action="case" data-case="${nextCase.id}">下一病例：${nextCase.id} · ${esc(nextCase.title)}</button>${status.passed&&lv.id<4?`<button class="outline" data-action="level" data-level="${lv.id+1}">进入第 ${lv.id+1} 关</button>`:status.passed&&lv.id===4&&examUnlocked(this.session)?`<button class="outline" data-action="level" data-level="exam">进入综合考核</button>`:''}</div>
    </section>`:''}
   </div>
   <div>
    <div class="panel"><p class="eyebrow">本例决策路径</p><div class="cd-progress">${STAGES.map(([n,t,d],i)=>`<div><span class="cd-dot ${stageStatus[i]}"></span><div><strong>${n} · ${esc(t)}</strong><small>${esc(d)}</small></div></div>`).join('')}</div>${m?`<p class="small muted" style="margin-top:12px">本例分层依据：${esc(a.tierReason)}</p>`:''}</div>
    <div class="cd-principles-side"><p class="eyebrow">决策五要素</p>${PRINCIPLES.map(p=>`<div class="cd-principle"><strong>${esc(p.title)}</strong><p>${esc(p.text)}</p></div>`).join('')}</div>
    <div class="panel"><p class="eyebrow">研究人群速查 · 先测 CTR</p><table class="comparison cd-matrix"><thead><tr><th>研究</th><th>总径</th><th>CTR</th><th>比较</th></tr></thead><tbody>${TRIAL_MATRIX.map(r=>`<tr><td>${esc(r.trial)}</td><td>${esc(r.size)}</td><td>${esc(r.ctr)}</td><td>${esc(r.compare)}</td></tr>`).join('')}</tbody></table><p class="small muted" style="margin-top:10px">CTR = 实性成分最大径 ÷ 病灶最大径，在薄层 CT 上测量。</p></div>
    ${c.id==='CT-004'?`<div class="panel"><p class="eyebrow">安全检查点 · CT-004</p><h2>右上叶安全训练</h2><p style="margin-top:10px">在 CT-004 的真实 CT 与源三维上完成六个安全检查点：体位与入胸、进胸定向、静脉保护、动脉追踪、支气管保护、安全结束。</p><button class="primary" data-action="enter-b" style="margin-top:18px">进入安全检查点</button></div><div class="panel"><h3>S2 条件对照与结构变异</h3><div class="actions"><button class="outline" data-action="s2">S2 条件对照</button><button class="outline" data-action="variation">结构变异提示</button></div></div>`:''}
    <p class="small muted">影像测量值来自本例 CT 体数据与源三维。病史、肺功能、分期与随访经过为课程编写的标准化教学病历，与各例影像特征一致。</p>
   </div>
  </div>`;
 }

 /* ---- 综合考核 ---- */
 renderExamItem(item,index,responses,graded){
  const resp=responses[item.id],g=graded?gradeItem(item,resp):null;
  const optionBtn=o=>{const sel=item.type==='single'?resp===o.id:Array.isArray(resp)&&resp.includes(o.id);const idx=item.type==='order'&&Array.isArray(resp)?resp.indexOf(o.id):-1;const cls=graded?(item.type==='single'?(o.id===item.answer?'right':sel?'wrong':''):(Array.isArray(item.answer)&&item.answer.includes(o.id)?'right':sel?'wrong':'')):'';return `<button class="cd-pick ${sel?'selected':''} ${cls}" data-action="exam-pick" data-item="${item.id}" data-option="${o.id}" data-type="${item.type}" ${graded?'disabled':''}>${idx>=0?`<span class="cd-order-num">${idx+1}</span>`:''}${esc(o.text)}</button>`;};
  const body=item.type==='number'?`<div class="cd-number"><input type="number" step="1" data-exam-number="${item.id}" value="${resp??''}" ${graded?'disabled':''} aria-label="填写数值"><span>${esc(item.unit||'')}</span></div>`:`<div class="cd-picks cd-picks-col">${item.options.map(optionBtn).join('')}</div>`;
  const review=graded?`<div class="feedback ${g?'':'notice'}"><strong>${g?'正确':'错误'}${item.critical?' · 关键题':''}</strong>你的作答：${esc(answerText(item,resp))}。${g?'':'应为：'+esc(correctText(item))+'。'}${esc(item.explanation)}</div>`:'';
  const clear=!graded&&item.type==='order'&&Array.isArray(resp)&&resp.length?`<div class="actions"><button class="outline" data-action="exam-clear" data-item="${item.id}">清除重排</button></div>`:'';
  return `<div class="cd-item ${graded?(g?'graded-right':'graded-wrong'):resp==null||resp===''||(Array.isArray(resp)&&!resp.length)?'':'answered'}"><p class="cd-item-stem"><span class="cd-item-index">${index+1}</span>${esc(item.stem)}${item.critical?'<span class="tag warn" style="margin-left:6px">关键题</span>':''}</p><p class="small muted">${TYPE_HINT[item.type]}</p>${body}${clear}${review}</div>`;
 }
 renderExam(){
  const s=this.session,ex=examState(s),unlocked=examUnlocked(s),sum=examSummary(s);
  if(!unlocked){
   const rows=LEVELS.map(l=>{const st=levelStatus(s,l);return `<div><span class="cd-dot ${st.passed?'done':st.started?'partial':''}"></span><div><strong>第 ${l.id} 关 · ${esc(l.name)}</strong><small>${st.passed?'已通关':l.id===1?`已判对 ${st.done}/${st.total}`:`已完成 ${st.done}/${st.total}，需 ${st.required}${l.mustInclude?'（含 '+l.mustInclude.join('、')+'）':''}`}</small></div></div>`;}).join('');
   return `<div class="case-layout"><div class="case-card"><span class="tag">综合考核</span><h2 class="cd-case-title" style="margin-top:14px">四关通关后开放</h2><p style="margin-top:10px">考核独立作答、提交后统一评分，成绩写入学习报告；首次成绩保留，可再考。</p><div class="cd-progress" style="margin-top:16px">${rows}</div><div class="actions"><button class="primary" data-action="level" data-level="${LEVELS.find(l=>!levelStatus(s,l).passed)?.id||1}">回到未通关的关卡</button></div></div><div><div class="panel"><p class="eyebrow">考核结构</p><p class="small">${esc(EXAM.format)}</p><p class="small muted" style="margin-top:8px">${esc(EXAM.pass)}</p></div></div></div>`;
  }
  if(ex.current){
   const responses=ex.current.responses,answered=EXAM_ITEMS.filter(it=>{const r=responses[it.id];return !(r==null||r===''||(Array.isArray(r)&&!r.length));}).length;
   const sections=EXAM_DIMS.map(([d,name])=>`<section class="cd-stage"><div class="cd-stage-head"><h3>${esc(name)}</h3><span class="tag">${EXAM_ITEMS.filter(i=>i.dim===d).length} 题</span></div>${EXAM_ITEMS.map((it,i)=>it.dim===d?this.renderExamItem(it,i,responses,false):'').join('')}</section>`).join('');
   return `<div class="case-layout"><div class="case-card cd-exam"><span class="tag">${ex.attempts.length?'同卷订正':'首次作答'}</span><span class="tag">第 ${ex.attempts.length+1} 次</span><h2 class="cd-case-title" style="margin-top:14px">综合考核 · ${EXAM_ITEMS.length} 题</h2><p style="margin-top:8px">作答期间不显示解析；全部作答后提交。固定卷的再次作答记为同卷订正，不能作为新的独立测评。</p>${sections}<div class="actions"><button class="primary" data-action="exam-submit" ${answered===EXAM_ITEMS.length?'':'disabled'}>提交考核</button><span class="small muted">已作答 ${answered} / ${EXAM_ITEMS.length}</span></div></div><div><div class="panel"><p class="eyebrow">考核规则</p><p class="small">${esc(EXAM.pass)}</p><p class="small muted" style="margin-top:8px">分层判读按本课分层规则；研究人群按薄层总径与 CTR；预计术后功能按段数法（全肺 19 段）。</p></div></div></div>`;
  }
  const idx=this.examReview==null?ex.attempts.length-1:Math.min(this.examReview,ex.attempts.length-1),attempt=ex.attempts[idx],r=attempt?.result;
  const result=r?`<div class="cd-exam-result"><div class="metrics cd-exam-metrics"><div class="metric"><span class="label">得分</span><div class="value">${r.score}<small> / ${r.total}</small></div><small>${r.passed?'通过':'未通过'} · 关键题 ${r.criticalCorrect}/${r.criticalCount}</small></div>${Object.values(r.dims).map(d=>`<div class="metric"><span class="label">${esc(d.name)}</span><div class="value">${d.correct}<small> / ${d.total}</small></div></div>`).join('')}</div><p class="small muted">${sum.attempts>1?`第 ${idx+1} 次成绩；首次 ${sum.first.result.score}/${sum.first.result.total}（${sum.first.result.passed?'通过':'未通过'}）保留在学习报告中。`:'首次成绩保留在学习报告中。'}</p></div>`:'';
  const review=r?EXAM_DIMS.map(([d,name])=>`<section class="cd-stage"><div class="cd-stage-head"><h3>${esc(name)}</h3><span class="tag ${r.dims[d].correct===r.dims[d].total?'good':''}">${r.dims[d].correct} / ${r.dims[d].total}</span></div>${EXAM_ITEMS.map((it,i)=>it.dim===d?this.renderExamItem(it,i,attempt.responses,true):'').join('')}</section>`).join(''):'';
  const attemptsNav=ex.attempts.length>1?`<div class="actions">${ex.attempts.map((a,i)=>`<button class="${i===idx?'primary':'outline'}" data-action="exam-review" data-attempt="${i}">第 ${i+1} 次 · ${a.result.score}/${a.result.total}</button>`).join('')}</div>`:'';
  return `<div class="case-layout"><div class="case-card cd-exam"><span class="tag">综合考核</span>${r?`<span class="tag ${r.passed?'good':'warn'}">${idx===0?(r.passed?'首次通过':'首次未通过'):(r.passed?'同卷订正通过':'同卷订正未通过')}</span>`:''}<h2 class="cd-case-title" style="margin-top:14px">${r?'考核解析':'综合考核 · 12 题'}</h2>${r?'':`<p style="margin-top:8px">${esc(EXAM.goal)} ${esc(EXAM.format)}</p>`}${result}${attemptsNav}<div class="actions"><button class="${r?'outline':'primary'}" data-action="exam-start">${r?'同卷订正':'开始考核'}</button></div>${review}</div><div><div class="panel"><p class="eyebrow">考核规则</p><p class="small">${esc(EXAM.pass)}</p></div><div class="panel"><p class="eyebrow">四关状态</p><div class="cd-progress cd-progress-compact">${LEVELS.map(l=>{const st=levelStatus(s,l);return `<div><span class="cd-dot ${st.passed?'done':st.started?'partial':''}"></span><div><strong>第 ${l.id} 关 · ${esc(l.name)}</strong><small>${st.passed?'已通关':'未通关'}</small></div></div>`;}).join('')}</div></div></div></div>`;
 }

 /** 学习报告用：四关状态与考核成绩。 */
 reportSummary(){
  const s=this.session,sum=examSummary(s);
  const rows=LEVELS.map(l=>{const st=levelStatus(s,l);return `<tr><td>第 ${l.id} 关 · ${esc(l.name)}</td><td>${esc(l.stage)}</td><td>${l.id===1?`判对 ${st.done}/${st.total}${st.judged?`，首次正确 ${st.firstCorrect}/${st.judged}`:''}`:`完成 ${st.done}/${st.total}（需 ${st.required}）`}</td><td>${st.passed?'已通关':st.started?'进行中':'未开始'}</td></tr>`;}).join('');
  const exam=sum.first?`首次 ${sum.first.result.score}/${sum.first.result.total}（${sum.first.result.passed?'通过':'未通过'}，关键题 ${sum.first.result.criticalCorrect}/${sum.first.result.criticalCount}）${sum.attempts>1?`；同卷订正 ${sum.attempts-1} 次，最近 ${sum.latest.result.score}/${sum.latest.result.total}`:''}`:examUnlocked(s)?'已开放，未作答':'四关通关后开放';
  return `<article class="panel cd-report"><h2>病例决策 · 四关递进与综合考核</h2><div class="report-table-wrap"><table class="report-table"><thead><tr><th>关卡</th><th>层次</th><th>进度</th><th>状态</th></tr></thead><tbody>${rows}<tr><td>综合考核</td><td>考核</td><td colspan="2">${esc(exam)}</td></tr></tbody></table></div><p class="small muted">首次作答与纠正分别记录；题目数量有限，不扩大解释为临床决策能力。</p></article>`;
 }
}
