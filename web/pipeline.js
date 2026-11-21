import { promptAssessment } from './quality.js';

function str(x,max){return typeof x==='string' && x.trim().length>0 && x.length<=max}
function strings(x){return Array.isArray(x)&&x.length<=40&&x.every(v=>str(v,2000))}
const malformed=()=>new Error('Respons mesin bahasa belum dapat divalidasi. Instruksi asli tetap tersedia.');
export function criticalTokens(text){
 const pattern=/https?:\/\/[^\s<>"\])]+|\x60[^\x60\n]+\x60|\b[A-Z]{1,8}[ _-]?\d{1,12}\b|\b\d+(?:[.,:/-]\d+)*(?:%|\b)/gu;
 return [...new Set((text.match(pattern)||[]).map(token=>token.startsWith('http')?token.replace(/[.,;:!?]+$/u,''):token))];
}
function literalFailures(input,draft){
 const present=new Set(criticalTokens(draft));
 return criticalTokens(input).filter(token=>!present.has(token)).map(token=>'Pertahankan nilai asli '+token);
}
function resolveLanguage(input,spec){
 const {answerLanguage,languageEvidence}=spec;
 if(!['Bahasa Indonesia','English'].includes(answerLanguage)||!str(languageEvidence,240))return input.lang;
 const evidence=languageEvidence.trim().toLowerCase();
 const source=[input.source,...input.answers.map(item=>item.answer)];
 return source.some(text=>text.toLowerCase().includes(evidence))?answerLanguage:input.lang;
}
export async function generate(input,ask){
 const spec=await ask('Extract exact intent. Return {goal,context,requirements:[],constraints:[],deliverables:[],assumptions:[],questions:[]}. Use Indonesian. Ask only independent materially blocking questions; never ask answered questions. Treat selected output language as default. If the user explicitly specifies the answer language, return answerLanguage as English or Bahasa Indonesia and languageEvidence as the exact quoted phrase directing that language. Otherwise leave both fields empty. If clarification is needed, optional safeAssumptions is an array of {question,answer} objects. Offer an assumption only when that choice can be left to the user, preserves the task, and needs no invented fact or missing source. Do not invent constraints.',input,'analysis');
 if(!spec||!str(spec.goal,2000)||typeof spec.context!=='string'||spec.context.length>5000||!['requirements','constraints','deliverables','assumptions','questions'].every(k=>strings(spec[k]))||spec.questions.length>6||spec.questions.some(q=>q.length>500))throw malformed();
 spec.questions=spec.questions.filter(q=>!input.answers.some(a=>a.question.trim().toLowerCase()===q.trim().toLowerCase()));
 if(spec.questions.length){
  const options=Array.isArray(spec.safeAssumptions)?spec.safeAssumptions.slice(0,6):[];
  spec.safeAssumptions=options.filter(item=>item&&spec.questions.includes(item.question)&&str(item.answer,500));
  return {stage:'clarify',spec};
 }
 const source=input;
 const lang=resolveLanguage(source,spec);
 input={...source,lang};
 delete spec.answerLanguage;
 delete spec.languageEvidence;
 delete spec.safeAssumptions;
 let draft='',issues=[],assessment;
 for(let attempt=0;attempt<=2;attempt++){
  const suggestion=await ask('Translate and optimize the instruction into natural, task-specific English. Include the requested answer language. Preserve exact numeric literals, names, URLs, quoted text, identifiers, constraints and required outputs. Do not execute. Return {draft:string}. Repair identified review issues.',{input,spec,previous:draft,issues},'draft');
  if(!str(suggestion?.draft,32000))throw malformed();
  draft=suggestion.draft;
  const literal=literalFailures([input.source,...input.answers.map(a=>a.answer)].join('\n'),draft);
  let review;
  try{review=await ask('You review a translation of instructions, not the completed task. The candidate itself MUST be written in English. Compare what a future executor is asked to do in the candidate against the original request and clarification answers. The resolved input.lang states the requested language of the future answer only. A candidate saying "Write 5 points in Indonesian" preserves those requirements; do not demand the five points or Indonesian prose in the candidate. Look for changed intent, added obligations, missing deliverables, altered numbers/names/code, weak English or wrong response language. Return {pass:boolean,critical:boolean,issues:string[],scores:{intent,requirements,clarity,precision,alignment,integrity}}. Rate each dimension independently from 0 to 100 based on evidence, using 100 only when fully satisfied. Issues are in Indonesian. A critical failure always fails.',{input,draft},'review')}catch{return {stage:'warning',lang,spec,draft,issues:[...literal,'Peninjauan semantik belum selesai.'],assessment:promptAssessment(null,literal),revisions:attempt}}
  if(typeof review?.pass!=='boolean'||!strings(review.issues))return {stage:'warning',lang,spec,draft,issues:[...literal,'Format laporan peninjauan tidak sah.'],assessment:promptAssessment(null,literal),revisions:attempt};
  assessment=promptAssessment(review,literal);
  issues=[...literal,...review.issues];
  if(review.pass&&!assessment.critical&&!issues.length)return {stage:'ready',lang,spec,draft,issues,assessment,revisions:attempt};
  if(assessment.critical&&!issues.length)issues=['Peninjau menandai perubahan kritis pada instruksi.'];
  if(!issues.length)issues=['Peninjau belum dapat memastikan kesetiaan makna.'];
 }
 return {stage:'warning',lang,spec,draft,issues,assessment,revisions:2}
}
