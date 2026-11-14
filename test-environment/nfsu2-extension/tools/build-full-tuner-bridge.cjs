'use strict';
// Authored, bounded memory protocol. No native helpers or original game bytes.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),profile=require('../extension/next-profile.js');
const {locals:decodeLocals}=require('./compose-contact-prefixes.cjs');
const C=n=>`(i32.const ${n})`,L=n=>`(local.get $f_${n})`,S=(n,v)=>`(local.set $f_${n} ${v})`,A=(p,n)=>`(i32.add ${p} ${typeof n==='number'?C(n):n})`,R=(p,o=0)=>`(i32.load offset=${o} ${p})`,W=(p,o,x)=>`(i32.store offset=${o} ${p} ${x})`,B=C(0xd0d300),D=C(0x839c40),P=L('pb'),mem=`(i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16))`;
const atomic=o=>`(i32.atomic.load offset=${o} ${B})`,copy=(dst,src,n)=>`(memory.copy ${dst} ${src} ${typeof n==='number'?C(n):n})`;
// Status remains ABI-compatible. Details contain only fixed guard IDs and counts, never pointers.
const fail=(test,code=2,guard=0,observed=C(0))=>`(if ${test} (then ${S('status',C(code))}${code===8?W(B,104,C(guard))+W(B,108,observed):''}(br $guard)))`,ne=(a,b)=>`(i32.ne ${a} ${b})`;
// Guest sources are below the runtime/private tail; widened arithmetic cannot wrap.
const valid=(p,n)=>`(i32.and (i32.ge_u ${p} ${C(65536)}) (i32.and (i64.le_u (i64.add (i64.extend_i32_u ${p}) (i64.extend_i32_u ${typeof n==='number'?C(n):n})) (i64.const 671088640)) (i64.le_u (i64.add (i64.extend_i32_u ${p}) (i64.extend_i32_u ${typeof n==='number'?C(n):n})) ${mem})))`;
let serial=0;const eq=(a,b,n)=>{const label='$eq'+serial++;return `${S('i',C(0))}(loop ${label} ${fail(ne(`(i32.load8_u ${A(a,L('i'))})`,`(i32.load8_u ${A(b,L('i'))})`),3)}${S('i',A(L('i'),1))}(br_if ${label} (i32.lt_u ${L('i')} ${C(n)})))`;};
const range=(p,n,guard=0)=>fail(`(i32.eqz ${valid(p,n)})`,8,guard);
// Exact 93af6ccb mem_window_init (22067), mem_commit (22068): a second
// guest-only span, never the runtime gap. Only snapshot reads use this path;
// the current ride and all Stage/Restore destinations retain their old bounds.
// High sources must lie in the active fixed window and every 16 KiB page must
// be committed. Counts above bound the scan to at most eight pages per source.
const snapshotRange=(p,n,guard)=>`(if (i32.ge_u ${p} ${C(0x50000000)}) (then
 ${fail(`(i32.or ${ne(R(C(0x2974ff60)),C(0x50000000))} ${ne(R(C(0x2974ff64)),C(0x7ffe0000))})`,8,guard)}
 ${fail(`(i32.or (i64.gt_u (i64.add (i64.extend_i32_u ${p}) (i64.extend_i32_u ${n})) (i64.const 2147352576)) (i64.lt_u ${mem} (i64.const 2147352576)))`,8,guard)}
 ${fail(`(i32.and (i64.lt_u (i64.extend_i32_u ${p}) (i64.add (i64.extend_i32_u ${P}) (i64.const 16777216))) (i64.lt_u (i64.extend_i32_u ${P}) (i64.add (i64.extend_i32_u ${p}) (i64.extend_i32_u ${n}))))`,8,guard)}
 ${S('i',`(i32.shr_u ${p} ${C(14)})`)}${S('cursor',`(i32.shr_u (i32.sub (i32.add ${p} ${n}) ${C(1)}) ${C(14)})`)}
 (loop $committed${guard}
  ${fail(`(i32.eqz (i32.and (i32.load8_u ${A(C(0x29747f60),`(i32.shr_u ${L('i')} ${C(3)})`)}) (i32.shl ${C(1)} (i32.and ${L('i')} ${C(7)}))))`,8,guard)}
  ${S('i',A(L('i'),1))}(br_if $committed${guard} (i32.le_u ${L('i')} ${L('cursor')})))
 ) (else ${range(p,n,guard)}))`;
