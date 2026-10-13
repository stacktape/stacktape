import { expect, test } from 'bun:test';
import { AwsSdkManager } from '../../src/aws/sdk-manager';
import { startLoopbackAws, toQueryXml } from '../../scripts/operations/loopback-aws';

// Fault injection at the AWS wire boundary: empty continuation pages, malformed successes and service denial.
const fixture = async () => {
  const aws = await startLoopbackAws();
  const manager = new AwsSdkManager();
  manager.init({
    endpoint: aws.endpoint,
    region: 'eu-west-1',
    credentials: { accessKeyId: 'synthetic', secretAccessKey: 'synthetic' },
    plugins: []
  });
  return { aws, registry: manager.cloudFormationRegistry };
};
const arn = (name: string) => `arn:aws:cloudformation:eu-west-1:111122223333:type/resource/${name}`;
const xml = (operation: string, body: unknown) => ({ kind: 'xml' as const, operation, result: toQueryXml(body) });

test('registry accumulates all type and version pages through empty pages with independent cursors', async () => {
  const { aws, registry } = await fixture();
  try {
    aws.on('cloudformation.ListTypes', ({ input }) =>
      xml(
        'ListTypes',
        !input.NextToken
          ? { NextToken: 'empty-page' }
          : input.NextToken === 'empty-page'
            ? { TypeSummaries: [{ TypeName: 'Alpha', TypeArn: arn('Alpha') }], NextToken: 'last-page' }
            : { TypeSummaries: [{ TypeName: 'Beta', TypeArn: arn('Beta') }] }
      )
    );
    aws.on('cloudformation.ListTypeVersions', ({ input }) => {
      const name = String(input.Arn).split('/').at(-1)!;
      const body = !input.NextToken
        ? { NextToken: `${name}-empty` }
        : input.NextToken === `${name}-empty`
          ? { TypeVersionSummaries: [{ Arn: `${arn(name)}/1`, VersionId: '1' }], NextToken: `${name}-last` }
          : input.NextToken === `${name}-last`
            ? { TypeVersionSummaries: [{ Arn: `${arn(name)}/2`, VersionId: '2', IsDefaultVersion: true }] }
            : (() => {
                throw new Error('Crossed version cursor');
              })();
      return xml('ListTypeVersions', body);
    });
    const result = await registry.listTypesWithVersions();
    expect(Object.keys(result)).toEqual(['Alpha', 'Beta']);
    for (const name of ['Alpha', 'Beta'])
      expect(result[name]).toEqual([
        { Arn: `${arn(name)}/1`, VersionId: '1' },
        { Arn: `${arn(name)}/2`, VersionId: '2', IsDefaultVersion: true }
      ]);
    aws.on('cloudformation.ListTypes', () => xml('ListTypes', {}));
    expect(await registry.listTypesWithVersions()).toEqual({});
    expect(aws.unexpected).toEqual([]);
  } finally {
    await aws.close();
  }
});

test('registry refuses malformed type/version identities and propagates service errors', async () => {
  const { aws, registry } = await fixture();
  try {
    for (const malformed of [
      { TypeName: 'Only' },
      { TypeArn: arn('Only') },
      { TypeName: '', TypeArn: arn('Only') },
      { TypeName: 'Only', TypeArn: '' }
    ]) {
      aws.on('cloudformation.ListTypes', () => xml('ListTypes', { TypeSummaries: [malformed] }));
      await expect(registry.listTypesWithVersions()).rejects.toThrow('without a type name or a type ARN');
    }
    aws.on('cloudformation.ListTypes', () =>
      xml('ListTypes', { TypeSummaries: [{ TypeName: 'Only', TypeArn: arn('Only') }] })
    );
    for (const Arn of [undefined, '']) {
      aws.on('cloudformation.ListTypeVersions', () =>
        xml('ListTypeVersions', { TypeVersionSummaries: [{ VersionId: '1', Arn }] })
      );
      await expect(registry.listTypesWithVersions()).rejects.toThrow('version of Only without an ARN');
    }
    aws.on('cloudformation.ListTypeVersions', () => ({
      kind: 'error',
      code: 'AccessDenied',
      message: 'Injected registry denial',
      status: 403
    }));
    await expect(registry.listTypesWithVersions()).rejects.toThrow('Injected registry denial');
    expect(aws.unexpected).toEqual([]);
  } finally {
    await aws.close();
  }
});
