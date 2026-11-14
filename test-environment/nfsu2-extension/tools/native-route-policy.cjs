'use strict';
// Authored exact8ab read-only policy snapshot; no original native code here.
const assert=require('node:assert/strict'),base=require('../../work-forward-online-8ab/tools/sampler.cjs'),P={ABI:{bitmap:0x29783e80,gwin:0x2978be80,highLow:0x50000000,highCeiling:0x7ffe0000,types:0x8a1ccc,typeSize:0x890,typeFlag:0x88a,grade:0x14},EXPECTED:{0x7a4740:[12,10.6,9.3,8],0x7a4750:[3.7,3.4,3.1,2.8],0x7a4760:[10,9,8,6],0x7a4770:[3,3,3,2],0x7a51b8:[9.8],0x783c8c:[60]}};
const B=base.B,MAGIC=0x31505746,OFF={magic:612,request:616,grip:620,decel:628};
const names=['generation','car','ride','types','type','grade','flag','entry','grip','decel'].map(n=>'fwg_policy_'+n);
const c=n=>`(i32.const ${n})`,l=n=>`(local.get $${n})`,g=n=>`(global.get $fwg_policy_${n})`,set=(n,v)=>`(global.set $fwg_policy_${n} ${v})`;
const u=(p,o=0)=>`(i32.load offset=${o} ${p})`,byte=(p,o=0)=>`(i32.load8_u offset=${o} ${p})`,add=(p,n)=>`(i32.add ${p} ${typeof n==='number'?c(n):n})`;
const eq=(a,b)=>`(i32.eq ${a} ${b})`,ne=(a,b)=>`(i32.ne ${a} ${b})`,not=x=>`(i32.eqz ${x})`,or=(...v)=>v.reduce((a,b)=>`(i32.or ${a} ${b})`),ret=x=>`(if ${x} (then (return ${c(0)})))`;
const call=(n,...a)=>`(call $fwg_policy_${n} ${a.join(' ')})`,span=(p,n)=>call('range',p,c(n)),m=o=>u(c(B),o);
const bits=v=>{const b=Buffer.alloc(4);b.writeFloatLE(v);return b.readUInt32LE();};
const constants=Object.entries(P.EXPECTED).flatMap(([p,vs])=>vs.map((v,i)=>[Number(p)+4*i,bits(v)]));
function helpers(){return `
 ${names.map(n=>`(global $${n} (mut i32) (i32.const 0))`).join('\n')}
 (func $fwg_policy_range (param $p i32) (param $n i32) (result i32) (local $page i32) (local $end i32)
  (if (i32.lt_u ${l('p')} ${c(P.ABI.highLow)}) (then (return (call $fwg_span ${l('p')} ${l('n')}))))
  ${ret(or(not(l('n')),`(i64.gt_u (i64.add (i64.extend_i32_u ${l('p')}) (i64.extend_i32_u ${l('n')})) (i64.const ${P.ABI.highCeiling}))`,not(`(call $fwg_host ${c(P.ABI.highCeiling-1)} ${c(1)})`),not(`(call $fwg_host ${c(P.ABI.gwin)} ${c(8)})`)))}
  ${ret(or(ne(`(i32.atomic.load ${c(P.ABI.gwin)})`,c(P.ABI.highLow)),ne(`(i32.atomic.load ${c(P.ABI.gwin+4)})`,c(P.ABI.highCeiling))))}
  (local.set $page (i32.shr_u ${l('p')} ${c(14)})) (local.set $end (i32.shr_u (i32.sub ${add(l('p'),l('n'))} ${c(1)}) ${c(14)}))
  (loop $pages ${ret(not(`(i32.and (i32.load8_u (i32.add ${c(P.ABI.bitmap)} (i32.shr_u ${l('page')} ${c(3)}))) (i32.shl ${c(1)} (i32.and ${l('page')} ${c(7)})))`))}
   (local.set $page ${add(l('page'),1)}) (br_if $pages (i32.le_u ${l('page')} ${l('end')}))) ${c(1)})
 (func $fwg_policy_constants (result i32)
  ${constants.map(([p,v])=>ret(or(not(span(c(p),4)),ne(u(c(p)),c(v))))).join('\n')} ${c(1)})
 (func $fwg_policy_current (result i32)
  ${ret(or(not(g('generation')),ne(g('generation'),m(8)),ne(m(OFF.magic),c(MAGIC)),ne(m(OFF.request),g('generation')),ne(m(OFF.grip),g('grip')),ne(m(OFF.decel),g('decel')),not(call('constants'))))}
  ${ret(or(ne(m(36),g('car')),not(span(add(g('car'),16),4)),not(span(g('ride'),24)),not(span(c(P.ABI.types),4)),not(span(g('entry'),P.ABI.typeFlag+1))))}
  ${ret(or(ne(u(add(g('car'),16)),g('ride')),ne(u(c(P.ABI.types)),g('types')),ne(u(g('ride')),g('type')),ne(byte(g('ride'),P.ABI.grade),g('grade')),ne(byte(g('entry'),P.ABI.typeFlag),g('flag'))))} ${c(1)})
 (func $fwg_policy_capture (param $car i32) (param $seq i32) (result i32) (local $ride i32) (local $types i32) (local $type i32) (local $grade i32) (local $entry i32) (local $flag i32)
  ${set('generation',c(0))} ${ret(or(not(span(add(l('car'),16),4)),not(span(c(P.ABI.types),4)),not(call('constants'))))}
  (local.set $ride ${u(add(l('car'),16))}) ${ret(or(`(i32.and ${l('ride')} ${c(3)})`,not(span(l('ride'),24))))}
  (local.set $type ${u(l('ride'))}) (local.set $grade ${byte(l('ride'),P.ABI.grade)}) ${ret(or(`(i32.gt_u ${l('grade')} ${c(3)})`,`(i32.gt_u ${l('type')} ${c(255)})`))}
  (local.set $types ${u(c(P.ABI.types))}) ${ret(or(`(i32.and ${l('types')} ${c(3)})`,not(span(l('types'),4))))}
  (local.set $entry ${add(l('types'),`(i32.mul ${l('type')} ${c(P.ABI.typeSize)})`)}) ${ret(not(span(l('entry'),P.ABI.typeFlag+1)))}
  (local.set $flag ${byte(l('entry'),P.ABI.typeFlag)})
  ${['car','ride','types','type','grade','entry','flag'].map(n=>set(n,l(n))).join('\n')}
  ${set('grip',u(add(`(if (result i32) ${l('flag')} (then ${c(0x7a4770)}) (else ${c(0x7a4750)}))`,`(i32.shl ${l('grade')} ${c(2)})`)))}
  ${set('decel',u(add(`(if (result i32) ${l('flag')} (then ${c(0x7a4760)}) (else ${c(0x7a4740)}))`,`(i32.shl ${l('grade')} ${c(2)})`)))}
  (i32.store offset=${OFF.magic} ${c(B)} ${c(MAGIC)}) (i32.store offset=${OFF.request} ${c(B)} ${l('seq')})
  (i32.store offset=${OFF.grip} ${c(B)} ${g('grip')}) (i32.store offset=${OFF.decel} ${c(B)} ${g('decel')}) ${set('generation',l('seq'))}
  ${call('current')})
 `;}
