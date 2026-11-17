import {parseTicketSeat} from './ticket-parser.js';
import {trapFocus} from './seat-keypad.js';

export function mountTicketScan({button,onApply}){
  const overlay=document.createElement('div');overlay.id='ticket-scanner';overlay.className='seat-overlay';overlay.hidden=true;
  overlay.innerHTML=`<section class="ticket-scan-card" role="dialog" aria-modal="true" aria-labelledby="ticket-title"><header><div><small>사진으로 입력</small><h2 id="ticket-title">티켓 좌석 스캔</h2></div><button type="button" data-close>닫기</button></header><div class="ticket-scan-body"><div class="ticket-photo"><img alt="선택한 티켓 사진" hidden/><p data-placeholder>구역 · 열 · 번호가 선명하게 보이도록<br>티켓 한 장을 가까이 찍어 주세요.</p></div><div class="ticket-scan-controls"><div class="ticket-source"><button type="button" data-camera>사진 찍기</button><button type="button" data-gallery>사진 선택</button></div><input type="file" accept="image/*" capture="environment" data-camera-input hidden/><input type="file" accept="image/*" data-gallery-input hidden/><div class="ticket-photo-actions" hidden><button type="button" data-rotate>사진 회전 ↻</button><button type="button" data-read>좌석 읽기</button></div><p data-status role="status" aria-live="polite">직접 입력이 기본이며, 사진은 이 기기에서만 읽습니다.</p><progress max="1" value="0" aria-label="티켓 인식 진행률" hidden></progress><dl data-result hidden></dl><button type="button" data-apply hidden>입력란에 적용</button><button type="button" data-cancel hidden>스캔 취소</button><small class="ticket-privacy">사진은 서버에 전송·저장하지 않습니다. 처음 읽을 때 인식 파일을 내려받아 잠시 걸릴 수 있어요.</small></div></div></section>`;
  document.querySelector('#app').append(overlay);
  const $=selector=>overlay.querySelector(selector),photo=$('img'),status=$('[data-status]'),progress=$('progress');
  let imageURL=null,loadedImage=null,rotation=0,result=null,controller=null,generation=0,loading=false;
  function busy(value){
    for(const selector of ['[data-camera]','[data-gallery]','[data-rotate]','[data-read]'])$(selector).disabled=value;
    $('[data-cancel]').hidden=!value;progress.hidden=!value;
  }
  function clearResult(){result=null;$('[data-result]').hidden=true;$('[data-result]').replaceChildren();$('[data-apply]').hidden=true;}
  function releasePhoto(){if(imageURL)URL.revokeObjectURL(imageURL);imageURL=null;loadedImage=null;photo.removeAttribute('src');photo.hidden=true;$('[data-placeholder]').hidden=false;$('.ticket-photo-actions').hidden=true;}
  function cancel(message='스캔을 취소했습니다. 다시 읽거나 직접 입력할 수 있어요.'){
    generation++;controller?.abort();controller=null;busy(false);if(message)status.textContent=message;
  }
  function close(){cancel('');overlay.hidden=true;releasePhoto();clearResult();button.focus({preventScroll:true});}
  button.onclick=()=>{overlay.hidden=false;rotation=0;status.textContent='구역·열·번호가 있는 부분을 크게 찍어 주세요.';window.dispatchEvent(new CustomEvent('inside:layout-changing',{detail:{orientationChanged:false}}));$('[data-camera]').focus();};
  async function choose(file){
    if(!file)return;
    cancel('');clearResult();releasePhoto();rotation=0;loading=true;const id=generation;
    if(file.size>25*1024*1024){status.textContent='사진은 25MB 이하로 선택해 주세요.';loading=false;return;}
    if(file.type&&!file.type.startsWith('image/')){status.textContent='티켓 사진 파일을 선택해 주세요.';loading=false;return;}
    imageURL=URL.createObjectURL(file);const selectedURL=imageURL;
    const source=new Image();source.src=selectedURL;
    try{
      await source.decode();if(id!==generation)return;
      loadedImage=source;photo.src=selectedURL;photo.style.transform='';photo.hidden=false;$('[data-placeholder]').hidden=true;$('.ticket-photo-actions').hidden=false;
      status.textContent='글자가 바로 보이는지 확인하고 ‘좌석 읽기’를 눌러 주세요.';
    }catch{if(id===generation){releasePhoto();status.textContent='이 사진을 열 수 없습니다. JPG·PNG 사진이나 티켓 화면 캡처를 선택해 주세요.';}}
    finally{if(id===generation)loading=false;}
  }
  for(const kind of ['camera','gallery']){
    const input=$(`[data-${kind}-input]`);
    $(`[data-${kind}]`).onclick=()=>{input.value='';input.click();};
    input.onchange=()=>{const file=input.files?.[0];input.value='';void choose(file);};
  }
  $('[data-rotate]').onclick=()=>{rotation=(rotation+90)%360;photo.style.transform=`rotate(${rotation}deg)`;clearResult();status.textContent='글자 방향을 확인한 뒤 다시 읽어 주세요.';};
  $('[data-read]').onclick=async()=>{
    if(!loadedImage||loading)return;
    cancel('');clearResult();const id=generation;controller=new AbortController();const signal=controller.signal;busy(true);progress.value=0;
    status.textContent='인식 파일을 준비하고 있습니다…';
    const timeout=setTimeout(()=>{if(id===generation)cancel('인식 시간이 길어졌습니다. 연결을 확인하거나 좌석 부분을 더 가까이 찍어 주세요.');},90000);
    let canvas;
    try{
      const scale=Math.min(2,2400/Math.max(loadedImage.naturalWidth,loadedImage.naturalHeight));
      const width=Math.round(loadedImage.naturalWidth*scale),height=Math.round(loadedImage.naturalHeight*scale),sideways=rotation%180!==0;
      canvas=document.createElement('canvas');canvas.width=sideways?height:width;canvas.height=sideways?width:height;
      const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.translate(canvas.width/2,canvas.height/2);context.rotate(rotation*Math.PI/180);context.drawImage(loadedImage,-width/2,-height/2,width,height);
      const {recognizeTicket}=await import('./ticket-ocr.js');signal.throwIfAborted();
      const data=await recognizeTicket(canvas,{signal,onProgress:message=>{
        if(id!==generation)return;
        if(message.status==='recognizing text'){progress.value=message.progress;status.textContent=`티켓을 읽고 있습니다… ${Math.round(message.progress*100)}%`;}
      }});
      if(id!==generation)return;
      result=data.seat??parseTicketSeat(data.text);
      if(result.status==='empty'||result.status==='ambiguous'){
        status.textContent=result.status==='ambiguous'?'좌석 정보가 여러 개 보입니다. 티켓 한 장의 좌석 부분만 다시 찍어 주세요.':'구역·열·번호를 읽지 못했습니다. 좌석 부분을 가까이 찍거나 직접 입력해 주세요.';
        return;
      }
      $('[data-result]').innerHTML=[['section','구역'],['row','열'],['number','번호']].map(([key,label])=>`<div><dt>${label}</dt><dd>${result[key]||'확인 필요'}</dd></div>`).join('');
      $('[data-result]').hidden=false;$('[data-apply]').hidden=false;
      status.textContent=result.status==='complete'?'사진과 숫자가 같은지 확인해 주세요. 적용 후에도 직접 수정할 수 있어요.':'일부만 읽었습니다. 적용하면 기존 세 칸을 바꾸며, 빈 칸은 직접 입력해 주세요.';
      if(data.confidence<55)status.textContent='사진이 흐릴 수 있어요. 인식된 숫자를 티켓과 꼭 대조해 주세요. '+status.textContent;
      $('[data-apply]').focus();
    }catch{if(id===generation)status.textContent='사진을 읽지 못했습니다. 연결을 확인해 다시 시도하거나 직접 입력해 주세요.';}
    finally{clearTimeout(timeout);if(canvas){canvas.width=0;canvas.height=0;}if(id===generation){controller=null;busy(false);}}
  };
  $('[data-apply]').onclick=()=>{if(result){onApply(result);close();}};
  $('[data-cancel]').onclick=()=>cancel();$('[data-close]').onclick=close;
  overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
  overlay.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();close();}else if(event.key==='Tab')trapFocus(event,overlay);});
  return {close};
}
