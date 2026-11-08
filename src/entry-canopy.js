import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import polygonClipping from 'polygon-clipping';
import {containsPoint,ribbonHeight} from './spatial.js';
import {STRUCTURE_DETAILS} from './structure-evidence.js';

// A limited reconstruction of the fixed GATE 2-1 entrance, not a surveyed
// canopy footprint. Fit to the existing inferred ramp, never expand public
// walking space or let the canopy pass through an upper building slab.
export const ENTRY_CANOPY={
  gate:'gate-21',connector:'ramp-21',length:12,width:6.4,
  edgeY:7.6,rise:.75,panelThickness:.035,wallHeight:1.05,wallThickness:.28,
  supportStations:[-10.8,-7.2],pairedPostSpacing:.36,
  geometryEvidence:'photo-cross-check',locationEvidence:'inferred',dimensionEvidence:'inferred'
};

export function entryCanopyFrame(connector){
  const a=connector.path.at(-2),b=connector.path.at(-1),length=Math.hypot(b[0]-a[0],b[2]-a[2]);
  const d=[(b[0]-a[0])/length,(b[2]-a[2])/length],n=[-d[1],d[0]];
  const at=(s,u)=>[b[0]+d[0]*s+n[0]*u,b[2]+d[1]*s+n[1]*u];
  const local=p=>[(p[0]-b[0])*d[0]+(p[1]-b[2])*d[1],(p[0]-b[0])*n[0]+(p[1]-b[2])*n[1]];
  const floor=(s,u)=>{const p=at(s,Math.max(-1.99,Math.min(1.99,u)));return ribbonHeight(...p,connector)??b[1]+s*(b[1]-a[1])/length;};
  return {at,local,floor,d,n};
}

