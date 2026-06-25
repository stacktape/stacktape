import clsx from 'clsx';

export function GridList({
  children,
  className,
  minItemWidth
}: {
  children: any;
  className?: string;
  minItemWidth?: string;
}) {
  return (
    <div
      className={clsx('grid w-full gap-[10px] [&>div]:w-full', className)}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minItemWidth || '1fr'}, 1fr))` }}
    >
      {children}
    </div>
  );
}
