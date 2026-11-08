import {SEAT_BLOCK_BY_ID,blockPoint,rowV,rowY} from './seat-data.js';
import {seatLegs} from './seating-navigation.js';
import {upperGalleryPath} from './upper-gallery-access.js';

export const UPPER_GALLERY_TARGETS=[
 {id:'gallery-upper-east',name:'네이비석 1루 쪽 뒤 회랑',section:'310',gallerySection:'315'},
 {id:'gallery-upper-west',name:'네이비석 3루 쪽 뒤 회랑',section:'322',gallerySection:'320'},
].map(t=>({...t,kind:'public-gallery',gallery:'upper',floor:'4F',point:upperGalleryPath(t.section,t.gallerySection).at(-1),geometryEvidence:'partial-photo-cross-check',locationEvidence:'inferred',dimensionEvidence:'inferred'}));

export function upperGalleryLegs(t){
 const b=SEAT_BLOCK_BY_ID.get(t.section),y=rowY(b,b.rows),access=seatLegs({section:b.id,row:b.rows,number:null,point:blockPoint(b,.94,rowV(b,b.rows),y)}).slice(0,2);
 const points=[access.at(-1).points.at(-1),blockPoint(b,.94,1,y),...upperGalleryPath(b.id,t.gallerySection)];
 return [...access,{points,kind:'public-gallery',name:'네이비석 뒤 공용 회랑',section:b.id,floor:b.floor,toFloor:b.floor,distance:points.slice(1).reduce((s,p,i)=>s+Math.hypot(...p.map((v,k)=>v-points[i][k])),0)}];
}
