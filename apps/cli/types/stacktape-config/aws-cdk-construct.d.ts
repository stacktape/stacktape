/**
 * #### Embed an AWS CDK construct directly in your Stacktape stack.
 *
 * ---
 *
 * Escape hatch for resources not natively supported by Stacktape. Write a CDK construct class
 * in TypeScript/JavaScript and Stacktape will synthesize and deploy it as part of your stack.
 */
interface AwsCdkConstruct {
  type: 'aws-cdk-construct';
  properties?: AwsCdkConstructProps;
  //   overrides?: ResourceOverrides;
}

type StpAwsCdkConstruct = AwsCdkConstruct['properties'] & {
  name: string;
  type: AwsCdkConstruct['type'];
  configParentResourceType: AwsCdkConstruct['type'];
  nameChain: string[];
};

interface AwsCdkConstructProps {
  /**
   * #### Path to the file containing your CDK construct class.
   *
   * ---
   *
   * Supports `.js` and `.ts` files. The file must export a class that extends `Construct` from `aws-cdk-lib`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   notifications:
   *     type: aws-cdk-construct
   *     properties:
   *       # stp-focus
   *       entryfilePath: cdk/notification-topic.ts
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AwsCdkConstruct, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const notifications = new AwsCdkConstruct({
   *     // stp-focus
   *     entryfilePath: 'cdk/notification-topic.ts'
   *     // stp-end-focus
   *   });
   *   return { resources: { notifications } };
   * });
   * ```
   */
  entryfilePath: string;
  /**
   * #### Name of the exported construct class from the entry file.
   *
   * ---
   *
   * Must match the exact export name. Use this when the file has multiple exports or uses named exports.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   notifications:
   *     type: aws-cdk-construct
   *     properties:
   *       entryfilePath: cdk/constructs.ts
   *       # stp-focus
   *       exportName: NotificationTopic
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AwsCdkConstruct, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const notifications = new AwsCdkConstruct({
   *     entryfilePath: 'cdk/constructs.ts',
   *     // stp-focus
   *     exportName: 'NotificationTopic'
   *     // stp-end-focus
   *   });
   *   return { resources: { notifications } };
   * });
   * ```
   *
   * @default "default"
   */
  exportName?: string;
  /**
   * #### Custom props passed to the construct's constructor.
   *
   * ---
   *
   * This object is forwarded as the third argument (`props`) to your construct class. Use `$ResourceParam()` and `$Secret()`
   * directives here to pass dynamic values from other resources in your stack.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   notifications:
   *     type: aws-cdk-construct
   *     properties:
   *       entryfilePath: cdk/notification-topic.ts
   *       # stp-focus
   *       constructProperties:
   *         displayName: Production Alerts
   *         emailSubscription: $Secret('alerts-email')
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AwsCdkConstruct, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const notifications = new AwsCdkConstruct({
   *     entryfilePath: 'cdk/notification-topic.ts',
   *     // stp-focus
   *     constructProperties: {
   *       displayName: 'Production Alerts',
   *       emailSubscription: $Secret('alerts-email')
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { notifications } };
   * });
   * ```
   */
  constructProperties?: any;
}
