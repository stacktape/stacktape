/*
 * The hero's right half: an editor window showing a real Stacktape config.
 *
 * Everything it renders was computed at build time (`src/lib/snippets`) and arrives as props — no
 * Shiki, no schema and no Monaco reach the browser. What the island adds is the two switches (use
 * case, language) and the popup clamping that CSS alone cannot do.
 *
 * Hydration: `client:visible`. The server already renders the first tab's YAML, so the block is
 * complete and readable before any JavaScript runs, and hydrating changes nothing on screen.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { EditorFrame } from '../frames/EditorFrame';
import type { RenderedCode, RenderedSnippet, SnippetId } from '../../lib/snippets/types';

type Language = 'yaml' | 'typescript';

const FILENAME: Record<Language, string> = {
  yaml: 'stacktape.yml',
  typescript: 'stacktape.ts'
};

export type HeroConfigEditorProps = {
  /** Rendered at build time by `getSnippets()`. Tab order is array order. */
  snippets: RenderedSnippet[];
};

export function HeroConfigEditor({ snippets }: HeroConfigEditorProps) {
  const [activeId, setActiveId] = useState<SnippetId | undefined>(snippets[0]?.id);
  const [language, setLanguage] = useState<Language>('yaml');

  const active = snippets.find((snippet) => snippet.id === activeId) ?? snippets[0];
  if (!active) return null;

  // A snippet the converter rejected has no TypeScript twin; fall back rather than blank the pane.
  const code = (language === 'typescript' ? active.typescript : active.yaml) ?? active.yaml;

  return (
    <EditorFrame
      className="hero-editor"
      title={
        <span className="hero-editor__filename">
          <FileGlyph />
          {FILENAME[language]}
        </span>
      }
      actions={
        <LanguageToggle
          language={language}
          onChange={setLanguage}
          // Nothing to toggle to if this snippet has no TypeScript form.
          isDisabled={active.typescript === null}
        />
      }
    >
      <UseCaseTabs snippets={snippets} activeId={active.id} onSelect={setActiveId} />
      <CodePane code={code} language={language} paneKey={`${active.id}:${language}`} />
      <p className="hero-editor__caption">
        {active.summary}
        {language === 'yaml' && active.hoverCount > 0 && (
          <span className="hero-editor__hint"> Hover a key for its documentation.</span>
        )}
      </p>
    </EditorFrame>
  );
}

/** The use-case strip. A `tablist`, because that is what it is, keyboard behaviour included. */
function UseCaseTabs({
  snippets,
  activeId,
  onSelect
}: {
  snippets: RenderedSnippet[];
  activeId: SnippetId;
  onSelect: (id: SnippetId) => void;
}) {
  return (
    <div className="hero-editor__tabs site-well" role="tablist" aria-label="Example configurations">
      {snippets.map((snippet) => (
        <button
          key={snippet.id}
          type="button"
          role="tab"
          aria-selected={snippet.id === activeId}
          tabIndex={snippet.id === activeId ? 0 : -1}
          className={`hero-editor__tab${snippet.id === activeId ? ' is-active' : ''}`}
          onClick={() => onSelect(snippet.id)}
        >
          {snippet.label}
        </button>
      ))}
    </div>
  );
}

function LanguageToggle({
  language,
  onChange,
  isDisabled
}: {
  language: Language;
  onChange: (language: Language) => void;
  isDisabled: boolean;
}) {
  // A fieldset rather than a div with `role="group"`: same semantics, real element. Its default
  // border, margin and `min-inline-size` are reset in surfaces.css.
  return (
    <fieldset className="hero-editor__langs site-well" aria-label="Configuration language">
      {(['yaml', 'typescript'] as const).map((candidate) => (
        <button
          key={candidate}
          type="button"
          className={`hero-editor__lang${candidate === language ? ' is-active' : ''}`}
          aria-pressed={candidate === language}
          disabled={isDisabled && candidate !== language}
          onClick={() => onChange(candidate)}
        >
          {candidate === 'yaml' ? 'YAML' : 'TS'}
        </button>
      ))}
    </fieldset>
  );
}

/**
 * The code itself, plus the gutter.
 *
 * `paneKey` is passed to `key` so React replaces the subtree on every switch instead of diffing two
 * unrelated blobs of `dangerouslySetInnerHTML`; that is also what re-runs the fade-in animation and
 * what re-arms the popup clamping for the newly mounted spans.
 */
function CodePane({ code, language, paneKey }: { code: RenderedCode; language: Language; paneKey: string }) {
  const paneRef = useRef<HTMLDivElement>(null);
  useHoverClamping(paneRef, paneKey);

  return (
    <div className="hero-editor__pane" key={paneKey} ref={paneRef} data-language={language}>
      <div className="hero-editor__gutter" aria-hidden="true">
        {Array.from({ length: code.lineCount }, (_, index) => (
          <span key={index}>{index + 1}</span>
        ))}
      </div>
      <div className="hero-editor__code stp-code" dangerouslySetInnerHTML={{ __html: code.html }} />
    </div>
  );
}

/**
 * Keeps a hover popup inside the viewport.
 *
 * The popup shows and hides in pure CSS (`:hover`/`:focus-within` on its own parent span), so this
 * only has to answer one question the stylesheet cannot: how far the popup must slide left, and
 * whether it must open upwards. Both answers are written back as custom properties, measured on
 * `pointerenter` — before the popup is visible, `getBoundingClientRect` on a `display: none` element
 * returns zeroes, so the class that reveals it is added first and the measurement taken after.
 */
const useHoverClamping = (paneRef: RefObject<HTMLDivElement | null>, paneKey: string) => {
  const measure = useCallback((hover: HTMLElement) => {
    const popup = hover.querySelector<HTMLElement>('.stp-hover-popup');
    if (!popup) return;

    // Reset before measuring so a previous clamp does not feed into this one.
    popup.style.removeProperty('--stp-hover-shift');
    hover.removeAttribute('data-stp-hover-above');

    const anchor = hover.getBoundingClientRect();
    const rect = popup.getBoundingClientRect();
    const margin = 12;

    const overflowRight = rect.right - (window.innerWidth - margin);
    const maxShift = Math.max(0, anchor.left - margin);
    if (overflowRight > 0) popup.style.setProperty('--stp-hover-shift', `${-Math.min(overflowRight, maxShift)}px`);

    // Flip above only when there is genuinely more room there; a clipped popup is worse than a
    // popup that has to scroll into view.
    const spaceBelow = window.innerHeight - anchor.bottom;
    if (rect.height > spaceBelow - margin && anchor.top > spaceBelow) {
      hover.setAttribute('data-stp-hover-above', 'true');
    }
  }, []);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;

    const onEnter = (event: Event) => {
      const hover = (event.target as HTMLElement | null)?.closest<HTMLElement>('.stp-hover');
      if (hover && pane.contains(hover)) measure(hover);
    };

    // Capture, because `pointerenter` does not bubble and there is one listener rather than one per
    // documented key — a config can have fifty.
    pane.addEventListener('pointerenter', onEnter, true);
    pane.addEventListener('focusin', onEnter);
    return () => {
      pane.removeEventListener('pointerenter', onEnter, true);
      pane.removeEventListener('focusin', onEnter);
    };
  }, [measure, paneKey, paneRef]);
};

/** A document glyph for the filename. Inline so the frame needs no icon dependency. */
function FileGlyph() {
  return (
    <svg viewBox="0 0 12 14" width="11" height="12" fill="none" aria-hidden="true">
      <path
        d="M2.75 1.25h4L10 4.5v8.25H2.75z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <path d="M6.75 1.5V4.5H9.75" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
}
