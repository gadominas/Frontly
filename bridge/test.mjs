// The bridge's tests, in plain Node (22+): node bridge/test.mjs
import worker, { hmacHex } from "./worker.js";
import assert from "node:assert/strict";

const kv = new Map();
const KV = {
  async get(k, t) { const v = kv.get(k); return v == null ? null : t === "json" ? JSON.parse(v) : v; },
  async put(k, v) { kv.set(k, v); },
  async list({ prefix }) { return { keys: [...kv.keys()].filter((k) => k.startsWith(prefix)).sort().map((name) => ({ name })), list_complete: true }; },
};
const env = { FRONTLY: KV, APP_TOKEN: "app-123", EL_WEBHOOK_SECRET: "whsec-abc", INIT_TOKEN: "init-xyz", PHONE_NUMBER: "+370 5 200 0000", LANGUAGE: "lt", CLINIC_NAME: "Northlight Dental", ASSISTANT_NAME: "Reva" };
const call = (method, path, { body, headers = {} } = {}) => worker.fetch(new Request("https://bridge.example" + path, { method, headers, body: body == null ? undefined : typeof body === "string" ? body : JSON.stringify(body) }), env);
const ok = (name, fn) => fn().then(() => console.log("✓", name), (e) => { console.log("✗", name, "\n  ", e.message); process.exitCode = 1; });

const EVENT = { type: "post_call_transcription", event_timestamp: 1763000000, data: {
  agent_id: "a", conversation_id: "conv1", status: "done",
  transcript: [{ role: "agent", message: "Labas, skambinate į Northlight Dental, aš Reva. Ar kalbu su Jonu?" }, { role: "user", message: "Taip. Skauda dantį." }, { role: "agent", message: null }],
  metadata: { start_time_unix_secs: 1763000000, call_duration_secs: 95, phone_call: { direction: "inbound", external_number: "+37061234567", agent_number: "+37052000000", type: "twilio" } },
  analysis: { transcript_summary: "Jonas has toothache.", data_collection_results: {
    name: { data_collection_id: "name", value: "Jonas Petrauskas" }, age: { value: "52" }, complaint: { value: "Toothache, lower left" },
    pain: { value: 7 }, urgency: { value: 9 }, mood: { value: "Worried" }, language: { value: "lt" },
    intent: { value: "About_Visit" }, message_passed: { value: true } } },
  conversation_initiation_client_data: { dynamic_variables: { system__caller_id: "+37061234567", patient_message_id: "m-1" } } } };

