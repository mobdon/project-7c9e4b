/* Player-only native pace hook. This reproduces the public catchup.c wrapper,
 * preserving both native calls, then adjusts only a freshly computed target
 * speed factor. No original game function body is copied into the extension. */
const fs=require('fs'),path=require('path');
const wabtFactory=require(process.env.WABT_MODULE || require('node:path').resolve(__dirname,'../research/compatibility-v011/node_modules/wabt'));
const root=path.resolve(__dirname,'..'),B=0xd0d100,M=0x3749414e;
const load=n=>`(i32.load (i32.const ${B+n}))`;
const store=(n,v)=>`(i32.store (i32.const ${B+n}) ${v})`;
const G=n=>`(i32.load (i32.const ${n}))`;
const valid=v=>`(i32.and (i32.ge_u ${v} (i32.const 65536)) (i32.and (i32.lt_u ${v} (i32.const 0x27fff000)) (i64.lt_u (i64.extend_i32_u ${v}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))`;
const locals='(local $driver i32) (local $player i32) (local $car i32) (local $race i32) (local $seq i32) (local $percent i32) (local $native f32)';
const body=`
 ;; The stock port wrapper saves ECX before the native update changes it.
 (local.set $driver (i32.load offset=4 (local.get $cpu)))
 (call $original (local.get $cpu))
 (call $catchup (local.get $driver))
 (block $done
  (br_if $done (i32.ne ${load(0)} (i32.const ${M})))
  (br_if $done (i32.ne ${load(28)} (i32.const ${M})))
  (local.set $seq ${load(4)})
  (br_if $done (i32.and (local.get $seq) (i32.const 1)))
  (br_if $done (i32.ge_u ${load(48)} (i32.const 180)))
  (br_if $done (i32.eqz (i32.and (i32.ge_u ${load(8)} (i32.const 1)) (i32.le_u ${load(8)} (i32.const 2)))))
  (br_if $done (i32.ne ${load(52)} (i32.const 1)))
  (br_if $done (i32.ne ${G(0x8654a4)} (i32.const 6)))
  (br_if $done (i32.ne ${G(0xd00030)} (i32.const 1)))
  ;; Only this extension's online guard is optional. Native network state stays untouched.
  (if (i32.ne ${load(84)} (i32.const 1)) (then
   (br_if $done (i32.and ${G(0x850078)} (i32.const 520)))
   (br_if $done ${G(0x866a14)})
   (br_if $done ${G(0x8669f4)})
   (br_if $done (i32.load8_u (i32.const 0x89cf69)))))
  (br_if $done (i32.load8_u (i32.const 0x89e7d8)))
  (local.set $player ${G(0xd00000)})
  (br_if $done (i32.eqz ${valid('(local.get $player)')}))
  (br_if $done (i32.ne (local.get $player) ${load(32)}))
  (br_if $done (i32.ne (local.get $player) ${load(12)}))
  (br_if $done (i32.load offset=16 (local.get $player)))
  (local.set $car (i32.load offset=4 (local.get $player)))
  (br_if $done (i32.eqz ${valid('(local.get $car)')}))
  (br_if $done (i32.ne (local.get $car) ${load(36)}))
  (br_if $done (i32.ne (local.get $car) ${load(16)}))
  (br_if $done (i32.ne (i32.load offset=36 (local.get $car)) (i32.const 3)))
  (br_if $done (i32.eqz ${valid('(local.get $driver)')}))
  ;; car+0x2c is the active driver/brain, driver+4 is its vehicle.
  (br_if $done (i32.ne (i32.load offset=44 (local.get $car)) (local.get $driver)))
  (br_if $done (i32.ne (i32.load offset=4 (local.get $driver)) (local.get $car)))
  (local.set $race ${G(0x890118)})
  (br_if $done (i32.eqz ${valid('(local.get $race)')}))
  (br_if $done (i32.ne (local.get $race) ${load(40)}))
  (br_if $done (i32.ne (local.get $race) ${load(20)}))
  (br_if $done (i32.ne (i32.load (local.get $race)) (i32.const 4)))
  (local.set $percent ${load(60)})
  (br_if $done (i32.eqz (i32.and (i32.ge_u (local.get $percent) (i32.const 75)) (i32.le_u (local.get $percent) (i32.const 300)))))
  (local.set $native (f32.load offset=1904 (local.get $driver)))
  ;; Comparisons reject NaN/Inf and unexpected layouts without touching them.
  (br_if $done (i32.eqz (i32.and (f32.ge (local.get $native) (f32.const 0)) (f32.le (local.get $native) (f32.const 4)))))
  (br_if $done (i32.ne (local.get $seq) ${load(4)}))
  ;; Original recomputes this each update: never multiply our previous result.
  ;; Keep the ordinary 1x path bit-for-bit untouched, including negative zero.
  (if (i32.ne (local.get $percent) (i32.const 100))
   (then (f32.store offset=1904 (local.get $driver)
    (f32.mul (local.get $native) (f32.div (f32.convert_i32_u (local.get $percent)) (f32.const 100))))))
  ${store(76,'(local.get $percent)')}
  ${store(80,`(i32.add ${load(80)} (i32.const 1))`)}
 )`;
(async()=>{
 const wabt=await wabtFactory();
 const memory='(import "env" "memory" (memory 256 65536 shared))';
 const fn=imports=>`(module ${memory} ${imports} (func (export "step") (param $cpu i32) ${locals} ${body}))`;
 const typed=(name)=>`(import "env" "${name}" (func $${name} (param i32)))`;
 const compile=source=>{const m=wabt.parseWat('ai-pace.wat',source,{threads:true});m.resolveNames();m.validate({threads:true});return Buffer.from(m.toBinary({}).buffer);};
 const source=fn(typed('original')+typed('catchup'));
 fs.writeFileSync(path.join(root,'tools/ai-pace.wat'),source);
 fs.writeFileSync(path.join(root,'tests/ai-pace.wasm'),compile(source));
 // Exact indices from the hash-pinned module's symbol table.
 const imports=Array.from({length:21262},(_,i)=>i===16154?typed('original'):i===21261?typed('catchup'):`(import "unused" "${i}" (func))`).join('');
 const prod=compile(fn(imports));let p=8;
 const leb=()=>{let v=0,s=0,x;do{x=prod[p++];v|=(x&127)<<s;s+=7;}while(x&128);return v>>>0;};
 let raw;while(p<prod.length){const id=prod[p++],len=leb(),end=p+len;if(id===10){leb();const n=leb();raw=prod.subarray(p,p+n);break;}p=end;}
 fs.writeFileSync(path.join(root,'tools/ai-pace-body.json'),JSON.stringify([...raw]));
 const file=path.join(root,'extension/ai.js');let js=fs.readFileSync(file,'utf8');
 const declaration=`  const PACE=Uint8Array.from(${JSON.stringify([...raw])});`;
 js=js.includes('  const PACE=')?js.replace(/  const PACE=Uint8Array\.from\([^\n]+\);/,declaration):js.replace('  const patchState=',declaration+'\n  const patchState=');
 fs.writeFileSync(file,js);
 console.log('Pace wrapper body bytes:',raw.length);
})().catch(e=>{console.error(e);process.exit(1);});
