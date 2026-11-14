/* Exact-profile authored contact extension. Mode 4 is local filtering of
 * current Online/LAN race participants, never a peer or packet modification. */
'use strict';
const assert=require('node:assert/strict');
const B=0xd0d1c0,A=0xd0d100;
const load=n=>`(i32.load (i32.const ${B+n}))`;
const G=n=>`(i32.load (i32.const ${n}))`;
function replaceOnce(s,a,b){assert.equal(s.split(a).length,2,'Expected one authored contact anchor');return s.replace(a,b);}
function transform(source){
 let s=replaceOnce(source,`(i32.gt_u ${load(36)} (i32.const 3))`,`(i32.gt_u ${load(36)} (i32.const 4))`);
 const start=s.indexOf('  (if (i32.or (i32.or (i32.and'),end=s.indexOf('  (local.set $p ',start);
 assert(start>=0&&end>start);
 const old=s.slice(start,end);
 const guard=`  ;; Mode 4 is a separate race route, under the existing network permission.
  (if (i32.eq ${load(36)} (i32.const 4))
   (then
    (br_if $ordinary (i32.ne ${G(A+84)} (i32.const 1)))
    (local.set $most (i32.and ${G(0x850078)} (i32.const 520)))
    (br_if $ordinary (i32.eqz (i32.or (i32.eq (local.get $most) (i32.const 8)) (i32.eq (local.get $most) (i32.const 512)))))
    (br_if $ordinary (i32.ne ${G(0x89e7b0)} (i32.const 1))))
   (else
${old}   ))
`;
 s=s.slice(0,start)+guard+s.slice(end);
 const classify=s.indexOf('  (if ',s.indexOf(';; Online mode bits:'));
 const classifyEnd=s.indexOf('  (local.set $pair ',classify);
 assert(classify>=0&&classifyEnd>classify);
 const original=s.slice(classify,classifyEnd);
 const roster=`  (if (i32.eq ${load(36)} (i32.const 4))
   (then
    ;; GRaceStatus has six inline records at +0x30, stride 0x1f0, sorted
    ;; pointers at +0xbd0 and count +0x24. Every contact needs both members.
    (local.set $most (i32.load offset=36 (local.get $race)))
    (br_if $ordinary (i32.lt_u (local.get $most) (i32.const 2)))
    (br_if $ordinary (i32.gt_u (local.get $most) (i32.const 6)))
    (local.set $pair (i32.const 0)) (local.set $stack (i32.const 0))
    (loop $race_members
     (local.set $wall (i32.load offset=3024 (i32.add (local.get $race) (i32.shl (local.get $pair) (i32.const 2)))))
     (br_if $ordinary (i32.lt_u (local.get $wall) (i32.add (local.get $race) (i32.const 48))))
     (br_if $ordinary (i32.gt_u (local.get $wall) (i32.add (local.get $race) (i32.const 2528))))
     (br_if $ordinary (i32.rem_u (i32.sub (local.get $wall) (i32.add (local.get $race) (i32.const 48))) (i32.const 496)))
     (if (i32.eq (i32.load (local.get $wall)) (local.get $car)) (then
      (br_if $ordinary (i32.ne (i32.load offset=28 (local.get $car)) (local.get $wall)))
      (local.set $stack (i32.add (local.get $stack) (i32.const 1)))))
     (if (i32.eq (i32.load (local.get $wall)) (local.get $face)) (then
      (br_if $ordinary (i32.ne (i32.load offset=28 (local.get $face)) (local.get $wall)))
      (local.set $stack (i32.add (local.get $stack) (i32.const 8)))))
     (local.set $pair (i32.add (local.get $pair) (i32.const 1)))
     (br_if $race_members (i32.lt_u (local.get $pair) (local.get $most))))
    (br_if $ordinary (i32.ne (local.get $stack) (i32.const 9)))
    (local.set $most (i32.const 0)))
   (else
${original}   ))
`;
 return s.slice(0,classify)+roster+s.slice(classifyEnd);
}
module.exports={transform};
