// Transcribed from the Doosan Bears public floor guide on 2026-11-07.
// This is a source snapshot, not a live opening-hours feed.
export const AMENITY_REVIEWED_AT='2026-11-07';
export const AMENITY_SOURCE={id:'doosan-amenities-202611',title:'두산베어스 · 층별 편의시설 안내 (2026-11 확인)',url:'https://www.doosanbears.com/bears/stadium',note:'공식 안내의 A01~A27, B01~B36, C01~C05, D01~D12와 4층 상호 2곳을 대조했습니다. 게시물의 갱신일과 당일 영업 여부는 표시되어 있지 않습니다.'};
const lists={
 A:['카페희다','BHC','델리스푼 / 미스터피자','GS25','한식 분식','맘스터치','BBQ','베어스 코너','도미노 피자','광장 식당','KFC','꼬꼬닭','GS25','제2 매표소','제3 매표소','GS25','수내닭꼬치','제1 매표소 / 무인 발권기','명인만두','맘스터치','BBQ','GS25','트윈스 팀 스토어','베어스 하우스','무인 발권기','GS25','중앙 매표소'],
 B:['BHC','카페 그라운드','피자헛','명인만두','죠스 떡볶이','통밥','달콤','와팡','원정 구단 상품샵','원정 구단 상품샵','KFC','BBQ','GS25','원정 구단 상품샵','구단 상품샵','원정 구단 상품샵','구단 상품샵','구단 상품샵','GS25','BBQ','맘스터치','구단 상품샵','구단 상품샵','꼬꼬닭 카페','안내데스크','공씨네 주먹밥','Miss&Mr Potato','달콤커피','신철판','명인만두','백미당','맥주창고','죠스 떡볶이','앤티앤스 프레즐','피자헛','BHC'],
 C:['짝태 패밀리','놀이방','수유실','와팡','통밥'],
 D:['GS25','스태프 핫도그','GS25','KFC','GS25','와팡','BBQ','GS25','맘스터치','GS25','스태프 핫도그','GS25']
};
function useFor(name){
 if(name==='GS25')return ['편의점','음료 · 간식 · 편의점 상품','편의점 마트 물 생수 음료 간식 GS 지에스'];
 if(/수유/.test(name))return ['육아','수유 공간','수유 아기 유아 가족 육아'];
 if(/놀이방/.test(name))return ['육아','어린이 놀이 공간','어린이 아이 유아 가족 놀이방'];
 if(/매표|발권/.test(name))return ['발권','티켓 발권 · 예매표 수령','티켓 예매 발권 표 매표소'];
 if(/안내데스크/.test(name))return ['안내','구장 이용 문의','안내 문의 도움 분실물'];
 if(/상품|스토어|하우스|코너/.test(name))return ['상품샵','구단 응원용품 · 기념품','유니폼 굿즈 응원봉 기념품 상품샵 팀스토어'];
 if(/카페|달콤|백미당|와팡|프레즐/.test(name))return ['카페·간식',/와팡|프레즐/.test(name)?'디저트 · 간식':'커피 · 음료 · 디저트','커피 카페 음료 디저트 아이스크림 간식'];
 if(/BHC|BBQ|KFC|꼬꼬닭|맘스터치/.test(name))return ['음식','치킨 · 간편식','음식 먹거리 식사 치킨 햄버거 버거'];
 if(/피자/.test(name))return ['음식','피자','음식 먹거리 식사 피자'];
 if(/맥주|짝태/.test(name))return ['음식','음료 · 안주','음식 먹거리 음료 맥주 안주'];
 return ['음식',/만두/.test(name)?'만두 · 간편식':/떡볶이|분식/.test(name)?'분식 · 간식':/핫도그/.test(name)?'핫도그 · 간식':/Potato/.test(name)?'감자 간식':'식사 · 간편식','음식 먹거리 식사 간식 '+(/통밥|주먹밥/.test(name)?'밥 도시락':'')];
}
export const AMENITY_INFO=Object.fromEntries(Object.entries(lists).flatMap(([prefix,names])=>names.map((name,i)=>{
 const code=prefix+String(i+1).padStart(2,'0'),[category,offering,keywords]=useFor(name);
 return [code,{code,name,category,offering,keywords,source:AMENITY_SOURCE.id,reviewedAt:AMENITY_REVIEWED_AT,operation:'영업 여부 미확인',floor:{A:'1F',B:'2F',C:'2.5F',D:'3F'}[prefix]}];
})));
export const UNLOCATED_AMENITIES=['올떡','제발시켜주세요'].map(name=>({name,floor:'4F',category:'음식',offering:'음식 매장',location:'4층 · 세부 위치 미확인',source:AMENITY_SOURCE.id,reviewedAt:AMENITY_REVIEWED_AT}));
// Marker centres from the same public diagram; not building measurements.
export const ADDITIONAL_GUIDE_POINTS={
 A01:[116,440],A02:[110,486],A03:[110,533],A04:[117,628],A05:[132,677],A06:[147,719],A07:[165,754],A08:[846,995],A09:[1041,730],A10:[1056,687],A11:[1068,650],A12:[1075,618],A13:[1080,585],A14:[1090,480],A15:[1009,253],A16:[782,275],A17:[858,115],A18:[786,74],A19:[687,41],A20:[652,37],A21:[618,34],A22:[581,33],A23:[544,36],A24:[505,43],A25:[406,68],A26:[414,274],A27:[187,251],
 B02:[234,341],B04:[300,354],B08:[283,644],B09:[308,576],B11:[360,526],B20:[884,550],B23:[950,576],B25:[986,746],B27:[1036,699],B28:[1058,674],B31:[1022,517],B34:[968,352]
};
