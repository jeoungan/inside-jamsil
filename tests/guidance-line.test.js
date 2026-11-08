import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGuidanceLine,createPaintSurfaceSampler} from '../src/guidance-line.js';
import {buildStadium} from '../src/model.js';
import {resolveSeat} from '../src/seat-data.js';
import {seatLegs} from '../src/seating-navigation.js';

for(const reverse of [false,true])test('paint stays on each tread and wraps risers '+(reverse?'downstairs':'upstairs'),()=>{
  const height=x=>Math.ceil(Math.max(0,x)/.25)*.15;
  const points=reverse?[[2,1.2,0],[0,0,0]]:[[0,0,0],[2,1.2,0]];
  const mesh=createGuidanceLine(points,.8,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),(x)=>height(x));
  assert.ok(mesh.userData.riserCount>=7);
  mesh.updateMatrixWorld();const ray=new THREE.Raycaster();
  for(let x=.02;x<1.99;x+=.02){
    if(Math.abs(x/.25-Math.round(x/.25))<.012)continue;
    ray.set(new THREE.Vector3(x,3,0),new THREE.Vector3(0,-1,0));
    const hit=ray.intersectObject(mesh)[0];assert.ok(hit,'paint covers x='+x);
    assert.ok(hit.point.y>=height(x)+.02,'paint cannot disappear into a tread: '+x);
    assert.ok(hit.point.y<=height(x)+.04,'paint cannot float above a tread: '+x);
  }
  mesh.geometry.dispose();mesh.material.dispose();
});
test('smooth ramps do not gain false stair faces',()=>{
  const mesh=createGuidanceLine([[0,0,0],[4,1,0]],.8,new THREE.MeshBasicMaterial(),x=>x/4);
  assert.equal(mesh.userData.riserCount,0);mesh.geometry.dispose();mesh.material.dispose();
});

test('thin double-sided slabs use the top even when triangles have reversed winding',()=>{
  const root=new THREE.Group(),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const geometry=new THREE.BoxGeometry(4,.14,1.68).toNonIndexed();
  const a=geometry.attributes.position;
  for(let i=0;i<a.count;i+=3){const x=a.getX(i),y=a.getY(i),z=a.getZ(i);a.setXYZ(i,a.getX(i+2),a.getY(i+2),a.getZ(i+2));a.setXYZ(i+2,x,y,z);}
  geometry.computeVertexNormals();const slab=new THREE.Mesh(geometry,material);slab.position.y=4.43;root.add(slab);
  const sample=createPaintSurfaceSampler(root);
  assert.ok(Math.abs(sample(0,4.5,0)-4.5)<1e-6);
});
test('207 narrow approach paint remains above the rendered deck across its full length',()=>{
  const model=buildStadium({labels:false}),sample=createPaintSurfaceSampler(model.root);
  const leg=seatLegs(resolveSeat('207',8,87))[0],material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const line=createGuidanceLine(leg.points,.48,material,sample);line.updateMatrixWorld();
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);let checked=0;
  for(let i=1;i<leg.points.length;i++){
    const a=leg.points[i-1],b=leg.points[i],n=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/.15));
    for(let j=1;j<n;j++){
      const p=a.map((v,k)=>v+(b[k]-v)*j/n);
      ray.set(new THREE.Vector3(p[0],p[1]+.35,p[2]),down);ray.far=.7;
      const deck=ray.intersectObject(model.root,true).find(h=>!h.object.isInstancedMesh&&!h.object.material?.map);
      assert.ok(deck,'actual rendered deck');
      assert.ok(Math.abs(sample(...p)-deck.point.y)<.002,'sampler must select the actual top, independent of winding');
      const hit=ray.intersectObject(line)[0];assert.ok(hit,'continuous paint');
      assert.ok(hit.point.y>deck.point.y+.015,'paint must remain visible above deck');checked++;
    }
  }
  assert.ok(checked>100);
});
