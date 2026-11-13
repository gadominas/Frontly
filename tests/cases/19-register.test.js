// 19 Registering at the front desk, no call: a new client with a request to book (it waits in To book, marked as from
// the front desk, and opens straight into the booking box); a client without a request; a new request for an existing
// client; the same checks as editing (a number can't be shared); and booking one.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('register at the desk', async (t) => {
  const T = Date.parse('2026-11-12T08:32:00Z');
  const app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true },
    files: (h) => ({ [h.path('patients.json')]: JSON.stringify([{ id: 'p-1', name: 'Rasa Jankūnė', age: 31, phone: '+370 600 33333', since: T - 90 * 864e5, notes: [], appts: [] }]), [h.path('calls.json')]: '[]' }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  const pts = () => app.json(app.path('patients.json')) || [], calls = () => app.json(app.path('calls.json')) || [];

  t.step('A. A walk-in with a request to book');
  app.tap('[data-act="tab"][data-v="desk"]');
  await app.until(() => app.$('[data-act="regopen"][data-v="new"]'), 2000, 'Register someone');
  t.check(/Nobody is waiting/.test(app.text('#list')), 'the empty front desk offers to register someone');
  app.tap('[data-act="regopen"][data-v="new"]');
  await app.until(() => app.$('#rg-name'), 2000, 'the form');
  app.type('#rg-name', 'Jonas Petrauskas'); app.type('#rg-phone', '+370 600 33333'); app.type('#rg-age', '52');
  app.type('#rg-reason', 'Throbbing toothache, upper right'); app.tap('[data-act="regurg"][data-v="4"]');
  t.check(app.$('#rg-name').value === 'Jonas Petrauskas' && /on/.test(app.$('[data-act="regurg"][data-v="4"]').className), 'what was typed survives tapping the urgency');
  app.type('#rg-pref', 'after 3 pm');
  app.tap('[data-act="regsave"]');
  await app.until(() => /Rasa Jankūnė already has that number/.test(app.text('#regsheet')), 2000, 'the shared-number error');
  t.check(pts().length === 1 && app.$('#rg-reason').value === 'Throbbing toothache, upper right', 'another record’s number is refused; nothing saved; the form keeps everything');
  app.type('#rg-phone', '+370 612 34567'); app.tap('[data-act="regsave"]');
  await app.until(() => app.$('#casesheet.open'), 3000, 'the booking box');
  const c = calls()[0], j = pts().find((p) => p.name === 'Jonas Petrauskas');
  t.see('request', JSON.stringify({ source: c.source, status: c.status, f: c.fields, s: { triage: c.summary.triage, specialty: c.summary.specialty, doctor: c.summary.doctor, kind: c.summary.kind } }));
  t.check(j && j.age === 52 && c.source === 'desk' && c.status === 'waiting' && c.patientId === j.id && c.isNew && c.transcript.length === 0, 'the client is saved and a request waits, from the front desk, no call');
  t.check(c.fields.complaint === 'Throbbing toothache, upper right' && c.fields.urgency === 4 && c.fields.preferred === 'after 3 pm' && c.summary.specialty === 'endo' && c.summary.triage === 'soon', 'its details, and a note like a call’s: throbbing pain goes to root canal, urgency 4 is “soon” as for a call');
  t.check(/Registered at the front desk/.test(app.text('#casesheet')) && /✎ Front desk/.test(app.text('#casesheet')) && /Details/.test(app.text('#casesheet')) && !/Read the whole call/.test(app.text('#casesheet')), 'the case says where it came from, with no call to read');
  t.check(/Suggested/.test(app.text('#casesheet')) && /matches “after 3 pm”/.test(app.text('#casesheet')) && app.$('.slot.on'), 'it opens straight into booking, a time after 3 pm already chosen');
  app.tap('[data-act="book"]');
  await app.until(() => calls()[0].status === 'booked', 3000, 'booked');
  t.check((pts().find((p) => p.name === 'Jonas Petrauskas').appts || []).length === 1, 'booked like any call');
  app.tap('[data-act="caseclosesheet"]');

  t.step('B. A client without a request');
  app.tap('[data-act="tab"][data-v="patients"]');
  await app.until(() => app.$('.srch-row [data-act="regopen"]'), 2000, 'Add');
  app.tap('.srch-row [data-act="regopen"]');
  await app.until(() => app.$('#rg-name'), 2000, 'the form');
  app.type('#rg-name', 'Ieva Šimkutė'); app.type('#rg-phone', '+370 600 44444'); app.type('#rg-note', 'Prefers SMS');
  const box = app.$('#rg-book'); box.checked = false; const W = app.win(); box.dispatchEvent(new W.Event('change', { bubbles: true }));
  await app.until(() => !app.$('#rg-reason'), 1000, 'no request part');
  t.check(/^Save$/.test(app.text('[data-act="regsave"]').trim()) && app.$('#rg-name').value === 'Ieva Šimkutė', 'without a request the form is just the client');
  app.tap('[data-act="regsave"]');
  await app.until(() => app.$('#patsheet.open'), 2000, 'her page');
  t.check(pts().some((p) => p.name === 'Ieva Šimkutė' && p.notes[0].text === 'Prefers SMS') && calls().length === 1 && /Ieva Šimkutė/.test(app.text('#patsheet')), 'saved with her note, no request; her page opens');

  t.step('C. A new request for an existing client');
  app.tap('#patsheet [data-act="regopen"]');
  await app.until(() => app.$('#rg-reason') && !app.$('#rg-name'), 2000, 'the request form');
  t.check(/For Ieva Šimkutė · \+370 600 44444/.test(app.text('#regsheet')), 'for her, without asking her details again');
  app.tap('[data-act="regsave"]');
  await app.until(() => /Add what they need/.test(app.text('#regsheet')), 2000, 'the error');
  app.type('#rg-reason', 'Cleaning'); app.type('#rg-svc', 'hygiene'); app.tap('[data-act="regsave"]');
  await app.until(() => app.$('#casesheet.open') && calls().length === 2, 3000, 'the case');
  t.check(calls()[0].summary.specialty === 'hygiene' && calls()[0].fields.complaint === 'Cleaning' && !app.$('#patsheet.open'), 'the chosen service is kept; the case opens');
  app.tap('[data-act="caseclosesheet"]');
  app.tap('[data-act="tab"][data-v="desk"]');
  await app.until(() => app.$('[data-act="opencase"]'), 2000, 'the queue');
  t.check(/✎ Front desk/.test(app.text('.queue')) && app.$('.reg-row [data-act="regopen"]'), 'the card says Front desk; Register someone sits under the list');
});
