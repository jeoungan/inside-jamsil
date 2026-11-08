import {CONNECTORS} from './data.js';
import {moveWalker,projectConnector,onFloor,colliderOccupiesHeight,PLAYER_RADIUS} from './navigation.js';
import {insideRect,containsPoint,ribbonOutline} from './spatial.js';
import {connectorRoute} from './walking-route.js';
import {SEAT_BLOCK_BY_ID,blockPoint,rowV} from './seat-data.js';
import {seatLegs} from './seating-navigation.js';
import {upperGalleryLegs} from './upper-gallery.js';
import {navyFrontLegs} from './navy-front-gallery.js';
import {galleryLegs} from './outfield-gallery.js';
import {upperWingFor,upperOffset} from './upper-gallery-access.js';
import {navyFrontWing,navyFrontPath} from './navy-front-access.js';

const point=w=>[w.x,w.y,w.z];
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const length=points=>points.slice(1).reduce((sum,p,i)=>sum+distance(points[i],p),0);
const compact=points=>points.filter((p,i)=>!i||distance(p,points[i-1])>.001);
export const currentPositionOrigin=walker=>({...walker,id:'current-position',kind:'current-position',name:'현재 위치'});

// Check every approach with the real walker. Routing must never fit or reset a
// current position, including on a connector, seat row or gallery.
function canFollow(walker,points,colliders){
  let w={...walker};
  for(const p of points.slice(1)){
    const dx=p[0]-w.x,dz=p[2]-w.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));
    for(let i=0;i<n;i++)w=moveWalker(w,dx/n,dz/n,colliders);
    if(distance(point(w),p)>.12)return false;
  }
  return true;
}

function leaveSeats(w,colliders){
  const b=SEAT_BLOCK_BY_ID.get(w.seating);
  if(!b)throw Error('현재 좌석 구역의 연결 통로를 찾지 못했습니다.');
  let legs;
  if(w.seatArea==='rear-gallery')legs=galleryLegs({section:b.id,angle:Math.atan2(w.x,-(w.z+49))});
  else if(w.seatArea==='upper-gallery'){
    const nearest=upperWingFor(b.id).blocks.toSorted((a,b)=>distance(point(w),upperOffset(blockPoint(a,.94,1),2.3))-distance(point(w),upperOffset(blockPoint(b,.94,1),2.3)))[0];
    legs=upperGalleryLegs({section:b.id,gallerySection:nearest.id});
  }else if(w.seatArea==='navy-front-gallery'){
    const nearest=navyFrontWing(b.id).blocks.toSorted((a,b)=>distance(point(w),navyFrontPath(a.id,a.id).at(-1))-distance(point(w),navyFrontPath(b.id,b.id).at(-1)))[0];
    legs=navyFrontLegs({section:b.id,gallerySection:nearest.id});
  }
  else if(w.seatRow)legs=seatLegs({section:b.id,row:w.seatRow,number:'',point:point(w)});
  else legs=seatLegs({section:b.id,row:b.rows,number:'',point:blockPoint(b,.94,rowV(b,b.rows))}).slice(0,w.seatArea==='aisle'?2:1);
  const path=compact(legs.flatMap(l=>l.points)),candidates=[];
  for(let i=1;i<path.length;i++){
    const a=path[i-1],delta=path[i].map((v,k)=>v-a[k]),sq=delta.reduce((s,v)=>s+v*v,0);
    const t=Math.max(0,Math.min(1,point(w).reduce((s,v,k)=>s+(v-a[k])*delta[k],0)/(sq||1)));
    const projection=a.map((v,k)=>v+delta[k]*t);
    candidates.push({i,projection,error:distance(point(w),projection)});
  }
  for(const {i,projection}of candidates.sort((a,b)=>a.error-b.error)){
    const points=compact([point(w),projection,...path.slice(0,i).toReversed()]);
    if(canFollow(w,points,colliders))return {points,entry:b.entry,kind:'seat-return',name:b.id+'구역에서 공용 통로로',floor:w.floor,toFloor:w.floor,section:b.id};
  }
  throw Error('현재 자리에서 연결되는 좌석 통로를 찾지 못했습니다. 위치를 유지합니다.');
}

