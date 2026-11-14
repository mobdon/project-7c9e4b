from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
for name in ['manifest.json', 'page.js', 'popup.html', 'diagnostics.js']:
    file = root / 'extension' / name
    text = file.read_text(encoding='utf-8')
    assert '0.38.5' in text
    file.write_text(text.replace('0.38.5', '0.38.6'), encoding='utf-8', newline='\n')

file = root / 'extension/page.js'
text = file.read_text(encoding='utf-8')
anchor = 'catchupTelemetryStatus:aiState.catchupTelemetryStatus,'
assert text.count(anchor) == 1
text = text.replace(anchor, 'shortcutPolicyInstalled:moduleProfile?.capabilities.nativeRouteChoice===true,shortcutPolicyRequested:moduleProfile?.capabilities.nativeRouteChoice===true&&adaptive.requested===true,' + anchor)
file.write_text(text, encoding='utf-8', newline='\n')

file = root / 'tests/package-release.test.cjs'
text = file.read_text(encoding='utf-8')
text = text.replace('0.38.5', '0.38.6').replace(r'0\.38\.5', r'0\.38\.6')
anchor = "'forward-driving.js','race-catalog.js'"
assert text.count(anchor) == 1
text = text.replace(anchor, "'forward-driving.js','shortcut-policy.js','race-catalog.js'")
file.write_text(text, encoding='utf-8', newline='\n')

file = root / 'integration/run-suite-v0386.cjs'
text = (root / 'integration/run-suite-v0385.cjs').read_text(encoding='utf-8')
text = text.replace("tag='v0385'", "tag='v0386'").replace("release-summary-v0384.json", "release-summary-v0385.json").replace("version:'0.38.5'", "version:'0.38.6'")
file.write_text(text, encoding='utf-8', newline='\n')

file = root / 'extension/ai.js'
text = file.read_text(encoding='utf-8')
text = text.replace('// Authored pace wrapper publishes B+60 requested percent, B+76 applied', '// Authored pace hooks publish B+60 requested percent, B+76 applied')
text = text.replace('// none measures physical speed. Sample only a stable native generation.', '// none measures physical speed. AA counts target-factor consumption; older\n      // builds count wrapper updates. Sample only a stable native generation.')
file.write_text(text, encoding='utf-8', newline='\n')
print(json.dumps({'version': '0.38.6', 'metadataPrepared': True}))