await ok("health shows the number, without a token", async () => {
  const r = await call("GET", "/health"); const j = await r.json();
  assert.equal(r.status, 200); assert.equal(j.phone, "+370 5 200 0000");
});
await ok("everything else needs the app token", async () => {
  assert.equal((await call("GET", "/calls")).status, 401);
  assert.equal((await call("GET", "/calls", { headers: { authorization: "Bearer nope" } })).status, 401);
});
await ok("Frontly's patient list is kept", async () => {
  const r = await call("PUT", "/patients", { headers: { authorization: "Bearer app-123" }, body: [{ name: "Jonas Petrauskas", age: 52, phone: "+370 612 34567", history: "Filling in September",
    appointments: "Friday 13 November at 10:30 with Dr. Tomas Petraitis (Endodontist): root canal", waiting: "", message: "Please bring your X-rays.", messageId: "m-1" }] });
  assert.equal((await r.json()).patients, 1);
});
await ok("call start: a known number gets his name and a Lithuanian opening", async () => {
  const r = await call("POST", "/elevenlabs/init", { headers: { "x-frontly-token": "init-xyz" }, body: { caller_id: "+37061234567", agent_id: "a", called_number: "+37052000000", call_sid: "CA1", conversation_id: "conv1" } });
  const j = await r.json();
  assert.equal(j.type, "conversation_initiation_client_data");
  assert.equal(j.dynamic_variables.patient_known, "yes");
  assert.equal(j.dynamic_variables.patient_name, "Jonas Petrauskas");
  assert.match(j.dynamic_variables.opening, /Ar tai Jonas\?/);
  assert.equal(j.conversation_config_override.agent.language, "lt");
  assert.equal(j.dynamic_variables.call_language, "Lithuanian");
  assert.match(j.dynamic_variables.patient_appointments, /Friday 13 November at 10:30 with Dr\. Tomas Petraitis/);
  assert.equal(j.dynamic_variables.patient_waiting, "none");
  assert.equal(j.dynamic_variables.patient_message, "Please bring your X-rays.");
  assert.equal(j.dynamic_variables.patient_message_id, "m-1");
});
await ok("call start: an unknown number is asked for a name; every variable is present", async () => {
  const j = await (await call("POST", "/elevenlabs/init", { headers: { "x-frontly-token": "init-xyz" }, body: { caller_id: "+37069999999" } })).json();
  assert.equal(j.dynamic_variables.patient_known, "no");
  assert.deepEqual(Object.keys(j.dynamic_variables).sort(), ["call_language", "caller_number", "opening", "patient_age", "patient_appointments", "patient_history", "patient_known", "patient_message", "patient_message_id", "patient_name", "patient_waiting"]);
  assert.equal(j.dynamic_variables.patient_appointments, "none"); assert.equal(j.dynamic_variables.patient_message, "none");
  assert.match(j.dynamic_variables.opening, /vardą ir pavardę/);
});
const start = async (body) => (await call("POST", "/elevenlabs/init", { headers: { "x-frontly-token": "init-xyz" }, body })).json();
await ok("call start: the caller's country code picks the language", async () => {
  const lv = await start({ caller_id: "+37129123456", called_number: "+37052000000" });
  assert.equal(lv.conversation_config_override.agent.language, "lv");
  assert.equal(lv.dynamic_variables.call_language, "Latvian");
  assert.match(lv.dynamic_variables.opening, /^Labdien, jūs zvanāt uz Northlight Dental, es esmu Reva\. Lūdzu, pasakiet savu vārdu un uzvārdu\.$/);
  const en = await start({ caller_id: "+447700900123", called_number: "+37052000000" });
  assert.equal(en.conversation_config_override.agent.language, "en");
  assert.match(en.dynamic_variables.opening, /May I have your full name/);
});
await ok("call start: a hidden caller gets the language of the number dialled, then LANGUAGE", async () => {
  for (const hidden of ["+266696687", "anonymous", "", "+7378742833"]) {
    assert.equal((await start({ caller_id: hidden, called_number: "+37126000000" })).conversation_config_override.agent.language, "lv", hidden);
  }
  assert.equal((await start({ caller_id: "anonymous" })).conversation_config_override.agent.language, "lt");   // LANGUAGE=lt
});
await ok("call start: LANGUAGE_OVERRIDE=off sends no override but still the right opening", async () => {
  env.LANGUAGE_OVERRIDE = "off";
  try {
    const j = await start({ caller_id: "+37129123456" });
    assert.equal(j.conversation_config_override, undefined);
    assert.equal(j.dynamic_variables.call_language, "Latvian");
  } finally { delete env.LANGUAGE_OVERRIDE; }
});
await ok("call start without the shared header is refused", async () => {
  assert.equal((await call("POST", "/elevenlabs/init", { body: { caller_id: "+37061234567" } })).status, 401);
});
await ok("a post-call webhook with a bad signature is refused and nothing is stored", async () => {
  const raw = JSON.stringify(EVENT), t = Math.floor(Date.now() / 1000);
  const r = await call("POST", "/elevenlabs/webhook", { headers: { "elevenlabs-signature": `t=${t},v0=${"0".repeat(64)}` }, body: raw });
  assert.equal(r.status, 401);
  assert.equal([...kv.keys()].filter((k) => k.startsWith("call:")).length, 0);
});
await ok("an old signature is refused (replay)", async () => {
  const raw = JSON.stringify(EVENT), t = Math.floor(Date.now() / 1000) - 3600;
  const r = await call("POST", "/elevenlabs/webhook", { headers: { "elevenlabs-signature": `t=${t},v0=${await hmacHex("whsec-abc", `${t}.${raw}`)}` }, body: raw });
  assert.equal(r.status, 401);
});
await ok("a signed post-call webhook becomes one call in Frontly's shape", async () => {
  const raw = JSON.stringify(EVENT), t = Math.floor(Date.now() / 1000);
  const sig = `t=${t},v0=${await hmacHex("whsec-abc", `${t}.${raw}`)}`;
  assert.equal((await call("POST", "/elevenlabs/webhook", { headers: { "elevenlabs-signature": sig }, body: raw })).status, 200);
  assert.equal((await call("POST", "/elevenlabs/webhook", { headers: { "elevenlabs-signature": sig }, body: raw })).status, 200);   // a retry
  const j = await (await call("GET", "/calls?since=0", { headers: { authorization: "Bearer app-123" } })).json();
  assert.equal(j.calls.length, 1, "a retry doesn't make a second call");
  const c = j.calls[0];
  assert.equal(c.id, "el-conv1"); assert.equal(c.phone, "+37061234567"); assert.equal(c.dur, 95); assert.equal(c.at, 1763000000000);
  assert.equal(c.transcript.length, 2); assert.equal(c.transcript[0].who, "reva"); assert.equal(c.transcript[1].who, "caller");
  assert.equal(c.fields.name, "Jonas Petrauskas"); assert.equal(c.fields.age, 52); assert.equal(c.fields.pain, 7);
  assert.equal(c.fields.urgency, null, "an urgency outside 1–5 is dropped");
  assert.equal(c.mood.label, "worried"); assert.equal(c.summary, "Jonas has toothache.");
  assert.equal(c.intent, "about_visit"); assert.equal(c.messageId, "m-1"); assert.equal(c.messagePassed, true);
});
await ok("since= returns only newer calls", async () => {
  const j = await (await call("GET", "/calls?since=1763000000000", { headers: { authorization: "Bearer app-123" } })).json();
  assert.equal(j.calls.length, 0);
});
await ok("other services can post a call in Frontly's shape", async () => {
  assert.equal((await call("POST", "/calls", { headers: { authorization: "Bearer app-123" }, body: { id: "x-1", at: 1763000500000, phone: "+37060000000", transcript: [], fields: {} } })).status, 200);
  const j = await (await call("GET", "/calls?since=1763000000000", { headers: { authorization: "Bearer app-123" } })).json();
  assert.equal(j.calls[0].id, "x-1");
});
