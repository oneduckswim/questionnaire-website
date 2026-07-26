const API = String(window.ADMIN_API_BASE || "").replace(/\/$/, "");
const CONDITIONS = ["laptop_ai","laptop_no_ai","beverage_ai","beverage_no_ai"];
const conditionNames = {laptop_ai:"Laptop · AI",laptop_no_ai:"Laptop · No AI",beverage_ai:"Beverage · AI",beverage_no_ai:"Beverage · No AI"};
const questionNames = {
  consent:"Consent",q1:"Age",q2:"E-commerce usage",q3:"Recent product browsing",q4:"Purchase involvement",q5:"Brand comparison",
  q6:"Competence 1",q7:"Competence 2",q8:"Competence 3",q9:"Competence 4",q10:"Novelty 1",q11:"Novelty 2",q12:"Novelty 3",q13:"Novelty 4",
  q14:"Authenticity 1",q15:"Authenticity 2",q16:"Authenticity 3",q17:"Authenticity 4",q18:"Humanness 1",q19:"Humanness 2",q20:"Humanness 3",q21:"Humanness 4",
  q22:"Legitimacy 1",q23:"Legitimacy 2",q24:"Legitimacy 3",q25:"Legitimacy 4",q26:"Trust 1",q27:"Trust 2",q28:"Trust 3",q29:"Trust 4",
  q30:"Purchase intention 1",q31:"Purchase intention 2",q32:"Purchase intention 3",q33:"Purchase intention 4",q34:"Attention check",q35:"Manipulation check",
  q36:"AI attitude",q37:"AI tool usage",q38:"Brand familiarity",q39:"Previous purchase",q40:"Detail-page reading",q41:"Gender",q42:"Education",q43:"Current status",q44:"Disposable income"
};
const valueNames = {
  agree:"Agree",disagree:"Disagree",under18:"Under 18","18-25":"18–25","26-35":"26–35","36-45":"36–45","46+":"46+",
  frequently:"Frequently",occasionally:"Occasionally",rarely:"Rarely",almost_never:"Almost never",yes:"Yes",no:"No",not_sure:"Not sure",
  ai_used:"AI stated",no_information:"No AI information",do_not_remember:"Do not remember",male:"Male",female:"Female",other:"Other / Prefer not",
  high_school:"High school or below",associate:"Associate",bachelor:"Bachelor",master_plus:"Master+",
  student:"Student",employee:"Employee",freelancer:"Freelancer",not_employed:"Not employed",
  under3000:"< 3,000","3000_5999":"3,000–5,999","6000_9999":"6,000–9,999","10000_plus":"10,000+",prefer_not:"Prefer not"
};
const state = {records:[],view:"overview",token:sessionStorage.getItem("admin_token")||""};
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pct = (n,d) => d ? `${(n*100/d).toFixed(1)}%` : "0.0%";

async function request(path, options={}) {
  const headers = {...(options.headers||{}),"content-type":"application/json"};
  if(state.token) headers.authorization=`Bearer ${state.token}`;
  const response=await fetch(`${API}${path}`,{...options,headers});
  const value=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(value.error||`Request failed (${response.status})`);
  return value;
}

