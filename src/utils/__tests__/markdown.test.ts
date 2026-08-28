import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import {
  generateIdFromText,
  decodeText,
  getMarkdownImageURL,
  getNodeText,
  renderInlineMarkdown,
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

  describe('renderInlineMarkdown', () => {
    it('returns null for null, undefined, or empty string', () => {
      expect(renderInlineMarkdown(null)).toBeNull();
      expect(renderInlineMarkdown(undefined)).toBeNull();
      expect(renderInlineMarkdown('')).toBeNull();
    });

    it('returns plain text when no markdown formatting is present', () => {
      expect(renderInlineMarkdown('Plain subtitle text')).toBe('Plain subtitle text');
    });

    it('decodes HTML entities in text', () => {
      expect(renderInlineMarkdown('Science &amp; Motricit&eacute;')).toBe('Science & Motricité');
    });

    it('renders italic text with asterisks', () => {
      const { container } = render(React.createElement('span', null, renderInlineMarkdown('*Italic text*')));
      const em = container.querySelector('em');
      expect(em).toBeInTheDocument();
      expect(em?.textContent).toBe('Italic text');
    });

    it('renders italic text with underscores', () => {
      const { container } = render(React.createElement('span', null, renderInlineMarkdown('_Italic text_')));
      const em = container.querySelector('em');
      expect(em).toBeInTheDocument();
      expect(em?.textContent).toBe('Italic text');
    });

    it('renders bold text with double asterisks', () => {
      const { container } = render(React.createElement('span', null, renderInlineMarkdown('**Bold text**')));
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      expect(strong?.textContent).toBe('Bold text');
    });

    it('renders bold text with double underscores', () => {
      const { container } = render(React.createElement('span', null, renderInlineMarkdown('__Bold text__')));
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      expect(strong?.textContent).toBe('Bold text');
    });

    it('renders bold and italic with triple asterisks', () => {
      const { container } = render(React.createElement('span', null, renderInlineMarkdown('***Bold and italic***')));
      const strong = container.querySelector('strong');
      const em = container.querySelector('em');
      expect(strong).toBeInTheDocument();
      expect(em).toBeInTheDocument();
      expect(em?.contains(strong) || strong?.contains(em)).toBe(true);
      expect(container.textContent).toBe('Bold and italic');
    });

    it('renders bold and italic with triple underscores', () => {
      const { container } = render(React.createElement('span', null, renderInlineMarkdown('___Bold and italic___')));
      const strong = container.querySelector('strong');
      const em = container.querySelector('em');
      expect(strong).toBeInTheDocument();
      expect(em).toBeInTheDocument();
      expect(em?.contains(strong) || strong?.contains(em)).toBe(true);
      expect(container.textContent).toBe('Bold and italic');
    });

    it('renders mixed plain text, bold, and italic', () => {
      const { container } = render(
        React.createElement('span', null, renderInlineMarkdown('Science & *Motricité* and **Sports**'))
      );
      expect(container.textContent).toBe('Science & Motricité and Sports');
      expect(container.querySelector('em')?.textContent).toBe('Motricité');
      expect(container.querySelector('strong')?.textContent).toBe('Sports');
    });

    it('renders nested italic inside bold', () => {
      const { container } = render(
        React.createElement('span', null, renderInlineMarkdown('**Bold and *italic* combined**'))
      );
      const strong = container.querySelector('strong');
      const em = container.querySelector('em');
      expect(strong).toBeInTheDocument();
      expect(em).toBeInTheDocument();
      expect(strong).toContainElement(em);
      expect(strong?.textContent).toBe('Bold and italic combined');
    });

    it('renders nested bold inside italic with same delimiter (regression: *Italic **bold** text*)', () => {
      const { container } = render(
        React.createElement('span', null, renderInlineMarkdown('*Italic **bold** text*'))
      );
      const em = container.querySelector('em');
      const strong = container.querySelector('strong');
      expect(em).toBeInTheDocument();
      expect(strong).toBeInTheDocument();
      expect(em).toContainElement(strong);
      expect(em?.textContent).toBe('Italic bold text');
      expect(strong?.textContent).toBe('bold');
    });

    it('renders nested bold inside italic with underscore delimiters (_Italic __bold__ text_)', () => {
      const { container } = render(
        React.createElement('span', null, renderInlineMarkdown('_Italic __bold__ text_'))
      );
      const em = container.querySelector('em');
      const strong = container.querySelector('strong');
      expect(em).toBeInTheDocument();
      expect(strong).toBeInTheDocument();
      expect(em).toContainElement(strong);
      expect(em?.textContent).toBe('Italic bold text');
      expect(strong?.textContent).toBe('bold');
    });

    it('does not create non-inline elements (headings, links) and strips their markup safely', () => {
      const { container } = render(
        React.createElement('span', null, renderInlineMarkdown('# Heading with [link](https://example.com)'))
      );
      expect(container.querySelector('h1')).toBeNull();
      expect(container.querySelector('a')).toBeNull();
      expect(container.textContent).toBe('Heading with link');
    });

    describe('security and XSS prevention', () => {
      it('safely escapes script tags without executing or creating script DOM elements', () => {
        const { container } = render(
          React.createElement('span', null, renderInlineMarkdown('<script>alert("xss")</script>'))
        );
        expect(container.querySelector('script')).toBeNull();
        expect(container.textContent).toBe('<script>alert("xss")</script>');
      });

      it('safely escapes img with onerror event handlers', () => {
        const { container } = render(
          React.createElement('span', null, renderInlineMarkdown('<img src="x" onerror="alert(1)">'))
        );
        expect(container.querySelector('img')).toBeNull();
        expect(container.textContent).toBe('<img src="x" onerror="alert(1)">');
      });

      it('safely renders HTML tags inside markdown emphasis as plain text nodes', () => {
        const { container } = render(
          React.createElement(
            'span',
            null,
            renderInlineMarkdown('*<iframe src="https://malicious.test"></iframe>*')
          )
        );
        expect(container.querySelector('iframe')).toBeNull();
        const em = container.querySelector('em');
        expect(em).toBeInTheDocument();
        expect(em?.textContent).toBe('<iframe src="https://malicious.test"></iframe>');
      });

      it('safely handles malicious long inputs without catastrophic backtracking (ReDoS)', () => {
        const maliciousInput = '*'.repeat(5000) + 'test';
        const startTime = performance.now();
        const result = renderInlineMarkdown(maliciousInput);
        const duration = performance.now() - startTime;
        expect(duration).toBeLessThan(50); // Under 50ms
        expect(result).toBeDefined();
      });
    });
  });
});
