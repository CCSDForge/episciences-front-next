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

function renderNestedItalic(text: string, prefix: string): React.ReactNode {
  const italicRegex = /(\*|_)(?!\s)(.+?)(?<!\s)\1/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = italicRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(React.createElement('em', { key: `${prefix}-i-${key++}` }, match[2]));
    lastIndex = italicRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length === 1 ? nodes[0] : nodes;
}

function renderNestedBold(text: string, prefix: string): React.ReactNode {
  const boldRegex = /(\*{2}|_{2})(?!\s)(.+?)(?<!\s)\1/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(React.createElement('strong', { key: `${prefix}-b-${key++}` }, match[2]));
    lastIndex = boldRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length === 1 ? nodes[0] : nodes;
}

/**
 * Renders inline markdown text supporting only bold and italic formatting:
 * - ***text*** or ___text___ -> <strong><em>text</em></strong>
 * - **text** or __text__     -> <strong>text</strong>
 * - *text* or _text_         -> <em>text</em>
 *
 * All other markdown or HTML syntax is rendered safely as plain text.
 */
export const renderInlineMarkdown = (text: string | null | undefined): React.ReactNode => {
  if (!text) return null;

  const decoded = he.decode(text);

  // Match ***...*** / ___...___, **...** / __...__, or *...* / _..._
  const tokenRegex =
    /(\*{3}|_{3})(?!\s)(.+?)(?<!\s)\1|(\*{2}|_{2})(?!\s)(.+?)(?<!\s)\3|(\*|_)(?!\s)(.+?)(?<!\s)\5/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = tokenRegex.exec(decoded)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(decoded.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // ***bold italic*** or ___bold italic___
      nodes.push(
        React.createElement(
          'strong',
          { key: `bi-${key++}` },
          React.createElement('em', null, match[2])
        )
      );
    } else if (match[3]) {
      // **bold** or __bold__
      const inner = match[4];
      nodes.push(
        React.createElement(
          'strong',
          { key: `b-${key++}` },
          renderNestedItalic(inner, `b-${key}`)
        )
      );
    } else if (match[5]) {
      // *italic* or _italic_
      const inner = match[6];
      nodes.push(
        React.createElement(
          'em',
          { key: `i-${key++}` },
          renderNestedBold(inner, `i-${key}`)
        )
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < decoded.length) {
    nodes.push(decoded.slice(lastIndex));
  }

  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];
  return nodes;
};
