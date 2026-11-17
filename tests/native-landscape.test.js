import test from 'node:test';
import assert from 'node:assert/strict';
import {requestNativeLandscape} from '../src/native-landscape.js';

test('orientation lock waits for real fullscreen entry',async()=>{
  const calls=[];let enter;
  const doc={fullscreenElement:null,documentElement:{requestFullscreen:()=>{calls.push('fullscreen');return new Promise(resolve=>{enter=()=>{doc.fullscreenElement=doc.documentElement;resolve();};});}}};
  const pending=requestNativeLandscape(doc,{lock:async mode=>calls.push(mode)});
  assert.deepEqual(calls,['fullscreen']);enter();await pending;
  assert.deepEqual(calls,['fullscreen','landscape']);
});
test('fullscreen refusal leaves orientation untouched',async()=>{
  let locked=false;
  await assert.rejects(requestNativeLandscape({fullscreenElement:null,documentElement:{requestFullscreen:async()=>{throw new Error('denied');}}},{lock:async()=>{locked=true;}}),/denied/);
  assert.equal(locked,false);
});
test('unsupported orientation does not enter fullscreen',async()=>{
  let entered=false;
  await assert.rejects(requestNativeLandscape({documentElement:{requestFullscreen:async()=>{entered=true;}}},{}),/unavailable/);
  assert.equal(entered,false);
});
test('failed orientation lock rolls back only fullscreen entered by this request',async()=>{
  for(const alreadyFullscreen of [false,true]){
    let exits=0,entries=0;
    const doc={fullscreenElement:alreadyFullscreen?{}:null,documentElement:{requestFullscreen:async()=>{entries++;doc.fullscreenElement={};}},exitFullscreen:async()=>{exits++;doc.fullscreenElement=null;}};
    await assert.rejects(requestNativeLandscape(doc,{lock:async()=>{throw new Error('unsupported');}}),/unsupported/);
    assert.equal(entries,alreadyFullscreen?0:1);assert.equal(exits,alreadyFullscreen?0:1);
  }
});
