'use strict';
// Separate claimed receipt payload. Main mailbox status is its publication lock.
// d240..d27f sits after the64-byte corner mailbox and before dyno d300.
module.exports=Object.freeze({BASE:0xd0d240,SIZE:64,MAGIC:0x39414252,CLAIMING:0x39434252,
 PHASE_MAGIC:0x32504d52,MAX_AGE_TICKS:400,
 offsets:Object.freeze({magic:0,physicsKind:4,sourceBits:8,nominalGripBits:12,observedGripBits:16,command:20,ownerSequence:24,receiver:28,nativeStage:32,requestedOwnerSequence:36,publishedTick:44,targetSourceBits:48,phaseMagic:52,publishedRaceClock:56})});
