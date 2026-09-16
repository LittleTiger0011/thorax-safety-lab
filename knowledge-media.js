/**
 * Knowledge-library media inventory, visually inspected 2026-09-15.
 * Images and videos already exist under dist; this module creates no media.
 * Segment colours show supplied source regions, not native CT boundaries.
 * Theatre frames are from the left-upper-lobectomy teaching sequence;
 * unlabelled branches have no branch-by-branch gold-standard annotation.
 */

export const DOMAIN_COLORS = Object.freeze({
  orientation: '#51D6FF',
  segment: '#AC8FFF',
  vessels: '#FF779D',
  airway: '#FFD16A',
  decision: '#48E2B1',
  fitness: '#65B1FF',
  staging: '#B9EC66',
  safety: '#FFA36B',
});

const segment = (code, title, caption, caseId = 'CT-001') => ({
  src: `./segment-atlas/figures/${code}.webp`, title, caption,
  credit: `本站病例 ${caseId} · 配套源肺段网格覆盖`,
  source: `./index.html#${caseId}`,
  license: '本站已有病例资料；源包未标注开放许可',
});

const ct = (caseId, title, caption) => ({
  src: `./real-cases/${caseId}/preview-unmarked.webp`, title, caption,
  credit: `本站病例 ${caseId} · CT 灰阶预览`,
  source: `./index.html#${caseId}`,
  license: '本站已有病例资料；源包未标注开放许可',
});

const field = (frame, title, caption, video) => ({
  src: `./or-field/clean/frames/${frame}.jpg`, title,
  caption: `左上肺叶切除教学术野。${caption} 未提供逐分支金标准标注。`,
  credit: '本站课程整理 · 公开左上肺叶切除教学录像',
  source: './or-field.html',
  license: '原作者版权；本站已有教学素材未标注开放许可',
  ...(video ? {video: `./or-field/clean/video/${video}.mp4`} : {}),
});

const clinicalAssets = {
  petMediastinal: {
    src: './assessment-clinical/pet-mediastinal.webp',
    credit: 'Chi A; Nguyen NP · Frontiers in Oncology, 2014 · Figure 2',
    source: 'https://doi.org/10.3389/fonc.2014.00273',
    license: 'CC BY 4.0',
  },
  petLung: {
    src: './assessment-clinical/pet-lung.jpg',
    credit: 'Chi A; Nguyen NP · Frontiers in Oncology, 2014 · Figure 1',
    source: 'https://doi.org/10.3389/fonc.2014.00273',
    license: 'CC BY 4.0',
  },
  cdc: {
    src: './assessment-clinical/lung-function-test.jpg',
    credit: 'CDC / Veronica Burkel, MPH · PHIL 20950, 2013',
    source: 'https://wwwn.cdc.gov/phil/Details.aspx?pid=20950',
    license: 'Public domain',
  },
  spirometry: {
    src: './assessment-clinical/spirometry-clinical.jpg',
    credit: 'Jmarchn · DoingSpirometry.JPG, 2013',
    source: 'https://commons.wikimedia.org/wiki/File:DoingSpirometry.JPG',
    license: 'CC BY-SA 3.0',
  },
};

const clinical = (key, title, caption) => ({...clinicalAssets[key], title, caption});

