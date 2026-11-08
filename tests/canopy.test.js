import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildStadium} from '../src/model.js';
import {SEAT_BLOCK_BY_ID,blockPoint,rowV,rowY} from '../src/seat-data.js';
import {CANOPY_SECTIONS,CANOPY_SUPPORTS} from '../src/canopy-profile.js';

const model=buildStadium({labels:false});
test('canopy has finite geometry and its detailed frames meet the public-gallery columns',()=>{
 model.envelope.traverse(o=>{if(!o.isMesh)return;assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite),o.name);});
 for(const cross of CANOPY_SECTIONS)assert.ok(cross.outer>cross.inner+10);
 for(const s of CANOPY_SUPPORTS){assert.ok(s.t>0&&s.t<1);const p=s.cross.at(s.t);assert.ok(Math.hypot(p[0]-s.column[0],p[2]-s.column[2])<1e-7);}
});
test('roof covers the photographed front navy rows without occupying their headroom',()=>{
 for(const [id,row]of [['322',5],['302',8]]){
  const b=SEAT_BLOCK_BY_ID.get(id),p=blockPoint(b,.5,rowV(b,row),rowY(b,row)),ray=new THREE.Raycaster(new THREE.Vector3(p[0],p[1]+1.68,p[2]),new THREE.Vector3(0,1,0));
  const hit=ray.intersectObject(model.envelope,true)[0];assert.ok(hit,id+' roof missing');assert.ok(hit.distance>2,id+' overhead clearance');
  ray.set(new THREE.Vector3(p[0],50,p[2]),new THREE.Vector3(0,-1,0));assert.ok(ray.intersectObject(model.envelope,true)[0].face.normal.y>.9,'roof exterior normal faces upward');
 }
});
