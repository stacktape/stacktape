import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('src', { recursive: true });
await writeFile('src/release.ts', "export const release = 'static-release-one';\n");
