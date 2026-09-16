import {fullSegmentName} from './segment-course-data.js';
import {attachClinicalVisuals} from './assessment-visuals.js';
export const BANK_VERSION='ASSESS-2026.09.13-1';
export const EVIDENCE_DATE='2026-09-13';
export const REFERENCES={
 staging:{year:2026,title:'ERS / ESGE / ESTS：肺癌诊断与分期的支气管及食管内镜超声指南',url:'https://publications.ersnet.org/lookup/doi/10.1183/13993003.00097-2026',note:'纵隔组织分期、系统性取样和联合途径；用于分期情境题。'},
 fitness:{year:2025,title:'ERS / ESTS：肺癌根治性治疗适应能力评估指南',url:'https://publications.ersnet.org/content/erj/66/5/2500156',note:'DLCO、预计术后功能和综合风险评估；风险分层不等于自动决定术式。'},
 segment:{year:2023,title:'ESTS：原发性肺癌肺段切除技术标准专家共识',url:'https://pubmed.ncbi.nlm.nih.gov/37267148/',note:'影像规划、结构变异与解剖性切除的质量要求。'},
 trial:{year:2023,title:'CALGB 140503：外周 IA 期非小细胞肺癌肺叶与亚肺叶切除随机试验',url:'https://pubmed.ncbi.nlm.nih.gov/36780674/',note:'保留研究入组和淋巴结阴性条件，不能仅凭结节直径外推。'},
 vein:{year:2025,title:'右中叶静脉汇合变异的三维重建研究',url:'https://pubmed.ncbi.nlm.nih.gov/40692133/',note:'中叶静脉汇合存在个体差异；保护保留肺的回流。'},
 bleeding:{year:2019,title:'VATS 肺手术出血处理国际专家共识',url:'https://pubmed.ncbi.nlm.nih.gov/32042728/',note:'暂停危险动作、控制出血、团队求助与必要时升级处理。'},
 who:{year:2009,title:'WHO：手术安全核查表实施手册',url:'https://www.who.int/publications/i/item/9789241598590',note:'麻醉前、切皮前和离室前的团队核查；本题为原创教学改编。'},
 anatomy:{year:2023,title:'NCBI Bookshelf · Anatomy, Thorax, Bronchial',url:'https://www.ncbi.nlm.nih.gov/sites/books/NBK537353/',note:'支气管树、肺叶肺段及常见变异的解剖教程。'},
 physiology:{year:2025,title:'NCBI Bookshelf · Histology, Lung',url:'https://www.ncbi.nlm.nih.gov/books/NBK534789/',note:'肺循环、气体交换与肺段结构的基础教程。'},
 dicom:{year:2026,title:'DICOM PS3.18：患者方向与 MPR 视图',url:'https://dicom.nema.org/medical/dicom/current/output/chtml/part18/sect_8.3.5.3.4.html',note:'方向标签表达患者坐标；旋转显示不改变患者侧别。'},
 cases:{year:2026,title:'本站 15 例真实 CT 与原有肺段源标注',url:'./index.html',note:'定位题逐例绑定 CT 和源标注的校验值；题点避开源标签重叠区。'},
 field:{year:2026,title:'本站真实术野教学录像与定位资料',url:'./or-field.html',note:'沿用已整理的公开教学术野及定位区；不同片段不声称属于同一患者。'}
};
export const SKILLS=[
 {id:'orientation',name:'影像方向',short:'方向',color:'#9bbaf9',goal:'先确认患者方向，再在连续层面中定位。',lesson:['R / L 表示患者的右 / 左，不表示看图者的手。','常规轴位按从足侧向头侧观察；切换到冠状位、矢状位后重新读取方向标记。','同一个空间点在三个平面中的投影不同，核对坐标和连续性再命名。'],source:['dicom'],link:'./index.html'},
 {id:'segment',name:'肺段与连续追踪',short:'肺段',color:'#b6a3ed',goal:'结合肺叶归属和分支走行，辨认肺段。',lesson:['先定左右与肺叶，再沿段支气管由近端向外周追踪。','右上叶 S1、S2、S3 分别为尖、后、前段；左侧可使用 S1+2 合并命名。','单层灰阶和重建颜色都不能独立定义段界；回到多平面影像核对。'],source:['anatomy','segment'],link:'./index.html'},
 {id:'vessels',name:'血管与余肺保护',short:'血管',color:'#f49fae',goal:'区分灌注与回流，识别必须保留的血管。',lesson:['肺动脉通向肺毛细血管床；肺静脉承担返回左心房的通路。','上叶切除时先逐例辨认中叶静脉汇入路径，避免把保留肺的回流一并处理。','开放损伤、误闭静脉和误闭动脉是三种不同机制，反馈不能都写成出血。'],source:['vein','physiology'],link:'./or-field.html'},
 {id:'airway',name:'支气管与通气',short:'气道',color:'#e5c791',goal:'区分目标支气管与余肺通气路径。',lesson:['右上叶支气管与中间支气管是不同的辨认对象。','中间支气管继续通向中叶和下叶；保护范围必须包括余肺。','结构未清楚或保留肺膨胀异常时，应暂停并由团队复核气道及相关原因。'],source:['anatomy'],link:'./safety-training.html?route=training'},
 {id:'decision',name:'切除范围与证据',short:'决策',color:'#8cd5c4',goal:'识别资料缺口，不把研究结论变成自动处方。',lesson:['病灶大小只是信息之一，还需诊断、分期、位置、切缘与功能条件。','CALGB 140503 的结论有外周小肿瘤和病理确认淋巴结阴性等适用条件。','把“可讨论段切”与“已决定段切”分开；结合完整资料和患者偏好讨论。'],source:['trial','segment'],link:'./safety-training.html?route=cases'},
 {id:'fitness',name:'术前功能评估',short:'功能',color:'#8ecbea',goal:'区分通气、弥散与预计术后功能。',lesson:['2025 年指南推荐在拟肺癌手术评估中测量 DLCO，正常 FEV₁ 不能替代它。','ppoDLCO 是预计术后弥散能力；指南将 ≥60%、40–59%、<40% 分为不同风险层级。','风险信息需与心血管情况、运动能力及患者整体状态合并解读。'],source:['fitness'],link:null},
 {id:'staging',name:'淋巴结与分期',short:'分期',color:'#a7c795',goal:'区分影像怀疑、组织证据和系统性分期。',lesson:['2026 年指南更新了内镜超声在诊断和纵隔分期中的作用。','有纵隔组织分期指征时，内镜超声是重要的首选路径；按团队方案系统评估。','仅取一个最显眼结节不等于完成系统分期；联合 EBUS / EUS 的覆盖范围互补。'],source:['staging'],link:null},
 {id:'safety',name:'术野与安全应对',short:'安全',color:'#eead7c',goal:'识别停止点，把团队核查放在危险动作之前。',lesson:['先确认患者、侧别、术式和必要影像；每个成员都可提出疑虑。','器械进入术野不等于可以击发：确认目标、闭合路径和周围保留结构。','重大出血时停止危险操作，尽快控制并同步呼叫团队；必要时升级处理。'],source:['who','bleeding'],link:'./or-field.html'}
];
const option=(text,feedback,error)=>({text,feedback,error});
const make=(id,skill,stem,options,answer,explanation,extra={})=>({id,skill,stem,type:'single',level:2,family:id.replace(/-\d+$/,''),options:options.map((o,i)=>({id:String(i),...(typeof o==='string'?{text:o}:o)})),answer:Array.isArray(answer)?answer.map(String):String(answer),explanation,source:SKILLS.find(s=>s.id===skill).source,hint:SKILLS.find(s=>s.id===skill).lesson[0],...extra});
const ct=(caseId='CT-001')=>({kind:'ct',caseId,point:null,plane:'axial'});
const frame=(name,caption='公开教学术野 · 观察当前帧')=>({kind:'frame',src:`./or-field/clean/frames/${name}.jpg`,caption});
const facts=(rows)=>({kind:'facts',rows});
export const CONCEPT_QUESTIONS=[
 make('orientation-1','orientation','当前轴位图中，R 标记所在的一侧代表谁的右侧？',[
  option('患者的右侧','方向字母以患者为参照。'),option('观察者的右侧','把看图者的左右代入了患者坐标。','观察者与患者左右混淆'),option('固定表示屏幕右侧','屏幕位置可以改变，标签指向患者。','只记屏幕位置'),option('肿瘤所在侧','侧别标记与病灶位置无关。','方向与病灶混淆')],0,'先读 R / L，再按患者坐标描述位置。', {visual:ct(),family:'orientation-side',level:1}),
 make('orientation-2','orientation','从轴位切换到冠状位后，可靠的定位步骤是什么？',[
  option('先重新读取方向标记，再沿连续层面核对','换平面后重新建立坐标。'),option('把屏幕上方继续当作前方','冠状位上方通常是头侧，不能沿用轴位方位。','跨平面方向混淆'),option('沿用上一张图的像素位置','像素位置不代表同一三维点。','像素与空间点混淆'),option('按颜色推断方位','伪彩色不能代替方向信息。','颜色替代解剖')],0,'平面变换改变投影，患者空间坐标保持一致。',{visual:ct('CT-006'),family:'orientation-mpr'}),
 make('orientation-3','orientation','常规胸部轴位按从足侧向头侧观察。屏幕左方带 R 标记的肺是？',[
  option('右肺','应按患者的右侧回答。'),option('左肺','这是常见的镜像理解错误。','观察者与患者左右混淆'),option('不能根据 R 判断','R 本身就是患者右侧标记。','忽略方向标签'),option('取决于病灶大小','病灶不改变侧别。','方向与病灶混淆')],0,'在回答肺叶、肺段之前，先按方向标记核对患者侧别。',{visual:ct('CT-009'),family:'orientation-side',level:1}),
 make('orientation-4','orientation','在两个平面找到同一结构，需要核对哪些信息？（多选）',[
  option('患者方向和当前平面','先建立患者坐标。'),option('结构在连续层面中的延续','避免把邻近分支当成同一结构。'),option('同一患者、同一套影像的空间位置','来源一致是对照的基础。'),option('只比较两图上颜色是否相同','颜色是显示设置，不能证明空间对应。','颜色替代解剖')],['0','1','2'],'同源对应要同时核对来源、方向与连续性。',{type:'multi',visual:ct('CT-012'),family:'orientation-mpr'}),
 make('segment-1','segment','右上叶 S2 的规范名称是？',[
  option('后段','S2 对应右上叶后段。'),option('尖段','尖段是 S1。','S1与S2混淆'),option('前段','前段是 S3。','S2与S3混淆'),option('背段','通常所称背段为下叶 S6。','上叶后段与下叶背段混淆')],0,'编号必须和侧别、肺叶一起读。',{visual:facts([['侧别','右'],['肺叶','上叶'],['肺段编号','S2']]),family:'segment-name',level:1}),
 make('segment-2','segment','要从 CT 确认肺段，哪一组线索更完整？',[
  option('肺叶归属、段支气管走行和多平面对照','这是连续追踪的基本路径。'),option('只取一张横断面的轮廓','单层可能无法区分邻近肺段。','单层猜段'),option('只读三维模型的颜色','颜色不能替代解剖核对。','颜色替代解剖'),option('把所有源标签空白都视作没有肺段','资料缺项不等于解剖缺失。','源资料缺项误判')],0,'先确定肺叶，再沿分支追踪，最后用多个层面确认。',{visual:facts([['观察任务','连续追踪'],['资料','同一病例 CT'],['目标','肺段归属']]),family:'segment-trace'}),
 make('segment-3','segment','左上叶 S1+2 的合并名称是？',[
  option('尖后段','左侧常用 S1+2 合并命名。'),option('上舌段','上舌段为 S4。','上区与舌段混淆'),option('前基底段','基底段属于下叶。','上下叶混淆'),option('外侧段','不能把右中叶命名直接套到左上叶。','左右命名混用')],0,'左侧合并命名应明确写出 S1+2，不能把目录条目数当成所有人的固定解剖。',{visual:facts([['侧别','左'],['肺叶','上叶'],['肺段编号','S1+2']]),family:'segment-name',level:1}),
 make('segment-4','segment','请排列影像中辨认肺段的学习步骤。',[
 '核对患者方向与肺叶归属','追踪叶支气管到段支气管','在连续层面及其他平面核对','结合血管关系解释定位依据'],['0','1','2','3'],'这是本课采用的观察顺序，不是规定手术操作顺序。',{type:'order',visual:facts([['任务','从整体到分支'],['起点','患者坐标'],['终点','解释肺段定位']]),family:'segment-trace'}),
 make('vessels-1','vessels','拟行右上叶切除。已识别上叶静脉，下一步还必须关注什么？',[
  option('中叶静脉的汇入路径和保留','目标正确之外还需保护余肺回流。'),option('将汇入同一静脉干的分支全部处理','汇合不表示都属于切除范围。','保护对象遗漏'),option('只确认血管颜色','颜色不能定义回流区域。','颜色替代解剖'),option('中叶保留时不需要看静脉','保留肺仍需完整回流。','忽略余肺回流')],0,'中叶静脉汇合有变异，必须逐例追踪它服务的肺组织。',{critical:true,visual:facts([['拟切除','右上叶'],['拟保留','右中叶、右下叶'],['已完成','上叶静脉辨认']]),family:'vein-preserve'}),
 make('vessels-2','vessels','某保留肺区域的静脉被误闭，但没有开放性血管破口。最直接的机制是？',[
  option('回流受阻、淤血风险','闭塞影响静脉回流。'),option('必然立即向胸腔喷血','没有开放破口，不能把闭塞等同开放出血。','误闭与开放损伤混淆'),option('支气管腔机械性堵塞','静脉不是通气管道。','血管与气道混淆'),option('该区域灌注一定增加且安全','回流障碍不是安全的增益。','忽略回流障碍')],0,'区分管壁破裂与管腔闭塞，才能解释不同后果。',{critical:true,visual:facts([['受影响通路','静脉'],['管壁破口','无'],['动作','误闭']]),family:'vessel-mechanism'}),
 make('vessels-3','vessels','三维显示一支静脉跨近水平裂走向上方，术野尚未看清其汇入。合理判断是？',[
  option('结合患者 CT 和术野确认它是否承担中叶回流','先明确来源、走行和服务区域。'),option('跨裂就证明没有保留价值','跨裂分支可能与保留肺回流有关。','保护对象遗漏'),option('用常见模板直接确定归属','模板不能覆盖个体变异。','模板替代个体解剖'),option('只凭术式名称处理','术式名称不能代替逐支辨认。','术式替代解剖')],0,'结构走向异常时，回到同一患者影像追踪；不要把一种模式套用给每例。',{critical:true,visual:frame('s02_y_vessel','真实术野用于观察分支形态；本题为独立假设情境'),family:'vein-preserve'}),
 make('vessels-4','vessels','误闭供应保留肺区域的肺动脉分支，最直接影响哪一环节？',[
  option('该区域的肺动脉灌注','肺动脉为肺毛细血管床输送血流。'),option('该区域气道的管腔口径','这是气道层面的机制。','灌注与通气混淆'),option('仅影响体表感觉','与题目血流通路不符。','忽略血流通路'),option('等同于静脉回流被阻断','动脉与静脉作用不同。','灌注与回流混淆')],0,'动脉灌注、静脉回流和支气管通气需要分别判断。',{critical:true,visual:facts([['拟保留','下游肺组织'],['受影响通路','肺动脉分支'],['动作','误闭']]),family:'vessel-mechanism'}),
 make('airway-1','airway','右上叶支气管开口远端的中间支气管主要继续通向哪里？',[
  option('右中叶和右下叶','两叶的通气路径需要保留。'),option('只通向右上叶','混淆了上叶分支与中间支气管。','上叶与中间支气管混淆'),option('左上叶和左下叶','这是左右支气管树混淆。','左右气道混淆'),option('只通向胸膜腔','正常气道不直接开口于胸膜腔。','气道路径混淆')],0,'沿右主支气管逐级追踪，区分上叶分出与继续向下的通路。',{visual:facts([['起点','右主支气管'],['已分出','右上叶支气管'],['继续向下','中间支气管']]),family:'airway-route',level:1}),
 make('airway-2','airway','右上叶切除前，目标与保留气道应如何双重确认？（多选）',[
  option('明确右上叶支气管为目标','先确认目标身份。'),option('确认中间支气管及余肺通气路径不受累','同时确认保留对象。'),option('看清闭合路径与邻近组织关系','避免牵入邻近结构。'),option('只要肺静脉已处理，就可跳过气道辨认','血管处理不能证明气道归属。','跳过气道复核')],['0','1','2'],'目标正确和保留通路安全必须同时成立。',{type:'multi',critical:true,visual:frame('s03_stapler_ready','真实器械术野作为观察背景；不以本帧命名支气管'),family:'airway-protect'}),
 make('airway-3','airway','如果把中间支气管误当作右上叶支气管处理，首先需担心的余肺问题是？',[
  option('右中、下叶通气受限','中间支气管是两叶的上游通气路径。'),option('仅左上叶无法通气','侧别与通路不符。','左右气道混淆'),option('只会发生静脉淤血','没有区分气道与静脉机制。','通气与回流混淆'),option('余肺通气完全不受影响','忽略了被误处理的上游气道。','保护对象遗漏')],0,'从结构服务区域解释损伤后果，比只记管道名称更可靠。',{critical:true,visual:facts([['误处理','中间支气管'],['需要保护','右中叶、右下叶'],['检查维度','通气']]),family:'airway-route'}),
 make('airway-4','airway','处理目标气道后发现保留肺膨胀异常。哪种响应更合理？',[
  option('暂停推进，由外科和麻醉团队共同复核气道及相关原因','先重新评价，再决定下一步。'),option('直接把异常都解释为正常现象','异常需要核查，不能忽略。','忽略异常信号'),option('仅凭膨胀异常就断言某支气管已被切断','一个现象可能有多种原因。','单一现象过度诊断'),option('未复核就继续处理下一条结构','尚未解决余肺通气疑问。','未复核继续操作')],0,'异常信号触发复核，并不自动给出唯一病因。',{critical:true,visual:facts([['时点','目标气道处理后'],['观察','保留肺膨胀异常'],['待完成','原因复核']]),family:'airway-protect'}),
 make('decision-1','decision','教学病例：外周 1.6 cm 混合磨玻璃结节，仅有这一信息。现在能确定唯一切除范围吗？',[
  option('不能，需要补足诊断、分期、影像和功能条件','当前信息不足以确定唯一术式。'),option('≤2 cm 一律楔切','把直径变成了自动指征。','仅凭尺寸定术式'),option('混合磨玻璃一律叶切','忽略其他影像和临床条件。','仅凭密度定术式'),option('只要能重建就一律段切','重建是规划工具，不是手术指征。','工具替代适应证')],0,'先明确资料是否足够，再讨论可行方案和取舍。',{visual:facts([['直径','1.6 cm'],['表现','混合磨玻璃'],['分期 / 功能','尚缺']]),family:'decision-conditions'}),
 make('decision-2','decision','解释 CALGB 140503 的亚肺叶切除结论时，哪些条件不能丢？（多选）',[
  option('外周、肿瘤大小 ≤2 cm 的研究人群','这是研究适用条件之一。'),option('病理确认的肺门及纵隔淋巴结阴性','不能把未完成分期的病例直接等同试验人群。'),option('完整的个体治疗评估','试验结论需放回患者具体条件。'),option('所有肺结节，不论位置与分期','过度扩大研究结论。','研究结论过度外推')],['0','1','2'],'研究结果支持的是有条件的讨论，不是“一律选择某术式”。',{type:'multi',visual:facts([['研究','CALGB 140503'],['问题','亚肺叶与肺叶切除'],['任务','保留适用条件']]),family:'decision-evidence'}),
 make('decision-3','decision','病灶位于右上叶后段，学生写“所以已经确定 S2 段切”。这一步推理遗漏了什么？',[
  option('切缘可行性、分期、功能与整体方案的条件判断','位置定位不等于治疗方案已定。'),option('肺段编号必须换成罗马数字','编号形式不是主要问题。','忽略治疗条件'),option('三维颜色必须更鲜艳','显示颜色不决定术式。','显示效果替代决策'),option('只差一张漂亮的截图','图片数量不补足临床证据。','图像替代证据')],0,'“位于某段”回答位置，“能否段切”还需要其他证据。',{visual:facts([['位置','右上叶 S2'],['已知','可完成空间定位'],['问题','是否已能确定术式']]),family:'decision-conditions'}),
 make('decision-4','decision','学生说“研究证明亚肺叶切除不劣，因此所有早期患者都应亚肺叶切除”。主要错误是？',[
  option('把特定入组条件下的比较外推到所有个体','研究人群和当前病例需逐项匹配。'),option('随机试验完全不能参考','研究仍可支持符合条件的讨论。','否定有效证据'),option('必须只参考模型颜色','颜色不是临床证据。','工具替代证据'),option('只要术者偏好即可忽略资料','还需患者条件、偏好和团队评估。','忽略个体评估')],0,'正确使用证据需要同时说清结论、适用人群和当前资料缺口。',{visual:facts([['论断','把研究结论直接推广'],['待核对','人群与分期'],['任务','识别外推错误']]),family:'decision-evidence'}),
 make('fitness-1','fitness','拟评估肺癌手术的教学病例：FEV₁ 为预计值 86%，尚未测 DLCO。下一步合理的是？',[
  option('补充 DLCO 等完整功能评估','正常 FEV₁ 不能替代弥散能力评价。'),option('FEV₁ 正常即可跳过 DLCO','通气和弥散是不同维度。','FEV1替代DLCO'),option('直接宣布不能手术','没有依据做出这种结论。','资料缺口当作禁忌'),option('只看年龄决定','年龄不能代替全面评估。','年龄替代功能')],0,'2025 ERS / ESTS 指南推荐在拟手术评估中测量术前 DLCO。',{visual:facts([['FEV₁ / 预计值','86%'],['DLCO','未测'],['用途','术前功能评估']]),family:'fitness-diffusion'}),
 make('fitness-2','fitness','教学病例 ppoDLCO 为 52%。按 2025 指南给出的风险分层，应如何解读？',[
  option('位于 40–59% 层级，结合其他因素继续评估','属于该指标的中等风险层级。'),option('可以单凭它承诺零风险','风险指标不提供零风险保证。','单指标保证安全'),option('自动判为所有治疗的绝对禁忌','分层不能替代个体治疗决策。','分层当作绝对禁忌'),option('等同术前 DLCO 为 52%','ppo 表示预计术后值。','术前与预计术后混淆')],0,'ppoDLCO 的分层用于风险评估，不是自动选择或排除治疗的按钮。',{visual:facts([['指标','ppoDLCO'],['预计值百分比','52%'],['阶段','预计术后']]),family:'fitness-risk'}),
 make('fitness-3','fitness','FEV₁ 与 DLCO 的关系，哪项正确？',[
  option('反映不同功能维度，需要结合解读','FEV₁ 偏重通气，DLCO 用于弥散能力评价。'),option('两者完全同义','两种指标并不等价。','FEV1替代DLCO'),option('DLCO 就是病灶直径','把功能指标和影像尺寸混淆。','功能与尺寸混淆'),option('只要 FEV₁ 高，DLCO 一定高','不能从一个值自动推断另一个。','单指标推断全部功能')],0,'功能评估要避免“一项正常，全部安全”的推理。',{visual:facts([['FEV₁','通气相关指标'],['DLCO','弥散相关指标'],['任务','判断能否相互替代']]),family:'fitness-diffusion',level:1}),
 make('fitness-4','fitness','高龄教学病例进入根治性治疗评估。哪些资料应综合考虑？（多选）',[
  option('肺功能及预计术后功能','评估治疗后的功能储备。'),option('心血管情况、运动能力和整体状态','考虑多维风险。'),option('患者价值取向与治疗偏好','参与共同决策。'),option('仅以年龄数字直接排除所有根治治疗','不能用年龄替代个体评价。','年龄替代功能')],['0','1','2'],'采用整体评估，避免将单个指标变成自动结论。',{type:'multi',visual:facts([['对象','高龄教学病例'],['任务','根治性治疗评估'],['目标','综合风险与获益']]),family:'fitness-risk'}),
 make('staging-1','staging','有纵隔淋巴结组织分期指征的疑似非小细胞肺癌病例，2026 指南支持哪类初始取材途径？',[
  option('内镜超声途径，按适应证采用 EBUS 或联合 EUS','指南将内镜超声置于重要的首选分期路径。'),option('只凭 PET 亮度宣布病理阳性','影像怀疑不等于组织证实。','影像等同病理'),option('只凭结节小就取消分期','分期指征不能由直径一项取消。','尺寸替代分期'),option('跳过分期直接固定术式','治疗规划需要可靠分期。','跳过分期')],0,'先明确分期指征，再由专业团队规划取材；影像和病理不能互换。',{visual:facts([['疾病背景','疑似非小细胞肺癌'],['当前条件','有纵隔组织分期指征'],['任务','选择评估路径']]),family:'staging-tissue'}),
 make('staging-2','staging','只对 PET-CT 上最显眼的一个淋巴结取样，能否等同系统性纵隔分期？',[
  option('不能，需要按系统性分期方案评估相关区域','单一目标取样可能遗漏其他区域。'),option('能，最亮的一定代表全部','一个部位不能代表其他部位。','单站取样等同系统分期'),option('能，内镜超声从不漏诊','任何方法都有适用条件和局限。','检查绝对化'),option('能，只要样本瓶足够大','容器大小与系统覆盖无关。','样本数量替代覆盖')],0,'2026 指南强调系统性评估，避免只追着单个可疑目标取样。',{visual:facts([['影像','多个区域需要评估'],['已取样','一个最显眼的结节'],['问题','系统性是否完成']]),family:'staging-systematic'}),
 make('staging-3','staging','PET-CT 提示纵隔淋巴结可疑。下列结论哪项最稳妥？',[
  option('提示需要进一步分期评估，不能直接等同病理证实','区分怀疑和证实。'),option('已经得到淋巴结病理结果','影像不是组织标本。','影像等同病理'),option('可疑说明一定良性','没有依据排除恶性。','忽略可疑信息'),option('无需考虑取材质量','取材质量影响结果解释。','忽略取材质量')],0,'分期的证据层级应写清楚：影像所见与组织学结果属于不同信息。',{visual:facts([['检查','PET-CT'],['描述','纵隔结节可疑'],['组织结果','尚无']]),family:'staging-tissue'}),
 make('staging-4','staging','为什么在适当病例中讨论 EBUS 与 EUS 联合途径？',[
  option('两种路径的可及区域互补，可改善分期覆盖','联合途径的价值是覆盖与诊断质量。'),option('两者能替代所有病理分析','获得组织后仍需相应病理分析。','取材替代病理'),option('联合后即可承诺完全没有漏诊','不能把检查绝对化。','检查绝对化'),option('只为增加检查次数','应按临床问题和可及区域选择。','忽略检查目的')],0,'2026 指南支持考虑联合途径；系统性 EBUS 也是可接受的方案，需结合团队条件。',{visual:facts([['途径一','经气道 EBUS'],['途径二','经食管 EUS'],['比较维度','覆盖区域']]),family:'staging-systematic'}),
 make('safety-1','safety','真实术野出现尚未明确归属的灰白管状结构，此时应怎样处理？',[
  option('暂停危险动作，进一步显露并核对身份','先辨认再处理。'),option('按颜色当作粘连带直接切断','颜色和外观不足以排除管道。','未辨认直接处理'),option('默认是支气管并立即夹闭','画面不足以确认这一身份。','外观直接命名'),option('只凭预计手术顺序判断','顺序不能替代当前结构辨认。','术式替代解剖')],0,'当前画面支持“需要辨认”，不支持直接给它指定分支编号。',{critical:true,visual:frame('s01_white_tube'),family:'safety-identify'}),
 make('safety-2','safety','发生明显血管出血、视野受影响时，哪些原则正确？（多选）',[
  option('停止可能扩大损伤的操作','避免盲目操作扩大损伤。'),option('由手术团队采取有效的出血控制措施','控制与评估需协同进行。'),option('同步求助，并评估是否需要升级处理','必要时转换入路是安全决策。'),option('为保持微创外观坚持盲目夹闭','不能让入路偏好凌驾于安全。','盲目操作与延迟升级')],['0','1','2'],'出血控制与团队沟通常需同时进行；本题考察安全原则，不模拟具体器械止血技术。',{type:'multi',critical:true,visual:facts([['事件','血管出血'],['视野','受影响'],['任务','安全应对']]),family:'safety-bleeding'}),
 make('safety-3','safety','缝合器已进入肺门，击发前还要确认什么？（多选）',[
  option('闭合线内为已确认的目标组织','器械位置不是身份确认。'),option('周围需要保留的组织不在闭合路径中','避免夹带。'),option('远近端及相关通路已看清、团队完成确认','确认后再执行。'),option('只需确认金属表面足够明亮','反光不表示组织已安全闭合。','器械反光替代确认')],['0','1','2'],'看清闭合路径与保护对象后再进行不可逆动作。',{type:'multi',critical:true,visual:frame('s03_stapler_jaws'),family:'safety-identify'}),
 make('safety-4','safety','为控制重大出血，团队决定转换入路。对这一决定的正确理解是？',[
  option('这是基于控制出血和患者安全的升级策略','转换本身不等于技术失败。'),option('为了比赛演示应始终避免转换','展示效果不能决定临床安全行动。','展示目标压过安全'),option('先盲目继续，直到无法控制才求助','拖延可能扩大风险。','延迟求助'),option('只要转换就说明先前所有判断都正确','转换不替代对事件原因的复核。','行动替代原因复核')],0,'安全升级取决于出血控制和团队判断，不能由“必须完成微创”的预设限制。',{critical:true,visual:facts([['事件','重大出血'],['团队决定','转换入路'],['核心目标','有效控制与患者安全']]),family:'safety-bleeding'}),
 make('safety-5','safety','请按 WHO 核查框架排列三个团队核查时点。',[
 '麻醉诱导前','皮肤切开前','患者离开手术室前'],['0','1','2'],'三个时点均有各自的核查目标，不能留到最后统一补签。',{type:'order',visual:facts([['框架','WHO 手术安全核查'],['对象','整个手术团队'],['任务','时点排序']]),family:'safety-checklist',source:['who'],level:1}),
 make('safety-6','safety','术前发现申请单侧别与当前展示影像不一致。此时合理的是？',[
  option('暂停并核实患者、侧别与影像来源','先解决身份与侧别不一致。'),option('按更清晰的一张图继续','清晰度不能解决身份冲突。','图像外观替代身份核查'),option('多数人认为是哪侧就用哪侧','人数不能替代核查。','共识替代证据'),option('先切开再核对','应在危险动作前消除疑问。','延迟核查')],0,'必要影像应在术前核对并可供团队查看。',{critical:true,visual:facts([['申请单','右侧'],['展示资料','侧别存在冲突'],['时点','切皮前']]),family:'safety-checklist',source:['who']}),
];
const EXTENSION_QUESTIONS=[
 make('orientation-5','orientation','两例 CT 都停在第 70 层，就一定是在同一解剖高度吗？',[
  option('不一定，应结合各自方向、层间位置与解剖标志核对','层号是各自序列中的索引。'),option('一定，层号就是全身统一坐标','把序列索引当成患者空间位置。','层号与空间坐标混淆'),option('只要画面宽度相同就一定对应','显示尺寸不能证明解剖高度相同。','屏幕尺寸替代空间位置'),option('只要两者都是肺窗就一定对应','调窗不能决定层面位置。','调窗与定位混淆')],0,'跨病例对应不能只比较层号；先核对空间信息，再寻找同类解剖标志。',{level:3,family:'orientation-mpr',visual:facts([['病例甲','第 70 层'],['病例乙','第 70 层'],['空间信息','两套独立影像']])}),
 make('orientation-6','orientation','观察者旋转了显示视图，患者的 R / L 侧别会跟着改名吗？',[
  option('不会；观察角度变化后仍须按患者方向标记描述','改变的是观察位置，不是患者左右。'),option('会；屏幕右侧永远改叫 R','把显示方向当成患者侧别。','观察者与患者左右混淆'),option('只要放大就可以忽略方向','缩放与方向识别是不同操作。','缩放替代方向核对'),option('以鼠标所在位置重新定义左右','鼠标不是患者坐标参照。','交互位置替代患者坐标')],0,'描述解剖侧别时始终以患者为参照；换视角后先重新读方向标记。',{transferOnly:true,level:3,family:'orientation-side',visual:ct('CT-013')}),
 make('vessels-5','vessels','同一颜色的两条血管分别通向拟切除肺和保留肺。可以因为同色而一起处理吗？',[
  option('不能；必须分别追踪来源、走行和服务区域','伪彩色用于观察，不等于处理范围。'),option('可以，颜色相同代表功能相同且可同时切除','同类血管也可能服务不同肺组织。','颜色替代解剖'),option('只要其中一条辨认正确即可','另一条仍需要确认。','保护对象遗漏'),option('只看哪一条更靠近屏幕中心','屏幕位置不能决定归属。','屏幕位置替代血管归属')],0,'处理目标和保留通路是两项独立确认，不能用视觉相似性合并。',{level:3,critical:true,family:'vein-preserve',visual:facts([['分支甲','通向拟切除区域'],['分支乙','通向拟保留区域'],['三维显示','同一颜色']])}),
 make('vessels-6','vessels','教学情境：保留肺的动脉和支气管均通畅，但其主要静脉回流被误闭。仍有风险吗？',[
  option('有；入口和气道通畅不能补偿静脉回流受阻','三条通路都需要独立检查。'),option('没有；动脉通就说明一切正常','忽略了流出通路。','灌注正常替代回流评估'),option('只有支气管断裂才有风险','血管通路也影响保留肺。','忽略血管风险'),option('肯定是胸腔开放出血','题目给的是管腔误闭，没有开放破口信息。','误闭与开放损伤混淆')],0,'保留肺安全不能由单一路径正常推出；静脉误闭仍会损害回流。',{transferOnly:true,level:3,critical:true,family:'vessel-mechanism',visual:facts([['肺动脉','通畅'],['支气管','通畅'],['肺静脉','回流误闭']])}),
 make('airway-5','airway','右上叶支气管目标已确认，但学生没有指出中间支气管的位置。能完成安全双确认吗？',[
  option('不能；还须明确保留中、下叶的通气通路','目标确认不替代保护对象确认。'),option('能；只要知道目标名字就足够','遗漏了保留对象。','保护对象遗漏'),option('能；由已完成的血管步骤自动推断','血管辨认不证明气道安全。','跳过气道复核'),option('只需提高操作速度','速度不能解决解剖疑问。','速度替代核查')],0,'用“目标是谁、余肺如何通气”两个问题检查推理是否完整。',{level:3,critical:true,family:'airway-protect',visual:facts([['目标气道','已辨认'],['中间支气管','尚未指出'],['拟保留','右中、下叶']])}),
 make('airway-6','airway','沿右侧气道追踪时，上叶分支已分出，主通路继续向下。为什么不能把继续向下的通路当成上叶专属？',[
  option('它还通向中叶与下叶，需要结合下游分支确认','应以分支连续性解释服务区域。'),option('任何向下的结构都属于上叶','走向描述与归属判断混淆。','上叶与中间支气管混淆'),option('因为所有支气管只通向一个肺段','叶与段的分支层级被混淆。','气道层级混淆'),option('灰白色足以说明归属','外观不能替代连续追踪。','外观直接命名')],0,'沿分支树由近到远核对，明确中间支气管对中、下叶的意义。',{transferOnly:true,level:3,family:'airway-route',visual:facts([['已看到','上叶支气管分出'],['继续追踪','向尾侧的通路'],['任务','判断下游服务区域']])}),
 make('decision-5','decision','外周 1.8 cm 病灶，功能储备可接受，但淋巴结状态未明确。可直接宣布符合 CALGB 140503 的全部条件吗？',[
  option('不能；需要补足淋巴结及其他适用条件','部分符合不等于全部符合。'),option('可以，只看尺寸 ≤2 cm','遗漏了关键入组条件。','仅凭尺寸定术式'),option('功能良好能替代肿瘤分期','功能评估和肿瘤分期不能互换。','功能替代分期'),option('有三维重建即可确认淋巴结阴性','三维图不提供病理结果。','重建替代病理')],0,'逐项匹配研究适用条件，不把缺失资料默认为正常。',{level:3,family:'decision-evidence',visual:facts([['病灶','外周 1.8 cm'],['功能储备','可接受'],['淋巴结状态','未明确']])}),
 make('decision-6','decision','病灶已定位到某肺段，但设想的段切无法取得所需切缘。下一步哪项合理？',[
  option('重新评估切除方案与其他条件，由团队讨论','定位清楚不等于该范围具备可行性。'),option('必须坚持原段切，因为位置在这一段','将定位结果当成唯一手术指令。','位置替代切缘条件'),option('把切缘要求从记录里删除','缺乏可行性不能靠省略条件解决。','忽略肿瘤学条件'),option('只要模型显示完整就可继续','模型外观不能保证切缘。','显示效果替代决策')],0,'解剖定位、肿瘤学可行性和个体耐受性应共同支持方案。',{transferOnly:true,level:3,family:'decision-conditions',visual:facts([['定位','已明确所属肺段'],['设想方案','解剖性段切'],['关键问题','所需切缘不可获得']])}),
 make('fitness-5','fitness','报告同时写术前 DLCO 和 ppoDLCO，二者可以直接合并为一个数吗？',[
  option('不能，分别描述术前与预计术后状态','两者所对应的阶段不同。'),option('可以，缩写相似就是同一值','忽略了 ppo 的意义。','术前与预计术后混淆'),option('只保留较高的值作决策','挑选更好看的结果会丢失风险信息。','选择性忽略风险'),option('只看是否有彩色图表','图表形式不解决功能解释。','图表外观替代评估')],0,'先读指标名称和测量阶段，再解释其对功能风险的意义。',{level:3,family:'fitness-diffusion',visual:facts([['指标一','术前 DLCO'],['指标二','ppoDLCO'],['区别','当前与预计术后']])}),
 make('fitness-6','fitness','教学病例 ppoDLCO 低于 40%，同时有待评估的心血管问题。正确理解是？',[
  option('提示较高功能风险，需结合心血管及整体状态进一步评估','风险信息应纳入综合讨论。'),option('仅凭这一数值决定所有治疗均无价值','单指标不提供完整获益风险判断。','分层当作绝对禁忌'),option('只要三维重建好看就能忽略风险','空间模型不能替代功能评估。','工具替代功能'),option('只看年龄即可把两个问题都跳过','年龄不能代替具体风险信息。','年龄替代功能')],0,'2025 指南将 ppoDLCO <40% 列为较高风险层级；仍需个体化综合评价。',{transferOnly:true,level:3,family:'fitness-risk',visual:facts([['ppoDLCO','<40%'],['心血管情况','尚待评估'],['任务','综合解读']])}),
 make('staging-5','staging','取样报告写“标本不足”。能把这一结果写成可靠的淋巴结阴性吗？',[
  option('不能，应核对取材质量与分期是否充分','无法充分判断与阴性不是同义。'),option('能，没有看到阳性就一定阴性','证据不足不能自动转成排除证据。','标本不足当作阴性'),option('只要影像清楚就不需要组织结果','影像不能替代标本质量。','影像等同病理'),option('换一个更大的容器就足够','容器大小不会改变已取标本质量。','形式替代取材质量')],0,'解释分期结果时先核对标本是否能回答临床问题，再整合影像与病理。',{level:3,family:'staging-tissue',visual:facts([['影像','存在需要评估的结节'],['取样报告','标本不足'],['问题','能否可靠排除']])}),
 make('staging-6','staging','在有组织分期指征的病例中，做过一次针对性 EBUS 取样，就能自动证明系统性分期已完成吗？',[
  option('不能，要核对评估范围、取材质量与整体分期方案','检查名称不等于覆盖完整。'),option('能，只要报告中出现 EBUS 四个字母','把方法名称等同于完成质量。','单站取样等同系统分期'),option('能，取过一次就不再有漏诊可能','检查不能保证绝对无遗漏。','检查绝对化'),option('病例越小越可省略所有其他信息','大小不消除既有分期指征。','尺寸替代分期')],0,'系统性分期强调覆盖和质量，不只是是否使用过某种器械。',{transferOnly:true,level:3,family:'staging-systematic',visual:facts([['已有操作','一次针对性 EBUS 取样'],['覆盖范围','待核对'],['取材质量','待核对']])})
];
export function buildQuestionBank(caseIndex,fieldScript){
 const real=caseIndex.cases.map((c,i)=>{
  const pool=['RS1','RS2','RS3','RS4','RS5','RS6','RS7','RS8','RS9','RS10','LS1+2','LS3','LS4','LS5','LS6','LS8','LS9','LS10'];
  const nearby=pool.filter(code=>code!==c.code&&code[0]===c.code[0]);
  const codes=[c.code,...nearby.slice(i%Math.max(1,nearby.length-3),i%Math.max(1,nearby.length-3)+3)];
  while(codes.length<4)codes.push(pool.find(code=>!codes.includes(code)));
  return make(`ct-${c.id}`,'segment','十字定位点属于哪个肺段？请滑动连续层面，并用其他平面核对。',codes.map(code=>option(fullSegmentName(code),code===c.code?'定位点与原有源标注一致。':'核对肺叶归属和连续分支走行，再比较所选段。',code===c.code?null:'连续层面肺段定位混淆')),0,
   `本题点位于${c.name}的原有源区域内部。回看方向、肺叶和段支气管的连续走行，再解释定位依据。`,
   {family:`real-segment-${c.code}`,level:3,source:['cases','anatomy'],visual:{kind:'ct',caseId:c.id,point:c.point,plane:c.plane,answerCode:c.code,bit:c.bit,ctSha256:c.ctSha256,sourceAtlasSha256:c.sourceAtlasSha256},hint:'先读方向标记并判断所在肺叶，再从近端支气管向外周追踪。'});
 });
 const hot=fieldScript.steps.slice(0,3).map((step,i)=>{
  const lm=step.landmarks[0];
  return {id:`field-${i+1}`,skill:'safety',type:'hotspot',level:3,family:'safety-visual',stem:lm.quiz_prompt_cn,
   answer:lm.hotspots[0].points_norm,explanation:`应在画面中找到${lm.name_cn}。点击器械反光或肺实质不能替代目标辨认；该题不要求推断未标明的分支编号。`,
   source:['field','bleeding'],hint:'沿管状轮廓观察，区分器械边缘和组织边缘。',
   visual:{kind:'frame',src:'./'+lm.frame,caption:step.source_cn},options:[]};
 });
 return [...CONCEPT_QUESTIONS,...EXTENSION_QUESTIONS,...real,...hot].map(q=>attachClinicalVisuals(q,caseIndex));
}
