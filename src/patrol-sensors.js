import * as THREE from 'three';
import {EYE_HEIGHT} from './navigation.js';
import {SEAT_BLOCK_BY_ID,blockUV,rowV} from './seat-data.js';

// Inspect real building meshes, independent of display-layer toggles. The stage,
// NPC body, route line and field cannot masquerade as a public floor.
export function createPatrolSensors(model) {
  const surfaces = [...model.layers.values()].flatMap(l => [l.categories.slabs, l.categories.stairs]);
  surfaces.push(model.seats);
  const structure = [...model.layers.values()].flatMap(l => Object.values(l.categories));
  structure.push(model.seats, model.envelope);
  const meshes = groups => { const result = []; for (const group of groups) group.traverse(o => { if (o.isMesh && !o.name.startsWith('sign_')) result.push(o); }); return [...new Set(result)]; };
  const surfaceMeshes = meshes(surfaces), structureMeshes = meshes(structure);
  // Gate aprons belong to door groups, not the main floor layer. They are real
  // public floor meshes and must be inspected before reporting a missing floor.
  model.root.traverse(o=>{if(o.isMesh&&o.name==='entry_platform')surfaceMeshes.push(o);});
  const down = new THREE.Raycaster(), up = new THREE.Raycaster(), ahead = new THREE.Raycaster();
  let last = null;
  function inspect(w, yaw) {
    model.root.updateMatrixWorld(true);
    down.set(new THREE.Vector3(w.x, w.y + .28, w.z), new THREE.Vector3(0, -1, 0)); down.far = .65;
    const foot = down.intersectObjects(surfaceMeshes, false)[0];
    up.set(new THREE.Vector3(w.x, w.y + .35, w.z), new THREE.Vector3(0, 1, 0)); up.far = EYE_HEIGHT - .2;
    const head = up.intersectObjects(structureMeshes, false)[0];
    ahead.set(new THREE.Vector3(w.x, w.y + EYE_HEIGHT, w.z), new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))); ahead.far = 8;
    const front = ahead.intersectObjects(structureMeshes, false)[0];
    // The navigator smooths stair treads. A navy-row rise is .53 m, split into
    // two physical treads; its maximum smooth-surface difference is .265 m.
    const block=SEAT_BLOCK_BY_ID.get(w.seating),uv=block?blockUV(block,w.x,w.z):null;
    const tread=w.seatArea==='aisle'||(uv&&uv.u>.87&&Math.abs(uv.v-rowV(block,1))*block.depth<.15);
    const onEntryStairs=block?.tier===4&&w.seatArea==='entry';
    const floorTolerance=tread ? block.rise/2+.025 : (w.connector||onEntryStairs) ? .18 : .12;
    last = {floorGap: foot ? +(w.y - foot.point.y).toFixed(3) : null, floorTolerance, headClear: !head, forwardDistance: front ? +front.distance.toFixed(2) : null, floorObject: foot?.object.name || null, headObject: head?.object.name || null};
    const findings = [];
    if (!foot || Math.abs(w.y - foot.point.y) > floorTolerance) findings.push({code: 'floor-mesh-gap', message: '보행 높이와 실제 바닥 메시가 맞지 않습니다.', details: {...last}});
    if (head) findings.push({code: 'low-headroom', message: '머리 공간에 보·슬래브가 걸립니다. 연결부 단면을 확인해야 합니다.', details: {...last}});
    return findings;
  }
  return {inspect, get last() { return last; }};
}
