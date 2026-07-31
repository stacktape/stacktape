import type { StacktapeArgs } from 'src/config/cli/types';
import { pascalCase } from 'change-case';
import type { DirectoryUpload, DirectoryUploadFilter } from '@stacktape/config/buckets';

export const isBucketNativelySupportedHeader = (headerName: string) =>
  ['CacheControl', 'ContentDisposition', 'ContentEncoding', 'ContentLanguage', 'Expires'].includes(
    pascalCase(headerName)
  );

export const automaticUploadFilterPresets: {
  [_presetName in DirectoryUpload['headersPreset']]: DirectoryUploadFilter[];
} = {
  'gatsby-static-website': [
    {
      includePattern: '**/*.html',
      headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
    },
    {
      includePattern: 'page-data/**/*',
      headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
    },
    {
      includePattern: 'app-data.json',
      headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
    },
    {
      includePattern: 'static/**/*',
      headers: [{ key: 'cache-control', value: 'public, max-age=31536000, immutable' }]
    },
    { includePattern: '**/*.js', headers: [{ key: 'cache-control', value: 'public, max-age=31536000, immutable' }] },
    { includePattern: '**/*.css', headers: [{ key: 'cache-control', value: 'public, max-age=31536000, immutable' }] },
    {
      includePattern: 'sw.js',
      headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
    }
  ],
  'static-website': [
    {
      includePattern: '**/*',
      headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
    }
  ],
  'single-page-app': [
    {
      includePattern: '**/*.html',
      headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
    },
    {
      includePattern: 'static/**/*',
      headers: [{ key: 'cache-control', value: 'public, max-age=31536000, immutable' }]
    }
  ],
  'astro-static-website': [
    {
      includePattern: '**/*.html',
      headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
    },
    {
      includePattern: '_astro/**/*',
      headers: [{ key: 'cache-control', value: 'public, max-age=31536000, immutable' }]
    }
  ],
  'sveltekit-static-website': [
    {
      includePattern: '**/*.html',
      headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
    },
    {
      includePattern: '_app/**/*',
      headers: [{ key: 'cache-control', value: 'public, max-age=31536000, immutable' }]
    }
  ],
  'nuxt-static-website': [
    {
      includePattern: '**/*.html',
      headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
    },
    {
      includePattern: '_nuxt/**/*',
      headers: [{ key: 'cache-control', value: 'public, max-age=31536000, immutable' }]
    }
  ]
};

export const defaultGetErrorFunction = (_message: string) => (err: Error) => {
  throw err;
};

export const transformToCliArgs = (args: StacktapeArgs) => {
  const res = [];
  for (const argName in args) {
    if (typeof args[argName] === 'boolean') {
      if (args[argName] === true) {
        res.push(`--${argName}`);
      }
    } else {
      res.push(`--${argName}`);
      res.push(args[argName]);
    }
  }
  return res;
};
