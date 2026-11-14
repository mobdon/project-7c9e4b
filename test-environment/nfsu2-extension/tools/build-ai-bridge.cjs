/* Build our own small game-thread bridge. No original game code is packaged. */
const fs=require('fs'),path=require('path');
const wabtFactory=require(process.env.WABT_MODULE || require('node:path').resolve(__dirname,'../research/compatibility-v011/node_modules/wabt'));
const root=path.resolve(__dirname,'..');
const B=0xd0d100, M=0x3749414e;
const at=n=>B+n;
const load=n=>`(i32.load (i32.const ${at(n)}))`;
const store=(n,v)=>`(i32.store (i32.const ${at(n)}) ${v})`;
const valid=v=>`(i32.and (i32.ge_u ${v} (i32.const 65536)) (i32.and (i32.lt_u ${v} (i32.const 0x27fff000)) (i64.lt_u (i64.extend_i32_u ${v}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))`;
const G=n=>`(i32.load (i32.const ${n}))`;
const call=(fn,n=0,args=0)=>`(call $gcall (local.get $cpu) (i32.const ${fn}) (local.get $p) (i32.const ${n}) (i32.const ${args}))`;
const physics1=`${store(56,'(i32.const 1)')} (call $gcall (local.get $cpu) (i32.const 0x5f46a0) (local.get $car) (i32.const 1) (i32.const ${at(56)}))`;
const clear=`${store(32,'(i32.const 0)')} ${store(36,'(i32.const 0)')} ${store(40,'(i32.const 0)')} ${store(64,'(i32.const 0)')} ${store(52,'(i32.const 0)')} ${store(76,'(i32.const 0)')} ${store(80,'(i32.const 0)')}`;
const restoreSkill=`
 (if (i32.and ${valid(load(64))} (i32.eq (i32.load offset=20 (local.get $car)) ${load(64)}))
  (then (if (i32.eq (i32.load8_u offset=2305 ${load(64)}) (i32.const 9))
   (then (i32.store8 offset=2305 ${load(64)} ${load(68)})))))`;
