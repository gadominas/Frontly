// 18 Import: clients from pasted rows (Lithuanian headers, semicolons, a quoted note, a birth date), matched by phone
// number; staff from tab-separated rows, matched by name ("Dr." or not), with days, hours and services read; patients
// from ClinicCards page by page; a preview first, and cancelling saves nothing.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('import', async (t) => {
  const pages = [];
  const routes = [{ name: 'cliniccards', match: (u) => u.startsWith('https://cliniccards.com/api/'), respond: (req) => {
    const u = new URL(req.url), path = u.pathname.replace('/api/', '');
    if (path === 'patients') {
      pages.push(u.searchParams.get('page'));
      return { json: { result: 'ok', data: [{ patient_id: 501, firstname: 'Jonas', lastname: 'Petrauskas', phone: '37061234567' }, { patient_id: 502, firstname: 'Marta', lastname: 'Žukauskienė', phone: '370 655 98765', birthday: '1990-05-20' }] } };
    }
    return { json: { result: 'ok', data: [] } };
  } }];
  const T = Date.parse('2026-11-12T08:32:00Z');
  const app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true, plannerState: { cliniccards: { ok: true, at: T, lines: ['ok'], lists: {} } } },
    kc: { FRONTLY_CLINICCARDS_KEY: 'cc-key' }, routes,
    files: (h) => ({ [h.path('patients.json')]: JSON.stringify([{ id: 'p-1', name: 'Gediminas', age: null, phone: '+370 611 00000', since: T - 864e5, notes: [], appts: [] }]), [h.path('calls.json')]: '[]' }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  const pts = () => app.json(app.path('patients.json')) || [], st = () => app.json(app.path('settings.json')) || {};

  t.step('A. Clients from pasted rows');
  app.tap('[data-act="cfgopen"]');
  await app.until(() => app.$('[data-act="impopen"][data-v="clients"]'), 2000, 'Settings › Data');
  app.tap('[data-act="impopen"][data-v="clients"]');
  await app.until(() => app.$('#imptext'), 2000, 'the import window');
  app.type('#imptext', ['Vardas;Pavardė;Telefonas;Gimimo data;Pastabos', 'Jonas;Petrauskas;+370 612 34567;1974-03-02;"Prefers mornings; no Fridays"', 'Ieva;Šimkutė;8 600 44444;;',
    'Rasa;Jankūnė;;;', 'Tomas;Twice;+37061234567;;', 'Gediminas;Siutilas;+370 611 00000;;'].join('\n'));
  app.tap('[data-act="impcheck"]');
  await app.until(() => /Already here/.test(app.text('#impsheet')), 2000, 'the preview');
  const pv = app.text('#impsheet');
  t.see('preview', pv.replace(/\s+/g, ' ').slice(0, 400));
  t.check(/New\s*2/.test(pv) && /Already here\s*1/.test(pv) && /Skipped \(2\)/.test(pv), 'a preview: 2 new, 1 already here by phone number, 2 skipped');
  t.check(/Row 4: Rasa Jankūnė\s*no phone number/.test(pv) && /Row 5: Tomas Twice\s*the same number as a row above/.test(pv), 'each skipped row says why');
  t.check(pts().length === 1, 'nothing saved before Import');
  app.tap('[data-act="impcommit"]');
  await app.until(() => pts().length === 3, 2000, 'imported');
  const jonas = pts().find((p) => p.name === 'Jonas Petrauskas');
  t.check(jonas.age === 52 && jonas.phone === '+370 612 34567' && jonas.notes[0].text === 'Prefers mornings; no Fridays' && pts().find((p) => p.id === 'p-1').name === 'Gediminas', 'first and last name joined, age from the birth date, the quoted note intact; the existing record untouched');

  t.step('B. Staff from tab-separated rows');
  app.tap('[data-act="impopen"][data-v="staff"]');
  await app.until(() => app.$('#imptext'), 2000, 'the window');
  app.type('#imptext', ['name\trole\tservices\tdays\thours', 'Dr. Ieva Žemaitė\tOral surgeon\tOral surgery\tTue-Fri\t9-15', 'Tomas Petraitis\tEndodontist\tRoot canal\tMon,Wed\t10:00-18:00', 'Lina Paulauskė\tHygienist\tWhitening\tPr-Pn\t'].join('\n'));
  app.tap('[data-act="impcheck"]');
  await app.until(() => /Already here/.test(app.text('#impsheet')), 2000, 'the preview');
  t.check(/New\s*2/.test(app.text('#impsheet')) && /Already here\s*1/.test(app.text('#impsheet')) && /1 with services Frontly doesn't have/.test(app.text('#impsheet')), '2 new, Tomas already here (“Dr.” or not), an unknown service pointed out');
  app.tap('[data-act="impcommit"]');
  await app.until(() => (st().doctors || []).length === 7, 2000, 'imported');
  const ieva = st().doctors.find((d) => d.name === 'Dr. Ieva Žemaitė'), lina = st().doctors.find((d) => d.name === 'Lina Paulauskė');
  t.check(ieva.spec.join() === 'surgery' && ieva.days.join() === '2,3,4,5' && ieva.from === 9 && ieva.to === 15 && ieva.role === 'Oral surgeon', 'services, days and hours read');
  t.check(lina.days.join() === '1,2,3,4,5' && lina.from === 8 && lina.to === 16 && lina.spec.length === 1, 'Lithuanian days (Pr-Pn); no hours: 8 to 16; unknown service: the first one');

  t.step('C. Patients from ClinicCards');
  app.tap('[data-act="planopen"][data-v="cliniccards"]');
  await app.until(() => app.$('[data-act="impengine"]'), 2000, 'the ClinicCards window');
  app.tap('[data-act="impengine"]');
  await app.until(() => /From ClinicCards/.test(app.text('#impsheet')), 3000, 'the preview');
  t.check(pages.join() === '1,2' && /New\s*1/.test(app.text('#impsheet')) && /Already here\s*1/.test(app.text('#impsheet')), 'page by page until nothing new; Jonas is already here, Marta is new');
  app.tap('[data-act="impcommit"]');
  await app.until(() => pts().length === 4, 2000, 'imported');
  const j2 = pts().find((p) => p.name === 'Jonas Petrauskas'), marta = pts().find((p) => p.name === 'Marta Žukauskienė');
  t.check(j2.ext.cliniccards === '501' && marta.ext.cliniccards === '502' && marta.age === 36, 'both carry their ClinicCards id; Marta’s age from her birthday');
  app.tap('[data-act="planclose"]');

  t.step('D. Cancel saves nothing');
  app.tap('[data-act="impopen"][data-v="clients"]');
  await app.until(() => app.$('#imptext'), 2000, 'the window');
  app.type('#imptext', 'name;phone\nNew Person;+370 699 11111');
  app.tap('[data-act="impcheck"]');
  await app.until(() => /New\s*1/.test(app.text('#impsheet')), 2000, 'the preview');
  app.tap('[data-act="impclose"]');
  await app.wait(200);
  t.check(pts().length === 4 && !app.$('#impsheet.open'), 'closed, nothing added');
});
