import { describe, it, expect, vi } from 'vitest';
import { handleKeyboardClick, Keys } from '../keyboard';

// Minimal React.KeyboardEvent-like object
function makeKeyEvent(key: string, extra: Partial<{ preventDefault: () => void; stopPropagation: () => void }> = {}) {
  return {
    key,
    preventDefault: extra.preventDefault ?? vi.fn(),
    stopPropagation: extra.stopPropagation ?? vi.fn(),
  } as unknown as React.KeyboardEvent;
}

describe('keyboard utils', () => {
  describe('Keys constant', () => {
    it('has ENTER key', () => {
      expect(Keys.ENTER).toBe('Enter');
    });

    it('has SPACE key', () => {
      expect(Keys.SPACE).toBe(' ');
    });

    it('has ESCAPE key', () => {
      expect(Keys.ESCAPE).toBe('Escape');
    });

    it('has arrow keys', () => {
      expect(Keys.ARROW_UP).toBe('ArrowUp');
      expect(Keys.ARROW_DOWN).toBe('ArrowDown');
      expect(Keys.ARROW_LEFT).toBe('ArrowLeft');
      expect(Keys.ARROW_RIGHT).toBe('ArrowRight');
    });

    it('has TAB, HOME, END', () => {
      expect(Keys.TAB).toBe('Tab');
      expect(Keys.HOME).toBe('Home');
      expect(Keys.END).toBe('End');
    });
  });

  describe('handleKeyboardClick', () => {
    describe('triggers callback', () => {
      it('calls callback on Enter key', () => {
        const callback = vi.fn();
        const event = makeKeyEvent('Enter');
        handleKeyboardClick(event, callback);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(event);
      });

      it('calls callback on Space key', () => {
        const callback = vi.fn();
        const event = makeKeyEvent(' ');
        handleKeyboardClick(event, callback);
        expect(callback).toHaveBeenCalledTimes(1);
      });

      it('does NOT call callback on other keys', () => {
        const callback = vi.fn();
        for (const key of ['Escape', 'Tab', 'ArrowUp', 'a', 'A']) {
          handleKeyboardClick(makeKeyEvent(key), callback);
        }
        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe('preventDefault behaviour', () => {
      it('calls preventDefault by default (Enter)', () => {
        const preventDefault = vi.fn();
        const event = makeKeyEvent('Enter', { preventDefault });
        handleKeyboardClick(event, vi.fn());
        expect(preventDefault).toHaveBeenCalled();
      });

      it('calls preventDefault by default (Space)', () => {
        const preventDefault = vi.fn();
        const event = makeKeyEvent(' ', { preventDefault });
        handleKeyboardClick(event, vi.fn());
        expect(preventDefault).toHaveBeenCalled();
      });

      it('skips preventDefault when option is false', () => {
        const preventDefault = vi.fn();
        const event = makeKeyEvent('Enter', { preventDefault });
        handleKeyboardClick(event, vi.fn(), { preventDefault: false });
        expect(preventDefault).not.toHaveBeenCalled();
      });

      it('does not call preventDefault for non-triggering keys', () => {
        const preventDefault = vi.fn();
        const event = makeKeyEvent('Escape', { preventDefault });
        handleKeyboardClick(event, vi.fn());
        expect(preventDefault).not.toHaveBeenCalled();
      });
    });

    describe('stopPropagation behaviour', () => {
      it('does NOT call stopPropagation by default', () => {
        const stopPropagation = vi.fn();
        const event = makeKeyEvent('Enter', { stopPropagation });
        handleKeyboardClick(event, vi.fn());
        expect(stopPropagation).not.toHaveBeenCalled();
      });

      it('calls stopPropagation when option is true', () => {
        const stopPropagation = vi.fn();
        const event = makeKeyEvent('Enter', { stopPropagation });
        handleKeyboardClick(event, vi.fn(), { stopPropagation: true });
        expect(stopPropagation).toHaveBeenCalled();
      });
    });

    describe('combined options', () => {
      it('can disable preventDefault and enable stopPropagation simultaneously', () => {
        const preventDefault = vi.fn();
        const stopPropagation = vi.fn();
        const callback = vi.fn();
        const event = makeKeyEvent('Enter', { preventDefault, stopPropagation });

        handleKeyboardClick(event, callback, { preventDefault: false, stopPropagation: true });

        expect(preventDefault).not.toHaveBeenCalled();
        expect(stopPropagation).toHaveBeenCalled();
        expect(callback).toHaveBeenCalled();
      });
    });
  });
});
