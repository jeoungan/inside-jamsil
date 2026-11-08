import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStadium} from '../src/model.js';
import {SEAT_BLOCK_BY_ID,SEAT_STATS,blockPoint,rowV,rowY} from '../src/seat-data.js';
import {NAVY_ENTRIES} from '../src/navy-entry-access.js';
import {seatLegs,accessLaneY} from '../src/seating-navigation.js';
import {createWalker,moveWalker} from '../src/navigation.js';
import {createPatrolSensors} from '../src/patrol-sensors.js';
const model=buildStadium({labels:false}),sensors=createPatrolSensors(model);
for(const id of NAVY_ENTRIES.sections)test(id+' entry stairs connect both lower and upper rows without a jump or unsupported tread',()=>{
 const b=SEAT_BLOCK_BY_ID.get(id);
 for(const row of [1,9,b.rows]){
  const out=seatLegs({section:id,row,number:null,point:blockPoint(b,.94,rowV(b,row),rowY(b,row))}).slice(0,2).flatMap((l,i)=>i?l.points.slice(1):l.points);
  const path=[...out,...out.toReversed().slice(1)];let w={...createWalker(b.floor,b.portal[0],b.portal[2]),seatTarget:id},distance=0,lastCheck=0,peak=0;
  for(const p of path.slice(1)){
   const dx=p[0]-w.x,dz=p[2]-w.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));
   for(let i=0;i<n;i++){
    const before=w;w=moveWalker(w,dx/n,dz/n,model.colliders);assert.ok(Math.abs(w.y-before.y)<.35,'continuous step height');distance+=Math.hypot(w.x-before.x,w.z-before.z);peak=Math.max(peak,w.y);
    if(distance-lastCheck>.4){lastCheck=distance;assert.deepEqual(sensors.inspect(w,Math.atan2(-dx,-dz)),[],JSON.stringify(w));}
   }
   assert.ok(Math.hypot(w.x-p[0],w.y-p[1],w.z-p[2])<.06,JSON.stringify({p,w}));
  }
  assert.ok(peak>=rowY(b,9)-.05,'the entrance actually passes the raised landing');assert.equal(w.y,b.entryY);
 }
 assert.equal(SEAT_STATS.observed,203);
});
test('navy entrance cheeks prevent lateral escape from the raised landing',()=>{
 for(const id of NAVY_ENTRIES.sections){
  const b=SEAT_BLOCK_BY_ID.get(id),v=rowV(b,9)+.02,y=accessLaneY(b,v),p=blockPoint(b,NAVY_ENTRIES.laneU,v,y);
  const w={...createWalker(b.floor,p[0],p[2]),y,seating:id,seatTarget:id,seatArea:'access'};
  for(const u of [-.15,.3]){const q=blockPoint(b,u,v,y),next=moveWalker(w,q[0]-p[0],q[2]-p[2],model.colliders);assert.ok(Math.hypot(next.x-q[0],next.z-q[2])>.3);assert.equal(next.y,y);}
 }
});
