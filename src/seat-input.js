import {userSeatDestination} from './route-input.js';
import {mountSeatKeypad} from './seat-keypad.js';
import {mountTicketScan} from './ticket-scan.js';

export function mountSeatInput({invalidate}){
  const $=s=>document.querySelector(s),form=$('#route-form');let mode='seat';
  form.querySelector('.route-origin').insertAdjacentHTML('afterend','<div class="destination-modes" role="group" aria-label="목적지 종류"><button type="button" data-destination="seat" aria-pressed="true">좌석</button><button type="button" data-destination="facility" aria-pressed="false">시설</button></div>');
  form.querySelector('.route-actions').insertAdjacentHTML('beforebegin',`<div class="seat-input"><div class="seat-entry-heading"><span>직접 입력</span><button type="button" id="ticket-scan-open">티켓 사진 스캔</button></div><label>좌석 구역<input id="seat-section" inputmode="numeric" maxlength="3" data-seat-label="구역" placeholder="예: 207" aria-label="좌석 구역" aria-describedby="seat-section-help" autocomplete="off"/></label><p id="seat-section-help">열·번호는 구역마다 반복돼요. 티켓의 구역도 입력해 주세요.</p><div class="seat-address"><label>열 <span class="field-optional">선택</span><input id="seat-row" inputmode="numeric" maxlength="2" data-seat-label="열" placeholder="예: 8" aria-label="좌석 열" autocomplete="off"/></label><label>번호 <span class="field-optional">선택</span><input id="seat-number" inputmode="numeric" maxlength="4" data-seat-label="번호" placeholder="예: 87" aria-label="좌석 번호" autocomplete="off"/></label></div><p id="ticket-input-status" role="status" aria-live="polite" hidden></p></div>`);
  const inputs=['seat-section','seat-row','seat-number'].map(id=>$('#'+id));
  const keypad=mountSeatKeypad(inputs);
  mountTicketScan({button:$('#ticket-scan-open'),onApply:address=>{
    // Replace the entire address so a partially read ticket cannot silently
    // borrow a row or number from the previous ticket.
    inputs.forEach((input,i)=>input.value=address[['section','row','number'][i]]||'');
    $('#ticket-input-status').hidden=false;
    $('#ticket-input-status').textContent='사진에서 입력했어요. 티켓과 대조하고 빈 칸을 확인해 주세요.';
    invalidate();
  }});
  function setMode(next){
    keypad.close();
    mode=next;$('.seat-input').hidden=mode!=='seat';$('#route-to').closest('label').hidden=mode==='seat';
    document.querySelectorAll('[data-destination]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.destination===mode));
    invalidate();
  }
  document.querySelectorAll('[data-destination]').forEach(b=>b.onclick=()=>setMode(b.dataset.destination));
  for(const input of inputs)input.addEventListener('input',()=>{$('#ticket-input-status').hidden=true;invalidate();});
  setMode('seat');
  return {
    get mode(){return mode;},
    destination:()=>userSeatDestination($('#seat-section').value,$('#seat-row').value,$('#seat-number').value),
    select(address){$('#seat-section').value=address.section;$('#seat-row').value=address.row??'';$('#seat-number').value=address.number??'';$('#ticket-input-status').hidden=true;setMode('seat');},
    showFacilities:()=>setMode('facility'),
  };
}
