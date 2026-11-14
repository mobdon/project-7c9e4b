'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const HUD=require('../extension/stream-hud.js');
function input({data={},context={},at=1000,now=1000,forward={},info={},stats={},session={}}={}){
 return{sample:{at,data:{generation:1,supported:true,ready:true,driving:true,nativeTelemetry:true,focused:true,hidden:false,speedMps:20,carRpm:6500,carGear:5,raceType:1,trackId:4715,...data},context},now,forward,info,stats,session};
}
const live=changes=>HUD.view(input(changes));

test('stream speed uses the native HUD MPH factor and preserves measured zero while unavailable values stay unknown',()=>{
 assert.equal(live().speed,'44');assert.equal(live({data:{speedMps:0}}).speed,'0');assert.equal(live({data:{speedMps:500}}).speed,'1118');
 for(const [speedMps,speed]of [[.44,'0'],[28,'62'],[45,'100'],[64,'143']])assert.equal(live({data:{speedMps}}).speed,speed);
 for(const speedMps of [undefined,null,'20',NaN,Infinity,-Infinity,-.01,500.01])assert.equal(live({data:{speedMps}}).speed,'—');
 assert.equal(live({data:{speedMps:undefined,power:3,paceApplied:3},info:{pace:'3.00× req'}}).speed,'—');
 assert.match(HUD.markup(),/MPH/);assert.doesNotMatch(HUD.markup(),/native units|segments|observations|unconfirmed|race lab/i);
});

test('current mode and location require fresh native telemetry and driving readings also reject pauses and tuner work',()=>{
 for(const [data,context,expected]of [[{raceType:0},{},'Free roam'],[{raceType:7},{},'Outrun'],[{raceType:1},{},'URL race'],[{raceType:0},{drag:true},'Drag'],[{raceType:1},{drift:true},'Drift']])assert.equal(live({data,context}).driver,expected);
 assert.equal(live().context,'Airport Circuit Track 5');
 for(const trackId of [undefined,null,'4715',0,-1,1.5,65536,NaN,Infinity])assert.equal(live({data:{trackId}}).context,'Location unavailable');
 for(const trackId of [1,65535])assert.equal(live({data:{trackId}}).context,'Location unavailable');
 for(const data of [{supported:false},{ready:false},{driving:false},{nativeTelemetry:false},{hidden:true},{focused:false},{dynoBusy:true}]){
  const v=live({data});assert.equal(v.speed,'—');if(data.supported===false||data.ready===false){assert.equal(v.driver,'Waiting for game');assert.equal(v.context,'Location unavailable');}
 }
 for(const context of [{menu:true},{suspended:'Paused'}])assert.equal(live({context}).speed,'—');
 assert.equal(live({now:1500}).speed,'44');
 for(const [now,at]of [[1500.01,1000],[999,1000],[NaN,1000],[Infinity,1000],[1000,NaN],[1000,Infinity]]){
  const v=live({now,at});assert.equal(v.speed,'—');assert.equal(v.driver,'Waiting for game');assert.equal(v.context,'Location unavailable');
 }
 assert.equal(HUD.view().speed,'—');assert.equal(HUD.view({sample:null,now:1000}).speed,'—');
});

test('gear and RPM use fresh bounded engine readings including reverse, neutral and measured zero',()=>{
 assert.equal(live().rpm,'6500');assert.equal(live().gear,'4');
 for(const [carGear,gear]of [[0,'R'],[1,'N'],[2,'1'],[7,'6'],[8,'7']])assert.equal(live({data:{carGear}}).gear,gear);
 for(const carGear of [undefined,null,'2',-1,.5,9,10,NaN,Infinity])assert.equal(live({data:{carGear}}).gear,'—');
 assert.equal(live({data:{carRpm:0}}).rpm,'0');assert.equal(live({data:{carRpm:30000}}).rpm,'30000');
 for(const carRpm of [undefined,null,'6000',-1,30000.01,NaN,Infinity])assert.equal(live({data:{carRpm}}).rpm,'—');
 for(const changes of [{now:1501},{data:{hidden:true}},{data:{dynoBusy:true}},{context:{menu:true}},{context:{suspended:'paused'}}]){const v=live(changes);assert.equal(v.rpm,'—');assert.equal(v.gear,'—');}
});

