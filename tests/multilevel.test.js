import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FLOORS,CONNECTORS,FEATURES,FLOOR_POLYGONS,arcPoint} from '../src/data.js';
import {buildStadium} from '../src/model.js';
import {createWalker,moveWalker,onFloor,blockedAtHeight} from '../src/navigation.js';
import {createFullTour,findFloorRoute,connectorRoute} from '../src/walking-route.js';
const model=buildStadium({labels:false});

test('five levels have distinct heights and non-duplicated intermediate footprints',()=>{
  assert.deepEqual(FLOORS.map(f=>f.id),['1F','2F','2.5F','3F','4F']);
  assert.equal(new Set(FLOORS.map(f=>f.y)).size,5);
  assert.notDeepEqual(FLOOR_POLYGONS['2F'],FLOOR_POLYGONS['2.5F']);
  assert.notDeepEqual(FLOOR_POLYGONS['3F'],FLOOR_POLYGONS['4F']);
  const [x,z]=arcPoint(40,.4);assert.equal(onFloor(x,z,'3F'),true);assert.equal(onFloor(x,z,'4F'),false);
});
test('mezzanine facilities and uncertain upper assignment preserve their evidence',()=>{
  assert.equal(FEATURES.filter(f=>f.floor==='2.5F'&&f.amenity).length,5);
  assert.equal(FEATURES.find(f=>f.id==='shop-C02').type,'service');
  assert.equal(FEATURES.find(f=>f.id==='shop-C03').amenity.name,'수유실');
  assert.ok(FEATURES.filter(f=>f.floor==='3F'&&f.amenity).every(f=>f.floorAssignment==='official-guide-3F'));
  assert.ok(FEATURES.filter(f=>f.floor==='3F'&&f.type==='restroom').every(f=>f.floorAssignment==='unverified'));
  assert.ok(CONNECTORS.every(c=>c.verticalEvidence==='inferred'));
});
test('every flight clears room walls and structures on all overlapping storeys',()=>{
  for(const c of CONNECTORS)for(let i=1;i<c.path.length;i++)for(let j=0;j<=30;j++){
    const a=c.path[i-1],b=c.path[i],p=a.map((v,k)=>v+(b[k]-v)*j/30);
    assert.equal(blockedAtHeight(p[0],p[1],p[2],model.colliders),false,c.id+' intersects a room/column at '+p);
  }
});
test('ground ramp approaches belong to the same walkable outdoor space',()=>{
  const ramps=CONNECTORS.filter(c=>c.type==='ramp'&&c.from==='1F'),start=connectorRoute(ramps[0])[0];
  for(const c of ramps.slice(1)){
    const route=findFloorRoute(start,connectorRoute(c)[0],'1F',model.colliders);let w=createWalker('1F',start[0],start[2]);
    for(const p of route.slice(1)){const dx=p[0]-w.x,dz=p[2]-w.z,n=Math.ceil(Math.hypot(dx,dz)/.1);for(let i=0;i<n;i++)w=moveWalker(w,dx/n,dz/n,model.colliders);assert.ok(Math.hypot(w.x-p[0],w.z-p[2])<.04);assert.equal(w.connector,null);}
  }
});
test('walk continuously through all five floors and back without resetting the walker',()=>{
  const route=createFullTour(model.colliders),start=route[0],visited=new Set(['1F']);let w=createWalker('1F',start[0],start[2]),maxStep=0;
  const ray=new THREE.Raycaster(),surfaces=[];
  for(const l of model.layers.values())for(const category of [l.categories.slabs,l.categories.stairs])category.traverse(o=>{if(o.isMesh)surfaces.push(o);});
  let steps=0;
  for(const p of [...route.slice(1),...route.toReversed().slice(1)]){
    for(let i=0;i<3000;i++){
      const dx=p[0]-w.x,dz=p[2]-w.z,d=Math.hypot(dx,dz);if(d<.025)break;
      const next=moveWalker(w,dx/d*Math.min(d,.08),dz/d*Math.min(d,.08),model.colliders);
      assert.ok(Math.hypot(next.x-w.x,next.z-w.z)>.001,'route blocked '+JSON.stringify(w)+' towards '+p);
      maxStep=Math.max(maxStep,Math.abs(next.y-w.y));w=next;visited.add(w.floor);
      if(steps++%15===0){ray.set(new THREE.Vector3(w.x,w.y+.25,w.z),new THREE.Vector3(0,-1,0));ray.far=.65;assert.ok(ray.intersectObjects(surfaces,false).length,'no model surface under walker '+JSON.stringify(w));}
      if(i===2999)assert.fail('route iteration limit');
    }
  }
  assert.deepEqual([...visited],FLOORS.map(f=>f.id));assert.equal(w.floor,'1F');assert.equal(w.connector,null);assert.ok(maxStep<.06,'no vertical teleport');
});
