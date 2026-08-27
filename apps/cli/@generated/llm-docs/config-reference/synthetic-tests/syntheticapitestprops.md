# SyntheticApiTestProps API Reference

## TypeScript definition

```typescript
type SyntheticApiTestProps = {
  /** Path to the test script, relative to the config file (or the --currentWorkingDirectory when set). */
  scriptPath: string;
};
```

## Property: `scriptPath`

- Required: yes
- Type: `string`

Path to the test script, relative to the config file (or the --currentWorkingDirectory when set).

The script makes HTTP calls with per-step timing; no browser starts. TypeScript works out of
the box — Stacktape bundles the script at deploy time.

Export a `handler` function; use `executeHttpStep` from the runtime's `synthetics` helper so
each step gets its own timing and success metrics:
const synthetics = require('Synthetics');

exports.handler = async () => {
  await synthetics.executeHttpStep('health', {
    hostname: 'api.example.com',
    method: 'GET',
    path: '/health',
    protocol: 'https:'
  });
  await synthetics.executeHttpStep('create-order', {
    hostname: 'api.example.com',
    method: 'POST',
    path: '/orders',
    protocol: 'https:',
    headers: { 'Content-Type': 'application/json' }
  });
};

A run fails when the handler throws or a step's response is not a success.
