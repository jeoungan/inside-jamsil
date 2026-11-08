import {SEAT_BLOCKS,blockPoint,rowV} from './seat-data.js';
import {NAVY_ENTRIES,navyEntryFor} from './navy-entry-access.js';
import {containsPoint} from './spatial.js';

// A partial reconstruction of the photographed first-row cross-aisle.
// The endpoints, width and elevation fit the existing model, not a survey.
export const NAVY_FRONT={wings:[[310,315],[320,326]],y:14.5,clearanceLaneSections:['316','320','327'],clearanceLaneU:.075,routeFraction:.65,parapetHeight:.65,guardHeight:1.1,geometryEvidence:'partial-photo-cross-check',locationEvidence:'inferred',dimensionEvidence:'inferred'};
export const navyFrontOpen=b=>b?.tier===3&&NAVY_FRONT.wings.some(([a,c])=>+b.id>=a&&+b.id<=c);
export const NAVY_FRONT_WINGS=NAVY_FRONT.wings.map(([a,c])=>{
 const blocks=SEAT_BLOCKS.filter(b=>+b.id>=a&&+b.id<=c);
 const edge=f=>[blockPoint(blocks[0],0,rowV(blocks[0],1)*f),...blocks.map(b=>blockPoint(b,1,rowV(b,1)*f))];
 const outline=(lo,hi)=>[...edge(lo),...edge(hi).toReversed()].map(p=>[p[0],p[2]]);
 // A centimetre-scale overlap closes float32 cracks at the access-lane seam.
 return {blocks,edge,outline:outline(0,1.01),walkOutline:outline(.26,.82)};
});
export const navyFrontBoundaryNeighbor=(b,u)=>b.tier===3&&NAVY_FRONT.wings.some(([a,c])=>u===1?+b.id===a-1:+b.id===c+1);
export const navyFrontWing=id=>NAVY_FRONT_WINGS.find(w=>w.blocks.some(b=>b.id===String(id)));
export function navyFrontSurface(b,x,z){
 const wing=navyFrontWing(b.id);return wing&&containsPoint([x,z],wing.walkOutline);
}
export function navyFrontPath(section,toSection){
 const wing=navyFrontWing(section),from=wing?.blocks.findIndex(b=>b.id===String(section)),to=wing?.blocks.findIndex(b=>b.id===String(toSection));
 if(from==null||from<0||to<0)throw Error('Navy front route must stay on one public wing');
 const at=(b,u)=>blockPoint(b,u,rowV(b,1)*NAVY_FRONT.routeFraction),corners=wing.edge(NAVY_FRONT.routeFraction),points=[at(wing.blocks[from],navyEntryFor(wing.blocks[from])?NAVY_ENTRIES.laneU:NAVY_FRONT.clearanceLaneSections.includes(wing.blocks[from].id)?NAVY_FRONT.clearanceLaneU:.055)];
 if(from<to)for(let i=from;i<to;i++)points.push(corners[i+1]);
 else for(let i=from;i>to;i--)points.push(corners[i]);
 points.push(at(wing.blocks[to],.5));return points;
}
