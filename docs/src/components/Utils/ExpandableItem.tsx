import type { ReactNode } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'react-feather';
import { colors } from '@/styles/variables';

function ExpandableItem({
  title,
  expandedContent,
  rootClassName,
  disableExpand,
  collapsedFromParent,
  setCollapsedFromParent,
  useChevronRight
}: {
  title: ReactNode;
  expandedContent: ReactNode[];
  rootClassName?: string;
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
      className={clsx(
        'mx-0 mt-[20px] mb-[15px] cursor-pointer overflow-hidden rounded-[8px] border-none bg-element transition-all duration-[250ms] ease-[ease] [-webkit-tap-highlight-color:transparent]',
        'shadow-[0_4px_12px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.12)]',
        'hover:shadow-[0_6px_16px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.12),inset_0_1px_0_rgba(255,255,255,0.18)]',
        rootClassName
      )}
    >
      <div
        className="flex cursor-pointer flex-row items-center justify-between py-[9px] pr-[13px] pl-[20px]"
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyUp={handleClick}
      >
        <div className="stp-typography flex flex-row font-bold select-none">{title}</div>
        <motion.div
          className="flex h-[27px] w-[27px] flex-row items-center justify-center"
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
        <div ref={contentRef} className="flex flex-col gap-[4px] pt-[5px] pr-[12px] pb-[15px] pl-[20px]">
          {expandedContent.map((expandedContentItem, idx) => (
            <div className="stp-typography leading-[1.5]" key={idx}>
              {expandedContentItem}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default ExpandableItem;
