// Screenshot scenario for Frontly: invented sample data and the steps behind every card in the README.
// Regenerate: node app-blueprints/repo-site/tools/capture.js .   (see app-blueprints/repo-site/REBUILD.md)
//
// Everyone here is invented: the clinic, its dentists, the patients, their phone numbers and every call.
// Claude's replies are fixed below, so the AI screens are the same on every rebuild.

'use strict';
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
process.env.TZ = 'Europe/Vilnius';
const NOW = Date.UTC(2026, 10, 12, 7, 12);            // Thursday 12 November 2026, 09:12 in Vilnius
const MIN = 60e3, H = 60 * MIN, DAY = 24 * H;
const RELEASES = JSON.parse(fs.readFileSync(path.join(ROOT, 'releases.json'), 'utf8'));
const DOCS = '/var/mobile/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents/Frontly/';

// ───────── Patients (invented) ─────────
const PATIENTS = [
  { id: 'p-jonas', name: 'Jonas Petrauskas', age: 52, phone: '+370 612 34567', since: NOW - 900 * DAY,
    notes: [{ at: NOW - 200 * DAY, by: 'Agnė Petrauskaitė', text: 'Prefers early mornings. A little anxious about injections.' }],
    appts: [{ id: 'a-j1', at: NOW - 160 * DAY, doctor: 'd-stan', reason: 'Cleaning and check-up', status: 'done' },
            { id: 'a-j2', at: NOW - 60 * DAY, doctor: 'd-kazl', reason: 'Filling, lower left molar', status: 'done' }] },
  { id: 'p-greta', name: 'Greta Mikalauskaitė', age: 29, phone: '+370 698 76543', since: NOW - 400 * DAY,
    notes: [{ at: NOW - 300 * DAY, by: 'Mantas Jonaitis', text: 'Braces since spring; adjustments about every six weeks.' }],
    appts: [{ id: 'a-g1', at: NOW - 42 * DAY, doctor: 'd-vait', reason: 'Braces adjustment', status: 'done' }] },
  { id: 'p-andrius', name: 'Andrius Kairys', age: 41, phone: '+370 655 11223', since: NOW - 1500 * DAY, notes: [],
    appts: [{ id: 'a-a1', at: NOW - 380 * DAY, doctor: 'd-petr', reason: 'Root canal, upper right', status: 'done' }] },
  { id: 'p-lina', name: 'Lina Žukauskienė', age: 36, phone: '+370 677 40213', since: NOW - 2 * H, notes: [], appts: [] },
  { id: 'p-tadas', name: 'Tadas Navickas', age: 8, phone: '+370 640 55871', since: NOW - 5 * H, notes: [], appts: [] },
];

