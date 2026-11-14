/* Local, schema-only diagnostics. No console interception, requests or uploads. */
(function (root) {
  'use strict';
  const KEY = 'nfsu2-driving-tools-diagnostics-v1';
  const TRACE_KEY='nfsu2-driving-tools-race-trace-v1',TRACE_MS=250,TRACE_PERSIST_MS=2000,MAX_TRACE_SAMPLES=480,MAX_TRACE_BYTES=524288;
  const LAST_RACE_TRACE_KEY='nfsu2-driving-tools-last-race-trace-v1',MAX_LAST_RACE_TRACE_SAMPLES=240,MAX_LAST_RACE_TRACE_BYTES=262144;
  const MAX_EVENTS = 180, MAX_BYTES = 65536, MAX_ERROR_INPUT = 16384;
  const MAX_DRIVING_SAMPLES=12,MAX_DRIVING_BYTES=16384;
  const EVENTS = new Set(['page-start','game-boot','game-register','game-trap','game-exit','worker-error','page-error','promise-rejection','engine-error','identity-change','state','tools','pause','resume','page-hide','manual','stop','export','clear','build','build-error','patch-state','dyno-action','dyno-error']);
  for(const action of ['start','preview','apply','undo','stop','error'])EVENTS.add('ecu-recipe-'+action);
  EVENTS.add('autonomy-state');
  EVENTS.add('rails-transition');
  const FLAGS = ['ready','driving','network','safe','hidden','focused','aiActive','aiOwned','handbackPending','dynoBusy','dynoEnabled','dynoFullTuner','dynoSecondWindowCapture','dynoCurrentClamp','wallRequested','carRequested','onlineTrafficRequested','onlinePlayersRequested','onlineRaceCarsRequested','cornerRequested','cornerMemoryBlocked','cornerDriftBlocked','cornerDriverValid','cornerRouteOwned','powerActive','gripActive','limiterRemoved','carChanged','raceChanged','playerChanged','sessionCurrent','supported','signatureExact','signatureFailed','driftRace','forcedDrift','driftVariant','aiDriverVerified','aiGoalPending','nativeDriftBehavior','nativeRoadBehavior'];
  const NUMBERS = {nativePaceFactor:[0,4],dragEngineHeat:[-1,2],dragEngineLimitRpm:[1000,30000],signatureTotal:[0,128],signatureUnique:[0,128],signatureMissing:[0,128],signatureAmbiguous:[0,128],moduleBytes:[0,4294967295],slot:[0,1024],tid:[0,1e6],code:[-2147483648,2147483647],kind:[0,100],generation:[0,1e6],memoryMiB:[0,65536],hud:[0,3],flow:[0,100],raceType:[0,100],racePhase:[0,100],driverKind:[0,100],physicsKind:[0,100],wallHits:[0,1e9],carHits:[0,1e9],trafficHits:[0,1e9],playerHits:[0,1e9],cornerMode:[0,3],cornerPace:[0.5,3],cornerBraking:[0.5,1],brakingHits:[0,4294967295],cornerHits:[0,4294967295],cornerApplied:[0,1],cornerProbeStage:[0,7],cornerRouteNodes:[0,40],cornerPlannerCorners:[0,40],cornerPlannerUsable:[0,5],cornerGuardMask:[0,255],effectivePower:[1,3],effectiveGrip:[1,2],requestedPace:[0.5,3],gameTicks:[0,4294967295],pageHeartbeat:[0,4294967295],nativeHeartbeatAck:[0,4294967295]};
  Object.assign(NUMBERS,{trackId:[0,65535],carRpm:[0,30000],carGear:[0,10],speedMps:[0,500],forwardMps:[-500,500],nativeSkill:[0,255],aiGoalId:[0,255],driftTargetMps:[-200,200]});
  FLAGS.push('dragHeatDisabled','dragEngineBlown','driftScoreLinked','driftCollisionLoss','aiGoalRecognized');
  Object.assign(NUMBERS,{driftScoreState:[0,4],driftMultiplier:[1,5],driftNextPoints:[0,1e9],driftPendingPoints:[0,1e9],driftBankedPoints:[0,1e9],driftRawRate:[0,1e6],driftLatchedSlipRad:[-Math.PI,Math.PI],currentRawRouteProgress:[-1,1e7],driftBestRawRouteProgress:[-1,1e7]});
  // Moving telemetry must not turn ordinary state sampling into per-tick
  // storage writes. Keep native scalar samples at two seconds unless a
  // discrete mode, controller, scoring-state or tool change needs a record.
  const MOVING_FIELDS=['gameTicks','pageHeartbeat','nativeHeartbeatAck','carRpm','speedMps','forwardMps','driftTargetMps','driftPendingPoints','driftBankedPoints','driftRawRate','driftLatchedSlipRad','currentRawRouteProgress','driftBestRawRouteProgress'];
  FLAGS.push('nativeTelemetry','dragRace','forcedDrag','nativeNavigationPresent','nativeNavigationValid','nativeConfigPresent','nativeConfigValid','nativeCompanionPresent','nativeCompanionValid','aiSkillSaved');
  Object.assign(NUMBERS,{nativeInputMode:[0,10],nativeNextInputMode:[0,10],nativeThrottle:[0,1],nativeHandbrake:[0,1],nativeBrake:[0,1],nativeSteering:[-32768,32767],nativeGearCommand:[-1,10],aiRequestedMode:[0,2],aiNativeStatus:[0,3],aiStaleTicks:[0,4294967295],savedNativeSkill:[0,255]});
  MOVING_FIELDS.push('cornerHits','brakingHits');
  MOVING_FIELDS.push('nativeThrottle','nativeHandbrake','nativeBrake','nativeSteering','aiStaleTicks');
  FLAGS.push('nosTelemetry','nosClockNetwork','nosTimestampActive');
  Object.assign(NUMBERS,{nosClockTicks:[0,4294967295],nosSinceTicks:[0,4294967295],nosFullTicks:[0,9999999],nosRemainingTicks:[0,9999999],nosElapsedTicks:[-4294967295,4294967295]});
  MOVING_FIELDS.push('nosClockTicks','nosSinceTicks','nosFullTicks','nosRemainingTicks','nosElapsedTicks');
  FLAGS.push('paceConfirmed','adaptiveRaceRequested','raceOnlyEligible','raceOnlyRequested','raceOnlyInputClear');
  Object.assign(NUMBERS,{paceApplied:[0.75,3],adaptiveRaceCeiling:[1,2],adaptiveRuntimePace:[.75,2],adaptiveClearanceM:[0,150]});
  MOVING_FIELDS.push('adaptiveRuntimePace','adaptiveClearanceM');
  FLAGS.push('forwardCaptured','nativeForwardGeometry','nativeForwardClamp','forwardUnavailable','forwardLeaseAcknowledged');
  const FORWARD_LEASE_FIELDS=Object.freeze(['forwardLeaseState','forwardLeaseAcknowledged','forwardLeaseAgeTicks']);
  const FORWARD_LEASE_STATES=new Set(['off','awaiting','acknowledged','renewing','expired','invalid']);
  Object.assign(NUMBERS,{forwardLeaseAgeTicks:[0,400]});
  MOVING_FIELDS.push(...FORWARD_LEASE_FIELDS);
  Object.assign(NUMBERS,{forwardSamples:[0,48],forwardHorizon:[0,512.01],forwardPriorityTurns:[0,24],forwardRequestedTarget:[0,150],forwardLeaseTicks:[0,400],forwardFailureCode:[1,10]});
  Object.assign(NUMBERS,{forwardGuardCode:[11,143]});
  const FORWARD_GUARDS=new Set([11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,28,29,30,31,32,33,34,35,37,38,39,40,41,42,43,44,45,...Array.from({length:44},(_,i)=>100+i)]);
  MOVING_FIELDS.push('forwardState','forwardCaptured','forwardSamples','forwardHorizon','forwardPriorityTurns','forwardRequestedTarget','forwardLeaseTicks','forwardFailureCode');
  const FORWARD_STATES=new Set(['off','waiting','requested','unknown','armed','observed','native-fallback']);
  const PACING_STATES=new Set(['off','invalid','native-route','native-fallback','coverage-unknown','clearance-limited']);
  const ADAPTIVE_STATES=new Set(['off','invalid','unsupported','street-x','mode','network-permission','ai-off','paused','handoff','pace-pending','planner-pending','planner-observed','native-fallback','coverage-unknown','clearance-limited']);
  const POWER_STATUSES=new Set(['off','unsupported','not-ready','not-driving','network-permission','hidden','unfocused','menu','hud','drift-change','layout','settling','applied','neutral','changed','rejected','suspended','tuner-busy']);
  const TOOL_FLAGS = ['ai','raceOnlyAI','aiPace','raceCornerAssist','cornerAssist','racePace','walls','cars','traffic','players','online','nos','drag','dragNoBlowout','tester','boost','unlimit','grip','drift','dynoEnabled','adaptiveRace'];
  const TOOL_NUMBERS = {adaptiveRaceCeiling:[1,2],raceCornerFactor:[0.6,0.95],raceCornerMargin:[0,25],raceBraking:[0.5,1],paceFactor:[0.75,3],racePaceFactor:[0.75,3],cornerFactor:[0.6,0.95],cornerMargin:[0,25],power:[1,3],gripFactor:[1,2],rpm:[3000,10000]};
  const DYNO_STATUSES=new Set([0,1,2,3,4,5,6,8]);
  const DYNO_GUARDS=new Set([0,1,2,3,4,5,10,11,12,13,14,15,20,21,22,23,24,30,31,32,40,41,42,43,44,45,50,60,70,71,72,73,74]);
  const DYNO_SOURCE_PAIRS=new Set([12,13,14,15,23,24,25,34,35,45]);
  const ERROR_KINDS = new Set(['memory-bounds','unreachable','indirect-call','integer-divide','invalid-conversion','stack-overflow','out-of-memory','type-error','reference-error','syntax-error','other']);
  const PHASES = new Set(['idle','preparing','ready','unavailable','waiting','active','failed','unsupported']);
  const PATCH_CODES = new Set(['module-size','module-hash','module-read','module-layout','module-compile']);
  const REASONS = new Set(['blur','hidden','page-hide','manual','stop','game-stopped','build-unavailable','metadata','find','apply','restore','cancel','unknown']);
  FLAGS.push('streetXRace','forcedStreetX','onlineStreetX','planCurrentCorners','planClearanceAvailable','planClearanceObserved','forwardPlanAvailable','forwardPlanOverride');
  FLAGS.push('catchupDriverVerified','shortcutPolicyInstalled','shortcutPolicyRequested');
  Object.assign(NUMBERS,{catchupDriverFactor:[0,32],catchupCarFactor:[0,32]});
  MOVING_FIELDS.push('catchupDriverFactor','catchupCarFactor','catchupTelemetryStatus');
  Object.assign(NUMBERS,{producerFailureCode:[0,3],producerStage:[0,3],nativeRoadTarget:[-500,500],nativePaceRequested:[.75,3],nativePaceApplied:[.75,3],nativePaceHits:[0,4294967295],planClearanceTarget:[0,60],planInputSpeedMps:[0,500],planSelectedPace:[.75,3],forwardPlanReasonCode:[0,40],forwardPlanTarget:[0,150],forwardPlanConstraints:[0,24],forwardPlanKnots:[0,24],forwardLimitingDistance:[0,512.01],forwardLimitingAngle:[0,180],forwardLimitingCurvature:[0,100],forwardLimitingCurveTarget:[0,1e6],forwardLimitingEntryTarget:[0,1e6],forwardPlanGrip:[0,100],forwardPlanLateral:[0,1000],forwardPlanBrake:[0,1000]});
  MOVING_FIELDS.push('nativeRoadTarget','nativePaceHits','nativePaceRequested','nativePaceApplied','nativePaceFactor','paceApplied','cornerApplied','cornerRouteNodes','cornerPlannerCorners','cornerPlannerUsable','planClearanceTarget','planInputSpeedMps','planCurrentCorners','planClearanceAvailable','planClearanceObserved','planClearanceSource','forwardPlanAvailable','forwardPlanOverride','forwardPlanReasonCode','forwardPlanTarget','forwardPlanConstraints','forwardPlanKnots','forwardLimitingDistance','forwardLimitingAngle','forwardLimitingCurvature','forwardLimitingCurveTarget','forwardLimitingEntryTarget','forwardPlanGrip','forwardPlanLateral','forwardPlanBrake');
  const TRACE_ENUMS={
    autonomyBlockReason:['unsupported','active','starting','not-observed','read-blocked','not-free-roam','no-starts','choose-starts','ready'],
    autonomyReadReason:['not-observed','none','exact-hosted-profile','shared-memory','bitmap','span','uncommitted','guest-window','window-changed','commit-changed','snapshot-changed','host-snapshot-changed','memory-changed','host-span','read-budget','city-free-roam','single-player-context','physical-sample','lobby-state','lobby-identity','game-clock-reset','clock','race-table','race-membership','catalog-context','trigger-chain','trigger-record','catalog-row','destination','offer-count','read-failed'],
    pacedEvidenceKind:['four-tires','combined-grip'],
    rubberbandState:['off','unsupported','unavailable','unverified','protocol-error','waiting','applied','reset-pending','guarded-native','blocked'],
    traceStatus:['captured','unavailable'],
    nativeTelemetryStatus:['sampled','profile-unverified','state-unavailable','context-stale','drift-ineligible','context-changed'],
    nativeRoadTargetStatus:['sampled','driver-unverified','behavior-unverified','not-road','value-invalid'],
    nativePaceTelemetryStatus:['unavailable','mailbox-unready','unsupported','context-unowned','mailbox-invalid','mailbox-changed','sampled'],
    catchupTelemetryStatus:['unsupported','unavailable','mailbox-unready','context-invalid','context-changed','value-invalid','sampled'],
    cornerPlannerTelemetryStatus:['unsupported','command-ineligible','route-unavailable','record-invalid','context-changed','sampled'],
    planClearanceSource:['barrier','vehicle'],
  };
  FLAGS.push('autonomyAvailable','autonomyCatalogFresh','autonomyInRoam','autonomyStartEnabled');
  FLAGS.push('autonomyCatalogCached');NUMBERS.autonomyCatalogAgeMs=[0,1000];TRACE_ENUMS.autonomyBlockReason.push('cached-ready');
  TRACE_ENUMS.autonomyReadReason.push('career-stage','guided-event','catalog-count','catalog-generation','trigger-span');
  FLAGS.push('autonomyVisitDrag','autonomyTargetLocked','autonomyCruiseSelected','autonomyCruiseRequested');TRACE_ENUMS.autonomyBlockReason.push('discover-ready');
  Object.assign(NUMBERS,{autonomySelectedCount:[0,16],autonomyLocationCount:[0,160],autonomyOfferCount:[0,16]});
  const AUTONOMY_PHASES=['off','stopped','handoff','discover','travel','waiting','joining','lobby','trip','quarantine','discovery-wait','coherence-wait'];
  const AUTONOMY_REASON_CODES=["not-reported","off","stopped","start-quarantine","start-unavailable","solo-unsupported","cruise-needs-discovery","manual-handback","discovery-cruise","discovery-parked","target-unavailable","route-plan-failed","route-unavailable","travel-refused","travel","return-quarantine","observation-stalled","context-interrupted","host-owned-lobby","lobby-mismatch","race-driver-unconfirmed","race-loading-timeout","lobby-return-uncertain","join-timeout","join-pending","host-acceptance","lobby-wait","countdown","race-active","race-results","race-loading","unowned-event","world-changed","destination-changed","next-offer","travel-stopped","waiting-host","join-dispatch-uncertain","join-dispatched","offer-changed","solo-dispatch-uncertain","solo-requested","solo-refused","next-start","coherence-wait","coherence-revalidate","coherence-handback","coherence-frame","coherence-timeout","coherence-context-changed","coherence-tick-reset","travel-observation-stalled","travel-interrupted","road-changed","travel-sample-unavailable","game-clock-stopped","travel-timeout","travel-no-progress","arrival-lost","road-deviation","arrival-settling","arrival-braking"];
  const AUTONOMY_STATUS_FIELDS=['autonomyActive','autonomyStartPending','autonomyJoinPending','autonomyPhase','autonomyReasonCode','autonomyDrivePhase','autonomyWaypointIndex','autonomyWaypointCount','autonomyCompletedTrips','autonomyRequestRaceAI','autonomyRequestCruiseAI','autonomyTravelKeyRequest','autonomyPauseReason','autonomyPauseRemainingMs','autonomyResumePhase'];
  FLAGS.push('autonomyActive','autonomyStartPending','autonomyJoinPending','autonomyRequestRaceAI','autonomyRequestCruiseAI','autonomyTravelKeyRequest');
  Object.assign(NUMBERS,{autonomyWaypointIndex:[0,514],autonomyWaypointCount:[0,514],autonomyCompletedTrips:[0,1000000],autonomyPauseRemainingMs:[0,1000]});
  TRACE_ENUMS.autonomyPhase=AUTONOMY_PHASES;
  TRACE_ENUMS.autonomyResumePhase=AUTONOMY_PHASES;
  TRACE_ENUMS.autonomyReasonCode=AUTONOMY_REASON_CODES;
  TRACE_ENUMS.autonomyDrivePhase=['off','stopped','following','braking','settling','waiting'];
  TRACE_ENUMS.autonomyPauseReason=['snapshot-changed','host-snapshot-changed'];
  MOVING_FIELDS.push('autonomyWaypointIndex','autonomyPauseRemainingMs');
  FLAGS.push('ecuUndoAvailable','ecuRestored','ecuLiveVerified','ecuPersistenceVerified');
  Object.assign(NUMBERS,{ecuBeforeKw:[0,100000],ecuAfterKw:[0,100000],ecuGainPercent:[-100,10000],ecuScopeHits:[0,4294967295],ecuActions:[0,128],ecuClicks:[0,1024]});
  TRACE_ENUMS.ecuAction=['preview','apply','undo'];
  const PLAN_REASONS=['verified-native-policy-required','verified-owned-native-capture-and-policy-required','bounded-policy-required','ordered-bounded-native-knots-required','incomplete-or-reversing-native-knots','unverified-native-unit-spacing','invalid-native-curve-policy','verified-exit-heading-required','measured-native-knot-bend','no-observed-speed-limiting-bend','verified-forward-centerline-required','bounded-physical-policy-required','verified-current-native-speed-required','bounded-forward-samples-required','invalid-distance-order-or-spacing','grade-outside-horizontal-policy','incomplete-or-reversing-geometry','no-observed-corner-constraint','insufficient-observed-reaction-horizon','no-supported-positive-corner-target','measured-corner-constraint'];
  const PACED_PATH_FIELDS=['pacedAckRejectCode','pacedPhysicsKind','pacedEvidenceKind','pacedCombinedGripFactor','pacedNativeStage'];
  const PACED_REJECT_CODES={0:'no rejection reported',1:'mailbox magic',2:'publication busy',3:'command not yet matched',4:'invalid command',5:'publisher status',6:'car bounds',7:'source factor',8:'physics receiver identity',9:'physics child graph',10:'local player binding',11:'owner generation',12:'nonfinite gain',13:'scalar output mismatch',14:'four tire inputs',15:'stacking eligibility',16:'receipt changed during read',18:'extra evidence block',19:'receipt payload',20:'combined grip input'};
  const PACED_FIELDS=['nativePacedCatchup','pacedCatchupEligible','pacedRequestedStrength','pacedAppliedStrength','pacedSourceFactor','pacedPowerFactor','pacedTireFactor','pacedPowerGain','pacedTireGain','pacedWheelHits','pacedOutputsVerified',...PACED_PATH_FIELDS];
  const RUBBERBAND_FIELDS=['rubberbandState','rubberbandActive','rubberbandResetPending','rubberbandResetAcknowledged','rubberbandRequestedPercent','rubberbandAppliedPercent','rubberbandPublication','rubberbandAckAgeMs','nativeRubberband','rubberbandUnavailable','nativeCalculatedEligible','nativeCatchupOn','nativeCornerTarget',...PACED_FIELDS];
  FLAGS.push('rubberbandActive','rubberbandResetPending','rubberbandResetAcknowledged','nativeRubberband','rubberbandUnavailable','nativeCalculatedEligible','nativeCatchupOn','nativeCornerTarget');
  FLAGS.push('nativePacedCatchup','pacedCatchupEligible','pacedOutputsVerified');
  Object.assign(NUMBERS,{rubberbandRequestedPercent:[100,200],rubberbandAppliedPercent:[100,200],rubberbandPublication:[0,32767],rubberbandAckAgeMs:[0,1e9],pacedRequestedStrength:[1,10],pacedAppliedStrength:[1,10],pacedSourceFactor:[0,1e6],pacedPowerFactor:[0,1e6],pacedTireFactor:[0,1e6],pacedPowerGain:[1,20],pacedTireGain:[1,40],pacedWheelHits:[0,4]});
  Object.assign(NUMBERS,{pacedAckRejectCode:[0,31],pacedPhysicsKind:[1,3],pacedCombinedGripFactor:[0,1e6],pacedNativeStage:[0,31]});
  MOVING_FIELDS.push(...RUBBERBAND_FIELDS);
  TOOL_FLAGS.push('rubberband');TOOL_NUMBERS.rubberbandPercent=[100,200];TOOL_NUMBERS.rubberbandStrength=[1,10];
  const READ_PHASE_NAMES=['memory','commit-bitmap','owned-command','race-context','network-context','network-host','race-exclusions','player-pointer','player','car','race-pointer','race','driver','route-pointer','private-route','pace-cache','route-count','node-list','track-identity','track-info-pointer','track-info','event-context','career-event','career-heat','route-node','node-vtable','road-group-pointer','road-group','road-record','game-tick','window-control'];
  const READ_SUBREASON_NAMES=['invalid-span','below-guest-minimum','runtime-gap','window-unavailable','span-end','linear-memory-end','uncommitted-page','unaligned-pointer','read-budget','memory-buffer-changed','commit-state-changed','snapshot-changed','host-span','window-state-changed','shared-memory-required','bitmap-unavailable'];
  const CONTEXT_FIELDS=['forwardReadPhaseCode','forwardReadSubreasonCode','cityPacingEnabled','cityPacingState','citySelectedPace','cityRuntimePace','cityClearanceObserved','cityClearanceDistance','cityClearanceSource','cityClearanceTarget','cityTimingState','citySampleGapMs','onlineRivalsRequested','trafficHitsExact','nativeControlOverrideLatched','nativePreviousTarget','nativeThrottleHold','nativeWheelContactMask','gameTicks','nosTelemetry','nosClockNetwork','nosTimestampActive','nosClockTicks','nosSinceTicks','nosFullTicks','nosRemainingTicks','nosElapsedTicks','onlineTrafficRequested','onlinePlayersRequested','onlineRaceCarsRequested','onlinePlayerOutrunRequested','carRequested','carHits','trafficHits','playerHits','contactCounterScope','onlineRivalsSelected','onlineAllCarsSelected'];
  FLAGS.push('cityPacingEnabled','cityClearanceObserved','onlineRivalsRequested','onlinePlayerOutrunRequested','trafficHitsExact','nativeControlOverrideLatched','onlineRivalsSelected','onlineAllCarsSelected');
  Object.assign(NUMBERS,{forwardReadPhaseCode:[1,31],forwardReadSubreasonCode:[1,16],citySelectedPace:[.75,3],cityRuntimePace:[.75,3],cityClearanceDistance:[0,150],cityClearanceTarget:[0,500],citySampleGapMs:[0,1e9],nativePreviousTarget:[-500,500],nativeThrottleHold:[0,1],nativeWheelContactMask:[0,15]});
  TRACE_ENUMS.cityPacingState=['off','unsupported','network-permission','not-online','mode','ai-off','paused','waiting-owner','invalid','clearance-limited','selected-native'];
  TRACE_ENUMS.cityClearanceSource=['barrier','vehicle'];
  TRACE_ENUMS.cityTimingState=['initial','continuous','gap','rollback','invalid'];
  TRACE_ENUMS.contactCounterScope=['aggregate-car-contacts','separate-traffic-and-player','solo-car-contacts'];
  MOVING_FIELDS.push(...CONTEXT_FIELDS.filter(key=>!['nosTelemetry','nosClockNetwork','nosTimestampActive'].includes(key)));
  const TRACE_FIELDS=[
    'version','revision','moduleHash','ready','driving','network','safe','hidden','focused','supported','hud','flow','trackId','raceType','racePhase',
    'streetXRace','forcedStreetX','onlineStreetX','dragRace','forcedDrag','driftRace','forcedDrift','driverKind','physicsKind',
    'aiActive','aiOwned','handbackPending','aiRequestedMode','aiNativeStatus','aiStaleTicks','nativeSkill',
    'paceConfirmed','requestedPace','paceApplied','nativePaceFactor','nativePaceRequested','nativePaceApplied','nativePaceHits','nativePaceTelemetryStatus',
    'speedMps','forwardMps','carGear','carRpm','nativeThrottle','nativeBrake','nativeHandbrake','nativeSteering','nativeRoadTarget','nativeRoadTargetStatus','nativeTelemetryStatus',
    'cornerRequested','cornerMode','cornerPace','cornerBraking','cornerHits','brakingHits','cornerApplied','cornerDriverValid','cornerRouteOwned','cornerRouteNodes','cornerPlannerCorners','cornerPlannerUsable','cornerPlannerTelemetryStatus','cornerGuardMask','cornerMemoryBlocked','cornerDriftBlocked',
    'adaptiveRaceRequested','adaptiveRaceCeiling','adaptiveRaceState','adaptivePacingState','adaptiveRuntimePace','adaptiveClearanceM',
    'planCurrentCorners','planClearanceAvailable','planClearanceObserved','planClearanceTarget','planClearanceSource','planInputSpeedMps','planSelectedPace',
    'nativeForwardGeometry','nativeForwardClamp','forwardUnavailable','forwardState','forwardCaptured','forwardSamples','forwardHorizon','forwardPriorityTurns','forwardRequestedTarget','forwardLeaseTicks','forwardFailureCode','forwardGuardCode','forwardNativeApplied','forwardLiveVerified',
    'forwardPlanAvailable','forwardPlanOverride','forwardPlanReasonCode','forwardPlanTarget','forwardPlanConstraints','forwardPlanKnots','forwardLimitingDistance','forwardLimitingAngle','forwardLimitingCurvature','forwardLimitingCurveTarget','forwardLimitingEntryTarget','forwardPlanGrip','forwardPlanLateral','forwardPlanBrake',
    'powerActive','effectivePower','powerStatus','gripActive','effectiveGrip','producerFailureCode','producerStage','traceStatus','pageHeartbeat','nativeHeartbeatAck',
    'catchupDriverVerified','catchupDriverFactor','catchupCarFactor','catchupTelemetryStatus','shortcutPolicyInstalled','shortcutPolicyRequested',...RUBBERBAND_FIELDS,
  ];
  const V03810_TRACE_COLUMNS=Object.freeze(['at',...TRACE_FIELDS,...TOOL_FLAGS.map(k=>'tools.'+k),...Object.keys(TOOL_NUMBERS).map(k=>'tools.'+k)]);
  const V03811_TRACE_COLUMNS=Object.freeze([...V03810_TRACE_COLUMNS,...CONTEXT_FIELDS]);
  const CITY_CONTACT_FIELDS=['cityContactPreviewAvailable','cityContactPreviewState','cityObservedCars','cityExcludedCars'];
  FLAGS.push('cityContactPreviewAvailable');
  Object.assign(NUMBERS,{cityObservedCars:[0,96],cityExcludedCars:[0,96]});
  TRACE_ENUMS.cityContactPreviewState=['unavailable','exact-build-required','scan-unavailable','context-unavailable','memory-unavailable','command-ineligible','mode-ineligible','special-mode','offline','owner-changed','local-body-unavailable','source-changed','source-unavailable','current-contact-policy'];
  MOVING_FIELDS.push('cityObservedCars','cityExcludedCars');
  const V03812_TRACE_COLUMNS=Object.freeze([...V03811_TRACE_COLUMNS,...CITY_CONTACT_FIELDS]);
  const NUMERIC_FIELDS=['forwardNumericControlWord','forwardNumericFailureMask'];
  Object.assign(NUMBERS,{forwardNumericControlWord:[0,65535],forwardNumericFailureMask:[0,15]});
  MOVING_FIELDS.push(...NUMERIC_FIELDS);
  const V03813_TRACE_COLUMNS=Object.freeze([...V03812_TRACE_COLUMNS,...NUMERIC_FIELDS]);
  const V0420_TRACE_COLUMNS=Object.freeze([...V03813_TRACE_COLUMNS,...AUTONOMY_STATUS_FIELDS,'autonomyAvailable','autonomyCatalogFresh','autonomyInRoam','autonomyStartEnabled','autonomyVisitDrag','autonomyCruiseSelected','autonomyTargetLocked','autonomySelectedCount','autonomyLocationCount','autonomyOfferCount','autonomyBlockReason','autonomyReadReason']);
  const ONLINE_AI_FIELDS=['nativeOnlineAI','onlineAIAllowed','railsWanted','railsRequested','railsOn','railsPins','railsPaceOnly','railsSuspended','railsRecoveryTrips','skillNine'];
  FLAGS.push('nativeOnlineAI','onlineAIAllowed','railsWanted','railsRequested','railsOn','railsPaceOnly','railsSuspended','skillNine');
  Object.assign(NUMBERS,{railsPins:[0,4294967295],railsRecoveryTrips:[0,2]});
  TOOL_FLAGS.push('rails');MOVING_FIELDS.push('railsPins');
  const V0422_TRACE_COLUMNS=Object.freeze([...V0420_TRACE_COLUMNS,...ONLINE_AI_FIELDS,'tools.rails']);
  const V0424_TRACE_COLUMNS=Object.freeze([...V0422_TRACE_COLUMNS,...FORWARD_LEASE_FIELDS]);
  const TARGET_FEEDBACK_FIELDS=["nativeTargetStatus","nativeTargetFresh","nativeTargetProof","nativeTargetCommandStable","nativeTargetReceiptAgeMs","nativeTargetSetterAgeTicks","nativeTargetIncoming","nativeTargetRequestedCap","nativeTargetEffectiveCap","nativeTargetResult","nativeTargetReceiptSequence","nativeTargetCapSequence","nativeTargetRequest","nativeTargetOwnerSequence","nativeTargetCaptureTick","nativeTargetSetterTick","nativeTargetCapAgeTicks","nativeTargetPrimaryReason","nativeTargetCachedReason","nativeTargetOutcome","nativeTargetCar","nativeTargetDriver","nativeTargetRace","nativeTargetRoute"];
  FLAGS.push('nativeTargetFresh','nativeTargetProof','nativeTargetCommandStable');
  Object.assign(NUMBERS,{"nativeTargetReceiptAgeMs":[0,1000],"nativeTargetSetterAgeTicks":[0,4294967295],"nativeTargetIncoming":[-1000000,1000000],"nativeTargetRequestedCap":[-1000000,1000000],"nativeTargetEffectiveCap":[-1000000,1000000],"nativeTargetResult":[-1000000,1000000],"nativeTargetReceiptSequence":[0,4294967295],"nativeTargetCapSequence":[0,4294967295],"nativeTargetRequest":[0,4294967295],"nativeTargetOwnerSequence":[0,4294967295],"nativeTargetCaptureTick":[0,4294967295],"nativeTargetSetterTick":[0,4294967295],"nativeTargetCapAgeTicks":[0,4294967295],"nativeTargetPrimaryReason":[0,4294967295],"nativeTargetCachedReason":[0,4294967295],"nativeTargetOutcome":[0,4294967295],"nativeTargetCar":[0,4294967295],"nativeTargetDriver":[0,4294967295],"nativeTargetRace":[0,4294967295],"nativeTargetRoute":[0,4294967295]});
  TRACE_ENUMS.nativeTargetStatus=['unavailable','waiting','suspended','stale','owner-changed','invalid','observed'];
  MOVING_FIELDS.push(...TARGET_FEEDBACK_FIELDS);
  const TRACE_COLUMNS=Object.freeze([...V0424_TRACE_COLUMNS,...TARGET_FEEDBACK_FIELDS]);
  const LAST_TRACE_COLUMNS=V03810_TRACE_COLUMNS.filter(k=>!PACED_PATH_FIELDS.includes(k));
  const RECENT_TRACE_COLUMNS=V03810_TRACE_COLUMNS.filter(k=>![...PACED_FIELDS,'tools.rubberbandStrength'].includes(k));
  const PREVIOUS_TRACE_COLUMNS=V03810_TRACE_COLUMNS.filter(k=>![...RUBBERBAND_FIELDS,'tools.rubberband','tools.rubberbandPercent','tools.rubberbandStrength'].includes(k));
  const OLDER_TRACE_COLUMNS=PREVIOUS_TRACE_COLUMNS.filter(k=>!['catchupDriverVerified','catchupDriverFactor','catchupCarFactor','catchupTelemetryStatus','shortcutPolicyInstalled','shortcutPolicyRequested'].includes(k));
  const cleanTraceRow=row=>{
    const input={tools:{}};
    for(let i=1;i<TRACE_COLUMNS.length;i++){const key=TRACE_COLUMNS[i];if(key.startsWith('tools.'))input.tools[key.slice(6)]=row[i];else input[key]=row[i];}
    const clean=sanitize(input);
    return [Math.floor(row[0]),...TRACE_COLUMNS.slice(1).map(key=>key.startsWith('tools.')?(clean.tools?.[key.slice(6)]??null):(clean[key]??null))];
  };
  const read = (value, key) => { try { return value == null ? undefined : value[key]; } catch { return undefined; } };
  const str = value => typeof value === 'string' ? value.slice(0,MAX_ERROR_INPUT) : '';
  const number = (value, limits) => typeof value === 'number' && Number.isFinite(value) && value >= limits[0] && value <= limits[1] ? Math.round(value*1000)/1000 : undefined;
  function fields(value, flags, numbers) {
    const out = {};
    for (const key of flags) if (typeof read(value,key) === 'boolean') out[key] = read(value,key);
    for (const [key,limits] of Object.entries(numbers)) { const v = number(read(value,key),limits); if (v !== undefined) out[key] = v; }
    return out;
  }
  const MAX_RAILS_TRANSITIONS=24;
  const RAILS_TRANSITION_FLAGS=['railsSelected','supported','ready','network','safe','hidden','focused','menuOpen','onlineAIAllowed','railsWanted','railsRequested','railsOn','railsSuspended','aiActive','aiOwned','handbackPending'];
  const RAILS_TRANSITION_NUMBERS={hud:[0,3],raceType:[0,100],racePhase:[0,100],driverKind:[0,100],physicsKind:[0,100],railsRecoveryTrips:[0,2]};
  const RAILS_TRANSITION_REASONS=new Set(['selection-off','build-unavailable','state-unavailable','tab-hidden','window-unfocused','game-menu','network-permission','mode-ineligible','not-driving','recovery-release','recovery-limit','handback-pending','simplified-physics-observed','owned-full-physics-observed','ownership-pending','rails-not-requested','context-changed']);
  function railsTransitionState(value,fromPage=false){
    const out={};
    for(const key of RAILS_TRANSITION_FLAGS){
      const v=fromPage&&key==='railsSelected'?read(read(value,'tools'),'rails'):read(value,fromPage&&key==='menuOpen'?'railsMenuOpen':key);
      if(typeof v==='boolean')out[key]=v;
    }
    for(const [key,limits] of Object.entries(RAILS_TRANSITION_NUMBERS)){
      const v=read(value,key);if(Number.isInteger(v)&&v>=limits[0]&&v<=limits[1])out[key]=v;
    }
    return out;
  }
  function railsTransitionReason(s){
    // Describes page-observed context only, never why a native guard rejected.
    return s.railsSelected===false?'selection-off':s.supported===false?'build-unavailable':s.ready===false?'state-unavailable':s.hidden===true?'tab-hidden':s.focused===false?'window-unfocused':s.menuOpen===true?'game-menu':s.network===true&&s.onlineAIAllowed===false?'network-permission':s.railsWanted===false?'mode-ineligible':s.safe===false?'not-driving':s.railsSuspended===true?(s.railsRecoveryTrips>=2?'recovery-limit':'recovery-release'):s.handbackPending===true?'handback-pending':s.railsOn===true?'simplified-physics-observed':s.railsRequested===true&&s.aiOwned===true&&s.aiActive===true&&s.physicsKind===1?'owned-full-physics-observed':s.railsRequested===true&&(s.aiOwned===false||s.aiActive===false)?'ownership-pending':s.railsWanted===true&&s.railsRequested===false?'rails-not-requested':'context-changed';
  }
  function cleanRailsTransition(value){
    if(read(value,'source')!=='page-observation'||!RAILS_TRANSITION_REASONS.has(read(value,'reason')))return null;
    const previous=railsTransitionState(read(value,'previous')),current=railsTransitionState(read(value,'current'));
    if(!Object.keys(previous).length||!Object.keys(current).length)return null;
    return {source:'page-observation',reason:read(value,'reason'),previous,current};
  }
  function errorInfo(error, stack) {
    const message = str(typeof error === 'string' ? error : read(error,'message'));
    const name = str(read(error,'name'));
    const text = `${name} ${message}`.toLowerCase();
    const errorKind = /out of bounds|bounds check|outside.*memory/.test(text) ? 'memory-bounds'
      : /unreachable/.test(text) ? 'unreachable'
      : /indirect call|signature mismatch|null function|table index/.test(text) ? 'indirect-call'
      : /divide by zero|integer overflow/.test(text) ? 'integer-divide'
      : /invalid conversion/.test(text) ? 'invalid-conversion'
      : /call stack|stack overflow/.test(text) ? 'stack-overflow'
      : /out of memory|allocation failed|memory allocation/.test(text) ? 'out-of-memory'
      : /typeerror/.test(text) ? 'type-error'
      : /referenceerror/.test(text) ? 'reference-error'
      : /syntaxerror/.test(text) ? 'syntax-error' : 'other';
    const source = str(stack === undefined ? read(error,'stack') : stack);
    // Keep only numeric wasm locations and known local source basenames/line numbers.
    // Never retain error text, URLs, arguments, file paths, arbitrary function names or query strings.
    const wasmFrames = [...source.matchAll(/wasm-function\[(\d{1,7})\]:(0x[0-9a-f]{1,12}|\d{1,12})(?![\da-f])/gi)].slice(0,12).map(m=>`wasm-function[${m[1]}]:${m[2]}`);
    const jsFrames = [...source.matchAll(/(?:^|[/\\\s(])((?:page|ai|core|diagnostics|current-profile|latest-profile|signatures|signature-profile|signature-profile-latest|dyno|dyno-core|dyno-full|dyno-evaluator|dyno-native|walls|cars|game-worker)\.js):(\d{1,7}):(\d{1,7})(?!\d)/g)].slice(0,8).map(m=>`${m[1]}:${m[2]}:${m[3]}`);
    return {errorKind,wasmFrames,jsFrames};
  }
  function sanitize(value) {
    const out = fields(value,FLAGS,NUMBERS);
    const railsEvent=cleanRailsTransition(read(value,'railsTransition'));if(railsEvent)out.railsTransition=railsEvent;
    for(const key of ['autonomyWaypointIndex','autonomyWaypointCount','autonomyCompletedTrips'])if(!Number.isInteger(read(value,key)))delete out[key];
    for(const key of ['ecuScopeHits','ecuActions','ecuClicks'])if(!Number.isInteger(read(value,key)))delete out[key];
    for(const [key,allowed] of Object.entries(TRACE_ENUMS))if(allowed.includes(read(value,key)))out[key]=read(value,key);
    for(const key of ['autonomySelectedCount','autonomyLocationCount','autonomyOfferCount'])if(!Number.isInteger(read(value,key)))delete out[key];
    for(const key of ['producerFailureCode','producerStage','forwardPlanReasonCode','nativePaceHits','forwardPlanConstraints','forwardPlanKnots','pacedAckRejectCode','pacedNativeStage','nativeWheelContactMask'])if(!Number.isInteger(read(value,key)))delete out[key];
    if(![1,3].includes(read(value,'pacedPhysicsKind')))delete out.pacedPhysicsKind;
    const curvature=read(value,'forwardLimitingCurvature');if(typeof curvature==='number'&&Number.isFinite(curvature)&&curvature>=0&&curvature<=100)out.forwardLimitingCurvature=Math.round(curvature*1e9)/1e9;
    if(!Number.isInteger(read(value,'forwardFailureCode')))delete out.forwardFailureCode;
    for(const key of NUMERIC_FIELDS)if(!Number.isInteger(read(value,key)))delete out[key];
    if(!FORWARD_GUARDS.has(read(value,'forwardGuardCode')))delete out.forwardGuardCode;
    if(!Number.isInteger(read(value,'forwardReadPhaseCode'))||!Number.isInteger(read(value,'forwardReadSubreasonCode'))||out.forwardReadPhaseCode===undefined||out.forwardReadSubreasonCode===undefined){delete out.forwardReadPhaseCode;delete out.forwardReadSubreasonCode;}
    if(FORWARD_STATES.has(read(value,'forwardState')))out.forwardState=read(value,'forwardState');
    const leaseState=read(value,'forwardLeaseState');
    if(FORWARD_LEASE_STATES.has(leaseState))out.forwardLeaseState=leaseState;
    if(!Number.isInteger(read(value,'forwardLeaseAgeTicks')))delete out.forwardLeaseAgeTicks;
    if(out.forwardLeaseAcknowledged===true&&(!['acknowledged','renewing'].includes(leaseState)||out.forwardLeaseAgeTicks===undefined))delete out.forwardLeaseAcknowledged;
    // The bounded native-cache receipt is reported separately above. It is
    // not proof of continuous application or a live cornering improvement.
    for(const key of ['forwardNativeApplied','forwardLiveVerified'])if(read(value,key)===false)out[key]=false;
    if(ADAPTIVE_STATES.has(read(value,'adaptiveRaceState')))out.adaptiveRaceState=read(value,'adaptiveRaceState');
    if(PACING_STATES.has(read(value,'adaptivePacingState')))out.adaptivePacingState=read(value,'adaptivePacingState');
    if(POWER_STATUSES.has(read(value,'powerStatus')))out.powerStatus=read(value,'powerStatus');
    for(const key of ['revision','reportedRevision','candidateRevision','signatureReference']){
      const revision=read(value,key);
      if(typeof revision==='string'&&/^(?:[a-f0-9]{8,40}|unknown)$/.test(revision))out[key]=revision;
    }
    const moduleHash=read(value,'moduleHash');
    if(typeof moduleHash==='string'&&/^[a-f0-9]{64}$/.test(moduleHash))out.moduleHash=moduleHash;
    if(PATCH_CODES.has(read(value,'patchCode')))out.patchCode=read(value,'patchCode');
    const version = read(value,'version');
    if (typeof version === 'string' && /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(version)) out.version = version;
    for (const [key,allowed] of [['phase',PHASES],['reason',REASONS],['errorKind',ERROR_KINDS]]) if (allowed.has(read(value,key))) out[key] = read(value,key);
    if (read(value,'tools')) out.tools = fields(read(value,'tools'),TOOL_FLAGS,TOOL_NUMBERS);
    const dynoStatus=read(value,'dynoStatus'),dynoGuard=read(value,'dynoGuard'),dynoObserved=read(value,'dynoObserved');
    if(DYNO_STATUSES.has(dynoStatus))out.dynoStatus=dynoStatus;
    if(dynoStatus===8&&DYNO_GUARDS.has(dynoGuard)){
      out.dynoGuard=dynoGuard;
      if(Number.isInteger(dynoObserved)&&dynoObserved>=0&&dynoObserved<=4294967295&&
        ([30,31,32,70].includes(dynoGuard)||(dynoGuard===50&&DYNO_SOURCE_PAIRS.has(dynoObserved))))out.dynoObserved=dynoObserved;
    }

    if (read(value,'error') !== undefined || read(value,'stack') !== undefined) Object.assign(out,errorInfo(read(value,'error'),read(value,'stack')));
    // Revalidate persisted records too, never trust same-origin storage or its fields.
    else for (const [key,re,max] of [['wasmFrames',/^wasm-function\[\d{1,7}\]:(?:0x[0-9a-f]{1,12}|\d{1,12})$/i,12],['jsFrames',/^(?:page|ai|core|diagnostics|current-profile|latest-profile|signatures|signature-profile|signature-profile-latest|dyno|dyno-core|dyno-full|dyno-evaluator|dyno-native|walls|cars|game-worker)\.js:\d{1,7}:\d{1,7}$/,8]]) {
      const a=read(value,key);if(Array.isArray(a))out[key]=a.slice(0,max).filter(v=>typeof v==='string'&&re.test(v));
    }
    return out;
  }
  function create({storage=null,clock=()=>Date.now(),version='0.38.18'}={}) {
    let events=[],drivingSamples=[],dropped=0,persistence=storage?'same-tab':'memory-only',lastSnapshot='',lastSample=0;
    let traceRows=[],traceDropped=0,lastTraceAt=null,lastTracePersistAt=null,traceWasDriving=false,lastIdleFailure=null,tracePersistence=storage?'same-tab':'memory-only',traceRestored=false;
    let lastRaceRows=[],lastRaceDropped=0,lastRacePersistAt=null,lastRaceDirty=false,lastRaceRestored=false,lastRacePersistence=storage?'same-tab':'memory-only';
    const bursts=new Map();
    let lastRailsTransition=null;
    const now=()=>{try{const n=clock();return Number.isFinite(n)&&n>=0?Math.floor(n):0;}catch{return 0;}};
    const tracePacked=()=>({format:'nfsu2-driving-trace-v1',schema:1,columns:TRACE_COLUMNS,dropped:traceDropped,rows:traceRows});
    const boundTrace=()=>{while(traceRows.length>MAX_TRACE_SAMPLES||JSON.stringify(tracePacked()).length>MAX_TRACE_BYTES){traceRows.shift();traceDropped++;}};
    const persistTrace=(force=false)=>{
      const t=now();if(!force&&lastTracePersistAt!==null&&t>=lastTracePersistAt&&t-lastTracePersistAt<TRACE_PERSIST_MS)return;
      lastTracePersistAt=t;boundTrace();
      if(storage)try{storage.setItem(TRACE_KEY,JSON.stringify(tracePacked()));tracePersistence='same-tab';}catch{tracePersistence='memory-only';}
    };
    try{
      const raw=storage?.getItem(TRACE_KEY);
      if(typeof raw==='string'&&raw.length<=MAX_TRACE_BYTES){
        const saved=JSON.parse(raw);
        const currentColumns=JSON.stringify(saved?.columns)===JSON.stringify(TRACE_COLUMNS),previousColumns=JSON.stringify(saved?.columns)===JSON.stringify(V0424_TRACE_COLUMNS)||JSON.stringify(saved?.columns)===JSON.stringify(V0422_TRACE_COLUMNS)||JSON.stringify(saved?.columns)===JSON.stringify(V0420_TRACE_COLUMNS)||JSON.stringify(saved?.columns)===JSON.stringify(V03813_TRACE_COLUMNS)||JSON.stringify(saved?.columns)===JSON.stringify(V03812_TRACE_COLUMNS)||JSON.stringify(saved?.columns)===JSON.stringify(V03811_TRACE_COLUMNS)||JSON.stringify(saved?.columns)===JSON.stringify(V03810_TRACE_COLUMNS)||JSON.stringify(saved?.columns)===JSON.stringify(LAST_TRACE_COLUMNS)||JSON.stringify(saved?.columns)===JSON.stringify(RECENT_TRACE_COLUMNS)||JSON.stringify(saved?.columns)===JSON.stringify(PREVIOUS_TRACE_COLUMNS)||JSON.stringify(saved?.columns)===JSON.stringify(OLDER_TRACE_COLUMNS);
        if(saved?.format==='nfsu2-driving-trace-v1'&&saved.schema===1&&(currentColumns||previousColumns)&&Array.isArray(saved.rows)){
          traceDropped=Number.isSafeInteger(saved.dropped)&&saved.dropped>=0?saved.dropped:0;
          const indexes=TRACE_COLUMNS.map(k=>saved.columns.indexOf(k));
          traceRows=saved.rows.slice(-MAX_TRACE_SAMPLES).filter(r=>Array.isArray(r)&&r.length===saved.columns.length&&Number.isFinite(r[0])&&r[0]>=0&&r[0]<=8640000000000000).map(r=>cleanTraceRow(currentColumns?r:indexes.map(i=>i<0?null:r[i])));
          boundTrace();traceRestored=traceRows.length>0;
        }
      }
    }catch{tracePersistence='memory-only';}
    // A separate bounded copy survives ordinary free-roam trace eviction.
    // Reuse only already-sanitized trace rows; never collect new source data.
    const lastRacePacked=()=>({format:'nfsu2-last-race-trace-v1',schema:1,columns:TRACE_COLUMNS,dropped:lastRaceDropped,rows:lastRaceRows});
    const isRaceRow=row=>row[TRACE_COLUMNS.indexOf('ready')]===true&&row[TRACE_COLUMNS.indexOf('hud')]===1&&row[TRACE_COLUMNS.indexOf('raceType')]===1;
    const boundLastRace=()=>{while(lastRaceRows.length>MAX_LAST_RACE_TRACE_SAMPLES||JSON.stringify(lastRacePacked()).length>MAX_LAST_RACE_TRACE_BYTES){lastRaceRows.shift();lastRaceDropped++;}};
    const persistLastRace=(force=false)=>{
      if(!lastRaceDirty)return;
      const t=now();if(!force&&lastRacePersistAt!==null&&t>=lastRacePersistAt&&t-lastRacePersistAt<TRACE_PERSIST_MS)return;
      lastRacePersistAt=t;boundLastRace();
      if(storage)try{storage.setItem(LAST_RACE_TRACE_KEY,JSON.stringify(lastRacePacked()));lastRacePersistence='same-tab';lastRaceDirty=false;}catch{lastRacePersistence='memory-only';}
    };
    const retainLastRace=row=>{if(!isRaceRow(row))return;lastRaceRows.push(row.slice());boundLastRace();lastRaceDirty=true;persistLastRace();};
    let lastRaceStored=false;
    try{
      const raw=storage?.getItem(LAST_RACE_TRACE_KEY);
      if(typeof raw==='string'&&raw.length<=MAX_LAST_RACE_TRACE_BYTES){
        const saved=JSON.parse(raw),known=[TRACE_COLUMNS,V0424_TRACE_COLUMNS,V0422_TRACE_COLUMNS,V0420_TRACE_COLUMNS,V03813_TRACE_COLUMNS,V03812_TRACE_COLUMNS,V03811_TRACE_COLUMNS,V03810_TRACE_COLUMNS,LAST_TRACE_COLUMNS,RECENT_TRACE_COLUMNS,PREVIOUS_TRACE_COLUMNS,OLDER_TRACE_COLUMNS];
        if(saved?.format==='nfsu2-last-race-trace-v1'&&saved.schema===1&&known.some(columns=>JSON.stringify(saved.columns)===JSON.stringify(columns))&&Array.isArray(saved.rows)){
          lastRaceStored=true;lastRaceDropped=Number.isSafeInteger(saved.dropped)&&saved.dropped>=0?saved.dropped:0;
          const indexes=TRACE_COLUMNS.map(k=>saved.columns.indexOf(k));
          lastRaceRows=saved.rows.slice(-MAX_LAST_RACE_TRACE_SAMPLES).filter(row=>Array.isArray(row)&&row.length===saved.columns.length&&Number.isFinite(row[0])&&row[0]>=0&&row[0]<=8640000000000000).map(row=>cleanTraceRow(indexes.map(i=>i<0?null:row[i]))).filter(isRaceRow);
          boundLastRace();lastRaceRestored=lastRaceRows.length>0;
        }
      }
    }catch{lastRacePersistence='memory-only';}
    // Upgrade a pre-feature same-tab trace only after its existing strict
    // column migration and sanitization have succeeded above.
    if(!lastRaceStored){lastRaceRows=traceRows.filter(isRaceRow).map(row=>row.slice());boundLastRace();lastRaceRestored=lastRaceRows.length>0;lastRaceDirty=lastRaceRestored;}
    const trace=(data={})=>{
      try{
        const clean=sanitize(data),active=clean.ready===true&&(clean.driving===true||clean.aiActive===true||clean.aiOwned===true)&&clean.safe!==false&&clean.hidden!==true&&clean.focused!==false;
        const failure=clean.producerFailureCode>0?JSON.stringify([clean.producerFailureCode,clean.producerStage,clean.nativeTelemetryStatus,clean.nativeRoadTargetStatus,clean.traceStatus,clean.trackId,clean.raceType]):null;
        const relevant=active||traceWasDriving||failure!==lastIdleFailure;
        if(!relevant)return false;
        const t=now();if(lastTraceAt!==null&&t>=lastTraceAt&&t-lastTraceAt<TRACE_MS)return false;lastTraceAt=t;
        traceWasDriving=active;lastIdleFailure=active?null:failure;
        clean.version=sanitize({version}).version;
        const row=[t,...TRACE_COLUMNS.slice(1).map(key=>key.startsWith('tools.')?(clean.tools?.[key.slice(6)]??null):(clean[key]??null))];
        traceRows.push(row);boundTrace();persistTrace();retainLastRace(row);return true;
      }catch{return false;}
    };
    const traceExport=()=>{
      const missing=Object.fromEntries(TRACE_COLUMNS.slice(1).map(k=>[k,0]));let maxGap=0,gaps=0,clockRollbacks=0;
      for(let i=0;i<traceRows.length;i++){
        const row=traceRows[i];for(let j=1;j<TRACE_COLUMNS.length;j++)if(row[j]===null)missing[TRACE_COLUMNS[j]]++;
        if(i){const delta=row[0]-traceRows[i-1][0];maxGap=Math.max(maxGap,delta);if(delta>TRACE_MS*2)gaps++;if(delta<0)clockRollbacks++;}
      }
      return {...tracePacked(),restoredFromSameTab:traceRestored,persistence:tracePersistence,nominalCadenceMs:TRACE_MS,persistIntervalMs:TRACE_PERSIST_MS,
        codebooks:{forwardNumericFailureBits:{1:'direction scale unavailable or changed',2:'first packed-road scale unavailable or changed',4:'second packed-road scale unavailable or changed',8:'unsupported x87 precision or rounding word'},pacedAckRejectCode:PACED_REJECT_CODES,forwardReadPhaseCode:Object.fromEntries(READ_PHASE_NAMES.map((name,i)=>[i+1,name])),forwardReadSubreasonCode:Object.fromEntries(READ_SUBREASON_NAMES.map((name,i)=>[i+1,name])),producerFailureCode:{0:'producer completed',1:'native/context read failed',2:'AI mailbox read failed',3:'forward diagnostics or trace sink failed'},producerStage:{0:'complete',1:'native/context',2:'AI mailbox',3:'forward diagnostics or sink'},forwardPlanReasonCode:{0:'not reported or unrecognized',...Object.fromEntries(PLAN_REASONS.map((name,i)=>[i+1,name]))},nativeUnits:['nativeRoadTarget','forwardRequestedTarget','forwardPlanTarget','forwardLimitingDistance','forwardLimitingCurveTarget','forwardLimitingEntryTarget','cityClearanceDistance','cityClearanceTarget'],statuses:TRACE_ENUMS},
        coverage:{samples:traceRows.length,firstAt:traceRows[0]?.[0]??null,lastAt:traceRows.at(-1)?.[0]??null,spanMs:traceRows.length?Math.max(0,traceRows.at(-1)[0]-traceRows[0][0]):0,maxGapMs:maxGap,gapsOver500Ms:gaps,clockRollbacks,missingByColumn:missing},
        notice:'Each row follows columns. null means unavailable or rejected, never zero. Desired cadence is 250ms; coverage reports actual retained timing. Samples are best-effort shared-memory observations, not atomic snapshots. Native target/geometry values use native units; cap requests are not application receipts. A loss of speed is not proof of an impact. Menus do not continuously evict driving evidence. Same-tab checkpoints are limited to one write per two seconds; a tab crash can lose recent samples.'};
    };
    const lastRaceExport=codebooks=>({...lastRacePacked(),historical:true,restoredFromSameTab:lastRaceRestored,persistence:lastRacePersistence,nominalCadenceMs:TRACE_MS,persistIntervalMs:TRACE_PERSIST_MS,codebooks,
      coverage:{samples:lastRaceRows.length,firstAt:lastRaceRows[0]?.[0]??null,lastAt:lastRaceRows.at(-1)?.[0]??null,spanMs:lastRaceRows.length?Math.max(0,lastRaceRows.at(-1)[0]-lastRaceRows[0][0]):0},
      notice:'Latest retained road-race samples with ready=true, HUD=1 and raceType=1. Mode flags preserve Street X, Drag and Drift context when reported. Free roam, Stop and manual takeover do not evict these historical rows. This is a bounded sample window, not a complete route, current ownership or proof of a race result. Rows follow columns; null means unavailable or rejected.'});
    const isDriving=data=>data.ready===true&&data.driving===true&&data.aiActive===true&&data.aiOwned===true;
    const retainDriving=sample=>{
      if(!isDriving(sample.data))return;
      drivingSamples.push(sample);
      while(drivingSamples.length>MAX_DRIVING_SAMPLES||JSON.stringify(drivingSamples).length>MAX_DRIVING_BYTES)drivingSamples.shift();
    };
    const packed=()=>({schema:1,dropped,events,drivingSamples});
    const bound=()=>{
      for(let extra=events.filter(e=>e.event==='rails-transition').length-MAX_RAILS_TRANSITIONS;extra>0;extra--){events.splice(events.findIndex(e=>e.event==='rails-transition'),1);dropped++;}
      while(events.length>MAX_EVENTS || JSON.stringify(packed()).length>MAX_BYTES){events.shift();dropped++;}
    };
    const persist=()=>{bound();if(storage)try{storage.setItem(KEY,JSON.stringify(packed()));persistence='same-tab';}catch{persistence='memory-only';}};
    try {
      const raw=storage?.getItem(KEY);
      if(typeof raw==='string'&&raw.length<=MAX_BYTES){
        const saved=JSON.parse(raw);
        if(saved?.schema===1&&Array.isArray(saved.events)){
          dropped=Number.isSafeInteger(saved.dropped)&&saved.dropped>=0?saved.dropped:0;
          events=saved.events.slice(-MAX_EVENTS).filter(e=>EVENTS.has(read(e,'event'))).map(e=>({at:number(read(e,'at'),[0,8640000000000000])??0,event:read(e,'event'),data:sanitize(read(e,'data'))}));
          // Historical driving evidence has its own small budget so a few
          // minutes in the menus cannot replace every useful race sample.
          // Revalidate stored values exactly like ordinary event records.
          if(Array.isArray(saved.drivingSamples))for(const e of saved.drivingSamples.slice(-MAX_DRIVING_SAMPLES))retainDriving({at:number(read(e,'at'),[0,8640000000000000])??0,data:sanitize(read(e,'data'))});
          if(!drivingSamples.length)for(const e of events)if(e.event==='state')retainDriving({at:e.at,data:e.data});
        }
      }
    } catch { persistence='memory-only'; }
    const record=(event,data={})=>{try{if(!EVENTS.has(event))return false;const at=now();if(['page-error','promise-rejection','worker-error','engine-error','dyno-error'].includes(event)){const burst=bursts.get(event);if(burst&&at-burst.at<1000){if(burst.count++>=8){dropped++;return false;}}else bursts.set(event,{at,count:1});}const clean=sanitize(data);events.push({at,event,data:clean});if(event==='state')retainDriving({at,data:clean});persist();return true;}catch{return false;}};
    const railsTransition=(data={})=>{
      try{
        const current=railsTransitionState(data,true),previous=lastRailsTransition;
        lastRailsTransition=current;
        if(!previous||JSON.stringify(previous)===JSON.stringify(current))return false;
        // Ordinary unrelated movement must not flood rails evidence. Pins,
        // speeds, target factors and heartbeat changes are absent from this key.
        if(![previous,current].some(s=>s.railsWanted===true||s.railsRequested===true||s.railsOn===true||s.railsSuspended===true))return false;
        return record('rails-transition',{railsTransition:{source:'page-observation',reason:railsTransitionReason(current),previous,current}});
      }catch{return false;}
    };
    const snapshot=(data={})=>{try{const clean=sanitize(data),stable={...clean};for(const key of MOVING_FIELDS)delete stable[key];const key=JSON.stringify(stable),t=now(),sampleMs=clean.nativeTelemetry||clean.driftRace||clean.forcedDrift||clean.driftVariant?2000:5000;if(lastSnapshot && t-lastSample < (key===lastSnapshot?sampleMs:250))return;lastSnapshot=key;lastSample=t;record('state',clean);}catch{}};
    const exportText=()=>{persistTrace(true);persistLastRace(true);const currentTrace=traceExport();return JSON.stringify({format:'NFSU2 Driving Tools local diagnostics',schema:1,exporterVersion:sanitize({version}).version,exportedAt:now(),persistence,dropped,limits:{maxEvents:MAX_EVENTS,maxRailsTransitionEvents:MAX_RAILS_TRANSITIONS,maxStoredBytes:MAX_BYTES,maxHistoricalDrivingSamples:MAX_DRIVING_SAMPLES,maxHistoricalDrivingBytes:MAX_DRIVING_BYTES,maxTraceSamples:MAX_TRACE_SAMPLES,maxTraceBytes:MAX_TRACE_BYTES,maxLastRaceTraceSamples:MAX_LAST_RACE_TRACE_SAMPLES,maxLastRaceTraceBytes:MAX_LAST_RACE_TRACE_BYTES},capture:'Tool selections, sampled game mode/status, bounded power application status, native pace acknowledgement and session-only adaptive planner request/evidence, bounded native controller/skill/input-mode/speed, Drift scoring, sampled NOS clock/timestamp/resource fields and corner evidence, page and game-worker lifecycle, classified errors, bounded tuner rejection codes/counts, numeric wasm locations and known script line numbers. No raw logs, messages, URLs, credentials, saves, names, keyboard input or network traffic. Same-origin page scripts can access this same-tab storage. Browser/tab/GPU failures may prevent a final event; absence of an error does not show that the game was healthy. Not a game crash dump. Native target receipts record actual setter observations, cap decisions and age in uncalibrated native units; they do not change driving. Rails transition reasons describe page observations, not native rejection causes.',historicalDriving:{historical:true,notice:'Previous sampled driving states; not current ownership, a complete route, or proof of a race result.',samples:drivingSamples},raceTrace:currentTrace,lastRaceTrace:lastRaceExport(currentTrace.codebooks),events},null,2)+'\n';};
    const clear=()=>{lastRailsTransition=null;events=[];drivingSamples=[];dropped=0;lastSnapshot='';lastSample=0;traceRows=[];traceDropped=0;lastTraceAt=null;traceWasDriving=false;lastIdleFailure=null;traceRestored=false;persistTrace(true);lastRaceRows=[];lastRaceDropped=0;lastRaceRestored=false;lastRacePersistAt=null;lastRaceDirty=true;persistLastRace(true);bursts.clear();record('clear');};
    record('page-start',{version});
    return Object.freeze({record,snapshot,trace,railsTransition,exportText,clear,status:()=>({events:events.length,dropped,persistence,traceSamples:traceRows.length,traceDropped,tracePersistence,lastRaceTraceSamples:lastRaceRows.length,lastRaceTraceDropped:lastRaceDropped,lastRaceTracePersistence:lastRacePersistence})});
  }
  const api=Object.freeze({create,errorInfo,KEY,MAX_EVENTS,MAX_BYTES,TRACE_KEY,TRACE_MS,MAX_TRACE_SAMPLES,MAX_TRACE_BYTES,TRACE_COLUMNS,LAST_RACE_TRACE_KEY,MAX_LAST_RACE_TRACE_SAMPLES,MAX_LAST_RACE_TRACE_BYTES});
  root.__NFSU2_DIAGNOSTICS__=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
