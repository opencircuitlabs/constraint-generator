import test from 'node:test';
import assert from 'node:assert/strict';
import { generateConstraints, normalizePlan, planFromRegistryAssignment, timingSdc, validatePlan } from '../src/index.js';

const plan = {
  schemaVersion: 1, boardId: 'demo', defaultIoStandard: 'LVCMOS33',
  assignments: [
    { signal: 'led[0]', physicalPin: '11', driveMa: 8, slew: 'slow' },
    { signal: 'clk', physicalPin: '35' },
    { signal: 'reset_n', physicalPin: '10', pull: 'up' }
  ],
  clocks: [{ name: 'sys', signal: 'clk', frequencyHz: 12000000 }],
  ioDelays: [{ signal: 'reset_n', direction: 'input', clock: 'sys', maxNs: 3.5, minNs: 0.5 }]
};

test('valid plan passes relational validation', () => assert.deepEqual(validatePlan(plan), { valid: true, issues: [] }));

test('normalization sorts signals without mutating input', () => {
  const copy = structuredClone(plan); const normalized = normalizePlan(copy);
  assert.deepEqual(normalized.assignments.map((x) => x.signal), ['clk', 'led[0]', 'reset_n']);
  assert.deepEqual(copy, plan);
});

test('PCF output is stable and carries pull-up option', () => {
  const out = generateConstraints(plan, 'pcf').content;
  assert.match(out, /set_io clk 35/);
  assert.match(out, /set_io -pullup yes reset_n 10/);
});

test('XDC emits pins, electrical properties, and timing', () => {
  const out = generateConstraints(plan, 'xdc').content;
  assert.match(out, /set_property PACKAGE_PIN 11 \[get_ports \{led\[0\]\}\]/);
  assert.match(out, /set_property DRIVE 8/);
  assert.match(out, /create_clock -name sys -period 83\.333333/);
  assert.match(out, /set_input_delay -min 0\.5/);
});

test('LPF escapes names and emits I/O attributes', () => {
  const out = generateConstraints(plan, 'lpf').content;
  assert.match(out, /LOCATE COMP "clk" SITE "35";/);
  assert.match(out, /IOBUF PORT "led\[0\]" IO_TYPE=LVCMOS33 DRIVE=8;/);
});

test('QSF and Gowin CST targets are supported', () => {
  assert.match(generateConstraints(plan, 'qsf').content, /set_location_assignment PIN_35 -to clk/);
  assert.match(generateConstraints(plan, 'cst').content, /IO_LOC "clk" 35;/);
});

test('SDC output includes clock and I/O delays', () => {
  const out = timingSdc(plan);
  assert.match(out, /create_clock -name sys -period 83\.333333/);
  assert.match(out, /set_input_delay -max 3\.5 -clock/);
});

test('invalid duplicate pins and dangling timing references fail', () => {
  const invalid = structuredClone(plan);
  invalid.assignments[1].physicalPin = '11'; invalid.clocks[0].signal = 'missing';
  const result = validatePlan(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((x) => x.path.endsWith('physicalPin')));
  assert.ok(result.issues.some((x) => x.path.endsWith('signal')));
});

test('unsupported formats fail with supported target list', () => {
  assert.throws(() => generateConstraints(plan, 'ucf'), /expected pcf, xdc, lpf, qsf, cst/);
});

test('registry assignment adapter preserves polarity and standards', () => {
  const converted = planFromRegistryAssignment({ boardId: 'x', assignments: [{ signal: 'led', physicalPin: '7', activeLow: true, ioStandard: 'LVCMOS33' }] });
  assert.deepEqual(converted.assignments[0], { signal: 'led', physicalPin: '7', ioStandard: 'LVCMOS33', activeLow: true });
});

test('generated output is byte-identical regardless of input assignment order', () => {
  const reversed = { ...plan, assignments: [...plan.assignments].reverse() };
  assert.equal(generateConstraints(plan, 'xdc').content, generateConstraints(reversed, 'xdc').content);
});
