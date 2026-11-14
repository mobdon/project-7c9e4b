"""Deliver the reviewed v0.38.8 to the existing stable Desktop folder.

Reading/importing this file does not package or deliver anything. main() is the
explicit delivery action. Existing archives, backups and receipts are immutable.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
PRODUCTION = WORKSPACE / 'nfsu2-extension'
SOURCE = ROOT / 'extension'
VERIFY = ROOT / 'verification'
DESKTOP = Path('C:/Users/Admin/Desktop/NFSU2-Driving-Tools')
ARTIFACTS = WORKSPACE / 'artifacts'
ARCHIVE = ARTIFACTS / 'NFSU2-Driving-Tools-v0.38.8-Desktop-Folder.zip'
BACKUP = ARTIFACTS / 'Desktop-v0.38.7-backup-20261110-before-v0388'
SOURCE_BACKUP = ARTIFACTS / 'Source-v0.38.7-backup-20261110-before-v0388'
SUPPORT_BACKUP = ARTIFACTS / 'Support-v0.38.7-backup-20261110-before-v0388'
PACKER = PRODUCTION / 'tools/package-release.py'
GUIDE = PRODUCTION / 'templates/UPDATE-WINDOWS-DESKTOP.txt'
PACKER_PIN = '1a6b0fd324e221cb86b8e5163380d608e41b3da32621b385b2c2d1d2bd6f6616'
GUIDE_PIN = '74bbbcb6ee810ca5c1bc17e3bbc0d187f7fb8ae028b9faa42c56b0739f186dae'
BASELINE_PIN = 'de8d88f6bfa25ca2e02d2b042157d789f389a532fee77767b1e14b2e50414410'
SUPPORT_PIN = '632031a3c4871bb0a0707296ec91bb35f298d34e675e8e2976705a3e0941d048'
V0387_ARCHIVE_PIN = 'cb5b3f2110d2d1c2a9c55b73b868b796855f13b1ac36a742490e05ca108306c1'
SEALED_NATIVE_PIN = '0505326e2b384b9918899efa936d2e2db3b3cc8ea0da2ddd6ee9ead4d1b6f3ca'
CORNER_PATCHER_PIN = 'b77ad11ed360919ed346c934e6ea37c80bf482da18d2cec853ef78edf803608f'
V0387_NATIVE_OUTPUTS = {
    'aa2429fb': 'cc8d3b46da22d6dad1a99de1e1c8c8a28d3782cfcd92d01fe722a7ee4c54baed',
    '15e5958f': '314b47584891c237f8ce7826c3424f3e2c2610131542fdda6564b6e22288db71',
    '943ee537': '73581fa5430fae6e6b2d7276b264deed29d0ec90232c4e6d0b6b402069e086fe',
}
SUPPORT_TREES = ('tests', 'tools', 'templates', 'integration', 'verification', 'native')
NEW_RUNTIME = {'paced-catchup.js', 'paced-catchup-controller.js'}
RECEIPTS = ('package-v0388.json', 'release-summary-v0388.json', 'support-sync-v0388.json')
REVIEW_PATHS = (
    'integration/lifecycle-review-paced-catchup-v0388.json',
    'integration/paced-native-independent-review-v0388.json',
)
SOURCE_LOCK_PIN = '482f4744f5843ec8bb71a65663cdd02f3f5694cb8b0284e25b90ebc0a100a6e1'
NATIVE_RECEIPT_PIN = '46deba754d8f79838a376d2d73827386a363e3fd363e36d31abb2f519f343c17'
PACED_NATIVE_PIN = 'eac924d8447ade2ba0166d10019fda8c4ec9860dfde08bf282dec246b8d8153a'
PACED_NATIVE_OUTPUTS = {
    'aa2429fb': 'd04b19c0ec88b0b5ec7c57a4bfb34c04289ce216fc55cf215306121aa53b3b1b',
    '15e5958f': 'c57349e87fe7e7b98abfe80ed22aa0c05eacb082588961eece31f6c9ea8d57c7',
    '943ee537': '02b0b494f74940265e0cc0d8222bdf9b4a9bb7154c175b74a1e861abc89c79b8',
}
FREE_BRAKING_PROOF_PIN = '8ff281afe911122a81dac723b58936a400933a030348b440c2de9c83bf0557cd'
LIVE_MANIFEST_PIN = '045ff3e6ad51a51836b2f1cab68c50e4c21a48bed6a9f67af04af286cc421ef9'
STRICT_INSPECTOR_PATH = 'native/wasm-inspector-v0388.cjs'
STRICT_INSPECTOR_PIN = '32cc83a8cad4fa9b4805f44f06b1cc93c791d2c69d502c5d52033dcf2866965e'
PARSER_PROOF_PATH = 'verification/parser-regression-fix-v0388.json'
PARSER_PROOF_PIN = 'a07cf1c2099b937fdd185b93b29e078ddb891d7373e34e431816f9af9a69a1d4'
HUD_VISUAL_PATH = 'verification/hud-broadcast-attempt4-v0388/hud-labels-browser-v0388.json'
HUD_VISUAL_PIN = 'fb4ee68148637afcedab5e6cc2d90c3d3b202bfa49b88f95fa5737b80b20bbe1'
HUD_UNITS_PATH = 'integration/native-hud-units-evidence-v0388.json'
HUD_UNITS_PIN = '90a34eae4683fc84a7262e54c7a594adff7f4056e92522b457b051a6b00ed3da'



def sha(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def linked(path):
    return path.is_symlink() or (hasattr(path, 'is_junction') and path.is_junction())


def digest(path):
    if not path.exists():
        assert not linked(path), str(path)
        return None
    assert path.is_file() and not linked(path), str(path)
    return sha(path.read_bytes())


def inventory(folder):
    assert folder.is_dir() and not linked(folder), str(folder)
    entries = sorted(folder.iterdir())
    assert all(p.is_file() and not linked(p) for p in entries), str(folder)
    return {p.name: digest(p) for p in entries}


def support_inventory(base):
    result = {}
    for directory in SUPPORT_TREES:
        folder = base / directory
        if not folder.exists():
            assert not linked(folder), str(folder)
            continue
        assert folder.is_dir() and not linked(folder), str(folder)
        for item in sorted(folder.rglob('*')):
            relative = item.relative_to(base)
            if '__pycache__' in relative.parts or item.suffix.lower() == '.pyc':
                continue
            assert not linked(item), str(item)
            if item.is_file():
                result[relative.as_posix()] = digest(item)
    return result


def write_new(path, value):
    with path.open('x', encoding='utf-8', newline='\n') as stream:
        stream.write(json.dumps(value, indent=2) + '\n')


def archive_inventory(path):
    prefix = 'NFSU2-Driving-Tools/'
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        assert len(names) == len(set(names)) and archive.testzip() is None
        assert all(n.startswith(prefix) and '/' not in n[len(prefix):]
                   and n[len(prefix):] not in ('', '.', '..') for n in names)
        return {n[len(prefix):]: sha(archive.read(n)) for n in names}


def verify_package(folder):
    actual = inventory(folder)
    receipt = read(folder / 'PACKAGE-CHECKSUMS.json')
    assert receipt['layout'] == 'stable-desktop-folder'
    assert receipt['folder'] == 'NFSU2-Driving-Tools'
    assert set(actual) == set(receipt['files']) | {'PACKAGE-CHECKSUMS.json'}
    for name, entry in receipt['files'].items():
        assert actual[name] == entry['sha256'], name
        assert (folder / name).stat().st_size == entry['bytes'], name
    return receipt


def verify_release(lock):
    suite, files = verify_canonical(lock)
    assert digest(VERIFY / 'source-reviewed-v0388-final.json') == SOURCE_LOCK_PIN
    assert digest(VERIFY / 'release-modules-v0388-final.json') == NATIVE_RECEIPT_PIN
    native = read(VERIFY / 'release-modules-v0388-final.json')
    previous = read(PRODUCTION / 'verification/release-modules-v0387-final.json')
    assert native['version'] == '0.38.8' and native['passed'] is True
    assert native['sourceHashes'] == lock and native['sourceUnchanged'] is True
    assert native['sourceFileCount'] == 57
    assert native['liveGameTested'] is False and native['fullGameInstantiated'] is False
    assert all(native[key] is True for key in (
        'allTwelvePrePacedOutputsEqualDeliveredV0387', 'nineOlderCompleteOutputsUnchanged',
        'onlyDeclaredPacedFunctionsChangedForThreeSupportedBuilds', 'allNonCodeSectionsPreserved'))
    assert native['additionalHelpers'] == native['additionalPrivateGlobals'] == 0
    assert native['verifierSha256'] == digest(ROOT / 'tools/verify-release-modules-v0388.cjs')
    assert native['strictInspectorPath'] == STRICT_INSPECTOR_PATH
    assert native['strictInspectorSha256'] == digest(ROOT / STRICT_INSPECTOR_PATH) == STRICT_INSPECTOR_PIN
    assert native['parserRegressionProofSha256'] == digest(ROOT / PARSER_PROOF_PATH) == PARSER_PROOF_PIN
    assert native['pacedPatcherSha256'] == lock['paced-catchup.js'] == PACED_NATIVE_PIN
    assert digest(ROOT / 'native/paced-catchup.js') == PACED_NATIVE_PIN
    assert lock['native-rubberband.js'] == SEALED_NATIVE_PIN
    assert lock['native-corner-target.js'] == CORNER_PATCHER_PIN
    assert native['pacedNativeIndependentReviewPath'] == REVIEW_PATHS[1]
    assert native['pacedNativeIndependentReviewSha256'] == digest(ROOT / REVIEW_PATHS[1])
    assert native['nativeBehaviorReceiptSha256'] == digest(ROOT / 'native/paced-tests-v0388.json')
    assert native['freeRoamBrakingBehaviorReceiptSha256'] == FREE_BRAKING_PROOF_PIN
    assert digest(ROOT / 'native/free-braking-tests-v0388.json') == FREE_BRAKING_PROOF_PIN
    assert native['ownerWordAuditSha256'] == digest(ROOT / 'native/owner-word-audit.json')
    assert digest(VERIFY / 'live-manifest-v0388-delivery.json') == LIVE_MANIFEST_PIN
    manifest = read(VERIFY / 'live-manifest-v0388-delivery.json')
    assert manifest['rev'] == '943ee537' and manifest['size'] == 38618703
    assert manifest['pages'] == 16384 and manifest['maxPages'] == 65536
    assert manifest['guestEnd'] == 0x28000000 and manifest['module'] == 'wAD4-QAnYvQnTxc8gWeHcs'
    for name, pin in native['historicalArtifactsPreserved'].items():
        assert digest(WORKSPACE / name) == pin, 'Historical native proof changed: ' + name
    rows = {row['revision']: row for row in native['modules']}
    old = {row['revision']: row for row in previous['modules']}
    assert len(rows) == len(native['modules']) == 12 and set(rows) == set(old)
    for revision, row in rows.items():
        paired = revision in PACED_NATIVE_OUTPUTS
        scope = ([3553, 4497, 4653, 13653, 13962, 24257, 24266] if revision == '943ee537'
                 else [3553, 4497, 4653, 13653, 13962, 24259, 24268]) if paired else []
        assert all(row[key] is True for key in ('valid', 'compiled', 'allNonCodeSectionsPreserved',
            'otherNativeFunctionsPreserved', 'importsExportsDataAndTableUnchanged',
            'originalSourceCachePhysicsGovernorAndSetterBodiesPreserved', 'exactAuthoredAppendVerified'))
        assert row['previousV0387OutputSha256'] == row['prePacedOutputSha256'] == old[revision]['outputSha256']
        assert row['changedFromV0387'] == scope and row['unchangedFromV0387'] is (not paired)
        assert row['outputSha256'] == PACED_NATIVE_OUTPUTS.get(revision, old[revision]['outputSha256'])
        assert row['additionalHelpers'] == row['additionalPrivateGlobals'] == 0
        assert row['changedFunctions'] == old[revision]['changedFunctions']
        proof = row['authoredPlanProof']
        assert sorted(item['index'] for item in proof) == scope
        assert all(item['exactAuthoredPlanReconstructed'] is True for item in proof)
    review = read(ROOT / REVIEW_PATHS[1])
    assert review['version'] == '0.38.8' and review['result'] == 'passed' and review['findings'] == []
    assert review['productSha256'] == PACED_NATIVE_PIN and review['sourceUnchanged'] is True
    assert all(value is True for value in review['checks'].values())
    assert review['contract']['paceRange'] == [1, 2] and review['contract']['strengthRange'] == [1, 10]
    assert review['contract']['sharedPublishedOwnerWord'] == 244
    assert review['contract']['privateWasmPublicationStateAdded'] is False
    assert review['contract']['sourceCachesUnchanged'] is True
    assert review['contract']['coldExtraPaceRequiresPhysicalOutputs'] is True
    validation = review['validation']
    assert validation['liveGameTested'] is False and validation['fullGameInstantiated'] is False
    assert validation['counts']['tests'] == validation['counts']['pass'] == 73
    assert all(validation['counts'][key] == 0 for key in ('fail', 'cancelled', 'skipped', 'todo'))
    assert digest(ROOT / validation['log']) == validation['logSha256']
    for name, pin in review['sourceHashes'].items():
        assert digest(ROOT / name) == pin, 'Independent native review input changed: ' + name
    independent = {row['revision']: row for row in review['inputOutputPins']}
    assert set(independent) == set(PACED_NATIVE_OUTPUTS)
    for revision, row in independent.items():
        assert row['inputSha256'] == V0387_NATIVE_OUTPUTS[revision]
        assert row['outputSha256'] == PACED_NATIVE_OUTPUTS[revision]
        assert row['modifiedFunctions'] == rows[revision]['changedFromV0387']
        assert all(row[key] is True for key in ('independentAuthoredBytesReconstructed',
            'allOtherFunctionsPreserved', 'allNonCodeSectionsPreserved', 'valid', 'compiled'))
        assert row['appendedPrivateGlobals'] == 0
    lifecycle = read(ROOT / REVIEW_PATHS[0])
    assert lifecycle['version'] == '0.38.8' and lifecycle['result'] == 'passed' and lifecycle['findings'] == []
    assert lifecycle['sourceHashes'] == lock and lifecycle['sourceLockSha256'] == SOURCE_LOCK_PIN
    assert lifecycle['nativeIndependentReviewSha256'] == digest(ROOT / REVIEW_PATHS[1])
    assert all(value is True for value in lifecycle['checks'].values())
    assert lifecycle['activeContract'] == {
        'mode': 'pace-linked-native-catchup', 'authoredPaceRange': [1, 2],
        'authoredStrengthRange': [1, 10], 'percentStep': 5, 'strengthStep': 0.25,
        'defaultSelectedPace': 2, 'defaultStrength': 1,
        'defaultSelectionTakesManualControl': False, 'settingsSessionOnly': True,
        'sourceCachesUnchanged': True, 'powerFormula': 'f32(f32(M*Pf32)*S)',
        'tireFormula': 'f32(E*Pf32)', 'cornerGain': 'P*sqrt(S)',
        'nativeBrakingAssumptionUnscaled': True,
    }
    life_validation = lifecycle['validation']
    assert life_validation['canonicalReceiptSha256'] == digest(VERIFY / 'canonical-suite-v0388-final-result.json')
    assert life_validation['canonicalCounts'] == suite['counts']
    assert life_validation['liveGameTested'] is False
    assert life_validation['nativeReleaseReceiptSha256'] == NATIVE_RECEIPT_PIN
    assert life_validation['strictInspectorPath'] == STRICT_INSPECTOR_PATH
    assert life_validation['strictInspectorSha256'] == STRICT_INSPECTOR_PIN
    assert life_validation['parserRegressionProof'] == PARSER_PROOF_PATH
    assert life_validation['parserRegressionProofSha256'] == PARSER_PROOF_PIN
    assert life_validation['offlineVisualReceipt'] == HUD_VISUAL_PATH
    assert life_validation['offlineVisualReceiptSha256'] == digest(ROOT / HUD_VISUAL_PATH) == HUD_VISUAL_PIN
    assert life_validation['nativeHUDUnitsEvidence'] == HUD_UNITS_PATH
    assert life_validation['nativeHUDUnitsEvidenceSha256'] == digest(ROOT / HUD_UNITS_PATH) == HUD_UNITS_PIN
    assert life_validation['cameraPageTests'] == 7 and life_validation['cameraDirectorTests'] == 9
    for name, pin in life_validation['testHashes'].items():
        assert suite['testHashes'][name] == pin
    return suite, files, native


def verify_canonical(lock):
    suite = read(VERIFY / 'canonical-suite-v0388-final-result.json')
    files = read(VERIFY / 'final-suite-v0388-final-files.json')
    previous = read(PRODUCTION / 'verification/release-summary-v0387.json')
    assert suite['version'] == '0.38.8' and suite['passed'] is True
    assert suite['sourceUnchanged'] is True and suite['testsUnchanged'] is True and suite['runnerUnchanged'] is True
    assert suite['sourceHashes'] == lock, 'Canonical tests must bind the final reviewed source'
    assert suite['runnerSha256'] == digest(ROOT / 'tools/run-canonical-v0388.cjs')
    assert suite['exitCode'] == 0 and suite['counts']['tests'] == suite['counts']['pass'] >= previous['passed']
    assert all(suite['counts'][key] == 0 for key in ('fail', 'cancelled', 'skipped', 'todo'))
    assert len(suite['excludedFiles']) == 8 and suite['excludedFiles'] == previous['excludedFiles']
    excluded = {row['file'] for row in suite['excludedFiles']}
    selected = {p.name for p in (ROOT / 'tests').glob('*.test.cjs')} - excluded
    assert files == sorted(selected) and len(files) == suite['selectedFiles']
    assert {'rubberband-controller.test.cjs', 'rubberband-page.test.cjs',
            'paced-catchup-controller.test.cjs', 'paced-catchup-integration.test.cjs',
            'network-state.test.cjs', 'city-pacing.test.cjs', 'city-page.test.cjs',
            'forward-knot-invariance.test.cjs', 'native-corner-target.test.cjs'} <= selected
    assert set(read(PRODUCTION / 'verification/final-suite-v0387-final-files.json')) <= selected
    required = {'tests/' + name for name in files}
    required.update(p.relative_to(ROOT).as_posix() for p in (ROOT / 'tests/fixtures').glob('*.cjs'))
    required.update(p.relative_to(ROOT).as_posix() for p in (ROOT / 'native').glob('*.cjs'))
    required.update(('native/plans.json', 'native/corner-target-plans.json', 'native/paced-plans.json',
                     'integration/track-labels-v0388.json'))
    assert set(suite['testHashes']) == required
    for name, pin in suite['testHashes'].items():
        assert digest(ROOT / name) == pin, 'Test changed after canonical execution: ' + name
    log = (VERIFY / 'final-suite-v0388-final.txt').read_text(encoding='utf-8-sig')
    for key, count in suite['counts'].items():
        assert re.findall(r'^# ' + re.escape(key) + r' (\d+)\r?$', log, re.MULTILINE) == [str(count)], key
    return suite, files


def main():
    if not __debug__:
        raise RuntimeError('Delivery requires Python assertions enabled')
    for path in (ARCHIVE, BACKUP, SOURCE_BACKUP, SUPPORT_BACKUP):
        assert not path.exists() and not linked(path), 'Preserve immutable artifact: ' + str(path)
    for name in RECEIPTS:
        assert not (VERIFY / name).exists() and not linked(VERIFY / name), name
        target = PRODUCTION / 'verification' / name
        assert not target.exists() and not linked(target), name
    baseline_path = VERIFY / 'baseline-source-desktop-v0388.json'
    support_path = VERIFY / 'baseline-support-v0388.json'
    assert digest(baseline_path) == BASELINE_PIN and digest(support_path) == SUPPORT_PIN
    baseline, support_baseline = read(baseline_path), read(support_path)['supportHashes']
    assert len(baseline['extension']) == 55 and len(baseline['desktop']) == 57
    assert inventory(PRODUCTION / 'extension') == baseline['extension'], 'Concurrent source edit; review before delivery'
    assert inventory(DESKTOP) == baseline['desktop'], 'Concurrent Desktop edit; review before delivery'
    assert support_inventory(PRODUCTION) == support_baseline, 'Concurrent support edit; review before delivery'
    assert read(PRODUCTION / 'extension/manifest.json')['version'] == '0.38.7'
    assert verify_package(DESKTOP)['extension_version'] == '0.38.7'
    prior = read(PRODUCTION / 'verification/package-v0387.json')
    prior_archive = Path(prior['archive'])
    assert prior['sha256'] == V0387_ARCHIVE_PIN and digest(prior_archive) == V0387_ARCHIVE_PIN
    assert archive_inventory(prior_archive) == baseline['desktop']
    lock_path = VERIFY / 'source-reviewed-v0388-final.json'
    lock = read(lock_path)
    assert len(lock) == 57 and inventory(SOURCE) == lock
    assert set(lock) - set(baseline['extension']) == NEW_RUNTIME
    assert not set(baseline['extension']) - set(lock)
    assert read(SOURCE / 'manifest.json')['version'] == '0.38.8'
    suite, files, native = verify_release(lock)
    assert digest(PACKER) == PACKER_PIN and digest(GUIDE) == GUIDE_PIN
    frozen = {path: digest(path) for path in (
        Path(__file__), baseline_path, support_path, lock_path, PACKER, GUIDE,
        VERIFY / 'canonical-suite-v0388-final-result.json', VERIFY / 'final-suite-v0388-final-files.json',
        VERIFY / 'final-suite-v0388-final.txt', VERIFY / 'release-modules-v0388-final.json',
        VERIFY / 'live-manifest-v0388-delivery.json',
        ROOT / PARSER_PROOF_PATH, ROOT / HUD_VISUAL_PATH, ROOT / HUD_UNITS_PATH,
        ROOT / 'tools/verify-release-modules-v0388.cjs', ROOT / 'tools/run-canonical-v0388.cjs',
        *(ROOT / name for name in REVIEW_PATHS))}
    frozen.update({ROOT / name: pin for name, pin in suite['testHashes'].items()})
    frozen.update({WORKSPACE / name: pin for name, pin in native['historicalArtifactsPreserved'].items()})
    spec = importlib.util.spec_from_file_location('reviewed_packer_v0388', PACKER)
    packer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(packer)
    version, expected = packer.collect(SOURCE, 'desktop-folder')
    assert version == '0.38.8' and len(expected) == 59
    assert set(expected) == set(lock) | {'UPDATE-WINDOWS.txt', 'PACKAGE-CHECKSUMS.json'}
    assert set(expected) - set(baseline['desktop']) == NEW_RUNTIME
    assert not any(Path(name).suffix.lower() in ('.wasm', '.wat', '.exe', '.bin', '.mus', '.mpf') for name in expected)
    for name, pin in lock.items():
        if name != 'README.md':
            assert sha(expected[name]) == pin, 'Packaged runtime differs from reviewed source: ' + name
    proposed = support_inventory(ROOT)
    paths = []
    for name, pin in proposed.items():
        if name.startswith('verification/') and 'v0388' not in Path(name).name and name != 'verification/baseline-source-desktop-v0388.json':
            continue
        if name.startswith('integration/') and any(old in name for old in ('v0385', 'v0386', 'v0387')):
            continue
        if support_baseline.get(name) != pin:
            paths.append(name)
    paths.sort()
    assert all('v0387' not in Path(name).name for name in paths if name.startswith('verification/'))
    # Complete verified backups precede every replacement. Generated caches are
    # left untouched. A failed gate leaves archives/backups for manual review.
    BACKUP.mkdir(); SOURCE_BACKUP.mkdir(); SUPPORT_BACKUP.mkdir()
    for name in baseline['desktop']:
        shutil.copy2(DESKTOP / name, BACKUP / name)
    for name in baseline['extension']:
        shutil.copy2(PRODUCTION / 'extension' / name, SOURCE_BACKUP / name)
    before = {name: support_baseline.get(name) for name in paths}
    for name, pin in before.items():
        if pin is not None:
            target = SUPPORT_BACKUP / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(PRODUCTION / name, target)
            assert digest(target) == pin, name
    write_new(SUPPORT_BACKUP / 'BACKUP-INVENTORY.json', before)
    assert inventory(BACKUP) == baseline['desktop'] and inventory(SOURCE_BACKUP) == baseline['extension']
    assert inventory(PRODUCTION / 'extension') == baseline['extension'] and inventory(DESKTOP) == baseline['desktop']
    assert support_inventory(PRODUCTION) == support_baseline
    assert inventory(SOURCE) == lock and support_inventory(ROOT) == proposed
    for path, pin in frozen.items():
        assert digest(path) == pin, 'Reviewed input changed: ' + str(path)
    package = packer.package(SOURCE, ARCHIVE, 'desktop-folder')
    expected_hashes = {name: sha(data) for name, data in expected.items()}
    assert archive_inventory(ARCHIVE) == expected_hashes
    for path, pin in frozen.items():
        assert digest(path) == pin, 'Reviewed input changed before replacement: ' + str(path)
    assert inventory(SOURCE) == lock and support_inventory(ROOT) == proposed
    assert inventory(PRODUCTION / 'extension') == baseline['extension'] and inventory(DESKTOP) == baseline['desktop']
    assert support_inventory(PRODUCTION) == support_baseline
    for name in sorted(lock):
        target = PRODUCTION / 'extension' / name
        assert digest(target) == baseline['extension'].get(name), 'Concurrent source edit: ' + name
        assert digest(SOURCE / name) == lock[name], name
        shutil.copy2(SOURCE / name, target)
        assert digest(target) == lock[name], name
    for name, data in sorted(expected.items()):
        target = DESKTOP / name
        assert digest(target) == baseline['desktop'].get(name), 'Concurrent Desktop edit: ' + name
        target.write_bytes(data)
        assert digest(target) == expected_hashes[name], name
    assert inventory(PRODUCTION / 'extension') == lock and inventory(SOURCE) == lock
    assert inventory(DESKTOP) == expected_hashes
    assert verify_package(DESKTOP)['extension_version'] == '0.38.8'
    assert support_inventory(PRODUCTION) == support_baseline
    for name in paths:
        target = PRODUCTION / name
        assert digest(target) == before[name], 'Concurrent support edit: ' + name
        assert digest(ROOT / name) == proposed[name], 'Candidate support edit: ' + name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / name, target)
        assert digest(target) == proposed[name], name
    support_after = dict(support_baseline)
    support_after.update({name: proposed[name] for name in paths})
    assert support_inventory(PRODUCTION) == support_after
    support = {'version': '0.38.8', 'backup': str(SUPPORT_BACKUP), 'before': before,
               'after': {name: proposed[name] for name in paths}}
    receipt = {'version': '0.38.8', 'desktop': str(DESKTOP), 'archive': str(ARCHIVE),
               'sha256': package['sha256'], 'backup': str(BACKUP), 'sourceBackup': str(SOURCE_BACKUP),
               'supportBackup': str(SUPPORT_BACKUP), 'sourceFiles': 57, 'desktopFiles': 59,
               'receiptFilesVerified': 58, 'replacedDesktopVersion': '0.38.7', 'replacedSourceVersion': '0.38.7',
               'liveReloadVerified': False, 'userReloadRequired': True, 'racingBehaviorChanged': True,
               'newProductFiles': sorted(NEW_RUNTIME), 'activeMode': 'pace-linked-native-catchup',
               'authoredPaceRange': [1, 2], 'authoredStrengthRange': [1, 10],
               'defaultSelectedPace': 2, 'defaultStrength': 1, 'nativeSourceCachesUnchanged': True,
               'coldExtraPaceRequiresMatchingNativeOutputs': True,
               'publicManifestRevision': '943ee537', 'publicManifestSha256': LIVE_MANIFEST_PIN,
               'publicManifestOnly': True, 'liveRaceTested': False,
               'nativeUniversalMaximumClaimed': False, 'nativeOutputPins': PACED_NATIVE_OUTPUTS}
    summary = {'version': '0.38.8', 'checkedAt': datetime.now(timezone.utc).isoformat(),
               'selectedFiles': len(files), 'passed': suite['counts']['pass'], 'failed': 0, 'skipped': 0,
               'cancelled': 0, 'allTestFilesPassed': False, 'excludedFiles': suite['excludedFiles'],
               'sourceLock': lock_path.name, 'log': 'final-suite-v0388-final.txt',
               'fileList': 'final-suite-v0388-final-files.json', 'nativeModules': native, 'package': receipt,
               'reviewHashes': {name: digest(ROOT / name) for name in REVIEW_PATHS},
               'liveManifest': {'file': 'live-manifest-v0388-delivery.json', 'sha256': LIVE_MANIFEST_PIN,
                                'revision': '943ee537', 'publicManifestOnly': True, 'liveRaceTested': False},
               'limits': ['Offline checks only; live driving and reload remain unverified.',
                          'Selected pace and strength are authored settings, not measured grip, speed gains or a native maximum.',
                          'Power E=f32(f32(M*P)*S); tire inputs T=f32(E*P); source caches stay native.',
                          'Fresh current-car and AI-owner publication is required before reporting scaled outputs.',
                          'Native use-time guards must hold extra pace neutral and revoke raised corner caps when matching gain is absent.',
                          'Off/100/strength1 restoration remains pending until an advancing native publication acknowledges it.',
                          'Eight historical fixture exclusions remain; not every test file was run.',
                          'This release does not establish unattended streaming autonomy.']}
    for name, value in (('support-sync-v0388.json', support), ('package-v0388.json', receipt),
                        ('release-summary-v0388.json', summary)):
        write_new(VERIFY / name, value)
        target = PRODUCTION / 'verification' / name
        with target.open('xb') as stream:
            stream.write((VERIFY / name).read_bytes())
        assert digest(target) == digest(VERIFY / name)
        support_after['verification/' + name] = digest(target)
    assert support_inventory(PRODUCTION) == support_after
    assert digest(prior_archive) == V0387_ARCHIVE_PIN
    assert inventory(BACKUP) == baseline['desktop'] and inventory(SOURCE_BACKUP) == baseline['extension']
    assert inventory(PRODUCTION / 'extension') == lock and inventory(DESKTOP) == archive_inventory(ARCHIVE)
    print(json.dumps({'package': receipt, 'tests': suite['counts'], 'supportFilesSynchronized': len(paths)}, indent=2))


if __name__ == '__main__':
    main()
