import clsx from 'clsx';
import { colors } from '../../styles/variables';

type DecisionNode = {
  question?: string;
  answer?: string;
  result?: string;
  children?: DecisionNode[];
};

function DecisionNodeComponent({ node }: { node: DecisionNode }) {
  return (
    <div className="mb-2">
      {node.question && (
        <div className="text-fc-primary font-semibold text-[0.925rem] mb-2 flex items-start gap-2 before:content-['?'] before:inline-flex before:items-center before:justify-center before:w-5 before:h-5 before:rounded-full before:bg-primary before:text-darker before:text-[12px] before:font-bold before:shrink-0">
          {node.question}
        </div>
      )}
      {node.answer && (
        <div className="text-light-gray text-[0.875rem] mb-[6px] flex items-start gap-2 before:content-['→'] before:text-primary before:font-semibold">
          {node.answer}
        </div>
      )}
      {node.result && (
        <div
          className="text-primary font-semibold text-[0.925rem] flex items-center gap-2 px-3 py-[6px] rounded-[6px] mt-1 mb-2 before:content-['✓'] before:font-bold"
          style={{ backgroundColor: `${colors.primary}15` }}
        >
          {node.result}
        </div>
      )}
      {node.children && node.children.length > 0 && (
        <div className="flex flex-col pl-5 border-l-2 ml-2" style={{ borderLeftColor: `${colors.primary}33` }}>
          {node.children.map((child, index) => (
            <DecisionNodeComponent key={index} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DecisionTree({ nodes }: { nodes: DecisionNode[] }) {
  return (
    <div className="my-6 p-5 bg-element rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]">
      {nodes.map((node, index) => (
        <DecisionNodeComponent key={index} node={node} />
      ))}
    </div>
  );
}

type FileNode = {
  name: string;
  type?: 'file' | 'folder';
  children?: FileNode[];
  description?: string;
};

const folderIcon = (
  <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const fileIcon = (
  <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

function FileNodeComponent({ node, isLast, depth }: { node: FileNode; isLast: boolean; depth: number }) {
  const isFolder = node.type === 'folder' || (node.children && node.children.length > 0);

  return (
    <div className={depth > 0 ? 'ml-5' : undefined}>
      <div
        className={clsx(
          'flex items-center py-1 text-[0.875rem] font-mono relative',
          isFolder ? 'text-primary' : 'text-fc-primary',
          depth > 0 && 'before:absolute before:left-[-20px] before:text-light-gray',
          depth > 0 && (isLast ? "before:content-['└─']" : "before:content-['├─']")
        )}
      >
        {isFolder ? folderIcon : fileIcon}
        <span className={isFolder ? 'font-semibold' : 'font-normal'}>{node.name}</span>
        {node.description && (
          <span className="ml-3 text-light-gray text-[0.8rem] font-[inherit]">{node.description}</span>
        )}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="border-l ml-2" style={{ borderLeftColor: `${colors.lightGray}33` }}>
          {node.children.map((child, index) => (
            <FileNodeComponent key={index} node={child} isLast={index === node.children!.length - 1} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectStructure({ files }: { files: FileNode[] }) {
  return (
    <div className="my-6 px-5 py-4 bg-element rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]">
      {files.map((file, index) => (
        <FileNodeComponent key={index} node={file} isLast={index === files.length - 1} depth={0} />
      ))}
    </div>
  );
}

type FlowStep = {
  title: string;
  description?: string;
  icon?: string;
};

export function FlowDiagram({ steps }: { steps: FlowStep[] }) {
  return (
    <div className="my-6 flex flex-col gap-0">
      {steps.map((step, index) => (
        <div key={index} className="flex items-stretch">
          <div className="flex flex-col items-center mr-4">
            <div className="w-8 h-8 rounded-full bg-primary text-darker flex items-center justify-center font-sans font-bold text-[14px] shrink-0">
              {step.icon || index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className="w-[2px] flex-1 min-h-[20px]" style={{ backgroundColor: `${colors.primary}33` }} />
            )}
          </div>
          <div className={index < steps.length - 1 ? 'pb-5' : undefined}>
            <p className="font-semibold text-fc-primary mb-1">{step.title}</p>
            {step.description && <p className="text-light-gray text-[0.875rem]">{step.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
