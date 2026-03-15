import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import MarkdownRenderer from '../MarkdownRenderer';

// SCSS import stubbed by vitest
vi.mock('../MarkdownRenderer.scss', () => ({}));

describe('MarkdownRenderer', () => {
  describe('GFM table rendering', () => {
    const TABLE_MARKDOWN = `
| Header A | Header B |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
`;

    it('renders a table from GFM markdown', () => {
      render(<MarkdownRenderer>{TABLE_MARKDOWN}</MarkdownRenderer>);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('renders table headers with correct text', () => {
      render(<MarkdownRenderer>{TABLE_MARKDOWN}</MarkdownRenderer>);
      expect(screen.getByText('Header A')).toBeInTheDocument();
      expect(screen.getByText('Header B')).toBeInTheDocument();
    });

    it('renders table cells with correct text', () => {
      render(<MarkdownRenderer>{TABLE_MARKDOWN}</MarkdownRenderer>);
      expect(screen.getByText('Cell 1')).toBeInTheDocument();
      expect(screen.getByText('Cell 4')).toBeInTheDocument();
    });

    it('wraps table in a scrollable div with markdown-table-wrapper class', () => {
      const { container } = render(<MarkdownRenderer>{TABLE_MARKDOWN}</MarkdownRenderer>);
      const wrapper = container.querySelector('.markdown-table-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toContainElement(container.querySelector('table'));
    });

    it('applies markdown-table class to the table element', () => {
      const { container } = render(<MarkdownRenderer>{TABLE_MARKDOWN}</MarkdownRenderer>);
      expect(container.querySelector('.markdown-table')).toBeInTheDocument();
    });

    it('adds scope="col" to th elements for accessibility', () => {
      const { container } = render(<MarkdownRenderer>{TABLE_MARKDOWN}</MarkdownRenderer>);
      const headers = container.querySelectorAll('th');
      headers.forEach(th => {
        expect(th).toHaveAttribute('scope', 'col');
      });
    });

    it('adds tabIndex=0 to wrapper for keyboard scrollability', () => {
      const { container } = render(<MarkdownRenderer>{TABLE_MARKDOWN}</MarkdownRenderer>);
      const wrapper = container.querySelector('.markdown-table-wrapper');
      expect(wrapper).toHaveAttribute('tabindex', '0');
    });

    it('passes a11y checks for table', async () => {
      const { container } = render(<MarkdownRenderer>{TABLE_MARKDOWN}</MarkdownRenderer>);
      await checkA11y(container);
    });
  });

  describe('GFM features', () => {
    it('renders strikethrough text', () => {
      const { container } = render(<MarkdownRenderer>{'~~strikethrough~~'}</MarkdownRenderer>);
      expect(container.querySelector('del')).toBeInTheDocument();
    });

    it('renders task list checkboxes', () => {
      const { container } = render(
        <MarkdownRenderer>{'- [x] done\n- [ ] todo'}</MarkdownRenderer>
      );
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes).toHaveLength(2);
    });
  });

  describe('default rendering', () => {
    it('renders plain text', () => {
      render(<MarkdownRenderer>{'Hello world'}</MarkdownRenderer>);
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('renders bold text', () => {
      const { container } = render(<MarkdownRenderer>{'**bold**'}</MarkdownRenderer>);
      expect(container.querySelector('strong')).toBeInTheDocument();
    });

    it('renders a heading', () => {
      render(<MarkdownRenderer>{'# Title'}</MarkdownRenderer>);
      expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument();
    });

    it('renders a link', () => {
      render(<MarkdownRenderer>{'[text](https://example.com)'}</MarkdownRenderer>);
      expect(screen.getByRole('link', { name: 'text' })).toHaveAttribute(
        'href',
        'https://example.com'
      );
    });
  });

  describe('custom components', () => {
    it('merges custom components with defaults — custom a overrides link rendering', () => {
      render(
        <MarkdownRenderer
          components={{
            a: ({ href, children }) => (
              <a href={href} data-testid="custom-link">
                {children}
              </a>
            ),
          }}
        >
          {'[text](https://example.com)'}
        </MarkdownRenderer>
      );
      expect(screen.getByTestId('custom-link')).toBeInTheDocument();
    });

    it('preserves default table rendering when custom components do not override table', () => {
      const TABLE = '| A |\n|---|\n| B |';
      const { container } = render(
        <MarkdownRenderer components={{ a: ({ children }) => <span>{children}</span> }}>
          {TABLE}
        </MarkdownRenderer>
      );
      expect(container.querySelector('.markdown-table-wrapper')).toBeInTheDocument();
    });

    it('allows overriding table with a custom component', () => {
      const TABLE = '| A |\n|---|\n| B |';
      const { container } = render(
        <MarkdownRenderer
          components={{ table: ({ children }) => <table data-testid="custom-table">{children}</table> }}
        >
          {TABLE}
        </MarkdownRenderer>
      );
      expect(screen.getByTestId('custom-table')).toBeInTheDocument();
      expect(container.querySelector('.markdown-table-wrapper')).not.toBeInTheDocument();
    });
  });

  describe('urlTransform', () => {
    it('applies urlTransform to image src', () => {
      const transform = (url: string) => url.replace('/public/', '/transformed/');
      const { container } = render(
        <MarkdownRenderer urlTransform={transform}>
          {'![alt](/public/image.png)'}
        </MarkdownRenderer>
      );
      const img = container.querySelector('img');
      expect(img?.getAttribute('src')).toContain('/transformed/');
    });
  });
});
