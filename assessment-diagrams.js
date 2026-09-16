const maps={
 orientation:[['患者坐标','先看 R / L、头 / 足'],['观察平面','轴位 · 冠状位 · 矢状位'],['空间对应','核对同一位置的投影']],
 segment:[['确定肺叶','先确定左右与肺叶'],['追踪分支','由叶支气管到段支气管'],['核对肺段','多平面连续观察']],
 decision:[['资料充分吗','诊断 · 影像 · 分期'],['方案可行吗','切缘 · 功能 · 风险'],['个体讨论','方案取舍与患者偏好']],
 fitness:[['术前状态','FEV₁ + DLCO'],['预计术后','ppoFEV₁ + ppoDLCO'],['综合评估','心血管 · 运动 · 整体状态']],
 staging:[['影像信息','可疑区域与分期指征'],['组织分期','系统评估与适当取材'],['整合结果','标本质量 · 病理 · 治疗讨论']],
 safety:[['动作之前','目标与保留结构双确认'],['出现疑虑','停止危险动作并复核'],['需要升级','团队沟通与安全处置']]
};
export const MECHANISMS={
 normal:{title:'通路完整',text:'肺动脉承担灌注，肺静脉承担回流，气道承担通气。三条通路共同支持肺组织功能。',block:null},
 artery:{title:'肺动脉误闭',text:'下游肺组织的灌注受影响。管腔误闭和管壁开放性破裂是不同事件，不能都解释为胸腔出血。',block:'artery'},
 vein:{title:'肺静脉误闭',text:'回流受阻，可产生淤血等后果。即使没有开放破口，保留肺仍可能受到影响。',block:'vein'},
 airway:{title:'支气管误闭',text:'相应肺组织的通气受限。应沿上游支气管继续追踪，解释哪些保留肺受到影响。',block:'airway'}
};
export function lessonDiagram(skill){
 if(skill==='vessels'||skill==='airway')return `<figure class="al-concept-map"><figcaption>看懂三条通路 <small>机制关系示意</small></figcaption><div class="al-pathway-air" data-pathway-node="airway"><b>支气管</b><span>通气 ↓</span></div><div class="al-pathway-row"><div data-pathway-node="artery"><b>肺动脉</b><span>灌注</span></div><span aria-hidden="true">→</span><div class="al-pathway-lung"><b>肺组织</b><span>毛细血管床 / 气体交换</span></div><span aria-hidden="true">→</span><div data-pathway-node="vein"><b>肺静脉</b><span>回流</span></div></div><div class="al-pathway-controls" aria-label="比较不同机制">${Object.entries(MECHANISMS).map(([id,m])=>`<button data-action="pathway" data-id="${id}" aria-pressed="${id==='normal'}">${m.title}</button>`).join('')}</div><p class="al-pathway-note" role="status">${MECHANISMS.normal.text}</p>${skill==='airway'?'<div class="al-airway-branches"><strong>右主支气管</strong><div><span>右上叶支气管 → 右上叶</span><span>中间支气管 → 右中叶、右下叶</span></div></div>':''}</figure>`;
 const rows=maps[skill]||maps.segment;
 return `<figure class="al-concept-map"><figcaption>把判断过程串起来 <small>学习路径图</small></figcaption><div class="al-concept-nodes">${rows.map(([name,detail],i)=>`<div><span>0${i+1}</span><strong>${name}</strong><p>${detail}</p>${i<2?'<b aria-hidden="true">↓</b>':''}</div>`).join('')}</div></figure>`;
}
