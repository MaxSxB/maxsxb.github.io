'use strict';
const $ = selector => document.querySelector(selector);
const escapeHTML = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key = 'ua-menu-public-v1';
if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify({settings:DEFAULT_SETTINGS,bindings:DEFAULT_BINDINGS,theme:THEME,saves:[],mission:1,campaign:'resistance',returnRoute:'solo'}));
const state = JSON.parse(localStorage.getItem(key));
let draft, binding = null, selectedSave = -1, networkMode = 'host', ready = false, route = 'home', revision = 0, toastTimer;
const audio = new Audio('assets/click.wav');
const persist = () => localStorage.setItem(key, JSON.stringify(state));
const navigate = page => { location.hash = page; };
const button = (label, action, value = '', attrs = '') => `<button class="metal" data-action="${action}" data-value="${escapeHTML(value)}" ${attrs}>${escapeHTML(label)}</button>`;
const check = (id,label) => `<label class="check"><input type="checkbox" data-setting="${id}" ${draft.settings[id]?'checked':''}>${label}</label>`;
const slider = (id,label,max) => `<div class="slider-row"><label for="${id}">${label}</label><input id="${id}" type="range" min="0" max="${max}" value="${draft.settings[id]}" data-setting="${id}"><output>${draft.settings[id]}</output></div>`;
const actions = (ok, label='OK', back='home') => `<div class="button-row bottom-row">${button(label,ok)}${button('Cancel','nav',back)}${button('Help','nav','help')}</div>`;
const panel = (title,intro,body,footer) => `<div class="menu-panel"><h1>${title}</h1><p class="intro">${intro}</p>${body}${footer}</div>`;
const bindingsHTML = () => Object.entries(draft.bindings).map(([name,value])=>`<button class="list-row" data-action="bind" data-value="${escapeHTML(name)}"><span>${escapeHTML(name)}</span><span>${escapeHTML(value)}</span></button>`).join('');
const notify = message => { $('#notice').textContent = message; $('#notice').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(()=>$('#notice').classList.remove('show'),3000); };
function applyTheme(){for(const [name,value] of Object.entries(state.theme)) document.documentElement.style.setProperty(name,value);}
function resize(){document.documentElement.style.setProperty('--scale',Math.min(innerWidth/1920,innerHeight/1080));}
window.addEventListener('resize',resize); resize(); applyTheme();

