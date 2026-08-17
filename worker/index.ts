/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  ADMIN_EXPORT_KEY?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      condition TEXT NOT NULL,
      product TEXT NOT NULL,
      ai_disclosure INTEGER NOT NULL,
      pilot INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      status TEXT NOT NULL DEFAULT 'in_progress',
      duration_seconds INTEGER,
      attention_passed INTEGER,
      manipulation_passed INTEGER,
      answers_json TEXT NOT NULL DEFAULT '{}'
    )`).run();

    if (url.pathname === "/api/session" && request.method === "POST") {
      const body = await request.json().catch(() => ({})) as { id?: string; pilot?: boolean; forcedCondition?: string };
      if (body.id) {
        const existing = await env.DB.prepare("SELECT * FROM responses WHERE id = ?").bind(body.id).first();
        if (existing) return Response.json(existing);
      }
      const conditions = ["laptop_ai", "laptop_no_ai", "beverage_ai", "beverage_no_ai"];
      const counts = await env.DB.prepare("SELECT condition, COUNT(*) AS count FROM responses WHERE pilot = ? GROUP BY condition")
        .bind(body.pilot ? 1 : 0).all<{ condition: string; count: number }>();
      const countMap = new Map(counts.results.map((row) => [row.condition, Number(row.count)]));
      const minimum = Math.min(...conditions.map((condition) => countMap.get(condition) ?? 0));
      const candidates = conditions.filter((condition) => (countMap.get(condition) ?? 0) === minimum);
      const forcedPilot = Boolean(
        body.pilot &&
        body.forcedCondition &&
        conditions.includes(body.forcedCondition)
      );
      const condition = forcedPilot
        ? body.forcedCondition!
        : candidates[crypto.getRandomValues(new Uint32Array(1))[0] % candidates.length];
      const id = crypto.randomUUID();
      const product = condition.startsWith("laptop") ? "laptop" : "beverage";
      const aiDisclosure = condition === "laptop_ai" || condition === "beverage_ai";
      const startedAt = new Date().toISOString();
      await env.DB.prepare("INSERT INTO responses (id, condition, product, ai_disclosure, pilot, started_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(id, condition, product, aiDisclosure ? 1 : 0, body.pilot ? 1 : 0, startedAt).run();
      return Response.json({ id, condition, product, ai_disclosure: aiDisclosure ? 1 : 0, pilot: body.pilot ? 1 : 0, started_at: startedAt });
    }

    if (url.pathname === "/api/response" && request.method === "PUT") {
      const body = await request.json() as { id: string; answers: Record<string, string>; completed?: boolean; startedAt: string };
      const assigned = await env.DB.prepare("SELECT ai_disclosure FROM responses WHERE id = ?").bind(body.id).first<{ ai_disclosure: number }>();
      if (!assigned) return new Response("Unknown response", { status: 404 });
      const expected = assigned.ai_disclosure ? "ai_used" : "no_information";
      const completedAt = body.completed ? new Date().toISOString() : null;
      const duration = body.completed ? Math.max(0, Math.round((Date.now() - Date.parse(body.startedAt)) / 1000)) : null;
      await env.DB.prepare(`UPDATE responses SET answers_json = ?, status = ?, completed_at = ?,
        duration_seconds = ?, attention_passed = ?, manipulation_passed = ? WHERE id = ?`)
        .bind(JSON.stringify(body.answers), body.completed ? "completed" : "in_progress", completedAt, duration,
          Number(body.answers.q34) === 4 ? 1 : 0, body.answers.q35 === expected ? 1 : 0, body.id).run();
      return Response.json({ ok: true, completedAt });
    }

    if (url.pathname === "/api/export" && request.method === "GET") {
      if (!env.ADMIN_EXPORT_KEY || url.searchParams.get("key") !== env.ADMIN_EXPORT_KEY) {
        return new Response("Not authorized", { status: 401 });
      }
      const rows = await env.DB.prepare("SELECT * FROM responses ORDER BY started_at").all<Record<string, unknown>>();
      const headers = ["id","condition","product","ai_disclosure","pilot","started_at","completed_at","status","duration_seconds","attention_passed","manipulation_passed","answers_json"];
      const csv = [headers.join(","), ...rows.results.map((row) => headers.map((h) => `"${String(row[h] ?? "").replaceAll('"','""')}"`).join(","))].join("\n");
      return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=questionnaire-responses.csv" } });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
