import React from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { Node, Root } from 'mdast';
import he from 'he';

export interface AstNode {
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
    .replaceAll('\\_', '_')
    .replaceAll('\\*', '*')
    .replaceAll('\\(', '(')
    .replaceAll('\\)', ')')
    .replaceAll('\\[', '[')
    .replaceAll('\\]', ']')
    .replaceAll('\\\\', '\\')
    .trim();
};

function convertMdastToReact(nodes: Node[], keyPrefix = 'md'): React.ReactNode[] {
  const result: React.ReactNode[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const key = `${keyPrefix}-${i}`;

    switch (node.type) {
      case 'root':
      case 'paragraph': {
        const children = (node as { children?: Node[] }).children;
        if (children && children.length > 0) {
          result.push(...convertMdastToReact(children, key));
        }
        break;
      }
      case 'strong': {
        const children = (node as { children?: Node[] }).children;
        const renderedChildren = children ? convertMdastToReact(children, `${key}-s`) : null;
        result.push(
          React.createElement(
            'strong',
            { key },
            renderedChildren && renderedChildren.length === 1
              ? renderedChildren[0]
              : renderedChildren
          )
        );
        break;
      }
      case 'emphasis': {
        const children = (node as { children?: Node[] }).children;
        const renderedChildren = children ? convertMdastToReact(children, `${key}-e`) : null;
        result.push(
          React.createElement(
            'em',
            { key },
            renderedChildren && renderedChildren.length === 1
              ? renderedChildren[0]
              : renderedChildren
          )
        );
        break;
      }
      case 'text': {
        const textNode = node as { value?: string };
        if (typeof textNode.value === 'string') {
          result.push(textNode.value);
        }
        break;
      }
      default: {
        const textNode = node as { value?: unknown };
        if (typeof textNode.value === 'string') {
          result.push(textNode.value);
        } else {
          const text = getNodeText(node as AstNode);
          if (text) {
            result.push(text);
          }
        }
        break;
      }
    }
  }

  return result;
}

/**
 * Renders inline markdown text supporting only bold and italic formatting:
 * - ***text*** or ___text___ -> <strong><em>text</em></strong>
 * - **text** or __text__     -> <strong>text</strong>
 * - *text* or _text_         -> <em>text</em>
 *
 * Handles arbitrary nesting (e.g. *Italic **bold** text*) via AST parsing.
 * All other markdown or HTML syntax is rendered safely as plain text.
 */
export const renderInlineMarkdown = (text: string | null | undefined): React.ReactNode => {
  if (!text) return null;

  const decoded = he.decode(text);
  const root = unifiedProcessor.parse(decoded);
  const nodes = convertMdastToReact((root as { children?: Node[] }).children || []);

  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];
  return nodes;
};
