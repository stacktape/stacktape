import { readdirSync } from 'node:fs';

const names = readdirSync('migrations').sort();
console.info('variant-bluegreen', names.join(' '));
if (names.includes('fail.txt')) process.exit(1);
