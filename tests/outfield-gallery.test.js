import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStadium} from '../src/model.js';
import {SEAT_BLOCKS,SEAT_BLOCK_BY_ID,blockPoint} from '../src/seat-data.js';
import {galleryLegs,OUTFIELD_GALLERY_TARGETS} from '../src/outfield-gallery.js';
import {OUTFIELD_REAR,outfieldPoint,outfieldRearOpen} from '../src/outfield-access.js';
import {createWalker,moveWalker} from '../src/navigation.js';
import {createRoutePlanner,routeProgress} from '../src/route-planner.js';
import {createPatrolSensors} from '../src/patrol-sensors.js';

const model=buildStadium({labels:false}),sensors=createPatrolSensors(model);
function walk(w,points){
 for(const p of points.slice(1)){
  const dx=p[0]-w.x,dz=p[2]-w.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));
  for(let i=0;i<n;i++){
   const prev=w;w=moveWalker(w,dx/n,dz/n,model.colliders);
   assert.ok(Math.abs(w.y-prev.y)<.06,'continuous stair height');
   if(i%5===0)assert.deepEqual(sensors.inspect(w,0),[],JSON.stringify(w));
  }
  assert.ok(Math.hypot(w.x-p[0],w.y-p[1],w.z-p[2])<.04,JSON.stringify({w,p}));
 }
 return w;
}
test('rear public gallery destinations walk up real seat stairs, around scoreboard, and back down',()=>{
 const planner=createRoutePlanner(model.colliders);
 for(const t of OUTFIELD_GALLERY_TARGETS){
  const b=SEAT_BLOCK_BY_ID.get(t.section),route=planner.plan({...b.entry,kind:'entrance'},t);
  let w={...createWalker(b.floor,b.portal[0],b.portal[2]),seatTarget:b.id};
  assert.equal(routeProgress(route,w).arrived,false);
  w=walk(w,route.points);assert.equal(routeProgress(route,w).arrived,true);assert.equal(w.y,10);
  assert.equal(route.seat,undefined);assert.equal(w.seatRow,null);
  w=walk(w,route.points.toReversed());assert.equal(w.y,0);
 }
});
test('open rear stair mouths allow walking in and out of adjacent public sections',()=>{
 for(const b of SEAT_BLOCKS.filter(outfieldRearOpen)){
  const a=blockPoint(b,.94,.97,10),top=blockPoint(b,.94,1,10),angle=Math.atan2(top[0],-(top[2]+49));
  let w={...createWalker('1F',a[0],a[2]),y:10,seating:b.id,seatArea:'aisle'};
  w=walk(w,[a,top,outfieldPoint(angle,OUTFIELD_REAR.routeRadius,10),top,a]);
  assert.equal(w.seating,b.id);
 }
});
test('rear boundaries, closed service wall, and ground cannot be used as shortcuts',()=>{
 const at=(angle,r,y=10)=>{const p=outfieldPoint(angle,r,y);return {...createWalker('1F',p[0],p[2]),y,seating:'405',seatArea:'rear-gallery'};};
 for(const angle of [.8,-.8,0]){
  const w=at(angle,106.6),out=outfieldPoint(angle,113,10),next=moveWalker(w,out[0]-w.x,out[2]-w.z,model.colliders);
  assert.equal(next.y,10);assert.ok(Math.hypot(next.x,next.z+49)<108);
 }
 const w=at(.045,106.6),inside=outfieldPoint(.045,102,10),next=moveWalker(w,inside[0]-w.x,inside[2]-w.z,model.colliders);
 assert.ok(Math.hypot(next.x,next.z+49)>105.2,'closed scoreboard-side wall blocks passage');
 const p=outfieldPoint(.8,106.6,0),ground={...createWalker('1F',p[0],p[2]),seatTarget:'405'};
 const moved=moveWalker(ground,.1,0,model.colliders);assert.equal(moved.y,0);assert.ok(!moved.seating);
});
