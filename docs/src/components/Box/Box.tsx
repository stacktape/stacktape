import clsx from 'clsx';

export function Box({
  children,
  className,
  interactive
}: {
  children: any;
  className?: string;
  interactive?: boolean;
}) {
  return <div className={clsx('stp-box', interactive && 'stp-clickable-box', className)}>{children}</div>;
}
