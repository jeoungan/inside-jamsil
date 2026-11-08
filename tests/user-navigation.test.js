import test from 'node:test';
import assert from 'node:assert/strict';
import {userSeatDestination,UNAVAILABLE_ROUTE_MESSAGE} from '../src/route-input.js';
import {START_LOCATIONS,startingPosition} from '../src/starting-position.js';
import {buildStadium} from '../src/model.js';
import {createPatrolSensors} from '../src/patrol-sensors.js';
import {onFloor,blockedAtHeight,moveWalker} from '../src/navigation.js';
import {createRoutePlanner,routeProgress} from '../src/route-planner.js';
import {currentPositionOrigin} from '../src/current-position-route.js';

test('ticket input accepts section alone and supported exact seats without a catalogue picker',()=>{
  assert.equal(userSeatDestination('207구역').id,'block-207');
  assert.equal(userSeatDestination('207','8','87').id,'seat:207:8:87');
  assert.throws(()=>userSeatDestination('207','8',''),/함께 입력/);
  assert.throws(()=>userSeatDestination('207','-1','87'),/1 이상의/);
});
test('unsupported addresses show the requested apology without substituting another destination',()=>{
  for(const address of [['999'],['VIP',1,1],['207',2,22],['207',8,9999]]){
    assert.throws(()=>userSeatDestination(...address),{message:UNAVAILABLE_ROUTE_MESSAGE});
  }
});
test('all selectable gate and door starts have supported floors and room to leave',()=>{
  const model=buildStadium({labels:false}),sensors=createPatrolSensors(model);
  assert.equal(START_LOCATIONS.length,13);
  for(const feature of START_LOCATIONS){
    const {walker:w}=startingPosition(feature.id,model.colliders);
    assert.equal(w.floor,feature.floor);assert.ok(onFloor(w.x,w.z,w.floor));
    assert.equal(blockedAtHeight(w.x,w.y,w.z,model.colliders),false,feature.id);
    assert.deepEqual(sensors.inspect(w,0).filter(f=>f.code==='floor-mesh-gap'),[],feature.id);
    assert.ok(Array.from({length:8},(_,i)=>moveWalker(w,Math.cos(i*Math.PI/4)*.8,Math.sin(i*Math.PI/4)*.8,model.colliders)).some(p=>Math.hypot(p.x-w.x,p.z-w.z)>.5),feature.id);
  }
  assert.throws(()=>startingPosition('unknown',model.colliders));
});
test('route from a selected entrance preserves that exact body and reaches the seat',()=>{
  const model=buildStadium({labels:false}),planner=createRoutePlanner(model.colliders);
  const {walker:start}=startingPosition('gate-23',model.colliders),seat=userSeatDestination('207',8,87);
  const route=planner.plan(currentPositionOrigin(start),seat);
  assert.deepEqual(route.origin.point,[start.x,start.y,start.z]);
  let w={...start,seatTarget:seat.section};
  for(const p of route.points.slice(1)){
    const dx=p[0]-w.x,dz=p[2]-w.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));
    for(let i=0;i<n;i++)w=moveWalker(w,dx/n,dz/n,model.colliders);
    assert.ok(Math.hypot(w.x-p[0],w.y-p[1],w.z-p[2])<.12);
  }
  assert.equal(routeProgress(route,w).arrived,true);
});
