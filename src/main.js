import {CONCOURSE_RAMP} from './concourse-ramp.js';
import {CONCOURSE_HALL} from './concourse-hall.js';
import {CONCOURSE_INSPECTION_TARGETS} from './concourse-inspection.js';
import {ENTRY_CANOPY} from './entry-canopy.js';
import {ENTRY_DOOR_FRAME} from './entry-door-frame.js';
import {ENTRY_HALL} from './entry-hall.js';
import {CONCOURSE_FRAME} from './concourse-frame.js';
import {NAVY_FRONT} from './navy-front-access.js';
import {NAVY_ENTRIES} from './navy-entry-access.js';
import {CANOPY_FRAME} from './canopy-profile.js';
import {UPPER_GALLERY} from './upper-gallery-access.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { META, FEATURES, FLOORS, SOURCES, TYPES, validateFeatures } from './data.js';
import { buildStadium, CENTERLINE, canWalk } from './model.js';
import {CONNECTORS,COLUMNS,OUTER,INNER} from './data.js';
import {createWalker,moveWalker,projectConnector,EYE_HEIGHT} from './navigation.js';
import {connectorRoute,createFullTour} from './walking-route.js';
import {FLOOR_POLYGONS,FLOOR_VOIDS} from './data.js';
import {mountRouting} from './routing-ui.js';
import {ORIGINS,DESTINATIONS} from './route-planner.js';
import {BASE_REGIONS} from './access-geometry.js';
import {SEAT_BLOCKS,SEAT_BLOCK_BY_ID,SEAT_SOURCES,SEAT_STATS} from './seat-data.js';
import {UNLOCATED_AMENITIES,AMENITY_REVIEWED_AT} from './amenity-catalogue.js';
import {mountPatrol} from './npc-view.js';
import {OUTFIELD_ACCESSES,OUTFIELD_REAR} from './outfield-access.js';
import {mountSwipeWalking} from './swipe-walking.js';
import {facilityIconSvg,facilityLabel} from './facility-icons.js';
import {mountMobileOrientation} from './mobile-orientation.js';
import {createCanvasInput} from './canvas-input.js';
import {START_LOCATIONS,startingPosition} from './starting-position.js';
import './style.css';
import './mobile-navigation.css';
import './phone-landscape.css';

