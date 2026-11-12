// 11 Returning callers: only booking work waits at the front desk. A question about a booked visit is filed under the
// patient; a second call about a waiting request joins it; Reva knows the visits and passes on the front desk's message.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

const T0 = Date.parse('2026-11-12T08:20:00Z'), MIN = 60e3;
const tx = (caller) => [{ who: 'reva', t: 'Labas, skambinate į Northlight Dental.' }, { who: 'caller', t: caller }];
const CALLS = [
  // Jonas asks when his visit is; Reva passes on the message waiting for him
  { id: 'el-a', provider: 'elevenlabs', at: T0, dur: 60, phone: '+37061234567', intent: 'about_visit', messageId: 'm-1', messagePassed: true,
    summary: 'Jonas asked when his visit is.', transcript: tx('Kada mano vizitas ir pas kurį gydytoją?'), fields: { name: 'Jonas Petrauskas' } },
  // Jonas again, no "intent" from the agent: the question is recognised from the call
  { id: 'el-e', provider: 'elevenlabs', at: T0 + MIN, dur: 40, phone: '+37061234567', summary: 'Jonas asked about his appointment.',
    transcript: tx('When is my appointment, and which doctor is it with?'), fields: { name: 'Jonas Petrauskas' } },
  // Greta calls again about the bracket that already waits: it joins that request, and the pain raises its priority
  { id: 'el-b', provider: 'elevenlabs', at: T0 + 2 * MIN, dur: 80, phone: '+37069876543', intent: 'new_visit', summary: 'Greta: the bracket hurts now.',
    transcript: tx('The bracket I called about now hurts.'), fields: { name: 'Greta Mikalauskaitė', complaint: 'Loose bracket, now painful', pain: 6 } },
  // Jonas wants to move his visit: booking work
  { id: 'el-c', provider: 'elevenlabs', at: T0 + 3 * MIN, dur: 70, phone: '+37061234567', intent: 'change_visit', summary: 'Jonas wants to move Friday’s visit.',
    transcript: tx('Can I move Friday to next week?'), fields: { name: 'Jonas Petrauskas', complaint: 'Move Friday’s visit', preferred: 'Next week' } },
  // A new caller with a new problem: booking work
  { id: 'el-d', provider: 'elevenlabs', at: T0 + 4 * MIN, dur: 90, phone: '+37067711122', intent: 'new_visit', summary: 'Rasa has toothache.',
    transcript: tx('Hi, Rasa Jankūnė, I have toothache.'), fields: { name: 'Rasa Jankūnė', age: 31, complaint: 'Toothache', pain: 5 } },
];

