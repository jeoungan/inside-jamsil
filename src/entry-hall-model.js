import * as THREE from 'three';
import {ENTRY_HALL,entryHallGeometry} from './entry-hall.js';
import {STRUCTURE_DETAILS} from './structure-evidence.js';

// Narrow concrete ribs are visible between the deep beams in independent
// 2023 and 2025 photos. Count, spacing, section and orientation in the model
// remain a limited fit to the existing two portal frames, not measured data.
export function buildEntryHallRibs({outer,inner,ceilingHeight,material}){
  const group=new THREE.Group();group.name='gate_21_high_hall_ribs';
  const profile=ENTRY_HALL.ribs,hall=entryHallGeometry(outer,inner),top=ceilingHeight-.25;
  group.userData={detail:STRUCTURE_DETAILS.find(d=>d.id==='gate-21-high-hall'),profile,
    geometryEvidence:'partial-photo-cross-check',locationEvidence:'inferred',dimensionEvidence:'inferred'};
  for(const [index,fraction]of profile.fractions.entries()){
    const a=hall.at(profile.fromAxis,fraction),b=hall.at(profile.toAxis,fraction);
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    // End at each existing portal's centre plane, overlapping its closed solid
    // rather than leaving a visual gap beneath the slab.
    const rib=new THREE.Mesh(new THREE.BoxGeometry(length,profile.depth,profile.width),material);
    rib.name='entry_hall_secondary_rib_'+(index+1);
    rib.position.set((a[0]+b[0])/2,top-profile.depth/2,(a[1]+b[1])/2);
    rib.rotation.y=-Math.atan2(dz,dx);rib.castShadow=true;rib.receiveShadow=true;
    rib.userData={fromAxis:profile.fromAxis,toAxis:profile.toAxis,fraction,top,bottom:top-profile.depth};
    group.add(rib);
  }
  return group;
}
