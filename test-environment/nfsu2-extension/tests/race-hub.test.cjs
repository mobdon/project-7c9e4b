'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Hub=require('../extension/race-hub.js'),Stats=require('../extension/race-stats.js');
function ui(){
  const nodes=new Map([...Hub.markup().matchAll(/id="([^"]+)"/g)].map(match=>[match[1],{textContent:'',hidden:false}]));
  for(const node of nodes.values())Object.defineProperty(node,'innerHTML',{set(){throw Error('Runtime HTML injection');}});
  return {nodes,querySelector:selector=>nodes.get(selector.slice(1))||null,text:id=>nodes.get(id).textContent};
}
function history(count=1){
  let at=0;const stats=Stats.create({clock:()=>at});
  for(let i=0;i<count;i++){
    const d={sessionGeneration:1,raceIdentity:'race-'+i,trackId:4715+i,raceType:i%2?'drag':'url',carKey:i%2?'other':'r34',driving:true,inRace:true,aiOwned:true,nativeSpeed:20+i};
    stats.observe(d);at+=1000;stats.observe(d);at+=50;stats.observe({driving:false,inRace:false});at+=50;
  }
  return stats.snapshot();
}
test('hub template labels driving observations and unconfirmed results explicitly',()=>{
  const html=Hub.markup();
  assert.match(html,/id="race-hub"[^>]+role="dialog"[^>]+aria-label="Race statistics hub"[^>]+hidden/);
  for(const phrase of ['Driving segments','Observed, not finishes','Owned AI driving','Results unconfirmed','Wins, finish positions and lap times are unconfirmed','Direction not yet tracked','whole route'])assert.ok(html.includes(phrase),phrase);
  for(const id of ['race-hub-close','race-hub-export','race-hub-stop','race-hub-clear'])assert.match(html,new RegExp('id="'+id+'"[^>]+type="button"'));
  assert.doesNotMatch(html,/id="hub-wins"|confirmed win|verified finish|AI enabled/i);
});
test('real bounded statistics render totals, R34 focus and sampled speeds',()=>{
  const view=ui();Hub.render(view,history(2),{ready:true,aiOwned:true,carKey:'r34'});
  assert.equal(view.text('hub-runs'),'2');assert.equal(view.text('hub-ai-time'),'0:02');assert.equal(view.text('hub-peak'),'21');assert.equal(view.text('hub-tracks'),'2');assert.equal(view.text('hub-r34-runs'),'1');
  assert.equal(view.text('hub-mode-url'),'1');assert.equal(view.text('hub-mode-drag'),'1');assert.equal(view.text('hub-mode-circuit'),'0');
  assert.equal(view.text('hub-car-state'),'R34 identified in the current car sample');assert.equal(view.text('hub-driver'),'Native AI owned');
});
test('recent table shows only the newest eight observed segments and clears unused rows',()=>{
  const view=ui();Hub.render(view,history(10));
  assert.equal(view.nodes.get('hub-empty').hidden,true);assert.equal(view.nodes.get('hub-recent').hidden,false);
  assert.equal(view.text('hub-run-0-track'),'Unknown location');assert.equal(view.text('hub-run-7-track'),'Unknown location');
  Hub.render(view,history(1));assert.equal(view.nodes.get('hub-run-0').hidden,false);assert.equal(view.nodes.get('hub-run-1').hidden,true);
  Hub.render(view,Stats.create().snapshot());assert.equal(view.nodes.get('hub-empty').hidden,false);assert.equal(view.nodes.get('hub-recent').hidden,true);
  for(let i=0;i<8;i++)assert.equal(view.nodes.get('hub-run-'+i).hidden,true);
});
test('R34 decoration never upgrades an unknown or other current car tag',()=>{
  const view=ui();
  for(const carKey of [undefined,'unknown','SKYLINE','<img src=x onerror=SECRET>']){
    Hub.render(view,{}, {carKey,ready:false});assert.equal(view.text('hub-car-state'),'Waiting for a verified car sample');assert.equal(view.text('hub-driver'),'Waiting for game');
  }
  Hub.render(view,{}, {carKey:'other',ready:true});assert.equal(view.text('hub-car-state'),'Another stock car is active · R34 focus retained');assert.equal(view.text('hub-driver'),'Manual / waiting for AI');
});
test('forward preview is always a request or unknown coverage, never application or full route proof',()=>{
  const view=ui();
  const expectations={armed:'Forward target requested',unknown:'Coverage unknown',waiting:'Waiting for road sample',requested:'Waiting for road sample',off:'Off'};
  for(const [forwardState,text]of Object.entries(expectations)){
    Hub.render(view,{}, {forwardState,forwardHorizon:184,forwardNativeApplied:true,forwardLiveVerified:true});
    assert.equal(view.text('hub-preview'),text);assert.doesNotMatch(view.text('hub-preview'),/applied|confirmed|verified|184|complete/i);
  }
});
test('catalogue uses text-only rendering and describes inventory rather than verified coverage',()=>{
  const view=ui();Hub.render(view,{}, {},{LAYOUTS:[{trackId:4715,reverse:false,raceType:'url'},{trackId:4715,reverse:true,raceType:'url'}]});
  assert.equal(view.text('hub-layout-count'),'2');assert.equal(view.text('hub-catalog-list'),'Airport Circuit Track 5 · Forward · URL · whole route unverified\nAirport Circuit Track 5 Reverse · Reverse · URL · whole route unverified');
  assert.match(Hub.markup(),/stock event inventory/);assert.match(Hub.markup(),/does not verify a whole route, a direction, or the world map/);
});
test('empty and unavailable statistics remain readable without claiming speed or persisted data',()=>{
  const view=ui();Hub.render(view,{storageAvailable:false});
  assert.equal(view.text('hub-runs'),'0');assert.equal(view.text('hub-peak'),'—');assert.equal(view.text('hub-ai-time'),'0:00');assert.match(view.text('hub-storage'),/in memory.*unavailable/);
  Hub.render(view,{storageAvailable:true,maxRuns:200});assert.match(view.text('hub-storage'),/up to 200 segments.*no uploads/);
});
test('track count excludes unknown and invalid IDs while retaining their observed segments',()=>{
  const stats=Stats.create({clock:()=>0});stats.observe({sessionGeneration:1,raceIdentity:'unknown-track',trackId:null,raceType:'unknown',carKey:'unknown',driving:true,inRace:true,aiOwned:false});
  const view=ui(),snapshot=stats.snapshot();Hub.render(view,snapshot);
  assert.equal(view.text('hub-tracks'),'0');assert.equal(view.text('hub-runs'),'1');assert.equal(view.text('hub-run-0-track'),'Unknown location');assert.equal(view.nodes.get('hub-run-0').hidden,false);
  snapshot.byTrack.push(...[4715,4715,null,undefined,-1,65536,NaN,Infinity,'4715',1.5].map(trackId=>({trackId,observedRuns:1})));
  Hub.render(view,snapshot);assert.equal(view.text('hub-tracks'),'1');assert.equal(view.text('hub-runs'),'1');assert.equal(view.text('hub-run-0-track'),'Unknown location');
});
test('speed labels and values use uncalibrated native units without a physical-unit conversion',()=>{
  const html=Hub.markup(),view=ui();assert.match(html,/Peak native units\/s/);assert.match(html,/Peak units\/s/);assert.match(html,/uncalibrated native coordinate units per native second/);assert.doesNotMatch(html,/km\/h|mph|metres|meters/);
  Hub.render(view,{peakNativeSpeed:25});assert.equal(view.text('hub-peak'),'25');
  Hub.render(view,{peakSpeedMps:90});assert.equal(view.text('hub-peak'),'—');
});
test('formatters keep zero distinct from unavailable and bound unsupported time values',()=>{
  assert.equal(Hub.speed(0),'0');assert.equal(Hub.speed(25),'25');assert.equal(Hub.speed(25.6),'26');
  for(const value of [undefined,null,NaN,Infinity,-1,'25'])assert.equal(Hub.speed(value),'—');
  assert.equal(Hub.duration(59.9),'0:59');assert.equal(Hub.duration(60),'1:00');assert.equal(Hub.duration(3661),'1h 1m');
  for(const value of [undefined,null,NaN,Infinity,-1,'60'])assert.equal(Hub.duration(value),'0:00');
});
test('hub is responsive and offers a visible stop action without live-announcement flooding',()=>{
  assert.match(Hub.styles,/@media\(max-width:800px\)/);assert.match(Hub.styles,/max-height:calc\(100dvh -/);
  assert.match(Hub.markup(),/>Stop \/ take control<\/button>/);assert.doesNotMatch(Hub.markup(),/aria-live="(?:assertive|polite)"/);
});
test('one prominent Stop sits in the sticky header before scrollable content on mobile',()=>{
  const html=Hub.markup(),header=html.slice(html.indexOf('<div class="hub-top">'),html.indexOf('<h2 class="hub-title">'));
  assert.equal([...html.matchAll(/id="race-hub-stop"/g)].length,1);assert.match(header,/id="race-hub-stop" class="hub-stop"[^>]*>Stop \/ take control/);assert.match(header,/id="race-hub-close"/);
  assert.ok(html.indexOf('id="race-hub-stop"')<html.indexOf('id="hub-recent"'));assert.match(Hub.styles,/\.hub-top\{[^}]*position:sticky[^}]*top:0[^}]*z-index:2/);assert.match(Hub.styles,/\.hub-top-actions\{[^}]*flex-wrap:wrap/);assert.match(Hub.styles,/\.hub-stop\{[^}]*background:#7d1738[^}]*font-weight:700/);assert.match(Hub.styles,/@media\(max-width:800px\)[\s\S]*\.hub-stop,\.hub-close\{min-height:44px\}/);
});
test('browser module loads without a game, DOM, storage or controller dependency',()=>{
  const context=vm.createContext({});vm.runInContext(fs.readFileSync(require.resolve('../extension/race-hub.js'),'utf8'),context);
  assert.equal(typeof context.__NFSU2_RACE_HUB__.render,'function');assert.equal(typeof context.__NFSU2_RACE_HUB__.markup,'function');
  const source=fs.readFileSync(require.resolve('../extension/race-hub.js'),'utf8');assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|localStorage|set(?:Uint|Float)|__NFSU2_AI__|KeyboardEvent/);
});
