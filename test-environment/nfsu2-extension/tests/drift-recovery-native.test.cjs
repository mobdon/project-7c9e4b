'use strict';
// Private research proof only. Does not write production/release files.
// The authored selector returns an existing native curve pointer; it never writes guest data.
const fs=require('fs'),assert=require('node:assert/strict'),crypto=require('crypto');
const dir=require('node:path').resolve(__dirname,'../research/drift-control-current'),read=n=>fs.readFileSync(dir+'/'+n,'utf8');
const meta=JSON.parse(read('comparison.json')),headers=JSON.parse(read('headers.json'));
const moduleSha=crypto.createHash('sha256').update(fs.readFileSync(dir+'/../compatibility-78e2bb69/game.wasm')).digest('hex');
assert.equal(moduleSha,'df7b930bb293ffdf975f0735d93e0797d51bd137d0cbeabcaff87fc5a693c759');
const B=0xd0d100,M=0x3749414e,PLAYER_CURVE=0x86b3c8,OPPONENT_CURVE=0x86b570;
const C=n=>`(i32.const ${n})`,L=n=>`(local.get $${n})`,U=(a,o=0)=>`(i32.load offset=${o} ${a})`,U8=(a,o=0)=>`(i32.load8_u offset=${o} ${a})`;
const EQ=(a,b)=>`(i32.eq ${a} ${b})`,Z=a=>`(i32.eqz ${a})`;
const valid=a=>`(i32.and (i32.ge_u ${a} ${C(65536)}) (i32.and (i32.lt_u ${a} ${C(0x27fff000)}) (i64.lt_u (i64.extend_i32_u ${a}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))`;
const guard=x=>`(br_if $reject (i32.eqz ${x}))`,set=(n,x)=>`(local.set $${n} ${x})`,mail=n=>U(C(B+n));
// Ownership/permission/freshness semantics mirror the existing authored pace/drag guards.
// Extra checks bind this single physics call to the owned native Drift main behavior.
const checks=[
 guard(EQ(mail(0),C(M))),guard(EQ(mail(28),C(M))),set('seq',mail(4)),guard(Z(`(i32.and ${L('seq')} ${C(1)})`)),
 guard(`(i32.lt_u ${mail(48)} ${C(180)})`),guard(`(i32.and (i32.ge_u ${mail(8)} ${C(1)}) (i32.le_u ${mail(8)} ${C(2)}))`),guard(EQ(mail(52),C(1))),
 guard(EQ(U(C(0x8654a4)),C(6))),guard(EQ(U(C(0xd00030)),C(1))),
 `(if (i32.ne ${mail(84)} ${C(1)}) (then ${[
 guard(Z(`(i32.and ${U(C(0x850078))} ${C(520)})`)),guard(Z(U(C(0x866a14)))),guard(Z(U(C(0x8669f4)))),guard(Z(U8(C(0x89cf69))))].join('\n')}))`,
 guard(Z(U8(C(0x89e7d8)))),guard(Z(U(C(0x890108)))),guard(`(i32.ne (i32.or ${U(C(0x890114))} (i32.or ${U8(C(0x89e7d9))} ${U(C(0x890104))})) ${C(0)})`),
 set('phys',U(L('cpu'),28)),guard(valid(L('phys'))),set('car',U(L('phys'),0x5c)),guard(valid(L('car'))),
 guard(EQ(L('car'),mail(36))),guard(EQ(L('car'),mail(16))),guard(EQ(U(L('car'),0x24),C(3))),guard(EQ(U(L('car'),0x28),C(1))),guard(`(i32.ne ${U8(L('car'),0x5c0)} ${C(0)})`),guard(EQ(U(L('car'),0x34),L('phys'))),
 set('player',U(C(0xd00000))),guard(valid(L('player'))),guard(EQ(L('player'),mail(32))),guard(EQ(L('player'),mail(12))),guard(EQ(U(L('player'),4),L('car'))),guard(Z(U(L('player'),16))),
 set('rec',U(L('car'),0x14)),guard(valid(L('rec'))),guard(EQ(U(L('rec'),4),C(1))),guard(Z(U8(L('rec'),0x900))),
 set('driver',U(L('car'),0x2c)),guard(valid(L('driver'))),guard(EQ(U(L('driver')),C(0x785370))),guard(EQ(U(L('driver'),4),L('car'))),
 set('behavior',U(L('driver'),8)),guard(valid(L('behavior'))),guard(EQ(U(L('behavior')),C(0x784f40))),guard(EQ(U(L('behavior'),0x220),L('car'))),guard(EQ(U(L('car'),0x30),L('behavior'))),guard(EQ(U(L('phys'),4),L('behavior'))),
 set('race',U(C(0x890118))),guard(valid(L('race'))),guard(EQ(L('race'),mail(40))),guard(EQ(L('race'),mail(20))),guard(EQ(U(L('race')),C(4))),
 guard(EQ(L('seq'),mail(4)))
];
const selector=`(func $select (param $cpu i32) (result i32) (local $seq i32) (local $phys i32) (local $car i32) (local $player i32) (local $rec i32) (local $driver i32) (local $behavior i32) (local $race i32)
(block $selected (result i32) (block $reject ${checks.join('\n')} (br $selected ${C(OPPONENT_CURVE)})) ${C(PLAYER_CURVE)}))`;
assert(!selector.includes('.store'),'Selector must not write memory');

