import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStadium} from '../src/model.js';
import {createRoutePlanner,DESTINATIONS,resolveAnchor} from '../src/route-planner.js';
import {createPatrol} from '../src/npc-patrol.js';
import {createPatrolSensors} from '../src/patrol-sensors.js';
const model=buildStadium({labels:false}),planner=createRoutePlanner(model.colliders),door=DESTINATIONS.find(d=>d.id==='door-37');
test('door arrival stands in the public concourse and faces the unchanged portal',()=>{
 const a=resolveAnchor(door,model.colliders);assert.equal(a.offset,0);
 const dx=a.point[0]-door.x,dz=a.point[2]-door.z;
 assert.ok(Math.abs(Math.hypot(dx,dz)-3.4)<1e-9);
 assert.ok(Math.abs(Math.sin(a.arrivalYaw)-dx/3.4)<1e-9);
 assert.ok(Math.abs(Math.cos(a.arrivalYaw)-dz/3.4)<1e-9);
 const from={id:'current',name:'현재 위치',kind:'patrol-position',floor:door.floor,x:a.point[0],z:a.point[2]};
 assert.deepEqual(resolveAnchor(from,model.colliders).point,a.point);
});
test('patrol stops before door 37, turns without translating, then walks the next stair mission',async()=>{
 const sensors=createPatrolSensors(model),patrol=createPatrol({colliders:model.colliders,plan:planner.plan,seed:14,inspect:sensors.inspect});
 patrol.start();let arrival,previous=patrol.walker;
 for(let i=0;i<12000&&patrol.snapshot().completed<3;i++){
  if(patrol.pending){const pose=w=>[w.x,w.y,w.z,w.floor,w.connector],before=pose(patrol.walker);await patrol.pending;assert.deepEqual(pose(patrol.walker),before);}
  patrol.step(.2);const s=patrol.snapshot(),w=patrol.walker;
  assert.ok(Math.hypot(w.x-previous.x,w.z-previous.z)<.291);assert.ok(Math.abs(w.y-previous.y)<.35);
  assert.notEqual(s.status,'blocked',JSON.stringify(s));assert.deepEqual(s.reports,[]);
  if(s.completed===2&&!arrival){
   arrival={...w,yaw:s.yaw};assert.equal(s.destinationId,'door-37');
   const expected=resolveAnchor(door,model.colliders);assert.ok(Math.hypot(w.x-expected.point[0],w.z-expected.point[2])<.04);
   assert.equal(s.yaw,expected.arrivalYaw);const fixed=patrol.walker;patrol.step(.2);assert.deepEqual(patrol.walker,fixed);
  }
  previous=w;
 }
 const report=patrol.exportReport();assert.ok(arrival);assert.equal(report.completed,3);
 assert.ok(report.trips.every(t=>t.fromFloor!==t.toFloor&&t.transfers>0));
});
