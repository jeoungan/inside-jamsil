import * as THREE from 'three';
import {CANOPY_FRAME,CANOPY_SECTIONS,CANOPY_SUPPORTS,hasDetailedCanopy} from './canopy-profile.js';

export function buildCanopyFrame({parent,materials}){
 const group=new THREE.Group();group.name='upper_canopy_frame';group.userData={...CANOPY_FRAME};parent.add(group);
 const add=(geo,name,mat=materials.dark)=>{const m=new THREE.Mesh(geo,mat);m.name=name;m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
 const member=(a,b,w,h,name)=>{
  const d=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),mesh=add(new THREE.BoxGeometry(w,h,d.length()),name);
  mesh.position.set(...a).addScaledVector(d,.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),d.normalize());return mesh;
 };
 // A closed continuous shell has no internal radial caps to cast false bands.
 const positions=[],tri=(a,b,c)=>positions.push(...a,...b,...c),quad=(a,b,c,d)=>{tri(a,c,b);tri(a,d,c);};
 for(let i=1;i<CANOPY_SECTIONS.length;i++){
  const a=CANOPY_SECTIONS[i-1],b=CANOPY_SECTIONS[i],depth=CANOPY_FRAME.slabDepth;
  quad(a.at(0),b.at(0),b.at(1),a.at(1));quad(a.at(1,depth),b.at(1,depth),b.at(0,depth),a.at(0,depth));
  quad(a.at(0),a.at(0,depth),b.at(0,depth),b.at(0));quad(a.at(1),b.at(1),b.at(1,depth),a.at(1,depth));
 }
 for(const [cross,reverse]of [[CANOPY_SECTIONS[0],false],[CANOPY_SECTIONS.at(-1),true]]){
  const p=[cross.at(0),cross.at(1),cross.at(1,CANOPY_FRAME.slabDepth),cross.at(0,CANOPY_FRAME.slabDepth)];quad(...(reverse?p.toReversed():p));
 }
 const shell=new THREE.BufferGeometry();shell.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));shell.computeVertexNormals();add(shell,'continuous_canopy_shell',materials.surface);
 for(const support of CANOPY_SUPPORTS){
  const {cross,t,column}=support,start=cross.at(0),end=cross.at(1),span=cross.outer-cross.inner,drop=CANOPY_FRAME.slabDepth+.025;
  const fractions=[0,Math.max(.12,t-.14),t,1],depths=[.2,CANOPY_FRAME.girderDepth,CANOPY_FRAME.girderDepth,.3];
  const top=f=>cross.at(f,drop)[1],shape=new THREE.Shape();shape.moveTo(0,top(0));shape.lineTo(span,top(1));
  for(let i=fractions.length-1;i>=0;i--)shape.lineTo(fractions[i]*span,top(fractions[i])-depths[i]);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:CANOPY_FRAME.girderWidth,bevelEnabled:false});geo.translate(0,0,-CANOPY_FRAME.girderWidth/2);
  const web=add(geo,'canopy_tapered_girder');web.position.set(start[0],0,start[2]);web.rotation.y=-Math.atan2(end[2]-start[2],end[0]-start[0]);
  member(cross.at(0,drop),cross.at(1,drop),.38,.06,'canopy_top_flange');
  for(let i=1;i<fractions.length;i++)member(cross.at(fractions[i-1],drop+depths[i-1]),cross.at(fractions[i],drop+depths[i]),.38,.06,'canopy_lower_flange');
  // Short vertical saddle and inward knee attach to the existing public column.
  // No bolts, cables, pipes or unverified service platforms are invented.
  const saddle=cross.at(t,drop+CANOPY_FRAME.girderDepth),base=[column[0],31.5,column[2]];
  member(base,saddle,.26,.26,'canopy_column_saddle');
  member(base,cross.at(Math.max(0,t-.1),drop+.2),.16,.16,'canopy_knee_brace');
 }
 for(const f of CANOPY_FRAME.purlinFractions)for(let i=1;i<CANOPY_SECTIONS.length;i++){
  const a=CANOPY_SECTIONS[i-1],b=CANOPY_SECTIONS[i],p=a.at(.5),q=b.at(.5);
  if(!hasDetailedCanopy([(p[0]+q[0])/2,(p[2]+q[2])/2]))continue;
  member(a.at(f,CANOPY_FRAME.slabDepth+.12),b.at(f,CANOPY_FRAME.slabDepth+.12),.13,.18,'canopy_transverse_purlin');
 }
 return {group};
}
