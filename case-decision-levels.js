// 病例决策训练 · 分层课程。四关递进（识别 → 应用 → 分析 → 综合）+ 综合考核。
// 每关的病例、任务形式与通关条件不同；题组答案全部由各例影像测量值与标准化教学病历推导，不另设病例。
import {DECISION_CASES,TIERS,DENSITY,caseById,caseState,caseReadiness,DECISION_VERSION} from './case-decision-data.js';

export const LEVELS_VERSION='LEVELS-2026.09.14-2';
const ALL=DECISION_CASES.map(c=>c.id).sort();

export const LEVELS=[
 {id:1,key:'screen',name:'分层判读',stage:'识别',minutes:'5 分钟',goal:'看影像测量值，按分层规则判定密度类型与管理层级。',format:'15 例快速判读，每例两道选择题，判后即时点评。',pass:'15 例全部判对；判错可重判，首次成绩保留。',required:15,cases:ALL},
 {id:2,key:'workup',name:'单发病灶评估',stage:'应用',minutes:'每例 4 分钟',goal:'从病历到检查，测 CTR、定研究人群，再给出下一步。',format:'病历审阅 → 核对资料与检查指征 → 研究人群归类 → 决策与理由 → 复盘与依据。',pass:'至少 3 例决策成立，其中须含 CT-004。',required:3,mustInclude:['CT-004'],cases:['CT-004','CT-007','CT-012','CT-013','CT-005','CT-015','CT-006']},
 {id:3,key:'complex',name:'复杂情境分析',stage:'分析',minutes:'每例 6 分钟',goal:'多发病灶、合并症与共同决策：分清主次、排出顺序、说明前提。',format:'病历审阅 → 核对资料与检查指征 → 情境分析题组 → 决策与理由 → 复盘与依据。',pass:'至少 3 例题组全部答对（可纠正）且决策成立。',required:3,cases:['CT-003','CT-001','CT-002','CT-008','CT-011']},
 {id:4,key:'highrisk',name:'高风险与分期',stage:'综合',minutes:'每例 8 分钟',goal:'有创分期路径、预计术后功能计算、风险分层与最终策略。',format:'病历审阅 → 核对资料与检查指征 → 分期与功能题组（含计算）→ 决策与理由 → 复盘与依据。',pass:'3 例全部完成。',required:3,cases:['CT-010','CT-009','CT-014']},
];
export const EXAM={id:'exam',name:'综合考核',stage:'考核',minutes:'15 分钟',goal:'独立作答，提交后统一评分并给出解析。',format:'12 题：分层判读 4 题、研究人群 3 题、情境分析 3 题、分期与功能 2 题。',pass:'12 题答对 ≥9 题，且 2 道关键题全对。',passScore:9};
export const levelById=id=>LEVELS.find(l=>l.id===Number(id))||null;
export const levelOfCase=id=>LEVELS.find(l=>l.id!==1&&l.cases.includes(id))||null;

