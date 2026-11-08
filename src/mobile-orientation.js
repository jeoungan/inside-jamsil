// Screen orientation, rather than viewport aspect ratio, keeps an open keyboard
// from accidentally dismissing the portrait gate.
export function mountMobileOrientation(app) {
  const root=document.documentElement;
  const gate=document.createElement('section');
  gate.id='orientation-gate';gate.hidden=true;
  gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');
  gate.setAttribute('aria-labelledby','orientation-title');
  gate.innerHTML=`<div class="orientation-card"><span class="orientation-brand">inside<span>.</span></span><svg class="rotate-phone" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><rect x="33" y="17" width="54" height="86" rx="10"/><path d="M52 26h16M55 94h10M11 56a49 49 0 0 1 89-25m0-16v16H84M109 64a49 49 0 0 1-89 25m0 16V89h16"/></svg><h1 id="orientation-title" tabindex="-1">휴대폰을 가로로 돌려주세요</h1><p>넓은 화면에서 구장과 길 안내를<br>함께 볼 수 있어요.</p><button id="orientation-start" class="btn primary" hidden>가로 전체 화면으로 시작</button><small id="orientation-help" role="status">화면 회전 잠금이 켜져 있다면 해제해 주세요.</small></div>`;
  document.body.append(gate);
  const fullscreen=document.createElement('button');
  fullscreen.id='landscape-fullscreen';fullscreen.className='btn';
  fullscreen.setAttribute('aria-label','전체 화면으로 보기');fullscreen.setAttribute('aria-pressed','false');
  fullscreen.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg><span>전체 화면</span>';
  app.querySelector('.top-actions').prepend(fullscreen);
  const canFullscreen=!!(document.fullscreenEnabled&&root.requestFullscreen);
  const canLock=typeof screen.orientation?.lock==='function';
  let blocked=false,phone=false;

  function sync() {
    const touch=navigator.maxTouchPoints>0||matchMedia('(any-pointer:coarse)').matches;
    phone=touch&&(Math.min(screen.width,screen.height)<=600||/iPhone|iPod|Android.*Mobile/.test(navigator.userAgent));
    const type=screen.orientation?.type;
    const portrait=type?type.startsWith('portrait'):typeof window.orientation==='number'?Math.abs(window.orientation)%180===0:screen.width<=screen.height;
    const nextBlocked=phone&&portrait;
    root.classList.toggle('phone-layout',phone);
    root.classList.toggle('phone-portrait',nextBlocked);
    root.style.setProperty('--app-height',`${window.visualViewport?.height??innerHeight}px`);
    const focused=document.activeElement;
    const keyboard=phone&&!portrait&&focused?.matches('input,textarea,[contenteditable="true"]')&&(window.visualViewport?.height??innerHeight)<Math.min(screen.width,screen.height)*.72;
    root.classList.toggle('phone-keyboard',keyboard);
    fullscreen.hidden=!phone||!canFullscreen;
    const expanded=!!document.fullscreenElement;
    fullscreen.setAttribute('aria-pressed',String(expanded));
    fullscreen.setAttribute('aria-label',expanded?'전체 화면 끝내기':'가로 전체 화면으로 보기');
    gate.querySelector('#orientation-start').hidden=!canFullscreen||!canLock;
    gate.hidden=!nextBlocked;
    app.inert=nextBlocked;
    if(nextBlocked!==blocked){
      blocked=nextBlocked;
      if(blocked){
        focused?.blur?.();
        app.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
        window.dispatchEvent(new Event('inside:orientation-block'));
        gate.querySelector('#orientation-title').focus({preventScroll:true});
      }else {
        app.querySelector('canvas')?.focus({preventScroll:true});
        window.dispatchEvent(new Event('inside:orientation-ready'));
      }
    }
    if(keyboard)focused.scrollIntoView({block:'nearest',inline:'nearest'});
  }
  const schedule=()=>requestAnimationFrame(sync);
  async function enterLandscape() {
    try {
      if(!document.fullscreenElement)await root.requestFullscreen();
      if(canLock)await screen.orientation.lock('landscape');
    } catch {
      gate.querySelector('#orientation-help').textContent='화면 회전 잠금을 해제한 뒤 휴대폰을 가로로 돌려 주세요.';
    }
    schedule();
  }
  gate.querySelector('#orientation-start').onclick=enterLandscape;
  fullscreen.onclick=async()=>{
    if(document.fullscreenElement){try{await document.exitFullscreen();}catch{/* Browser may already have exited. */}schedule();}
    else await enterLandscape();
  };
  window.addEventListener('resize',schedule);
  window.addEventListener('orientationchange',schedule);
  window.visualViewport?.addEventListener('resize',schedule);
  screen.orientation?.addEventListener('change',schedule);
  document.addEventListener('fullscreenchange',schedule);
  document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);
  sync();
  return {get blocked(){return blocked;},get phone(){return phone;}};
}
