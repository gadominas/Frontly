// 24 Visit length: suggested from what the caller asked for (not from how long it has hurt), the AI's estimate, or the
// service's usual length; free times fit the length (no overlap with other visits, nothing past the end of the day);
// the length is booked, shown as start–end, and a service's usual length can be changed.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('visit length', async (t) => {
  const T = Date.parse('2026-11-12T08:32:00Z'), FRI = new Date(2026, 10, 13).getTime(), at = (h, m = 0) => FRI + (h * 60 + m) * 60e3;
  const call = (id, name, phone, said, sum) => ({ id, at: T - 3600e3, dur: 90, phone, source: 'phone', status: 'waiting', transcript: [{ who: 'reva', t: 'Labas.' }, { who: 'caller', t: said }],
    fields: { name, complaint: sum.reason }, summary: Object.assign({ kind: 'template', text: 'n', triage: 'routine', priority: 2, doctor: 'd-kazl', flags: [], hint: '' }, sum) });
  const app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true },
    files: (h) => ({
      [h.path('patients.json')]: JSON.stringify([{ id: 'p-x', name: 'Rasa Jankūnė', phone: '+370 600 33333', since: T, notes: [], appts: [{ id: 'a-x', at: at(10), dur: 60, doctor: 'd-kazl', reason: 'Filling', status: 'booked' }] }]),
      [h.path('calls.json')]: JSON.stringify([
        call('c-1', 'Jonas Petrauskas', '+370 612 34567', 'Skauda jau dvi valandas. Ar galima užsiregistruoti valandai?', { reason: 'Toothache', specialty: 'general' }),
        call('c-2', 'Ieva Šimkutė', '+370 600 44444', 'I would like to talk about an implant.', { reason: 'Implant consultation', specialty: 'surgery', dur: 90, durWhy: 'implant consultation: 90 min' }),
        call('c-3', 'Ona Kairienė', '+370 622 22222', 'A cleaning, please.', { reason: 'Cleaning', specialty: 'hygiene' }),
      ]),
    }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  const open = async (id) => { app.tap('[data-act="tab"][data-v="desk"]'); app.tap(`[data-act="opencase"][data-id="${id}"]`); await app.until(() => app.$('#casesheet .lens'), 3000, 'the box'); };
  const on = () => (app.$('.chip.len.on') || {}).textContent;
  const slots = () => app.$$('#casesheet .slot').map((b) => b.textContent + (b.disabled ? '×' : '')).join(' ');

  t.step('A. The caller asked for an hour');
  await open('c-1');
  t.check(on() === '1 h' && /Suggested: asked for 1 h/.test(app.text('#casesheet')), 'an hour, from “užsiregistruoti valandai”; “skauda jau dvi valandas” doesn’t count');
  app.tap(`.day[data-v="${FRI}"]`);
  t.see('Friday, 1 h', slots());
  t.check(/09:00 /.test(slots()) && /09:30×/.test(slots()) && /10:00×/.test(slots()) && /10:30×/.test(slots()) && /11:00 /.test(slots()), 'no start that would overlap the 10:00–11:00 visit');
  t.check(/15:00$/.test(slots()), 'and none that would run past 16:00');
  app.tap(`#casesheet .slot[data-v="${at(11)}"]`);
  t.check(/Book .*11:00–12:00 with Dr\. Kazlauskienė/.test(app.text('[data-act="book"]')), 'the button says start and end');
  app.tap('[data-act="book"]');
  await app.until(() => (app.json(app.path('patients.json')) || []).some((p) => p.name === 'Jonas Petrauskas'), 3000, 'booked');
  const a = app.json(app.path('patients.json')).find((p) => p.name === 'Jonas Petrauskas').appts[0];
  t.check(a.dur === 60 && a.at === at(11) && a.info.len === 60 && /asked for 1 h/.test(a.info.lenWhy), 'booked for 60 minutes, and why');
  await app.until(() => /11:00–12:00/.test(app.text('#casesheet .booked')), 2000, 'the booked box');
  t.check(true, 'the case shows 11:00–12:00');
  app.tap('[data-act="caseclosesheet"]');

  t.step('B. The AI’s estimate, and a service’s usual length');
  await open('c-2');
  t.check(on() === '1 h 30 min' && /✦ implant consultation: 90 min/.test(app.text('#casesheet')), 'the AI note’s 90 minutes, with its reason');
  app.tap('[data-act="caseclosesheet"]');
  await open('c-3');
  t.check(on() === '45 min' && /usual for Cleaning and check-ups/.test(app.text('#casesheet')), 'a cleaning: its usual 45 minutes');
  app.tap('[data-act="bklen"][data-v="20"]');
  t.check(on() === '20 min' && /Suggested 45 min: usual for Cleaning/.test(app.text('#casesheet')) && /–/.test(app.text('[data-act="book"]')), 'another length can be picked; the suggestion stays visible');
  app.tap('[data-act="caseclosesheet"]');

  t.step('C. A service’s usual length, changed');
  app.tap('[data-act="cfgopen"]');
  await app.until(() => app.$('.svclen[data-k="hygiene"]'), 2000, 'the lengths');
  app.type('.svclen[data-k="hygiene"]', '30');
  await app.until(() => ((app.json(app.path('settings.json')) || {}).serviceLen || {}).hygiene === 30, 2000, 'saved');
  app.tap('[data-act="cfgclose"]');
  await open('c-3');
  t.check(on() === '30 min' && /usual for Cleaning and check-ups/.test(app.text('#casesheet')), 'cleanings now suggest 30 minutes');
});
