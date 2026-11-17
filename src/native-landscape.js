// CSS transforms cannot rotate the Android IME. Request the browser/OS screen
// orientation, after entering fullscreen from a user gesture.
export async function requestNativeLandscape(doc=document,orientation=screen.orientation){
  if(!orientation?.lock)throw new Error('Orientation lock is unavailable');
  const entered=!doc.fullscreenElement;
  if(entered)await doc.documentElement.requestFullscreen();
  try{await orientation.lock('landscape');}
  catch(error){
    // Do not strand the user in portrait fullscreen when locking is refused.
    if(entered&&doc.fullscreenElement)await doc.exitFullscreen().catch(()=>{});
    throw error;
  }
}
