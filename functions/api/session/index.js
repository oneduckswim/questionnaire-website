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
    let allocationMethod;
    if (body.pilot && CONDITIONS.includes(body.forcedCondition)) {
      condition = body.forcedCondition;
      allocationMethod = "forced-pilot";
    } else {
      const counterKey = `assignment:${body.pilot ? "pilot" : "main"}`;
      const current = Number(await questionnaire_kv.get(counterKey)) || 0;
      const blockKey = `${counterKey}:block:${Math.floor(current / CONDITIONS.length)}`;
      let block = JSON.parse(await questionnaire_kv.get(blockKey) || "null");
      if (!Array.isArray(block) || block.length !== CONDITIONS.length) {
        block = [...CONDITIONS];
        for (let index = block.length - 1; index > 0; index -= 1) {
          const swapIndex = crypto.getRandomValues(new Uint32Array(1))[0] % (index + 1);
          [block[index], block[swapIndex]] = [block[swapIndex], block[index]];
        }
        await questionnaire_kv.put(blockKey, JSON.stringify(block));
      }
      condition = block[current % CONDITIONS.length];
      allocationMethod = "randomized-block-4";
      await questionnaire_kv.put(counterKey, String(current + 1));
    }

    const id = crypto.randomUUID();
    const record = {
      id,
      condition,
      product: condition.startsWith("laptop") ? "laptop" : "beverage",
      ai_disclosure: condition === "laptop_ai" || condition === "beverage_ai" ? 1 : 0,
      allocation_method: allocationMethod,
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
