'use strict';

const BRIEFINGS={}, BRIEFING_MODELS={}, briefingLoads=new Map();
const loadBriefingScript=path=>{
  if(!briefingLoads.has(path))briefingLoads.set(path,new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=path;
    script.onload=resolve;script.onerror=()=>reject(Error(`Briefing resource missing : ${path}`));document.head.append(script);
  }));
  return briefingLoads.get(path);
};
async function loadBriefing(id){
  await loadBriefingScript(`assets/briefings/${id}.js`);
  if(!SATELLITE_BRIEFING_PATHS[id])throw Error(`Satellite map missing : ${id}`);
  return {...BRIEFINGS[id],aerial:SATELLITE_BRIEFING_PATHS[id]};
}
const loadBriefingModels=data=>Promise.all(data.modelKeys.map(key=>loadBriefingScript(`assets/briefings/models/${key}.js`)));

const briefingMarkup = (id,name,data) => `<article class="hyde-briefing">
  <header><span class="hyde-kicker">${{129:'RESISTANCE',132:'TAERKASTENS',134:'GHORKOVS',135:'TRAINING'}[data.events[0].tile]} / OPERATION DOSSIER ${String(id).padStart(2,'0')}</span><span class="hyde-subtitle">${({25:'Training 1',26:'Training 2',1:'Training 3'})[id]||`Mission ${String(id).padStart(2,'0')}`}</span><h1>${name}</h1></header>
  <div class="hyde-content">
    <div class="hyde-map-panel"><div class="hyde-map-frame"><div class="hyde-map-surface" style="width:${720*Math.min(1,data.size[0]/data.size[1])}px;height:${720*Math.min(1,data.size[1]/data.size[0])}px">
      <canvas id="hyde-map" aria-label="Tactical map : ${name}"></canvas>
      <svg class="hyde-map-lines" viewBox="0 0 720 720" preserveAspectRatio="none" aria-hidden="true"><path/></svg>
      <div class="hyde-markers"></div>
    </div></div><div class="hyde-map-caption"><span>THEATER OF OPERATIONS</span><span>${data.size.join(' × ')} SECTORS</span></div></div>
    <div class="hyde-information">
      <div class="hyde-object"><div class="hyde-model-wrap"><canvas id="hyde-model" width="660" height="660" aria-label="Selected unit or structure"></canvas><span>IDENTIFICATION</span></div>
        <div class="hyde-object-copy"><span class="hyde-kicker hyde-counter"></span><h2 class="hyde-object-title"></h2><p class="hyde-object-detail"></p><div class="hyde-steps" aria-label="Briefing sequence"></div></div>
      </div>
      <section class="hyde-orders"><div class="hyde-orders-heading"><span>COMMAND TRANSMISSION</span><button type="button" class="hyde-text-all">Show all</button></div><div class="hyde-text" tabindex="0" aria-label="Mission briefing"></div></section>
    </div>
  </div>
  <footer><div class="hyde-playback"><button class="metal" data-action="nav" data-value="solo">Campaign map</button><button class="metal" data-action="launch">${GAME_TEXT[930]}</button><button type="button" class="metal" data-brief-control="next">${GAME_TEXT[400]}</button></div></footer>
</article>`;