/* ---------- 第 1 关 · 分层规则 ---------- */
export const DENSITY_RULE='实性成分体积占比 ≥80% 为实性为主，≤20% 为磨玻璃为主，其间为混合密度；最长径 <5 mm 或体素过少者为微小病灶，不作密度分层。';
export const SCREEN_RULES=[
 {density:'磨玻璃为主',followup:'<15 mm',evaluate:'≥15 mm',stage:'—'},
 {density:'混合密度',followup:'<8 mm',evaluate:'8–30 mm',stage:'>30 mm'},
 {density:'实性为主',followup:'<8 mm',evaluate:'8–19 mm',stage:'≥20 mm'},
 {density:'微小病灶',followup:'薄层复核',evaluate:'—',stage:'—'},
];
export const DENSITY_OPTIONS=['ggo','partsolid','solid','tiny'].map(id=>[id,DENSITY[id].replace('（不作密度分层）','')]);
export const TIER_OPTIONS=['followup','evaluate','stage'].map(id=>[id,TIERS[id].label]);
/** 与 analyseCase 完全相同的分层规则，可用于任一病灶。 */
export function tierForLesion(l){
 const d=l.longestDiameterMm;
 if(l.density==='tiny')return {tier:'followup',reason:'病灶过小，2 mm 序列不能可靠评估密度，须薄层复核。'};
 if(l.density==='ggo')return d>=15?{tier:'evaluate',reason:`磨玻璃为主，最长径 ${d} mm ≥15 mm，须薄层评估有无实性成分。`}:{tier:'followup',reason:`磨玻璃为主，最长径 ${d} mm。`};
 if(l.density==='partsolid')return d>30?{tier:'stage',reason:`混合密度且最长径 ${d} mm >30 mm。`}:d>=8?{tier:'evaluate',reason:`混合密度，最长径 ${d} mm ≥8 mm，实性成分须薄层测量。`}:{tier:'followup',reason:`混合密度，最长径 ${d} mm <8 mm。`};
 return d>=20?{tier:'stage',reason:`实性为主且最长径 ${d} mm ≥20 mm。`}:d>=8?{tier:'evaluate',reason:`实性为主，最长径 ${d} mm ≥8 mm。`}:{tier:'followup',reason:`实性为主，最长径 ${d} mm <8 mm。`};
}
const pct=x=>Math.round((x||0)*100);
export function lesionFacts(l,c){
 return [['部位',`${l.lobe||'肺叶未定'}${l.segment?' · '+l.segment:''}`],['最长径',`${l.longestDiameterMm} mm`],['外接尺寸',`${l.extentMm.join(' × ')} mm`],['体积',`${Math.round(l.volumeMm3)} mm³`],['平均密度',`${l.meanHU} HU`],['实性成分体积占比',`${pct(l.solidFraction)}%`],['距肺叶表面',`${l.distanceToLobeSurfaceMm??'—'} mm`],['距支气管树',`${l.distanceToAirwayMm??'—'} mm`],...(c?[['其他 ≥6 mm 病灶',c.analysis.significant.filter(x=>x!==l).length?`${c.analysis.significant.filter(x=>x!==l).length} 个`:'无']]:[])];
}
export function screenItem(caseId){
 const c=caseById(caseId),m=c.analysis.main,t=tierForLesion(m);
 return {caseId,title:c.name,lesion:m,facts:lesionFacts(m,c),answer:{density:m.density,tier:t.tier},reason:t.reason,densityLabel:m.densityLabel,tierLabel:TIERS[t.tier].label};
}
export function screenState(session){session.caseDecisions||={};return session.caseDecisions.screening||(session.caseDecisions.screening={});}
export function answerScreen(session,caseId,pick,now=new Date().toISOString()){
 const item=screenItem(caseId),st=screenState(session),s=st[caseId]||(st[caseId]={first:null,attempts:0,passed:false,last:null});
 const densityOk=pick.density===item.answer.density,tierOk=pick.tier===item.answer.tier,correct=densityOk&&tierOk;
 const rec={density:pick.density,tier:pick.tier,correct,time:now};if(!s.first)s.first=rec;s.attempts++;s.last=rec;s.passed=s.passed||correct;
 return {correct,densityOk,tierOk,first:s.attempts===1,item};
}

/* ---------- 通用题目模型：single / multi / number / order ---------- */
const opt=(id,text)=>({id,text});
export function gradeItem(item,response){
 if(response==null)return false;
 if(item.type==='single')return response===item.answer;
 if(item.type==='multi'){const a=[...item.answer].sort().join('|'),r=Array.isArray(response)?[...response].sort().join('|'):'';return a===r;}
 if(item.type==='order')return Array.isArray(response)&&response.join('|')===item.answer.join('|');
 if(item.type==='number'){const v=Number(response);return Number.isFinite(v)&&Math.abs(v-item.answer)<=(item.tolerance??0);}
 return false;
}
export function answerText(item,response){
 if(response==null||response==='')return '未作答';
 if(item.type==='number')return `${response}${item.unit||''}`;
 const name=id=>item.options.find(o=>o.id===id)?.text||id;
 if(item.type==='single')return name(response);
 if(Array.isArray(response))return response.map(name).join(item.type==='order'?' → ':'；')||'未作答';
 return String(response);
}
export const correctText=item=>answerText(item,item.answer);

