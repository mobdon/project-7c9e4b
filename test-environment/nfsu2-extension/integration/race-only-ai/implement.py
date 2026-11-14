from pathlib import Path
p=Path('extension/page.js');s=p.read_text()
def change(old,new):
 global s
 assert s.count(old)==1,(old,s.count(old));s=s.replace(old,new)
change("  // Display-only preference, deliberately outside saved driving-tool profiles.","  // Session-only race arming is separate from existing saved driving profiles.\n  let raceOnlyAI=false;\n  // Display-only preference, deliberately outside saved driving-tool profiles.")
change("const diagnosticTools = () => ({...prefs,dynoEnabled});","const diagnosticTools = () => ({...prefs,raceOnlyAI,dynoEnabled});")
change("    const d=fresh?sample.data:{}, c=fresh?sample.context:{};","    const d=fresh?sample.data:{}, c=fresh?sample.context:{};\n    const aiSelected=!!choices.ai || (!!choices.raceOnlyAI && d.raceOnlyRequested===true);")
a=s.index('  function infoHudView(');b=s.index('  function renderInfoHud()',a);part=s[a:b].replace('!choices.ai&&','!aiSelected&&').replace('choices.ai&&','aiSelected&&').replace('else if(choices.ai)','else if(aiSelected)');s=s[:a]+part+s[b:]
change('const view=infoHudView(infoHudSample,prefs,performance.now());','const view=infoHudView(infoHudSample,{...prefs,raceOnlyAI},performance.now());')
change('diagnosticState={...diagnosticState,paceConfirmed:false,paceApplied:undefined};','diagnosticState={...diagnosticState,raceOnlyRequested:false,paceConfirmed:false,paceApplied:undefined};')
anchor="  function takeControl() {"
helpers="""  function clearRaceOnlyAI() {
    raceOnlyAI=false;
    if(ui){ui.querySelector('#race-only-ai').checked=false;ui.querySelector('#race-only-state').textContent='Off · current page only';}
  }
  function setRaceOnlyAI(enabled) {
    raceOnlyAI=enabled===true;
    if(raceOnlyAI){prefs.ai=false;if(ui)ui.querySelector('#ai').checked=false;}
    ai?.stop();release();clearPaceEvidence();savePrefs();
    if(ui){ui.querySelector('#race-only-ai').checked=raceOnlyAI;ui.querySelector('#race-only-state').textContent=raceOnlyAI?'Armed · waiting for an eligible race':'Off · current page only';}
    message(raceOnlyAI?'Race-only AI armed on this page. Start or join races yourself. It waits for GO, releases in free roam/results, and needs online permission. F7/F9 or driving keys during a race disarm it. Reload or profile Load turns it off.':'Race-only AI off. Native handback may complete on the next game frame.');
  }
  function raceOnlyRaceContext() {
    // Manual driving in free roam should not cancel arming for the next race.
    // Read the current context so an old sample cannot ignore race takeover.
    if(!supported||!engine||!statusPtr)return false;
    try {const state=engine.state(),hud=engine.status(statusPtr)?.drive;return !!state.ready&&Number.isFinite(hud)&&(hud&3)===1&&engine.u32(0x89e7b0)===1;}catch{return false;}
  }
"""
change(anchor,helpers+anchor)
change("    recordDiagnostic('stop',{tools:diagnosticTools()});","    recordDiagnostic('stop',{tools:diagnosticTools()});\n    clearRaceOnlyAI();")
change("    recordDiagnostic('manual',{tools:diagnosticTools()});","    recordDiagnostic('manual',{tools:diagnosticTools()});\n    clearRaceOnlyAI();")
change("else if(prefs.ai && ['ArrowLeft'","else if((prefs.ai || (raceOnlyAI && raceOnlyRaceContext())) && ['ArrowLeft'")
change("      const dragAIRequested = prefs.ai && dragRace;","      const raceOnlyEligible=!!(safe && driveStatus===1 && nativeRaceType===1 && moduleProfile?.capabilities.ai===true && (!dragRace||moduleProfile?.capabilities.dragAI===true));\n      const raceOnlyRequested=raceOnlyAI && raceOnlyEligible;\n      const aiRequested=prefs.ai || raceOnlyRequested;\n      const dragAIRequested = aiRequested && dragRace;")
change("ai?.update({enabled:prefs.ai,safe,state:s","ai?.update({enabled:aiRequested,safe,state:s")
change("const paceConfirmed=!!prefs.ai && safe","const paceConfirmed=!!aiRequested && safe")
change("powerStatus,paceConfirmed,paceApplied:","powerStatus,raceOnlyEligible,raceOnlyRequested,paceConfirmed,paceApplied:")
change("prefs.players,prefs.ai,prefs.aiPace,prefs.nos","prefs.players,prefs.ai,raceOnlyAI,prefs.aiPace,prefs.nos")
change("        aiNode.dataset.unavailable=String(!!failure);","        aiNode.dataset.unavailable=String(!!failure);\n        ui.querySelector('#race-only-state').textContent=!raceOnlyAI?'Off · current page only':!supported||caps?.ai!==true?'Armed · waiting for a verified AI build':s.network&&!prefs.online?'Armed · paused online without permission':!raceOnlyEligible?(ai?.handbackPending||aiState.owned?'Leaving race · native handback pending':'Armed · waiting for active race / GO'):aiState.active&&!ai?.handbackPending&&!aiState.switching?'Native race AI active':aiState.status==='retry'?'Native request preserved · switch off/on to retry':aiState.reason||'Race AI requested · waiting for native confirmation';")
# Current effective request, not the all-modes checkbox, drives evidence text.
a=s.index("        aiNode.textContent =");b=s.index("        ui.querySelector('#drag-no-blowout').disabled",a);part=s[a:b].replace('prefs.ai && s.network','(prefs.ai||raceOnlyAI) && s.network').replace(': prefs.ai ? [',': aiRequested ? [').replace('!prefs.ai || !aiState.active','!aiRequested || !aiState.active').replace("!prefs.ai ? 'Enable Automatic driver in AI driver'","!aiRequested ? (raceOnlyAI?'Race-only AI armed · waiting for active race':'Enable an automatic driver mode')");s=s[:a]+part+s[b:]
change('    suspend();driftNeedsReapply=false;dragTakenOver=false;lastShift=0;lastPulse=0;','    clearRaceOnlyAI();suspend();driftNeedsReapply=false;dragTakenOver=false;lastShift=0;lastPulse=0;')
change('<label class="row row-main"><span>Automatic driver<small id="ai-state">Auto-swaps race / free-roam / drag AI</small></span><input id="ai" type="checkbox" aria-describedby="ai-auto-risk"></label>', '<label class="row row-main"><span>Automatic driver<small id="ai-state">All modes · includes free roam</small></span><input id="ai" type="checkbox" aria-describedby="ai-auto-risk"></label>\n<label class="row"><span>Race-only automatic driver<small id="race-only-state">Off · current page only</small></span><input id="race-only-ai" type="checkbox" aria-describedby="race-only-help"></label>\n<p id="race-only-help" class="fine">Starts native AI only in an active race, including Street X, Drag and Drift. Releases in free roam, outrun and results. Start/join events yourself. Online needs Allow network tools. This switch stays armed between races on this page; reload, profile Load, F7/F9 or race driving-key takeover turns it off. Not saved in profiles. Selecting either driver mode turns the other off.</p>')
change("ui.querySelector('#ai').addEventListener('change', e => {prefs.ai=e.target.checked;release();", "ui.querySelector('#race-only-ai').addEventListener('change',e=>setRaceOnlyAI(e.target.checked));\n    ui.querySelector('#ai').addEventListener('change', e => {clearRaceOnlyAI();prefs.ai=e.target.checked;release();")
p.write_text(s)
p=Path('extension/diagnostics.js');s=p.read_text().replace("FLAGS.push('paceConfirmed');","FLAGS.push('paceConfirmed','raceOnlyEligible','raceOnlyRequested');").replace("const TOOL_FLAGS = ['ai',","const TOOL_FLAGS = ['ai','raceOnlyAI',");p.write_text(s)
