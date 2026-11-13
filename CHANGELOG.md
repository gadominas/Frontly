# Changelog

All notable changes to Frontly. Generated from `releases.json`; edit that file, not this one.

## 1.7.0 (2026-11-13): Import clients and staff

- 📥 **Bring your lists in**: Settings › Data › Import: a CSV file or rows copied from a spreadsheet, for clients or staff, with columns in English or Lithuanian.
- 👀 **A preview first**: See who's new, who's already here and which rows are skipped and why. Nothing is saved until you tap Import.
- 🦷 **Patients from ClinicCards**: With ClinicCards set up, its window imports your patients too, linked to their ClinicCards records.

**Changes**

- Import window: Choose a file… or paste; comma, semicolon or tab; quoted text; headers like name, first/last name, phone, age, birth date, notes, role, services, days, hours, or vardas, pavardė, telefonas, gimimo data, pastabos, pareigos, paslaugos
- Clients are matched by phone number, staff by name ("Dr." or not); records already here are kept as they are and get a missing age or the engine's id
- Staff rows: services matched to yours, days such as Mon-Fri, Mon;Wed;Fri or Pr-Pn, hours such as 8-16; an unknown service is pointed out
- Planning engines may offer clients() for Import patients; ClinicCards reads its patients page by page
- Import from Settings › Data, from the empty client list, and from the ClinicCards window
- Tests: 18-import (24 of 24 with the testkit)

## 1.6.0 (2026-11-13): Book into ClinicCards

- 🔌 **Planning engines**: Settings › Planning: book in Frontly's own diary, or straight into ClinicCards. More planning services can plug in the same way.
- ⚙️ **A window for each**: ClinicCards has its own settings: the API key, a connection test, the cabinet, the note, and which ClinicCards person each of your staff is.
- 📅 **Real free times**: With ClinicCards in use, the times come from its shifts minus its visits, and a booking is checked and made there first.

**Changes**

- A pluggable planning-engine layer: each engine is one entry with its settings fields, its secret, what it can't do, and test, staff, diary and book calls (docs/INTEGRATIONS.md)
- ClinicCards: Token-header API; staff, cabinets, booking step, shifts, visits and blocked time read; patient found by full-digit number or created; a BOOKING visit made; the time re-checked live first
- Each engine's own settings window: API key in the Keychain, Test, its options, staff links, Import (links by name, "Dr." or not), Use; can't be used before a test
- Booking box and calendar use the engine's diary; a person not linked says so; the engine's errors are shown and nothing is kept
- Cancelling or moving a visit booked in ClinicCards reminds you to do it there too (its API has no call for it)
- Tests: 17-cliniccards with the API faked as the 4WP Booking connector uses it (23 of 23 with the testkit)

## 1.5.2 (2026-11-13): Edit a client's details

- ✏️ **Edit details**: Fix a name, a phone number or an age on the client's page. The new name shows everywhere and reaches the phone line at once.
- 📞 **One number, one client**: Reva recognises callers by their number, so Frontly won't let two records share one, and says who already has it.
- 🗑️ **Remove a record**: Take a record away when it's not needed; Frontly won't while a booking is ahead, and the calls stay.

**Changes**

- A client's page: Edit details (name, phone, age where the business asks for it), Save, Cancel, Remove; mistakes are explained and what was typed stays
- The record's name is the name shown on cards and the case, ahead of the name said on a call
- The phone bridge gets the patient list again after an edit or a removal
- Tests: 16-edit-client (22 of 22 with the testkit)

**Fixes**

- A misspelt name from a call could only be fixed by a new call

## 1.5.1 (2026-11-13): A new logo for any front desk

- 💬 **A request that becomes a booking**: The new logo is a speech bubble shaped like a calendar page, with a teal check for booked and a pink dot for a new call.
- 🏢 **For any business**: No tooth any more: the logo fits a clinic, a car service or any office.
- ✨ **Everywhere at once**: The app header, the launch animation, the widget and the app icon all show it.

**Changes**

