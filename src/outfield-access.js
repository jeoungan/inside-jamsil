// The two photographed entry bays share access to neighbouring sections. Exact
// radii, elevations and stair dimensions remain fits to the existing model.
// Other real entry bays are not located well enough to invent their positions.
export const outfieldPoint=(angle,r,y)=>[Math.sin(angle)*r,y,-49-Math.cos(angle)*r];
// Fixed forms are photo-compared; all dimensions are model fits, not surveys.
export const OUTFIELD_REAR={y:10,inner:102.7,outer:108.2,routeRadius:106.6,limit:1.32,screenHalfAngle:.16,screenWallRadius:104.9};
export const outfieldRearOpen=b=>b.tier===4&&Math.abs(b.angle)>.24;
export function outfieldRearSurface(x,z){
 const angle=Math.atan2(x,-(z+49)),r=Math.hypot(x,z+49),g=OUTFIELD_REAR;
 return Math.abs(angle)<g.limit-.004&&r>=103.32&&r<=g.outer-.42&&(Math.abs(angle)>g.screenHalfAngle+.008||r>g.screenWallRadius+.52);
}
export const OUTFIELD_ACCESSES=[
 {id:'outfield-east',anchor:'406',sections:Array.from({length:11},(_,i)=>String(401+i)),angle:.7054,source:'rc-outfield-2025'},
 {id:'outfield-west',anchor:'414',sections:Array.from({length:11},(_,i)=>String(412+i)),angle:-.2546,source:'grg-outfield-2024'},
].map(a=>({...a,width:2.4,height:4,geometryEvidence:'photo-cross-check',dimensionEvidence:'inferred',locationEvidence:'inferred',coverage:'partial-photo-inspected-bays',path:[[103.5,0],[94.5,0],[89.6,2],[88.4,2],[83.5,4],[81.7,4]].map(([r,y])=>outfieldPoint(a.angle,r,y))}));
export const outfieldAccessFor=id=>OUTFIELD_ACCESSES.find(a=>a.sections.includes(String(id)));
export function outfieldBridge(b,end){
 const access=outfieldAccessFor(b.id),angle=Math.atan2(end[0],-(end[2]+49)),n=Math.max(1,Math.ceil(Math.abs(angle-access.angle)*81.7/1.2));
 return [...access.path,...Array.from({length:n},(_,i)=>outfieldPoint(access.angle+(angle-access.angle)*(i+1)/n,81.7,4)),end];
}
export function outfieldVoid(a){
 const p=outfieldPoint(a.angle,94.8,0),q=outfieldPoint(a.angle,82.7,0),nx=Math.cos(a.angle)*1.5,nz=Math.sin(a.angle)*1.5;
 return [[p[0]+nx,p[2]+nz],[q[0]+nx,q[2]+nz],[q[0]-nx,q[2]-nz],[p[0]-nx,p[2]-nz]];
}
