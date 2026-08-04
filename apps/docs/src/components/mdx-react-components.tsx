import { CliCommandsApiReference } from '@/components/Mdx/CliCommandsApiReference';
import { ConsoleScreenshot } from '@/components/Mdx/ConsoleScreenshot';
import { FlowDiagram, ProjectStructure } from '@/components/Mdx/DecisionTree';
import { FeatureComparisonTable } from '@/components/Mdx/FeatureComparisonTable';
import { ErrorCallout, Info, Tip, Warning } from '@/components/Mdx/Highlighter';
import { MdxImage } from '@/components/Mdx/Image';
import {
  ButtonRow,
  CTAButton,
  CTASection,
  FeatureGrid,
  LandingCover,
  LandingHero,
  OpenSourceBanner,
  PricingColumns,
  Step,
  Steps,
  Testimonials
} from '@/components/Mdx/Landing';
import { PreviousNext } from '@/components/Mdx/PreviousNext';
import { ReferenceableParams } from '@/components/Mdx/ReferenceableParams';
import { Table } from '@/components/Mdx/Table';
import { Tab } from '@/components/Mdx/Tabs';

/**
 * MDX components rendered as static, server-only React (zero client JS).
 *
 * Prose/structural elements (p, headings, lists, links, inline code, blockquote) are intentionally
 * NOT here — they render as native HTML styled by `.mdx-content` global CSS. Interactive components
 * (CodeBlock, Tabs, ApiReference, StarterProjectGallery) are wired as `.astro` island wrappers in
 * the page so they hydrate.
 *
 * Every entry is referenced by `content/**`, and every component the corpus references is here.
 * `pnpm --filter @stacktape/docs run test` asserts both directions, so an unresolved component
 * cannot ship as a silently dropped block and an unused one cannot linger.
 */
export const reactMdxComponents = {
  table: Table,
  img: MdxImage,
  PreviousNext,
  ReferenceableParams,
  CliCommandsApiReference,
  ConsoleScreenshot,
  Warning,
  Info,
  Error: ErrorCallout,
  Tip,
  ProjectStructure,
  FlowDiagram,
  FeatureComparisonTable,
  Tab,
  LandingHero,
  LandingCover,
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
