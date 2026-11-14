'use strict';
// Production page in the established simulated DOM. Native bridge/evaluator
// behavior is tested separately; this controller double isolates UI routing.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const Tune=require('../extension/dyno-core.js');
const coreFile=require.resolve('./core.test.cjs'),baseRequire=createRequire(coreFile);
let source=fs.readFileSync(coreFile,'utf8');
function replace(before,after){assert.equal(source.split(before).length,2,'fixture anchor: '+before);source=source.replace(before,after);}
replace('  context.window=context;context.top=context;',`
  context.__NFSU2_DYNO_CORE__=require('../extension/dyno-core.js');
  const fullLog={controllers:[],lookups:[],prepared:Object.freeze({fixture:true}),drafts:[],loads:0,previews:0,resets:0};
  context.__NFSU2_AI__.getNativeEvaluator=mod=>{fullLog.lookups.push(mod);return fullLog.prepared;};
  if(compatibility.fullBackend!==false)context.__NFSU2_DYNO_FULL__={Controller:class extends context.__NFSU2_DYNO__.Controller {
    constructor(memory,patched,revision,options){super(memory,patched,revision);this.full=true;this.memory=memory;this.options=options;fullLog.controllers.push(this);}
    async loadSetup(){fullLog.loads++;this.outcome=null;this.editor={baseline:new Uint8Array(41).fill(100),draft:new Uint8Array(41).fill(100),allowedOffsets:compatibility.allowedOffsets||Array.from({length:41},(_,i)=>i),unlockedOffsets:compatibility.unlockedOffsets||Array.from({length:41},(_,i)=>i)};return this.editor;}
    setDraft(offset,value){if(!this.editor.allowedOffsets.includes(offset))throw Error('Setting is locked or unverified');if(!Number.isInteger(value)||value<0||value>200)throw Error('Invalid setting');fullLog.drafts.push({offset,value});this.editor.draft[offset]=value;this.outcome=null;}
    resetDraft(){fullLog.resets++;this.editor.draft.set(this.editor.baseline);this.outcome=null;}
    async preview(){fullLog.previews++;const changes=context.__NFSU2_DYNO_CORE__.setupDiff(this.editor.baseline,this.editor.draft);this.outcome={type:'manual',changed:changes.length>0,changes,bestResult:{zeroTo60Seconds:6,zeroTo100Seconds:14,topSpeedMps:70,peakPowerKw:220,peakTorqueNm:310,nitrousSeconds:7,nitrousTorque:.2}};return this.outcome;}
    async apply(){if(!this.outcome?.changed)throw Error('No preview to stage');await super.apply();return {saveReady:compatibility.saveReady!==false};}
  }};
  context.window=context;context.top=context;`);
replace('  return {...f,nodes,worker,status,physics,wheels,gameModule,','  return {...f,nodes,worker,status,physics,wheels,gameModule,fullLog,');
const context={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,URL,setImmediate};
vm.runInNewContext(source+'\nthis.makeFullPageFixture=pageFixture;',context,{filename:coreFile});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(extra={}){
 const f=await context.makeFullPageFixture(null,true,true,{capabilities:{legacy:true,ai:true,pace:true,corner:true,walls:true,dyno:true,dragAI:true,fullTuner:true},...extra});
 f.nodes['dyno-goal'].options=['peakPower','peakTorque','acceleration60','acceleration100','topSpeed'].map(value=>({value,disabled:false}));
 f.nodes['dyno-goal'].value='peakPower';
 return f;
}
async function load(f){f.change('dyno-enable',true);f.click('tune-load');await settle();f.run();}

test('page selects full controller with exact module evaluator and keeps legacy fallback capability-gated',async()=>{
 const f=await fixture(),full=f.fullLog.controllers[0];
 assert.equal(f.fullLog.controllers.length,1);assert.equal(f.dynoLog.instance,full);assert.equal(full.options.module,f.gameModule);assert.equal(full.options.prepared,f.fullLog.prepared);assert.equal(f.fullLog.lookups[0],f.gameModule);assert.equal(full.memory,f.memory);
 f.change('dyno-enable',true);f.run();assert.equal(f.nodes['tune-load'].disabled,false);assert.equal(f.nodes['dyno-goal'].options.some(o=>o.disabled),false);
 for(const extra of [{fullBackend:false},{capabilities:{legacy:true,dyno:true}}]){
  const old=await fixture(extra);old.change('dyno-enable',true);old.nodes['dyno-goal'].value='acceleration60';old.run();
  assert.equal(old.fullLog.controllers.length,0);assert.equal(old.fullLog.lookups.length,0);assert.equal(old.nodes['tune-load'].disabled,true);assert.equal(old.nodes['dyno-goal'].value,'peakPower');
  assert.deepEqual(old.nodes['dyno-goal'].options.filter(o=>o.disabled).map(o=>o.value),['acceleration60','acceleration100','topSpeed']);
 }
 const unknown=await fixture({verified:false});unknown.change('dyno-enable',true);unknown.run();assert.equal(unknown.fullLog.controllers.length,0);assert.equal(unknown.nodes['tune-load'].disabled,true);assert.equal(unknown.nodes['dyno-find'].disabled,true);
});

