import {SEAT_BLOCKS,SEAT_BLOCK_BY_ID,blockPoint,blockUV,rowV,rowY} from './seat-data.js';
import {publicSurface} from './access-geometry.js';
import {ribbonEdges,containsPoint} from './spatial.js';
import {outfieldAccessFor,outfieldBridge,outfieldVoid,outfieldRearOpen,outfieldRearSurface,OUTFIELD_REAR} from './outfield-access.js';
import {UPPER_GALLERY,upperGalleryOpen,upperGallerySurface,upperWingFor} from './upper-gallery-access.js';
import {NAVY_ENTRIES,navyEntryFor,navyEntryProfile,navyEntryY} from './navy-entry-access.js';
import {NAVY_FRONT,navyFrontOpen,navyFrontSurface,navyFrontWing} from './navy-front-access.js';
const accessU=b=>navyEntryFor(b)?NAVY_ENTRIES.laneU:NAVY_FRONT.clearanceLaneSections.includes(b.id)?NAVY_FRONT.clearanceLaneU:.055;
const bridgeCache=new WeakMap();
export function seatBridge(b){
 if(!bridgeCache.has(b)){
  // The section beside an entry void is reached sideways from the gallery;
  // a radial landing over that void would cap the final stair flight.
  const entryU=(b.tier===4&&outfieldAccessFor(b.id).anchor===b.id) ? .4 : accessU(b);
  bridgeCache.set(b,b.tier===4?outfieldBridge(b,blockPoint(b,entryU,rowV(b,1)*.65,b.base)):[b.portal,...(b.bridgeWaypoints||[]),blockPoint(b,entryU,1,b.bridgeY)]);
 }
 return bridgeCache.get(b);
}
// Ground circulation cannot pass through the low end of a rising slab. These
// volumes follow the rendered bridge, and are exempt only for a walker already
// travelling ON that same bridge. They do not authorize entering it from below.
export function seatApproachBarriers(b){
 if(b.tier===4){const a=outfieldAccessFor(b.id);if(a.anchor!==b.id)return [];}
 const result=[],path=seatBridge(b);
 for(let i=1;i<path.length;i++){
  const a=path[i-1],c=path[i],rise=c[1]-a[1];if(rise<=.01)continue;
  const lo=Math.max(0,(b.entryY+.02-a[1])/rise),hi=Math.min(1,(b.entryY+2.12-a[1])/rise);if(hi<=lo)continue;
  const p=a.map((v,k)=>v+(c[k]-v)*lo),q=a.map((v,k)=>v+(c[k]-v)*hi),dx=q[0]-p[0],dz=q[2]-p[2];
  result.push({floor:b.floor,x:(p[0]+q[0])/2,z:(p[2]+q[2])/2,width:Math.hypot(dx,dz),depth:b.tier===4?2.4:1.8,yaw:-Math.atan2(dz,dx),height:Math.max(p[1],q[1])-b.entryY+.15,type:'seat-approach',seatPassage:b.id,...(b.tier===4?{seatPassages:outfieldAccessFor(b.id).sections}:{})});
 }
 return result;
}
const guardCache=new WeakMap();
// A level bridge meeting a full concourse needs an open apron. Guard only the
// exposed sides, not the continuous floor at the mouth of a section entrance.
export function bridgeGuards(b){
 if(guardCache.has(b))return guardCache.get(b);
 const edges=ribbonEdges(seatBridge(b),1.68),guards=[];
 for(const side of [0,1])for(let i=1;i<edges.length;i++){
  const a=edges[i-1][side],c=edges[i][side],dx=c[0]-a[0],dz=c[2]-a[2],len=Math.hypot(dx,dz),n=Math.ceil(len/.3);
  const at=t=>a.map((v,k)=>v+(c[k]-v)*t);let start=null;
  for(let j=0;j<=n;j++){
   const p=at(Math.min(1,(j+.5)/n));
   const sharedJunction=SEAT_BLOCKS.some(other=>{
    if(other===b||other.floor!==b.floor)return false;
    const bridge=bridgeProjection(other,p[0],p[2]);
    if(bridge.raw>=-.02&&bridge.raw<=1.02&&bridge.distance<1.05&&Math.abs(bridge.y-p[1])<.12)return true;
    const uv=blockUV(other,p[0],p[2]),margin=.45/other.width;
    return uv.v>=0&&uv.v<=1&&uv.u>=-margin&&uv.u<=.13+margin&&Math.abs(accessLaneY(other,uv.v)-p[1])<.12;
   });
   const supported=sharedJunction||(Math.abs(p[1]-b.entryY)<.04&&[-.42,0,.42].every(d=>publicSurface(p[0]+dz/len*d,p[2]-dx/len*d,b.floor)));
   const guard=j<n&&!supported;
   if(guard&&start===null)start=j/n;
   if(!guard&&start!==null){guards.push({a:at(start),b:at(j/n)});start=null;}
  }
 }
 guardCache.set(b,guards);return guards;
}
export function accessLaneProfile(b){
 if(navyEntryFor(b))return navyEntryProfile(b);
 const first=rowV(b,1),points=[[0,b.base],[first,b.base]];
 if(b.tier===4)return [...points,[rowV(b,b.rows),b.bridgeY],[1,b.bridgeY]];
 // Tier 2 keeps its shared entrance passage at concourse height. Its final
 // approach rises to the first seating tread after the branching passages.
 if(b.tier===2)points.push([first+.25,b.bridgeY]);
 return [...points,[1,b.bridgeY]];
}
export function accessLaneY(b,v){
 if(navyEntryFor(b))return navyEntryY(b,v);
 const points=accessLaneProfile(b);v=Math.max(0,Math.min(1,v));
 for(let i=1;i<points.length;i++){const a=points[i-1],c=points[i];if(v<=c[0])return a[1]+(c[1]-a[1])*(v-a[0])/(c[0]-a[0]);}
 return points.at(-1)[1];
}
export function bridgeProjection(b,x,z){let best={distance:Infinity};const path=seatBridge(b);for(let i=1;i<path.length;i++){const a=path[i-1],c=path[i],dx=c[0]-a[0],dz=c[2]-a[2],len=Math.hypot(dx,dz),raw=((x-a[0])*dx+(z-a[2])*dz)/(len*len),t=Math.max(0,Math.min(1,raw)),distance=Math.hypot(x-a[0]-t*dx,z-a[2]-t*dz);if(distance<best.distance)best={raw,distance,len,y:a[1]+t*(c[1]-a[1]),segment:i-1};}return best;}
export function seatSurface(b,x,z,referenceY){
 const {u,v}=blockUV(b,x,z),bridge=bridgeProjection(b,x,z);
 if(navyFrontOpen(b)&&(referenceY===undefined||Math.abs(referenceY-NAVY_FRONT.y)<.37)&&navyFrontSurface(b,x,z))return {y:NAVY_FRONT.y,area:'navy-front-gallery'};
 if(upperGalleryOpen(b)&&(referenceY===undefined||Math.abs(referenceY-UPPER_GALLERY.y)<.37)){
  const junction=u>.89&&u<.98&&v>=1&&v<1.07;
  if(upperGallerySurface(b,x,z)||junction)return {y:UPPER_GALLERY.y,area:'upper-gallery'};
 }
 if(b.tier===4&&(referenceY===undefined||Math.abs(referenceY-OUTFIELD_REAR.y)<.37)){
  const rear=outfieldRearSurface(x,z),junction=outfieldRearOpen(b)&&u>.89&&u<.98&&v>=1&&v<1.06;
  if(rear||junction)return {y:OUTFIELD_REAR.y,area:'rear-gallery'};
 }
 if(b.tier===4&&bridge.raw>=-.06&&bridge.raw<=1.03&&bridge.distance<.67&&(referenceY===undefined||Math.abs(referenceY-bridge.y)<.37))return {y:bridge.y,area:'entry'};
 if(b.tier===4){const bay=outfieldAccessFor(b.id);if(bay.anchor===b.id&&containsPoint([x,z],outfieldVoid(bay)))return null;}
 // At the bridge/access junction, use the actual sloping access surface as soon
 // as the body is inside the block. Extending the flat bridge height through
 // this landing left the walker suspended above a descending lower-tier lane.
 if(u>=.012&&u<.13&&v>=0&&v<=1){const y=accessLaneY(b,v);if(referenceY===undefined||Math.abs(referenceY-y)<.37)return {y,area:'access'};}
 if(bridge.raw>=-.06&&bridge.raw<=1.03&&bridge.distance<.67&&(referenceY===undefined||Math.abs(referenceY-bridge.y)<.37))return {y:bridge.y,area:'entry'};
 if(u<.012||u>.988||v<-.00001||v>1.00001)return null;
 if(u<.13)return {y:accessLaneY(b,v),area:'access'};
 const first=rowV(b,1),last=rowV(b,b.rows);
 if(v<=first)return {y:b.base,area:u>=.13&&u<=.87&&Math.abs(v-first)*b.depth<.22?'row':'front',row:u>=.13&&u<=.87&&Math.abs(v-first)*b.depth<.22?1:null};
 if(u>.87)return {y:b.base+Math.max(0,Math.min(b.rows-1,(v-first)/(last-first)*(b.rows-1)))*b.rise,area:'aisle'};
 const row=Math.max(1,Math.min(b.rows,Math.round((v-.06)*b.rows/.9+.5)));
 if(Math.abs(v-rowV(b,row))*b.depth<.22)return {y:rowY(b,row),area:'row',row};
 return null;
}
export function trySeatMove(w,x,z){
 const candidates=w.seating?[SEAT_BLOCK_BY_ID.get(w.seating)]:w.seatTarget?[SEAT_BLOCK_BY_ID.get(w.seatTarget)]:[];
 // A shared gallery may lead into another section through its stair opening.
 // The same height test prevents mounting it from ground or dropping below it.
 if(w.seatArea==='navy-front-gallery')candidates.push(...(navyFrontWing(w.seating)?.blocks||[]).filter(b=>b.id!==w.seating));
 if(w.seatArea==='upper-gallery')candidates.push(...(upperWingFor(w.seating)?.blocks||[]).filter(b=>b.id!==w.seating));
 if(w.seatArea==='rear-gallery')candidates.push(...SEAT_BLOCKS.filter(b=>outfieldRearOpen(b)&&b.id!==w.seating));
 for(const b of candidates){if(!b||b.floor!==w.floor)continue;
    if(!w.seating){const p=bridgeProjection(b,x,z),previous=bridgeProjection(b,w.x,w.z);if(p.segment!==0||p.raw<0||p.raw>.3||p.distance>.65||previous.segment!==0||previous.raw>.3)continue;}
  const surface=seatSurface(b,x,z,w.y);
  if(surface&&Math.abs(surface.y-w.y)<.37)return {...w,x,z,y:surface.y,seating:b.id,seatArea:surface.area,seatRow:surface.row??null};
 }
 return null;
}
export function seatExitAllowed(w,x,z){const b=SEAT_BLOCK_BY_ID.get(w.seating);if(!b)return false;const p=bridgeProjection(b,x,z);return p.segment===0&&p.raw<.05&&Math.hypot(x-b.portal[0],z-b.portal[2])<2.1&&Math.abs(w.y-b.entryY)<.4;}
export function seatLegs(seat){
 const b=SEAT_BLOCK_BY_ID.get(seat.section),v=rowV(b,seat.row),y=rowY(b,seat.row),first=rowV(b,1);
 const sample=(u,a,c,ya,yc,n=16)=>Array.from({length:n+1},(_,i)=>blockPoint(b,u,a+(c-a)*i/n,ya+(yc-ya)*i/n));
 const cross=first*.65;
 const approach=Array.from({length:33},(_,i)=>{const v=1+(first-1)*i/32;return blockPoint(b,accessU(b),v,accessLaneY(b,v));});
 const access=b.tier===4?[...seatBridge(b),blockPoint(b,.94,cross,b.base),blockPoint(b,.94,first,b.base)]:[...seatBridge(b),...approach.slice(1),blockPoint(b,accessU(b),cross,b.base),blockPoint(b,.94,cross,b.base),blockPoint(b,.94,first,b.base)];
 const aisle=sample(.94,first,v,b.base,y,Math.max(1,seat.row*2));
 const row=[aisle.at(-1),seat.point];
 const make=(points,kind,name)=>({kind,name,section:b.id,floor:b.floor,toFloor:b.floor,points,distance:points.slice(1).reduce((s,p,i)=>s+Math.hypot(...p.map((v,k)=>v-points[i][k])),0)});
 return [make(access,'seat-access',b.id+'구역 진입 통로'),make(aisle,'seat-stairs',b.id+'구역 관람석 계단 · '+seat.row+'열'),make(row,'seat-row',seat.row+'열 통로 → '+seat.number+'번 좌석 앞')];
}
