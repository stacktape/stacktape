import { parse } from 'yaml';
import type { WizardState } from './session';

export type ConfigResources = Record<string, { type: string; properties: Record<string, unknown> }>;

/**
 * The resources the file on disk declares: the hand-edited text when there is one and it parses, the composition
 * otherwise. Every screen after Review reads this, so an edit shows up in the diagram, the secrets and the deploy.
 */
export const resourcesOf = (state: WizardState): ConfigResources => {
  const edited = state.configEdit;
  if (edited !== undefined && edited.error === undefined) {
    try {
      const parsed = parse(edited.yaml) as { resources?: unknown } | null;
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        typeof parsed.resources === 'object' &&
        parsed.resources !== null
      ) {
        return parsed.resources as ConfigResources;
      }
    } catch {
      // Falls back to the composition.
    }
  }
  return state.composition?.resources ?? {};
};
