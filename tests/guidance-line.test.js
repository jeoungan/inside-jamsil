import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGuidanceLine} from '../src/guidance-line.js';

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
