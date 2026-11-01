function mountCampaignShell(){
  if(new URLSearchParams(location.search).get('menu')!=='1')return;
  document.body.classList.add('campaign-embedded');
  const controls=document.createElement('details');controls.id='campaign-settings';
  const summary=document.createElement('summary');summary.textContent='Personnaliser la carte';controls.append(summary);
  for(const node of [...document.body.children]){
    if(['LABEL','A','SMALL'].includes(node.tagName)||['mission-controls','grade-controls'].includes(node.id))controls.append(node);
  }
  document.body.append(controls);
  document.querySelector('#highlight-visible').checked=false;
  const inputs=[...controls.querySelectorAll('input:not([data-grade])')];
  const key='ua-campaign-customization';
  const capture=()=>inputs.map(input=>input.type==='checkbox'?input.checked:input.value);
  if(sessionStorage.getItem(key)===null)sessionStorage.setItem(key,JSON.stringify(capture()));
  const saved=JSON.parse(sessionStorage.getItem(key));
  if(saved.length!==inputs.length)throw new Error('Réglages de campagne incohérents');
  inputs.forEach((input,i)=>{
    const changed=(input.type==='checkbox'?input.checked:input.value)!==saved[i];
    if(input.type==='checkbox')input.checked=saved[i];else input.value=saved[i];
    if(changed)input.dispatchEvent(new Event(input.type==='range'?'input':'change',{bubbles:true}));
  });
  controls.addEventListener('input',()=>sessionStorage.setItem(key,JSON.stringify(capture())));
  controls.addEventListener('change',()=>sessionStorage.setItem(key,JSON.stringify(capture())));
  controls.addEventListener('click',e=>{
    if(e.target.matches('#show-all,#hide-all'))sessionStorage.setItem(key,JSON.stringify(capture()));
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();window.top.location.href=new URL('../../../index.html#home',location.href).href;}
    if(e.key==='F2'){e.preventDefault();controls.open=!controls.open;}
  });
}
