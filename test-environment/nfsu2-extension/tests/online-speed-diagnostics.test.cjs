'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const file=require.resolve('./diagnostics-page.test.cjs'),baseRequire=createRequire(file);
const context={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,Blob,URL,setImmediate};
vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nthis.makeSpeedFixture=fixture;',context,{filename:file});
const fixture=context.makeSpeedFixture,latest=f=>f.log().events.filter(e=>e.event==='state').at(-1).data;
test('online power distinguishes selection, permission, actual writes and opt-out restoration',async()=>{
 const f=await fixture(null,true);f.put(0x850078,8);f.change('boost',true);f.input('power',2);f.run(8);
 assert.equal(latest(f).powerStatus,'network-permission');assert.equal(latest(f).powerActive,false);assert.equal(f.read(0x2dc),.5);assert.match(f.nodes['power-state'].textContent,/Allow network tools/);
 f.change('online',true);f.run(8);assert.equal(latest(f).powerStatus,'applied');assert.equal(latest(f).effectivePower,2);assert.equal(f.read(0x2dc),1);assert.match(f.nodes['power-state'].textContent,/Power fields set to 2\.0/);
 f.change('online',false);f.run(8);assert.equal(latest(f).powerStatus,'network-permission');assert.equal(f.read(0x2dc),.5);
});
test('power diagnostics distinguish settling, invalid layout and rejection without bypassing guards',async()=>{
 const f=await fixture();f.change('boost',true);f.run();assert.match(f.nodes['power-state'].textContent,/stable performance/);
 f.set(0x140,20);f.run(8);assert.equal(latest(f).powerStatus,'layout');assert.equal(f.read(0x2dc),.5);
 f.set(0x140,1.2);f.set(0x230,8);f.input('power',3);const before=Buffer.from(new Uint8Array(f.memory.buffer));f.run(8);
 assert.equal(latest(f).powerStatus,'rejected');assert.equal(latest(f).powerActive,false);assert.match(f.nodes['power-state'].title,/range/);assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer)),before);
});
test('native tuning change is preserved and reported rather than called successful boost',async()=>{
 const f=await fixture();f.change('boost',true);f.run(8);f.set(0x230,.7);f.run();assert.match(f.nodes['power-state'].textContent,/native tuning\/state changed/);assert.equal(f.read(0x230),Math.fround(.7));assert.equal(f.read(0x2dc),.5);
});
test('neutral power, Stop and focus pause report correctly and retain restoration',async()=>{
 const f=await fixture();f.change('boost',true);f.input('power',1);f.run(8);assert.equal(latest(f).powerStatus,'neutral');assert.equal(latest(f).powerActive,false);
 f.input('power',1.5);f.run(8);f.focus(false);f.run(8);assert.equal(latest(f).powerStatus,'unfocused');assert.equal(f.read(0x2dc),.5);
 f.focus(true);f.run(8);assert.equal(latest(f).powerStatus,'applied');assert.equal(f.read(0x2dc),.75);
 f.press('F9');f.run(8);assert.equal(latest(f).powerStatus,'off');assert.equal(f.read(0x2dc),.5);
});
test('race pace acknowledgement is independent of power and clears when AI stops',async()=>{
 const f=await fixture(null,true);f.put(0x850078,8);f.put(0x89e7b0,1);f.drive(1);f.change('online',true);f.change('ai',true);f.change('race-pace',true);f.input('race-pace-factor',1.5);f.aiLog.paceApplied=1.5;f.run(8);
 assert.equal(latest(f).powerStatus,'off');assert.equal(latest(f).requestedPace,1.5);assert.equal(latest(f).paceConfirmed,true);assert.equal(latest(f).paceApplied,1.5);assert.equal(f.read(0x2dc),.5);
 f.change('ai',false);f.run(8);assert.equal(latest(f).paceConfirmed,false);assert.equal('paceApplied' in latest(f),false);
});
test('new diagnostics reject arbitrary text, pointers and out-of-range acknowledgement',()=>{
 const log=require('../extension/diagnostics.js').create();log.record('state',{powerStatus:'SECRET https://private.test',paceConfirmed:true,paceApplied:1000,car:0xe01000});
 let d=JSON.parse(log.exportText()).events.at(-1).data;assert.equal(d.paceConfirmed,true);for(const k of ['powerStatus','paceApplied','car'])assert.equal(k in d,false);assert.doesNotMatch(log.exportText(),/SECRET|private\.test/);
 for(const powerStatus of ['off','unsupported','not-ready','not-driving','network-permission','hidden','unfocused','menu','hud','drift-change','layout','settling','applied','neutral','changed','rejected']){log.record('state',{powerStatus});assert.equal(JSON.parse(log.exportText()).events.at(-1).data.powerStatus,powerStatus);}
});
test('diagnostic status and export do not add memory writes with all tools off',async()=>{
 const f=await fixture(null,true),before=Buffer.from(new Uint8Array(f.memory.buffer));f.run(220);f.click('diagnostic-export');assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer)),before);assert.equal(latest(f).powerStatus,'off');assert.equal(latest(f).paceConfirmed,false);
});
