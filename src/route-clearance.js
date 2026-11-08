// Comfort is a routing preference, never a change to physical collision size.
// Narrow required doors remain reachable; open corridors win over squeezing
// between columns. A spatial index keeps this cost cheap during A* searches.
export function createClearanceCost(colliders){
  const size=4,buckets=new Map();
  for(const c of colliders){
    const column=c.type==='column',reach=column?1.25:.85,weight=column?12:3;
    const co=Math.cos(c.yaw||0),si=Math.sin(c.yaw||0),hx=c.width/2,hz=c.depth/2;
    const ex=Math.abs(co)*hx+Math.abs(si)*hz+reach,ez=Math.abs(si)*hx+Math.abs(co)*hz+reach;
    const item={...c,co,si,hx,hz,reach,weight};
    for(let x=Math.floor((c.x-ex)/size);x<=Math.floor((c.x+ex)/size);x++)for(let z=Math.floor((c.z-ez)/size);z<=Math.floor((c.z+ez)/size);z++){
      const key=x+':'+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(item);
    }
  }
  function multiplier(x,z){
    let penalty=0;
    for(const c of buckets.get(Math.floor(x/size)+':'+Math.floor(z/size))||[]){
      const dx=x-c.x,dz=z-c.z;
      const distance=Math.hypot(Math.max(0,Math.abs(c.co*dx-c.si*dz)-c.hx),Math.max(0,Math.abs(c.si*dx+c.co*dz)-c.hz));
      if(distance<c.reach)penalty=Math.max(penalty,c.weight*(1-distance/c.reach)**2);
    }
    return 1+penalty;
  }
  function segment(a,b){
    const length=Math.hypot(...b.map((v,i)=>v-a[i]));if(!length)return 0;
    const n=Math.max(1,Math.ceil(length/.35));let total=0;
    for(let i=0;i<=n;i++){const t=i/n;total+=multiplier(a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t)*(i===0||i===n?.5:1);}
    return length*total/n;
  }
  const path=points=>points.slice(1).reduce((sum,p,i)=>sum+segment(points[i],p),0);
  return {multiplier,segment,path};
}
