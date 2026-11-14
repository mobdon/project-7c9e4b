/* Original extension code. Calls pinned game routines; no original game bytes distributed. */
const fs=require('fs'),path=require('path');
const wabtFactory=require(process.env.WABT_MODULE||require('node:path').resolve(__dirname,'../research/compatibility-v011/node_modules/wabt'));
const root=path.resolve(__dirname,'..'),B=0xd0d300,D=0x839c40,M=0x384e5944;
const C=n=>`(i32.const ${n})`,L=n=>`(local.get $d${n})`,S=(n,v)=>`(local.set $d${n} ${v})`,add=(a,n)=>`(i32.add ${a} ${C(n)})`,G=n=>`(i32.load ${C(n)})`,load=n=>[4,12].includes(n)?`(i32.atomic.load ${C(B+n)})`:G(B+n),store=(n,v)=>`(i32.store ${C(B+n)} ${v})`,cp=(a,b,n)=>`(memory.copy ${a} ${b} ${C(n)})`;
const valid=v=>`(i32.and (i32.ge_u ${v} ${C(65536)}) (i32.and (i32.lt_u ${v} ${C(0x27fff000)}) (i64.lt_u (i64.extend_i32_u ${v}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))`;
// All temporary CPU/backup state lives on the host stack, outside the guest heap.
// Scratch: CPU[344], saved ride[2288], payload[256], output pointers. Native
// routines use their own stack below this reservation and the guest stack gap.
const tmp=()=>L('tmp'),ride=()=>L('ride'),tune=()=>L('tune'),snap=()=>add(tmp(),352),payload=()=>add(tmp(),2656),scratch=()=>add(tmp(),2944);
const call=(fn,ecx,args=[])=>`${cp(tmp(),'(local.get $cpu)',344)}
 (i32.store offset=4 ${tmp()} ${ecx})
 (i32.store offset=16 ${tmp()} ${L('sp')})
 (i32.store ${L('sp')} ${C(fn)})
 ${args.map((v,i)=>`(i32.store offset=${4+i*4} ${L('sp')} ${v})`).join('\n')}
 (call $dispatch ${tmp()} ${C(fn)})`;