test('full editor renders all41 fields and native mode labels without changing game memory',async()=>{
 const f=await fixture(),before=Buffer.from(f.memory.buffer);await load(f);
 const seen=[];
 for(const group of Tune.GROUPS){
  f.change('tune-group',group.id);
  for(let i=0;i<9;i++){
   const offset=group.offsets[i],present=offset!==undefined;
   assert.equal(f.nodes['tune-row-'+i].hidden,!present);
   if(present){seen.push(offset);assert.equal(f.nodes['tune-input-'+i].dataset.offset,String(offset));assert.equal(f.nodes['tune-label-'+i].textContent,Tune.FIELD_LABELS[offset]);assert.equal(f.nodes['tune-value-'+i].textContent,'0');assert.equal(f.nodes['tune-input-'+i].disabled,false);}
  }
 }
 assert.deepEqual(seen.sort((a,b)=>a-b),Array.from({length:41},(_,i)=>i));
 for(let kind=0;kind<5;kind++){f.dynoLog.instance.kind=kind;f.run();assert.ok(f.nodes['dyno-mode'].textContent.includes(Tune.MODE_LABELS[kind]));assert.ok(f.nodes['dyno-mode'].textContent.includes('slot '+(kind+1)+' of 5'));}
 assert.deepEqual(Buffer.from(f.memory.buffer),before);
});

test('full editor distinguishes locked and unverified fields and routes draft values before staging',async()=>{
 const f=await fixture({allowedOffsets:[21],unlockedOffsets:[21,22]});await load(f);f.change('tune-group','suspension');
 assert.match(f.nodes['tune-label-0'].textContent,/locked$/);assert.equal(f.nodes['tune-input-0'].disabled,true);
 f.change('tune-group','aero');assert.equal(f.nodes['tune-input-0'].disabled,false);assert.equal(f.nodes['tune-input-1'].disabled,true);assert.match(f.nodes['tune-label-1'].textContent,/unverified$/);
 const before=Buffer.from(f.memory.buffer);f.input('tune-input-0',25);
 assert.equal(f.fullLog.drafts.length,1);assert.equal(f.fullLog.drafts[0].offset,21);assert.equal(f.fullLog.drafts[0].value,125);assert.equal(f.nodes['tune-value-0'].textContent,'+25');assert.equal(f.nodes['dyno-apply'].disabled,true);
 f.click('tune-preview');await settle();assert.equal(f.nodes['dyno-apply'].disabled,false);assert.match(f.nodes['tune-changes'].textContent,/Front downforce: 0 → \+25/);assert.match(f.nodes['dyno-state'].textContent,/Game unchanged/);assert.match(f.nodes['dyno-state'].textContent,/No handling\/lap-time measurement/);assert.equal(f.dynoLog.applies,0);
 f.input('tune-input-0',-100);assert.equal(f.nodes['dyno-apply'].disabled,true);assert.equal(f.dynoLog.instance.editor.draft[21],0);
 f.click('tune-reset');assert.equal(f.dynoLog.instance.editor.draft[21],100);assert.equal(f.fullLog.resets,1);assert.equal(f.nodes['dyno-apply'].disabled,true);assert.deepEqual(Buffer.from(f.memory.buffer),before);
});

