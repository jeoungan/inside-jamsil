import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CONNECTORS,FLOORS,FEATURES} from '../src/data.js';
import {createWalker,moveWalker,projectConnector} from '../src/navigation.js';
import {buildStadium} from '../src/model.js';
const model=buildStadium({labels:false});
function approach(c,reverse=false){const path=reverse?[...c.path].reverse():c.path,p=path[0],q=path[1],d=Math.hypot(q[0]-p[0],q[2]-p[2]);return createWalker(reverse?c.to:c.from,p[0]-(q[0]-p[0])/d,p[2]-(q[2]-p[2])/d);}
function traverse(c,reverse=false,colliders=model.colliders){
  const path=reverse?[...c.path].reverse():c.path;let w=approach(c,reverse),lastY=w.y;
  const end=path.at(-1),prev=path.at(-2),len=Math.hypot(end[0]-prev[0],end[2]-prev[2]);
  const route=[...path,[end[0]+(end[0]-prev[0])/len*1.8,end[1],end[2]+(end[2]-prev[2])/len*1.8]];
  for(const p of route){for(let i=0;i<2000;i++){const dx=p[0]-w.x,dz=p[2]-w.z,d=Math.hypot(dx,dz);if(d<.04)break;w=moveWalker(w,dx/d*Math.min(d,.08),dz/d*Math.min(d,.08),colliders);assert.ok(Math.abs(w.y-lastY)<.12,'continuous height');lastY=w.y;if(i===1999)assert.fail(`${c.id} ${reverse?'descending':'ascending'} stuck at ${JSON.stringify(w)} towards ${p}`);}}
  assert.equal(w.floor,reverse?c.from:c.to);assert.equal(w.connector,null);assert.equal(w.y,end[1]);return w;
}
for(const c of CONNECTORS)test(`${c.name}: walk up and down with model collisions`,()=>{traverse(c);traverse(c,true);});
test('sideways exits from the middle of a flight cannot fall or teleport to a floor',()=>{
  const c=CONNECTORS[0],a=c.path[1],b=c.path[2],x=(a[0]+b[0])/2,z=(a[2]+b[2])/2,p=projectConnector(x,z,c),w={...createWalker(c.from,x,z),y:p.y,connector:c.id};
  const next=moveWalker(w,-p.dz*20,p.dx*20,model.colliders);assert.equal(next.connector,c.id);assert.ok(projectConnector(next.x,next.z,c).distance<c.width/2);
});
test('an upper floor cannot enter the lower end of an opening',()=>{
  const c=CONNECTORS[0],w=approach(c);w.floor=c.to;w.y=FLOORS.find(f=>f.id===c.to).y;const a=c.path[0],b=c.path[1];const next=moveWalker(w,b[0]-a[0],b[2]-a[2],model.colliders);assert.equal(next.y,w.y);assert.equal(next.connector,null);
});
test('stairs and ramps have actual overhead clearance through slabs and ceilings',()=>{
  const ray=new THREE.Raycaster(),meshes=[];for(const l of model.layers.values())for(const category of [l.categories.slabs,l.categories.roof])category.traverse(o=>{if(o.isMesh)meshes.push(o);});
  for(const c of CONNECTORS)for(let i=1;i<c.path.length;i++)for(let j=1;j<10;j++){const a=c.path[i-1],b=c.path[i],t=j/10,p=a.map((v,k)=>v+(b[k]-v)*t);ray.set(new THREE.Vector3(p[0],p[1]+.25,p[2]),new THREE.Vector3(0,1,0));ray.far=1.65;assert.equal(ray.intersectObjects(meshes,false).length,0,c.id+' overhead at '+p);}
});
test('fast movement cannot tunnel through a structural column',()=>{
  const c=model.colliders.find(c=>c.floor==='2F'&&c.type==='column');const w=createWalker('2F',c.x-2,c.z);const next=moveWalker(w,4,0,[c]);assert.ok(next.x<c.x,'column blocks movement');
});
test('all twelve drawing-based restrooms can be entered through their doorways',()=>{
  for(const f of FEATURES.filter(f=>f.type==='restroom'&&f.floor==='2F')){
    const yaw=Math.atan2(f.x,f.z+49),d=f.depth/2+1.2,w=createWalker(f.floor,f.x+Math.sin(yaw)*d,f.z+Math.cos(yaw)*d),next=moveWalker(w,-Math.sin(yaw)*2.6,-Math.cos(yaw)*2.6,model.colliders);
    assert.ok(Math.hypot(next.x-w.x,next.z-w.z)>2.5,f.id+' entrance obstructed');
  }
});
