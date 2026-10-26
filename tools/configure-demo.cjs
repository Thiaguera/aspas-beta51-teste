/* Local-only demo credentials. Never commit the generated seed. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),readline=require('readline');
const target=path.resolve(__dirname,'../app/src/main/assets/beta48-script.js');
async function main(){
 let pin=process.env.ASPAS_DEMO_PIN;
 if(!pin){const rl=readline.createInterface({input:process.stdin,output:process.stdout});pin=await new Promise(resolve=>rl.question('PIN fictício de teste (4 a 32 números; entrada visível): ',resolve));rl.close();}
 if(!/^\d{4,32}$/.test(pin))throw Error('Use de 4 a 32 números.');
 let source=fs.readFileSync(target,'utf8');const match=source.match(/const ACCESS_SEED=(\[.*?\]);/);if(!match)throw Error('Seed demonstrativo não encontrado.');
 const seed=JSON.parse(match[1]);if(seed.some(u=>!u.id.startsWith('demo-')))throw Error('Recusado: este não é o seed público de demonstração.');
 const hash=crypto.createHash('sha256').update('aspas-contingencia-v1:'+pin).digest('hex');
 for(const user of seed)user.pinHash=hash;
 source=source.replace(match[0],'const ACCESS_SEED='+JSON.stringify(seed)+';');fs.writeFileSync(target,source);
 console.log('PIN de teste configurado SOMENTE nesta cópia local. Não publique este arquivo modificado. Impressoras continuam desativadas.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
