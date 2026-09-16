// Place full names beside their real in-mask anchor. No area threshold is used.
// If the viewport cannot fit all names, the complete slice list remains available.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const boxesIntersect=(a,b,pad=0)=>a.x<b.x+b.width+pad&&a.x+a.width+pad>b.x&&a.y<b.y+b.height+pad&&a.y+a.height+pad>b.y;

export function layoutSegmentLabels(items,rect,viewport,measure,obstacles=[]){
  const inset=8,top=26,bottom=viewport.height-24,rowHeight=22,gap=3;
  const labels=[],unplaced=[];
  const mapped=items.map(s=>({...s,
    anchorScreen:[rect.x+(s.anchor[0]+.5)/rect.spec.width*rect.width,rect.y+(s.anchor[1]+.5)/rect.spec.height*rect.height]
  })).sort((a,b)=>a.anchorScreen[1]-b.anchorScreen[1]||a.code.localeCompare(b.code));
  for(const s of mapped){
    const width=Math.ceil(measure(s.text))+14,height=rowHeight,[ax,ay]=s.anchorScreen;
    if(width>viewport.width-2*inset||bottom-top<height){unplaced.push(s);continue;}
    const preferredX=ax<viewport.width/2?inset:viewport.width-inset-width;
    const alternateX=ax<viewport.width/2?viewport.width-inset-width:inset;
    const ys=[clamp(ay-height/2,top,bottom-height)];
    for(let y=top;y+height<=bottom;y+=height+gap)ys.push(y);
    const xs=[preferredX,alternateX,clamp(ax-width/2,inset,viewport.width-inset-width)];
    let best=null,bestCost=Infinity;
    for(let column=0;column<xs.length;column++)for(const y of ys){
      const box={x:xs[column],y,width,height};
      if([...obstacles,...labels].some(other=>boxesIntersect(box,other,2)))continue;
      const cost=Math.abs(y+height/2-ay)+column*18+(column===2?32:0);
      if(cost<bestCost){bestCost=cost;best=box;}
    }
    if(!best){unplaced.push(s);continue;}
    const onScreen=ax>=0&&ay>=0&&ax<=viewport.width&&ay<=viewport.height;
    labels.push({...s,...best,onScreen});
  }
  return {labels,unplaced};
}

export function drawSegmentLabels(ctx,layout){
  ctx.save();ctx.font='600 12px system-ui, "PingFang SC", sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';
  for(const s of layout.labels){
    const [ax,ay]=s.anchorScreen;
    if(s.onScreen){
      const endX=clamp(ax,s.x,s.x+s.width),endY=clamp(ay,s.y,s.y+s.height);
      ctx.strokeStyle=s.color;ctx.globalAlpha=.8;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(endX,endY);ctx.stroke();
      ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(ax,ay,1.7,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;ctx.fillStyle='#071720ee';ctx.fillRect(s.x,s.y,s.width,s.height);
    ctx.strokeStyle=s.color;ctx.lineWidth=.7;ctx.strokeRect(s.x,s.y,s.width,s.height);
    ctx.fillStyle='#f1f7fa';ctx.fillText(s.text,s.x+7,s.y+s.height/2);
  }
  ctx.restore();
}
