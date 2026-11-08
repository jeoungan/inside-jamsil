import * as THREE from 'three';
import {STRUCTURE_DETAILS} from './structure-evidence.js';

// A limited model fit of the hall visible beyond door 37. The photograph pair
// establishes connected haunched beams, not surveyed axes, spans or elevations.
export const CONCOURSE_FRAME = {
  floor:'2F',axisIds:['axis-31','axis-32','axis-33'],
  width:.84,beamDepth:.48,haunchDepth:.72,haunchReach:1.5,
  geometryEvidence:'photo-cross-check',locationEvidence:'inferred',dimensionEvidence:'inferred'
};

export function buildConcourseFrames({columns,supportHeight,material,profile:frame=CONCOURSE_FRAME,name='concourse_portal_frames',detail='concourse-column-haunch'}) {
  const group=new THREE.Group();group.name=name;
  group.userData={detail:STRUCTURE_DETAILS.find(d=>d.id===detail),profile:frame};
  for(const axis of frame.axisIds){
    const a=columns.find(c=>c.id===axis+'-2'),b=columns.find(c=>c.id===axis+'-1');
    if(!a||!b)continue; // Never invent a missing support across a stair opening.
    const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
    const top=Math.min(supportHeight([a.x,a.z]),supportHeight([b.x,b.z]))-.25;
    const {width,beamDepth,haunchDepth,haunchReach}=frame,cap=Math.max(a.depth,b.depth)/2;
    const profile=[[-cap,top],[length+cap,top],[length+cap,top-haunchDepth],
      [length-cap,top-haunchDepth],[length-haunchReach,top-beamDepth],
      [haunchReach,top-beamDepth],[cap,top-haunchDepth],[-cap,top-haunchDepth]];
    const shape=new THREE.Shape(profile.map(([x,y])=>new THREE.Vector2(x,y)));
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:false,curveSegments:1});
    geometry.translate(0,0,-width/2);
    const beam=new THREE.Mesh(geometry,material);beam.name=axis+'_haunched_portal';
    beam.position.set(a.x,0,a.z);beam.rotation.y=-Math.atan2(dz,dx);
    beam.castShadow=true;beam.receiveShadow=true;
    beam.userData={supports:[a.id,b.id],span:length,top,minimumClearance:top-haunchDepth};
    group.add(beam);
  }
  return group;
}
