// 14 No made-up data: an install from before 1.4.0 loses its demo patients and call, but keeps its real phone calls
// and the dentists it booked with; a new install starts empty, with no dentists, and says how to add them.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

const DAY = 864e5, T = Date.parse('2026-11-12T08:32:00Z');

scenario('no demo data', async (t) => {
  t.step('A. An install with the old demo data');
  let app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė' },
    files: (h) => ({
      [h.path('patients.json')]: JSON.stringify([
        { id: 'p-jonas', name: 'Jonas Petrauskas', age: 52, phone: '+370 612 34567', since: T - 900 * DAY, demo: true, notes: [{ at: T - 200 * DAY, by: 'Agnė', text: 'Prefers early mornings.' }],
          appts: [{ id: 'a-j1', at: T - 160 * DAY, doctor: 'd-stan', reason: 'Cleaning and check-up', status: 'done' }] },
        { id: 'p-greta', name: 'Greta Mikalauskaitė', age: 29, phone: '+370 698 76543', since: T - 400 * DAY, demo: true, notes: [],
          appts: [{ id: 'a-g1', at: T - 42 * DAY, doctor: 'd-vait', reason: 'Braces adjustment', status: 'done' },
                  { id: 'a-g2', at: T + 3 * DAY, doctor: 'd-vait', reason: 'Loose bracket', status: 'booked', callId: 'el-1' }] },
        { id: 'p-real', name: 'Gediminas', age: 35, phone: '+370 611 00000', since: T - DAY, notes: [], appts: [] },
      ]),
      [h.path('calls.json')]: JSON.stringify([
        { id: 'c-demo1', at: T - DAY, phone: '+370 698 76543', patientId: 'p-greta', demo: true, status: 'waiting', transcript: [], fields: {}, summary: {} },
        { id: 'c-sim', at: T - 5e5, phone: '+370 612 34567', patientId: 'p-jonas', engine: 'script', status: 'waiting', transcript: [], fields: {}, summary: {} },
        { id: 'el-1', at: T - 3600e3, phone: '+37069876543', patientId: 'p-greta', source: 'phone', status: 'booked', booking: { doctor: 'd-vait', at: T + 3 * DAY }, transcript: [], fields: {}, summary: {} },
        { id: 'el-2', at: T - 7200e3, phone: '+37061100000', patientId: 'p-real', source: 'phone', status: 'waiting', transcript: [], fields: {}, summary: {} },
      ]),
    }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  await app.until(() => (app.json(app.path('settings.json')) || {}).demoGone, 3000, 'the clean-up saved');
  const pts = app.json(app.path('patients.json')) || [], calls = app.json(app.path('calls.json')) || [];
  t.see('patients', pts.map((p) => p.id).join(', ') + ' · calls: ' + calls.map((c) => c.id).join(', '));
  t.check(!pts.some((p) => p.id === 'p-jonas') && !calls.some((c) => c.id === 'c-demo1' || c.id === 'c-sim'), 'the made-up patient, the made-up call and a practice call with him are gone');
  const greta = pts.find((p) => p.id === 'p-greta');
  t.check(greta && !greta.demo && greta.appts.length === 1 && greta.appts[0].id === 'a-g2', 'a made-up record a real phone call was filed under stays, with only the real booking');
  t.check(pts.some((p) => p.id === 'p-real') && calls.some((c) => c.id === 'el-1') && calls.some((c) => c.id === 'el-2'), 'real patients and phone calls are untouched');
  const docs = (app.json(app.path('settings.json')) || {}).doctors || [];
  t.check(docs.length === 5 && docs.some((d) => d.id === 'd-vait'), 'the five dentists it booked with stay, now editable');
  app.tap('[data-act="tab"][data-v="cal"]');
  await app.until(() => app.$('.heatgrid'), 2000, 'the week');
  t.check(!/made up|Other patients/i.test(app.text('#list')), 'the calendar shows only real bookings');
  await app.close();

  t.step('B. A new install');
  app = await t.open({ fresh: true });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  await app.wait(300);
  t.check(!(app.json(app.path('patients.json')) || []).length && !(app.json(app.path('calls.json')) || []).length, 'no made-up patients or calls');
  t.check(((app.json(app.path('settings.json')) || {}).doctors || []).length === 0, 'and no made-up dentists');
  app.tap('[data-act="tab"][data-v="cal"]');
  await app.until(() => /No dentists yet/.test(app.text('#list')), 2000, 'the empty calendar');
  app.tap('#list [data-act="dentnew"]');
  await app.until(() => app.$('#cfgsheet.open #dn'), 2000, 'the dentist form');
  t.check(true, '“Add a dentist” opens the form in Settings');
});
