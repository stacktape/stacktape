import { css } from '@emotion/react';
import { colors } from '../../styles/variables';

type DecisionNode = {
  question?: string;
  answer?: string;
  result?: string;
  children?: DecisionNode[];
};

const nodeStyle = css({
  display: 'flex',
  flexDirection: 'column',
  paddingLeft: '20px',
  borderLeft: `2px solid ${colors.primary}33`,
  marginLeft: '8px'
});

const questionStyle = css({
  color: colors.fontColorPrimary,
  fontWeight: 600,
  fontSize: '0.925rem',
  marginBottom: '8px',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  '&::before': {
    content: '"?"',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: colors.primary,
    color: colors.darkerBackground,
    fontSize: '12px',
    fontWeight: 700,
    flexShrink: 0
  }
});

const answerStyle = css({
  color: colors.lightGray,
  fontSize: '0.875rem',
  marginBottom: '6px',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  '&::before': {
    content: '"→"',
    color: colors.primary,
    fontWeight: 600
  }
});

const resultStyle = css({
  color: colors.primary,
  fontWeight: 600,
  fontSize: '0.925rem',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 12px',
  backgroundColor: `${colors.primary}15`,
  borderRadius: '6px',
  marginTop: '4px',
  marginBottom: '8px',
  '&::before': {
    content: '"✓"',
    fontWeight: 700
  }
});

function DecisionNodeComponent({ node }: { node: DecisionNode }) {
  return (
    <div css={{ marginBottom: '8px' }}>
      {node.question && <div css={questionStyle}>{node.question}</div>}
      {node.answer && <div css={answerStyle}>{node.answer}</div>}
      {node.result && <div css={resultStyle}>{node.result}</div>}
      {node.children && node.children.length > 0 && (
        <div css={nodeStyle}>
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
    <div
      css={{
        margin: '24px 0',
        padding: '20px',
        backgroundColor: colors.elementBackground,
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      }}
    >
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

const fileIconStyle = css({
  width: '16px',
  height: '16px',
  marginRight: '8px',
  flexShrink: 0
});

const folderIcon = (
  <svg css={fileIconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const fileIcon = (
  <svg css={fileIconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

function FileNodeComponent({ node, isLast, depth }: { node: FileNode; isLast: boolean; depth: number }) {
  const isFolder = node.type === 'folder' || (node.children && node.children.length > 0);

  return (
    <div css={{ marginLeft: depth > 0 ? '20px' : 0 }}>
      <div
        css={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 0',
          color: isFolder ? colors.primary : colors.fontColorPrimary,
          fontSize: '0.875rem',
          fontFamily: "'Geist Mono', monospace",
          position: 'relative',
          '&::before':
            depth > 0
              ? {
                  content: isLast ? '"└─"' : '"├─"',
                  position: 'absolute',
                  left: '-20px',
                  color: colors.lightGray
                }
              : {}
        }}
      >
        {isFolder ? folderIcon : fileIcon}
        <span css={{ fontWeight: isFolder ? 600 : 400 }}>{node.name}</span>
        {node.description && (
          <span css={{ marginLeft: '12px', color: colors.lightGray, fontSize: '0.8rem', fontFamily: 'inherit' }}>
            {node.description}
          </span>
        )}
      </div>
      {node.children && node.children.length > 0 && (
        <div css={{ borderLeft: `1px solid ${colors.lightGray}33`, marginLeft: '8px' }}>
          {node.children.map((child, index) => (
            <FileNodeComponent
              key={index}
              node={child}
              isLast={index === node.children!.length - 1}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectStructure({ files }: { files: FileNode[] }) {
  return (
    <div
      css={{
        margin: '24px 0',
        padding: '16px 20px',
        backgroundColor: colors.elementBackground,
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      }}
    >
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
    <div
      css={{
        margin: '24px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0'
      }}
    >
      {steps.map((step, index) => (
        <div key={index} css={{ display: 'flex', alignItems: 'stretch' }}>
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginRight: '16px'
            }}
          >
            <div
              css={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: colors.primary,
                color: colors.darkerBackground,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px',
                flexShrink: 0
              }}
            >
              {step.icon || index + 1}
            </div>
            {index < steps.length - 1 && (
              <div
                css={{
                  width: '2px',
                  flex: 1,
                  minHeight: '20px',
                  backgroundColor: `${colors.primary}33`
                }}
              />
            )}
          </div>
          <div css={{ paddingBottom: index < steps.length - 1 ? '20px' : 0 }}>
            <div css={{ fontWeight: 600, color: colors.fontColorPrimary, marginBottom: '4px' }}>{step.title}</div>
            {step.description && <div css={{ color: colors.lightGray, fontSize: '0.875rem' }}>{step.description}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
