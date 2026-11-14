'use strict';
// Authored acceptance expressions only. Every native predicate remains in place.
// Read the authored drag ownership guard, never an original game body.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(__dirname,'drag-selector.wat'),'utf8');
const common=source.slice(source.indexOf('(block $selected'),-2);
const configs=[
 {index:3174,offset:1359,originalLength:1729,car:4,context:7,companion:5,originalTypes:Array(8).fill('i32')},
 {index:7395,offset:126,originalLength:637,car:7,context:5,companion:6,originalTypes:Array(9).fill('i32')},
 {index:17404,offset:9784,originalLength:16043,car:3,cpuDriver:24,originalTypes:[...Array(10).fill('i32'),'f64','f64','f64','f32','f32','i32','i32']}
];
const c=n=>`(i32.const ${n})`,l=n=>`(local.get ${n})`,eq=(a,b)=>`(i32.eq ${a} ${b})`,guard=x=>`(br_if $reject (i32.eqz ${x}))`;
const ptr=x=>guard(`(i32.and (i32.ge_u ${x} ${c(65536)}) (i32.and (i32.lt_u ${x} ${c(0x27fff000)}) (i64.lt_u (i64.extend_i32_u ${x}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))`);
(async()=>{
 const wabt=await require(path.join(root,'research/compatibility-v011/node_modules/wabt'))();const output=[];
 for(const cfg of configs){
  const n=cfg.originalTypes.length,p=n+1,r=n+2,d=n+3,seq=n+4,rec=n+5,a=n+6;
  let expr=common.replace('(local.set 7 (i32.load offset=4 (local.get 0)))','(local.set 7 (i32.load offset=44 (local.get 2)))');
  if(cfg.index!==3174){
   // Shared native request/cancellation also serve observed road goals.
   for(const clause of [guard(eq('(i32.load (i32.const 13685080))',c(1))),guard(`(i32.ne (i32.load8_u ${c(0x89e7d8)}) ${c(0)})`),guard(eq(`(i32.load offset=40 ${l(2)})`,c(1)))]){assert(expr.includes(clause));expr=expr.replace(clause,'');}
  }
  const map={2:cfg.car,5:p,6:r,7:d,8:seq};
  expr=expr.replace(/\(local\.(get|set) ([25678])\b/g,(_,op,i)=>`(local.${op} ${map[i]}`);
  const checks=[guard(eq('(i32.load (i32.const 13685044))',c(1))),`(local.set ${rec} (i32.load offset=20 ${l(cfg.car)}))`,ptr(l(rec)),guard(eq(`(i32.load offset=4 ${l(rec)})`,c(1)))];
  // Native cancellation is goal-independent. Recovery may clear/swap the goal
  // after a valid native start; never suppress its unchanged active/skill/duration tests.
  if(cfg.index!==17404)checks.push(`(local.set ${a} (i32.load offset=1788 ${l(d)}))`,ptr(l(a)));
  const action=(id,vt)=>`(i32.and ${eq(`(i32.load ${l(a)})`,c(vt))} ${eq(`(i32.load offset=20 ${l(a)})`,c(id))})`;
  const physics=`(i32.load offset=40 ${l(cfg.car)})`,raceType='(i32.load (i32.const 9037744))';
  if(cfg.index===3174)checks.push(guard(action(2,0x7847d0)));
  else {
   const drag=`(i32.and (i32.ne (i32.load8_u ${c(0x89e7d8)}) ${c(0)}) (i32.and ${eq('(i32.load (i32.const 13685080))',c(1))} (i32.and ${eq(physics,c(1))} ${cfg.index===17404?c(1):action(2,0x7847d0)})))`;
   const driftFlags=`(i32.or (i32.load ${c(0x890114)}) (i32.or (i32.load8_u ${c(0x89e7d9)}) (i32.load ${c(0x890104)})))`;
   const goal=cfg.index===17404?c(1):`(i32.or ${action(1,0x784768)} (i32.and ${eq(raceType,c(7))} ${action(5,0x784b58)}))`;
   const road=`(i32.and (i32.eqz (i32.or (i32.load8_u ${c(0x89e7d8)}) (i32.load ${c(0x890108)}))) (i32.and (i32.or ${eq(raceType,c(1))} ${eq(raceType,c(7))}) (i32.and (i32.or ${eq(physics,c(1))} ${eq(physics,c(3))}) (i32.and (i32.or (i32.eqz ${driftFlags}) ${eq(physics,c(1))}) ${goal}))))`;
   checks.push(guard(`(i32.or ${drag} ${road})`));
  }
  if(cfg.context){checks.push(guard(eq(l(cfg.context),`(i32.add ${l(d)} ${c(84)})`)),guard(eq(`(i32.load ${l(cfg.context)})`,l(cfg.car))),ptr(l(cfg.companion)),guard(eq(l(cfg.companion),`(i32.load offset=1784 ${l(d)})`)));}
  if(cfg.cpuDriver)checks.push(guard(eq(`(i32.load offset=${cfg.cpuDriver} ${l(0)})`,l(d))));
  checks.push(guard(eq(l(seq),'(i32.load (i32.const 13684996))')));
  assert(expr.endsWith('(br $selected (i32.const 2))) (i32.const 3))'));
  expr=expr.replace('(br $selected (i32.const 2))) (i32.const 3))',checks.join('\n')+' (br $selected (i32.const 1))) (i32.const 0))');
  // Existing i32.ne remains on stack. Original type2 skips the added guard entirely.
  const acceptance=`(if (result i32) (then (i32.eqz ${expr})) (else (i32.const 0)))`;
  const types=[...cfg.originalTypes,...Array(6).fill('i32')];
  const wat=`(module (import "env" "memory" (memory 256 65536 shared)) (func (export "gate") (param i32) (result i32) (local ${types.join(' ')}) (i32.const 1) ${acceptance}))`;
  fs.writeFileSync(path.join(__dirname,`owned-nos-${cfg.index}.wat`),wat);
  const m=wabt.parseWat('owned-nos.wat',wat,{threads:true});m.validate({threads:true});const b=Buffer.from(m.toBinary({}).buffer);
  let pos=8;const u=()=>{let n=0,s=0,x;do{x=b[pos++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0};
  while(pos<b.length){const id=b[pos++],len=u(),end=pos+len;if(id===10){u();const len=u(),start=pos,groups=u();for(let j=0;j<groups;j++){u();pos++;}const header=[...b.subarray(start,pos)];assert.equal(b[pos++],65);assert.equal(b[pos++],1);const expression=[...b.subarray(pos,start+len-1)];output.push({...cfg,target:cfg.index-37,locals:types.length,header,expression});break;}pos=end;}
 }
 fs.writeFileSync(path.join(__dirname,'owned-nos.json'),JSON.stringify(output)+'\n');
})().catch(e=>{console.error(e);process.exit(1)});