/* ---------- 第 2 关 · 研究人群归类 ---------- */
export const POPULATIONS=[
 opt('JCOG0804','JCOG0804 / WJOG4507L 人群：≤2 cm 且 CTR ≤0.25 —— 亚肺叶切除（楔切为主）'),
 opt('JCOG1211','JCOG1211 人群：≤2 cm 且 0.25 < CTR ≤0.5，或 2–3 cm 且 CTR ≤0.5 —— 解剖性肺段切除'),
 opt('JCOG0802','JCOG0802 / CALGB 140503 人群：≤2 cm 且 CTR >0.5 —— 段切 vs 叶切随机比较；CALGB 须术中淋巴结阴性'),
 opt('NONE','不属于亚肺叶研究人群：>3 cm，或 >2 cm 且 CTR >0.5 —— 标准为肺叶切除 + 系统性淋巴结清扫'),
 opt('FOLLOWUP','不进入手术研究人群：随访层级，先确认持续存在，按结节类型复查'),
];
export function populationOf(sizeMm,ctr,tier){
 if(tier==='followup')return 'FOLLOWUP';
 if(sizeMm<=20)return ctr<=0.25?'JCOG0804':ctr<=0.5?'JCOG1211':'JCOG0802';
 if(sizeMm<=30&&ctr<=0.5)return 'JCOG1211';
 return 'NONE';
}
const POP_NOTE={
 'CT-013':'本例虽属 JCOG0804 人群，但病灶距肺叶表面 15 mm，楔切难以取得足够切缘，多学科建议 S6 段切除：人群决定可讨论的范围，切缘决定实际术式。',
 'CT-006':'2–3 cm 且 CTR ≤0.5 属 JCOG1211 人群；病灶毗邻 B2 支气管，段切须三维规划切缘。',
 'CT-004':'≤2 cm 且 CTR >0.5 属实性为主人群：JCOG0802 比较段切与叶切；术中冰冻与切缘决定最终范围。',
 'CT-015':'总径 19 mm、CTR 0.26 刚超过 0.25，属 JCOG1211 人群而非 JCOG0804；CTR 的分界要在薄层上测准。',
 'CT-005':'总径 17 mm、CTR 0.18 属 JCOG0804 人群，病灶距肺叶表面 4 mm，楔切与段切均可讨论。',
 'CT-007':'11 mm 纯磨玻璃、首次发现且 3 个月无变化：随访层级，不进入手术研究人群讨论。',
 'CT-012':'10 mm 磨玻璃为主、3 个月无变化：随访层级；一级亲属肺癌史提高风险等级，但不改变随访策略。',
};
const solidText=m=>m.solidMm<=0?'无实性成分':m.solidMm<2?'实性成分 <2 mm':`实性成分最大径 ${m.solidMm} mm`;
export function workupItems(c){
 const m=c.supplement?.measure;if(!m)return [];
 const tier=c.tier,ctrBand=m.ctr<=0.25?'c1':m.ctr<=0.5?'c2':'c3',sizeBand=m.sizeMm<=20?'s1':m.sizeMm<=30?'s2':'s3',pop=populationOf(m.sizeMm,m.ctr,tier);
 return [
  {id:'size',type:'single',stem:`薄层 CT 测得主病灶总径 ${m.sizeMm} mm。按研究人群的尺寸分档，本例属于？`,options:[opt('s1','≤2 cm'),opt('s2','2–3 cm'),opt('s3','>3 cm')],answer:sizeBand,explanation:'JCOG0804、JCOG0802 与 CALGB 140503 的上限为 2 cm；JCOG1211 的上限为 3 cm；>3 cm 不属于亚肺叶研究人群。'},
  {id:'ctr',type:'single',stem:`薄层 CT：总径 ${m.sizeMm} mm，${solidText(m)}。CTR（实性成分最大径 ÷ 病灶最大径）属于哪一区间？`,options:[opt('c1','≤0.25（含无实性成分）'),opt('c2','0.25–0.5'),opt('c3','>0.5')],answer:ctrBand,explanation:`CTR ≈ ${m.ctr}。CTR 在薄层上按最大径之比测量，2 mm 序列上的实性成分体积占比（${pct(c.analysis.main.solidFraction)}%）不能代替。`},
  {id:'population',type:'single',stem:'结合本例层级与上述测量，本例对应的研究人群与可讨论的切除范围是？',options:POPULATIONS,answer:pop,explanation:(POP_NOTE[c.id]||'')+' 研究人群只界定可讨论的范围；术式在病理、分期、功能与切缘明确后由多学科讨论确定。'},
 ];
}

