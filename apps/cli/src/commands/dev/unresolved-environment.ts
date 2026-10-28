import { IDENTIFIER_FOR_MISSING_OUTPUT } from 'src/config/random';
import { CliError } from '@utils/errors';

/**
 * Fails when a locally resolved environment still has the placeholder of a stack output that the deployed stack does
 * not have (`$CfResourceParam` of a resource whose output no deployment added). Started anyway, the workload would get
 * `<<missing_output>>` as a value and fail later with an error that does not name the variable.
 */
export const assertEnvironmentResolved = ({
  owner,
  environment,
  configured = {}
}: {
  /** The workload or script, as the message names it. */
  owner: string;
  environment: Record<string, unknown>;
  /** The configured values, which name the directive that did not resolve. */
  configured?: Record<string, unknown>;
}) => {
  const unresolved = Object.entries(environment)
    .filter(([, value]) => typeof value === 'string' && value.includes(IDENTIFIER_FOR_MISSING_OUTPUT))
    .map(([name]) => name);
  if (!unresolved.length) return;
  const variables = unresolved.map((name) =>
    typeof configured[name] === 'string' ? `\`${name}\` (${configured[name]})` : `\`${name}\``
  );
  throw new CliError({
    category: 'CONFIG',
    code: 'ENVIRONMENT_OUTPUT_MISSING',
    message: `${variables.join(', ')} of ${owner} ${unresolved.length === 1 ? 'reads a stack output' : 'read stack outputs'} that the deployed stack does not have, so ${unresolved.length === 1 ? 'it has' : 'they have'} no value.`,
    hints: [
      'In dev mode, start the session again: a start adds the outputs that local containers, frontends and scripts read to the dev stack.',
      'If the resource is not deployed in this stack, reference one that is.'
    ]
  });
};
