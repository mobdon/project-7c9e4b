'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const file=require.resolve('./core.test.cjs'),baseRequire=createRequire(file);
let source=fs.readFileSync(file,'utf8');
const needle='  context.window=context;context.top=context;';
assert.equal(source.split(needle).length-1,1);
source=source.replace(needle,`
  context.__NFSU2_NEAR_MISS_CONTROL__=require('../extension/near-miss-control.js');
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
  for(const name of ['near-miss-events.js','near-miss-control.js'])assert(scripts.indexOf(name)>=0&&scripts.indexOf(name)<scripts.indexOf('page.js'));
});

test('current and unverified game profiles keep synthetic awards unavailable with no memory writes',async()=>{
  for(const verified of [true,false]){
    const f=await sandbox.makeNearMissPage(JSON.stringify({nos:true,online:true,nearMiss:true}),true,false,{verified});
    const before=Buffer.from(f.memory.buffer);f.run(3);f.click('near-miss-request');f.run(3);
    assert.equal(f.nodes['near-miss-request'].disabled,true);
    assert.match(f.nodes['near-miss-state'].textContent,/unavailable/);
    assert.equal(f.nearMissLog.lookups,0);assert.equal(f.nearMissLog.requests.length,0);
    assert.deepEqual(Buffer.from(f.memory.buffer),before);
    assert.equal(f.nodes.nos.disabled,true);assert.equal(f.nodes.nos.checked,false);
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
  assert.equal(f.nearMissLog.requests.length,1);assert.equal(f.nodes.nos.checked,false);
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
