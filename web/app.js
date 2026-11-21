import { comparisonView } from './comparison.js';
import { executionCards, selectedTarget, targets } from './execution.js';
'use strict';
const main=document.querySelector('main');
const labels={dasbor:'Dasbor',generator:'Generator prompt',riwayat:'Riwayat sesi',perbandingan:'Perbandingan model',templat:'Templat',pengaturan:'Pengaturan',bantuan:'Bantuan'};
const paths={dasbor:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',generator:'M14 4l6 6 M3 21l5-1L21 7l-4-4L4 16z',riwayat:'M3 10a9 9 0 1 1 2 8 M3 4v6h6 M12 7v6l4 2',perbandingan:'M4 18V9h3v9z M10 18V4h3v14z M16 18v-7h3v7z',templat:'M4 3h16v18H4z M4 9h16 M10 9v12',pengaturan:'M3 6h18 M3 17h18 M8 3v6 M16 14v6',bantuan:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9 9a3 3 0 1 1 5 2l-2 2 M12 16v.5',plus:'M12 5v14 M5 12h14',run:'M6 3l14 9-14 9z',launch:'M7 17L18 6 M8 6h10v10'};
function icon(name){return '<svg aria-hidden="true" class="icon" viewBox="0 0 24 24"><path d="'+paths[name]+'"/></svg>'}
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nav=document.querySelector('nav');
nav.innerHTML=Object.entries(labels).map(([id,name])=>(id==='pengaturan'?'<hr>':'')+'<a href="#'+id+'">'+icon(id)+name+'</a>').join('');
const diagram='<svg class="drawing" viewBox="0 0 420 220" role="img" aria-label="Skema instruksi Indonesia menjadi prompt Inggris"><g fill="#f7f9ff" stroke="#758bb9" stroke-width="1.3"><path d="m58 99 85-46 88 47-85 47z" fill="#dae4fa"/><path d="m58 91 85-46 88 47-85 47z" fill="#e8effe"/><path d="m58 83 85-46 88 47-85 47z"/><path d="m109 76 31-17m-19 23 31-17m-20 23 31-17" fill="none"/><path d="m205 153 80-44 77 42-80 44z" fill="#d3dff8"/><path d="m205 146 80-44 77 42-80 44z" fill="#e6edfc"/><path d="m205 138 80-44 77 42-80 44z"/><path d="m266 129-14 8 14 8m30-32 14 8-14 8m-24 12 10-21" fill="none" stroke="#3655a5" stroke-width="2"/><path d="m148 149 0 14 45 23 28-15m17-70 36-20 25 14" fill="none" stroke-dasharray="4 4"/></g><g fill="#34548d" font-family="monospace" font-size="12"><text x="38" y="159">INPUT / ID</text><text x="274" y="60">PROMPT / EN</text></g></svg>';
const examples={
 clear:'Buat rencana belajar Python selama 4 minggu untuk pemula. Sajikan sebagai tabel dengan satu latihan praktis per minggu.',
 vague:'Buat rencana belajar Python untuk tim saya.'
};
const title=(s,p)=>'<h1>'+s+'</h1><p class="lead">'+p+'</p>';
function card(id,name,desc,mode){return '<a class="card" href="#generator" data-mode="'+mode+'"><span class="tile '+(mode==='execute'?'green':'')+'">'+icon(id)+'</span><span class="launch">'+icon('launch')+'</span><h3>'+name+'</h3><p>'+desc+'</p></a>'}
function empty(name,desc){return '<div class="empty">'+icon('riwayat')+'<h3>'+name+'</h3><p>'+desc+'</p></div>'}
const domains=['Umum','Pemrograman','Otomasi','Riset','Bisnis','Konten','Analisis data'];
const languages=['Bahasa Indonesia','English'];
let defaultLanguage='Bahasa Indonesia';
function newSession(){return {session:crypto.randomUUID(),source:'',domain:'Umum',lang:defaultLanguage,answers:[],questions:[],result:null,requestId:null,mode:'generate',runs:[],runError:'',target:null}}
let work=newSession(),historyRows=[],historyError='',settings=null,settingsError='',busy='',error='',notice='',pendingDelete=null,comparison=null,comparisonVersion=null;
const links={hasil:'Tinjau prompt',klarifikasi:'Klarifikasi',...labels};
const route=()=>Object.hasOwn(links,location.hash.slice(1))?location.hash.slice(1):'dasbor';
function go(page){if(route()===page)render();else location.hash=page}
async function api(path,body){
 const res=await fetch('/api/'+path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
 const data=await res.json().catch(()=>({error:'Layanan tidak dapat diakses. Muat ulang setelah masuk.'}));
 if(!res.ok||data.error)throw Object.assign(Error(data.error||'Permintaan gagal.'),{responseReceived:res.ok||data.code!==undefined});return data;
}
async function refreshHistory(){try{historyRows=await api('history');historyError=''}catch(e){historyError=e.message}}
function options(values,chosen){return values.map(v=>'<option '+(chosen===v?'selected':'')+'>'+esc(v)+'</option>').join('')}
function historyView(limit){
 if(historyError)return '<p class="note">'+esc(historyError)+'</p><button id="refresh">Coba lagi</button>';
 if(!historyRows.length)return empty('Belum ada versi tersimpan','Prompt yang selesai ditinjau akan muncul di sini, termasuk hasil dengan peringatan.');
 return historyRows.slice(0,limit).map(r=>'<div class="listrow"><span>'+esc(r.title)+'<br><small>Versi '+esc(r.version)+' · '+esc(new Date(r.created).toLocaleString('id-ID'))+'</small></span><button data-open="'+esc(r.session)+'" data-version="'+esc(r.version)+'">Buka</button></div>').join('');
}
function dashboard(){
 return title('Dasbor','Kelola instruksi, prompt, dan hasil dalam satu ruang kerja.')+'<div class="hero"><div class="intro"><h2>Mulai dengan instruksi Anda.</h2><p>Susun prompt bahasa Inggris dan periksa apakah tujuan, angka, serta batasan asli tetap terjaga.</p><button class="primary" id="new">'+icon('plus')+' Buat prompt</button></div><div class="blueprint">'+diagram+'</div></div><section class="section"><div class="bar"><h2>Mode kerja</h2></div><div class="grid">'+card('generator','Buat prompt','Susun dan tinjau prompt dengan mesin bahasa.','generate')+card('run','Buat & jalankan','Tinjau prompt sebelum mengirimnya ke model pilihan.','execute')+card('run','Jalankan prompt yang sudah ada','Simpan dan jalankan prompt Anda sendiri.','existing')+'</div></section><section class="section"><div class="bar"><h2>Sesi terbaru</h2><a href="#riwayat">Lihat riwayat</a></div>'+historyView(3)+'</section>';
}
function executionView(r) {
 const choices=targets(settings,esc);
 const approval=r.stage!=='ready';
 const eligible=Number.isInteger(r.version);
 const hasDraft=work.edited!=null&&work.edited!==r.draft;
 return '<section class="panel execution"><h2>Jalankan versi ini</h2>' +
  (settingsError?'<p class="note">'+esc(settingsError)+'</p>':!choices?'<p class="note">Belum ada model provider yang dikonfigurasi di Sites.</p>':'<form id="execute"><div class="group"><label for="target">Provider dan model</label><select id="target" required>'+choices+'</select></div>'+
  (approval?'<label class="execution-check"><input id="approve" type="checkbox" required> Saya setujui prompt dan memahami peringatannya.</label>':'')+
  '<div class="actions"><button class="primary" id="run" '+(eligible&&!hasDraft?'':'disabled')+'>Jalankan versi '+esc(r.version)+'</button></div></form>')+
  (hasDraft?'<p>Simpan suntingan untuk menjalankan versi baru.</p>':'')+
  (work.runError?'<p class="note">'+esc(work.runError)+'</p>':'')+
  (eligible?'<button id="refreshRuns">Muat ulang hasil</button>':'')+'</section>'+
  (work.runs.length?'<section><h2>Riwayat eksekusi versi ini</h2>'+executionCards(work.runs,esc)+'</section>':'');
}
const message=()=>error?'<div class="err" role="alert">'+esc(error)+'</div>':'';
function availability(){return 'Qwen2.5 1.5B · Model publik di perangkat Anda.'}
function generator(){
 if(work.mode==='existing')return title('Jalankan prompt yang sudah ada','Simpan prompt sebagai versi yang dapat dipilih untuk eksekusi.')+
 '<form id="existing" class="panel"><div class="group"><label for="source">Prompt Anda</label><textarea id="source" required maxlength="12000">'+esc(work.source)+'</textarea></div><div class="group"><label for="lang">Bahasa jawaban</label><select id="lang">'+options(languages,work.lang)+'</select></div>'+message()+'<button class="primary">Simpan dan tinjau</button></form>';
 return title('Generator prompt','Tulis instruksi asli dan tentukan bahasa jawaban yang diinginkan.')+'<form class="panel" id="generate"><h2>Instruksi asli</h2><div class="group"><label for="source">Apa yang ingin Anda kerjakan?</label><textarea id="source" required maxlength="12000" placeholder="Misalnya, rangkum laporan ini untuk tim operasional dalam 5 poin.">'+esc(work.source)+'</textarea></div><div class="grid"><div class="group"><label for="domain">Bidang</label><select id="domain">'+options(domains,work.domain)+'</select></div><div class="group"><label for="lang">Bahasa jawaban</label><select id="lang">'+options(languages,work.lang)+'</select></div></div><p class="muted">'+availability()+' Penggunaan pertama mengunduh model dari Hugging Face dan runtime dari GitHub. Gunakan Wi-Fi dan browser dengan WebGPU (perkiraan memori GPU 1,8 GB). Instruksi diproses di perangkat, lalu versi hasil disimpan ke Studio privat.</p>'+message()+'<div class="actions"><button class="primary">'+(work.mode==='execute'?'Susun prompt untuk dijalankan':'Susun & tinjau prompt')+'</button><a href="/simulasi/#generator">Coba simulasi lokal</a></div></form>';
}
function clarification(){return title('Klarifikasi','Lengkapi detail yang memengaruhi hasil. Jawaban sebelumnya dapat disunting.')+'<form id="clarify" class="panel"><details><summary>Instruksi asli</summary><p>'+esc(work.source)+'</p></details>'+work.answers.map((a,i)=>'<div class="group"><label for="q'+i+'">'+esc(a.question)+'</label><input id="q'+i+'" data-answer="'+i+'" required maxlength="1500" value="'+esc(a.answer)+'"></div>').join('')+message()+'<div class="actions"><button class="primary">Lanjutkan peninjauan</button><a href="#generator">Ubah instruksi</a></div></form>'}
function items(values){return values.length?'<ul>'+values.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'<p class="muted">Tidak teridentifikasi.</p>'}
function promptVersions(r){
 const others=historyRows.filter(row=>row.session===work.session&&row.version!==r.version);
 if(!others.length)return '';
 const previous=comparisonVersion?.session===work.session&&comparisonVersion?.version!==r.version?comparisonVersion:null;
 return '<section class="panel execution"><h2>Bandingkan versi prompt</h2><div class="actions">'+
  others.map(row=>'<button data-compare-version="'+esc(row.version)+'">Bandingkan v'+esc(row.version)+'</button>').join('')+'</div>'+
  (previous?'<div class="grid compare-grid"><div><h3>Versi '+esc(previous.version)+'</h3><pre class="answer">'+esc(previous.draft)+'</pre></div>'+
    '<div><h3>Versi '+esc(r.version)+'</h3><pre class="answer">'+esc(r.draft)+'</pre></div></div>':'')+'</section>';
}
function result(){
 const r=work.result;if(!r)return empty('Belum ada hasil','Pilih sesi di Riwayat atau buat prompt.');
 return title('Tinjau prompt','Versi '+esc(r.version)+' · '+esc(r.model))+'<section class="panel"><h2>'+esc(r.spec.goal)+'</h2><p>'+esc(r.spec.context)+'</p><details><summary>Instruksi dan jawaban klarifikasi</summary><p>'+esc(work.source)+'</p>'+items(work.answers.map(a=>a.question+' — '+a.answer))+'</details>'+[['Kebutuhan',r.spec.requirements],['Batasan',r.spec.constraints],['Hasil yang diminta',r.spec.deliverables],['Asumsi',r.spec.assumptions]].map(([k,v])=>'<details><summary>'+k+'</summary>'+items(v)+'</details>').join('')+'<div class="group"><label for="draft">'+(r.model==='Prompt manual'?'Prompt yang tersimpan':'Prompt bahasa Inggris')+'</label><textarea class="mono" id="draft" '+(work.unsaved?'readonly':'')+'>'+esc(work.edited??r.draft)+'</textarea></div><p id="review" class="'+(r.stage==='ready'&&work.edited==null?'status':'note')+'">'+(work.edited!=null?'Suntingan belum ditinjau.':r.stage==='ready'?'Lolos pemeriksaan nilai dan tinjauan model lokal.':esc(r.issues.join(' ')))+'</p><p class="muted">Revisi otomatis '+esc(r.revisions)+' dari 2. Peninjau menggunakan model yang sama dalam permintaan terpisah.</p>'+message()+'<div class="actions"><button id="copy">Salin prompt</button>'+(work.unsaved?'<button id="retrySave">Coba simpan kembali</button>':'<button id="save">Simpan versi suntingan</button>')+'<a href="#generator">Kembali ke instruksi</a><button id="delete">Hapus sesi</button></div><p role="status" id="notice">'+esc(notice)+'</p>'+(pendingDelete===work.session?'<div class="note">Hapus semua versi sesi ini? <button id="confirmDelete">Ya, hapus sesi</button> <button id="cancelDelete">Batal</button></div>':'')+'</section>'+executionView(r)+promptVersions(r);
}
function render(){
 const page=route();document.title=links[page]+' · PromptForge AI';document.querySelector('#crumb').textContent=links[page];for(const a of nav.querySelectorAll('a'))a.classList.toggle('current',a.hash==='#'+(['hasil','klarifikasi'].includes(page)?'generator':page));
 const views={dasbor:dashboard,generator,klarifikasi:clarification,hasil:result,riwayat:()=>title('Riwayat sesi','200 versi terbaru milik akun Anda.')+message()+'<section class="panel">'+historyView(200)+'</section>',pengaturan:()=>title('Pengaturan','Konfigurasi mesin dan preferensi untuk draf baru.')+'<section class="panel"><h2>Mesin bahasa</h2><p>'+availability()+'</p><div class="group"><label for="defaultLang">Bahasa jawaban di tab ini</label><select id="defaultLang">'+options(languages,defaultLanguage)+'</select></div></section>',bantuan:()=>title('Bantuan','Cara menggunakan Studio privat.')+'<section class="panel"><p>Susun & tinjau prompt menjalankan model publik di perangkat Anda. Setelah klarifikasi yang diperlukan, sistem meninjau draf dan mencoba maksimal dua revisi. Hasil berperingatan tetap dapat dibaca dan disunting.</p><p>Setiap hasil dan suntingan yang disimpan memiliki nomor versi. Hapus sesi untuk menghapus semua versinya. Draf sebelum dikirim hanya ada di tab ini.</p><p><a href="/register.txt">Register kapabilitas</a> · <a href="/simulasi/">Simulasi lokal</a></p></section>',perbandingan:()=>title('Perbandingan model','Uji model berbeda dengan prompt yang sama.')+message()+comparisonView({settings,history:historyRows,comparison,escape:esc}),templat:()=>title('Templat','Pustaka templat belum tersedia.')};
 main.innerHTML=busy?'<section class="panel" role="status"><h2>'+esc(busy)+'</h2><p>Tunggu hingga proses selesai.</p></section>':views[page]();if(work.target&&document.querySelector('#target'))document.querySelector('#target').value=work.target;
 main.focus({preventScroll:true});
}
async function task(label,fn){if(busy)return;busy=label;error='';notice='';render();try{await fn()}catch(e){error=e.message||'Permintaan belum berhasil.'}finally{busy='';render()}}
async function submit(){
 if(!work.source.trim()){error='Isi instruksi sebelum melanjutkan.';render();return}
 await task('Menganalisis dan meninjau instruksi…',async()=>{
  work.requestId??=crypto.randomUUID();
  const {runLocal}=await import('./local.js');
  const input=Object.fromEntries(['source','domain','lang','answers'].map(k=>[k,work[k]]));
  const r=work.unsaved??await runLocal(input,text=>{const status=main.querySelector('[role=status] p');if(status)status.textContent=text});

  if(r.stage==='clarify'){const prev=new Set(work.answers.map(a=>a.question));for(const question of r.spec.questions)if(!prev.has(question))work.answers.push({question,answer:''});if(work.answers.length>12){work.answers=work.answers.filter(a=>a.answer).slice(0,12);go('generator');throw Error('Terlalu banyak detail belum jelas. Perinci instruksi asli.');}work.requestId=null;go('klarifikasi');return}
  work.unsaved=r;
  work.result={...r,version:'belum tersimpan',model:'Qwen2.5 1.5B'};
  work.edited=null;go('hasil');
  work.result=await api('local',{...input,requestId:work.requestId,session:work.session,report:r});
  work.unsaved=null;work.edited=null;work.requestId=null;work.runs=[];work.runError='';await refreshHistory();go('hasil');
 });
}
async function refreshRuns(){
 try{work.runs=await api('executions?session='+encodeURIComponent(work.session)+'&version='+work.result.version);work.runError=''}catch(e){work.runError=e.message}
}
async function runVersion(form){
 const target=selectedTarget(form.querySelector('#target'));
 const confirm=form.querySelector('#approve')?.checked??false;
 await task('Menjalankan versi prompt…',async()=>{
  const signature=target.provider+'/'+target.model;
  if(work.pendingRun&&work.pendingRun.signature!==signature)throw Error('Periksa hasil permintaan sebelumnya dengan model semula sebelum memilih model lain.');
  const requestId=work.pendingRun?.requestId??crypto.randomUUID();
  work.pendingRun={requestId,signature};
  try{
   const record=await api('execute',{session:work.session,version:work.result.version,target,confirm,requestId});
   if(record.status!=='running')work.pendingRun=null;
   work.runs=[record,...work.runs.filter(item=>item.id!==record.id)];
  }catch(e){if(e.responseReceived)work.pendingRun=null;throw e}
 });
}
document.addEventListener('submit',e=>{
 e.preventDefault();
 if(e.target.id==='compare'){
  const form=e.target;
  const first=selectedTarget(form.querySelector('#firstModel')),second=selectedTarget(form.querySelector('#secondModel'));
  const assessmentTarget=selectedTarget(form.querySelector('#reviewModel'));
  const [session,rawVersion]=form.querySelector('#compareVersion').value.split('/');
  const version=Number(rawVersion),confirm=form.querySelector('#confirmCompare').checked;
  task('Menjalankan kedua model…',async()=>{
   if(first.provider===second.provider&&first.model===second.model)throw Error('Pilih dua model yang berbeda.');
   const results=await Promise.allSettled([first,second].map(target=>
    api('execute',{session,version,confirm,target,assessmentTarget,requestId:crypto.randomUUID()})));
   comparison={version,runs:[],errors:[]};
   for(const [index,result] of results.entries()){
    if(result.status==='fulfilled')comparison.runs.push(result.value);
    else comparison.errors.push([first,second][index].model+' · '+result.reason.message);
   }
  });return;
 }
 if(e.target.dataset.feedback){
  const form=e.target,fields=new FormData(form);
  task('Menyimpan umpan balik…',async()=>{
   await api('feedback',{session:work.session,version:work.result.version,executionId:form.dataset.feedback,
    useful:fields.get('useful')==='yes',comment:fields.get('comment')});
   await refreshRuns();notice='Umpan balik tersimpan.';
  });return;
 }
 if(e.target.id==='execute'){runVersion(e.target);return}
 if(e.target.id==='existing'){
  task('Menyimpan prompt…',async()=>{
   work.requestId??=crypto.randomUUID();
   work.result=await api('existing',{session:work.session,requestId:work.requestId,source:work.source,
    draft:work.source,lang:work.lang,domain:work.domain,answers:[]});
   work.requestId=null;work.edited=null;work.runs=[];work.pendingRun=null;work.runError='';await refreshHistory();go('hasil');
  });return;
 }
 submit();
});
document.addEventListener('input',e=>{const el=e.target;if(el.id==='target'){work.target=el.value;return}if(el.id==='defaultLang'){defaultLanguage=el.value;return}work.requestId=null;if(['source','domain','lang'].includes(el.id)){if(el.id==='source'&&el.value!==work.source)work.answers=[];work.unsaved=null;work[el.id]=el.value}else if(el.dataset.answer!==undefined){work.answers[Number(el.dataset.answer)].answer=el.value}else if(el.id==='draft'){work.edited=el.value;document.querySelector('#review').className='note';document.querySelector('#review').textContent='Suntingan belum ditinjau.';const run=document.querySelector('#run');if(run)run.disabled=el.value!==work.result.draft}});
document.addEventListener('click',async e=>{
 const b=e.target.closest('button,a');if(!b)return;
 if(b.matches('.skip')){e.preventDefault();main.focus();return}
 if(busy){if(!b.href||b.hash)e.preventDefault();return}
 if(b.id==='new'||b.dataset.mode){e.preventDefault();work=newSession();work.mode=b.dataset.mode??'generate';error='';go('generator')}
 if(b.dataset.compareVersion){
  await task('Membuka versi pembanding…',async()=>{
   const version=Number(b.dataset.compareVersion);
   comparisonVersion={...await api('version?session='+encodeURIComponent(work.session)+'&version='+version),session:work.session,version};
  });
 }
 if(b.dataset.open){await task('Membuka versi…',async()=>{const ver=Number(b.dataset.version),id=b.dataset.open;const r=await api('version?session='+encodeURIComponent(id)+'&version='+ver);work={...newSession(),...r,session:id,result:{...r,version:ver}};await refreshRuns();go('hasil')})}
 if(b.id==='refreshRuns')await task('Memuat hasil…',refreshRuns);
 if(b.id==='refresh')await task('Memuat riwayat…',refreshHistory);
 if(b.id==='copy'){try{await navigator.clipboard.writeText(work.edited??work.result.draft);notice='Prompt disalin.'}catch{notice='Gunakan perintah salin perangkat Anda.'}document.querySelector('#notice').textContent=notice}
 if(b.id==='retrySave'){await submit();return}if(b.id==='save'){if(!work.edited?.trim()||work.edited===work.result.draft){notice='Sunting draf sebelum menyimpan versi baru.';render();return}
  await task('Menyimpan versi…',async()=>{work.requestId??=crypto.randomUUID();work.result=await api('edit',{session:work.session,parent:work.result.version,draft:work.edited,requestId:work.requestId});work.requestId=null;work.edited=null;work.runs=[];work.pendingRun=null;work.runError='';await refreshHistory();notice='Versi tersimpan.'})}
 if(b.id==='delete'||b.id==='cancelDelete'){pendingDelete=b.id==='delete'?work.session:null;render()}
 if(b.id==='confirmDelete')await task('Menghapus sesi…',async()=>{await api('delete',{session:work.session});work=newSession();pendingDelete=null;await refreshHistory();go('riwayat')});
});
window.addEventListener('hashchange',()=>{pendingDelete=null;render()});
render();
Promise.all([refreshHistory(),api('status').then(v=>settings=v).catch(e=>settingsError=e.message)]).then(()=>{if(!busy&&!document.activeElement?.matches('textarea,input,select'))render()});
