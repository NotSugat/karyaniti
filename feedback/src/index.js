const allowedKinds = new Set(["suggestion", "bug", "question", "other"]);
const allowedOrigins = new Set([
  "https://karyaniti.com",
  "https://www.karyaniti.com",
  "https://karyaniti-repo.vercel.app",
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://karyaniti.com",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(request) },
  });
}

function clean(value, limit) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

async function createFeedback(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON" }, 400);
  }

  const kind = clean(body.kind, 20);
  const message = clean(body.message, 5000);
  const email = clean(body.email, 254);
  const pageUrl = clean(body.page_url, 2048);
  if (!allowedKinds.has(kind) || message.length < 3) {
    return json(request, { error: "Choose a feedback type and enter at least 3 characters." }, 400);
  }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return json(request, { error: "Enter a valid email address or leave it blank." }, 400);
  }

  await env.DB.prepare(
    "INSERT INTO feedback (kind, message, email, page_url) VALUES (?, ?, ?, ?)",
  ).bind(kind, message, email, pageUrl).run();
  return json(request, { ok: true });
}

async function listFeedback(request, env) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token !== env.ADMIN_TOKEN) return json(request, { error: "Unauthorized" }, 401);
  const result = await env.DB.prepare(
    "SELECT id, kind, message, email, page_url, created_at FROM feedback ORDER BY id DESC LIMIT 100",
  ).all();
  return json(request, { feedback: result.results });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request) });
    const path = new URL(request.url).pathname;
    try {
      if (request.method === "POST" && path === "/feedback") return await createFeedback(request, env);
      if (request.method === "GET" && path === "/feedback") return await listFeedback(request, env);
      return json(request, { error: "Not found" }, 404);
    } catch (error) {
      console.error(error);
      return json(request, { error: "Feedback service unavailable" }, 500);
    }
  },
};
