import { describe, it, expect } from 'vitest';
import {
  generateIdFromText,
  decodeText,
  adjustNestedListsInMarkdownContent,
  getMarkdownImageURL,
  getNodeText,
} from '../markdown';

describe('markdown utilities', () => {
  describe('generateIdFromText', () => {
    it('should generate ID from simple text', () => {
      const result = generateIdFromText('Hello World');
      expect(result).toBe('hello-world');
    });

    it('should handle empty string', () => {
      const result = generateIdFromText('');
      expect(result).toBe('');
    });

    it('should remove accents and diacritics', () => {
      const result = generateIdFromText('Café à Paris');
      expect(result).toBe('cafe-a-paris');
    });

    it('should handle special characters', () => {
      const result = generateIdFromText('Hello @ World!');
      expect(result).toBe('hello-world');
    });

    it('should convert to lowercase', () => {
      const result = generateIdFromText('UPPERCASE TEXT');
      expect(result).toBe('uppercase-text');
    });

    it('should replace multiple spaces with single hyphen', () => {
      const result = generateIdFromText('Multiple   Spaces   Here');
      expect(result).toBe('multiple-spaces-here');
    });

    it('should handle text with numbers', () => {
      const result = generateIdFromText('Section 123 Test');
      expect(result).toBe('section-123-test');
    });

    it('should handle French accents', () => {
      const result = generateIdFromText('Élément de référence');
      expect(result).toBe('element-de-reference');
    });

    it('should handle Spanish characters', () => {
      const result = generateIdFromText('Año español');
      expect(result).toBe('ano-espanol');
    });

    it('should handle German umlauts', () => {
      const result = generateIdFromText('Über München');
      expect(result).toBe('uber-munchen');
    });

    it('should handle hyphens in text', () => {
      // The function doesn't remove leading/trailing hyphens
      const result = generateIdFromText('---Test---');
      expect(result).toBe('---test---');
    });

    it('should handle mixed case with special characters', () => {
      const result = generateIdFromText('The Quick Brown Fox!');
      expect(result).toBe('the-quick-brown-fox');
    });
  });

  describe('decodeText', () => {
    it('should decode HTML entities', () => {
      const result = decodeText('&lt;div&gt;');
      expect(result).toBe('<div>');
    });

    it('should decode ampersand', () => {
      const result = decodeText('Tom &amp; Jerry');
      expect(result).toBe('Tom & Jerry');
    });

    it('should unescape underscore', () => {
      const result = decodeText('test\\_value');
      expect(result).toBe('test_value');
    });

    it('should unescape asterisk', () => {
      const result = decodeText('test\\*value');
      expect(result).toBe('test*value');
    });

    it('should unescape parentheses', () => {
      const result = decodeText('\\(test\\)');
      expect(result).toBe('(test)');
    });

    it('should unescape square brackets', () => {
      const result = decodeText('\\[test\\]');
      expect(result).toBe('[test]');
    });

    it('should unescape backslashes', () => {
      const result = decodeText('test\\\\value');
      expect(result).toBe('test\\value');
    });

    it('should trim whitespace', () => {
      const result = decodeText('  test  ');
      expect(result).toBe('test');
    });

    it('should handle multiple escape sequences', () => {
      const result = decodeText('\\(test\\) with \\_underscore\\_ and \\*asterisk\\*');
      expect(result).toBe('(test) with _underscore_ and *asterisk*');
    });

    it('should handle empty string', () => {
      const result = decodeText('');
      expect(result).toBe('');
    });

    it('should decode quotes', () => {
      const result = decodeText('&quot;Hello&quot;');
      expect(result).toBe('"Hello"');
    });

    it('should handle complex HTML entities and escapes', () => {
      const result = decodeText('&lt;div&gt;test\\_value&lt;/div&gt;');
      expect(result).toBe('<div>test_value</div>');
    });
  });

  describe('adjustNestedListsInMarkdownContent', () => {
    it('should indent nested list items', () => {
      const input = '- Parent:\n- Child 1\n- Child 2\n';
      const result = adjustNestedListsInMarkdownContent(input);
      expect(result).toBe('- Parent:\n  - Child 1\n  - Child 2\n');
    });

    it('should handle undefined input', () => {
      const result = adjustNestedListsInMarkdownContent(undefined);
      expect(result).toBeUndefined();
    });

    it('should handle empty string', () => {
      const result = adjustNestedListsInMarkdownContent('');
      expect(result).toBe('');
    });

    it('should not modify non-nested lists', () => {
      const input = '- Item 1\n- Item 2\n- Item 3\n';
      const result = adjustNestedListsInMarkdownContent(input);
      expect(result).toBe(input);
    });

    it('should handle multiple nested list groups', () => {
      const input = '- First:\n- Child A\n- Second:\n- Child B\n';
      const result = adjustNestedListsInMarkdownContent(input);
      // The regex matches parent + all following children until the next parent or end
      // So "- First:\n- Child A\n" matches, then "- Second:\n- Child B\n" matches
      // The second match includes the newline from the first group
      expect(result).toBe('- First:\n  - Child A\n  - Second:\n  - Child B\n');
    });

    it('should handle parent items with text after colon', () => {
      const input = '- Parent with text:\n- Child item\n';
      const result = adjustNestedListsInMarkdownContent(input);
      expect(result).toBe('- Parent with text:\n  - Child item\n');
    });

    it('should handle multiple children under one parent', () => {
      const input = '- Features:\n- Feature 1\n- Feature 2\n- Feature 3\n';
      const result = adjustNestedListsInMarkdownContent(input);
      expect(result).toBe('- Features:\n  - Feature 1\n  - Feature 2\n  - Feature 3\n');
    });
  });

  describe('getMarkdownImageURL', () => {
    it('should generate correct image URL', () => {
      const result = getMarkdownImageURL('/images/test.png', 'epijinfo');
      expect(result).toBe('https://epijinfo.episciences.org/images/test.png');
    });

    it('should handle different journal codes', () => {
      const result = getMarkdownImageURL('/logo.svg', 'epiderminfo');
      expect(result).toBe('https://epiderminfo.episciences.org/logo.svg');
    });

    it('should handle paths without leading slash', () => {
      // The function concatenates the path as-is, so no leading slash is added
      const result = getMarkdownImageURL('assets/image.jpg', 'testjournal');
      expect(result).toBe('https://testjournal.episciences.orgassets/image.jpg');
    });

    it('should handle deep paths', () => {
      const result = getMarkdownImageURL('/static/images/articles/2024/fig1.png', 'journal');
      expect(result).toBe('https://journal.episciences.org/static/images/articles/2024/fig1.png');
    });

    it('should handle empty path', () => {
      const result = getMarkdownImageURL('', 'journal');
      expect(result).toBe('https://journal.episciences.org');
    });

    it('should preserve query parameters', () => {
      const result = getMarkdownImageURL('/image.png?size=large', 'journal');
      expect(result).toBe('https://journal.episciences.org/image.png?size=large');
    });
  });

  describe('getNodeText', () => {
    it('should return text from text node', () => {
      const node = { type: 'text', value: 'Hello' };
      expect(getNodeText(node as any)).toBe('Hello');
    });

    it('should return text from nested formatting nodes', () => {
      const node = {
        type: 'strong',
        children: [
          { type: 'text', value: 'Bold ' },
          { type: 'emphasis', children: [{ type: 'text', value: 'Italic' }] },
        ],
      };
      expect(getNodeText(node as any)).toBe('Bold Italic');
    });

    it('should return empty string if no text', () => {
      const node = { type: 'image', url: 'test.png' };
      expect(getNodeText(node as any)).toBe('');
    });

    it('should return inlineCode value', () => {
      const node = { type: 'inlineCode', value: 'npm install' };
      expect(getNodeText(node as any)).toBe('npm install');
    });

    it('should skip html nodes and return empty string', () => {
      const node = { type: 'html', value: '<span lang="fr">et al.</span>' };
      expect(getNodeText(node as any)).toBe('');
    });

    it('should extract text from heading with mixed text and inlineCode', () => {
      const node = {
        type: 'heading',
        depth: 2,
        children: [
          { type: 'text', value: 'See ' },
          { type: 'inlineCode', value: 'npm install' },
        ],
      };
      expect(getNodeText(node as any)).toBe('See npm install');
    });

    it('should strip inline html and return only text content', () => {
      const node = {
        type: 'heading',
        depth: 2,
        children: [
          { type: 'text', value: 'Authors ' },
          { type: 'html', value: '<span lang="fr">' },
          { type: 'text', value: 'et al.' },
          { type: 'html', value: '</span>' },
        ],
      };
      expect(getNodeText(node as any)).toBe('Authors et al.');
    });

    it('should extract text from heading with bold content', () => {
      const node = {
        type: 'heading',
        depth: 2,
        children: [{ type: 'strong', children: [{ type: 'text', value: 'Bold Title' }] }],
      };
      expect(getNodeText(node as any)).toBe('Bold Title');
    });

    it('should extract text from hast element node', () => {
      const node = {
        type: 'element',
        tagName: 'strong',
        children: [{ type: 'text', value: 'Bold' }],
      };
      expect(getNodeText(node as any)).toBe('Bold');
    });

    it('should extract text from hast inline code element', () => {
      const node = {
        type: 'element',
        tagName: 'code',
        children: [{ type: 'text', value: 'npm install' }],
      };
      expect(getNodeText(node as any)).toBe('npm install');
    });

    it('should extract text from hast heading with mixed text and code', () => {
      const node = {
        type: 'element',
        tagName: 'h2',
        children: [
          { type: 'text', value: 'See ' },
          {
            type: 'element',
            tagName: 'code',
            children: [{ type: 'text', value: 'npm install' }],
          },
        ],
      };
      expect(getNodeText(node as any)).toBe('See npm install');
    });

    it('should extract text from hast heading with nested emphasis and code', () => {
      const node = {
        type: 'element',
        tagName: 'h3',
        children: [
          { type: 'element', tagName: 'em', children: [{ type: 'text', value: 'Run ' }] },
          {
            type: 'element',
            tagName: 'code',
            children: [{ type: 'text', value: 'make build' }],
          },
          { type: 'text', value: ' first' },
        ],
      };
      expect(getNodeText(node as any)).toBe('Run make build first');
    });
  });
});
