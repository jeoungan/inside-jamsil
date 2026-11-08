import polygonClipping from 'polygon-clipping';
import {FEATURES,FLOORS,CONNECTORS,FLOOR_POLYGONS,FLOOR_VOIDS,EXTERIOR_RADIUS} from './data.js';
import {containsPoint,rectCorners,ribbonOutline,insideRect} from './spatial.js';

export const RESTRICTED_ZONES=FEATURES.filter(f=>f.type==='shop'||f.type==='elevator'||['발권','안내'].includes(f.amenity?.category)).map(f=>({id:'restricted-'+f.id,featureId:f.id,floor:f.floor,x:f.x,z:f.z,width:f.type==='elevator'?3:(f.width||4.2),depth:f.type==='elevator'?3:(f.depth||3.4),yaw:f.doorYaw??Math.atan2(f.x,f.z+49),reason:f.type==='elevator'?'승강기 내부 미구현':'매장·발권·안내 직원 공간',evidence:'model-policy'}));
export const landingPolygon=(c,start)=>{const p=start?c.path[0]:c.path.at(-1),q=start?c.path[1]:c.path.at(-2),dx=p[0]-q[0],dz=p[2]-q[2],len=Math.hypot(dx,dz);return rectCorners(p[0]+dx/len*1.4,p[2]+dz/len*1.4,c.width+.4,2.8,Math.atan2(dx,dz));};
export const BASE_REGIONS=Object.fromEntries(FLOORS.map(f=>{
  const regions=[[FLOOR_POLYGONS[f.id]]];
  if(f.id==='1F'){
    const circle=r=>Array.from({length:121},(_,i)=>{const a=i/120*Math.PI*2;return [Math.sin(a)*r,Math.cos(a)*r-49];});
    regions.push([circle(EXTERIOR_RADIUS),circle(104).reverse()]);
    const arc=r=>Array.from({length:61},(_,i)=>{const a=-1.32+i/60*2.64;return [Math.sin(a)*r,-49-Math.cos(a)*r];});
    regions.push([[...arc(105),...arc(92).reverse()]]);
  }
  for(const p of FEATURES.filter(p=>p.floor===f.id&&!['stair','ramp'].includes(p.type)))if(!containsPoint([p.x,p.z],FLOOR_POLYGONS[f.id]))regions.push([rectCorners(p.x,p.z,9,8,Math.atan2(p.x,p.z+49))]);
  for(const c of CONNECTORS){if(c.from===f.id)regions.push([landingPolygon(c,true)]);if(c.to===f.id)regions.push([landingPolygon(c,false)]);}
  const union=polygonClipping.union(...regions);
  return [f.id,FLOOR_VOIDS[f.id].length?polygonClipping.difference(union,...FLOOR_VOIDS[f.id].map(h=>[h])):union];
}));
const CUTS=Object.fromEntries(FLOORS.map(f=>[f.id,CONNECTORS.filter(c=>c.path[0][1]<f.y&&c.path.at(-1)[1]>=f.y).map(c=>({outline:ribbonOutline(c,c.width+.5,.05),landing:c.to===f.id?landingPolygon(c,false):null}))]));
export function publicSurface(x,z,floor){
  if(RESTRICTED_ZONES.some(r=>r.floor===floor&&insideRect(x,z,r,.15)))return false;
  if(CUTS[floor]?.some(c=>containsPoint([x,z],c.outline)&&!(c.landing&&containsPoint([x,z],c.landing))))return false;
  return BASE_REGIONS[floor]?.some(rings=>containsPoint([x,z],rings[0])&&!rings.slice(1).some(r=>containsPoint([x,z],r)))||false;
}
export const floorCuts=floor=>[...FLOOR_VOIDS[floor.id],...CONNECTORS.filter(c=>c.path[0][1]<floor.y&&c.path.at(-1)[1]>=floor.y).map(c=>ribbonOutline(c,c.width+.5,.05))];
