// 30 The review list and closing: what happened on the line that nobody has looked at (newest first, with what came
// of it); ✓ ticks one off, booking or closing ticks it off, Undo or a cancelled visit puts it back; Mark all reviewed;
// Remove this call (the client stays). Closing a case after a cancelled visit shows at once (it didn't, since 1.8.1).
// Check line shows a pie counting down to the next background check.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('review list', async (t) => {
  const T = Date.parse('2026-11-12T08:32:00Z');
  const sum = (reason, extra) => Object.assign({ kind: 'template', text: reason + ' (summary)', reason, triage: 'routine', priority: 2, specialty: 'general', doctor: 'd-kazl', flags: [], hint: '' }, extra);
  const calls = [
    { id: 'c-wait', at: T - 3600e3, phone: '+370 612 34567', source: 'phone', status: 'waiting', transcript: [{ who: 'caller', t: 'hi' }], fields: { name: 'Jonas Petrauskas' }, summary: sum('Check-up'), reviewed: null },
    { id: 'c-about', at: T - 1800e3, phone: '+370 600 33333', patientId: 'p-r', source: 'phone', status: 'noted', intent: 'about_visit', delivered: 'Bring your X-rays', transcript: [{ who: 'caller', t: 'when is it?' }], fields: { name: 'Rasa Jankūnė' }, summary: sum('Asked when the visit is'), reviewed: null },
    { id: 'c-old', at: T - 86400e3 * 3, phone: '+370 699 00000', source: 'phone', status: 'closed', transcript: [], fields: {}, summary: sum('Nothing') },
  ];
  const app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true, bridgeUrl: 'https://b.test' }, kc: { FRONTLY_BRIDGE_TOKEN: 'x' },
    routes: [{ name: 'bridge', match: (u) => u.startsWith('https://b.test'), respond: () => ({ json: { calls: [], ok: true } }) }],
    files: (h) => ({ [h.path('patients.json')]: JSON.stringify([{ id: 'p-r', name: 'Rasa Jankūnė', phone: '+370 600 33333', since: T, notes: [], appts: [] }]), [h.path('calls.json')]: JSON.stringify(calls) }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  const cs = () => app.json(app.path('calls.json')) || [], call = (id) => cs().find((c) => c.id === id) || {};
  app.tap('[data-act="tab"][data-v="desk"]');
  const filter = async (v) => { app.tap(`[data-act="dfilter"][data-v="${v}"]`); await app.wait(150); };

  t.step('A. What nobody has looked at yet');
  await filter('review');
  await app.until(() => app.$('.rvlist'), 2000, 'the list');
  const rows = app.$$('.rv-body').map((b) => b.textContent.replace(/\s+/g, ' '));
  t.see('review', rows.join(' || '));
  t.check(rows.length === 2 && /Rasa Jankūnė/.test(rows[0]) && /Jonas Petrauskas/.test(rows[1]), 'the two unreviewed calls, newest first; the old closed one is already reviewed');
  t.check(/Asked about a visit · the message was passed on/.test(rows[0]) && /Waiting to be booked/.test(rows[1]), 'what came of each');
  t.check(/Review\s*2/.test(app.text('.segbar')), 'the filter counts them');

  t.step('B. ✓, booking and Undo');
  app.tap('.rv-chk[data-id="c-about"]');
  await app.until(() => call('c-about').reviewed && app.$$('.rv-body').length === 1, 2000, 'ticked off');
  t.check(call('c-about').reviewed.by === 'Agnė Petrauskaitė', '✓ ticks it off, with who');
  app.tap('.rv-body[data-id="c-wait"]');
  await app.until(() => /Not reviewed yet/.test(app.text('#casesheet')), 2000, 'the case');
  await app.until(() => app.$('#casesheet .slot:not([disabled])'), 3000, 'times');
  if (!app.$('#casesheet .slot.on')) app.tap('#casesheet .slot:not([disabled])');
  app.tap('[data-act="book"]');
  await app.until(() => call('c-wait').status === 'booked', 3000, 'booked');
  await app.until(() => /✓ Reviewed by Agnė Petrauskaitė \(booked\)/.test(app.text('#casesheet')), 2000, 'reviewed by booking');
  t.check(call('c-wait').reviewed.how === 'booked', 'booking ticks it off the list');

  t.step('C. A cancelled visit comes back; closing shows at once');
  app.tap('#casesheet [data-act="apptcancel"]'); await app.until(() => app.$('#dlg.open'), 2000, 'the dialog'); app.tap('[data-act="dlgcancel"]');
  await app.until(() => call('c-wait').status === 'waiting' && /Not reviewed yet/.test(app.text('#casesheet')), 3000, 'back');
  t.check(call('c-wait').reviewed === null, 'the cancelled visit puts the call back on both lists');
  app.tap('[data-act="caseclose"]'); app.tap('[data-act="caseclose"]');
  await app.until(() => app.$('#casesheet .booked.closed'), 2000, 'the closed box');
  t.check(/Closed without booking/.test(app.text('#casesheet .booked.closed')) && /✓ Reviewed by Agnė Petrauskaitė \(closed\)/.test(app.text('#casesheet')) && /To book\s*0/.test(app.text('.segbar')), 'closing shows at once: the case, the counts, reviewed');
  app.tap('[data-act="unreview"]');
  await app.until(() => /Not reviewed yet/.test(app.text('#casesheet')), 2000, 'undone');
  t.check(call('c-wait').reviewed === null, 'Undo puts it back');

  t.step('D. Remove this call');
  app.tap('[data-act="callremove"]');
  await app.until(() => app.$('#dlg.open'), 2000, 'the dialog');
  t.check(/Remove this call\?/.test(app.text('#dlg')) && /Jonas Petrauskas/.test(app.text('#dlg')), 'it asks first');
  app.tap('[data-act="dlgdo"]');
  await app.until(() => !call('c-wait').id, 2000, 'removed');
  t.check(!app.$('#casesheet.open') && (app.json(app.path('patients.json')) || []).some((p) => p.name === 'Jonas Petrauskas'), 'the call is gone, the client stays');

  t.step('E. Mark all reviewed, and the countdown');
  app.tap('[data-act="dfilter"][data-v="all"]'); app.tap('[data-act="opencase"][data-id="c-about"]');
  await app.until(() => app.$('[data-act="unreview"]'), 2000, 'the case');
  app.tap('[data-act="unreview"]'); app.tap('[data-act="caseclosesheet"]');
  await filter('review');
  await app.until(() => app.$('[data-act="reviewall"]'), 2000, 'Mark all');
  app.tap('[data-act="reviewall"]'); await app.until(() => app.$('#dlg.open'), 2000, 'the dialog'); app.tap('[data-act="dlgdo"]');
  await app.until(() => /All reviewed ✓/.test(app.text('#list')), 2000, 'all reviewed');
  t.check(cs().every((c) => c.reviewed), 'every call reviewed');
  const pie = app.$('.lsync .lpie');
  await app.until(() => pie && pie.style.getPropertyValue('--p'), 3000, 'the pie');
  t.check(/^\d+deg$/.test(pie.style.getPropertyValue('--p')) && /Next check in \d+ s/.test(app.$('.lsync').title), 'Check line has a pie counting down, and says when');
});
