import {OUTER} from './data.js';
import {SEAT_BLOCKS,blockPoint,rowV} from './seat-data.js';
import {resample} from './spatial.js';
import {UPPER_WINGS,upperOffset} from './upper-gallery-access.js';

// Photo-confirmed roof coverage/forms, not surveyed heights or member sizes.
// The row-1 edge is a model fit. The actual sources corroborate roof above
// 322 row 5 and shade at 302 row 8, not an exact edge at every first row.
export const CANOPY_FRAME={innerY:33.5,outerY:32.9,slabDepth:.34,edgeReference:'model navy first-row outline',girderWidth:.22,girderDepth:.85,purlinFractions:[.2,.4,.6,.8],geometryEvidence:'partial-photo-cross-check',locationEvidence:'inferred',dimensionEvidence:'inferred'};
const navy=SEAT_BLOCKS.filter(b=>b.tier===3);
const front=[blockPoint(navy[0],0,rowV(navy[0],1)),...navy.flatMap(b=>[blockPoint(b,0,rowV(b,1)),blockPoint(b,1,rowV(b,1))])].map(p=>[p[0],p[2]]);
const angle=p=>Math.atan2(p[0],p[1]+49);
const wingAngles=UPPER_WINGS.map(w=>w.inner.map(p=>angle([p[0],p[2]]))).map(a=>[Math.min(...a),Math.max(...a)]);
export const hasDetailedCanopy=p=>wingAngles.some(([lo,hi])=>angle(p)>=lo&&angle(p)<=hi);
function radiusAt(poly,theta){
 const dx=Math.sin(theta),dz=Math.cos(theta),radii=[];
 for(let i=1;i<poly.length;i++){
  const a=poly[i-1],b=poly[i],sx=b[0]-a[0],sz=b[1]-a[1],den=dx*sz-dz*sx;if(Math.abs(den)<1e-9)continue;
  const ax=a[0],az=a[1]+49,r=(ax*sz-az*sx)/den,t=(ax*dz-az*dx)/den;
  if(r>0&&t>=-1e-8&&t<=1+1e-8)radii.push(r);
 }
 if(radii.length)return Math.max(...radii);
 // Extend the end radius over the small unmatched tip of the existing outline.
 const end=Math.abs(theta-angle(poly[0]))<Math.abs(theta-angle(poly.at(-1)))?poly[0]:poly.at(-1);
 return Math.hypot(end[0],end[1]+49);
}
export function canopyCrossSection(theta){
 const inner=radiusAt(front,theta),outer=radiusAt(OUTER,theta);
 const at=(t,drop=0)=>{const r=inner+(outer-inner)*t;return [Math.sin(theta)*r,CANOPY_FRAME.innerY+(CANOPY_FRAME.outerY-CANOPY_FRAME.innerY)*t-drop,-49+Math.cos(theta)*r];};
 return {inner,outer,at};
}
export const CANOPY_SECTIONS=resample(OUTER,81).map(p=>canopyCrossSection(angle(p)));
export const CANOPY_SUPPORTS=UPPER_WINGS.flatMap(w=>w.blocks.filter((b,i)=>i%2===0).map(b=>{
 const column=upperOffset(blockPoint(b,.43,1),.65),cross=canopyCrossSection(angle([column[0],column[2]]));
 return {section:b.id,column,cross,t:(Math.hypot(column[0],column[2]+49)-cross.inner)/(cross.outer-cross.inner)};
}));

