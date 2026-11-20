function str(x,max){return typeof x==='string' && x.trim().length>0 && x.length<=max}
function strings(x){return Array.isArray(x)&&x.length<=40&&x.every(v=>str(v,2000))}
const malformed=()=>new Error('Respons mesin bahasa belum dapat divalidasi. Instruksi asli tetap tersedia.');
function literalFailures(input,draft){
 const tokens=input.match(/https?:\/\/[^\s<>"\])]+|\x60[^\x60\n]+\x60|\b\d+(?:[.,:/-]\d+)*\b/gu)||[];
 return [...new Set(tokens)].filter(t=>!draft.match(/https?:\/\/[^\s<>"\])]+|\x60[^\x60\n]+\x60|\b\d+(?:[.,:/-]\d+)*\b/gu)?.includes(t)).map(t=>'Pertahankan nilai asli '+t);
}
export async function generate(input,ask){
 const spec=await ask('Extract exact intent. Return {goal,context,requirements:[],constraints:[],deliverables:[],assumptions:[],questions:[]}. Use Indonesian. Ask only independent materially blocking questions; never ask answered questions. Treat selected output language as default unless source explicitly overrides. Do not invent constraints.',input);
 if(!spec||!str(spec.goal,2000)||typeof spec.context!=='string'||spec.context.length>5000||!['requirements','constraints','deliverables','assumptions','questions'].every(k=>strings(spec[k]))||spec.questions.length>6||spec.questions.some(q=>q.length>500))throw malformed();
 spec.questions=spec.questions.filter(q=>!input.answers.some(a=>a.question.trim().toLowerCase()===q.trim().toLowerCase()));
 if(spec.questions.length)return {stage:'clarify',spec};
 let draft='',issues=[];
 for(let attempt=0;attempt<=2;attempt++){
  const suggestion=await ask('Translate and optimize the instruction into natural, task-specific English. Include the requested answer language. Preserve exact numeric literals, names, URLs, quoted text, identifiers, constraints and required outputs. Do not execute. Return {draft:string}. Repair identified review issues.',{input,spec,previous:draft,issues});
  if(!str(suggestion?.draft,32000))throw malformed();
  draft=suggestion.draft;
  const literal=literalFailures([input.source,...input.answers.map(a=>a.answer)].join('\n'),draft);
  let review;
  try{review=await ask('Independently compare the candidate to the original instruction and clarification answers. Look for changed intent, added obligations, missing deliverables, altered numbers/names/code, weak English or wrong response language. Return {pass:boolean,issues:string[]} in Indonesian. A critical failure always fails.',{input,draft})}catch{return {stage:'warning',spec,draft,issues:[...literal,'Peninjauan semantik belum selesai.'],revisions:attempt}}
  if(typeof review?.pass!=='boolean'||!strings(review.issues))return {stage:'warning',spec,draft,issues:[...literal,'Format laporan peninjauan tidak sah.'],revisions:attempt};
  issues=[...literal,...review.issues];
  if(review.pass&&!issues.length)return {stage:'ready',spec,draft,issues,revisions:attempt};
  if(!issues.length)issues=['Peninjau belum dapat memastikan kesetiaan makna.'];
 }
 return {stage:'warning',spec,draft,issues,revisions:2}
}
