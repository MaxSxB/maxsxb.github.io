'use strict';
const data=MAP_DATA,map=document.querySelector('#map'),size=data.width*data.height;
function decode(runs){
 const a=new Uint8Array(size);let offset=0;
 for(let i=0;i<runs.length;i+=2){a.fill(runs[i],offset,offset+runs[i+1]);offset+=runs[i+1];}
 if(offset!==size)throw new Error('Emprise invalide');return a;
}
const owners=decode(data.owners),gridOwners=decode(data.gridOwners),gridAlpha=decode(data.gridAlpha);
const visible=new Set(data.missions.map(m=>m.id));
const paths=data.boundaries.map(b=>({...b,path:new Path2D(b.d)}));
const regions=new Map(data.missions.map(m=>[m.id,new Path2D(m.d)]));
const campaignOutline=new Path2D(data.missions.map(m=>m.d).join(''));
const silhouette=document.createElement('canvas');silhouette.width=data.width;silhouette.height=data.height;
const maskContext=silhouette.getContext('2d'),masks=new Map();
function maskURL(ids){
 const key=ids.join(',');
 if(!masks.has(key)){
  maskContext.clearRect(0,0,data.width,data.height);maskContext.fillStyle='#fff';
  for(const id of ids)maskContext.fill(regions.get(id));
  masks.set(key,'url('+silhouette.toDataURL()+')');
 }
 return masks.get(key);
}
document.querySelector('#campaign-contrast').style.maskImage=maskURL([...regions.keys()]);
map.style.setProperty('--campaign-mask',maskURL([...regions.keys()]));
const hoverTerrain=document.querySelector('#hover-contrast'),tint=document.querySelector('#territory-tint').getContext('2d');
const context=document.querySelector('#missions').getContext('2d'),borders=document.querySelector('#borders').getContext('2d');
const borderInk=new OffscreenCanvas(data.width,data.height).getContext('2d');
const borderGradient=[[1,'#c49838'],[.84,'#ddbb64'],[.62,'#f5e4ac'],[.32,'#fffef6']];
const pixels=context.createImageData(data.width,data.height);
for(let i=0;i<size;i++)if(owners[i]===255){
 pixels.data.set([6,10,8,82],i*4);
}
document.querySelector('#outside-shade').getContext('2d').putImageData(pixels,0,0);
const fields=['intensity','glow','border-alpha','border-width','grid','all-lit','numbers'];
const controls=Object.fromEntries(fields.map(k=>[k,document.getElementById(k)]));
const defaults={intensity:55,glow:30,'border-alpha':75,'border-width':13,grid:true,'all-lit':false,numbers:false};
const borderWidth=value=>value*3/13;
const key='ua-taerkasten-working-map-v1';
if(localStorage.getItem(key)===null)localStorage.setItem(key,JSON.stringify(defaults));
const saved=JSON.parse(localStorage.getItem(key));
for(const [name,input] of Object.entries(controls))input[input.type==='checkbox'?'checked':'value']=saved[name];
let hovered=255;
function render(){
 document.querySelector('#yellow').style.opacity=controls.intensity.value/100;
 document.querySelector('#light').style.opacity=controls.glow.value/200;
 for(const input of Object.values(controls))if(input.type==='range')input.nextElementSibling.value=input.id==='border-width'?borderWidth(input.value).toFixed(1):input.value+' %';
 for(let i=0;i<size;i++){
  const lit=controls['all-lit'].checked||gridOwners[i]===hovered;
  const line=controls.grid.checked&&visible.has(gridOwners[i])?gridAlpha[i]/255*(lit?1:.32):0;
  const p=i*4;
  pixels.data[p]=lit?255:235;pixels.data[p+1]=lit?250:233;pixels.data[p+2]=lit?232:220;
  pixels.data[p+3]=Math.round(line*255);
 }
 context.putImageData(pixels,0,0);
 const selected=[...visible].filter(id=>controls['all-lit'].checked||id===hovered);
 hoverTerrain.style.visibility=selected.length?'visible':'hidden';
 hoverTerrain.style.maskImage=maskURL(selected);
 tint.clearRect(0,0,data.width,data.height);tint.fillStyle='rgba(245,145,35,.72)';
 for(const id of selected)tint.fill(regions.get(id));
 borders.clearRect(0,0,data.width,data.height);
 borderInk.clearRect(0,0,data.width,data.height);
 borderInk.lineJoin='round';borderInk.lineCap='butt';
 const width=borderWidth(controls['border-width'].value);
 for(const [ratio,color] of borderGradient){
  borderInk.lineWidth=width*ratio;borderInk.strokeStyle=color;borderInk.shadowBlur=0;
  for(const coastal of [false,true]){
   borderInk.lineCap=coastal?'round':'butt';
   const combined=new Path2D();
   for(const boundary of paths)if(boundary.ids.includes(255)===coastal&&boundary.ids.some(id=>visible.has(id)))combined.addPath(boundary.path);
   borderInk.save();
   if(!coastal)borderInk.clip(campaignOutline);
   borderInk.stroke(combined);borderInk.restore();
  }
 }
 borders.globalAlpha=controls['border-alpha'].value/100;
 borders.drawImage(borderInk.canvas,0,0);borders.globalAlpha=1;
 if(controls.numbers.checked){
  borders.font='bold 22px Segoe UI';borders.textAlign='center';borders.textBaseline='middle';borders.lineWidth=4;
  for(const m of data.missions)if(visible.has(m.id)){borders.strokeStyle='#17201b';borders.strokeText(m.id,...m.center);borders.fillStyle='#fff5ca';borders.fillText(m.id,...m.center);}
 }
 document.querySelector('#count').textContent=`${visible.size} / ${data.missions.length}`;
}
function highlight(id){
 if(!visible.has(id))id=255;if(id===hovered)return;hovered=id;
 const mission=data.missions.find(m=>m.id===id);
 document.querySelector('#mission-title h2').textContent=mission?mission.name:'Survolez un territoire';
 document.querySelector('#mission-title p').textContent=mission?`Mission ${mission.id} · Metropolis Dawn`:'15 missions · découpage OG';
 map.dispatchEvent(new CustomEvent('missionchange',{detail:{id:mission?mission.id:0,name:mission?mission.name:''}}));
 render();
}
map.addEventListener('pointermove',event=>{
 const rect=map.getBoundingClientRect(),x=Math.floor((event.clientX-rect.left)*data.width/rect.width),y=Math.floor((event.clientY-rect.top)*data.height/rect.height);
 highlight(x>=0&&x<data.width&&y>=0&&y<data.height?owners[y*data.width+x]:255);
});
map.addEventListener('pointerleave',()=>highlight(255));
for(const m of data.missions){
 const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;input.value=m.id;
 label.append(input,`${m.id} · ${m.name}`);document.querySelector('#mission-list').append(label);
 input.addEventListener('change',()=>{input.checked?visible.add(m.id):visible.delete(m.id);if(!visible.has(hovered))highlight(255);render();});
 label.addEventListener('mouseenter',()=>highlight(m.id));label.addEventListener('mouseleave',()=>highlight(255));
 input.addEventListener('focus',()=>highlight(m.id));input.addEventListener('blur',()=>highlight(255));
}
for(const [id,show] of [['show-all',true],['hide-all',false]])document.getElementById(id).onclick=()=>{
 visible.clear();if(show)data.missions.forEach(m=>visible.add(m.id));
 document.querySelectorAll('#mission-list input').forEach(input=>input.checked=show);highlight(255);render();
};
function save(){localStorage.setItem(key,JSON.stringify(Object.fromEntries(Object.entries(controls).map(([name,input])=>[name,input.type==='checkbox'?input.checked:Number(input.value)]))));render();}
Object.values(controls).forEach(input=>input.addEventListener('input',save));
document.querySelector('#reset').onclick=()=>{for(const [name,input] of Object.entries(controls))input[input.type==='checkbox'?'checked':'value']=defaults[name];save();};
document.addEventListener('keydown',e=>{if(e.key==='F2'){e.preventDefault();document.querySelector('#settings').open=!document.querySelector('#settings').open;}});
render();
