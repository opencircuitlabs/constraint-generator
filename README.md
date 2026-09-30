# Constraint Generator

A deterministic, validated FPGA constraint compiler for PCF, Xilinx XDC, Lattice LPF, Intel Quartus QSF, Gowin CST, and portable SDC timing constraints.

It consumes a vendor-neutral assignment plan, checks cross-references and conflicts, sorts output deterministically, and emits toolchain-ready text. It pairs naturally with [`fpga-board-registry`](https://github.com/opencircuitlabs/fpga-board-registry), but has no runtime dependencies and accepts plans from any source.

## Quick start

```bash
npm install
npm test
node src/cli.js --input examples/icebreaker.json --format pcf --output pins.pcf --sdc timing.sdc
node src/cli.js validate examples/icebreaker.json
```

```js
import { generateConstraints } from '@opencircuitlabs/constraint-generator';

const { content, timing } = generateConstraints(plan, 'xdc', { includeSdc: true });
```

## Input contract

```json
{
  "schemaVersion": 1,
  "boardId": "icebreaker",
  "defaultIoStandard": "LVCMOS33",
  "assignments": [
    { "signal": "clk", "physicalPin": "35" },
    { "signal": "led_n", "physicalPin": "37", "driveMa": 8 },
    { "signal": "reset_n", "physicalPin": "10", "pull": "up" }
  ],
  "clocks": [
    { "name": "sys_clk", "signal": "clk", "frequencyHz": 12000000, "dutyCycle": 0.5 }
  ],
  "ioDelays": [
    { "signal": "reset_n", "direction": "input", "clock": "sys_clk", "maxNs": 4, "minNs": 0 }
  ]
}
```

Validation rejects unsafe HDL identifiers, repeated logical or physical pins, non-positive clock rates, invalid electrical options, and timing constraints that reference unassigned signals. Generation never guesses missing physical pins.

## Target behavior

| Format | Typical toolchain | Generated features |
| --- | --- | --- |
| PCF | Project IceStorm | Pin locations, pull-ups |
| XDC | AMD/Xilinx Vivado | Locations, I/O standards, drive, slew, pulls, clocks and delays |
| LPF | Lattice ECP5 | Locations and I/O buffer attributes |
| QSF | Intel Quartus | Locations, standards, current strength, pull-ups |
| CST | Gowin | Locations, standards, pulls |
| SDC | Timing engines | Clocks, I/O delays and false paths |

Outputs are stable across input ordering, making generated files suitable for review and semantic diffs. The `planFromRegistryAssignment` adapter converts registry assignment output without coupling the two packages.

## Safety boundary

This compiler verifies plan consistency; it cannot prove a board pinout is electrically correct. Use source-backed board metadata, inspect the generated constraints, and check voltage banks before programming real hardware.

## License

MIT
