import type { ConfigLanguage } from './document.js';

/**
 * TypeScript configs are executable programs. The web editor can author them, but only the local
 * CLI is allowed to execute them; browser analysis remains YAML-only until a real sandbox exists.
 */
export function getConfigEditorCapabilities(language: ConfigLanguage) {
  const isYaml = language === 'yaml';
  return {
    canConvertToTypescript: isYaml,
    canRunWebAnalysis: isYaml
  } as const;
}
