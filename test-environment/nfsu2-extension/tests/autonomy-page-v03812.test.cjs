'use strict';
// Actual page.js, real Drive/Loop; the native reader/road are explicitly
// controlled adapters. Their sparse-memory/native evidence has separate tests.
const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const Drive=require('../extension/autonomy-drive.js'),Loop=require('../extension/autonomy-loop.js'),Hosted=require('../extension/autonomy-hosted.js'),Profiles=require('../extension/tool-profiles.js');
const file=require.resolve('./core.test.cjs'),baseRequire=createRequire(file),source=fs.readFileSync(file,'utf8');
const injection='context.window=context;context.top=context;';
assert.equal(source.split(injection).length,2,'one narrow test-only fixture injection');
const patched=source.replace(injection,'compatibility.autonomyInit?.(context,aiLog);'+injection).replace('    replaceChildren(...children){','    remove(){this.removed=true;}\n    replaceChildren(...children){');
const context={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,URL,Blob,setImmediate};
vm.runInNewContext(patched+'\nthis.autonomyFixture=pageFixture;',context,{filename:file});
const destination=(n,x)=>({key:'start-'+n,eventHash:100+n,markerHash:200+n,track:4010+n,reverse:0,laps:1,box:[x-3,-3,x+3,3],marker:{x,y:0,z:0},label:'Controlled start '+n});
async function fixture(options={}){
 const first=destination(1,100),second=destination(2,200),model={state:0,tuple:{host:9,lobby:77,eventHash:first.eventHash},catalog:[first,second],offers:[],fresh:true,position:{x:0,y:0,z:0},speed:0,heading:{x:1,y:0},joins:[],attempts:[],plans:[],hostPresent:true,planValid:true},profile={hash:Hosted.C.hash,revision:'943ee537',capabilities:{legacy:true,ai:true,pace:true,corner:true,dragAI:true,dyno:true}};
 const f=await context.autonomyFixture(options.saved??null,true,true,{profile,revision:profile.revision,profileStorage:options.profileStorage,autonomyInit(page,aiLog){
  const clock=page.performance.now,Original=page.__NFSU2_AI__.Controller;aiLog.manual=true;aiLog.autoOwn=true;
  page.__NFSU2_AI__.Controller=class extends Original{
   get handbackPending(){return aiLog.handbackPending===true;}
   status(){return{ready:true,available:true,manual:aiLog.manual===true,owned:aiLog.owned===true,active:aiLog.active===true};}
   update(value){const result=super.update(value);if(aiLog.autoOwn){aiLog.owned=value.enabled&&value.safe;aiLog.manual=!aiLog.owned;}aiLog.active=value.enabled&&value.safe&&aiLog.owned;return{...result,...this.status()};}
  };
  page.__NFSU2_AUTONOMY_DRIVE__={create:()=>Drive.create({clock})};
  page.__NFSU2_AUTONOMY_LOOP__={create:args=>Loop.create({...args,clock})};
  page.__NFSU2_AUTONOMY_ROAD__={capture(memory,flags){return{memory,flags};},plan(graph,marker){model.plans.push({graph,marker});return{ok:true,identity:'controlled-car',waypoints:[{...marker}],validate:()=>model.planValid};}};
  page.__NFSU2_AUTONOMY_HOSTED__={create(memory,flags){model.readerFlags=flags;return{supported:options.supported!==false,observe(c){model.lastContext=c;if(!model.fresh)return{verified:true,fresh:false,catalog:[],offers:[],reason:'controlled torn snapshot'};const inRoam=model.state===0&&!c.raceActive&&!c.raceResults;return{...c,verified:true,fresh:true,state:model.state,...model.tuple,world:'controlled-world',identity:'controlled-car',inRoam,catalog:inRoam?model.catalog:[],offers:inRoam?model.offers:[],position:{...model.position},heading:{...model.heading},speed:model.speed,tick:Math.floor(clock()/50)+1,self:1};},join(tuple,d,s){model.attempts.push({tuple,d,s});if(!model.hostPresent||!model.offers.some(o=>o.host===tuple.host&&o.lobby===tuple.lobby&&o.eventHash===tuple.eventHash&&o.destinationKey===d.key))return false;model.joins.push({...tuple});return true;}};}};
 }});
 f.model=model;f.first=first;f.second=second;
 f.rows=()=>f.nodes['autonomy-list'].children?.filter(r=>!r.removed)||[];
 f.select=(index,on=true)=>{const check=f.rows()[index].children[1];check.checked=on;for(const fn of check.handlers.change||[])fn({target:check});};
 f.offer=(d=first)=>({host:9,lobby:77,eventHash:d.eventHash,destinationKey:d.key,players:1,maximum:6,open:true,eligible:true,fresh:true});
 f.start=()=>{f.run();f.select(0);f.click('autonomy-start');f.run(3);};
 f.arrive=()=>{model.position={...first.marker};model.speed=0;f.run(32);};
 f.race=()=>{model.state=5;f.put(0x89e7b0,1);f.drive(1);f.run(2);};
 f.returnToCity=()=>{model.state=0;f.put(0x89e7b0,0);f.drive(2);f.run(2);};
 f.change('online',true);return f;
}
const drivingEvents=f=>f.aiLog.keyEvents.filter(e=>['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code));
const keyIsDown=(f,key)=>drivingEvents(f).filter(e=>e.code===key).at(-1)?.type==='keydown';

test('actual page defaults off; valid selections survive a transient read and clear only on coherent removal',async()=>{
 const f=await fixture();assert.equal(f.nodes['autonomy-start'].disabled,true);f.run();assert.equal(f.rows().length,2);f.select(0);assert.equal(f.nodes['autonomy-start'].disabled,false);
 f.model.fresh=false;f.run();assert.equal(f.rows().length,2);assert.equal(f.rows()[0].children[1].checked,true);assert.equal(f.nodes['autonomy-start'].disabled,true);
 f.model.fresh=true;f.run();assert.equal(f.nodes['autonomy-start'].disabled,false);f.model.catalog=[f.second];f.run();assert.equal(f.rows().length,1);assert.equal(f.nodes['autonomy-start'].disabled,true);
 assert.equal(f.model.readerFlags.moduleHash,Hosted.C.hash);assert.equal(f.aiLog.updates.every(x=>!x.enabled),true);
});

test('actual page waits for manual handback then publishes travel keys through its one existing AI publisher',async()=>{
 const f=await fixture();f.aiLog.autoOwn=false;f.aiLog.manual=false;f.aiLog.owned=true;f.aiLog.handbackPending=true;
 f.start();assert.match(f.nodes['autonomy-state'].textContent,/handback/);assert.equal(f.model.plans.length,0);assert.equal(drivingEvents(f).length,0);assert.equal(f.nodes['autonomy-stop'].disabled,false);
 f.aiLog.manual=true;f.aiLog.owned=false;f.aiLog.handbackPending=false;const before=f.aiLog.updates.length;f.run(3);assert.equal(f.aiLog.updates.length-before,3);assert.equal(f.model.plans.length,1);assert.equal(keyIsDown(f,'ArrowUp'),true);assert.equal(f.aiLog.updates.slice(-3).every(x=>!x.enabled),true);
 f.press('F7');assert.equal(keyIsDown(f,'ArrowUp'),false);assert.equal(f.nodes['autonomy-stop'].disabled,true);assert.equal(f.prefs().ai,false);
});

test('actual page drives, dwells, joins one exact host, runs AI only for the owned race, returns and rotates',async()=>{
 const f=await fixture();f.run();f.select(0);f.select(1);f.click('autonomy-start');f.run(3);assert.equal(keyIsDown(f,'ArrowUp'),true);
 f.model.position={...f.first.marker};f.model.speed=0;f.model.offers=[f.offer()];f.run(29);assert.equal(f.model.joins.length,0,'arrival must settle for 1.5 seconds');
 f.model.offers=[];f.run(4);assert.match(f.nodes['autonomy-state'].textContent,/waiting for a fresh host/);assert.equal(f.model.joins.length,0);
 f.model.offers=[f.offer()];f.model.hostPresent=false;f.run();assert.equal(f.model.joins.length,0,'use-time adapter refusal is retained');
 f.model.hostPresent=true;f.run();assert.deepEqual(f.model.joins,[{host:9,lobby:77,eventHash:f.first.eventHash}]);assert.equal(drivingEvents(f).at(-1).type,'keyup');
 f.run(5);assert.equal(f.model.joins.length,1);assert.equal(f.aiLog.updates.at(-1).enabled,false);
 for(const state of[2,3,4]){f.model.state=state;f.run();assert.equal(f.aiLog.updates.at(-1).enabled,false);}
 f.race();assert.equal(f.aiLog.updates.at(-1).enabled,true);assert.equal(f.aiLog.updates.at(-1).mode,1);assert.equal(f.nodes.ai.checked,false);assert.equal(f.nodes['autonomy-start'].disabled,true);
 f.drive(0);f.run();assert.equal(f.aiLog.updates.at(-1).enabled,false,'results do not drive');
 f.returnToCity();assert.equal(f.aiLog.updates.at(-1).enabled,false);f.model.offers=[];f.run(710);assert.equal(f.model.plans.length,2);assert.equal(f.model.plans[1].marker.x,200);assert.match(f.nodes['autonomy-state'].textContent,/2\/2/);assert.equal(f.model.joins.length,1);assert.equal(f.aiLog.keys.includes('Enter'),false);
});

test('actual page Stop, F7, F9, manual keys, blur, hidden, menus and tuner release autonomous travel',async()=>{
 for(const[name,interrupt]of[['button',f=>f.click('autonomy-stop')],['F7',f=>f.press('F7')],['F9',f=>f.press('F9')],['manual key',f=>f.press('ArrowLeft')],['blur',f=>f.focus(false)],['hidden',f=>f.hidden(true)],['panel',f=>f.press('F8')],['dialog',f=>f.gameDialog(true)],['tuner',f=>{f.dynoLog.instance.busy=true;}]]){
  const f=await fixture();f.start();assert.equal(keyIsDown(f,'ArrowUp'),true,name);interrupt(f);f.run();assert.equal(keyIsDown(f,'ArrowUp'),false,name);assert.equal(f.nodes['autonomy-stop'].disabled,true,name);assert.equal(f.aiLog.updates.at(-1).enabled,false,name);assert.equal(f.model.joins.length,0,name);
 }
});

test('actual page profile load and game replacement stop the loop; profiles and reload do not store its locations',async()=>{
 const f=await fixture();f.change('nos',true);f.input('profile-name','Keep my choices');f.click('profile-save');const saved=f.profileStorage.get(Profiles.KEY);assert.ok(saved);f.start();assert.equal(keyIsDown(f,'ArrowUp'),true);
 f.click('profile-load');f.run();assert.equal(f.nodes['autonomy-stop'].disabled,true);assert.equal(keyIsDown(f,'ArrowUp'),false);assert.equal(f.profileStorage.get(Profiles.KEY),saved);
 f.start();const mod=new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0]));f.worker.postMessage({mod,memory:f.memory,slot:0});f.worker.emit({t:'register',kind:5,ptr:f.status});f.run();assert.equal(f.nodes['autonomy-stop'].disabled,true);assert.equal(f.rows().some(r=>r.children[1].checked),false);assert.equal(keyIsDown(f,'ArrowUp'),false);
 const r=await fixture({saved:f.stored(),profileStorage:f.profileStorage});r.run();assert.equal(r.nodes['autonomy-start'].disabled,true);assert.equal(r.nodes['autonomy-stop'].disabled,true);assert.equal(r.aiLog.updates.at(-1).enabled,false);assert.equal(r.profileStorage.get(Profiles.KEY),saved);assert.doesNotMatch(saved,/autonomy|start-1|markerHash|eventHash/);
});

test('actual page honors permission, stops for road changes and preserves the Camera preference',async()=>{
 const f=await fixture();f.change('camera-rotate-enable',true);f.start();assert.equal(f.nodes['camera-rotate-enable'].checked,true);f.model.planValid=false;f.run();assert.equal(keyIsDown(f,'ArrowUp'),false);assert.equal(f.nodes['autonomy-stop'].disabled,true);assert.equal(f.nodes['camera-rotate-enable'].checked,true);
 const g=await fixture();g.put(require('../extension/core.js').A.MODE,8);g.change('online',false);g.start();assert.equal(g.model.plans.length,0);assert.equal(drivingEvents(g).length,0);assert.equal(g.model.joins.length,0);
});
