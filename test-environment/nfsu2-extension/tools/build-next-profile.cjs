/* Recompile only authored hooks for exact reviewed 93af6ccb indices.
 * Never reads or embeds game code. Preserve previous-build profiles. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),{compose,locals:decodeLocals}=require('./compose-contact-prefixes.cjs');
const existing=require('../extension/next-profile.js');
const wabtFactory=require(process.env.WABT_MODULE||path.join(root,'research/compatibility-v011/node_modules/wabt'));
(async()=>{
 const wabt=await wabtFactory(),read=n=>fs.readFileSync(path.join(root,'tools',n),'utf8');
 const compile=s=>{const m=wabt.parseWat('authored-next.wat',s,{threads:true,simd:true});m.resolveNames();m.validate({threads:true,simd:true});return Buffer.from(m.toBinary({}).buffer)};
 const body=b=>{let p=8;const u=()=>{let n=0,s=0,x;do{x=b[p++];n|=(x&127)<<s;s+=7}while(x&128);return n>>>0};while(p<b.length){const id=b[p++],len=u(),end=p+len;if(id===10){assert.equal(u(),1);const n=u();return [...b.subarray(p,p+n)]}p=end}throw Error('Missing authored body')};
 const dummy=(a,b)=>Array.from({length:b-a},(_,i)=>`(import "unused" "${a+i}" (func))`).join('');
 const ptr=x=>`(i32.and (i32.ge_u ${x} (i32.const 65536)) (i32.and (i32.lt_u ${x} (i32.const 0x27fff000)) (i64.lt_u (i64.extend_i32_u ${x}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))`;
 const acquisition=read('drag-acquisition.wat').replace('PTR_DRIVER',ptr('(local.get $rec)')).replace('PTR_CONFIG',ptr('(i32.load offset=1760 (local.get $rec))')).replace('PTR_ACTION',ptr('(i32.load offset=1788 (local.get $rec))'));
 const anchor='(i32.store (i32.const 13685044) (i32.const 1))';
 const source=require('./add-drift-physics.cjs').transform(read('ai-current-bridge.wat'));assert.equal(source.split(anchor).length,2);
 const baseAI=require('./add-drag-input-handoff.cjs').transform(source.replace(anchor,anchor+'\n'+acquisition));
 const ai=require('./add-drag-overheat.cjs').transform(baseAI);
 fs.writeFileSync(path.join(root,'tests/ai-next-bridge.wasm'),compile(ai));
 const bridge=body(compile(ai.replace('(import "env" "dispatch"',dummy(0,21727)+'(import "env" "dispatch"').replace('(import "env" "gcall"',dummy(21728,21741)+'(import "env" "gcall"')));
 const unreservedBridge=body(compile(baseAI.replace('(import "env" "dispatch"',dummy(0,21727)+'(import "env" "dispatch"').replace('(import "env" "gcall"',dummy(21728,21741)+'(import "env" "gcall"')));
 const pace=require('./add-drift-pace.cjs').transform(read('ai-pace.wat')),pOrig='(import "env" "original" (func $original (param i32)))',pCatch='(import "env" "catchup" (func $catchup (param i32)))';
 assert(pace.includes(pOrig+pCatch));
 const pImports=Array.from({length:21263},(_,i)=>i===16154?pOrig:i===21262?pCatch:`(import "unused" "${i}" (func))`).join('');
 const paceBody=body(compile(pace.replace(pOrig+pCatch,pImports)));
 fs.writeFileSync(path.join(root,'tests/ai-next-pace.wasm'),compile(pace));
 const online='(import "env" "roam_online" (func $roam_online (result i32)))',original='(import "env" "original" (func $native (param i32)))';
 const slot='(import "env" "slot_kind" (func $slot_kind (param i32 i32) (result i32)))';
 const contact=n=>{const s=n==='cars-online.wat'?require('./add-online-race-cars.cjs').transform(read(n)):read(n),imports=n==='cars-online.wat'?online+slot+original:online+original;assert(s.includes(imports));assert(s.includes('(call $native (local.get $cpu))'));return body(compile(s.replace(imports,dummy(0,22797)+online+(n==='cars-online.wat'?slot:'')).replace('(call $native (local.get $cpu))','')))};
 const wallBody=contact('walls-current.wat'),carBody=contact('cars-online.wat'),contactBody=compose(carBody,wallBody);
 fs.writeFileSync(path.join(root,'tests/walls-next.wasm'),compile(read('walls-current.wat')));fs.writeFileSync(path.join(root,'tests/cars-next.wasm'),compile(require('./add-online-race-cars.cjs').transform(read('cars-online.wat'))));
 const config={target:22508-37,functionIndex:22508,helper:22797,onlineAddresses:[705682588,705799472,705683756],originalLocals:1,totalLocals:19};
 const cars={...config,slotKind:22798,onlineTraffic:true,onlinePlayers:true,onlineRaceCars:true,contactCounters:2,base:0xd0d1c0,bytes:40,magic:0x3143414e};
 for(const [n,b]of Object.entries({'ai-next-body.json':bridge,'pace-next-body.json':paceBody,'wall-next-body.json':wallBody,'car-next-body.json':carBody,'contact-next-body.json':contactBody,'wall-next-config.json':config,'car-next-config.json':cars}))fs.writeFileSync(path.join(root,'tools',n),JSON.stringify(b)+'\n');
 const dragSelector=JSON.parse(read('drag-selector.json'));
 const ownedNos=JSON.parse(read('owned-nos.json'));
 const driftRecovery=JSON.parse(read('drift-recovery.json'));
 const dragInputGuard=JSON.parse(read('drag-input-guard.json'));
 const dragOverheat=JSON.parse(read('drag-overheat.json'));
 const profile={dragOverheat,dragInputGuard,driftRecovery,statusCapacity:64,dragSelector,ownedNos,revision:'93af6ccb',size:38205596,hash:'128e2b5816a8eace4b768aec920318a1613da8235801a361e2009e96550be1d6',target:21213-37,bridge,locals:64,pace:{target:21263-37,bridge:paceBody},wall:{...config,bridge:contactBody},cars,capabilities:{legacy:true,ai:true,pace:true,corner:true,walls:true,cars:true,onlineTraffic:true,onlinePlayers:true,onlineRaceCars:true,dyno:true,dragAI:true,opponentDrag:true,nativeDragInputHandoff:true,ownedNativeNos:true,nativeDriftPhysics:true,nativeDriftRecovery:true,nativeDriftPace:true,driftDiagnostics:true,nativeDragOverheat:true}};
 // Preserve the full tuner and accept only the reviewed heat-mailbox reservation.
 // Compare against the exact old or reserved base; reject any unrelated change.
 if(existing.fullTuner){
  assert.equal(existing.revision,profile.revision);assert.equal(existing.hash,profile.hash);
  assert.equal(existing.capabilities.fullTuner,true);assert.equal(existing.fullTuner.abi,1);
  assert.deepEqual(existing.fullTuner.baseBridge,existing.capabilities.nativeDragOverheat?bridge:unreservedBridge,'Base AI bridge changed; review full tuner composition');
  const prefix=JSON.parse(read('full-tuner-prefix.json')),old=decodeLocals(bridge);
  assert.equal(old.types.length,64);assert.equal(prefix.oldLocals,64);assert.equal(prefix.totalLocals,170);
  profile.fullTuner={...existing.fullTuner,baseBridge:bridge};
  profile.bridge=[...prefix.newheader,...prefix.code,...bridge.slice(old.end)];profile.locals=prefix.totalLocals;profile.capabilities.fullTuner=true;
  const previous=existing.fullTuner.baseBridge,tail=previous.slice(decodeLocals(previous).end);
  // Exact upgrades from v0.22-v0.26, v0.27 and v0.29-v0.33 prefixes. Do not
  // accept an arbitrary prefix or silently replace a changed AI body.
  assert.deepEqual(existing.bridge.slice(-tail.length),tail,'Existing full tuner base tail changed');
  const priorPrefix=existing.bridge.slice(0,-tail.length),currentPrefix=[...prefix.newheader,...prefix.code];
  for(const bytes of [priorPrefix,currentPrefix])for(const x of bytes)assert(Number.isInteger(x)&&x>=0&&x<=255,'Full tuner prefix contains a non-byte value');
  const legacyPrefixHash='8e8b6cc0d322e0e5a7c753d384ac2769d2a9aba8f2912d781dd69e6a564be41b';
  const samePrefix=Buffer.from(priorPrefix).equals(Buffer.from(currentPrefix));
  const priorHash=require('node:crypto').createHash('sha256').update(Buffer.from(priorPrefix)).digest('hex');
  const reviewedLegacy=priorPrefix.length===7234&&priorHash===legacyPrefixHash;
  const reviewedDiagnostic=priorPrefix.length===8142&&priorHash==='5658208fc72fe79d7251fa7aa2034bf555e5d400aa045736df1e14a90a4369f2';
  const reviewedStaticRide=priorPrefix.length===8386&&priorHash==='f01bf8bf917fb4a52fcabebfde08f925dd9136a14c17ae911dd79526791e51a0';
  assert(samePrefix||reviewedLegacy||reviewedDiagnostic||reviewedStaticRide,'Existing full tuner prefix changed; not a reviewed capture upgrade');
 }
 const previousPace=existing.capabilities.nativeDriftPace?paceBody:body(compile(read('ai-pace.wat').replace(pOrig+pCatch,pImports)));
 assert.deepEqual(existing.pace,{target:21263-37,bridge:previousPace},'Existing pace differs from reviewed baseline/Drift guard');
 // Only the exact reviewed old retention guard may upgrade to the new one.
 const sameDragGuard=JSON.stringify(profile.dragInputGuard)===JSON.stringify(existing.dragInputGuard);
 const oldDragGuardHash=require('node:crypto').createHash('sha256').update(JSON.stringify(existing.dragInputGuard)).digest('hex');
 assert(sameDragGuard||oldDragGuardHash==='03a75e2c8be3228673c4351d8d2d87706e9f912c603ef0c0e16180b14ce200e9','Existing Drag input guard changed; not a reviewed lease-retention upgrade');
 for(const key of Object.keys(existing))if(!['cars','wall','capabilities','bridge','fullTuner','dragOverheat','pace','dragInputGuard'].includes(key))assert.deepEqual(profile[key],existing[key],'Unrelated profile property changed: '+key);
 for(const [key,value]of Object.entries(existing.capabilities))if(key!=='onlineRaceCars')assert.deepEqual(profile.capabilities[key],value,'Unrelated capability changed: '+key);
 fs.writeFileSync(path.join(root,'extension/next-profile.js'),`/* Exact reviewed 93af6ccb profile. Contains authored prefixes only. */\n(function(root){'use strict';const profile=${JSON.stringify(profile)};const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};freeze(profile);root.__NFSU2_NEXT_PROFILE__=profile;if(typeof module==='object'&&module.exports)module.exports=profile;})(globalThis);\n`);
 console.log(JSON.stringify({revision:profile.revision,bridge:profile.bridge.length,baseBridge:bridge.length,locals:profile.locals,pace:paceBody.length,contact:contactBody.length}));
})().catch(e=>{console.error(e);process.exit(1)});
