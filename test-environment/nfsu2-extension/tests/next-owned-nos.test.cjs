'use strict';
// Test the injected predicate itself, not a substitute JS implementation. Native
// request/stop skill and resource instructions are covered by byte preservation;
// these fixtures do not claim to execute the full allocator or skill graph.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {bodies,readPinned,leb,section,string}=require('../tools/latest-native-utils.cjs');
const {patchOwnedNosBody}=require('../extension/ai.js');
const profile=require('../extension/next-profile.js');
const native=bodies(readPinned('next'));
const layouts={3174:{car:4,context:7,companion:5},7395:{car:7,context:5,companion:6},17404:{car:3}};
function headerEnd(bytes){let p=0;function u(){let n=0,s=0,b;do{b=bytes[p++];n|=(b&127)<<s;s+=7;}while(b&128);return n;}const groups=u();for(let i=0;i<groups;i++){u();p++;}return p;}
function expressionModule(config){
 const body=[0,0x20,63,0x41,2,0x47,...config.expression,0x0b];
 return new WebAssembly.Module(Buffer.from([0,97,115,109,1,0,0,0,
  ...section(1,[1,0x60,64,...Array(64).fill(127),1,127]),
  ...section(2,[1,...string('env'),...string('memory'),2,3,0,...leb(65536)]),
  ...section(3,[1,0]),...section(7,[1,...string('run'),0,0]),
  ...section(10,[1,...leb(body.length),...body])]));
}
function fixture(config,pages=256){
 const memory=new WebAssembly.Memory({initial:pages,maximum:65536,shared:true}),d=new DataView(memory.buffer);
 const put=(a,v)=>d.setUint32(a,v,true),get=a=>d.getUint32(a,true),byte=(a,v)=>d.setUint8(a,v);
 const cpu=0xe00000,p=0xe01000,car=0xe02000,driver=0xe04000,rec=0xe06000,race=0xe08000,companion=0xe0a000,action=0xe0c000,B=13684992,context=driver+0x54;
 const args=Array(64).fill(0),layout=layouts[config.functionIndex||config.target+37];
 args[0]=cpu;args[layout.car]=car;if(layout.context)args[layout.context]=context;if(layout.companion)args[layout.companion]=companion;
 const run=new WebAssembly.Instance(expressionModule(config),{env:{memory}}).exports.run;
 const f={memory,d,put,get,byte,cpu,p,car,driver,rec,race,companion,action,context,B,args,run(type=1){args[63]=type;return run(...args);}};
 if(!pages)return f;
 for(const [a,v] of [[cpu+24,driver],[cpu+4,driver],[driver,0x785370],[driver+4,car],[driver+0x54,car],[driver+0x6f8,companion],[driver+0x6fc,action],[action,0x7847d0],[action+0x14,2],[car+20,rec],[rec+4,1],[car+36,3],[car+40,1],[car+44,driver],[p+4,car],[0xd00000,p],[0xd00030,1],[0x8654a4,6],[0x890118,race],[race,4],[B,927547726],[B+28,927547726],[B+4,2],[B+8,2],[B+12,p],[B+16,car],[B+20,race],[B+32,p],[B+36,car],[B+40,race],[B+88,1],[B+52,1]])put(a,v);
 byte(0x89e7d8,1);byte(car+1472,1);
 return f;
}
const mutations=[
 ['owned status',f=>f.put(f.B+52,0)],['command magic',f=>f.put(f.B,0)],['ack magic',f=>f.put(f.B+28,0)],
 ['odd command epoch',f=>f.put(f.B+4,3)],['stale heartbeat',f=>f.put(f.B+48,180)],
 ['disabled request',f=>f.put(f.B+8,0)],['invalid request',f=>f.put(f.B+8,3)],['drag permission',f=>f.put(f.B+88,0)],
 ['menu',f=>f.put(0x8654a4,3)],['multiple players',f=>f.put(0xd00030,2)],['not drag',f=>f.byte(0x89e7d8,0)],
 ['owned car',f=>f.put(f.B+36,0)],['requested car',f=>f.put(f.B+16,0)],['owned player',f=>f.put(f.B+32,0)],['requested player',f=>f.put(f.B+12,0)],['owned race',f=>f.put(f.B+40,0)],['requested race',f=>f.put(f.B+20,0)],
 ['paused player',f=>f.put(f.p+16,1)],['inactive race',f=>f.put(f.race,3)],['manual driver1',f=>f.put(f.car+36,1)],['wrong physics',f=>f.put(f.car+40,3)],['autopilot off',f=>f.byte(f.car+1472,0)],
 ['missing driver',f=>f.put(f.car+44,0)],['driver vtable',f=>f.put(f.driver,0)],['driver backlink',f=>f.put(f.driver+4,0)],['context backlink',f=>f.put(f.context,0)],['missing action',f=>f.put(f.driver+0x6fc,0)],['player drag action',f=>f.put(f.action+0x14,3)],['player drag vtable',f=>f.put(f.action,0x784830)],
 ['network flags',f=>f.put(0x850078,8)],['network1',f=>f.put(0x866a14,1)],['network2',f=>f.put(0x8669f4,1)],['network3',f=>f.byte(0x89cf69,1)],
 ['invalid player pointer',f=>f.put(0xd00000,0xffffffff)],['invalid race pointer',f=>f.put(0x890118,0xffffffff)],['invalid record pointer',f=>f.put(f.car+20,0xffffffff)],['non-player record',f=>f.put(f.rec+4,3)],['player-car backlink',f=>f.put(f.p+4,0)]
];
test('three exact current native NOS gates are configured',()=>{assert.equal(typeof patchOwnedNosBody,'function');assert.deepEqual(profile.ownedNos.map(c=>c.functionIndex||c.target+37).sort((a,b)=>a-b),[3174,7395,17404]);});
for(const config of profile.ownedNos||[]){
 const index=config.functionIndex||config.target+37;
 test(`NOS ${index}: original native instructions preserved around predicate insertion`,()=>{
  const old=native.get(index),patched=Buffer.from(patchOwnedNosBody(old,config)),a=headerEnd(old),b=headerEnd(patched);
  assert.equal(old.length,config.originalLength);
  assert.deepEqual([...old.subarray(config.offset-3,config.offset)],[0x41,2,0x47]);
  assert.deepEqual(patched.subarray(b,b+config.offset-a),old.subarray(a,config.offset));
  assert.deepEqual(patched.subarray(b+config.offset-a,b+config.offset-a+config.expression.length),Buffer.from(config.expression));
  assert.deepEqual(patched.subarray(b+config.offset-a+config.expression.length),old.subarray(config.offset));
 });
 test(`NOS ${index}: patcher rejects changed lengths, local types and original predicate`,()=>{
  const old=native.get(index);
  assert.throws(()=>patchOwnedNosBody(old.subarray(0,old.length-1),config),/layout changed/);
  for(const offset of [2,config.offset-3,config.offset-2,config.offset-1]){
   const bad=Buffer.from(old);bad[offset]^=1;assert.throws(()=>patchOwnedNosBody(bad,config),/layout changed/);
  }
 });
 test(`NOS ${index}: pointer bounds reject without traps or writes`,()=>{
  const setters=[(f,v)=>{f.args[layouts[index].car]=v;f.put(f.B+16,v);f.put(f.B+36,v);},(f,v)=>f.put(0xd00000,v),(f,v)=>f.put(0x890118,v),(f,v)=>f.put(f.car+44,v),(f,v)=>f.put(f.car+20,v),...(index===17404?[]:[(f,v)=>f.put(f.driver+0x6fc,v)])];
  for(const set of setters)for(const value of [0,65535,16777216-4096,16777216,0xffffffff]){
   const f=fixture(config);set(f,value);const before=Buffer.from(f.memory.buffer);
   assert.equal(f.run(),1,`reject pointer ${value}`);assert.deepEqual(Buffer.from(f.memory.buffer),before);
  }
 });
 test(`NOS ${index}: owned drag allows native continuation, with zero memory writes`,()=>{
  const f=fixture(config),before=Buffer.from(f.memory.buffer);assert.equal(f.run(),0);assert.deepEqual(Buffer.from(f.memory.buffer),before);
  f.put(f.B+8,1);assert.equal(f.run(),0,'acquisition request');
 });
 test(`NOS ${index}: native type2 short-circuits before all extension memory reads`,()=>{const f=fixture(config,0);assert.equal(f.run(2),0);});
 for(const [name,mutate] of mutations.filter(([name])=>index!==17404||!['context backlink','missing action','player drag action','player drag vtable'].includes(name)))test(`NOS ${index}: reject ${name}`,()=>{
  const f=fixture(config);mutate(f);const before=Buffer.from(f.memory.buffer);assert.equal(f.run(),1);assert.deepEqual(Buffer.from(f.memory.buffer),before);assert.equal(f.run(2),0,'original opponents unaffected');
 });
 test(`NOS ${index}: exact companion/context identity is required`,()=>{
  const layout=layouts[index];if(!layout.context){const f=fixture(config);f.put(f.cpu+24,0);assert.equal(f.run(),1);return;}
  for(const slot of [layout.context,layout.companion]){const f=fixture(config);f.args[slot]+=4;assert.equal(f.run(),1);}
  const f=fixture(config);f.put(f.driver+0x6f8,0);assert.equal(f.run(),1);
 });
 test(`NOS ${index}: explicit online opt-in preserves native network state`,()=>{const f=fixture(config);f.put(0x850078,8);f.put(f.B+84,1);assert.equal(f.run(),0);assert.equal(f.get(0x850078),8);});
}

