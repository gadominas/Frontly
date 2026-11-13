// 21 Pick a date: any day from today on, beside the day strip. On Frontly's own diary a picked working day shows its
// times and books; a day off says so. With ClinicCards, a person with no shifts in the coming days says so, and a date
// further ahead loads that week from ClinicCards and offers its times.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

const pick = (app, ymd) => { const el = app.$('.bkdate'), W = app.win(); el.value = ymd; el.dispatchEvent(new W.Event('change', { bubbles: true })); };
const local = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
const call = (doctor, T) => ({ id: 'c-1', at: T - 3600e3, phone: '+370 612 34567', source: 'desk', status: 'waiting', transcript: [], fields: { name: 'Jonas Petrauskas' },
  summary: { kind: 'desk', text: 'n', reason: 'Check-up', triage: 'routine', priority: 2, specialty: 'general', doctor, flags: [], hint: '' } });

scenario('pick a date', async (t) => {
  const T = Date.parse('2026-11-12T08:32:00Z');
  t.step('A. Frontly’s own diary');
  let app = await t.open({ settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true }, files: (h) => ({ [h.path('patients.json')]: '[]', [h.path('calls.json')]: JSON.stringify([call('d-kazl', T)]) }) });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  app.tap('[data-act="tab"][data-v="desk"]'); app.tap('[data-act="opencase"][data-id="c-1"]');
  await app.until(() => app.$('.pickdate .bkdate'), 2000, 'Pick a date');
  t.check(/Pick a date/.test(app.text('.pickdate')) && app.$('.bkdate').min === '2026-11-12', 'beside the day strip, from today on');
  pick(app, '2026-12-09');
  await app.until(() => app.$(`.day.on[data-v="${local('2026-12-09')}"]`), 2000, 'the picked day');
  t.check(/9 Dec|Dec 9/.test(app.text('.pickdate')) && app.$$('#casesheet .slot:not([disabled])').length > 5, 'Wednesday 9 December joins the strip, selected, with its times');
  app.tap('#casesheet .slot:not([disabled])'); app.tap('[data-act="book"]');
  await app.until(() => ((app.json(app.path('patients.json')) || [])[0] || { appts: [] }).appts.length, 3000, 'booked');
  t.check(new Date(app.json(app.path('patients.json'))[0].appts[0].at).getDate() === 9, 'and it books on that day');
  app.tap('[data-act="caseclosesheet"]');
  app.json(app.path('calls.json'));   // (the call is booked now; open it again as a fresh one below)
  await app.close();

  app = await t.open({ settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true }, files: (h) => ({ [h.path('patients.json')]: '[]', [h.path('calls.json')]: JSON.stringify([call('d-kazl', T)]) }) });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  app.tap('[data-act="tab"][data-v="desk"]'); app.tap('[data-act="opencase"][data-id="c-1"]');
  await app.until(() => app.$('.bkdate'), 2000, 'the box');
  pick(app, '2026-12-12');
  await app.until(() => /doesn't work on Saturdays/.test(app.text('#casesheet')), 2000, 'the day off');
  t.check(app.$('.slots-none') && !app.$('#casesheet .slot'), 'a Saturday: no times, and why, across the whole width');
  await app.close();

  t.step('B. ClinicCards: a first shift a month away');
  const asked = [];
  const ok = (data) => ({ json: { result: 'ok', data } });
  const routes = [{ name: 'cliniccards', match: (u) => u.startsWith('https://cliniccards.com/api/'), respond: (req) => {
    const u = new URL(req.url), path = u.pathname.replace('/api/', ''), q = Object.fromEntries(u.searchParams);
    if (path === 'schedule-shifts') { asked.push(q.from + '…' + q.to); return ok(q.to >= '2026-12-14' && q.from <= '2026-12-14' ? [{ doctor_id: 77, shift_start: '2026-12-14 09:00:00', shift_end: '2026-12-14 12:00:00', schedule_cabinets_id: 5 }] : []); }
    return ok([]);
  } }];
  const doctors = [{ id: 'd-fr', name: 'Francesco Doctor', short: 'Francesco Doctor', role: 'Doctor', spec: ['general'], days: [1, 2, 3, 4, 5], from: 8, to: 18, ext: { cliniccards: '77' } }];
  app = await t.open({ settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true, planner: 'cliniccards', doctors }, kc: { FRONTLY_CLINICCARDS_KEY: 'cc-key' }, routes,
    files: (h) => ({ [h.path('patients.json')]: '[]', [h.path('calls.json')]: JSON.stringify([call('d-fr', T)]) }) });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  app.tap('[data-act="tab"][data-v="desk"]'); app.tap('[data-act="opencase"][data-id="c-1"]');
  await app.until(() => /No shifts for Francesco Doctor in ClinicCards in the coming days\. Pick a date further ahead\./.test(app.text('#casesheet')), 4000, 'the explanation');
  t.check(app.$('.pickdate') && !app.$('#casesheet .slot'), 'no shifts soon: it says so, and Pick a date is there');
  pick(app, '2026-12-14');
  await app.until(() => app.$$('#casesheet .slot').length, 4000, 'times from ClinicCards');
  t.see('asked', asked.join(', '));
  t.check(asked.some((x) => x.startsWith('2026-') && x.endsWith('2026-12-20')), 'that week is fetched from ClinicCards');
  t.check(app.$$('#casesheet .slot').map((b) => b.textContent).join(' ') === '09:00 09:30 10:00 10:30 11:00 11:30' && app.$(`.day.on[data-v="${local('2026-12-14')}"]`), 'Monday 14 December’s shift, every 30 minutes, the day selected');
});
