// Coordinates are manually traced from the public schematic, NOT a measured survey.
// Local units approximate metres; x points to first-base, z towards home-plate stands.
export const META = {
  name: '잠실야구장', version: '0.1', reviewedAt: '2026-11-07',
  units: 'approximate metres', scale: 0.276,
  origin: [630, 325],
  caveat: '안내도에서 옮긴 상대 배치입니다. 층 높이·기둥·계단·실내 치수는 추정이며, 현장 길안내용으로 검증되지 않았습니다.',
};
export const SOURCES = [
  { id: 'doosan-2f', title: '두산베어스 · 2층 시설 안내도', url: 'https://www.doosanbears.com/bears/stadium', asset: 'https://www.doosanbears.com/images/photo/img_game4.jpg', note: '2층 바닥 윤곽, GATE 2-1·2-2·2-3, 화장실과 매장 상대 위치를 수동으로 옮겼습니다.' },
  { id: 'doosan-1f', title: '두산베어스 · 1층 / 좌석 배치도', url: 'https://www.doosanbears.com/bears/stadium', asset: 'https://www.doosanbears.com/images/photo/img_game3.jpg', note: '외야와 내야의 형태, 구역 번호, 1층 출입구·화장실 배치를 참고했습니다. 207구역은 1루 쪽입니다.' },
  { id: 'doosan-3f', title: '두산베어스 · 3·4층 시설 안내도', url: 'https://www.doosanbears.com/bears/stadium', asset: 'https://www.doosanbears.com/images/photo/img_game5.jpg', note: '상층 회랑 및 시설 위치를 옮겼습니다. 3·4층을 하나의 상층 연구 레벨로 단순화했습니다.' },
  { id: 'seoul', title: '서울시 · 잠실야구장 아카이브', url: 'https://stadium.seoul.go.kr/digital-archive/video/jamsil-baseball-stadium', note: '좌우 펜스 100m, 중앙 125m를 전체 규모의 참고값으로 사용했습니다. 안내도는 비례도가 아니므로 정확한 축척은 아닙니다.' },
  { id: 'photo', title: '한국관광공사 · 구장 현장 사진', url: 'https://english.visitkorea.or.kr/svc/whereToGo/locIntrdn/rgnContentsView.do?vcontsId=1566942', note: '단차 관람석, 상부 보와 지붕의 형태를 참고했습니다. 기둥 좌표와 세부 치수는 사진에서 측량하지 않았습니다.' },
  { id: 'access', title: '계단뿌셔클럽 · 출입구 현장 조사', url: 'https://con.staircrusher.club/292c9499-b060-80bb-954d-d6a2582a9a63', note: '1루·3루 진입부의 반복 기둥·보와 경사로 사진을 참고했습니다. 계단의 개수·위치·높이는 확정되지 않았습니다.' },
];
export const FLOORS = [
  { id: '1F', name: '1층', label: '외부 진입 · 외야', y: 0, height: 4.5, source: 'doosan-1f' },
  { id: '2F', name: '2층', label: '주 출입구 · 내부 회랑', y: 4.5, height: 4.5, source: 'doosan-2f' },
  { id: '3F', name: '3·4층', label: '상층 회랑 · 관람석', y: 9, height: 4.5, source: 'doosan-3f' },
];
export const toWorld = ([x,y], floor='2F') => {
  if(floor==='1F') return [(x-594)*META.scale,(y-520)*META.scale];
  if(floor==='3F') y+=160;
  return [(x-630)*META.scale,(y-325)*META.scale];
};
// Open horseshoe: third-base tip → rear of home plate → first-base tip.
export const OUTER = [[162,184],[149,235],[141,294],[140,348],[151,418],[172,491],[204,561],[251,630],[310,690],[380,741],[456,779],[535,805],[615,816],[696,811],[775,787],[853,754],[924,709],[986,650],[1037,581],[1076,511],[1104,436],[1117,363],[1118,301],[1108,236],[1096,184]].map(p=>toWorld(p));
export const INNER = [[383,239],[404,299],[428,365],[452,429],[482,471],[529,506],[627,515],[727,506],[773,471],[806,429],[829,365],[854,299],[879,239]].map(p=>toWorld(p));
export const UPPER_INNER = [[377,82],[399,148],[421,211],[443,273],[478,316],[521,347],[626,354],[719,347],[766,316],[803,274],[823,210],[844,147],[866,83]].map(p=>toWorld(p,'3F'));
export const FIELD = [[365,424],[414,320],[470,260],[532,231],[594,224],[660,235],[726,269],[780,331],[829,424],[748,612],[693,679],[502,679],[444,624]].map(p=>toWorld(p,'1F'));

