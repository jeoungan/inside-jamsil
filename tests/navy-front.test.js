import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStadium} from '../src/model.js';
import {SEAT_BLOCK_BY_ID,blockPoint,rowV,SEAT_STATS} from '../src/seat-data.js';
import {NAVY_FRONT_WINGS,navyFrontPath} from '../src/navy-front-access.js';
import {navyFrontLegs,NAVY_FRONT_TARGETS} from '../src/navy-front-gallery.js';
import {createWalker,moveWalker} from '../src/navigation.js';
import {createPatrolSensors} from '../src/patrol-sensors.js';
const model=buildStadium({labels:false}),sensors=createPatrolSensors(model);
for(const t of NAVY_FRONT_TARGETS)test(t.id+' crosses section seams and returns through its entry stairs',()=>{
 const b=SEAT_BLOCK_BY_ID.get(t.section),out=navyFrontLegs(t)[0].points,path=[...out,...out.toReversed().slice(1)];let w={...createWalker('4F',b.portal[0],b.portal[2]),seatTarget:b.id},travelled=0,nextCheck=0,maxY=0;
 for(const p of path.slice(1)){
  const dx=p[0]-w.x,dz=p[2]-w.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));
  for(let i=0;i<n;i++){
   const prev=w;w=moveWalker(w,dx/n,dz/n,model.colliders);assert.ok(Math.abs(w.y-prev.y)<.35);travelled+=Math.hypot(w.x-prev.x,w.z-prev.z);maxY=Math.max(maxY,w.y);
   if(travelled>nextCheck){assert.deepEqual(sensors.inspect(w,0),[],JSON.stringify(w));nextCheck=travelled+.4;}
  }
  assert.ok(Math.hypot(w.x-p[0],w.y-p[1],w.z-p[2])<.06,JSON.stringify({p,w}));
 }
 assert.ok(maxY>18.6,'entry landing is reached by stairs');assert.ok(travelled>100);assert.equal(SEAT_STATS.observed,203);
});
test('front aisle boundaries prevent falling, central shortcuts and mounting from another level',()=>{
 assert.throws(()=>navyFrontPath('315','320'),/one public wing/);
 for(const wing of NAVY_FRONT_WINGS){
  const b=wing.blocks[2],p=blockPoint(b,.5,rowV(b,1)*.65),w={...createWalker('4F',p[0],p[2]),seating:b.id,seatArea:'navy-front-gallery'};
  const q=blockPoint(b,.5,-.5),moved=moveWalker(w,q[0]-p[0],q[2]-p[2],model.colliders);
  assert.equal(moved.y,w.y);assert.ok(Math.hypot(moved.x-q[0],moved.z-q[2])>5);
  const lower={...w,y:10.5,floor:'3F',seatTarget:b.id};const next=moveWalker(lower,.1,.1,model.colliders);assert.equal(next.y,10.5);
  const end=wing.blocks.at(-1),a=blockPoint(end,.75,rowV(end,1)*.65),c=blockPoint(end,1.5,rowV(end,1)*.65);
  const stopped=moveWalker({...w,x:a[0],z:a[2]},c[0]-a[0],c[2]-a[2],model.colliders);assert.ok(Math.hypot(stopped.x-c[0],stopped.z-c[2])>1);
 }
});
