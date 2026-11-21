import { catalog, Problem } from './providers.mjs';
import { execute, listExecutions, saveFeedback } from './executions.mjs';
const MODEL='Qwen2.5-1.5B-Instruct-q4f32_1-MLC';
const invalid=()=>{throw new Problem(400,'Periksa isian dan coba kembali.')};
function str(x,max){return typeof x==='string' && x.trim().length>0 && x.length<=max}
function strings(x){return Array.isArray(x)&&x.length<=40&&x.every(v=>str(v,2000))}
function uuid(x){return typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x)}
const validVersion = value => Number.isSafeInteger(value) && value > 0;
function validateInput(b){
 if(!str(b.source,12000)||!str(b.domain,80)||!['Bahasa Indonesia','English'].includes(b.lang)||!Array.isArray(b.answers)||b.answers.length>12||!b.answers.every(a=>a&&str(a.question,500)&&str(a.answer,1500)))invalid();
 return {source:b.source,domain:b.domain,lang:b.lang,answers:b.answers.map(({question,answer})=>({question,answer}))}
}
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function route(req,env){
 const url=new URL(req.url),path=url.pathname;
 if(!path.startsWith('/api/')){
  const key=path.endsWith('/')?path+'index.html':path;
  if(!Object.hasOwn(assets,key))return new Response('Tidak ditemukan',{status:404});
  const type=key.endsWith('.js')?'text/javascript':key.endsWith('.css')?'text/css':key.endsWith('.html')?'text/html':'text/plain';
  return new Response(assets[key],{headers:{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co https://raw.githubusercontent.com; object-src 'none'; base-uri 'none'; form-action 'self'"}});
 }
 const owner=req.headers.get('oai-authenticated-user-id');
 if(!owner)throw new Problem(401,'Masuk dengan ChatGPT untuk mengakses studio privat.');
 const db=env.DB;
 if(path==='/api/status'&&req.method==='GET')return json({configured:true,model:MODEL,providers:catalog(env)});
 if(!db)throw new Problem(503,'Penyimpanan sesi belum tersedia.');
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
 if(req.method!=='POST'||req.headers.get('Origin')!==url.origin||!req.headers.get('Content-Type')?.startsWith('application/json'))throw new Problem(403,'Permintaan tidak diizinkan.');
 const raw=await req.text();if(raw.length>80000)invalid();
 let b;try{b=JSON.parse(raw)}catch{invalid()}
 if(!b||!uuid(b.session))invalid();
 if(path==='/api/delete'){
  await db.prepare('DELETE FROM versions WHERE owner=? AND session=?').bind(owner,b.session).run();return json({deleted:true})
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
 const prior=await db.prepare('SELECT payload,version FROM versions WHERE owner=? AND request_id=?').bind(owner,b.requestId).first();
 if(prior)return json({...JSON.parse(prior.payload),version:prior.version});
 let data;
 if(path==='/api/local'){
  const input=validateInput(b),r=b.report,s=r?.spec;
  if(!s||!str(s.goal,2000)||typeof s.context!=='string'||s.context.length>5000||!['requirements','constraints','deliverables','assumptions','questions'].every(k=>strings(s[k]))||!str(r.draft,32000)||!strings(r.issues)||!['ready','warning'].includes(r.stage)||!Number.isInteger(r.revisions)||r.revisions<0||r.revisions>2)invalid();
  data={...input,spec:Object.fromEntries(['goal','context','requirements','constraints','deliverables','assumptions','questions'].map(k=>[k,s[k]])),draft:r.draft,issues:r.issues,stage:r.issues.length?'warning':r.stage,revisions:r.revisions,model:MODEL};
 }else if(path==='/api/existing'){
  const input=validateInput(b);
  if(!str(b.draft,32000))invalid();
  data={...input,draft:b.draft,stage:'edited',issues:['Prompt yang Anda masukkan memerlukan persetujuan.'],
    spec:{goal:'Jalankan prompt yang sudah ada',context:'',requirements:[],constraints:[],deliverables:[],assumptions:[],questions:[]},
    revisions:0,model:'Prompt manual'};
 }else if(path==='/api/edit'){
  if(!str(b.draft,32000))invalid();
  const row=await db.prepare('SELECT payload FROM versions WHERE owner=? AND session=? AND version=?').bind(owner,b.session,Number(b.parent)||0).first();
  if(!row)throw new Problem(404,'Versi induk tidak ditemukan.');
  data={...JSON.parse(row.payload),parent:b.parent,draft:b.draft,stage:'edited',issues:['Perubahan manual belum ditinjau.']};
 }else throw new Problem(404,'Operasi tidak ditemukan.');
 await db.prepare('INSERT INTO versions(owner,session,version,request_id,created,payload) SELECT ?,?,COALESCE(MAX(version),0)+1,?,?,? FROM versions WHERE owner=? AND session=? ON CONFLICT(owner,request_id) DO NOTHING').bind(owner,b.session,b.requestId,new Date().toISOString(),JSON.stringify(data),owner,b.session).run();
 const saved=await db.prepare('SELECT version,payload FROM versions WHERE owner=? AND request_id=?').bind(owner,b.requestId).first();
 return json({...JSON.parse(saved.payload),version:saved.version});
}
export default {async fetch(req,env){try{return await route(req,env)}catch(e){return json({error:e instanceof Problem?e.message:'Operasi belum berhasil. Coba kembali.',code:e instanceof Problem?e.code:'internal_error'},e instanceof Problem?e.status:500)}}};
