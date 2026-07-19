import { describe, it, expect, afterEach } from 'vitest';
import {
  shouldRenderMenuItem,
  getVisibleMenuItems,
  processMenuItemPath,
  menuConfig,
  MenuItemConfig,
} from '../menu';

describe('shouldRenderMenuItem', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_JOURNAL_MENU_FOO_RENDER;
  });

  const baseItem: MenuItemConfig = {
    key: 'FOO',
    label: 'label.foo',
    path: '/foo',
    envKey: 'FOO',
  };

  it('is always visible when alwaysVisible is true, regardless of env', () => {
    expect(shouldRenderMenuItem({ ...baseItem, alwaysVisible: true, envKey: undefined })).toBe(
      true
    );
  });

  it('is visible when there is no envKey', () => {
    expect(shouldRenderMenuItem({ ...baseItem, envKey: undefined })).toBe(true);
  });

  it('is visible by default (opt-out) when the env var is unset', () => {
    expect(shouldRenderMenuItem(baseItem)).toBe(true);
  });

  it('is hidden when the opt-out env var is explicitly "false"', () => {
    process.env.NEXT_PUBLIC_JOURNAL_MENU_FOO_RENDER = 'false';
    expect(shouldRenderMenuItem(baseItem)).toBe(false);
  });

  it('is visible when the opt-out env var is explicitly "true"', () => {
    process.env.NEXT_PUBLIC_JOURNAL_MENU_FOO_RENDER = 'true';
    expect(shouldRenderMenuItem(baseItem)).toBe(true);
  });

  it('defaultHidden items stay hidden unless explicitly opted in', () => {
    const item = { ...baseItem, defaultHidden: true };
    expect(shouldRenderMenuItem(item)).toBe(false);

    process.env.NEXT_PUBLIC_JOURNAL_MENU_FOO_RENDER = 'true';
    expect(shouldRenderMenuItem(item)).toBe(true);
  });

  it('prefers journalConfig over process.env', () => {
    process.env.NEXT_PUBLIC_JOURNAL_MENU_FOO_RENDER = 'false';
    const journalConfig = { NEXT_PUBLIC_JOURNAL_MENU_FOO_RENDER: 'true' };
    expect(shouldRenderMenuItem(baseItem, journalConfig)).toBe(true);
  });

  it('applies additionalCheck only when otherwise visible', () => {
    const passingCheck = { ...baseItem, additionalCheck: () => true };
    const failingCheck = { ...baseItem, additionalCheck: () => false };

    expect(shouldRenderMenuItem(passingCheck)).toBe(true);
    expect(shouldRenderMenuItem(failingCheck)).toBe(false);
  });

  it('does not invoke additionalCheck when the item is already hidden', () => {
    process.env.NEXT_PUBLIC_JOURNAL_MENU_FOO_RENDER = 'false';
    let called = false;
    const item = {
      ...baseItem,
      additionalCheck: () => {
        called = true;
        return true;
      },
    };

    expect(shouldRenderMenuItem(item)).toBe(false);
    expect(called).toBe(false);
  });
});

describe('getVisibleMenuItems', () => {
  it('filters out hidden items', () => {
    const items: MenuItemConfig[] = [
      { key: 'A', label: 'a', path: '/a', alwaysVisible: true },
      { key: 'B', label: 'b', path: '/b', envKey: 'B', defaultHidden: true },
    ];

    expect(getVisibleMenuItems(items).map(i => i.key)).toEqual(['A']);
  });
});

describe('processMenuItemPath', () => {
  it('replaces a single placeholder', () => {
    const item: MenuItemConfig = {
      key: 'LAST_VOLUME',
      label: 'label',
      path: '/volumes/:lastVolumeId',
    };

    const processed = processMenuItemPath(item, { lastVolumeId: '42' });
    expect(processed.path).toBe('/volumes/42');
  });

  it('leaves the path untouched when there is no matching placeholder', () => {
    const item: MenuItemConfig = { key: 'ARTICLES', label: 'label', path: '/articles' };
    const processed = processMenuItemPath(item, { lastVolumeId: '42' });
    expect(processed.path).toBe('/articles');
  });
});

describe('menuConfig', () => {
  it('exposes the expected top-level structure', () => {
    expect(menuConfig.dropdowns.content.length).toBeGreaterThan(0);
    expect(menuConfig.dropdowns.about.length).toBeGreaterThan(0);
    expect(Array.isArray(menuConfig.standalone)).toBe(true);
  });

  it('marks the Articles item as always visible', () => {
    const articles = menuConfig.dropdowns.content.find(i => i.key === 'ARTICLES');
    expect(articles?.alwaysVisible).toBe(true);
  });
});
