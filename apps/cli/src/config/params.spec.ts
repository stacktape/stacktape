import { afterEach, describe, expect, test } from 'bun:test';
import { consoleUrlForApiEndpoint, stacktapeConsoleUrl, stageConsoleUrl } from './params';

describe('consoleUrlForApiEndpoint', () => {
  const cases: Array<[string, string]> = [
    ['https://api.stacktape.com', 'https://console.stacktape.com'],
    ['https://dev-api.stacktape.com', 'https://dev-console.stacktape.com'],
    ['https://dev-api.stacktape.com/', 'https://dev-console.stacktape.com'],
    ['https://simon-api.stacktape.com', 'https://simon-console.stacktape.com'],
    ['http://localhost:3000', 'http://localhost:4000'],
    ['http://127.0.0.1:3000/stacktape-api', 'http://localhost:4000'],
    ['https://api.example.com', 'https://console.stacktape.com'],
    ['https://evil-api.stacktape.com.example.com', 'https://console.stacktape.com'],
    ['not a url', 'https://console.stacktape.com']
  ];
  for (const [endpoint, consoleUrl] of cases) {
    test(`${endpoint} -> ${consoleUrl}`, () => {
      expect(consoleUrlForApiEndpoint(endpoint)).toBe(consoleUrl);
    });
  }
});

describe('stacktapeConsoleUrl', () => {
  const previous = process.env.STACKTAPE_CONSOLE_URL;
  afterEach(() => {
    if (previous === undefined) delete process.env.STACKTAPE_CONSOLE_URL;
    else process.env.STACKTAPE_CONSOLE_URL = previous;
  });

  test('STACKTAPE_CONSOLE_URL overrides the Console derived from the API endpoint', () => {
    process.env.STACKTAPE_CONSOLE_URL = 'https://dev-console.stacktape.com';
    expect(stacktapeConsoleUrl('/aws-accounts')).toBe('https://dev-console.stacktape.com/aws-accounts');
    expect(stageConsoleUrl({ projectName: 'shop', stage: 'dev' })).toBe(
      'https://dev-console.stacktape.com/projects/shop/dev/overview'
    );
  });
});
