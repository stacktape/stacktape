export {
  analyzeDependencies,
  analyzeDependenciesFromPackageJson,
  analyzeOptimalLayers,
  shouldIncludeInLayer,
  selectDependenciesForLayer,
  isProvidedByRuntime,
  isAwsSdkV3,
  MINIMUM_TOTAL_SAVINGS_BYTES,
  MINIMUM_LAYER_SIZE_BYTES,
  MINIMUM_FUNCTIONS_FOR_LAYER,
  type DependencyInfo,
  type DependencyAnalysisResult,
  type FunctionLayerContext,
  type LayerAssignment,
  type MultiLayerAnalysisResult
} from './dependency-analyzer';

export {
  buildSharedLayer,
  buildSharedLayerSimple,
  buildMultipleLayers,
  generateLayerHash,
  getLayerName,
  type LayerBuildResult,
  type MultiLayerBuildResult
} from './layer-builder';

export {
  SharedLayerManager,
  type SharedLayerConfig,
  type LayerInfo,
  type MultiLayerInfo
} from './layer-manager';
