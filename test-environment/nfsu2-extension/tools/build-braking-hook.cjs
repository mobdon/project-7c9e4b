/* Authored pre/post hook only. Keep the original grade getter instructions intact.
 * Scope: owned solo road-race main-route planner and its backward propagation. */
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),A=0xd0d100,B=0xd0d200,magic=0x33524e43;
const factory=require(process.env.WABT_MODULE||path.resolve(root,'../research/compatibility-v011/node_modules/wabt'));
const js=fs.readFileSync(path.join(root,'extension/ai.js'),'utf8'),M=Number(js.match(/const BASE=0xd0d100, MAGIC=(0x[0-9a-f]+)/i)[1]);
const G=p=>`(i32.load (i32.const ${p}))`,a=o=>G(A+o),b=o=>G(B+o);
const valid=(v,n=4096)=>`(i32.and (i32.ge_u ${v} (i32.const 65536)) (i32.and (i32.le_u ${v} (i32.const ${0x28000000-n})) (i64.le_u (i64.extend_i32_u ${v}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const ${n})))))`;
const originals=Array(6).fill('i32'),names=['eligible','seq','sp','caller','car','player','driver','route','race','percent','braking','slot'];
const locals=originals.map((t,i)=>`(local $old${i+1} ${t})`).join(' ')+' '+names.map(n=>`(local $${n} i32)`).join(' ')+' (local $pace f64) (local $native f64)';
const pre=`(block $skip
 (br_if $skip (i32.ne ${a(0)} (i32.const ${M})))
 (br_if $skip (i32.ne ${a(28)} (i32.const ${M})))
 (br_if $skip (i32.ne ${b(0)} (i32.const ${magic})))
 (br_if $skip (i32.eqz (i32.or (i32.eq ${b(4)} (i32.const 2)) (i32.eq ${b(4)} (i32.const 3)))))
 (if (i32.eq ${b(4)} (i32.const 3)) (then
  (br_if $skip (i32.load8_u (i32.const 0x89e7e3)))
  (br_if $skip ${G(0x89010c)})
  (br_if $skip (i32.and (i32.eq ${G(0x850088)} (i32.const 10)) (i32.ne (i32.or (i32.and ${G(0x850078)} (i32.const 520)) (i32.or ${G(0x866a14)} (i32.or ${G(0x8669f4)} (i32.load8_u (i32.const 0x89cf69))))) (i32.const 0))))))
 (local.set $seq ${a(4)})
 (br_if $skip (i32.and (local.get $seq) (i32.const 1)))
 (br_if $skip (i32.ge_u ${a(48)} (i32.const 180)))
 (br_if $skip (i32.ne ${a(8)} (i32.const 1)))
 (br_if $skip (i32.ne ${G(0x89e7b0)} (i32.const 1)))
 (br_if $skip (i32.ne ${a(52)} (i32.const 1)))
 (br_if $skip (i32.ne ${G(0x8654a4)} (i32.const 6)))
 (br_if $skip (i32.ne ${G(0xd00030)} (i32.const 1)))
 (br_if $skip (i32.load8_u (i32.const 0x89e7d8)))
 (br_if $skip (i32.load8_u (i32.const 0x89e7d9)))
 (br_if $skip ${G(0x890104)}) (br_if $skip ${G(0x890108)}) (br_if $skip ${G(0x890114)})
 ;; Same owned local route in solo or explicitly opted-in network play.
 ;; Native network state and all foreign-car / route guards stay unchanged.
 (if (i32.ne ${a(84)} (i32.const 1)) (then
  (br_if $skip (i32.and ${G(0x850078)} (i32.const 520)))
  (br_if $skip ${G(0x866a14)}) (br_if $skip ${G(0x8669f4)})
  (br_if $skip (i32.load8_u (i32.const 0x89cf69)))))
 (local.set $sp (i32.load offset=16 (local.get $cpu)))
 (br_if $skip (i32.eqz ${valid('(local.get $sp)',56)}))
 (local.set $caller (i32.load (local.get $sp)))
 (br_if $skip (i32.eqz (i32.or (i32.eq (local.get $caller) (i32.const 0x4227a1)) (i32.eq (local.get $caller) (i32.const 0x40a723)))))
 (local.set $car (i32.load offset=4 (local.get $sp)))
 (br_if $skip (i32.eqz ${valid('(local.get $car)')}))
 (br_if $skip (i32.ne (local.get $car) ${a(36)}))
 (br_if $skip (i32.ne (local.get $car) ${a(16)}))
 (br_if $skip (i32.ne (i32.load offset=36 (local.get $car)) (i32.const 3)))
 (if (i32.eq (local.get $caller) (i32.const 0x4227a1)) (then
  (br_if $skip (i32.ne (i32.load offset=12 (local.get $cpu)) (local.get $car)))
  (local.set $route (i32.load offset=24 (local.get $cpu)))) (else
  ;; At getter entry, propagation's outer return is SP+40. Only backward
  ;; direction0 from the corner planner is eligible; exit acceleration is native.
  (br_if $skip (i32.ne (i32.load offset=40 (local.get $sp)) (i32.const 0x422b2e)))
  (br_if $skip (i32.and (i32.load offset=12 (local.get $cpu)) (i32.const 255)))
  (br_if $skip (i32.load offset=48 (local.get $sp)))
  (br_if $skip (i32.ne (i32.load offset=52 (local.get $sp)) (local.get $car)))
  (local.set $route (i32.load offset=20 (local.get $cpu)))))
 (local.set $player ${G(0xd00000)})
 (br_if $skip (i32.eqz ${valid('(local.get $player)')}))
 (br_if $skip (i32.ne (local.get $player) ${a(32)}))
 (br_if $skip (i32.ne (local.get $player) ${a(12)}))
 (br_if $skip (i32.ne (i32.load offset=4 (local.get $player)) (local.get $car)))
 (br_if $skip (i32.load offset=16 (local.get $player)))
 (local.set $driver (i32.load offset=44 (local.get $car)))
 (br_if $skip (i32.eqz ${valid('(local.get $driver)')}))
 (br_if $skip (i32.ne (i32.load offset=4 (local.get $driver)) (local.get $car)))
 (br_if $skip (i32.ne (local.get $route) (i32.load offset=1768 (local.get $driver))))
 (br_if $skip (i32.ne (local.get $route) (i32.add (local.get $driver) (i32.const 880))))
 (local.set $race ${G(0x890118)})
 (br_if $skip (i32.eqz ${valid('(local.get $race)')}))
 (br_if $skip (i32.ne (local.get $race) ${a(40)}))
 (br_if $skip (i32.ne (local.get $race) ${a(20)}))
 (br_if $skip (i32.ne (i32.load (local.get $race)) (i32.const 4)))
 (local.set $percent ${b(48)}) (local.set $braking ${b(44)})
 ;; Only adaptive command3 admits a bounded live reduction from the cached
 ;; planning ceiling. Legacy command2 still requires exact equality.
 (if (i32.eq ${b(4)} (i32.const 3)) (then
  (br_if $skip (i32.lt_u ${a(60)} (i32.const 75)))
  (br_if $skip (i32.gt_u ${a(60)} (local.get $percent)))) (else
  (br_if $skip (i32.ne (local.get $percent) ${a(60)}))))
 (br_if $skip (i32.eqz (i32.and (i32.ge_u (local.get $percent) (i32.const 75)) (i32.le_u (local.get $percent) (i32.const 300)))))
 (br_if $skip (i32.eqz (i32.and (i32.ge_u (local.get $braking) (i32.const 50)) (i32.le_u (local.get $braking) (i32.const 100)))))
 (br_if $skip (i32.eqz (i32.and (i32.ge_u ${b(8)} (i32.const 60)) (i32.le_u ${b(8)} (i32.const 95)))))
 (br_if $skip (i32.gt_u ${b(36)} (i32.const 25)))
 (if (i32.eq ${b(4)} (i32.const 3)) (then
  (br_if $skip (i32.lt_u (local.get $percent) (i32.const 100)))
  (br_if $skip (i32.gt_u (local.get $percent) (i32.const 200)))))
 (local.set $pace (f64.max (f64.const 1) (f64.div (f64.convert_i32_u (local.get $percent)) (f64.const 100))))
 (br_if $skip (i32.ne (local.get $seq) ${a(4)}))
 (local.set $eligible (i32.const 1)))`;
