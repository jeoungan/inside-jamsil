import {FLOORS, CONNECTORS} from './data.js';
import {ORIGINS, DESTINATIONS, resolveAnchor, routeProgress} from './route-planner.js';
import {SEAT_BLOCKS, SEAT_BLOCK_BY_ID, resolveSeat} from './seat-data.js';
import {createWalker, moveWalker, onFloor} from './navigation.js';
import {UPPER_GALLERY_TARGETS} from './upper-gallery.js';
import {OUTFIELD_GALLERY_TARGETS} from './outfield-gallery.js';

import {NAVY_FRONT_TARGETS} from './navy-front-gallery.js';
import {CONCOURSE_INSPECTION_TARGETS} from './concourse-inspection.js';

export const OBSERVED_PATROL_SEATS = SEAT_BLOCKS.flatMap(b => b.catalogue.flatMap((row, i) => row.filter(s => s.evidence === 'observed').map(s => resolveSeat(b.id, i + 1, s.number))));
export const PATROL_TARGETS = [...DESTINATIONS, ...SEAT_BLOCKS.map(b => b.entry), ...ORIGINS, ...OBSERVED_PATROL_SEATS, ...OUTFIELD_GALLERY_TARGETS, ...UPPER_GALLERY_TARGETS, ...NAVY_FRONT_TARGETS,...CONCOURSE_INSPECTION_TARGETS];
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let n = state; n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}

