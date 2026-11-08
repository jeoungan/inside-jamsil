import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {STRUCTURE_DETAILS} from './structure-evidence.js';

// Two independent visits show the same GATE 2-3 metal door/transom assembly.
// Fit one limited bay between the existing shops and stair. Heights, leaf count,
// and the permanently open display pose are assumptions, not a door survey.
export const ENTRY_DOOR_FRAME={
  gate:'gate-23',floor:'2F',width:4.2,top:2.5,transomBottom:2.16,recess:.35,concreteDepth:.9,portalOffsetX:-2,portalOffsetZ:.8,
  member:.075,depth:.09,leafHeight:2.11,kickHeight:.48,leafDepth:1,outerLeafSplay:{left:Math.PI/6,right:Math.PI/4},
  sign:{y:2.59,width:2.3,height:.28},
  geometryEvidence:'photo-cross-check',locationEvidence:'inferred',dimensionEvidence:'inferred',
  sources:['myinfo1190-gate23-2024','woodnstyle-entry-2025']
};

export function buildEntryDoorFrame({feature,yaw,baseY,materials,colliders}){
  const p=ENTRY_DOOR_FRAME,group=new THREE.Group();group.name='gate_23_metal_door_frame';
  group.position.z=-p.recess;
  group.userData={profile:p,detail:STRUCTURE_DETAILS.find(d=>d.id==='gate-23-metal-door-frame')};
  const metal=materials.dark.clone();metal.color.setHex(0x979c99);metal.metalness=.65;metal.roughness=.36;
  const glass=new THREE.MeshStandardMaterial({color:0xd4d8d5,roughness:.18,metalness:.05,transparent:true,opacity:.22,depthWrite:false});
  const co=Math.cos(yaw),si=Math.sin(yaw),geo=new THREE.BoxGeometry(1,1,1);
  function box(w,h,d,x,y,z,material,name){
    const m=new THREE.Mesh(geo,material);m.scale.set(w,h,d);m.position.set(x,y,z);m.name=name;
    m.castShadow=material===metal;m.receiveShadow=true;group.add(m);return m;
  }
  function solid(x,z,w,d,lo,hi,type,localYaw=0){
    z-=p.recess;
    colliders.push({floor:feature.floor,x:feature.x+co*x+si*z,z:feature.z-si*x+co*z,
      width:w,depth:d,yaw:yaw+localYaw,baseY:baseY+lo,height:hi,type,featureId:feature.id});
  }
  // Fixed jambs and a central mullion divide two independently walkable bays.
  for(const x of [-p.width/2,0,p.width/2]){
    box(p.member,p.top,p.depth,x,p.top/2,0,metal,'entry_fixed_jamb');
    solid(x,0,p.member,p.depth,0,p.top,'entry-door-jamb');
  }
  for(const y of [p.transomBottom,p.top]){
    box(p.width,p.member,p.depth,0,y,0,metal,'entry_transom_rail');
    solid(0,0,p.width,p.depth,y-p.member/2,y+p.member/2,'entry-transom');
  }
  const paneWidth=p.width/4-p.member,paneHeight=p.top-p.transomBottom-p.member;
  for(const side of [-1,1]){
    const x=side*p.width/4;
    box(p.member,paneHeight,p.depth,x,(p.top+p.transomBottom)/2,0,metal,'entry_transom_mullion');
    for(const offset of [-p.width/8,p.width/8])box(paneWidth,paneHeight,.024,x+offset,(p.top+p.transomBottom)/2,0,glass,'entry_transom_glazing');
  }
  // Inner leaves open 90 degrees; the left outer leaf opens 120 degrees beside
  // the shop and the right opens 135 degrees beside the stair approach.
  // This display pose is inferred. Every
  // visible leaf has a collision volume; no decorative pass-through glass.
  for(const hinge of [-p.width/2+p.member, -p.member, p.member, p.width/2-p.member]){
    const h=p.leafHeight,angle=Math.abs(hinge)>p.width/4?Math.sign(hinge)*p.outerLeafSplay[hinge<0?'left':'right']:0;
    const position=z=>[hinge+Math.sin(angle)*z,.055+Math.cos(angle)*z];
    const piece=(w,h,d,y,z,material,name)=>{const [x,zz]=position(z),m=box(w,h,d,x,y,zz,material,name);m.rotation.y=angle;};
    for(const z of [0,p.leafDepth])piece(p.depth,h,p.member,h/2,z,metal,'entry_open_leaf_stile');
    for(const y of [p.member/2,p.kickHeight,h-p.member/2])piece(p.depth,p.member,p.leafDepth,y,p.leafDepth/2,metal,'entry_open_leaf_rail');
    piece(.032,p.kickHeight-p.member,p.leafDepth-p.member,p.kickHeight/2,p.leafDepth/2,metal,'entry_leaf_kickplate');
    piece(.024,h-p.kickHeight-p.member*1.5,p.leafDepth-p.member,(h+p.kickHeight-p.member/2)/2,p.leafDepth/2,glass,'entry_leaf_glazing');
    const [x,z]=position(p.leafDepth/2);solid(x,z,p.depth,p.leafDepth+p.member,0,h,'entry-open-door-leaf',angle);
  }
  // Merge repeated frame pieces, retaining separate glazing for transparency.
  const batches=new Map();
  for(const m of group.children){const key=m.name;const list=batches.get(key)||[];list.push(m);batches.set(key,list);}
  for(const [name,list]of batches){
    const pieces=list.map(m=>{m.updateMatrix();return geo.toNonIndexed().applyMatrix4(m.matrix);});
    const m=new THREE.Mesh(mergeGeometries(pieces),list[0].material);m.name=name;m.castShadow=list[0].castShadow;m.receiveShadow=true;
    for(const piece of pieces)piece.dispose();for(const child of list)group.remove(child);group.add(m);
  }
  geo.dispose();return group;
}
