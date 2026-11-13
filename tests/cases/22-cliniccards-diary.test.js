// 22 Why a linked person shows no times, in ClinicCards: Check the diary shows whose shifts came back and whether
// they're linked; replies grouped by date are read; the diary is asked a week at a time.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('cliniccards diary', async (t) => {
  const asked = [];
  const ok = (data) => ({ json: { result: 'ok', data } });
  const routes = [{ name: 'cliniccards', match: (u) => u.startsWith('https://cliniccards.com/api/'), respond: (req) => {
    const u = new URL(req.url), path = u.pathname.replace('/api/', ''), q = Object.fromEntries(u.searchParams);
    if (path === 'staff') return ok([{ doctor_id: 77, firstname: 'Francesco', lastname: 'Doctor', role: 'DOCTOR' }, { doctor_id: 12, firstname: 'Tomas', lastname: 'Petraitis', role: 'DOCTOR' }]);
    if (path === 'schedule-shifts') {
      asked.push(q.from + '…' + q.to);
      // grouped by date, as some accounts return it; Tomas has shifts every day, Francesco on Friday 13th
      const out = {};
      for (let d = new Date(q.from + 'T00:00:00'); d <= new Date(q.to + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        out[k] = [{ doctor_id: 12, shift_start: k + ' 09:00:00', shift_end: k + ' 13:00:00', schedule_cabinets_id: 5 }];
        if (k === '2026-11-13') out[k].push({ doctor_id: 77, shift_start: k + ' 14:00:00', shift_end: k + ' 16:00:00', schedule_cabinets_id: 5 });
      }
      return ok(out);
    }
    return ok([]);
  } }];
  const T = Date.parse('2026-11-12T08:32:00Z');
  const doctors = [{ id: 'd-fr', name: 'Francesco Doctor', short: 'Francesco Doctor', role: 'Doctor', spec: ['general'], days: [1, 2, 3, 4, 5], from: 8, to: 18, ext: { cliniccards: '77' } }];
  const app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true, planner: 'cliniccards', doctors, plannerState: { cliniccards: { ok: true, at: T, lines: ['ok'], lists: {} } } },
    kc: { FRONTLY_CLINICCARDS_KEY: 'cc-key' }, routes,
    files: (h) => ({ [h.path('patients.json')]: '[]', [h.path('calls.json')]: JSON.stringify([{ id: 'c-1', at: T - 3600e3, phone: '+370 612 34567', source: 'desk', status: 'waiting', transcript: [], fields: { name: 'Jonas Petrauskas' },
      summary: { kind: 'desk', text: 'n', reason: 'Check-up', triage: 'routine', priority: 2, specialty: 'general', doctor: 'd-fr', flags: [], hint: '' } }]) }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');

  t.step('A. A reply grouped by date is read');
  app.tap('[data-act="tab"][data-v="desk"]'); app.tap('[data-act="opencase"][data-id="c-1"]');
  await app.until(() => app.$$('#casesheet .slot').length, 4000, 'Francesco’s times');
  t.check(app.$$('#casesheet .slot').map((b) => b.textContent).join(' ') === '14:00 14:30 15:00 15:30', 'Francesco’s Friday shift, from a reply grouped by date');
  t.see('asked', asked.join(', '));
  t.check(asked.length >= 2 && asked.every((r) => { const [a, b] = r.split('…'); return (Date.parse(b) - Date.parse(a)) / 864e5 <= 6; }), 'the diary is asked a week at a time');
  app.tap('[data-act="caseclosesheet"]');

  t.step('B. Check the diary');
  app.tap('[data-act="cfgopen"]'); app.tap('[data-act="planopen"][data-v="cliniccards"]');
  await app.until(() => app.$('.inspdate'), 2000, 'Check the diary');
  const el = app.$('.inspdate'), W = app.win(); el.value = '2026-11-12'; el.dispatchEvent(new W.Event('change', { bubbles: true }));
  await app.until(() => app.$('.insp-r'), 3000, 'the result');
  const r = app.text('.insp-r');
  t.see('result', r.replace(/\s+/g, ' '));
  t.check(/6 shifts from 2026-11-12 to 2026-11-18/.test(r), 'how many shifts that week');
  t.check(/Francesco Doctor \(id 77\): 1 shift\s*Linked to Francesco Doctor/.test(r) && /Tomas Petraitis \(id 12\): 5 shifts\s*Not linked to anyone in Frontly/.test(r), 'whose they are, and who is linked');
  t.check(/a shift has: date|a shift has: doctor_id/.test(r) && /grouped: 2026-11-12/.test(r), 'the shape of the reply and a shift’s fields, to compare with the API');
});
