// 32 Cancelling a ClinicCards visit by changing its status: the visit is read back, the status set to the cancelled
// one (PATCH, then PUT with the whole visit; never POST) and read again to be sure; the way that worked is remembered.
// If ClinicCards doesn't take it, Frontly's copy is cancelled anyway and it says to cancel it there. Cancelled visits
// free their time; Check the diary lists the statuses in use.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('cancel by status', async (t) => {
  let mode = 'put';   // which update ClinicCards accepts: 'put', 'patch', 'none', 'ignore' (answers but changes nothing)
  const visits = {}, sent = [];
  let next = 5000;
  const ok = (data) => ({ json: { result: 'success', data } });
  const routes = [{ name: 'cliniccards', match: (u) => u.startsWith('https://cliniccards.com/api/'), respond: (req) => {
    const u = new URL(req.url), path = u.pathname.replace('/api/', ''), q = Object.fromEntries(u.searchParams);
    if (path === 'schedule-shifts') { const out = []; for (let d = new Date(q.from + 'T00:00:00'); d <= new Date(q.to + 'T00:00:00'); d.setDate(d.getDate() + 1)) { const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; if (d.getDay() > 0 && d.getDay() < 6) out.push({ doctor_id: 77, shift_start: k + ' 09:00:00', shift_end: k + ' 11:00:00', schedule_cabinets_id: 5 }); } return ok(out); }
    if (path === 'patients' && req.method === 'POST') return ok({ patient_id: 900 });
    if (path === 'visits' && req.method === 'POST') { const b = req.json(), id = next++; visits[id] = { visit_id: id, patient_id: +b.patient_id, doctor_id: +b.doctor_id, cabinet_id: b.cabinet_id, visit_start: `${b.date} ${b.time_start}:00`, visit_end: `${b.date} ${b.time_end}:00`, note: b.note, status: b.status }; return ok({ visit_id: id }); }
    if (path === 'visits' && req.method === 'GET') return ok(Object.values(visits).filter((v) => v.visit_start.slice(0, 10) >= q.from && v.visit_start.slice(0, 10) <= q.to));
    const m = path.match(/^visits\/(\d+)$/);
    if (m) {
      sent.push([req.method, m[1], req.json()]);
      const v = visits[m[1]], allowed = mode === 'put' ? req.method === 'PUT' : mode === 'patch' ? req.method === 'PATCH' : mode === 'ignore';
      if (!v || !allowed) return { status: 405, json: { result: 'fail', error: 'Method not allowed' } };
      if (mode !== 'ignore') Object.assign(v, req.method === 'PUT' ? { status: req.json().status, note: req.json().note } : { status: req.json().status });
      return ok({ visit_id: v.visit_id });
    }
    return ok([]);
  } }];
  const T = Date.parse('2026-11-12T08:32:00Z');
  const call = (id, name, phone) => ({ id, at: T - 3600e3, phone, source: 'phone', status: 'waiting', transcript: [{ who: 'caller', t: 'Labas' }], fields: { name },
    summary: { kind: 'template', text: 'n', reason: 'Check-up', triage: 'routine', priority: 2, specialty: 'general', doctor: 'd-fr', flags: [], hint: '' } });
  const doctors = [{ id: 'd-fr', name: 'Francesco Doctor', short: 'Francesco Doctor', role: 'Doctor', spec: ['general'], days: [1, 2, 3, 4, 5], from: 8, to: 18, ext: { cliniccards: '77' } }];
  const app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true, planner: 'cliniccards', doctors, plannerState: { cliniccards: { ok: true, at: T, lines: ['ok'], lists: {} } }, plannerCfg: { cliniccards: { room: '5' } } },
    kc: { FRONTLY_CLINICCARDS_KEY: 'cc-key' }, routes,
    files: (h) => ({ [h.path('patients.json')]: '[]', [h.path('calls.json')]: JSON.stringify([call('c-1', 'Jonas Petrauskas', '+370 611 11111'), call('c-2', 'Ona Kairienė', '+370 622 22222'), call('c-3', 'Ieva Šimkutė', '+370 633 33333')]) }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  const pts = () => app.json(app.path('patients.json')) || [], st = () => app.json(app.path('settings.json')) || {};
  const bookIt = async (id) => {
    app.tap('[data-act="tab"][data-v="desk"]'); app.tap(`[data-act="opencase"][data-id="${id}"]`);
    await app.until(() => app.$('#casesheet .slot:not([disabled])'), 4000, 'times');
    if (!app.$('#casesheet .slot.on')) app.tap('#casesheet .slot:not([disabled])');
    const at = +app.$('#casesheet .slot.on').dataset.v;
    app.tap('[data-act="book"]');
    await app.until(() => Object.values(visits).length && pts().some((p) => (p.appts || []).some((a) => a.at === at && a.status === 'booked')), 4000, 'booked');
    app.tap('[data-act="caseclosesheet"]');
    return at;
  };
  const cancelIt = async (name) => {
    const p = pts().find((x) => x.name === name);
    app.tap('[data-act="tab"][data-v="patients"]');
    await app.until(() => app.$(`[data-act="openpat"][data-id="${p.id}"]`), 2000, 'the list');
    app.tap(`[data-act="openpat"][data-id="${p.id}"]`);
    await app.until(() => app.$('#patsheet [data-act="apptcancel"]'), 3000, 'the visit');
    app.tap('#patsheet [data-act="apptcancel"]'); await app.until(() => app.$('#dlg.open'), 2000, 'the dialog');
    const dl = app.text('#dlg');
    app.tap('[data-act="dlgcancel"]');
    await app.until(() => pts().find((x) => x.name === name).appts[0].status === 'cancelled', 4000, 'cancelled');
    const toast = app.text('#toast');
    app.tap('[data-act="patclose"]');
    return { dl, toast, a: pts().find((x) => x.name === name).appts[0] };
  };

  t.step('A. The status changed, checked, remembered');
  const at1 = await bookIt('c-1');
  const r1 = await cancelIt('Jonas Petrauskas');
  const v1 = visits[5000];
  t.check(/Frontly marks it cancelled in ClinicCards too and checks that it took/.test(r1.dl), 'the dialog says what will happen there');
  t.see('tried', sent.map(([m, id]) => m + ' ' + id).join(', '));
  t.check(sent[0][0] === 'PATCH' && sent[1][0] === 'PUT' && !sent.some(([m]) => m === 'POST'), 'PATCH first, then PUT; never POST');
  t.check(v1.status === 'CANCELED' && sent[1][2].patient_id === 900 && +sent[1][2].doctor_id === 77 && sent[1][2].note === v1.note && sent[1][2].time_start === '09:00', 'PUT sends the whole visit with the status changed; ClinicCards shows it cancelled');
  t.check(/marked cancelled in ClinicCards/.test(r1.toast) && r1.a.cancelled.there === 'done' && (st().plannerState.cliniccards || {}).cancelVia === 'PUT', 'the toast says so, the visit records it, and PUT is remembered');

  t.step('B. Next time, straight to what worked; the time is free again');
  const n = sent.length;
  await bookIt('c-2');
  const r2 = await cancelIt('Ona Kairienė');
  t.check(sent.length === n + 1 && sent[n][0] === 'PUT' && /It's marked cancelled in ClinicCards too/.test(r2.dl), 'one PUT, and the dialog is sure now');
  app.tap('[data-act="tab"][data-v="desk"]'); app.tap('[data-act="opencase"][data-id="c-3"]');
  await app.until(() => app.$('#casesheet .slot'), 4000, 'times');
  t.check(app.$(`#casesheet .slot[data-v="${at1}"]`) && !app.$(`#casesheet .slot[data-v="${at1}"]`).disabled, 'the cancelled visits no longer block their times');
  app.tap('[data-act="caseclosesheet"]');

  t.step('C. ClinicCards doesn’t take it');
  mode = 'ignore';
  await bookIt('c-3');
  const r3 = await cancelIt('Ieva Šimkutė');
  t.check(r3.a.status === 'cancelled' && r3.a.cancelled.there === 'not' && /ClinicCards didn't take the cancellation \(it answered, but the visit's status didn't change\): cancel it there too/.test(r3.toast), 'an update that changes nothing: Frontly’s copy cancelled, and it says to cancel it in ClinicCards');
  t.check(!(st().plannerState.cliniccards || {}).cancelVia, 'what stopped working is forgotten: every way is tried next time');
  app.tap('[data-act="tab"][data-v="patients"]');
  const ie = pts().find((x) => x.name === 'Ieva Šimkutė');
  app.tap(`[data-act="openpat"][data-id="${ie.id}"]`);
  await app.until(() => /still to cancel in ClinicCards/.test(app.text('#patsheet')), 3000, 'the history');
  t.check(true, 'the visit history says it’s still to cancel in ClinicCards');
});
