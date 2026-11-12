// 02 A known patient calls: recognised by phone number, no name or age asked, the call joins their record
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('known caller is recognised', async (t) => {
  const app = await t.open({ settings: { aiInvite: { off: true }, handsFree: false } });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  app.tap('.from-r[data-v="+370 612 34567"]');
  app.tap('[data-act="callgo"]');
  await app.until(() => app.$$('#callsheet .bub.reva').length === 1, 4000, 'Reva answers');
  t.check(/Am I speaking with Jonas\?/.test(app.text('#callsheet .bub.reva')), 'Reva asks for Jonas by name');
  t.check(/Patient record found/.test(app.text('.intake')), 'the record is found from the number');
  app.tap('[data-act="ctype"]');
  const say = async (x, n) => {
    await app.until(() => /Your turn/.test(app.text('.c-phase')), 4000, 'turn');
    app.type('#ctext', x); app.tap('[data-act="ctsend"]');
    await app.until(() => app.$$('#callsheet .bub.reva').length === n, 4000, 'reply ' + n);
  };
  await say('Yes, it is me', 2);
  t.check(/good to hear from you again/.test(app.$$('#callsheet .bub.reva')[1].textContent), 'a returning welcome, no name question');
  await app.until(() => /Jonas Petrauskas/.test(app.text('.intake')) && /52/.test(app.text('.intake')), 2000, 'name and age from the record');
  t.check(true, 'name and age come from the record');
  app.tap('[data-act="hangup"]');
  await app.until(() => app.$('.c-saved'), 4000, 'the note');
  await t.close(app);
  const c = (app.json(app.path('calls.json')) || [])[0] || {};
  t.check(c.patientId === 'p-jonas' && c.isNew === false, 'the call is filed under Jonas');
  t.check((app.json(app.path('patients.json')) || []).length === 2, 'no second record is made');
});
