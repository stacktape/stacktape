import { GetStaticPaths, GetStaticProps } from 'next';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import { join, relative, sep } from 'path';
import matter from 'gray-matter';
import { readdir, readFile, stat } from 'fs-extra';
import { statSync } from 'fs';
import remarkGfm from 'remark-gfm';
import remarkEmbedSnippets from '@/utils/remark-embed-snippets';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import { MdxComponents } from '@/components/Mdx';
import DocsPageLayout from '@/layout/DocsPageLayout';
import { capitalizeFirstLetter } from '@/utils/helpers';
import GithubSlugger from 'github-slugger';
import { useHotReload } from '@/utils/hooks';

// Allow overriding the docs content directory via environment variable
const DOCS_CONTENT_DIR = process.env.DOCS_CONTENT_DIR || 'docs';

export default function DocsPage({
  compiledSource,
  allDocPages,
  tableOfContents,
  title,
  lastModified
}: {
  compiledSource: MDXRemoteSerializeResult<string, string>;
  allDocPages: MdxPageDataForNavigation[];
  tableOfContents: TableOfContentsItem[];
  title: string;
  lastModified?: number;
}) {
  // Enable hot reload in development - watches docs/ and code-snippets/ directories
  useHotReload();

  return (
    <DocsPageLayout allDocPages={allDocPages} tableOfContents={tableOfContents} title={title}>
      <MDXRemote
        components={MdxComponents as any}
        {...compiledSource}
        key={lastModified} // Force re-render when file changes in development
      />
    </DocsPageLayout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const contentDir = join(process.cwd(), DOCS_CONTENT_DIR);
  const paths = await getAllMDXFiles(contentDir);

  const slugPaths = paths.map((filePath) => {
    const relativePath = relative(contentDir, filePath);
    let slug = relativePath
      .replace(/\.mdx?$/, '')
      .split(sep)
      .filter(Boolean);

    // Normalize index files: compute/index.mdx -> ['compute'] not ['compute', 'index']
    if (slug.length > 0 && slug[slug.length - 1] === 'index') {
      slug = slug.slice(0, -1);
    }

    return { params: { slug } };
  });

  // Root index.mdx is already handled by the normalization above (becomes [])
  // But we need to ensure empty slug is included
  if (!slugPaths.some((p) => p.params.slug.length === 0)) {
    slugPaths.push({ params: { slug: [] } });
  }

  return {
    paths: slugPaths,
    fallback: false
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug = [] } = params as { slug: string[] };

  // Try to find the file - could be slug.mdx or slug/index.mdx
  const contentDir = join(process.cwd(), DOCS_CONTENT_DIR);
  let filePath: string;

  if (slug.length === 0) {
    filePath = join(contentDir, 'index.mdx');
  } else {
    // Try direct file first (e.g., compute/lambda-functions.mdx)
    const directPath = join(contentDir, `${slug.join('/')}.mdx`);
    // Then try index file (e.g., compute/index.mdx for /compute)
    const indexPath = join(contentDir, slug.join('/'), 'index.mdx');

    try {
      await stat(directPath);
      filePath = directPath;
    } catch {
      filePath = indexPath;
    }
  }

  try {
    const [mdxPageData, allDocPages, tableOfContents] = await Promise.all([
      getMdxPageData(filePath),
      getAllDocsData(),
      getTableOfContents(slug)
    ]);
    const { frontmatter, ...compiledSource } = mdxPageData;

    return {
      props: {
        compiledSource: compiledSource,
        frontmatterMetadata: frontmatter,
        title: frontmatter.title || getTitleFromSlug(slug),
        allDocPages,
        tableOfContents,
        // Add file modification time in development for hot reload
        ...(process.env.NODE_ENV === 'development' && {
          lastModified: statSync(filePath).mtime.getTime()
        })
      }
    };
  } catch (error) {
    console.error(error);
    return {
      notFound: true
    };
  }
};

async function getAllMDXFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const items = await readdir(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const fileStat = await stat(fullPath);

    if (fileStat.isDirectory()) {
      files.push(...(await getAllMDXFiles(fullPath)));
    } else if (item.endsWith('.mdx') || item.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

const getMdxPageData = async (filePath: string) => {
  const fileContent = await readFile(filePath, 'utf8');
  return serialize(fileContent, {
    parseFrontmatter: true,
    mdxOptions: {
      remarkPlugins: [remarkGfm, remarkEmbedSnippets],
      rehypePlugins: [rehypeAutolinkHeadings, rehypeSlug]
    }
  });
};

const getAllDocsData = async (): Promise<MdxPageDataForNavigation[]> => {
  const contentDir = join(process.cwd(), DOCS_CONTENT_DIR);
  const files = await getAllMDXFiles(contentDir);

  const pages: MdxPageDataForNavigation[] = await Promise.all(
    files.map(async (filePath) => {
      const fileContent = await readFile(filePath, 'utf8');
      const { data: frontmatter } = matter(fileContent);

      const relativePath = relative(contentDir, filePath);
      let slug = relativePath
        .replace(/\.mdx?$/, '')
        .split(sep)
        .filter(Boolean);

      // Normalize index files: compute/index -> ['compute'] not ['compute', 'index']
      if (slug.length > 0 && slug[slug.length - 1] === 'index') {
        slug = slug.slice(0, -1);
      }

      const url = slug.length === 0 ? '/' : `/${slug.join('/')}`;

      return {
        url,
        slug,
        title: frontmatter.title || getTitleFromSlug(slug),
        order: frontmatter.order ?? 999, // Default to 999 for pages without explicit order
        category: frontmatter.category || (slug.length === 0 ? 'introduction' : slug[0])
      };
    })
  );

  // Sort pages by order, then by title
  return pages.sort((a, b) => {
    if (a.order !== b.order) {
      return (a.order ?? 999) - (b.order ?? 999);
    }
    return a.title.localeCompare(b.title);
  });
};

const getTitleFromSlug = (slug: string[]) => {
  if (slug.length === 0) return 'Introduction';
  return slug[slug.length - 1].split('-').map(capitalizeFirstLetter).join(' ');
};

const githubSlugger = new GithubSlugger();

const getTableOfContents = async (slug: string[]): Promise<TableOfContentsItem[]> => {
  const contentDir = join(process.cwd(), DOCS_CONTENT_DIR);
  let contentPath: string;

  if (slug.length === 0) {
    contentPath = join(contentDir, 'index.mdx');
  } else {
    // Try direct file first, then index file
    const directPath = join(contentDir, `${slug.join('/')}.mdx`);
    const indexPath = join(contentDir, slug.join('/'), 'index.mdx');

    try {
      await stat(directPath);
      contentPath = directPath;
    } catch {
      contentPath = indexPath;
    }
  }

  const rawMdx = await readFile(contentPath, 'utf-8');

  // Remove frontmatter
  const { content } = matter(rawMdx);

  // Remove code blocks (both ``` and ~~~ fenced blocks) and inline code
  const cleanContent = content
    .replace(/^```[\s\S]*?^```$/gm, '')
    .replace(/^~~~[\s\S]*?^~~~$/gm, '')
    .replace(/`[^`\n]+`/g, '')
    .replace(/^    .+$/gm, '');

  const headingsRegex = /^(#{1,4})\s(.+)$/gm;
  let match;
  const extractedHeadings: TableOfContentsItem[] = [];

  // Reset the slugger for this document
  githubSlugger.reset();

  while ((match = headingsRegex.exec(cleanContent)) !== null) {
    const headingLevel = match[1].length;
    const headingText = match[2].trim();
    if (headingText.includes('{start-highlight}') || headingText.includes('{stop-highlight}')) {
      continue;
    }
    const slug = githubSlugger.slug(headingText);
    extractedHeadings.push({
      level: headingLevel,
      text: headingText,
      href: `#${slug}`
    });
  }
  return extractedHeadings;
};
