import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Alert } from './Alert.js';

test('uses an interruptive role only for failures', () => {
  expect(renderToStaticMarkup(<Alert tone="danger">Failed</Alert>)).toContain('role="alert"');
  expect(renderToStaticMarkup(<Alert tone="info">Helpful</Alert>)).toContain('role="status"');
});