test('full preview stage and restore are explicit and never report a disk save',async()=>{
 const f=await fixture({saveReady:false});await load(f);f.click('tune-preview');await settle();assert.equal(f.nodes['dyno-apply'].disabled,true);
 f.input('tune-input-0',10);f.click('tune-preview');await settle();f.click('dyno-apply');await settle();
 assert.equal(f.dynoLog.applies,1);assert.equal(f.nodes['dyno-apply'].disabled,true);assert.equal(f.nodes['tune-load'].disabled,true);assert.equal(f.nodes['tune-preview'].disabled,true);assert.equal(f.nodes['tune-input-0'].disabled,true);assert.equal(f.nodes['dyno-restore'].disabled,false);
 assert.match(f.nodes['dyno-state'].textContent,/Selected preset staged/);assert.match(f.nodes['dyno-state'].textContent,/Disk save is not confirmed/);assert.match(f.nodes['dyno-state'].textContent,/Other presets also have unsaved edits/);
 f.click('dyno-restore');await settle();assert.equal(f.dynoLog.restores,1);assert.equal(f.nodes['dyno-restore'].disabled,true);assert.equal(f.nodes['tune-load'].disabled,false);assert.match(f.nodes['dyno-state'].textContent,/selected-visit settings restored/);
});

function searchResult({goal='peakPower',manualOffset=21,manualValue=145,autoOffset=null,autoValue=100,adjustedRequest=null,improved=false,improvedFromSeed=false,baselineMetric=200,bestMetric=200}={}){
 const baseline=new Uint8Array(41).fill(100),seed=baseline.slice(),best=baseline.slice();
 if(manualOffset!==null)seed[manualOffset]=manualValue;best.set(seed);if(autoOffset!==null)best[autoOffset]=autoValue;
 const bestRequest=best.slice();if(adjustedRequest!==null)bestRequest[autoOffset]=adjustedRequest;
 const fields={peakPower:'peakPowerKw',peakTorque:'peakTorqueNm',acceleration60:'zeroTo60Seconds',acceleration100:'zeroTo100Seconds',topSpeed:'topSpeedMps'};
 const changes=Tune.setupDiff(baseline,best,bestRequest);
 return {type:'search',goal,baseline,baselineResult:{[fields[goal]]:baselineMetric},seed,seedRequest:seed.slice(),seedResult:{[fields[goal]]:baselineMetric},best,bestRequest,bestResult:{[fields[goal]]:bestMetric},evaluations:48,improved,improvedFromSeed,changes,changed:changes.some(x=>x.before!==x.after)};
}
async function search(f,result){
 f.dynoLog.instance.find=async()=>{f.dynoLog.finds++;f.dynoLog.instance.outcome=result;return result;};
 f.nodes['dyno-goal'].value=result.goal;f.click('dyno-find');await settle();
}

test('full search retains a manual draft without measured improvement and stages only after explicit click',async()=>{
 const f=await fixture();await load(f);f.change('tune-group','aero');f.input('tune-input-0',45);
 const before=Buffer.from(f.memory.buffer),result=searchResult();await search(f,result);
 assert.equal(f.nodes['dyno-apply'].disabled,false);assert.equal(f.dynoLog.applies,0);
 assert.match(f.nodes['tune-changes'].textContent,/Front downforce: 0 → \+45/);
 assert.match(f.nodes['dyno-state'].textContent,/200.0 → 200.0 kW/);assert.match(f.nodes['dyno-state'].textContent,/No measured goal improvement versus original/);assert.match(f.nodes['dyno-state'].textContent,/No further measured improvement over the draft\. Accepted manual draft retained/);assert.match(f.nodes['dyno-state'].textContent,/Review accepted changes, then Stage selected preset/);
 assert.deepEqual(Buffer.from(f.memory.buffer),before);f.click('dyno-apply');await settle();assert.equal(f.dynoLog.applies,1);assert.equal(f.nodes['dyno-apply'].disabled,true);assert.match(f.nodes['dyno-state'].textContent,/Disk save is not confirmed/);
});

test('full search shows accepted baseline changes and distinguishes seed improvement from original metrics',async()=>{
 const f=await fixture();await load(f);
 const result=searchResult({manualOffset:0,manualValue:145,autoOffset:23,autoValue:120,adjustedRequest:130,improvedFromSeed:true,baselineMetric:500,bestMetric:103});
 await search(f,result);
 assert.equal(f.nodes['dyno-apply'].disabled,false);assert.match(f.nodes['tune-changes'].textContent,/Front springs: 0 → \+45/);assert.match(f.nodes['tune-changes'].textContent,/ECU point 1: 0 → \+20 \(native adjusted request \+30\)/);
 assert.match(f.nodes['dyno-state'].textContent,/500.0 → 103.0 kW/);assert.match(f.nodes['dyno-state'].textContent,/No measured goal improvement versus original/);assert.match(f.nodes['dyno-state'].textContent,/Search improved the measured goal over your draft/);assert.doesNotMatch(f.nodes['dyno-state'].textContent,/Measured goal improved versus original|Accepted manual draft retained/);
 f.input('tune-input-0',30);assert.equal(f.nodes['dyno-apply'].disabled,true);assert.doesNotMatch(f.nodes['tune-changes'].textContent,/ECU point 1:/);
});

