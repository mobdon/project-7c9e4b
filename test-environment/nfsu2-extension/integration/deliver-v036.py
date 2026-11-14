"""Deliver the reviewed v0.36 package to the existing stable Desktop folder."""
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
DESKTOP = Path('C:/Users/Admin/Desktop/NFSU2-Driving-Tools')
ARTIFACTS = WORKSPACE / 'artifacts'
ARCHIVE = ARTIFACTS / 'NFSU2-Driving-Tools-v0.36.0-Desktop-Folder.zip'
BACKUP = ARTIFACTS / 'Desktop-v0.35.0-backup-20261110-before-v036'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def verify_folder(folder):
    receipt = json.loads((folder / 'PACKAGE-CHECKSUMS.json').read_text(encoding='utf-8'))
    entries = list(folder.iterdir())
    assert all(p.is_file() and not p.is_symlink() for p in entries)
    assert {p.name for p in entries} == set(receipt['files']) | {'PACKAGE-CHECKSUMS.json'}
    for name, expected in receipt['files'].items():
        data = (folder / name).read_bytes()
        assert len(data) == expected['bytes'] and sha(data) == expected['sha256'], name
    return receipt


def main():
    lock = json.loads((VERIFY / 'source-reviewed-v036.json').read_text(encoding='utf-8-sig'))
    actual = {p.name: sha(p.read_bytes()) for p in SOURCE.iterdir() if p.is_file()}
    assert lock == actual, 'Source changed after final-suite snapshot'
    assert json.loads((SOURCE / 'manifest.json').read_text(encoding='utf-8'))['version'] == '0.36.0'
    log = (VERIFY / 'final-suite-v036.txt').read_text(encoding='utf-8')
    results = {}
    for label in ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']:
        matches = re.findall(r'(?:ℹ|#)\s+' + label + r'\s+(\d+)\s*$', log, re.M)
        assert matches, 'Missing final test summary: ' + label
        results[label] = int(matches[-1])
    assert results['tests'] == results['pass'] and results['tests'] > 2100
    assert all(results[label] == 0 for label in ['fail', 'cancelled', 'skipped', 'todo'])
    native = json.loads((VERIFY / 'release-modules.json').read_text(encoding='utf-8'))
    prior = json.loads((VERIFY / 'release-summary-v035.json').read_text(encoding='utf-8'))
    assert native['version'] == '0.36.0' and not native['liveGameTested']
    assert native['modules'] == prior['nativeModules']['modules'], 'Native output unexpectedly changed'
    assert DESKTOP.resolve() == Path('C:/Users/Admin/Desktop/NFSU2-Driving-Tools').resolve()
    assert not DESKTOP.is_symlink()
    old = verify_folder(DESKTOP)
    assert old['extension_version'] == '0.35.0'
    assert not ARCHIVE.exists() and not BACKUP.exists(), 'Release artifacts are immutable'

    spec = importlib.util.spec_from_file_location('reviewed_package', ROOT / 'tools/package-release.py')
    packer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(packer)
    package = packer.package(SOURCE, ARCHIVE, 'desktop-folder')
    BACKUP.mkdir()
    for file in DESKTOP.iterdir():
        shutil.copy2(file, BACKUP / file.name)
    assert verify_folder(BACKUP) == old

    with zipfile.ZipFile(ARCHIVE) as archive:
        prefix = 'NFSU2-Driving-Tools/'
        entries = {name[len(prefix):]: archive.read(name) for name in archive.namelist()}
        assert all(name and '/' not in name and '\\' not in name for name in entries)
        for name, data in entries.items():
            (DESKTOP / name).write_bytes(data)
        current = verify_folder(DESKTOP)
        assert current['extension_version'] == '0.36.0'
        assert all((DESKTOP / name).read_bytes() == data for name, data in entries.items())

    receipt = {
        'version': '0.36.0', 'desktop': str(DESKTOP), 'backup': str(BACKUP),
        'archive': str(ARCHIVE), 'sha256': package['sha256'],
        'receiptFilesVerified': len(current['files']), 'desktopFiles': len(entries),
        'liveReloadVerified': False, 'userReloadRequired': True,
    }
    (VERIFY / 'package-v036.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    summary = {
        'version': '0.36.0', 'date': '2026-11-10',
        'selectedFiles': len(json.loads((VERIFY / 'final-suite-v036-files.json').read_text(encoding='utf-8-sig'))),
        'passed': results['pass'], 'failed': results['fail'], 'skipped': results['skipped'],
        'cancelled': results['cancelled'],
        'method': 'Node test runner, one worker at a time; final hash-locked source; explicitly listed curated test files.',
        'allTestFilesPassed': False, 'excludedFiles': prior['excludedFiles'],
        'log': 'final-suite-v036.txt', 'fileList': 'final-suite-v036-files.json',
        'sourceLock': 'source-reviewed-v036.json', 'nativeModules': native,
        'nativeOutputsMatchV035': True, 'package': receipt,
        'independentReview': 'Stats, hub, page, catalogue and telemetry reviewed; unit labels/schema, unknown track counts, sticky Stop and forced-mode classification corrected before the final suite.',
        'navigationProof': {'isolatedCasesPassed': 12, 'productionEnabled': False, 'liveTested': False},
        'websiteBackup': 'C:/Users/Admin/Desktop/NFSU2-Website-Backup; source/history only, not playable or current private-site parity.',
        'gameInstallSearch': 'research/game-install-search.json; no complete local installation found in searched locations.',
        'limits': [
            'No live v0.36 runtime, cornering benefit, win, clean lap, fastest R34 or all-map/race-type outcome has been verified.',
            'The hub preview uses clearly labelled synthetic data. Stats record observed driving segments, not finishes; wins and lap times remain unconfirmed.',
            'Route coordinates/time agree in native units; SI distance and measured braking/grip limits remain uncalibrated.',
            'Forward geometry is bounded; dense anchors can shorten the horizon, and strict 100 ms request leases can leave fallback gaps. Published targets are not native application receipts.',
            'Travel and the live selected-host join/race/return loop remain unfinished and disabled. Never create a lobby when a selected host vanishes.',
            'The guarded S42 candidate remains 93af6ccb only; current 3bdd9959 full tuner and recorder remain unavailable.',
            'No newly tested live grip/downforce, online no-clip or aircraft support.',
            'Chrome capture/control is unattached and native screen geometry is unavailable; documented recovery failed. No access bypass was attempted.',
        ],
    }
    (VERIFY / 'release-summary-v036.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'package': receipt, 'tests': results, 'selectedFiles': summary['selectedFiles']}, indent=2))


if __name__ == '__main__':
    main()
