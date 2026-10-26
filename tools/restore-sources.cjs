const fs=require('fs'),path=require('path'),zlib=require('zlib');
const root=path.resolve(__dirname,'..');
const entries=JSON.parse(fs.readFileSync(path.join(root,'source-parts/manifest.json'),'utf8'));
for(const e of entries){const b64=e.parts.map(p=>fs.readFileSync(path.join(root,p),'utf8').trim()).join('');const dest=path.join(root,e.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,zlib.gunzipSync(Buffer.from(b64,'base64')));}
require('./restore-assets.cjs');
console.log('Fontes completos restaurados. Leia README.md antes de executar o aplicativo.');
