import { describe, expect, it } from 'bun:test';
import type { WizardState } from '../session';
import {
  costLineLabel,
  costLinesOf,
  costShares,
  money,
  monthlyDelta,
  optionPrice,
  perMillionRequests,
  requestCount,
  trafficExamples,
  usageRate
} from './review-costs';
import { awsServiceOf, sizeSummary } from './review-model';
import { reviewLayout, settingTerms } from './review-version';

type Price = NonNullable<NonNullable<WizardState['composition']>['price']>;

/** The estimate the CLI sends for a Next.js site and a Postgres database, close to the real estimator's shape. */
const price: Price = {
  monthly: '$32/mo + pay-per-use costs',
  byResource: { mainDatabase: '$32/mo', app: 'pay-per-use' },
  region: 'eu-west-1',
  flatMonthly: 32.5,
  resourceFlat: { mainDatabase: 32.5, app: 0 },
  lines: {
    mainDatabase: [
      { name: 'EC2-public-ip', priceModel: 'flat', monthly: 4.02, rate: 0.005, unit: 'Hrs' },
      { name: 'RDS-gp2-storage-postgres', priceModel: 'flat', monthly: 2.53, rate: 0.115, unit: 'GB-Mo', quantity: 20 },
      { name: 'RDS-instance-db.t4g.small-postgres', priceModel: 'flat', monthly: 25.95, rate: 0.032, unit: 'Hrs' }
    ],
    app: [
      { name: 'S3-storage', priceModel: 'pay-per-use', rate: 0.023, unit: 'GB-Mo' },
      { name: 'CloudFront-price-per-10000-req', priceModel: 'pay-per-use', rate: 0.01, unit: '10K requests' },
      { name: 'Lambda-execution-time', priceModel: 'pay-per-use', rate: 0.0000166667, unit: 'Lambda-GB-Second' },
      { name: 'Lambda-price-per-request', priceModel: 'pay-per-use', rate: 0.2, unit: '1M requests' }
    ]
  },
  settings: {
    mainDatabase: {
      instanceSize: {
        'db.t4g.micro': { resource: 19.3, total: 19.3 },
        'db.t4g.small': { resource: 32.5, total: 32.5 }
      },
      multiAz: { false: { resource: 32.5, total: 32.5 }, true: { resource: 60.98, total: 60.98 } },
      access: { public: { resource: 32.5, total: 32.5 }, private: { resource: 28.48, total: 40.85 } }
    }
  }
};

