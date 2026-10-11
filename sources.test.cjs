// Regression checks for the source bank. Run with: node --test sources.test.cjs
const test = require("node:test");
const assert = require("node:assert");
const { STREAM_REACHES, STREAM_SOURCES } = require("./sources.js");

test("every source has a unique id, a known reach, three moves, and a verdict", () => {
  const ids = new Set();
  const reachIds = new Set(STREAM_REACHES.map(r => r.id));
  for (const s of STREAM_SOURCES) {
    assert.ok(!ids.has(s.id), `duplicate id ${s.id}`);
    ids.add(s.id);
    assert.ok(reachIds.has(s.reach), `${s.id} has unknown reach ${s.reach}`);
    for (const k of ["who", "evidence", "others"]) {
      assert.ok(s.checks[k] && s.checks[k].text.length > 20, `${s.id} is missing the ${k} move`);
      assert.strictEqual(typeof s.checks[k].tell, "boolean", `${s.id} ${k} needs a tell flag`);
    }
    assert.ok(s.verdict.length > 40, `${s.id} needs a verdict`);
    assert.strictEqual(typeof s.holds, "boolean");
  }
});

test("every reach has at least two sources and the bank can fill a bibliography twice over", () => {
  for (const r of STREAM_REACHES) {
    const n = STREAM_SOURCES.filter(s => s.reach === r.id).length;
    assert.ok(n >= 2, `reach ${r.id} has ${n} sources`);
  }
  const holds = STREAM_SOURCES.filter(s => s.holds).length;
  assert.ok(holds >= 5, "at least five sources must hold so a perfect run is possible");
  assert.ok(STREAM_SOURCES.length - holds >= 3, "at least three sources must fail so the audit has teeth");
});

test("every source that fails has at least one tell among its moves", () => {
  for (const s of STREAM_SOURCES.filter(s => !s.holds)) {
    const tells = Object.values(s.checks).filter(c => c.tell).length;
    assert.ok(tells >= 1, `${s.id} fails but no move points toward it`);
  }
});

test("reach speeds increase monotonically from Voice to Phantom", () => {
  for (let i = 1; i < STREAM_REACHES.length; i++) {
    assert.ok(STREAM_REACHES[i].speed > STREAM_REACHES[i - 1].speed, `${STREAM_REACHES[i].id} is not faster than ${STREAM_REACHES[i - 1].id}`);
  }
});
