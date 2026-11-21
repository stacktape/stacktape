import { Tooltip, type TooltipPlacement } from '@stacktape/ui-react/tooltip';
import type { ReactNode } from 'react';
import { GoQuestion } from 'react-icons/go';

/**
 * The help mark: a `?` beside a control or a line, with the explanation in a tooltip, as the Console does it.
 *
 * Explanations live here rather than in paragraphs above a control. The mark takes keyboard focus and names what it
 * explains, because the explanation is nowhere else on the page.
 */
export function InfoTip({
  about,
  children,
  placement = 'top',
  size = 14
}: {
  /** What it explains, for screen readers: "About secrets". */
  about: string;
  children: ReactNode;
  placement?: TooltipPlacement;
  size?: number;
}) {
  return (
    <Tooltip content={children} maxWidth={340} placement={placement}>
      <button aria-label={`About ${about}`} className="w-info" type="button">
        <GoQuestion aria-hidden size={size} />
      </button>
    </Tooltip>
  );
}
