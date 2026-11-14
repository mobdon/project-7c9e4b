'use strict';
// Data-only preservation guard through successful native timing/enrollment V4.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),previous=require('./protected-observer-inputs-4c-v4.cjs');
const ROOT=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),pins={...previous.pins};
const condition='current-native-legacy-enrollment-4c-v4',manifest=path.join('work-update-check-20261113','native-legacy-enrollment-output-4c-v4','frozen-output-manifest.json'),bytes=fs.readFileSync(path.resolve(ROOT,manifest));
const expected='2b2c59b57b5ce72c8153b6eee52a921a78419668490d3bc5a8927183cdd66b0e';
assert.equal(sha(bytes),expected);pins[manifest]=expected;
for(const[name,hash]of Object.entries(JSON.parse(bytes).pins)){const p=path.join('work-update-check-20261113',condition,name);if(pins[p])assert.equal(pins[p],hash);pins[p]=hash;}
function verify(){for(const[p,h]of Object.entries(pins))assert.equal(sha(fs.readFileSync(path.resolve(ROOT,p))),h,p);return{files:Object.keys(pins).length,productionFiles:Object.keys(pins).filter(p=>p.startsWith('nfsu2-extension')).length,latestInventories:13,unchanged:true};}
module.exports={pins,verify};if(require.main===module)console.log(JSON.stringify(verify()));