export function planFromCurrentPosition(from,to,{plan,colliders,options}){
  const origin={...from,point:point(from),offset:0};
  const exact=w=>({...w,kind:'walk-position',name:'현재 위치'});
  const combine=(prefix,base)=>{
    const legs=[{...prefix,distance:length(prefix.points)},...base.legs];
    return {...base,origin,legs,points:legs.flatMap((l,i)=>i?l.points.slice(1):l.points),distance:legs.reduce((s,l)=>s+l.distance,0),routingCost:(base.routingCost??base.distance)+length(prefix.points),transfers:legs.filter(l=>l.connector).length};
  };
  if(from.connector){
    const c=CONNECTORS.find(c=>c.id===from.connector);
    if(!c)throw Error('현재 연결로를 찾지 못했습니다.');
    const p=projectConnector(from.x,from.z,c),a=c.path[p.segment],b=c.path[p.segment+1],t=Math.max(0,Math.min(1,p.raw));
    const center=a.map((v,k)=>v+(b[k]-v)*t),full=connectorRoute(c),candidates=[];
    for(const reverse of [false,true]){
      const floor=reverse?c.from:c.to;
      const tail=reverse?full.slice(0,p.segment+2).toReversed():full.slice(p.segment+2);
      const points=compact([point(from),center,...tail]);
      if(!canFollow(from,points,colliders))continue;
      const end=points.at(-1),prefix={kind:c.type,connector:c.id,floor:from.floor,toFloor:floor,points};
      try{
        const base=plan(exact({id:'connector-exit',floor,x:end[0],y:end[1],z:end[2]}),to,{...options,requireStairs:options.requireStairs&&c.type!=='stair'});
        candidates.push(combine(prefix,base));
      }catch{/* Try the other physical end without relocating the body. */}
    }
    if(!candidates.length)throw Error('현재 연결로에서 목적지로 이어지는 공개 경로를 찾지 못했습니다.');
    return candidates.sort((a,b)=>(a.routingCost??a.distance)-(b.routingCost??b.distance))[0];
  }
  if(from.seating){
    if(!options.requireStairs&&to.kind==='individual-seat'&&to.section===from.seating&&canFollow(from,[point(from),to.point],colliders)){
      const points=[point(from),to.point],leg={kind:'seat-row',name:to.section+'구역 좌석 통로',section:to.section,floor:from.floor,toFloor:to.floor,points,distance:length(points)};
      return {origin,destination:{...to},legs:[leg],points,distance:leg.distance,transfers:0,estimated:true,seat:to,walkSection:to.section,seatPath:seatLegs(to)};
    }
    const prefix=leaveSeats(from,colliders),end=prefix.points.at(-1);
    if(!options.requireStairs&&to.kind==='individual-seat'&&to.section===from.seating){
      const incoming=compact(seatLegs(to).flatMap(l=>l.points)),candidates=[];
      for(let i=0;i<prefix.points.length;i++)for(let j=0;j<incoming.length;j++)if(distance(prefix.points[i],incoming[j])<.01)candidates.push(compact([...prefix.points.slice(0,i+1),...incoming.slice(j+1)]));
      for(const points of candidates.sort((a,b)=>length(a)-length(b)))if(canFollow(from,points,colliders)){
        const leg={...prefix,points,distance:length(points),name:to.section+'구역 좌석 계단과 열 통로'};
        return {origin,destination:{...to},legs:[leg],points,distance:leg.distance,transfers:0,estimated:true,seat:to,walkSection:to.section,seatPath:seatLegs(to)};
      }
    }
    const base=plan(exact({...prefix.entry,x:end[0],y:end[1],z:end[2]}),to,options);
    return combine(prefix,base);
  }
  const links=CONNECTORS.filter(c=>c.path[0][1]<=from.y&&c.path.at(-1)[1]>=from.y).map(c=>ribbonOutline(c,c.width+PLAYER_RADIUS*2+.2,.35));
  const clear=p=>onFloor(p[0],p[2],from.floor)&&!colliders.some(c=>c.floor===from.floor&&colliderOccupiesHeight(c,p[1])&&insideRect(p[0],p[2],c,PLAYER_RADIUS+.11))&&!links.some(poly=>containsPoint([p[0],p[2]],poly));
  if(clear(point(from)))return {...plan(exact(from),to,options),origin};
  // Manual walking can stop closer to a wall than the route planner's extra
  // clearance. Walk out of that margin; never snap the origin away from it.
  for(const radius of [.3,.6,1,1.5]){
    const candidates=Array.from({length:16},(_,i)=>[from.x+Math.cos(i*Math.PI/8)*radius,from.y,from.z+Math.sin(i*Math.PI/8)*radius]).filter(clear);
    for(const end of candidates){
      const points=[point(from),end];if(!canFollow(from,points,colliders))continue;
      try{return combine({kind:'floor',floor:from.floor,toFloor:from.floor,points},plan(exact({...from,x:end[0],z:end[2]}),to,options));}catch{/* Another safe departure may connect. */}
    }
  }
  throw Error('현재 위치에서 공용 통로로 이어지는 경로를 찾지 못했습니다. 위치를 유지합니다.');
}
