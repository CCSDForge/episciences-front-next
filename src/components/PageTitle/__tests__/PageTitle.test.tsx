import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PageTitle from '../PageTitle';

// Create a mock store
const createMockStore = (journalName?: string) =>
  configureStore({
    reducer: {
      journalReducer: (state = { currentJournal: journalName ? { name: journalName } : null }) =>
        state,
    },
  });

describe('PageTitle', () => {
  const originalTitle = document.title;
  const originalEnv = process.env;

  beforeEach(() => {
    document.title = 'Initial Title';
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    document.title = originalTitle;
    process.env = originalEnv;
  });

  describe('Basic rendering', () => {
    it('returns null (renders nothing visible)', () => {
      const store = createMockStore('Test Journal');

      const { container } = render(
        <Provider store={store}>
          <PageTitle title="Test Page" />
        </Provider>
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Document title updates', () => {
    it('sets document title with page title and journal name', async () => {
      const store = createMockStore('My Academic Journal');

      render(
        <Provider store={store}>
          <PageTitle title="Articles" />
        </Provider>
      );

      await waitFor(() => {
        expect(document.title).toBe('Articles | My Academic Journal');
      });
    });

    it('uses default journal name when journal is not loaded', async () => {
      process.env.NEXT_PUBLIC_JOURNAL_NAME = 'Default Journal Name';
      const store = createMockStore(); // No journal name

      render(
        <Provider store={store}>
          <PageTitle title="Home" />
        </Provider>
      );

      await waitFor(() => {
        expect(document.title).toBe('Home | Default Journal Name');
      });
    });

    it('uses fallback title when no env variable is set', async () => {
      delete process.env.NEXT_PUBLIC_JOURNAL_NAME;
      const store = createMockStore(); // No journal name

      render(
        <Provider store={store}>
          <PageTitle title="About" />
        </Provider>
      );

      await waitFor(() => {
        expect(document.title).toBe('About | [Pre-Production] Journal Epijinfo');
      });
    });

    it('updates title when page title prop changes', async () => {
      const store = createMockStore('Test Journal');

      const { rerender } = render(
        <Provider store={store}>
          <PageTitle title="Page 1" />
        </Provider>
      );

      await waitFor(() => {
        expect(document.title).toBe('Page 1 | Test Journal');
      });

      rerender(
        <Provider store={store}>
          <PageTitle title="Page 2" />
        </Provider>
      );

      await waitFor(() => {
        expect(document.title).toBe('Page 2 | Test Journal');
      });
    });
  });

  describe('Various page titles', () => {
    it.each([
      { description: 'handles empty title', title: '', expectedTitle: '| Journal' },
      {
        description: 'handles special characters in title',
        title: 'Articles & News',
        expectedTitle: 'Articles & News | Journal',
      },
      {
        description: 'handles unicode characters',
        title: 'Recherche en mathématiques',
        expectedTitle: 'Recherche en mathématiques | Journal',
      },
    ])('$description', async ({ title, expectedTitle }) => {
      const store = createMockStore('Journal');

      render(
        <Provider store={store}>
          <PageTitle title={title} />
        </Provider>
      );

      await waitFor(() => {
        expect(document.title).toBe(expectedTitle);
      });
    });

    it('handles long titles', async () => {
      const store = createMockStore('Journal');
      const longTitle = 'This is a very long page title that contains many words';

      render(
        <Provider store={store}>
          <PageTitle title={longTitle} />
        </Provider>
      );

      await waitFor(() => {
        expect(document.title).toBe(`${longTitle} | Journal`);
      });
    });
  });

  describe('Journal name variations', () => {
    it('handles journal name with special characters', async () => {
      const store = createMockStore("Journal d'Épistémologie");

      render(
        <Provider store={store}>
          <PageTitle title="Home" />
        </Provider>
      );

      await waitFor(() => {
        expect(document.title).toBe("Home | Journal d'Épistémologie");
      });
    });

    it('handles journal name with numbers', async () => {
      const store = createMockStore('Journal 2024');

      render(
        <Provider store={store}>
          <PageTitle title="Home" />
        </Provider>
      );

      await waitFor(() => {
        expect(document.title).toBe('Home | Journal 2024');
      });
    });
  });
});
