import * as THREE from 'three';
import {OUTFIELD_ACCESSES,outfieldPoint,OUTFIELD_REAR,outfieldRearOpen} from './outfield-access.js';
import {ribbonEdges} from './spatial.js';
import {SEAT_BLOCKS,SEAT_BLOCK_BY_ID,blockPoint,blockUV,rowY} from './seat-data.js';

export function buildOutfieldAccess({parent,materials,slab,bar}){
 const group=new THREE.Group();group.name='outfield_public_access';group.userData={geometryEvidence:'photo-cross-check',dimensionEvidence:'inferred'};parent.add(group);
 const colliders=[];
 const box=(name,w,h,d,x,y,z,yaw=0,solid=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),materials.wall);m.name=name;m.position.set(x,y+h/2,z);m.rotation.y=yaw;m.castShadow=true;m.receiveShadow=true;group.add(m);if(solid)colliders.push({floor:'1F',x,z,width:w,depth:d,yaw,height:y+h,baseY:y,type:'outfield-wall'});return m;};
 const deck=(a,b,width,depth=.22)=>{const e=ribbonEdges([a,b],width);return slab(group,[e[0][0],e[0][1],e[1][1],e[1][0]],depth);};
 const cheek=(s,t,topA,topB)=>{
  const length=Math.hypot(t[0]-s[0],t[2]-s[2]),yaw=-Math.atan2(t[2]-s[2],t[0]-s[0]),shape=new THREE.Shape();
  shape.moveTo(0,s[1]-.22);shape.lineTo(length,t[1]-.22);shape.lineTo(length,topB);shape.lineTo(0,topA);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.4,bevelEnabled:false});geometry.translate(0,0,-.2);
  const mesh=new THREE.Mesh(geometry,materials.wall);mesh.name='outfield_stair_cheek';mesh.position.set(s[0],0,s[2]);mesh.rotation.y=yaw;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  colliders.push({floor:'1F',x:(s[0]+t[0])/2,z:(s[2]+t[2])/2,width:length,depth:.4,yaw,baseY:Math.min(s[1],t[1])-.22,height:Math.max(topA,topB),type:'outfield-wall'});
 };
 for(const a of OUTFIELD_ACCESSES){
  const path=a.path,block=SEAT_BLOCK_BY_ID.get(a.anchor);
  const wallTop=p=>{const v=blockUV(block,p[0],p[2]).v,row=Math.max(1,Math.min(block.rows,(v-.06)*block.rows/.9+.5));return rowY(block,row)+1.05;};
  for(let i=1;i<path.length;i++){
   const p=path[i-1],q=path[i],rise=q[1]-p[1],steps=rise>.01?Math.ceil(rise/.17):1;
   for(let j=0;j<steps;j++){
    const t=j/steps,u=(j+1)/steps,y=rise>.01?p[1]+rise*(j+.5)/steps:p[1];
    const start=p.map((v,k)=>k===1?y:v+(q[k]-v)*t),end=p.map((v,k)=>k===1?y:v+(q[k]-v)*u);
    deck(start,end,a.width,rise>.01?rise/steps+.22:.22);
   }
   // Two concrete cheeks contain the stair; the room-side opening stays open.
   if(i>=2&&i<path.length-1){const e=ribbonEdges([p,q],a.width+.4);for(const side of [0,1])cheek(e[0][side],e[1][side],wallTop(e[0][side]),wallTop(e[1][side]));}
  }
  const entrance=path[0],base=path[1],nx=Math.cos(a.angle),nz=Math.sin(a.angle);
  // Photo-observed wall opening, deep head beam and exposed concrete supports.
  for(const side of [-1,1])box('outfield_entry_pier',.45,4.65,.6,base[0]+nx*side*1.65,0,base[2]+nz*side*1.65,-a.angle);
  box('outfield_entry_lintel',3.75,.45,.6,base[0],4.2,base[2],-a.angle,false);
  box('outfield_entry_spandrel',3.1,Math.max(.01,wallTop(base)-1.25-4.65),.35,base[0],4.65,base[2],-a.angle,false);
  const mid=entrance.map((v,k)=>(v+base[k])/2),length=Math.hypot(base[0]-entrance[0],base[2]-entrance[2]);
  box('outfield_hall_soffit',4.1,.25,length,mid[0],4.65,mid[2],-a.angle,false);
  for(const side of [-1,1])box('outfield_hall_wall',.24,4.65,length-1.8,mid[0]+nx*side*1.95,0,mid[2]+nz*side*1.95,-a.angle);
 }
 // Public cross-aisles along the field-side of the seats, separate from field.
 for(const sign of [-1,1]){
  const n=90,angles=Array.from({length:n+1},(_,i)=>sign*(.005+(1.32-.005)*i/n));
  for(let i=1;i<angles.length;i++){
   const a=angles[i-1],b=angles[i];slab(group,[outfieldPoint(a,80.5,4),outfieldPoint(b,80.5,4),outfieldPoint(b,82.9,4),outfieldPoint(a,82.9,4)],.25);
   const p=outfieldPoint(a,80.5,4),q=outfieldPoint(b,80.5,4);deck([p[0],4.65,p[2]],[q[0],4.65,q[2]],.18,.75);bar(group,[p[0],5.05,p[2]],[q[0],5.05,q[2]]);
   if(i%2===0)bar(group,p,[p[0],5.05,p[2]]);
  }
  for(const angle of [angles[0],angles.at(-1)]){
   const p=outfieldPoint(angle,80.5,4),q=outfieldPoint(angle,82.9,4);
   for(const h of [.55,1.05])bar(group,[p[0],4+h,p[2]],[q[0],4+h,q[2]]);
   for(const v of [p,q])bar(group,v,[v[0],5.05,v[2]]);
  }
 }
 const rear=OUTFIELD_REAR,segments=176;
 // One watertight annular slab. Per-segment end faces produced false rib-like
 // self-shadow bands even though the walker's floor remained perfectly level.
 const rearAngles=Array.from({length:segments+1},(_,i)=>-rear.limit+2*rear.limit*i/segments);
 const outline=[...rearAngles.map(a=>outfieldPoint(a,rear.outer+.15,0)),...rearAngles.toReversed().map(a=>outfieldPoint(a,rear.inner,0))];
 const shape=new THREE.Shape(outline.map(p=>new THREE.Vector2(p[0],-p[2]))),geometry=new THREE.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:false});geometry.rotateX(-Math.PI/2);geometry.deleteAttribute('uv');
 const rearDeck=new THREE.Mesh(geometry,materials.surface);rearDeck.name='outfield_rear_continuous_deck';rearDeck.position.y=rear.y-.3;rearDeck.castShadow=true;rearDeck.receiveShadow=true;group.add(rearDeck);
 const wall=(name,a,b,base,h,depth,material=materials.wall)=>{
  const dx=b[0]-a[0],dz=b[2]-a[2],m=box(name,Math.hypot(dx,dz),h,depth,(a[0]+b[0])/2,base,(a[2]+b[2])/2,-Math.atan2(dz,dx));m.material=material;return m;
 };
 const glass=materials.wall.clone();glass.color.setHex(0xc3cbc7);glass.transparent=true;glass.opacity=.27;glass.roughness=.3;glass.depthWrite=false;
 const guard=(a,b)=>{wall('outfield_rear_glass',a,b,rear.y+.15,.9,.055,glass);bar(group,[a[0],rear.y+1.1,a[2]],[b[0],rear.y+1.1,b[2]]);const n=Math.max(1,Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/1.6));for(let i=0;i<=n;i++){const p=a.map((v,k)=>v+(b[k]-v)*i/n);bar(group,[p[0],rear.y,p[2]],[p[0],rear.y+1.1,p[2]],.035);}};
 for(let i=0;i<segments;i++){
  const a=-rear.limit+2*rear.limit*i/segments,b=-rear.limit+2*rear.limit*(i+1)/segments;
  wall('outfield_rear_parapet',outfieldPoint(a,rear.outer,rear.y),outfieldPoint(b,rear.outer,rear.y),rear.y,1.2,.25);
 }
 const blocks=SEAT_BLOCKS.filter(b=>b.tier===4);
 for(const [i,b]of blocks.entries()){
  guard(blockPoint(b,0,1,rear.y),blockPoint(b,outfieldRearOpen(b)?.87:1,1,rear.y));
  if(i<blocks.length-1)guard(blockPoint(b,1,1,rear.y),blockPoint(blocks[i+1],0,1,rear.y));
 }
 for(const angle of [-rear.limit,rear.limit])wall('outfield_rear_end_guard',outfieldPoint(angle,rear.inner,rear.y),outfieldPoint(angle,rear.outer,rear.y),rear.y,1.2,.2);
 // Keep the scoreboard-side public boundary closed. The roof ribs, buttress
 // spacing and service-door detail visible in one visitor's photo set await
 // an independent view of this same passage; do not copy them into the model.
 const n=24;
 for(let i=0;i<n;i++){
  const a=-rear.screenHalfAngle+2*rear.screenHalfAngle*i/n,b=-rear.screenHalfAngle+2*rear.screenHalfAngle*(i+1)/n;
  wall('scoreboard_back_wall',outfieldPoint(a,rear.screenWallRadius,rear.y),outfieldPoint(b,rear.screenWallRadius,rear.y),rear.y,3.5,.28);
 }
 return {group,colliders};
}
