// 28 How the receptionist talks: the phone agent's instructions (copied into ElevenLabs) and the in-app call's carry
// the same rules: quick, the caller's name at most twice, each question once, short or unclear answers count ("ne",
// a stuttered "n-no"), one "no" answers a two-part question, and only the business's topics. Calls had looped on
// "are you taking any medicines?", said the name in every reply, and could drift.
const { scenario, ai } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('talk rules', async (t) => {
  let system = '';
  const reva = (sys) => { system = sys; return { say: 'Labas, kuo galiu padėti?', fields: {}, mood: { label: 'calm', score: 0 }, done: false }; };
  const app = await t.open({ settings: { aiInvite: { off: true }, handsFree: false, bridgeUrl: 'https://b.test' }, kc: { FRONTLY_BRIDGE_TOKEN: 'x', FRONTLY_ANTHROPIC_KEY: 'sk-ant-test' },
    routes: [{ name: 'bridge', match: (u) => u.startsWith('https://b.test'), respond: () => ({ json: { calls: [], ok: true } }) }, ...ai({ answers: [[/virtual receptionist/, reva]] })] });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  const rules = (p) => [
    [/Use the caller's name at most twice in the whole call/, 'the name at most twice'],
    [/Don't open every reply with the same word \("Supratau"/, 'no “Supratau” every time'],
    [/Ask each question only once and remember the answers\. Never ask again about something already answered/, 'each question once'],
    [/"no", "ne", "nėra", "nothing", "none", a hesitant or stuttered "n-no" all mean no/, 'short or unclear answers count'],
    [/A question with two parts \(medicines and allergies, say\) is answered by one "no" for both/, 'one “no” for a two-part question'],
    [/If the caller asks about anything else .* say in one sentence that you can only help/, 'off-topic: one sentence, then back'],
    [/Never give medical, legal or other advice, never diagnose and never quote prices/, 'no advice, diagnoses or prices'],
  ].filter(([re]) => !re.test(p)).map(([, l]) => l);

  t.step('A. The phone agent’s instructions');
  app.tap('[data-act="cfgopen"]');
  await app.until(() => app.$('[data-act="line-prompt"]'), 2000, 'Settings › Phone line');
  app.tap('[data-act="line-prompt"]'); await app.wait(150);
  const dental = app.shared.pasteboard;
  t.check(rules(dental).length === 0, 'all the talk rules' + (rules(dental).length ? ': missing ' + rules(dental).join(', ') : ''));
  t.check(/Talk only about their teeth and mouth as they matter for a visit, the clinic's treatments and procedures, their medicines and allergies when they matter for a treatment, and their visits at Northlight Dental/.test(dental), 'the dental clinic’s topics');
  t.check(!/Keep every reply short: one or two spoken sentences, one question at a time\./.test(dental), 'the old one-line rule is replaced');

  t.step('B. Another kind of business, its own topics');
  app.type('#bizsel', 'car');
  await app.until(() => (app.json(app.path('settings.json')) || {}).business === 'car', 2000, 'saved');
  app.tap('[data-act="line-prompt"]'); await app.wait(150);
  t.check(/Talk only about their car and what it needs, the service's repairs and checks, and their appointments/.test(app.shared.pasteboard) && rules(app.shared.pasteboard).length === 0, 'a car service: cars, repairs and appointments, same rules');
  app.type('#bizsel', 'dental');
  await app.until(() => (app.json(app.path('settings.json')) || {}).business === 'dental', 2000, 'back');
  app.tap('[data-act="cfgclose"]');

  t.step('C. The in-app call');
  app.tap('[data-act="tab"][data-v="call"]');
  app.tap('.from-r[data-v="new"]'); app.type('#newnum', '+370 622 99999');
  app.tap('[data-act="callgo"]');
  await app.until(() => /Your turn/.test(app.text('.c-phase')), 5000, 'the greeting');
  app.tap('[data-act="ctype"]'); app.type('#ctext', 'Labas'); app.tap('[data-act="ctsend"]');
  await app.until(() => system, 4000, 'the AI’s instructions');
  t.check(rules(system).length === 0 && /Talk only about their teeth and mouth/.test(system), 'the same rules and topics');
});
