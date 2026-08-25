import { describe, expect, it } from 'bun:test';
import {
  isIncidentalDirectory,
  isIncidentalPath,
  isWorkspaceMember,
  packageWorkspacePatterns,
  pnpmWorkspacePatterns
} from './incidental-directories';

describe('incidental repository directories', () => {
  it('rejects docs, examples, SDKs, clients, tests, and development tools by directory or file path', () => {
    for (const directory of [
      'docs',
      'examples/go/worker',
      'sdks/python',
      'packages/client',
      'internal/testutils',
      'cmd/project-loadtest',
      'hack/dev'
    ]) {
      expect(isIncidentalDirectory(directory)).toBe(true);
      expect(isIncidentalPath(`${directory}/main.go`)).toBe(true);
    }
    expect(isIncidentalDirectory('apps/api')).toBe(false);
    expect(isIncidentalPath('src/main/java/com/example/TicketFunction.java')).toBe(false);
    expect(isIncidentalPath('src/client/http.ts')).toBe(false);
  });

  it('retains an incidental-looking directory only when an authoritative workspace includes it', () => {
    const active = new Set(['examples/production-api']);
    expect(isIncidentalDirectory('examples/production-api', active)).toBe(false);
    expect(isIncidentalPath('examples/production-api/src/server.ts', active)).toBe(false);
    expect(isIncidentalDirectory('examples/demo', active)).toBe(true);
  });

  it('parses bounded package and pnpm workspace declarations including exclusions', () => {
    expect(packageWorkspacePatterns(JSON.stringify({ workspaces: { packages: ['apps/*', '!apps/demo'] } }))).toEqual([
      'apps/*',
      '!apps/demo'
    ]);
    expect(pnpmWorkspacePatterns("packages:\n  - 'packages/*'\n  - '!packages/test'\n")).toEqual([
      'packages/*',
      '!packages/test'
    ]);
    expect(isWorkspaceMember('apps/api', ['apps/*', '!apps/demo'])).toBe(true);
    expect(isWorkspaceMember('apps/demo', ['apps/*', '!apps/demo'])).toBe(false);
  });
});
