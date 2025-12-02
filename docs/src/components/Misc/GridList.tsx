import { merge } from 'lodash';

export function GridList({ children, rootCss, minItemWidth }: { children: any; rootCss?: Css; minItemWidth?: string }) {
  return (
    <div
      css={merge(
        {
          width: '100%',
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${minItemWidth || '1fr'}, 1fr))`,
          gridGap: '10px',
          '> div': {
            width: '100%'
          }
        },
        rootCss || {}
      )}
    >
      {children}
    </div>
  );
}
