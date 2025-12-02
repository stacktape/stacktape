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
  export default value;
}

declare module '*.html' {
  const value: string;
  export = value;
}

declare module '*.gif' {
  const value: string;
  export = value;
}

declare module '*.mp4' {
  const value: string;
  export = value;
}

declare module '*.webm' {
  const value: string;
  export = value;
}

declare module '*.yml' {
  const value: any;
  export = value;
}

interface ImportMeta {
  main: boolean;
}

type ReactNode = import('react').ReactNode;
type Css = import('@emotion/serialize').CSSObject;
type AnyFunction = (...args: any[]) => any;

type FrontmatterMetadata = { title: string; order?: number };
type MdxPageDataForNavigation = { slug: string[]; title: string; order: number; category: string; url: string };
type TableOfContentsItem = { level: number; text: string; href: string };

type AllowedType = {
  typeName: string;
  jsonSchemaDefinitionRef?: string;
  enumeratedValues?: string[] | number[];
};

type SchemaNode = {
  type?: 'object' | 'array' | 'boolean' | 'number';
  properties?: {
    [propertyName: string]: SchemaNode;
  };
  items?: SchemaNode;
  required?: string[];
  description?: string;
  additionalProperties?: SchemaNode;
  anyOf?: SchemaNode[];
  $ref?: string;
  definitions?: { [definitionName: string]: SchemaNode };
  enum?: string[] | number[];
  patternProperties?: any;
  const?: any;
};

type ObjectSchemaNode = {
  type: 'object';
  properties?: {
    [propertyName: string]: SchemaNode;
  };
  required?: string[];
};

type ParsedNodeDetails = {
  property: string;
  required: boolean;
  description: string;
  allowedTypes: string[];
  allowedValues?: (string | number)[];
  leafParentNodes?: LeafParentNodeDetails[];
};

type LeafParentNodeDetails = {
  type: string;
  description: string;
  leafNodes: ParsedNodeDetails[];
};
