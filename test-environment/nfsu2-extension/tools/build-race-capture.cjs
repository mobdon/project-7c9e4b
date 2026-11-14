'use strict';
// Emits authored observer instructions only. No native game bodies are embedded.
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),B=0xd0d800,MAGIC=0x31504752,BYTES=2048,CBITS=695500640;
const C=n=>`(i32.const ${n})`,L=n=>`(local.get $c_${n})`,S=(n,v)=>`(local.set $c_${n} ${v})`,A=(p,n)=>`(i32.add ${typeof p==='number'?C(p):p} ${typeof n==='number'?C(n):n})`,R=(p,n=0)=>`(i32.load offset=${n} ${typeof p==='number'?C(p):p})`,W=(o,v)=>`(i32.store offset=${o} ${C(B)} ${v})`;
const atom=o=>`(i32.atomic.load offset=${o} ${C(B)})`;
const names=['route','seq','status','player','car','driver','race','track','reverse','count','corners','i','ptr','cursor','end','mask','idx','tick','j','fresh','stack','clock','event','eventHash','starts','trackInfo','region','heat','heatCount','heatIndex','regionTail'];
function range(p,n,label='reject',allowMailbox=false){return `${S('cursor',p)}${S('end',A(p,n))}
 (br_if $${label} (i32.or (i32.lt_u ${L('cursor')} ${C(65536)}) (i32.or (i32.gt_u ${L('end')} ${C(0x28000000)}) (i32.lt_u ${L('end')} ${L('cursor')}))))
 ${allowMailbox?'':`(br_if $${label} (i32.and (i32.lt_u ${L('cursor')} ${C(B+BYTES)}) (i32.gt_u ${L('end')} ${C(B)})))`}
 ${S('cursor',`(i32.and ${L('cursor')} ${C(-16384)})`)}
 (loop $pages
  (br_if $${label} (i32.eqz (i32.and (i32.shr_u (i32.load8_u ${A(CBITS,`(i32.shr_u ${L('cursor')} ${C(17)})`)}) (i32.and (i32.shr_u ${L('cursor')} ${C(14)}) ${C(7)})) ${C(1)})))
  ${S('cursor',A(L('cursor'),16384))}(br_if $pages (i32.lt_u ${L('cursor')} ${L('end')})))`;}
