'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {create,TRACE_KEY,TRACE_COLUMNS}=require('../extension/diagnostics.js');
test('delivered .11 trace restores without shifting fields or inventing contact eligibility',()=>{
 const saved=require('./fixtures/race-trace-v03811-for-v03812.json');
 const values=new Map([[TRACE_KEY,JSON.stringify(saved)]]),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const result=JSON.parse(create({storage,clock:()=>1794374369000}).exportText()).raceTrace;
 assert.equal(result.rows.length,3);assert.equal(result.restoredFromSameTab,true);
 for(let i=0;i<3;i++)for(const [j,key]of saved.columns.entries())assert.equal(result.rows[i][TRACE_COLUMNS.indexOf(key)],saved.rows[i][j],key);
 for(const key of ['cityContactPreviewAvailable','cityContactPreviewState','cityObservedCars','cityExcludedCars'])assert.equal(result.rows[0][TRACE_COLUMNS.indexOf(key)],null);
});
test('contact preview exports only bounded counts and a fixed status, never car or slot identities',()=>{
 const logger=create({storage:null,clock:()=>1000});
 logger.trace({ready:true,driving:true,cityContactPreviewAvailable:true,cityContactPreviewState:'current-contact-policy',cityObservedCars:7,cityExcludedCars:4,car:12345,body:67890,slot:'SECRET'});
 const result=JSON.parse(logger.exportText()).raceTrace,row=result.rows.at(-1),get=k=>row[TRACE_COLUMNS.indexOf(k)];
 assert.equal(get('cityContactPreviewAvailable'),true);assert.equal(get('cityContactPreviewState'),'current-contact-policy');assert.equal(get('cityObservedCars'),7);assert.equal(get('cityExcludedCars'),4);assert.doesNotMatch(logger.exportText(),/SECRET|12345|67890/);
});
