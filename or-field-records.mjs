// Separate attempt storage, shared by the field trainer and main report. No DOM.
export const OR_FIELD_KEY='thorax.orField.sessions.v2';
export const OR_FIELD_LEGACY_KEY='thorax-or-field-log-v1';
export const GENERATION_KEY='thorax.records.generation';
export const generation=storage=>storage.getItem(GENERATION_KEY)||'0';
export function loadOrStore(storage){
 const raw=storage.getItem(OR_FIELD_KEY);
 let store={schema:2,attempts:[]};
 if(raw){try{store=JSON.parse(raw);if(store.schema!==2||!Array.isArray(store.attempts)||store.attempts.some(a=>!a||typeof a.id!=='string'||!Array.isArray(a.log)))throw Error();}catch{return {...store,schema:2,attempts:[],error:'术野记录格式异常；原文保留，请先导出备份。',raw};}}
 const old=storage.getItem(OR_FIELD_LEGACY_KEY);
 if(old&&!store.attempts.some(a=>a.id==='legacy-v1')){try{const a=JSON.parse(old);if(Array.isArray(a.log))store.attempts.push({...a,id:'legacy-v1',ownerId:null,kind:'legacy-unassigned',legacy:true});}catch{store.legacyError='旧版术野记录无法解析；原文保留。';}}
 return store;
}
export function upsertOrAttempt(storage,attempt){
 try{
  if(attempt.generation!==generation(storage))return {ok:false,error:'本机记录已清除，请重新打开页面开始新记录。'};
  const store=loadOrStore(storage);if(store.error)return {ok:false,error:store.error};
  const i=store.attempts.findIndex(a=>a.id===attempt.id),copy=JSON.parse(JSON.stringify(attempt));
  if(i<0)store.attempts.push(copy);else store.attempts[i]=copy;
  storage.setItem(OR_FIELD_KEY,JSON.stringify(store));return {ok:true};
 }catch{return {ok:false,error:'保存失败，请立即导出本次记录。'};}
}
export const attemptsForOwner=(store,id,kind)=>store.attempts.filter(a=>a.ownerId===id&&a.kind===kind);
export function clearLearningRecords(storage){
 try{
  storage.setItem(GENERATION_KEY,`${Date.now()}-${Math.random()}`);
  for(const key of ['thorax.safety.sessions.v1',OR_FIELD_KEY,OR_FIELD_LEGACY_KEY])storage.removeItem(key);
  return {ok:true};
 }catch{return {ok:false,error:'部分记录未能清除，请重试；尚未宣布清除完成。'};}
}
