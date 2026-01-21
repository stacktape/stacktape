import { css } from '@emotion/react';
import { kebabCase } from 'change-case';
import { AlertCircle, AlertOctagon, AlertTriangle, Info } from 'react-feather';
import { onMaxW795 } from '../../styles/responsive';
import { colors } from '../../styles/variables';
import { Badge } from './Badge';
import { CliCommandsApiReference } from './CliCommandsApiReference';
import { CodeBlock, MdxCodeBlock } from './CodeBlock';
import { DeploymentOptions, GettingStartedOptions, NavBox, NavBoxGrid } from './DeploymentOptions';
import { Divider } from './Divider';
import { EngineVersionsList } from './EngineVersionList';
import { Highlighter } from './Highlighter';
import { MdxImage } from './Image';
import { Jargon } from './Jargon';
import { Link } from './Link';
import { PreviousNext } from './PreviousNext';
import PropDescription from './PropDescription';
import PropertiesTable from './PropertiesTable';
import { ReferenceableParams } from './ReferenceableParams';
import { ResourceList } from './ResourceList';
import { StarterProjectList, StarterProjectListShort } from './StarterProjectList';
import { Table } from './Table';

const getNameFromProps = (props) => {
  let name = props.children;
  if (Array.isArray(name)) {
    [name] = props.children;
  }
  return name;
};

function NegativeMargin({ amount }: { amount: number }) {
  return <div css={{ marginTop: `-${amount || 30}px` }} />;
}

const listStyle = css({
  li: {
    p: {
      margin: '8px 0'
    },
    'p:first-child': {
      marginTop: 0
    },
    'p:last-child': {
      marginBottom: 0
    },
    'p:nth-child(n + 2):last-child': {
      marginBottom: '10px'
    }
  }
});

function Section(props) {
  let header = null;
  if (Array.isArray(props.children)) {
    header = props.children[0].props;
  } else {
    header = props.children.props;
  }
  const name = kebabCase(getNameFromProps(header));
  return <section id={name} {...props} />;
}

function Description(props) {
  return (
    <div
      css={{
        p: { color: '#9b9999', textAlign: 'center', fontSize: '14px' },
        marginBottom: '35px',
        marginTop: '-24px'
      }}
    >
      {props.children}
    </div>
  );
}

function Heading1(props) {
  return (
    <h1
      css={{
        color: '#0ba29d',
        fontSize: '28px',
        fontWeight: 700,
        lineHeight: '1.4',
        marginBottom: '23px',
        textShadow: `2px 2px ${colors.darkerBackground}`,
        marginTop: '72px',
        [onMaxW795]: {
          fontSize: '25px',
          marginTop: '52px'
        }
      }}
    >
      <span {...props} />
    </h1>
  );
}

function Heading2(props) {
  return (
    <h2
      css={{
        // textDecoration: 'underline',
        fontSize: '24.5px',
        fontWeight: 700,
        lineHeight: '1.4',
        marginBottom: '20px',
        textShadow: `2px 2px ${colors.darkerBackground}`,
        marginTop: '60px',
        [onMaxW795]: {
          fontSize: '20px',
          marginTop: '42px'
        }
      }}
    >
      <span {...props} />
    </h2>
  );
}

function Heading3(props) {
  return (
    <h3
      css={{
        fontSize: '20px',
        fontWeight: 600,
        lineHeight: '1.4',
        marginBottom: '20px',
        marginTop: '40px'
      }}
      {...props}
    ></h3>
  );
}

function Heading4(props) {
  return (
    <h4
      css={{
        textDecoration: 'underline',
        fontSize: '16px',
        fontWeight: 500,
        lineHeight: '1.4',
        marginBottom: '10px',
        marginTop: '17px'
      }}
      {...props}
    ></h4>
  );
}

export const MdxComponents = {
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  h4: Heading4,
  // h5: Heading5,
  // h6: Heading6,
  section: (props) => Section(props),
  blockquote: Description,
  p: (props) => <p css={{ margin: '10px 0px', fontSize: '0.925rem' }} className="paragraph" {...props} />,
  table: Table,
  img: MdxImage,
  pre: (props) => {
    const codeChild = props.children;
    if (codeChild?.props?.className?.startsWith('language-')) {
      return <pre {...props} />;
    }
    const content = codeChild?.props?.children || props.children;
    return (
      <pre
        css={{
          margin: '25px 0 30px 0',
          padding: '16px 18px',
          background: colors.elementBackground,
          borderRadius: '8px',
          boxShadow:
            '0 2px 8px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          fontSize: '13.5px',
          lineHeight: '1.5',
          overflowX: 'auto',
          color: colors.fontColorPrimary
        }}
      >
        {content}
      </pre>
    );
  },
  code: (props) => {
    const isCodeBlock = props.className && props.className.startsWith('language-');
    if (isCodeBlock) {
      return <MdxCodeBlock {...props}></MdxCodeBlock>;
    } else {
      return <code {...props} />;
    }
  },
  ul: (props) => <ul css={listStyle} {...props} />,
  ol: (props) => <ol css={listStyle} {...props} />,
  a: Link,
  em: Jargon,
  Badge,
  NegativeMargin,
  CodeBlock,
  Link,
  CliCommandsApiReference,
  PropertiesTable,
  PropDescription,
  EngineVersionsList,
  ReferenceableParams,
  Warning: (props) => <Highlighter props={props} type="warning" icon={AlertTriangle} />,
  Info: (props) => <Highlighter props={props} type="info" icon={Info} />,
  Error: (props) => <Highlighter props={props} type="error" icon={AlertOctagon} />,
  Divider,
  WarnIcon: <AlertCircle size={22} />,
  PreviousNext,
  StarterProjectList,
  StarterProjectListShort,
  DeploymentOptions,
  GettingStartedOptions,
  ResourceList,
  NavBox,
  NavBoxGrid
};

// <hr
//   css={{
//     marginTop: '35px !important',
//     marginBottom: '35px !important',
//     borderColor: 'red',
//     backgroundColor: 'red',
//     height: '2px'
//   }}
// />
