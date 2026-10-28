import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { synthesizeFixture } from '../characterization/synthesis-fixture';

/**
 * Lambda imports a Python or Ruby handler from the ZIP root, and the buildpack puts the dependency root (the directory
 * of `pyproject.toml` or `Gemfile`) there. A handler below that root keeps its directories; one beside it keeps the
 * name it always had. `python.test.ts` and `ruby.test.ts` in `packages/packaging/scripts/lambda-e2e` run the layout
 * below the root in Lambda.
 *
 * Java and .NET load a class, which the entry file's package or namespace qualifies. In the r2gg dogfood the Java
 * handler was the folder name, `shelf`, and Lambda could not load it. `java.test.ts` runs the derived handler in Lambda.
 */
let directory = '';

const files: Record<string, string> = {
  'pyproject.toml': '[project]\nname = "api"\nversion = "0.1.0"\n',
  'src/api.py': 'def handler(event, context):\n    return event\n',
  'workers/requirements.txt': '',
  'workers/worker.py': 'def run(event, context):\n    return event\n',
  Gemfile: 'source "https://rubygems.org"\n',
  'src/jobs/report.rb': 'def handler(event:, context:) = event\n',
  'billing/Gemfile': 'source "https://rubygems.org"\n',
  'billing/invoice.rb': 'def handler(event:, context:) = event\n',
  'functions/tax/pom.xml': '<project/>',
  'functions/tax/src/main/java/shelf/TaxHandler.java': 'package shelf;\npublic class TaxHandler {}\n',
  'orders/Orders.csproj': '<Project Sdk="Microsoft.NET.Sdk"></Project>',
  'orders/Function.cs': 'namespace Orders.Api;\npublic class Function { }\n'
};

const lambda = (entryfilePath: string, runtime: string, handlerFunction?: string) => `
    type: function
    properties:
      runtime: ${runtime}
      packaging:
        type: buildpack
        properties:
          entryfilePath: ${entryfilePath}${handlerFunction ? `\n          handlerFunction: ${handlerFunction}` : ''}`;

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'stacktape-language-handlers-'));
  for (const [path, contents] of Object.entries(files)) {
    await mkdir(dirname(join(directory, path)), { recursive: true });
    await writeFile(join(directory, path), contents);
  }
  await writeFile(
    join(directory, 'stacktape.yml'),
    `resources:
  pythonBelowRoot:${lambda('src/api.py', 'python3.12')}
  pythonBesideRoot:${lambda('workers/worker.py', 'python3.12', 'run')}
  rubyBelowRoot:${lambda('src/jobs/report.rb', 'ruby3.4')}
  rubyBesideRoot:${lambda('billing/invoice.rb', 'ruby3.4')}
  javaDefault:${lambda('functions/tax/src/main/java/shelf/TaxHandler.java', 'java21')}
  javaMethod:${lambda('functions/tax/src/main/java/shelf/TaxHandler.java', 'java21', 'process')}
  javaClassAndMethod:${lambda('functions/tax/src/main/java/shelf/TaxHandler.java', 'java21', 'TaxHandler::handleRequest')}
  dotnetDefault:${lambda('orders/Function.cs', 'dotnet8')}
`
  );
});

afterAll(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('handlers name the entry file by its path inside the ZIP, or its class for Java and .NET', async () => {
  const template = await synthesizeFixture({
    configPath: join(directory, 'stacktape.yml'),
    workingDir: directory,
    identity: { projectName: 'handlers', stage: 'test' }
  });
  const handler = (name: string) =>
    (template.Resources[cfLogicalNames.lambda(name)] as { Properties: { Handler: string } }).Properties.Handler;

  expect({
    pythonBelowRoot: handler('pythonBelowRoot'),
    pythonBesideRoot: handler('pythonBesideRoot'),
    rubyBelowRoot: handler('rubyBelowRoot'),
    rubyBesideRoot: handler('rubyBesideRoot'),
    javaDefault: handler('javaDefault'),
    javaMethod: handler('javaMethod'),
    javaClassAndMethod: handler('javaClassAndMethod'),
    dotnetDefault: handler('dotnetDefault')
  }).toEqual({
    pythonBelowRoot: 'src.api.handler',
    pythonBesideRoot: 'worker.run',
    rubyBelowRoot: 'src/jobs/report.handler',
    rubyBesideRoot: 'invoice.handler',
    javaDefault: 'shelf.TaxHandler::handleRequest',
    javaMethod: 'shelf.TaxHandler::process',
    // `init` writes this form; the package still comes from the entry file.
    javaClassAndMethod: 'shelf.TaxHandler::handleRequest',
    dotnetDefault: 'Orders::Orders.Api.Function::FunctionHandler'
  });
});
