import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const source = fileURLToPath(new URL('../src/framework-icon/assets', import.meta.url));
const destination = fileURLToPath(new URL('../dist/framework-icon/assets', import.meta.url));

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });

console.info(`Copied framework icon assets inside ${packageRoot}`);
