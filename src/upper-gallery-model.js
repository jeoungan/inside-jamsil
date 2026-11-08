import * as THREE from 'three';
import {UPPER_GALLERY,UPPER_WINGS,upperOffset} from './upper-gallery-access.js';
import {blockPoint} from './seat-data.js';

export function buildUpperGallery({parent,materials,bar}){
 const group=new THREE.Group();group.name='upper_public_gallery';group.userData={...UPPER_GALLERY};parent.add(group);
 const colliders=[],y=UPPER_GALLERY.y,top=31.55;
 const box=(name,w,h,d,p,yaw=0,solid=true)=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),materials.wall);m.name=name;m.position.set(p[0],p[1]+h/2,p[2]);m.rotation.y=yaw;m.castShadow=true;m.receiveShadow=true;group.add(m);
  if(solid)colliders.push({floor:'4F',x:p[0],z:p[2],width:w,depth:d,yaw,baseY:p[1],height:p[1]+h-14.5,type:'upper-gallery-wall'});return m;
 };
 const wall=(name,a,b,base,h,depth=.22)=>box(name,Math.hypot(b[0]-a[0],b[2]-a[2]),h,depth,[(a[0]+b[0])/2,base,(a[2]+b[2])/2],-Math.atan2(b[2]-a[2],b[0]-a[0]));
 const guard=(a,b)=>{
  for(const h of [.55,1.05])bar(group,[a[0],y+h,a[2]],[b[0],y+h,b[2]]);
  const n=Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/1.6);
  for(let i=0;i<=n;i++){const p=a.map((v,k)=>v+(b[k]-v)*i/n);bar(group,p,[p[0],y+1.05,p[2]]);}
  colliders.push({floor:'4F',x:(a[0]+b[0])/2,z:(a[2]+b[2])/2,width:Math.hypot(b[0]-a[0],b[2]-a[2]),depth:.06,yaw:-Math.atan2(b[2]-a[2],b[0]-a[0]),baseY:y,height:y+1.05-14.5,type:'upper-gallery-guard'});
 };
 for(const wing of UPPER_WINGS){
  const shape=new THREE.Shape(wing.outline.map(([x,z])=>new THREE.Vector2(x,-z))),geo=new THREE.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:false});geo.rotateX(-Math.PI/2);geo.deleteAttribute('uv');
  const deck=new THREE.Mesh(geo,materials.surface);deck.position.y=y-.3;deck.name='upper_continuous_gallery_deck';deck.castShadow=true;deck.receiveShadow=true;group.add(deck);
  for(let i=0;i<wing.blocks.length;i++){
   const b=wing.blocks[i],a=upperOffset(wing.inner[i],UPPER_GALLERY.width),c=upperOffset(wing.inner[i+1],UPPER_GALLERY.width);
   wall('upper_outer_parapet',a,c,y,1.05);wall('upper_opening_header',a,c,top-.28,.28,.35);
   // Repeated square piers and long exterior apertures are visible in both
   // 2014 independent photographs; recent photos corroborate the large forms.
   box('upper_exterior_pier',.48,top-y,.5,a,-Math.atan2(c[2]-a[2],c[0]-a[0]));
   const column=upperOffset(blockPoint(b,.43,1,y),.65),yaw=-Math.atan2(c[2]-a[2],c[0]-a[0]);
   if(i%2===0)box('upper_seat_side_column',.85,top-y,.85,column,yaw);
   guard(blockPoint(b,0,1,y),blockPoint(b,.87,1,y));
  }
  for(const p of [wing.inner[0],wing.inner.at(-1)])guard(p,upperOffset(p,UPPER_GALLERY.width));
 }
 return {group,colliders};
}
