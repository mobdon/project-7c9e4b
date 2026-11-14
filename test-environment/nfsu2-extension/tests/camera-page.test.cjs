'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const Core=require('../extension/core.js'),profile=require('../extension/abf-profile.js');
const file=require.resolve('./core.test.cjs'),baseRequire=createRequire(file);
const deterministicCore={...Core,createCameraDirector:()=>Core.createCameraDirector({random:()=>0})};
const context={require:Object.assign(name=>name==='node:test'?{test(){}}:name==='../extension/core.js'?deterministicCore:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,URL,Blob,setImmediate};
vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nthis.cameraFixture=pageFixture;',context,{filename:file});
const fixture=async options=>context.cameraFixture(null,true,false,{profile,revision:profile.revision,...options});
const cameraEvents=f=>f.aiLog.keyEvents.filter(e=>e.code==='KeyC');
const downCount=f=>cameraEvents(f).filter(e=>e.type==='keydown').length;

test('camera rotation is off by default and the actual page sends one native Camera pulse after 45 seconds',async()=>{
 const f=await fixture();f.change('stream-hud-enable',false);f.run(20);assert.equal(downCount(f),0);
 const before=Buffer.from(f.memory.buffer),prefs=JSON.stringify(f.prefs());
 f.change('camera-rotate-enable',true);f.run();f.run(899);assert.equal(downCount(f),0);
 f.run();assert.equal(downCount(f),1);f.run();assert.deepEqual(Array.from(cameraEvents(f),e=>e.type),['keydown','keyup']);
 assert.deepEqual(Buffer.from(f.memory.buffer),before);assert.equal(JSON.stringify(f.prefs()),prefs);
 f.change('camera-rotate-enable',false);f.run(1000);assert.equal(downCount(f),1);
});

test('game menus, tool panels, hidden/unfocused pages and native dialogs postpone camera changes',async()=>{
 for(const [block,unblock]of [[f=>f.gameDialog(true),f=>f.gameDialog(false)],[f=>f.press('F8'),f=>f.press('F8')],[f=>f.hidden(true),f=>f.hidden(false)],[f=>f.focus(false),f=>f.focus(true)],[f=>f.put(0x838974,1),f=>f.put(0x838974,0)],[f=>f.uiFocus({tagName:'INPUT',type:'text'}),f=>f.uiFocus(null)],[f=>{f.put(f.status+8,3);Buffer.from(f.memory.buffer,f.status+64,16).write('photo');f.d.setFloat64(f.status+80,1,true);},f=>f.d.setFloat64(f.status+80,0,true)]]){
  const f=await fixture();f.change('camera-rotate-enable',true);f.run();f.run(899);block(f);f.run(5);assert.equal(downCount(f),0);unblock(f);f.run();f.run(899);assert.equal(downCount(f),0);f.run();assert.equal(downCount(f),1);
 }
});

test('manual Camera postpones rotation; F7 and F9 disable it and release a current pulse',async()=>{
 const f=await fixture();f.change('camera-rotate-enable',true);f.run();f.run(899);f.press('KeyC');f.fire({type:'keyup',code:'KeyC',isTrusted:true});f.run();f.run(899);assert.equal(downCount(f),0);f.run();assert.equal(downCount(f),1);
 f.press('F9');assert.equal(f.nodes['camera-rotate-enable'].checked,false);assert.equal(cameraEvents(f).at(-1).type,'keyup');f.run(1000);assert.equal(downCount(f),1);
 f.change('camera-rotate-enable',true);f.run();f.press('F7');assert.equal(f.nodes['camera-rotate-enable'].checked,false);f.run(1000);assert.equal(downCount(f),1);
});

test('camera is a view-only option online and reload always leaves it off',async()=>{
 const f=await fixture();f.put(Core.A.MODE,8);f.change('camera-rotate-enable',true);f.run();f.run(900);assert.equal(downCount(f),1);assert.equal(!!f.prefs().online,false);assert.equal(!!f.prefs().ai,false);
 const again=await fixture({saved:f.stored()});assert.equal(again.nodes['camera-rotate-enable'].checked,false);again.run(1000);assert.equal(downCount(again),0);
});

test('taking over Camera during an automatic pulse never releases the real held key',async()=>{
 const f=await fixture();f.change('camera-rotate-enable',true);f.run();f.run(900);assert.equal(downCount(f),1);
 f.press('KeyC');assert.deepEqual(Array.from(cameraEvents(f),e=>e.type),['keydown']);
 f.press('F9');assert.deepEqual(Array.from(cameraEvents(f),e=>e.type),['keydown']);
 f.fire({type:'keyup',code:'KeyC',isTrusted:true});f.run();assert.equal(f.nodes['camera-rotate-enable'].checked,false);assert.equal(downCount(f),1);
});

test('replacing the game module cancels a live camera pulse before the next tick',async()=>{
 const f=await fixture();f.change('camera-rotate-enable',true);f.run();f.run(900);assert.equal(downCount(f),1);
 const mod=new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0]));f.worker.postMessage({mod,memory:f.memory,slot:0});
 assert.deepEqual(Array.from(cameraEvents(f),e=>e.type),['keydown','keyup']);assert.equal(f.nodes['camera-rotate-enable'].checked,true);
 f.worker.emit({t:'register',kind:5,ptr:f.status});f.run();f.run(899);assert.equal(downCount(f),1);f.run();assert.equal(downCount(f),2);
});

test('a current worker error disables camera rotation while an unrelated worker error cannot',async()=>{
 const f=await fixture();f.change('camera-rotate-enable',true);f.run();f.run(900);assert.equal(downCount(f),1);
 const other=f.createWorker();for(const fn of other.handlers.error||[])fn({message:'unrelated'});assert.equal(f.nodes['camera-rotate-enable'].checked,true);
 for(const fn of f.worker.handlers.error||[])fn({message:'current worker failed'});assert.equal(f.nodes['camera-rotate-enable'].checked,false);assert.equal(cameraEvents(f).at(-1).type,'keyup');f.run(1000);assert.equal(downCount(f),1);
});
