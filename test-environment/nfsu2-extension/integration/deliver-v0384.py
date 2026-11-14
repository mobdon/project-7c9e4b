"""Deliver the frozen candidate, preserving the reviewed concurrent Desktop build."""
from pathlib import Path
import hashlib
import importlib.util
import json
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
VERIFY = ROOT / 'verification'
SOURCE = ROOT / 'extension'
PRODUCTION = WORKSPACE / 'nfsu2-extension'
DESKTOP = Path('C:/Users/Admin/Desktop/NFSU2-Driving-Tools')
ARTIFACTS = WORKSPACE / 'artifacts'
ARCHIVE = ARTIFACTS / 'NFSU2-Driving-Tools-v0.38.4-Desktop-Folder.zip'
BACKUP = ARTIFACTS / 'Desktop-v0.38.3-backup-20261110-before-v0384'
SOURCE_BACKUP = ARTIFACTS / 'Source-v0.38.2-backup-20261110-before-v0384'
EXTRA_NAME = 'backup-0.38.2-replaced-files.zip'
EXTRA_BACKUP = ARTIFACTS / 'Desktop-v0.38.3-extra-backup-0.38.2-replaced-files.zip'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def inventory(folder):
    entries = list(folder.iterdir())
    assert all(p.is_file() and not p.is_symlink() for p in entries), str(folder)
    return {p.name: sha(p.read_bytes()) for p in entries}


def verify_folder(folder, extra_names=()):
    actual = inventory(folder)
    receipt = read_json(folder / 'PACKAGE-CHECKSUMS.json')
    assert set(actual) == set(receipt['files']) | {'PACKAGE-CHECKSUMS.json'} | set(extra_names)
    for name, entry in receipt['files'].items():
        assert actual[name] == entry['sha256'] and (folder / name).stat().st_size == entry['bytes'], name
    return receipt


