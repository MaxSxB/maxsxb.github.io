function createCampaignHUD(map){
  const language=new URLSearchParams(location.search).get('lang') || document.documentElement.lang;
  const campaignLabel={fr:'Campagne',en:'Campaign',de:'Kampagne'}[language];
  if(!campaignLabel)throw Error(`Missing campaign translation: ${language}`);
  const hud=document.createElement('section');
  hud.className='campaign-hud';hud.setAttribute('aria-label','Campaign menu');
  hud.innerHTML=`<h1 class="campaign-heading"><span>Urban Assault / Single-player</span>Campaign</h1>
    <nav class="campaign-nav" aria-label="Campaign actions">
      <a href="../../../index.html#saves" target="_top">${GAME_TEXT[361]}<br>${GAME_TEXT[360]}</a>
      <details class="campaign-picker">
        <summary aria-controls="campaign-choices">${campaignLabel}</summary>
        <div id="campaign-choices" class="campaign-choices" role="group" aria-label="${campaignLabel}">
          <button type="button" data-campaign="resistance">Urban Assault - Resistance</button>
          <button type="button" data-campaign="ghorkovs">Metropolis Dawn - Ghorkovs</button>
          <button type="button" data-campaign="taerkastens">Metropolis Dawn - Taerkastens</button>
        </div>
      </details>
      <a href="../../../index.html#home" target="_top">Main menu</a>
    </nav>
    <div class="campaign-mission" data-active="false" role="status" aria-live="polite" aria-atomic="true">
      <p class="campaign-mission-meta">Operations map</p>
      <h2 class="campaign-mission-title">Select a territory</h2>
      <p class="campaign-mission-hint">Hover over a mission to identify it.</p>
    </div>`;
  map.append(hud);
  hud.querySelectorAll('[data-campaign]').forEach(button=>button.onclick=()=>{
    window.top.location.href=new URL(`../../../index.html#solo/${button.dataset.campaign}`,location.href).href;
  });
  const card=hud.querySelector('.campaign-mission');
  return (id,name)=>{
    card.dataset.active=String(id!==0);
    card.querySelector('.campaign-mission-meta').textContent=id?`Operation / ${String(id).padStart(2,'0')}`:'Operations map';
    card.querySelector('.campaign-mission-title').textContent=id?name:'Select a territory';
    card.querySelector('.campaign-mission-hint').textContent=id?'Click to view the briefing.':'Hover over a mission to identify it.';
  };
}
