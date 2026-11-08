// One pictogram definition for HTML/SVG and the 3D sign's canvas texture.
// Restrooms use a toilet fixture so unverified gender information stays unassigned.
const PATHS={
  restroom:['M4 3h6v8H4z','M3 11h18M6 11v3a6 6 0 0 0 12 0v-3','M10 20v1h7v-4M7 6h.01'],
  nursing:['M9 7V5a3 3 0 0 1 6 0v2','M8 7h8v3H8z','M8 10l-2 3v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-6l-2-3','M14 14h3M14 18h3'],
  playroom:['M6 7a3 3 0 1 1 4-3M14 4a3 3 0 1 1 4 3','M20 13a8 8 0 1 1-16 0 8 8 0 0 1 16 0','M9 11h.01M15 11h.01','M9 16q3 3 6 0M12 14h.01'],
  elevator:['M4 9h16v13H4z','M6 6V1M3.5 3.5 6 1l2.5 2.5M18 1v5m-2.5-2.5L18 6l2.5-2.5','M13.5 12.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0','M9 18v-2h6v2M11 16v4m2-4v4'],
  information:['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0','M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 17h.01'],
  ticket:['M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4z','M15 6v2m0 3v2m0 3v2']
};

export function facilityIconKey(feature){
  if(!feature)return null;
  if(feature.type==='restroom'||feature.kind==='restroom')return 'restroom';
  if(feature.type==='elevator')return 'elevator';
  const name=feature.amenity?.name||feature.name||'';
  if(name.includes('수유실'))return 'nursing';
  if(name.includes('놀이방'))return 'playroom';
  if(feature.amenity?.category==='안내')return 'information';
  if(feature.amenity?.category==='발권')return 'ticket';
  return null;
}

const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function facilityIconSvg(feature){
  const key=facilityIconKey(feature);if(!key)return '';
  return `<svg class="facility-pictogram" data-facility-icon="${key}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[key].map(d=>`<path d="${d}"/>`).join('')}</svg>`;
}
export function facilityLabel(feature,text=feature?.name||''){
  return `<span class="facility-label">${facilityIconSvg(feature)}<span>${escape(text)}</span></span>`;
}

const canvasPaths=new Map();
export function drawFacilityIcon(ctx,key,x,y,size){
  if(!PATHS[key])return;
  if(!canvasPaths.has(key))canvasPaths.set(key,PATHS[key].map(d=>new Path2D(d)));
  ctx.save();ctx.translate(x,y);ctx.scale(size/24,size/24);
  ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=1.9;ctx.lineCap='round';ctx.lineJoin='round';
  for(const path of canvasPaths.get(key))ctx.stroke(path);
  ctx.restore();
}
