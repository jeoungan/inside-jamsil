import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildStadium} from '../src/model.js';
import {CONNECTORS,FLOOR_POLYGONS} from '../src/data.js';
import {containsPoint} from '../src/spatial.js';
import {ENTRY_CANOPY,entryCanopyFrame} from '../src/entry-canopy.js';
const model=buildStadium({labels:false});
test('GATE 2-1 curved roof covers its approach and ends at the facade without slab penetration',()=>{
 const group=model.root.getObjectByName('gate_21_curved_canopy'),frame=entryCanopyFrame(CONNECTORS.find(c=>c.id==='ramp-21'));
 assert.equal(group.userData.detail.id,'gate-21-curved-canopy');assert.deepEqual(group.userData.profile,ENTRY_CANOPY);
 const panels=group.children.filter(m=>m.name==='curved_translucent_panel'),ray=new THREE.Raycaster();assert.ok(panels.length>0);
 for(const panel of panels){const a=panel.geometry.attributes.position;
  for(let i=0;i<a.count;i++){
   const p=[a.getX(i),a.getZ(i)],local=frame.local(p),outside=frame.at(local[0]-.001,local[1]);
   assert.equal(containsPoint(outside,FLOOR_POLYGONS['2F']),false,'roof does not penetrate existing floor footprint');
   assert.ok(Number.isFinite(a.getY(i)));
  }
 }
 for(const s of [-11,-9,-7])for(const u of [-1.5,0,1.5]){
  const p=frame.at(s,u),y=frame.floor(s,u);ray.set(new THREE.Vector3(p[0],y,p[1]),new THREE.Vector3(0,1,0));ray.far=6;
  const hit=ray.intersectObjects(panels,false)[0];assert.ok(hit,'continuous roof above public approach');assert.ok(hit.distance>2.4);
 }
 assert.equal(model.root.getObjectByName('gate-13').getObjectByName('gate_21_curved_canopy'),undefined);
});
