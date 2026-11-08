import {CONNECTORS,FLOORS,FLOOR_POLYGONS,EXTERIOR_RADIUS} from './data.js';
import {containsPoint,insideRect,ribbonOutline,ribbonHeight,segmentIntersectsRect} from './spatial.js';
import {publicSurface} from './access-geometry.js';
import {trySeatMove,seatExitAllowed} from './seating-navigation.js';
export const EYE_HEIGHT=1.68,PLAYER_RADIUS=.32;
export function projectConnector(x,z,c){
  let best={distance:Infinity},along=0;
  for(let i=1;i<c.path.length;i++){
    const a=c.path[i-1],b=c.path[i],dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz),raw=((x-a[0])*dx+(z-a[2])*dz)/(length*length),t=Math.max(0,Math.min(1,raw)),distance=Math.hypot(x-a[0]-t*dx,z-a[2]-t*dz);
    if(distance<best.distance)best={distance,y:a[1]+t*(b[1]-a[1]),along:along+t*length,raw,segment:i-1,length,dx:dx/length,dz:dz/length};along+=length;
  }return best;
}
const corridorCache=new WeakMap();
export function corridorOutline(c,width=c.width+.4,extend=.35){let cache=corridorCache.get(c);if(!cache){cache=new Map();corridorCache.set(c,cache);}const key=width+':'+extend;if(!cache.has(key))cache.set(key,ribbonOutline(c,width,extend));return cache.get(key);}
export const onFloor=(x,z,floor)=>publicSurface(x,z,floor);
export function colliderOccupiesHeight(c,y){
 const floor=FLOORS.find(f=>f.id===c.floor);if(!floor)return !c.floor;
 const h=c.height??(c.type==='balustrade'?1:c.type==='column'?floor.height-.34:c.type==='partition'?1.8:Math.min(3.05,floor.height-.5));
 return y+EYE_HEIGHT>(c.baseY??floor.y)+.1&&y<floor.y+h-.05;
}
function blocked(x,z,floor,colliders){const y=FLOORS.find(f=>f.id===floor).y;return colliders.some(c=>(!c.floor||c.floor===floor)&&colliderOccupiesHeight(c,y)&&insideRect(x,z,c,PLAYER_RADIUS));}
export function blockedAtHeight(x,y,z,colliders,seating=null){return colliders.some(c=>{
  if(seating&&(c.seatPassage===seating||c.seatPassages?.includes(seating)))return false;
  return colliderOccupiesHeight(c,y)&&insideRect(x,z,c,PLAYER_RADIUS);
});}
function attempt(w,x,z,colliders){
  if(w.seating){
    const seated=trySeatMove(w,x,z);if(seated&&!blockedAtHeight(x,seated.y,z,colliders,seated.seating))return seated;
    if(seatExitAllowed(w,x,z)&&onFloor(x,z,w.floor)&&!blocked(x,z,w.floor,colliders))return {...w,x,z,seating:null,seatArea:null,seatRow:null};
    return null;
  }
  if(!w.connector&&w.seatTarget){const seated=trySeatMove(w,x,z);if(seated&&!blockedAtHeight(x,seated.y,z,colliders,seated.seating))return seated;}
  if(!w.connector&&colliders.some(c=>c.floor===w.floor&&colliderOccupiesHeight(c,w.y)&&!insideRect(w.x,w.z,c,PLAYER_RADIUS)&&segmentIntersectsRect([w.x,w.z],[x,z],c,PLAYER_RADIUS)))return null;
  if(w.connector){
    const c=CONNECTORS.find(c=>c.id===w.connector),p=projectConnector(x,z,c);
    p.y=ribbonHeight(x,z,c)??p.y;
    if(!containsPoint([x,z],corridorOutline(c,c.width-PLAYER_RADIUS*2,2.8))||Math.abs(p.y-w.y)>.35||blockedAtHeight(x,p.y,z,colliders))return null;
    const leavingStart=p.segment===0&&p.raw<0,leavingEnd=p.segment===c.path.length-2&&p.raw>1;
    if(leavingStart||leavingEnd){const floor=leavingStart?c.from:c.to;if(!onFloor(x,z,floor)||blocked(x,z,floor,colliders))return null;return {...w,x,z,y:leavingStart?c.path[0][1]:c.path.at(-1)[1],floor,connector:null};}
    return {...w,x,z,y:p.y};
  }
  for(const c of CONNECTORS){
    const between=w.y>c.path[0][1]&&w.y<c.path.at(-1)[1];if(c.from!==w.floor&&c.to!==w.floor&&!between)continue;const p=projectConnector(x,z,c),start=c.from===w.floor;
    // Entry is only possible through the matching endpoint, never the side.
    const withinEnds=!(p.segment===0&&p.raw<0)&&!(p.segment===c.path.length-2&&p.raw>1);
    const previous=projectConnector(w.x,w.z,c),throughEnd=start?previous.segment===0&&previous.raw<=.00001:previous.segment===c.path.length-2&&previous.raw>=.99999;
    if(!between&&throughEnd&&withinEnds&&p.distance<c.width/2-PLAYER_RADIUS&&Math.abs(p.y-w.y)<.22&&(start?p.along<1.5:p.along>c.length-1.5))return {...w,x,z,y:p.y,connector:c.id};
    if(p.distance<c.width/2+PLAYER_RADIUS&&withinEnds)return null;
  }
  if(!onFloor(x,z,w.floor)||blocked(x,z,w.floor,colliders))return null;
  return {...w,x,z};
}
export function moveWalker(w,dx,dz,colliders=[]){
  // Substeps prevent fast movement from tunnelling through columns or railings.
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));let result={...w};
  for(let i=0;i<count;i++){const x=result.x+dx/count,z=result.z+dz/count;result=attempt(result,x,z,colliders)||attempt(result,x,result.z,colliders)||attempt(result,result.x,z,colliders)||result;}
  return result;
}
export function createWalker(floor='2F',x=0,z=0){return {x,z,y:FLOORS.find(f=>f.id===floor).y,floor,connector:null};}