const fp=()=>`(f32.demote_f64 (f64.load (i32.add ${add(tmp(),72)} (i32.shl (i32.and (i32.load offset=136 ${tmp()}) ${C(7)}) ${C(3)}))))`;
const reject=(cond,code=2)=>`(if ${cond} (then ${S('status',C(code))} (br $guard)))`;
const bytesEqual=(a,b,n,label='$guard',code=3)=>`${S('i',C(0))}(loop $compare (if (i32.ne (i32.load8_u (i32.add ${a} ${L('i')})) (i32.load8_u (i32.add ${b} ${L('i')}))) (then ${S('status',C(code))} (br ${label}))) ${S('i',add(L('i'),1))}(br_if $compare (i32.lt_u ${L('i')} ${C(n)})))`;
const screen='UI_PerformanceDyno_MAIN.fng\0';
const body=`
(block $dynoDone
 (br_if $dynoDone (i32.ne (i32.load (i32.load offset=16 (local.get $cpu))) ${C(0x581475)}))
 ${store(32,C(M))}
 (br_if $dynoDone (i32.ne ${load(0)} ${C(M)}))
 ${S('seq',load(4))}
 (br_if $dynoDone (i32.eqz ${L('seq')}))
 (br_if $dynoDone (i32.eq ${L('seq')} ${load(36)}))
 (br_if $dynoDone (i32.and ${L('seq')} ${C(1)}))
 ${S('status',C(2))} ${S('allocated',C(0))} ${S('restore',C(0))}
 (block $guard
 ${reject(`(i32.ne ${load(12)} ${C(1)})`,1)}
 ${S('cmd',load(8))}
 ${reject(`(i32.or (i32.lt_u ${L('cmd')} ${C(1)}) (i32.gt_u ${L('cmd')} ${C(4)}))`,4)}
 ${reject(`(i32.ne (i32.load8_u ${C(D+0xb64)}) ${C(1)})`)}
 ${reject(`(i32.ne ${G(0xd00030)} ${C(1)})`)}
 ${reject(`(i32.and ${G(0x850078)} ${C(520)})`)}
 ${reject(G(0x866a14))}${reject(G(0x8669f4))}${reject(`(i32.load8_u ${C(0x89cf69)})`)}
 ${S('ptr',G(0x8384c4))}${reject(`(i32.eqz ${valid(L('ptr'))})`)}
 ${S('ptr',`(i32.load offset=8 ${L('ptr')})`)}${reject(`(i32.eqz ${valid(L('ptr'))})`)}
 ${S('ptr',`(i32.load offset=228 ${L('ptr')})`)}${reject(`(i32.eqz ${valid(L('ptr'))})`)}
 ${S('ptr',`(i32.load offset=12 ${L('ptr')})`)}${reject(`(i32.eqz ${valid(L('ptr'))})`)}
 ${Array.from(screen).map((ch,i)=>reject(`(i32.ne (i32.load8_u offset=${i} ${L('ptr')}) ${C(ch.charCodeAt(0))})`)).join('\n')}
 ${S('tune',G(D+0x900))}${reject(`(i32.eqz ${valid(tune())})`)}
 ${S('record',G(D))}${reject(`(i32.eqz ${valid(L('record'))})`)}
 ${S('mode',G(D+0x9fc))}${reject(`(i32.gt_u ${L('mode')} ${C(4)})`)}
 ${reject(`(i32.ne ${G(D+0xa0c)} ${C(0)})`)}
 ${S('ptr',G(0xd00000))}${reject(`(i32.eqz ${valid(L('ptr'))})`)}
 ${S('car',`(i32.load offset=4 ${L('ptr')})`)}${reject(`(i32.eqz ${valid(L('car'))})`)}
 ${S('ride',`(i32.load offset=16 ${L('car')})`)}${reject(`(i32.eqz ${valid(ride())})`)}
 ${reject(`(i32.ne ${tune()} ${add(ride(),0x384)})`)}
 ${S('parts',`(i32.load offset=8 ${tune()})`)}${reject(`(i32.ne ${L('parts')} ${add(ride(),0x2f0)})`)}
 ${reject(`(i32.ne (i32.load offset=12 ${tune()}) ${add(ride(),0x40)})`)}
 ${reject(`(i32.eqz (i32.and (f32.ge (f32.load offset=560 ${ride()}) (f32.const 100)) (i32.and (f32.lt (f32.load offset=568 ${ride()}) (f32.const 30000)) (f32.gt (f32.load offset=568 ${ride()}) (f32.load offset=560 ${ride()})))))`,6)}
 ${S('sp',`(i32.sub (i32.and (i32.load offset=16 (local.get $cpu)) ${C(-16)}) ${C(288)})`)}${reject(`(i32.eqz ${valid(L('sp'))})`)}
 ${S('oldstack','(global.get $stack)')}
 ${reject(`(i32.or (i32.lt_u ${L('oldstack')} ${C(8192)}) (i64.gt_u (i64.extend_i32_u ${L('oldstack')}) (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16))))`)}
 ${S('tmp',`(i32.sub ${L('oldstack')} ${C(4096)})`)}(global.set $stack ${tmp()})${S('allocated',C(1))}
 ${cp(payload(),C(B+128),256)}
 ${reject(`(i32.ne ${L('seq')} ${load(4)})`,1)}
 ${S('i',C(0))}(loop $legal ${reject(`(i32.gt_u (i32.load8_u (i32.add ${add(tune(),20)} ${L('i')})) ${C(200)})`,4)} ${S('i',add(L('i'),1))}(br_if $legal (i32.lt_u ${L('i')} ${C(41)})))
 (if (i32.ne ${L('cmd')} ${C(1)}) (then
  ${reject(`(i32.ne ${load(16)} ${L('record')})`,3)}${reject(`(i32.ne ${load(20)} ${tune()})`,3)}${reject(`(i32.ne ${load(24)} ${L('mode')})`,3)}${reject(`(i32.ne ${load(28)} ${L('parts')})`,3)}
  ${bytesEqual(add(tune(),20),add(payload(),0),41)}
  ${bytesEqual(L('parts'),add(payload(),144),64)}
 ))
 ${cp(snap(),ride(),0x8f0)}${S('restore',C(1))}
 ${S('mask',C(0))}
 ${call(0x59b080,tune(),[C(23)])}
 (if (i32.and (i32.load ${tmp()}) ${C(255)}) (then ${S('mask',C(1))}))
 ${call(0x59b080,tune(),[C(24)])}
 (if (i32.and (i32.load ${tmp()}) ${C(255)}) (then ${S('mask',`(i32.or ${L('mask')} ${C(2)})`)}))
 (if (i32.and (i32.ge_u ${L('cmd')} ${C(2)}) (i32.le_u ${L('cmd')} ${C(3)})) (then
  ${S('i',C(0))}(loop $validateCandidate
   ${S('byte',`(i32.load8_u (i32.add ${add(payload(),48)} ${L('i')}))`)}
   ${reject(`(i32.gt_u ${L('byte')} ${C(200)})`,4)}
   (if (i32.ne ${L('byte')} (i32.load8_u (i32.add ${add(payload(),0)} ${L('i')}))) (then
    ${reject(`(i32.lt_u ${L('i')} ${C(23)})`,4)}
    ${reject(`(i32.eqz (i32.and ${L('mask')} (if (result i32) (i32.lt_u ${L('i')} ${C(32)}) (then ${C(1)}) (else ${C(2)}))))`,5)}
   ))
   ${S('i',add(L('i'),1))}(br_if $validateCandidate (i32.lt_u ${L('i')} ${C(41)})))
  ${S('offset',C(23))}(loop $setCurve
   ${S('byte',`(i32.load8_u (i32.add ${add(payload(),48)} ${L('offset')}))`)}
   (if (i32.ne ${L('byte')} (i32.load8_u (i32.add ${payload()} ${L('offset')}))) (then
    ${S('kind',`(if (result i32) (i32.lt_u ${L('offset')} ${C(32)}) (then ${C(23)}) (else ${C(24)}))`)}
    ${S('col',`(i32.sub ${L('offset')} (if (result i32) (i32.eq ${L('kind')} ${C(23)}) (then ${C(23)}) (else ${C(32)})))`)}
    ${S('savedbyte',`(i32.load8_u (i32.add ${add(tune(),20)} ${L('offset')}))`)}
    (i32.store8 (i32.add ${add(tune(),20)} ${L('offset')}) ${L('byte')})
    ${call(0x5b3e40,tune(),[L('kind'),L('col'),C(0)])}
    (local.set $dvalue ${fp()})
    (i32.store8 (i32.add ${add(tune(),20)} ${L('offset')}) ${L('savedbyte')})
    ${reject('(i32.eqz (f32.lt (f32.abs (local.get $dvalue)) (f32.const 1e12)))',6)}
    ${call(0x5b4670,tune(),['(i32.reinterpret_f32 (local.get $dvalue))',L('kind'),L('col'),C(0)])}
   ))
   ${S('offset',add(L('offset'),1))}(br_if $setCurve (i32.lt_u ${L('offset')} ${C(41)})))
 ))
 ;; Read power/torque with the exact functions the dyno uses. No stale result reads.
 ${call(0x5b56e0,add(ride(),0x10),[scratch(),C(0)])}
 (f32.store ${C(B+72)} ${fp()})(f32.store ${C(B+80)} (f32.load ${scratch()}))
 ${call(0x5b5810,add(ride(),0x10),[scratch(),C(0)])}
 (f32.store ${C(B+76)} (f32.mul ${fp()} (f32.const 1000)))(f32.store ${C(B+84)} (f32.load ${scratch()}))
 ${reject(`(i32.eqz (i32.and (f32.gt (f32.load ${C(B+72)}) (f32.const 0)) (f32.lt (f32.load ${C(B+72)}) (f32.const 100000))))`,6)}
 ${reject(`(i32.eqz (i32.and (f32.gt (f32.load ${C(B+76)}) (f32.const 0)) (f32.lt (f32.load ${C(B+76)}) (f32.const 100000))))`,6)}
 ${cp(C(B+400),add(tune(),20),41)}
 ${store(44,L('record'))}${store(48,tune())}${store(52,L('mode'))}${store(56,L('parts'))}${store(60,L('mask'))}
 ${cp(C(B+448),L('parts'),64)}
 (if (i32.eq ${L('cmd')} ${C(3)}) (then
   ${bytesEqual(add(tune(),20),add(payload(),96),41)}
   ${reject(`(i32.ne ${load(12)} ${C(1)})`,1)}${reject(`(i32.ne ${L('seq')} ${load(4)})`,1)}
   ${S('restore',C(2))}
   ${call(0x50fda0,C(D))}${call(0x50fdd0,C(D))}
   ${bytesEqual(add(tune(),20),add(payload(),96),41)}
   ${S('restore',C(0))}
 ))
 (if (i32.eq ${L('cmd')} ${C(4)}) (then
   ;; Restore only ECU/turbo bytes. All other settings must match current setup.
   ${S('i',C(0))}(loop $restoreCheck
    ${reject(`(i32.gt_u (i32.load8_u (i32.add ${add(payload(),48)} ${L('i')})) ${C(200)})`,4)}
    (if (i32.lt_u ${L('i')} ${C(23)}) (then
      ${reject(`(i32.ne (i32.load8_u (i32.add ${add(payload(),48)} ${L('i')})) (i32.load8_u (i32.add ${payload()} ${L('i')})))`,4)}
    ))
    ${S('i',add(L('i'),1))}(br_if $restoreCheck (i32.lt_u ${L('i')} ${C(41)})))
   ${reject(`(i32.ne ${load(12)} ${C(1)})`,1)}${reject(`(i32.ne ${L('seq')} ${load(4)})`,1)}
   ${cp(add(tune(),20),add(payload(),48),41)}
   ${S('restore',C(2))}${call(0x50fda0,C(D))}${call(0x50fdd0,C(D))}
   ${bytesEqual(add(tune(),20),add(payload(),48),41)}
   ${S('restore',C(0))}${cp(C(B+400),add(tune(),20),41)}
 ))
 ${S('status',C(0))}
 )
 (if ${L('restore')} (then ${cp(ride(),snap(),0x8f0)}
  (if (i32.eq ${L('restore')} ${C(2)}) (then ${call(0x50fda0,C(D))}${call(0x50fdd0,C(D))})) ))
 (if ${L('allocated')} (then (global.set $stack ${L('oldstack')})))
 ${store(40,L('status'))}
 ;; Release/acquire synchronization with the page writer.
 (i32.atomic.store ${C(B+36)} ${L('seq')})
)`;
(async()=>{
const wabt=await wabtFactory();
const old=fs.readFileSync(path.join(root,'tools/ai-base-bridge.wat'),'utf8');
const start=old.indexOf('(local $old1'),end=old.indexOf('(block $done');
const locals=old.slice(start,end)+['seq','status','allocated','restore','cmd','ptr','tune','record','mode','car','ride','parts','sp','oldstack','tmp','i','mask','byte','offset','kind','col','savedbyte'].map(n=>`(local $d${n} i32)`).join(' ')+' (local $dvalue f32)';
const aiBody=old.slice(end).replace(/\)\s*\)\s*$/,'');
const header='(import "env" "memory" (memory 256 65536 shared)) (import "env" "stack" (global $stack (mut i32)))';
const dispatcher='(import "env" "dispatch" (func $dispatch (param i32 i32)))',gcall='(import "env" "gcall" (func $gcall (param i32 i32 i32 i32 i32)))';
const moduleSource=(imports,both)=>`(module ${header}${imports}(func (export "step") (param $cpu i32) ${locals} ${both?aiBody:''} ${body}))`;
const compile=src=>{let m=wabt.parseWat('dyno-bridge.wat',src,{threads:true,simd:true,bulk_memory:true});m.resolveNames();m.validate({threads:true,simd:true,bulk_memory:true});return Buffer.from(m.toBinary({}).buffer)};
fs.writeFileSync(path.join(root,'tools/dyno-bridge.wat'),moduleSource(dispatcher+gcall,false));
fs.writeFileSync(path.join(root,'tests/dyno-bridge.wasm'),compile(moduleSource(dispatcher+gcall,false)));
fs.writeFileSync(path.join(root,'tools/ai-bridge.wat'),moduleSource(dispatcher+gcall,true));
fs.writeFileSync(path.join(root,'tests/ai-bridge.wasm'),compile(moduleSource(dispatcher+gcall,true)));
const dummy=(from,to)=>Array.from({length:to-from},(_,i)=>`(import "unused" "${from+i}" (func))`).join('');
const bin=compile(moduleSource(dummy(0,21711)+dispatcher+dummy(21712,21725)+gcall,true));
let p=8;const leb=()=>{let v=0,s=0,x;do{x=bin[p++];v|=(x&127)<<s;s+=7}while(x&128);return v>>>0};let raw;
while(p<bin.length){const id=bin[p++],len=leb(),e=p+len;if(id===10){leb();const n=leb();raw=bin.subarray(p,p+n);break}p=e;}
fs.writeFileSync(path.join(root,'tools/ai-bridge-body.json'),JSON.stringify([...raw]));
const file=path.join(root,'extension/ai.js');let js=fs.readFileSync(file,'utf8').replace(/  const BRIDGE=Uint8Array.from\([^\n]+\);/,`  const BRIDGE=Uint8Array.from(${JSON.stringify([...raw])});`).replace(/b.types.length!==\d+/,'b.types.length!==64');fs.writeFileSync(file,js);
console.log('Dyno + AI bridge bytes',raw.length,'locals',64);
})().catch(e=>{console.error(e);process.exit(1)});
