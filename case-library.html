const empty=document.getElementById('ct-empty');
const status=document.getElementById('load-status');
const tip=document.getElementById('browser-tip');
const wechat=/MicroMessenger|QQ\//i.test(navigator.userAgent);
if(empty)empty.textContent='正在载入真实 CT…';
if(status)status.textContent='正在载入页面…';
if(wechat&&tip)tip.hidden=false;
import('./case-library.js?v=ct2').catch(()=>{
  const msg=wechat
    ?'当前窗口无法载入 CT。请点右上角 ···，选择“在 Safari / 浏览器中打开”。'
    :'页面脚本载入失败。请刷新，或换手机自带 Safari / Chrome 打开。';
  if(empty){empty.hidden=false;empty.textContent=msg;}
  if(status)status.textContent=msg;
  document.getElementById('case-message')?.classList.add('error');
  const retry=document.getElementById('retry-load');
  if(retry){retry.hidden=false;retry.onclick=()=>location.reload();}
});