const texts=GAME_TEXT;
const missionName = id => Object.values(XP_CAMPAIGNS).some(c=>c.ids.includes(Number(id)))?XP_TEXTS[document.documentElement.lang][id].name:texts[1800+Number(id)];
const missionOptions = selected => LEVEL_IDS.map(id=>`<option value="${id}" ${id===Number(selected)?'selected':''}>${escapeHTML(missionName(id))}</option>`).join('');
function mapScreen(){
  const page=state.campaign==='ghorkovs'?'campaign-ghorkov.html?campaign=ghorkovs':state.campaign==='taerkastens'?'campaign-taerkasten.html?campaign=taerkastens':'nuages-centre-haut-45ccd84bbc26.html?menu=1';
  return `<iframe class="campaign-frame" title="Campaign map" src="review/bathymetry/orbital/${page}&lang=${encodeURIComponent(document.documentElement.lang)}"></iframe>`;
}
const screens = {
  home:()=>`<h1 class="logo"><img src="assets/logo-og.png" alt="Urban Assault" width="1090" height="165"></h1><nav class="home-nav" aria-label="Main menu">${MENU.map(([id,label,hint])=>button(label,id==='quit'?'quit':'nav',id,`data-hint="${hint}"`)).join('')}</nav>`,
  solo:mapScreen,
  training:()=>panel('Training missions','Select a mission to view its briefing.',`<div class="list">${[25,26,1].map(id=>`<button class="list-row" data-action="brief" data-value="${id}">${escapeHTML(missionName(id))}</button>`).join('')}</div>`,actions('trainingStart','Briefing','solo')),
  options:()=>panel(GAME_TEXT[327],'Choose your settings, then select OK.',`<div class="options-top"><label for="resolution">Display Resolution:</label><select id="resolution" data-setting="resolution">${['1280 × 720','1920 × 1080','2560 × 1440','3840 × 2160'].map(v=>`<option ${v===draft.settings.resolution?'selected':''}>${v}</option>`).join('')}</select><span>Renderer</span><span class="metal" style="min-height:28px;padding:5px;text-align:center;font-size:16px">WebGL</span></div><div class="option-checks">${[['horizon','Horizon Depth'],['sky','Sky'],['cursor','Software Cursor'],['windowed','Windowed Mode'],['textures','HD Textures'],['musicOn','Music'],['markers','Enemy Indicators'],['stereo','Stereo Reverse']].map(([id,label])=>check(id,label)).join('')}</div>${slider('explosions','Explosion Effects:',16)}${slider('effects','Sound Volume:',100)}${slider('music','Music Volume:',100)}`,actions('apply')),
  controls:()=>panel(GAME_TEXT[309],'Select a control and press a key. Press Escape to cancel.',`<div class="list">${bindingsHTML()}</div><div class="button-row small-row">${button('Delete assignment','clearBinding')}${button('Reset Defaults','resetBindings')}</div><div class="control-flags">${check('joystick','Enable Joystick')}${check('alternate','Alternate Control Mode')}${check('force','Enable Force Feedback')}</div>`,actions('apply')),
  saves:()=>panel('Save/Load','Select a saved profile or create a new one.',`<div class="list save-list">${state.saves.length?state.saves.map((save,i)=>`<button class="list-row ${i===selectedSave?'selected':''}" data-action="selectSave" data-value="${i}"><span>${escapeHTML(save.name)}</span><span>${escapeHTML(missionName(save.mission))}</span><span>${escapeHTML(save.date)}</span></button>`).join(''):'<p class="notice-copy" style="padding:20px">No saved profiles. Select New to create one.</p>'}</div><div class="button-row save-actions">${button('New','newSave')}${button('Load','loadSave','',''+(selectedSave<0?'disabled':''))}${button('Save','saveCurrent')}${button('Delete','deleteSave','',selectedSave<0?'disabled':'')}</div>`,actions('back','Back')),
  multi:()=>panel(GAME_TEXT[410],'Create or Join Session',`<div class="list"><button class="list-row ${networkMode==='host'?'selected':''}" data-action="networkMode" data-value="host">Create Session</button><button class="list-row ${networkMode==='join'?'selected':''}" data-action="networkMode" data-value="join">Join Session</button></div>`,actions('networkNext')),
  connection:()=>panel(networkMode==='host'?'Create Session':'Join Session','Enter Your Call Sign and Select Your Faction.',`<div class="form-grid"><label for="callsign">Call sign</label><input id="callsign" type="text" value="SDU 7" maxlength="28"><label for="session">${networkMode==='host'?'Session name':'Session address'}</label><input id="session" type="text" value="${networkMode==='host'?'Resistance':'127.0.0.1'}" maxlength="60"><label for="faction">Faction</label><select id="faction">${['Resistance','Ghorkovs','Taerkastens','Mykonians'].map(v=>`<option>${v}</option>`).join('')}</select><label for="network-map">Level</label><select id="network-map">${missionOptions(state.mission)}</select></div>`,actions('lobby','Continue','multi')),
  lobby:()=>panel(GAME_TEXT[415],`${escapeHTML(state.session.name)}`, `<div class="list lobby-table"><div class="list-row"><span>${escapeHTML(state.session.callsign)}</span><span>${escapeHTML(state.session.faction)}</span><span>${ready?'READY':'WAITING'}</span></div><div class="list-row"><span>Open slot</span><span>—</span></div><div class="list-row"><span>Open slot</span><span>—</span></div><div class="list-row"><span>Open slot</span><span>—</span></div></div><p class="notice-copy">Map: ${escapeHTML(missionName(state.mission))}</p><div class="button-row small-row">${button(ready?'Not ready':"I'm Ready!",'ready')}${button('Change Level','nav','connection')}</div>`,actions('launch','Start','multi')),
  help:()=>panel('Help','Field manual',`<div class="help-list">${HELP.map(([label],i)=>button(label,'nav',`help/${i}`)).join('')}</div><p class="notice-copy">Use the arrow keys and Enter to navigate. Escape goes back.</p>`,actions('back','Main menu')),
  launch:()=>`<div class="end-screen"><h1>${escapeHTML(missionName(state.mission))}</h1><p>Initializing neural transfer</p><div class="progress"><span></span></div><p>End of the preview.<br>The game does not run in this web interface.</p><div class="button-row">${button('Back to briefing','brief',state.mission)}${button('Main menu','nav','home')}</div></div>`,
  exit:()=>`<div class="end-screen"><h1>Connection closed</h1><p></p>${button('Back to main menu','nav','home')}</div>`
};
let stopBriefing=()=>{};
async function render(){
  stopBriefing();stopBriefing=()=>{};
  const current=++revision;binding=null;route=location.hash.slice(1);if(route==='')route='home';
  if(route.startsWith('solo/')){state.campaign=route.split('/')[1];persist();route='solo';}
  draft=structuredClone({settings:state.settings,bindings:state.bindings});
  $('#stage').className=route==='home'?'':route==='solo'?'map':'sub';$('#hint').textContent='';
  if(route.startsWith('brief/')){
    state.mission=Number(route.split('/')[1]);
    state.campaign=Object.keys(XP_CAMPAIGNS).find(key=>XP_CAMPAIGNS[key].ids.includes(state.mission)) || 'resistance';persist();
    $('#screen').innerHTML='';
    const [data]=await Promise.all([loadBriefing(state.mission),document.fonts.ready]);
    if(current!==revision)return;
    $('#screen').innerHTML=briefingMarkup(state.mission,escapeHTML(missionName(state.mission)),data);
    await loadBriefingModels(data);
    if(current!==revision)return;
    stopBriefing=mountBriefing($('.hyde-briefing'),data,state.campaign==='resistance'?texts[2100+state.mission]:XP_TEXTS[document.documentElement.lang][state.mission].text,state.settings);
  }else if(route.startsWith('help/')){
    const [title,copy]=HELP[Number(route.split('/')[1])];$('#screen').innerHTML=panel(title,'Field manual',`<div class="help-copy">${copy.split('\n\n').map(p=>`<p>${escapeHTML(p)}</p>`).join('')}</div>`,actions('helpBack','Back','home'));
  }else $('#screen').innerHTML=screens[route]();
}
function openDialog(title,body,confirm,label='OK'){$('#dialog').innerHTML=`<h2>${title}</h2>${body}<div class="button-row">${button(label,confirm)}${button('Cancel','close')}</div>`;$('#dialog').showModal();}
const handlers = {
  nav:navigate,back:()=>navigate('home'),helpBack:()=>navigate('help'),brief:id=>navigate(`brief/${id}`),trainingStart:()=>navigate('brief/25'),launch:()=>{state.returnRoute=route;persist();navigate('launch');},
  close:()=>$('#dialog').close(),quit:()=>openDialog('Exit Urban Assault','<p>Exit Urban Assault?</p>','exit','Exit'),exit:()=>{$('#dialog').close();navigate('exit');},
  apply:()=>{Object.assign(state,draft);persist();navigate('home');notify('Settings saved');},
  bind:(name,element)=>{binding=name;element.lastElementChild.textContent='PRESS A KEY…';element.classList.add('selected');},
  clearBinding:()=>{openDialog('Delete assignment',`<select id="clear-key">${Object.keys(draft.bindings).map(name=>`<option>${escapeHTML(name)}</option>`).join('')}</select>`,'confirmClear');},
  confirmClear:()=>{draft.bindings[$('#clear-key').value]='—';$('#dialog').close();$('#screen .list').innerHTML=bindingsHTML();},
  resetBindings:()=>{draft.bindings=structuredClone(DEFAULT_BINDINGS);$('#screen .list').innerHTML=bindingsHTML();},
  selectSave:index=>{selectedSave=Number(index);render();},
  newSave:()=>openDialog('New profile','<label for="save-name">Call sign</label><input id="save-name" type="text" maxlength="40" value="SDU 7">','confirmSave','Save'),
  confirmSave:()=>{const name=$('#save-name').value.trim();if(!name){$('#save-name').focus();return;}state.saves.push({name,mission:state.mission,date:new Date().toLocaleDateString('en-GB')});selectedSave=state.saves.length-1;persist();$('#dialog').close();render();},
  saveCurrent:()=>{if(selectedSave<0){handlers.newSave();return;}Object.assign(state.saves[selectedSave],{mission:state.mission,date:new Date().toLocaleDateString('en-GB')});persist();render();notify('Profile saved');},
  loadSave:()=>{state.mission=state.saves[selectedSave].mission;persist();navigate(`brief/${state.mission}`);},
  deleteSave:()=>openDialog('Delete saved profile',`<p>${escapeHTML(state.saves[selectedSave].name)}</p>`,'confirmDelete','Delete'),
  confirmDelete:()=>{state.saves.splice(selectedSave,1);selectedSave=-1;persist();$('#dialog').close();render();},
  networkMode:mode=>{networkMode=mode;render();},networkNext:()=>navigate('connection'),
  lobby:()=>{const callsign=$('#callsign').value.trim(),name=$('#session').value.trim();if(!callsign||!name){notify('Enter a call sign and session name');return;}state.session={callsign,name,faction:$('#faction').value};state.mission=Number($('#network-map').value);ready=false;persist();navigate('lobby');},
  ready:()=>{ready=!ready;render();}
};
document.addEventListener('click',e=>{const target=e.target.closest('[data-action]');if(!target||target.disabled)return;audio.volume=state.settings.effects/100;audio.currentTime=0;audio.play();handlers[target.dataset.action](target.dataset.value,target);});
document.addEventListener('pointerover',e=>{const button=e.target.closest('[data-hint]');if(button)$('#hint').textContent=button.dataset.hint;});
document.addEventListener('input',e=>{
  const target=e.target;if(target.dataset.setting){draft.settings[target.dataset.setting]=target.type==='checkbox'?target.checked:target.type==='range'?Number(target.value):target.value;if(target.type==='range')target.nextElementSibling.value=target.value;}
});
document.addEventListener('change',e=>{if(e.target.id==='mission-select')navigate(`brief/${e.target.value}`);});
document.addEventListener('keydown',e=>{
  if(binding!==null){e.preventDefault();const name=binding;binding=null;if(e.key!=='Escape')draft.bindings[name]=e.key===' '?'Space':e.key.toUpperCase();const row=[...document.querySelectorAll('[data-action="bind"]')].find(el=>el.dataset.value===name);row.lastElementChild.textContent=draft.bindings[name];row.classList.remove('selected');return;}
  if($('#dialog').open)return;
  if(e.target.matches('.region') && ['Enter',' '].includes(e.key)){e.preventDefault();navigate('brief/'+e.target.dataset.value);return;}
  if(e.key==='Escape'){e.preventDefault();navigate(route.startsWith('brief/')||route==='training'?'solo':route.startsWith('help/')?'help':route==='connection'||route==='lobby'?'multi':'home');return;}
  if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const scope=$('#screen'),buttons=[...scope.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement),step=e.key==='ArrowDown'?1:-1;buttons[(index+step+buttons.length)%buttons.length].focus();}
});
window.addEventListener('hashchange',render);
render();
