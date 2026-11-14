'use strict';
// Authored prefix only. Original native heat update is preserved in each exact
// pinned module. -1 is its own disabled sentinel; no RPM/torque/NOS edits.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),B=0xd0d100,M=0x3749414e;
const c=n=>`(i32.const ${n})`,l=n=>`(local.get ${n})`,g=n=>`(i32.load ${c(n)})`,eq=(a,b)=>`(i32.eq ${a} ${b})`,guard=x=>`(br_if $native (i32.eqz ${x}))`;
const ptr=x=>guard(`(i32.and (i32.eqz (i32.and ${x} ${c(3)})) (i32.and (i32.ge_u ${x} ${c(65536)}) (i32.and (i32.lt_u ${x} ${c(0x27fff000)}) (i64.lt_u (i64.extend_i32_u ${x}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096))))))`);
// Runtime CPU storage is outside the emulated guest heap. Bound its full state
// against actual memory with widened arithmetic; guest objects keep their cap.
const cpuPtr=x=>guard(`(i32.and (i32.eqz (i32.and ${x} ${c(3)})) (i32.and (i32.ge_u ${x} ${c(65536)}) (i64.le_u (i64.add (i64.extend_i32_u ${x}) (i64.const 344)) (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)))))`);
const orig=['i32','i32','i32','i32','i32','f32','i32','f32','i32','i32','i32','f32','i32','f64','f64','f64','f32','f64','f64'];
const checks=[guard(`(i32.gt_u (memory.size) ${c((B+104)>>>16)})`),guard(eq(g(B),c(M))),guard(eq(g(B+28),c(M))),`(local.set 20 ${g(B+4)})`,guard(`(i32.eqz (i32.and ${l(20)} ${c(1)}))`),guard(eq(g(B+100),c(1))),guard(`(i32.lt_u ${g(B+48)} ${c(180)})`),guard(eq(g(0x8654a4),c(6))),guard(eq(g(0xd00030),c(1))),guard(eq(`(i32.load8_u ${c(0x89e7d8)})`,c(1))),
 // Online/LAN requires the existing literal network opt-in; local identity stays mandatory.
 `(if (i32.ne ${g(B+84)} ${c(1)}) (then ${[0x866a14,0x8669f4].map(a=>guard(`(i32.eqz ${g(a)})`)).join(' ')} ${guard(`(i32.eqz (i32.and ${g(0x850078)} ${c(0x208)}))`)} ${guard(`(i32.eqz (i32.load8_u ${c(0x89cf69)}))`)}))`,
 `(local.set 21 ${g(0xd00000)})`,ptr(l(21)),guard(eq(l(21),g(B+12))),guard(`(i32.eqz (i32.load offset=16 ${l(21)}))`),
 `(local.set 22 (i32.load offset=4 ${l(21)}))`,ptr(l(22)),guard(eq(l(22),g(B+16))),guard(eq(`(i32.load offset=40 ${l(22)})`,c(1))),
 `(local.set 23 ${g(0x890118)})`,ptr(l(23)),guard(eq(l(23),g(B+20))),guard(eq(`(i32.load ${l(23)})`,c(4))),
 `(local.set 26 (i32.load offset=20 ${l(22)}))`,ptr(l(26)),guard(eq(`(i32.load offset=4 ${l(26)})`,c(1))),guard(`(i32.eqz (i32.load8_u offset=2304 ${l(26)}))`),
 `(local.set 24 (i32.load offset=52 ${l(22)}))`,ptr(l(24)),`(local.set 25 (i32.load offset=72 ${l(24)}))`,ptr(l(25)),cpuPtr(l(0)),guard(eq(`(i32.load offset=4 ${l(0)})`,l(25))),
 `(local.set 27 (f32.load offset=140 ${l(25)}))`,guard(`(i32.and (f32.ge ${l(27)} (f32.const -1)) (f32.lt ${l(27)} (f32.const 1.2)))`),
 // Do not revive a blown engine or race that has already ended. Preserve native
 // CPU return/flags/stack behavior by entering the unchanged body after the store.
 guard(eq(l(20),g(B+4))),`(f32.store offset=140 ${l(25)} (f32.const -1))`];
const types=[...orig,...Array(7).fill('i32'),'f32'];
const wat=`(module (import "env" "memory" (memory 0 65536 shared)) (func (export "run") (param i32) (local ${types.join(' ')}) (block $native ${checks.join('\n')})))`;
(async()=>{const w=await require(path.join(root,'research/compatibility-v011/node_modules/wabt'))();const m=w.parseWat('drag-overheat.wat',wat,{threads:true});m.validate({threads:true});const b=Buffer.from(m.toBinary({}).buffer);fs.writeFileSync(path.join(__dirname,'drag-overheat.wat'),wat);let p=8;const u=()=>{let n=0,s=0,x;do{x=b[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0};while(p<b.length){const id=b[p++],len=u(),end=p+len;if(id===10){u();const n=u(),start=p,groups=u();for(let j=0;j<groups;j++){u();p++;}const cfg={target:2459-37,index:2459,originalLength:2024,originalTypes:orig,header:[...b.subarray(start,p)],prefix:[...b.subarray(p,start+n-1)],commandOffset:100};fs.writeFileSync(path.join(__dirname,'drag-overheat.json'),JSON.stringify(cfg)+'\n');fs.writeFileSync(path.join(root,'tests/drag-overheat-prefix.wasm'),b);break;}p=end;}})().catch(e=>{console.error(e);process.exit(1)});
