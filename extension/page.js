(() => {
  'use strict';
  if (location.origin !== 'https://nfsu2.xyz' || window.top !== window || window.__nfsu2DrivingTools) return;
  Object.defineProperty(window, '__nfsu2DrivingTools', { value: true });
  let diagnostics = null;
  try { let storage = null; try { storage = sessionStorage; } catch {} diagnostics = globalThis.__NFSU2_DIAGNOSTICS__?.create({storage,version:'0.43.0-d739e631-draft.1'}) || null; } catch {}
  let diagnosticState = {}, diagnosticIdentity = null, diagnosticPatch = '';
  // The log is observational only: no memory writes, upload, raw console capture or error text.
  const recordDiagnostic = (event, extra = {}) => { try { diagnostics?.record(event,{...diagnosticState,...extra}); } catch {} };
  window.addEventListener('error', event => {try{recordDiagnostic('page-error',{error:event.error || event.message,tools:diagnosticTools()});}catch{recordDiagnostic('page-error',{error:event.error || event.message});}});
  window.addEventListener('unhandledrejection', event => {try{recordDiagnostic('promise-rejection',{error:event.reason,tools:diagnosticTools()});}catch{recordDiagnostic('promise-rejection',{error:event.reason});}});
  const AI = globalThis.__NFSU2_AI__;
  const TargetFeedback=globalThis.__NFSU2_TARGET_FEEDBACK__;
  const targetFeedbackState=TargetFeedback&&globalThis.__NFSU2_TARGET_FEEDBACK_STATE__?.create({decode:TargetFeedback.decode});
  function clearTargetFeedback(){let tick,sequence;try{if(engine)tick=engine.u32(0x86518c);if(typeof ai?.read==='function')sequence=ai.read(4);}catch{}targetFeedbackState?.reset(tick,sequence);if(diagnosticState){const fields=globalThis.__NFSU2_TARGET_FEEDBACK_STATE__?.fields||[];for(const key of fields)diagnosticState[key]=undefined;diagnosticState.nativeTargetFresh=false;diagnosticState.nativeTargetStatus='suspended';}const node=ui?.querySelector('#native-target-state');if(node)node.textContent='Native target feedback · paused';}
  const Walls = globalThis.__NFSU2_WALLS__;
  const Cars = globalThis.__NFSU2_CARS__;
  const Tune = globalThis.__NFSU2_DYNO_CORE__;
  let aiInstallFailed = false, workerModuleLoader = null, buildInfoGeneration = 0;
  async function readBuildInfo(signal) {
    // Each previously unseen original module gets current public metadata.
    // Older responses cannot replace the newest version shown by the page.
    const generation=++buildInfoGeneration;
    try {
      const response=await fetch('/game.json',{cache:'no-store',credentials:'omit',signal});
      if(!response.ok)throw new Error('Build information unavailable');
      const info=await response.json();
      if(signal?.aborted)return null;
      if(generation===buildInfoGeneration){
        revision=String(info?.rev||'unknown');refreshCompatibility();
        recordDiagnostic('build',{revision,supported});
        if(!supported)message('Waiting for an exact verified game module. Unknown builds stay disabled.');
      }
      return info;
    } catch(error) {
      if(!signal?.aborted&&generation===buildInfoGeneration){
        revision='unknown';refreshCompatibility();recordDiagnostic('build-error',{error});
        message('Could not check game version. Memory tools stay disabled.');
      }
      return null;
    }
  }
  async function prepareWorkerModule(originalModule,{signal}={}) {
    const info=await readBuildInfo(signal);
    if(signal?.aborted||!info)return null;
    const expected=AI.getSourceProfile(info),contract=expected?.sourceInterface;
    if(!expected||!Array.isArray(contract?.imports)||!Array.isArray(contract?.exports))return null;
    const imports=WebAssembly.Module.imports(originalModule).map(({module,name,kind})=>({module,name,kind}));
    const exports=WebAssembly.Module.exports(originalModule).map(({name,kind})=>({name,kind}));
    if(JSON.stringify(imports)!==JSON.stringify(contract.imports)||JSON.stringify(exports)!==JSON.stringify(contract.exports))return null;
    const suffix=typeof info.module==='string'&&info.module?`?v=${encodeURIComponent(info.module)}`:'';
    const response=await fetch('/game.wasm'+suffix,{cache:suffix?'default':'no-cache',credentials:'omit',signal});
    if(!response.ok)throw new Error('Verified game source could not be read.');
    const bytes=await response.arrayBuffer();
    if(signal?.aborted||bytes.byteLength!==expected.size)return null;
    const compiled=await AI.compileLocal(bytes);
    if(signal?.aborted)return null;
    const profile=AI.getModuleProfile(compiled);
    if(!profile||profile.revision!==expected.revision||profile.hash!==expected.hash||profile.size!==expected.size)return null;
    return {module:compiled,profile};
  }
  try {
    if(typeof AI?.compileLocal==='function') {
      if(typeof AI.getSourceProfile!=='function'||!globalThis.__NFSU2_WORKER_MODULE_LOADER__?.create)throw new Error('Worker module loader is unavailable.');
      workerModuleLoader=globalThis.__NFSU2_WORKER_MODULE_LOADER__.create({prepare:prepareWorkerModule,onError:error=>{aiInstallFailed=true;refreshCompatibility();recordDiagnostic('page-error',{error});}});
    } else AI?.install();
  }
  catch (error) { aiInstallFailed = true; recordDiagnostic('page-error',{error}); }
  let wall = null, cars = null;
  let raceCapture=null;
  const updateRaceCapture=()=>{if(!ui)return;const checkbox=ui.querySelector('#race-capture-enable'),state=ui.querySelector('#race-capture-state');if(!checkbox||!state)return;checkbox.checked=!!raceCapture?.enabled;checkbox.disabled=!raceCapture?.verified;state.textContent=raceCapture?.text||'Unavailable · verified 93af6ccb offline race only';};
  let dyno = null, dynoEnabled = false, dynoText = 'OFF · back up progress before testing';
  let ecu=null,ecuUi=null;
  const ecuOwnsTuner=()=>!!ecu&&(ecu.busy===true||ecu.enabled());
  const tuningActive=()=>!!dyno?.busy||ecuOwnsTuner();
  function stopEcu(reason='ECU stopped; exact sealed Undo remains available') {
    if(ecuUi)ecuUi.stop(reason);else ecu?.stop();
  }
  function recordEcuDiagnostic(event,result={}) {
    recordDiagnostic(event,{ecuAction:result.action,ecuBeforeKw:result.before?.peakPowerKw,ecuAfterKw:(result.afterRebuild||result.after)?.peakPowerKw,ecuGainPercent:result.measuredPrivateGainPercent,ecuScopeHits:result.scopeHits,ecuActions:result.actions,ecuClicks:result.clicks,ecuUndoAvailable:result.undoAvailable,ecuRestored:result.restored,ecuLiveVerified:false,ecuPersistenceVerified:false});
  }
  let ai = null, dragTakenOver = false, dragRace = false;
  const { Engine, StableGate, adaptiveRaceSettings, supportedRevision, createCameraDirector } = globalThis.__NFSU2_DRIVING_CORE__;
  delete globalThis.__NFSU2_DRIVING_CORE__;
  let engine = null, statusPtr = 0, inputPtr = 0, supported = false, revision = '', visible = false, moduleProfile = null, activeModule = null, activeWorker = null, sessionGeneration = 0;
  const refreshCompatibility=()=>{supported=!aiInstallFailed && !!moduleProfile?.capabilities.legacy && moduleProfile.revision===revision;};
  let host, ui, note, live, timer, driftPending = null, driftNeedsReapply = false;
  const powerGate=new StableGate(), gripGate=new StableGate();
  let lastShift = 0, shiftTimer = 0, lastPulse = 0, lastScan = 0;
  const held = new Set(), physicallyHeld = new Set();
  const prefs = { raceCornerAssist: false, raceCornerFactor: 0.8, raceCornerMargin: 15, raceBraking: 0.75, cornerAssist: false, cornerFactor: 0.8, cornerMargin: 15, racePace: false, racePaceFactor: 1, walls: false, cars: false, traffic: false, players: false, online: false, ai: false, aiPace: false, paceFactor: 1, dragNoBlowout: false, drag: false, rpm: 6500, tester: false, boost: false, power: 1.5, unlimit: false, grip: false, gripFactor: 1.3, drift: null };
  const NearMissControl=globalThis.__NFSU2_NEAR_MISS_CONTROL__;
  function nearMissContext(){
    const state=engine?.state(),counters=engine&&statusPtr?engine.status(statusPtr):null;
    const drive=counters&&Number.isFinite(counters.drive)?counters.drive&3:0;
    return{moduleIdentity:activeModule,moduleHash:moduleProfile?.hash,generation:sessionGeneration,car:state?.car,race:state?.race,
      network:state?.network===true,allowNetwork:prefs.online===true,
      safe:!!(supported&&state?.ready&&state.driving&&drive&&!document.hidden&&document.hasFocus()&&!document.querySelector('dialog[open]')&&!tuningActive()&&!driftPending)};
  }
  const nearMiss=NearMissControl?.create({
    clock:()=>performance.now(),
    getBridge:()=>{
      if(!supported||moduleProfile?.capabilities.nativeSyntheticNearMiss!==true||!engine)return null;
      const existing=AI?.getNearMissBridge?.(activeModule);
      if(existing?.generation===sessionGeneration)return existing;
      // Guest startup clears its split-player scratch. Claim the native
      // command header only after that initialization and owned driving state.
      const state=engine.state(),counters=statusPtr?engine.status(statusPtr):null;
      if(!state.ready||!state.driving||!counters||!Number.isFinite(counters.drive)||(counters.drive&3)===0)return null;
      return AI?.getNearMissBridge?.(activeModule,engine.memory,sessionGeneration)||null;
    },
    getContext:nearMissContext
  });
  const nearMissTopUp=nearMiss&&globalThis.__NFSU2_NEAR_MISS_TOP_UP__?.create({
    control:nearMiss,clock:()=>performance.now(),
    getSample:()=>{
      if(!supported||moduleProfile?.capabilities.nativeSyntheticNearMiss!==true||!engine)return null;
      const state=engine.state(),before=engine.nosDiagnostics(state,true),after=engine.nosDiagnostics(state,true),context=nearMissContext();
      // Read twice: LEFT is accounting credit while NOS is active. The loop
      // subtracts the selected clock's elapsed ticks without editing that state.
      if(!state.ready||context.car!==state.car||context.race!==state.race||before.nosTelemetry!==true||after.nosTelemetry!==true||
        !['nosClockNetwork','nosSinceTicks','nosTimestampActive','nosFullTicks','nosRemainingTicks'].every(key=>before[key]===after[key]))return null;
      return{...context,full:after.nosFullTicks,remaining:after.nosRemainingTicks,active:after.nosTimestampActive,elapsedTicks:after.nosElapsedTicks};
    }
  });
  function renderNearMiss(){
    if(!ui)return;
    const state=nearMiss?.status()||{canRequest:false,text:'Synthetic near miss unavailable on this game build'};
    const button=ui.querySelector('#near-miss-request'),output=ui.querySelector('#near-miss-state');
    const loop=nearMissTopUp?.status()||{enabled:false,pending:false,text:'NOS top-up unavailable'};
    if(button)button.disabled=state.canRequest!==true||loop.enabled||loop.pending;
    if(output)output.textContent=state.text;
    const toggle=ui.querySelector('#near-miss-top-up'),loopOutput=ui.querySelector('#near-miss-top-up-state');
    if(toggle){toggle.checked=loop.enabled;toggle.disabled=!nearMissTopUp||(!loop.enabled&&(!state.available||state.pending||loop.pending));}
    if(loopOutput)loopOutput.textContent=loop.text;
  }
  // Session-only race arming is separate from existing saved driving profiles.
  let raceOnlyAI=false;
  const AutonomyRoad=globalThis.__NFSU2_AUTONOMY_ROAD__,AutonomyDrive=globalThis.__NFSU2_AUTONOMY_DRIVE__,AutonomyHosted=globalThis.__NFSU2_AUTONOMY_HOSTED__,AutonomyLoop=globalThis.__NFSU2_AUTONOMY_LOOP__;
  let autonomyObserver=null,autonomyDrive=null,autonomyLoop=null,autonomySample=null,autonomySnapshot=null,autonomyStartPending=false,autonomyStartUntil=0,autonomyCatalogSample=null,autonomyCatalogAt=-Infinity,autonomyVisitDrag=false,autonomyCruise=false;
  // Short presentation lease only. Travel and JOIN never consume this cache.
  const AUTONOMY_CATALOG_MS=1000,AUTONOMY_START_MS=1500;
  const autonomyTransient=sample=>sample?.fresh!==true&&['snapshot-changed','host-snapshot-changed'].includes(sample?.reason);
  const autonomySelected=new Set(),autonomyNodes=new Map();
  let autonomyDiagnosticTransition='';
  // Display-only preference, deliberately outside saved driving-tool profiles.
  const HUD_KEY='nfsu2-driving-tools-info-hud-v1';
  let infoHudEnabled=true,infoHudSample=null;
  const Pitwall=globalThis.__NFSU2_PITWALL__;
  let pitwallEnabled=false;
  const StreamHud=globalThis.__NFSU2_STREAM_HUD__,STREAM_KEY='nfsu2-driving-tools-stream-hud-v1';
  const streamSession=StreamHud?.createSession?.();
  const cameraDirector=createCameraDirector?.();
  let cameraRotationEnabled=false,cameraPulseTimer=null,cameraPulseActive=false;
  const RearRadar=globalThis.__NFSU2_REAR_RADAR__,RADAR_KEY='nfsu2-driving-tools-rear-radar-v1';
  let streamHudEnabled=false,rearRadarEnabled=false,radarRange=200,radarSample=null,radarAt=-Infinity,radarOwner=null,hudLayout=null,hudEditing=false,cleanView=false,cleanRestore={panel:false,hub:false},streamRenderAt=-Infinity;
  try{streamHudEnabled=sessionStorage.getItem(STREAM_KEY)==='1';}catch{}
  try{const saved=JSON.parse(sessionStorage.getItem(RADAR_KEY)||'null');rearRadarEnabled=saved?.enabled===true;if(Number.isFinite(saved?.range)&&saved.range>=50&&saved.range<=500)radarRange=saved.range;}catch{}
  function saveRadar(){try{sessionStorage.setItem(RADAR_KEY,JSON.stringify({enabled:rearRadarEnabled,range:radarRange}));}catch{}}
  let cleanPageSheet=null;
  function cleanGameDebug(hidden){
    // Hide only the public game's performance column; its saved setting stays intact.
    if(!Array.isArray(document.adoptedStyleSheets))return;
    if(hidden){if(!cleanPageSheet){cleanPageSheet=new CSSStyleSheet();cleanPageSheet.replaceSync('#fps{display:none!important}');}if(!document.adoptedStyleSheets.includes(cleanPageSheet))document.adoptedStyleSheets=[...document.adoptedStyleSheets,cleanPageSheet];}
    else if(cleanPageSheet)document.adoptedStyleSheets=document.adoptedStyleSheets.filter(sheet=>sheet!==cleanPageSheet);
  }
  let radarDrawnSample;
  function renderStreamHud(force=false){
    if(!ui)return;
    const node=ui.querySelector('#stream-hud'),checkbox=ui.querySelector('#stream-hud-enable');
    if(checkbox)checkbox.checked=streamHudEnabled;
    if(!node)return;
    node.hidden=!(streamHudEnabled||rearRadarEnabled||(pitwallEnabled&&!cleanView))||(!cleanView&&!hudEditing&&(visible||hubOpen));
    for(const id of ['brand','driver','session','stats','road','footer'])ui.querySelector('#stream-widget-'+id).hidden=!streamHudEnabled;
    ui.querySelector('#stream-widget-radar').hidden=!rearRadarEnabled;
    const pitwallNode=Pitwall?ui.querySelector('#stream-widget-pitwall'):null;if(pitwallNode)pitwallNode.hidden=!pitwallEnabled||cleanView;
    if(node.hidden||!StreamHud)return;
    const now=performance.now();
    const radarView=rearRadarEnabled&&now-radarAt>=0&&now-radarAt<=250?radarSample:null;
    if(force||radarView!==radarDrawnSample){StreamHud.renderRadar(ui,radarView);radarDrawnSample=radarView;}
    if(!force&&now-streamRenderAt<250)return;streamRenderAt=now;
    if(pitwallEnabled&&!cleanView)Pitwall?.render(ui,{sample:infoHudSample,now,radar:radarView,radarAt});
    StreamHud.render(ui,{sample:infoHudSample,now,session:streamSession?.snapshot(),info:infoHudView(infoHudSample,{...prefs,raceOnlyAI},now),stats:raceStats?.snapshot()||{},forward:forwardSnapshot});
  }
  function setCleanView(hidden){
    if(hidden===cleanView)return;
    if(hidden){cleanRestore={panel:visible,hub:hubOpen};hudEditing=false;hudLayout?.setEditing(false);if(ui)ui.querySelector('#hud-layout-enable').checked=false;setRaceHub(false);setPanel(false);}
    cleanView=!!hidden;
    cleanGameDebug(cleanView);
    if(ui)for(const id of ['min','quick-stop','race-hub-open'])ui.querySelector('#'+id).hidden=cleanView;
    if(!cleanView){setPanel(cleanRestore.panel);setRaceHub(cleanRestore.hub);}
    renderInfoHud();renderStreamHud(true);
  }
  const RaceHub=globalThis.__NFSU2_RACE_HUB__,RaceCatalog=globalThis.__NFSU2_RACE_CATALOG__,RaceTelemetry=globalThis.__NFSU2_RACE_TELEMETRY__,RaceShowcase=globalThis.__NFSU2_RACE_SHOWCASE__;
  const showcaseHighlights=RaceShowcase?.createHighlights({clock:()=>performance.now()}),showcaseStartedAt=Date.now();
  let showcaseProfileRows=[];
  let raceStats=null,hubOpen=false,hubRuntime={ready:false},hubRenderAt=0;
  try{let storage=null;try{storage=localStorage;}catch{}raceStats=globalThis.__NFSU2_RACE_STATS__?.create({storage})||null;}catch{}
  function renderRaceHub(force=false){
    if(!ui||!RaceHub||!hubOpen)return;
    const now=performance.now();if(!force&&now-hubRenderAt<250)return;hubRenderAt=now;
    try{RaceHub.render(ui,raceStats?.snapshot()||{},hubRuntime,RaceCatalog||{},showcaseInput());}catch{}
  }
  function showcaseInput(){
    const ready=!!(dynoEnabled&&supported&&visible&&!document.hidden&&document.hasFocus()&&!dyno?.busy&&!ecu?.busy&&!ecuOwnsTuner()&&dyno?.canUse?.());
    const context=ready?dyno?.syncContext?.():null,outcome=dyno?.applied||dyno?.outcome,lease=outcome?.lease;
    const current=!!(ready&&context&&lease&&['record','tuned','kind'].every(key=>lease[key]===context[key]));
    return{session:streamSession?.snapshot()||{},sessionStartedAt:showcaseStartedAt,highlights:showcaseHighlights?.snapshot()||{},tune:{current,outcome:dyno?.outcome,applied:dyno?.applied,moduleHash:moduleProfile?.hash,full:dyno?.full===true,evaluatorReady:!!dyno?.evaluator}};
  }
  function renderShowcaseProfiles(){
    if(!RaceShowcase||!ui||!RaceHub)return;
    const state=profileStore?.snapshot(),mode=ui.querySelector('#showcase-profile-mode'),select=ui.querySelector('#showcase-profile-select');
    if(!RaceShowcase.MODES.some(([key])=>key===mode.value))mode.value='circuit';
    const chosen=select.value;showcaseProfileRows=RaceShowcase.profilesFor(state?.data?.profiles,mode.value);
    select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Choose saved settings';select.append(empty);
    for(const row of showcaseProfileRows){const option=document.createElement('option');option.value=row.id;option.textContent=row.name;select.append(option);}
    select.value=showcaseProfileRows.some(row=>row.id===chosen)?chosen:'';
    ui.querySelector('#showcase-profile-save').disabled=profileActionPending||!state?.available||!profileLocks();
    ui.querySelector('#showcase-profile-load').disabled=profileActionPending||!state?.available||!showcaseProfileRows.some(row=>row.id===select.value);
    ui.querySelector('#showcase-profile-state').textContent=profileNotice||state?.error||'Manual save and Load only. Existing profiles stay intact.';
  }
  function setRaceHub(open){
    hubOpen=!!open&&!!RaceHub;if(!ui||!RaceHub)return;
    const hub=ui.querySelector('#race-hub');if(hub)hub.hidden=!hubOpen;
    ui.querySelector('#race-hub-open')?.setAttribute('aria-expanded',String(hubOpen));
    renderRaceHub(true);renderShowcaseProfiles();renderInfoHud();renderStreamHud(true);
  }
  function pauseRaceStats(){
    try{raceStats?.observe({driving:false,inRace:false});}catch{}
    hubRuntime={ready:false};renderRaceHub(true);
  }
  try {infoHudEnabled=sessionStorage.getItem(HUD_KEY)!=='0';} catch {}
  const STORAGE_KEY='nfsu2-driving-tools-v1';
  try {
    const saved=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'null');
    if(saved && typeof saved==='object') {
      if(Object.prototype.hasOwnProperty.call(saved,'nos')){
        delete saved.nos;
        try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(saved));}catch{}
      }
      for(const name of ['drag','tester','dragNoBlowout']) if(typeof saved[name]==='boolean') prefs[name]=saved[name];
      for(const [name,min,max] of [['raceCornerFactor',0.6,0.95],['raceCornerMargin',0,25],['raceBraking',0.5,1],['racePaceFactor',0.75,3],['cornerFactor',0.6,0.95],['cornerMargin',0,25],['paceFactor',0.75,3],['rpm',3000,10000],['power',1,3],['gripFactor',1,2]]) if(Number.isFinite(saved[name])) prefs[name]=Math.max(min,Math.min(max,saved[name]));
      if(typeof saved.drift==='boolean') prefs.drift=saved.drift;
    }
  } catch { /* storage disabled: choices still persist between races in this page */ }
  const ToolProfiles=globalThis.__NFSU2_TOOL_PROFILES__;
  let profileStore=null,profileSelection=null,loadedProfile=null,profileNotice='',profileStartup=null,profileDriftChoice=false,profileActionPending=false,profileActionEpoch=0;
  const PROFILE_SESSION_STOP='nfsu2-driving-tools-profiles-session-stop';
  let profileSessionStopped=false;
  try {profileSessionStopped=sessionStorage.getItem(PROFILE_SESSION_STOP)==='1';}catch{}
  if(ToolProfiles){let storage=null;try{storage=localStorage;}catch{}profileStore=ToolProfiles.create(storage);profileStartup=profileSessionStopped?null:profileStore.startup();}
  // A durable Stop suppresses legacy same-tab driving reapplication as well.
  if(profileSessionStopped||profileStore?.snapshot().paused||(profileStore&&!profileStore.snapshot().available)){for(const k of ['raceCornerAssist','cornerAssist','racePace','walls','cars','traffic','players','online','ai','aiPace','dragNoBlowout','drag','boost','unlimit','grip'])prefs[k]=false;}
  // Intentionally outside saved profiles and legacy session preference storage.
  let adaptiveRaceEnabled=false,adaptiveRaceCeiling=1.3;
  const dynamicPacer=globalThis.__NFSU2_DYNAMIC_PACING__?new globalThis.__NFSU2_DYNAMIC_PACING__.Pacing():null;
  let cityPacingEnabled=false,onlineRivalsEnabled=false;
  const cityPacer=globalThis.__NFSU2_CITY_PACING__?.Controller?new globalThis.__NFSU2_CITY_PACING__.Controller():null;
  function renderCityPace(state={active:false,state:'off'}){
    if(!ui)return;
    const checkbox=ui.querySelector('#city-pace'),node=ui.querySelector('#city-pace-state');
    checkbox.checked=cityPacingEnabled;
    checkbox.disabled=!cityPacer||!supported||moduleProfile?.capabilities.ai!==true||moduleProfile?.capabilities.pace!==true;
    const labels={off:'Off · current page only',unsupported:'Unavailable on this verified build','network-permission':'Allow network tools is off','not-online':'Waiting for an online free-roam session',mode:'Waiting for ordinary online free roam','ai-off':'Selected · waiting for Automatic driver',paused:'Paused · waiting for active focused driving','waiting-owner':'Waiting for current local AI ownership',invalid:'Waiting for valid pacing context','selected-native':'Selected pace ceiling · partial observations','clearance-limited':'Observed clearance · slowing pace request'};
    node.textContent=labels[state.state]||'Waiting for current observations';
    if(state.active)node.textContent+=' · '+state.pace.toFixed(2)+'× requested';
  }
  const cityEvidence=state=>({cityPacingEnabled,cityPacingState:state?.state||'off',citySelectedPace:state?.active?state.selectedPace:undefined,cityRuntimePace:state?.active?state.pace:undefined,cityClearanceObserved:state?.active?state.clearanceObserved:undefined,cityClearanceDistance:state?.active?state.clearanceDistance:undefined,cityClearanceSource:state?.active?state.clearanceSource:undefined,cityClearanceTarget:state?.active?state.clearanceTarget:undefined,cityTimingState:state?.active?state.timingState:undefined,citySampleGapMs:state?.active?state.sampleGapMs:undefined,cityContactPreviewAvailable:state?.active?state.contactPreviewAvailable:undefined,cityContactPreviewState:state?.active?state.contactPreviewState:undefined,cityObservedCars:state?.active?state.observedCars:undefined,cityExcludedCars:state?.active?state.excludedCars:undefined});
  function clearCityPace(){cityPacingEnabled=false;cityPacer?.reset();diagnosticState={...diagnosticState,...cityEvidence()};renderCityPace();}
  function clearRivalNoClip(){onlineRivalsEnabled=false;cars?.stop();diagnosticState={...diagnosticState,onlineRivalsRequested:false};if(ui){const control=ui.querySelector('#rivals');if(control)control.checked=false;renderAllOnlineCars();}}
  const allOnlineCarsAvailable=()=>['onlineTraffic','onlinePlayers','onlineRaceCars','onlineRivals','onlinePlayerOutrun'].every(key=>moduleProfile?.capabilities?.[key]===true);
  function renderAllOnlineCars(carState){
    if(!ui)return;
    const control=ui.querySelector('#online-all'),state=ui.querySelector('#online-all-state');
    control.disabled=!allOnlineCarsAvailable();
    control.checked=prefs.online===true&&prefs.traffic===true&&prefs.players===true&&onlineRivalsEnabled===true;
    state.textContent=!allOnlineCarsAvailable()?'Unavailable on this game build':!control.checked?'Off · traffic, players and NPC rivals':carState?.requested?'Armed · '+(carState.reason||'local car contacts'):'Selected · waiting for an eligible online session';
  }
  function setAllOnlineCars(enabled){
    const selected=enabled===true&&allOnlineCarsAvailable();
    prefs.traffic=selected;prefs.players=selected;onlineRivalsEnabled=selected;
    if(selected)prefs.online=true;else cars?.stop();
    if(ui)for(const[id,value]of [['traffic',prefs.traffic],['players',prefs.players],['rivals',onlineRivalsEnabled],['online',prefs.online]])ui.querySelector('#'+id).checked=value;
    renderAllOnlineCars();
    message(selected?'Online car no-clip selected for traffic, players and NPC rivals. Outrun covers verified challenge participants; races cover verified race cars. Automatic driver settings are kept.':'Online car no-clip off. Automatic driver and network permission settings are kept.');
  }
  let forwardDrive=null;
  let rubberband=null,rubberbandEnabled=!profileSessionStopped,rubberbandPercent=100,rubberbandStrength=1.5;
  // 0.42 rails: the owned race AI car stays on the game's simplified AI physics (the mode the opponents drive in)
  // instead of dropping to full physics after its first contact. Session-only, owned road races and Street X.
  // In a rails race the catch-up switch only raises speed targets; the paired power/grip boost stays out.
  let railsEnabled=true,railsDefaultsApplied=false,rubberbandPercentTouched=false;
  const newRailsWatch=()=>({identity:'',armed:false,stuckSince:null,fastSince:null,trips:0,suspended:false,lastAt:null,lastTick:null});
  const newRailsView=()=>({wanted:false,race:false,paceOnly:false,on:false,pins:0,suspended:false,trips:0,pace:1,streetX:false});
  let railsWatch=newRailsWatch(),railsView=newRailsView();
  const RAILS_DEFAULT_PERCENT=130,RAILS_STREET_X_CEILING=1.15;
  const soloOnlyBuild=()=>moduleProfile?.capabilities?.soloOnly===true;
  // Online capability is granted by the verified native adapter, never by a saved preference.
  function enforceSolo(){
    const blocked=soloOnlyBuild(),control=ui?.querySelector('#online');
    if(blocked)prefs.online=false;
    if(control){control.disabled=blocked;if(blocked)control.checked=false;}
  }
  function syncRubberbandControls(){
    if(!ui)return;
    const input=ui.querySelector('#rubberband-percent'),value=ui.querySelector('#rubberband-value');
    if(input)input.value=rubberbandPercent;
    if(value)value.textContent=(rubberbandPercent/100).toFixed(2)+'×';
  }
  // Stuck watchdog. Armed once the car has moved; a car that then stays under 2 m/s for 3 s while the race AI owns it
  // has its rails released so the game's normal full physics can recover it. Rails return after 2 s above 20 m/s.
  // Two releases per race at most; after that the rails stay off for that race.
  function updateRailsWatch(identity,driving,speed,now,tick){
    if(railsWatch.identity!==identity){railsWatch=newRailsWatch();railsWatch.identity=identity;}
    const w=railsWatch;
    // Wall time alone cannot prove the game advanced while paused or stalled.
    // Require consecutive fresh native frames; gaps restart only the timers.
    const observed=driving===true&&Number.isFinite(speed)&&speed>=0&&Number.isFinite(now)&&Number.isInteger(tick)&&tick>=0&&tick<=0xffffffff;
    const continuous=observed&&w.lastAt!==null&&now>w.lastAt&&now-w.lastAt<=500&&w.lastTick!==null&&tick>w.lastTick;
    w.lastAt=observed?now:null;w.lastTick=observed?tick:null;
    if(!continuous){w.stuckSince=null;w.fastSince=null;return w;}
    if(w.suspended){
      if(w.trips>=2)return w;
      if(speed>=20){if(w.fastSince===null)w.fastSince=now;else if(now-w.fastSince>=2000){w.suspended=false;w.armed=true;w.fastSince=null;w.stuckSince=null;}}
      else w.fastSince=null;
      return w;
    }
    if(!w.armed){if(speed>=10)w.armed=true;return w;}
    if(speed<2){if(w.stuckSince===null)w.stuckSince=now;else if(now-w.stuckSince>=3000){w.suspended=true;w.trips++;w.stuckSince=null;w.fastSince=null;}}
    else w.stuckSince=null;
    return w;
  }
  function renderRails(){
    if(!ui)return;
    const toggle=ui.querySelector('#rails-enable'),status=ui.querySelector('#rails-state');
    if(!toggle||!status)return;
    const available=supported&&moduleProfile?.capabilities.nativeRails===true,v=railsView;
    toggle.checked=railsEnabled;toggle.disabled=!available;
    status.textContent=!available?'Unavailable on this game build':!railsEnabled?'Off · full physics after the first contact':
      v.suspended?(v.trips>=2?'Released for this race · car stopped twice':'Released · car stopped · normal physics recovering'):
      v.on?'On rails'+(v.pins?' · held '+v.pins+'×':''):v.wanted?'Selected · waiting for race AI':'Selected · road races and Street X';
    status.title='Simplified AI physics for your owned race AI car in Circuit, Sprint, URL and Street X. Online requires Allow network tools and the verified online adapter. "Held" counts native requests to leave simplified physics that the rails guard held. Drag, Drift, free roam and manual driving use their existing modes.';
  }
  let rubberbandSnapshot={state:'off',active:false,resetPending:false};
  let nativeCalculatedState={eligible:false,reason:'off'};
  const rubberbandEvidence=()=>({rubberbandState:rubberbandSnapshot.state,rubberbandActive:rubberbandSnapshot.active,rubberbandResetPending:rubberbandSnapshot.resetPending,rubberbandResetAcknowledged:rubberbandSnapshot.resetAcknowledged,rubberbandRequestedPercent:rubberbandSnapshot.requestedPercent,rubberbandAppliedPercent:rubberbandSnapshot.appliedPercent,rubberbandPublication:rubberbandSnapshot.publication,rubberbandAckAgeMs:rubberbandSnapshot.ackAgeMs,nativeCalculatedEligible:false,nativeCatchupOn:nativeCalculatedState.catchupOn,pacedCatchupEligible:nativeCalculatedState.eligible,pacedRequestedStrength:rubberbandSnapshot.requestedStrength,pacedAppliedStrength:rubberbandSnapshot.appliedStrength,pacedSourceFactor:rubberbandSnapshot.sourceFactor,pacedPowerFactor:rubberbandSnapshot.powerFactor,pacedTireFactor:rubberbandSnapshot.tireFactor,pacedPowerGain:rubberbandSnapshot.relativePowerGain,pacedTireGain:rubberbandSnapshot.relativeTireGain,pacedWheelHits:rubberbandSnapshot.wheelHits,pacedOutputsVerified:rubberbandSnapshot.outputsVerified,pacedAckRejectCode:rubberbandSnapshot.ackRejectCode,pacedPhysicsKind:rubberbandSnapshot.physicsKind,pacedEvidenceKind:rubberbandSnapshot.evidenceKind,pacedCombinedGripFactor:rubberbandSnapshot.combinedGripFactor,pacedNativeStage:rubberbandSnapshot.nativeStage});
  function renderRubberband(){
    if(!ui)return;
    const toggle=ui.querySelector('#rubberband-enable'),status=ui.querySelector('#rubberband-state');
    if(!toggle||!status)return;
    toggle.checked=rubberbandEnabled;
    const available=supported&&moduleProfile?.capabilities.nativePacedCatchup===true;
    toggle.disabled=!available;
    // Match the actual handling policy: selecting rails for this permitted road
    // race keeps paired power/grip off even while the watchdog releases the pin.
    // Preserve the selected strength for Drag and later full-physics races.
    const railsHandlingOff=available&&railsEnabled&&railsView.wanted===true;
    const strength=ui.querySelector('#rubberband-strength'),strengthState=ui.querySelector('#rubberband-strength-state'),modeLabel=ui.querySelector('#rubberband-label');
    if(strength){
      strength.disabled=!available||railsHandlingOff;
      strength.title=railsHandlingOff?'Catch-up strength is not applied in this rails race. Your selection is kept for full physics and Drag.':'Handling assistance for full physics and Drag. Rails races use the Paired race pace control.';
      strength.setAttribute('aria-valuetext',rubberbandStrength.toFixed(2)+' times'+(railsHandlingOff?' saved; inactive in rails mode':''));
    }
    if(strengthState)strengthState.textContent=!available?'Handling assistance unavailable on this build':railsHandlingOff?'Strength inactive · rails uses speed targets only · no grip or power boost':'Strength applies to full physics and Drag · selected '+rubberbandStrength.toFixed(2)+'×';
    if(modeLabel)modeLabel.textContent=railsHandlingOff?'Race pace · rails mode':'Race pace + catch-up';
    const labels={off:'Off',unsupported:'Unavailable on this game build',unavailable:'Unavailable',unverified:'Waiting for a verified game','protocol-error':'Handling command unavailable',blocked:'Handling mailbox unavailable',waiting:'Waiting for matching handling-input publication',applied:'Matching handling inputs confirmed','guarded-native':'Handling guard retained native values'};
    const waiting={'ai-unowned':'Selected · waiting for race AI','not-ordinary-race':'Selected · waiting for a supported race with race AI on','network-permission':'Paused online · enable Allow network tools on a supported build',unsafe:'Paused · waiting for active driving','stacking-not-neutral':'Waiting for custom power/grip restoration',sample:'Native factors unavailable · native calculation unchanged'};
    const n=nativeCalculatedState;
    status.textContent=rubberbandEnabled?(waiting[n.reason]||labels[rubberbandSnapshot.state]||'Waiting for native physics'):'Off';
    if(rubberbandEnabled&&n.eligible)status.textContent=labels[rubberbandSnapshot.state]||rubberbandSnapshot.reason||'Waiting for native physics';
    if(rubberbandEnabled&&rubberbandSnapshot.active&&rubberbandSnapshot.outputsVerified){
      const support=rubberbandSnapshot.evidenceKind==='combined-grip'&&Number.isFinite(rubberbandSnapshot.combinedGripFactor)?`combined-grip input ${rubberbandSnapshot.combinedGripFactor.toFixed(3)}`:rubberbandSnapshot.evidenceKind==='four-tires'&&Number.isFinite(rubberbandSnapshot.tireFactor)?`four-tire input ${rubberbandSnapshot.tireFactor.toFixed(3)}`:'handling inputs confirmed';
      status.textContent=`Pace ${(rubberbandSnapshot.appliedPercent/100).toFixed(2)}× · strength ${rubberbandSnapshot.appliedStrength.toFixed(2)}× · ${support}`;
    }
    if(rubberbandEnabled&&n.eligible&&n.catchupOn===false&&moduleProfile?.capabilities.godlyModes!==true)status.textContent='Game Catch Up is off · matching boost unavailable';
    if(rubberbandEnabled&&moduleProfile?.capabilities.nativePacedCatchup!==true)status.textContent='Pace-linked catch-up unavailable on this game build';
    if(rubberbandEnabled&&railsHandlingOff){
      // Shown pace: what is requested for the owned car (Street X can be capped below the slider); the slider value while waiting.
      const live=railsView.on||railsView.suspended,shown=live&&Number.isFinite(railsView.pace)?railsView.pace:rubberbandPercent/100;
      status.textContent=(railsView.suspended?'Rails released · pace ':railsView.on?'On rails · pace ':'Rails pace ')+shown.toFixed(2)+'×'+(live&&railsView.streetX&&shown<rubberbandPercent/100?' · Street X cap':'')+' · speed targets only · no grip/power boost'+(live?'':' · waiting for race AI');
    }
    if(rubberbandSnapshot.resetPending)status.textContent+=' · restoration pending';
    status.title=railsHandlingOff?'Rails mode: Paired race pace changes speed targets. Catch-up strength is inactive and no paired power/grip boost is applied, including during recovery. Your selected strength is kept for full physics and Drag.':'Pairs selected pace P with native handling support. Strength S is an independent 1–10× authored control. Source caches remain native; matching full-physics tire inputs or simplified-physics combined-grip inputs are checked separately. Displayed factors describe handling inputs, with no measured engine-power, grip or speed claim. Extra native pace stays neutral until matching physical outputs are verified. Raised corner targets require current gain at native use time. Works with game Catch Up and Rubberbanding on or off. Assistance scales the native source factor for your owned AI car; opponents keep their game setting. Online requires Allow network tools and the verified online adapter. Custom power/grip are paused during use and restoration.';
  }
  function stopRubberband(disable=false){
    if(disable)rubberbandEnabled=false;
    nativeCalculatedState={eligible:false,reason:disable?'off':'unsafe'};
    try{const context={enabled:false,percent:100,strength:1,now:performance.now(),currentCar:engine?.state()?.car||0};rubberbandSnapshot=(disable?rubberband?.stop(context):rubberband?.update(context))||rubberbandSnapshot;}catch{rubberbandSnapshot={state:'unavailable',active:false,resetPending:true};}
    diagnosticState={...diagnosticState,...rubberbandEvidence()};
    renderRubberband();
  }
  let forwardSnapshot={forwardState:'off',forwardNativeApplied:false,forwardLiveVerified:false};
  function renderForwardStatus() {
    if(!ui)return;
    const node=ui.querySelector('#forward-race-state');if(!node)return;
    const state=forwardSnapshot;
    node.textContent=!moduleProfile?.capabilities.nativeForwardGeometry?'Forward road preview unavailable on this build':
      state.forwardState==='armed'?`Forward target requested · ${state.forwardSamples} points · ${state.forwardHorizon.toFixed(0)} units · ${state.forwardPriorityTurns} priority turns`:
      state.forwardState==='observed'?`Read-only road preview · ${state.forwardSamples} points · ${state.forwardPriorityTurns} priority turns`:
      state.forwardState==='native-fallback'?'No measured corner target · native driving continues':
      state.forwardState==='waiting'||state.forwardState==='requested'?'Forward road preview · waiting for native sample':
      state.forwardState==='unknown'?'Forward road preview unknown · native driving continues':'Forward road preview off · follows Adaptive in permitted road races';
    node.title='Bounded selected-road centerline preview, including gradual and accumulated 75°+ bends. Exact-build native policy receipts supply the game\'s planning limits; unsupported policy remains read-only. These are planning assumptions, not measured tire forces. A request is not a native application acknowledgement or a measured cornering result. The 100 ms native lease can leave gaps; existing native driving continues between requests.';
  }
  function cancelForward() {
    try{forwardDrive?.stop();}catch{}
    forwardSnapshot={forwardState:'off',forwardNativeApplied:false,forwardLiveVerified:false};
    diagnosticState={...diagnosticState,...forwardSnapshot,forwardSamples:undefined,forwardHorizon:undefined,forwardPriorityTurns:undefined,forwardRequestedTarget:undefined,forwardLeaseTicks:undefined,forwardFailureCode:undefined,forwardGuardCode:undefined,forwardReadPhaseCode:undefined,forwardReadSubreasonCode:undefined,forwardNumericControlWord:undefined,forwardNumericFailureMask:undefined,forwardCaptured:false};
    renderForwardStatus();
  }
  let pacingEvidence=null;
  const diagnosticTools = () => ({...prefs,raceOnlyAI,dynoEnabled,adaptiveRace:adaptiveRaceEnabled,adaptiveRaceCeiling,rubberband:rubberbandEnabled,rubberbandPercent,rubberbandStrength,rails:railsEnabled});
  const coarseDiagnostic = () => Object.fromEntries(['generation','supported','ready','driving','network','safe','hidden','focused','hud','flow','raceType','racePhase','driverKind','physicsKind','gameTicks','dynoBusy','dynoFullTuner','dynoSecondWindowCapture','dynoCurrentClamp'].filter(key=>diagnosticState[key]!==undefined).map(key=>[key,diagnosticState[key]]));
  function traceDiagnostic(data,failureCode=0,producerStage=0) {
    const sample={...data,revision:moduleProfile?.revision||revision,moduleHash:moduleProfile?.hash,tools:diagnosticTools(),traceStatus:failureCode?'unavailable':'captured',producerFailureCode:failureCode,producerStage};
    // Keep short observed rails transitions even when the regular 250 ms trace skips this tick.
    try { diagnostics?.railsTransition?.({...sample,railsMenuOpen:!!document.querySelector('dialog[open]')}); } catch {}
    try { diagnostics?.trace?.(sample); }
    catch { try { diagnostics?.record('state',{...coarseDiagnostic(),generation:sessionGeneration,revision:moduleProfile?.revision||revision,moduleHash:moduleProfile?.hash,supported,tools:diagnosticTools(),traceStatus:'unavailable',producerFailureCode:3,producerStage:3}); } catch {} }
  }
  const savePrefs=()=>{try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(prefs));}catch{}};
  recordDiagnostic('tools',{tools:diagnosticTools()});
  const message = text => { if (note) {note.textContent=text;const summary=ui.querySelector('#status-summary');summary.title=text;} };
  // Pure presentation of existing verified samples. No reads or writes to game
  // memory occur here; missing/paused telemetry is never replaced with zero.
  function infoHudView(sample,choices,now) {
    const fresh=sample && Number.isFinite(sample.at) && now-sample.at>=0 && now-sample.at<=500;
    const d=fresh?sample.data:{}, c=fresh?sample.context:{};
    const aiSelected=!!choices.ai || (!!choices.raceOnlyAI && d.raceOnlyRequested===true);
    const paused=!fresh?'Waiting for live sample':!d.supported?'Build not verified':!d.ready?'Waiting for car':d.hidden?'Tab hidden':d.focused===false?'Game unfocused':!d.hud?'Waiting for driving HUD':!d.driving?'Waiting for GO':c.menu?'Game menu open':c.suspended||'';
    const live=!paused;
    const blocked=paused||(d.network&&!choices.online?'Online tools paused':'');
    const speed=live && d.nativeTelemetry===true && Number.isFinite(d.speedMps) && d.speedMps>=0 && d.speedMps<=500 ? String(Math.round(d.speedMps*3.6)) : 'Unavailable';
    const mode=!fresh||!d.supported||!d.ready?'Waiting for game':c.drag?'Drag':c.drift?'Drift':d.raceType===0&&d.hud===2?'Free roam':d.raceType===7?'Outrun':d.raceType===1?'Race':'Driving';
    const context=d.supported&&d.ready?(d.network?'Online / LAN':'Solo')+' · '+mode:mode;
    let driver=blocked||'Driver unavailable';
    if(!blocked) {
      if(d.handbackPending||c.switching)driver='AI handoff pending';
      else if(!aiSelected&&d.aiOwned)driver='Releasing native AI';
      else if(aiSelected&&d.aiActive)driver=c.drag?'Native Drag AI active':'Native AI active';
      else if(aiSelected)driver=c.aiAvailable===false?'AI unavailable':c.aiStatus==='failed'?'AI handoff failed':c.aiStatus==='retry'?'AI needs off / on':'AI requested · waiting';
      else if(c.manual||d.driverKind===1)driver='Manual driver';
      else if(d.aiDriverVerified)driver='Native AI · not tool-owned';
      else driver='Driver unavailable';
    }
    const adaptiveRequested=d.adaptiveRaceRequested===true;
    const cityRequested=c.cityPacing===true&&c.roam&&d.network===true&&choices.online===true&&aiSelected&&d.aiActive===true&&d.aiOwned===true;
    const selected=cityRequested||adaptiveRequested|| (c.roam?choices.aiPace:c.race?choices.racePace:false);
    const factor=cityRequested?c.cityPace:adaptiveRequested?d.adaptiveRaceCeiling:c.roam?choices.paceFactor:c.race?choices.racePaceFactor:1;
    let pace=blocked?'Not confirmed':c.paceAvailable===false?'Unavailable on this build':c.drag||c.drift?'Native · custom pace paused':!c.roam&&!c.race?'Unavailable in this mode':!selected?'Native target':Number.isFinite(factor)?factor.toFixed(2)+'× selected':'Unavailable';
    if(live&&!blocked&&c.paceAvailable!==false&&!c.drag&&!c.drift&&(c.roam||c.race)) {
      const target=selected?factor:1;
      if(aiSelected&&Number.isFinite(target)) {
        // An older acknowledgement must not confirm a newly selected factor.
        const confirmed=d.paceConfirmed===true && !c.switching && Number.isFinite(d.paceApplied) && d.paceApplied>=.75 && d.paceApplied<=3 && Math.abs(d.paceApplied-target)<.011;
        pace=target.toFixed(2)+'× req · '+(confirmed?d.paceApplied.toFixed(2)+'× ack':'pending');
      } else if(selected&&Number.isFinite(factor))pace=factor.toFixed(2)+'× selected · AI off';
    }
    if(cityRequested&&!blocked)pace='City '+pace;
    if(adaptiveRequested&&!blocked&&Number.isFinite(factor)){
      const requested=Number.isFinite(d.adaptiveRuntimePace)?d.adaptiveRuntimePace.toFixed(2)+'× req':'pending';
      const reason=d.adaptivePacingState==='native-fallback'?'native pace · corner coverage unknown':d.adaptivePacingState==='coverage-unknown'?'route coverage unknown':d.adaptivePacingState==='clearance-limited'?'clearance slowing':d.adaptiveRaceState==='planner-observed'?'planner observed':'pending';
      pace=`Adaptive ${factor.toFixed(2)}× ceiling · ${requested} · ${reason}`;
    }
    const req=choices.boost?choices.power:1;
    const requested=Number.isFinite(req)?req.toFixed(1)+'× req':'Requested';
    const states={'network-permission':'online paused',unsupported:'unavailable','not-ready':'waiting',hidden:'paused',unfocused:'paused',hud:'waiting','not-driving':'waiting',menu:'paused','drift-change':'waiting',layout:'unavailable',settling:'settling',suspended:'paused','tuner-busy':'tuner busy',neutral:'neutral',changed:'changed',rejected:'rejected'};
    let power=!(choices.boost||choices.unlimit)?'Off':requested+' · '+(blocked?'not confirmed':states[d.powerStatus]||'pending');
    if(!blocked&&d.powerStatus==='applied'&&d.powerActive===true&&Number.isFinite(d.effectivePower)&&d.effectivePower>=1&&d.effectivePower<=3&&Math.abs(d.effectivePower-req)<.011)power=requested+' · '+d.effectivePower.toFixed(1)+'× set';
    const limiter=!choices.unlimit?'':!blocked&&d.powerStatus==='applied'&&d.limiterRemoved===true?' · governor removed':' · governor requested';
    return {governor:limiter?limiter.slice(3):'',speed,unit:speed==='Unavailable'?'':'km/h',context,driver,pace,power,powerTitle:power+limiter+'. Set reports guarded power-field writes, not measured speed or horsepower.',state:paused||(d.network&&!choices.online?'Read-only · network tools paused':'Live observations'),speedTitle:speed==='Unavailable'?(paused||'Speed telemetry is unavailable for this build or car.'):'Native speed sample converted from m/s to km/h. Not a GPS or measured tuning gain.'};
  }
  function renderInfoHud() {
    if(!ui)return;
    const hud=ui.querySelector('#info-hud');
    hud.hidden=!infoHudEnabled||visible||hubOpen||cleanView||streamHudEnabled||rearRadarEnabled||pitwallEnabled;
    ui.querySelector('#info-hud-enable').checked=infoHudEnabled;
    renderStreamHud();
    if(hud.hidden)return;
    const view=infoHudView(infoHudSample,{...prefs,raceOnlyAI},performance.now());
    for(const field of ['speed','unit','context','driver','pace','power','governor','state']) {
      const node=ui.querySelector('#hud-'+field);
      if(node.textContent!==view[field])node.textContent=view[field];
      node.title=field==='speed'?view.speedTitle:field==='power'?view.powerTitle:view[field];
      if(field==='governor')node.hidden=!view.governor;
    }
  }
  function setInfoHud(enabled) {
    infoHudEnabled=!!enabled;
    try {sessionStorage.setItem(HUD_KEY,infoHudEnabled?'1':'0');} catch {}
    renderInfoHud();
  }
  function clearInfoHud(reason='Waiting for live sample') {
    infoHudSample=null;
    streamSession?.observe(null,performance.now());
    radarSample=null;radarAt=-Infinity;radarOwner=null;
    renderInfoHud();
    renderStreamHud(true);
    if(ui&&infoHudEnabled&&!visible)ui.querySelector('#hud-state').textContent=reason;
  }
  function renderPowerStatus(powerStatus,tune={}) {
    if(!ui)return;
    const powerText={off:'Off · not a vehicle-speed multiplier',unsupported:'Unavailable · game build not verified','not-ready':'Waiting for the current car','network-permission':'Paused online · enable Allow network tools',hidden:'Paused · tab hidden',unfocused:'Paused · game unfocused',hud:'Waiting for driving HUD','not-driving':'Waiting for active driving',menu:'Paused · game menu open','drift-change':'Waiting for drift handling change',layout:'Unavailable · car performance layout',settling:'Waiting for stable performance values',suspended:'Paused · waiting for driving tools to resume','tuner-busy':'Paused · tuner is busy',applied:`Power fields set to ${Number(tune.power).toFixed(1)}×${tune.unlimit?' · stock governor set to zero':''}`,neutral:'Neutral · 1.0× power',changed:'Waiting · native tuning/state changed',rejected:'Not applied · performance guard rejected'};
    ui.querySelector('#power-state').textContent=powerText[powerStatus];
    ui.querySelector('#power-state').title=(tune.reason||powerText[powerStatus])+'. This reports guarded field writes, not a measured speed increase.';
  }
  function clearPaceEvidence() {
    clearTargetFeedback();
    // A stop request can precede native handback. Retain native ownership
    // diagnostics, but never present an old acknowledgement as a current one.
    cancelForward();dynamicPacer?.reset();cityPacer?.reset();pacingEvidence=null;
    railsView=newRailsView();renderRails();
    diagnosticState={...diagnosticState,railsWanted:false,railsRequested:false,railsOn:false,railsPins:undefined,railsPaceOnly:false,railsSuspended:false,railsRecoveryTrips:0,skillNine:false,onlineAIAllowed:false};
    diagnosticState={...diagnosticState,...cityEvidence({state:cityPacingEnabled?'paused':'off'}),raceOnlyRequested:false,adaptiveRaceRequested:false,adaptiveRaceState:adaptiveRaceEnabled?'paused':'off',adaptivePacingState:'off',adaptiveRuntimePace:undefined,adaptiveClearanceM:undefined,paceConfirmed:false,paceApplied:undefined};
    clearInfoHud();
    if(ui){
      const raceState=ui.querySelector('#race-only-state');raceState.textContent=raceOnlyAI?'Armed · waiting for current race evidence':'Off · current page only';raceState.title=raceState.textContent;
      ui.querySelector('#adaptive-race-state').textContent=adaptiveRaceEnabled?'Selected · waiting for current planner evidence':'Off · session only';
      if(adaptiveRaceEnabled)ui.querySelector('#race-corner-state').textContent='Adaptive selected · waiting for current planner evidence';
      ui.querySelector('#ai-pace-state').textContent=prefs.aiPace?'Waiting for current AI acknowledgement':'Off · free roam only';
      ui.querySelector('#race-pace-state').textContent=prefs.racePace?'Waiting for current AI acknowledgement':'Off · normal race pace';
    }
  }
  function clearApplicationEvidence(status='suspended') {
    stopRubberband();
    // Reporting only. Actual restoration and native handback remain owned by
    // the existing callers, and are not claimed to have completed here.
    try {
      pauseRaceStats();
      clearPaceEvidence();
      const powerStatus=prefs.boost||prefs.unlimit?status:'off';
      diagnosticState={...diagnosticState,powerStatus,powerActive:false,effectivePower:undefined,limiterRemoved:false};
      renderPowerStatus(powerStatus);
    } catch {}
  }
  function pendingCornerText(state) {
    // Existing read-only evidence only. Stages are the furthest native check
    // reached for this request, not a diagnosis of the latest turn or failure.
    // A missing hit does not prove the road has no qualifying bends.
    if (state.cornerHits > 0) return 'Armed · waiting for current settings confirmation';
    if (state.cornerRouteOwned === true && state.cornerPlannerCorners === 0) return 'Armed · native plan currently has no corner entries';
    if (state.cornerProbeStage === 6) return 'Armed · limiting curve seen; reduction not confirmed';
    if (state.cornerProbeStage === 5) return 'Armed · planner reached; no speed reduction recorded';
    if (state.cornerProbeStage >= 1 && state.cornerProbeStage <= 4) return 'Armed · native corner checks not yet complete';
    return 'Armed · no native corner reduction recorded';
  }
  function cornerEvidenceText(state) {
    const count = value => Number.isInteger(value) && value >= 0 && value <= 40 ? value : 'unknown';
    const stage = Number.isInteger(state.cornerProbeStage) && state.cornerProbeStage >= 0 && state.cornerProbeStage <= 7 ? state.cornerProbeStage : 'unknown';
    const mask = Number.isInteger(state.cornerGuardMask) && state.cornerGuardMask >= 0 && state.cornerGuardMask <= 255 ? state.cornerGuardMask : null;
    const checks = [[1,'command/profile'],[2,'AI ownership'],[4,'game context'],[8,'race state'],[16,'drag/drift exclusion'],[32,'network permission'],[64,'driver identity'],[128,'private route']];
    const sampled = mask === null ? 'unknown' : mask ? checks.filter(([bit]) => mask & bit).map(([,name]) => name).join(', ') : 'none';
    return `Native route points: ${count(state.cornerRouteNodes)}; corner entries: ${count(state.cornerPlannerCorners)}; usable sampled bends: ${count(state.cornerPlannerUsable)}. Furthest native check: ${stage}/7; 7 means a hit exists. Sampled unmet checks: ${sampled}. Counts/checks are snapshots, not a proven cause. Export a short crash log after several turns if no reduction is recorded.`;
  }
  const NativeWorker = window.Worker;
  // Observe only the known game worker; AI validates its patched module separately.
  window.Worker = new Proxy(NativeWorker, {
    construct(Target, args, NewTarget) {
      const worker = Reflect.construct(Target, args, NewTarget);
      let url; try { url = new URL(String(args[0]), location.href); } catch { return worker; }
      if (url.origin !== location.origin || url.pathname !== '/host/game-worker.js') return worker;
      const send = worker.postMessage;
      let bootSession=null;
      const targetReceiver=TargetFeedback?.createReceiver({onReceipt:receipt=>{if(currentSession()&&bootSession.feedback&&moduleProfile?.capabilities.nativeTargetFeedback===true)targetFeedbackState?.receive(receipt);}});
      const observeBoot = function (m,{verified=true,originalMemory=m?.memory}={}) {
        if(m?.mod instanceof WebAssembly.Module&&Number.isSafeInteger(m.slot)&&m.slot===0&&!(originalMemory instanceof WebAssembly.Memory)) {
          nearMissTopUp?.setEnabled(false);
          suspend('Worker memory is not available to page controls.');
          ai=null;wall=null;cars=null;dyno=null;ecu=null;engine=null;activeWorker=null;activeModule=null;moduleProfile=null;statusPtr=0;inputPtr=0;bootSession=null;sessionGeneration++;refreshCompatibility();return;
        }
        if(originalMemory instanceof WebAssembly.Memory&&m.memory!==originalMemory)m={...m,memory:originalMemory};
        if (m && m.mod instanceof WebAssembly.Module && m.memory instanceof WebAssembly.Memory && Number.isSafeInteger(m.slot) && m.slot>=0) {
          if(m.slot===0){
          const verifiedProfile=verified?AI?.getModuleProfile?.(m.mod)||null:null;
          if (!engine || engine.memory !== m.memory || activeModule!==m.mod || activeWorker!==worker || moduleProfile!==verifiedProfile) {
            // Release only the previous verified session before sending the new
            // module to its worker. A reused memory object is not an identity.
            cameraDirector?.reset();clearCameraPulse();
            if(engine&&moduleProfile){try{const state=engine.state();engine.restorePerformance(state);engine.restoreGrip(state);}catch{}}
            forwardDrive?.invalidate();forwardDrive=null;
            stopEcu('Game session changed');ecu=null;
            dyno?.cancel();wall?.stop();cars?.stop();ai?.stop();
            nearMissTopUp?.setEnabled(false);nearMiss?.cancel();nearMiss?.invalidate();
            sessionGeneration++;activeWorker=worker;activeModule=m.mod;moduleProfile=verifiedProfile;refreshCompatibility();
            // A new module/worker/memory generation has no current native
            // observations yet. Do not carry prior application or ownership
            // evidence into its boot event or an immediate diagnostic export.
            diagnosticState={generation:sessionGeneration,revision:moduleProfile?.revision||'unknown',supported,ready:false,driving:false,safe:false,tools:diagnosticTools()};
            clearApplicationEvidence('not-ready');
            diagnosticIdentity=null;
            recordDiagnostic('game-boot',{generation:sessionGeneration,slot:m.slot,memoryMiB:m.memory.buffer.byteLength/1048576,revision:moduleProfile?.revision||'unknown',supported,tools:diagnosticTools()});
            const caps=moduleProfile?.capabilities;
            // Native installation decides online availability; apply the rails default pace once per page.
            enforceSolo();railsWatch=newRailsWatch();railsView=newRailsView();
            if(caps?.nativeRails===true&&!railsDefaultsApplied){railsDefaultsApplied=true;if(railsEnabled&&!rubberbandPercentTouched){rubberbandPercent=RAILS_DEFAULT_PERCENT;syncRubberbandControls();}}
            forwardDrive=caps?.nativeForwardGeometry&&caps?.nativeForwardClamp&&globalThis.__NFSU2_FORWARD_DRIVING__?.Controller?new globalThis.__NFSU2_FORWARD_DRIVING__.Controller(m.memory,{verified:true,installed:true,moduleHash:moduleProfile.hash,moduleIdentity:m.mod,nativeLease:caps.nativeForwardLease===true,runtimeGuard:()=>supported&&moduleProfile?.capabilities.nativeForwardLease===true&&!document.hidden&&document.hasFocus()&&!document.querySelector('dialog[open]')&&!tuningActive()&&!dyno?.busy&&!driftPending&&railsView.on===true}):null;
            rubberband=caps?.nativePacedCatchup&&globalThis.__NFSU2_PACED_CATCHUP_CONTROLLER__?.Controller?new globalThis.__NFSU2_PACED_CATCHUP_CONTROLLER__.Controller(m.memory,{installed:true,verified:true,moduleHash:moduleProfile.hash,moduleIdentity:m.mod}):null;
            nativeCalculatedState={eligible:false,reason:'unsafe'};
            rubberbandSnapshot=rubberband?.status(performance.now())||{state:'unsupported',active:false,resetPending:false};
            diagnosticState={...diagnosticState,...rubberbandEvidence()};renderRubberband();renderRails();
            renderForwardStatus();
            raceCapture?.invalidate('Game session changed');
            raceCapture=caps?.nativeRaceCapture&&globalThis.__NFSU2_RACE_CAPTURE__?.Controller?new globalThis.__NFSU2_RACE_CAPTURE__.Controller(m.memory,true,m.mod):null;updateRaceCapture();
            dyno=caps?.fullTuner && globalThis.__NFSU2_DYNO_FULL__?.Controller?new globalThis.__NFSU2_DYNO_FULL__.Controller(m.memory,true,moduleProfile.revision,{prepared:AI.getNativeEvaluator(m.mod),module:m.mod}):caps?.dyno && globalThis.__NFSU2_DYNO__?.Controller?new globalThis.__NFSU2_DYNO__.Controller(m.memory,true,moduleProfile.revision):null;dyno?.setEnabled(dynoEnabled);
            ecu=caps?.nativeEcuScope===true&&caps?.nativeEcuOrderedReplay===true&&dyno?.full&&globalThis.__NFSU2_ECU_SCOPE__?.Controller?new globalThis.__NFSU2_ECU_SCOPE__.Controller(m.memory,dyno,{hookVerified:true,moduleHash:moduleProfile.hash,prepared:AI.getNativeEvaluator(m.mod)}):null;
            wall=caps?.walls && Walls?.Controller?new Walls.Controller(m.memory,true,moduleProfile.wall):null;
            cars=caps?.cars && Cars?.Controller?new Cars.Controller(m.memory,true,moduleProfile.cars):null;
            ai=AI?.Controller?new AI.Controller(m.memory,!!caps?.ai,caps,{moduleHash:moduleProfile?.hash}):null;
            engine = new Engine(m.memory,moduleProfile?.statusCapacity,moduleProfile?.hash); targetFeedbackState?.reset(); statusPtr = 0; inputPtr = 0; driftPending = null; driftNeedsReapply=typeof prefs.drift==='boolean'; powerGate.reset(); gripGate.reset();
            renderNearMiss();
            installAutonomy();
          }
          }
          targetReceiver?.reset();
          bootSession={module:m.mod,memory:m.memory,generation:activeModule===m.mod&&engine?.memory===m.memory?sessionGeneration:-1,feedback:verified&&AI?.getModuleProfile?.(m.mod)?.capabilities.nativeTargetFeedback===true,slot:m.slot};
        }
      };
      if(workerModuleLoader) {
        try{workerModuleLoader.attach(worker,{onForward:observeBoot});}
        catch(error){aiInstallFailed=true;refreshCompatibility();recordDiagnostic('page-error',{error});}
      } else worker.postMessage=function(m,...rest){observeBoot(m);return Reflect.apply(send,this,[m,...rest]);};
      const currentSession = () => !!bootSession && bootSession.generation===sessionGeneration && bootSession.module===activeModule && bootSession.memory===engine?.memory;
      worker.addEventListener('error', event => {
        if(currentSession())setCameraRotation(false);
        recordDiagnostic('worker-error',{sessionCurrent:currentSession(),error:event.error || event.message,tools:diagnosticTools()});
      });
      worker.addEventListener('message', event => {
        const m = event.data;
        if(bootSession?.feedback&&m?.t==='register'&&m.kind===TargetFeedback?.KIND){
          event.stopImmediatePropagation?.();
          if(currentSession())targetReceiver?.consume(m);
          return;
        }
        if(m?.t==='trap')recordDiagnostic('game-trap',{sessionCurrent:currentSession(),tid:m.tid,error:m.msg,stack:m.stack,tools:diagnosticTools()});
        if(m?.t==='exit')recordDiagnostic('game-exit',{sessionCurrent:currentSession(),code:m.code,tools:diagnosticTools()});
        if(!currentSession())return;
        if(m?.t==='register' && (m.kind===3||m.kind===5))recordDiagnostic('game-register',{kind:m.kind});
        if (worker===activeWorker && m?.t === 'register' && m.kind === 3 && Number.isSafeInteger(m.ptr)) inputPtr = m.ptr;
        if (worker===activeWorker && m?.t === 'register' && m.kind === 5 && Number.isSafeInteger(m.ptr)) statusPtr = m.ptr;
        if (m?.t === 'exit' || m?.t === 'trap') {nearMissTopUp?.setEnabled(false);forwardDrive?.invalidate();forwardDrive=null;raceCapture?.invalidate('Recording stopped · game ended');updateRaceCapture();suspend('Game stopped. Enabled choices are kept for the next game.');ai=null;wall=null;cars=null;dyno=null;ecu=null;engine=null;activeWorker=null;activeModule=null;moduleProfile=null;refreshCompatibility();statusPtr=0;inputPtr=0;renderForwardStatus();}
      });
      return worker;
    }
  });
  // A different game revision must be reviewed before writing its memory.
  void readBuildInfo();

  function key(code, down) {
    const keyName = { ArrowUp: 'ArrowUp', ShiftLeft: 'Shift', AltLeft: 'Alt', KeyC: 'c' }[code] || code;
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: keyName,
      location: /Left$/.test(code) ? 1 : 0, bubbles: true, cancelable: true }));
  }
  function hold(code, down) {
    if (down && !held.has(code)) { if (!physicallyHeld.has(code)) { held.add(code); key(code, true); } }
    else if (!down && held.delete(code) && !physicallyHeld.has(code)) key(code, false);
  }
  function clearCameraPulse(){
    clearTimeout(cameraPulseTimer);cameraPulseTimer=null;
    if(cameraPulseActive){cameraPulseActive=false;if(!physicallyHeld.has('KeyC'))key('KeyC',false);}
  }
  function setCameraRotation(enabled){
    cameraRotationEnabled=enabled===true;cameraDirector?.reset();clearCameraPulse();
    if(ui)ui.querySelector('#camera-rotate-enable').checked=cameraRotationEnabled;
  }
  function updateCameraRotation(state,driveStatus,now,viewBlocked=false){
    const typing=[document.activeElement,ui?.activeElement].some(node=>node&&(node.isContentEditable||node.getAttribute?.('role')==='textbox'||/^(TEXTAREA|SELECT)$/.test(node.tagName)||(node.tagName==='INPUT'&&!/^(button|checkbox|radio|range|submit|reset|color|file|image|hidden)$/.test(String(node.type||'').toLowerCase()))));
    const ready=supported&&state.ready&&state.driving&&(driveStatus===1||driveStatus===2)&&!viewBlocked&&!document.hidden&&document.hasFocus()&&!dyno?.busy&&!visible&&!hubOpen&&!hudEditing&&!typing&&!document.querySelector('dialog[open]')&&!engine.u32(0x838974)&&!physicallyHeld.has('KeyC');
    const decision=cameraDirector?.update({enabled:cameraRotationEnabled,ready,now,identity:`${sessionGeneration}:${state.car}:${driveStatus}`});
    if(!ready){clearCameraPulse();return;}
    if(decision?.due){
      clearCameraPulse();cameraPulseActive=true;key('KeyC',true);
      cameraPulseTimer=setTimeout(()=>clearCameraPulse(),80);
    }
  }
  function release() { clearTimeout(shiftTimer);clearCameraPulse();for (const code of [...held]) hold(code, false); }
  function stopAutonomy(reason='Stopped; manual control') {autonomyStartPending=false;autonomyStartUntil=0;autonomyVisitDrag=false;autonomyCruise=false;autonomyLoop?.stop(reason);autonomySnapshot=autonomyLoop?.status()||null;renderAutonomy();publishAutonomyEvidence();}
  function installAutonomy(){
    stopAutonomy('Game session changed');autonomySelected.clear();autonomySample=null;autonomyCatalogSample=null;autonomyCatalogAt=-Infinity;autonomyNodes.clear();ui?.querySelector('#autonomy-list')?.replaceChildren();
    autonomyObserver=AutonomyHosted?.create?.(engine.memory,{moduleHash:moduleProfile?.hash,verified:true});
    autonomyDrive=AutonomyDrive?.create?.();
    autonomyLoop=autonomyObserver&&autonomyDrive&&AutonomyLoop?.create?AutonomyLoop.create({drive:autonomyDrive,port:{supportsSolo:false,release,join:(tuple,d,s)=>autonomyObserver.join(tuple,d,s),plan:d=>{const graph=AutonomyRoad.capture(engine.memory,{moduleHash:moduleProfile?.hash,verified:supported});return AutonomyRoad.plan(graph,d.marker);}}}):null;
    autonomySnapshot=autonomyLoop?.status()||null;renderAutonomy();
  }
  const autonomyReadLabels=Object.freeze({
    'exact-hosted-profile':'This game build is not supported by the selected loop',
    'shared-memory':'Waiting for shared game memory',bitmap:'Waiting for the verified memory map',
    span:'Race-start data is outside verified memory',uncommitted:'Race-start data is not resident yet',
    'guest-window':'Race-start guest window is not ready','window-changed':'Race-start guest window changed; waiting for a fresh sample',
    'commit-changed':'Race-start memory changed; waiting for a fresh sample','snapshot-changed':'Race-start data changed during the read; retrying',
    'host-snapshot-changed':'Native race-start catalog changed during the read; retrying','memory-changed':'Game memory changed; waiting for a fresh sample',
    'host-span':'Native race-start catalog is unavailable','read-budget':'Race-start data exceeded the verified read limit',
    'city-free-roam':'Return to career free roam to choose race starts','single-player-context':'Waiting for a single local career car',
    'physical-sample':'Waiting for valid car position and heading','lobby-state':'Waiting for a valid native lobby state',
    'lobby-identity':'Waiting for a valid native lobby identity','game-clock-reset':'Game clock restarted; reload the game before retrying',
    clock:'Waiting for a valid observation clock','race-table':'Waiting for a valid native race table','race-membership':'A race-start record does not match the native race table',
    'catalog-context':'Waiting for the career race-start catalog to match this city and stage',
    'career-stage':'Choose a career with a completed prologue before selecting race starts','guided-event':'Finish the guided career event before selecting race starts',
    'catalog-count':'The native race-start count did not pass validation','catalog-generation':'Waiting for the native city race-start sweep to finish',
    'trigger-span':'Waiting for current city race triggers','trigger-chain':'Waiting for a complete native race-trigger chain',
    'trigger-record':'A native race-trigger record did not pass validation','catalog-row':'A native race-start record did not pass validation',
    destination:'A native race-start destination did not pass validation','offer-count':'The native lobby list did not pass validation',
    'read-failed':'Race starts are unavailable; export diagnostics to identify the blocked check'
  });
  function autonomyAvailability(){
    const available=autonomyObserver?.supported===true,active=autonomySnapshot?.active===true,locked=active||autonomyStartPending;
    const fresh=autonomySample?.fresh===true,inRoam=autonomySample?.inRoam===true,age=performance.now()-autonomyCatalogAt,cached=autonomyTransient(autonomySample)&&age>=0&&age<=AUTONOMY_CATALOG_MS&&!!autonomyCatalogSample;
    const rows=fresh&&inRoam&&Array.isArray(autonomySample.catalog)?autonomySample.catalog:cached?autonomyCatalogSample.catalog:[];
    const readReason=!autonomySample?'not-observed':fresh?'none':Object.hasOwn(autonomyReadLabels,autonomySample.reason)?autonomySample.reason:'read-failed';
    const block=!available?'unsupported':active?'active':autonomyStartPending?'starting':!autonomySample?'not-observed':!fresh&&!cached?'read-blocked':!inRoam&&!cached?'not-free-roam':autonomyVisitDrag?(cached?'cached-ready':'discover-ready'):!rows.length?'no-starts':!autonomySelected.size?'choose-starts':cached?'cached-ready':'ready';
    const labels={unsupported:'Selected race loop is unavailable on this game build',starting:'Start requested; waiting for a fresh city catalog and manual handback','not-observed':'Reading native city race starts','read-blocked':autonomyReadLabels[readReason],'not-free-roam':'Return to career free roam to choose race starts','no-starts':'No native race starts are published yet; enter career free roam and wait for the city catalog','choose-starts':'Select one or more race starts below','cached-ready':'Brief catalog refresh; Start will wait for a fresh check','discover-ready':autonomyCruise?'Ready · native AI cruise while finding open Drag lobbies':'Ready · parked wait while finding open Drag lobbies',ready:`Ready · ${autonomySelected.size} race start${autonomySelected.size===1?'':'s'} selected`};
    return{available,active,locked,fresh,inRoam,cached,age,rows,readReason,block,enabled:available&&!locked&&(fresh&&inRoam||cached)&&(autonomyVisitDrag||rows.length>0&&autonomySelected.size>0),label:labels[block]};
  }
  function autonomyEvidence(){
    const a=autonomyAvailability(),loop=autonomySnapshot,drive=autonomyDrive?.status?.(),intent=loop?.intent;
    return{autonomyAvailable:a.available,autonomyCatalogFresh:a.fresh,autonomyInRoam:a.inRoam,autonomyCatalogCached:a.cached,autonomyCatalogAgeMs:a.age>=0&&a.age<=AUTONOMY_CATALOG_MS?a.age:undefined,autonomyStartEnabled:a.enabled,autonomyVisitDrag,autonomyCruiseSelected:autonomyCruise,autonomyCruiseRequested:loop?.active===true&&intent?.cruiseAI===true,autonomyTargetLocked:loop?.targetLocked===true,autonomySelectedCount:autonomySelected.size,autonomyLocationCount:a.rows.length,autonomyOfferCount:Array.isArray(autonomySample?.offers)?autonomySample.offers.length:0,autonomyBlockReason:a.block,autonomyReadReason:a.readReason,
      autonomyActive:loop?.active===true,autonomyStartPending,autonomyJoinPending:loop?.pending===true,autonomyPhase:loop?.phase||'off',autonomyReasonCode:loop?.reasonCode||'not-reported',autonomyDrivePhase:drive?.phase||'off',autonomyWaypointIndex:drive?.index,autonomyWaypointCount:drive?.count,autonomyCompletedTrips:loop?.completedTrips,autonomyRequestRaceAI:loop?.active===true&&intent?.raceAI===true,autonomyRequestCruiseAI:loop?.active===true&&intent?.cruiseAI===true,autonomyTravelKeyRequest:loop?.active===true&&Array.isArray(intent?.keys)&&intent.keys.length>0,autonomyPauseReason:loop?.pauseReason,autonomyPauseRemainingMs:loop?.pauseRemainingMs,autonomyResumePhase:loop?.resumePhase};
  }
  function publishAutonomyEvidence(){
    const evidence=autonomyEvidence();diagnosticState={...diagnosticState,...evidence};
    const key=JSON.stringify([evidence.autonomyActive,evidence.autonomyStartPending,evidence.autonomyJoinPending,evidence.autonomyPhase,evidence.autonomyReasonCode,evidence.autonomyDrivePhase,evidence.autonomyPauseReason,evidence.autonomyResumePhase,evidence.autonomyRequestRaceAI,evidence.autonomyRequestCruiseAI]);
    if(key!==autonomyDiagnosticTransition){autonomyDiagnosticTransition=key;recordDiagnostic('autonomy-state',evidence);}
    return evidence;
  }
  const isRunway15=d=>d?.track===4222&&d.reverse===0&&d.rawType===4&&Number.isInteger(d.raceFlavor)&&d.raceFlavor>=0&&d.raceFlavor<=255&&d.raceFlavor!==2;
  function runway15Choice(a=autonomyAvailability()){
    if(!a.available)return{reason:'Runway 15 selection is unavailable on this game build.'};
    if(!a.fresh||!a.inRoam)return{reason:'Runway 15 selection needs fresh city race starts in free roam.'};
    const matches=a.rows.filter(isRunway15);
    if(matches.length!==1)return{reason:matches.length?'Multiple normal Runway 15 starts are published; choose the exact start below.':'Runway 15 is not available in the current city catalog.'};
    return{destination:matches[0],reason:'Select normal Runway 15 only; wait there for an open lobby, race, return and repeat.'};
  }
  function runway15Selected(a=autonomyAvailability()){
    if(autonomySelected.size!==1||autonomyVisitDrag||autonomyCruise)return false;
    const selected=a.rows.find(d=>autonomySelected.has(d.key))||autonomySnapshot?.current;
    const absence=autonomySnapshot?.active?autonomySnapshot.options?.absence:ui?.querySelector('#autonomy-absence')?.value;
    return isRunway15(selected)&&autonomySelected.has(selected.key)&&absence==='wait';
  }
  function renderAutonomy(){
    if(!ui?.querySelector('#autonomy-state'))return;
    const a=autonomyAvailability(),{active,locked,rows}=a,coherentCatalog=a.fresh&&a.inRoam&&Array.isArray(autonomySample?.catalog);
    ui.querySelector('#autonomy-stop').disabled=!active&&!autonomyStartPending&&!autonomyVisitDrag;
    const discovery=ui.querySelector('#autonomy-drag-discovery');discovery.checked=autonomyVisitDrag;discovery.disabled=locked;
    const cruise=ui.querySelector('#autonomy-cruise');cruise.checked=autonomyCruise;cruise.disabled=locked||!autonomyVisitDrag;
    const runway=runway15Choice(a),runwayButton=ui.querySelector('#autonomy-runway15');
    runwayButton.disabled=locked||!runway.destination;runwayButton.title=locked?'Stop the current loop before changing its selection.':runway.reason;
    const list=ui.querySelector('#autonomy-list'),liveKeys=new Set(rows.map(d=>d.key));
    for(const[key,row]of autonomyNodes)if(coherentCatalog&&!liveKeys.has(key)&&!locked){row.node.remove();autonomyNodes.delete(key);autonomySelected.delete(key);}
    for(const d of rows){let row=autonomyNodes.get(d.key);if(!row){const node=document.createElement('label'),check=document.createElement('input'),text=document.createElement('span');node.className='row';check.type='checkbox';check.addEventListener('change',()=>{if(autonomySnapshot?.active||autonomyStartPending)return;if(check.checked){if(autonomySelected.size<16)autonomySelected.add(d.key);}else autonomySelected.delete(d.key);renderAutonomy();});node.append(text,check);list.append(node);row={node,check,text};autonomyNodes.set(d.key,row);}row.text.textContent=d.label+' · '+d.markerHash.toString(16).padStart(8,'0');}
    for(const[key,row]of autonomyNodes){row.check.checked=autonomySelected.has(key);row.check.disabled=locked;}
    const current=autonomyAvailability(),state=ui.querySelector('#autonomy-state');state.textContent=active?`${autonomySnapshot.reason}${autonomySnapshot.targetLocked||!autonomySnapshot.selected?'':` · ${autonomySnapshot.index+1}/${autonomySnapshot.selected} · rounds ${autonomySnapshot.round}`}`:['ready','cached-ready','discover-ready'].includes(current.block)&&autonomySnapshot?.phase==='stopped'?`Stopped · ${autonomySnapshot.reason}`:current.label;state.title=state.textContent;
    const runwayOnly=runway15Selected(current);
    ui.querySelector('#autonomy-runway15-help').textContent=runwayOnly?(active?'Runway 15 only · wait at the start for an open lobby, race, return and repeat.':'Runway 15 selected · wait at the start for an open lobby, race, return and repeat. Press Start selected loop.'):runway.reason;
    if(runwayOnly){state.textContent=active&&autonomySnapshot.phase==='waiting'?'Waiting here for an open Runway 15 lobby · race, return and repeat':'Runway 15 · '+state.textContent;state.title=state.textContent;}
    const start=ui.querySelector('#autonomy-start');start.disabled=!current.enabled;start.textContent=autonomyVisitDrag?'Start loop / Drag discovery':'Start selected loop';start.title=current.enabled?'Start travel through selected locations and any enabled Drag discovery':current.label||'Selected loop is active';
  }
  function updateAutonomy(s,driveStatus,safe){
    if(!autonomyObserver||!autonomyLoop){publishAutonomyEvidence();return false;}
    const old=ai?.status?.()||{},kind=s.ready?engine.u32(s.car+0x24):0,raceType=engine.u32(0x89e7b0);
    const context={network:s.network===true,allowNetwork:prefs.online,focused:document.hasFocus(),hidden:document.hidden,manualInput:['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','Space'].some(code=>physicallyHeld.has(code)),tunerBusy:tuningActive(),menu:visible||hubOpen||hudEditing||!!document.querySelector('dialog[open]'),standaloneAI:prefs.ai===true,manual:old.manual===true,aiOwned:old.owned===true,handbackPending:ai?.handbackPending===true,driverActive:old.active===true&&old.owned===true,kind,safe,raceActive:safe&&driveStatus===1&&raceType===1,raceResults:driveStatus===0&&raceType===1};
    autonomySample=autonomyObserver.observe(context);
    if(autonomySample.fresh===true){if(autonomySample.inRoam===true&&Array.isArray(autonomySample.catalog)){autonomyCatalogSample={catalog:JSON.parse(JSON.stringify(autonomySample.catalog))};autonomyCatalogAt=performance.now();}else{autonomyCatalogSample=null;autonomyCatalogAt=-Infinity;}}
    if(autonomyStartPending){
      const fresh=autonomySample.fresh===true&&autonomySample.inRoam===true&&Array.isArray(autonomySample.catalog);
      if(!safe||context.manualInput||context.tunerBusy||context.menu||context.hidden||!context.focused){stopAutonomy('Start interrupted; manual control');message('Start interrupted; manual control');}
      else if(!Number.isFinite(performance.now())||performance.now()<autonomyStartUntil-AUTONOMY_START_MS||performance.now()>autonomyStartUntil){stopAutonomy('Start could not obtain a fresh city catalog');message('Start could not obtain a fresh city catalog. Export diagnostics to identify the blocked check.');}
      else if(fresh){
        autonomyStartPending=false;autonomyStartUntil=0;const rows=autonomySample.catalog.filter(d=>autonomySelected.has(d.key));
        if(rows.length!==autonomySelected.size||!autonomyLoop.choose(rows)){stopAutonomy('Selected race start changed; select again');message('Selected race start changed; select again');}
        else{const wait=Number(ui?.querySelector('#autonomy-wait')?.value||60)*1000,absence=ui?.querySelector('#autonomy-absence')?.value||'wait';if(!autonomyLoop.start(autonomySample,{absence,waitMs:wait,soloFallback:false,visitDrag:autonomyVisitDrag,cruise:autonomyCruise}))message(autonomyLoop.status().reason);}
      }else if(!autonomyTransient(autonomySample)){stopAutonomy('Start could not obtain a fresh city catalog');message('Start could not obtain a fresh city catalog. Export diagnostics to identify the blocked check.');}
    }
    const wasActive=autonomySnapshot?.active===true;autonomySnapshot=autonomyLoop.poll(autonomySample,context);if(wasActive&&!autonomySnapshot.active){autonomyVisitDrag=false;autonomyCruise=false;}renderAutonomy();publishAutonomyEvidence();return autonomySnapshot.active&&(autonomySnapshot.intent.raceAI===true||autonomySnapshot.intent.cruiseAI===true);
  }
  function publishAutonomyInput(aiState){
    if(!autonomySnapshot?.active||autonomySnapshot.intent.raceAI||autonomySnapshot.intent.cruiseAI)return;
    const keys=aiState.manual===true&&!aiState.owned&&!ai?.handbackPending?autonomySnapshot.intent.keys:[];
    for(const code of['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'])hold(code,keys.includes(code));
  }
  function suspend(why,{keepEcu=false}={}) {
    nearMissTopUp?.pause();nearMiss?.cancel();renderNearMiss();
    if(!keepEcu)stopEcu(why||'Tools paused');
    stopAutonomy(why||'Tools paused');
    cameraDirector?.reset();
    stopRubberband();
    cancelForward();
    raceCapture?.stop('Recording stopped · tools paused');updateRaceCapture();
    dyno?.cancel();
    wall?.stop();cars?.stop(); ai?.stop(); release(); powerGate.reset(); gripGate.reset();
    try {if(engine){const state=engine.state();engine.restorePerformance(state);engine.restoreGrip(state);}} catch { /* no stale pointer writes */ }
    clearApplicationEvidence();
    if(why) message(why);
  }
  function stop(why = 'Driving controls off. F9 cleared driving assists and network permission. Saved profiles are kept. Load one manually, or select it and enable Load on startup to resume.', persistProfilePause=true) {
    nearMissTopUp?.setEnabled(false);renderNearMiss();
    setCameraRotation(false);
    stopRubberband(true);
    raceCapture?.stop('Recording stopped · Stop pressed');updateRaceCapture();
    profileStartup=null;loadedProfile=null;profileActionEpoch++;profileActionPending=false;if(profileDriftChoice)driftNeedsReapply=false;profileDriftChoice=false;
    // Keep an already-issued drift request pending until confirmation/timeout: a
    // native toggle cannot be recalled safely, and a second must not overlap it.
    if(persistProfilePause){
      profileSessionStopped=true;
      try{sessionStorage.setItem(PROFILE_SESSION_STOP,'1');}catch{}
      const result=profileStore?.pause();
      profileNotice=result?.error||'Automatic loading paused by Stop. Select a profile and enable Load on startup to resume.';
      renderProfiles();
    }
    recordDiagnostic('stop',{tools:diagnosticTools()});
    clearRaceOnlyAI();
    dynoEnabled=false;dyno?.setEnabled(false);if(ui)ui.querySelector('#dyno-enable').checked=false;
    adaptiveRaceEnabled=false;if(ui)ui.querySelector('#adaptive-race').checked=false;clearCityPace();clearRivalNoClip();stopRubberband(true);
    prefs.raceCornerAssist=false;prefs.cornerAssist=false;prefs.racePace=false;prefs.walls=false;prefs.cars=false;prefs.traffic=false;prefs.players=false;prefs.online=false;prefs.ai=false;prefs.aiPace=false;prefs.dragNoBlowout=false;prefs.drag=false;prefs.boost=false;prefs.unlimit=false;prefs.grip=false;savePrefs();suspend();
    if(ui) for(const id of ['race-corner-assist','corner-assist','race-pace','walls','cars','traffic','players','online','ai','ai-pace','drag-no-blowout','drag','boost','unlimit','grip']) ui.querySelector('#'+id).checked=false;
    message(profileNotice&&persistProfilePause ? why+' '+profileNotice : why);
  }
  function clearRaceOnlyAI() {
    raceOnlyAI=false;
    if(ui){ui.querySelector('#race-only-ai').checked=false;ui.querySelector('#race-only-state').textContent='Off · current page only';}
  }
  function setRaceOnlyAI(enabled) {
    stopAutonomy('Race-only driver selected');
    raceOnlyAI=enabled===true;
    if(raceOnlyAI){prefs.ai=false;if(ui)ui.querySelector('#ai').checked=false;}
    ai?.stop();release();clearPaceEvidence();savePrefs();
    if(ui){ui.querySelector('#race-only-ai').checked=raceOnlyAI;ui.querySelector('#race-only-state').textContent=raceOnlyAI?'Armed · waiting for an eligible race':'Off · current page only';}
    message(raceOnlyAI?'Race-only AI armed on this page. Start or join races yourself. It waits for GO, releases in free roam/results, and needs online permission. F7/F9 or driving keys during a race disarm it. Reload or profile Load turns it off.':'Race-only AI off. Native handback may complete on the next game frame.');
  }
  function raceOnlyRaceContext() {
    // Manual driving in free roam should not cancel arming for the next race.
    // Read the current context so an old sample cannot ignore race takeover.
    if(!supported||!engine||!statusPtr)return false;
    try {const state=engine.state(),hud=engine.status(statusPtr)?.drive;return !!state.ready&&Number.isFinite(hud)&&(hud&3)===1&&engine.u32(0x89e7b0)===1;}catch{return false;}
  }
  function takeControl() {
    nearMissTopUp?.setEnabled(false);renderNearMiss();
    stopEcu('Manual control');
    stopAutonomy('Manual control');
    setCameraRotation(false);
    stopRubberband(true);
    cancelForward();
    pauseRaceStats();
    raceCapture?.stop('Recording stopped · manual control');updateRaceCapture();
    recordDiagnostic('manual',{tools:diagnosticTools()});
    clearRaceOnlyAI();
    prefs.ai=false; ai?.stop(); dragTakenOver=true; release(); savePrefs();
    try {clearPaceEvidence();} catch {}
    if(ui) {ui.querySelector('#ai').checked=false;ui.querySelector('#ai-state').textContent='Manual control · native AI off';}
    message('Returning control to you. Native AI is off on the next game frame. Toggle drag assist again if you want assisted throttle.');
  }
  window.addEventListener('keydown', e => {
    if (!e.isTrusted) return;
    if(e.code==='Insert' && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey){
      // Shift+Insert remains Paste in text/editable controls, including controls
      // inside a shadow root. Otherwise it toggles all extension chrome.
      const path=e.composedPath?.()||[e.target];
      const editingNode=node=>{
        for(let depth=0;node&&depth<32;depth++,node=node.parentElement){
          if(node.isContentEditable || node.getAttribute?.('role')==='textbox' || /^(TEXTAREA|SELECT)$/.test(node.tagName) || (node.tagName==='INPUT' && !/^(button|checkbox|radio|range|submit|reset|color|file|image|hidden)$/.test(String(node.type||'').toLowerCase())))return true;
        }
        return false;
      };
      // Window's composedPath hides our closed shadow tree. Its retained
      // activeElement is required to preserve Paste in the profile-name field.
      const editing=[...path,ui?.activeElement,document.activeElement].some(editingNode);
      if(e.isComposing || e.defaultPrevented || editing)return;
      e.preventDefault();if(!e.repeat)setCleanView(!cleanView);return;
    }
    // Range controls keep their native arrow/Space behavior without taking over the car.
    if(host && e.composedPath?.().includes(host) && !['F6','F7','F8','F9','Escape'].includes(e.code)) return;
    if(e.code==='F6'){e.preventDefault();if(!e.repeat)setInfoHud(!infoHudEnabled);return;}
    physicallyHeld.add(e.code);
    if(e.code==='KeyC'){cameraDirector?.reset();clearCameraPulse();}
    if(e.code==='F7') {e.preventDefault();takeControl();}
    else if((prefs.ai || autonomySnapshot?.active || autonomyStartPending || autonomyVisitDrag || (raceOnlyAI && raceOnlyRaceContext())) && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','Space'].includes(e.code)) takeControl();
    if (e.code === 'F8') { e.preventDefault();if(cleanView){setCleanView(false);setPanel(true);}else setPanel(!visible); }
    if (e.code === 'Escape') {if(hubOpen)setRaceHub(false);if(visible)setPanel(false);}
    if (e.code === 'F9') { e.preventDefault(); stop(); }
  }, true);
  window.addEventListener('keyup', e => { if (e.isTrusted) physicallyHeld.delete(e.code); }, true);
  window.addEventListener('focus', () => recordDiagnostic('resume',{reason:'blur',tools:diagnosticTools()}));
  window.addEventListener('blur', () => { recordDiagnostic('pause',{reason:'blur',tools:diagnosticTools()}); physicallyHeld.clear(); suspend('Paused while unfocused. Enabled tools resume when you return to a supported driving mode.'); });
  document.addEventListener('visibilitychange', () => { recordDiagnostic(document.hidden?'pause':'resume',{reason:'hidden',hidden:document.hidden,tools:diagnosticTools()}); if (document.hidden) suspend('Paused while the tab is hidden. Your enabled choices are kept.'); });
  window.addEventListener('storage',event=>{
    if(!ToolProfiles||![null,ToolProfiles.KEY,ToolProfiles.STOP_KEY].includes(event.key))return;
    const after=profileStore.refresh();
    const changed=loadedProfile&&!after.data.profiles.some(p=>p.id===loadedProfile.id&&p.revision===loadedProfile.revision);
    if(event.key===null||event.key===ToolProfiles.STOP_KEY||!after.available||changed){
      stop('Profile storage or Stop changed in another tab. Current driving controls are off. Load a profile explicitly to resume.',false);
      profileSessionStopped=true;try{sessionStorage.setItem(PROFILE_SESSION_STOP,'1');}catch{}
    }
    profileSelection=null;profileNotice=after.error||'Profiles updated in another tab. Select a profile again; nothing was automatically loaded.';renderProfiles();
  });
  window.addEventListener('pageshow',event=>{
    if(!event.persisted)return;
    // A BFCache page must recheck durable Stop and profile permissions before it
    // resumes. Do not auto-reload a profile or revive a retained controller.
    stop('Page restored. Driving controls remain off; load a profile explicitly to resume.',false);
    profileStore?.refresh();profileSelection=null;profileNotice='Page restored with controls off. Select and Load a profile to resume.';renderProfiles();
    clearInterval(timer);timer=setInterval(tick,50);
  });
  window.addEventListener('pagehide', () => { recordDiagnostic('page-hide',{reason:'page-hide',tools:diagnosticTools()});savePrefs(); suspend(); clearInterval(timer); });

  function setDrift(wanted) {
    if (driftPending) return false;
    const state = engine?.state(), counters = engine && statusPtr ? engine.status(statusPtr) : null;
    if (!supported || !state?.ready || !state.driving || state.network || !counters || (counters.drive & 3) !== 2 || !Number.isFinite(counters.drift) || document.hidden || document.querySelector('dialog[open]')) {
      message('Drift assist only works while driving solo free roam with the game menus closed.'); return false;
    }
    if (!!(counters.drift & 1) === wanted) return true;
    // Rebuilding the native drift setup must not inherit our power multiplier.
    engine.restorePerformance(state);engine.restoreGrip(state);powerGate.reset();gripGate.reset();
    if (!engine.driftTap(inputPtr)) { message('Drift request not sent: the game input mailbox is unavailable, inactive, typing, or full.'); return false; }
    driftPending = { wanted, until: performance.now() + 3000 };
    ui.querySelector('#drift').disabled = true;
    message('Drift request sent. Waiting for the game to confirm its handling state…');
    return true;
  }
  function moduleFailure() {
    if(aiInstallFailed)return 'Native loader could not initialize. Memory tools stay disabled. Reload the page before retrying.';
    const patch=AI?.patchState;
    if(moduleProfile || patch?.phase!=='unavailable')return '';
    const reported=/^[a-f0-9]{8,40}$/.test(revision)?` Site reports build ${revision}.`:'';
    const bytes=Number.isSafeInteger(patch.moduleBytes)?` Loaded module: ${patch.moduleBytes} bytes.`:'';
    const signatures=Number.isInteger(patch.signatureUnique)?` Fingerprints: ${patch.signatureUnique}/${patch.signatureTotal} unique matches; this does not approve an unknown build.`:'';
    return ['module-size','module-hash'].includes(patch.patchCode)
      ? `Game module is not verified.${reported}${bytes} A compatible Driving Tools update is required.${signatures}`
      : `Game module could not be prepared.${reported} Reload once. If it persists, export the diagnostic log.`;
  }
  function tick() {
    let diagnosticReadFailure=0;
    nearMissTopUp?.poll();nearMiss?.poll();renderNearMiss();
    if(raceCapture){try{if(document.hidden||!document.hasFocus()||tuningActive())raceCapture.stop('Recording stopped · tools paused');else raceCapture.poll();}catch{raceCapture.stop('Recording stopped · capture unavailable');}updateRaceCapture();}
    try {
      const patch=AI?.patchState,phase=patch?.phase || 'idle';
      const key=JSON.stringify([phase,patch?.revision,patch?.moduleBytes,patch?.moduleHash,patch?.patchCode,patch?.signatureReference,patch?.signatureUnique,patch?.signatureFailed,patch?.nativeForwardGeometry,patch?.nativeForwardClamp,patch?.forwardUnavailable,revision]);
      if(key!==diagnosticPatch){diagnosticPatch=key;recordDiagnostic('patch-state',{phase,revision:patch?.revision,reportedRevision:revision,candidateRevision:patch?.candidateRevision,moduleBytes:patch?.moduleBytes,moduleHash:patch?.moduleHash,patchCode:patch?.patchCode,signatureReference:patch?.signatureReference,signatureExact:patch?.signatureExact,signatureTotal:patch?.signatureTotal,signatureUnique:patch?.signatureUnique,signatureMissing:patch?.signatureMissing,signatureAmbiguous:patch?.signatureAmbiguous,signatureFailed:patch?.signatureFailed,nativeForwardGeometry:patch?.nativeForwardGeometry,nativeForwardClamp:patch?.nativeForwardClamp,forwardUnavailable:patch?.forwardUnavailable,error:phase==='unavailable'?patch?.reason:undefined});}
      if(ui){const status=diagnostics?.status();ui.querySelector('#diagnostic-state').textContent=status?`${status.events} recent events · ${status.traceSamples||0} driving trace samples · ${status.persistence==='same-tab'?'kept across reloads in this tab':'memory only; storage unavailable'}`:'Logger unavailable';if(status&&Number.isInteger(patch?.signatureUnique))ui.querySelector('#diagnostic-state').textContent+=` · fingerprints ${patch.signatureUnique}/${patch.signatureTotal}`;}
    } catch {}
    updateDynoUI();
    if(tuningActive()) {stopAutonomy('Tuner activity');clearApplicationEvidence('tuner-busy');clearInfoHud('Tuner busy · driving tools paused');traceDiagnostic({generation:sessionGeneration,revision,supported,dynoBusy:true,safe:false},1,1);try{diagnostics?.snapshot({...diagnosticState,dynoBusy:true,tools:diagnosticTools()});}catch{} wall?.stop();cars?.stop();ai?.stop();release();return;}
    if (!engine) { clearApplicationEvidence('not-ready');traceDiagnostic({generation:sessionGeneration,revision,supported,ready:false,driving:false,safe:false},1,1);if (live) live.textContent = 'Waiting for game. Reload after installing, then press Play.'; return; }
    try {
      enforceSolo();
      diagnosticState={generation:sessionGeneration,revision:moduleProfile?.revision||revision,supported,tools:diagnosticTools()};
      const s = engine.state(), counters = statusPtr ? engine.status(statusPtr) : null;
      dragRace=!!(s.ready && s.drag);
      const driveStatus = counters && Number.isFinite(counters.drive) ? counters.drive & 3 : 0;
      const canInput = supported && s.ready && (!s.network || prefs.online) && driveStatus !== 0 && !document.hidden && document.hasFocus() && !document.querySelector('dialog[open]');
      const safe = canInput && s.driving;
      // Record identity changes as booleans, never addresses or save/player identifiers.
      try {
      const identity={player:engine.u32(0xd00000),car:s.car,race:s.race};
      diagnosticState={generation:sessionGeneration,revision,supported,nativeRubberband:moduleProfile?.capabilities.nativeRubberband===true,nativeCornerTarget:moduleProfile?.capabilities.nativeCornerTarget===true,nativePacedCatchup:moduleProfile?.capabilities.nativePacedCatchup===true,ready:!!s.ready,driving:!!s.driving,network:!!s.network,safe:!!safe,hidden:document.hidden,focused:document.hasFocus(),hud:driveStatus,flow:engine.u32(0x8654a4),gameTicks:engine.u32(0x86518c),raceType:engine.u32(0x89e7b0),racePhase:s.ready?engine.u32(s.race):0,driverKind:s.ready?engine.u32(s.car+0x24):0,physicsKind:s.ready?engine.u32(s.car+0x28):0,dynoBusy:!!dyno?.busy,dynoFullTuner:moduleProfile?.capabilities.fullTuner===true,dynoSecondWindowCapture:moduleProfile?.capabilities.tunerSecondGuestWindow===true,dynoCurrentClamp:moduleProfile?.capabilities.tunerCurrentNativeClamp===true,tools:diagnosticTools()};
      if(diagnosticIdentity && Object.keys(identity).some(key=>identity[key]!==diagnosticIdentity[key]))recordDiagnostic('identity-change',{playerChanged:identity.player!==diagnosticIdentity.player,carChanged:identity.car!==diagnosticIdentity.car,raceChanged:identity.race!==diagnosticIdentity.race});
      diagnosticIdentity=identity;
      } catch { diagnosticReadFailure=1; }
      const nativeRaceType=s.ready?engine.u32(0x89e7b0):null;
      const roamProfile=!dragRace && driveStatus===2 && nativeRaceType===0;
      const raceProfile=!dragRace && (nativeRaceType===1 || nativeRaceType===7);
      const roadRaceProfile=(!s.network || prefs.online) && !dragRace && driveStatus===1 && nativeRaceType===1 && !engine.u8(0x89e7d8) && !engine.u8(0x89e7d9) && !engine.u32(0x890108) && !engine.u32(0x890104) && !engine.u32(0x890114);
      const nativeDriftPace=moduleProfile?.capabilities.nativeDriftPace===true && !dragRace && !engine.u32(0x890108) && !!(engine.u8(0x89e7d9)||engine.u32(0x890104)||engine.u32(0x890114));
      const raceOnlyInputClear=!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','Space'].some(code=>physicallyHeld.has(code));
      const raceOnlyEligible=!!(safe && raceOnlyInputClear && driveStatus===1 && nativeRaceType===1 && moduleProfile?.capabilities.ai===true && (!dragRace||moduleProfile?.capabilities.dragAI===true));
      const raceOnlyRequested=raceOnlyAI && raceOnlyEligible;
      const autonomyNativeRequested=updateAutonomy(s,driveStatus,safe);
      const autonomyCruiseRequested=autonomySnapshot?.active===true&&autonomySnapshot?.intent.cruiseAI===true;
      const autonomyTravel=autonomySnapshot?.active===true&&!autonomyNativeRequested;
      const aiRequested=autonomySnapshot?.active?autonomyNativeRequested:prefs.ai || raceOnlyRequested;
      const streetX=!!(engine.u8(0x89e7e3)||engine.u32(0x89010c)||(s.network&&engine.u32(0x850088)===10));
      // 0.42 rails. railsWanted: this is a rails race. railsRace: the pin is requested right now (the watchdog can
      // release it). railsPaceOnly: no paired power/grip boost for the whole rails race, released or not, because
      // that boost on simplified physics is far too strong. Drag keeps the paired boost on full physics.
      const onlineRaceAllowed=s.network!==true||(prefs.online===true&&moduleProfile?.capabilities.nativeOnlineAI===true);
      const railsWanted=moduleProfile?.capabilities.nativeRails===true&&railsEnabled&&supported&&onlineRaceAllowed&&roadRaceProfile;
      // Recovery rebuilds the driver. Count releases for the race, not for that replaceable driver.
      const railsRaceIdentity=[sessionGeneration,engine.u32(0xd00000),s.car,s.race,engine.u32(0x89e7a0),engine.u32(0x89e7b4),s.network===true,engine.u32(0x850088)].join(':');
      // A missing HUD or withdrawn permission is not a new race. Preserve the
      // release allowance until native race completion, identity change or explicit toggle.
      if(railsWatch.identity&&(railsWatch.identity!==railsRaceIdentity||engine.u32(s.race)!==4))railsWatch=newRailsWatch();
      const railsRace=railsWanted&&!railsWatch.suspended;
      const railsPaceOnly=railsWanted&&rubberbandEnabled;
      const rubberbandRoad=rubberbandEnabled&&!!rubberband&&supported&&moduleProfile?.capabilities.nativePacedCatchup===true&&roadRaceProfile&&!streetX&&onlineRaceAllowed;
      // Drag and unpinned Street X use strength at neutral pace; online needs the native mode adapter.
      const godlyExtra=rubberbandEnabled&&!!rubberband&&supported&&moduleProfile?.capabilities.nativePacedCatchup===true&&moduleProfile?.capabilities.godlyModes===true&&!!aiRequested&&(!!dragRace||!!engine.u32(0x890108)||(!!streetX&&!railsWanted))&&onlineRaceAllowed;
      const adaptive=adaptiveRaceSettings({enabled:adaptiveRaceEnabled||rubberbandRoad,ceiling:rubberbandRoad?rubberbandPercent/100:adaptiveRaceCeiling,verified:!!dynamicPacer&&supported&&moduleProfile?.capabilities.nativeDragInputHandoff===true&&moduleProfile?.capabilities.corner===true&&moduleProfile?.capabilities.pace===true,ai:aiRequested,safe,network:s.network,allowNetwork:prefs.online,hud:driveStatus,raceType:nativeRaceType,drag:dragRace||!!engine.u32(0x890108),drift:!!(engine.u8(0x89e7d9)||engine.u32(0x890104)||engine.u32(0x890114)),streetX});
      const rubberbandOwnsPace=rubberbandRoad&&adaptive.requested;
      // Street X rails use speed targets only, even with paired handling switched off.
      // Keep legacy multipliers parked through watchdog recovery and native handback.
      const streetXRailsOwner=railsWanted&&streetX&&typeof ai?.status==='function'?ai.status():null;
      const streetXRailsOwnsPhysics=railsWanted&&streetX&&(!!aiRequested||!!ai?.handbackPending||streetXRailsOwner?.owned===true||streetXRailsOwner?.active===true);
      // Native Drift calculates its own throttle/brake targets on full physics.
      // Keep legacy engine/limiter overrides neutral through takeover and handback;
      // saved manual-driving preferences resume after native ownership is released.
      const driftOwner=nativeDriftPace&&typeof ai?.status==='function'?ai.status():null;
      const nativeDriftOwnsPhysics=nativeDriftPace&&(!!aiRequested||!!ai?.handbackPending||driftOwner?.owned===true||driftOwner?.active===true);
      const parkLegacyPhysics=autonomyTravel||rubberbandOwnsPace||godlyExtra||streetXRailsOwnsPhysics||nativeDriftOwnsPhysics||rubberbandSnapshot.resetPending===true||rubberbandSnapshot.commandEnabled===true||rubberbandSnapshot.active===true;
      if(parkLegacyPhysics){engine.restorePerformance(s);engine.restoreGrip(s);powerGate.reset();gripGate.reset();}
      const pacingIdentity=[sessionGeneration,s.car,s.race,engine.u32(s.car+0x2c),engine.u32(0x89e7a0),engine.u32(0x89e7b4)].join(':');
      let nativeSample;
      try { nativeSample=engine.nativeDiagnostics(s,supported&&moduleProfile?.capabilities.driftDiagnostics===true); }
      catch(error) { diagnosticReadFailure=1;throw error; }
      if(rearRadarEnabled){
        const radarReady=supported&&s.ready&&s.driving&&!document.hidden&&document.hasFocus()&&!document.querySelector('dialog[open]')&&!dyno?.busy&&!driftPending;
        const owner=pacingIdentity+':'+engine.u32(0xd00000);
        if(!radarReady){radarSample=null;radarAt=-Infinity;radarOwner=null;if(ui)StreamHud?.renderRadar(ui,null);}
        else if(owner!==radarOwner||performance.now()<radarAt||performance.now()-radarAt>=100){const changed=owner!==radarOwner;radarSample=RearRadar?.observe(engine,s,{verified:supported,moduleHash:moduleProfile?.hash,range:radarRange})||null;radarAt=performance.now();radarOwner=owner;if(changed&&ui)StreamHud?.renderRadar(ui,radarSample);}
      }
      const currentPacingEvidence=adaptive.requested&&typeof ai?.status==='function'?ai.status():pacingEvidence?.identity===pacingIdentity?pacingEvidence.state:{};
      const pacing=dynamicPacer?.update({enabled:adaptive.requested,ceiling:adaptive.ceiling,identity:pacingIdentity,now:performance.now(),evidence:currentPacingEvidence,speedMps:nativeSample.speedMps,hazards:adaptive.requested?engine.pacingHazards(s,supported,prefs.online):null,brakingMps2:4*prefs.raceBraking,nativeFallback:true})||{active:false,state:'off',pace:null};
      const configuredPace=adaptive.requested?adaptive.ceiling:nativeDriftPace?1:roamProfile && prefs.aiPace?prefs.paceFactor:raceProfile && prefs.racePace?prefs.racePaceFactor:railsPaceOnly&&streetX?rubberbandPercent/100:1;
      // The shared custom factor must not bypass Street X's rails ceiling or disagree
      // with the neutral pace required by its full-physics handling publication.
      const streetXPacePolicy=streetX&&roadRaceProfile&&(railsWanted||godlyExtra);
      const selectedPace=streetXPacePolicy?(railsWanted?Math.min(configuredPace,RAILS_STREET_X_CEILING):1):configuredPace;
      const carState=cars?.update({enabled:prefs.cars,onlineTraffic:prefs.traffic,onlinePlayers:prefs.players,onlineRivals:onlineRivalsEnabled,allowNetwork:prefs.online,safe,state:s}) || {requested:false,hits:0,reason:'Car no-clip is not verified for this build.'};
      const cityPacing=cityPacer?.update({enabled:cityPacingEnabled,verified:supported,capabilities:moduleProfile?.capabilities,automaticAI:prefs.ai===true||autonomyCruiseRequested,allowNetwork:prefs.online,
        safe:safe&&!driftPending,focused:document.hasFocus(),hidden:document.hidden,menuOpen:!!document.querySelector('dialog[open]'),tunerBusy:tuningActive(),hud:driveStatus,raceType:nativeRaceType,
        drag:dragRace||!!engine.u32(0x890108),drift:!!(engine.u8(0x89e7d9)||engine.u32(0x890104)||engine.u32(0x890114)),streetX,
        engine,state:s,aiState:typeof ai?.status==='function'?ai.status():null,handbackPending:!!ai?.handbackPending,identity:pacingIdentity,now:performance.now(),selectedPace,nativeSpeed:nativeSample.speedMps,carController:cars,moduleHash:moduleProfile?.hash})||{active:false,state:'off',pace:null};
      renderCityPace(cityPacing);
      // Keep the selected planning ceiling stable through city reductions.
      // A separate bounded city request must not rebuild the native route.
      const requestedPace=selectedPace;
      const effectiveRaceCorner=(prefs.raceCornerAssist||adaptive.requested)&&roadRaceProfile;
      // Drop synthetic input before publishing a native drag handoff request.
      const dragAIRequested = aiRequested && dragRace;
      if (dragAIRequested) release();
      const aiState = ai?.update({enabled:aiRequested,safe,state:s,mode:driveStatus,pace:requestedPace,adaptivePace:pacing.active?pacing.pace:null,cityPace:cityPacing.active?cityPacing.pace:null,allowNetwork:prefs.online,allowDragAI:dragAIRequested,cornerAssist:prefs.cornerAssist,cornerFactor:prefs.cornerFactor,cornerMargin:prefs.cornerMargin,raceCornerAssist:effectiveRaceCorner,adaptiveCorners:adaptive.requested,raceCornerFactor:rubberbandOwnsPace ? .95 : prefs.raceCornerFactor,raceCornerMargin:rubberbandOwnsPace?0:prefs.raceCornerMargin,raceBraking:rubberbandOwnsPace?1:prefs.raceBraking,dragNoBlowout:prefs.dragNoBlowout,rails:railsRace}) || {available:false,active:false,status:'Native game AI · experimental',reason:'Reload with the native AI module installed.'};
      // The watchdog reads this tick's AI state; its verdict steers the next tick's request.
      {
        const railsDriving=railsWanted&&safe&&!driftPending&&!counters?.pause&&!counters?.photo&&!counters?.drone&&!engine.u32(0x838974)&&aiState.active===true&&aiState.owned===true&&!ai?.handbackPending&&!aiState.switching;
        const watch=updateRailsWatch(railsRaceIdentity,railsDriving,nativeSample.speedMps,performance.now(),engine.u32(0x86518c));
        if(railsWanted&&watch.suspended&&!railsView.suspended)message(watch.trips>=2?'Rails released for the rest of this race: the car stopped twice.':'Rails released for a moment: the car stopped. They return once it is moving again.');
        railsView={wanted:railsWanted,race:railsRace,paceOnly:railsPaceOnly,on:railsDriving&&aiState.railsOn===true,pins:Number.isInteger(aiState.railsPins)?aiState.railsPins:0,suspended:railsWanted&&watch.suspended,trips:watch.trips,pace:requestedPace,streetX:!!streetX};
      }
      diagnosticState={...diagnosticState,nativeOnlineAI:moduleProfile?.capabilities.nativeOnlineAI===true,onlineAIAllowed:onlineRaceAllowed,railsWanted,railsRequested:railsWanted&&safe&&!!aiRequested&&aiState.railsRequested===true,railsOn:railsView.on,railsPins:aiState.railsPins,railsPaceOnly,railsSuspended:railsView.suspended,railsRecoveryTrips:railsView.trips,skillNine:safe&&!!aiRequested&&aiState.skillNine===true};
      renderRails();
      const legacyNeutral=engine.legacyPhysicsNeutral(s);
      // Derive each publication from the native source, never the prior output.
      // Native use-time guards withhold extra pace until four tires match.
      rubberbandSnapshot=rubberband?.update({enabled:rubberbandEnabled&&!railsPaceOnly,safe:safe&&!driftPending&&!dyno?.busy,ordinaryRace:(roadRaceProfile&&!streetX)||godlyExtra,network:s.network===true,allowNetwork:prefs.online===true&&moduleProfile?.capabilities.nativeOnlineAI===true,aiState,ownerSequence:typeof ai?.read==="function"?ai.read(4):undefined,currentCar:s.car,percent:godlyExtra?100:rubberbandPercent,strength:rubberbandStrength,selectedPace:godlyExtra?1:pacing.active?pacing.pace:requestedPace,featureOwnsPace:(rubberbandOwnsPace||godlyExtra)&&!railsPaceOnly,customPower:legacyNeutral?1:0,customGrip:legacyNeutral?1:0,customBoost:!parkLegacyPhysics&&prefs.boost,customUnlimit:!parkLegacyPhysics&&prefs.unlimit,now:performance.now()})||{state:'unsupported',active:false,resetPending:false};
      const calculatedOwned=(rubberbandOwnsPace||godlyExtra)&&!railsPaceOnly&&safe&&!driftPending&&!dyno?.busy&&aiState.active===true&&aiState.owned===true&&!ai?.handbackPending&&!aiState.switching;
      const calculatedEligible=calculatedOwned&&legacyNeutral&&onlineRaceAllowed;
      nativeCalculatedState={eligible:calculatedEligible,reason:!rubberbandEnabled?'off':!onlineRaceAllowed?'network-permission':(!roadRaceProfile||streetX)&&!godlyExtra?'not-ordinary-race':!safe||driftPending||dyno?.busy?'unsafe':!calculatedOwned?'ai-unowned':!legacyNeutral?'stacking-not-neutral':'sample'};
      if(calculatedEligible){
        nativeCalculatedState.catchupOn=engine.u32(0x89e7f8)===1;
        if(aiState.catchupTelemetryStatus==='sampled'&&aiState.catchupDriverVerified===true){nativeCalculatedState.driverFactor=aiState.catchupDriverFactor;nativeCalculatedState.carFactor=aiState.catchupCarFactor;}
      }
      renderRubberband();
      pacingEvidence=adaptive.requested?{identity:pacingIdentity,state:aiState}:null;
      const paceConfirmed=!!aiRequested && safe && !ai?.handbackPending && !aiState.switching && !!aiState.active && Number.isFinite(aiState.paceApplied) && aiState.paceApplied>=.75 && aiState.paceApplied<=3;
      try {
        // Current geometry corrects road-race rails only. Recovery and full
        // physics return immediately to their existing native target path.
        const currentForwardScope=moduleProfile?.hash!=='2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d'||(moduleProfile?.capabilities.nativeRailsForwardGeometry===true&&railsRace&&railsView.on&&roadRaceProfile&&!streetX&&onlineRaceAllowed&&engine.u32(s.car+0x28)===3);
        forwardSnapshot=forwardDrive?.update({enabled:adaptive.requested&&currentForwardScope,applyTarget:'native-policy',safe:safe&&!driftPending&&!dyno?.busy,offline:!s.network,allowNetwork:prefs.online,ordinaryRace:roadRaceProfile&&!streetX,aiState:{...aiState,ownerSequence:typeof ai?.read==='function'?ai.read(4):undefined},handbackPending:!!ai?.handbackPending,expectedPace:pacing.active?pacing.pace:requestedPace,identity:pacingIdentity,gain:rubberbandSnapshot,policy:rubberbandOwnsPace?{mode:'native',brakingFactor:1,cornerFactor:1,sharpMargin:0,reactionSeconds:.1,marginDistance:0}:{mode:'native',brakingFactor:prefs.raceBraking,cornerFactor:prefs.raceCornerFactor,sharpMargin:prefs.raceCornerMargin,reactionSeconds:.6,marginDistance:8}})||{forwardState:'off',forwardNativeApplied:false,forwardLiveVerified:false};
      } catch {cancelForward();forwardSnapshot={forwardState:'unknown',forwardGuardCode:45,forwardNativeApplied:false,forwardLiveVerified:false};}
      renderForwardStatus();
      const adaptiveState=!adaptive.requested?adaptive.state:ai?.handbackPending||aiState.switching||!aiState.active?'handoff':!paceConfirmed||Math.abs(aiState.paceApplied-pacing.pace)>.011?'pace-pending':pacing.state==='native-fallback'?'native-fallback':pacing.state==='clearance-limited'?'clearance-limited':!pacing.currentCorners?'coverage-unknown':'planner-observed';
      diagnosticState={...diagnosticState,...forwardSnapshot,...rubberbandEvidence(),adaptiveRaceRequested:adaptive.requested,adaptiveRaceState:adaptiveState,adaptiveRaceCeiling:rubberbandRoad?rubberbandPercent/100:adaptiveRaceCeiling,adaptivePacingState:pacing.state,adaptiveRuntimePace:pacing.active?pacing.pace:undefined,adaptiveClearanceM:pacing.clearance?.distanceM};
      const wallState=wall?.update({enabled:prefs.walls,safe,state:s}) || {requested:false,hits:0,reason:'Reload with the wall-contact module installed.'};
      try {diagnosticState={...diagnosticState,...engine.nosDiagnostics(s,supported&&moduleProfile?.capabilities.driftDiagnostics===true)};} catch { diagnosticReadFailure=1; }
      let tune={active:false},grip={active:false};
      // Observational only: selection, page-side write success and a native
      // pace-hook acknowledgement are different from measured vehicle speed.
      let powerStatus=parkLegacyPhysics&&(prefs.boost||prefs.unlimit)?'suspended':!(prefs.boost||prefs.unlimit)?'off':!supported?'unsupported':!s.ready?'not-ready':s.network&&!prefs.online?'network-permission':document.hidden?'hidden':!document.hasFocus()?'unfocused':!driveStatus?'hud':!s.driving?'not-driving':!safe?'menu':driftPending?'drift-change':'settling';
      if(safe && !driftPending && !parkLegacyPhysics && (prefs.boost || prefs.unlimit)) {
        const info=engine.performanceInfo(s),patch=engine.performancePatch;
        if(patch && (!info || patch.car!==s.car || patch.race!==s.race || patch.pi!==info.pi)) {engine.restorePerformance(s);powerGate.reset();}
        if(!info){powerGate.reset();powerStatus='layout';}
        if(info && (engine.performancePatch || powerGate.accept([s.car,s.race,info.pi,...info.values]))) {
          tune=engine.tunePerformance(s,prefs.boost?prefs.power:1,prefs.unlimit,prefs.online);
          powerStatus=tune.active?'applied':tune.ok?'neutral':tune.changed?'changed':'rejected';
          if(tune.changed){powerGate.reset();message(tune.reason);}
        }
      } else {engine.restorePerformance(s);powerGate.reset();}
      if(safe && !driftPending && !parkLegacyPhysics && prefs.grip) {
        const info=engine.gripInfo(s),patch=engine.gripPatch;
        if(patch && (!info || patch.car!==s.car || patch.race!==s.race || patch.physics!==info.physics || patch.wheels.some((w,i)=>w!==info.wheels[i]))) {engine.restoreGrip(s);gripGate.reset();}
        if(!info)gripGate.reset();
        if(info && (engine.gripPatch || gripGate.accept([s.car,s.race,info.physics,...info.wheels,...info.values]))) {
          grip=engine.tuneGrip(s,prefs.gripFactor,prefs.online);
          if(grip.changed){gripGate.reset();message(grip.reason);}
        }
      } else {engine.restoreGrip(s);gripGate.reset();}
      let producerFailureCode=1;
      try {
        diagnosticState={...diagnosticState,...engine.nativeDiagnostics(s,supported&&moduleProfile?.capabilities.driftDiagnostics===true,false,true),...engine.dragEngineDiagnostics(s,supported&&moduleProfile?.capabilities.nativeDragOverheat===true)};
        producerFailureCode=2;
        diagnosticState={...diagnosticState,powerStatus,raceOnlyInputClear,raceOnlyEligible,raceOnlyRequested,paceConfirmed,paceApplied:paceConfirmed?aiState.paceApplied:undefined,powerActive:!!tune.active,gripActive:!!grip.active,effectivePower:tune.power,effectiveGrip:grip.factor,limiterRemoved:!!tune.unlimit,aiActive:!!aiState.active,aiOwned:!!aiState.owned,handbackPending:!!ai?.handbackPending,pageHeartbeat:ai?.hb,nativeHeartbeatAck:aiState.ready&&typeof ai?.read==='function'?ai.read(44):undefined,aiRequestedMode:aiState.ready&&typeof ai?.read==='function'?ai.read(8):undefined,aiNativeStatus:aiState.ready&&typeof ai?.read==='function'?ai.read(52):undefined,aiStaleTicks:aiState.ready&&typeof ai?.read==='function'?ai.read(48):undefined,aiSkillSaved:aiState.ready&&typeof ai?.read==='function'?!!ai.read(64):undefined,savedNativeSkill:aiState.ready&&typeof ai?.read==='function'&&ai.read(64)?ai.read(68):undefined,requestedPace,cornerRequested:!!aiState.cornerRequested,cornerMemoryBlocked:!!aiState.cornerMemoryBlocked,cornerDriftBlocked:!!aiState.cornerDriftBlocked,cornerMode:aiState.cornerMode,cornerPace:aiState.cornerPace,cornerBraking:aiState.cornerBraking,brakingHits:aiState.brakingHits,cornerHits:aiState.cornerHits,cornerApplied:aiState.cornerApplied,cornerProbeStage:aiState.cornerProbeStage,cornerDriverValid:aiState.cornerDriverValid,cornerRouteOwned:aiState.cornerRouteOwned,cornerRouteNodes:aiState.cornerRouteNodes,cornerPlannerCorners:aiState.cornerPlannerCorners,cornerPlannerUsable:aiState.cornerPlannerUsable,cornerPlannerTelemetryStatus:aiState.cornerPlannerTelemetryStatus,cornerGuardMask:aiState.cornerGuardMask,nativePaceRequested:aiState.nativePaceRequested,nativePaceApplied:aiState.nativePaceApplied,nativePaceHits:aiState.nativePaceHits,nativePaceTelemetryStatus:aiState.nativePaceTelemetryStatus,shortcutPolicyInstalled:moduleProfile?.capabilities.nativeRouteChoice===true,shortcutPolicyRequested:moduleProfile?.capabilities.nativeRouteChoice===true&&adaptive.requested===true,catchupTelemetryStatus:aiState.catchupTelemetryStatus,catchupDriverVerified:aiState.catchupDriverVerified,catchupDriverFactor:aiState.catchupDriverFactor,catchupCarFactor:aiState.catchupCarFactor,wallRequested:!!wallState.requested,wallHits:wallState.hits,onlineTrafficRequested:!!carState.onlineTraffic,onlinePlayersRequested:!!carState.onlinePlayers,onlineRaceCarsRequested:!!carState.onlineRaceCars,onlineRivalsSelected:onlineRivalsEnabled,onlineAllCarsSelected:prefs.online===true&&prefs.traffic===true&&prefs.players===true&&onlineRivalsEnabled===true,onlineRivalsRequested:!!carState.onlineRivals,onlinePlayerOutrunRequested:!!carState.onlinePlayerOutrun,contactCounterScope:carState.contactCounterScope,trafficHitsExact:carState.trafficHitsExact,trafficHits:carState.trafficHitsExact===false?undefined:carState.trafficHits,playerHits:carState.playerHits,carRequested:typeof carState!=='undefined'?!!carState.requested:false,carHits:typeof carState!=='undefined'?carState.hits:0};
        producerFailureCode=3;
        diagnosticState={...diagnosticState,...cityEvidence(cityPacing),forwardReadPhaseCode:forwardSnapshot.forwardReadPhaseCode,forwardReadSubreasonCode:forwardSnapshot.forwardReadSubreasonCode,...(typeof forwardDrive?.diagnosticEvidence==='function'?forwardDrive.diagnosticEvidence():{}),planSelectedPace:selectedPace,planInputSpeedMps:nativeSample.speedMps,planCurrentCorners:pacing.currentCorners,planClearanceAvailable:pacing.clearance?.available,planClearanceObserved:pacing.clearance?.observed,planClearanceTarget:pacing.clearance?.targetMps,planClearanceSource:pacing.clearance?.source};
        const targetDriver=s.ready?engine.u32(s.car+0x2c):0;
        const targetEvidence=targetFeedbackState?.snapshot({available:moduleProfile?.capabilities.nativeTargetFeedback===true,safe:safe&&supported,owned:!!aiRequested&&aiState.active===true&&aiState.owned===true&&!aiState.switching&&!ai?.handbackPending,ownerSequence:typeof ai?.read==='function'?ai.read(4):undefined,car:s.car,race:s.race,driver:targetDriver,route:targetDriver?engine.u32(targetDriver+0x6e8):0,tick:engine.u32(0x86518c)});
        if(targetEvidence){diagnosticState={...diagnosticState,...targetEvidence};const node=ui?.querySelector('#native-target-state');if(node)node.textContent=targetFeedbackState.text(targetEvidence);}
        traceDiagnostic(diagnosticState,diagnosticReadFailure,diagnosticReadFailure);
        diagnostics?.snapshot(diagnosticState);
      } catch { traceDiagnostic(diagnosticState,producerFailureCode,producerFailureCode); }
      try{
        const carSample=s.ready&&supported?RaceTelemetry?.readCar(engine.memory,s.car,{verified:true,moduleHash:moduleProfile?.hash}):null;
        const carKey=carSample?.carKey||'unknown',trackId=Number.isInteger(nativeSample.trackId)?nativeSample.trackId:null;
        const raceType=nativeSample.nativeTelemetry===true?RaceCatalog?.classify(trackId,{drag:nativeSample.dragRace===true||nativeSample.forcedDrag===true,drift:nativeSample.driftRace===true||nativeSample.forcedDrift===true||nativeSample.driftVariant===true,streetX,roam:roamProfile,outrun:nativeRaceType===7})||'unknown':'unknown';
        raceStats?.observe({sessionGeneration,raceIdentity:pacingIdentity,trackId,raceType,carKey,inRace:driveStatus===1&&(nativeRaceType===1||nativeRaceType===7),driving:supported&&safe&&s.driving,aiOwned:safe&&aiState.active===true&&aiState.owned===true&&!aiState.switching&&!ai?.handbackPending,nativeSpeed:nativeSample.speedMps});
        hubRuntime={ready:supported&&s.ready&&safe,aiOwned:safe&&aiState.active===true&&aiState.owned===true&&!ai?.handbackPending,carKey,...forwardSnapshot};renderRaceHub();
      }catch{pauseRaceStats();}
      infoHudSample={at:performance.now(),data:{...diagnosticState},context:{cityPacing:cityPacing.active,cityPace:cityPacing.pace,menu:!!document.querySelector('dialog[open]'),drag:dragRace,drift:nativeDriftPace,roam:roamProfile,race:raceProfile,paceAvailable:moduleProfile?.capabilities.pace===true,aiAvailable:aiState.available,aiStatus:aiState.status,manual:aiState.manual,switching:!!aiState.switching}};
      streamSession?.observe(infoHudSample,performance.now());
      showcaseHighlights?.observe(infoHudSample,RaceCatalog?.classify(diagnosticState.trackId,{drag:dragRace,drift:nativeDriftPace,streetX,roam:roamProfile,outrun:nativeRaceType===7}));
      renderInfoHud();
      const manualDriver = s.ready && engine.u32(s.car+0x24)===1 && !aiState.active && (!ai || !aiState.available || (aiState.ready && !aiState.owned));
      const dragCountdown = dragRace && engine.u32(s.race)===3;
      const activeDrag = canInput && (s.driving || dragCountdown) && prefs.drag && !dragAIRequested && dragRace && manualDriver && !dragTakenOver;
      const now = performance.now();
      if (autonomyTravel) {
        hold('AltLeft',false);hold('ShiftLeft',false);publishAutonomyInput(aiState);
      } else if (activeDrag) {
        hold('ArrowUp', true);
        hold('AltLeft', false);
        if (s.driving && s.rpm >= prefs.rpm && s.gear >= 2 && s.gear < 7 && now - lastShift > 650) {
          lastShift = now; hold('ShiftLeft', true);
          shiftTimer = setTimeout(() => hold('ShiftLeft', false), 85);
        }
        // Refresh synthetic held keys after a game's own input-release event.
        if (now - lastPulse > 500) { lastPulse = now; for (const code of held) if (code !== 'ShiftLeft') key(code, true); }
      } else release();
      updateCameraRotation(s,driveStatus,now,!!(counters?.photo||counters?.drone||counters?.pause));
      if (live) live.textContent = !supported ? `Game build ${revision || '(checking)'} is not verified. Memory tools disabled.` : !s.ready ? s.reason : s.network && !prefs.online ? (soloOnlyBuild() ? 'Online session · driving tools are solo/offline only on this game build.' : 'Online/LAN tools paused. Enable Allow Online/LAN tools in Session mode.') : !driveStatus ? 'Waiting for driving HUD.' : `${s.network ? 'Online/LAN opt-in' : 'Game linked'} · ${Math.round(s.rpm)} RPM${tune.active ? ` · Power ${tune.power.toFixed(1)}×${tune.unlimit ? ' · Governor off' : ''}` : (prefs.boost || prefs.unlimit) ? ' · Power controls waiting/unavailable' : ''}${grip.active ? ` · Grip ${grip.factor.toFixed(1)}×` : prefs.grip ? ' · Grip paused/unavailable' : ''}${prefs.drag ? activeDrag ? dragCountdown ? ' · Drag countdown throttle' : ' · Drag throttle/shifting · you steer' : dragTakenOver ? ' · Drag paused for manual control' : dragRace && !manualDriver ? ' · Drag waiting for native handback' : ' · Drag assist paused/waiting' : ''}`;
      if (ui) {
        
        const caps=moduleProfile?.capabilities;
        for(const [id,feature] of [['ai-pace','pace'],['pace-factor','pace'],['race-pace','pace'],['race-pace-factor','pace'],['race-corner-assist','corner'],['race-corner-factor','corner'],['race-corner-margin','corner'],['race-braking','corner'],['corner-assist','corner'],['corner-factor','corner'],['corner-margin','corner'],['walls','walls'],['cars','cars'],['traffic','onlineTraffic'],['players','onlinePlayers'],['rivals','onlineRivals'],['dyno-enable','dyno']]){const control=ui.querySelector('#'+id);if(control)control.disabled=(feature==='onlineTraffic'||feature==='onlinePlayers'||feature==='onlineRivals')?caps?.[feature]!==true:!!caps&&!caps[feature];}
        if(live)live.title=live.textContent;
        renderPowerStatus(powerStatus,tune);
        const enabled=[onlineRivalsEnabled,cityPacingEnabled,adaptiveRaceEnabled,prefs.raceCornerAssist,prefs.cornerAssist,prefs.racePace,prefs.walls,prefs.cars,prefs.traffic,prefs.players,prefs.ai,raceOnlyAI,prefs.aiPace,prefs.boost,prefs.unlimit,prefs.grip,prefs.dragNoBlowout,prefs.drag,prefs.tester,!!(counters?.drift & 1)].filter(Boolean).length;
        ui.querySelector('#enabled').textContent=enabled ? `${enabled} selected` : 'Ready';
        ui.querySelector('#cars-state').textContent=caps&&!caps.cars?'Not verified for this build':prefs.cars?(carState.soloReason||carState.reason):'OFF · other cars only · solo';
        ui.querySelector('#traffic-state').textContent=caps?.onlineTraffic!==true?'Not verified for this build':prefs.traffic?(carState.trafficReason||carState.reason):'OFF · traffic only · online free roam';
        ui.querySelector('#players-state').textContent=caps?.onlinePlayers!==true?'Not verified for this build':prefs.players?(carState.playersReason||carState.reason):'OFF · players / online race cars';
        renderAllOnlineCars(carState);
        ui.querySelector('#rivals-state').textContent=caps?.onlineRivals!==true?'Unavailable on this game build':onlineRivalsEnabled?(carState.rivalsReason||carState.reason):'OFF · NPC rivals / Outrun';
        ui.querySelector('#walls-state').textContent=caps&&!caps.walls?'Not yet verified for this build':prefs.walls?wallState.reason:'OFF · resets after reload';
        ui.querySelector('#online-state').textContent = soloOnlyBuild() ? 'Unavailable on this game build · solo/offline only' : prefs.online ? 'ON this page · experimental · F9 disables' : 'OFF · profile restore needs saved permission';
        const aiNode=ui.querySelector('#ai-state'),failure=moduleFailure();
        aiNode.dataset.unavailable=String(!!failure);
        ui.querySelector('#race-only-state').textContent=!raceOnlyAI?'Off · current page only':!supported||caps?.ai!==true?'Armed · waiting for a verified AI build':s.network&&!prefs.online?'Armed · paused online without permission':!raceOnlyInputClear?'Armed · release driving controls before takeover':!raceOnlyEligible?(ai?.handbackPending||aiState.owned?'Leaving race · native handback pending':'Armed · waiting for active race / GO'):aiState.active&&!ai?.handbackPending&&!aiState.switching?'Native race AI active':aiState.status==='retry'?'Native request preserved · switch off/on to retry':aiState.reason||'Race AI requested · waiting for native confirmation';
        aiNode.textContent = failure ? `AI unavailable. ${failure}` : (prefs.ai||raceOnlyAI) && s.network && !prefs.online ? (soloOnlyBuild() ? 'Paused online · solo/offline only on this game build' : 'Paused online · enable Session mode opt-in') : aiRequested ? [dragRace ? 'Auto · drag AI' : 'Auto · native AI', aiState.status || 'Native game AI · experimental', aiState.reason].filter(Boolean).join(' · ') : 'Highest native skill · experimental · off';
        ui.querySelector('#adaptive-race').disabled=!(supported&&caps?.nativeDragInputHandoff&&caps?.corner&&caps?.pace);
        const adaptiveLabels={off:'Off · session only',invalid:'Invalid ceiling · not applied',unsupported:'Unavailable on this build','street-x':streetXPacePolicy?(railsWanted?'Street X · rails pace limit 1.15×':'Street X · paired handling at 1.00×'):'Street X · using saved controls',mode:'Waiting for road race · not Drag, Drift, Outrun or free roam','network-permission':'Paused online · allow network tools first','ai-off':'Waiting for an automatic driver mode',paused:'Paused · waiting for safe active driving',handoff:'Rebuilding native route · waiting for handoff','pace-pending':'Requested · waiting for pace acknowledgment','planner-pending':'Pace acknowledged · awaiting corner/braking evidence','planner-observed':'Native corner and braking controls active','native-fallback':'Native pace active · optional corner coverage unknown','coverage-unknown':'Native corner coverage unknown','clearance-limited':'Observed clearance · reducing pace request'};
        ui.querySelector('#adaptive-race-state').textContent=adaptiveLabels[adaptiveState];
        ui.querySelector('#adaptive-race-state').title=adaptiveLabels[adaptiveState]+`. Ceiling ${adaptive.ceiling.toFixed(2)}×; live request ${Number.isFinite(pacing.pace)?pacing.pace.toFixed(2)+'×':'off'}. Clearance is partial; braking deceleration is provisional. This is not a physical speed cap or proof of a clean corner.`;
        if(cityPacing.active)ui.querySelector('#city-pace-state').title='Ordinary free-roam pace request; not steering, route coverage, obstacle avoidance or a collision guarantee.';
        ui.querySelector('#ai-pace-state').textContent = cityPacing.active?cityPacing.pace.toFixed(2)+'× city request · selected factor retained':caps&&!caps.pace?'Not yet verified for this build':!prefs.aiPace ? 'Off · free roam only' : nativeDriftPace ? 'Paused in Drift · native pace retained' : dragRace ? 'Paused in drag · native pace unchanged' : !roamProfile ? `${prefs.paceFactor.toFixed(2)}× saved · waiting for free roam` : !aiRequested || !aiState.active ? `${prefs.paceFactor.toFixed(2)}× selected · waiting for AI` : paceConfirmed ? `${aiState.paceApplied.toFixed(2)}× confirmed` : `${prefs.paceFactor.toFixed(2)}× requested`;
        ui.querySelector('#race-pace-state').textContent = streetXPacePolicy?`Street X ${selectedPace.toFixed(2)}× ${!aiRequested||!safe?'selected · waiting for AI':paceConfirmed&&Math.abs(aiState.paceApplied-selectedPace)<.011?'confirmed':'requested'} · ${railsWanted?'rails limit 1.15×':'neutral paired pace'}${prefs.racePace?` · saved ${prefs.racePaceFactor.toFixed(2)}×`:''}`:adaptive.requested?`Adaptive ceiling ${adaptive.ceiling.toFixed(2)}× · requested ${pacing.pace.toFixed(2)}×${rubberbandOwnsPace?rubberbandSnapshot.active===true&&rubberbandSnapshot.outputsVerified===true?' · physics confirmed':' · awaiting physics':''}`: caps&&!caps.pace?'Not yet verified for this build':!prefs.racePace ? 'Off · normal race pace' : nativeDriftPace ? 'Paused in Drift · native pace retained' : !raceProfile ? `${prefs.racePaceFactor.toFixed(2)}× saved · waiting for race / outrun` : !aiRequested || !aiState.active ? `${prefs.racePaceFactor.toFixed(2)}× selected · waiting for AI` : paceConfirmed ? `${aiState.paceApplied.toFixed(2)}× confirmed` : `${prefs.racePaceFactor.toFixed(2)}× requested`;
        ui.querySelector('#race-corner-state').textContent = adaptive.requested?adaptiveState==='planner-observed'?'Adaptive hook hits observed · not a check of this corner':`Adaptive requested · ${pendingCornerText(aiState)}`: caps&&!caps.corner?'Not yet verified for this build':!prefs.raceCornerAssist ? 'Off · road races; online needs opt-in' : s.network && !prefs.online ? 'Paused online · enable Session mode opt-in' : !roadRaceProfile ? 'Waiting for ordinary road race · excludes outrun, drag and drift' : !aiRequested || !aiState.active ? 'Waiting for automatic AI' : aiState.cornerMemoryBlocked ? 'Blocked · corner command memory is occupied' : aiState.cornerMode===2 && Number.isFinite(aiState.cornerApplied) ? `${aiState.cornerApplied.toFixed(2)}× road-race corner cap observed · braking hits ${aiState.brakingHits ?? 0}` : aiState.cornerMode===2 && aiState.cornerRequested ? pendingCornerText(aiState) : 'Not armed · road-race command was not accepted';
        ui.querySelector('#corner-state').textContent = caps&&!caps.corner?'Not yet verified for this build':!prefs.cornerAssist ? 'Off · free roam only' : !roamProfile ? 'Waiting for free roam' : !aiRequested || !aiState.active ? 'Waiting for automatic AI' : aiState.cornerMemoryBlocked ? 'Blocked · corner command memory is occupied' : aiState.cornerDriftBlocked ? 'Paused · drift mode excludes corner assist' : Number.isFinite(aiState.cornerApplied) ? `${aiState.cornerApplied.toFixed(2)}× corner-speed cap confirmed` : aiState.cornerRequested ? pendingCornerText(aiState) : 'Not armed · corner command was not accepted';
        ui.querySelector('#drag-ai-state').textContent = caps&&!caps.dragAI?'Not yet verified for this build':!aiRequested ? (raceOnlyAI?'Race-only AI armed · waiting for active race':'Enable Automatic driver or Race-only automatic driver') : dragRace ? aiState.active ? aiState.opponentDragSelected ? 'Opponent drag action confirmed · gameplay unverified' : aiState.dragSelection==='unsupported' ? 'Opponent selector unsupported on this build' : 'Native driver active · opponent action pending' : safe ? 'Auto-selected · waiting for native confirmation' : 'Auto-selected · waits for GO / supported driving state' : 'Automatic · waiting for a drag race';
        ui.querySelector('#drag-no-blowout').disabled=moduleProfile?.capabilities.nativeDragOverheat!==true;
        ui.querySelector('#drag-no-blowout-state').textContent=moduleProfile?.capabilities.nativeDragOverheat!==true?'Unavailable on this game build':prefs.dragNoBlowout?(s.network&&!prefs.online?'Paused online · enable Allow network tools':safe && s.drag?'Requested · current player engine only':'Waiting for active Drag'):'Off · normal Drag engine damage';
        ui.querySelector('#drag-state').textContent = activeDrag ? dragCountdown ? 'Countdown throttle · shifts wait for GO' : 'Throttle + shifting active · you steer' : prefs.drag ? dragAIRequested ? 'Paused while automatic drag AI is requested' : dragTakenOver ? 'Paused by manual takeover · toggle to resume' : dragRace && !manualDriver ? 'Waiting for native AI to release the car' : s.network && !prefs.online ? 'Paused online · enable Session mode opt-in' : 'Waiting for drag driving state' : 'Throttle + shifting · you steer';
        ui.querySelector('#grip-state').textContent=grip.active ? `Tyre-force multiplier ${grip.factor.toFixed(1)}× applied` : prefs.grip ? (grip.reason || 'Waiting for driving state') : 'More tyre grip · start at 1.3×';
        if (prefs.tester && supported && s.ready && now - lastScan > 250) {
          lastScan = now;
          const h = engine.hazards(s), close = h?.cars[0];
          ui.querySelector('#hazards').textContent = h ? `${h.scannedCars} car objects read. ${close ? `Nearest ahead: ${close.ahead.toFixed(0)} m, side offset ${close.side.toFixed(1)} m.` : 'No nearby car detected ahead.'} ${h.barrierAhead !== null ? `Barrier line ahead: ${h.barrierAhead.toFixed(0)} m.` : 'No crossing barrier line detected.'} Props and general obstacles: NOT detected.` : 'Detector waiting for valid car coordinates.';
        }
        const driftKnown = counters && Number.isFinite(counters.drift);
        const drift = driftKnown ? !!(counters.drift & 1) : null;
        const driftActive = driftKnown && !!(counters.drift & 2);
        if (driftPending && driftKnown && drift === driftPending.wanted && (!drift || driftActive)) {
          message(drift ? 'Drift assist ON: confirmed by the game’s handling state.' : 'Drift assist OFF: confirmed by the game.'); driftPending=null;
        } else if (driftPending && now > driftPending.until) {
          message('The game did not confirm drift assist. Use solo free roam (not a race or co-op), close menus, then try again.'); driftPending=null;
        }
        ui.querySelector('#drift').disabled = !!driftPending;
        if(driftNeedsReapply && !driftPending && safe && driveStatus===2 && driftKnown) {driftNeedsReapply=false;if(!setDrift(prefs.drift))message('Drift request could not be sent. Toggle it again in free roam.');}
        if(driftKnown && !driftPending && !driftNeedsReapply) {
          ui.querySelector('#drift').checked=drift;
          if(typeof prefs.drift==='boolean' && prefs.drift!==drift){prefs.drift=drift;savePrefs();}
        }
        for(const id of ['ai-state','race-only-state','ai-pace-state','race-pace-state','race-corner-state','corner-state','grip-state','walls-state','cars-state','traffic-state','players-state','rivals-state','drag-state','drag-ai-state','online-state']) {const node=ui.querySelector('#'+id);node.title=node.textContent;}
        for(const [id,mode] of [['corner-state',1],['race-corner-state',2]]) if(aiState.cornerRequested && aiState.cornerMode===mode) {const node=ui.querySelector('#'+id);node.title=node.textContent+' · '+cornerEvidenceText(aiState);}
        ui.querySelector('#drift-state').textContent = driftNeedsReapply ? 'Choice saved · waiting for solo free roam' : driftPending ? 'Waiting for confirmation…' : driftActive ? 'Game confirms drift handling ON' : drift ? 'Selected, but not active in this game mode' : 'Free roam only · not perfect-drift automation';
      }
    } catch (error) { traceDiagnostic({...coarseDiagnostic(),generation:sessionGeneration,revision,supported},diagnosticReadFailure||3,diagnosticReadFailure||3);recordDiagnostic('engine-error',{error,tools:diagnosticTools()});stop('Runtime changed or is unavailable. Reload the game before retrying.'); engine = null; }
  }
  function setPanel(open) {
    visible=!!open;
    if(!visible)stopEcu('Tuning menu closed');
    if(host)host.style.width=visible?'244px':'170px';
    if(!visible && dyno?.busy)dyno.cancel();
    if(!ui) return;
    ui.querySelector('#tools-panel').hidden=!visible;
    ui.querySelector('#min').setAttribute('aria-expanded',String(visible));
    ui.querySelector('#chevron').textContent=visible ? '▴' : '▾';
    renderInfoHud();
  }
  function updateDynoUI() {
    if(!ui)return;
    if(ecuOwnsTuner()&&(!dynoEnabled||!supported||!visible||document.hidden||!document.hasFocus()||!dyno?.canUse()))stopEcu('ECU paused; return to solo Performance Tuning');
    ecuUi?.refresh();
    const ecuOwned=ecuOwnsTuner(),busy=!!dyno?.busy||!!ecu?.busy,ready=!!(dynoEnabled && supported && dyno?.canUse() && !document.hidden && document.hasFocus()&&!ecuOwned);
    const captureReady=!!(dynoEnabled&&supported&&dyno?.full&&(typeof dyno.canCapture==='function'?dyno.canCapture():dyno.canUse())&&!document.hidden&&document.hasFocus()&&!ecuOwned);
    const context=ready&&!busy?dyno?.syncContext?.():null;
    if(context?.invalidated)dynoText='Car tuning or installed parts changed. Load settings or find a new tune for this game mode.';
    else if(context?.changed)dynoText=dyno.applied?'Applied tune found for this car and mode. Restore is available while it stays unchanged.':dyno.outcome?'Preview found for this car and mode. Review it before Apply.':'Ready for the selected mode. Load all settings or search a measured native estimate.';
    ui.querySelector('#dyno-mode').textContent=context?`Game tuning slot ${context.kind+1} of 5${Tune?.MODE_LABELS?.[context.kind]?' · '+Tune.MODE_LABELS[context.kind]:''} · selected in Mode Select`:busy&&dyno?.context?`Game tuning slot ${dyno.context.kind+1} of 5`:'Choose a race mode in the game, then open the Dyno main screen.';
    ui.querySelector('#dyno-find').disabled=!ready || busy || !!dyno?.applied;
    ui.querySelector('#dyno-cancel').disabled=!busy;
    ui.querySelector('#dyno-apply').disabled=!ready || busy || !(dyno?.full?dyno.outcome?.changed:dyno?.outcome?.improved) || !!dyno?.applied;
    ui.querySelector('#dyno-restore').disabled=!ready || busy || !dyno?.applied;
    ui.querySelector('#dyno-goal').disabled=busy;
    for(const option of ui.querySelector('#dyno-goal').options||[])if(['acceleration60','acceleration100','topSpeed'].includes(option.value))option.disabled=!dyno?.full;
    if(dyno && !dyno.full&&['acceleration60','acceleration100','topSpeed'].includes(ui.querySelector('#dyno-goal').value))ui.querySelector('#dyno-goal').value='peakPower';
    updateSetupEditor(ready,busy,captureReady);
    let blockedText='';
    if(dynoEnabled&&!ready&&!busy){
      const code=(captureReady?dyno?.captureReadiness?.():dyno?.readiness?.())?.code,labels=globalThis.__NFSU2_DYNO_FULL__?.readinessLabels;
      blockedText=document.hidden?'Return to the game tab to use the tuner.':!document.hasFocus()?'Focus the game window to use the tuner.':ecuOwned?'Stop ECU controls before using the preset tuner.':!dyno?'Waiting for the supported game tuner.':labels&&Object.hasOwn(labels,code)&&code!=='ready'?labels[code]:'';
    }
    ui.querySelector('#dyno-state').textContent=moduleFailure()?`Dyno unavailable. ${moduleFailure()}`:moduleProfile&&!moduleProfile.capabilities.dyno?'Not yet verified for this build':dynoText+(blockedText?' '+blockedText:'');
  }
  const tuneValue=value=>(value>100?'+':'')+(value-100);
  function updateSetupEditor(ready,busy,captureReady=ready){
    const editor=dyno?.editor,editable=!!(ready&&!busy&&editor&&!dyno?.applied);
    ui.querySelector('#tune-load').disabled=!captureReady||busy||!!dyno?.applied||!dyno?.full;
    ui.querySelector('#tune-preview').disabled=!editable;
    ui.querySelector('#tune-reset').disabled=!editable;
    ui.querySelector('#tune-group').disabled=!editable;
    const group=Tune?.GROUPS?.find(g=>g.id===ui.querySelector('#tune-group').value)||Tune?.GROUPS?.[0];
    for(let i=0;i<9;i++){
      const offset=group?.offsets[i],present=!!editor&&offset!==undefined,row=ui.querySelector('#tune-row-'+i),input=ui.querySelector('#tune-input-'+i);
      row.hidden=!present;input.disabled=!editable||!editor?.allowedOffsets.includes(offset);
      if(present){
        input.dataset.offset=String(offset);input.value=editor.draft[offset]-100;
        ui.querySelector('#tune-label-'+i).textContent=(Tune?.FIELD_LABELS?.[offset]||'Setting '+(offset+1))+(editor.allowedOffsets.includes(offset)?'':editor.unlockedOffsets?.includes(offset)?' · unverified':' · locked');
        ui.querySelector('#tune-value-'+i).textContent=tuneValue(editor.draft[offset]);
      }
    }
    renderTunerResults(ready,busy);
    const o=dyno?.outcome;
    ui.querySelector('#tune-changes').textContent=dyno?.full&&Array.isArray(o?.changes)?o.changes.map(x=>`${Tune?.FIELD_LABELS?.[x.offset]||x.field}: ${tuneValue(x.before)} → ${tuneValue(x.after)}${x.adjusted?' (native adjusted request '+tuneValue(x.requested)+')':''}`).join('\n')||'No accepted setup changes.':editor?'Edit sliders, then Preview changes. Drafts never alter the game.':'Load settings to see unlocked controls for this car and preset.';
  }
  function tunerDisplayModel(controller,ready,busy){
    const empty={power:'—',torque:'—',accel:'—',speed:'—'},o=controller?.outcome;
    const state=!ready?'Tuner unavailable':busy?'Working':controller?.applied?'Staged':o?'Preview':'Ready';
    const note=!ready?'Follow the tuner status to continue.':busy?'Current calculation is in progress.':!o?'Load settings, then preview or find a tune.':controller?.applied?'Staged in game · Test Run to refresh · Save Profile to save.':'Native estimates · original → preview · game setup unchanged.';
    if(!ready||busy||!o)return {...empty,state,note};
    const pair=(key,scale,digits,max)=>{const before=o.baselineResult?.[key],after=o.bestResult?.[key],valid=n=>Number.isFinite(n)&&n>0&&n*scale<=max;return valid(before)&&valid(after)?(before*scale).toFixed(digits)+' → '+(after*scale).toFixed(digits):'—';};
    return {state,note,power:pair('peakPowerKw',1,1,1e6),torque:pair('peakTorqueNm',1,0,1e7),accel:pair('zeroTo60Seconds',1,2,3600),speed:pair('topSpeedMps',3.6,1,2000)};
  }
  function renderTunerResults(ready,busy){
    const view=tunerDisplayModel(dyno,ready,busy);
    for(const field of ['power','torque','accel','speed']){const el=ui.querySelector('#tune-kpi-'+field);if(el.textContent!==view[field])el.textContent=view[field];}
    const state=ui.querySelector('#tune-display-state');if(state.textContent!==view.state)state.textContent=view.state;
    const note=ui.querySelector('#tune-display-note');if(note.textContent!==view.note)note.textContent=view.note;
  }
  async function runDyno(action) {
    if(!dynoEnabled || !dyno || dyno.busy || ecu?.busy)return;
    recordDiagnostic('dyno-action',{reason:action,dynoFullTuner:dyno.full===true,dynoSecondWindowCapture:moduleProfile?.capabilities.tunerSecondGuestWindow===true,dynoCurrentClamp:moduleProfile?.capabilities.tunerCurrentNativeClamp===true,tools:diagnosticTools()});
    suspend();
    dyno.setEnabled(true);
    try {
      if(action==='load'){
        await dyno.loadSetup();dynoText='All supported settings loaded. Edit a category, then Preview. Nothing changes in the game until Stage.';
      } else if(action==='preview'){
        const r=await dyno.preview();
        dynoText=`${r.changed?'Preview ready. Review accepted changes, then Stage selected preset.':'No accepted setup changes.'} Game unchanged. Native estimates: 0–60 ${r.bestResult.zeroTo60Seconds.toFixed(2)} s; 0–100 ${r.bestResult.zeroTo100Seconds.toFixed(2)} s; top ${(r.bestResult.topSpeedMps*3.6).toFixed(1)} km/h; ${r.bestResult.peakPowerKw.toFixed(1)} kW / ${r.bestResult.peakTorqueNm.toFixed(1)} Nm. NOS ${r.bestResult.nitrousSeconds.toFixed(2)} s / torque setting ${r.bestResult.nitrousTorque.toFixed(3)}. No handling/lap-time measurement.`;
      } else if(action==='find') {
        dynoText=dyno.full?'Searching in private memory · game setup stays unchanged':'Searching · original setup is restored after each trial';updateDynoUI();
        const r=await dyno.find({goal:ui.querySelector('#dyno-goal').value,onProgress:p=>{dynoText=`Searching ${p.evaluations}/${p.budget} trials · Cancel or F9 to stop`;updateDynoUI();}});
        const [field,unit]=({peakPower:['peakPowerKw','kW'],peakTorque:['peakTorqueNm','Nm'],acceleration60:['zeroTo60Seconds','s (0–60)'],acceleration100:['zeroTo100Seconds','s (0–100)'],topSpeed:['topSpeedMps','m/s']}[r.goal]);
        if(dyno.full){
          const manualSeed=r.seed?.some((value,index)=>value!==r.baseline[index]);
          const seedText=manualSeed&&r.changed?(r.improvedFromSeed?' Search improved the measured goal over your draft.':' No further measured improvement over the draft. Accepted manual draft retained.'):'';
          dynoText=`${r.baselineResult[field].toFixed(1)} → ${r.bestResult[field].toFixed(1)} ${unit} · ${r.evaluations} trials. Original kept. ${r.improved?'Measured goal improved versus original.':'No measured goal improvement versus original.'}${seedText} ${r.changed?'Review accepted changes, then Stage selected preset.':'No accepted setup changes.'} No handling/lap-time measurement.`;
        }else dynoText=`${r.baselineResult[field].toFixed(1)} → ${r.bestResult[field].toFixed(1)} ${unit} · ${r.evaluations} trials. Original kept. ${r.improved?'Stage preview to use this tune.':'No improvement found.'}`;
      } else if(action==='apply') {const r=await dyno.apply();dynoText=dyno.full?'Selected preset staged. Use the game’s Test Run to refresh driving physics, and Save Profile to persist. Disk save is not confirmed.'+(r.saveReady?'':' Other presets also have unsaved edits; native Save Profile saves them too.'):'Best tune applied. Use native Save Profile to persist.';}
      else {await dyno.restore();dynoText=dyno.full?'Previous current and selected-visit settings restored. Test Run refreshes physics. Save Profile again if you want this restored version persisted.':'Previous tune restored and confirmed.';}
    } catch(error) {recordDiagnostic('dyno-error',{error,dynoStatus:error?.dynoStatus,dynoGuard:error?.dynoGuard,dynoObserved:error?.dynoObserved,tools:diagnosticTools()});dynoText=error?.message || 'Dyno tuner stopped. Reload before retrying.';}
    updateDynoUI();
  }
  function exportDiagnostic() {
    if(!diagnostics){message('Diagnostic logger is unavailable. The game’s Download log may still have crash details.');return;}
    let url=null,link=null;
    try {
      recordDiagnostic('export',{tools:diagnosticTools()});
      const blob=new Blob([diagnostics.exportText()],{type:'application/json'});
      url=URL.createObjectURL(blob);link=document.createElement('a');link.href=url;link.download='nfsu2-driving-tools-diagnostics.json';link.hidden=true;
      (document.body||document.documentElement).append(link);link.click();
      message('Diagnostic download requested. It stays local until you choose to share the file. For native crash details, also use the game’s Download log.');
    } catch(error) {recordDiagnostic('engine-error',{error});message('Diagnostic download failed. Try again, or use the game’s Download log.');}
    finally {link?.remove();if(url)setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }
  const profileToggleIds={raceCornerAssist:'race-corner-assist',cornerAssist:'corner-assist',racePace:'race-pace',walls:'walls',cars:'cars',traffic:'traffic',players:'players',online:'online',ai:'ai',aiPace:'ai-pace',dragNoBlowout:'drag-no-blowout',drag:'drag',tester:'tester',boost:'boost',unlimit:'unlimit',grip:'grip'};
  const profileNumericBindings=[['race-corner-factor','raceCornerFactor','race-corner-value',2,'×'],['race-corner-margin','raceCornerMargin','race-corner-margin-value',0,'%'],['race-braking','raceBraking','race-braking-value',2,'×'],['race-pace-factor','racePaceFactor','race-pace-value',2,'×'],['corner-factor','cornerFactor','corner-value',2,'×'],['corner-margin','cornerMargin','corner-margin-value',0,'%'],['pace-factor','paceFactor','pace-value',2,'×'],['rpm','rpm','rpm-value',0,''],['power','power','power-value',1,'×'],['grip-factor','gripFactor','grip-value',1,'×']];
  function syncProfileControls(){
    if(!ui)return;
    for(const [key,id]of Object.entries(profileToggleIds))ui.querySelector('#'+id).checked=prefs[key];
    
    for(const [id,key,out,digits,suffix]of profileNumericBindings){const el=ui.querySelector('#'+id);el.value=prefs[key];ui.querySelector('#'+out).textContent=prefs[key].toFixed(digits)+suffix;el.setAttribute('aria-valuetext',prefs[key].toFixed(digits)+(suffix==='%'?' percent':suffix?' times':' RPM'));}
    ui.querySelector('#dyno-enable').checked=dynoEnabled;
    ui.querySelector('#drift').checked=!!prefs.drift;
    ui.querySelector('#hazards').hidden=!prefs.tester;
  }
  const profileLocks=()=>typeof navigator!=='undefined'&&navigator.locks&&typeof navigator.locks.request==='function'?navigator.locks:null;
  function renderProfiles(){
    if(!ui)return;
    const state=profileStore?.snapshot(),select=ui.querySelector('#profile-select');
    select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Choose a saved profile';select.append(empty);
    for(const p of state?.data.profiles||[]){const option=document.createElement('option');option.value=p.id;option.textContent=p.name;select.append(option);}
    const selected=state?.data.profiles.find(p=>p.id===profileSelection?.id&&p.revision===profileSelection?.revision);
    if(!selected){profileSelection=null;ui.querySelector('#profile-network').checked=false;}
    select.value=selected?.id||'';
    for(const id of ['profile-load','profile-update','profile-delete','profile-auto'])ui.querySelector('#'+id).disabled=profileActionPending||!state?.available||!selected||(id!=='profile-load'&&!profileLocks());
    ui.querySelector('#profile-save').disabled=profileActionPending||!state?.available||!profileLocks();
    for(const id of ['profile-select','profile-name','profile-network'])ui.querySelector('#'+id).disabled=profileActionPending;
    ui.querySelector('#profile-auto').checked=!!selected&&state.data.auto?.id===selected.id&&state.data.auto.stopToken===state.stopToken&&!profileSessionStopped;
    ui.querySelector('#profile-state').textContent=state?.error||(profileActionPending?'Waiting for another tab to finish saving profiles.':profileNotice)||(!profileLocks()?'Profile editing is unavailable because this browser cannot lock local saves.':!profileStore?'Profiles unavailable; existing controls still work.':state.paused?'Automatic loading paused by Stop. Select a profile and enable Load on startup to resume.':state.data.auto?'A saved profile will load on next startup.':'Automatic loading is off. Save current controls, then select and Load when needed.');
    renderShowcaseProfiles();
  }
  function selectProfile(){
    const id=ui.querySelector('#profile-select').value,state=profileStore?.refresh();
    profileSelection=state?.data.profiles.find(p=>p.id===id)||null;
    ui.querySelector('#profile-name').value=profileSelection?.name||'';
    ui.querySelector('#profile-network').checked=profileSelection?.networkConsent||false;
    profileNotice=profileSelection?'Selected '+profileSelection.name+'. Load applies its saved choices. Update replaces it with current controls.':'';renderProfiles();
  }
  function applyToolProfile(result,automatic=false){
    stopEcu('Profile load');
    if(driftPending)throw Error('Wait for the current drift request to confirm or time out, then Load again. No profile was loaded.');
    if(dyno?.busy||dyno?.pending){dyno.cancel();throw Error('Tuner cancellation requested. Wait for the pending game request to finish, then Load again. A staged preset is not reverted.');}
    clearRaceOnlyAI();
    adaptiveRaceEnabled=false;if(ui)ui.querySelector('#adaptive-race').checked=false;clearCityPace();clearRivalNoClip();stopRubberband(true);
    suspend();driftNeedsReapply=false;dragTakenOver=false;lastShift=0;lastPulse=0;
    const choices=result.settings;
    for(const key of Object.keys(prefs))prefs[key]=choices[key];
    enforceSolo();
    dynoEnabled=choices.dynoEnabled;dyno?.setEnabled(dynoEnabled);
    if(ui){ui.querySelector('#dyno-goal').value=choices.dynoGoal;ui.querySelector('#profile-network').checked=result.profile.networkConsent;ui.querySelector('#profile-name').value=result.profile.name;}
    driftNeedsReapply=typeof prefs.drift==='boolean';profileDriftChoice=driftNeedsReapply;
    loadedProfile={id:result.profile.id,revision:result.profile.revision};savePrefs();syncProfileControls();
    dynoText=dynoEnabled?'Profile loaded. Open the solo Performance Tuning main screen. Existing staged presets are unchanged.':'Tuner off. Existing staged presets are unchanged.';updateDynoUI();
    profileNotice=(automatic?'Loaded on startup: ':'Loaded: ')+result.profile.name+'. Choices wait for verified game contexts.'+(result.profile.networkConsent?' Saved network permission restored where selected.':' Network permission and online no-clip remain off.')+' Game presets and drafts are not saved or restored by profiles.';
    message(profileNotice);renderProfiles();
  }
  function profileAction(action){
    if(profileActionPending)return;
    const request={stopToken:profileStore?.snapshot().stopToken,selection:profileSelection?{...profileSelection}:null,name:ui.querySelector('#profile-name').value,networkConsent:ui.querySelector('#profile-network').checked===true,auto:ui.querySelector('#profile-auto').checked,settings:{...prefs,nos:false,dynoEnabled,dynoGoal:ui.querySelector('#dyno-goal').value}};
    const epoch=profileActionEpoch;
    // localStorage has no atomic compare-and-swap. Serialize named-profile
    // writes across tabs with a browser-managed lock; Stop remains immediate
    // and its independent marker invalidates any stale startup authorization.
    const execute=()=>{
      if(epoch!==profileActionEpoch)return;
      if(action==='auto'){
        const latest=profileStore?.refresh();
        if(!latest?.available||latest.stopToken!==request.stopToken){profileNotice='Stop or profile storage changed while waiting. Select a profile and request startup loading again.';renderProfiles();return;}
      }
      performProfileAction(action,request);
    };
    if(action==='load'){execute();return;}
    const locks=profileLocks();
    if(!locks){profileNotice='Profile editing needs browser storage locking, which is unavailable. No profile was changed.';renderProfiles();return;}
    profileActionPending=true;renderProfiles();
    try{
      const result=locks.request('nfsu2-driving-tools-profiles-v1-write',execute);
      if(result&&typeof result.then==='function')result.catch(()=>{if(epoch===profileActionEpoch)profileNotice='Could not lock profile storage. No profile change was confirmed.';}).finally(()=>{if(epoch===profileActionEpoch){profileActionPending=false;renderProfiles();}});
      else {profileActionPending=false;renderProfiles();}
    }catch{profileActionPending=false;profileNotice='Could not lock profile storage. No profile change was confirmed.';renderProfiles();}
  }
  function performProfileAction(action,request){
    const selected=request.selection;
    try{
      if(!profileStore)throw Error('Profiles are unavailable.');
      if(action==='save'||action==='update'){
        if(action==='update'&&!selected)throw Error('Select a saved profile first.');
        const saved=profileStore.save({id:action==='update'?selected.id:null,revision:action==='update'?selected.revision:null,name:request.name,settings:request.settings,networkConsent:request.networkConsent});
        profileSelection=saved;profileNotice='Saved '+saved.name+' locally in this browser. This profile will not load on startup until explicitly enabled.';
      }else if(action==='load'){
        if(!selected)throw Error('Select a saved profile first.');
        applyToolProfile(profileStore.load(selected.id,selected.revision));return;
      }else if(action==='delete'){
        if(!selected)throw Error('Select a saved profile first.');
        profileStore.remove(selected.id,selected.revision);profileSelection=null;ui.querySelector('#profile-name').value='';ui.querySelector('#profile-network').checked=false;profileNotice='Saved profile deleted. Current controls are unchanged; automatic loading for it is off.';
      }else if(action==='auto'){
        const enabled=request.auto;
        if(enabled&&!selected)throw Error('Select a saved profile first.');
        profileStore.setAuto(enabled?selected.id:null,enabled?selected.revision:null);
        if(enabled){
          // Clear the fallback latch only AFTER the requested saved revision was
          // authorized successfully; a stale/failed enable must not erase Stop.
          try{sessionStorage.removeItem(PROFILE_SESSION_STOP);if(sessionStorage.getItem(PROFILE_SESSION_STOP)==='1')throw Error();}
          catch{try{profileStore.setAuto(null);}catch{}throw Error('Cannot clear the Stop pause in this tab. Automatic loading remains blocked here; check storage before retrying.');}
          profileSessionStopped=false;
        }
        profileNotice=enabled?'Load on startup enabled for '+selected.name+'. Its saved choices, including separately saved network permission, will be requested after reload. F9 pauses this.':'Automatic profile loading is off. Current controls are unchanged.';
      }
    }catch(error){profileNotice=error.message||'Profile action failed. Nothing was loaded.';message(profileNotice);}
    renderProfiles();
  }
  function mount() {
    host = document.createElement('div'); host.id = 'nfsu2-driving-tools'; host.dataset.nfsu2Ui = '';
    host.addEventListener('keydown', e => e.stopPropagation());
    host.addEventListener('keyup', e => e.stopPropagation());
    Object.assign(host.style, { position: 'fixed', top: '8px', right: '8px', zIndex: '2147483647', width: '170px', maxWidth: 'calc(100vw - 16px)' });
    ui = host.attachShadow({ mode: 'closed' });
    // MAIN-world content scripts follow the page's CSP. A <style> element is
    // rejected by the game's style-src 'self'; use the CSSOM-supported sheet
    // instead, keeping styling scoped to this shadow root and CSP unchanged.
    const stylesheet = new CSSStyleSheet();
    stylesheet.replaceSync(`
:host{color-scheme:dark}*{box-sizing:border-box}[hidden]{display:none!important}button,input,select{font:inherit}button,summary{cursor:pointer}button,input,select,summary{-webkit-tap-highlight-color:transparent}button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid #8cdbb5;outline-offset:2px}
.shell{font:11px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#dde9e5;filter:none}button{color:inherit}.launcher{width:100%;height:29px;display:flex;align-items:center;gap:7px;padding:0 9px;background:#141e24;border:1px solid #50645e;border-radius:5px;color:#e3eee8;text-align:left}.mark{width:6px;height:6px;background:#9be8bc;border-radius:2px;box-shadow:0 0 8px #9be8bc35;flex:none}.title{font-size:11px;font-weight:650;white-space:nowrap}.badge{font-size:9px;color:#9bb4aa;margin-left:auto;white-space:nowrap}.arrow{color:#9bb4aa;font-size:10px;flex:none}.launcher[aria-expanded=true]{border-radius:5px 5px 0 0;border-bottom-color:#2a3b3b}
.panel{border:1px solid #50645e;border-top:0;border-radius:0 0 5px 5px;background:#141e24;max-height:calc(100vh - 48px);max-height:min(390px,calc(100dvh - 48px));overflow-y:auto;scrollbar-width:thin;scrollbar-color:#4e6860 #141e24}.toolbar{display:flex;align-items:center;gap:5px;padding:6px 8px;border-bottom:1px solid #2a3b3b;position:sticky;top:0;z-index:2;background:#141e24}.toolbar button{height:24px;flex:1;border:1px solid #3d5550;border-radius:3px;background:#20332f;font-size:10px}.toolbar button.stop{border-color:#60494c;background:#32272b;color:#e3afb3}.toolbar kbd{margin-left:4px;font-size:9px;color:#8eaaa0}.toolbar .stop kbd{color:#bc9095}.version{font-size:8px;color:#789289;line-height:1;white-space:nowrap;padding-left:2px}
.quick-stop{width:100%;min-height:26px;margin:4px 0 0;border:1px solid #bc6570;border-radius:4px;background:#452831;color:#ffe1e4;font-size:10px;font-weight:650}.quick-stop kbd{font:inherit;opacity:.8}
.group{border:0;border-bottom:1px solid #263737}.group>summary{display:flex;align-items:center;gap:8px;list-style:none;min-height:26px;padding:5px 9px;color:#c3d5ce;font-weight:550;font-size:11px}.group>summary::-webkit-details-marker,.help>summary::-webkit-details-marker{display:none}.group>summary::after{content:'›';font-size:13px;line-height:1;color:#78978c;margin-left:auto;transform:rotate(0deg)}.group[open]>summary{background:#1d2e2d;color:#a7e8c2}.group[open]>summary::after{transform:rotate(90deg);color:#9be8bc}.section-icon{width:4px;height:4px;border-radius:1px;background:#789c8d;flex:none}.group-body{padding:3px 9px 7px;background:#101a20}
.row{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:26px;padding:4px 0;margin:0;color:#d1dfd9}.row>span:first-child{min-width:0;flex:1}.row small,.state{display:block;max-width:100%;margin:1px 0 0;color:#849d93;font-size:9px;font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.row small{max-width:184px}#ai-state[data-unavailable="true"]{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere;line-height:1.45;color:#c5b591}.row-main{font-weight:550}.row input[type=checkbox]{appearance:none;width:25px;height:14px;margin:0;flex:none;border:1px solid #4d665b;border-radius:8px;background:#263a33;position:relative;cursor:pointer}.row input[type=checkbox]::before{content:'';position:absolute;left:2px;top:2px;width:8px;height:8px;background:#8ba69b;border-radius:50%}.row input[type=checkbox]:checked{background:#6cb68c;border-color:#8bcda7}.row input[type=checkbox]:checked::before{transform:translateX(11px);background:#10291f}
#autonomy-list{max-height:130px;overflow:auto}#autonomy-wait{width:58px;min-width:0;background:#1c2e27;color:#c5dfce;border:1px solid #3c5549;border-radius:3px;padding:4px}#autonomy-absence{max-width:112px}#autonomy-state{overflow-wrap:anywhere}
.slider{display:grid;grid-template-columns:1fr 40px;gap:0 6px;align-items:center;margin:0;padding:1px 0 5px;color:#9db6aa;font-size:9px}.slider>span{display:contents}.slider output{grid-column:2;grid-row:1;text-align:right;color:#bfe9cf;font:600 10px ui-monospace,SFMono-Regular,Consolas,monospace}.slider input{grid-column:1 / -1;width:100%;height:14px;margin:1px 0 0;accent-color:#91d3ad;cursor:pointer}.slider:has(input:disabled){opacity:.5}input:disabled,button:disabled,select:disabled{opacity:.4;cursor:default}
.help{margin:3px 0 1px;border-top:1px solid #263737;padding-top:2px}.help>summary{font-size:9px;list-style:none;display:flex;gap:5px;align-items:center;padding:4px 0;color:#839f92}.help>summary::before{content:'+';font:11px ui-monospace,monospace;color:#a4c3b2}.help[open]>summary::before{content:'−'}.help[open]>summary{color:#adcfba}.help p,.fine{font-size:9px;line-height:1.45;color:#90a89c;margin:4px 0}.warn{color:#c3b391}.help .row{font-size:10px}.inline-readout{padding:5px 6px;margin:4px 0;background:#1a2a2b;border-radius:3px;font-size:9px;color:#a6c3b3}.inline-readout strong{font-size:9px;font-weight:500;color:#badbc8}.inline-readout .state{white-space:normal;line-height:1.4}
select{max-width:140px;padding:4px 6px;border:1px solid #3c5549;border-radius:3px;background:#1c2e27;color:#c5dfce;font-size:10px}.dyno-buttons{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:6px 0}.dyno-buttons button{padding:5px 6px;border:1px solid #3e5b4c;border-radius:3px;background:#22372a;font-size:10px}.dyno-buttons button:nth-child(n+3){background:#192822;color:#a9c6b4}.dyno-buttons button:disabled{background:#192322}.tune-field{margin:8px 0}.tune-field label{display:flex;justify-content:space-between;gap:4px;font-size:10px}.tune-field input{width:100%}.tune-field output{color:#c5dfce;font-variant-numeric:tabular-nums}#tune-changes{white-space:pre-line;max-height:150px;overflow:auto;font-size:9px;line-height:1.45}#profile-name{width:100%;min-width:0;padding:5px 6px;margin:3px 0 6px;border:1px solid #3c5549;border-radius:3px;background:#1c2e27;color:#c5dfce;font-size:10px}.profile-name-label{font-size:10px;color:#b5cabe}#profile-state{white-space:normal;overflow-wrap:anywhere;font-size:10px;line-height:1.45;color:#b5d8c3}#dyno-state{white-space:normal;overflow-wrap:anywhere;max-height:62px;overflow:auto;font-size:9px;line-height:1.45;color:#a8c9b5}
.status{margin:0;padding:0 8px;background:#121b20}.status>summary{display:flex;gap:6px;align-items:center;padding:5px 0;list-style:none;min-height:24px;cursor:pointer}.status>summary::before{content:'';width:4px;height:4px;border-radius:50%;background:#759d86;flex:none}.status>summary::after{content:'ⓘ';font-size:10px;margin-left:auto;color:#708d7b}.status[open]>summary{border-bottom:1px solid #293c32}#live{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;color:#8fafa0;margin:0;flex:1;min-width:0}#note{margin:5px 0;color:#c5b591;font-size:10px;line-height:1.45;overflow-wrap:anywhere}.keys{font-size:9px;color:#708d7c;margin:4px 0 7px}.keys kbd{font:inherit;color:#a1c0ab}#hazards{font-size:9px;line-height:1.4;color:#a8c7b5;background:#1a2a23;padding:6px;border-radius:3px;overflow-wrap:anywhere}
.info-hud{position:absolute;right:0;top:35px;width:226px;max-width:calc(100vw - 16px);padding:8px 10px;border:1px solid #50645e88;border-radius:5px;background:#101a20d9;color:#c3d5ce;pointer-events:none;font-variant-numeric:tabular-nums;contain:layout style}.hud-heading{display:flex;justify-content:space-between;color:#8ba99b;font-size:9px;letter-spacing:.08em}.hud-heading kbd{font:inherit;letter-spacing:0;color:#789289}.hud-speedline{display:flex;align-items:baseline;gap:5px;padding:2px 0 1px}#hud-speed{color:#dbf2e4;font-size:24px;font-weight:650;line-height:1.2;letter-spacing:-.03em}#hud-unit{font-size:10px;color:#9bb4aa}#hud-context{margin-left:auto;font-size:9px;text-align:right;max-width:110px}.hud-readouts{margin:5px 0 0;padding-top:4px;border-top:1px solid #50645e44;display:grid;grid-template-columns:33px 1fr;gap:3px 5px;font-size:10px;line-height:1.4}.hud-readouts dt{color:#8ba99b}.hud-readouts dd{margin:0;text-align:right;overflow-wrap:anywhere;color:#c7e0d2}.hud-foot{font-size:8px;color:#8ba99b;line-height:1.35;margin:5px 0 0}#hud-state,#hud-governor{display:block;color:#c3b391}.hud-preference{padding:4px 9px;border-bottom:1px solid #263737;font-size:10px}.hud-preference small{font-size:8px}.hud-readouts,.hud-foot{user-select:none}
.info-hud{top:94px}.panel{max-height:min(390px,calc(100dvh - 109px))}
@media(max-height:280px){.info-hud{padding:5px 8px}.hud-foot{display:none}.hud-readouts{gap:1px 5px}}
@media(prefers-reduced-motion:no-preference){.row input[type=checkbox]::before{transition:transform .12s}.group>summary{transition:background .12s}}

/* Readable menu; the launcher and streaming overlays retain their footprint. */
.panel{position:absolute;right:0;top:100%;width:min(440px,calc(100vw - 16px));max-height:min(720px,calc(100dvh - 109px));font-size:13px}
.panel .toolbar{padding:9px 12px;gap:8px}.panel .toolbar button{height:34px;font-size:12px}.panel .toolbar kbd{font-size:10px}.panel .version{font-size:10px}
.panel .group>summary{min-height:42px;padding:10px 14px;font-size:14px}.panel .group-body{padding:7px 14px 12px}.panel .section-icon{width:5px;height:5px}
.panel .row{min-height:40px;gap:12px;padding:7px 0;font-size:13px}.panel .row small{max-width:none;font-size:11px;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.4}
.panel .row input[type=checkbox]{width:34px;height:20px;border-radius:12px}.panel .row input[type=checkbox]::before{width:12px;height:12px;left:3px;top:3px}.panel .row input[type=checkbox]:checked::before{transform:translateX(14px)}
.panel .slider{grid-template-columns:1fr 54px;gap:1px 8px;font-size:12px;padding:4px 0 9px}.panel .slider output{font-size:13px}.panel .slider input{height:22px}
.panel .help>summary{min-height:34px;font-size:12px;padding:7px 0}.panel .help p,.panel .fine{font-size:11px;line-height:1.5}.panel .inline-readout,.panel .inline-readout strong,.panel .state{font-size:11px}
.panel select{max-width:200px;font-size:12px;padding:7px}.panel .dyno-buttons{gap:8px}.panel .dyno-buttons button{min-height:36px;font-size:12px;padding:8px}.panel .hud-preference{padding:7px 0}.panel #autonomy-absence{max-width:185px}.panel #autonomy-list{max-height:180px}.panel #autonomy-wait{width:76px;font-size:12px}
.panel .menu-feedback{padding:10px 14px;background:#19282c;border-bottom:1px solid #385048;display:grid;gap:7px}.menu-feedback>div{display:grid;grid-template-columns:65px 1fr;gap:9px;align-items:baseline}.menu-feedback strong{font-size:11px;color:#9bd1b3;font-weight:600}.menu-feedback span{font-size:11px;line-height:1.45;color:#d1e2d9;white-space:normal;overflow-wrap:anywhere}.panel .menu-feedback #ai-state,.panel .menu-feedback #autonomy-state,.panel .menu-feedback #dyno-state{font-size:11px;margin:0;max-height:none;overflow:visible;white-space:normal;text-overflow:clip;color:#d1e2d9}
.tuner-dashboard{margin:4px 0 12px;padding:12px;border:1px solid #497560;border-radius:7px;background:linear-gradient(140deg,#1c3433,#131f29);font-variant-numeric:tabular-nums}.tuner-display-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#a9dbbf;font-size:11px;letter-spacing:.08em;font-weight:650}.tuner-display-heading span:last-child{letter-spacing:0;color:#d6e9df;font-size:11px;font-weight:500}.tuner-kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.tuner-kpis>div{padding:10px;border:1px solid #3e5c5666;border-radius:5px;background:#0f1d23b3;min-width:0}.tuner-kpis small{display:block;color:#98b5aa;font-size:10px;line-height:1.4}.tuner-kpis output{display:block;margin-top:3px;color:#e1f5e8;font:650 18px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:-.04em;overflow-wrap:anywhere}.panel #tune-display-note{font-size:10px;color:#96b5a7;margin:9px 0 0;line-height:1.45}
.panel #profile-name,.panel .profile-name-label,.panel #profile-state,.panel .tune-field label,.panel #tune-changes{font-size:12px}.panel .status>summary{min-height:34px}.panel #live{font-size:11px}.panel #note{font-size:12px}.panel .keys{font-size:11px}
@media(max-width:400px){.tuner-kpis output{font-size:16px;letter-spacing:-.045em}}
@media(max-height:420px){.panel{max-height:calc(100dvh - 109px)}.panel .menu-feedback{padding:7px 12px;gap:4px}}
${RaceHub?.styles||''}
${StreamHud?.styles||''}
${Pitwall?.styles||''}
`);
    ui.adoptedStyleSheets = [stylesheet];
    ui.innerHTML = `<div class="shell">
<button id="min" class="launcher" aria-expanded="false" aria-controls="tools-panel" title="Driving tools · F8 · Shift+Insert hides tools"><span class="mark" aria-hidden="true"></span><span class="title">Driving tools</span><span id="enabled" class="badge">Ready</span><span id="chevron" class="arrow" aria-hidden="true">▾</span></button>
<button id="quick-stop" class="quick-stop" type="button" title="Stop all driving tools and return control">STOP / TAKE CONTROL <kbd>F9</kbd></button>
<button id="race-hub-open" class="hub-launch" type="button" aria-expanded="false" aria-controls="race-hub">RACE HUB · R34</button>
${RaceHub?.markup()||''}
${StreamHud?.markup()?.replace('</section>',(Pitwall?.markup()||'')+'</section>')||''}
<section id="info-hud" class="info-hud" aria-label="Driving information HUD" aria-live="off">
<div class="hud-heading"><span>INFO HUD</span><kbd>F6 hide</kbd></div>
<div class="hud-speedline"><strong id="hud-speed">Unavailable</strong><span id="hud-unit"></span><span id="hud-context">Waiting for game</span></div>
<dl class="hud-readouts"><dt>Driver</dt><dd id="hud-driver">Waiting for live sample</dd><dt>Pace</dt><dd id="hud-pace">Not confirmed</dd><dt>Power</dt><dd id="hud-power">Off</dd></dl>
<p class="hud-foot">req = requested · ack = native acknowledgement<br>set = power fields, not a measured speed gain<span id="hud-governor" hidden></span><span id="hud-state">Waiting for live sample</span></p>
</section>
<div id="tools-panel" class="panel" hidden>
<div class="toolbar"><button id="take-control" title="Return to manual control">Manual <kbd>F7</kbd></button><button id="stop" class="stop" title="Stop driving assists">Stop <kbd>F9</kbd></button><span class="version">0.43.0-d739e631-draft.1</span></div>
<section class="menu-feedback" aria-label="Live tool feedback">
<div><strong>Driver</strong><span id="ai-state">Waiting for game</span></div>
<div><strong>Race loop</strong><span id="autonomy-state" role="status">Off; choose race starts in free roam</span></div>
<div><strong>Tuner</strong><span id="dyno-state" role="status">Off · original tune kept</span></div>
</section>
<details id="group-driver" class="group"><summary><span class="section-icon" aria-hidden="true"></span>Native AI driver</summary><div class="group-body">
<label class="row row-main"><span>Automatic driver<small>Native AI · includes free roam and Drag</small></span><input id="ai" type="checkbox" aria-describedby="ai-auto-risk"></label>
<label class="row"><span>Race-only automatic driver<small id="race-only-state">Off · current page only</small></span><input id="race-only-ai" type="checkbox" aria-describedby="race-only-help"></label>
<p id="race-only-help" class="fine">Starts native AI only in an active race, including Street X, Drag and Drift. Releases in free roam, outrun and results. Start/join events yourself. Online needs Allow network tools. This switch stays armed between races on this page; reload, profile Load, F7/F9 or race driving-key takeover turns it off. Not saved in profiles. Selecting either driver mode turns the other off.</p>

<details class="help"><summary>Free-roam tuning</summary>
<label class="row"><span>City clearance pacing<small id="city-pace-state">Off · current page only</small></span><input id="city-pace" type="checkbox" disabled aria-describedby="city-pace-help"></label>
<p id="city-pace-help" class="fine">Optional reductions for your already owned Automatic driver in ordinary online free roam. Requires Allow network tools. Your selected free-roam factor is the ceiling, including above 1×. Approximate observed wall/vehicle clearance can reduce the request; it recovers toward your selection after that reduction clears. Clear or unavailable observations retain your selection and do not prove the road is safe. No new steering, route following or collision guarantee. Session only: reload, Stop and profile Load turn it off; Manual leaves it dormant. Race, Street X, Drag, Drift and Outrun controls are unchanged.</p>
<label class="row"><span>Free-roam corner assist<small id="corner-state">Off · experimental · free roam only</small></span><input id="corner-assist" type="checkbox" aria-describedby="corner-risk"></label>
<label class="slider"><span>Planned corner speed <output id="corner-value" for="corner-factor">0.80×</output></span><input id="corner-factor" aria-label="Planned corner speed" type="range" value="0.8" min="0.6" max="0.95" step="0.05"></label>
<label class="slider"><span>Sharp-turn margin <output id="corner-margin-value" for="corner-margin">15%</output></span><input id="corner-margin" aria-label="Extra sharp-turn margin" type="range" value="15" min="0" max="25" step="5"></label>
<label class="row"><span>Free-roam pace<small id="ai-pace-state">Off · normal pace</small></span><input id="ai-pace" type="checkbox" aria-describedby="ai-pace-help"></label>
<label class="slider"><span>Target-speed factor <output id="pace-value" for="pace-factor">1.00×</output></span><input id="pace-factor" aria-label="Free-roam pace factor" type="range" value="1" min="0.75" max="3" step="0.05"></label>
<p id="corner-risk" class="fine">Lower factor = slower planned turns. Sharp-turn margin adds more slowing as upcoming bends tighten; 0% keeps the v0.13 calculation. Changes rebuild the native route. Not obstacle avoidance or new steering. Armed is not a confirmed reduction: straight plans, missing corner entries and rejected native checks do not add hits. Hover the status for route/check evidence. Free-roam corner assist does not tune road races; use the separate Road-race hairpin assist there. Diagnose at 1× pace; 0.95× means only 5% corner slowing.</p><p id="ai-pace-help" class="fine warn">Pace up to 3× is experimental; 2–3× can cause severe overspeed, missed turns or instability. Start at 1×. Neither control changes race or drag pace.</p>
</details>
<details class="help"><summary>Race / outrun tuning</summary>
<label class="row"><span><span id="rubberband-label">Race pace + catch-up</span><small id="rubberband-state">Off · current page only</small></span><input id="rubberband-enable" type="checkbox" disabled aria-describedby="rubberband-help"></label>
<label class="slider"><span>Paired race pace <output id="rubberband-value" for="rubberband-percent">1.00×</output></span><input id="rubberband-percent" aria-label="Paired race pace" type="range" value="100" min="100" max="200" step="5"></label>
<label class="slider"><span>Catch-up strength <output id="rubberband-strength-value" for="rubberband-strength">1.50×</output></span><input id="rubberband-strength" aria-label="Catch-up assistance strength" aria-describedby="rubberband-strength-state" type="range" value="1.5" min="1" max="10" step="0.25"></label>
<p id="rubberband-strength-state" class="fine" role="status">Strength applies to full physics and Drag. Rails uses pace only.</p>
<p id="rubberband-help" class="fine">Circuit, Sprint and URL use the selected pace. With Stay on rails, this changes speed targets only; Catch-up strength is unused. Drag and Street X with rails off use strength at neutral paired pace. Full-physics assistance requires matching native handling inputs and scales the native catch-up source for your owned AI car, including with game Catch Up / Rubberbanding off. Online requires Allow network tools. Stop, manual takeover and profile Load release the request. Custom power/grip pause while paired handling is active or restoring, and while Street X rails AI owns the car. Street X with rails off uses 1.00× actual pace when paired handling is selected; your custom factor stays saved.</p>
<label class="row"><span>Stay on rails<small id="rails-state">Selected · road races and Street X</small></span><input id="rails-enable" type="checkbox" disabled aria-describedby="rails-help"></label>
<p id="rails-help" class="fine">Keeps your race AI car on the game's simplified AI physics, the mode the opponents drive in, instead of dropping to full physics after the first contact. Circuit, Sprint, URL and Street X; online requires Allow network tools. On rails, Race pace + catch-up only raises speed targets with the Paired race pace slider (default 1.30×, Street X at most 1.15× including Custom race pace); there is no power or grip boost, and Catch-up strength is not used. Drag keeps the paired boost. If the car stops for 3 seconds the rails release so normal physics can recover it. Turn this off for the earlier behaviour. Drift, Drag, free roam and manual driving use their existing modes. Online adaptation has offline checks; live race behavior still needs verification.</p>
<label class="row"><span>Adaptive road-race speed<small id="adaptive-race-state">Off · session only</small></span><input id="adaptive-race" type="checkbox" disabled aria-describedby="adaptive-race-help"></label>
<label class="slider"><span>Straight ceiling <output id="adaptive-race-value" for="adaptive-race-ceiling">1.30×</output></span><input id="adaptive-race-ceiling" aria-label="Adaptive race straight ceiling" type="range" value="1.3" min="1" max="2" step="0.05"></label>
<p id="adaptive-race-help" class="fine">Optional continuous route-speed planning: every valid sampled nonzero bend gets a curvature-based target, with native distance-based braking. Exact straights keep the selected target ceiling. The native route can omit bends; this is not detection of every corner. With Race pace + catch-up off, uses the road-corner speed, sharp-turn margin and braking sliders below, even with their separate assist switch off. Existing saved switches and values stay unchanged. Street X keeps its existing controls; excludes Drag, Drift, Outrun and free roam. Online needs Allow network tools. Session only: off after reload, Stop or profile Load. No new steering, obstacle avoidance or NOS control. Start at 1.30×; higher targets can still cause crashes. Hook counters describe prior calls, not detection of the current corner.</p>
<p id="forward-race-state" class="fine" role="status">Forward road preview off · follows Adaptive in permitted road races</p>
<p id="native-target-state" class="fine" role="status" title="Observed setter input and output in uncalibrated native target units. The log includes cap request, guard reasons, sequence and age. This observation does not change driving.">Native target feedback · waiting for a road target</p>
<p class="fine">On the current verified build, Adaptive uses the road ahead while your AI owns Circuit, Sprint or URL driving with Stay on rails enabled. Online also requires Allow network tools. It includes gradual bends and accumulated 75°+ turns when the special corner list is empty. Paired catch-up uses its own corner policy; otherwise the sliders below adjust target planning. A validated limit can remain active while the next sample arrives; late or missing samples still expire after 100 ms of game time. Route gaps can still leave a corner unmeasured. Preview targets use native world units, not measured braking or grip limits. Live cornering improvement remains unverified.</p>
<label class="row"><span>Road-race hairpin assist<small id="race-corner-state">Off · experimental · online needs opt-in</small></span><input id="race-corner-assist" type="checkbox" aria-describedby="race-corner-risk"></label>
<label class="slider"><span>Race corner speed <output id="race-corner-value" for="race-corner-factor">0.80×</output></span><input id="race-corner-factor" aria-label="Road-race corner speed" type="range" value="0.8" min="0.6" max="0.95" step="0.05"></label>
<label class="slider"><span>Race sharp-turn margin <output id="race-corner-margin-value" for="race-corner-margin">15%</output></span><input id="race-corner-margin" aria-label="Road-race sharp-turn margin" type="range" value="15" min="0" max="25" step="5"></label>
<label class="slider"><span>Race braking factor <output id="race-braking-value" for="race-braking">0.75×</output></span><input id="race-braking" aria-label="Road-race braking factor, lower means earlier braking" type="range" value="0.75" min="0.5" max="1" step="0.05"></label>
<p id="race-corner-risk" class="fine warn">Experimental native race-AI tuning, not new steering. Lower corner speed and higher sharp-turn margin request slower turns; lower braking factor requests earlier braking. Keeps the selected straight-line race pace. Same settings for solo and opted-in online/LAN road races. Online/LAN requires Allow network tools; only your owned local AI car is eligible. Excludes outrun, drag and drift. Online cornering is unverified; follow server rules. Starts off after reload. Observed commands and counters are not proof of better live cornering; high pace can still miss turns.</p>
<label class="row"><span>Custom race pace<small id="race-pace-state">Off · 1.00× is normal</small></span><input id="race-pace" type="checkbox"></label>
<label class="slider"><span>Race target-speed factor <output id="race-pace-value" for="race-pace-factor">1.00×</output></span><input id="race-pace-factor" aria-label="Race and outrun pace factor" type="range" value="1" min="0.75" max="3" step="0.05"></label><p class="fine warn">2–3× pace is especially unstable and may cause crashes or missed turns. Default 1×. Street X rails limits the request to 1.15×; paired handling with rails off uses 1.00×. Your custom factor stays saved for other modes. Drag and Drift retain native pace.</p>
</details>
<details class="help"><summary>Driver limits &amp; takeover</summary><p id="ai-auto-risk">Automatic driving follows the current event. Drag uses the native Drag driver and engine protection; manual Drag assistance is under Advanced. Driving pauses in menus and when the game loses focus. F7 and driving keys return control; F9 stops all tools. Each race mode has its own supported pace and corner controls.</p><p>Start events yourself. F7 or driving keys outside this panel return control. Pauses in menus and when unfocused. No guaranteed routes, wins or career automation. Online/LAN requires its separate opt-in.</p></details>
</div></details>
<details id="group-autonomy" class="group"><summary><span class="section-icon" aria-hidden="true"></span>Race loop &amp; Drag lobbies</summary><div class="group-body">
<label class="row"><span>Visit open Drag lobbies</span><input id="autonomy-drag-discovery" type="checkbox"></label>
<label class="row"><span>Native AI cruise while finding Drag</span><input id="autonomy-cruise" type="checkbox" disabled></label>
<div class="dyno-buttons"><button id="autonomy-runway15" type="button" disabled>Runway 15 only</button></div>
<p id="autonomy-runway15-help" class="fine" aria-live="polite">Select normal Runway 15 only; wait there for an open lobby, race, return and repeat.</p>
<div id="autonomy-list" aria-label="Choose up to sixteen race starts"></div>
<label class="row"><span>When no host is available</span><select id="autonomy-absence"><option value="wait">Wait here</option><option value="rotate">Wait, then next start</option></select></label>
<label class="row"><span>Wait seconds</span><input id="autonomy-wait" type="number" min="5" max="3600" step="5" value="60" aria-label="Host wait seconds"></label>
<div class="toolbar"><button id="autonomy-start" type="button" disabled>Start selected loop</button><button id="autonomy-stop" class="stop" type="button" disabled>Stop / take control</button></div>
<p class="fine">Drives to selected city starts, stops, waits for a matching player host, joins, uses your existing race AI, and repeats after the game returns. Network permission stays separate. No host means it waits; it never creates a lobby. Session only. F7, F9 or driving keys take control. Route following and the complete live loop still need game verification.</p>
</div></details>
<details id="group-dyno" class="group"><summary><span class="section-icon" aria-hidden="true"></span>Race tuner &amp; ECU</summary><div class="group-body">
<section class="tuner-dashboard" aria-label="Native tune estimates">
<div class="tuner-display-heading"><span>TUNE PREVIEW</span><span id="tune-display-state">No preview</span></div>
<div class="tuner-kpis"><div><small>Peak power · kW</small><output id="tune-kpi-power">—</output></div><div><small>Peak torque · N·m</small><output id="tune-kpi-torque">—</output></div><div><small>0–60 estimate · seconds</small><output id="tune-kpi-accel">—</output></div><div><small>Top speed · km/h</small><output id="tune-kpi-speed">—</output></div></div>
<p id="tune-display-note">Native estimates · load settings to begin.</p>
</section>
<label class="row"><span>Enable preset tuner<small>Solo · no automatic Stage/save</small></span><input id="dyno-enable" type="checkbox" aria-describedby="dyno-risk"></label>
<p id="dyno-risk" class="fine warn">Back up progress first. Not live-tested.</p>
<p id="dyno-mode" class="fine">Choose a race mode in the game, then open the Dyno main screen.</p>
<label class="row"><span>Measured search</span><select id="dyno-goal" aria-label="Dyno tuning goal"><option value="peakPower">Peak power</option><option value="peakTorque">Peak torque</option><option value="acceleration60">0–60 estimate</option><option value="acceleration100">0–100 estimate</option><option value="topSpeed">Top-speed estimate</option></select></label>
<div class="dyno-buttons"><button id="dyno-find" disabled>Find tune</button><button id="dyno-cancel" disabled>Cancel</button><button id="dyno-apply" disabled>Stage selected preset</button><button id="dyno-restore" disabled>Restore</button></div>
<div id="ecu-recipe-controls"></div>
<div class="dyno-buttons"><button id="tune-load" disabled>Load settings</button><button id="tune-reset" disabled>Reset draft</button></div>
<details class="help" id="tune-editor"><summary>Full preset settings</summary>
<p>Edit suspension, gearing, downforce, tires, brakes, nitrous, ECU and turbo for the race preset selected in the game. Values are native slider positions from −100 to +100. Locked settings remain disabled. Drafts and native previews stay in private memory.</p>

<label class="row"><span>Category</span><select id="tune-group" aria-label="Tuning category" disabled><option value="suspension">Suspension</option><option value="gearing">Gearing</option><option value="aero">Downforce</option><option value="tires">Tires / brakes</option><option value="nos">Nitrous</option><option value="ecu">ECU</option><option value="turbo">Turbo</option></select></label>
${Array.from({length:9},(_,i)=>`<div id="tune-row-${i}" class="tune-field" hidden><label for="tune-input-${i}"><span id="tune-label-${i}"></span><output id="tune-value-${i}" for="tune-input-${i}"></output></label><input id="tune-input-${i}" type="range" min="-100" max="100" step="1" value="0" disabled></div>`).join('')}
<div class="dyno-buttons"><button id="tune-preview" disabled>Preview changes</button></div><p id="tune-changes">Load settings to begin.</p>
</details>
<details class="help"><summary>How it works</summary><p>Leave the game on the Performance Tuning main screen. The full editor supports all 41 fields. Peak search changes ECU/turbo; acceleration and speed searches include gearing, with up to 48 private trials. Suspension, grip, aero, brakes and nitrous are manual because these estimates do not measure their race benefit. No fastest-lap or automatic handling claim is made.</p><p>Cancel, close menu, blur, hidden tab or F9 stops search. A staged preset stays staged. Test Run refreshes the game’s driving physics. Use native Save Profile to persist; this extension does not confirm disk saves. Restore is only available for the same unchanged car, mode and parts. Driving effects pause during search.</p></details>
</div></details>
<details id="group-streaming" class="group"><summary><span class="section-icon" aria-hidden="true"></span>HUD &amp; cameras</summary><div class="group-body">
<label class="row hud-preference"><span>Info HUD <small>F6 · shown when this menu is closed</small></span><input id="info-hud-enable" type="checkbox" aria-label="Show driving information HUD"></label>
<label class="row hud-preference"><span>Pitwall display <small>Live driver and road feedback</small></span><input id="pitwall-enable" type="checkbox" aria-label="Show visual Pitwall feedback"></label>
<label class="row hud-preference"><span>Streaming HUD <small>Across the screen · stays in clean view</small></span><input id="stream-hud-enable" type="checkbox" aria-label="Show streaming HUD"></label>
<label class="row hud-preference"><span>Rotate camera <small>Random 45–120 seconds · Camera bound to C</small></span><input id="camera-rotate-enable" type="checkbox" aria-label="Rotate game camera every 45 to 120 seconds"></label>
<label class="row hud-preference"><span>Rear car radar <small>Half-circle · loaded cars behind you</small></span><input id="rear-radar-enable" type="checkbox" aria-label="Show rear car radar"></label>
<label class="row hud-preference"><span>Radar range <output id="radar-range-value">200 units</output></span><input id="radar-range" type="range" min="50" max="500" step="25" value="200" aria-label="Rear radar range in native units"></label>
<label class="row hud-preference"><span>Edit HUD layout <small>Drag panels · use − / + to resize</small></span><input id="hud-layout-enable" type="checkbox" aria-label="Edit HUD layout"></label>
<div class="dyno-buttons"><button id="hud-layout-reset" type="button">Reset HUD layout</button></div>
<p class="fine stream-help">Shift+Insert hides all tools. Your selected streaming HUD stays. F8 reopens controls; F9 stops assists.</p>
</div></details>
<details id="group-profiles" class="group"><summary><span class="section-icon" aria-hidden="true"></span>Saved tool profiles</summary><div class="group-body">
<label class="row"><span>Saved profile</span><select id="profile-select" aria-label="Saved tool profile"><option value="">Choose a saved profile</option></select></label>
<label class="profile-name-label" for="profile-name">Profile name</label><input id="profile-name" type="text" maxlength="48" autocomplete="off" placeholder="e.g. Solo driving">
<label class="row"><span>Restore network settings<small>Explicit permission for this profile</small></span><input id="profile-network" type="checkbox" aria-describedby="profile-network-help"></label>
<p id="profile-network-help" class="fine warn">Default off. Save / Update records this permission. Without it, Load leaves Allow network tools, online traffic and player no-clip off, even if they are currently on. Network tools may affect others or lead to a ban; follow server rules.</p>
<div class="dyno-buttons"><button id="profile-save" type="button">Save as new</button><button id="profile-update" type="button" disabled>Update selected</button><button id="profile-load" type="button" disabled>Load selected</button><button id="profile-delete" type="button" disabled>Delete selected</button></div>
<label class="row"><span>Load on startup<small>Selected saved profile · default off</small></span><input id="profile-auto" type="checkbox" disabled aria-describedby="profile-help"></label>
<p id="profile-state" role="status">Automatic loading is off.</p>
<details class="help"><summary>Profile storage &amp; safety</summary><p id="profile-help">Stores only these extension switches, numbers and tuner enable/search preference in this browser for nfsu2.xyz. No game setups, drafts, car data or diagnostic logs. Profiles do not Stage, Restore or Save game presets. Page scripts can access this local storage; it is not a private backup or browser sync. Up to 16 profiles, 48 characters per name.</p><p>Load stops old controllers and releases assisted input first. Saved choices still wait for the exact supported module, current car and each tool’s mode checks. Startup loading is optional and applies once per reload, never when another tab edits a profile. Updating an automatic profile disables its startup loading until selected again.</p><p>F9 stops driving tools, clears profile-requested drift reapplication and pauses startup loading; saved profiles stay intact. A drift toggle already sent to the game cannot be recalled, and native drift handling already on is not forcibly changed. Load manually to resume now, or select a profile and enable Load on startup to resume after reload. F7 takes manual control without deleting profiles.</p><p>Blowout protection is a saved user choice for the local current engine only. It does not repair an already blown engine or restore a lost race. Network use still requires this profile’s explicit network permission. Unless startup loading is enabled, normal per-tool reload defaults shown elsewhere still apply.</p></details>
</div></details>
<details id="group-power" class="group"><summary><span class="section-icon" aria-hidden="true"></span>Power &amp; speed</summary><div class="group-body">
<div class="row"><span>Synthetic near miss<small id="near-miss-state" role="status">Synthetic near miss unavailable on this game build</small></span><button id="near-miss-request" type="button" disabled aria-describedby="near-miss-state near-miss-help">Award once</button></div>
<label class="row"><span>Loop synthetic near misses<small id="near-miss-top-up-state" role="status">Off · one confirmed award at a time</small></span><input id="near-miss-top-up" type="checkbox" disabled aria-describedby="near-miss-top-up-state near-miss-help"></label>
<p id="near-miss-help" class="fine">Award once requests one synthetic near miss. Loop synthetic near misses repeats requests to top up NOS, confirming one award at a time. It waits while NOS is full and resumes after consumption. Awards also change style points and multipliers. The loop starts off for this page; F7/F9 stops it. Online also requires Allow network tools.</p>
<label class="row"><span>Engine power boost<small id="power-state">Off · not a vehicle-speed multiplier</small></span><input id="boost" type="checkbox"></label>
<label class="slider"><span>Power multiplier <output id="power-value" for="power">1.5×</output></span><input id="power" aria-label="Power multiplier" type="range" value="1.5" min="1" max="3" step="0.1"></label>
<label class="row"><span>Remove stock limiter</span><input id="unlimit" type="checkbox"></label>
<details class="help"><summary>Limits</summary><p>Power, limiter and grip reset off after reload. Their concurrent-write guards reduce known races but do not resolve the reported freezes. Test one at a time. More power may worsen wheelspin and handling. Gearing, drag and redline still limit speed. The power status reports field writes, not a measured speed increase. AI pace changes only its target speed and requires Automatic driver; it is separate from engine power. Online use requires Allow network tools. Normal game NOS use and earned near-miss credit are unchanged.</p></details>
</div></details>
<details id="group-handling" class="group"><summary><span class="section-icon" aria-hidden="true"></span>Handling &amp; collisions</summary><div class="group-body">
<label class="row"><span>Extra grip<small id="grip-state">Start at 1.3×</small></span><input id="grip" type="checkbox"></label>
<label class="slider"><span>Grip multiplier <output id="grip-value" for="grip-factor">1.3×</output></span><input id="grip-factor" aria-label="Grip multiplier" type="range" value="1.3" min="1" max="2" step="0.1"></label>
<label class="row"><span>Drift assist<small id="drift-state">Solo free roam only</small></span><input id="drift" type="checkbox"></label>
<label class="row"><span>Wall pass-through<small id="walls-state">Off · solo only</small></span><input id="walls" type="checkbox" aria-describedby="walls-risk"></label>
<label class="row"><span>Car no-clip<small id="cars-state">Off · other cars only · solo</small></span><input id="cars" type="checkbox" aria-describedby="cars-risk"></label>
<label class="row"><span>Online car no-clip<small id="online-all-state">Off · traffic, players and NPC rivals</small></span><input id="online-all" type="checkbox" disabled aria-describedby="online-all-help"></label>
<p class="help" id="online-all-help">Selects the three online car switches and Allow network tools together. Free roam covers verified traffic, players and NPC rivals. Outrun covers verified current challenge participants; online races cover verified race cars. Local contacts only. Resets on Stop, profile load and reload.</p>
<label class="row"><span>Online traffic no-clip<small id="traffic-state">Off · traffic only · online free roam</small></span><input id="traffic" type="checkbox" disabled aria-describedby="traffic-risk"></label>
<label class="row"><span>Online player / race no-clip<small id="players-state">Off · players, Outrun and race cars</small></span><input id="players" type="checkbox" disabled aria-describedby="players-risk"></label>
<label class="row"><span>Online NPC rival no-clip<small id="rivals-state">Off · NPC rivals / Outrun</small></span><input id="rivals" type="checkbox" disabled aria-describedby="rivals-help"></label>
<p class="help" id="rivals-help">Skips local contact with verified NPC rivals in online free roam and current NPC Outrun participants. Player contact uses its separate switch. Resets on Stop, profile load and reload.</p>
<details class="help"><summary>Handling &amp; collision risks</summary><p id="traffic-risk">Separate opt-in for NPC traffic in online free roam only. Player cars keep native collisions unless Online player no-clip is also enabled. Racers, walls and props remain unchanged; native Ghost settings are unchanged. Races, outruns and LAN are excluded. Latest reviewed build only. Starts off after reload; F9 stops it. Follow server rules. No live network test is claimed.</p><p id="players-risk">Separate opt-in for identified players in online free roam and verified current player Outrun participants. On the current reviewed build it also filters confirmed Online/LAN race cars when Allow network tools is enabled. Race mode checks both cars against the active race roster. Traffic and walls stay separate. Only local contacts are skipped; another player's view, network corrections and live race behavior are unverified. Native Ghost settings stay unchanged. Starts off after reload; F9 stops it. Turn off only when clear of cars. Follow server rules.</p><p id="cars-risk">Car no-clip is separate from walls and works only with confirmed car bodies. Ground, walls and props keep normal collisions unless wall pass-through is enabled. Turn off only when clear of other cars. It resets after reload.</p><p id="walls-risk">Experimental · solo only. Near-vertical static walls and barriers only. Ground, slopes and movable props remain solid. Cars stay solid unless Car no-clip is also enabled. May leave the map or miss checkpoints. Turn off only when clear of walls. Back up progress. F9 stops it.</p><p>Extra grip resets off after reload. High grip can cause abrupt handling or rollover and pauses in drift. Drift uses the game’s mode, not perfect-drift automation. Wall pass-through starts off after reload.</p></details>
</div></details>
<details id="group-drag" class="group"><summary><span class="section-icon" aria-hidden="true"></span>Drag AI &amp; engine protection</summary><div class="group-body">
<div class="inline-readout"><strong>Automatic drag AI</strong><span id="drag-ai-state" class="state">Use Automatic driver above</span></div>
<label class="row"><span>Disable Drag engine blowouts<small id="drag-no-blowout-state">Off · current player engine only</small></span><input id="drag-no-blowout" type="checkbox" disabled aria-describedby="drag-no-blowout-help"></label>
<p id="drag-no-blowout-help" class="fine">Stops your current engine overheating during active Drag. Online/LAN also requires Allow network tools; only your local engine is changed. No driving, shifting or NOS changes. Enable before the engine blows; does not restore a lost race.</p>
<details id="advanced-drag" class="help"><summary>Advanced · manual Drag assist</summary>
<label class="row"><span>Manual drag assist<small id="drag-state">Throttle + shifts · you steer</small></span><input id="drag" type="checkbox"></label>
<label class="slider"><span>Shift at RPM <output id="rpm-value" for="rpm">6500</output></span><input id="rpm" aria-label="Shift RPM" type="range" value="6500" min="3000" max="10000" step="100"></label>
<p>Manual assist stays paused while automatic AI is requested. It uses Arrow Up / Left Shift / Left Alt. You steer and avoid obstacles. Pick shift RPM for your car. F7 pauses assisted throttle until toggled again.</p>
</details>
<details class="help"><summary>Drag limits &amp; controls</summary><p id="drag-ai-risk">Automatic drag AI is not live-verified. Back up your progress. Starts after GO and full physics; may miss shifts, crash or stop. F7 takes control.</p></details>
</div></details>
<details id="group-diagnostics" class="group"><summary><span class="section-icon" aria-hidden="true"></span>Online &amp; diagnostics</summary><div class="group-body">
<details id="advanced-research" class="help"><summary>Advanced · research tools</summary>
<label class="row"><span>Traffic / barrier tester</span><input id="tester" type="checkbox"></label><p id="hazards" hidden></p>
<p class="fine">Read-only, incomplete obstacle detection.</p>
<details class="help"><summary>Native race geometry</summary>
<label class="row"><span>Record route samples<small>Offline race AI · session only · no controls enabled</small></span><input id="race-capture-enable" type="checkbox" disabled></label>
<p id="race-capture-state" role="status">Off · partial native windows</p><button id="race-capture-export" type="button">Export route samples</button>
<p class="fine">Analyzes gradual bends and 75°+ turns in fresh native samples. Missing corner records remain unknown. This recorder does not supply a complete route or enable automatic braking. Exact 93af6ccb build only.</p></details>
</details>
<details class="help"><summary>Crash log</summary><p id="diagnostic-state" role="status">Local diagnostics starting</p><div class="dyno-buttons"><button id="diagnostic-export" type="button">Export crash log</button><button id="diagnostic-clear" type="button">Clear log</button></div><p>Recent tool choices, game mode and errors stay in this tab. A small set of past AI-driving samples survives time in menus; these are historical observations. Clear log removes them too. Nothing is uploaded. Page scripts can access this storage. Browser/tab crashes may leave no final error; also use the game’s Download log. Export before closing this tab.</p></details>
<details id="group-session" class="help"><summary>Online / LAN opt-in</summary><label class="row"><span>Allow network tools<small id="online-state">Off · resets on reload</small></span><input id="online" type="checkbox" aria-describedby="online-risk"></label><p id="online-risk" class="fine warn">May affect other racers, trigger integrity checks, invalidate results or lead to a ban. Follow server rules. This does not bypass server restrictions.</p><p>Allows selected power, limiter, grip, AI/pace, road-race corner/braking assistance and drag tools. Wall pass-through and Car no-clip stay solo-only. Online traffic no-clip stays free-roam-only. Online player / race no-clip is a separate opt-in; current-build race filtering also needs this network permission. Drift stays free-roam-only.</p></details>
</div></details>
<details class="status" id="status-details"><summary id="status-summary" title="Show full status and notices"><span id="live" role="status">Waiting for game</span></summary><p id="note" role="status">Experimental. Back up progress before testing.</p><p class="keys"><kbd>F6</kbd> HUD · <kbd>F8</kbd> / <kbd>Shift+Insert</kbd> menu · <kbd>Esc</kbd> close<br>Drift and tester keep their own switches.</p></details>
</div></div>
`;
    note = ui.querySelector('#note'); live = ui.querySelector('#live');
    ui.querySelector('#race-capture-enable').addEventListener('change',e=>{try{if(e.target.checked)raceCapture?.start();else raceCapture?.stop();}catch(error){message(error.message);}updateRaceCapture();});
    ui.querySelector('#race-capture-export').addEventListener('click',()=>{if(!raceCapture?.samples.length){message('No native race samples recorded yet.');return;}const blob=new Blob([JSON.stringify(raceCapture.export(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='nfsu2-race-geometry.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    updateRaceCapture();
    ui.querySelector('#info-hud-enable').addEventListener('change',e=>setInfoHud(e.target.checked));
    ui.querySelector('#pitwall-enable').disabled=!Pitwall||!StreamHud;
    ui.querySelector('#pitwall-enable').addEventListener('change',e=>{pitwallEnabled=!!Pitwall&&!!StreamHud&&e.target.checked===true;renderInfoHud();renderStreamHud(true);});
    ui.querySelector('#stream-hud-enable').addEventListener('change',e=>{streamHudEnabled=e.target.checked===true;try{sessionStorage.setItem(STREAM_KEY,streamHudEnabled?'1':'0');}catch{}renderInfoHud();renderStreamHud(true);});
    ui.querySelector('#camera-rotate-enable').addEventListener('change',e=>setCameraRotation(e.target.checked));
    ui.querySelector('#rear-radar-enable').checked=rearRadarEnabled;
    ui.querySelector('#rear-radar-enable').addEventListener('change',e=>{rearRadarEnabled=e.target.checked===true;radarSample=null;radarAt=-Infinity;saveRadar();renderInfoHud();renderStreamHud(true);});
    ui.querySelector('#radar-range').value=radarRange;ui.querySelector('#radar-range-value').textContent=radarRange+' units';
    ui.querySelector('#radar-range').addEventListener('input',e=>{const value=Number(e.target.value);radarRange=Number.isFinite(value)?Math.max(50,Math.min(500,Math.round(value/25)*25)):200;e.target.value=radarRange;ui.querySelector('#radar-range-value').textContent=radarRange+' units';radarSample=null;radarAt=-Infinity;saveRadar();renderStreamHud(true);});
    ui.querySelector('#hud-layout-enable').addEventListener('change',e=>{hudEditing=e.target.checked===true;hudLayout?.setEditing(hudEditing);renderStreamHud(true);});
    ui.querySelector('#hud-layout-reset').addEventListener('click',()=>hudLayout?.reset());
    renderInfoHud();
    ui.querySelector('#profile-select').addEventListener('change',selectProfile);
    for(const action of ['save','update','load','delete'])ui.querySelector('#profile-'+action).addEventListener('click',()=>profileAction(action));
    ui.querySelector('#profile-auto').addEventListener('change',()=>profileAction('auto'));
    ui.querySelector('#diagnostic-export').addEventListener('click',exportDiagnostic);
    ui.querySelector('#diagnostic-clear').addEventListener('click',()=>{diagnostics?.clear();message('Local diagnostic history cleared. New activity will be recorded.');});
    ui.querySelector('#race-pace').addEventListener('change',e=>{prefs.racePace=e.target.checked;message(prefs.racePace?'Race / outrun pace enabled independently. Higher pace can worsen corners. Drag, Drift and dyno retain native pace.':'Race / outrun pace returned to normal.');});
    ui.querySelector('#race-corner-assist').addEventListener('change',e=>{prefs.raceCornerAssist=e.target.checked;message(prefs.raceCornerAssist?'Road-race hairpin assist requested. Native race AI and selected straight pace are retained. Live improvement is unverified.':'Road-race hairpin assist off.');});
    ui.querySelector('#corner-assist').addEventListener('change',e=>{prefs.cornerAssist=e.target.checked;message(prefs.cornerAssist?'Free-roam corner assist requested. The native driver will reset before using the new planned speed. This is experimental, not a proven steering fix.':'Free-roam corner assist off. Native driver reset requested.');});
    ui.querySelector('#dyno-enable').addEventListener('change',e=>{dynoEnabled=e.target.checked;if(!dynoEnabled)stopEcu('Preset tuner disabled');dyno?.setEnabled(dynoEnabled);dynoText=dynoEnabled?'Open the solo Performance Tuning main screen.':(dyno?.applied?'OFF · applied tune kept. Re-enable to restore previous.':'OFF · back up progress before testing');updateDynoUI();});
    ui.querySelector('#tune-load').addEventListener('click',()=>runDyno('load'));
    ui.querySelector('#tune-preview').addEventListener('click',()=>runDyno('preview'));
    ui.querySelector('#tune-reset').addEventListener('click',()=>{try{dyno?.resetDraft();dynoText='Draft reset to the loaded baseline. Game settings unchanged.';}catch(e){dynoText=e.message;}updateDynoUI();});
    ui.querySelector('#tune-group').addEventListener('change',()=>updateDynoUI());
    for(let i=0;i<9;i++)ui.querySelector('#tune-input-'+i).addEventListener('input',e=>{try{dyno?.setDraft(Number(e.target.dataset.offset),Number(e.target.value)+100);dynoText='Draft changed. Preview again before Apply.';}catch(error){dynoText=error.message;}updateDynoUI();});
    ui.querySelector('#dyno-find').addEventListener('click',()=>runDyno('find'));
    ui.querySelector('#dyno-apply').addEventListener('click',()=>runDyno('apply'));
    ui.querySelector('#dyno-restore').addEventListener('click',()=>runDyno('restore'));
    ui.querySelector('#dyno-cancel').addEventListener('click',()=>{dyno?.cancel();dynoText='Cancelling · waiting for the game';updateDynoUI();});
    ui.querySelector('#online').addEventListener('change', e => {if(soloOnlyBuild()){enforceSolo();message('Network tools are not available on this game build. The driving tools here are solo/offline only.');return;}prefs.online=e.target.checked;if(!prefs.online)suspend();message(prefs.online ? 'Online/LAN tools allowed on this page. Experimental: server checks may flag changes or reject results. F9 disables this mode.' : 'Online/LAN tools paused. Other selections are kept for solo play.');});
    ui.querySelector('#race-only-ai').addEventListener('change',e=>setRaceOnlyAI(e.target.checked));
    ui.querySelector('#ai').addEventListener('change', e => {stopAutonomy('Automatic driver selected');clearRaceOnlyAI();prefs.ai=e.target.checked;release();if(!prefs.ai){ai?.stop();try{clearPaceEvidence();}catch{}}message(prefs.ai ? 'Automatic AI requested: native AI for other races/free roam, experimental drag AI for drag. Drag waits for GO. Start events yourself. F7 or driving keys take control; online still needs its separate opt-in.' : 'Native AI off.');});
    ui.querySelector('#autonomy-runway15').addEventListener('click',()=>{
      const a=autonomyAvailability();if(a.locked)return;
      const choice=runway15Choice(a);if(!choice.destination){renderAutonomy();message(choice.reason);return;}
      autonomySelected.clear();autonomySelected.add(choice.destination.key);autonomyVisitDrag=false;autonomyCruise=false;
      ui.querySelector('#autonomy-absence').value='wait';renderAutonomy();publishAutonomyEvidence();
      message('Runway 15 only selected. Press Start selected loop to wait at its start for an open lobby, race, return and repeat.');
    });
    ui.querySelector('#autonomy-drag-discovery').addEventListener('change',e=>{if(autonomySnapshot?.active||autonomyStartPending)return;autonomyVisitDrag=e.target.checked===true;if(!autonomyVisitDrag)autonomyCruise=false;renderAutonomy();});
    ui.querySelector('#autonomy-cruise').addEventListener('change',e=>{if(autonomySnapshot?.active||autonomyStartPending||!autonomyVisitDrag)return;autonomyCruise=e.target.checked===true;renderAutonomy();});
    ui.querySelector('#autonomy-start').addEventListener('click',()=>{if(!autonomyAvailability().enabled)return;prefs.ai=false;clearRaceOnlyAI();ai?.stop();release();savePrefs();ui.querySelector('#ai').checked=false;setPanel(false);autonomyStartPending=true;autonomyStartUntil=performance.now()+AUTONOMY_START_MS;renderAutonomy();publishAutonomyEvidence();message('Race loop requested; waiting for manual handback and current race starts.');});
    ui.querySelector('#autonomy-stop').addEventListener('click',()=>takeControl());
    ui.querySelector('#take-control').addEventListener('click',takeControl);
    ui.querySelector('#race-hub-open').disabled=!RaceHub;
    ui.querySelector('#race-hub-open').addEventListener('click',()=>setRaceHub(!hubOpen));
    if(RaceHub){
    if(RaceShowcase){
    ui.querySelector('#showcase-mark')?.addEventListener('click',()=>{const age=performance.now()-(infoHudSample?.at??-Infinity),d=age>=0&&age<=500&&infoHudSample?.data?.ready===true&&infoHudSample?.data?.supported===true?infoHudSample.data:{},type=RaceCatalog?.classify(d.trackId,{drag:infoHudSample?.context?.drag===true,drift:infoHudSample?.context?.drift===true,roam:infoHudSample?.context?.roam===true,outrun:d.raceType===7});showcaseHighlights?.mark({trackId:d.trackId,raceType:type});renderRaceHub(true);});
    ui.querySelector('#showcase-export')?.addEventListener('click',()=>{const data=RaceShowcase.exportData({...showcaseInput(),stats:raceStats?.snapshot()||{},state:hubRuntime}),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='nfsu2-stream-scorecard.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    ui.querySelector('#showcase-profile-mode')?.addEventListener('change',renderShowcaseProfiles);
    ui.querySelector('#showcase-profile-select')?.addEventListener('change',renderShowcaseProfiles);
    ui.querySelector('#showcase-profile-save')?.addEventListener('click',()=>{try{ui.querySelector('#profile-name').value=RaceShowcase.profileName(ui.querySelector('#showcase-profile-mode').value,ui.querySelector('#showcase-profile-name').value);ui.querySelector('#profile-network').checked=ui.querySelector('#showcase-profile-network').checked===true;profileAction('save');}catch(error){ui.querySelector('#showcase-profile-state').textContent=error.message;}});
    ui.querySelector('#showcase-profile-load')?.addEventListener('click',()=>{const row=showcaseProfileRows.find(row=>row.id===ui.querySelector('#showcase-profile-select').value);if(!row)return;profileSelection={...row};profileAction('load');});
    }
    ui.querySelector('#race-hub-close')?.addEventListener('click',()=>setRaceHub(false));
    ui.querySelector('#race-hub-stop')?.addEventListener('click',()=>stop());
    ui.querySelector('#race-hub-clear')?.addEventListener('click',()=>{raceStats?.clear();renderRaceHub(true);const node=ui.querySelector('#hub-notice');if(node)node.textContent='Local driving statistics cleared.';});
    ui.querySelector('#race-hub-export')?.addEventListener('click',()=>{
      if(!raceStats)return;
      const data={format:'NFSU2 Driving Tools observed race statistics',exportedAt:Date.now(),...raceStats.snapshot()},blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='nfsu2-race-stats.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);const node=ui.querySelector('#hub-notice');if(node)node.textContent='Stats download requested.';
    });
    }
    ui.querySelector('#quick-stop').addEventListener('click',()=>stop());
    ui.querySelector('#city-pace').addEventListener('change',event=>{
      cityPacingEnabled=event.target.checked===true&&!!cityPacer&&supported&&moduleProfile?.capabilities.ai===true&&moduleProfile?.capabilities.pace===true;
      cityPacer?.reset();renderCityPace({state:!cityPacingEnabled?'off':prefs.online!==true?'network-permission':'not-online'});
      message(cityPacingEnabled?'Online city clearance slowing selected. Requires current local Automatic AI ownership, ordinary online free roam and Allow network tools.':'Online city clearance slowing off. Saved driving settings are kept.');
    });
    renderCityPace();
    ui.querySelector('#adaptive-race').addEventListener('change',e=>{adaptiveRaceEnabled=e.target.checked===true&&supported&&moduleProfile?.capabilities.nativeDragInputHandoff===true&&moduleProfile?.capabilities.corner===true&&moduleProfile?.capabilities.pace===true;e.target.checked=adaptiveRaceEnabled;clearPaceEvidence();message(adaptiveRaceEnabled?'Adaptive road-race speed requested. Native route planning uses the road-corner and braking sliders; Street X keeps its existing controls.':'Adaptive speed off. Existing saved driving settings resume after native handoff.');});
    ui.querySelector('#rubberband-enable').addEventListener('change',e=>{rubberbandEnabled=e.target.checked===true&&supported&&moduleProfile?.capabilities.nativePacedCatchup===true;if(rubberbandEnabled&&!prefs.ai&&!raceOnlyAI)setRaceOnlyAI(true);if(!rubberbandEnabled)stopRubberband(true);clearPaceEvidence();renderRubberband();recordDiagnostic('tools',{tools:diagnosticTools()});message(rubberbandEnabled?(railsEnabled&&moduleProfile?.capabilities.nativeRails===true?'Race assistance selected. Rails road races use Paired race pace only; Catch-up strength is kept for full physics and Drag.':'Pace-linked native catch-up selected. Extra pace waits for matching tire-force publication.'):'Paired catch-up off requested; restoration remains pending until native publication.');});
    ui.querySelector('#rubberband-percent').addEventListener('input',e=>{rubberbandPercentTouched=true;const n=Number(e.target.value);rubberbandPercent=Number.isFinite(n)&&e.target.value!==''?Math.round(Math.max(100,Math.min(200,n))/5)*5:100;e.target.value=rubberbandPercent;ui.querySelector('#rubberband-value').textContent=(rubberbandPercent/100).toFixed(2)+'×';clearPaceEvidence();recordDiagnostic('tools',{tools:diagnosticTools()});});
    ui.querySelector('#rubberband-strength').addEventListener('input',e=>{if(e.target.disabled){e.target.value=rubberbandStrength;return;}const n=Number(e.target.value);rubberbandStrength=Number.isFinite(n)&&e.target.value!==''?Math.round(Math.max(1,Math.min(10,n))*4)/4:1.5;e.target.value=rubberbandStrength;ui.querySelector('#rubberband-strength-value').textContent=rubberbandStrength.toFixed(2)+'×';renderRubberband();clearPaceEvidence();recordDiagnostic('tools',{tools:diagnosticTools()});});
    ui.querySelector('#rails-enable').addEventListener('change',e=>{railsEnabled=e.target.checked===true&&supported&&moduleProfile?.capabilities.nativeRails===true;e.target.checked=railsEnabled;railsWatch=newRailsWatch();if(!rubberbandPercentTouched&&moduleProfile?.capabilities.nativeRails===true){rubberbandPercent=railsEnabled?RAILS_DEFAULT_PERCENT:100;syncRubberbandControls();}clearPaceEvidence();renderRails();renderRubberband();recordDiagnostic('tools',{tools:diagnosticTools()});message(railsEnabled?'Stay on rails selected: your race AI car keeps the simplified AI physics in road races and Street X; online requires Allow network tools. Catch-up raises speed targets only.':'Rails off: the car uses full physics after its first contact, with the paired catch-up boost as before.');});
    syncRubberbandControls();renderRails();
    ui.querySelector('#adaptive-race-ceiling').addEventListener('input',e=>{const n=Number(e.target.value);adaptiveRaceCeiling=Number.isFinite(n)&&e.target.value!==''?Math.round(Math.max(1,Math.min(2,n))*20)/20:1.3;e.target.value=adaptiveRaceCeiling;ui.querySelector('#adaptive-race-value').textContent=adaptiveRaceCeiling.toFixed(2)+'×';e.target.setAttribute('aria-valuetext',adaptiveRaceCeiling.toFixed(2)+' times');clearPaceEvidence();recordDiagnostic('tools',{tools:diagnosticTools()});});
    ui.querySelector('#ai-pace').addEventListener('change', e => { prefs.aiPace=e.target.checked; message(prefs.aiPace ? 'Custom AI pace enabled for native AI only. Higher pace may worsen cornering and cause crashes. Start at 1.00×.' : 'Custom AI pace off. Native AI will use its normal target-speed factor.'); });
    ui.querySelector('#cars').addEventListener('change', e => {prefs.cars=e.target.checked;if(!prefs.cars)cars?.stop();message(prefs.cars?'Car no-clip requested. Other cars only, solo. Keep clear of other cars before switching it off.':'Car no-clip off. Normal car collisions resume.');});
    ui.querySelector('#traffic').disabled=true;
    ui.querySelector('#players').disabled=true;
    ui.querySelector('#players').addEventListener('change', e => {prefs.players=e.target.checked===true&&moduleProfile?.capabilities?.onlinePlayers===true;e.target.checked=prefs.players;if(!prefs.players)cars?.stop();message(prefs.players?'Online player / race no-clip selected. Race filtering also needs Allow network tools and the current reviewed build. Local contacts only; other players may see collisions. Traffic and walls stay separate.':'Online player no-clip off. Native player-car collisions resume.');});
    ui.querySelector('#online-all').addEventListener('change',e=>setAllOnlineCars(e.target.checked));
    ui.querySelector('#rivals').addEventListener('change', e => {onlineRivalsEnabled=e.target.checked===true&&moduleProfile?.capabilities?.onlineRivals===true;e.target.checked=onlineRivalsEnabled;if(!onlineRivalsEnabled)cars?.stop();message(onlineRivalsEnabled?'NPC rival no-clip selected. Allow network tools is required.':'NPC rival no-clip off.');});
    ui.querySelector('#traffic').addEventListener('change', e => {prefs.traffic=e.target.checked===true&&moduleProfile?.capabilities?.onlineTraffic===true;e.target.checked=prefs.traffic;if(!prefs.traffic)cars?.stop();message(prefs.traffic?'Online traffic no-clip requested for NPC traffic in online free roam only. Player cars need the separate player switch; AI racers keep native collisions. Follow server rules; turn off only when clear of traffic.':'Online traffic no-clip off. Normal traffic collisions resume.');});
    ui.querySelector('#walls').addEventListener('change', e => {prefs.walls=e.target.checked;if(!prefs.walls)wall?.stop();message(prefs.walls?'Wall pass-through requested. Solo only: turn Free roam with others off, or use a solo race. Near-vertical static walls only; keep a save backup.':'Wall pass-through off. Normal wall collisions resume.');});
    ui.querySelector('#drag-no-blowout').addEventListener('change',e=>{prefs.dragNoBlowout=e.target.checked===true&&moduleProfile?.capabilities.nativeDragOverheat===true;e.target.checked=prefs.dragNoBlowout;savePrefs();message(prefs.dragNoBlowout?'Drag engine blowout protection requested for your current car. Online/LAN also needs Allow network tools. Driving and NOS decisions are unchanged.':'Normal Drag engine overheating restored.');});
    ui.querySelector('#near-miss-request').addEventListener('click',()=>{const loop=nearMissTopUp?.status();if(loop?.enabled||loop?.pending)return;nearMiss?.request();renderNearMiss();message(nearMiss?.status().text||'Synthetic near miss unavailable on this game build');});
    ui.querySelector('#near-miss-top-up').addEventListener('change',e=>{nearMissTopUp?.setEnabled(e.target.checked);renderNearMiss();message(nearMissTopUp?.status().text||'NOS top-up unavailable');});
    ui.querySelector('#grip').addEventListener('change', e => { prefs.grip=e.target.checked; message(prefs.grip ? 'Extra grip enabled. Start at 1.3×; it pauses during drift. Too much grip can cause abrupt handling or rollover.' : 'Extra grip off. Original wheel factors are restored.'); });
    ui.querySelector('#boost').addEventListener('change', e => { prefs.boost=e.target.checked; message('Power boost is experimental. Start at 1.5×; turn it off if wheelspin or handling gets worse.'); });
    ui.querySelector('#unlimit').addEventListener('change', e => { prefs.unlimit=e.target.checked; });
    ui.querySelector('#drag').addEventListener('change', e => { prefs.drag = e.target.checked; dragTakenOver=false; if (!prefs.drag) release(); else message('Experimental drag assist enabled. You must steer. Default keyboard bindings required.'); });
    ui.querySelector('#tester').addEventListener('change', e => { prefs.tester = e.target.checked; ui.querySelector('#hazards').hidden = !prefs.tester; ui.querySelector('#hazards').textContent = 'Waiting for a supported game and driving state…'; });
    ui.querySelector('#drift').addEventListener('change', e => { const wanted = e.target.checked; profileDriftChoice=false;prefs.drift=wanted;savePrefs();const state=engine && statusPtr ? engine.status(statusPtr) : null;if(!state || (state.drive & 3)!==2){driftNeedsReapply=true;message('Drift choice saved. It will be requested when solo free roam is available.');}else setDrift(wanted); const status=engine && statusPtr ? engine.status(statusPtr) : null; e.target.checked=driftNeedsReapply ? !!prefs.drift : !!(status?.drift & 1); });
    ui.querySelector('#stop').addEventListener('click', () => stop());
    ui.querySelector('#min').addEventListener('click', () => setPanel(!visible));
    const groupIds=["group-driver","group-autonomy","group-dyno","group-streaming","group-profiles","group-power","group-handling","group-drag","group-diagnostics"];
    for(const id of groupIds) ui.querySelector('#'+id).addEventListener('toggle',()=>{
      if(ui.querySelector('#'+id).open) for(const other of groupIds) if(other!==id) ui.querySelector('#'+other).open=false;
    });
    for(const id of ['drag','tester','boost','unlimit','grip']) ui.querySelector('#'+id).checked=prefs[id];
    
    renderNearMiss();
    ui.querySelector('#drag-no-blowout').checked=prefs.dragNoBlowout;
    ui.querySelector('#ai-pace').checked=prefs.aiPace;
    for(const [id,name,output,min,max,step,fallback,digits,suffix] of [
      ['race-corner-factor','raceCornerFactor','race-corner-value',0.6,0.95,0.05,0.8,2,'×'],
      ['race-corner-margin','raceCornerMargin','race-corner-margin-value',0,25,5,15,0,'%'],
      ['race-braking','raceBraking','race-braking-value',0.5,1,0.05,0.75,2,'×'],
      ['race-pace-factor','racePaceFactor','race-pace-value',0.75,3,0.05,1,2,'×'],
      ['corner-factor','cornerFactor','corner-value',0.6,0.95,0.05,0.8,2,'×'],
      ['corner-margin','cornerMargin','corner-margin-value',0,25,5,15,0,'%'],
      ['pace-factor','paceFactor','pace-value',0.75,3,0.05,1,2,'×'],
      ['power','power','power-value',1,3,0.1,1.5,1,'×'],
      ['grip-factor','gripFactor','grip-value',1,2,0.1,1.3,1,'×'],
      ['rpm','rpm','rpm-value',3000,10000,100,6500,0,'']
    ]) {
      const input=ui.querySelector('#'+id),value=ui.querySelector('#'+output);
      const update=()=>{
        const raw=Number(input.value),bounded=Number.isFinite(raw)&&input.value!==''?Math.max(min,Math.min(max,raw)):fallback;
        prefs[name]=Number((min+Math.round((bounded-min)/step)*step).toFixed(digits));
        input.value=prefs[name];value.textContent=prefs[name].toFixed(digits)+suffix;
        input.setAttribute('aria-valuetext',prefs[name].toFixed(digits)+(suffix==='%'?' percent':suffix?' times':' RPM'));
      };
      input.value=prefs[name];update();
      input.addEventListener('input',()=>{cancelForward();update();savePrefs();});
      input.addEventListener('change',update);
    }
    if(typeof prefs.drift==='boolean') ui.querySelector('#drift').checked=prefs.drift;
    ui.querySelector('#hazards').hidden=!prefs.tester;
    ui.addEventListener('change',event=>{const displayOnly=['info-hud-enable','pitwall-enable','stream-hud-enable','camera-rotate-enable','rear-radar-enable','radar-range','hud-layout-enable'].some(id=>event.target===ui.querySelector('#'+id));if(!displayOnly)cancelForward();savePrefs();recordDiagnostic('tools',{tools:diagnosticTools()});if(!displayOnly)clearInfoHud('Settings changed · waiting for fresh sample');});
    ui.addEventListener('input',event=>{if(event.target?.type==='range')clearInfoHud('Settings changed · waiting for fresh sample');});
    const parent = document.fullscreenElement || document.body; parent.append(host);
    ecuUi=globalThis.__NFSU2_ECU_SCOPE_UI__?.mount(ui.querySelector('#ecu-recipe-controls'),{getController:()=>ecu,beforeAction:()=>suspend(undefined,{keepEcu:true}),onDiagnostic:recordEcuDiagnostic})||null;
    ui.querySelector('#group-dyno').addEventListener('toggle',()=>{if(!ui.querySelector('#group-dyno').open)stopEcu('Tuner section closed');});
    try{let layoutStorage=null;try{layoutStorage=localStorage;}catch{}hudLayout=globalThis.__NFSU2_HUD_LAYOUT__?.create(ui,{storage:layoutStorage})||null;}catch{}
    document.addEventListener('fullscreenchange', () => { (document.fullscreenElement || document.body).append(host); });
    // Explicit startup profile is applied only once, after all controls exist.
    if(profileStartup)profileStartup=profileSessionStopped?null:profileStore.startup();
    if(profileStartup){profileSelection=profileStartup.profile;ui.querySelector('#profile-name').value=profileSelection.name;ui.querySelector('#profile-network').checked=profileSelection.networkConsent;applyToolProfile(profileStartup,true);profileStartup=null;}
    renderProfiles();
    updateDynoUI();
    timer = setInterval(tick, 50);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount, { once: true });
})();
