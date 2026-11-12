# Frontly's real phone line

Call a real number and Reva answers, the same receptionist as in the app. When you hang up, the call appears at Frontly's front desk, filed under the caller's record, ready to book.

```
caller ─▶ Twilio number ─▶ ElevenLabs agent "Reva" ──(call starts: who is it?)──▶ Frontly bridge ─▶ "Ar tai Jonas?"
                                                    ──(call ends: transcript)────▶ Frontly bridge ◀── Frontly app collects it
```

- **Twilio** gives you the phone number.
- **ElevenLabs Agents** answers it: listening, Reva's voice and the conversation.
- **The Frontly bridge** (`worker.js`) is a small Cloudflare Worker, free tier. It tells Reva who's calling and keeps finished calls until Frontly picks them up. Frontly can't do this itself: it runs on your iPhone and can't receive anything from the internet.

Everything below can be done in a browser, on the iPhone too. Allow about 40 minutes the first time.

## 1. A phone number (Twilio)

1. Sign up at [twilio.com](https://www.twilio.com) and add a little credit. The free trial plays a message before each call and only lets verified numbers call in, so it gets in the way of a demo.
2. **Phone Numbers › Buy a number**, country **Lithuania**, with **Voice**. A Lithuanian number needs an address in Lithuania (Twilio asks for it as a regulatory bundle; approval can take a day or two). A number from another country works the same way, but callers pay international rates.
3. Keep three things for step 3: the **number**, the **Account SID** and the **Auth token** (Twilio Console home).

## 2. The bridge (Cloudflare Workers, free tier)

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com).
2. **Storage & Databases › KV › Create**, name it `FRONTLY`.
3. **Compute › Workers & Pages › Create › Worker**, name it `frontly-bridge`, **Deploy**. Then **Edit code**, replace everything with [`worker.js`](worker.js), **Deploy**.
4. In the worker, **Settings › Bindings › Add › KV namespace**: variable name `FRONTLY`, the namespace from step 2.
5. **Settings › Variables and Secrets**, add:

| Name | Type | Value |
| --- | --- | --- |
| `APP_TOKEN` | Secret | In Frontly: **Settings › Phone line › Token › Make one**. It's copied for you; paste it here |
| `INIT_TOKEN` | Secret | Any long random text. You'll paste the same text into ElevenLabs in step 3 |
| `EL_WEBHOOK_SECRET` | Secret | Leave for now: ElevenLabs gives it to you in step 3 |
| `PHONE_NUMBER` | Text | The Twilio number, as callers should see it: `+370 5 …` |
| `LANGUAGE` | Text | `lt` (Reva opens in Lithuanian) or `en` |
| `CLINIC_NAME` | Text | `Northlight Dental`, or whatever Frontly's Settings › Clinic says |
| `ASSISTANT_NAME` | Text | `Reva`, or your receptionist's name in Frontly |

6. Open `https://frontly-bridge.<your-subdomain>.workers.dev/health`. It should show `"ok":true` and your number.

With the command line instead: `npx wrangler kv namespace create FRONTLY`, put its id in [`wrangler.toml`](wrangler.toml), `npx wrangler secret put APP_TOKEN` (and the other two), `npx wrangler deploy`.

## 3. Reva on ElevenLabs

