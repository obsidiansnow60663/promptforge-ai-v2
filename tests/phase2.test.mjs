import test from 'node:test';
import assert from 'node:assert/strict';
import { runtime } from './runtime.mjs';
import {generate} from '../web/pipeline.js';
const scores = { intent: 100, requirements: 100, clarity: 100, precision: 100, alignment: 100, integrity: 100 };
const passedReview = { pass: true, critical: false, issues: [], scores };
const input={source:'Tulis 5 poin untuk tim pemasaran.',lang:'Bahasa Indonesia',domain:'Bisnis',answers:[]};
const spec={goal:'Tuliskan poin',context:'Tim pemasaran',requirements:[],constraints:['5 poin'],deliverables:['Daftar'],assumptions:[],questions:[]};
const report={stage:'ready',draft:'Write 5 points for the marketing team in Indonesian.',spec,issues:[],revisions:0};
const seq=list=>async()=>{assert.ok(list.length);return structuredClone(list.shift())};
test('clear request passes without execution',async()=>assert.equal((await generate(input,seq([spec,{draft:report.draft},passedReview]))).stage,'ready'));
test('blocking question stops before generation',async()=>assert.equal((await generate(input,seq([{...spec,questions:['Untuk produk apa?']}]))).stage,'clarify'));
test('critical number failure overrides reviewer and stops after two repairs',async()=>{
 const bad=[{draft:'Write 15 points.'},passedReview];
 const r=await generate(input,seq([spec,...bad,...bad,...bad]));assert.equal(r.stage,'warning');assert.equal(r.revisions,2);assert.match(r.issues[0],/5/);
});
test('incomplete review returns a usable draft with a warning',async()=>{const r=await generate(input,seq([spec,{draft:report.draft},{}]));assert.equal(r.stage,'warning');assert.equal(r.draft,report.draft)});
test('analysis rejects malformed model output',async()=>assert.rejects(generate(input,seq([{}]))));
test('owner-isolated saves, immutable versions, safe retries and deletion',async t=>{
 const fixture=runtime(t);
 const session=crypto.randomUUID(),requestId=crypto.randomUUID();
 const call=(path,owner,body)=>fixture.call(path,body,owner);
 const payload={...input,report,session,requestId};
 assert.equal((await call('history','')).status,401);
 assert.equal((await (await call('local','a',payload)).json()).version,1);
 assert.equal((await (await call('local','a',payload)).json()).version,1);
 assert.equal((await (await call('edit','a',{session,parent:1,draft:'Manual',requestId:crypto.randomUUID()})).json()).version,2);
 assert.equal((await (await call('history','b')).json()).length,0);
 const version='version?session='+session+'&version=1';
 assert.equal((await call(version,'b')).status,404);
 assert.equal((await (await call(version,'a')).json()).draft,report.draft);
 assert.equal((await call('delete','b',{session})).status,200);
 assert.equal((await (await call('history','a')).json()).length,2);
 assert.equal((await call('delete','a',{session})).status,200);
 assert.equal((await (await call('history','a')).json()).length,0);
});

test('explicit answer language follows the reviewed prompt and needs a quote from the source', async()=>{
 const custom={...input,source:'Tulis 5 poin. Jawab dalam bahasa Inggris.'};
 const draft={draft:'Write 5 points. Answer in English.'};
 const judge=passedReview;
 const found=await generate(custom,seq([{...spec,answerLanguage:'English',languageEvidence:'Jawab dalam bahasa Inggris'},draft,judge]));
 assert.equal(found.lang,'English');
 const unsupported=await generate(custom,seq([{...spec,answerLanguage:'English',languageEvidence:'Invented evidence'},draft,judge]));
 assert.equal(unsupported.lang,input.lang);
});

test('critical alphanumeric identifiers and percentages prevent approval', async()=>{
 const source={...input,source:'Jelaskan paket R77 dengan diskon 15%.'};
 const bad=[{draft:'Explain package R78 with a 15 percent discount.'},passedReview];
 const result=await generate(source,seq([spec,...bad,...bad,...bad]));
 assert.equal(result.stage,'warning');
 assert.ok(result.issues.some(issue=>issue.includes('R77')));
 assert.ok(result.issues.some(issue=>issue.includes('15%')));
});

test('clarification offers only bounded assumptions tied to a pending question', async()=>{
 const question='Gunakan tabel atau daftar?';
 const options=[{question,answer:'Asumsikan keluaran berupa tabel.'},{question:'Pertanyaan lain',answer:'Tidak ditawarkan.'}];
 const result=await generate(input,seq([{...spec,questions:[question],safeAssumptions:options}]));
 assert.equal(result.stage,'clarify');
 assert.deepEqual(result.spec.safeAssumptions,[options[0]]);
});

test('many critical findings retain a usable draft and fit the storage limit', async t => {
 const source={...input,source:Array.from({length:43},(_,index)=>'INV'+(1000+index)).join(' ')};
 const suggestion={draft:'List the invoices.'};
 const result=await generate(source,seq([spec,suggestion,passedReview,suggestion,passedReview,suggestion,passedReview]));
 assert.equal(result.issues.length,40);
 assert.match(result.issues.at(-1),/4 temuan lain/);
 assert.equal(result.assessment.critical,true);
 const {call}=runtime(t);
 const response=await call('local',{...source,report:result,session:crypto.randomUUID(),requestId:crypto.randomUUID()});
 assert.equal(response.status,200);
 assert.equal((await response.json()).stage,'warning');
});

test('review removes an unrequested deliverable before automatic approval', async () => {
 const unwanted={...passedReview,pass:false,issues:['Pengguna tidak meminta presentasi.']};
 const suggestions=[
  spec,{draft:'Write 5 points and create a presentation.'},unwanted,
  {draft:report.draft},passedReview,
 ];
 const result=await generate(input,async (_system,data,stage)=>{
  if(stage==='draft'&&data.previous)assert.deepEqual(data.issues,unwanted.issues);
  return structuredClone(suggestions.shift());
 });
 assert.equal(result.stage,'ready');
 assert.equal(result.revisions,1);
 assert.equal(result.draft,report.draft);
});
