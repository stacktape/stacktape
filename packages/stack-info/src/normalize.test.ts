import { describe, expect, test } from 'bun:test';
import type { StackInfoMap } from './contracts';
import { normalizeStackInfoMap } from './normalize';

describe('normalizeStackInfoMap', () => {
  test('preserves the deployed wire shape while correcting parameter spelling for Console consumers', () => {
    const wireStackInfo: StackInfoMap<'function', string, 'arn'> = {
      metadata: {},
      customOutputs: {},
      resources: {
        api: {
          resourceType: 'function',
          referencableParams: {
            arn: { showDuringPrint: true, value: 'arn:aws:lambda:eu-west-1:123:function:api' }
          },
          cloudformationChildResources: {},
          links: {},
          outputs: {},
          _nestedResources: {
            worker: {
              resourceType: 'function',
              referencableParams: {
                arn: { showDuringPrint: false, value: 'arn:aws:lambda:eu-west-1:123:function:worker' }
              },
              cloudformationChildResources: {},
              links: {},
              outputs: {}
            }
          }
        }
      }
    };

    const normalized = normalizeStackInfoMap(wireStackInfo);

    expect(normalized.resources.api!.referenceableParams.arn?.value).toContain('function:api');
    expect(normalized.resources.api!['_nestedResources']?.worker!.referenceableParams.arn?.value).toContain(
      'function:worker'
    );
    expect('referencableParams' in normalized.resources.api!).toBe(false);
    expect(wireStackInfo.resources.api!.referencableParams.arn?.value).toContain('function:api');
  });
});
