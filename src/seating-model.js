import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SEAT_BLOCKS,blockPoint,rowV,rowY,seatU} from './seat-data.js';
import {seatBridge,bridgeGuards,accessLaneY,accessLaneProfile} from './seating-navigation.js';
import {ribbonEdges,containsPoint} from './spatial.js';
import polygonClipping from 'polygon-clipping';
import {outfieldAccessFor,outfieldVoid} from './outfield-access.js';
import {buildOutfieldAccess} from './outfield-model.js';
import {upperGalleryOpen} from './upper-gallery-access.js';
import {buildUpperGallery} from './upper-gallery-model.js';
import {navyEntryFor} from './navy-entry-access.js';
import {buildNavyEntry} from './navy-entry-model.js';
import {navyFrontOpen,navyFrontBoundaryNeighbor} from './navy-front-access.js';
import {buildNavyFront} from './navy-front-model.js';
export function buildSeating({labels,materials}){
 const group=new THREE.Group();group.name='numbered_seating';const blocks=new Map(),pickables=[],annotations=[],chairGeo=new THREE.BoxGeometry(1,1,1),temp=new THREE.Object3D();
 const labelMaterial=new THREE.MeshBasicMaterial({color:0x4c5148,side:THREE.DoubleSide});
 let cutouts=[];
 function slab(parent,points,depth=.14){
  const polygons=cutouts.length?polygonClipping.difference([points.map(p=>[p[0],p[2]])],...cutouts.map(p=>[p])):[[points.map(p=>[p[0],p[2]])]],pos=[],tri=(a,b,c)=>pos.push(...a,...b,...c);
  const a=points[0],u=points[1].map((v,k)=>v-a[k]),v=points[3].map((v,k)=>v-a[k]),det=u[0]*v[2]-u[2]*v[0];
  const top=([x,z])=>[x,a[1]+((x-a[0])*v[2]-(z-a[2])*v[0])/det*u[1]+(u[0]*(z-a[2])-u[2]*(x-a[0]))/det*v[1],z];
  for(const rings of polygons){const clean=rings.map(r=>r.length>1&&r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1]?r.slice(0,-1):r),vectors=clean.map(r=>r.map(p=>new THREE.Vector2(...p))),vertices=clean.flat().map(top),faces=THREE.ShapeUtils.triangulateShape(vectors[0],vectors.slice(1));
   for(const f of faces){tri(...f.map(i=>vertices[i]));tri(...f.toReversed().map(i=>[vertices[i][0],vertices[i][1]-depth,vertices[i][2]]));}
   for(const r of clean){const t=r.map(top),b=t.map(p=>[p[0],p[1]-depth,p[2]]);for(let i=0;i<t.length;i++){const j=(i+1)%t.length;tri(t[i],t[j],b[j]);tri(t[i],b[j],b[i]);}}
  }
  if(!pos.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();const m=new THREE.Mesh(g,materials.surface);m.receiveShadow=true;m.castShadow=true;parent.add(m);return m;
 }
 function strip(g,b,u0,u1,v0,v1,y0,y1,depth=.14){return slab(g,[blockPoint(b,u0,v0,y0),blockPoint(b,u1,v0,y0),blockPoint(b,u1,v1,y1),blockPoint(b,u0,v1,y1)],depth);}
 function bar(g,a,b,r=.045){
  // Existing row guards must stop at a new stair opening, just as slabs do.
  const ts=[0,1],dx=b[0]-a[0],dz=b[2]-a[2];
  for(const poly of cutouts)for(let i=0;i<poly.length;i++){
   const p=poly[i],q=poly[(i+1)%poly.length],ex=q[0]-p[0],ez=q[1]-p[1],den=dx*ez-dz*ex;
   if(Math.abs(den)<1e-9)continue;
   const px=p[0]-a[0],pz=p[1]-a[2],t=(px*ez-pz*ex)/den,u=(px*dz-pz*dx)/den;
   if(t>0&&t<1&&u>=0&&u<=1)ts.push(t);
  }
  ts.sort((a,b)=>a-b);
  for(let i=1;i<ts.length;i++){
   const lo=ts[i-1],hi=ts[i],mid=(lo+hi)/2;
   if(hi-lo<1e-8||cutouts.some(p=>containsPoint([a[0]+dx*mid,a[2]+dz*mid],p)))continue;
   const start=a.map((v,k)=>v+(b[k]-v)*lo),end=a.map((v,k)=>v+(b[k]-v)*hi),d=new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
   const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),5),materials.dark);mesh.position.set(...start).addScaledVector(d,.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());g.add(mesh);
  }
 }
 function sign(g,text,p,width=2.7){if(!labels)return;const canvas=document.createElement('canvas');canvas.width=256;canvas.height=100;const c=canvas.getContext('2d');c.fillStyle='#42483f';c.fillRect(0,0,256,100);c.fillStyle='#fafbf7';c.font='bold 54px sans-serif';c.textAlign='center';c.fillText(text,128,69);const texture=new THREE.CanvasTexture(canvas),m=new THREE.Sprite(new THREE.SpriteMaterial({map:texture}));m.name='navigation_seat_label';m.userData={navigationAnnotation:true};m.position.set(...p);m.scale.set(width,width/2.56,1);g.add(m);annotations.push(m);}
 const outfield=buildOutfieldAccess({parent:group,materials,slab,bar}),upper=buildUpperGallery({parent:group,materials,bar}),front=buildNavyFront({parent:group,materials,bar}),entryColliders=[];
 for(const b of SEAT_BLOCKS){
  const bay=outfieldAccessFor(b.id);cutouts=bay?.anchor===b.id?[outfieldVoid(bay)]:[];
  const g=new THREE.Group();g.name='section_'+b.id;g.userData={section:b.id,floor:b.floor,sectionEvidence:'official-plan',geometryEvidence:'inferred'};group.add(g);blocks.set(b.id,g);
  const bridge=seatBridge(b),edges=ribbonEdges(bridge,1.68);
  for(let i=1;b.tier!==4&&i<bridge.length;i++){
   slab(g,[edges[i-1][0],edges[i-1][1],edges[i][1],edges[i][0]]);
  }
  for(const {a,b:c}of b.tier===4?[]:bridgeGuards(b)){for(const h of [.5,1])bar(g,[a[0],a[1]+h,a[2]],[c[0],c[1]+h,c[2]]);const n=Math.ceil(Math.hypot(...a.map((v,k)=>v-c[k]))/1.8);for(let j=0;j<=n;j++){const p=a.map((v,k)=>v+(c[k]-v)*j/n);bar(g,p,[p[0],p[1]+1,p[2]]);}}
  if(b.tier===4){const path=seatBridge(b),a=path.at(-2),c=path.at(-1),e=ribbonEdges([a,c],1.68),saved=cutouts;cutouts=[];slab(g,[e[0][0],e[0][1],e[1][1],e[1][0]]);cutouts=saved;}
  const profile=accessLaneProfile(b);
  if(navyEntryFor(b))entryColliders.push(...buildNavyEntry({group:g,b,materials,strip,bar}));
  else for(let i=1;i<profile.length;i++){const a=profile[i-1],c=profile[i];if(navyFrontOpen(b)&&c[0]<=rowV(b,1))continue;strip(g,b,0,.14,a[0],c[0],a[1],c[1]);}
  // A short overlap closes the floating-point crack where the bridge ends
  // exactly on the access-lane edge (found while returning from section 326).
  if(b.tier!==4)strip(g,b,0,.14,.997,1.003,b.bridgeY,b.bridgeY);
  if(!navyFrontOpen(b))strip(g,b,.14,1,0,rowV(b,1),b.base,b.base);
  // A continuous concrete soffit closes the bowl below the stepped terraces.
  // Its top stays below the walking surfaces; it never fills a concourse volume.
  // Closed row risers already supply depth. The extra underside skin must not
  // double that thickness into the lower-tier entrance headroom (118/221).
  strip(g,b,.14,1,rowV(b,1),rowV(b,b.rows),b.base-.20,rowY(b,b.rows)-.20,.18);
  const count=b.catalogue.flat().length,seats=new THREE.InstancedMesh(chairGeo,materials.seat,count*2);seats.name=b.id+'_chairs';seats.userData={section:b.id};seats.castShadow=true;seats.receiveShadow=true;const addresses=[];let instance=0;
  for(let row=1;row<=b.rows;row++){
   const v=rowV(b,row),y=rowY(b,row),step=.9/b.rows;
   strip(g,b,.14,.87,v-.28*step,v+.72*step,y,y,b.rise+.18);
   const nextV=row===b.rows?1:rowV(b,row+1),nextY=row===b.rows?y:rowY(b,row+1),mid=(v+nextV)/2;
   strip(g,b,.87,1,v,mid,y+.5*(nextY-y),y+.5*(nextY-y),b.rise/2+.18);strip(g,b,.87,1,mid,nextV,nextY,nextY,b.rise/2+.18);
   const rowData=b.catalogue[row-1];
   for(const seat of rowData){const u=seatU(b,seat.index,rowData.length),p=blockPoint(b,u,v+.38*step,y+.40),ahead=blockPoint(b,u,v-.01,y),yaw=Math.atan2(p[0]-ahead[0],p[2]-ahead[2]),width=Math.min(.48,b.width*.6/rowData.length*.9);
    for(const back of [false,true]){temp.position.set(p[0]+(back?Math.sin(yaw)*.11:0),p[1]+(back?.19:0),p[2]+(back?Math.cos(yaw)*.11:0));temp.rotation.set(0,yaw,0);temp.scale.set(width,back?.35:.10,back?.08:.25);temp.updateMatrix();seats.setMatrixAt(instance++,temp.matrix);addresses.push({section:b.id,row,number:seat.number,evidence:seat.evidence});}
   }
   if(row===1||row%5===0||row===b.rows)sign(g,String(row),blockPoint(b,.96,v,y+.65),.75);
  }
  seats.userData.addresses=addresses;g.add(seats);pickables.push(seats);
  // Solid front fascia and a continuous front/rear guard, leaving the access lane open.
  if(b.tier!==4&&!navyFrontOpen(b))strip(g,b,.14,1,-.012,.012,b.base+.7,b.base+.7,.95);
  if(b.tier===4||upperGalleryOpen(b))strip(g,b,.14,.87,rowV(b,b.rows)+.72*.9/b.rows,1,rowY(b,b.rows),rowY(b,b.rows));
  for(const v of b.tier===4?[]:navyFrontOpen(b)?(upperGalleryOpen(b)?[]:[1]):upperGalleryOpen(b)?[0]:[0,1]){const y=v===0?b.base:rowY(b,b.rows);for(const h of [.55,1.05])bar(g,blockPoint(b,.14,v,y+h),blockPoint(b,1,v,y+h));const n=Math.max(2,Math.ceil(b.width/1.8));for(let j=0;j<=n;j++){const u=.14+.86*j/n;bar(g,blockPoint(b,u,v,y),blockPoint(b,u,v,y+1.05));}}
  for(const u of (navyEntryFor(b)?[1]:[0,1])){const p=blockPoint(b,u,0,b.base+1),q=blockPoint(b,u,1,(u===0?b.bridgeY:rowY(b,b.rows))+1);if(u===0){for(let i=1;i<profile.length;i++){if((navyFrontOpen(b)||navyFrontBoundaryNeighbor(b,u))&&profile[i][0]<=rowV(b,1))continue;bar(g,blockPoint(b,u,profile[i-1][0],profile[i-1][1]+1),blockPoint(b,u,profile[i][0],profile[i][1]+1));}}else{const stairProfile=[[0,b.base],[rowV(b,1),b.base],[rowV(b,b.rows),rowY(b,b.rows)],[1,rowY(b,b.rows)]];for(let j=(navyFrontOpen(b)||navyFrontBoundaryNeighbor(b,u))?2:1;j<stairProfile.length;j++)bar(g,blockPoint(b,u,stairProfile[j-1][0],stairProfile[j-1][1]+1),blockPoint(b,u,stairProfile[j][0],stairProfile[j][1]+1));}const n=Math.ceil(b.depth/2);for(let i=0;i<=n;i++){const v=i/n;if((navyFrontOpen(b)||navyFrontBoundaryNeighbor(b,u))&&v<rowV(b,1))continue;const y=u===0?accessLaneY(b,v):b.base+Math.max(0,Math.min(1,(v-rowV(b,1))/(rowV(b,b.rows)-rowV(b,1))))*(b.rows-1)*b.rise;bar(g,blockPoint(b,u,v,y),blockPoint(b,u,v,y+1));}}
  sign(g,b.id,blockPoint(b,.5,.95,rowY(b,b.rows)+1.5),3.4);
  const structures=g.children.filter(x=>x.isMesh&&!x.isInstancedMesh),batches=new Map();for(const m of structures){const list=batches.get(m.material)||[];m.updateMatrix();list.push(m.geometry.clone().applyMatrix4(m.matrix));batches.set(m.material,list);g.remove(m);}
  for(const [mat,geometries]of batches){const merged=mergeGeometries(geometries.map(geo=>geo.index?geo.toNonIndexed():geo));const mesh=new THREE.Mesh(merged,mat);mesh.name=b.id+'_terraces_and_aisles';mesh.receiveShadow=true;mesh.castShadow=true;g.add(mesh);geometries.forEach(geo=>geo.dispose());}
 }
 return {group,blocks,pickables,annotations,colliders:[...outfield.colliders,...upper.colliders,...front.colliders,...entryColliders],publicAccess:outfield.group,upperAccess:upper.group,frontAccess:front.group};
}
