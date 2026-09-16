// Display geometry for deterministic edge-cropped real surgical footage.
// Answers and saved clicks always retain ORIGINAL full-frame coordinates.
export const FIELD_CROPS=Object.freeze({
 '01':Object.freeze({width:1280,height:572,x:132,y:60,w:1016,h:512}),
 '02':Object.freeze({width:1280,height:572,x:132,y:60,w:1016,h:512}),
 '03':Object.freeze({width:1280,height:572,x:132,y:60,w:1016,h:512}),
 '04':Object.freeze({width:1280,height:720,x:156,y:112,w:940,h:608}),
});
export function fieldCrop(src){
 if(!String(src).includes('or-field/clean/'))return null;
 const name=String(src).split('/').at(-1),key=name.match(/^(?:step|s)(\d{2})/)?.[1];
 return FIELD_CROPS[key]||null;
}
export function sourceDisplayRect(display,src){
 const crop=fieldCrop(src);if(!crop)return {...display};
 return {x:display.x-crop.x/crop.w*display.w,y:display.y-crop.y/crop.h*display.h,w:crop.width/crop.w*display.w,h:crop.height/crop.h*display.h};
}
export function sourceBounds(src){
 const c=fieldCrop(src);return c?{left:c.x/c.width,top:c.y/c.height,right:(c.x+c.w)/c.width,bottom:(c.y+c.h)/c.height}:{left:0,top:0,right:1,bottom:1};
}
