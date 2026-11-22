import type { CSSProperties } from 'react';

type FileNode = {
  name: string;
  type?: 'file' | 'folder';
  children?: FileNode[];
  description?: string;
};

const folderIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const fileIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

function FileNodeItem({ node }: { node: FileNode }) {
  const isFolder = node.type === 'folder' || (node.children && node.children.length > 0);
  return (
    <li>
      <div className="docs-tree-entry">
        <span className={isFolder ? 'docs-tree-name is-folder' : 'docs-tree-name'}>
          {isFolder ? folderIcon : fileIcon}
          {node.name}
        </span>
        {node.description && <span className="docs-tree-description">{node.description}</span>}
      </div>
      {node.children && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <FileNodeItem key={child.name} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** A file tree, as nested lists with a guide line per level. Descriptions wrap below names on narrow screens. */
export function ProjectStructure({ files }: { files: FileNode[] }) {
  return (
    <div className="docs-tree">
      <ul>
        {files.map((file) => (
          <FileNodeItem key={file.name} node={file} />
        ))}
      </ul>
    </div>
  );
}

type FlowStep = {
  title: string;
  description?: string;
  icon?: string;
};

/** An ordered sequence: numbered markers on a connecting line, a title and an optional sentence per step. */
export function FlowDiagram({ steps }: { steps: FlowStep[] }) {
  return (
    <ol className="docs-steps">
      {steps.map((step) => (
        <li
          key={step.title}
          className="docs-step"
          style={step.icon ? ({ '--docs-step-marker': JSON.stringify(step.icon) } as CSSProperties) : undefined}
        >
          <p className="docs-step-title">{step.title}</p>
          {step.description && <p className="docs-step-text">{step.description}</p>}
        </li>
      ))}
    </ol>
  );
}