1. Sign up at [elevenlabs.io](https://elevenlabs.io) › **Agents › New agent › Blank**, name it Reva.
2. **System prompt**: in Frontly, **Settings › Phone line › Reva's instructions › Copy**, and paste.
3. **First message**: `{{opening}}` (the bridge fills it in: "Ar tai Jonas?" for a known number, a name question for anyone else).
4. **Language**: Lithuanian, with English as an additional language and **language detection** on; check that the voice you pick speaks Lithuanian well.
5. **Dynamic variables**: give each a default, used when you test in the browser: `opening` = `Hello, this is Reva at Northlight Dental. May I have your name?`, `patient_known` = `no`, and `patient_name`, `patient_age`, `patient_history`, `caller_number` empty.
6. **Tools**: turn on **End call**.
7. **Analysis › Data collection**: add these ten, with exactly these identifiers (the bridge reads them by name):

| Identifier | Type | Description |
| --- | --- | --- |
| `name` | String | The caller's full name, as they said it |
| `age` | Integer | The patient's age in years |
| `complaint` | String | The reason for the call, in English, in a few words |
| `location` | String | Where it hurts: which tooth or side of the mouth |
| `pain` | Integer | Pain from 0 to 10, as the caller rated it |
| `urgency` | Integer | How urgent it feels from 1 to 5, as the caller rated it |
| `preferred` | String | The best time for a visit |
| `notes` | String | Anything else: swelling, fever, bleeding, medicines, allergies |
| `mood` | String | One word: calm, cheerful, worried, anxious, in pain, frustrated, upset or unsure |
| `language` | String | `lt` or `en`, the language of the call |

8. **Agents › Settings** (the workspace):
   - **Post-call webhook**: create one with URL `https://frontly-bridge.<…>.workers.dev/elevenlabs/webhook`, authentication **HMAC**. Copy the secret it shows into Cloudflare as `EL_WEBHOOK_SECRET`. Turn on retries.
   - **Conversation initiation webhook**: URL `https://frontly-bridge.<…>.workers.dev/elevenlabs/init`, with a header `X-Frontly-Token` whose value is your `INIT_TOKEN` (store it as an ElevenLabs secret).
9. In Reva's **Security** tab, turn on **fetching conversation initiation data** for inbound Twilio calls.
10. **Phone numbers › Import › From Twilio**: the number, Account SID and Auth token from step 1, then assign **Reva**.

## 4. Frontly

**Settings › Phone line**: paste the bridge address (`https://frontly-bridge.<…>.workers.dev`). The token is already there if you made it in Frontly; otherwise **Add** and paste `APP_TOKEN`. **Status** should say *callers dial +370 …*.

Now ring the number from any phone. A few seconds after you hang up (ElevenLabs analyses the call first), Frontly shows *New call from the phone line* while it's open, or when you next open it. The Call tab gets a **Call the real line** card, and the front desk a **📞 Check line** button.

## What it costs (November 2026, check the providers' pages)

- Twilio: the number's monthly rent plus per-minute charges for incoming calls.
- ElevenLabs Agents: a free plan with a few minutes of calls a month, then paid plans billed by the minute.
- Cloudflare Workers and KV: free tier, far more than a demo uses.
- Frontly's own note: one Claude or OpenAI request per call, if you have a key in Frontly; otherwise ElevenLabs' summary is used.

## Privacy

Calls go through Twilio and ElevenLabs, and the transcript and collected details through your bridge, which keeps them for 30 days or until replaced. Frontly sends the bridge a short patient list (name, age, phone number, last and next visit) so Reva can greet known callers; never notes, moods or call transcripts. The bridge refuses anything without the right token or a valid ElevenLabs signature, and refuses signatures older than 30 minutes. This is a demo: don't use it for real patients without the agreements and safeguards health data needs.

## When something doesn't work

| What you see | Check |
| --- | --- |
| Frontly: "The bridge refused the token" | Frontly's token and the worker's `APP_TOKEN` are the same text |
| Frontly: "The bridge didn't answer" | The address, with `https://` and no path; `/health` opens in the browser |
| Reva doesn't know a known caller | The initiation webhook and its `X-Frontly-Token` header; the agent's Security switch; Frontly has run once since the patient was added (it sends the list on every check) |
| Calls never reach Frontly | ElevenLabs › the webhook's delivery log: a `401` means `EL_WEBHOOK_SECRET` doesn't match |
| A call arrives without details | The data collection identifiers in step 3.7, spelled exactly |

Tests: `node bridge/test.mjs` (Node 22) checks the lookup, the signature, replays, retries and the mapping.
