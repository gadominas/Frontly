// 04 A call with Claude: Reva's replies, live mood, the AI note, token usage per feature
const { scenario, ai } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

const reva = (system, user) => {
  const ctx = JSON.parse(user);
  if (ctx.turns <= 1) return { say: 'Thanks, Mantas. What seems to be the problem?', fields: { name: 'Mantas Rimkus' }, mood: { label: 'worried', score: -1 }, done: false };
  return { say: 'Thank you, the front desk will call you back shortly. Goodbye!', fields: { name: 'Mantas Rimkus', age: 38, complaint: 'Swollen gum and throbbing pain, lower right', location: 'Lower right', pain: 8, urgency: 5, preferred: 'Today' }, mood: { label: 'in pain', score: -2 }, done: true };
};
const note = { summary: 'New caller Mantas Rimkus, 38, has a swollen gum and throbbing pain on the lower right (8/10). Wants help today.',
  reason: 'Swollen gum, throbbing pain', triage: 'urgent', priority: 4, specialty: 'endo', doctor: 'd-petr', flags: ['Swelling'],
  hint: 'Today, first free slot with Dr. Petraitis', mood: { label: 'in pain', score: -2, note: 'Tense, speaks quickly' }, fields: {} };

scenario('AI call', async (t) => {
  const app = await t.open({ settings: { aiInvite: { off: true }, handsFree: false }, kc: { FRONTLY_ANTHROPIC_KEY: 'sk-ant-test' },
    routes: ai({ answers: [[/virtual receptionist/, reva], [/call notes/, note]] }) });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  t.check(/AI by Claude/.test(app.text('.engine')), 'the Call tab says Claude runs the call');

  app.tap('.from-r[data-v="new"]'); app.type('#newnum', '+370 622 99999');
  app.tap('[data-act="callgo"]');
  await app.until(() => /Your turn/.test(app.text('.c-phase')), 5000, 'the greeting');
  app.tap('[data-act="ctype"]');
  app.type('#ctext', 'Hi, this is Mantas Rimkus'); app.tap('[data-act="ctsend"]');
  await app.until(() => /worried/.test(app.text('.intake')), 4000, 'the mood shows');
  t.check(/✦ AI/.test(app.text('.intake')), 'the mood is labelled AI');
  await app.until(() => /Your turn/.test(app.text('.c-phase')), 4000, 'turn 2');
  app.type('#ctext', 'My gum is swollen and it throbs'); app.tap('[data-act="ctsend"]');
  await app.until(() => app.$('.c-saved .badge-ai'), 5000, 'the AI note');
  t.check(/AI note by Claude/.test(app.text('.c-saved')) && /Urgent/.test(app.text('.c-saved')), 'the note is labelled and triaged');

  const reqs = (app.log.ai || []).filter((x) => x.provider === 'anthropic');
  t.check(reqs.length === 3 && reqs.every((x) => x.body.max_tokens), 'two replies and one note, each with max_tokens');
  await t.close(app);
  const c = (app.json(app.path('calls.json')) || [])[0] || {};
  t.check(c.engine === 'ai' && c.summary.kind === 'ai' && c.summary.triage === 'urgent' && c.summary.doctor === 'd-petr', 'the AI note is saved');
  t.check(c.mood && c.mood.label === 'in pain', 'the caller’s mood is saved');
  t.check(c.fields.pain === 8 && c.fields.urgency === 5, 'details from AI are saved');
  const u = (app.json(app.path('usage.json')) || { p: {} }).p.anthropic || {};
  t.check(u.features && u.features.call && u.features.call.calls === 2 && u.features.summary.calls === 1, 'tokens are counted per feature');
});
