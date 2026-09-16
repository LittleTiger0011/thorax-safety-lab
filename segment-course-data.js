// Original teaching text. Illustrations are generated from the supplied cases;
// referenced external article figures have not been copied into the site.
export const REFERENCES={
  names:{title:'IMAIOS e-Anatomy：肺叶与支气管肺段命名',url:'https://www.imaios.cn/en/e-anatomy/anatomical-structures/right-lung-middle-lobe-121131408',note:'解剖数据库的肺段名称；左肺分段存在不同命名方案。'},
  bronchus:{title:'Usefulness of computed tomography virtual bronchoscopy in the evaluation of bronchi divisions（2013）',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3596143/',note:'原始 CT 研究：支气管分支、共干和变异。'},
  lul:{title:'Anatomical variation analysis of left upper pulmonary blood vessels and bronchi…（2022）',url:'https://www.frontiersin.org/journals/oncology/articles/10.3389/fonc.2022.1028467/full',note:'原始 3D CT 研究：左上叶动脉、静脉与支气管的个体变异。'},
  lingula:{title:'Analysis of variations in the bronchovascular pattern of the lingular segment…（2023）',url:'https://www.frontiersin.org/journals/surgery/articles/10.3389/fsurg.2023.1173602/full',note:'原始研究：舌段动脉来源、供应范围与静脉分支关系。'},
  middle:{title:'Observation of bronchial anatomy and variation of the middle lobe of the right lung…（2025）',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC11963428/',note:'原始 CT 重建研究：右中叶支气管的分支与方向变异。'},
  basal:{title:'Multi-slice computed tomographic analysis…segmental bronchi in bilateral inferior lobes（2023）',url:'https://qims.amegroups.org/article/view/118424/html',note:'原始 CT 研究：双下叶基底段支气管的分支类型。'},
  dicom:{title:'DICOM 标准：影像平面、患者位置和方向',url:'https://dicom.nema.org/medical/DICOM/2021b/output/chtml/part03/sect_C.7.6.2.html',note:'真实 CT 与重建使用同一患者坐标；毫米间距用于多平面重组。'}
};
export const WECHAT_URLS=[
 'uaCYLrHnF-VmoUPN9u1cSA','OuThSftQRALhuFDLVdgcZw','JlcPnnSKOaa5DRp2eY4k8w','PJfkI-uK0POI-B3Ihwlrwg',
 '0JSMc-Kppust9R_9bdPy_w','CkNNZfw4x5-ywbgbQk8fmw','xaOribwTlKYJlIWqxjhaxQ','an0pfKn0fzp0J2mK3S4i5g',
 'R5ls1ITcYhoFylUynjoGxw','a6QN-FGYJspP67yLmzivig','OcbfsqeBabaGDVim2YAkvQ','Vv05pA2W2qt_PdsH6JWHcw'
].map(id=>'https://mp.weixin.qq.com/s/'+id);
export const LOBE_GROUPS=[{id:'RUL',name:'右上叶'},{id:'RML',name:'右中叶'},{id:'RLL',name:'右下叶'},{id:'LUL',name:'左上叶'},{id:'LLL',name:'左下叶'}];
export const SEGMENTS=[
 {code:'RS1',lobe:'RUL',name:'尖段',en:'Apical',position:'右上叶的肺尖方向。',trace:'从上叶支气管向头侧连续追踪 B1 的走行，再返回本病例 RS1 的彩色覆盖区。先在轴位观察从出现到消失的过程，随后用冠状位核对它与肺尖的关系。',compare:'与右上叶后段 S2、前段 S3 对照。肺尖不是某个固定层号；同一层面可同时包含数个肺段。',pitfall:'只凭“图像最高处”命名。应结合支气管追踪与病例自身的源标注。',refs:['names','bronchus']},
 {code:'RS2',lobe:'RUL',name:'后段',en:'Posterior',position:'右上叶的后方区域。',trace:'先切换后方三维视角，再在轴位利用 P 方位标记检查覆盖区。沿连续层面寻找通向该区的支气管，不把一条横断血管当作支气管。',compare:'重点比较上叶后段 S2 与下叶背段 S6。两者都可出现在胸腔后方，但属于不同肺叶。',pitfall:'看到背侧位置就叫 S6。先确定所属肺叶，后追踪分支。',refs:['names','bronchus']},
 {code:'RS3',lobe:'RUL',name:'前段',en:'Anterior',position:'右上叶的前方区域。',trace:'用轴位 A 方位和前方三维视角建立方向感。逐层记录 RS3 覆盖区形状的变化，再切冠状位查看其整体范围。',compare:'与 S1、S2 的交界属于肺段关系；与右中叶之间是肺叶关系，不能把两种边界混为一谈。',pitfall:'把彩色轮廓当成原 CT 上天然可见的解剖线。轮廓来自病例包内的重建标注。',refs:['names','bronchus']},
 {code:'RS4',lobe:'RML',name:'外侧段',en:'Lateral',position:'右中叶的外侧部分；方向关系有个体差异。',trace:'本库 CT-006 提供 RS4 与 RS5。先显示二者，再切轴位、冠状位与三维右侧视角，观察实际空间关系。沿中叶支气管连续追踪比只看一个截面更可靠。',compare:'与同叶内侧段 S5 配对学习。右中叶 S4/S5 的“外／内”与左舌段 S4/S5 的“上／下”不是同一命名方向。',pitfall:'把右中叶的两段固定画成左右各半。原始 CT 研究显示两支的相对走向存在变异。',refs:['names','middle']},
 {code:'RS5',lobe:'RML',name:'内侧段',en:'Medial',position:'右中叶相对内侧、朝向纵隔的一部分。',trace:'将 RS5 与 RS4 同时显示，用患者坐标的左右方向区别“向纵隔”与“靠屏幕中央”。在冠状位检查覆盖区与心影的关系。',compare:'用同一病例连续切换 RS4 与 RS5，观察两个区域在不同层面上的面积与位置改变。',pitfall:'用屏幕位置代替患者解剖方位；旋转三维后屏幕左右会改变。',refs:['names','middle']},
 {code:'RS6',lobe:'RLL',name:'背段（上段）',en:'Superior',position:'右下叶的上部、偏后方。',trace:'先在冠状位理解 S6 与基底各段的上下关系，再返回轴位，连续观察覆盖区如何变化。沿下叶支气管检查朝向背段的分支。',compare:'与同为后方的右上叶 S2，以及右下叶后基底段 S10 对照；三者不能仅按“在后面”归为同一段。',pitfall:'把 S6 当成所有下叶后侧区域。S10 是另一个命名单位。',refs:['names','basal']},
 {code:'RS7',lobe:'RLL',name:'内基底段',en:'Medial basal',position:'右下叶基底部相对内侧。',trace:'显示 S7、S8、S9、S10 后，从下叶基底支气管向远端追踪。用冠状位与轴位相互验证内侧范围，不要求各段按固定角度排列。',compare:'与 S8 的前方范围、S10 的后方范围配对看。分支的共干形式可以变化。',pitfall:'把一个共干上的所有远端区域当成一个肺段。共同起源与供应区域不是同一概念。',refs:['names','basal']},
 {code:'RS8',lobe:'RLL',name:'前基底段',en:'Anterior basal',position:'右下叶基底部的前方区域。',trace:'用轴位 A 标记确认方向，再在冠状位查看覆盖区向肺底延伸的过程。选择“出现／最大截面／末层”可快速比较同段的三个层面。',compare:'与外基底段 S9、内基底段 S7 对照，连续追踪基底支气管帮助解释邻接关系。',pitfall:'把肺底前方所有影像归入 S8；附近还可能有其他肺叶或未提供分段标注的组织。',refs:['names','basal']},
 {code:'RS9',lobe:'RLL',name:'外基底段',en:'Lateral basal',position:'右下叶基底部相对外侧。',trace:'同时使用右侧三维视角与轴位，检查覆盖区靠近侧胸壁的部分。切换到矢状位时，要保留 A/P 方向意识。',compare:'与前基底 S8、后基底 S10 比较。不要假定任意层面都能按前、中、后三等分找到它们。',pitfall:'用规则扇形图替代病例形态。本页显示的是源网格在当前 CT 网格上的覆盖。',refs:['names','basal']},
 {code:'RS10',lobe:'RLL',name:'后基底段',en:'Posterior basal',position:'右下叶基底部的后方区域。',trace:'从较低轴位向头侧连续浏览，再用冠状位检查与 S6 的关系。后方三维视角用于观察区域整体形态，不能替代支气管连续追踪。',compare:'与 S6、S9 对照；若当前病例只提供 RS10b/c，目录会保留这些源名称，不能据此宣布整个 S10 已完整标注。',pitfall:'把缺少某个亚段标签解释为患者缺少该结构。资料覆盖与解剖变异须分别核实。',refs:['names','basal']},
 {code:'LS1+2',lobe:'LUL',name:'尖后段',en:'Apicoposterior',position:'左上叶的尖后方向，常采用 S1+2 合并命名。',trace:'先将 LS1+2 与 LS3 一起显示，辨认左上叶上区；再逐层追踪通向该区的支气管。源标签中的 a/b/c 为提供者的亚段标注，查看时应保留完整名称。',compare:'不能直接照搬右上叶 S1、S2 的分割方式。左上叶血管、支气管的共干和分支关系有个体差异。',pitfall:'把“1+2”理解为软件漏分了两个段，或假定同名字母的动脉与支气管必然严格一一对应。',refs:['names','lul']},
 {code:'LS3',lobe:'LUL',name:'前段',en:'Anterior',position:'左上叶上区的前方部分。',trace:'先在轴位利用 A 标记识别前方，再查看 LS3 与 LS1+2 的覆盖区。对照支气管与血管图层时，分别追踪各自的连续性。',compare:'与舌段 LS4/LS5 对照，明确同属左上叶但属于不同命名区域。',pitfall:'凭一根支气管旁边的一条血管就直接命名为同号动脉。左上叶亚段水平并不总是严格伴行。',refs:['names','lul']},
 {code:'LS4',lobe:'LUL',name:'上舌段',en:'Superior lingular',position:'左上叶舌区相对上部。',trace:'用冠状位先建立 LS4 与 LS5 的上下关系，再沿连续轴位看它们的真实边界变化。查看舌段动脉时分别辨认来源和供应方向。',compare:'与下舌段 LS5 配对；左舌段属于左上叶，不是“左中叶”。',pitfall:'把所有进入舌区附近的动脉都认作只供应舌段。研究记录了来源与供应范围的变异。',refs:['names','lingula']},
 {code:'LS5',lobe:'LUL',name:'下舌段',en:'Inferior lingular',position:'左上叶舌区相对下部。',trace:'在冠状位观察 LS5 向下延伸的轮廓，再切轴位查看与邻近心影、下叶范围的相对位置。选中同一段后，三维模型仍使用当前病例坐标。',compare:'与 LS4 对照；不能因其位置偏低就把它归入左下叶基底段。',pitfall:'只按胸腔高度判断肺叶归属；应结合支气管起源与病例的肺叶重建。',refs:['names','lingula']},
 {code:'LS6',lobe:'LLL',name:'背段（上段）',en:'Superior',position:'左下叶的上部、偏后方。',trace:'从冠状位认识 LS6 与各基底段的关系，再回到轴位确认其连续范围。可选择 CT-011 或 CT-012 对照另一病例。',compare:'与左上叶尖后段 LS1+2 和左下叶后基底段 LS10 比较。后方位置本身不足以确定段号。',pitfall:'将左右侧的 S6 轮廓视为镜像模板。每例覆盖区均来自自己的重建。',refs:['names','basal']},
 {code:'LS7',lobe:'LLL',name:'内基底段／合并命名专题',en:'Medial basal / variation',position:'左下叶内侧基底区的命名与支气管分支存在差异。',trace:'先阅读左下叶基底支气管的变异资料，再观察现有病例 LS8、LS9、LS10 的源标注。此病例库没有独立 LS7 网格，因此本专题不显示推测的 LS7 彩色区域。',compare:'部分命名方案使用前内基底 S7+8，部分描述独立内基底分支。源标签为 LS8 时，本页不会擅自改写成 LS7+8。',pitfall:'把没有导出的 LS7 标签当作“患者必然没有 S7”，或把所有 LS8 自动解释为 S7+8。',refs:['names','basal','bronchus']},
 {code:'LS8',lobe:'LLL',name:'前基底段（沿用源 LS8）',en:'Anterior basal / source label',position:'本库使用源名称 LS8 表示左下叶相应前基底区域。',trace:'在 CT-012 等病例中观察 LS8 与 LS9、LS10。优先保留提供者的标签，再根据支气管走行和完整解剖资料复核其覆盖范围。',compare:'与 LS7／S7+8 命名专题一起阅读；病例资料未确认其等价关系时不做替换。',pitfall:'把教材中的通用合并方案强行覆盖到每个病例。',refs:['names','basal']},
 {code:'LS9',lobe:'LLL',name:'外基底段',en:'Lateral basal',position:'左下叶基底部相对外侧。',trace:'在左侧三维视角检查 LS9 的外侧范围，再切轴位与冠状位验证。边滑动边留意“本层肺段”列表中该段的出现与消失。',compare:'与 LS8、LS10 对照；屏幕右侧在标准轴位对应患者左侧。',pitfall:'在左右病例之间切换时忘记患者方向，或者仅依据颜色记忆段号。',refs:['names','basal','dicom']},
 {code:'LS10',lobe:'LLL',name:'后基底段',en:'Posterior basal',position:'左下叶基底部的后方区域。',trace:'从后方三维视角认识整体范围，再在轴位追踪各层覆盖。用冠状位检查它与 LS6 的区别，观察源亚段名称是否齐全。',compare:'与 LS6 和 LS9 对照。点击当前层的段名仅定位该层真实覆盖点，不跳到另一患者的模板位置。',pitfall:'把某层不出现某段等同于病例没有该段。先浏览该段的整个已标注范围。',refs:['names','basal']}
];
export const FUNDAMENTALS=[
 {title:'01 · 建立方位：先认患者，再看屏幕',text:'轴位默认按从患者足端向头侧观察的方式显示：画面左侧是患者右侧 R，画面右侧是患者左侧 L，前方 A 在上、后方 P 在下。冠状位和矢状位顶部为头侧 S。旋转三维不会改变 CT 的患者坐标。切换平面后，定位十字仍表示同一个空间点。',action:'依次切轴位、冠状位、矢状位，核对定位点和三维中的 CT 平面。',refs:['dicom']},
 {title:'02 · 肺叶、肺段与亚段：分清命名层次',text:'先确认肺叶，再讨论肺段。目录中的 R/L 表示左右，S 表示肺段，后面的 a/b/c 沿用源文件的亚段标签。教程按父段汇总同名亚段，但“汇总”只覆盖已经提供的网格。一个段的某些亚段未导出时，不自动补齐。',action:'打开“源亚段”列表，对比 RS10b、RS10c 与教程中的 RS10 汇总范围。',refs:['names','bronchus']},
 {title:'03 · 连续追踪：支气管优先提供路线',text:'B 表示支气管，A 表示肺动脉，V 表示肺静脉。识别时沿连续 CT 层面追踪起源、分叉和进入区域，不能凭一个圆形截面判断。当前源资料将支气管与血管按整树导出，未逐支标定 B1/A1/V1；教程中的分支号是解剖学习索引，不是对本病例每根分支的自动确认。',action:'先单独显示支气管，再分别加入动脉、静脉，逐项复核连续性。',refs:['bronchus','lul']},
 {title:'04 · 看关系：伴行规律不等于没有变异',text:'肺段识别需要把支气管、动脉和静脉分开观察。左上叶的原始 3D CT 研究记录了多种动静脉分支及支气管共干形式，亚段水平的动脉与支气管并非总是严格对应。不能把一幅标准图上的分支位置当成所有病例的固定答案。',action:'选择两个左上叶病例，从同一方向观察整树，记录能确认和仍待确认的关系。',refs:['lul','lingula']},
 {title:'05 · 读覆盖图：原始影像与叠加标注分开理解',text:'灰阶图来自病例包 CT。彩色区来自该病例已提供的闭合肺段网格，并按同一 CT 体素中心取样。彩色边界是重建标注的空间投影，不是原 CT 自动显示的天然分界线。相邻段源网格如有重叠，显示灰白斜纹；没有源标签的区域保持灰阶，不按邻近颜色推断归属。',action:'在“填色／轮廓／关闭”之间切换，同层比较真实灰阶与标注。',refs:['dicom']},
 {title:'06 · 三个平面：同一结构的不同截面',text:'轴位最适合连续追踪；冠状位帮助理解上下延伸；矢状位帮助理解前后与上下的关系。拖动 CT 滑块时，当前层实际出现的段名同步更新，三维 CT 平面移动到同一坐标。一个肺段可以跨越许多层，同一层也可以穿过多个肺段。',action:'选中一个段，分别查看三个平面中的最大截面，最后回到轴位连续播放。',refs:['dicom']},
 {title:'07 · 用病例验证：位置只是线索',text:'先观察未着色 CT，再打开覆盖图进行核对。以 S2 与 S6、S6 与 S10、右中叶与左舌段为重点比较对象。回答“属于哪侧、哪叶、哪个源标注区域”，并说出用于判断的连续影像与三维关系。查看提示或结果属于学习行为，本教程不据此记录犯错。',action:'关闭标注说出判断，再打开标注、切换平面，核对理由。',refs:['names','bronchus']},
 {title:'08 · 理解资料范围：分辨率与覆盖均有边界',text:'这些病例包的 CT 已经裁剪、重采样，层间距约 2 mm；冠状位和矢状位由同一体数据重组，不等于新增更薄的原始扫描。细小分支、边界取样和未提供的肺段需要回到完整临床资料复核。软件完成了坐标与数据核对，尚未替代逐例医学审核。',action:'在“病例资料”查看像素间距；用“换病例对照”比较，不用插值后的平滑外观判断原始分辨率。',refs:['dicom']}
];
export const segmentByCode=code=>SEGMENTS.find(s=>s.code===code);
export const fullSegmentName=code=>{const s=segmentByCode(code);return s?`${code} · ${LOBE_GROUPS.find(l=>l.id===s.lobe).name}${s.name}`:code;};
