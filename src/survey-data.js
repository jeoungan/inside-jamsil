import {FEATURES as GUIDE_FEATURES,OUTER as GUIDE_OUTER,INNER as GUIDE_INNER,SOURCES as GUIDE_SOURCES,TYPES as GUIDE_TYPES} from './guide-data.js';
import {resample,containsPoint,rectCorners,insideRect,segmentIntersectsRect,ribbonOutline,segmentIntersectsPolygon} from './spatial.js';
import {AMENITY_INFO,AMENITY_SOURCE,ADDITIONAL_GUIDE_POINTS} from './amenity-catalogue.js';
import {STRUCTURE_SOURCES} from './structure-evidence.js';
import {ENTRY_HALL,entryHallGeometry} from './entry-hall.js';
import {CONCOURSE_HALL,concourseHallGeometry} from './concourse-hall.js';
import {CONCOURSE_RAMP,concourseRampPath} from './concourse-ramp.js';
export const PLAN_URL='https://www.g2b.go.kr/pn/pnp/pnpe/UntyAtchFile/downloadFile.do?bidPbancNo=R26BK01303113&bidPbancOrd=000&fileSeq=4&fileType=&prcmBsneSeCd=07';
export const META={name:'잠실야구장',version:'0.6',reviewedAt:'2026-11-07',units:'approximate metres',origin:'home plate; +X first base; +Z behind home plate',registration:{source:'seoul-plan-2026',sheet:'EE-102',renderWidth:2600,homePixel:[1181,1121],centreFencePixel:[1181,422],metresPerPixel:125/699},caveat:'공개 공사 도면의 건축 배경을 수동으로 옮긴 연구 모델입니다. 기존 시설 표기는 오래된 내용이 섞여 있으며, 층고·계단 상세·현재 출입 가능 여부는 실측 검증되지 않았습니다.'};
export const SOURCES=[{id:'seoul-plan-2026',title:'서울시 · 2026 잠실야구장 전기설비 개선공사 도면',url:PLAN_URL,note:'나라장터 R26BK01303113. EE-101~103(3~5쪽)의 건축 배경에서 외곽·구조축·화장실군·상층 계단을 수동 추출. EE-105~106(7~8쪽)은 외관 대조용. 건축 준공 실측도로 취급하지 않습니다.'},...GUIDE_SOURCES.map(s=>({...s,note:s.id==='doosan-3f'?'통합 그림과 공식 층별 목록을 대조했습니다. D01~D12는 3층 목록에서 확인했으며 화장실의 개별 층 귀속은 아직 미확정입니다.':s.id==='access'?'1·3루 경사로, 1루 출입구 왼쪽 엘리베이터, 37번 문, 화장실 출입문 현장 사진을 대조했습니다. 정확한 좌표는 추정입니다.':s.note})),{id:'doosan-25f',title:'두산베어스 · 2.5층 안내도',url:'https://www.doosanbears.com/images/photo/img_game6.jpg',note:'C01~C05와 C03 양옆 계단 기호의 상대 위치를 옮겼습니다. 연결 층·단면·층고는 추정입니다.'}];
SOURCES.push({id:'upper-photo-2024',title:'2024 관람객 촬영 · 중앙 네이비석 시야',url:'https://rimee-zz.tistory.com/entry/잠실야구장-4층-중앙-네이비석-시야잠실-먹거리-추천',note:'2024-08-28 직접 방문 사진. 상층의 방사형 계단·단차 관람석·지붕 형식을 대조했습니다. 건축 층 번호나 정확한 계단 축선을 입증하는 자료는 아닙니다.'},{id:'entry-photo-2008',title:'JPN-WORLD · 내야 진입 경사로 현장 사진',url:'https://jpn-world.com/info/korea/seoul/baseball-lg.html',note:'2008년 촬영 진입 사진에서 경사로 끝의 게이트와 반복 기둥·보를 확인했습니다. 현재 상태·치수는 보장하지 않습니다.'});
// Every elevation is a modelling assumption, not a dimension read from a section.
SOURCES.push(...STRUCTURE_SOURCES);
export const FLOORS=[
  {id:'1F',name:'1층',label:'진입 광장 · 경사로',y:0,height:4.5,source:'seoul-plan-2026'},
  {id:'2F',name:'2층',label:'주 회랑 · 출입구',y:4.5,height:3,source:'seoul-plan-2026'},
  {id:'2.5F',name:'2.5층',label:'중간 회랑 · C01–C05',y:7.5,height:3,source:'doosan-25f'},
  {id:'3F',name:'3층',label:'상층 회랑 · 편의시설',y:10.5,height:4,source:'doosan-3f'},
  {id:'4F',name:'4층',label:'상부 통로 · 관람 방향',y:14.5,height:3.6,source:'upper-photo-2024',openAir:true}
].map(f=>({...f,elevationEvidence:'inferred',footprintEvidence:['2.5F','4F'].includes(f.id)?'inferred':'drawing'}));
export const toWorld=([x,y])=>[(x-1181)*125/699,(y-1121)*125/699];
// Manual architectural tracing in the 2600px EE-102 rendering. Not CAD data.
const leftOuter=[[101,75],[75,156],[70,215],[71,276],[80,335],[94,394],[115,451],[141,508],[174,562],[212,612],[255,656],[302,698],[352,733],[407,761],[465,783],[524,798],[586,804]];
export const OUTER=[...leftOuter,[641,806],...leftOuter.toReversed().map(([x,y])=>[1282-x,y])].map(([x,y])=>toWorld([x+540,y+630]));
export const INNER=[[138,116],[196,272],[266,412],[398,578],[508,669],[600,676],[682,676],[774,669],[884,578],[1016,412],[1086,272],[1144,116]].map(([x,y])=>toWorld([x+540,y+630]));
export const UPPER_INNER=INNER;
export const FLOOR_POLYGON=[...OUTER,...INNER.toReversed()];
// Schematic outdoor apron, widened to keep the ground ramp approaches connected.
export const EXTERIOR_RADIUS=148;
const out=resample(OUTER),inn=resample(INNER);
export const arcPoint=(i,t)=>inn[i].map((v,k)=>v+(out[i][k]-v)*t);
// Intermediate and upper galleries have distinct footprints, not duplicate slabs.
export const FLOOR_INNERS=Object.fromEntries(FLOORS.map(f=>[f.id,f.id==='2.5F'?inn.map((_,i)=>arcPoint(i,.24)):f.id==='4F'?inn.map((_,i)=>arcPoint(i,.74)):INNER]));
export const FLOOR_POLYGONS=Object.fromEntries(FLOORS.map(f=>[f.id,[...OUTER,...FLOOR_INNERS[f.id].toReversed()]]));
export const FLOOR_VOIDS=Object.fromEntries(FLOORS.map(f=>[f.id,[
  ...(f.id===ENTRY_HALL.voidFloor?[entryHallGeometry(OUTER,INNER).void]:[]),
  ...(f.id===CONCOURSE_HALL.voidFloor?[concourseHallGeometry(OUTER,INNER).void]:[])
]]));
export const floorContains=(point,id)=>containsPoint(point,FLOOR_POLYGONS[id])&&!FLOOR_VOIDS[id].some(hole=>containsPoint(point,hole));
export const CENTERLINE=out.map((p,i)=>p.map((v,k)=>v*.60+inn[i][k]*.40));
const fence=Array.from({length:51},(_,i)=>{const a=-1.17+i/50*2.34;return [1181+430*Math.sin(a),852-430*Math.cos(a)];});
export const FIELD=[[1181,1121],...fence].map(toWorld);
const oldOut=resample(GUIDE_OUTER),oldIn=resample(GUIDE_INNER);
function registerGuide(f){let best={error:Infinity};for(let i=0;i<100;i++){const a=oldIn[i],b=oldOut[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(.14,Math.min(.90,((f.x-a[0])*dx+(f.z-a[1])*dz)/(dx*dx+dz*dz))),error=Math.hypot(f.x-a[0]-t*dx,f.z-a[1]-t*dz);if(error<best.error)best={error,i,t};}const {i}=best,t=f.type==='shop'?Math.min(best.t,.22):best.t;return {...f,guidePixel:f.pixel,registration:'guide-to-architectural-arc',x:inn[i][0]+t*(out[i][0]-inn[i][0]),z:inn[i][1]+t*(out[i][1]-inn[i][1]),note:f.note+' 건축 도면에 맞춘 위치 보정은 근사입니다.'};}
const points=GUIDE_FEATURES.filter(f=>f.type!=='stair'&&!(f.type==='restroom'&&f.floor==='2F')).map(registerGuide);
// The upper service map does not distinguish the architectural floors.
for(const f of points.filter(f=>f.floor==='3F')){f.floorAssignment='unverified';f.note+=' 3·4층 통합 안내도의 시설을 3층에 잠정 배정했으며 정확한 층 귀속은 미확정입니다.';}
for(const [i,pixel]of [[476,553],[563,553],[681,553],[769,553],[1019,214]].entries()){
  const [px,py]=pixel,registered=registerGuide({x:(px-630)*.276,z:(py+160-325)*.276,type:'shop',note:''});
  // Preserve station from the schematic, but fit rooms to the intermediate gallery.
  let station=0,error=Infinity;for(let j=0;j<100;j++){const p=arcPoint(j,.22),d=Math.hypot(p[0]-registered.x,p[1]-registered.z);if(d<error){error=d;station=j;}}
  const [x,z]=arcPoint(station,.46);points.push({id:'shop-C0'+(i+1),name:'C0'+(i+1)+' 중간층 매장',type:'shop',floor:'2.5F',x,z,guidePixel:pixel,width:i===1?6:4.2,depth:3.4,source:'doosan-25f',evidence:'plan',registration:'guide-to-architectural-arc',note:'공식 2.5층 안내도의 C 기호 위치를 회랑에 정합했습니다. 상호·방 크기·문 방향은 확정하지 않았습니다.'});
}
// The four outfield toilet groups belong under the outfield stands, not on
// the infield horseshoe. Register these separately using the 1F guide centre.
for(let i=0;i<6;i++){const f=points.find(f=>f.id==='wc1-'+i),[px,py]=f.guidePixel,dx=px-594,dz=py-520,r=i<2?113:96,len=Math.hypot(dx,dz);f.x=dx/len*r;f.z=dz/len*r-49;f.registration='1F-outfield-polar-guide-fit';f.note='구단 1층 안내도의 외부 2곳·외야 아래 4곳의 상대 위치를 별도 정합했습니다. 실제 방 크기와 문 방향은 추정입니다.';}
function traced(id,name,type,floor,pixel,extra={}){const [x,z]=toWorld(pixel),f={id,name,type,floor,x,z,pixel,source:'seoul-plan-2026',evidence:'drawing',sheet:'EE-102',note:'공사 도면의 건축 배경에서 수동 추출한 위치입니다. 문 방향·내부 칸막이·세부 치수는 추정입니다.',...extra};const i=points.findIndex(p=>p.id===id);if(i<0)points.push(f);else points[i]=f;return f;}
// Six toilet groups: three on either side. Gender assignment is not legible.
[[148,202],[155,250],[220,381],[254,432],[420,611],[469,641]].forEach(([x,y],i)=>{for(const side of [-1,1])traced(`wc2-${side<0?'3b':'1b'}-${i}`,`${side<0?'3루':'1루'} ${['북측','북측','중앙','중앙','남측','남측'][i]} 화장실 ${i%2+1}`,'restroom','2F',[(side<0?x:1282-x)+540,y+630],{width:i<2?8:6.2,depth:5.2,gender:'unverified',note:'EE-102의 6개 화장실군을 2개 공간씩 옮겼습니다. 각 방의 성별 대응은 미확정입니다. 출입문과 내부 칸막이는 현장 사진을 참고한 단순화입니다.'});});
const gates={'gate-11':[1181,1430],'gate-12':[1725,710],'gate-13':[637,710],'gate-1b':[1695,1373],'gate-3b':[667,1373],'gate-out1':[1620,515],'gate-out3':[742,515],'gate-21':[626,922],'gate-22':[798,1300],'gate-23':[1628,1166]};
for(const [id,pixel]of Object.entries(gates)){const f=points.find(p=>p.id===id);traced(id,f.name,'gate',f.floor,pixel,{source:f.floor==='2F'?'doosan-2f':'doosan-1f',evidence:'plan',note:'구단 안내도의 출입구 이름·방향을 건축 도면 외곽에 맞췄습니다. 문 폭과 세부 위치는 근사입니다.'});}
traced('section-207','207구역 방향 입구','door','2F',[1502,1129],{evidence:'inferred',source:'doosan-1f',note:'1루 207구역 방향입니다. 구역 진입문 번호와 정확한 위치는 현장 확인이 필요합니다.'});
traced('section-220','220구역 방향 입구','door','2F',[860,1129],{evidence:'inferred',source:'doosan-1f',note:'3루 220구역 방향입니다. 문 좌표는 추정입니다.'});
traced('door-37','37번 문 · 1루 휠체어석 방향','door','2F',[1666,880],{source:'access',evidence:'inferred',arrivalOffset:3.4,guidanceNotice:'문 앞 공개 복도까지 안내합니다. 문 안쪽의 휠체어석 연결 동선은 추가 확인 중입니다.',note:'현장 조사에서 37번 문과 1루 휠체어석 연결이 확인됩니다. 좌표는 좌석 방향에 맞춘 추정입니다. 3.4m 앞 도착점은 입구를 바라보기 위한 모델 보행 정합값입니다.'});
traced('lift-1b','1루 출입구 왼쪽 엘리베이터','elevator','1F',[1659,1356],{source:'access',evidence:'inferred',note:'1루 출입구 왼쪽에 존재함을 사진으로 확인했습니다. 정확한 축선은 추정이며 운행은 구현하지 않았습니다.'});
export const CONNECTORS=[];
function connector(id,name,type,from,to,path,width,source,evidence,note){const lower=FLOORS.find(f=>f.id===from),upper=FLOORS.find(f=>f.id===to),lengths=[0];for(let i=1;i<path.length;i++)lengths.push(lengths.at(-1)+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));const c={id,name,type,from,to,width,source,evidence,note,length:lengths.at(-1),path:path.map(([x,z],i)=>[x,lower.y+(upper.y-lower.y)*lengths[i]/lengths.at(-1),z])};CONNECTORS.push(c);const p=path[Math.floor(path.length/2)];points.push({id,name,type,floor:from,x:p[0],z:p[1],source,evidence,note,connects:[from,to],width});}
const stairTraces=[['stair-3b-rear','3루 중앙 상층 계단',[[349,732],[400,753],[452,770],[505,783]]],['stair-1b-rear','1루 중앙 상층 계단',[[933,732],[882,753],[830,770],[777,783]]],['stair-3b-side','3루 측면 상층 계단',[[165,544],[137,496],[115,447],[97,397]]],['stair-1b-side','1루 측면 상층 계단',[[1117,544],[1145,496],[1167,447],[1185,397]]]];
for(const [id,name,trace]of stairTraces)connector(id,name,'stair','2F','3F',trace.map(([x,y])=>{const p=toWorld([x+540,y+630]);return [p[0]*.967,(p[1]+49)*.967-49];}),4.8,'seoul-plan-2026','drawing','EE-102의 회랑 외주 계단 위치·방향을 따라 재구성했습니다. 바깥 모서리에서 폭의 안쪽으로 보행 중심선을 보정했으며, 연결 높이·단수·계단참은 단순화한 추정입니다.');
// C03 is flanked by two stair symbols in img_game6.jpg. Their vertical
// destinations are NOT specified: these paired flights are an explicit hypothesis.
for(const [bank,x]of [['west',5.8],['east',22]]){
  const note='2.5층 안내도 C03 양옆 계단 기호의 상대 위치를 참고했습니다. 2층→2.5층→3층으로 이어지는 평행 계단과 3m 참은 보행 가능한 재구성 가설이며 연결 단면·폭·층고는 미확정입니다.';
  connector('mezz-'+bank+'-lower',(bank==='west'?'C03 왼쪽':'C03 오른쪽')+' · 2층↔2.5층','stair','2F','2.5F',[[x,40],[x,50]],2.8,'doosan-25f','plan',note);
  const returnX=x+(bank==='west'?4:-4);
  connector('mezz-'+bank+'-upper',(bank==='west'?'C03 왼쪽':'C03 오른쪽')+' · 2.5층↔3층','stair','2.5F','3F',[[returnX,50],[returnX,40]],2.8,'doosan-25f','inferred',note);
}
for(const [n,i]of [18,33,66,81].entries()){
  connector('upper-aisle-'+(n+1),(i<50?'3루':'1루')+' 상부 계단 '+(n%2+1),'stair','3F','4F',[arcPoint(i,.39),arcPoint(i,.57),arcPoint(i,.85)],3.2,'upper-photo-2024','inferred','EE-103과 현장 사진의 방사형 상층 계단 형식을 참고한 3층↔4층 연결 가설입니다. 축선·출입구 번호·착지점·층고는 미확정이며 실제 통행 경로를 보증하지 않습니다.');
}
for(const c of CONNECTORS){c.verticalEvidence='inferred';c.sources=[c.source,...(c.id.startsWith('upper-')?['seoul-plan-2026','doosan-3f']:[])];}
connector('ramp-1b','1루 진입 경사로','ramp','1F','2F',[[103,51],[108,36],[103,18],[95,13],[85,11]],4.5,'access','inferred','사진과 안내도의 1루 진입 경사로. 굴곡·높이·착지점은 도면 외곽에 맞춘 근사입니다. 지상 출입문과 겹치지 않도록 외부 접근부를 보정했습니다.');
connector('ramp-3b','3루 진입 경사로','ramp','1F','2F',[[-103,51],[-108,36],[-103,18],[-95,13],[-85,11]],4.5,'access','inferred','사진과 안내도의 3루 진입 경사로. 굴곡·높이·착지점은 근사입니다. 지상 출입문과 겹치지 않도록 외부 접근부를 보정했습니다.');
connector('ramp-21','2-1문 진입 경사로','ramp','1F','2F',[[-108,-65],[-119,-51],[-120,-27],[-110,-21],[-99,-35]],4,'doosan-2f','inferred','안내도의 2-1문 바깥 경사로를 재구성했습니다. 지상 화장실과 충돌하지 않도록 외부 굴곡을 보정했으며 경사와 착지점은 미확정입니다.');
const innerByAxis=resample(INNER,OUTER.length);
const c05RampPath=concourseRampPath(OUTER,INNER,FLOORS.find(f=>f.id==='2F').y,FLOORS.find(f=>f.id==='2.5F').y);
connector(CONCOURSE_RAMP.id,'1루 C05 앞 공개 경사로','ramp','2F','2.5F',c05RampPath.map(p=>[p[0],p[2]]),CONCOURSE_RAMP.width,'doaskoreans-concourse-2026','inferred','37번 문 회랑의 오르는 경사로와 통밥 앞 상단을 독립 방문 사진·영상 및 공식 C05 중간층 위치로 대조했습니다. 2층↔2.5층 대응·폭 2.4m·축선·경사·양 끝 참은 보행 가능한 모델 가설이며 실측 연결 단면이 아닙니다. 상부 귀환 경사로와 비공개 내부는 추가하지 않습니다.');
Object.assign(CONNECTORS.at(-1),{path:c05RampPath,sources:CONCOURSE_RAMP.sources,landingEvidence:'inferred',geometryEvidence:CONCOURSE_RAMP.geometryEvidence});
// Architectural flights use level landings at turns and at both doorways.
// The same vertices drive meshes, routing, headroom cuts and walker height.
// Landing dimensions remain a reconstruction, not measured as-built geometry.
for(const c of CONNECTORS.filter(c=>c.type==='stair')){
 const old=c.path,stations=[0];for(let i=1;i<old.length;i++)stations.push(stations.at(-1)+Math.hypot(old[i][0]-old[i-1][0],old[i][2]-old[i-1][2]));
 const length=stations.at(-1),flats=[[0,Math.min(.6,length*.07)],[length-Math.min(.6,length*.07),length]];
 if(old.length===2)flats.push([length/2-.6,length/2+.6]);
 else for(let i=1;i<old.length-1;i++){const half=Math.min(1.2,(stations[i]-stations[i-1])*.17,(stations[i+1]-stations[i])*.17);flats.push([stations[i]-half,stations[i]+half]);}
 const ascending=length-flats.reduce((n,[a,b])=>n+b-a,0),cuts=[...new Set([...stations,...flats.flat()])].sort((a,b)=>a-b);
 c.path=cuts.map(d=>{let i=1;while(i<stations.length-1&&stations[i]<d)i++;const t=(d-stations[i-1])/(stations[i]-stations[i-1]),p=old[i-1].map((v,k)=>v+(old[i][k]-v)*t),progress=d-flats.reduce((n,[a,b])=>n+Math.max(0,Math.min(d,b)-a),0);return [p[0],old[0][1]+(old.at(-1)[1]-old[0][1])*progress/ascending,p[2]];});
 c.landingEvidence='inferred';c.note+=' 문 앞과 꺾임에 수평 계단참을 넣었으며 치수는 추정입니다.';
}
export const COLUMNS=OUTER.flatMap((p,i)=>[.04,.76].map((t,row)=>({id:`axis-${i+1}-${row+1}`,x:p[0]*(1-t)+innerByAxis[i][0]*t,z:p[1]*(1-t)+innerByAxis[i][1]*t,yaw:Math.atan2(p[0],p[1]+49),width:.72,depth:.85,evidence:row===0?'drawing':'inferred',source:'seoul-plan-2026',note:row===0?'EE-102 외곽 구조축. 단면 크기는 추정.':'도면과 진입 사진을 참고한 내측 기둥열 보간.'})));
// Amenities came from a diagram, so their inferred footprints can overlap the
// more precise restroom drawing. Keep the latter fixed and record small fitting
// adjustments to shops rather than silently obstructing a restroom doorway.
SOURCES.push(AMENITY_SOURCE);
for(const [code,amenity]of Object.entries(AMENITY_INFO)){
 let f=points.find(p=>p.id==='shop-'+code);
 if(!f){
  const pixel=ADDITIONAL_GUIDE_POINTS[code];
  if(code.startsWith('A')){const dx=pixel[0]-594,dz=pixel[1]-520,len=Math.hypot(dx,dz),r=['A16','A26'].includes(code)?96:code==='A08'?137:125;
   f={id:'shop-'+code,type:'shop',floor:'1F',x:dx/len*r,z:dz/len*r-49,guidePixel:pixel,width:4.2,depth:3.4,registration:'1F-polar-guide-fit'};
  }else{f=registerGuide({id:'shop-'+code,type:'shop',floor:'2F',pixel,x:(pixel[0]-630)*.276,z:(pixel[1]-325)*.276,note:''});}
  points.push(f);
 }
 Object.assign(f,{name:amenity.name+' · '+code,amenity,source:AMENITY_SOURCE.id,evidence:'plan',note:'구단 공식 층별 안내에서 상호·용도와 기호 위치를 확인했습니다. 좌표·방 크기·문 방향은 모델에 맞춘 근사이며 당일 영업 여부는 미확인입니다.'});
 if(['육아','발권','안내'].includes(amenity.category))f.type='service';
 if(code.startsWith('D'))f.floorAssignment='official-guide-3F';
}
for(const f of points.filter(f=>f.type==='shop')){
  const toilets=points.filter(t=>t.type==='restroom'&&t.floor===f.floor),yaw=Math.atan2(f.x,f.z+49),origin=[f.x,f.z];
  if(toilets.some(t=>Math.hypot(f.x-t.x,f.z-t.z)<7))for(const offset of [4,-4,8,-8,12,-12]){const x=origin[0]+Math.cos(yaw)*offset,z=origin[1]-Math.sin(yaw)*offset;if(containsPoint([x,z],FLOOR_POLYGON)&&toilets.every(t=>Math.hypot(x-t.x,z-t.z)>=7)){f.x=x;f.z=z;f.fitOffset=offset;f.note+=' 추정 매장 외곽이 도면의 화장실 출입부와 겹쳐 통로 방향으로 '+offset+'m 보정했습니다.';break;}}
}
for(const c of CONNECTORS){c.verticalEvidence='inferred';c.sources??=[c.source];}
// Preserve radial depth in the service diagram. Clamping every shop to the
// inner edge used to collapse opposite-side counters onto the same coordinates.
function rayRadius(boundary,angle,centreZ=0){const ux=Math.sin(angle),uz=Math.cos(angle);let best=null;for(let i=1;i<boundary.length;i++){const a=[boundary[i-1][0],boundary[i-1][1]-centreZ],b=[boundary[i][0],boundary[i][1]-centreZ],dx=b[0]-a[0],dz=b[1]-a[1],den=ux*dz-uz*dx;if(Math.abs(den)<1e-8)continue;const r=(a[0]*dz-a[1]*dx)/den,t=(a[0]*uz-a[1]*ux)/den;if(r>0&&t>=0&&t<=1)best=r;}return best;}
for(const f of points.filter(f=>f.amenity?.code.startsWith('B'))){
 const [px,py]=f.guidePixel,angle=Math.atan2(px-630,py-325),radius=Math.hypot(px-630,py-325)*.276,inner=rayRadius(GUIDE_INNER,angle),outer=rayRadius(GUIDE_OUTER,angle),targetIn=rayRadius(INNER,angle,-49),targetOut=rayRadius(OUTER,angle,-49);
 if(inner&&outer&&targetIn&&targetOut){const t=Math.max(.16,Math.min(.82,(radius-inner)/(outer-inner))),r=targetIn+(targetOut-targetIn)*t;f.x=Math.sin(angle)*r;f.z=Math.cos(angle)*r-49;f.doorYaw=angle+(t>.55?Math.PI:0);f.registration='guide-polar-depth-fit';delete f.fitOffset;}
}
const c05=points.find(f=>f.id==='shop-C05');c05.doorYaw=Math.atan2(c05.x,c05.z+49)+Math.PI;
// Keep the arrival on the narrow public mezzanine. This is a viewing distance
// and a model annotation size, not a surveyed queue location or shop sign.
c05.arrivalOffset=c05.depth/2+2.4;c05.navigationLabel={width:2.4,height:.4,y:1.75};
c05.note+=' 매장 출입면은 안쪽 공용 회랑을 향하도록 추정했습니다. 전면 2.4m 앞 도착점과 작은 안내 표지는 모델 시점 정합이며 실제 대기 위치·간판 치수가 아닙니다.';
// The patrol's close D12 arrival cropped the model label. Keep its registered
// footprint and public approach. Fit the model annotation in a portrait view.
const d12=points.find(f=>f.id==='shop-D12');
d12.arrivalOffset=(d12.depth??3.4)/2+2.4;d12.navigationLabel={width:1.2,height:.28,y:1.65};
d12.note+=' NPC 도착 시야를 위해 전면 2.4m 앞의 공용 바닥에서 멈추고 작은 모델 안내 표지를 바라보도록 정합했습니다. 실제 대기 위치·간판 치수는 아닙니다.';
const c03=points.find(f=>f.id==='shop-C03');c03.fitOffset=14-c03.x;c03.x=14;c03.note+=' 추정 방 외곽이 계단을 막지 않도록 두 계단 사이로 '+c03.fitOffset.toFixed(2)+'m 보정했습니다.';
// Counter footprints are inferred. Fit them to the public corridor without
// overlapping surveyed toilets, stair voids, each other, or their service fronts.
const fitted=[],fixed=points.filter(f=>f.floor==='2F'&&f.type==='restroom').map(f=>({...f,yaw:Math.atan2(f.x,f.z+49)}));
const voids=CONNECTORS.filter(c=>c.from==='2F'||c.to==='2F').map(c=>ribbonOutline(c,c.width+1,3));
const toiletApproaches=fixed.map(f=>({x:f.x+Math.sin(f.yaw)*(f.depth/2+1.5),z:f.z+Math.cos(f.yaw)*(f.depth/2+1.5),width:2.8,depth:3.2,yaw:f.yaw}));
for(const f of points.filter(f=>f.amenity?.code.startsWith('B')).sort((a,b)=>a.id.localeCompare(b.id))){
 f.width=3.4;f.depth=2.6;const original=[f.x,f.z],yaw=f.doorYaw??Math.atan2(f.x,f.z+49),radial=Math.atan2(f.x,f.z+49),candidates=[];
 for(let a=-14;a<=14;a++)for(let r=-5;r<=5;r++)candidates.push({a:a*.8,r:r*.8,score:Math.hypot(a*.8,r*1.2)});
 candidates.sort((a,b)=>a.score-b.score);
 for(const shift of candidates){const x=original[0]+Math.cos(radial)*shift.a+Math.sin(radial)*shift.r,z=original[1]-Math.sin(radial)*shift.a+Math.cos(radial)*shift.r,rect={x,z,width:f.width,depth:f.depth,yaw},corners=rectCorners(x,z,f.width+.8,f.depth+.8,yaw),front=[x+Math.sin(yaw)*2.5,z+Math.cos(yaw)*2.5];
  if(![...corners,front].every(p=>containsPoint(p,FLOOR_POLYGONS['2F'])))continue;
  if([...fixed,...toiletApproaches,...fitted,...COLUMNS].some(o=>insideRect(x,z,o,.6)||corners.some((p,i)=>segmentIntersectsRect(p,corners[(i+1)%4],o,.4))||insideRect(...front,o,.7)))continue;
  if(fitted.some(o=>insideRect(o.front[0],o.front[1],rect,.7)))continue;
  if(voids.some(poly=>containsPoint(front,poly)||corners.some((p,i)=>segmentIntersectsPolygon(p,corners[(i+1)%4],poly))))continue;
  f.x=x;f.z=z;f.fitDistance=Math.hypot(x-original[0],z-original[1]);f.note+=' 안내도 상대 위치를 기준으로 추정 매장 외곽과 문 앞 통로를 '+f.fitDistance.toFixed(1)+'m 이내 보정했습니다.';break;
 }
 fitted.push({x:f.x,z:f.z,width:f.width,depth:f.depth,yaw,front:[f.x+Math.sin(yaw)*2.5,f.z+Math.cos(yaw)*2.5]});
}
for(const [id,offset]of [['wc1-2',-9],['wc1-5',9]]){
  const f=points.find(f=>f.id===id),yaw=Math.atan2(f.x,f.z+49);f.x+=Math.cos(yaw)*offset;f.z-=Math.sin(yaw)*offset;f.fitOffset=offset;f.note+=' 추정 방 외곽이 외야 출입구와 겹쳐 관람석 둘레 방향으로 '+offset+'m 보정했습니다. 실제 좌표는 재확인이 필요합니다.';
}
export const FEATURES=points;
export const TYPES={...GUIDE_TYPES,ramp:{name:'경사로',short:'경사로',icon:'stairs'},elevator:{name:'엘리베이터',short:'엘리베이터',icon:'door'},service:{name:'편의시설',short:'안내',icon:'info'}};
export function validateFeatures(){const ids=new Set();for(const f of FEATURES){if(ids.has(f.id))throw Error('Duplicate '+f.id);ids.add(f.id);if(!FLOORS.some(l=>l.id===f.floor)||!TYPES[f.type]||!Number.isFinite(f.x)||!Number.isFinite(f.z)||!SOURCES.some(s=>s.id===f.source))throw Error('Invalid '+f.id);}return true;}
