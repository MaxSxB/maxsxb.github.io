'use strict';
const campaignLanguage=new URLSearchParams(location.search).get('lang');
document.documentElement.lang=campaignLanguage;
for(const mission of MAP_DATA.missions)mission.name=XP_TEXTS[campaignLanguage][mission.id].name;
document.addEventListener('DOMContentLoaded',()=>{
 const identify=createCampaignHUD(map),sound=new Audio('../../../assets/click.wav');
 sound.preload='auto';map.tabIndex=0;
 document.querySelector('.campaign-heading').lastChild.textContent='Metropolis Dawn - Taerkastens';
 map.addEventListener('missionchange',({detail})=>{
  identify(detail.id,detail.name);map.style.cursor=detail.id?'pointer':'default';
  if(detail.id){sound.currentTime=0;sound.play().catch(error=>{if(!['NotAllowedError','AbortError'].includes(error.name))throw error;});}
 });
 const hud=map.querySelector('.campaign-hud');
 hud.addEventListener('pointermove',event=>{highlight(255);event.stopPropagation();});
 hud.addEventListener('click',event=>event.stopPropagation());
 const open=()=>{if(visible.has(hovered))window.top.location.href=new URL(`../../../index.html#brief/${hovered}`,location.href).href;};
 map.addEventListener('click',open);
 map.addEventListener('keydown',event=>{
  if(event.target!==map)return;
  if(event.key==='Enter'){open();return;}
  const direction={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[event.key];
  if(direction){event.preventDefault();const ids=data.missions.map(m=>m.id).filter(id=>visible.has(id));if(ids.length)highlight(ids[(ids.indexOf(hovered)+direction+ids.length)%ids.length]);}
 });
});
