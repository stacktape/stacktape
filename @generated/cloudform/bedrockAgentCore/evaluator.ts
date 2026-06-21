import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BedrockEvaluatorModelConfig {
  InferenceConfig?: InferenceConfiguration;
  AdditionalModelRequestFields?: { [key: string]: any };
  ModelId!: Value<string>;
  constructor(properties: BedrockEvaluatorModelConfig) {
    Object.assign(this, properties);
  }
}

export class CategoricalScaleDefinition {
  Label!: Value<string>;
  Definition!: Value<string>;
  constructor(properties: CategoricalScaleDefinition) {
    Object.assign(this, properties);
  }
}

export class CodeBasedEvaluatorConfig {
  LambdaConfig!: LambdaEvaluatorConfig;
  constructor(properties: CodeBasedEvaluatorConfig) {
    Object.assign(this, properties);
  }
}

export class EvaluatorConfig {
  CodeBased?: CodeBasedEvaluatorConfig;
  LlmAsAJudge?: LlmAsAJudgeEvaluatorConfig;
  constructor(properties: EvaluatorConfig) {
    Object.assign(this, properties);
  }
}

export class EvaluatorModelConfig {
  BedrockEvaluatorModelConfig!: BedrockEvaluatorModelConfig;
  constructor(properties: EvaluatorModelConfig) {
    Object.assign(this, properties);
  }
}

export class InferenceConfiguration {
  Temperature?: Value<number>;
  MaxTokens?: Value<number>;
  TopP?: Value<number>;
  constructor(properties: InferenceConfiguration) {
    Object.assign(this, properties);
  }
}

export class LambdaEvaluatorConfig {
  LambdaArn!: Value<string>;
  LambdaTimeoutInSeconds?: Value<number>;
  constructor(properties: LambdaEvaluatorConfig) {
    Object.assign(this, properties);
  }
}

export class LlmAsAJudgeEvaluatorConfig {
  ModelConfig!: EvaluatorModelConfig;
  Instructions!: Value<string>;
  RatingScale!: RatingScale;
  constructor(properties: LlmAsAJudgeEvaluatorConfig) {
    Object.assign(this, properties);
  }
}

export class NumericalScaleDefinition {
  Value!: Value<number>;
  Label!: Value<string>;
  Definition!: Value<string>;
  constructor(properties: NumericalScaleDefinition) {
    Object.assign(this, properties);
  }
}

export class RatingScale {
  Numerical?: List<NumericalScaleDefinition>;
  Categorical?: List<CategoricalScaleDefinition>;
  constructor(properties: RatingScale) {
    Object.assign(this, properties);
  }
}
export interface EvaluatorProperties {
  Description?: Value<string>;
  KmsKeyArn?: Value<string>;
  Level: Value<string>;
  EvaluatorName: Value<string>;
  Tags?: List<ResourceTag>;
  EvaluatorConfig: EvaluatorConfig;
}
export default class Evaluator extends ResourceBase<EvaluatorProperties> {
  static BedrockEvaluatorModelConfig = BedrockEvaluatorModelConfig;
  static CategoricalScaleDefinition = CategoricalScaleDefinition;
  static CodeBasedEvaluatorConfig = CodeBasedEvaluatorConfig;
  static EvaluatorConfig = EvaluatorConfig;
  static EvaluatorModelConfig = EvaluatorModelConfig;
  static InferenceConfiguration = InferenceConfiguration;
  static LambdaEvaluatorConfig = LambdaEvaluatorConfig;
  static LlmAsAJudgeEvaluatorConfig = LlmAsAJudgeEvaluatorConfig;
  static NumericalScaleDefinition = NumericalScaleDefinition;
  static RatingScale = RatingScale;
  constructor(properties: EvaluatorProperties) {
    super('AWS::BedrockAgentCore::Evaluator', properties);
  }
}
