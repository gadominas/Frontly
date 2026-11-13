// 23 A booking sends ClinicCards a short comment in the call's language (it keeps 400 characters), most important
// first and nothing about the tools, with a shorter one if refused; Frontly keeps everything on the visit (Details). Cancelling asks first in a dialog, says what happens in ClinicCards, and keeps the reason and who.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('booking details and cancelling', async (t) => {
  const visits = []; let maxNote = 100000;
  const ok = (data) => ({ json: { result: 'success', data } });
  const routes = [{ name: 'cliniccards', match: (u) => u.startsWith('https://cliniccards.com/api/'), respond: (req) => {
    const u = new URL(req.url), path = u.pathname.replace('/api/', ''), q = Object.fromEntries(u.searchParams);
    if (path === 'schedule-shifts') { const out = []; for (let d = new Date(q.from + 'T00:00:00'); d <= new Date(q.to + 'T00:00:00'); d.setDate(d.getDate() + 1)) { const k = d.toISOString().slice(0, 10); if (d.getDay() > 0 && d.getDay() < 6) out.push({ doctor_id: 77, shift_start: k + ' 09:00:00', shift_end: k + ' 12:00:00', schedule_cabinets_id: 5 }); } return ok(out); }
    if (path === 'patients' && req.method === 'POST') return ok({ patient_id: 900 });
    if (path === 'visits' && req.method === 'POST') { const b = req.json(); if (b.note.length > maxNote) return { status: 400, json: { result: 'fail', error: 'Note is too long' } }; visits.push(b); return ok({ visit_id: 5000 + visits.length }); }
    return ok([]);
  } }];
  const T = Date.parse('2026-11-12T08:32:00Z');
  const transcript = [{ who: 'reva', t: 'Labas, skambinate į Northlight Dental.' }, { who: 'caller', t: 'Labas, čia Giedrius Minas. Labai skauda apatinį žandikaulį.' },
    { who: 'reva', t: 'Kaip stipriai, nuo 0 iki 10?' }, { who: 'caller', t: 'Gal 8, ir skauda visą naktį.' }];
  const call = (id, name, phone) => ({ id, at: T - 3600e3, dur: 154, phone, source: 'phone', provider: 'elevenlabs', status: 'waiting', transcript, mood: { label: 'in pain', score: -2, note: 'tense' },
    deskNotes: [{ at: T - 1800e3, by: 'Agnė Petrauskaitė', text: 'Prefers the morning' }],
    fields: { name, age: 44, complaint: 'Severe pain, lower jaw', location: 'Lower jaw, widespread', pain: 8, urgency: 4, preferred: 'Mornings', notes: 'Pain at night' },
    summary: { kind: 'ai', provider: 'openai', text: 'Giedrius Minas reports severe lower-jaw pain (8/10), worse at night. Prioritise an urgent assessment.', reason: 'Severe pain, lower jaw', triage: 'urgent', priority: 4, specialty: 'endo', doctor: 'd-fr', flags: ['Severe pain'], hint: '' } });
  const doctors = [{ id: 'd-fr', name: 'Francesco Doctor', short: 'Francesco Doctor', role: 'Doctor', spec: ['general', 'endo'], days: [1, 2, 3, 4, 5], from: 8, to: 18, ext: { cliniccards: '77' } }];
  const app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', demoGone: true, planner: 'cliniccards', doctors, plannerState: { cliniccards: { ok: true, at: T, lines: ['ok'], lists: {} } }, plannerCfg: { cliniccards: { room: '5' } } },
    kc: { FRONTLY_CLINICCARDS_KEY: 'cc-key' }, routes,
    files: (h) => ({ [h.path('patients.json')]: '[]', [h.path('calls.json')]: JSON.stringify([call('c-1', 'Giedrius Minas', '+370 611 11111'), call('c-2', 'Ona Kairienė', '+370 622 22222')]) }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  const pts = () => app.json(app.path('patients.json')) || [];
  const book = async (id) => {
    app.tap('[data-act="tab"][data-v="desk"]'); app.tap(`[data-act="opencase"][data-id="${id}"]`);
    await app.until(() => app.$('#casesheet .slot:not([disabled])'), 4000, 'times');
    if (!app.$('#casesheet .slot.on')) app.tap('#casesheet .slot:not([disabled])');
    app.tap('[data-act="book"]');
  };

  t.step('A. A short comment in the language of the call');
  await book('c-1');
  await app.until(() => visits.length === 1, 4000, 'the visit');
  const note = visits[0].note;
  t.see('note', note.replace(/\n/g, ' | '));
  t.check(note.length <= 400 && /^Priežastis: Severe pain, lower jaw\nDėmesio: Severe pain\nSkausmas: 8\/10\nVieta: Lower jaw, widespread\nSkubumas: 4\/5\nPageidaujamas laikas: Mornings\nTrukmė: \d+ min\./.test(note), 'Lithuanian labels, the most important first, within 400 characters');
  t.check(!/Frontly|elevenlabs|openai|Summary|phone call|Real/i.test(note), 'nothing about the tools or how the call came in');
  await app.until(() => pts().length === 1 && pts()[0].appts.length, 3000, 'Frontly’s copy');
  const a = pts()[0].appts[0];
  t.check(a.info && a.info.transcript.length === 4 && a.info.fields.pain === 8 && a.info.summary && a.info.engineNote === note && a.ext.note === 'full', 'Frontly keeps everything, and the comment as sent');
  app.tap('[data-act="caseclosesheet"]');

  t.step('B. A comment refused: a shorter one');
  maxNote = 170;   // the full comment (~260) is refused; the shorter one (at most 160) fits
  await book('c-2');
  await app.until(() => visits.length === 2, 4000, 'the second visit');
  const ona = pts().find((p) => p.name === 'Ona Kairienė');
  t.check(visits[1].note.length <= 160 && /^Priežastis:/.test(visits[1].note) && ona.appts[0].ext.note === 'short', 'refused once, then booked with a shorter comment');
  app.tap('[data-act="caseclosesheet"]');

  t.step('C. Details on the client’s page');
  app.tap('[data-act="tab"][data-v="patients"]');
  const gid = pts().find((p) => p.name === 'Giedrius Minas').id;
  await app.until(() => app.$(`[data-act="openpat"][data-id="${gid}"]`), 2000, 'the list');
  app.tap(`[data-act="openpat"][data-id="${gid}"]`);
  await app.until(() => app.$('#patsheet [data-act="apptinfo"]'), 2000, 'Details');
  app.tap('#patsheet [data-act="apptinfo"]');
  await app.until(() => app.$('.ainfo'), 2000, 'the details');
  t.check(/The comment in ClinicCards/.test(app.text('.ainfo')) && /Priežastis: Severe pain/.test(app.text('.sentnote')) && /Lower jaw, widespread/.test(app.text('.ainfo')) && /Read the conversation \(4\)/.test(app.text('.ainfo')), 'the comment as sent, the details, and the whole conversation here');
  app.tap('.ainfo [data-act="appttx"]');
  t.check(/Labai skauda apatinį žandikaulį/.test(app.text('.ainfo')), 'the conversation');

  t.step('D. Cancelling asks first');
  app.tap('#patsheet [data-act="apptcancel"]');
  await app.until(() => app.$('#dlg.open'), 2000, 'the dialog');
  const dl = app.text('#dlg');
  t.check(/Cancel this visit\?/.test(dl) && /Giedrius Minas/.test(dl) && /Francesco Doctor/.test(dl) && /Frontly marks it cancelled in ClinicCards too and checks that it took/.test(dl), 'who, when, with whom, and what happens in ClinicCards');
  app.tap('[data-act="dlgkeep"]');
  t.check(!app.$('#dlg.open') && pts().find((p) => p.id === gid).appts[0].status === 'booked', 'Keep it: nothing changes');
  app.tap('#patsheet [data-act="apptcancel"]');
  await app.until(() => app.$('#dlg-why'), 2000, 'the dialog again');
  app.type('#dlg-why', 'Feeling better'); app.tap('[data-act="dlgcancel"]');
  await app.until(() => pts().find((p) => p.id === gid).appts[0].status === 'cancelled', 2000, 'cancelled');
  const ca = pts().find((p) => p.id === gid).appts[0];
  t.check(ca.cancelled.reason === 'Feeling better' && ca.cancelled.by === 'Agnė Petrauskaitė' && !app.$('#dlg.open') && /It wasn't in ClinicCards any more/.test(app.text('#toast')), 'cancelled with the reason and who; the toast says the visit wasn’t in ClinicCards any more');
  await app.until(() => /Cancelled by Agnė Petrauskaitė/.test(app.text('#patsheet')), 2000, 'the history');
  t.check(/Feeling better/.test(app.text('#patsheet')), 'the visit history shows it');
});
