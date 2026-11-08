import test from 'node:test';
import assert from 'node:assert/strict';
import {FEATURES,CONNECTORS} from '../src/data.js';
import {AMENITY_INFO,UNLOCATED_AMENITIES} from '../src/amenity-catalogue.js';
import {DESTINATIONS} from '../src/route-planner.js';
import {rectCorners,segmentIntersectsRect,insideRect} from '../src/spatial.js';
import {seatGuidanceDestination,SEAT_BLOCKS} from '../src/seat-data.js';
test('official amenity snapshot keeps 80 mapped entries and two unlocated 4F listings distinct',()=>{
 assert.equal(Object.keys(AMENITY_INFO).length,80);assert.equal(DESTINATIONS.filter(d=>d.amenity).length,80);
 assert.deepEqual(UNLOCATED_AMENITIES.map(a=>a.name),['올떡','제발시켜주세요']);
 for(const f of FEATURES.filter(f=>f.amenity)){assert.equal(f.floor,f.amenity.floor);assert.equal(f.amenity.reviewedAt,'2026-11-07');assert.equal(f.amenity.operation,'영업 여부 미확인');}
 for(const a of UNLOCATED_AMENITIES)assert.ok(!DESTINATIONS.some(d=>d.name===a.name));
});
test('packed 2F counters do not overlap each other or close another service front',()=>{
 const shops=FEATURES.filter(f=>f.amenity?.code.startsWith('B')).map(f=>({...f,yaw:f.doorYaw}));
 for(const [i,a]of shops.entries())for(const b of shops.slice(i+1)){
  const corners=rectCorners(a.x,a.z,a.width,a.depth,a.yaw);
  assert.ok(!insideRect(a.x,a.z,b)&&!corners.some((p,j)=>segmentIntersectsRect(p,corners[(j+1)%4],b)),a.id+' overlaps '+b.id);
 }
 assert.ok(shops.every(s=>Number.isFinite(s.fitDistance)),'all counter footprints have a recorded fit');
});
test('only the specific new ticket addresses become confirmed, not nearby numbers',()=>{
 for(const address of [['118',8,97],['118',8,101],['217',16,237],['226',10,140],['226',10,141],['316',21,233],['334',6,129],['401',7,61],['405',13,173],['416',7,109],['416',7,110],['416',15,235],['418',9,98]])assert.equal(seatGuidanceDestination(...address).kind,'individual-seat');
 for(const address of [['118',8,98],['118',8,99],['118',8,100],['217',16,238],['226',10,139],['416',7,111],['418',9,99]])assert.equal(seatGuidanceDestination(...address).kind,'section');
 assert.equal(SEAT_BLOCKS.filter(b=>b.catalogue.flat().some(s=>s.evidence==='observed')).length,11);
});
test('stair doorways and bends have level landing segments, with shared endpoint heights',()=>{
 for(const c of CONNECTORS.filter(c=>c.type==='stair')){
  assert.equal(c.path[0][1],c.path[1][1],c.id+' lower landing');
  assert.ok(Math.abs(c.path.at(-1)[1]-c.path.at(-2)[1])<1e-7,c.id+' upper landing');
  assert.ok(c.path.slice(2,-1).some((p,i)=>Math.abs(p[1]-c.path[i+1][1])<1e-7),c.id+' intermediate landing');
 }
});
