'use strict';
// Data-only preservation guard through full movement replay and legacy attempts.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),previous=require('./protected-observer-inputs-4c-v2.cjs');
const ROOT=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),pins={...previous.pins};
const added=[
 ['current-native-remote-world-replay-4c-v3','native-remote-world-replay-output-4c-v3','08ebb1987dc311967c576b37507033cf1cf2a69b5e9a5a53e23e629ceebdb647'],
 ['current-native-legacy-enrollment-4c-v1','native-legacy-enrollment-output-4c-v1','b1537a9efec4c868c508a72ae362c56adb49b71859c62097ab73ec2858aa4585'],
 ['current-native-legacy-enrollment-4c-v2','native-legacy-enrollment-output-4c-v2','eefa7b82d2ec2cd3de7695abad709d9273acf1fd9228a82ef71224958d54f764']
];
for(const[condition,output,h]of added){const manifest=path.join('work-update-check-20261113',output,'frozen-output-manifest.json'),bytes=fs.readFileSync(path.resolve(ROOT,manifest));assert.equal(sha(bytes),h);pins[manifest]=h;for(const[name,hash]of Object.entries(JSON.parse(bytes).pins)){const p=path.join('work-update-check-20261113',condition,name);if(pins[p])assert.equal(pins[p],hash);pins[p]=hash;}}
function verify(){for(const[p,h]of Object.entries(pins))assert.equal(sha(fs.readFileSync(path.resolve(ROOT,p))),h,p);return{files:Object.keys(pins).length,productionFiles:Object.keys(pins).filter(p=>p.startsWith('nfsu2-extension')).length,latestInventories:11,unchanged:true};}
module.exports={pins,verify};if(require.main===module)console.log(JSON.stringify(verify()));
