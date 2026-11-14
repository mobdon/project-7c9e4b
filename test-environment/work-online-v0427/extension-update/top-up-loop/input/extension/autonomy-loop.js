/* Selected hosted-start loop. JOIN is a typed action carrying one exact
 * host/lobby/event tuple. This module has no hosting or generic Enter action. */
(function(root){
'use strict';
// Exact native race record byte +0x0f: roam_game.c race_kind/race_net_mode.
const DRAG_TYPE=4,OFF=Object.freeze({raceAI:false,keys:Object.freeze([])}),MAX=16,JOIN_MS=12000,LATE_MS=35000,COHERENCE_MS=1000;
const TRANSIENT_REASONS=Object.freeze(['snapshot-changed','host-snapshot-changed']);
const DRIVE_REASONS=Object.freeze({'Driving observation stalled':'travel-observation-stalled','Travel interrupted; manual control':'travel-interrupted','The native road snapshot changed':'road-changed','Driving sample unavailable':'travel-sample-unavailable','Game clock stopped':'game-clock-stopped','Travel timed out':'travel-timeout','Car stopped making route progress':'travel-no-progress','Car left the selected start':'arrival-lost','Car left the planned road':'road-deviation','Driving to selected start':'travel','Stopped at selected start; confirming arrival':'arrival-settling','At selected start; stopping':'arrival-braking','Stopped at selected start; waiting for host':'waiting-host'});
const REASON_CODES=Object.freeze(['off','stopped','start-quarantine','start-unavailable','solo-unsupported','cruise-needs-discovery','manual-handback','discovery-cruise','discovery-parked','target-unavailable','route-plan-failed','route-unavailable','travel-refused','travel','return-quarantine','observation-stalled','context-interrupted','host-owned-lobby','lobby-mismatch','race-driver-unconfirmed','race-loading-timeout','lobby-return-uncertain','join-timeout','join-pending','host-acceptance','lobby-wait','countdown','race-active','race-results','race-loading','unowned-event','world-changed','destination-changed','next-offer','travel-stopped','waiting-host','join-dispatch-uncertain','join-dispatched','offer-changed','solo-dispatch-uncertain','solo-requested','solo-refused','next-start','coherence-wait','coherence-revalidate','coherence-handback','coherence-frame','coherence-timeout','coherence-context-changed','coherence-tick-reset',...Object.values(DRIVE_REASONS)]);
const uint=n=>Number.isInteger(n)&&n>0&&n<=0xffffffff;
function semantic(d){return d&&uint(d.eventHash)&&uint(d.markerHash)&&Number.isInteger(d.track)&&d.track>0&&Array.isArray(d.box)&&d.box.length===4&&d.marker?[d.eventHash,d.markerHash,d.track,d.reverse||0,d.laps||0,...d.box,d.marker.x,d.marker.y,d.marker.z].join(':'):null;}
function create({port,drive,clock=()=>performance.now(),onChange=()=>{}}={}){
 let active=false,phase='off',reason='Off; choose race starts',reasonCode='off',selected=[],order=[],index=0,round=0,completedTrips=0,pending=null,quarantineUntil=0,lastNow=null,waitingAt=null,current=null,targetOffer=null,world=null,cityIdentity=null,lastFreshTick=null,pause=null,tripSeen=false,raceSeen=false,tripAt=null,driverMissingAt=null,options={absence:'wait',waitMs:60000,soloFallback:false,visitDrag:false,cruise:false},intent=OFF,stopping=false;
 const status=()=>({active,phase,reason,reasonCode,selected:selected.length,index,round,completedTrips,pending:!!pending,quarantineUntil,current,targetLocked:!!targetOffer,pauseReason:pause?.reason||null,pauseRemainingMs:pause?Math.max(0,Math.min(COHERENCE_MS,pause.until-lastNow)):0,resumePhase:pause?.from||null,options:{...options},intent});
 const changed=()=>{onChange(status());return status();};
 function stop(why='Stopped; manual control',code='stopped'){
  if(stopping)return status();stopping=true;active=false;phase='stopped';reason=why;reasonCode=REASON_CODES.includes(code)?code:'stopped';intent=OFF;waitingAt=null;targetOffer=null;pause=null;options.visitDrag=false;options.cruise=false;try{drive?.stop(why);}finally{try{port?.release?.();}finally{stopping=false;}}pending=null;return changed();
 }
 function choose(destinations){if(active||!Array.isArray(destinations)||destinations.length>MAX)return false;const keys=destinations.map(semantic);if(keys.some(k=>!k)||new Set(keys).size!==keys.length)return false;selected=JSON.parse(JSON.stringify(destinations));return true;}
 function safeContext(s){return s?.focused===true&&!s.hidden&&!s.manualInput&&!s.tunerBusy&&!s.menu&&(!s.network||s.allowNetwork===true);}
 function safe(s){return s?.verified===true&&s.fresh===true&&safeContext(s);}
 function available(s,d){const key=semantic(d),rows=s.catalog?.filter(r=>semantic(r)===key);return rows?.length===1?rows[0]:null;}
 function sameOffer(a,b){return a&&b&&a.host===b.host&&a.lobby===b.lobby&&a.eventHash===b.eventHash&&a.destinationKey===b.destinationKey;}
 function offersAt(s,d){return(s.offers||[]).filter(o=>o.fresh===true&&uint(o.host)&&uint(o.lobby)&&o.host!==s.self&&o.eventHash===d.eventHash&&o.destinationKey===d.key&&o.open===true&&o.eligible===true&&Number.isInteger(o.players)&&Number.isInteger(o.maximum)&&o.players>=1&&o.players<o.maximum&&o.maximum>=2&&o.maximum<=6);}
 function drag(d){return d?.rawType===DRAG_TYPE&&Number.isInteger(d.raceFlavor)&&d.raceFlavor>=0&&d.raceFlavor<=255&&d.raceFlavor!==2;}
 function discovered(s){
  for(const d of s.catalog||[]){if(!drag(d)||!semantic(d)||!available(s,d))continue;const offers=offersAt(s,d);for(const o of offers)if(offers.filter(other=>sameOffer(o,other)).length===1)return{destination:d,offer:o};}return null;
 }
 function targetPresent(s){const d=current&&available(s,current);return drag(d)&&offersAt(s,d).filter(o=>sameOffer(o,targetOffer)).length===1;}
 function waitForTarget(now){drive.stop('Discovered Drag host is unavailable');intent=OFF;phase='discovery-wait';reason='Drag host disappeared; waiting for the same fresh lobby';reasonCode='target-unavailable';if(waitingAt===null)waitingAt=now;}
 function start(s,settings={}){
  if(active)return false;const now=clock(),o={absence:settings.absence??'wait',waitMs:settings.waitMs??60000,soloFallback:settings.soloFallback===true,visitDrag:settings.visitDrag===true,cruise:settings.cruise===true};
  if(!safe(s)||s.inRoam!==true||s.state!==0||!selected.length&&!o.visitDrag||selected.length>MAX||now<quarantineUntil||s.standaloneAI||!Number.isFinite(now)||!['wait','rotate'].includes(o.absence)||!Number.isInteger(o.waitMs)||o.waitMs<5000||o.waitMs>3600000||selected.some(d=>!available(s,d))){reason=now<quarantineUntil?'Waiting for late host acceptance quarantine':'Choose current starts or Drag discovery in free roam with manual control and network permission';reasonCode=now<quarantineUntil?'start-quarantine':'start-unavailable';changed();return false;}
  if(o.soloFallback&&port?.supportsSolo!==true){reason='Solo fallback is unavailable for this build';reasonCode='solo-unsupported';changed();return false;}
  if(o.cruise&&!o.visitDrag){reason='Native discovery cruise requires Drag discovery';reasonCode='cruise-needs-discovery';changed();return false;}
  options=o;order=selected.map(semantic);index=0;round=0;completedTrips=0;pending=null;current=null;targetOffer=null;world=s.world;cityIdentity=s.identity;lastFreshTick=s.tick;pause=null;tripSeen=false;raceSeen=false;lastNow=now;waitingAt=null;active=true;phase='handoff';reason='Waiting for manual handback before travel';reasonCode='manual-handback';intent=OFF;changed();return true;
 }
 function begin(s,releaseCruise=false){
  if(!current&&options.visitDrag){const found=discovered(s);if(found){current=JSON.parse(JSON.stringify(found.destination));targetOffer={host:found.offer.host,lobby:found.offer.lobby,eventHash:found.offer.eventHash,destinationKey:found.offer.destinationKey};}}
  if(!current&&!selected.length){phase='discover';reason=options.cruise?'Native AI cruise requested; finding an open Drag lobby':'Parked discovery wait; watching for an open Drag lobby';reasonCode=options.cruise?'discovery-cruise':'discovery-parked';intent=options.cruise?{raceAI:false,cruiseAI:true,keys:[]}:OFF;return false;}
  const d=available(s,current||selected[index]);if(!d){stop('Selected destination disappeared or changed','destination-changed');return false;}current=JSON.parse(JSON.stringify(d));world=s.world;
  if(targetOffer&&!targetPresent(s)){waitForTarget(clock());return false;}
  // Even a still-manual sample can precede an outstanding native takeover.
  // Publish native-off for one poll, then require a new manual observation.
  if(releaseCruise){phase='handoff';reason='Releasing native discovery cruise before travel';reasonCode='manual-handback';return false;}
  if(s.manual!==true||s.kind!==1||s.aiOwned||s.handbackPending){phase='handoff';reason='Waiting for exact manual handback';reasonCode='manual-handback';return false;}
  let plan;try{plan=port.plan(current,s);}catch{stop('Route planning failed','route-plan-failed');return false;}if(!plan?.ok){stop('No verified road route to the selected start','route-unavailable');return false;}
  if(!drive.start(plan,current,s)){stop('Travel ownership was refused','travel-refused');return false;}phase='travel';reason=targetOffer?'Driving to the discovered Drag lobby':'Driving to selected race start';reasonCode='travel';waitingAt=null;return true;
 }
 function next(s){try{drive.stop('Owned trip returned');}catch{}if(!targetOffer&&selected.length){index=(index+1)%selected.length;if(index===0)round++;}current=null;targetOffer=null;world=s.world;cityIdentity=s.identity;pending=null;tripSeen=false;raceSeen=false;waitingAt=null;phase='quarantine';reason='Returned; waiting before the next race start';reasonCode='return-quarantine';intent=OFF;}
 function pauseForCoherence(s,now){
  if(!pause){pause={reason:s.reason,from:phase,until:now+COHERENCE_MS,world,identity:cityIdentity,tick:lastFreshTick,revalidatedTick:null};try{drive?.stop('Waiting for a fresh native snapshot');}finally{port?.release?.();}}
  phase='coherence-wait';reason='Native catalog refresh; automation paused';reasonCode='coherence-wait';return changed();
 }
 function resumeFromCoherence(s,now){
  if(!Number.isInteger(s.tick)||s.tick<0||s.tick>0xffffffff||!Number.isInteger(pause.tick)||s.tick<pause.tick)return stop('Game clock changed during the catalog refresh','coherence-tick-reset');
  if(pending){
   if([2,3,4,5].includes(s.state)&&(s.host!==pending.host||s.lobby!==pending.lobby||s.eventHash!==pending.eventHash))return stop('A different lobby or race was entered','lobby-mismatch');
   if(s.state===0&&!tripSeen&&(s.world!==pause.world||s.identity!==pause.identity))return stop('The city car or session changed during the catalog refresh','coherence-context-changed');
  }else if(s.world!==pause.world||s.identity!==pause.identity||s.state!==0||!s.inRoam)return stop('The city car or session changed during the catalog refresh','coherence-context-changed');
  if(!pending&&current&&!available(s,current)&&!targetOffer)return stop('Selected destination disappeared or changed','destination-changed');
  if(pause.revalidatedTick===null){if(s.tick<=pause.tick){reason='Waiting for a fresh native frame';reasonCode='coherence-frame';return changed();}pause.revalidatedTick=s.tick;reason='Fresh catalog confirmed; native control remains released';reasonCode='coherence-revalidate';return changed();}
  if(s.tick<=pause.revalidatedTick){reason='Waiting for a fresh native frame';reasonCode='coherence-frame';return changed();}
  if(!pending&&(s.manual!==true||s.kind!==1||s.aiOwned||s.handbackPending)){reason='Fresh catalog; waiting for exact manual handback';reasonCode='coherence-handback';return changed();}
  const from=pause.from;pause=null;
  if(pending){phase=from;return null;}
  if(targetOffer&&!targetPresent(s)){waitForTarget(now);return changed();}
  phase=from==='quarantine'?'quarantine':'handoff';reason='Fresh catalog and manual handback confirmed';reasonCode='manual-handback';return null;
 }
 function poll(s,context=s){
  if(!active)return status();const now=clock(),cruiseWasRequested=intent.cruiseAI===true;intent=OFF;
  if(!Number.isFinite(now)||now<lastNow||now-lastNow>500)return stop('Session observation stalled','observation-stalled');lastNow=now;
  if(!safeContext(context))return stop('Automation interrupted; manual control','context-interrupted');
  if(pause&&now>pause.until)return stop('Native catalog refresh timed out; manual control','coherence-timeout');
  if(!safe(s)){if(s?.verified===true&&s.fresh!==true&&TRANSIENT_REASONS.includes(s.reason)&&(!pending?context.safe===true:true))return pauseForCoherence(s,now);return stop('Automation interrupted; manual control','context-interrupted');}
  if(pause){const resumed=resumeFromCoherence(s,now);if(resumed)return resumed;}
  lastFreshTick=s.tick;if(s.state===0&&s.inRoam)cityIdentity=s.identity;
  if(s.state===1)return stop('A manually hosted lobby is open','host-owned-lobby');
  if(pending){
   if([2,3,4,5].includes(s.state)&&(s.host!==pending.host||s.lobby!==pending.lobby||s.eventHash!==pending.eventHash))return stop('A different lobby or race was entered','lobby-mismatch');
   if([2,3,4].includes(s.state)){pending.observed=true;phase='lobby';reason=s.state===2?'Join sent; waiting for acceptance':s.state===3?'Joined; waiting for host':'Host countdown';reasonCode=s.state===2?'host-acceptance':s.state===3?'lobby-wait':'countdown';return changed();}
   if(s.state===5){pending.observed=true;if(!tripSeen)tripAt=now;tripSeen=true;phase='trip';reason=s.raceActive?'Owned race active':s.raceResults?'Owned race results; waiting for return':'Owned trip; loading or returning';reasonCode=s.raceActive?'race-active':s.raceResults?'race-results':'race-loading';if(s.raceActive){raceSeen=true;intent={raceAI:true,keys:[]};if(s.driverActive===true)driverMissingAt=null;else{if(driverMissingAt===null)driverMissingAt=now;if(now-driverMissingAt>10000)return stop('Owned race driver did not confirm; manual control','race-driver-unconfirmed');}}else{driverMissingAt=null;if(!s.raceResults&&!raceSeen&&now-tripAt>120000)return stop('Owned race loading timed out','race-loading-timeout');}return changed();}
   if(s.state===0&&s.inRoam&&tripSeen){completedTrips++;quarantineUntil=Math.max(quarantineUntil,now+3000);next(s);return changed();}
   if(s.state===0&&pending.observed)return stop('Host outcome changed; check the game before restarting','lobby-return-uncertain');
   if(now-pending.at>JOIN_MS)return stop('Join outcome is uncertain; wait before restarting','join-timeout');reason='Join requested; waiting for native lobby observation';reasonCode='join-pending';return changed();
  }
  if(s.raceActive||s.raceResults||s.state!==0||!s.inRoam)return stop('An event outside this session was entered','unowned-event');
  if(phase==='quarantine'){if(now<quarantineUntil)return changed();phase='handoff';}
  if(s.world!==world)return stop('The world or selected race start changed','world-changed');
  if(targetOffer&&!targetPresent(s)){
   waitForTarget(now);
   if(options.absence==='rotate'&&now-waitingAt>=options.waitMs){current=null;targetOffer=null;waitingAt=null;phase='handoff';reason='Drag host wait expired; checking the next current offer';reasonCode='next-offer';}
   else return changed();
  }
  if(phase==='discovery-wait'){phase='handoff';waitingAt=null;}
  if(phase==='discover')phase='handoff';
  if(phase==='handoff'){if(now>=quarantineUntil)begin(s,cruiseWasRequested);return changed();}
  if(s.world!==world||!available(s,current))return stop('The world or selected race start changed','destination-changed');
  const motion=drive.update(s);if(!motion.active)return stop(motion.reason||'Travel stopped',DRIVE_REASONS[motion.reason]||'travel-stopped');intent={raceAI:false,keys:motion.intent.keys||[]};
  if(!motion.joinReady){phase='travel';reason=motion.reason;reasonCode=DRIVE_REASONS[motion.reason]||'travel';waitingAt=null;return changed();}
  phase='waiting';reason='Stopped at selected race start; waiting for a fresh host';reasonCode='waiting-host';if(waitingAt===null)waitingAt=now;
  // canJoin rechecks current measured speed/region/identity; a past ready flag
  // is never sufficient, even when a matching host appeared this frame.
  if(!drive.canJoin(s,current))return changed();
  const offers=offersAt(s,current).filter(o=>!targetOffer||sameOffer(o,targetOffer));
  const offer=offers[0];
  if(offer){
   let sent=false;try{sent=port.join({host:offer.host,lobby:offer.lobby,eventHash:offer.eventHash},current,s)===true;}catch{return stop('Join enqueue outcome is uncertain','join-dispatch-uncertain');}
   if(sent){pending={host:offer.host,lobby:offer.lobby,eventHash:offer.eventHash,at:now,observed:false};quarantineUntil=Math.max(quarantineUntil,now+LATE_MS);drive.stop('Join dispatched');try{port.release();}catch{}intent=OFF;phase='joining';reason='Join requested; waiting for native confirmation';reasonCode='join-dispatched';}
   else{reason='Offer changed; waiting for a fresh host';reasonCode='offer-changed';}return changed();
  }
  if(!targetOffer&&options.soloFallback&&now-waitingAt>=options.waitMs){
   // Optional adapter must prove this exact native selected card again. No
   // generic key is emitted, and this branch is unreachable by default.
   let sent=false;try{sent=port.startSolo(current,s)===true;}catch{return stop('Solo start outcome is uncertain','solo-dispatch-uncertain');}
   if(sent)return stop('Solo start requested; automatic solo lifecycle is not yet installed','solo-requested');reason='Selected solo event could not be confirmed';reasonCode='solo-refused';return changed();
  }
  if(options.absence==='rotate'&&now-waitingAt>=options.waitMs){drive.stop('Configured host wait expired');index=(index+1)%selected.length;if(index===0)round++;phase='handoff';current=null;waitingAt=null;intent=OFF;reason='Moving to the next selected start';reasonCode='next-start';}
  return changed();
 }
 return Object.freeze({choose,start,poll,stop,status});
}
const api=Object.freeze({create,semantic,MAX,JOIN_MS,LATE_MS,DRAG_TYPE,COHERENCE_MS,transientReasons:TRANSIENT_REASONS,reasonCodes:Object.freeze([...new Set(REASON_CODES)])});if(typeof module==='object'&&module.exports)module.exports=api;else root.__NFSU2_AUTONOMY_LOOP__=api;
})(globalThis);
