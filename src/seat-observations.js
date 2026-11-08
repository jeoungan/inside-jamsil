// Exact addresses only. Neighbouring numbers are never inferred as observed.
export const ADDITIONAL_SEAT_SOURCES=[
 {id:'ticket-118',title:'관람객 원본 기록 · 118구역 8열',url:'https://rc-f3a.tistory.com/8553570',note:'2025-04-26 관람. 본문에서 8열 97번·101번을 각각 명시. 그 사이 번호는 미확인.'},
 {id:'ticket-217',title:'관람객 티켓 인증 · 217구역 16열 237번',url:'https://haming-vibe.tistory.com/entry/잠실야구장-3루-블루석-217블록-16열-시야-직관-후기',note:'2025-08-08 관람 기록과 티켓 인증. 번호 존재만 확인하며 좌우 좌표는 추정.'},
 {id:'ticket-226',title:'관람객 원본 기록 · 226구역 10열',url:'https://wheesol.tistory.com/2',note:'2025-05-02 게시. 10열 140번·141번을 명시. 226구역은 뒤로 돌아 입장한다는 동선 설명.'},
 {id:'ticket-316',title:'관람객 원본 기록 · 316구역 21열 233번',url:'https://weekendreview.tistory.com/entry/LG트윈스-잠실야구장-1루-중앙네이비석-316블럭-21열-233번-후기',note:'2023-08-19 게시. 해당 주소의 존재를 확인했으며 현재 예매 원본과는 미대조.'},
 {id:'ticket-334',title:'관람객 티켓·현장 기록 · 334구역 6열 129번',url:'https://rc-f3a.tistory.com/8553824',note:'2025 한국시리즈 관람 기록. 전체 번호표는 제공하지 않음.'},
 {id:'ticket-401',title:'2026 관람객 기록 · 401구역 7열 61번',url:'https://rc-f3a.tistory.com/8554053',note:'2026-04-24 관람. 1루 외야 입구·GS25·좌석 사진과 주소 대조.'},
 {id:'ticket-416-418',title:'2026 관람객 티켓 기록 · 416·418구역',url:'https://rc-f3a.tistory.com/8554063',note:'2026-05-07 관람. 416/7/109·110, 418/9/98을 명시.'},
 {id:'ticket-405-416',title:'관람객 원본 기록 · 405·416구역',url:'https://rc-f3a.tistory.com/8553721',note:'2025-08-27 게시. 405/13/173, 416/15/235를 명시.'}
];
export const ADDITIONAL_SEAT_OBSERVATIONS=[
 ['118',8,[97,101],'ticket-118'],['217',16,[237],'ticket-217'],['226',10,[140,141],'ticket-226'],
 ['316',21,[233],'ticket-316'],['334',6,[129],'ticket-334'],['401',7,[61],'ticket-401'],
 ['416',7,[109,110],'ticket-416-418'],['418',9,[98],'ticket-416-418'],['405',13,[173],'ticket-405-416'],['416',15,[235],'ticket-405-416']
].map(([section,row,numbers,source])=>({section,row,numbers,source,geometryEvidence:'inferred'}));
