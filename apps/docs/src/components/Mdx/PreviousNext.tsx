import { ArrowLeft, ArrowRight } from 'react-feather';
import { ensureTrailingSlash } from '@/utils/seo';

type Target = { url?: string; title?: string };

/** Links to the previous and next guide. A single link takes the whole row; on a phone the two stack. */
export function PreviousNext({ left, right }: { left?: Target; right?: Target }) {
  return (
    <nav className="docs-pager" aria-label="Previous and next guide">
      {left?.url && (
        <a href={ensureTrailingSlash(left.url)} className="docs-pager-link docs-unstyled-link" rel="prev">
          <span className="docs-pager-direction">
            <ArrowLeft size={14} aria-hidden />
            Previous
          </span>
          <span className="docs-pager-title">{left.title}</span>
        </a>
      )}
      {right?.url && (
        <a href={ensureTrailingSlash(right.url)} className="docs-pager-link is-next docs-unstyled-link" rel="next">
          <span className="docs-pager-direction">
            Next
            <ArrowRight size={14} aria-hidden />
          </span>
          <span className="docs-pager-title">{right.title}</span>
        </a>
      )}
    </nav>
  );
}
