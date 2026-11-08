import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OUTER,INNER,FLOOR_VOIDS,FEATURES,CONNECTORS} from '../src/data.js';
import {buildStadium,canWalk} from '../src/model.js';
import {CONCOURSE_HALL,concourseHallGeometry} from '../src/concourse-hall.js';
import {onFloor,createWalker,moveWalker} from '../src/navigation.js';
import {findFloorRoute} from '../src/walking-route.js';
import {resolveAnchor,DESTINATIONS} from '../src/route-planner.js';
import {containsPoint,rectCorners} from '../src/spatial.js';
const model=buildStadium({labels:false}),hall=concourseHallGeometry(OUTER,INNER),ray=new THREE.Raycaster();

test('first-base high hall removes only its outer mezzanine while retaining the upper roof',()=>{
  assert.deepEqual(FLOOR_VOIDS['2.5F'][1],hall.void);assert.equal(CONNECTORS.length,16);
  const groups=['2F','2.5F','3F'].flatMap(id=>{const l=model.layers.get(id);return [l.categories.slabs,l.categories.roof];});
  for(const axis of [31.7,32.2,32.6,33.3]){
    const p=hall.at(axis,.08);assert.equal(onFloor(...p,'2.5F'),false);
    ray.set(new THREE.Vector3(p[0],4.55,p[1]),new THREE.Vector3(0,1,0));ray.far=7;
    const hit=ray.intersectObjects(groups,true)[0];assert.ok(hit);assert.ok(hit.distance>4.9&&hit.distance<6,JSON.stringify({axis,hit:hit.distance}));
  }
});

test('clerestory has a solid lower wall and header with an actual open band between them',()=>{
  const g=model.root.getObjectByName('door_37_clerestory_hall');assert.deepEqual(g.userData.profile,CONCOURSE_HALL);
  for(const axis of [31.2,31.6,32.4,32.8]){
    const inside=hall.at(axis,.12),outside=hall.at(axis,-.08),direction=new THREE.Vector3(outside[0]-inside[0],0,outside[1]-inside[1]).normalize();
    for(const [height,blocked]of [[4.3,true],[4.95,false],[5.55,true]]){
      ray.set(new THREE.Vector3(inside[0],4.5+height,inside[1]),direction);ray.far=8;
      assert.equal(ray.intersectObject(g,true).length>0,blocked,JSON.stringify({axis,height}));
    }
  }
});

test('C05 room footprint and walking access remain on the retained mezzanine',()=>{
  const shop=FEATURES.find(f=>f.id==='shop-C05'),room=rectCorners(shop.x,shop.z,shop.width,shop.depth,shop.doorYaw);
  for(const p of room)assert.equal(containsPoint(p,hall.void),false,'room must not hang over new hole');
  const a=resolveAnchor(DESTINATIONS.find(f=>f.id==='shop-C04'),model.colliders),b=resolveAnchor(DESTINATIONS.find(f=>f.id===shop.id),model.colliders);
  const route=findFloorRoute(a.point,b.point,'2.5F',model.colliders);let w=createWalker('2.5F',a.point[0],a.point[2]);
  for(const p of route.slice(1)){
    const dx=p[0]-w.x,dz=p[2]-w.z,n=Math.ceil(Math.hypot(dx,dz)/.1);
    for(let i=0;i<n;i++)w=moveWalker(w,dx/n,dz/n,model.colliders);
    assert.ok(Math.hypot(w.x-p[0],w.z-p[2])<.04);assert.equal(w.y,7.5);
  }
  assert.ok(canWalk(w.x,w.z,model.colliders,'2.5F'));
});

test('retained passage guards stop large outward moves without a floor drop',()=>{
  for(const axis of [31.8,32.4,33.2]){
    const p=hall.at(axis,.48),q=hall.at(axis,.1);assert.ok(canWalk(...p,model.colliders,'2.5F'));
    const w=moveWalker(createWalker('2.5F',...p),q[0]-p[0],q[1]-p[1],model.colliders);
    assert.equal(w.floor,'2.5F');assert.equal(w.y,7.5);assert.equal(w.connector,null);
    assert.ok(canWalk(w.x,w.z,model.colliders,'2.5F'));assert.ok(Math.hypot(w.x-q[0],w.z-q[1])>3);
  }
});