async function login(password){
  const value=await request("/admin/login",{method:"POST",body:JSON.stringify({password})});
  state.token=value.token; sessionStorage.setItem("admin_token",state.token); await loadData();
}
async function loadData(){
  const value=await request("/admin/data");
  state.records=value.records||[];
  $("#updatedAt").textContent=`更新于 ${new Date(value.generatedAt).toLocaleString()}`;
  $("#loginView").classList.add("hidden"); $("#dashboardView").classList.remove("hidden");
  render();
}
function filtered(){
  const status=$("#statusFilter").value, condition=$("#conditionFilter").value, pilot=$("#pilotFilter").value;
  return state.records.filter(r=>(status==="all"||r.status===status)&&(condition==="all"||r.condition===condition)&&(pilot==="all"||(pilot==="pilot" ? Number(r.pilot)===1 : Number(r.pilot)===0)));
}
function countBy(records,keyFn){const out={};records.forEach(r=>{const k=keyFn(r);out[k]=(out[k]||0)+1});return out}
function bars(data,total,color=""){
  const entries=Object.entries(data).sort((a,b)=>b[1]-a[1]);
  return entries.length?entries.map(([key,n])=>`<div class="bar-row"><span>${esc(valueNames[key]||conditionNames[key]||key)}</span><div class="bar-track"><div class="bar-fill ${color}" style="width:${total?n*100/total:0}%"></div></div><span class="bar-value">${n} · ${pct(n,total)}</span></div>`).join(""):`<div class="empty">暂无数据</div>`;
}
function metric(label,value,note=""){return `<article class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`}
function overview(records){
  const completed=records.filter(r=>r.status==="completed").length, invalid=records.filter(r=>r.status==="invalid").length;
  const durations=records.map(r=>Number(r.duration_seconds)).filter(Number.isFinite).filter(n=>n>0);
  const avg=durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length):0;
  return `<section class="metrics">${metric("全部记录",records.length,"当前筛选范围")}${metric("完成问卷",completed,pct(completed,records.length))}${metric("作废记录",invalid,pct(invalid,records.length))}${metric("平均用时",avg?`${Math.floor(avg/60)}m ${avg%60}s`:"—","仅含已计时记录")}</section>
  <section class="grid-2"><article class="panel"><h2>四组样本分配</h2>${bars(countBy(records,r=>r.condition),records.length)}</article><article class="panel"><h2>答题状态</h2>${bars(countBy(records,r=>r.status),records.length,"amber")}</article></section>`;
}
function questions(records){
  const keys=Object.keys(questionNames);
  return `<article class="panel"><div class="question-toolbar"><label>选择题目<select id="questionSelect">${keys.map(k=>`<option value="${k}">${k.toUpperCase()} · ${esc(questionNames[k])}</option>`).join("")}</select></label><span class="pill">${records.length} records</span></div><div id="questionChart"></div></article>`;
}
function renderQuestion(records){
  const key=$("#questionSelect").value; const answered=records.filter(r=>r.answers&&r.answers[key]!=null);
  $("#questionChart").innerHTML=`<h2>${esc(key.toUpperCase())} · ${esc(questionNames[key])}</h2>${bars(countBy(answered,r=>String(r.answers[key])),answered.length)}<p class="security-note">已回答 ${answered.length} / 当前筛选 ${records.length}</p>`;
}
function crosstab(records){
  const identity=["q1","q41","q42","q43","q44"], outcome=Object.keys(questionNames).filter(k=>k!=="consent");
  return `<article class="panel"><div class="cross-controls"><label>身份变量<select id="identitySelect">${identity.map(k=>`<option value="${k}">${esc(questionNames[k])}</option>`).join("")}</select></label><label>对比题目<select id="outcomeSelect">${outcome.map(k=>`<option value="${k}">${k.toUpperCase()} · ${esc(questionNames[k])}</option>`).join("")}</select></label></div><div id="crossTable"></div></article>`;
}
function renderCross(records){
  const a=$("#identitySelect").value,b=$("#outcomeSelect").value;
  const rows={}; const columns=new Set();
  records.forEach(r=>{const av=r.answers?.[a],bv=r.answers?.[b];if(av==null||bv==null)return;columns.add(String(bv));rows[av]??={};rows[av][bv]=(rows[av][bv]||0)+1});
  const cols=[...columns].sort((x,y)=>String(x).localeCompare(String(y),undefined,{numeric:true}));
  const html=Object.keys(rows).length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>${esc(questionNames[a])}</th>${cols.map(c=>`<th>${esc(valueNames[c]||c)}</th>`).join("")}<th>Total</th></tr></thead><tbody>${Object.entries(rows).map(([key,counts])=>{const total=Object.values(counts).reduce((x,y)=>x+y,0);return `<tr><td><strong>${esc(valueNames[key]||key)}</strong></td>${cols.map(c=>`<td>${counts[c]||0} <small>(${pct(counts[c]||0,total)})</small></td>`).join("")}<td>${total}</td></tr>`}).join("")}</tbody></table></div>`:`<div class="empty">当前筛选条件下没有可交叉分析的数据</div>`;
  $("#crossTable").innerHTML=`<h2>${esc(questionNames[a])} × ${esc(questionNames[b])}</h2>${html}`;
}
function quality(records){
  const attention=countBy(records,r=>r.attention_passed==null?"not_recorded":r.attention_passed?"passed":"failed");
  const manipulation=countBy(records,r=>r.manipulation_passed==null?"not_recorded":r.manipulation_passed?"passed":"failed");
  const invalid=countBy(records,r=>r.invalid_reason||"not_invalid");
  return `<section class="grid-2"><article class="panel"><h2>注意力检查</h2>${bars(attention,records.length)}</article><article class="panel"><h2>操纵检查</h2>${bars(manipulation,records.length)}</article><article class="panel"><h2>作废原因</h2>${bars(invalid,records.length)}</article><article class="panel"><h2>异常短时长</h2><p class="metric"><strong>${records.filter(r=>Number(r.duration_seconds)>0&&Number(r.duration_seconds)<60).length}</strong><small>少于 60 秒完成的记录（正式分析前请预先确定阈值）</small></p></article></section>`;
}
function render(){
  const records=filtered(); const titles={overview:"研究数据总览",questions:"逐题选择率",crosstab:"身份交叉分析",quality:"数据质量检查"};
  $("#viewTitle").textContent=titles[state.view]; $("#content").innerHTML=state.view==="overview"?overview(records):state.view==="questions"?questions(records):state.view==="crosstab"?crosstab(records):quality(records);
  if(state.view==="questions"){ $("#questionSelect").addEventListener("change",()=>renderQuestion(filtered())); renderQuestion(records) }
  if(state.view==="crosstab"){ $("#identitySelect").addEventListener("change",()=>renderCross(filtered()));$("#outcomeSelect").addEventListener("change",()=>renderCross(filtered()));renderCross(records) }
}
function exportCsv(){
  const records=filtered(); const keys=["condition","product","ai_disclosure","pilot","status","started_at","completed_at","duration_seconds","attention_passed","manipulation_passed","invalid_reason","consent",...Array.from({length:44},(_,i)=>`q${i+1}`)];
  const quote=v=>`"${String(v??"").replaceAll('"','""')}"`; const csv=[keys.join(","),...records.map(r=>keys.map(k=>quote(k in r?r[k]:r.answers?.[k])).join(","))].join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download=`questionnaire-data-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);
}
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();$("#loginError").textContent="";try{await login($("#password").value)}catch(err){$("#loginError").textContent=err.message}});
$("#logoutButton").addEventListener("click",()=>{sessionStorage.removeItem("admin_token");location.reload()});
$("#refreshButton").addEventListener("click",()=>loadData().catch(e=>alert(e.message)));
$("#exportButton").addEventListener("click",exportCsv);
["statusFilter","conditionFilter","pilotFilter"].forEach(id=>$(`#${id}`).addEventListener("change",render));
document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));btn.classList.add("active");state.view=btn.dataset.view;render()}));
$("#conditionFilter").innerHTML+=CONDITIONS.map(c=>`<option value="${c}">${conditionNames[c]}</option>`).join("");
if(state.token)loadData().catch(()=>{sessionStorage.removeItem("admin_token")});
