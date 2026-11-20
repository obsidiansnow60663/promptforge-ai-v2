import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../dist/server/index.js';
const sqlite=new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('../drizzle/0000_sessions.sql',import.meta.url),'utf8'));
const DB={prepare(sql){const stmt=sqlite.prepare(sql);return {bind(...args){return {all:()=>({results:stmt.all(...args)}),first:()=>stmt.get(...args),run:()=>stmt.run(...args)}}}}};
const index=process.argv.indexOf('--port');
const port=Number(process.env.PORT||(index<0?4173:process.argv[index+1]));
createServer(async (req,res)=>{
 const url='http://'+req.headers.host+req.url;
 const data=[];for await(const chunk of req)data.push(chunk);
 const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','preview-only');
 const request=new Request(url,{method:req.method,headers,body:data.length?Buffer.concat(data):undefined});
 const response=await worker.fetch(request,{DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port,'0.0.0.0');
