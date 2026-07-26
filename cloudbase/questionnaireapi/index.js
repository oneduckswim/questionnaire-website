const http = require("http");
const crypto = require("crypto");
const cloudbase = require("@cloudbase/node-sdk");

const app = cloudbase.init({
  env: process.env.TCB_ENV || cloudbase.SYMBOL_CURRENT_ENV,
});
const db = app.database();
const responses = db.collection("responses");
const CONDITIONS = ["laptop_ai", "laptop_no_ai", "beverage_ai", "beverage_no_ai"];

function send(res, status, value) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(value));
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1024 * 1024) throw new Error("Request is too large");
  }
  return raw ? JSON.parse(raw) : {};
}

async function findResponse(id) {
  if (!id || typeof id !== "string" || id.length > 80) return null;
  const result = await responses.doc(id).get();
  return result.data?.[0] || null;
}

async function chooseCondition(pilot, forcedCondition) {
  if (pilot && CONDITIONS.includes(forcedCondition)) return forcedCondition;
  const counts = await Promise.all(
    CONDITIONS.map(async (condition) => {
      const result = await responses.where({ pilot: pilot ? 1 : 0, condition }).count();
      return { condition, count: Number(result.total) || 0 };
    })
  );
  const minimum = Math.min(...counts.map((item) => item.count));
  const candidates = counts.filter((item) => item.count === minimum);
  return candidates[Math.floor(Math.random() * candidates.length)].condition;
}

async function createSession(req, res) {
  const body = await readJson(req);
  const existing = await findResponse(body.id);
  if (existing) return send(res, 200, existing);

  const pilot = Boolean(body.pilot);
  const condition = await chooseCondition(pilot, body.forcedCondition);
  const id = crypto.randomUUID();
  const record = {
    _id: id,
    id,
    condition,
    product: condition.startsWith("laptop") ? "laptop" : "beverage",
    ai_disclosure: condition.endsWith("_ai") ? 1 : 0,
    pilot: pilot ? 1 : 0,
    started_at: new Date().toISOString(),
    completed_at: null,
    status: "in_progress",
    duration_seconds: null,
    attention_passed: null,
    manipulation_passed: null,
    invalid_reason: null,
    answers: {},
  };
  await responses.doc(id).set({ data: record });
  return send(res, 200, record);
}

async function saveResponse(req, res) {
  const body = await readJson(req);
  const record = await findResponse(body.id);
  if (!record) return send(res, 404, { error: "Unknown response" });

  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const invalidReason =
    answers._invalid_reason === "underage" || answers._invalid_reason === "attention"
      ? answers._invalid_reason
      : null;
  const completed = Boolean(body.completed);
  const expected = record.ai_disclosure ? "ai_used" : "no_information";
  const completedAt = completed ? new Date().toISOString() : null;
  const update = {
    answers,
    status: invalidReason ? "invalid" : completed ? "completed" : "in_progress",
    completed_at: completedAt,
    duration_seconds: completed
      ? Math.max(0, Math.round((Date.now() - Date.parse(record.started_at)) / 1000))
      : null,
    attention_passed: answers.q34 == null ? null : Number(answers.q34) === 4 ? 1 : 0,
    manipulation_passed: answers.q35 == null ? null : answers.q35 === expected ? 1 : 0,
    invalid_reason: invalidReason,
  };
  await responses.doc(body.id).update({ data: update });
  return send(res, 200, { ok: true, completedAt });
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname.replace(/\/+$/, "");
    if (req.method === "GET" && (pathname === "" || pathname.endsWith("/health"))) {
      return send(res, 200, { ok: true });
    }
    if (req.method === "POST" && pathname.endsWith("/session")) return await createSession(req, res);
    if (req.method === "PUT" && pathname.endsWith("/response")) return await saveResponse(req, res);
    return send(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: "Questionnaire service error" });
  }
});

server.listen(9000, "0.0.0.0");

