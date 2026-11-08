import {userSeatDestination} from './route-input.js';

export function mountSeatInput({invalidate}){
  const $=s=>document.querySelector(s),form=$('#route-form');let mode='seat';
  form.querySelector('.route-origin').insertAdjacentHTML('afterend','<div class="destination-modes" role="group" aria-label="목적지 종류"><button type="button" data-destination="seat" aria-pressed="true">좌석</button><button type="button" data-destination="facility" aria-pressed="false">시설</button></div>');
  form.querySelector('.route-actions').insertAdjacentHTML('beforebegin','<div class="seat-input"><label>좌석 구역<input id="seat-section" inputmode="numeric" placeholder="예: 207" aria-label="좌석 구역" autocomplete="off"/></label><div class="seat-address"><label>열 <span class="field-optional">선택</span><input id="seat-row" inputmode="numeric" placeholder="예: 8" aria-label="좌석 열" autocomplete="off"/></label><label>번호 <span class="field-optional">선택</span><input id="seat-number" inputmode="numeric" placeholder="예: 87" aria-label="좌석 번호" autocomplete="off"/></label></div></div>');
  function setMode(next){
    mode=next;$('.seat-input').hidden=mode!=='seat';$('#route-to').closest('label').hidden=mode==='seat';
    document.querySelectorAll('[data-destination]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.destination===mode));
    invalidate();
  }
  document.querySelectorAll('[data-destination]').forEach(b=>b.onclick=()=>setMode(b.dataset.destination));
  for(const id of ['seat-section','seat-row','seat-number'])$('#'+id).addEventListener('input',invalidate);
  setMode('seat');
  return {
    get mode(){return mode;},
    destination:()=>userSeatDestination($('#seat-section').value,$('#seat-row').value,$('#seat-number').value),
    select(address){$('#seat-section').value=address.section;$('#seat-row').value=address.row??'';$('#seat-number').value=address.number??'';setMode('seat');},
    showFacilities:()=>setMode('facility'),
  };
}
