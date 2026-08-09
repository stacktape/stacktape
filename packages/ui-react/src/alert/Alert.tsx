import type { CSSProperties, ReactNode } from 'react';
import { BiBulb, BiCheckCircle, BiError, BiErrorCircle, BiX } from 'react-icons/bi';

export type AlertTone = 'danger' | 'warning' | 'info' | 'success';

export type AlertProps = {
  tone: AlertTone;
  children: ReactNode;
  title?: ReactNode;
  icon?: ReactNode | false;
  onDismiss?: () => void;
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
  id?: string;
  onAction?: () => void;
  actionLabel?: string;
};

const defaultIcons: Record<AlertTone, ReactNode> = {
  danger: <BiErrorCircle aria-hidden="true" size={26} />,
  warning: <BiError aria-hidden="true" size={26} />,
  info: <BiBulb aria-hidden="true" size={26} />,
  success: <BiCheckCircle aria-hidden="true" size={26} />
};

/** A semantic status surface. Persistence of dismissed product hints belongs to the consuming app. */
export function Alert({
  actionLabel,
  actions,
  children,
  className,
  icon,
  id,
  onAction,
  onDismiss,
  style,
  title,
  tone
}: AlertProps) {
  const content = (
    <>
      {icon !== false ? <span className="stp-ui-alert__icon">{icon ?? defaultIcons[tone]}</span> : null}
      <div className="stp-ui-alert__content">
        {title ? <strong className="stp-ui-alert__title">{title}</strong> : null}
        <div>{children}</div>
        {actions ? <div className="stp-ui-alert__actions">{actions}</div> : null}
      </div>
      {onDismiss ? (
        <button aria-label="Dismiss" className="stp-ui-alert__dismiss" onClick={onDismiss} type="button">
          <BiX aria-hidden="true" size={24} />
        </button>
      ) : null}
    </>
  );

  const rootClassName = ['stp-ui-alert', `stp-ui-alert--${tone}`, onAction && 'stp-ui-alert--action', className]
    .filter(Boolean)
    .join(' ');

  return onAction ? (
    <button aria-label={actionLabel} className={rootClassName} id={id} onClick={onAction} style={style} type="button">
      {content}
    </button>
  ) : (
    <div className={rootClassName} id={id} role={tone === 'danger' ? 'alert' : 'status'} style={style}>
      {content}
    </div>
  );
}
