/* Authored pre/post hooks only. Original game function bytes remain solely in
 * the game's own downloaded module. Separate guarded free-roam and road-race route planning. */
const fs=require('fs'),path=require('path');
const wabtFactory=require(process.env.WABT_MODULE||require('node:path').resolve(__dirname,'../research/compatibility-v011/node_modules/wabt'));
const root=path.resolve(__dirname,'..'),A=0xd0d100,B=0xd0d200,CORNER_MAGIC=0x33524e43;
const source=fs.readFileSync(path.join(root,'extension/ai.js'),'utf8'),match=source.match(/const BASE=0xd0d100, MAGIC=(0x[0-9a-f]+)/i);
if(!match)throw Error('Expected native AI bridge identity was not found');
const M=Number(match[1]);
const G=p=>`(i32.load (i32.const ${p}))`,a=n=>G(A+n),b=n=>G(B+n),store=(n,v)=>`(i32.store (i32.const ${B+n}) ${v})`;
const valid=(v,size=4096)=>`(i32.and (i32.ge_u ${v} (i32.const 65536)) (i32.and (i32.le_u ${v} (i32.const ${0x28000000-size})) (i64.le_u (i64.extend_i32_u ${v}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const ${size})))))`;
// Until the first confirmed hit, reuse the existing curvature diagnostic word
// for a negative high-water stage. Positive real curvature replaces it on hit.
// Never change native game memory, expand the mailbox or claim confirmation.
const probe=stage=>`(if (i32.and (i32.eqz ${b(16)}) (i32.eq (local.get $seq) ${a(4)})) (then
 (f32.store (i32.const ${B+28}) (f32.min (f32.load (i32.const ${B+28})) (f32.const -${stage})))))`;
