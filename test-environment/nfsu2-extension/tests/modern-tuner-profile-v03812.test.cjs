'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const P=require('../../work-aa-profile/tools/native-proof.cjs'),Native=require('../extension/dyno-native.js'),Meta=require('../extension/dyno-native-profile-943.js'),Transformer=require('../extension/tuner-profile-943.js'),Family=require('../extension/family-profiles.js'),{locals}=require('../../nfsu2-extension/tools/compose-contact-prefixes.cjs');
const PIN=require('../../work-paced-v03811/native/profile-config.cjs').PROFILES.find(x=>x.revision==='943ee537').native;
test('only exact943 normal tuner is enabled and its metadata preserves the current native correction',async()=>{
 const current=Family.profiles.find(p=>p.revision==='943ee537'),other=Family.profiles.find(p=>p.revision==='15e5958f');
 assert.equal(current.capabilities.fullTuner,true);assert.equal(current.capabilities.dyno,true);assert.equal(current.capabilities.tunerCurrentNativeClamp,true);assert.equal(current.capabilities.tunerSecondGuestWindow,true);assert.equal(current.capabilities.tunerOrderedRecipe,false);
 assert.equal(other.capabilities.fullTuner,false);assert.equal(require('../extension/aa-profile.js').capabilities.fullTuner,false);assert.equal(current.locals,170);assert(Object.isFrozen(current.bridge));
 assert.equal(Meta.researchOnly,false);assert.equal(Meta.privateEvaluator,true);assert.equal(Meta.researchLegacyFallback,false);assert.deepEqual(Meta.nativeAliases,{});assert(Meta.functions[23301]);assert(Object.isFrozen(Meta.functions[23301].patches));
 const raw=P.pinned(PIN),prepared=await Native.build(raw);assert.equal(prepared.meta,Meta);await assert.rejects(Native.build(raw,{...Meta,nativeAliases:{23301:8710}}),/Unsupported private legacy alias/);
 const manifest=require('../extension/manifest.json'),js=manifest.content_scripts[0].js;assert(js.indexOf('tuner-profile-943.js')<js.indexOf('family-profiles.js'));assert(js.indexOf('dyno-native-profile-943.js')<js.indexOf('dyno-native.js'));assert(!js.some(n=>n.includes('research')||n.includes('legacy-research')));for(const n of js)assert(fs.existsSync(path.resolve(__dirname,'../extension',n)));
});
test('profile transformer preserves supplied driving capabilities and rejects wrong or already composed profiles',()=>{
 const current=Family.profiles.find(p=>p.revision==='943ee537'),base={...current,bridge:current.fullTuner.baseBridge,locals:64,capabilities:{...current.capabilities,exampleFutureDrivingCapability:true}};delete base.fullTuner;
 const transformed=Transformer.compose(base);assert.equal(transformed.capabilities.exampleFutureDrivingCapability,true);assert.equal(transformed.wall,base.wall);assert.equal(transformed.cars,base.cars);assert.equal(transformed.pace,base.pace);
 assert.throws(()=>Transformer.compose({...base,hash:'0'.repeat(64)}),/exact943/);assert.throws(()=>Transformer.compose({...base,revision:'aa2429fb'}),/exact943/);assert.throws(()=>Transformer.compose(transformed),/already composed/);
});
test('exact native module composition changes only main21212 after the authored normal tuner prefix',async()=>{
 const current=Family.profiles.find(p=>p.revision==='943ee537'),base={...current,bridge:current.fullTuner.baseBridge,locals:64,capabilities:{...current.capabilities,dyno:false,fullTuner:false}};delete base.fullTuner;for(const key of['tunerCurrentNativeClamp','tunerSecondGuestWindow','tunerOrderedRecipe'])delete base.capabilities[key];
 const source=fs.readFileSync(path.resolve(__dirname,'../extension/ai.js'),'utf8');
 function loader(profile){const context=vm.createContext({crypto:globalThis.crypto,module:{exports:{}},require:n=>n==='./family-profiles.js'?{profiles:Family.profiles.map(p=>p.revision==='943ee537'?profile:p)}:require(path.resolve(__dirname,'../extension',n))});vm.runInContext(source,context,{filename:'isolated-ai-profile-loader.js'});return context.module.exports;}
 const raw=P.pinned(PIN),before=Buffer.from(await loader(base).patchBytes(raw)),after=Buffer.from(await loader(current).patchBytes(raw)),a=P.parse(before),b=P.parse(after),changed=[...a.bodies].filter(([id,body])=>!body.equals(b.bodies.get(id))).map(([id])=>id);
 assert.deepEqual(changed,[21212]);assert.equal(a.bodies.size,b.bodies.size);assert.equal(a.sections.length,b.sections.length);
 for(let i=0;i<a.sections.length;i++)if(a.sections[i].id!==10)assert.deepEqual(a.sections[i].bytes,b.sections[i].bytes);
 const prefix=require('../native/full-tuner-prefix.json'),old=a.bodies.get(21212),expected=Buffer.concat([Buffer.from(prefix.newheader),Buffer.from(prefix.code),old.subarray(locals(old).end)]);assert.deepEqual(b.bodies.get(21212),expected);assert.equal(locals(old).types.length,64);assert.equal(locals(expected).types.length,170);
 assert(WebAssembly.validate(before)&&WebAssembly.validate(after));await WebAssembly.compile(after);
 const result={version:'0.38.12',kind:'exact943 normal-tuner base native composition proof before optional root driving chain',passed:true,inputSha256:PIN.hash,beforeBaseModuleSha256:P.hash(before),afterBaseModuleSha256:P.hash(after),changedFunctions:changed,mainBeforeSha256:P.hash(old),mainAfterSha256:P.hash(expected),baseLocals:64,totalLocals:170,authoredPrefixReconstructedExactly:true,allOtherNativeBodiesPreserved:true,allNonCodeSectionsPreserved:true,additionalNativeHelpers:0,additionalNativeGlobals:0,compiled:true,fullGameInstantiated:false,rootPhaseChainRepinned:false,liveGameTested:false};
 fs.writeFileSync(path.resolve(__dirname,'../verification/tuner-composed-native-v03812.json'),JSON.stringify(result,null,2)+'\n');
});
test('page diagnostics retain fixed current tuner capability flags and exact S42 guard',()=>{
 const D=require('../extension/diagnostics.js'),logger=D.create(),sanitize=data=>{logger.record('dyno-error',data);return JSON.parse(logger.exportText()).events.at(-1).data;},x=sanitize({dynoFullTuner:true,dynoSecondWindowCapture:true,dynoCurrentClamp:true,dynoStatus:8,dynoGuard:42,dynoObserved:0x50000000});
 assert.equal(x.dynoFullTuner,true);assert.equal(x.dynoSecondWindowCapture,true);assert.equal(x.dynoCurrentClamp,true);assert.equal(x.dynoStatus,8);assert.equal(x.dynoGuard,42);assert(!Object.hasOwn(x,'dynoObserved'));assert(!Object.hasOwn(sanitize({dynoFullTuner:1}),'dynoFullTuner'));
 const page=fs.readFileSync(path.resolve(__dirname,'../extension/page.js'),'utf8');for(const key of['dynoFullTuner','dynoSecondWindowCapture','dynoCurrentClamp'])assert(page.includes(key));
});
