(async () => {
  const data=NASA_MISSIONS, size=1920*1080, map=document.querySelector('#map');
  for(const id of data.ids)data.names[id]=GAME_TEXT[1800+id];
  function decode(runs){
    const pixels=new Uint8Array(size);
    let offset=0;
    for(let i=0;i<runs.length;i+=2){pixels.fill(runs[i],offset,offset+runs[i+1]);offset+=runs[i+1];}
    if(offset!==size)throw new Error('Emprise de mission invalide');
    return pixels;
  }
  const owners=decode(data.owners), gridOwners=decode(data.gridOwners), alpha=decode(data.alpha);
  const gridAlpha=decode(data.gridAlpha);
  const visible=new Set(data.ids);
  const hoverSound=new Audio('../../../assets/click.wav');
  hoverSound.preload='auto';
  let hovered=0;
  const canvas=document.createElement('canvas');
  canvas.width=1920;canvas.height=1080;canvas.id='mission-highlight';
  const context=canvas.getContext('2d'), pixels=context.createImageData(1920,1080);
  document.querySelector('#complete-highlight').replaceWith(canvas);
  const outlines=document.createElement('canvas');
  outlines.width=1920;outlines.height=1080;outlines.id='mission-outlines';
  const borders=outlines.getContext('2d');
  borders.strokeStyle='#192422';borders.lineWidth=3;borders.lineCap='round';borders.lineJoin='round';
  const paths=data.outlines.map(([kind,missions,d])=>({kind,missions,path:new Path2D(d)}));
  const globe=new Image();globe.src='globe-relief-mers-minerales-v14.png';
  await globe.decode();
  map.append(outlines);
  const panel=document.createElement('details');panel.id='mission-controls';
  panel.innerHTML='<summary>Niveaux affichés · <span id="mission-count"></span></summary><button type="button" id="show-all">Tout afficher</button> <button type="button" id="hide-all">Tout masquer</button><div class="mission-list"></div>';
  map.before(panel);
  const showMission=createCampaignHUD(map);
  const inputs=data.ids.map(id=>{
    const label=document.createElement('label'), input=document.createElement('input');
    input.type='checkbox';input.checked=true;input.value=id;
    label.append(input,`${id} · ${data.names[id]}`);panel.querySelector('.mission-list').append(label);
    input.onchange=()=>{input.checked?visible.add(id):visible.delete(id);render();};
    label.onmouseenter=()=>highlight(id);label.onmouseleave=()=>highlight(0);
    input.onfocus=()=>highlight(id);input.onblur=()=>highlight(0);
    return input;
  });
  function render(){
    const full=document.querySelector('#highlight-visible').checked;
    for(let i=0;i<size;i++){
      const lit=full||gridOwners[i]===hovered, p=i*4;
      pixels.data[p]=lit?231:0;pixels.data[p+1]=lit?239:0;pixels.data[p+2]=lit?226:0;
      pixels.data[p+3]=visible.has(gridOwners[i])?(lit?alpha[i]:gridAlpha[i]):0;
    }
    context.putImageData(pixels,0,0);
    borders.clearRect(0,0,1920,1080);
    for(const {path,kind,missions} of paths){
      const checked=document.querySelector(kind==='coast'?'#coasts-visible':'#missions-visible').checked;
      if(checked&&missions.some(id=>visible.has(id)))borders.stroke(path);
    }
    borders.globalCompositeOperation='destination-in';borders.drawImage(globe,0,0);
    borders.globalCompositeOperation='source-over';
    document.querySelector('#mission-count').textContent=`${visible.size} / ${data.ids.length}`;
  }
  function highlight(id){
    id=visible.has(id)?id:0;
    if(id===hovered)return;
    hovered=id;showMission(id,data.names[id]);
    if(id){hoverSound.currentTime=0;hoverSound.play();}
    map.style.cursor=id?'pointer':'';render();
  }
  map.onpointermove=e=>{
    if(e.target.closest('.campaign-nav')){highlight(0);return;}
    const rect=map.getBoundingClientRect(),x=Math.floor((e.clientX-rect.left)*1920/rect.width),y=Math.floor((e.clientY-rect.top)*1080/rect.height);
    highlight(x>=0&&x<1920&&y>=0&&y<1080?owners[y*1920+x]:0);
  };
  map.onpointerleave=()=>highlight(0);
  map.onclick=e=>{
    if(!e.target.closest('.campaign-nav')&&hovered)window.top.location.href=new URL(`../../../index.html#brief/${hovered}`,location.href).href;
  };
  for(const id of ['highlight-visible','coasts-visible','missions-visible'])document.getElementById(id).onchange=render;
  for(const [id,show] of [['show-all',true],['hide-all',false]])document.getElementById(id).onclick=()=>{
    visible.clear();if(show)data.ids.forEach(id=>visible.add(id));
    inputs.forEach(input=>input.checked=show);hovered=0;showMission(0);render();
  };
  mountCampaignShell();
  render();
})();
