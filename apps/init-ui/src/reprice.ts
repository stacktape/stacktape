import type { WizardState } from './session';

/**
 * A changed setting is priced again in the background: the state that carries the change arrives without a price, and
 * the price follows a moment later. Shown as it arrives, every price on the page dropped to a placeholder of another
 * size and came back, and a total could not count from its old amount to its new one.
 *
 * While the configuration has the same resources, the page keeps the last price until the new one lands. A resource
 * added or removed has no price of its own yet, so then the placeholders show, as before.
 */
export const keepPriceWhileRepricing = (previous: WizardState, next: WizardState): WizardState => {
  const before = previous.composition;
  const after = next.composition;
  if (
    after === undefined ||
    after.price !== undefined ||
    after.priceUnavailable === true ||
    before?.price === undefined ||
    names(before.resources) !== names(after.resources)
  ) {
    return next;
  }
  return { ...next, composition: { ...after, price: before.price } };
};

const names = (resources: Record<string, unknown>) => Object.keys(resources).toSorted().join('\n');
