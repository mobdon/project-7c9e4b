'use strict';
// Current-build-only authored bridge transformation. Native 401950 precedence:
// drag/forcedrag suppress drift; 890114, 89e7d9 or 890104 then select drift.
const assert=require('node:assert/strict');
const c=n=>`(i32.const ${n})`,load=a=>`(i32.load ${c(a)})`,byte=a=>`(i32.load8_u ${c(a)})`;
const drift=`(i32.and (i32.eqz (i32.or ${byte(0x89e7d8)} ${load(0x890108)})) (i32.ne (i32.or ${load(0x890114)} (i32.or ${byte(0x89e7d9)} ${load(0x890104)})) ${c(0)}))`;
const ptr=x=>`(i32.and (i32.ge_u ${x} ${c(65536)}) (i32.and (i32.lt_u ${x} ${c(0x27fff000)}) (i64.lt_u (i64.extend_i32_u ${x}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))`;
const normal=`(i32.and (i32.eq (i32.load offset=4 (local.get $rec)) ${c(1)}) (i32.eqz (i32.load8_u offset=2304 (local.get $rec))))`;
const driver='(i32.load offset=44 (local.get $car))';
function transform(source){
 const replace=(old,next)=>{assert.equal(source.split(old).length,2,'Unique drift insertion anchor');source=source.replace(old,next);};
 const stale='  (br_if $invalid (i32.gt_u (local.get $stale) (i32.const 179)))';
 replace(stale,`  ;; Normal player drift requires native full physics before acquisition/while owned.
  (if ${drift} (then
   (local.set $rec (i32.load offset=20 (local.get $car)))
   (br_if $invalid (i32.eqz ${ptr('(local.get $rec)')}))
   (if ${normal} (then
    (br_if $invalid (i32.ne (i32.load offset=40 (local.get $car)) ${c(1)}))
    (br_if $invalid (i32.eqz (i32.load8_u offset=1472 (local.get $car))))
    (if (i32.eq (local.get $kind) ${c(3)}) (then
     (br_if $invalid (i32.eqz ${ptr(driver)}))
     (br_if $invalid (i32.ne (i32.load ${driver}) ${c(0x785370)}))
     (br_if $invalid (i32.ne (i32.load offset=4 ${driver}) (local.get $car)))))))))
${stale}`);
 const on='     (call $gcall (local.get $cpu) (i32.const 6270496) (local.get $p) (i32.const 0) (i32.const 0))';
 replace(on,`     ;; $kind is no longer needed as the pre-acquisition driver kind in this branch.
     (local.set $kind (i32.and ${drift} ${normal}))
${on}
     (if (local.get $kind) (then (block $driftPhysics
      (br_if $driftPhysics (i32.ne (i32.load offset=36 (local.get $car)) ${c(3)}))
      (br_if $driftPhysics (i32.eqz ${ptr(driver)}))
      (br_if $driftPhysics (i32.ne (i32.load ${driver}) ${c(0x785370)}))
      (br_if $driftPhysics (i32.ne (i32.load offset=4 ${driver}) (local.get $car)))
      (i32.store ${c(13685048)} ${c(1)})
      (call $gcall (local.get $cpu) ${c(0x5f46a0)} (local.get $car) ${c(1)} ${c(13685048)})
      (local.set $kind ${c(2)})
     )))`);
 const result='(i32.or (i32.eqz (i32.load8_u (i32.const 0x89e7d8)))\n        (i32.eq (i32.load offset=40 (local.get $car)) (i32.const 1)))';
 replace(result,`(i32.and ${result} (i32.or (i32.eqz (local.get $kind)) (i32.and (i32.eq (local.get $kind) ${c(2)}) (i32.eq (i32.load offset=40 (local.get $car)) ${c(1)}))))`);
 return source;
}
module.exports={transform,drift};