- New logo: frame (two sound marks), drawing (a speech bubble with calendar rings and a header line), pop (a pink new-call dot), sweep (a teal check); the launch animation draws it in the same four steps
- docs/logo.svg and the 1024 px app icon redrawn; the widget fetches the new icon with this version
- README: banner (with a voice waveform instead of a heartbeat line), header text, every screenshot and the GIF wall redone

## 1.5.0 (2026-11-13): Any kind of office

- 🏢 **Pick your kind of business**: Settings › Business: a dental clinic, a car service, or any office. Each brings its own words, services and the questions Reva asks.
- ✏️ **Your own words**: Call your staff mechanics, consultants or anything else, your callers customers or clients, and add the services you offer.
- 🦷 **The dental demo, as it was**: The dental clinic keeps its questions, its safety rule and Reva's phone instructions word for word, so the phone line needs no changes.

**Changes**

- Templates: Dental clinic (unchanged), Car service (the problem, the car, whether it can be driven; smoke, fuel or brake safety), Office or other service (reason, urgency, best time)
- Each template: the words for staff, callers, bookings and the place; its services and how calls are routed to them; the script's questions in English and Lithuanian; the AI's wording; the AI voice's style
- Settings › Business: kind of business, your own words (one and many), services to add and remove, Reset; staff are moved to services that exist when the template changes
- Every screen, the case, the calendar, the tabs and the settings use the business's words; the call details show only what the business asks
- Reva's phone instructions follow the template with the same bridge variables; the surgery gap shows only for a dental clinic; a setting for where the business is
- Tests: 15-business-templates (21 of 21 with the testkit), including a word-for-word check of the dental instructions; node bridge/test.mjs 14 checks

## 1.4.1 (2026-11-13): A tidier front desk bar

- 🔘 **Real buttons**: Check line is now a proper button with a phone icon, and shows a spinner while it checks.
- 👤 **Who's signed in**: The receptionist shows with their initials and today's bookings, on one line that never wraps.
- 🚪 **Sign out**: A round button at the end of the bar, out of the way of Check line.

**Changes**

- Front desk bar: the receptionist with initials and "Booked today", a Check line pill (phone icon, spinner while checking), a round Sign out button; nothing wraps onto two lines
- Tests: 10-phone-line checks the bar's buttons (20 of 20 with the testkit)

**Fixes**

- Check line and Sign out were plain links that broke onto two lines

## 1.4.0 (2026-11-13): Your clinic, your dentists

- 🧑‍⚕️ **Add your dentists**: Settings › Dentists: add each dentist with their role, what they do, their days and hours. Bookings, suggestions and the calendar use them.
- 🧹 **No made-up data**: No invented patients fill the diary any more, and the demo patients are gone: the calendar and the front desk show only your calls and bookings.
- ◀️ **Better calendar buttons**: Round buttons with clear arrows step through days, weeks and months, and Back to today brings you home.

**Changes**

- Settings › Dentists: add, edit and remove; a dentist with visits booked can't be removed, one with only past visits is hidden so the history still names them
- An install that already booked with the five sample dentists keeps them, now editable; a new install starts with none and points to Settings › Dentists
- The made-up patients that filled the diary are gone, and so is Settings › Booking › Demo: slots already taken; the calendar counts only bookings
- The three demo patients and their call are removed once; real phone calls stay, and a demo record a real call was filed under keeps that call and its booking
- Settings › Demo › Start the demo again becomes Settings › Data › Remove all calls and patients
- Trends say so when there is nothing to show yet
- Tests: 13-dentists, 14-no-demo-data (20 of 20 with the testkit); node bridge/test.mjs 14 checks

**Fixes**

- The calendar's arrow buttons were small and their arrows sat off-centre

## 1.3.0 (2026-11-12): Smarter booking, and the clinic at a glance

