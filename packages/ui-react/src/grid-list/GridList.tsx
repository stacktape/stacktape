import type { CSSProperties, ReactNode } from 'react';

export function GridList({
  children,
  minItemWidth = '1fr',
  className,
  style
}: {
  children: ReactNode;
  minItemWidth?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={['stp-ui-grid-list', className].filter(Boolean).join(' ')}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minItemWidth}, 1fr))`, ...style }}
    >
      {children}
    </div>
  );
}
