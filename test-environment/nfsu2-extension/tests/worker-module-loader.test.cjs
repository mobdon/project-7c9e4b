'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {MessageChannel}=require('node:worker_threads');
const {once}=require('node:events');
const Loader=require('../extension/worker-module-loader.js');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function moduleWithTag(tag){
 const name=Buffer.from('tag'),value=Buffer.from(tag),body=Buffer.concat([Buffer.from([name.length]),name,value]);
 return new WebAssembly.Module(Buffer.concat([Buffer.from([0,97,115,109,1,0,0,0,0,body.length]),body]));
}
const tag=module=>Buffer.from(WebAssembly.Module.customSections(module,'tag')[0]).toString();
const memory=()=>new WebAssembly.Memory({initial:1,maximum:2,shared:true});
class Worker{
 constructor(){this.sent=[];this.terminated=false;}
 postMessage(message,arg){
  const transfers=Array.isArray(arg)?arg:arg?.transfer||[];
  const copied=structuredClone(message,{transfer:transfers});
  this.sent.push({message:copied,argumentModule:message?.mod,form:Array.isArray(arg)?'array':arg?'options':'none'});
 }
 terminate(){this.terminated=true;return 'terminated';}
}

test('one preparation decision serves primary and secondary workers, preserving FIFO, snapshot and shared memory',async()=>{
 const original=moduleWithTag('original'),prepared=moduleWithTag('prepared'),mem=memory();let resolve,calls=0;
 const loader=Loader.create({prepare:()=>{calls++;return new Promise(done=>resolve=done);}}),a=new Worker(),b=new Worker(),observations=[];
 loader.attach(a,{onForward:(m,meta)=>observations.push({m,meta})});loader.attach(b);
 const init={mod:original,memory:mem,slot:0,pool:2,cfg:{env:{existingReportMarker:'unchanged'}}};
 assert.equal(a.postMessage(init),undefined);a.postMessage({t:'after',n:1});
 b.postMessage({...init,slot:1});init.cfg.env.existingReportMarker='later edit';
 assert.equal(a.sent.length,0);await flush();assert.equal(calls,1);
 resolve({module:prepared,profile:{revision:'fixture'}});await flush();
 assert.deepEqual(a.sent.map(x=>x.message.t||'init'),['init','after']);
 assert.equal(a.sent[0].argumentModule,prepared);assert.equal(b.sent[0].argumentModule,prepared);
 assert.equal(a.sent[0].message.cfg.env.existingReportMarker,'unchanged');
 assert.equal(observations[0].meta.originalMemory,mem);assert.equal(observations[0].meta.verified,true);
 new Uint8Array(mem.buffer)[3]=19;assert.equal(new Uint8Array(a.sent[0].message.memory.buffer)[3],19);
});

test('a late older primary cannot replace the newest session and current-family secondaries remain observable',async()=>{
 const oldModule=moduleWithTag('old'),newModule=moduleWithTag('new'),oldPrepared=moduleWithTag('old prepared'),newPrepared=moduleWithTag('new prepared');
 const oldMemory=memory(),newMemory=memory(),pending=new Map(),observations=[];
 const loader=Loader.create({prepare:module=>new Promise(resolve=>pending.set(module,resolve))});
 const oldWorker=new Worker(),newWorker=new Worker(),secondary=new Worker(),staleSecondary=new Worker();
 for(const [name,worker] of [['old',oldWorker],['new',newWorker],['secondary',secondary],['stale-secondary',staleSecondary]])loader.attach(worker,{onForward:()=>observations.push(name)});
 oldWorker.postMessage({mod:oldModule,memory:oldMemory,slot:0});
 staleSecondary.postMessage({mod:oldModule,memory:oldMemory,slot:1});
 newWorker.postMessage({mod:newModule,memory:newMemory,slot:0});
 secondary.postMessage({mod:newModule,memory:newMemory,slot:1});await flush();
 pending.get(newModule)({module:newPrepared,profile:{revision:'new'}});await flush();
 assert.deepEqual(observations,['new','secondary']);
 pending.get(oldModule)({module:oldPrepared,profile:{revision:'old'}});await flush();
 assert.deepEqual(observations,['new','secondary']);
 assert.equal(oldWorker.sent[0].argumentModule,oldPrepared);assert.equal(staleSecondary.sent[0].argumentModule,oldPrepared);
 assert.equal(newWorker.sent[0].argumentModule,newPrepared);assert.equal(secondary.sent[0].argumentModule,newPrepared);
 const reused=new Worker();loader.attach(reused,{onForward:()=>observations.push('reused')});
 reused.postMessage({mod:newModule,memory:newMemory,slot:0});await flush();
 assert.deepEqual(observations,['new','secondary','reused']);
});

