import {FEATURES,FLOORS,CONNECTORS} from './data.js';
import {createWalker,moveWalker,onFloor,projectConnector,colliderOccupiesHeight} from './navigation.js';
import {insideRect,ribbonOutline,containsPoint} from './spatial.js';
import {connectorRoute,findFloorRoute} from './walking-route.js';
import {SEAT_BLOCK_BY_ID} from './seat-data.js';
import {seatLegs,seatBridge} from './seating-navigation.js';
import {upperGalleryLegs} from './upper-gallery.js';
import {navyFrontLegs} from './navy-front-gallery.js';
import {galleryLegs} from './outfield-gallery.js';
import {planFromCurrentPosition} from './current-position-route.js';

export const ORIGINS=FEATURES.filter(f=>f.type==='gate').map(f=>({...f,kind:'entrance'}));
export const DESTINATIONS=[
  ...FEATURES.filter(f=>f.amenity).map(f=>({...f,kind:'amenity',name:f.name+' 앞'})),
  ...FEATURES.filter(f=>f.type==='restroom').map(f=>({...f,kind:'restroom',name:f.name+' 입구'})),
  ...FEATURES.filter(f=>f.id.startsWith('section-')||f.id==='door-37').map(f=>({...f,kind:'seat'})),
  ...CONNECTORS.filter(c=>c.id.startsWith('upper-aisle')).map((c,i)=>{const p=connectorRoute(c).at(-1);return {id:'seat-upper-'+(i+1),name:(i<2?'3루':'1루')+' 상부 좌석 진입부 '+(i%2+1),floor:'4F',x:p[0],z:p[2],kind:'seat',source:c.source,evidence:'inferred',note:'상부 좌석 통로를 가정한 진입부입니다. 개별 열·좌석 번호 안내는 지원하지 않습니다.'};}),
];
const height=id=>FLOORS.find(f=>f.id===id).y;
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const length=points=>points.slice(1).reduce((sum,p,i)=>sum+distance(points[i],p),0);

export function resolveAnchor(feature,colliders){
  if(feature.kind==='walk-position'){
    if(![feature.x,feature.y,feature.z].every(Number.isFinite)||!onFloor(feature.x,feature.z,feature.floor))throw Error('현재 위치에서 공개 보행면을 찾지 못했습니다.');
    return {id:feature.id,name:feature.name,floor:feature.floor,point:[feature.x,feature.y,feature.z],offset:0};
  }
  const yaw=feature.doorYaw??Math.atan2(feature.x,feature.z+49),d=feature.arrivalOffset??(['restroom','amenity'].includes(feature.kind)?(feature.depth||(feature.kind==='restroom'?4.6:3.4))/2+1.1:0);
  const desired=[feature.x+Math.sin(yaw)*d,height(feature.floor),feature.z+Math.cos(yaw)*d];
  const anchor=(point,offset)=>({id:feature.id,name:feature.name,floor:feature.floor,point,offset,...(Number.isFinite(feature.arrivalYaw)?{arrivalYaw:feature.arrivalYaw}:feature.arrivalOffset>0?{arrivalYaw:Math.atan2(point[0]-feature.x,point[2]-feature.z)}:{})});
  const entries=CONNECTORS.filter(c=>c.from===feature.floor||c.to===feature.floor).map(c=>ribbonOutline(c,c.width+.84,.35));
  const clear=p=>onFloor(p[0],p[2],feature.floor)&&!colliders.some(c=>c.floor===feature.floor&&colliderOccupiesHeight(c,p[1])&&insideRect(p[0],p[2],c,.4))&&!entries.some(poly=>containsPoint([p[0],p[2]],poly));
  if(clear(desired))return anchor(desired,0);
  // Small fitting tolerance only; never silently move a destination across a wall.
  for(const r of [.4,.8,1.2,1.6,2])for(let i=0;i<16;i++){
    const angle=i*Math.PI/8,p=[desired[0]+Math.cos(angle)*r,desired[1],desired[2]+Math.sin(angle)*r];if(!clear(p))continue;
    if(feature.kind==='entrance')return anchor(p,r);
    let w=createWalker(feature.floor,p[0],p[2]);const dx=desired[0]-p[0],dz=desired[2]-p[2];
    for(let j=0;j<20;j++)w=moveWalker(w,dx/20,dz/20,colliders);
    if(Math.hypot(w.x-desired[0],w.z-desired[2])<.6)return anchor(p,r);
  }
  throw Error(feature.name+' 주변에서 공개 통로를 찾지 못했습니다.');
}

