'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const file=require.resolve('./core.test.cjs'),baseRequire=createRequire(file);
let source=fs.readFileSync(file,'utf8');
const needle='  context.window=context;context.top=context;';
assert.equal(source.split(needle).length-1,1);
source=source.replace(needle,`
  context.__NFSU2_NEAR_MISS_CONTROL__=require('../extension/near-miss-control.js');
  context.__NFSU2_NEAR_MISS_TOP_UP__=require('../extension/near-miss-top-up.js');
  context.__NFSU2_NEAR_MISS_EVENTS__=require('../extension/near-miss-events.js');
  const nearMissLog={lookups:0,creations:[],requests:[],polls:0,cancels:0,receipt:null};
  const fakeBridge={verified:true,ownsMailbox:true,witnessedEvents:true,protocolVersion:4,moduleHash:verifiedProfile?.hash,
    request(args){const request={...args,epoch:2,token:101,racer:55,manager:66,style:77};delete request.allowNetwork;nearMissLog.requests.push(request);return{published:true,request};},
    poll(){nearMissLog.polls++;return nearMissLog.receipt;},cancel(){nearMissLog.cancels++;return{requested:true,confirmed:false};}};
  let cachedBridge=null;
  context.__NFSU2_AI__.getNearMissBridge=(mod,memory,generation)=>{
    nearMissLog.lookups++;
    if(!compatibility.fakeNearMissBridge)return null;
    if(memory!==undefined&&cachedBridge?.generation!==generation){
      cachedBridge={...fakeBridge,moduleIdentity:mod,generation};
      nearMissLog.creations.push({memory,generation,bridge:cachedBridge});
    }
    return cachedBridge;
  };
  context.window=context;context.top=context;`);
source=source.replace('return {...f,nodes,worker,status,physics,wheels,gameModule,','return {...f,nodes,worker,status,physics,wheels,gameModule,nearMissLog,');
const sandbox={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,URL,setImmediate};
vm.runInNewContext(source+'\nthis.makeNearMissPage=pageFixture;',sandbox,{filename:file});
const supported={legacy:true,ai:true,pace:true,corner:true,walls:true,dyno:true,dragAI:true};

test('manifest loads the shared near-miss control before the actual page',()=>{
  const scripts=JSON.parse(fs.readFileSync(require.resolve('../extension/manifest.json'))).content_scripts[0].js;
  for(const name of ['near-miss-events.js','near-miss-control.js','near-miss-top-up.js'])assert(scripts.indexOf(name)>=0&&scripts.indexOf(name)<scripts.indexOf('page.js'));
});

test('current and unverified game profiles keep synthetic awards unavailable with no memory writes',async()=>{
  for(const verified of [true,false]){
    const f=await sandbox.makeNearMissPage(JSON.stringify({nos:true,online:true,nearMiss:true}),true,false,{verified});
    const before=Buffer.from(f.memory.buffer);f.run(3);f.click('near-miss-request');f.run(3);
    assert.equal(f.nodes['near-miss-request'].disabled,true);
    assert.match(f.nodes['near-miss-state'].textContent,/unavailable/);
    assert.equal(f.nearMissLog.lookups,0);assert.equal(f.nearMissLog.requests.length,0);
    assert.deepEqual(Buffer.from(f.memory.buffer),before);
    assert.equal(f.nodes.nos,undefined);assert.equal(f.nodes['nos-state'],undefined);assert.equal(f.prefs().nos,undefined);
  }
});

test('a capability bit without a native worker service cannot enable synthetic awards',async()=>{
  const f=await sandbox.makeNearMissPage(null,true,false,{capabilities:{...supported,nativeSyntheticNearMiss:true}});
  const before=Buffer.from(f.memory.buffer);f.run(2);f.click('near-miss-request');
  assert(f.nearMissLog.lookups>0);assert.equal(f.nodes['near-miss-request'].disabled,true);
  assert.equal(f.nearMissLog.requests.length,0);assert.deepEqual(Buffer.from(f.memory.buffer),before);
});

