import { debounce } from 'lodash';
import { useLayoutEffect, useRef } from 'react';
import { useSessionStorage } from 'react-use';
import { border, growDownAnimation, pageLayout, prettyScrollBar } from '@/styles/variables';
import { onMaxW795 } from '../../../styles/responsive';
import { ContentTree } from './ContentTree';

export function SidebarNavigation({
  showOnSm,
  allDocPages
}: {
  showOnSm: boolean;
  allDocPages: MdxPageDataForNavigation[];
}) {
  const [persistedScrollPosition, setPersistedScrollPosition] = useSessionStorage('_stp-sidebar-scroll-pos', 0);
  const ref = useRef(null);
  const saveScrollPosition = debounce((e) => {
    setPersistedScrollPosition(e.target.scrollTop);
  }, 12);
  useLayoutEffect(() => {
    ref.current.scrollTop = persistedScrollPosition;
  }, [persistedScrollPosition]);

  return (
    <nav
      css={{
        height: `calc(100vh - ${pageLayout.headerHeight}px)`,
        position: 'sticky',
        top: pageLayout.headerHeight,
        left: 0,
        right: 0,
        overflowX: 'hidden',
        width: '305px',
        minWidth: '305px',
        flexDirection: 'column',
        display: 'flex',
        [onMaxW795]: {
          top: 'unset',
          display: showOnSm ? 'block' : 'none',
          width: '100%',
          height: 'auto',
          borderRight: 'none',
          position: 'relative'
        }
      }}
    >
      <div
        ref={ref}
        css={
          {
            alignContent: 'right',
            overflowY: 'scroll',
            '@supports (-moz-appearance:none)': {
              overflowY: 'scroll'
            },
            WebkitOverflowScrolling: 'hidden',
            '&:hover, &:focus': {
              overflowY: 'overlay',
              WebkitOverflowScrolling: 'touch'
            },
            alignSelf: 'flex-end',
            width: '100%',
            [onMaxW795]: {
              width: '100%',
              background: 'unset',
              paddingLeft: '12px',
              paddingRight: '12px',
              ...growDownAnimation
            },
            margin: '0',
            display: 'block',
            paddingTop: '20px',
            borderRight: border,
            ...prettyScrollBar
          } as any
        }
        onScroll={saveScrollPosition}
      >
        <ContentTree allDocPages={allDocPages} />
        <div css={{ height: '25px' }} />
      </div>
    </nav>
  );
}