/* ---------- 第 3 关 · 情境分析题组 ---------- */
const COMPLEX_ITEMS={
 'CT-001':[
  {id:'nature',type:'single',stem:'双肺多发磨玻璃结节，主病灶 2 年内由 12 mm 增至 17.6 mm 并出现实性成分，其余病灶稳定。首先考虑的病变性质？',options:[opt('a','多原发肺腺癌谱系，各病灶独立评估'),opt('b','单一原发灶伴肺内转移，按 IV 期处理'),opt('c','炎性病变，抗炎治疗后复查')],answer:'a',explanation:'多发磨玻璃结节多为多原发腺癌谱系；转移灶多呈实性而非磨玻璃；不能按 IV 期放弃局部治疗。'},
  {id:'strategy',type:'multi',stem:'本例整体策略中成立的做法（多选）：',options:[opt('a','主病灶先处理（LS9 段切除，术中冰冻）'),opt('b','同侧可及的另一病灶同期楔切'),opt('c','对侧病灶按各自类型随访'),opt('d','对侧病灶同期双侧手术'),opt('e','所有病灶先逐一穿刺取得病理再决定')],answer:['a','b','c'],explanation:'主病灶优先、同侧可及者同期处理、对侧按类型随访；同期双侧手术与逐一穿刺小磨玻璃灶都不成立。'},
  {id:'diabetes',type:'single',stem:'2 型糖尿病 8 年，二甲双胍治疗，HbA1c 6.8%。对手术的意义？',options:[opt('a','血糖控制达标，围手术期监测与调整即可'),opt('b','属手术禁忌'),opt('c','须推迟至 HbA1c <6.0% 再手术')],answer:'a',explanation:'HbA1c 6.8% 为可接受的围手术期水平；糖尿病是风险因素而非禁忌。'},
 ],
 'CT-002':[
  {id:'growth',type:'single',stem:'左上叶舌段纯磨玻璃结节 3 年由 14 mm 缓慢增至 19.4 mm，体积倍增时间 >800 天。生长特征提示？',options:[opt('a','惰性生长，符合贴壁为主／微浸润腺癌谱系；持续增大者仍须处理'),opt('b','快速进展，须急诊手术'),opt('c','良性病变，可停止随访')],answer:'a',explanation:'体积倍增时间 >400 天的纯磨玻璃结节多为惰性，但持续增大是处理指征。'},
  {id:'population',type:'single',stem:'总径 19 mm、实性成分 <2 mm 的持续增大纯磨玻璃结节，对应哪一研究人群？',options:[opt('a','JCOG0804（≤2 cm，CTR ≤0.25）：楔切为主；位于舌段可行舌段切除'),opt('b','JCOG0802（≤2 cm，CTR >0.5）'),opt('c','CALGB 140503（术中淋巴结阴性的亚肺叶 vs 叶切）'),opt('d','不属于任何研究人群')],answer:'a',explanation:'CTR ≤0.25 且 ≤2 cm 属 JCOG0804 人群，楔切为主；舌段位置可行舌段切除。'},
  {id:'others',type:'multi',stem:'其余多发小磨玻璃灶（≤7 mm）的处理，成立的是（多选）：',options:[opt('a','按各自类型随访'),opt('b','不因主病灶手术而同期切除所有小灶'),opt('c','全部同期楔切'),opt('d','按转移灶处理')],answer:['a','b'],explanation:'小磨玻璃灶按各自类型随访；同期全部切除或按转移处理都不成立。'},
 ],
 'CT-003':[
  {id:'solid',type:'single',stem:'右下叶背段磨玻璃结节 14 个月内新出现约 4 mm 实性成分（9 mm → 11.1 mm）。意义？',options:[opt('a','提示浸润进展，是干预信号'),opt('b','属测量误差范围内的波动'),opt('c','炎性改变，抗炎后复查')],answer:'a',explanation:'新出现实性成分是磨玻璃结节进展的关键信号，是干预指征。'},
  {id:'antiplatelet',type:'order',stem:'冠心病，3 年前前降支支架置入，长期服氯吡格雷。按顺序排出围手术期抗血小板管理：',options:[opt('a','心内科会诊，评估支架与停药风险'),opt('b','按会诊意见术前停氯吡格雷（本例 5 天）'),opt('c','手术'),opt('d','术后按会诊意见恢复抗血小板')],answer:['a','b','c','d'],explanation:'先会诊评估，再按意见停药，手术后按意见恢复；不能自行停药或不停药手术。'},
  {id:'biopsy',type:'single',stem:'本例为何未行经皮穿刺活检？',options:[opt('a','抗血小板治疗期间出血风险增加，且拟术中冰冻明确'),opt('b','病灶太大不宜穿刺'),opt('c','穿刺对混合磨玻璃结节没有价值')],answer:'a',explanation:'抗血小板治疗下穿刺出血风险增加；术中冰冻可明确病理，不必术前穿刺。'},
 ],
 'CT-008':[
  {id:'paths',type:'single',stem:'55 岁男，左上叶 21 mm 纯磨玻璃结节，首次发现，3 个月复查无变化。成立的路径？',options:[opt('a','继续 6–12 个月随访，或手术；与患者共同决策'),opt('b','只能手术'),opt('c','只能随访')],answer:'a',explanation:'>2 cm 持续存在的纯磨玻璃结节，随访与手术都成立，由共同决策确定。'},
  {id:'sdm',type:'multi',stem:'共同决策时应向患者说明的内容（多选）：',options:[opt('a','纯磨玻璃结节多为惰性，随访安全窗较宽'),opt('b','>2 cm 或增大时可考虑手术，术式按 CTR 与位置讨论'),opt('c','两条路径都须写明复查间隔与重新评估的触发条件'),opt('d','随访等于放弃治疗'),opt('e','不立即手术就会转移')],answer:['a','b','c'],explanation:'共同决策要说明惰性生长、两条路径的前提与触发条件；恐吓式表述不成立。'},
  {id:'population',type:'single',stem:'总径 21 mm、实性成分 <2 mm，选择手术时对应哪一研究人群？',options:[opt('a','JCOG0804（≤2 cm，CTR ≤0.25）'),opt('b','JCOG1211（2–3 cm 且 CTR ≤0.5）：解剖性肺段切除'),opt('c','JCOG0802（≤2 cm，CTR >0.5）')],answer:'b',explanation:'JCOG0804 的上限是 2 cm；21 mm 已超过，2–3 cm 且 CTR ≤0.5 属 JCOG1211 人群，术式为解剖性肺段切除。'},
 ],
 'CT-011':[
  {id:'paths',type:'single',stem:'44 岁女，无风险因素，右下叶 15 mm 磨玻璃为主结节，3 个月复查无变化。合理的做法？',options:[opt('a','共同决策：6 个月薄层随访或手术均成立'),opt('b','必须手术'),opt('c','无需再复查')],answer:'a',explanation:'年轻、无风险因素、持续存在的 15 mm 磨玻璃为主结节，随访与手术都成立。'},
  {id:'plan',type:'multi',stem:'选择随访时，随访方案须包含（多选）：',options:[opt('a','复查间隔（6 个月薄层 CT）'),opt('b','重新评估的触发条件（出现实性成分、增大）'),opt('c','患者知情并记录'),opt('d','每年一次 PET-CT'),opt('e','每 3 个月穿刺一次')],answer:['a','b','c'],explanation:'随访方案 = 间隔 + 触发条件 + 知情记录；PET 与反复穿刺对磨玻璃结节无价值。'},
  {id:'pet',type:'single',stem:'本例 PET：主病灶 SUVmax 1.3。意义？',options:[opt('a','磨玻璃为主结节 PET 摄取低，不能排除腺癌谱系'),opt('b','已排除恶性'),opt('c','提示远处转移')],answer:'a',explanation:'磨玻璃为主病灶 PET 敏感性低，低摄取不能排除贴壁为主的腺癌。'},
 ],
};

