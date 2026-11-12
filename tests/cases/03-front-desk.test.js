// 03 Front desk: sign in with the demo PIN, open the waiting call, book a dentist, cancel it again
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('front desk books and cancels', async (t) => {
  const app = await t.open();
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');

  t.step('A. Sign in');
  app.tap('[data-act="tab"][data-v="desk"]');
  await app.until(() => app.$('#dpin'), 2000, 'the sign-in card');
  t.check(/1 call to book/.test(app.text('#status')), 'the header counts the waiting call');
  app.type('#dpin', '0000'); app.tap('[data-act="signin"]');
  await app.until(() => app.$('.desk-in .err'), 3000, 'a wrong PIN is refused');
  app.type('#dpin', '1234'); app.tap('[data-act="signin"]');
  await app.until(() => app.$('.qcard'), 3000, 'the queue');
  t.check(/Greta Mikalauskaitė/.test(app.text('.qcard')) && /Loose bracket/.test(app.text('.qcard')), 'the waiting call shows who and why');

  t.step('B. Open the call and book');
  app.tap('.qcard');
  await app.until(() => app.$('#casesheet.open .slot'), 3000, 'the case with free times');
  t.check(/Dr\. Laura Vaitkutė/.test(app.$('#bkdoc').selectedOptions[0].textContent), 'the suggested orthodontist is picked');
  t.check(app.$$('.day').length === 10, 'ten days to choose from');
  const free = app.$$('.slot:not([disabled])');
  t.check(free.length > 0, 'some times are free');
  t.see('pref slots', app.$$('.slot.pref').length);
  const at = +free[0].dataset.v;
  app.tap(free[0]);
  await app.until(() => /^Book /.test(app.text('[data-act="book"]')), 2000, 'the Book button names the time');
  app.tap('[data-act="book"]');
  await app.until(() => app.$('#casesheet .booked'), 3000, 'the confirmation');
  const pts = app.json(app.path('patients.json')) || [];
  const appt = ((pts.find((p) => p.id === 'p-greta') || {}).appts || []).find((a) => a.callId === 'c-1');
  t.check(appt && appt.at === at && appt.doctor === 'd-vait' && appt.status === 'booked' && appt.by === 'Agnė Petrauskaitė', 'the appointment is on Greta’s record, by the receptionist');
  t.check(((app.json(app.path('calls.json')) || [])[0] || {}).status === 'booked', 'the call is marked booked');
  app.tap('[data-act="copyconf"]');
  await app.until(() => app.log.copied.length, 2000, 'the confirmation text');
  t.check(/Hi Greta, this is Northlight Dental/.test(app.log.copied[0]), 'the confirmation text greets Greta');

  t.step('C. Cancelling takes two taps and puts the call back');
  app.tap('#casesheet [data-act="apptcancel"]');
  await app.until(() => /Confirm/.test(app.text('#casesheet [data-act="apptcancel"]')), 2000, 'Confirm');
  app.tap('#casesheet [data-act="apptcancel"]');
  await app.until(() => ((app.json(app.path('calls.json')) || [])[0] || {}).status === 'waiting', 3000, 'the call waits again');
  t.check(true, 'the call waits again');
  await t.close(app);
});
