"use client";

import { useEffect, useMemo, useState } from "react";
import { tr, type Language } from "./translations";

type Session = { id:string; product:"laptop"|"beverage"; ai_disclosure:number; pilot:number; started_at:string };
type Answers = Record<string,string>;

const sections: Record<string,string[]> = {
  "A. Perceived Competence": [
    "This product introduction states the key points clearly.",
    "This product page looks fairly professional.",
    "After reading it, I feel that this brand puts effort into presenting its products.",
    "This introduction gives me the sense that the product information has been carefully organized.",
  ],
  "B. Perceived Novelty": [
    "The way this product is presented feels somewhat fresh to me.",
    "This page is memorable.",
    "This kind of presentation makes me want to look at it a bit longer.",
    "My first impression of this product is not quite ordinary.",
  ],
  "C. Perceived Authenticity": [
    "This introduction feels fairly natural to me.",
    "This product page does not look like it was just put together from a generic template.",
    "The content feels fairly credible to me.",
    "I feel that the way it is presented matches the product itself.",
  ],
  "D. Perceived Humanness": [
    "This introduction does not read as stiff or mechanical.",
    "This product presentation feels approachable to me.",
    "The product introduction on this page feels natural and does not have a strong hard-sell tone.",
    "The content gives me the sense that the brand is putting real thought into the design.",
  ],
  "E. Perceived Legitimacy": [
    "I find it acceptable for a brand to present its products in this way.",
    "A product page like this would not make me uncomfortable.",
    "I do not see any problem with this kind of presentation.",
    "If a brand were to introduce its products in this way, I would find it acceptable.",
  ],
  "F. Consumer Trust": [
    "After reading this introduction, I feel fairly at ease about the product information.",
    "I feel that this brand is fairly reliable.",
    "If I were going to buy this kind of product, the information on this page would be useful for reference.",
    "Overall, I am willing to trust the product information conveyed on this page.",
  ],
  "G. Purchase Intention": [
    "If I happened to need this kind of product, I would consider it.",
    "I am willing to look into this product further.",
    "Compared with similar products, I would put this one on my shortlist.",
    "If the price is right, I might buy this product.",
  ],
};
const ratingItems = Object.values(sections).flat();
let activeLanguage: Language = "en";

function Choice({name,options,value,setAnswer,language=activeLanguage}:{name:string;options:[string,string][];value?:string;setAnswer:(k:string,v:string)=>void;language?:Language}) {
  return <div className="choices">{options.map(([id,label])=><label className="choice" key={id}><input type="radio" name={name} checked={value===id} onChange={()=>setAnswer(name,id)}/><span>{tr(label,language)}</span></label>)}</div>;
}

function Scale({n,text,value,setAnswer,left="Strongly disagree",right="Strongly agree",language=activeLanguage}:{n:number;text:string;value?:string;setAnswer:(k:string,v:string)=>void;left?:string;right?:string;language?:Language}) {
  return <fieldset className="question"><legend><b>Q{n}.</b> {tr(text,language)}</legend><div className="scale-labels"><span>{tr(left,language)}</span><span>{tr(right,language)}</span></div><div className="scale">{[1,2,3,4,5,6,7].map(x=><label key={x}><input type="radio" name={`q${n}`} checked={value===String(x)} onChange={()=>setAnswer(`q${n}`,String(x))}/><span>{x}</span></label>)}</div></fieldset>;
}

