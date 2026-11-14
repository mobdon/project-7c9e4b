'use strict';
// Authored bridge transformation. Applies only to the reviewed modern profiles.
// Native input mode4 owns its complete On/Off and callback registration lifecycle.
const assert=require('node:assert/strict');
const B=13684992,c=n=>`(i32.const ${n})`,g=o=>`(i32.load ${c(B+o)})`,s=(o,v)=>`(i32.store ${c(B+o)} ${v})`,p=o=>`(i32.load offset=${o} (local.get $p))`;
const drag='(i32.load8_u (i32.const 0x89e7d8))';
const setMode=`(call $gcall (local.get $cpu) ${c(0x605c70)} (local.get $p) ${c(1)} ${c(B+56)})`;
const off=`(call $gcall (local.get $cpu) ${c(0x5faf10)} (local.get $p) ${c(0)} ${c(0)})`;
const on=`(call $gcall (local.get $cpu) ${c(0x5fae20)} (local.get $p) ${c(0)} ${c(0)})`;
const manual=x=>`(i32.or (i32.eq ${x} ${c(2)}) (i32.eq ${x} ${c(3)}))`;
function transform(source){
 let out=source;const replace=(a,b,n=1)=>{assert.equal(out.split(a).length,n+1,a);out=out.split(a).join(b);};
 const mailbox='(block $mailboxes';
 replace(mailbox,mailbox+`\n(if (i32.ne ${g(28)} ${c(0x3749414e)}) (then (br_if $mailboxes (i32.or ${g(92)} ${g(96)}))))`);
 // B+92 is this game's input-mode lease marker; B+96 is the saved request2/3.
 const before=' (local.set $owned (i32.load (i32.const 13685028)))';
 replace(before,` ;; Never reacquire after a native mode transition while the page is still ON.
 (if (i32.and (i32.ne ${g(92)} ${c(0)}) (i32.ne ${g(36)} ${c(0)})) (then
  (if (i32.and (i32.eq ${g(32)} (local.get $p))
    (i32.and (i32.ge_u (local.get $p) ${c(65536)}) (i32.and (i32.lt_u (local.get $p) ${c(0x27fff000)}) (i64.lt_u (i64.extend_i32_u (local.get $p)) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096))))))
   (then (if (i32.or (i32.ne ${p(556)} ${c(4)}) (i32.ne ${p(560)} ${c(4)}))
    (then (local.set $want ${c(0)}) ${s(72,'(local.get $car)')})))
   (else (local.set $want ${c(0)})))))\n${before}`);
 const kind='(i32.eq (local.get $kind) (i32.const 1))';
 replace(kind,`(i32.or ${kind} (i32.and ${drag} (i32.eq (local.get $kind) ${c(2)})))`);
 const rec='     (if (i32.and (i32.ge_u (local.get $rec)';
 const i=out.indexOf(rec);assert(i>0);
 out=out.slice(0,i)+`     ;; Do not take over scripted/native AI or any non-player record.
     (if ${drag} (then
      (br_if $acquire (i32.ne (i32.load offset=4 (local.get $rec)) ${c(1)}))
      (br_if $acquire (i32.load8_u offset=2304 (local.get $rec)))
      (br_if $acquire (i32.eqz ${manual(p(556))}))
      (br_if $acquire (i32.eqz ${manual(p(560))}))))\n`+out.slice(i);
 replace(on,`(if ${drag} (then
      ${s(96,p(560))} ${s(92,c(1))}
      (i32.store offset=560 (local.get $p) ${c(4)})
      ${s(56,c(4))} ${setMode}
     ) (else ${on}))`);
 // Native SetInputMode exits4 by calling Off itself. Do not double-delete a driver.
 const oldRelease=`(then ${off} ${s(56,c(2))} ${setMode})`;
 const release=`(then
  (if (i32.eq ${g(92)} ${c(1)}) (then
   ;; CAS-style restore: a new native request belongs to the game, not to us.
   (if (i32.eq ${p(560)} ${c(4)}) (then (i32.store offset=560 (local.get $p) ${g(96)})))
   ;; A different current mode has already run its own native controller handoff.
   ;; In particular4->5 tears down our driver and builds a fresh native AI driver3.
   ;; Do not call Off against that replacement, even though its kind is still3.
   (if (i32.eq ${p(556)} ${c(4)})
    (then ${s(56,g(96))} ${setMode}))
  ) (else ${off} ${s(56,c(2))} ${setMode}))
  ${s(92,c(0))} ${s(96,c(0))})`;
 replace(oldRelease,release,2);
 // Run rollback even when native On rejected its driver or physics construction.
 const releaseCondition='(if (i32.eq (local.get $kind) (i32.const 3))\n        (then';
 replace(releaseCondition,`(if (i32.or ${g(92)} (i32.eq (local.get $kind) ${c(3)}))\n        (then`);
 const failureCondition='(if (i32.eq (i32.load offset=36 (local.get $car)) (i32.const 3))\n        (then';
 replace(failureCondition,`(if (i32.or ${g(92)} (i32.eq (i32.load offset=36 (local.get $car)) ${c(3)}))\n        (then`);
 const clear=s(80,c(0));replace(clear,`${clear} ${s(92,c(0))} ${s(96,c(0))}`);
 return out;
}
module.exports={transform};
