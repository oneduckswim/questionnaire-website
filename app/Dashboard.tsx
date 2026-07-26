"use client";

import { useEffect, useMemo, useState } from "react";

type Lang = "zh" | "en";
type Row = {
  condition: string;
  product: string;
  ai_disclosure: number;
  pilot: number;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  duration_seconds: number | null;
  attention_passed: number | null;
  manipulation_passed: number | null;
  invalid_reason: string | null;
  answers: Record<string, string>;
};

const CONDITIONS = ["laptop_ai", "laptop_no_ai", "beverage_ai", "beverage_no_ai"];
const CONDITION_LABELS: Record<string, string> = {
  laptop_ai: "Laptop · AI",
  laptop_no_ai: "Laptop · No AI",
  beverage_ai: "Beverage · AI",
  beverage_no_ai: "Beverage · No AI",
};
const QUESTIONS: Record<string, { zh: string; en: string }> = {
  consent: { zh: "知情同意", en: "Consent" },
  q1: { zh: "年龄", en: "Age" },
  q2: { zh: "电商使用频率", en: "E-commerce usage" },
  q3: { zh: "近期产品浏览", en: "Recent product browsing" },
  q4: { zh: "购买参与度", en: "Purchase involvement" },
  q5: { zh: "品牌比较", en: "Brand comparison" },
  ...Object.fromEntries(
    Array.from({ length: 28 }, (_, i) => {
      const en = ["Competence", "Novelty", "Authenticity", "Humanness", "Legitimacy", "Trust", "Purchase intention"][Math.floor(i / 4)];
      const zh = ["能力感知", "新颖性", "真实性", "人性化", "合法性", "信任", "购买意愿"][Math.floor(i / 4)];
      return [`q${i + 6}`, { zh: `${zh} ${i % 4 + 1}`, en: `${en} ${i % 4 + 1}` }];
    }),
  ),
  q34: { zh: "注意力检查", en: "Attention check" },
  q35: { zh: "操纵检查", en: "Manipulation check" },
  q36: { zh: "AI 态度", en: "AI attitude" },
  q37: { zh: "AI 工具使用", en: "AI tool usage" },
  q38: { zh: "品牌熟悉度", en: "Brand familiarity" },
  q39: { zh: "既往购买", en: "Previous purchase" },
  q40: { zh: "详情页阅读", en: "Detail-page reading" },
  q41: { zh: "性别", en: "Gender" },
  q42: { zh: "教育程度", en: "Education" },
  q43: { zh: "当前身份", en: "Current status" },
  q44: { zh: "可支配收入", en: "Disposable income" },
};
const ANSWERS: Record<string, { zh: string; en: string }> = {
  agree: { zh: "同意", en: "Agree" }, disagree: { zh: "不同意", en: "Disagree" },
  under18: { zh: "18 岁以下", en: "Under 18" }, "18-25": { zh: "18–25", en: "18–25" },
  "26-35": { zh: "26–35", en: "26–35" }, "36-45": { zh: "36–45", en: "36–45" }, "46+": { zh: "46+", en: "46+" },
  frequently: { zh: "经常", en: "Frequently" }, occasionally: { zh: "偶尔", en: "Occasionally" },
  rarely: { zh: "很少", en: "Rarely" }, almost_never: { zh: "几乎从不", en: "Almost never" },
  yes: { zh: "是", en: "Yes" }, no: { zh: "否", en: "No" }, not_sure: { zh: "不确定", en: "Not sure" },
  ai_used: { zh: "声明使用 AI", en: "AI stated" }, no_information: { zh: "未提供 AI 信息", en: "No AI information" },
  do_not_remember: { zh: "不记得", en: "Do not remember" }, male: { zh: "男", en: "Male" },
  female: { zh: "女", en: "Female" }, other: { zh: "其他／不愿透露", en: "Other / Prefer not" },
  high_school: { zh: "高中及以下", en: "High school or below" }, associate: { zh: "专科", en: "Associate" },
  bachelor: { zh: "本科", en: "Bachelor" }, master_plus: { zh: "硕士及以上", en: "Master+" },
  student: { zh: "学生", en: "Student" }, employee: { zh: "雇员", en: "Employee" },
  freelancer: { zh: "自由职业", en: "Freelancer" }, not_employed: { zh: "未就业", en: "Not employed" },
  under3000: { zh: "3,000 以下", en: "< 3,000" }, "3000_5999": { zh: "3,000–5,999", en: "3,000–5,999" },
  "6000_9999": { zh: "6,000–9,999", en: "6,000–9,999" }, "10000_plus": { zh: "10,000+", en: "10,000+" },
  prefer_not: { zh: "不愿透露", en: "Prefer not" }, completed: { zh: "已完成", en: "Completed" },
  invalid: { zh: "作废", en: "Invalid" }, in_progress: { zh: "进行中", en: "In progress" },
  passed: { zh: "通过", en: "Passed" }, failed: { zh: "未通过", en: "Failed" },
  not_recorded: { zh: "未记录", en: "Not recorded" }, underage: { zh: "未满 18 岁", en: "Under age" },
  attention: { zh: "注意力检查", en: "Attention check" }, not_invalid: { zh: "未作废", en: "Not invalid" },
};
const COPY = {
  zh: {
    subtitle: "问卷数据的安全可视化后台", username: "用户名", password: "密码", login: "登录后台",
    logging: "正在登录…", loginFail: "登录失败", security: "数据仅在当前浏览器本地分析，本站不会上传或储存参与者数据。",
    overview: "总览", questions: "逐题分析", crosstab: "身份交叉", quality: "数据质量", logout: "退出登录",
    titles: { overview: "研究数据总览", questions: "逐题选择率", crosstab: "身份交叉分析", quality: "数据质量检查" },
    import: "导入腾讯云 JSON", export: "导出当前数据", status: "样本状态", condition: "实验条件", dataType: "数据类型",
    all: "全部", completedOnly: "仅完成", invalidOnly: "仅作废", progressOnly: "进行中", main: "正式数据",
    pilot: "预测试", prompt: "请先导入腾讯云导出的 JSON 文件", imported: "本地导入于", records: "全部记录",
    currentRange: "当前筛选范围", completed: "完成问卷", invalid: "作废记录", avgTime: "平均用时", timedOnly: "仅含已计时记录",
    allocation: "四组样本分配", responseStatus: "答题状态", selectQuestion: "选择题目", answered: "人已回答",
    identity: "身份变量", compare: "对比题目", total: "总计", noData: "暂无数据", noCrosstab: "暂无可交叉分析的数据",
    attention: "注意力检查", manipulation: "操纵检查", invalidReason: "作废原因", shortDuration: "异常短时长",
    under60: "少于 60 秒完成", threshold: "正式分析前请预先确定阈值", importFail: "导入失败",
    noRecords: "文件中没有可识别的问卷记录", language: "English",
  },
  en: {
    subtitle: "Secure questionnaire analytics dashboard", username: "Username", password: "Password", login: "Sign in",
    logging: "Signing in…", loginFail: "Sign-in failed", security: "Data is analyzed locally in this browser and is never uploaded or stored by this site.",
    overview: "Overview", questions: "Questions", crosstab: "Demographics", quality: "Data quality", logout: "Sign out",
    titles: { overview: "Research overview", questions: "Response rates by question", crosstab: "Demographic cross-tabulation", quality: "Data quality checks" },
    import: "Import Tencent JSON", export: "Export filtered data", status: "Response status", condition: "Experimental condition", dataType: "Dataset",
    all: "All", completedOnly: "Completed only", invalidOnly: "Invalid only", progressOnly: "In progress only", main: "Main study",
    pilot: "Pilot", prompt: "Import the JSON file exported from Tencent Cloud", imported: "Imported locally at", records: "All records",
    currentRange: "Current filtered sample", completed: "Completed", invalid: "Invalid records", avgTime: "Average duration", timedOnly: "Timed responses only",
    allocation: "Allocation across four conditions", responseStatus: "Response status", selectQuestion: "Select question", answered: "answered",
    identity: "Demographic variable", compare: "Outcome question", total: "Total", noData: "No data available", noCrosstab: "No data available for cross-tabulation",
    attention: "Attention check", manipulation: "Manipulation check", invalidReason: "Invalidation reason", shortDuration: "Implausibly short duration",
    under60: "Completed in under 60 seconds", threshold: "Predefine the threshold before the main analysis", importFail: "Import failed",
    noRecords: "No recognizable questionnaire records were found", language: "中文",
  },
};

