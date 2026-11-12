# Blueprints

Frontly follows the shared blueprints in https://github.com/gadominas/app-blueprints.
The script's `BLUEPRINTS` block is the source of truth; this table mirrors it and adds deviations.

| Blueprint | Version | Since app version | Deviations |
| --- | --- | --- | --- |
| [stability-patterns](https://github.com/gadominas/app-blueprints/blob/stability-patterns-v1.0.2/blueprints/stability-patterns.md) | 1.0.2 | 1.0.0 | none: storage, updates and the installer touch iCloud only when the script lives in iCloud Drive |
| [in-app-updates](https://github.com/gadominas/app-blueprints/blob/in-app-updates-v1.1.1/blueprints/in-app-updates.md) | 1.1.1 | 1.0.0 | Settings › Updates keeps **Check for updates now** (`checkForUpdate(true)`), as BlogPulse does; hidden in a native shell |
| [settings](https://github.com/gadominas/app-blueprints/blob/settings-v2.0.1/blueprints/settings.md) | 2.0.1 | 1.0.0 | The app's own sections are Calls (with the AI settings row, as the main feature's section), Front desk and Demo. Palette colours carry Frontly's teal; names, schemes and controls are the shared ones. There is no refresh button, so the settings icon stands alone in the header. Built with rows use the `.chev` chevron |
| [ai-configuration](https://github.com/gadominas/app-blueprints/blob/ai-configuration-v1.0.2/blueprints/ai-configuration.md) | 1.0.2 | 1.0.0 | One background job in **What AI does**: the note written when a call ends (`settings.ai`). Reva's conversation runs whenever a key exists, as a feature the user starts. An OpenAI key also serves Reva's AI voice (`aiSpeech`, feature `speech`) and transcription (`aiTranscribe`, feature `listening`, counted in characters) while Claude runs the conversation; both record usage with `recordUsage`. When AI fails mid-call, Reva carries on with her script (labelled no AI) |
| [launch-screen](https://github.com/gadominas/app-blueprints/blob/launch-screen-v1.0.2/blueprints/launch-screen.md) | 1.0.2 | 1.0.0 | No Detail part. The name uses the app's `--display` font |
| [widgets](https://github.com/gadominas/app-blueprints/blob/widgets-v1.1.1/blueprints/widgets.md) | 1.1.1 | 1.0.0 | The optional 1.1.0 parts (compact cells, pinned items, privacy mode, Shortcuts) aren't adopted. The widget shows names of invented demo patients; in a real deployment it would need privacy mode |
| [ai-invitation](https://github.com/gadominas/app-blueprints/blob/ai-invitation-v1.2.2/blueprints/ai-invitation.md) | 1.2.2 | 1.0.0 | `window.canInvite` holds the card back during a call |
| [audio-playback](https://github.com/gadominas/app-blueprints/blob/audio-playback-v1.0.2/blueprints/audio-playback.md) | 1.0.2 | 1.0.0 | Reva's iPhone voice uses `audioOn("speech")`, her AI voice `audioOn("media")`; `audioOff()` when the call ends. While OpenAI transcription records, `navigator.audioSession.type` is `play-and-record`, then back to `playback` |

Not followed: **read-aloud** (Frontly has no articles or text to read; Reva's AI voice reuses its OpenAI speech request, `aiSpeech`, without the player) and **usage-analytics** (opt-in for the owner, not asked for).

## Recipes

Coding rules every app follows (https://github.com/gadominas/app-blueprints/tree/main/recipes). They describe how the code is written, not a feature, so they aren't listed in the script's `BLUEPRINTS` block or in Built with.

| Recipe | Version | Since app version | Deviations |
| --- | --- | --- | --- |
| [safe-startup](https://github.com/gadominas/app-blueprints/blob/safe-startup-v1.1.0/recipes/safe-startup.md) | 1.1.0 | 1.0.0 | none. A first start keeps the demo data in memory and saves it once the screen is up |
| [portable-bridge](https://github.com/gadominas/app-blueprints/blob/portable-bridge-v1.0.0/recipes/portable-bridge.md) | 1.0.0 | 1.0.0 | none: the page's `flush()` hands bridge URLs to `window.__hostBridge` when it exists |
| [testing](https://github.com/gadominas/app-blueprints/blob/testing-v1.2.2/recipes/testing.md) | 1.2.2 | 1.0.0 | none: every pack runs; six scenarios in `tests/cases` |
