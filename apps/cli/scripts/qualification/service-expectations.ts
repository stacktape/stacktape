import type { ExpectedService } from './contracts';

export type InferredServiceSummary = {
  name: string;
  path: string;
  framework?: string;
  exposesHttp: boolean;
  port?: number;
  startCommand?: string;
  buildCommand?: string;
  dockerfile?: string;
};

export type ServiceExpectationResult = {
  assertions: number;
  failures: string[];
};

/** Match each semantic expectation to exactly one inferred service by its globally unique name. */
export const validateServiceExpectations = (
  expectedServices: readonly ExpectedService[],
  actualServices: readonly InferredServiceSummary[]
): ServiceExpectationResult => {
  const failures: string[] = [];
  const consumed = new Set<number>();
  let assertions = 0;

  for (const expected of expectedServices) {
    assertions += 1;
    const matches = actualServices
      .map((service, index) => ({ service, index }))
      .filter(({ service }) => service.name === expected.name);
    if (matches.length !== 1) {
      failures.push(
        matches.length === 0
          ? `expected service ${JSON.stringify(expected.name)} was not found among inferred services: ${JSON.stringify(actualServices.map((service) => ({ name: service.name, path: service.path })))}.`
          : `expected service ${JSON.stringify(expected.name)} matched ${matches.length} inferred services; service names must be unique.`
      );
      continue;
    }

    const match = matches[0]!;
    if (consumed.has(match.index)) {
      failures.push(`inferred service ${JSON.stringify(expected.name)} was matched by more than one expectation.`);
      continue;
    }
    consumed.add(match.index);
    const actual = match.service;

    const compare = (field: keyof Omit<ExpectedService, 'name'>): void => {
      const expectedValue = expected[field];
      if (expectedValue === undefined) return;
      assertions += 1;
      if (actual[field] !== expectedValue) {
        failures.push(
          `service ${actual.name} ${field}: expected ${JSON.stringify(expectedValue)}; got ${JSON.stringify(actual[field])}.`
        );
      }
    };

    compare('path');
    compare('framework');
    compare('exposesHttp');
    compare('port');
    compare('startCommand');
    compare('buildCommand');
    compare('dockerfile');
  }

  return { assertions, failures };
};