/* ---------- 第 4 关 · 分期与功能题组 ---------- */
const ppo=(pctValue,segments)=>Math.round(pctValue*(1-segments/19));
function riskTier(v){return v>=60?'low':v>=40?'mid':'high';}
const RISK_OPTIONS=[opt('low','低风险（≥60%）'),opt('mid','中等风险（40–59%），须 CPET 分层'),opt('high','高风险（<40%），CPET 必需，须考虑替代方案')];
function functionItems(c){
 const m=c.supplement?.measure;if(!m)return [];
 const f=ppo(m.fev1Pct,m.lobeSegments),d=ppo(m.dlcoPct,m.lobeSegments),low=Math.min(f,d),lobe=c.analysis.main.lobe;
 return [
  {id:'ppofev1',type:'number',unit:'%',tolerance:2,stem:`FEV₁ ${m.fev1Pct}% 预计，拟行${lobe}切除（${lobe}含 ${m.lobeSegments} 个肺段，全肺按 19 段计）。按段数法，ppoFEV₁ ≈ ？%（取整）`,answer:f,explanation:`ppoFEV₁ = ${m.fev1Pct}% × (1 − ${m.lobeSegments}/19) ≈ ${f}%。`},
  {id:'ppodlco',type:'number',unit:'%',tolerance:2,stem:`DLCO ${m.dlcoPct}% 预计。按段数法，ppoDLCO ≈ ？%（取整）`,answer:d,explanation:`ppoDLCO = ${m.dlcoPct}% × (1 − ${m.lobeSegments}/19) ≈ ${d}%。DLCO 须单独测量，正常 FEV₁ 不能代替。`},
  {id:'risk',type:'single',stem:`按 ppoFEV₁ 与 ppoDLCO 中较低者（${low}%）分层，本例属于？`,options:RISK_OPTIONS,answer:riskTier(low),explanation:'ERS/ESTS 2025：≥60% 低风险；40–59% 中等风险，须 CPET 分层；<40% 高风险，CPET 必需并考虑替代方案。'},
 ];
}
const HIGHRISK_ITEMS={
 'CT-009':c=>[
  {id:'staging',type:'multi',stem:'右上叶 30 mm 中央型病灶，PET：10R 淋巴结 SUVmax 3.5、4R SUVmax 2.1。本例有创纵隔分期的指征（多选）：',options:[opt('a','中央型病灶'),opt('b','原发灶 ≥3 cm'),opt('c','PET 提示 N1（10R）'),opt('d','4R 短径 9 mm 但有摄取，须组织学证实'),opt('e','无指征，可直接手术')],answer:['a','b','c','d'],explanation:'中央型、≥3 cm、N1 可疑、PET 阳性淋巴结均为有创分期指征；EBUS/EUS 为首选途径。'},
  {id:'nstage',type:'single',stem:'EBUS-TBNA：10R 见腺癌细胞，4R、7 组阴性。分期含义？',options:[opt('a','N1，纵隔阴性，仍可考虑根治性手术'),opt('b','N2，不宜手术'),opt('c','N0，无需淋巴结清扫')],answer:'a',explanation:'10R 为肺门（N1）淋巴结；纵隔（4R、7）阴性，根治性手术仍可讨论，术中须系统性清扫。'},
  ...functionItems(c),
  {id:'final',type:'single',stem:'综合以上：下一步策略？',options:[opt('a','CPET 分层（VO₂peak >15 排除高危）后行右上叶切除 + 系统性淋巴结清扫；术前戒烟与肺康复'),opt('b','不做 CPET，直接肺叶切除'),opt('c','段切保留功能'),opt('d','视 N1 为不可手术，改放化疗')],answer:'a',critical:true,explanation:'中等风险须 CPET 分层；中央型、CTR 0.73、N1 不属亚肺叶人群，段切不成立；N1 不是手术禁忌。'},
 ],
 'CT-010':c=>[
  {id:'staging',type:'multi',stem:'右下叶 26 mm 混合密度病灶 + 同侧 3 处 6–10 mm 磨玻璃灶，PET 第 7 组淋巴结 8 mm、SUVmax 1.9。分期路径中成立的（多选）：',options:[opt('a','主病灶经皮穿刺取得病理'),opt('b','EBUS 评估 4R、7 组'),opt('c','头颅 MRI'),opt('d','同侧 3 处小磨玻璃灶逐一穿刺'),opt('e','肿瘤标志物升高可代替病理')],answer:['a','b','c'],explanation:'主病灶取材、纵隔组织学与头颅 MRI 成立；小磨玻璃灶穿刺阳性率低，标志物不能代替病理。'},
  {id:'multi',type:'single',stem:'主病灶穿刺为浸润性腺癌，同侧另 3 处磨玻璃灶 SUVmax 1.0–1.8。分期理解？',options:[opt('a','多原发可能大，按主病灶分期，其余同期处理或随访'),opt('b','肺内转移，M1a'),opt('c','无法手术')],answer:'a',explanation:'同侧多发磨玻璃灶多为多原发；按主病灶分期，其余病灶术中处理或随访。'},
  ...functionItems(c),
  {id:'final',type:'single',stem:'综合以上：下一步策略？',options:[opt('a','CPET 分层、戒烟与肺康复 4 周后决定切除范围（右下叶切除，或按功能保留讨论段切）+ 系统性淋巴结清扫'),opt('b','不做 CPET，直接右下叶切除'),opt('c','只做楔切'),opt('d','放弃手术，改放化疗')],answer:'a',critical:true,explanation:'中等风险须 CPET；戒烟与肺康复可改善耐受；切除范围由功能与切缘共同决定。'},
 ],
 'CT-014':c=>[
  {id:'n2',type:'single',stem:'左上叶 40 mm 鳞癌，5、6 组淋巴结 PET 阳性（短径 12 mm），EBUS 不可及，4L、7 组阴性。如何明确 N2？',options:[opt('a','胸腔镜（或前纵隔切开）活检 5、6 组'),opt('b','PET 阳性即视为 N2，直接放化疗'),opt('c','忽略 5、6 组，直接手术')],answer:'a',explanation:'5、6 组（主动脉旁、主动脉下）EBUS 不可及；PET 阳性不等于病理阳性，须手术活检证实。'},
  ...functionItems(c),
  {id:'cpet',type:'single',stem:'CPET：VO₂peak 11 mL·min⁻¹·kg⁻¹。意义？',options:[opt('a','≤12，落入高危：肺叶切除风险不可接受'),opt('b','正常，可行肺叶切除'),opt('c','须重复肺功能后再定')],answer:'a',explanation:'VO₂peak ≤12 为高危（>15 排除高危）；高风险层级须考虑替代方案。'},
  {id:'final',type:'single',stem:'胸腔镜活检：5、6 组鳞癌转移（N2 证实）。综合以上：最终策略？',options:[opt('a','不适合肺叶切除；根治性同步放化疗，后续免疫巩固，转肿瘤科随诊'),opt('b','强行肺叶切除'),opt('c','楔切保留功能'),opt('d','单纯随访')],answer:'a',critical:true,explanation:'N2 证实 + 高风险功能层级 + CPET 高危：手术不成立；根治性放化疗为标准方案。楔切对 4 cm 鳞癌无肿瘤学意义。'},
 ],
};

