// DOM controls already follow CSS transforms. Canvas consumers instead need
// pointer positions in the unrotated drawing surface, including OrbitControls'
// page coordinates for multi-touch. Leave native events and Three.js untouched.
export function createCanvasInput(canvas,{isRotated}) {
  const listeners=new Map(),active=new Map();
  const remember=e=>active.set(e.pointerId,{pointerId:e.pointerId,pointerType:e.pointerType,clientX:e.clientX,clientY:e.clientY});
  canvas.addEventListener('pointerdown',remember,{capture:true});
  canvas.addEventListener('pointermove',e=>{if(active.has(e.pointerId))remember(e);},{capture:true});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>active.delete(e.pointerId),{capture:true});

  function mapEvent(event) {
    if(!('clientX' in event))return event;
    const rect=canvas.getBoundingClientRect(),rotated=isRotated();
    const sx=canvas.clientWidth/(rotated?rect.height:rect.width)||1;
    const sy=canvas.clientHeight/(rotated?rect.width:rect.height)||1;
    const x=(rotated?event.clientY-rect.top:event.clientX-rect.left)*sx;
    const y=(rotated?rect.right-event.clientX:event.clientY-rect.top)*sy;
    const coordinates={clientX:x,clientY:y,pageX:x,pageY:y,offsetX:x,offsetY:y,
      movementX:(rotated?event.movementY:event.movementX)*sx,
      movementY:(rotated?-event.movementX:event.movementY)*sy};
    return new Proxy(event,{get(target,key){
      if(key in coordinates)return coordinates[key];
      const value=Reflect.get(target,key,target);
      return typeof value==='function'?value.bind(target):value;
    }});
  }
  function listenerFor(type,listener,options) {
    const key=`${type}:${typeof options==='boolean'?options:!!options?.capture}`;
    if(!listeners.has(key))listeners.set(key,new WeakMap());
    const map=listeners.get(key);
    if(!map.has(listener))map.set(listener,event=>{
      const mapped=mapEvent(event);
      if(typeof listener==='function')listener.call(surface,mapped);
      else listener.handleEvent(mapped);
    });
    return map.get(listener);
  }
  const surface=new Proxy(canvas,{get(target,key){
    if(key==='addEventListener')return (type,listener,options)=>{if(listener)target.addEventListener(type,listenerFor(type,listener,options),options);};
    if(key==='removeEventListener')return (type,listener,options)=>{if(listener)target.removeEventListener(type,listenerFor(type,listener,options),options);};
    if(key==='getBoundingClientRect')return ()=>new DOMRect(0,0,target.clientWidth,target.clientHeight);
    const value=Reflect.get(target,key,target);
    return typeof value==='function'?value.bind(target):value;
  }});
  function cancelPointers() {
    for(const pointer of [...active.values()]){
      canvas.dispatchEvent(new PointerEvent('pointercancel',{...pointer,bubbles:true}));
      if(canvas.hasPointerCapture(pointer.pointerId))canvas.releasePointerCapture(pointer.pointerId);
    }
    active.clear();
  }
  return {surface,cancelPointers};
}
