import { cancelOperation, listOperations } from './operations.mjs';
import { evaluationMetadata, readEvaluation } from './evaluation.mjs';
import { generatePrompt, promptAgent } from './prompt-engine.mjs';
import { exportPage, restorePage } from './backups.mjs';
import { ownerModelEnvironment, setArxPayModel } from './model-settings.mjs';
import { invalid, str, uuid, validVersion, validateInput, validateReport, validateRevisionReason, readJson } from './validation.mjs';
import { catalog, fetchArxPayModels, providerPresets, Problem } from './providers.mjs';
import { execute, listExecutions, saveFeedback } from './executions.mjs';
const MODEL='Qwen2.5-1.5B-Instruct-q4f32_1-MLC';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
async function saveVersion(db,owner,b,data,generation=false){
 const guarded=generation?" HAVING EXISTS (SELECT 1 FROM prompt_generations WHERE owner=? AND request_id=? AND status='running')":'';
 const created=new Date().toISOString();
 const mode=data.stage!=='edited'&&data.mode==='existing'?'generate':data.mode??'generate';
 const payload={...data,mode,inputLanguage:data.inputLanguage ?? (mode==='existing'?'Tidak ditentukan':'Bahasa Indonesia'),
  ...(data.stage==='edited'?{}:{optimizedPromptLanguage:'English'}),
  revisionReason:data.revisionReason || (data.revisions ? 'Perbaikan otomatis setelah peninjauan.' : 'Penyusunan prompt dari instruksi.')};
 if(data.assessment){
  const {evaluatorType=data.assessment.dimensions || data.stage==='ready' ? 'model-assisted' : 'deterministic',...assessment}=data.assessment;
  const status=data.stage==='ready'?'passed':evaluatorType==='deterministic'&&!assessment.critical?'unverified':'failed';
  payload.assessment=assessment;
  payload.evaluation=evaluationMetadata('prompt',b.requestId,evaluatorType,status,created);
 }
 const values=[owner,b.session,b.requestId,created,JSON.stringify(payload),owner,b.session];
 if(generation)values.push(owner,b.requestId);
 const insert=db.prepare(`INSERT INTO versions(owner,session,version,request_id,created,payload)
  SELECT ?,?,COALESCE(MAX(version),0)+1,?,?,? FROM versions WHERE owner=? AND session=?${guarded}
  ON CONFLICT(owner,request_id) DO NOTHING`).bind(...values);
 if(generation){
  try {
   await db.batch([insert,db.prepare("UPDATE prompt_generations SET status='finished',checkpoint=NULL WHERE owner=? AND request_id=? AND status='running'").bind(owner,b.requestId)]);
  }catch{
   throw new Problem(503,'Versi prompt belum dapat disimpan. Coba kembali.','storage_failure');
  }
 }else await insert.run();
 let saved;
 try{
  saved=await db.prepare('SELECT session,version,payload FROM versions WHERE owner=? AND request_id=?').bind(owner,b.requestId).first();
 }catch{
  throw new Problem(503,'Penyimpanan versi belum terkonfirmasi. Kirim ulang permintaan yang sama.','version_save_unconfirmed');
 }
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
 if(path==='/api/status'&&req.method==='GET'){
  const agent=promptAgent(env);
  const scoped=await ownerModelEnvironment(db,env,owner);
  const providers=catalog(scoped);
  const names=db?(await db.prepare('SELECT model,name FROM arxpay_model_names WHERE owner=?').bind(owner).all()).results:[];
  const arxpay=providers.find(item=>item.id==='arxpay');
  const modelNames=Object.fromEntries(names.filter(item=>arxpay?.models.includes(item.model)).map(item=>[item.model,item.name]));
  return json({configured:true,model:MODEL,providers,presets:providerPresets(scoped),promptAgent:agent,modelNames,
   enabledArxPayModels:scoped.ownerArxPayModels??[],
   defaultTarget:agent.configured?{provider:'arxpay',model:agent.model}:null});
 }
 if(!db)throw new Problem(503,'Penyimpanan sesi belum tersedia.');
 if(req.method==='GET'&&path==='/api/arxpay-models')return json({models:await fetchArxPayModels(env)});
 if(req.method==='GET'&&path==='/api/operations')return json(await listOperations(db,owner));
 if(req.method==='GET'&&path==='/api/evaluation')return json(await readEvaluation(db,owner));
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
  const row=await db.prepare(`SELECT payload,
   (SELECT min(created) FROM versions AS s WHERE s.owner=v.owner AND s.session=v.session) AS sessionCreated,
   (SELECT max(created) FROM versions AS s WHERE s.owner=v.owner AND s.session=v.session) AS sessionUpdated
   FROM versions AS v WHERE v.owner=? AND v.session=? AND v.version=?`)
   .bind(owner,url.searchParams.get('session')||'',Number(url.searchParams.get('version'))||0).first();
  if(!row)throw new Problem(404,'Versi tidak ditemukan.');
  return json({...JSON.parse(row.payload),sessionCreated:row.sessionCreated,sessionUpdated:row.sessionUpdated});
 }
 if(req.method!=='POST'||req.headers.get('Origin')!==url.origin||
    req.headers.get('Content-Type')?.split(';',1)[0].trim().toLowerCase()!=='application/json'){
  throw new Problem(403,'Permintaan tidak diizinkan.');
 }
 const b=await readJson(req,path==='/api/restore'?2*1024*1024:256*1024);
 if(path==='/api/arxpay-model')return json(await setArxPayModel(db,env,owner,b));
 if(path==='/api/model-name'){
  const arxpay=catalog(await ownerModelEnvironment(db,env,owner)).find(item=>item.id==='arxpay'&&item.configured);
  if(!arxpay?.models.includes(b?.model)||typeof b.name!=='string'||b.name.length>80||/[\u0000-\u001f\u007f]/u.test(b.name))invalid();
  const name=b.name.trim();
  if(name){
   await db.prepare(`INSERT INTO arxpay_model_names(owner,model,name) VALUES (?,?,?)
     ON CONFLICT(owner,model) DO UPDATE SET name=excluded.name`).bind(owner,b.model,name).run();
  }else await db.prepare('DELETE FROM arxpay_model_names WHERE owner=? AND model=?').bind(owner,b.model).run();
  return json({name});
 }
 if(path==='/api/cancel')return json(await cancelOperation(db,owner,b));
 if(path==='/api/restore')return json(await restorePage(db,owner,b));
 if(!b||!uuid(b.session))invalid();
 if(path==='/api/delete'){
  const active=await db.prepare("SELECT 1 FROM prompt_generations WHERE owner=? AND session=? AND status='running' AND created>=?")
    .bind(owner,b.session,new Date(Date.now()-180000).toISOString()).first();
  if(active)throw new Problem(409,'Tunggu penyusunan prompt selesai sebelum menghapus sesi.');
  await db.batch([
   db.prepare('DELETE FROM versions WHERE owner=? AND session=?').bind(owner,b.session),
   db.prepare('UPDATE prompt_generations SET clarification=NULL,checkpoint=NULL WHERE owner=? AND session=?').bind(owner,b.session),
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
  return json(await execute(db,await ownerModelEnvironment(db,env,owner),owner,b));
 }
 const prior=await db.prepare('SELECT session,payload,version FROM versions WHERE owner=? AND request_id=?').bind(owner,b.requestId).first();
 if(prior){
  if(prior.session!==b.session)throw new Problem(409,'ID permintaan sudah dipakai untuk sesi lain.');
  return json({...JSON.parse(prior.payload),version:prior.version});
 }
 if(path==='/api/generate')return json(await generatePrompt(db,env,owner,b,validateInput(b),data=>saveVersion(db,owner,b,data,true)));
 let data;
 if(path==='/api/local'){
  const input=validateInput(b);
  const lang=['Bahasa Indonesia','English'].includes(b.report?.lang)?b.report.lang:input.lang;
  data={...input,lang,...validateReport(b.report),model:MODEL};
 }else if(path==='/api/existing'){
  const input=validateInput(b);
  if(!str(b.draft,32000))invalid();
  data={...input,draft:b.draft,stage:'edited',issues:['Prompt yang Anda masukkan memerlukan persetujuan.'],
    spec:{goal:'Jalankan prompt yang sudah ada',context:'',requirements:[],constraints:[],deliverables:[],assumptions:[],questions:[]},
    revisions:0,model:'Prompt manual',mode:'existing',revisionReason:'Penyimpanan prompt yang sudah ada.'};
 }else if(path==='/api/edit'){
  if(!str(b.draft,32000)||!validVersion(b.parent))invalid();
  const revisionReason=validateRevisionReason(b.revisionReason) || 'Penyuntingan manual oleh pemilik.';
  const row=await db.prepare('SELECT payload FROM versions WHERE owner=? AND session=? AND version=?').bind(owner,b.session,Number(b.parent)||0).first();
  if(!row)throw new Problem(404,'Versi induk tidak ditemukan.');
  const {assessment: _assessment,evaluation: _evaluation,optimizedPromptLanguage: _optimizedPromptLanguage,...original}=JSON.parse(row.payload);
  if(!original.mode&&original.model==='Prompt manual')original.mode='existing';
  data={...original,parent:b.parent,draft:b.draft,stage:'edited',issues:['Perubahan manual belum ditinjau.'],revisions:0,revisionReason};
 }else throw new Problem(404,'Operasi tidak ditemukan.');
 return json(await saveVersion(db,owner,b,data));
}
export default {async fetch(req,env){try{return await route(req,env)}catch(e){return json({error:e instanceof Problem?e.message:'Operasi belum berhasil. Coba kembali.',code:e instanceof Problem?e.code:'internal_error'},e instanceof Problem?e.status:500)}}};