// One persistent body. Only construction places it; every later translation uses
// the same collision/connector engine as manual walking, including recovery.
export function createPatrol({colliders, plan, seed = Date.now() >>> 0, targets = PATROL_TARGETS, origin, inspect = () => [], onChange = () => {}}) {
  const random = seededRandom(seed), pick = list => list[Math.floor(random() * list.length)];
  const start = resolveAnchor(origin || pick(ORIGINS), colliders);
  let walker = createWalker(start.floor, start.point[0], start.point[2]);
  let status = 'idle', route = null, index = 1, generation = 0, pending = null, pausedFrom = null, blockedRoute = false;
  let elapsed = 0, distance = 0, stalled = 0, dwell = 0, sensorTime = 0, yaw = 0, pitch = -.08, attempts = 0;
  let departure = start.name, destination = null, tripDistance = 0, tripStart = 0, totalCompleted = 0;
  const reports = [], trips = [], visitedFloors = new Set([walker.floor]), usedConnectors = new Set(), recent = [];
  const position = () => ({x: walker.x, y: walker.y, z: walker.z, floor: walker.floor, connector: walker.connector, seating:walker.seating||null, seatArea:walker.seatArea||null,seatRow:walker.seatRow||null});
  function report(code, message, severity = 'warning', extra = {}) {
    const last = reports.findLast(r => r.code === code && r.floor === walker.floor && Math.hypot(r.x - walker.x, r.z - walker.z) < 2);
    if (last) { last.count++; return; }
    reports.push({code, message, severity, ...position(), seed, trip: totalCompleted + 1, waypoint: index, elapsed, count: 1, ...extra});
    if (reports.length > 200) reports.shift();
    onChange();
  }
  function fail(code, message, extra) { blockedRoute = status === 'walking'; report(code, message, 'error', extra); status = 'blocked'; generation++; onChange(); }
  function chooseTarget() {
    // Avoid 1F ↔ 2F-only ramp trips: each mission must also include stairs.
    const eligible = targets.filter(t => t.floor !== walker.floor && !recent.includes(t.id) && !(['1F', '2F'].includes(walker.floor) && ['1F', '2F'].includes(t.floor)));
    const floors = [...new Set(eligible.map(t => t.floor))];
    const floor = floors.length ? pick(floors) : null;
    if(!floor)return null;
    const onLevel=eligible.filter(t=>t.floor===floor),kinds=[...new Set(onLevel.map(t=>t.kind))],kind=pick(kinds);
    return pick(onLevel.filter(t=>t.kind===kind));
  }
  function requestRoute() {
    if (pending || status === 'paused' || status === 'blocked') return;
    if(trips.length)departure=trips.at(-1).to;
    destination = chooseTarget();
    if (!destination) { fail('no-target', '다른 층의 공개 목적지를 선택하지 못했습니다.'); return; }
    recent.push(destination.id); if (recent.length > 12) recent.shift();
    status = 'planning'; blockedRoute = false; const token = ++generation;
    const from = {id: 'npc-current', name: departure, kind: 'patrol-position', floor: walker.floor, x: walker.x, z: walker.z};
    onChange();
    const exitPath=walker.seating?route?.seatPath:null,exitSection=walker.seating;
    pending = Promise.resolve().then(async () => {
      if(!exitPath)return plan(from,destination,{requireStairs:true});
      const block=SEAT_BLOCK_BY_ID.get(exitSection),continuation=await plan(block.entry,destination,{requireStairs:true});
      // Leave the old seat using its complete, reversed row/aisle/access path.
      // A new floor route begins only after the existing body reaches the portal.
      const exit=exitPath.toReversed().map(l=>({...l,kind:'seat-return',points:l.points.toReversed()})),legs=[...exit,...continuation.legs];
      return {...continuation,origin:{...from,point:[walker.x,walker.y,walker.z]},legs,points:legs.flatMap((l,i)=>i?l.points.slice(1):l.points),distance:legs.reduce((sum,l)=>sum+l.distance,0)};
    }).then(result => {
      if (token !== generation) return;
      if (!result.legs.some(l => l.kind === 'stair')) throw Error('계단을 포함한 경로가 필요합니다.');
      if (Math.hypot(result.points[0][0] - walker.x, result.points[0][1] - walker.y, result.points[0][2] - walker.z) > .06) throw Error('현재 위치와 출발점이 연결되지 않습니다.');
      route = result; index = 1; stalled = 0; tripDistance = 0; tripStart = elapsed; attempts = 0;
      walker={...walker,seatTarget:result.walkSection};
      status = 'walking'; onChange();
    }).catch(error => {
      if (token !== generation) return;
      report('route-unavailable', error.message, 'warning', {destination: destination.id});
      status = ++attempts >= 8 ? 'blocked' : 'waiting'; dwell = .5; onChange();
    }).finally(() => { pending = null; });
  }
  function step(dt) {
    if (!Number.isFinite(dt) || dt <= 0 || status === 'paused' || status === 'idle' || status === 'blocked') return;
    // Callers can fast-forward time, never enlarge the physical integration step.
    for (let remaining = dt; remaining > 1e-9; remaining -= 1 / 30) tick(Math.min(remaining, 1 / 30));
  }
  function tick(dt) {
    elapsed += dt;
    if (status === 'waiting') { dwell -= dt; if (dwell <= 0) requestRoute(); return; }
    if (status !== 'walking') return;
    const target = route.points[index];
    if (!target) {
      if (!routeProgress(route, walker).arrived) { fail('arrival-mismatch', '경로 끝에서 목적지 층·높이·거리가 일치하지 않습니다.'); return; }
      trips.push({from: departure, to: destination.name, destination: destination.id, fromFloor: route.origin.floor, toFloor: walker.floor, transfers: route.transfers, connectors: route.legs.filter(l => l.connector).map(l => l.connector), distance: tripDistance, duration: elapsed - tripStart, end: position()});
      totalCompleted++;
      if (trips.length > 100) trips.shift();
      if(Number.isFinite(route.destination.arrivalYaw))yaw=route.destination.arrivalYaw;
      else if(destination.kind==='amenity'||destination.kind==='restroom')yaw=Math.atan2(walker.x-destination.x,walker.z-destination.z);
      pitch=Number.isFinite(destination.arrivalPitch)?Math.max(-1.1,Math.min(1.1,destination.arrivalPitch)):-.08;
      status = 'waiting'; dwell = 2; onChange(); return;
    }
    const dx = target[0] - walker.x, dz = target[2] - walker.z, length = Math.hypot(dx, dz);
    if (length < .025) {
      if (Math.abs(target[1] - walker.y) > .38) { fail('waypoint-height', '통로 정점의 높이와 발밑 높이가 맞지 않습니다.'); return; }
      index++; stalled = 0; return;
    }
    const stride = Math.min(length, 1.45 * dt), before = walker;
    const next = moveWalker(before, dx / length * stride, dz / length * stride, colliders);
    const moved = Math.hypot(next.x - before.x, next.z - before.z);
    const connector = CONNECTORS.find(c => c.id === (before.connector || next.connector));
    if (moved > stride + .001 || Math.abs(next.y - before.y) > .35 || (next.floor !== before.floor && (!connector || ![connector.from, connector.to].includes(next.floor)))) {
      fail('illegal-motion', '연속 보행 규칙을 벗어난 이동을 차단했습니다.', {attempted: next}); return;
    }
    if (!next.connector && !next.seating && (!onFloor(next.x, next.z, next.floor) || Math.abs(next.y - FLOORS.find(f => f.id === next.floor).y) > .05)) {
      fail('invalid-surface', '공개 바닥 밖으로 나가는 이동을 차단했습니다.', {attempted: next}); return;
    }
    walker = next; yaw = Math.atan2(-dx, -dz); pitch = -.08; distance += moved; tripDistance += moved;
    visitedFloors.add(next.floor); if (next.connector) usedConnectors.add(next.connector);
    stalled = moved < stride * .05 ? stalled + dt : 0;
    if (stalled > 2) { fail('blocked-walk', '실제 충돌체에 막혔습니다. 이 위치의 벽·문·계단 연결을 보완해야 합니다.', {target}); return; }
    sensorTime += dt;
    if (sensorTime >= .75) {
      sensorTime = 0;
      for (const item of inspect(walker, yaw)) {
        if (['floor-mesh-gap', 'low-headroom'].includes(item.code)) { fail(item.code, item.message, item.details || {}); break; }
        report(item.code, item.message, item.severity || 'warning', item.details || {});
      }
    }
  }
  return {
    start() { if (status === 'idle') requestRoute(); else if (status === 'paused') { status = pausedFrom; pausedFrom = null; if (status === 'planning') { status = 'waiting'; dwell = 0; } onChange(); } },
    pause() { if (['idle', 'paused', 'blocked'].includes(status)) return; pausedFrom = status; status = 'paused'; generation++; onChange(); },
    retry() { if (status === 'blocked') { status = blockedRoute && route ? 'walking' : 'waiting'; dwell = 0; stalled = 0; sensorTime = .75; attempts = 0; onChange(); } },
    step, report,
    get walker() { return {...walker}; }, get route() { return route; }, get yaw() { return yaw; }, get pitch() { return pitch; }, get pending() { return pending; },
    snapshot() { return {seed, status, position: position(), yaw, pitch, departure, destination: destination?.name || null, destinationId: destination?.id || null, waypoint: index, elapsed: +elapsed.toFixed(1), distance: +distance.toFixed(1), completed: totalCompleted, visitedFloors: [...visitedFloors], usedConnectors: [...usedConnectors], remaining: route ? +routeProgress(route, walker).remaining.toFixed(1) : null, reports: reports.slice(-8)}; },
    exportReport() { return {schema: 'inside-patrol-1', ...this.snapshot(), trips: [...trips], reports: [...reports], route, note: '모델 보행과 메시 센서의 진단 기록입니다. 실제 건축 정확도 판정이나 영상 인식 결과가 아닙니다.'}; },
  };
}
