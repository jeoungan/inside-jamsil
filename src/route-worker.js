import {createRoutePlanner} from './route-planner.js';
let planner;
self.onmessage=({data})=>{
  if(data.colliders)planner=createRoutePlanner(data.colliders);
  try{self.postMessage({id:data.id,route:planner.plan(data.from,data.to,data.options)});}
  catch(error){self.postMessage({id:data.id,error:error.message});}
};