// Road NOS follows an observed native action; it neither selects a goal nor
// substitutes for the original native skill/resource checks after this gate.
function roadFixture(config,mode=1,goal=1,physics=1){
 const f=fixture(config);f.byte(0x89e7d8,0);f.put(0x890108,0);f.put(0x89e7b0,mode);
 f.put(f.B+88,0);f.put(f.car+40,physics);f.put(f.action+20,goal);
 f.put(f.action,({1:0x784768,2:0x7847d0,3:0x784830,5:0x784b58})[goal]||0);
 return f;
}
for(const config of profile.ownedNos||[]){
 const index=config.functionIndex||config.target+37;
 test(`NOS ${index}: road mode/action/physics acceptance matrix`,()=>{
  for(const mode of [0,1,2,3,4,5,6,7,8,9])for(const goal of [1,2,3,5,11])for(const physics of [0,1,2,3,4]){
   const f=roadFixture(config,mode,goal,physics);
   const allowed=index!==3174&&(physics===1||physics===3)&&(index===17404?(mode===1||mode===7):((goal===1&&(mode===1||mode===7))||(goal===5&&mode===7)));
   assert.equal(f.run(),allowed?0:1,`mode=${mode} action=${goal} physics=${physics}`);
   assert.equal(f.run(2),0,'native opponent remains accepted');
  }
 });
 if(index===3174)continue;
 for(const [mode,goal] of [[1,1],[7,1],[7,5]]){
  const label=`NOS ${index}: road mode${mode} action${goal}`;
  test(`${label} has zero writes and does not need drag permission`,()=>{
   const f=roadFixture(config,mode,goal,3),before=Buffer.from(f.memory.buffer);
   assert.equal(f.run(),0);assert.deepEqual(Buffer.from(f.memory.buffer),before);
   f.put(f.B+88,1);assert.equal(f.run(),0);
  });
  test(`${label} ${index===17404?'stop ignores':'start requires matching'} action vtable`,()=>{
   const f=roadFixture(config,mode,goal);f.put(f.action,goal===1?0x784b58:0x784768);assert.equal(f.run(),index===17404?0:1);
  });
  test(`${label} rejects native drag and forced-drag flags`,()=>{
   for(const mutate of [f=>f.byte(0x89e7d8,1),f=>f.put(0x890108,1)]){
    const f=roadFixture(config,mode,goal);mutate(f);assert.equal(f.run(),1);assert.equal(f.run(2),0);
   }
  });
  test(`${label} drift flags require physics1`,()=>{
   for(const mutate of [f=>f.byte(0x89e7d9,1),f=>f.put(0x890104,1),f=>f.put(0x890114,1)])for(const physics of [1,3]){
    const f=roadFixture(config,mode,goal,physics);mutate(f);assert.equal(f.run(),physics===1?0:1);assert.equal(f.run(2),0);
   }
  });
  for(const [name,mutate] of mutations.filter(([name])=>!['drag permission','not drag','wrong physics'].includes(name)&&(index!==17404||!['context backlink','missing action','player drag action','player drag vtable'].includes(name)))){
   test(`${label} retains ${name} guard`,()=>{
    const f=roadFixture(config,mode,goal,3);mutate(f);const before=Buffer.from(f.memory.buffer);
    assert.equal(f.run(),1);assert.deepEqual(Buffer.from(f.memory.buffer),before);assert.equal(f.run(2),0);
   });
  }
  test(`${label} retains call-site identity guards and explicit online opt-in`,()=>{
   const layout=layouts[index];
   for(const slot of [layout.context,layout.companion].filter(Boolean)){
    const f=roadFixture(config,mode,goal);f.args[slot]+=4;assert.equal(f.run(),1);
   }
   if(!layout.context){const f=roadFixture(config,mode,goal);f.put(f.cpu+24,0);assert.equal(f.run(),1);}
   else {const f=roadFixture(config,mode,goal);f.put(f.driver+0x6f8,0);assert.equal(f.run(),1);}
   const f=roadFixture(config,mode,goal);f.put(0x850078,8);f.put(f.B+84,1);assert.equal(f.run(),0);assert.equal(f.get(0x850078),8);
  });
 }
}


test('NOS cleanup survives action transitions without authorizing a new start or writing memory',()=>{
 const start=profile.ownedNos.find(c=>(c.functionIndex||c.target+37)===7395);
 const stop=profile.ownedNos.find(c=>(c.functionIndex||c.target+37)===17404);
 for(const mode of ['drag',1,7])for(const transition of ['recovery11','NULL','unknown','invalid pointer']){
  const create=config=>mode==='drag'?fixture(config):roadFixture(config,mode,mode===7?5:1,3);
  const a=create(start),b=create(stop);assert.equal(a.run(),0);assert.equal(b.run(),0);
  for(const f of [a,b]){
   if(transition==='NULL')f.put(f.driver+0x6fc,0);
   else if(transition==='invalid pointer')f.put(f.driver+0x6fc,0xffffffff);
   else {f.put(f.action+20,transition==='recovery11'?11:0xdead);f.put(f.action,0xdeadbeef);}
  }
  for(const [f,expected] of [[a,1],[b,0]]){
   const before=Buffer.from(f.memory.buffer);assert.equal(f.run(),expected,`${mode}: ${transition}`);
   assert.deepEqual(Buffer.from(f.memory.buffer),before);assert.equal(f.run(2),0);
  }
 }
});
