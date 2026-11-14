'use strict';
// Exact .8 split publication builder. Plans contain authored fragments and
// scalar pins; complete/original native modules remain in memory.
const assert=require('node:assert/strict');
const P=require('../../work-aa-profile/tools/native-proof.cjs');
const {locals}=require('../../nfsu2-extension/tools/compose-contact-prefixes.cjs');
const {replace}=require('../../work-catchup-wrapper/cache-fix.cjs');
const {BASE:B,MAGIC,offsets:O}=require('./paced-protocol.cjs');
const {PROFILES}=require('./paced-profile-config.cjs');
const EXTRA=require('./paced-extra.cjs');
// CPU is runtime storage above GUEST_END, not a guest allocation. Match the
// existing Drag guard: bound the full state with widened address arithmetic.
const runtimeCpuBound=x=>`(i32.and (i32.eqz (i32.and ${x} (i32.const 3))) (i32.and (i32.ge_u ${x} (i32.const 65536)) (i64.le_u (i64.add (i64.extend_i32_u ${x}) (i64.const 344)) (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)))))`;
function create(profile=PROFILES[0]){
const INDEX=3553,BODY='cda18bdcc3108ad1b0a2f095a7bf946fdc3d8f75cb9aa12e1a77fdde29528502',BITMAP=profile.bitmap;
// Each profile binds the complete delivered .7 input. The release pipeline
// independently reviews this generated post-.7 adaptation before delivery.
const COMPLETE=profile.completeInputHash;
const c=n=>`(i32.const ${n})`,l=n=>`(local.get $rb_${n})`,u=(x,o=0)=>`(i32.load offset=${o} ${x})`,b=(x,o=0)=>`(i32.load8_u offset=${o} ${x})`,g=n=>u(c(n)),a=n=>g(B+n),eq=(x,y)=>`(i32.eq ${x} ${y})`,set=(n,x)=>`(local.set $rb_${n} ${x})`;
const guard=x=>`(br_if $rb_done (i32.eqz ${x}))`,zero=x=>guard(`(i32.eqz ${x})`),OR=xs=>xs.reduce((x,y)=>`(i32.or ${x} ${y})`,c(0));
const al=n=>`(i32.atomic.load ${c(B+n)})`,as=(n,v)=>`(i32.atomic.store ${c(B+n)} ${v})`;
const ex=o=>`(i32.atomic.load ${c(EXTRA.BASE+o)})`,es=(o,v)=>`(i32.atomic.store ${c(EXTRA.BASE+o)} ${v})`;
const readable=(x,n)=>{const end=`(i32.add ${x} ${c(n-1)})`,committed=p=>`(i32.and (i32.shr_u ${b(`(i32.add ${c(BITMAP)} (i32.shr_u ${p} ${c(17)}))`)} (i32.and (i32.shr_u ${p} ${c(14)}) ${c(7)})) ${c(1)})`;return[guard(`(i32.eqz (i32.and ${x} ${c(3)}))`),guard(`(i32.ge_u ${x} ${c(65536)})`),guard(`(i32.le_u ${x} ${c(0x28000000-n)})`),guard(`(i64.le_u (i64.extend_i32_u ${x}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const ${n})))`),guard(committed(x)),guard(committed(end))].join('\n');};
const network=OR([`(i32.and ${g(0x850078)} ${c(520)})`,g(0x866a14),g(0x8669f4),b(c(0x89cf69)),`(i32.and (i32.ne ${g(profile.online[0])} ${c(0)}) (i32.and (i32.ne ${b(c(profile.online[1]))} ${c(0)}) (i32.ne ${g(profile.online[2])} ${c(0)})))`]);
// Base graph checks also apply to Off and guarded-native acknowledgements.
// No former requested/owned race is dereferenced; current post-race/manual
// native publications can acknowledge cessation with their current graph.
function graph({final=false}={}){return`
 ${guard(`(i32.ge_u (memory.size) ${c(Math.ceil((profile.online[1]+4)/65536))})`)}
 ${guard(eq(al(O.magic),c(MAGIC)))} ${guard(eq(al(O.command),l('command')))}
 ${readable(c(EXTRA.BASE),EXTRA.SIZE)} ${guard(eq(ex(0),c(EXTRA.MAGIC)))} ${guard(eq(ex(40),c(1)))} ${guard(eq(ex(60),c(EXTRA.MAGIC)))}
 ${guard(eq(g(0x8654a4),c(6)))} ${guard(eq(g(0xd00030),c(1)))}
 ${final?guard(eq(g(0xd00000),l('player'))):set('player',g(0xd00000))} ${readable(l('player'),20)}
 ${final?guard(eq(u(l('player'),4),l('car'))):set('car',u(l('player'),4))} ${readable(l('car'),0xa00)}
 ${guard(eq(u(l('car'),0x28),c(1)))} ${guard(eq(u(l('car'),0x34),l('receiver')))}
 ${readable(l('receiver'),0x60)} ${guard(eq(u(l('receiver')),c(0x7a25e0)))} ${guard(eq(u(l('receiver'),0x5c),l('car')))}
 ${final?guard(eq(u(l('car'),0x14),l('record'))):set('record',u(l('car'),0x14))} ${readable(l('record'),0x904)} ${guard(eq(u(l('record'),4),c(1)))} ${zero(b(l('record'),0x900))}
 ${final?guard(eq(g(0x890118),l('race'))):set('race',g(0x890118))}
 (if ${l('race')} (then ${readable(l('race'),24)}))
 ${['chassis','aux','power','w0','w1','w2','w3','carrier'].map((n,i)=>{const off=[0x20,0x48,0x50,0x38,0x3c,0x40,0x44,0x3c][i],from=n==='carrier'?l('car'):l('receiver'),span=[0x20c,0x94,16,0x188,0x188,0x188,0x188,0x1c][i];return`${final?guard(eq(u(from,off),l(n))):set(n,u(from,off))} ${readable(l(n),span)}`;}).join('\n')}
 `;}
function eligibility(){return`
 ${guard(eq(a(0),c(0x3749414e)))} ${guard(eq(a(28),c(0x3749414e)))}
 ${set('seq',a(4))} ${guard(`(i32.ne ${l('seq')} ${c(0)})`)} ${zero(`(i32.and ${l('seq')} ${c(1)})`)}
 ${guard(eq(ex(36),l('seq')))}
 ${guard(eq(a(8),c(1)))} ${guard(eq(a(52),c(1)))} ${guard(`(i32.lt_u ${a(48)} ${c(180)})`)}
 ${guard(eq(a(12),l('player')))} ${guard(eq(a(32),l('player')))} ${guard(eq(a(16),l('car')))} ${guard(eq(a(36),l('car')))}
 ${guard(eq(a(20),l('race')))} ${guard(eq(a(40),l('race')))} ${guard(`(i32.ne ${l('race')} ${c(0)})`)} ${guard(eq(u(l('race')),c(4)))}
 ${zero(u(l('player'),16))} ${guard(eq(u(l('car'),0x24),c(3)))}
 ${set('driver',u(l('car'),0x2c))} ${readable(l('driver'),0x774)} ${guard(eq(u(l('driver')),c(0x785370)))} ${guard(eq(u(l('driver'),4),l('car')))}
 ${guard(eq(g(0x89e7b0),c(1)))} ${guard(eq(g(0x89e7f8),c(1)))} ${guard(eq(g(672502872),c(0)))}
 ${zero(OR([b(c(0x89e7d8)),b(c(0x89e7d9)),b(c(0x89e7e3)),g(0x890104),g(0x890108),g(0x89010c),g(0x890114)]))}
 ${guard(eq(a(60),l('percent')))} ${guard(`(i32.ne (i32.and ${l('command')} ${c(512)}) ${c(0)})`)}
 ${guard(`(i32.le_u ${a(84)} ${c(1)})`)}
 (if ${network} (then ${guard(eq(a(84),c(1)))} ${guard(`(i32.ne ${g(0x850088)} ${c(10)})`)}))
 ${guard(eq(l('seq'),a(4)))}
 `;}
function entry(){return`(block $rb_done
 ${guard(`(i32.ge_u (memory.size) ${c(Math.ceil((profile.online[1]+4)/65536))})`)}
 ${readable(c(EXTRA.BASE),EXTRA.SIZE)} ${guard(eq(ex(0),c(EXTRA.MAGIC)))} ${guard(eq(ex(40),c(1)))} ${guard(eq(ex(60),c(EXTRA.MAGIC)))} ${es(32,c(10))}
 ${guard(eq(al(O.magic),c(MAGIC)))} ${set('command',al(O.command))}
 ${guard(`(i32.ne (i32.shr_u ${l('command')} ${c(16)}) ${c(0)})`)} ${set('strengthCode',`(i32.and (i32.shr_u ${l('command')} ${c(10)}) ${c(63)})`)} ${guard(`(i32.le_u ${l('strengthCode')} ${c(36)})`)} ${set('strength',`(f32.add (f32.const 1) (f32.mul (f32.convert_i32_u ${l('strengthCode')}) (f32.const 0.25)))`)}
 ${set('percent',`(i32.and ${l('command')} ${c(255)})`)} ${guard(`(i32.ge_u ${l('percent')} ${c(100)})`)} ${guard(`(i32.le_u ${l('percent')} ${c(200)})`)}
 (if (i32.eqz (i32.and ${l('command')} ${c(256)})) (then ${guard(eq(l('percent'),c(100)))} ${guard(eq(l('strengthCode'),c(0)))}))
 ${guard(runtimeCpuBound('(local.get 0)'))} ${set('receiver',u('(local.get 0)',4))} ${set('stack',u('(local.get 0)',16))} ${readable(l('stack'),8)}
 ${guard(eq(u(l('stack')),c(0x5a4c38)))} ${set('argument',u(l('stack'),4))}
 ${graph()} ${set('valid',c(1))} ${es(32,c(11))}
 ${guard(`(i32.ne (i32.and ${l('command')} ${c(256)}) ${c(0)})`)}
 ${eligibility()}
 ${set('driverBits',u(l('driver'),0x770))} ${guard(`(i32.lt_u (i32.and ${l('driverBits')} ${c(0x7fffffff)}) ${c(0x7f800000)})`)}
 ${guard(eq(u(l('car'),0x468),l('argument')))}
 ${set('source',`(f32.reinterpret_i32 ${l('argument')})`)} ${guard(`(f32.gt ${l('source')} (f32.const 0))`)} ${guard(`(f32.le ${l('source')} (f32.const 3.4028234663852886e38))`)}
 ${set('pace',`(f32.div (f32.convert_i32_u ${l('percent')}) (f32.const 100))`)} ${set('powerValue',`(f32.mul (f32.mul ${l('source')} ${l('pace')}) ${l('strength')})`)} ${set('tireValue',`(f32.mul ${l('powerValue')} ${l('pace')})`)} ${guard(`(f32.gt ${l('powerValue')} (f32.const 0))`)} ${guard(`(f32.le ${l('powerValue')} (f32.const 3.4028234663852886e38))`)} ${guard(`(f32.gt ${l('tireValue')} (f32.const 0))`)} ${guard(`(f32.le ${l('tireValue')} (f32.const 3.4028234663852886e38))`)} ${guard(`(i32.ne ${g(0x7fc0a0)} ${c(0)})`)}
 ${guard(eq(al(O.command),l('command')))} ${set('savedSeq',l('seq'))} ${set('apply',c(1))} ${es(32,c(12))})`;}
function consumed(){return`(local.set $rb_value) (block $rb_done
 ${guard(l('apply'))} ${guard(eq(`(i32.reinterpret_f32 ${l('value')})`,l('argument')))}
 ${graph({final:true})} ${eligibility()} ${guard(eq(l('savedSeq'),l('seq')))}
 ${guard(eq(u(l('stack'),4),l('argument')))} ${guard(eq(u(l('car'),0x468),l('argument')))} ${guard(`(i32.ne ${g(0x7fc0a0)} ${c(0)})`)}
 ${guard(eq(al(O.command),l('command')))}
 (local.set $rb_value ${l('powerValue')}) ${set('count',`(i32.add ${l('count')} ${c(1)})`)}) (local.get $rb_value)`;}
function readback(){return `${guard(eq(u(l('driver'),0x770),l('driverBits')))} ${['w0','w1','w2','w3'].map(n=>guard(eq(u(l(n),0x184),`(i32.reinterpret_f32 ${l('tireValue')})`))).join('\n')} ${guard(eq(u(l('power'),8),`(i32.reinterpret_f32 ${l('powerValue')})`))} ${guard(eq(u(l('chassis'),0x208),`(i32.reinterpret_f32 ${l('powerValue')})`))}`;}
function wheel(){return `(local.set $rb_value) (block $rb_done
 ${guard(l('apply'))} ${guard(eq(l('count'),c(1)))} ${guard(eq(`(i32.reinterpret_f32 ${l('value')})`,`(i32.reinterpret_f32 ${l('powerValue')})`))}
 ${graph({final:true})} ${eligibility()} ${guard(eq(l('savedSeq'),l('seq')))} ${guard(eq(u(l('car'),0x468),l('argument')))} ${guard(eq(al(O.command),l('command')))}
 ${set('value',l('tireValue'))} ${set('wheelCount',`(i32.add ${l('wheelCount')} ${c(1)})`)}) ${l('value')}`;}
function postfix(){return`(block $rb_done
 ${guard(l('valid'))} ${graph({final:true})}
 ${guard(eq(u('(local.get 0)',16),`(i32.add ${l('stack')} ${c(8)})`))} ${guard(eq(u('(local.get 0)',32),c(0x5a4c38)))}
 ${guard(eq(u(l('stack')),c(0x5a4c38)))} ${guard(eq(u(l('stack'),4),l('argument')))}
 ${set('ackPercent',l('argument'))} ${set('reason',c(3))}
 (if (i32.eqz (i32.and ${l('command')} ${c(256)})) (then ${set('reason',c(2))}))
 (if ${eq(l('count'),c(1))} (then
   ;; On acknowledgement also requires the original generation/identity gates.
   ${eligibility()} ${guard(eq(l('savedSeq'),l('seq')))}
   ${guard(eq(u(l('car'),0x468),l('argument')))}
   ${guard(eq(l('wheelCount'),c(4)))}
 ${readback()} ${set('ackPercent',l('argument'))} ${set('reason',c(1))}))
 ${guard(eq(al(O.command),l('command')))}
 ;; The status counter is a seqlock for ack metadata. Odd means publishing.
 ;; CAS denies concurrent writers; wrapped counters preserve even/odd parity.
 ${set('oldStatus',al(O.status))} ${zero(`(i32.and (i32.shr_u ${l('oldStatus')} ${c(16)}) ${c(1)})`)}
 ${set('publishedTick',g(0x86518c))} ${set('publishedRaceClock',`(if (result i32) ${l('race')} (then ${u(l('race'),20)}) (else ${c(0)}))`)}
 ${set('nextCounter',`(i32.and (i32.add (i32.shr_u ${l('oldStatus')} ${c(16)}) ${c(2)}) ${c(65535)})`)}
 ${set('busyStatus',`(i32.or (i32.shl (i32.sub ${l('nextCounter')} ${c(1)}) ${c(16)}) (i32.and ${l('oldStatus')} ${c(65535)}))`)}
 ${guard(eq(`(i32.atomic.rmw.cmpxchg ${c(B+O.status)} ${l('oldStatus')} ${l('busyStatus')})`,l('oldStatus')))}
 ${guard(eq(al(O.magic),c(MAGIC)))} ${guard(eq(al(O.status),l('busyStatus')))}
 ${as(O.ack,c(0))} ${as(O.ownerSequence,`(select ${l('savedSeq')} ${c(0)} ${eq(l('reason'),c(1))})`)} ${as(O.car,l('car'))}
 ${es(4,c(1))} ${es(8,u(l('car'),0x468))} ${es(12,u(l('w0'),0x184))} ${es(16,u(l('w0'),0x184))} ${es(20,l('command'))} ${es(24,`(select ${l('savedSeq')} ${c(0)} ${eq(l('reason'),c(1))})`)} ${es(28,l('receiver'))} ${es(32,c(14))}
 ${es(44,l('publishedTick'))} ${es(48,l('driverBits'))} ${es(52,c(EXTRA.PHASE_MAGIC))} ${es(56,l('publishedRaceClock'))}
 ;; Keep the writer lock odd through metadata and acknowledged-command writes.
 ;; If the final graph check fails, clear ack and release our owned lock so a
 ;; later current publication can acknowledge reset rather than deadlocking.
 (block $rb_commit_failed
  ${graph({final:true}).replaceAll('$rb_done','$rb_commit_failed')}
  (if ${eq(l('count'),c(1))} (then
   ${eligibility().replaceAll('$rb_done','$rb_commit_failed')}
   ${guard(eq(l('savedSeq'),l('seq'))).replaceAll('$rb_done','$rb_commit_failed')}
   ${guard(eq(u(l('car'),0x468),l('argument'))).replaceAll('$rb_done','$rb_commit_failed')} ${readback().replaceAll('$rb_done','$rb_commit_failed')}))
  ${guard(eq(u('(local.get 0)',16),`(i32.add ${l('stack')} ${c(8)})`)).replaceAll('$rb_done','$rb_commit_failed')}
  ${guard(eq(u('(local.get 0)',32),c(0x5a4c38))).replaceAll('$rb_done','$rb_commit_failed')}
  ${guard(eq(al(O.magic),c(MAGIC))).replaceAll('$rb_done','$rb_commit_failed')}
  ${guard(eq(al(O.status),l('busyStatus'))).replaceAll('$rb_done','$rb_commit_failed')}
  ${guard(eq(`(i32.atomic.rmw.cmpxchg ${c(B+O.ack)} ${c(0)} ${l('command')})`,c(0))).replaceAll('$rb_done','$rb_commit_failed')}
  (drop (i32.atomic.rmw.cmpxchg ${c(B+O.status)} ${l('busyStatus')} ${`(i32.or (i32.shl ${l('nextCounter')} ${c(16)}) (i32.or (i32.shl ${l('reason')} ${c(8)}) ${c(1)}))`}))
  (br $rb_done))
 ;; Our ack was cleared while we owned the lock. Preserve any replacement
 ;; owner's fields, and release only the exact busy status we acquired.
 ${guard(eq(al(O.magic),c(MAGIC)))} ${guard(eq(al(O.status),l('busyStatus')))}
 (drop (i32.atomic.rmw.cmpxchg ${c(B+O.status)} ${l('busyStatus')} ${`(i32.or (i32.shl ${l('nextCounter')} ${c(16)}) (i32.or (i32.shl ${l('reason')} ${c(8)}) ${c(1)}))`}))
 )`;}
const extraNames=['receiver','stack','command','percent','player','car','record','race','chassis','aux','power','w0','w1','w2','w3','carrier','seq','driver','argument','valid','apply','count','ackPercent','reason','savedSeq','oldStatus','nextCounter','busyStatus','wheelCount','strengthCode','driverBits','publishedTick','publishedRaceClock'];
async function build(){const raw=P.pinned(profile.native),original=P.parse(raw).bodies.get(INDEX),meta=locals(original),wabt=await require('../../build-deps/node_modules/wabt')();assert.equal(P.hash(original),BODY);assert.equal(original.length,1288);assert.equal(meta.types.length,13);assert.equal(meta.end,17);assert.equal(original[original.length-1],11);
 const names={127:'i32',126:'i64',125:'f32',124:'f64',123:'v128'},decl=meta.types.map(x=>`(local ${names[x]})`).join(' ')+extraNames.map(x=>`(local $rb_${x} i32)`).join(' ')+' (local $rb_value f32) (local $rb_source f32) (local $rb_pace f32) (local $rb_powerValue f32) (local $rb_tireValue f32) (local $rb_strength f32)';
 const compile=(source,{value=false}={})=>{const wat=`(module (import "env" "memory" (memory 256 65536 shared)) (func (param i32) ${decl} ${value?'(f32.const 0)':''} ${source} ${value?'drop':''}))`,m=wabt.parseWat('private-authored-full-physics.wat',wat,{threads:true,simd:true,bulk_memory:true});m.resolveNames();m.validate({threads:true,simd:true,bulk_memory:true});const body=[...P.parse(Buffer.from(m.toBinary({}).buffer)).bodies.values()][0],d=locals(body);m.destroy();return{header:body.subarray(0,d.end),fragment:body.subarray(d.end+(value?5:0),body.length-(value?2:1))};};
 const prefix=compile(entry()),load=compile(consumed(),{value:true}),post=compile(postfix()),wheelFragment=compile(wheel(),{value:true});assert.deepEqual(prefix.header,load.header);assert.deepEqual(prefix.header,post.header);
 const needle=Buffer.from('41808080800020026a41046a2a0000','hex'),at=original.indexOf(needle);assert.equal(at+needle.length,194);assert.equal(original.indexOf(needle,at+1),-1);
 const wheelNeedle=Buffer.from([0x41,0x84,0x03,0x6a,0x20,0x0b,0x38,0,0]),wheelSites=[];for(let x=0;(x=original.indexOf(wheelNeedle,x))>=0;x+=wheelNeedle.length)wheelSites.push(x+6);assert.equal(wheelSites.length,8);
 const plan={schema:'nfsu2-paced-split-publication-v1',experimental:true,liveVerified:false,integrationReady:false,sourceModuleHash:profile.native.hash,completeModuleHash:COMPLETE,completePinSealed:false,index:INDEX,originalHash:BODY,originalLength:original.length,originalLocalsEnd:meta.end,locals:prefix.header.toString('base64'),entry:prefix.fragment.toString('base64'),insertions:[{offset:194,bytes:load.fragment.toString('base64')},...wheelSites.map(offset=>({offset,bytes:wheelFragment.fragment.toString('base64')})),{offset:original.length-1,bytes:post.fragment.toString('base64')}],scope:'SelectedP1..2 andS1..10; consumed fullscalarf32(f32(M*P)*S); exact4wheelf32(E*P); no native source cache writes; native auxiliary relation preserved',mailbox:{base:B,magic:MAGIC,offsets:O},sources:{entry:entry(),consumed:consumed(),wheel:wheel(),postfix:postfix()}};
 return{plan,original,body:patchBody(original,plan)};}
function patchBody(original,plan){assert.equal(P.hash(original),BODY);assert.equal(plan.originalHash,BODY);assert.equal(original.length,1288);assert.equal(plan.index,INDEX);let at=plan.originalLocalsEnd;const out=[Buffer.from(plan.locals,'base64'),Buffer.from(plan.entry,'base64')];for(const x of plan.insertions){assert(x.offset>=at&&x.offset<original.length);out.push(original.subarray(at,x.offset),Buffer.from(x.bytes,'base64'));at=x.offset;}out.push(original.subarray(at));return Buffer.concat(out);}
return{INDEX,BODY,COMPLETE,build,patchBody,entry,consumed,postfix,eligibility,profile};
}
module.exports={create,PROFILES,runtimeCpuBound,...create()};
