// 16 A client's record can be edited (name, phone, age) and removed; the number stays unique because callers are
// recognised by it; the new name shows everywhere and reaches the phone bridge.
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

const T = Date.parse('2026-11-13T08:00:00Z'), DAY = 864e5;
scenario('edit a client', async (t) => {
  const puts = [];
  const app = await t.open({
    settings: { aiInvite: { off: true }, deskUser: 'Agnė Petrauskaitė', bridgeUrl: 'https://b.test', demoGone: true }, kc: { FRONTLY_BRIDGE_TOKEN: 'x' },
    routes: [{ name: 'calls', match: (u) => u.startsWith('https://b.test/calls'), respond: () => ({ json: { calls: [] } }) },
      { name: 'patients', match: 'https://b.test/patients', respond: (req) => { puts.push(req.json()); return { json: { ok: true } }; } }],
    files: (h) => ({
      [h.path('patients.json')]: JSON.stringify([
        { id: 'p-1', name: 'Gedminas', age: 35, phone: '+370 611 00000', since: T - 2 * DAY, notes: [], appts: [] },
        { id: 'p-2', name: 'Rasa Jankūnė', age: 31, phone: '+370 600 33333', since: T - 90 * DAY, notes: [], appts: [{ id: 'a-1', at: T + 3 * DAY, doctor: 'd-kazl', reason: 'Filling', status: 'booked' }] },
      ]),
      [h.path('calls.json')]: JSON.stringify([{ id: 'el-1', at: T - 3600e3, phone: '+37061100000', patientId: 'p-1', source: 'phone', status: 'waiting', transcript: [{ who: 'caller', t: 'Hi' }], fields: { name: 'Gedminas' }, summary: { reason: 'Loose bracket', triage: 'soon', priority: 3 } }]),
    }),
  });
  await app.until(() => app.win() && app.win().__booted, 6000, 'the page');
  const pts = () => app.json(app.path('patients.json')) || [];
  app.tap('[data-act="tab"][data-v="patients"]');
  await app.until(() => app.$('[data-act="openpat"][data-id="p-1"]'), 2000, 'the list');
  app.tap('[data-act="openpat"][data-id="p-1"]');
  await app.until(() => app.$('#patsheet [data-act="patedit"]'), 2000, 'Edit details');

  t.step('A. Mistakes are caught, and what was typed stays');
  app.tap('#patsheet [data-act="patedit"]');
  app.type('#pe-name', 'Gediminas Siutilas'); app.type('#pe-phone', '+370 600 33333'); app.type('#pe-age', '45');
  app.tap('[data-act="patsave"]');
  await app.until(() => /Rasa Jankūnė already has that number/.test(app.text('#patsheet')), 2000, 'the shared-number error');
  t.check(app.$('#pe-name').value === 'Gediminas Siutilas' && pts().find((p) => p.id === 'p-1').name === 'Gedminas', 'another record’s number is refused; the form keeps what was typed and nothing is saved');
  app.type('#pe-phone', '+370 611 00000'); app.type('#pe-age', '450');
  app.tap('[data-act="patsave"]');
  await app.until(() => /Age: a number from 0 to 120/.test(app.text('#patsheet')), 2000, 'the age error');
  t.check(true, 'an impossible age is refused');

  t.step('B. Saved');
  app.type('#pe-age', '45'); app.tap('[data-act="patsave"]');
  await app.until(() => pts().find((p) => p.id === 'p-1').name === 'Gediminas Siutilas', 2000, 'saved');
  const p1 = pts().find((p) => p.id === 'p-1');
  t.check(p1.age === 45 && p1.phone === '+370 611 00000' && !app.$('#pe-name') && /Gediminas Siutilas/.test(app.text('#patsheet .sh-head')), 'name and age saved; the page shows the new name');
  await app.until(() => puts.some((b) => b.some((p) => p.name === 'Gediminas Siutilas')), 3000, 'the bridge');
  t.check(true, 'the phone bridge gets the new name at once, so Reva greets him by it');
  app.tap('[data-act="patclose"]');
  app.tap('[data-act="tab"][data-v="desk"]');
  await app.until(() => app.$('[data-act="opencase"][data-id="el-1"]'), 2000, 'the queue');
  t.check(/Gediminas Siutilas/.test(app.text('[data-act="opencase"][data-id="el-1"]')), 'the front desk shows the corrected name, not the one said on the call');

  t.step('C. Remove');
  app.tap('[data-act="tab"][data-v="patients"]');
  await app.until(() => app.$('[data-act="openpat"][data-id="p-2"]'), 2000, 'the list');
  app.tap('[data-act="openpat"][data-id="p-2"]'); await app.until(() => app.$('#patsheet [data-act="patedit"]'), 2000, 'Rasa');
  app.tap('#patsheet [data-act="patedit"]'); app.tap('[data-act="patremove"]'); app.tap('[data-act="patremove"]');
  await app.until(() => /has 1 visit booked/.test(app.text('#toast')), 2000, 'refused');
  t.check(pts().some((p) => p.id === 'p-2'), 'a record with a booking ahead stays, and the toast says why');
  app.tap('[data-act="patclose"]');
  app.tap('[data-act="openpat"][data-id="p-1"]'); await app.until(() => app.$('#patsheet [data-act="patedit"]'), 2000, 'Gediminas');
  app.tap('#patsheet [data-act="patedit"]'); app.tap('[data-act="patremove"]'); app.tap('[data-act="patremove"]');
  await app.until(() => !pts().some((p) => p.id === 'p-1'), 2000, 'removed');
  const c = (app.json(app.path('calls.json')) || []).find((x) => x.id === 'el-1');
  t.check(c && c.patientId === null && !app.$('#patsheet.open'), 'removed: his call stays without the record, and the page closes');
});
