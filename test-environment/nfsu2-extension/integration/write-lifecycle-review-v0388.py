"""Seal the completed read-only lifecycle review against frozen proof inputs.

This writes only its new candidate review receipt. It never packages or copies
runtime files, touches the stable installation, or operates the game.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
PIN = '482f4744f5843ec8bb71a65663cdd02f3f5694cb8b0284e25b90ebc0a100a6e1'
NATIVE_PIN = '46deba754d8f79838a376d2d73827386a363e3fd363e36d31abb2f519f343c17'
VISUAL = 'verification/hud-broadcast-attempt4-v0388/hud-labels-browser-v0388.json'
VISUAL_PIN = 'fb4ee68148637afcedab5e6cc2d90c3d3b202bfa49b88f95fa5737b80b20bbe1'
HUD_UNITS = 'integration/native-hud-units-evidence-v0388.json'
HUD_UNITS_PIN = '90a34eae4683fc84a7262e54c7a594adff7f4056e92522b457b051a6b00ed3da'
PARSER_PROOF = 'verification/parser-regression-fix-v0388.json'
PARSER_PROOF_PIN = 'a07cf1c2099b937fdd185b93b29e078ddb891d7373e34e431816f9af9a69a1d4'


def digest(name):
    return hashlib.sha256((ROOT / name).read_bytes()).hexdigest()


def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8-sig'))


def main():
    if not __debug__:
        raise RuntimeError('Review sealing requires assertions enabled')
    target = ROOT / 'integration/lifecycle-review-paced-catchup-v0388.json'
    assert not target.exists(), 'Preserve final lifecycle review'
    lock_name = 'verification/source-reviewed-v0388-final.json'
    canonical_name = 'verification/canonical-suite-v0388-final-result.json'
    native_name = 'verification/release-modules-v0388-final.json'
    review_name = 'integration/paced-native-independent-review-v0388.json'
    assert digest(lock_name) == PIN and digest(native_name) == NATIVE_PIN
    lock, suite, native, review, visual = (read(n) for n in (lock_name, canonical_name, native_name, review_name, VISUAL))
    current = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT / 'extension').iterdir())}
    assert len(lock) == 57 and current == lock == suite['sourceHashes'] == native['sourceHashes']
    assert suite['passed'] is True and suite['sourceUnchanged'] is True and suite['testsUnchanged'] is True
    assert suite['runnerUnchanged'] is True and suite['runnerSha256'] == digest('tools/run-canonical-v0388.cjs')
    assert suite['counts']['tests'] == suite['counts']['pass'] >= 2700
    assert all(suite['counts'][k] == 0 for k in ('fail', 'cancelled', 'skipped', 'todo'))
    assert len(suite['excludedFiles']) == 8
    assert native['passed'] is True and native['sourceUnchanged'] is True
    assert native['strictInspectorPath'] == 'native/wasm-inspector-v0388.cjs'
    assert native['strictInspectorSha256'] == digest(native['strictInspectorPath'])
    assert native['parserRegressionProofSha256'] == digest(PARSER_PROOF) == PARSER_PROOF_PIN
    assert review['result'] == 'passed' and review['findings'] == [] and review['sourceUnchanged'] is True
    assert review['validation']['counts']['pass'] == 73
    for name, value in review['sourceHashes'].items():
        assert digest(name) == value, name
    assert digest(VISUAL) == VISUAL_PIN and visual['passed'] is True and visual['sourceUnchanged'] is True
    assert visual['liveGameTested'] is False and visual['gameAssetsLoaded'] is False
    assert visual['externalRequests'] == [] and visual['hudLayoutEqualsDeliveredV0387'] is True
    assert len(visual['cases']) == 18 and sum(len(v['checks']) for v in visual['dragChecks']) == 26
    for name, value in visual['sourceHashes'].items():
        assert digest(name) == value and lock[name.removeprefix('extension/')] == value
    for case in visual['cases']:
        assert case['outside'] == [] and case['overlaps'] == [] and case['pageOverflow'] is False
        assert all(label['glyphOverflow'] is False and label['scrollOverflow'] is False for label in case['labels'])
        assert digest(str(Path(VISUAL).parent / case['screenshot'])) == case['sha256']
    assert digest(HUD_UNITS) == HUD_UNITS_PIN
    units = read(HUD_UNITS)
    assert units['passed'] is True and units['revision'] == '943ee537'
    assert units['fullGameInstantiated'] is False and units['liveGameTested'] is False
    assert units['hud']['mphFactor'] == 2.236999988555908
    assert units['hud']['speedFormula'] == 'trunc(f32(abs(rawSpeed)*factor))'
    assert units['conversionFixture']['passed'] is True and units['conversionFixture']['cases'] == 64
    for name, value in units['sourceHashes'].items():
        assert hashlib.sha256((ROOT.parent / name).read_bytes()).hexdigest() == value, name
    baseline = read('verification/baseline-source-desktop-v0388.json')['extension']
    added = sorted(set(lock) - set(baseline))
    unchanged = sorted(name for name, value in lock.items() if baseline.get(name) == value)
    assert added == ['paced-catchup-controller.js', 'paced-catchup.js'] and len(unchanged) == 39
    for name in ('tool-profiles.js', 'hud-layout.js', 'dyno-full.js', 'dyno-core.js', 'dyno-native.js',
                 'dyno-evaluator.js', 'dyno-native-profile.js', 'dyno.js', 'walls.js', 'cars.js'):
        assert name in unchanged
    relevant = [name for name in suite['testHashes'] if name.startswith('tests/') and any(term in name for term in (
        'rubberband', 'paced-catchup', 'network-state', 'city-pacing', 'city-page', 'stream-hud', 'stream-page',
        'race-catalog', 'race-hub', 'hud-layout', 'radar', 'free-roam-braking', 'catchup-shortcut-loader',
        'camera', 'wasm-inspector', 'native-corner-target'))]
    report = {
        'version': '0.38.8', 'kind': 'final lifecycle, preservation and display integration review',
        'result': 'passed', 'findings': [], 'checkedAt': datetime.now(timezone.utc).isoformat(),
        'sourceLock': lock_name, 'sourceLockSha256': PIN, 'sourceHashes': lock,
        'nativeIndependentReview': review_name, 'nativeIndependentReviewSha256': digest(review_name),
        'activeContract': {
            'mode': 'pace-linked-native-catchup', 'authoredPaceRange': [1, 2],
            'authoredStrengthRange': [1, 10], 'percentStep': 5, 'strengthStep': 0.25,
            'defaultSelectedPace': 2, 'defaultStrength': 1,
            'defaultSelectionTakesManualControl': False, 'settingsSessionOnly': True,
            'sourceCachesUnchanged': True, 'powerFormula': 'f32(f32(M*Pf32)*S)',
            'tireFormula': 'f32(E*Pf32)', 'cornerGain': 'P*sqrt(S)',
            'nativeBrakingAssumptionUnscaled': True,
        },
        'checks': {
            'manualDriverNotAcquiredByDefaultSelection': True,
            'currentOwnedAIAndLiteralOnlinePermissionRequired': True,
            'independentPSControlsAreSessionOnly': True,
            'nativeSourceAndPhysicalOutputsRemainDistinct': True,
            'legacyPowerGripParkedThroughPendingNativeRestoration': True,
            'moduleMemoryCarAndCurrentAISequenceBound': True,
            'advancingPublicationAnd1000msExpiryRequiredForActiveClaim': True,
            'fourWheelPowerAndChassisEvidenceRequired': True,
            'stopManualPauseLoadAndReplacementClearGainClaims': True,
            'stopPublishesOff100Strength1AndWaitsForPhysicalAcknowledgement': True,
            'streetXDragDriftOutrunAndRoamRetainSeparateControls': True,
            'raisedRaceTargetHasNativePhysicalUseTimeFence': True,
            'freeRoamApproachCompensatesPaceSquaredWithoutScalingNativeBrakingBudget': True,
            'onlineTupleUsesExactHashAndActualBufferBounds': True,
            'onlineConsentAndMissingOnlineSessionHaveSeparateStatus': True,
            'guestObjectLimitAndNOSClockSelectionRetained': True,
            'savedProfileSchemaTunerAndIndependentCollisionModulesPreserved': True,
            'humanNamesAreStaticTextWithNoNewGameMemoryOrBinaryReader': True,
            'numericReverseSourcePlaceholdersUseHumanReadableFallback': True,
            'HUDLayoutCleanViewAndCompactMenuRetained': True,
            'viewerHUDUsesNativeMPHAndGearConventionWithBoundedSessionMetrics': True,
            'viewerSessionCountsFreshManualAndAutomaticDrivingWithoutPauseGaps': True,
            'viewerHUDRetainsSevenWidgetIdsLayoutAndRadar': True,
            'cameraDefaultsOffAndRequiresDefaultCBinding': True,
            'cameraUsesRandom45To120SecondFutureIntervals': True,
            'cameraIsViewOnlyWithoutAIOrOnlinePermissionAcquisition': True,
            'cameraOnlyRunsDuringSupportedActiveFocusedDriving': True,
            'cameraPostponesForMenusTextEntryPhotoModeAndManualC': True,
            'cameraPulseSchedules80msReleaseAndPreservesRealHeldC': True,
            'cameraStopF7AndCurrentWorkerErrorDisableRotation': True,
            'cameraProfileLoadReleasesAndRearmsFutureInterval': True,
            'cameraPauseTeardownAndSessionReplacementReleaseAndReset': True,
            'cameraIdentityClockRollbackAndStaleGapsRearmWithoutCatchup': True,
            'explicitOffsetInspectorRetainsHistoricalAssertionsAndProofs': True,
        },
        'preservation': {'addedRuntimeFiles': added, 'unchangedRuntimeFiles': unchanged,
                         'unchangedRuntimeCount': 39, 'productionOrDesktopModifiedByReview': False},
        'closedReviewFindings': [
            {'issue': 'Free-roam post guard could bypass checks after a same-owner command change',
             'resolution': 'Frozen entry class, precommit class consistency and marker-based post-use checks',
             'proof': 'native/free-braking-tests-v0388.json'},
            {'issue': 'Five reverse source labels exposed numeric placeholders',
             'resolution': 'Display API uses the base English name plus Reverse while preserving factual extraction',
             'proof': 'tests/race-catalog.test.cjs', 'visualProof': VISUAL},
            {'issue': 'Automatic Camera release could conflict with a real held C key',
             'resolution': 'Record trusted C ownership before cancelling a synthetic pulse',
             'proof': 'tests/camera-page.test.cjs'},
            {'issue': 'Camera pulse could cross a replaced or failed game worker',
             'resolution': 'Release and reset at teardown; disable on the current worker error',
             'proof': 'tests/camera-page.test.cjs'},
            {'issue': 'Historical mutable-cursor parser intermittently returned a wrong section view',
             'resolution': 'Candidate regression and 12-build verifier use explicit offsets with strict bounds',
             'proof': PARSER_PROOF},
        ],
        'validation': {
            'canonicalReceipt': canonical_name, 'canonicalReceiptSha256': digest(canonical_name),
            'canonicalCounts': suite['counts'], 'selectedFiles': suite['selectedFiles'],
            'excludedFiles': suite['excludedFiles'],
            'testHashes': {name: suite['testHashes'][name] for name in relevant},
            'independentNativeCounts': review['validation']['counts'],
            'nativeReleaseReceipt': native_name, 'nativeReleaseReceiptSha256': NATIVE_PIN,
            'offlineVisualReceipt': VISUAL, 'offlineVisualReceiptSha256': VISUAL_PIN,
            'offlineVisualCases': 18, 'offlineVisualDragChecks': 26,
            'nativeHUDUnitsEvidence': HUD_UNITS, 'nativeHUDUnitsEvidenceSha256': HUD_UNITS_PIN,
            'strictInspectorPath': native['strictInspectorPath'],
            'strictInspectorSha256': native['strictInspectorSha256'],
            'parserRegressionProof': PARSER_PROOF, 'parserRegressionProofSha256': PARSER_PROOF_PIN,
            'cameraPageTests': 7, 'cameraDirectorTests': 9,
            'liveGameTested': False, 'fullGameInstantiated': False,
        },
        'limits': [
            'Canonical tests retain the same eight historical fixture exclusions; not every test file was run.',
            'Native fixtures and the authored offline browser HUD are not live driving or a full game.',
            'No live reload, wall avoidance, shortcut completion, speed gain, grip/downforce or race result is established.',
            'User-observed v0.38.7 Circuit4014 wall scraping, missed shortcut and slow corner remain unresolved by live v0.38.8 verification.',
            'The unattended travel/join/race/return streaming loop remains unfinished.',
            'Camera rotation and viewer HUD have offline page/input/layout proof only; live camera and HUD behavior remain unverified.',
            'Camera requires the game Camera action bound to C; remapped bindings have not been verified.',
            'The offline inspector import-count API accepts safe integers beyond u32; all release calls use the exact value 37.',
        ],
    }
    with target.open('x', encoding='utf-8', newline='\n') as stream:
        stream.write(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'result': 'passed', 'receipt': str(target), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                      'sourceLockSha256': PIN, 'canonicalCounts': suite['counts']}, indent=2))


if __name__ == '__main__':
    main()
