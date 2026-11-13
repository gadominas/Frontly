// 17 Planning in ClinicCards: its own settings window (key, test, cabinet, note, staff links, import), then free times
// from its shifts minus its visits, a booking made there first (patient found or created, a BOOKING visit), what
// Frontly can't do there said plainly, its errors shown, and back to Frontly's own diary. The API is faked as the
// open-source 4WP Booking connector uses it: Token header, { result, data, error }.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

const p2 = (n) => String(n).padStart(2, '0');
const day = (t) => { const d = new Date(t); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
scenario('cliniccards', async (t) => {
  const posted = [], seen = []; let failVisits = false;
  const ok = (data) => ({ json: { result: 'ok', data } });
  const routes = [{ name: 'cliniccards', match: (u) => u.startsWith('https://cliniccards.com/api/'), respond: (req) => {
    const u = new URL(req.url), path = u.pathname.replace('/api/', ''), q = Object.fromEntries(u.searchParams);
    seen.push(req.method + ' ' + path);
    if (req.headers.Token !== 'cc-key' && req.headers.token !== 'cc-key') return { status: 401, json: { result: 'fail', error: 'Wrong token' } };
    if (path === 'staff') return ok([{ doctor_id: 11, firstname: 'Rūta', lastname: 'Kazlauskienė', role: 'DOCTOR' }, { doctor_id: 12, firstname: 'Tomas', lastname: 'Petraitis', role: 'DOCTOR' }, { doctor_id: 99, firstname: 'Ona', lastname: 'Admin', role: 'ADMIN' }]);
    if (path === 'cabinets') return ok([{ cabinet_id: 5, name: 'Cabinet 1' }]);
    if (path === 'booking-settings') return ok({ booking_interval: 30 });
    if (path === 'schedule-shifts' || (path === 'visits' && req.method === 'GET')) {
      const out = [];
      for (let d = new Date(q.from + 'T00:00:00'); day(d) <= q.to; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        const s = day(d);
        out.push(path === 'schedule-shifts' ? { doctor_id: 12, shift_start: s + ' 10:00:00', shift_end: s + ' 14:00:00', schedule_cabinets_id: 5 } : { doctor_id: 12, visit_start: s + ' 11:00:00', visit_end: s + ' 11:30:00' });
      }
      return ok(out);
    }
    if (path === 'schedule-spaces') return ok([]);
    if (path === 'patients' && req.method === 'GET') return ok([]);
    if (path === 'patients' && req.method === 'POST') { posted.push(['patients', req.json()]); return ok({ patient_id: 777 }); }
    if (path === 'visits' && req.method === 'POST') { if (failVisits) return { status: 400, json: { result: 'fail', error: 'Doctor is busy at this time' } }; posted.push(['visits', req.json()]); return ok({ visit_id: 4242 }); }
    return { status: 404, json: { result: 'fail', error: 'no such method' } };
  } }];
  const T = Date.parse('2026-11-12T08:32:00Z');
  const call = (id, phone, name, at) => ({ id, at, phone, source: 'phone', status: 'waiting', transcript: [{ who: 'caller', t: 'Hi' }], fields: { name, preferred: null },
    summary: { kind: 'template', text: 'n', reason: 'Root canal pain', triage: 'soon', priority: 3, specialty: 'endo', doctor: 'd-petr', flags: [], hint: '' } });
  const app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true }, kc: { FRONTLY_CLINICCARDS_KEY: 'cc-key' }, routes,
    files: (h) => ({ [h.path('patients.json')]: '[]', [h.path('calls.json')]: JSON.stringify([call('c-1', '+370 612 34567', 'Jonas Petrauskas', T - 3600e3), call('c-2', '+370 600 44444', 'Ieva Šimkutė', T - 1800e3)]) }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  const st = () => app.json(app.path('settings.json')) || {};

  t.step('A. Its own window, and a connection test');
  app.tap('[data-act="cfgopen"]');
  await app.until(() => app.$('#planning'), 2000, 'Settings › Planning');
  t.check(/Frontly\s*In use/.test(app.text('#cfgsheet')) && /ClinicCards/.test(app.text('#cfgsheet')) && /Not set up/.test(app.text('#cfgsheet')), 'Frontly’s own diary is in use; ClinicCards is listed, not set up');
  app.tap('[data-act="planopen"][data-v="cliniccards"]');
  await app.until(() => app.$('#plansheet.open'), 2000, 'the ClinicCards window');
  t.check(app.$('#plansheet [data-act="planuse"]').disabled && /Test the connection first/.test(app.text('#plansheet')) && /…-key|ends in …/.test(app.text('#plansheet')), 'its own window: the key is there, and it can’t be used before a test');
  app.tap('[data-act="plantest"]');
  await app.until(() => /✓ Connected/.test(app.text('#plansheet')), 3000, 'connected');
  t.check(/2 people take bookings · 1 cabinet · Times every 30 min/.test(app.text('#plansheet')), 'the test says what it found (the admin isn’t offered)');

  t.step('B. Staff, cabinet and note');
  app.type('.planlink[data-staff="d-petr"]', '12');
  await app.until(() => ((st().doctors || []).find((d) => d.id === 'd-petr') || {}).ext, 2000, 'linked');
  app.tap('[data-act="planimport"]');
  await app.until(() => ((st().doctors || []).find((d) => d.id === 'd-kazl') || {}).ext, 2000, 'imported');
  t.check(st().doctors.find((d) => d.id === 'd-petr').ext.cliniccards === '12' && st().doctors.find((d) => d.id === 'd-kazl').ext.cliniccards === '11' && st().doctors.length === 5, 'Tomas linked by hand; Rūta linked by name on import (“Dr.” or not); nobody added twice');
  app.type('.plancfg[data-k="room"]', '5');
  await app.until(() => ((st().plannerCfg || {}).cliniccards || {}).room === '5', 2000, 'the cabinet');
  t.check(/Cancelling and moving a visit has to be done in ClinicCards as well/.test(app.text('#plansheet')), 'what Frontly can’t do there is said plainly');
  app.tap('#plansheet [data-act="planuse"]');
  await app.until(() => st().planner === 'cliniccards', 2000, 'in use');
  t.check(/Bookings go to ClinicCards/.test(app.text('#plansheet')), 'ClinicCards is in use');
  app.tap('[data-act="planclose"]'); app.tap('[data-act="cfgclose"]');

  t.step('C. Free times from its diary, booked there');
  app.tap('[data-act="tab"][data-v="desk"]');
  await app.until(() => app.$('[data-act="opencase"][data-id="c-1"]'), 2000, 'the queue');
  app.tap('[data-act="opencase"][data-id="c-1"]');
  await app.until(() => app.$$('#casesheet .slot').length, 4000, 'times from ClinicCards');
  app.tap(app.$$('#casesheet .day')[1]);   // tomorrow: today's 10:00–11:30 are already within the hour
  const slots = app.$$('#casesheet .slot').map((b) => b.textContent + (b.disabled ? '×' : ''));
  t.see('times', slots.join(' '));
  t.check(slots.join(' ') === '10:00 10:30 11:00× 11:30 12:00 12:30 13:00 13:30' && /Times from ClinicCards/.test(app.text('#casesheet')), 'the shift’s times, every 30 min, with 11:00 taken there');
  const pick = app.$('#casesheet .slot:not([disabled])');
  app.tap(pick); app.tap('[data-act="book"]');
  await app.until(() => posted.some((x) => x[0] === 'visits'), 4000, 'the visit');
  const v = posted.find((x) => x[0] === 'visits')[1], pa = posted.find((x) => x[0] === 'patients')[1];
  t.see('visit', JSON.stringify(v));
  t.check(pa.firstname === 'Jonas' && pa.lastname === 'Petrauskas' && pa.phone === '37061234567', 'the patient is created there, number in full digits');
  t.check(v.status === 'BOOKING' && v.patient_id === '777' && v.doctor_id === '12' && v.cabinet_id === '5' && /^\d{4}-\d\d-\d\d$/.test(v.date) && v.time_start === pick.textContent && /^\d\d:\d\d$/.test(v.time_end) && /^Booked by Frontly: Root canal pain\n\nBooked by Frontly \(Agnė Petrauskaitė\)/.test(v.note) && /\nReason: Root canal pain\n/.test(v.note), 'a BOOKING visit with the doctor, cabinet, day, times and note');
  await app.until(() => (app.json(app.path('patients.json')) || []).length === 1, 2000, 'Frontly’s copy');
  const jp = app.json(app.path('patients.json'))[0];
  t.check(jp.ext.cliniccards === '777' && jp.appts[0].ext.planner === 'cliniccards' && jp.appts[0].ext.ref === '4242', 'Frontly keeps its copy, with ClinicCards’ patient and visit ids');
  app.tap('[data-act="caseclosesheet"]');

  t.step('D. Its errors are shown, and nothing is kept');
  failVisits = true;
  app.tap('[data-act="opencase"][data-id="c-2"]');
  await app.until(() => app.$('#casesheet .slot:not([disabled])'), 4000, 'times');
  app.tap('#casesheet .slot:not([disabled])'); app.tap('[data-act="book"]');
  await app.until(() => /ClinicCards: Doctor is busy at this time/.test(app.text('#casesheet') + app.text('#toast')), 4000, 'the error');
  t.check(!(app.json(app.path('patients.json')) || []).some((p) => p.name === 'Ieva Šimkutė' && (p.appts || []).length), 'the error is shown; nothing is booked in Frontly');
  app.tap('[data-act="caseclosesheet"]');

  t.step('E. Cancelling says where else to do it; the calendar shows both');
  app.tap('[data-act="tab"][data-v="patients"]');
  await app.until(() => app.$('[data-act="openpat"]'), 2000, 'patients');
  app.tap('[data-act="openpat"]'); await app.until(() => app.$('#patsheet [data-act="apptcancel"]'), 2000, 'the visit');
  app.tap('#patsheet [data-act="apptcancel"]'); await app.until(() => app.$('#dlg.open'), 2000, 'the dialog'); app.tap('#dlg [data-act="dlgcancel"]');
  await app.until(() => /Cancel it in ClinicCards too/.test(app.text('#toast')), 2000, 'the toast');
  t.check(true, 'cancelled in Frontly, with a reminder to cancel it in ClinicCards');
  app.tap('[data-act="patclose"]');
  app.tap('[data-act="tab"][data-v="cal"]');
  await app.until(() => app.$('.heatgrid'), 3000, 'the week');
  t.check(/Booked in ClinicCards/.test(app.text('.cal-k')), 'the calendar shows time taken in ClinicCards');

  t.step('F. Back to Frontly’s own diary');
  app.tap('[data-act="cfgopen"]'); app.tap('[data-act="planopen"][data-v="cliniccards"]');
  await app.until(() => app.$('#plansheet [data-act="planuse"][data-v="builtin"]'), 2000, 'the switch');
  app.tap('#plansheet [data-act="planuse"][data-v="builtin"]');
  await app.until(() => st().planner === 'builtin', 2000, 'switched');
  app.tap('[data-act="planclose"]'); app.tap('[data-act="cfgclose"]');
  app.tap('[data-act="tab"][data-v="desk"]'); app.tap('[data-act="opencase"][data-id="c-2"]');
  await app.until(() => app.$('#casesheet .slot'), 3000, 'times');
  t.check(!/ClinicCards/.test(app.text('#casesheet .bk')), 'back on Frontly’s diary: times from its own working hours again');
});