export function levelItems(c,level){
 if(!level||level.id===1)return [];
 if(level.id===2)return workupItems(c);
 if(level.id===3)return COMPLEX_ITEMS[c.id]||[];
 if(level.id===4)return HIGHRISK_ITEMS[c.id]?.(c)||[];
 return [];
}
export const LEVEL_STEP={2:{title:'研究人群归类',hint:'按薄层测量归类：先分尺寸档，再算 CTR，最后定研究人群。'},3:{title:'情境分析',hint:'多发病灶、合并症与共同决策各有前提；逐题作答，答错可纠正，首次作答保留。'},4:{title:'分期与功能',hint:'先定分期路径，再按段数法计算预计术后功能并分层，最后给出策略。'}};

/* ---------- 题目作答状态（每例）---------- */
export function itemState(session,caseId,itemId){const s=caseState(session,caseId);s.items||={};return s.items[itemId]||(s.items[itemId]={first:null,attempts:0,correct:false,response:null});}
export function answerItem(session,caseId,item,response,now=new Date().toISOString()){
 const st=itemState(session,caseId,item.id),correct=gradeItem(item,response);
 const rec={response:structuredClone(response),correct,time:now,ruleVersion:LEVELS_VERSION};if(!st.first)st.first=rec;st.attempts++;st.response=response;st.correct=correct;st.ruleVersion=LEVELS_VERSION;
 return {correct,first:st.attempts===1};
}
export function itemsDone(session,c,level){const items=levelItems(c,level);return items.length>0&&items.every(it=>caseState(session,c.id).items?.[it.id]?.correct&&caseState(session,c.id).items[it.id].ruleVersion===LEVELS_VERSION);}
export function caseComplete(session,c,level){
 const last=caseState(session,c.id).choices.at(-1);
 return !!last?.completed&&last.ruleVersion===DECISION_VERSION&&last.levelVersion===LEVELS_VERSION&&last.level===level.id;
}
export function submitCaseDecision(session,c,level,choice,reasons,now=new Date().toISOString()){
 const state=caseState(session,c.id),verdict=c.judge(state,choice,reasons),ready=caseReadiness(c,state,choice),groupDone=itemsDone(session,c,level);
 const completed=!!verdict.completeEligible&&ready.ready&&groupDone;
 const entry={choice,reasons:[...reasons],reasonable:verdict.reasonable,completeEligible:!!verdict.completeEligible,completed,phase:completed?'complete':'pending',ruleVersion:DECISION_VERSION,levelVersion:LEVELS_VERSION,level:level.id,time:now,evidence:{opened:[...state.opened],testReview:structuredClone(state.testReview||null),required:[...ready.required],items:levelItems(c,level).map(it=>({id:it.id,correct:!!state.items[it.id]?.correct,ruleVersion:state.items[it.id]?.ruleVersion||null}))}};
 state.choices.push(entry);
 return {entry,verdict:{...verdict,text:verdict.text+(!completed&&verdict.completeEligible?' 本关题组尚未全部通过；通过后请再次提交方案。':''),completed}};
}
export function levelStatus(session,level){
 if(level.id===1){
  const st=screenState(session),judged=level.cases.filter(id=>st[id]?.first),done=level.cases.filter(id=>st[id]?.passed);
  return {id:1,total:level.cases.length,done:done.length,judged:judged.length,firstCorrect:judged.filter(id=>st[id].first.correct).length,required:level.required,passed:done.length>=level.cases.length,started:judged.length>0};
 }
 const cases=level.cases.map(caseById).filter(Boolean),done=cases.filter(c=>caseComplete(session,c,level)),started=cases.some(c=>caseState(session,c.id).opened.length||caseState(session,c.id).choices.length);
 const must=(level.mustInclude||[]).every(id=>done.some(c=>c.id===id));
 return {id:level.id,total:cases.length,done:done.length,required:level.required,passed:done.length>=level.required&&must,started,missingMust:!must};
}
export const allLevelsPassed=session=>LEVELS.every(l=>levelStatus(session,l).passed);
export const examUnlocked=session=>session.kind==='demo'||allLevelsPassed(session);

