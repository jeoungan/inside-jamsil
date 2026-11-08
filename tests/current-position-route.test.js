import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStadium} from '../src/model.js';
import {CONNECTORS} from '../src/data.js';
import {createRoutePlanner,DESTINATIONS,routeProgress,resolveAnchor} from '../src/route-planner.js';
import {currentPositionOrigin} from '../src/current-position-route.js';
import {createWalker,moveWalker,onFloor,blockedAtHeight} from '../src/navigation.js';
import {connectorRoute} from '../src/walking-route.js';
import {SEAT_BLOCK_BY_ID,resolveSeat} from '../src/seat-data.js';
import {seatLegs} from '../src/seating-navigation.js';
import {UPPER_GALLERY_TARGETS,upperGalleryLegs} from '../src/upper-gallery.js';
import {NAVY_FRONT_TARGETS,navyFrontLegs} from '../src/navy-front-gallery.js';
import {OUTFIELD_GALLERY_TARGETS,galleryLegs} from '../src/outfield-gallery.js';
const model=buildStadium({labels:false}),planner=createRoutePlanner(model.colliders);
const target=id=>DESTINATIONS.find(f=>f.id===id);
function walk(points,walker){
  let w={...walker};
  for(const p of points.slice(1)){
    const dx=p[0]-w.x,dz=p[2]-w.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));
    for(let i=0;i<n;i++)w=moveWalker(w,dx/n,dz/n,model.colliders);
    assert.ok(Math.hypot(w.x-p[0],w.y-p[1],w.z-p[2])<.12,JSON.stringify({p,w}));
  }
  return w;
}
function check(w,to){
  const before={...w},route=planner.plan(currentPositionOrigin(w),to);
  assert.deepEqual(w,before);assert.deepEqual(route.points[0],[w.x,w.y,w.z]);assert.deepEqual(route.origin.point,route.points[0]);
  const end=walk(route.points,{...w,seatTarget:route.walkSection});assert.ok(routeProgress(route,end).arrived,JSON.stringify(end));
  return route;
}
for(const id of ['wc1-0','wc2-1b-2','shop-C05','wc3-4','seat-upper-3'])test('current position on '+id+' level is exact and remains walkable',()=>{
  const a=resolveAnchor(target(id),model.colliders),w=createWalker(a.floor,a.point[0],a.point[2]);
  check(w,target(id==='shop-C05'?'wc3-4':'shop-C05'));
});
for(const id of ['ramp-c05','stair-1b-side'])for(const reverse of [false,true])test('reroute from the middle of '+id+' in '+(reverse?'descending':'ascending')+' state',()=>{
  const c=CONNECTORS.find(c=>c.id===id),path=connectorRoute(c,reverse),cut=Math.floor(path.length/2),p=path[0];
  const w=walk(path.slice(0,cut+1),createWalker(reverse?c.to:c.from,p[0],p[2]));
  assert.equal(w.connector,id);
  check(w,target('shop-C05'));check(w,target('wc2-1b-2'));
});
for(const address of [['207',8,87],['314',14,132]])test('depart from a confirmed seat without resetting the body '+address.join('/'),()=>{
  const seat=resolveSeat(...address),b=SEAT_BLOCK_BY_ID.get(seat.section),points=seatLegs(seat).flatMap(l=>l.points);
  const w=walk(points,{...createWalker(b.floor,b.portal[0],b.portal[2]),seatTarget:b.id});
  assert.equal(w.seatRow,seat.row);check(w,target('shop-C05'));
  const same=check(w,seat);assert.ok(same.distance<.01,'already at this seat: do not return through the entrance');
  const other=b.catalogue[seat.row-1].find(s=>s.evidence==='observed'&&s.number!==seat.number);
  if(other){const nearby=check(w,resolveSeat(b.id,seat.row,other.number));assert.ok(nearby.distance<15,'same row route stays in the row');}
});
for(const [targetItem,legs]of [[UPPER_GALLERY_TARGETS[0],upperGalleryLegs],[NAVY_FRONT_TARGETS[0],navyFrontLegs],[OUTFIELD_GALLERY_TARGETS[0],galleryLegs]])test('depart from '+targetItem.id+' using its public access',()=>{
  const b=SEAT_BLOCK_BY_ID.get(targetItem.section),points=legs(targetItem).flatMap(l=>l.points);
  const w=walk(points,{...createWalker(b.floor,b.portal[0],b.portal[2]),seatTarget:b.id});check(w,target('shop-C05'));
});
test('a legal stop close to a column has a walked departure, not a fitted origin',()=>{
  const c=model.colliders.find(c=>c.id==='axis-31-1'&&c.floor==='2F'),d=c.width/2+.335;
  const w=createWalker('2F',c.x+Math.cos(c.yaw||0)*d,c.z-Math.sin(c.yaw||0)*d);
  assert.ok(onFloor(w.x,w.z,w.floor));assert.equal(blockedAtHeight(w.x,w.y,w.z,model.colliders),false);
  check(w,target('shop-C05'));
});
