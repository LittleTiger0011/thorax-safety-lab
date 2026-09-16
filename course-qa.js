import {KNOWLEDGE_NODES} from './knowledge-data.js';

const DEEPSEEK_URL='https://chat.deepseek.com/';
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const normalize=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/[₀-₉]/g,c=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(c));
const suggestions=['肺段和肺叶有什么区别？','FEV1 和 DLCO 有什么区别？','为什么要保护余肺静脉？','PET 阳性就能确定淋巴结转移吗？'];
const aliases=[['肺功能','fev1','dlco','弥散','通气'],['肺段','段切','s1','s2','rs2'],['静脉','回流','引流'],['pet','淋巴结','分期','转移'],['左右','侧别','方向'],['出血','压迫','升级'],['气道','支气管','通气'],['切除','段切','叶切','切缘']];
let libraryPromise;
async function loadLibrary(){
 if(!libraryPromise)libraryPromise=fetch('./knowledge-library.json').then(async response=>{
  if(!response.ok)throw new Error('课程资料暂未加载成功');
  const data=await response.json();
  if(!Array.isArray(data.nodes)||!Array.isArray(data.sources))throw new Error('课程资料格式不完整');
  return data;
 }).catch(error=>{libraryPromise=null;throw error;});
 return libraryPromise;
}

// Return actual course excerpts. This is a small local search, not a model response.
export function searchCourse(library,question){
 const query=normalize(question).replace(/为什么|是什么|有什么|怎么办|如何|怎么|请问|请解释|帮我|一下|可以|是否|什么|区别|吗|呢|的|了|和|与|及|就|能|要|在/g,' ');
 const terms=new Set(query.match(/[a-z]+\d*|\d+[a-z]+/g)||[]);
 for(const word of query.match(/[\u4e00-\u9fff]+/g)||[]){
  if(word.length>=2)terms.add(word);
  for(let i=0;i<word.length-1;i++)terms.add(word.slice(i,i+2));
 }
 if(!terms.size)return [];
 const related=new Set();
 for(const group of aliases)if(group.some(term=>normalize(question).includes(term)))for(const term of group)if(!terms.has(term))related.add(term);
 const weight=term=>term==='ct'?.4:term.length>2?3:2;
 const scoreText=text=>{const value=normalize(text);let score=0;for(const term of terms)if(value.includes(term))score+=weight(term);for(const term of related)if(value.includes(term))score+=.7;return score;};
 const candidates=[];
 for(const topic of library.nodes){
  const node=KNOWLEDGE_NODES.find(n=>n.id===topic.id);if(!node)continue;
  for(const section of topic.sections||[]){
   const text=[node.title,section.title,...section.points].join(' ');
   if(![...terms].some(term=>normalize(text).includes(term)))continue;
   const coverage=[...terms].reduce((sum,term)=>sum+(normalize(text).includes(term)?weight(term)*2:0),0);
   const score=coverage+scoreText(node.title)*2+scoreText(section.title)*1.3+scoreText(section.points.join(' '));
   if(score<2)continue;
   candidates.push({id:topic.id,title:node.title,section:section.title,points:section.points,sourceIds:section.sources||topic.references||[],score});
  }
 }
 const seen=new Set(),ranked=candidates.sort((a,b)=>b.score-a.score),minimum=(ranked[0]?.score||0)*.55;
 return ranked.filter(item=>{if(item.score<minimum||seen.has(item.id))return false;seen.add(item.id);return true;}).slice(0,3);
}