const icons={cube:'<path d="m12 3 9 5v8l-9 5-9-5V8zM3 8l9 5 9-5M12 13v8M7.5 5.5l9 5"/>',layers:'<path d="m12 3 10 6-10 6L2 9zm-9 11 9 5 9-5M3 18l9 5 9-5"/>',door:'<path d="M5 21V3h14v18M9 3v18m6-10v2M3 21h18"/>',wc:'<circle cx="8" cy="5" r="2"/><path d="M6 20v-7H4V9h8v4h-2v7M17 3v18"/>',stairs:'<path d="M3 20h5v-5h5v-5h5V5h4M3 3l8 8M3 8V3h5"/>',shop:'<path d="M4 10v11h16V10M2 10l3-7h14l3 7M2 10h20M9 21v-7h6v7"/>',column:'<path d="M5 3h14v3H5zM8 6v12m8-12v12M5 18h14v3H5z"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',down:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',reset:'<path d="M3 10a9 9 0 1 1 2 8M3 3v7h7"/>',walk:'<circle cx="14" cy="4" r="2"/><path d="m7 12 3-5 4 2 4 3 3 0M10 7l1 8-5 6m5-6 4 1 2 5"/>',plan:'<path d="M3 3h18v18H3zM3 10h8V3m0 18v-7h10"/>',plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',play:'<path d="m8 4 12 8-12 8z"/>',pause:'<path d="M8 4v16M16 4v16"/>',link:'<path d="M9 5H4v15h15v-5M13 3h8v8m0-8L9 15"/>',check:'<path d="m4 12 5 5L20 6"/>',grid:'<path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/>'};
const icon=(n)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n]||icons.cube}</svg>`;
const app=document.querySelector('#app');
app.innerHTML=`
<header class="topbar"><a class="brand" href="./" aria-label="inside 홈">${icon('cube')}<span>inside<span class="brand-dot">.</span></span></a><span class="header-divider"></span><div class="project"><span>공간 안내 / 001</span><strong>잠실야구장</strong></div><div class="top-actions"><span class="version">공간 연구 모델 <b>v0.6</b></span><button class="btn" id="sources-open" aria-label="모델 근거">${icon('info')}<span>모델 근거</span></button><button class="btn primary" id="export-glb" aria-label="3D 모델 저장">${icon('down')}<span>3D 모델 저장</span></button></div></header>
<main class="workspace">
<aside class="sidebar" aria-label="모델 탐색"><div class="sidebar-title"><span class="eyebrow">공간 둘러보기</span><h1>공간을 먼저,<br>이해하다.</h1><p>평면도에서 입체 공간으로.<br>잠실의 구조를 직접 둘러보세요.</p></div>
<div class="floor-heading"><span>층별 탐색</span><span>1층 — 4층 · 총 5개 층</span></div>
<div class="floor-list" role="group" aria-label="표시할 층"><button data-floor="all" class="floor-button active" aria-pressed="true">${icon('layers')}<span><strong>건물 전체</strong><small>모든 층 함께 보기</small></span><b>전체</b></button>${FLOORS.map(f=>`<button data-floor="${f.id}" class="floor-button " aria-pressed="false"><span class="floor-number">${f.id.replace('F','')}</span><span><strong>${f.name}</strong><small>${f.label}</small></span><b>↗</b></button>`).join('')}</div>
<div class="layer-head"><span>보이는 요소</span><button id="layers-reset" aria-label="모든 요소 표시">초기화</button></div>
<div class="layer-list">${[['columns','기둥','column'],['rooms','화장실 · 매장','wc'],['doors','출입구 · 구역 입구','door'],['stairs','계단 · 경사로','stairs'],['seats','관람석','layers'],['roof','천장 · 외곽 지붕','grid']].map(([id,label,i])=>`<label class="toggle-row">${icon(i)}<span>${label}</span><input type="checkbox" data-layer="${id}" checked/><span class="switch"></span></label>`).join('')}</div>
<div class="sidebar-bottom"><div class="status-dot"></div><span>공사 도면 · 안내도 대조</span><button id="notes-open" aria-label="정확도 안내">${icon('info')}</button><p>구조축·계단 위치 반영 / 높이는 추정</p></div></aside>
<section class="viewport" id="viewport" aria-label="잠실야구장 인터랙티브 3D 모델"><div id="canvas-wrap"></div><div id="labels"></div><div class="view-title"><span class="eyebrow" id="view-code">2층 / 회랑</span><h2 id="view-name">2층 내부 회랑</h2><p id="view-subtitle">출입구와 편의시설, 그 사이의 공간</p></div>
<div class="view-modes" role="group" aria-label="카메라 모드"><button data-view="orbit" class="active" aria-pressed="true">${icon('cube')}<span>3D 보기</span></button><button data-view="plan" aria-pressed="false">${icon('plan')}<span>평면 보기</span></button><button data-view="walk" aria-pressed="false">${icon('walk')}<span>내부 걷기</span></button></div>
<div class="compass"><span>외야</span><svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="25"/><path d="m30 11 6 20-6-4-6 4z"/></svg><small>도면 위쪽</small></div>
<div class="zoom-controls"><button id="zoom-in" title="확대" aria-label="확대">${icon('plus')}</button><button id="zoom-out" title="축소" aria-label="축소">${icon('minus')}</button><button id="camera-reset" title="시점 초기화" aria-label="시점 초기화">${icon('reset')}</button></div>
<div class="bottom-tools"><div class="explode-control"><span>${icon('layers')} 층 분리</span><input id="explode" type="range" min="0" max="28" step="1" value="0" aria-label="층 분리 간격"/><output id="explode-output">0</output></div><button class="btn" id="tour">${icon('play')}<span>전 층 이어 걷기</span></button></div>
<div class="canvas-footer"><span id="controls-help">드래그 회전 <i>·</i> 스크롤 확대 <i>·</i> 우클릭 이동</span><span class="scale"><b></b>약 20 m</span></div>
<div id="walk-hud" hidden><div class="walk-location"><span class="eyebrow">내부 걷기</span><strong id="walk-level">2층</strong><small id="walk-connection">계단과 경사로를 따라 층을 이동하세요.</small><svg id="walk-map" viewBox="-135 -180 270 295" aria-label="현재 위치와 층 연결 경로"></svg></div><div class="crosshair">+</div><div class="walk-help"><span class="desktop-walk-help">드래그로 둘러보기 · W A S D 이동 · Esc 나가기</span><span class="touch-walk-help">위·아래로 밀어 이동 · 좌·우로 밀어 회전<br>누른 채로 계속 이동 · 손을 떼면 정지</span></div></div>
<div id="toast" role="status" aria-live="polite"></div><div id="loading"><div class="loader-ring"></div><span>잠실의 공간을 만드는 중</span></div>
</section>
<aside class="inspector" aria-label="시설 정보"><div class="inspector-header"><h2>공간 목록</h2><span id="feature-count"></span></div><label class="search-box">${icon('search')}<input id="search" placeholder="화장실, 출입구, 구역 검색" aria-label="시설 검색"/></label><div class="filter-chips" role="group" aria-label="시설 종류">${[['all','전체'],['gate','출입구'],['restroom','화장실'],['amenity','편의시설'],['vertical','층 연결']].map(([v,t])=>`<button data-filter="${v}" class="${v==='all'?'active':''}">${t}</button>`).join('')}</div><div id="feature-list"></div><section id="selection" class="selection"><div class="selection-empty">${icon('cube')}<strong>공간을 선택해 보세요</strong><p>모델이나 목록을 누르면<br>위치와 근거를 확인할 수 있어요.</p></div></section></aside>
</main><footer class="app-footer"><span>잠실야구장</span><span id="model-stats">공간 모델 준비 중</span><button id="export-data">배치 데이터 내려받기 ${icon('down')}</button></footer>
<dialog id="source-dialog"><div class="dialog-head"><span class="eyebrow">모델 근거</span><button class="icon-btn" id="sources-close" aria-label="닫기">${icon('close')}</button></div><h2>이 공간을 만든 자료들.</h2><p class="dialog-intro">2026년 서울시 공사 도면의 건축 배경에 구단 안내도와 현장 사진을 대조했습니다. 전기공사 도면의 기존 시설명은 오래된 내용이 섞여 있어 현재 건축 실측도로 취급하지 않습니다.</p><div class="evidence-key"><span><b>도면 + 안내도</b> 외곽·구조축·화장실군·계단 위치</span><span><b>추정 상세</b> 층고·2.5/4층 연결·층별 시설 귀속·문 방향</span></div><div class="source-list">${[...SOURCES,...SEAT_SOURCES].map((s,i)=>`<a href="${s.url}" target="_blank" rel="noopener noreferrer"><span class="source-index">0${i+1}</span><div><strong>${s.title}</strong><p>${s.note}</p></div>${icon('link')}</a>`).join('')}</div><p class="source-foot">검토 ${META.reviewedAt} · 1 / 2 / 2.5 / 3 / 4층 분리 · 높이·중간층 연결 단면은 추정<br>이 모델의 이동은 공간 탐색용입니다. 실제 출입 가능 여부를 안내하지 않습니다.</p></dialog>`;

const mobileOrientation=mountMobileOrientation(app);
validateFeatures();
const state={floor:'all',view:'orbit',filter:'all',search:'',explode:0,selected:null,touring:false,labels:true,layers:{columns:true,rooms:true,doors:true,stairs:true,seats:true,roof:true}};
const $=(s)=>document.querySelector(s), $$=(s)=>[...document.querySelectorAll(s)];
const viewport=$('#canvas-wrap');let renderer;
try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'}); } catch(error){$('#loading').innerHTML='<strong>3D 화면을 시작할 수 없습니다.</strong><p>WebGL을 지원하는 브라우저에서 다시 열어 주세요.</p>';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;viewport.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label','3D 잠실야구장. 시설 선택, 드래그 회전, 두 손가락 확대. 내부 걷기에서는 왼쪽 화면으로 이동하고 오른쪽 화면으로 시점을 조절합니다.');renderer.domElement.tabIndex=0;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xf0f0eb);scene.fog=new THREE.Fog(0xf0f0eb,560,1100);
const perspective=new THREE.PerspectiveCamera(42,1,.15,1600), ortho=new THREE.OrthographicCamera(-190,190,180,-180,.1,1600);let camera=perspective;
const canvasInput=createCanvasInput(renderer.domElement,{isRotated:()=>mobileOrientation.rotated});
const inputSurface=canvasInput.surface;
const orbit=new OrbitControls(camera,inputSurface);orbit.enableDamping=true;orbit.dampingFactor=.08;orbit.minDistance=8;orbit.maxDistance=700;orbit.maxPolarAngle=Math.PI*.49;orbit.target.set(0,0,-5);
scene.add(new THREE.HemisphereLight(0xffffff,0x969b91,1.7));
const sun=new THREE.DirectionalLight(0xffffff,2.6);sun.position.set(-130,220,110);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-200,right:200,top:200,bottom:-200,near:1,far:650});sun.shadow.normalBias=.18;sun.shadow.bias=-.0002;scene.add(sun);
const fill=new THREE.DirectionalLight(0xffffff,.8);fill.position.set(100,70,-140);scene.add(fill);
const stage=new THREE.Mesh(new THREE.PlaneGeometry(1200,1200),new THREE.MeshStandardMaterial({color:0xf0f0eb,roughness:1}));stage.rotation.x=-Math.PI/2;stage.position.y=-.8;stage.receiveShadow=true;scene.add(stage);
const grid=new THREE.GridHelper(440,44,0xc3c8bc,0xd3d6ce);grid.position.y=-.78;grid.material.transparent=true;grid.material.opacity=.24;scene.add(grid);
const model=buildStadium();scene.add(model.root);
const highlight=new THREE.Box3Helper(new THREE.Box3(),0x667a47);highlight.visible=false;scene.add(highlight);
const pointer=new THREE.Vector2(), raycaster=new THREE.Raycaster();
const labelNodes=new Map();
for(const f of FEATURES.filter(f=>f.type!=='shop')){const el=document.createElement('button');el.className='map-label '+f.type;el.innerHTML=facilityLabel(f,f.type==='gate'?f.name.replace('GATE ','G '):f.type==='restroom'?'화장실':['stair','ramp'].includes(f.type)?'↗':f.name.split('구역')[0]);el.title=f.name;el.setAttribute('aria-label',f.name);el.addEventListener('click',()=>selectFeature(f.id));$('#labels').append(el);labelNodes.set(f.id,el);}
let transition=null, toastTimer, yaw=0,pitch=0,tourT=.88,routing=null,tourPurpose='full',patrolUI=null;
const initialPath=connectorRoute(defaultConnector('2F'));
let walker=createWalker('2F',initialPath[0][0],initialPath[0][2]),swipeForward=0,swipeSide=0,swipeControls=null,manualClock=false,tourRoute=[],tourIndex=0,npcLookYaw=0,npcLookPitch=0;
const keys=new Set();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function notify(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
function floorHeight(id){const l=model.layers.get(id);return l.group.position.y;}
function fly(position,target,duration=850){if(reducedMotion)duration=1;transition={from:camera.position.clone(),to:new THREE.Vector3(...position),fromTarget:orbit.target.clone(),toTarget:new THREE.Vector3(...target),start:performance.now(),duration};}
function resetCamera(){
  if(state.view==='walk')setView('orbit');
  const y=state.floor==='all'?state.explode*.65:floorHeight(state.floor);
  const fit=Math.max(1,1.05/(viewport.clientWidth/viewport.clientHeight));
  if(state.view==='plan'){ortho.zoom=Math.min(1,viewport.clientWidth/viewport.clientHeight);ortho.updateProjectionMatrix();fly([0,360,-4],[0,0,-4]);}else fly([220*fit,190*fit+y,245*fit],[0,y,-30]);
}
function updateFloorHeading(id){
  const f=FLOORS.find(f=>f.id===id);
  const text=id==='all'?['전체 층 / 건물','잠실, 하나의 입체 공간','층을 분리해 건물의 연결 구조를 살펴보세요']:[`${f.name} / ${id==='2.5F'?'중간 회랑':id==='4F'?'상부 통로':'회랑'}`,f.name+' '+(id==='2.5F'?'중간 회랑':id==='4F'?'상부 통로':'내부 회랑'),f.label];
  $('#view-code').textContent=text[0];$('#view-name').textContent=text[1];$('#view-subtitle').textContent=text[2];
}
function setFloor(id){
  if(state.view==='walk')setView('orbit');state.floor=id;
  $$('.floor-button').forEach(b=>{b.classList.toggle('active',b.dataset.floor===id);b.setAttribute('aria-pressed',b.dataset.floor===id);});
  updateFloorHeading(id);
  applyVisibility();renderList();
  if(state.selected&&id!=='all'){const selected=FEATURES.find(f=>f.id===state.selected);if(selected.floor!==id&&!selected.connects?.includes(id))clearSelection();}
  resetCamera();
}
function applyVisibility(){
  renderer.shadowMap.needsUpdate=true;
  const all=state.view==='walk'||state.floor==='all';
  for(const [id,l]of model.layers){
    const own=all||id===state.floor,incoming=CONNECTORS.some(c=>c.from===id&&c.to===state.floor);
    l.group.visible=own||incoming;l.group.position.y=l.baseY+FLOORS.findIndex(f=>f.id===id)*state.explode;
    for(const [name,g]of Object.entries(l.categories))g.visible=own?(state.view==='walk'||name==='slabs'||name==='walls'?true:name==='roof'?state.layers.roof:state.layers[name]):name==='stairs'&&state.layers.stairs;
  }
  for(const c of CONNECTORS)model.featureObjects.get(c.id).visible=all||c.from===state.floor||c.to===state.floor;
  model.envelope.visible=(all||state.floor==='4F')&&(state.view==='walk'||state.layers.roof)&&state.explode===0;model.context.visible=true;model.seats.visible=state.layers.seats;model.outfield.visible=state.layers.seats;
  for(const label of model.seatingLabels)label.visible=state.view!=='walk';
  for(const {group,floor}of model.publicGalleries){group.visible=all||floor===state.floor;group.position.y=FLOORS.findIndex(f=>f.id===floor)*state.explode;}
  for(const [id,g]of model.seatBlocks){const b=SEAT_BLOCK_BY_ID.get(id);g.visible=all||b.floor===state.floor;g.position.y=FLOORS.findIndex(f=>f.id===b.floor)*state.explode;}
  if(state.selected)updateHighlight();
  routing?.visibility();
}
function defaultConnector(floor){const preferred={'1F':'ramp-1b','2F':'mezz-west-lower','2.5F':'mezz-west-upper','3F':'upper-aisle-3','4F':'upper-aisle-3'};return CONNECTORS.find(c=>c.id===preferred[floor]);}
function drawWalkMap(){
  const rings=FLOOR_VOIDS[walker.floor].length?BASE_REGIONS[walker.floor].flat():[FLOOR_POLYGONS[walker.floor]];
  const outline=rings.map(p=>`M ${p.map(v=>v.join(' ')).join(' L ')} Z`).join(' ');
  $('#walk-map').innerHTML=`<path class="map-outline" fill-rule="evenodd" d="${outline}"/>${CONNECTORS.filter(c=>c.from===walker.floor||c.to===walker.floor||c.id===walker.connector).map(c=>`<polyline class="map-connector" points="${c.path.map(p=>p[0]+','+p[2]).join(' ')}"/>`).join('')}<g id="walk-marker"><circle r="4"/><path d="M -3 -6 L 0 -12 L 3 -6"/></g>`;
}
function setView(view,{patrolCamera=false}={}){
  if(!patrolCamera)patrolUI?.detach();
  if(patrolCamera){npcLookYaw=0;npcLookPitch=0;}
  swipeControls?.reset();keys.clear();state.touring=false;updateTourButton();state.view=view;
  $('#walk-hud').hidden=view!=='walk';
  $$('.view-modes button').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-pressed',b.dataset.view===view);});
  $('#viewport').classList.toggle('walking',view==='walk');
  if(view==='walk'){
    routing?.closePanel();
    state.explode=0;$('#explode').value=0;$('#explode-output').value=0;
    camera=perspective;camera.fov=65;camera.updateProjectionMatrix();orbit.object=camera;orbit.enabled=false;transition=null;
    if(!patrolCamera){drawWalkMap();syncWalker();notify(matchMedia('(pointer:coarse)').matches?'왼쪽은 이동, 오른쪽은 시점 조절 · 두 손가락을 함께 사용할 수 있어요.':'현재 자리에서 이어 걷습니다. WASD로 이동하세요.');}
  }else{
    keys.clear();perspective.fov=42;perspective.updateProjectionMatrix();camera=view==='plan'?ortho:perspective;orbit.object=camera;orbit.enabled=true;orbit.enableRotate=view!=='plan';orbit.maxPolarAngle=view==='plan'?Math.PI:Math.PI*.49;
    $('#controls-help').innerHTML=view==='plan'?'드래그 이동 <i>·</i> 스크롤 확대':'드래그 회전 <i>·</i> 스크롤 확대 <i>·</i> 우클릭 이동';
    orbit.mouseButtons.LEFT=view==='plan'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;resetCamera();
  }
  resize();applyVisibility();routing?.update(true);
}
function syncWalker(){
  camera.position.set(walker.x,walker.y+EYE_HEIGHT,walker.z);camera.rotation.set(pitch,yaw,0,'YXZ');
  const active=CONNECTORS.find(c=>c.id===walker.connector),name=FLOORS.find(f=>f.id===walker.floor).name;
  if(state.floor!==walker.floor){state.floor=walker.floor;drawWalkMap();updateFloorHeading(state.floor);$$('.floor-button').forEach(b=>{b.classList.toggle('active',b.dataset.floor===state.floor);b.setAttribute('aria-pressed',b.dataset.floor===state.floor);});renderList();}
  const inGallery=['rear-gallery','upper-gallery','navy-front-gallery'].includes(walker.seatArea),galleryName=walker.seatArea==='navy-front-gallery'?'네이비석 앞 통로':walker.seatArea==='upper-gallery'?'네이비석 뒤 회랑':'외야 뒤 회랑';
  $('#walk-level').textContent=inGallery?galleryName:walker.seating?`${walker.seating}구역${walker.seatRow?' · '+walker.seatRow+'열':''}`:active?`${active.from.replace('F','층')} ↔ ${active.to.replace('F','층')}`:name;
  $('#walk-connection').textContent=walker.seatArea==='navy-front-gallery'?'첫열 앞 통로입니다. 좌석 계단과 진입 계단으로 이어집니다.':inGallery?'좌석 뒤 통로입니다. 계단 입구로 내려갈 수 있어요.':walker.seating?'관람석 계단과 열 사이 통로를 따라 이동하세요.':active?`${active.name} · ${Math.round(projectConnector(walker.x,walker.z,active).along/active.length*100)}%`:'계단과 경사로를 따라 위아래층으로';
  $('#controls-help').textContent=`${inGallery?galleryName:name} · 보행면 ${walker.y.toFixed(1)} m · 층고 추정`;
  $('#walk-marker')?.setAttribute('transform',`translate(${walker.x} ${walker.z}) rotate(${-yaw*180/Math.PI})`);
  routing?.update();
}
function startAtConnector(c,floor){
  const path=connectorRoute(c,floor===c.to),p=path[0],q=path[1];
  walker=createWalker(floor,p[0],p[2]);yaw=Math.atan2(p[0]-q[0],p[2]-q[2]);pitch=-.06;state.touring=false;updateTourButton();
  drawWalkMap();syncWalker();applyVisibility();renderList();
}
let stalledTime=0;
function stepWalk(dt){
  if(state.view!=='walk'||patrolUI?.following||routing?.planning)return;
  if(state.touring){
    const target=tourRoute[tourIndex];
    if(!target){state.touring=false;if(tourPurpose==='route'&&Number.isFinite(routing?.route?.destination.arrivalYaw))yaw=routing.route.destination.arrivalYaw;updateTourButton();notify(tourPurpose==='route'?'선택한 목적지까지 이동했습니다.':'경사로와 계단을 따라 1층부터 4층까지 걸었습니다.');}
    else{
      const dx=target[0]-walker.x,dz=target[2]-walker.z,len=Math.hypot(dx,dz);
      if(len<.04){tourIndex++;stalledTime=0;}
      else{yaw=Math.atan2(-dx,-dz);const next=moveWalker(walker,dx/len*Math.min(len,3*dt),dz/len*Math.min(len,3*dt),model.colliders);stalledTime=Math.hypot(next.x-walker.x,next.z-walker.z)<.001?stalledTime+dt:0;walker=next;
        if(stalledTime>2){state.touring=false;updateTourButton();notify('이동이 막혀 멈췄습니다. 직접 움직이거나 연결로를 다시 선택하세요.');}
      }
    }
  }else{
    const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+swipeForward,side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+swipeSide,speed=(keys.has('ShiftLeft')?10:4.5)*dt/Math.max(1,Math.hypot(forward,side));
    walker=moveWalker(walker,(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed,model.colliders);
  }
  syncWalker();
}
function renderList(){
  const list=FEATURES.filter(f=>(state.floor==='all'||f.floor===state.floor||f.connects?.includes(state.floor))&&(state.filter==='all'||f.type===state.filter||(state.filter==='amenity'&&f.amenity)||(state.filter==='vertical'&&['stair','ramp','elevator'].includes(f.type)))&&(!state.search||`${f.name} ${TYPES[f.type].name} ${f.id} ${f.amenity?.keywords||""}`.toLowerCase().includes(state.search.toLowerCase())));
  $('#feature-count').textContent=String(list.length).padStart(2,'0');
  $('#feature-list').innerHTML=list.length?list.map(f=>`<button class="feature-row ${state.selected===f.id?'selected':''}" data-feature="${f.id}"><span class="feature-icon">${facilityIconSvg(f)||icon(TYPES[f.type].icon)}</span><span><strong>${f.name}</strong><small>${f.connects?f.connects.map(id=>id.replace('F','층')).join(' ↔ '):FLOORS.find(l=>l.id===f.floor).name} · ${f.amenity?.offering||TYPES[f.type].name}</small></span><span class="row-arrow">↗</span></button>`).join(''):'<div class="no-results">일치하는 공간이 없습니다.<br>다른 이름으로 검색해 보세요.</div>';
  $$('.feature-row').forEach(b=>b.addEventListener('click',()=>selectFeature(b.dataset.feature)));
}
function updateHighlight(){const object=model.featureObjects.get(state.selected);if(!object)return;object.updateWorldMatrix(true,true);highlight.box.setFromObject(object);highlight.visible=object.visible&&object.parent.visible&&object.parent.parent.visible;}
function clearSelection(){state.selected=null;highlight.visible=false;$('#selection').innerHTML=`<div class="selection-empty">${icon('cube')}<strong>공간을 선택해 보세요</strong><p>모델이나 목록을 누르면<br>위치와 근거를 확인할 수 있어요.</p></div>`;renderList();}
function selectFeature(id){
  const f=FEATURES.find(f=>f.id===id);if(!f)return;
  routing?.showFacilities();
  if(state.floor!=='all'&&state.floor!==f.floor&&!f.connects?.includes(state.floor))setFloor(f.floor);
  state.selected=id;const source=SOURCES.find(s=>s.id===f.source);
  $('#selection').innerHTML=`<div class="selection-top"><span class="eyebrow">선택한 공간</span><button id="selection-close" aria-label="선택 해제">${icon('close')}</button></div><h3>${facilityLabel(f)}</h3><span class="evidence ${f.evidence}">${f.evidence==='drawing'?'공사 도면에서 추출':f.evidence==='plan'?'안내도 위치 보정':'추정 배치'}</span><p>${f.amenity?f.amenity.offering+"<br>2026.11 공식 안내 확인 · 영업 여부 미확인<br>":""}${f.note}${f.connects?' 연결 높이와 단면은 추정입니다.':''}</p><div class="coordinate-row"><span>X <b>${f.x.toFixed(1)}</b></span><span>Z <b>${f.z.toFixed(1)}</b></span><span>${f.connects?f.connects.map(id=>id.replace('F','층')).join(' ↔ '):f.floor.replace('F','층')}</span></div><a class="source-ref" href="${source.url}" target="_blank" rel="noopener noreferrer">근거 자료 보기 ${icon('link')}</a><button class="focus-btn" id="focus-selection">${icon('eye')} 가까이 보기</button>${f.connects?'<button class="focus-btn" id="walk-selection">'+icon('walk')+' 연결로 입구에서 걷기</button>':''}`;
  $('#selection-close').onclick=clearSelection;
  $('#focus-selection').onclick=()=>{if(state.view==='walk')setView('orbit');const y=floorHeight(state.floor==='all'?f.floor:state.floor);fly([f.x+22,y+24,f.z+28],[f.x,y+1.2,f.z]);};
  if(f.connects)$('#walk-selection').onclick=()=>{const floor=f.connects.includes(state.floor)?state.floor:f.floor;setView('walk');startAtConnector(CONNECTORS.find(c=>c.id===f.id),floor);};
  if(f.amenity||f.type==='gate'||f.type==='restroom'||f.id.startsWith('section-')||f.id==='door-37'){
    $('#selection').insertAdjacentHTML('beforeend',`<button class="focus-btn" id="route-selection">${icon('arrow')} 이곳으로 길찾기</button>`);
    $('#route-selection').onclick=()=>routing.selectFeature(f);
  }
  if(START_LOCATIONS.some(location=>location.id===f.id)){
    $('#selection').insertAdjacentHTML('beforeend',`<button class="focus-btn" id="start-selection">${icon('walk')} 여기서 출발</button>`);
    $('#start-selection').onclick=()=>routing.selectOrigin(f.id);
  }
  updateHighlight();renderList();
  if(state.view!=='walk'){const target=new THREE.Vector3(f.x,floorHeight(state.floor==='all'?f.floor:state.floor)+1,f.z),offset=camera.position.clone().sub(orbit.target).normalize().multiplyScalar(state.view==='plan'?260:125);fly(target.clone().add(offset).toArray(),target.toArray());}
}
let down=null,dragging=false;const pickPointers=new Set();
inputSurface.addEventListener('pointerdown',e=>{if(state.view==='walk'&&e.pointerType!=='mouse')return;pickPointers.add(e.pointerId);down=pickPointers.size===1?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;dragging=true;if(state.view==='walk')renderer.domElement.setPointerCapture(e.pointerId);});
inputSurface.addEventListener('pointermove',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)down=null;if(state.view==='walk'&&e.pointerType!=='mouse')return;if(state.view==='walk'&&dragging){if(patrolUI?.following){npcLookYaw-=e.movementX*.003;npcLookPitch=THREE.MathUtils.clamp(npcLookPitch-e.movementY*.003,-1.1,1.1);}else{yaw-=e.movementX*.003;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.003,-1.2,1.2);}}});
inputSurface.addEventListener('pointerup',e=>{
  dragging=false;pickPointers.delete(e.pointerId);if(!down||down.id!==e.pointerId)return;const distance=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(distance>5||state.view==='walk')return;
  const rect=inputSurface.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(model.pickables).filter(hit=>{let o=hit.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});
  for(const hit of hits){if(hit.object.userData.addresses&&hit.instanceId!==undefined){routing.selectSeat(hit.object.userData.addresses[hit.instanceId]);break;}let o=hit.object;while(o&&!o.userData.featureId)o=o.parent;if(o){selectFeature(o.userData.featureId);break;}}
});
inputSurface.addEventListener('pointercancel',e=>{pickPointers.delete(e.pointerId);dragging=false;down=null;});window.addEventListener('pointerup',()=>dragging=false);
function stopTour(){state.touring=false;updateTourButton();}
window.addEventListener('keydown',e=>{
  if(e.target.matches?.('input,textarea,select,button')||$('#source-dialog').open)return;
  if(e.code==='Escape'&&state.view==='walk'){setView('orbit');return;}
  if(state.view==='walk'&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft'].includes(e.code)){e.preventDefault();if(patrolUI?.following){patrolUI.pause();patrolUI.detach();}stopTour();keys.add(e.code);}
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();dragging=false;});document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();dragging=false;}});
$('#walk-hud').insertAdjacentHTML('beforeend','<div id="walk-touch-controls" aria-hidden="true"><span class="touch-half-hint touch-left-hint">왼쪽 · 이동</span><span class="touch-half-hint touch-right-hint">오른쪽 · 시점</span><span id="move-stick" hidden><i></i></span><span id="look-stick" hidden></span></div>');
$('.touch-walk-help').innerHTML='왼쪽 화면으로 이동 · 오른쪽 화면으로 둘러보기<br>두 손가락으로 동시에 조작 · 손을 떼면 정지';
$$('.view-modes button').forEach(b=>b.setAttribute('aria-label',b.textContent.trim()));
swipeControls=mountSwipeWalking(inputSurface,{
  enabled:()=>state.view==='walk'&&!patrolUI?.following,
  onBegin:()=>{stopTour();keys.clear();renderer.domElement.focus({preventScroll:true});},
  onMove:({forward,side})=>{swipeForward=forward;swipeSide=side;},
  onLook:(dx,dy)=>{yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch-dy*.002,-1.1,1.1);},
  onState:({move,look})=>{
    for(const [id,p]of [['move-stick',move],['look-stick',look]]){const el=$('#'+id);el.hidden=!p;if(p){el.style.left=p.x+'px';el.style.top=p.y+'px';}}
    if(move)$('#move-stick i').style.transform=`translate(${move.dx}px,${move.dy}px)`;
    $('#walk-touch-controls').classList.toggle('touch-active',!!move||!!look);
  },
});
window.addEventListener('inside:layout-changing',e=>{canvasInput.cancelPointers();keys.clear();swipeControls.reset();dragging=false;down=null;pickPointers.clear();if(e.detail.orientationChanged){stopTour();patrolUI?.pause();}});
window.addEventListener('inside:layout-ready',()=>resize());
$$('[data-floor]').forEach(b=>b.onclick=()=>setFloor(b.dataset.floor));$$('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$$('[data-layer]').forEach(input=>input.onchange=()=>{state.layers[input.dataset.layer]=input.checked;applyVisibility();});
$('#layers-reset').onclick=()=>{$$('[data-layer]').forEach(i=>{i.checked=true;state.layers[i.dataset.layer]=i.checked;});applyVisibility();};
$$('[data-filter]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;$$('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderList();});
$('#search').oninput=e=>{state.search=e.target.value;renderList();};
$('#explode').oninput=e=>{patrolUI?.pause();if(state.view==='walk')setView('orbit');state.explode=Number(e.target.value);$('#explode-output').value=state.explode;if(state.floor!=='all')setFloor('all');applyVisibility();};
$('#camera-reset').onclick=resetCamera;
function zoom(amount){if(state.view==='walk')return;transition=null;if(camera.isOrthographicCamera){camera.zoom=THREE.MathUtils.clamp(camera.zoom*amount,.5,6);camera.updateProjectionMatrix();}else{const offset=camera.position.clone().sub(orbit.target);camera.position.copy(orbit.target).addScaledVector(offset,1/amount);}}
$('#zoom-in').onclick=()=>zoom(1.2);$('#zoom-out').onclick=()=>zoom(1/1.2);
$('#sources-open').onclick=$('#notes-open').onclick=()=>$('#source-dialog').showModal();$('#sources-close').onclick=()=>$('#source-dialog').close();$('#source-dialog').onclick=e=>{if(e.target===$('#source-dialog'))$('#source-dialog').close();};
function updateTourButton(){$('#tour').innerHTML=icon(state.touring?'pause':'play')+`<span>${state.touring?'이어 걷기 멈추기':'전 층 이어 걷기'}</span>`;$('#tour').classList.toggle('tour-active',state.touring);}
$('#tour').onclick=()=>{
  if(state.touring){stopTour();return;}
  routing?.clear();tourPurpose='full';
  try{const route=createFullTour(model.colliders);setView('walk');startAtConnector(CONNECTORS.find(c=>c.id==='ramp-1b'),'1F');tourRoute=route;tourIndex=1;stalledTime=0;state.touring=true;updateTourButton();notify('1층 → 2층 → 2.5층 → 3층 → 4층을 이어 걷습니다. 스와이프 또는 WASD로 멈출 수 있어요.');}
  catch(error){console.error(error);notify('이어 걷기 경로를 만들지 못했습니다. 연결로를 선택해 직접 걸을 수 있습니다.');}
};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#export-data').onclick=()=>{download(new Blob([JSON.stringify({meta:META,amenityReviewedAt:AMENITY_REVIEWED_AT,unlocatedAmenities:UNLOCATED_AMENITIES,floors:FLOORS,floorPolygons:FLOOR_POLYGONS,navigationSurfaces:BASE_REGIONS,origins:ORIGINS,destinations:DESTINATIONS,sources:[...SOURCES,...SEAT_SOURCES],seatBlocks:SEAT_BLOCKS,seatStats:SEAT_STATS,features:FEATURES,columns:model.colliders.filter(c=>c.type==='column'),columnAxes:COLUMNS,connectors:CONNECTORS,outfieldAccesses:OUTFIELD_ACCESSES,upperPublicGallery:UPPER_GALLERY,canopyFrame:CANOPY_FRAME,navyEntrances:NAVY_ENTRIES,navyFrontGallery:NAVY_FRONT,concoursePortalFrames:CONCOURSE_FRAME,entryCanopy:ENTRY_CANOPY,entryDoorFrame:ENTRY_DOOR_FRAME,entryHall:ENTRY_HALL,concourseHall:CONCOURSE_HALL,concourseRamp:CONCOURSE_RAMP,concourseInspectionTargets:CONCOURSE_INSPECTION_TARGETS,floorVoids:FLOOR_VOIDS,outfieldRearGallery:{...OUTFIELD_REAR,geometryEvidence:'partial-photo-cross-check',dimensionEvidence:'inferred',locationEvidence:'inferred'},restrictedZones:model.restrictedZones,structureDetails:model.structureDetails,selectedRoute:routing?.route},null,2)],{type:'application/json'}),'jamsil-layout.json');notify('시설 좌표와 근거 자료를 저장했습니다.');};
$('#export-glb').onclick=async()=>{
  const btn=$('#export-glb');btn.disabled=true;btn.innerHTML=icon('down')+'<span>모델 만드는 중…</span>';
  try{const clone=model.root.clone(true);clone.userData={...META,structureDetails:model.structureDetails,connectors:CONNECTORS,outfieldAccesses:OUTFIELD_ACCESSES,upperPublicGallery:UPPER_GALLERY,canopyFrame:CANOPY_FRAME,navyEntrances:NAVY_ENTRIES,navyFrontGallery:NAVY_FRONT,concoursePortalFrames:CONCOURSE_FRAME,entryCanopy:ENTRY_CANOPY,entryDoorFrame:ENTRY_DOOR_FRAME,entryHall:ENTRY_HALL,concourseHall:CONCOURSE_HALL,concourseRamp:CONCOURSE_RAMP,concourseInspectionTargets:CONCOURSE_INSPECTION_TARGETS,floorVoids:FLOOR_VOIDS,outfieldRearGallery:{...OUTFIELD_REAR,geometryEvidence:'partial-photo-cross-check',dimensionEvidence:'inferred',locationEvidence:'inferred'}};for(const f of FLOORS)clone.getObjectByName(f.id).position.y=f.y;for(const b of SEAT_BLOCKS)clone.getObjectByName(`section_${b.id}`).position.y=0;for(const {group}of model.publicGalleries)clone.getObjectByName(group.name).position.y=0;clone.traverse(o=>o.visible=true);clone.updateMatrixWorld(true);
    const result=await new GLTFExporter().parseAsync(clone,{binary:true,onlyVisible:false});download(new Blob([result],{type:'model/gltf-binary'}),'jamsil-graybox.glb');notify('전체 모델을 GLB로 저장했습니다. Blender 등에서 열 수 있어요.');
  }catch(error){console.error(error);notify('모델 저장에 실패했습니다. 다시 시도해 주세요.');}finally{btn.disabled=false;btn.innerHTML=icon('down')+'<span>3D 모델 저장</span>';}
};
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;if(!w||!h)return;renderer.setSize(w,h);scene.userData.renderDirty=true;perspective.aspect=w/h;perspective.updateProjectionMatrix();const aspect=w/h;ortho.left=-170*aspect;ortho.right=170*aspect;ortho.top=170;ortho.bottom=-170;ortho.updateProjectionMatrix();}
new ResizeObserver(resize).observe(viewport);
const projected=new THREE.Vector3();let frame=0,last=performance.now(),lastRender=0,lastPose='';
function animate(now){
  requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden)return;
  if(transition){const t=Math.min((now-transition.start)/transition.duration,1),e=1-(1-t)**3;camera.position.lerpVectors(transition.from,transition.to,e);orbit.target.lerpVectors(transition.fromTarget,transition.toTarget,e);if(t===1)transition=null;}
  if(state.view==='walk'){if(!manualClock)stepWalk(dt);}else orbit.update();
  if(!manualClock)patrolUI?.update(dt);
  const pose=[...camera.position.toArray(),...camera.quaternion.toArray(),camera.zoom,camera.aspect].join(',');
  if(now-lastRender>=32&&(renderer.shadowMap.needsUpdate||scene.userData.renderDirty||pose!==lastPose)){renderer.render(scene,camera);lastRender=now;lastPose=pose;scene.userData.renderDirty=false;}
  if(frame++%3===0){const w=viewport.clientWidth,h=viewport.clientHeight,origin=orbit.target.clone().project(camera),right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
    const perMeter=orbit.target.clone().add(right).project(camera).sub(origin).length()*w/2,distance=perMeter>8?5:perMeter>3?10:perMeter>1?20:50,scale=$('.scale');scale.style.visibility=state.view==='walk'?'hidden':'visible';scale.innerHTML=`<b style="width:${Math.max(10,Math.min(150,perMeter*distance))}px"></b>약 ${distance} m`;
    for(const [id,el]of labelNodes){const f=FEATURES.find(f=>f.id===id),enabled=(state.floor==='all'||f.floor===state.floor||f.connects?.includes(state.floor))&&state.view!=='walk'&&state.layers[f.type==='restroom'?'rooms':['stair','ramp'].includes(f.type)?'stairs':'doors'];
      const y=floorHeight(state.floor==='all'?f.floor:state.floor);projected.set(f.x,y+5,f.z).project(camera);
      const visible=enabled&&projected.z<1&&Math.abs(projected.x)<.95&&Math.abs(projected.y)<.9&&(f.type==='gate'||f.id===state.selected||(state.view==='plan'&&perMeter>4));el.style.display=visible?'block':'none';if(visible){el.style.left=`${(projected.x*.5+.5)*w}px`;el.style.top=`${(-projected.y*.5+.5)*h}px`;el.classList.toggle('selected',id===state.selected);}
    }
  }
}
routing=mountRouting({model,scene,getState:()=>state,getWalker:()=>walker,notify,cancelWalking:stopTour,prepareRouting:()=>{stopTour();keys.clear();swipeControls.reset();if(patrolUI?.following){patrolUI.pause();patrolUI.detach();}state.explode=0;$('#explode').value=0;$('#explode-output').value=0;applyVisibility();},setStartLocation:id=>{
  const start=startingPosition(id,model.colliders);
  stopTour();keys.clear();swipeControls.reset();patrolUI?.pause();patrolUI?.detach();
  walker=start.walker;yaw=start.yaw;pitch=-.08;clearSelection();setView('walk');
  notify(start.feature.name+'에서 출발합니다.');return {...walker};
},startWalk:route=>{
  setView('walk');keys.clear();swipeControls.reset();const p=[walker.x,walker.y,walker.z],q=route.points.find(q=>Math.hypot(q[0]-p[0],q[2]-p[2])>.2)||route.points.at(-1);
  walker={...walker,seatTarget:route.walkSection};yaw=Math.atan2(p[0]-q[0],p[2]-q[2]);pitch=-.12;state.touring=false;updateTourButton();drawWalkMap();syncWalker();applyVisibility();routing.update(true);renderer.domElement.focus({preventScroll:true});

}});
patrolUI=mountPatrol({model,scene,download,notify,prepare:()=>{stopTour();state.explode=0;$('#explode').value=0;$('#explode-output').value=0;if(patrolUI?.following)applyVisibility();else setFloor('all');},follow:(w,direction,lookPitch=-.08)=>{
  if(state.view!=='walk')setView('walk',{patrolCamera:true});
  const changed=walker.floor!==w.floor;walker=w;yaw=direction+npcLookYaw;pitch=THREE.MathUtils.clamp(lookPitch+npcLookPitch,-1.1,1.1);if(changed||!$('#walk-marker'))drawWalkMap();syncWalker();
},release:()=>{setView('orbit');setFloor('all');}});
yaw=Math.atan2(initialPath[0][0]-initialPath[1][0],initialPath[0][2]-initialPath[1][2]);
perspective.position.set(265,250,305);orbit.update();applyVisibility();renderList();resize();setFloor('all');requestAnimationFrame(animate);
$('#model-stats').textContent=`5개 층 · ${FEATURES.length}개 시설 · ${model.columnCount}개 기둥 · ${CONNECTORS.length}개 층 연결 · ${SEAT_STATS.blocks}개 좌석 구역`;$('#loading').classList.add('loaded');
window.render_game_to_text=()=>JSON.stringify({mode:state.view,floor:walker.floor,position:{x:+walker.x.toFixed(3),y:+walker.y.toFixed(3),z:+walker.z.toFixed(3)},eyeY:+camera.position.y.toFixed(3),connector:walker.connector,seating:walker.seating??null,seatRow:walker.seatRow??null,coordinates:'metres; +X first base, +Y up, +Z behind home plate',touring:state.touring,route:routing?.textState(),npc:patrolUI?.snapshot()});
window.advanceTime=ms=>{manualClock=true;for(let t=0;t<ms;t+=16.6667){const dt=Math.min(16.6667,ms-t)/1000;stepWalk(dt);patrolUI?.update(dt);}routing?.update(true);renderer.render(scene,camera);return window.render_game_to_text();};
window.__INSIDE__={state,model,scene,get camera(){return camera;},get walker(){return {...walker};},renderer,get route(){return routing?.route;},patrol:patrolUI,features:FEATURES,connectors:CONNECTORS,seatBlocks:SEAT_BLOCKS,canWalk:(x,z)=>canWalk(x,z,model.colliders,walker.floor),resumeAnimation:()=>manualClock=false};
