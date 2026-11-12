// 01 A call without AI: Reva's script, typed answers, the note and a new patient record
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('scripted call, new caller', async (t) => {
  const app = await t.open({ settings: { aiInvite: { off: true }, handsFree: false } });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');

  t.step('A. The Call tab offers known patients and a new number');
  await app.until(() => app.$('[data-act="callgo"]'), 3000, 'the Call button');
  t.check(app.$$('.from-r').length === 3, 'two patients and a new caller to call from');
  t.check(/Script · no AI/.test(app.text('.engine')), 'without a key the script is labelled no AI');

  t.step('B. Ring the clinic from a new number');
  app.tap('.from-r[data-v="new"]');
  app.type('#newnum', '+370 611 00000');
  app.tap('[data-act="callgo"]');
  await app.until(() => app.$('#callsheet.open'), 2000, 'the call screen');
  await app.until(() => app.$$('#callsheet .bub.reva').length === 1, 4000, 'Reva greets');
  t.check(/May I have your full name/.test(app.text('#callsheet .bub.reva')), 'a new caller is asked for a name');
  await app.until(() => /Your turn/.test(app.text('.c-phase')), 4000, 'her line spoken');
  t.check(app.log.spoken.some((x) => /Northlight Dental/.test(x)), 'the iPhone voice spoke the greeting');

  t.step('C. Answer every question by typing');
  app.tap('[data-act="ctype"]');
  const answers = ['My name is Ona Kazlauskaitė', '34', 'My upper left tooth hurts when I drink something cold', 'Upper left, at the back', 'seven', '4', 'Tomorrow morning if possible', 'No, nothing else'];
  for (let i = 0; i < answers.length; i++) {
    await app.until(() => app.$('#ctext') && /Your turn/.test(app.text('.c-phase')), 4000, 'turn ' + (i + 1));
    app.type('#ctext', answers[i]);
    app.tap('[data-act="ctsend"]');
    await app.until(() => app.$$('#callsheet .bub.reva').length === i + 2, 4000, 'reply ' + (i + 1));
  }
  t.see('fields', app.text('.intake'));
  await app.until(() => app.$('.c-saved'), 5000, 'the call ends itself and the note is written');
  t.check(/Ready for the front desk/.test(app.text('.c-saved')), 'the call waits for the front desk');
  t.check(/no AI/.test(app.text('.c-saved')), 'the note says no AI');

  t.step('D. What is saved');
  await t.close(app);
  const calls = app.json(app.path('calls.json')) || [], pts = app.json(app.path('patients.json')) || [];
  const c = calls[0] || {}, f = c.fields || {};
  t.see('call', JSON.stringify({ fields: f, summary: c.summary }));
  t.check(f.name === 'Ona Kazlauskaitė' && f.age === 34 && f.pain === 7 && f.urgency === 4, 'name, age, pain and urgency are understood');
  t.check(/Tomorrow morning/.test(f.preferred || ''), 'the preferred time is kept');
  t.check(c.summary && c.summary.specialty === 'endo' && c.summary.doctor === 'd-petr', 'pain with cold goes to the endodontist');
  t.check(c.summary && c.summary.triage === 'soon', 'pain 7 and urgency 4 are triaged as soon');
  t.check(c.mood === null, 'no mood without AI');
  const p = pts.find((x) => x.name === 'Ona Kazlauskaitė');
  t.check(p && p.phone === '+370 611 00000' && c.patientId === p.id, 'a new patient record is linked to the call');
  t.check((c.transcript || []).length === 17, 'every line of the call is kept (greeting, 8 answers, 8 replies)');
});
