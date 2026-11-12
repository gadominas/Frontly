// Frontly phone-line bridge: a Cloudflare Worker between ElevenLabs Agents (who answer the real phone number)
// and the Frontly app on the iPhone (which can't receive anything itself).
// https://github.com/gadominas/Frontly/tree/main/bridge
//
//   POST /elevenlabs/init     ElevenLabs, when a call starts: who is calling? → Reva's opening line and the patient
//   POST /elevenlabs/webhook  ElevenLabs, when a call ends: the transcript and the details Reva collected (HMAC-signed)
//   GET  /calls?since=<ms>    Frontly: finished calls since then
//   PUT  /patients            Frontly: a short list of patients (name, age, phone, last visit) for the lookup above
//   POST /calls               Frontly or any other voice service: add a call in Frontly's own shape
//   GET  /health              anyone: is it up, and which number to call
//
// Bindings (Cloudflare › Worker › Settings): KV namespace FRONTLY; secrets APP_TOKEN, EL_WEBHOOK_SECRET, INIT_TOKEN;
// plain variables PHONE_NUMBER (shown in Frontly), CLINIC_NAME, ASSISTANT_NAME, LANGUAGE ("lt" or "en").

const CALL_TTL = 30 * 24 * 3600;   // calls are kept 30 days
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const digits = (s) => String(s || "").replace(/\D/g, "");
const tail = (s) => digits(s).slice(-8);

async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// ElevenLabs-Signature: "t=<unix seconds>,v0=<hex HMAC-SHA256 of '<t>.<raw body>'>"; older than 30 minutes is refused.
async function verifyElevenLabs(req, raw, secret, now = Date.now()) {
  const h = req.headers.get("elevenlabs-signature") || "";
  const t = (h.match(/t=(\d+)/) || [])[1], v0 = (h.match(/v0=([0-9a-f]+)/) || [])[1];
  if (!t || !v0 || !secret) return false;
  if (Math.abs(now / 1000 - Number(t)) > 30 * 60) return false;
  const want = await hmacHex(secret, `${t}.${raw}`);
  if (want.length !== v0.length) return false;
  let d = 0; for (let i = 0; i < want.length; i++) d |= want.charCodeAt(i) ^ v0.charCodeAt(i);
  return d === 0;
}
const bearer = (req, token) => !!token && (req.headers.get("authorization") || "") === "Bearer " + token;

async function patientByPhone(env, phone) {
  const list = (await env.FRONTLY.get("patients", "json")) || [];
  const t = tail(phone);
  return t.length >= 6 ? list.find((p) => tail(p.phone) === t) || null : null;
}
const first = (n) => String(n || "").trim().split(/\s+/)[0] || "";

// The call starts: Reva's opening line and what she knows about the caller (ElevenLabs dynamic variables).
function opening(env, p) {
  const clinic = env.CLINIC_NAME || "Northlight Dental", a = env.ASSISTANT_NAME || "Reva";
  if ((env.LANGUAGE || "en") === "lt") return p ? `Labas, skambinate į ${clinic}, aš ${a}. Ar tai ${first(p.name)}?` : `Labas, skambinate į ${clinic}, aš ${a}. Gal galite pasakyti savo vardą ir pavardę?`;
  return p ? `Hello, you've reached ${clinic}, this is ${a}. Am I speaking with ${first(p.name)}?` : `Hello, you've reached ${clinic}, this is ${a}. May I have your full name, please?`;
}
async function onInit(req, env) {
  if (!env.INIT_TOKEN || req.headers.get("x-frontly-token") !== env.INIT_TOKEN) return json({ error: "unauthorized" }, 401);
  const b = await req.json().catch(() => ({}));
  const p = await patientByPhone(env, b.caller_id);
  return json({
    type: "conversation_initiation_client_data",
    dynamic_variables: {   // every variable the agent defines must be here, known patient or not
      opening: opening(env, p),
      patient_known: p ? "yes" : "no",
      patient_name: p ? p.name : "",
      patient_age: p && p.age ? String(p.age) : "",
      patient_history: p ? (p.history || "") : "",
      caller_number: String(b.caller_id || ""),
    },
  });
}

