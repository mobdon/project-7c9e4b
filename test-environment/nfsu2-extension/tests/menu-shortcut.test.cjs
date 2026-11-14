'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
const file=path.join(__dirname,'diagnostics-page.test.cjs'),baseRequire=createRequire(file),ctx={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,Blob,URL,setImmediate};
vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nthis.fixture=fixture;',ctx,{filename:file});
const fixture=ctx.fixture,copy=f=>Buffer.from(new Uint8Array(f.memory.buffer));
function key(f,extra={}){let prevented=0;f.fire({type:'keydown',code:'Insert',shiftKey:true,isTrusted:true,composedPath:()=>[],preventDefault(){prevented++;},...extra});return prevented;}
const chrome=['min','quick-stop','race-hub-open','tools-panel','info-hud'];
test('Shift+Insert hides all chrome and restores the prior menu without changing driving commands',async()=>{
 const f=await fixture(null,true);f.change('ai',true);f.change('nos',true);f.press('F8');const before=copy(f),prefs=JSON.stringify(f.prefs()),stops=f.aiLog.stops;
 assert.equal(key(f),1);for(const id of chrome)assert.equal(f.nodes[id].hidden,true,id);assert.equal(f.nodes['stream-hud'].hidden,true);
 assert.equal(key(f),1);assert.equal(f.nodes['tools-panel'].hidden,false);assert.equal(f.nodes.min.hidden,false);
 assert.equal(JSON.stringify(f.prefs()),prefs);assert.deepEqual(copy(f),before);assert.equal(f.aiLog.stops,stops);assert.deepEqual(Array.from(f.aiLog.keys),[]);
});
test('only selected streaming HUD survives clean view; F8 always reopens controls',async()=>{
 const f=await fixture(null,true);f.change('stream-hud-enable',true);f.press('F8');assert.equal(f.nodes['stream-hud'].hidden,true);
 key(f);for(const id of chrome)assert.equal(f.nodes[id].hidden,true,id);assert.equal(f.nodes['stream-hud'].hidden,false);assert.equal(f.nodes['stream-widget-radar'].hidden,true);
 f.press('F8');assert.equal(f.nodes['tools-panel'].hidden,false);assert.equal(f.nodes.min.hidden,false);assert.equal(f.nodes['stream-hud'].hidden,true);
 f.press('Escape');assert.equal(f.nodes['stream-hud'].hidden,false);
});
test('rear radar may be selected independently and remains the only HUD in clean view',async()=>{
 const f=await fixture(null,true);f.change('rear-radar-enable',true);key(f);assert.equal(f.nodes['stream-hud'].hidden,false);assert.equal(f.nodes['stream-widget-radar'].hidden,false);
 for(const id of ['brand','driver','session','stats','road','footer'])assert.equal(f.nodes['stream-widget-'+id].hidden,true,id);
 f.input('radar-range',10000);assert.equal(Number(f.nodes['radar-range'].value),500);f.input('radar-range',0);assert.equal(Number(f.nodes['radar-range'].value),50);
});
test('Shift+Insert preserves paste in text controls and editable shadow ancestors',async()=>{
 const f=await fixture(null,true);f.press('F8');
 for(const field of [{tagName:'INPUT',type:'text'},{tagName:'INPUT',type:'password'},{tagName:'INPUT',type:'number'},{tagName:'TEXTAREA'},{tagName:'SELECT'},{tagName:'DIV',isContentEditable:true},{tagName:'SPAN',parentElement:{tagName:'DIV',getAttribute:name=>name==='role'?'textbox':null}}]){
  const host=f.uiFocus(field);assert.equal(key(f,{target:host,composedPath:()=>[host]}),0);assert.equal(f.nodes['tools-panel'].hidden,false);
 }
 f.uiFocus(null);assert.equal(key(f),1);assert.equal(f.nodes.min.hidden,true);
});
test('clean-view shortcut ignores wrong modifiers, synthetic events, composition and repeat toggles',async()=>{
 const f=await fixture(null,true);
 for(const extra of [{shiftKey:false},{ctrlKey:true},{altKey:true},{metaKey:true},{isTrusted:false},{isComposing:true},{defaultPrevented:true},{code:'Numpad0'}]){assert.equal(key(f,extra),0);assert.equal(f.nodes.min.hidden,false);}
 assert.equal(key(f),1);for(let i=0;i<8;i++)assert.equal(key(f,{repeat:true}),1);assert.equal(f.nodes.min.hidden,true);key(f);assert.equal(f.nodes.min.hidden,false);
});
test('F7 and F9 remain effective with all extension chrome hidden',async()=>{
 const f=await fixture(null,true);f.change('ai',true);f.change('nos',true);key(f);f.press('F7');assert.equal(f.prefs().ai,false);assert.equal(f.nodes.min.hidden,true);
 f.change('ai',true);f.press('F9');assert.equal(f.prefs().ai,false);assert.equal(f.prefs().nos,false);assert.equal(f.nodes.min.hidden,true);
});
test('clean view cancels a busy tuner before hiding controls',async()=>{
 const f=await fixture(null,true,true);f.press('F8');f.change('dyno-enable',true);f.click('dyno-find');await new Promise(r=>setImmediate(r));assert.equal(f.dynoLog.instance.busy,true);
 const before=f.dynoLog.cancels;key(f);assert.equal(f.dynoLog.cancels,before+1);assert.equal(f.nodes.min.hidden,true);f.dynoLog.instance.finish();await new Promise(r=>setImmediate(r));
});
