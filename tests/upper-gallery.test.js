import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStadium} from '../src/model.js';
import {SEAT_BLOCK_BY_ID,blockPoint} from '../src/seat-data.js';
import {UPPER_GALLERY,UPPER_WINGS,upperOffset,upperGalleryPath} from '../src/upper-gallery-access.js';
import {createWalker,moveWalker} from '../src/navigation.js';
import {createPatrolSensors} from '../src/patrol-sensors.js';

const model=buildStadium({labels:false});
test('upper galleries cannot be mounted from the lower concourse or left through walls',()=>{
 for(const id of ['308','326']){
  const b=SEAT_BLOCK_BY_ID.get(id),top=blockPoint(b,.94,1,UPPER_GALLERY.y),p=upperOffset(top,2.3);
  let w={...createWalker('4F',p[0],p[2]),seatTarget:id};
  const low=moveWalker(w,.15,0,model.colliders);assert.equal(low.y,14.5);assert.ok(!low.seating);
  w={...w,y:UPPER_GALLERY.y,seating:id,seatArea:'upper-gallery'};
  const far=upperOffset(top,7),blocked=moveWalker(w,far[0]-w.x,far[2]-w.z,model.colliders);
  assert.equal(blocked.y,w.y);assert.ok(Math.hypot(blocked.x-far[0],blocked.z-far[2])>2.9);
  const railTop=blockPoint(b,.42,1,w.y),start=upperOffset(railTop,2.3),wrongTop=blockPoint(b,.42,.8,w.y);
  const againstRail=moveWalker({...w,x:start[0],z:start[2]},wrongTop[0]-start[0],wrongTop[2]-start[2],model.colliders);
  assert.equal(againstRail.y,w.y,'no drop into seat terraces');
 }
});
test('public wings do not shortcut across the unverified central space',()=>{
 assert.throws(()=>upperGalleryPath('317','318'),/one public wing/);
 const wing=UPPER_WINGS[0],b=wing.blocks.at(-1),p=upperOffset(blockPoint(b,.85,1,UPPER_GALLERY.y),2.3),q=upperOffset(blockPoint(SEAT_BLOCK_BY_ID.get('318'),.15,1,UPPER_GALLERY.y),2.3);
 const w={...createWalker('4F',p[0],p[2]),y:p[1],seating:b.id,seatArea:'upper-gallery'},moved=moveWalker(w,q[0]-p[0],q[2]-p[2],model.colliders);
 assert.ok(Math.hypot(moved.x-q[0],moved.z-q[2])>20);assert.equal(moved.y,w.y);
});
test('returning at the exact 326 bridge seam has rendered floor support',()=>{
 const sensors=createPatrolSensors(model),p=blockPoint(SEAT_BLOCK_BY_ID.get('326'),.055,1,14.5);
 const w={...createWalker('4F',p[0]-4e-14,p[2]),seating:'326',seatArea:'entry'};
 assert.deepEqual(sensors.inspect(w,0),[]);
});

