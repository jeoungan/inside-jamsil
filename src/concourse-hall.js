import {entryHallGeometry} from './entry-hall.js';

// The door-37 photo and independent first-base concourse views show a high
// outer wall with a continuous horizontal opening below the roof. This partial
// three-axis fit preserves C05 and the inner mezzanine passage. A later
// cross-check adds an inferred C05 ramp landing at the south end of the void.
export const CONCOURSE_HALL={
  door:'door-37',floor:'2F',voidFloor:'2.5F',ceilingFloor:'3F',
  firstAxis:30.5,lastAxis:33.5,outerFraction:-.04,innerFraction:.36,
  voidFirstAxis:31.5,
  axisIds:['axis-31','axis-32','axis-33'],
  wallHeight:4.65,slotTop:5.35,wallThickness:.18,
  geometryEvidence:'partial-photo-video-cross-check',locationEvidence:'inferred',dimensionEvidence:'inferred'
};
export function concourseHallGeometry(outer,inner){
  const hall=entryHallGeometry(outer,inner,CONCOURSE_HALL);
  const opening=entryHallGeometry(outer,inner,{...CONCOURSE_HALL,firstAxis:CONCOURSE_HALL.voidFirstAxis,axisIds:CONCOURSE_HALL.axisIds.filter(id=>Number(id.slice(5))>CONCOURSE_HALL.voidFirstAxis)});
  return {...hall,wallRegion:hall.void,void:opening.void};
}