// ───────── Calls already taken (invented) ─────────
const call = (o) => Object.assign({ end: o.at + o.dur * 1000, isNew: false, lang: 'en', engine: 'ai', provider: 'anthropic', deskNotes: [], status: 'waiting' }, o);
const CALLS = [
  call({ id: 'c-andrius', at: NOW - 22 * MIN, dur: 164, phone: '+370 655 11223', patientId: 'p-andrius',
    transcript: [
      { who: 'reva', t: "Hello, you've reached Northlight Dental, this is Reva. Am I speaking with Andrius?" },
      { who: 'caller', t: "Yes. My face is swollen on the right since last night and it's throbbing." },
      { who: 'reva', t: "I'm sorry, that sounds painful. Is the swelling spreading towards your eye or neck, or is it hard to swallow?" },
      { who: 'caller', t: "No, just the cheek. But I couldn't sleep." },
      { who: 'reva', t: 'From 0 to 10, how strong is the pain?' }, { who: 'caller', t: 'Eight, maybe nine.' },
      { who: 'reva', t: 'Thank you, Andrius. The front desk will call you back very shortly. Goodbye!' } ],
    fields: { name: 'Andrius Kairys', age: 41, complaint: 'Swollen right cheek, throbbing pain since last night', location: 'Upper right, near the old root canal', pain: 9, urgency: 5, preferred: 'Today, any time', notes: 'Took ibuprofen at 6 am' },
    mood: { label: 'in pain', score: -2, note: 'Tired, speaks slowly' },
    summary: { kind: 'ai', provider: 'anthropic', text: 'Existing patient with a swollen right cheek and throbbing pain (9/10) since last night, near the tooth treated with a root canal last year. No breathing or swallowing problems. Needs to be seen today.',
      triage: 'urgent', priority: 5, specialty: 'endo', doctor: 'd-petr', reason: 'Swelling near old root canal', flags: ['Swelling', 'Pain 9/10'], hint: 'Today, first free slot with Dr. Petraitis' } }),
  call({ id: 'c-lina', at: NOW - 2 * H, dur: 138, phone: '+370 677 40213', patientId: 'p-lina', isNew: true,
    transcript: [{ who: 'reva', t: "Hello, you've reached Northlight Dental, this is Reva. May I have your full name, please?" }, { who: 'caller', t: 'Lina Žukauskienė. A filling fell out while I was eating.' }],
    fields: { name: 'Lina Žukauskienė', age: 36, complaint: 'Lost a filling, sharp edge, sensitive to cold', location: 'Lower left molar', pain: 4, urgency: 3, preferred: 'Mornings this week', notes: null },
    mood: { label: 'worried', score: -1, note: 'Calm but concerned' },
    summary: { kind: 'ai', provider: 'anthropic', text: 'New patient who lost a filling in a lower left molar; sharp edge and sensitive to cold, pain 4/10. Would like a morning this week.',
      triage: 'soon', priority: 3, specialty: 'general', doctor: 'd-kazl', reason: 'Lost filling, lower left', flags: [], hint: 'Morning this week with Dr. Kazlauskienė' } }),
  call({ id: 'c-tadas', at: NOW - 5 * H, dur: 201, phone: '+370 640 55871', patientId: 'p-tadas', isNew: true,
    transcript: [{ who: 'reva', t: "Hello, you've reached Northlight Dental, this is Reva. May I have your full name, please?" }, { who: 'caller', t: "I'm calling for my son Tadas, he's eight. A front tooth is wobbly after he fell at football." }],
    fields: { name: 'Tadas Navickas', age: 8, complaint: 'Wobbly front tooth after a fall at football', location: 'Upper front', pain: 3, urgency: 4, preferred: 'After school, from 3 pm', notes: 'Called by his mother' },
    mood: { label: 'anxious', score: -1, note: 'Mother, worried but composed' },
    summary: { kind: 'ai', provider: 'anthropic', text: "Mother calling for Tadas (8): an upper front tooth is loose after a fall at football yesterday. Little pain (3/10), no bleeding now. Wants an after-school slot.",
      triage: 'soon', priority: 4, specialty: 'kids', doctor: 'd-kazl', reason: 'Loose front tooth after a fall', flags: ['Trauma'], hint: "After 3 pm, children's dentistry" } }),
  call({ id: 'c-greta', at: NOW - 21 * H, dur: 151, phone: '+370 698 76543', patientId: 'p-greta', engine: 'script', provider: '',
    transcript: [{ who: 'reva', t: "Hello, you've reached Northlight Dental, this is Reva. Am I speaking with Greta?" }, { who: 'caller', t: 'Yes. One of my brackets came loose.' }],
    fields: { name: 'Greta Mikalauskaitė', age: 29, complaint: 'Loose bracket on braces, scratching the cheek', location: 'Lower right, back', pain: 3, urgency: 2, preferred: 'Afternoons after 3 pm', notes: '' },
    mood: null, summary: { kind: 'template', text: 'Existing patient Greta Mikalauskaitė, 29. Loose bracket on braces, scratching the cheek (Lower right, back). Pain 3/10, urgency 2/5. Prefers Afternoons after 3 pm.',
      triage: 'routine', priority: 2, specialty: 'ortho', doctor: 'd-vait', reason: 'Loose bracket', flags: [], hint: 'Afternoons after 3 pm · Dr. Vaitkutė' } }),
  call({ id: 'c-jonas', at: NOW - 2 * DAY, dur: 120, phone: '+370 612 34567', patientId: 'p-jonas', status: 'booked',
    transcript: [{ who: 'reva', t: 'Hello, Jonas.' }, { who: 'caller', t: 'Time for my check-up.' }],
    fields: { name: 'Jonas Petrauskas', age: 52, complaint: 'Six-month check-up and cleaning', location: null, pain: 0, urgency: 1, preferred: 'Early morning', notes: null },
    mood: { label: 'cheerful', score: 2, note: 'Relaxed' },
    summary: { kind: 'ai', provider: 'anthropic', text: 'Routine six-month check-up and cleaning for Jonas; prefers an early morning.', triage: 'routine', priority: 1, specialty: 'hygiene', doctor: 'd-stan', reason: 'Check-up and cleaning', flags: [], hint: 'Early morning with the hygienist' },
    booking: { doctor: 'd-stan', at: NOW + 6 * DAY - 72 * MIN, by: 'Agnė Petrauskaitė', made: NOW - 2 * DAY + H } }),
];
PATIENTS[0].appts.push({ id: 'a-j3', at: NOW + 6 * DAY - 72 * MIN, doctor: 'd-stan', reason: 'Check-up and cleaning', callId: 'c-jonas', status: 'booked', by: 'Agnė Petrauskaitė', made: NOW - 2 * DAY + H });

