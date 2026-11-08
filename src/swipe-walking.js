// The starting half owns a pointer until release: left is a two-axis movement
// stick, right is look. Coordinates are already in the unrotated canvas space.
export function mountSwipeWalking(canvas,{enabled,onMove,onLook,onBegin,onState=()=>{}}){
  const pointers=new Map();
  const radius=48,deadzone=7;
  function movement(){
    const move=[...pointers.values()].find(p=>p.mode==='move'),look=[...pointers.values()].find(p=>p.mode==='look');
    const distance=move?Math.hypot(move.dx,move.dy):0,strength=Math.min(1,Math.max(0,(distance-deadzone)/(radius-deadzone)));
    onMove({forward:distance?-move.dy/distance*strength:0,side:distance?move.dx/distance*strength:0});
    onState({move:move?{x:move.x,y:move.y,dx:move.dx/Math.max(1,distance/radius),dy:move.dy/Math.max(1,distance/radius)}:null,look:look?{x:look.lastX,y:look.lastY}:null});
  }
  function reset(){pointers.clear();movement();}
  canvas.addEventListener('pointerdown',e=>{
    if(!enabled()||e.pointerType==='mouse')return;
    const mode=e.clientX<canvas.clientWidth/2?'move':'look';
    if([...pointers.values()].some(p=>p.mode===mode))return;
    e.preventDefault();onBegin();
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,dx:0,dy:0,mode});
    canvas.setPointerCapture(e.pointerId);
    movement();
  });
  canvas.addEventListener('pointermove',e=>{
    const p=pointers.get(e.pointerId);if(!p)return;
    if(!enabled()){reset();return;}
    e.preventDefault();
    if(p.mode==='look')onLook(e.clientX-p.lastX,e.clientY-p.lastY);
    p.dx=e.clientX-p.x;p.dy=e.clientY-p.y;p.lastX=e.clientX;p.lastY=e.clientY;
    movement();
  });
  const release=e=>{pointers.delete(e.pointerId);movement();};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,release);
  window.addEventListener('blur',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  return {reset};
}
