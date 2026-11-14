/* Author a guarded prefix for the existing contact resolver. It leaves the
 * original function intact and never changes map, ground or car-body flags. */
'use strict';
const fs=require('fs'),path=require('path');
const wabtFactory=require(process.env.WABT_MODULE||require('node:path').resolve(__dirname,'../research/compatibility-v011/node_modules/wabt'));
const root=path.resolve(__dirname,'..'),B=0xd0d180,A=0xd0d100,M=0x38574c4e,AM=0x3749414e;
const load=(n,b=B)=>`(i32.load (i32.const ${b+n}))`,store=(n,v)=>`(i32.store (i32.const ${B+n}) ${v})`;
const G=n=>`(i32.load (i32.const ${n}))`;
const valid=v=>`(i32.and (i32.ge_u ${v} (i32.const 65536)) (i32.and (i32.lt_u ${v} (i32.const 0x27fff000)) (i64.lt_u (i64.extend_i32_u ${v}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))`;
// Local 1 belongs to the untouched original body; our locals start at 2.
const locals='(local $original i32) (local $seq i32) (local $aseq i32) (local $p i32) (local $car i32) (local $race i32) (local $body i32) (local $contact i32) (local $a i32) (local $b i32) (local $wall i32) (local $face i32) (local $pair i32) (local $most i32) (local $stack i32) (local $x f32) (local $y f32) (local $z f32) (local $norm f32)';
const body=`
 (block $ordinary
  (br_if $ordinary (i32.ne ${load(0)} (i32.const ${M})))
  (br_if $ordinary (i32.ne ${load(0,A)} (i32.const ${AM})))
  (br_if $ordinary (i32.ne ${load(28,A)} (i32.const ${AM})))
  (local.set $seq ${load(4)}) (local.set $aseq ${load(4,A)})
  (br_if $ordinary (i32.and (i32.or (local.get $seq) (local.get $aseq)) (i32.const 1)))
  (br_if $ordinary (i32.ne ${load(8)} (i32.const 1)))
  (br_if $ordinary (i32.ge_u ${load(48,A)} (i32.const 180)))
  ${store(24,'(i32.const 0)')}
  (br_if $ordinary (i32.ne ${G(0x8654a4)} (i32.const 6)))
  (br_if $ordinary (i32.ne ${G(0xd00030)} (i32.const 1)))
  ;; This switch cannot be opted into online. Never alter network state.
  (if (i32.or (i32.or (i32.and ${G(0x850078)} (i32.const 520)) (i32.or ${G(0x866a14)} ${G(0x8669f4)}))
              (i32.or (i32.load8_u (i32.const 0x89cf69)) (call $roam_online)))
   (then ${store(24,'(i32.const 2)')} (br $ordinary)))
  (local.set $p ${G(0xd00000)})
  (br_if $ordinary (i32.eqz ${valid('(local.get $p)')}))
  (br_if $ordinary (i32.ne (local.get $p) ${load(12)}))
  (br_if $ordinary (i32.load offset=16 (local.get $p)))
  (local.set $car (i32.load offset=4 (local.get $p)))
  (br_if $ordinary (i32.eqz ${valid('(local.get $car)')}))
  (br_if $ordinary (i32.ne (local.get $car) ${load(16)}))
  (local.set $race ${G(0x890118)})
  (br_if $ordinary (i32.eqz ${valid('(local.get $race)')}))
  (br_if $ordinary (i32.ne (local.get $race) ${load(20)}))
  (br_if $ordinary (i32.ne (i32.load (local.get $race)) (i32.const 4)))
  (local.set $body (i32.load offset=60 (local.get $car)))
  (br_if $ordinary (i32.eqz ${valid('(local.get $body)')}))
  (br_if $ordinary (i32.load8_u offset=17 (local.get $body)))
  (br_if $ordinary (i32.ne (i32.load offset=304 (local.get $body)) (local.get $car)))
  (local.set $contact (i32.load offset=4 (local.get $cpu)))
  (br_if $ordinary (i32.eqz ${valid('(local.get $contact)')}))
  (local.set $a (i32.load offset=12 (local.get $contact)))
  (local.set $b (i32.load offset=16 (local.get $contact)))
  (if (i32.eq (local.get $a) (local.get $body))
   (then (local.set $wall (local.get $b)))
   (else (br_if $ordinary (i32.ne (local.get $b) (local.get $body))) (local.set $wall (local.get $a))))
  (br_if $ordinary (i32.eqz ${valid('(local.get $wall)')}))
  (br_if $ordinary (i32.ne (i32.load8_u offset=17 (local.get $wall)) (i32.const 3)))
  (br_if $ordinary (i32.ne (i32.load (local.get $wall)) (i32.const 0x7a22a8)))
  (br_if $ordinary (i32.load8_u offset=18 (local.get $wall)))
  (local.set $face (i32.load offset=96 (local.get $wall)))
  (br_if $ordinary (i32.eqz ${valid('(local.get $face)')}))
  (br_if $ordinary (i32.ne (i32.load offset=16 (local.get $face)) (local.get $wall)))
  (local.set $x (f32.load offset=112 (local.get $face)))
  (local.set $y (f32.load offset=116 (local.get $face)))
  (local.set $z (f32.load offset=120 (local.get $face)))
  ;; The game's IsWallContact uses abs(normal.z) < 0.1. Never broaden to floors or ramps.
  (br_if $ordinary (i32.eqz (f32.lt (f32.abs (local.get $z)) (f32.const 0.1))))
  (local.set $norm (f32.add (f32.add (f32.mul (local.get $x) (local.get $x)) (f32.mul (local.get $y) (local.get $y))) (f32.mul (local.get $z) (local.get $z))))
  (br_if $ordinary (i32.eqz (i32.and (f32.ge (local.get $norm) (f32.const 0.9)) (f32.le (local.get $norm) (f32.const 1.1)))))
  (local.set $pair (i32.load offset=20 (local.get $contact)))
  (br_if $ordinary (i32.eqz ${valid('(local.get $pair)')}))
  (br_if $ordinary (i32.ne (i32.load offset=568 (local.get $pair)) (local.get $a)))
  (br_if $ordinary (i32.ne (i32.load offset=572 (local.get $pair)) (local.get $b)))
  (local.set $most ${G(0x802084)})
  (br_if $ordinary (i32.ne (local.get $most) (i32.const 2)))
  (local.set $stack (i32.load offset=16 (local.get $cpu)))
  (br_if $ordinary (i32.eqz ${valid('(local.get $stack)')}))
  (br_if $ordinary (i32.ne (local.get $seq) ${load(4)}))
  (br_if $ordinary (i32.ne (local.get $aseq) ${load(4,A)}))
  ;; Same finite pair-pass bookkeeping used by the game's Ghost mode.
  (if (i32.lt_u (i32.load offset=576 (local.get $pair)) (i32.const 1))
   (then (i32.store offset=576 (local.get $pair) (i32.const 1))))
  ${store(24,'(i32.const 1)')}
  ${store(28,`(i32.add ${load(28)} (i32.const 1))`)}
  ${store(32,'(local.get $car)')}
  ;; Original thiscall return contract: pop guest EIP only, no arguments.
  (i32.store offset=32 (local.get $cpu) (i32.load (local.get $stack)))
  (i32.store offset=16 (local.get $cpu) (i32.add (local.get $stack) (i32.const 4)))
  (return)
 )`;
