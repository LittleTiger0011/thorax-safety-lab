import {SKILLS} from './assessment-data.js';
import {KNOWLEDGE_EDGES,prerequisitePath} from './knowledge-data.js';
import {learningSnapshot} from './learning-profile.js';
import {KNOWLEDGE_MEDIA,DOMAIN_COLORS} from './knowledge-media.js';
import {loadKnowledgeLibrary,libraryStats,topicText,heroMarkup,catalogMarkup,articleMarkup,sourcesMarkup} from './knowledge-library.js';
import {htmlEscape as esc} from './learning-insights.js';

const statusColor=n=>({unseen:'#69889f',weak:'#ff976f',recheck:'#e7c783',building:'#78caff',steady:'#77e6c6'})[n.state];
const WIDTH=1120,HEIGHT=990;

export class KnowledgeAtlas{
 constructor(root,api){this.root=root;this.api=api;this.operation=0;this.bank=null;this.selected='orientation-side';this.filter='all';this.query='';this.domain='all';this.pathOnly=false;this.motion=true;this.zoom=1;this.pan={x:0,y:0};this.cleanups=[];}
 async mount(nodeId){
  const op=++this.operation;this.stopMedia();this.root.querySelector('.kl-lightbox')?.close?.();this.destroyEvents();
  this.root.innerHTML='<div class="kg-loading" role="status"><span>◈</span><h1>正在连接知识图谱</h1><p>载入图文知识库与当前学习记录</p></div>';
  try{
   const [bank,library]=await Promise.all([this.api.getBank(),this.api.getLibrary?this.api.getLibrary():loadKnowledgeLibrary()]);if(op!==this.operation)return;this.bank=bank;this.library=library;
   this.snapshot=learningSnapshot(this.api.getSession(),this.bank);
   this.selected=this.snapshot.nodes.some(n=>n.id===nodeId)?nodeId:this.snapshot.weak[0]?.id||this.selected;
   if(!this.snapshot.nodes.some(n=>n.id===this.selected))this.selected=this.snapshot.nodes[0].id;
   this.filter='all';this.query='';this.domain='all';this.pathOnly=false;this.zoom=1;this.pan={x:0,y:0};
   this.render();
  }catch(error){if(op!==this.operation)return;this.root.innerHTML=`<div class="kg-loading"><h1>图谱暂未打开</h1><p>${esc(error.message)}</p><button id="kg-retry" class="primary">重新加载</button></div>`;this.root.querySelector('#kg-retry').onclick=()=>this.mount(nodeId);}
 }
 unmount(){++this.operation;this.stopMedia();this.root.querySelector('.kl-lightbox')?.close?.();this.destroyEvents();}
 stopMedia(){this.root.querySelectorAll('video').forEach(video=>video.pause?.());}
 destroyEvents(){this.cleanups.forEach(fn=>fn());this.cleanups=[];this.drag=null;}
 listen(target,type,handler,opts){target.addEventListener(type,handler,opts);this.cleanups.push(()=>target.removeEventListener(type,handler,opts));}
 render(){
  this.stopMedia();this.root.querySelector('.kl-lightbox')?.close?.();this.destroyEvents();const s=this.snapshot,{summary}=s,stats=libraryStats(this.library);
  this.root.innerHTML=`<div class="knowledge-atlas ${this.motion?'':'kg-motion-off'}">
   <figure class="kg-scene-banner" aria-hidden="true"><img src="./assets/scene/story.webp" alt="" width="1024" height="1536" decoding="async"></figure>
   <header class="kg-heading"><div><p class="kg-kicker"><span></span> THORAX / KNOWLEDGE ATLAS</p><h1>胸外科临床知识图谱<span>从影像，到理解。</span></h1><p>读真实影像，连通解剖、功能、分期与决策。每个知识点，都有图解与依据。</p></div><div class="kg-header-actions"><button class="outline" data-kg-action="refresh">刷新学情 ↻</button><button class="primary" data-kg-action="assessment">进入多维测评 ↗</button></div></header>
   <div class="kg-status-strip"><div><strong>08</strong><span>学习领域</span></div><div><strong>${stats.topics}</strong><span>图文章节</span></div><div><strong>${stats.sections}</strong><span>知识专题</span></div><div><strong>${stats.images}</strong><span>实景配图</span></div><div><strong>${stats.sources}</strong><span>依据来源</span></div><p>${stats.points} 条核心要点 · ${stats.videos} 段术野<br>内容核对 ${esc(this.library.checked)}</p></div>
   ${heroMarkup()}
   ${s.isDemo?'<div class="li-demo">当前展示教师演示记录，与个人学习画像分开。</div>':''}
   <section class="kg-console" aria-label="交互式知识图谱">
    <div class="kg-toolbar"><label class="kg-search"><span aria-hidden="true">⌕</span><input id="kg-search" type="search" placeholder="搜索知识、术语或指南" aria-label="搜索知识、术语或指南"></label><div class="kg-filters" role="group" aria-label="按学习状态筛选"><button data-kg-filter="all" aria-pressed="true">全部节点</button><button data-kg-filter="weak" aria-pressed="false">待巩固</button><button data-kg-filter="unseen" aria-pressed="false">尚未测评</button></div><button class="kg-motion" data-kg-action="motion" aria-pressed="${this.motion}">动效 · ${this.motion?'开':'关'}</button></div>
    <div class="kl-domain-filters" role="group" aria-label="按知识领域筛选"><button data-kg-domain="all" aria-pressed="true">全部领域</button>${SKILLS.map(skill=>`<button data-kg-domain="${skill.id}" aria-pressed="false" style="--domain:${DOMAIN_COLORS[skill.id]}"><i></i>${esc(skill.name)}</button>`).join('')}</div>
    <div class="kg-workspace"><div class="kg-map-column"><div class="kg-viewport"><div class="kg-map-caption"><span>16 CHAPTERS / 48 TOPICS</span><span id="kg-matches">16 / 16 节点</span></div>${this.graphMarkup()}<div class="kg-no-match" hidden><strong>没有匹配的知识点</strong><p>更换关键词或切回全部节点。</p></div><div class="kg-map-bottom"><div class="kg-legend"><span>主色区分领域 · 圆点显示学情</span><span><i style="background:#69889f"></i>待测</span><span><i style="background:#ff976f"></i>待巩固</span><span><i style="background:#77e6c6"></i>较稳</span></div><div class="kg-zoom"><button data-kg-action="zoom-out" aria-label="缩小图谱">−</button><output id="kg-zoom-value">100%</output><button data-kg-action="zoom-in" aria-label="放大图谱">＋</button><button data-kg-action="reset" aria-label="恢复完整图谱">复位</button></div></div></div>
     <div class="kg-map-help"><span>拖动平移 · 滚轮缩放 · 点击节点阅读图解</span><button data-kg-action="path" aria-pressed="false">只看前置路径</button></div>
     <label class="kg-node-picker">快速定位<select id="kg-node-select" aria-label="选择知识图谱节点">${SKILLS.map(skill=>`<optgroup label="${skill.name}">${s.nodes.filter(n=>n.skill===skill.id).map(n=>`<option value="${n.id}" ${n.id===this.selected?'selected':''}>${n.title} · ${n.status}</option>`).join('')}</optgroup>`).join('')}</select></label>
    </div><aside class="kg-detail" id="kg-detail" aria-label="当前知识点详情" aria-live="polite"></aside></div>
   </section>
   <div id="kg-reading"></div>
   ${catalogMarkup(this.library,s.nodes)}
   <section class="kg-pathways"><header><div><p class="kg-kicker">LEARNING ROUTES</p><h2>从一个节点，走向完整理解。</h2></div><p>连线由基础知识指向后续应用，表示建议学习顺序。</p></header><div>${[
    ['01','影像 → 定位 → 方案',['orientation-side','orientation-space','segment-trace','decision-conditions']],
    ['02','通路 → 保护 → 安全',['airway-route','airway-protect','safety-confirm','safety-response']],
    ['03','证据 → 分期 → 决策',['staging-tissue','staging-systematic','decision-evidence']],
   ].map(([number,title,ids])=>`<article><span>${number}</span><h3>${title}</h3><div class="kg-route-nodes">${ids.map(id=>{const n=s.nodes.find(n=>n.id===id);return `<button data-kg-read="${id}"><i style="background:${DOMAIN_COLORS[n.skill]}"></i>${n.title}</button>`;}).join('<b aria-hidden="true">→</b>')}</div></article>`).join('')}</div></section>
   ${sourcesMarkup(this.library)}
   <dialog class="kl-lightbox" aria-label="完整知识影像"><button data-kg-action="close-image" aria-label="关闭完整影像">×</button><div class="kl-lightbox-content"></div></dialog>
   <div class="kg-footer-note"><span>学情来自当前会话的真实记录。未测节点不显示预设分数。</span><span>关联路径帮助安排复习，不自动判定错因。</span></div>
  </div>`;
  this.bind();this.updateSelection();this.updateView();
 }
 graphMarkup(){
  const nodes=this.snapshot.nodes;
  const photoDefs=nodes.map(n=>`<clipPath id="kg-photo-${n.id}"><circle r="25"/></clipPath>`).join('');
  const edgeDefs=KNOWLEDGE_EDGES.map((e,i)=>`<linearGradient id="kg-link-${i}" gradientUnits="userSpaceOnUse" x1="${nodes.find(n=>n.id===e.from).x}" y1="${nodes.find(n=>n.id===e.from).y}" x2="${nodes.find(n=>n.id===e.to).x}" y2="${nodes.find(n=>n.id===e.to).y}"><stop stop-color="${DOMAIN_COLORS[nodes.find(n=>n.id===e.from).skill]}"/><stop offset="1" stop-color="${DOMAIN_COLORS[nodes.find(n=>n.id===e.to).skill]}"/></linearGradient>`).join('');
  const stars=Array.from({length:48},(_,i)=>`<circle cx="${(i*173+37)%WIDTH}" cy="${(i*89+43)%HEIGHT}" r="${i%7===0?1.6:.7}" opacity="${i%3===0?.5:.2}"/>`).join('');
  const edges=KNOWLEDGE_EDGES.map((edge,i)=>{
   const a=nodes.find(n=>n.id===edge.from),b=nodes.find(n=>n.id===edge.to),dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),x1=a.x+dx/d*21,y1=a.y+dy/d*21,x2=b.x-dx/d*24,y2=b.y-dy/d*24;
   return `<path class="kg-edge" data-from="${a.id}" data-to="${b.id}" style="--edge-paint:url(#kg-link-${i})" d="M ${x1} ${y1} Q ${(x1+x2)/2+(i%2?18:-18)} ${(y1+y2)/2} ${x2} ${y2}" marker-end="url(#kg-arrow)"/><path class="kg-flow" data-from="${a.id}" data-to="${b.id}" d="M ${x1} ${y1} Q ${(x1+x2)/2+(i%2?18:-18)} ${(y1+y2)/2} ${x2} ${y2}" style="--edge-paint:url(#kg-link-${i});animation-delay:-${i*.37}s"/>`;
  }).join('');
  return `<svg class="kg-svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-label="胸外科知识图谱，16 个知识点。可点击或使用下方快速定位选择。" role="group">
   <defs>${photoDefs}${edgeDefs}<radialGradient id="kg-nebula"><stop stop-color="#2166a0" stop-opacity=".23"/><stop offset="1" stop-color="#0b1725" stop-opacity="0"/></radialGradient><radialGradient id="kg-core"><stop stop-color="#163b53"/><stop offset="1" stop-color="#0a1a29"/></radialGradient><filter id="kg-glow"><feGaussianBlur stdDeviation="5"/></filter><marker id="kg-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#6e9cad"/></marker><pattern id="kg-grid" width="45" height="45" patternUnits="userSpaceOnUse"><path d="M45 0H0V45" fill="none" stroke="#4883a5" stroke-opacity=".075"/></pattern></defs>
   <rect width="1120" height="990" fill="url(#kg-grid)"/><ellipse cx="560" cy="475" rx="500" ry="380" fill="url(#kg-nebula)"/><g fill="#badfff" class="kg-stars">${stars}</g>
   <g class="kg-orbits" fill="none"><ellipse cx="560" cy="475" rx="435" ry="365"/><ellipse cx="560" cy="475" rx="250" ry="230"/><circle class="kg-orbit-spin" cx="560" cy="475" r="102"/></g>
   <g class="kg-edges">${edges}</g><g class="kg-center" aria-hidden="true"><circle cx="560" cy="475" r="80" fill="url(#kg-core)"/><circle class="kg-center-halo" cx="560" cy="475" r="84"/><text x="560" y="450">THORAX</text><text class="kg-center-name" x="560" y="482">临床知识</text><text class="kg-center-caption" x="560" y="510">CONNECT · UNDERSTAND</text></g>
   <g class="kg-node-layer">${nodes.map(n=>`<g class="kg-node ${n.state}" data-kg-node="${n.id}" role="button" tabindex="0" aria-pressed="false" aria-label="${n.title}，${n.status}${n.estimate===null?'':'，掌握估计 '+n.estimate+'%'}" style="--node-color:${DOMAIN_COLORS[n.skill]}" transform="translate(${n.x} ${n.y})"><title>${n.title} · ${n.status} · ${n.independent} 道独立题</title><circle class="kg-node-halo" r="38"/><circle class="kg-node-orbit" r="34"/><circle class="kg-node-dot" r="28"/><image class="kg-node-photo" href="${esc(KNOWLEDGE_MEDIA[n.id][0].src)}" x="-25" y="-25" width="50" height="50" preserveAspectRatio="xMidYMid slice" clip-path="url(#kg-photo-${n.id})" aria-hidden="true"/><circle class="kg-node-center" cx="24" cy="21" r="6" style="fill:${statusColor(n)}"/><rect class="kg-node-plate" x="-95" y="38" width="190" height="47" rx="8"/><text class="kg-node-name" y="58" text-anchor="middle">${n.title}</text><text class="kg-node-state" y="77" text-anchor="middle">3 专题 · ${n.estimate===null?'待测':n.estimate+'%'}</text></g>`).join('')}</g></svg>`;
 }
 bind(){
  this.listen(this.root,'click',event=>{
   const read=event.target.closest('[data-kg-read]');if(read){this.select(read.dataset.kgRead);this.scrollTo('#kg-article');return;}
   const picture=event.target.closest('[data-kg-image]');if(picture){this.openImage(picture.dataset.kgImage);return;}
   const section=event.target.closest('[data-kg-section]');if(section){this.scrollTo('#kg-section-'+section.dataset.kgSection);return;}
   const domain=event.target.closest('[data-kg-domain]');if(domain){this.domain=domain.dataset.kgDomain;this.updateSelection(false);return;}
   const node=event.target.closest('[data-kg-node]');if(node&&(!node.closest('.kg-svg')||!this.dragMoved)){this.select(node.dataset.kgNode);return;}
   const filter=event.target.closest('[data-kg-filter]');if(filter){this.filter=filter.dataset.kgFilter;this.updateSelection(false);return;}
   const button=event.target.closest('[data-kg-action]');if(!button)return;
   const action=button.dataset.kgAction;
   if(action==='read')this.scrollTo('#kg-article');
   if(action==='catalog')this.scrollTo('#kg-catalog');
   if(action==='close-image')this.root.querySelector('.kl-lightbox').close();
   if(action==='assessment')this.api.openAssessment();
   if(action==='practice'||action==='lesson')this.api.openAssessment(action,this.snapshot.nodes.find(n=>n.id===this.selected).skill);
   if(action==='refresh')this.mount(this.selected);
   if(action==='zoom-in')this.setZoom(this.zoom*1.2);
   if(action==='zoom-out')this.setZoom(this.zoom/1.2);
   if(action==='reset'){this.zoom=1;this.pan={x:0,y:0};this.updateView();}
   if(action==='motion'){this.motion=!this.motion;this.root.querySelector('.knowledge-atlas').classList.toggle('kg-motion-off',!this.motion);button.textContent=`动效 · ${this.motion?'开':'关'}`;button.setAttribute('aria-pressed',String(this.motion));}
   if(action==='path'){this.pathOnly=!this.pathOnly;button.setAttribute('aria-pressed',String(this.pathOnly));this.updateSelection(false);}
  });
  this.listen(this.root,'keydown',event=>{const node=event.target.closest('.kg-node');if(node&&['Enter',' '].includes(event.key)){event.preventDefault();this.select(node.dataset.kgNode);}});
  this.listen(this.root.querySelector('#kg-search'),'input',event=>{this.query=event.target.value.trim().toLowerCase();this.updateSelection(false);});
  this.listen(this.root.querySelector('#kg-node-select'),'change',event=>this.select(event.target.value));
  const svg=this.root.querySelector('.kg-svg');
  this.listen(svg,'wheel',event=>{if(event.ctrlKey||event.metaKey)return;event.preventDefault();this.setZoom(this.zoom*(event.deltaY<0?1.1:1/1.1));},{passive:false});
  this.listen(svg,'pointerdown',event=>{this.dragMoved=false;if(event.target.closest('[data-kg-node]')||event.button>0)return;this.drag={x:event.clientX,y:event.clientY,pan:{...this.pan},id:event.pointerId};svg.setPointerCapture?.(event.pointerId);});
  this.listen(svg,'pointermove',event=>{if(!this.drag||event.pointerId!==this.drag.id)return;const rect=svg.getBoundingClientRect(),scale=Math.max(WIDTH/rect.width,HEIGHT/rect.height)/this.zoom,dx=event.clientX-this.drag.x,dy=event.clientY-this.drag.y;this.dragMoved ||= Math.abs(dx)+Math.abs(dy)>4;this.pan={x:this.drag.pan.x-dx*scale,y:this.drag.pan.y-dy*scale};this.updateView();});
  const end=()=>{this.drag=null;};this.listen(svg,'pointerup',end);this.listen(svg,'pointercancel',end);
 }
 select(id){if(!this.snapshot.nodes.some(n=>n.id===id))return;this.selected=id;this.updateSelection();}
 updateSelection(renderDetail=true){
  const {nodes}=this.snapshot,selected=nodes.find(n=>n.id===this.selected),ancestors=new Set(prerequisitePath(this.selected)),neighbors=new Set(KNOWLEDGE_EDGES.filter(e=>e.from===this.selected||e.to===this.selected).flatMap(e=>[e.from,e.to]));ancestors.add(this.selected);neighbors.add(this.selected);
  const matches=new Set(nodes.filter(n=>(!this.query||(n.title+SKILLS.find(s=>s.id===n.skill).name+topicText(this.library.nodes.find(t=>t.id===n.id),this.library)).toLowerCase().includes(this.query))&&(this.domain==='all'||this.domain===n.skill)&&(this.filter==='all'||this.filter==='weak'&&['weak','recheck'].includes(n.state)||this.filter==='unseen'&&n.state==='unseen')&&(!this.pathOnly||ancestors.has(n.id))).map(n=>n.id));
  this.root.querySelectorAll('.kg-node').forEach(el=>{const id=el.dataset.kgNode;el.classList.toggle('is-selected',id===this.selected);el.classList.toggle('is-related',neighbors.has(id)||this.pathOnly&&ancestors.has(id));el.classList.toggle('is-muted',!matches.has(id));el.setAttribute('aria-pressed',String(id===this.selected));el.setAttribute('tabindex',matches.has(id)?'0':'-1');});
  this.root.querySelectorAll('.kg-edge,.kg-flow').forEach(el=>{const a=el.dataset.from,b=el.dataset.to,active=this.pathOnly?ancestors.has(a)&&ancestors.has(b):a===this.selected||b===this.selected;el.classList.toggle('is-active',active&&matches.has(a)&&matches.has(b));el.classList.toggle('is-muted',!matches.has(a)||!matches.has(b));});
  this.root.querySelectorAll('[data-kg-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kgFilter===this.filter)));
  this.root.querySelectorAll('[data-kg-domain]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kgDomain===this.domain)));
  this.root.querySelectorAll('[data-kg-card]').forEach(card=>card.hidden=!matches.has(card.dataset.kgCard));
  this.root.querySelector('.kl-catalog-empty').hidden=matches.size>0;
  this.root.querySelector('#kg-matches').textContent=`${matches.size} / 16 节点`;
  this.root.querySelector('.kg-no-match').hidden=matches.size>0;
  this.root.querySelector('#kg-node-select').value=this.selected;
  if(renderDetail)this.renderDetail(selected);
 }
 renderDetail(node){
  const topic=this.library.nodes.find(t=>t.id===node.id),media=KNOWLEDGE_MEDIA[node.id],skill=SKILLS.find(s=>s.id===node.skill),before=node.prerequisites.map(id=>this.snapshot.nodes.find(n=>n.id===id)),after=KNOWLEDGE_EDGES.filter(e=>e.from===node.id).map(e=>this.snapshot.nodes.find(n=>n.id===e.to));
  const chips=items=>items.map(n=>`<button data-kg-node="${n.id}"><i style="background:${DOMAIN_COLORS[n.skill]}"></i>${n.title}<span>↗</span></button>`).join('');
  this.root.querySelector('#kg-detail').innerHTML=`<p class="kg-kicker">SELECTED KNOWLEDGE / ${skill.short}</p><span class="kg-detail-domain" style="color:${DOMAIN_COLORS[node.skill]}">${skill.name}</span><h2>${node.title}</h2><p class="kg-detail-description">${node.description}</p><button class="kl-detail-image" data-kg-action="read" style="--domain:${DOMAIN_COLORS[node.skill]}"><img src="${esc(media[0].src)}" alt="${esc(media[0].title)}"><span>图文详解 · ${topic.references.length} 条来源 ↗</span></button><div class="kl-detail-topics">${topic.sections.map((section,i)=>`<button data-kg-section="${i}"><span>0${i+1}</span>${esc(section.title)}<b>↗</b></button>`).join('')}</div><button class="kl-read-button" data-kg-action="read" style="--domain:${DOMAIN_COLORS[node.skill]}">阅读本节完整图解 ↓</button><div class="kg-estimate ${node.state}"><div><strong>${node.estimate??'—'}${node.estimate===null?'':'<small>%</small>'}</strong><span>掌握估计</span></div><b>${node.status}</b></div><p class="kg-evidence-note">${node.independent?`基于 ${node.independent} 道首次未见题的独立作答，答对 ${node.correct} 道。`:'知识内容已开放；尚无独立作答证据，完成测评后更新学情。'}</p><div class="kg-detail-counts"><span><b>${node.reviewed}</b>辅助 / 复习</span><span><b>${node.highConfidenceErrors}</b>高信心错误</span></div><div class="kg-connections"><h3>建议先学 <span>${before.length}</span></h3>${before.length?chips(before):'<p>这是本图谱的基础起点，可从当前节点开始。</p>'}<h3>继续连接 <span>${after.length}</span></h3>${after.length?chips(after):'<p>可回到测评，用新的情境检验理解。</p>'}</div><div class="kg-detail-actions"><button class="primary" data-kg-action="practice">练习本领域 ↗</button><button class="outline" data-kg-action="lesson">打开领域微课</button></div><p class="kg-detail-foot">${node.correctedPending?'已有同题订正，仍需未见题验证。':'连线表示学习关联，不等同于错误根因。'}</p>`;
  this.stopMedia();this.root.querySelector('#kg-reading').innerHTML=articleMarkup(this.library,node);this.api.onLearnNode?.(node.id,this.library.version);
 }
 scrollTo(selector){const target=this.root.querySelector(selector);target?.scrollIntoView?.({behavior:this.motion?'smooth':'auto',block:'start'});target?.focus?.({preventScroll:true});}
 openImage(key){const [id,index]=key.split(':'),item=KNOWLEDGE_MEDIA[id]?.[Number(index)];if(!item)return;const dialog=this.root.querySelector('.kl-lightbox');this.root.querySelector('.kl-lightbox-content').innerHTML=`<img src="${esc(item.src)}" alt="${esc(item.title)}"><h3>${esc(item.title)}</h3><p>${esc(item.caption)}</p><small>${esc(item.credit)} · ${esc(item.license||'本站课程影像')} · <a href="${esc(item.source)}" target="_blank" rel="noopener">影像来源 ↗</a></small>`;dialog.showModal?.();}
 setZoom(value){this.zoom=Math.max(.65,Math.min(2.6,value));this.updateView();}
 updateView(){const width=WIDTH/this.zoom,height=HEIGHT/this.zoom;this.pan.x=Math.max(-WIDTH*.6,Math.min(WIDTH*.6,this.pan.x));this.pan.y=Math.max(-HEIGHT*.6,Math.min(HEIGHT*.6,this.pan.y));this.root.querySelector('.kg-svg')?.setAttribute('viewBox',`${(WIDTH-width)/2+this.pan.x} ${(HEIGHT-height)/2+this.pan.y} ${width} ${height}`);const label=this.root.querySelector('#kg-zoom-value');if(label)label.textContent=Math.round(this.zoom*100)+'%';}
}