const post=`(block $skipAfter
 (br_if $skipAfter (i32.eqz (local.get $eligible)))
 (br_if $skipAfter (i32.ne (local.get $seq) ${a(4)}))
 (br_if $skipAfter (i32.ne (i32.load offset=32 (local.get $cpu)) (local.get $caller)))
 (br_if $skipAfter (i32.ne (i32.load offset=16 (local.get $cpu)) (i32.add (local.get $sp) (i32.const 4))))
 (local.set $slot (i32.add (i32.add (local.get $cpu) (i32.const 72)) (i32.shl (i32.and (i32.load offset=136 (local.get $cpu)) (i32.const 7)) (i32.const 3))))
 (local.set $native (f64.load (local.get $slot)))
 (br_if $skipAfter (i32.eqz (i32.and (f64.gt (local.get $native) (f64.const 0)) (f64.le (local.get $native) (f64.const 50)))))
 ;; Both the corner boundary and its backward envelope see the same assumption.
 (f64.store (local.get $slot) (f64.mul (local.get $native) (f64.div (f64.div (f64.convert_i32_u (local.get $braking)) (f64.const 100)) (f64.mul (local.get $pace) (local.get $pace)))))
 (i32.store (i32.const ${B+60}) (i32.add ${b(60)} (i32.const 1))))`;
(async()=>{const wabt=await factory();const wrap=body=>`(module (import "env" "memory" (memory 256 65536 shared)) (func (export "step") (param $cpu i32) ${locals} ${body}))`;
 const compile=s=>{const w=wabt.parseWat('braking-hook.wat',s,{threads:true});w.resolveNames();w.validate({threads:true});return Buffer.from(w.toBinary({}).buffer);};
 const extract=b=>{let p=8;const u=()=>{let n=0,s=0,x;do{x=b[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0;};while(p<b.length){const id=b[p++],len=u(),end=p+len;if(id===10){u();const n=u();return b.subarray(p,p+n);}p=end;}throw Error('Missing body');};
 const output={pre:[...extract(compile(wrap(pre)))],post:[...extract(compile(wrap(post)))],originalTypes:originals,totalLocals:originals.length+names.length+2,index:4497};
 fs.writeFileSync(path.join(root,'tools/braking-hook.json'),JSON.stringify(output));fs.writeFileSync(path.join(root,'tools/braking-hook.wat'),wrap(pre+'\n;; ORIGINAL FUNCTION BODY RUNS HERE\n'+post));
 let source=fs.readFileSync(path.join(root,'extension/ai.js'),'utf8');const line=`  const BRAKING=${JSON.stringify(output)};`;
 source=source.includes('  const BRAKING=')?source.replace(/  const BRAKING=[^\n]+;/,line):source.replace('  const patchState=',line+'\n  const patchState=');
 fs.writeFileSync(path.join(root,'extension/ai.js'),source);console.log('Braking hook extension bytes:',output.pre.length+output.post.length);
})().catch(e=>{console.error(e);process.exit(1)});
