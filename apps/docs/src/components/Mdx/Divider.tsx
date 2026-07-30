import type { CSSProperties } from 'react';

/** Horizontal rule closing the article body, above the footer. */
export function Divider({ style }: { style?: CSSProperties }) {
  return <div className="h-px bg-border" style={style} />;
}