export function createRoutePlanner(colliders){
  const portals=CONNECTORS.flatMap(c=>{const path=connectorRoute(c);return [{id:c.id+':from',floor:c.from,point:path[0],connector:c.id},{id:c.id+':to',floor:c.to,point:path.at(-1),connector:c.id}];});
  const cache=new Map();
  function plan(from,to,options={}){
    if(from.kind==='current-position')return planFromCurrentPosition(from,to,{plan,colliders,options});
    if(to.kind==='public-gallery'){
      const b=SEAT_BLOCK_BY_ID.get(to.section),base=plan(from,{...b.entry,kind:'section-portal'},options),extra=to.gallery==='upper'?upperGalleryLegs(to):to.gallery==='navy-front'?navyFrontLegs(to):galleryLegs(to),legs=[...base.legs,...extra];
      return {...base,destination:{...to,point:extra.at(-1).points.at(-1)},legs,points:legs.flatMap((l,i)=>i?l.points.slice(1):l.points),distance:legs.reduce((s,l)=>s+l.distance,0),walkSection:b.id,seatPath:extra};
    }
    if(to.kind==='section'){
      const b=SEAT_BLOCK_BY_ID.get(to.id.replace('block-',''));
      if(b?.tier===4){
        const base=plan(from,{...b.entry,kind:'section-portal'},options),points=seatBridge(b);
        const extra=[{kind:'seat-access',name:b.id+'구역 공용 계단과 앞쪽 통로',section:b.id,floor:b.floor,toFloor:b.floor,points,distance:length(points)}],legs=[...base.legs,...extra];
        return {...base,destination:{...to,section:b.id,point:points.at(-1)},legs,points:legs.flatMap((l,i)=>i?l.points.slice(1):l.points),distance:legs.reduce((s,l)=>s+l.distance,0),walkSection:b.id,seatPath:extra};
      }
    }
    if(to.kind==='individual-seat'){
      const b=SEAT_BLOCK_BY_ID.get(to.section);if(!b)throw Error('좌석 구역을 찾지 못했습니다.');
      const base=plan(from,{...b.entry,kind:'section-portal'},options),extra=seatLegs(to);
      if(base.destination.offset>.05)throw Error('이 구역 진입부를 연결하려면 모델 보정이 필요합니다. 다른 구역을 선택해 주세요.');
      const legs=[...base.legs,...extra],distance=legs.reduce((s,l)=>s+l.distance,0);
      return {...base,destination:{...to,point:to.point},legs,points:legs.flatMap((l,i)=>i?l.points.slice(1):l.points),distance,seat:to,walkSection:b.id,seatPath:extra};
    }
    const origin=resolveAnchor(from,colliders),destination=resolveAnchor(to,colliders);
    if(to.guidanceNotice)destination.guidanceNotice=to.guidanceNotice;
    const nodes=[{...origin,id:'origin'},{...destination,id:'destination'},...portals],edges=[];
    const key=(a,b)=>[a.floor,...a.point.map(n=>n.toFixed(3))].join(',')+'|'+[b.floor,...b.point.map(n=>n.toFixed(3))].join(',');
    const add=(a,b,path,kind,connector)=>{const edge={a,b,path,kind,connector,weight:path?length(path):distance(nodes[a].point,nodes[b].point)};edges.push(edge);};
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      const a=nodes[i],b=nodes[j];
      if(a.floor===b.floor){const cached=cache.get(key(a,b));add(i,j,cached?.path,'floor');if(cached)edges.at(-1).weight=cached.weight;}
      else if(a.connector&&a.connector===b.connector){const c=CONNECTORS.find(c=>c.id===a.connector);add(i,j,connectorRoute(c,a.floor===c.to),c.type,c.id);}
    }
    // Optimistic edges are refined only when they belong to the best candidate.
    // All returned floor legs have been checked against the actual walker.
    // A patrol mission searches for a stair-using path rather than rejecting a
    // destination merely because its unconstrained shortest path is ramp-only.
    const requireStairs=options.requireStairs===true,count=nodes.length,states=count*(requireStairs?2:1),goal=1+(requireStairs?count:0);
    for(let iteration=0;iteration<350;iteration++){
      const costs=new Array(states).fill(Infinity),prev=new Map(),done=new Set();costs[0]=0;
      for(let n=0;n<states;n++){
        let at=-1;for(let i=0;i<states;i++)if(!done.has(i)&&(at<0||costs[i]<costs[at]))at=i;
        if(at<0||!Number.isFinite(costs[at])||at===goal)break;done.add(at);
        const node=at%count,used=at>=count;
        for(const e of edges){if(e.a!==node&&e.b!==node)continue;const nextNode=e.a===node?e.b:e.a,next=nextNode+(requireStairs&&(used||e.kind==='stair')?count:0),cost=costs[at]+e.weight;if(cost<costs[next]){costs[next]=cost;prev.set(next,{at,e});}}
      }
      if(!prev.has(goal))throw Error('두 지점을 연결하는 공개 보행 경로가 없습니다.');
      const chain=[];for(let at=goal;at!==0;){const p=prev.get(at);chain.unshift({edge:p.e,from:p.at%count,to:at%count});at=p.at;}
      const pending=chain.find(p=>!p.edge.path);
      if(pending){const e=pending.edge,a=nodes[e.a],b=nodes[e.b];
        try{e.path=findFloorRoute(a.point,b.point,a.floor,colliders);e.weight=length(e.path);}catch{e.weight=Infinity;}
        cache.set(key(a,b),{path:e.path,weight:e.weight});continue;
      }
      const legs=[];
      for(const {edge,from,to}of chain){const leg={kind:edge.kind,connector:edge.connector,floor:nodes[from].floor,toFloor:nodes[to].floor,points:from===edge.a?edge.path:edge.path.toReversed(),distance:edge.weight},prev=legs.at(-1);
        if(prev?.kind==='floor'&&leg.kind==='floor'&&prev.floor===leg.floor){prev.points.push(...leg.points.slice(1));prev.distance+=leg.distance;}else legs.push({...leg,points:[...leg.points]});
      }
      return {origin,destination,legs,points:legs.flatMap((l,i)=>i?l.points.slice(1):l.points),distance:legs.reduce((s,l)=>s+l.distance,0),transfers:legs.filter(l=>l.connector).length,estimated:true};
    }
    throw Error('경로 계산 범위를 초과했습니다. 더 가까운 출입구를 선택해 주세요.');
  }
  return {plan};
}

export function routeProgress(route,walker){
  let best={distance:Infinity},travelled=0;
  for(const [legIndex,leg]of route.legs.entries())for(let i=1;i<leg.points.length;i++){
    const a=leg.points[i-1],b=leg.points[i],d=b.map((v,k)=>v-a[k]),len=distance(a,b),p=[walker.x,walker.y,walker.z],t=Math.max(0,Math.min(1,p.reduce((sum,v,k)=>sum+(v-a[k])*d[k],0)/(len*len||1))),error=distance(p,a.map((v,k)=>v+d[k]*t));
    if(error<best.distance)best={distance:error,travelled:travelled+len*t,legIndex};travelled+=len;
  }
  const remaining=Math.max(0,route.distance-best.travelled),end=route.destination.point;
  const seat=route.destination.kind==='individual-seat',tolerance=seat?.35:1.3;
  return {...best,remaining,offRoute:best.distance>(seat&&walker.seating?1.4:3),arrived:walker.floor===route.destination.floor&&(!route.walkSection||walker.seating===route.walkSection)&&(!seat||walker.seating===route.destination.section&&walker.seatRow===route.destination.row)&&distance([walker.x,walker.y,walker.z],end)<tolerance&&remaining<(seat?.6:3)};
}
