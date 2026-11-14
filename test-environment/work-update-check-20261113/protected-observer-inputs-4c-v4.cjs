'use strict';
// Data-only preservation guard including the stopped legacy V3 condition.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),previous=require('./protected-observer-inputs-4c-v3.cjs');
const ROOT=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),pins={...previous.pins};
const condition='current-native-legacy-enrollment-4c-v3',manifest=path.join('work-update-check-20261113','native-legacy-enrollment-output-4c-v3','frozen-output-manifest.json'),bytes=fs.readFileSync(path.resolve(ROOT,manifest));
const expected='b0539a387d6d05f95cd26d6a49a0b41fa867111c44b42fc9f80d722c9570baf7';
assert.equal(sha(bytes),expected);pins[manifest]=expected;
for(const[name,hash]of Object.entries(JSON.parse(bytes).pins)){const p=path.join('work-update-check-20261113',condition,name);if(pins[p])assert.equal(pins[p],hash);pins[p]=hash;}
function verify(){for(const[p,h]of Object.entries(pins))assert.equal(sha(fs.readFileSync(path.resolve(ROOT,p))),h,p);return{files:Object.keys(pins).length,productionFiles:Object.keys(pins).filter(p=>p.startsWith('nfsu2-extension')).length,latestInventories:12,unchanged:true};}
module.exports={pins,verify};if(require.main===module)console.log(JSON.stringify(verify()));
