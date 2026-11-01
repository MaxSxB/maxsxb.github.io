'use strict';
const campaignLanguage=new URLSearchParams(location.search).get('lang');
document.documentElement.lang=campaignLanguage;
for(const mission of MAP_DATA.missions)mission.name=XP_TEXTS[campaignLanguage][mission.id].name;
document.addEventListener('DOMContentLoaded',()=>{
 const map=document.querySelector('#map'),identify=createCampaignHUD(map),sound=new Audio('../../../assets/click.wav');
 sound.preload='auto';map.tabIndex=0;
 document.querySelector('.campaign-heading').lastChild.textContent=XP_CAMPAIGNS.ghorkovs.title;
 map.addEventListener('missionchange',({detail})=>{
  identify(detail.id,detail.name);map.style.cursor=detail.id?'pointer':'default';
  if(detail.id){sound.currentTime=0;sound.play().catch(error=>{if(!['NotAllowedError','AbortError'].includes(error.name))throw error;});}
 });
 const hud=map.querySelector('.campaign-hud');
 hud.addEventListener('pointermove',event=>{map.dispatchEvent(new CustomEvent('missionfocus',{detail:255}));event.stopPropagation();});
 hud.addEventListener('click',event=>event.stopPropagation());
 const open=()=>{if(map.dataset.mission)window.top.location.href=new URL(`../../../index.html#brief/${map.dataset.mission}`,location.href).href;};
 map.addEventListener('click',open);
 map.addEventListener('keydown',event=>{if(event.target===map&&event.key==='Enter')open();});
 document.addEventListener('keydown',event=>{
  if(event.key==='F2'){event.preventDefault();const tools=document.querySelector('#tools');tools.hidden=false;tools.open=!tools.open;}
 });
});