/** Each node maps to exactly two media items. All paths are relative to dist. */
export const KNOWLEDGE_MEDIA = {
  'orientation-side': [
    segment('RS2', '先读 R：患者的右侧', 'CT-001 轴位，R 位于画面左侧，青绿色为 RS2 源覆盖。侧别由患者方向标记表达，不能用屏幕左右替代。'),
    segment('LS1-2', '再读 L：左侧合并命名', 'CT-001 轴位，L 位于画面右侧；金黄色为 LS1+2 源覆盖。用于练习患者侧别及完整标签，不凭颜色确定分支。'),
  ],
  'orientation-space': [
    segment('RS1', '同一病例：较高层面', 'CT-001，图面显示 CT93，金黄色为 RS1 源覆盖；小红圈沿用源参考标注。与右图不是同层或同一空间点，用于引出连续层面核对。'),
    segment('LS9', '同一病例：较低层面', 'CT-001，图面显示 CT26，紫色为 LS9 源覆盖。单张轴位只展示一次截面；请进入影像页核对三平面同点关系。'),
  ],
  'segment-name': [
    segment('RS4', '右中叶 S4：外侧段', 'CT-006 的 RS4 源覆盖。与右图并列比较命名：右中叶 S4 为外侧段；此图没有逐支标出 B4。', 'CT-006'),
    segment('LS4', '左上叶 S4：上舌段', 'CT-001 的 LS4 源覆盖。左舌区属于左上叶；相同的 S4 编号不能让左右侧名称和空间方向机械对应。'),
  ],
  'segment-trace': [
    segment('RS6', '右下叶 S6：回到肺叶归属', 'CT-001 的 RS6 源覆盖，图面显示 CT57。识别后方区域时应结合所属肺叶与连续分支，不能仅靠截面位置猜段。'),
    segment('LS6', '左下叶 S6：换侧重新追踪', 'CT-001 的 LS6 源覆盖，图面显示 CT67。两图为不同层面；它们提供复习入口，不能替代连续轴位与多平面核对。'),
  ],
  'vessels-mechanism': [
    field('s02_y_vessel', '分叉外形：身份仍要核对', '可见灰白分叉管状轮廓及周围组织。此帧用于讨论“外观能说明什么”，不将管道外观直接判作某号动脉或静脉。'),
    field('s02_y_clear', '观察形态，区分功能问题', '视野中可见分叉轮廓和邻近已处理区域。灌注、回流与开放损伤的机制需要独立学习，本帧不证明某条通路已受损。'),
  ],
  'vessels-preserve': [
    field('s02_behind_vessel', '看见后方，仍需确认保留对象', '可见器械与管状结构的前后关系。可用于提出保护对象核查问题；不把它当成右中叶静脉或特定血管的个体证明。', 'step02_pa_isolation'),
    segment('LS3', '保留区域需要独立解释', 'CT-001 的 LS3 源覆盖，展示左上叶源标注区域。此图没有标出供应动脉或回流静脉；与左侧术野也未建立同一患者对应。'),
  ],
  'airway-route': [
    segment('RS5', '将通路与下游区域联系起来', 'CT-006 的右中叶 RS5 源覆盖，可作为理解下游肺组织的入口。中间支气管与 B5 未在本图逐支标注。', 'CT-006'),
    field('s01_white_tube', '灰白管状结构不等于气道', '可见新显露的灰白条索与器械。用于比较术野外观和命名证据，不命名为中间支气管，也不作为右侧气道示例。'),
  ],
  'airway-protect': [
    field('s03_stapler_ready', '目标之外：保留通路在哪里', '器械邻近组织的画面用于练习目标与保留对象双确认。此帧不能确定某条支气管身份，也不证明余肺通气正常。', 'step03_stapler'),
    field('s03_stapler_jaws', '器械就位，证据是否完整', '可见器械钳口与周围组织，适合练习提出仍待核查的问题。器械反光与位置不能替代结构身份和保护对象的确认。'),
  ],
  'decision-conditions': [
    ct('CT-004', '一张 CT 能回答哪些问题', 'CT-004 的无彩色、无病灶圈灰阶预览。病例包已裁剪重采样，静态图不提供完整分期、功能或切缘条件，不据此确定切除方案。'),
    segment('RS3', '定位资料与方案条件分开', 'CT-001 的 RS3 源覆盖及源参考红圈。它与左侧 CT-004 是不同病例；彩色区域用于理解解剖定位，不代表批准的切除范围。'),
  ],
  'decision-evidence': [
    ct('CT-014', '从病例观察走向证据核对', 'CT-014 的无彩色、无病灶圈灰阶预览。此图仅提供影像观察背景，不说明该病例符合某项临床试验的全部入组条件。'),
    segment('LS5', '重建颜色不是治疗指征', 'CT-001 的 LS5 源覆盖；红圈为源参考标注。它与左侧 CT-014 不是同一病例，不用这一片覆盖区替代分期、功能与个体条件。'),
  ],
  'fitness-diffusion': [
    clinical('cdc', '肺功能检查：回到指标含义', 'NIOSH 技术人员演示肺功能检查。照片展示检查场景，不提供受检者的 FEV₁ 或 DLCO 数值，也不将设备外观作为弥散能力判断。'),
    clinical('spirometry', '肺量计检查场景', '真实肺量计检查照片。用于理解通气评估的检查情境；此照片不标作 DLCO 检查，也不推断受检者诊断。'),
  ],
  'fitness-risk': [
    clinical('spirometry', '当前测量与预计术后值', '肺量计检查场景用于复习“测量阶段”。课程中的 ppoFEV₁、ppoDLCO 属于预计术后指标，不是这张照片已经显示的检测结果。'),
    clinical('cdc', '指标需要放回整体评估', 'CDC / NIOSH 的检查演示照片。个体风险讨论还需要相关临床资料；图片不代表该受检者存在风险，也不用于自动选择或排除治疗。'),
  ],
  'staging-tissue': [
    clinical('petMediastinal', 'CT 与 PET/CT：两类观察信息', '原论文图 2，上方为 CT、下方为 PET/CT 融合显示。用于辨别结构影像与代谢信息；原论文患者的病理结论不代入本站教学题。'),
    clinical('petLung', '影像可疑与组织证据', '原论文图 1 包含不同患者的两个 PET/CT 面板，并非同一病例连续层面。图像用于讨论证据层级，不据显示亮度直接宣布病理结果。'),
  ],
  'staging-systematic': [
    clinical('petLung', '一个突出区域不代表完整覆盖', '不同患者的 PET/CT 面板用于提出“还有哪些区域需评估”。不能把该拼图视为一次系统性分期记录，也不把所有亮区自动命名为淋巴结。'),
    clinical('petMediastinal', '记录范围，也核对取材质量', 'CT 与 PET/CT 融合显示提供影像观察背景。图中没有 EBUS/EUS 取材记录，因此不能从该图判断系统性取样或组织分期已经完成。'),
  ],
  'safety-confirm': [
    field('s01_energy_on_sheath', '从可见事实提出核查问题', '可见能量器械邻近膜性组织与管状轮廓。学习重点是明确哪些结构尚需辨认，不把截图中的器械位置转成操作指令。', 'step01_hilar_expose'),
    field('s02_enter_hilum', '视野与组织：证据在哪里', '器械与肺组织占据部分画面，可用于练习描述当前可见范围。未看见的结构不能靠手术顺序或经验模板补成已确认结论。'),
  ],
  'safety-response': [
    field('s02_pass_behind', '危险动作前的暂停意识', '可见器械与组织的空间关系。该常规教学帧不是重大出血事件录像，用于复习停止点与团队核查，不演示出血处置效果。'),
    field('s02_isolated', '确认不足时，明确提出疑虑', '可见器械邻近已显露区域。此帧不提供重大出血或转换入路的结局证据；升级处理原则应结合本节点文字与来源学习。'),
  ],
};
