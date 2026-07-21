import { describe, it, expect, vi, afterAll } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { forAuthorApi } from '../forAuthor.query';
import forAuthorReducer from '../forAuthor.slice';

function buildStore() {
  return configureStore({
    reducer: {
      forAuthorReducer,
      [forAuthorApi.reducerPath]: forAuthorApi.reducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(forAuthorApi.middleware),
  });
}

describe('forAuthor.slice', () => {
  const originalFetch = global.fetch;
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('returns the empty initial state', () => {
    const store = buildStore();
    expect(store.getState().forAuthorReducer).toEqual({});
  });

  it('stores the editorial workflow page on fulfillment', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [{ id: 1, title: 'Workflow' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as unknown as typeof fetch;

    const store = buildStore();
    await store.dispatch(
      forAuthorApi.endpoints.fetchEditorialWorkflowPage.initiate({ rvcode: 'epijinfo' })
    );

    expect(store.getState().forAuthorReducer.editorialWorkflow).toEqual({
      id: 1,
      title: 'Workflow',
    });
  });

  it('stores the ethical charter page on fulfillment', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [{ id: 2, title: 'Ethics' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as unknown as typeof fetch;

    const store = buildStore();
    await store.dispatch(
      forAuthorApi.endpoints.fetchEthicalCharterPage.initiate({ rvcode: 'epijinfo' })
    );

    expect(store.getState().forAuthorReducer.ethicalCharter).toEqual({ id: 2, title: 'Ethics' });
  });

  it('stores the prepare submission page on fulfillment', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [{ id: 3, title: 'Prepare' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as unknown as typeof fetch;

    const store = buildStore();
    await store.dispatch(
      forAuthorApi.endpoints.fetchPrepareSubmissionPage.initiate({ rvcode: 'epijinfo' })
    );

    expect(store.getState().forAuthorReducer.prepareSubmission).toEqual({
      id: 3,
      title: 'Prepare',
    });
  });
});
