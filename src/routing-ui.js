import * as THREE from 'three';
import {facilityLabel} from './facility-icons.js';
import {ORIGINS,DESTINATIONS,routeProgress} from './route-planner.js';
import {CONNECTORS,FLOORS} from './data.js';
import {mountSeatInput} from './seat-input.js';
import {UNLOCATED_AMENITIES} from './amenity-catalogue.js';
import {START_LOCATIONS} from './starting-position.js';
import {UNAVAILABLE_ROUTE_MESSAGE} from './route-input.js';
import {currentPositionOrigin} from './current-position-route.js';
import {createGuidanceLine,createPaintSurfaceSampler} from './guidance-line.js';
const ROUTE_TARGETS=[...DESTINATIONS,...ORIGINS];
const matches=(f,q)=>q.trim().toLowerCase().split(/\s+/).every(word=>(f.name+' '+f.floor+' '+f.floor.replace('F','층')+' '+f.id+' '+(f.amenity?Object.values(f.amenity).join(' '):'')).toLowerCase().includes(word));

export function mountRouting({model,scene,getState,getWalker,startWalk,setStartLocation,cancelWalking,prepareRouting,notify}){
  const $=s=>document.querySelector(s),inspector=$('.inspector');
  inspector.classList.add('route-mode');
  inspector.insertAdjacentHTML('afterbegin',`<div class="inspector-tabs" role="group" aria-label="탐색 패널"><button id="route-tab" aria-pressed="true">길찾기</button><button id="facilities-tab" aria-pressed="false">시설 목록</button></div><section class="routing" aria-label="길찾기"><form id="route-form"><div class="route-origin"><label>출발 위치<select id="route-from" aria-label="출발 위치"><option value="current">현재 위치</option>${['1F','2F'].map(floor=>`<optgroup label="${floor.replace('F','층')}">${START_LOCATIONS.filter(f=>f.floor===floor).map(f=>`<option value="${f.id}">${f.name}</option>`).join('')}</optgroup>`).join('')}</select><small id="route-origin-location"></small></label></div><label>목적지<input id="route-search" type="search" placeholder="화장실, 수유실, 매장 검색" aria-label="길찾기 목적지 검색"/><select id="route-to" aria-label="길찾기 목적지"></select></label><div class="route-actions"><button type="submit" class="btn primary" id="route-find">길찾기</button></div></form><div id="route-result" role="status" aria-live="polite"></div></section>`);
  $('#viewport').insertAdjacentHTML('beforeend','<div id="route-guidance" hidden><span>길 안내</span><strong id="route-next"></strong><small id="route-remaining"></small><button id="route-recalculate" hidden>여기서 다시 안내</button></div>');
  inspector.insertAdjacentHTML('afterbegin','<button id="panel-toggle" class="panel-toggle" aria-expanded="false" aria-controls="navigation-panel"><span class="sheet-grip"></span><span><strong>길찾기</strong><small id="panel-summary">현재 위치에서 길찾기</small></span><b aria-hidden="true">⌃</b></button>');
  inspector.id='navigation-panel';
  const openPanel=open=>{if(inspector.classList.contains('panel-open')!==open)window.dispatchEvent(new CustomEvent('inside:layout-changing',{detail:{orientationChanged:false}}));inspector.classList.toggle('panel-open',open);$('#panel-toggle').setAttribute('aria-expanded',String(open));$('#panel-toggle').setAttribute('aria-label',open?'목적지 패널 접기':'목적지 패널 열기');};
  $('#panel-toggle').setAttribute('aria-label','목적지 패널 열기');
  $('#panel-toggle').onclick=()=>openPanel(!inspector.classList.contains('panel-open'));
  const tab=route=>{inspector.classList.toggle('route-mode',route);$('#route-tab').setAttribute('aria-pressed',route);$('#facilities-tab').setAttribute('aria-pressed',!route);};
  $('#route-tab').onclick=()=>tab(true);$('#facilities-tab').onclick=()=>tab(false);
  $('#route-search').placeholder='수유실, 편의점, 커피, 유니폼…';
  $('#route-to').insertAdjacentHTML('afterend','<span id="amenity-preview"></span><span id="unlocated-amenities"></span>');
  function preview(){const f=ROUTE_TARGETS.find(f=>f.id===$('#route-to').value);
    $('#amenity-preview').innerHTML=f?`<span class="amenity-card"><strong>${facilityLabel(f)}</strong><span>${f.floor.replace('F','층')}${f.amenity?' · '+f.amenity.category:''}</span></span>`:'';
  }
  const options=()=>{const query=$('#route-search').value,old=$('#route-to').value,items=ROUTE_TARGETS.filter(f=>matches(f,query));$('#route-to').innerHTML=['amenity','restroom','seat','entrance'].map(kind=>`<optgroup label="${{amenity:'편의시설 · 매장 앞',seat:'좌석 구역 진입부',restroom:'화장실 입구',entrance:'출입구'}[kind]}">${items.filter(f=>f.kind===kind).map(f=>`<option value="${f.id}">${f.name} · ${f.floor.replace('F','층')}</option>`).join('')}</optgroup>`).join('');if(items.some(f=>f.id===old))$('#route-to').value=old;$('#route-find').disabled=!items.length;$('#route-to').disabled=!items.length;preview();
    const unknown=UNLOCATED_AMENITIES.filter(f=>matches(f,query));$('#unlocated-amenities').innerHTML=unknown.length?`<span class="unlocated-card">${unknown.map(f=>`<strong>${f.name}</strong><span>${f.location} · 경로 제공 전</span>`).join('')}<small>공식 안내에는 등록되어 있으나 출입 위치가 확인되지 않았습니다.</small></span>`:!items.length?'<span class="unlocated-card">검색 결과가 없습니다.</span>':'';
  };
  options();$('#route-to').value='section-207';$('#route-search').oninput=options;
  let route=null,progress=null,requestId=0,worker=null,workerBusy=false,lastUpdate=0,arrivalNotified=false,seatInput=null;
  const group=new THREE.Group();group.name='wayfinding_overlay';scene.add(group);
  const material=new THREE.MeshBasicMaterial({color:0xffad16,toneMapped:false,side:THREE.DoubleSide,depthTest:true,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  const edgeMaterial=new THREE.MeshBasicMaterial({color:0xfffbe8,toneMapped:false,side:THREE.DoubleSide,depthTest:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const outlineMaterial=new THREE.MeshBasicMaterial({color:0x594121,toneMapped:false,side:THREE.DoubleSide,depthTest:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  function disposePath(){scene.userData.renderDirty=true;for(const child of [...group.children]){child.traverse(o=>o.geometry?.dispose());group.remove(child);}}
  function draw(){
    disposePath();if(!route)return;
    const surface=createPaintSurfaceSampler(model.root);
    for(const leg of route.legs){
      const g=new THREE.Group();g.userData={floor:leg.floor,toFloor:leg.toFloor};group.add(g);
      const width=leg.kind==='seat-row'?.32:leg.kind?.startsWith('seat-')?.48:leg.kind==='stair'?.8:.72;
      const outline=createGuidanceLine(leg.points,width+.18,outlineMaterial,surface),edge=createGuidanceLine(leg.points,width+.1,edgeMaterial,surface),paint=createGuidanceLine(leg.points,width,material,surface);
      if(outline)g.add(outline);if(edge){edge.position.y=.003;edge.renderOrder=13;g.add(edge);}if(paint){paint.position.y=.006;paint.renderOrder=14;g.add(paint);}
    }
    visibility();
  }
  const description=l=>l.name|| (l.connector?`${CONNECTORS.find(c=>c.id===l.connector).name} · ${l.floor.replace('F','층')} → ${l.toFloor.replace('F','층')}`:`${FLOORS.find(f=>f.id===l.floor).name} 회랑`);
  function visibility(){const state=getState();for(const g of group.children)g.visible=state.floor==='all'||g.userData.floor===state.floor||g.userData.toFloor===state.floor;}
  function invalidate(){cancelWalking?.();requestId++;if(workerBusy){worker?.terminate();worker=null;}workerBusy=false;route=null;progress=null;arrivalNotified=false;disposePath();$('#route-guidance').hidden=true;$('#route-result').textContent='';selectedDestination=null;$('#explode').disabled=false;$('#route-find').disabled=seatInput?.mode==='seat'?false:!$('#route-to').value;$('#walk-map .map-route')?.remove();}
  function clear(){invalidate();}
  function showError(message){$('#route-result').textContent=message;openPanel(true);requestAnimationFrame(()=>$('#route-result').scrollIntoView({block:'nearest',inline:'nearest'}));}
  // Editing endpoints immediately invalidates the old route and any stale reply.
  $('#route-to').onchange=()=>{invalidate();preview();};
  $('#route-search').addEventListener('input',invalidate);
  let selectedDestination=null,selectedStart=null;
  seatInput=mountSeatInput({invalidate});
  function calculate(to){
    invalidate();prepareRouting?.();selectedDestination=to;
    const from=currentPositionOrigin(getWalker()),id=++requestId;
    $('#route-result').textContent='현재 위치에서 이어지는 통로를 찾는 중…';$('#route-find').disabled=true;
    const fresh=!worker;worker??=new Worker(new URL('./route-worker.js',import.meta.url),{type:'module'});workerBusy=true;
    worker.onmessage=({data})=>{if(data.id!==requestId)return;workerBusy=false;$('#route-find').disabled=false;
      if(data.error){showError(UNAVAILABLE_ROUTE_MESSAGE);return;}
      const w=getWalker();
      if(Math.hypot(w.x-from.x,w.y-from.y,w.z-from.z)>.05||w.floor!==from.floor){calculate(to);return;}
      route=data.route;$('#route-result').innerHTML=`<strong>${facilityLabel(to,route.destination.name)}</strong><small>약 ${Math.round(route.distance)} m</small>`;
      $('#explode').disabled=true;
      startWalk(route);draw();openPanel(false);
      $('#panel-summary').innerHTML=facilityLabel(to,route.destination.name);
      notify('바닥 유도선을 따라 이동하세요.');
    };
    worker.onerror=()=>{if(id===requestId){workerBusy=false;worker?.terminate();worker=null;$('#route-result').textContent='경로 계산을 시작하지 못했습니다. 다시 시도해 주세요.';$('#route-find').disabled=false;}};
    worker.postMessage({id,from,to,colliders:fresh?model.colliders:undefined});
  }
  $('#route-form').onsubmit=e=>{
    e.preventDefault();document.activeElement?.blur();let to;
    try{to=seatInput.mode==='seat'?seatInput.destination():ROUTE_TARGETS.find(f=>f.id===$('#route-to').value);}catch(error){invalidate();showError(error.message);return;}
    if(to)calculate(to);
  };
  function selectOrigin(id){
    if(id==='current'){selectedStart=null;invalidate();return;}
    try{
      const w=setStartLocation(id);invalidate();selectedStart={id,x:w.x,y:w.y,z:w.z,floor:w.floor};
      $('#route-from').value=id;tab(true);openPanel(true);update(true);
    }catch{showError(UNAVAILABLE_ROUTE_MESSAGE);$('#route-from').value=selectedStart?.id??'current';}
  }
  $('#route-from').onchange=()=>selectOrigin($('#route-from').value);
  $('#route-recalculate').onclick=()=>{if(selectedDestination)calculate(selectedDestination);};
  function update(force=false){
    const w=getWalker();if(selectedStart&&(w.floor!==selectedStart.floor||Math.hypot(w.x-selectedStart.x,w.y-selectedStart.y,w.z-selectedStart.z)>.5)){selectedStart=null;$('#route-from').value='current';}
    $('#route-origin-location').textContent=`${w.seating?w.seating+'구역':w.connector?'계단·경사로 위':w.floor.replace('F','층')} · 현재 위치`;
    $('#route-from option[value="current"]').textContent='현재 위치 · '+(w.seating?w.seating+'구역':w.floor.replace('F','층'));
    if(!route||getState().view!=='walk'){$('#route-guidance').hidden=true;return;}
    const now=performance.now();if(!force&&now-lastUpdate<80)return;lastUpdate=now;
    progress=routeProgress(route,getWalker());$('#route-guidance').hidden=false;
    $('#route-next').textContent=progress.arrived?'목적지에 도착했습니다':progress.offRoute?'현재 위치에서 경로를 다시 찾을 수 있어요':description(route.legs[progress.legIndex]);
    $('#route-recalculate').hidden=!progress.offRoute;
    $('#route-remaining').innerHTML=progress.arrived?facilityLabel(selectedDestination,route.destination.name):progress.offRoute?`경로에서 약 ${Math.round(progress.distance)} m 벗어남`:`남은 거리 약 ${Math.round(progress.remaining)} m · ${facilityLabel(selectedDestination,route.destination.name)}`;
    if(progress.arrived&&!arrivalNotified){arrivalNotified=true;notify(route.destination.name+'에 도착했습니다.');}
    const map=$('#walk-map');let overlay=map.querySelector('.map-route');if(!overlay){overlay=document.createElementNS('http://www.w3.org/2000/svg','g');overlay.setAttribute('class','map-route');map.insertBefore(overlay,map.querySelector('#walk-marker'));}
    overlay.innerHTML=route.legs.filter(l=>l.floor===getWalker().floor||l.toFloor===getWalker().floor).map(l=>`<polyline points="${l.points.map(p=>p[0]+','+p[2]).join(' ')}"/>`).join('');visibility();
  }
  function selectFeature(f){if(ROUTE_TARGETS.some(d=>d.id===f.id)){seatInput.showFacilities();$('#route-search').value='';options();$('#route-to').value=f.id;preview();invalidate();tab(true);openPanel(true);}}
  return {visibility,update,selectFeature,selectOrigin,closePanel:()=>openPanel(false),selectSeat:address=>{tab(true);seatInput.select(address);openPanel(true);},showFacilities:()=>{tab(false);openPanel(true);},clear,get planning(){return workerBusy;},get route(){return route;},textState:()=>route?{destination:route.destination.id,distance:Math.round(route.distance),transfers:route.transfers,remaining:progress?Math.round(progress.remaining):null,arrived:progress?.arrived??false,offRoute:progress?.offRoute??false}:null};
}