function usageJSON() {
  const days = {}, dk = (t) => new Date(t + 2 * H).toISOString().slice(0, 10);
  const pattern = [3.1, 5.2, 0, 7.6, 4.3, 2.0, 8.8, 6.1, 0, 4.4, 9.2, 3.7, 6.9, 2.4];
  let tin = 0, tout = 0, n = 0;
  pattern.forEach((k, i) => { if (!k) return; const t = Math.round(k * 1000), c = Math.round(k * 2); days[dk(NOW - (13 - i) * DAY)] = { calls: c, in: Math.round(t * 0.86), out: Math.round(t * 0.14) }; tin += Math.round(t * 0.86); tout += Math.round(t * 0.14); n += c; });
  const f = (share, calls) => ({ calls, in: Math.round(tin * share), out: Math.round(tout * share) });
  return { since: NOW - 30 * DAY, p: { anthropic: { calls: n, in: tin, out: tout, days,
    models: { 'claude-haiku-5-5': { calls: n, in: tin, out: tout } },
    features: { call: f(0.78, Math.round(n * 0.85)), summary: f(0.2, Math.round(n * 0.13)), test: f(0.02, 2) } } } };
}
function settingsJSON(over) {
  return Object.assign({ ai: true, aiProvider: 'anthropic', lastSession: NOW - 2 * H, checkUpdates: true, lang: 'en', sttEngine: 'dictation', speechEngine: 'device', handsFree: false,
    deskUser: '', tab: 'call', callFrom: '+370 621 48305', theme: 'auto', density: 'comfortable', font: 'sans', textSize: 1, aiInvite: { off: true },
    models: { anthropic: { at: NOW - 6 * DAY, list: [{ id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5' }, { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5' }, { id: 'claude-opus-5-5', name: 'Claude Opus 5.5' }] } } }, over || {});
}

