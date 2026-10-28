import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { getDotnetLambdaHandler } from './dotnet-lambda-buildpack';

let root: string;

const files = {
  'orders/Orders.csproj': '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup></PropertyGroup></Project>',
  'orders/src/Function.cs':
    '// class Helper is not the handler\nnamespace Orders.Api;\n\npublic class Helper {}\npublic class Function\n{\n}\n',
  'billing/Billing.csproj':
    '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><AssemblyName>BillingLambda</AssemblyName></PropertyGroup></Project>',
  'billing/Handler.cs': 'namespace Billing\n{\n    public class Invoices { }\n}\n',
  'executable/Executable.csproj': '<Project Sdk="Microsoft.NET.Sdk"></Project>',
  'executable/Program.cs':
    'using Amazon.Lambda.RuntimeSupport;\nawait LambdaBootstrapBuilder.Create(handler).Build().RunAsync();\n',
  'explicit/src/Function.cs': 'namespace Explicit;\npublic class Function { }\n',
  'explicit/build/Explicit.Service.csproj': '<Project Sdk="Microsoft.NET.Sdk"></Project>'
};

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-dotnet-handler-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), contents);
    })
  );
});

afterAll(() => rm(root, { recursive: true, force: true }));

describe('.NET Lambda handler', () => {
  test.each([
    ['orders/src/Function.cs', {}, 'Orders::Orders.Api.Function::FunctionHandler'],
    ['orders/src/Function.cs', { handlerFunction: 'HandleAsync' }, 'Orders::Orders.Api.Function::HandleAsync'],
    // A complete handler, as SAM templates write it, is used as written.
    [
      'orders/src/Function.cs',
      { handlerFunction: 'Orders::Orders.Api.LambdaEntryPoint::FunctionHandlerAsync' },
      'Orders::Orders.Api.LambdaEntryPoint::FunctionHandlerAsync'
    ],
    ['billing/Handler.cs', {}, 'BillingLambda::Billing.Invoices::FunctionHandler'],
    ['executable/Program.cs', {}, 'Executable'],
    [
      'explicit/src/Function.cs',
      { projectFile: 'explicit/build/Explicit.Service.csproj' },
      'Explicit.Service::Explicit.Function::FunctionHandler'
    ]
  ])('%s with %p is %s', (entryfilePath, options, expected) => {
    expect(getDotnetLambdaHandler({ cwd: root, entryfilePath, ...options })).toBe(expected);
  });
});
