import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildStadium} from '../src/model.js';

const model=buildStadium({labels:false});model.root.updateMatrixWorld(true);
test('concourse meshes retain their own evidence IDs when new details are prepended',()=>{
  assert.equal(model.root.getObjectByName('2F_ceiling').userData.detail.id,'mezzanine-soffit-footprint');
  assert.equal(model.root.getObjectByName('concourse_portal_frames').userData.detail.id,'concourse-column-haunch');
});
test('paired concourse supports have a continuous overhead beam with head clearance',()=>{
  const group=model.root.getObjectByName('concourse_portal_frames'),ray=new THREE.Raycaster();
  assert.equal(group.children.length,3);
  for(const beam of group.children){
    const [a,b]=beam.userData.supports.map(id=>model.colliders.find(c=>c.floor==='2F'&&c.id===id));
    assert.ok(a&&b);assert.ok(beam.userData.minimumClearance>=2);
    for(let i=0;i<=40;i++){
      const t=i/40;ray.set(new THREE.Vector3(a.x+(b.x-a.x)*t,4.5,a.z+(b.z-a.z)*t),new THREE.Vector3(0,1,0));ray.far=6;
      const hit=ray.intersectObject(beam,false)[0];assert.ok(hit,beam.name+' gap '+t);
      assert.ok(hit.distance>=5&&hit.distance<=5.3,beam.name+' clearance '+hit.distance);
    }
  }
});
