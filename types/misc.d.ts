type AnyFunction = (...args: any[]) => any | Promise<any>;
type AnyClass = { new (...args: any[]): any };
type ArgsType<T> = T extends (...args: infer U) => any ? U : never;
type ArgType<T> = T extends (arg: infer U) => any ? U : never;
type Subtype<T, U extends T> = U;
type EmailString = `${string}@${string}.${string}`;

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

type DeepNonNullable<T> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};

type TODO = any;

type MethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type Methods<T> = Pick<T, MethodNames<T>>;

type StacktapeJsonSchema = {
  definitions: Record<
    string,
    {
      type?: string;
      description?: string;
      properties?: Record<string, any>;
      required?: string[];
      anyOf?: { $ref?: any }[];
    }
  >;
};
interface ImportMeta {
  main: boolean;
}
