export function resample(points,count=100){
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
  return Array.from({length:count},(_,n)=>{const d=n/(count-1)*lengths.at(-1);let i=1;while(i<lengths.length-1&&lengths[i]<d)i++;const t=(d-lengths[i-1])/(lengths[i]-lengths[i-1]);return points[i-1].map((v,k)=>v+(points[i][k]-v)*t);});
}
export function containsPoint([x,z],poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,zi]=poly[i],[xj,zj]=poly[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)inside=!inside;}return inside;}
export function rectCorners(x,z,width,depth,yaw=0){return [[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]].map(([a,b])=>[x+Math.cos(yaw)*a+Math.sin(yaw)*b,z-Math.sin(yaw)*a+Math.cos(yaw)*b]);}
export function insideRect(x,z,c,margin=0){const dx=x-c.x,dz=z-c.z,co=Math.cos(c.yaw||0),si=Math.sin(c.yaw||0);return Math.abs(co*dx-si*dz)<c.width/2+margin&&Math.abs(si*dx+co*dz)<c.depth/2+margin;}
export function segmentIntersectsRect(a,b,c,margin=0){
  const co=Math.cos(c.yaw||0),si=Math.sin(c.yaw||0),local=p=>[co*(p[0]-c.x)-si*(p[1]-c.z),si*(p[0]-c.x)+co*(p[1]-c.z)],p=local(a),q=local(b),half=[c.width/2+margin,c.depth/2+margin];let enter=0,leave=1;
  for(let k=0;k<2;k++){const d=q[k]-p[k];if(Math.abs(d)<1e-10){if(Math.abs(p[k])>=half[k])return false;continue;}let t0=(-half[k]-p[k])/d,t1=(half[k]-p[k])/d;if(t0>t1)[t0,t1]=[t1,t0];enter=Math.max(enter,t0);leave=Math.min(leave,t1);if(enter>=leave-1e-9)return false;}
  return enter<1-1e-9&&leave>1e-9;
}
export function segmentIntersectsPolygon(a,b,poly){
  if(containsPoint(a,poly)||containsPoint(b,poly))return true;
  const cross=(u,v)=>u[0]*v[1]-u[1]*v[0],r=[b[0]-a[0],b[1]-a[1]];
  for(let i=0;i<poly.length;i++){const c=poly[i],d=poly[(i+1)%poly.length],s=[d[0]-c[0],d[1]-c[1]],den=cross(r,s);if(Math.abs(den)<1e-10)continue;const q=[c[0]-a[0],c[1]-a[1]],t=cross(q,s)/den,u=cross(q,r)/den;if(t>=0&&t<=1&&u>=0&&u<=1)return true;}
  return false;
}

// Both neighbouring spans share exactly the same cross-section at each bend.
export function ribbonEdges(path,width){
  return path.map((p,i)=>{
    const normal=(a,b)=>{const dx=b[0]-a[0],dz=b[2]-a[2],d=Math.hypot(dx,dz);return [-dz/d,dx/d];};
    const before=normal(path[Math.max(0,i-1)],path[i===0?1:i]),after=normal(path[i===path.length-1?i-1:i],path[Math.min(path.length-1,i+1)]);
    let nx=before[0]+after[0],nz=before[1]+after[1],len=Math.hypot(nx,nz);nx/=len;nz/=len;
    const extent=Math.min(width*1.5,width/2/Math.max(.35,nx*after[0]+nz*after[1]));
    return [[p[0]+nx*extent,p[1],p[2]+nz*extent],[p[0]-nx*extent,p[1],p[2]-nz*extent]];
  });
}
export function ribbonOutline(c,width=c.width,extend=0){
  const path=c.path.map(p=>[...p]);
  for(const [i,j]of [[0,1],[path.length-1,path.length-2]]){const p=path[i],q=path[j],d=Math.hypot(p[0]-q[0],p[2]-q[2]);p[0]+=(p[0]-q[0])/d*extend;p[2]+=(p[2]-q[2])/d*extend;}
  const edges=ribbonEdges(path,width);return [...edges.map(e=>[e[0][0],e[0][2]]),...edges.toReversed().map(e=>[e[1][0],e[1][2]])];
}
export function ribbonHeight(x,z,c){
  const edges=ribbonEdges(c.path,c.width);
  for(let i=1;i<edges.length;i++)for(const [a,b,d]of [[edges[i-1][0],edges[i][0],edges[i][1]],[edges[i-1][0],edges[i][1],edges[i-1][1]]]){
    const det=(b[2]-d[2])*(a[0]-d[0])+(d[0]-b[0])*(a[2]-d[2]);
    const u=((b[2]-d[2])*(x-d[0])+(d[0]-b[0])*(z-d[2]))/det,v=((d[2]-a[2])*(x-d[0])+(a[0]-d[0])*(z-d[2]))/det;
    if(u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7)return a[1]*u+b[1]*v+d[1]*(1-u-v);
  }
  return null;
}
