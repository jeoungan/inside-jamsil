import {CONNECTORS,FLOORS} from './data.js';
import {createWalker,moveWalker,onFloor,projectConnector,PLAYER_RADIUS,colliderOccupiesHeight} from './navigation.js';
import {insideRect,segmentIntersectsRect,containsPoint,ribbonOutline,segmentIntersectsPolygon} from './spatial.js';

export function connectorRoute(c,reverse=false){
  const path=reverse?c.path.toReversed():c.path;
  const extend=(p,q,d)=>{const len=Math.hypot(p[0]-q[0],p[2]-q[2]);return [p[0]+(p[0]-q[0])*d/len,p[1],p[2]+(p[2]-q[2])*d/len];};
  return [extend(path[0],path[1],1.5),...path,extend(path.at(-1),path.at(-2),1.8)];
}

// A route is computed against the same floor voids and colliders as the walker.
// It is only for the research model, never a real-world route recommendation.
export function findFloorRoute(start,end,floor,colliders){
  const y=FLOORS.find(f=>f.id===floor).y,obstacles=colliders.filter(c=>c.floor===floor&&colliderOccupiesHeight(c,y));
  const links=CONNECTORS.filter(c=>c.path[0][1]<=y&&c.path.at(-1)[1]>=y);
  const forbiddenLinks=links.map(c=>ribbonOutline(c,c.width+PLAYER_RADIUS*2+.2,.35));
  const cell=.8,extent=800,offset=400,cache=new Map(),key=(x,z)=>x*extent+z;
  const world=(x,z)=>[start[0]+(x-offset)*cell,y,start[2]+(z-offset)*cell];
  const clear=(x,z)=>{
    if(!onFloor(x,z,floor)||obstacles.some(c=>insideRect(x,z,c,PLAYER_RADIUS+.1)))return false;
    return !forbiddenLinks.some(poly=>containsPoint([x,z],poly));
  };
  const valid=(x,z)=>{if(x<0||z<0||x>=extent||z>=extent)return false;const k=key(x,z);if(!cache.has(k)){const p=world(x,z);cache.set(k,clear(p[0],p[2]));}return cache.get(k);};
  const sweptClear=(a,b)=>!obstacles.some(c=>segmentIntersectsRect([a[0],a[2]],[b[0],b[2]],c,PLAYER_RADIUS+.07))&&!forbiddenLinks.some(poly=>segmentIntersectsPolygon([a[0],a[2]],[b[0],b[2]],poly));
  const canConnect=(a,b)=>{if(!sweptClear(a,b))return false;let w=createWalker(floor,a[0],a[2]),dx=b[0]-a[0],dz=b[2]-a[2],n=Math.ceil(Math.hypot(dx,dz)/.1);for(let i=0;i<n;i++){w=moveWalker(w,dx/n,dz/n,colliders);if(w.connector||w.floor!==floor||Math.hypot(w.x-a[0]-dx*(i+1)/n,w.z-a[2]-dz*(i+1)/n)>.01)return false;}return Math.hypot(w.x-b[0],w.z-b[2])<.01;};
  if(canConnect(start,end)&&canConnect(end,start))return [start,end];
  // A binary heap keeps long cross-stadium searches responsive. Scanning the
  // entire frontier at every step was quadratic in crowded concourses.
  const open=[],push=node=>{open.push(node);let i=open.length-1;while(i>0){const parent=(i-1)>>1;if(open[parent].f<=node.f)break;open[i]=open[parent];i=parent;}open[i]=node;},pop=()=>{const best=open[0],last=open.pop();if(open.length){let i=0;while(i*2+1<open.length){let child=i*2+1;if(child+1<open.length&&open[child+1].f<open[child].f)child++;if(open[child].f>=last.f)break;open[i]=open[child];i=child;}open[i]=last;}return best;};
  push({x:offset,z:offset,g:0,f:0});const cost=new Map([[key(offset,offset),0]]),parents=new Map();let goal=null;
  const heuristic=(x,z)=>{const p=world(x,z);return Math.hypot(p[0]-end[0],p[2]-end[2])/cell;};
  for(let iterations=0;open.length&&iterations<100000;iterations++){
    const current=pop(),k=key(current.x,current.z);
    if(current.g!==cost.get(k))continue;
    const p=world(current.x,current.z);
    if(heuristic(current.x,current.z)<2&&canConnect(p,end)){goal=k;break;}
    for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const x=current.x+dx,z=current.z+dz,nk=key(x,z),g=current.g+Math.hypot(dx,dz);
      if(!valid(x,z)||(dx&&dz&&(!valid(current.x+dx,current.z)||!valid(current.x,current.z+dz)))||g>=(cost.get(nk)??Infinity))continue;
      if(!sweptClear(p,world(x,z)))continue;
      cost.set(nk,g);parents.set(nk,k);push({x,z,g,f:g+heuristic(x,z)});
    }
  }
  if(goal===null)throw Error(floor+' 회랑에서 연결 경로를 찾지 못했습니다.');
  const raw=[end];for(let k=goal;k!==undefined;k=parents.get(k))raw.push(world(Math.floor(k/extent),k%extent));raw.reverse();
  const path=[start];let i=0;
  while(i<raw.length-1){let next=i+1;for(let j=Math.min(raw.length-1,i+35);j>i+1;j--)if(canConnect(path.at(-1),raw[j])&&canConnect(raw[j],path.at(-1))){next=j;break;}path.push(raw[next]);i=next;}
  if(path.some((p,i)=>i&&(!canConnect(path[i-1],p)||!canConnect(p,path[i-1]))))throw Error(floor+' 통로의 좁은 틈을 통과할 수 없습니다.');
  return path;
}

export const FULL_TOUR_LINKS=['ramp-1b','mezz-west-lower','mezz-west-upper','upper-aisle-3'];
export function createFullTour(colliders){
  const route=[];let floor='1F';
  for(const id of FULL_TOUR_LINKS){const c=CONNECTORS.find(c=>c.id===id),leg=connectorRoute(c);
    if(route.length)route.push(...findFloorRoute(route.at(-1),leg[0],floor,colliders).slice(1));
    route.push(...(route.length?leg.slice(1):leg));floor=c.to;
  }
  return route;
}
