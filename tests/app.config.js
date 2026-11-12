// Frontly's per-app values for the app-blueprints testkit (recipes/testing.md › Per-app values).
module.exports = {
  name: 'Frontly',
  script: '../Frontly.js',
  folder: 'Frontly',                 // <iCloud Drive or the phone>/Frontly/settings.json
  now: '2026-11-12T08:32:00Z',       // a Thursday morning in Vilnius
  timezone: 'Europe/Vilnius',
  locale: 'en_US',

  // A returning user's choices: the AI invitation off (packs start from these)
  settings: { aiInvite: { off: true } },
  // …and data: the demo's three patients and one waiting call (the app writes them on a first start)
  seed: (h) => {
    const DAY = 864e5, d = (n) => h.now - n * DAY;
    return { files: {
      [h.path('patients.json')]: JSON.stringify([
        { id: 'p-jonas', name: 'Jonas Petrauskas', age: 52, phone: '+370 612 34567', since: d(900), notes: [], appts: [{ id: 'a-j1', at: d(60), doctor: 'd-kazl', reason: 'Filling', status: 'done' }] },
        { id: 'p-greta', name: 'Greta Mikalauskaitė', age: 29, phone: '+370 698 76543', since: d(400), notes: [], appts: [] },
      ]),
      [h.path('calls.json')]: JSON.stringify([
        { id: 'c-1', at: d(0.5), end: d(0.5) + 90e3, dur: 90, phone: '+370 698 76543', patientId: 'p-greta', isNew: false, lang: 'en', engine: 'script', provider: '',
          transcript: [{ who: 'reva', t: 'Hello' }, { who: 'caller', t: 'A bracket came loose.' }],
          fields: { name: 'Greta Mikalauskaitė', age: 29, complaint: 'Loose bracket', location: 'Lower right', pain: 3, urgency: 2, preferred: 'Afternoons', notes: null },
          mood: null, summary: { kind: 'template', text: 'Existing patient with a loose bracket.', triage: 'routine', priority: 2, specialty: 'ortho', doctor: 'd-vait', reason: 'Loose bracket', flags: [], hint: 'Afternoon' },
          status: 'waiting', deskNotes: [] },
      ]),
    } };
  },
  data: ['patients.json', 'calls.json'],

  routes: [],          // Claude and OpenAI come from ai() in the scenarios that need them
  offline: [],

  packs: 'auto',
  skipPacks: {},
  lint: { ignoreActs: [], allowDuplicates: [] },
};
