// 06 Reva's AI voice: with an OpenAI key each line goes to OpenAI speech with Reva's instructions; settings show the voice
const { scenario, ai } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('AI voice', async (t) => {
  const app = await t.open({ settings: { aiInvite: { off: true }, handsFree: false, aiProvider: 'openai', speechEngine: 'ai' }, kc: { FRONTLY_OPENAI_KEY: 'sk-test' }, routes: ai({ answers: [] }) });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  t.check(/Voice: AI voice/.test(app.text('#list')), 'the Call tab names the AI voice');
  app.tap('.from-r[data-v="+370 698 76543"]');
  app.tap('[data-act="callgo"]');
  await app.until(() => (app.log.ai || []).some((x) => x.speech), 5000, 'a speech request');
  const sp = app.log.ai.find((x) => x.speech).speech;
  t.check(/Am I speaking with Greta/.test(sp.input) && sp.voice === 'coral' && /receptionist/.test(sp.instructions || ''), 'the greeting is spoken by the AI voice, with Reva’s instructions');
  t.check(!app.log.spoken.length, 'the iPhone voice stays quiet');
  app.tap('[data-act="hangup"]');
  await app.until(() => app.$('.c-saved'), 4000, 'the call ends');
  t.check(/nothing for the front desk|ended/i.test(app.text('.c-saved')), 'a call with no answers leaves nothing to book');
  app.tap('[data-act="callclose"]');

  app.tap('[data-act="cfgopen"]');
  await app.until(() => app.$('#cfgsheet.open'), 2000, 'Settings');
  t.check(app.$('.ttsvoicesel') && app.$('.ttsmodelsel') && app.$('.ttsinstr'), 'Settings › Calls has the AI voice, model and how Reva sounds');
  t.check(/OpenAI transcription/.test(app.text('#cfgsheet')), 'and OpenAI transcription as a way to listen');
  await t.close(app);
  t.check(((app.json(app.path('calls.json')) || [])[0] || {}).status === 'closed', 'the silent call is closed, not queued');
});