describe('the money on the Review step', () => {
  it('reads like a bill: whole dollars from $10, cents below', () => {
    expect([1204.4, 32.5, 9.91, 4, 0.2].map(money)).toEqual(['$1,204', '$33', '$9.91', '$4', '$0.20']);
    expect(monthlyDelta(28.48)).toBe('+$28/mo');
    expect(monthlyDelta(-4.02)).toBe('−$4.02/mo');
    expect(monthlyDelta(0.3)).toBeUndefined();
  });

  it('names what a price is made of in words, the instance first', () => {
    expect(costLinesOf(price, 'mainDatabase').map(costLineLabel)).toEqual([
      'Instance db.t4g.small',
      'Public IP address',
      'Storage · 20 GB'
    ]);
    expect(costLineLabel({ name: 'RDS-instance-db.t4g.small-postgres', priceModel: 'flat', quantity: 2 })).toBe(
      'Instance db.t4g.small + standby'
    );
    expect(costLineLabel({ name: 'ECS-cpu-AMD64-Linux', priceModel: 'flat', quantity: 0.5 })).toBe('CPU · 0.5 vCPU');
    expect(costLineLabel({ name: 'Some-new-product', priceModel: 'flat' })).toBe('Some new product');
  });

  it('quotes usage in the unit people quote it in', () => {
    expect(costLinesOf(price, 'app').map(usageRate)).toEqual([
      '$0.023 per GB-month',
      '$0.01 per 10K requests',
      '$0.0000167 per GB-second',
      '$0.20 per 1M requests'
    ]);
    // The real estimator prices one request; nobody reads millionths of a dollar.
    expect(usageRate({ rate: 0.0000002, unit: 'Requests' })).toBe('$0.20 per 1M requests');
  });

  it('splits the total by resource for the bar, priced ones first', () => {
    expect(costShares(price, ['app', 'mainDatabase'])).toEqual([
      { name: 'mainDatabase', amount: 32.5, usage: false, share: 1 },
      { name: 'app', amount: 0, usage: true, share: 0 }
    ]);
  });

  it('prices a size by its own amount and any other choice by what it changes the total by', () => {
    const size = { id: 'instanceSize', control: 'size' as const, value: 'db.t4g.small' };
    expect(optionPrice(price, 'mainDatabase', size, 'db.t4g.micro')).toEqual({
      kind: 'amount',
      amount: 19.3,
      text: '$19/mo'
    });
    const standby = { id: 'multiAz', control: 'toggle' as const, value: false };
    expect(optionPrice(price, 'mainDatabase', standby, true)).toEqual({ kind: 'delta', text: '+$28/mo' });
    expect(optionPrice(price, 'mainDatabase', standby, false)).toBeUndefined();
    // Going private adds the access server: the stack's total says so, not the database's own amount.
    const access = { id: 'access', control: 'choice' as const, value: 'public' };
    expect(optionPrice(price, 'mainDatabase', access, 'private')).toEqual({ kind: 'delta', text: '+$8.35/mo' });
    expect(optionPrice(undefined, 'mainDatabase', access, 'private')).toBeUndefined();
  });

  it('turns "+ usage" into numbers at a few traffic levels', () => {
    expect(perMillionRequests(price.lines!.app!, 1024)).toBeCloseTo(1.867, 3);
    const examples = trafficExamples(price, [{ name: 'mainDatabase' }, { name: 'app', memoryMb: 1024 }])!;
    expect(examples.map((example) => [requestCount(example.requests), money(example.total)])).toEqual([
      ['100K', '$33'],
      ['1M', '$35'],
      ['10M', '$61']
    ]);
    // Nothing billed per request: no examples to give.
    expect(trafficExamples(price, [{ name: 'mainDatabase' }])).toBeUndefined();
  });
});

describe('what a resource is, for people who know AWS', () => {
  it('names the service behind it and sums up its size', () => {
    expect(awsServiceOf({ type: 'relational-database', properties: { engine: { type: 'postgres' } } })).toBe(
      'Amazon RDS for PostgreSQL'
    );
    expect(awsServiceOf({ type: 'nextjs-web', properties: {} })).toBe('Lambda · CloudFront · S3');
    expect(
      sizeSummary([
        {
          id: 'instanceSize',
          control: 'size',
          value: 'db.t4g.small',
          options: [{ value: 'db.t4g.small', label: 'db.t4g.small' }]
        },
        { id: 'storage', control: 'choice', value: 20, options: [{ value: 20, label: '20 GB' }] },
        { id: 'multiAz', control: 'toggle', value: true, options: [] }
      ])
    ).toBe('db.t4g.small · 20 GB · standby');
    expect(
      sizeSummary([
        {
          id: 'size',
          control: 'size',
          value: '0.5/1024',
          options: [{ value: '0.5/1024', label: '0.5 vCPU', detail: '1 GB' }]
        },
        { id: 'minInstances', control: 'choice', value: 2, options: [] }
      ])
    ).toBe('0.5 vCPU · 1 GB · ×2');
  });
});

describe('the layouts to compare', () => {
  it('reads ?review= and ?terms=, with columns and both names by default', () => {
    expect(reviewLayout('')).toBe('columns');
    expect(reviewLayout('?review=stack')).toBe('stack');
    expect(reviewLayout('?review=CANVAS&start=g2')).toBe('canvas');
    expect(reviewLayout('?review=nonsense')).toBe('columns');
    expect(settingTerms('?terms=aws')).toBe('aws');
    expect(settingTerms('?review=stack')).toBe('both');
  });
});
