import {SEAT_BLOCK_BY_ID,blockPoint,rowV} from './seat-data.js';
import {seatLegs} from './seating-navigation.js';
import {navyFrontPath} from './navy-front-access.js';

export const NAVY_FRONT_TARGETS=[
 {id:'gallery-navy-front-east',name:'네이비석 1루 쪽 앞 통로',section:'310',gallerySection:'314'},
 {id:'gallery-navy-front-west',name:'네이비석 3루 쪽 앞 통로',section:'322',gallerySection:'325'},
].map(t=>({...t,kind:'public-gallery',gallery:'navy-front',floor:'4F',point:navyFrontPath(t.section,t.gallerySection).at(-1),geometryEvidence:'partial-photo-cross-check',locationEvidence:'inferred',dimensionEvidence:'inferred'}));
export function navyFrontLegs(t){
 const b=SEAT_BLOCK_BY_ID.get(t.section),access=seatLegs({section:b.id,row:1,number:null,point:blockPoint(b,.94,rowV(b,1))})[0];
 // End at the access lane's front apron, before its old per-block U-turn.
 const points=[...access.points.slice(0,-2),...navyFrontPath(b.id,t.gallerySection).slice(1)];
 return [{kind:'public-gallery',name:'네이비석 진입 계단과 앞 공용 통로',section:b.id,floor:b.floor,toFloor:b.floor,points,distance:points.slice(1).reduce((s,p,i)=>s+Math.hypot(...p.map((v,k)=>v-points[i][k])),0)}];
}
