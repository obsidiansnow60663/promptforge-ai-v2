import {readdir, readFile, mkdir, writeFile} from 'node:fs/promises';
const assets={};
for(const prefix of ['', 'simulasi/']){
 for(const name of await readdir('web/'+prefix,{withFileTypes:true})){
  if(name.isFile()) assets['/'+prefix+name.name]=await readFile('web/'+prefix+name.name,'utf8');
 }
}
await mkdir('dist/server',{recursive:true});
await writeFile('dist/server/index.js','const assets='+JSON.stringify(assets)+';\n'+await readFile('server/worker.mjs','utf8'));
