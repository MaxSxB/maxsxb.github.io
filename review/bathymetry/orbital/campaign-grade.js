'use strict';
// Share the source and alpha of the globe, including the sharp/soft limb option.
const gradeGlobe=document.querySelector('#globe');
const craterGrade=gradeGlobe.cloneNode(false);
craterGrade.id='crater-grade';craterGrade.alt='';craterGrade.setAttribute('aria-hidden','true');
gradeGlobe.after(craterGrade);
const earthTint=document.querySelector('#earth-tint');
// Median OG Atlantic colour: RGB(79,103,96), sampled away from the UI.
const ogPalette=document.createElementNS('http://www.w3.org/2000/svg','svg');
ogPalette.setAttribute('width','0');ogPalette.setAttribute('height','0');
ogPalette.style.position='absolute';ogPalette.setAttribute('aria-hidden','true');
ogPalette.innerHTML='<defs><filter id="og-periphery-colour" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 .309804 0 0 0 0 .403922 0 0 0 0 .376471 0 0 0 1 0"/></filter></defs>';
document.body.append(ogPalette);
const peripheryGrade=earthTint.cloneNode(false);
peripheryGrade.removeAttribute('style');
peripheryGrade.id='periphery-grade';peripheryGrade.setAttribute('aria-hidden','true');
earthTint.after(peripheryGrade);
document.querySelector('#fade').addEventListener('change',()=>{
  craterGrade.src=gradeGlobe.src;
  peripheryGrade.src=earthTint.src;
});

const gradeDefaults={colour:'#4f6760',intensity:100,x:57,y:57,width:55,height:70,start:28,softness:72,north:35};
const gradeKey='ua-campaign-blue-mask';
if(localStorage.getItem(gradeKey)===null)localStorage.setItem(gradeKey,JSON.stringify(gradeDefaults));
let gradeSettings=JSON.parse(localStorage.getItem(gradeKey));
const gradeControls=document.createElement('details');
gradeControls.id='grade-controls';
gradeControls.innerHTML='<summary>Masque bleu</summary><p>Le centre reste chaud ; le bleu apparaît autour. Les changements sont enregistrés automatiquement.</p><div class="grade-sliders"></div><button type="button">Réinitialiser le masque bleu</button>';
const gradeFields=[
  ['colour','Couleur','color'],['intensity','Intensité','range',0,100],
  ['x','Centre chaud · gauche / droite','range',0,100],['y','Centre chaud · haut / bas','range',0,100],
  ['width','Largeur du centre chaud','range',10,100],['height','Hauteur du centre chaud','range',10,120],
  ['start','Étendue sans bleu au centre','range',0,80],['softness','Douceur de la transition','range',5,150],
  ['north','Étendue du bleu depuis le haut','range',0,70]
];
for(const [name,title,type,min,max] of gradeFields){
  const label=document.createElement('label');
  label.innerHTML=`<span>${title}</span><input data-grade="${name}" type="${type}"${type==='range'?` min="${min}" max="${max}"`:''}><output></output>`;
  gradeControls.querySelector('.grade-sliders').append(label);
}
function applyBlueGrade(){
  const s=gradeSettings;
  const rgb=s.colour.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)/255);
  ogPalette.querySelector('feColorMatrix').setAttribute('values',`0 0 0 0 ${rgb[0]} 0 0 0 0 ${rgb[1]} 0 0 0 0 ${rgb[2]} 0 0 0 1 0`);
  peripheryGrade.style.opacity=s.intensity/100;
  peripheryGrade.style.maskImage=`linear-gradient(to bottom,#000,rgba(0,0,0,.4) ${s.north*17/35}%,transparent ${s.north}%),radial-gradient(ellipse ${s.width}% ${s.height}% at ${s.x}% ${s.y}%,transparent ${s.start}%,rgba(0,0,0,.22) ${s.start+s.softness*22/72}%,rgba(0,0,0,.75) ${s.start+s.softness*50/72}%,#000 ${s.start+s.softness}%)`;
  for(const input of gradeControls.querySelectorAll('input')){
    input.value=s[input.dataset.grade];
    input.nextElementSibling.value=input.type==='color'?input.value:input.value+' %';
  }
}
gradeControls.addEventListener('input',event=>{
  const input=event.target;
  gradeSettings[input.dataset.grade]=input.type==='color'?input.value:Number(input.value);
  applyBlueGrade();localStorage.setItem(gradeKey,JSON.stringify(gradeSettings));
});
gradeControls.querySelector('button').addEventListener('click',()=>{
  gradeSettings={...gradeDefaults};applyBlueGrade();localStorage.setItem(gradeKey,JSON.stringify(gradeSettings));
});
document.body.append(gradeControls);
applyBlueGrade();
