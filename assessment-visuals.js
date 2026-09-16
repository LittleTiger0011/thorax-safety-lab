// Real imagery for every question. Numerical/hypothetical conditions remain
// separate from reference images; no source image is given a fabricated diagnosis.
export const VISUAL_VERSION='CLINICAL-IMAGES-2026.09.13-1';
const ct=(caseId,plane='axial',window='lung',extra={})=>({kind:'ct',caseId,plane,window,point:null,referenceOnly:true,...extra});
const still=(name,caption)=>({kind:'frame',src:`./or-field/clean/frames/${name}.jpg`,caption,referenceOnly:true});
const image=(asset,title,credit,source,license,caption)=>({kind:'clinical',src:`./assessment-clinical/${asset}`,title,credit,source,license,caption,referenceOnly:true});
const pet=image('pet-mediastinal.webp','真实 PET/CT · 纵隔观察','Chi & Nguyen · Frontiers in Oncology · 2014','https://doi.org/10.3389/fonc.2014.00273','https://creativecommons.org/licenses/by/4.0/','论文原图用于观察参考；本题取样与病理状态按资料卡判断。');
const petLung=image('pet-lung.jpg','真实 PET/CT · 胸部观察','Chi & Nguyen · Frontiers in Oncology · 2014','https://doi.org/10.3389/fonc.2014.00273','https://creativecommons.org/licenses/by/4.0/','论文原图用于观察参考；本题诊断与分期条件见资料卡。');
const functionTest=image('lung-function-test.jpg','肺功能检查 · 真实实拍','CDC / Veronica Burkel · PHIL 20950','https://wwwn.cdc.gov/phil/Details.aspx?pid=20950','public-domain','真实检查方法实拍；功能数值是本题教学设定，不是照片中受检者的结果。');
const spirometry=image('spirometry-clinical.jpg','肺功能检查 · 临床场景','Jmarchn · Wikimedia Commons','https://commons.wikimedia.org/wiki/File:DoingSpirometry.JPG','https://creativecommons.org/licenses/by-sa/3.0/','真实肺功能检查场景；本题功能数值为教学设定，不是照片中受检者的结果。');

const VISUALS={
 'segment-1':ct('CT-001','axial','lung',{sourcePoint:true}),
 'segment-2':ct('CT-006','coronal'),
 'segment-3':ct('CT-005','axial','lung',{sourcePoint:true}),
 'segment-4':ct('CT-002','coronal'),
 'vessels-1':ct('CT-004','axial','mediastinum'),
 'vessels-2':ct('CT-009','coronal','mediastinum'),
 'vessels-4':ct('CT-006','axial','mediastinum'),
 'vessels-5':ct('CT-010','coronal','mediastinum'),
 'vessels-6':ct('CT-003','axial','mediastinum'),
 'airway-1':ct('CT-004','coronal'),
 'airway-3':ct('CT-006','coronal'),
 'airway-4':ct('CT-009','axial'),
 'airway-5':ct('CT-015','coronal'),
 'airway-6':ct('CT-010','coronal'),
 'decision-1':ct('CT-004'),
 'decision-2':ct('CT-008'),
 'decision-3':ct('CT-006'),
 'decision-4':ct('CT-014'),
 'decision-5':ct('CT-007'),
 'decision-6':ct('CT-013'),
 'fitness-1':functionTest,'fitness-2':spirometry,'fitness-3':functionTest,
 'fitness-4':spirometry,'fitness-5':functionTest,'fitness-6':spirometry,
 'staging-1':pet,'staging-2':petLung,'staging-3':pet,
 'staging-4':pet,'staging-5':petLung,'staging-6':pet,
 'safety-2':still('s02_energy_pair','真实器械术野参考；出血事件与视野受限为题设情境。'),
 'safety-4':still('s01_energy_on_sheath','真实分离术野参考；转换入路的事件条件见资料卡。'),
 'safety-5':still('s03_stapler_ready','真实操作场景参考；团队核查时点按题干判断。'),
 'safety-6':ct('CT-012'),
 'orientation-5':ct('CT-011'),
};

export function attachClinicalVisuals(q,caseIndex){
 if(q.visual.kind!=='facts')return {...q,imageVersion:VISUAL_VERSION};
 const visual=VISUALS[q.id];if(!visual)throw new Error('题目缺少真实配图：'+q.id);
 let selected={...visual};
 if(selected.kind==='ct'){
  const c=caseIndex.cases.find(c=>c.id===selected.caseId);
  if(!c)throw new Error('题目配图缺少病例索引：'+selected.caseId);
  selected.ctSha256=c.ctSha256;
  selected.caption='匿名真实 CT 参考；本题病灶、功能与操作条件以病例资料为准。';
  if(selected.sourcePoint){Object.assign(selected,{point:c.point,answerCode:c.code,bit:c.bit,sourceAtlasSha256:c.sourceAtlasSha256,referenceOnly:false,caption:'与原有源区域核对的真实 CT 点位；作答期间关闭肺段名称与轮廓。'});delete selected.sourcePoint;}
 }
 return {...q,caseFacts:q.visual.rows,visual:selected,imageVersion:VISUAL_VERSION};
}