// 31 untouched original locals; our locals start at index32. Preserve their zero-initialized values.
const originals=['i32','i32','i32','i32','f32','i32','f64','i32','i32','i32','i32','i32','i32','i32','i32','i32','i32','i32','v128','i32','i32','i32','f64','i32','i32','i32','i32','i32','v128','i32','v128'];
const locals=originals.map((t,i)=>`(local $old${i+1} ${t})`).join(' ')+' '+['p','car','race','want','seq','hb','stale','owned','kind','rec'].map(n=>`(local $${n} i32)`).join(' ');
const body=`
(block $done
 ;; Only the documented main-loop caller, on the game thread under its own lock.
 (br_if $done (i32.ne (i32.load (i32.load offset=16 (local.get $cpu))) (i32.const 0x581475)))
 ${store(28,`(i32.const ${M})`)}
 ;; Page owns command words 0..24, pace percent at 60 and online opt-in at 84 and experimental drag opt-in at 88. Game owns all others.
 (br_if $done (i32.ne ${load(0)} (i32.const ${M})))
 (local.set $hb ${load(24)})
 (local.set $stale (i32.add ${load(48)} (i32.const 1)))
 (if (i32.ne (local.get $hb) ${load(44)}) (then (local.set $stale (i32.const 0))))
 ${store(44,'(local.get $hb)')} ${store(48,'(local.get $stale)')}
 (local.set $seq ${load(4)})
 ;; An interrupted page writer is allowed only briefly; the heartbeat still expires.
 (br_if $done (i32.and (i32.and (local.get $seq) (i32.const 1)) (i32.lt_u (local.get $stale) (i32.const 180))))
 (local.set $p ${G(0xd00000)})
 (local.set $race ${G(0x890118)})
 (local.set $car (i32.const 0))
 (local.set $kind (i32.const 0))
 (local.set $want (i32.const 0))
 (block $invalid
  (br_if $invalid (i32.ne ${G(0x8654a4)} (i32.const 6)))
  (br_if $invalid (i32.eqz ${valid('(local.get $p)')}))
  (local.set $car (i32.load offset=4 (local.get $p)))
  (br_if $invalid (i32.eqz ${valid('(local.get $car)')}))
  (local.set $kind (i32.load offset=36 (local.get $car)))
  (br_if $invalid (i32.eqz ${valid('(local.get $race)')}))
  (br_if $invalid (i32.ne (i32.load offset=16 (local.get $p)) (i32.const 0)))
  (br_if $invalid (i32.ne ${G(0xd00030)} (i32.const 1)))
  (br_if $invalid (i32.ne (i32.load (local.get $race)) (i32.const 4)))
  ;; Only this extension's online guard is optional. Native network state stays untouched.
  (if (i32.ne ${load(84)} (i32.const 1)) (then
   (br_if $invalid (i32.and ${G(0x850078)} (i32.const 520)))
   (br_if $invalid ${G(0x866a14)})
   (br_if $invalid ${G(0x8669f4)})
   (br_if $invalid (i32.load8_u (i32.const 0x89cf69)))))
  ;; Drag opponents use driver 3 with full physics 1 (0x5f6d50 -> 0x5f4400).
  ;; Player::AutoPilotOn instead requests physics 3; correct it only under a separate opt-in.
  (if (i32.load8_u (i32.const 0x89e7d8)) (then
   (br_if $invalid (i32.ne ${load(88)} (i32.const 1)))
   (br_if $invalid (i32.ne (i32.load offset=40 (local.get $car)) (i32.const 1)))
   (br_if $invalid (i32.eqz (i32.load8_u offset=1472 (local.get $car))))))
  (br_if $invalid (i32.gt_u (local.get $stale) (i32.const 179)))
  (br_if $invalid (i32.and (local.get $seq) (i32.const 1)))
  (br_if $invalid (i32.ne ${load(12)} (local.get $p)))
  (br_if $invalid (i32.ne ${load(16)} (local.get $car)))
  (br_if $invalid (i32.ne ${load(20)} (local.get $race)))
  (local.set $want (i32.and (i32.ge_u ${load(8)} (i32.const 1)) (i32.le_u ${load(8)} (i32.const 2))))
  (if (i32.ne (local.get $seq) ${load(4)}) (then (local.set $want (i32.const 0))))
 )
 (local.set $owned ${load(36)})
 ;; A transition, failed guard, stopped page heartbeat or OFF hands back only our still-live car.
 (if (local.get $owned)
  (then
   (if (i32.eqz (i32.and (local.get $want)
     (i32.and (i32.eq ${load(32)} (local.get $p))
      (i32.and (i32.eq (local.get $owned) (local.get $car))
       (i32.and (i32.eq ${load(40)} (local.get $race)) (i32.eq (local.get $kind) (i32.const 3)))))))
    (then
     (if (i32.and (i32.eq ${G(0x8654a4)} (i32.const 6))
       (i32.and ${valid('(local.get $car)')}
        (i32.and (i32.eq ${load(32)} (local.get $p)) (i32.eq (local.get $owned) (local.get $car)))))
      (then
       ${restoreSkill}
       (if (i32.eq (local.get $kind) (i32.const 3))
        (then ${call(0x5faf10)} ${store(56,'(i32.const 2)')} ${call(0x605c70,1,at(56))}))
      ))
     ${clear}
     (local.set $kind (i32.const 0))
    ))
  ))
 (if (i32.eqz ${load(8)}) (then ${store(72,'(i32.const 0)')}))
 ;; Never commandeer an AI car that the extension did not acquire.
 (if (i32.and (local.get $want) (i32.eqz ${load(36)}))
  (then
   (if (i32.and (i32.eq (local.get $kind) (i32.const 1)) (i32.ne ${load(72)} (local.get $car)))
    (then
     (block $acquire
     (local.set $rec (i32.load offset=20 (local.get $car)))
     (br_if $acquire (i32.eqz ${valid('(local.get $rec)')}))
     (if ${valid('(local.get $rec)')}
      (then (if (i32.le_u (i32.load8_u offset=2305 (local.get $rec)) (i32.const 9))
       (then
        ${store(64,'(local.get $rec)')}
        ${store(68,'(i32.load8_u offset=2305 (local.get $rec))')}
        (i32.store8 offset=2305 (local.get $rec) (i32.const 9))
       ))))
     ${call(0x5fae20)}
     (if (i32.and (i32.load8_u (i32.const 0x89e7d8))
       (i32.eq (i32.load offset=36 (local.get $car)) (i32.const 3)))
      (then ${physics1}))
     (if (i32.and (i32.eq (i32.load offset=36 (local.get $car)) (i32.const 3))
       (i32.or (i32.eqz (i32.load8_u (i32.const 0x89e7d8)))
        (i32.eq (i32.load offset=40 (local.get $car)) (i32.const 1))))
      (then
       ${store(32,'(local.get $p)')} ${store(36,'(local.get $car)')} ${store(40,'(local.get $race)')}
       ${store(52,'(i32.const 1)')}
      )
      (else
       ;; A rejected physics correction must not strand an unowned AI driver.
       (if (i32.eq (i32.load offset=36 (local.get $car)) (i32.const 3))
        (then ${call(0x5faf10)} ${store(56,'(i32.const 2)')} ${call(0x605c70,1,at(56))}))
       ${restoreSkill} ${store(64,'(i32.const 0)')} ${store(72,'(local.get $car)')} ${store(52,'(i32.const 3)')}))
     )
    )
   )
  ))
) `;
(async()=>{
 const wabt=await wabtFactory();
 const header='(import "env" "memory" (memory 256 65536 shared))';
 const gcall='(import "env" "gcall" (func $gcall (param i32 i32 i32 i32 i32)))';
 const moduleSource=extra=>`(module ${header} ${extra} ${gcall} (func (export "step") (param $cpu i32) ${locals} ${body}))`;
 fs.writeFileSync(path.join(root,'tools/ai-base-bridge.wat'),moduleSource(''));
 const compile=source=>{const m=wabt.parseWat('ai-bridge.wat',source,{threads:true,simd:true});m.resolveNames();m.validate({threads:true,simd:true});return Buffer.from(m.toBinary({}).buffer)};
 const test=compile(moduleSource(''));fs.writeFileSync(path.join(root,'tests/ai-bridge.wasm'),test);
 // Imported stubs make the bridge's gcall instruction use the exact function index in the pinned module.
 const dummies=Array.from({length:21725},(_,i)=>`(import "unused" "${i}" (func))`).join('');
 const prod=compile(moduleSource(dummies));
 let p=8; const leb=()=>{let v=0,s=0,x;do{x=prod[p++];v|=(x&127)<<s;s+=7}while(x&128);return v>>>0};
 let raw; while(p<prod.length){const id=prod[p++],len=leb(),end=p+len;if(id===10){leb();const n=leb();raw=prod.subarray(p,p+n);break}p=end;}
 fs.writeFileSync(path.join(root,'tools/ai-bridge-body.json'),JSON.stringify([...raw]));
 const file=path.join(root,'extension/ai.js');
 const js=fs.readFileSync(file,'utf8').replace(/  const BRIDGE=Uint8Array\.from\([^\n]+\);/,`  const BRIDGE=Uint8Array.from(${JSON.stringify([...raw])});`);
 fs.writeFileSync(file,js);
 console.log('AI base bridge bytes:',raw.length);
 const child=require('node:child_process').spawnSync(process.execPath,[path.join(root,'tools/build-dyno-bridge.cjs')],{stdio:'inherit',env:process.env});
 if(child.status!==0)throw Error('Dyno bridge composition failed');
})().catch(e=>{console.error(e);process.exit(1)});
