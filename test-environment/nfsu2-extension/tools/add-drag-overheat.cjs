'use strict';
const assert=require('node:assert/strict');
function transform(source){
 const anchor='(block $mailboxes';assert.equal(source.split(anchor).length,2);
 // Reserve command+100 only for the two newly reviewed modern profiles.
 // Refuse occupied memory before the normal native bridge publishes its marker.
 return source.replace(anchor,anchor+'\n(if (i32.ne (i32.load (i32.const 13685020)) (i32.const 0x3749414e)) (then (br_if $mailboxes (i32.load (i32.const 13685092)))))');
}
module.exports={transform};
