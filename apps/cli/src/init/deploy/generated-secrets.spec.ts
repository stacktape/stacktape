import { describe, expect, it } from 'bun:test';
import { generatedSecretNames, isGeneratedSecretNameForProject } from './generated-secrets';

describe('composer-generated secret ownership', () => {
  it('returns the Secrets Manager name the CLI directive actually resolves', () => {
    expect(
      generatedSecretNames({
        database: { properties: { password: "$Secret('canary-project-mainDatabase.password')" } },
        cache: { properties: { password: "$Secret('canary-project-cache.password')" } }
      })
    ).toEqual(['canary-project-mainDatabase', 'canary-project-cache']);
  });

  it('binds cleanup ownership to the project-scoped generated-name prefix', () => {
    expect(isGeneratedSecretNameForProject('canary-project', 'canary-project-mainDatabase')).toBe(true);
    expect(isGeneratedSecretNameForProject('canary-project', 'canary-project')).toBe(false);
    expect(isGeneratedSecretNameForProject('canary-project', 'another-project-mainDatabase')).toBe(false);
    expect(isGeneratedSecretNameForProject('canary', 'canary-project-mainDatabase')).toBe(true);
  });
});