scenario('returning caller', async (t) => {
  const DAY = 864e5, puts = [];
  const routes = [
    { name: 'bridge calls', match: (u) => u.startsWith('https://bridge.test/calls'), respond: (req) => {
      const since = Number((req.url.match(/since=(\d+)/) || [])[1] || 0);
      return { json: { phone: '+370 5 200 0000', calls: CALLS.filter((c) => c.at > since) } };
    } },
    { name: 'bridge patients', match: 'https://bridge.test/patients', respond: (req) => { puts.push(req.json()); return { json: { ok: true } }; } },
  ];
  const app = await t.open({
    settings: { aiInvite: { off: true }, bridgeUrl: 'https://bridge.test', deskUser: 'Agnė Petrauskaitė' }, kc: { FRONTLY_BRIDGE_TOKEN: 'tok-1' }, routes,
    files: (h) => ({ [h.path('patients.json')]: JSON.stringify([
      { id: 'p-jonas', name: 'Jonas Petrauskas', age: 52, phone: '+370 612 34567', since: h.now - 900 * DAY, notes: [],
        appts: [{ id: 'a-j1', at: h.now - 60 * DAY, doctor: 'd-kazl', reason: 'Filling', status: 'done' },
                { id: 'a-j2', at: Date.parse('2026-11-13T08:30:00Z'), doctor: 'd-petr', reason: 'Root canal', status: 'booked', by: 'Agnė Petrauskaitė', made: h.now - DAY }],
        message: { id: 'm-1', text: 'Please bring your X-rays.', by: 'Agnė Petrauskaitė', at: h.now - DAY } },
      { id: 'p-greta', name: 'Greta Mikalauskaitė', age: 29, phone: '+370 698 76543', since: h.now - 400 * DAY, notes: [], appts: [] },
    ]) }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  await app.until(() => (app.json(app.path('calls.json')) || []).length === 6, 6000, 'five calls from the line next to the waiting one');

  t.step('A. Only booking work waits');
  const calls = app.json(app.path('calls.json')) || [], by = (id) => calls.find((c) => c.id === id) || {};
  t.see('statuses', calls.map((c) => `${c.id}:${c.status}${c.intent ? '/' + c.intent : ''}`).join(' '));
  t.check(by('el-a').status === 'noted' && by('el-a').intent === 'about_visit', 'a question about a booked visit is filed, not queued');
  t.check(by('el-e').status === 'noted' && by('el-e').intent === 'about_visit', 'without the agent’s intent, the question is recognised from the call');
  t.check(by('el-b').status === 'noted' && by('el-b').followUp === 'c-1', 'calling again about a waiting request joins that request');
  t.check((by('c-1').again || []).includes('el-b') && by('c-1').summary.priority === 3 && by('c-1').summary.triage === 'soon', 'and raises its priority with the new pain');
  t.check(by('el-c').status === 'waiting' && by('el-c').intent === 'change_visit', 'moving a visit is booking work');
  t.check(by('el-d').status === 'waiting', 'a new caller with a new problem waits to be booked');

  t.step('B. The message reaches the patient once');
  const pts = app.json(app.path('patients.json')) || [], jonas = pts.find((p) => p.id === 'p-jonas');
  t.check(jonas && !jonas.message && jonas.messages && jonas.messages[0].text === 'Please bring your X-rays.' && jonas.messages[0].callId === 'el-a', 'passed on: it moves to the record, with the call');
  t.check(by('el-a').delivered === 'Please bring your X-rays.', 'the call shows what was passed on');

  t.step('C. What Reva is told about each patient');
  await app.until(() => puts.length, 3000, 'PUT /patients');
  const brief = puts[puts.length - 1] || [], bj = brief.find((p) => p.name === 'Jonas Petrauskas') || {}, bg = brief.find((p) => p.name === 'Greta Mikalauskaitė') || {};
  t.see('Jonas', JSON.stringify(bj));
  t.check(/Friday,? 13 November,? (at )?10:30 with Dr\. Tomas Petraitis \(Endodontist\): Root canal/.test(bj.appointments), 'his booked visit: day, time, dentist and reason');
  t.check(bj.message === '' && bj.messageId === '', 'a message already passed on isn’t sent again');
  t.check(/Loose bracket/.test(bg.waiting) && /call back/.test(bg.waiting), 'Greta’s waiting request, so Reva can say the front desk has it');
  t.check(brief.every((p) => !('notes' in p) && !('appts' in p)), 'still no notes or appointment records');

  t.step('D. The front desk');
  app.tap('[data-act="tab"][data-v="desk"]');
  await app.until(() => app.$$('.qcard').length, 3000, 'the queue');
  t.check(app.$$('.qcard').length === 3, 'To book has three: Greta’s request, Jonas’s change and Rasa');
  t.check(/Called 2×/.test(app.text('[data-act="opencase"][data-id="c-1"]')), 'Greta’s request says she called twice');
  t.check(/Change a booking/.test(app.text('[data-act="opencase"][data-id="el-c"]')), 'the change is marked');
  app.tap('[data-act="dfilter"][data-v="closed"]');
  await app.until(() => app.$('[data-act="opencase"][data-id="el-a"]'), 2000, 'the Other tab');
  t.check(/Asked about a visit/.test(app.text('[data-act="opencase"][data-id="el-a"]')) && /No booking/.test(app.text('[data-act="opencase"][data-id="el-a"]')), 'Other has the question, marked');
  app.tap('[data-act="opencase"][data-id="el-b"]');
  await app.until(() => app.$('#casesheet.open'), 2000, 'the case');
  t.check(/Called again about a request that's waiting/.test(app.text('#casesheet')) && app.$('#casesheet [data-act="opencase"][data-id="c-1"]'), 'the follow-up points to the waiting request');
  app.tap('[data-act="caseclosesheet"]');

  t.step('E. A new message for the patient');
  app.tap('[data-act="tab"][data-v="patients"]');
  await app.until(() => app.$('[data-act="openpat"][data-id="p-greta"]'), 2000, 'patients');
  app.tap('[data-act="openpat"][data-id="p-greta"]');
  await app.until(() => app.$('#patmsg'), 2000, 'the message box');
  app.type('#patmsg', 'Your bracket can be fixed on Monday morning.'); app.tap('[data-act="patmsg"]');
  const n = puts.length;
  await app.until(() => puts.length > n, 3000, 'the brief sent again');
  const g2 = (puts[puts.length - 1] || []).find((p) => p.name === 'Greta Mikalauskaitė') || {};
  t.check(g2.message === 'Your bracket can be fixed on Monday morning.' && /^m-/.test(g2.messageId), 'the message goes to the bridge at once, with its id');
  await app.until(() => /passes it on at the next call/.test(app.text('#patsheet')), 2000, 'the pending message');
  t.check(true, 'the patient’s page shows it waiting to be passed on');
});
