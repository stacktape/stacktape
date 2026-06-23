import merge from 'lodash/merge';
import { box, clickableBoxStyle, colors } from '@/styles/variables';

export function Box({ children, rootCss, interactive }: { children: any; rootCss?: Css; interactive?: boolean }) {
  return (
    <div
      css={merge(
        {
          ...box,
          ...(interactive && clickableBoxStyle)
        },
        rootCss || {}
      )}
    >
      {children}
    </div>
  );
}
