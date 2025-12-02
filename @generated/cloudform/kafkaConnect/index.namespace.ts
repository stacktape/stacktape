import Connector_ from './connector';
import CustomPlugin_ from './customPlugin';
import WorkerConfiguration_ from './workerConfiguration';
export namespace KafkaConnect {
  export const Connector = Connector_;
  export const CustomPlugin = CustomPlugin_;
  export const WorkerConfiguration = WorkerConfiguration_;
  export type Connector = Connector_;
  export type CustomPlugin = CustomPlugin_;
  export type WorkerConfiguration = WorkerConfiguration_;
}
