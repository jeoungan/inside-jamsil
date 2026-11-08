import {mountRotatedScroll} from './rotated-scroll.js';

// Keep a landscape app surface even when the physical phone stays upright.
// Use screen orientation (not the keyboard-reduced viewport) to decide rotation.
export function mountMobileOrientation(app) {
  const root=document.documentElement;
  const fullscreen=document.createElement('button');
  fullscreen.id='landscape-fullscreen';fullscreen.className='btn';
  fullscreen.setAttribute('aria-label','전체 화면으로 보기');fullscreen.setAttribute('aria-pressed','false');
  fullscreen.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg><span>전체 화면</span>';
  app.querySelector('.top-actions').prepend(fullscreen);
  const canFullscreen=!!(document.fullscreenEnabled&&root.requestFullscreen);
  let phone=false,rotated=false,lastSize='',frame=0;

  function sync() {
    frame=0;
    const touch=navigator.maxTouchPoints>0||matchMedia('(any-pointer:coarse)').matches;
    phone=touch&&(Math.min(screen.width,screen.height)<=600||/iPhone|iPod|Android.*Mobile/.test(navigator.userAgent));
    const type=screen.orientation?.type;
    const portrait=type?type.startsWith('portrait'):typeof window.orientation==='number'?Math.abs(window.orientation)%180===0:screen.width<=screen.height;
    const nextRotated=phone&&portrait;
    const visible=window.visualViewport;
    const width=visible?.width??innerWidth,height=visible?.height??innerHeight;
    const left=visible?.offsetLeft??0,top=visible?.offsetTop??0;
    const size=`${nextRotated}:${width}:${height}:${left}:${top}`;
    const orientationChanged=nextRotated!==rotated;
    // Release gestures in their old coordinate space before changing the transform.
    if(lastSize&&size!==lastSize)window.dispatchEvent(new CustomEvent('inside:layout-changing',{detail:{orientationChanged}}));
    rotated=nextRotated;
    root.classList.toggle('phone-layout',phone);
    root.classList.toggle('phone-rotated',rotated);
    root.classList.toggle('phone-compact',phone&&(rotated?width:height)<=360);
    for(const [key,value] of Object.entries({
      'app-width':rotated?height:width,'app-height':rotated?width:height,
      'display-width':width,'display-left':left,'display-top':top,
      'display-center-x':left+width/2,'display-center-y':top+height/2,
    }))root.style.setProperty(`--${key}`,`${value}px`);
    const focused=document.activeElement;
    const keyboard=phone&&focused?.matches('input:not([type="range"]):not([type="checkbox"]),textarea,[contenteditable="true"]')&&height<(portrait?Math.max(screen.width,screen.height):Math.min(screen.width,screen.height))*.72;
    root.classList.toggle('phone-keyboard',!!keyboard);
    fullscreen.hidden=!phone||!canFullscreen;
    const expanded=!!document.fullscreenElement;
    fullscreen.setAttribute('aria-pressed',String(expanded));
    fullscreen.setAttribute('aria-label',expanded?'전체 화면 끝내기':'전체 화면으로 보기');
    if(lastSize&&size!==lastSize)window.dispatchEvent(new CustomEvent('inside:layout-ready',{detail:{orientationChanged}}));
    lastSize=size;
    if(keyboard)focused.scrollIntoView({block:'nearest',inline:'nearest'});
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
  fullscreen.onclick=async()=>{
    try {
      if(document.fullscreenElement)await document.exitFullscreen();
      else await root.requestFullscreen();
    } catch {/* The rotated layout works without fullscreen permission. */}
    schedule();
  };
  window.addEventListener('resize',schedule);
  window.addEventListener('orientationchange',schedule);
  window.visualViewport?.addEventListener('resize',schedule);
  window.visualViewport?.addEventListener('scroll',schedule);
  screen.orientation?.addEventListener('change',schedule);
  document.addEventListener('fullscreenchange',schedule);
  document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);
  sync();
  mountRotatedScroll(app,{isRotated:()=>rotated});
  return {get rotated(){return rotated;},get phone(){return phone;}};
}
