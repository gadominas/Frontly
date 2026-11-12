# Testing Frontly

Frontly follows the [testing recipe](https://github.com/gadominas/app-blueprints/blob/testing-v1.2.2/recipes/testing.md): the shared testkit runs the **real `Frontly.js`** in Node with Scriptable's APIs replaced by stand-ins, drives the page like a person, and checks every blueprint the app follows. It runs on every push (`.github/workflows/tests.yml`).

## Run the tests

With [app-blueprints](https://github.com/gadominas/app-blueprints) cloned next to this repository:

```sh
(cd ../app-blueprints/testkit && npm ci)
node ../app-blueprints/testkit/bin/run.js          # lint, the packs, tests/cases: all must pass before a release
node ../app-blueprints/testkit/bin/run.js -v 04    # one scenario, every step
```

`tests/app.config.js` holds Frontly's per-app values: two patients and one waiting call as a returning user's data. Claude and OpenAI are faked per scenario with the testkit's `ai()`.

## Scenarios

| Scenario | What it checks |
| --- | --- |
| 01-scripted-call | Without a key: a new caller rings, Reva's script asks every question, typed answers are understood (words and digits), the note says no AI, pain with cold goes to the endodontist, a new patient record is linked |
| 02-known-caller | A known number finds the patient: Reva asks for Jonas by name, takes name and age from the record, files the call under him |
| 03-front-desk | A wrong PIN is refused, the demo PIN signs in, the waiting call opens with the suggested dentist, booking writes the appointment to the patient's record, the confirmation text is copied, cancelling takes two taps and puts the call back in the queue |
| 04-ai-call | With Claude: replies come from AI, the mood shows live with ✦ AI, the AI note is labelled and triaged, every request has `max_tokens`, tokens are counted per feature |
| 05-ai-fallback | Claude fails mid-call: Reva carries on with her script, a toast says so, the note falls back to no AI |
| 06-ai-voice | With OpenAI: the greeting goes to OpenAI speech with Reva's instructions and the iPhone voice stays quiet; Settings shows the AI voice, model, instructions and OpenAI transcription; a silent call is closed, not queued |

## What the tests don't cover

Real voices, iPhone dictation and the microphone, the Ring/Silent switch, how iOS draws the page and the widget, and real AI answers. Run the blueprints' phone checklists for those, in light and dark mode.
