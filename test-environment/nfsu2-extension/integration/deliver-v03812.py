"""Deliver a frozen, reviewed .12 into the existing Desktop extension folder."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
PRODUCTION = WORKSPACE / 'nfsu2-extension'
DESKTOP = Path('C:/Users/Admin/Desktop/NFSU2-Driving-Tools')
ARTIFACTS = WORKSPACE / 'artifacts'
TREES = ('tests', 'tools', 'templates', 'integration', 'verification', 'native')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def inventory(folder):
    result = {}
    for path in sorted(folder.rglob('*')):
        assert not path.is_symlink() and not (hasattr(path, 'is_junction') and path.is_junction()), str(path)
        if path.is_file() and '__pycache__' not in path.parts and path.suffix != '.pyc':
            result[path.relative_to(folder).as_posix()] = digest(path)
    return result


def atomic_copy(source, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(destination.name + '.v03812-tmp')
    assert not temporary.exists(), str(temporary)
    shutil.copy2(source, temporary)
    os.replace(temporary, destination)


def main():
    assert __debug__, 'Assertions are required for delivery'
    gate = read(ROOT / 'verification/release-ready-v03812.json')
    assert gate['version'] == '0.38.12' and gate['passed'] is True
    required = {'integration/deliver-v03812.py', 'tools/package-release.py',
                'templates/UPDATE-WINDOWS-DESKTOP.txt', 'verification/source-reviewed-v03812-final.json',
                'verification/baseline-v03812.json', 'verification/canonical-suite-v03812-final-result.json',
                'verification/release-modules-v03812-final.json', 'verification/documentation-final-v03812.json'}
    assert required <= set(gate['pins']), 'Missing required delivery evidence pins'
    for name, pin in gate['pins'].items():
        assert digest(ROOT / name) == pin, 'Changed reviewed artifact: ' + name
    source = inventory(ROOT / 'extension')
    frozen_source = read(ROOT / 'verification/source-reviewed-v03812-final.json')
    documentation = read(ROOT / 'verification/documentation-final-v03812.json')
    assert documentation['version'] == '0.38.12' and documentation['passed'] is True
    assert documentation['kind'] == 'documentation-only-incremental-validation-v03812'
    assert documentation['originalSourceHashes'] == frozen_source
    assert documentation['finalSourceHashes'] == source
    assert len(source) == 64 and set(source) == set(frozen_source)
    assert [name for name in source if source[name] != frozen_source[name]] == ['README.md']
    assert documentation['changedFiles'] == ['README.md'] and set(documentation['changes']) == {'README.md'}
    readme_change = documentation['changes']['README.md']
    assert readme_change['classification'] == 'documentation-only'
    assert readme_change['oldSha256'] == frozen_source['README.md'] and readme_change['newSha256'] == source['README.md']
    immutable = documentation['immutableEvidence']
    assert set(immutable) == {'verification/source-reviewed-v03812-final.json',
                              'verification/canonical-suite-v03812-final-result.json',
                              'verification/release-modules-v03812-final.json'}
    assert all(digest(ROOT / name) == pin for name, pin in immutable.items())
    doc_check = documentation['packageValidation']
    assert doc_check['exitCode'] == 0 and doc_check['counts'] == {'tests': 2, 'pass': 2, 'fail': 0, 'cancelled': 0, 'skipped': 0, 'todo': 0}
    assert all(doc_check[key] is True for key in ('sourceUnchanged', 'testUnchanged', 'packerUnchanged', 'deliveryScriptUnchanged'))
    assert digest(ROOT / 'tests/package-release.test.cjs') == doc_check['testSha256']
    assert digest(ROOT / 'tools/package-release.py') == doc_check['packerSha256']
    assert digest(ROOT / 'integration/deliver-v03812.py') == doc_check['deliveryScriptSha256']
    assert read(ROOT / 'extension/manifest.json')['version'] == '0.38.12'
    suite = read(ROOT / 'verification/canonical-suite-v03812-final-result.json')
    assert suite['passed'] and suite['sourceHashes'] == frozen_source
    assert suite['sourceUnchanged'] and suite['testsUnchanged'] and suite['runnerUnchanged']
    assert suite['counts']['tests'] == suite['counts']['pass'] >= 2823
    assert sum(suite['counts'][key] for key in ('fail', 'cancelled', 'skipped', 'todo')) == 0
    for name, pin in suite['testHashes'].items():
        assert digest(ROOT / name) == pin, 'Changed tested input: ' + name
    native = read(ROOT / 'verification/release-modules-v03812-final.json')
    assert native['version'] == '0.38.12' and native['passed'] is True and native['sourceHashes'] == frozen_source
    assert len(native['modules']) == 12 and all(row['valid'] and row['compiled'] for row in native['modules'])
    baseline = read(ROOT / 'verification/baseline-v03812.json')
    assert inventory(PRODUCTION / 'extension') == baseline['source'], 'Production changed during candidate work'
    assert inventory(DESKTOP) == baseline['desktop'], 'Desktop changed during candidate work'
    for name in TREES:
        assert inventory(PRODUCTION / name) == baseline['support'][name], 'Support changed: ' + name
    for name in ('Desktop', 'Source', 'Support'):
        assert not (ARTIFACTS / (name + '-v0.38.11-backup-before-v03812')).exists()
    spec = importlib.util.spec_from_file_location('package_v03812', ROOT / 'tools/package-release.py')
    packer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(packer)
    archive = ARTIFACTS / 'NFSU2-Driving-Tools-v0.38.12-Desktop-Folder.zip'
    assert not archive.exists()
    package = packer.package(ROOT / 'extension', archive, 'desktop-folder')
    assert package['version'] == '0.38.12'
    assert digest(archive) == package['sha256']
    with zipfile.ZipFile(archive) as zipped:
        names = zipped.namelist()
        assert len(names) == len(set(names)) and zipped.testzip() is None
        payload = {}
        for member in names:
            assert member.startswith('NFSU2-Driving-Tools/')
            name = member.split('/', 1)[1]
            assert '/' not in name and name and name not in ('.', '..')
            payload[name] = zipped.read(member)
    assert set(payload) == set(source) | {'PACKAGE-CHECKSUMS.json', 'UPDATE-WINDOWS.txt'}
    assert json.loads(payload['manifest.json'])['version'] == '0.38.12'
    expected = {name: hashlib.sha256(data).hexdigest() for name, data in payload.items()}
    packaged_checksums = json.loads(payload['PACKAGE-CHECKSUMS.json'])
    assert packaged_checksums['extension_version'] == '0.38.12'
    assert all(expected[name] == info['sha256'] and len(payload[name]) == info['bytes']
               for name, info in packaged_checksums['files'].items())
    assert digest(archive) == package['sha256']
    backups = {name: ARTIFACTS / (name + '-v0.38.11-backup-before-v03812') for name in ('Desktop', 'Source', 'Support')}
    shutil.copytree(DESKTOP, backups['Desktop'])
    shutil.copytree(PRODUCTION / 'extension', backups['Source'])
    backups['Support'].mkdir()
    for name in TREES:
        shutil.copytree(PRODUCTION / name, backups['Support'] / name)
    assert inventory(backups['Desktop']) == baseline['desktop']
    assert inventory(backups['Source']) == baseline['source']
    assert all(inventory(backups['Support'] / name) == baseline['support'][name] for name in TREES)
    for name in source:
        atomic_copy(ROOT / 'extension' / name, PRODUCTION / 'extension' / name)
    for name, data in payload.items():
        target = DESKTOP / name
        temporary = target.with_name(target.name + '.v03812-tmp')
        assert not temporary.exists()
        temporary.write_bytes(data)
        os.replace(temporary, target)
    for tree in TREES:
        for name in inventory(ROOT / tree):
            if not (PRODUCTION / tree / name).exists() or digest(ROOT / tree / name) != digest(PRODUCTION / tree / name):
                atomic_copy(ROOT / tree / name, PRODUCTION / tree / name)
    assert inventory(PRODUCTION / 'extension') == source
    assert inventory(DESKTOP) == expected
    checksums = read(DESKTOP / 'PACKAGE-CHECKSUMS.json')
    assert checksums['extension_version'] == '0.38.12'
    assert all(digest(DESKTOP / name) == info['sha256'] for name, info in checksums['files'].items())
    receipt = {'version': '0.38.12', 'deliveredAt': datetime.now(timezone.utc).isoformat(), 'package': package,
               'sourceHashes': source, 'desktopHashes': expected, 'backups': {key: str(value) for key, value in backups.items()},
               'liveGameVerified': False, 'extensionReloadPerformed': False}
    report = ROOT / 'verification/delivery-v03812.json'
    assert not report.exists()
    report.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    atomic_copy(report, PRODUCTION / 'verification/delivery-v03812.json')
    print(json.dumps({'version': '0.38.12', 'sourceFiles': len(source), 'desktopFiles': len(expected),
                      'archive': str(archive), 'sha256': digest(archive), 'liveGameVerified': False}, indent=2))


if __name__ == '__main__':
    main()
