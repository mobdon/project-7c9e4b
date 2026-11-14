// Deterministic scheduling probe. No production hook bytes are changed.
const fs=require('node:fs'),path=require('node:path');
const factory=require(process.env.WABT_MODULE||require('node:path').resolve(__dirname,'../research/compatibility-v011/node_modules/wabt'));
(async()=>{
 const wabt=await factory(),root=path.resolve(__dirname,'..');
 let wat=fs.readFileSync(path.join(root,'tools/ai-current-bridge.wat'),'utf8');
 wat=require('./add-drag-input-handoff.cjs').transform(require('./add-drift-physics.cjs').transform(wat));
 const anchor='(local.set $seq (i32.load (i32.const 13684996)))';
 if(!wat.includes(anchor))throw Error('Heartbeat observation anchor changed');
 wat=wat.replace('(func (export "step")','(import "env" "probe" (func $probe)) (func (export "step")').replace(anchor,'(call $probe) '+anchor);
 const m=wabt.parseWat('ai-latest-swap-probe.wat',wat,{threads:true,simd:true});m.resolveNames();m.validate({threads:true,simd:true});
 fs.writeFileSync(path.join(root,'tests/ai-latest-swap-probe.wasm'),Buffer.from(m.toBinary({}).buffer));
})().catch(e=>{console.error(e);process.exit(1)});
