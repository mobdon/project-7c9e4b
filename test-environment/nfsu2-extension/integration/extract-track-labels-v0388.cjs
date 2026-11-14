'use strict';
// Read-only factual label projection from the user's existing game image.
// Does not copy or package the language asset itself.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=path.resolve(root,'../nfsu2-extension/research/music-recovery');
const catalog=require('../extension/race-catalog.js');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const rows=JSON.parse(fs.readFileSync(path.join(source,'zdir-catalog.json'))).records.filter(r=>r.key==='27771a63');
assert.equal(rows.length,2);
const elf=fs.readFileSync(path.join(source,'raw/SLUS_210.65'));
assert(elf.includes(Buffer.from('LANGUAGES\\ENGLISH.BIN\0')));
const fd=fs.openSync(path.join(source,'source.iso'),'r');
let data;
try{for(const row of rows){assert.equal(row.bytes,262904);const b=Buffer.alloc(row.bytes);assert.equal(fs.readSync(fd,b,0,b.length,row.offset),b.length);if(data)assert(data.equals(b));else data=b;}}finally{fs.closeSync(fd);}
assert.equal(data.readUInt32LE(0),0x39000);
const count=data.readUInt32LE(12),table=8+data.readUInt32LE(16),strings=8+data.readUInt32LE(20),end=8+data.readUInt32LE(4);
assert.equal(count,3849);assert.equal(table+count*8,strings);assert(end<=data.length);
const entries=new Map();let previous=-1;
for(let i=0;i<count;i++){const at=table+i*8,hash=data.readUInt32LE(at),offset=data.readUInt32LE(at+4);assert(hash>previous);previous=hash;assert(strings+offset<end);entries.set(hash,strings+offset);}
function hash(text){let h=0xffffffff;for(const c of text)h=(Math.imul(h,33)+c.charCodeAt(0))>>>0;return h;}
function lookup(key){const at=entries.get(hash(key));if(at===undefined)return null;const stop=data.indexOf(0,at);assert(stop>=at&&stop<end);const text=data.subarray(at,stop).toString('latin1');assert(text.length>0&&text.length<=80&&!/[\x00-\x1f\x7f]/.test(text));return text;}
const labels={};
for(const row of catalog.TRACKS){const name=lookup('TRACK_NAME_'+row.trackId),reverse=lookup('REVERSE_TRACK_NAME_'+row.trackId);if(name)labels[row.trackId]={name,...(reverse?{reverse}: {})};}
const result={schema:1,source:'User-provided PS2 game image; factual English track names only',languagePath:'LANGUAGES\\ENGLISH.BIN',languageSha256:sha(data),elfSha256:sha(elf),locations:rows.map(({offset,bytes,key})=>({offset,bytes,key})),count,table,strings,labels};
fs.writeFileSync(path.join(root,'integration/track-labels-v0388.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({labels:Object.keys(labels).length,primaryCovered:catalog.TRACKS.filter(r=>r.primaryRace&&labels[r.trackId]).length,primaryTotal:catalog.TRACKS.filter(r=>r.primaryRace).length,examples:[4000,4001,4101,4601,4715].map(id=>({id,...labels[id]})),languageSha256:result.languageSha256}));
