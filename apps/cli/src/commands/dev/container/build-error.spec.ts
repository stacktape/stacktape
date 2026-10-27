import { expect, test } from 'bun:test';
import { summarizeDockerBuildError } from './build-error';

// The end of a real railpack Go build that failed (r2w dogfood, 27 Oct 2026); the full error was 2.8 KB.
const goBuildFailure = `Error building docker image ordersapi-service-container:
Command failed with exit code 1: docker build [arguments omitted]

#0 building with "default" instance using docker driver

#14 copy / /app
#14 DONE 0.0s

#15 go build -ldflags=-w -s -o out
#15 0.147 mise WARN  deprecated [idiomatic.go.mod.go-directive]: the \`go\` directive in go.mod is only a minimum compatible version.
#15 0.209 # github.com/r2w/orders-api
#15 0.209 ./main.go:78:39: unknown field Missing in struct literal of type Order
#15 0.209 ./main.go:78:48: undefined: undefinedVar
#15 ERROR: process "go build -ldflags=-w -s -o out" did not complete successfully: exit code: 1
------
 > go build -ldflags=-w -s -o out:
0.147 mise WARN  deprecated [idiomatic.go.mod.go-directive]: the \`go\` directive in go.mod is only a minimum compatible version.
0.209 # github.com/r2w/orders-api
0.209 ./main.go:78:39: unknown field Missing in struct literal of type Order
0.209 ./main.go:78:48: undefined: undefinedVar
------
ERROR: failed to build: failed to solve: process "go build -ldflags=-w -s -o out" did not complete successfully: exit code: 1`;

test("a failed build keeps the failing step and the compiler's lines, once", () => {
  expect(summarizeDockerBuildError(goBuildFailure)).toBe(
    [
      'Docker build failed in step `go build -ldflags=-w -s -o out`:',
      '# github.com/r2w/orders-api',
      './main.go:78:39: unknown field Missing in struct literal of type Order',
      './main.go:78:48: undefined: undefinedVar'
    ].join('\n')
  );
});

test('without a failed step block, the lines that name an error remain', () => {
  const output = `Error building docker image web:
Command failed with exit code 1: docker build [arguments omitted]
#1 [internal] load build definition from Dockerfile
#1 DONE 0.0s
Dockerfile:3
ERROR: failed to build: failed to solve: dockerfile parse error on line 3: unknown instruction: RUNN`;
  expect(summarizeDockerBuildError(output)).toBe(
    'ERROR: failed to build: failed to solve: dockerfile parse error on line 3: unknown instruction: RUNN'
  );
  expect(summarizeDockerBuildError('Cannot connect to the Docker daemon')).toBeUndefined();
});
