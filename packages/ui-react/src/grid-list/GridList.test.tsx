import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { GridList } from './GridList.js';

test('lays out host content using the requested minimum width', () => {
  const markup = renderToStaticMarkup(
    <GridList className="project-grid" minItemWidth="18rem">
      <div>One</div>
      <div>Two</div>
    </GridList>
  );

  expect(markup).toContain('stp-ui-grid-list project-grid');
  expect(markup).toContain('grid-template-columns:repeat(auto-fill, minmax(18rem, 1fr))');
});
