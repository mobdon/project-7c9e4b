'use strict';
// Private AA-only consumed-value prototype. Saved plans contain authored bytes
// and scalar pins only; original/complete native modules remain in memory.
const assert=require('node:assert/strict');
const P=require('../../work-aa-profile/tools/native-proof.cjs');
const {locals}=require('../../nfsu2-extension/tools/compose-contact-prefixes.cjs');
const {replace}=require('../../work-catchup-wrapper/cache-fix.cjs');
const {BASE:B,MAGIC,O,REASON}=require('./protocol.cjs');
const {PROFILES}=require('./profile-config.cjs');
function create(profile=PROFILES[0]){
const INDEX=3553,BODY='cda18bdcc3108ad1b0a2f095a7bf946fdc3d8f75cb9aa12e1a77fdde29528502',BITMAP=profile.bitmap;
// Root-frozen settlement-corrected .6 input. This separate private experiment
// remains unsealed and requires its own review before any integration.
const COMPLETE=profile.completeInputHash;
const c=n=>`(i32.const ${n})`,l=n=>`(local.get $rb_${n})`,u=(x,o=0)=>`(i32.load offset=${o} ${x})`,b=(x,o=0)=>`(i32.load8_u offset=${o} ${x})`,g=n=>u(c(n)),a=n=>g(B+n),eq=(x,y)=>`(i32.eq ${x} ${y})`,set=(n,x)=>`(local.set $rb_${n} ${x})`;
const guard=x=>`(br_if $rb_done (i32.eqz ${x}))`,zero=x=>guard(`(i32.eqz ${x})`),OR=xs=>xs.reduce((x,y)=>`(i32.or ${x} ${y})`,c(0));
const al=n=>`(i32.atomic.load ${c(B+n)})`,as=(n,v)=>`(i32.atomic.store ${c(B+n)} ${v})`;
const readable=(x,n)=>{const end=`(i32.add ${x} ${c(n-1)})`,committed=p=>`(i32.and (i32.shr_u ${b(`(i32.add ${c(BITMAP)} (i32.shr_u ${p} ${c(17)}))`)} (i32.and (i32.shr_u ${p} ${c(14)}) ${c(7)})) ${c(1)})`;return[guard(`(i32.eqz (i32.and ${x} ${c(3)}))`),guard(`(i32.ge_u ${x} ${c(65536)})`),guard(`(i32.le_u ${x} ${c(0x28000000-n)})`),guard(`(i64.le_u (i64.extend_i32_u ${x}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const ${n})))`),guard(committed(x)),guard(committed(end))].join('\n');};
const network=OR([`(i32.and ${g(0x850078)} ${c(520)})`,g(0x866a14),g(0x8669f4),b(c(0x89cf69)),`(i32.and (i32.ne ${g(profile.online[0])} ${c(0)}) (i32.and (i32.ne ${b(c(profile.online[1]))} ${c(0)}) (i32.ne ${g(profile.online[2])} ${c(0)})))`]);
// Base graph checks also apply to Off and guarded-native acknowledgements.
// No former requested/owned race is dereferenced; current post-race/manual
// native publications can acknowledge cessation with their current graph.
function graph({final=false}={}){return`
 ${guard(`(i32.ge_u (memory.size) ${c(Math.ceil((profile.online[1]+4)/65536))})`)}
 ${guard(eq(al(O.magic),c(MAGIC)))} ${guard(eq(al(O.command),l('command')))}
 ${guard(eq(g(0x8654a4),c(6)))} ${guard(eq(g(0xd00030),c(1)))}
 ${final?guard(eq(g(0xd00000),l('player'))):set('player',g(0xd00000))} ${readable(l('player'),20)}
 ${final?guard(eq(u(l('player'),4),l('car'))):set('car',u(l('player'),4))} ${readable(l('car'),0xa00)}
 ${guard(eq(u(l('car'),0x28),c(1)))} ${guard(eq(u(l('car'),0x34),l('receiver')))}
 ${readable(l('receiver'),0x60)} ${guard(eq(u(l('receiver')),c(0x7a25b0)))} ${guard(eq(u(l('receiver'),0x5c),l('car')))}
 ${final?guard(eq(u(l('car'),0x14),l('record'))):set('record',u(l('car'),0x14))} ${readable(l('record'),0x904)} ${guard(eq(u(l('record'),4),c(1)))} ${zero(b(l('record'),0x900))}
 ${final?guard(eq(g(0x890118),l('race'))):set('race',g(0x890118))}
 (if ${l('race')} (then ${readable(l('race'),24)}))
 ${['chassis','aux','power','w0','w1','w2','w3','carrier'].map((n,i)=>{const off=[0x20,0x48,0x50,0x38,0x3c,0x40,0x44,0x3c][i],from=n==='carrier'?l('car'):l('receiver'),span=[0x20c,0x94,16,0x188,0x188,0x188,0x188,0x1c][i];return`${final?guard(eq(u(from,off),l(n))):set(n,u(from,off))} ${readable(l(n),span)}`;}).join('\n')}
 `;}
function eligibility(){return`
 ${guard(eq(a(0),c(0x3749414e)))} ${guard(eq(a(28),c(0x3749414e)))}
 ${set('seq',a(4))} ${guard(`(i32.ne ${l('seq')} ${c(0)})`)} ${zero(`(i32.and ${l('seq')} ${c(1)})`)}
 ${guard(eq(a(8),c(1)))} ${guard(eq(a(52),c(1)))} ${guard(`(i32.lt_u ${a(48)} ${c(180)})`)}
 ${guard(eq(a(12),l('player')))} ${guard(eq(a(32),l('player')))} ${guard(eq(a(16),l('car')))} ${guard(eq(a(36),l('car')))}
 ${guard(eq(a(20),l('race')))} ${guard(eq(a(40),l('race')))} ${guard(`(i32.ne ${l('race')} ${c(0)})`)} ${guard(eq(u(l('race')),c(4)))}
 ${zero(u(l('player'),16))} ${guard(eq(u(l('car'),0x24),c(3)))}
 ${set('driver',u(l('car'),0x2c))} ${readable(l('driver'),0x774)} ${guard(eq(u(l('driver')),c(0x785370)))} ${guard(eq(u(l('driver'),4),l('car')))}
 ${guard(eq(g(0x89e7b0),c(1)))} ${guard(eq(g(0x89e7f8),c(1)))} ${guard(eq(g(672502872),c(0)))}
 ${zero(OR([b(c(0x89e7d8)),b(c(0x89e7d9)),b(c(0x89e7e3)),g(0x890104),g(0x890108),g(0x89010c),g(0x890114)]))}
 ${guard(eq(a(60),l('percent')))} ${guard(eq(a(76),l('percent')))} ${guard(`(i32.ne ${a(80)} ${c(0)})`)} ${guard(`(i32.ne (i32.and ${l('command')} ${c(512)}) ${c(0)})`)}
 ${guard(`(i32.le_u ${a(84)} ${c(1)})`)}
 (if ${network} (then ${guard(eq(a(84),c(1)))} ${guard(`(i32.ne ${g(0x850088)} ${c(10)})`)}))
 ${guard(eq(l('seq'),a(4)))}
 `;}
function entry(){return`(block $rb_done
 ${guard(`(i32.ge_u (memory.size) ${c(Math.ceil((profile.online[1]+4)/65536))})`)}
 ${guard(eq(al(O.magic),c(MAGIC)))} ${set('command',al(O.command))}
 ${guard(`(i32.ne (i32.shr_u ${l('command')} ${c(16)}) ${c(0)})`)} ${zero(`(i32.and ${l('command')} ${c(0xfc00)})`)}
 ${set('percent',`(i32.and ${l('command')} ${c(255)})`)} ${guard(`(i32.ge_u ${l('percent')} ${c(100)})`)} ${guard(`(i32.le_u ${l('percent')} ${c(150)})`)}
 (if (i32.eqz (i32.and ${l('command')} ${c(256)})) (then ${guard(eq(l('percent'),c(100)))}))
 ${readable('(local.get 0)',256)} ${set('receiver',u('(local.get 0)',4))} ${set('stack',u('(local.get 0)',16))} ${readable(l('stack'),8)}
 ${guard(eq(u(l('stack')),c(0x5a4c38)))} ${set('argument',u(l('stack'),4))}
 ${graph()} ${set('valid',c(1))}
 ${guard(`(i32.ne (i32.and ${l('command')} ${c(256)}) ${c(0)})`)}
 ${eligibility()}
 ${guard(eq(l('argument'),c(0x3f800000)))} ${guard(eq(u(l('car'),0x468),c(0x3f800000)))} ${guard(`(i32.ne ${g(0x7fc0a0)} ${c(0)})`)}
 ${guard(eq(al(O.command),l('command')))} ${set('savedSeq',l('seq'))} ${set('apply',c(1))})`;}
function consumed(){return`(local.set $rb_value) (block $rb_done
 ${guard(l('apply'))} ${guard(`(i32.eq (i32.reinterpret_f32 (local.get $rb_value)) ${c(0x3f800000)})`)}
 ${graph({final:true})} ${eligibility()} ${guard(eq(l('savedSeq'),l('seq')))}
 ${guard(eq(u(l('stack'),4),l('argument')))} ${guard(eq(u(l('car'),0x468),c(0x3f800000)))} ${guard(`(i32.ne ${g(0x7fc0a0)} ${c(0)})`)}
 ${guard(eq(al(O.command),l('command')))}
 (local.set $rb_value (f32.div (f32.convert_i32_u ${l('percent')}) (f32.const 100))) ${set('count',`(i32.add ${l('count')} ${c(1)})`)}) (local.get $rb_value)`;}
function postfix(){return`(block $rb_done
 ${guard(l('valid'))} ${graph({final:true})}
 ${guard(eq(u('(local.get 0)',16),`(i32.add ${l('stack')} ${c(8)})`))} ${guard(eq(u('(local.get 0)',32),c(0x5a4c38)))}
 ${guard(eq(u(l('stack')),c(0x5a4c38)))} ${guard(eq(u(l('stack'),4),l('argument')))}
 ${set('ackPercent',c(100))} ${set('reason',c(REASON.guardedNative))}
 (if (i32.eqz (i32.and ${l('command')} ${c(256)})) (then ${set('reason',c(REASON.off))}))
 (if ${eq(l('count'),c(1))} (then
   ;; On acknowledgement also requires the original generation/identity gates.
   ${eligibility()} ${guard(eq(l('savedSeq'),l('seq')))}
   ${guard(eq(u(l('car'),0x468),c(0x3f800000)))}
   ${set('ackPercent',l('percent'))} ${set('reason',c(REASON.applied))}))
 ${guard(eq(al(O.command),l('command')))}
 ;; The status counter is a seqlock for ack metadata. Odd means publishing.
 ;; CAS denies concurrent writers; wrapped counters preserve even/odd parity.
 ${set('oldStatus',al(O.status))} ${zero(`(i32.and (i32.shr_u ${l('oldStatus')} ${c(16)}) ${c(1)})`)}
 ${set('nextCounter',`(i32.and (i32.add (i32.shr_u ${l('oldStatus')} ${c(16)}) ${c(2)}) ${c(65535)})`)}
 ${set('busyStatus',`(i32.or (i32.shl (i32.sub ${l('nextCounter')} ${c(1)}) ${c(16)}) (i32.and ${l('oldStatus')} ${c(65535)}))`)}
 ${guard(eq(`(i32.atomic.rmw.cmpxchg ${c(B+O.status)} ${l('oldStatus')} ${l('busyStatus')})`,l('oldStatus')))}
 ${guard(eq(al(O.magic),c(MAGIC)))} ${guard(eq(al(O.status),l('busyStatus')))}
 ${as(O.ack,c(0))} ${as(O.percent,l('ackPercent'))} ${as(O.car,l('car'))}
 ;; Keep the writer lock odd through metadata and acknowledged-command writes.
 ;; If the final graph check fails, clear ack and release our owned lock so a
 ;; later current publication can acknowledge reset rather than deadlocking.
 (block $rb_commit_failed
  ${graph({final:true}).replaceAll('$rb_done','$rb_commit_failed')}
  (if ${eq(l('count'),c(1))} (then
   ${eligibility().replaceAll('$rb_done','$rb_commit_failed')}
   ${guard(eq(l('savedSeq'),l('seq'))).replaceAll('$rb_done','$rb_commit_failed')}
   ${guard(eq(u(l('car'),0x468),c(0x3f800000))).replaceAll('$rb_done','$rb_commit_failed')}))
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
const extraNames=['receiver','stack','command','percent','player','car','record','race','chassis','aux','power','w0','w1','w2','w3','carrier','seq','driver','argument','valid','apply','count','ackPercent','reason','savedSeq','oldStatus','nextCounter','busyStatus'];
async function build(){const raw=P.pinned(profile.native),original=P.parse(raw).bodies.get(INDEX),meta=locals(original),wabt=await require('../../build-deps/node_modules/wabt')();assert.equal(P.hash(original),BODY);assert.equal(original.length,1288);assert.equal(meta.types.length,13);assert.equal(meta.end,17);assert.equal(original[original.length-1],11);
 const names={127:'i32',126:'i64',125:'f32',124:'f64',123:'v128'},decl=meta.types.map(x=>`(local ${names[x]})`).join(' ')+extraNames.map(x=>`(local $rb_${x} i32)`).join(' ')+' (local $rb_value f32)';
 const compile=(source,{value=false}={})=>{const wat=`(module (import "env" "memory" (memory 256 65536 shared)) (func (param i32) ${decl} ${value?'(f32.const 0)':''} ${source} ${value?'drop':''}))`,m=wabt.parseWat('private-authored-full-physics.wat',wat,{threads:true,simd:true,bulk_memory:true});m.resolveNames();m.validate({threads:true,simd:true,bulk_memory:true});const body=[...P.parse(Buffer.from(m.toBinary({}).buffer)).bodies.values()][0],d=locals(body);m.destroy();return{header:body.subarray(0,d.end),fragment:body.subarray(d.end+(value?5:0),body.length-(value?2:1))};};
 const prefix=compile(entry()),load=compile(consumed(),{value:true}),post=compile(postfix());assert.deepEqual(prefix.header,load.header);assert.deepEqual(prefix.header,post.header);
 const needle=Buffer.from('41808080800020026a41046a2a0000','hex'),at=original.indexOf(needle);assert.equal(at+needle.length,194);assert.equal(original.indexOf(needle,at+1),-1);
 const plan={schema:'nfsu2-private-full-physics-v1',experimental:true,liveVerified:false,integrationReady:false,sourceModuleHash:profile.native.hash,completeModuleHash:COMPLETE,completePinSealed:false,index:INDEX,originalHash:BODY,originalLength:original.length,originalLocalsEnd:meta.end,locals:prefix.header.toString('base64'),entry:prefix.fragment.toString('base64'),insertions:[{offset:194,bytes:load.fragment.toString('base64')},{offset:original.length-1,bytes:post.fragment.toString('base64')}],scope:'Paired selected pace and full publisher consumed argument only; cap150; unchanged car+468, driver cache, racer records, simplified publisher, native branches and probability logic',mailbox:{base:B,magic:MAGIC,offsets:O},sources:{entry:entry(),consumed:consumed(),postfix:postfix()}};
 return{plan,original,body:patchBody(original,plan)};}
function patchBody(original,plan){assert.equal(P.hash(original),BODY);assert.equal(plan.originalHash,BODY);assert.equal(original.length,1288);assert.equal(plan.index,INDEX);let at=plan.originalLocalsEnd;const out=[Buffer.from(plan.locals,'base64'),Buffer.from(plan.entry,'base64')];for(const x of plan.insertions){assert(x.offset>=at&&x.offset<original.length);out.push(original.subarray(at,x.offset),Buffer.from(x.bytes,'base64'));at=x.offset;}out.push(original.subarray(at));return Buffer.concat(out);}
function applyPlan(input,plan){assert.equal(P.hash(input),COMPLETE,'Exact provisional complete module pin required');assert.equal(plan.completeModuleHash,COMPLETE);assert.equal(plan.sourceModuleHash,profile.native.hash);assert.equal(plan.completePinSealed,true,'Unsealed private candidate cannot be integrated');const p=P.parse(input);return replace(input,{[INDEX]:patchBody(p.bodies.get(INDEX),plan)});}
return{INDEX,BODY,COMPLETE,build,patchBody,applyPlan,entry,consumed,postfix,profile};
}
module.exports={create,PROFILES,...create()};