test('this-visit statistics come only from the page meter; saved history supplies recent location fallback only',()=>{
 const stats={observedRuns:99,aiDrivingSeconds:999999,runs:[{trackId:4014,raceType:'circuit',startedAt:0,lastObservedAt:86400000}],peakNativeSpeed:400,byTrack:[{trackId:4014}]},session={driveMilliseconds:125900,peakNativeSpeed:64,trackCount:3,recentTrackId:4715};
 const v=live({stats,session,data:{network:true}});assert.equal(v.time,'2:05');assert.equal(v.pace,'143 MPH');assert.equal(v.road,'3');assert.equal(v.turns,'Recent: Airport Circuit Track 5');assert.equal(v.network,'Online');
 assert.equal(live().network,'Solo');assert.equal(live({now:1600,data:{network:true}}).network,'Waiting for game');assert.equal(live({data:{supported:false,network:true}}).network,'Waiting for game');
 const historical=live({stats});assert.equal(historical.road,'0');assert.equal(historical.time,'0:00');assert.equal(historical.pace,'—');assert.equal(historical.turns,'Recent: Resort Loop');
 assert.equal(live({now:1600,session}).time,'2:05');assert.equal(live({data:{supported:false},session}).pace,'143 MPH');
 for(const peakNativeSpeed of [undefined,null,'20',NaN,Infinity,-Infinity,-1,500.01])assert.equal(live({session:{peakNativeSpeed}}).pace,'—');
 for(const trackCount of [-1,1.5,257,NaN,Infinity,'3'])assert.equal(live({session:{trackCount}}).road,'0');
 for(const forwardState of ['off','unknown','requested','waiting','armed'])assert.deepEqual(live({stats,session,data:{network:true,aiActive:true,aiOwned:true,paceApplied:3},info:{driver:'Native AI active',pace:'3.00× req'},forward:{forwardState}}),v);
 assert.doesNotMatch(JSON.stringify(v),/AI active|\breq\b|\back\b|planner|race complete|finish confirmed/i);assert.doesNotMatch(HUD.markup(),/wins|won|races completed|success rate/i);
});

test('page meter counts manual and AI free roam equally, integrates measured distance and cannot count a repeated sample twice',()=>{
 const meter=HUD.createSession(),observe=(at,data={})=>meter.observe(input({at,now:at,data:{raceType:0,trackId:4000,...data}}).sample,at);
 assert.deepEqual(meter.snapshot(),{driveMilliseconds:0,peakNativeSpeed:null,distanceNative:0,trackCount:0,recentTrackId:null,generation:null});
 observe(1000,{speedMps:10});observe(1250,{speedMps:30,aiActive:true});observe(1250,{speedMps:400});observe(1200,{speedMps:450});observe(1500,{speedMps:50,trackId:4715});
 assert.deepEqual(meter.snapshot(),{driveMilliseconds:500,peakNativeSpeed:50,distanceNative:15,trackCount:2,recentTrackId:4715,generation:1});
 observe(2000,{speedMps:0});assert.equal(meter.snapshot().driveMilliseconds,1000);assert.equal(meter.snapshot().distanceNative,27.5);
 const copy=meter.snapshot();copy.driveMilliseconds=900000;assert.equal(meter.snapshot().driveMilliseconds,1000);assert(Object.isFrozen(meter));
});

test('page meter breaks bridges on gaps, generation changes, stale samples, menus, pauses and unsafe telemetry',()=>{
 const breaks=[{data:{supported:false}},{data:{ready:false}},{data:{driving:false}},{data:{nativeTelemetry:false}},{data:{hidden:true}},{data:{focused:false}},{data:{dynoBusy:true}},{context:{menu:true}},{context:{suspended:'paused'}},{now:2000},{now:999},{data:{generation:null}},{data:{generation:2}}];
 for(const change of breaks){const meter=HUD.createSession();let v=input();meter.observe(v.sample,v.now);v=input({at:1250,now:1250,...change});meter.observe(v.sample,v.now);v=input({at:1500,now:1500});meter.observe(v.sample,v.now);assert.equal(meter.snapshot().driveMilliseconds,0,JSON.stringify(change));v=input({at:1750,now:1750});meter.observe(v.sample,v.now);assert.equal(meter.snapshot().driveMilliseconds,250);}
 const meter=HUD.createSession();for(const at of [1000,1501,1751]){const v=input({at,now:at});meter.observe(v.sample,v.now);}assert.equal(meter.snapshot().driveMilliseconds,250);
 assert.equal(meter.snapshot().peakNativeSpeed,20);assert.equal(meter.snapshot().trackCount,1);
});

test('page meter bounds places and ignores invalid speed for peak and distance while preserving live driving time',()=>{
 for(const speedMps of [undefined,null,'20',NaN,Infinity,-1,500.01]){const meter=HUD.createSession();for(const [at,speed]of [[1000,20],[1250,speedMps],[1500,40]]){const v=input({at,now:at,data:{speedMps:speed}});meter.observe(v.sample,v.now);}assert.equal(meter.snapshot().driveMilliseconds,500);assert.equal(meter.snapshot().distanceNative,0);assert.equal(meter.snapshot().peakNativeSpeed,40);}
 const meter=HUD.createSession();for(let trackId=1;trackId<=300;trackId++){const at=1000+trackId,v=input({at,now:at,data:{trackId}});meter.observe(v.sample,v.now);}assert.equal(meter.snapshot().trackCount,256);assert.equal(meter.snapshot().recentTrackId,300);
 for(const trackId of [null,'4715',0,-1,1.5,65536,NaN,Infinity]){const v=input({at:1500,now:1500,data:{trackId}});const current=HUD.createSession();current.observe(v.sample,v.now);assert.equal(current.snapshot().trackCount,0);assert.equal(current.snapshot().recentTrackId,null);}
});

