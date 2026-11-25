'use strict';
const screen=document.querySelector('#screen');
const escapeText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nameOf=id=>Object.values(XP_CAMPAIGNS).some(c=>c.ids.includes(id))?XP_TEXTS.en[id].name:GAME_TEXT[1800+id];
const clock=seconds=>new Date(seconds*1000).toISOString().slice(11,19);
const resize=()=>document.documentElement.style.setProperty('--scale',Math.min(innerWidth/1920,innerHeight/1080));
addEventListener('resize',resize);resize();
let timer;
async function renderDebrief(){
  clearInterval(timer);
  const id=Number(location.hash.slice(1)||1),data=await loadBriefing(id);
  // Layout fixture only: the web menu has no recorded game session.
  const history=[{time:140,label:'Unit created',x:.68,y:.43},{time:370,label:'Sector captured',x:.55,y:.49},{time:640,label:'Enemy unit destroyed',x:.35,y:.55},{time:910,label:'Technology acquired',x:.45,y:.63},{time:1240,label:'Beam gate secured',x:.3,y:.75}];
  const duration=1240;
  let position=duration,playing=false;
  const campaign=Object.keys(XP_CAMPAIGNS).find(k=>XP_CAMPAIGNS[k].ids.includes(id))||'resistance';
  screen.innerHTML=`<article class="hyde-briefing debrief"><header><div><span class="hyde-kicker">${campaign.toUpperCase()} / AFTER-ACTION REPORT</span><h1>${escapeText(nameOf(id))}</h1><span class="hyde-subtitle">MISSION DEBRIEFING</span></div><div class="preview-controls"><label for="mission">Layout preview · sample battle results</label><select id="mission">${Object.keys(SATELLITE_BRIEFING_PATHS).map(Number).map(n=>`<option value="${n}" ${n===id?'selected':''}>${String(n).padStart(2,'0')} — ${escapeText(nameOf(n))}</option>`).join('')}</select></div></header>
  <div class="hyde-content"><div><div class="hyde-map-frame"><div class="hyde-map-surface" style="width:${720*Math.min(1,data.size[0]/data.size[1])}px;height:${720*Math.min(1,data.size[1]/data.size[0])}px"><img class="debrief-map" src="${data.aerial}" alt="${escapeText(nameOf(id))} tactical map"><svg class="debrief-overlay" viewBox="0 0 720 720" preserveAspectRatio="none"></svg></div></div><div class="hyde-map-caption"><span>BATTLE HISTORY</span><span>${data.size.join(' × ')} SECTORS</span></div></div>
  <div class="debrief-side"><section class="debrief-card"><h2>Operation summary</h2><div class="debrief-summary"><div><small>MISSION SCORE</small><strong>12,480</strong><span>Overall score · 48,720</span></div><div><small>MISSION TIME</small><strong>${clock(duration)}</strong><span>Overall time · 02:14:36</span></div></div></section>
  <section class="debrief-card"><h2>Units destroyed</h2><table><thead><tr><th>Faction</th><th>By player</th><th>Total</th></tr></thead><tbody><tr><td>${campaign==='resistance'?'Resistance':campaign==='ghorkovs'?'Ghorkovs':'Taerkastens'}</td><td>18</td><td>42</td></tr><tr><td>Opposing forces</td><td>—</td><td>11</td></tr></tbody></table></section>
  <section class="debrief-card debrief-log"><h2>Battle events</h2><ol id="events"></ol><p id="technology"></p></section></div></div>
  <footer><div class="hyde-playback"><button class="metal" id="restart">Restart</button><button class="metal" id="play">Play</button></div><label class="timeline"><input aria-label="Battle history position" id="timeline" type="range" min="0" max="${duration}" value="${duration}"><output id="time"></output></label><a class="metal" href="index.html#brief/${id}">Briefing</a><a class="metal" href="index.html#solo/${campaign}">Campaign map</a></footer></article>`;
  const draw=()=>{
    document.querySelector('#timeline').value=position;
    document.querySelector('#time').textContent=clock(position);
    document.querySelector('#play').textContent=playing?'Pause':'Play';
    const visible=history.filter(e=>e.time<=position);
    document.querySelector('#events').innerHTML=visible.map(e=>`<li><time>${clock(e.time)}</time><span>${e.label}</span></li>`).join('');
    document.querySelector('#technology').textContent=position>=910?'Technology acquired · weapon upgrade':'';
    document.querySelector('.debrief-overlay').innerHTML=visible.filter(e=>e.label!=='Technology acquired').map(e=>{
      const symbol=e.label.includes('Unit')||e.label.includes('unit')?'DB_DEATH':'DB_SEC';
      return `<g transform="translate(${e.x*720},${e.y*720}) scale(.012)" fill="none" stroke="#c6f8e6" stroke-width="110" stroke-linecap="round" stroke-linejoin="round">${DEBRIEF_SYMBOLS[symbol].map(path=>`<path d="M${path.map(p=>p.join(',')).join(' L')}"/>`).join('')}</g>`;
    }).join('');
  };
  document.querySelector('#mission').onchange=e=>{location.hash=e.target.value;};
  document.querySelector('#timeline').oninput=e=>{position=Number(e.target.value);playing=false;draw();};
  document.querySelector('#restart').onclick=()=>{position=0;playing=true;draw();};
  document.querySelector('#play').onclick=()=>{if(position===duration)position=0;playing=!playing;draw();};
  timer=setInterval(()=>{if(!playing)return;position=Math.min(duration,position+12);if(position===duration)playing=false;draw();},200);
  draw();
}
addEventListener('hashchange',renderDebrief);renderDebrief();
