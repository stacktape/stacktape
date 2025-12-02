import { merge } from 'lodash';
import { border, boxShadow, colors } from '@/styles/variables';

export function Box({ children, rootCss, interactive }: { children: any; rootCss?: Css; interactive?: boolean }) {
  return (
    <div
      css={merge(
        {
          boxShadow,
          border,
          borderRadius: '5px',
          background: colors.elementBackground,
          ...(interactive && {
            cursor: 'pointer'
          })
        },
        rootCss || {}
      )}
    >
      {children}
    </div>
  );
}
