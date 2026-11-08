import * as THREE from 'three';
import {NAVY_FRONT,NAVY_FRONT_WINGS} from './navy-front-access.js';

export function buildNavyFront({parent,materials,bar}){
 const group=new THREE.Group();group.name='navy_front_public_gallery';group.userData={...NAVY_FRONT};parent.add(group);
 const colliders=[],y=NAVY_FRONT.y,glass=materials.wall.clone();glass.transparent=true;glass.opacity=.25;glass.depthWrite=false;glass.side=THREE.DoubleSide;
 const panel=(name,a,b,base,h,depth,material)=>{
  const length=Math.hypot(b[0]-a[0],b[2]-a[2]),yaw=-Math.atan2(b[2]-a[2],b[0]-a[0]),mesh=new THREE.Mesh(new THREE.BoxGeometry(length,h,depth),material);
  mesh.name=name;mesh.position.set((a[0]+b[0])/2,base+h/2,(a[2]+b[2])/2);mesh.rotation.y=yaw;mesh.castShadow=!material.transparent;mesh.receiveShadow=true;group.add(mesh);
  return {floor:'4F',x:mesh.position.x,z:mesh.position.z,width:length,depth,yaw,baseY:y,height:NAVY_FRONT.guardHeight,type:'navy-front-guard'};
 };
 const guard=(a,b)=>{
  colliders.push(panel('navy_front_concrete_parapet',a,b,y-.22,NAVY_FRONT.parapetHeight+.22,.16,materials.wall));
  panel('navy_front_transparent_guard',a,b,y+NAVY_FRONT.parapetHeight,NAVY_FRONT.guardHeight-NAVY_FRONT.parapetHeight,.025,glass);
  bar(group,[a[0],y+NAVY_FRONT.guardHeight,a[2]],[b[0],y+NAVY_FRONT.guardHeight,b[2]],.035);
  const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/1.7));
  for(let i=0;i<=n;i++){const p=a.map((v,k)=>v+(b[k]-v)*i/n);bar(group,[p[0],y+NAVY_FRONT.parapetHeight,p[2]],[p[0],y+NAVY_FRONT.guardHeight,p[2]],.025);}
 };
 for(const wing of NAVY_FRONT_WINGS){
  const shape=new THREE.Shape(wing.outline.map(([x,z])=>new THREE.Vector2(x,-z))),geometry=new THREE.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:false});geometry.rotateX(-Math.PI/2);geometry.deleteAttribute('uv');
  const deck=new THREE.Mesh(geometry,materials.surface);deck.name='navy_front_continuous_deck';deck.position.y=y-.22;deck.receiveShadow=true;deck.castShadow=true;group.add(deck);
  const front=wing.edge(0),back=wing.edge(1);
  for(let i=1;i<front.length;i++)guard(front[i-1],front[i]);
  // Thin end rails bound this partial reconstruction. A solid return here
  // would pinch the neighboring pre-existing access lanes (316 and 327).
  for(const i of [0,front.length-1]){
   const a=front[i],b=back[i],length=Math.hypot(b[0]-a[0],b[2]-a[2]);
   for(const h of [.55,1.05])bar(group,[a[0],y+h,a[2]],[b[0],y+h,b[2]],.015);
   for(const p of [a,b])bar(group,p,[p[0],y+1.05,p[2]],.015);
   colliders.push({floor:'4F',x:(a[0]+b[0])/2,z:(a[2]+b[2])/2,width:length,depth:.03,yaw:-Math.atan2(b[2]-a[2],b[0]-a[0]),baseY:y,height:1.05,type:'navy-front-end-guard'});
  }
 }
 return {group,colliders};
}