// The call ends: ElevenLabs' transcript and data collection → one call in Frontly's shape.
const DC_NUM = { age: [0, 120], pain: [0, 10], urgency: [1, 5] };
function fromElevenLabs(ev) {
  const d = ev.data || {}, m = d.metadata || {}, a = d.analysis || {}, dc = a.data_collection_results || {};
  const dv = ((d.conversation_initiation_client_data || {}).dynamic_variables) || {};
  const pc = m.phone_call || {};
  const val = (k) => { const x = dc[k]; const v = x && typeof x === "object" && "value" in x ? x.value : x; return v == null || v === "" ? null : v; };
  const fields = {};
  for (const k of ["name", "age", "complaint", "location", "pain", "urgency", "preferred", "notes"]) {
    let v = val(k);
    if (v != null && DC_NUM[k]) { v = Math.round(Number(v)); if (!isFinite(v) || v < DC_NUM[k][0] || v > DC_NUM[k][1]) v = null; }
    fields[k] = v == null ? null : typeof v === "string" ? v.slice(0, 300) : v;
  }
  const start = (m.start_time_unix_secs || ev.event_timestamp || Date.now() / 1000) * 1000;
  return {
    id: "el-" + d.conversation_id, provider: "elevenlabs", at: Math.round(start), dur: m.call_duration_secs || 0,
    phone: pc.external_number || dv.system__caller_id || dv.caller_number || "",
    called: pc.agent_number || dv.system__called_number || "",
    transcript: (d.transcript || []).filter((x) => x && x.message).map((x) => ({ who: x.role === "agent" ? "reva" : "caller", t: String(x.message).slice(0, 2000) })),
    fields, mood: val("mood") ? { label: String(val("mood")).toLowerCase().slice(0, 20) } : null,
    lang: val("language") || "", summary: a.transcript_summary || "", received: Date.now(),
  };
}
async function putCall(env, c) {
  if (!c.id) return;
  await env.FRONTLY.put(`call:${String(c.at).padStart(14, "0")}:${c.id}`, JSON.stringify(c), { expirationTtl: CALL_TTL });
}
async function onWebhook(req, env) {
  const raw = await req.text();
  if (!(await verifyElevenLabs(req, raw, env.EL_WEBHOOK_SECRET))) return json({ error: "bad signature" }, 401);
  let ev; try { ev = JSON.parse(raw); } catch (e) { return json({ error: "not JSON" }, 400); }
  if (ev.type !== "post_call_transcription") return json({ ok: true, ignored: ev.type });   // audio and failures: nothing to file
  await putCall(env, fromElevenLabs(ev));   // a retry overwrites the same key
  return json({ ok: true });
}

async function listCalls(env, since) {
  const out = [];
  let cursor;
  do {
    const page = await env.FRONTLY.list({ prefix: "call:", cursor });
    for (const k of page.keys) {
      const at = Number(k.name.split(":")[1]);
      if (at > since) { const c = await env.FRONTLY.get(k.name, "json"); if (c) out.push(c); }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && out.length < 200);
  return out.sort((x, y) => x.at - y.at).slice(0, 100);
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url), path = u.pathname.replace(/\/+$/, "") || "/";
    try {
      if (req.method === "GET" && (path === "/" || path === "/health")) return json({ ok: true, service: "frontly-bridge", phone: env.PHONE_NUMBER || "", language: env.LANGUAGE || "en" });
      if (req.method === "POST" && path === "/elevenlabs/init") return onInit(req, env);
      if (req.method === "POST" && path === "/elevenlabs/webhook") return onWebhook(req, env);
      if (!bearer(req, env.APP_TOKEN)) return json({ error: "unauthorized" }, 401);
      if (req.method === "GET" && path === "/calls") return json({ calls: await listCalls(env, Number(u.searchParams.get("since")) || 0), phone: env.PHONE_NUMBER || "" });
      if (req.method === "PUT" && path === "/patients") {
        const list = await req.json();
        if (!Array.isArray(list)) return json({ error: "expected a list" }, 400);
        const clean = list.slice(0, 500).map((p) => ({ name: String(p.name || "").slice(0, 80), age: p.age || null, phone: String(p.phone || "").slice(0, 30), history: String(p.history || "").slice(0, 300) }));
        await env.FRONTLY.put("patients", JSON.stringify(clean));
        return json({ ok: true, patients: clean.length });
      }
      if (req.method === "POST" && path === "/calls") {
        const c = await req.json();
        if (!c || !c.id || !c.at) return json({ error: "a call needs id and at" }, 400);
        await putCall(env, Object.assign({ provider: "other", received: Date.now() }, c));
        return json({ ok: true });
      }
      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: String(e && e.message || e).slice(0, 200) }, 500);
    }
  },
};

export { verifyElevenLabs, fromElevenLabs, hmacHex };   // for the tests
