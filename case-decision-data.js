// 病例决策训练 · 数据（真实病例版）。
// 全部病例来自本库匿名真实病例；病灶部位、肺段、最长径、体积、HU、实性成分占比、
// 与肺叶表面／支气管树的距离均由 scripts/build-decision-features.py 从已发布的 CT 体数据与源网格计算。
// 病史、肺功能、分期与随访经过来自 real-cases/clinical-supplement.js（课程编写的标准化教学病历，与各例影像特征一致）；
// 作者在 real-cases/clinical-notes.json 填写的脱敏真实病史会逐项覆盖它。页面逐项标明真实病史与标准化教学情境的来源。
import {DECISION_FEATURES} from './real-cases/decision-features.js';
import {CLINICAL_SUPPLEMENT} from './real-cases/clinical-supplement.js';
import {SOURCES} from './content.js';
import {REFERENCES as ASSESS_REFS} from './assessment-data.js';
import {fullSegmentName} from './segment-course-data.js';

export const DECISION_VERSION='CASES-REAL-2026.09.14-5';
export const FEATURES_VERSION=DECISION_FEATURES.version;
export const SUPPLEMENT_VERSION=CLINICAL_SUPPLEMENT.version;
export const SUPPLEMENT_LABEL=CLINICAL_SUPPLEMENT.label;
let activeSupplement=CLINICAL_SUPPLEMENT;
export const NOT_PROVIDED='未记录';
const src=id=>SOURCES.find(s=>s.id===id)||{};

export const EVIDENCE={
 JCOG0802:{...src('JCOG0802'),population:'外周、总径 ≤2 cm、CTR > 0.5（实性为主）',finding:'肺段切除的总生存不劣于肺叶切除；局部复发略多，须结合切缘与随访。'},
 JCOG1211:{...src('JCOG1211'),population:'磨玻璃为主（CTR ≤ 0.5）、总径 ≤3 cm',finding:'单臂研究：解剖性肺段切除的无复发生存良好；它不是段切与叶切的随机比较。'},
 CALGB:{...src('CALGB'),population:'外周、≤2 cm，术中冰冻确认肺门与纵隔淋巴结阴性',finding:'亚肺叶切除（楔切或段切）的无病生存不劣于肺叶切除。淋巴结阴性是入组前提，不能提前假定。'},
 FLEISCHNER:{id:'FLEISCHNER',title:'MacMahon et al. Fleischner 学会 2017 偶发肺结节管理指南，Radiology，2017',url:'https://doi.org/10.1148/radiol.2017161659',note:'纯磨玻璃结节 ≥6 mm：6–12 个月复查确认持续存在，之后每 2 年复查至 5 年；出现实性成分或增大时重新评估。',population:'CT 偶然发现的肺结节（≥35 岁、非免疫抑制、非已知肿瘤患者）',finding:'按结节类型、大小与风险决定复查间隔；小的纯磨玻璃结节以随访为主。'},
 STAGING:{...ASSESS_REFS.staging,id:'STAGING',population:'有纵隔组织学分期指征的疑似肺癌',finding:'影像与 PET 的提示不等于病理证实；内镜超声是首选取材途径。'},
 FITNESS:{...ASSESS_REFS.fitness,id:'FITNESS',population:'拟行肺癌根治性治疗的患者',finding:'FEV₁ 与 DLCO 分别评估；预计术后值分层后，再结合运动能力、心血管与整体状态。'},
 SEGMENT:{...ASSESS_REFS.segment,id:'SEGMENT',population:'拟行解剖性肺段切除的原发性肺癌',finding:'术前影像规划、结构变异辨认与切缘要求是解剖性切除的质量要素。'},
};

