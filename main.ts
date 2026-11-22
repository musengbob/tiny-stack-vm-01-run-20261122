// Tiny stack VM for make.fun tiny-stack-vm-01 (ISA.md in the kit): 32-bit wrapping
// ints, 256-value stack, 64-deep call stack, 256 words of memory, input/output,
// all ten traps with their own exit codes, 1M-step and 64K-output limits.
// Reads /input/<id>/{program,input}.bin, writes /output/<id>/{stdout.bin,exit.txt}.
// Deterministic: no clock, no env, no randomness.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// [opcode, immediate bytes, pops, pushes] -> flat lookup arrays (-1 = no opcode).
const S: [number, number, number, number][] = [
  [0, 0, 0, 0], [1, 1, 0, 1], [2, 4, 0, 1], [3, 0, 1, 0], [4, 0, 1, 2],
  [5, 0, 2, 2], [6, 0, 2, 3], [7, 0, 3, 3], [16, 0, 2, 1], [17, 0, 2, 1],
  [18, 0, 2, 1], [19, 0, 2, 1], [20, 0, 2, 1], [21, 0, 2, 1], [22, 0, 2, 1],
  [23, 0, 1, 1], [24, 0, 2, 1], [25, 0, 2, 1], [26, 0, 2, 1], [27, 0, 1, 1],
  [28, 0, 2, 1], [29, 0, 2, 1], [30, 0, 2, 1], [32, 0, 2, 1], [33, 0, 2, 1],
  [34, 0, 2, 1], [48, 2, 0, 0], [49, 2, 1, 0], [50, 2, 1, 0], [51, 2, 0, 0],
  [52, 0, 0, 0], [64, 0, 1, 1], [65, 0, 2, 0], [80, 0, 1, 0], [81, 0, 1, 0],
  [82, 0, 0, 1], [83, 0, 1, 0],
];
const IM = new Int8Array(256).fill(-1), PO = new Int8Array(256), PU = new Int8Array(256);
for (const [o, i, a, b] of S) { IM[o] = i; PO[o] = a; PU[o] = b; }

function run(p: Uint8Array, inp: Uint8Array): [Uint8Array, number] {
  const d = new Int32Array(256), c = new Int32Array(64), m = new Int32Array(256);
  const out = new Uint8Array(65536);
  let sp = 0, cp = 0, ol = 0, ip = 0, pc = 0, steps = 0;
  const end = (code: number): [Uint8Array, number] => [out.subarray(0, ol), code];
  for (;;) {
    if (steps === 1e6) return end(10); // step limit
    if (pc < 0 || pc >= p.length) return end(9); // pc outside program
    const op = p[pc], imm = IM[op];
    if (imm < 0) return end(5); // unknown opcode
    if (pc + imm >= p.length) return end(9); // immediate cut off
    steps++;
    const nx = pc + 1 + imm;
    const pops = PO[op], pushes = PU[op]; // hoisted: one lookup each per step
    if (sp < pops) return end(2); // stack underflow
    if (sp - pops + pushes > 256) return end(3); // stack overflow
    pc = nx;
    switch (op) {
      case 0: return end(0); // HALT
      case 1: d[sp++] = (p[nx - 1] << 24) >> 24; break; // PUSH8, sign-extended
      case 2: d[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); break; // PUSH32
      case 3: sp--; break; // POP
      case 4: d[sp] = d[sp - 1]; sp++; break; // DUP
      case 5: { const t = d[sp - 1]; d[sp - 1] = d[sp - 2]; d[sp - 2] = t; break; } // SWAP
      case 6: d[sp] = d[sp - 2]; sp++; break; // OVER
      case 7: { const a = d[sp - 3]; d[sp - 3] = d[sp - 2]; d[sp - 2] = d[sp - 1]; d[sp - 1] = a; break; } // ROT
      case 23: d[sp - 1] = -d[sp - 1] | 0; break; // NEG (wraps at -2^31)
      case 27: d[sp - 1] = ~d[sp - 1]; break; // NOT
      case 16: case 17: case 18: case 19: case 20: case 21: case 22: case 24:
      case 25: case 26: case 28: case 29: case 30: case 32: case 33: case 34: {
        const b = d[sp - 1], a = d[sp - 2];
        let r: number;
        if (op === 16) r = (a + b) | 0;
        else if (op === 17) r = (a - b) | 0;
        else if (op === 18) r = Math.imul(a, b); // exact low 32 bits
        else if (op === 19) { if (b === 0) return end(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; } // DIV
        else if (op === 20) { if (b === 0) return end(4); r = b === -1 ? 0 : (a % b) | 0; } // MOD, sign of a
        else if (op === 21) { if (b === 0) return end(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; } // DIVU
        else if (op === 22) { if (b === 0) return end(4); r = ((a >>> 0) % (b >>> 0)) | 0; } // MODU
        else if (op === 24) r = a & b;
        else if (op === 25) r = a | b;
        else if (op === 26) r = a ^ b;
        else if (op === 28) r = a << (b & 31); // SHL, low 5 bits of count
        else if (op === 29) r = a >> (b & 31); // SHR, arithmetic
        else if (op === 30) r = (a >>> (b & 31)) | 0; // SHRU, logical
        else if (op === 32) r = a === b ? 1 : 0;
        else if (op === 33) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0; // LTU, unsigned
        sp -= 2; d[sp++] = r;
        break;
      }
      case 48: case 49: case 50: { // JMP / JZ / JNZ
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        let take = op === 48;
        if (op !== 48) { const v = d[--sp]; take = op === 49 ? v === 0 : v !== 0; }
        if (take) pc = nx + rel;
        break;
      }
      case 51: // CALL, unsigned 16-bit target
        if (cp === 64) return end(7);
        c[cp++] = nx;
        pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 52: // RET
        if (cp === 0) return end(8);
        pc = c[--cp];
        break;
      case 64: { // LOAD
        const a = d[sp - 1];
        if (a < 0 || a >= 256) return end(6);
        d[sp - 1] = m[a];
        break;
      }
      case 65: { // STORE (v addr --), addr on top
        const a = d[sp - 1], v = d[sp - 2];
        if (a < 0 || a >= 256) return end(6);
        sp -= 2; m[a] = v;
        break;
      }
      case 80: { // PRINT, decimal ASCII, no newline
        const s = String(d[sp - 1]);
        if (ol + s.length > 65536) return end(11); // writes nothing
        sp--;
        for (let i = 0; i < s.length; i++) out[ol++] = s.charCodeAt(i);
        break;
      }
      case 81: // PUTC, low byte
        if (ol + 1 > 65536) return end(11);
        out[ol++] = d[--sp] & 255;
        break;
      case 82: // IN, -1 once input is exhausted
        d[sp++] = ip < inp.length ? inp[ip++] : -1;
        break;
      case 83: // EXIT, low byte of popped value
        return end(d[--sp] & 255);
      default: return end(5); // unreachable (IM[op] < 0 trapped above)
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const dir = join(I, id);
  let prog: Buffer, inp: Buffer;
  try { prog = readFileSync(join(dir, 'program.bin')); inp = readFileSync(join(dir, 'input.bin')); }
  catch { continue; }
  const [stdout, code] = run(new Uint8Array(prog), new Uint8Array(inp));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), stdout);
  writeFileSync(join(O, id, 'exit.txt'), `${code}\n`);
}
