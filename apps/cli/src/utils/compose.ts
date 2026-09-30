type Decorator<T> = (target: T) => T;

/** Apply service decorators from right to left. */
export default function compose<T>(...decorators: Array<Decorator<T>>) {
  return (target: T): T => decorators.reduceRight((instance, decorate) => decorate(instance), target);
}
