import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OUTER,INNER,FLOOR_VOIDS,CONNECTORS} from '../src/data.js';
import {buildStadium,canWalk} from '../src/model.js';
import {ENTRY_HALL,entryHallGeometry} from '../src/entry-hall.js';
import {createWalker,moveWalker,onFloor} from '../src/navigation.js';
import {CONCOURSE_INSPECTION_TARGETS} from '../src/concourse-inspection.js';
import {resolveAnchor} from '../src/route-planner.js';
const model=buildStadium({labels:false}),hall=entryHallGeometry(OUTER,INNER),ray=new THREE.Raycaster();

test('entrance hall opens the mezzanine and its soffit while retaining the roof above',()=>{
  const floors=['2F','2.5F','3F'].flatMap(id=>{const l=model.layers.get(id);return [l.categories.slabs,l.categories.roof];});
  for(const axis of [3.7,4.3,4.7,5.3]){
    const p=hall.at(axis,.25);assert.ok(canWalk(...p,model.colliders,'2F'));
    assert.equal(onFloor(...p,'2.5F'),false);
    ray.set(new THREE.Vector3(p[0],4.55,p[1]),new THREE.Vector3(0,1,0));ray.far=7;
    const hit=ray.intersectObjects(floors,true)[0];assert.ok(hit);assert.ok(hit.distance>4.9&&hit.distance<6,JSON.stringify({axis,distance:hit.distance}));
  }
  assert.deepEqual(FLOOR_VOIDS['2.5F'][0],hall.void);assert.equal(CONNECTORS.length,16);
});

test('tall entrance posts and upper beams use existing paired supports without floating mezzanine posts',()=>{
  const group=model.root.getObjectByName('gate_21_high_hall_frames');
  assert.equal(group.userData.detail.id,'gate-21-high-hall');assert.deepEqual(group.userData.profile,ENTRY_HALL);
  assert.equal(group.children.length,2);
  for(const beam of group.children){
    const [inner,outer]=beam.userData.supports;
    assert.equal(model.colliders.find(c=>c.floor==='2F'&&c.id===outer).height,5.66);
    assert.equal(model.colliders.some(c=>c.floor==='2.5F'&&c.id===outer),false);
    assert.ok(model.colliders.some(c=>c.floor==='2.5F'&&c.id===inner));
    assert.ok(beam.userData.minimumClearance-3>=2);
  }
});

test('retained mezzanine passage can be walked continuously beside the opening',()=>{
  const start=hall.at(3.3,.65);let walker=createWalker('2.5F',...start);
  assert.ok(canWalk(...start,model.colliders,'2.5F'));
  for(let axis=3.31;axis<=5.7;axis+=.01){
    const p=hall.at(axis,.65);walker=moveWalker(walker,p[0]-walker.x,p[1]-walker.z,model.colliders);
    assert.ok(Math.hypot(walker.x-p[0],walker.z-p[1])<.02,JSON.stringify({axis,walker,p}));
    assert.equal(walker.y,7.5);assert.equal(walker.floor,'2.5F');assert.equal(walker.connector,null);
  }
});

test('large moves toward the entrance void stop at its guard without changing floors',()=>{
  for(const axis of [3.8,4.4,5.2]){
    const start=hall.at(axis,.64),target=hall.at(axis,.1),walker=moveWalker(createWalker('2.5F',...start),target[0]-start[0],target[1]-start[1],model.colliders);
    assert.equal(walker.y,7.5);assert.equal(walker.floor,'2.5F');assert.equal(walker.connector,null);
    assert.ok(canWalk(walker.x,walker.z,model.colliders,'2.5F'));
    assert.ok(Math.hypot(walker.x-target[0],walker.z-target[1])>6);
  }
});

test('hall inspection target stays on the upper passage and faces the opening',()=>{
  const target=CONCOURSE_INSPECTION_TARGETS[0],anchor=resolveAnchor(target,model.colliders);
  assert.equal(anchor.offset,0);assert.equal(anchor.arrivalYaw,target.arrivalYaw);
  assert.ok(canWalk(target.x,target.z,model.colliders,target.floor));
  assert.equal(onFloor(target.x-Math.sin(anchor.arrivalYaw)*5,target.z-Math.cos(anchor.arrivalYaw)*5,target.floor),false);
});

test('secondary hall ribs join the existing portals and roof without lowering the public passage ceiling',()=>{
  const ribs=model.root.getObjectByName('gate_21_high_hall_ribs'),portals=model.root.getObjectByName('gate_21_high_hall_frames');
  assert.equal(ribs.userData.dimensionEvidence,'inferred');assert.equal(ribs.children.length,3);
  const box=new THREE.Box3();
  for(const rib of ribs.children){
    box.setFromObject(rib);assert.ok(box.min.y-7.5>2.3,'retained mezzanine headroom');
    const fraction=rib.userData.fraction;
    for(const [i,axis]of [4,5].entries()){
      const p=hall.at(axis,fraction),point=new THREE.Vector3(p[0],box.max.y-.15,p[1]);
      assert.ok(box.containsPoint(point));assert.ok(new THREE.Box3().setFromObject(portals.children[i]).containsPoint(point),'joined portal end');
    }
    const p=hall.at(4.5,fraction);
    ray.set(new THREE.Vector3(p[0],9.4,p[1]),new THREE.Vector3(0,1,0));ray.far=1;
    const hit=ray.intersectObject(rib,false)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y-9.97)<1e-5,'actual underside height');
    ray.set(new THREE.Vector3(p[0],box.max.y-.2,p[1]),new THREE.Vector3(0,1,0));ray.far=.2;
    const roof=ray.intersectObject(model.layers.get('3F').categories.slabs,true)[0];assert.ok(roof,'solid upper slab overlaps rib top');
  }
});
