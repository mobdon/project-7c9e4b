from pathlib import Path
r=Path(__file__).resolve().parents[1]
p=r/'extension/README.md';s=p.read_text()
s=s.replace('## v0.14.0: dyno mode state and adaptive corner speed','## v0.14.0: dyno modes, corner margin and online traffic')
anchor='Reported freezes remain unresolved; this release does not add race-specific handling presets.'
s=s.replace(anchor,anchor+'\n\nA new, separate **Online traffic no-clip** opt-in on exact build **78e2bb69** filters contacts between your car and native NPC traffic in online free roam. Other players, racers and all fallback contacts keep the game’s native behavior. This does not enable walls online or change native Ghost settings. Live network behavior is unverified.')
s=s.replace('- Experimental native dyno search, explicit Apply and guarded Restore.','- Experimental native dyno search, explicit Apply and guarded Restore.\n- **78e2bb69 only:** separate Online traffic no-clip, limited to native NPC traffic in online free roam.')
s=s.replace('both collision filters, power boost','all three collision switches, power boost')
s=s.replace('clears automatic AI, both collision filters, Online/LAN permission','clears automatic AI, all three collision switches, Online/LAN permission')
s=s.replace('wall pass-through, car no-clip, corner assist','wall pass-through, solo car no-clip, online traffic no-clip, corner assist')
s=s.replace('| Wall pass-through / Car no-clip | Yes, independent solo-only switches | Current contact wrapper, categories, filter composition and fallback tested. Live map/traffic coverage unverified. |','| Wall pass-through / Car no-clip | Yes, independent solo-only switches | Current contact wrapper, categories, filter composition and fallback tested. Live map/traffic coverage unverified. |\n| Online traffic no-clip | Yes, separate opt-in on 78e2bb69 only | Exact native online and player-slot helpers tested. Only NPC traffic in online free roam; races, outruns and LAN excluded. Live network behavior unverified. |')
s=s.replace('### Car no-clip','### Solo Car no-clip')
anchor='### Manual drag assist'
assert s.count(anchor)==1
s=s.replace(anchor,'''### Online traffic no-clip

**Handling & collisions → Online traffic no-clip** is a separate switch, available only on exact build **78e2bb69**. It requires online free roam and matches native NPC traffic paired with your local car, driven manually or by AI. It excludes native player-slot cars even if they use a traffic model or traffic driver flag, plus ordinary AI racers, every race category, outruns and Online/LAN races. Other players and rejected contacts retain the game's original collision logic, including any native Ghost choice you made. Walls, ground, props, body flags and map objects are unchanged.

This switch starts **off after every reload**, even if previously selected. It needs its own explicit opt-in; **Allow Online/LAN tools** never enables it. That general permission is not required for this narrowly scoped online-free-roam traffic switch. Solo Car no-clip stays independent. The status distinguishes Armed from observed traffic contacts skipped. F9 stops and clears it; blur, hidden tabs, dyno work and unavailable driving state pause it. Turn it off only when clear of traffic.

No live online collisions, peer synchronization or server acceptance have been verified. It changes local contact resolution, not the traffic simulation or server rules. Follow the site's rules and use an explicitly permitted private test. A selected or Armed switch is not proof that a real contact was skipped.

'''+anchor)
s=s.replace("It never overrides either collision filter's solo restriction, drag physics requirements, pause checks or one-local-player checks.","It never overrides the solo restrictions on walls and solo Car no-clip, drag physics requirements, pause checks or one-local-player checks. The separately enabled Online traffic no-clip has its own narrow online-free-roam scope and never opens Online/LAN races.")
s=s.replace('independent-baseline, adaptive-corner and packaging regressions.','independent-baseline, adaptive-corner, online-traffic guard/UI lifecycle and packaging regressions.')
s=s.replace('Cars use `0x00d0d1c0` (40 bytes).','Cars use `0x00d0d1c0` (40 bytes); the existing final word selects the separate online-traffic mode on 78e2bb69 only.')
s=s.replace('Native `roam_game_online_here()` always blocks wall filtering during multiplayer free roam.','Native `roam_game_online_here()` always blocks wall filtering during multiplayer free roam. The separate latest-build traffic path also calls the exact native read-only player-slot helper and excludes recognized player cars.')
p.write_text(s)
p=r/'extension/CHANGELOG.md';s=p.read_text();anchor='## Preserved features and limitations';s=s.replace(anchor,'''## Separate online traffic no-clip

- Adds a distinct checkbox only on exact build **78e2bb69** for NPC traffic in **online free roam**.
- Requires native traffic identity and no active native player-slot match. Other players, racers, walls, ground and props retain native contact behavior. Native Ghost settings are not changed.
- Excludes races, outruns, LAN, unsupported profiles, paused states and stale commands. It does not open walls online.
- Starts off after reload regardless of stored values. F9 clears it; blur, hidden tab and dyno work pause it. Solo Car no-clip and the general network-tools permission remain separate.
- Status and sanitized logging distinguish the traffic switch from solo collisions, and requested/Armed state from observed contacts skipped.

No live online collision, peer synchronization or server acceptance has been verified. It does not bypass server restrictions or fix the reported freezes. Use only where the site's rules allow it.

'''+anchor)
s=s.replace('This is a speed-planning adjustment, not new steering, obstacle avoidance, a verified longer lookahead or a promise of better driving.','This is **free-roam only**: races, outruns, drag, drift and dyno are excluded. It does not fix race performance. Race/outrun pace remains a separate control; drag always keeps neutral pace. This is a speed-planning adjustment, not new steering, obstacle avoidance, a verified longer lookahead or a promise of better driving.')
s=s.replace('Unknown builds remain disabled.','Unknown builds remain disabled. Native skill remains 9, the highest normal input; this is not a promise of opponent-equivalent setup or winning races.')
p.write_text(s)
p=r/'extension/popup.html';s=p.read_text();s=s.replace('Tune each game-selected dyno mode independently and adjust the sharp-turn speed margin.','Tune each game-selected dyno mode independently, adjust free-roam sharp-turn speed, and separately opt into online NPC traffic no-clip on the latest reviewed build.')
s=s.replace('corner assist, walls, car no-clip, dyno','corner assist, walls, solo car no-clip, online traffic no-clip, dyno')
s=s.replace('Cars stay solid unless the separate solo-only Car no-clip switch is on.','Solo Car no-clip stays separate. Online traffic no-clip is a separate latest-build opt-in for NPC traffic in online free roam only, excluding player cars, races and outruns.')
p.write_text(s)
