import { describe, expect, test } from 'bun:test';
import { CHILD_RESOURCES } from '../../src/api/npm/ts/child-resources';
import { getResourceByClassName, getResourcesWithOverrides } from '../../src/api/npm/ts/class-config';
import { REFERENCEABLE_PARAMS } from '../../src/api/npm/ts/resource-metadata';
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
    expect(convex).toContain("constructor(properties: import('./plain').ConvexProps)");
    expect(convex).toContain("constructor(name: string, properties: import('./plain').ConvexProps)");
    expect(convex).not.toContain('ConvexPropsWithOverrides');
  });

  test('nothing in the assembled declarations references a Convex override type', () => {
    for (const dangling of ['ConvexPropsWithOverrides', 'ConvexOverrides', 'ConvexTransforms']) {
      expect(assembledDeclarations).not.toContain(dangling);
    }
  });
});

describe('resources with modelled children still get overrides', () => {
  test('a representative resource keeps its override constructor and types', () => {
    // RelationalDatabase has no augmented props, so it is the form that actually takes `*PropsWithOverrides`.
    expect(getResourcesWithOverrides().map((resource) => resource.className)).toContain('RelationalDatabase');
    expect(classBlockFor('RelationalDatabase')).toContain(
      'constructor(properties: RelationalDatabasePropsWithOverrides)'
    );
    expect(assembledDeclarations).toContain('RelationalDatabaseOverrides');
    expect(assembledDeclarations).toContain('RelationalDatabaseTransforms');
  });

  test('every generated `*WithOverrides` reference has a matching override type', () => {
    // The invariant the Convex bug broke, checked for the whole surface rather than one resource.
    const referenced = [...assembledDeclarations.matchAll(/(\w+)PropsWithOverrides/g)].map((match) => match[1]);
    for (const className of [...new Set(referenced)]) {
      expect(assembledDeclarations, `${className} has no ${className}Overrides`).toContain(`${className}Overrides`);
    }
  });
});
