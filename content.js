export const RELEASE='1.0.0-rc2';
export const TITLE='胸外科安全实训：从影像解剖到临床决策';
export const AUTHOR='';
export const UNIT='广西医科大学附属肿瘤医院胸外科';
export const REVIEW={status:'pending',date:null,reviewer:null};
export const SOURCES=[
 {id:'JCOG0802',title:'Saji et al. JCOG0802/WJOG4607L，Lancet，2022',url:'https://pubmed.ncbi.nlm.nih.gov/35461558/',note:'外周、≤2 cm、CTR>0.5 的特定试验人群；不能只凭尺寸决定术式。'},
 {id:'CALGB',title:'Altorki et al. CALGB 140503，NEJM，2023',url:'https://pubmed.ncbi.nlm.nih.gov/36780674/',note:'研究包含术中确认肺门及纵隔淋巴结阴性的条件。'},
 {id:'JCOG1211',title:'Aokage et al. JCOG1211，Lancet Respir Med，2023',url:'https://pubmed.ncbi.nlm.nih.gov/36893780/',note:'GGO 主导病灶的单臂研究，不是段切对叶切的随机比较。'},
 {id:'VEIN',title:'Hao et al. 右中叶静脉汇合变异三维研究，2025',url:'https://pubmed.ncbi.nlm.nih.gov/40692133/',note:'支持中叶静脉回流保护与个体变异的重要性；体模不复刻该研究患者。'},
 {id:'BLEED',title:'VATS 肺手术出血管理国际专家共识，2019',url:'https://pubmed.ncbi.nlm.nih.gov/32042728/',note:'本课仅展开暂停危险操作、压迫控制、求助与升级处理原则。'},
 {id:'THREE',title:'Three.js 与 MIT 许可证',url:'https://github.com/mrdoob/three.js/blob/dev/LICENSE',note:'三维渲染依赖，许可证随作品提供。'},
 {id:'ELECTRON',title:'Electron 项目与许可证',url:'https://github.com/electron/electron',note:'离线桌面运行框架，许可证与第三方声明随包提供。'},
];
export const OBJECTIVES=[['空间解剖','辨认左右、五叶、右上叶分区及必要肺门分支。'],['三屏对应','从真实 CT 追踪到本例三维重建，再对照真实术野原则。'],['条件决策','核实资料、分期与功能条件后，再讨论切除范围与取舍。'],['安全识别','同时确认目标与保留结构，不确定时主动暂停。']];
export const LESSON=[['00–05','前测','完成 16 题，记录首次表现与信心。'],['05–15','三屏探索','建立方向，追踪分支，关闭标签再辨认。'],['15–22','病例决策','第 1 关 15 例分层判读，第 2 关完成 CT-004；第 3、4 关与综合考核课后完成。'],['22–34','病例 B','完成六个安全检查点，回看至少一个后果分支。'],['34–40','独立后测','完成 16 题综合检测并导出过程报告；已见卷标记同卷复习，不计新的独立证据。']];
export const WORKFLOW=['术前评估与术式讨论','麻醉与单肺通气概念','入胸与探查','肺门结构与肺裂相关处理','淋巴结处理','标本取出','漏气与余肺膨胀检查','止血复核与引流'];
export const CASE_A={
 id:'A',name:'病例 A · 切除决策',subtitle:'右上叶外周 1.6 cm 混合磨玻璃结节',
 intro:'这是一个虚构、故意保留信息缺口的病例。先判断资料是否充分，再讨论下一步；结节大小本身不能决定手术必要性或切除范围。',
 cards:[
  {id:'image',title:'影像与变化',body:'已知总径 1.6 cm、混合磨玻璃。实性成分比例、薄层测量及既往变化资料尚需补充；不能由影像直接推断病理类型。'},
  {id:'margin',title:'位置与切缘',body:'需明确与段界、肺门结构的关系以及楔切或段切能否取得合适切缘。仅写“外周”仍不充分。'},
  {id:'stage',title:'分期与淋巴结',body:'需补足分期信息。影像未见异常不能等同病理阴性；研究中术中确认的条件不能提前视为已知。'},
  {id:'function',title:'肺功能与耐受性',body:'需结合肺功能、合并症、手术耐受性和患者偏好讨论保留肺组织与肿瘤控制。此处不虚构肺功能数值。'},
 ],
 options:[['evaluate','继续评估／补足资料','本病例现有信息支持的安全下一步。'],['wedge','讨论楔形切除','外周可切及切缘、分期等条件必须成立；不直接由“≤2 cm”推出。'],['segment','讨论解剖性肺段切除','需合适的病灶条件、切缘和淋巴结评估，并权衡保肺与风险。'],['lobe','讨论肺叶切除','应结合完整评估与肿瘤学需要；并非小 GGO 的默认唯一答案。']],
};
export const CASE_B={id:'B',name:'病例 B · 右上叶安全训练',subtitle:'独立虚构情境 · 已确定术式后的安全解剖',intro:'本教学情境设定为完成必要评估、团队已决定拟行右上叶切除。课堂只讨论此后如何辨认目标并保护余肺；不从病灶大小反推叶切指征。与病例 A 不是同一患者。三屏阅片为匿名真实病例 CT-004，不是这份虚构情境的病历。'};
export const CHECKPOINTS=[
 {id:'orientation',name:'体位与入胸',short:'侧别',target:'left-lateral',preserve:null,question:'右侧胸部为手术侧时，下列哪项空间描述恰当？',options:[['left-lateral','教学情境采用左侧卧位，右胸向上'],['right-lateral','右胸为手术侧，所以必须右侧卧位'],['one-port','所有病例都采用同一固定孔位']],why:'先明确患侧和空间方向。侧卧位与具体入路由手术方案决定，固定孔位不是普适答案。',category:'方向混淆',hint:['先区分“哪侧朝上”和“哪侧卧下”。','右胸向上，对应左侧卧位。'],focus:'rul'},
 {id:'landmark',name:'进胸定向',short:'定向',target:'rul',preserve:'hilum-fissure',question:'找出右上叶，并选择建立方向的依据。',options:[['rul','右上叶'],['rml','右中叶'],['rll','右下叶'],['lul','左上叶']],preservePrompt:'方向依据',preserveOptions:[['hilum-fissure','综合肺门、肺裂、前后方向'],['screen-left','只看它在屏幕左侧'],['color-only','只记住一种颜色']],why:'腔镜画面会随视角变化。用解剖标志建立方向，迷向时恢复观察位再确认。',category:'方向混淆',hint:['寻找右肺水平裂与斜裂，结合肺门位置。','右上叶在水平裂上方；屏幕左右不能代替患者左右。'],focus:'rul'},
 {id:'vein',name:'静脉保护',short:'静脉',target:'rulv',preserve:'rmlv',question:'确认右上叶目标静脉分支，并指出必须保护的回流。',options:[['rulv','右上叶目标静脉分支'],['rspv','右上肺静脉汇合段'],['rmlv','右中叶静脉'],['ripv','右下肺静脉']],preservePrompt:'需要保留',preserveOptions:[['rmlv','右中叶静脉回流'],['none','无需确认保留回流'],['rulv','仅重复勾选目标分支']],why:'目标是上叶分支。本体模的汇合段同时接收中叶回流，不能整体视为上叶离断目标。实际汇合方式存在变异。',category:'保护对象遗漏',hint:['沿汇合处向外追踪，查看还有哪一肺叶引流至此。','中叶回流不能随上叶分支一同阻断。'],focus:'rulv',effect:'venous'},
 {id:'artery',name:'动脉追踪',short:'动脉',target:'a13',preserve:'interlobar',question:'辨认本体模右上叶前干示意，保护继续供应余肺的通路。',options:[['a13','右上叶前干示意'],['interlobar','右叶间动脉'],['rulv','右上叶目标静脉分支'],['bi','中间支气管']],preservePrompt:'需要保留',preserveOptions:[['interlobar','通向保留肺的叶间动脉'],['none','所有同色血管都可处理'],['color-only','只要颜色一致即可']],why:'判断依据是起源、走行和供血区域。此体模另展示 A2 后升支，不宣称前干代表上叶全部供血。',category:'结构混淆',hint:['从肺动脉向分支追踪，判断其供血区域。','需要保留向中、下叶延续的动脉通路。'],focus:'a13',effect:'arterial'},
 {id:'bronchus',name:'支气管保护',short:'气道',target:'rub',preserve:'bi',question:'辨认右上叶支气管，同时保护中下叶的通气通路。',options:[['rub','右上叶支气管'],['bi','中间支气管'],['rmb','右主支气管'],['bll','右下叶支气管']],preservePrompt:'需要保留',preserveOptions:[['bi','中间支气管'],['none','只确认目标就足够'],['rub','把上叶支气管设为唯一保留结构']],why:'右上叶支气管离开右主支气管后，中间支气管仍通向中、下叶。误处理影响保留肺通气。',category:'结构混淆',hint:['追踪它还通向哪些肺叶。','向尾侧延续并发出中、下叶支气管的是中间支气管。'],focus:'rub',effect:'airway'},
 {id:'finish',name:'安全结束',short:'安全',target:'stop-pressure-call',preserve:'check-all',question:'出现开放性血管损伤、视野受限时，优先选择哪组安全原则？',options:[['stop-pressure-call','暂停危险操作、压迫控制、呼叫并升级处理'],['blind-clamp','视野不清时快速盲夹'],['blind-burn','直接盲目追加电凝'],['rush','为尽快结束继续推进']],preservePrompt:'结束前应回顾',preserveOptions:[['check-all','止血、漏气、余肺膨胀、引流及相关肿瘤学环节'],['speed-only','只要六个检查点完成即可结束手术'],['skip-nodes','淋巴结处理可由认名任务替代']],why:'本课仅训练本科安全识别与升级处理原则。六个检查点不是完整手术，也不评价独立手术资质。',category:'危险应对',hint:['先停止增加损伤的动作，控制局面并求助。','视野不清时避免盲夹、盲烧；安全结束需要完整复核。'],focus:'rpa',effect:'bleeding'},
];
const q=(id,dimension,prompt,options,answer,explanation,extra={})=>({id,dimension,prompt,options,answer,explanation,...extra});
export const PRETEST=[
 q('pre01','anatomy','轴位示意 CT 采用从足侧向头侧观看。屏幕左侧对应患者哪一侧？',['患者右侧','患者左侧','与左右无关'],0,'按本课固定坐标约定，屏幕左侧为患者右侧。'),
 q('pre02','anatomy','右肺有上、中、下三叶。左肺有几个肺叶？',['2 个','3 个','5 个'],0,'左肺分上叶、下叶。'),
 q('pre03','anatomy','右上叶 S2 表示哪个分区？',['后段','前段','尖段'],0,'右上叶 S1 尖段、S2 后段、S3 前段；分区为教学示意。'),
 q('pre04','mapping','观察 CT 中给定的金色轮廓。在三维屏选择同一支气管结构，再确认答案。',[], 'rub','该通路发出右上叶分支；向尾侧延续的中间支气管需要保留。',{pick:'anatomy',source:'ct',structure:'rub',view:'anterior'}),
 q('pre05','mapping','观察 CT 中给定的金色轮廓。在腔镜屏选择同一静脉分支，再确认答案。',[], 'rmlv','该分支从中叶汇入共同回流路径，是保留中叶的重要通路。',{pick:'scope',source:'ct',structure:'rmlv',view:'anterior'}),
 q('pre06','decision','仅知外周 1.6 cm 混合 GGO，下一步最合理的是？',['补充影像变化、实性成分、分期、功能与切缘信息','直接认定必须叶切','直接认定一定无需评估'],0,'资料不足时继续评估，不以单一尺寸替代完整判断。'),
 q('pre07','decision','讨论亚肺叶切除时，以下哪项是必要考虑？',['病灶条件、切缘与淋巴结评估','只看是否小于 2 cm','只看术式创口大小'],0,'原始研究的结论有适用条件，不能转成单一尺寸规则。'),
 q('pre08','safety','上叶静脉目标旁还汇入中叶回流，最安全的做法是？',['确认目标分支并保留中叶回流','直接处理整个汇合段','忽略未计划切除肺叶的回流'],0,'上叶切除仍需保护余肺引流。',{critical:true}),
 q('pre09','safety','误处理中间支气管首先对应哪一类风险？',['保留中下叶通气受限','单纯静脉回流受阻','必然立刻发生大量出血'],0,'气道处理错误影响通气；其他后果不能互相替代。',{critical:true}),
 q('pre10','safety','血管损伤导致视野受限时，应优先？',['暂停危险动作、压迫控制并求助升级','盲目追加夹闭','盲目电凝后继续操作'],0,'本科层面识别暂停、控制与求助原则，避免盲目处理。',{critical:true}),
];
export const POSTTEST=[
 q('post01','anatomy','腔镜从前外侧改为后外侧后，画面左右改变。应如何重新定向？',['结合肺门、肺裂与患者方向','沿用原来的屏幕左右','只按颜色猜测'],0,'摄像机转动不能改变患者自身的左右；应恢复解剖方向。'),
 q('post02','anatomy','位于右肺水平裂下、斜裂前上方的教学肺叶是哪一叶？',['右中叶','右上叶','左下叶'],0,'右中叶位于水平裂与斜裂之间的前方区域。'),
 q('post03','anatomy','右上叶前段在本课用哪个代号表示？',['S3','S1','S2'],0,'S3 为前段，S1 为尖段，S2 为后段。'),
 q('post04','mapping','从新的头侧观察位出发：把 CT 金色轮廓对应到三维屏的同一通气通路。',[], 'bi','中间支气管向尾侧继续通向中、下叶，不能随上叶一起处理。',{pick:'anatomy',source:'ct',structure:'bi',view:'superior'}),
 q('post05','mapping','从新的头侧观察位出发：把 CT 金色轮廓对应到腔镜屏的同一上叶静脉分支。',[], 'rulv','沿分支追踪上叶目标，同时辨清中叶汇入关系。',{pick:'scope',source:'ct',structure:'rulv',view:'superior'}),
 q('post06','decision','影像未见淋巴结异常，能否视为已获得研究所需的术中病理阴性？',['不能，影像结果与病理确认不是同一信息','可以，两者完全等同','可以，只要病灶小'],0,'评估结果具有时间与方法边界，不能提前使用尚未取得的信息。'),
 q('post07','decision','肺功能储备有限且病灶切缘条件仍不清楚，讨论术式时应？',['综合功能、切缘、分期及患者偏好继续评估','自动认定楔切最佳','自动认定叶切最佳'],0,'此题评价条件化判断，不以单个术式名称作为万能正确答案。'),
 q('post08','safety','模拟夹闭中叶静脉而血管未破裂，哪种反馈符合主要因果？',['回流受阻与淤血风险','立即喷血遮挡','只有通气受限'],0,'闭合静脉影响回流，开放性血管损伤才对应血液进入术野。',{critical:true}),
 q('post09','safety','无法确定某支气管是否仍供应保留肺，应如何行动？',['暂停并沿分支追踪，必要时求助','为了完成计时先处理','只比较颜色后立即推进'],0,'承认不确定并重新辨认是正向安全行为。',{critical:true}),
 q('post10','safety','完成六个安全检查点后，以下认识哪项正确？',['仍需理解肺裂、淋巴结、标本、检查与引流等完整环节','已经等同独立完成手术','可跳过漏气和止血复核'],0,'本课六点是安全认知节点，并非完整手术训练。',{critical:true}),
];
export const RETEST=[
 q('retry-vein','safety','换到头侧视角，独立选出需要保留的中叶回流通路。',[],'rmlv','保护中叶回流；变异需逐例辨认。',{pick:'scope',source:null,structure:null,view:'superior',critical:true}),
 q('retry-bronchus','safety','换到头侧视角，独立选出通向中、下叶的保留支气管。',[],'bi','中间支气管保持中下叶通气。',{pick:'anatomy',source:null,structure:null,view:'superior',critical:true}),
 q('retry-artery','safety','闭合误处理的非目标动脉，主要影响哪条生理关系？',['灌注','静脉回流','气道通气'],0,'动脉误闭首先对应供血／灌注减少。'),
 q('retry-bleed','safety','出现开放性血管损伤时，哪项应当避免？',['视野不清时盲夹或盲烧','暂停危险动作','压迫控制并呼叫升级'],0,'后两项属于本课展开的安全原则。',{critical:true}),
];
export const DIMENSIONS={anatomy:{name:'空间解剖',weight:25},mapping:{name:'三屏对应',weight:25},decision:{name:'条件决策',weight:20},safety:{name:'安全识别',weight:30}};
export const KNOWLEDGE={
 '方向混淆':{title:'先恢复解剖方向',text:'患者左右不会随镜头改变。回到标准观察位，结合肺门、水平裂和斜裂重新定位；再关闭标签，从新视角辨认。',focus:'rul'},
 '结构混淆':{title:'看连接，不只看颜色',text:'追踪结构起源、走行和终点。支气管通向肺叶；动脉承担灌注；静脉承担回流。先确认它还服务哪些保留组织。',focus:'rub'},
 '保护对象遗漏':{title:'目标和保留对象要双确认',text:'在目标静脉旁继续追踪中叶回流；辨认上叶支气管时也要找到中间支气管。未确认保留对象，先暂停。',focus:'rmlv'},
 '条件不足':{title:'决策条件不足',text:'区分已知资料、待查资料与术中才能取得的资料。除大小外，须评估实性成分、位置、切缘、淋巴结与肺功能。',focus:'lesion'},
 '危险应对':{title:'暂停、控制与求助',text:'出血导致视野受限时，暂停危险动作，压迫控制并呼叫／升级处理。不得用盲夹盲烧来获得通关。',focus:'rpa'},
};
