import { afterEach, describe, expect, test } from 'bun:test';
import { CloudFormationClient, ListTypesCommand, ListTypeVersionsCommand } from '@aws-sdk/client-cloudformation';
import { AwsSdkManager } from '../../src/aws/sdk-manager';
import type { ListTypesCommandInput, TypeSummary, TypeVersionSummary } from '@aws-sdk/client-cloudformation';

const originalSend = CloudFormationClient.prototype.send;

const LIST_TYPES_INPUT: ListTypesCommandInput = { DeprecatedStatus: 'LIVE', Type: 'RESOURCE', Visibility: 'PRIVATE' };

type TypePage = { TypeSummaries?: Partial<TypeSummary>[]; NextToken?: string };
type VersionPage = { TypeVersionSummaries?: Partial<TypeVersionSummary>[]; NextToken?: string };

const privateType = (name: string): Partial<TypeSummary> => ({
  TypeName: name,
  TypeArn: `arn:aws:cloudformation:eu-west-1:123456789012:type/resource/${name}`,
  Type: 'RESOURCE'
});

const version = (typeName: string, versionId: string, overrides: Partial<TypeVersionSummary> = {}) => ({
  Arn: `arn:aws:cloudformation:eu-west-1:123456789012:type/resource/${typeName}/${versionId}`,
  VersionId: versionId,
  Description: versionId,
  ...overrides
});

/**
 * `listAllPrivateCloudformationResourceTypesWithVersions` is the boundary between the registry pages CloudFormation
 * returns and the type/version map the registry manager keys, compares and deregisters by. These pin what it
 * accumulates, what it rejects, and how it pages.
 *
 * The seam is `CloudFormationClient.prototype.send`, which is global to the process and is also the seam the
 * stack-event suite uses. Three things keep the two from interfering, and the last one matters most:
 *
 * - `describe.serial` states the intent, but on Bun 1.3.9 it does not by itself override `bun test --concurrent`, so
 *   every case is `test.serial`.
 * - Restoration is ownership-based, so a case that never stubbed cannot restore on another's behalf.
 * - The stub answers only `ListTypes` and `ListTypeVersions`. Any other command — including the `DescribeStackEvents`
 *   the other suite works with — is refused rather than answered, so a crossed stub fails loudly instead of quietly
 *   returning registry pages to an unrelated caller.
 */