export const PRINCIPLES=[
 {id:'data',title:'资料 · 诊断依据是否充分',text:'薄层测量、实性成分与 CTR、既往影像对比、病灶位置。资料不充分时，完善评估就是当前的正确决策。'},
 {id:'stage',title:'分期 · 分期是否明确',text:'影像与 PET 的提示不等于病理证实。有纵隔组织学分期指征时先取材，再讨论方案。'},
 {id:'fitness',title:'功能 · 能否耐受',text:'FEV₁、DLCO、预计术后值、心血管与运动能力分别评估；单项正常不等于整体安全。'},
 {id:'procedure',title:'术式 · 条件是否成立',text:'切缘、位置、研究入组条件（外周、≤2 cm、CTR、淋巴结阴性）逐项核对；研究结论不是自动处方。'},
 {id:'patient',title:'患者 · 意愿与共同决策',text:'多学科讨论与共同决策。随访、分期、更改方案都是决策，不是回避。'},
];

export const TRIAL_MATRIX=[
 {trial:'JCOG0802 / WJOG4607L',size:'≤2 cm',ctr:'> 0.5',compare:'段切 vs 叶切（随机）',evidence:'JCOG0802'},
 {trial:'CALGB 140503',size:'≤2 cm',ctr:'不限（多为实性）',compare:'亚肺叶 vs 叶切（随机）；术中淋巴结阴性',evidence:'CALGB'},
 {trial:'JCOG1211',size:'≤3 cm',ctr:'≤ 0.5',compare:'段切单臂',evidence:'JCOG1211'},
 {trial:'JCOG0804 / WJOG4507L',size:'≤2 cm',ctr:'≤ 0.25',compare:'亚肺叶（以楔切为主）单臂',evidence:null},
];

export const TIERS={
 followup:{id:'followup',label:'影像随访层级',short:'随访层级',text:'按主病灶的大小与密度，本例属影像随访层级：先确认病灶持续存在并与既往影像对比，再按结节类型确定复查间隔。'},
 evaluate:{id:'evaluate',label:'进一步评估层级',short:'评估层级',text:'主病灶的大小或密度已达进一步评估层级：薄层测量实性成分，按指征行 PET 或组织学检查；术式在病理、分期与功能明确后讨论。'},
 stage:{id:'stage',label:'分期优先层级',short:'分期层级',text:'主病灶体积较大或实性为主：结合病史及已有结果核对本例分期指征，再进入多学科讨论；教学层级不等于统一检查套餐。'},
};
export const DENSITY={solid:'实性为主',partsolid:'混合密度',ggo:'磨玻璃为主',tiny:'微小病灶（不作密度分层）'};
const VERDICT={conditional:'相应决策路径需核对',necessary:'本题需核对',optional:'按指征讨论',unnecessary:'本题未给出新增检查指征'};
export const verdictLabel=v=>VERDICT[v]||v;

export function classifyLesion(l){
 const tiny=(l.voxelCount||0)<8||l.longestDiameterMm<5;
 const density=tiny?'tiny':l.solidFraction>=0.8?'solid':l.solidFraction<=0.2?'ggo':'partsolid';
 return {density,densityLabel:DENSITY[density],
  peripheral:Number.isFinite(l.distanceToLobeSurfaceMm)&&l.distanceToLobeSurfaceMm<=10,
  nearAirway:Number.isFinite(l.distanceToAirwayMm)&&l.distanceToAirwayMm<=5,
  segment:l.segmentCodes?.length?l.segmentCodes.map(fullSegmentName).join(' / '):null};
}

