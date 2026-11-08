import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildStadium,canWalk} from '../src/model.js';
import {FEATURES,CONNECTORS} from '../src/data.js';
import {ENTRY_DOOR_FRAME} from '../src/entry-door-frame.js';
import {createWalker,moveWalker,projectConnector} from '../src/navigation.js';
import {currentPositionOrigin} from '../src/current-position-route.js';
import {createRoutePlanner,DESTINATIONS,routeProgress} from '../src/route-planner.js';
import {createPatrolSensors} from '../src/patrol-sensors.js';

const model=buildStadium({labels:false}),gate=FEATURES.find(f=>f.id===ENTRY_DOOR_FRAME.gate);
const yaw=Math.atan2(gate.x,gate.z+49),co=Math.cos(yaw),si=Math.sin(yaw);
const at=(x,z)=>[gate.x+co*(x+ENTRY_DOOR_FRAME.portalOffsetX)+si*(z+ENTRY_DOOR_FRAME.portalOffsetZ),gate.z-si*(x+ENTRY_DOOR_FRAME.portalOffsetX)+co*(z+ENTRY_DOOR_FRAME.portalOffsetZ)];
const walker=(x,z)=>createWalker(gate.floor,...at(x,z));
const sensors=createPatrolSensors(model),planner=createRoutePlanner(model.colliders);
const meshes=[];model.root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.name.startsWith('sign_'))meshes.push(o);});
const ray=new THREE.Raycaster();
function body(w){
  for(const [height,radius]of [[1.05,.22],[1.61,.17]])for(let i=0;i<8;i++){
    ray.set(new THREE.Vector3(w.x,w.y+height,w.z),new THREE.Vector3(Math.cos(i*Math.PI/4),0,Math.sin(i*Math.PI/4)));ray.far=radius;
    const hit=ray.intersectObjects(meshes,false)[0];if(hit)return [{object:hit.object.name,height,distance:hit.distance}];
  }
  return [];
}
function walk(points,w){
  for(const p of points.slice(1)){
    const dx=p[0]-w.x,dz=p[2]-w.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));
    for(let i=0;i<n;i++)w=moveWalker(w,dx/n,dz/n,model.colliders);
    assert.ok(Math.hypot(w.x-p[0],w.y-p[1],w.z-p[2])<.08,JSON.stringify({w,p}));
  }
  return w;
}

test('both GATE 2-3 door passages work in both directions with continuous floor height',()=>{
  for(const x of [-1.1,1.1])for(const reverse of [false,true]){
    const a=walker(x,reverse?2.2:-1.2),b=walker(x,reverse?-1.2:2.2);
    assert.ok(canWalk(a.x,a.z,model.colliders,a.floor),'door approach must be a legal public position');
    assert.ok(canWalk(b.x,b.z,model.colliders,b.floor),'door exit must be a legal public position');
    const end=walk([[a.x,a.y,a.z],[b.x,b.y,b.z]],a);
    assert.equal(end.floor,'2F');assert.equal(end.y,4.5);
    assert.deepEqual(sensors.inspect(end,yaw),[]);assert.deepEqual(body(end),[]);
  }
});

test('the central jamb and open door leaves block direct walking',()=>{
  for(const x of [0,...[-ENTRY_DOOR_FRAME.width/2+ENTRY_DOOR_FRAME.member,-ENTRY_DOOR_FRAME.member,ENTRY_DOOR_FRAME.member,ENTRY_DOOR_FRAME.width/2-ENTRY_DOOR_FRAME.member]]){
    const a=walker(x,-.7),b=walker(x,2),end=moveWalker(a,b.x-a.x,b.z-a.z,model.colliders);
    assert.ok(Math.hypot(end.x-b.x,end.z-b.z)>1.5,'no walking through visible door '+x);
    assert.equal(end.floor,a.floor);assert.equal(end.y,a.y);
  }
});

test('legal positions around the framed entrance have clear body and head space',()=>{
  let checked=0;
  for(let x=-3.4;x<=3.4;x+=.2)for(let z=-1.4;z<=2;z+=.2){
    const p=at(x,z);if(!canWalk(...p,model.colliders,'2F'))continue;
    // A floor-only state placed inside a stair ribbon is not a reachable
    // floor position. Actual stair entry/height is checked by walked routes.
    if(CONNECTORS.some(c=>{
      if(![c.from,c.to].includes('2F'))return false;
      const q=projectConnector(...p,c);
      return q.distance<c.width/2+.32&&!(q.segment===0&&q.raw<0)&&!(q.segment===c.path.length-2&&q.raw>1);
    }))continue;
    const w=walker(x,z);assert.deepEqual([...sensors.inspect(w,yaw),...body(w)],[],JSON.stringify({x,z}));checked++;
  }
  assert.ok(checked>200);
});

for(const x of [-1.3,1.3])test('current-position guidance leaves door passage '+x+' through public stairs without relocating',()=>{
  const w=walker(x,.6),route=planner.plan(currentPositionOrigin(w),DESTINATIONS.find(f=>f.id==='wc3-4'),{requireStairs:true});
  assert.deepEqual(route.origin.point,[w.x,w.y,w.z]);assert.ok(route.legs.some(l=>l.kind==='stair'));
  const end=walk(route.points,w);assert.equal(routeProgress(route,end).arrived,true);assert.equal(end.floor,'3F');
});

test('the entire fixed frame and open leaves clear the adjacent stair and room meshes',()=>{
  const gateMeshes=[],neighborMeshes=[];
  model.featureObjects.get(gate.id).traverse(o=>{if(o.isMesh&&!o.material.map)gateMeshes.push(o);});
  for(const f of FEATURES.filter(f=>f.id==='stair-1b-side'||(f.floor===gate.floor&&['shop','restroom','service','elevator'].includes(f.type)&&Math.hypot(f.x-gate.x,f.z-gate.z)<13))){
    model.featureObjects.get(f.id).traverse(o=>{if(o.isMesh&&!o.material.map)neighborMeshes.push(o);});
  }
  const checked=new Set(),collisions=[];
  for(const [source,target]of [[gateMeshes,neighborMeshes],[neighborMeshes,gateMeshes]])for(const m of source){
    const p=m.geometry.attributes.position,index=m.geometry.index;
    const count=index?index.count:p.count,vertex=i=>new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(m.matrixWorld);
    for(let i=0;i<count;i+=3)for(const [j,k]of [[0,1],[1,2],[2,0]]){
      const a=vertex(i+j),b=vertex(i+k),key=[a.toArray(),b.toArray()].map(v=>v.map(n=>n.toFixed(5)).join(',')).sort().join('|');
      if(checked.has(key))continue;checked.add(key);const d=b.clone().sub(a),length=d.length();if(length<.0001)continue;
      ray.set(a,d.normalize());ray.near=.0001;ray.far=length-.0001;
      const hit=ray.intersectObjects(target,false)[0];if(hit)collisions.push({source:m.name,target:hit.object.name,point:hit.point.toArray()});
    }
  }
  ray.near=0;assert.ok(checked.size>100);assert.deepEqual(collisions,[]);
});
