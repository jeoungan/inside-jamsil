import * as THREE from 'three';
import {blockPoint,rowV} from './seat-data.js';
import {NAVY_ENTRIES,navyEntryProfile,navyTerraceY} from './navy-entry-access.js';
import {ribbonEdges} from './spatial.js';

import {navyFrontOpen} from './navy-front-access.js';
export function buildNavyEntry({group,b,materials,strip,bar}){
 const colliders=[],profile=navyEntryProfile(b),floor=v=>{
  for(let i=1;i<profile.length;i++){const a=profile[i-1],c=profile[i];if(v<=c[0])return a[1]+(c[1]-a[1])*(v-a[0])/(c[0]-a[0]);}
  return b.bridgeY;
 };
 // The renderer and navigation use the same physical tread height. Entry
 // steps are at most 18 cm; the body never floats along an invisible ramp.
 for(let i=1;i<profile.length;i++){
  const a=profile[i-1],c=profile[i];if(navyFrontOpen(b)&&c[0]<=rowV(b,1))continue;const n=Math.max(1,Math.ceil(Math.abs(c[1]-a[1])/NAVY_ENTRIES.maxRiser));
  for(let j=0;j<n;j++){
   const v0=a[0]+(c[0]-a[0])*j/n,v1=a[0]+(c[0]-a[0])*(j+1)/n;
   const top=floor((v0+v1)/2);strip(group,b,0,.14,v0,v1,top,top,.43);
  }
 }
 const wallTop=v=>Math.max(floor(v)+1.02,navyTerraceY(b,v)+.62);
 const vs=[NAVY_ENTRIES.wallStartV,...profile.map(p=>p[0]).filter(v=>v>NAVY_ENTRIES.wallStartV&&v<1),NAVY_ENTRIES.roofStartV,.78,1].sort((a,c)=>a-c);
 const unique=[...new Set(vs)];
 for(const u of [0,.152]){
  // At the rear, two neighboring model aisle strips meet. Taper the cheek
  // toward this bay so the existing adjacent stair mouth keeps its width.
  const wallU=v=>u===0?.005-.005*Math.max(0,Math.min(1,(v-.78)/.22)):u;
  const path=unique.map(v=>blockPoint(b,wallU(v),v)),edges=ribbonEdges(path,NAVY_ENTRIES.wallThickness);
  const edge=(i,side,h)=>[edges[i][side][0],h,edges[i][side][2]];
  const vertices=[],tri=(a,c,d)=>vertices.push(...a,...c,...d);
  for(let i=1;i<unique.length;i++){
   const v0=unique[i-1],v1=unique[i],a=path[i-1],c=path[i],dx=c[0]-a[0],dz=c[2]-a[2],length=Math.hypot(dx,dz);
   const bottom=[edge(i-1,0,floor(v0)-.2),edge(i,0,floor(v1)-.2),edge(i,1,floor(v1)-.2),edge(i-1,1,floor(v0)-.2)];
   const top=[edge(i-1,0,wallTop(v0)),edge(i,0,wallTop(v1)),edge(i,1,wallTop(v1)),edge(i-1,1,wallTop(v0))];
   tri(top[0],top[1],top[2]);tri(top[0],top[2],top[3]);tri(bottom[2],bottom[1],bottom[0]);tri(bottom[3],bottom[2],bottom[0]);
   for(const k of [0,2,...(i===1?[3]:[]),...(i===unique.length-1?[1]:[])]){const j=(k+1)%4;tri(bottom[k],bottom[j],top[j]);tri(bottom[k],top[j],top[k]);}
   // The photographic cheek has a metal guard above the concrete, distinct
   // from the handrail inside the passage.
   bar(group,blockPoint(b,wallU(v0),v0,wallTop(v0)+.42),blockPoint(b,wallU(v1),v1,wallTop(v1)+.42));
   const posts=Math.max(1,Math.ceil(length/1.8));
   for(let j=0;j<posts;j++){const v=v0+(v1-v0)*j/posts;bar(group,blockPoint(b,wallU(v),v,wallTop(v)),blockPoint(b,wallU(v),v,wallTop(v)+.42));}
   colliders.push({floor:b.floor,x:(a[0]+c[0])/2,z:(a[2]+c[2])/2,width:length,depth:NAVY_ENTRIES.wallThickness,yaw:-Math.atan2(dz,dx),baseY:Math.min(floor(v0),floor(v1))-.2,height:Math.max(wallTop(v0),wallTop(v1))-b.entryY,type:'navy-entry-cheek'});
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,materials.wall);mesh.name=b.id+'_entry_concrete_cheek';mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  // Handrails follow the actual entry stairs, independently of the taller
  // cheek which retains the adjacent upper seating slab.
  const railU=u===0?.019:.137;
  for(let i=1;i<profile.length;i++){
   const a=profile[i-1],c=profile[i],lo=Math.max(NAVY_ENTRIES.wallStartV,a[0]);if(c[0]<=lo)continue;
   bar(group,blockPoint(b,railU,lo,floor(lo)+.94),blockPoint(b,railU,c[0],c[1]+.94));
  }
 }
 // A sloping concrete soffit closes the tunnel behind the open stair mouth.
 // It is deliberately not a new public rooftop walking surface.
 const start=NAVY_ENTRIES.roofStartV;
 strip(group,b,-.01,.164,start,1,navyTerraceY(b,start)+.25,navyTerraceY(b,1)+.25,NAVY_ENTRIES.roofThickness);
 group.userData.entryStructure={...NAVY_ENTRIES,section:b.id};
 return colliders;
}