def main():
    assert not any(p.exists() for p in (ARCHIVE, BACKUP, SOURCE_BACKUP, EXTRA_BACKUP)), 'Immutable release already exists'
    lock = read_json(VERIFY / 'source-reviewed-v0384.json')
    assert inventory(SOURCE) == lock
    assert read_json(SOURCE / 'manifest.json')['version'] == '0.38.4'
    suite = read_json(VERIFY / 'canonical-suite-v0384-result.json')
    files = read_json(VERIFY / 'final-suite-v0384-files.json')
    prior = read_json(VERIFY / 'release-summary-v0382.json')
    excluded = {row['file'] for row in prior['excludedFiles']}
    assert suite['passed'] and suite['sourceUnchanged'] and suite['exitCode'] == 0
    assert suite['counts'] == {'tests': 2459, 'pass': 2459, 'fail': 0, 'cancelled': 0, 'skipped': 0, 'todo': 0}
    assert suite['excludedFiles'] == prior['excludedFiles']
    assert len(files) == 116 and set(files) == {p.name for p in (ROOT / 'tests').glob('*.test.cjs')} - excluded
    assert set(read_json(VERIFY / 'final-suite-v0382-files.json')) <= set(files)

    native = read_json(VERIFY / 'release-modules-v0384.json')
    assert native['version'] == '0.38.4' and native['sourceUnchanged'] and native['sourceHashes'] == lock
    assert native['liveGameTested'] is False
    assert native['verifierSha256'] == sha((ROOT / 'tools/verify-release-modules-v0384.cjs').read_bytes())
    modules = {row['revision']: row for row in native['modules']}
    assert set(modules) == {row['revision'] for row in prior['nativeModules']['modules']} | {'aa2429fb'}
    for row in native['modules']:
        assert row['valid'] and row['compiled'] and row['otherNativeFunctionsPreserved']
        assert row['importsExportsDataAndTableUnchanged'] and row['exactAuthoredAppendVerified']
    for previous in prior['nativeModules']['modules']:
        row = modules[previous['revision']]
        assert row['unchangedFromV0382'] is True and row['outputSha256'] == previous['outputSha256']

    # The shared production source remains our previous reviewed source. Desktop
    # now contains Claude's independently audited .3; preserve that exact copy.
    production_lock = read_json(PRODUCTION / 'verification/source-reviewed-v0382.json')
    assert inventory(PRODUCTION / 'extension') == production_lock, 'Concurrent source changed; review before replacing'
    desktop_before = inventory(DESKTOP)
    old_receipt = verify_folder(DESKTOP, (EXTRA_NAME,))
    reviewed_claude = WORKSPACE / 'research/claude-v0383/extracted'
    assert {k:v for k,v in desktop_before.items() if k != EXTRA_NAME} == inventory(reviewed_claude), 'Desktop changed since Claude archive review'
    assert old_receipt['extension_version'] == '0.38.3'

    spec = importlib.util.spec_from_file_location('reviewed_packer', ROOT / 'tools/package-release.py')
    packer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(packer)
    _, expected = packer.collect(SOURCE, 'desktop-folder')
    assert set(desktop_before) - {EXTRA_NAME} <= set(expected)
    assert set(production_lock) <= set(lock)
    package = packer.package(SOURCE, ARCHIVE, 'desktop-folder')
    with zipfile.ZipFile(ARCHIVE) as archive:
        assert {name.removeprefix('NFSU2-Driving-Tools/'): archive.read(name) for name in archive.namelist()} == expected

    # Capture and recheck every old file before the first existing-file write.
    BACKUP.mkdir()
    SOURCE_BACKUP.mkdir()
    for file in DESKTOP.iterdir():
        shutil.copy2(file, BACKUP / file.name)
    for file in (PRODUCTION / 'extension').iterdir():
        shutil.copy2(file, SOURCE_BACKUP / file.name)
    assert inventory(BACKUP) == desktop_before
    assert inventory(SOURCE_BACKUP) == production_lock
    assert inventory(DESKTOP) == desktop_before and inventory(PRODUCTION / 'extension') == production_lock
    shutil.move(str(DESKTOP / EXTRA_NAME), str(EXTRA_BACKUP))
    assert sha(EXTRA_BACKUP.read_bytes()) == desktop_before[EXTRA_NAME]
    for name in sorted(lock):
        shutil.copy2(SOURCE / name, PRODUCTION / 'extension' / name)
    for name, data in expected.items():
        (DESKTOP / name).write_bytes(data)
    assert inventory(PRODUCTION / 'extension') == lock
    current = verify_folder(DESKTOP)
    assert current['extension_version'] == '0.38.4'
    assert all((DESKTOP / name).read_bytes() == data for name, data in expected.items())

    receipt = {
        'version': '0.38.4', 'desktop': str(DESKTOP), 'archive': str(ARCHIVE),
        'sha256': package['sha256'], 'backup': str(BACKUP), 'sourceBackup': str(SOURCE_BACKUP),
        'extraBackupPreserved': str(EXTRA_BACKUP),
        'replacedDesktopVersion': '0.38.3', 'replacedSourceVersion': '0.38.2',
        'desktopFiles': len(expected), 'receiptFilesVerified': len(current['files']),
        'liveReloadVerified': False, 'userReloadRequired': True,
        'reloadConstraint': 'Enforced browser policy denies internal extensions page; user must reload or restart Chrome.',
        'claudeReview': 'research/claude-v0383/REVIEW.md',
        'claudeWallGovernorMerged': False,
    }
    (VERIFY / 'package-v0384.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    summary = {
        'version': '0.38.4', 'date': '2026-11-10', 'selectedFiles': len(files),
        'passed': 2459, 'failed': 0, 'skipped': 0, 'cancelled': 0,
        'allTestFilesPassed': False, 'excludedFiles': prior['excludedFiles'],
        'method': 'One-worker canonical Node suite, explicit historical exclusions, source hash frozen throughout.',
        'log': 'final-suite-v0384.txt', 'fileList': 'final-suite-v0384-files.json',
        'sourceLock': 'source-reviewed-v0384.json', 'nativeModules': native, 'package': receipt,
        'previousReleaseChanges': {'unchangedCompleteOutputs': sorted(set(modules) - {'aa2429fb'})},
        'routeReader': {'directionFieldBytes': 1, 'adjacentNonzeroBytesTested': True, 'liveGameTested': False},
        'forwardTelemetry': {'fixedNumericGuardCodes': True, 'nativeFailureCodeSeparate': True},
        'rearRadar': {'readOnly': True, 'scanMs': 100, 'statsThrottleMs': 250, 'independentDraw': True, 'metresCalibrated': False, 'liveGameTested': False},
        'nativeLookahead': {'productionRevisions': ['8abf9be8','93cfc6e9','aa2429fb'], 'fullRouteVerified': False, 'liveGameTested': False},
        'shortcutStrategy': {'productionChanged': False, 'nativeChooserResearchInProgress': True, 'liveGameTested': False},
        'streetX': {'newForwardPolicyEnabled': False, 'legacyParityAudited': True, 'liveCollisionReportResolved': False},
        'limits': prior['limits'] + [
            'No live clean lap or race outcome has been verified for this candidate.',
            'The corrected direction read reproduces a capture failure offline; the old report did not retain its rejection reason.',
            'Native shortcut branch selection and checkpoint legality remain under investigation; no shortcut improvement is claimed.',
            'Claude wall-governor logic is excluded because reviewed native execution proved it can invalidate the existing corner guard.',
        ],
    }
    (VERIFY / 'release-summary-v0384.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'package': receipt, 'suite': suite['counts'], 'sourceFiles': len(lock)}, indent=2))


if __name__ == '__main__':
    main()
