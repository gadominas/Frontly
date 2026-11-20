// 07 Listening without a sheet to close: with no OpenAI key, the page's own speech recognition listens, shows the
// words as they come, and sends the answer after a pause, with no button; the iPhone's dictation sheet (which waited
// for Done after every answer) is never used. A language this iPhone can't recognise (Lithuanian, say) is
// remembered and the caller types instead.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

// Speech recognition that hears `words` (one word every 150 ms), or fails with `fail`
function fakeSR(w, words, fail) {
  w.__srMade = 0;
  w.webkitSpeechRecognition = class {
    constructor() { w.__srMade++; w.__sr = this; this.stopped = false; }
    start() {
      w.__srLang = this.lang;
      if (fail) { setTimeout(() => { this.onerror && this.onerror({ error: fail }); this.onend && this.onend(); }, 50); return; }
      const said = words.split(' ');
      said.forEach((_, i) => setTimeout(() => { if (this.stopped) return; w.__heardLive = w.document.querySelector('.c-heard') && w.document.querySelector('.c-heard').textContent;
        this.onresult && this.onresult({ results: [[{ transcript: said.slice(0, i + 1).join(' ') }]] }); }, 150 * (i + 1)));
    }
    stop() { if (this.stopped) return; this.stopped = true; setTimeout(() => this.onend && this.onend(), 20); }
    abort() { this.stopped = true; }
  };
}

scenario('listening without a sheet', async (t) => {
  const asked = [];
  const env = { Dictation: { start: async (loc) => { asked.push(loc); return 'from the sheet'; } } };

  t.step('A. English: the iPhone listens in the page and stops by itself');
  let app = await t.open({ settings: { aiInvite: { off: true }, handsFree: true, lang: 'en', speechEngine: 'device', cfg: { silenceStop: 0.4 } }, env, page: (w) => fakeSR(w, 'I would like a check-up please') });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  app.tap('.from-r[data-v="new"]'); app.type('#newnum', '+370 622 99999');
  app.tap('[data-act="callgo"]');
  await app.until(() => app.$$('#callsheet .bub.caller').length === 1, 9000, 'the answer, with no tap');
  t.check(app.text('#callsheet .bub.caller') === 'I would like a check-up please' && app.win().__srLang === 'en-US', 'heard in English and sent after the pause');
  t.check(/I would like a/.test(app.win().__heardLive || ''), 'the words showed while being said');
  t.check(asked.length === 0, 'the dictation sheet never opened');
  app.tap('[data-act="hangup"]');
  await app.until(() => app.$('.c-saved'), 5000, 'the call ends');
  await t.close(app);

  t.step('B. A language this iPhone can’t recognise');
  app = await t.open({ settings: { aiInvite: { off: true }, handsFree: true, lang: 'lt', speechEngine: 'device' }, env, page: (w) => fakeSR(w, '', 'language-not-supported') });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  app.tap('.from-r[data-v="new"]'); app.type('#newnum', '+370 695 89867');
  app.tap('[data-act="callgo"]');
  await app.until(() => app.$('#ctext'), 6000, 'the answer field opens by itself');
  t.check(app.win().__srLang === 'lt-LT' && /can't recognise Lithuanian speech, so type your answer/.test(app.text('#toast')) && /OpenAI key/.test(app.text('#toast')), 'tried in Lithuanian; a toast says to type, and what an OpenAI key adds');
  await app.until(() => ((app.json(app.path('settings.json')) || {}).noDevice || {}).lt === true, 3000, 'remembered');
  app.type('#ctext', 'Ona'); app.tap('[data-act="ctsend"]');
  await app.until(() => app.$$('#callsheet .bub.reva').length >= 2, 5000, 'the next question');
  await app.wait(400);
  t.check(app.win().__srMade === 1 && asked.length === 0, 'not tried again; typing straight away, and never the sheet');
  app.tap('[data-act="hangup"]');
  await app.until(() => app.$('.c-saved'), 5000, 'the call ends');
  await t.close(app);
});
