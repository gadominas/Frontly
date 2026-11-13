// 25 A client's visits from ClinicCards: fetched when the card opens (not again within 10 minutes; Refresh any time),
// the client found by phone number, visits matched or added (only theirs), a Frontly booking ClinicCards no longer has
// marked cancelled there, and when it was fetched shown. Visits that don't say whose they are: refused, said so.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('client visits from cliniccards', async (t) => {
  let fetches = 0, anonymous = false;
  const ok = (data) => ({ json: { result: 'success', data } });
  const routes = [{ name: 'cliniccards', match: (u) => u.startsWith('https://cliniccards.com/api/'), respond: (req) => {
    const u = new URL(req.url), path = u.pathname.replace('/api/', ''), q = Object.fromEntries(u.searchParams);
    if (path === 'patients' && q.phone) return ok(q.phone === '37064588715' ? [{ patient_id: 900, phone: '37061111111' }, { patient_id: 321, phone: '37064588715' }] : []);
    if (path === 'visits' && q.patient_id) {
      fetches++;
      const all = [
        { visit_id: 7001, patient_id: 321, doctor_id: 77, visit_start: '2026-10-02 10:00:00', visit_end: '2026-10-02 10:30:00', note: 'Plomba' },
        { visit_id: 7002, patient_id: 321, doctor_id: 77, visit_start: '2026-11-20 14:00:00', visit_end: '2026-11-20 15:00:00', note: 'Kontrolė\nantra eilutė' },
        { visit_id: 7003, patient_id: 321, doctor_id: 77, visit_start: '2026-11-24 09:00:00', visit_end: '2026-11-24 09:30:00', note: 'Atšaukta', status: 'CANCELED' },
        { visit_id: 7999, patient_id: 999, doctor_id: 77, visit_start: '2026-11-21 11:00:00', visit_end: '2026-11-21 11:30:00', note: 'Someone else' },
      ].filter((v) => v.visit_start.slice(0, 10) >= q.from && v.visit_start.slice(0, 10) <= q.to);
      return ok(anonymous ? all.map(({ patient_id, ...v }) => v) : all);
    }
    return ok([]);
  } }];
  const T = Date.parse('2026-11-12T08:32:00Z');
  const doctors = [{ id: 'd-fr', name: 'Francesco Doctor', short: 'Francesco Doctor', role: 'Doctor', spec: ['general'], days: [1, 2, 3, 4, 5], from: 8, to: 18, ext: { cliniccards: '77' } }];
  const app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true, planner: 'cliniccards', doctors, plannerState: { cliniccards: { ok: true, at: T, lines: ['ok'], lists: {} } } },
    kc: { FRONTLY_CLINICCARDS_KEY: 'cc-key' }, routes,
    files: (h) => ({ [h.path('patients.json')]: JSON.stringify([
      { id: 'p-g', name: 'Giedrius Minas', phone: '37064588715', since: T - 864e5, notes: [], appts: [{ id: 'a-old', at: Date.parse('2026-11-18T08:00:00Z'), dur: 30, doctor: 'd-fr', reason: 'Toothache', status: 'booked', ext: { planner: 'cliniccards', ref: '5001' } }] },
      { id: 'p-n', name: 'Nobody There', phone: '+370 699 00000', since: T, notes: [], appts: [] },
    ]), [h.path('calls.json')]: '[]' }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  const pt = (id) => (app.json(app.path('patients.json')) || []).find((p) => p.id === id) || {};

  t.step('A. Opening the card fetches the visits');
  app.tap('[data-act="tab"][data-v="patients"]');
  await app.until(() => app.$('[data-act="openpat"][data-id="p-g"]'), 2000, 'the list');
  app.tap('[data-act="openpat"][data-id="p-g"]');
  await app.until(() => /3 visits in ClinicCards · fetched/.test(app.text('#patsheet .syncrow')), 4000, 'fetched');
  const g = pt('p-g');
  t.see('appts', g.appts.map((a) => `${a.reason}:${a.status}`).join(', '));
  t.check(g.ext.cliniccards === '321', 'found by phone number among others, and the id kept');
  t.check(g.appts.some((a) => a.reason === 'Plomba' && a.status === 'done') && g.appts.some((a) => a.reason === 'Kontrolė' && a.status === 'booked' && a.dur === 60 && a.doctor === 'd-fr') && g.appts.some((a) => a.reason === 'Atšaukta' && a.status === 'cancelled'), 'a past visit, one ahead (60 min, the linked doctor), one cancelled there');
  t.check(!g.appts.some((a) => /Someone else/.test(a.reason)), 'nobody else’s visit');
  const old = g.appts.find((a) => a.id === 'a-old');
  t.check(old.status === 'cancelled' && /Not in ClinicCards any more/.test(old.cancelled.reason), 'a Frontly booking ClinicCards no longer has is marked cancelled there');
  t.check(/Kontrolė · Francesco Doctor · from ClinicCards/.test(app.text('#patsheet')), 'Coming up shows it, from ClinicCards');

  t.step('B. Not again within 10 minutes; Refresh any time');
  const n = fetches;
  app.tap('[data-act="patclose"]'); app.tap('[data-act="openpat"][data-id="p-g"]');
  await app.wait(400);
  t.check(fetches === n, 'reopened at once: no new fetch');
  app.tap('#patsheet [data-act="patsync"]');
  await app.until(() => fetches > n && !/Fetching/.test(app.text('#patsheet .syncrow')), 4000, 'refreshed');
  t.check(pt('p-g').appts.length === 4, 'Refresh fetches again, without duplicates');
  app.tap('[data-act="patclose"]');

  t.step('C. Not found; and visits that don’t say whose');
  app.tap('[data-act="openpat"][data-id="p-n"]');
  await app.until(() => /Not found in ClinicCards by phone number/.test(app.text('#patsheet .syncrow')), 4000, 'not found');
  t.check(true, 'someone not in ClinicCards: said so');
  app.tap('[data-act="patclose"]');
  anonymous = true;
  app.tap('[data-act="openpat"][data-id="p-g"]'); app.tap('#patsheet [data-act="patsync"]');
  await app.until(() => /don't say whose they are/.test(app.text('#patsheet .syncrow')), 4000, 'the refusal');
  t.check(pt('p-g').appts.length === 4, 'visits without a patient id: refused and said so; nothing added');
});
