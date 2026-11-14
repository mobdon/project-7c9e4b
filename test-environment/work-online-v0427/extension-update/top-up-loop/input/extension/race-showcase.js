/* Viewer-facing observations and local markers. No guest memory, native calls,
 * driving controls, automatic profile application, uploads or media capture. */
(function(root){
'use strict';
const Catalog=root.__NFSU2_RACE_CATALOG__||(typeof require==='function'?require('./race-catalog.js'):null);
const MODES=Object.freeze([['circuit','Circuit'],['sprint','Sprint'],['street-x','Street X'],['drag','Drag'],['drift','Drift'],['url','URL'],['outrun','Outrun'],['free-roam','Free roam']].map(Object.freeze));
const MAX_MARKERS=64,MAX_ELAPSED=86400000,MAX_NAME=48;
const CURRENT_TUNER_HASH='c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391';
const finite=(n,lo,hi)=>typeof n==='number'&&Number.isFinite(n)&&n>=lo&&n<=hi;
const count=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max?n:0;
const modeLabel=key=>MODES.find(([id])=>id===key)?.[1]||'Driving';
const track=id=>Number.isSafeInteger(id)&&id>0&&id<=65535?id:null;
const duration=ms=>{const n=Math.floor(finite(ms,0,Number.MAX_SAFE_INTEGER)?ms/1000:0);return`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
const mph=speed=>finite(speed,0,500)?Math.trunc(Math.fround(speed*2.236999988555908)):null;
function profileName(mode,label){
 const row=MODES.find(([id])=>id===mode);if(!row)throw Error('Choose a race type.');
 if(typeof label!=='string'||!label.trim()||/[\u0000-\u001f\u007f-\u009f]/.test(label))throw Error('Enter a name for your saved settings.');
 const name=row[1]+' · '+label.trim();if(name.length>MAX_NAME)throw Error('Use a shorter name; the full profile name must fit 48 characters.');return name;
}
function profilesFor(profiles,mode){const row=MODES.find(([id])=>id===mode);if(!row||!Array.isArray(profiles))return[];const prefix=row[1]+' · ';return profiles.slice(0,16).filter(p=>p&&typeof p.name==='string'&&p.name.startsWith(prefix)&&p.name.length<=MAX_NAME&&typeof p.id==='string'&&typeof p.revision==='string').map(p=>({id:p.id,revision:p.revision,name:p.name,networkConsent:p.networkConsent===true}));}
function createHighlights({clock=()=>performance.now()}={}){
 let origin=null,lastNow=null,lastAt=null,generation=null,lastMode=null,highestBand=9,lastSpeedMarker=-Infinity,nextId=1,markers=[];
 const time=()=>{let at;try{at=clock();}catch{return null;}if(!finite(at,0,Number.MAX_SAFE_INTEGER)||lastNow!==null&&at<lastNow)return null;if(origin===null)origin=at;lastNow=at;return Math.min(MAX_ELAPSED,at-origin);};
 const append=(kind,at,input={})=>{const id=track(input.trackId),speed=finite(input.speedMph,0,1120)?Math.floor(input.speedMph):null;const marker={id:nextId++,atMs:at,kind,raceType:MODES.some(([key])=>key===input.raceType)?input.raceType:'unknown',trackId:id,label:kind==='manual'?'Stream moment':kind==='mode'?modeLabel(input.raceType)+' observed':`${speed} MPH reached`,speedMph:kind==='speed'?speed:null};markers.push(marker);if(markers.length>MAX_MARKERS)markers.shift();return{...marker};};
 const snapshot=()=>({markers:markers.map(m=>({...m})),maxMarkers:MAX_MARKERS,mediaCaptured:false,persistent:false});
 function mark(input={}){const at=time();return at===null?null:append('manual',at,input);}
 function observe(sample,raceType){
  const at=time(),d=sample?.data||{},c=sample?.context||{};if(at===null)return snapshot();
  if(!sample||!finite(sample.at,0,Number.MAX_SAFE_INTEGER)||lastAt!==null&&sample.at<=lastAt||!finite(lastNow-sample.at,0,500)||d.supported!==true||d.ready!==true||d.driving!==true||d.nativeTelemetry!==true||d.hidden===true||d.focused!==true||d.dynoBusy||c.menu||c.suspended||!Number.isSafeInteger(d.generation)||d.generation<0)return snapshot();
  lastAt=sample.at;if(generation!==d.generation){generation=d.generation;lastMode=null;}
  if(MODES.some(([key])=>key===raceType)&&raceType!==lastMode){append('mode',at,{raceType,trackId:d.trackId});lastMode=raceType;}
  const speed=mph(d.speedMps),band=speed===null?null:Math.floor(speed/10);
  if(band!==null&&band>highestBand&&at-lastSpeedMarker>=5000){highestBand=band;lastSpeedMarker=at;append('speed',at,{raceType,trackId:d.trackId,speedMph:speed});}
  return snapshot();
 }
 return Object.freeze({mark,observe,snapshot});
}
function estimate(tune){
 const o=tune?.current===true?tune.applied||tune.outcome||null:null,b=o?.baselineResult,a=o?.bestResult;
 const pair=(key,digits,max,factor=1)=>finite(b?.[key],Number.MIN_VALUE,max)&&finite(a?.[key],Number.MIN_VALUE,max)?`${(b[key]*factor).toFixed(digits)} → ${(a[key]*factor).toFixed(digits)}`:'—';
 return{state:!o?'No current preview':tune.applied?'Staged · save unconfirmed':'Native preview · original kept',power:pair('peakPowerKw',1,100000),torque:pair('peakTorqueNm',0,100000),accel:pair('zeroTo60Seconds',2,3600),speed:pair('topSpeedMps',1,1000,3.6)};
}
function capturedGarageLabel(tune){
 // Only private bytes already captured and accepted by the exact943 evaluator.
 // This is a tuning-snapshot label, never a new guest-memory identity reader.
 if(tune?.current!==true||tune.moduleHash!==CURRENT_TUNER_HASH||tune.full!==true||tune.evaluatorReady!==true)return null;
 try{
  const lease=(tune.applied||tune.outcome)?.lease,snapshot=lease?.snapshot;
  if(snapshot?.carType!==27||!Array.isArray(snapshot.ranges)||snapshot.ranges.length<3||snapshot.ranges.length>7||['record','tuned','kind','parts','ride'].some(key=>!Number.isSafeInteger(lease[key])||snapshot[key]!==lease[key]))return null;
  const bytes=r=>r&&r.writable!==true&&Object.prototype.toString.call(r.data)==='[object Uint8Array]';
  const globals=snapshot.ranges.filter(r=>bytes(r)&&r.address===0x400000&&r.data.length===0x900000);if(globals.length!==1)return null;
  const g=globals[0].data,types=new DataView(g.buffer,g.byteOffset,g.byteLength).getUint32(0x8a1ccc-0x400000,true);
  const tables=snapshot.ranges.filter(r=>bytes(r)&&r.address===types&&r.data.length===46*0x890);if(types%16||tables.length!==1)return null;
  const table=tables[0].data,offset=27*0x890,name='SKYLINE\0';for(let i=0;i<name.length;i++)if(table[offset+i]!==name.charCodeAt(i))return null;
  if(new DataView(table.buffer,table.byteOffset,table.byteLength).getUint32(offset+0xd0,true)!==0xbe48375e)return null;
  return'Tuning snapshot: Skyline GT-R R34';
 }catch{return null;}
}
function view({stats={},session={},state={},tune={},highlights={},sessionStartedAt}={}){
 const peak=mph(session.peakNativeSpeed),garage=state.ready===true&&state.carKey==='r34'?'Nissan Skyline GT-R · R34':state.ready===true&&state.carKey==='other'?'Other verified stock car':capturedGarageLabel(tune)||'Car identity unavailable';
 return{time:duration(session.driveMilliseconds),peak:peak===null?'—':peak+' MPH',places:String(count(session.trackCount,256)),races:String(finite(sessionStartedAt,0,8640000000000000)&&Array.isArray(stats.runs)?stats.runs.slice(-200).filter(run=>finite(run?.startedAt,sessionStartedAt,8640000000000000)&&run.raceType!=='free-roam').length:0),markers:String(Math.min(MAX_MARKERS,Array.isArray(highlights.markers)?highlights.markers.length:0)),garage,tune:estimate(tune)};
}
const styles=`
.showcase-section{margin-top:22px;padding-top:18px;border-top:1px solid #34465f}.showcase-section h3{font-size:16px;margin:0 0 12px;color:#dff2ed}.showcase-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.showcase-stat{padding:13px;border:1px solid #35584f;border-radius:8px;background:#14232c}.showcase-stat strong{display:block;font-size:25px;color:#b0f4d0;line-height:1.2}.showcase-stat span{display:block;margin-top:7px;font-size:10px;color:#a4bbc6}.showcase-garage{padding:16px;border:1px solid #5d466c;border-radius:9px;background:linear-gradient(125deg,#242139,#111e2b)}.showcase-garage h4{font-size:21px;margin:0 0 4px;color:#eee4ff}.showcase-tune{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:13px 0}.showcase-tune div{padding:10px;border:1px solid #63507466;border-radius:5px}.showcase-tune small{display:block;font-size:10px;color:#b4a8c6}.showcase-tune strong{display:block;font:600 15px/1.5 ui-monospace,monospace;color:#e6f4eb;overflow-wrap:anywhere}.showcase-note{font-size:11px;color:#9cb1bf;line-height:1.5;margin:8px 0}.showcase-actions{display:flex;gap:8px;flex-wrap:wrap}.showcase-actions button{min-height:36px;border:1px solid #466d64;background:#1c3936;color:#caf7df;border-radius:5px;padding:7px 12px;font:inherit}.showcase-markers{max-height:180px;overflow:auto;padding-left:20px;color:#bdd9df;font-size:12px}.showcase-markers li{padding:5px 0}.showcase-presets{display:grid;gap:8px}.showcase-presets label{display:flex;justify-content:space-between;align-items:center;gap:10px;color:#bed1dc;font-size:12px}.showcase-presets select,.showcase-presets input[type=text]{min-width:0;width:62%;max-width:none;border:1px solid #40586d;background:#162432;color:#deedf8;border-radius:4px;padding:7px;font:inherit}.showcase-presets input[type=checkbox]{accent-color:#83e1ba}.showcase-presets button:disabled{opacity:.4}.showcase-presets-state{font-size:11px;color:#9dd7ba;min-height:16px}
@media(max-width:600px){.showcase-grid{grid-template-columns:1fr 1fr}.showcase-garage h4{font-size:18px}.showcase-tune strong{font-size:13px}.showcase-presets label{align-items:start}.showcase-presets select,.showcase-presets input[type=text]{width:60%}}
`;
function markup(){return`<section class="showcase-section" aria-label="Session scorecard"><h3>Tonight’s scorecard</h3><div class="showcase-grid"><div class="showcase-stat"><strong id="showcase-time">0:00</strong><span>Time driving</span></div><div class="showcase-stat"><strong id="showcase-peak">—</strong><span>Session top speed</span></div><div class="showcase-stat"><strong id="showcase-places">0</strong><span>Places visited</span></div><div class="showcase-stat"><strong id="showcase-races">0</strong><span>Race segments observed</span></div></div><p class="showcase-note">This session’s observed driving. A pause can split a segment; wins and finishes are not inferred.</p></section>
<section class="showcase-section" aria-label="Garage showcase"><h3>Garage showcase</h3><div class="showcase-garage"><h4 id="showcase-car">Car identity unavailable</h4><p id="showcase-tune-state" class="showcase-note">No current preview</p><div class="showcase-tune"><div><small>Peak power · kW</small><strong id="showcase-power">—</strong></div><div><small>Peak torque · N·m</small><strong id="showcase-torque">—</strong></div><div><small>0–60 estimate · seconds</small><strong id="showcase-accel">—</strong></div><div><small>Top-speed estimate · km/h</small><strong id="showcase-speed">—</strong></div></div><p class="showcase-note">Before → preview from the native evaluator. These are estimates, not measured race gains or a saved tune.</p></div></section>
<section class="showcase-section" aria-label="Stream highlights"><h3>Stream moments · <span id="showcase-marker-count">0</span></h3><div class="showcase-actions"><button id="showcase-mark" type="button">Mark this moment</button><button id="showcase-export" type="button">Export scorecard + markers</button></div><p class="showcase-note">Local session timestamps and observed speed/mode milestones. No video is recorded or clipped. Keep your stream recording separately.</p><ol id="showcase-highlights" class="showcase-markers"></ol></section>
<section class="showcase-section" aria-label="Race-specific saved settings"><h3>Your race settings</h3><div class="showcase-presets"><label>Race type<select id="showcase-profile-mode" aria-label="Race type for saved settings">${MODES.map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><label>Settings name<input id="showcase-profile-name" type="text" maxlength="35" placeholder="My setup" autocomplete="off"></label><label>Save online permission<input id="showcase-profile-network" type="checkbox"></label><div class="showcase-actions"><button id="showcase-profile-save" type="button">Save current as new</button></div><label>Saved for this type<select id="showcase-profile-select" aria-label="Saved settings for race type"><option value="">Choose saved settings</option></select></label><div class="showcase-actions"><button id="showcase-profile-load" type="button" disabled>Load selected settings</button></div><p id="showcase-profile-state" class="showcase-presets-state" role="status">Manual save and Load only.</p></div><p class="showcase-note">Saves your current extension choices as a normal named profile. No suggested speed/grip values, automatic application, game tune changes or existing-profile replacement.</p></section>`;}
function render(ui,input){const v=view(input),put=(id,text)=>{const n=ui.querySelector('#'+id);if(n)n.textContent=String(text);};for(const key of ['time','peak','places','races'])put('showcase-'+key,v[key]);put('showcase-marker-count',v.markers);put('showcase-car',v.garage);put('showcase-tune-state',v.tune.state);for(const key of ['power','torque','accel','speed'])put('showcase-'+key,v.tune[key]);const list=ui.querySelector('#showcase-highlights');if(list){list.replaceChildren();for(const marker of(Array.isArray(input?.highlights?.markers)?input.highlights.markers:[]).slice(-8).reverse()){const li=list.ownerDocument?.createElement?.('li')||root.document?.createElement?.('li');if(!li)break;li.textContent=`${duration(marker.atMs)} · ${marker.label} · ${Catalog?.displayName(marker.trackId)||'Location unavailable'}`;list.append(li);}}return v;}
function exportData(input){const v=view(input);return{format:'NFSU2 local stream scorecard',version:1,scorecard:{drivingTime:v.time,topSpeed:v.peak,placesVisited:v.places,raceSegmentsObserved:v.races},garage:{car:v.garage,nativeEstimate:v.tune},markers:(Array.isArray(input?.highlights?.markers)?input.highlights.markers:[]).slice(-MAX_MARKERS).map(m=>({atMs:count(m.atMs,MAX_ELAPSED),kind:['manual','mode','speed'].includes(m.kind)?m.kind:'manual',trackId:track(m.trackId),raceType:MODES.some(([key])=>key===m.raceType)?m.raceType:'unknown',speedMph:finite(m.speedMph,0,1120)?m.speedMph:null})),mediaCaptured:false,confirmedResultsAvailable:false};}
const api=Object.freeze({MODES,MAX_MARKERS,styles,markup,render,view,estimate,capturedGarageLabel,exportData,profileName,profilesFor,createHighlights});root.__NFSU2_RACE_SHOWCASE__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
