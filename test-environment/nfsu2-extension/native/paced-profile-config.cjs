'use strict';
const base=require('./profile-config.cjs'),plans=require('./corner-target-plans.json');
const PROFILES=Object.freeze(base.PROFILES.map(p=>Object.freeze({...p,completeInputHash:plans[p.native.hash].outputModuleHash})));
module.exports={PROFILES};
