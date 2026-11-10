import type { IsometricDiagramProps } from './IsometricDiagram.js';
import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'yaml';
import { diagramDeploymentFixtures } from './deployment-fixtures.js';
import { IsometricDiagram, readDiagramDeployment } from './IsometricDiagram.js';
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

/** Renders without the server-rendering warning about layout effects. */
const quiet = <T,>(render: () => T) => {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (String(args[0] ?? '').includes('useLayoutEffect')) return;
    originalError(...args);
  };
  try {
    return render();
  } finally {
    console.error = originalError;
  }
};

const viewBox = (markup: string) => markup.match(/viewBox="([^"]+)"/)?.[1];

describe('views', () => {
  const config = parseFixtureConfig({ fixture: getFixtureById({ id: 'full-stack' }) });
  const markupOf = (props: Partial<IsometricDiagramProps>) =>
    quiet(() => renderToStaticMarkup(<IsometricDiagram config={config} animateConnectors={false} {...props} />));

  test('opens in the Application view and offers the three presets', () => {
    const markup = markupOf({});
    expect(markup).toContain('role="radiogroup"');
    expect(markup).toMatch(/<input type="radio"[^>]*checked=""[^>]*value="application"/);
    expect(markup).not.toContain('data-iso-kind="zone"');
    expect(markup).toContain('Customize');
  });

  test('every view fits the same frame, so switching moves nothing', () => {
    const boxes = (['application', 'network', 'security'] as const).map((view) => viewBox(markupOf({ view })));
    expect(boxes[0]).toBeDefined();
    expect(new Set(boxes).size).toBe(1);
    expect(markupOf({ view: 'network' })).toContain('data-iso-kind="zone"');
  });

  test('without a deployment the Security view says where security groups come from', () => {
    expect(markupOf({ view: 'security' })).toContain('Security groups appear for deployed stages');
    // A deployed stage whose template is unreadable says so instead.
    expect(markupOf({ view: 'security', deployment: { template: 'not a template', resources: [] } })).toContain(
      'The deployed template could not be read'
    );
    expect(markupOf({ view: 'security', deployment: null })).toContain('The deployed template could not be read');
  });

  test('draws a deployed stage’s security groups from its template', () => {
    const fixture = diagramDeploymentFixtures.find(({ id }) => id === 'deployed-database-accessibility')!;
    const markup = quiet(() =>
      renderToStaticMarkup(
        <IsometricDiagram config={parse(fixture.yaml)} deployment={fixture.deployment} defaultView="security" />
      )
    );
    expect(markup).toContain('data-iso-kind="security-group"');
    expect(markup).toContain('data-iso-source="internet"');
    expect(markup).toContain('0.0.0.0/0 · TCP 5432');
    expect(markup).not.toContain('Security groups appear for deployed stages');
  });

  test('a host that offers one view gets no view controls', () => {
    const markup = markupOf({ views: ['application'] });
    expect(markup).not.toContain('role="radiogroup"');
    expect(markup).not.toContain('Customize');
  });
});

describe('reading a deployment', () => {
  test('keeps readable resources and skips the rest', () => {
    expect(readDiagramDeployment(null)).toBeNull();
    expect(readDiagramDeployment({ template: { Resources: [] }, resources: [] })).toBeNull();
    expect(
      readDiagramDeployment({
        template: { Resources: { Db: { Type: 'AWS::RDS::DBInstance' } } },
        resources: [
          { name: 'db', type: 'relational-database', logicalIds: ['Db', 7] },
          { name: 3, type: 'function', logicalIds: [] },
          'nonsense'
        ]
      })
    ).toEqual({
      resources: { Db: { Type: 'AWS::RDS::DBInstance' } },
      stacktapeResources: [{ name: 'db', type: 'relational-database', logicalIds: ['Db'] }]
    });
  });
});
