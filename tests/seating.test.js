import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildStadium} from '../src/model.js';
import {SEAT_BLOCKS,SEAT_BLOCK_BY_ID,SEAT_STATS,resolveSeat,seatGuidanceDestination,blockPoint,rowV,rowY,seatU} from '../src/seat-data.js';
import {seatLegs} from '../src/seating-navigation.js';
import {ORIGINS,createRoutePlanner,routeProgress} from '../src/route-planner.js';
import {createWalker,moveWalker} from '../src/navigation.js';
const model=buildStadium({labels:false}),planner=createRoutePlanner(model.colliders);
function walk(points,walker){let w=walker;for(const p of points.slice(1)){const dx=p[0]-w.x,dz=p[2]-w.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));for(let i=0;i<n;i++)w=moveWalker(w,dx/n,dz/n,model.colliders);assert.ok(Math.hypot(w.x-p[0],w.z-p[2])<.06,JSON.stringify({p,w}));}return w;}
function seatRoute(seat){const b=SEAT_BLOCK_BY_ID.get(seat.section),legs=seatLegs(seat);return {origin:{floor:b.floor,point:b.portal},destination:seat,legs,points:legs.flatMap((l,i)=>i?l.points.slice(1):l.points),distance:legs.reduce((s,l)=>s+l.distance,0)};}
test('official numbered block order is preserved separately from model seat counts',()=>{
 assert.equal(SEAT_STATS.blocks,104);assert.equal(SEAT_STATS.observed,203);
 assert.ok(SEAT_BLOCK_BY_ID.get('101').portal[0]>0);assert.ok(SEAT_BLOCK_BY_ID.get('122').portal[0]<0);
 assert.ok(SEAT_BLOCK_BY_ID.get('301').portal[0]>0);assert.ok(SEAT_BLOCK_BY_ID.get('334').portal[0]<0);
 assert.ok(SEAT_BLOCK_BY_ID.get('401').portal[0]>0);assert.ok(SEAT_BLOCK_BY_ID.get('422').portal[0]<0);
 for(const b of SEAT_BLOCKS){const numbers=b.catalogue.flat().map(s=>s.number);assert.equal(new Set(numbers).size,numbers.length,b.id+' repeats a seat number');}
});
test('observed numbering, unverified rows and invalid addresses are distinguished',()=>{
 assert.equal(resolveSeat('207',8,87).evidence,'observed');assert.equal(resolveSeat('314',14,132).evidence,'observed');
 assert.throws(()=>resolveSeat('207',2,22),/대조/);assert.equal(resolveSeat('207',2,22,{allowInferred:true}).evidence,'inferred');
 assert.throws(()=>resolveSeat('207',8,5),/등록되지/);assert.throws(()=>resolveSeat('207',21,1),/1~20열/);
 assert.throws(()=>resolveSeat('VIP',1,1),/특수석/);assert.throws(()=>resolveSeat('207',1.5,1));assert.throws(()=>resolveSeat('207',1,-1));
 assert.throws(()=>resolveSeat('314',14,140),/대조/);
 const b=SEAT_BLOCK_BY_ID.get('207');assert.ok(seatU(b,0,11)>seatU(b,10,11),'printed left-to-right order faces the field');
});
test('unverified addresses stop at their block entry while confirmed numbers retain seat guidance',()=>{
 for(const b of SEAT_BLOCKS)for(const [i,seats]of b.catalogue.entries())for(const s of seats){
  const destination=seatGuidanceDestination(b.id,i+1,s.number);
  assert.equal(destination.kind,s.evidence==='observed'?'individual-seat':'section');
  if(s.evidence!=='observed'){assert.equal(destination.id,b.entry.id);assert.ok(destination.guidanceNotice);}
 }
 for(const address of [['207',8,9999],['108',99,999],['207','',''],['207',8,'']])assert.equal(seatGuidanceDestination(...address).kind,'section');
 for(const address of [['999',8,1],['207',-1,87],['207',1.5,87],['207','bad',87],['207',8,0]])assert.throws(()=>seatGuidanceDestination(...address));
 const to=seatGuidanceDestination('207',2,22),from=ORIGINS.find(o=>o.id==='gate-1b'),route=planner.plan(from,to);
 assert.equal(route.destination.id,'block-207');assert.ok(route.destination.guidanceNotice.includes('입구까지만'));
 assert.ok(!route.seat);assert.ok(route.legs.every(l=>!l.kind.startsWith('seat-')));
 const w=walk(route.points,createWalker(route.origin.floor,route.origin.point[0],route.origin.point[2]));
 assert.equal(routeProgress(route,w).arrived,true);assert.ok(!w.seating);
});

test('every observed address is reachable, lands on a real terrace, and can be walked back',()=>{
 const ray=new THREE.Raycaster();let checked=0;
 for(const b of SEAT_BLOCKS)for(const [i,seats]of b.catalogue.entries())for(const s of seats.filter(s=>s.evidence==='observed')){
  const seat=resolveSeat(b.id,i+1,s.number),r=seatRoute(seat),start={...createWalker(b.floor,b.portal[0],b.portal[2]),seatTarget:b.id},w=walk(r.points,start);
  assert.equal(routeProgress(r,w).arrived,true,seat.name);assert.ok(Math.abs(w.y-seat.point[1])<.01);
  ray.set(new THREE.Vector3(w.x,w.y+.23,w.z),new THREE.Vector3(0,-1,0));ray.far=.5;assert.ok(ray.intersectObject(model.seatBlocks.get(b.id),true).length,seat.name+' floor missing');
  const back=walk(r.points.toReversed(),w);assert.ok(Math.abs(back.y-b.entryY)<.05);checked++;
 }
 assert.equal(checked,203);
});
test('seat backs block shortcuts across rows while row aisles remain walkable',()=>{
 const b=SEAT_BLOCK_BY_ID.get('207'),seat=resolveSeat('207',8,87),r=seatRoute(seat),start={...createWalker(b.floor,...[b.portal[0],b.portal[2]]),seatTarget:b.id},w=walk(r.points,start),next=blockPoint(b,.475,rowV(b,9),rowY(b,9));
 const moved=moveWalker(w,next[0]-w.x,next[2]-w.z,model.colliders);assert.equal(moved.seatRow,8);assert.ok(Math.hypot(moved.x-next[0],moved.z-next[2])>.2);
 assert.equal(routeProgress(r,{...w,seatRow:9}).arrived,false);
});
for(const origin of ORIGINS)for(const address of [['207',8,87],['314',14,132]])test(origin.id+' reaches '+address.join('/'),()=>{
 const seat=resolveSeat(...address),r=planner.plan(origin,seat),w=walk(r.points,{...createWalker(r.origin.floor,r.origin.point[0],r.origin.point[2]),seatTarget:seat.section});assert.equal(routeProgress(r,w).arrived,true);
});
