import type { DirectoryUpload, DirectoryUploadFilter } from '@stacktape/config/buckets';
import { pascalCase } from 'change-case';

export const isS3NativeUploadHeader = (headerName: string) =>
  ['CacheControl', 'ContentDisposition', 'ContentEncoding', 'ContentLanguage', 'Expires'].includes(
    pascalCase(headerName)
  );

export const automaticUploadFilterPresets: {
  [presetName in DirectoryUpload['headersPreset']]: DirectoryUploadFilter[];
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
