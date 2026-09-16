/** Original teaching phantom. Coordinates: +X patient left, +Y superior, +Z anterior.
 * The same fields define surfaces, CT labels and every camera. Not patient DICOM.
 * Branching is a deliberately simplified teaching pattern; review status in content.js.
 */
export const MODEL_VERSION='TP-2026.09.12-1';
export const COLORS={artery:0x688ee8,vein:0xe26d83,bronchus:0xe8d7b2,lung:0x70bfc4};
export const LOBES=[
 {id:'rul',name:'右上叶',short:'RUL',color:0x65c7ca,center:[-4,2,0]},
 {id:'rml',name:'右中叶',short:'RML',color:0xe5b971,center:[-4,-1,1.5]},
 {id:'rll',name:'右下叶',short:'RLL',color:0x6f94c5,center:[-4,-3,-.6]},
 {id:'lul',name:'左上叶',short:'LUL',color:0x8abdb1,center:[4,2,0]},
 {id:'lll',name:'左下叶',short:'LLL',color:0x9e9dc9,center:[4,-3,-.6]},
];
const b=(id,name,type,points,radius,parent,territory,description)=>({id,name,type,points,radius,parent,territory,description,color:COLORS[type],center:points[Math.floor(points.length/2)]});
export const BRANCHES=[
 b('trachea','气管','bronchus',[[0,7,-.3],[0,5,-.3],[0,3,-.3]],.48,null,[],'沿气管向尾侧寻找隆嵴，再辨认左右主支气管。'),
 b('rmb','右主支气管','bronchus',[[0,3,-.3],[-.8,2.4,-.35],[-1.6,1.8,-.4]],.43,'trachea',['rul','rml','rll'],'右主支气管发出上叶支气管后延续为中间支气管。'),
 b('rub','右上叶支气管','bronchus',[[-1.6,1.8,-.4],[-2.4,2.05,-.5],[-3.1,2.5,-.55]],.31,'rmb',['rul'],'目标分支通向右上叶；比较其与向尾侧延续的中间支气管。'),
 b('b1','B1 尖段支气管','bronchus',[[-3.1,2.5,-.55],[-3.6,3.5,-.3],[-4.1,4.55,-.2]],.17,'rub',['s1'],'右上叶尖段通路的简化示意。'),
 b('b2','B2 后段支气管','bronchus',[[-3.1,2.5,-.55],[-4,2.4,-1.3],[-5.1,2.1,-1.9]],.17,'rub',['s2'],'右上叶后段通路的简化示意。'),
 b('b3','B3 前段支气管','bronchus',[[-3.1,2.5,-.55],[-4,1.9,.7],[-5.2,1.35,1.7]],.18,'rub',['s3'],'右上叶前段通路的简化示意。'),
 b('bi','中间支气管','bronchus',[[-1.6,1.8,-.4],[-2.05,.55,-.65],[-2.2,-.9,-.8]],.35,'rmb',['rml','rll'],'仍为右中、下叶输送气体，是右上叶切除时应保护的通路。'),
 b('bml','右中叶支气管','bronchus',[[-2.2,-.9,-.8],[-3,-1.15,.55],[-4.1,-1.4,1.5]],.22,'bi',['rml'],'通向中叶的保留支气管。'),
 b('bll','右下叶支气管','bronchus',[[-2.2,-.9,-.8],[-3.15,-2.2,-.95],[-4.3,-3.85,-.7]],.27,'bi',['rll'],'通向下叶的保留支气管。'),
 b('lmb','左主支气管','bronchus',[[0,3,-.3],[1.25,1.8,-.6],[2.25,.8,-.8]],.39,'trachea',['lul','lll'],'左侧示意分支用于胸廓方向与五叶定位。'),
 b('blul','左上叶支气管','bronchus',[[2.25,.8,-.8],[3.4,2,-.4],[4.4,3,.2]],.26,'lmb',['lul'],'左侧背景结构，非本课精细解剖目标。'),
 b('blll','左下叶支气管','bronchus',[[2.25,.8,-.8],[3.2,-1.6,-.9],[4.5,-3.5,-.7]],.27,'lmb',['lll'],'左侧背景结构，非本课精细解剖目标。'),
 b('pa','肺动脉干','artery',[[.2,-1.4,1.25],[.15,.2,1.2],[.1,1.25,1]],.5,null,[],'教学染色以蓝色表示肺动脉；颜色不等于术中自然外观。'),
 b('rpa','右肺动脉','artery',[[.1,1.25,1],[-.85,1.3,.4],[-2.2,1.3,.25]],.37,'pa',['rul','rml','rll'],'沿起源、走行与供血区域追踪；不可只依赖颜色。'),
 b('a13','右上叶前干示意','artery',[[-2.2,1.3,.25],[-2.65,2.2,.4],[-3.7,3.45,.6]],.27,'rpa',['rul'],'本体模中供应右上叶的前干示意，分型不作为普适标准。'),
 b('a1','A1 尖段动脉示意','artery',[[-3.7,3.45,.6],[-4.05,4.2,.6],[-4.3,4.7,.5]],.13,'a13',['s1'],'只展开本单元需要的供血关系。'),
 b('a3','A3 前段动脉示意','artery',[[-2.65,2.2,.4],[-3.7,1.65,1.2],[-4.9,1.05,1.95]],.16,'a13',['s3'],'追踪至前段区域，不凭颜色做离断判断。'),
 b('interlobar','右叶间动脉','artery',[[-2.2,1.3,.25],[-2.8,.15,-1.3],[-3.35,-2.3,-1.35]],.30,'rpa',['rml','rll'],'延续至保留肺的血流通道，应在目标分支辨认中保护。'),
 b('a2','A2 后升支示意','artery',[[-2.8,.15,-1.3],[-3.5,1.15,-1.6],[-4.8,1.7,-2.15]],.17,'interlobar',['s2'],'本体模展示一种后段供血示意；患者变异应另行评估。'),
 b('aml','右中叶动脉示意','artery',[[-2.95,-.5,-1.35],[-3.5,-1,.25],[-4.4,-1.6,1.15]],.17,'interlobar',['rml'],'中叶的保留灌注通路。'),
 b('all','右下叶动脉示意','artery',[[-3.35,-2.3,-1.35],[-4,-3,-1.6],[-4.7,-4.3,-.9]],.21,'interlobar',['rll'],'下叶的保留灌注通路。'),
 b('lpa','左肺动脉示意','artery',[[.1,1.25,1],[1.4,1.7,.5],[3,1.9,.2],[4.5,2.8,.6]],.3,'pa',['lul','lll'],'左侧仅作整体空间对照。'),
 b('rspv','右上肺静脉汇合段','vein',[[-.5,-1.35,1.55],[-1.3,-.7,1.65],[-2.25,.05,1.6]],.4,null,['rul','rml'],'此示意汇合段接收上叶与中叶回流，不能整体当作上叶一键离断目标。'),
 b('rulv','右上叶目标静脉分支','vein',[[-2.25,.05,1.6],[-2.95,.8,1.75],[-3.8,2.2,1.65]],.28,'rspv',['rul'],'先识别上叶目标分支，再确认中叶静脉回流获得保留。'),
 b('v1','右上叶静脉远端示意','vein',[[-3.8,2.2,1.65],[-4.45,3.35,1.3],[-4.65,4.15,.9]],.16,'rulv',['rul'],'简化上叶回流分支，不用于真实患者手术规划。'),
 b('v3','右上叶前方静脉示意','vein',[[-2.95,.8,1.75],[-4.15,.75,2],[-5.4,1.15,1.8]],.15,'rulv',['rul'],'与目标上叶静脉共享回流路径。'),
 b('rmlv','右中叶静脉','vein',[[-2.25,.05,1.6],[-3,-.9,1.75],[-4.25,-1.8,1.9]],.26,'rspv',['rml'],'中叶静脉汇入方式可变；本体模重点显示需要保留的回流。'),
 b('ripv','右下肺静脉示意','vein',[[-.6,-2.4,1.2],[-2.5,-2.8,.6],[-4.3,-3.5,.5]],.31,null,['rll'],'下叶回流的背景示意。'),
 b('lpv','左肺静脉示意','vein',[[.65,-1.6,1.5],[2.3,-.2,1.6],[4.2,1.2,1.8]],.32,null,['lul','lll'],'左侧回流的背景示意。'),
];
export const SEGMENTS=[{id:'s1',name:'S1 尖段',center:[-4,4,.1],color:0x68d5c6},{id:'s2',name:'S2 后段',center:[-4.8,2,-1.6],color:0x8ea8ec},{id:'s3',name:'S3 前段',center:[-4.5,1.5,1.5],color:0xe8b476}];
export const LESION={id:'lesion',name:'教学病灶定位',center:[-5.1,2.1,-1.25],radius:.38,color:0xffd16c,type:'lesion',description:'深部病灶的透视标记为教学辅助，术野中不应直接看见。'};
export const STRUCTURES=Object.fromEntries([...LOBES,...BRANCHES,...SEGMENTS,LESION].map(x=>[x.id,x]));
export const FOCUS_IDS=['rul','rml','rll','lul','lll','s1','s2','s3','rub','bi','rulv','rmlv','rspv','a13','a2','interlobar'];
export const CAMERAS={
 anterior:{label:'前外侧观察',position:[-7.7,2.5,8.5],target:[-2.6,1,.35]},
 superior:{label:'头侧观察',position:[-6.7,6.4,8],target:[-2.6,1,.2]},
 posterior:{label:'后外侧观察',position:[-7.7,3,-8.5],target:[-2.6,1,-.5]},
};
export function lungField(x,y,z,side){
 const cx=side==='r'?-4:4;
 const yy=(y+.3)/5.6;
 const taper=1-.23*Math.max(0,yy);
 const base=Math.sqrt(((x-cx)/(2.75*taper))**2+yy*yy+(z/(2.7*taper))**2)-1;
 // Medial concavity for the hilum and, on the left, cardiac impression.
 const notch=1-Math.sqrt(((x-(side==='r'?-1.1:1.25))/(side==='r'?1.4:1.7))**2+((y+.5)/2.7)**2+((z-.65)/2.05)**2);
 return Math.max(base,notch);
}
export function lobeField(id,x,y,z){
 const right=id[0]==='r';const outer=lungField(x,y,z,right?'r':'l');
 const oblique=(y+1+.9*z)/5;
 const horizontal=(y-.45)/5;
 const gap=.010;
 if(id==='rll'||id==='lll')return Math.max(outer,oblique+gap);
 if(id==='rml')return Math.max(outer,-oblique+gap,horizontal+gap);
 if(id==='rul')return Math.max(outer,-oblique+gap,-horizontal+gap);
 return Math.max(outer,-oblique+gap);
}
export function lobeAt(x,y,z){
 const side=x<0?'r':'l';if(lungField(x,y,z,side)>0)return null;
 const lower=y+1+.9*z<0;
 return side==='r'?(lower?'rll':y<.45?'rml':'rul'):(lower?'lll':'lul');
}
export function segmentAt(x,y,z){return lobeAt(x,y,z)==='rul'?(y>3.1?'s1':z<0?'s2':'s3'):null;}
export function pointOnBranch(branch,t){
 const p=branch.points, n=p.length-1, f=Math.min(n-.000001,Math.max(0,t)*n), i=Math.floor(f), u=f-i;
 return p[i].map((v,j)=>v+(p[i+1][j]-v)*u);
}
export function distToBranch(x,y,z,b){
 let best=Infinity;
 for(let i=1;i<b.points.length;i++){
  const a=b.points[i-1],e=b.points[i],v=e.map((n,j)=>n-a[j]);
  const q=[x-a[0],y-a[1],z-a[2]],d=v.reduce((s,n)=>s+n*n,0);
  const t=Math.max(0,Math.min(1,q.reduce((s,n,j)=>s+n*v[j],0)/d));
  const dd=Math.hypot(...q.map((n,j)=>n-t*v[j]));if(dd<best)best=dd;
 }return best;
}
export function tissueAt(x,y,z){
 if(Math.hypot(x-LESION.center[0],y-LESION.center[1],z-LESION.center[2])<LESION.radius)return {id:'lesion',gray:151};
 for(const b of BRANCHES){const d=distToBranch(x,y,z,b);if(d<b.radius)return {id:b.id,gray:b.type==='bronchus'?(d<b.radius*.63?19:175):173};}
 const lobe=lobeAt(x,y,z);if(lobe)return {id:lobe,gray:44};
 const body=(x/8.1)**2+(z/4.2)**2;
 if(body>1)return {id:null,gray:6};
 if(body>.83)return {id:'wall',gray:132};
 if((x/1.05)**2+((z+3.05)/.65)**2<1)return {id:'spine',gray:224};
 return {id:'mediastinum',gray:101};
}
export const PHYSIOLOGY={
 venous:{name:'中叶静脉误闭',target:'rmlv',affected:['rml'],trend:'回流受阻 → 淤血风险',principle:'闭合静脉阻断的是回流。没有开放性血管损伤时，不用喷血表达。',color:'#bb7298'},
 arterial:{name:'非目标动脉误闭',target:'interlobar',affected:['rml','rll'],trend:'供血通路受阻 → 灌注减少',principle:'灌注减少不能直接等同即刻组织坏死。',color:'#8493a5'},
 airway:{name:'中间支气管误处理',target:'bi',affected:['rml','rll'],trend:'通气通路受限 → 肺不张风险',principle:'支气管处理错误影响通气，不能用静脉淤血替代。',color:'#a9a0be'},
 bleeding:{name:'开放性血管损伤',target:'rpa',affected:[],trend:'血液进入术野 → 视野受限',principle:'暂停危险操作、压迫控制并呼叫／升级处理。避免盲夹与盲烧。',color:'#cb4055'},
};
