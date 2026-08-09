import type { CSSProperties, ReactNode } from 'react';
import { useId } from 'react';
import { Tabs } from '../tabs/Tabs.js';

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
  const activeTabId = `${editorId}-views-tab-${activeView}`;
  const activePanelId = `${editorId}-${activeView}-panel`;

  return (
    <section
      className={classes('stp-config-editor', isFullscreen && 'stp-config-editor--fullscreen', className)}
      id={editorId}
      style={style}
    >
      {(!hideTabs || actions) && (
        <header className="stp-config-editor__header">
          {!hideTabs && (
            <Tabs
              appearance="editor"
              ariaLabel="Configuration views"
              className="stp-config-editor__tabs"
              id={`${editorId}-views`}
              onValueChange={onActiveViewChange}
              tabs={views.map((view) => ({
                value: view.id,
                label: view.label,
                compactLabel: view.shortLabel,
                icon: view.icon,
                ...(view.description && { title: view.description }),
                panelId: `${editorId}-${view.id}-panel`,
                suffix:
                  view.id === 'source' && unsaved ? (
                    <>
                      <span aria-hidden="true" className="stp-config-editor__unsaved" />
                      <span className="stp-config-editor__visually-hidden">Unsaved changes</span>
                    </>
                  ) : undefined
              }))}
              value={activeView}
              width="fit"
            />
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
