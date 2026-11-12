// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: teal; icon-glyph: phone;

/*
 * Frontly — a virtual receptionist for a dental clinic, as a showcase demo for Scriptable on iPhone.
 * https://github.com/gadominas/Frontly
 *
 *  - Call the clinic from the app: Reva, the virtual receptionist, answers with a voice, listens, and asks
 *    about the complaint, where it hurts, how strong the pain is, how urgent it feels and the best time to come
 *  - A caller is recognised by phone number and linked to their patient record; new callers get one
 *  - Every call is kept: when, who, the transcript, what Reva learned, the caller's mood and a summary
 *  - Front desk: sign in as the receptionist, work the queue by urgency and book the right dentist
 *  - Optional Claude or OpenAI: natural conversation, mood reading and summaries; OpenAI also gives Reva an AI
 *    voice and transcribes the caller. Without a key Reva follows a fixed script (no AI)
 *  - Opens on a 2.4 s launch screen (app-blueprints · launch-screen), Home Screen widget with the waiting calls
 *    (app-blueprints · widgets), in-app updates from GitHub (app-blueprints · in-app-updates)
 *  - The BLUEPRINTS block below lists every shared blueprint this app follows (Settings › Built with)
 *
 * Data lives in iCloud Drive › Scriptable › Frontly (JSON files). Keys live in the iOS Keychain.
 * Everything here is a demo: the clinic, its dentists, the patients and the schedule are made up.
 */

// This build's version. When releasing, bump it and add a matching entry to releases.json.
const VERSION = '1.3.0';
const APP_ID = 'frontly';   // unique per app, never changes
const REPO_RAW = 'https://raw.githubusercontent.com/gadominas/Frontly/main/';
const SCRIPT_FILE = 'Frontly.js';   // the script's file name in the repository
const UPDATE_SNOOZE_MS = 2 * 24 * 3600 * 1000;   // "Later" = 2 days
const KC_UPDATE_SNOOZE = 'frontly-update-snooze';   // Keychain key, unique per app
// In a native shell (BuildIt) new versions come from the App Store or TestFlight, never from GitHub (Step 8).
const NATIVE_SHELL = (() => { try { return config.runsInNativeShell === true; } catch (e) { return false; } })();

// Other secrets (settings blueprint, Step 7): each its own Keychain entry, typed into a native secure prompt, never in settings.json or the page.
const SECRETS = { bridge: { key: "FRONTLY_BRIDGE_TOKEN", name: "Phone line token", hint: "The APP_TOKEN secret of your Frontly bridge on Cloudflare." } };
const secretFor = id => Keychain.contains(SECRETS[id].key) ? Keychain.get(SECRETS[id].key) : null;
async function askSecret(id) {
  const d = SECRETS[id], cur = secretFor(id);
  const al = new Alert();
  al.title = d.name;
  al.message = (cur ? `The saved token ends in …${cur.slice(-4)}. Paste a new one to replace it. ` : "") + d.hint + " Stored in the iOS Keychain on this device only.";
  al.addSecureTextField("Token", "");
  al.addAction("Save token");
  al.addCancelAction("Cancel");
  if (await al.present() !== 0) return false;
  const v = al.textFieldValue(0).trim();
  if (!v) return false;
  Keychain.set(d.key, v);
  return true;
}

// ───────── Blueprints ─────────
// Shared blueprints this app was built with. One line per blueprint, in this exact shape:
// inventory tools read it without running the script, and Settings › Built with shows it.
const BLUEPRINTS = [
  { id: 'stability-patterns', name: 'Stability patterns', version: '1.0.2', since: '1.0.0' },
  { id: 'in-app-updates', name: 'In-app updates', version: '1.1.1', since: '1.0.0' },
  { id: 'settings', name: 'Settings', version: '2.0.1', since: '1.0.0' },
  { id: 'ai-configuration', name: 'AI configuration', version: '1.0.2', since: '1.0.0' },
  { id: 'launch-screen', name: 'Launch screen', version: '1.0.2', since: '1.0.0' },
  { id: 'widgets', name: 'Widgets', version: '1.1.1', since: '1.0.0' },
  { id: 'ai-invitation', name: 'AI invitation', version: '1.2.2', since: '1.0.0' },
  { id: 'audio-playback', name: 'Sound in silent mode', version: '1.0.2', since: '1.0.0' },
];
// What each blueprint is, shown when a Built with row is tapped (settings blueprint, Step 9).
// Written by `node tools/about.js` in app-blueprints from the versions in BLUEPRINTS; never edit by hand.
const BLUEPRINT_ABOUT = {
  'stability-patterns': { what: "The rules that keep the app opening on any iPhone.", does: "Uses iCloud only when this iPhone has it, keeps data on the phone otherwise, and checks the Keychain before reading from it.", drives: "Where the app keeps its data, the widget, the installer and in-app updates.", why: "A new phone, one without iCloud or one with nothing saved yet still opens the app, instead of stopping with an error." },
  'in-app-updates': { what: "The way the app offers and installs its own new versions.", does: "When the app opens it checks for a newer version, shows its three best features, and installs it with Update now; Later waits two days.", drives: "The update sheet, Settings › Updates and the installer.", why: "Fixes and features reach you without reinstalling by hand, and the app only replaces itself with a checked, newer copy." },
  'settings': { what: "The shared Settings sheet every app has.", does: "Keeps the app's look, behaviour and limits in one place; changes apply at once and survive updates.", drives: "Appearance (colours, layout, text size, font), the app's own choices, Updates, every adjustable value, and this Built with list.", why: "Nobody edits code to change a setting, and every app is set up the same familiar way." },
  'ai-configuration': { what: "How the app connects to Claude or OpenAI.", does: "Keeps your key in the iPhone Keychain, lets you pick the provider and model, tests the connection and counts the tokens each feature uses.", drives: "Settings › AI settings, every AI feature, and the ✦ AI label on everything AI wrote.", why: "Your key goes only to its own provider, you can see what AI uses, and the app still works without a key." },
  'launch-screen': { what: "The branded screen the app opens on.", does: "Shows the app's logo, name and tagline for about two and a half seconds; a tap skips it, and Reduce Motion keeps it still.", drives: "The first moment after the app opens, with the same logo as the icon and the widget.", why: "The app starts the same recognisable way every time while its page gets ready behind the screen, and the screen can never get stuck." },
  'widgets': { what: "The shared design for the app's Home Screen and Lock Screen widgets.", does: "Draws the app's logo and name, one headline figure or title, a few rows and an updated line, from the app's own data.", drives: "Every widget size, the Lock Screen versions, and the widget's settings.", why: "Widgets name their app, look like one family, say when their data is old, and never show a script error." },
  'ai-invitation': { what: "A short card that shows what AI adds to this app.", does: "While no AI key is set, it names three things AI can do here and takes you straight to adding a key; it comes back every few days at most, and Don't remind me again ends it.", drives: "The invitation at launch, and the hand-over to Settings › AI settings.", why: "Features that need a key are hidden without one, so they are easy to miss; this shows them without nagging or covering anything else." },
  'audio-playback': { what: "The rule that lets sound you asked for play with the Ring/Silent switch on.", does: "While the app reads, speaks or plays a sound you started, it tells iOS it is a media player, and gives sound back to other apps when it stops.", drives: "Reading aloud, spoken words, timer beeps and any other sound the app makes.", why: "Without it, iOS silently mutes the app while it looks as if it is playing." },
};

// ---------- config ----------
const APP = "Frontly";
const SCHEME = "frontly://";
const AI = {
  anthropic: { key: "FRONTLY_ANTHROPIC_KEY", model: "claude-haiku-5-5" },
  openai: { key: "FRONTLY_OPENAI_KEY", model: "gpt-4o-mini" },
};

// ───────── AI invitation (app-blueprints · ai-invitation) ─────────
// What the invitation promises. Exactly three perks, each a real feature that needs a key.
const AI_INVITE = {
  title: "Give Reva a real conversation",      // punchy, names the app, at most 32 characters
  perks: [                                      // icon + at most 48 characters each
    { icon: "🗣️", text: "Reva talks naturally and asks smart follow-ups" },
    { icon: "✦", text: "A ready-to-book summary after every call" },
    { icon: "🌡️", text: "Mood and urgency read from each caller" },
  ],
};
const DAY = 864e5;

// Everything tunable lives here; the Settings screen edits these (stored in settings.cfg, defaults below).
const CONFIG = [
  ["Clinic", [
    { k: "clinicName", label: "Clinic name", help: "What Reva says when she answers", type: "text", def: "Northlight Dental" },
    { k: "assistantName", label: "Receptionist's name", help: "The virtual receptionist's name", type: "text", def: "Reva" },
  ]],
  ["Calls", [
    { k: "maxTurns", label: "Questions per call", help: "Reva wraps up after this many answers", unit: "answers", def: 14, min: 6, max: 30, step: 1 },
    { k: "silenceStop", label: "Stop listening after a pause of", help: "With OpenAI transcription, your answer is sent once you stop talking for this long", unit: "s", def: 1.2, min: 0.6, max: 4, step: 0.2 },
    { k: "listenDelay", label: "Pause before listening", help: "After Reva stops talking, wait this long before the microphone opens", unit: "s", def: 0.4, min: 0, max: 3, step: 0.1 },
    { k: "transcriptKeep", label: "Lines sent to AI per answer", help: "The most recent lines of the call that AI reads before replying", unit: "lines", def: 24, min: 8, max: 60, step: 2 },
  ]],
  ["Booking", [
    { k: "daysAhead", label: "Days to offer", help: "How far ahead the front desk can book", unit: "days", def: 10, min: 3, max: 30, step: 1 },
    { k: "slotMinutes", label: "Appointment length", unit: "min", def: 30, min: 15, max: 60, step: 15 },
    { k: "visitGapDays", label: "Days between a patient's visits", help: "0 allows two visits on one day (never at the same time); 1 keeps them on different days", unit: "days", def: 1, min: 0, max: 14, step: 1 },
    { k: "surgeryGapDays", label: "Days between two surgeries", help: "Healing time before the same patient can have another surgery", unit: "days", def: 14, min: 0, max: 60, step: 1 },
    { k: "busyShare", label: "Demo: slots already taken", help: "The made-up share of each dentist's slots that other patients hold", unit: "%", def: 45, min: 0, max: 90, step: 5 },
  ]],
  ["Widget", [
    { k: "widgetRefreshMin", label: "Ask iOS to refresh every", help: "iOS decides the exact timing", unit: "min", def: 30, min: 15, max: 240, step: 15 },
    { k: "widgetStaleMin", label: "Mark the widget as out of date after", help: "Older data shows \"Updated …\" in amber", unit: "min", def: 720, min: 60, max: 2880, step: 60 },
  ]],
];
const CFG_FLAT = CONFIG.flatMap(([, items]) => items);
const cfgDef = k => CFG_FLAT.find(x => x.k === k);
const cfg = k => { const v = settings.cfg && settings.cfg[k]; return v === undefined ? cfgDef(k).def : v; };
function setCfg(k, v) {
  const d = cfgDef(k);
  if (!d) return;
  settings.cfg = settings.cfg || {};
  if (v === null) { delete settings.cfg[k]; return; }
  if (d.type === "text") v = String(v || "").trim().slice(0, 60) || d.def;
  else if (d.type === "lines") { v = String(Array.isArray(v) ? v.join("\n") : v || "").split("\n").map(x => x.trim()).filter(Boolean).slice(0, 20); if (!v.length) v = d.def; }
  else {
    v = Number(String(v).replace(",", "."));
    if (!isFinite(v)) v = d.def;
    v = Math.min(d.max, Math.max(d.min, v));
    v = d.step < 1 ? Math.round(v / d.step) * d.step : Math.round(v);
    v = Number(v.toFixed(2));
  }
  if (JSON.stringify(v) === JSON.stringify(d.def)) delete settings.cfg[k]; else settings.cfg[k] = v;
}

// Six palettes (settings blueprint): the names, schemes and controls are shared; the colours carry Frontly's teal.
const PALETTES = {
  ink:      { paper: "#f4f7f7", sheet: "#ffffff", ink: "#0b1f24", ink2: "#2e474d", muted: "#55696e", rule: "#d8e2e3", signal: "#0f766e", signalWash: "#dcf2ee", amber: "#b45309", amberWash: "#fcefdb", danger: "#be123c", scheme: "light" },
  sepia:    { paper: "#f3ead6", sheet: "#fbf5e6", ink: "#2a1f14", ink2: "#4b3b2a", muted: "#6f5c46", rule: "#e1d3b5", signal: "#0d675d", signalWash: "#dcebdc", amber: "#a16207", amberWash: "#f6e5bf", danger: "#9f1239", scheme: "light" },
  mint:     { paper: "#eef6f2", sheet: "#ffffff", ink: "#0d2318", ink2: "#2c4a3b", muted: "#506a5c", rule: "#cfe2d8", signal: "#047857", signalWash: "#d5f1e3", amber: "#b45309", amberWash: "#fbeed8", danger: "#b91c1c", scheme: "light" },
  contrast: { paper: "#ffffff", sheet: "#ffffff", ink: "#000000", ink2: "#111111", muted: "#333333", rule: "#9a9a9a", signal: "#005a52", signalWash: "#d7f0ec", amber: "#7a4b00", amberWash: "#ffeec2", danger: "#a30000", scheme: "light" },
  slate:    { paper: "#1b2226", sheet: "#222b30", ink: "#e7eff1", ink2: "#c3d0d4", muted: "#98a8ad", rule: "#354148", signal: "#5eead4", signalWash: "#173a37", amber: "#e3b341", amberWash: "#3a2f12", danger: "#ff8a9a", scheme: "dark" },
  night:    { paper: "#05080a", sheet: "#0e1518", ink: "#f2f7f8", ink2: "#cfdade", muted: "#97a6ab", rule: "#1e2a2f", signal: "#6ee7d2", signalWash: "#0f2e2b", amber: "#f5c04a", amberWash: "#2d240c", danger: "#ff8f9e", scheme: "dark" },
};

// ---------- the demo clinic ----------
// Specialties a call can be routed to, and the dentists who cover them. Made up for the demo.
const SPECIALTIES = {
  general: "General dentistry", endo: "Root canal and severe pain", surgery: "Oral surgery",
  ortho: "Braces and aligners", hygiene: "Cleaning and check-ups", kids: "Children's dentistry",
};
const DOCTORS = [
  { id: "d-kazl", name: "Dr. Rūta Kazlauskienė", short: "Dr. Kazlauskienė", role: "General dentist", spec: ["general", "kids"], days: [1, 2, 3, 4, 5], from: 8, to: 16 },
  { id: "d-petr", name: "Dr. Tomas Petraitis", short: "Dr. Petraitis", role: "Endodontist", spec: ["endo", "general"], days: [1, 3, 4, 5], from: 10, to: 18 },
  { id: "d-jank", name: "Dr. Marius Jankauskas", short: "Dr. Jankauskas", role: "Oral surgeon", spec: ["surgery"], days: [2, 4, 5], from: 9, to: 15 },
  { id: "d-vait", name: "Dr. Laura Vaitkutė", short: "Dr. Vaitkutė", role: "Orthodontist", spec: ["ortho", "kids"], days: [1, 2, 4], from: 12, to: 19 },
  { id: "d-stan", name: "Eglė Stankevičiūtė", short: "Eglė (hygienist)", role: "Dental hygienist", spec: ["hygiene"], days: [1, 2, 3, 4, 5], from: 8, to: 17 },
];
// Booking rules for one patient, shared by the script (when booking) and the page (greying out times): visits may
// not overlap, must be o.gapDays apart (0: the same day is fine, 1: different days), and two surgeries need
// o.surgeryDays to heal. Returns why a time can't be booked, or "". Self-contained: it is also put into the page.
function visitConflict(appts, at, spec, o) {
  const day = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const pad = n => String(n).padStart(2, "0"), hm = t => pad(new Date(t).getHours()) + ":" + pad(new Date(t).getMinutes());
  const date = t => new Date(t).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  for (const a of appts || []) {
    if (a.id && a.id === o.ignore) continue;
    const live = a.status === "booked", dd = Math.round(Math.abs(day(a.at) - day(at)) / 864e5), with_ = o.docName(a.doctor);
    if (live && Math.abs(a.at - at) < o.slotMin * 60e3) return `Already booked at ${hm(a.at)} with ${with_}`;
    if (live && o.gapDays > 0 && dd < o.gapDays) return dd === 0 ? `Already has a visit that day: ${hm(a.at)} with ${with_}` : `Less than ${o.gapDays} days from the visit on ${date(a.at)}`;
    if ((live || a.status === "done") && spec === "surgery" && o.specOf(a) === "surgery" && dd < o.surgeryDays)
      return `Within ${o.surgeryDays} days of the surgery on ${date(a.at)}: time to heal`;
  }
  return "";
}
const ruleOpts = (ignore) => ({ slotMin: cfg("slotMinutes"), gapDays: cfg("visitGapDays"), surgeryDays: cfg("surgeryGapDays"), ignore,
  specOf: a => a.spec || ((DOCTORS.find(d => d.id === a.doctor) || {}).spec || [])[0], docName: id => (DOCTORS.find(d => d.id === id) || {}).short || "the dentist" });
const DESK_STAFF = ["Agnė Petrauskaitė", "Mantas Jonaitis"];
const DEMO_PIN = "1234";
const MOODS = { calm: "🙂", cheerful: "😊", worried: "😟", anxious: "😰", "in pain": "😣", frustrated: "😤", upset: "😢", unsure: "😐" };
const TRIAGE = ["emergency", "urgent", "soon", "routine"];
// Why someone phoned. Only new_visit and change_visit are booking work; the others are filed under the patient.
const INTENTS = ["new_visit", "about_visit", "change_visit", "other"];