export function analyseCase(c){
 const lesions=c.lesions.map(l=>({...l,...classifyLesion(l)}));
 const main=lesions[0]||null,others=lesions.slice(1),significant=lesions.filter(l=>l.density!=='tiny'&&l.longestDiameterMm>=6);
 let tier='followup',tierReason='无病灶标注。';
 if(main){
  const d=main.longestDiameterMm;
  if(main.density==='tiny'){tier='followup';tierReason='主病灶过小，2 mm 序列不能可靠评估密度，须薄层复核。';}
  else if(main.density==='ggo'){tier=d>=15?'evaluate':'followup';tierReason=d>=15?`磨玻璃为主，最长径 ${d} mm ≥15 mm，须薄层评估有无实性成分。`:`磨玻璃为主，最长径 ${d} mm。`;}
  else if(main.density==='partsolid'){tier=d>30?'stage':d>=8?'evaluate':'followup';tierReason=d>30?`混合密度且最长径 ${d} mm >30 mm。`:d>=8?`混合密度，最长径 ${d} mm ≥8 mm，实性成分须薄层测量。`:`混合密度，最长径 ${d} mm <8 mm。`;}
  else{tier=d>=20?'stage':d>=8?'evaluate':'followup';tierReason=d>=20?`实性为主且最长径 ${d} mm ≥20 mm。`:d>=8?`实性为主，最长径 ${d} mm ≥8 mm。`:`实性为主，最长径 ${d} mm <8 mm。`;}
 }
 const multi=significant.length>=2,bilateral=new Set(significant.map(l=>(l.lobe||'')[0])).size>1;
 let sphere=null;
 if(main&&c.planning?.length){sphere=c.planning.map(s=>({...s,distanceMm:Math.hypot(...s.center.map((v,i)=>v-main.center[i]))})).sort((a,b)=>a.distanceMm-b.distanceMm)[0];}
 return {lesions,main,others,significant,tier,tierReason,multi,bilateral,sphere};
}

const card=(id,title,text)=>({id,title,text});
const test=(id,name,verdict,why,result,extra={})=>({id,name,verdict,why,result,...extra});
const pct=x=>Math.round((x||0)*100);

// 这里定义本题已给资料的核对要求，不是临床检查医嘱；路径与各例题组及 MDT 情境共用。
const BASE_REVIEW=['history','prior-ct','thin-ct','mediastinal-window'];
export const CASE_PATHS=Object.fromEntries(Array.from({length:15},(_,i)=>{
 const id=`CT-${String(i+1).padStart(3,'0')}`,follow=['CT-007','CT-012'].includes(id),shared=['CT-008','CT-011'].includes(id),stage=['CT-009','CT-010','CT-014'].includes(id);
 const paths=follow?['followup']:shared?['followup','mdt']:stage?['stage','mdt']:['mdt'];
 const required=Object.fromEntries(paths.map(path=>[path,[...BASE_REVIEW,...(path==='followup'?[]:['pft']),...(stage?['pet','ebus','brain-mri',id==='CT-009'?'bronchoscopy':'biopsy']:[])]]));
 return [id,{paths,required}];
}));
const sameSet=(a=[],b=[])=>[...new Set(a)].sort().join('|')===[...new Set(b)].sort().join('|');
export function caseReadiness(c,state,choice){
 const required=CASE_PATHS[c.id]?.required[choice]||BASE_REVIEW;
 const reviewedCards=c.cards.every(card=>state.opened?.includes(card.id));
 const currentReview=!!state.revealed&&state.testReview?.ruleVersion===DECISION_VERSION&&sameSet(state.tests,state.testReview.tests);
 const missing=required.filter(id=>!state.tests?.includes(id));
 const dataMissing=required.filter(id=>!c.tests.find(t=>t.id===id)?.result||c.tests.find(t=>t.id===id)?.result===NOT_PROVIDED);
 return {ready:reviewedCards&&currentReview&&!missing.length&&!dataMissing.length,reviewedCards,currentReview,required,missing,dataMissing};
}
function buildTests(id,a,supp){
 const t=a.tier,m=a.main,d=m?.density,staged=['CT-009','CT-010','CT-014'].includes(id),V=(t0,t1,t2)=>({followup:t0,evaluate:t1,stage:t2})[t],R=id=>supp?.results?.[id]||NOT_PROVIDED;
 return [
  test('history','病史与危险因素采集（症状、吸烟史、肿瘤史、家族史、职业暴露）','necessary','任何影像分层都以病史为前提。',R('history')),
  test('prior-ct','调取既往影像对比','necessary','有无增长决定随访还是干预。',R('prior-ct')),
  test('thin-ct','薄层 CT（≤1.5 mm）靶扫描，测量实性成分','necessary','本例 CT 层间距 2 mm，实性成分占比为估算值；CTR 须在薄层上测量。',R('thin-ct')),
  test('mediastinal-window','纵隔窗阅片：肺门与纵隔淋巴结','necessary','非增强 CT 亦须逐层观察淋巴结大小与形态。',R('mediastinal-window'),{inLibrary:true}),
  test('pft','肺功能（FEV₁ + DLCO）',V('optional','necessary','necessary'),'任何切除范围的讨论都以功能储备为前提；随访层级可暂缓。',R('pft')),
  test('pet','PET-CT',staged?'necessary':'optional','核对本题已给结果；是否新增 PET 检查须结合病灶特点与分期需求，不能仅凭教学层级决定。',R('pet')),
  test('ebus','纵隔组织学分期（EBUS／EUS）',V('unnecessary','optional','necessary'),'核对本例纵隔评估及取材指征；已有结果不表示需要重复检查。',R('ebus')),
  test('brain-mri','头颅 MRI',V('unnecessary','optional','necessary'),'结合本例分期情境核对已有结果；不作为所有结节的统一检查。',R('brain-mri')),
  test('biopsy','经皮穿刺活检',V('unnecessary','optional',m?.nearAirway&&!m?.peripheral?'unnecessary':'optional'),'外周实性病灶可行；磨玻璃小病灶阳性率低、气胸风险高；毗邻支气管者首选支气管镜。',R('biopsy')),
  test('bronchoscopy','支气管镜',V('unnecessary',m?.nearAirway?'optional':'unnecessary','necessary'),'毗邻支气管分支或分期层级时有价值；外周磨玻璃小病灶无指征。',R('bronchoscopy')),
  test('markers','肿瘤标志物','optional','仅作参考，不能替代影像随访与病理。',R('markers')),
 ];
}

