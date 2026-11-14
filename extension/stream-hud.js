/* Presentation only. No game memory, control commands, timers or persistence. */
(function(root){
  'use strict';
  const Catalog=root.__NFSU2_RACE_CATALOG__||(typeof require==='function'?require('./race-catalog.js'):null);
  const styles=`
.stream-help{margin:6px 9px}.stream-hud{position:fixed;inset:0;pointer-events:none;color:#f0f6ff;font:12px/1.35 'Segoe UI',sans-serif;font-variant-numeric:tabular-nums;filter:drop-shadow(0 2px 5px #000a)}
.stream-tile{position:absolute;width:220px;padding:13px 16px;background:linear-gradient(115deg,#0b1424ed,#0b1424a8);border:1px solid #809abe55;border-left:3px solid #63e4d0;border-radius:4px;overflow-wrap:anywhere;max-width:38vw}
.stream-label{display:block;color:#a9bed3;font-size:10px;font-weight:650;letter-spacing:.13em;text-transform:uppercase;margin-bottom:5px}.stream-value{display:block;font-size:19px;font-weight:700;letter-spacing:-.02em}.stream-detail{display:block;color:#b0c6d7;font-size:10px;margin-top:5px}.stream-brand{position:absolute;top:20px;left:50%;transform:translateX(-50%);text-align:center;font-size:22px;font-weight:850;letter-spacing:.08em;text-shadow:0 2px 10px #000}.stream-brand b{color:#ff5791}.stream-brand small{display:block;color:#a6eadd;font-size:9px;font-weight:600;letter-spacing:.2em;margin-top:2px}
.stream-driver{top:24px;left:24px}.stream-session{top:24px;right:24px;border-left-color:#ff5791}.stream-stats{top:42%;left:24px}.stream-road{top:42%;right:24px;border-left-color:#ff5791}.stream-footer{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);width:400px;max-width:70vw;text-align:center;padding:10px 18px;background:#0a1422d9;border:1px solid #809abe55;border-radius:4px}.stream-footer .stream-value{font-size:16px}.stream-footer-metrics{display:flex;justify-content:space-around;gap:20px}.stream-footer-metrics>span{min-width:0}.stream-footer small{display:block;margin-bottom:3px;color:#b0c6d7;font-size:9px}.stream-metric{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.stream-metric+.stream-metric{margin-top:8px}.stream-metric span{color:#a9bed3;font-size:10px}.stream-metric strong{font-size:21px}.stream-speed-value{font-size:30px}.stream-speed-unit{color:#b0c6d7;font-size:10px;margin-left:5px;letter-spacing:.1em}
.stream-radar{position:absolute;left:50%;bottom:112px;transform:translateX(-50%);width:220px;max-width:38vw;padding:0;background:transparent;border:0;text-align:center}.stream-radar .stream-label{font-size:8px;margin-bottom:1px}.stream-radar .stream-value{font-size:12px;font-weight:600}.stream-radar svg{display:block;width:100%;height:auto;max-height:110px;overflow:visible}.radar-ring{fill:none;stroke:#87d6d570;stroke-width:1}.radar-axis{stroke:#87d6d530;stroke-width:.6}.radar-car{fill:#ff6195;stroke:#fff8;stroke-width:1}.radar-distance{fill:#fff;font:8px 'Segoe UI',sans-serif;paint-order:stroke;stroke:#07121b;stroke-width:2px}.radar-you{fill:#72ead1}.radar-note{color:#b0c6d7;font-size:8px}
@media(max-width:900px){.stream-tile{width:176px;padding:9px 10px}.stream-driver,.stream-stats{left:12px}.stream-session,.stream-road{right:12px}.stream-brand{top:12px;font-size:16px}.stream-driver,.stream-session{top:65px}.stream-value{font-size:15px}.stream-stats,.stream-road{top:auto;bottom:98px}.stream-footer{bottom:12px}.stream-metric strong{font-size:18px}.stream-radar{bottom:170px;width:180px}}
@media(max-width:480px){.stream-tile{max-width:44vw;font-size:10px}.stream-label{font-size:8px}.stream-value{font-size:13px}.stream-detail{font-size:8px}.stream-brand{font-size:15px}.stream-footer{max-width:90vw}.stream-stats,.stream-road{bottom:95px}}
`;
  function markup(){return `<section id="stream-hud" class="stream-hud" aria-label="Streaming HUD" aria-live="off" hidden>
<div class="stream-brand" data-hud-widget="brand" id="stream-widget-brand">AFTER DARK<b>.</b><small>BAYVIEW NIGHTS</small></div>
<div class="stream-tile stream-driver" data-hud-widget="driver" id="stream-widget-driver"><span class="stream-label">On the road</span><strong id="stream-driver" class="stream-value">Waiting for game</strong><span id="stream-network" class="stream-detail">Waiting for game</span></div>
<div class="stream-tile stream-session" data-hud-widget="session" id="stream-widget-session"><span class="stream-label">Speed</span><span class="stream-value"><strong id="stream-speed" class="stream-speed-value">—</strong><span class="stream-speed-unit">MPH</span></span><span id="stream-context" class="stream-detail">Location unavailable</span></div>
<div class="stream-tile stream-stats" data-hud-widget="stats" id="stream-widget-stats"><span class="stream-label">Engine</span><div class="stream-metric"><span>Gear</span><strong id="stream-gear">—</strong></div><div class="stream-metric"><span>RPM</span><strong id="stream-rpm">—</strong></div></div>
<div class="stream-tile stream-road" data-hud-widget="road" id="stream-widget-road"><span class="stream-label">Places driven</span><strong id="stream-road" class="stream-value">0</strong><span id="stream-turns" class="stream-detail">Recent: —</span></div>
<div class="stream-radar" data-hud-widget="radar" id="stream-widget-radar" hidden><span class="stream-label">Behind you</span><strong id="radar-nearest" class="stream-value" title="Distance in game coordinates">Waiting for cars</strong><svg viewBox="-112 -16 224 130" aria-label="Rear half-circle car radar"><path class="radar-ring" d="M -100 0 A 100 100 0 0 0 100 0 M -50 0 A 50 50 0 0 0 50 0"/><path class="radar-axis" d="M -100 0 H 100 M 0 0 V 100"/><path class="radar-you" d="M 0 -7 L -5 2 H 5 Z"/>${Array.from({length:8},(_,i)=>`<g id="radar-dot-${i}" hidden><circle id="radar-car-${i}" class="radar-car" r="3"/><text id="radar-distance-${i}" class="radar-distance" text-anchor="middle" title="Distance in game coordinates"></text></g>`).join('')}</svg><span id="radar-state" class="radar-note">Nearby cars</span></div>
<div class="stream-footer" data-hud-widget="footer" id="stream-widget-footer"><span class="stream-label">Session</span><div class="stream-footer-metrics"><span><small>Top speed</small><strong id="stream-pace" class="stream-value">—</strong></span><span><small>Driving time</small><strong id="stream-driving-time" class="stream-value">0:00</strong></span></div></div>
</section>`;}
  const duration=value=>{const n=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
  const measuredSpeed=value=>Number.isFinite(value)&&value>=0&&value<=500;
  const track=id=>Number.isSafeInteger(id)&&id>=1&&id<=65535;
  const generation=value=>Number.isSafeInteger(value)&&value>=0?value:null;
  const telemetry=({sample,now}={})=>{
    const d=sample?.data||{},c=sample?.context||{};
    const fresh=!!sample&&Number.isFinite(now)&&Number.isFinite(sample.at)&&now>=0&&sample.at>=0&&now-sample.at>=0&&now-sample.at<=500;
    return{d,c,fresh,live:fresh&&d.supported===true&&d.ready===true&&d.driving===true&&d.nativeTelemetry===true&&d.hidden!==true&&d.focused!==false&&!d.dynoBusy&&!c.menu&&!c.suspended};
  };
  // Native HUD 0x4c68d0 stores speed*0x78426c as f32, then 0x75bed4 truncates.
  const mph=value=>String(Math.trunc(Math.fround(value*2.236999988555908)));
  function createSession(){
    const places=new Set();let driveMilliseconds=0,peakNativeSpeed=null,distanceNative=0,recentTrackId=null,currentGeneration=null,previous=null,lastAt=null;
    const snapshot=()=>({driveMilliseconds,peakNativeSpeed,distanceNative,trackCount:places.size,recentTrackId,generation:currentGeneration});
    function observe(sample,now){
      const {d,live}=telemetry({sample,now}),nextGeneration=generation(d.generation);
      if(nextGeneration!==currentGeneration){currentGeneration=nextGeneration;previous=null;lastAt=null;}
      if(!live||nextGeneration===null){previous=null;return snapshot();}
      if(lastAt!==null&&sample.at<=lastAt)return snapshot();
      lastAt=sample.at;
      const speed=measuredSpeed(d.speedMps)?d.speedMps:null;
      if(speed!==null)peakNativeSpeed=peakNativeSpeed===null?speed:Math.max(peakNativeSpeed,speed);
      if(track(d.trackId)){recentTrackId=d.trackId;if(places.size<256)places.add(d.trackId);}
      const gap=previous?sample.at-previous.at:0;
      if(previous&&gap>0&&gap<=500){
        driveMilliseconds=Math.min(Number.MAX_SAFE_INTEGER,driveMilliseconds+gap);
        if(speed!==null&&previous.speed!==null)distanceNative=Math.min(Number.MAX_SAFE_INTEGER,distanceNative+(previous.speed+speed)*.5*gap/1000);
      }
      previous={at:sample.at,speed};return snapshot();
    }
    return Object.freeze({observe,snapshot});
  }
  function view({sample,now,stats={},session={}}={}){
    const {d,c,fresh,live}=telemetry({sample,now});
    const speed=live&&measuredSpeed(d.speedMps)?mph(d.speedMps):'—';
    const runs=Array.isArray(stats.runs)?stats.runs.slice(-200):[];
    const names=Object.assign(Object.create(null),{'circuit':'Circuit','sprint':'Sprint','street-x':'Street X','drag':'Drag','drift':'Drift','url':'URL race','outrun':'Outrun','free-roam':'Free roam'});
    const label=(id,reverse)=>Catalog?.displayName(id,{reverse:reverse===true})||null;
    const current=fresh&&d.supported===true&&d.ready===true&&d.nativeTelemetry===true;
    const type=current?Catalog?.classify(d.trackId,{drag:c.drag===true,drift:c.drift===true,streetX:d.streetXRace===true||d.forcedStreetX===true||d.onlineStreetX===true,roam:d.raceType===0&&!c.drag&&!c.drift,outrun:d.raceType===7}):'unknown';
    const recent=track(session?.recentTrackId)?session.recentTrackId:runs.at(-1)?.trackId,mode=!current?'Waiting for game':names[type]||'Race';
    const rpm=live&&Number.isFinite(d.carRpm)&&d.carRpm>=0&&d.carRpm<=30000?String(Math.round(d.carRpm)):'—';
    const gear=live&&Number.isInteger(d.carGear)&&d.carGear>=0&&d.carGear<=8?['R','N','1','2','3','4','5','6','7'][d.carGear]:'—';
    return {driver:mode,network:!fresh||!d.supported?'Waiting for game':d.network?'Online':'Solo',context:current?(label(d.trackId,d.trackReverse)||'Location unavailable'):'Location unavailable',speed,
      gear,rpm,time:duration(Number.isFinite(session?.driveMilliseconds)&&session.driveMilliseconds>=0?session.driveMilliseconds/1000:0),road:String(Number.isSafeInteger(session?.trackCount)&&session.trackCount>=0&&session.trackCount<=256?session.trackCount:0),
      turns:`Recent: ${track(recent)?label(recent)||'Location unavailable':'—'}`,pace:measuredSpeed(session?.peakNativeSpeed)?`${mph(session.peakNativeSpeed)} MPH`:'—'};
  }
  function render(ui,input){const v=view(input);for(const[id,key]of [['driver','driver'],['network','network'],['context','context'],['speed','speed'],['gear','gear'],['rpm','rpm'],['driving-time','time'],['road','road'],['turns','turns'],['pace','pace']]){const node=ui.querySelector('#stream-'+id);if(node)node.textContent=String(v[key]);}return v;}
  function renderRadar(ui,sample){
    const valid=sample?.available===true&&Number.isFinite(sample.rangeNative)&&sample.rangeNative>=50&&sample.rangeNative<=500&&Array.isArray(sample.cars)&&sample.cars.length<=32&&sample.cars.every(c=>c&&Number.isFinite(c.distanceNative)&&c.distanceNative>0&&c.distanceNative<=sample.rangeNative&&Number.isFinite(c.behindNative)&&c.behindNative>0&&Number.isFinite(c.lateralNative)&&Math.abs(Math.hypot(c.behindNative,c.lateralNative)-c.distanceNative)<=Math.max(.01,c.distanceNative*.001));
    const cars=valid?[...sample.cars].sort((a,b)=>a.distanceNative-b.distanceNative).slice(0,8):[];
    ui.querySelector('#radar-nearest').textContent=!valid?'Waiting for cars':cars.length?`${cars[0].distanceNative.toFixed(0)} away`:'No nearby car behind';
    ui.querySelector('#radar-state').textContent=valid?(sample.truncated?'Some nearby cars shown':'Nearby cars'):'Rear view unavailable';
    for(let i=0;i<8;i++){const g=ui.querySelector('#radar-dot-'+i),car=cars[i];g.hidden=!car;if(car)g.removeAttribute?.('hidden');else g.setAttribute('hidden','');g.setAttribute('visibility',car?'visible':'hidden');if(!car)continue;const x=-car.lateralNative/sample.rangeNative*100,y=car.behindNative/sample.rangeNative*100;const dot=ui.querySelector('#radar-car-'+i),text=ui.querySelector('#radar-distance-'+i);dot.setAttribute('cx',String(x));dot.setAttribute('cy',String(y));text.setAttribute('x',String(x));text.setAttribute('y',String(Math.min(111,y+12)));text.textContent=car.distanceNative.toFixed(0);}
  }
  const api=Object.freeze({styles,markup,createSession,view,render,renderRadar});root.__NFSU2_STREAM_HUD__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
