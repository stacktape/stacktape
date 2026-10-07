import { beforeAll, describe, expect, mock, test } from 'bun:test';
import type { StackPriceEstimationResponse } from '@stacktape/console-api/anonymous';

let response: StackPriceEstimationResponse;
mock.module('@stacktape-api/public', () => ({
  publicApiClient: { stackPriceEstimation: async () => response }
}));
import { getResourceCostLabel, getStackCostLabel } from '../commands/init/utils/output-formatting';
let estimateMonthlyCost: typeof import('./pricing').estimateMonthlyCost;
beforeAll(async () => {
  ({ estimateMonthlyCost } = await import('./pricing'));
});

describe('pricing presentation', () => {
  test('an incomplete API subtotal is never presented as a monthly estimate', async () => {
    const resource = { priceInfo: { totalMonthlyFlat: 3.6, incomplete: true, costBreakdown: [] } };
    response = {
      success: true,
      costs: { flatMonthlyCost: 3.6, incomplete: true, unpricedResources: [], resourcesBreakdown: { api: resource } }
    };
    expect(await estimateMonthlyCost('resources: {}', 'eu-west-1')).toEqual({
      monthly: 'Estimate incomplete',
      byResource: { api: 'Price unavailable' },
      region: 'eu-west-1'
    });
    expect(getResourceCostLabel(resource)).toContain('Price unavailable');
    expect(getStackCostLabel(response.costs!)).toContain('Estimate incomplete');
    expect(getStackCostLabel(response.costs!)).not.toContain('$3.60');
  });

  test('complete and zero-cost estimates retain monthly presentation', async () => {
    for (const amount of [0, 3.6]) {
      response = {
        success: true,
        costs: {
          flatMonthlyCost: amount,
          incomplete: false,
          unpricedResources: [],
          resourcesBreakdown: { api: { priceInfo: { totalMonthlyFlat: amount, incomplete: false, costBreakdown: [] } } }
        }
      };
      const result = await estimateMonthlyCost('resources: {}');
      expect(result?.monthly).toBe(amount === 0 ? '$0/mo' : '$3.60/mo');
      expect(getStackCostLabel(response.costs!)).toContain('/mo + pay-per-use costs');
    }
  });

  test('a known usage rate is shown as pay-per-use rather than a free monthly resource', async () => {
    response = {
      success: true,
      costs: {
        flatMonthlyCost: 0,
        incomplete: false,
        unpricedResources: [],
        resourcesBreakdown: {
          api: {
            priceInfo: {
              totalMonthlyFlat: 0,
              incomplete: false,
              costBreakdown: [
                { name: 'requests', description: 'HTTP requests', priceModel: 'pay-per-use', pricePerUnit: 0.000001 }
              ]
            }
          }
        }
      }
    };
    expect(await estimateMonthlyCost('resources: {}')).toEqual({
      monthly: '$0/mo + pay-per-use costs',
      byResource: { api: 'pay-per-use' },
      region: 'eu-west-1'
    });
  });

  test('a server without completeness metadata cannot claim a complete estimate', async () => {
    response = { success: true, costs: { flatMonthlyCost: 3.6, resourcesBreakdown: {} } };
    expect((await estimateMonthlyCost('resources: {}'))?.monthly).toBe('Estimate incomplete');
    expect(getStackCostLabel(response.costs!)).toContain('Estimate incomplete');
  });
});
