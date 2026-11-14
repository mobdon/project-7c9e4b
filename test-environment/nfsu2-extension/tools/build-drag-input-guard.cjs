'use strict';
// Authored guard only. Never copies original native instructions into a release.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),B=13684992;
const c=n=>`(i32.const ${n})`,l=n=>`(local.get ${n})`,load=a=>`(i32.load ${c(a)})`,guard=x=>`(br_if $reject (i32.eqz ${x}))`,eq=(a,b)=>`(i32.eq ${a} ${b})`;
const ptr=x=>guard(`(i32.and (i32.ge_u ${x} ${c(65536)}) (i32.and (i32.lt_u ${x} ${c(0x27fff000)}) (i64.lt_u (i64.extend_i32_u ${x}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))`);
let expr=fs.readFileSync(path.join(__dirname,'drag-selector.wat'),'utf8').split('(block $selected')[1];expr='(block $selected'+expr.slice(0,-2);
// Retention is based on the already-granted native lease, not an atomic
// snapshot of a new page request. An ordinary same-value publish briefly has
// an odd sequence; falling through then lets the native manual selector write
// request3 and permanently drop AI. Keep all identity, permission, mode and
// fresh-lease checks. The main bridge still validates/times out new commands.
for(const clause of [
 '(local.set 8 (i32.load (i32.const 13684996)))',
 guard('(i32.eqz (i32.and (local.get 8) (i32.const 1)))'),
 guard(eq('(local.get 8)',load(B+4)))
]){assert.equal(expr.split(clause).length,2,clause);expr=expr.replace(clause,'');}
// Native drag update has nine locals. Only appended locals are touched.
expr=expr.replace('(local.set 7 (i32.load offset=4 (local.get 0)))','(local.set 7 (i32.load offset=44 (local.get 2)))');
const map={2:14,5:10,6:11,7:12,8:13};expr=expr.replace(/\(local\.(get|set) ([25678])\b/g,(_,op,n)=>`(local.${op} ${map[n]}`);
const checks=[guard(eq(load(B+52),c(1))),guard(eq(load(B+92),c(1))),guard(eq(`(i32.load offset=4 ${l(0)})`,l(10))),guard(eq(`(i32.load offset=556 ${l(10)})`,c(4))),guard(eq(`(i32.load offset=560 ${l(10)})`,c(4))),`(local.set 15 (i32.load offset=20 ${l(14)}))`,ptr(l(15)),guard(eq(`(i32.load offset=4 ${l(15)})`,c(1))),guard(`(i32.eqz (i32.load8_u offset=2304 ${l(15)}))`),`(local.set 16 (i32.load offset=16 ${l(0)}))`,ptr(l(16)),guard(eq(`(i32.load ${l(16)})`,c(0x602ab4)))];
expr=expr.replace('(br $selected (i32.const 2))) (i32.const 3))',checks.join('\n')+' (br $selected (i32.const 1))) (i32.const 0))');
const pre=`(local.set 10 ${load(0xd00000)}) (block $outer ${ptr(l(10)).replaceAll('$reject','$outer')} (local.set 14 (i32.load offset=4 ${l(10)}))
(if ${expr} (then
 ;; Return exactly as a no-argument native thiscall, without entering its prologue.
 (i32.store offset=32 ${l(0)} (i32.load ${l(16)}))
 (i32.store offset=16 ${l(0)} (i32.add ${l(16)} ${c(4)})) (return))))`;
const types=[...Array(7).fill('i32'),'f32','f32',...Array(7).fill('i32')];
const wat=`(module (import "env" "memory" (memory 256 65536 shared)) (func (export "run") (param i32) (local ${types.join(' ')}) ${pre}))`;
(async()=>{const w=await require(path.join(root,'research/compatibility-v011/node_modules/wabt'))();const m=w.parseWat('drag-input-guard.wat',wat,{threads:true});m.validate({threads:true});const b=Buffer.from(m.toBinary({}).buffer);fs.writeFileSync(path.join(__dirname,'drag-input-guard.wat'),wat);let p=8;const u=()=>{let n=0,s=0,x;do{x=b[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0};while(p<b.length){const id=b[p++],len=u(),end=p+len;if(id===10){u();const n=u(),start=p,groups=u();for(let j=0;j<groups;j++){u();p++;}const cfg={target:19197-37,index:19197,originalLength:1372,originalTypes:types.slice(0,9),header:[...b.subarray(start,p)],prefix:[...b.subarray(p,start+n-1)]};fs.writeFileSync(path.join(__dirname,'drag-input-guard.json'),JSON.stringify(cfg)+'\n');break;}p=end;}})().catch(e=>{console.error(e);process.exit(1)});
