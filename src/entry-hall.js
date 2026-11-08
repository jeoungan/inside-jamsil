import {resample} from './spatial.js';

// Independent 2023/2024/2025 visits show this tall hall and exposed beams.
// Its exact plan, mezzanine boundary and elevations have not been surveyed.
// This limited fit leaves an inner mezzanine passage and adds no new connector.
export const ENTRY_HALL={
  gate:'gate-21',floor:'2F',voidFloor:'2.5F',ceilingFloor:'3F',
  firstAxis:3.5,lastAxis:5.5,outerFraction:-.04,innerFraction:.5,
  axisIds:['axis-4','axis-5'],width:.84,beamDepth:.48,haunchDepth:.72,haunchReach:1.5,
  ribs:{fromAxis:4,toAxis:5,fractions:[.2,.4,.6],width:.22,depth:.28},
  geometryEvidence:'partial-photo-cross-check',locationEvidence:'inferred',dimensionEvidence:'inferred'
};

export function entryHallGeometry(outer,inner,profile=ENTRY_HALL){
  const axes=resample(inner,outer.length);
  const at=(axis,t)=>{
    const station=axis-1,i=Math.floor(station),u=station-i;
    const mix=points=>points[i].map((v,k)=>v+(points[i+1][k]-v)*u);
    const a=mix(outer),b=mix(axes);return a.map((v,k)=>v+(b[k]-v)*t);
  };
  const stations=[profile.firstAxis,...profile.axisIds.map(id=>Number(id.slice(5))),profile.lastAxis];
  const outside=stations.map(s=>at(s,profile.outerFraction)),inside=stations.map(s=>at(s,profile.innerFraction));
  return {at,void:[...outside,...inside.toReversed()]};
}
