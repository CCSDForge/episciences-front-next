import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { InlineScript } from '../InlineScript';

const SCRIPT = 'document.documentElement.dataset.theme="light";';

describe('InlineScript', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('client render', () => {
    it('renders a script with type="text/plain" so the browser never executes it', () => {
      const { container } = render(<InlineScript html={SCRIPT} />);
      const script = container.querySelector('script');

      expect(script).not.toBeNull();
      expect(script).toHaveAttribute('type', 'text/plain');
    });

    it('injects the html as the script content', () => {
      const { container } = render(<InlineScript html={SCRIPT} />);

      expect(container.querySelector('script')?.innerHTML).toBe(SCRIPT);
    });

    it('does not trigger the React "script tag" console error', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<InlineScript html={SCRIPT} />);

      const scriptWarnings = errorSpy.mock.calls.filter((args) =>
        String(args[0]).includes('Encountered a script tag')
      );
      expect(scriptWarnings).toHaveLength(0);
    });

    it('does not execute the script content', () => {
      (globalThis as Record<string, unknown>).__inlineScriptRan = false;

      render(<InlineScript html="globalThis.__inlineScriptRan = true;" />);

      expect((globalThis as Record<string, unknown>).__inlineScriptRan).toBe(false);
      delete (globalThis as Record<string, unknown>).__inlineScriptRan;
    });
  });

  describe('server render', () => {
    it('renders type="text/javascript" so the browser executes it while parsing', () => {
      // renderToString runs with window defined in happy-dom: simulate the server
      vi.stubGlobal('window', undefined);

      const html = renderToString(<InlineScript html={SCRIPT} />);

      expect(html).toContain('type="text/javascript"');
      expect(html).toContain(SCRIPT);
    });
  });
});
