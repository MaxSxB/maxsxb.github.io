'use strict';
const assetRoot=new URL('.',document.currentScript.src),asset=path=>new URL(path,assetRoot).href;
const background=document.querySelector('#background'),terrain=document.querySelector('#terrain'),tools=document.querySelector('#tools');
const grading=document.querySelector('#grading'),strength=document.querySelector('#global-grade'),render=document.querySelector('#global-render');
const retouch=document.querySelector('#retouch');
const softBlacks=document.querySelector('#soft-blacks');
const reliefs=[...document.querySelectorAll('.relief')];
const westernReliefs=[...document.querySelectorAll('.western-relief,.western-hover')];
function updateGlobalGrade(){
 const flags=reliefs.map(layer=>Number(!layer.hidden)).join('');
 document.querySelector('#volcano-saturation').setAttribute('values',grading.checked&&!document.querySelector('#volcan').hidden?'2.05':'1');
 render.hidden=background.value!=='grading-resistance-eaux-v2.png';
 retouch.disabled=render.hidden;
 softBlacks.disabled=render.hidden;
 const retouched=retouch.checked&&!retouch.disabled;
 document.querySelectorAll('.background-edit').forEach(layer=>layer.hidden=!retouched);
 render.src=asset(`dynamique-reliefs-v3/rendus/${softBlacks.checked?'noirs-adoucis/':''}${retouched?'retouche/':''}${grading.checked?'grade':'brut'}-${flags}.webp`);
 render.style.opacity=Number(strength.value)/100;
 strength.disabled=render.hidden;
 document.querySelector('#global-grade-value').value=`${strength.value} %`;
 document.querySelector('#render-link').href=render.hidden?terrain.src:render.src;
 document.querySelector('#map').dispatchEvent(new CustomEvent('backgroundchange',{detail:{src:render.hidden?terrain.src:render.src}}));
}
background.addEventListener('change',()=>{
 terrain.src=asset(background.value);
 terrain.alt=background.selectedOptions[0].textContent;
 document.querySelector('#image-link').href=asset(background.value);
 updateGlobalGrade();
});
document.querySelectorAll('[data-layer]').forEach(control=>control.addEventListener('change',()=>{
 document.getElementById(control.dataset.layer).hidden=!control.checked;
 updateGlobalGrade();
}));
document.querySelectorAll('[data-west-layer]').forEach(control=>control.addEventListener('change',()=>{
 document.getElementById(control.dataset.westLayer).hidden=!control.checked;
 document.getElementById(control.dataset.westLayer+'-hover').hidden=!control.checked;
}));
grading.addEventListener('change',event=>{
 reliefs.forEach(layer=>{
  layer.src=asset(`calque-${layer.id}-${event.target.checked?'grade':'brut'}-v2.png`);
 });
 westernReliefs.forEach(layer=>{
  layer.src=asset(`raccords-ouest-v4/calque-ouest-${layer.dataset.relief}-${event.target.checked?'grade':'brut'}.png`);
 });
 updateGlobalGrade();
});
strength.addEventListener('input',updateGlobalGrade);
retouch.addEventListener('change',updateGlobalGrade);
softBlacks.addEventListener('change',updateGlobalGrade);
updateGlobalGrade();
document.addEventListener('keydown',event=>{
 if(event.key.toLowerCase()==='h'&&event.target!==background)tools.hidden=!tools.hidden;
});
