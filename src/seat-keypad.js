export function mountSeatKeypad(inputs){
  const app=document.querySelector('#app');
  const overlay=document.createElement('div');
  overlay.className='seat-overlay';overlay.id='seat-keypad';overlay.hidden=true;
  overlay.innerHTML=`<section class="seat-keypad-card" role="dialog" aria-modal="true" aria-labelledby="keypad-title"><header><div><small>직접 입력</small><h2 id="keypad-title">내 좌석 입력</h2></div><button type="button" data-close aria-label="숫자 키패드 닫기">닫기</button></header><div class="keypad-body"><div class="keypad-fields">${inputs.map((input,i)=>`<button type="button" data-field="${i}"><span>${input.dataset.seatLabel}</span><strong>입력</strong></button>`).join('')}<p>구역마다 열·번호가 반복돼요.<br>구역까지 입력해 주세요.</p></div><div class="keypad-keys">${['1','2','3','4','5','6','7','8','9','clear','0','back'].map(key=>`<button type="button" data-key="${key}" ${key==='back'?'aria-label="한 자리 지우기"':''}>${key==='clear'?'전체 지우기':key==='back'?'⌫':key}</button>`).join('')}<button type="button" data-next class="keypad-next">다음</button></div></div></section>`;
  app.append(overlay);
  let active=0,replace=true,restoring=false;
  const mobile=()=>document.documentElement.classList.contains('phone-layout');
  function render(){
    overlay.querySelectorAll('[data-field]').forEach((button,i)=>{
      button.setAttribute('aria-pressed',String(i===active));
      button.querySelector('strong').textContent=inputs[i].value||'입력';
    });
    overlay.querySelector('[data-next]').textContent=active<2?'다음 · '+inputs[active+1].dataset.seatLabel:'입력 완료';
  }
  function close(){
    if(overlay.hidden)return;
    overlay.hidden=true;restoring=true;inputs[active].focus({preventScroll:true});restoring=false;
  }
  function open(index){
    if(!mobile()||restoring)return;
    active=index;replace=true;render();overlay.hidden=false;
    window.dispatchEvent(new CustomEvent('inside:layout-changing',{detail:{orientationChanged:false}}));
    overlay.querySelector(`[data-field="${active}"]`).focus({preventScroll:true});
  }
  function enter(key){
    const input=inputs[active];
    if(key==='clear')input.value='';
    else if(key==='back')input.value=input.value.slice(0,-1);
    else input.value=((replace?'':input.value)+key).slice(0,Number(input.maxLength));
    replace=false;input.dispatchEvent(new Event('input',{bubbles:true}));render();
  }
  function sync(){for(const input of inputs){input.readOnly=mobile();input.inputMode=mobile()?'none':'numeric';}if(!mobile())close();}
  inputs.forEach((input,i)=>{input.addEventListener('focus',()=>open(i));input.addEventListener('click',()=>open(i));});
  overlay.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(event.target===overlay||button?.hasAttribute('data-close'))close();
    else if(button?.hasAttribute('data-field')){active=Number(button.dataset.field);replace=true;render();}
    else if(button?.hasAttribute('data-key'))enter(button.dataset.key);
    else if(button?.hasAttribute('data-next')){if(active===2)close();else{active++;replace=true;render();overlay.querySelector(`[data-field="${active}"]`).focus();}}
  });
  overlay.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(/^\d$/.test(event.key)){event.preventDefault();enter(event.key);}
    else if(event.key==='Backspace'){event.preventDefault();enter('back');}
    else if(event.key==='Escape'){event.preventDefault();close();}
    else if(event.key==='Tab')trapFocus(event,overlay);
  });
  overlay.addEventListener('paste',event=>{event.preventDefault();const value=event.clipboardData.getData('text').normalize('NFKC').replace(/\D/g,'');if(value){replace=true;enter(value);}});
  window.addEventListener('inside:layout-ready',sync);sync();
  return {close};
}

export function trapFocus(event,container){
  const buttons=[...container.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex="0"]')].filter(el=>!el.closest('[hidden]'));
  const first=buttons[0],last=buttons.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
}
