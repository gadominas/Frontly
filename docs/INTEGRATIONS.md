# Planning integrations

Frontly books into one **planning engine** at a time, chosen in **Settings › Planning**:

| Engine | Where bookings live | Free times come from | Can cancel / move from Frontly |
| --- | --- | --- | --- |
| Frontly (built in) | Frontly's own diary | Each staff member's working days and hours (Settings › Staff) | Yes / yes |
| ClinicCards | Your ClinicCards schedule, as visits with status `BOOKING` | ClinicCards shifts, minus its visits and blocked time | No / no (do it in ClinicCards too; Frontly says so) |

Whatever the engine, Frontly keeps its own copy of each booking for the front desk, the calendar, the patient's page and the phone line, with the engine's ids on it (`appt.ext`, `patient.ext`).

## ClinicCards

1. In ClinicCards: **Settings › Other › Clinic settings › API settings › Generate and show**. Copy the key.
2. In Frontly: **Settings › Planning › ClinicCards › Settings**, then **API key › Add** (kept in the iOS Keychain), then **Test**. The test lists the people who take bookings, the cabinets and the booking step.
3. Pick the **cabinet** visits go to when a shift doesn't name one, and the **note** each visit carries (the call's reason is added after it).
4. Link each staff member to their person in ClinicCards, or tap **Import**: it links people by name ("Dr." or not) and adds anyone missing.
5. **Use ClinicCards for bookings**.

What Frontly calls (as the open-source [4WP Booking](https://github.com/4wpdev/4wp-booking) connector does in production; the full reference is the [Postman documentation](https://documenter.getpostman.com/view/29513893/2s9YBxZbqY)): base `https://cliniccards.com/api/`, header `Token: <key>`, replies `{ "result": "ok"|"fail", "data": …, "error": … }`.

| Call | For |
| --- | --- |
| `GET staff` | People who take bookings (roles DOCTOR, SPECIALIST or none) |
| `GET cabinets`, `GET booking-settings` | The cabinet list; the step between times (`booking_interval`) |
| `GET schedule-shifts?from&to` | Working hours (`shift_start`, `shift_end`, local time, `schedule_cabinets_id`) |
| `GET visits?from&to`, `GET schedule-spaces?from&to` | Time already taken or blocked |
| `GET patients?phone=<digits>`, `POST patients` | Find the caller by number in full digits (37061234567), or create them |
| `GET patients?page=N` | Import patients: page by page until a page brings nobody new |
| `POST visits` | `{ status: "BOOKING", patient_id, doctor_id, cabinet_id, date, time_start, time_end, note }` |

Frontly asks for the diary a week at a time and reads replies given as a list, under a key, or grouped by date. If a linked person shows no times, **Check the diary** in the ClinicCards window lists what one week's shifts contain: how many, whose (ClinicCards id and name), whether each person is linked in Frontly, and the fields a shift has. No shifts at all means the ClinicCards schedule has none for that week; shifts under an unlinked id mean the link is to the wrong person.

Each visit's `note` is a short comment in the language the call was held in (Lithuanian, Latvian or English): ClinicCards keeps only the first 400 characters of a comment, so it says what the staff need, most important first (the reason, warnings, pain, where, urgency, the preferred time and length, then the rest), and nothing about tools or how the request came in. With an AI key the AI writes it from everything Frontly knows; otherwise a template with translated labels. **Comment length** in the ClinicCards window sets the limit (400 by default). If ClinicCards refuses a comment, a shorter one is sent. Everything else, including the whole conversation, stays in Frontly under **Details**. Cancelling: ClinicCards' published API shows no call for it, so Frontly changes the visit's status to the cancelled one (**Cancelled status** in the ClinicCards window, `CANCELED` by default; **Check the diary** lists the statuses your visits use). It reads the visit back, tries `PATCH visits/{id}` with the status, then `PUT visits/{id}` with the whole visit and the status changed (never POST, which could create a second visit), and reads the visit again to make sure the status changed. The way that worked is remembered. If none takes, Frontly's copy is cancelled anyway and you're told to cancel it in ClinicCards; the visit's history says which. Cancelled visits no longer block their times.

**Staff.** **Import from ClinicCards** (Settings › Dentists, or the ClinicCards window) lists everyone in `GET staff` with their role and speciality. Doctors and specialists are ticked; others can be. The service is guessed from the job title (in English or Lithuanian) and can be changed; days and hours come from the person's shifts over the next four weeks. Imported people arrive linked; someone already in Frontly under the same name is linked instead of added.

**A client's visits.** Opening a client's card fetches their visits from ClinicCards (`GET visits?from&to&patient_id`, a month at a time, a year back and six months ahead), when the last fetch is more than 10 minutes old; **Refresh** fetches any time. The card shows how many there are and when they were fetched. The client is found by the ClinicCards id Frontly keeps, or by phone number. Only visits that carry this client's `patient_id` are taken: if ClinicCards' visits carry none, Frontly says so instead of guessing. Visits are matched to Frontly's own by id (or time and person) or added, marked as from ClinicCards; a Frontly booking that ClinicCards no longer has is marked cancelled there.

Before booking, Frontly reads that day's diary again, so a time taken in ClinicCards a moment ago isn't booked twice. Times are the clinic's local time; the phone running Frontly should be in the same time zone. Each booking sends the caller's name and phone number to ClinicCards.

## Adding another engine

An engine is one entry in `PLANNERS` in `Frontly.js`, plus its secret in `SECRETS`. Frontly draws its settings window from the entry and calls four functions, and a fifth, `clients()`, if the engine offers it (Import patients):

```js
PLANNERS.myengine = {
  label: "My Engine", about: "One line for Settings › Planning", docs: "https://…", help: "Where to get the key",
  secret: "myengine",                       // an entry in SECRETS: { key: "FRONTLY_MYENGINE_KEY", name, hint }
  can: { cancel: false, move: false },      // what Frontly may do there; false is said plainly to the user
  fields: [{ k: "room", label: "Room", type: "select", list: "rooms", help: "…" }, { k: "note", label: "Note", type: "text", def: "…" }],
  async test() { return { lines: ["what it found"], lists: { rooms: [[value, label]], staff: [[id, name]] } }; },
  async staff() { return [{ id, name, role }]; },
  async diary(from, to) { return { shifts: [{ staff, start, end, room }], busy: [{ staff, start, end }], step: 30 }; },   // times in ms, local
  async book({ staff, start, end, room, client: { name, phone, ref }, note }) { return { ref: "their booking id", client: "their client id" }; },
  async clients() { return [{ id, name, phone, birth }]; },   // optional: Import patients
};
```

`lists.staff` fills the staff links; any other list fills a `select` field with that `list` name. Settings the user picks are in `plannerCfg(id)`. Then add a test in `tests/cases` that fakes the engine's API, as `17-cliniccards.test.js` does.