test('render updates text nodes only, tolerates absent optional nodes and preserves its input',()=>{
 const ids=['driver','network','context','speed','gear','rpm','driving-time','road','turns','pace'],nodes=new Map(ids.map(id=>['#stream-'+id,{textContent:''}]));
 for(const node of nodes.values())Object.defineProperty(node,'innerHTML',{set(){throw Error('Dynamic HTML is forbidden');}});
 const original=input({info:{driver:'<img src=x onerror=alert(1)>',context:'Online',pace:'2.00× req · pending'},session:{driveMilliseconds:60000,peakNativeSpeed:64,trackCount:1,recentTrackId:4715}}),before=structuredClone(original);
 const rendered=HUD.render({querySelector:selector=>nodes.get(selector)||null},original);
 assert.deepEqual(rendered,HUD.view(original));assert.deepEqual(original,before);assert.equal(nodes.get('#stream-driver').textContent,'URL race');assert.equal(nodes.get('#stream-driving-time').textContent,'1:00');assert.equal(nodes.get('#stream-speed').textContent,'44');assert.equal(nodes.get('#stream-gear').textContent,'4');assert.equal(nodes.get('#stream-rpm').textContent,'6500');assert.doesNotMatch(JSON.stringify([...nodes.values()].map(n=>n.textContent)),/<img|req|pending/);
 assert.doesNotThrow(()=>HUD.render({querySelector:()=>null},original));
});

test('stream widgets are static identified content with click-through responsive styling and quiet accessibility',()=>{
 const html=HUD.markup(),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const widget of ['brand','driver','session','stats','road','radar','footer'])assert.match(html,new RegExp('data-hud-widget="'+widget+'" id="stream-widget-'+widget+'"'));
 assert.match(html,/id="stream-hud"[^>]*aria-live="off"[^>]*hidden/);assert.match(HUD.styles,/\.stream-hud\{[^}]*pointer-events:none/);assert.match(HUD.styles,/@media\(max-width:480px\)/);
 assert.doesNotMatch(html,/<(?:script|iframe|form)\b|\bonclick\s*=|https?:\/\//i);assert.match(html,/Places driven/i);assert.match(html,/Recent/i);assert.match(html,/Top speed/i);assert.match(html,/Driving time/i);assert.match(html,/RPM/);assert.match(html,/Gear/);assert.doesNotMatch(html,/\bAI\b|\breq\b|\back\b|native units|observations|segments|unconfirmed|road ahead|priority turns|live pace|Shift\+Insert|\bF7\b|\bF9\b/i);
});

test('browser module registration is presentation only and performs no ambient game, network or persistence work',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../extension/stream-hud.js'),'utf8'),context={};
 for(const name of ['document','navigator','WebAssembly','Atomics','localStorage','sessionStorage','fetch','setInterval','setTimeout'])Object.defineProperty(context,name,{get(){throw Error('Unexpected ambient access: '+name);}});
 vm.runInNewContext(source,context);assert.equal(typeof context.__NFSU2_STREAM_HUD__.view,'function');assert.equal(typeof context.__NFSU2_STREAM_HUD__.render,'function');assert(Object.isFrozen(context.__NFSU2_STREAM_HUD__));
});

function radar(){
 // SVGElement.hidden is an ordinary expando, not HTMLElement's reflected
 // hidden attribute. The production [hidden] rule follows the attribute.
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:true,attributes:new Map(id.startsWith('radar-dot-')?[['hidden','']]:[]),setAttribute(k,v){this.attributes.set(k,String(v));},removeAttribute(k){this.attributes.delete(k);}});return nodes.get(id);};
 for(const id of ['nearest','state'])node('radar-'+id);
 for(let i=0;i<8;i++)for(const part of ['dot','car','distance'])node('radar-'+part+'-'+i);
 return{node,render:sample=>HUD.renderRadar({querySelector:selector=>nodes.get(selector.slice(1))||null},sample),visible:()=>Array.from({length:8},(_,i)=>!node('radar-dot-'+i).attributes.has('hidden')&&node('radar-dot-'+i).attributes.get('visibility')!=='hidden').filter(Boolean).length};
}

