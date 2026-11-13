// 12 Booking with judgement: one card per patient, no two visits too close, time to heal after surgery, a change of
// booking moves the visit, a suggested time from what the caller asked for, the AI's plan, and the clinic calendar.
const { scenario, ai } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

const Z = (s) => Date.parse(s);
const MON16 = Z('2026-11-16T12:00:00Z');                 // Monday 16 November, 14:00 in Vilnius
const MON16_DAY = Z('2026-11-15T22:00:00Z');             // that day's midnight in Vilnius
const NOV24_DAY = Z('2026-11-23T22:00:00Z');             // 14 days after the surgery on 10 November
const sum = (o) => Object.assign({ kind: 'template', text: 'Note.', priority: 3, flags: [], hint: '' }, o);
const call = (o) => Object.assign({ at: Z('2026-11-12T07:00:00Z'), dur: 60, source: 'phone', engine: 'phone', provider: 'elevenlabs', lang: 'en', isNew: false, deskNotes: [], mood: null,
  transcript: [{ who: 'caller', t: 'Hello' }], fields: { name: null, age: null, complaint: null, location: null, pain: null, urgency: null, preferred: null, notes: null } }, o);
const plans = [];
const planner = (system, user) => { plans.push(JSON.parse(user)); return { pick: 0, why: 'The first time after the healing period, with the surgeon.', warnings: ['Check the first extraction has healed'], alternatives: [1] }; };