test('full search gates Stage on accepted changes rather than improved and supports every goal without an editor',async()=>{
 for(const goal of ['peakPower','peakTorque','acceleration60','acceleration100','topSpeed']){
  const f=await fixture();f.change('dyno-enable',true);f.run();
  await search(f,searchResult({goal,manualOffset:null,autoOffset:23,autoValue:120,improved:true,improvedFromSeed:true,bestMetric:220}));
  assert.equal(f.nodes['dyno-apply'].disabled,false);assert.match(f.nodes['tune-changes'].textContent,/ECU point 1: 0 → \+20/);assert.match(f.nodes['dyno-state'].textContent,/Measured goal improved versus original/);assert.doesNotMatch(f.nodes['dyno-state'].textContent,/manual draft retained|over your draft/);
  await search(f,searchResult({goal,manualOffset:null,improved:true}));
  assert.equal(f.nodes['dyno-apply'].disabled,true);assert.equal(f.nodes['tune-changes'].textContent,'No accepted setup changes.');assert.doesNotMatch(f.nodes['dyno-state'].textContent,/Stage selected preset/);
 }
});

test('legacy search remains improved-only even when a changed field is present',async()=>{
 const f=await fixture({fullBackend:false});f.change('dyno-enable',true);f.run();
 await search(f,searchResult());assert.equal(f.nodes['dyno-apply'].disabled,true);assert.match(f.nodes['dyno-state'].textContent,/No improvement found/);assert.doesNotMatch(f.nodes['tune-changes'].textContent,/Front downforce:/);
 await search(f,searchResult({manualOffset:null,improved:true,bestMetric:220}));assert.equal(f.nodes['dyno-apply'].disabled,false);assert.match(f.nodes['dyno-state'].textContent,/Stage preview to use this tune/);
});

test('full editor pauses controls on blur hidden busy F9 and resumes without implying save',async()=>{
 const f=await fixture();await load(f);const d=f.dynoLog.instance;
 f.focus(false);f.run();assert.equal(f.nodes['tune-preview'].disabled,true);f.focus(true);f.run();assert.equal(f.nodes['tune-preview'].disabled,false);
 f.hidden(true);f.run();assert.equal(f.nodes['tune-load'].disabled,true);f.hidden(false);f.run();assert.equal(f.nodes['tune-load'].disabled,false);
 d.busy=true;f.run();for(const id of ['tune-load','tune-preview','tune-reset','tune-group','tune-input-0','dyno-apply'])assert.equal(f.nodes[id].disabled,true,id);assert.equal(f.nodes['dyno-cancel'].disabled,false);
 const loads=f.fullLog.loads;f.click('tune-load');await settle();assert.equal(f.fullLog.loads,loads);
 d.busy=false;f.run();f.press('F8');f.press('Escape');assert.equal(f.nodes['dyno-enable'].checked,true);assert.equal(f.nodes['tools-panel'].hidden,true);
 f.press('F9');f.run();assert.equal(f.nodes['dyno-enable'].checked,false);assert.equal(d.enabled,false);assert.equal(f.nodes['tune-load'].disabled,true);assert.equal(f.nodes['tune-preview'].disabled,true);assert.equal(f.dynoLog.applies,0);
 f.change('dyno-enable',true);f.run();assert.equal(f.nodes['tune-load'].disabled,false);assert.equal(f.nodes['dyno-apply'].disabled,true);
});

test('full page merge leaves existing grip limits and missing native tuning authority unchanged',async()=>{
 const f=await fixture();assert.equal(f.nodes.downforce,undefined);assert.match(f.html(),/id="grip-factor"[^>]*max="2"/);assert.doesNotMatch(f.html(),/id="downforce-factor"/);
 const page=fs.readFileSync(require.resolve('../extension/page.js'),'utf8');assert.doesNotMatch(page,/__NFSU2_NATIVE_TUNING__|nativeProcessControl|nativeBindingBlocked/);
 for(const name of ['current-profile.js','latest-profile.js','next-profile.js'])assert.notEqual(require('../extension/'+name).capabilities.nativeTuning,true);
 const manifest=JSON.parse(fs.readFileSync(require.resolve('../extension/manifest.json'),'utf8'));assert.equal(manifest.content_scripts[0].js.includes('native-tuning.js'),false);
});
