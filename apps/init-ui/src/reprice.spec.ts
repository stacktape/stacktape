import { describe, expect, it } from 'bun:test';
import { keepPriceWhileRepricing } from './reprice';
import type { WizardState } from './session';

type Composition = NonNullable<WizardState['composition']>;

const price = { monthly: '$31/mo', byResource: { db: '$28/mo', api: '$3/mo' }, region: 'eu-west-1' };

const state = (composition: Partial<Composition> | undefined): WizardState => ({
  phase: 'reviewing',
  projectName: 'app',
  timeline: [],
  answers: {},
  ...(composition === undefined
    ? {}
    : {
        composition: {
          resources: {
            db: { type: 'relational-database', properties: {} },
            api: { type: 'web-service', properties: {} }
          },
          provenance: {},
          gaps: [],
          unsetSettings: [],
          deployable: true,
          ...composition
        }
      })
});

describe('keepPriceWhileRepricing', () => {
  it('keeps the last price while a changed setting is priced again', () => {
    const next = state({});
    expect(keepPriceWhileRepricing(state({ price }), next).composition?.price).toBe(price);
  });

  it('takes the new price as soon as it arrives', () => {
    const fresh = { ...price, monthly: '$58/mo' };
    expect(keepPriceWhileRepricing(state({ price }), state({ price: fresh })).composition?.price).toBe(fresh);
  });

  it('shows nothing old once the price service has given up', () => {
    const next = state({ priceUnavailable: true });
    expect(keepPriceWhileRepricing(state({ price }), next)).toBe(next);
  });

  it('lets a resource that was added or removed wait for its own price', () => {
    const next = state({ resources: { db: { type: 'relational-database', properties: {} } } });
    expect(keepPriceWhileRepricing(state({ price }), next).composition?.price).toBeUndefined();
  });

  it('leaves a state without a configuration alone', () => {
    const next = state(undefined);
    expect(keepPriceWhileRepricing(state({ price }), next)).toBe(next);
  });
});
