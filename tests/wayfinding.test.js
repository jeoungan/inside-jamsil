import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildStadium} from '../src/model.js';
import {CONNECTORS,FEATURES} from '../src/data.js';
import {ORIGINS,DESTINATIONS,createRoutePlanner,routeProgress} from '../src/route-planner.js';
import {createWalker,moveWalker,onFloor} from '../src/navigation.js';
import {ribbonEdges,ribbonHeight,segmentIntersectsRect} from '../src/spatial.js';
import {RESTRICTED_ZONES} from '../src/access-geometry.js';
const model=buildStadium({labels:false}),planner=createRoutePlanner(model.colliders);
function follow(route,step=.15){let w=createWalker(route.origin.floor,route.origin.point[0],route.origin.point[2]);
  for(const p of route.points.slice(1)){const dx=p[0]-w.x,dz=p[2]-w.z,n=Math.ceil(Math.hypot(dx,dz)/step);for(let i=0;i<n;i++)w=moveWalker(w,dx/n,dz/n,model.colliders);assert.ok(Math.hypot(w.x-p[0],w.z-p[2])<.05,'blocked near '+p);}
  assert.equal(w.floor,route.destination.floor);assert.equal(routeProgress(route,w).arrived,true);return w;
}
for(const [from,to]of [['gate-21','wc3-0'],['gate-23','wc3-4'],['gate-1b','wc2-1b-2'],['gate-22','wc3-0'],['gate-22','section-220'],['gate-3b','section-207'],['gate-1b','seat-upper-3'],['gate-out3','wc1-0'],['gate-out1','wc1-3']])test('route '+from+' → '+to+' stays walkable',()=>{
  const r=planner.plan(ORIGINS.find(f=>f.id===from),DESTINATIONS.find(f=>f.id===to));follow(r);assert.ok(r.distance>0);
});
test('ramps have a sealed surface across both sides of every bend',()=>{
  const ray=new THREE.Raycaster();
  for(const c of CONNECTORS.filter(c=>c.type==='ramp')){
    const edges=ribbonEdges(c.path,c.width),meshes=[];model.featureObjects.get(c.id).traverse(o=>{if(o.isMesh)meshes.push(o);});
    for(let i=1;i<edges.length-1;i++)for(const side of [.12,.3,.5,.7,.88])for(const shift of [-.1,0,.1]){
      const p=edges[i][0].map((v,k)=>v+(edges[i][1][k]-v)*side),dx=c.path[i+1][0]-c.path[i-1][0],dz=c.path[i+1][2]-c.path[i-1][2],d=Math.hypot(dx,dz);p[0]+=dx/d*shift;p[2]+=dz/d*shift;const y=ribbonHeight(p[0],p[2],c);assert.ok(y!==null);ray.set(new THREE.Vector3(p[0],y+.15,p[2]),new THREE.Vector3(0,-1,0));ray.far=.35;assert.ok(ray.intersectObjects(meshes,false).length,'gap at '+c.id+' bend '+i);
    }
  }
});
test('staff areas, field and upper floor openings are excluded from walking',()=>{
  for(const r of RESTRICTED_ZONES)assert.equal(onFloor(r.x,r.z,r.floor),false,r.id);
  for(const floor of ['1F','2F','2.5F','3F','4F'])assert.equal(onFloor(0,0,floor),false);
  for(const c of CONNECTORS){const p=c.path[0],q=c.path[1],x=p[0]+(q[0]-p[0])*.2,z=p[2]+(q[2]-p[2])*.2;assert.equal(onFloor(x,z,c.to),false,c.id+' opening on upper floor');}
});
test('continuous collision prevents clipping a thin wall corner at any step size',()=>{
  const c={floor:'2F',x:0,z:0,width:.18,depth:10,yaw:.7},a=[-.6,4.7],b=[.6,4.4];assert.equal(segmentIntersectsRect([-1,0],[1,0],c,.32),true);
  for(const r of model.colliders.filter(c=>c.type==='enclosure').slice(0,6)){const yaw=r.yaw,nx=Math.sin(yaw),nz=Math.cos(yaw),w=createWalker(r.floor,r.x+nx*1.2,r.z+nz*1.2),next=moveWalker(w,-nx*3,-nz*3,model.colliders);assert.ok(Math.hypot(next.x-w.x,next.z-w.z)<2.5);}
});
test('route progress distinguishes floors and reports deviation',()=>{
  const r=planner.plan(ORIGINS.find(f=>f.id==='gate-1b'),DESTINATIONS.find(f=>f.id==='seat-upper-3')),p=r.destination.point;
  assert.equal(routeProgress(r,createWalker('4F',p[0]+30,p[2])).offRoute,true);
  assert.equal(routeProgress(r,createWalker('3F',p[0],p[2])).arrived,false);
});
