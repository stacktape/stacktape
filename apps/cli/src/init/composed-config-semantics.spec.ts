import { describe, expect, it } from 'bun:test';
import { composeConfig } from '@stacktape/config-inference/compose';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema } from '@stacktape/config-inference/facts';
import type { StpWebService } from '@domain-services/config-manager/resolved-types/web-services';
import { validateWebServiceConfig } from '@domain-services/config-manager/utils/web-services';

describe('semantic validation of init-composed configuration', () => {
  it('uses an alarm compatible with the web-service default HTTP API Gateway', () => {
    const facts = projectFactsSchema.parse({
      schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
      services: [
        {
          name: 'web',
          path: '.',
          language: 'javascript',
          exposesHttp: true,
          port: 3000,
          executionModel: 'long-running',
          startCommand: 'npm start',
          environmentVariables: [],
          evidence: [],
          source: 'probe'
        }
      ]
    });
    const resource = composeConfig({ facts }).config.resources.web!;
    const resolved = {
      type: resource.type,
      ...resource.properties,
      name: 'web',
      nameChain: ['web']
    } as StpWebService;

    expect(() => validateWebServiceConfig({ resource: resolved })).not.toThrow();
  });
});
