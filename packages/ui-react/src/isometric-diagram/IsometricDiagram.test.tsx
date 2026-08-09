import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { IsometricDiagram } from './IsometricDiagram.js';
import { getFixtureById, parseFixtureConfig } from './fixture-scenes.js';

test('renders the default empty state when no normalized config is available', () => {
  const markup = renderToStaticMarkup(<IsometricDiagram config={null} />);

  expect(markup).toContain('stp-diagram-empty');
  expect(markup).toContain('No resources to display');
});

test('lets a compiling host suppress the otherwise misleading empty state', () => {
  expect(renderToStaticMarkup(<IsometricDiagram config={null} emptyState={null} />)).toBe('');
});

test('the public component derives and renders a scene from normalized configuration', () => {
  const config = parseFixtureConfig({ fixture: getFixtureById({ id: 'simple-function-url' }) });
  const markup = renderToStaticMarkup(<IsometricDiagram config={config} ariaLabel="Fixture architecture" />);

  expect(markup).toContain('aria-label="Fixture architecture"');
  expect(markup).toContain('data-iso-kind="node"');
  expect(markup).toContain('data-iso-kind="connector-path"');
});

test('multiple diagrams keep their SVG definitions and references isolated', () => {
  const config = parseFixtureConfig({ fixture: getFixtureById({ id: 'simple-function-url' }) });
  const markup = renderToStaticMarkup(
    <>
      <IsometricDiagram config={config} />
      <IsometricDiagram config={config} />
    </>
  );
  const ids = [...markup.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
  const referencedIds = [...markup.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1]);

  expect(ids.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length);
  for (const referencedId of referencedIds) {
    expect(ids).toContain(referencedId);
  }
});
