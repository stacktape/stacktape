import { afterAll, beforeAll, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { executeAwsSdkCommand } from '@stacktape/aws-read-only/executor';
import { TEMPLATE_STRUCTURE_LIMIT } from '@stacktape/aws-read-only/template-skeleton';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import {
  defineConfig,
  HttpApiGateway,
  HttpApiIntegration,
  JsBundleLambdaPackaging,
  LambdaFunction
} from '@stacktape/config-authoring';
import { stringifyToYaml } from '@utils/yaml';
import { synthesizeFixture } from '../../../tests/characterization/synthesis-fixture';
import { buildCliRunOutput, toToolText } from '../mcp/tool-output';

type Template = { Resources: Record<string, { Type: string; Properties?: Record<string, unknown> }> };

// The review of #394: Stacktape deploys its templates as YAML (`prepareTemplateForDeploy`), and GetTemplate returns
// the body as deployed. `aws call` must read such a template, and return it without the literal values it holds.
const baseline = (name: string) =>
  JSON.parse(
    readFileSync(join(import.meta.dir, `../../../tests/data-safety/baselines/${name}/v4.template.json`), 'utf8')
  ) as Template;
const template = baseline('serverless-api');

/** A stack of 24 functions behind one HTTP API, synthesized as `stacktape deploy` would: well over 100 resources. */
const synthesizeLargeStack = () =>
  synthesizeFixture({
    compiledConfig: defineConfig(() => {
      const gateway = new HttpApiGateway({});
      const functions = Object.fromEntries(
        Array.from({ length: 24 }, (_, index) => [
          `route${index}`,
          new LambdaFunction({
            packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' }),
            environment: { ROUTE_SECRET: `large_stack_literal_${index}` },
            events: [new HttpApiIntegration({ httpApiGatewayName: 'gateway', path: `/route-${index}`, method: 'GET' })]
          })
        ])
      );
      return { resources: { gateway, ...functions } };
    })({
      projectName: 'shop',
      stage: 'large',
      region: 'eu-west-1',
      cliArgs: {} as never,
      command: 'synth',
      awsProfile: '',
      user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
    }),
    workingDir: join(import.meta.dir, '../../../tests/characterization/fixtures/dense-application')
  }) as Promise<CloudFormationTemplate & Template>;

/** Deployed templates by stack name, and the request bodies CloudFormation received. */
const deployed: Record<string, Template> = { 'j2-v3-baseline-j2base': template };
const requestBodies: string[] = [];

let server: Server;
beforeAll(async () => {
  deployed['shop-large'] = await synthesizeLargeStack();
  server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => (body += chunk));
    request.on('end', () => {
      requestBodies.push(body);
      const stackName = new URLSearchParams(body).get('StackName') ?? '';
      const templateBody = stringifyToYaml(deployed[stackName])
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
      response.writeHead(200, { 'content-type': 'text/xml' });
      response.end(
        `<GetTemplateResponse xmlns="http://cloudformation.amazonaws.com/doc/2010-05-15/"><GetTemplateResult><TemplateBody>${templateBody}</TemplateBody><StagesAvailable><member>Original</member><member>Processed</member></StagesAvailable></GetTemplateResult></GetTemplateResponse>`
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.AWS_ENDPOINT_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  delete process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS;
}, 120_000);
afterAll(() => {
  delete process.env.AWS_ENDPOINT_URL;
  server.close();
});

const getTemplate = (stackName: string, input: Record<string, unknown> = {}) =>
  executeAwsSdkCommand(
    'cloudformation',
    'GetTemplate',
    { StackName: stackName, ...input },
    { region: 'eu-west-1', credentials: { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'example-secret' } }
  );

/** Every string in `node`. */
const stringsOf = (node: unknown): string[] =>
  typeof node === 'string'
    ? [node]
    : Array.isArray(node)
      ? node.flatMap(stringsOf)
      : node && typeof node === 'object'
        ? Object.values(node).flatMap(stringsOf)
        : [];

/** The names a template gives its parts: logical IDs, types, attributes of Fn::GetAtt and deletion policies. */
const namesOf = (source: Template) => {
  const attributes = (node: unknown): string[] =>
    Array.isArray(node)
      ? node.flatMap(attributes)
      : node && typeof node === 'object'
        ? Object.entries(node).flatMap(([key, value]) =>
            key === 'Fn::GetAtt'
              ? stringsOf(value)
              : key === 'DeletionPolicy' || key === 'UpdateReplacePolicy'
                ? [String(value)]
                : attributes(value)
          )
        : [];
  return new Set([
    '2010-09-09',
    ...Object.keys(source.Resources),
    ...Object.values(source.Resources).map(({ Type }) => Type),
    ...attributes(source)
  ]);
};

/** The strings of `result` that are neither a placeholder, a name of the template nor a reference. */
const literalsIn = (result: unknown, source: Template, allowed: string[] = []) => {
  const names = namesOf(source);
  return stringsOf(result).filter(
    (value) =>
      !allowed.includes(value) &&
      value !== '[value]' &&
      !names.has(value) &&
      !/^AWS::/.test(value) &&
      !/^(\$\{[^}]+\}|\[value\])+$/.test(value)
  );
};

/** The two MCP routes of an `aws` read: the dev tool's `aws` action and `stacktape_cli` running `aws call`. */
const mcpTexts = (data: unknown) => {
  const devTool = toToolText({
    ok: true,
    code: 'OK',
    message: 'Called cloudformation GetTemplate.',
    data: {
      session: {
        devSessionId: 'dev_0123456789abcdef',
        agentPort: 47123,
        startedAt: '2026-10-31T12:00:00.000Z',
        cwd: '/home/developer/projects/shop-application',
        stage: 'dev'
      },
      ok: true,
      data
    }
  }).content[0].text;
  const logLine = JSON.stringify({
    type: 'log',
    message: JSON.stringify({ ok: true, service: 'cloudformation', command: 'GetTemplate', data }, null, 2)
  });
  const cli = toToolText(
    buildCliRunOutput({
      command: 'aws:call',
      policy: { category: 'diagnostics', safety: 'readOnly' },
      result: {
        ok: true,
        code: 'OK',
        message: 'aws:call completed',
        data: { result: null },
        rawTail: logLine,
        resolvedContext: { cwd: '/home/developer/projects/shop-application' }
      }
    })
  ).content[0].text;
  return { devTool, cli };
};

test("a Stacktape stack's YAML template comes back as its structure, without its values", async () => {
  const result = await getTemplate('j2-v3-baseline-j2base');
  expect(result.ok).toBe(true);
  const data = result.ok ? (result.data as { Template: Template; StagesAvailable: string[] }) : undefined;
  const skeleton = data!.Template;

  // Every resource is there with its type, and what references name stays readable.
  expect(Object.keys(skeleton.Resources).sort()).toEqual(Object.keys(template.Resources).sort());
  for (const [logicalName, { Type }] of Object.entries(template.Resources)) {
    expect(skeleton.Resources[logicalName].Type).toBe(Type);
  }
  expect(data!.StagesAvailable).toEqual(['Original', 'Processed']);
  expect(result).not.toHaveProperty('data.TemplateBody');
  // No literal of the template comes back: every string is a placeholder, a name of the template or a reference.
  expect(literalsIn(skeleton, template)).toEqual([]);
  const functionName = Object.values(template.Resources).find(({ Type }) => Type === 'AWS::Lambda::Function')!
    .Properties!.FunctionName as string;
  expect(JSON.stringify(result)).not.toContain(functionName);
});

// r2an: GetTemplate of an ordinary 24-resource stack answered RESPONSE_TOO_LARGE through MCP. The skeleton was a
// pretty-printed string inside the result, which MCP encoded and indented again: 66 KB for 26 KB of structure.
test('an ordinary stack comes back whole within one MCP result, as data rather than a string', async () => {
  for (const [stackName, source] of [
    ['j2-v3-baseline-j2base', template],
    ['aurora', baseline('aurora-streaming')]
  ] as const) {
    deployed[stackName] = source;
    const result = await getTemplate(stackName);
    const data = (result as { data: { Template: Template } }).data;
    expect(Object.keys(data.Template.Resources).length).toBe(Object.keys(source.Resources).length);
    expect(JSON.stringify(data.Template).length).toBeLessThanOrEqual(TEMPLATE_STRUCTURE_LIMIT);

    for (const text of Object.values(mcpTexts(data))) {
      expect(text.length).toBeLessThanOrEqual(30_000);
      const envelope = JSON.parse(text);
      expect(envelope.ok).toBe(true);
      const returned = envelope.data.data?.Template ?? envelope.data.cli.result.data.Template;
      expect(Object.keys(returned.Resources).sort()).toEqual(Object.keys(source.Resources).sort());
    }
  }
});

test('a stack over the limit returns its resources by type, and chosen resources by logical ID', async () => {
  const large = deployed['shop-large'];
  const logicalIds = Object.keys(large.Resources);
  expect(logicalIds.length).toBeGreaterThan(100);

  const index = await getTemplate('shop-large');
  const { TemplateIndex, Note } = (index as { data: { TemplateIndex: any; Note: string } }).data;
  expect(index).not.toHaveProperty('data.Template');
  expect(TemplateIndex.ResourceCount).toBe(logicalIds.length);
  expect(
    Object.values(TemplateIndex.ResourcesByType as Record<string, string[]>)
      .flat()
      .sort()
  ).toEqual([...logicalIds].sort());
  const functionIds = TemplateIndex.ResourcesByType['AWS::Lambda::Function'] as string[];
  // The 24 functions and the service function Stacktape adds.
  expect(functionIds).toHaveLength(25);
  expect(Note).toContain('"LogicalResourceIds"');
  for (const text of Object.values(mcpTexts((index as { data: unknown }).data))) {
    expect(text.length).toBeLessThanOrEqual(30_000);
    expect(JSON.parse(text).ok).toBe(true);
  }

  // The selector is Stacktape's: CloudFormation never receives it.
  const before = requestBodies.length;
  const chosen = await getTemplate('shop-large', {
    LogicalResourceIds: [functionIds[3], 'NoSuchResource', functionIds[0]]
  });
  expect(requestBodies.slice(before).join()).not.toContain('LogicalResourceIds');
  const chosenData = (chosen as { data: { Template: Template; MissingLogicalResourceIds: string[] } }).data;
  expect(Object.keys(chosenData.Template.Resources)).toEqual([functionIds[3], functionIds[0]]);
  expect(chosenData.Template.Resources[functionIds[3]].Type).toBe('AWS::Lambda::Function');
  expect(chosenData.MissingLogicalResourceIds).toEqual(['NoSuchResource']);
  expect(JSON.stringify(chosen)).not.toContain('large_stack_literal_');
  expect(literalsIn(chosenData.Template, large, ['NoSuchResource'])).toEqual([]);

  // Asking for everything returns what fits and names the rest.
  const everything = await getTemplate('shop-large', { LogicalResourceIds: logicalIds.slice(0, 100) });
  const everythingData = (everything as { data: { Template: Template; OmittedLogicalResourceIds?: string[] } }).data;
  const returned = Object.keys(everythingData.Template.Resources);
  expect(JSON.stringify(everythingData.Template).length).toBeLessThanOrEqual(TEMPLATE_STRUCTURE_LIMIT);
  expect([...returned, ...(everythingData.OmittedLogicalResourceIds ?? [])]).toEqual(logicalIds.slice(0, 100));
  for (const text of Object.values(mcpTexts(everythingData))) expect(text.length).toBeLessThanOrEqual(30_000);

  for (const selection of [[], 'Fn', [1], Array.from({ length: 101 }, (_, i) => `R${i}`)]) {
    expect(await getTemplate('shop-large', { LogicalResourceIds: selection })).toMatchObject({
      ok: false,
      code: 'VALIDATION_ERROR'
    });
  }
});
