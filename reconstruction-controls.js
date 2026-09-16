import {ReconstructionMaterials,reconstructionTargets,TRANSLUCENT_OPACITY,UNSTAINED_COLOR} from './reconstruction-materials.js';

const $=id=>document.getElementById(id);
export class ReconstructionControls{
  constructor(api){
    this.api=api;this.materials=new ReconstructionMaterials();this.targets=[];this.choices=new Map();
    $('reconstruction-target').addEventListener('change',()=>{this.choices.set(this.materials.caseId,$('reconstruction-target').value);this.sync();});
    for(const b of document.querySelectorAll('[data-surface-action]'))b.addEventListener('click',()=>this.edit(b.dataset.surfaceAction));
    $('reconstruction-color').addEventListener('input',e=>this.edit('color',e.target.value));
    $('reconstruction-opacity').addEventListener('input',e=>this.edit('opacity',Number(e.target.value)/100));
    $('reconstruction-visible').addEventListener('change',e=>this.edit('visibility',e.target.checked));
    $('reconstruction-locate').addEventListener('click',()=>{const target=this.target;if(!target?.ids.length)return;this.edit('visibility',true);if(target.ids.length===1)this.api.focus(target.ids[0]);else if(target.key.startsWith('segment:'))this.api.focusSegment(target.key.slice(8));});
    $('reconstruction-reset').addEventListener('click',()=>this.api.reset());
    this.unbind();
  }
  get target(){return this.targets.find(t=>t.key===$('reconstruction-target').value);}
  bind(caseId,meshes){
    this.materials.bind(caseId,meshes);this.targets=reconstructionTargets([...meshes.values()].map(v=>v.meta));
    const select=$('reconstruction-target');select.replaceChildren();let section,group;
    for(const target of this.targets){
      if(section!==target.section){section=target.section;group=document.createElement('optgroup');group.label=section;select.append(group);}
      const option=document.createElement('option');option.value=target.key;option.disabled=!target.ids.length;
      option.textContent=target.label+(target.ids.length?'':' · 未提供源模型');group.append(option);
    }
    select.value=this.choices.get(caseId)||'all:lobes';
    const missing=this.targets.filter(t=>t.key.startsWith('lobe:')&&!t.ids.length).map(t=>t.label);
    const leaves=this.targets.find(t=>t.key==='all:lobes').ids.length,parts=this.targets.find(t=>t.key==='all:segments').ids.length;
    const parents=this.targets.filter(t=>t.key.startsWith('segment:')&&t.ids.length).length;
    $('reconstruction-coverage').textContent=`本例 ${leaves} 个肺叶 · ${parents} 个肺段汇总 · ${parts} 个源肺段 / 亚段模型${missing.length?'；未提供：'+missing.join('、'):''}。`;
    this.sync();
  }
  unbind(){this.materials.unbind();this.targets=[];$('reconstruction-target').replaceChildren();$('reconstruction-coverage').textContent='载入本例肺叶与肺段模型…';this.sync();}
  edit(action,value){const target=this.target;if(!target?.ids.length)return;this.materials.edit(target.ids,action,value);this.api.changed();this.sync();}
  apply(){this.materials.apply();this.sync();}
  reset(){this.materials.reset();}
  reveal(id){this.materials.reveal(id);}
  setVisibility(id,visible){this.materials.edit([id],'visibility',visible);this.sync();}
  setLobeOpacity(opacity){this.materials.edit(this.targets.find(t=>t.key==='all:lobes')?.ids||[],'opacity',opacity);this.sync();}
  sync(){
    const target=this.target,ready=Boolean(target?.ids.length),states=(target?.ids||[]).map(id=>this.materials.current(id)).filter(Boolean);
    for(const control of document.querySelectorAll('#reconstruction-controls input,#reconstruction-controls select,#reconstruction-controls button'))control.disabled=!ready;
    if(!ready){$('reconstruction-state').textContent='等待重建模型';return;}
    const same=(key)=>states.every(s=>s[key]===states[0][key]),state=states[0];
    $('reconstruction-color').value=same('color')?state.color:(this.materials.meshes.get(target.ids[0]).meta.sourceColor||state.color);
    $('reconstruction-color').title=same('color')?'调整所选结构颜色':'所选结构颜色不同；选择新颜色可统一染色';
    $('reconstruction-opacity').value=String(Math.round(state.opacity*100));
    $('reconstruction-opacity-value').textContent=same('opacity')?`${Math.round(state.opacity*100)}%`:'混合';
    $('reconstruction-visible').checked=states.every(s=>s.visible);$('reconstruction-visible').indeterminate=!same('visible');
    $('reconstruction-locate').disabled=target.key.startsWith('all:');
    const all=predicate=>states.every(predicate);
    for(const b of document.querySelectorAll('[data-surface-action]')){
      const active=b.dataset.surfaceAction==='solid'?all(s=>s.visible&&s.opacity===1):b.dataset.surfaceAction==='translucent'?all(s=>s.visible&&Math.abs(s.opacity-TRANSLUCENT_OPACITY)<.001):b.dataset.surfaceAction==='clear-color'?all(s=>s.color===UNSTAINED_COLOR&&!s.stained):false;
      b.setAttribute('aria-pressed',String(active));
    }
    const mode=!same('visible')?'部分显示':!state.visible?'已隐藏':!same('opacity')?'混合透明度':state.opacity===1?'实性':state.opacity===0?'完全透明':`半透明 ${Math.round(state.opacity*100)}%`;
    const color=!same('color')?'多色':all(s=>!s.stained)?'已去除染色':'已染色';
    $('reconstruction-state').textContent=`${target.label} · ${mode} · ${color}`;
  }
}