const DEBRIEF={
 followup:a=>({
  summary:'随访层级：先确认持续存在，再按结节类型确定间隔，并写明重新评估的触发条件。',
  points:[`分层依据：${a.tierReason}`,'Fleischner 2017：纯磨玻璃 ≥6 mm，6–12 个月复查确认持续，之后每 2 年至 5 年；混合密度 ≥6 mm，3–6 个月复查后每年一次至 5 年；实性 6–8 mm，6–12 个月复查。','随访期间出现实性成分、实性成分增大或总径明显增大，是重新评估（薄层测量、多学科讨论）的信号。','PET 与穿刺对磨玻璃小病灶价值有限；检查项目多不等于随访正确。',...(a.multi?['多发病灶：每个病灶按各自类型随访，主病灶按最高层级处理。']:[])],
  pitfalls:['一发现磨玻璃就切。','未确认持续存在就开始 5 年随访计划。','随访方案里没有写明重新评估的条件。'],
  evidence:['FLEISCHNER'],
 }),
 evaluate:a=>({
  summary:'评估层级：先测 CTR，确定所属研究人群；核对切缘、分期、功能后进入多学科讨论。',
  points:[`分层依据：${a.tierReason} 实性成分体积占比 ${pct(a.main?.solidFraction)}%（2 mm 序列估算），CTR 以薄层测量为准。`,'总径 ≤2 cm 且 CTR > 0.5 属 JCOG0802 人群（段切 vs 叶切）；CTR ≤ 0.5 且 ≤3 cm 属 JCOG1211 人群（段切单臂）；≤2 cm 且 CTR ≤ 0.25 属 JCOG0804 人群（楔切为主）。CTR 在薄层上测量，不能用体积占比代替。','任何亚肺叶切除都以取得足够切缘为前提；切缘不能满足时，范围重新讨论。','CALGB 140503 的淋巴结阴性是「术中确认」；术前影像阴性只作为计划依据。','病理与分期明确前，术式只能是有条件的讨论；切除范围由术中冰冻与切缘决定。',...(a.multi?['多发病灶：先明确主病灶，再决定其余病灶是同期处理、分期处理还是随访。']:[])],
  pitfalls:['把「≤2 cm」直接等同于「楔切即可」。','把 2 mm 序列上的实性成分占比当成薄层 CTR。','没有既往影像就断定生长或稳定。'],
  evidence:['FLEISCHNER','JCOG0802','JCOG1211','CALGB','SEGMENT'],
 }),
 stage:a=>({
  summary:'分期层级：取材优先于术式讨论；分期结果决定整个治疗策略。',
  points:[`分层依据：${a.tierReason}`,'有创纵隔分期的指征：影像或 PET 提示纵隔淋巴结异常、中央型病灶、原发灶 >3 cm、N1 可疑。EBUS/EUS 是首选取材途径。','PET 对脑转移不敏感，临床分期较高时行头颅 MRI。','病理类型、分期与功能三者齐全后，由多学科讨论决定手术、综合治疗或其他方案。',...(a.multi?['多发病灶：区分同源转移与多原发，由影像、病理与多学科共同判断。']:[])],
  pitfalls:['把 PET 阳性当成病理阳性。','分期未完成就承诺患者「可以切」。','只看病灶大小不看纵隔窗。'],
  evidence:['STAGING','FITNESS','FLEISCHNER'],
 }),
};

