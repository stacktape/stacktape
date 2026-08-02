import { describe, expect, test } from 'bun:test';
import { MISC_TYPES_CONVERTIBLE_TO_CLASSES } from '@stacktape/config-authoring/resource-metadata';
import { generateTypePropertiesClassDeclarations } from './generate-type-properties';

/**
 * The `type`/`properties` classes the npm package publishes.
 *
 * `IotIntegrationProps` used to have no declaration anywhere, so the generator had a compatibility branch that
 * emitted `constructor(properties: Record<string, unknown>)` for it. `@stacktape/config` owns the authored
 * declaration now and `plain.d.ts` generates it, so the branch was stale: it kept publishing a class that
 * accepted anything while the type next to it described `{ sql, sqlVersion? }`.
 */
const classDeclarations = generateTypePropertiesClassDeclarations();

/** The declaration block for one generated type-properties class. */
const classBlockFor = (className: string) => {
  const block = classDeclarations
    .split('export declare class ')
    .find((candidate) => candidate.startsWith(`${className} extends`));
  if (!block) throw new Error(`No generated class declaration for ${className}.`);
  return block;
};

describe('type-properties classes take their authored props', () => {
  test('IotIntegration constructs from the real IotIntegrationProps', () => {
    const iot = classBlockFor('IotIntegration');

    expect(iot).toContain(
      "constructor(properties: WithAuthoringNamedResourceReferences<import('./plain').IotIntegrationProps>)"
    );
    expect(iot).toContain("readonly type: 'iot'");
    expect(iot).not.toContain('Record<string, unknown>');
  });

  test('no generated class falls back to an untyped properties bag', () => {
    // The invariant the IoT branch broke. A props type with no declaration should be fixed at its source
    // rather than published as a class that accepts anything.
    expect(classDeclarations).not.toContain('Record<string, unknown>');
  });

  test('every non type-only class resolves its properties through the published plain declarations', () => {
    // Some props types are mapped (`HttpApiIntegrationProps` is published as `HttpApiIntegration['properties']`),
    // so the name is not always literal — but the constructor must always point into `./plain`, never at a
    // locally invented shape.
    const scriptProps = ['LocalScript', 'BastionScript', 'LocalScriptWithBastionTunneling'];

    for (const definition of MISC_TYPES_CONVERTIBLE_TO_CLASSES) {
      const { className } = definition;
      const typeOnly = 'typeOnly' in definition && definition.typeOnly;
      if (typeOnly || scriptProps.includes(className)) continue;
      const block = classBlockFor(className);
      expect(block, `${className} should construct from ./plain`).toContain(
        "constructor(properties: WithAuthoringNamedResourceReferences<import('./plain')"
      );
    }
  });

  test('discriminated unions resolve to their properties and volume mounts take their inner props', () => {
    expect(classBlockFor('HttpApiIntegration')).toContain(
      "extends BaseTypeProperties<'http-api-gateway', WithAuthoringNamedResourceReferences<import('./plain').HttpApiIntegration['properties']>>"
    );
    expect(classBlockFor('ContainerEfsMount')).toContain("import('./plain').ContainerEfsMount['properties']");
    expect(classBlockFor('LambdaEfsMount')).toContain("import('./plain').LambdaEfsMount['properties']");
    expect(classBlockFor('LambdaS3FilesMount')).toContain("import('./plain').LambdaS3FilesMount['properties']");
    expect(classBlockFor('SqsQueueNotEmptyTrigger')).toContain("extends BaseTypeOnly<'sqs-queue-not-empty'>");
  });
});
