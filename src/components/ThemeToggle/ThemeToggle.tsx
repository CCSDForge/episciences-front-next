'use client';

import { useTranslation } from 'react-i18next';
import { SunIcon, MoonIcon } from '@/components/icons';
import { useIsHydrated } from '@/hooks/useIsHydrated';
import { useColorScheme } from '@/hooks/useColorScheme';
import './ThemeToggle.scss';

/**
 * 2-state theme toggle: "follows the system" ⇄ "pinned to a literal scheme".
 * The correct icon paints with zero JS (CSS when-dark/when-light mixins, driven
 * by the same color-scheme cascade as every other themed token) — only the
 * visible/accessible text label waits for hydration, so it never mismatches
 * between server and client render.
 */
export default function ThemeToggle(): React.JSX.Element {
  const { t } = useTranslation();
  const isHydrated = useIsHydrated();
  const { pinned, resolvedScheme, toggle } = useColorScheme();

  const willSwitchToDark = resolvedScheme === 'light';
  const actionLabel = willSwitchToDark
    ? t('components.themeToggle.switchToDark')
    : t('components.themeToggle.switchToLight');
  const statusLabel =
    resolvedScheme === 'dark'
      ? t('components.themeToggle.dark')
      : t('components.themeToggle.light');

  return (
    <button
      type="button"
      className="themeToggle"
      onClick={toggle}
      aria-pressed={pinned !== null}
      aria-label={isHydrated ? actionLabel : t('components.themeToggle.label')}
    >
      <span className="themeToggle-icon themeToggle-icon-sun">
        <SunIcon size={18} />
      </span>
      <span className="themeToggle-icon themeToggle-icon-moon">
        <MoonIcon size={18} />
      </span>
      <span className="themeToggle-text">
        {isHydrated ? statusLabel : t('components.themeToggle.label')}
      </span>
    </button>
  );
}
