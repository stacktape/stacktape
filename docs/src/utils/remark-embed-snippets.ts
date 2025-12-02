import { visit } from 'unist-util-visit';
import { readFile } from 'fs-extra';
import { join, extname } from 'path';

// Type definitions for the AST nodes
interface CodeNode {
  type: 'code';
  lang?: string;
  value: string;
  position?: any;
}

// Function to determine language from file extension
function getLanguageFromExtension(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const langMap: Record<string, string> = {
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.ts': 'typescript',
    '.js': 'javascript',
    '.tsx': 'tsx',
    '.jsx': 'jsx',
    '.json': 'json',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.sh': 'bash',
    '.bash': 'bash',
    '.sql': 'sql',
    '.dockerfile': 'dockerfile',
    '.md': 'markdown',
    '.mdx': 'markdown'
  };

  return langMap[ext] || 'text';
}

// Main plugin function
export default function remarkEmbedSnippets() {
  return async (tree: any) => {
    const paragraphsToReplace: Array<{
      paragraph: any;
      snippetPath: string;
      parent: any;
      index: number;
    }> = [];

    // First pass: find paragraphs that contain only embed references
    visit(tree, (node: any, index: number | undefined, parent: any) => {
      if (node.type === 'paragraph' && typeof index === 'number') {
        // Check if this paragraph contains only an embed reference (and maybe whitespace)
        const embedChild = node.children.find(
          (child: any) => child.type === 'inlineCode' && child.value.startsWith('embed:')
        );

        if (embedChild) {
          const hasOnlyEmbed = node.children.every(
            (child: any) => child === embedChild || (child.type === 'text' && /^\s*$/.test(child.value))
          );

          if (hasOnlyEmbed) {
            const snippetPath = embedChild.value.replace('embed:', '');
            paragraphsToReplace.push({
              paragraph: node,
              snippetPath,
              parent,
              index
            });
          }
        }
      }
    });

    // Second pass: replace paragraphs with code blocks
    for (const { paragraph, snippetPath, parent, index } of paragraphsToReplace) {
      try {
        // Construct the full path to the snippet file
        const fullPath = join(process.cwd(), 'code-snippets', snippetPath);

        // Read the snippet file
        const content = await readFile(fullPath, 'utf-8');

        // Determine the language from file extension
        const language = getLanguageFromExtension(snippetPath);

        // Create a new code block node
        const codeNode: CodeNode = {
          type: 'code',
          lang: language,
          value: content.trim(),
          position: paragraph.position
        };

        // Replace the paragraph with the code block
        if (parent && typeof index === 'number') {
          parent.children[index] = codeNode;
        }
      } catch (error) {
        console.warn(`Failed to load snippet: ${snippetPath}`, error);
        // Keep the original paragraph if loading fails
      }
    }
  };
}
