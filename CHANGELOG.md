# Changelog

All notable changes to Frontly. Generated from `releases.json`; edit that file, not this one.

## 1.1.1 (2026-11-12): Notes that fit the screen

- 📐 **Long warnings wrap**: A long warning or label in a call note now wraps onto the next line inside the card instead of running off the screen.
- ↔️ **No sideways scrolling**: The case sheet and the app's pages stay exactly the width of the screen, so nothing can be dragged sideways by accident.
- 📞 **Ready for real calls**: Notes written from real phone calls, which tend to carry longer warnings, now read cleanly at the front desk.

**Changes**

- Pills (urgency, priority, specialty, warnings) may wrap within the card's width; warnings keep the ⚠ at the top of a wrapped line
- The page, its sheets and the note box no longer allow horizontal scrolling; very long words break inside the box
- Tests: 10-phone-line checks the wrapping and no-sideways-scroll rules (16 of 16 with the testkit); node bridge/test.mjs still 11 checks

**Fixes**

- A long AI warning in a call note ran past the right edge and let the case sheet scroll sideways

## 1.1.0 (2026-11-12): A real phone number for Reva

- 📞 **Call Reva for real**: Connect a Twilio number answered by an ElevenLabs agent: Reva picks up real calls, and the Call tab dials the number for you.
- 🗂️ **Real calls at the front desk**: Calls the line took arrive by themselves, marked 📞, filed under the caller's record with the transcript, the details and a note, ready to book.
- 👋 **She knows who's calling**: A known number gets a greeting by name and Reva knows the last visit, because Frontly shares a short patient list with your bridge.

**Changes**

- Settings › Phone line: the bridge address, its token (settings blueprint secrets: Keychain, native prompt, Make one), status, Check now, and Reva's instructions for ElevenLabs to copy
- Frontly checks the bridge 1.5 s after opening and every 20 s while open; new calls are imported once, matched to patients by number, and get Frontly's AI note when a key is set, otherwise ElevenLabs' summary
- bridge/: a Cloudflare Worker (call-start lookup for ElevenLabs, HMAC-verified post-call webhook, calls for Frontly, the patient brief) with its own tests and a step-by-step setup guide
- The scripted Lithuanian greeting for a known patient is now "Ar tai …?", which works with any name
- Tests: 10-phone-line (16 of 16 with the testkit), node bridge/test.mjs (11 checks)

**Fixes**

- The Lithuanian greeting put a name in the wrong case ("Ar kalbu su Jonas?")

## 1.0.2 (2026-11-12): Patients, organised

- 🗂️ **Grouped by what needs doing**: Patients sort into To book, Visit booked, New and everyone else, or by last contact or name.
- 🔎 **Filters and search**: Show only callers to book, booked visits or new patients, with a count on each, and search by name or number.
- 🪪 **More on every card**: The next visit with its dentist or the open call with its urgency, plus visits, calls, notes, mood, and a warning when two records share a number.

**Changes**

- The Patients tab is rebuilt: grouping (remembered as settings.patGroup), filters with counts, full-width cards with status rings
- Tests: 09-patients-list: 15 of 15

**Fixes**

- Patient rows shrank to their text and sat centred at different widths

## 1.0.1 (2026-11-12): Lithuanian calls, hands free

- 🇱🇹 **Lithuanian works**: iPhone dictation has no Lithuanian, so Reva now hears you through OpenAI transcription, or asks you to type when there's no OpenAI key.
- 🎙️ **Just stop talking**: With OpenAI transcription, Reva stops listening on her own when you pause and sends your answer. No tap needed.
- 👀 **Easier to read**: The receptionist's name under the clinic on the call screen is readable in every colour scheme.

**Changes**

- When iPhone dictation says a language isn't supported, Frontly remembers it (settings.noDictation) and uses OpenAI transcription for that language, or the keyboard without an OpenAI key; Settings › Calls and the Call tab say so
- OpenAI transcription ends each answer by itself after a pause (Settings › Calls › Stop listening after a pause of, 1.2 s), after 10 s of silence, or after 45 s
- Tests: 07-no-dictation and 08-transcribe-hands-free (a fake microphone) join the testkit run: 14 of 14

**Fixes**

- A Lithuanian call showed iOS's raw "Dictation is not supported for the locale lt-LT" and stopped listening
- An answer transcribed by OpenAI was dropped instead of reaching Reva
- The line under the clinic's name on the call screen was nearly invisible

## 1.0.0 (2026-11-12): Meet Reva, the virtual receptionist

- 📞 **Call the clinic**: Ring a demo dental clinic from your iPhone. Reva answers, asks what's wrong, how much it hurts and when you can come, and you answer by voice or by typing.
- 📝 **A note ready to book**: Every call ends with a note for the front desk: urgency, red flags, the right dentist and, with AI, how the caller sounded.
- 🗓️ **Be the receptionist**: Sign in to the front desk, work the queue most urgent first, and book each caller into a free slot with the right dentist.

**Changes**

- First release: the Call tab (known patients recognised by phone number, new callers get a record), the live call screen with Reva's notes filling in, the Front desk queue and booking, and Patients
- Reva follows a script in English or Lithuanian without AI; with a Claude or OpenAI key she holds a real conversation, reads the caller's mood and writes the note
- With an OpenAI key Reva can speak with an AI voice and callers can be transcribed by OpenAI; otherwise an iPhone voice and iPhone dictation
- Blueprints: Stability patterns 1.0.2, In-app updates 1.1.1, Settings 2.0.1, AI configuration 1.0.2, Launch screen 1.0.2, Widgets 1.1.1, AI invitation 1.2.2, Sound in silent mode 1.0.2; recipes: safe start-up 1.1.0, portable bridge 1.0.0, testing 1.2.2
