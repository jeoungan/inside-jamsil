import test from 'node:test';
import assert from 'node:assert/strict';
import {createClearanceCost} from '../src/route-clearance.js';
import {findFloorRoute} from '../src/walking-route.js';
import {createWalker,moveWalker} from '../src/navigation.js';

const columns=[-1,1].map(z=>({floor:'1F',type:'column',x:120,z:z-49,width:1,depth:1,yaw:0,height:3}));
const start=[116,0,-49],end=[124,0,-49];
test('prefer the open side of columns instead of a passable but cramped gap',()=>{
  const cost=createClearanceCost(columns),route=findFloorRoute(start,end,'1F',columns);
  assert.deepEqual(route[0],start);assert.deepEqual(route.at(-1),end);
  assert.ok(route.some(p=>Math.abs(p[2]+49)>2),'detour around the outside of both columns');
  assert.ok(cost.path(route)<cost.segment(start,end),'smoothing must retain the roomier route');
  let w=createWalker('1F',... [start[0],start[2]]);
  for(const p of route.slice(1)){
    const dx=p[0]-w.x,dz=p[2]-w.z,n=Math.ceil(Math.hypot(dx,dz)/.1);
    for(let i=0;i<n;i++)w=moveWalker(w,dx/n,dz/n,columns);
    assert.ok(Math.hypot(w.x-p[0],w.z-p[2])<.01,'the preferred route is physically walkable');
  }
});
test('a required narrow opening remains reachable without changing body radius',()=>{
  const walls=[-1,1].map(sign=>({floor:'1F',type:'wall',x:120,z:-49+sign*5.55,width:1,depth:10,yaw:0,height:3}));
  const route=findFloorRoute(start,end,'1F',walls);
  assert.deepEqual(route.at(-1),end);
  assert.ok(route.every(p=>Math.abs(p[2]+49)<5),'do not take a huge detour around a necessary doorway');
});
