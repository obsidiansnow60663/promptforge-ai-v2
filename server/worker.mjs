import { generatePrompt, promptAgent } from './prompt-engine.mjs';
import { exportPage, restorePage } from './backups.mjs';
import { invalid, str, uuid, validVersion, validateInput, validateReport, readJson } from './validation.mjs';
import { catalog, providerPresets, Problem } from './providers.mjs';
import { execute, listExecutions, saveFeedback } from './executions.mjs';
const MODEL='Qwen2.5-1.5B-Instruct-q4f32_1-MLC';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
async function saveVersion(db,owner,b,data){
 await db.prepare('INSERT INTO versions(owner,session,version,request_id,created,payload) SELECT ?,?,COALESCE(MAX(version),0)+1,?,?,? FROM versions WHERE owner=? AND session=? ON CONFLICT(owner,request_id) DO NOTHING').bind(owner,b.session,b.requestId,new Date().toISOString(),JSON.stringify(data),owner,b.session).run();
 const saved=await db.prepare('SELECT session,version,payload FROM versions WHERE owner=? AND request_id=?').bind(owner,b.requestId).first();
 if(!saved||saved.session!==b.session)throw new Problem(409,'Penyimpanan belum terkonfirmasi untuk sesi ini.');
 return {...JSON.parse(saved.payload),version:saved.version};
}
async function route(req,env){
 const url=new URL(req.url),path=url.pathname;
 if(!path.startsWith('/api/')){
  const key=path.endsWith('/')?path+'index.html':path;
  if(!Object.hasOwn(assets,key))return new Response('Tidak ditemukan',{status:404});
  const type=key.endsWith('.js')?'text/javascript':key.endsWith('.css')?'text/css':key.endsWith('.html')?'text/html':'text/plain';
  return new Response(assets[key],{headers:{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co https://raw.githubusercontent.com; object-src 'none'; base-uri 'none'; form-action 'self'"}});
 }
 const owner=req.headers.get('oai-authenticated-user-id');
 if(!owner)throw new Problem(401,'Masuk dengan ChatGPT untuk mengakses studio privat.');
 const db=env.DB;
 if(path==='/api/status'&&req.method==='GET')return json({configured:true,model:MODEL,providers:catalog(env),presets:providerPresets(env),promptAgent:promptAgent(env)});
 if(!db)throw new Problem(503,'Penyimpanan sesi belum tersedia.');
 if(req.method==='GET'&&path==='/api/export')return json(await exportPage(db,owner,url.searchParams));
 if(req.method==='GET'&&path==='/api/history'){
  const result=await db.prepare('SELECT session,version,created,substr(json_extract(payload,\'$.source\'),1,140) AS title FROM versions WHERE owner=? ORDER BY created DESC, version DESC LIMIT 200').bind(owner).all();return json(result.results);
 }
 if(req.method==='GET'&&path==='/api/executions'){
  const session=url.searchParams.get('session'),version=Number(url.searchParams.get('version'));
  if(!uuid(session)||!validVersion(version))invalid();
  return json(await listExecutions(db,owner,session,version));
 }
 if(req.method==='GET'&&path==='/api/version'){
  const row=await db.prepare('SELECT payload FROM versions WHERE owner=? AND session=? AND version=?').bind(owner,url.searchParams.get('session')||'',Number(url.searchParams.get('version'))||0).first();
  if(!row)throw new Problem(404,'Versi tidak ditemukan.');return json(JSON.parse(row.payload));
 }
 if(req.method!=='POST'||req.headers.get('Origin')!==url.origin||
    req.headers.get('Content-Type')?.split(';',1)[0].trim().toLowerCase()!=='application/json'){
  throw new Problem(403,'Permintaan tidak diizinkan.');
 }
 const b=await readJson(req,path==='/api/restore'?2*1024*1024:256*1024);
 if(path==='/api/restore')return json(await restorePage(db,owner,b));
 if(!b||!uuid(b.session))invalid();
 if(path==='/api/delete'){
  const active=await db.prepare("SELECT 1 FROM prompt_generations WHERE owner=? AND session=? AND status='running' AND created>=?")
    .bind(owner,b.session,new Date(Date.now()-180000).toISOString()).first();
  if(active)throw new Problem(409,'Tunggu penyusunan prompt selesai sebelum menghapus sesi.');
  await db.batch([
   db.prepare('DELETE FROM versions WHERE owner=? AND session=?').bind(owner,b.session),
   db.prepare('UPDATE prompt_generations SET clarification=NULL WHERE owner=? AND session=?').bind(owner,b.session),
  ]);
  return json({deleted:true});
 }
 if(path==='/api/feedback'){
  if(!validVersion(b.version)||!uuid(b.executionId)||typeof b.useful!=='boolean'||typeof b.comment!=='string'||b.comment.length>1000)invalid();
  return json(await saveFeedback(db,owner,b));
 }
 if(!uuid(b.requestId))invalid();
 if(path==='/api/execute'){
  if(!validVersion(b.version))invalid();
  return json(await execute(db,env,owner,b));
 }
 const prior=await db.prepare('SELECT session,payload,version FROM versions WHERE owner=? AND request_id=?').bind(owner,b.requestId).first();
 if(prior){
  if(prior.session!==b.session)throw new Problem(409,'ID permintaan sudah dipakai untuk sesi lain.');
  return json({...JSON.parse(prior.payload),version:prior.version});
 }
 if(path==='/api/generate')return json(await generatePrompt(db,env,owner,b,validateInput(b),data=>saveVersion(db,owner,b,data)));
 let data;
 if(path==='/api/local'){
  data={...validateInput(b),...validateReport(b.report),model:MODEL};
 }else if(path==='/api/existing'){
  const input=validateInput(b);
  if(!str(b.draft,32000))invalid();
  data={...input,draft:b.draft,stage:'edited',issues:['Prompt yang Anda masukkan memerlukan persetujuan.'],
    spec:{goal:'Jalankan prompt yang sudah ada',context:'',requirements:[],constraints:[],deliverables:[],assumptions:[],questions:[]},
    revisions:0,model:'Prompt manual'};
 }else if(path==='/api/edit'){
  if(!str(b.draft,32000)||!validVersion(b.parent))invalid();
  const row=await db.prepare('SELECT payload FROM versions WHERE owner=? AND session=? AND version=?').bind(owner,b.session,Number(b.parent)||0).first();
  if(!row)throw new Problem(404,'Versi induk tidak ditemukan.');
  data={...JSON.parse(row.payload),parent:b.parent,draft:b.draft,stage:'edited',issues:['Perubahan manual belum ditinjau.']};
 }else throw new Problem(404,'Operasi tidak ditemukan.');
 return json(await saveVersion(db,owner,b,data));
}
export default {async fetch(req,env){try{return await route(req,env)}catch(e){return json({error:e instanceof Problem?e.message:'Operasi belum berhasil. Coba kembali.',code:e instanceof Problem?e.code:'internal_error'},e instanceof Problem?e.status:500)}}};
