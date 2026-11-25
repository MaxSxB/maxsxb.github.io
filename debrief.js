'use strict';
// The game's mission debriefing (yw_brif.cpp), replaying the battle history of a mission.
// History data come from assets/debriefings/<id>.js: real mission data, fictional battle.
const DEBRIEFINGS={};
const OWNER_COLORS=['#000','rgb(0,110,194)','rgb(0,179,66)','rgb(232,232,232)','rgb(255,171,28)','rgb(73,73,73)','rgb(255,0,0)','#000'];
const TEXT_COLOR='rgb(65,123,134)'; // text_debriefing in world.ini
const FACTION_NAMES=[2417,2411,2412,2413,2414,2415,2416,2417];
const SPEED=60,ZOOM=600,CONQUEST=30000,KILL=120000,KILL_FADE=30000,CREATION=45000;
const canvas=document.querySelector('#debrief'),ctx=canvas.getContext('2d');
const resize=()=>document.documentElement.style.setProperty('--scale',Math.min(innerWidth/1920,innerHeight/1080));
addEventListener('resize',resize);resize();
const loadScript=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error(`Missing debriefing: ${src}`));document.head.append(s);});
const loadImage=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error(`Missing map: ${src}`));i.src=src;});
const campaignOf=id=>Object.keys(XP_CAMPAIGNS).find(k=>XP_CAMPAIGNS[k].ids.includes(id))||'resistance';
const missionName=id=>campaignOf(id)==='resistance'?GAME_TEXT[1800+id]:XP_TEXTS.en[id].name;
const named=id=>{const t=GAME_TEXT[id];return t&&t!=='<>'?t:' ';};
// Shell sounds of world.ini: objectappear, sectorconquered, vhcldestroyed and bldgconquered (volume / 127).
const audio=new AudioContext();
const SOUNDS=Object.fromEntries(Object.entries({appear:['assets/briefing-hyde/object.wav',1],sector:['assets/debrief-sounds/sector.wav',90/127],
  destroyed:['assets/debrief-sounds/destroyed.wav',60/127],upgrade:['assets/debrief-sounds/destroyed.wav',60/127]}).map(([name,[src,volume]])=>
  [name,{volume,buffer:fetch(src).then(r=>{if(!r.ok)throw Error(`Missing sound: ${src}`);return r.arrayBuffer();}).then(b=>audio.decodeAudioData(b))}]));
const play=async name=>{
  const {buffer,volume}=SOUNDS[name],source=audio.createBufferSource(),gain=audio.createGain();
  source.buffer=await buffer;gain.gain.value=volume;source.connect(gain).connect(audio.destination);source.start();
};
// Browsers start audio only after an interaction with the page.
for(const type of ['pointerdown','keydown'])addEventListener(type,()=>audio.resume(),{once:true});
const clock=ticks=>{const s=Math.floor(ticks/1024);return [s/3600|0,(s/60|0)%60,s%60].map(v=>String(v).padStart(2,'0')).join(':');};

