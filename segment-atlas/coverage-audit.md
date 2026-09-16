# 15 例真实病例肺段标注核查

已逐个读取原始病例包，源 CT、网格未修改。359 个源结构全部导入，其中 210 个肺段／亚段网格均进入逐层覆盖图。未发现遗漏的源网格或其他隐藏分割数据。

以下按本库 18 组教学标签核对覆盖；该数字不代表固定的正常肺段数量。LS7 为命名专题，源病例均无独立 LS7 网格。

“有源标注”只说明该病例导出了相应网格，不证明整个肺段或全部亚段已完整分割。未提供的标签不能凭邻近区域、固定角度或其他患者的模型补成确定答案。

| 病例 | 已提供的父段标签 | 未提供的库内标签 | 源肺段／亚段网格 |
|---|---|---|---:|
| CT-001 | RS1、RS2、RS3、RS6、RS7、RS8、RS9、RS10、LS1+2、LS3、LS4、LS5、LS6、LS8、LS9、LS10 | RS4、RS5 | 37 |
| CT-002 | LS1+2、LS3、LS4、LS5 | RS1、RS2、RS3、RS4、RS5、RS6、RS7、RS8、RS9、RS10、LS6、LS8、LS9、LS10 | 10 |
| CT-003 | RS6、RS7、RS8、RS9、RS10、LS1+2、LS3、LS4、LS5 | RS1、RS2、RS3、RS4、RS5、LS6、LS8、LS9、LS10 | 19 |
| CT-004 | RS1、RS2、RS3 | RS4、RS5、RS6、RS7、RS8、RS9、RS10、LS1+2、LS3、LS4、LS5、LS6、LS8、LS9、LS10 | 6 |
| CT-005 | RS1、RS2、RS3、LS1+2、LS3、LS4、LS5、LS6、LS8、LS9、LS10 | RS4、RS5、RS6、RS7、RS8、RS9、RS10 | 21 |
| CT-006 | RS1、RS2、RS3、RS4、RS5 | RS6、RS7、RS8、RS9、RS10、LS1+2、LS3、LS4、LS5、LS6、LS8、LS9、LS10 | 8 |
| CT-007 | RS6、RS7、RS8、RS9、RS10 | RS1、RS2、RS3、RS4、RS5、LS1+2、LS3、LS4、LS5、LS6、LS8、LS9、LS10 | 11 |
| CT-008 | LS1+2、LS3、LS4、LS5 | RS1、RS2、RS3、RS4、RS5、RS6、RS7、RS8、RS9、RS10、LS6、LS8、LS9、LS10 | 8 |
| CT-009 | RS1、RS2、RS3、RS6、RS7、RS8、RS9、RS10 | RS4、RS5、LS1+2、LS3、LS4、LS5、LS6、LS8、LS9、LS10 | 16 |
| CT-010 | RS6、RS7、RS8、RS9、RS10 | RS1、RS2、RS3、RS4、RS5、LS1+2、LS3、LS4、LS5、LS6、LS8、LS9、LS10 | 11 |
| CT-011 | RS6、RS7、RS8、RS9、RS10、LS6、LS8、LS9、LS10 | RS1、RS2、RS3、RS4、RS5、LS1+2、LS3、LS4、LS5 | 18 |
| CT-012 | LS6、LS8、LS9、LS10 | RS1、RS2、RS3、RS4、RS5、RS6、RS7、RS8、RS9、RS10、LS1+2、LS3、LS4、LS5 | 9 |
| CT-013 | RS6、RS7、RS8、RS9、RS10 | RS1、RS2、RS3、RS4、RS5、LS1+2、LS3、LS4、LS5、LS6、LS8、LS9、LS10 | 11 |
| CT-014 | LS1+2、LS3、LS4、LS5 | RS1、RS2、RS3、RS4、RS5、RS6、RS7、RS8、RS9、RS10、LS6、LS8、LS9、LS10 | 8 |
| CT-015 | RS1、RS2、RS3、RS6、RS7、RS8、RS9、RS10 | RS4、RS5、LS1+2、LS3、LS4、LS5、LS6、LS8、LS9、LS10 | 17 |

轴位、冠状位、矢状位共核查 9,655 个 CT 网格层面，包含小于 18 个采样像素的细小截面。每层的名称集合由本例真实源覆盖决定。

## 完整中文名词

右上叶：RS1 尖段；RS2 后段；RS3 前段。
右中叶：RS4 外侧段；RS5 内侧段。
右下叶：RS6 背段（上段）；RS7 内基底段；RS8 前基底段；RS9 外基底段；RS10 后基底段。
左上叶：LS1+2 尖后段；LS3 前段；LS4 上舌段；LS5 下舌段。
左下叶：LS6 背段（上段）；LS7 内基底段／合并命名专题；LS8 前基底段（沿用源 LS8）；LS9 外基底段；LS10 后基底段。

## 补齐每例全部肺段所需资料

需要与当前 CT 坐标对应的完整肺段／亚段分割网格或标签体数据，以及对应名称。现有病例未提供的部分，需补充源分割或由医学人员逐例标注审核；本轮未生成推测边界。
