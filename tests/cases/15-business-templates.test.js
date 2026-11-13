// 15 Any kind of business: a car service asks about the car, never age or pain, and routes to the right service;
// the words are its own everywhere (and can be renamed); services can be added and removed; Reva's phone
// instructions follow; the dental clinic's stay exactly as they were.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('business templates', async (t) => {
  const app = await t.open({ settings: { aiInvite: { off: true }, handsFree: false, bridgeUrl: 'https://b.test' }, kc: { FRONTLY_BRIDGE_TOKEN: 'x' },
    routes: [{ name: 'bridge', match: (u) => u.startsWith('https://b.test'), respond: () => ({ json: { calls: [], ok: true } }) }] });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  const st = () => app.json(app.path('settings.json')) || {};
  const copyPrompt = async () => { app.tap('[data-act="line-prompt"]'); await app.wait(150); return app.shared.pasteboard; };

  t.step('A. A dental clinic, as before');
  app.tap('[data-act="cfgopen"]');
  await app.until(() => app.$('#bizsel'), 2000, 'Settings › Business');
  t.check(app.$('#bizsel').value === 'dental' && /Dentists/.test(app.text('#cfgsheet')) && /Days between two surgeries/.test(app.text('#cfgsheet')), 'Dental clinic, with Dentists and the surgery gap');
  const dental = await copyPrompt();
  t.check(/a dental clinic in Vilnius, Lithuania/.test(dental) && /Known patient: \{\{patient_known\}\}\. Name: \{\{patient_name\}\}\. Age: \{\{patient_age\}\}\./.test(dental) && /Don't collect symptoms\./.test(dental) && /call 112 or go to the emergency room now, then end the call\./.test(dental), 'Reva’s dental instructions are unchanged');

  t.step('B. Switch to a car service');
  app.type('#bizsel', 'car');
  await app.until(() => st().business === 'car', 2000, 'saved');
  await app.until(() => /Mechanics/.test(app.text('#cfgsheet')), 2000, 'the words');
  t.check(!/Days between two surgeries/.test(app.text('#cfgsheet')), 'no surgery gap for cars');
  t.check(/Brakes/.test(app.text('.svc')) && /Tyres and wheels/.test(app.text('.svc')) && !/Oral surgery/.test(app.text('.svc')), 'the car services');
  t.check((st().doctors || []).every((d) => d.spec.every((k) => ['general', 'service', 'diag', 'brakes', 'tyres', 'electric', 'body'].includes(k))), 'the staff are moved to services that exist');
  const car = await copyPrompt();
  t.see('car prompt', car.slice(0, 260));
  t.check(/a car service in Vilnius/.test(car) && /Known customer: \{\{patient_known\}\}/.test(car) && !/Age: \{\{patient_age\}\}/.test(car) && /which mechanic/.test(car) && /the car \(make, model and year\)/.test(car) && /move away from the car/.test(car), 'Reva’s phone instructions are about cars, customers and mechanics, with the same bridge variables');
  app.tap('[data-act="cfgclose"]');
  t.check(/Customers/.test(app.text('.tabs')), 'the tab says Customers');

  t.step('C. A scripted call asks about the car');
  app.tap('[data-act="tab"][data-v="call"]');
  app.tap('.from-r[data-v="new"]'); app.type('#newnum', '+370 611 22222'); app.tap('[data-act="callgo"]');
  await app.until(() => /Your turn/.test(app.text('.c-phase')), 4000, 'the greeting');
  app.tap('[data-act="ctype"]');
  const answers = ['Mantas Rimkus', 'The brakes squeal and the pedal feels soft', 'A 2015 Volkswagen Golf', '4', 'Tomorrow morning', 'No'];
  for (let i = 0; i < answers.length; i++) {
    await app.until(() => app.$('#ctext') && /Your turn/.test(app.text('.c-phase')), 4000, 'turn ' + (i + 1));
    app.type('#ctext', answers[i]); app.tap('[data-act="ctsend"]');
    await app.until(() => app.$$('#callsheet .bub.reva').length === i + 2, 4000, 'reply ' + (i + 1));
  }
  const said = app.$$('#callsheet .bub.reva').map((x) => x.textContent);
  t.see('Reva', said.join(' | '));
  t.check(/What's wrong with the car/.test(said[1]) && /Which car is it/.test(said[2]) && /can't be driven/.test(said[3]) && /bring the car in/.test(said[4]) && /mechanic should know/.test(said[5]), 'the car questions, in order');
  t.check(!said.some((x) => /how old|pain/i.test(x)), 'never age or pain');
  await app.until(() => app.$('.c-saved'), 5000, 'the note');
  const c = (app.json(app.path('calls.json')) || []).find((x) => x.phone === '+370 611 22222') || {};
  t.check(c.fields && c.fields.location === 'A 2015 Volkswagen Golf' && c.fields.age == null && c.summary.specialty === 'brakes' && c.summary.triage === 'urgent', 'the car is kept, brakes are routed to Brakes and are urgent');
  app.tap('[data-act="callclose"]');

  t.step('D. Your own words and services');
  app.tap('[data-act="cfgopen"]');
  await app.until(() => app.$('.wordin[data-k="staff"]'), 2000, 'the words');
  app.type('.wordin[data-k="staff"]', 'technician'); app.type('.wordin[data-k="staffs"]', 'technicians');
  app.type('.wordin[data-k="client"]', 'driver'); app.type('.wordin[data-k="clients"]', 'drivers');
  await app.until(() => /Technicians/.test(app.text('#cfgsheet')), 2000, 'renamed');
  app.type('#svcnew', 'Window tinting'); app.tap('[data-act="svcadd"]');
  await app.until(() => /Window tinting/.test(app.text('.svc')), 2000, 'added');
  app.tap('[data-act="svcdel"][data-v="body"]');
  await app.until(() => !/Bodywork/.test(app.text('.svc')), 2000, 'removed');
  t.check(st().words.staff === 'technician' && st().services.some((x) => x.l === 'Window tinting') && !st().services.some((x) => x.k === 'body'), 'kept in settings');
  t.check(/Known driver/.test(await copyPrompt()) && /which technician/.test(app.shared.pasteboard), 'Reva’s instructions use them');
  app.tap('[data-act="cfgclose"]');
  t.check(/Drivers/.test(app.text('.tabs')), 'and the app does');

  t.step('E. Back to the dental clinic');
  app.tap('[data-act="cfgopen"]');
  app.type('#bizsel', 'dental');
  await app.until(() => st().business === 'dental' && !st().words, 2000, 'saved');
  t.check((await copyPrompt()) === dental, 'the dental instructions are word for word what they were');
});
