import { afterAll, beforeAll, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { executeAwsSdkCommand } from '@stacktape/aws-read-only/executor';
import { stringifyToYaml } from '@utils/yaml';

// The review of #394: Stacktape deploys its templates as YAML (`prepareTemplateForDeploy`), and GetTemplate returns
// the body as deployed. `aws call` must read such a template, and return it without the literal values it holds.
const template = JSON.parse(
  readFileSync(join(import.meta.dir, '../../../tests/data-safety/baselines/serverless-api/v4.template.json'), 'utf8')
) as { Resources: Record<string, { Type: string; Properties?: Record<string, unknown> }> };

let server: Server;
beforeAll(async () => {
  const body = stringifyToYaml(template).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  server = createServer((request, response) => {
    request.resume();
    request.on('end', () => {
      response.writeHead(200, { 'content-type': 'text/xml' });
      response.end(
        `<GetTemplateResponse xmlns="http://cloudformation.amazonaws.com/doc/2010-05-15/"><GetTemplateResult><TemplateBody>${body}</TemplateBody></GetTemplateResult></GetTemplateResponse>`
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.AWS_ENDPOINT_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  delete process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS;
});
afterAll(() => {
  delete process.env.AWS_ENDPOINT_URL;
  server.close();
});

/** Every string in `node`. */
const stringsOf = (node: unknown): string[] =>
  typeof node === 'string'
    ? [node]
    : Array.isArray(node)
      ? node.flatMap(stringsOf)
      : node && typeof node === 'object'
        ? Object.values(node).flatMap(stringsOf)
        : [];

test("a Stacktape stack's YAML template comes back as its structure, without its values", async () => {
  const result = await executeAwsSdkCommand(
    'cloudformation',
    'GetTemplate',
    { StackName: 'j2-v3-baseline-j2base' },
    { region: 'eu-west-1', credentials: { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'example-secret' } }
  );
  expect(result.ok).toBe(true);
  const skeleton = JSON.parse(result.ok ? (result.data as { TemplateBody: string }).TemplateBody : '{}');

  // Every resource is there with its type, and what references name stays readable.
  expect(Object.keys(skeleton.Resources).sort()).toEqual(Object.keys(template.Resources).sort());
  for (const [logicalName, { Type }] of Object.entries(template.Resources)) {
    expect(skeleton.Resources[logicalName].Type).toBe(Type);
  }
  // The names a template gives its parts: logical IDs, types, attributes of Fn::GetAtt and deletion policies.
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
  const names = new Set([
    '2010-09-09',
    ...Object.keys(template.Resources),
    ...Object.values(template.Resources).map(({ Type }) => Type),
    ...attributes(template)
  ]);
  // No literal of the template comes back: every string is a placeholder, a name of the template or a reference.
  const literals = stringsOf(skeleton).filter(
    (value) =>
      value !== '[value]' && !names.has(value) && !/^AWS::/.test(value) && !/^(\$\{[^}]+\}|\[value\])+$/.test(value)
  );
  expect(literals).toEqual([]);
  const functionName = Object.values(template.Resources).find(({ Type }) => Type === 'AWS::Lambda::Function')!
    .Properties!.FunctionName as string;
  expect(result.ok && (result.data as { TemplateBody: string }).TemplateBody).not.toContain(functionName);
});
