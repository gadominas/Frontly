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
| 07-no-dictation | Lithuanian with dictation failing as on a real iPhone: the keyboard opens with a plain explanation, dictation isn't retried, and the choice is remembered in settings.json, the Call tab and Settings |
| 08-transcribe-hands-free | Lithuanian with an OpenAI key and a fake microphone: dictation fails once, the page records, stops on its own when the caller pauses, OpenAI transcribes, Reva answers and the microphone opens again with no tap |
| 09-patients-list | Patients grouped by status in order, a waiting call's reason and urgency on the card, a booked visit with the dentist, two records on one number flagged, the New filter, grouping by name, the grouping remembered |
| 10-phone-line | With a bridge: calls arrive on their own with the token, are filed under the patient by number, a new caller gets a record, the note falls back to ElevenLabs' summary, the patient brief goes back without notes, phone calls are marked, Call dials `tel:`, a second check brings nothing twice, the token never reaches the page |
| 11-returning-caller | Only booking work waits: a question about a booked visit is filed (from the agent's intent, or recognised from the call without it), a second call joins the waiting request and raises its priority, a change or a new problem waits; the front desk's message is marked passed on once; the brief tells Reva the booked visits, the waiting request and the message; the Other tab, the follow-up's link, and a new message sent to the bridge at once |
| 12-booking-rules | One card per patient with several calls; a second visit the same day is not offered and the booked one is shown; the suggested time matches “after 3 pm” and is preselected; the AI plan sees the patient's visits and is never offered a time the rules forbid; a change of booking moves the visit (old marked moved, both calls say where it went); 14 days to heal after surgery, with the AI's warning; the calendar's week, day, month and trends |
| 13-dentists | Settings › Dentists: each listed with days and hours; a new one needs a name, keeps what was typed across chip taps, and saves name, short name, role, work, days and hours; edit; remove refuses while visits are booked, hides one with only past visits (the history still names them), deletes one with nothing on record; the calendar's arrow buttons and Back to today |
| 14-no-demo-data | An install from before 1.4.0 loses its made-up patients and call (and practice calls with them) but keeps real phone calls, a made-up record a real call was filed under (minus its made-up visits), and the five dentists it booked with; a new install starts with no patients, calls or dentists, and Add a dentist opens the form |
| 15-business-templates | Dental clinic by default with its surgery gap and Reva's instructions unchanged; switching to a car service brings its services, moves staff to services that exist, drops the surgery gap and turns the phone instructions to cars, customers and mechanics with the same bridge variables; a scripted call asks the car questions in order, never age or pain, keeps the car and routes squealing brakes to Brakes as urgent; renamed words and an added and a removed service reach settings, the instructions and the tabs; back to dental gives the instructions word for word |
| 16-edit-client | Edit details: another record's number is refused and the form keeps what was typed; an impossible age is refused; name and age are saved, the page and the front desk show the new name, and the phone bridge gets it at once; removing is refused while a booking is ahead; removed, the client's calls stay without the record |
| 17-cliniccards | Settings › Planning lists Frontly (in use) and ClinicCards (not set up); its own window can't be used before a test; the test reports people, cabinets and step and leaves out admins; a staff member linked by hand, another by name on import, nobody twice; the cabinet saved; the limits said plainly; in use: tomorrow's times are the shift's every 30 min with the taken one disabled; booking creates the patient (full-digit number) and a BOOKING visit with doctor, cabinet, day, times and note, and Frontly keeps its copy with both ids; a ClinicCards error is shown and nothing is kept; cancelling reminds to cancel there too; the calendar shows time taken there; back on Frontly's diary |
| 18-import | Clients from pasted rows with Lithuanian headers, semicolons, a quoted note and a birth date: a preview (2 new, 1 already here by number, 2 skipped with reasons), nothing saved before Import, then names joined, age from the birth date, the note intact, the existing record untouched; staff from tab-separated rows: 2 new, one already here ("Dr." or not), an unknown service pointed out, services, days (also Pr-Pn) and hours read; ClinicCards patients page by page until nothing new, both linked by id; Cancel saves nothing |
| 19-register | The empty front desk offers Register someone; typed details survive tapping the urgency; another record's number is refused and nothing is saved; then the client and a front-desk request are saved (no call), with a note like a call's (throbbing pain → root canal, urgency 4 → soon), the case says where it came from and opens into booking with a time after 3 pm chosen, and books like a call; a client without a request opens their page; a new request for an existing client doesn't ask their details, needs a reason, keeps the chosen service; the card says Front desk |
| 20-background-typing | With the phone line and ClinicCards on: three quiet background line checks (every second here, every 20 s on the phone) cause no redraw and the Register form keeps what was typed; when a call arrives the redraw keeps both fields, the focus and the cursor, and the call shows; a form reopened starts empty. Fails on 1.8.0 (3 checks, 3 redraws, the text gone) |
| 21-pick-a-date | Pick a date sits beside the day strip, from today on; a working day a month ahead joins the strip with its times and books on that day; a Saturday says the dentist doesn't work then, across the whole width; with ClinicCards, a person with no shifts in the coming days says so, and picking a date further ahead fetches that week and offers its shift's times |
| 22-cliniccards-diary | A ClinicCards reply grouped by date gives the linked person's times (1.8.2 showed none); the diary is asked a week at a time; Check the diary reports the week's shift count, each person by name and id with their shifts and whether they're linked, the reply's shape and a shift's fields |
| 23-booking-details | A ClinicCards visit note carries the source and length of the call, triage, service, warnings, the AI summary, every detail, the mood, the front-desk notes and the whole conversation, and Frontly keeps the same on the visit; when the whole note is refused a shorter one without the conversation books it; Details on the client's page shows it all and the conversation; Cancel opens a dialog naming the client, day, time and dentist and saying ClinicCards needs it too; Keep it changes nothing; cancelling keeps the reason and who, and the history shows it |
| 06-ai-voice | With OpenAI: the greeting goes to OpenAI speech with Reva's instructions and the iPhone voice stays quiet; Settings shows the AI voice, model, instructions and OpenAI transcription; a silent call is closed, not queued |

## The bridge

`node bridge/test.mjs` (Node 22) runs the Cloudflare Worker against an in-memory KV: health without a token, everything else refused without it, the call-start lookup in Lithuanian for known and unknown numbers with every dynamic variable present, bad and replayed signatures refused, a signed webhook stored once even when retried and mapped to Frontly's shape, `since=`, and calls posted by other services.

## What the tests don't cover

Real phone calls through Twilio and ElevenLabs, real voices, real iPhone dictation, whether Scriptable's page may use the microphone, real speech levels for the pause detection, the Ring/Silent switch, how iOS draws the page and the widget, and real AI answers. Run the blueprints' phone checklists for those, in light and dark mode.