describe.serial('private registry pagination', () => {
  let sentCommands: (ListTypesCommand | ListTypeVersionsCommand)[] = [];
  let stubInstalledByThisTest = false;

  /** `versionPages` is keyed by type ARN, so each type advances through its own pages independently. */
  const stubRegistry = ({
    typePages,
    versionPages = {}
  }: {
    typePages: TypePage[];
    versionPages?: Record<string, VersionPage[]>;
  }) => {
    sentCommands = [];
    const typePageCursor = { index: 0 };
    const versionCursors: Record<string, number> = {};

    const stubbedSend = (command: unknown) => {
      if (command instanceof ListTypesCommand) {
        sentCommands.push(command);
        const page = typePages[typePageCursor.index];
        typePageCursor.index += 1;
        if (!page) {
          throw new Error(`Unexpected ListTypes request number ${typePageCursor.index}.`);
        }
        return Promise.resolve(page);
      }
      if (command instanceof ListTypeVersionsCommand) {
        sentCommands.push(command);
        const arn = command.input.Arn ?? '';
        const pages = versionPages[arn];
        if (!pages) {
          throw new Error(`No version pages configured for ${arn}.`);
        }
        const cursor = versionCursors[arn] ?? 0;
        versionCursors[arn] = cursor + 1;
        const page = pages[cursor];
        if (!page) {
          throw new Error(`Unexpected ListTypeVersions request number ${cursor + 1} for ${arn}.`);
        }
        return Promise.resolve(page);
      }
      throw new Error('Refusing to answer a command other than ListTypes or ListTypeVersions with registry pages.');
    };

    CloudFormationClient.prototype.send = stubbedSend as unknown as typeof originalSend;
    stubInstalledByThisTest = true;
  };

  const managerWith = (getErrorHandlerFn?: (message: string) => (error: Error) => never) => {
    const manager = new AwsSdkManager();
    manager.init({
      credentials: { accessKeyId: 'AKIA', secretAccessKey: 'secret' },
      region: 'eu-west-1',
      ...(getErrorHandlerFn ? { getErrorHandlerFn } : {})
    });
    return manager;
  };

  const listRegistry = (getErrorHandlerFn?: (message: string) => (error: Error) => never) => {
    if (!stubInstalledByThisTest) {
      throw new Error('Refusing to call the registry without a stubbed CloudFormationClient.prototype.send.');
    }
    return managerWith(getErrorHandlerFn).listAllPrivateCloudformationResourceTypesWithVersions();
  };

  const recordingErrorHandler = () => {
    const seen: { message: string; error: Error }[] = [];
    const getErrorHandlerFn = (message: string) => (error: Error) => {
      seen.push({ message, error });
      throw error;
    };
    return { seen, getErrorHandlerFn };
  };

  const arnOf = (name: string) => `arn:aws:cloudformation:eu-west-1:123456789012:type/resource/${name}`;
  const inputsOf = () => sentCommands.map((command) => command.input);

  afterEach(() => {
    if (stubInstalledByThisTest) {
      CloudFormationClient.prototype.send = originalSend;
      stubInstalledByThisTest = false;
    }
    sentCommands = [];
  });

  test.serial('accumulates several type pages in service order and follows their tokens', async () => {
    stubRegistry({
      typePages: [
        { TypeSummaries: [privateType('First'), privateType('Second')], NextToken: 'types-2' },
        { TypeSummaries: [privateType('Third')] }
      ],
      versionPages: {
        [arnOf('First')]: [{ TypeVersionSummaries: [version('First', '1')] }],
        [arnOf('Second')]: [{ TypeVersionSummaries: [version('Second', '1')] }],
        [arnOf('Third')]: [{ TypeVersionSummaries: [version('Third', '1')] }]
      }
    });

    const registry = await listRegistry();

    expect(Object.keys(registry)).toEqual(['First', 'Second', 'Third']);
    const typeRequests = inputsOf().filter((input) => 'Visibility' in input);
    expect(typeRequests).toEqual([LIST_TYPES_INPUT, { ...LIST_TYPES_INPUT, NextToken: 'types-2' }]);
  });

  test.serial('accumulates several version pages for one type in page order', async () => {
    stubRegistry({
      typePages: [{ TypeSummaries: [privateType('Only')] }],
      versionPages: {
        [arnOf('Only')]: [
          { TypeVersionSummaries: [version('Only', '1'), version('Only', '2')], NextToken: 'versions-2' },
          { TypeVersionSummaries: [version('Only', '3')] }
        ]
      }
    });

    const registry = await listRegistry();

    expect(registry.Only.map(({ VersionId }) => VersionId)).toEqual(['1', '2', '3']);
  });

  test.serial('passes the type ARN unchanged on every version request and adds only the token', async () => {
    stubRegistry({
      typePages: [{ TypeSummaries: [privateType('Only')] }],
      versionPages: {
        [arnOf('Only')]: [
          { TypeVersionSummaries: [version('Only', '1')], NextToken: 'versions-2' },
          { TypeVersionSummaries: [version('Only', '2')] }
        ]
      }
    });

    await listRegistry();

    const versionRequests = inputsOf().filter((input) => 'Arn' in input);
    expect(versionRequests).toEqual([{ Arn: arnOf('Only') }, { Arn: arnOf('Only'), NextToken: 'versions-2' }]);
  });

  test.serial('treats a type page without summaries as empty and still follows its token', async () => {
    stubRegistry({
      typePages: [
        { NextToken: 'types-2' },
        { TypeSummaries: [], NextToken: 'types-3' },
        { TypeSummaries: [privateType('Late')] }
      ],
      versionPages: { [arnOf('Late')]: [{ TypeVersionSummaries: [version('Late', '1')] }] }
    });

    const registry = await listRegistry();

    expect(inputsOf().filter((input) => 'Visibility' in input)).toHaveLength(3);
    expect(Object.keys(registry)).toEqual(['Late']);
  });

  test.serial('treats a version page without summaries as empty and still follows its token', async () => {
    stubRegistry({
      typePages: [{ TypeSummaries: [privateType('Only')] }],
      versionPages: {
        [arnOf('Only')]: [
          { NextToken: 'versions-2' },
          { TypeVersionSummaries: [], NextToken: 'versions-3' },
          { TypeVersionSummaries: [version('Only', '9')] }
        ]
      }
    });

    const registry = await listRegistry();

    expect(inputsOf().filter((input) => 'Arn' in input)).toHaveLength(3);
    expect(registry.Only.map(({ VersionId }) => VersionId)).toEqual(['9']);
  });

  test.serial('yields an empty registry when no private type is registered', async () => {
    stubRegistry({ typePages: [{ TypeSummaries: [] }] });

    expect(await listRegistry()).toEqual({});
  });

  // Absent and empty are the same kind of malformed success: neither can key the result or address a request, so the
  // guards treat them alike rather than letting `''` through as a "present" identifier.
  const malformedCases: [string, Partial<TypeSummary>][] = [
    ['a type without a name', { TypeArn: arnOf('Nameless') }],
    ['a type without an ARN', { TypeName: 'Arnless' }],
    ['a type whose name is empty', { TypeName: '', TypeArn: arnOf('Empty') }],
    ['a type whose ARN is empty', { TypeName: 'EmptyArn', TypeArn: '' }]
  ];

  for (const [description, malformed] of malformedCases) {
    test.serial(`routes ${description} to the configured error handler`, async () => {
      stubRegistry({ typePages: [{ TypeSummaries: [malformed] }] });
      const { seen, getErrorHandlerFn } = recordingErrorHandler();

      await expect(listRegistry(getErrorHandlerFn)).rejects.toThrow(/without a type name or a type ARN/);

      expect(seen).toHaveLength(1);
      expect(seen[0].message).toBe('Failed to list private cloudformation types.');
    });
  }

  const malformedVersionArns: [string, string | undefined][] = [
    ['without an ARN', undefined],
    // An empty ARN would otherwise be carried all the way to `deregisterPrivateCloudformationType`, which addresses
    // the version by exactly this string.
    ['whose ARN is empty', '']
  ];

  for (const [description, Arn] of malformedVersionArns) {
    test.serial(`routes a version ${description} to the configured error handler`, async () => {
      stubRegistry({
        typePages: [{ TypeSummaries: [privateType('Only')] }],
        versionPages: {
          [arnOf('Only')]: [{ TypeVersionSummaries: [version('Only', '1', { Arn })] }]
        }
      });
      const { seen, getErrorHandlerFn } = recordingErrorHandler();

      await expect(listRegistry(getErrorHandlerFn)).rejects.toThrow(/version of Only without an ARN/);

      expect(seen).toHaveLength(1);
      expect(seen[0].message).toBe('Failed to list private cloudformation types.');
    });
  }

  test.serial('keeps optional version metadata optional', async () => {
    stubRegistry({
      typePages: [{ TypeSummaries: [privateType('Only')] }],
      versionPages: {
        [arnOf('Only')]: [
          {
            TypeVersionSummaries: [
              { Arn: arnOf('Only'), VersionId: '1' },
              version('Only', '2', { IsDefaultVersion: true })
            ]
          }
        ]
      }
    });

    const registry = await listRegistry();

    // A version carrying only its ARN is still a usable version; the registry manager treats the rest as absent.
    expect(registry.Only[0].Description).toBeUndefined();
    expect(registry.Only[0].IsDefaultVersion).toBeUndefined();
    expect(registry.Only[1].IsDefaultVersion).toBe(true);
  });

  test.serial('paginates independent types without sharing pagination state', async () => {
    stubRegistry({
      typePages: [{ TypeSummaries: [privateType('Alpha'), privateType('Beta')] }],
      versionPages: {
        [arnOf('Alpha')]: [
          { TypeVersionSummaries: [version('Alpha', 'a1')], NextToken: 'alpha-2' },
          { TypeVersionSummaries: [version('Alpha', 'a2')] }
        ],
        [arnOf('Beta')]: [
          { TypeVersionSummaries: [version('Beta', 'b1')], NextToken: 'beta-2' },
          { TypeVersionSummaries: [version('Beta', 'b2')] }
        ]
      }
    });

    const registry = await listRegistry();

    expect(registry.Alpha.map(({ VersionId }) => VersionId)).toEqual(['a1', 'a2']);
    expect(registry.Beta.map(({ VersionId }) => VersionId)).toEqual(['b1', 'b2']);
    // Both types issue their first version request before either issues its second, and each follows its own token —
    // the pagination cursors never crossed.
    expect(inputsOf().filter((input) => 'Arn' in input)).toEqual([
      { Arn: arnOf('Alpha') },
      { Arn: arnOf('Beta') },
      { Arn: arnOf('Alpha'), NextToken: 'alpha-2' },
      { Arn: arnOf('Beta'), NextToken: 'beta-2' }
    ]);
  });

  test.serial('refuses a CloudFormation command from another suite rather than answering it', async () => {
    // Keeps the guard non-vacuous and proves this stub cannot serve the stack-event suite's command.
    stubRegistry({ typePages: [{ TypeSummaries: [] }] });

    await expect(managerWith().getStackEvents('some-stack', new Date())).rejects.toThrow(
      /other than ListTypes or ListTypeVersions/
    );

    expect(sentCommands).toHaveLength(0);
  });

  test.serial('restores the real send implementation between tests', () => {
    expect(CloudFormationClient.prototype.send).toBe(originalSend);
  });
});