function reject(expr,code){return `(if ${expr} (then ${S('status',C(code))}(br $reject)))`;}
const ne=(a,b)=>`(i32.ne ${a} ${b})`;
const body=`(block $captureDone
 (br_if $captureDone (i64.lt_u (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const ${CBITS+32768})))
 ${range(C(B),BYTES,'captureDone',true)}
 (br_if $captureDone ${ne(R(B),C(MAGIC))})(br_if $captureDone ${ne(R(B,4),C(1))})
 (br_if $captureDone ${ne(atom(12),C(1))})
 ${S('seq',atom(8))}(br_if $captureDone (i32.or (i32.eqz ${L('seq')}) (i32.or (i32.and ${L('seq')} ${C(1)}) (i32.eq ${L('seq')} ${atom(16)}))))
 ;; Ignore opponents/ancillary routes; they must not consume the owned request.
 (br_if $captureDone ${ne(L('route'),R(B,44))})
 ${S('status',C(1))}
 (block $reject
  ${[[0x8654a4,4],[0xd00000,0x34],[0x89cf69,1],[0x89e7a0,0x3a],[0x850078,4],[0x8669f4,0x24],[0x890104,0x18],[0x86518c,4],[0x86346c,8],[0x883dac,4]].map(([p,n])=>range(C(p),n)).join('\n')}
  ${reject(ne(R('(local.get $cpu)',32),C(0x4281ba)),2)}
  ${reject(ne(R('(local.get $cpu)',16),A(L('stack'),8)),2)}
  ${range(L('stack'),8)}
  ${reject(ne(R(0x8654a4),C(6)),3)}${reject(ne(R(0xd00030),C(1)),3)}${reject(ne(R(0x89e7b0),C(1)),3)}
  ${reject(`(i32.or (i32.and ${R(0x850078)} ${C(520)}) (i32.or ${R(0x866a14)} (i32.or ${R(0x8669f4)} (i32.load8_u ${C(0x89cf69)}))))`,4)}
  ${reject(`(i32.or (i32.load8_u ${C(0x89e7d8)}) (i32.or (i32.load8_u ${C(0x89e7d9)}) (i32.or ${R(0x890108)} (i32.or ${R(0x890104)} ${R(0x890114)}))))`,5)}
  ${S('tick',R(0x86518c))}${reject(`(i32.gt_u (i32.sub ${L('tick')} ${R(B,60)}) ${C(8000)})`,6)}
  ${S('track',R(0x89e7a0))}${S('reverse',R(0x89e7a4))}
  ${reject(`(i32.or ${ne(L('track'),R(B,52))} ${ne(L('reverse'),R(B,56))})`,7)}
  ${S('event',R(0x863470))}${S('starts',R(0x86346c))}${S('eventHash',C(0))}${S('heat',C(0))}${S('heatCount',C(0))}${S('heatIndex',C(-1))}
  ${reject(`(i32.or (i32.lt_u ${L('track')} ${C(1)}) (i32.or (i32.gt_u ${L('track')} ${C(65535)}) (i32.gt_u ${L('reverse')} ${C(1)})))`,7)}
  ${S('trackInfo',R(0x883dac))}${range(L('trackInfo'),0x8c)}${reject(ne(`(i32.load16_u offset=138 ${L('trackInfo')})`,L('track')),7)}${S('region',R(L('trackInfo'),0x40))}${S('regionTail',R(L('trackInfo'),0x44))}
  (if ${L('event')} (then
   ${range(L('event'),0x88)}${S('eventHash',R(L('event'),8))}${reject(`(i32.eqz ${L('eventHash')})`,7)}
   ${range(C(0x85ef48),8)}${S('heat',R(0x85ef48))}${S('heatCount',R(0x85ef4c))}${reject(ne(L('heatCount'),`(i32.load8_s offset=126 ${L('event')})`),7)}
   ${reject(`(i32.or (i32.lt_u ${L('heatCount')} ${C(1)}) (i32.or (i32.gt_u ${L('heatCount')} ${C(4)}) (i32.lt_u ${L('heat')} ${C(0x85bab8)})))`,7)}
   ${S('heatIndex',`(i32.sub ${L('heat')} ${C(0x85bab8)})`)}
   ${reject(`(i32.ne (i32.rem_u ${L('heatIndex')} ${C(0xd24)}) ${C(0)})`,7)}
   ${S('heatIndex',`(i32.div_u ${L('heatIndex')} ${C(0xd24)})`)}${reject(`(i32.ge_u ${L('heatIndex')} ${L('heatCount')})`,7)}
   ${range(L('heat'),12)}${reject(`(i32.or ${ne(R(L('heat')),L('track'))} ${ne(R(L('heat'),4),L('reverse'))})`,7)}
   ${S('ptr',A(A(L('event'),0x18),`(i32.mul ${L('heatIndex')} ${C(4)})`))}
   ${reject(`(i32.or ${ne(`(i32.load16_s ${L('ptr')})`,L('track'))} ${ne(`(i32.and (i32.load8_u offset=2 ${L('ptr')}) ${C(1)})`,L('reverse'))})`,7)}
   ${reject(ne(`(i32.load8_s offset=3 ${L('ptr')})`,R(L('heat'),8)),7)}
  ))
  ${[[1408,'event'],[1412,'eventHash'],[1416,'starts'],[1420,'trackInfo'],[1424,'region'],[1428,'heat'],[1432,'heatCount'],[1436,'heatIndex'],[1472,'regionTail']].map(([o,k])=>reject(ne(L(k),R(B,o)),7)).join('')}
  ${S('player',R(0xd00000))}${range(L('player'),20)}
  ${reject(`(i32.or ${ne(L('player'),R(B,32))} ${R(L('player'),16)})`,8)}
  ${S('car',R(L('player'),4))}${range(L('car'),48)}
  ${reject(`(i32.or ${ne(L('car'),R(B,36))} ${ne(R(L('car'),36),C(3))})`,8)}
  ${reject(ne(R(L('stack'),4),L('car')),8)}
  ${S('driver',R(L('car'),44))}${range(L('driver'),0x6ec)}
  ${reject(`(i32.or ${ne(L('driver'),R(B,40))} (i32.or ${ne(R(L('driver'),4),L('car'))} (i32.or ${ne(R(L('driver'),0x6e8),L('route'))} ${ne(A(L('driver'),0x370),L('route'))})))`,8)}
  ${S('race',R(0x890118))}${range(L('race'),0x18)}
  ${reject(`(i32.or ${ne(L('race'),R(B,48))} ${ne(R(L('race')),C(4))})`,9)}
  ${S('clock',R(L('race'),0x14))}${reject(`(i32.gt_u (i32.sub ${L('clock')} ${R(B,124)}) ${C(8000)})`,7)}
  ${range(L('route'),0x354)}
  ${S('count',R(L('route'),4))}${S('corners',R(L('route'),0xd0))}
  ${reject(`(i32.or (i32.gt_u ${L('count')} ${C(40)}) (i32.gt_u ${L('corners')} ${C(5)}))`,10)}
  ;; Validate all node ranges before touching output records. Byte copies do
  ;; not invoke game code and cannot alter x87, native registers or controls.
  ${S('i',C(0))}(block $nodesChecked (br_if $nodesChecked (i32.eqz ${L('count')}))
   (loop $nodeRanges ${S('ptr',R(A(L('route'),`(i32.mul ${L('i')} ${C(4)})`),8))}${range(L('ptr'),0x60)}
    ${S('i',A(L('i'),1))}(br_if $nodeRanges (i32.lt_u ${L('i')} ${L('count')}))))
  ${reject(ne(L('seq'),atom(8)),11)}${reject(ne(atom(12),C(1)),11)}
  ${W(64,L('player'))}${W(68,L('car'))}${W(72,L('driver'))}${W(76,L('route'))}${W(80,L('race'))}${W(84,L('track'))}${W(88,L('reverse'))}${W(92,L('tick'))}${W(96,L('count'))}${W(100,L('corners'))}${W(104,L('clock'))}${[[1440,'event'],[1444,'eventHash'],[1448,'starts'],[1452,'trackInfo'],[1456,'region'],[1460,'heat'],[1464,'heatCount'],[1468,'heatIndex'],[1476,'regionTail']].map(([o,k])=>W(o,L(k))).join('')}
  ${S('i',C(0))}(block $nodesDone (br_if $nodesDone (i32.eqz ${L('count')}))
   (loop $nodes ${S('ptr',R(A(L('route'),`(i32.mul ${L('i')} ${C(4)})`),8))}
    (i32.store ${A(B+128,`(i32.mul ${L('i')} ${C(16)})`)} ${L('ptr')})
    (i32.store offset=4 ${A(B+128,`(i32.mul ${L('i')} ${C(16)})`)} ${R(L('ptr'),0x54)})
    (i32.store offset=8 ${A(B+128,`(i32.mul ${L('i')} ${C(16)})`)} ${R(L('ptr'),0x40)})
    (i32.store offset=12 ${A(B+128,`(i32.mul ${L('i')} ${C(16)})`)} ${L('i')})
    ${S('i',A(L('i'),1))}(br_if $nodes (i32.lt_u ${L('i')} ${L('count')}))))
  ${S('mask',C(0))}${S('i',C(0))}(block $cornersDone (br_if $cornersDone (i32.eqz ${L('corners')}))
   (loop $corners ${S('ptr',A(A(L('route'),0xd4),`(i32.mul ${L('i')} ${C(128)})`))}
    (memory.copy ${A(B+768,`(i32.mul ${L('i')} ${C(128)})`)} ${L('ptr')} ${C(128)})
    ${S('idx',`(i32.load8_s offset=116 ${L('ptr')})`)}
    ${S('fresh',C(1))}${S('j',C(0))}
    (loop $freshMarkers
     ${S('cursor',`(i32.load8_s ${A(A(L('ptr'),117),L('j'))})`)}
     (if (i32.or (i32.lt_s ${L('cursor')} ${C(0)}) (i32.ge_u ${L('cursor')} ${L('count')})) (then ${S('fresh',C(0))}))
     ${S('j',A(L('j'),1))}(br_if $freshMarkers (i32.lt_u ${L('j')} ${C(8)})))
    (if (i32.and ${L('fresh')} (i32.and (i32.ge_s ${L('idx')} ${C(-1)}) (i32.le_s ${L('idx')} (i32.sub ${L('count')} ${C(2)}))))
     (then ${S('mask',`(i32.or ${L('mask')} (i32.shl ${C(1)} ${L('i')}))`)}))
    ${S('i',A(L('i'),1))}(br_if $corners (i32.lt_u ${L('i')} ${L('corners')}))))
  ${W(112,L('mask'))}${W(120,L('seq'))}${S('status',C(0))}
 )
 ${W(20,L('status'))}
 ;; Ack is the release publication. Page never reads a pending payload.
 (i32.atomic.store offset=16 ${C(B)} ${L('seq')})
)`;
(async()=>{
 const evidence=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/race-capture-evidence.json')));
 const type={127:'i32',126:'i64',125:'f32',124:'f64',123:'v128'};
 const original=evidence.originalTypes.map(t=>`(local ${typeof t==='string'?t:type[t]})`).join(' '),newLocals=names.map(n=>`(local $c_${n} i32)`).join(' ');
 const wabt=await require(process.env.WABT_MODULE||path.resolve(ROOT,'../research/compatibility-v011/node_modules/wabt'))();
 const compile=code=>{const m=wabt.parseWat('authored-route-observer.wat',`(module (import "env" "memory" (memory 256 65536 shared)) (func (export "step") (param $cpu i32) ${original} ${newLocals} ${code}))`,{threads:true,bulk_memory:true,simd:true});m.resolveNames();m.validate({threads:true,bulk_memory:true,simd:true});return Buffer.from(m.toBinary({}).buffer);};
 const {parse}=require('./race-capture-wasm.cjs');
 const pre=parse(compile(S('route',R('(local.get $cpu)',4))+S('stack',R('(local.get $cpu)',16)))).bodies[0],post=parse(compile(body)).bodies[0];
 const config={...evidence,base:B,magic:MAGIC,bytes:BYTES,cbits:CBITS,pre:[...pre],post:[...post],totalLocals:evidence.originalTypes.length+names.length};
 fs.writeFileSync(path.join(ROOT,'tools/race-capture-observer.wat'),`;; Authored observer only\n${body}\n`);
 fs.writeFileSync(path.join(ROOT,'extension/race-capture-config.js'),`/* Authored read-only capture observer, exact build only. */\n(function(root){'use strict';const value=${JSON.stringify(config)};root.__NFSU2_RACE_CAPTURE_CONFIG__=value;if(typeof module==='object'&&module.exports)module.exports=value;})(globalThis);\n`);
 fs.writeFileSync(path.join(ROOT,'tests/race-capture-observer.wasm'),compile(S('route',R('(local.get $cpu)',4))+S('stack',`(i32.sub ${R('(local.get $cpu)',16)} ${C(8)})`)+body));
 console.log(JSON.stringify({authoredPreBytes:pre.length,authoredPostBytes:post.length,totalLocals:config.totalLocals}));
})().catch(e=>{console.error(e);process.exit(1)});