let run=0;
async function show(){
  const id=Number(location.hash.slice(1));
  if(!SATELLITE_BRIEFING_PATHS[id])throw Error(`Unknown mission: ${id}`);
  const token=++run;
  const [map]=await Promise.all([loadImage(SATELLITE_BRIEFING_PATHS[id]),loadScript(`assets/debriefings/${id}.js`),document.fonts.load('15px Xolonium')]);
  if(token!==run)return;
  const d=DEBRIEFINGS[id],[w,h]=d.size;
  document.title=`Urban Assault · Debriefing · ${missionName(id)}`;
  document.querySelector('#close').onclick=()=>{location.href=`index.html#solo/${campaignOf(id)}`;};
  // Map placement of StartDebriefMapZoom at 1920 x 1080.
  const side=Math.min(1920*.965625,1080*1.216666667);
  const mw=(w>=h?1:w/h)*side/2,mh=(h>=w?1:h/w)*side/2;
  const dest={x:(1-.4515625)*960-mw/2,y:(1-.325)*540-mh/2,w:mw,h:mh};
  const sw=mw/w,sh=mh/h;
  const clip=v=>Math.max(-1,Math.min(1,v));
  const zoomFrom=[2*d.focus[0]/w-1-1/w,2*d.focus[1]/h-1-1/h,2*d.focus[0]/w-1+1/w,2*d.focus[1]/h-1+1/h].map(clip);
  const start=[...d.owners].map(c=>parseInt(c,16));
  let zoomStart=performance.now(),historyStart=null,state,applied;
  play('appear');
  const reset=()=>{
    state={own:start.slice(),stats:Array.from({length:8},()=>({score:0,kills:0,byUser:0})),upgrades:[],last:0};applied=0;
  };
  reset();
  const apply=e=>{
    const [t,kind]=e;state.last=t;
    if(kind===0){state.own[e[3]*w+e[2]]=e[4];state.stats[e[4]].score++;}
    else if(kind===1){const s=state.stats[e[5]];s.kills++;if(e[6]){s.byUser++;s.score+=20;}else s.score+=10;}
    else if(kind===3){state.stats[d.player].score+=500;
      if(!state.upgrades.some(u=>u.slice(4,8).join()===e.slice(4,8).join()))state.upgrades.push(e);}
  };
  document.querySelector('#restart').onclick=()=>{reset();historyStart=performance.now();};

  const symbol=(name,x,y,half,color)=>{
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();
    for(const [[ax,az],[bx,bz]] of DEBRIEF_SYMBOLS[name]){ctx.moveTo(x+ax/1000*half,y-az/1000*half);ctx.lineTo(x+bx/1000*half,y-bz/1000*half);}
    ctx.stroke();
  };
  const text=(value,x,y,color=TEXT_COLOR)=>{ctx.fillStyle=color;ctx.fillText(String(value).toUpperCase(),x,y);};
  const fit=(value,x,width,y)=>{let s=String(value).toUpperCase();while(s.length>1&&ctx.measureText(s).width>width-8)s=s.slice(0,-1);ctx.fillText(s,x,y);};
  function upgradeLine(e){
    const [,,,,type,vehicle,weapon,building,value]=e,vhcl=vehicle||weapon;
    const item=vhcl?named(1200+vhcl):building?named(1500+building):' ';
    const line={1:[2459,`(${value})`],2:[2460,`(${value}%)`],3:[2461,' '],4:[2462,' '],5:[2463,' '],6:[2464,named(1500+building)],7:[2465,' ']}[type]||[2465,' '];
    return [GAME_TEXT[line[0]],type===4?named(1500+building):item,line[1]];
  }
  function frame(now){
    if(token!==run)return;
    ctx.clearRect(0,0,1920,1080);
    const zoom=Math.min(1,(now-zoomStart)/ZOOM);
    const src=zoomFrom.map((v,i)=>v+((i<2?-1:1)-v)*zoom);
    const sx=(src[0]+1)/2*map.width,sy=(src[1]+1)/2*map.height;
    ctx.drawImage(map,sx,sy,(src[2]+1)/2*map.width-sx,(src[3]+1)/2*map.height-sy,dest.x,dest.y,dest.w,dest.h);
    if(zoom<1){requestAnimationFrame(frame);return;}
    historyStart??=now;
    const dtime=Math.min((now-historyStart)*SPEED,d.duration);
    // Like the game, each newly replayed conquest, destruction and upgrade sounds once.
    const heard=new Set();
    while(applied<d.events.length&&d.events[applied][0]<=dtime){const e=d.events[applied++];apply(e);heard.add(e[1]);}
    for(const [kind,sound] of [[0,'sector'],[1,'destroyed'],[3,'upgrade']])if(heard.has(kind))play(sound);
    // Sector owners: a cross in each gameplay sector.
    ctx.lineWidth=2;
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const o=state.own[y*w+x];if(!o)continue;
      const cx=dest.x+(x+.5)*sw,cy=dest.y+(y+.5)*sh;
      ctx.strokeStyle=OWNER_COLORS[o];ctx.beginPath();ctx.moveTo(cx-sw/10,cy);ctx.lineTo(cx+sw/10,cy);ctx.moveTo(cx,cy-sh/10);ctx.lineTo(cx,cy+sh/10);ctx.stroke();
    }
    for(let i=0;i<applied;i++){
      const e=d.events[i],age=dtime-e[0];
      if(age>=KILL)continue;
      const px=dest.x+e[2]/256*dest.w,py=dest.y+e[3]/256*dest.h;
      if(e[1]===0&&age<CONQUEST&&e[4])symbol('DB_SEC',dest.x+(e[2]+.5)*sw,dest.y+(e[3]+.5)*sh,sw*(1-age/CONQUEST),OWNER_COLORS[e[4]]);
      else if(e[1]===1)symbol('DB_DEATH',px,py,sw/2*(age>=KILL_FADE?.1:Math.max(.1,1-age/KILL_FADE)),OWNER_COLORS[e[4]]);
      else if(e[1]===2&&age<CREATION)symbol('DB_DEATH',px,py,sw/8*Math.min(1,age/CREATION),OWNER_COLORS[e[4]]);
    }
    ctx.font='15px Xolonium';ctx.textBaseline='middle';ctx.letterSpacing='2px';
    // Score table (yw_DebriefScoreTable).
    const tx=1104,tw=765;let ty=108;
    [[2450,0],[2451,.4],[2452,.7]].forEach(([label,at])=>text(GAME_TEXT[label],tx+tw*at,ty));
    ty+=25;
    for(const o of [...d.factions].sort((a,b)=>state.stats[b].kills-state.stats[a].kills)){
      const color=OWNER_COLORS[o||7],s=state.stats[o];ctx.fillStyle=color;
      fit(GAME_TEXT[2400+[17,11,12,13,14,15,16,17][o]],tx,tw*.4,ty);
      ctx.fillText(o===d.player?String(s.byUser):'-',tx+tw*.4,ty);ctx.fillText(String(s.kills),tx+tw*.7,ty);ty+=25;
    }
    ty+=25;
    const score=state.stats[d.player].score;
    for(const row of [[2457,score],[2458,score+d.previous.score],null,[2454,clock(state.last)],[2455,clock(state.last+d.previous.time)]]){
      if(row){text(GAME_TEXT[row[0]],tx,ty);text(row[1],tx+tw*.7,ty);}
      ty+=25;
    }
    // Tech upgrades (yw_DebriefTechUpgradesTable).
    const ux=12,uw=945;let uy=741;
    ctx.fillStyle=TEXT_COLOR;
    for(const e of state.upgrades){const [a,b,c]=upgradeLine(e);fit(a,ux,uw*.48,uy);fit(b,ux+uw*.48,uw*.3,uy);fit(c,ux+uw*.78,uw*.22,uy);uy+=25;}
    // Mission name above the map (DrawDebriefLevelName).
    ctx.textAlign='center';text(missionName(id),(63+990)/2,48);ctx.textAlign='left';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
addEventListener('hashchange',()=>show());show();
