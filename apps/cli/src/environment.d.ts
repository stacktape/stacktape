declare module '*.png' {
  const value: string;
  export = value;
}

declare module '*.jpg' {
  const value: string;
  export = value;
}

declare module '*.svg' {
  const value: string;
  export = value;
}

declare module '*.html' {
  const value: string;
  export = value;
}

declare module '*.proto' {
  const content: unknown;
  export default content;
}

// bun-types 1.4.0 narrows these inherited EventEmitter methods to only the new `memoryPressure` event. Restore the
// generic overloads until https://github.com/oven-sh/bun/issues/40003 is fixed in a published Bun 1.4 type package.
declare namespace NodeJS {
  interface Process {
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    off(event: string | symbol, listener: (...args: any[]) => void): this;
    addListener(event: string | symbol, listener: (...args: any[]) => void): this;
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
    emit(event: string | symbol, ...args: any[]): boolean;
  }
}
