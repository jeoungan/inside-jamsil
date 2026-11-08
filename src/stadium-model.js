import * as THREE from 'three';
import polygonClipping from 'polygon-clipping';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {OUTER,INNER,FIELD,FEATURES,FLOORS,META,CONNECTORS,COLUMNS,FLOOR_POLYGON,FLOOR_POLYGONS,FLOOR_INNERS,FLOOR_VOIDS,floorContains,CENTERLINE,EXTERIOR_RADIUS} from './data.js';
import {resample,containsPoint,insideRect,ribbonEdges} from './spatial.js';
import {projectConnector,corridorOutline,onFloor,colliderOccupiesHeight} from './navigation.js';
import {RESTRICTED_ZONES} from './access-geometry.js';
import {SEAT_BLOCKS,blockUV} from './seat-data.js';
import {bridgeProjection,accessLaneY,seatApproachBarriers} from './seating-navigation.js';
import {buildSeating} from './seating-model.js';
import {buildCanopyFrame} from './canopy-frame.js';
import {CANOPY_FRAME,CANOPY_SECTIONS,hasDetailedCanopy} from './canopy-profile.js';
import {STRUCTURE_DETAILS} from './structure-evidence.js';
import {buildConcourseFrames} from './concourse-frame.js';
import {ENTRY_CANOPY,entryCanopyFrame,buildEntryCanopy} from './entry-canopy.js';
import {ENTRY_HALL} from './entry-hall.js';
import {CONCOURSE_HALL,concourseHallGeometry} from './concourse-hall.js';
import {buildEntryHallRibs} from './entry-hall-model.js';
import {CONCOURSE_RAMP} from './concourse-ramp.js';
import {ENTRY_DOOR_FRAME,buildEntryDoorFrame} from './entry-door-frame.js';
import {facilityIconKey,drawFacilityIcon} from './facility-icons.js';
export {resample,containsPoint,FLOOR_POLYGON,CENTERLINE};
export function canWalk(x,z,colliders,floor='2F'){const y=FLOORS.find(f=>f.id===floor).y;return onFloor(x,z,floor)&&!colliders.some(c=>(!c.floor||c.floor===floor)&&colliderOccupiesHeight(c,y)&&insideRect(x,z,c,.32));}
export function buildStadium({labels=true}={}){
  const root=new THREE.Group();root.name='Jamsil_graybox';root.userData={...META,structureDetails:STRUCTURE_DETAILS};
  const layers=new Map(),featureObjects=new Map(),pickables=[],colliders=[],openings=new Map();let columnCount=0;
  const concourseHall=concourseHallGeometry(OUTER,INNER),inConcourseHall=p=>containsPoint(p,concourseHall.wallRegion);
  const mat={};for(const [name,color]of Object.entries({slab:0xccccca,wall:0xeeeeec,column:0xbebfbd,room:0xdfdfdc,dark:0x646862,seat:0xc7c9c4,field:0xe3e4df,line:0xb1b5ad}))mat[name]=new THREE.MeshStandardMaterial({color,roughness:.9});
  mat.surface=mat.slab.clone();mat.surface.side=THREE.DoubleSide;
  const boxGeo=new THREE.BoxGeometry(1,1,1);
  function mesh(geo,material,parent,name){const m=new THREE.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;m.name=name||'';parent.add(m);return m;}
  function box(parent,w,h,d,x,y,z,material=mat.wall,name){const m=mesh(boxGeo,material,parent,name);m.scale.set(w,h,d);m.position.set(x,y,z);return m;}
  function poly(points,thickness,y,parent,material,name,holes=[]){
    const polygons=holes.length?polygonClipping.difference([points],...holes.map(h=>[h])):[[points]];
    const shapes=polygons.map(rings=>{const shape=new THREE.Shape(rings[0].map(([x,z])=>new THREE.Vector2(x,-z)));shape.holes=rings.slice(1).map(r=>new THREE.Path(r.map(([x,z])=>new THREE.Vector2(x,-z))));return shape;});
    const geo=new THREE.ExtrudeGeometry(shapes,{depth:thickness,bevelEnabled:false,curveSegments:1});geo.rotateX(-Math.PI/2);const m=mesh(geo,material,parent,name);m.position.y=y;return m;
  }
  function beam(parent,a,b,y,w,h,material=mat.wall){const m=box(parent,Math.hypot(b[0]-a[0],b[1]-a[1]),h,w,(a[0]+b[0])/2,y,(a[1]+b[1])/2,material);m.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);return m;}
  function rail(parent,a,b){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);const m=mesh(new THREE.CylinderGeometry(.055,.055,delta.length(),6),mat.dark,parent);m.position.copy(from.add(to).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());}
  function prism(parent,corners,thickness,name){
    const top=corners.map(p=>[...p]),bottom=corners.map(p=>[p[0],p[1]-thickness,p[2]]),positions=[];
    const tri=(a,b,c)=>positions.push(...a,...b,...c);
    tri(top[0],top[2],top[1]);tri(top[0],top[3],top[2]);tri(bottom[0],bottom[1],bottom[2]);tri(bottom[0],bottom[2],bottom[3]);
    for(let i=0;i<4;i++){const j=(i+1)%4;tri(top[i],top[j],bottom[j]);tri(top[i],bottom[j],bottom[i]);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();return mesh(geo,mat.surface,parent,name);
  }
  function barrier(parent,a,b,floor,h=1.1,kind='balustrade'){
    const m=beam(parent,a,b,h/2,.18,h),co={floor:floor.id,x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,width:m.scale.x,depth:.18,yaw:m.rotation.y,type:kind,height:h};colliders.push(co);return co;
  }
  function clippedBarrier(parent,a,b,floor,h,allowed,kind){
    const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.3)),result=[];let start=null;
    const pt=t=>a.map((v,k)=>v+(b[k]-v)*t);
    for(let j=0;j<=n;j++){const keep=j<n&&allowed(pt((j+.5)/n));if(keep&&start===null)start=j/n;if(!keep&&start!==null){result.push(barrier(parent,pt(start),pt(j/n),floor,h,kind));start=null;}}
    return result;
  }
  function sign(parent,text,x,y,z,rot=0,w=4,height=w/4,pictogram=null){
    if(!labels)return;
    const cv=document.createElement('canvas');cv.width=512;cv.height=Math.round(512*height/w);
    const ctx=cv.getContext('2d');ctx.fillStyle='#424640';ctx.fillRect(0,0,cv.width,cv.height);ctx.fillStyle='#fafaf7';
    ctx.font=`600 ${cv.height*.375}px Arial,sans-serif`;ctx.textBaseline='middle';
    if(pictogram){
      const size=cv.height*.62,gap=cv.height*.15,textWidth=Math.min(ctx.measureText(text).width,485-size-gap),left=(512-size-gap-textWidth)/2;
      drawFacilityIcon(ctx,pictogram,left,(cv.height-size)/2,size);
      ctx.textAlign='left';ctx.fillText(text,left+size+gap,cv.height*66/128,textWidth);
    }else{ctx.textAlign='center';ctx.fillText(text,256,cv.height*66/128,485);}
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.userData={signText:text,facilityIcon:pictogram};
    const material=new THREE.MeshBasicMaterial({map:tex});
    for(const side of [0,1]){const angle=rot+side*Math.PI,m=mesh(new THREE.PlaneGeometry(w,height),material,parent,'sign_'+text);m.position.set(x+Math.sin(angle)*.008,y,z+Math.cos(angle)*.008);m.rotation.y=angle;}
  }
  const nearConnector=(x,z,floor,margin=0)=>CONNECTORS.some(c=>(FLOORS.find(f=>f.id===floor).y>=c.path[0][1]&&FLOORS.find(f=>f.id===floor).y<=c.path.at(-1)[1])&&projectConnector(x,z,c).distance<c.width/2+margin);
  const nearLink=(p,c,f)=>f.y>=c.path[0][1]&&f.y<=c.path.at(-1)[1]&&projectConnector(...p,c).distance<c.width/2+.45;
  const nearSeatOpening=(p,floor)=>SEAT_BLOCKS.some(b=>{if(b.floor!==floor.id)return false;const q=bridgeProjection(b,...p),uv=blockUV(b,...p);return (q.raw>=-.05&&q.raw<=1.25&&q.distance<1.3)||(uv.u>=-.06&&uv.u<.20&&uv.v>=0&&uv.v<=1.05&&Math.abs(accessLaneY(b,uv.v)-floor.y)<.4);});
  function wallCollider(g,f,x,z,w,d,type='wall'){const co=Math.cos(g.rotation.y),si=Math.sin(g.rotation.y);colliders.push({floor:f.floor,x:g.position.x+co*x+si*z,z:g.position.z-si*x+co*z,width:w,depth:d,yaw:g.rotation.y,type});}
  for(const floor of FLOORS){
    const group=new THREE.Group();group.name=floor.id;group.position.y=floor.y;root.add(group);const categories={};for(const name of ['slabs','walls','columns','rooms','stairs','doors','roof']){categories[name]=new THREE.Group();categories[name].name=floor.id+'_'+name;group.add(categories[name]);}
    // A genuine opening, also cut in the corresponding lower ceiling. Boolean
    // clipping handles ramps that meet or cross the building perimeter.
    const footprint=FLOOR_POLYGONS[floor.id],boundaryInner=FLOOR_INNERS[floor.id];
    // The 2F hall has both mezzanine-covered and double-height bays. Support
    // the next actual floor footprint rather than ending every post at 2.5F.
    const supportHeight=p=>floor.id==='2F'?(FLOORS.find(f=>f.y>floor.y&&floorContains(p,f.id))?.y-floor.y||floor.height):floor.height;
    const incoming=CONNECTORS.filter(c=>c.path[0][1]<floor.y&&c.path.at(-1)[1]>=floor.y),outgoing=CONNECTORS.filter(c=>c.path[0][1]<=floor.y+floor.height&&c.path.at(-1)[1]>floor.y);
    const cuts=[...FLOOR_VOIDS[floor.id],...incoming.map(c=>corridorOutline(c,c.width+.5,.05))];openings.set(floor.id,cuts);
    const floorMesh=poly(footprint,.35,-.35,categories.slabs,mat.slab,floor.id+'_floor',cuts);
    const ceilingCuts=[...(floor.id==='2F'?FLOOR_VOIDS['2.5F']:[]),...outgoing.map(c=>corridorOutline(c,c.width+1,.3))];
    // A mezzanine soffit exists only below that mezzanine's slab. Keeping the
    // original full 2F ceiling created a floating low roof over the inner hall.
    const ceilingFootprint=floor.id==='2F'?FLOOR_POLYGONS['2.5F']:footprint;
    if(!floor.openAir){const ceiling=poly(ceilingFootprint,.25,floor.height-.25,categories.roof,mat.slab,floor.id+'_ceiling',ceilingCuts);if(floor.id==='2F')ceiling.userData={detail:STRUCTURE_DETAILS.find(d=>d.id==='mezzanine-soffit-footprint')};}
    if(floor.id==='1F'){
      // External circulation follows the perimeter; it is intentionally schematic.
      const outer=Array.from({length:121},(_,i)=>{const a=-Math.PI+i/120*Math.PI*2;return [Math.sin(a)*EXTERIOR_RADIUS,Math.cos(a)*EXTERIOR_RADIUS-49];});
      const inner=Array.from({length:121},(_,i)=>{const a=-Math.PI+i/120*Math.PI*2;return [Math.sin(a)*104,Math.cos(a)*104-49];});
      poly([...outer,...inner.reverse()],.18,-.18,categories.slabs,mat.slab,'external_concourse');
      const outfieldOuter=[],outfieldInner=[];for(let i=0;i<=60;i++){const a=-1.32+i/60*2.64;outfieldOuter.push([Math.sin(a)*105,-49-Math.cos(a)*105]);outfieldInner.push([Math.sin(a)*92,-49-Math.cos(a)*92]);}
      poly([...outfieldOuter,...outfieldInner.reverse()],.18,-.18,categories.slabs,mat.slab,'outfield_ground_concourse');
    }
    const clerestory=new THREE.Group();clerestory.name='door_37_clerestory_hall';
    if(floor.id===CONCOURSE_HALL.floor){clerestory.userData={profile:CONCOURSE_HALL,detail:STRUCTURE_DETAILS.find(d=>d.id==='door-37-clerestory-hall')};categories.walls.add(clerestory);}
    // Cut only real doorway/connector apertures, not whole nearby wall spans.
    for(const [bi,boundary]of [OUTER,boundaryInner,[OUTER[0],boundaryInner[0]],[OUTER.at(-1),boundaryInner.at(-1)]].entries())for(let i=1;i<boundary.length;i++){
      const h=bi===0&&['1F','2F'].includes(floor.id)?Math.min(2.5,floor.height-.4):1.1;
      const allowed=p=>!FLOOR_VOIDS[floor.id].some(hole=>containsPoint(p,hole))&&!nearConnector(...p,floor.id,.5)&&!nearSeatOpening(p,floor)&&!FEATURES.some(f=>f.floor===floor.id&&['gate','door'].includes(f.type)&&Math.hypot(f.x-p[0],f.z-p[1])<(f.type==='gate'?3.5:2.2));
      if(floor.id===CONCOURSE_HALL.floor&&bi===0){
        clippedBarrier(categories.walls,boundary[i-1],boundary[i],floor,h,p=>allowed(p)&&!inConcourseHall(p),h>1.2?'enclosure':'balustrade');
        const pieces=clippedBarrier(clerestory,boundary[i-1],boundary[i],floor,CONCOURSE_HALL.wallHeight,p=>allowed(p)&&inConcourseHall(p),'clerestory-wall');
        const top=FLOORS.find(f=>f.id===CONCOURSE_HALL.ceilingFloor).y-floor.y-.25,headerHeight=top-CONCOURSE_HALL.slotTop;
        for(const c of pieces){
          const dx=Math.cos(c.yaw)*c.width/2,dz=-Math.sin(c.yaw)*c.width/2;
          const header=beam(clerestory,[c.x-dx,c.z-dz],[c.x+dx,c.z+dz],top-headerHeight/2,CONCOURSE_HALL.wallThickness,headerHeight,mat.wall);
          header.name='clerestory_header';
          colliders.push({...c,type:'clerestory-header',baseY:floor.y+CONCOURSE_HALL.slotTop,height:top});
        }
      }else clippedBarrier(categories.walls,boundary[i-1],boundary[i],floor,h,allowed,h>1.2?'enclosure':'balustrade');
    }
    // Guard only the retained slab edges: the void extends beyond the facade,
    // so no upper wall or balustrade should float across the open entrance.
    for(const hole of FLOOR_VOIDS[floor.id])for(let i=0;i<hole.length;i++)
      clippedBarrier(categories.walls,hole[i],hole[(i+1)%hole.length],floor,1.1,p=>containsPoint(p,footprint)&&!CONNECTORS.some(c=>nearLink(p,c,floor)), 'hall-void-guard');
    // Guard the sides of floor openings, including stairs passing a mezzanine.
    for(const c of incoming){const edges=ribbonEdges(c.path,c.width+.65);
      for(const side of [0,1])for(let i=1;i<edges.length;i++){
        const a=edges[i-1][side],b=edges[i][side];
        clippedBarrier(categories.walls,[a[0],a[2]],[b[0],b[2]],floor,1.1,p=>floorContains(p,floor.id)&&!CONNECTORS.some(other=>other!==c&&nearLink(p,other,floor)), 'balustrade');
      }
    }
    const columns=COLUMNS.filter(c=>!floor.openAir&&floorContains([c.x,c.z],floor.id)&&!nearConnector(c.x,c.z,floor.id,1.3)&&!(c.evidence==='inferred'&&FEATURES.some(f=>{if(f.floor!==floor.id||f.type!=='restroom')return false;const yaw=Math.atan2(f.x,f.z+49),d=(f.depth||4.6)/2;return Math.hypot(c.x-f.x-Math.sin(yaw)*d,c.z-f.z-Math.cos(yaw)*d)<2;})));
    const instances=new THREE.InstancedMesh(boxGeo,mat.column,columns.length);instances.name=floor.id+'_drawing_axis_columns';instances.castShadow=true;instances.receiveShadow=true;
    const temp=new THREE.Object3D();columns.forEach((c,i)=>{const h=supportHeight([c.x,c.z])-.34;temp.position.set(c.x,h/2,c.z);temp.scale.set(c.width,h,c.depth);temp.rotation.y=c.yaw;temp.updateMatrix();instances.setMatrixAt(i,temp.matrix);colliders.push({...c,floor:floor.id,type:'column',height:h});});categories.columns.add(instances);columnCount+=columns.length;
    const axisIn=resample(boundaryInner,OUTER.length);
    if(floor.id===CONCOURSE_HALL.floor)categories.roof.add(buildConcourseFrames({columns,supportHeight:()=>FLOORS.find(f=>f.id===CONCOURSE_HALL.ceilingFloor).y-floor.y,material:mat.column}));
    if(floor.id===ENTRY_HALL.floor){
      const ceilingHeight=FLOORS.find(f=>f.id===ENTRY_HALL.ceilingFloor).y-floor.y;
      categories.roof.add(buildConcourseFrames({columns,supportHeight:()=>ceilingHeight,material:mat.column,profile:ENTRY_HALL,name:'gate_21_high_hall_frames',detail:'gate-21-high-hall'}));
      categories.roof.add(buildEntryHallRibs({outer:OUTER,inner:INNER,ceilingHeight,material:mat.column}));
    }
    for(let i=0;!floor.openAir&&i<OUTER.length;i++){
      const hallFrame=[...ENTRY_HALL.axisIds,...CONCOURSE_HALL.axisIds].includes('axis-'+(i+1));
      if(floor.id===ENTRY_HALL.voidFloor&&hallFrame)continue;
      // Split beams where stair voids cross them: no invisible head obstacles.
      const sample=resample([axisIn[i],OUTER[i]],16);for(let j=1;j<sample.length;j++){const a=sample[j-1],b=sample[j],p=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(!nearConnector(...p,floor.id,1.5)&&!(floor.id===ENTRY_HALL.floor&&hallFrame&&FLOOR_VOIDS[ENTRY_HALL.voidFloor].some(h=>containsPoint(p,h))))beam(categories.roof,a,b,supportHeight(p)-.45,.55,.4,mat.column);}
    }
    for(const f of FEATURES.filter(f=>f.floor===floor.id&&!['stair','ramp'].includes(f.type))){
      const g=new THREE.Group();g.name=f.id;g.position.set(f.x,0,f.z);g.rotation.y=f.doorYaw??Math.atan2(f.x,f.z+49);g.userData={featureId:f.id,evidence:f.evidence,source:f.source};categories[['gate','door','elevator'].includes(f.type)?'doors':'rooms'].add(g);featureObjects.set(f.id,g);
      if(f.id===ENTRY_DOOR_FRAME.gate){
        // Fit this single reconstructed bay beside the existing stair width,
        // keeping the guide's feature anchor and all stair/facility data fixed.
        const {portalOffsetX:x,portalOffsetZ:z}=ENTRY_DOOR_FRAME,co=Math.cos(g.rotation.y),si=Math.sin(g.rotation.y);
        g.position.x+=co*x+si*z;g.position.z+=-si*x+co*z;
        g.userData.portalOffset=[x,z];g.userData.registration='inferred-clearance-fit';
      }
      if(!containsPoint([f.x,f.z],footprint))box(g,9,.2,8,0,-.1,0,mat.slab,'entry_platform');
      if(f.type==='restroom'||f.type==='shop'||f.type==='service'){
        const w=f.width||(f.type==='restroom'?6.2:4.2),d=f.depth||(f.type==='restroom'?4.6:3.4),h=Math.min(3.05,floor.height-.5);
        box(g,w,.08,d,0,.04,0,mat.room);
        for(const [x,z,ww,dd]of [[0,-d/2,w,.22],[-w/2,0,.22,d],[w/2,0,.22,d],[-(w+2)/4,d/2,(w-2)/2,.22],[(w+2)/4,d/2,(w-2)/2,.22]]){box(g,ww,h,dd,x,h/2,z,mat.room);wallCollider(g,f,x,z,ww,dd);}
        if(f.type==='shop'||['발권','안내'].includes(f.amenity?.category)){box(g,2,1.1,.28,0,.55,d/2,mat.room,'staff_counter');wallCollider(g,f,0,d/2,2,.28,'counter');sign(g,'직원 전용',0,.8,d/2+.16,0,1.3);}
        box(g,2,.45,.22,0,h-.225,d/2,mat.room);sign(g,f.type==='restroom'?'화장실':f.amenity?f.amenity.code+' '+f.amenity.name:f.name.split(' ')[0],0,f.navigationLabel?.y??h-.4,d/2+.14,0,f.navigationLabel?.width??(f.amenity?3.8:2),f.navigationLabel?.height,facilityIconKey(f));
        if(f.type==='restroom'){
          for(const x of [-w/2+1.3,w/2-1.3]){box(g,.12,1.8,1.8,x,.9,-d/2+.9);wallCollider(g,f,x,-d/2+.9,.12,1.8,'partition');box(g,.55,.55,.75,x+.4,.3,-d/2+.65,mat.wall);}
          // Low threshold and handrail proportions are based on the field photos.
          box(g,1.9,.025,.4,0,.02,d/2+.18,mat.dark);rail(g,[-w/2+.3,.85,-1],[-w/2+.3,.85,1]);
        }
      }else if(f.type==='elevator'){
        box(g,3,4.15,3,0,2.075,0,mat.room);box(g,1.8,2.4,.08,0,1.2,1.54,mat.dark);sign(g,'엘리베이터',0,3,1.56,0,2.2,undefined,facilityIconKey(f));wallCollider(g,f,0,0,3,3,'elevator');
      }else{
        const entrance=f.id===ENTRY_CANOPY.gate,framed=f.id===ENTRY_DOOR_FRAME.gate;
        const w=framed?ENTRY_DOOR_FRAME.width+.5:f.type==='gate'?6:3.4,h=Math.min(3.4,floor.height-.45),depth=framed?ENTRY_DOOR_FRAME.concreteDepth:.45;
        for(const side of [-1,1]){box(g,.4,h,depth,side*w/2,h/2,0);wallCollider(g,f,side*w/2,0,.4,depth,'door-post');}box(g,w+.4,.3,depth,0,h,0);
        if(framed)g.add(buildEntryDoorFrame({feature:{...f,x:g.position.x,z:g.position.z},yaw:g.rotation.y,baseY:floor.y,materials:mat,colliders}));
        sign(g,f.id==='door-37'?'37':f.type==='gate'?f.name.replace('GATE ','G '):f.id.replace('section-',''),0,framed?ENTRY_DOOR_FRAME.sign.y:entrance?h-.12:h-.35,framed?depth/2+.02:.3,0,framed?ENTRY_DOOR_FRAME.sign.width:entrance?2.2:w*.8,framed?ENTRY_DOOR_FRAME.sign.height:entrance?.42:undefined);
      }
    }
    layers.set(floor.id,{group,categories,baseY:floor.y,floorMesh});
  }
  for(const c of CONNECTORS){
    for(const [floorId,p,q]of [[c.from,c.path[0],c.path[1]],[c.to,c.path.at(-1),c.path.at(-2)]]){
      const l=layers.get(floorId),dx=p[0]-q[0],dz=p[2]-q[2],len=Math.hypot(dx,dz),pad=box(l.categories.slabs,c.width+.4,.18,2.8,p[0]+dx/len*1.4,-.09,p[2]+dz/len*1.4,mat.slab,c.id+'_landing_'+floorId);pad.rotation.y=Math.atan2(dx,dz);
    }
    const layer=layers.get(c.from),base=layer.baseY,g=new THREE.Group();g.name=c.id;g.userData={featureId:c.id,evidence:c.evidence,source:c.source,connects:[c.from,c.to]};layer.categories.stairs.add(g);featureObjects.set(c.id,g);
    const edges=ribbonEdges(c.path,c.width);
    for(let i=1;i<c.path.length;i++){
      const a=c.path[i-1],b=c.path[i],len=Math.hypot(b[0]-a[0],b[2]-a[2]),left=edges[i-1][0],right=edges[i-1][1],nextLeft=edges[i][0],nextRight=edges[i][1];
      const mix=(u,v,t)=>u.map((n,k)=>n+(v[k]-n)*t),local=p=>[p[0],p[1]-base,p[2]];
      if(c.type==='ramp')prism(g,[left,right,nextRight,nextLeft].map(local),.22,'sealed_ramp_span');
      else if(Math.abs(b[1]-a[1])<1e-7){const dx=(b[0]-a[0])/len*.025,dz=(b[2]-a[2])/len*.025;prism(g,[left,right,nextRight,nextLeft].map((p,j)=>local([p[0]+(j<2?-dx:dx),p[1],p[2]+(j<2?-dz:dz)])),.28,'level_stair_landing');}
      else{
        // Joined closed risers and a sloping structural soffit beneath the flight.
        prism(g,[left,right,nextRight,nextLeft].map(p=>[p[0],p[1]-base-.18,p[2]]),.28,'stair_soffit');
        const n=Math.ceil((b[1]-a[1])/.15);
        for(let j=0;j<n;j++){const top=a[1]+(b[1]-a[1])*(j+1)/n-base,points=[mix(left,nextLeft,j/n),mix(right,nextRight,j/n),mix(right,nextRight,(j+1)/n),mix(left,nextLeft,(j+1)/n)].map(p=>[p[0],top,p[2]]);prism(g,points,.2,'joined_stair_tread');}
      }
      for(const side of [0,1]){
        const u=edges[i-1][side];let v=edges[i][side];
        if(c.id===CONCOURSE_RAMP.id){
          const h=CONCOURSE_RAMP.cheekHeight,t=CONCOURSE_RAMP.cheekThickness,dx=v[0]-u[0],dz=v[2]-u[2],len=Math.hypot(dx,dz),nx=-dz/len*t/2,nz=dx/len*t/2;
          prism(g,[[u[0]+nx,u[1]+h-base,u[2]+nz],[u[0]-nx,u[1]+h-base,u[2]-nz],[v[0]-nx,v[1]+h-base,v[2]-nz],[v[0]+nx,v[1]+h-base,v[2]+nz]],h+.22,'c05_concrete_cheek');
          colliders.push({floor:c.from,x:(u[0]+v[0])/2,z:(u[2]+v[2])/2,width:len,depth:t,yaw:-Math.atan2(dz,dx),baseY:Math.min(u[1],v[1])-.22,height:Math.max(u[1],v[1])+h-base,type:'ramp-cheek'});
          continue;
        }
        // The observed solid terminal cheeks replace, rather than overlap,
        // the old generic handrails on this limited portion of GATE 2-1.
        if(c.id===ENTRY_CANOPY.connector&&i===c.path.length-1){const frame=entryCanopyFrame(c),offset=(side===0?1:-1)*c.width/2,p=frame.at(-ENTRY_CANOPY.length,offset);v=[p[0],frame.floor(-ENTRY_CANOPY.length,offset),p[1]];}
        for(const h of [.5,1.05])rail(g,[u[0],u[1]+h-base,u[2]],[v[0],v[1]+h-base,v[2]]);
        const n=Math.ceil(Math.hypot(v[0]-u[0],v[2]-u[2])/1.8);for(let j=0;j<n;j++){const p=mix(u,v,j/n);box(g,.075,1.05,.075,p[0],p[1]+.525-base,p[2],mat.dark);
          // The stair ribbon blocks side entry, but its first rail post also
          // protrudes into the open approach before that ribbon begins.
          if(c.id==='stair-1b-side'&&i===1&&j===0)colliders.push({floor:c.from,x:p[0],z:p[2],width:.075,depth:.075,yaw:0,baseY:p[1],height:p[1]+1.05-base,type:'stair-entry-rail-post',featureId:c.id});
        }
        if(i===c.path.length-1)box(g,.075,1.05,.075,v[0],v[1]+.525-base,v[2],mat.dark);
      }
    }
    if(c.id===ENTRY_CANOPY.connector)g.add(buildEntryCanopy({connector:c,footprint:FLOOR_POLYGONS['2F'],materials:mat,colliders}));
    for(const [p,q,text]of [[c.path[0],c.path[1],`${c.from.replace('F','층')} → ${c.to.replace('F','층')}`],[c.path.at(-1),c.path.at(-2),`${c.to.replace('F','층')} → ${c.from.replace('F','층')}`]]){
      const yaw=Math.atan2(q[0]-p[0],q[2]-p[2]),offset=c.width/2+1.2,sx=p[0]+Math.cos(yaw)*offset,sz=p[2]-Math.sin(yaw)*offset;
      box(g,.08,2.5,.08,sx,p[1]+1.25-base,sz,mat.dark);sign(g,text,sx,p[1]+2.25-base,sz,yaw,2.4);
      if(c.id===ENTRY_CANOPY.connector||c.id===CONCOURSE_RAMP.id){const f=FLOORS.find(f=>f.y===p[1]);colliders.push({floor:f.id,x:sx,z:sz,width:.08,depth:.08,yaw:0,baseY:p[1],height:2.5,type:'wayfinding-post'});}
    }
  }
  // Paired mezzanine flights share a level turning platform, not two isolated pads.
  for(const bank of ['west','east']){const lower=CONNECTORS.find(c=>c.id==='mezz-'+bank+'-lower'),upper=CONNECTORS.find(c=>c.id==='mezz-'+bank+'-upper'),a=lower.path.at(-1),b=upper.path[0],l=layers.get('2.5F');box(l.categories.slabs,Math.abs(a[0]-b[0])+lower.width+.4,.25,2.8,(a[0]+b[0])/2,-.125,a[2]+1.4,mat.slab,'shared_mezzanine_landing');}
  const context=new THREE.Group();context.name='stadium_context';root.add(context);poly(FIELD,.2,-.5,context,mat.field,'field');
  const base=27.43/Math.sqrt(2),diamond=[[0,0],[base,-base],[0,-2*base],[-base,-base],[0,0]];for(let i=1;i<diamond.length;i++)beam(context,diamond[i-1],diamond[i],-.24,.2,.04,mat.line);
  const mound=mesh(new THREE.CylinderGeometry(2.7,2.7,.13,32),mat.slab,context,'mound');mound.position.set(0,-.2,-18.44);
  const seating=buildSeating({labels,materials:mat}),seats=seating.group;context.add(seats);pickables.push(...seating.pickables);
  colliders.push(...seating.colliders);
  for(const b of SEAT_BLOCKS)colliders.push(...seatApproachBarriers(b));
  const outfield=new THREE.Group();outfield.name='outfield_stands';context.add(outfield);
  // Roof form follows the upper-bowl perimeter: grey structural canopy,
  // perimeter fascia and radial ribs. Dimensions are an explicit visual fit.
  const envelope=new THREE.Group();envelope.name='building_roof_envelope';root.add(envelope);envelope.userData={geometryEvidence:'partial-photo-cross-check',dimensionEvidence:'inferred',sources:['erdoc-navy-roof-2023','suyakaya-navy-roof-2025','seoul-navy-renewal-2025']};
  const canopyFrame=buildCanopyFrame({parent:envelope,materials:mat});
  const canopyOuter=CANOPY_SECTIONS.map(c=>c.at(1)).map(p=>[p[0],p[2]]),canopyInner=CANOPY_SECTIONS.map(c=>c.at(0)).map(p=>[p[0],p[2]]);
  for(let i=1;i<canopyOuter.length;i++){
    const a=canopyOuter[i-1],b=canopyOuter[i],u=canopyInner[i];
    beam(envelope,a,b,CANOPY_FRAME.outerY-.2,.42,.85,mat.wall);
    if(i%2===0){
      if(!hasDetailedCanopy(a))beam(envelope,u,a,CANOPY_FRAME.outerY-.4,.28,.42,mat.column);
      const top=CANOPY_FRAME.outerY-.4,height=top-14.5;
      box(envelope,.42,height,.48,a[0],14.5+height/2,a[1],mat.column,'canopy_rear_mast');
      colliders.push({floor:'4F',x:a[0],z:a[1],width:.42,depth:.48,yaw:0,height,type:'column'});
    }
  }
  // Horizontal spandrels tie the existing structural columns into one facade.
  for(const floor of FLOORS.filter(f=>f.id!=='1F'&&f.id!=='2.5F'))for(let i=1;i<OUTER.length;i++)beam(layers.get(floor.id).categories.walls,OUTER[i-1],OUTER[i],-.22,.5,.44,mat.column);
  box(context,27,9,1.8,0,15,-153,mat.dark,'scoreboard');sign(context,'잠실야구장',0,15,-152,0,22);
  for(const [x,z]of [[-88,-103],[88,-103],[-102,-20],[102,-20],[-40,52],[40,52]]){box(context,1,28,1,x,14,z,mat.column,'light_tower');box(context,10,3,1,x,28,z,mat.room,'light_array');}
  function mergeDirect(group){const batches=new Map();for(const child of group.children){if(!child.isMesh||child.isInstancedMesh)continue;const list=batches.get(child.material)||[];list.push(child);batches.set(child.material,list);}for(const [material,children]of batches){if(children.length<2)continue;const geometries=children.map(o=>{o.updateMatrix();return (o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrix);});const geo=mergeGeometries(geometries);for(const geom of geometries)geom.dispose();for(const child of children)group.remove(child);mesh(geo,material,group,group.name+'_structure');}}
  for(const group of [seats,seating.publicAccess,seating.upperAccess,seating.frontAccess,canopyFrame.group,outfield,...featureObjects.values()])mergeDirect(group);
  // Keep floor meshes separately addressable for geometric head-clearance tests.
  for(const l of layers.values())for(const [name,g]of Object.entries(l.categories))if(name!=='slabs')mergeDirect(g);
  for(const object of featureObjects.values())object.traverse(o=>{if(o.isMesh)pickables.push(o);});
  mergeDirect(envelope);
  root.updateMatrixWorld(true);return {structureDetails:STRUCTURE_DETAILS,seatingLabels:seating.annotations,publicGalleries:[{group:seating.publicAccess,floor:'1F'},{group:seating.upperAccess,floor:'4F'},{group:seating.frontAccess,floor:'4F'}],envelope,seatBlocks:seating.blocks,restrictedZones:RESTRICTED_ZONES,root,layers,context,seats,outfield,featureObjects,pickables,colliders,openings,materials:mat,columnCount,modelBounds:new THREE.Box3().setFromObject(root)};
}