const {test}=require('node:test');
test('production inlined recovery matches actual native opponent output and preserves guarded fallback',async()=>{
const wabt=await require('../research/compatibility-v011/node_modules/wabt')();
const names=['sub_005ac260_orig','sub_0040c840','sub_00576740','sub_0077dfb0','sub_0077e040','sub_0077e0d0','sub_0077e0f0'];
const src=names.map(n=>read('current-'+n+'.wat').replace(/\(func \(;(\d+);\)/,(_,id)=>`(func $f${id}`).replace(/\bcall (\d+)\b/g,'call $f$1'));
const native=src[0],needle='i32.const 8827848';assert.equal(native.split(needle).length,2);
const {readPinned,bodies}=require('../tools/latest-native-utils.cjs');
const AI=require('../extension/ai.js'),profile=require('../extension/next-profile.js');
const exact=readPinned('next'),before=bodies(exact).get(8871),patched=bodies(await AI.patchBytes(exact)).get(8871);
assert.equal(crypto.createHash('sha256').update(before).digest('hex'),profile.driftRecovery.bodySha256);
assert.deepEqual(Buffer.from(patched),Buffer.from(AI.patchDriftRecoveryBody(before,profile.driftRecovery)));
const extraction=await require('../tools/extract-production-drift.cjs')([8871],true);
const candidate=extraction.functions.get(8871).replace('(func $f8871','(func $candidate');
const defined=new Set(names.map(n=>String(meta[n].index))),deps=[...new Set(src.flatMap(s=>[...s.matchAll(/call \$f(\d+)/g)].map(m=>m[1])))].filter(id=>!defined.has(id));
const imports=deps.map(id=>`(import "env" "f${id}" (func $f${id} ${headers[id].match(/\(type \d+\)/)[0]}))`).join('\n');
const source=`(module ${read('types.wat')} ${imports} (memory (export "memory") 10400) (table 1 funcref) ${src.join('\n')} ${candidate}
(export "native" (func $f8871)) (export "candidate" (func $candidate)) ${names.filter(n=>n.includes('0077')).map(n=>`(export "${n}" (func $f${meta[n].index}))`).join('\n')})`;
const parsed=wabt.parseWat('guarded-yaw-private-probe.wat',source,{tail_call:true});parsed.resolveNames();parsed.validate({tail_call:true});
const cpu=0x10000,stack=0x20000,car=0x30000,record=0x40000,behavior=0x50000,physics=0x60000,params=0x70000,state=0x80000,body=0x90000,wheelL=0xa0000,wheelR=0xb0000,driver=0xc0000,player=0xd0000,race=0xe0000,action=0xf0000,otherCar=0x110000;
let d,u;const get=a=>d.getUint32(a,true),put=(a,v)=>d.setUint32(a,v,true),fp=(a,v)=>d.setFloat32(a,v,true),fg=a=>d.getFloat32(a,true);
function ret(args=0,v=0){const sp=get(cpu+16);put(cpu,v);put(cpu+32,get(sp));put(cpu+16,sp+4+args*4);}
function pushFloat(v){const top=(get(cpu+136)-1)&7;put(cpu+136,top);d.setFloat64(cpu+72+8*top,v,true);}
const importsObject={f56:()=>ret(),f8856:()=>{pushFloat(1);ret(1);}};
for(const id of deps)if(!importsObject['f'+id])importsObject['f'+id]=()=>{throw Error('Unexpected native dependency '+id);};
const instance=new WebAssembly.Instance(new WebAssembly.Module(parsed.toBinary({}).buffer),{env:importsObject});d=new DataView(instance.exports.memory.buffer);u=new Uint8Array(instance.exports.memory.buffer);
const pe=fs.readFileSync(dir+'/../opponent-handoff-current/SPEED2.EXE'),sections=JSON.parse(fs.readFileSync(dir+'/../opponent-handoff-current/pe-sections.json')).sections;
for(const [n,va,vs,raw,len]of sections)u.set(pe.subarray(raw,raw+len),0x400000+va);
function enter(name,ecx){put(cpu+4,ecx);put(cpu+16,stack);put(cpu+136,0);put(cpu+140,0);put(stack,0x12345678);instance.exports[name](cpu);assert.equal(get(cpu+16),stack+4);}
for(const n of names.filter(n=>n.includes('0077')))enter(n,0);
const globals=[0x8654a4,0xd00030,0x850078,0x866a14,0x8669f4,0x89cf69,0x89e7d8,0x890108,0x89e7d9,0x890114,0x890104,0xd00000,0x890118,0x89e7f4];
function setup(type,degrees,yaw,gear,mutate=()=>{}){
 u.fill(0,0x10000,0x120000);u.fill(0,B,B+128);for(const g of globals)put(g,0);
 put(B,M);put(B+28,M);put(B+4,2);put(B+8,1);put(B+48,0);put(B+52,1);put(B+84,0);put(0x8654a4,6);put(0xd00030,1);d.setUint8(0x89e7d9,1);
 put(B+12,player);put(B+32,player);put(B+16,car);put(B+36,car);put(B+20,race);put(B+40,race);put(0xd00000,player);put(player+4,car);put(0x890118,race);put(race,4);
 put(physics+0x58,state);put(physics+0x54,params);put(physics+0x5c,car);put(physics+0x20,body);put(physics+0x40,wheelL);put(physics+0x44,wheelR);put(physics+4,behavior);
 put(car+0x14,record);put(record+4,type);put(car+0x24,3);put(car+0x28,1);put(car+0x2c,driver);put(car+0x30,behavior);put(car+0x34,physics);d.setUint8(car+0x5c0,1);put(driver,0x785370);put(driver+4,car);put(driver+8,behavior);put(behavior,0x784f40);put(behavior+0x220,car);
 put(driver+0x6fc,action);put(action,0x784768);put(action+0x14,1);
 fp(car+0xb0,0);fp(car+0xb4,0);fp(car+0xb8,1);fp(params+0x1c0,.5);d.setUint16(state+0x3cc,Math.round(degrees*65536/360)&65535,true);fp(state+0xd8,yaw);put(car+0x424,gear);u.copyWithin(otherCar,car,car+0x1000);
 mutate();
}
function run(which,type,degrees=95,yaw=1,gear=2,mutate){setup(type,degrees,yaw,gear,mutate);const beforeOwner=Buffer.from(u.slice(B,B+128)),beforeRecord=Buffer.from(u.slice(record,record+0x1000));enter(which,physics);assert.deepEqual(Buffer.from(u.slice(B,B+128)),beforeOwner,'Mailbox must not be mutated');assert.deepEqual(Buffer.from(u.slice(record,record+0x1000)),beforeRecord,'Racer identity/data must not be mutated');return {output:{accum:[0,4,8].map(o=>fg(body+0x120+o)),rearGrip:[fg(wheelL+0x188),fg(wheelR+0x188)]},snapshot:Buffer.from(u.slice(0x10000,0x120000))};}
const activeCases=[];
for(const category of [0,.5,1])for(const degrees of [-120,-95,-90,-89.5,-60,-30,0,30,60,89.5,90,95,120])for(const yaw of [-1,1])for(const gear of [1,2]){
 const setupCategory=()=>fp(params+0x1c0,category);const normal=run('candidate',1,degrees,yaw,gear,setupCategory),opponent=run('native',2,degrees,yaw,gear,setupCategory);assert.deepEqual(normal.output,opponent.output);activeCases.push({category,degrees,yaw,gear,output:normal.output});
}
const fails=[
 ['invalid magic',()=>put(B,0)],['invalid acknowledgment',()=>put(B+28,0)],['odd request sequence',()=>put(B+4,3)],['off request',()=>put(B+8,0)],['invalid requested mode',()=>put(B+8,3)],['not acquired',()=>put(B+52,0)],['release status',()=>put(B+52,2)],['stale heartbeat',()=>put(B+48,180)],['invalid gameplay state',()=>put(0x8654a4,0)],['permission disabled',()=>put(0xd00030,0)],
 ['network mask 8',()=>put(0x850078,8)],['network mask 512',()=>put(0x850078,512)],['network state 866a14',()=>put(0x866a14,1)],['network state 8669f4',()=>put(0x8669f4,1)],['network flag 89cf69',()=>d.setUint8(0x89cf69,1)],
 ['drag priority',()=>d.setUint8(0x89e7d8,1)],['forced drag priority',()=>put(0x890108,1)],['no native Drift flag',()=>d.setUint8(0x89e7d9,0)],
 ['requested car mismatch',()=>put(B+16,otherCar)],['acquired car mismatch',()=>put(B+36,otherCar)],['manual driver kind',()=>put(car+0x24,1)],['wrong physics kind',()=>put(car+0x28,3)],['not ready car',()=>d.setUint8(car+0x5c0,0)],['physics pointer mismatch',()=>put(car+0x34,0)],['other physics car',()=>put(physics+0x5c,otherCar)],
 ['missing global player',()=>put(0xd00000,0)],['invalid player pointer',()=>put(0xd00000,0xfffffff0)],['requested player mismatch',()=>put(B+12,player+0x1000)],['acquired player mismatch',()=>put(B+32,player+0x1000)],['player car mismatch',()=>put(player+4,otherCar)],['inactive player',()=>put(player+16,1)],['marked/network record',()=>d.setUint8(record+0x900,1)],['non-player record type',()=>put(record+4,3)],
 ['missing native driver',()=>put(car+0x2c,0)],['wrong driver vtable',()=>put(driver,0x784f40)],['driver car mismatch',()=>put(driver+4,otherCar)],['missing main behavior',()=>put(driver+8,0)],['wrong main behavior',()=>put(behavior,0x784eb0)],['main behavior car mismatch',()=>put(behavior+0x220,otherCar)],['input alias mismatch',()=>put(car+0x30,0)],['physics input alias mismatch',()=>put(physics+4,0)],
 ['missing race',()=>put(0x890118,0)],['requested race mismatch',()=>put(B+20,race+0x1000)],['acquired race mismatch',()=>put(B+40,race+0x1000)],['inactive race',()=>put(race,0)]
];
const rejected=[];for(const [name,mutate]of fails){const nativeResult=run('native',1,95,1,2,mutate),candidateResult=run('candidate',1,95,1,2,mutate);assert.deepEqual(candidateResult.snapshot,nativeResult.snapshot,name+' must preserve all observed guest bytes');rejected.push({name,byteExactNative:true,output:candidateResult.output});}
const unchangedOpponents=[];for(const type of [2])for(const [name,mutate]of [['valid ownership',()=>{}],...fails]){const a=run('native',type,95,1,2,mutate),b=run('candidate',type,95,1,2,mutate);assert.deepEqual(a.snapshot,b.snapshot);unchangedOpponents.push(name);}
const deliberateEligibility=[];
for(const [name,mutate]of [
 ['forced Drift flag',()=>{d.setUint8(0x89e7d9,0);put(0x890104,1);}],['native flag114 Drift',()=>{d.setUint8(0x89e7d9,0);put(0x890114,1);}],['requested mode 2',()=>put(B+8,2)],['permitted network',()=>{put(B+84,1);put(0x850078,520);put(0x866a14,1);put(0x8669f4,1);d.setUint8(0x89cf69,1);}],
 ['native Park goal left untouched',()=>{put(action,0x784968);put(action+0x14,11);}],['native missing goal left untouched',()=>put(driver+0x6fc,0)]]){
 const a=run('candidate',1,95,1,2,mutate),b=run('native',2,95,1,2,mutate);assert.deepEqual(a.output,b.output);deliberateEligibility.push({name,opponentOutputExact:true,output:a.output});
}
const result={moduleSha,selectorIsReadOnly:true,singlePointerExpressionChanged:true,activeCases,rejected,unchangedOpponents,deliberateEligibility,limitations:[
 'Same native Drift-family predicate: flag 0x890114, byte 0x89e7d9 or flag 0x890104, with drag/forced-drag priority. Native owned Drift main behavior/full physics remain mandatory.',
 'No goal is read or changed. Park and missing-goal fixtures remain eligible. Recovery eligibility follows from the absence of any goal predicate; a live recovery sequence was not executed.',
 'Synthetic fixtures do not prove live acquisition/release, shared-memory races, heartbeat timing or recovery lifecycle. Stable sequence is checked twice; interleaving was not exercised.',
 'Velocity-angle helper is controlled; rear-grip helper returns 1. Exact native curve/startup/assist and all other arithmetic/stores execute.',
 'Rejected snapshots compare every byte in 0x10000..0x120000; mailbox and racer-record snapshots are separately asserted unchanged. This is not an exhaustive whole-address-space write monitor.',
 'No release files were changed. Pointer substitution was compiled in this private harness only.'
]};
assert.equal(activeCases.length,156);assert.equal(rejected.length,45);assert.equal(unchangedOpponents.length,46);assert.equal(deliberateEligibility.length,6);
});
