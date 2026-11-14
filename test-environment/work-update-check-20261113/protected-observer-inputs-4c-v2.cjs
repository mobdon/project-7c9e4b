'use strict';
// Data-only preservation guard including the two executed World replay scenarios.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),previous=require('./protected-observer-inputs-4c.cjs');
const ROOT=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),pins={...previous.pins};
for(const[condition,output,expected]of[
 ['current-native-remote-world-replay-4c-v1','native-remote-world-replay-output-4c-v1','84414a6b5f9a59b391f69de9e49eb6edff6af0d41128eba479b20e9bd41e7ff4'],
 ['current-native-remote-world-replay-4c-v2','native-remote-world-replay-output-4c-v2','22fa8057e1a938d30f4583f2fa3f4a50e8efa89a1b8033d4285f16498a490bf2']
]){const manifest=path.join('work-update-check-20261113',output,'frozen-output-manifest.json'),bytes=fs.readFileSync(path.resolve(ROOT,manifest));assert.equal(sha(bytes),expected);pins[manifest]=expected;for(const[name,h]of Object.entries(JSON.parse(bytes).pins)){const rel=path.join('work-update-check-20261113',condition,name);if(pins[rel])assert.equal(pins[rel],h);pins[rel]=h;}}
function verify(){for(const[p,h]of Object.entries(pins))assert.equal(sha(fs.readFileSync(path.resolve(ROOT,p))),h,p);return{files:Object.keys(pins).length,productionFiles:Object.keys(pins).filter(p=>p.startsWith('nfsu2-extension')).length,latestInventories:8,unchanged:true};}
module.exports={pins,verify};if(require.main===module)console.log(JSON.stringify(verify()));