const points=[];
function feature(id,name,type,floor,pixel,extra={}) {
  const [x,z]=toWorld(pixel,floor);
  points.push({id,name,type,floor,x,z,pixel,source:floor==='1F'?'doosan-1f':floor==='3F'?'doosan-3f':'doosan-2f',evidence:'plan',note:'공개 안내도의 기호 중심을 수동으로 옮겼습니다. 방 크기와 문 방향은 추정입니다.',...extra});
}
feature('gate-21','GATE 2-1','gate','2F',[149,417],{note:'공식 안내도 왼쪽의 3루 측 2층 출입구. 외부 진입로는 개략적으로 재구성했습니다.'});
feature('gate-22','GATE 2-2','gate','2F',[311,709]);
feature('gate-23','GATE 2-3','gate','2F',[1027,636]);
feature('gate-11','GATE 1-1','gate','1F',[595,1000]);
feature('gate-12','GATE 1-2','gate','1F',[1049,392]);
feature('gate-13','GATE 1-3','gate','1F',[133,392]);
feature('gate-1b','1루 내야 출입구','gate','1F',[1037,760]);
feature('gate-3b','3루 내야 출입구','gate','1F',[162,794]);
feature('gate-out1','1루 외야 출입구','gate','1F',[936,138]);
feature('gate-out3','3루 외야 출입구','gate','1F',[247,138]);
[[211,281,'3루 북측 남'],[211,318,'3루 북측 여'],[329,454,'3루 중앙 여'],[441,618,'3루 남측 남'],[477,618,'3루 남측 여'],[781,618,'1루 남측 여'],[818,618,'1루 남측 남'],[930,453,'1루 중앙 여'],[1046,281,'1루 북측 남'],[1046,318,'1루 북측 여']].forEach(([x,y,n],i)=>feature('wc2-'+i,n+'자 화장실','restroom','2F',[x,y]));
[[84,576,'3루 외부'],[1092,557,'1루 외부'],[325,326,'3루 외야 아래'],[464,211,'3루 외야 위'],[712,211,'1루 외야 위'],[861,326,'1루 외야 아래']].forEach(([x,y,n],i)=>feature('wc1-'+i,n+' 화장실','restroom','1F',[x,y],{note:'안내도의 남녀 화장실 한 쌍을 하나의 공간으로 단순화했습니다.'}));
[[338,349,'3루 북측'],[460,461,'3루 남측'],[622,499,'중앙'],[785,460,'1루 남측'],[904,349,'1루 북측']].forEach(([x,y,n],i)=>feature('wc3-'+i,n+' 화장실','restroom','3F',[x,y]));
[[238,205,'B01'],[288,333,'B03'],[306,375,'B05'],[242,589,'B06'],[261,617,'B07'],[350,508,'B10'],[374,548,'B12'],[391,574,'B13'],[417,601,'B14'],[421,671,'B15'],[402,702,'B16'],[837,672,'B17'],[855,582,'B18'],[880,560,'B19'],[904,532,'B21'],[924,508,'B22'],[925,685,'B24'],[1029,717,'B26'],[1077,646,'B29'],[1033,558,'B30'],[1053,474,'B32'],[963,375,'B33'],[976,333,'B35'],[1018,205,'B36']].forEach(([x,y,n])=>feature('shop-'+n,n+' 매장','shop','2F',[x,y]));
[[285,305,'D01'],[261,433,'D02'],[360,416,'D03'],[395,447,'D04'],[513,508,'D05'],[557,520,'D06'],[687,520,'D07'],[730,510,'D08'],[850,447,'D09'],[882,414,'D10'],[983,436,'D11'],[956,305,'D12']].forEach(([x,y,n])=>feature('shop-'+n,n+' 매장','shop','3F',[x,y]));
// Stairs are editable placeholders adjacent to the main entrances; plans do not locate flights.
[[226,479],[354,663],[960,600],[1031,385]].forEach((p,i)=>feature('stair-'+i,'층 연결 계단 '+String(i+1).padStart(2,'0'),'stair','2F',p,{evidence:'inferred',source:'access',note:'층 연결을 체험하기 위한 추정 배치입니다. 공식 안내도는 계단의 세부 위치와 치수를 제공하지 않습니다.',width:3.2,depth:9,height:4.5}));
feature('section-207','207구역 입구','door','2F',[812,481],{source:'doosan-1f',evidence:'inferred',note:'공식 좌석도의 1루 207구역 방향을 참고한 통로 위치입니다. 실제 출입문 좌표는 확인이 필요합니다.'});
feature('section-220','220구역 입구','door','2F',[465,480],{source:'doosan-1f',evidence:'inferred',note:'공식 좌석도의 3루 220구역 방향을 참고했습니다. 실제 출입문 좌표는 추정입니다.'});
export const FEATURES=points;
export const TYPES={gate:{name:'출입구',short:'G',icon:'door'},restroom:{name:'화장실',short:'화장실',icon:'wc'},stair:{name:'계단',short:'계단',icon:'stairs'},door:{name:'구역 입구',short:'입구',icon:'door'},shop:{name:'매장',short:'매장',icon:'shop'},column:{name:'기둥',short:'기둥',icon:'column'}};
export function validateFeatures(features=FEATURES){
  const ids=new Set();for(const f of features){
    if(ids.has(f.id))throw new Error('Duplicate feature '+f.id);ids.add(f.id);
    if(!FLOORS.some(l=>l.id===f.floor)||!TYPES[f.type]||!Number.isFinite(f.x)||!Number.isFinite(f.z))throw new Error('Invalid feature '+f.id);
    if(!SOURCES.some(s=>s.id===f.source))throw new Error('Missing source '+f.id);
  }return true;
}
