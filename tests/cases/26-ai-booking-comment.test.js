// 26 With an AI key, the ClinicCards comment is written by the AI in the language of the call, within the comment
// length (Settings › Planning › ClinicCards), from everything Frontly knows, never naming tools; an answer too long
// is trimmed; if the AI fails, the translated template is used.
const { scenario, ai } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('ai booking comment', async (t) => {
  const visits = [], asks = []; let mode = 'ok';
  const okr = (data) => ({ json: { result: 'success', data } });
  const LT = 'Higiena. Pacientas simptomų neturi.\nPageidauja antradienį po pietų, apie 50 min.\nPrašo paskambinti patvirtinti.';
  const writer = (system, user) => { asks.push({ system, user: JSON.parse(user) }); if (mode === 'fail') throw new Error('down'); return { note: mode === 'long' ? 'Ilgas tekstas. '.repeat(60) : LT }; };
  const routes = [...ai({ answers: [[/attaches to a booked/, writer]] }), { name: 'cliniccards', match: (u) => u.startsWith('https://cliniccards.com/api/'), respond: (req) => {
    const u = new URL(req.url), path = u.pathname.replace('/api/', ''), q = Object.fromEntries(u.searchParams);
    if (path === 'schedule-shifts') { const out = []; for (let d = new Date(q.from + 'T00:00:00'); d <= new Date(q.to + 'T00:00:00'); d.setDate(d.getDate() + 1)) { const k = d.toISOString().slice(0, 10); if (d.getDay() > 0 && d.getDay() < 6) out.push({ doctor_id: 77, shift_start: k + ' 09:00:00', shift_end: k + ' 17:00:00', schedule_cabinets_id: 5 }); } return okr(out); }
    if (path === 'patients' && req.method === 'POST') return okr({ patient_id: 900 });
    if (path === 'visits' && req.method === 'POST') { visits.push(req.json()); return okr({ visit_id: 6000 + visits.length }); }
    return okr([]);
  } }];
  const T = Date.parse('2026-11-12T08:32:00Z');
  const tx = [{ who: 'reva', t: 'Labas, skambinate į Northlight Dental.' }, { who: 'caller', t: 'Norėčiau užsiregistruoti higienai, sekančiam antradieniui.' }, { who: 'caller', t: 'Penkiasdešimt minučių, po pietų.' }];
  const call = (id, phone, lang) => ({ id, at: T - 3600e3, dur: 71, phone, lang, source: 'phone', provider: 'elevenlabs', status: 'waiting', transcript: tx, fields: { name: 'Giedrius Minas ' + id, preferred: 'Tuesday afternoon' },
    summary: { kind: 'ai', provider: 'openai', text: 'Giedrius requests a routine hygiene visit next Tuesday afternoon.', reason: 'Routine dental hygiene', triage: 'routine', priority: 1, specialty: 'hygiene', doctor: 'd-fr', flags: [], hint: '', dur: 45 } });
  const doctors = [{ id: 'd-fr', name: 'Francesco Doctor', short: 'Francesco Doctor', role: 'Doctor', spec: ['general', 'hygiene'], days: [1, 2, 3, 4, 5], from: 8, to: 18, ext: { cliniccards: '77' } }];
  const app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true, planner: 'cliniccards', doctors, plannerState: { cliniccards: { ok: true, at: T, lines: ['ok'], lists: {} } }, plannerCfg: { cliniccards: { room: '5' } } },
    kc: { FRONTLY_CLINICCARDS_KEY: 'cc-key', FRONTLY_ANTHROPIC_KEY: 'sk-ant-test' }, routes,
    files: (h) => ({ [h.path('patients.json')]: '[]', [h.path('calls.json')]: JSON.stringify([call('c-1', '+370 611 11111', 'lt'), call('c-2', '+370 622 22222', 'lt'), call('c-3', '+370 633 33333', 'lt'), call('c-4', '+370 644 44444', 'lt')]) }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  const book = async (id) => {
    app.tap('[data-act="tab"][data-v="desk"]'); app.tap(`[data-act="opencase"][data-id="${id}"]`);
    await app.until(() => app.$('#casesheet .slot:not([disabled])'), 4000, 'times');
    if (!app.$('#casesheet .slot.on')) app.tap('#casesheet .slot:not([disabled])');
    app.tap('[data-act="book"]');
  };

  t.step('A. Written by the AI, in Lithuanian, within 400 characters');
  await book('c-1');
  await app.until(() => visits.length === 1, 5000, 'the visit');
  const q = asks[asks.length - 1];
  t.check(/Write it in Lithuanian/.test(q.system) && /At most 400 characters/.test(q.system) && /Never mention AI, tools, phone systems or how the request came in/.test(q.system), 'the AI is told the language, the limit, and to leave out tools and sources');
  t.check(q.user.conversation.some((l) => /Penkiasdešimt minučių/.test(l)) && q.user.length_minutes === 45 && q.user.summary, 'it sees the conversation, the length and the summary');
  t.check(visits[0].note === LT, 'the AI’s comment is what ClinicCards gets');
  app.tap('[data-act="caseclosesheet"]');

  t.step('B. Too long: trimmed; a longer comment length is followed');
  mode = 'long';
  await book('c-2');
  await app.until(() => visits.length === 2, 5000, 'the visit');
  t.check(visits[1].note.length <= 400 && /…$/.test(visits[1].note), 'an over-long answer is trimmed to 400, at a word');
  app.tap('[data-act="caseclosesheet"]');
  app.tap('[data-act="cfgopen"]'); app.tap('[data-act="planopen"][data-v="cliniccards"]');
  await app.until(() => app.$('.plancfg[data-k="limit"]'), 2000, 'Comment length');
  app.type('.plancfg[data-k="limit"]', '1000');
  await app.until(() => (((app.json(app.path('settings.json')) || {}).plannerCfg || {}).cliniccards || {}).limit === '1000', 2000, 'saved');
  app.tap('[data-act="planclose"]'); app.tap('[data-act="cfgclose"]');
  mode = 'ok';
  await book('c-3');
  await app.until(() => visits.length === 3, 5000, 'the visit');
  t.check(/At most 1000 characters/.test(asks[asks.length - 1].system), 'with 1,000 set, the AI may write up to 1,000');
  app.tap('[data-act="caseclosesheet"]');

  t.step('C. The AI fails: the template');
  mode = 'fail';
  await book('c-4');
  await app.until(() => visits.length === 4, 5000, 'the visit');
  t.check(/^Priežastis: Routine dental hygiene/.test(visits[3].note) && /Pageidaujamas laikas: Tuesday afternoon/.test(visits[3].note), 'booked anyway, with the Lithuanian template');
});