// ---------- storage ----------
// Stability patterns (app-blueprints · stability-patterns 1.0.2): iCloud only when this script itself lives in iCloud Drive.
// On a phone that isn't signed in to iCloud, the first call on Scriptable's iCloud manager ends the script
// ("iCloud is not supported"), and a try/catch doesn't reliably stop it: so there, iCloud is never touched.
const ICLOUD_OK = (() => { try { return /\/Mobile Documents\//.test(module.filename); } catch (e) { return false; } })();
function icloudFm() {   // the iCloud manager, or null on a phone without iCloud
  if (!ICLOUD_OK) return null;
  try { const ic = FileManager.iCloud(); ic.documentsDirectory(); return ic; } catch (e) { return null; }
}
const scriptFm = (path) => (/\/Mobile Documents\//.test(path) && icloudFm()) || FileManager.local();   // where the running script lives (updates)
const fm = icloudFm() || FileManager.local();   // storage: iCloud Drive, or the phone
const DIR = fm.joinPath(fm.documentsDirectory(), APP);
if (!fm.fileExists(DIR)) fm.createDirectory(DIR, true);
const P = n => fm.joinPath(DIR, n + ".json");
const loadIssues = [];    // files that didn't arrive (iCloud too slow, or unreadable): never written this run
const loadRepaired = [];  // files that arrived damaged: kept aside as <name>.broken-<time>.json, then started fresh
async function load(n, def, waitMs = 10000) {
  const p = P(n);
  if (!fm.fileExists(p)) return def;
  let txt;
  try {
    if (fm.isFileStoredIniCloud(p) && !fm.isFileDownloaded(p)) {
      // iCloud can take a long time (or forever, offline): never let start-up hang on it
      await Promise.race([fm.downloadFileFromiCloud(p), new Promise(r => Timer.schedule(waitMs, false, r))]);
      if (!fm.isFileDownloaded(p)) { loadIssues.push(n); startLog(`iCloud didn't deliver ${n}.json in ${waitMs / 1000} s`); return def; }
    }
    txt = fm.readString(p);
  } catch (e) { loadIssues.push(n); startLog(`Couldn't read ${n}.json: ${e}`); return def; }   // not read: never saved over
  try { return JSON.parse(txt); }
  catch (e) { keepBroken(fm, p, n, txt); return def; }
}
// It arrived but is damaged: keep a copy next to it, then start this file fresh so saving can carry on (safe-startup 1.1.0).
// The widget reads the data on every refresh and never saves, so a copy that's already there is not made again.
// The parse error isn't logged: it can quote the file.
function keepBroken(fm, p, n, txt) {
  try {
    const base = p.replace(/\.json$/, ""), dir = p.slice(0, p.lastIndexOf("/")), pre = base.slice(dir.length + 1) + ".broken-";
    let kept = false;
    try { kept = fm.listContents(dir).some(f => f.startsWith(pre) && fm.readString(fm.joinPath(dir, f)) === txt); } catch (_) {}
    if (!kept) fm.writeString(base + ".broken-" + Date.now() + ".json", txt);
    if (!loadRepaired.includes(n)) loadRepaired.push(n);
    startLog(`${n}.json was damaged (not valid JSON); ${kept ? "a copy was already kept" : "kept a copy"} and started it fresh`);
  } catch (e) { loadIssues.push(n); startLog(`${n}.json was damaged and couldn't be copied aside`); }   // no copy, no overwrite
}
// Data files are only written once they were read, so a slow start can never save an empty list over them.
const write = (n, v) => {
  if (n === "settings" ? !settingsOk : !dataLoaded) return;
  fm.writeString(P(n), JSON.stringify(v));
};

// A short start-up log on the phone (local, not iCloud), shown if Frontly gets stuck while opening.
const LOG_PATH = FileManager.local().joinPath(FileManager.local().documentsDirectory(), "frontly-startup.log");
function startLog(msg) {
  try {
    const lfm = FileManager.local(), line = new Date().toISOString().slice(11, 19) + "  " + msg;
    const old = lfm.fileExists(LOG_PATH) ? lfm.readString(LOG_PATH).split("\n").slice(-60) : [];
    lfm.writeString(LOG_PATH, old.concat(line).join("\n"));
  } catch (e) {}
}

// Patients, calls and usage are read in loadData(): the app shows its first screen before reading them,
// because iCloud can be slow to hand files over (a black screen when opened from the widget).
let patients = [], calls = [], dataLoaded = false;
async function loadData() {
  loadIssues.length = 0;   // loadRepaired is kept, so a damaged settings.json (read before this) still gets its toast
  const firstRun = !fm.fileExists(P("patients")) && !fm.fileExists(P("calls"));
  patients = await load("patients", []);
  calls = await load("calls", []);
  usage = await load("usage", usage);
  dataLoaded = loadIssues.length === 0;   // anything missing: show what we have, save nothing over it
  if (firstRun && dataLoaded) { const d = demoData(); patients = d.patients; calls = d.calls; }   // kept in memory; saved by saveAll()
}
const settings = Object.assign(
  { ai: true, aiProvider: "anthropic", lastSession: 0,
    checkUpdates: true,   // offer new versions from GitHub (asks again 2 days after "Later")
    lang: "en", sttEngine: "dictation", speechEngine: "ai", handsFree: true,   // the call: language, how Reva hears and speaks
    ttsModel: "gpt-4o-mini-tts", ttsVoice: "coral", ttsInstructions: "", voiceURI: "",
    deskUser: "", tab: "call", callFrom: "", patGroup: "status",
    bridgeUrl: "", lineSince: 0, linePhone: "", lineLast: null,   // the real phone line (bridge/), when set up
    theme: "auto", density: "comfortable", font: "sans", textSize: 1 },
  await load("settings", {})
);
const settingsOk = !loadIssues.includes("settings");   // settings that were never read are never saved over

function saveAll(touchSession = true) {
  if (touchSession && dataLoaded) settings.lastSession = Date.now();
  write("patients", patients); write("calls", calls);   // write() skips these until the data was read
  write("settings", settings);
}

// ---------- demo data ----------
// A few made-up patients and one call already waiting, so the front desk has something to work on at once.
// Settings › Demo › Start the demo again brings this back.
function demoData(now = Date.now()) {
  const d = n => now - n * DAY;
  const pts = [
    { id: "p-jonas", name: "Jonas Petrauskas", age: 52, phone: "+370 612 34567", since: d(900), demo: true,
      notes: [{ at: d(200), by: "Agnė Petrauskaitė", text: "Prefers early mornings. A little anxious about injections." }],
      appts: [{ id: "a-j1", at: d(160), doctor: "d-stan", reason: "Cleaning and check-up", status: "done" },
              { id: "a-j2", at: d(60), doctor: "d-kazl", reason: "Filling, lower left molar", status: "done" }] },
    { id: "p-greta", name: "Greta Mikalauskaitė", age: 29, phone: "+370 698 76543", since: d(400), demo: true,
      notes: [{ at: d(300), by: "Mantas Jonaitis", text: "Braces since spring; adjustments about every six weeks." }],
      appts: [{ id: "a-g1", at: d(42), doctor: "d-vait", reason: "Braces adjustment", status: "done" }] },
    { id: "p-andrius", name: "Andrius Kairys", age: 41, phone: "+370 655 11223", since: d(1500), demo: true,
      notes: [], appts: [{ id: "a-a1", at: d(380), doctor: "d-petr", reason: "Root canal, upper right", status: "done" }] },
  ];
  const t0 = d(0.8);
  const cl = [{
    id: "c-demo1", at: t0, end: t0 + 151e3, dur: 151, phone: "+370 698 76543", patientId: "p-greta", isNew: false, lang: "en",
    engine: "script", provider: "", demo: true,
    transcript: [
      { who: "reva", t: "Hello, you've reached Northlight Dental, this is Reva. Am I speaking with Greta?" },
      { who: "caller", t: "Yes, hi, it's Greta." },
      { who: "reva", t: "Hi Greta, good to hear from you again. What can we help you with today?" },
      { who: "caller", t: "One of the brackets on my braces came loose and it's scratching my cheek." },
      { who: "reva", t: "I'm sorry, that sounds uncomfortable. Where exactly is it?" },
      { who: "caller", t: "Lower right, near the back." },
      { who: "reva", t: "From 0 to 10, how strong is the pain?" },
      { who: "caller", t: "Maybe a three. It's more annoying than painful." },
      { who: "reva", t: "And how urgent does it feel, from 1 to 5?" },
      { who: "caller", t: "A two. This week would be nice." },
      { who: "reva", t: "When would suit you best?" },
      { who: "caller", t: "Afternoons after three." },
      { who: "reva", t: "Thank you, Greta. The front desk will call you back shortly to confirm a time. Goodbye!" },
    ],
    fields: { name: "Greta Mikalauskaitė", age: 29, complaint: "Loose bracket on braces, scratching the cheek", location: "Lower right, back", pain: 3, urgency: 2, preferred: "Afternoons after 3 pm, this week", notes: "" },
    mood: null,
    summary: { kind: "template", text: "Existing orthodontic patient with a loose bracket on the lower right that rubs her cheek. Pain 3/10, not urgent; wants an afternoon slot this week.",
      triage: "routine", priority: 2, specialty: "ortho", reason: "Loose bracket", flags: [], hint: "Afternoon this week with the orthodontist" },
    status: "waiting", deskNotes: [],
  }];
  return { patients: pts, calls: cl };
}

// ---------- AI (app-blueprints · ai-configuration) ----------
const PROVIDERS = { anthropic: "Claude", openai: "OpenAI" };
const keyFor = p => Keychain.contains(AI[p].key) ? Keychain.get(AI[p].key) : null;
const aiKey = () => keyFor(settings.aiProvider);
const modelFor = p => (settings.model && settings.model[p]) || AI[p].model;
const maskKey = k => k ? (k.length > 14 ? k.slice(0, 7) + "…" + k.slice(-4) : "…" + k.slice(-4)) : null;

// token usage, kept per provider, model, feature and day
let usage = { since: Date.now(), p: {} };   // read in loadData()
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function recordUsage(provider, model, feature, tin, tout, chars = 0) {   // chars: text sent for speech or heard by transcription
  const P = usage.p[provider] = usage.p[provider] || { calls: 0, in: 0, out: 0, models: {}, features: {}, days: {} };
  const b = (o, k) => o[k] = o[k] || { calls: 0, in: 0, out: 0 };
  for (const x of [P, b(P.models, model), b(P.features, feature), b(P.days, dayKey())]) { x.calls++; x.in += tin; x.out += tout; if (chars) x.chars = (x.chars || 0) + chars; }
  const days = Object.keys(P.days).sort();
  while (days.length > 400) delete P.days[days.shift()];
  write("usage", usage);
}

async function fetchModels(p) {
  const key = keyFor(p);
  if (!key) throw new Error(`Add a ${PROVIDERS[p]} key first`);
  const r = new Request(p === "openai" ? "https://api.openai.com/v1/models" : "https://api.anthropic.com/v1/models?limit=100");
  r.headers = p === "openai" ? { "Authorization": "Bearer " + key } : { "x-api-key": key, "anthropic-version": "2023-06-01" };
  r.timeoutInterval = 20;
  const j = await r.loadJSON();
  if (j.error) throw new Error(j.error.message || "Couldn't load models");
  let list = (j.data || []).map(m => ({ id: m.id, name: m.display_name || m.id, t: m.created_at ? Date.parse(m.created_at) : (m.created || 0) * 1000 }));
  if (p === "openai") {   // speech models get their own list, for Settings › Calls
    settings.ttsModels = { at: Date.now(), list: list.filter(m => /tts/.test(m.id)).sort((a, b) => b.t - a.t).map(m => ({ id: m.id, name: m.id })) };
  }
  if (p === "openai") list = list.filter(m => /^(gpt-|o\d|chatgpt-)/.test(m.id) && !/(audio|realtime|tts|transcribe|image|search|embedding|instruct|moderation)/.test(m.id));
  list.sort((a, b) => b.t - a.t);
  settings.models = settings.models || {};
  settings.models[p] = { at: Date.now(), list: list.map(m => ({ id: m.id, name: m.name })) };
  return list.length;
}

async function askKey(p) {
  const cur = keyFor(p);
  const al = new Alert();
  al.title = `${PROVIDERS[p]} API key`;
  al.message = cur ? `The saved key ends in …${cur.slice(-4)}. Paste a new key to replace it.` : "Paste your API key. It's stored in the iOS Keychain on this device only.";
  al.addSecureTextField(p === "openai" ? "sk-…" : "sk-ant-…", "");
  al.addAction("Save key");
  al.addCancelAction("Cancel");
  if (await al.present() !== 0) return false;
  const v = al.textFieldValue(0).trim();
  if (!v) return false;
  Keychain.set(AI[p].key, v);
  if (!aiKey()) settings.aiProvider = p;
  return true;
}

// AI invitation: when it may appear. Its state lives in settings.json as settings.aiInvite (no UI of its own).
const INVITE_DAY = 864e5;
const INVITE_GAP = 3;          // days between invitations (about twice a week)
const INVITE_GAP_SLOW = 7;     // days between invitations after the 4th "Later"
function aiInviteDue(now = Date.now()) {
  const s = settings.aiInvite || (settings.aiInvite = {});
  if (aiKey()) return false;   // a key means AI is on: nothing to invite to
  if (s.off) return false;     // "Don't remind me again"
  return now >= (s.next || 0); // from the very first launch (right after install), then at most every 3 days
}
// Removing the last key turns AI off: invite again from the next launch (called in the "airm" action).
function aiInviteKeyRemoved() {
  if (aiKey()) return;
  const s = settings.aiInvite || (settings.aiInvite = {});
  s.next = 0; saveAll();
}
// The page reports what happened: "shown", "open", "later" or "never".
function aiInviteNote(what, now = Date.now()) {
  const s = settings.aiInvite || (settings.aiInvite = {});
  if (what === "shown") { s.shown = (s.shown || 0) + 1; s.next = now + INVITE_GAP * INVITE_DAY; }
  else if (what === "later") { s.later = (s.later || 0) + 1; s.next = now + (s.later >= 4 ? INVITE_GAP_SLOW : INVITE_GAP) * INVITE_DAY; }
  else if (what === "never") s.off = true;
  else return;   // "open": the AI sheet takes over; "shown" already set the next date
  saveAll();
}

// Every AI request goes through here, with a feature tag the token usage is counted under.
async function aiCall(system, user, maxTokens = 2500, feature = "other", provider = settings.aiProvider) {
  const key = keyFor(provider);
  if (!key) throw new Error(`No ${PROVIDERS[provider]} key saved`);
  const openai = provider === "openai", model = modelFor(provider);
  const r = new Request(openai ? "https://api.openai.com/v1/chat/completions" : "https://api.anthropic.com/v1/messages");
  r.method = "POST";
  r.timeoutInterval = 90;
  if (openai) {
    r.headers = { "Authorization": "Bearer " + key, "Content-Type": "application/json" };
    r.body = JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: user }] });
  } else {
    r.headers = { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" };
    r.body = JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] });
  }
  const j = await r.loadJSON();
  if (j.error) throw new Error(j.error.message || "AI request failed");
  const u = j.usage || {};
  recordUsage(provider, model, feature,
    openai ? (u.prompt_tokens || 0) : (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0),
    openai ? (u.completion_tokens || 0) : (u.output_tokens || 0));
  return openai ? ((j.choices && j.choices[0] && j.choices[0].message.content) || "") : (j.content || []).map(c => c.text || "").join("");
}
function parseJSON(txt) {
  const s = String(txt).replace(/```json|```/g, "").trim();
  const a = s.search(/[\[{]/), b = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  return JSON.parse(s.slice(a, b + 1));
}

// ---------- Reva's voice and ears: OpenAI's speech and transcription endpoints (Claude's API has neither) ----------
const TTS_LEGACY_VOICES = ["alloy", "ash", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"];   // all tts-1 and tts-1-hd can use
const TTS_DEFAULT_INSTR = "A warm, calm and professional dental clinic receptionist. Friendly, unhurried, reassuring.";
async function aiSpeech(text) {
  const key = keyFor("openai");
  if (!key) throw new Error("The AI voice needs an OpenAI key");
  const model = settings.ttsModel || "gpt-4o-mini-tts", legacy = /^tts-1/.test(model);
  let voice = settings.ttsVoice || "coral";
  if (legacy && !TTS_LEGACY_VOICES.includes(voice)) voice = "coral";
  const body = { model, voice, input: String(text).slice(0, 4096), response_format: "mp3" };
  if (!legacy) body.instructions = String(settings.ttsInstructions || TTS_DEFAULT_INSTR).slice(0, 500);
  const r = new Request("https://api.openai.com/v1/audio/speech");
  r.method = "POST"; r.timeoutInterval = 60;
  r.headers = { "Authorization": "Bearer " + key, "Content-Type": "application/json" };
  r.body = JSON.stringify(body);
  const data = await r.load();
  const code = r.response && r.response.statusCode;
  if (code !== 200) {
    let msg = `HTTP ${code}`;
    try { msg = JSON.parse(data.toRawString()).error.message || msg; } catch (e) {}
    throw new Error(msg);
  }
  recordUsage("openai", model, "speech", 0, 0, body.input.length);
  return data.toBase64String();
}
// The caller's recorded answer (base64, from the page) to text.
const STT_MODEL = "gpt-4o-mini-transcribe";
async function aiTranscribe(b64, mime) {
  const key = keyFor("openai");
  if (!key) throw new Error("Transcription needs an OpenAI key");
  const ext = /webm/.test(mime) ? "webm" : /wav/.test(mime) ? "wav" : /mpeg|mp3/.test(mime) ? "mp3" : "m4a";
  const r = new Request("https://api.openai.com/v1/audio/transcriptions");
  r.method = "POST"; r.timeoutInterval = 60;
  r.headers = { "Authorization": "Bearer " + key };
  r.addParameterToMultipart("model", STT_MODEL);
  r.addParameterToMultipart("language", settings.lang === "lt" ? "lt" : "en");
  r.addFileDataToMultipart(Data.fromBase64String(b64), mime || "audio/mp4", "file", "answer." + ext);
  const j = await r.loadJSON();
  if (!j || j.error) throw new Error((j && j.error && j.error.message) || "Transcription failed");
  const text = String(j.text || "").trim();
  recordUsage("openai", STT_MODEL, "listening", 0, 0, text.length);
  return text;
}
// ---------- in-app updates (pattern from StravaFeed) ----------
// Compares "1.10.0" and "1.9.2" as numbers: returns 1, 0 or -1.
function cmpVer(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}
function updateSnoozed() {
  try { return Keychain.contains(KC_UPDATE_SNOOZE) && Date.now() < +Keychain.get(KC_UPDATE_SNOOZE); } catch (e) { return false; }
}
function snoozeUpdate() { try { Keychain.set(KC_UPDATE_SNOOZE, String(Date.now() + UPDATE_SNOOZE_MS)); } catch (e) {} }
function clearUpdateSnooze() { try { if (Keychain.contains(KC_UPDATE_SNOOZE)) Keychain.remove(KC_UPDATE_SNOOZE); } catch (e) {} }

// force: Settings › Check for updates now, which asks even while "Later" is waiting or offers are off
async function checkForUpdate(force = false) {
  if (NATIVE_SHELL) return null;   // Step 8: updates come through the App Store
  if (!force && (settings.checkUpdates === false || updateSnoozed())) return null;
  try {
    const req = new Request(`${REPO_RAW}releases.json?t=${Date.now()}`);
    req.timeoutInterval = 10;
    const data = await req.loadJSON();
    if (!data || !Array.isArray(data.releases)) return null;
    const newer = data.releases
      .filter(r => r && r.version && cmpVer(r.version, VERSION) > 0)
      .sort((x, y) => cmpVer(y.version, x.version));
    if (!newer.length) return null;
    // The newest release's highlights first, topped up from older versions the user skipped.
    const highlights = [];
    newer.forEach(r => (r.highlights || []).forEach(h => {
      if (highlights.length < 3 && h && h.title) highlights.push(h);
    }));
    return {
      current: VERSION, latest: newer[0].version, title: newer[0].title || '', date: newer[0].date || '',
      skipped: newer.length, highlights, script: data.script || SCRIPT_FILE,
    };
  } catch (e) {
    console.log('Update check skipped: ' + e);
    return null;
  }
}

async function applyUpdate(info) {
  if (NATIVE_SHELL) throw new Error('This app is updated through the App Store.');   // Step 8: never download code
  const req = new Request(`${REPO_RAW}${encodeURI((info && info.script) || SCRIPT_FILE)}?t=${Date.now()}`);
  req.timeoutInterval = 30;
  const code = await req.loadString();
  const okStatus = req.response && req.response.statusCode === 200;
  const m = code && code.match(/const VERSION = '([^']+)'/);
  // 1. A real script for THIS app, not an error page or another project's file
  if (!okStatus || !m || !code.includes(`const APP_ID = '${APP_ID}'`)) {
    throw new Error("The download didn't look right. Try again later.");
  }
  // 2. Actually newer: GitHub's cache can serve the old file for a few minutes after a release
  if (cmpVer(m[1], VERSION) <= 0) {
    throw new Error('GitHub is still serving the old version. Try again in a few minutes.');
  }
  // 3. Write it where the running script lives (iCloud or on the phone)
  const path = module.filename;
  let lfm = FileManager.local();
  lfm = scriptFm(path);   // stability-patterns: iCloud only when the script lives there
  lfm.writeString(path, code);
  return m[1];   // the version now installed
}

let pendingUpdate = null, updateChecked = false;
const offerUpdate = () => { if (pendingUpdate) call("__showUpdate", pendingUpdate); };
// One offer per launch, and an update wins: call this once the update check has settled.
// pendingUpdate is still set at that moment when an update was offered ("Later" clears it only afterwards).
function inviteIfDue() {
  if (!pendingUpdate && aiInviteDue()) call("__aiInvite", AI_INVITE);   // call() is Frontly's js(): window.__aiInvite(AI_INVITE)
}

// ---------- the call: Reva, the virtual receptionist ----------
const live = {};   // calls in progress, by id; kept in memory until the call ends
const digits = s => String(s || "").replace(/\D/g, "");
const samePhone = (a, b) => { const x = digits(a), y = digits(b); return x.length >= 6 && y.length >= 6 && x.slice(-8) === y.slice(-8); };
const patientByPhone = ph => patients.find(p => samePhone(p.phone, ph));
const firstName = n => String(n || "").trim().split(/\s+/)[0] || "";
const docById = id => DOCTORS.find(d => d.id === id);
const FIELD_KEYS = ["name", "age", "complaint", "location", "pain", "urgency", "preferred", "notes"];
const LANG_NAME = { en: "English", lt: "Lithuanian" };

// Without AI Reva follows this script, one question per missing detail (labelled "no AI" in the app).
const SCRIPT = {
  en: {
    hello: (c, a) => `Hello, you've reached ${c}, this is ${a}. May I have your full name, please?`,
    helloKnown: (c, a, n) => `Hello, you've reached ${c}, this is ${a}. Am I speaking with ${n}?`,
    known: n => `Hi ${n}, good to hear from you again. What can we help you with today?`,
    who: "Of course. May I have your full name, please?",
    age: n => `Thank you${n ? ", " + n : ""}. And how old are you?`,
    complaint: "What's the reason for your call? What's bothering you?",
    location: "I'm sorry to hear that. Where exactly do you feel it: which tooth, or which side of your mouth?",
    pain: "On a scale from 0 to 10, how strong is the pain right now?",
    urgency: "And how urgent does it feel to you, from 1, it can wait, to 5, I need help today?",
    preferred: "When would suit you best for a visit? Which days, and morning or afternoon?",
    notes: "Is there anything else the dentist should know, like swelling, a fever, or medicines you take?",
    bye: n => `Thank you${n ? ", " + n : ""}. I've noted everything, and our front desk will call you back shortly to confirm your appointment. Goodbye!`,
    again: "Sorry, I didn't quite catch that. Could you give me a number?",
    emergency: "One thing first: if you have trouble breathing or swallowing, or the swelling is spreading, please call 112 right away.",
  },
  lt: {
    hello: (c, a) => `Labas, skambinate į ${c}, aš ${a}. Gal galite pasakyti savo vardą ir pavardę?`,
    helloKnown: (c, a, n) => `Labas, skambinate į ${c}, aš ${a}. Ar tai ${n}?`,
    known: n => `Labas, ${n}, malonu vėl jus girdėti. Kuo galime padėti šiandien?`,
    who: "Žinoma. Gal galite pasakyti savo vardą ir pavardę?",
    age: n => `Ačiū${n ? ", " + n : ""}. O kiek jums metų?`,
    complaint: "Dėl ko skambinate? Kas jus vargina?",
    location: "Labai gaila. Kur tiksliai jaučiate: kuris dantis ar kuri burnos pusė?",
    pain: "Skalėje nuo 0 iki 10, koks stiprus skausmas dabar?",
    urgency: "O kiek tai skubu jums, nuo 1, gali palaukti, iki 5, pagalbos reikia šiandien?",
    preferred: "Kada jums būtų patogiausia atvykti? Kuriomis dienomis, ryte ar po pietų?",
    notes: "Ar yra dar kas nors, ką gydytojas turėtų žinoti, pavyzdžiui, tinimas, karščiavimas ar vartojami vaistai?",
    bye: n => `Ačiū${n ? ", " + n : ""}. Viską užsirašiau, registratūra netrukus jums paskambins ir patvirtins vizito laiką. Viso gero!`,
    again: "Atsiprašau, nenugirdau. Gal galite pasakyti skaičių?",
    emergency: "Svarbu: jei sunku kvėpuoti ar ryti arba tinimas plinta, nedelsdami skambinkite 112.",
  },
};
const NUM_WORDS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  nulis: 0, vienas: 1, vienetas: 1, du: 2, dvejetas: 2, trys: 3, trejetas: 3, keturi: 4, ketvertas: 4, penki: 5, penketas: 5,
  šeši: 6, šešetas: 6, septyni: 7, septynetas: 7, aštuoni: 8, aštuonetas: 8, devyni: 9, devynetas: 9, dešimt: 10, dešimtukas: 10 };
function numIn(text, min, max) {
  const t = String(text || "").toLowerCase();
  const m = t.match(/\d+(?:[.,]\d+)?/);
  let n = m ? Math.round(Number(m[0].replace(",", "."))) : null;
  if (n == null) for (const w of t.split(/[^a-ząčęėįšųūž]+/)) if (w in NUM_WORDS) { n = NUM_WORDS[w]; break; }
  return n != null && n >= min && n <= max ? n : null;
}
const RED_FLAGS = /(breath|swallow|kvėp|ryti|spreading|plint|eye|neck|akis|kakl|won'?t stop|nesustoja|fever|karšč|temperat|knocked out|išmuš|swell|tin)/i;
const EMERGENCY = /(breath|swallow|kvėp|ryti|spreading|plint|to (my|the) eye|neck|akį|kakl|won'?t stop bleeding|nesustoja)/i;
function cleanName(t) {
  return String(t || "").replace(/^(hi|hello|hey|yes|labas|sveiki|taip)[,.!\s]+/i, "")
    .replace(/^(my name is|my name's|this is|it'?s|i am|i'm|mano vardas( yra)?|aš esu|čia)\s+/i, "")
    .replace(/[.!?,]+$/, "").trim().split(/\s+/).slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function newCall(phone) {
  const id = "c-" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  const pt = patientByPhone(phone);
  const c = {
    id, at: Date.now(), phone: String(phone || "").trim() || "Unknown number", patientId: pt ? pt.id : null, isNew: !pt,
    lang: settings.lang === "lt" ? "lt" : "en", engine: aiKey() ? "ai" : "script", provider: aiKey() ? settings.aiProvider : "",
    transcript: [], fields: { name: null, age: null, complaint: null, location: null, pain: null, urgency: null, preferred: null, notes: null },
    mood: null, moods: [], status: "live", step: pt ? "confirm" : "name", asked: {}, warned: false, turns: 0, deskNotes: [],
  };
  live[id] = c;
  const S = SCRIPT[c.lang], clinic = cfg("clinicName"), a = cfg("assistantName");
  const say = pt ? S.helloKnown(clinic, a, firstName(pt.name)) : S.hello(clinic, a);   // the greeting is instant: no AI wait
  c.transcript.push({ who: "reva", t: say, at: Date.now() });
  return { c, line: { say, fields: c.fields, mood: null, done: false } };
}

// The scripted receptionist: store the answer to the last question, then ask for the next missing detail.
function scriptTurn(c, text) {
  const S = SCRIPT[c.lang], f = c.fields, pt = c.patientId && patients.find(p => p.id === c.patientId);
  let pre = "";
  if (!c.warned && EMERGENCY.test(text)) { c.warned = true; pre = S.emergency + " "; }
  switch (c.step) {
    case "confirm":
      if (/\b(no|nope|not|ne|nė)\b/i.test(text)) { c.patientId = null; c.isNew = true; c.step = "name"; return { say: pre + S.who }; }
      if (pt) { f.name = pt.name; f.age = pt.age; }
      c.step = "complaint"; return { say: pre + S.known(firstName(f.name)) };
    case "name": f.name = cleanName(text) || null; break;
    case "age": f.age = numIn(text, 1, 110); if (f.age == null && !c.asked.age) { c.asked.age = 1; return { say: S.again }; } break;
    case "pain": f.pain = numIn(text, 0, 10); if (f.pain == null && !c.asked.pain) { c.asked.pain = 1; return { say: S.again }; } break;
    case "urgency": f.urgency = numIn(text, 1, 5); if (f.urgency == null && !c.asked.urgency) { c.asked.urgency = 1; return { say: S.again }; } break;
    default: if (FIELD_KEYS.includes(c.step)) f[c.step] = String(text).trim().slice(0, 300) || null;
  }
  c.asked[c.step] = 1;
  const next = ["name", "age", "complaint", "location", "pain", "urgency", "preferred", "notes"].find(k => !c.asked[k] && (f[k] == null || f[k] === ""));
  if (!next) { c.step = "done"; return { say: pre + S.bye(firstName(f.name)), done: true }; }
  c.step = next;
  return { say: pre + (next === "age" ? S.age(firstName(f.name)) : S[next]) };
}

const REVA_SYSTEM = (c) => {
  const a = cfg("assistantName"), clinic = cfg("clinicName");
  return `You are ${a}, the virtual receptionist of ${clinic}, a dental clinic in Vilnius, Lithuania. You are on a phone call with a caller.
Speak ${LANG_NAME[c.lang]}. Keep every reply short: one or two spoken sentences, one question at a time. No lists, no markdown, no emoji: your words are read aloud.
Collect for the front desk: the caller's full name, their age, the reason for the call, where it hurts (which tooth or side), the pain from 0 to 10, how urgent it feels to the caller from 1 (it can wait) to 5 (needs help today), the best time for a visit, and anything else that matters (swelling, fever, bleeding, medicines, allergies, pregnancy, a child as the patient).
If the caller is a known patient (see "patient"), confirm it's them by first name, don't ask for their name or age again, and refer to their history naturally when it helps.
Be warm and empathetic and acknowledge pain, but stay brief. Never diagnose, never give treatment advice and never promise an exact appointment time: the front desk will call back to confirm.
If the caller mentions trouble breathing or swallowing, swelling spreading towards the eye or neck, bleeding that won't stop or a serious injury, tell them to call 112 or go to the emergency room now, then finish the call.
When you have everything, or the caller wants to stop, or you have reached max_turns, say a short goodbye that says the front desk will call back, and set done to true.
Judge the caller's mood from what they say and how they say it.
Reply with JSON only, nothing else:
{"say": "your next words", "fields": {"name": string|null, "age": number|null, "complaint": string|null, "location": string|null, "pain": number|null, "urgency": number|null, "preferred": string|null, "notes": string|null}, "mood": {"label": "calm|cheerful|worried|anxious|in pain|frustrated|upset|unsure", "score": -2 to 2}, "done": true|false}
In fields give everything known so far, null when unknown, written in English.`;
};
function patientBrief(pt) {
  if (!pt) return null;
  const appts = (pt.appts || []).slice(-4).map(x => ({ when: new Date(x.at).toISOString().slice(0, 10), with: (docById(x.doctor) || {}).name || "", reason: x.reason, status: x.status }));
  return { name: pt.name, age: pt.age, patient_since: new Date(pt.since).toISOString().slice(0, 10), visits: appts, notes: (pt.notes || []).slice(0, 3).map(n => n.text) };
}
async function aiTurn(c, text) {
  const pt = c.patientId && patients.find(p => p.id === c.patientId);
  const ctx = {
    caller_phone: c.phone, patient: c.step === "confirm" || !c.isNew ? patientBrief(pt) : null,
    known_so_far: c.fields, turns: c.turns, max_turns: cfg("maxTurns"),
    call: c.transcript.slice(-cfg("transcriptKeep")).map(x => (x.who === "reva" ? cfg("assistantName") : "Caller") + ": " + x.t),
  };
  const raw = await aiCall(REVA_SYSTEM(c), JSON.stringify(ctx), 700, "call", c.provider || settings.aiProvider);
  const j = parseJSON(raw);
  if (!j || !j.say) throw new Error("Reva's reply was empty");
  return j;
}
function mergeFields(c, nf) {
  if (!nf) return;
  for (const k of FIELD_KEYS) {
    let v = nf[k];
    if (v == null || v === "") continue;
    if (k === "age") v = numIn(String(v), 0, 120);
    if (k === "pain") v = numIn(String(v), 0, 10);
    if (k === "urgency") v = numIn(String(v), 1, 5);
    if (v != null) c.fields[k] = typeof v === "string" ? v.slice(0, 300) : v;
  }
}
const cleanMood = m => m && MOODS[String(m.label || "").toLowerCase()] ? { label: String(m.label).toLowerCase(), score: Math.max(-2, Math.min(2, Number(m.score) || 0)), note: m.note ? String(m.note).slice(0, 80) : "" } : null;

// One answer from the caller → Reva's next line (AI, or the script when there's no key or AI fails).
async function callTurn(c, text) {
  c.transcript.push({ who: "caller", t: text, at: Date.now() });
  c.turns++;
  let out, fellBack = false;
  if (c.engine === "ai" && keyFor(c.provider || settings.aiProvider)) {
    try {
      const j = await aiTurn(c, text);
      mergeFields(c, j.fields);
      const was = c.patientId && patients.find(p => p.id === c.patientId);   // "No, this is his wife": not that patient
      if (was && c.fields.name && firstName(c.fields.name).toLowerCase() !== firstName(was.name).toLowerCase()) { c.patientId = null; c.isNew = true; }
      const md = cleanMood(j.mood);
      if (md) { c.mood = md; c.moods.push(md.score); }
      if (c.step === "confirm") c.step = "talk";
      out = { say: String(j.say).slice(0, 600), done: !!j.done };
    } catch (e) {
      fellBack = true; startLog("call: AI reply failed, using the script: " + String(e.message || e).slice(0, 120));
      if (c.step === "talk") c.step = FIELD_KEYS.find(k => c.fields[k] == null) || "notes";
      out = scriptTurn(c, text);
    }
  } else out = scriptTurn(c, text);
  if (!out.done && c.turns >= cfg("maxTurns")) out = { say: SCRIPT[c.lang].bye(firstName(c.fields.name)), done: true };
  c.transcript.push({ who: "reva", t: out.say, at: Date.now() });
  return { say: out.say, done: !!out.done, fields: c.fields, mood: c.mood, fellBack };
}

// ---------- after the call: a note for the front desk ----------
function triageOf(f, text) {
  if (EMERGENCY.test(text)) return "emergency";
  if ((f.pain || 0) >= 8 || (f.urgency || 0) >= 5 || /(swell|tin|fever|karšč|bleed|kraujav|broke|knocked|lūž|išmuš)/i.test(text)) return "urgent";
  if ((f.pain || 0) >= 5 || (f.urgency || 0) >= 4) return "soon";
  return "routine";
}
function specialtyOf(text) {
  if (/(brace|bracket|aligner|breket|kapel)/i.test(text)) return "ortho";
  if (/(wisdom|protin|extract|šalin|knocked|išmuš|broke|lūž|trauma|implant)/i.test(text)) return "surgery";
  if (/(throb|pulsuo|root canal|nerv|hot|cold|karšt|šalt|abscess|pūli|night|naktį)/i.test(text)) return "endo";
  if (/(clean|valym|check|patikr|whiten|balin|tartar|akmen)/i.test(text)) return "hygiene";
  if (/(child|son|daughter|kid|vaik|sūn|dukr)/i.test(text)) return "kids";
  return "general";
}
const doctorFor = spec => DOCTORS.find(d => d.spec[0] === spec) || DOCTORS.find(d => d.spec.includes(spec)) || DOCTORS[0];
const PRIORITY = { emergency: 5, urgent: 4, soon: 3, routine: 2 };
function templateSummary(c) {
  const f = c.fields, all = c.transcript.filter(x => x.who === "caller").map(x => x.t).join(" ") + " " + (f.complaint || "") + " " + (f.notes || "");
  const triage = triageOf(f, all), spec = specialtyOf(all), doc = doctorFor(spec);
  const bits = [
    `${c.isNew ? "New caller" : "Existing patient"} ${f.name || "(name not given)"}${f.age ? ", " + f.age : ""}.`,
    f.complaint ? `${f.complaint}${f.location ? " (" + f.location + ")" : ""}.` : "No reason given.",
    [f.pain != null ? `Pain ${f.pain}/10` : "", f.urgency != null ? `urgency ${f.urgency}/5` : ""].filter(Boolean).join(", ") + (f.pain != null || f.urgency != null ? "." : ""),
    f.preferred ? `Prefers ${f.preferred}.` : "", f.notes && !/^(no|nope|ne|nothing|nieko)\b/i.test(f.notes) ? `Also: ${f.notes}.` : "",
  ].filter(Boolean);
  const flags = [];
  if (EMERGENCY.test(all)) flags.push("Possible emergency signs");
  if (/(swell|tin)/i.test(all)) flags.push("Swelling");
  if (/(fever|karšč|temperat)/i.test(all)) flags.push("Fever");
  if (/(bleed|kraujav)/i.test(all)) flags.push("Bleeding");
  return { kind: "template", text: bits.join(" "), triage, priority: PRIORITY[triage], specialty: spec, doctor: doc.id,
    reason: String(f.complaint || "Call back").split(/\s+/).slice(0, 6).join(" "), flags, hint: `${f.preferred ? f.preferred.slice(0, 40) + " · " : ""}${doc.short}` };
}
async function aiSummary(c) {
  const pt = c.patientId && patients.find(p => p.id === c.patientId);
  const sys = `You write call notes for the front desk of a dental clinic. The receptionist reads them to book the right dentist. Be factual and brief; never invent details. Reply with JSON only.`;
  const user = JSON.stringify({
    caller_phone: c.phone, new_caller: c.isNew, patient: patientBrief(pt), details: c.fields,
    call: c.transcript.map(x => (x.who === "reva" ? "Receptionist" : "Caller") + ": " + x.t),
    specialties: SPECIALTIES, dentists: DOCTORS.map(d => ({ id: d.id, name: d.name, role: d.role, covers: d.spec })),
    reply_as: {
      summary: "2 to 3 sentences in English for the receptionist: who, what, how bad, when they can come",
      reason: "the reason in at most 6 words", triage: "emergency | urgent | soon | routine", priority: "1 to 5, 5 is most urgent",
      specialty: "one specialty id", doctor: "the best dentist id", flags: ["red flags such as swelling, fever, bleeding, trauma; empty if none"],
      hint: "a booking suggestion in at most 12 words", mood: { label: "calm|cheerful|worried|anxious|in pain|frustrated|upset|unsure", score: "-2 to 2", note: "at most 8 words on how the caller sounded" },
      fields: "the details object, corrected from the call, in English",
      intent: "why they called: new_visit (a new problem or a new visit), about_visit (a question about a visit already booked, such as when or with whom), change_visit (move or cancel a booked visit) or other",
    },
  });
  const j = parseJSON(await aiCall(sys, user, 900, "summary", c.provider || settings.aiProvider));
  const tpl = templateSummary(c);
  mergeFields(c, j.fields);
  const triage = TRIAGE.includes(j.triage) ? j.triage : tpl.triage;
  return {
    kind: "ai", provider: c.provider || settings.aiProvider, text: String(j.summary || tpl.text).slice(0, 700),
    triage, priority: Math.max(1, Math.min(5, Math.round(Number(j.priority) || PRIORITY[triage]))),
    specialty: SPECIALTIES[j.specialty] ? j.specialty : tpl.specialty, doctor: docById(j.doctor) ? j.doctor : tpl.doctor,
    reason: String(j.reason || tpl.reason).slice(0, 60), flags: Array.isArray(j.flags) ? j.flags.map(String).slice(0, 5) : tpl.flags,
    hint: String(j.hint || tpl.hint).slice(0, 100), mood: cleanMood(j.mood), intent: INTENTS.includes(j.intent) ? j.intent : "",
  };
}
// The call ends: link it to the patient (a new caller gets a record), write the note, keep it for the front desk.
async function finishCall(id) {
  const c = live[id];
  if (!c) return null;
  delete live[id];
  c.end = Date.now(); c.dur = Math.max(1, Math.round((c.end - c.at) / 1000));
  const said = c.transcript.filter(x => x.who === "caller").length;
  let pt = c.patientId && patients.find(p => p.id === c.patientId);
  if (!pt && c.fields.name) {
    pt = { id: "p-" + Date.now().toString(36), name: c.fields.name, age: c.fields.age || null, phone: c.phone, since: Date.now(), notes: [], appts: [] };
    patients.push(pt); c.patientId = pt.id; c.isNew = true;
  }
  if (pt && c.fields.age && !pt.age) pt.age = c.fields.age;
  let summary = null;
  if (c.engine === "ai" && settings.ai && said && keyFor(c.provider || settings.aiProvider)) {
    try { summary = await aiSummary(c); } catch (e) { startLog("call: AI summary failed: " + String(e.message || e).slice(0, 120)); }
  }
  if (!summary) summary = templateSummary(c);
  if (summary.mood) c.mood = summary.mood;
  delete summary.mood;
  if (c.engine !== "ai") c.mood = null;   // mood is only read by AI
  c.summary = summary;
  c.status = said ? "waiting" : "closed";   // a call nobody spoke on doesn't wait for the front desk
  delete c.step; delete c.asked; delete c.moods; delete c.warned;
  calls.unshift(c);
  if (calls.length > 300) calls.length = 300;
  saveAll(); saveWidget(widgetSnapshot());
  return c;
}

// ---------- the real phone line: calls ElevenLabs answered, collected from the Frontly bridge (bridge/worker.js) ----------
const lineUrl = () => String(settings.bridgeUrl || "").trim().replace(/\/+$/, "");
const lineOn = () => /^https:\/\/./.test(lineUrl()) && !!secretFor("bridge");
async function lineReq(method, path, body) {
  const r = new Request(lineUrl() + path);
  r.method = method; r.timeoutInterval = 12;
  r.headers = { "Authorization": "Bearer " + secretFor("bridge"), "Content-Type": "application/json" };
  if (body !== undefined) r.body = JSON.stringify(body);
  let j = null;
  try { j = await r.loadJSON(); } catch (e) { throw new Error("The bridge didn't answer: " + String(e.message || e).slice(0, 80)); }
  const code = (r.response && r.response.statusCode) || 0;
  if (code === 401) throw new Error("The bridge refused the token. Check that it matches APP_TOKEN.");
  if (code !== 200) throw new Error((j && j.error) || "The bridge answered HTTP " + code);
  return j || {};
}
// What Reva may know when a patient phones: name, age, the last visit. Pushed to the bridge after each check.
function patientsBrief() {
  return patients.filter(p => p.phone).map(p => {
    const last = (p.appts || []).filter(a => a.status === "done").sort((a, b) => b.at - a.at)[0];
    const next = (p.appts || []).filter(a => a.status === "booked" && a.at > Date.now()).sort((a, b) => a.at - b.at)[0];
    const d = x => new Date(x.at).toISOString().slice(0, 10);
    const history = [last ? `Last visit ${d(last)}: ${last.reason}` : "", next ? `Booked ${d(next)}: ${next.reason}` : ""].filter(Boolean).join(". ");
    const when = t => new Date(t).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    const appointments = (p.appts || []).filter(a => a.status === "booked" && a.at > Date.now()).sort((a, b) => a.at - b.at)
      .map(a => { const doc = docById(a.doctor) || {}; return `${when(a.at)} with ${doc.name || "a dentist"}${doc.role ? " (" + doc.role + ")" : ""}: ${a.reason || "visit"}`; }).join("; ");
    const w = calls.find(c => c.patientId === p.id && c.status === "waiting");
    const waiting = w ? `${(w.summary || {}).reason || (w.fields || {}).complaint || "a request"}, from ${when(w.at)}; the front desk will call back to book it` : "";
    return { name: p.name, age: p.age || null, phone: p.phone, history, appointments, waiting, message: p.message ? p.message.text : "", messageId: p.message ? p.message.id : "" };
  });
}
// Without an AI key or the agent's "intent", a guess from the call: questions about a booked visit vs. booking work
function guessIntent(c, pt) {
  const said = c.transcript.filter(x => x.who === "caller").map(x => x.t).join(" ");
  const booked = pt && (pt.appts || []).some(a => a.status === "booked" && a.at > Date.now());
  if (booked && /(cancel|reschedul|move (it|my)|another (day|time)|atšauk|perkel|pakeist)/i.test(said)) return "change_visit";
  if (booked && c.fields.pain == null && /(when|what time|which (doctor|dentist)|who (is|am)|kada|kelint|kokiu laiku|kuris|kuri gydytoj|pie kuri)/i.test(said)) return "about_visit";
  return "new_visit";
}
// One call from the bridge → a call at the front desk, filed under the caller's record, with Frontly's own note.
async function importPhoneCall(r) {
  if (!r || !r.id || calls.some(c => c.id === r.id)) return null;
  const c = {
    id: r.id, at: Number(r.at) || Date.now(), dur: Number(r.dur) || 0, phone: String(r.phone || "Unknown number"), source: "phone", engine: "phone",
    provider: String(r.provider || "phone"), lang: String(r.lang || ""), status: "waiting", deskNotes: [],
    transcript: (r.transcript || []).map(x => ({ who: x.who === "reva" ? "reva" : "caller", t: String(x.t || "").slice(0, 2000) })).filter(x => x.t),
    fields: { name: null, age: null, complaint: null, location: null, pain: null, urgency: null, preferred: null, notes: null },
    mood: cleanMood(r.mood),
  };
  c.end = c.at + c.dur * 1000;
  mergeFields(c, r.fields);
  let pt = patientByPhone(c.phone);
  if (pt && c.fields.name && firstName(c.fields.name).toLowerCase() !== firstName(pt.name).toLowerCase()) pt = null;   // someone else on that number
  if (!pt && c.fields.name) { pt = { id: "p-" + Date.now().toString(36) + Math.floor(Math.random() * 1e3), name: c.fields.name, age: c.fields.age || null, phone: c.phone, since: Date.now(), notes: [], appts: [] }; patients.push(pt); c.isNew = true; }
  else c.isNew = false;
  c.patientId = pt ? pt.id : null;
  if (pt && !c.fields.name) c.fields.name = pt.name;
  let summary = null;
  if (settings.ai && aiKey() && c.transcript.length) {
    try { summary = await aiSummary(Object.assign({}, c, { provider: settings.aiProvider })); }
    catch (e) { startLog("phone line: AI note failed: " + String(e.message || e).slice(0, 100)); }
  }
  if (!summary) { summary = templateSummary(c); if (r.summary) { summary.text = String(r.summary).slice(0, 700); summary.kind = "ai"; summary.provider = c.provider; } }
  if (summary.mood && !c.mood) c.mood = summary.mood;
  delete summary.mood;
  c.intent = summary.intent || (INTENTS.includes(r.intent) ? r.intent : "") || guessIntent(c, pt);
  delete summary.intent;
  c.summary = summary;
  // Only booking work waits at the front desk. A question is filed under the patient; a patient calling again about
  // a request that already waits is added to that request instead of queueing twice.
  const waiting = pt && calls.find(x => x.patientId === pt.id && x.status === "waiting");
  if (!c.transcript.some(x => x.who === "caller")) c.status = "closed";   // nobody spoke
  else if (c.intent === "about_visit" || c.intent === "other") c.status = "noted";
  else if (waiting) {
    c.status = "noted"; c.followUp = waiting.id;
    (waiting.again = waiting.again || []).push(c.id);
    const ws = waiting.summary || (waiting.summary = {});
    if ((summary.priority || 0) > (ws.priority || 0)) { ws.priority = summary.priority; ws.triage = summary.triage; }
    ws.flags = [...new Set([...(ws.flags || []), ...(summary.flags || [])])].slice(0, 5);
  }
  // The front desk's message for this patient: delivered when the agent says it passed it on (data collection "message_passed")
  if (pt && pt.message && r.messagePassed === true && (!r.messageId || r.messageId === pt.message.id)) {
    const m = Object.assign({}, pt.message, { delivered: c.at, callId: c.id });
    (pt.messages = pt.messages || []).unshift(m); pt.message = null; c.delivered = m.text;
  }
  calls.unshift(c);
  if (calls.length > 300) calls.length = 300;
  return c;
}
let lineBusy = false;
async function syncLine(manual) {
  if (!lineOn() || lineBusy || !dataLoaded) { if (manual && !lineOn()) toast("Set up the phone line in Settings first"); return; }
  lineBusy = true; call("onLine", true);
  let added = [];
  try {
    const j = await lineReq("GET", "/calls?since=" + (Number(settings.lineSince) || 0));
    if (j.phone) settings.linePhone = String(j.phone);
    for (const r of j.calls || []) {
      const c = await importPhoneCall(r);
      if (c) added.push(c);
      settings.lineSince = Math.max(Number(settings.lineSince) || 0, Number(r.at) || 0);
    }
    await lineReq("PUT", "/patients", patientsBrief());
    settings.lineLast = { at: Date.now(), ok: true, n: added.length };
  } catch (e) {
    settings.lineLast = { at: Date.now(), ok: false, msg: String(e.message || e).slice(0, 140) };
    startLog("phone line: " + settings.lineLast.msg);
    if (manual) toast(settings.lineLast.msg);
  }
  lineBusy = false;
  saveAll();
  if (added.length) { saveWidget(widgetSnapshot()); toast(added.length === 1 ? `New call from the phone line: ${added[0].fields.name || added[0].phone}` : `${added.length} new calls from the phone line`); }
  else if (manual && settings.lineLast.ok) toast("No new calls on the phone line");
  push(); call("onLine", false);
}
// Reva's instructions for the ElevenLabs agent, with the variables the bridge fills in when a call starts.
const PHONE_PROMPT = () => `You are ${cfg("assistantName")}, the virtual receptionist of ${cfg("clinicName")}, a dental clinic in Vilnius, Lithuania. You answer real phone calls.
Start in {{call_language}}: the bridge picks it from the caller's number (+370 Lithuanian, +371 Latvian, other countries English). If the caller answers in another of these three languages, switch to theirs. Keep every reply short: one or two spoken sentences, one question at a time.

What you know about the caller:
Known patient: {{patient_known}}. Name: {{patient_name}}. Age: {{patient_age}}. History: {{patient_history}}.
Booked visits: {{patient_appointments}}.
A request waiting for the front desk: {{patient_waiting}}.
A message from the front desk for this patient: {{patient_message}}.
If the patient is known, confirm it's them by first name and don't ask for their name or age again.

Find out first why they are calling, then do only what that needs:
1. A question about a visit already booked (when, what time, which dentist): answer from Booked visits: the day, the time and the dentist's name. Don't collect symptoms.
2. To move or cancel a booked visit: ask which visit and what they would like instead. You can't change bookings yourself: the front desk will call back.
3. A new problem or a new visit: collect the reason for the call, where it hurts (which tooth or side), the pain from 0 to 10, how urgent it feels to the caller from 1 (it can wait) to 5 (needs help today), the best time for a visit, and anything else that matters (swelling, fever, bleeding, medicines, allergies, pregnancy, a child as the patient). A new caller also gives their full name and age.
If a request is already waiting, tell them the front desk has it and will call back, and add anything new they tell you.
If there is a message from the front desk (not "none"), pass it on once you know you're speaking with the patient, in the caller's language, and make sure they understood it.

Be warm and empathetic and acknowledge pain, but stay brief. Never diagnose, never give treatment advice and never promise an exact time for a new visit: the front desk will call back to confirm.
If the caller mentions trouble breathing or swallowing, swelling spreading towards the eye or neck, bleeding that won't stop or a serious injury, tell them to call 112 or go to the emergency room now, then end the call.
When you're done, or the caller wants to stop, say a short goodbye (mention the call back only if the front desk needs to call) and end the call.`;

// ---------- front desk ----------
function bookCall(m) {
  const c = calls.find(x => x.id === m.id), doc = docById(m.doctor), at = Number(m.at);
  if (!c || !doc || !isFinite(at)) return "That booking couldn't be made";
  if (!settings.deskUser) return "Sign in to the front desk first";
  const taken = patients.some(p => (p.appts || []).some(a => a.doctor === doc.id && a.at === at && a.status === "booked"));
  if (taken) return "That time was just taken. Pick another one";
  let pt = c.patientId && patients.find(p => p.id === c.patientId);
  const move = pt && m.move && (pt.appts || []).find(a => a.id === m.move && a.status === "booked");
  const spec = (move && (move.spec || ruleOpts().specOf(move))) || (c.summary && c.summary.specialty) || doc.spec[0];
  const why = pt ? visitConflict(pt.appts, at, spec, ruleOpts(move && move.id)) : "";
  if (why) return why;
  if (!pt) { pt = { id: "p-" + Date.now().toString(36), name: c.fields.name || "Caller " + c.phone, age: c.fields.age || null, phone: c.phone, since: Date.now(), notes: [], appts: [] }; patients.push(pt); c.patientId = pt.id; }
  const reason = (move && move.reason) || (c.summary && c.summary.reason) || c.fields.complaint || "Visit";
  pt.appts = pt.appts || [];
  const a = { id: "a-" + Date.now().toString(36), at, doctor: doc.id, spec, reason, callId: c.id, status: "booked", by: settings.deskUser, made: Date.now() };
  pt.appts.push(a);
  if (move) {   // a change of booking moves the visit; the call that booked it shows where it went
    move.status = "moved"; move.movedTo = a.id; a.movedFrom = move.id;
    const oc = move.callId && calls.find(x => x.id === move.callId);
    if (oc && oc !== c && oc.booking) oc.booking.movedTo = at;
  }
  c.status = "booked"; c.booking = { doctor: doc.id, at, by: settings.deskUser, made: Date.now() };
  if (move) c.booking.movedFrom = move.at;
  return "";
}
function cancelAppt(m) {
  const pt = patients.find(p => p.id === m.patient), a = pt && (pt.appts || []).find(x => x.id === m.appt);
  if (!a) return;
  a.status = "cancelled";
  const c = a.callId && calls.find(x => x.id === a.callId);
  if (c && c.status === "booked") { c.status = "waiting"; delete c.booking; }
}
function addNote(m) {
  const text = String(m.text || "").trim().slice(0, 1000);
  if (!text) return false;
  const n = { at: Date.now(), by: settings.deskUser || "Front desk", text };
  const pt = patients.find(p => p.id === m.patient);
  if (pt) (pt.notes = pt.notes || []).unshift(n);
  const c = m.call && calls.find(x => x.id === m.call);
  if (c) (c.deskNotes = c.deskNotes || []).unshift(n);
  return !!(pt || c);
}

// The AI's booking plan for one call: the best of the times the page offers (free, within the rules), weighed against
// the urgency, what the caller asked for and the patient's other visits. The page only offers times that are allowed.
async function aiPlan(m) {
  const c = calls.find(x => x.id === m.id), pt = c && patients.find(p => p.id === c.patientId);
  if (!c) return;
  const cands = (m.candidates || []).filter(x => docById(x.doctor) && isFinite(+x.at)).slice(0, 36);
  if (!cands.length) throw new Error("No free times to choose from");
  const when = t => new Date(t).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const s = c.summary || {}, f = c.fields || {}, move = pt && m.move && (pt.appts || []).find(a => a.id === m.move);
  const sys = `You plan dental appointments for a clinic's front desk. Choose the best time from the candidates only. Weigh how urgent it is, what the caller asked for, the right dentist, and the patient's other visits: keep visits apart, and leave time to heal after surgery. Be brief and practical. Reply with JSON only.`;
  const user = JSON.stringify({
    today: when(Date.now()),
    request: { summary: s.text, reason: s.reason, triage: s.triage, priority: s.priority, specialty: SPECIALTIES[s.specialty] || s.specialty, preferred_time: f.preferred, notes: f.notes, moving_the_visit_on: move ? when(move.at) : null },
    patient_visits: pt ? (pt.appts || []).filter(a => a.at > Date.now() - 120 * DAY).map(a => ({ when: when(a.at), dentist: (docById(a.doctor) || {}).name, specialty: SPECIALTIES[ruleOpts().specOf(a)], reason: a.reason, status: a.status })) : [],
    clinic_rules: { days_between_visits: cfg("visitGapDays"), days_between_surgeries: cfg("surgeryGapDays") },
    candidates: cands.map((x, i) => ({ i, when: when(+x.at), dentist: docById(x.doctor).name, role: docById(x.doctor).role, matches_caller_preference: !!x.pref })),
    reply_as: { pick: "the i of the best candidate", why: "one or two sentences for the receptionist", warnings: ["anything to check with the patient before booking; empty if none"], alternatives: ["up to two other i, best first"] },
  });
  const j = parseJSON(await aiCall(sys, user, 600, "plan", settings.aiProvider));
  const pick = cands[Number(j.pick)];
  if (!pick) throw new Error("The AI didn't pick one of the offered times");
  c.plan = { doctor: pick.doctor, at: +pick.at, why: String(j.why || "").slice(0, 300), warnings: (Array.isArray(j.warnings) ? j.warnings : []).map(String).filter(Boolean).slice(0, 3),
    alts: (Array.isArray(j.alternatives) ? j.alternatives : []).map(i => cands[Number(i)]).filter(x => x && x !== pick).slice(0, 2).map(x => ({ doctor: x.doctor, at: +x.at })),
    provider: settings.aiProvider, made: Date.now(), move: m.move || "" };
}

// ---------- state sent to the UI ----------
function clientState() {
  return {
    patients, calls: calls.slice(0, 200),
    doctors: DOCTORS, specialties: SPECIALTIES, staff: DESK_STAFF, demoPin: DEMO_PIN, moods: MOODS,
    clinic: cfg("clinicName"), assistant: cfg("assistantName"),
    ai: {
      provider: settings.aiProvider,
      keys: Object.fromEntries(Object.keys(PROVIDERS).map(p => [p, maskKey(keyFor(p))])),
      model: Object.fromEntries(Object.keys(PROVIDERS).map(p => [p, modelFor(p)])),
      models: settings.models || {}, usage, today: dayKey(),
    },
    cfg: Object.fromEntries(CFG_FLAT.map(d => [d.k, cfg(d.k)])),
    cfgSchema: CONFIG.map(([title, items]) => ({ title, items })),
    settings: {
      ai: settings.ai, aiProvider: settings.aiProvider, hasKey: !!aiKey(), hasOpenAI: !!keyFor("openai"), checkUpdates: settings.checkUpdates !== false,
      lang: settings.lang === "lt" ? "lt" : "en", sttEngine: settings.sttEngine || "dictation", speechEngine: settings.speechEngine || "ai", handsFree: settings.handsFree !== false,
      ttsModel: settings.ttsModel || "gpt-4o-mini-tts", ttsVoice: settings.ttsVoice || "coral", ttsInstructions: settings.ttsInstructions || "", ttsDefaultInstr: TTS_DEFAULT_INSTR, voiceURI: settings.voiceURI || "", noDictation: settings.noDictation || {},
      deskUser: settings.deskUser || "", tab: settings.tab || "call", callFrom: settings.callFrom || "", patGroup: settings.patGroup || "status",
      theme: settings.theme, density: settings.density, font: settings.font, textSize: settings.textSize,
    },
    ttsModels: settings.ttsModels || null, palettes: PALETTES, version: VERSION, nativeShell: NATIVE_SHELL,
    blueprints: BLUEPRINTS, blueprintAbout: BLUEPRINT_ABOUT, appName: APP, now: Date.now(),
    secrets: Object.fromEntries(Object.keys(SECRETS).map(id => [id, { name: SECRETS[id].name, last4: (secretFor(id) || "").slice(-4) || null }])),
    line: { url: lineUrl(), on: lineOn(), phone: settings.linePhone || "", last: settings.lineLast || null, busy: lineBusy },
  };
}

const safeJSON = x => JSON.stringify(x === undefined ? null : x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029").replace(/<\//g, "<\\/");

// ---------- UI ----------
// The WebView is built in main() only, so a widget run never builds one (app-blueprints · widgets, Step 4).
let wv = null;
const call = (fn, ...args) => wv ? wv.evaluateJavaScript(`window.${fn} && window.${fn}(${args.map(safeJSON).join(",")})`, false).catch(() => {}) : Promise.resolve();
const toast = msg => call("toast", msg);
const push = () => call("recv", clientState());

// The caller's recorded answer waits in the page (window.__rec, base64); it comes over in slices.
async function pullRecording(n) {
  let b64 = "";
  for (let i = 0; i < n; i += 400000) b64 += await ev(`window.__rec ? window.__rec.slice(${i}, ${i + 400000}) : ""`, 15000);
  await ev(`window.__rec = ""`, 5000).catch(() => {});
  return b64;
}

async function handle(m) {
  switch (m.type) {
    // ── the call ──
    case "call-start": {
      const { c, line } = newCall(m.phone);
      settings.callFrom = c.phone; saveAll();
      return call("onCallStart", { id: c.id, phone: c.phone, engine: c.engine, provider: c.provider, lang: c.lang,
        patient: c.patientId ? patients.find(p => p.id === c.patientId) : null, at: c.at }, line);
    }
    case "call-say": {
      const c = live[m.id];
      if (!c) return;
      const text = String(m.text || "").trim().slice(0, 1200);
      if (!text) return;
      const out = await callTurn(c, text);
      if (out.fellBack) toast("AI didn't answer, so Reva carries on with her script (no AI)");
      return call("onReva", m.id, out);
    }
    case "listen": {   // iPhone dictation: the native dictation screen, then the words back to the page
      let text = "", err = "";
      const lang = settings.lang === "lt" ? "lt" : "en";
      try { text = String(await Dictation.start(lang === "lt" ? "lt-LT" : "en-US") || "").trim(); }
      catch (e) { err = String(e.message || e); }
      // iOS has no dictation for some languages (Lithuanian, 2026): remember it, so later answers go another way
      if (/not supported/i.test(err)) {
        settings.noDictation = Object.assign({}, settings.noDictation, { [lang]: true }); saveAll();
        startLog(`iPhone dictation doesn't support ${lang}: ${err.slice(0, 80)}`);
        await push();
        return call("onHeard", m.id, "", "unsupported");
      }
      return call("onHeard", m.id, text, err);
    }
    case "rec-done": {   // OpenAI transcription of what the page recorded
      let text = "", err = "";
      try { text = await aiTranscribe(await pullRecording(Number(m.n) || 0), String(m.mime || "audio/mp4")); }
      catch (e) { err = String(e.message || e); startLog("transcription failed: " + err.slice(0, 120)); }
      return call("onHeard", m.id, text, err);
    }
    case "call-end": {
      const c = await finishCall(m.id);
      push();
      return call("onCallSaved", m.id, c ? { id: c.id, summary: c.summary, mood: c.mood, fields: c.fields, isNew: c.isNew, dur: c.dur, status: c.status } : null);
    }
    case "ttsaudio":   // one line of Reva's AI voice, returned to the page as base64 MP3
      try { return call("__done", m.req, true, await aiSpeech(m.text)); }
      catch (e) { return call("__done", m.req, false, String(e.message || e)); }
    case "speak": if (m.text) Speech.speak(String(m.text).slice(0, 2000)); return;   // when the page can't speak
    // ── front desk ──
    case "signin":
      if (String(m.pin || "").trim() !== DEMO_PIN || !DESK_STAFF.includes(m.who)) return call("__done", m.req, false, "That PIN isn't right. The demo PIN is " + DEMO_PIN);
      settings.deskUser = m.who; saveAll(); push(); return call("__done", m.req, true, "");
    case "signout": settings.deskUser = ""; break;
    case "plan-ai": {
      try { await aiPlan(m); } catch (e) { toast("AI plan: " + String(e.message || e).slice(0, 120)); }
      saveAll(); push(); return call("__done", m.req, true, "");
    }
    case "book": {
      const err = bookCall(m);
      if (err) return call("__done", m.req, false, err);
      saveAll(); saveWidget(widgetSnapshot()); push(); return call("__done", m.req, true, "");
    }
    case "desk-close": { const c = calls.find(x => x.id === m.id); if (c) { c.status = "closed"; c.closedBy = settings.deskUser; } saveWidget(widgetSnapshot()); break; }
    case "desk-reopen": { const c = calls.find(x => x.id === m.id); if (c && (c.status === "closed" || c.status === "noted")) { c.status = "waiting"; delete c.followUp; } saveWidget(widgetSnapshot()); break; }
    case "note": if (addNote(m)) { saveAll(); toast("Note added"); return push(); } return;
    case "pat-msg": {   // a message Reva passes on when this patient next phones
      const pt = patients.find(p => p.id === m.patient), text = String(m.text || "").trim().slice(0, 500);
      if (!pt) return;
      pt.message = text ? { id: "m-" + Date.now().toString(36), text, by: settings.deskUser || "Front desk", at: Date.now() } : null;
      saveAll(); toast(text ? `${cfg("assistantName")} will pass it on when ${firstName(pt.name)} calls` : "Message removed"); push();
      if (lineOn()) lineReq("PUT", "/patients", patientsBrief()).catch(e => startLog("phone line: " + String(e.message || e).slice(0, 100)));
      return;
    }
    case "appt-cancel": cancelAppt(m); saveWidget(widgetSnapshot()); saveAll(); toast("Appointment cancelled"); return push();
    case "copy": if (m.text) { Pasteboard.copy(String(m.text)); toast("Copied"); } return;
    case "line-sync": return syncLine(true);
    case "line-call": if (settings.linePhone) Safari.open("tel:" + digits(settings.linePhone).replace(/^/, "+")); return;
    case "line-prompt": Pasteboard.copy(PHONE_PROMPT()); toast("Reva's instructions copied: paste them into the ElevenLabs agent's system prompt"); return;
    case "line-token-new": {   // a fresh random token: kept in the Keychain and copied once, to paste into Cloudflare as APP_TOKEN
      const t = (UUID.string() + UUID.string()).replace(/-/g, "").toLowerCase();
      Keychain.set(SECRETS.bridge.key, t); Pasteboard.copy(t);
      toast("New token copied: paste it into Cloudflare as the APP_TOKEN secret"); return push();
    }
    case "secret-set": if (SECRETS[m.v] && await askSecret(m.v)) toast(`${SECRETS[m.v].name} saved`); return push();
    case "secret-remove": if (SECRETS[m.v] && Keychain.contains(SECRETS[m.v].key)) { Keychain.remove(SECRETS[m.v].key); toast(`${SECRETS[m.v].name} removed`); } return push();
    case "demo-reset": {
      const d = demoData(); patients = d.patients; calls = d.calls;
      if (dataLoaded) { saveAll(); saveWidget(widgetSnapshot()); toast("The demo starts again: 3 patients, 1 call waiting"); }
      return push();
    }
    // ── shared: settings, AI, updates ──
    case "set":
      if (["theme", "density", "font", "textSize", "checkUpdates", "ai", "lang", "sttEngine", "speechEngine", "handsFree", "ttsVoice", "ttsModel", "ttsInstructions", "voiceURI", "tab", "callFrom", "patGroup"].includes(m.k)) settings[m.k] = m.v;
      if (m.k === "bridgeUrl") { const v = String(m.v || "").trim().replace(/\/+$/, ""); if (v !== settings.bridgeUrl) { settings.bridgeUrl = v; settings.lineSince = 0; settings.lineLast = null; settings.linePhone = ""; } saveAll(); push(); if (lineOn()) syncLine(true); return; }
      break;
    case "state": return push();
    case "update-later": pendingUpdate = null; snoozeUpdate(); return;   // asked again in 2 days
    case "update-now": {
      let ok = false, msg = "";
      try { msg = await applyUpdate(pendingUpdate); ok = true; pendingUpdate = null; }
      catch (e) { msg = String(e.message || e); }
      return call("__done", m.req, ok, msg);
    }
    case "startlog": {
      let txt = "";
      try { txt = FileManager.local().readString(LOG_PATH).split("\n").slice(-40).join("\n"); } catch (e) {}
      return call("__done", m.req, true, txt);
    }
    case "update-check": {
      const u = await checkForUpdate(true);
      await call("__done", m.req, true, u ? `Version ${u.latest} is available` : `You're on the latest version (${VERSION})`);
      if (u) { clearUpdateSnooze(); pendingUpdate = u; offerUpdate(); }
      return;
    }
    case "aikey": {
      const p = PROVIDERS[m.v] ? m.v : settings.aiProvider;
      if (await askKey(p)) {
        settings.ai = true; saveAll(); push();
        try { const n = await fetchModels(p); toast(`${PROVIDERS[p]} key saved — ${n} models available`); }
        catch (e) { toast(`Key saved, but checking it failed: ${String(e.message || e).slice(0, 70)}`); }
      }
      saveAll(); return push();
    }
    case "airm": { const p = m.v; if (PROVIDERS[p] && Keychain.contains(AI[p].key)) Keychain.remove(AI[p].key); toast(`${PROVIDERS[p]} key removed`); aiInviteKeyRemoved(); saveAll(); return push(); }
    case "aiinvite": aiInviteNote(m.v); return;   // AI invitation: shown, open, later or never
    case "aiprov": if (PROVIDERS[m.v]) settings.aiProvider = m.v; saveAll(); return push();
    case "aimodels":
      try { const n = await fetchModels(m.v); toast(`${n} ${PROVIDERS[m.v]} models found`); }
      catch (e) { toast(String(e.message || e).slice(0, 90)); }
      saveAll(); return push();
    case "aimodel": if (PROVIDERS[m.p] && m.v) { settings.model = settings.model || {}; settings.model[m.p] = m.v; toast(`${PROVIDERS[m.p]} now uses ${m.v}`); } saveAll(); return push();
    case "aitest": {
      const p = m.v, t0 = Date.now();
      try { await aiCall("Reply with the single word OK.", "Connection test.", 10, "test", p); toast(`${PROVIDERS[p]} works — ${modelFor(p)} answered in ${((Date.now() - t0) / 1000).toFixed(1)} s`); }
      catch (e) { toast(`${PROVIDERS[p]} test failed: ${String(e.message || e).slice(0, 80)}`); }
      return push();
    }
    case "cfg":
      if (m.k === "*") settings.cfg = {}; else setCfg(m.k, m.v);
      saveAll(); saveWidget(widgetSnapshot()); return push();
    case "usagereset": usage = { since: Date.now(), p: {} }; write("usage", usage); toast("Usage counters reset"); return push();
  }
  saveAll();
  if (m.type === "signout") push();
}

function buildWebView() {
  wv = new WebView();
  wv.shouldAllowRequest = req => {
    const u = req.url || "";
    if (u.startsWith(SCHEME)) {
      let m = {};
      try { m = JSON.parse(decodeURIComponent(u.split("?d=")[1] || "%7B%7D")); } catch (e) {}
      handle(m).catch(e => toast(String(e.message || e)));
      return false;
    }
    if (/^https?:/i.test(u)) { Safari.openInApp(u, false); return false; }
    return true;
  };
}

function clientApp() {
  let S = window.__INIT;
  const look = { theme: S.settings.theme || "auto", density: S.settings.density || "comfortable", font: S.settings.font || "sans", textSize: +S.settings.textSize || 1 };
  let tab = ["call", "desk", "patients"].includes(S.settings.tab) ? S.settings.tab : "call";
  let cfgOpen = false, cfgArmed = false, demoArmed = false;
  const cfgItem = k => { for (const sec of S.cfgSchema) for (const d of sec.items) if (d.k === k) return d; return null; };
  const cfgChanged = k => { const d = cfgItem(k); return d && JSON.stringify(S.cfg[k]) !== JSON.stringify(d.def); };
  const fmtCfg = (d, v) => d.step && d.step < 1 ? Number(v).toFixed(String(d.step).split(".")[1].length) : String(v);
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DAY = 864e5;

  // Settings › Built with: the shared blueprints this app follows. A tap shows what one is, from text bundled in the app.
  let bpOpen = null;   // a blueprint id, "*" for About blueprints, or null
  const BP_FIELDS = [["what", "What it is"], ["does", "What it does"], ["drives", "What it drives"], ["why", "Why it matters"]];
  const BP_ALL = {
    what: "Shared designs this app and its sister apps are built from, one for each part they have in common.",
    does: "Each one fixes how its part works: what you see, the words used, where data is kept and the safety rules.",
    drives: "Every row above; each says which version this app follows, and since which version of the app.",
    why: "A fix or improvement made once reaches every app the same way, so the apps stay alike and dependable.",
  };
  function builtWithHTML() {
    return `<h3 class="sec">Built with</h3><p class="hint">${esc(S.appName)} is built from shared blueprints that its sister apps use too. Tap one to see what it does.</p>
      ${S.blueprints.map(b => `<button class="srow bp" data-act="bpabout" data-v="${esc(b.id)}"><div class="grow"><b>${esc(b.name)}</b><small class="muted">Blueprint ${esc(b.version)} · since ${esc(S.appName)} ${esc(b.since)}</small></div><span class="chev" aria-hidden="true">›</span></button>`).join("")}
      <button class="srow bp" data-act="bpabout" data-v="*"><div class="grow"><b>About blueprints</b><small class="muted">What they are and why every app has them</small></div><span class="chev" aria-hidden="true">›</span></button>`;
  }
  function renderBp() {
    const el = $("#bpabout");
    const b = S.blueprints.find(x => x.id === bpOpen), a = bpOpen === "*" ? BP_ALL : b && (S.blueprintAbout || {})[b.id];
    el.classList.toggle("open", !!(a || b)); el.setAttribute("aria-hidden", a || b ? "false" : "true");
    if (!a && !b) return;   // closing: keep the old content while the card slides away
    el.innerHTML = `<div class="bp-dim" data-act="bpclose"></div>
      <div class="bp-card" role="dialog" aria-modal="true" aria-labelledby="bp-h">
        <div class="bp-top"><div class="grow"><small class="bp-kick">${b ? "Blueprint" : "Built with"}</small>
          <h2 id="bp-h">${esc(b ? b.name : "About blueprints")}</h2>
          ${b ? `<small class="muted">Blueprint ${esc(b.version)} · since ${esc(S.appName)} ${esc(b.since)}</small>` : ""}</div>
          <button class="link" data-act="bpclose">Done</button></div>
        ${a ? BP_FIELDS.map(([k, l]) => `<h3 class="bp-l">${l}</h3><p class="bp-p">${esc(a[k])}</p>`).join("")
            : `<p class="bp-p muted">This version of ${esc(S.appName)} carries no description of this blueprint.</p>`}
      </div>`;
    el.querySelector(".bp-card").scrollTop = 0;
  }
  // Settings blueprint: each section's rows in one card (.grp), built right after every render.
  function cardSections(body) {
    if (!body) return;
    var inSec = false, grp = null, kids = Array.prototype.slice.call(body.children);
    kids.forEach(function (n) {
      var c = n.classList;
      if (n.tagName === "H3" && c.contains("sec")) { inSec = true; grp = null; return; }
      if (!inSec || c.contains("grp") || c.contains("cfg-foot")) { grp = null; return; }
      if (!grp && n.tagName === "P" && c.contains("hint")) return;
      if (!grp) { grp = document.createElement("div"); grp.className = "grp"; body.insertBefore(grp, n); }
      grp.appendChild(n);
    });
  }
  const vseg = (k, opts) => `<div class="seg wide">${opts.map(([v, l]) => `<button class="${String(S.settings[k]) === String(v) ? "on" : ""}" data-act="setv" data-k="${k}" data-v="${v}">${l}</button>`).join("")}</div>`;
  const OAI_VOICES = [["alloy", "n"], ["ash", "m"], ["ballad", "m"], ["coral", "f"], ["echo", "m"], ["fable", "m"], ["nova", "f"], ["onyx", "m"], ["sage", "f"], ["shimmer", "f"], ["verse", "m"], ["marin", "f"], ["cedar", "m"]];
  const LEGACY_TTS = new Set(["alloy", "ash", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"]);
  function voiceHTML() {
    const st = S.settings;
    if (!st.hasOpenAI) return `<div class="srow"><div class="grow"><b>Reva's voice</b><small class="muted wrap">An iPhone voice. Add an OpenAI key in AI settings for a natural AI voice and transcription.</small></div></div>${deviceVoiceHTML()}${dictationOk() ? "" : `<div class="srow"><div class="grow"><b>How Reva hears you</b><small class="muted wrap">You type: iPhone dictation has no ${LANG_L[st.lang]}. An OpenAI key lets Reva transcribe you.</small></div></div>`}`;
    let html = `<div class="lk-row"><span class="lk-l">Reva's voice</span>${vseg("speechEngine", [["ai", "AI voice"], ["device", "iPhone voice"]])}</div>`;
    if (st.speechEngine === "ai") {
      const tm = (S.ttsModels && S.ttsModels.list) || [];
      const models = tm.length ? tm : [{ id: "gpt-4o-mini-tts" }, { id: "tts-1" }, { id: "tts-1-hd" }];
      const legacy = /^tts-1/.test(st.ttsModel);
      html += `<div class="srow col"><b>AI voice</b><small class="muted wrap">OpenAI speech. Each line Reva says is sent to OpenAI and counted under AI settings.</small>
        <select class="voicesel ttsvoicesel" aria-label="AI voice">${OAI_VOICES.filter(v => !legacy || LEGACY_TTS.has(v[0])).map(([v, g]) => `<option value="${v}" ${v === st.ttsVoice ? "selected" : ""}>${v[0].toUpperCase() + v.slice(1)}${g === "f" ? " (female)" : g === "m" ? " (male)" : ""}</option>`).join("")}</select>
        <select class="voicesel ttsmodelsel" aria-label="Speech model">${models.map(m => `<option value="${esc(m.id)}" ${m.id === st.ttsModel ? "selected" : ""}>${esc(m.id)}</option>`).join("")}</select>
        ${legacy ? "" : `<textarea class="cfgin wide ttsinstr" rows="3" placeholder="${esc(st.ttsDefaultInstr)}" aria-label="How Reva sounds">${esc(st.ttsInstructions)}</textarea><small class="muted wrap">How Reva sounds. Empty uses the default above.</small>`}
        <button class="sm" data-act="voicetest">Hear Reva</button></div>`;
    } else html += deviceVoiceHTML();
    html += dictationOk() ? `<div class="lk-row"><span class="lk-l">How Reva hears you</span>${vseg("sttEngine", [["dictation", "iPhone dictation"], ["openai", "OpenAI transcription"]])}</div>`
      : `<div class="srow"><div class="grow"><b>How Reva hears you</b><small class="muted wrap">OpenAI transcription: iPhone dictation has no ${LANG_L[st.lang]}.</small></div></div>`;
    return html;
  }
  function deviceVoiceHTML() {
    const lang = S.settings.lang === "lt" ? "lt" : "en";
    const list = voices.filter(v => String(v.lang || "").toLowerCase().startsWith(lang));
    return `<div class="srow col"><b>iPhone voice</b>${list.length ? `<select class="voicesel" aria-label="iPhone voice"><option value="">Best available</option>${list.map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === S.settings.voiceURI ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select>`
      : `<small class="muted wrap">No ${lang === "lt" ? "Lithuanian" : "English"} voices were found. Add one in iOS Settings › Accessibility › Spoken Content › Voices.</small>`}
      <button class="sm" data-act="voicetest">Hear Reva</button></div>`;
  }
  function renderCfg() {
    const el = $("#cfgsheet"), keepTop = el.scrollTop;
    el.classList.toggle("open", cfgOpen); lockBody();
    if (!cfgOpen) return;
    const field = d => {
      const v = S.cfg[d.k], ch = cfgChanged(d.k);
      const reset = ch ? `<button class="link small" data-act="cfgreset" data-k="${d.k}">Reset</button>` : "";
      const head = `<div class="cfg-h"><b>${esc(d.label)}</b>${reset}</div>${d.help ? `<small class="muted">${esc(d.help)}</small>` : ""}`;
      if (d.type === "text") return `<div class="cfg ${ch ? "ch" : ""}">${head}<input class="cfgin wide" data-k="${d.k}" value="${esc(v)}" autocorrect="off" spellcheck="false"></div>`;
      if (d.type === "lines") return `<div class="cfg ${ch ? "ch" : ""}">${head}<textarea class="cfgin wide" data-k="${d.k}" rows="${Math.max(4, v.length + 1)}">${esc(v.join("\n"))}</textarea></div>`;
      return `<div class="cfg ${ch ? "ch" : ""}">${head}
        <div class="stepper"><button data-act="cfgstep" data-k="${d.k}" data-v="-1" aria-label="Decrease" ${v <= d.min ? "disabled" : ""}>−</button>
        <input class="cfgin" data-k="${d.k}" value="${fmtCfg(d, v)}" inputmode="decimal" aria-label="${esc(d.label)}">
        <button data-act="cfgstep" data-k="${d.k}" data-v="1" aria-label="Increase" ${v >= d.max ? "disabled" : ""}>+</button>
        <span class="unit">${esc(d.unit || "")}</span><span class="range">${fmtCfg(d, d.min)}–${fmtCfg(d, d.max)}${ch ? ` — original ${fmtCfg(d, d.def)}` : ""}</span></div></div>`;
    };
    const changed = Object.keys(S.cfg).filter(cfgChanged).length;
    const st = S.settings, P = S.ai.usage.p[S.ai.provider];
    el.innerHTML = `<div class="sh-head"><h2>Settings</h2><button class="link" data-act="cfgclose">Done</button></div><div class="sh-body">
      <p class="hint">Changes apply right away and are kept on this iPhone.</p>
      <h3 class="sec">Appearance</h3>${lookHTML()}
      <h3 class="sec">Calls</h3>
      <div class="lk-row"><span class="lk-l">Language of the call</span>${vseg("lang", [["en", "English"], ["lt", "Lietuvių"]])}</div>
      ${voiceHTML()}
      <div class="srow"><div class="grow"><b>Listen when Reva stops talking</b><small class="muted wrap">Off: tap the microphone each time you answer</small></div><button class="switch ${st.handsFree ? "on" : ""}" data-act="toggle" data-v="handsFree" aria-label="Listen when Reva stops talking"></button></div>
      <div class="srow"><div class="grow"><b>AI settings</b><small class="muted wrap">${st.hasKey ? `${PN[S.ai.provider]} — ${esc(S.ai.model[S.ai.provider])}${P ? " — " + fmtN(P.in + P.out) + " tokens used" : ""}` : "Add a Claude or OpenAI key for a natural conversation, mood reading and call notes"}</small></div>
        <button class="sm ${st.hasKey ? "" : "primary"}" data-act="aiopen">AI settings</button></div>
      <h3 class="sec">Front desk</h3>
      <div class="srow"><div class="grow"><b>${st.deskUser ? "Signed in as " + esc(st.deskUser) : "Not signed in"}</b><small class="muted wrap">The receptionist's view of the calls Reva took</small></div>${st.deskUser ? `<button class="sm" data-act="signout">Sign out</button>` : `<button class="sm" data-act="gotab" data-v="desk">Sign in</button>`}</div>
      <h3 class="sec">Phone line</h3>${lineHTML()}
      <h3 class="sec">Demo</h3>
      <div class="srow"><div class="grow"><b>Start the demo again</b><small class="muted wrap">Puts back the three demo patients and the one waiting call. Every call and booking made since is removed.</small></div><button class="sm danger ${demoArmed ? "armed" : ""}" data-act="demoreset">${demoArmed ? "Confirm" : "Start again"}</button></div>
      <h3 class="sec">Updates</h3>
      ${S.nativeShell
        ? `<div class="srow"><div class="grow"><b>Updates</b><small class="muted wrap">You have Frontly ${esc(S.version)}. New versions come through the App Store (or TestFlight).</small></div></div>`
        : `<div class="srow"><div class="grow"><b>Offer new versions</b><small class="muted wrap">You have Frontly ${esc(S.version)}. “Later” waits two days.</small></div><button class="switch ${st.checkUpdates ? "on" : ""}" data-act="toggle" data-v="checkUpdates" aria-label="Offer new versions"></button></div>
      <div class="srow"><div class="grow"><b>Check for updates now</b><small id="updmsg" class="muted wrap" aria-live="polite"></small></div><button class="sm" data-act="updcheck">Check</button></div>`}
      <div class="srow"><div class="grow"><b>Start-up log</b><small class="muted wrap">What happened the last times Frontly opened</small></div><button class="sm" data-act="startlog">Show</button></div>
      <pre id="startlog" class="startlog" hidden></pre>
      ${S.cfgSchema.map(sec => `<h3 class="sec">${esc(sec.title)}</h3>${sec.items.map(field).join("")}`).join("")}
      <div class="aic-btns cfg-foot"><span class="note">${changed ? changed + " setting" + (changed === 1 ? "" : "s") + " changed" : "All settings are at their original values"}</span>
        ${changed ? `<button class="sm danger ${cfgArmed ? "armed" : ""}" data-act="cfgall">${cfgArmed ? "Confirm reset" : "Reset all"}</button>` : ""}</div>
      ${builtWithHTML()}
    </div>`;
    cardSections(el.querySelector(".sh-body"));
    el.scrollTop = keepTop;
  }
  let secArmed = null;
  function lineHTML() {
    const L = S.line || {}, tok = ((S.secrets || {}).bridge || {}).last4, last = L.last;
    const status = !L.url ? "Not set up. Calls to a real number need the Frontly bridge: see bridge/README.md in the repository."
      : !tok ? "Add the token next, so Frontly can collect calls."
      : !last ? "Not checked yet."
      : last.ok ? `Checked ${rel(last.at)}${L.phone ? " · callers dial " + L.phone : ""}` : "Last check failed: " + last.msg;
    return `<div class="srow col"><b>Bridge address</b><small class="muted wrap">Your Cloudflare Worker, for example https://frontly-bridge.you.workers.dev</small>
        <input class="cfgin wide linein" type="url" value="${esc(L.url || "")}" placeholder="https://…workers.dev" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Bridge address"></div>
      <div class="srow"><div class="grow"><b>Token</b><small class="muted wrap">${tok ? "Saved, ending …" + esc(tok) : "Not set"}. The bridge's APP_TOKEN, kept in the Keychain.</small></div>
        <button class="sm" data-act="secret-set" data-v="bridge">${tok ? "Change" : "Add"}</button>${tok ? `<button class="sm danger ${secArmed === "bridge" ? "armed" : ""}" data-act="secret-remove" data-v="bridge">${secArmed === "bridge" ? "Confirm" : "Remove"}</button>` : `<button class="sm" data-act="line-token-new">Make one</button>`}</div>
      <div class="srow"><div class="grow"><b>Status</b><small id="linemsg" class="muted wrap ${last && !last.ok ? "err" : ""}">${esc(status)}</small></div>${L.on ? `<button class="sm" data-act="line-sync">${L.busy ? "Checking…" : "Check now"}</button>` : ""}</div>
      <div class="srow"><div class="grow"><b>Reva's instructions</b><small class="muted wrap">The system prompt for the ElevenLabs agent that answers the real number, with the patient details the bridge fills in</small></div><button class="sm" data-act="line-prompt">Copy</button></div>`;
  }
  let aiOpen = false, aiArmed = null; const aiLoading = new Set();
  const PN = { anthropic: "Claude", openai: "OpenAI", elevenlabs: "ElevenLabs" };
  const FEAT = { call: "Conversation", summary: "Call notes", plan: "Booking plans", speech: "Reva's voice", listening: "Transcription", test: "Connection tests", other: "Other" };
  const fmtN = n => n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e4 ? Math.round(n / 1e3) + "k" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(n);
  function arm(key) { aiArmed = key; renderAI(); setTimeout(() => { if (aiArmed === key) { aiArmed = null; renderAI(); } }, 3500); }
  function usageBlock(p, P) {
    const days = [], now = new Date();
    for (let i = 13; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`); }
    const tot = k => { const x = P.days[k]; return x ? x.in + x.out : 0; };
    const max = Math.max(1, ...days.map(tot));
    const month = S.ai.today.slice(0, 7);
    const monthTot = Object.entries(P.days).filter(([k]) => k.startsWith(month)).reduce((n, [, x]) => n + x.in + x.out, 0);
    const rows = (obj, label) => Object.entries(obj).sort((x, y) => (y[1].in + y[1].out) - (x[1].in + x[1].out))
      .map(([k, x]) => `<tr><td>${esc(label(k))}</td><td>${x.calls}</td>${x.chars && !x.in ? `<td>${fmtN(x.chars)} chars</td><td>—</td>` : `<td>${fmtN(x.in)}</td><td>${fmtN(x.out)}</td>`}</tr>`).join("");
    return `<div class="ucard"><div class="aic-h"><b>${PN[p]}</b><span class="muted small">${P.calls} request${P.calls === 1 ? "" : "s"}</span></div>
      <div class="ustat"><div><b>${fmtN(P.in + P.out)}</b><small>total tokens</small></div><div><b>${fmtN(P.in)}</b><small>input</small></div><div><b>${fmtN(P.out)}</b><small>output</small></div></div>
      <p class="note">Today ${fmtN(tot(S.ai.today))} tokens — this month ${fmtN(monthTot)} tokens${P.chars ? ` — voice and transcription ${fmtN(P.chars)} characters` : ""}</p>
      <div class="ubars" aria-label="Tokens per day, last 14 days">${days.map(k => `<span style="height:${Math.max(tot(k) ? 6 : 2, tot(k) / max * 100)}%" class="${tot(k) ? "" : "zero"}" title="${k}: ${tot(k)} tokens"></span>`).join("")}</div>
      <div class="ubars-l"><span>2 weeks ago</span><span>Today</span></div>
      <table class="utab"><tr><th>Feature</th><th>Requests</th><th>In</th><th>Out</th></tr>${rows(P.features, k => FEAT[k] || k)}</table>
      <table class="utab"><tr><th>Model</th><th>Requests</th><th>In</th><th>Out</th></tr>${rows(P.models, k => k)}</table></div>`;
  }
  function renderAI() {
    const el = $("#aisheet"), keep = el.scrollTop;
    el.classList.toggle("open", aiOpen); lockBody();
    if (!aiOpen) return;
    const A = S.ai;
    const card = p => {
      const key = A.keys[p], ml = (A.models[p] || {}).list || [], cur = A.model[p];
      const opts = ml.some(m => m.id === cur) ? ml : [{ id: cur, name: cur }].concat(ml);
      return `<div class="aicard ${A.provider === p ? "active" : ""}">
        <div class="aic-h"><b>${PN[p]}</b>${A.provider === p ? `<span class="badge-ai">In use</span>` : key ? `<button class="sm" data-act="aiprov" data-v="${p}">Use ${PN[p]}</button>` : ""}</div>
        <div class="aic-row"><span class="lbl">API key</span>${key ? `<code>${esc(key)}</code>` : `<span class="muted">Not set</span>`}</div>
        <div class="aic-btns"><button class="sm ${key ? "" : "primary"}" data-act="aikey" data-v="${p}">${key ? "Change key" : "Add key"}</button>
          ${key ? `<button class="sm" data-act="aitest" data-v="${p}">Test connection</button><button class="sm danger ${aiArmed === "rm" + p ? "armed" : ""}" data-act="airm" data-v="${p}">${aiArmed === "rm" + p ? "Confirm" : "Remove"}</button>` : ""}</div>
        <label class="aic-row lbl" for="ms-${p}">Model</label>
        <select id="ms-${p}" class="modelsel" data-p="${p}">${opts.map(m => `<option value="${esc(m.id)}" ${m.id === cur ? "selected" : ""}>${esc(m.name)}${m.name !== m.id ? " — " + esc(m.id) : ""}</option>`).join("")}</select>
        <div class="aic-btns"><button class="sm" data-act="aimodels" data-v="${p}" ${key && !aiLoading.has(p) ? "" : "disabled"}>${aiLoading.has(p) ? "Loading…" : ml.length ? "Refresh model list" : "Load my models"}</button>
          <span class="note">${ml.length ? `${ml.length} models, updated ${rel(A.models[p].at)}` : key ? "Loads the models your key can use" : "Add a key to load models"}</span></div>
        ${p === "openai" ? `<p class="note">An OpenAI key also gives Reva an AI voice and transcribes what callers say, even when Claude is in use.</p>` : ""}
      </div>`;
    };
    const used = Object.keys(A.usage.p).filter(p => A.usage.p[p].calls);
    el.innerHTML = `<div class="sh-head"><h2>AI</h2><button class="link" data-act="aiclose">Done</button></div><div class="sh-body">
      <p class="hint">Keys stay in this iPhone's Keychain. Only the provider marked “In use” runs the conversation.</p>
      ${card("anthropic")}${card("openai")}
      <h3 class="sec">What AI does</h3>
      <div class="srow"><div class="grow"><b>Write a note when a call ends</b><small class="muted wrap">One request per call: summary, urgency, mood and the right dentist. Off: the note is put together without AI. Reva's conversation itself uses AI while you talk.</small></div><button class="switch ${S.settings.ai ? "on" : ""}" data-act="toggle" data-v="ai" aria-label="Write a note when a call ends"></button></div>
      <h3 class="sec">Token usage</h3>
      ${used.length ? used.map(p => usageBlock(p, A.usage.p[p])).join("") : `<p class="muted pad">No AI requests yet.</p>`}
      ${used.length ? `<div class="aic-btns"><span class="note">Counting since ${new Date(A.usage.since).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
        <button class="sm danger ${aiArmed === "reset" ? "armed" : ""}" data-act="usagereset">${aiArmed === "reset" ? "Confirm reset" : "Reset counters"}</button></div>` : ""}
    </div>`;
    el.scrollTop = keep;
  }
  // AI invitation hooks: open AI settings as the Settings row does (without its token-count refresh, whose re-render
  // would wipe the Add key pulse; the counts were handed over at start-up); never interrupt a call.
  window.__aiOpen = function () { aiOpen = true; renderAI(); };
  window.canInvite = function () { return !K.on; };

  // ---- appearance ----
  const THEMES = [["auto", "Auto"]].concat(Object.keys(S.palettes).map(k => [k, k[0].toUpperCase() + k.slice(1)]));
  const dark = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : { matches: false };
  function applyLook() {
    const root = document.documentElement;
    root.dataset.theme = look.theme === "auto" ? (dark.matches ? "night" : "ink") : look.theme;
    root.dataset.font = look.font;
    root.style.setProperty("--ts", look.textSize);
    document.body.classList.remove("d-comfortable", "d-compact", "d-tiny");
    document.body.classList.add("d-" + look.density);
  }
  const onDark = () => { if (look.theme === "auto") applyLook(); };
  if (dark.addEventListener) dark.addEventListener("change", onDark); else if (dark.addListener) dark.addListener(onDark);
  const segRow = (k, opts) => `<div class="seg wide">${opts.map(([v, l]) => `<button class="${String(look[k]) === String(v) ? "on" : ""}" data-act="look" data-k="${k}" data-v="${v}">${l}</button>`).join("")}</div>`;
  function lookHTML() {
    return `
      <div class="lk-row"><span class="lk-l">Colours</span><div class="sws">${THEMES.map(t => `
        <button class="sw ${look.theme === t[0] ? "on" : ""}" data-act="look" data-k="theme" data-v="${t[0]}" aria-label="${t[1]} colours">
          <span class="prev" style="${t[0] === "auto" ? `background:linear-gradient(135deg,${S.palettes.ink.paper} 50%,${S.palettes.night.sheet} 50%);color:${S.palettes.night.signal}` : `background:${S.palettes[t[0]].paper};color:${S.palettes[t[0]].ink}`}">Aa<i style="background:${(S.palettes[t[0]] || S.palettes.night).signal}"></i></span>
          <small>${t[1]}</small></button>`).join("")}</div></div>
      <div class="lk-row"><span class="lk-l">Layout</span>${segRow("density", [["comfortable", "Comfortable"], ["compact", "Compact"], ["tiny", "Tiny"]])}</div>
      <div class="lk-row"><span class="lk-l">Text size</span>${segRow("textSize", [[0.92, "Small"], [1, "Default"], [1.12, "Large"], [1.25, "Larger"]])}</div>
      <div class="lk-row"><span class="lk-l">Headline font</span>${segRow("font", [["sans", "Sans serif"], ["serif", "Serif"]])}</div>`;
  }

  // ---- bridge → Scriptable (queued so rapid taps aren't lost) ----
  const q = []; let flushing = false;
  const pending = {}; let reqN = 0;
  function send(type, data, cb) {
    const m = Object.assign({ type }, data);
    if (cb) { m.req = "r" + (++reqN); pending[m.req] = cb; }
    q.push(m); if (!flushing) flush();
  }
  window.__done = (req, ok, msg) => { const cb = pending[req]; delete pending[req]; if (cb) cb(ok, msg); };
  function flush() {
    const m = q.shift();
    if (!m) { flushing = false; return; }
    flushing = true;
    const url = "frontly://a?d=" + encodeURIComponent(JSON.stringify(m));
    if (window.__hostBridge) window.__hostBridge(url); else window.location.href = url;   // portable-bridge recipe
    setTimeout(flush, 80);
  }

  // ── AI invitation (app-blueprints · ai-invitation) ── ES5 style, as in the blueprint.
  window.__aiInvite = function (c) {
    var tries = 0;
    (function wait() {
      // Never over the launch screen, another sheet, or a task the app says can't be interrupted (a call).
      var busy = document.querySelector("#splash:not(.gone)") || document.getElementById("upd") || document.getElementById("aiinv") ||
        document.querySelector(".sheet.open, #cfgsheet.open, #aisheet.open") || (window.canInvite && !window.canInvite());
      if (busy) { if (++tries < 40) setTimeout(wait, 500); return; }   // gives up after 20 s; it comes back another day
      setTimeout(function () { if (!document.getElementById("aiinv")) showInvite(c); }, 600);
    })();
  };
  function escI(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  function showInvite(c) {
    var el = document.createElement("div");
    el.id = "aiinv";
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "aiinv-t");
    el.innerHTML = '<div class="aiinv-card">' +
      '<div class="aiinv-spark" aria-hidden="true">✦</div>' +
      '<h2 id="aiinv-t">' + escI(c.title) + '</h2>' +
      '<p class="aiinv-lead">Add an AI key and these switch on:</p>' +
      '<ul class="aiinv-perks">' + c.perks.slice(0, 3).map(function (p, i) {
        return '<li style="--i:' + i + '"><span class="aiinv-ico" aria-hidden="true">' + escI(p.icon) + '</span>' + escI(p.text) + '</li>';
      }).join("") + '</ul>' +
      '<ol class="aiinv-steps"><li>Get a key from Claude or OpenAI</li><li>Paste it in AI settings</li><li>That’s it: these turn on at once</li></ol>' +
      '<button class="aiinv-go" data-inv="open">Turn on AI</button>' +
      '<div class="aiinv-row"><button class="aiinv-later" data-inv="later">Later</button>' +
      '<button class="aiinv-never" data-inv="never">Don’t remind me again</button></div></div>';
    el.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-inv]") : null;
      if (!b && e.target !== el) return;      // taps inside the card do nothing
      closeInvite(b ? b.dataset.inv : "later");   // a tap on the dimmed backdrop counts as Later
    });
    document.body.appendChild(el);
    send("aiinvite", { v: "shown" });
    var go = el.querySelector(".aiinv-go"); if (go && go.focus) go.focus();
  }
  function closeInvite(what) {
    var el = document.getElementById("aiinv"); if (!el || el.classList.contains("out")) return;
    el.classList.add("out");
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
    send("aiinvite", { v: what });
    if (what === "open") setTimeout(function () {
      window.__aiOpen();   // the same thing the Settings row's "aiopen" action does
      var add = document.querySelector('#aisheet .aicard.active [data-act="aikey"]') || document.querySelector('#aisheet [data-act="aikey"]');
      if (add) { add.classList.add("aiinv-nudge"); if (add.scrollIntoView) add.scrollIntoView({ block: "center" }); setTimeout(function () { add.classList.remove("aiinv-nudge"); }, 2600); }
    }, 280);
  }

  // ── update pitch (app-blueprints · in-app-updates) ──
  window.__showUpdate = function (u) {
    if (!u || document.getElementById("upd")) return;
    var ov = document.createElement("div"); ov.id = "upd";
    var cards = (u.highlights || []).map(function (h) {
      return '<div class="updi"><span class="updic">' + escH(h.icon || "✨") + "</span><div><b>" +
        escH(h.title) + "</b><span>" + escH(h.text || "") + "</span></div></div>";
    }).join("");
    var more = u.skipped > 1 ? " (and " + (u.skipped - 1) + " more update" + (u.skipped > 2 ? "s" : "") + ")" : "";
    ov.innerHTML = '<div class="updp" role="dialog" aria-label="Update available">' +
      '<div class="updtag">New version ' + escH(u.latest) + "</div>" +
      '<h2 class="updt">' + escH(u.title || "An update is ready") + "</h2>" +
      '<div class="upds">You have ' + escH(u.current) + more + ". Here’s what you get:</div>" +
      '<div class="updl">' + cards + "</div>" +
      '<div class="updmsg" aria-live="polite"></div>' +
      '<button class="primary updgo" data-act="upd-now">Update now</button>' +
      '<button class="updlater" data-act="upd-later">Later, remind me in 2 days</button></div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) { if (e.target === ov) updLater(); });   // outside = Later
  };
  function escH(t) { var d = document.createElement("div"); d.textContent = String(t == null ? "" : t); return d.innerHTML; }
  function updLater() { var ov = document.getElementById("upd"); if (!ov) return; ov.remove(); send("update-later", {}); }
  function updNow(btn) {
    var ov = document.getElementById("upd"), msg = ov.querySelector(".updmsg"), later = ov.querySelector(".updlater");
    btn.disabled = true; btn.textContent = "Updating…"; later.hidden = true; msg.textContent = "";
    send("update-now", {}, function (ok, res) {
      if (ok) {
        ov.querySelector(".updtag").textContent = "Updated to " + res;
        msg.innerHTML = "<b>✓ Done.</b> Close Frontly and open it again to start using the new version.";
        btn.disabled = false; btn.textContent = "Got it"; btn.dataset.act = "upd-close";
      } else {
        msg.textContent = res || "Update failed"; btn.disabled = false; btn.textContent = "Try again"; later.hidden = false;
      }
    });
  }
  window.onLine = busy => { if (S.line) S.line.busy = !!busy; if (cfgOpen) renderCfg(); if (!K.on && !caseId && !patId && (tab === "call" || tab === "desk")) render(); };
  window.toast = msg => {
    const t = $("#toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(window.__tt); window.__tt = setTimeout(() => t.classList.remove("on"), 3200);
  };

  // ---- time helpers ----
  const pad2 = n => String(n).padStart(2, "0");
  const hhmm = ts => { const d = new Date(ts); return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); };
  const sod = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const dayLabel = ts => { const d0 = sod(Date.now()), d = sod(ts); return d === d0 ? "Today" : d === d0 + DAY ? "Tomorrow" : d === d0 - DAY ? "Yesterday" : new Date(ts).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }); };
  const whenFull = ts => dayLabel(ts) + ", " + hhmm(ts);
  function rel(ts) {
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    return Math.round(s / 86400) + " d ago";
  }
  const mmss = s => Math.floor(s / 60) + ":" + pad2(Math.floor(s % 60));

  // ── Reva's voice: an iPhone voice through the Web Speech API, or OpenAI's AI voice through one <audio> element ──
  const SYN = window.speechSynthesis;
  let voices = [];
  function loadVoices() { voices = SYN && SYN.getVoices ? SYN.getVoices() : []; if (cfgOpen) renderCfg(); }
  if (SYN) { loadVoices(); if ("onvoiceschanged" in SYN) SYN.onvoiceschanged = loadVoices; }
  const aiTTS = () => S.settings.speechEngine === "ai" && S.settings.hasOpenAI;
  const au = new Audio(); au.preload = "auto"; au.setAttribute("playsinline", "");
  // ── Sound with the Ring/Silent switch on (app-blueprints · audio-playback 1.0.2) ──
  // iOS mutes a page's sound while the switch is on, unless the page plays media. While the app is making sound
  // the user asked for, it declares itself a media player (navigator.audioSession, iOS 17+); for speech a looping
  // second of silence does the same on older iOS. Start inside a tap; stop with the sound.
  const silentWav = secs => {   // silence as an 8 kHz WAV data URI
    const n = Math.round(8000 * secs), buf = new Uint8Array(44 + n), dv = new DataView(buf.buffer);
    const w = (o, t) => { for (let i = 0; i < t.length; i++) buf[o + i] = t.charCodeAt(i); };
    w(0, "RIFF"); dv.setUint32(4, 36 + n, true); w(8, "WAVE"); w(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, "data"); dv.setUint32(40, n, true); buf.fill(128, 44);
    let str = ""; buf.forEach(b => { str += String.fromCharCode(b); }); return "data:audio/wav;base64," + btoa(str);
  };
  const keepAwake = new Audio(); keepAwake.loop = true; keepAwake.setAttribute("playsinline", "");
  let keepSrc = "", audioOffT = null;
  // kind: "speech" (Web Speech), "webaudio" (an AudioContext), "media" (the sound is an <audio> element itself:
  // iOS plays one media element at a time, so no silence loop next to it)
  function audioOn(kind) {
    clearTimeout(audioOffT);
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    if (kind === "media") return;
    try { if (!keepSrc) keepAwake.src = keepSrc = silentWav(1); const p = keepAwake.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  }
  function audioOff() {   // other apps' music can play again
    clearTimeout(audioOffT);
    try { keepAwake.pause(); } catch (e) {}
    try { if (navigator.audioSession) navigator.audioSession.type = "auto"; } catch (e) {}
  }
  const SILENT = silentWav(0.1);   // to unlock audio inside the tap
  function unlockAudio() { try { au.src = SILENT; const p = au.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
  const clean = t => String(t || "").replace(/\*\*|__|#+\s/g, "").replace(/\s+/g, " ").trim();
  function pickVoice() {
    const lang = S.settings.lang === "lt" ? "lt" : "en";
    const list = voices.filter(v => String(v.lang || "").toLowerCase().startsWith(lang));
    return list.find(v => v.voiceURI === S.settings.voiceURI) || list.find(v => /premium/i.test(v.name + v.voiceURI)) || list.find(v => /enhanced/i.test(v.name + v.voiceURI)) || list[0] || null;
  }
  let voiceTok = 0;
  function stopVoice() {
    voiceTok++;
    try { if (SYN) SYN.cancel(); } catch (e) {}
    try { au.onended = null; au.pause(); } catch (e) {}
  }
  function deviceSay(text, done, my) {
    const fin = () => { if (my === voiceTok) { my = -1; done(); } };
    if (!SYN || !window.SpeechSynthesisUtterance) {   // no Web Speech: Scriptable speaks, and the call goes on after a guess
      send("speak", { text }); setTimeout(fin, Math.min(15000, 900 + text.length * 70)); return;
    }
    const u = new SpeechSynthesisUtterance(clean(text)), v = pickVoice();
    if (v) u.voice = v;
    u.lang = S.settings.lang === "lt" ? "lt-LT" : "en-US";
    u.rate = 1; u.onend = fin; u.onerror = fin;
    try { SYN.cancel(); } catch (e) {}
    setTimeout(() => { if (my === voiceTok) SYN.speak(u); }, 60);   // iOS needs a beat after cancel()
  }
  function say(text, done) {
    stopVoice();
    const my = ++voiceTok;
    if (!aiTTS()) { audioOn("speech"); return deviceSay(text, done, my); }
    audioOn("media");
    send("ttsaudio", { text }, (ok, b64) => {
      if (my !== voiceTok) return;
      if (!ok) { toast(`AI voice failed: ${String(b64 || "").slice(0, 60)}. Using the iPhone voice.`); audioOn("speech"); return deviceSay(text, done, my); }
      au.onended = () => { if (my === voiceTok) { au.onended = null; done(); } };
      au.src = "data:audio/mpeg;base64," + b64;
      const pr = au.play();
      if (pr && pr.catch) pr.catch(() => { if (my === voiceTok) deviceSay(text, done, my); });
    });
  }

  // ── the call ──
  // K is the call on screen. phase: ring, reva (speaking), idle (waiting for the caller), listen, think, ending, saved
  let K = { on: false };
  const FIELD_ROWS = [["name", "Name"], ["age", "Age"], ["complaint", "Reason"], ["location", "Where"], ["pain", "Pain"], ["urgency", "Urgency"], ["preferred", "Best time"], ["notes", "Also"]];
  const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  // iPhone dictation, unless this language has none on the iPhone: then OpenAI transcription, or typing without an OpenAI key
  const dictationOk = () => !(S.settings.noDictation || {})[S.settings.lang];
  const sttAI = () => S.settings.hasOpenAI && (S.settings.sttEngine === "openai" || !dictationOk());
  const LANG_L = { en: "English", lt: "Lithuanian" };
  function typeInstead(why) {
    K.phase = "idle"; K.typing = true; K.focusType = true; renderCall();
    if (!K.typeHint) { K.typeHint = true; toast(why); }
  }
  function startCall(phone) {
    if (K.on) return;
    unlockAudio(); audioOn(aiTTS() ? "media" : "speech");   // inside the tap, so iOS lets Reva speak
    K = { on: true, id: "", phase: "ring", lines: [], fields: {}, mood: null, fresh: {}, phone, patient: null, engine: "", at: Date.now(), saved: null, typing: false };
    renderCall();
    send("call-start", { phone });
    clearInterval(window.__ct); window.__ct = setInterval(tickCall, 1000);
  }
  window.onCallStart = (info, line) => {
    if (!K.on || K.id) return;
    Object.assign(K, { id: info.id, engine: info.engine, provider: info.provider, patient: info.patient, phone: info.phone, at: Date.now() });
    renderCall();
    setTimeout(() => revaSays(line), 1100);   // a ring, then she answers
  };
  function revaSays(out) {
    if (!K.on) return;
    K.lines.push({ who: "reva", t: out.say });
    setFields(out.fields, out.mood);
    K.phase = "reva"; renderCall();
    say(out.say, () => afterReva(out.done));
  }
  function afterReva(done) {
    if (!K.on || K.phase === "ending" || K.phase === "saved") return;
    if (done) return endCall();
    K.phase = "idle"; renderCall();
    if (S.settings.handsFree) setTimeout(() => { if (K.on && K.phase === "idle") listen(); }, (S.cfg.listenDelay || 0) * 1000);
  }
  function setFields(f, mood) {
    if (f) for (const [k] of FIELD_ROWS) if (f[k] != null && f[k] !== "" && f[k] !== K.fields[k]) { K.fields[k] = f[k]; K.fresh[k] = Date.now(); }
    if (mood) { if (!K.mood || K.mood.label !== mood.label) K.fresh.mood = Date.now(); K.mood = mood; }
  }
  function listen() {
    if (!K.on || !K.id || ["think", "listen", "ending", "saved"].includes(K.phase)) return;
    stopVoice();
    if (sttAI() && canRecord()) return startRecording();
    if (!dictationOk()) return typeInstead(`iPhone dictation has no ${LANG_L[S.settings.lang]}, so type your answer.${S.settings.hasOpenAI ? "" : " An OpenAI key lets Reva transcribe you instead."}`);
    K.phase = "listen"; K.rec = null; renderCall();
    send("listen", { id: K.id });
  }
  window.onHeard = (id, text, err) => {
    // Dictation's answer counts while listening; a transcription's while it's being turned into text
    if (!K.on || id !== K.id || !(K.phase === "listen" || (K.phase === "think" && K.transcribing))) return;
    K.transcribing = false;
    if (err === "unsupported") {   // found out just now: the state that says so came first, so this takes the other way
      K.phase = "idle";
      if (sttAI() && canRecord()) { toast(`iPhone dictation has no ${LANG_L[S.settings.lang]}, so OpenAI transcribes you instead`); return startRecording(); }
      return typeInstead(`iPhone dictation has no ${LANG_L[S.settings.lang]}, so type your answer.${S.settings.hasOpenAI ? "" : " An OpenAI key lets Reva transcribe you instead."}`);
    }
    if (!text) {
      K.phase = "idle"; renderCall();
      if (err && !/cancel/i.test(err)) toast("Didn't catch that: " + String(err).slice(0, 60) + ". Tap the microphone or type.");
      return;
    }
    K.phase = "idle";   // a transcription arrives while the screen says "Turning your answer into text…"
    callerSays(text);
  };
  function callerSays(text) {
    text = String(text || "").trim();
    if (!text || !K.on || !K.id || ["think", "ending", "saved"].includes(K.phase)) return;
    stopVoice(); stopRecording(true);
    K.lines.push({ who: "caller", t: text });
    K.phase = "think"; renderCall();
    send("call-say", { id: K.id, text });
  }
  window.onReva = (id, out) => { if (K.on && id === K.id) revaSays(out); };
  // OpenAI transcription: record in the page, hand the audio to Scriptable as base64 (window.__rec)
  function startRecording() {
    K.phase = "listen"; K.rec = { chunks: [], live: false }; renderCall();
    try { if (navigator.audioSession) navigator.audioSession.type = "play-and-record"; } catch (e) {}
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      if (!K.on || !K.rec) { stream.getTracks().forEach(t => t.stop()); return; }
      const mr = new MediaRecorder(stream);
      K.rec.mr = mr; K.rec.stream = stream; K.rec.live = true;
      mr.ondataavailable = e => { if (e.data && e.data.size) K.rec.chunks.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
        const r = K.rec; K.rec = null;
        if (!r || r.drop || !K.on) return;
        const blob = new Blob(r.chunks, { type: mr.mimeType || "audio/mp4" });
        if (blob.size < 2000) { K.phase = "idle"; renderCall(); toast("That was too short. Tap the microphone and answer."); return; }
        const fr = new FileReader();
        fr.onload = () => {
          const b64 = String(fr.result).split(",")[1] || "";
          window.__rec = b64; K.phase = "think"; K.transcribing = true; renderCall();
          send("rec-done", { id: K.id, n: b64.length, mime: blob.type || "audio/mp4" });
        };
        fr.readAsDataURL(blob);
      };
      mr.start(); K.rec.auto = watchSilence(stream); renderCall();
    }).catch(() => {
      K.rec = null;
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
      if (!dictationOk()) return typeInstead("Scriptable didn't let the page use the microphone, and iPhone dictation has no " + LANG_L[S.settings.lang] + ", so type your answer.");
      toast("The microphone isn't available here, so iPhone dictation listens instead");
      K.phase = "listen"; renderCall();
      send("listen", { id: K.id });
    });
  }
  // Ends the answer by itself: once the caller has spoken and then paused (Settings › Calls › Stop listening after a pause of),
  // after 10 s of silence from the start, or after 45 s in any case. Without Web Audio the caller taps Done.
  function watchSilence(stream) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      const ctx = new AC(), an = ctx.createAnalyser();
      an.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize), t0 = Date.now(), r = K.rec;
      let heard = false, quietSince = 0, floor = 0.01;
      const iv = setInterval(() => {
        const done = () => { clearInterval(iv); try { ctx.close(); } catch (e) {} };
        if (K.rec !== r || !r.live) return done();
        an.getByteTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; sum += x * x; }
        const rms = Math.sqrt(sum / buf.length), now = Date.now();
        if (now - t0 < 300) floor = Math.max(floor, rms);   // the room's own noise, from the first moment
        if (rms > Math.max(0.035, floor * 2.5)) { heard = true; quietSince = 0; }
        else if (heard && !quietSince) quietSince = now;
        const pause = (S.cfg.silenceStop || 1.2) * 1000;
        if ((heard && quietSince && now - quietSince > pause) || (!heard && now - t0 > 10000) || now - t0 > 45000) { done(); stopRecording(false); }
      }, 100);
      return true;
    } catch (e) { return false; }
  }
  function stopRecording(drop) {
    const r = K.rec;
    if (!r || !r.mr) return;
    if (drop) r.drop = true;
    try { if (r.mr.state !== "inactive") r.mr.stop(); } catch (e) {}
  }
  function endCall() {
    if (!K.on || K.phase === "ending" || K.phase === "saved") return;
    stopVoice(); stopRecording(true);
    if (!K.id) { closeCall(); return; }   // hung up while it was still ringing
    K.phase = "ending"; renderCall();
    send("call-end", { id: K.id });
  }
  window.onCallSaved = (id, c) => {
    if (!K.on || id !== K.id) return;
    clearInterval(window.__ct); audioOff();
    K.phase = "saved"; K.saved = c; K.dur = c ? c.dur : Math.round((Date.now() - K.at) / 1000);
    renderCall();
  };
  function closeCall() {
    stopVoice(); stopRecording(true); clearInterval(window.__ct); audioOff();
    K = { on: false }; renderCall(); render();
  }
  function tickCall() { const t = $("#ctime"); if (t && K.on && K.phase !== "saved") t.textContent = mmss((Date.now() - K.at) / 1000); }

  const MIC_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>`;
  const KEYS_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M7 10h.01M10.5 10h.01M14 10h.01M17.5 10h.01M8 14h8"/></svg>`;
  const HANG_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.2 13.6c4.9-4.4 12.7-4.4 17.6 0 .6.6.6 1.5 0 2.1l-1.6 1.6c-.5.5-1.3.5-1.9.1l-2-1.4c-.4-.3-.6-.7-.6-1.2v-1.6a12 12 0 0 0-5.4 0v1.6c0 .5-.2.9-.6 1.2l-2 1.4c-.6.4-1.4.4-1.9-.1l-1.6-1.6c-.6-.6-.6-1.5 0-2.1z"/></svg>`;
  const PHONE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5h2.6l1.4 4.1-2 1.4a12.5 12.5 0 0 0 6.4 6.4l1.4-2 4.1 1.4v2.6c0 1-.8 1.8-1.8 1.8A16.2 16.2 0 0 1 4.8 5.3c0-1 .8-1.8 1.8-1.8z"/></svg>`;
  function phaseText() {
    const a = S.assistant;
    return { ring: "Calling…", reva: `${a} is speaking`, idle: "Your turn to answer", listen: K.rec ? (K.rec.live ? (K.rec.auto ? "Listening. Just stop talking when you're done" : "Recording. Tap when you're done") : "Opening the microphone…") : "Listening…",
      think: K.transcribing ? "Turning your answer into text…" : `${a} is thinking…`, ending: "Writing the note for the front desk…", saved: "Call ended" }[K.phase] || "";
  }
  function micBtn() {
    const ph = K.phase, rec = K.rec && K.rec.live;
    const label = ph === "reva" ? "Interrupt and answer" : ph === "idle" ? "Answer" : rec ? "Done" : ph === "listen" ? "Listening" : "Wait";
    const dis = ["ring", "think", "ending"].includes(ph) || (ph === "listen" && !rec);
    return `<button class="cbtn mic ${ph === "listen" ? "live" : ""}" data-act="mic" ${dis ? "disabled" : ""} aria-label="${label}">${MIC_SVG}<small>${label}</small></button>`;
  }
  function fieldVal(k, v) {
    if (v == null || v === "") return "";
    if (k === "pain") return `<span class="meter" style="--v:${Math.max(0, Math.min(10, v)) * 10}%"><i></i></span><b>${v}/10</b>`;
    if (k === "urgency") return `<span class="dots">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= v ? "on" : ""}"></i>`).join("")}</span><b>${v}/5</b>`;
    return esc(v);
  }
  function intakeHTML() {
    const now = Date.now(), fresh = k => K.fresh[k] && now - K.fresh[k] < 1800 ? "fresh" : "";
    const known = K.patient;
    return `<div class="intake" aria-label="What ${esc(S.assistant)} has noted">
      <div class="in-h"><b>${esc(S.assistant)}'s notes</b><span>${known ? "Patient record found" : K.id ? "New caller" : ""}</span></div>
      <div class="in-row"><span class="in-l">Phone</span><span class="in-v">${esc(K.phone)}${known ? ` <em class="tag ok">✓ ${esc(known.name)}</em>` : ""}</span></div>
      ${K.engine === "ai" ? `<div class="in-row ${K.mood ? "has" : ""} ${fresh("mood")}"><span class="in-l">Mood</span><span class="in-v">${K.mood ? `${S.moods[K.mood.label] || ""} ${esc(K.mood.label)} <em class="tag ai">✦ AI</em>` : `<i class="in-wait"></i>`}</span></div>` : ""}
      ${FIELD_ROWS.map(([k, l]) => { const v = fieldVal(k, K.fields[k]); return `<div class="in-row ${v ? "has" : ""} ${fresh(k)}"><span class="in-l">${l}</span><span class="in-v">${v || `<i class="in-wait"></i>`}</span></div>`; }).join("")}
    </div>`;
  }
  function savedHTML() {
    const c = K.saved;
    if (!c) return `<div class="c-saved"><h3>The call ended</h3><p>Nothing was said, so there's nothing for the front desk.</p><button class="primary block" data-act="callclose">Close</button></div>`;
    const s = c.summary || {};
    return `<div class="c-saved">
      <h3>${c.status === "waiting" ? "Ready for the front desk" : "The call ended"}</h3>
      <p class="muted">${mmss(c.dur || 0)} · ${c.isNew ? "new patient record made" : "added to the patient's record"}</p>
      ${s.text ? `<div class="sumbox">${s.kind === "ai" ? `<span class="badge-ai">✦ AI note by ${PN[s.provider] || "AI"}</span>` : `<span class="badge-ex">Note · no AI</span>`}
        <p>${esc(s.text)}</p><div class="chips">${triagePill(s.triage)}${c.mood ? `<span class="pill">${S.moods[c.mood.label] || ""} ${esc(c.mood.label)}</span>` : ""}${s.specialty ? `<span class="pill">${esc(S.specialties[s.specialty] || s.specialty)}</span>` : ""}</div></div>` : ""}
      <button class="primary block" data-act="callsee" data-id="${esc(c.id)}">Open it as the receptionist</button>
      <button class="ghost block" data-act="callclose">Close</button></div>`;
  }
  function renderCall() {
    const el = $("#callsheet");
    el.classList.toggle("open", !!K.on); lockBody(); document.body.classList.toggle("calling", !!K.on);
    if (!K.on) { el.innerHTML = ""; return; }
    const keepLog = el.querySelector(".c-log"), atEnd = !keepLog || keepLog.scrollHeight - keepLog.scrollTop - keepLog.clientHeight < 40, keepTop = keepLog ? keepLog.scrollTop : 0;
    const a = S.assistant, saved = K.phase === "saved";
    const oldIn = el.querySelector("#ctext"), typed = oldIn ? oldIn.value : "", hadFocus = oldIn && document.activeElement === oldIn;
    el.innerHTML = `<div class="c-top">
        <div class="c-av ${K.phase === "reva" ? "talk" : ""} ${K.phase === "ring" ? "ring" : ""}" aria-hidden="true">${esc(a.charAt(0))}</div>
        <div class="grow"><b>${esc(S.clinic)}</b><small>${esc(a)} · virtual receptionist${K.engine === "ai" ? ` · ✦ AI by ${PN[K.provider] || "AI"}` : K.engine ? " · script, no AI" : ""}</small></div>
        <span id="ctime" class="c-time">${saved ? mmss(K.dur || 0) : mmss((Date.now() - K.at) / 1000)}</span></div>
      <div class="c-phase" role="status" aria-live="polite">${K.phase === "reva" ? `<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>` : ["think", "ending", "ring"].includes(K.phase) ? `<span class="busy-dot"></span>` : ""}${esc(phaseText())}</div>
      <div class="c-body">
        <div class="c-log">${K.lines.map(l => `<p class="bub ${l.who}">${esc(l.t)}</p>`).join("") || `<p class="c-empty">Ringing ${esc(S.clinic)}…</p>`}</div>
        ${saved ? savedHTML() : intakeHTML()}
      </div>
      ${saved ? "" : `${K.typing ? `<div class="c-type"><input id="ctext" type="text" placeholder="Type your answer" enterkeyhint="send" autocomplete="off"><button class="sm primary" data-act="ctsend">Send</button></div>` : ""}
      <div class="c-ctrl">
        <button class="cbtn" data-act="ctype" aria-pressed="${!!K.typing}" aria-label="Type instead">${KEYS_SVG}<small>Type</small></button>
        ${micBtn()}
        <button class="cbtn hang" data-act="hangup" aria-label="End call">${HANG_SVG}<small>End</small></button>
      </div>`}`;
    const log = el.querySelector(".c-log");
    if (log) log.scrollTop = atEnd ? log.scrollHeight : keepTop;
    if (K.typing && !saved) { const i = $("#ctext"); if (i) { i.value = typed; if (hadFocus || K.focusType) { K.focusType = false; i.focus(); } } }
  }

  // ── main screens: Call, Front desk, Patients ──
  const byCall = id => S.calls.find(c => c.id === id);
  const byPatient = id => S.patients.find(p => p.id === id);
  const docOf = id => S.doctors.find(d => d.id === id);
  const waiting = () => S.calls.filter(c => c.status === "waiting");
  const TRIAGE_L = { emergency: "Emergency", urgent: "Urgent", soon: "Soon", routine: "Routine" };
  const triagePill = t => t ? `<span class="pill tri-${esc(t)}">${TRIAGE_L[t] || esc(t)}</span>` : "";
  const initials = n => String(n || "?").trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join("").toUpperCase();
  const callName = c => (c.fields && c.fields.name) || ((byPatient(c.patientId) || {}).name) || c.phone;
  const tabs = () => [["call", "Call"], ["desk", "Front desk"], ["patients", "Patients"], ["cal", "Calendar"]];
  function setTab(v) {
    if (!["call", "desk", "patients", "cal"].includes(v)) return;
    tab = v; send("set", { k: "tab", v }); render(); scrollTo(0, 0);
  }
  function renderChrome() {
    const n = waiting().length;
    $("#status").textContent = `${S.clinic} · ${n ? n + " call" + (n === 1 ? "" : "s") + " to book" : "no calls waiting"}`;
    $("#tabs").innerHTML = tabs().map(([v, l]) => `<button class="tab ${tab === v ? "on" : ""}" data-act="tab" data-v="${v}" aria-current="${tab === v ? "page" : "false"}">${l}${v === "desk" && n ? `<i>${n}</i>` : ""}</button>`).join("");
    const top = $("#top"); if (top) document.documentElement.style.setProperty("--hh", top.offsetHeight + "px");
  }
  function render() {
    applyLook(); renderChrome();
    const el = $("#list");
    el.innerHTML = tab === "desk" ? deskHTML() : tab === "patients" ? patientsHTML() : tab === "cal" ? calHTML() : callTabHTML();
    if (tab === "patients") { const qi = $("#pq"); if (qi) qi.value = pq; }
  }

  // Call tab: pick who's calling, then ring the clinic
  let newNumber = "";
  function callTabHTML() {
    const st = S.settings, cur = st.callFrom || "";
    const known = S.patients.filter(p => p.phone);
    const isKnown = known.some(p => p.phone === cur);
    if (!newNumber) newNumber = !isKnown && cur ? cur : "+370 6" + String(Math.floor(1e6 + Math.random() * 8.9e6)).slice(0, 2) + " " + String(Math.floor(10000 + Math.random() * 89999));
    const sel = isKnown ? cur : "new";
    const recent = S.calls.slice(0, 5);
    const voice = aiTTS() ? "AI voice" : "iPhone voice", ears = sttAI() ? "OpenAI transcription" : dictationOk() ? "iPhone dictation" : "typing";
    return `<section class="hero">
      <h2 class="hero-h">Ring ${esc(S.clinic)}</h2>
      <p class="hero-p">${esc(S.assistant)}, the virtual receptionist, picks up, asks what's wrong, how much it hurts and when you can come, then leaves a note the front desk can book from.</p>
      <h3 class="lbl-s">Calling from</h3>
      <div class="from" role="radiogroup" aria-label="Calling from">
        ${known.map(p => `<button class="from-r ${sel === p.phone ? "on" : ""}" role="radio" aria-checked="${sel === p.phone}" data-act="from" data-v="${esc(p.phone)}"><span class="av">${esc(initials(p.name))}</span><span class="grow"><b>${esc(p.name)}</b><small>${esc(p.phone)} · patient</small></span></button>`).join("")}
        <div class="from-r ${sel === "new" ? "on" : ""}" role="radio" aria-checked="${sel === "new"}" data-act="from" data-v="new"><span class="av new">+</span><span class="grow"><b>A new caller</b><input id="newnum" type="tel" value="${esc(newNumber)}" aria-label="New caller's number" autocomplete="off"></span></div>
      </div>
      <div class="engine">${st.hasKey
        ? `<span class="badge-ai">✦ AI by ${PN[S.ai.provider]}</span><span>${esc(S.assistant)} holds a real conversation and reads the caller's mood.</span>`
        : `<span class="badge-ex">Script · no AI</span><span>${esc(S.assistant)} asks a fixed set of questions. <button class="link inline" data-act="aiopen">Add a key in AI settings</button> for a real conversation.</span>`}</div>
      <p class="note">Voice: ${voice} · Listening: ${ears} · ${st.lang === "lt" ? "Lietuvių" : "English"} <button class="link inline" data-act="cfgopen">Change</button></p>
      <button class="callgo" data-act="callgo">${PHONE_SVG}<span>Call ${esc(S.clinic)}</span></button>
    </section>
    ${S.line && S.line.on && S.line.phone ? `<section class="block"><div class="realline">
      <div class="grow"><b>Or call the real line</b><span>${esc(S.line.phone)}</span><small class="muted wrap">From any phone: ${esc(S.assistant)} answers for real, and the call appears at the front desk a few seconds after you hang up.</small></div>
      <div class="rl-btns"><button class="primary sm" data-act="line-call">${PHONE_SVG}Call</button><button class="link small" data-act="line-sync">${S.line.busy ? "Checking…" : "Check for calls"}</button></div></div></section>` : ""}
    ${recent.length ? `<section class="block"><div class="block-h"><h3>Recent calls</h3><button class="link small" data-act="tab" data-v="desk">Front desk</button></div>
      ${recent.map(c => `<button class="crow" data-act="opencase" data-id="${esc(c.id)}"><span class="stripe tri-${esc((c.summary || {}).triage || "routine")}"></span><span class="grow"><b>${esc(callName(c))}</b><small>${esc((c.summary || {}).reason || "Call")} · ${esc(whenFull(c.at))}</small></span>${statusPill(c)}</button>`).join("")}</section>` : ""}`;
  }
  const statusPill = c => `<span class="pill st-${esc(c.status)}">${{ waiting: "To book", booked: "Booked", closed: "Closed", noted: "No booking" }[c.status] || esc(c.status)}</span>`;
  // Why the call came in, as the front desk reads it
  const INTENT_L = { about_visit: "Asked about a visit", change_visit: "Change a booking", other: "Question" };
  const intentPill = c => c.followUp ? `<span class="pill soft">↩ Called again</span>` : INTENT_L[c.intent] ? `<span class="pill soft">${INTENT_L[c.intent]}</span>` : "";

  // Front desk: sign in, then the queue
  let deskFilter = "waiting", signErr = "";
  function deskHTML() {
    const st = S.settings;
    if (!st.deskUser) return `<section class="hero desk-in">
      <h2 class="hero-h">Front desk</h2>
      <p class="hero-p">Sign in as the clinic's receptionist to see the calls ${esc(S.assistant)} took and book each caller with the right dentist.</p>
      <label class="lbl-s" for="dwho">Receptionist</label>
      <select id="dwho" class="voicesel">${S.staff.map(n => `<option>${esc(n)}</option>`).join("")}</select>
      <label class="lbl-s" for="dpin">PIN</label>
      <input id="dpin" class="pin" type="password" inputmode="numeric" maxlength="6" placeholder="••••" autocomplete="off">
      <p class="note">Demo PIN: ${esc(S.demoPin)}</p>
      ${signErr ? `<p class="err">${esc(signErr)}</p>` : ""}
      <button class="primary block" data-act="signin">Sign in</button></section>`;
    const sets = { waiting: S.calls.filter(c => c.status === "waiting"), booked: S.calls.filter(c => c.status === "booked"), closed: S.calls.filter(c => c.status === "closed" || c.status === "noted"), all: S.calls };
    const list = sets[deskFilter] || sets.waiting;
    if (deskFilter === "waiting") list.sort((a, b) => ((b.summary || {}).priority || 0) - ((a.summary || {}).priority || 0) || a.at - b.at);
    const today = S.patients.reduce((n, p) => n + (p.appts || []).filter(a => a.status === "booked" && a.made && sod(a.made) === sod(Date.now())).length, 0);
    return `<div class="deskbar"><span>Signed in as <b>${esc(st.deskUser)}</b>${today ? ` · booked today: ${today}` : ""}</span><span class="db-acts">${S.line && S.line.on ? `<button class="link small" data-act="line-sync">${S.line.busy ? "Checking…" : "📞 Check line"}</button>` : ""}<button class="link small" data-act="signout">Sign out</button></span></div>
      <div class="segbar"><div class="seg wide">${[["waiting", "To book"], ["booked", "Booked"], ["closed", "Other"], ["all", "All"]].map(([v, l]) => `<button class="${deskFilter === v ? "on" : ""}" data-act="dfilter" data-v="${v}">${l} <i>${sets[v].length}</i></button>`).join("")}</div></div>
      ${list.length ? `<div class="queue">${groupByPatient(list).map(g => g.length === 1 ? queueCard(g[0]) : groupCard(g)).join("")}</div>` : `<div class="empty"><h2>${deskFilter === "waiting" ? "Nobody is waiting" : "Nothing here yet"}</h2><p>${deskFilter === "waiting" ? `When someone calls, ${esc(S.assistant)}'s note lands here. Try it yourself on the Call tab.` : "Calls show up here as you work through them."}</p>${deskFilter === "waiting" ? `<button class="primary" data-act="tab" data-v="call">Make a call</button>` : ""}</div>`}`;
  }
  // A patient with several calls in the same list gets one card, the calls inside it, most urgent first
  const TRI_ORDER = ["emergency", "urgent", "soon", "routine"];
  function groupByPatient(list) {
    const out = [], at = {};
    list.forEach(c => { const k = c.patientId || "c:" + c.id; if (at[k]) at[k].push(c); else out.push(at[k] = [c]); });
    return out;
  }
  function groupCard(g) {
    const c0 = g[0], pt = byPatient(c0.patientId) || {}, up = upcomingOf(pt), f = c0.fields || {};
    const top = g.map(c => (c.summary || {}).triage || "routine").sort((a, b) => TRI_ORDER.indexOf(a) - TRI_ORDER.indexOf(b))[0];
    return `<div class="qgroup" role="group" aria-label="${esc(callName(c0))}: ${g.length} calls">
      <span class="stripe tri-${esc(top)}"></span>
      <div class="qg-head"><b class="q-name">${esc(callName(c0))}${(pt.age || f.age) ? `<small>, ${esc(pt.age || f.age)}</small>` : ""}</b>
        <span class="chips"><span class="pill warn">${g.length} calls</span>${up.length ? `<span class="pill">${up.length} visit${up.length === 1 ? "" : "s"} booked</span>` : ""}${pt.id ? `<button class="link small" data-act="openpat" data-id="${esc(pt.id)}">Patient ›</button>` : ""}</span></div>
      ${up.length ? `<div class="qg-visits">${up.map(a => `<span class="q-bk">📅 ${esc(dayLabel(a.at))} ${hhmm(a.at)} · ${esc((docOf(a.doctor) || {}).short || "")} · ${esc(a.reason || "")}</span>`).join("")}</div>` : ""}
      ${g.map(c => { const s = c.summary || {}; return `<button class="qrow" data-act="opencase" data-id="${esc(c.id)}">
        <span class="q-top">${c.status === "noted" ? statusPill(c) : triagePill(s.triage)}${c.source === "phone" ? `<span class="pill line">📞</span>` : ""}${intentPill(c)}<span class="q-when">${esc(rel(c.at))}</span></span>
        <span class="q-why">${esc(s.reason || (c.fields || {}).complaint || "No reason given")}</span>
        ${c.booking ? `<span class="q-bk">✓ ${c.booking.movedTo ? "moved to " + esc(dayLabel(c.booking.movedTo)) + " " + hhmm(c.booking.movedTo) : esc(dayLabel(c.booking.at)) + " " + hhmm(c.booking.at) + " · " + esc((docOf(c.booking.doctor) || {}).short || "")}</span>` : ""}
        <span class="chev" aria-hidden="true">›</span></button>`; }).join("")}
    </div>`;
  }
  function queueCard(c) {
    const s = c.summary || {}, f = c.fields || {}, bk = c.booking;
    return `<button class="qcard" data-act="opencase" data-id="${esc(c.id)}">
      <span class="stripe tri-${esc(s.triage || "routine")}"></span>
      <span class="q-top">${c.status === "noted" ? statusPill(c) : triagePill(s.triage)}${c.source === "phone" ? `<span class="pill line">📞 Phone</span>` : ""}${c.isNew ? `<span class="pill">New patient</span>` : ""}${intentPill(c)}${(c.again || []).length ? `<span class="pill warn">Called ${c.again.length + 1}×</span>` : ""}<span class="q-when">${esc(rel(c.at))}</span></span>
      <b class="q-name">${esc(callName(c))}${f.age ? `<small>, ${esc(f.age)}</small>` : ""}</b>
      <span class="q-why">${esc(s.reason || f.complaint || "No reason given")}</span>
      <span class="chips">${f.pain != null ? `<span class="pill">Pain ${esc(f.pain)}/10</span>` : ""}${f.urgency != null ? `<span class="pill">Urgency ${esc(f.urgency)}/5</span>` : ""}${c.mood ? `<span class="pill">${S.moods[c.mood.label] || ""} ${esc(c.mood.label)}</span>` : ""}${f.preferred ? `<span class="pill soft">${esc(clip(f.preferred, 34))}</span>` : ""}</span>
      ${bk ? `<span class="q-bk">✓ ${esc(dayLabel(bk.at))} ${hhmm(bk.at)} · ${esc((docOf(bk.doctor) || {}).short || "")}</span>` : ""}
    </button>`;
  }

  // The case: one call, as the receptionist sees it, with booking
  let caseId = "", caseDoc = "", caseDay = 0, caseSlot = 0, caseArmed = "", caseBusy = false, showTx = false, caseMove = "", caseSug = null;
  const planBusy = {};
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Math.abs(h); };
  const dkey = ts => { const d = new Date(ts); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); };
  function bookedAt(docId) {
    const set = new Set();
    S.patients.forEach(p => (p.appts || []).forEach(a => { if (a.doctor === docId && a.status === "booked") set.add(a.at); }));
    return set;
  }
  function workDays(doc) {
    const out = [], n = S.cfg.daysAhead || 10;
    for (let i = 0, d = sod(Date.now()); out.length < n && i < 60; i++, d = sod(d + DAY + 3600e3)) if (doc.days.includes(new Date(d).getDay())) out.push(d);
    return out;
  }
  // The made-up patients who fill the rest of the diary: busier on Mondays and mid-morning, quieter further ahead
  const DOW_BIAS = [0, 12, 4, 0, 6, -8, 0];
  function mockTaken(doc, t) {
    const busy = S.cfg.busyShare == null ? 45 : S.cfg.busyShare;
    if (!busy) return false;
    const d = new Date(t), h = d.getHours(), ahead = Math.max(0, Math.round((sod(t) - sod(Date.now())) / DAY));
    let share = busy + DOW_BIAS[d.getDay()] + (Math.floor(sod(t) / (7 * DAY)) * 37 % 13 - 6) + (h >= 9 && h < 12 ? 8 : h >= 16 ? -6 : 0);
    if (ahead > 0) share *= 1 - Math.min(0.55, ahead * 0.035);
    return hash(doc.id + dkey(t) + t) % 100 < Math.max(0, Math.min(95, share));
  }
  const slotTimes = (doc, day) => { const step = (S.cfg.slotMinutes || 30) * 60e3, out = []; for (let t = day + doc.from * 3600e3; t + step <= day + doc.to * 3600e3; t += step) out.push(t); return out; };
  // rule(t): why this patient can't have that time (the booking rules), or ""
  function slotsFor(doc, day, rule) {
    const taken = bookedAt(doc.id);
    return slotTimes(doc, day).filter(t => t >= Date.now() + 3600e3)   // not within the next hour
      .map(t => ({ at: t, free: !mockTaken(doc, t) && !taken.has(t), why: rule ? rule(t) : "" }));
  }
  const usable = x => x.free && !x.why;
  // The booking rules for this call's patient (visitConflict is shared with the script)
  const upcomingOf = pt => (pt && pt.appts || []).filter(a => a.status === "booked" && a.at > Date.now()).sort((a, b) => a.at - b.at);
  const specOfAppt = a => a.spec || ((docOf(a.doctor) || {}).spec || [])[0];
  function ruleFor(c, moveId, docId) {
    const pt = byPatient(c.patientId);
    if (!pt) return null;
    const mv = moveId && (pt.appts || []).find(a => a.id === moveId), doc = docOf(docId) || {};
    const spec = (mv && specOfAppt(mv)) || (c.summary || {}).specialty || (doc.spec || [])[0];
    const o = { slotMin: S.cfg.slotMinutes || 30, gapDays: S.cfg.visitGapDays == null ? 1 : S.cfg.visitGapDays, surgeryDays: S.cfg.surgeryGapDays == null ? 14 : S.cfg.surgeryGapDays,
      ignore: moveId || "", specOf: specOfAppt, docName: id => (docOf(id) || {}).short || "the dentist" };
    return t => visitConflict(pt.appts, t, spec, o);
  }
  // The dentists for this call, the one the note suggests (or the moved visit's) first
  function caseDocs(c, moveId) {
    const s = c.summary || {}, mv = moveId && ((byPatient(c.patientId) || {}).appts || []).find(a => a.id === moveId);
    const first = (mv && mv.doctor) || s.doctor, spec = (mv && specOfAppt(mv)) || s.specialty;
    return S.doctors.filter(d => d.id === first || d.spec.includes(spec)).sort((a, b) => (b.id === first) - (a.id === first));
  }
  // A suggested time: what the caller asked for, the right dentist, soon (sooner the more urgent), within the rules
  function suggest(c, moveId) {
    const s = c.summary || {}, pf = prefers(c), urgent = s.triage === "emergency" || s.triage === "urgent";
    let best = null;
    caseDocs(c, moveId).forEach((d, di) => {
      const rule = ruleFor(c, moveId, d.id);
      workDays(d).forEach((day, i) => slotsFor(d, day, rule).forEach(x => {
        if (!usable(x)) return;
        const p = prefOk(pf, x.at), score = (p ? (urgent ? 30 : 100) : 0) - i * (urgent ? 25 : 6) - di * 15 - (x.at - day) / 36e5 * 0.1;
        if (!best || score > best.score) best = { doctor: d.id, at: x.at, score, pref: p };
      }));
    });
    if (!best) return null;
    const asked = String((c.fields || {}).preferred || "").slice(0, 40);
    best.why = best.pref ? `matches “${asked}”` : urgent ? "the earliest free time: it's urgent" : pf.any ? `nothing free matches “${asked}”; the earliest free time` : "the earliest free time";
    return best;
  }
  // What the AI chooses from: the allowed free times of the fitting dentists, the ones the caller asked for marked
  function planCandidates(c, moveId) {
    const pf = prefers(c), out = [];
    caseDocs(c, moveId).slice(0, 3).forEach(d => {
      const rule = ruleFor(c, moveId, d.id); let n = 0;
      workDays(d).forEach(day => slotsFor(d, day, rule).forEach(x => { if (usable(x) && n < 14 && (n < 6 || x.at % (2 * 36e5) === 0 || prefOk(pf, x.at))) { out.push({ doctor: d.id, at: x.at, pref: prefOk(pf, x.at) }); n++; } }));
    });
    return out.slice(0, 36);
  }
  // What the caller asked for, as hours: "mornings" → before 12, "after 3 pm" or "after two" → from 15 or 14
  const HOURW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, vienos: 1, dviejų: 2, trijų: 3, keturių: 4, penkių: 5 };
  function prefers(c) {
    const p = String((c.fields || {}).preferred || "").toLowerCase();
    let from = 0, to = 24;
    if (/(morning|early|ryt|before noon|iki piet)/.test(p)) to = 12;
    if (/(afternoon|po piet|\d\s*pm\b)/.test(p)) from = 12;
    if (/(evening|vakar)/.test(p)) from = Math.max(from, 16);
    for (const m of p.matchAll(/(?:after|from|nuo|po)\s+(\d{1,2}|[a-zųčęėįš]+)/g)) {   // "after school, from 3 pm": the first that names an hour
      let h = /\d/.test(m[1]) ? +m[1] : HOURW[m[1]];
      if (!h) continue;
      if (h < 8) h += 12;
      from = h; if (to <= from) to = 24; break;
    }
    // days: "Monday", "pirmadienį", "tomorrow", "next week"
    const DAYW = [["sun|sekmad", 0], ["mon|pirmad", 1], ["tue|antrad", 2], ["wed|trečiad|treciad", 3], ["thu|ketvirtad", 4], ["fri|penktad", 5], ["sat|šeštad|sestad", 6]];
    const days = DAYW.filter(([re]) => new RegExp("\\b(" + re + ")", "i").test(p)).map(([, d]) => d);
    let onDay = 0, notBefore = 0;
    if (/(tomorrow|rytoj)/.test(p)) onDay = sod(Date.now() + DAY + 3600e3);
    if (/(next week|kitą savaitę|kita savaite)/.test(p)) { const d = new Date(sod(Date.now())); notBefore = sod(d.getTime() + ((8 - d.getDay()) % 7 || 7) * DAY + 3600e3); }
    const hours = from > 0 || to < 24;
    return { any: hours || days.length > 0 || !!onDay || !!notBefore, hours, from, to, days, onDay, notBefore };
  }
  const prefOk = (pf, t) => {
    if (!pf.any) return false;
    const d = new Date(t), h = d.getHours();
    return (!pf.hours || (h >= pf.from && h < pf.to)) && (!pf.days.length || pf.days.includes(d.getDay())) && (!pf.onDay || sod(t) === pf.onDay) && (!pf.notBefore || t >= pf.notBefore);
  };
  function openCase(id) {
    const c = byCall(id); if (!c) return;
    if (!S.settings.deskUser) { tab = "desk"; render(); toast("Sign in at the front desk to open calls"); return; }
    caseId = id; caseArmed = ""; showTx = false; caseSlot = 0; caseDay = 0;
    const up = upcomingOf(byPatient(c.patientId));
    caseMove = c.status === "waiting" && c.intent === "change_visit" && up.length ? ((c.plan && c.plan.move) || up[0].id) : "";
    caseDoc = (c.booking && c.booking.doctor) || (c.summary && c.summary.doctor) || S.doctors[0].id;
    caseSug = c.status === "waiting" ? suggest(c, caseMove) : null;
    if (caseSug) useTime(caseSug.doctor, caseSug.at);
    renderCase(); $("#casesheet").scrollTop = 0;
    if (c.status === "waiting" && !c.plan && S.settings.ai && S.settings.hasKey && needsJudgement(c)) askPlan(c);
  }
  function useTime(doctor, at) { caseDoc = doctor; caseDay = sod(at); caseSlot = at; }
  // When the AI's judgement is worth it: other visits nearby, surgery, or moving a visit
  function needsJudgement(c) {
    const pt = byPatient(c.patientId), s = c.summary || {};
    return c.intent === "change_visit" || s.specialty === "surgery" ||
      (pt && (pt.appts || []).some(a => (a.status === "booked" && a.at > Date.now()) || (a.status === "done" && specOfAppt(a) === "surgery" && a.at > Date.now() - 60 * DAY)));
  }
  function askPlan(c) {
    if (planBusy[c.id]) return;
    const candidates = planCandidates(c, caseMove);
    if (!candidates.length) return;
    planBusy[c.id] = true; renderCase();
    send("plan-ai", { id: c.id, move: caseMove, candidates }, () => { delete planBusy[c.id]; renderCase(); });
  }
  function bookingHTML(c) {
    if (c.status === "booked" && c.booking) {
      const d = docOf(c.booking.doctor) || {}, pt = byPatient(c.patientId) || {};
      const appt = (pt.appts || []).find(a => a.callId === c.id && a.status === "booked");
      if (c.booking.movedTo) return `<div class="booked closed"><b>Moved to ${esc(dayLabel(c.booking.movedTo))}, ${hhmm(c.booking.movedTo)}</b><span class="muted">Was ${esc(dayLabel(c.booking.at))}, ${hhmm(c.booking.at)} with ${esc(d.short || "")}. A later call moved it.</span></div>`;
      return `<div class="booked"><b>✓ ${c.booking.movedFrom ? "Moved to" : "Booked:"} ${esc(dayLabel(c.booking.at))}, ${hhmm(c.booking.at)}</b><span>${esc(d.name || "")} · ${esc(d.role || "")}</span><small class="muted">${c.booking.movedFrom ? `was ${esc(dayLabel(c.booking.movedFrom))}, ${hhmm(c.booking.movedFrom)} · ` : ""}by ${esc(c.booking.by || "")}</small>
        <div class="aic-btns"><button class="sm" data-act="copyconf" data-id="${esc(c.id)}">Copy confirmation text</button>${appt ? `<button class="sm danger ${caseArmed === "cancel" ? "armed" : ""}" data-act="apptcancel" data-p="${esc(pt.id)}" data-v="${esc(appt.id)}">${caseArmed === "cancel" ? "Confirm" : "Cancel appointment"}</button>` : ""}</div></div>`;
    }
    if (c.status === "noted") {
      const w = c.followUp && byCall(c.followUp);
      return `<div class="booked closed"><b>${w ? "Called again about a request that's waiting" : "No booking needed"}</b><span class="muted">${w ? `The request from ${esc(rel(w.at))} has this call too.` : c.intent === "about_visit" ? `${esc(S.assistant)} answered a question about a booked visit.` : "A question; filed under the patient."}</span>
        <div class="aic-btns">${w ? `<button class="sm" data-act="opencase" data-id="${esc(w.id)}">Open the waiting request</button>` : ""}<button class="sm" data-act="reopen" data-id="${esc(c.id)}">Move to To book</button></div></div>`;
    }
    if (c.status === "closed") return `<div class="booked closed"><b>Closed without booking</b><span class="muted">${c.closedBy ? "by " + esc(c.closedBy) : ""}</span><div class="aic-btns"><button class="sm" data-act="reopen" data-id="${esc(c.id)}">Reopen</button></div></div>`;
    const doc = docOf(caseDoc) || S.doctors[0], s = c.summary || {}, pf = prefers(c), pt = byPatient(c.patientId), up = upcomingOf(pt);
    const mv = caseMove && up.find(a => a.id === caseMove), rule = ruleFor(c, caseMove, doc.id);
    const days = workDays(doc);
    if (!caseDay || !days.includes(caseDay)) { caseDay = (days.find(d => slotsFor(doc, d, rule).some(usable)) || days[0] || 0); caseSlot = 0; }
    const sl = caseDay ? slotsFor(doc, caseDay, rule) : [];
    const docs = S.doctors.slice().sort((a, b) => (b.id === s.doctor) - (a.id === s.doctor) || (b.spec.includes(s.specialty)) - (a.spec.includes(s.specialty)));
    const ok = (d, at) => { const dd = docOf(d); return dd && slotsFor(dd, sod(at), ruleFor(c, caseMove, d)).some(x => x.at === at && usable(x)); };
    const tLabel = (d, at) => `${esc(dayLabel(at))}, ${hhmm(at)} with ${esc((docOf(d) || {}).short || "")}`;
    const pl = c.plan && (c.plan.move || "") === caseMove ? c.plan : null;
    const reasons = [...new Set(sl.filter(x => x.free && x.why).map(x => x.why))];
    return `<div class="bk">
      ${mv || up.length && c.intent === "change_visit" ? `<label class="lbl-s" for="bkmove">Visit to move</label>
        <select id="bkmove" class="voicesel bkmove"><option value="">None: book a new visit</option>${up.map(a => `<option value="${esc(a.id)}" ${a.id === caseMove ? "selected" : ""}>${esc(dayLabel(a.at))}, ${hhmm(a.at)} · ${esc((docOf(a.doctor) || {}).short || "")} · ${esc(a.reason || "")}</option>`).join("")}</select>` : ""}
      ${up.length && !mv ? `<p class="note">📅 Already booked: ${up.map(a => `${esc(dayLabel(a.at))} ${hhmm(a.at)} with ${esc((docOf(a.doctor) || {}).short || "")}`).join("; ")}</p>` : ""}
      ${caseSug ? `<div class="sug"><p><span class="sug-k">Suggested</span> <b>${tLabel(caseSug.doctor, caseSug.at)}</b><small>${esc(caseSug.why)}</small></p>${caseSlot === caseSug.at && caseDoc === caseSug.doctor ? `<span class="sug-on">✓ Selected</span>` : ok(caseSug.doctor, caseSug.at) ? `<button class="sm" data-act="usetime" data-v="${esc(caseSug.doctor)}|${caseSug.at}">Use</button>` : ""}</div>` : ""}
      ${pl ? `<div class="sug ai"><p><span class="sug-k">✦ AI plan · ${esc(PN[pl.provider] || "AI")}</span> <b>${tLabel(pl.doctor, pl.at)}</b><small>${esc(pl.why)}</small>
          ${pl.warnings.map(w => `<small class="sug-w">⚠ ${esc(w)}</small>`).join("")}
          ${pl.alts.length ? `<span class="sug-alt">Or: ${pl.alts.map(x => ok(x.doctor, x.at) ? `<button class="link small" data-act="usetime" data-v="${esc(x.doctor)}|${x.at}">${tLabel(x.doctor, x.at)}</button>` : "").join(" ")}</span>` : ""}</p>
          ${!ok(pl.doctor, pl.at) ? `<span class="muted">No longer free</span>` : caseSlot === pl.at && caseDoc === pl.doctor ? `<span class="sug-on">✓ Selected</span>` : `<button class="sm" data-act="usetime" data-v="${esc(pl.doctor)}|${pl.at}">Use</button>`}</div>`
        : S.settings.ai && S.settings.hasKey ? `<button class="link small" data-act="planai" data-id="${esc(c.id)}" ${planBusy[c.id] ? "disabled" : ""}>${planBusy[c.id] ? "✦ Planning…" : "✦ Ask AI to plan this visit"}</button>` : ""}
      ${s.hint ? `<p class="bk-hint">${s.kind === "ai" ? "✦ " : ""}${esc(s.hint)}</p>` : ""}
      <label class="lbl-s" for="bkdoc">Dentist</label>
      <select id="bkdoc" class="voicesel bkdoc">${docs.map(d => `<option value="${esc(d.id)}" ${d.id === doc.id ? "selected" : ""}>${esc(d.name)} · ${esc(d.role)}${d.id === s.doctor ? " (suggested)" : ""}</option>`).join("")}</select>
      <div class="days" role="tablist" aria-label="Day">${days.map(d => { const x = slotsFor(doc, d, rule), n = x.filter(usable).length, blocked = !n && x.some(y => y.free && y.why); return `<button class="day ${d === caseDay ? "on" : ""}" data-act="bkday" data-v="${d}" ${n ? "" : "disabled"}><small>${esc(new Date(d).toLocaleDateString(undefined, { weekday: "short" }))}</small><b>${new Date(d).getDate()}</b><i>${n ? n + " free" : blocked ? "not allowed" : "full"}</i></button>`; }).join("")}</div>
      <div class="slots">${sl.length ? sl.map(x => `<button class="slot ${x.at === caseSlot ? "on" : ""} ${usable(x) && prefOk(pf, x.at) ? "pref" : ""} ${x.free && x.why ? "rule" : ""}" data-act="bkslot" data-v="${x.at}" ${usable(x) ? "" : "disabled"} ${x.why ? `title="${esc(x.why)}"` : ""}>${hhmm(x.at)}</button>`).join("") : `<p class="muted">No times left on this day.</p>`}</div>
      ${pf.any ? `<p class="note"><span class="pref-dot"></span> Matches what the caller asked for</p>` : ""}
      ${reasons.length ? `<p class="note rule-n">Not offered: ${reasons.map(esc).join(" · ")}</p>` : ""}
      <button class="primary block" data-act="book" ${caseSlot && !caseBusy ? "" : "disabled"}>${caseBusy ? "Booking…" : caseSlot ? `${mv ? "Move to" : "Book"} ${esc(dayLabel(caseSlot))}, ${hhmm(caseSlot)} with ${esc(doc.short)}` : "Pick a time"}</button>
      <button class="ghost block danger ${caseArmed === "close" ? "armed" : ""}" data-act="caseclose" data-id="${esc(c.id)}">${caseArmed === "close" ? "Confirm: close without booking" : "Close without booking"}</button>
    </div>`;
  }
  function renderCase() {
    const el = $("#casesheet"), keep = el.scrollTop, c = caseId && byCall(caseId);
    el.classList.toggle("open", !!c); lockBody();
    if (!c) return;
    const s = c.summary || {}, f = c.fields || {}, pt = byPatient(c.patientId);
    const past = pt ? (pt.appts || []).filter(a => a.callId !== c.id).sort((a, b) => b.at - a.at) : [];
    el.innerHTML = `<div class="sh-head"><h2>${esc(callName(c))}</h2><button class="link" data-act="caseclosesheet">Done</button></div><div class="sh-body">
      <div class="sumbox">${s.kind === "ai" ? `<span class="badge-ai">✦ AI note by ${PN[s.provider] || "AI"}</span>` : `<span class="badge-ex">Note · no AI</span>`}
        <p class="sum-t">${esc(s.text || "")}</p>
        <div class="chips">${triagePill(s.triage)}${c.source === "phone" ? `<span class="pill line">📞 Real phone call</span>` : ""}${s.priority ? `<span class="pill">Priority ${esc(s.priority)}/5</span>` : ""}${s.specialty ? `<span class="pill">${esc(S.specialties[s.specialty] || s.specialty)}</span>` : ""}${c.isNew ? `<span class="pill">New patient</span>` : ""}${intentPill(c)}</div>
        ${(c.again || []).length ? `<p class="note">↩ Called again ${c.again.map(id => byCall(id)).filter(Boolean).map(x => esc(rel(x.at))).join(", ")}: ${c.again.map(id => byCall(id)).filter(Boolean).map(x => `<button class="link small" data-act="opencase" data-id="${esc(x.id)}">read</button>`).join(" ")}</p>` : ""}
        ${c.delivered ? `<p class="note">✉ ${esc(S.assistant)} passed on the front desk's message: “${esc(c.delivered)}”</p>` : ""}
        ${(s.flags || []).length ? `<div class="chips">${s.flags.map(x => `<span class="pill flag">⚠ ${esc(x)}</span>`).join("")}</div>` : ""}
      </div>
      <h3 class="sec2">Booking</h3>${bookingHTML(c)}
      <h3 class="sec2">What ${esc(S.assistant)} learned</h3>
      <dl class="facts">${[["Phone", c.phone], ...FIELD_ROWS.map(([k, l]) => [l, k === "pain" && f[k] != null ? f[k] + "/10" : k === "urgency" && f[k] != null ? f[k] + "/5 (the caller's own rating)" : f[k]])].filter(x => x[1] != null && x[1] !== "").map(([l, v]) => `<div><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join("")}
        ${c.mood ? `<div><dt>Mood</dt><dd>${S.moods[c.mood.label] || ""} ${esc(c.mood.label)}${c.mood.note ? " · " + esc(c.mood.note) : ""} <em class="tag ai">✦ AI</em></dd></div>` : ""}
        <div><dt>Call</dt><dd>${esc(whenFull(c.at))} · ${mmss(c.dur || 0)}${c.source === "phone" ? ` · phone line, answered by ${PN[c.provider] || "the voice agent"}` : c.engine === "ai" ? ` · ✦ AI by ${PN[c.provider] || "AI"}` : " · script, no AI"}</dd></div></dl>
      <button class="link small" data-act="txtoggle">${showTx ? "Hide the call" : "Read the whole call"}</button>
      ${showTx ? `<div class="c-log flat">${(c.transcript || []).map(l => `<p class="bub ${l.who}">${esc(l.t)}</p>`).join("")}</div>` : ""}
      <h3 class="sec2">Patient</h3>
      ${pt ? `<button class="crow" data-act="openpat" data-id="${esc(pt.id)}"><span class="av">${esc(initials(pt.name))}</span><span class="grow"><b>${esc(pt.name)}</b><small>${pt.age ? esc(pt.age) + " · " : ""}${esc(pt.phone)} · patient since ${esc(new Date(pt.since).getFullYear())}</small></span><span class="chev">›</span></button>
        ${past.length ? `<ul class="hist">${past.slice(0, 4).map(a => `<li><b>${esc(new Date(a.at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }))}</b> ${esc(a.reason)} · ${esc((docOf(a.doctor) || {}).short || "")}${a.status !== "done" ? ` <span class="pill soft">${esc(a.status)}</span>` : ""}</li>`).join("")}</ul>` : `<p class="muted">No earlier visits.</p>`}
        ${(pt.notes || []).length ? `<ul class="notes">${pt.notes.slice(0, 4).map(n => `<li><p>${esc(n.text)}</p><small class="muted">${esc(n.by)} · ${esc(dayLabel(n.at))}</small></li>`).join("")}</ul>` : ""}`
      : `<p class="muted">No record yet. Booking makes one.</p>`}
      <h3 class="sec2">Add a note</h3>
      <textarea id="casenote" class="cfgin wide" rows="3" placeholder="For example: called back, prefers Dr. Kazlauskienė"></textarea>
      <button class="sm" data-act="addnote" data-id="${esc(c.id)}">Add note</button>
    </div>`;
    el.scrollTop = keep;
  }

  // Patients
  let pq = "", patId = "", patArmed = "";
  // Each patient's state, from their appointments and calls: what the list groups, filters and shows on the card
  function patInfo(p) {
    const now = Date.now(), appts = p.appts || [];
    const next = appts.filter(a => a.status === "booked" && a.at > now).sort((a, b) => a.at - b.at)[0];
    const visits = appts.filter(a => a.status === "done" || (a.status === "booked" && a.at <= now)).length;
    const calls = S.calls.filter(c => c.patientId === p.id).sort((a, b) => b.at - a.at);
    const waiting = calls.find(c => c.status === "waiting"), last = calls[0];
    const isNew = !visits && now - (p.since || 0) < 7 * DAY;
    const tail = digitsOf(p.phone).slice(-8);
    const shared = tail.length >= 6 ? S.patients.filter(q => q.id !== p.id && digitsOf(q.phone).slice(-8) === tail) : [];
    const status = waiting ? "tobook" : next ? "booked" : isNew ? "new" : "other";
    const contact = Math.max(p.since || 0, last ? last.at : 0, ...(p.notes || []).map(n => n.at || 0), ...appts.map(a => a.made || 0));
    return { next, visits, calls, waiting, last, isNew, shared, status, contact };
  }
  const PAT_STATUS = [["tobook", "To book"], ["booked", "Visit booked"], ["new", "New patients"], ["other", "Everyone else"]];
  const PAT_FILTERS = [["all", "All"], ["tobook", "To book"], ["booked", "Booked"], ["new", "New"]];
  let patFilter = "all";
  function patCard(p, x) {
    const d = x.next && docOf(x.next.doctor), w = x.waiting, ws = w && (w.summary || {});
    const line = w ? `<span>${esc(ws.reason || (w.fields || {}).complaint || "Call back")} · called ${esc(rel(w.at))}</span>`
      : x.next ? `<span class="pc-ic" aria-hidden="true">📅</span><span><b>${esc(dayLabel(x.next.at))}, ${hhmm(x.next.at)}</b> · ${esc(d ? d.short : "")} · ${esc(x.next.reason || "")}</span>`
      : x.last ? `<span>Called ${esc(rel(x.last.at))} · ${esc(((x.last.summary || {}).reason) || "Call")}</span>`
      : `<span class="muted">No calls yet</span>`;
    const chips = [
      x.isNew ? `<span class="pill">New patient</span>` : "",
      x.last && x.last.source === "phone" ? `<span class="pill line">📞 Phone</span>` : "",
      x.visits ? `<span class="pill soft">${x.visits} visit${x.visits === 1 ? "" : "s"}</span>` : "",
      x.calls.length ? `<span class="pill soft">${x.calls.length} call${x.calls.length === 1 ? "" : "s"}</span>` : "",
      (p.notes || []).length ? `<span class="pill soft">${p.notes.length} note${p.notes.length === 1 ? "" : "s"}</span>` : "",
      x.last && x.last.mood ? `<span class="pill soft">${S.moods[x.last.mood.label] || ""} ${esc(x.last.mood.label)}</span>` : "",
      x.shared.length ? `<span class="pill warn">Same number as ${esc(x.shared.map(q => q.name.split(" ")[0]).join(", "))}</span>` : "",
    ].join("");
    return `<button class="pcard st-${x.status}" data-act="openpat" data-id="${esc(p.id)}">
      <span class="av ring">${esc(initials(p.name))}</span>
      <span class="grow">
        <span class="pc-top"><b>${esc(p.name)}</b>${p.age ? `<small>${esc(p.age)}</small>` : ""}${w ? `<span class="pc-tri">${triagePill(ws.triage)}</span>` : ""}</span>
        <small class="pc-ph">${esc(p.phone)}</small>
        <span class="pc-line">${line}</span>
        ${chips ? `<span class="chips">${chips}</span>` : ""}
      </span><span class="chev" aria-hidden="true">›</span></button>`;
  }
  function patientsHTML() {
    const q = pq.trim().toLowerCase(), qd = digitsOf(q), grp = S.settings.patGroup || "status";
    const all = S.patients.map(p => ({ p, x: patInfo(p) }));
    const inF = (f, x) => f === "all" || (f === "new" ? x.isNew : x.status === f);   // New is a filter of its own: a new patient can also wait to be booked
    const count = f => all.filter(r => inF(f, r.x)).length;
    const list = all.filter(({ p, x }) => inF(patFilter, x) &&
      (!q || (p.name + " " + p.phone).toLowerCase().includes(q) || (qd.length > 2 && digitsOf(p.phone).includes(qd))));
    let groups;
    if (grp === "az") {
      list.sort((a, b) => a.p.name.localeCompare(b.p.name));
      groups = [];
      list.forEach(r => { const k = r.p.name.charAt(0).toUpperCase(); const g = groups.find(x => x.k === k); g ? g.rows.push(r) : groups.push({ k, title: k, rows: [r] }); });
    } else if (grp === "recent") {
      list.sort((a, b) => b.x.contact - a.x.contact);
      const d0 = sod(Date.now()), when = t => t >= d0 ? "Today" : t >= d0 - 6 * DAY ? "This week" : t >= d0 - 30 * DAY ? "This month" : "Earlier";
      groups = ["Today", "This week", "This month", "Earlier"].map(k => ({ k, title: k, rows: list.filter(r => when(r.x.contact) === k) }));
    } else {
      const by = { tobook: (a, b) => ((b.x.waiting.summary || {}).priority || 0) - ((a.x.waiting.summary || {}).priority || 0) || a.x.waiting.at - b.x.waiting.at,
        booked: (a, b) => a.x.next.at - b.x.next.at, new: (a, b) => b.p.since - a.p.since, other: (a, b) => a.p.name.localeCompare(b.p.name) };
      groups = PAT_STATUS.map(([k, title]) => ({ k, title, rows: list.filter(r => r.x.status === k).sort(by[k]) }));
    }
    groups = groups.filter(g => g.rows.length);
    return `<div class="ptools">
        <div class="search"><input id="pq" type="search" placeholder="Name or phone number" autocomplete="off" aria-label="Find a patient"></div>
        <div class="seg wide" role="tablist" aria-label="Show">${PAT_FILTERS.map(([v, l]) => `<button class="${patFilter === v ? "on" : ""}" data-act="pfilter" data-v="${v}" aria-pressed="${patFilter === v}">${l} <i>${count(v)}</i></button>`).join("")}</div>
        <div class="pgroup"><span>Group by</span>${[["status", "Status"], ["recent", "Last contact"], ["az", "Name"]].map(([v, l]) => `<button class="chip ${grp === v ? "on" : ""}" data-act="pgroup" data-v="${v}" aria-pressed="${grp === v}">${l}</button>`).join("")}</div>
      </div>
      ${groups.length ? `<div class="plist">${groups.map(g => `<section class="pgrp" aria-label="${esc(g.title)}"><h3 class="pgrp-h">${esc(g.title)}<i>${g.rows.length}</i></h3>${g.rows.map(r => patCard(r.p, r.x)).join("")}</section>`).join("")}</div>`
        : `<div class="empty"><h2>No one found</h2><p>${q ? "Try another name or number." : patFilter !== "all" ? "Nobody in this group right now." : "Patients appear here after their first call."}</p>${patFilter !== "all" ? `<button class="primary" data-act="pfilter" data-v="all">Show everyone</button>` : ""}</div>`}`;
  }
  const digitsOf = s => String(s || "").replace(/\D/g, "");
  const clip = (x, n) => { x = String(x || ""); return x.length <= n ? x : x.slice(0, n).replace(/[\s,;:.]+\S*$/, "") + "…"; };   // at a word, not mid-number
  // Calendar: how full the clinic is by day, week and month, and the trends. The diary is the made-up patients
  // (mockTaken) plus the visits booked in Frontly.
  let calView = "week", calDay = 0;
  const calCache = new Map();
  function load(doc, day) {
    if (!doc.days.includes(new Date(day).getDay())) return null;
    const key = doc.id + day;
    if (calCache.has(key)) return calCache.get(key);
    const ours = new Map();
    S.patients.forEach(p => (p.appts || []).forEach(a => { if (a.doctor === doc.id && (a.status === "booked" || a.status === "done") && a.at >= day && a.at < day + DAY) ours.set(a.at, { p, a }); }));
    const cells = slotTimes(doc, day).map(t => ours.has(t) ? { t, k: "ours", x: ours.get(t) } : mockTaken(doc, t) ? { t, k: "taken" } : { t, k: "free" });
    const used = cells.filter(c => c.k !== "free").length, r = { cells, used, total: cells.length, ours: cells.filter(c => c.k === "ours").length, pct: cells.length ? Math.round(used * 100 / cells.length) : 0 };
    calCache.set(key, r); return r;
  }
  function clinicLoad(day, docs = S.doctors) {
    let used = 0, total = 0, ours = 0;
    docs.forEach(d => { const l = load(d, day); if (l) { used += l.used; total += l.total; ours += l.ours; } });
    return total ? { used, total, ours, pct: Math.round(used * 100 / total) } : null;
  }
  const monday = t => { const d = new Date(sod(t)); return sod(d.getTime() - ((d.getDay() + 6) % 7) * DAY + 3600e3); };
  const addDays = (t, n) => sod(sod(t) + n * DAY + 12 * 3600e3);   // midday, so a clock change never lands on the wrong day
  const weekDays = t => [0, 1, 2, 3, 4].map(i => addDays(monday(t), i));
  function weekLoad(t) {
    let used = 0, total = 0; weekDays(t).forEach(d => { const l = clinicLoad(d); if (l) { used += l.used; total += l.total; } });
    return total ? Math.round(used * 100 / total) : 0;
  }
  const shortDoc = d => d.short.replace(/^Dr\. /, "").replace(/ \(.*\)$/, "");
  const heat = pct => `<span class="heat" style="opacity:${(0.08 + Math.min(1, pct / 100) * 0.62).toFixed(2)}"></span>`;
  const fmtD = (t, o) => new Date(t).toLocaleDateString(undefined, o);
  const vsLast = (a, b, unit = " points") => a === b ? "the same as" : `${a > b ? "▲ up" : "▼ down"} ${Math.abs(a - b)}${unit} on`;
  function calHTML() {
    calCache.clear();
    if (!calDay) calDay = sod(Date.now());
    const views = [["day", "Day"], ["week", "Week"], ["month", "Month"], ["trends", "Trends"]];
    const title = calView === "day" ? fmtD(calDay, { weekday: "long", day: "numeric", month: "long" })
      : calView === "week" ? `${fmtD(monday(calDay), { day: "numeric", month: "short" })} – ${fmtD(addDays(monday(calDay), 4), { day: "numeric", month: "short" })}`
      : calView === "month" ? fmtD(calDay, { month: "long", year: "numeric" }) : "Trends";
    return `<div class="segbar"><div class="seg wide">${views.map(([v, l]) => `<button class="${calView === v ? "on" : ""}" data-act="calview" data-v="${v}" aria-pressed="${calView === v}">${l}</button>`).join("")}</div></div>
      <div class="calwrap">${calView === "trends" ? "" : `<div class="calnav"><button class="cn-b" data-act="calstep" data-v="-1" aria-label="Earlier">‹</button><b>${esc(title)}</b><button class="cn-b" data-act="calstep" data-v="1" aria-label="Later">›</button>${sod(calDay) !== sod(Date.now()) ? `<button class="link small" data-act="caltoday">Today</button>` : ""}</div>`}
      ${calView === "day" ? calDayHTML() : calView === "week" ? calWeekHTML() : calView === "month" ? calMonthHTML() : calTrendsHTML()}
      <p class="note cal-k"><i class="k taken"></i> Other patients (made up) <i class="k ours"></i> Booked in Frontly <i class="k free"></i> Free</p></div>`;
  }
  function calDayHTML() {
    const cl = clinicLoad(calDay);
    if (!cl) return `<div class="empty"><h2>The clinic is closed</h2><p>No dentist works on ${esc(fmtD(calDay, { weekday: "long" }))}s.</p></div>`;
    const ours = [];
    const rows = S.doctors.map(d => {
      const l = load(d, calDay);
      if (!l) return `<div class="cdoc off"><div class="cd-h"><b>${esc(d.short)}</b><small>Not working</small></div></div>`;
      l.cells.filter(c => c.k === "ours").forEach(c => ours.push(Object.assign({ d }, c)));
      return `<div class="cdoc"><div class="cd-h"><b>${esc(d.short)}</b><small>${esc(d.role)}</small><span class="cd-p">${l.pct}%</span></div>
        <div class="strip" role="img" aria-label="${esc(d.short)}: ${l.used} of ${l.total} times taken">${l.cells.map(c => `<i class="${c.k}" title="${hhmm(c.t)}"></i>`).join("")}</div>
        <div class="ticks"><span>${pad2(d.from)}:00</span><span>${pad2(Math.round((d.from + d.to) / 2))}:00</span><span>${pad2(d.to)}:00</span></div></div>`;
    }).join("");
    ours.sort((a, b) => a.t - b.t);
    return `<div class="calsum"><b>${cl.pct}%</b><span>of the day's times are taken<small>${cl.used} of ${cl.total} · ${cl.ours} booked in Frontly</small></span></div>
      ${rows}
      <h3 class="sec2">Booked in Frontly</h3>
      ${ours.length ? ours.map(o => `<button class="crow" data-act="openpat" data-id="${esc(o.x.p.id)}"><span class="cr-t">${hhmm(o.t)}</span><span class="grow"><b>${esc(o.x.p.name)}</b><small>${esc(o.x.a.reason || "Visit")} · ${esc(o.d.short)}${o.x.a.status === "done" ? " · done" : ""}</small></span><span class="chev">›</span></button>`).join("") : `<p class="muted">No visits booked in Frontly on this day.</p>`}`;
  }
  function calWeekHTML() {
    const days = weekDays(calDay), today = sod(Date.now());
    const head = `<tr><th></th>${days.map(d => `<th class="${d === today ? "today" : ""}">${esc(fmtD(d, { weekday: "short" }))}<small>${new Date(d).getDate()}</small></th>`).join("")}</tr>`;
    const body = S.doctors.map(doc => `<tr><th class="rh" title="${esc(doc.name)}">${esc(shortDoc(doc))}</th>${days.map(d => { const l = load(doc, d); return l ? `<td><button class="hcell" data-act="calday" data-v="${d}" aria-label="${esc(doc.short)}, ${esc(fmtD(d, { weekday: "long" }))}: ${l.pct}%">${heat(l.pct)}<b>${l.pct}</b>${l.ours ? `<i class="dot" aria-hidden="true"></i>` : ""}</button></td>` : `<td><span class="hcell off">–</span></td>`; }).join("")}</tr>`).join("");
    const foot = `<tr class="tot"><th class="rh">Clinic</th>${days.map(d => { const l = clinicLoad(d); return `<td><button class="hcell" data-act="calday" data-v="${d}">${heat(l ? l.pct : 0)}<b>${l ? l.pct : "–"}</b></button></td>`; }).join("")}</tr>`;
    const w = weekLoad(calDay), prev = weekLoad(addDays(calDay, -7));
    return `<div class="calsum"><b>${w}%</b><span>of the week's times are taken<small>${vsLast(w, prev)} the week before (${prev}%)</small></span></div>
      <div class="hscroll"><table class="heatgrid"><col class="rhc">${head}${body}${foot}</table></div>
      <p class="note">Numbers are percent taken. A dot: someone booked in Frontly. Tap a day to see it.</p>`;
  }
  function calMonthHTML() {
    const d0 = new Date(calDay); d0.setDate(1); d0.setHours(0, 0, 0, 0);
    const first = d0.getTime(), start = monday(first), month = d0.getMonth(), today = sod(Date.now());
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i);
      if (i >= 35 && new Date(d).getMonth() !== month) break;
      const inM = new Date(d).getMonth() === month, l = inM ? clinicLoad(d) : null;
      cells.push(!inM ? `<span class="mcell out"></span>` : l ? `<button class="mcell" data-act="calday" data-v="${d}" aria-label="${esc(fmtD(d, { day: "numeric", month: "long" }))}: ${l.pct}%">${heat(l.pct)}<small class="${d === today ? "today" : ""}">${new Date(d).getDate()}</small><b>${l.pct}%</b>${l.ours ? `<i class="dot"></i>` : ""}</button>` : `<span class="mcell closed"><small>${new Date(d).getDate()}</small></span>`);
    }
    let used = 0, total = 0; for (let d = first; new Date(d).getMonth() === month; d = addDays(d, 1)) { const l = clinicLoad(d); if (l) { used += l.used; total += l.total; } }
    return `<div class="calsum"><b>${total ? Math.round(used * 100 / total) : 0}%</b><span>of the month's times are taken<small>${used} of ${total} times</small></span></div>
      <div class="month">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(x => `<span class="mh">${x}</span>`).join("")}${cells.join("")}</div>`;
  }
  function bars(items, unit) {
    const max = Math.max(1, ...items.map(x => x.v));
    return `<div class="bars" role="img" aria-label="${esc(items.map(x => x.label + " " + x.v + unit).join(", "))}">${items.map(x => `<div class="bar ${x.cls || ""}"><b>${x.v}${unit}</b><span class="b-col">${x.v2 != null ? `<i class="b2" style="height:${Math.round(x.v2 * 100 / max)}%"></i>` : ""}<i style="height:${Math.round((x.v - (x.v2 || 0)) * 100 / max)}%"></i></span><small>${esc(x.label)}</small></div>`).join("")}</div>`;
  }
  function calTrendsHTML() {
    const now = sod(Date.now()), wk = monday(now);
    const weeks = []; for (let i = -7; i <= 3; i++) { const m = addDays(wk, i * 7); weeks.push({ label: `${new Date(m).getDate()}/${new Date(m).getMonth() + 1}`, v: weekLoad(m), cls: i === 0 ? "now" : i > 0 ? "ahead" : "" }); }
    const wdays = [1, 2, 3, 4, 5].map(dw => { let s = 0, n = 0; for (let i = -8; i < 0; i++) { const l = clinicLoad(addDays(wk, i * 7 + dw - 1)); if (l) { s += l.pct; n++; } } return { label: fmtD(addDays(wk, dw - 1), { weekday: "short" }), long: fmtD(addDays(wk, dw - 1), { weekday: "long" }), v: n ? Math.round(s / n) : 0, dw }; });
    const next14 = []; for (let i = 0; i < 14; i++) next14.push(addDays(now, i));
    const docs = S.doctors.map(d => { let used = 0, total = 0; next14.forEach(t => { const l = load(d, t); if (l) { used += l.used; total += l.total; } }); return { d, label: shortDoc(d), v: total ? Math.round(used * 100 / total) : 0 }; });
    const days14 = []; for (let i = 13; i >= 0; i--) { const d = addDays(now, -i), cs = S.calls.filter(c => sod(c.at) === d); days14.push({ label: String(new Date(d).getDate()), v: cs.length, v2: cs.filter(c => ["emergency", "urgent"].includes((c.summary || {}).triage)).length, cls: d === now ? "now" : "" }); }
    const c7 = S.calls.filter(c => c.at >= now - 6 * DAY).length, p7 = S.calls.filter(c => c.at >= now - 13 * DAY && c.at < now - 6 * DAY).length;
    const need = S.calls.filter(c => c.status === "waiting" || c.status === "booked"), bk = need.filter(c => c.status === "booked");
    const fast = bk.filter(c => c.booking && c.booking.made - c.at < DAY).length;
    const thisW = weekLoad(wk), lastW = weekLoad(addDays(wk, -7)), busiest = wdays.slice().sort((a, b) => b.v - a.v)[0], quiet = wdays.slice().sort((a, b) => a.v - b.v)[0];
    const hot = docs.slice().sort((a, b) => b.v - a.v)[0], spare = docs.filter(x => x.d !== hot.d && x.d.spec.some(sp => hot.d.spec.includes(sp))).sort((a, b) => a.v - b.v)[0];
    const insights = [
      `${busiest.long} is the busiest day (${busiest.v}% on average), ${quiet.long} the quietest (${quiet.v}%): offer ${quiet.long} first to anyone flexible.`,
      hot.v >= 70 ? `${hot.d.short} is ${hot.v}% taken for the next two weeks${spare ? `; ${spare.d.short} covers some of the same work and is at ${spare.v}%` : ""}.` : `No dentist is over 70% for the next two weeks; ${hot.d.short} is the fullest at ${hot.v}%.`,
      `This week is ${thisW}% taken, ${vsLast(thisW, lastW).replace(/^[▲▼] /, "")} last week.`,
    ];
    return `<div class="tiles">
        <div class="tile"><small>This week</small><b>${thisW}%</b><span>${vsLast(thisW, lastW)} last week</span></div>
        <div class="tile"><small>Next two weeks</small><b>${Math.round(docs.reduce((n, x) => n + x.v, 0) / docs.length)}%</b><span>taken so far</span></div>
        <div class="tile"><small>Calls, last 7 days</small><b>${c7}</b><span>${p7 ? `${vsLast(c7, p7, "")} the 7 days before` : "none the 7 days before"}</span></div>
        <div class="tile"><small>Booked within a day</small><b>${bk.length ? Math.round(fast * 100 / bk.length) : 0}%</b><span>${bk.length} of ${need.length} booked</span></div>
      </div>
      <ul class="insights">${insights.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <h3 class="sec2">Clinic occupancy by week</h3>${bars(weeks, "%")}<p class="note">The last bars are weeks ahead: they fill up as people call.</p>
      <h3 class="sec2">Busiest days of the week</h3>${bars(wdays, "%")}<p class="note">The average over the last eight weeks.</p>
      <h3 class="sec2">Dentists, next two weeks</h3>${bars(docs, "%")}
      <h3 class="sec2">Calls per day</h3>${bars(days14, "")}<p class="note"><i class="k urgent"></i> urgent or emergency · the last 14 days</p>`;
  }

  function renderPat() {
    const el = $("#patsheet"), keep = el.scrollTop, p = patId && byPatient(patId);
    el.classList.toggle("open", !!p); lockBody();
    if (!p) return;
    const up = (p.appts || []).filter(a => a.status === "booked" && a.at > Date.now()).sort((a, b) => a.at - b.at);
    const past = (p.appts || []).filter(a => !up.includes(a)).sort((a, b) => b.at - a.at);
    const cl = S.calls.filter(c => c.patientId === p.id);
    el.innerHTML = `<div class="sh-head"><h2>${esc(p.name)}</h2><button class="link" data-act="patclose">Done</button></div><div class="sh-body">
      <dl class="facts"><div><dt>Phone</dt><dd>${esc(p.phone)}</dd></div>${p.age ? `<div><dt>Age</dt><dd>${esc(p.age)}</dd></div>` : ""}<div><dt>Patient since</dt><dd>${esc(new Date(p.since).toLocaleDateString(undefined, { month: "long", year: "numeric" }))}</dd></div></dl>
      <h3 class="sec2">Coming up</h3>
      ${up.length ? up.map(a => `<div class="appt"><div class="grow"><b>${esc(dayLabel(a.at))}, ${hhmm(a.at)}</b><small>${esc(a.reason)} · ${esc((docOf(a.doctor) || {}).name || "")}</small></div><button class="sm danger ${patArmed === a.id ? "armed" : ""}" data-act="apptcancel" data-p="${esc(p.id)}" data-v="${esc(a.id)}">${patArmed === a.id ? "Confirm" : "Cancel"}</button></div>`).join("") : `<p class="muted">Nothing booked.</p>`}
      <h3 class="sec2">Message for ${esc(p.name.split(" ")[0])}</h3>
      ${p.message ? `<div class="appt msg"><div class="grow"><b>“${esc(p.message.text)}”</b><small>${esc(S.assistant)} passes it on at the next call · ${esc(p.message.by)}, ${esc(dayLabel(p.message.at))}</small></div><button class="sm" data-act="patmsgclear" data-id="${esc(p.id)}">Remove</button></div>`
        : `<p class="muted">${esc(S.assistant)} passes a message on when ${esc(p.name.split(" ")[0])} next phones.</p><textarea id="patmsg" class="cfgin wide" rows="2" placeholder="For example: please bring your X-rays on Friday"></textarea><button class="sm" data-act="patmsg" data-id="${esc(p.id)}">Save message</button>`}
      ${(p.messages || []).length ? `<ul class="notes">${p.messages.slice(0, 5).map(m => `<li><p>“${esc(m.text)}”</p><small class="muted">✓ Passed on ${esc(whenFull(m.delivered))}</small></li>`).join("")}</ul>` : ""}
      <h3 class="sec2">Calls</h3>
      ${cl.length ? cl.map(c => `<button class="crow" data-act="opencase" data-id="${esc(c.id)}"><span class="stripe tri-${esc((c.summary || {}).triage || "routine")}"></span><span class="grow"><b>${esc((c.summary || {}).reason || "Call")}</b><small>${esc(whenFull(c.at))}${INTENT_L[c.intent] ? " · " + INTENT_L[c.intent] : c.followUp ? " · called again" : ""}${c.mood ? " · " + (S.moods[c.mood.label] || "") + " " + esc(c.mood.label) : ""}</small></span>${statusPill(c)}</button>`).join("") : `<p class="muted">No calls yet.</p>`}
      <h3 class="sec2">Visits</h3>
      ${past.length ? `<ul class="hist">${past.map(a => `<li><b>${esc(new Date(a.at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }))}</b> ${esc(a.reason)} · ${esc((docOf(a.doctor) || {}).short || "")}${a.status !== "done" ? ` <span class="pill soft">${esc(a.status)}</span>` : ""}</li>`).join("")}</ul>` : `<p class="muted">No visits yet.</p>`}
      <h3 class="sec2">Notes</h3>
      ${(p.notes || []).length ? `<ul class="notes">${p.notes.map(n => `<li><p>${esc(n.text)}</p><small class="muted">${esc(n.by)} · ${esc(dayLabel(n.at))}</small></li>`).join("")}</ul>` : `<p class="muted">No notes yet.</p>`}
      <textarea id="patnote" class="cfgin wide" rows="3" placeholder="Add a note to ${esc(p.name.split(" ")[0])}'s record"></textarea>
      <button class="sm" data-act="patnote" data-id="${esc(p.id)}">Add note</button>
    </div>`;
    el.scrollTop = keep;
  }
  const lockBody = () => document.body.classList.toggle("locked", !!(cfgOpen || aiOpen || K.on || caseId || patId));

  // ---- bridge ← Scriptable ----
  window.recv = st => {
    S = st;
    aiLoading.clear();
    if (caseId && !byCall(caseId)) caseId = "";
    if (patId && !byPatient(patId)) patId = "";
    if (tab !== "patients" || document.activeElement !== $("#pq")) render(); else renderChrome();
    renderCase(); renderPat(); renderAI(); renderCfg();
  };
  function signIn() {
    const who = ($("#dwho") || {}).value, pin = ($("#dpin") || {}).value;
    send("signin", { who, pin }, (ok, msg) => { signErr = ok ? "" : msg; if (ok) { deskFilter = "waiting"; toast("Signed in as " + who); } render(); });
  }
  function confText(c) {
    const d = docOf(c.booking.doctor) || {}, name = callName(c).split(" ")[0];
    return `Hi ${name}, this is ${S.clinic}. Your appointment with ${d.name} is on ${new Date(c.booking.at).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} at ${hhmm(c.booking.at)}. Reply or call us if you need to change it.`;
  }

  // ---- interactions ----
  document.addEventListener("click", e => {
    if (e.target.closest("select, option, input, textarea")) return;   // form controls handle themselves
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const act = t.dataset.act, v = t.dataset.v, id = t.dataset.id;
    switch (act) {
      // main screens
      case "tab": setTab(v); break;
      case "gotab": cfgOpen = false; renderCfg(); setTab(v); break;
      case "from":
        if (v === "new") { const i = $("#newnum"); S.settings.callFrom = (i && i.value.trim()) || newNumber; }
        else S.settings.callFrom = v;
        send("set", { k: "callFrom", v: S.settings.callFrom }); render(); break;
      case "callgo": {
        const i = $("#newnum"), known = S.patients.some(p => p.phone === S.settings.callFrom);
        const phone = known ? S.settings.callFrom : ((i && i.value.trim()) || newNumber);
        if (!/\d{5,}/.test(phone.replace(/\D/g, ""))) { toast("Type a phone number to call from"); break; }
        startCall(phone); break;
      }
      // the call
      case "mic":
        if (K.rec && K.rec.live) stopRecording(false);
        else if (K.phase === "reva" || K.phase === "idle") listen();
        break;
      case "ctype": K.typing = !K.typing; K.focusType = K.typing; renderCall(); break;
      case "ctsend": { const i = $("#ctext"); if (i && i.value.trim()) { const tx = i.value; i.value = ""; callerSays(tx); } break; }
      case "hangup": endCall(); break;
      case "callclose": closeCall(); break;
      case "callsee": { const cid = id; closeCall(); if (!S.settings.deskUser) { setTab("desk"); toast("Sign in as the receptionist to open the call"); } else { setTab("desk"); openCase(cid); } break; }
      // front desk
      case "signin": signIn(); break;
      case "signout": send("signout", {}); S.settings.deskUser = ""; caseId = ""; renderCase(); render(); renderCfg(); break;
      case "dfilter": deskFilter = v; render(); break;
      case "opencase": openCase(id); break;
      case "caseclosesheet": caseId = ""; renderCase(); break;
      case "txtoggle": showTx = !showTx; renderCase(); break;
      case "bkday": caseDay = +v; caseSlot = 0; renderCase(); break;
      case "calview": calView = v; render(); break;
      case "calday": calDay = +v; calView = "day"; render(); scrollTo(0, 0); break;
      case "caltoday": calDay = sod(Date.now()); render(); break;
      case "calstep": {
        const n = +v, d = new Date(calDay || sod(Date.now()));
        if (calView === "month") { d.setDate(1); d.setMonth(d.getMonth() + n); calDay = sod(d.getTime()); }
        else if (calView === "week") calDay = addDays(calDay, 7 * n);
        else { let t = addDays(calDay, n); for (let i = 0; i < 7 && !clinicLoad(t); i++) t = addDays(t, n); calDay = t; }   // skip closed days
        render(); break;
      }
      case "usetime": { const [d, at] = String(v).split("|"); useTime(d, +at); renderCase(); break; }
      case "planai": { const c = byCall(id); if (c) askPlan(c); break; }
      case "bkslot": caseSlot = +v; renderCase(); break;
      case "book": {
        if (!caseSlot || caseBusy) break;
        caseBusy = true; renderCase();
        const at = caseSlot, doc = docOf(caseDoc);
        send("book", { id: caseId, doctor: caseDoc, at, move: caseMove }, (ok, msg) => {
          caseBusy = false;
          if (ok) { caseSlot = 0; toast(`Booked ${dayLabel(at)}, ${hhmm(at)} with ${doc ? doc.short : "the dentist"}`); }
          else { toast(msg || "Not booked"); caseSlot = 0; }
          renderCase();
        });
        break;
      }
      case "caseclose":
        if (caseArmed === "close") { caseArmed = ""; send("desk-close", { id }); toast("Closed without booking"); }
        else { caseArmed = "close"; renderCase(); setTimeout(() => { if (caseArmed === "close") { caseArmed = ""; renderCase(); } }, 3500); }
        break;
      case "reopen": send("desk-reopen", { id }); break;
      case "copyconf": { const c = byCall(id); if (c && c.booking) send("copy", { text: confText(c) }); break; }
      case "apptcancel": {
        const inCase = !!t.closest("#casesheet"), key = inCase ? "cancel" : v;
        const armedNow = inCase ? caseArmed === "cancel" : patArmed === v;
        if (armedNow) { caseArmed = ""; patArmed = ""; send("appt-cancel", { patient: t.dataset.p, appt: v }); }
        else {
          if (inCase) caseArmed = "cancel"; else patArmed = v;
          inCase ? renderCase() : renderPat();
          setTimeout(() => { if (inCase && caseArmed === key) { caseArmed = ""; renderCase(); } if (!inCase && patArmed === key) { patArmed = ""; renderPat(); } }, 3500);
        }
        break;
      }
      case "addnote": { const ta = $("#casenote"), c = byCall(id); if (ta && ta.value.trim() && c) { send("note", { call: id, patient: c.patientId, text: ta.value }); ta.value = ""; } break; }
      case "openpat": patId = id; patArmed = ""; renderPat(); $("#patsheet").scrollTop = 0; break;
      case "patclose": patId = ""; renderPat(); break;
      case "pfilter": patFilter = v; render(); break;
      case "line-sync": if (!(S.line && S.line.busy)) send("line-sync", {}); break;
      case "line-call": send("line-call", {}); break;
      case "line-prompt": send("line-prompt", {}); break;
      case "line-token-new": send("line-token-new", {}); break;
      case "secret-set": send("secret-set", { v }); break;
      case "secret-remove":
        if (secArmed === v) { secArmed = null; send("secret-remove", { v }); }
        else { secArmed = v; renderCfg(); setTimeout(() => { if (secArmed === v) { secArmed = null; renderCfg(); } }, 3500); }
        break;
      case "pgroup": S.settings.patGroup = v; send("set", { k: "patGroup", v }); render(); break;
      case "patnote": { const ta = $("#patnote"); if (ta && ta.value.trim()) { send("note", { patient: id, text: ta.value }); ta.value = ""; } break; }
      case "patmsg": { const ta = $("#patmsg"); if (ta && ta.value.trim()) { send("pat-msg", { patient: id, text: ta.value }); ta.value = ""; } break; }
      case "patmsgclear": send("pat-msg", { patient: id, text: "" }); break;
      // settings
      case "upd-now": updNow(t); break;
      case "upd-later": updLater(); break;
      case "upd-close": { const uo = document.getElementById("upd"); if (uo) uo.remove(); break; }
      case "bpabout": bpOpen = v; renderBp(); break;
      case "bpclose": bpOpen = null; renderBp(); break;
      case "startlog": {
        const pre = $("#startlog");
        if (!pre.hidden) { pre.hidden = true; t.textContent = "Show"; break; }
        send("startlog", {}, (ok, txt) => { pre.textContent = txt || "Nothing logged yet."; pre.hidden = false; t.textContent = "Hide"; });
        break;
      }
      case "updcheck": {
        const um = $("#updmsg"); t.disabled = true; um.textContent = "Checking…";
        send("update-check", {}, (ok, res) => { t.disabled = false; um.textContent = res || ""; if (/available/.test(res || "")) { cfgOpen = false; renderCfg(); } });
        break;
      }
      case "look": {
        const k = t.dataset.k, val = k === "textSize" ? +v : v;
        look[k] = val; send("set", { k, v: val }); render(); renderCfg(); break;
      }
      case "setv": S.settings[t.dataset.k] = v; send("set", { k: t.dataset.k, v }); renderCfg(); if (tab === "call") render(); break;
      case "voicetest": {
        unlockAudio();
        const line = S.settings.lang === "lt" ? `Labas, čia ${S.assistant} iš ${S.clinic}. Kuo galiu padėti?` : `Hello, this is ${S.assistant} at ${S.clinic}. How can I help you today?`;
        say(line, () => audioOff());
        break;
      }
      case "demoreset":
        if (demoArmed) { demoArmed = false; caseId = ""; patId = ""; send("demo-reset", {}); }
        else { demoArmed = true; renderCfg(); setTimeout(() => { if (demoArmed) { demoArmed = false; renderCfg(); } }, 3500); }
        break;
      case "toggle": S.settings[v] = !S.settings[v]; send("set", { k: v, v: S.settings[v] }); renderCfg(); renderAI(); break;
      case "aiopen": aiOpen = true; renderAI(); send("state", {}); break;   // fresh token counts
      case "cfgopen": cfgOpen = true; renderCfg(); break;
      case "cfgclose": cfgOpen = false; cfgArmed = false; bpOpen = null; renderBp(); renderCfg(); break;
      case "cfgreset": { const d = cfgItem(t.dataset.k); S.cfg[d.k] = d.def; send("cfg", { k: d.k, v: null }); renderCfg(); break; }
      case "cfgstep": {
        const d = cfgItem(t.dataset.k), step = d.step || 1;
        const nv = Number(Math.min(d.max, Math.max(d.min, Number(S.cfg[d.k]) + step * +v)).toFixed(2));
        S.cfg[d.k] = nv; send("cfg", { k: d.k, v: nv }); renderCfg(); break;
      }
      case "cfgall":
        if (cfgArmed) { cfgArmed = false; send("cfg", { k: "*" }); }
        else { cfgArmed = true; renderCfg(); setTimeout(() => { if (cfgArmed) { cfgArmed = false; renderCfg(); } }, 3500); }
        break;
      case "aiclose": aiOpen = false; renderAI(); break;
      case "aikey": send("aikey", { v }); break;
      case "aitest": send("aitest", { v }); break;
      case "aiprov": send("aiprov", { v }); break;
      case "aimodels": aiLoading.add(v); renderAI(); send("aimodels", { v }); break;
      case "airm": if (aiArmed === "rm" + v) { aiArmed = null; send("airm", { v }); } else arm("rm" + v); break;
      case "usagereset": if (aiArmed === "reset") { aiArmed = null; send("usagereset", {}); } else arm("reset"); break;
    }
  });
  // lock the UI scale: no pinch-zoom (double-tap zoom is off via touch-action in CSS)
  ["gesturestart", "gesturechange", "gestureend"].forEach(ev => document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
  document.addEventListener("touchmove", e => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, { passive: false });
  document.addEventListener("change", e => {
    const c = e.target.classList;
    if (!c) return;
    if (c.contains("ttsvoicesel")) { S.settings.ttsVoice = e.target.value; send("set", { k: "ttsVoice", v: e.target.value }); return; }
    if (c.contains("ttsmodelsel")) { S.settings.ttsModel = e.target.value; send("set", { k: "ttsModel", v: e.target.value }); renderCfg(); return; }
    if (c.contains("ttsinstr")) { S.settings.ttsInstructions = e.target.value.trim(); send("set", { k: "ttsInstructions", v: S.settings.ttsInstructions }); return; }
    if (c.contains("voicesel") && !c.contains("bkdoc") && !c.contains("bkmove") && e.target.id !== "dwho") { S.settings.voiceURI = e.target.value; send("set", { k: "voiceURI", v: e.target.value }); return; }
    if (c.contains("bkdoc")) { caseDoc = e.target.value; caseDay = 0; caseSlot = 0; renderCase(); return; }
    if (c.contains("bkmove")) { caseMove = e.target.value; const cc = byCall(caseId); caseSug = cc ? suggest(cc, caseMove) : null; if (caseSug) useTime(caseSug.doctor, caseSug.at); else { caseDay = 0; caseSlot = 0; } renderCase(); return; }
    if (c.contains("modelsel")) send("aimodel", { p: e.target.dataset.p, v: e.target.value });
    if (c.contains("linein")) { send("set", { k: "bridgeUrl", v: e.target.value }); return; }
    if (c.contains("cfgin") && e.target.dataset.k) {
      const d = cfgItem(e.target.dataset.k);
      send("cfg", { k: d.k, v: d.type === "lines" ? e.target.value.split("\n") : e.target.value });
    }
  });
  document.addEventListener("input", e => {
    const t = e.target;
    if (t.id === "pq") { pq = t.value; const pos = t.selectionStart; render(); const n = $("#pq"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} } }
    if (t.id === "newnum") { newNumber = t.value; S.settings.callFrom = t.value.trim(); }
  });
  document.addEventListener("focusin", e => { if (e.target.id === "newnum" && !e.target.closest(".from-r.on")) { S.settings.callFrom = e.target.value.trim(); send("set", { k: "callFrom", v: S.settings.callFrom }); const r = e.target.closest(".from-r"); document.querySelectorAll(".from-r").forEach(x => { x.classList.toggle("on", x === r); x.setAttribute("aria-checked", String(x === r)); }); } });
  document.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    if (e.target.id === "ctext") { e.preventDefault(); const tx = e.target.value; e.target.value = ""; callerSays(tx); }
    if (e.target.id === "dpin") { e.preventDefault(); signIn(); }
  });
  addEventListener("resize", renderChrome);

  render();
  setInterval(() => { if (!K.on && !caseId && !patId && !cfgOpen && tab === "desk") render(); }, 60000);   // "x min ago"
}

const PALETTE_CSS = Object.entries(PALETTES).map(([k, p]) => `[data-theme=${k}]{--paper:${p.paper};--sheet:${p.sheet};--ink:${p.ink};--ink-2:${p.ink2};--muted:${p.muted};--rule:${p.rule};--signal:${p.signal};--signal-wash:${p.signalWash};--amber:${p.amber};--amber-wash:${p.amberWash};--danger:${p.danger};color-scheme:${p.scheme}}`).join("\n");
const CSS = `
:root{
  --ts:1; --serif: ui-serif, "New York", Georgia, serif; --sans: -apple-system, system-ui, "SF Pro Text", sans-serif; --display: var(--sans);
  --rounded: ui-rounded, "SF Pro Rounded", -apple-system, system-ui, sans-serif; --pad:16px; --gap:14px;
}
html[data-font=serif]{--display:var(--serif)}
${PALETTE_CSS}
body.d-compact{--pad:11px;--gap:10px}
body.d-tiny{--pad:8px;--gap:7px}

*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{touch-action:pan-x pan-y;-webkit-user-select:none;user-select:none}
input,textarea,.sum-t,.c-log{-webkit-user-select:text;user-select:text}
html,body{overflow-x:hidden;max-width:100%;margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:calc(16px * var(--ts));line-height:1.5;-webkit-text-size-adjust:100%}
body.locked{overflow:hidden}
button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-align:inherit}
button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--signal);outline-offset:2px;border-radius:6px}
input,select,textarea{font-size:16px}

#top{position:sticky;top:0;z-index:5;background:var(--paper);padding:calc(env(safe-area-inset-top) + 12px) 18px 0;border-bottom:1px solid var(--rule)}
.tb{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
.brand{font:700 calc(28px * var(--ts))/1 var(--display);letter-spacing:-.02em;margin:0;display:flex;align-items:center;gap:10px}
.brand .x{color:var(--signal)}
.brand-mark{width:calc(32px * var(--ts));height:calc(32px * var(--ts));border-radius:calc(8px * var(--ts));background:#0E1116;flex:none;box-shadow:inset 0 0 0 1px rgba(246,247,249,.14)}
.status{color:var(--muted);font-size:calc(13.5px * var(--ts));margin-top:6px}
.tb-a{display:flex;gap:6px}
.icon{width:40px;height:40px;border-radius:20px;display:grid;place-items:center;background:var(--sheet);border:1px solid var(--rule)}
.icon svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
@keyframes spin{to{transform:rotate(360deg)}}
.tabs{display:flex;gap:22px;overflow-x:auto;scrollbar-width:none;margin-top:10px}
.tabs::-webkit-scrollbar{display:none}
.tab{padding:10px 0;color:var(--muted);font-weight:600;font-size:calc(15.5px * var(--ts));white-space:nowrap;border-bottom:2.5px solid transparent}
.tab.on{color:var(--ink);border-color:var(--signal)}
.tab i{font-style:normal;font-size:.78em;font-weight:800;margin-left:6px;color:var(--paper);background:var(--signal);border-radius:9px;padding:1px 6px;vertical-align:.1em}

.lk-row{margin-bottom:14px}
.lk-l{display:block;font-size:calc(13px * var(--ts));font-weight:600;color:var(--ink-2);margin-bottom:6px}
.sws{display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;padding:3px 3px 2px}
.sws::-webkit-scrollbar{display:none}
.sw{display:flex;flex-direction:column;align-items:center;gap:5px;flex:none}
.sw .prev{position:relative;width:50px;height:50px;border-radius:13px;display:grid;place-items:center;border:1px solid rgba(127,127,127,.35);font:700 18px/1 var(--display)}
.sw .prev i{position:absolute;right:6px;bottom:6px;width:9px;height:9px;border-radius:5px}
.sw.on .prev{outline:2.5px solid var(--signal);outline-offset:2px}
.sw small{font-size:calc(12px * var(--ts));color:var(--ink-2)}
.sw.on small{color:var(--ink);font-weight:600}
.seg{display:flex;border:1px solid var(--rule);border-radius:9px;overflow:hidden;flex:none;background:var(--sheet)}
.seg button{font-size:calc(12.5px * var(--ts));padding:6px 10px;color:var(--ink-2);white-space:nowrap}
.seg button.on{background:var(--ink);color:var(--paper);font-weight:600}
.seg.wide button{flex:1;text-align:center;padding:9px 4px;font-size:calc(13.5px * var(--ts))}
.seg button i{font-style:normal;opacity:.7;font-size:.9em}

.primary{background:var(--ink);color:var(--paper);font-weight:600;border-radius:12px;padding:11px 16px}
.primary[disabled]{opacity:.45}
.primary.block,.ghost.block{display:block;width:100%;text-align:center;padding:14px 16px;margin-top:10px}
.ghost{border:1px solid var(--rule);border-radius:12px;background:var(--sheet);font-weight:600;color:var(--ink-2)}
.sm{font-size:calc(13px * var(--ts));padding:6px 11px;border-radius:8px;border:1px solid var(--rule);background:var(--sheet);white-space:nowrap}
.sm[disabled]{opacity:.5}
.primary.sm{border-color:var(--ink);background:var(--ink)}
.danger{color:var(--danger)}
.danger.armed{background:var(--danger);color:var(--paper);border-color:var(--danger)}
.muted{color:var(--muted)}
.err{color:var(--danger);font-size:calc(14px * var(--ts))}
.link{color:var(--signal);font-weight:600;font-size:16px}
.link.small{font-size:calc(14px * var(--ts))}
.link.inline{font-size:inherit;display:inline}
.note{font-size:calc(13.5px * var(--ts));color:var(--muted);margin:6px 0}
.small{font-size:calc(13.5px * var(--ts))}
.badge-ai{display:inline-block;font-size:calc(12px * var(--ts));font-weight:700;color:var(--signal);background:var(--signal-wash);border-radius:6px;padding:2px 8px}
.badge-ex{display:inline-block;font-size:calc(12px * var(--ts));font-weight:600;color:var(--ink-2);border:1px dashed var(--muted);border-radius:6px;padding:1px 8px}
.busy-dot{width:15px;height:15px;flex:none;border-radius:50%;border:2px solid var(--rule);border-top-color:var(--signal);animation:spin .8s linear infinite}

.sheet{position:fixed;inset:0;z-index:10;background:var(--paper);transform:translateY(102%);transition:transform .28s ease;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
.sheet.open{transform:none}
.sh-head{position:sticky;top:0;z-index:2;background:var(--paper);display:flex;justify-content:space-between;align-items:center;gap:12px;padding:calc(env(safe-area-inset-top) + 14px) 18px 12px;border-bottom:1px solid var(--rule)}
.sh-head h2{font:700 calc(24px * var(--ts))/1.1 var(--display);margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sh-body{padding:16px 18px calc(env(safe-area-inset-bottom) + 40px);max-width:720px;margin:0 auto}
.hint{font-size:calc(13px * var(--ts));color:var(--muted);margin:8px 2px 0}
.sec{font:700 calc(17px * var(--ts))/1.2 var(--display);margin:26px 0 6px}
.sec2{font:700 calc(18px * var(--ts))/1.25 var(--display);margin:26px 0 10px}
.srow{display:flex;align-items:center;gap:8px;padding:11px 0;border-bottom:1px solid var(--rule)}
.srow.col{flex-direction:column;align-items:stretch;gap:4px}
.srow.col>.sm{align-self:flex-start;margin-top:6px}
button.srow.bp{width:100%;background:none;border:0;border-bottom:1px solid var(--rule);font:inherit;color:inherit;text-align:left;cursor:pointer}
.chev{color:var(--muted);font-size:calc(20px * var(--ts));line-height:1;padding:0 2px}
.grow{flex:1;min-width:0}
.grow b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.grow small{display:block;font-size:calc(13px * var(--ts));color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.grow small.wrap,small.wrap{white-space:normal}
.pad{padding:8px 0}
.switch{width:46px;height:28px;border-radius:14px;background:var(--rule);position:relative;flex:none;transition:background .2s}
.switch::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:11px;background:var(--sheet);box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .2s}
.switch.on{background:var(--signal)}
.switch.on::after{transform:translateX(18px)}
.voicesel{display:block;width:100%;margin-top:8px;font:16px var(--sans);color:var(--ink);background:var(--paper);border:1px solid var(--rule);border-radius:10px;padding:10px 11px}
#toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 22px);transform:translate(-50%,20px);opacity:0;pointer-events:none;z-index:60;
  background:var(--ink);color:var(--paper);padding:10px 16px;border-radius:12px;font-size:calc(14px * var(--ts));font-weight:500;max-width:88vw;text-align:center;transition:opacity .2s,transform .2s}
#toast.on{opacity:1;transform:translate(-50%,0)}
body.calling #toast{bottom:calc(env(safe-area-inset-bottom) + 140px)}
.booting{display:flex;align-items:center;justify-content:center;gap:10px;padding:80px 20px;color:var(--muted);font-size:calc(14px * var(--ts))}
.booting.note{flex-direction:column;text-align:center;color:var(--ink-2);padding:60px 24px}
.booting.note b{font-size:calc(18px * var(--ts));color:var(--ink)}
.booting.note pre{max-width:100%;overflow:auto;text-align:left;font:calc(12px * var(--ts))/1.45 ui-monospace,Menlo,monospace;background:var(--sheet);border:1px solid var(--rule);border-radius:10px;padding:10px;color:var(--muted);white-space:pre-wrap;-webkit-user-select:text;user-select:text}
.startlog{white-space:pre-wrap;font:calc(12px * var(--ts))/1.45 ui-monospace,Menlo,monospace;background:var(--sheet);border:1px solid var(--rule);border-radius:10px;padding:10px;margin:8px 0;color:var(--ink-2);-webkit-user-select:text;user-select:text;max-height:260px;overflow:auto}
.ver{text-align:center;color:var(--muted);font-size:calc(12px * var(--ts));margin:0;padding:8px 0 calc(env(safe-area-inset-bottom) + 24px)}

/* ── Frontly: Call tab ── */
#list{padding-bottom:20px}
.hero{max-width:640px;margin:0 auto;padding:26px 20px 8px}
.hero-h{font:800 calc(34px * var(--ts))/1.05 var(--display);letter-spacing:-.025em;margin:0 0 10px;text-wrap:balance}
.hero-p{color:var(--ink-2);font-size:calc(16.5px * var(--ts));line-height:1.5;margin:0 0 20px;max-width:46ch}
.lbl-s{display:block;font-size:calc(13.5px * var(--ts));font-weight:700;color:var(--ink-2);margin:16px 0 8px}
.from{display:flex;flex-direction:column;border:1px solid var(--rule);border-radius:16px;background:var(--sheet);overflow:hidden}
.from-r{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-bottom:1px solid var(--rule);text-align:left;position:relative;cursor:pointer}
.from-r:last-child{border-bottom:0}
.from-r.on{background:var(--signal-wash)}
.from-r.on::after{content:"";position:absolute;right:16px;top:50%;width:10px;height:10px;margin-top:-5px;border-radius:50%;background:var(--signal);box-shadow:0 0 0 4px var(--sheet)}
.from-r .grow{padding-right:26px}
.from-r input{display:block;width:100%;margin-top:4px;font:600 16px var(--sans);color:var(--ink);background:var(--paper);border:1px solid var(--rule);border-radius:9px;padding:8px 10px}
.av{width:38px;height:38px;border-radius:19px;flex:none;display:grid;place-items:center;background:var(--paper);border:1px solid var(--rule);font:700 calc(14px * var(--ts))/1 var(--rounded);color:var(--ink-2)}
.av.new{font-size:calc(20px * var(--ts));color:var(--signal)}
.engine{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 8px;margin:18px 0 0;font-size:calc(14.5px * var(--ts));color:var(--ink-2)}
.callgo{position:sticky;bottom:calc(env(safe-area-inset-bottom) + 12px);z-index:3;display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin:22px 0 6px;padding:15px 18px;border-radius:30px;
  background:var(--signal);color:var(--paper);box-shadow:0 0 0 12px var(--paper),0 14px 30px -14px var(--signal);transition:transform .15s}
.callgo:active{transform:scale(.98)}
.callgo svg{width:22px;height:22px;fill:currentColor}
.callgo span{font:700 calc(17px * var(--ts))/1 var(--rounded)}
.block{max-width:640px;margin:18px auto 0;padding:0 20px}
.block-h{display:flex;justify-content:space-between;align-items:baseline;margin:0 0 8px}
.block-h h3{font:700 calc(18px * var(--ts))/1.2 var(--display);margin:0}
.crow{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 2px;border-bottom:1px solid var(--rule);position:relative}
.crow .stripe{position:static;width:4px;align-self:stretch;border-radius:2px;flex:none}
.pill{display:inline-flex;align-items:center;gap:4px;font-size:calc(12.5px * var(--ts));font-weight:650;line-height:1.35;border-radius:7px;padding:2px 8px;background:var(--paper);border:1px solid var(--rule);color:var(--ink-2);max-width:100%;min-width:0;flex:none;white-space:nowrap;text-align:left}
.pill.flag,.chips .pill{white-space:normal;overflow-wrap:anywhere;flex:0 1 auto}
.pill.soft{font-weight:500}
.pill.flag{color:var(--danger);border-color:var(--danger);background:var(--sheet);align-items:flex-start;padding:4px 8px}
.pill.st-waiting{color:var(--signal);border-color:var(--signal);background:var(--signal-wash)}
.pill.st-booked{color:var(--ink);background:var(--sheet)}
.pill.st-closed{color:var(--muted)}
.pill.tri-emergency{background:var(--danger);border-color:var(--danger);color:var(--paper)}
.pill.tri-urgent{background:var(--amber-wash);border-color:var(--amber);color:var(--amber)}
.pill.tri-soon{background:var(--signal-wash);border-color:var(--signal);color:var(--signal)}
.stripe.tri-emergency{background:var(--danger)}.stripe.tri-urgent{background:var(--amber)}.stripe.tri-soon{background:var(--signal)}.stripe.tri-routine{background:var(--rule)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.empty{padding:60px 28px;text-align:center;color:var(--ink-2)}
.empty h2{font:700 calc(23px * var(--ts))/1.2 var(--display);color:var(--ink);margin:0 0 8px}
.empty p{max-width:34ch;margin:0 auto 20px}
.search{max-width:640px;margin:0 auto;padding:16px 20px 4px}
.search input{width:100%;font:16px var(--sans);padding:11px 13px;border-radius:12px;border:1px solid var(--rule);background:var(--sheet);color:var(--ink)}
.ptools{max-width:680px;margin:0 auto;padding:14px 16px 0}
.ptools .search{padding:0 0 10px}
.ptools .seg button i{font-style:normal;opacity:.65;margin-left:2px}
.pgroup{display:flex;align-items:center;gap:6px;margin:10px 0 0;overflow-x:auto;scrollbar-width:none}
.pgroup::-webkit-scrollbar{display:none}
.pgroup span{font-size:calc(13px * var(--ts));color:var(--muted);margin-right:2px;white-space:nowrap}
.chip{white-space:nowrap;font-size:calc(13.5px * var(--ts));padding:5px 12px;border-radius:15px;border:1px solid var(--rule);background:var(--sheet);color:var(--ink-2)}
.chip.on{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.plist{max-width:680px;margin:0 auto;padding:4px 14px 0}
.pgrp-h{display:flex;align-items:baseline;gap:8px;font:700 calc(15px * var(--ts))/1.2 var(--display);color:var(--ink-2);margin:20px 4px 8px}
.pgrp-h i{font-style:normal;font-weight:600;font-size:calc(12.5px * var(--ts));color:var(--muted)}
.pcard{display:flex;align-items:flex-start;gap:12px;width:100%;text-align:left;background:var(--sheet);border:1px solid var(--rule);border-radius:16px;padding:var(--pad) 12px var(--pad) 14px;margin-bottom:var(--gap)}
.pcard .grow b{display:inline;white-space:normal}
.pcard .chev{align-self:center}
.pc-top{display:flex;align-items:baseline;gap:8px}
.pc-tri{margin-left:auto;flex:none;align-self:center}
.pc-top b{font:700 calc(17px * var(--ts))/1.25 var(--display)}
.pc-top small{font-size:calc(13.5px * var(--ts));color:var(--muted)}
.grow small.pc-ph{color:var(--muted);font-variant-numeric:tabular-nums}
.pc-line{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;margin-top:6px;font-size:calc(14px * var(--ts));color:var(--ink-2)}
.pc-line b{display:inline;font-weight:650;color:var(--ink)}
.pcard .chips{margin-top:8px}
.av.ring{border-width:2px}
.pcard.st-tobook .av.ring{border-color:var(--amber);color:var(--amber)}
.pcard.st-booked .av.ring{border-color:var(--signal);color:var(--signal)}
.pcard.st-new .av.ring{border-style:dashed}
.pill.warn{color:var(--amber);border-color:var(--amber);background:var(--amber-wash)}
.pill.line{color:var(--signal);border-color:var(--signal);background:var(--sheet)}
.realline{display:flex;align-items:center;gap:12px;background:var(--sheet);border:1px solid var(--rule);border-radius:16px;padding:14px 16px}
.realline .grow b{display:block;white-space:normal}
.realline .grow span{display:block;font:700 calc(19px * var(--ts))/1.3 var(--rounded);font-variant-numeric:tabular-nums;margin:2px 0 4px}
.rl-btns{display:flex;flex-direction:column;align-items:center;gap:8px;flex:none}
.rl-btns .primary.sm{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;font-size:calc(14px * var(--ts))}
.rl-btns svg{width:16px;height:16px;fill:currentColor}
.db-acts{display:flex;gap:14px;align-items:center}

/* ── Front desk ── */
.desk-in .pin{width:100%;font:700 22px/1 var(--rounded);letter-spacing:.4em;text-align:center;padding:12px;border-radius:12px;border:1px solid var(--rule);background:var(--sheet);color:var(--ink)}
.deskbar{display:flex;justify-content:space-between;align-items:center;gap:10px;max-width:680px;margin:0 auto;padding:12px 18px 0;color:var(--ink-2);font-size:calc(13.5px * var(--ts))}
.segbar{max-width:680px;margin:0 auto;padding:10px 18px 4px}
.queue{max-width:680px;margin:0 auto;padding:8px 14px 0;display:flex;flex-direction:column;gap:var(--gap)}
.qcard{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:3px;width:100%;text-align:left;background:var(--sheet);border:1px solid var(--rule);border-radius:16px;padding:var(--pad) 16px var(--pad) 22px;overflow:hidden}
.qcard .stripe{position:absolute;left:0;top:0;bottom:0;width:6px}
.q-top{display:flex;align-items:center;flex-wrap:wrap;gap:6px;width:100%}
.q-when{margin-left:auto;white-space:nowrap;font-size:calc(12.5px * var(--ts));color:var(--muted)}
.q-name{font:700 calc(19px * var(--ts))/1.25 var(--display);margin-top:4px}
.q-name small{font-weight:500;color:var(--muted)}
.q-why{color:var(--ink-2);font-size:calc(15px * var(--ts))}
.q-bk{font-size:calc(13.5px * var(--ts));font-weight:650;color:var(--signal);margin-top:6px}
#casesheet,#patsheet{z-index:11}
#casesheet{z-index:12}
.sumbox{background:var(--sheet);border:1px solid var(--rule);border-radius:16px;padding:14px 16px;min-width:0;overflow-wrap:anywhere}
.sumbox p{margin:8px 0 0;font-size:calc(16.5px * var(--ts));line-height:1.5}
html[data-font=serif] .sumbox p{font-family:var(--serif)}
.bk{background:var(--sheet);border:1px solid var(--rule);border-radius:16px;padding:6px 14px 14px}
.bk-hint{margin:8px 0 0;font-weight:600;color:var(--ink-2)}
.days{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:12px -14px 0;padding:2px 14px 4px}
.days::-webkit-scrollbar{display:none}
.day{flex:none;width:62px;display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 4px;border-radius:12px;border:1px solid var(--rule);background:var(--paper)}
.day small{font-size:calc(12px * var(--ts));color:var(--muted)}
.day b{font:700 calc(20px * var(--ts))/1.1 var(--rounded)}
.day i{font-style:normal;font-size:calc(11px * var(--ts));color:var(--ink-2)}
.day.on{background:var(--ink);border-color:var(--ink);color:var(--paper)}
.day.on small,.day.on i{color:inherit;opacity:.8}
.day[disabled]{opacity:.4}
.slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:8px;margin-top:12px}
.slot{padding:10px 0;text-align:center;border-radius:10px;border:1px solid var(--rule);background:var(--paper);font:650 calc(15px * var(--ts))/1 var(--rounded);font-variant-numeric:tabular-nums;position:relative}
.slot[disabled]{opacity:.35;text-decoration:line-through}
.slot.pref::after,.pref-dot{content:"";position:absolute;top:5px;right:5px;width:6px;height:6px;border-radius:3px;background:var(--signal)}
.pref-dot{position:static;display:inline-block;vertical-align:1px;margin-right:4px}
.slot.on{background:var(--signal);border-color:var(--signal);color:var(--paper)}
.slot.on::after{background:var(--paper)}
.booked{display:flex;flex-direction:column;gap:2px;background:var(--signal-wash);border:1px solid var(--signal);border-radius:16px;padding:14px 16px}
.booked b{font:700 calc(18px * var(--ts))/1.3 var(--display);color:var(--ink)}
.booked.closed{background:var(--sheet);border-color:var(--rule)}
.facts{margin:0;background:var(--sheet);border:1px solid var(--rule);border-radius:16px;padding:2px 16px}
.facts div{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--rule)}
.facts div:last-child{border-bottom:0}
.facts dt{flex:none;width:6.5em;color:var(--muted);font-size:calc(14px * var(--ts))}
.facts dd{margin:0;font-size:calc(15px * var(--ts));min-width:0;overflow-wrap:anywhere}
.tag{font-style:normal;font-size:calc(11.5px * var(--ts));font-weight:700;border-radius:5px;padding:1px 6px;white-space:nowrap}
.tag.ai{color:var(--signal);background:var(--signal-wash)}
.tag.ok{color:var(--signal);background:var(--signal-wash)}
.hist,.notes{list-style:none;margin:10px 0 0;padding:0}
.hist li{padding:7px 0;border-bottom:1px solid var(--rule);font-size:calc(14.5px * var(--ts));color:var(--ink-2)}
.hist li b{color:var(--ink);font-weight:650;margin-right:4px}
.notes li{background:var(--amber-wash);border-radius:12px;padding:10px 12px;margin-bottom:8px}
.notes li p{margin:0 0 2px;font-size:calc(15px * var(--ts))}
.notes small{font-size:calc(12.5px * var(--ts))}
.appt{display:flex;align-items:center;gap:10px;padding:11px 14px;background:var(--sheet);border:1px solid var(--rule);border-radius:14px;margin-bottom:8px}
.appt b{display:block;font-weight:650}
.appt small{display:block;color:var(--ink-2);font-size:calc(13px * var(--ts))}
.appt.msg b,.appt.msg small{white-space:normal;overflow:visible;overflow-wrap:anywhere}
/* one patient, several calls: a stacked card */
.qgroup{position:relative;display:flex;flex-direction:column;gap:2px;background:var(--sheet);border:1px solid var(--rule);border-radius:18px;padding:12px 14px 6px 20px;overflow:hidden;margin-bottom:10px;box-shadow:0 5px 0 -2px var(--paper),0 5px 0 -1px var(--rule),0 10px 0 -4px var(--paper),0 10px 0 -3px var(--rule)}
.qgroup>.stripe{position:absolute;left:0;top:0;bottom:0;width:6px}
.qg-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;justify-content:space-between}
.qg-head .q-name{font-size:calc(19px * var(--ts))}
.qg-visits{display:flex;flex-direction:column;gap:2px;margin:4px 0 2px}
.qrow{display:grid;grid-template-columns:1fr auto;gap:2px 8px;align-items:center;text-align:left;background:none;border:0;border-top:1px solid var(--rule);padding:10px 0;color:inherit;font:inherit;width:100%}
.qrow .q-top,.qrow .q-why,.qrow .q-bk{grid-column:1}
.qrow .chev{grid-column:2;grid-row:1/span 3;color:var(--muted)}
/* booking: the suggestion and the AI plan */
.sug{display:flex;align-items:center;gap:10px;border:1px solid var(--rule);border-radius:14px;padding:10px 12px;margin:0 0 10px;background:var(--paper)}
.sug p{margin:0;flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.sug b{font-weight:700}
.sug small{color:var(--ink-2);font-size:calc(13px * var(--ts))}
.sug .sug-w{color:var(--amber)}
.sug-k{font-size:calc(12px * var(--ts));font-weight:700;color:var(--signal);text-transform:uppercase;letter-spacing:.04em}
.sug.ai{border-color:var(--signal)}
.sug-on{color:var(--signal);font-weight:700;font-size:calc(13px * var(--ts));white-space:nowrap}
.sug-alt{font-size:calc(13px * var(--ts));color:var(--muted)}
.slot.rule{text-decoration:line-through dotted;opacity:.55}
.rule-n{color:var(--amber)}
/* calendar */
.calwrap{max-width:680px;margin:0 auto;padding:4px 16px 0}
.calnav{display:flex;align-items:center;gap:8px;margin:8px 0 6px}
.calnav b{flex:1;text-align:center;font-size:calc(17px * var(--ts))}
.cn-b{width:40px;height:40px;border-radius:12px;border:1px solid var(--rule);background:var(--sheet);color:var(--ink);font-size:22px}
.calsum{display:flex;align-items:center;gap:14px;background:var(--sheet);border:1px solid var(--rule);border-radius:16px;padding:12px 16px;margin:8px 0 12px}
.calsum>b{font-size:calc(34px * var(--ts));font-weight:800;color:var(--signal);font-variant-numeric:tabular-nums}
.calsum span{display:flex;flex-direction:column;font-size:calc(15px * var(--ts))}
.calsum small{color:var(--muted);font-size:calc(13px * var(--ts))}
.cdoc{background:var(--sheet);border:1px solid var(--rule);border-radius:14px;padding:10px 12px;margin-bottom:8px}
.cdoc.off{opacity:.55}
.cd-h{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}
.cd-h small{color:var(--muted);flex:1;font-size:calc(13px * var(--ts))}
.cd-p{font-weight:700;font-variant-numeric:tabular-nums}
.strip{display:flex;gap:2px;height:22px}
.strip i,.k{flex:1;border-radius:3px;background:var(--rule)}
.strip i.taken,.k.taken{background:var(--ink-2);opacity:.45}
.strip i.ours,.k.ours{background:var(--signal)}
.strip i.free,.k.free{background:var(--rule)}
.k{display:inline-block;width:12px;height:12px;vertical-align:-2px;margin:0 2px 0 8px;flex:none}
.k.urgent{background:var(--amber)}
.ticks{display:flex;justify-content:space-between;color:var(--muted);font-size:calc(11.5px * var(--ts));margin-top:3px;font-variant-numeric:tabular-nums}
.cr-t{font-weight:700;font-variant-numeric:tabular-nums;min-width:3em}
.hscroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -4px}
.heatgrid{border-collapse:separate;border-spacing:3px;width:100%;table-layout:fixed}
.heatgrid col.rhc{width:27%}
.heatgrid th{font-size:calc(12.5px * var(--ts));font-weight:650;color:var(--ink-2);text-align:center}
.heatgrid th small{display:block;color:var(--muted);font-weight:500}
.heatgrid th.today{color:var(--signal)}
.heatgrid th.rh{text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:calc(12px * var(--ts))}
.heatgrid tr.tot th,.heatgrid tr.tot b{font-weight:800}
.hcell,.mcell{position:relative;display:flex;align-items:center;justify-content:center;width:100%;min-height:40px;border-radius:10px;border:1px solid var(--rule);background:var(--sheet);color:var(--ink);font:inherit;overflow:hidden;padding:0}
.hcell b,.mcell b{position:relative;font-variant-numeric:tabular-nums;font-size:calc(14px * var(--ts))}
.hcell.off{color:var(--muted);background:none;border-style:dashed}
.heat{position:absolute;inset:0;background:var(--signal)}
.dot{position:absolute;top:4px;right:4px;width:6px;height:6px;border-radius:50%;background:var(--ink)}
.month{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.mh{text-align:center;font-size:calc(12px * var(--ts));color:var(--muted);font-weight:650}
.mcell{flex-direction:column;min-height:52px}
.mcell small{position:relative;font-size:calc(12px * var(--ts));color:var(--ink-2)}
.mcell small.today{color:var(--signal);font-weight:800}
.mcell b{font-size:calc(12.5px * var(--ts))}
.mcell.out{border:0;background:none}
.mcell.closed{background:none;border-style:dashed;color:var(--muted)}
.cal-k{margin-top:14px}
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
.tile{background:var(--sheet);border:1px solid var(--rule);border-radius:14px;padding:10px 12px;display:flex;flex-direction:column}
.tile small{color:var(--muted);font-size:calc(12.5px * var(--ts))}
.tile b{font-size:calc(26px * var(--ts));font-weight:800;font-variant-numeric:tabular-nums}
.tile span{color:var(--ink-2);font-size:calc(12.5px * var(--ts))}
.insights{margin:6px 0 4px;padding-left:18px;color:var(--ink-2);font-size:calc(14.5px * var(--ts));display:flex;flex-direction:column;gap:6px}
.bars{display:flex;align-items:stretch;gap:4px;height:150px;padding:4px 0}
.bar{flex:1;display:flex;flex-direction:column;align-items:center;min-width:0}
.bar b{font-size:calc(10.5px * var(--ts));color:var(--ink-2);font-variant-numeric:tabular-nums;white-space:nowrap}
.b-col{flex:1;width:100%;display:flex;flex-direction:column-reverse;justify-content:flex-start;gap:0}
.b-col i{display:block;width:100%;background:var(--ink-2);opacity:.5;border-radius:4px 4px 0 0}
.b-col i.b2{background:var(--amber);opacity:1;border-radius:0}
.bar.now .b-col i:not(.b2){background:var(--signal);opacity:1}
.bar.ahead .b-col i:not(.b2){background:var(--signal);opacity:.35}
.bar small{font-size:calc(10.5px * var(--ts));color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.cfgin.wide{display:block;width:100%;margin:8px 0;font:16px/1.45 var(--sans);padding:9px 11px;border-radius:10px;border:1px solid var(--rule);background:var(--paper);color:var(--ink);-webkit-user-select:text;user-select:text}
textarea.cfgin.wide{resize:vertical}

/* ── The call: an in-call screen in the inverse colours ── */
#callsheet{z-index:11;background:var(--ink);color:var(--paper);display:flex;flex-direction:column;overflow:hidden}
#callsheet:not(.open){pointer-events:none}
.c-top{display:flex;align-items:center;gap:12px;padding:calc(env(safe-area-inset-top) + 16px) 18px 6px}
.c-top b{font:700 calc(18px * var(--ts))/1.2 var(--display);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c-top .grow small{display:block;color:inherit;opacity:.78;font-size:calc(12.5px * var(--ts));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c-av{width:46px;height:46px;border-radius:23px;flex:none;display:grid;place-items:center;background:var(--signal-wash);color:var(--ink);font:800 calc(20px * var(--ts))/1 var(--rounded);position:relative}
.c-av.talk::after,.c-av.ring::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid var(--signal-wash);animation:halo 1.2s ease-out infinite}
@keyframes halo{from{opacity:.9;transform:scale(.9)}to{opacity:0;transform:scale(1.35)}}
.c-time{font:600 calc(15px * var(--ts))/1 var(--rounded);font-variant-numeric:tabular-nums;opacity:.85}
.c-phase{display:flex;align-items:center;gap:8px;min-height:30px;padding:2px 18px 8px;font-size:calc(14px * var(--ts));font-weight:600;color:var(--signal-wash)}
.c-phase .busy-dot{border-color:rgba(127,127,127,.4);border-top-color:var(--signal-wash)}
.eq{display:flex;align-items:flex-end;gap:2px;height:14px;flex:none}
.eq i{width:3px;height:100%;background:currentColor;border-radius:2px;animation:eq 1s ease-in-out infinite}
.eq i:nth-child(2){animation-delay:-.35s}.eq i:nth-child(3){animation-delay:-.7s}
@keyframes eq{0%,100%{height:30%}50%{height:100%}}
.c-body{flex:1;min-height:0;display:flex;flex-direction:column;gap:10px;padding:0 14px}
.c-log{flex:1;min-height:90px;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;gap:8px;padding:4px 2px 8px}
.c-log.flat{max-height:none;margin-top:10px;background:var(--sheet);border:1px solid var(--rule);border-radius:16px;padding:12px}
.c-empty{opacity:.7;text-align:center;margin:auto}
.bub{margin:0;max-width:84%;padding:9px 13px;border-radius:18px;font-size:calc(15.5px * var(--ts));line-height:1.4}
.bub.reva{align-self:flex-start;background:rgba(127,127,127,.22);border-bottom-left-radius:5px}
.bub.caller{align-self:flex-end;background:var(--signal-wash);color:var(--ink);border-bottom-right-radius:5px}
.c-log.flat .bub.reva{background:var(--paper)}
.c-log.flat .bub.caller{color:var(--paper);background:var(--signal)}
.intake{flex:none;max-height:44vh;overflow-y:auto;border-radius:18px;background:var(--paper);color:var(--ink);padding:10px 14px}
.in-h{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding-bottom:6px;border-bottom:1px solid var(--rule)}
.in-h b{font:700 calc(15px * var(--ts))/1.2 var(--display)}
.in-h span{font-size:calc(12.5px * var(--ts));color:var(--signal);font-weight:650}
.in-row{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--rule);font-size:calc(14px * var(--ts))}
.in-row:last-child{border-bottom:0}
.in-l{flex:none;width:5.6em;color:var(--muted)}
.in-v{min-width:0;flex:1;display:flex;align-items:center;gap:8px;flex-wrap:wrap;overflow-wrap:anywhere}
.in-row.has .in-v{font-weight:600}
.in-wait{display:block;width:44%;height:8px;border-radius:4px;background:var(--rule)}
.in-row.fresh{animation:fill 1.8s ease-out}
@keyframes fill{0%{background:var(--signal-wash)}100%{background:transparent}}
.meter{width:80px;height:8px;border-radius:4px;background:var(--rule);overflow:hidden;position:relative}
.meter i{position:absolute;left:0;top:0;bottom:0;width:var(--v);background:var(--amber);border-radius:4px}
.dots{display:inline-flex;gap:4px}
.dots i{width:10px;height:10px;border-radius:5px;background:var(--rule)}
.dots i.on{background:var(--amber)}
.c-type{display:flex;gap:8px;padding:10px 14px 0}
.c-type input{flex:1;min-width:0;font:16px var(--sans);padding:11px 13px;border-radius:22px;border:0;background:var(--paper);color:var(--ink)}
.c-ctrl{display:flex;justify-content:space-around;align-items:flex-start;padding:14px 18px calc(env(safe-area-inset-bottom) + 14px)}
.cbtn{display:flex;flex-direction:column;align-items:center;gap:6px;width:92px;color:var(--paper)}
.cbtn svg{width:58px;height:58px;padding:16px;border-radius:50%;background:rgba(127,127,127,.28);fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.cbtn small{font-size:calc(12.5px * var(--ts));opacity:.85;text-align:center;line-height:1.2}
.cbtn[aria-pressed=true] svg{background:var(--paper);color:var(--ink)}
.cbtn.mic svg{width:74px;height:74px;padding:20px;background:var(--signal-wash);color:var(--ink)}
.cbtn.mic.live svg{animation:mic 1.1s ease-in-out infinite}
@keyframes mic{50%{box-shadow:0 0 0 10px rgba(127,127,127,.25)}}
.cbtn.mic[disabled] svg{opacity:.5}
.cbtn.hang svg{background:var(--danger);color:var(--paper);fill:currentColor;stroke:none}
.c-saved{flex:none;background:var(--paper);color:var(--ink);border-radius:18px;padding:16px;margin-bottom:calc(env(safe-area-inset-bottom) + 14px);max-height:60vh;overflow-y:auto}
.c-saved h3{font:700 calc(20px * var(--ts))/1.2 var(--display);margin:0 0 2px}
.c-saved p{margin:0}
.c-saved .sumbox{margin-top:12px}
body.calling #top{visibility:hidden}

/* ── shared sheets: AI, Settings, Built with ── */
#cfgsheet{z-index:13}
#aisheet{z-index:14}
#bpabout{position:fixed;inset:0;z-index:15;pointer-events:none}
#bpabout.open{pointer-events:auto}
.bp-dim{position:absolute;inset:0;background:rgba(0,0,0,.45);opacity:0;transition:opacity .2s}
#bpabout.open .bp-dim{opacity:1}
.bp-card{position:absolute;left:0;right:0;bottom:0;max-height:86vh;overflow-y:auto;-webkit-overflow-scrolling:touch;background:var(--paper);color:var(--ink);border-top:1px solid var(--rule);border-radius:20px 20px 0 0;padding:18px 20px calc(env(safe-area-inset-bottom) + 28px);transform:translateY(105%);transition:transform .25s ease}
#bpabout.open .bp-card{transform:none}
.bp-top{display:flex;align-items:flex-start;gap:12px;margin-bottom:6px}
.bp-kick{display:block;font:700 calc(11.5px * var(--ts))/1.2 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--signal)}
.bp-card h2{font:700 calc(24px * var(--ts))/1.15 var(--display);margin:4px 0 4px}
.bp-l{font:700 calc(12.5px * var(--ts))/1.2 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:20px 0 6px}
.bp-p{margin:0;font-size:calc(16px * var(--ts));line-height:1.45}
#cfgsheet .lk-row{margin:10px 0 14px}
.cfg{padding:12px 0;border-bottom:1px solid var(--rule)}
.cfg.ch .cfg-h b::after{content:"";display:inline-block;width:7px;height:7px;border-radius:4px;background:var(--signal);margin-left:7px;vertical-align:2px}
.cfg-h{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.cfg-h b{font-weight:600}
.cfg small{display:block;font-size:calc(13px * var(--ts));margin-top:2px}
.stepper{display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap}
.stepper button{width:38px;height:36px;border-radius:9px;border:1px solid var(--rule);background:var(--sheet);font-size:20px;font-weight:600;text-align:center}
.stepper button[disabled]{opacity:.35}
.stepper input{width:86px;text-align:center;font:600 16px var(--sans);padding:7px 6px;border-radius:9px;border:1px solid var(--rule);background:var(--paper);color:var(--ink);-webkit-user-select:text;user-select:text}
.stepper .unit{font-size:calc(14px * var(--ts));color:var(--ink-2);min-width:2.5em}
.stepper .range{flex-basis:100%;font-size:calc(12px * var(--ts));color:var(--muted)}
.cfgin:focus{outline:2px solid var(--signal);outline-offset:-1px}
.cfg-foot{margin-top:18px}
#cfgsheet h3.sec{font:700 calc(12.5px * var(--ts, 1))/1.2 var(--sans, -apple-system, system-ui, sans-serif);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:28px 4px 8px}
#cfgsheet .grp{background:var(--sheet);border:1px solid var(--rule);border-radius:16px;padding:0 16px;overflow:hidden}
#cfgsheet .grp>*:last-child{border-bottom:0}
#cfgsheet .grp .lk-row{margin:0;padding:12px 0;border-bottom:1px solid var(--rule)}
#cfgsheet .cfg-foot{margin:10px 4px 0}
.aicard,.ucard{background:var(--sheet);border:1px solid var(--rule);border-radius:14px;padding:14px;margin:14px 0}
.aicard.active{border-color:var(--signal);box-shadow:0 0 0 1px var(--signal)}
.aic-h{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:calc(17px * var(--ts))}
.aic-row{display:flex;align-items:center;gap:10px;margin-top:10px;font-size:calc(14px * var(--ts))}
.aic-row.lbl,.aic-row .lbl{font-weight:600;color:var(--ink-2)}
.aicard code{font:calc(13px * var(--ts)) ui-monospace,Menlo,monospace;background:var(--paper);border:1px solid var(--rule);border-radius:6px;padding:2px 6px}
.aic-btns{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px}
.aic-btns .note{margin:0}
.modelsel{display:block;width:100%;margin-top:6px;font:16px var(--sans);color:var(--ink);background:var(--paper);border:1px solid var(--rule);border-radius:9px;padding:9px 10px}
.ustat{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 4px}
.ustat div{background:var(--paper);border-radius:10px;padding:8px 10px}
.ustat b{display:block;font:700 calc(20px * var(--ts))/1.2 var(--display)}
.ustat small{color:var(--muted);font-size:calc(12px * var(--ts))}
.ubars{display:flex;align-items:flex-end;gap:3px;height:56px;margin-top:10px}
.ubars span{flex:1;background:var(--signal);border-radius:3px 3px 0 0;min-height:2px}
.ubars span.zero{background:var(--rule)}
.ubars-l{display:flex;justify-content:space-between;font-size:calc(11.5px * var(--ts));color:var(--muted);margin-top:4px}
.utab{width:100%;border-collapse:collapse;margin-top:12px;font-size:calc(13px * var(--ts))}
.utab th{text-align:left;font-weight:600;color:var(--muted);padding:4px 4px 4px 0;border-bottom:1px solid var(--rule)}
.utab td{padding:6px 4px 6px 0;border-bottom:1px solid var(--rule);color:var(--ink-2);word-break:break-word}
.utab th:not(:first-child),.utab td:not(:first-child){text-align:right;white-space:nowrap}

/* in-app updates */
#upd{position:fixed;inset:0;z-index:48;background:rgba(0,0,0,.55);display:flex;align-items:flex-end}
.updp{width:100%;background:var(--sheet);color:var(--ink);border-radius:22px 22px 0 0;padding:20px 18px calc(16px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px;animation:updup .25s ease-out}
@keyframes updup{from{transform:translateY(40px);opacity:.4}}
.updtag{align-self:flex-start;background:var(--signal);color:var(--sheet);font-size:calc(12px * var(--ts));font-weight:800;padding:4px 10px;border-radius:999px;letter-spacing:.02em}
.updt{margin:6px 0 0;font:700 calc(22px * var(--ts))/1.2 var(--display);letter-spacing:-.01em}
.upds{color:var(--muted);font-size:calc(14px * var(--ts))}
.updl{display:flex;flex-direction:column;gap:10px;margin:8px 0 6px}
.updi{display:flex;gap:12px;align-items:flex-start;background:var(--paper);border-radius:14px;padding:12px}
.updic{font:calc(24px * var(--ts))/1.1 "Apple Color Emoji","Noto Color Emoji",sans-serif;flex:none;width:30px;text-align:center}
.updi b{display:block;font-size:calc(15px * var(--ts))}
.updi span{display:block;color:var(--muted);font-size:calc(13px * var(--ts));line-height:1.35;margin-top:2px}
.updmsg{font-size:calc(14px * var(--ts))}
.updmsg:empty{display:none}
.updgo{padding:13px;font-size:16px;text-align:center}
.updgo[disabled]{opacity:.6}
.updlater{padding:11px;background:var(--paper);border-radius:10px;text-align:center;font-weight:600;color:var(--ink-2)}
/* AI invitation (app-blueprints · ai-invitation): above Settings and the AI sheet, below the update sheet and the launch screen */
#aiinv{position:fixed;inset:0;z-index:47;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.45);animation:aiinvFade .25s ease both}
#aiinv.out{animation:aiinvFadeOut .24s ease both}
.aiinv-card{position:relative;width:100%;max-width:380px;background:var(--sheet);color:var(--ink);border:1px solid var(--rule);border-radius:24px;padding:26px 22px 16px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.35);animation:aiinvUp .5s cubic-bezier(.2,.9,.3,1.2) both}
#aiinv.out .aiinv-card{animation:aiinvDown .24s ease both}
.aiinv-spark{width:56px;height:56px;margin:-4px auto 10px;border-radius:18px;display:grid;place-items:center;font-size:calc(30px * var(--ts));color:var(--signal);background:var(--signal-wash);animation:aiinvTwinkle 2.4s ease-in-out .5s infinite}
#aiinv h2{margin:0 0 6px;font-family:var(--display);font-size:calc(23px * var(--ts));line-height:1.2;font-weight:800}
.aiinv-lead{margin:0 0 14px;color:var(--ink-2);font-size:calc(15px * var(--ts))}
.aiinv-perks{list-style:none;margin:0 0 14px;padding:0;text-align:left}
.aiinv-perks li{display:flex;gap:10px;align-items:center;padding:9px 12px;margin-bottom:6px;border-radius:12px;background:var(--signal-wash);font-size:calc(15px * var(--ts));font-weight:600;animation:aiinvPerk .4s ease both;animation-delay:calc(.25s + var(--i) * .09s)}
.aiinv-ico{flex:none;width:22px;text-align:center}
.aiinv-steps{margin:0 0 16px;padding-left:22px;text-align:left;color:var(--muted);font-size:calc(13px * var(--ts));line-height:1.6}
.aiinv-go{display:block;width:100%;border:0;border-radius:14px;padding:14px;font:700 calc(17px * var(--ts)) var(--display);color:var(--sheet);background:var(--signal);animation:aiinvGlow 1.6s ease-in-out .9s 2}
.aiinv-go:focus{outline:none}
.aiinv-go:focus-visible{box-shadow:0 0 0 4px var(--signal-wash)}
.aiinv-row{display:flex;justify-content:space-between;gap:8px;margin-top:6px}
.aiinv-later,.aiinv-never{border:0;background:none;padding:12px 6px;color:var(--muted);font:600 calc(14px * var(--ts)) var(--sans, inherit)}
.aiinv-later{color:var(--ink-2)}
.aiinv-nudge{animation:aiinvGlow 1.2s ease-in-out 2}
@keyframes aiinvFade{from{opacity:0}to{opacity:1}}
@keyframes aiinvFadeOut{from{opacity:1}to{opacity:0}}
@keyframes aiinvUp{from{opacity:0;transform:translateY(40px) scale(.94)}to{opacity:1;transform:none}}
@keyframes aiinvDown{to{opacity:0;transform:translateY(24px) scale(.97)}}
@keyframes aiinvPerk{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
@keyframes aiinvTwinkle{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.12) rotate(12deg)}}
@keyframes aiinvGlow{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 0 6px var(--signal-wash)}}

/* Launch screen (app-blueprints · launch-screen 1.0.2) */
.splash{--sp-bg:#0E1116;--sp-ink:#F6F7F9;--sp-accent:#F59BB5;--sp-accent2:#5EEAD4;--sp-muted:#9AA3AE;--sp-font:var(--display);
  position:fixed;inset:0;z-index:90;background:var(--sp-bg);color:var(--sp-ink);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;cursor:pointer;
  animation:spOut .4s ease 2.4s forwards}
.splash.gone{display:none}
.spIcon{width:148px;height:148px;opacity:0;transform:scale(.86);animation:spIn .5s cubic-bezier(.2,.9,.3,1.2) .05s forwards}
.spIcon svg{width:100%;height:100%;display:block;overflow:visible}
.spFrame{fill:none;stroke:var(--sp-ink);stroke-opacity:.35;stroke-width:7;stroke-linecap:round;stroke-linejoin:round;opacity:0;animation:spFade .4s ease .25s forwards}
.spDraw{fill:none;stroke:var(--sp-ink);stroke-width:12;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:100;stroke-dashoffset:100;animation:spDraw .8s ease-in-out .15s forwards}
.spPop{fill:var(--sp-accent);transform-box:fill-box;transform-origin:center;transform:scale(0);animation:spPop .45s cubic-bezier(.3,1.7,.5,1) .75s forwards}
.spSweep{fill:none;stroke:var(--sp-accent2);stroke-width:9;stroke-linecap:round;stroke-linejoin:round;opacity:0;transform:translateX(var(--sp-sweep-from,-120px));animation:spSweep 1s ease-in-out .95s forwards}
.spWord{font:800 40px/1 var(--sp-font,ui-rounded,-apple-system,system-ui,sans-serif);letter-spacing:-.02em;opacity:0;transform:translateY(10px);animation:spUp .45s ease 1.05s forwards}
.spWord span{color:var(--sp-accent)}
.spTag{font:600 15px/1.3 -apple-system,system-ui,sans-serif;letter-spacing:.06em;color:var(--sp-muted);opacity:0;transform:translateY(8px);animation:spUp .45s ease 1.4s forwards}
@keyframes spIn{to{opacity:1;transform:scale(1)}}
@keyframes spFade{to{opacity:1}}
@keyframes spDraw{to{stroke-dashoffset:0}}
@keyframes spPop{to{transform:scale(1)}}
@keyframes spSweep{0%{opacity:0}15%{opacity:1}100%{opacity:1;transform:translateX(0)}}
@keyframes spUp{to{opacity:1;transform:none}}
@keyframes spOut{to{opacity:0;visibility:hidden}}
@media (prefers-reduced-motion:reduce){
  .splash *{animation:none!important;opacity:1!important;transform:none!important;stroke-dashoffset:0!important}
  .splash{animation:spOut .3s ease 1.6s forwards!important}
}
@media (prefers-reduced-motion: reduce){
  #aiinv,#aiinv.out,.aiinv-card,#aiinv.out .aiinv-card,.aiinv-perks li,.aiinv-spark,.aiinv-go,.aiinv-nudge{animation:none}
  #aiinv.out{opacity:0;transition:opacity .2s}
  .bp-card,.bp-dim,.sheet,.switch,.switch::after{transition:none}
  .updp,.c-av::after,.cbtn.mic.live svg,.in-row.fresh,.eq i{animation:none}
  .busy-dot{animation-duration:2.4s}
}
`;

// Frontly logo: a tooth between two sound marks, a pink "on the line" dot and a teal voice line. Header mark,
// launch screen and app icon are the same drawing.
const LOGO_PARTS = {
  frame: 'M44 98 C35 112 35 134 44 148 M196 98 C205 112 205 134 196 148',
  draw: 'M120 66 C104 52 74 50 64 74 C54 98 64 126 72 148 C78 166 80 196 94 198 C108 200 108 162 120 158 C132 162 132 200 146 198 C160 196 162 166 168 148 C176 126 186 98 176 74 C166 50 136 52 120 66 Z',
  pop: { cx: 188, cy: 52, r: 13 },
  sweep: 'M94 116 H106 L112 102 L122 130 L130 106 L136 116 H148',
};
const LOGO_SVG = `<path d="${LOGO_PARTS.frame}" fill="none" stroke="#F6F7F9" stroke-opacity="0.35" stroke-width="7" stroke-linecap="round"/><path d="${LOGO_PARTS.draw}" fill="none" stroke="#F6F7F9" stroke-width="12" stroke-linejoin="round"/><circle cx="${LOGO_PARTS.pop.cx}" cy="${LOGO_PARTS.pop.cy}" r="${LOGO_PARTS.pop.r}" fill="#F59BB5"/><path d="${LOGO_PARTS.sweep}" fill="none" stroke="#5EEAD4" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
const SETTINGS_SVG = `<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>`;
const THEME_IDS = ["ink", "sepia", "mint", "contrast", "slate", "night"];
const initTheme = THEME_IDS.includes(settings.theme) ? settings.theme : (Device.isUsingDarkAppearance() ? "night" : "ink");

const buildHTML = () => `<!doctype html><html lang="en" data-theme="${initTheme}" data-font="${settings.font === "serif" ? "serif" : "sans"}" style="--ts:${+settings.textSize || 1}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<style>${CSS}</style></head><body class="d-${["compact", "tiny"].includes(settings.density) ? settings.density : "comfortable"}">
<div class="splash" id="splash" role="img" aria-label="Frontly. Answer. Note. Book.">
  <div class="spIcon"><svg viewBox="0 0 240 240" aria-hidden="true">
    <path class="spFrame" d="${LOGO_PARTS.frame}"></path>
    <path class="spDraw" pathLength="100" d="${LOGO_PARTS.draw}"></path>
    <circle class="spPop" cx="${LOGO_PARTS.pop.cx}" cy="${LOGO_PARTS.pop.cy}" r="${LOGO_PARTS.pop.r}"></circle>
    <path class="spSweep" d="${LOGO_PARTS.sweep}"></path>
  </svg></div>
  <div class="spWord">Front<span>ly</span></div>
  <div class="spTag">Answer. Note. Book.</div>
</div>
<header id="top">
  <div class="tb"><div><h1 class="brand"><svg class="brand-mark" viewBox="0 0 240 240" aria-hidden="true">${LOGO_SVG}</svg><span>Front<span class="x">ly</span></span></h1><div id="status" class="status"></div></div>
    <div class="tb-a"><button class="icon" data-act="cfgopen" aria-label="Settings">${SETTINGS_SVG}</button></div></div>
  <nav id="tabs" class="tabs" aria-label="Screens"></nav>
</header>
<main id="list"><div class="booting" role="status"><span class="busy-dot"></span>Opening the front desk…</div></main>
<p class="ver">Frontly v${VERSION} · a demo: the clinic, dentists and patients are made up</p>
<div id="callsheet" class="sheet" role="dialog" aria-label="Call"></div>
<div id="patsheet" class="sheet" aria-label="Patient"></div>
<div id="casesheet" class="sheet" aria-label="Call note"></div>
<div id="aisheet" class="sheet" aria-label="AI settings"></div>
<div id="cfgsheet" class="sheet" aria-label="Settings"></div>
<div id="bpabout" aria-hidden="true"></div>
<div id="toast" role="status"></div>
<script>
// Launch screen (app-blueprints · launch-screen 1.0.2): first, self-contained
(function () {
  var sp = document.getElementById("splash");
  if (!sp) return;
  function gone() { sp.classList.add("gone"); sp.setAttribute("aria-hidden", "true"); }
  sp.addEventListener("click", gone);   // tap to skip
  setTimeout(gone, 2900);               // out of the page once the CSS fade is done
})();
// The page goes on screen first; Scriptable hands over the data once it has read it.
window.__parts = [];
window.__bootNote = function (title, detail) {
  var b = document.querySelector(".booting"); if (!b) return;
  b.className = "booting note";
  b.innerHTML = "<b></b><span></span>" + (detail ? "<pre></pre>" : "");
  b.querySelector("b").textContent = title;
  b.querySelector("span").textContent = "Close Frontly and open it again. If it keeps happening, run the installer once more.";
  if (detail) b.querySelector("pre").textContent = detail;
};
setTimeout(function () { if (!window.__booted) window.__bootNote("Still loading…"); }, 25000);
document.addEventListener("visibilitychange", function () {   // coming back into view: redraw
  if (document.visibilityState !== "visible") return;
  var d = document.documentElement; d.style.transform = "translateZ(0)"; void d.offsetHeight; d.style.transform = "";
});
window.__boot = function (st) {
  if (window.__booted) return;
  if (!st.calls || !st.calls.length) st.calls = [].concat.apply([], window.__parts);
  window.__parts = [];
  window.__booted = true; window.__INIT = st;
  requestAnimationFrame(function () {   // make WebKit draw again once the data is in (helps if the window came up black)
    var d = document.documentElement; d.style.transform = "translateZ(0)"; void d.offsetHeight;
    requestAnimationFrame(function () { d.style.transform = ""; });
  });
  ${visitConflict.toString()}
  (${clientApp.toString()})();
};</script>
</body></html>`;

// ---------- home-screen widget: Frontly's content for the shared frame below ----------
const TRI_ICON = { emergency: "🔴", urgent: "🟠", soon: "🟢", routine: "⚪️" };
const TRI_WORD = { emergency: "Emergency first", urgent: "Urgent first", soon: "Next up", routine: "Next up" };
// The snapshot the widget reads (saveWidget): names, reasons and urgency of the calls waiting to be booked.
// Saved after every call, booking, close and reopen, and when Frontly closes.
function widgetSnapshot() {
  const w = calls.filter(c => c.status === "waiting")
    .sort((a, b) => ((b.summary || {}).priority || 0) - ((a.summary || {}).priority || 0) || a.at - b.at);
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const today = patients.reduce((n, p) => n + (p.appts || []).filter(a => a.status === "booked" && a.at >= d0.getTime() && a.at < d0.getTime() + DAY).length, 0);
  const name = c => (c.fields && c.fields.name) || ((patients.find(p => p.id === c.patientId) || {}).name) || c.phone;
  return { waiting: w.length, today, rows: w.slice(0, 6).map(c => ({ name: name(c), reason: (c.summary && c.summary.reason) || (c.fields && c.fields.complaint) || "Call back", triage: (c.summary && c.summary.triage) || "routine", at: c.at })) };
}
// The widget's content (app-blueprints · widgets, Step 7): the calls waiting for the front desk, most urgent first.
async function widgetModel() {
  const d = readWidget() || Object.assign(widgetSnapshot(), { at: Date.now() });
  const rows = (d.rows || []).map(r => ({ icon: TRI_ICON[r.triage] || "⚪️", text: r.name, sub: r.reason }));
  if (!d.waiting) {
    return { kicker: "Front desk", title: "No calls waiting", caption: d.today ? d.today + (d.today === 1 ? " appointment today" : " appointments today") : "New calls show up here", rows: [], footer: "", at: d.at,
      accessory: { glyph: "☎︎", value: 0, inline: "Frontly: no calls waiting" } };
  }
  const top = d.rows[0] || {};
  return {
    badge: d.waiting + " to book",
    kicker: TRI_WORD[top.triage] || "Next up",
    value: String(d.waiting),
    caption: d.waiting === 1 ? "call to book" : "calls to book",
    rows,
    footer: d.today ? d.today + (d.today === 1 ? " appointment today" : " appointments today") : "",
    at: d.at,
    accessory: { glyph: "☎︎", value: d.waiting, inline: "Frontly: " + d.waiting + " to book" },
  };
}

// ───────── Widget ─────────
// Shared widget frame (github.com/gadominas/app-blueprints › blueprints/widgets.md).
// An app changes only WIDGET and widgetModel(); everything below WB is the same in every app.
const WIDGET = {
  name: ['Front', 'ly'],                  // as on the launch screen: plain part, highlighted part, optional rest
  accent: '#F59BB5',                      // the logo's focal colour (the launch screen's --sp-accent)
  icon: REPO_RAW + 'docs/icon-1024.png',  // the app icon, cached on the phone after the first fetch
  words: { open: 'Tap to open', nothing: 'Nothing to show yet.', updated: 'Updated', yesterday: 'yesterday' },   // in the app's language
};
// Brand colours, the same in every app and in light and dark mode: the logo tile's ground and lines.
const WB = { ground: '#0E1116', raised: '#171B22', ink: '#F6F7F9', ink2: '#C9CED6', muted: '#9AA3AE', good: '#2DD4BF', warn: '#FBBF24' };
const wfm = FileManager.local();
const wPath = (n) => wfm.joinPath(wfm.documentsDirectory(), APP_ID + '-' + n);

// What the widget shows is saved by the app and only read by the widget: fast, offline, no sign-in.
function saveWidget(data) {
  try { wfm.writeString(wPath('widget.json'), JSON.stringify(Object.assign({}, data, { at: Date.now() }))); }
  catch (e) { console.log('Widget: not saved: ' + e); }
}
function readWidget() {
  try { const p = wPath('widget.json'); return wfm.fileExists(p) ? JSON.parse(wfm.readString(p)) : null; }
  catch (e) { return null; }
}

// Tones: ink, soft, muted, accent, good, warn, or a hex colour.
const wColor = (c, a = 1) => {
  const k = c === 'soft' ? 'ink2' : c;
  return new Color(k === 'accent' ? WIDGET.accent : (WB[k] || k), a);
};
// Rounded system fonts, falling back to the plain system font on older Scriptable versions.
function wFont(weight, size) {
  const name = { bold: 'boldRoundedSystemFont', semi: 'semiboldRoundedSystemFont', med: 'mediumRoundedSystemFont' }[weight] || 'regularRoundedSystemFont';
  if (typeof Font[name] === 'function') return Font[name](size);
  return weight === 'bold' ? Font.boldSystemFont(size) : weight === 'semi' ? Font.semiboldSystemFont(size) : weight === 'med' ? Font.mediumSystemFont(size) : Font.systemFont(size);
}
function wText(stack, s, size, weight, tone, lines = 1) {
  const t = stack.addText(String(s));
  t.font = wFont(weight, size);
  t.textColor = wColor(tone);
  t.lineLimit = lines;
  if (lines === 1) t.minimumScaleFactor = 0.75;
  return t;
}
function wWhen(ts) {
  const d = new Date(ts), now = new Date(), f = new DateFormatter();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ago = Math.round((day(now) - day(d)) / 864e5);
  if (ago === 1) return WIDGET.words.yesterday;
  f.dateFormat = ago === 0 ? 'HH:mm' : 'd MMM';
  return f.string(d);
}

// The app's logo tile, from the repository's icon, cached per app version; a monogram until then.
async function widgetIcon() {
  const p = wPath('widget-icon-' + VERSION + '.png');
  try {
    if (wfm.fileExists(p)) return wfm.readImage(p);
    const r = new Request(WIDGET.icon);
    r.timeoutInterval = 8;
    const dc = new DrawContext();
    dc.size = new Size(96, 96); dc.opaque = false; dc.respectScreenScale = false;
    dc.drawImageInRect(await r.loadImage(), new Rect(0, 0, 96, 96));
    const img = dc.getImage();
    const dir = wfm.documentsDirectory();
    wfm.listContents(dir).filter((f) => f.startsWith(APP_ID + '-widget-icon-')).forEach((f) => { try { wfm.remove(wfm.joinPath(dir, f)); } catch (e) {} });
    wfm.writeImage(p, img);
    return img;
  } catch (e) {
    return widgetMonogram();
  }
}
function widgetMonogram() {
  const dc = new DrawContext();
  dc.size = new Size(96, 96); dc.opaque = false; dc.respectScreenScale = false;
  dc.setFillColor(wColor('raised')); dc.fillRect(new Rect(0, 0, 96, 96));
  dc.setFont(wFont('bold', 54)); dc.setTextColor(wColor('accent')); dc.setTextAlignedCenter();
  dc.drawTextInRect(WIDGET.name.join('').charAt(0), new Rect(0, 14, 96, 70));
  return dc.getImage();
}

// Rows that fit: a line counts 1, a sub line 0.8; medium holds 5.5 (3 rows at most), large 12 (6 at most).
function wFit(rows, budget, max) {
  const out = [];
  let used = 0;
  for (const r of rows || []) {
    const n = (r.lines || 1) + (r.sub ? 0.8 : 0);
    if (out.length >= max || used + n > budget + 1e-9) break;   // 1e-9: 3 + 5 × 1.8 must still fit in 12
    used += n;
    out.push(r);
  }
  return out;
}
function wRows(stack, rows) {
  rows.forEach((r, i) => {
    if (i) stack.addSpacer(5);
    const row = stack.addStack();
    row.topAlignContent(); row.spacing = 6;
    if (r.url) row.url = r.url;
    if (r.icon) { const ic = row.addStack(); ic.size = new Size(15, 0); wText(ic, r.icon, 11.5, 'reg', 'ink'); }
    const tx = row.addStack();
    tx.layoutVertically();
    wText(tx, r.text, 12.5, r.lines ? 'reg' : 'med', r.tone || (r.lines ? 'soft' : 'ink'), r.lines || 1);
    if (r.sub) wText(tx, r.sub, 11, 'reg', 'muted');
  });
}

async function renderWidget(m) {
  const fam = config.widgetFamily || 'medium';
  const w = new ListWidget();
  w.url = m.url || URLScheme.forRunningScript();
  w.refreshAfterDate = new Date(Date.now() + cfg('widgetRefreshMin') * 60e3);
  if (fam.startsWith('accessory')) return renderAccessory(w, fam, m);
  const small = fam === 'small', medium = fam === 'medium', large = !small && !medium;
  const g = new LinearGradient();
  g.colors = [wColor('raised'), wColor('ground')]; g.locations = [0, 1];
  g.startPoint = new Point(0, 0); g.endPoint = new Point(0, 1);
  w.backgroundGradient = g;
  w.setPadding(14, 14, 14, 14);

  // 1. Header: logo tile, name (highlighted part in the accent), badge
  const hd = w.addStack();
  hd.centerAlignContent();
  const icon = hd.addImage(await widgetIcon());
  const is = small ? 18 : 20;
  icon.imageSize = new Size(is, is); icon.cornerRadius = is * 0.225;
  hd.addSpacer(6);
  WIDGET.name.forEach((part, i) => {
    if (!part) return;
    const t = hd.addText(part);
    t.font = wFont('bold', small ? 13 : 14); t.textColor = wColor(i === 1 ? 'accent' : 'ink'); t.lineLimit = 1;
  });
  hd.addSpacer();
  if (m.badge && !small) {
    const b = hd.addStack();
    b.setPadding(2, 7, 2, 7); b.cornerRadius = 8;
    b.backgroundColor = wColor(m.badgeTone || 'accent', 0.16);
    wText(b, m.badge, 11.5, 'semi', m.badgeTone || 'accent');
  }
  w.addSpacer(small ? 8 : 10);

  // Empty state: what to do next, never an error
  if (m.empty) {
    wText(w, m.empty, 13, 'semi', 'soft', 3);
    w.addSpacer();
    wText(w, m.footer || WIDGET.words.open, 11, 'reg', 'muted');
    Script.setWidget(w);
    return;
  }

  // 2. Hero: kicker, then a big value with its caption, or a title with its caption
  const body = w.addStack();
  body.topAlignContent();
  const left = body.addStack();
  left.layoutVertically();
  if (medium) left.size = new Size(136, 0);
  if (m.kicker) wText(left, m.kicker, 11, 'semi', m.kickerTone || 'accent');
  if (m.value != null && m.value !== '') {
    wText(left, m.value, small ? 40 : 42, 'bold', m.valueTone || 'ink');
    if (m.caption) wText(left, m.caption, 13, 'semi', 'ink');
  } else {
    if (m.title) wText(left, m.title, small ? 16 : 18, 'bold', 'ink', 2);
    if (m.caption) { left.addSpacer(2); wText(left, m.caption, 12, 'reg', 'soft', 2); }
  }

  // 3. Rows: beside the hero on medium, under it on large, none on small
  const rows = m.rows || [];
  if (medium && wFit(rows, 5.5, 3).length) {
    body.addSpacer(12);
    const right = body.addStack();
    right.layoutVertically();
    wRows(right, wFit(rows, 5.5, 3));
  }
  body.addSpacer();
  if (large && wFit(rows, 12, 6).length) { w.addSpacer(14); wRows(w, wFit(rows, 12, 6)); }

  // 4. Footer: one muted line; amber when the data is stale. Small shows the badge here if there's no footer.
  w.addSpacer();
  const ft = small ? (m.footer || m.badge) : m.footer;
  if (ft) wText(w, (m.stale ? '⟳ ' : '') + ft, 11, 'reg', m.stale ? 'warn' : 'muted');
  Script.setWidget(w);
}

// Lock Screen: iOS tints these, so text only, no colours or logo.
function renderAccessory(w, fam, m) {
  const name = WIDGET.name.join('');
  const a = m.accessory || {};
  const hasValue = m.value != null && m.value !== '';
  const hero = m.empty || (hasValue ? (m.value + ' ' + (m.caption || '')).trim() : (m.title || ''));
  if (fam === 'accessoryInline') {
    w.addText(a.inline || (hero ? name + ': ' + hero : name));
  } else if (fam === 'accessoryCircular') {
    w.addAccessoryWidgetBackground = true;
    const c = w.addStack();
    c.layoutVertically(); c.centerAlignContent();
    const gl = c.addText(a.glyph || name.charAt(0)); gl.font = Font.systemFont(11); gl.centerAlignText();
    const v = c.addText(String(a.value != null ? a.value : hasValue ? m.value : '–'));
    v.font = wFont('bold', 20); v.minimumScaleFactor = 0.5; v.centerAlignText();
  } else {
    const lines = [
      [[name, m.badge || m.kicker].filter(Boolean).join(' · '), 'semi', 12],
      [hero, 'bold', 15],
      [m.empty ? '' : hasValue ? (m.footer || '') : (m.caption || m.footer || ''), 'reg', 12],
    ];
    lines.forEach(([s, wt, size]) => { if (!s) return; const t = w.addText(s); t.font = wFont(wt, size); t.lineLimit = 1; t.minimumScaleFactor = 0.7; });
  }
  Script.setWidget(w);
}

// Widget runs come here and only here: no WebView, Alert or QuickLook may be built or presented.
async function runWidget() {
  const name = WIDGET.name.join('');
  let m = null;
  try { m = await widgetModel(args.widgetParameter || '', config.widgetFamily || 'medium'); }
  catch (e) { console.error('Widget model: ' + e); }
  if (!m) m = { empty: WIDGET.words.nothing };
  try {
    if (m.at && !m.empty && Date.now() - m.at > cfg('widgetStaleMin') * 60e3) {
      m.stale = true;
      m.footer = WIDGET.words.updated + ' ' + wWhen(m.at);
    }
    await renderWidget(m);
  } catch (e) {
    console.error('Widget render: ' + e);
    const w = new ListWidget();
    w.backgroundColor = wColor('ground');
    w.url = URLScheme.forRunningScript();
    wText(w, name, 14, 'bold', 'ink');
    w.addSpacer(4);
    wText(w, WIDGET.words.open, 12, 'reg', 'muted');
    Script.setWidget(w);
  }
}
// ───────── end of Widget ─────────

// ---------- run ----------
// A run marks itself as open while its window is on screen. A new run waits at most 1.5 s for an older
// window to close, then opens anyway: it must never refuse to open.
const lockFm = FileManager.local();
const RUN_LOCK = lockFm.joinPath(lockFm.temporaryDirectory(), APP_ID + '-running');
let lockTimer = null;
const lockAge = () => { try { return lockFm.fileExists(RUN_LOCK) ? Date.now() - Number(lockFm.readString(RUN_LOCK)) : Infinity; } catch (e) { return Infinity; } };
const pause = (ms) => new Promise(r => Timer.schedule(ms, false, r));
async function waitForOtherWindow() {
  for (let waited = 0; lockAge() < 2500 && waited < 1500; waited += 300) await pause(300);
}
function holdLock() {
  const beat = () => { try { lockFm.writeString(RUN_LOCK, String(Date.now())); } catch (e) {} };
  beat(); lockTimer = Timer.schedule(1000, true, beat);
}
function releaseLock() {
  if (lockTimer) { lockTimer.invalidate(); lockTimer = null; }
  try { if (lockFm.fileExists(RUN_LOCK)) lockFm.remove(RUN_LOCK); } catch (e) {}
}
// Talks to the page with a time limit, so a stuck page can't stall the app.
const ev = (js, ms = 20000) => Promise.race([
  wv.evaluateJavaScript(js, false),
  pause(ms).then(() => { throw new Error("the page didn't respond in " + ms / 1000 + " s"); }),
]);

async function bootApp(isClosed) {
  const t0 = Date.now();
  startLog(`Frontly ${VERSION}: reading data`);
  await loadData();
  startLog(`data read in ${((Date.now() - t0) / 1000).toFixed(1)} s: ${patients.length} patients, ${calls.length} calls${loadIssues.length ? "; missing: " + loadIssues.join(", ") : ""}`);
  if (isClosed()) return;
  const st = clientState(), list = st.calls;
  st.calls = [];
  for (let i = 0; i < list.length; i += 50) await ev(`window.__parts.push(${safeJSON(list.slice(i, i + 50))})`);   // in pieces: one huge message can stall WebKit
  await ev(`window.__boot(${safeJSON(st)})`);
  let seen = "";
  try { seen = await ev(`document.visibilityState + ", " + innerWidth + "x" + innerHeight + ", splash " + (document.getElementById("splash") || {}).className`, 5000); } catch (e) { seen = String(e.message || e); }
  startLog(`screen ready in ${((Date.now() - t0) / 1000).toFixed(1)} s (page: ${seen})`);
  if (loadIssues.length) toast("Some of your data is still coming from iCloud. Nothing will be saved until you reopen Frontly.");
  else if (loadRepaired.length) toast("Some of your data couldn't be read, so Frontly kept a copy and started it fresh.");
  else if (dataLoaded && !fm.fileExists(P("calls"))) saveAll();   // the first start: keep the demo data
  // Deferred work, once the first screen is drawn: updates, then the widget's icon.
  Timer.schedule(3500, false, () => {
    if (isClosed() || updateChecked) return;
    updateChecked = true;
    checkForUpdate().then(u => { pendingUpdate = u; offerUpdate(); }).catch(() => {}).then(inviteIfDue);   // AI invitation: after the update check, never with an offer
  });
  Timer.schedule(6000, false, () => { widgetIcon(); });
  Timer.schedule(1500, false, () => { if (!isClosed()) syncLine(false); });   // calls the real line took while Frontly was closed
  lineTimer = Timer.schedule(20000, true, () => { if (isClosed()) { lineTimer.invalidate(); return; } syncLine(false); });
}
let lineTimer = null;

async function main() {
  await waitForOtherWindow();
  buildWebView();
  // A page built before its window is on screen can stay black on some iPhones (the page runs, nothing is drawn).
  // So: show an empty dark window first, then build the real page inside it while it's visible.
  await wv.loadHTML('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#0E1116"></body></html>');
  const presented = wv.present(true);
  holdLock();
  await pause(300);                          // let the window finish appearing
  startLog("window on screen");
  await Promise.race([wv.loadHTML(buildHTML()), pause(15000)]);   // the launch screen, drawn on screen
  let closed = false;
  presented.then(() => { closed = true; releaseLock(); });
  bootApp(() => closed).catch(e => {         // runs beside the window: closing it never waits on this
    startLog("start-up failed: " + (e.message || e));
    let log = "";
    try { log = FileManager.local().readString(LOG_PATH).split("\n").slice(-12).join("\n"); } catch (x) {}
    if (!closed) wv.evaluateJavaScript(`window.__bootNote("Frontly couldn't open", ${safeJSON(log)})`, false).catch(() => {});
  });
  await presented;
  closed = true;
  if (lineTimer) lineTimer.invalidate();
  releaseLock();
  saveAll();                                 // skips data that was never read
  if (dataLoaded) saveWidget(widgetSnapshot());
}

// Settings are loaded at the top of the script (load("settings")), before every branch: app and widget runs both use the saved choices.
if (config.runsInWidget || config.runsInAccessoryWidget) {
  await loadData();
  await runWidget();             // never builds or presents a WebView, Alert or QuickLook
} else {
  await main();
}
Script.complete();