const screen='UI_PerformanceDyno_MAIN.fng\0';
const names=['pb','seq','cmd','status','ptr','record','tune','mode','parts','ride','car','visit','i','j','ready','carType','stock','rules','ruleCount','extra','extraCount','curve','curveCount','cursor',...Array.from({length:82},(_,i)=>'c'+i)];
const refresh=`${W(P,16,L('record'))}${W(P,20,L('tune'))}${W(P,24,L('mode'))}${W(P,28,L('parts'))}${W(P,32,L('ride'))}${copy(A(P,256),A(L('tune'),20),41)}${copy(A(P,304),L('visit'),41)}${copy(A(P,352),L('parts'),148)}${copy(A(P,624),A(L('record'),0x360),205)}${copy(A(P,832),A(D,0x904),205)}
${S('ready',C(1))}${S('i',C(0))}(loop $readiness (if (i32.ne (i32.div_u ${L('i')} ${C(41)}) ${L('mode')}) (then (if ${ne(`(i32.load8_u ${A(A(D,0x904),L('i'))})`,`(i32.load8_u ${A(A(L('record'),0x360),L('i'))})`)} (then ${S('ready',C(0))}))))${S('i',A(L('i'),1))}(br_if $readiness (i32.lt_u ${L('i')} ${C(205)})))${W(P,68,L('ready'))}`;
const sources=[{p:C(0x400000),n:C(0x900000)},{p:L('ride'),n:C(0x8f0)},{p:L('stock'),n:C(46*0x890)},{p:L('rules'),n:`(i32.mul ${L('ruleCount')} ${C(24)})`},{p:L('extra'),n:`(i32.mul ${L('extraCount')} ${C(0x17c)})`},{p:L('curve'),n:`(i32.mul ${L('curveCount')} ${C(4)})`}];
const body=`(block $fullDone
 (br_if $fullDone (i64.gt_u (i64.add (i64.extend_i32_u (local.get $cpu)) (i64.const 344)) ${mem}))
 ${S('ptr',R('(local.get $cpu)',16))}(br_if $fullDone (i32.eqz ${valid(L('ptr'),4)}))
 (br_if $fullDone ${ne(R(L('ptr')),C(0x581475))})
 (br_if $fullDone ${ne(R(B),C(0x384e5944))})
 ${S('cmd',R(B,8))}(br_if $fullDone (i32.or (i32.lt_u ${L('cmd')} ${C(16)}) (i32.gt_u ${L('cmd')} ${C(19)})))
 ${S('seq',atomic(4))}(br_if $fullDone (i32.or (i32.eqz ${L('seq')}) (i32.or (i32.and ${L('seq')} ${C(1)}) (i32.eq ${L('seq')} ${atomic(36)}))))
 ${S('status',C(2))}${W(B,104,C(0))}${W(B,108,C(0))}
 (block $guard
 ${fail(ne(atomic(12),C(1)),1)}
 ${S('pb',R(B,96))}
 ${fail(`(i32.or (i32.lt_u ${P} ${C(0x40000000)}) (i32.or (i32.and ${P} ${C(65535)}) (i64.gt_u (i64.add (i64.extend_i32_u ${P}) (i64.const 16777216)) ${mem})))`,8,1)}
 ${fail(ne(R(P),C(0x3154464e)),8,2)}${fail(ne(R(P,4),C(1)),8,3)}${fail(ne(R(P,8),C(0x1000000)),8,4)}
 ${fail(`(i32.and (i32.ne ${R(B,100)} ${C(0)}) ${ne(R(B,100),P)})`,8,5)}
 ${W(B,100,P)}
 ${fail(ne(`(i32.load8_u ${A(D,0xb64)})`,C(1)))}${fail(ne(R(C(0xd00030)),C(1)))}
 ${fail(`(i32.and ${R(C(0x850078))} ${C(520)})`)}${fail(R(C(0x866a14)))}${fail(R(C(0x8669f4)))}${fail(`(i32.load8_u ${C(0x89cf69)})`)}
 ${S('ptr',R(C(0x8384c4)))}${range(L('ptr'),12,10)}${S('ptr',R(L('ptr'),8))}${range(L('ptr'),232,10)}${S('ptr',R(L('ptr'),228))}${range(L('ptr'),16,10)}${S('ptr',R(L('ptr'),12))}${range(L('ptr'),screen.length,10)}
 ${Array.from(screen,(c,i)=>fail(ne(`(i32.load8_u offset=${i} ${L('ptr')})`,C(c.charCodeAt(0))))).join('')}
 ${S('record',R(D))}${range(L('record'),0x42f,11)}${S('tune',R(D,0x900))}${range(L('tune'),0xe8,12)}${S('mode',R(D,0x9fc))}${fail(`(i32.gt_u ${L('mode')} ${C(4)})`)}${fail(R(D,0xa0c))}
 ${S('ptr',R(C(0xd00000)))}${range(L('ptr'),8,13)}${S('car',R(L('ptr'),4))}${range(L('car'),24,14)}${S('ride',R(L('car'),16))}${range(L('ride'),0x8f0,15)}
 ${fail(ne(L('tune'),A(L('ride'),0x384)))}${S('parts',R(L('tune'),8))}${fail(ne(L('parts'),A(L('ride'),0x2f0)))}${fail(ne(R(L('tune'),12),A(L('ride'),0x40)))}
 ${S('visit',A(A(D,0x904),`(i32.mul ${L('mode')} ${C(41)})`))}
 ;; A native RideInfo may be embedded in one of 22 static RacerInfo slots.
 ;; Exact 93af6ccb: RaceParams ctor 0x5ed5f0, AddRacer 0x601600,
 ;; Car ctor 0x604260 and SetRideInfo 0x601110. Never admit arbitrary image data.
 (if (i32.lt_u ${L('ride')} ${C(0xd10000)}) (then
 ${fail(`(i32.or (i32.lt_u ${L('ride')} ${C(0x890170)}) (i32.gt_u ${L('ride')} ${C(0x89c3b0)}))`,8,20)}
 ${S('cursor',`(i32.sub ${L('ride')} ${C(0x890170)})`)}
 ${fail(`(i32.rem_u ${L('cursor')} ${C(0x940)})`,8,20)}
 ${fail(ne(R(C(0x89e810)),C(0x890160)),8,20)}
 ${fail(`(i32.or (i32.gt_u ${R(C(0x89e814))} ${C(22)}) (i32.ge_u (i32.div_u ${L('cursor')} ${C(0x940)}) ${R(C(0x89e814))}))`,8,20)}
 ${fail(ne(R(L('car'),20),`(i32.sub ${L('ride')} ${C(16)})`),8,20)}
 ${fail(ne(R(`(i32.sub ${L('ride')} ${C(12)})`),C(1)),8,20)}
 ))
 ;; Retain destination aliases with saved records, runtime CPU, car and player.
 ${fail(`(i32.and (i32.lt_u ${L('record')} ${A(L('ride'),0x8f0)}) (i32.lt_u ${L('ride')} ${A(L('record'),0x42f)}))`,8,21)}
 ${fail(`(i32.and (i32.lt_u (local.get $cpu) ${A(L('ride'),0x8f0)}) (i32.lt_u ${L('ride')} ${A('(local.get $cpu)',344)}))`,8,22)}
 ${['car','ptr'].map(n=>fail(`(i32.and (i32.lt_u ${L(n)} ${A(L('ride'),0x8f0)}) (i32.lt_u ${L('ride')} ${A(L(n),32)}))`,8,n==='car'?23:24)).join('')}
 (if (i32.eq ${L('cmd')} ${C(16)}) (then
 ${S('carType',R(L('tune')))}${fail(`(i32.ge_u ${L('carType')} ${C(46)})`)}${fail(R(L('tune'),0xe4))}
 ${fail(`(i32.or (i32.lt_u ${R(L('ride'),0x208)} ${C(1)}) (i32.gt_u ${R(L('ride'),0x208)} ${C(6)}))`)}
 ${fail(`(i32.eqz (i32.and (f32.ge (f32.load offset=560 ${L('ride')}) (f32.const 100)) (i32.and (f32.lt (f32.load offset=568 ${L('ride')}) (f32.const 30000)) (f32.gt (f32.load offset=568 ${L('ride')}) (f32.load offset=560 ${L('ride')})))))`)}
 ${S('stock',R(C(0x8a1ccc)))}${S('rules',R(C(0x86b340)))}${S('ruleCount',R(C(0x86b344)))}${fail(`(i32.gt_u ${L('ruleCount')} ${C(256)})`,8,30,L('ruleCount'))}
 ${S('extra',R(C(0x8383f8)))}${S('extraCount',R(C(0x8383fc)))}${fail(`(i32.gt_u ${L('extraCount')} ${C(256)})`,8,31,L('extraCount'))}
 ${S('curve',R(L('ride'),0x57c))}${S('curveCount',R(L('ride'),0x56c))}${fail(`(i32.or (i32.lt_u ${L('curveCount')} ${C(2)}) (i32.gt_u ${L('curveCount')} ${C(512)}))`,8,32,L('curveCount'))}
 ${sources.map(({p,n},i)=>`(if ${n} (then ${i>=2?snapshotRange(p,n,40+i):range(p,n,40+i)}))`).join('')}
 ${sources.slice(1).flatMap((a,i)=>sources.slice(i+2).map((b,j)=>{const overlap=`(i32.and (i32.and (i32.ne ${a.n} ${C(0)}) (i32.ne ${b.n} ${C(0)})) (i32.and (i32.lt_u ${a.p} ${A(b.p,b.n)}) (i32.lt_u ${b.p} ${A(a.p,a.n)})))`;return fail(i===0&&b.p===L('curve')?`(i32.and ${overlap} (i32.eqz (i32.and (i32.ge_u ${b.p} ${a.p}) (i32.le_u ${A(b.p,b.n)} ${A(a.p,a.n)}))))`:overlap,8,50,C((i+1)*10+i+j+2));})).join('')}
 ${fail(`(i32.and (i32.lt_u ${L('curve')} ${A(L('parts'),148)}) (i32.lt_u ${L('parts')} ${A(L('curve'),`(i32.mul ${L('curveCount')} ${C(4)})`)}))`,8,60)}
 ${S('i',C(0))}(block $extraCountsDone (br_if $extraCountsDone (i32.eqz ${L('extraCount')}))(loop $extraCounts ${fail(`(i32.gt_u ${R(A(L('extra'),`(i32.mul ${L('i')} ${C(380)})`),8)} ${C(4)})`,8,70,R(A(L('extra'),`(i32.mul ${L('i')} ${C(380)})`),8))}${S('i',A(L('i'),1))}(br_if $extraCounts (i32.lt_u ${L('i')} ${L('extraCount')}))))
 ${S('i',C(0))}(loop $extras
 ${S('ptr',R(A(C(0x837b90),`(i32.mul ${L('i')} ${C(4)})`)))}
 (if ${L('ptr')} (then
 ${fail(`(i32.or (i32.eqz ${L('extraCount')}) (i32.or (i32.lt_u ${L('ptr')} ${L('extra')}) (i64.gt_u (i64.add (i64.extend_i32_u ${L('ptr')}) (i64.const 92)) (i64.add (i64.extend_i32_u ${L('extra')}) (i64.extend_i32_u (i32.mul ${L('extraCount')} ${C(380)}))))))`,8,71)}
 ${S('j',`(i32.rem_u (i32.sub ${L('ptr')} ${L('extra')}) ${C(380)})`)}
 ${fail(`(i32.or (i32.lt_u ${L('j')} ${C(12)}) (i32.rem_u (i32.sub ${L('j')} ${C(12)}) ${C(92)}))`,8,72)}
 ${S('cursor',`(i32.sub ${L('ptr')} ${L('j')})`)}
 ${fail(`(i32.ge_u (i32.div_u (i32.sub ${L('j')} ${C(12)}) ${C(92)}) ${R(L('cursor'),8)})`,8,73)}
 ${fail(ne(R(L('ptr')),L('i')),8,74)}
 ))${S('i',A(L('i'),1))}(br_if $extras (i32.lt_u ${L('i')} ${C(68)})))
 ${fail(ne(atomic(4),L('seq')),1)}${fail(ne(atomic(12),C(1)),1)}
 ${W(P,36,L('carType'))}${W(P,40,L('stock'))}${W(P,44,L('rules'))}${W(P,48,L('ruleCount'))}${W(P,52,L('extra'))}${W(P,56,L('extraCount'))}${W(P,60,L('curve'))}${W(P,64,L('curveCount'))}${W(P,120,C(6))}${S('cursor',C(4096))}
 ${sources.map(({p,n},i)=>`${W(P,128+i*16,p)}${W(P,132+i*16,L('cursor'))}${W(P,136+i*16,n)}${W(P,140+i*16,C(1))}(if ${n} (then ${copy(A(P,L('cursor')),p,n)}))${S('cursor',A(L('cursor'),n))}`).join('')}${W(P,72,L('cursor'))}
 ))
 (if (i32.or (i32.eq ${L('cmd')} ${C(17)}) (i32.eq ${L('cmd')} ${C(18)})) (then
 ${[16,20,24,28,32].map((o,i)=>fail(ne(R(P,o),L(['record','tune','mode','parts','ride'][i])),3)).join('')}
 ${eq(A(L('tune'),20),A(P,256),41)}${eq(L('visit'),A(P,304),41)}${eq(L('parts'),A(P,352),148)}${eq(A(L('record'),0x360),A(P,624),205)}
 ${Array.from({length:82},(_,i)=>`${S('c'+i,`(i32.load8_u ${A(P,(i<41?512:560)+i%41)})`)}${fail(`(i32.gt_u ${L('c'+i)} ${C(200)})`,4)}`).join('')}
 ${fail(ne(atomic(4),L('seq')),1)}${fail(ne(atomic(12),C(1)),1)}
 ${Array.from({length:82},(_,i)=>`(i32.store8 offset=${i%41} ${i<41?A(L('tune'),20):L('visit')} ${L('c'+i)})`).join('')}
 ))
 (if (i32.or (i32.eq ${L('cmd')} ${C(16)}) (i32.eq ${L('cmd')} ${C(19)})) (then ${fail(ne(atomic(4),L('seq')),1)}${fail(ne(atomic(12),C(1)),1)}))
 ${refresh}${S('status',C(0))}
 )
 ${W(B,40,L('status'))}(i32.atomic.store offset=36 ${B} ${L('seq')})
)`;
(async()=>{
 assert.equal(profile.revision,'93af6ccb');const old=decodeLocals(profile.fullTuner?.baseBridge||profile.bridge);assert.equal(old.types.length,64);
 const type={127:'i32',126:'i64',125:'f32',124:'f64',123:'v128'};
 const declared=old.types.map(t=>`(local ${type[t]})`).join(' ')+names.map(n=>`(local $f_${n} i32)`).join(' ');
 const src=`(module (import "env" "memory" (memory 256 65536 shared)) (func (export "step") (param $cpu i32) ${declared} ${body}))`;
 const wabt=await require(process.env.WABT_MODULE||path.join(root,'research/compatibility-v011/node_modules/wabt'))();const m=wabt.parseWat('full-tuner-prefix.wat',src,{threads:true,bulk_memory:true,simd:true});m.resolveNames();m.validate({threads:true,bulk_memory:true,simd:true});const bin=Buffer.from(m.toBinary({}).buffer);
 let p=8,raw;const u=()=>{let n=0,s=0,x;do{x=bin[p++];n|=(x&127)<<s;s+=7}while(x&128);return n>>>0;};while(p<bin.length){const id=bin[p++],len=u(),end=p+len;if(id===10){assert.equal(u(),1);const size=u();const start=p;raw=[...bin.subarray(start,start+size)];break;}p=end;}
 const hdr=decodeLocals(raw);assert.deepEqual(hdr.types.slice(0,64),old.types);assert.equal(raw.at(-1),11);
 const out={revision:profile.revision,base:0xd0d300,magic:0x3154464e,version:1,oldLocals:64,totalLocals:hdr.types.length,newheader:raw.slice(0,hdr.end),code:raw.slice(hdr.end,-1)};
 fs.writeFileSync(path.join(root,'tools/full-tuner-prefix.json'),JSON.stringify(out)+'\n');fs.writeFileSync(path.join(root,'tests/full-tuner-bridge.wasm'),bin);fs.writeFileSync(path.join(root,'tests/full-tuner-bridge.wat'),src);console.log(JSON.stringify({bytes:bin.length,totalLocals:out.totalLocals}));m.destroy();
})().catch(e=>{console.error(e);process.exitCode=1});
