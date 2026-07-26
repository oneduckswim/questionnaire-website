const HEADERS = [
  "id", "condition", "product", "ai_disclosure", "pilot", "started_at",
  "completed_at", "status", "duration_seconds", "attention_passed",
  "manipulation_passed", "answers_json",
];

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function onRequest({ request }) {
  const url = new URL(request.url);
  if (!ADMIN_EXPORT_KEY || url.searchParams.get("key") !== ADMIN_EXPORT_KEY) {
    return new Response("Not authorized", { status: 401 });
  }

  const records = [];
  let cursor = "";
  let complete = false;
  while (!complete) {
    const page = await questionnaire_kv.list({ prefix: "response:", cursor, limit: 100 });
    const keys = Array.isArray(page?.keys) ? page.keys : [];
    const values = await Promise.all(keys.map((item) => questionnaire_kv.get(item.key)));
    for (const value of values) if (value) records.push(JSON.parse(value));
    if (keys.length) cursor = keys[keys.length - 1].key || "";
    complete = Boolean(page?.complete) || keys.length === 0;
  }
  records.sort((a, b) => String(a.started_at).localeCompare(String(b.started_at)));
  const rows = records.map((record) => {
    const flat = { ...record, answers_json: JSON.stringify(record.answers || {}) };
    return HEADERS.map((header) => csvCell(flat[header])).join(",");
  });
  const csv = `\uFEFF${[HEADERS.join(","), ...rows].join("\n")}`;
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=questionnaire-responses.csv",
      "cache-control": "no-store",
    },
  });
}
