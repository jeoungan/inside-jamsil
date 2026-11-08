// Section order: LG Twins 2026 official c0.png. Geometry is an explicit fit.
// Number observations are kept separate from the synthetic model catalogue.
import {INNER,OUTER,FLOORS,FEATURES,COLUMNS,CONNECTORS} from './data.js';
import {resample,insideRect,segmentIntersectsRect,ribbonOutline,segmentIntersectsPolygon} from './spatial.js';
import {ADDITIONAL_SEAT_SOURCES,ADDITIONAL_SEAT_OBSERVATIONS} from './seat-observations.js';
import {outfieldAccessFor} from './outfield-access.js';
export const SEAT_SOURCES=[
 {id:'lg-sections-2026',title:'LG트윈스 · 2026 공식 좌석 구역도',url:'https://lgtwins.com/ticket/general',note:'101–122, 201–226, 301–334, 401–422 구역 순서와 등급을 대조했습니다. 열별 번호표는 포함하지 않습니다.'},
 {id:'msc-207-pdf',title:'자리어때 · 2025 소개 자료 4쪽, 207구역 번호표',url:'https://adure.net/uploads/adure/1757984444_%EC%9E%90%EB%A6%AC%EC%96%B4%EB%95%8C-%EA%B4%91%EA%B3%A0-%EC%83%81%ED%92%88-%EC%86%8C%EA%B0%9C%EC%84%9C_202507.pdf',note:'207구역 1열·3~16열 번호를 판독했습니다. 2열은 중복 표기가 있어 미확정, 17~20열은 화면 밖입니다. 현재 예매 원본과는 미대조입니다.'},
 {id:'msc-207',title:'자리어때 · 207구역 현장 정보',url:'https://myseatcheck.com/잠실-오렌지-207구역/',note:'20개 열, 2~20열의 33~39cm 단차를 참고했습니다.'},
 {id:'msc-108',title:'자리어때 · 108구역 현장 정보',url:'https://myseatcheck.com/잠실-블루-108구역/',note:'9개 열, 2~9열의 27~33cm 단차를 참고했습니다.'},
 {id:'msc-314',title:'자리어때 · 314구역 현장 정보',url:'https://myseatcheck.com/잠실-네이비-314구역/',note:'28개 열, 일반 단차 53cm, 14열 132~135·146~149번의 존재를 확인했습니다. 해당 번호의 정확한 좌우 배치는 추정입니다.'},
...ADDITIONAL_SEAT_SOURCES];
const inn=resample(INNER,1001),out=resample(OUTER,1001),sample=(arr,t)=>{const f=Math.max(0,Math.min(1000,t*1000)),i=Math.min(999,Math.floor(f));return arr[i].map((v,k)=>v+(arr[i+1][k]-v)*(f-i));};
const scaled=(t,s)=>{const [x,z]=sample(inn,t);return [x*s,(z+49)*s-49];};
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const height=f=>FLOORS.find(l=>l.id===f).y;
const observed207={1:[1,11],3:[23,33],4:[45,34],5:[46,57],6:[69,58],7:[70,81],8:[93,82],9:[94,105],10:[117,106],11:[118,129],12:[141,130],13:[142,154],14:[167,155],15:[168,180],16:[193,181]};
const range=(a,b)=>Array.from({length:Math.abs(b-a)+1},(_,i)=>a+i*Math.sign(b-a||1));
function category(n){if(n>=400)return n>=405&&n<=408?'그린응원석':'외야석';if(n>=300)return '네이비석';if([111,112,113,212,213,214,215].includes(n))return '테이블석';if(n>=200&&((n>=205&&n<=208)||(n>=219&&n<=222)))return '오렌지석';if((n>=107&&n<=110)||(n>=114&&n<=116)||(n>=209&&n<=211)||(n>=216&&n<=218))return '블루석';return '레드석';}
const definitions=[];
// Tier 2's first seating tread is above the 2F entrance landing. The elevation
// is inferred; the extra metre preserves headroom over the lower-tier rows.
for(const [start,count,sideCount,front,back,floor,base,rise,rows] of [[101,22,11,.64,.80,'2F',.65,.30,9],[201,26,13,.73,.92,'2F',5.5,.36,20],[301,34,17,.79,1.12,'4F',14.5,.53,28]]){
 for(let i=0;i<count;i++){
  // Right-field tip -> home plate -> left-field tip. Central premium gap.
  const a=i<count/2?(.99-i/sideCount*.44):(.45-(i-sideCount)/sideCount*.44),b=i<count/2?(.99-(i+1)/sideCount*.44):(.45-(i+1-sideCount)/sideCount*.44);
  const id=String(start+i),rowCount=category(start+i)==='테이블석'?7:rows;
  definitions.push({id,category:category(start+i),floor,front:[scaled(a,front),scaled(b,front)],back:[scaled(a,back),scaled(b,back)],base,rise,rows:rowCount,t0:a,t1:b,tier:Math.floor((start+i)/100),numberEvidence:'inferred'});
 }
}
for(let i=0;i<22;i++){
 const a=1.32-i/22*2.64,b=1.32-(i+1)/22*2.64,at=(t,r)=>[Math.sin(t)*r,-49-Math.cos(t)*r];
 definitions.push({id:String(401+i),category:category(401+i),floor:'1F',front:[at(a-.009,84),at(b+.009,84)],back:[at(a-.009,103),at(b+.009,103)],base:4,rise:.40,rows:16,tier:4,angle:(a+b)/2,numberEvidence:'inferred'});
}
export function blockPoint(b,u,v,y){const p=lerp(lerp(b.front[0],b.front[1],u),lerp(b.back[0],b.back[1],u),v);return [p[0],y??b.base,p[1]];}
export function blockUV(b,x,z){
 // Inverse bilinear quadrilateral, used by both collision and rendering.
 let u=.5,v=.5;
 for(let i=0;i<7;i++){const p=blockPoint(b,u,v),du=lerp(b.front[1].map((n,k)=>n-b.front[0][k]),b.back[1].map((n,k)=>n-b.back[0][k]),v),dv=lerp(b.back[0].map((n,k)=>n-b.front[0][k]),b.back[1].map((n,k)=>n-b.front[1][k]),u),det=du[0]*dv[1]-du[1]*dv[0];if(Math.abs(det)<1e-9)break;const dx=x-p[0],dz=z-p[2];u+=(dx*dv[1]-dz*dv[0])/det;v+=(du[0]*dz-du[1]*dx)/det;}
 return {u,v};
}
export function rowV(b,row){return .06+(row-.5)*.90/b.rows;}
export function rowY(b,row){return b.base+(row-1)*b.rise;}
export function rowSeats(b,row){return b.catalogue[row-1]||[];}
export const seatU=(b,index,count)=>{
 if(b.tier!==4)return .80-(index+.5)/count*.60;
 const besideEntry=outfieldAccessFor(b.id)?.anchor===b.id;
 return (besideEntry ? .36 : .20)+(index+.5)/count*(besideEntry ? .44 : .60);
};
function makeCatalogue(b){let next=1;return Array.from({length:b.rows},(_,i)=>{
 const row=i+1,count=b.id==='207'?(row<=3?11:row<=12?12:13):Math.max(4,Math.floor(Math.hypot(...b.front[0].map((v,k)=>v-b.front[1][k]))*.62/.52)+Math.floor(i/9));
 let numbers=range(next,next+count-1);if(row%2===0)numbers.reverse();let evidence='inferred';
 if(b.id==='207'&&observed207[row]){numbers=range(...observed207[row]);evidence='observed';}
 if(b.id==='314'&&row===14)numbers=range(149,132);
 next=Math.max(...numbers)+1;
 return numbers.map((number,index)=>({number,index,evidence:b.id==='314'&&row===14&&((number>=132&&number<=135)||(number>=146&&number<=149))?'observed':evidence}));
});}
function portalFor(b){
 if(b.tier===4){const a=outfieldAccessFor(b.id);b.accessGroup=a.id;b.portalEvidence='photo-shared-entry-fit';return [a.path[0][0],a.path[0][2]];}
 // Model-fitting detours: keep the surveyed toilet rooms in place.
 const fits={'205':{portal:[76.6388401059878,-26.410591535979734],via:[61.8982511187722,4.5,-30.84251082123539]},'211':{portal:[37.00089474756553,24.935535599238086],via:[29.712588520322996,4.5,10.845485197174852]}};
 if(fits[b.id]){b.bridgeWaypoints=[fits[b.id].via];b.portalEvidence='collision-fit';return fits[b.id].portal;}
 const obstacles=[...FEATURES.filter(f=>f.floor===b.floor&&!['stair','ramp','gate','door'].includes(f.type)).map(f=>({...f,width:f.width||5,depth:f.depth||4.6,yaw:Math.atan2(f.x,f.z+49)})),...COLUMNS];
 let best=null;
 for(const along of [.055,.22,.4,.6,.8,.1,.9,-.2,1.2])for(const depth of (b.floor==='4F'?[.82,.9,.97]:[.10,.17,.32,.48,.64])){
  let xz;
  if(b.tier===4){const p=blockPoint(b,along,1),scale=1.2+depth*.25;xz=[p[0]*scale,(p[2]+49)*scale-49];}
  else{const t=b.t0+(b.t1-b.t0)*along;xz=lerp(sample(inn,t),sample(out,t),depth);}
  const target=blockPoint(b,.055,1),a=xz,mid=lerp(a,[target[0],target[2]],.55);
  const obstructed=obstacles.some(c=>segmentIntersectsRect(a,[target[0],target[2]],c,.75));
  const links=CONNECTORS.filter(c=>c.from===b.floor||c.to===b.floor).some(c=>segmentIntersectsPolygon(a,[target[0],target[2]],ribbonOutline(c,c.width+1.4,.6)));
  if(!obstructed&&!links)return [...a];
 }
 if(b.tier!==4){for(const shift of [0,.015,-.015,.03,-.03,.05,-.05,.08,-.08]){
  const t=Math.max(.01,Math.min(.99,b.t0+shift)),a=lerp(sample(inn,t),sample(out,t),.35),q=scaled(t,.86),target=blockPoint(b,.055,1),end=[target[0],target[2]];
  if(!obstacles.some(c=>segmentIntersectsRect(a,q,c,.85)||segmentIntersectsRect(q,end,c,.85))&&!CONNECTORS.filter(c=>c.from===b.floor||c.to===b.floor).some(c=>segmentIntersectsPolygon(a,q,ribbonOutline(c,c.width+1.5,.6)))){b.bridgeWaypoints=[[q[0],height(b.floor),q[1]]];return a;}
 }}
 return b.tier===4?(()=>{const p=blockPoint(b,.055,1);return [p[0]*1.2,(p[2]+49)*1.2-49];})():lerp(sample(inn,(b.t0+b.t1)/2),sample(out,(b.t0+b.t1)/2),.45);
}
export const SEAT_BLOCKS=definitions.map(b=>{
 b.catalogue=makeCatalogue(b);b.rowEvidence=['207','108','314'].includes(b.id)?'observed':'inferred';
 const observations=ADDITIONAL_SEAT_OBSERVATIONS.filter(o=>o.section===b.id);
 let spare=Math.max(...b.catalogue.flat().map(s=>s.number),...observations.flatMap(o=>o.numbers))+1;
 for(const observation of observations)for(const [j,number]of observation.numbers.entries()){
  const row=b.catalogue[observation.row-1];
  for(const otherRow of b.catalogue)if(otherRow!==row)for(const seat of otherRow)if(seat.number===number)seat.number=spare++;
  const existing=row.find(s=>s.number===number),seat=existing||row[Math.min(row.length-1,Math.floor(row.length*(j+1)/(observation.numbers.length+1)))];
  Object.assign(seat,{number,evidence:'observed',source:observation.source});
 }
 b.entryY=height(b.floor);b.bridgeY=b.tier===4?7:b.entryY;const p=portalFor(b);b.portal=[p[0],b.entryY,p[1]];
 if(b.tier===4){b.bridgeY=rowY(b,b.rows);b.approachEvidence='photo-shared-stair-inferred-dimensions';}
 // The lower 118 approach and upper 221 approach share a concourse mouth.
 // Keep that fork level, then descend before passing under the upper terrace.
 // This is an explicit model fit, not a measured as-built elevation.
 if(b.id==='118'){
  const end=blockPoint(b,.055,1);b.bridgeY=2.65;
  b.bridgeWaypoints=[[p[0]+(end[0]-p[0])*.28,b.entryY,p[1]+(end[2]-p[1])*.28]];
  b.approachEvidence='inferred-headroom-fit';
 }
 b.entry={id:'block-'+b.id,name:b.id+'구역 입구',kind:'section',floor:b.floor,x:p[0],z:p[1]};
 b.width=Math.hypot(...b.front[0].map((v,k)=>v-b.front[1][k]));b.depth=Math.hypot(...lerp(b.front[0],b.front[1],.5).map((v,k)=>v-lerp(b.back[0],b.back[1],.5)[k]));
 return b;
});
export const SEAT_BLOCK_BY_ID=new Map(SEAT_BLOCKS.map(b=>[b.id,b]));
export function resolveSeat(section,rowValue,numberValue,{allowInferred=false}={}){
 const id=String(section).trim().replace(/(?:구역|블록|블럭)$/,'').trim(),b=SEAT_BLOCK_BY_ID.get(id),row=Number(rowValue),number=Number(numberValue);
 if(!b)throw Error('등록된 숫자 구역을 입력해 주세요. 특수석·프리미엄석은 아직 번호 안내를 지원하지 않습니다.');
 if(!Number.isInteger(row)||row<1||row>b.rows)throw Error(id+'구역 모델에는 1~'+b.rows+'열이 등록되어 있습니다. 실제 열 범위와 다를 수 있습니다.');
 if(!Number.isInteger(number)||number<1)throw Error('좌석 번호는 1 이상의 정수로 입력해 주세요.');
 const seats=rowSeats(b,row),seat=seats.find(s=>s.number===number);
 if(!seat)throw Error(row+'열에 등록되지 않은 번호입니다. 아래 좌석도에서 번호를 확인해 주세요.');
 if(!allowInferred&&seat.evidence!=='observed')throw Error('이 번호는 자료 대조가 끝나지 않았습니다. 해당 구역 입구까지 안내합니다.');
 const u=seatU(b,seat.index,seats.length),point=blockPoint(b,u,rowV(b,row),rowY(b,row));
 return {id:`seat:${id}:${row}:${number}`,kind:'individual-seat',name:`${id}구역 ${row}열 ${number}번`,section:id,row,number,floor:b.floor,x:point[0],z:point[2],point,chair: blockPoint(b,u,rowV(b,row)+.38*.90/b.rows,rowY(b,row)+.4),evidence:seat.evidence,geometryEvidence:'inferred',source:seat.source||(seat.evidence==='observed'?(id==='207'?'msc-207-pdf':'msc-314'):'model-inference'),entry:b.entry};
}
export const SEAT_STATS={blocks:SEAT_BLOCKS.length,seats:SEAT_BLOCKS.reduce((n,b)=>n+b.catalogue.flat().length,0),observed:SEAT_BLOCKS.reduce((n,b)=>n+b.catalogue.flat().filter(s=>s.evidence==='observed').length,0)};