const originals=['i32','i32','f64','f64','f64','i32','i32','i32','i32','f32','f32','i32','i32','i32','i32'];
const names=['eligible','seq','sp','car','player','race','driver','percent','slot','margin','command','pacePercent','braking'];
const locals=originals.map((t,i)=>`(local $old${i+1} ${t})`).join(' ')+' '+names.map(n=>`(local $${n} i32)`).join(' ')+' (local $grip f64) (local $curvature f64) (local $cap f64) (local $speed f64) (local $scaled f64) (local $severity f64) (local $pace f64) (local $curveSpeed f64) (local $pacedCap f64)';
const pre=`
(block $skip
 (br_if $skip (i32.ne ${a(0)} (i32.const ${M})))
 (br_if $skip (i32.ne ${a(28)} (i32.const ${M})))
 (br_if $skip (i32.ne ${b(0)} (i32.const ${CORNER_MAGIC})))
 (local.set $command ${b(4)})
 (br_if $skip (i32.eqz (i32.or (i32.eq (local.get $command) (i32.const 1)) (i32.or (i32.eq (local.get $command) (i32.const 2)) (i32.eq (local.get $command) (i32.const 3))))))
 (local.set $seq ${a(4)})
 (br_if $skip (i32.and (local.get $seq) (i32.const 1)))
 (br_if $skip (i32.ge_u ${a(48)} (i32.const 180)))
 ${probe(1)}
 ;; The road-race option is independent; all native driver behavior is retained.
 (if (i32.eq (local.get $command) (i32.const 1)) (then
  (br_if $skip (i32.ne ${a(8)} (i32.const 2)))
  (br_if $skip ${G(0x89e7b0)})) (else
  (br_if $skip (i32.ne ${a(8)} (i32.const 1)))
  (br_if $skip (i32.ne ${G(0x89e7b0)} (i32.const 1)))
  (br_if $skip ${G(0x890108)})
  (br_if $skip ${G(0x890114)})))
 ;; The new adaptive command is never allowed to change Street X. Old commands
 ;; keep their exact behavior. Check native flags as well as page/controller.
 (if (i32.eq (local.get $command) (i32.const 3)) (then
  (br_if $skip (i32.load8_u (i32.const 0x89e7e3)))
  (br_if $skip ${G(0x89010c)})
  (br_if $skip (i32.and (i32.eq ${G(0x850088)} (i32.const 10)) (i32.ne (i32.or (i32.and ${G(0x850078)} (i32.const 520)) (i32.or ${G(0x866a14)} (i32.or ${G(0x8669f4)} (i32.load8_u (i32.const 0x89cf69))))) (i32.const 0))))))
 (br_if $skip (i32.ne ${a(52)} (i32.const 1)))
 (br_if $skip (i32.ne ${G(0x8654a4)} (i32.const 6)))
 (br_if $skip (i32.ne ${G(0xd00030)} (i32.const 1)))
 (br_if $skip (i32.load8_u (i32.const 0x89e7d8)))
 (br_if $skip (i32.load8_u (i32.const 0x89e7d9)))
 (br_if $skip ${G(0x890104)})
 (if (i32.ne ${a(84)} (i32.const 1)) (then
  (br_if $skip (i32.and ${G(0x850078)} (i32.const 520)))
  (br_if $skip ${G(0x866a14)}) (br_if $skip ${G(0x8669f4)})
  (br_if $skip (i32.load8_u (i32.const 0x89cf69)))))
 ${probe(2)}
 (local.set $sp (i32.load offset=16 (local.get $cpu)))
 (br_if $skip (i32.eqz ${valid('(local.get $sp)',16)}))
 ;; This exact call converts upcoming road-point curvature into a corner cap.
 (br_if $skip (i32.ne (i32.load (local.get $sp)) (i32.const 0x4228bb)))
 (local.set $car (i32.load offset=12 (local.get $cpu)))
 (br_if $skip (i32.eqz ${valid('(local.get $car)')}))
 (br_if $skip (i32.ne (local.get $car) ${a(36)}))
 (br_if $skip (i32.ne (local.get $car) ${a(16)}))
 (br_if $skip (i32.ne (i32.load offset=36 (local.get $car)) (i32.const 3)))
 ${probe(3)}
 (local.set $player ${G(0xd00000)})
 (br_if $skip (i32.eqz ${valid('(local.get $player)')}))
 (br_if $skip (i32.ne (local.get $player) ${a(32)}))
 (br_if $skip (i32.ne (local.get $player) ${a(12)}))
 (br_if $skip (i32.ne (i32.load offset=4 (local.get $player)) (local.get $car)))
 (br_if $skip (i32.load offset=16 (local.get $player)))
 (local.set $driver (i32.load offset=44 (local.get $car)))
 (br_if $skip (i32.eqz ${valid('(local.get $driver)')}))
 (br_if $skip (i32.ne (i32.load offset=4 (local.get $driver)) (local.get $car)))
 ;; Restrict to this driver's current main private route, not ancillary planners.
 (br_if $skip (i32.ne (i32.load offset=24 (local.get $cpu)) (i32.load offset=1768 (local.get $driver))))
 (br_if $skip (i32.ne (i32.load offset=24 (local.get $cpu)) (i32.add (local.get $driver) (i32.const 880))))
 ${probe(4)}
 (local.set $race ${G(0x890118)})
 (br_if $skip (i32.eqz ${valid('(local.get $race)')}))
 (br_if $skip (i32.ne (local.get $race) ${a(40)}))
 (br_if $skip (i32.ne (local.get $race) ${a(20)}))
 (br_if $skip (i32.ne (i32.load (local.get $race)) (i32.const 4)))
 (local.set $percent ${b(8)})
 (br_if $skip (i32.eqz (i32.and (i32.ge_u (local.get $percent) (i32.const 60)) (i32.le_u (local.get $percent) (i32.const 95)))))
 (local.set $margin ${b(36)})
 (br_if $skip (i32.gt_u (local.get $margin) (i32.const 25)))
 (local.set $pace (f64.const 1))
 (local.set $pacePercent (i32.const 100))
 (local.set $braking (i32.const 100))
 ;; The free-roam cap is consumed before the selected native pace multiplier.
 ;; Compensate boosts when planning the cached cap, including bends which
 ;; become limiting only at that pace. Sub-native pace keeps its old cap.
 (if (i32.eq (local.get $command) (i32.const 1)) (then
  (local.set $pacePercent ${b(48)})
  (br_if $skip (i32.lt_u ${a(60)} (i32.const 75)))
  (br_if $skip (i32.gt_u ${a(60)} (i32.const 300)))
  (br_if $skip (i32.ne (local.get $pacePercent) (select ${a(60)} (i32.const 100) (i32.gt_u ${a(60)} (i32.const 100)))))
  (br_if $skip (i32.lt_u (local.get $pacePercent) (i32.const 100)))
  (br_if $skip (i32.gt_u (local.get $pacePercent) (i32.const 300)))
  (local.set $pace (f64.max (f64.const 1) (f64.div (f64.convert_i32_u (local.get $pacePercent)) (f64.const 100))))))
 (if (i32.ge_u (local.get $command) (i32.const 2)) (then
  (local.set $pacePercent ${b(48)})
  (local.set $braking ${b(44)})
  ;; Runtime adaptive pace can be reduced without replacing cached planning
  ;; caps. It may never exceed that selected ceiling or go below 0.75x.
  ;; All prior commands retain the exact matching-pace requirement.
  (if (i32.eq (local.get $command) (i32.const 3)) (then
   (br_if $skip (i32.lt_u ${a(60)} (i32.const 75)))
   (br_if $skip (i32.gt_u ${a(60)} (local.get $pacePercent)))) (else
   (br_if $skip (i32.ne (local.get $pacePercent) ${a(60)}))))
  (br_if $skip (i32.eqz (i32.and (i32.ge_u (local.get $pacePercent) (i32.const 75)) (i32.le_u (local.get $pacePercent) (i32.const 300)))))
  (br_if $skip (i32.eqz (i32.and (i32.ge_u (local.get $braking) (i32.const 50)) (i32.le_u (local.get $braking) (i32.const 100)))))
  (if (i32.eq (local.get $command) (i32.const 3)) (then
   (br_if $skip (i32.lt_u (local.get $pacePercent) (i32.const 100)))
   (br_if $skip (i32.gt_u (local.get $pacePercent) (i32.const 200)))))
  (local.set $pace (f64.max (f64.const 1) (f64.div (f64.convert_i32_u (local.get $pacePercent)) (f64.const 100))))))
 (local.set $grip (f64.promote_f32 (f32.load offset=4 (local.get $sp))))
 (local.set $curvature (f64.abs (f64.promote_f32 (f32.load offset=8 (local.get $sp)))))
 (local.set $cap (f64.promote_f32 (f32.load offset=12 (local.get $sp))))
 (br_if $skip (i32.eqz (i32.and (f64.gt (local.get $grip) (f64.const 0)) (f64.le (local.get $grip) (f64.const 20)))))
 (br_if $skip (i32.eqz (i32.and (f64.ge (local.get $curvature) (f64.const 0)) (f64.le (local.get $curvature) (f64.const 10)))))
 (br_if $skip (i32.eqz (i32.and (f64.gt (local.get $cap) (f64.const 0)) (f64.le (local.get $cap) (f64.const 150)))))
 ${probe(5)}
 ;; A curve can become limiting only under increased custom pace. Clear straights
 ;; retain their original cap and selected post-route pace.
 (local.set $pacedCap (f64.mul (local.get $cap) (local.get $pace)))
 (if (i32.eq (local.get $command) (i32.const 3)) (then
  ;; Every valid sampled nonzero bend is eligible; exact straights stay native.
  (br_if $skip (f64.eq (local.get $curvature) (f64.const 0)))) (else
 (br_if $skip (f64.le (local.get $curvature)
  (f64.div (f64.mul (local.get $grip) (f64.promote_f32 (f32.load (i32.const 0x7a51b8)))) (f64.mul (local.get $pacedCap) (local.get $pacedCap)))))))
 (br_if $skip (i32.ne (local.get $seq) ${a(4)}))
 ${probe(6)}
 (local.set $eligible (i32.const 1))
)`;
const post=`
(block $skipAfter
 (br_if $skipAfter (i32.eqz (local.get $eligible)))
 (br_if $skipAfter (i32.ne (local.get $seq) ${a(4)}))
 (br_if $skipAfter (i32.ne (i32.load offset=32 (local.get $cpu)) (i32.const 0x4228bb)))
 (br_if $skipAfter (i32.ne (i32.load offset=16 (local.get $cpu)) (i32.add (local.get $sp) (i32.const 4))))
 (local.set $slot (i32.add (i32.add (local.get $cpu) (i32.const 72)) (i32.shl (i32.and (i32.load offset=136 (local.get $cpu)) (i32.const 7)) (i32.const 3))))
 (local.set $speed (f64.load (local.get $slot)))
 ;; Only reduce finite positive native results, never stop intent. Command3
 ;; accepts tiny x87 roundoff above C; all old command comparisons stay exact.
 (br_if $skipAfter (i32.eqz (i32.and (f64.gt (local.get $speed) (f64.const 0)) (f64.le (local.get $speed) (select (f64.mul (local.get $cap) (f64.const 1.000001)) (local.get $cap) (i32.eq (local.get $command) (i32.const 3)))))))
 (br_if $skipAfter (i32.and (i32.and (i32.eq (local.get $command) (i32.const 1)) (f64.le (local.get $pace) (f64.const 1))) (f64.ge (local.get $speed) (local.get $cap))))
 (local.set $curveSpeed (local.get $speed))
 (if (i32.or (i32.eq (local.get $command) (i32.const 3)) (f64.gt (local.get $pace) (f64.const 1))) (then
  (local.set $curveSpeed (f64.sqrt (f64.div (f64.mul (local.get $grip) (f64.promote_f32 (f32.load (i32.const 0x7a51b8)))) (local.get $curvature))))))
 (if (i32.eq (local.get $command) (i32.const 3)) (then
  ;; L=P*C, q=k*L^2/(g*9.8), W=L/sqrt(1+q/f^2).
  ;; Store W/P: continuous, below the straight ceiling and protected curve cap,
  ;; with no guessed route distance or rewrite of physical braking/steering.
  (local.set $severity (f64.div (f64.convert_i32_u (local.get $percent)) (f64.const 100)))
  (local.set $scaled (f64.div (local.get $cap) (f64.sqrt
   (f64.add (f64.const 1) (f64.div
    (f64.mul (local.get $curvature) (f64.mul (local.get $pacedCap) (local.get $pacedCap)))
    (f64.mul (f64.mul (local.get $grip) (f64.promote_f32 (f32.load (i32.const 0x7a51b8)))) (f64.mul (local.get $severity) (local.get $severity))))))))
 ) (else
 (local.set $scaled (f64.mul (local.get $curveSpeed) (f64.div (f64.convert_i32_u (local.get $percent)) (f64.const 100))))))
 ;; Native speed/cap is a dimensionless measure of curvature demand. Add more
 ;; margin to tighter bends without guessing route-node layouts or sampling
 ;; current steering. The original planner propagates this cap into braking.
 ;; A zero margin follows the exact v0.13 multiplication path.
 (if (local.get $margin) (then
  (local.set $severity (f64.max (f64.const 0) (f64.sub (f64.const 1) (f64.div (local.get $curveSpeed) (local.get $cap)))))
  (local.set $scaled (f64.mul (local.get $scaled)
   (f64.sub (f64.const 1) (f64.mul (f64.div (f64.convert_i32_u (local.get $margin)) (f64.const 100)) (local.get $severity)))))))
 ;; Compensate the selected pace that native target consumption applies later.
 (if (i32.ne (local.get $command) (i32.const 3)) (then (local.set $scaled (f64.div (local.get $scaled) (local.get $pace)))))
 (br_if $skipAfter (i32.eqz (i32.and (f64.gt (local.get $scaled) (f64.const 0)) (f64.lt (local.get $scaled) (local.get $speed)))))
 (f64.store (local.get $slot) (local.get $scaled))
 ${store(12,'(local.get $car)')}
 ${store(16,`(i32.add ${b(16)} (i32.const 1))`)}
 (f32.store (i32.const ${B+20}) (f32.demote_f64 (local.get $speed)))
 (f32.store (i32.const ${B+24}) (f32.demote_f64 (local.get $scaled)))
 (f32.store (i32.const ${B+28}) (f32.demote_f64 (local.get $curvature)))
 ${store(32,'(local.get $percent)')}
 ${store(40,'(local.get $margin)')}
 (if (i32.ge_u (local.get $command) (i32.const 2)) (then ${store(52,'(local.get $pacePercent)')} ${store(56,'(local.get $braking)')}))
)`;
(async()=>{
 const wabt=await wabtFactory();
 const wrap=body=>`(module (import "env" "memory" (memory 256 65536 shared)) (func (export "step") (param $cpu i32) ${locals} ${body}))`;
 const compile=source=>{const w=wabt.parseWat('corner-hook.wat',source,{threads:true});w.resolveNames();w.validate({threads:true});return Buffer.from(w.toBinary({}).buffer);};
 const extract=bin=>{let p=8;const u=()=>{let n=0,s=0,x;do{x=bin[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0;};while(p<bin.length){const id=bin[p++],len=u(),end=p+len;if(id===10){u();const n=u();return bin.subarray(p,p+n);}p=end;}throw Error('Missing body');};
 const output={pre:[...extract(compile(wrap(pre)))],post:[...extract(compile(wrap(post)))],originalTypes:originals,totalLocals:37,index:4653,commandBase:B,commandMagic:CORNER_MAGIC};
 fs.writeFileSync(path.join(root,'tools/corner-hook.json'),JSON.stringify(output));
 fs.writeFileSync(path.join(root,'tools/corner-hook.wat'),wrap(pre+'\n;; ORIGINAL FUNCTION BODY RUNS HERE\n'+post));
 let js=fs.readFileSync(path.join(root,'extension/ai.js'),'utf8');
 const line=`  const CORNER=${JSON.stringify(output)};`;
 js=js.includes('  const CORNER=')?js.replace(/  const CORNER=[^\n]+;/,line):js.replace('  const patchState=',line+'\n  const patchState=');
 if(!process.argv.includes('--no-embed'))fs.writeFileSync(path.join(root,'extension/ai.js'),js);console.log('Corner hook extension bytes:',output.pre.length+output.post.length);
})();
