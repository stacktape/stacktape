import { describe, expect, test } from 'bun:test';
import { getImageRuntimeTools } from './image-runtime-tools';

describe('getImageRuntimeTools', () => {
  test.each([
    ['a service without a health check', {}, { tini: false, curl: false }],
    [
      'a shell health check that calls curl',
      { healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'] },
      { tini: false, curl: true }
    ],
    [
      'an exec-form curl health check',
      { healthCheckCommand: ['CMD', 'curl', '-f', 'http://localhost/'] },
      { tini: false, curl: true }
    ],
    [
      'a health check that uses wget or node',
      { healthCheckCommand: ['CMD-SHELL', 'wget -q -O- http://localhost/ && node check.js'] },
      { tini: false, curl: false }
    ],
    [
      'a word that only contains curl',
      { healthCheckCommand: ['CMD', '/app/curlish-check'] },
      { tini: false, curl: false }
    ],
    ['an AgentCore runtime', { workloadType: 'agentcore-runtime' }, { tini: true, curl: false }]
  ])('%s', (_, input, expected) => {
    expect(getImageRuntimeTools(input)).toEqual(expected);
  });
});
