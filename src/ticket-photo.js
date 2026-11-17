// Keep selection coordinates in the oriented image, independently of the
// clockwise-rotated phone UI. Crop before resizing so small seat text survives.
export function mountTicketPhoto(canvas,{onSelection}){
  let source=null,rotation=0,crop=null,selecting=false,start=null,dragging=null;
  const clamp=value=>Math.max(0,Math.min(1,value));
  const size=()=>rotation%180?{width:source.naturalHeight,height:source.naturalWidth}:{width:source.naturalWidth,height:source.naturalHeight};
  function drawSource(context,width,height){
    context.translate(width/2,height/2);context.rotate(rotation*Math.PI/180);
    const sideways=rotation%180!==0;
    context.drawImage(source,-(sideways?height:width)/2,-(sideways?width:height)/2,sideways?height:width,sideways?width:height);
  }
  function render(){
    if(!source){canvas.hidden=true;return;}
    const full=size(),area=!selecting&&crop?crop:{x:0,y:0,width:1,height:1};
    const scale=Math.min(1,1200/Math.max(full.width*area.width,full.height*area.height));
    canvas.width=Math.max(1,Math.round(full.width*area.width*scale));canvas.height=Math.max(1,Math.round(full.height*area.height*scale));
    canvas.hidden=false;canvas.classList.toggle('selecting',selecting);
    const context=canvas.getContext('2d');context.save();context.translate(-area.x*full.width*scale,-area.y*full.height*scale);drawSource(context,full.width*scale,full.height*scale);context.restore();
    if(selecting&&crop){
      const x=crop.x*canvas.width,y=crop.y*canvas.height,w=crop.width*canvas.width,h=crop.height*canvas.height;
      context.fillStyle='#12200c88';context.beginPath();context.rect(0,0,canvas.width,canvas.height);context.rect(x,y,w,h);context.fill('evenodd');
      context.strokeStyle='#eaffb3';context.lineWidth=Math.max(2,canvas.width/180);context.strokeRect(x,y,w,h);
    }
  }
  function point(event){
    const r=canvas.getBoundingClientRect(),rotated=document.documentElement.classList.contains('phone-rotated');
    const localX=(rotated?(event.clientY-r.top)/r.height:(event.clientX-r.left)/r.width)*canvas.clientWidth;
    const localY=(rotated?(r.right-event.clientX)/r.width:(event.clientY-r.top)/r.height)*canvas.clientHeight;
    const scale=Math.min(canvas.clientWidth/canvas.width,canvas.clientHeight/canvas.height);
    return {x:clamp((localX-(canvas.clientWidth-canvas.width*scale)/2)/(canvas.width*scale)),y:clamp((localY-(canvas.clientHeight-canvas.height*scale)/2)/(canvas.height*scale))};
  }
  canvas.addEventListener('pointerdown',event=>{
    if(!selecting||event.button>0||dragging!==null)return;
    start=point(event);dragging=event.pointerId;canvas.setPointerCapture(dragging);
  });
  canvas.addEventListener('pointermove',event=>{
    if(event.pointerId!==dragging)return;
    const end=point(event);
    crop={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),width:Math.abs(end.x-start.x),height:Math.abs(end.y-start.y)};render();
  });
  canvas.addEventListener('pointerup',event=>{
    if(event.pointerId!==dragging)return;
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    dragging=null;start=null;if(crop&&(crop.width<.025||crop.height<.015))crop=null;
    onSelection(!!crop);render();
  });
  canvas.addEventListener('pointercancel',()=>{dragging=null;start=null;});
  return {
    load(image){source=image;rotation=0;crop=null;selecting=false;render();},
    clear(){source=null;crop=null;selecting=false;dragging=null;canvas.width=1;canvas.height=1;canvas.hidden=true;},
    rotate(){rotation=(rotation+90)%360;crop=null;selecting=false;render();},
    beginSelection(){selecting=true;crop=null;render();},
    finishSelection(){if(!crop)return false;selecting=false;render();return true;},
    reset(){crop=null;selecting=false;render();},
    get selecting(){return selecting;},get cropped(){return !!crop&&!selecting;},
    image(){
      const full=size(),area=crop??{x:0,y:0,width:1,height:1};
      const width=full.width*area.width,height=full.height*area.height,scale=Math.min(3,2400/Math.max(width,height));
      const output=document.createElement('canvas');output.width=Math.max(1,Math.round(width*scale));output.height=Math.max(1,Math.round(height*scale));
      const context=output.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,output.width,output.height);context.translate(-area.x*full.width*scale,-area.y*full.height*scale);drawSource(context,full.width*scale,full.height*scale);
      return output;
    },
  };
}
