// 13 Dentists: added, edited and removed in Settings; a dentist with booked visits stays; one with only past visits is
// kept out of sight so the history still names them. Plus the calendar's navigation buttons.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

const DAY = 864e5, T = Date.parse('2026-11-12T08:32:00Z');
const doc = (id, name, extra) => Object.assign({ id, name, short: name, role: 'General dentist', spec: ['general'], days: [1, 2, 3, 4, 5], from: 8, to: 16 }, extra);

scenario('dentists', async (t) => {
  const app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true,
      doctors: [doc('d-x', 'Dr. Booked Ahead'), doc('d-y', 'Dr. Seen Before'), doc('d-z', 'Dr. Never Booked')] },
    files: (h) => ({
      [h.path('patients.json')]: JSON.stringify([{ id: 'p-1', name: 'Rasa Jankūnė', age: 31, phone: '+370 600 33333', since: T - 90 * DAY, notes: [],
        appts: [{ id: 'a-1', at: T + 4 * DAY, doctor: 'd-x', reason: 'Filling', status: 'booked' }, { id: 'a-2', at: T - 30 * DAY, doctor: 'd-y', reason: 'Check-up', status: 'done' }] }]),
      [h.path('calls.json')]: '[]',
    }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  const saved = () => (app.json(app.path('settings.json')) || {}).doctors || [];
  app.tap('[data-act="cfgopen"]');
  await app.until(() => app.$('#dentists'), 2000, 'Settings › Dentists');
  t.check(/Dr\. Booked Ahead/.test(app.text('#cfgsheet')) && /Mon, Tue, Wed, Thu, Fri · 08:00–16:00/.test(app.text('#cfgsheet')), 'each dentist with their days and hours');

  t.step('A. Add a dentist');
  app.tap('[data-act="dentnew"]');
  await app.until(() => app.$('#dn'), 2000, 'the form');
  app.tap('[data-act="dentsave"]');
  await app.until(() => /Add the dentist's name/.test(app.text('#cfgsheet')), 2000, 'the error');
  t.check(true, 'no name: the form says so and saves nothing');
  app.type('#dn', 'Dr. Ieva Žemaitė'); app.type('#ds', 'Dr. Žemaitė'); app.type('#dr', 'Oral surgeon');
  app.tap('[data-act="dentspec"][data-v="general"]'); app.tap('[data-act="dentspec"][data-v="surgery"]');
  app.tap('[data-act="dentday"][data-v="1"]'); app.tap('[data-act="dentday"][data-v="6"]');
  t.check(app.$('#dn').value === 'Dr. Ieva Žemaitė', 'what was typed survives tapping the chips');
  app.type('#dfrom', '9'); app.type('#dto', '13');
  app.tap('[data-act="dentsave"]');
  await app.until(() => saved().length === 4, 2000, 'saved');
  const z = saved()[3];
  t.see('saved', JSON.stringify(z));
  t.check(z.name === 'Dr. Ieva Žemaitė' && z.short === 'Dr. Žemaitė' && z.role === 'Oral surgeon' && z.spec.join() === 'surgery' && z.days.join() === '2,3,4,5,6' && z.from === 9 && z.to === 13 && /^d-/.test(z.id), 'name, role, work, days and hours are kept');

  t.step('B. Edit');
  app.tap(`[data-act="dentedit"][data-id="${z.id}"]`);
  await app.until(() => app.$('#dn'), 2000, 'the form');
  app.type('#dto', '15'); app.tap('[data-act="dentsave"]');
  await app.until(() => (saved().find((d) => d.id === z.id) || {}).to === 15, 2000, 'the change');
  t.check(true, 'new hours saved');

  t.step('C. Remove');
  const remove = async (id) => { app.tap(`[data-act="dentedit"][data-id="${id}"]`); await app.until(() => app.$('[data-act="dentdel"]'), 2000, 'remove'); app.tap('[data-act="dentdel"]'); app.tap('[data-act="dentdel"]'); await app.wait(150); };
  await remove('d-x');
  t.check(saved().some((d) => d.id === 'd-x' && !d.archived) && /has 1 visit booked/.test(app.text('#toast')), 'a dentist with a visit booked stays, and the toast says why');
  await remove('d-y');
  t.check((saved().find((d) => d.id === 'd-y') || {}).archived === true, 'a dentist with only past visits is kept out of sight');
  await remove('d-z');
  t.check(!saved().some((d) => d.id === 'd-z'), 'a dentist with nothing on record is removed');
  t.check(!/Dr\. Seen Before|Dr\. Never Booked/.test(app.text('#dentists').concat(app.text('#cfgsheet'))), 'neither is listed any more');
  app.tap('[data-act="cfgclose"]');
  app.tap('[data-act="tab"][data-v="patients"]'); await app.until(() => app.$('[data-act="openpat"][data-id="p-1"]'), 2000, 'patients');
  app.tap('[data-act="openpat"][data-id="p-1"]'); await app.until(() => /Check-up/.test(app.text('#patsheet')), 2000, 'the record');
  t.check(/Check-up · Dr\. Seen Before/.test(app.text('#patsheet')), 'the past visit still names its dentist');
  app.tap('[data-act="patclose"]');

  t.step('D. The calendar’s buttons');
  app.tap('[data-act="tab"][data-v="cal"]');
  await app.until(() => app.$('.heatgrid'), 2000, 'the week');
  t.check(app.$$('.heatgrid tr').length === 4, 'the week lists the two dentists left and the clinic');
  const next = app.$('.cn-b[data-v="1"]');
  t.check(next && next.querySelector('svg') && next.getAttribute('aria-label') === 'Next week' && !app.$('[data-act="caltoday"]'), 'round buttons with drawn arrows, named for what they do; no “today” while in this week');
  app.tap(next);
  t.check(app.$('[data-act="caltoday"]') && /Back to today/.test(app.text('.calnav')), 'a week ahead: “Back to today” appears');
  app.tap('[data-act="caltoday"]');
  t.check(!app.$('[data-act="caltoday"]'), 'and takes you back');
});
