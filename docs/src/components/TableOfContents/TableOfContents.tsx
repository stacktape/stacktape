import { useEffect, useMemo, useState } from 'react';
import { AlignRight } from 'react-feather';
import { onMaxW1200 } from '@/styles/responsive';
import { colors, pageLayout, prettyScrollBar } from '@/styles/variables';

const ROW_HEIGHT = 26;
const INDENT_PX = 12;
const PATH_X_OFFSET = 8;
const TRANSITION_ZONE = 8;
const TEXT_GAP = 14;
const SNAKE_LENGTH = 18;

const sampleBezierLength = (
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  samples = 16
) => {
  let total = 0;
  let prev = p0;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const t1 = 1 - t;
    const x = t1 * t1 * t1 * p0.x + 3 * t1 * t1 * t * p1.x + 3 * t1 * t * t * p2.x + t * t * t * p3.x;
    const y = t1 * t1 * t1 * p0.y + 3 * t1 * t1 * t * p1.y + 3 * t1 * t * t * p2.y + t * t * t * p3.y;
    total += Math.hypot(x - prev.x, y - prev.y);
    prev = { x, y };
  }
  return total;
};

export function TableOfContents({ tableOfContents: rawToc }: { tableOfContents: TableOfContentsItem[] }) {
  const [activeId, setActiveId] = useState<string>('');

  // Skip h1: page heading is already rendered as the page title above the body.
  const tableOfContents = useMemo(() => rawToc.filter((item) => (item.level || 1) > 1), [rawToc]);

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

    const setInitialActiveHeading = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (scrollTop < 100) {
        const firstHeading = headingElements[0];
        if (firstHeading) {
          setActiveId(firstHeading.id);
        }
        return;
      }

      const allHeadings = headingElements
        .map((el) => ({
          id: el!.id,
          top: el!.getBoundingClientRect().top
        }))
        .filter((heading) => heading.top < 75)
        .sort((a, b) => b.top - a.top);

      if (allHeadings.length > 0) {
        setActiveId(allHeadings[0].id);
      } else if (headingElements.length > 0) {
        setActiveId(headingElements[0]!.id);
      }
    };

    const rafId = requestAnimationFrame(setInitialActiveHeading);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleHeadings = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visibleHeadings.length > 0) {
          setActiveId(visibleHeadings[0].target.id);
        } else {
          const allHeadings = headingElements
            .map((el) => ({
              id: el!.id,
              top: el!.getBoundingClientRect().top
            }))
            .filter((heading) => heading.top < 75)
            .sort((a, b) => b.top - a.top);

          if (allHeadings.length > 0) {
            setActiveId(allHeadings[0].id);
          }
        }
      },
      {
        rootMargin: '-75px 0% -80% 0%',
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

  const { points, pathD, svgWidth, svgHeight, minLevel, cumLen } = useMemo(() => {
    if (tableOfContents.length === 0) {
      return {
        points: [] as { x: number; y: number }[],
        pathD: '',
        svgWidth: 0,
        svgHeight: 0,
        minLevel: 1,
        cumLen: [] as number[]
      };
    }

    const minLvl = Math.min(...tableOfContents.map((i) => i.level || 1));
    const maxLvl = Math.max(...tableOfContents.map((i) => i.level || 1));
    const pts = tableOfContents.map((item, i) => ({
      x: PATH_X_OFFSET + ((item.level || 0) - minLvl) * INDENT_PX,
      y: i * ROW_HEIGHT + ROW_HEIGHT / 2
    }));

    // Build path AND track cumulative length at each item's center, so we can position the
    // active "snake" along the path with stroke-dashoffset (which animates along the curve).
    let d = `M ${pts[0].x} 0`;
    let len = pts[0].y; // M -> first L (down to first item center)
    d += ` L ${pts[0].x} ${pts[0].y}`;
    const lengths: number[] = [len];

    for (let i = 0; i < pts.length - 1; i++) {
      const cur = pts[i];
      const next = pts[i + 1];

      if (next.x === cur.x) {
        d += ` L ${next.x} ${next.y}`;
        len += next.y - cur.y;
      } else {
        const midY = (cur.y + next.y) / 2;
        d += ` L ${cur.x} ${midY - TRANSITION_ZONE}`;
        len += midY - TRANSITION_ZONE - cur.y;

        const c0 = { x: cur.x, y: midY - TRANSITION_ZONE };
        const c1 = { x: cur.x, y: midY };
        const c2 = { x: next.x, y: midY };
        const c3 = { x: next.x, y: midY + TRANSITION_ZONE };
        d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${c3.x} ${c3.y}`;
        len += sampleBezierLength(c0, c1, c2, c3);

        d += ` L ${next.x} ${next.y}`;
        len += next.y - (midY + TRANSITION_ZONE);
      }
      lengths.push(len);
    }

    // Tail: extend path past last item to the bottom of the row band.
    d += ` L ${pts[pts.length - 1].x} ${pts.length * ROW_HEIGHT}`;

    return {
      points: pts,
      pathD: d,
      svgWidth: PATH_X_OFFSET + (maxLvl - minLvl) * INDENT_PX + 4,
      svgHeight: pts.length * ROW_HEIGHT,
      minLevel: minLvl,
      cumLen: lengths
    };
  }, [tableOfContents]);

  const activeIdx = tableOfContents.findIndex((item) => activeId === item.href.replace('#', ''));
  const hasActive = activeIdx >= 0 && cumLen[activeIdx] !== undefined;
  const activeLen = hasActive ? cumLen[activeIdx] : 0;

  if (tableOfContents.length === 0) {
    return null;
  }

  return (
    <div
      css={{
        ...prettyScrollBar,
        backgroundColor: 'transparent',
        height: `calc(100vh - ${pageLayout.headerHeight}px)`,
        padding: '15px 10px 0px 15px',
        position: 'sticky',
        top: `${pageLayout.headerHeight}px`,
        right: 0,
        overflowY: 'auto',
        scrollbarWidth: 'none',
        '::-webkit-scrollbar': { display: 'none' },
        width: '305px',
        minWidth: '305px',
        [onMaxW1200]: { display: 'none' }
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
      <div css={{ position: 'relative', marginTop: '4px' }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          css={{
            position: 'absolute',
            left: 0,
            top: 0,
            pointerEvents: 'none',
            overflow: 'visible'
          }}
        >
          {/* The "rail" — full curve in a muted color. */}
          <path d={pathD} stroke={colors.borderColorLight} strokeWidth={1} fill="none" />
          {/* The "snake" — same path, but stroked with a fixed-length dash positioned via
              stroke-dashoffset. Transitioning the offset moves the visible segment along the
              curve, so the highlight follows every bend in the rail rather than cutting
              diagonally between positions. */}
          {hasActive && (
            <path
              d={pathD}
              stroke={colors.fontColorPrimary}
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${SNAKE_LENGTH} 99999`}
              strokeDashoffset={SNAKE_LENGTH / 2 - activeLen}
              css={{
                transition: 'stroke-dashoffset 320ms cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          )}
        </svg>
        <ul css={{ margin: 0, padding: 0 }}>
          {tableOfContents.map((item) => {
            const isActive = activeId === item.href.replace('#', '');
            const itemX = PATH_X_OFFSET + ((item.level || 0) - minLevel) * INDENT_PX;
            return (
              <li
                key={item.href}
                css={{
                  listStyle: 'none',
                  height: ROW_HEIGHT,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <a
                  href={item.href}
                  css={{
                    display: 'block',
                    width: '100%',
                    paddingLeft: itemX + TEXT_GAP,
                    paddingRight: '12px',
                    fontSize: '12.5px',
                    lineHeight: 1.2,
                    color: isActive ? colors.fontColorPrimary : colors.fontColorLighterGray,
                    fontWeight: isActive ? 500 : 400,
                    textDecoration: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    transition: 'color 140ms ease',
                    '&:hover': {
                      color: colors.fontColorPrimary
                    }
                  }}
                >
                  {item.text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
      <div css={{ height: '20px' }} />
    </div>
  );
}

export default TableOfContents;
