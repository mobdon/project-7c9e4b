/* Visual telemetry presentation only. No game access, controls, audio or storage. */
(function(root){
  'use strict';
  const finite=(n,lo,hi)=>typeof n==='number'&&Number.isFinite(n)&&n>=lo&&n<=hi;
  const age=(now,at,max)=>finite(now,0,Number.MAX_SAFE_INTEGER)&&finite(at,0,Number.MAX_SAFE_INTEGER)&&now>=at&&now-at<=max;
  const styles=`
.stream-pitwall{position:absolute;left:24px;bottom:24px;width:286px;max-width:44vw;padding:11px 14px;background:linear-gradient(115deg,#0c2029e8,#0c1725d9);border:1px solid #77cdbb66;border-left:3px solid #68e9c7;border-radius:5px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.pitwall-label{display:block;color:#8ddbc7;font:650 9px/1.3 'Segoe UI',sans-serif;letter-spacing:.16em}.pitwall-message{display:block;color:#edf9f4;font:650 18px/1.3 'Segoe UI',sans-serif;margin-top:4px}.pitwall-detail{display:block;color:#acc9c5;font:11px/1.4 'Segoe UI',sans-serif;margin-top:4px}.stream-pitwall[data-tone="caution"]{border-left-color:#f4bc72}.stream-pitwall[data-tone="paused"]{border-left-color:#8197a3}.stream-pitwall[data-tone="caution"] .pitwall-label{color:#f4bc72}
@media(max-width:900px){.stream-pitwall{left:12px;bottom:12px;width:238px;padding:9px 11px}.pitwall-message{font-size:16px}}
@media(max-width:480px){.stream-pitwall{max-width:calc(100vw - 24px);width:240px}}
`;
  const markup=()=>`<section id="stream-widget-pitwall" class="stream-pitwall" data-hud-widget="pitwall" data-tone="paused" aria-label="Pitwall feedback" aria-live="off" hidden><span class="pitwall-label">PITWALL</span><strong id="pitwall-message" class="pitwall-message">Waiting for live data</strong><span id="pitwall-detail" class="pitwall-detail">No current driving sample.</span></section>`;
  function rearCar(radar,now,at){
    if(!age(now,at,250)||radar?.available!==true||!finite(radar.rangeNative,50,500)||!Array.isArray(radar.cars)||radar.cars.length>32)return null;
    if(!radar.cars.every(c=>c&&finite(c.distanceNative,Number.MIN_VALUE,radar.rangeNative)&&finite(c.behindNative,Number.MIN_VALUE,radar.rangeNative)&&finite(c.lateralNative,-radar.rangeNative,radar.rangeNative)&&Math.abs(Math.hypot(c.behindNative,c.lateralNative)-c.distanceNative)<=Math.max(.01,c.distanceNative*.001)))return null;
    return radar.cars.length?Math.min(...radar.cars.map(c=>c.distanceNative)):null;
  }
  function view({sample,now,radar,radarAt}={}){
    const wait=(message,detail='No current driving sample.')=>({message,detail,tone:'paused'});
    if(!age(now,sample?.at,500))return wait('Waiting for live data');
    const d=sample?.data||{},c=sample?.context||{};
    if(d.supported!==true)return wait('Build not verified');
    if(d.ready!==true||d.nativeTelemetry!==true)return wait('Waiting for car telemetry');
    if(d.hidden===true||d.focused!==true)return wait('Game paused','Keep the game visible and focused.');
    if(d.dynoBusy===true||c.menu===true||c.suspended||d.safe!==true||d.driving!==true||![1,2].includes(d.hud))return wait('Driving paused','Live driving feedback resumes with the driving HUD.');
    if(d.handbackPending===true||c.switching===true)return wait('Control handoff','Waiting for the current driver to settle.');
    if(c.manual===true||d.aiActive!==true||d.aiOwned!==true)return wait('Manual control','AI driving feedback is inactive.');
    const rear=rearCar(radar,now,radarAt),suffix=rear===null?'':` Car behind: ${Math.round(rear)} native units.`;
    const route=age(now,sample.at,100)&&c.race===true&&c.drag!==true&&c.drift!==true&&d.raceType===1&&d.hud===1&&d.forwardCaptured===true&&['armed','observed','native-fallback'].includes(d.forwardState)&&Number.isInteger(d.forwardSamples)&&d.forwardSamples>=2&&d.forwardSamples<=48&&finite(d.forwardHorizon,Number.MIN_VALUE,512.01)&&Number.isInteger(d.forwardPriorityTurns)&&d.forwardPriorityTurns>=0&&d.forwardPriorityTurns<=24;
    const corner=route&&d.forwardPriorityTurns>0;
    const clearance=d.cityPacingState==='clearance-limited'&&d.cityClearanceObserved===true;
    if(finite(d.nativeBrake,.1,1))return {message:'Braking',detail:(corner?'Captured bend in the route preview.':clearance?'Observed clearance has reduced the pace request.':'Native driver brake input; cause not confirmed.')+suffix,tone:'caution'};
    if(clearance)return {message:'Clearance pacing',detail:'Pace request reduced for observed obstacles.'+suffix,tone:'caution'};
    if(c.drag===true)return {message:'Drag driving',detail:'Corner preview is unavailable in this mode.'+suffix,tone:'live'};
    if(c.drift===true)return {message:'Drift driving',detail:'Ordinary road-corner preview is unavailable in this mode.'+suffix,tone:'live'};
    if(corner)return {message:'Corner ahead',detail:(d.forwardState==='armed'&&finite(d.forwardRequestedTarget,Number.MIN_VALUE,150)?'Native corner target requested.':'Priority bend in the captured route window.')+suffix,tone:'caution'};
    if(finite(d.speedMps,0,1))return {message:'Holding position',detail:'Native driver is stopped; cause not confirmed.'+suffix,tone:'caution'};
    if(rear!==null&&rear<=50)return {message:'Car close behind',detail:`Nearest observed car: ${Math.round(rear)} native units.`,tone:'live'};
    return {message:'AI driving',detail:(route?'Route preview available.':'Route preview unavailable.')+suffix,tone:'live'};
  }
  function render(ui,input){
    const value=view(input);
    for(const key of ['message','detail']){const node=ui.querySelector('#pitwall-'+key);if(node&&node.textContent!==value[key])node.textContent=value[key];}
    const widget=ui.querySelector('#stream-widget-pitwall');if(widget&&widget.getAttribute?.('data-tone')!==value.tone)widget.setAttribute('data-tone',value.tone);
    return value;
  }
  const api=Object.freeze({styles,markup,view,render});root.__NFSU2_PITWALL__=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
