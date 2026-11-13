// 20 Typing survives the background: the phone line is checked every 20 s (every second here) and the planning
// engine's diary refreshed; a quiet check redraws nothing, and when a call does arrive the redraw keeps what's typed,
// the focus and the cursor. Before 1.8.1 every check wiped every open form.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('typing survives the background', async (t) => {
  let checks = 0, diaries = 0, deliver = false;
  const T = Date.parse('2026-11-12T08:32:00Z');
  const ok = (data) => ({ json: { result: 'ok', data } });
  const routes = [
    { name: 'calls', match: (u) => u.startsWith('https://b.test/calls'), respond: () => { checks++; return { json: { phone: '+370 5 200 0000', calls: deliver ? [{ id: 'el-9', provider: 'elevenlabs', at: T + 1000, dur: 40, phone: '+37069912345', summary: 'Asks for a cleaning.', transcript: [{ who: 'caller', t: 'A cleaning, please.' }], fields: { name: 'Lukas Kairys', complaint: 'Cleaning' } }] : [] } }; } },
    { name: 'patients', match: 'https://b.test/patients', respond: () => ({ json: { ok: true } }) },
    { name: 'cliniccards', match: (u) => u.startsWith('https://cliniccards.com/api/'), respond: (req) => {
      const path = new URL(req.url).pathname.replace('/api/', '');
      if (path === 'schedule-shifts') { diaries++; return ok([{ doctor_id: 12, shift_start: '2026-11-13 10:00:00', shift_end: '2026-11-13 14:00:00', schedule_cabinets_id: 5 }]); }
      return ok([]);
    } },
  ];
  const app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true, bridgeUrl: 'https://b.test', planner: 'cliniccards' },
    kc: { FRONTLY_BRIDGE_TOKEN: 'x', FRONTLY_CLINICCARDS_KEY: 'cc-key' }, routes,
    files: (h) => ({ [h.path('calls.json')]: '[]' }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  const W = app.win(); let draws = 0; const recv = W.recv; W.recv = (st) => { draws++; recv(st); };
  await app.until(() => checks >= 2 && diaries >= 1, 8000, 'start-up: the first line check and the first diary');   // both are real changes
  await app.wait(300);

  t.step('A. Quiet checks redraw nothing');
  app.tap('[data-act="tab"][data-v="desk"]');
  app.tap('[data-act="regopen"][data-v="new"]');
  await app.until(() => app.$('#rg-name'), 2000, 'the form');
  app.type('#rg-name', 'Jonas Petrauskas'); app.type('#rg-reason', 'Toothache');
  const c0 = checks, d0 = diaries; draws = 0;
  await app.until(() => checks >= c0 + 3, 8000, 'three background checks');
  t.see('background', `${checks - c0} line checks, ${diaries - d0} diary refreshes, ${draws} redraws`);
  t.check(draws === 0, 'three quiet line checks (and the diary kept fresh in the background): no redraw');
  t.check(app.$('#rg-name').value === 'Jonas Petrauskas' && app.$('#rg-reason').value === 'Toothache', 'what was typed is still there');

  t.step('B. A call arrives while typing');
  const name = app.$('#rg-name'); name.focus(); name.setSelectionRange(5, 5);
  deliver = true;
  await app.until(() => (app.json(app.path('calls.json')) || []).some((c) => c.id === 'el-9'), 8000, 'the new call');
  await app.until(() => draws > 0, 3000, 'the redraw');
  const n2 = app.$('#rg-name');
  t.check(n2.value === 'Jonas Petrauskas' && app.$('#rg-reason').value === 'Toothache', 'the redraw keeps both fields');
  t.check(W.document.activeElement === n2 && n2.selectionStart === 5, 'the focus and the cursor stay where they were');
  t.check(/1/.test(app.text('[data-act="tab"][data-v="desk"]')), 'and the new call shows on the Front desk tab');

  t.step('C. A form opened afresh starts clean');
  app.tap('[data-act="regclose"]'); app.tap('[data-act="regopen"][data-v="new"]');
  await app.until(() => app.$('#rg-name'), 2000, 'the form');
  t.check(app.$('#rg-name').value === '' && app.$('#rg-reason').value === '', 'reopened: empty, nothing carried over');
});