test('a newer memory-port primary invalidates pending direct-memory session observation',async t=>{
 const original=moduleWithTag('original'),direct=new Worker(),portWorker=new Worker(),{port1,port2}=new MessageChannel(),observations=[];let resolve;
 const loader=Loader.create({prepare:()=>new Promise(done=>resolve=done)});
 loader.attach(direct,{onForward:()=>observations.push('direct')});loader.attach(portWorker,{onForward:(_m,meta)=>observations.push(meta.verified)});
 t.after(()=>{port1.close();port2.close();portWorker.sent[0]?.message.memPort.close();});
 direct.postMessage({mod:original,memory:memory(),slot:0});
 portWorker.postMessage({mod:original,memPort:port1,slot:0},[port1]);await flush();resolve(null);await flush();
 assert.deepEqual(observations,[false]);assert.equal(direct.sent.length,1);assert.equal(portWorker.sent.length,1);
});

test('array and options transfer overloads detach at call time and deliver real MessagePorts in order',async t=>{
 const original=moduleWithTag('original'),mem=memory();let resolve;
 const loader=Loader.create({prepare:()=>new Promise(done=>resolve=done)}),worker=new Worker();loader.attach(worker);
 worker.postMessage({mod:original,memory:mem,slot:0});
 const bytes=new Uint8Array([3,5,8]).buffer;worker.postMessage({t:'bytes',bytes},[bytes]);assert.equal(bytes.byteLength,0);
 const {port1,port2}=new MessageChannel();let received;
 t.after(()=>{port1.close();port2.close();received?.close();});
 worker.postMessage({t:'port',port:port1},{transfer:[port1]});
 assert.throws(()=>structuredClone(port1,{transfer:[port1]}),{name:'DataCloneError'});
 await flush();resolve(null);await flush();
 assert.deepEqual(worker.sent.map(x=>x.message.t||'init'),['init','bytes','port']);
 assert.deepEqual([...new Uint8Array(worker.sent[1].message.bytes)],[3,5,8]);
 assert.equal(worker.sent[1].form,'array');assert.equal(worker.sent[2].form,'options');
 received=worker.sent[2].message.port;
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),1000);
 t.after(()=>clearTimeout(timer));
 const delivery=once(received,'message',{signal:abort.signal});port2.postMessage('delivered');assert.deepEqual(await delivery,['delivered']);
});

test('DataCloneError stays synchronous and a rejected message is not queued',async()=>{
 const original=moduleWithTag('original');let resolve;const worker=new Worker();
 Loader.create({prepare:()=>new Promise(done=>resolve=done)}).attach(worker);
 worker.postMessage({mod:original,memory:memory(),slot:0});
 assert.throws(()=>worker.postMessage({notCloneable(){}}),{name:'DataCloneError'});
 const bytes=new ArrayBuffer(2);assert.throws(()=>worker.postMessage({bytes},[bytes,bytes]),{name:'DataCloneError'});
 assert.equal(bytes.byteLength,2);await flush();resolve(null);await flush();assert.equal(worker.sent.length,1);
});

test('invalid transfer option sequences reject synchronously without changing the queue',async()=>{
 const original=moduleWithTag('original'),worker=new Worker();let resolve;
 Loader.create({prepare:()=>new Promise(done=>resolve=done)}).attach(worker);
 worker.postMessage({mod:original,memory:memory(),slot:0});
 for(const options of [42,'invalid',{transfer:42},{transfer:null},{transfer:{}},{[Symbol.iterator]:42}])assert.throws(()=>worker.postMessage({t:'invalid'},options),{name:'TypeError'});
 await flush();resolve(null);await flush();assert.equal(worker.sent.length,1);
});

test('a borrowed termination call preserves the attached worker queue and native receiver',async()=>{
 const original=moduleWithTag('original'),worker=new Worker(),other=new Worker();let resolve;
 Loader.create({prepare:()=>new Promise(done=>resolve=done)}).attach(worker);
 worker.postMessage({mod:original,memory:memory(),slot:0});
 assert.equal(worker.terminate.call(other),'terminated');assert.equal(other.terminated,true);assert.equal(worker.terminated,false);
 assert.throws(()=>worker.terminate.call(null),{name:'TypeError'});
 await flush();resolve(null);await flush();assert.equal(worker.sent.length,1);
});

