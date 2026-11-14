// Fresh4c derivative: buildFixture only assembles bytes; instantiateFixture is defined for a separately reviewed future runtime condition.
// TEST-ONLY v12 derivative. Original code instructions and element identities retained.
'use strict';
// Adapted from native-parity-fixture.cjs: original element section retained for exact COM Present callback dispatch. All unselected function bodies still trap.
// Private offline fixture only. Original function indices and selected complete
// body bytes are retained; all unspecified functions trap. Original element
// identities are retained for selected native callback dispatch. No original
// start/data initializer, JavaScript host implementation or transport is included.
const assert = require('node:assert/strict');
const path = require('node:path');
const {parse} = require(path.resolve(__dirname,'../../research/guarded-hosted-join-fixture/adapter.cjs'));
const C = require(path.resolve(__dirname,'../../work-online-v0426/native-review/port-core.cjs'));
const HEADER = Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]);
const text = value => Buffer.concat([C.leb(Buffer.byteLength(value)), Buffer.from(value)]);
const functionName = id => 'f' + id;
const vector = entries => Buffer.concat([C.leb(entries.length), ...entries]);
const zero = Buffer.from([0, 0, 11]); // Empty locals, unreachable, end.

function buildFixture(source, actualIds, stubIds, {maxRecorderArguments = 4,entryHooks={},originalAliases={}} = {}) {
  const parsed = parse(source), inspected = C.I.inspect(source, parsed.imtypes.length);
  assert.equal(parsed.imtypes.length, 38, 'Pinned609 imported function count');
  const allTypes = [...parsed.imtypes, ...parsed.ft];
  const aliases=Object.entries(originalAliases).map(([name,id],offset)=>{
    assert.equal(typeof name,'string');assert(name.length>0);assert(Number.isInteger(id)&&inspected.bodies.has(id));
    return{name,sourceFunction:id,index:allTypes.length+offset,type:allTypes[id],sourceBodySha256:C.sha(inspected.bodies.get(id))};
  });
  const real = new Set(actualIds), stubs = new Set(stubIds);
  for (const id of real) {
    assert(id >= parsed.imtypes.length && id < allTypes.length, 'Real function range');
    assert(!stubs.has(id));
    assert(!C.decode(inspected.bodies.get(id)).some(op =>
      op.operands.some(arg => arg.role === 'call' && arg.value === 0)),
    'Selected native body must not call fixture recorder index0');
  }
  const type = inspected.sections.find(section => section.id === 1);
  const count = C.integer(type.data, 0);
  // Recorder receives original callee id and a bounded number of integer parameters.
  const recorderType = Buffer.from([0x60, maxRecorderArguments + 1,
    ...Array(maxRecorderArguments + 1).fill(0x7f), 1, 0x7f]);
  const typeSection = C.sec(1, Buffer.concat([C.leb(count.value + 1), type.data.subarray(count.end), recorderType]));
  const importSection = C.sec(2, vector([
    Buffer.concat([text('env'), text('memory'), Buffer.from([2, 3]), C.leb(11264), C.leb(65536)]),
    Buffer.concat([text('fixture'), text('call'), Buffer.from([0]), C.leb(count.value)])
  ]));
  const functionSection = C.sec(3, vector([...allTypes.slice(1),...aliases.map(alias=>alias.type)].map(C.leb)));
  const bodies = [];
  const instrumentedFunctions={};
  function instrument(id,original){
    const hooks=entryHooks[id];if(!hooks)return original;
    assert(real.has(id));assert.equal(parsed.types[allTypes[id]].args[0],127);
    let at=C.integer(original,0).end;const groups=C.integer(original,0).value;
    for(let i=0;i<groups;i++){const n=C.integer(original,at);at=n.end+1;}
    const callback=code=>code?Buffer.concat([Buffer.from([0x41]),C.sleb(code),Buffer.from([0x20,0,...Array(maxRecorderArguments-1).fill([0x41,0]).flat(),0x10,0,0x1a])]):Buffer.alloc(0);
    const sites=[{at,code:hooks.before,kind:'entry'}];
    for(const op of C.decode(original))if(op.opcode===15)sites.push({at:op.at,code:hooks.after,kind:'before-original-return'});else if(op.opcode===18||op.opcode===19)sites.push({at:op.at,code:hooks.tail,kind:'before-original-tail-transfer'});
    assert.equal(original.at(-1),11);sites.push({at:original.length-1,code:hooks.after,kind:'normal-final-end'});
    const parts=[],originalParts=[],placements=[];let last=0,runtimeOffset=0;
    for(const site of sites.filter(s=>s.code).sort((a,b)=>a.at-b.at)){const originalPart=original.subarray(last,site.at),injection=callback(site.code);parts.push(originalPart,injection);originalParts.push(originalPart);runtimeOffset+=originalPart.length;placements.push({originalOffset:site.at,runtimeOffset,injectedBytes:injection.length,kind:site.kind,hookCode:site.code});runtimeOffset+=injection.length;last=site.at;}
    parts.push(original.subarray(last));originalParts.push(original.subarray(last));const result=Buffer.concat(parts);assert.deepEqual(Buffer.concat(originalParts),original,'Removing observational injections reproduces every original byte');
    instrumentedFunctions[id]={before:hooks.before||null,after:hooks.after||null,tail:hooks.tail||null,originalSha256:C.sha(original),runtimeSha256:C.sha(result),originalBodyRetainedInOrder:true,instrumentationSites:placements,scope:'TEST ONLY read-only host observations; original return and tail-transfer instructions retained. Tail-transfer markers do not claim routine completion.'};return result;
  }
  for (let id = 1; id < allTypes.length; id++) {
    let body = zero;
    if (real.has(id)) body = instrument(id,inspected.bodies.get(id));
    else if (stubs.has(id)) {
      const signature = parsed.types[allTypes[id]];
      assert(signature.args.length <= maxRecorderArguments && signature.args.every(type => type === 127), 'Integer stub arguments at ' + id);
      assert(signature.res.length === 0 || (signature.res.length === 1 && signature.res[0] === 127), 'Integer stub result at ' + id);
      const parts = [Buffer.from([0, 0x41]), C.sleb(id)];
      for (let parameter = 0; parameter < maxRecorderArguments; parameter++) parts.push(parameter < signature.args.length
        ? Buffer.concat([Buffer.from([0x20]), C.leb(parameter)]) : Buffer.from([0x41, 0]));
      parts.push(Buffer.from(signature.res.length ? [0x10, 0, 0x0b] : [0x10, 0, 0x1a, 0x0b]));
      body = Buffer.concat(parts);
    }
    bodies.push(Buffer.concat([C.leb(body.length), body]));
  }
  for(const alias of aliases){const body=inspected.bodies.get(alias.sourceFunction);bodies.push(Buffer.concat([C.leb(body.length),body]));}
  const exports = actualIds.map(id => Buffer.concat([text(functionName(id)), Buffer.from([0]), C.leb(id)]));
  for(const alias of aliases)exports.push(Buffer.concat([text(alias.name),Buffer.from([0]),C.leb(alias.index)]));
  exports.push(Buffer.concat([text('sp'), Buffer.from([3]), C.leb(0)]));
  const retained = [4, 13, 6].flatMap(id => inspected.sections.filter(section => section.id === id).map(section => section.bytes));
  const bytes = Buffer.concat([HEADER, typeSection, importSection, functionSection, ...retained,
    C.sec(7, vector(exports)), ...inspected.sections.filter(section => section.id === 9).map(section => section.bytes),
    ...inspected.sections.filter(section => section.id === 12).map(section => section.bytes),
    C.sec(10, Buffer.concat([C.leb(bodies.length), ...bodies])),
    ...inspected.sections.filter(section => section.id === 11).map(section => section.bytes)]);
  // Validation and compilation occur only in the separately reviewed compile-only checker.
  const fixtureParsed = C.I.inspect(bytes, 1);
  const originalElements=inspected.sections.find(section=>section.id===9),retainedElements=fixtureParsed.sections.find(section=>section.id===9);
  assert(originalElements&&retainedElements,'Original element identities are required for this driver fixture');
  assert.deepEqual(retainedElements.bytes,originalElements.bytes,'Original element section retained byte-for-byte');
  for (const id of actualIds) assert.deepEqual(fixtureParsed.bodies.get(id), instrument(id,inspected.bodies.get(id)), 'Exact expected native or explicitly hooked body ' + id);
  for(const alias of aliases)assert.deepEqual(fixtureParsed.bodies.get(alias.index),inspected.bodies.get(alias.sourceFunction),'Private alias retains every original source body byte without hooks or rewritten call operands');
  // The independent byte reviewer and later compile-only checker verify exact imports.
  assert.equal(fixtureParsed.sections.some(section => section.id===8), false,'No original start routine executes');
  const passive=fixtureParsed.sections.find(section=>section.id===11).data,passiveCount=C.integer(passive,0);let dataAt=passiveCount.end;
  for(let i=0;i<passiveCount.value;i++){const flags=C.integer(passive,dataAt);assert.equal(flags.value,1,'Only original passive data; no active memory initializer');const length=C.integer(passive,flags.end);dataAt=length.end+length.value;}
  assert.equal(dataAt,passive.length);assert.deepEqual(fixtureParsed.sections.find(section=>section.id===11).bytes,inspected.sections.find(section=>section.id===11).bytes,'Original passive data exact');
  return {bytes, sourceHash: C.sha(source), real: [...real], stubs: [...stubs],elementSectionSha256:C.sha(originalElements.bytes),instrumentedFunctions,originalAliases:aliases,
    bodyHashes: Object.fromEntries(actualIds.map(id => [id, C.sha(inspected.bodies.get(id))]))};
}

function instantiateFixture(built, handlers, {initialPages = 11264} = {}) {
  const memory = new WebAssembly.Memory({initial: initialPages, maximum: 65536, shared: true});
  const view = new DataView(memory.buffer), calls = [];
  const f = {
    memory, view, calls,
    get: address => view.getUint32(address, true),
    put: (address, value) => view.setUint32(address, value >>> 0, true),
    u8: (address, value) => view.setUint8(address, value),
    f32: (address, value) => view.setFloat32(address, value, true),
    bytes: (address, length) => Buffer.from(new Uint8Array(memory.buffer, address, length)),
    zero: (address, length) => new Uint8Array(memory.buffer, address, length).fill(0)
  };
  const instance = new WebAssembly.Instance(built.module, {env: {memory}, fixture: {call(id, ...args) {
    calls.push({id, args});
    assert.equal(typeof handlers[id], 'function', 'Unexpected native fixture callee ' + id);
    return handlers[id](f, ...args) ?? 0;
  }}});
  f.exports = instance.exports;
  return f;
}

module.exports = {buildFixture, instantiateFixture};
