// 31 Import staff from ClinicCards: Settings › Dentists › Import from ClinicCards lists everyone there with their role;
// doctors and specialists are ticked, others not; the service is guessed from the job title (Lithuanian too) and can
// be changed; days and hours come from their shifts; imported people arrive linked; already-linked ones are marked.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('import staff from cliniccards', async (t) => {
  const ok = (data) => ({ json: { result: 'success', data } });
  const shift = (doc, k, a, b) => ({ doctor_id: doc, shift_start: `${k} ${a}:00:00`, shift_end: `${k} ${b}:00:00`, schedule_cabinets_id: 5 });
  const routes = [{ name: 'cliniccards', match: (u) => u.startsWith('https://cliniccards.com/api/'), respond: (req) => {
    const u = new URL(req.url), path = u.pathname.replace('/api/', ''), q = Object.fromEntries(u.searchParams);
    if (path === 'staff') return ok([
      { doctor_id: 21, firstname: 'Lina', lastname: 'Vaitkutė', role: 'SPECIALIST', specialization: 'Burnos higienistė' },
      { doctor_id: 22, firstname: 'Paulius', lastname: 'Rimkus', role: 'DOCTOR', specialization: 'Burnos chirurgas' },
      { doctor_id: 23, firstname: 'Ieva', lastname: 'Naujokė', role: 'DOCTOR' },
      { doctor_id: 24, firstname: 'Asta', lastname: 'Asistentė', role: 'ASSISTANT' },
      { doctor_id: 25, firstname: 'Ona', lastname: 'Admin', role: 'ADMIN' }]);
    if (path === 'schedule-shifts') {
      const out = [];
      for (let d = new Date(q.from + 'T00:00:00'); d <= new Date(q.to + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, w = d.getDay();
        if (w === 2 || w === 4) out.push(shift(21, k, '09', '15'));
        if (w >= 1 && w <= 5) out.push(shift(22, k, '08', '17'));
      }
      return ok(out);
    }
    return ok([]);
  } }];
  const T = Date.parse('2026-11-12T08:32:00Z');
  const app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true, plannerState: { cliniccards: { ok: true, at: T, lines: ['ok'], lists: {} } } },
    kc: { FRONTLY_CLINICCARDS_KEY: 'cc-key' }, routes,
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  const st = () => app.json(app.path('settings.json')) || {};
  const row = (id) => app.$(`.stfpick[data-id="${id}"]`).closest('.stf');

  t.step('A. Next to Add, everyone with their role');
  app.tap('[data-act="cfgopen"]');
  await app.until(() => app.$('[data-act="stfopen"]'), 2000, 'Import from ClinicCards');
  t.check(/Or bring them in from ClinicCards, already linked/.test(app.text('#cfgsheet')), 'Settings › Dentists offers it next to Add');
  app.tap('[data-act="stfopen"]');
  await app.until(() => app.$('#stfsheet .stflist'), 3000, 'the list');
  t.check(app.$$('#stfsheet .stf').length === 5 && /Burnos higienistė/.test(app.text(row(21))) && /Assistant/.test(app.text(row(24))), 'all five, with role and speciality');
  t.check(app.$('.stfpick[data-id="21"]').checked && app.$('.stfpick[data-id="22"]').checked && app.$('.stfpick[data-id="23"]').checked && !app.$('.stfpick[data-id="24"]').checked && !app.$('.stfpick[data-id="25"]').checked, 'doctors and specialists ticked; the assistant and the admin not');
  t.check(app.$('.stfspec[data-id="21"]').value === 'hygiene' && app.$('.stfspec[data-id="22"]').value === 'surgery' && app.$('.stfspec[data-id="23"]').value === 'general', 'services from the job titles: higienistė → cleaning, chirurgas → surgery, none → general');
  t.check(/Tue, Thu, 9–15/.test(app.text(row(21))) && /Mon–Fri, 8–17/.test(app.text(row(22))) && /No shifts in the next 4 weeks/.test(app.text(row(23))), 'days and hours from their shifts');

  t.step('B. Change, untick, import');
  app.type('.stfspec[data-id="23"]', 'kids');
  app.tap('.stfpick[data-id="22"]');
  await app.until(() => /Import 2/.test(app.text('[data-act="stfgo"]')), 2000, 'the count');
  app.tap('[data-act="stfgo"]');
  await app.until(() => (st().doctors || []).some((d) => d.ext && d.ext.cliniccards === '23'), 3000, 'imported');
  const eg = st().doctors.find((d) => d.ext && d.ext.cliniccards === '21'), ie = st().doctors.find((d) => d.ext && d.ext.cliniccards === '23');
  t.check(eg && eg.spec.join() === 'hygiene' && eg.days.join() === '2,4' && eg.from === 9 && eg.to === 15 && eg.role === 'Burnos higienistė', 'Lina: linked, cleaning, Tue and Thu 9–15');
  t.check(ie && ie.spec.join() === 'kids' && ie.days.join() === '1,2,3,4,5' && ie.from === 8 && ie.to === 16 && !st().doctors.some((d) => d.ext && d.ext.cliniccards === '22'), 'Ieva with the service chosen; Paulius left out');
  t.check(!app.$('#stfsheet.open') && /Lina Vaitkutė/.test(app.text('#cfgsheet')), 'the window closes; they’re in Settings › Dentists');

  t.step('C. Again: who is already here');
  app.tap('[data-act="stfopen"]');
  await app.until(() => app.$('#stfsheet .stflist'), 3000, 'the list');
  t.check(/Already in Frontly as Lina Vaitkutė/.test(app.text(row(21))) && app.$('.stfpick[data-id="21"]').disabled, 'already linked: marked, not offered again');
});
