/* Exact 102c8d92 driving profile.
 * This build's native hooks are not assembled here. native-transplant-102c.js applies the whole
 * reviewed ed8d3359 hook set to this build as one pinned transform (input and output SHA-256),
 * and ai.js routes this profile to it. The values below are the page-side facts for this build:
 * the three host cells of the site's "online free roam" predicate (wasm function 23017), the
 * contact-hook mailboxes, and the capability flags.
 *
 * Solo/offline only: network permission, online no-clip and the hosted race loop are not
 * available on this build (soloOnly). The preset tuner / dyno / ECU panel is not ported.
 * nativeRails: the pinned transform also holds the "rails" guard in Car::SetPhysicsMode
 * (wasm function 23116), which the page switches on per race through the AI mailbox. */
(function(root){'use strict';
  const online=[704980184,707408368,707392980];
  const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
  const profile=freeze({
    revision:'102c8d92',
    size:38867137,
    hash:'2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d',
    statusCapacity:64,
    importFunctions:38,
    transplant:{from:'ed8d3359',outputBytes:39052721,outputModuleHash:'f113eb5dcd1292b6aac0e97837e653c9821b8a0a0efdfa221331d2fbf58fbe29'},
    wall:{functionIndex:23117,helper:23017,onlineAddresses:online.slice()},
    cars:{functionIndex:23117,helper:23017,slotKind:23019,onlineAddresses:online.slice(),
      onlineTraffic:false,onlinePlayers:false,onlineRaceCars:false,onlineRivals:false,onlinePlayerOutrun:false,
      contactCounters:2,base:13685184,bytes:40,magic:826491214,primaryCounterScope:'aggregate-non-player-with-rivals'},
    capabilities:{legacy:true,ai:true,pace:true,corner:true,walls:true,cars:true,
      onlineTraffic:false,onlinePlayers:false,onlineRaceCars:false,onlineRivals:false,onlinePlayerOutrun:false,
      dyno:false,fullTuner:false,tunerSecondGuestWindow:false,tunerCurrentNativeClamp:false,tunerCapturedNativePolicy:false,
      nativeEcuScope:false,nativeEcuOrderedReplay:false,ecuRecipePrivatePreflight:false,
      dragAI:true,opponentDrag:true,nativeDragInputHandoff:true,ownedNativeNos:true,
      nativeDriftPhysics:true,nativeDriftRecovery:true,nativeDriftPace:true,driftDiagnostics:true,nativeDragOverheat:true,
      nativeRaceCapture:false,travel:false,nativeRouteProbe:false,
      nativeForwardClamp:false,nativeForwardGeometry:false,
      nativePaceCacheFix:true,nativePaceTargetConsumers:true,
      nativeRails:true,soloOnly:true}
  });
  root.__NFSU2_102C_PROFILE__=profile;
  if(typeof module==='object'&&module.exports)module.exports=profile;
})(globalThis);
