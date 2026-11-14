/* Compose only authored prefixes. Both preserve native local 1 and have the
 * same 19-local type signature, so no game instructions need rewriting. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
function locals(bytes){let p=0;const u=()=>{let n=0,s=0,x;do{x=bytes[p++];n|=(x&127)<<s;s+=7}while(x&128);return n>>>0};const groups=u(),types=[];for(let i=0;i<groups;i++){const n=u(),t=bytes[p++];for(let j=0;j<n;j++)types.push(t);}return {end:p,types};}
function compose(car,wall){const a=locals(car),b=locals(wall);assert.deepEqual(a.types,b.types,'contact prefixes must share the same full local signature');assert.equal(a.types.length,19);assert.equal(a.types[0],127);assert.equal(car.at(-1),11);assert.equal(wall.at(-1),11);return [...car.slice(0,-1),...wall.slice(b.end)];}
module.exports={compose,locals};
if(require.main===module){const root=path.resolve(__dirname,'..'),cars=JSON.parse(fs.readFileSync(path.join(root,'tools/car-current-body.json'))),walls=JSON.parse(fs.readFileSync(path.join(root,'tools/wall-current-body.json')));const body=compose(cars,walls);fs.writeFileSync(path.join(root,'tools/contact-current-body.json'),JSON.stringify(body));console.log('Combined contact prefix bytes:',body.length);}
