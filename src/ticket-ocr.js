import {parseTicketSeat} from './ticket-parser.js';

// Loaded only when the user scans a photo. Every asset is served with this app;
// neither the photo nor its recognized text is sent to a server.
export async function recognizeTicket(image,{signal,onProgress=()=>{}}={}){
  const {createWorker}=await import('tesseract.js');
  signal?.throwIfAborted();
  const base=new URL(import.meta.env.BASE_URL+'ocr/',location.href).href;
  let worker,initializing,rejectFailure;
  const failure=new Promise((_,reject)=>{rejectFailure=reject;});
  const abort=()=>{rejectFailure(signal.reason??new DOMException('Aborted','AbortError'));if(worker)void worker.terminate();};
  signal?.addEventListener('abort',abort,{once:true});
  try{
    initializing=createWorker('kor',1,{
      workerPath:base+'worker.min.js',corePath:base,langPath:base,
      workerBlobURL:false,cacheMethod:'none',
      errorHandler:error=>rejectFailure(new Error(String(error))),
      logger:message=>{if(!signal?.aborted)onProgress(message);},
    });
    worker=await Promise.race([initializing,failure]);
    signal?.throwIfAborted();
    await worker.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1'});
    let result=await Promise.race([worker.recognize(image,{rotateAuto:true}),failure]);
    signal?.throwIfAborted();
    let seat=parseTicketSeat(result.data.text);
    // A joint Korean/English pass often reads 블록 as Latin digits. Read Korean
    // first, then try English only for incomplete fields, without mixing seats.
    if(!['complete','ambiguous'].includes(seat.status)){
      await Promise.race([worker.reinitialize('eng',1),failure]);signal?.throwIfAborted();
      await worker.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1'});
      const english=await Promise.race([worker.recognize(image,{rotateAuto:true}),failure]);signal?.throwIfAborted();
      const other=parseTicketSeat(english.data.text),fields=['section','row','number'];
      if(other.status==='ambiguous'||fields.some(key=>seat[key]&&other[key]&&seat[key]!==other[key]))seat={status:'ambiguous',section:'',row:'',number:''};
      else if(fields.filter(key=>other[key]).length>fields.filter(key=>seat[key]).length){result=english;seat=other;}
    }
    return {...result.data,seat};
  }finally{
    signal?.removeEventListener('abort',abort);
    if(worker)await worker.terminate();
    else initializing?.then(lateWorker=>lateWorker.terminate()).catch(()=>{});
  }
}
