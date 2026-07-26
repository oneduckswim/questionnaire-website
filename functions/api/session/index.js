const CONDITIONS = ["laptop_ai", "laptop_no_ai", "beverage_ai", "beverage_no_ai"];

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8", "cache-control": "no-store" },
  });
}

async function readResponse(id) {
  if (!id) return null;
  const value = await questionnaire_kv.get(`response:${id}`);
  return value ? JSON.parse(value) : null;
}

export async function onRequest({ request }) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await request.json().catch(() => ({}));
    const existing = await readResponse(body.id);
    if (existing) return json(existing);

    let condition;
    if (body.pilot && CONDITIONS.includes(body.forcedCondition)) {
      condition = body.forcedCondition;
    } else {
      const counterKey = `assignment:${body.pilot ? "pilot" : "main"}`;
      const current = Number(await questionnaire_kv.get(counterKey)) || 0;
      condition = CONDITIONS[current % CONDITIONS.length];
      await questionnaire_kv.put(counterKey, String(current + 1));
    }

    const id = crypto.randomUUID();
    const record = {
      id,
      condition,
      product: condition.startsWith("laptop") ? "laptop" : "beverage",
      ai_disclosure: condition.endsWith("_ai") ? 1 : 0,
      pilot: body.pilot ? 1 : 0,
      started_at: new Date().toISOString(),
      completed_at: null,
      status: "in_progress",
      duration_seconds: null,
      attention_passed: null,
      manipulation_passed: null,
      answers: {},
    };
    await questionnaire_kv.put(`response:${id}`, JSON.stringify(record));
    return json(record);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Questionnaire storage is unavailable" }, 500);
  }
}