function judgeFactory(getCase){
 return function judge(state,choice,reasons=[]){
  const c=getCase(),a=c.analysis,policy=CASE_PATHS[c.id],ready=caseReadiness(c,state,choice);
  const result=(reasonable,title,text,completeEligible=false)=>({reasonable,title,text,completeEligible,phase:completeEligible?'decision':'pending',readiness:ready});
  if(!ready.reviewedCards)return result(false,'先审阅四类资料','先阅读影像、位置、分期、病史与功能四类资料，再提交方案。');
  if(choice==='surgery')return result(false,'不能跳过条件直接安排手术','请结合本题已有病理、分期、功能、切缘及患者意愿讨论方案；已有部分检查结果不等于可以直接安排手术。');
  if(choice==='evaluate')return reasons.includes('insufficient')?result(true,'下一步合理，尚未完成本例','继续完善或核对资料是合理的过程判断。请明确待解决问题，并在资料核对、题组与条件性方案完成后再次提交；本次不计整例完成。'):result(false,'须说明待解决问题','请选择资料不足的理由，并核对仍需解决的薄层测量、病史或分期与功能问题。');
  if(!policy?.paths.includes(choice))return result(false,'与本例情境不符','请结合本例随访变化、题组解析和多学科意见选择路径；影像教学层级不直接决定最终方案。');
  if(reasons.includes('insufficient'))return result(false,'理由与完整方案互相矛盾','若仍认为决策所需资料不全，请选择完善评估并明确待解决问题；提交完整的条件性方案前，请修正资料不足的理由。');
  const requiredReasons=choice==='followup'?['feature','persistence','followup-plan']:['feature','stage','function'];
  if(a.multi)requiredReasons.push('multi');
  if(requiredReasons.some(id=>!reasons.includes(id)))return result(false,'方案理由不完整',choice==='followup'?'随访须包含影像依据、持续存在与变化、复查间隔、重新评估的触发条件和知情记录；多发病灶须逐一考虑。':'请核对影像依据、分期与功能条件；多发病灶须说明整体策略。');
  if(!ready.ready){
   const names=[...new Set([...ready.missing,...ready.dataMissing])].map(id=>c.tests.find(t=>t.id===id)?.name||id);
   return result(false,'尚未完成资料核对',`${!ready.currentReview?'请查看当前勾选资料的结果并重新确认。 ':''}${names.length?'尚需核对：'+names.join('；')+'。':''} 仅勾选项目或查看旧结果不能计为本次已核对。`);
  }
  const mdt=(c.supplement?.mdt||'').replace(/^多学科意见：/,'');
  return result(true,choice==='followup'?'条件性随访方案成立':choice==='stage'?'分期与后续路径成立':'多学科讨论方案成立',`${choice==='followup'?'已确认持续存在及变化，按本例情境记录复查间隔、重新评估的触发条件与患者意愿。':'已核对本题分期和功能资料，带着明确问题及条件进入多学科讨论。'}${mdt?' 教学情境意见：'+mdt:''} 题组全部通过后，本次完整提交才计入整例完成。`,true);
 };
}

