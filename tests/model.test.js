import test from 'node:test';
import assert from 'node:assert/strict';
import {FEATURES,FLOORS,validateFeatures} from '../src/data.js';
import {buildStadium,CENTERLINE,containsPoint,FLOOR_POLYGON,canWalk} from '../src/model.js';

test('mapped features have unique ids, valid levels and traceable sources',()=>assert.equal(validateFeatures(),true));
test('official map establishes ten entrance positions and first-base section 207',()=>{
  assert.equal(FEATURES.filter(f=>f.type==='gate').length,10);
  assert.ok(FEATURES.find(f=>f.id==='section-207').x>0);
  assert.ok(FEATURES.filter(f=>f.type==='stair'&&f.id.startsWith('stair-')).every(f=>f.evidence==='drawing'&&f.source==='seoul-plan-2026'));
});
test('model has separate floors and an object for every mapped feature',()=>{
  const model=buildStadium({labels:false});
  assert.equal(model.layers.size,5);assert.equal(model.featureObjects.size,FEATURES.length);
  for(const f of FLOORS)assert.equal(model.layers.get(f.id).group.position.y,f.y);
  assert.ok(model.columnCount>150&&model.columnCount<264);
  assert.ok(!model.modelBounds.isEmpty());
});
test('concourse centerline remains within the traced floor; field cannot be walked through',()=>{
  assert.ok(CENTERLINE.slice(1,-1).every(p=>containsPoint(p,FLOOR_POLYGON)));
  assert.equal(canWalk(0,0,[]),false);assert.equal(canWalk(500,500,[]),false);
});
test('obstacles block the first-person camera',()=>{
  const [x,z]=CENTERLINE[60];assert.equal(canWalk(x,z,[]),true);
  assert.equal(canWalk(x,z,[{x,z,width:6,depth:4,yaw:.7}]),false);
});
test('the new drawing separates six toilet clusters into twelve rooms',()=>{
  const rooms=FEATURES.filter(f=>f.floor==='2F'&&f.type==='restroom');assert.equal(rooms.length,12);
  assert.ok(rooms.every(f=>f.source==='seoul-plan-2026'&&f.gender==='unverified'));
});
