import {SEAT_BLOCK_BY_ID,blockPoint,rowV,rowY} from './seat-data.js';
import {seatBridge} from './seating-navigation.js';
import {OUTFIELD_REAR,outfieldPoint} from './outfield-access.js';

// Research-model waypoints, not newly located facilities or seat addresses.
export const OUTFIELD_GALLERY_TARGETS=[
 {id:'gallery-east',name:'외야 1루 쪽 뒤 회랑',section:'405',angle:.82},
 {id:'gallery-scoreboard',name:'외야 전광판 뒤 공용 통로',section:'405',angle:-.22},
 {id:'gallery-west',name:'외야 3루 쪽 뒤 회랑',section:'418',angle:-.82},
].map(t=>({...t,kind:'public-gallery',floor:'1F',point:outfieldPoint(t.angle,OUTFIELD_REAR.routeRadius,OUTFIELD_REAR.y),geometryEvidence:'photo-cross-check',locationEvidence:'inferred',dimensionEvidence:'inferred'}));

export function galleryLegs(target){
 const b=SEAT_BLOCK_BY_ID.get(target.section),first=rowV(b,1),last=rowV(b,b.rows),y=rowY(b,b.rows);
 const access=[...seatBridge(b),blockPoint(b,.94,first*.65,b.base),blockPoint(b,.94,first,b.base)];
 const stairs=Array.from({length:33},(_,i)=>blockPoint(b,.94,first+(last-first)*i/32,b.base+(y-b.base)*i/32));
 const top=blockPoint(b,.94,1,y),angle=Math.atan2(top[0],-(top[2]+49)),n=Math.max(1,Math.ceil(Math.abs(target.angle-angle)*OUTFIELD_REAR.routeRadius));
 const gallery=[stairs.at(-1),top,outfieldPoint(angle,OUTFIELD_REAR.routeRadius,y),...Array.from({length:n},(_,i)=>outfieldPoint(angle+(target.angle-angle)*(i+1)/n,OUTFIELD_REAR.routeRadius,y))];
 return [[access,'seat-access','외야 공용 계단과 앞쪽 통로'],[stairs,'seat-stairs',b.id+'구역 관람석 계단'],[gallery,'public-gallery','좌석 뒤 회랑과 전광판 뒤 통로']].map(([points,kind,name])=>({points,kind,name,section:b.id,floor:b.floor,toFloor:b.floor,distance:points.slice(1).reduce((s,p,i)=>s+Math.hypot(...p.map((v,k)=>v-points[i][k])),0)}));
}
