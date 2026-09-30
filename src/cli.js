#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { generateConstraints, validatePlan } from './index.js';

const args = process.argv.slice(2);
const value = (flag) => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
try {
  if (args[0] === 'validate') {
    const result = validatePlan(JSON.parse(readFileSync(args[1], 'utf8')));
    console.log(JSON.stringify(result, null, 2)); if (!result.valid) process.exitCode = 1;
  } else {
    const input = value('--input') ?? args[0]; const format = value('--format') ?? 'pcf'; const output = value('--output');
    if (!input) throw new Error('Usage: constraint-gen --input plan.json --format pcf [--output pins.pcf] [--sdc timing.sdc]');
    const generated = generateConstraints(JSON.parse(readFileSync(input, 'utf8')), format, { includeSdc: Boolean(value('--sdc')) });
    if (output) writeFileSync(output, generated.content); else process.stdout.write(generated.content);
    if (value('--sdc')) writeFileSync(value('--sdc'), generated.timing);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
