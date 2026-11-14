'use strict';
// Private research helpers. Do not include game bytes or extracts in releases.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const pins={
 next:{path:'compatibility-93af6ccb/game.wasm',size:38205596,hash:'128e2b5816a8eace4b768aec920318a1613da8235801a361e2009e96550be1d6'},
 latest:{path:'compatibility-78e2bb69/game.wasm',size:38170601,hash:'df7b930bb293ffdf975f0735d93e0797d51bd137d0cbeabcaff87fc5a693c759'},
 current:{path:'compatibility-v011/game.wasm',hash:'5e33ad2cb4c4cc6893dee7cbd4d6e9bfb0f59a349d218fddbb5e3331ca69bc34'}
};
function readPinned(which){
 const pin=pins[which],bytes=fs.readFileSync(path.resolve(__dirname,'../research',pin.path));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),pin.hash,`${which} module SHA-256`);
 if(pin.size)assert.equal(bytes.length,pin.size);
 return bytes;
}
function bodies(bytes){
 let p=8;const result=new Map();
 const u=()=>{let n=0,s=0,x;do{x=bytes[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0;};
 while(p<bytes.length){const id=bytes[p++],size=u(),end=p+size;if(id===10){const count=u();for(let i=0;i<count;i++){const n=u();result.set(i+37,bytes.subarray(p,p+n));p+=n;}}p=end;}
 return result;
}
const leb=n=>{const a=[];do{const b=n&127;n>>>=7;a.push(b|(n?128:0));}while(n);return a;};
const string=s=>[...leb(Buffer.byteLength(s)),...Buffer.from(s)];
const section=(id,bytes)=>[id,...leb(bytes.length),...bytes];
module.exports={readPinned,bodies,leb,string,section};
