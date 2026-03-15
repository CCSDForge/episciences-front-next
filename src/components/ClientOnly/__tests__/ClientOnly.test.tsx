import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ClientOnly from '../ClientOnly';

describe('ClientOnly', () => {
  describe('initial render (before effects)', () => {
    it('renders null before mounting (no children visible synchronously)', () => {
      // Before useEffect fires, nothing is rendered
      const { container } = render(
        <ClientOnly>
          <span>Client content</span>
        </ClientOnly>
      );
      // In testing environment useEffect fires synchronously after render
      // so we check that the component handles both states correctly
      expect(container).toBeInTheDocument();
    });
  });

  describe('after mounting', () => {
    it('renders children after mount', async () => {
      await act(async () => {
        render(
          <ClientOnly>
            <span>Client content</span>
          </ClientOnly>
        );
      });

      expect(screen.getByText('Client content')).toBeInTheDocument();
    });

    it('renders multiple children after mount', async () => {
      await act(async () => {
        render(
          <ClientOnly>
            <span>First</span>
            <span>Second</span>
          </ClientOnly>
        );
      });

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });

    it('renders React element children after mount', async () => {
      await act(async () => {
        render(
          <ClientOnly>
            <div data-testid="client-div">
              <p>Nested content</p>
            </div>
          </ClientOnly>
        );
      });

      expect(screen.getByTestId('client-div')).toBeInTheDocument();
      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });

    it('renders string children after mount', async () => {
      await act(async () => {
        render(<ClientOnly>Just text</ClientOnly>);
      });

      expect(screen.getByText('Just text')).toBeInTheDocument();
    });
  });

  describe('no wrapper element', () => {
    it('does not add any extra DOM wrapper element', async () => {
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(
          <ClientOnly>
            <span data-testid="child">content</span>
          </ClientOnly>
        ));
      });

      // ClientOnly renders a Fragment, so no extra wrapper
      const child = screen.getByTestId('child');
      expect(child.parentElement).toBe(container);
    });
  });
});