(async()=>{
 const wabt=await wabtFactory();
 const memory='(import "env" "memory" (memory 256 65536 shared))';
 const fn=(imports,tail='')=>`(module ${memory} ${imports} (func (export "step") (param $cpu i32) ${locals} ${body} ${tail}))`;
 const online='(import "env" "roam_online" (func $roam_online (result i32)))';
 const compile=s=>{const m=wabt.parseWat('walls.wat',s,{threads:true});m.resolveNames();m.validate({threads:true});return Buffer.from(m.toBinary({}).buffer);};
 const test=fn(online+'(import "env" "original" (func $native (param i32)))','(call $native (local.get $cpu))');
 fs.writeFileSync(path.join(root,'tools/walls.wat'),test);fs.writeFileSync(path.join(root,'tests/walls.wasm'),compile(test));
 const imports=Array.from({length:22650},(_,i)=>i===22649?online:`(import "unused" "${i}" (func))`).join('');
 const prod=compile(fn(imports));let p=8;
 const leb=()=>{let v=0,s=0,x;do{x=prod[p++];v|=(x&127)<<s;s+=7;}while(x&128);return v>>>0;};
 let raw;while(p<prod.length){const id=prod[p++],len=leb(),end=p+len;if(id===10){leb();const n=leb();raw=prod.subarray(p,p+n);break;}p=end;}
 fs.writeFileSync(path.join(root,'tools/walls-body.json'),JSON.stringify([...raw]));
 const file=path.join(root,'extension/ai.js');let js=fs.readFileSync(file,'utf8');
 const declaration=`  const WALL=Uint8Array.from(${JSON.stringify([...raw])});`;
 js=js.includes('  const WALL=')?js.replace(/  const WALL=Uint8Array\.from\([^\n]+\);/,declaration):js.replace('  const patchState=',declaration+'\n  const patchState=');
 fs.writeFileSync(file,js);console.log('Wall prefix bytes:',raw.length);
})().catch(e=>{console.error(e);process.exit(1);});