export default function Survey() {
  const [session,setSession]=useState<Session|null>(null);
  const [answers,setAnswers]=useState<Answers>({});
  const [page,setPage]=useState(0);
  const [error,setError]=useState("");
  const [complete,setComplete]=useState(false);
  const [loading,setLoading]=useState(true);
  const [loadAttempt,setLoadAttempt]=useState(0);
  const [language,setLanguage]=useState<Language>("en");
  activeLanguage=language;

  useEffect(()=>{
    const controller=new AbortController();
    const timeout=window.setTimeout(()=>controller.abort(),10000);
    const params=new URLSearchParams(window.location.search);
    const pilot=params.get("mode")==="preview";
    const forced=pilot?params.get("condition"):null;
    const storageKey=pilot&&forced?`questionnaire_preview_response_id_${forced}`:"questionnaire_formal_response_id_v1";
    const saved=localStorage.getItem(storageKey);
    const cached=localStorage.getItem("questionnaire_answers");
    const savedLanguage=localStorage.getItem("questionnaire_language");
    const initialLanguage:Language=savedLanguage==="zh"||savedLanguage==="en"?savedLanguage:(navigator.language.toLowerCase().startsWith("zh")?"zh":"en");
    setLanguage(initialLanguage);
    document.documentElement.lang=initialLanguage==="zh"?"zh-CN":"en";
    if(cached) setAnswers(JSON.parse(cached));
    setLoading(true);
    setError("");
    fetch("/api/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:saved,pilot,forcedCondition:forced}),signal:controller.signal})
      .then(async r=>{if(!r.ok)throw new Error(`Session request failed (${r.status})`);return r.json()})
      .then(data=>{const s={...data,ai_disclosure:Number(data.ai_disclosure),pilot:Number(data.pilot)};setSession(s);localStorage.setItem(storageKey,s.id)})
      .catch(()=>setError("The questionnaire service could not be reached. Check your connection and try again."))
      .finally(()=>{window.clearTimeout(timeout);setLoading(false)});
    return()=>{window.clearTimeout(timeout);controller.abort()};
  },[loadAttempt]);

  const changeLanguage=(next:Language)=>{setLanguage(next);localStorage.setItem("questionnaire_language",next);document.documentElement.lang=next==="zh"?"zh-CN":"en"};

  const terminate=async(reason:"underage"|"attention",nextAnswers:Answers)=>{
    localStorage.setItem("questionnaire_answers",JSON.stringify(nextAnswers));
    if(session)await fetch("/api/response",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({id:session.id,answers:{...nextAnswers,_invalid_reason:reason},completed:true,startedAt:session.started_at})}).catch(()=>null);
  };
  const setAnswer=(k:string,v:string)=>{
    const next={...answers,[k]:v};
    setAnswers(next);
    localStorage.setItem("questionnaire_answers",JSON.stringify(next));
  };
  const required=useMemo(()=>{
    if(page===0)return["consent"]; if(page===1)return["q1","q2","q3"]; if(page===2)return["q4","q5"];
    if(page>=3&&page<=5){const start=6+(page-3)*10;const count=page===5?8:10;return Array.from({length:count},(_,i)=>`q${start+i}`)}
    if(page===6)return["q34","q35"]; if(page===7)return["q36","q37","q38","q39","q40"]; return["q41","q42","q43","q44"];
  },[page]);
  const save=async(done=false)=>{if(session)await fetch("/api/response",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({id:session.id,answers,completed:done,startedAt:session.started_at})})};
  const next=async()=>{if(required.some(k=>!answers[k])){setError(tr("Please answer every question on this page before continuing.",language));return}
    if(page===0&&answers.consent==="disagree"){setComplete(true);return}
    if(page===1&&answers.q1==="under18"){await terminate("underage",answers);localStorage.removeItem("questionnaire_answers");setComplete(true);return}
    if(page===6&&answers.q34!=="4"){await terminate("attention",answers);localStorage.removeItem("questionnaire_answers");setComplete(true);return}
    setError("");await save();if(page===8){await save(true);localStorage.removeItem("questionnaire_answers");setComplete(true)}else{setPage(page+1);window.scrollTo({top:0,behavior:"smooth"})}};

  const languageSwitch=<div className="language-switch" role="group" aria-label="Language / 语言"><button className={language==="zh"?"active":""} onClick={()=>changeLanguage("zh")}>中文</button><button className={language==="en"?"active":""} onClick={()=>changeLanguage("en")}>English</button></div>;
  if(loading)return <main className="shell">{languageSwitch}<section className="card">{tr("Preparing your questionnaire…",language)}</section></main>;
  if(complete)return <main className="shell">{languageSwitch}<section className="card thanks"><div className="check">✓</div><h1>{tr("Thank you",language)}</h1><p>{tr(answers.consent==="disagree"?"You have exited the survey. No further action is required.":"Your response has been recorded successfully.",language)}</p></section></main>;
  if(!session)return <main className="shell">{languageSwitch}<section className="card"><h1>{tr("Unable to load the questionnaire",language)}</h1><p>{tr(error,language)}</p><button className="primary" onClick={()=>setLoadAttempt(x=>x+1)}>{tr("Try again",language)}</button></section></main>;
  const laptop=session.product==="laptop";
  const productHeading=tr(laptop?"Laptop Purchase":"Beverage Purchase",language);
  const scenario=tr(laptop?"Please imagine that you are thinking about buying a new laptop. It will be used mainly for study, office work, browsing the web, video meetings, and daily entertainment. Since a laptop is used for a long period of time and is not cheap, you would want to check the product information carefully.":"Please imagine that you are browsing beverages on an e-commerce or food-delivery platform, planning to buy a few bottles for daily use, or to pick up on the way to a gathering or an outing. The price is low and you would not spend long comparing options, but the packaging, brand, and overall impression may still shape your choice.",language);
  const productDescription=tr(laptop?"The Yoga Slim series focuses on a lightweight body, portable design, and strong performance, making it well suited for users who often need to work, study, or create content on the move. The product highlights a high-quality display, long battery life, stable performance, and a smart user experience, covering a wide range of use cases including everyday office tasks, online courses, video meetings, and multimedia entertainment.":"This Wanglaoji beverage features a Chinese-style themed package. The visual design incorporates traditional Chinese cultural elements such as mountains and rivers, the bright moon, flying geese, and green pines. While keeping the brand's iconic red visual identity, the packaging is given a stronger cultural feel and a sense of freshness.",language);
  const productSummary=tr(laptop?"The overall design style is clean and minimalist, positioning the laptop as a lightweight, high-performance option for consumers who want to balance appearance, performance, and portability.":"It suits everyday drinking, group meals, and on-the-go occasions, and also works as a beverage choice for festival or Chinese-themed events.",language);

  return <main className="shell">{languageSwitch}<header className="masthead"><div><span className="eyebrow">{tr("Academic research questionnaire",language)}</span><h1>{tr("Consumer Response to Online Product Descriptions",language)}</h1></div>{session.pilot?<span className="pilot">{tr("Pilot mode",language)}</span>:null}</header>
    <div className="progress"><div style={{width:`${((page+1)/9)*100}%`}}/><span>{language==="zh"?`第 ${page+1} 部分，共 9 部分`:`Section ${page+1} of 9`}</span></div>
    <section className="card">
      {page===0&&<><h2>{tr("Participant Information and Consent",language)}</h2><p>{tr("Thank you for your interest in this study. Before you begin, please read the following information carefully.",language)}</p><p>{tr("This survey is part of an academic research project on consumer responses to online product descriptions. Your participation is entirely voluntary, and you may withdraw at any time without consequence.",language)}</p><p>{tr("All responses are anonymous and will be used solely for academic research. You must be at least 18 years old to participate.",language)}</p><Choice name="consent" value={answers.consent} setAnswer={setAnswer} options={[["agree","I confirm I am at least 18 years old and agree to participate."],["disagree","I do not agree to participate."]]}/></>}
      {page===1&&<><div className="question first-question"><b>{tr("Q1. What is your age?",language)}</b><Choice name="q1" value={answers.q1} setAnswer={setAnswer} options={[["under18","Under 18"],["18-25","18–25"],["26-35","26–35"],["36-45","36–45"],["46+","46 and above"]]}/></div><div className="question"><b>{tr("Q2. Do you usually browse or shop on e-commerce platforms?",language)}</b><Choice name="q2" value={answers.q2} setAnswer={setAnswer} options={[["frequently","Frequently"],["occasionally","Occasionally"],["rarely","Rarely"],["almost_never","Almost never"]]}/></div><div className="question"><b>{tr("Q3. In the past six months, have you browsed laptops, digital products, or food/beverage products online?",language)}</b><Choice name="q3" value={answers.q3} setAnswer={setAnswer} options={[["yes","Yes"],["no","No"],["not_sure","Not sure"]]}/></div></>}
      {page===2&&<><h2>{productHeading}</h2><p>{scenario}</p><article className="product"><span className="product-type">{tr(laptop?"Portable computing":"Everyday beverage",language)}</span><h3>{tr(laptop?"Lenovo Yoga Slim Series Laptop":"Wanglaoji Chinese-Style Themed Beverage",language)}</h3><img className="product-image" src={laptop?"/product-laptop.jpg":"/product-beverage.jpg"} alt={language==="zh"?(laptop?"联想 Yoga Slim 系列笔记本电脑":"王老吉国风主题饮料包装"):(laptop?"Lenovo Yoga Slim series laptop":"Wanglaoji Chinese-style themed beverage packaging")}/>{session.ai_disclosure?<aside>{tr("Note: The product description on this page was created with the assistance of AI.",language)}</aside>:null}<p>{productDescription}</p><p>{productSummary}</p></article><Scale n={4} text="How much do you think the purchase decision for the product you just saw calls for careful consideration?" value={answers.q4} setAnswer={setAnswer} left="Not at all" right="Very much"/><Scale n={5} text="If you were actually going to buy this kind of product, how likely would you be to compare several brands before deciding?" value={answers.q5} setAnswer={setAnswer} left="Not likely at all" right="Definitely would"/></>}
      {page>=3&&page<=5&&<><p>{tr("There are no right or wrong answers. For each item, 1 = Strongly disagree and 7 = Strongly agree.",language)}</p><div className="scale-section">{ratingItems.slice((page-3)*10,(page-3)*10+10).map((text,index)=>{const n=6+(page-3)*10+index;return <Scale key={n} n={n} text={text} value={answers[`q${n}`]} setAnswer={setAnswer}/>})}</div></>}
      {page===6&&<><Scale n={34} text="To confirm that you are reading the questions carefully, please select 4." value={answers.q34} setAnswer={setAnswer}/><div className="question"><b>{tr("Q35. Which of the following best describes the information presented on the product page?",language)}</b><Choice name="q35" value={answers.q35} setAnswer={setAnswer} options={[["ai_used","The page stated that AI was used to create the product description."],["no_information","The page did not provide any information about whether AI was used to create the product description."],["do_not_remember","I do not remember."]]}/></div></>}
      {page===7&&<><Scale n={36} text="In general, you have a positive attitude toward AI technology." value={answers.q36} setAnswer={setAnswer}/><Scale n={37} text="You usually try out AI-related tools or services." value={answers.q37} setAnswer={setAnswer}/><Scale n={38} text="How familiar are you with the brand you just saw?" value={answers.q38} setAnswer={setAnswer} left="Not familiar at all" right="Very familiar"/><div className="question"><b>{tr("Q39. Have you bought this kind of product before?",language)}</b><Choice name="q39" value={answers.q39} setAnswer={setAnswer} options={[["yes","Yes, I have"],["no","No, I have not"],["not_sure","Not sure"]]}/></div><Scale n={40} text="When you shop for this kind of product, do you usually read the product detail page?" value={answers.q40} setAnswer={setAnswer} left="Almost never read it" right="Read it carefully"/></>}
      {page===8&&<>{([
        ["q41","Q41. Gender",[["male","Male"],["female","Female"],["other","Other / Prefer not to say"]]],
        ["q42","Q42. Highest education completed",[["high_school","High school or below"],["associate","Associate degree"],["bachelor","Bachelor's degree"],["master_plus","Master's degree or above"]]],
        ["q43","Q43. Current status",[["student","Student"],["employee","Company employee"],["freelancer","Freelancer"],["not_employed","Currently not employed"],["other","Other"]]],
        ["q44","Q44. Approximate monthly disposable income",[["under3000","Below 3,000 RMB"],["3000_5999","3,000–5,999 RMB"],["6000_9999","6,000–9,999 RMB"],["10000_plus","10,000 RMB and above"],["prefer_not","Prefer not to say"]]],
      ] as [string,string,[string,string][]][]).map(([name,label,options])=><div className="question" key={name}><b>{tr(label,language)}</b><Choice name={name} value={answers[name]} setAnswer={setAnswer} options={options}/></div>)}</>}
      {error&&<p className="error" role="alert">{error}</p>}<footer className="actions">{page>0?<button className="secondary" onClick={()=>{setError("");setPage(page-1);window.scrollTo(0,0)}}>{tr("Back",language)}</button>:<span/>}<button className="primary" onClick={next}>{tr(page===8?"Submit response":"Continue",language)}</button></footer>
    </section><p className="privacy">{tr("Anonymous academic research · Your assigned survey version remains fixed",language)}</p></main>;
}


