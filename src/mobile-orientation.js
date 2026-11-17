import {requestNativeLandscape} from './native-landscape.js';

// Follow the OS orientation so the page and the native keyboard share axes.
// The visual viewport may shrink for the keyboard without changing orientation.
export function mountMobileOrientation(app){
  const root=document.documentElement,fullscreen=document.createElement('button');
  fullscreen.id='landscape-fullscreen';fullscreen.className='btn';
  fullscreen.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg><span>가로로 열기</span>';
  app.querySelector('.top-actions').prepend(fullscreen);
  const status=document.createElement('p');status.id='landscape-status';status.hidden=true;status.setAttribute('role','status');app.append(status);
  let phone=false,lastSize='',lastOrientation=null,frame=0,pending=false;
  function sync(){
    frame=0;
    const touch=navigator.maxTouchPoints>0||matchMedia('(any-pointer:coarse)').matches;
    phone=touch&&(Math.min(screen.width,screen.height)<=600||/iPhone|iPod|Android.*Mobile/.test(navigator.userAgent));
    const type=screen.orientation?.type;
    const portrait=type?type.startsWith('portrait'):typeof window.orientation==='number'?Math.abs(window.orientation)%180===0:screen.width<=screen.height;
    const landscape=phone&&!portrait,visible=window.visualViewport;
    const width=visible?.width??innerWidth,height=visible?.height??innerHeight,left=visible?.offsetLeft??0,top=visible?.offsetTop??0;
    const size=`${portrait}:${width}:${height}:${left}:${top}`;
    const orientationChanged=lastOrientation!==null&&portrait!==lastOrientation;
    if(lastSize&&size!==lastSize)window.dispatchEvent(new CustomEvent('inside:layout-changing',{detail:{orientationChanged}}));
    root.classList.toggle('phone-device',phone);
    root.classList.toggle('phone-layout',landscape);
    root.classList.toggle('phone-compact',landscape&&height<=360);
    for(const [key,value] of Object.entries({'app-width':width,'app-height':height,'display-left':left,'display-top':top,'display-center-x':left+width/2,'display-center-y':top+height/2}))root.style.setProperty(`--${key}`,`${value}px`);
    const focused=document.activeElement;
    const keyboard=phone&&focused?.matches('input:not([type="range"]):not([type="checkbox"]):not([type="file"]),textarea,[contenteditable="true"]')&&height<(portrait?Math.max(screen.width,screen.height):Math.min(screen.width,screen.height))*.72;
    root.classList.toggle('phone-keyboard',!!keyboard);
    fullscreen.hidden=!phone||!document.fullscreenEnabled;
    fullscreen.disabled=pending;
    const expanded=!!document.fullscreenElement,label=expanded?'전체 화면 닫기':'가로로 열기';
    fullscreen.setAttribute('aria-pressed',String(expanded));fullscreen.setAttribute('aria-label',label);fullscreen.querySelector('span').textContent=label;
    if(landscape)status.hidden=true;
    if(lastSize&&size!==lastSize)window.dispatchEvent(new CustomEvent('inside:layout-ready',{detail:{orientationChanged}}));
    lastSize=size;lastOrientation=portrait;
    if(keyboard)focused.scrollIntoView({block:'nearest',inline:'nearest'});
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
  fullscreen.onclick=async()=>{
    if(pending)return;pending=true;fullscreen.disabled=true;status.hidden=true;
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else await requestNativeLandscape();
    }catch{status.textContent='가로 화면으로 전환하지 못했어요. 휴대폰의 자동 회전을 켜고 가로로 돌려 주세요.';status.hidden=false;}
    finally{pending=false;schedule();}
  };
  window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule);
  window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
  screen.orientation?.addEventListener('change',schedule);document.addEventListener('fullscreenchange',schedule);
  document.addEventListener('focusin',()=>{status.hidden=true;schedule();});document.addEventListener('focusout',schedule);
  sync();
  return {get rotated(){return false;},get phone(){return phone;}};
}
