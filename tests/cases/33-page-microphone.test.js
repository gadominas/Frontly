// 33 The page's microphone: Frontly's page is loaded at a secure address (https://localhost/) or iOS gives it no
// microphone at all (1.17.0 loaded it without one, so nothing could listen). If the page still has no microphone,
// iPhone dictation is the last resort, and the toast and Settings say why.
const fs = require('fs'), path = require('path');
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

scenario('the page microphone', async (t) => {
  t.step('A. The page is loaded at a secure address');
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'Frontly.js'), 'utf8');
  const loads = src.match(/wv\.loadHTML\([^\n]*\)/g) || [];
  t.see('loads', loads.map((l) => l.slice(-40)).join(' | '));
  t.check(/const PAGE_BASE = "https:\/\/localhost\/";/.test(src) && loads.length >= 2 && loads.every((l) => /PAGE_BASE\)/.test(l)), 'every page load passes the https address (the test kit always used one, so only this can catch it)');
  t.check(/if \(u\.startsWith\(PAGE_BASE\)\) return true;[^\n]*\n\s*if \(\/\^https\?:\/i\.test\(u\)\) \{ Safari\.openInApp/.test(src), 'and the page’s own address is let through before other https links go to Safari');

  t.step('B. No microphone in the page: dictation as the last resort, and why');
  const asked = [];
  const env = { Dictation: { start: async (loc) => { asked.push(loc); return 'I would like a check-up'; } } };
  const app = await t.open({ settings: { aiInvite: { off: true }, handsFree: true, lang: 'en', speechEngine: 'device' }, kc: { FRONTLY_OPENAI_KEY: 'sk-test' }, env,
    page: (w) => { delete w.navigator.mediaDevices; Object.defineProperty(w.navigator, 'mediaDevices', { value: undefined, configurable: true }); } });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  app.tap('.from-r[data-v="new"]'); app.type('#newnum', '+370 622 99999');
  app.tap('[data-act="callgo"]');
  await app.until(() => app.$$('#callsheet .bub.caller').length === 1, 9000, 'the answer');
  t.check(asked.join() === 'en-US' && app.text('#callsheet .bub.caller') === 'I would like a check-up', 'iPhone dictation took the answer');
  t.check(/can't use the microphone \(iOS gives this page no microphone\), so iPhone dictation opens: tap Done/.test(app.text('#toast')), 'the toast says why, and that it needs Done');
  app.tap('[data-act="hangup"]');
  await app.until(() => app.$('.c-saved'), 5000, 'the call ends');
  app.tap('[data-act="cfgopen"]');
  await app.until(() => /How Reva hears you/.test(app.text('#cfgsheet')), 2000, 'Settings');
  t.check(/Now: iPhone dictation, which needs Done after each answer: Frontly's page can't use the microphone \(iOS gives this page no microphone\)/.test(app.text('#cfgsheet')), 'Settings names what’s missing');
});
