'use strict';
// Connect earlier native execution proofs to both exact downloaded artifacts.
// Byte identity is stronger than relocation-normalized instruction equality.
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {readPinned,bodies}=require('../tools/latest-native-utils.cjs');
const reviewed=bodies(readPinned('current')),next=bodies(readPinned('next'));
const hash=body=>crypto.createHash('sha256').update(body).digest('hex');
const equal=indices=>{
 for(const index of indices){
  const a=reviewed.get(index),b=next.get(index);
  assert.ok(a&&b,`Both exact artifacts contain native function ${index}`);
  assert.equal(b.length,a.length,`Native function ${index} length`);
  assert.equal(hash(b),hash(a),`Native function ${index} SHA-256`);
  assert.deepEqual(b,a,`Native function ${index} byte identity`);
 }
};
test('next nine dyno native functions are byte-identical to reviewed 2f0ddd3b',()=>{
 equal([7150,7775,8856,9171,10435,12315,12470,16355,16510]);
});
test('next engine, governor, grip and NOS consumers retain their exact reviewed native bodies',()=>{
 equal([17311,9339,11372,13094,3552,3708,3865,4022]);
});
test('next car constructor, base collision classifier and accessor retain exact reviewed bodies',()=>{
 equal([14814,19342,14030]);
});
test('next corner planner and x87 dependencies retain exact reviewed native bodies',()=>{
 equal([4653,4576,4577,4578]);
});
