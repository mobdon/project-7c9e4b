'use strict';
// Mode3 uses its own native drivetrain and position modifier. It never reads
// the full-physics wheel layout and never changes the native source caches.
const fs=require('node:fs'),assert=require('node:assert/strict');
const P=require('../../work-aa-profile/tools/native-proof.cjs'),I=require('./wasm-inspector-v0388.cjs'),X=require('./paced-extra.cjs');
const {locals}=require('../../nfsu2-extension/tools/compose-contact-prefixes.cjs'),{BASE:B,MAGIC,offsets:O}=require('./paced-protocol.cjs');
const TYPES={127:'i32',126:'i64',125:'f32',124:'f64',123:'v128'};
const ints=['receiver','stack','command','percent','player','car','record','race','chassis','aero','drivetrain','raw','seq','driver','argument','valid','apply','seen','reason','savedSeq','oldStatus','nextCounter','busyStatus','strengthCode','driverBits','publishedTick','publishedRaceClock'];
const floats=['value','source','pace','powerValue','tireValue','strength'];
function create(profile){
 const c=n=>`(i32.const ${n})`,l=n=>`(local.get $rb_${n})`,set=(n,v)=>`(local.set $rb_${n} ${v})`,u=(p,o=0)=>`(i32.load offset=${o} ${p})`,f=(p,o=0)=>`(f32.load offset=${o} ${p})`,g=a=>u(c(a)),a=o=>g(B+o),eq=(x,y)=>`(i32.eq ${x} ${y})`,guard=x=>`(br_if $rb_done (i32.eqz ${x}))`,zero=x=>guard(`(i32.eqz ${x})`);
 const al=o=>`(i32.atomic.load ${c(B+o)})`,store=(p,v)=>`(i32.atomic.store ${c(p)} ${v})`,ex=o=>g(X.BASE+o),es=(o,v)=>store(X.BASE+o,v);
 const readable=(p,n)=>{const committed=q=>`(i32.and (i32.shr_u (i32.load8_u (i32.add ${c(profile.bitmap)} (i32.shr_u ${q} ${c(17)}))) (i32.and (i32.shr_u ${q} ${c(14)}) ${c(7)})) ${c(1)})`;return`${zero(`(i32.and ${p} ${c(3)})`)} ${guard(`(i32.ge_u ${p} ${c(65536)})`)} ${guard(`(i32.le_u ${p} ${c(0x28000000-n)})`)} ${guard(`(i64.le_u (i64.extend_i32_u ${p}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const ${n})))`)} ${guard(committed(p))} ${guard(committed(`(i32.add ${p} ${c(n-1)})`))}`;};
 const finite=p=>`${guard(`(f32.gt ${p} (f32.const 0))`)} ${guard(`(f32.le ${p} (f32.const 3.4028234663852886e38))`)}`;
 function graph(final=false){return`
  ${guard(`(i32.ge_u (memory.size) ${c(Math.ceil((profile.online[1]+4)/65536))})`)} ${readable(c(X.BASE),X.SIZE)} ${guard(eq(ex(0),c(X.MAGIC)))} ${guard(eq(ex(40),c(1)))} ${guard(eq(ex(60),c(X.MAGIC)))}
  ${guard(eq(al(O.magic),c(MAGIC)))} ${guard(eq(al(O.command),l('command')))} ${guard(eq(g(0x8654a4),c(6)))} ${guard(eq(g(0xd00030),c(1)))}
  ${final?guard(eq(g(0xd00000),l('player'))):set('player',g(0xd00000))} ${readable(l('player'),20)}
  ${final?guard(eq(u(l('player'),4),l('car'))):set('car',u(l('player'),4))} ${readable(l('car'),0xa00)} ${guard(eq(u(l('car'),0x28),c(3)))} ${guard(eq(u(l('car'),0x34),l('receiver')))}
  ${readable(l('receiver'),0x60)} ${guard(eq(u(l('receiver')),c(0x7a2538)))} ${guard(eq(u(l('receiver'),0x34),l('car')))}
  ${final?guard(eq(u(l('car'),0x14),l('record'))):set('record',u(l('car'),0x14))} ${readable(l('record'),0x904)} ${guard(eq(u(l('record'),4),c(1)))} ${zero(`(i32.load8_u offset=2304 ${l('record')})`)}
  ${final?guard(eq(g(0x890118),l('race'))):set('race',g(0x890118))} (if ${l('race')} (then ${readable(l('race'),24)}))
  ${['chassis','drivetrain','aero','raw'].map((n,i)=>`${final?guard(eq(u(l('receiver'),[0x20,0x24,0x28,0x2c][i]),l(n))):set(n,u(l('receiver'),[0x20,0x24,0x28,0x2c][i]))} ${readable(l(n),[0x20c,0x144,16,0x270][i])}`).join('\n')}
  ${guard(eq(u(l('drivetrain')),c(0x7a2560)))} ${guard(eq(u(l('drivetrain'),0x14),l('chassis')))} ${guard(eq(u(l('drivetrain'),0x18),l('raw')))}
  ${guard(eq(u(l('aero')),`(i32.add ${l('raw')} ${c(0x260)})`))} ${guard(eq(u(l('aero'),4),l('chassis')))}
 `;}
 const eligible=()=>require('./paced-publisher.cjs').create(profile).eligibility();
 function context(){return`
  ${set('valid',c(0))} ${set('apply',c(0))} ${set('seen',c(0))}
  ${guard(`(i32.ge_u (memory.size) ${c(Math.ceil((profile.online[1]+4)/65536))})`)} ${readable(c(X.BASE),X.SIZE)} ${guard(eq(ex(0),c(X.MAGIC)))} ${guard(eq(ex(40),c(1)))} ${guard(eq(ex(60),c(X.MAGIC)))} ${es(32,c(20))}
  ${guard(eq(al(O.magic),c(MAGIC)))} ${set('command',al(O.command))} ${guard(`(i32.ne (i32.shr_u ${l('command')} ${c(16)}) ${c(0)})`)}
  ${set('strengthCode',`(i32.and (i32.shr_u ${l('command')} ${c(10)}) ${c(63)})`)} ${guard(`(i32.le_u ${l('strengthCode')} ${c(36)})`)}
  ${set('percent',`(i32.and ${l('command')} ${c(255)})`)} ${guard(`(i32.ge_u ${l('percent')} ${c(100)})`)} ${guard(`(i32.le_u ${l('percent')} ${c(200)})`)}
  ${graph()} ${es(32,c(21))} ${set('argument',u(l('car'),0x468))} ${set('source',`(f32.reinterpret_i32 ${l('argument')})`)} ${finite(l('source'))}
  ${set('powerValue',`(select ${l('source')} (f32.const 1) ${g(0x7fc0a0)})`)} ${set('tireValue',l('powerValue'))} ${set('reason',c(2))} ${set('savedSeq',c(0))}
  (if (i32.ne (i32.and ${l('command')} ${c(256)}) ${c(0)}) (then
    ${eligible()} ${guard(`(i32.ne ${g(0x7fc0a0)} ${c(0)})`)} ${guard(eq(g(0x7a1990),c(0x3f800000)))}
    ${set('driverBits',u(l('driver'),0x770))} ${guard(`(i32.lt_u (i32.and ${l('driverBits')} ${c(0x7fffffff)}) ${c(0x7f800000)})`)}
    ${set('pace',`(f32.div (f32.convert_i32_u ${l('percent')}) (f32.const 100))`)}
    ${set('strength',`(f32.add (f32.const 1) (f32.mul (f32.convert_i32_u ${l('strengthCode')}) (f32.const 0.25)))`)}
    ${set('powerValue',`(f32.mul (f32.mul ${l('source')} ${l('pace')}) ${l('strength')})`)} ${set('tireValue',`(f32.mul ${l('powerValue')} ${l('pace')})`)} ${finite(l('powerValue'))} ${finite(l('tireValue'))}
    ${set('savedSeq',l('seq'))} ${set('reason',c(1))} ${set('apply',c(1))} ${es(32,c(22))}
  ) (else ${guard(eq(l('percent'),c(100)))} ${guard(eq(l('strengthCode'),c(0)))})) ${set('valid',c(1))}
 `;}
 function current(){return`${graph(true)} ${guard(eq(u(l('car'),0x468),l('argument')))} (if ${l('apply')} (then ${eligible()} ${guard(eq(l('seq'),l('savedSeq')))} ${guard(eq(u(l('driver'),0x770),l('driverBits')))}))`;}
 function entry(){return`(block $rb_done ${set('receiver',u('(local.get 0)',4))} ${set('stack',u('(local.get 0)',16))} ${readable(l('stack'),8)} ${guard(eq(u(l('stack')),c(0x5ab00c)))} ${context()} ${guard(eq(u(l('stack'),4),l('argument')))} )`;}
 function scalar(){return`${set('value','(local.tee $rb_value)')}`;}
 const scalarLoad=`(local.set $rb_value) (block $rb_done ${guard(l('valid'))} ${guard(l('apply'))} ${guard(eq(`(i32.reinterpret_f32 ${l('value')})`,l('argument')))} ${current()} ${set('value',l('powerValue'))}) ${l('value')}`;
 const gripStore=`(local.set $rb_value) (block $rb_done ${guard(l('valid'))} ${guard(l('apply'))} ${current()} ${set('value',`(f32.mul ${l('value')} ${l('pace')})`)}) ${l('value')}`;
 function outputs(){return`${guard(eq(u(l('aero'),8),`(i32.reinterpret_f32 (select ${l('powerValue')} ${l('source')} ${l('apply')}))`))} ${guard(eq(u(l('chassis'),0x208),`(i32.reinterpret_f32 ${l('powerValue')})`))} ${guard(eq(u(l('drivetrain'),0x13c),`(i32.reinterpret_f32 ${l('powerValue')})`))}`;}
 const prior=`(local.set $rb_value) (block $rb_done ${context()} ${guard(eq(`(i32.reinterpret_f32 ${l('value')})`,`(i32.reinterpret_f32 ${l('tireValue')})`))} ${outputs()} ${set('seen',c(1))} ${es(32,c(23))}) ${l('value')}`;
 function publish(){const unchanged=()=>`${current()} ${outputs()} ${guard(eq(u(l('drivetrain'),0x140),`(i32.reinterpret_f32 ${l('value')})`))}`;return`(block $rb_done
  ${guard(l('valid'))} ${guard(l('seen'))} ${finite(l('value'))} ${unchanged()}
  ${set('oldStatus',al(O.status))} ${zero(`(i32.and (i32.shr_u ${l('oldStatus')} ${c(16)}) ${c(1)})`)}
  ${set('publishedTick',g(0x86518c))} ${set('publishedRaceClock',`(if (result i32) ${l('race')} (then ${u(l('race'),20)}) (else ${c(0)}))`)}
  ${set('nextCounter',`(i32.and (i32.add (i32.shr_u ${l('oldStatus')} ${c(16)}) ${c(2)}) ${c(65535)})`)}
  ${set('busyStatus',`(i32.or (i32.shl (i32.sub ${l('nextCounter')} ${c(1)}) ${c(16)}) (i32.and ${l('oldStatus')} ${c(65535)}))`)}
  ${guard(eq(`(i32.atomic.rmw.cmpxchg ${c(B+O.status)} ${l('oldStatus')} ${l('busyStatus')})`,l('oldStatus')))}
  ${store(B+O.ack,c(0))} ${store(B+O.ownerSequence,l('savedSeq'))} ${store(B+O.car,l('car'))}
  ${es(4,c(3))} ${es(8,l('argument'))} ${es(12,`(i32.reinterpret_f32 ${l('tireValue')})`)} ${es(16,`(i32.reinterpret_f32 ${l('value')})`)} ${es(20,l('command'))} ${es(24,l('savedSeq'))} ${es(28,l('receiver'))} ${es(32,c(24))}
  ${es(44,l('publishedTick'))} ${es(48,l('driverBits'))} ${es(52,c(X.PHASE_MAGIC))} ${es(56,l('publishedRaceClock'))}
  (block $rb_commit_failed ${unchanged().replaceAll('$rb_done','$rb_commit_failed')}
   ${guard(eq(al(O.status),l('busyStatus'))).replaceAll('$rb_done','$rb_commit_failed')}
   ${store(B+O.ack,l('command'))}
   (drop (i32.atomic.rmw.cmpxchg ${c(B+O.status)} ${l('busyStatus')} (i32.or (i32.shl ${l('nextCounter')} ${c(16)}) (i32.or (i32.shl ${l('reason')} ${c(8)}) ${c(1)})))) (br $rb_done))
  (drop (i32.atomic.rmw.cmpxchg ${c(B+O.status)} ${l('busyStatus')} (i32.or (i32.shl ${l('nextCounter')} ${c(16)}) ${c(769)})))
 )`;}
 async function build(){
  const raw=P.pinned(profile.native),parsed=I.inspect(raw),wabt=await require('../../build-deps/node_modules/wabt')(),plans=[];
  for(const index of[6837,7152]){const before=parsed.bodies.get(index),meta=locals(before),decl=meta.types.map(t=>`(local ${TYPES[t]})`).join(' ')+ints.map(n=>`(local $rb_${n} i32)`).join(' ')+floats.map(n=>`(local $rb_${n} f32)`).join(' ');
   const compile=(source,value=false)=>{const m=wabt.parseWat('authored-mode3.wat',`(module (import "env" "memory" (memory 256 65536 shared)) (func (param i32) ${decl} ${value?'(f32.const 0)':''} ${source} ${value?'drop':''}))`,{threads:true});m.resolveNames();m.validate({threads:true});const body=[...I.inspect(Buffer.from(m.toBinary({}).buffer),0).bodies.values()][0],d=locals(body);m.destroy();return{header:body.subarray(0,d.end),fragment:body.subarray(d.end+(value?5:0),body.length-(value?2:1))};};
   const edits=[],insert=(offset,fragment)=>edits.push({offset,bytes:fragment});let head;
   if(index===6837){assert.equal(P.hash(before),'d751f3f78a4ecde427d812d620b3bdb9fa6876b173a28af3a8409ab1ea42090a');const e=compile(entry());head=e.header;insert(meta.end,e.fragment);
    for(const needle of['41808080800020026a41046a2a0000','41e8086a2a0000']){const n=Buffer.from(needle,'hex'),hits=[];for(let p=-1;(p=before.indexOf(n,p+1))>=0;)hits.push(p+n.length);assert.equal(hits.length,needle.length>20?1:2);for(const p of hits)insert(p,compile(scalarLoad,true).fragment);}
    for(const p of[1478,1570]){assert.equal(before[p],0x38);insert(p,compile(gripStore,true).fragment);}
   }else{const e=compile(set('receiver',u('(local.get 0)',4)));head=e.header;insert(meta.end,e.fragment);
    for(const p of[6573,6774,6817,7865,8066,8109]){assert.equal(before[p-1],0);insert(p,compile(prior,true).fragment);}
    for(const p of[6930,8222]){assert.equal(before[p],0x38);insert(p,compile('(local.tee $rb_value)',true).fragment);insert(p+3,compile(publish()).fragment);}
   }
   edits.sort((a,b)=>a.offset-b.offset);let cursor=meta.end;const parts=[head];for(const e of edits){assert(e.offset>=cursor);parts.push(before.subarray(cursor,e.offset),e.bytes);cursor=e.offset;}parts.push(before.subarray(cursor));const after=Buffer.concat(parts);
   plans.push({index,before,after,plan:{index,kind:'edits',originalHash:P.hash(before),originalLength:before.length,originalLocalsEnd:meta.end,locals:head.toString('base64'),edits:edits.map(e=>({offset:e.offset,needle:'',replacement:e.bytes.toString('base64')})),outputHash:P.hash(after)}});
  }
  return plans;
 }
 function proofSource(){const decl=ints.map(n=>`(local $rb_${n} i32)`).join(' ')+floats.map(n=>`(local $rb_${n} f32)`).join(' ');return`(module (import "env" "memory" (memory 256 65536 shared))
  (func (export "advance") (param $cpu i32) (param $positionFactor f64) ${decl}
   ${set('receiver',u('(local.get 0)',4))}
   (f32.load offset=320 ${u(l('receiver'),0x24)}) ${prior} (local.set $rb_value)
   ;; Controlled native-position provider for receipt tests. The production
   ;; patch retains every original7152 instruction and both x87 store paths.
   (f32.store offset=320 ${u(l('receiver'),0x24)}
    (local.tee $rb_value (f32.demote_f64 (f64.mul (f64.promote_f32 ${l('value')})
      (f64.sub (f64.const 1) (f64.mul (local.get $positionFactor) (f64.sub (f64.const 1) (f64.promote_f32 (f32.load ${c(0x7a1984)})))))))))
   ${publish()}
  ))`;}
 return{build,graph,context,prior,publish,proofSource};
}
module.exports={create};
