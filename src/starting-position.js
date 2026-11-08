import {FEATURES} from './data.js';
import {resolveAnchor} from './route-planner.js';
import {createWalker} from './navigation.js';

// Explicit user-selected starts use the same public-floor anchor as routing.
// Camera/floor changes and subsequent route requests never relocate the body.
export const START_LOCATIONS=FEATURES.filter(f=>f.type==='gate'||f.type==='door');
export function startingPosition(id,colliders){
  const feature=START_LOCATIONS.find(f=>f.id===id);
  if(!feature)throw Error('출발할 게이트나 출입구를 선택해 주세요.');
  const anchor=resolveAnchor({...feature,kind:'entrance'},colliders);
  const [x,,z]=anchor.point;
  return {feature,walker:createWalker(anchor.floor,x,z),yaw:Math.atan2(x,z+49)};
}
