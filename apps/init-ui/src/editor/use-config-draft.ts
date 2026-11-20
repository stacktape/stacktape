import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parse as parseYaml } from 'yaml';
import type { WizardState } from '../session';

export type ConfigFormat = 'yaml' | 'typescript';
export type ConfigTextEdit = { yaml: string } | { typescript: string } | null;
type Resources = Record<string, { type: string; properties: Record<string, unknown> }>;

/**
 * The configuration file as the page shows and edits it, in either format.
 *
 * The generated file is the composition's, in the format picked on the panel. Once the user types, their text is a
 * draft here at once and an edit on the CLI half a second later; from then on that format is the file's, until the
 * edit is discarded. YAML drafts are parsed here, so the diagram follows every keystroke. TypeScript has to run to say
 * what it defines, so the diagram follows what the CLI made of it (`configEdit.yaml`).
 */
export const useConfigDraft = ({
  state,
  format,
  isTyping,
  onConfigText
}: {
  state: WizardState;
  /** The format picked on the panel, for a file nobody has edited. */
  format: ConfigFormat;
  /** Only the user's own typing is an edit; the reveal types into the editor too. */
  isTyping: () => boolean;
  onConfigText: (edit: ConfigTextEdit) => void;
}) => {
  const generated = state.composition?.configText;
  const edit = state.configEdit;
  const [draft, setDraft] = useState<{ format: ConfigFormat; text: string } | undefined>(undefined);
  const sendTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(sendTimer.current), []);

  const editedFormat: ConfigFormat | undefined =
    edit !== undefined ? (edit.typescript === undefined ? 'yaml' : 'typescript') : draft?.format;
  const generatedOf = useCallback(
    (of: ConfigFormat) => (of === 'yaml' ? generated?.yaml : generated?.typescript),
    [generated?.yaml, generated?.typescript]
  );
  const isEdited = edit !== undefined || (draft !== undefined && draft.text !== generatedOf(draft.format));
  /** The format the panel shows: the edited one while there is an edit, the picked one otherwise. */
  const shown: ConfigFormat = isEdited && editedFormat !== undefined ? editedFormat : format;
  const text =
    draft?.format === shown
      ? draft.text
      : shown === 'typescript'
        ? (edit?.typescript ?? generated?.typescript)
        : edit?.typescript === undefined
          ? (edit?.yaml ?? generated?.yaml)
          : generated?.yaml;

  const change = (next: string) => {
    if (!isTyping()) return;
    setDraft({ format: shown, text: next });
    clearTimeout(sendTimer.current);
    const of = shown;
    sendTimer.current = setTimeout(
      () => onConfigText(next === generatedOf(of) ? null : of === 'yaml' ? { yaml: next } : { typescript: next }),
      500
    );
  };
  const discard = () => {
    clearTimeout(sendTimer.current);
    setDraft(undefined);
    onConfigText(null);
  };
  useEffect(() => {
    // The CLI has the same text now; the draft has done its job.
    if (draft === undefined) return;
    const held = draft.format === 'yaml' ? (edit?.typescript === undefined ? edit?.yaml : undefined) : edit?.typescript;
    if (draft.text === held || (edit === undefined && draft.text === generatedOf(draft.format))) setDraft(undefined);
  }, [draft, edit, generatedOf]);

  // The diagram, the labels and the settings follow the edited file when it parses.
  const resources: Resources = useMemo(() => {
    const yaml = draft?.format === 'yaml' ? draft.text : edit?.yaml;
    if (yaml !== undefined) {
      try {
        const parsed = parseYaml(yaml) as { resources?: unknown } | null;
        if (parsed !== null && typeof parsed === 'object' && typeof parsed.resources === 'object') {
          return (parsed.resources ?? {}) as Resources;
        }
      } catch {
        // Keeps the last good picture while the text does not parse.
      }
    }
    return state.composition?.resources ?? {};
  }, [draft, edit?.yaml, state.composition?.resources]);

  /** The CLI's complaint about the text it holds, once it holds what is on screen. */
  const error =
    draft === undefined && edit?.error !== undefined
      ? { message: edit.error, ...(edit.errorLine === undefined ? {} : { line: edit.errorLine }) }
      : undefined;
  /** An edit is on its way to the CLI, or being run there: the Continue button waits for it. */
  const isPending = draft !== undefined && isEdited;

  /** The configuration the CLI holds, as YAML: what is priced, compiled and deployed. */
  const sourceYaml = edit?.yaml ?? generated?.yaml;

  return { shown, text, isEdited, editedFormat, change, discard, resources, error, isPending, sourceYaml };
};
