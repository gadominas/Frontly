// 10 The real phone line: calls ElevenLabs answered come in from the bridge, filed under the right patient;
// the patient list goes back for the caller lookup; the Call tab dials the real number
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

const T0 = Date.parse('2026-11-12T08:10:00Z');
const CALLS = [
  { id: 'el-c1', provider: 'elevenlabs', at: T0, dur: 95, phone: '+37061234567', summary: 'Jonas has a toothache on the lower left, 7 out of 10.',
    transcript: [{ who: 'reva', t: 'Labas, skambinate į Northlight Dental, aš Reva. Ar tai Jonas?' }, { who: 'caller', t: 'Taip. Skauda dantį apačioje kairėje.' }],
    fields: { name: 'Jonas Petrauskas', complaint: 'Toothache, lower left', pain: 7, urgency: 4, preferred: 'Rytoj ryte' }, mood: { label: 'worried' } },
  { id: 'el-c2', provider: 'elevenlabs', at: T0 + 60e3, dur: 120, phone: '+37067711122', summary: 'New caller Rasa wants a cleaning.',
    transcript: [{ who: 'reva', t: 'Hello…' }, { who: 'caller', t: 'Hi, Rasa Jankūnė, I would like a cleaning.' }],
    fields: { name: 'Rasa Jankūnė', age: 31, complaint: 'Cleaning', pain: 0, urgency: 1, preferred: 'Fridays' } },
];

scenario('phone line', async (t) => {
  const seen = { gets: [], put: null, auth: [] };
  const routes = [
    { name: 'bridge calls', match: (u) => u.startsWith('https://bridge.test/calls'), respond: (req) => {
      seen.gets.push(req.url); seen.auth.push((req.headers || {})['Authorization']);
      const since = Number((req.url.match(/since=(\d+)/) || [])[1] || 0);
      return { json: { phone: '+370 5 200 0000', calls: CALLS.filter((c) => c.at > since) } };
    } },
    { name: 'bridge patients', match: 'https://bridge.test/patients', respond: (req) => { seen.put = req.json(); return { json: { ok: true, patients: seen.put.length } }; } },
  ];
  const app = await t.open({ settings: { aiInvite: { off: true }, bridgeUrl: 'https://bridge.test' }, kc: { FRONTLY_BRIDGE_TOKEN: 'tok-secret-1234' }, routes });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');

  t.step('A. Calls the line took come in by themselves');
  await app.until(() => /3 calls to book/.test(app.text('#status')), 6000, 'two new calls next to the waiting one');
  t.check(seen.auth[0] === 'Bearer tok-secret-1234', 'the bridge is asked with the token');
  t.check(/2 new calls from the phone line/.test(app.text('#toast')), 'a toast says so');
  const calls = app.json(app.path('calls.json')) || [], pts = app.json(app.path('patients.json')) || [];
  const c1 = calls.find((c) => c.id === 'el-c1'), c2 = calls.find((c) => c.id === 'el-c2');
  t.check(c1 && c1.patientId === 'p-jonas' && c1.isNew === false && c1.source === 'phone', 'Jonas’s call is filed under Jonas, by his number');
  t.check(c1 && c1.mood && c1.mood.label === 'worried' && c1.fields.pain === 7, 'mood and pain come along');
  const rasa = pts.find((p) => p.name === 'Rasa Jankūnė');
  t.check(c2 && rasa && c2.patientId === rasa.id && c2.isNew === true && rasa.age === 31, 'a new caller gets a record');
  t.check(c1 && c1.summary.provider === 'elevenlabs' && /toothache/.test(c1.summary.text), 'without a Frontly AI key the note is ElevenLabs’ summary');

  t.step('B. The patient list goes back for the caller lookup');
  await app.until(() => seen.put, 3000, 'PUT /patients');
  const j = (seen.put || []).find((p) => p.name === 'Jonas Petrauskas');
  t.check(j && j.phone === '+370 612 34567' && /Last visit/.test(j.history), 'name, number and history, for Reva to greet him');
  t.check((seen.put || []).every((p) => !('notes' in p) && !('appts' in p)), 'only the short brief, not notes or appointments');

  t.step('C. The front desk and the Call tab');
  app.tap('[data-act="tab"][data-v="desk"]'); app.type('#dpin', '1234'); app.tap('[data-act="signin"]');
  await app.until(() => app.$$('.qcard').length === 3, 3000, 'the queue');
  t.check(app.$$('.qcard .pill.line').length === 2, 'phone calls are marked');
  app.tap('[data-act="opencase"][data-id="el-c1"]');
  await app.until(() => app.$('#casesheet.open'), 2000, 'the case');
  t.check(/AI note by ElevenLabs/.test(app.text('#casesheet')) && /phone line, answered by ElevenLabs/.test(app.text('#casesheet')), 'the case says who answered and who wrote the note');
  const css = app.$$('style').map((e) => e.textContent).join('\n');
  const rule = (sel) => [...css.matchAll(/(?:^|[}\n])([^{}\n]+)\{([^}]*)\}/g)].filter((m) => m[1].trim() === sel).map((m) => m[2]).join(';');   // every rule for that selector
  t.check(/max-width:100%/.test(rule('.pill')) && /white-space:normal/.test(rule('.pill.flag,.chips .pill')) && /flex-wrap:wrap/.test(rule('.q-top')), 'a long warning wraps inside the note instead of running off the screen');
  t.check(/overflow-x:hidden/.test(rule('.sheet')) && /overflow-x:hidden/.test(rule('html,body')), 'the case sheet and the page never scroll sideways');
  app.tap('[data-act="caseclosesheet"]');
  app.tap('[data-act="tab"][data-v="call"]');
  await app.until(() => app.$('.realline'), 2000, 'the real line card');
  t.check(/\+370 5 200 0000/.test(app.text('.realline')), 'the Call tab shows the number to dial');
  app.tap('[data-act="line-call"]');
  await app.until(() => app.log.opened.some((u) => u === 'tel:+37052000000'), 2000, 'the phone app');
  t.check(true, 'Call dials the real line');

  t.step('D. Checking again brings nothing twice, and the token stays out of the page');
  const before = seen.gets.length;
  app.tap('.realline [data-act="line-sync"]');
  await app.until(() => seen.gets.length > before, 3000, 'a second check');
  t.check(/since=\d{13}/.test(seen.gets[seen.gets.length - 1]), 'the second check asks only for newer calls');
  await app.until(() => /No new calls/.test(app.text('#toast')), 3000, 'nothing new');
  t.check((app.json(app.path('calls.json')) || []).filter((c) => c.source === 'phone').length === 2, 'no duplicates');
  t.check(!app.win().document.documentElement.outerHTML.includes('tok-secret-1234'), 'the token never reaches the page');
  await t.close(app);
});
