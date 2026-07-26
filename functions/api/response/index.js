function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8", "cache-control": "no-store" },
  });
}

export async function onRequest({ request }) {
  if (request.method !== "PUT") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await request.json();
    const key = `response:${body.id}`;
    const stored = await questionnaire_kv.get(key);
    if (!stored) return json({ error: "Unknown response" }, 404);

    const record = JSON.parse(stored);
    const completedAt = body.completed ? new Date().toISOString() : null;
    const expected = record.ai_disclosure ? "ai_used" : "no_information";
    const updated = {
      ...record,
      answers: body.answers || {},
      status: body.completed ? "completed" : "in_progress",
      completed_at: completedAt,
      duration_seconds: body.completed
        ? Math.max(0, Math.round((Date.now() - Date.parse(record.started_at)) / 1000))
        : null,
      attention_passed: Number(body.answers?.q34) === 4 ? 1 : 0,
      manipulation_passed: body.answers?.q35 === expected ? 1 : 0,
    };
    await questionnaire_kv.put(key, JSON.stringify(updated));
    return json({ ok: true, completedAt });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Response could not be saved" }, 500);
  }
}
