export {
  analyzeDependencies,
  analyzeDependenciesFromPackageJson,
  shouldIncludeInLayer,
  selectDependenciesForLayer,
  isProvidedByRuntime,
  isAwsSdkV3,
  type DependencyInfo,
  type DependencyAnalysisResult
} from './dependency-analyzer';

export {
  buildSharedLayer,
  buildSharedLayerSimple,
  generateLayerHash,
  getLayerName,
  type LayerBuildResult
} from './layer-builder';

export { SharedLayerManager, type SharedLayerConfig } from './layer-manager';