// Reva on Claude: fixed replies, by how far the call has got
const TURNS = [
  { say: "Thank you, Ieva. I'm sorry to hear that. Where exactly does it hurt: which tooth, or which side?", fields: { name: 'Ieva Šimkutė' }, mood: { label: 'worried', score: -1 } },
  { say: 'And how old are you, Ieva?', fields: { name: 'Ieva Šimkutė', complaint: 'Sharp pain when biting, since Monday', location: 'Lower right, back tooth' }, mood: { label: 'worried', score: -1 } },
  { say: "Thanks. From 0 to 10, how strong is the pain, and how urgent does it feel, from 1 to 5?", fields: { name: 'Ieva Šimkutė', age: 33, complaint: 'Sharp pain when biting, since Monday', location: 'Lower right, back tooth' }, mood: { label: 'in pain', score: -1 } },
  { say: 'When would suit you best for a visit?', fields: { name: 'Ieva Šimkutė', age: 33, complaint: 'Sharp pain when biting, since Monday', location: 'Lower right, back tooth', pain: 6, urgency: 4 }, mood: { label: 'in pain', score: -1 } },
  { say: "Thank you, Ieva. I've noted everything, and the front desk will call you back shortly to confirm. Goodbye!", fields: { name: 'Ieva Šimkutė', age: 33, complaint: 'Sharp pain when biting, since Monday', location: 'Lower right, back tooth', pain: 6, urgency: 4, preferred: 'Tomorrow, after 2 pm' }, mood: { label: 'calm', score: 0 }, done: true },
];
function aiReply(req) {
  const j = req.json() || {};
  const system = j.system || '', user = (j.messages || []).map((m) => m.content).join('\n');
  let out = { say: 'OK' };
  if (/virtual receptionist/.test(system)) { const c = JSON.parse(user); out = TURNS[Math.min(TURNS.length - 1, c.turns - 1)]; }
  else if (/call notes/.test(system)) out = { summary: 'New caller Ieva Šimkutė, 33, has had a sharp pain when biting on a lower right back tooth since Monday (6/10). Possibly a cracked tooth. Wants tomorrow after 2 pm.',
    reason: 'Pain when biting, lower right', triage: 'soon', priority: 3, specialty: 'endo', doctor: 'd-petr', flags: [], hint: 'Tomorrow afternoon with Dr. Petraitis',
    mood: { label: 'in pain', score: -1, note: 'Uneasy but clear' }, fields: TURNS[4].fields };
  return { json: { content: [{ type: 'text', text: JSON.stringify(out) }], usage: { input_tokens: 820, output_tokens: 90 } } };
}

const SPEECH_STUB = `(() => {
  const voices = [{ name: 'Ava (Premium)', lang: 'en-US', voiceURI: 'com.apple.voice.premium.en-US.Ava', default: true, localService: true },
    { name: 'Samantha', lang: 'en-US', voiceURI: 'com.apple.voice.compact.en-US.Samantha', default: false, localService: true }];
  const syn = { speaking: false, paused: false, pending: false, getVoices: () => voices,
    speak(u) { syn.speaking = true; }, cancel() { syn.speaking = false; }, pause() {}, resume() {},
    addEventListener() {}, removeEventListener() {}, onvoiceschanged: null };
  Object.defineProperty(window, 'speechSynthesis', { value: syn, configurable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
})();`;

const answer = async (h, text) => { await h.type('#ctext', text); await h.tap('[data-act="ctsend"]'); await h.wait(900); };
async function liveCall(h) {
  await h.tap('.from-r[data-v="new"]'); await h.wait(200);
  await h.tap('[data-act="callgo"]'); await h.wait(2200);
  await h.tap('[data-act="ctype"]'); await h.wait(200);
  await answer(h, "Hi, it's Ieva Šimkutė. A back tooth hurts when I bite.");
  await answer(h, 'Lower right, at the back.');
  await answer(h, "I'm 33.");
  await answer(h, 'About a six, and urgency four.');
}

