#!/usr/bin/env python3
"""Build a reproducible ZIP to update an already loaded extension folder.

This tool is for release builders; end users only need File Explorer. It never
modifies the input extension, an installed browser, profiles, or prior archives.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import zipfile

HERE = Path(__file__).resolve().parents[1]
GUIDE = 'UPDATE-WINDOWS.txt'
CHECKSUMS = 'PACKAGE-CHECKSUMS.json'
DESKTOP_FOLDER = 'NFSU2-Driving-Tools'
LAYOUTS = ('flat', 'desktop-folder')


def fail(message):
    raise ValueError(message)


def flat_name(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*', value):
        fail('Expected a plain, flat filename: ' + repr(value))
    stem = value.split('.')[0].upper()
    if value.endswith('.') or stem in {'CON', 'PRN', 'AUX', 'NUL', *(f'COM{i}' for i in range(1, 10)), *(f'LPT{i}' for i in range(1, 10))}:
        fail('Unsafe Windows filename: ' + value)
    return value


def render_readme(raw, version, layout='flat'):
    raw = raw.replace('\r\n', '\n')
    start = raw.find('### Quick start\n')
    end = raw.find('### Take control and pause\n', start)
    if start < 0 or end <= start:
        fail('Review README installation sections before packaging this release.')
    quick = f'''### Quick start

**Already installed:** keep your existing loaded folder. Copy all files from this
flat ZIP into it, replace matching files, click **Reload** on its existing card
in `chrome://extensions`, then refresh the game and verify **{version}**.
Do not remove/re-add the extension or create a new version folder.
See `UPDATE-WINDOWS.txt` for the full Windows steps and rollback instructions.

**First installation only:** create a permanent folder such as
`Documents\\NFSU2-Driving-Tools`, copy this ZIP's files into it so `manifest.json`
is directly inside, then use **Load unpacked** once and choose that folder.
Keep only one copy enabled. Edge uses `edge://extensions`; Brave uses
`brave://extensions`. Developer mode must be on to show the unpacked controls.

Finish your event and use the game's save/backup controls before a refresh;
unsaved in-memory changes are lost. Begin any new race yourself. Settings and
safety rules below are unchanged. Chrome 111+ or a compatible current desktop
Chromium browser is required. No build tools or Node installation are needed.

'''
    if layout == 'desktop-folder':
        quick = f'''### Quick start

**First installation:** extract the ZIP, then drag the extracted
`NFSU2-Driving-Tools` folder onto your Desktop. `manifest.json` must be directly
inside it. The ZIP itself does not run the extension. In `chrome://extensions`,
enable Developer mode, use **Load unpacked** once, and select that Desktop folder.

**Later updates:** keep that exact folder. Extract the next ZIP elsewhere, open
its `NFSU2-Driving-Tools` folder, and copy all files **inside** into your existing
loaded folder, replacing matching files. Do not nest, rename or move the folder.
Click **Reload** on the existing extension card, then refresh the game and verify
**{version}**. Game refresh alone is not enough. Do not remove/re-add the extension.

If Chrome already loads a different folder, keep updating that path instead;
placing another copy on Desktop does not change the path Chrome loads. Keep only
one copy enabled. See `UPDATE-WINDOWS.txt` for full steps, safety and rollback.
Edge uses `edge://extensions`; Brave uses `brave://extensions`.

Finish the event and use the game's save/backup controls before refreshing;
unsaved in-memory changes are lost. Settings and safety rules below are unchanged.
Chrome 111+ or a compatible current desktop Chromium browser is required.
No build tools, installer or Node installation are needed.

'''
    text = raw[:start] + quick + raw[end:]
    text, count = re.subn(
        r'For rollback, disable v[^\n]+Never run both versions together\.',
        'For rollback, copy your complete previous extension files into the same loaded folder, '
        'Reload its existing extension card, then refresh the game. Keep the backup outside '
        'the loaded folder and never enable both copies. The previous release remains subject '
        'to its build-compatibility checks. This restores extension code, not game progress or '
        'changed settings. See `UPDATE-WINDOWS.txt`.',
        text,
    )
    if count != 1:
        fail('Review README rollback instructions before packaging this release.')
    return text.encode('utf-8')


def collect(source, layout='flat'):
    if layout not in LAYOUTS:
        fail('Unsupported archive layout.')
    source = source.absolute()
    if source.is_symlink() or not source.is_dir():
        fail('Source must be a real extension directory.')
    entries = list(source.iterdir())
    if any(p.is_symlink() or not p.is_file() for p in entries):
        fail('Source must contain regular files only; no symlinks or subdirectories.')
    manifest = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))
    version = manifest.get('version', '')
    if not isinstance(version, str) or not re.fullmatch(r'\d+(?:\.\d+){0,3}', version) or any(int(n) > 65535 or (len(n) > 1 and n.startswith('0')) for n in version.split('.')) or not any(int(n) for n in version.split('.')):
        fail('Invalid Chrome version.')
    if manifest.get('manifest_version') != 3 or not manifest.get('name', '').startswith('NFSU2 Driving Tools'):
        fail('Unexpected extension identity.')
    # New permissions/background code need a separate review, not silent packaging.
    allowed_keys = {'manifest_version', 'name', 'version', 'description', 'minimum_chrome_version', 'action', 'content_scripts'}
    if set(manifest) - allowed_keys:
        fail('Manifest has new capabilities; review before updating the package allowlist.')
    action = manifest.get('action', {})
    if set(action) != {'default_title', 'default_popup'} or action['default_popup'] != 'popup.html':
        fail('Unexpected popup configuration.')
    scripts = manifest.get('content_scripts', [])
    if len(scripts) != 1:
        fail('Expected one content-script entry.')
    block = scripts[0]
    if set(block) != {'matches', 'js', 'run_at', 'world', 'all_frames'} or block.get('matches') != ['https://nfsu2.xyz/*'] or block.get('world') != 'MAIN' or block.get('run_at') != 'document_start' or block.get('all_frames') is not False:
        fail('Unexpected host, frame or execution permissions.')
    if not isinstance(block.get('js'), list) or not block['js']:
        fail('No content scripts.')
    names = ['README.md', 'CHANGELOG.md', 'RACE-CAPTURE.md', 'manifest.json', 'popup.html', *block['js']]
    names = [flat_name(name) for name in names]
    if len(set(name.casefold() for name in names)) != len(names):
        fail('Duplicate or case-colliding file reference.')
    actual = {p.name for p in entries}
    if set(names) != actual:
        fail('Source inventory mismatch. Missing: ' + str(sorted(set(names) - actual)) + '; unexpected: ' + str(sorted(actual - set(names))))
    files = {name: (source / name).read_bytes() for name in names}
    markers = {
        'page.js': [f"version:'{version}'", f'class="version">{version}</'],
        'popup.html': [f'class="version">v{version}</'],
        'diagnostics.js': [f"version='{version}'"],
    }
    for name, expected in markers.items():
        if name not in files or any(marker.encode('utf-8') not in files[name] for marker in expected):
            fail('Version display/log metadata does not match manifest: ' + name)
    files['README.md'] = render_readme(files['README.md'].decode('utf-8'), version, layout)
    guide_template = GUIDE if layout == 'flat' else 'UPDATE-WINDOWS-DESKTOP.txt'
    files[GUIDE] = (HERE / 'templates' / guide_template).read_text(encoding='utf-8').format(version=version).replace('\n', '\r\n').encode('utf-8')
    receipt = {'format': 1, 'extension_version': version, 'layout': 'flat-copy-into-existing-loaded-folder', 'files': {name: {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()} for name, data in sorted(files.items())}}
    if layout == 'desktop-folder':
        receipt['layout'] = 'stable-desktop-folder'
        receipt['folder'] = DESKTOP_FOLDER
    files[CHECKSUMS] = (json.dumps(receipt, indent=2, sort_keys=True) + '\n').encode('utf-8')
    return version, files


def package(source, output, layout='flat'):
    if output.resolve().is_relative_to(source.resolve()):
        fail('Output must be outside the source extension directory.')
    version, files = collect(source, layout)
    prefix = DESKTOP_FOLDER + '/' if layout == 'desktop-folder' else ''
    # Exclusive creation keeps already delivered files immutable.
    with zipfile.ZipFile(output, 'x', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(files.items()):
            entry = zipfile.ZipInfo(prefix + name, date_time=(1980, 1, 1, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            entry.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(entry, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None or set(archive.namelist()) != {prefix + name for name in files}:
            fail('Archive verification failed.')
        for name, data in files.items():
            if archive.read(prefix + name) != data:
                fail('Archive content mismatch: ' + name)
    return {'path': str(output.absolute()), 'version': version, 'bytes': output.stat().st_size, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'files': sorted(prefix + name for name in files), 'runtime_unchanged': True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path, help='Reviewed extension directory')
    parser.add_argument('--output', required=True, type=Path, help='New ZIP path; an existing file is never overwritten')
    parser.add_argument('--layout', choices=LAYOUTS, default='flat', help='Use desktop-folder for future releases; flat preserves historical packages')
    args = parser.parse_args()
    print(json.dumps(package(args.source, args.output, args.layout), indent=2))


if __name__ == '__main__':
    main()
