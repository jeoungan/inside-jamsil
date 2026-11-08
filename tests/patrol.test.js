import test from 'node:test';
import assert from 'node:assert/strict';
import {createPatrol,seededRandom} from '../src/npc-patrol.js';
import {createRoutePlanner,ORIGINS} from '../src/route-planner.js';
import {buildStadium} from '../src/model.js';

test('patrol random sequence is reproducible without changing global randomness',()=>{
  const a=seededRandom(152),b=seededRandom(152),c=seededRandom(153);
  const x=Array.from({length:20},a),y=Array.from({length:20},b),z=Array.from({length:20},c);
  assert.deepEqual(x,y); assert.notDeepEqual(x,z); assert.ok(x.every(v=>v>=0&&v<1));
});

test('a path that changes its start cannot teleport the patrol body',async()=>{
  const model=buildStadium({labels:false});
  const patrol=createPatrol({colliders:model.colliders,seed:4,plan:()=>({legs:[{kind:'stair'}],points:[[999,999,999]]})});
  const before=patrol.walker;patrol.start();await patrol.pending;
  assert.deepEqual(patrol.walker,before);assert.equal(patrol.snapshot().status,'waiting');
  assert.equal(patrol.snapshot().reports[0].code,'route-unavailable');
});

test('pausing a pending plan cannot resume movement when the result arrives',async()=>{
  const model=buildStadium({labels:false});let resolve;
  const promise=new Promise(r=>resolve=r);
  const patrol=createPatrol({colliders:model.colliders,seed:4,plan:()=>promise});
  const before=patrol.walker;patrol.start();patrol.pause();resolve({});await patrol.pending;patrol.step(60);
  assert.equal(patrol.snapshot().status,'paused');assert.deepEqual(patrol.walker,before);
});

test('two physical missions preserve position between randomized destinations and use stairs',async()=>{
  const model=buildStadium({labels:false}),planner=createRoutePlanner(model.colliders);
  const patrol=createPatrol({colliders:model.colliders,seed:20261108,origin:ORIGINS.find(o=>o.id==='gate-1b'),plan:planner.plan});
  patrol.start();let previous=patrol.walker;
  for(let i=0;i<18000&&patrol.snapshot().completed<2;i++){
    if(patrol.pending){const before=patrol.walker;await patrol.pending;const after=patrol.walker;assert.deepEqual([after.x,after.y,after.z,after.floor,after.connector],[before.x,before.y,before.z,before.floor,before.connector]);}
    patrol.step(.2);const next=patrol.walker;
    assert.ok(Math.hypot(next.x-previous.x,next.z-previous.z)<=.291);
    assert.ok(Math.abs(next.y-previous.y)<.35);
    assert.notEqual(patrol.snapshot().status,'blocked',JSON.stringify(patrol.snapshot()));previous=next;
  }
  const result=patrol.exportReport();assert.equal(result.completed,2);
  assert.ok(result.trips.every(t=>t.transfers>0&&t.fromFloor!==t.toFloor));
  assert.notEqual(result.trips[0].destination,result.trips[1].destination);
});

test('retrying a mesh obstruction keeps the same body and remaining route',async()=>{
  const model=buildStadium({labels:false}),planner=createRoutePlanner(model.colliders);let obstructed=true;
  const patrol=createPatrol({colliders:model.colliders,seed:20261108,origin:ORIGINS.find(o=>o.id==='gate-1b'),plan:planner.plan,inspect:()=>obstructed?[{code:'low-headroom',message:'Test obstruction'}]:[]});
  patrol.start();await patrol.pending;patrol.step(1);
  assert.equal(patrol.snapshot().status,'blocked');const body=patrol.walker,route=patrol.route;
  obstructed=false;patrol.retry();assert.deepEqual(patrol.walker,body);assert.equal(patrol.route,route);
  patrol.step(.2);assert.equal(patrol.snapshot().status,'walking');
  const moved=Math.hypot(patrol.walker.x-body.x,patrol.walker.z-body.z);assert.ok(moved>0&&moved<=.291);
});
