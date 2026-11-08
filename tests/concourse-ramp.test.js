import test from 'node:test';
import assert from 'node:assert/strict';
import {CONNECTORS,FEATURES} from '../src/data.js';
import {buildStadium} from '../src/model.js';
import {CONCOURSE_RAMP} from '../src/concourse-ramp.js';
import {createWalker,moveWalker} from '../src/navigation.js';
import {connectorRoute} from '../src/walking-route.js';
import {createPatrolSensors} from '../src/patrol-sensors.js';
import {createRoutePlanner,DESTINATIONS,routeProgress} from '../src/route-planner.js';
const model=buildStadium({labels:false}),c=CONNECTORS.find(c=>c.id===CONCOURSE_RAMP.id),sensor=createPatrolSensors(model),planner=createRoutePlanner(model.colliders);
function walk(points,floor){
 let w=createWalker(floor,points[0][0],points[0][2]),samples=0;
 for(const p of points.slice(1))for(let n=0;n<6000;n++){
  const dx=p[0]-w.x,dz=p[2]-w.z,d=Math.hypot(dx,dz);if(d<.02)break;
  const next=moveWalker(w,dx/d*Math.min(.08,d),dz/d*Math.min(.08,d),model.colliders);
  assert.ok(Math.hypot(next.x-w.x,next.z-w.z)>.001,'blocked '+JSON.stringify({w,p}));assert.ok(Math.abs(next.y-w.y)<.08);w=next;
  if(samples++%8===0)assert.deepEqual(sensor.inspect(w,Math.atan2(-dx,-dz)),[],JSON.stringify(w));
  assert.ok(n<5999);
 }
 return w;
}
test('C05 ramp retains the drawn hall columns and the existing facility positions',()=>{
 assert.equal(CONNECTORS.length,16);assert.equal(c.verticalEvidence,'inferred');assert.equal(c.path[0][1],c.path[1][1]);assert.equal(c.path.at(-1)[1],c.path.at(-2)[1]);
 for(const id of ['axis-31-1','axis-32-1','axis-33-1'])assert.ok(model.colliders.some(p=>p.floor==='2F'&&p.id===id));
 // These two shop fronts constrained fitting of the new public ramp.
 for(const [id,x,z]of [['shop-B34',93.62916953333952,-38.31055332138466],['shop-B35',93.62106681959824,-46.83535105619427]]){
  const f=FEATURES.find(f=>f.id===id);assert.equal(f.x,x);assert.equal(f.z,z);
 }
});
test('C05 ramp is continuously walkable both ways with real floor and headroom',()=>{
 const route=connectorRoute(c),up=walk(route,c.from),down=walk(route.toReversed(),c.to);
 assert.equal(up.floor,c.to);assert.equal(down.floor,c.from);assert.equal(up.connector,null);assert.equal(down.connector,null);
});
test('side attempts cannot climb onto or fall off the ramp',()=>{
 const route=connectorRoute(c),half=route.slice(0,Math.ceil(route.length/2)),w=walk(half,c.from);
 assert.equal(w.connector,c.id);
 const a=c.path[1],b=c.path[2],dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz);
 for(const side of [-1,1]){
  const next=moveWalker(w,-dz/len*8*side,dx/len*8*side,model.colliders);
  assert.equal(next.connector,c.id);assert.ok(Math.hypot(next.x-w.x,next.z-w.z)<1.2);assert.ok(Math.abs(next.y-w.y)<.12);
 }
});
test('normal routing may use the ramp while patrol routing finds a physical stair-using alternative',()=>{
 const point=connectorRoute(c)[0],from={id:'ramp-lower-approach',name:'C05 경사로 아래 공개 참',kind:'patrol-position',floor:'2F',x:point[0],z:point[2]},to=DESTINATIONS.find(f=>f.id==='shop-C05');
 const direct=planner.plan(from,to),required=planner.plan(from,to,{requireStairs:true});
 assert.ok(direct.legs.some(l=>l.connector===c.id));assert.ok(!direct.legs.some(l=>l.kind==='stair'));
 assert.ok(required.legs.some(l=>l.kind==='stair'));assert.ok(required.distance>direct.distance);
 for(const route of [direct,required])assert.ok(routeProgress(route,walk(route.points,route.origin.floor)).arrived);
});