/* ---------- 综合考核（12 题，固定卷）---------- */
function screenExamItem(id,caseId,index){
 const c=caseById(caseId),l=c.analysis.lesions[index],t=tierForLesion(l);
 return {id,dim:'screen',case:caseId,type:'single',stem:`${c.name}，${l.lobe||'肺叶未定'}${l.segment?'（'+l.segment+'）':''}病灶：最长径 ${l.longestDiameterMm} mm，平均 ${l.meanHU} HU，实性成分体积占比 ${pct(l.solidFraction)}%。按分层规则应归入？`,options:TIER_OPTIONS.map(([v,t])=>opt(v,t)),answer:t.tier,explanation:`${l.densityLabel}；${t.reason}`};
}
function popExamItem(id,caseId){
 const c=caseById(caseId),m=c.supplement?.measure||{sizeMm:0,solidMm:0,ctr:0};
 return {id,dim:'workup',case:caseId,type:'single',stem:`${c.name}，薄层 CT：总径 ${m.sizeMm} mm，${solidText(m)}，${TIERS[c.tier].label}。对应的研究人群？`,options:POPULATIONS,answer:populationOf(m.sizeMm,m.ctr,c.tier),explanation:`CTR ≈ ${m.ctr}。${POP_NOTE[caseId]||''}`.trim()};
}
export function buildExam(){
 return [
  screenExamItem('ex01','CT-015',1),screenExamItem('ex02','CT-013',1),screenExamItem('ex03','CT-010',2),screenExamItem('ex04','CT-012',1),
  popExamItem('ex05','CT-002'),popExamItem('ex06','CT-001'),popExamItem('ex07','CT-009'),
  {id:'ex08',dim:'complex',case:'CT-003',type:'single',critical:true,stem:'CT-003：冠脉支架置入 3 年，长期服氯吡格雷，拟行 S6 段切除。术前抗血小板处理？',options:[opt('a','心内科会诊后按意见调整（本例停药 5 天），术后按意见恢复'),opt('b','自行停药 2 周'),opt('c','不停药直接手术'),opt('d','因抗血小板治疗放弃手术')],answer:'a',explanation:'支架患者的抗血小板调整由心内科评估决定；自行停药或不停药手术都不成立。'},
  {id:'ex09',dim:'complex',case:'CT-001',type:'single',stem:'CT-001：双肺多发磨玻璃结节，主病灶增大并出现实性成分，其余稳定。对侧病灶的处理？',options:[opt('a','按各自类型随访'),opt('b','同期双侧手术'),opt('c','全部穿刺取得病理'),opt('d','按 IV 期放弃局部治疗')],answer:'a',explanation:'多原发腺癌谱系：主病灶优先，对侧按各自类型随访。'},
  {id:'ex10',dim:'complex',case:'CT-011',type:'single',stem:'CT-011：15 mm 磨玻璃为主结节，共同决策后选择随访。随访方案必须写明？',options:[opt('a','复查间隔与重新评估的触发条件'),opt('b','每年一次 PET-CT'),opt('c','每 3 个月穿刺一次'),opt('d','无需记录')],answer:'a',explanation:'随访是决策，须写明间隔与触发条件并记录知情。'},
  {id:'ex11',dim:'highrisk',case:'CT-014',type:'number',unit:'%',tolerance:2,stem:'CT-014：DLCO 49% 预计，拟左上叶切除（5/19 段）。按段数法 ppoDLCO ≈ ？%（取整）',answer:ppo(49,5),explanation:`ppoDLCO = 49% × (1 − 5/19) ≈ ${ppo(49,5)}%，<40% 为高风险层级。`},
  {id:'ex12',dim:'highrisk',case:'CT-009',type:'single',critical:true,stem:'CT-009：中央型腺癌 30 mm，EBUS 10R 阳性（N1）、4R 与 7 组阴性，ppoFEV₁ 56%、ppoDLCO 51%。下一步？',options:[opt('a','CPET 分层后决定右上叶切除 + 系统性淋巴结清扫'),opt('b','直接段切保留功能'),opt('c','视 N1 为不可手术，改放化疗'),opt('d','不做 CPET，直接肺叶切除')],answer:'a',explanation:'中等风险须 CPET；中央型 N1 不属亚肺叶人群；N1 不是手术禁忌。'},
 ];
}
export const EXAM_ITEMS=buildExam();
export const EXAM_DIMS=[['screen','分层判读'],['workup','研究人群'],['complex','情境分析'],['highrisk','分期与功能']];
export function examState(session){session.caseDecisions||={};return session.caseDecisions.exam||(session.caseDecisions.exam={attempts:[],current:null});}
export function startExam(session,now=new Date().toISOString()){const ex=examState(session);if(ex.current)return ex.current;ex.current={started:now,responses:{},formVersion:LEVELS_VERSION,kind:ex.attempts.length?'correction':'first-response'};return ex.current;}
export function gradeExam(responses){
 const items=EXAM_ITEMS.map(it=>({id:it.id,dim:it.dim,critical:!!it.critical,correct:gradeItem(it,responses[it.id])}));
 const dims=Object.fromEntries(EXAM_DIMS.map(([d,name])=>{const qs=items.filter(i=>i.dim===d);return [d,{name,correct:qs.filter(i=>i.correct).length,total:qs.length}];}));
 const critical=items.filter(i=>i.critical),score=items.filter(i=>i.correct).length;
 return {score,total:items.length,dims,criticalCorrect:critical.filter(i=>i.correct).length,criticalCount:critical.length,passed:score>=EXAM.passScore&&critical.every(i=>i.correct),items};
}
export function submitExam(session,now=new Date().toISOString()){
 const ex=examState(session);if(!ex.current)throw new Error('考核未开始');
 if(EXAM_ITEMS.some(it=>ex.current.responses[it.id]==null||ex.current.responses[it.id]===''))throw new Error('请先完成全部题目');
 const attempt={...ex.current,submitted:now,result:gradeExam(ex.current.responses)};ex.attempts.push(attempt);ex.current=null;return attempt;
}
export function examSummary(session){const ex=session.caseDecisions?.exam;const first=ex?.attempts?.[0]||null,latest=ex?.attempts?.at(-1)||null;return {first,latest,attempts:ex?.attempts?.length||0,inProgress:!!ex?.current};}
