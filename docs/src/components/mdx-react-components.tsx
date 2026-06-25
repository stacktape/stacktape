import { AlertCircle, AlertOctagon, AlertTriangle, Info as InfoIcon, Zap } from 'react-feather';

import { Badge } from '@/components/Mdx/Badge';
import { CliCommandsApiReference } from '@/components/Mdx/CliCommandsApiReference';
import { DecisionTree, ProjectStructure, FlowDiagram } from '@/components/Mdx/DecisionTree';
import { DeploymentOptions, GettingStartedOptions, NavBox, NavBoxGrid } from '@/components/Mdx/DeploymentOptions';
import { Divider } from '@/components/Mdx/Divider';
import { EngineVersionsList } from '@/components/Mdx/EngineVersionList';
import { Highlighter } from '@/components/Mdx/Highlighter';
import { MdxImage } from '@/components/Mdx/Image';
import { Jargon } from '@/components/Mdx/Jargon';
import { Link } from '@/components/Mdx/Link';
import { PreviousNext } from '@/components/Mdx/PreviousNext';
import PropDescription from '@/components/Mdx/PropDescription';
import { ReferenceableParams } from '@/components/Mdx/ReferenceableParams';
import { ResourceList } from '@/components/Mdx/ResourceList';
import { StarterProjectList, StarterProjectListShort } from '@/components/Mdx/StarterProjectList';
import { Table } from '@/components/Mdx/Table';
import { Tab } from '@/components/Mdx/Tabs';
import { FeatureComparisonTable } from '@/components/Mdx/FeatureComparisonTable';
import {
  ButtonRow,
  CTAButton,
  CTASection,
  FeatureGrid,
  LandingHero,
  OpenSourceBanner,
  PricingColumns,
  Step,
  Steps,
  Testimonials
} from '@/components/Mdx/Landing';

function NegativeMargin({ amount }: { amount: number }) {
  return <div style={{ marginTop: `-${amount || 30}px` }} />;
}

/**
 * MDX components rendered as static, server-only React (emotion css → static HTML, zero client JS).
 * Prose/structural elements (p, headings, lists, links, inline code, blockquote) are intentionally
 * NOT here — they render as native HTML styled by `.mdx-content` global CSS. Interactive components
 * (CodeBlock, Tabs, ApiReference, ConsoleScreenshot) are wired as `.astro` island wrappers in the
 * page so they hydrate.
 */
export const reactMdxComponents = {
  table: Table,
  img: MdxImage,
  em: Jargon,
  Jargon,
  Link,
  Badge,
  NegativeMargin,
  Divider,
  WarnIcon: <AlertCircle size={22} />,
  PreviousNext,
  PropDescription,
  EngineVersionsList,
  ReferenceableParams,
  CliCommandsApiReference,
  Warning: (props: any) => <Highlighter props={props} type="warning" icon={AlertTriangle} />,
  Info: (props: any) => <Highlighter props={props} type="info" icon={InfoIcon} />,
  Error: (props: any) => <Highlighter props={props} type="error" icon={AlertOctagon} />,
  Tip: (props: any) => <Highlighter props={props} type="tip" icon={Zap} />,
  StarterProjectList,
  StarterProjectListShort,
  DeploymentOptions,
  GettingStartedOptions,
  ResourceList,
  NavBox,
  NavBoxGrid,
  DecisionTree,
  ProjectStructure,
  FlowDiagram,
  FeatureComparisonTable,
  Tab,
  LandingHero,
  CTAButton,
  ButtonRow,
  FeatureGrid,
  Steps,
  Step,
  CTASection,
  OpenSourceBanner,
  Testimonials,
  PricingColumns
};

export default reactMdxComponents;
