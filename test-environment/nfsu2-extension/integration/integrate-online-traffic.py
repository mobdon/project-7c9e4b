from pathlib import Path
import shutil,json,hashlib
r=Path(__file__).resolve().parents[1];src=r.parent/'online-traffic-v014'
files=['extension/cars.js','extension/latest-profile.js','tools/build-online-traffic.cjs','tools/build-latest-profile.cjs','tools/cars-online.wat','tools/car-online-latest-body.json','tools/car-online-latest-config.json','tools/car-latest-body.json','tools/car-latest-config.json','tools/contact-latest-body.json','tests/cars-online.wasm','tests/cars-latest.wasm','tests/latest-contact-native.test.cjs','integration/ONLINE-TRAFFIC-INTEGRATION.md']
for f in files:shutil.copy2(src/f,r/f)
(r/'verification/traffic-inputs.json').write_text(json.dumps({f:hashlib.sha256((r/f).read_bytes()).hexdigest() for f in files},indent=2)+'\n')
p=r/'extension/page.js';s=p.read_text()
def replace(old,new):
 global s
 assert old in s,old
 s=s.replace(old,new)
replace('walls: false, cars: false, online: false','walls: false, cars: false, traffic: false, online: false')
replace('prefs.cars=false;prefs.online=false','prefs.cars=false;prefs.traffic=false;prefs.online=false')
replace("'walls','cars','online','ai'","'walls','cars','traffic','online','ai'")
replace('cars?.update({enabled:prefs.cars,safe,state:s})','cars?.update({enabled:prefs.cars,onlineTraffic:prefs.traffic,safe,state:s})')
replace("carRequested:typeof carState!=='undefined'?!!carState.requested:false,carHits", "onlineTrafficRequested:!!carState.onlineTraffic,carRequested:typeof carState!=='undefined'?!!carState.requested:false,carHits")
replace("['corner-factor','corner'],['walls','walls'],['cars','cars']","['corner-factor','corner'],['corner-margin','corner'],['walls','walls'],['cars','cars'],['traffic','onlineTraffic']")
replace('if(control)control.disabled=!!caps&&!caps[feature];','if(control)control.disabled=feature===\'onlineTraffic\'?caps?.onlineTraffic!==true:!!caps&&!caps[feature];')
replace('prefs.walls,prefs.cars,prefs.ai','prefs.walls,prefs.cars,prefs.traffic,prefs.ai')
replace("prefs.cars?carState.reason:'OFF · other cars only · solo';", "prefs.cars?(carState.soloReason||carState.reason):'OFF · other cars only · solo';\n        ui.querySelector('#traffic-state').textContent=caps?.onlineTraffic!==true?'Not verified for this build':prefs.traffic?(carState.trafficReason||carState.reason):'OFF · traffic only · online free roam';")
replace("'walls-state','cars-state','drag-state'","'walls-state','cars-state','traffic-state','drag-state'")
anchor='<label class="row"><span>Car no-clip<small id="cars-state">Off · other cars only · solo</small></span><input id="cars" type="checkbox" aria-describedby="cars-risk"></label>'
replace(anchor,anchor+'\n<label class="row"><span>Online traffic no-clip<small id="traffic-state">Off · traffic only · online free roam</small></span><input id="traffic" type="checkbox" disabled aria-describedby="traffic-risk"></label>')
replace('<details class="help"><summary>Handling &amp; collision risks</summary>','<details class="help"><summary>Handling &amp; collision risks</summary><p id="traffic-risk">Separate opt-in for NPC traffic in online free roam only. Other players, racers, walls and props keep their native collisions; native Ghost settings are unchanged. Races, outruns and LAN are excluded. Latest reviewed build only. Starts off after reload; F9 stops it. Follow server rules. No live network test is claimed.</p>')
replace('Both collision filters stay solo-only; drift stays free-roam-only.','Wall pass-through and Car no-clip stay solo-only. Online traffic no-clip has its own separate opt-in, only for online free roam. Drift stays free-roam-only.')
anchor="    ui.querySelector('#cars').addEventListener('change', e => {prefs.cars=e.target.checked;if(!prefs.cars)cars?.stop();message(prefs.cars?'Car no-clip requested. Other cars only, solo. Keep clear of other cars before switching it off.':'Car no-clip off. Normal car collisions resume.');});"
replace(anchor,anchor+"\n    ui.querySelector('#traffic').disabled=true;\n    ui.querySelector('#traffic').addEventListener('change', e => {prefs.traffic=e.target.checked===true&&moduleProfile?.capabilities?.onlineTraffic===true;e.target.checked=prefs.traffic;if(!prefs.traffic)cars?.stop();message(prefs.traffic?'Online traffic no-clip requested for NPC traffic in online free roam only. Other players and racers keep native collisions. Follow server rules; turn off only when clear of traffic.':'Online traffic no-clip off. Normal traffic collisions resume.');});")
p.write_text(s)
p=r/'extension/diagnostics.js';s=p.read_text().replace("'wallRequested','carRequested'","'wallRequested','carRequested','onlineTrafficRequested'").replace("'walls','cars','online'","'walls','cars','traffic','online'");p.write_text(s)
