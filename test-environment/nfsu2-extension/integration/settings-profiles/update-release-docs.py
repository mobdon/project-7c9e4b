from pathlib import Path
r=Path(__file__).resolve().parents[2]
for f in ['extension/manifest.json','extension/popup.html','extension/diagnostics.js','tools/package-release.py','tests/package-release.test.cjs']:
 p=r/f;s=p.read_text().replace('0.24','0.25').replace(r'0\.24',r'0\.25').replace('Combined-Online-Drag-Tuner','Combined-Saved-Profiles');p.write_text(s)
p=r/'extension/manifest.json';s=p.read_text().replace('Full per-preset setup editor with isolated native previews, measured performance searches, and guarded selected-preset staging.','Saved tool profiles, guarded online Drag protection, and full per-race setup editing with private native previews.');p.write_text(s)
p=r/'extension/README.md';s=p.read_text().replace('v0.24.0','v0.25.0').replace('**0.24.0**','**0.25.0**');s=s.replace('## v0.25.0: Opted-in online Drag engine blowout protection','## Retained v0.24.0: Opted-in online Drag engine blowout protection');start=s.index('## Retained v0.24.0:');s=s[:start]+'''## v0.25.0: Saved extension settings profiles

**Saved tool profiles** saves named groups of extension settings in this browser for this game site. Save your current choices, then load them together instead of enabling each tool separately. Update replaces the selected saved configuration; Delete removes it. These profiles are separate from the game's race tuning presets and **Save Profile**. They contain no car setup, game save, dyno draft or diagnostic log.

Automatic loading after reload is **optional and off by default**. Select it explicitly for a saved configuration if you want that configuration to return next time. Network permission has a separate saved-profile opt-in: saved choices do not silently grant Online/LAN access. Read the network warning before permitting automatic network-enabled behavior. Each tool still requires the supported build, valid current car and its normal game-mode checks.

**F9 / Stop keeps saved profiles but pauses automatic loading persistently**, as well as clearing current driving/network choices. A later reload cannot silently undo Stop. Resume deliberately from the profile controls. Saving a profile does not itself enable its settings. Changes from another tab do not automatically activate a configuration in an already-open tab.

Profile loading stops the old controllers and releases synthetic input before changing selections. It does not roll back a staged game tune or save the game. If storage is unavailable or full, the UI reports that the profile was not saved. Profiles stay in this browser; clearing this site's storage removes them, and site scripts can access this storage.

Saved Drag blowout protection retains its narrow meaning: only the current eligible local engine is protected before it blows; online use also needs network permission. It does not revive an already-blown engine, alter NOS/shifting, or promise a race win. Existing controls keep their normal fresh-page defaults unless you explicitly enable a saved startup profile. Descriptions below that say a control starts off refer to those defaults.

No native AI, Street X, tuning, heat, corner/braking or collision payload was changed for settings profiles. Live browser appearance and automatic loading in the user's game remain unverified.

'''+s[start:];p.write_text(s)
p=r/'extension/CHANGELOG.md';p.write_text('''# v0.25.0 · Saved extension settings profiles

- Adds named browser-local extension configurations with Save, Update, Load and Delete. Stores selected tools and bounded numeric settings, not game dyno presets, save files, car data or logs.
- Optional automatic loading is off by default and requires an explicit choice. Network restoration has separate per-profile consent. Existing native capability, ownership and game-context guards remain unchanged.
- F9 keeps saved profiles but persistently pauses startup loading and clears active driving/network tools. Stale tabs cannot silently overwrite the stop marker. Storage events refresh available profiles without activating them.
- Profile changes safely stop previous controllers and release synthetic input. They do not undo staged game tunes. Malformed or unavailable storage fails closed and reports errors rather than claiming a successful save.
- Native runtime payloads and the v0.24 online Drag protection are unchanged. No live browser, race or game-save verification is claimed.

'''+p.read_text())
p=r/'extension/popup.html';s=p.read_text();start=s.index('<p>v0.25');end=s.index('</p>',start)+4;s=s[:start]+'''<p>v0.25 adds named saved tool profiles, one-click loading and optional startup loading. Network restoration requires separate consent. F9 keeps saved profiles but pauses automatic loading. Game dyno presets and save files are separate. All v0.24 online Drag, tuner, corner and local collision features remain.</p>'''+s[end:];s=s.replace('AI, race-pace opt-in, both corner assists, walls, solo car no-clip, online traffic no-clip, online player no-clip, dyno and Online/LAN opt-in start off after reload.','Without an explicitly enabled startup profile, AI, race-pace opt-in, both corner assists, walls, solo car no-clip, online traffic no-clip, online player no-clip and Online/LAN opt-in start off after reload. The tuner enable switch and search goal may be saved, but no search, Stage, Restore or game save runs automatically.');p.write_text(s)