test('page control makes one manual request and displays mismatched native observations without retry',async()=>{
  // This fake service verifies page wiring only; native award execution has a
  // separate original-body fixture and is not established by this test.
  const profile={revision:'6f4f1e4e',hash:'a'.repeat(64),capabilities:{...supported,nativeSyntheticNearMiss:true}};
  const f=await sandbox.makeNearMissPage(null,true,false,{profile,fakeNearMissBridge:true});
  f.run(2);assert.equal(f.nearMissLog.requests.length,0);assert.equal(f.nodes['near-miss-request'].disabled,false);
  f.click('near-miss-request');f.click('near-miss-request');f.run(3);
  assert.equal(f.nearMissLog.requests.length,1);assert.equal(f.nodes['near-miss-request'].disabled,true);
  const request=f.nearMissLog.requests[0];
  f.nearMissLog.receipt={acknowledged:true,request,result:11,points:100,nos:333,event:{status:'EVENT_MISMATCH'}};
  f.run(2);assert.match(f.nodes['near-miss-state'].textContent,/Different native event/);
  assert.match(f.nodes['near-miss-state'].textContent,/tick style 100 · tick NOS 333/);
  assert.equal(f.nearMissLog.requests.length,1);assert.equal(f.nodes.nos,undefined);
});

test('F9 requests cancellation of an outstanding near miss and never dispatches a replacement',async()=>{
  const profile={revision:'6f4f1e4e',hash:'a'.repeat(64),capabilities:{...supported,nativeSyntheticNearMiss:true}};
  const f=await sandbox.makeNearMissPage(null,true,false,{profile,fakeNearMissBridge:true});
  f.run();f.click('near-miss-request');f.press('F9');f.run(3);
  assert.equal(f.nearMissLog.requests.length,1);assert.equal(f.nearMissLog.cancels,1);
  assert.equal(f.nodes['near-miss-request'].disabled,true);assert.equal(f.prefs().online,false);
});

test('page defers a new native mailbox until driving status is initialized',async()=>{
  const profile={revision:'6f4f1e4e',hash:'a'.repeat(64),capabilities:{...supported,nativeSyntheticNearMiss:true}};
  const f=await sandbox.makeNearMissPage(null,true,false,{profile,fakeNearMissBridge:true});
  f.drive(0);f.run(2);
  assert.equal(f.nearMissLog.creations.length,0);assert.equal(f.nodes['near-miss-request'].disabled,true);
  f.drive(2);f.run();
  assert.equal(f.nearMissLog.creations.length,1);assert.equal(f.nodes['near-miss-request'].disabled,false);
  assert.equal(f.nearMissLog.requests.length,0);
});

test('a primary restart using the same module cannot reuse the previous session bridge',async()=>{
  const profile={revision:'6f4f1e4e',hash:'a'.repeat(64),capabilities:{...supported,nativeSyntheticNearMiss:true}};
  const f=await sandbox.makeNearMissPage(null,true,false,{profile,fakeNearMissBridge:true});
  f.run();const first=f.nearMissLog.creations[0];
  assert(first);
  const next=f.createWorker();next.postMessage({mod:f.gameModule,memory:f.memory,slot:0});
  assert.equal(f.nearMissLog.creations.length,1,'Boot without fresh status cannot claim the next session');
  assert.equal(f.nodes['near-miss-request'].disabled,true);
  next.emit({t:'register',kind:5,ptr:f.status});f.run();
  assert.equal(f.nearMissLog.creations.length,2);
  const second=f.nearMissLog.creations[1];
  assert.equal(second.generation,first.generation+1);assert.notEqual(second.bridge,first.bridge);
  f.click('near-miss-request');
  assert.equal(f.nearMissLog.requests.length,1);assert.equal(f.nearMissLog.requests[0].generation,second.generation);
});

