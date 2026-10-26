const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');let count=0;
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['.git','.gradle','build'].includes(entry.name))continue;const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(p.endsWith('.png.b64')){fs.writeFileSync(p.slice(0,-4),Buffer.from(fs.readFileSync(p,'utf8').trim(),'base64'));count++;}}}
walk(root);console.log(`${count} imagens PNG restauradas localmente.`);
