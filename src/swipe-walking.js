// Swipe upward/downward and hold to walk. Horizontal swipes turn the camera;
// a second finger can look while the first one keeps walking.
export function mountSwipeWalking(canvas,{enabled,onMove,onLook,onBegin}){
  const pointers=new Map();
  const movement=()=>{const p=[...pointers.values()].find(p=>p.mode==='move');onMove(p?Math.max(-1,Math.min(1,(-p.dy-Math.sign(-p.dy)*8)/64)):0);};
  function reset(){pointers.clear();onMove(0);}
  canvas.addEventListener('pointerdown',e=>{
    if(!enabled()||e.pointerType==='mouse')return;
    e.preventDefault();onBegin();
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,dy:0,mode:pointers.size?'look':null});
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    const p=pointers.get(e.pointerId);if(!p)return;
    if(!enabled()){reset();return;}
    e.preventDefault();const dx=e.clientX-p.x,dy=e.clientY-p.y;
    if(!p.mode&&Math.hypot(dx,dy)>8)p.mode=Math.abs(dy)>Math.abs(dx)?'move':'look';
    if(p.mode==='look')onLook(e.clientX-p.lastX,e.clientY-p.lastY);
    p.dy=Math.abs(dy)>8?dy:0;p.lastX=e.clientX;p.lastY=e.clientY;
    movement();
  });
  const release=e=>{pointers.delete(e.pointerId);movement();};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,release);
  window.addEventListener('blur',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  return {reset};
}
