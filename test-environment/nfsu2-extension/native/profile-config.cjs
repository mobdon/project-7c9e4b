'use strict';
const path=require('node:path'),root=path.resolve(__dirname,'../..');
const rows=[
 ['aa2429fb','a220e667d38c0a6509c1507ad3ca9c6fddeb2220b429bf28707d7ca8cbbc42c8',38619724,'16c35b57e0954cebc8c53feb4fe6a795adb04b2e4cce6fd4cd61242eb0924d95',695752400,[702898800,705326960,705311580]],
 ['15e5958f','f88fc7a0fe3082e20814f705635410d046fcdfe053eb70d65c49dec7583105b9',38619511,'33a50fbd36e6c31878e2f62059367cfbd4aa9f020a16a2770bb2f7dcf7fb3575',695752400,[702898800,705326960,705311580]],
 ['943ee537','c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391',38618703,'cdcac67f3bbdf6a7af8418841ad86397a3dc5e04bfe2b23952d44015a5c46892',695752272,[702898672,705326832,705311452]],
];
const PROFILES=Object.freeze(rows.map(([revision,hash,size,completeInputHash,bitmap,online])=>Object.freeze({revision,native:Object.freeze({file:path.join(root,'research','compatibility-'+revision,'game.wasm'),hash,size}),completeInputHash,bitmap,online:Object.freeze(online)})));
module.exports={PROFILES};
