import { useEffect, useState } from 'react';
import { AlignRight } from 'react-feather';
import { onMaxW1200 } from '@/styles/responsive';
import { colors, pageLayout, prettyScrollBar } from '@/styles/variables';

export function TableOfContents({ tableOfContents }: { tableOfContents: TableOfContentsItem[] }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const headingElements = tableOfContents
      .map((item) => {
        const id = item.href.replace('#', '');
        return document.getElementById(id);
      })
      .filter(Boolean);

    if (headingElements.length === 0) {
      return;
    }

    // Set initial active heading based on current scroll position
    const setInitialActiveHeading = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      // If we're at the top of the page (within 100px), set the first heading as active
      if (scrollTop < 100) {
        const firstHeading = headingElements[0];
        if (firstHeading) {
          setActiveId(firstHeading.id);
        }
        return;
      }

      // Otherwise, find the appropriate heading based on scroll position
      const allHeadings = headingElements
        .map((el) => ({
          id: el!.id,
          top: el!.getBoundingClientRect().top
        }))
        .filter((heading) => heading.top < 75) // Above the viewport (considering 75px header height)
        .sort((a, b) => b.top - a.top); // Sort by position, closest to top first

      if (allHeadings.length > 0) {
        setActiveId(allHeadings[0].id);
      } else if (headingElements.length > 0) {
        // Fallback to first heading if no headings are above viewport
        setActiveId(headingElements[0]!.id);
      }
    };

    // Defer initial active heading to avoid direct setState in useEffect
    const rafId = requestAnimationFrame(setInitialActiveHeading);

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first visible heading
        const visibleHeadings = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visibleHeadings.length > 0) {
          setActiveId(visibleHeadings[0].target.id);
        } else {
          // If no headings are visible, find the last heading that's above the viewport
          const allHeadings = headingElements
            .map((el) => ({
              id: el!.id,
              top: el!.getBoundingClientRect().top
            }))
            .filter((heading) => heading.top < 75) // Above the viewport (considering 75px header height)
            .sort((a, b) => b.top - a.top); // Sort by position, closest to top first

          if (allHeadings.length > 0) {
            setActiveId(allHeadings[0].id);
          }
        }
      },
      {
        rootMargin: '-75px 0% -80% 0%', // Account for 75px header height
        threshold: 0
      }
    );

    headingElements.forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [tableOfContents]);

  return (
    <div
      css={{
        ...prettyScrollBar,
        backgroundColor: colors.backgroundColor,
        height: `calc(100vh - ${pageLayout.headerHeight}px)`,
        padding: '15px 10px 0px 15px',
        position: 'sticky',
        top: `${pageLayout.headerHeight}px`,
        right: 0,
        overflowY: 'auto',
        scrollbarWidth: 'none',
        '::-webkit-scrollbar': {
          display: 'none'
        },
        width: '305px',
        minWidth: '305px',
        li: {
          listStyle: 'none',
          a: {
            zIndex: 1000,
            fontSize: '12.5px',
            lineHeight: 1.2,
            padding: '5px 24px 4px 0px',
            color: colors.fontColorPrimary,
            textDecoration: 'none',
            display: 'block',
            position: 'relative',
            cursor: 'pointer'
          },
          '&:hover': {
            a: {
              color: colors.navigationHover
            }
          }
        },
        '.current-item': {
          a: {
            backgroundColor: 'rgb(5 97 100 / 80%)',
            borderLeft: `2.5px solid ${colors.stacktapeGreen}`,
            borderRadius: '2px'
          }
        },
        [onMaxW1200]: {
          display: 'none'
        }
      }}
    >
      <p
        css={{
          marginLeft: '10px',
          lineHeight: 1,
          padding: '7px 24px 7px 5px',
          color: colors.fontColorPrimary,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12.5px'
        }}
      >
        <AlignRight size={15} />
        <span>Contents</span>
      </p>
      <div
        css={{
          marginTop: '4px',
          display: 'flex'
        }}
      >
        <div
          css={{
            width: '1px',
            backgroundColor: colors.borderColor
          }}
        />
        <ul>
          {(() => {
            // Find the minimum level to use as baseline for relative indentation
            const minLevel = Math.min(...tableOfContents.map((item) => item.level || 1));

            return tableOfContents.map((item) => {
              const isActive = activeId === item.href.replace('#', '');
              return (
                <li
                  key={item.href}
                  className={isActive ? 'current-item' : ''}
                  css={{
                    a: {
                      paddingLeft: `${1 + ((item.level || 0) - minLevel) * 1 - 0.07}rem !important`,
                      svg: {
                        float: 'right',
                        marginRight: '1rem'
                      }
                    }
                  }}
                >
                  <a href={item.href}>&nbsp;{item.text}</a>
                </li>
              );
            });
          })()}
        </ul>
      </div>
      <div css={{ height: '20px' }} />
    </div>
  );
}

export default TableOfContents;