function mountBriefing(root, data, text, settings) {
  const events=data.events, q=s=>root.querySelector(s);
  paintAerial(q('#hyde-map'),data.aerial).catch(error=>console.error(error));
  const view=briefingModel(q('#hyde-model'),Object.fromEntries(data.modelKeys.map(key=>[key,BRIEFING_MODELS[key]])));
  const music=new Audio('assets/briefing-hyde/music.ogg'), effect=new Audio('assets/briefing-hyde/object.wav');
  music.loop=true; music.volume=settings.music/100; effect.volume=settings.effects/100*.5;
  let live=true, paused=false, elapsed=0, textElapsed=0, previous=null, active=-1, frame, shownLine=-1, modelsReady=false;
  let rotationElapsed=0, selectionRemaining=0, modelElapsed=0;
  view.ready.then(()=>modelsReady=true);
  const revealed=new Set(), markerButtons=[], steps=[];
  const play=audio=>audio.play().catch(error=>{
    if(!live || error.name==='AbortError')return;
    if(error.name!=='NotAllowedError')throw error;
  });
  const startMusic=()=>{if(settings.musicOn&&music.paused)play(music);};
  // Le navigateur bloque le son tant qu'il n'y a pas eu d'interaction : la musique démarre au premier clic ou à la première touche.
  const unlockAudio=()=>{if(!live)return;startMusic();document.removeEventListener('pointerdown',unlockAudio,true);document.removeEventListener('keydown',unlockAudio,true);};
  document.addEventListener('pointerdown',unlockAudio,true);document.addEventListener('keydown',unlockAudio,true);
  const pause=value=>{paused=value;selectionRemaining=0;};
  events.forEach((event,i)=>{
    const step=document.createElement('button'); step.type='button';step.textContent=String(i+1).padStart(2,'0');step.title=event.title;step.disabled=true;
    step.onclick=()=>{elapsed=data.introDuration+i*data.interval;pause(true);selectionRemaining=5000;activate(i);};
    q('.hyde-steps').append(step); steps.push(step);
    const marker=document.createElement('button'); marker.type='button';marker.className=`hyde-marker ${event.faction} ${event.kind}`;
    marker.style.left=event.x/data.mapLength[0]*100+'%';marker.style.top=-event.z/data.mapLength[1]*100+'%';
    marker.title=event.title;marker.setAttribute('aria-label',event.title);marker.hidden=true;
    const icon=document.createElement('img');
    icon.src=`assets/briefings/icons/${event.tile}.png`;icon.alt='';icon.draggable=false;
    marker.append(icon);
    marker.onclick=step.onclick;q('.hyde-markers').append(marker);markerButtons.push(marker);
  });
  const ctx=document.createElement('canvas').getContext('2d');ctx.font='19px Xolonium';
  const lines=[];
  for(const paragraph of text.split('\\\\').map(p=>p.replaceAll('\\',' '))){
    let line='';
    for(const word of paragraph.split(' ')){
      const next=line?line+' '+word:word;
      if(line&&ctx.measureText(next).width>790){lines.push(line);line=word;}else line=next;
    }
    lines.push(line);
    lines.push('');
  }
  const textNodes=lines.map(line=>{const span=document.createElement('span');span.textContent=line||'\u00a0';q('.hyde-text').append(span);return span;});
  function revealText(){
    const count=Math.min(lines.length,Math.floor(textElapsed/500));
    if(count===shownLine)return;
    textNodes.forEach((node,i)=>node.classList.toggle('revealed',i<count));
    const area=q('.hyde-text');
    if(count>shownLine&&count<lines.length)area.scrollTop=Math.max(0,count*30-area.clientHeight+60);
    shownLine=count;
  }
  q('.hyde-text-all').onclick=()=>{textElapsed=lines.length*500;revealText();q('.hyde-text').scrollTop=0;};
  function activate(index){
    active=index;revealed.add(index);modelElapsed=0;
    const event=events[index];
    q('.hyde-counter').textContent=`CONTACT ${String(index+1).padStart(2,'0')} / ${String(events.length).padStart(2,'0')}`;
    q('.hyde-object-title').textContent=event.title;
    q('.hyde-object-detail').textContent=event.detail;
    steps.forEach((step,i)=>{step.disabled=!revealed.has(i);step.classList.toggle('active',i===index);});
    markerButtons.forEach((marker,i)=>{
      const keyVisible=events[i].kind==='key'&&events.some((other,j)=>revealed.has(j)&&Math.floor(other.x/1200)===Math.floor(events[i].x/1200)&&Math.floor(-other.z/1200)===Math.floor(-events[i].z/1200));
      marker.hidden=!revealed.has(i)&&!keyVisible;marker.classList.toggle('active',i===index);
      marker.classList.remove('blink');
    });
    const x=event.x/data.mapLength[0]*720,y=-event.z/data.mapLength[1]*720;
    q('.hyde-map-lines path').setAttribute('d',`M ${x} ${y} L ${x} 15 L 705 15`);
    effect.currentTime=0;if(settings.effects>0)play(effect);
  }
  q('[data-brief-control="next"]').onclick=()=>{
    if(selectionRemaining>0)pause(false);
    elapsed=data.introDuration+((active+1)%events.length)*data.interval;activate((active+1)%events.length);startMusic();
  };
  const restart=()=>{
    elapsed=0;textElapsed=0;active=-1;revealed.clear();pause(false);shownLine=-1;
    steps.forEach(s=>{s.disabled=true;s.classList.remove('active');});markerButtons.forEach(m=>m.hidden=true);
    q('.hyde-object-title').textContent='Acquiring map';q('.hyde-counter').textContent='BRIEFING';q('.hyde-object-detail').textContent='';
    q('.hyde-map-lines path').setAttribute('d','');q('.hyde-text').scrollTop=0;music.currentTime=0;startMusic();
  };
  restart();
  const tick=now=>{
    const dt=previous===null?0:now-previous;previous=now;
    if(!document.hidden){
      rotationElapsed+=dt;
      if(modelsReady)modelElapsed+=dt;
      let advance=dt;
      if(selectionRemaining>0){
        selectionRemaining-=dt;
        if(selectionRemaining<=0){advance=-selectionRemaining;pause(false);elapsed+=data.interval;}
      }
      if(!paused){elapsed+=advance;if(elapsed>=data.introDuration)textElapsed+=advance;}
    }
    q('.hyde-map-frame').style.opacity=Math.min(1,elapsed/data.introDuration);
    if(elapsed>=data.introDuration){
      const index=Math.floor((elapsed-data.introDuration)/data.interval)%events.length;
      if(index!==active)activate(index);
      if(modelsReady)view.draw(events[active].model,rotationElapsed*.0006,Math.min(1,modelElapsed/500));
      markerButtons[active].classList.toggle('blink',Math.floor(elapsed/200)%2===0);
    }
    revealText();frame=requestAnimationFrame(tick);
  };
  // Le cadre « Transmission » descend jusqu'au bas de la rangée de boutons (mesure en px CSS, indépendante de l'autofit).
  const alignOrders=()=>{const info=q('.hyde-information'),footer=q('.hyde-briefing footer');info.style.height=(footer.offsetTop+footer.offsetHeight-info.offsetTop)+'px';};
  alignOrders();window.addEventListener('resize',alignOrders);document.fonts.ready.then(alignOrders);
  frame=requestAnimationFrame(tick);
  return ()=>{live=false;cancelAnimationFrame(frame);window.removeEventListener('resize',alignOrders);document.removeEventListener('pointerdown',unlockAudio,true);document.removeEventListener('keydown',unlockAudio,true);music.pause();effect.pause();view.dispose();};
}

