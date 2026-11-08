import * as THREE from 'three';

// Road paint: a flat continuous ribbon with quiet pale edges, no endpoint
// circles, tubes, floating labels or animated markers.
export function createGuidanceLine(points,width,material,surfaceHeight){
  const samples=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/.22));
    for(let j=i===1?0:1;j<=n;j++)samples.push(a.map((v,k)=>v+(b[k]-v)*j/n));
  }
  if(samples.length<2)return null;
  const vertices=[],indices=[];
  for(let i=0;i<samples.length;i++){
    const p=samples[i],a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)],len=Math.hypot(b[0]-a[0],b[2]-a[2])||1;
    const nx=-(b[2]-a[2])/len,nz=(b[0]-a[0])/len;
    for(const sign of [-1,1]){
      const x=p[0]+nx*width/2*sign,z=p[2]+nz*width/2*sign;
      vertices.push(x,(surfaceHeight?.(x,p[1],z)??p[1])+.045,z);
    }
    if(i){const k=i*2;indices.push(k-2,k,k-1,k,k+1,k-1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);mesh.name='floor_guidance_paint';mesh.renderOrder=12;return mesh;
}

export function createPaintSurfaceSampler(root){
  root.updateWorldMatrix(true,true);
  const objects=[];
  root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.material?.map)objects.push({mesh:o,box:new THREE.Box3().setFromObject(o)});});
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),cache=new Map();
  return (x,y,z)=>{
    const key=[x,y,z].map(n=>n.toFixed(3)).join(',');if(cache.has(key))return cache.get(key);
    const nearby=objects.filter(({box:b})=>x>=b.min.x&&x<=b.max.x&&z>=b.min.z&&z<=b.max.z&&y+.3>=b.min.y&&y-.3<=b.max.y).map(o=>o.mesh);
    ray.set(new THREE.Vector3(x,y+.31,z),down);ray.far=.65;
    const hit=ray.intersectObjects(nearby,false).find(h=>h.face.normal.clone().transformDirection(h.object.matrixWorld).y>.4);
    const height=hit?.point.y??y;cache.set(key,height);return height;
  };
}