function patientRows(c,a,notes,supp){
 const n=notes||{},sp=c.spacingMm,m=a.main,u=supp||{};
 const row=(k,nv,sv)=>nv?[k,nv,'notes']:sv?[k,sv,'supplement']:[k,NOT_PROVIDED,'missing'];
 const pk=(k,v)=>[k,v,'package'];
 const mainText=m?`${m.lobe||'肺叶未定'}${m.segment?' · '+m.segment:''} · 最长径 ${m.longestDiameterMm} mm · ${m.densityLabel}`:'无病灶标注';
 const otherSig=a.significant.filter(l=>l!==m);
 const age=x=>x&&(x.age||x.sex)?[x.age?x.age+' 岁':null,x.sex].filter(Boolean).join(' · '):null;
 return [pk('病例编号',`${c.id} · ${c.title}`),pk('影像资料',`非增强胸部 CT · 层间距 ${sp[2]} mm`),pk('主病灶',mainText),pk('其他 ≥6 mm 病灶',otherSig.length?otherSig.map(l=>`${l.lobe||'—'} ${l.longestDiameterMm} mm（${l.densityLabel}）`).join('；'):'无'),
  row('年龄 / 性别',age(n),age(u)),row('症状 / 发现方式',n.symptoms,u.symptoms),row('吸烟史',n.smoking,u.smoking),row('合并症',n.comorbidity,u.comorbidity),row('家族史 / 暴露',n.note,u.family),row('既往影像',n.priorImaging,u.priorImaging),row('肺功能',n.pft,u.pft),row('肿瘤标志物',null,u.markers),row('病理',n.pathology,u.pathology),row('分期检查',n.staging,u.staging)];
}

