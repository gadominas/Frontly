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