async function topUpPage(saved=null){
  const profile={revision:'6f4f1e4e',hash:'a'.repeat(64),capabilities:{...supported,nativeSyntheticNearMiss:true}};
  const f=await sandbox.makeNearMissPage(saved,true,false,{profile,fakeNearMissBridge:true});
  f.run();return f;
}
function completeAward(f,{result=1,points=100,nos=333}={}){
  const request=f.nearMissLog.requests.at(-1),{id,epoch,...target}=request;
  f.nearMissLog.receipt={acknowledged:true,request,result,points,nos,event:{status:'VERIFIED',producerPendingPoints:100,request:{id,epoch,target}}};
}
test('top-up waits at full, requests only below full and resumes after later consumption',async()=>{
  const f=await topUpPage();f.put(f.car+0x45c,40000);f.put(f.car+0x460,0);
  f.change('near-miss-top-up',true);f.run(8);
  assert.equal(f.nodes['near-miss-top-up'].checked,true);assert.equal(f.nearMissLog.requests.length,0);
  f.put(f.car+0x45c,39000);f.run();f.run(3);f.click('near-miss-request');
  assert.equal(f.nearMissLog.requests.length,1,'Manual and automatic requests share one pending slot');
  f.put(f.car+0x45c,40000);completeAward(f);f.run(8);
  assert.equal(f.nearMissLog.requests.length,1);assert.equal(f.nodes['near-miss-top-up'].checked,true);
  f.put(f.car+0x45c,39000);f.nearMissLog.receipt=null;f.run();
  assert.equal(f.nearMissLog.requests.length,2);
  assert.equal(f.nearMissLog.requests[1].id,2);
});
test('top-up uses effective NOS during consumption and does not edit resource memory',async()=>{
  const f=await topUpPage();f.put(f.car+0x45c,40000);f.put(f.car+0x460,199000);
  const before=Buffer.from(f.memory.buffer);f.change('near-miss-top-up',true);f.run();
  assert.equal(f.nearMissLog.requests.length,1,'Raw full credit with elapsed active consumption is below effective full');
  assert.deepEqual(Buffer.from(f.memory.buffer),before);
});
test('F9 disarms top-up and style-only completion never starts another automatic award',async()=>{
  for(const stop of [false,true]){
    const f=await topUpPage();f.put(f.car+0x45c,1000);f.change('near-miss-top-up',true);f.run();
    assert.equal(f.nearMissLog.requests.length,1);
    if(stop)f.press('F9');else completeAward(f,{result:9,nos:0});
    f.run(15);
    assert.equal(f.nodes['near-miss-top-up'].checked,false);assert.equal(f.nearMissLog.requests.length,1);
    if(stop)assert.equal(f.nearMissLog.cancels,1);
  }
});
test('old saved NOS and top-up choices cannot arm the synthetic loop on reload',async()=>{
  const f=await topUpPage(JSON.stringify({nos:true,nearMissTopUp:true,online:true}));
  f.run(12);assert.equal(f.nodes['near-miss-top-up'].checked,false);
  assert.equal(f.nearMissLog.requests.length,0);assert.equal(f.nodes.nos,undefined);assert.equal(f.prefs().nos,undefined);
});
test('memory-port replacement and game exit disarm top-up before retiring the session',async()=>{
  for(const end of ['memory-port','trap','exit']){
    const f=await topUpPage();f.put(f.car+0x45c,1000);f.change('near-miss-top-up',true);
    assert.equal(f.nodes['near-miss-top-up'].checked,true);
    if(end==='memory-port')f.createWorker().postMessage({mod:f.gameModule,memory:{},slot:0});
    else f.worker.emit({t:end});
    assert.equal(f.nodes['near-miss-top-up'].checked,false);
    f.run(12);assert.equal(f.nearMissLog.requests.length,0);
  }
});
