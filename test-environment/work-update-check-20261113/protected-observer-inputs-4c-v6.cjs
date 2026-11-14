'use strict';
// Data-only preservation guard including the failed first combined replay.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),previous=require('./protected-observer-inputs-4c-v5.cjs');
const ROOT=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),pins={...previous.pins};
const condition='current-native-combined-observer-4c-v1',manifest=path.join('work-update-check-20261113','native-combined-observer-output-4c-v1','frozen-output-manifest.json'),bytes=fs.readFileSync(path.resolve(ROOT,manifest));
const expected='c25226b27aa9e65e4349c66dae72304d9395c8e2e223a16c8cdd82efda00975b';
assert.equal(sha(bytes),expected);pins[manifest]=expected;
for(const[name,hash]of Object.entries(JSON.parse(bytes).pins)){const p=path.join('work-update-check-20261113',condition,name);if(pins[p])assert.equal(pins[p],hash);pins[p]=hash;}
function verify(){for(const[p,h]of Object.entries(pins))assert.equal(sha(fs.readFileSync(path.resolve(ROOT,p))),h,p);return{files:Object.keys(pins).length,productionFiles:Object.keys(pins).filter(p=>p.startsWith('nfsu2-extension')).length,latestInventories:14,unchanged:true};}
module.exports={pins,verify};if(require.main===module)console.log(JSON.stringify(verify()));