module.exports = {
  app: { name: 'Frontly', script: 'Frontly.js', accent: '#F59BB5' },
  now: NOW,
  locale: 'en_US', timezone: 'Europe/Vilnius',
  settle: 3300,
  fixtures: (shot) => ({
    files: {
      [DOCS + 'patients.json']: PATIENTS, [DOCS + 'calls.json']: CALLS, [DOCS + 'usage.json']: usageJSON(),
      [DOCS + 'settings.json']: settingsJSON(shot.settings),
    },
    keychain: { FRONTLY_ANTHROPIC_KEY: 'sk-ant-demo-0000000000001234' },
    routes: [
      { match: /raw\.githubusercontent\.com\/gadominas\/Frontly\/main\/releases\.json/, respond: () => ({ json: RELEASES }) },
      { match: /icon-1024\.png/, respond: { file: path.join(ROOT, 'docs', 'icon-1024.png') } },
      { match: 'api.anthropic.com/v1/messages', respond: aiReply },
    ],
    pageInit: SPEECH_STUB,
  }),
  shots: [
    { id: '01-call', label: 'Ring the clinic', caption: 'Call as a known patient or a new number; Reva the receptionist picks up.' },
    { id: '02-live-call', label: 'Reva takes notes live', caption: 'Each answer fills in her notes: what hurts, where, how much and how urgent.',
      run: async (h) => { await liveCall(h); await h.tap('[data-act="ctype"]'); await h.wait(500); } },
    { id: '03-call-note', label: 'A note ready to book', caption: 'The call ends with urgency, the right dentist and how the caller sounded.',
      run: async (h) => { await liveCall(h); await answer(h, 'Tomorrow after two would be great.'); await h.wait(1200); await h.tap('[data-act="hangup"]'); await h.wait(1500); } },
    { id: '04-front-desk', label: 'The front desk queue', caption: 'Sign in as the receptionist and work the calls, most urgent first.', settings: { tab: 'desk', deskUser: 'Agnė Petrauskaitė' } },
    { id: '05-book', label: 'Book the right dentist', caption: 'Free times for the suggested dentist; the ones the caller asked for are marked.', settings: { tab: 'desk', deskUser: 'Agnė Petrauskaitė' },
      run: async (h) => {
        await h.tap('.qcard >> nth=1'); await h.wait(600);
        await h.eval(() => { const b = document.querySelector('#casesheet .slot.pref:not([disabled])') || document.querySelector('#casesheet .slot:not([disabled])'); if (b) b.click(); });
        await h.wait(400);
        await h.eval(() => { const s = document.querySelector('#casesheet'), r = document.querySelector('#casesheet .bk').getBoundingClientRect(); s.scrollTop += r.top - 110; });
        await h.wait(400);
      } },
    { id: '06-patient', label: 'Every patient on file', caption: 'Calls, visits, bookings and notes under one name, found by phone number.', settings: { tab: 'patients' },
      run: async (h) => { await h.tap('[data-act="openpat"][data-id="p-jonas"]'); await h.wait(600); } },
    { id: '07-launch', label: 'Launch screen', caption: 'The tooth draws itself, then Answer. Note. Book. Tap to skip.', settle: 1600 },
    { id: '08-settings', label: 'Settings', caption: 'Language, Reva’s voice, how she listens, colours and every limit.',
      run: async (h) => { await h.tap('[data-act="cfgopen"]'); await h.wait(500); } },
    { id: '09-ai-settings', label: 'AI on your own key', caption: 'Claude or OpenAI, any model, with token usage per day and feature.',
      run: async (h) => {
        await h.tap('[data-act="cfgopen"]'); await h.wait(400);
        await h.tap('#cfgsheet [data-act="aiopen"]'); await h.wait(900);
        await h.eval(() => { const s = document.querySelector('#aisheet'); const r = document.querySelector('#aisheet .aicard').getBoundingClientRect(); s.scrollTop += r.top - 62; });
        await h.wait(400);
      } },
    { id: '10-update', label: 'Updates itself', caption: 'A new version shows its three best features and installs in one tap.',
      run: async (h) => {
        const latest = RELEASES.releases[0];
        await h.eval((u) => window.__showUpdate(u), { current: '0.9.0', latest: latest.version, title: latest.title, date: latest.date, skipped: 1, highlights: latest.highlights, script: 'Frontly.js' });
        await h.wait(900);
      } },
    { id: '11-dark', label: 'Dark mode', caption: 'Auto colours follow the iPhone, here on the front desk queue.', dark: true, settings: { tab: 'desk', deskUser: 'Agnė Petrauskaitė' } },
    { id: '12-widget', label: 'Home Screen widget', caption: 'How many calls wait to be booked, most urgent first.', widget: 'medium' },
  ],
};
