'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const file=require.resolve('./diagnostics-page.test.cjs'),baseRequire=createRequire(file),ctx={require:Object.assign(n=>n==='node:test'?{test(){}}:baseRequire(n),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,Blob,URL,setImmediate};
vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nthis.fixture=fixture;',ctx,{filename:file});
const next=require('../extension/next-profile.js');
async function fixture(available=true){
 const controllers=[];
 class Capture {
  constructor(){this.verified=true;this.enabled=false;this.samples=[];this.text='Off';this.polls=0;this.starts=0;controllers.push(this);}
  start(){this.starts++;this.enabled=true;this.samples=[];this.text='Armed';}
  stop(reason='Off'){this.enabled=false;this.text=reason;}
  invalidate(reason){this.stop(reason);this.verified=false;}
  poll(){this.polls++;}
  export(){return {schema:'nfsu2-race-geometry-v1',wholeRaceChecked:false,samples:this.samples};}
 }
 const profile={...next,capabilities:{...next.capabilities,nativeRaceCapture:available}};
 const f=await ctx.fixture(null,true,true,{revision:profile.revision,profile,capture:{Controller:Capture}});
 return {...f,controllers,capture:()=>controllers.at(-1)};
}
test('native capture is default off, explicit and separate from all driving preferences',async()=>{
 const f=await fixture();f.change('tester',false);assert.equal(f.capture().enabled,false);assert.equal(f.nodes['race-capture-enable'].checked,false);assert.equal(f.nodes['race-capture-enable'].disabled,false);
 const before=Buffer.from(new Uint8Array(f.memory.buffer)),prefs=f.prefs();f.change('race-capture-enable',true);f.run(4);
 assert.equal(f.capture().starts,1);assert.equal(f.capture().enabled,true);assert.equal(f.nodes.ai.checked,false);assert.deepEqual(f.prefs(),prefs);assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer)),before);
});
test('unsupported capture stays disabled while existing driver controls remain usable',async()=>{
 const f=await fixture(false);assert.equal(f.capture(),undefined);assert.equal(f.nodes['race-capture-enable'].disabled,true);
 f.change('ai',true);f.run(4);assert.equal(f.aiLog.updates.at(-1).enabled,true);
});
test('manual takeover, Stop, blur, hidden and tuner pause stop recording without rearming',async()=>{
 for(const [name,pause] of [['manual',f=>f.press('F7')],['stop',f=>f.press('F9')],['quick-stop',f=>f.click('quick-stop')],['blur',f=>f.focus(false)],['hidden',f=>f.hidden(true)],['tuner',f=>{f.dynoLog.instance.busy=true;f.run();}]]){
  const f=await fixture();f.change('race-capture-enable',true);pause(f);assert.equal(f.capture().enabled,false,name);assert.equal(f.nodes['race-capture-enable'].checked,false,name);f.focus(true);f.hidden(false);f.run(4);assert.equal(f.capture().enabled,false,name);
 }
});
test('session replacement and game exit invalidate capture provenance immediately',async()=>{
 const f=await fixture();f.change('race-capture-enable',true);const old=f.capture();const worker=f.createWorker();worker.postMessage({mod:f.gameModule,memory:f.memory,slot:0});assert.equal(old.verified,false);assert.equal(f.capture().enabled,false);
 f.change('race-capture-enable',true);worker.emit({t:'exit'});assert.equal(f.capture().verified,false);assert.equal(f.nodes['race-capture-enable'].disabled,true);assert.equal(f.nodes['race-capture-enable'].checked,false);
});
test('capture export stays local and explicitly partial; empty export is reported',async()=>{
 const f=await fixture();f.click('race-capture-export');assert.equal(f.downloads.length,0);assert.match(f.nodes.note.textContent,/No native race samples/);
 f.capture().samples=[{track:4715,nodeCount:28,cornerCount:0}];f.click('race-capture-export');assert.equal(f.downloads.length,1);
 const data=JSON.parse(await f.downloads[0].text());assert.equal(data.wholeRaceChecked,false);assert.equal(data.samples[0].cornerCount,0);
});
