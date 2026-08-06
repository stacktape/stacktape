import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { useId } from 'react';

export type ConfigEditorViewId = 'source' | 'cloudformation' | 'tree' | 'diagram';

export type ConfigEditorView = {
  description?: string;
  icon?: ReactNode;
  id: ConfigEditorViewId;
  label: string;
  shortLabel?: string;
};

export type ConfigEditorProps = {
  actions?: ReactNode;
  activeView: ConfigEditorViewId;
  children: ReactNode;
  className?: string;
  hideTabs?: boolean;
  id?: string;
  isFullscreen?: boolean;
  onActiveViewChange: (view: ConfigEditorViewId) => void;
  overlay?: ReactNode;
  style?: CSSProperties;
  unsaved?: boolean;
  views: readonly ConfigEditorView[];
};

const classes = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

/**
 * Shared frame for the Stacktape configuration editor.
 *
 * The host owns configuration state, Monaco, compilation and product-specific actions. This
 * component owns the reusable surface: accessible view navigation, responsive labels, overlay and
 * fullscreen layout. Keeping that boundary explicit lets Console, docs and the onboarding wizard
 * compose different capabilities without forking the editor chrome.
 */
export function ConfigEditor({
  actions,
  activeView,
  children,
  className,
  hideTabs = false,
  id,
  isFullscreen = false,
  onActiveViewChange,
  overlay,
  style,
  unsaved = false,
  views
}: ConfigEditorProps) {
  const generatedId = useId();
  const editorId = id ?? `stacktape-config-editor-${generatedId}`;
  const activeTabId = `${editorId}-${activeView}-tab`;
  const activePanelId = `${editorId}-${activeView}-panel`;

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }

    const currentIndex = views.findIndex(({ id: viewId }) => viewId === activeView);
    if (currentIndex < 0) {
      return;
    }

    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? views.length - 1
          : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + views.length) % views.length;
    const nextView = views[nextIndex];
    if (!nextView) {
      return;
    }

    event.preventDefault();
    onActiveViewChange(nextView.id);
    const tabList = event.currentTarget.parentElement;
    (tabList?.querySelector(`[data-config-editor-view="${nextView.id}"]`) as HTMLButtonElement | null)?.focus();
  };

  return (
    <section
      className={classes('stp-config-editor', isFullscreen && 'stp-config-editor--fullscreen', className)}
      id={editorId}
      style={style}
    >
      {(!hideTabs || actions) && (
        <header className="stp-config-editor__header">
          {!hideTabs && (
            <div aria-label="Configuration views" className="stp-config-editor__tabs" role="tablist">
              {views.map((view) => {
                const isActive = view.id === activeView;
                return (
                  <button
                    aria-controls={`${editorId}-${view.id}-panel`}
                    aria-selected={isActive}
                    className={classes('stp-config-editor__tab', isActive && 'stp-config-editor__tab--active')}
                    data-config-editor-view={view.id}
                    id={`${editorId}-${view.id}-tab`}
                    key={view.id}
                    onClick={() => onActiveViewChange(view.id)}
                    onKeyDown={handleTabKeyDown}
                    role="tab"
                    tabIndex={isActive ? 0 : -1}
                    title={view.description}
                    type="button"
                  >
                    {view.icon && (
                      <span aria-hidden="true" className="stp-config-editor__tab-icon">
                        {view.icon}
                      </span>
                    )}
                    <span
                      className={classes(
                        'stp-config-editor__tab-label',
                        view.shortLabel && 'stp-config-editor__tab-label--long'
                      )}
                    >
                      {view.label}
                    </span>
                    {view.shortLabel && <span className="stp-config-editor__tab-label--short">{view.shortLabel}</span>}
                    {view.id === 'source' && unsaved && (
                      <>
                        <span aria-hidden="true" className="stp-config-editor__unsaved" />
                        <span className="stp-config-editor__visually-hidden">Unsaved changes</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {actions && <div className="stp-config-editor__actions">{actions}</div>}
        </header>
      )}
      <div
        aria-labelledby={hideTabs ? undefined : activeTabId}
        className="stp-config-editor__panel"
        id={hideTabs ? undefined : activePanelId}
        role={hideTabs ? undefined : 'tabpanel'}
      >
        {children}
      </div>
      {overlay && <div className="stp-config-editor__overlay">{overlay}</div>}
    </section>
  );
}
