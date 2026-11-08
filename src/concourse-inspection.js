import {OUTER,INNER} from './data.js';
import {entryHallGeometry} from './entry-hall.js';
const hall=entryHallGeometry(OUTER,INNER),point=hall.at(4.45,.54),look=hall.at(4.45,.3);
// A model inspection point on the retained passage, not a new real facility.
export const CONCOURSE_INSPECTION_TARGETS=[{
  id:'inspect-gate-21-upper-hall',name:'입구 홀 위 중간층 통로 · 모델 탐색점',kind:'structure-inspection',floor:'2.5F',
  x:point[0],z:point[1],arrivalYaw:Math.atan2(point[0]-look[0],point[1]-look[1]),arrivalPitch:-.4,
  evidence:'inferred',source:'gate-21-high-hall',note:'기존 계단을 거쳐 접근하는 모델 구조 검사 지점. 실제 시설명·출입 가능 여부를 확정하는 지점이 아님.'
}];
