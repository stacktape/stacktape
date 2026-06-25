import type { CSSProperties } from 'react';
import { colors } from '../../styles/variables';

export function Highlighter({ type, props }: { type: 'warning' | 'info' | 'tip' | 'error'; icon?: unknown; props: { children: any } }) {
  const highlightColor = {
    warning: {
      border: colors.orange,
      background: 'rgba(237, 139, 0, 0.12)',
      font: colors.fontColorPrimary
    },
    info: {
      border: colors.blue,
      background: 'rgba(0, 102, 204, 0.12)',
      font: colors.fontColorPrimary
    },
    tip: {
      border: colors.success,
      background: 'rgba(24, 153, 144, 0.12)',
      font: colors.fontColorPrimary
    },
    error: {
      border: '#e74c3c',
      background: 'rgba(231, 76, 60, 0.12)',
      font: colors.fontColorPrimary
    }
  }[type];

  return (
    <div
      className="my-[30px] flex items-center rounded-[8px] border-l-[4px] border-solid px-[18px] py-[16px] leading-[1.6] shadow-[0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-[8px]"
      style={{
        borderLeftColor: highlightColor.border,
        backgroundColor: highlightColor.background
      }}
    >
      <div
        className="stp-typography min-w-0 flex-[1_1_auto] self-center text-[color:var(--highlight-font)!important] [&_*]:font-sans [&_*]:not-italic [&_*]:font-medium [&_*]:text-[0.925rem] [&_*]:leading-[1.9] [&_*]:text-[color:var(--highlight-font)!important] max-[750px]:[&_*]:text-[0.85rem] [&_*>.paragraph]:text-[color:var(--highlight-font)!important] [&_.paragraph]:leading-[1.55!important] [&_.paragraph:first-child]:mt-0 [&_.paragraph:last-child]:mb-0 [&_code]:align-baseline [&_code]:text-[color:var(--highlight-font)!important]"
        style={{ '--highlight-font': highlightColor.font } as CSSProperties}
        // props}
      >
        {props.children}
      </div>
    </div>
  );
}
