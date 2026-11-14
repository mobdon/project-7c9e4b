"""Package reviewed source and update the user's existing stable Desktop folder."""
from pathlib import Path
import hashlib
import importlib.util
import json
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
VERIFY = ROOT / 'verification'
SOURCE = ROOT / 'extension'
VERSION = '0.38.2'
DESKTOP = Path('C:/Users/Admin/Desktop/NFSU2-Driving-Tools')
ARTIFACTS = WORKSPACE / 'artifacts'
ARCHIVE = ARTIFACTS / 'NFSU2-Driving-Tools-v0.38.2-Desktop-Folder.zip'
BACKUP = ARTIFACTS / 'Desktop-v0.38.1-backup-20261110-before-v0382'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def verify_folder(folder):
    receipt = read_json(folder / 'PACKAGE-CHECKSUMS.json')
    entries = list(folder.iterdir())
    assert all(p.is_file() and not p.is_symlink() for p in entries)
    assert {p.name for p in entries} == set(receipt['files']) | {'PACKAGE-CHECKSUMS.json'}
    for name, expected in receipt['files'].items():
        data = (folder / name).read_bytes()
        assert len(data) == expected['bytes'] and sha(data) == expected['sha256'], name
    return receipt


def main():
    lock = read_json(VERIFY / 'source-reviewed-v0382.json')
    actual = {p.name: sha(p.read_bytes()) for p in SOURCE.iterdir() if p.is_file()}
    assert lock == actual, 'Source changed after final-suite snapshot'
    assert read_json(SOURCE / 'manifest.json')['version'] == VERSION
    prior = read_json(VERIFY / 'release-summary-v0381.json')
    files = read_json(VERIFY / 'final-suite-v0382-files.json')
    omitted = {entry['file'] for entry in prior['excludedFiles']}
    current = {p.name for p in (ROOT / 'tests').glob('*.test.cjs')}
    assert len(files) == len(set(files))
    assert set(files) == current - omitted, 'Unexpected test exclusions'
    assert set(read_json(VERIFY / 'final-suite-v0381-files.json')) <= set(files)
    log = (VERIFY / 'final-suite-v0382.txt').read_text(encoding='utf-8')
    results = {}
    for label in ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']:
        values = re.findall(r'(?:ℹ|#)\s+' + label + r'\s+(\d+)\s*$', log, re.M)
        assert values, 'Missing final summary: ' + label
        results[label] = int(values[-1])
    assert results['tests'] == results['pass'] and results['tests'] >= prior['passed']
    assert all(results[key] == 0 for key in ['fail', 'cancelled', 'skipped', 'todo'])

    native = read_json(VERIFY / 'release-modules-v0382.json')
    assert native['version'] == VERSION and native['liveGameTested'] is False
    assert native['sourceHashes'] == lock and native['sourceUnchanged'] is True
    assert native['verifierSha256'] == sha((ROOT / 'tools/verify-release-modules-v0382.cjs').read_bytes())
    native_by_rev = {row['revision']: row for row in native['modules']}
    assert set(native_by_rev) == {'6f4f1e4e', '2f0ddd3b', '78e2bb69', '93af6ccb', '3bdd9959', 'd2fa4f4c', 'cd5b74d5', '8abf9be8', '93cfc6e9'}
    for row in native['modules']:
        assert row['valid'] and row['compiled'] and row['otherNativeFunctionsPreserved']

    for previous in prior['nativeModules']['modules']:
        current_row = native_by_rev[previous['revision']]
        assert current_row['previousV0381OutputSha256'] == previous['outputSha256']
        comparison = current_row['previousReleaseComparison']
        if previous['revision'] in {'d2fa4f4c', 'cd5b74d5', '8abf9be8'}:
            assert comparison['onlyAuthoredSlotHelperChanged'] and comparison['otherBodiesAndSectionsPreserved']
            assert not comparison['identical']
        else:
            assert comparison['identical'] and current_row['outputSha256'] == previous['outputSha256']

    assert DESKTOP.resolve() == Path('C:/Users/Admin/Desktop/NFSU2-Driving-Tools').resolve()
    assert not DESKTOP.is_symlink()
    old = verify_folder(DESKTOP)
    assert old['extension_version'] == '0.38.1'
    assert not ARCHIVE.exists() and not BACKUP.exists(), 'Release artifacts are immutable'
    spec = importlib.util.spec_from_file_location('reviewed_package', ROOT / 'tools/package-release.py')
    packer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(packer)
    _, expected = packer.collect(SOURCE, 'desktop-folder')
    assert {p.name for p in DESKTOP.iterdir()} <= set(expected), 'Would leave stale Desktop files'
    package = packer.package(SOURCE, ARCHIVE, 'desktop-folder')
    BACKUP.mkdir()
    for file in DESKTOP.iterdir():
        shutil.copy2(file, BACKUP / file.name)
    assert verify_folder(BACKUP) == old
    with zipfile.ZipFile(ARCHIVE) as archive:
        prefix = 'NFSU2-Driving-Tools/'
        entries = {name[len(prefix):]: archive.read(name) for name in archive.namelist()}
        assert entries == expected
        assert all(name and '/' not in name and '\\' not in name for name in entries)
        for name, data in entries.items():
            (DESKTOP / name).write_bytes(data)
    current_receipt = verify_folder(DESKTOP)
    assert current_receipt['extension_version'] == VERSION
    assert all((DESKTOP / name).read_bytes() == data for name, data in expected.items())
    receipt = {
        'version': VERSION, 'desktop': str(DESKTOP), 'backup': str(BACKUP),
        'archive': str(ARCHIVE), 'sha256': package['sha256'],
        'receiptFilesVerified': len(current_receipt['files']), 'desktopFiles': len(entries),
        'liveReloadVerified': False, 'userReloadRequired': True,
        'reloadConstraint': 'Browser internal extensions URL rejected by enforced browser policy; user authorized access.',
    }
    (VERIFY / 'package-v0382.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    summary = {
        'version': VERSION, 'date': '2026-11-10', 'selectedFiles': len(files),
        'passed': results['pass'], 'failed': 0, 'skipped': 0, 'cancelled': 0,
        'method': 'Node test runner, one worker at a time; final hash-locked source; explicit curated file list.',
        'allTestFilesPassed': False, 'excludedFiles': prior['excludedFiles'],
        'log': 'final-suite-v0382.txt', 'fileList': 'final-suite-v0382-files.json',
        'sourceLock': 'source-reviewed-v0382.json', 'nativeModules': native, 'package': receipt,
        'independentReview': 'Exact93cf native relocation and ABI proofs, current route/pace/radar/probe witnesses, stale evaluator guard corrections, complete archived v0.38.1 reproduction and bounded body/section comparisons.',
        'previousReleaseChanges': {'unchangedCompleteOutputs': ['6f4f1e4e', '2f0ddd3b', '78e2bb69', '93af6ccb', '3bdd9959'], 'authoredSlotHelperOnly': ['d2fa4f4c', 'cd5b74d5', '8abf9be8'], 'originalNativeBodiesAndOtherSectionsPreserved': True},
        'streamUI': {'defaultOff': True, 'cleanViewShortcut': 'Shift+Insert', 'reopen': 'F8', 'manual': 'F7', 'stop': 'F9', 'individualWidgets': 7, 'layoutStorageSeparate': True, 'browserLayoutChecks': 20, 'browserLayoutChecksInheritedFrom': '0.38.0', 'previewUsesSyntheticReadings': True, 'liveGameTested': False},
        'rearRadar': {'readOnly': True, 'coverage': 'locally loaded world cars', 'visibleCars': 8, 'nativeRange': [50, 500], 'metresCalibrated': False, 'liveGameTested': False},
        'navigationProof': {'productionEnabled': False, 'liveTested': False},
        'racePacing': {'zeroCornerRecordsRetainSelectedNativePace': True, 'partialClearanceIsDiagnosticOnly': True, 'liveGameTested': False},
        'nativeLookahead': {'productionRevisions': ['8abf9be8', '93cfc6e9'], 'maxRouteHorizon': 512, 'otherForwardProfilesMaxHorizon': 184, 'maxRawAnchors': 24, 'maxCheckedRouteNodes': 40, 'maxDisplaySamples': 48, 'boundsClippedToSelectedCheckedSource': True, 'usesNativeGradePlanningTables': True, 'exitHeadingDegrees': 15, 'exitRuleIsAuthored': True, 'ordinaryRoadRacesOnly': True, 'fullRouteVerified': False, 'liveGameTested': False},
        'freeRoamCornering': {'selectedPaceCompensated': True, 'subNativeBehaviorPreserved': True, 'newForwardLookaheadEnabled': False, 'liveGameTested': False},
        'limits': [
            'This update has no live reload/race or all-map outcome verification. Offline proofs do not establish wins or streaming autonomy.',
            'Native online flags are status evidence, not a verified room ID or proof of server acceptance.',
            'Forward geometry is bounded to the selected road, not a complete race route; leases and publication gaps remain.',
            'Coordinate/time linkage is tested in native units; physical acceleration, braking, grip and SI calibration remain unproved.',
            'City pacing only reduces an already owned native driver request; no free-roam route following or collision guarantee.',
            'Rear radar observes locally loaded cars only, does not classify rivals or guarantee every online car is visible, and uses native distance units.',
            'Travel and selected-host join/race/return remain unfinished and disabled. A disappeared selected host must never create a lobby.',
            'S42 candidate remains exact 93af6ccb only; newer full tuner and recorder remain unavailable.',
            'No newly tested live grip/downforce, online no-clip or aircraft support.',
        ],
    }
    (VERIFY / 'release-summary-v0382.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'package': receipt, 'tests': results, 'selectedFiles': len(files)}, indent=2))


if __name__ == '__main__':
    main()
