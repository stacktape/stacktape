import { expect, test } from 'bun:test';
import { describeContainerExit } from './exit-reason';

// r2cc: a FastAPI container rebuilt with a syntax error in main.py failed with only `SyntaxError: invalid syntax`; the
// location was in the log alone. Uvicorn imports the app through importlib, whose frames come last.
test('a Python syntax error quotes the file, line and caret with the exception', () => {
  const stderr = [
    'Traceback (most recent call last):',
    '  File "/app/.venv/bin/uvicorn", line 10, in <module>',
    '    sys.exit(main())',
    '             ~~~~^^',
    '  File "/app/.venv/lib/python3.13/site-packages/uvicorn/importer.py", line 19, in import_from_string',
    '    module = importlib.import_module(module_str)',
    '  File "/usr/local/lib/python3.13/importlib/__init__.py", line 88, in import_module',
    '    return _bootstrap._gcd_import(name[level:], package, level)',
    '  File "<frozen importlib._bootstrap>", line 1404, in _gcd_import',
    '  File "<frozen importlib._bootstrap_external>", line 1091, in source_to_code',
    '  File "/app/main.py", line 72',
    '    def broken(:',
    '               ^',
    'SyntaxError: invalid syntax'
  ].join('\n');
  expect(describeContainerExit(stderr)).toBe(
    ['  File "/app/main.py", line 72', '    def broken(:', '               ^', 'SyntaxError: invalid syntax'].join('\n')
  );
});

// r2cc finding 1: the exception is raised deep in botocore; the app's own frame is the one to fix.
test("a Python exception raised in a library quotes the app's last frame", () => {
  const stderr = [
    'INFO:     Started server process [1]',
    'Traceback (most recent call last):',
    '  File "/app/main.py", line 12, in <module>',
    '    s3 = boto3.client("s3")',
    '  File "/app/.venv/lib/python3.13/site-packages/boto3/__init__.py", line 92, in client',
    '    return _get_default_session().client(*args, **kwargs)',
    '  File "/app/.venv/lib/python3.13/site-packages/botocore/regions.py", line 278, in _endpoint_for_partition',
    '    raise NoRegionError()',
    'botocore.exceptions.NoRegionError: You must specify a region.'
  ].join('\n');
  expect(describeContainerExit(stderr)).toBe(
    [
      '  File "/app/main.py", line 12, in <module>',
      '    s3 = boto3.client("s3")',
      'botocore.exceptions.NoRegionError: You must specify a region.'
    ].join('\n')
  );
});

test('a Node syntax error quotes the location and source line', () => {
  const stderr = [
    '/app/dist/index.js:12',
    '  app.get("/", (req, res) => {;',
    '                              ^',
    '',
    "SyntaxError: Unexpected token ';'",
    '    at wrapSafe (node:internal/modules/cjs/loader:1378:20)',
    '    at Module._compile (node:internal/modules/cjs/loader:1428:41)',
    '',
    'Node.js v22.11.0'
  ].join('\n');
  expect(describeContainerExit(stderr)).toBe(
    [
      '/app/dist/index.js:12',
      '  app.get("/", (req, res) => {;',
      '                              ^',
      "SyntaxError: Unexpected token ';'"
    ].join('\n')
  );
});

test("a Node error thrown at startup quotes the app's first stack frame", () => {
  const stderr = [
    "Error: Cannot find module './routes'",
    '    at Module._resolveFilename (node:internal/modules/cjs/loader:1225:15)',
    '    at require (/app/node_modules/express/lib/router.js:3:1)',
    '    at Object.<anonymous> (/app/server.js:4:16)',
    '    at Module._compile (node:internal/modules/cjs/loader:1504:14)'
  ].join('\n');
  expect(describeContainerExit(stderr)).toBe(
    ["Error: Cannot find module './routes'", '    at Object.<anonymous> (/app/server.js:4:16)'].join('\n')
  );
});

test('a Ruby error quotes its location line, and a syntax error its source', () => {
  expect(
    describeContainerExit(
      [
        "/app/app.rb:3:in '<main>': undefined local variable or method 'foo' for main (NameError)",
        "\tfrom /usr/local/bin/rackup:25:in '<main>'"
      ].join('\n')
    )
  ).toBe("/app/app.rb:3:in '<main>': undefined local variable or method 'foo' for main (NameError)");
  expect(
    describeContainerExit(
      [
        '/usr/local/lib/ruby/3.4.0/bundled_gems.rb:82:in require: --> /app/app.rb',
        '/app/app.rb:5: syntax errors found (SyntaxError)',
        '  4 | get "/" do',
        '> 5 |   [1, 2',
        '    |        ^ unexpected end-of-input; expected a `]` to close the array',
        '  6 | end'
      ].join('\n')
    )
  ).toBe(
    [
      '/app/app.rb:5: syntax errors found (SyntaxError)',
      '> 5 |   [1, 2',
      '    |        ^ unexpected end-of-input; expected a `]` to close the array'
    ].join('\n')
  );
});

test('other programs give their last line that mentions an error', () => {
  expect(describeContainerExit('starting\nERROR: config file missing\nbye\n')).toBe('ERROR: config file missing');
  expect(describeContainerExit('just exited\n')).toBe('just exited');
  expect(describeContainerExit('')).toBeUndefined();
});
