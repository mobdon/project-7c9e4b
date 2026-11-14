'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
// Production controller and generated bridge; native calls use existing test
// doubles. Exact native input lifecycle is covered by drag-input-native.test.
function factory(version){const file=path.join(__dirname,'next-profile.test.cjs');let s=fs.readFileSync(file,'utf8');s=s.slice(0,s.indexOf("test('next native prefix")).replaceAll('next-profile.js',version+'-profile.js').replaceAll('ai-next-bridge.wasm','ai-'+version+'-bridge.wasm');const c={require:createRequire(file),__dirname,Buffer,console,WebAssembly};vm.runInNewContext(s+';this.make=fixture;this.B=B;',c,{filename:file});return c;}
for(const version of ['latest','next']){
 const {make,B}=factory(version);
 function setup(){const f=make({actionId:2});f.s.drag=true;f.s.network=true;f.d.setUint8(0x89e7d8,1);f.d.setUint8(0x89cf69,1);f.put(0x89e7a0,4222);f.put(0x89e7b0,1);return f;}
 const request=f=>f.c.update({enabled:true,safe:f.s.driving,state:f.s,mode:1,allowDragAI:true,allowNetwork:true});
 const end=f=>{f.put(f.race,6);f.s.driving=false;f.put(f.p+556,9);f.put(f.p+560,3);f.step();};
 const next=f=>{f.put(f.race,4);f.s.driving=true;f.put(f.car+36,2);f.put(f.car+40,1);f.put(f.p+556,3);f.put(f.p+560,3);};
 for(const processed of [false,true])test(version+' consecutive same-event Drag rounds acknowledge boundary OFF: '+processed,()=>{
  const f=setup();request(f);f.step();assert.equal(f.c.status().active,true);
  for(let round=0;round<4;round++){
   end(f);request(f);assert.equal(f.get(B+8),0);assert.equal(f.c.handbackPending,true);if(processed)f.step();next(f);
   request(f);if(!processed)assert.equal(f.get(B+8),0,'ON cannot overtake unseen OFF');f.step();request(f);f.step();assert.equal(f.c.status().active,true);assert.equal(f.c.handbackPending,false);assert.equal(f.get(B+72),0);
  }
 });
 test(version+' quick explicit OFF/ON is held until native processing',()=>{const f=setup();request(f);f.step();f.c.stop();assert.equal(f.c.handbackPending,true);request(f);assert.equal(f.get(B+8),0);f.step();request(f);f.step();assert.equal(f.c.status().active,true);});
 test(version+' completed OFF clears pending while AI remains disabled',()=>{const f=setup();request(f);f.step();f.c.stop();f.step();for(let i=0;i<3;i++){f.c.update({enabled:false,safe:true,state:f.s,mode:1,allowDragAI:true,allowNetwork:true});f.step();assert.equal(f.c.handbackPending,false);assert.equal(f.get(B+8),0);assert.equal(f.c.status().active,false);}});
 test(version+' genuine native request3 while continuously wanted remains protected from reacquisition',()=>{const f=setup();request(f);f.step();f.put(f.p+560,3);f.step();assert.equal(f.get(B+72),f.car);next(f);for(let i=0;i<10;i++){request(f);f.step();assert.equal(f.c.status().active,false);assert.equal(f.c.status().status,'retry');assert.equal(f.c.handbackPending,false);}});
 test(version+' pending OFF never commandeers native end-state driver',()=>{const f=setup();request(f);f.step();end(f);request(f);f.step();f.s.driving=true;f.put(f.race,4);for(let i=0;i<4;i++){request(f);f.step();assert.equal(f.get(B+8),0);assert.equal(f.c.status().active,false);assert.equal(f.get(f.p+556),9);}});
 test(version+' unfinished OFF cannot bypass network permission on resume',()=>{const f=setup();request(f);f.step();f.c.stop();f.c.update({enabled:true,safe:true,state:f.s,mode:1,allowDragAI:true,allowNetwork:false});f.step();assert.equal(f.get(B+8),0);assert.equal(f.get(B+84),0);assert.equal(f.c.status().active,false);});
}