function once(s,a,b){assert.equal(s.split(a).length-1,1,a);return s.replace(a,b);}
function fragment(){
 let s=base.fragment();
 // TrackInfo is guest BUN data. Only its140-byte metadata span uses the
 // existing verified guest-window reader; every other route span stays exact.
 const trackSpan='(local.set $ti (i32.load offset=0 (i32.const 8928684))) (if (i32.eqz (call $fwg_span (local.get $ti) (i32.const 140))) (then (return (i32.const 4))))';
 s=once(s,trackSpan,trackSpan.replace('(call $fwg_span ','(call $fwg_policy_range '));
 // The base sampler folded these cells before its lookup relocation. Bind
 // both guard/load pairs to the exact8ab runtime lookup, not the older3bdd one.
 for(const [from,to]of [[678642880,678649664],[678645504,678652288]]){const before='(i32.const '+from+')';assert.equal(s.split(before).length-1,2);s=s.replaceAll(before,'(i32.const '+to+')');}
 const marker='(local.set $status (call $fwg_nodes (local.get $r))) (if (local.get $status) (then (return (local.get $status))))';
 s=once(s,marker,marker+'\n (if (i32.eqz (call $fwg_policy_capture (i32.load offset=36 (i32.const '+B+')) (local.get $seq))) (then (return (i32.const 10))))');
 const finish='(local.set $finish (i32.add (local.get $start) (i32.const 1)))';
 s=once(s,finish,'(if (i32.gt_u (local.get $start) (i32.const 0)) (then (local.set $start (i32.sub (local.get $start) (i32.const 1)))))\n '+finish);
 const a=s.indexOf('(func $fwg_fresh '),z=s.indexOf('(func $fwg_constants ',a);assert(a>=0&&z>a);let fresh=s.slice(a,z);const at=fresh.lastIndexOf('(i32.const 1))');assert(at>=0);fresh=fresh.slice(0,at)+ret(not(call('current')))+' '+fresh.slice(at);s=s.slice(0,a)+fresh+s.slice(z);
 const captureStart=s.indexOf('(func $fwg_capture '),captureEnd=s.indexOf('(func $fwg_poll ',captureStart);assert(captureStart>=0&&captureEnd>captureStart);
 let capture=s.slice(captureStart,captureEnd);assert.equal((capture.match(/\(f32.const 184\)/g)||[]).length,2);capture=capture.replaceAll('(f32.const 184)','(f32.const 512)');
 return helpers()+s.slice(0,captureStart)+capture+s.slice(captureEnd);
}
module.exports={...base,fragment,globalNames:[...base.globalNames,...names],policyGlobalNames:names,OFF,MAGIC};
