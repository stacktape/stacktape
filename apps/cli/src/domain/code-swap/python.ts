import type { RailpackPlan } from '@stacktape/packaging/image/railpack';

// Only the deliberately small requirements format supported by source overlays. The install also enforces hashes:
// syntax alone cannot establish that transitive dependencies are present.
export const pythonHashLock = (requirements: string): boolean => {
  const entries = requirements
    .replace(/\\\r?\n/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s*#.*$/, '').trim())
    .filter(Boolean);
  return (
    entries.length > 0 &&
    entries.every((line) =>
      /^[A-Za-z0-9_.-]+(?:\[[A-Za-z0-9_,.-]+\])?==[A-Za-z0-9_.+!-]+(?:\s+--hash=sha256:[a-f0-9]{64})+$/.test(line)
    )
  );
};

export const strictPythonPlan = (plan: RailpackPlan): RailpackPlan | undefined => {
  let installs = 0;
  // Includes the compiler-toolchain retry command, so it cannot bypass strict installation.
  const strict = (value: unknown, key?: string): unknown => {
    if (typeof value === 'string' && key === 'cmd') {
      return value.replace(/\bpip install -r requirements\.txt\b/g, () => {
        installs++;
        return 'pip install --require-hashes -r requirements.txt';
      });
    }
    if (Array.isArray(value)) return value.map((item) => strict(item));
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, strict(item, key)]));
    return value;
  };
  const steps = plan.steps?.map((step) => strict(step));
  return installs ? { ...plan, steps } : undefined;
};

// Hash the installed bytes, paths and symlink targets, rather than trusting lock text or package versions. Include
// the interpreter and system libraries as well as the virtualenv. Ignore only timestamp-dependent bytecode caches.
// Isolated Python prevents customer source/sitecustomize in /app from participating in this measurement.
export const pythonEnvironmentFingerprint = `
import hashlib, os, pathlib
h = hashlib.sha256()
for root in ['/app/.venv', '/usr/local', '/usr/lib', '/lib']:
    for directory, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d != '__pycache__')
        for name in sorted(dirs + files):
            p = pathlib.Path(directory) / name
            if p.suffix == '.pyc':
                continue
            h.update(str(p).encode() + b'\\0')
            if p.is_symlink():
                h.update(b'link\\0' + os.readlink(p).encode() + b'\\0')
            elif p.is_file():
                h.update(b'file\\0' + str(p.stat().st_mode).encode() + b'\\0')
                with p.open('rb') as f:
                    for block in iter(lambda: f.read(1048576), b''):
                        h.update(block)
                h.update(b'\\0')
print(h.hexdigest())
`;
