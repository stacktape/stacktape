import { useState, type ReactNode } from 'react';

/**
 * Content that opens and closes by growing to its height and shrinking back, the one expand animation of the wizard.
 * Closed content is not rendered; it stays mounted only until it has finished closing, so a closed part costs nothing
 * and is out of the tab order and the accessibility tree.
 */
export function Expand({
  isOpen,
  id,
  className,
  children
}: {
  isOpen: boolean;
  /** For the `aria-controls` of the control that opens it. */
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const [isMounted, setMounted] = useState(isOpen);
  // Adjusted while rendering, so the content is there in the same paint that starts the opening.
  if (isOpen && !isMounted) setMounted(true);
  return (
    <div
      className={`w-expand${className === undefined ? '' : ` ${className}`}`}
      data-open={isOpen ? '' : undefined}
      id={id}
      inert={!isOpen}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && event.propertyName === 'grid-template-rows' && !isOpen) {
          setMounted(false);
        }
      }}
    >
      <div className="w-expand-inner">{isMounted ? children : null}</div>
    </div>
  );
}
