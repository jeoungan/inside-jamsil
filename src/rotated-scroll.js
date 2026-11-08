// Some browsers pan a rotated overflow container in physical screen axes.
// Map a single-finger drag to its logical scroll axes; taps remain native.
export function mountRotatedScroll(app,{isRotated}) {
  let gesture=null,suppressedClick=null;
  const reset=()=>{gesture=null;suppressedClick=null;};
  app.addEventListener('touchstart',e=>{
    suppressedClick=null;gesture=null;
    if(!isRotated()||e.touches.length!==1||e.target.closest('canvas,input[type="range"]'))return;
    const scrollers=[];
    for(let node=e.target;node&&node!==app;node=node.parentElement){
      const style=getComputedStyle(node);
      const x=/(auto|scroll)/.test(style.overflowX)&&node.scrollWidth>node.clientWidth+1;
      const y=/(auto|scroll)/.test(style.overflowY)&&node.scrollHeight>node.clientHeight+1;
      if(x||y)scrollers.push({node,x,y});
    }
    if(!scrollers.length)return;
    const p=e.touches[0];gesture={id:p.identifier,x:p.clientX,y:p.clientY,startX:p.clientX,startY:p.clientY,scrollers,moved:false};
  },{passive:true});
  app.addEventListener('touchmove',e=>{
    const g=gesture;if(!g||!isRotated()||e.touches.length!==1){gesture=null;return;}
    const p=[...e.touches].find(p=>p.identifier===g.id);if(!p)return;
    if(!g.moved&&Math.hypot(p.clientX-g.startX,p.clientY-g.startY)<6)return;
    e.preventDefault();g.moved=true;
    const dx=g.y-p.clientY,dy=p.clientX-g.x;
    const axis=Math.abs(dy)>=Math.abs(dx)?'y':'x',amount=axis==='y'?dy:dx;
    const property=axis==='y'?'scrollTop':'scrollLeft';
    for(const {node,...axes} of g.scrollers){
      if(!axes[axis])continue;
      const before=node[property];node[property]+=amount;
      if(Math.abs(node[property]-before)>.1)break;
    }
    g.x=p.clientX;g.y=p.clientY;
  },{passive:false});
  app.addEventListener('touchend',()=>{
    if(gesture?.moved)suppressedClick={node:gesture.scrollers[0].node,until:performance.now()+400};
    gesture=null;
  },{passive:true});
  app.addEventListener('touchcancel',reset,{passive:true});
  app.addEventListener('click',e=>{
    if(suppressedClick&&e.detail&&performance.now()<suppressedClick.until&&suppressedClick.node.contains(e.target)){
      e.preventDefault();e.stopPropagation();suppressedClick=null;
    }
  },{capture:true});
  window.addEventListener('inside:layout-changing',reset);
  window.addEventListener('blur',reset);
}
