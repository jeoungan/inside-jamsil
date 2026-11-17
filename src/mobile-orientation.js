import {requestNativeLandscape} from './native-landscape.js';

// Follow the OS orientation so the page and the native keyboard share axes.
// The visual viewport may shrink for the keyboard without changing orientation.
export function mountMobileOrientation(app){
  const root=document.documentElement,fullscreen=document.createElement('button');
  fullscreen.id='landscape-fullscreen';fullscreen.className='btn';
  fullscreen.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg><span>가로로 열기</span>';
  app.querySelector('.top-actions').prepend(fullscreen);
  const status=document.createElement('p');status.id='landscape-status';status.hidden=true;status.setAttribute('role','status');app.append(status);
  const gate=document.createElement('section');gate.id='landscape-entry';gate.hidden=true;gate.setAttribute('aria-labelledby','landscape-entry-title');
  gate.innerHTML='<div class="landscape-entry-card"><span class="entry-brand">inside · 잠실야구장</span><svg viewBox="0 0 96 72" fill="none" aria-hidden="true"><rect x="10" y="17" width="76" height="44" rx="8" stroke="currentColor" stroke-width="2"/><path d="M18 27v24M78 34v10M28 9h32l-6-6m6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><h1 id="landscape-entry-title">가로 화면으로 둘러보기</h1><p>가로로 시작하거나<br>휴대폰을 옆으로 돌려 주세요.</p><button type="button" id="landscape-start">가로로 시작</button><p id="landscape-entry-status" role="status" hidden></p></div>';
  document.body.append(gate);const start=gate.querySelector('button'),entryStatus=gate.querySelector('[role="status"]');
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
    const blocked=phone&&portrait;
    if(blocked&&app.contains(document.activeElement))document.activeElement.blur();
    if(blocked)for(const dialog of app.querySelectorAll('dialog[open]'))dialog.close();
    gate.hidden=!blocked;app.inert=blocked;root.classList.toggle('phone-portrait',blocked);
    root.classList.toggle('phone-compact',landscape&&height<=360);
    for(const [key,value] of Object.entries({'app-width':width,'app-height':height,'display-left':left,'display-top':top,'display-center-x':left+width/2,'display-center-y':top+height/2}))root.style.setProperty(`--${key}`,`${value}px`);
    const focused=document.activeElement;
    const keyboard=phone&&focused?.matches('input:not([type="range"]):not([type="checkbox"]):not([type="file"]),textarea,[contenteditable="true"]')&&height<(portrait?Math.max(screen.width,screen.height):Math.min(screen.width,screen.height))*.72;
    root.classList.toggle('phone-keyboard',!!keyboard);
    fullscreen.hidden=!phone||!document.fullscreenEnabled;
    fullscreen.disabled=pending;
    start.disabled=pending;start.hidden=!document.fullscreenEnabled;
    const expanded=!!document.fullscreenElement,label=expanded?'전체 화면 닫기':'가로로 열기';
    fullscreen.setAttribute('aria-pressed',String(expanded));fullscreen.setAttribute('aria-label',label);fullscreen.querySelector('span').textContent=label;
    if(landscape){status.hidden=true;entryStatus.hidden=true;}
    if(lastSize&&size!==lastSize)window.dispatchEvent(new CustomEvent('inside:layout-ready',{detail:{orientationChanged}}));
    lastSize=size;lastOrientation=portrait;
    if(keyboard)focused.scrollIntoView({block:'nearest',inline:'nearest'});
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
  async function enterLandscape(){
    if(pending)return;pending=true;fullscreen.disabled=true;status.hidden=true;
    start.disabled=true;entryStatus.hidden=true;
    try{await requestNativeLandscape();}
    catch{status.textContent='자동 회전을 켜고 휴대폰을 가로로 돌려 주세요.';entryStatus.textContent=status.textContent;status.hidden=false;entryStatus.hidden=false;}
    finally{pending=false;schedule();}
  }
  start.onclick=enterLandscape;
  fullscreen.onclick=async()=>{
    if(document.fullscreenElement){try{await document.exitFullscreen();}catch{}schedule();}
    else await enterLandscape();
  };
  window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule);
  window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
  screen.orientation?.addEventListener('change',schedule);document.addEventListener('fullscreenchange',schedule);
  document.addEventListener('focusin',()=>{status.hidden=true;schedule();});document.addEventListener('focusout',schedule);
  sync();
  return {get rotated(){return false;},get phone(){return phone;}};
}
