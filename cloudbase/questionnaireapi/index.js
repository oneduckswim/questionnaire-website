const http = require("http");
const crypto = require("crypto");
const cloudbase = require("@cloudbase/node-sdk");

const app = cloudbase.init({
  env: process.env.TCB_ENV || cloudbase.SYMBOL_CURRENT_ENV,
});
const db = app.database();
const responses = db.collection("responses");
const CONDITIONS = ["laptop_ai", "laptop_no_ai", "beverage_ai", "beverage_no_ai"];
const ADMIN_TOKEN_TTL_SECONDS = 8 * 60 * 60;
const loginAttempts = new Map();

function send(res, status, value) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "access-control-allow-origin": process.env.ADMIN_ORIGIN || "*",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-allow-methods": "GET, POST, PUT, OPTIONS",
  });
  res.end(JSON.stringify(value));
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function tokenSecret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

function createAdminToken() {
  const payload = Buffer.from(JSON.stringify({
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + ADMIN_TOKEN_TTL_SECONDS,
    nonce: crypto.randomBytes(12).toString("hex"),
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function isAdmin(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !tokenSecret()) return false;
  const expected = crypto.createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
  if (!safeEqual(signature, expected)) return false;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return value.role === "admin" && Number(value.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function clientKey(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0];
}

function canAttemptLogin(req) {
  const key = clientKey(req);
  const now = Date.now();
  const current = loginAttempts.get(key) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > current.resetAt) {
    loginAttempts.set(key, { count: 0, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  return current.count < 10;
}

function recordFailedLogin(req) {
  const key = clientKey(req);
  const now = Date.now();
  const current = loginAttempts.get(key) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  current.count += 1;
  loginAttempts.set(key, current);
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
  const document = result.data?.[0] || null;
  return document?.data?.id ? document.data : document;
}

async function chooseCondition(pilot, forcedCondition) {
  if (pilot && CONDITIONS.includes(forcedCondition)) {
    return {
      condition: forcedCondition,
      method: "forced-pilot",
      counts: null,
    };
  }

  const allocationCounts = await Promise.all(
    CONDITIONS.map(async (condition) => {
      const result = await responses.where({ pilot: pilot ? 1 : 0, condition }).count();
      return { condition, count: Number(result.total) || 0 };
    })
  );

  // Strongly keep the four groups near 25%: allocate to a currently
  // least-filled group, then randomly break ties so the next condition
  // cannot be predicted from a fixed A-B-C-D sequence.
  const minimum = Math.min(...allocationCounts.map((item) => item.count));
  const candidates = allocationCounts.filter((item) => item.count === minimum);
  const selected = candidates[crypto.randomInt(candidates.length)];

  return {
    condition: selected.condition,
    method: "least-filled-random-tie",
    counts: Object.fromEntries(
      allocationCounts.map((item) => [item.condition, item.count])
    ),
  };
}

async function createSession(req, res) {
  const body = await readJson(req);
  const existing = await findResponse(body.id);
  if (existing) return send(res, 200, existing);

  const pilot = Boolean(body.pilot);
  const allocation = await chooseCondition(pilot, body.forcedCondition);
  const condition = allocation.condition;
  const id = crypto.randomUUID();
  const record = {
    id,
    condition,
    product: condition.startsWith("laptop") ? "laptop" : "beverage",
    ai_disclosure: condition === "laptop_ai" || condition === "beverage_ai" ? 1 : 0,
    pilot: pilot ? 1 : 0,
    started_at: new Date().toISOString(),
    completed_at: null,
    status: "in_progress",
    duration_seconds: null,
    attention_passed: null,
    manipulation_passed: null,
    invalid_reason: null,
    allocation_method: allocation.method,
    allocation_counts: allocation.counts,
    answers: {},
  };
  await responses.doc(id).set(record);
  return send(res, 200, record);
}

async function adminLogin(req, res) {
  if (!process.env.ADMIN_PASSWORD || !tokenSecret()) {
    return send(res, 503, { error: "Admin login is not configured" });
  }
  if (!canAttemptLogin(req)) return send(res, 429, { error: "Too many attempts. Try again later." });
  const body = await readJson(req);
  if (!safeEqual(body.password, process.env.ADMIN_PASSWORD)) {
    recordFailedLogin(req);
    return send(res, 401, { error: "Incorrect password" });
  }
  loginAttempts.delete(clientKey(req));
  return send(res, 200, { token: createAdminToken(), expiresIn: ADMIN_TOKEN_TTL_SECONDS });
}

async function loadAllResponses() {
  const all = [];
  const batchSize = 100;
  for (let offset = 0; offset < 10000; offset += batchSize) {
    const result = await responses.skip(offset).limit(batchSize).get();
    const batch = (result.data || []).map((document) => document?.data?.id ? document.data : document);
    all.push(...batch);
    if (batch.length < batchSize) break;
  }
  return all;
}

async function adminData(req, res) {
  if (!isAdmin(req)) return send(res, 401, { error: "Admin sign-in required" });
  const records = (await loadAllResponses()).map((record) => ({
    condition: record.condition,
    product: record.product,
    ai_disclosure:
      record.condition === "laptop_ai" || record.condition === "beverage_ai" ? 1 : 0,
    pilot: Number(record.pilot) || 0,
    started_at: record.started_at || null,
    completed_at: record.completed_at || null,
    status: record.status || "in_progress",
    duration_seconds: record.duration_seconds,
    attention_passed: record.attention_passed,
    manipulation_passed: record.manipulation_passed,
    invalid_reason: record.invalid_reason,
    answers: record.answers || {},
  }));
  return send(res, 200, { generatedAt: new Date().toISOString(), records });
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
  await responses.doc(body.id).update(update);
  return send(res, 200, { ok: true, completedAt });
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname.replace(/\/+$/, "");
    if (req.method === "OPTIONS") return send(res, 204, {});
    if (req.method === "GET" && (pathname === "" || pathname.endsWith("/health"))) {
      return send(res, 200, { ok: true });
    }
    if (req.method === "POST" && pathname.endsWith("/admin/login")) return await adminLogin(req, res);
    if (req.method === "GET" && pathname.endsWith("/admin/data")) return await adminData(req, res);
    if (req.method === "POST" && pathname.endsWith("/session")) return await createSession(req, res);
    if (req.method === "PUT" && pathname.endsWith("/response")) return await saveResponse(req, res);
    return send(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: "Questionnaire service error" });
  }
});

server.listen(process.env.PORT || 9000, "0.0.0.0");
