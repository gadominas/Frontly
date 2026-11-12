// 08 Lithuanian with an OpenAI key: dictation can't, so the page records, stops by itself when the caller pauses,
// and OpenAI transcribes. No tap between answers.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

// A microphone that hears speech for half a second, then silence
function fakeMic(w) {
  w.navigator.mediaDevices = { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) };
  w.MediaRecorder = class {
    constructor() { this.state = 'inactive'; this.mimeType = 'audio/mp4'; }
    start() { this.state = 'recording'; w.__recStarted = (w.__recStarted || 0) + 1; }
    stop() { this.state = 'inactive'; if (this.ondataavailable) this.ondataavailable({ data: new w.Blob([new Uint8Array(6000)], { type: 'audio/mp4' }) }); setTimeout(() => this.onstop && this.onstop(), 0); }
  };
  w.AudioContext = class {
    createMediaStreamSource() { return { connect() {} }; }
    createAnalyser() { const t0 = Date.now(); return { fftSize: 1024, getByteTimeDomainData(b) { const loud = Date.now() - t0 > 350 && Date.now() - t0 < 900; for (let i = 0; i < b.length; i++) b[i] = loud ? (i % 2 ? 200 : 56) : 128; } }; }
    close() {}
  };
}

scenario('hands-free OpenAI transcription', async (t) => {
  const asked = [];
  const env = { Dictation: { start: async (loc) => { asked.push(loc); throw new Error('Dictation is not supported for the locale ' + loc + '.'); } } };
  const heard = [];
  const routes = [{ name: 'openai transcription', match: 'https://api.openai.com/v1/audio/transcriptions', respond: (req) => { heard.push(req); return { json: { text: 'Ona Kazlauskaitė' } }; } }];
  const app = await t.open({ settings: { aiInvite: { off: true }, handsFree: true, lang: 'lt', speechEngine: 'device' }, kc: { FRONTLY_OPENAI_KEY: 'sk-test' }, env, routes, page: fakeMic });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  app.tap('.from-r[data-v="new"]'); app.type('#newnum', '+370 695 89867');
  app.tap('[data-act="callgo"]');

  await app.until(() => app.$$('#callsheet .bub.caller').length === 1, 9000, 'the first answer, with no tap');
  t.check(asked.length === 1, 'dictation was tried once, then OpenAI took over');
  t.check(/Ona Kazlauskaitė/.test(app.text('#callsheet .bub.caller')), 'the transcribed answer is the caller’s line');
  t.check(heard.length === 1, 'one recording went to OpenAI');
  await app.until(() => /metų/.test(app.text('#callsheet')), 4000, 'Reva asks the next question in Lithuanian');
  await app.until(() => app.win().__recStarted === 2, 6000, 'the microphone opens again by itself');
  t.check(true, 'the next answer is listened for without a tap');
  t.check(asked.length === 1, 'dictation isn’t tried again');
  app.tap('[data-act="hangup"]');
  await app.until(() => app.$('.c-saved'), 5000, 'the call ends');
  await t.close(app);
  const u = (app.json(app.path('usage.json')) || { p: {} }).p.openai || {};
  t.check(u.features && u.features.listening && u.features.listening.calls >= 1, 'transcription is counted under AI settings');
});
