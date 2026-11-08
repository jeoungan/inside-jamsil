import * as THREE from 'three';
import {createPatrol} from './npc-patrol.js';
import {createPatrolSensors} from './patrol-sensors.js';

export function mountPatrol({model, scene, follow, release, download, notify, prepare}) {
  const panel = document.createElement('section'); panel.className = 'patrol-panel'; panel.setAttribute('aria-label', '자율 탐색 캐릭터');
  panel.innerHTML = `<details open><summary>탐색 대원 <span id="npc-status">대기</span></summary><p id="npc-mission">공개 통로와 계단으로 목적지를 순회합니다.</p><div class="patrol-actions"><button id="npc-start">순회 시작</button><button id="npc-eye" aria-pressed="false">대원 시점</button><button id="npc-export">기록 저장</button></div><small id="npc-stats">첫 출발지는 무작위 · 도착한 곳에서 다음 여정 시작</small><small id="npc-sensors"></small><p id="npc-feedback" role="status"></p></details>`;
  document.querySelector('#viewport').append(panel);
  if(matchMedia('(max-width:700px)').matches)panel.querySelector('details').open=false;
  const $ = s => panel.querySelector(s), sensors = createPatrolSensors(model);
  let worker, sequence = 0, workerPending = new Map(), patrol = null, following = false, timer = 0, lastRoute = null, lastVisualPose = '';
  const figure = new THREE.Group(); figure.name = 'public_patrol_character'; figure.visible = false; scene.add(figure);
  const body = new THREE.MeshStandardMaterial({color: 0x53615a, roughness: .8}), skin = new THREE.MeshStandardMaterial({color: 0xc2c5bf, roughness: .8});
  const part = (geometry, material, x, y, z, parent = figure) => { const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  part(new THREE.CapsuleGeometry(.22, .42, 4, 8), body, 0, 1.05, 0);
  part(new THREE.SphereGeometry(.17, 12, 8), skin, 0, 1.61, 0);
  part(new THREE.BoxGeometry(.18, .065, .06), body, 0, 1.62, -.15);
  const limbs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * .13, .78, 0); figure.add(leg); part(new THREE.CapsuleGeometry(.085, .52, 3, 6), body, 0, -.31, 0, leg); limbs.push(leg);
    const arm = new THREE.Group(); arm.position.set(side * .3, 1.28, 0); figure.add(arm); part(new THREE.CapsuleGeometry(.065, .43, 3, 6), skin, 0, -.24, 0, arm); limbs.push(arm);
  }
  let routeLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color: 0x6b7d73, transparent: true, opacity: .8})); routeLine.name = 'npc_planned_path'; scene.add(routeLine);
  function plan(from, to, options) {
    if (!worker) {
      worker = new Worker(new URL('./route-worker.js', import.meta.url), {type: 'module'});
      worker.onmessage = ({data}) => { const p = workerPending.get(data.id); if (!p) return; clearTimeout(p.timeout); workerPending.delete(data.id); data.error ? p.reject(Error(data.error)) : p.resolve(data.route); };
      worker.onerror = () => { for (const p of workerPending.values()) { clearTimeout(p.timeout); p.reject(Error('순회 경로 계산기가 중단되었습니다.')); } workerPending.clear(); worker.terminate(); worker = null; };
    }
    return new Promise((resolve, reject) => {
      const id = ++sequence, timeout = setTimeout(() => { worker?.terminate(); worker = null; for (const p of workerPending.values()) { clearTimeout(p.timeout); p.reject(Error('경로 계산 시간이 초과되었습니다. 위치는 유지합니다.')); } workerPending.clear(); }, 120000);
      workerPending.set(id, {resolve, reject, timeout}); worker.postMessage({id, from, to, options, ...(sequence === 1 || workerPending.size === 1 && !worker.__ready ? {colliders: model.colliders} : {})}); worker.__ready = true;
    });
  }
  function ensure(seed) { if (!patrol) { prepare(); patrol = createPatrol({colliders: model.colliders, plan, seed, inspect: sensors.inspect, onChange: render}); figure.visible = true; } return patrol; }
  function render() {
    if (!patrol) return;
    const s = patrol.snapshot(), labels = {idle: '대기', planning: '길 찾는 중', walking: '걷는 중', waiting: '다음 목적지 선택', paused: '일시정지', blocked: '보완 필요'};
    $('#npc-status').textContent = labels[s.status]; panel.dataset.status = s.status;
    $('#npc-mission').textContent = `${s.departure} → ${s.destination || '목적지 선택 중'}`;
    $('#npc-stats').textContent = `${s.position.seatArea==='rear-gallery'?'외야 뒤 회랑':s.position.seatArea==='upper-gallery'?'네이비석 뒤 회랑':s.position.seatArea==='navy-front-gallery'?'네이비석 앞 통로':s.position.floor} · ${s.completed}회 도착 · ${Math.round(s.distance)}m 이동 · ${s.usedConnectors.length}개 층 연결 이용`;
    $('#npc-start').textContent = s.status === 'blocked' ? '현재 위치에서 재탐색' : ['idle', 'paused'].includes(s.status) ? '순회 계속' : '일시정지';
    $('#npc-feedback').textContent = s.reports.at(-1)?.message || '막힘·바닥·머리 공간을 확인하며 이동합니다.';
    const sensor = sensors.last;
    $('#npc-sensors').textContent = sensor ? `발밑 ${sensor.floorGap === null ? '바닥 없음' : Math.abs(sensor.floorGap) <= sensor.floorTolerance ? '연결 확인' : '높이 차이'} · 머리 공간 ${sensor.headClear ? '확보' : '확인 필요'}` : '';
    if (patrol.route !== lastRoute) { lastRoute = patrol.route; routeLine.geometry.dispose(); routeLine.geometry = new THREE.BufferGeometry().setFromPoints(lastRoute?.points.map(p => new THREE.Vector3(p[0], p[1] + .09, p[2])) || []);scene.userData.renderDirty=true; }
  }
  function setFollow(value) { following = value; document.querySelector('#viewport').classList.toggle('npc-following',value); $('#npc-eye').setAttribute('aria-pressed', String(value)); $('#npc-eye').textContent = value ? '전체에서 보기' : '대원 시점'; if (!value) release(); }
  function update(dt) {
    if (!patrol) return;
    patrol.step(dt); const w = patrol.walker, s = patrol.snapshot(); figure.position.set(w.x, w.y, w.z); figure.rotation.y = patrol.yaw;
    figure.visible = !following; routeLine.visible = !following;
    const phase = s.distance * 6;
    limbs.forEach((limb, i) => limb.rotation.x = s.status === 'walking' ? Math.sin(phase + (i < 2 ? 0 : Math.PI)) * (i % 2 ? -.3 : .38) : 0);
    if (following) follow(w, patrol.yaw, patrol.pitch);
    timer += dt; if (timer >= .25) { render(); timer = 0; }
    const pose=[w.x,w.y,w.z,patrol.yaw,patrol.pitch,s.status,following].join(',');if(pose!==lastVisualPose){scene.userData.renderDirty=true;lastVisualPose=pose;}
  }
  $('#npc-start').onclick = () => { const p = ensure(); const s = p.snapshot().status; if (s === 'blocked') {prepare();p.retry();} else if (['idle', 'paused'].includes(s)) {prepare();p.start();} else p.pause(); render(); };
  $('#npc-eye').onclick = () => { ensure(); setFollow(!following); update(0); };
  $('#npc-export').onclick = () => { if (!patrol) { notify('순회를 시작하면 기록을 저장할 수 있습니다.'); return; } download(new Blob([JSON.stringify(patrol.exportReport(), null, 2)], {type: 'application/json'}), 'jamsil-patrol-feedback.json'); };
  return {update, start(seed) { ensure(seed).start(); }, pause() { patrol?.pause(); render(); }, detach() { if (following) { following = false; document.querySelector('#viewport').classList.remove('npc-following'); $('#npc-eye').setAttribute('aria-pressed', 'false'); $('#npc-eye').textContent = '대원 시점'; } }, get following() { return following; }, get controller() { return patrol; }, snapshot: () => patrol?.snapshot() || null, report: () => patrol?.exportReport() || null};
}
