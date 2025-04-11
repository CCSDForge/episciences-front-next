import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { Node, Root } from 'mdast'
import he from 'he'

export const generateIdFromText = (text: string): string => {

  if (!text) {
    return "";
  }

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-');
};

export const unifiedProcessor = unified()
  .use(remarkParse)
  .use(remarkStringify);

export const serializeMarkdown = (node: Node) => unifiedProcessor.stringify(node as Root);

export const getMarkdownImageURL = (path: string, rvcode: string) => `https://${rvcode}.episciences.org${path}`

export const decodeText = (text: string): string => {
  return he.decode(text)
      .replace(/\\_/g, '_')
      .replace(/\\\*/g, '*')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\[/g, '[')
      .replace(/\\\]/g, ']')  
      .replace(/\\\\/g, '\\')
      .trim()
  ;
}

export const adjustNestedListsInMarkdownContent = (content?: string): string | undefined => {
  return content?.replace(/(- [^\n]+:\n)((- .+\n)+)/g, (_: string, parent: string, children: string) => {
    const indentedChildren = children.replace(/(- )/g, '  $1')

    return parent + indentedChildren
  })
} 