// Preload for `platform-runtime.spec.ts`. The real CLI entry runs as a process and opens its interactive launcher,
// which loads OpenTUI. With `PLATFORM_RUNTIME_HOST=alpine`, the one file check the CLI uses to detect Alpine answers
// yes. When OpenTUI imports its Linux native package, the package name is recorded and the process exits before that
// package runs, so no native library is loaded on this host.
import { writeFileSync } from 'node:fs';
import fsExtra from 'fs-extra';

const recordPath = process.env.PLATFORM_RUNTIME_RECORD;
if (!recordPath) throw new Error('PLATFORM_RUNTIME_RECORD is required.');
if (process.env.PLATFORM_RUNTIME_HOST === 'alpine') {
  const existsSync = fsExtra.existsSync;
  fsExtra.existsSync = ((path: string) => path === '/etc/alpine-release' || existsSync(path)) as typeof existsSync;
}

const NATIVE_PACKAGE = /[\\/]@opentui[\\/](core-linux-[\w-]+)[\\/]index\.bun\.js$/;

Bun.plugin({
  name: 'opentui-native-selection',
  setup(build) {
    build.onLoad({ filter: NATIVE_PACKAGE }, ({ path }) => {
      writeFileSync(recordPath, `@opentui/${NATIVE_PACKAGE.exec(path)?.[1]}`);
      process.exit(0);
    });
  }
});
