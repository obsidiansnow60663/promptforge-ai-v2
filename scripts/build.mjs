import {readdir, readFile, mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
const assets={};
for(const prefix of ['', 'simulasi/']){
 for(const name of await readdir('web/'+prefix,{withFileTypes:true})){
  if(name.isFile()) assets['/'+prefix+name.name]=await readFile('web/'+prefix+name.name,'utf8');
 }
}
await mkdir('dist/server',{recursive:true});
await build({
 entryPoints:['server/worker.mjs'],
 outfile:'dist/server/index.js',
 bundle:true,
 format:'esm',
 target:'es2022',
 banner:{js:'const assets='+JSON.stringify(assets)+';'},
 legalComments:'none',
});