function buildCards(c,a,notes,supp){
 const m=a.main,n=notes||{},u=supp||{},otherSig=a.significant.filter(l=>l!==m),tiny=a.lesions.filter(l=>l.density==='tiny').length;
 const image=m?`主病灶：${m.lobe||'肺叶未定'}${m.segment?'，'+m.segment:''}，最长径 ${m.longestDiameterMm} mm，外接尺寸 ${m.extentMm.join(' × ')} mm，体积 ${Math.round(m.volumeMm3)} mm³，平均 ${m.meanHU} HU，实性成分体积占比 ${pct(m.solidFraction)}%，${m.densityLabel}。${otherSig.length?`其他 ≥6 mm 病灶：${otherSig.map(l=>`${l.lobe||'—'} ${l.longestDiameterMm} mm（${l.densityLabel}）`).join('；')}。`:''}${tiny?`另有 ${tiny} 个 ≤5 mm 小病灶。`:''}`:'无病灶标注。';
 const sphere=a.sphere;
 const margin=m?`主病灶距所在肺叶表面 ${m.distanceToLobeSurfaceMm??'—'} mm（含胸膜面与叶间面）${m.peripheral?'，属外周':''}；距支气管树 ${m.distanceToAirwayMm??'—'} mm${m.nearAirway?'，毗邻支气管分支':''}。${sphere?`术前规划切缘球半径 ${sphere.radiusMm} mm，中心距主病灶 ${sphere.distanceMm.toFixed(1)} mm。`:''}`:'—';
 const stage=`非增强 CT 纵隔窗可评估肺门与纵隔淋巴结。${u.staging?`分期检查：${u.staging}。肿瘤标志物：${u.markers}。`:'PET-CT、纵隔组织学、头颅 MRI 未行。'}`;
 const hasNotes=['age','sex','symptoms','smoking','comorbidity','pft'].some(k=>n[k]),hasSupp=!!u.age;
 const suppKnown=hasSupp?`${u.age} 岁 ${u.sex}，${u.symptoms}；${u.smoking}；合并症：${u.comorbidity}；${u.family}。肺功能：${u.pft}。`:'';
 const notesKnown=hasNotes?['age','sex','symptoms','smoking','comorbidity','pft'].filter(k=>n[k]).map(k=>({age:'年龄',sex:'性别',symptoms:'症状',smoking:'吸烟史',comorbidity:'合并症',pft:'肺功能'})[k]+' '+n[k]).join('；')+'。':'';
 return [
  card('image','影像与病灶',image),
  card('margin','位置与解剖关系',margin),
  card('stage','分期与淋巴结',stage),
  card('function','病史、功能与耐受',hasNotes?notesKnown:hasSupp?suppKnown:'年龄、性别、症状、吸烟史、合并症、肺功能均未采集。'),
 ];
}

function buildCase(c){
 const a=analyseCase(c),m=a.main;
 const item={
  get supplement(){return activeSupplement?.cases?.[c.id]||null;},
  id:c.id,title:c.title,name:`${c.id} · ${c.title}`,short:TIERS[a.tier].short,difficulty:TIERS[a.tier].label,tier:a.tier,analysis:a,features:c,clinical:null,
  subtitle:m?`${m.lobe||'肺叶未定'}${m.segment?' · '+m.segment:''} · 最长径 ${m.longestDiameterMm} mm · ${m.densityLabel}`:'无病灶标注',
  intro:`${TIERS[a.tier].text}${a.multi?` 本例有 ${a.significant.length} 个 ≥6 mm 病灶${a.bilateral?'，分布于双肺':''}，须逐一评估并制定整体策略。`:''}`,
  imaging:{caseId:c.id,title:`${c.id} · ${c.title}`,note:`主病灶位于${m?.lobe||'—'}${m?.segmentCodes?.length?'（'+m.segmentCodes.join(' / ')+'）':''}。`},
  options:[['evaluate','完善评估（既往影像对比、薄层测量、肺功能）','资料不全时的正确下一步。'],['followup','按影像随访方案复查','结合本例持续存在、变化与共同决策；写明复查间隔和触发条件。'],['stage','按本例指征核对分期，制定后续路径','结合已有结果与取材指征，避免重复检查。'],['mdt','提交多学科讨论，确定评估方案与术式条件','适用于评估层级与分期层级。'],['surgery','直接安排手术（楔切／段切／叶切）','不能跳过本例分期、功能、切缘与共同决策条件。']],
  reasons:[['insufficient','决策所需资料不全（既往影像、薄层测量、肺功能、病理／分期），术式讨论条件不成立'],['feature','已按本例影像特征（大小、密度、位置）完成初步分层'],['persistence','首次发现的病灶须先确认持续存在与有无增长'],['followup-plan','已明确本例复查间隔、重新评估的触发条件，并记录患者知情意愿'],['stage','已核对本例分期及取材依据，术式讨论以相应条件成立为前提'],['function','已核对功能储备与相关风险，不据单一指标承诺手术'],...(a.multi?[['multi','多发病灶须逐一评估并制定整体策略']]:[])],
  judge:judgeFactory(()=>item),
  refresh(){const u=this.supplement;this.tests=buildTests(c.id,a,u);this.patient=patientRows(c,a,this.clinical,u);this.cards=buildCards(c,a,this.clinical,u);this.debrief={...DEBRIEF[a.tier](a),...(['CT-008','CT-011'].includes(c.id)?{summary:'本例随访与有条件的手术讨论均可成立：以持续存在、变化、患者意愿和本题资料为依据，不由教学分层标签一票否决。'}:{}),mdt:(u?.mdt||'').replace(/^多学科意见：/,'')||null,outcome:u?.outcome||null,basis:u?.basis||null};return this;},
 };
 return item.refresh();
}

