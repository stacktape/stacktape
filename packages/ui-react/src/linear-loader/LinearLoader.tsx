import type { CSSProperties } from 'react';

export type LinearLoaderProps = {
  loading?: boolean;
  className?: string;
  width?: CSSProperties['width'];
  height?: number | string;
  color?: CSSProperties['color'];
  duration?: string;
};

/** A non-layout-shifting indeterminate loading line. */
export function LinearLoader({
  className,
  color = 'currentColor',
  duration = '1.75s',
  height = 2,
  loading = true,
  width = '100%'
}: LinearLoaderProps) {
  const style = {
    '--stp-linear-loader-color': color,
    '--stp-linear-loader-duration': duration,
    height: typeof height === 'number' ? `${height}px` : height,
    width
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      className={['stp-ui-linear-loader', loading && 'stp-ui-linear-loader--loading', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
    />
  );
}
