/**
 * Which models a user may pick, per agent.
 *
 * A closed list, defined here and never assembled from anything the browser sends. The wizard shows
 * these and posts back an id; the id is looked up here and only the `flag` travels to a command line.
 * A free-text model field would be one typo away from an argument the vendor CLI misreads and one
 * hostile page away from something worse.
 *
 * `flag` is deliberately absent on the default entry: omitting the option entirely is what "use
 * whatever the user has configured" means, and it is not the same as naming today's default.
 */

import type { AgentProviderId } from './transport';

export type SelectableModel = {
  id: string;
  label: string;
  description: string;
  /** Passed as `--model`. Absent means: do not pass one. */
  flag?: string;
};

const PROVIDER_DEFAULT: SelectableModel = {
  id: 'default',
  label: 'Your default',
  description: 'Whatever the agent is already configured to use. The safe choice.'
};

export const MODELS_BY_PROVIDER: Readonly<Record<string, readonly SelectableModel[]>> = {
  'claude-code': [
    PROVIDER_DEFAULT,
    {
      id: 'opus',
      label: 'Opus',
      description: 'The most careful reader. Best on an unfamiliar or unusual project.',
      flag: 'opus'
    },
    {
      id: 'sonnet',
      label: 'Sonnet',
      description: 'Quicker, and enough for a project that follows the usual conventions.',
      flag: 'sonnet'
    },
    {
      id: 'haiku',
      label: 'Haiku',
      description: 'Fastest and cheapest. Fine for a small project with one service.',
      flag: 'haiku'
    }
  ],
  // Codex names its models per release and reads the choice from the user's own config, so offering
  // a list here would mean shipping model ids that go stale between our releases and theirs.
  codex: [PROVIDER_DEFAULT]
};

/** The models offered for an agent, or just the default for one we have no list for. */
export const modelsFor = (providerId: AgentProviderId | string): readonly SelectableModel[] =>
  MODELS_BY_PROVIDER[providerId] ?? [PROVIDER_DEFAULT];

/** The `--model` value for a chosen id, or undefined for "leave it to the agent". */
export const modelFlagFor = (providerId: AgentProviderId | string, modelId: string): string | undefined =>
  modelsFor(providerId).find((model) => model.id === modelId)?.flag;
