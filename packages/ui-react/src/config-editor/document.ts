import { useCallback, useEffect, useRef, useState } from 'react';

export type ConfigLanguage = 'typescript' | 'yaml';

const TYPESCRIPT_MODULE_LINE =
  /^\s*(?:import(?:\s+type)?\s+(?:[\s\S]+?\s+from\s+)?["']|export\s+(?:default|const|let|var|class|function|type|interface|\{)|interface\s+\w+|type\s+\w+\s*=)/m;

/** Detects authored TypeScript without mistaking YAML shell commands such as `export PORT=3000` for code configs. */
export function detectConfigLanguage(content?: string | null): ConfigLanguage {
  return content && TYPESCRIPT_MODULE_LINE.test(content) ? 'typescript' : 'yaml';
}

export function shouldReplaceWithExternalContent({
  currentContent,
  externalContent,
  pendingSaves
}: {
  currentContent: string;
  externalContent: string;
  pendingSaves: ReadonlySet<string>;
}) {
  return externalContent !== currentContent && !pendingSaves.has(externalContent);
}

/**
 * Owns the editable document while accepting newer snapshots from a host.
 *
 * This is intentionally not a conventionally controlled input: Monaco edits must appear
 * immediately, while host persistence can acknowledge them later. An external snapshot only
 * replaces the local document when that prop itself changes.
 */
export function useConfigDocument(externalContent?: string) {
  const [content, setContentState] = useState(externalContent ?? '');
  const [language, setLanguage] = useState<ConfigLanguage>(() => detectConfigLanguage(externalContent));
  const contentRef = useRef(content);
  const pendingSavesRef = useRef(new Set<string>());

  useEffect(() => {
    if (externalContent === undefined) {
      return;
    }

    const shouldReplace = shouldReplaceWithExternalContent({
      currentContent: contentRef.current,
      externalContent,
      pendingSaves: pendingSavesRef.current
    });
    const acknowledgesPendingSave = pendingSavesRef.current.has(externalContent);
    if (acknowledgesPendingSave) {
      pendingSavesRef.current.delete(externalContent);
    }

    // A host commonly echoes the saved snapshot after its mutation completes. Do not let that
    // acknowledgement replace edits made while the save was in flight.
    if (!shouldReplace) {
      return;
    }

    contentRef.current = externalContent;
    setContentState(externalContent);
    setLanguage(detectConfigLanguage(externalContent));
  }, [externalContent]);

  const setContent = useCallback((nextContent: string) => {
    contentRef.current = nextContent;
    setContentState(nextContent);
  }, []);

  const replaceContent = useCallback((nextContent: string, nextLanguage: ConfigLanguage) => {
    contentRef.current = nextContent;
    setContentState(nextContent);
    setLanguage(nextLanguage);
  }, []);

  const markPendingSave = useCallback(() => {
    pendingSavesRef.current.add(contentRef.current);
  }, []);

  return { content, contentRef, language, markPendingSave, replaceContent, setContent, setLanguage };
}
