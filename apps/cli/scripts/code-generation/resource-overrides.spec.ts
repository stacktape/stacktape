import { describe, expect, test } from 'bun:test';
import { CHILD_RESOURCES } from '@stacktape/config-authoring/child-resources';
import { getResourceByClassName, getResourcesWithOverrides } from '@stacktape/config-authoring/class-config';
import { REFERENCEABLE_PARAMS } from '@stacktape/config-authoring/resource-metadata';
import { generateAugmentedPropsTypes } from './generate-augmented-props';
import { generateOverrideTypes, generateTransformsTypes } from './generate-overrides';
import { generateResourceClassDeclarations } from './generate-resource-classes';

/**
 * `overrides`/`transforms` are generated from a resource's CloudFormation children, and the class constructor,
 * the augmented props and the override/transform types are three separate generators. They all have to agree:
 * when one emitted `ConvexPropsWithOverrides` while another skipped `ConvexOverrides`, the published
 * declarations referenced types that existed nowhere. The resource metadata is the one place that decides.
 */
const classDeclarations = generateResourceClassDeclarations(REFERENCEABLE_PARAMS);
const assembledDeclarations = [
  generateAugmentedPropsTypes(),
  classDeclarations,
  generateOverrideTypes(CHILD_RESOURCES),
  generateTransformsTypes(CHILD_RESOURCES)
].join('\n');

/** The declaration block for one generated resource class. */
const classBlockFor = (className: string) => {
  const block = classDeclarations
    .split('export declare class ')
    .find((candidate) => candidate.startsWith(`${className} extends`));
  if (!block) throw new Error(`No generated class declaration for ${className}.`);
  return block;
};

describe('resources without modelled CloudFormation children have no overrides', () => {
  test('Convex declares that in the metadata every generator reads', () => {
    expect(getResourceByClassName('Convex')?.supportsOverrides).toBe(false);
    expect(getResourcesWithOverrides().map((resource) => resource.className)).not.toContain('Convex');
    // The metadata claim matches reality: there is nothing to override.
    expect(CHILD_RESOURCES.convex ?? []).toBeEmpty();
  });

  test('its constructor takes the ordinary props', () => {
    const convex = classBlockFor('Convex');

    // No augmented props and no overrides: the plain authored props, straight from ./plain.
    expect(convex).toContain(
      "constructor(properties: WithAuthoringNamedResourceReferences<import('./plain').ConvexProps, 'convex'>)"
    );
    expect(convex).not.toContain('constructor(name: string');
    expect(convex).not.toContain('ConvexPropsWithOverrides');
  });

  test('nothing in the assembled declarations references a Convex override type', () => {
    for (const dangling of ['ConvexPropsWithOverrides', 'ConvexOverrides', 'ConvexTransforms']) {
      expect(assembledDeclarations).not.toContain(dangling);
    }
  });

  test('augmented resource props also honor the no-overrides metadata', () => {
    for (const className of ['CustomResourceDefinition', 'DeploymentScript'] as const) {
      expect(getResourceByClassName(className)?.supportsOverrides).toBe(false);
      expect(assembledDeclarations).not.toContain(`${className}Overrides`);
      expect(assembledDeclarations).not.toContain(`${className}Transforms`);
    }
  });
});

describe('resources with modelled children still get overrides', () => {
  test('a representative resource keeps its override constructor and types', () => {
    // RelationalDatabase has no augmented props, so it is the form that actually takes `*PropsWithOverrides`.
    expect(getResourcesWithOverrides().map((resource) => resource.className)).toContain('RelationalDatabase');
    expect(classBlockFor('RelationalDatabase')).toContain(
      "constructor(properties: WithAuthoringNamedResourceReferences<RelationalDatabasePropsWithOverrides, 'relational-database'>)"
    );
    expect(assembledDeclarations).toContain('RelationalDatabaseOverrides');
    expect(assembledDeclarations).toContain('RelationalDatabaseTransforms');
  });

  test('resource base classes preserve their authored properties type', () => {
    expect(classBlockFor('RelationalDatabase')).toContain(
      "extends BaseResource<'relational-database', WithAuthoringNamedResourceReferences<RelationalDatabasePropsWithOverrides, 'relational-database'>>"
    );
  });

  test('every generated `*WithOverrides` reference has a matching override type', () => {
    // The invariant the Convex bug broke, checked for the whole surface rather than one resource.
    const referenced = [...assembledDeclarations.matchAll(/(\w+)PropsWithOverrides/g)].map((match) => match[1]);
    for (const className of [...new Set(referenced)]) {
      expect(assembledDeclarations, `${className} has no ${className}Overrides`).toContain(`${className}Overrides`);
    }
  });
});

describe('connectTo declaration generation', () => {
  test('publishes resource objects and string references without the removed AWS-service macro type', () => {
    const augmentedProps = generateAugmentedPropsTypes();

    expect(augmentedProps).toContain('type LambdaFunctionConnectTo = ');
    expect(augmentedProps).toContain(' | string;');
    expect(augmentedProps).not.toContain('GlobalAwsServiceConstant');
  });
});
