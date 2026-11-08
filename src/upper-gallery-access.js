import {SEAT_BLOCKS,blockPoint,rowY} from './seat-data.js';
import {containsPoint} from './spatial.js';

// Cross-checked forms, fitted dimensions. These are two partial public wings;
// no connection through the unverified central camera/service area is assumed.
export const UPPER_GALLERY={y:rowY(SEAT_BLOCKS.find(b=>b.id==='314'),28),width:3.8,routeOffset:2.3,wings:[[304,317],[318,331]],geometryEvidence:'partial-photo-cross-check',locationEvidence:'inferred',dimensionEvidence:'inferred'};
export const upperGalleryOpen=b=>b?.tier===3&&UPPER_GALLERY.wings.some(([a,c])=>+b.id>=a&&+b.id<=c);
export const upperOffset=(p,d)=>{const r=Math.hypot(p[0],p[2]+49);return [p[0]+p[0]/r*d,UPPER_GALLERY.y,p[2]+(p[2]+49)/r*d];};
export const UPPER_WINGS=UPPER_GALLERY.wings.map(([a,c])=>{
 const blocks=SEAT_BLOCKS.filter(b=>+b.id>=a&&+b.id<=c),inner=[blockPoint(blocks[0],0,1,UPPER_GALLERY.y),...blocks.map(b=>blockPoint(b,1,1,UPPER_GALLERY.y))];
 const outline=(lo,hi)=>[...inner.map(p=>upperOffset(p,lo)),...inner.toReversed().map(p=>upperOffset(p,hi))].map(p=>[p[0],p[2]]);
 return {blocks,inner,outline:outline(-.025,UPPER_GALLERY.width),walkOutline:outline(.35,UPPER_GALLERY.width-.45)};
});
export const upperWingFor=id=>UPPER_WINGS.find(w=>w.blocks.some(b=>b.id===String(id)));
export function upperGallerySurface(b,x,z){
 const wing=upperWingFor(b.id);return wing&&containsPoint([x,z],wing.walkOutline);
}

// A polyline behind the same wing; interpolation is along the gallery, never
// a chord through the bowl, a private central area or the field.
export function upperGalleryPath(section,toSection){
 const wing=upperWingFor(section),from=wing?.blocks.findIndex(b=>b.id===String(section)),to=wing?.blocks.findIndex(b=>b.id===String(toSection));
 if(from==null||from<0||to<0)throw new Error('Upper gallery route must stay on one public wing');
 const at=b=>upperOffset(blockPoint(b,.94,1,UPPER_GALLERY.y),UPPER_GALLERY.routeOffset),points=[at(wing.blocks[from])];
 if(from<to)for(let i=from;i<to;i++)points.push(upperOffset(wing.inner[i+1],UPPER_GALLERY.routeOffset));
 else for(let i=from;i>to;i--)points.push(upperOffset(wing.inner[i],UPPER_GALLERY.routeOffset));
 points.push(at(wing.blocks[to]));return points;
}