export function buildEntryCanopy({connector,footprint,materials,colliders}){
  const cfg=ENTRY_CANOPY,frame=entryCanopyFrame(connector),{at,local,floor}=frame;
  const group=new THREE.Group();group.name='gate_21_curved_canopy';
  group.userData={profile:cfg,detail:STRUCTURE_DETAILS.find(d=>d.id==='gate-21-curved-canopy')};
  const metal=materials.dark.clone();metal.metalness=.55;metal.roughness=.4;
  const panel=new THREE.MeshStandardMaterial({color:0xd7d9d7,roughness:.5,transparent:true,opacity:.58,side:THREE.DoubleSide,depthWrite:false});
  const roofY=u=>cfg.edgeY+cfg.rise*(1-(u/(cfg.width/2))**2);
  function mesh(geometry,material,name){const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
  function rod(a,b,radius=.045,name='canopy_metal_member'){
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
    if(delta.length()<1e-6)return;
    const m=mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),8),metal,name);
    m.position.copy(from.add(to).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  }
  function prism(ring,top,bottom,material,name,sideFace=()=>true){
    if(ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1])ring=ring.slice(0,-1);
    const points=ring.map(p=>new THREE.Vector2(...p)),tris=THREE.ShapeUtils.triangulateShape(points,[]),vertices=[];
    const face=(ids,height)=>ids.forEach(i=>vertices.push(ring[i][0],height(ring[i]),ring[i][1]));
    for(const t of tris){face(t,top);face([...t].reverse(),bottom);}
    for(let i=0;i<ring.length;i++){const j=(i+1)%ring.length,a=[...ring[i]],b=[...ring[j]];if(!sideFace(a,b))continue;const u=[a[0],top(a),a[1]],v=[b[0],top(b),b[1]],w=[b[0],bottom(b),b[1]],q=[a[0],bottom(a),a[1]];vertices.push(...u,...v,...w,...u,...w,...q);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
    return mesh(geo,material,name);
  }
  // Exact 2D segment/facade intersections prevent ribs from penetrating the
  // building. The curved roof surface is separately boolean-clipped below.
  function exteriorRod(a,b,radius,name){
    const da=[b[0]-a[0],b[2]-a[2]],cross=(v,w)=>v[0]*w[1]-v[1]*w[0],cuts=[0,1];
    for(let i=0;i<footprint.length;i++){
      const p=footprint[i],q=footprint[(i+1)%footprint.length],e=[q[0]-p[0],q[1]-p[1]],den=cross(da,e);
      if(Math.abs(den)<1e-10)continue;
      const v=[p[0]-a[0],p[1]-a[2]],t=cross(v,e)/den,u=cross(v,da)/den;
      if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);
    }
    cuts.sort((x,y)=>x-y);const point=t=>a.map((v,k)=>v+(b[k]-v)*t);
    for(let i=1;i<cuts.length;i++){const p=point((cuts[i-1]+cuts[i])/2);if(!containsPoint([p[0],p[2]],footprint))rod(point(cuts[i-1]),point(cuts[i]),radius,name);}
  }
  const roofPoint=(s,u)=>{const p=at(s,u);return [p[0],roofY(u)-.075,p[1]];};
  const strips=32;
  for(let i=0;i<strips;i++){
    const u=-cfg.width/2+cfg.width*i/strips,v=u+cfg.width/strips;
    const clipped=polygonClipping.difference([[at(-cfg.length,u),at(1,u),at(1,v),at(-cfg.length,v)]],[footprint]);
    for(const [ring]of clipped){
      const y=p=>{const t=(local(p)[1]-u)/(v-u);return roofY(u)+(roofY(v)-roofY(u))*t;};
      prism(ring,y,p=>y(p)-cfg.panelThickness,panel,'curved_translucent_panel',(a,b)=>{
        const u=local(a)[1],v=local(b)[1];return Math.abs(u-v)>1e-7||Math.abs(Math.abs(u)-cfg.width/2)<1e-7;
      });
      // The rear edge follows the existing facade instead of overlapping it.
      for(let k=1;k<ring.length;k++){const p=ring[k-1],q=ring[k],l=local(p),m=local(q);if(l[0]>-cfg.length+.01&&m[0]>-cfg.length+.01&&Math.abs(l[1]-m[1])>.01)rod([p[0],y(p)-.075,p[1]],[q[0],y(q)-.075,q[1]],.045,'canopy_facade_edge');}
    }
  }
  for(let s=-cfg.length;s<=0;s+=2)for(let i=0;i<strips;i++)exteriorRod(roofPoint(s,-cfg.width/2+cfg.width*i/strips),roofPoint(s,-cfg.width/2+cfg.width*(i+1)/strips),.045,'curved_roof_rib');
  for(let i=0;i<=6;i++){const u=-cfg.width/2+cfg.width*i/6;exteriorRod(roofPoint(-cfg.length,u),roofPoint(1,u),.035,'canopy_longitudinal_member');}
  const edge=connector.width/2,wallCentre=edge+cfg.wallThickness/2;
  // The terminal cheeks meet the upper landing. The same solid must also
  // block someone approaching it from the 2F concourse, not just a ramp user.
  const collider=c=>{colliders.push(c,{...c,floor:'2F',height:c.height-connector.path.at(-1)[1]});};
  for(const side of [-1,1]){
    const ring=[at(-cfg.length,side*edge),at(0,side*edge),at(0,side*(edge+cfg.wallThickness)),at(-cfg.length,side*(edge+cfg.wallThickness))];
    const base=p=>{const [s,u]=local(p);return floor(s,u);};
    prism(ring,p=>base(p)+cfg.wallHeight,p=>base(p)-.18,materials.surface,'ramp_concrete_cheek');
    const cap=[at(-cfg.length,side*(edge-.05)),at(0,side*(edge-.05)),at(0,side*(edge+cfg.wallThickness+.05)),at(-cfg.length,side*(edge+cfg.wallThickness+.05))];
    prism(cap,p=>base(p)+cfg.wallHeight+.06,p=>base(p)+cfg.wallHeight-.04,materials.surface,'ramp_wall_cap');
    for(let s=-cfg.length;s<0;s+=.5){
      const p=at(s+.25,side*wallCentre),lo=Math.min(floor(s,side*edge),floor(s+.5,side*edge)),hi=Math.max(floor(s,side*edge),floor(s+.5,side*edge));
      collider({floor:'1F',x:p[0],z:p[1],width:.5,depth:cfg.wallThickness+.1,yaw:-Math.atan2(frame.d[1],frame.d[0]),baseY:lo-.18,height:hi+cfg.wallHeight+.06,type:'entry-ramp-wall'});
    }
    for(const station of cfg.supportStations)for(const offset of [-cfg.pairedPostSpacing/2,cfg.pairedPostSpacing/2]){
      const s=station+offset,u=side*wallCentre,p=at(s,u),bottom=floor(s,u)+cfg.wallHeight,top=roofY(u)-.075;
      rod([p[0],bottom,p[1]],[p[0],top,p[1]],.055,'paired_canopy_post');
      const q=roofPoint(s,side*1.1);rod([p[0],floor(s,u)+2.05,p[1]],q,.035,'canopy_inclined_brace');
      collider({floor:'1F',x:p[0],z:p[1],width:.11,depth:.11,yaw:0,baseY:bottom,height:top,type:'canopy-post'});
    }
    for(const s of cfg.supportStations){const a=at(s-cfg.pairedPostSpacing/2,side*wallCentre),b=at(s+cfg.pairedPostSpacing/2,side*wallCentre);for(const h of [1.7,2.2])rod([a[0],floor(s,side*wallCentre)+h,a[1]],[b[0],floor(s,side*wallCentre)+h,b[1]],.025,'paired_post_tie');}
  }
  // Keep semantic names for audits while avoiding hundreds of draw calls for
  // the short pieces that approximate a curved rib.
  const batches=new Map();for(const child of group.children){const key=child.name+':'+child.material.uuid;const batch=batches.get(key)||[];batch.push(child);batches.set(key,batch);}
  for(const children of batches.values())if(children.length>1){
    const pieces=children.map(child=>{child.updateMatrix();return (child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone()).applyMatrix4(child.matrix);}),geometry=mergeGeometries(pieces);for(const piece of pieces)piece.dispose();
    const first=children[0];for(const child of children){group.remove(child);child.geometry.dispose();}mesh(geometry,first.material,first.name);
  }
  return group;
}