const TIER_ORDER={followup:0,evaluate:1,stage:2};
export const DECISION_CASES=DECISION_FEATURES.cases.map(buildCase).sort((x,y)=>(x.id==='CT-004'?-1:y.id==='CT-004'?1:0)||TIER_ORDER[x.tier]-TIER_ORDER[y.tier]||x.id.localeCompare(y.id));
export const DEFAULT_CASE_ID=DECISION_CASES[0].id;
export const caseById=id=>DECISION_CASES.find(c=>c.id===id);

/** 作者提供的脱敏真实病史（real-cases/clinical-notes.json）。返回填写了资料的病例数。 */
export function applyClinicalNotes(notes){
 let filled=0;
 for(const c of DECISION_CASES){
  const n=notes?.cases?.[c.id];const has=n&&Object.values(n).some(v=>v!=null&&String(v).trim()!=='');
  c.clinical=has?n:null;c.refresh();if(has)filled++;
 }
 return filled;
}

/** 切换标准化教学病历（null = 关闭，只显示影像与三维标注）。 */
export function applyClinicalSupplement(supp){activeSupplement=supp;for(const c of DECISION_CASES)c.refresh();return supp?Object.keys(supp.cases||{}).length:0;}

export function emptyCaseState(){return {opened:[],tests:[],revealed:false,draft:null,choices:[],reflection:'',items:{}};}
/** 每个病例的状态。默认病例（CT-004）沿用 session.caseA（学习报告、教师演示依赖），其余存 session.caseDecisions。 */
export function caseState(session,id){
 if(id===DEFAULT_CASE_ID){
  const a=session.caseA||(session.caseA={opened:[],choices:[]});
  a.opened||=[];a.choices||=[];a.tests||=[];a.revealed||=false;a.reflection||='';a.items||={};
  return a;
 }
 session.caseDecisions||={version:DECISION_VERSION,active:DEFAULT_CASE_ID};
 const s=session.caseDecisions[id]||(session.caseDecisions[id]=emptyCaseState());s.items||={};return s;
}
export function testDisposition(c,t,choice){
 const policy=CASE_PATHS[c.id],required=policy?.required[choice];
 if((required||BASE_REVIEW).includes(t.id))return 'necessary';
 if(!required&&Object.values(policy?.required||{}).some(ids=>ids.includes(t.id)))return 'conditional';
 return t.verdict==='unnecessary'?'unnecessary':'optional';
}
export function testReview(c,picked,choice){
 const necessary=c.tests.filter(t=>testDisposition(c,t,choice)==='necessary'),missed=necessary.filter(t=>!picked.includes(t.id)),unnecessary=c.tests.filter(t=>testDisposition(c,t,choice)==='unnecessary'&&picked.includes(t.id));
 return {necessaryCount:necessary.length,hit:necessary.length-missed.length,missed,unnecessary};
}
export function decisionProgress(session){
 return DECISION_CASES.map(c=>{const s=caseState(session,c.id);const last=s.choices.at(-1);return {id:c.id,title:c.title,short:c.short,tier:c.tier,opened:s.opened.length,cards:c.cards.length,revealed:!!s.revealed,submitted:!!last,reasonable:!!last?.reasonable,completed:!!last?.completed&&last.ruleVersion===DECISION_VERSION};});
}
