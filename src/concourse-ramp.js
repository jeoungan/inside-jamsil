import {entryHallGeometry} from './entry-hall.js';
import {CONCOURSE_HALL} from './concourse-hall.js';

// Door 37, the up-ramp beside Tong BBAB, and the landing's inclined concrete
// soffit are cross-checked in independent visits. The official C05 mezzanine
// location supports this limited connection; its coordinates/section are inferred.
export const CONCOURSE_RAMP={
  id:'ramp-c05',from:'2F',to:'2.5F',width:2.4,
  axes:[33.4,33.25,32,31.3,31.1],fraction:.18,
  cheekHeight:1.05,cheekThickness:.18,
  geometryEvidence:'partial-photo-video-cross-check',locationEvidence:'inferred',dimensionEvidence:'inferred',
  sources:['seoulguide-concourse','doaskoreans-concourse-2026','nangmanbuja-c05-2023','maxjacqui-hall-video','doosan-25f']
};
export function concourseRampPath(outer,inner,lowerY,upperY){
  const {at}=entryHallGeometry(outer,inner,CONCOURSE_HALL),points=CONCOURSE_RAMP.axes.map(a=>at(a,CONCOURSE_RAMP.fraction)),stations=[0];
  for(let i=1;i<points.length;i++)stations.push(stations.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
  const start=stations[1],end=stations.at(-2);
  return points.map(([x,z],i)=>[x,lowerY+(upperY-lowerY)*Math.max(0,Math.min(1,(stations[i]-start)/(end-start))),z]);
}