const pct = (n: number, d: number) => d ? `${(n * 100 / d).toFixed(1)}%` : "0.0%";
const counts = (rows: Row[], fn: (r: Row) => string) => rows.reduce<Record<string, number>>((o, r) => {
  const key = fn(r); o[key] = (o[key] || 0) + 1; return o;
}, {});

function Bars({ data, total, lang, amber = false }: { data: Record<string, number>; total: number; lang: Lang; amber?: boolean }) {
  const items = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return items.length ? <>{items.map(([key, value]) =>
    <div className="bar-row" key={key}>
      <span>{ANSWERS[key]?.[lang] || CONDITION_LABELS[key] || key}</span>
      <div className="bar-track"><div className={`bar-fill ${amber ? "amber" : ""}`} style={{ width: `${total ? value * 100 / total : 0}%` }} /></div>
      <span className="bar-value">{value} · {pct(value, total)}</span>
    </div>)}</> : <div className="empty">{COPY[lang].noData}</div>;
}
function Metric({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

export default function Dashboard() {
  const [lang, setLang] = useState<Lang>("zh");
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [view, setView] = useState("overview");
  const [status, setStatus] = useState("all");
  const [condition, setCondition] = useState("all");
  const [pilot, setPilot] = useState("main");
  const [updated, setUpdated] = useState("");
  const [question, setQuestion] = useState("q1");
  const [identity, setIdentity] = useState("q1");
  const [outcome, setOutcome] = useState("q30");
  const t = COPY[lang];

  useEffect(() => {
    const savedToken = sessionStorage.getItem("qi_token");
    const savedLang = localStorage.getItem("qi_lang");
    if (savedToken) setToken(savedToken);
    if (savedLang === "zh" || savedLang === "en") setLang(savedLang);
  }, []);
  function switchLanguage() {
    const next = lang === "zh" ? "en" : "zh";
    setLang(next); localStorage.setItem("qi_lang", next);
  }
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || t.loginFail);
      sessionStorage.setItem("qi_token", value.token); setToken(value.token);
    } catch { setError(t.loginFail); } finally { setBusy(false); }
  }
  const filtered = useMemo(() => rows.filter(r =>
    (status === "all" || r.status === status) &&
    (condition === "all" || r.condition === condition) &&
    (pilot === "all" || (pilot === "pilot" ? +r.pilot === 1 : +r.pilot === 0))
  ), [rows, status, condition, pilot]);
  function logout() { sessionStorage.removeItem("qi_token"); setToken(""); setRows([]); setPassword(""); }
  async function importFile(file: File) {
    setError("");
    try {
      const trimmed = (await file.text()).trim();
      const raw: unknown[] = trimmed.startsWith("[") ? JSON.parse(trimmed) : trimmed.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
      const parsed = raw.map((item: any) => item?.data?.id ? item.data : item)
        .filter((item: any) => item && item.condition && item.answers)
        .map((item: any) => ({ ...item, ai_disclosure: item.condition === "laptop_ai" || item.condition === "beverage_ai" ? 1 : 0 }));
      if (!parsed.length) throw new Error(t.noRecords);
      setRows(parsed); setUpdated(new Date().toLocaleString(lang === "zh" ? "zh-CN" : "en-GB"));
    } catch (e) { setRows([]); setError(`${t.importFail}: ${e instanceof Error ? e.message : ""}`); }
  }
  function exportCsv() {
    const keys = ["condition", "product", "ai_disclosure", "pilot", "status", "started_at", "completed_at", "duration_seconds", "attention_passed", "manipulation_passed", "invalid_reason", "consent", ...Array.from({ length: 44 }, (_, i) => `q${i + 1}`)];
    const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [keys.join(","), ...filtered.map(r => keys.map(key => quote(Object.prototype.hasOwnProperty.call(r, key) ? r[key as keyof Row] : r.answers?.[key])).join(","))].join("\n");
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    anchor.download = `questionnaire-data-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(anchor.href);
  }

  if (!token) return <main className="login-shell">
    <button className="language-toggle login-language" onClick={switchLanguage}>{t.language}</button>
    <section className="login-card"><div className="brand-mark">QI</div><p className="eyebrow">RESEARCH OPERATIONS</p>
      <h1>Questionnaire Insights</h1><p className="lede">{t.subtitle}</p>
      <form onSubmit={login}><label>{t.username}</label><input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required />
        <label>{t.password}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
        <button disabled={busy}>{busy ? t.logging : t.login}</button><p className="error">{error}</p></form>
      <p className="security-note">{t.security}</p></section></main>;

  const completed = filtered.filter(r => r.status === "completed").length;
  const invalid = filtered.filter(r => r.status === "invalid").length;
  const durations = filtered.map(r => Number(r.duration_seconds)).filter(n => n > 0);
  const average = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const answered = filtered.filter(r => r.answers?.[question] != null);
  const identities = [...new Set(filtered.map(r => r.answers?.[identity]).filter(Boolean))];
  const outcomes = [...new Set(filtered.map(r => r.answers?.[outcome]).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const q = (key: string) => QUESTIONS[key]?.[lang] || key;

  return <main className="dashboard"><aside className="sidebar"><div className="logo-row"><span className="brand-mark small">QI</span><strong>Questionnaire<br />Insights</strong></div>
    <nav>{[["overview", t.overview], ["questions", t.questions], ["crosstab", t.crosstab], ["quality", t.quality]].map(([id, label]) =>
      <button key={id} className={`nav-item ${view === id ? "active" : ""}`} onClick={() => setView(id)}>{label}</button>)}</nav>
    <button className="logout" onClick={logout}>{t.logout}</button></aside>
    <section className="workspace"><header className="topbar"><div><p className="eyebrow">2 × 2 EXPERIMENT</p><h1>{t.titles[view as keyof typeof t.titles]}</h1></div>
      <div className="top-actions"><button className="language-toggle" onClick={switchLanguage}>{t.language}</button>
        <label className="import-button">{t.import}<input type="file" accept=".json,application/json" onChange={e => e.target.files?.[0] && importFile(e.target.files[0])} /></label>
        <button onClick={exportCsv} disabled={!rows.length}>{t.export}</button></div></header>
      <section className="filters"><label>{t.status}<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">{t.all}</option><option value="completed">{t.completedOnly}</option><option value="invalid">{t.invalidOnly}</option><option value="in_progress">{t.progressOnly}</option></select></label>
        <label>{t.condition}<select value={condition} onChange={e => setCondition(e.target.value)}><option value="all">{t.all}</option>{CONDITIONS.map(c => <option key={c} value={c}>{CONDITION_LABELS[c]}</option>)}</select></label>
        <label>{t.dataType}<select value={pilot} onChange={e => setPilot(e.target.value)}><option value="main">{t.main}</option><option value="pilot">{t.pilot}</option><option value="all">{t.all}</option></select></label>
        <span className="updated">{updated ? `${t.imported} ${updated}` : t.prompt}</span></section>{error && <p className="error">{error}</p>}
      {view === "overview" && <><section className="metrics"><Metric label={t.records} value={filtered.length} note={t.currentRange} /><Metric label={t.completed} value={completed} note={pct(completed, filtered.length)} /><Metric label={t.invalid} value={invalid} note={pct(invalid, filtered.length)} /><Metric label={t.avgTime} value={average ? `${Math.floor(average / 60)}m ${average % 60}s` : "—"} note={t.timedOnly} /></section>
        <section className="grid-2"><article className="panel"><h2>{t.allocation}</h2><Bars data={counts(filtered, r => r.condition)} total={filtered.length} lang={lang} /></article><article className="panel"><h2>{t.responseStatus}</h2><Bars data={counts(filtered, r => r.status)} total={filtered.length} lang={lang} amber /></article></section></>}
      {view === "questions" && <article className="panel"><div className="toolbar"><label>{t.selectQuestion}<select value={question} onChange={e => setQuestion(e.target.value)}>{Object.keys(QUESTIONS).map(key => <option key={key} value={key}>{key.toUpperCase()} · {q(key)}</option>)}</select></label><span className="pill">{answered.length} {t.answered}</span></div><h2>{question.toUpperCase()} · {q(question)}</h2><Bars data={counts(answered, r => String(r.answers[question]))} total={answered.length} lang={lang} /></article>}
      {view === "crosstab" && <article className="panel"><div className="toolbar"><label>{t.identity}<select value={identity} onChange={e => setIdentity(e.target.value)}>{["q1", "q41", "q42", "q43", "q44"].map(key => <option key={key} value={key}>{q(key)}</option>)}</select></label>
        <label>{t.compare}<select value={outcome} onChange={e => setOutcome(e.target.value)}>{Object.keys(QUESTIONS).filter(key => key !== "consent").map(key => <option key={key} value={key}>{key.toUpperCase()} · {q(key)}</option>)}</select></label></div>
        <h2>{q(identity)} × {q(outcome)}</h2>{identities.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>{q(identity)}</th>{outcomes.map(value => <th key={value}>{ANSWERS[value]?.[lang] || value}</th>)}<th>{t.total}</th></tr></thead>
          <tbody>{identities.map(identityValue => { const group = filtered.filter(r => r.answers?.[identity] === identityValue && r.answers?.[outcome] != null); const groupCounts = counts(group, r => r.answers[outcome]); return <tr key={identityValue}><td><strong>{ANSWERS[identityValue]?.[lang] || identityValue}</strong></td>{outcomes.map(value => <td key={value}>{groupCounts[value] || 0} <small>({pct(groupCounts[value] || 0, group.length)})</small></td>)}<td>{group.length}</td></tr>; })}</tbody></table></div> : <div className="empty">{t.noCrosstab}</div>}</article>}
      {view === "quality" && <section className="grid-2"><article className="panel"><h2>{t.attention}</h2><Bars data={counts(filtered, r => r.attention_passed == null ? "not_recorded" : r.attention_passed ? "passed" : "failed")} total={filtered.length} lang={lang} /></article>
        <article className="panel"><h2>{t.manipulation}</h2><Bars data={counts(filtered, r => r.manipulation_passed == null ? "not_recorded" : r.manipulation_passed ? "passed" : "failed")} total={filtered.length} lang={lang} /></article>
        <article className="panel"><h2>{t.invalidReason}</h2><Bars data={counts(filtered, r => r.invalid_reason || "not_invalid")} total={filtered.length} lang={lang} /></article>
        <article className="panel"><h2>{t.shortDuration}</h2><Metric label={t.under60} value={filtered.filter(r => Number(r.duration_seconds) > 0 && Number(r.duration_seconds) < 60).length} note={t.threshold} /></article></section>}
    </section></main>;
}
