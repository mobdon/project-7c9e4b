'use strict';
// Keep the native Drift pace selected by 0x4172d0. Do not suppress its update
// or the port's catchup wrapper; reject only the later extension multiplication.
const assert=require('node:assert/strict'),{drift}=require('./add-drift-physics.cjs');
function transform(source){
 const anchor='  (br_if $done (i32.load8_u (i32.const 0x89e7d8)))';
 assert.equal(source.split(anchor).length,2,'Unique native pace mode guard');
 return source.replace(anchor,anchor+'\n  ;; Exact native Drift predicate; real/forced Drag keeps precedence.\n  (br_if $done '+drift+')');
}
module.exports={transform};