scenario('booking rules', async (t) => {
  const app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', tab: 'desk' }, kc: { FRONTLY_ANTHROPIC_KEY: 'sk-ant-test' },
    routes: ai({ answers: [[/You plan appointments/, planner]] }),
    files: (h) => ({
      [h.path('patients.json')]: JSON.stringify([
        { id: 'p-martin', name: 'Martin Schreier', age: 41, phone: '+370 600 11111', since: h.now - 300 * 864e5, notes: [],
          appts: [{ id: 'a-m1', at: MON16, doctor: 'd-petr', spec: 'endo', reason: 'Root canal', callId: 'c-m1', status: 'booked', by: 'Agnė Petrauskaitė', made: h.now - 864e5 }] },
        { id: 'p-ona', name: 'Ona Kazlauskaitė', age: 34, phone: '+370 600 22222', since: h.now - 200 * 864e5, notes: [],
          appts: [{ id: 'a-o1', at: Z('2026-11-10T09:00:00Z'), doctor: 'd-jank', spec: 'surgery', reason: 'Wisdom tooth out, lower left', status: 'done' }] },
      ]),
      [h.path('calls.json')]: JSON.stringify([
        call({ id: 'c-m1', at: h.now - 864e5, patientId: 'p-martin', status: 'booked', booking: { doctor: 'd-petr', at: MON16, by: 'Agnė Petrauskaitė', made: h.now - 864e5 },
          fields: { name: 'Martin Schreier', age: 41 }, summary: sum({ reason: 'Severe pain in 3.6', triage: 'urgent', priority: 4, specialty: 'endo', doctor: 'd-petr' }) }),
        call({ id: 'c-m2', patientId: 'p-martin', status: 'waiting', fields: { name: 'Martin Schreier', age: 41, complaint: 'Cleaning', preferred: 'after 3 pm' },
          summary: sum({ reason: 'A cleaning too', triage: 'soon', specialty: 'endo', doctor: 'd-petr' }) }),
        call({ id: 'c-m3', at: Z('2026-11-12T07:10:00Z'), patientId: 'p-martin', status: 'waiting', intent: 'change_visit', fields: { name: 'Martin Schreier', age: 41, preferred: 'Friday' },
          summary: sum({ reason: 'Move Monday’s visit', triage: 'soon', specialty: 'endo', doctor: 'd-petr' }) }),
        call({ id: 'c-o1', patientId: 'p-ona', status: 'waiting', fields: { name: 'Ona Kazlauskaitė', age: 34, complaint: 'The other wisdom tooth' },
          summary: sum({ reason: 'Second wisdom tooth', triage: 'routine', priority: 2, specialty: 'surgery', doctor: 'd-jank' }) }),
      ]),
    }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  const sheet = () => app.text('#casesheet');

  t.step('A. One card per patient');
  await app.until(() => app.$('.qgroup'), 3000, 'a grouped card');
  const g = app.$('.qgroup');
  t.check(g.querySelectorAll('.qrow').length === 2 && /Martin Schreier/.test(g.textContent), 'Martin’s two waiting calls share one card');
  t.check(/2 calls/.test(g.textContent) && /1 visit booked/.test(g.textContent) && /Mon 16 Nov 14:00|16 Nov.*14:00|14:00/.test(g.textContent), 'it says so, and shows the visit already booked');
  t.check(app.$$('.queue > .qcard').length === 1 && app.$('[data-act="opencase"][data-id="c-o1"]'), 'Ona has a card of her own');

  t.step('B. No second visit the same day; a time the caller asked for');
  app.tap('.qrow[data-id="c-m2"]');
  await app.until(() => app.$('#casesheet.open'), 2000, 'the case');
  const mon = app.$(`.day[data-v="${MON16_DAY}"]`);
  t.check(mon && mon.disabled && /not allowed/.test(mon.textContent), 'Monday 16 is not offered: Martin is already there at 14:00');
  t.check(/Already booked: .*14:00 with Dr\. Petraitis/.test(sheet()), 'the box says what’s already booked');
  t.check(/Suggested/.test(sheet()) && /matches “after 3 pm”/.test(sheet()), 'a suggested time matching “after 3 pm”');
  const on = app.$('.slot.on');
  t.check(on && parseInt(on.textContent, 10) >= 15 && /pref/.test(on.className), 'and it’s already selected: ' + (on && on.textContent));
  await app.until(() => app.$('.sug.ai'), 4000, 'the AI plan');
  t.check(plans[0] && plans[0].patient_visits.some((v) => /Root canal/.test(v.reason)) && plans[0].candidates.every((c) => !/Mon, 16 Nov/.test(c.when)), 'the AI sees his visit, and is never offered Monday 16');
  app.tap('[data-act="caseclosesheet"]');

  t.step('C. A change of booking moves the visit');
  app.tap('.qrow[data-id="c-m3"]');
  await app.until(() => app.$('#bkmove'), 2000, 'the visit to move');
  t.check(app.$('#bkmove').value === 'a-m1', 'Monday’s visit is the one to move');
  t.check(/matches “Friday”/.test(sheet()) && /^Move to (Fri|Tomorrow)/.test(app.text('[data-act="book"]')), 'the suggestion is a Friday, and the button says Move');
  app.tap('[data-act="book"]');
  await app.until(() => ((app.json(app.path('patients.json')) || []).find((p) => p.id === 'p-martin') || { appts: [] }).appts.length === 2, 3000, 'the move');
  const m = (app.json(app.path('patients.json')) || []).find((p) => p.id === 'p-martin'), old = m.appts.find((a) => a.id === 'a-m1'), now = m.appts.find((a) => a.id !== 'a-m1');
  t.check(old.status === 'moved' && now.status === 'booked' && now.movedFrom === 'a-m1' && new Date(now.at).getUTCDay() === 5, 'the old visit is marked moved, the new one is on a Friday');
  const calls = app.json(app.path('calls.json')) || [];
  t.check((calls.find((c) => c.id === 'c-m1') || {}).booking.movedTo === now.at && (calls.find((c) => c.id === 'c-m3') || {}).booking.movedFrom === MON16, 'both calls say where the visit went');
  app.tap('[data-act="caseclosesheet"]');

  t.step('D. Time to heal after surgery');
  app.tap('[data-act="opencase"][data-id="c-o1"]');
  await app.until(() => app.$('#casesheet.open .day'), 2000, 'the surgeon’s days');
  const days = app.$$('.day');
  t.check(/not allowed/.test(days[0].textContent) && days[0].disabled, 'the surgeon’s next days are not offered');
  t.check(/Within 14 days of the surgery on Tue 10 Nov/.test(sheet()) || app.$$('.day').filter((d) => /not allowed/.test(d.textContent)).length >= 3, 'within 14 days of the last surgery');
  const day = app.$('.day.on');
  t.check(day && +day.dataset.v >= NOV24_DAY, 'the suggestion is after the healing time');
  await app.until(() => /Check the first extraction has healed/.test(sheet()), 4000, 'the AI’s warning');
  t.check(/AI plan/.test(sheet()), 'the AI plan shows, with its warning');
  app.tap('[data-act="caseclosesheet"]');

  t.step('E. The clinic calendar');
  app.tap('[data-act="tab"][data-v="cal"]');
  await app.until(() => app.$('.heatgrid'), 2000, 'the week');
  t.check(app.$$('.heatgrid tr').length === 7 && /%/.test(app.text('.calsum')), 'the week: five dentists and the clinic, with the week’s share taken');
  app.tap('.hcell[data-act="calday"]');
  await app.until(() => app.$('.cdoc'), 2000, 'the day');
  t.check(app.$$('.cdoc').length === 5 && app.$$('.strip i').length > 20, 'the day: each dentist’s times, taken or free');
  app.tap('[data-act="calview"][data-v="month"]');
  t.check(app.$$('.mcell').length >= 28, 'the month');
  app.tap('[data-act="calview"][data-v="trends"]');
  t.check(app.$$('.tile').length === 4 && app.$$('.bars').length === 4 && app.$$('.insights li').length >= 2, 'trends: four figures, four charts and the observations');
});
