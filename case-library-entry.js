// Keep the course entry synchronized with the case catalog after each import.
const banner=document.querySelector('.real-case-banner');
if(banner){
  try{
    const response=await fetch('./real-cases/catalog.json');if(!response.ok)throw new Error('Catalog unavailable');
    const catalog=await response.json();
    if(![catalog.caseCount,catalog.sliceCount,catalog.structureCount].every(n=>Number.isSafeInteger(n)&&n>0))throw new Error('Invalid case counts');
    const fmt=new Intl.NumberFormat('zh-CN');
    banner.querySelector('strong').textContent=`${fmt.format(catalog.caseCount)} 例真实 CT 与配套三维重建`;
    banner.querySelector('p').textContent=`${fmt.format(catalog.sliceCount)} 层影像 · ${fmt.format(catalog.structureCount)} 个结构/源标注 · 调窗、逐层浏览与空间对照`;
  }catch{/* The last verified counts in the HTML remain available offline. */}
}
