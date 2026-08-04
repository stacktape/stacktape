export type SupportedFileExt = keyof (typeof import('src/config/random'))['lambdaRuntimesForFileExtension'];

export type LoadableFileExtensions = SupportedFileExt | 'ini' | 'json' | 'yml' | 'yaml';
