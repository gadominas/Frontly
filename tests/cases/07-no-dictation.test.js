// 07 A language iPhone dictation doesn't have (Lithuanian): Frontly remembers it and asks the caller to type instead
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('Lithuanian without dictation', async (t) => {
  const asked = [];
  const env = { Dictation: { start: async (loc) => { asked.push(loc); throw new Error('Dictation is not supported for the locale ' + loc + '.'); } } };
  const app = await t.open({ settings: { aiInvite: { off: true }, handsFree: true, lang: 'lt' }, env });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');

  t.step('A. First call: dictation fails, the keyboard takes over');
  app.tap('.from-r[data-v="new"]'); app.type('#newnum', '+370 695 89867');
  app.tap('[data-act="callgo"]');
  await app.until(() => app.$('#ctext'), 5000, 'the answer field opens by itself');
  t.check(asked.join() === 'lt-LT', 'iPhone dictation was tried once, in Lithuanian');
  t.check(/no Lithuanian, so type your answer/.test(app.text('#toast')) && /OpenAI key/.test(app.text('#toast')), 'a toast says why, and what an OpenAI key adds');
  t.check(!/not supported for the locale/.test(app.text('#toast')), 'not the raw iOS error');
  app.type('#ctext', 'Ona Kazlauskaitė'); app.tap('[data-act="ctsend"]');
  await app.until(() => /metų/.test(app.text('#callsheet')), 4000, 'Reva goes on in Lithuanian');
  await app.until(() => /Your turn/.test(app.text('.c-phase')), 4000, 'her turn ends');
  t.check(asked.length === 1, 'dictation isn’t tried again in the same call');
  app.tap('[data-act="hangup"]');
  await app.until(() => app.$('.c-saved'), 4000, 'the call ends');
  app.tap('[data-act="callclose"]');

  t.step('B. It is remembered');
  await t.close(app);
  t.check(((app.json(app.path('settings.json')) || {}).noDictation || {}).lt === true, 'settings.json remembers Lithuanian has no dictation');
  const again = await t.reopen(app);
  await again.until(() => again.win() && again.win().__booted, 6000, 'the page');
  t.check(/Listening: typing/.test(again.text('#list')), 'the Call tab says answers are typed');
  again.tap('[data-act="cfgopen"]');
  await again.until(() => /iPhone dictation has no Lithuanian/.test(again.text('#cfgsheet')), 2000, 'Settings explains');
  t.check(true, 'Settings › Calls says why');
  await t.close(again);
});