export function buildQuestionPack(question,results,library){
 const excerpts=results.map((item,index)=>{
  const sources=item.sourceIds.map(id=>library.sources.find(source=>source.id===id)).filter(Boolean);
  return `[课程资料 ${index+1}] ${item.title} / ${item.section}\n${item.points.map(point=>'• '+point).join('\n')}\n${sources.map(source=>`依据：${source.title}${/^https:\/\//.test(source.url)?' '+source.url:''}`).join('\n')}`;
 }).join('\n\n');
 return `你是胸外科课程学习助教。请用中文回答我的课程问题，先解释概念，再结合下面的课程资料说明理由，最后列出易混淆点。引用资料编号；资料不足时明确说明，不编造本站病例信息。仅用于学习讨论，不作为个体诊疗建议。\n\n我的问题：${question}\n\n${excerpts||'本站暂未检索到匹配资料，请先澄清问题并说明回答依据。'}\n\n说明：以上为本站课程原文摘录，未包含个人学习记录或患者资料。`;
}

export function mountCourseQA(root,{onRead=()=>{}}={}){
 let active=true,request=0,current=null;
 root.innerHTML=`<section class="course-qa no-print" aria-labelledby="course-qa-title">
  <header class="qa-heading"><div class="qa-title"><span class="qa-mark" aria-hidden="true">✦</span><div><div class="qa-title-line"><h2 id="course-qa-title">AI答疑</h2><span class="qa-badge">DeepSeek 入口</span></div><p>带着问题读课程，把不懂的地方问明白。</p></div></div><a class="qa-deepseek" href="${DEEPSEEK_URL}" target="_blank" rel="noopener noreferrer">打开 DeepSeek <span aria-hidden="true">↗</span></a></header>
  <form class="qa-form"><label for="course-qa-question">你想了解什么？</label><div class="qa-input-row"><textarea id="course-qa-question" rows="2" maxlength="500" placeholder="例如：肺功能正常，为什么还要看 DLCO？" required aria-describedby="course-qa-note"></textarea><button type="submit" class="qa-search">查找课程解答 <span aria-hidden="true">→</span></button></div></form>
  <div class="qa-suggestions" aria-label="常见课程问题"><span>试着问</span>${suggestions.map((text,index)=>`<button type="button" data-qa-suggestion="${index}">${esc(text)}</button>`).join('')}</div>
  <p id="course-qa-note" class="qa-note">本站检索课程原文；AI 对话在 DeepSeek 网页进行，按需登录。可复制问题与资料后粘贴提问。</p>
  <p class="qa-status" role="status" aria-live="polite"></p><div class="qa-results" hidden></div>
  <div class="qa-transfer" hidden><div><strong>想再讲通俗一点？带着资料继续问。</strong><p>复制后打开 DeepSeek，粘贴并发送即可。</p></div><button type="button" class="qa-copy">复制问题与课程资料</button></div>
  <div class="qa-manual" hidden><label for="course-qa-pack">自动复制不可用，请选中下方文字手动复制</label><textarea id="course-qa-pack" rows="6" readonly></textarea></div>
 </section>`;
 const $=selector=>root.querySelector(selector),input=$('#course-qa-question'),status=$('.qa-status'),results=$('.qa-results'),transfer=$('.qa-transfer'),manual=$('.qa-manual');
 const setBusy=busy=>{$('.qa-search').disabled=busy;$('.qa-search').textContent=busy?'正在查找…':'查找课程解答 →';results.setAttribute('aria-busy',String(busy));};
 const reset=()=>{request++;current=null;results.hidden=true;transfer.hidden=true;manual.hidden=true;status.textContent='';setBusy(false);};
 input.addEventListener('input',reset);
 async function lookup(){
  const question=input.value.trim().slice(0,500);if(!question){status.textContent='请先输入一个课程问题。';input.focus();return;}
  const ticket=++request;current=null;results.hidden=true;transfer.hidden=true;manual.hidden=true;setBusy(true);status.textContent='正在课程知识库中查找相关内容…';
  try{
   const library=await loadLibrary();if(!active||ticket!==request)return;
   const matches=searchCourse(library,question);
   current={question,pack:buildQuestionPack(question,matches,library)};
   results.innerHTML=matches.length?`<div class="qa-result-heading"><h3>相关课程解答</h3><span>课程原文摘录 · ${matches.length} 个章节</span></div>${matches.map((item,index)=>`<article class="qa-result"><span class="qa-result-number">0${index+1}</span><div><h4>${esc(item.section)}</h4><ul>${item.points.map(point=>`<li>${esc(point)}</li>`).join('')}</ul><a href="./safety-training.html?route=knowledge&amp;node=${encodeURIComponent(item.id)}">出处：${esc(item.title)} · 阅读完整章节 ↗</a></div></article>`).join('')}`:'<p class="qa-empty">暂未找到足够匹配的课程内容。试试“肺段”“静脉”“DLCO”或“淋巴结”等关键词，也可以复制问题去 DeepSeek 继续问。</p>';
   results.hidden=false;transfer.hidden=false;status.textContent=matches.length?'已找到相关原文，可结合完整章节核对。':'没有匹配的课程解答。';
   if(matches.length)Promise.resolve(onRead(matches.map(item=>item.id),library.version)).catch(()=>{});
  }catch{if(active&&ticket===request){status.textContent='课程资料暂未加载成功，请重试。也可以直接打开 DeepSeek 提问。';}}
  finally{if(active&&ticket===request)setBusy(false);}
 }
 $('.qa-form').addEventListener('submit',event=>{event.preventDefault();lookup();});
 root.querySelectorAll('[data-qa-suggestion]').forEach(button=>button.addEventListener('click',()=>{input.value=suggestions[Number(button.dataset.qaSuggestion)];lookup();}));
 $('.qa-copy').addEventListener('click',async()=>{
  const prepared=current;if(!prepared)return;
  try{
   if(!globalThis.navigator?.clipboard?.writeText)throw new Error('Clipboard unavailable');
   await navigator.clipboard.writeText(prepared.pack);
   if(active&&current===prepared)status.textContent='已复制问题与课程资料。点击“打开 DeepSeek”，粘贴后发送即可。';
  }catch{
   if(!active||current!==prepared)return;
   manual.hidden=false;$('#course-qa-pack').value=prepared.pack;$('#course-qa-pack').focus();$('#course-qa-pack').select();status.textContent='请手动复制已选中的问题与课程资料。';
  }
 });
 return {destroy(){active=false;request++;}};
}
