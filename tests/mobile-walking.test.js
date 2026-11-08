import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSwipeWalking} from '../src/swipe-walking.js';

test('left movement and right look have independent, persistent touch ownership',()=>{
  globalThis.window=new EventTarget();globalThis.document=new EventTarget();
  const canvas=new EventTarget();canvas.clientWidth=800;canvas.setPointerCapture=()=>{};
  let move,look=[0,0],enabled=true;
  const controls=mountSwipeWalking(canvas,{enabled:()=>enabled,onBegin:()=>{},onMove:v=>move=v,onLook:(x,y)=>look=[look[0]+x,look[1]+y]});
  function pointer(type,id,x,y){const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:id,pointerType:'touch',clientX:x,clientY:y});canvas.dispatchEvent(e);}
  // The right thumb can arrive first and never starts walking.
  pointer('pointerdown',1,600,150);pointer('pointermove',1,650,120);
  assert.deepEqual(move,{forward:0,side:0});assert.deepEqual(look,[50,-30]);
  pointer('pointerdown',2,180,170);pointer('pointermove',2,180,122);
  assert.equal(move.forward,1);assert.equal(move.side,0);
  pointer('pointerup',1,650,120);assert.equal(move.forward,1);
  // A left touch crossing the midpoint is still movement, never view rotation.
  pointer('pointermove',2,450,170);assert.equal(move.side,1);assert.deepEqual(look,[50,-30]);
  pointer('pointercancel',2,450,170);assert.deepEqual(move,{forward:0,side:0});
  pointer('pointerdown',3,150,160);pointer('pointermove',3,150,210);assert.equal(move.forward,-1);
  window.dispatchEvent(new Event('blur'));assert.deepEqual(move,{forward:0,side:0});
  pointer('pointerdown',4,160,160);pointer('pointermove',4,160,110);enabled=false;
  pointer('pointermove',4,160,100);assert.deepEqual(move,{forward:0,side:0});
  controls.reset();delete globalThis.window;delete globalThis.document;
});
