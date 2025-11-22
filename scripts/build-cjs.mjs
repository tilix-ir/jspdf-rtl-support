import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: root });
}

run('node --version');
run('tsc -p tsconfig.cjs.json');

const from = path.resolve(root, 'dist-cjs', 'rtl-support.js');
const toDir = path.resolve(root, 'dist');
const to = path.resolve(toDir, 'rtl-support.cjs');

if (!fs.existsSync(from)) {
  throw new Error('dist-cjs/rtl-support.js not found; CJS build failed');
}
if (!fs.existsSync(toDir)) fs.mkdirSync(toDir, { recursive: true });
fs.copyFileSync(from, to);
console.log('Created', path.relative(root, to));
