'use strict';
// Authored expression only. No original game bytes are embedded or redistributed.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const load=a=>`(i32.load (i32.const ${a}))`,eq=(a,b)=>`(i32.eq ${a} ${b})`,c=n=>`(i32.const ${n})`,l=n=>`(local.get ${n})`;
const guard=x=>`(br_if $reject (i32.eqz ${x}))`;
const ptr=x=>guard(`(i32.and (i32.ge_u ${x} ${c(65536)}) (i32.and (i32.lt_u ${x} ${c(0x27fff000)}) (i64.lt_u (i64.extend_i32_u ${x}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))`);
const B=13684992,at=o=>load(B+o);
const checks=[guard(eq(at(0),c(927547726))),guard(eq(at(28),c(927547726))),`(local.set 8 ${at(4)})`,guard(`(i32.eqz (i32.and ${l(8)} ${c(1)}))`),guard(`(i32.lt_u ${at(48)} ${c(180)})`),guard(`(i32.and (i32.ge_u ${at(8)} ${c(1)}) (i32.le_u ${at(8)} ${c(2)}))`),guard(eq(at(88),c(1))),guard(eq(load(8803492),c(6))),guard(eq(load(13631536),c(1))),guard(`(i32.ne (i32.load8_u ${c(0x89e7d8)}) ${c(0)})`),
`(if (i32.ne ${at(84)} ${c(1)}) (then ${guard(`(i32.eqz (i32.and ${load(8716408)} ${c(520)}))`)} ${guard(`(i32.eqz ${load(8808980)})`)} ${guard(`(i32.eqz ${load(8808948)})`)} ${guard(`(i32.eqz (i32.load8_u ${c(0x89cf69)}))`)}))`,
// l2 is the native initializer's car, l4 its racer record. Native code owns these locals.
ptr(l(2)),guard(eq(at(36),l(2))),guard(eq(at(16),l(2))),guard(eq(`(i32.load offset=36 ${l(2)})`,c(3))),guard(eq(`(i32.load offset=40 ${l(2)})`,c(1))),guard(`(i32.ne (i32.load8_u offset=1472 ${l(2)}) ${c(0)})`),
`(local.set 5 ${load(13631488)})`,ptr(l(5)),guard(eq(at(32),l(5))),guard(eq(at(12),l(5))),guard(eq(`(i32.load offset=4 ${l(5)})`,l(2))),guard(`(i32.eqz (i32.load offset=16 ${l(5)}))`),
`(local.set 6 ${load(8978712)})`,ptr(l(6)),guard(eq(at(40),l(6))),guard(eq(at(20),l(6))),guard(eq(`(i32.load ${l(6)})`,c(4))),
`(local.set 7 (i32.load offset=4 ${l(0)}))`,ptr(l(7)),guard(eq(`(i32.load offset=44 ${l(2)})`,l(7))),guard(eq(`(i32.load offset=4 ${l(7)})`,l(2))),guard(eq(`(i32.load ${l(7)})`,c(0x785370))),guard(eq(l(8),at(4)))];
// Result defaults to player action3. Success yields opponent action2. No memory writes/calls.
const expr=`(block $selected (result i32) (block $reject ${checks.join('\n')} (br $selected ${c(2)})) ${c(3)})`;
const wat=`(module (import "env" "memory" (memory 256 65536 shared)) (func (export "select") (param i32) (result i32) (local i32 i32 i32 i32 i32 i32 i32 i32) ${expr}))`;
(async()=>{const w=await require(path.join(root,'research/compatibility-v011/node_modules/wabt'))();const m=w.parseWat('selector.wat',wat,{threads:true});m.validate({threads:true});const b=Buffer.from(m.toBinary({}).buffer);fs.writeFileSync(path.join(root,'tools/drag-selector.wat'),wat);fs.writeFileSync(path.join(root,'tests/drag-selector.wasm'),b);let p=8;const u=()=>{let n=0,s=0,x;do{x=b[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0};while(p<b.length){const id=b[p++],len=u(),end=p+len;if(id===10){u();const len=u(),body=b.subarray(p,p+len);const profile={target:19277-37,offset:251,originalLength:408,locals:8,expression:[...body.subarray(3,body.length-1)]};fs.writeFileSync(path.join(root,'tools/drag-selector.json'),JSON.stringify(profile)+'\n');break;}p=end;}})();
