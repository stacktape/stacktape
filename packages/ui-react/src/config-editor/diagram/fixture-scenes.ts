import type { DiagramFixture } from './fixtures.js';
import { parse } from 'yaml';
import { diagramFixtures } from './fixtures.js';
import { buildIsometricScene } from './scene-builder.js';

/**
 * Shared setup for the diagram's own tests: parse a fixture's YAML the way a host would, then build
 * the scene from it. Both test files go through here so they always assert against the same input.
 */

export const getDiagramFixtures = () => diagramFixtures;

export const parseFixtureConfig = ({ fixture }: { fixture: DiagramFixture }) => parse(fixture.yaml);

export const getSceneForFixture = ({ fixture }: { fixture: DiagramFixture }) =>
  buildIsometricScene({ parsedConfig: parseFixtureConfig({ fixture }) });

export const getFixtureById = ({ id }: { id: string }) => {
  const fixture = diagramFixtures.find((candidate) => candidate.id === id);
  if (!fixture) throw new Error(`Unknown diagram fixture: ${id}`);
  return fixture;
};