- 🗓️ **Calendar**: A new tab shows how full the clinic is: each dentist's day, the week and the month as percent taken, and trends with the busiest days and dentists.
- ✨ **A time that fits**: Each call opens with a suggested time already selected: the right dentist, what the caller asked for ("after 3 pm", "Friday"), sooner when it's urgent. The AI weighs in when there's judgement to make.
- 🛡️ **Visits that make sense**: A patient's visits never overlap and are kept apart, two surgeries leave time to heal, and a change of booking moves the visit instead of adding a second one.

**Changes**

- Front desk: a patient with several calls in a list gets one stacked card with all of them and their booked visits
- Booking rules (Settings › Booking): days between a patient's visits (1) and between two surgeries (14); times that break them are struck through, with the reason
- Suggested time from the caller's preference (hours, weekdays, tomorrow, next week), the note's dentist and the urgency; preselected
- AI plan: picks from the allowed free times, explains why, warns, and offers alternatives; asked automatically for other visits, surgery or a change
- A change of booking: Visit to move, then Move to …; the old visit is marked moved and its call shows where it went
- Calendar tab: Day (each dentist's times), Week (heat grid), Month, Trends (weekly occupancy, busiest weekdays, dentists for the next two weeks, calls per day, four figures and three observations)
- The made-up diary is busier on Mondays and mid-mornings and fills up nearer the day, so the calendar looks like a clinic's
- Tests: 12-booking-rules (18 of 18 with the testkit); node bridge/test.mjs 14 checks

**Fixes**

- A change of booking was booked as a second visit next to the first
- A preferred time on a card was cut off in the middle of a number

## 1.2.0 (2026-11-12): Returning callers, handled

- 📅 **"When is my visit?"**: Reva knows each patient's booked visits and answers when, what time and with which dentist, without adding anything to the front desk's list.
- 🧹 **Only real booking work waits**: Questions go to Other, filed under the patient. A patient who calls again about a request that's waiting is added to it ("Called 2×") instead of queueing twice.
- ✉️ **Messages for the patient**: Write a message on the patient's page; Reva passes it on at their next call and Frontly marks it as passed on.

**Changes**

- Each phone call has a purpose: new visit, question about a booked visit, change to a booked visit, or other; from the agent's new intent field, Frontly's AI note, or the call itself
- Front desk: Closed becomes Other (closed calls and calls that needed no booking); cards show the purpose and how many times someone called; a filed call can be moved to To book
- Patient page: a message for the patient, its history once passed on, and each call's purpose
- The patient brief for the bridge adds booked visits, a waiting request and the message; Reva's instructions (Settings › Phone line › Copy) use them
- bridge: new variables patient_appointments, patient_waiting, patient_message, patient_message_id; reads the intent and message_passed fields
- Tests: 11-returning-caller (17 of 17 with the testkit); node bridge/test.mjs 14 checks

**Fixes**

- Short labels on the front-desk cards broke onto two lines; they now stay whole and move to the next row, and only long warnings wrap
- A patient who phoned twice about the same thing showed up twice in To book

## 1.1.2 (2026-11-12): The caller's language from the first word

- 🌍 **Language by phone number**: A +370 number hears Reva in Lithuanian, a +371 number in Latvian and any other country in English, from her very first word.
- 👋 **Greetings in three languages**: Reva's opening, including "Ar tai Jonas?" for a known patient, now comes in Lithuanian, Latvian or English.
- 📋 **Updated instructions**: Copy Reva's instructions again from Settings › Phone line: they now start in the caller's language and switch if the caller answers in another.

**Changes**

- bridge: the call-start answer picks the language from the caller's country code, then the number dialled, then LANGUAGE; it sends the agent-language override and a {{call_language}} variable
- bridge: a Latvian opening line; Twilio's stand-in numbers for hidden callers are recognised; LANGUAGE_OVERRIDE=off for agents with the override switched off
- Reva's instructions (Settings › Phone line › Copy) use {{call_language}} instead of a fixed Lithuanian-or-English rule
- Tests: 16 of 16 with the testkit; node bridge/test.mjs 14 checks (Latvian, foreign and hidden callers, the override switch)

**Fixes**

- Calls always started in the agent's default language, whatever number called

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
