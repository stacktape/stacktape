/*
 * The primary call to action: the command that starts a project, ready to copy.
 *
 * A CTA that is a command rather than a button, because that is genuinely the next step. The
 * install-method switcher exists because the right command depends on how someone installs things,
 * and guessing wrong makes the CTA useless to them.
 *
 * Hydration: `client:visible` (clipboard access and the switcher both need JavaScript). The server
 * renders the default method's command, so the CTA is readable and correct before hydration.
 */
import { useEffect, useRef, useState } from 'react';

/**
 * Every command here is verbatim from the CLI's own installation instructions
 * (`apps/cli/scripts/starter-projects/starters-mdx.ts`). There is no Homebrew tap, so there is no
 * `brew` entry — an install method that does not exist is worse than one fewer button.
 */
const INSTALL_METHODS = [
  { id: 'npx', label: 'npx', command: 'npx stacktape init' },
  { id: 'macos', label: 'macOS', command: 'curl -L https://installs.stacktape.com/macos.sh | sh' },
  { id: 'linux', label: 'Linux', command: 'curl -L https://installs.stacktape.com/linux.sh | sh' },
  { id: 'windows', label: 'Windows', command: 'iwr https://installs.stacktape.com/windows.ps1 -useb | iex' }
] as const;

type InstallMethodId = (typeof INSTALL_METHODS)[number]['id'];

export type CtaCommandProps = {
  /** Which method the page opens on. `npx` is the one that needs nothing installed first. */
  defaultMethod?: InstallMethodId;
  className?: string | undefined;
};

export function CtaCommand({ defaultMethod = 'npx', className }: CtaCommandProps) {
  const [methodId, setMethodId] = useState<InstallMethodId>(defaultMethod);
  const method = INSTALL_METHODS.find((candidate) => candidate.id === methodId) ?? INSTALL_METHODS[0];
  const { copy, hasCopied } = useCopyToClipboard();

  return (
    <div className={['cta-command', className].filter(Boolean).join(' ')}>
      <div className="cta-command__row">
        <span className="cta-command__prompt" aria-hidden="true">
          $
        </span>
        <code className="cta-command__code">{method.command}</code>
        <button
          type="button"
          className="cta-command__copy"
          onClick={() => copy(method.command)}
          // The label changes, so the accessible name has to change with it — a screen reader user
          // gets the same "copied" confirmation the sighted user gets from the icon swap.
          aria-label={hasCopied ? 'Command copied' : `Copy ${method.command}`}
        >
          {hasCopied ? <CheckGlyph /> : <CopyGlyph />}
          <span className="cta-command__copy-label">{hasCopied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* A fieldset rather than a div with `role="group"`: same semantics, real element. Its default
          border, margin and `min-inline-size` are reset in surfaces.css. */}
      <fieldset className="cta-command__methods site-well" aria-label="Installation method">
        {INSTALL_METHODS.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            className={`cta-command__method${candidate.id === methodId ? ' is-active' : ''}`}
            aria-pressed={candidate.id === methodId}
            onClick={() => setMethodId(candidate.id)}
          >
            {candidate.label}
          </button>
        ))}
      </fieldset>
    </div>
  );
}

/**
 * Copy, with a confirmation that clears itself.
 *
 * The timer is cleared on unmount and before each new copy, so switching methods mid-confirmation
 * cannot leave a stale "Copied" or set state on an unmounted component.
 */
const useCopyToClipboard = (resetAfterMs = 1600) => {
  const [hasCopied, setHasCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard access is denied in some embedded/insecure contexts. The command is selectable
      // text either way, so there is nothing to recover — just don't claim it was copied.
      return;
    }
    setHasCopied(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setHasCopied(false), resetAfterMs);
  };

  return { copy, hasCopied };
};

function CopyGlyph() {
  return (
    <svg viewBox="0 0 14 14" width="13" height="13" fill="none" aria-hidden="true">
      <rect x="4.75" y="1.75" width="7.5" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M9.25 12.25h-6a1.5 1.5 0 0 1-1.5-1.5v-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 14 14" width="13" height="13" fill="none" aria-hidden="true">
      <path
        d="M2.75 7.5 5.75 10.5 11.25 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
