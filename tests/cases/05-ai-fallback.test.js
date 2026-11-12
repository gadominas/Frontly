// 05 AI fails mid-call: Reva carries on with her script, and the note is written without AI
const { scenario, ai } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('AI fails mid-call: the script carries on', async (t) => {
  const app = await t.open({ settings: { aiInvite: { off: true }, handsFree: false }, kc: { FRONTLY_ANTHROPIC_KEY: 'sk-ant-test' }, routes: ai({ fail: true }) });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  app.tap('.from-r[data-v="new"]'); app.type('#newnum', '+370 633 12345');
  app.tap('[data-act="callgo"]');
  await app.until(() => /Your turn/.test(app.text('.c-phase')), 5000, 'the greeting');
  app.tap('[data-act="ctype"]');
  app.type('#ctext', 'Rasa Vilkė'); app.tap('[data-act="ctsend"]');
  await app.until(() => app.$$('#callsheet .bub.reva').length === 2, 5000, 'a reply anyway');
  t.check(/how old are you/.test(app.$$('#callsheet .bub.reva')[1].textContent), 'Reva asks the next scripted question');
  t.check(/carries on with her script/.test(app.text('#toast')), 'a toast says AI didn’t answer');
  app.tap('[data-act="hangup"]');
  await app.until(() => app.$('.c-saved'), 5000, 'the note without AI');
  t.check(/no AI/.test(app.text('.c-saved')), 'the note falls back to no AI');
  await t.close(app);
});
