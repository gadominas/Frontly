// 27 The booking box with ClinicCards: someone linked is suggested and listed first, even if the call's service
// belongs to someone who isn't; an unlinked person shows only why (no day strip, no "no times" line); with no days, a
// full-width Pick a date; the caller-preference legend only with times to match; length chips don't share a class
// with the suggestion card (that gave the selected chip the card's margin and lifted it).
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('booking box with cliniccards', async (t) => {
  const ok = (data) => ({ json: { result: 'success', data } });
  const routes = [{ name: 'cliniccards', match: (u) => u.startsWith('https://cliniccards.com/api/'), respond: () => ok([]) }];
  const T = Date.parse('2026-11-12T08:32:00Z');
  const doctors = [{ id: 'd-stan', name: 'Eglė Stankevičiūtė', short: 'Eglė (hygienist)', role: 'Dental hygienist', spec: ['hygiene'], days: [1, 2, 3, 4, 5], from: 8, to: 17 },
    { id: 'd-fr', name: 'Francesco Doctor', short: 'Francesco Doctor', role: 'Doctor', spec: ['general'], days: [1, 2, 3, 4, 5], from: 8, to: 18, ext: { cliniccards: '77' } }];
  const app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true, planner: 'cliniccards', doctors, plannerState: { cliniccards: { ok: true, at: T, lines: ['ok'], lists: {} } } },
    kc: { FRONTLY_CLINICCARDS_KEY: 'cc-key' }, routes,
    files: (h) => ({ [h.path('patients.json')]: '[]', [h.path('calls.json')]: JSON.stringify([{ id: 'c-1', at: T - 3600e3, phone: '+370 645 88715', source: 'phone', status: 'waiting', transcript: [], fields: { name: 'Gediminas Minas', preferred: 'Tuesday afternoon' },
      summary: { kind: 'ai', text: 'n', reason: 'Routine dental hygiene', triage: 'routine', priority: 1, specialty: 'hygiene', doctor: 'd-stan', flags: [], hint: '' } }]) }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  app.tap('[data-act="tab"][data-v="desk"]'); app.tap('[data-act="opencase"][data-id="c-1"]');
  await app.until(() => app.$('#bkdoc') && /No shifts|Loading/.test(app.text('#casesheet')), 4000, 'the box');
  await app.until(() => /No shifts/.test(app.text('#casesheet')), 4000, 'the diary');

  t.step('A. Someone who can be booked');
  const sel = app.$('#bkdoc');
  t.check(sel.value === 'd-fr' && /Francesco Doctor · Doctor \(suggested\)/.test(sel.options[0].textContent) && /not in ClinicCards/.test(sel.options[1].textContent), 'Francesco (linked) is chosen, first and suggested; Eglė is marked not in ClinicCards');
  t.check(app.$('.days-row .pickdate.wide') && !app.$('.days-row .day') && /No shifts for Francesco Doctor in ClinicCards in the coming days/.test(app.text('#casesheet')), 'no days: a full-width Pick a date and why');
  t.check(!/Matches what the caller asked for/.test(app.text('#casesheet')), 'no legend without times to match');
  t.check(app.$('.chip.len.len-sug') && !app.$('.chip.len.sug'), 'the suggested length doesn’t borrow the suggestion card’s style');

  t.step('B. Someone not linked');
  app.type('#bkdoc', 'd-stan');
  await app.until(() => /isn't linked to ClinicCards/.test(app.text('#casesheet')), 2000, 'the note');
  t.check(!app.$('#casesheet .days-row') && !app.$('#casesheet .slots') && !/No times/.test(app.text('#casesheet')), 'only why: no day strip, no times, no “no times” line');
});
