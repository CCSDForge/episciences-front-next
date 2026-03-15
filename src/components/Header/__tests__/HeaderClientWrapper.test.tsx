'use client';

import { render, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import HeaderClientWrapper from '../HeaderClientWrapper';

// Helper: ensure a <header class="header"> exists in the DOM and return it
function createHeaderElement(): HTMLElement {
  const header = document.createElement('header');
  header.className = 'header';
  document.body.appendChild(header);
  return header;
}

// Helper: set window.scrollY and dispatch a scroll event
function simulateScroll(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  window.dispatchEvent(new Event('scroll'));
}

describe('HeaderClientWrapper', () => {
  let header: HTMLElement;

  beforeEach(() => {
    header = createHeaderElement();
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  afterEach(() => {
    document.body.removeChild(header);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Basic rendering
  // ─────────────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders its children', () => {
      const { getByText } = render(
        <HeaderClientWrapper>
          <span>Child content</span>
        </HeaderClientWrapper>
      );
      expect(getByText('Child content')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Scroll behaviour — threshold is 100px
  // ─────────────────────────────────────────────────────────────────────────
  describe('scroll behaviour', () => {
    it('does not add header-reduced initially (scroll at 0)', () => {
      render(
        <HeaderClientWrapper>
          <div />
        </HeaderClientWrapper>
      );
      expect(header.classList.contains('header-reduced')).toBe(false);
    });

    it('adds header-reduced class when scrolled past 100px', () => {
      render(
        <HeaderClientWrapper>
          <div />
        </HeaderClientWrapper>
      );
      act(() => simulateScroll(150));
      expect(header.classList.contains('header-reduced')).toBe(true);
    });

    it('does not add header-reduced class exactly at 100px (threshold is strictly greater)', () => {
      render(
        <HeaderClientWrapper>
          <div />
        </HeaderClientWrapper>
      );
      act(() => simulateScroll(100));
      expect(header.classList.contains('header-reduced')).toBe(false);
    });

    it('adds header-reduced at 101px', () => {
      render(
        <HeaderClientWrapper>
          <div />
        </HeaderClientWrapper>
      );
      act(() => simulateScroll(101));
      expect(header.classList.contains('header-reduced')).toBe(true);
    });

    it('removes header-reduced when scrolling back up below threshold', () => {
      render(
        <HeaderClientWrapper>
          <div />
        </HeaderClientWrapper>
      );
      act(() => simulateScroll(200));
      expect(header.classList.contains('header-reduced')).toBe(true);

      act(() => simulateScroll(50));
      expect(header.classList.contains('header-reduced')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────────────────
  describe('cleanup', () => {
    it('removes the scroll event listener on unmount', () => {
      const { unmount } = render(
        <HeaderClientWrapper>
          <div />
        </HeaderClientWrapper>
      );
      unmount();
      // After unmount, scroll events should no longer update the header class
      act(() => simulateScroll(200));
      expect(header.classList.contains('header-reduced')).toBe(false);
    });
  });
});
