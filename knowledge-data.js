import {SKILLS} from './assessment-data.js';

export const KNOWLEDGE_VERSION='KNOWLEDGE-2026.09.15-2';
const nodes=[
 ['orientation-side','orientation','患者侧别识读','读懂方向标记，建立观察起点。',560,95],
 ['orientation-space','orientation','多平面空间核对','把同一空间位置放回不同平面核对。',560,245],
 ['segment-name','segment','肺叶肺段命名','建立肺叶、肺段与命名之间的联系。',860,185],
 ['segment-trace','segment','肺段连续定位','沿连续影像追踪，解释定位依据。',800,330],
 ['vessels-mechanism','vessels','灌注与静脉回流','理解不同血管通路的功能。',995,475],
 ['vessels-preserve','vessels','余肺血管保护','把目标结构与保留对象一起核对。',805,475],
 ['airway-route','airway','支气管通路追踪','从分支连续性理解气道归属。',860,755],
 ['airway-protect','airway','余肺通气保护','将气道辨识与保留肺通气联系起来。',800,610],
 ['safety-confirm','safety','核查与术野辨识','在操作前明确目标、保护对象与核查环节。',560,690],
 ['safety-response','safety','出血应对与升级','梳理风险出现后的应对与团队协作。',560,845],
 ['staging-tissue','staging','分期证据辨别','区分资料所能支持的判断与仍需核实的内容。',260,755],
 ['staging-systematic','staging','系统分期覆盖','从范围与质量两个角度核对分期。',320,610],
 ['fitness-diffusion','fitness','通气与弥散评估','区分不同功能指标所回答的问题。',125,475],
 ['fitness-risk','fitness','预计术后功能','联系当前功能与预计术后状态。',315,475],
 ['decision-conditions','decision','切除方案条件','把位置、分期与功能条件放在一起讨论。',320,330],
 ['decision-evidence','decision','研究证据适用','逐项核对证据的适用条件。',260,185],
];
export const KNOWLEDGE_NODES=nodes.map(([id,skill,title,description,x,y])=>({id,skill,title,description,x,y,color:SKILLS.find(s=>s.id===skill).color}));
const familyToNode={
 'orientation-side':'orientation-side','orientation-mpr':'orientation-space',
 'segment-name':'segment-name','segment-trace':'segment-trace',
 'vessel-mechanism':'vessels-mechanism','vein-preserve':'vessels-preserve',
 'airway-route':'airway-route','airway-protect':'airway-protect',
 'decision-conditions':'decision-conditions','decision-evidence':'decision-evidence',
 'fitness-diffusion':'fitness-diffusion','fitness-risk':'fitness-risk',
 'staging-tissue':'staging-tissue','staging-systematic':'staging-systematic',
 'safety-identify':'safety-confirm','safety-checklist':'safety-confirm','safety-visual':'safety-confirm','safety-bleeding':'safety-response',
};
export const nodeForQuestion=q=>q.family?.startsWith('real-segment-')?'segment-trace':familyToNode[q.family]||null;
// One existing question per node. Shared/exposed items remain revision evidence.
export const DIAGNOSTIC_IDS=['orientation-6','orientation-5','segment-1','ct-CT-002','vessels-6','vessels-5','airway-6','airway-5','safety-6','safety-2','staging-5','staging-6','fitness-5','fitness-6','decision-6','decision-5'];
// These edges describe a suggested learning sequence, not diagnostic causality.
export const KNOWLEDGE_EDGES=[
 ['orientation-side','orientation-space'],['orientation-side','segment-name'],
 ['orientation-space','segment-trace'],['segment-name','segment-trace'],['airway-route','segment-trace'],
 ['airway-route','airway-protect'],['vessels-mechanism','vessels-preserve'],['segment-trace','vessels-preserve'],
 ['segment-trace','decision-conditions'],['fitness-diffusion','fitness-risk'],['fitness-risk','decision-conditions'],
 ['staging-tissue','staging-systematic'],['staging-systematic','decision-evidence'],['decision-conditions','decision-evidence'],
 ['orientation-side','safety-confirm'],['vessels-preserve','safety-confirm'],['airway-protect','safety-confirm'],['safety-confirm','safety-response'],
].map(([from,to])=>({from,to}));

export function prerequisitePath(id){
 const found=new Set();
 const visit=target=>{for(const edge of KNOWLEDGE_EDGES.filter(e=>e.to===target))if(!found.has(edge.from)){found.add(edge.from);visit(edge.from);}};
 visit(id);return [...found];
}
