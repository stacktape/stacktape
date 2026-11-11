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
/** Each layer checkbox in the markup, with its name. */
const switches = (markup: string) => [...markup.matchAll(/<input type="checkbox"[^>]*\/><span>([^<]+)</g)];

describe('layers', () => {
  const config = parseFixtureConfig({ fixture: getFixtureById({ id: 'full-stack' }) });
  const markupOf = (props: Partial<IsometricDiagramProps>, shown = config) =>
    quiet(() => renderToStaticMarkup(<IsometricDiagram config={shown} animateConnectors={false} {...props} />));
  const deployed = diagramDeploymentFixtures.find(({ id }) => id === 'deployed-database-accessibility')!;

  test('opens on the application alone and offers the Infrastructure layer unchecked', () => {
    const markup = markupOf({});
    expect(switches(markup).map((match) => match[1])).toEqual(['Infrastructure']);
    expect(switches(markup)[0][0]).not.toContain('checked');
    expect(markup).not.toContain('data-iso-kind="zone"');
  });

  test('every combination of layers fits the same frame, so switching moves nothing', () => {
    const combinations = [
      { infrastructure: false, access: false },
      { infrastructure: true, access: false },
      { infrastructure: false, access: true },
      { infrastructure: true, access: true }
    ];
    const boxes = combinations.map((layers) =>
      viewBox(markupOf({ layers, deployment: deployed.deployment }, parse(deployed.yaml)))
    );
    expect(boxes[0]).toBeDefined();
    expect(new Set(boxes).size).toBe(1);
    expect(markupOf({ layers: combinations[1] })).toContain('data-iso-kind="zone"');
  });

  test('a stack with nothing under its configuration gets no Infrastructure switch', () => {
    const serverless = parseFixtureConfig({ fixture: getFixtureById({ id: 'serverless-routes' }) });
    expect(switches(markupOf({}, serverless))).toEqual([]);
    // A host that asks for the layer anyway gets the application picture.
    expect(markupOf({ layers: { infrastructure: true, access: true } }, serverless)).toBe(markupOf({}, serverless));
  });

  test('the Access layer is offered for a deployed stage that has security groups', () => {
    // No deployed stage: no switch, and asking for the layer changes nothing.
    expect(switches(markupOf({})).map((match) => match[1])).toEqual(['Infrastructure']);
    expect(markupOf({ layers: { infrastructure: false, access: true } })).toBe(markupOf({}));

    const markup = markupOf({ deployment: deployed.deployment }, parse(deployed.yaml));
    expect(switches(markup).map((match) => match[1])).toEqual(['Infrastructure', 'Access']);
    expect(markup).not.toContain('data-iso-kind="access-tag"');

    // Deployed, but nothing in a VPC: the template has no security groups to show.
    const serverless = parseFixtureConfig({ fixture: getFixtureById({ id: 'serverless-routes' }) });
    const noGroups = { template: { Resources: { Fn: { Type: 'AWS::Lambda::Function' } } }, resources: [] };
    expect(switches(markupOf({ deployment: noGroups }, serverless))).toEqual([]);
  });

  test('a deployed stage whose template cannot be read keeps the Access switch, disabled, and says why', () => {
    for (const deployment of [null, { template: 'not a template', resources: [] }]) {
      const markup = markupOf({ deployment, layers: { infrastructure: false, access: true } });
      const access = switches(markup).find((match) => match[1] === 'Access')?.[0] ?? '';
      expect(access).toContain('disabled=""');
      expect(access).not.toContain('checked');
      expect(markup).toContain('The deployed template could not be read');
      expect(markup).not.toContain('data-iso-kind="access-tag"');
    }
  });

  test('tags a deployed stage’s resources from its template and names what is open to the internet', () => {
    const markup = quiet(() =>
      renderToStaticMarkup(
        <IsometricDiagram
          config={parse(deployed.yaml)}
          deployment={deployed.deployment}
          defaultLayers={{ infrastructure: false, access: true }}
        />
      )
    );
    expect(markup).toContain('data-iso-reach="exposed"');
    expect(markup).toContain('Anything in the VPC');
    expect(markup).toContain('Only web + 203.0.113.10');
    // The tag takes the place of the `public` mark, and the note under the picture names the finding.
    expect(markup).not.toContain('data-iso-kind="public-badge"');
    expect(markup).toMatch(/Open to the internet:<\/strong>\s*publicDb\./);
    // A reader who does not see the tag still hears it.
    expect(markup).toContain('aria-label="publicDb, Postgres, Open to the internet"');
  });

  test('a host that offers no layers gets no switches', () => {
    expect(switches(markupOf({ layerChoices: [] }))).toEqual([]);
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
