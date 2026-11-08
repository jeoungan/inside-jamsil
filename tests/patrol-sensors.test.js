import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStadium} from '../src/model.js';
import {ORIGINS,resolveAnchor} from '../src/route-planner.js';
import {createWalker} from '../src/navigation.js';
import {createPatrolSensors} from '../src/patrol-sensors.js';

test('all public spawn gates have a rendered floor including raised entry aprons',()=>{
 const model=buildStadium({labels:false}),sensors=createPatrolSensors(model);
 for(const origin of ORIGINS){const a=resolveAnchor(origin,model.colliders),w=createWalker(a.floor,a.point[0],a.point[2]);
  assert.deepEqual(sensors.inspect(w,0).filter(f=>f.code==='floor-mesh-gap'),[],origin.id);
 }
});