test('rear radar projects positive native left to screen left and behind to the lower half-circle',()=>{
 const f=radar(),cars=[{distanceNative:25,behindNative:25,lateralNative:0},{distanceNative:50,behindNative:40,lateralNative:30},{distanceNative:100,behindNative:80,lateralNative:-60}];
 f.render({available:true,rangeNative:200,cars,truncated:false});assert.equal(f.visible(),3);assert.equal(f.node('radar-nearest').textContent,'25 away');
 for(const[i,x,y]of [[0,0,12.5],[1,-15,20],[2,30,40]]){
  const dot=f.node('radar-car-'+i),text=f.node('radar-distance-'+i);assert.equal(Number(dot.attributes.get('cx')),x);assert.equal(Number(dot.attributes.get('cy')),y);assert.equal(Number(text.attributes.get('x')),x);assert(Number(text.attributes.get('y'))>y);assert.equal(text.textContent,String(cars[i].distanceNative));assert.equal(f.node('radar-dot-'+i).attributes.get('visibility'),'visible');assert.equal(f.node('radar-dot-'+i).attributes.has('hidden'),false);
 }
 assert.match(f.node('radar-state').textContent,/Nearby cars/);assert.doesNotMatch(f.node('radar-state').textContent,/metres|meters|\bkm\b|\bmph\b|player|opponent|police/i);
});

test('rear radar bounds visible markers, retains partial-scan wording and clears prior observations on unknown data',()=>{
 const f=radar(),cars=Array.from({length:12},(_,i)=>({distanceNative:i+1,behindNative:i+1,lateralNative:0}));
 f.render({available:true,rangeNative:50,cars,truncated:true});assert.equal(f.visible(),8);assert.match(f.node('radar-state').textContent,/Some nearby cars shown/);
 for(const sample of [undefined,{available:false,rangeNative:200,cars:[]},{available:1,rangeNative:200,cars:[]},{available:true,rangeNative:200,cars:Array.from({length:33},(_,i)=>({distanceNative:i+1,behindNative:i+1,lateralNative:0}))},...[undefined,'200',NaN,Infinity,49.99,500.01].map(rangeNative=>({available:true,rangeNative,cars}))]){
  f.render(sample);assert.equal(f.visible(),0);assert.equal(f.node('radar-nearest').textContent,'Waiting for cars');assert.doesNotMatch(f.node('radar-state').textContent,/clear|No rear car|0 cars/i);
  for(let i=0;i<8;i++){assert.equal(f.node('radar-dot-'+i).attributes.get('visibility'),'hidden');assert.equal(f.node('radar-dot-'+i).attributes.has('hidden'),true);}
 }
 f.render({available:true,rangeNative:500,cars:[],truncated:false});assert.equal(f.visible(),0);assert.equal(f.node('radar-nearest').textContent,'No nearby car behind');assert.match(f.node('radar-state').textContent,/Nearby cars/);
});

test('malformed rear records remain unknown without crashing or implying an observed empty rear field',()=>{
 const good={distanceNative:50,behindNative:40,lateralNative:30};
 const records=[null,undefined,{}, {...good,distanceNative:0},{...good,distanceNative:-1},{...good,distanceNative:NaN},{...good,distanceNative:Infinity},{...good,distanceNative:201},{...good,behindNative:0},{...good,behindNative:-1},{...good,behindNative:51},{...good,lateralNative:Infinity},{...good,lateralNative:51},{distanceNative:100,behindNative:100,lateralNative:100}];
 for(const cars of [undefined,null,{},'unknown',...records.map(record=>[record])]){
  const f=radar();assert.doesNotThrow(()=>f.render({available:true,rangeNative:200,cars,truncated:false}));assert.equal(f.visible(),0);assert.equal(f.node('radar-nearest').textContent,'Waiting for cars');
 }
});

test('valid near-boundary rear observations remain inside the native range half-circle',()=>{
 const f=radar(),cars=[{distanceNative:50,behindNative:50,lateralNative:0},{distanceNative:50,behindNative:.01,lateralNative:Math.sqrt(2500-.0001)}];
 f.render({available:true,rangeNative:50,cars,truncated:false});assert.equal(f.visible(),2);
 for(let i=0;i<2;i++){const dot=f.node('radar-car-'+i),x=Number(dot.attributes.get('cx')),y=Number(dot.attributes.get('cy'));assert(x>=-100&&x<=100);assert(y>0&&y<=100);assert(Math.hypot(x,y)<=100.000001);}
});

test('rear nearest label and marker order use a sorted copy without changing the observed car list',()=>{
 const f=radar(),cars=[90,20,60].map(distanceNative=>({distanceNative,behindNative:distanceNative,lateralNative:0,classification:'unknown'})),sample={available:true,rangeNative:200,cars,truncated:false},before=structuredClone(sample);
 f.render(sample);assert.equal(f.node('radar-nearest').textContent,'20 away');assert.deepEqual([0,1,2].map(i=>f.node('radar-distance-'+i).textContent),['20','60','90']);assert.deepEqual(sample,before);
});
