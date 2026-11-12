// 09 Patients: grouped by status, filtered, grouped by name, with the details each card shows
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('patients list', async (t) => {
  const DAY = 864e5;
  const app = await t.open({ files: (h) => ({ [h.path('patients.json')]: JSON.stringify([
    { id: 'p-jonas', name: 'Jonas Petrauskas', age: 52, phone: '+370 612 34567', since: h.now - 900 * DAY, notes: [{ at: h.now - 9 * DAY, by: 'A', text: 'Mornings' }],
      appts: [{ id: 'a1', at: h.now - 60 * DAY, doctor: 'd-kazl', reason: 'Filling', status: 'done' }, { id: 'a2', at: h.now + 3 * DAY, doctor: 'd-stan', reason: 'Cleaning', status: 'booked' }] },
    { id: 'p-greta', name: 'Greta Mikalauskaitė', age: 29, phone: '+370 698 76543', since: h.now - 400 * DAY, notes: [], appts: [] },
    { id: 'p-ona', name: 'Ona Kazlauskaitė', age: 34, phone: '+370 611 00000', since: h.now - DAY, notes: [], appts: [] },
    { id: 'p-pet', name: 'Petras Kazlauskas', age: 36, phone: '+370 611 00000', since: h.now - 200 * DAY, notes: [], appts: [] },
  ]) }) });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  app.tap('[data-act="tab"][data-v="patients"]');
  await app.until(() => app.$('.pgrp'), 2000, 'grouped list');

  t.step('A. Grouped by status');
  const heads = app.$$('.pgrp-h').map((h) => h.textContent.replace(/\d+$/, '').trim());
  t.see('groups', heads.join(' | '));
  t.check(heads.join('|') === 'To book|Visit booked|New patients|Everyone else', 'to book, booked, new, everyone else, in that order');
  const greta = app.$('[data-act="openpat"][data-id="p-greta"]');
  t.check(/Loose bracket/.test(greta.textContent) && /Routine/.test(greta.textContent), 'a waiting call shows its reason and urgency');
  const jonas = app.$('[data-act="openpat"][data-id="p-jonas"]');
  t.check(/Dr\. Stankevičiūtė|Eglė/.test(jonas.textContent) && /1 visit/.test(jonas.textContent) && /1 note/.test(jonas.textContent), 'a booked patient shows the visit, the dentist, visits and notes');
  t.check(/Same number as Petras/.test(app.$('[data-act="openpat"][data-id="p-ona"]').textContent), 'two records on one number are pointed out');

  t.step('B. Filters and other groupings');
  app.tap('[data-act="pfilter"][data-v="new"]');
  await app.until(() => app.$$('.pcard').length === 1, 2000, 'only the new patient');
  t.check(/Ona/.test(app.text('.pcard')), 'New shows only new patients');
  app.tap('[data-act="pfilter"][data-v="all"]');
  app.tap('[data-act="pgroup"][data-v="az"]');
  await app.until(() => app.$$('.pgrp-h').length === 4, 2000, 'letters');
  t.check(app.$$('.pgrp-h').map((h) => h.textContent.charAt(0)).join('') === 'GJOP', 'grouped by first letter');
  await app.until(() => (app.json(app.path('settings.json')) || {}).patGroup === 'az', 2000, 'the grouping saved');
  t.check(true, 'the grouping is remembered');
  await t.close(app);
});