test('borrowed ordinary and boot posts retain the native receiver while an attached boot is pending',async()=>{
 const original=moduleWithTag('attached'),borrowedModule=moduleWithTag('borrowed'),prepared=moduleWithTag('prepared');
 const attached=new Worker(),other=new Worker(),observations=[];let resolve,calls=0;
 Loader.create({prepare:()=>{calls++;return new Promise(done=>resolve=done);}}).attach(attached,{onForward:()=>observations.push('attached')});
 attached.postMessage({mod:original,memory:memory(),slot:0});await flush();
 const bytes=Uint8Array.from([4,7]).buffer;
 attached.postMessage.call(other,{t:'ordinary',bytes},[bytes]);
 attached.postMessage.call(other,{mod:borrowedModule,memory:memory(),slot:0,cfg:{env:{marker:'preserved'}}});
 assert.throws(()=>attached.postMessage.call(null,{t:'invalid-receiver'}),{name:'TypeError'});
 assert.equal(bytes.byteLength,0);assert.equal(attached.sent.length,0);assert.equal(other.sent.length,2);
 assert.deepEqual([...new Uint8Array(other.sent[0].message.bytes)],[4,7]);
 assert.equal(other.sent[1].argumentModule,borrowedModule);assert.equal(other.sent[1].message.cfg.env.marker,'preserved');
 assert.equal(calls,1);assert.deepEqual(observations,[]);
 resolve({module:prepared,profile:{revision:'fixture'}});await flush();
 assert.equal(attached.sent.length,1);assert.equal(attached.sent[0].argumentModule,prepared);
 assert.equal(other.sent.length,2);assert.deepEqual(observations,['attached']);
});

test('verified replacement and native fallback preserve complete cfg and actual nonzero page-report marks',async()=>{
 const original=moduleWithTag('original'),prepared=moduleWithTag('prepared');
 for(const replace of [true,false]){
  const worker=new Worker(),cfg={args:['-w','1280'],env:{NFSU2_PAGE_MARKS:'2',LANG:'en_US.UTF-8',existing:'unchanged'},data:{name:'game.data',bytes:Uint8Array.from([1,4,9])},save:{slot:'fixture',enabled:true}};
  const expected=structuredClone(cfg),errors=[];
  Loader.create({prepare:async()=>replace?{module:prepared,profile:{revision:'fixture'}}:null,onError:error=>errors.push(error)}).attach(worker);
  worker.postMessage({mod:original,memory:memory(),slot:0,pool:2,cfg});
  cfg.env.NFSU2_PAGE_MARKS='later input edit';cfg.args.push('later');await flush();
  assert.deepEqual(worker.sent[0].message.cfg,expected);assert.equal(worker.sent[0].message.cfg.env.NFSU2_PAGE_MARKS,'2');
  if(replace)assert.equal(worker.sent[0].argumentModule,prepared);
  assert.equal(tag(worker.sent[0].argumentModule),replace?'prepared':'original');assert.deepEqual(errors,[]);
 }
});

test('preparation rejection and timeout forward the original module unverified and freeze the family decision',async()=>{
 const original=moduleWithTag('original'),prepared=moduleWithTag('late'),errors=[];let calls=0,resolve;
 const loader=Loader.create({timeoutMs:10,prepare:()=>{calls++;return new Promise(done=>resolve=done);},onError:e=>errors.push(e)});
 const a=new Worker(),b=new Worker();loader.attach(a);loader.attach(b);
 a.postMessage({mod:original,memory:memory(),slot:0});await new Promise(r=>setTimeout(r,25));
 assert.equal(tag(a.sent[0].argumentModule),'original');resolve({module:prepared,profile:{}});await flush();
 b.postMessage({mod:original,memory:memory(),slot:1});await flush();
 assert.equal(tag(b.sent[0].argumentModule),'original');assert.equal(calls,1);assert.equal(errors.length,1);
 const rejected=new Worker();let verified;
 Loader.create({prepare:async()=>{throw Error('failed');},onError:()=>{}}).attach(rejected,{onForward:(_m,meta)=>verified=meta.verified});
 rejected.postMessage({mod:original,memory:memory(),slot:0});await flush();
 assert.equal(tag(rejected.sent[0].argumentModule),'original');assert.equal(verified,false);
});

test('termination discards queued boots and memory-port boot stays native and unverified',async t=>{
 const original=moduleWithTag('original');let resolve,calls=0;
 const loader=Loader.create({prepare:()=>{calls++;return new Promise(done=>resolve=done);}}),worker=new Worker();loader.attach(worker);
 worker.postMessage({mod:original,memory:memory(),slot:0});worker.postMessage({t:'queued'});
 assert.equal(worker.terminate(),'terminated');await flush();resolve(null);await flush();assert.equal(worker.sent.length,0);
 const portWorker=new Worker(),{port1,port2}=new MessageChannel();let verified;
 t.after(()=>{port1.close();port2.close();portWorker.sent[0]?.message.memPort.close();});
 loader.attach(portWorker,{onForward:(_m,meta)=>verified=meta.verified});
 portWorker.postMessage({mod:original,memPort:port1,slot:0,cfg:{env:{marker:7}}},[port1]);
 assert.equal(portWorker.sent.length,1);assert.equal(verified,false);assert.equal(calls,1);
 assert.equal(portWorker.sent[0].message.cfg.env.marker,7);
});
