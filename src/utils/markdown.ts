import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { Node, Root } from 'mdast';
import he from 'he';

interface AstNode {
  type: string;
  value?: unknown;
  children?: AstNode[];
}

// Works for both mdast (parse phase) and hast Element (react-markdown render phase).
// mdast inlineCode has `value` but no children; hast code is an element with a text child.
export const getNodeText = (node: AstNode): string => {
  if ((node.type === 'text' || node.type === 'inlineCode') && typeof node.value === 'string') {
    return node.value;
  }
  if (Array.isArray(node.children)) {
    return node.children.map(getNodeText).join('');
  }
  return '';
};

export const generateIdFromText = (text: string): string => {
  if (!text) {
    return '';
  }

  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-');
};

export const unifiedProcessor = unified().use(remarkParse).use(remarkStringify);

export const serializeMarkdown = (node: Node) => unifiedProcessor.stringify(node as Root);

export const getMarkdownImageURL = (path: string, rvcode: string) =>
  `https://${rvcode}.episciences.org${path}`;

export const decodeText = (text: string): string => {
  return he
    .decode(text)
    .replace(/\\_/g, '_')
    .replace(/\\\*/g, '*')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']')
    .replace(/\\\\/g, '\\')
    .trim();
};

export const adjustNestedListsInMarkdownContent = (content?: string): string | undefined => {
  return content?.replace(
    /(- [^\n]+:\n)((- .+\n)+)/g,
    (_: string, parent: string, children: string) => {
      const indentedChildren = children.replace(/(- )/g, '  $1');

      return parent + indentedChildren;
    }
  );
};
