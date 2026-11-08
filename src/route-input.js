import {SEAT_BLOCK_BY_ID,resolveSeat} from './seat-data.js';

export const UNAVAILABLE_ROUTE_MESSAGE='시스템 업데이트 예정입니다. 불편을 드려 정말 죄송합니다.';
export function userSeatDestination(section,rowValue='',numberValue=''){
  const id=String(section).trim().replace(/(?:구역|블록|블럭)$/,'').trim();
  if(!id)throw Error('좌석 구역을 입력해 주세요.');
  const block=SEAT_BLOCK_BY_ID.get(id);
  if(!block)throw Error(UNAVAILABLE_ROUTE_MESSAGE);
  const blank=v=>v==null||String(v).trim()==='';
  if(blank(rowValue)&&blank(numberValue))return {...block.entry};
  if(blank(rowValue)||blank(numberValue))throw Error('열과 좌석 번호를 함께 입력해 주세요. 구역만 입력해도 길을 찾을 수 있어요.');
  if(![rowValue,numberValue].every(v=>Number.isSafeInteger(Number(v))&&Number(v)>0))throw Error('열과 좌석 번호는 1 이상의 숫자로 입력해 주세요.');
  try{return resolveSeat(id,rowValue,numberValue);}catch{throw Error(UNAVAILABLE_ROUTE_MESSAGE);}
}
