import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'react-feather';
import { typographyCss } from '@/styles/global';
import { colors, interactiveBase, interactiveGlow } from '@/styles/variables';

function ExpandableItem({
  title,
  expandedContent,
  rootCss,
  disableExpand,
  collapsedFromParent,
  setCollapsedFromParent,
  useChevronRight
}: {
  title: ReactNode;
  expandedContent: ReactNode[];
  rootCss?: Css;
  disableExpand?: boolean;
  collapsedFromParent?: boolean;
  setCollapsedFromParent?: (collapsed: boolean) => void;
  useChevronRight?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const collapsed = collapsedFromParent !== undefined ? collapsedFromParent : isCollapsed;

  const measureHeight = useCallback(() => {
    if (contentRef.current) {
      // Force a reflow to ensure accurate measurement
      contentRef.current.style.height = 'auto';
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
    }
  }, []);

  const handleClick = () => {
    if (setCollapsedFromParent) setCollapsedFromParent(!collapsed);
    else setIsCollapsed(disableExpand ? true : !collapsed);
  };

  // Measure height when content changes
  useEffect(() => {
    measureHeight();
  }, [expandedContent, measureHeight]);

  // Measure height when component becomes visible (expanded)
  useEffect(() => {
    if (!collapsed) {
      // Use a small delay to ensure content is rendered
      const timer = setTimeout(measureHeight, 10);
      return () => clearTimeout(timer);
    }
  }, [collapsed, measureHeight]);

  // Add resize observer to recalculate height on window resize
  useEffect(() => {
    if (!contentRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!collapsed) {
        measureHeight();
      }
    });

    resizeObserver.observe(contentRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [collapsed, measureHeight]);

  return (
    <div
      css={{
        ...interactiveBase,
        ...interactiveGlow.default,
        background: colors.elementBackground,
        borderRadius: '8px',
        margin: '20px 0px 15px 0px',
        WebkitTapHighlightColor: 'transparent',
        overflow: 'hidden',
        '&:hover': {
          ...interactiveGlow.hover
        },
        ...rootCss
      }}
    >
      <div
        css={{
          cursor: 'pointer',
          padding: '9px 13px 9px 20px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyUp={handleClick}
      >
        <div
          css={{
            display: 'flex',
            flexDirection: 'row',
            userSelect: 'none',
            ...typographyCss,
            fontWeight: 'bold'
          }}
        >
          {title}
        </div>
        <motion.div
          css={{
            width: '27px',
            height: '27px',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          animate={{ ...(!useChevronRight && { rotate: collapsed ? 0 : 180 }) }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {useChevronRight ? (
            <ChevronRight size={20} strokeWidth={3} color={colors.fontColorPrimary} />
          ) : (
            <ChevronDown size={20} strokeWidth={3} color={colors.fontColorPrimary} />
          )}
        </motion.div>
      </div>
      <motion.div
        initial={false}
        animate={{
          height: collapsed ? 0 : contentHeight || 'auto',
          opacity: collapsed ? 0 : 1
        }}
        transition={{
          height: { duration: 0.3, ease: 'easeOut' },
          opacity: { duration: 0.2, ease: 'easeOut', delay: collapsed ? 0 : 0.1 }
        }}
        style={{ overflow: 'hidden' }}
      >
        <div
          ref={contentRef}
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '5px 12px 15px 20px'
          }}
        >
          {expandedContent.map((expandedContentItem, idx) => (
            <div css={{ ...typographyCss, lineHeight: 1.5 }} key={idx}>
              {expandedContentItem}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default ExpandableItem;
