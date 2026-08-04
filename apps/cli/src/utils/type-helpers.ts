export type AnyFunction = (...args: any[]) => any | Promise<any>;
export type ArgsType<T> = T extends (...args: infer U) => any ? U : never;
export type ArgType<T> = T extends (arg: infer U) => any ? U : never;
export type Subtype<T, U extends T> = U;

export type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export type KebabToPascalCase<S extends string> = S extends `${infer First}-${infer Rest}`
  ? `${Capitalize<First>}${KebabToPascalCase<Rest>}`
  : Capitalize<S>;
