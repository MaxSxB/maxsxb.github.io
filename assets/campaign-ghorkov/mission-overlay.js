/* Mission ownership, unique borders, square grids and hover presentation. */
(()=>{
 'use strict';
 const data=MAP_DATA,map=document.querySelector('#map'),size=data.width*data.height;
 function decode(runs){
  const result=new Uint8Array(size);let position=0;
  for(let i=0;i<runs.length;i+=2){result.fill(runs[i],position,position+runs[i+1]);position+=runs[i+1];}
  if(position!==size)throw new Error('Invalid mission raster');return result;
 }
 const owners=decode(data.owners),gridOwners=decode(data.gridOwners),gridAlpha=decode(data.gridAlpha);
 const regions=new Map(data.missions.map(m=>[m.id,new Path2D(m.d)]));
 const boundaries=data.boundaries.map(b=>({...b,path:new Path2D(b.d)}));
 const outline=new Path2D(data.missions.map(m=>m.d).join(''));
 const visible=new Set(regions.keys());let hovered=255;
 const controls=Object.fromEntries(['border-alpha','border-width','mission-grid','all-lit','mission-numbers','outside-opacity'].map(id=>[id,document.getElementById(id)]));
 const grid=document.querySelector('#mission-grid-canvas').getContext('2d');
 const borders=document.querySelector('#mission-borders').getContext('2d');
 const shade=document.querySelector('#outside-shade').getContext('2d');
 const tint=document.querySelector('#mission-tint').getContext('2d');
 const hoverImage=document.querySelector('#hover-terrain');
 const hoverLayers=[hoverImage,...document.querySelectorAll('.western-hover')];
 const ink=new OffscreenCanvas(data.width,data.height).getContext('2d');
 const maskCanvas=document.createElement('canvas');maskCanvas.width=data.width;maskCanvas.height=data.height;
 const maskContext=maskCanvas.getContext('2d'),masks=new Map();
 const pixels=grid.createImageData(data.width,data.height);
 function selectionMask(ids){
  const key=ids.join(',');
  if(!masks.has(key)){
   maskContext.clearRect(0,0,data.width,data.height);maskContext.fillStyle='#fff';
   for(const id of ids)maskContext.fill(regions.get(id));
   masks.set(key,`url(${maskCanvas.toDataURL()})`);
  }
  return masks.get(key);
 }
 function drawHover(){
  const selected=[...visible].filter(id=>controls['all-lit'].checked||id===hovered);
  for(let i=0;i<size;i++){
   const lit=controls['all-lit'].checked||gridOwners[i]===hovered,p=i*4;
   pixels.data[p]=lit?255:235;pixels.data[p+1]=lit?250:233;pixels.data[p+2]=lit?232:230;
   pixels.data[p+3]=controls['mission-grid'].checked&&visible.has(gridOwners[i])?Math.round(gridAlpha[i]*(lit?1:.32)):0;
  }
  grid.putImageData(pixels,0,0);
  for(const layer of hoverLayers){layer.style.visibility=selected.length?'visible':'hidden';layer.style.maskImage=selectionMask(selected);}
  tint.clearRect(0,0,data.width,data.height);tint.fillStyle='rgba(245,145,35,.67)';
  for(const id of selected)tint.fill(regions.get(id));
 }
 function drawStatic(){
  shade.clearRect(0,0,data.width,data.height);shade.globalCompositeOperation='source-over';
  shade.fillStyle=`rgba(6,10,8,${Number(controls['outside-opacity'].value)/100})`;shade.fillRect(0,0,data.width,data.height);
  shade.globalCompositeOperation='destination-out';shade.fillStyle='#fff';shade.fill(outline);
  shade.globalCompositeOperation='source-over';
  ink.clearRect(0,0,data.width,data.height);ink.lineJoin='round';
  for(const [ratio,color] of [[1,'#bc8580'],[.84,'#d8aaa4'],[.62,'#f2d8d3'],[.32,'#fffefd']]){
   ink.lineWidth=Number(controls['border-width'].value)*ratio;ink.strokeStyle=color;
   for(const coastal of [false,true]){
    const path=new Path2D();
    for(const b of boundaries)if(b.ids.includes(255)===coastal&&b.ids.some(id=>visible.has(id)))path.addPath(b.path);
    ink.lineCap=coastal?'round':'butt';ink.save();if(!coastal)ink.clip(outline);ink.stroke(path);ink.restore();
   }
  }
  borders.clearRect(0,0,data.width,data.height);borders.globalAlpha=Number(controls['border-alpha'].value)/100;
  borders.drawImage(ink.canvas,0,0);borders.globalAlpha=1;
  if(controls['mission-numbers'].checked){
   borders.font='bold 21px Segoe UI';borders.textAlign='center';borders.textBaseline='middle';borders.lineWidth=4;
   for(const mission of data.missions)if(visible.has(mission.id)){
    borders.strokeStyle='#21181a';borders.strokeText(mission.id,...mission.center);
    borders.fillStyle='#fff2ec';borders.fillText(mission.id,...mission.center);
   }
  }
  document.querySelector('#mission-count').textContent=`${visible.size} / ${data.missions.length}`;
  drawHover();
 }
 function highlight(id){
  if(!visible.has(id))id=255;if(id===hovered)return;hovered=id;
  const mission=data.missions.find(m=>m.id===id);
  document.querySelector('#mission-title h2').textContent=mission?mission.name:'Survolez un territoire';
  document.querySelector('#mission-title p').textContent=mission?`Mission ${id} · Metropolis Dawn`:`${data.missions.length} missions · découpage OG`;
  map.dataset.mission=id===255?'':id;
  map.dispatchEvent(new CustomEvent('missionchange',{detail:{id:id===255?0:id,name:mission?mission.name:''}}));
  drawHover();
 }
 map.addEventListener('pointermove',event=>{
  const rect=map.getBoundingClientRect(),x=Math.floor((event.clientX-rect.left)*data.width/rect.width),y=Math.floor((event.clientY-rect.top)*data.height/rect.height);
  highlight(x>=0&&x<data.width&&y>=0&&y<data.height?owners[y*data.width+x]:255);
 });
 map.addEventListener('pointerleave',()=>highlight(255));
 map.addEventListener('missionfocus',event=>highlight(event.detail));
 map.addEventListener('keydown',event=>{
  if(event.target!==map)return;
  const direction={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[event.key];
  if(direction){event.preventDefault();const ids=[...visible];if(ids.length)highlight(ids[(ids.indexOf(hovered)+direction+ids.length)%ids.length]);}
 });
 map.addEventListener('backgroundchange',event=>hoverImage.src=event.detail.src);
 for(const mission of [...data.missions].sort((a,b)=>a.id-b.id)){
  const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;input.value=mission.id;
  label.append(input,`${mission.id} · ${mission.name}`);document.querySelector('#mission-list').append(label);
  input.addEventListener('change',()=>{
   input.checked?visible.add(mission.id):visible.delete(mission.id);if(!visible.has(hovered))highlight(255);drawStatic();
  });
  label.addEventListener('pointerenter',()=>highlight(mission.id));label.addEventListener('pointerleave',()=>highlight(255));
  input.addEventListener('focus',()=>highlight(mission.id));input.addEventListener('blur',()=>highlight(255));
 }
 for(const [id,show] of [['show-missions',true],['hide-missions',false]])document.getElementById(id).onclick=()=>{
  visible.clear();if(show)data.missions.forEach(m=>visible.add(m.id));
  document.querySelectorAll('#mission-list input').forEach(input=>input.checked=show);highlight(255);drawStatic();
 };
 Object.values(controls).forEach(input=>input.addEventListener('input',drawStatic));
 drawStatic();
})();
