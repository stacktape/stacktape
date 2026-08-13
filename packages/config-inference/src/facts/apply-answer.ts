/**
 * Folding a decision back into the facts.
 *
 * Used two ways, and the fact that it is the same code both times is the point:
 *
 * - **Automatically**, once, for every open question, using its recommended answer. That is what
 *   makes the wizard produce a complete configuration without asking anything.
 * - **By hand**, when the user changes one of those assumptions on the review screen.
 *
 * Both paths amend *facts* and recompose from them. Nothing edits the configuration directly,
 * because then the file and the reasoning behind it would drift apart the moment anything changed.
 *
 * Each kind names exactly what its answer changes. There is deliberately no generic "set this field
 * from that string" path — that is what would let an unexpected answer reach somewhere it was never
 * meant to.
 */

import type { ProjectFacts } from './project-facts';
import type { Uncertainty } from './uncertainty';

export const applyAnswer = ({
  facts,
  uncertainty,
  value
}: {
  facts: ProjectFacts;
  uncertainty: Uncertainty;
  value: string;
}): ProjectFacts => {
  // Removing by id is a no-op for a composition-raised question, which is correct: those disappear
  // on their own once the fact that caused them changes.
  const remaining = facts.uncertainties.filter((entry) => entry.id !== uncertainty.id);
  let services = facts.services;
  let dependencies = facts.dependencies;

  switch (uncertainty.kind) {
    case 'database-engine-ambiguous': {
      dependencies = dependencies.map((dependency) =>
        dependency.kind === uncertainty.recommended || dependency.name === 'mainDatabase'
          ? { ...dependency, kind: value as typeof dependency.kind }
          : dependency
      );
      break;
    }
    case 'external-database-disposition': {
      // "Keep using it" means we create nothing: the dependency leaves the list entirely rather
      // than being marked, so no later stage can accidentally provision it.
      dependencies =
        value === 'point-at-existing'
          ? dependencies.filter((dependency) => dependency.name !== uncertainty.dependencyName)
          : dependencies.map((dependency) =>
              dependency.name === uncertainty.dependencyName
                ? { ...dependency, currentlyHostedOn: undefined }
                : dependency
            );
      break;
    }
    case 'unconfirmed-claim': {
      if (value === 'reject') {
        // Only now is a claim actually removed — with the user saying so, which is the one thing
        // that makes dropping it safe.
        const [subjectKind, subjectName] = uncertainty.subject.split(':');
        if (subjectKind === 'dependency') {
          dependencies = dependencies.filter((dependency) => dependency.name !== subjectName);
        } else if (subjectKind === 'service') {
          services = services.filter((service) => service.name !== subjectName);
        }
      }
      break;
    }
    case 'command-unknown': {
      services = services.map((service) =>
        service.name === uncertainty.serviceName
          ? { ...service, [uncertainty.command === 'start' ? 'startCommand' : 'buildCommand']: value }
          : service
      );
      break;
    }
    case 'schedule-unknown': {
      services = services.map((service) =>
        service.name === uncertainty.serviceName ? { ...service, schedule: value } : service
      );
      break;
    }
    case 'service-deployment-intent': {
      if (value === 'skip') {
        services = services.filter((service) => service.name !== uncertainty.serviceName);
      }
      break;
    }
    case 'cross-service-target-unknown': {
      services = services.map((service) =>
        service.name === uncertainty.serviceName
          ? {
              ...service,
              environmentVariables: service.environmentVariables.map((variable) =>
                variable.name === uncertainty.environmentVariableName
                  ? { ...variable, targetServiceName: value }
                  : variable
              )
            }
          : service
      );
      break;
    }
    case 'environment-variable-timing': {
      services = services.map((service) =>
        service.name === uncertainty.serviceName
          ? {
              ...service,
              environmentVariables: service.environmentVariables.map((variable) =>
                variable.name === uncertainty.environmentVariableName
                  ? { ...variable, role: value === 'build-time' ? 'build-time' : 'runtime-config' }
                  : variable
              )
            }
          : service
      );
      break;
    }
    default:
      // The remaining kinds — persistence strategy, migration timing, conflicting readings — are
      // recorded as decided and consumed by later stages rather than by changing a fact here.
      break;
  }

  return { ...facts, services, dependencies, uncertainties: remaining };
};

/**
 * The answer to use when nobody is going to be asked.
 *
 * Every kind has one. Where the schema carries a `recommended` value that is the answer; where the
 * question was open-ended, the fallback here is the thing a careful person would have typed.
 *
 * Returning `undefined` means "there is no sensible default", and the caller leaves the question
 * open. Nothing currently does — and if a kind is ever added that genuinely cannot be defaulted,
 * that is exactly the signal that it deserves to interrupt someone.
 */
export const recommendationFor = (uncertainty: Uncertainty): string | undefined => {
  switch (uncertainty.kind) {
    case 'command-unknown':
      // The first thing found nearby, or the near-universal convention for the command in question.
      return uncertainty.suggestions[0] ?? (uncertainty.command === 'build' ? 'npm run build' : 'npm start');
    case 'schedule-unknown':
      // Daily, at an hour nothing else is running. Frequent enough to be useful, cheap enough that
      // a wrong guess costs nothing while they change it.
      return uncertainty.suggestions[0] ?? '0 3 * * *';
    case 'cross-service-target-unknown':
      // Only when there is exactly one candidate. Picking one of three would be a coin toss with
      // the user's traffic.
      return uncertainty.candidateServiceNames.length === 1 ? uncertainty.candidateServiceNames[0] : undefined;
    default:
      return 'recommended' in uncertainty ? String(uncertainty.recommended) : undefined;
  }
};
