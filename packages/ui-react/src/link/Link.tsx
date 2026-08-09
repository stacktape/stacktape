import type { ComponentPropsWithRef } from 'react';

export type LinkTone = 'accent' | 'muted' | 'primary';

export const linkClassName = ({
  tone = 'accent',
  underline = 'hover',
  className
}: {
  tone?: LinkTone;
  underline?: 'always' | 'hover' | 'never';
  className?: string;
} = {}) =>
  ['stp-ui-link', `stp-ui-link--${tone}`, `stp-ui-link--underline-${underline}`, className].filter(Boolean).join(' ');

export type LinkProps = ComponentPropsWithRef<'a'> & {
  tone?: LinkTone;
  underline?: 'always' | 'hover' | 'never';
  /** Adds the safe target/rel pair. Navigation and URL normalization still belong to the host. */
  openInNewTab?: boolean;
};

/** Router-neutral text link. Framework links can use `linkClassName` with the same appearance. */
export function Link({ children, className, tone, underline, openInNewTab, rel, target, ...props }: LinkProps) {
  const appearance = {
    ...(tone ? { tone } : {}),
    ...(underline ? { underline } : {}),
    ...(className ? { className } : {})
  };

  return (
    <a
      className={linkClassName(appearance)}
      rel={openInNewTab ? (rel ?? 'noopener noreferrer') : rel}
      target={openInNewTab ? '_blank' : target}
      {...props}
    >
      {children}
    </a>
  );
}
