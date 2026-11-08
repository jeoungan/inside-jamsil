import {rowV,rowY} from './seat-data.js';

// Two representative model bays, not a survey of all real navy entrances.
// Independent visitor views and the city renewal photo establish the solid
// cheeks/open mouth form. Locations, the ninth-row landing and dimensions fit
// the existing approximate bowl; no new seat address is certified here.
export const NAVY_ENTRIES = Object.freeze({
 sections:['310','322'],laneU:.075,landingRow:9,landingDepth:.045,stairStartV:.84,
 roofStartV:.51,wallStartV:.15,wallThickness:.16,roofThickness:.25,maxRiser:.18,
 geometryEvidence:'partial-photo-cross-check',locationEvidence:'inferred',dimensionEvidence:'inferred',
});
export const navyEntryFor=b=>b.tier===3&&NAVY_ENTRIES.sections.includes(b.id);
export function navyEntryProfile(b){
 const first=rowV(b,1),mouth=rowV(b,NAVY_ENTRIES.landingRow),landing=rowY(b,NAVY_ENTRIES.landingRow);
 return [[0,b.base],[first,b.base],[mouth,landing],[mouth+NAVY_ENTRIES.landingDepth,landing],[NAVY_ENTRIES.stairStartV,b.bridgeY],[1,b.bridgeY]];
}
export function navyTerraceY(b,v){
 return b.base+Math.max(0,Math.min(1,(v-rowV(b,1))/(rowV(b,b.rows)-rowV(b,1))))*(b.rows-1)*b.rise;
}
export function navyEntryY(b,v){
 const p=navyEntryProfile(b);v=Math.max(0,Math.min(1,v));
 for(let i=1;i<p.length;i++){
  const a=p[i-1],c=p[i];if(Math.abs(v-c[0])<1e-9)return c[1];if(v>=c[0])continue;
  const rise=c[1]-a[1];if(Math.abs(rise)<1e-9)return a[1];
  const n=Math.ceil(Math.abs(rise)/NAVY_ENTRIES.maxRiser),step=Math.max(0,Math.min(n-1,Math.floor((v-a[0])/(c[0]-a[0])*n+1e-9)));
  return a[1]+rise*(step+.5)/n;
 }
 return p.at(-1)[1];
}
