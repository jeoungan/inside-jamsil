import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStadium} from '../src/model.js';
import {SEAT_BLOCKS,seatGuidanceDestination} from '../src/seat-data.js';
import {seatBridge,seatSurface} from '../src/seating-navigation.js';
import {OUTFIELD_ACCESSES,outfieldPoint} from '../src/outfield-access.js';
import {createWalker,moveWalker} from '../src/navigation.js';
import {resolveAnchor,createRoutePlanner,routeProgress} from '../src/route-planner.js';
import {createPatrolSensors} from '../src/patrol-sensors.js';

const model=buildStadium({labels:false}),sensors=createPatrolSensors(model);
const outfield=SEAT_BLOCKS.filter(b=>b.tier===4);
test('all outfield entry aprons remain reachable and rising bridges can be walked both ways',()=>{
 for(const b of outfield){
  const anchor=resolveAnchor(b.entry,model.colliders);assert.equal(anchor.offset,0,b.id);
  const bridge=seatBridge(b);let w={...createWalker(b.floor,b.portal[0],b.portal[2]),seatTarget:b.id};
  for(const points of [bridge,bridge.toReversed()])for(const p of points.slice(1)){
   const dx=p[0]-w.x,dz=p[2]-w.z,n=Math.ceil(Math.hypot(dx,dz)/.1);
   for(let i=0;i<n;i++){
    const previous=w;w=moveWalker(w,dx/n,dz/n,model.colliders);
    assert.ok(Math.abs(w.y-previous.y)<.06,b.id+' continuous height');
    if(i%10===0)assert.deepEqual(sensors.inspect(w,0),[],b.id+' clear body height '+JSON.stringify({x:w.x,y:w.y,z:w.z,area:w.seatArea,target:p}));
   }
   assert.ok(Math.hypot(w.x-p[0],w.y-p[1],w.z-p[2])<.04,b.id+' bridge waypoint');
  }
  assert.ok(Math.abs(w.y)<.01,b.id+' returns to ground');
 }
});
test('ground walkers cannot cross low bridge slabs or board their sides, even with a seat target',()=>{
 for(const b of outfield){
  const path=seatBridge(b),a=path[1],c=path[2],t=1/(c[1]-a[1]),x=a[0]+(c[0]-a[0])*t,z=a[2]+(c[2]-a[2])*t;
  const dx=c[0]-a[0],dz=c[2]-a[2],length=Math.hypot(dx,dz),nx=dz/length,nz=-dx/length;
  for(const seatTarget of [undefined,b.id]){
   const start={...createWalker('1F',x+nx*2,z+nz*2),seatTarget};
   const w=moveWalker(start,-nx*4,-nz*4,model.colliders);
   assert.equal(w.y,0,b.id+' must not rise from below');assert.ok(!w.seating,b.id+' no side boarding');
   assert.ok((w.x-x)*nx+(w.z-z)*nz>.9,b.id+' slab blocks crossing');
  }
 }
});
test('unverified outfield addresses reach their own gallery entry, not the shared ground portal',()=>{
 const planner=createRoutePlanner(model.colliders);
 for(const b of outfield){
  const destination=seatGuidanceDestination(b.id,99,99999),from={...b.entry,kind:'entrance'},route=planner.plan(from,destination);
  assert.equal(route.seat,undefined);assert.equal(route.walkSection,b.id);assert.equal(route.destination.point[1],4);
  let w={...createWalker(b.floor,b.portal[0],b.portal[2]),seatTarget:route.walkSection};
  assert.equal(routeProgress(route,w).arrived,false);
  for(const p of route.points.slice(1)){const dx=p[0]-w.x,dz=p[2]-w.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));for(let i=0;i<n;i++)w=moveWalker(w,dx/n,dz/n,model.colliders);assert.ok(Math.hypot(w.x-p[0],w.y-p[1],w.z-p[2])<.04,b.id);}
  assert.equal(routeProgress(route,w).arrived,true);assert.ok(!w.seatRow);assert.ok(route.seatPath.every(l=>l.kind==='seat-access'));
 }
});
test('entry holes do not support walking straight across from seating above',()=>{
 for(const bay of OUTFIELD_ACCESSES){
  const b=outfield.find(b=>b.id===bay.anchor),p=outfieldPoint(bay.angle,90,6);
  assert.equal(seatSurface(b,p[0],p[2],p[1]),null,b.id+' has an actual stair void');
 }
});