// Public guidance never treats synthetic seat numbers as a confirmed destination.
export function seatGuidanceDestination(section,rowValue,numberValue){
 const id=String(section).trim().replace(/(?:구역|블록|블럭)$/,'').trim(),b=SEAT_BLOCK_BY_ID.get(id);
 if(!b)throw Error('등록된 숫자 구역을 입력해 주세요. 특수석·프리미엄석은 아직 번호 안내를 지원하지 않습니다.');
 const row=Number(rowValue),number=Number(numberValue),blank=v=>v==null||String(v).trim()==='';
 if((!blank(rowValue)&&(!Number.isSafeInteger(row)||row<1))||(!blank(numberValue)&&(!Number.isSafeInteger(number)||number<1)))throw Error('열과 좌석 번호는 1 이상의 정수로 입력해 주세요.');
 const observed=b.catalogue[row-1]?.some(s=>s.number===number&&s.evidence==='observed');
 if(observed)return resolveSeat(id,row,number);
 return {...b.entry,guidanceNotice:blank(rowValue)||blank(numberValue)?'열·좌석 번호가 입력되지 않아 '+id+'구역 입구까지만 안내합니다.':'입력한 좌석 번호는 자료에서 확인되지 않아 '+id+'구역 입구까지만 안내합니다.'};
}
