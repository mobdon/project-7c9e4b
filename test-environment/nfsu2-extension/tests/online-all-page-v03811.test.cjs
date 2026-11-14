'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const file=require.resolve('./core.test.cjs'),baseRequire=createRequire(file);
const context={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,Blob,URL,setImmediate};
vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nthis.makeAllFixture=pageFixture;',context,{filename:file});
const profile=require('../extension/aa-profile.js');
const capabilities={...profile.capabilities,onlineTraffic:true,onlinePlayers:true,onlineRivals:true,onlineRaceCars:true,onlinePlayerOutrun:true};
const actual=async(options={})=>{const f=await context.makeAllFixture(options.saved||null,true,false,{revision:profile.revision,profile:{...profile,capabilities:{...capabilities,...options.capabilities}}});f.run();return f;};
const last=f=>f.carLog.updates.at(-1);

test('online master selects all verified car categories with network permission and preserves the driver',async()=>{
 const f=await actual();assert.equal(f.nodes['online-all'].checked,false);assert.equal(f.nodes['online-all'].disabled,false);
 f.change('ai',true);f.change('online-all',true);f.run();
 for(const key of ['onlineTraffic','onlinePlayers','onlineRivals','allowNetwork'])assert.equal(last(f)[key],true,key);
 assert.equal(f.prefs().ai,true);assert.equal(f.aiLog.updates.at(-1).enabled,true);assert.equal(f.nodes['online-all'].checked,true);
 f.change('online-all',false);f.run();
 for(const key of ['onlineTraffic','onlinePlayers','onlineRivals'])assert.equal(last(f)[key],false,key);
 assert.equal(last(f).allowNetwork,true);assert.equal(f.prefs().ai,true);assert.equal(f.aiLog.updates.at(-1).enabled,true);
});

test('master exact capability gate and individual overrides never advertise full coverage',async()=>{
 for(const value of [false,undefined,1]){
  const f=await actual({capabilities:{onlinePlayerOutrun:value}});assert.equal(f.nodes['online-all'].disabled,true);
  f.change('online-all',true);f.run();assert.equal(last(f).allowNetwork,false);assert.equal(last(f).onlineRivals,false);assert.equal(f.nodes['online-all'].checked,false);
 }
 const f=await actual();f.change('online-all',true);f.change('players',false);f.run();assert.equal(f.nodes['online-all'].checked,false);assert.equal(last(f).onlinePlayers,false);assert.equal(last(f).onlineTraffic,true);assert.equal(last(f).onlineRivals,true);
 f.change('players',true);f.run();assert.equal(f.nodes['online-all'].checked,true);
 f.change('online',false);f.run();assert.equal(f.nodes['online-all'].checked,false);assert.equal(last(f).allowNetwork,false);
});

test('Stop clears master immediately and reload cannot restore the session rival selection',async()=>{
 const f=await actual();f.change('online-all',true);f.run();const saved=JSON.stringify(f.prefs());f.click('stop');
 assert.equal(f.nodes['online-all'].checked,false);f.run();assert.equal(last(f).onlineRivals,false);assert.equal(last(f).onlinePlayers,false);assert.equal(last(f).onlineTraffic,false);assert.equal(last(f).allowNetwork,false);
 const next=await actual({saved});assert.equal(next.nodes['online-all'].checked,false);assert.equal(last(next).onlineRivals,false);
 assert.match(f.html(),/Outrun covers verified current challenge participants/);assert.doesNotMatch(f.html(),/go flying|guaranteed wins/);
});
